-- Migration 010: Support Global Asset Image Generation
-- Allows image_generation_jobs to support global assets (not tied to projects)

-- Make project_id and branch_id nullable to support global assets
ALTER TABLE image_generation_jobs
    ALTER COLUMN project_id DROP NOT NULL;

ALTER TABLE image_generation_jobs
    ALTER COLUMN branch_id DROP NOT NULL;

-- Update unique index to handle NULL project_id
DROP INDEX IF EXISTS idx_image_jobs_idempotency;

CREATE UNIQUE INDEX idx_image_jobs_idempotency ON image_generation_jobs(project_id, idempotency_key) 
    WHERE idempotency_key IS NOT NULL AND project_id IS NOT NULL;

-- Add separate index for global asset idempotency (when project_id is NULL)
CREATE UNIQUE INDEX idx_image_jobs_global_idempotency ON image_generation_jobs(asset_id, idempotency_key) 
    WHERE idempotency_key IS NOT NULL AND project_id IS NULL;

-- Update RLS policy to allow viewing global asset jobs
DROP POLICY IF EXISTS "Users can view own image generation jobs" ON image_generation_jobs;

CREATE POLICY "Users can view own image generation jobs" ON image_generation_jobs
    FOR SELECT USING (
        -- Project-based jobs: user owns the project
        (project_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = image_generation_jobs.project_id
            AND projects.user_id = auth.uid()
        ))
        OR
        -- Global asset jobs: user owns the global asset
        (project_id IS NULL AND EXISTS (
            SELECT 1 FROM global_assets
            WHERE global_assets.id = image_generation_jobs.asset_id
            AND global_assets.user_id = auth.uid()
        ))
    );

COMMENT ON TABLE image_generation_jobs IS 
    'Tracks image generation jobs for both project assets and global assets. project_id is NULL for global asset jobs.';

