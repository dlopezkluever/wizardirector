-- Migration 041: Streamline Phase 1 — skipped stage status + atomic commit RPC
--
-- Adds:
--   1. stage_states.status gains 'skipped' as a valid value
--   2. stage_states.origin — provenance tag (skipped/imported/ai-generated/authored),
--      a dedicated column following the same pattern already used by
--      project_assets.source and location_views.source (not JSONB-embedded).
--   3. streamline_commit(payload jsonb) — atomic multi-stage-transition writer.
--      Payload shape is extended (via CREATE OR REPLACE, never replaced with a
--      second mechanism) by later Streamline migrations (assets in Phase 3,
--      intake_resolutions/intake_resolution_edits in Phase 4).
--
-- Phase 1 payload contract:
-- {
--   "project_id": "<uuid>",
--   "user_id": "<uuid>",
--   "stage_transitions": {
--     "1": "locked",                                          -- lock existing draft content as-is
--     "2": "skip",                                             -- mark skipped (stage in {2,3,4} only)
--     "3": "skip",
--     "4": { "status": "locked", "content": {...}, "origin": "imported" }  -- content-bearing lock
--   }
-- }

-- ============================================================================
-- 1. stage_states.status — widen CHECK constraint to add 'skipped'
-- ============================================================================

ALTER TABLE stage_states DROP CONSTRAINT IF EXISTS stage_states_status_check;
ALTER TABLE stage_states
    ADD CONSTRAINT stage_states_status_check
        CHECK (status IN ('draft', 'locked', 'invalidated', 'outdated', 'skipped'));

-- ============================================================================
-- 2. stage_states.origin — provenance tag column
-- ============================================================================

ALTER TABLE stage_states ADD COLUMN IF NOT EXISTS origin TEXT NULL;

ALTER TABLE stage_states DROP CONSTRAINT IF EXISTS stage_states_origin_check;
ALTER TABLE stage_states
    ADD CONSTRAINT stage_states_origin_check
        CHECK (origin IS NULL OR origin IN ('skipped', 'imported', 'ai-generated', 'authored'));

COMMENT ON COLUMN stage_states.origin IS
    'Provenance of this version''s content: skipped (skip transition, content always {}), imported (from Streamline intake, used as-is or AI-formatted), ai-generated (Streamline backfill), authored (normal manual pipeline). NULL for pre-Streamline rows and rows written outside Streamline.';

CREATE INDEX IF NOT EXISTS idx_stage_states_origin
    ON stage_states(origin)
    WHERE origin IS NOT NULL;

-- ============================================================================
-- 3. streamline_commit(payload jsonb) — atomic multi-transition writer
-- ============================================================================
--
-- Postgres functions are atomic: any RAISE EXCEPTION mid-function rolls back
-- every write made earlier in the same call. This is the sole mechanism for
-- "lock stage 1, skip stage 2, skip stage 3, lock stage 4 with content" (or any
-- future combination) landing as one all-or-nothing transaction, invoked via
-- supabase.rpc('streamline_commit', { payload }) from the Node route, which
-- performs auth/ownership checks first. Node maps a caught exception's message
-- to a 400 response.

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

            -- Reset per-iteration state — SELECT INTO leaves prior values in
            -- place when a query returns no rows.
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
                -- ---- Skip transition ----
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
                -- ---- Lock existing draft content as-is (e.g. stage 1) ----
                IF v_current_version IS NULL THEN
                    RAISE EXCEPTION 'streamline_commit: stage % has no existing content to lock', v_stage_num;
                END IF;

                v_new_status := 'locked';
                v_new_origin := COALESCE(v_current_origin, 'authored');
                v_new_content := v_current_content;
                v_new_regen := COALESCE(v_current_regen, '');

            ELSIF jsonb_typeof(v_transition) = 'object' THEN
                -- ---- Content-bearing transition: { status, content, origin } ----
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

    UPDATE projects SET updated_at = NOW() WHERE id = v_project_id;

    RETURN jsonb_build_object(
        'success', true,
        'project_id', v_project_id,
        'branch_id', v_branch_id,
        'stages', v_inserted_stages
    );
END;
$$;

COMMENT ON FUNCTION streamline_commit(JSONB) IS
    'Streamline atomic commit: applies stage_transitions (Phase 1), assets (Phase 3), and resolutions/resolution_edits (Phase 4) in one transaction. Extended in place via CREATE OR REPLACE as later phases land — never a second commit mechanism.';
