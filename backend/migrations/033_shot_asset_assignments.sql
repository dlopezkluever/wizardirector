-- Migration 033: Shot Asset Assignments
-- Purpose: Per-shot asset assignment with presence_type control
-- Replaces implicit "all assets → all shots" with explicit, deterministic assignment model

-- ============================================================================
-- SHOT ASSET ASSIGNMENTS TABLE
-- ============================================================================

CREATE TABLE shot_asset_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shot_id UUID NOT NULL REFERENCES shots(id) ON DELETE CASCADE,
    scene_asset_instance_id UUID NOT NULL REFERENCES scene_asset_instances(id) ON DELETE CASCADE,
    presence_type TEXT NOT NULL DEFAULT 'throughout'
        CHECK (presence_type IN ('throughout', 'enters', 'exits', 'passes_through')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- One assignment per asset per shot
    UNIQUE(shot_id, scene_asset_instance_id)
);

-- Indexes for performance
CREATE INDEX idx_shot_asset_assignments_shot ON shot_asset_assignments(shot_id);
CREATE INDEX idx_shot_asset_assignments_instance ON shot_asset_assignments(scene_asset_instance_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE shot_asset_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own shot asset assignments" ON shot_asset_assignments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM shots sh
            JOIN scenes s ON s.id = sh.scene_id
            JOIN branches b ON b.id = s.branch_id
            JOIN projects p ON p.id = b.project_id
            WHERE sh.id = shot_asset_assignments.shot_id
            AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own shot asset assignments" ON shot_asset_assignments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM shots sh
            JOIN scenes s ON s.id = sh.scene_id
            JOIN branches b ON b.id = s.branch_id
            JOIN projects p ON p.id = b.project_id
            WHERE sh.id = shot_asset_assignments.shot_id
            AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own shot asset assignments" ON shot_asset_assignments
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM shots sh
            JOIN scenes s ON s.id = sh.scene_id
            JOIN branches b ON b.id = s.branch_id
            JOIN projects p ON p.id = b.project_id
            WHERE sh.id = shot_asset_assignments.shot_id
            AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own shot asset assignments" ON shot_asset_assignments
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM shots sh
            JOIN scenes s ON s.id = sh.scene_id
            JOIN branches b ON b.id = s.branch_id
            JOIN projects p ON p.id = b.project_id
            WHERE sh.id = shot_asset_assignments.shot_id
            AND p.user_id = auth.uid()
        )
    );

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_shot_asset_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER shot_asset_assignments_updated_at
    BEFORE UPDATE ON shot_asset_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_shot_asset_assignments_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE shot_asset_assignments IS 'Per-shot asset assignments with presence_type control (throughout, enters, exits, passes_through)';
COMMENT ON COLUMN shot_asset_assignments.presence_type IS 'Controls when asset appears: throughout=full duration, enters=appears mid-shot, exits=leaves mid-shot, passes_through=brief text-only mention';
