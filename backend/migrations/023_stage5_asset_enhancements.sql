-- Migration 023: Stage 5 Asset Enhancements
-- Features: 3A.2 (Deferred Assets), 3A.3 (Manual Assets + Scene Numbers), 3A.6 (Image Carousel)
-- Purpose: Add defer/restore, manual asset creation with scene tracking, and generation attempt history

-- ============================================================================
-- ALTER project_assets — add deferred, scene_numbers, source columns
-- ============================================================================

ALTER TABLE project_assets
    ADD COLUMN IF NOT EXISTS deferred BOOLEAN DEFAULT FALSE;

ALTER TABLE project_assets
    ADD COLUMN IF NOT EXISTS scene_numbers INTEGER[] DEFAULT '{}';

ALTER TABLE project_assets
    ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'extracted'
        CHECK (source IN ('extracted', 'manual', 'cloned'));

-- ============================================================================
-- PROJECT ASSET GENERATION ATTEMPTS TABLE (3A.6)
-- ============================================================================

CREATE TABLE project_asset_generation_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_asset_id UUID NOT NULL REFERENCES project_assets(id) ON DELETE CASCADE,

    -- Image data
    image_url TEXT NOT NULL,
    storage_path TEXT,

    -- Source tracking
    source TEXT NOT NULL CHECK (source IN ('generated', 'uploaded')),
    is_selected BOOLEAN DEFAULT FALSE,

    -- Upload metadata (for source='uploaded')
    original_filename TEXT,
    file_size_bytes INTEGER,
    mime_type TEXT,

    -- Ordering
    attempt_number INTEGER NOT NULL DEFAULT 1,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partial unique index: guarantee exactly one selected attempt per project asset
CREATE UNIQUE INDEX idx_project_attempts_one_selected
    ON project_asset_generation_attempts (project_asset_id)
    WHERE is_selected = TRUE;

-- Performance indexes
CREATE INDEX idx_project_attempts_asset ON project_asset_generation_attempts(project_asset_id);
CREATE INDEX idx_project_attempts_asset_created ON project_asset_generation_attempts(project_asset_id, created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE project_asset_generation_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own project asset attempts" ON project_asset_generation_attempts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM project_assets pa
            JOIN projects p ON p.id = pa.project_id
            WHERE pa.id = project_asset_generation_attempts.project_asset_id
            AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own project asset attempts" ON project_asset_generation_attempts
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM project_assets pa
            JOIN projects p ON p.id = pa.project_id
            WHERE pa.id = project_asset_generation_attempts.project_asset_id
            AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own project asset attempts" ON project_asset_generation_attempts
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM project_assets pa
            JOIN projects p ON p.id = pa.project_id
            WHERE pa.id = project_asset_generation_attempts.project_asset_id
            AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own project asset attempts" ON project_asset_generation_attempts
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM project_assets pa
            JOIN projects p ON p.id = pa.project_id
            WHERE pa.id = project_asset_generation_attempts.project_asset_id
            AND p.user_id = auth.uid()
        )
    );

-- ============================================================================
-- TRIGGER: auto-update updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_project_asset_attempts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_project_asset_attempts_timestamp
    BEFORE UPDATE ON project_asset_generation_attempts
    FOR EACH ROW
    EXECUTE FUNCTION update_project_asset_attempts_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE project_asset_generation_attempts IS 'Tracks generation history per project asset for carousel browsing (3A.6)';
COMMENT ON COLUMN project_asset_generation_attempts.source IS 'Origin: generated (AI) or uploaded (user file)';
COMMENT ON COLUMN project_asset_generation_attempts.is_selected IS 'Whether this attempt is the currently active image for the asset';
COMMENT ON COLUMN project_asset_generation_attempts.attempt_number IS 'Sequential attempt number within the asset';
COMMENT ON COLUMN project_assets.deferred IS '3A.2: Asset is deferred (not required for Stage 5 completion)';
COMMENT ON COLUMN project_assets.scene_numbers IS '3A.3: Scene numbers where this asset appears';
COMMENT ON COLUMN project_assets.source IS '3A.3: How the asset was created (extracted, manual, cloned)';
