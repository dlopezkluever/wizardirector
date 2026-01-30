-- backend/migrations/013_add_end_frame_thumbnail.sql
--
-- Add end_frame_thumbnail_url to scenes for Rearview Mirror / Stage 10/12.

-- Forward migration
ALTER TABLE scenes
    ADD COLUMN end_frame_thumbnail_url TEXT;

COMMENT ON COLUMN scenes.end_frame_thumbnail_url IS
    'URL to the final frame thumbnail from Supabase Storage.
     Populated at Stage 10 (Frame Generation) or Stage 12 (Video Complete).
     Used by Rearview Mirror for visual continuity reference.';

-- Rollback (if needed)
-- Run this manually if migration needs to be undone:
-- ALTER TABLE scenes DROP COLUMN end_frame_thumbnail_url;

