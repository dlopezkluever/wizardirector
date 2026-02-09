ALTER TABLE scenes ADD COLUMN stage_locks JSONB DEFAULT '{}';

-- Backfill from existing shot_list_locked_at
UPDATE scenes SET stage_locks = jsonb_build_object(
'7', CASE WHEN shot_list_locked_at IS NOT NULL
    THEN jsonb_build_object('status', 'locked', 'locked_at', shot_list_locked_at::text)
    ELSE jsonb_build_object('status', 'draft') END
) WHERE stage_locks = '{}' OR stage_locks IS NULL;

-- This adds the stage_locks JSONB column and backfills stage 7 lock data from the existing shot_list_locked_at column.
-- Ran successfully on prod.