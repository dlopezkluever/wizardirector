-- Migration 022: Scene Asset Generation Attempts
-- Feature 3B.1: Track generation history per scene asset instance with carousel support
-- Purpose: Enable users to browse and select from multiple generation attempts

-- ============================================================================
-- SCENE ASSET GENERATION ATTEMPTS TABLE
-- ============================================================================

CREATE TABLE scene_asset_generation_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scene_asset_instance_id UUID NOT NULL REFERENCES scene_asset_instances(id) ON DELETE CASCADE,

    -- Image data
    image_url TEXT NOT NULL,
    storage_path TEXT,

    -- Source tracking
    source TEXT NOT NULL CHECK (source IN ('generated', 'uploaded', 'master_copy')),
    is_selected BOOLEAN DEFAULT FALSE,

    -- Generation metadata (for source='generated')
    image_generation_job_id UUID REFERENCES image_generation_jobs(id) ON DELETE SET NULL,
    prompt_snapshot TEXT,
    cost_credits NUMERIC(10,4),

    -- Upload metadata (for source='uploaded')
    original_filename TEXT,
    file_size_bytes INTEGER,
    mime_type TEXT,

    -- Master copy metadata (for source='master_copy')
    copied_from_url TEXT,

    -- Ordering
    attempt_number INTEGER NOT NULL DEFAULT 1,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partial unique index: guarantee exactly one selected attempt per instance
CREATE UNIQUE INDEX idx_attempts_one_selected
    ON scene_asset_generation_attempts (scene_asset_instance_id)
    WHERE is_selected = TRUE;

-- Performance indexes
CREATE INDEX idx_attempts_instance ON scene_asset_generation_attempts(scene_asset_instance_id);
CREATE INDEX idx_attempts_instance_created ON scene_asset_generation_attempts(scene_asset_instance_id, created_at DESC);
CREATE INDEX idx_attempts_job ON scene_asset_generation_attempts(image_generation_job_id);

-- ============================================================================
-- ALTER scene_asset_instances — add columns for 3B.4 and 3B.2
-- ============================================================================

ALTER TABLE scene_asset_instances
    ADD COLUMN IF NOT EXISTS use_master_as_is BOOLEAN DEFAULT FALSE;

ALTER TABLE scene_asset_instances
    ADD COLUMN IF NOT EXISTS selected_master_reference_url TEXT;

ALTER TABLE scene_asset_instances
    ADD COLUMN IF NOT EXISTS selected_master_reference_source TEXT
        CHECK (selected_master_reference_source IN ('stage5_master', 'prior_scene_instance'));

ALTER TABLE scene_asset_instances
    ADD COLUMN IF NOT EXISTS selected_master_reference_instance_id UUID
        REFERENCES scene_asset_instances(id) ON DELETE SET NULL;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE scene_asset_generation_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own generation attempts" ON scene_asset_generation_attempts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM scene_asset_instances sai
            JOIN scenes s ON s.id = sai.scene_id
            JOIN branches b ON b.id = s.branch_id
            JOIN projects p ON p.id = b.project_id
            WHERE sai.id = scene_asset_generation_attempts.scene_asset_instance_id
            AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own generation attempts" ON scene_asset_generation_attempts
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM scene_asset_instances sai
            JOIN scenes s ON s.id = sai.scene_id
            JOIN branches b ON b.id = s.branch_id
            JOIN projects p ON p.id = b.project_id
            WHERE sai.id = scene_asset_generation_attempts.scene_asset_instance_id
            AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own generation attempts" ON scene_asset_generation_attempts
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM scene_asset_instances sai
            JOIN scenes s ON s.id = sai.scene_id
            JOIN branches b ON b.id = s.branch_id
            JOIN projects p ON p.id = b.project_id
            WHERE sai.id = scene_asset_generation_attempts.scene_asset_instance_id
            AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own generation attempts" ON scene_asset_generation_attempts
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM scene_asset_instances sai
            JOIN scenes s ON s.id = sai.scene_id
            JOIN branches b ON b.id = s.branch_id
            JOIN projects p ON p.id = b.project_id
            WHERE sai.id = scene_asset_generation_attempts.scene_asset_instance_id
            AND p.user_id = auth.uid()
        )
    );

-- ============================================================================
-- TRIGGER: auto-update updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_generation_attempts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_generation_attempts_timestamp
    BEFORE UPDATE ON scene_asset_generation_attempts
    FOR EACH ROW
    EXECUTE FUNCTION update_generation_attempts_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE scene_asset_generation_attempts IS 'Tracks generation history per scene asset instance for carousel browsing (3B.1)';
COMMENT ON COLUMN scene_asset_generation_attempts.source IS 'Origin: generated (AI), uploaded (user file), master_copy (copied from master/prior scene)';
COMMENT ON COLUMN scene_asset_generation_attempts.is_selected IS 'Whether this attempt is the currently active image for the instance';
COMMENT ON COLUMN scene_asset_generation_attempts.attempt_number IS 'Sequential attempt number within the instance';
COMMENT ON COLUMN scene_asset_instances.use_master_as_is IS '3B.4: Use master asset image directly without generating';
COMMENT ON COLUMN scene_asset_instances.selected_master_reference_url IS '3B.2: URL of the selected master reference image';
COMMENT ON COLUMN scene_asset_instances.selected_master_reference_source IS '3B.2: Source of master reference (stage5_master or prior_scene_instance)';
COMMENT ON COLUMN scene_asset_instances.selected_master_reference_instance_id IS '3B.2: Instance ID if reference is from a prior scene instance';
