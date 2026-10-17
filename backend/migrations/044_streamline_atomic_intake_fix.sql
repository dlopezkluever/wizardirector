-- Migration 044: Make Streamline intake atomic and enforce lock prerequisites.
-- This is an upgrade for databases where migration 043 is already applied.

CREATE OR REPLACE FUNCTION enforce_streamline_stage_lock_prerequisite()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_previous_status TEXT;
BEGIN
    IF NEW.stage_number > 1 AND NEW.status = 'locked' THEN
        SELECT status INTO v_previous_status
        FROM stage_states
        WHERE branch_id = NEW.branch_id
          AND stage_number = NEW.stage_number - 1
        ORDER BY version DESC
        LIMIT 1;

        IF v_previous_status IS DISTINCT FROM 'locked'
           AND v_previous_status IS DISTINCT FROM 'skipped' THEN
            RAISE EXCEPTION 'streamline_commit: cannot lock stage % — stage % must be locked or skipped first (currently %)',
                NEW.stage_number,
                NEW.stage_number - 1,
                COALESCE(v_previous_status, 'not started');
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_streamline_stage_lock_prerequisite ON stage_states;
CREATE TRIGGER trg_streamline_stage_lock_prerequisite
    BEFORE INSERT ON stage_states
    FOR EACH ROW
    EXECUTE FUNCTION enforce_streamline_stage_lock_prerequisite();

CREATE OR REPLACE FUNCTION streamline_commit_atomic(payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_project_id UUID := (payload->>'project_id')::UUID;
    v_user_id UUID := NULLIF(payload->>'user_id', '')::UUID;
    v_branch_id UUID;
    v_stage1_version INTEGER;
BEGIN
    IF v_project_id IS NULL THEN
        RAISE EXCEPTION 'streamline_commit_atomic: project_id is required';
    END IF;

    SELECT active_branch_id INTO v_branch_id
    FROM projects
    WHERE id = v_project_id;

    IF v_branch_id IS NULL THEN
        RAISE EXCEPTION 'streamline_commit_atomic: project % not found or has no active branch', v_project_id;
    END IF;

    PERFORM 1 FROM stage_states
    WHERE branch_id = v_branch_id AND stage_number BETWEEN 1 AND 5
    FOR UPDATE;

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
        SELECT COALESCE(MAX(version), 0) INTO v_stage1_version
        FROM stage_states
        WHERE branch_id = v_branch_id AND stage_number = 1;

        INSERT INTO stage_states (
            branch_id, stage_number, version, status, origin, content,
            regeneration_guidance, created_by, inherited_from_stage_id
        ) VALUES (
            v_branch_id, 1, v_stage1_version + 1, 'draft',
            COALESCE(payload->'stage_1_draft'->>'origin', 'authored'),
            COALESCE(payload->'stage_1_draft'->'content', '{}'::JSONB),
            COALESCE(payload->'stage_1_draft'->>'regenerationGuidance', ''),
            v_user_id, NULL
        );
    END IF;

    RETURN streamline_commit(payload - 'project_config' - 'stage_1_draft');
END;
$$;

COMMENT ON FUNCTION streamline_commit_atomic(JSONB) IS
    'Streamline upgrade wrapper: persists project configuration and the Stage 1 draft in the same transaction as streamline_commit.';
