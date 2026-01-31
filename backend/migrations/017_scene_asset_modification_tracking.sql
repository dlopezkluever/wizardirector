-- Migration 017: Modification Tracking - Audit Trail (Feature 5.1 Task 7)
-- Adds modification_count, last_modified_field, modification_reason and trigger
-- to scene_asset_instances for audit trail.

-- ============================================================================
-- ADD MODIFICATION TRACKING COLUMNS
-- ============================================================================

ALTER TABLE scene_asset_instances
  ADD COLUMN IF NOT EXISTS modification_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_modified_field TEXT,
  ADD COLUMN IF NOT EXISTS modification_reason TEXT;

COMMENT ON COLUMN scene_asset_instances.modification_count IS 'Increments on each update; audit trail';
COMMENT ON COLUMN scene_asset_instances.last_modified_field IS 'Which field was last changed (description_override, status_tags, image_key_url, carry_forward)';
COMMENT ON COLUMN scene_asset_instances.modification_reason IS 'Optional user-provided reason for change';

-- ============================================================================
-- MODIFICATION TRACKING TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION track_scene_asset_modifications()
RETURNS TRIGGER AS $$
BEGIN
    -- Increment modification count
    NEW.modification_count := OLD.modification_count + 1;

    -- Track which field changed (first match wins; caller can set modification_reason)
    IF NEW.description_override IS DISTINCT FROM OLD.description_override THEN
        NEW.last_modified_field := 'description_override';
    ELSIF NEW.status_tags IS DISTINCT FROM OLD.status_tags THEN
        NEW.last_modified_field := 'status_tags';
    ELSIF NEW.image_key_url IS DISTINCT FROM OLD.image_key_url THEN
        NEW.last_modified_field := 'image_key_url';
    ELSIF NEW.carry_forward IS DISTINCT FROM OLD.carry_forward THEN
        NEW.last_modified_field := 'carry_forward';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS scene_asset_modification_tracker ON scene_asset_instances;
CREATE TRIGGER scene_asset_modification_tracker
    BEFORE UPDATE ON scene_asset_instances
    FOR EACH ROW
    EXECUTE FUNCTION track_scene_asset_modifications();
