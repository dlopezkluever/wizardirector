-- Migration 021: Video Generation Jobs Table for Stage 11/12
-- Tracks video generation jobs queued after Stage 11 confirmation

CREATE TABLE video_generation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Core relationships
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    scene_id UUID NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
    shot_id UUID NOT NULL REFERENCES shots(id) ON DELETE CASCADE,

    -- Model variant selection
    model_variant TEXT NOT NULL DEFAULT 'veo_3_1_fast' CHECK (model_variant IN (
        'veo_3_1_fast',      -- $0.15/second
        'veo_3_1_standard'   -- $0.40/second
    )),

    -- Execution state machine
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN (
        'queued',           -- Waiting to be processed
        'processing',       -- Job picked up by executor
        'generating',       -- Provider API call in progress
        'uploading',        -- Uploading to storage
        'completed',        -- Successfully generated
        'failed'            -- Generation failed
    )),

    -- Frame references
    start_frame_id UUID NOT NULL REFERENCES frames(id),
    end_frame_id UUID REFERENCES frames(id),

    -- Frame URLs (snapshot at queue time for reproducibility)
    start_frame_url TEXT NOT NULL,
    end_frame_url TEXT,

    -- Prompt snapshots (locked at queue time)
    video_prompt_snapshot TEXT NOT NULL,
    frame_prompt_snapshot TEXT,

    -- Video parameters
    duration_seconds INTEGER NOT NULL,

    -- Cost tracking
    estimated_cost NUMERIC(10,4) NOT NULL,
    actual_cost NUMERIC(10,4),

    -- Generated video data
    video_url TEXT,
    storage_path TEXT,

    -- Error tracking
    error_code TEXT,
    error_message TEXT,

    -- Retry handling
    attempt_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,

    -- Provider tracking
    provider_job_id TEXT,
    provider_metadata JSONB,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    queued_at TIMESTAMPTZ DEFAULT NOW(),
    processing_started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_video_jobs_project ON video_generation_jobs(project_id);
CREATE INDEX idx_video_jobs_scene ON video_generation_jobs(scene_id);
CREATE INDEX idx_video_jobs_shot ON video_generation_jobs(shot_id);
CREATE INDEX idx_video_jobs_status ON video_generation_jobs(status);
CREATE INDEX idx_video_jobs_created ON video_generation_jobs(created_at);
CREATE INDEX idx_video_jobs_start_frame ON video_generation_jobs(start_frame_id);

-- Row Level Security
ALTER TABLE video_generation_jobs ENABLE ROW LEVEL SECURITY;

-- Users can view video jobs for their own projects
CREATE POLICY "Users can view own project video jobs" ON video_generation_jobs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = video_generation_jobs.project_id
            AND projects.user_id = auth.uid()
        )
    );

-- Users can insert video jobs for their own projects
CREATE POLICY "Users can insert own project video jobs" ON video_generation_jobs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = video_generation_jobs.project_id
            AND projects.user_id = auth.uid()
        )
    );

-- Users can update video jobs for their own projects
CREATE POLICY "Users can update own project video jobs" ON video_generation_jobs
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = video_generation_jobs.project_id
            AND projects.user_id = auth.uid()
        )
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_video_generation_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER video_generation_jobs_updated_at
    BEFORE UPDATE ON video_generation_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_video_generation_jobs_updated_at();

-- Comments for documentation
COMMENT ON TABLE video_generation_jobs IS 'Video generation jobs queued from Stage 11 confirmation';
COMMENT ON COLUMN video_generation_jobs.model_variant IS 'Veo model variant: veo_3_1_fast ($0.15/s) or veo_3_1_standard ($0.40/s)';
COMMENT ON COLUMN video_generation_jobs.status IS 'Job status: queued → processing → generating → uploading → completed/failed';
COMMENT ON COLUMN video_generation_jobs.video_prompt_snapshot IS 'Video prompt locked at queue time for reproducibility';
COMMENT ON COLUMN video_generation_jobs.estimated_cost IS 'Pre-calculated cost based on duration and model variant';
COMMENT ON COLUMN video_generation_jobs.actual_cost IS 'Actual cost after completion (may differ due to provider pricing)';
