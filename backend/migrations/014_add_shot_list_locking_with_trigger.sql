-- Migration 014: Add shot list locking to scenes table
-- Purpose: Enable Stage 7 shot list validation and gatekeeper functionality
-- CRITICAL: This migration uses a database trigger to ensure shot_list_locked_at 
--           and status are always in sync, preventing application-level bugs

BEGIN;

-- 1. Add shot list locking timestamp
ALTER TABLE scenes ADD COLUMN shot_list_locked_at TIMESTAMPTZ;

COMMENT ON COLUMN scenes.shot_list_locked_at IS 
  'Timestamp when shot list was validated and locked at Stage 7. 
   Non-NULL value automatically triggers status update to shot_list_ready via trigger.
   Setting to NULL unlocks the shot list and reverts status to draft.';

-- 2. Update the status check constraint (ensure all production states are valid)
ALTER TABLE scenes DROP CONSTRAINT IF EXISTS scenes_status_check;

ALTER TABLE scenes ADD CONSTRAINT scenes_status_check 
  CHECK (status IN (
    'draft', 
    'shot_list_ready',      -- Status after Stage 7 lock (set by trigger)
    'frames_locked', 
    'video_complete', 
    'outdated', 
    'continuity_broken'
  ));

-- 3. Trigger Function: Auto-sync status when shot_list_locked_at changes
-- This ensures data integrity and prevents application bugs
CREATE OR REPLACE FUNCTION fn_sync_scene_lock_status()
RETURNS TRIGGER AS $$
BEGIN
    -- LOCKING: When shot list is locked, set status to shot_list_ready
    IF NEW.shot_list_locked_at IS NOT NULL AND OLD.shot_list_locked_at IS NULL THEN
        NEW.status := 'shot_list_ready';
        
    -- UNLOCKING: Only revert to draft if currently at shot_list_ready
    -- This prevents accidentally reverting downstream statuses (frames_locked, video_complete)
    ELSIF NEW.shot_list_locked_at IS NULL AND OLD.shot_list_locked_at IS NOT NULL THEN
        IF OLD.status = 'shot_list_ready' THEN
            NEW.status := 'draft';
        END IF;
        -- If status is frames_locked or video_complete, leave it unchanged
        -- Application layer can set to 'outdated' if needed
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_sync_scene_lock_status() IS 
  'Automatically syncs scene status with shot_list_locked_at timestamp.
   Lock: shot_list_locked_at NOT NULL → status = shot_list_ready
   Unlock: shot_list_locked_at NULL → status = draft (only if was shot_list_ready)';

-- 4. Apply the trigger
CREATE TRIGGER trg_sync_scene_lock_status
BEFORE UPDATE ON scenes
FOR EACH ROW
EXECUTE FUNCTION fn_sync_scene_lock_status();

-- 5. Performance index (partial index for locked scenes only)
CREATE INDEX idx_scenes_shot_list_locked ON scenes(shot_list_locked_at) 
  WHERE shot_list_locked_at IS NOT NULL;

COMMIT;

-- Rollback instructions:
-- BEGIN;
-- DROP TRIGGER IF EXISTS trg_sync_scene_lock_status ON scenes;
-- DROP FUNCTION IF EXISTS fn_sync_scene_lock_status();
-- ALTER TABLE scenes DROP COLUMN shot_list_locked_at;
-- DROP INDEX IF EXISTS idx_scenes_shot_list_locked;
-- ALTER TABLE scenes DROP CONSTRAINT scenes_status_check;
-- ALTER TABLE scenes ADD CONSTRAINT scenes_status_check 
--   CHECK (status IN ('draft', 'shot_list_ready', 'frames_locked', 'video_complete', 'outdated', 'continuity_broken'));
-- COMMIT;