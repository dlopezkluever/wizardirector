-- Migration 014: Add shot list locking to scenes table
-- Purpose: Enable Stage 7 shot list validation and gatekeeper functionality
-- CRITICAL: This migration ensures 'shot_list_ready' status exists to enable downstream Stage 8

BEGIN;

-- Add shot list locking timestamp
ALTER TABLE scenes ADD COLUMN shot_list_locked_at TIMESTAMPTZ;

COMMENT ON COLUMN scenes.shot_list_locked_at IS 
  'Timestamp when shot list was validated and locked at Stage 7. 
   NULL means shot list is still editable. Non-NULL sets status to shot_list_ready.';

-- Create partial index for performance (only index locked scenes)
CREATE INDEX idx_scenes_shot_list_locked ON scenes(shot_list_locked_at) 
  WHERE shot_list_locked_at IS NOT NULL;

-- CRITICAL: Ensure 'shot_list_ready' is a valid scene status
-- (This updates the CHECK constraint from migration 003)
-- The status was already included in migration 003, but this ensures it's present

ALTER TABLE scenes 
  DROP CONSTRAINT IF EXISTS scenes_status_check;

ALTER TABLE scenes 
  ADD CONSTRAINT scenes_status_check 
  CHECK (status IN (
    'draft',
    'shot_list_ready',      -- Status after Stage 7 lock
    'frames_locked', 
    'video_complete', 
    'outdated', 
    'continuity_broken'
  ));

COMMIT;

-- Rollback instructions:
-- BEGIN;
-- ALTER TABLE scenes DROP COLUMN shot_list_locked_at;
-- DROP INDEX IF EXISTS idx_scenes_shot_list_locked;
-- ALTER TABLE scenes DROP CONSTRAINT scenes_status_check;
-- ALTER TABLE scenes ADD CONSTRAINT scenes_status_check 
--   CHECK (status IN ('draft', 'shot_list_ready', 'frames_locked', 'video_complete', 'outdated', 'continuity_broken'));
-- COMMIT;
