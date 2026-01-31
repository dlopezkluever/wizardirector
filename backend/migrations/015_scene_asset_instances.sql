-- Migration 015: Scene Asset Instances
-- Feature 5.1: Scene-specific asset states with inheritance tracking
-- Purpose: Enable stateful asset management across scenes (Stage 8)

-- Optional: Remove the extra composite index and/or add modification-tracking columns/trigger later if you want to match the plan exactly.


-- ============================================================================
-- SCENE ASSET INSTANCES TABLE
-- ============================================================================
-- Purpose: Track scene-specific asset states with inheritance from prior scenes

CREATE TABLE scene_asset_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scene_id UUID NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
    project_asset_id UUID NOT NULL REFERENCES project_assets(id) ON DELETE CASCADE,
    
    -- Stateful Modification (Scene-specific overrides)
    description_override TEXT, -- NULL if unchanged from inherited/master state
    image_key_url TEXT, -- Regenerated if description changed
    
    -- Status Metadata Tags (Feature 5.3)
    status_tags TEXT[], -- e.g., ['muddy', 'torn_shirt', 'bloody']
    carry_forward BOOLEAN DEFAULT TRUE, -- Should tags persist to next scene?
    
    -- Inheritance Tracking
    inherited_from_instance_id UUID REFERENCES scene_asset_instances(id) ON DELETE SET NULL,
    -- Stores the INSTANCE ID from which this instance inherited its state
    -- NULL if this is the first scene where the asset appears (Scene 1 bootstrap)
    -- Allows precise inheritance chain traversal: Scene N → Scene N-1 → ... → Scene 1
    
    -- Computed Fields (for context assembly)
    -- These are derived but stored for performance
    effective_description TEXT, -- Computed: description_override OR inherited description OR project_asset.description
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(scene_id, project_asset_id) -- One instance per asset per scene
);

-- Indexes for performance
CREATE INDEX idx_scene_instances_scene ON scene_asset_instances(scene_id);
CREATE INDEX idx_scene_instances_asset ON scene_asset_instances(project_asset_id);
CREATE INDEX idx_scene_instances_inherited ON scene_asset_instances(inherited_from_instance_id);
CREATE INDEX idx_scene_instances_scene_asset ON scene_asset_instances(scene_id, project_asset_id); -- Composite for lookups

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE scene_asset_instances ENABLE ROW LEVEL SECURITY;

-- Users can only access scene asset instances of their own projects
CREATE POLICY "Users can view own scene asset instances" ON scene_asset_instances
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM scenes s
            JOIN branches b ON b.id = s.branch_id
            JOIN projects p ON p.id = b.project_id
            WHERE s.id = scene_asset_instances.scene_id
            AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own scene asset instances" ON scene_asset_instances
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM scenes s
            JOIN branches b ON b.id = s.branch_id
            JOIN projects p ON p.id = b.project_id
            WHERE s.id = scene_asset_instances.scene_id
            AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own scene asset instances" ON scene_asset_instances
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM scenes s
            JOIN branches b ON b.id = s.branch_id
            JOIN projects p ON p.id = b.project_id
            WHERE s.id = scene_asset_instances.scene_id
            AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own scene asset instances" ON scene_asset_instances
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM scenes s
            JOIN branches b ON b.id = s.branch_id
            JOIN projects p ON p.id = b.project_id
            WHERE s.id = scene_asset_instances.scene_id
            AND p.user_id = auth.uid()
        )
    );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_scene_asset_instances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_scene_asset_instances_timestamp
    BEFORE UPDATE ON scene_asset_instances
    FOR EACH ROW
    EXECUTE FUNCTION update_scene_asset_instances_updated_at();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE scene_asset_instances IS 'Scene-specific asset states with inheritance from prior scenes (Stage 8)';
COMMENT ON COLUMN scene_asset_instances.description_override IS 'Scene-specific description override; NULL if using inherited/master description';
COMMENT ON COLUMN scene_asset_instances.status_tags IS 'Visual condition metadata (e.g., muddy, torn, bloody) for prompt injection';
COMMENT ON COLUMN scene_asset_instances.carry_forward IS 'If true, status_tags persist to next scene unless overridden';
COMMENT ON COLUMN scene_asset_instances.inherited_from_instance_id IS 'Instance ID from which this instance inherited its state (NULL if Scene 1 bootstrap); enables precise inheritance chain traversal';
COMMENT ON COLUMN scene_asset_instances.effective_description IS 'Computed final description for LLM context (description_override OR inherited OR project_asset.description)';
