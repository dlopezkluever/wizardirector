-- Migration 011: Add scene dependency caching columns
-- This migration adds columns to cache extracted dependencies and avoid re-extraction on every fetch
-- Critical for performance: enables cache checking before attempting expensive LLM extractions

ALTER TABLE scenes 
ADD COLUMN expected_characters TEXT[], -- Array of character names extracted from script
ADD COLUMN expected_location TEXT,     -- Specific location extracted from scene heading/script
ADD COLUMN expected_props TEXT[],      -- Array of prop names extracted from script
ADD COLUMN dependencies_extracted_at TIMESTAMPTZ; -- Track when dependencies were last extracted

-- Add index for efficient queries on cache invalidation checks
CREATE INDEX idx_scenes_dependencies_extracted ON scenes(dependencies_extracted_at);

-- Migration strategy:
-- 1. Existing scenes will have NULL values after migration
-- 2. Endpoint should check dependencies_extracted_at:
--    - If NULL or older than script_excerpt update: re-extract
--    - Otherwise: return cached values
-- 3. Update cache after extraction
--
-- Cache Invalidation Logic:
-- When the user edits the script in Stage 4:
-- - The scenes.updated_at timestamp is updated automatically (trigger from migration 003)
-- - Endpoint compares dependencies_extracted_at < updated_at to detect stale cache
-- - If stale, re-extraction is triggered; otherwise cached values are returned

COMMENT ON COLUMN scenes.expected_characters IS 
    'Cached array of character names extracted from script_excerpt via LLM. NULL if not yet extracted.';

COMMENT ON COLUMN scenes.expected_location IS 
    'Cached location string extracted from scene heading or script_excerpt. NULL if not yet extracted.';

COMMENT ON COLUMN scenes.expected_props IS 
    'Cached array of prop names extracted from script_excerpt via LLM. Matched against Stage 5 master assets where possible. NULL if not yet extracted.';

COMMENT ON COLUMN scenes.dependencies_extracted_at IS 
    'Timestamp when dependencies were last extracted. Used to determine if cache is stale (compare with updated_at).';