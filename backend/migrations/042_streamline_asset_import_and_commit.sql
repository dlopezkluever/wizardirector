-- Migration 042: Streamline Phase 3 — asset import source + commit RPC extension
--
-- Adds:
--   1. project_assets.source gains 'streamline_import' (batch image intake
--      from Streamline, distinct from 'extracted' which is script-derived).
--   2. streamline_commit(payload jsonb) extended (CREATE OR REPLACE, same
--      function as migration 041 — never a second commit mechanism) to
--      accept an `assets` array and insert project_assets rows in the same
--      transaction as any stage_transitions.

-- ============================================================================
-- 1. project_assets.source — widen CHECK constraint
-- ============================================================================

ALTER TABLE project_assets DROP CONSTRAINT IF EXISTS project_assets_source_check;
ALTER TABLE project_assets
    ADD CONSTRAINT project_assets_source_check
        CHECK (source IN ('extracted', 'manual', 'cloned', 'streamline_import'));

-- ============================================================================
-- 2. streamline_commit — extend to accept an `assets` array
-- ============================================================================
--
-- Payload contract addition:
-- {
--   ...(Phase 1 fields),
--   "assets": [
--     { "name": "...", "asset_type": "character|prop|location", "description": "...",
--       "visual_style_capsule_id": "<uuid>|null", "scene_numbers": [1,2], "image_key_url": "<url>|null",
--       "source": "streamline_import"|"extracted" }  -- defaults to 'streamline_import' (image cards);
--                                                     -- standalone note-derived drafts (Task 3.5) pass 'extracted'
-- }

CREATE OR REPLACE FUNCTION streamline_commit(payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_project_id UUID := (payload->>'project_id')::UUID;
    v_user_id UUID := NULLIF(payload->>'user_id', '')::UUID;
    v_branch_id UUID;

    v_stage_key TEXT;
    v_stage_num INTEGER;
    v_transition JSONB;

    v_current_version INTEGER;
    v_current_status TEXT;
    v_current_origin TEXT;
    v_current_content JSONB;
    v_current_regen TEXT;

    v_prev_status TEXT;

    v_next_version INTEGER;
    v_new_status TEXT;
    v_new_origin TEXT;
    v_new_content JSONB;
    v_new_regen TEXT;

    v_new_row stage_states%ROWTYPE;
    v_inserted_stages JSONB := '[]'::JSONB;

    v_asset JSONB;
    v_new_asset_id UUID;
    v_inserted_assets JSONB := '[]'::JSONB;
BEGIN
    IF v_project_id IS NULL THEN
        RAISE EXCEPTION 'streamline_commit: project_id is required';
    END IF;

    SELECT active_branch_id INTO v_branch_id FROM projects WHERE id = v_project_id;
    IF v_branch_id IS NULL THEN
        RAISE EXCEPTION 'streamline_commit: project % not found or has no active branch', v_project_id;
    END IF;

    -- Serialize concurrent commits on the same project's Phase-A stages.
    PERFORM 1 FROM stage_states
        WHERE branch_id = v_branch_id AND stage_number BETWEEN 1 AND 5
        FOR UPDATE;

    IF payload->'stage_transitions' IS NOT NULL THEN
        FOR v_stage_key, v_transition IN
            SELECT key, value FROM jsonb_each(payload->'stage_transitions')
            ORDER BY (key)::INTEGER ASC
        LOOP
            v_stage_num := v_stage_key::INTEGER;

            IF v_stage_num < 1 OR v_stage_num > 5 THEN
                RAISE EXCEPTION 'streamline_commit: stage % is out of range (must be 1-5)', v_stage_num;
            END IF;

            v_current_version := NULL;
            v_current_status := NULL;
            v_current_origin := NULL;
            v_current_content := NULL;
            v_current_regen := NULL;

            SELECT version, status, origin, content, regeneration_guidance
                INTO v_current_version, v_current_status, v_current_origin, v_current_content, v_current_regen
                FROM stage_states
                WHERE branch_id = v_branch_id AND stage_number = v_stage_num
                ORDER BY version DESC
                LIMIT 1;

            v_next_version := COALESCE(v_current_version, 0) + 1;

            IF jsonb_typeof(v_transition) = 'string' AND (v_transition #>> '{}') = 'skip' THEN
                IF v_stage_num NOT IN (2, 3, 4) THEN
                    RAISE EXCEPTION 'streamline_commit: stage % cannot be skipped (only stages 2, 3, 4 are skippable)', v_stage_num;
                END IF;

                IF v_current_status = 'locked' THEN
                    RAISE EXCEPTION 'streamline_commit: stage % already has locked content — unlock it before skipping', v_stage_num;
                END IF;

                v_prev_status := NULL;
                SELECT status INTO v_prev_status
                    FROM stage_states
                    WHERE branch_id = v_branch_id AND stage_number = v_stage_num - 1
                    ORDER BY version DESC
                    LIMIT 1;

                IF v_prev_status IS DISTINCT FROM 'locked' AND v_prev_status IS DISTINCT FROM 'skipped' THEN
                    RAISE EXCEPTION 'streamline_commit: cannot skip stage % — stage % must be locked or skipped first (currently %)',
                        v_stage_num, v_stage_num - 1, COALESCE(v_prev_status, 'not started');
                END IF;

                v_new_status := 'skipped';
                v_new_origin := 'skipped';
                v_new_content := '{}'::JSONB;
                v_new_regen := '';

            ELSIF jsonb_typeof(v_transition) = 'string' AND (v_transition #>> '{}') = 'locked' THEN
                IF v_current_version IS NULL THEN
                    RAISE EXCEPTION 'streamline_commit: stage % has no existing content to lock', v_stage_num;
                END IF;

                v_new_status := 'locked';
                v_new_origin := COALESCE(v_current_origin, 'authored');
                v_new_content := v_current_content;
                v_new_regen := COALESCE(v_current_regen, '');

            ELSIF jsonb_typeof(v_transition) = 'object' THEN
                v_new_status := v_transition->>'status';
                v_new_origin := v_transition->>'origin';
                v_new_content := COALESCE(v_transition->'content', '{}'::JSONB);
                v_new_regen := COALESCE(v_transition->>'regenerationGuidance', '');

                IF v_new_status IS NULL OR v_new_status NOT IN ('draft', 'locked', 'invalidated', 'outdated', 'skipped') THEN
                    RAISE EXCEPTION 'streamline_commit: invalid status "%" for stage %', v_new_status, v_stage_num;
                END IF;

                IF v_new_origin IS NOT NULL AND v_new_origin NOT IN ('skipped', 'imported', 'ai-generated', 'authored') THEN
                    RAISE EXCEPTION 'streamline_commit: invalid origin "%" for stage %', v_new_origin, v_stage_num;
                END IF;
            ELSE
                RAISE EXCEPTION 'streamline_commit: invalid transition payload for stage %', v_stage_num;
            END IF;

            INSERT INTO stage_states (
                branch_id, stage_number, version, status, origin, content,
                regeneration_guidance, created_by, inherited_from_stage_id
            ) VALUES (
                v_branch_id, v_stage_num, v_next_version, v_new_status, v_new_origin, v_new_content,
                v_new_regen, v_user_id, NULL
            )
            RETURNING * INTO v_new_row;

            v_inserted_stages := v_inserted_stages || jsonb_build_object(
                'stage_number', v_stage_num,
                'id', v_new_row.id,
                'version', v_new_row.version,
                'status', v_new_row.status,
                'origin', v_new_row.origin
            );
        END LOOP;
    END IF;

    -- Phase 3: accepted image cards -> project_assets, source 'streamline_import'.
    IF payload->'assets' IS NOT NULL THEN
        FOR v_asset IN SELECT * FROM jsonb_array_elements(payload->'assets')
        LOOP
            IF v_asset->>'name' IS NULL OR v_asset->>'asset_type' IS NULL THEN
                RAISE EXCEPTION 'streamline_commit: asset entries require name and asset_type';
            END IF;

            IF COALESCE(v_asset->>'source', 'streamline_import') NOT IN ('streamline_import', 'extracted', 'manual', 'cloned') THEN
                RAISE EXCEPTION 'streamline_commit: invalid asset source "%"', v_asset->>'source';
            END IF;

            INSERT INTO project_assets (
                project_id, branch_id, name, asset_type, description,
                image_key_url, visual_style_capsule_id, locked, source, scene_numbers
            ) VALUES (
                v_project_id,
                v_branch_id,
                v_asset->>'name',
                v_asset->>'asset_type',
                COALESCE(v_asset->>'description', ''),
                v_asset->>'image_key_url',
                NULLIF(v_asset->>'visual_style_capsule_id', '')::UUID,
                FALSE,
                COALESCE(v_asset->>'source', 'streamline_import'),
                CASE WHEN v_asset->'scene_numbers' IS NOT NULL
                     THEN ARRAY(SELECT jsonb_array_elements_text(v_asset->'scene_numbers'))::INTEGER[]
                     ELSE '{}'::INTEGER[]
                END
            )
            RETURNING id INTO v_new_asset_id;

            v_inserted_assets := v_inserted_assets || jsonb_build_object('id', v_new_asset_id, 'name', v_asset->>'name');
        END LOOP;
    END IF;

    UPDATE projects SET updated_at = NOW() WHERE id = v_project_id;

    RETURN jsonb_build_object(
        'success', true,
        'project_id', v_project_id,
        'branch_id', v_branch_id,
        'stages', v_inserted_stages,
        'assets', v_inserted_assets
    );
END;
$$;

COMMENT ON FUNCTION streamline_commit(JSONB) IS
    'Streamline atomic commit: applies stage_transitions (Phase 1), assets (Phase 3), and resolutions/resolution_edits (Phase 4) in one transaction. Extended in place via CREATE OR REPLACE as later phases land — never a second commit mechanism.';
