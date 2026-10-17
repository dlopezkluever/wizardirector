-- Migration 043: Streamline Phase 4 — Ask Auteur facts ledger + commit RPC extension
--
-- Adds:
--   1. intake_resolutions — the facts ledger (spec §2.9.1). A row here
--      doesn't always mean a question was shown: a declined/auto-resolved
--      trigger still produces a row with answer_source = 'ai_inferred'.
--   2. intake_resolution_edits — the reconciliation audit trail (§2.9.2).
--   3. streamline_commit(payload jsonb) extended (CREATE OR REPLACE, same
--      function since migration 041 — never a second commit mechanism) to
--      insert both tables' rows in the same transaction as stage_transitions
--      and assets, resolving intake_resolution_edits.resolution_id through a
--      caller-supplied client_id since edits reference resolutions created
--      in the same call.

-- ============================================================================
-- 1. intake_resolutions
-- ============================================================================

CREATE TABLE IF NOT EXISTS intake_resolutions (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id             UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    question_text         TEXT NOT NULL,
    question_category     TEXT NOT NULL,
    options               JSONB,
    selected_answer       TEXT,
    answer_source         TEXT NOT NULL,
    subject_entity_type   TEXT,
    subject_entity_name   TEXT,
    conflicting_sources   JSONB,
    created_at            TIMESTAMPTZ DEFAULT NOW(),
    created_by            UUID REFERENCES auth.users(id)
);

ALTER TABLE intake_resolutions
    ADD CONSTRAINT chk_intake_resolutions_category
        CHECK (question_category IN ('contradiction', 'vague_trait', 'ambiguous_structure', 'missing_info', 'conflict_resolution')),
    ADD CONSTRAINT chk_intake_resolutions_answer_source
        CHECK (answer_source IN ('option', 'freetext', 'ai_inferred')),
    ADD CONSTRAINT chk_intake_resolutions_entity_type
        CHECK (subject_entity_type IS NULL OR subject_entity_type IN ('character', 'location', 'prop', 'style', 'structure', 'other'));

CREATE INDEX IF NOT EXISTS idx_intake_resolutions_branch ON intake_resolutions(branch_id);
CREATE INDEX IF NOT EXISTS idx_intake_resolutions_entity
    ON intake_resolutions(branch_id, subject_entity_type, subject_entity_name)
    WHERE subject_entity_name IS NOT NULL;

-- ============================================================================
-- 2. intake_resolution_edits
-- ============================================================================

CREATE TABLE IF NOT EXISTS intake_resolution_edits (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resolution_id        UUID NOT NULL REFERENCES intake_resolutions(id) ON DELETE CASCADE,
    target_type          TEXT NOT NULL,
    target_stage_number  INTEGER,
    target_asset_name    TEXT,
    edit_scope           TEXT NOT NULL,
    diff_summary         TEXT NOT NULL,
    created_at           TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE intake_resolution_edits
    ADD CONSTRAINT chk_intake_resolution_edits_target_type
        CHECK (target_type IN ('stage', 'asset')),
    ADD CONSTRAINT chk_intake_resolution_edits_scope
        CHECK (edit_scope IN ('word_patch', 'paragraph_rewrite', 'structural_cascade'));

CREATE INDEX IF NOT EXISTS idx_intake_resolution_edits_resolution ON intake_resolution_edits(resolution_id);

-- ============================================================================
-- 3. RLS
-- ============================================================================

ALTER TABLE intake_resolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE intake_resolution_edits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own intake resolutions" ON intake_resolutions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM branches b JOIN projects p ON p.id = b.project_id
            WHERE b.id = intake_resolutions.branch_id AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own intake resolutions" ON intake_resolutions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM branches b JOIN projects p ON p.id = b.project_id
            WHERE b.id = intake_resolutions.branch_id AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view own intake resolution edits" ON intake_resolution_edits
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM intake_resolutions r
            JOIN branches b ON b.id = r.branch_id
            JOIN projects p ON p.id = b.project_id
            WHERE r.id = intake_resolution_edits.resolution_id AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own intake resolution edits" ON intake_resolution_edits
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM intake_resolutions r
            JOIN branches b ON b.id = r.branch_id
            JOIN projects p ON p.id = b.project_id
            WHERE r.id = intake_resolution_edits.resolution_id AND p.user_id = auth.uid()
        )
    );

-- ============================================================================
-- 4. streamline_commit — extend to accept resolutions + resolution_edits
-- ============================================================================
--
-- Payload contract addition:
-- {
--   ...(Phase 1/3 fields),
--   "resolutions": [
--     { "client_id": "r1", "question_text": "...", "question_category": "...",
--       "options": [...], "selected_answer": "...", "answer_source": "option"|"freetext"|"ai_inferred",
--       "subject_entity_type": "..."|null, "subject_entity_name": "..."|null, "conflicting_sources": [...]|null }
--   ],
--   "resolution_edits": [
--     { "resolution_client_id": "r1", "target_type": "stage"|"asset", "target_stage_number": 2|null,
--       "target_asset_name": "..."|null, "edit_scope": "word_patch"|"paragraph_rewrite"|"structural_cascade",
--       "diff_summary": "..." }
--   ]
-- }
--
-- resolution_edits reference resolutions created in the SAME call via a
-- caller-supplied client_id (not a real UUID until inserted) — the function
-- builds a client_id -> real UUID map as it inserts resolutions, then
-- resolves resolution_id through that map when inserting edits.

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

    v_resolution JSONB;
    v_new_resolution_id UUID;
    v_resolution_id_map JSONB := '{}'::JSONB;
    v_inserted_resolutions JSONB := '[]'::JSONB;

    v_edit JSONB;
    v_edit_resolution_id UUID;
    v_stage1_current_version INTEGER;
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

    -- Keep the project configuration and the initial Stage 1 draft inside the
    -- same transaction as the rest of the Streamline commit. The API supplies
    -- these only for the intake flow; omitted fields preserve existing values.
    IF jsonb_typeof(payload->'project_config') = 'object' THEN
        UPDATE projects
        SET project_type = COALESCE(payload->'project_config'->>'project_type', project_type),
            content_rating = COALESCE(payload->'project_config'->>'content_rating', content_rating),
            genre = CASE
                WHEN jsonb_typeof(payload->'project_config'->'genre') = 'array'
                    THEN ARRAY(SELECT jsonb_array_elements_text(payload->'project_config'->'genre'))
                ELSE genre
            END,
            tonal_precision = COALESCE(payload->'project_config'->>'tonal_precision', tonal_precision),
            target_length_min = COALESCE((payload->'project_config'->>'target_length_min')::INTEGER, target_length_min),
            target_length_max = COALESCE((payload->'project_config'->>'target_length_max')::INTEGER, target_length_max),
            aspect_ratio = COALESCE(payload->'project_config'->>'aspect_ratio', aspect_ratio),
            updated_at = NOW()
        WHERE id = v_project_id;
    END IF;

    IF jsonb_typeof(payload->'stage_1_draft') = 'object' THEN
        SELECT COALESCE(MAX(version), 0)
            INTO v_stage1_current_version
            FROM stage_states
            WHERE branch_id = v_branch_id AND stage_number = 1;

        INSERT INTO stage_states (
            branch_id, stage_number, version, status, origin, content,
            regeneration_guidance, created_by, inherited_from_stage_id
        ) VALUES (
            v_branch_id, 1, v_stage1_current_version + 1, 'draft',
            COALESCE(payload->'stage_1_draft'->>'origin', 'authored'),
            COALESCE(payload->'stage_1_draft'->'content', '{}'::JSONB),
            COALESCE(payload->'stage_1_draft'->>'regenerationGuidance', ''),
            v_user_id, NULL
        );
    END IF;

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

                IF v_stage_num > 1 THEN
                    v_prev_status := NULL;
                    SELECT status INTO v_prev_status
                        FROM stage_states
                        WHERE branch_id = v_branch_id AND stage_number = v_stage_num - 1
                        ORDER BY version DESC
                        LIMIT 1;

                    IF v_prev_status IS DISTINCT FROM 'locked' AND v_prev_status IS DISTINCT FROM 'skipped' THEN
                        RAISE EXCEPTION 'streamline_commit: cannot lock stage % — stage % must be locked or skipped first (currently %)',
                            v_stage_num, v_stage_num - 1, COALESCE(v_prev_status, 'not started');
                    END IF;
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

                IF v_stage_num > 1 AND v_new_status = 'locked' THEN
                    v_prev_status := NULL;
                    SELECT status INTO v_prev_status
                        FROM stage_states
                        WHERE branch_id = v_branch_id AND stage_number = v_stage_num - 1
                        ORDER BY version DESC
                        LIMIT 1;

                    IF v_prev_status IS DISTINCT FROM 'locked' AND v_prev_status IS DISTINCT FROM 'skipped' THEN
                        RAISE EXCEPTION 'streamline_commit: cannot lock stage % — stage % must be locked or skipped first (currently %)',
                            v_stage_num, v_stage_num - 1, COALESCE(v_prev_status, 'not started');
                    END IF;
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

    -- Phase 3: accepted image cards / standalone note drafts -> project_assets.
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

    -- Phase 4: Ask Auteur facts ledger + reconciliation audit trail.
    IF payload->'resolutions' IS NOT NULL THEN
        FOR v_resolution IN SELECT * FROM jsonb_array_elements(payload->'resolutions')
        LOOP
            IF v_resolution->>'question_text' IS NULL OR v_resolution->>'answer_source' IS NULL THEN
                RAISE EXCEPTION 'streamline_commit: resolution entries require question_text and answer_source';
            END IF;

            INSERT INTO intake_resolutions (
                branch_id, question_text, question_category, options, selected_answer,
                answer_source, subject_entity_type, subject_entity_name, conflicting_sources, created_by
            ) VALUES (
                v_branch_id,
                v_resolution->>'question_text',
                v_resolution->>'question_category',
                v_resolution->'options',
                v_resolution->>'selected_answer',
                v_resolution->>'answer_source',
                v_resolution->>'subject_entity_type',
                v_resolution->>'subject_entity_name',
                v_resolution->'conflicting_sources',
                v_user_id
            )
            RETURNING id INTO v_new_resolution_id;

            IF v_resolution->>'client_id' IS NOT NULL THEN
                v_resolution_id_map := jsonb_set(v_resolution_id_map, ARRAY[v_resolution->>'client_id'], to_jsonb(v_new_resolution_id::TEXT));
            END IF;

            v_inserted_resolutions := v_inserted_resolutions || jsonb_build_object('client_id', v_resolution->>'client_id', 'id', v_new_resolution_id);
        END LOOP;
    END IF;

    IF payload->'resolution_edits' IS NOT NULL THEN
        FOR v_edit IN SELECT * FROM jsonb_array_elements(payload->'resolution_edits')
        LOOP
            v_edit_resolution_id := NULLIF(v_resolution_id_map->>(v_edit->>'resolution_client_id'), '')::UUID;

            IF v_edit_resolution_id IS NULL THEN
                RAISE EXCEPTION 'streamline_commit: resolution_edit references unknown resolution_client_id "%"', v_edit->>'resolution_client_id';
            END IF;

            INSERT INTO intake_resolution_edits (
                resolution_id, target_type, target_stage_number, target_asset_name, edit_scope, diff_summary
            ) VALUES (
                v_edit_resolution_id,
                v_edit->>'target_type',
                NULLIF(v_edit->>'target_stage_number', '')::INTEGER,
                v_edit->>'target_asset_name',
                v_edit->>'edit_scope',
                v_edit->>'diff_summary'
            );
        END LOOP;
    END IF;

    UPDATE projects SET updated_at = NOW() WHERE id = v_project_id;

    RETURN jsonb_build_object(
        'success', true,
        'project_id', v_project_id,
        'branch_id', v_branch_id,
        'stages', v_inserted_stages,
        'assets', v_inserted_assets,
        'resolutions', v_inserted_resolutions
    );
END;
$$;

COMMENT ON FUNCTION streamline_commit(JSONB) IS
    'Streamline atomic commit: applies stage_transitions (Phase 1), assets (Phase 3), and resolutions/resolution_edits (Phase 4) in one transaction. Extended in place via CREATE OR REPLACE as later phases land — never a second commit mechanism.';
