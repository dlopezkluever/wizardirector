-- Migration 008: Global Assets and Project Assets
-- Feature 3.2: Centralized asset management across projects
-- Improvements: image_prompt field, version tracking, proper FK constraints

-- ============================================================================
-- GLOBAL ASSETS TABLE
-- ============================================================================
-- Purpose: Reusable master assets (characters, props, locations) across all projects

CREATE TABLE global_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Asset Identity
    name TEXT NOT NULL,
    asset_type TEXT NOT NULL CHECK (asset_type IN ('character', 'prop', 'location')),
    
    -- Visual Definition
    description TEXT NOT NULL, -- User-facing narrative description
    image_prompt TEXT, -- AI-optimized prompt for image generation (optional, falls back to description)
    image_key_url TEXT, -- Nano Banana generated reference image
    visual_style_capsule_id UUID REFERENCES style_capsules(id) ON DELETE SET NULL, -- Unlink if style deleted
    
    -- Voice Profile (Stretch Goal - nullable for now)
    voice_profile_id TEXT, -- ElevenLabs ID or similar
    
    -- Version Tracking (for future sync/update workflows)
    version INTEGER DEFAULT 1, -- Increment when asset is updated
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    promoted_from_project_id UUID REFERENCES projects(id) -- NULL if created directly in library
);

-- Indexes for performance
CREATE INDEX idx_global_assets_user ON global_assets(user_id);
CREATE INDEX idx_global_assets_type ON global_assets(asset_type);
CREATE INDEX idx_global_assets_created ON global_assets(created_at DESC);
CREATE INDEX idx_global_assets_name ON global_assets(user_id, name); -- For search

-- ============================================================================
-- PROJECT ASSETS TABLE
-- ============================================================================
-- Purpose: Project-specific asset definitions (Stage 5)

CREATE TABLE project_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    
    -- Source Tracking
    global_asset_id UUID REFERENCES global_assets(id) ON DELETE SET NULL, -- NULL if created fresh in project
    source_version INTEGER, -- Version of global asset when cloned (for future sync detection)
    
    -- Asset Identity
    name TEXT NOT NULL,
    asset_type TEXT NOT NULL CHECK (asset_type IN ('character', 'prop', 'location')),
    
    -- Visual Definition
    description TEXT NOT NULL,
    image_prompt TEXT, -- Project-specific override of image prompt
    image_key_url TEXT,
    visual_style_capsule_id UUID REFERENCES style_capsules(id) ON DELETE SET NULL,
    
    -- Status
    locked BOOLEAN DEFAULT FALSE, -- Stage 5 gatekeeper - must be true to proceed
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_project_assets_project ON project_assets(project_id);
CREATE INDEX idx_project_assets_branch ON project_assets(branch_id);
CREATE INDEX idx_project_assets_global ON project_assets(global_asset_id); -- For dependency checking
CREATE INDEX idx_project_assets_type ON project_assets(asset_type);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE global_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_assets ENABLE ROW LEVEL SECURITY;

-- Global Assets: Users can only access their own assets
CREATE POLICY "Users can view own global assets" ON global_assets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own global assets" ON global_assets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own global assets" ON global_assets
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own global assets" ON global_assets
    FOR DELETE USING (auth.uid() = user_id);

-- Project Assets: Users can access assets of their projects
CREATE POLICY "Users can view project assets" ON project_assets
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = project_assets.project_id
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert project assets" ON project_assets
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = project_assets.project_id
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update project assets" ON project_assets
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = project_assets.project_id
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete project assets" ON project_assets
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = project_assets.project_id
            AND projects.user_id = auth.uid()
        )
    );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_global_assets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_project_assets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to automatically update timestamps
CREATE TRIGGER update_global_assets_timestamp
    BEFORE UPDATE ON global_assets
    FOR EACH ROW
    EXECUTE FUNCTION update_global_assets_updated_at();

CREATE TRIGGER update_project_assets_timestamp
    BEFORE UPDATE ON project_assets
    FOR EACH ROW
    EXECUTE FUNCTION update_project_assets_updated_at();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE global_assets IS 'User-owned reusable assets (characters, props, locations) that can be cloned into projects';
COMMENT ON TABLE project_assets IS 'Project-specific assets defined in Stage 5, may be linked to global_assets';

COMMENT ON COLUMN global_assets.description IS 'User-facing narrative description of the asset';
COMMENT ON COLUMN global_assets.image_prompt IS 'AI-optimized prompt for image generation (falls back to description if NULL)';
COMMENT ON COLUMN global_assets.version IS 'Increments on update, enables future sync detection in project_assets';
COMMENT ON COLUMN global_assets.promoted_from_project_id IS 'If asset was promoted from a project, tracks source project';

COMMENT ON COLUMN project_assets.global_asset_id IS 'If cloned from library, references source global asset';
COMMENT ON COLUMN project_assets.source_version IS 'Version of global asset when cloned, for detecting available updates';
COMMENT ON COLUMN project_assets.locked IS 'Stage 5 gatekeeper - must be true before advancing to Stage 6';


