-- Migration 038: Location Views table + Shot camera metadata columns
-- Part of 3.7 Location System Enhancement (Phases A)
--
-- 1. Creates `location_views` table for multi-view location references
-- 2. Adds structured camera metadata columns to `shots` table

-- ============================================================================
-- 1. location_views table
-- ============================================================================

CREATE TABLE location_views (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_asset_id        UUID NOT NULL REFERENCES project_assets(id) ON DELETE CASCADE,
    name                    TEXT NOT NULL,             -- system name: "establishing", "direction_1", "direction_2", etc.
    alias                   TEXT,                      -- user-defined label: "stove wall", "window side", "facing the house"
    description             TEXT,                      -- what this view shows
    view_type               TEXT NOT NULL,             -- 'establishing' | 'direction'
    camera_distance         TEXT DEFAULT 'wide',       -- 'wide' | 'medium' | 'close'
    camera_height           TEXT DEFAULT 'eye_level',  -- 'eye_level' | 'high_angle' | 'low_angle' | 'overhead' | 'ground_level'
    image_key_url           TEXT,                      -- Supabase storage URL (null for stage7_inferred directions)
    is_primary              BOOLEAN DEFAULT false,     -- fallback direction for unmatched shots (should be eye-level direction, NOT establishing)
    source                  TEXT DEFAULT 'user',       -- 'user' | 'established' | 'stage7_inferred'
    established_from_scene  TEXT,                      -- if source='established': display string e.g. "Scene 2, Shot 3"
    established_from_shot_id UUID,                     -- if source='established': FK to shot record
    sort_order              INT DEFAULT 0,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(project_asset_id, name)
);

-- Constraints
ALTER TABLE location_views
    ADD CONSTRAINT chk_location_views_view_type
        CHECK (view_type IN ('establishing', 'direction')),
    ADD CONSTRAINT chk_location_views_camera_distance
        CHECK (camera_distance IN ('wide', 'medium', 'close')),
    ADD CONSTRAINT chk_location_views_camera_height
        CHECK (camera_height IN ('eye_level', 'high_angle', 'low_angle', 'overhead', 'ground_level')),
    ADD CONSTRAINT chk_location_views_source
        CHECK (source IN ('user', 'established', 'stage7_inferred'));

-- Indexes
CREATE INDEX idx_location_views_asset ON location_views(project_asset_id);
CREATE INDEX idx_location_views_primary ON location_views(project_asset_id) WHERE is_primary = true;

-- Row Level Security
ALTER TABLE location_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own location views" ON location_views
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM project_assets pa
            JOIN branches b ON b.id = pa.branch_id
            JOIN projects p ON p.id = b.project_id
            WHERE pa.id = location_views.project_asset_id
            AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own location views" ON location_views
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM project_assets pa
            JOIN branches b ON b.id = pa.branch_id
            JOIN projects p ON p.id = b.project_id
            WHERE pa.id = location_views.project_asset_id
            AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own location views" ON location_views
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM project_assets pa
            JOIN branches b ON b.id = pa.branch_id
            JOIN projects p ON p.id = b.project_id
            WHERE pa.id = location_views.project_asset_id
            AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own location views" ON location_views
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM project_assets pa
            JOIN branches b ON b.id = pa.branch_id
            JOIN projects p ON p.id = b.project_id
            WHERE pa.id = location_views.project_asset_id
            AND p.user_id = auth.uid()
        )
    );

-- Auto-update updated_at trigger
CREATE TRIGGER location_views_updated_at
    BEFORE UPDATE ON location_views
    FOR EACH ROW
    EXECUTE FUNCTION update_shots_updated_at();

-- ============================================================================
-- 2. Shot camera metadata columns
-- ============================================================================

ALTER TABLE shots
    ADD COLUMN IF NOT EXISTS camera_distance     TEXT,  -- 'wide' | 'medium' | 'close'
    ADD COLUMN IF NOT EXISTS camera_height       TEXT,  -- 'eye_level' | 'high_angle' | 'low_angle' | 'overhead' | 'ground_level'
    ADD COLUMN IF NOT EXISTS camera_movement     TEXT,  -- free-text movement description
    ADD COLUMN IF NOT EXISTS camera_direction_id UUID REFERENCES location_views(id) ON DELETE SET NULL;

-- Index for direction lookups
CREATE INDEX IF NOT EXISTS idx_shots_camera_direction ON shots(camera_direction_id) WHERE camera_direction_id IS NOT NULL;
