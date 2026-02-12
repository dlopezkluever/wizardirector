-- Migration 025: Asset Angle Variants (3C.2)
-- Purpose: Store multi-angle views (front, side, 3/4, back) for character assets
-- to improve frame generation accuracy across different camera angles.

-- ============================================================================
-- ASSET ANGLE VARIANTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS asset_angle_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_asset_id UUID NOT NULL REFERENCES project_assets(id) ON DELETE CASCADE,
    angle_type TEXT NOT NULL CHECK (angle_type IN ('front', 'side', 'three_quarter', 'back')),
    image_url TEXT,
    storage_path TEXT,
    image_generation_job_id UUID REFERENCES image_generation_jobs(id),
    prompt_snapshot TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_asset_id, angle_type)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_angle_variants_asset ON asset_angle_variants(project_asset_id);
CREATE INDEX IF NOT EXISTS idx_angle_variants_status ON asset_angle_variants(status);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE asset_angle_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their angle variants"
    ON asset_angle_variants FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM project_assets pa
            JOIN projects p ON pa.project_id = p.id
            WHERE pa.id = asset_angle_variants.project_asset_id
            AND p.user_id = auth.uid()
        )
    );

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================

CREATE TRIGGER update_angle_variants_updated_at
    BEFORE UPDATE ON asset_angle_variants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
