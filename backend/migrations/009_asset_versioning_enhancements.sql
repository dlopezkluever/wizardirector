-- Migration 009: Asset Versioning Enhancements
-- Feature 3.4: Add optional tracking fields for asset synchronization
-- 
-- This migration adds optional fields to track synchronization history
-- and improve the version sync workflow.

-- ============================================================================
-- ADD TRACKING FIELDS TO project_assets
-- ============================================================================

-- Add last_synced_at timestamp to track when asset was last synced from global
ALTER TABLE project_assets
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- Add index for efficient querying of recently synced assets
CREATE INDEX IF NOT EXISTS idx_project_assets_last_synced 
ON project_assets(last_synced_at DESC) 
WHERE global_asset_id IS NOT NULL;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN project_assets.last_synced_at IS 'Timestamp of last successful sync from global asset (NULL if never synced or not linked to global asset)';

