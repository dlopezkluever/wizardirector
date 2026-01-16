-- Migration: Image Generation Jobs Table
-- Feature 3.1: Job-tracked image generation with async-ready architecture

CREATE TABLE image_generation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Idempotency
    idempotency_key TEXT,
    
    -- Job Context
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    scene_id UUID REFERENCES scenes(id) ON DELETE CASCADE,
    shot_id UUID REFERENCES shots(id) ON DELETE CASCADE,
    asset_id UUID, -- No FK constraint (see documentation below)
    
    -- Job Type and Purpose
    job_type TEXT NOT NULL CHECK (job_type IN (
        'master_asset',      -- Stage 5 asset image keys
        'start_frame',       -- Stage 10 start frames
        'end_frame',         -- Stage 10 end frames
        'inpaint'           -- Continuity fixes
    )),
    
    -- Execution State (refined state machine)
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN (
        'queued',           -- Waiting to be processed
        'processing',       -- Job picked up by executor
        'generating',       -- Provider API call in progress
        'uploading',        -- Uploading to storage
        'completed',        -- Successfully generated
        'failed'            -- Generation failed (see failure_stage)
    )),
    
    -- Failure tracking
    failure_stage TEXT CHECK (failure_stage IN (
        'generating',       -- Failed during provider call
        'uploading',        -- Failed during storage upload
        'persisting'        -- Failed during final DB update
    )),
    
    -- Retry and Attempt Tracking (separated concerns)
    attempt_count INTEGER DEFAULT 0,      -- Total execution attempts
    retry_count INTEGER DEFAULT 0,        -- User-initiated retries
    max_retries INTEGER DEFAULT 3,
    last_attempt_at TIMESTAMPTZ,
    
    -- Error Details
    error_code TEXT, -- TEMPORARY | PERMANENT | RATE_LIMIT | AUTH_ERROR
    error_message TEXT,
    
    -- Generation Parameters
    prompt TEXT NOT NULL,
    visual_style_capsule_id UUID REFERENCES style_capsules(id),
    width INTEGER DEFAULT 512,
    height INTEGER DEFAULT 512,
    
    -- Results
    storage_path TEXT, -- Path in Supabase Storage
    public_url TEXT,   -- Public URL of generated image
    
    -- Cost Tracking
    cost_credits NUMERIC(10,4),
    estimated_cost NUMERIC(10,4), -- Provider estimate vs actual
    
    -- Provider Metadata (raw response for debugging)
    provider_metadata JSONB,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processing_started_at TIMESTAMPTZ,
    generating_started_at TIMESTAMPTZ,
    uploading_started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_image_jobs_project ON image_generation_jobs(project_id);
CREATE INDEX idx_image_jobs_status ON image_generation_jobs(status);
CREATE INDEX idx_image_jobs_branch ON image_generation_jobs(branch_id);
CREATE INDEX idx_image_jobs_created ON image_generation_jobs(created_at);
CREATE UNIQUE INDEX idx_image_jobs_idempotency ON image_generation_jobs(project_id, idempotency_key) 
    WHERE idempotency_key IS NOT NULL;

-- RLS Policies
ALTER TABLE image_generation_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own image generation jobs" ON image_generation_jobs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = image_generation_jobs.project_id
            AND projects.user_id = auth.uid()
        )
    );

-- Documentation comment on asset_id column
COMMENT ON COLUMN image_generation_jobs.asset_id IS 
    'Reference to asset, but no FK constraint to allow flexibility with project_assets and global_assets tables';

