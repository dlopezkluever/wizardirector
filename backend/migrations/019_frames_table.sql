-- Migration 019: Frames Table for Stage 10 Frame Generation
-- Stores generated start/end frames for each shot with approval workflow

CREATE TABLE frames (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Core relationships
    shot_id UUID NOT NULL REFERENCES shots(id) ON DELETE CASCADE,
    frame_type TEXT NOT NULL CHECK (frame_type IN ('start', 'end')),

    -- Status workflow: pending → generating → generated → approved/rejected
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',      -- Not yet generated
        'generating',   -- Generation in progress
        'generated',    -- Generated, awaiting approval
        'approved',     -- User approved
        'rejected'      -- User rejected, can regenerate
    )),

    -- Generated image data
    image_url TEXT,          -- Public URL of the generated image
    storage_path TEXT,       -- Supabase storage path

    -- Current job tracking (FK to image_generation_jobs)
    current_job_id UUID REFERENCES image_generation_jobs(id) ON DELETE SET NULL,

    -- Generation metrics
    generation_count INTEGER DEFAULT 0,      -- Total generation attempts
    total_cost_credits NUMERIC(10,4) DEFAULT 0,

    -- Continuity chaining - for slider comparison
    previous_frame_id UUID REFERENCES frames(id) ON DELETE SET NULL,

    -- Prompt snapshot (locked at generation time for reproducibility)
    prompt_snapshot TEXT,

    -- Inpainting history
    inpaint_count INTEGER DEFAULT 0,
    last_inpaint_mask_path TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    generated_at TIMESTAMPTZ,    -- When image was last successfully generated
    approved_at TIMESTAMPTZ,     -- When user approved the frame

    -- Unique constraint: one start and one end frame per shot
    UNIQUE(shot_id, frame_type)
);

-- Indexes for common queries
CREATE INDEX idx_frames_shot ON frames(shot_id);
CREATE INDEX idx_frames_status ON frames(status);
CREATE INDEX idx_frames_current_job ON frames(current_job_id);
CREATE INDEX idx_frames_previous_frame ON frames(previous_frame_id);

-- Row Level Security
ALTER TABLE frames ENABLE ROW LEVEL SECURITY;

-- Users can view frames of their own project shots
CREATE POLICY "Users can view own project frames" ON frames
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM shots sh
            JOIN scenes sc ON sc.id = sh.scene_id
            JOIN branches b ON b.id = sc.branch_id
            JOIN projects p ON p.id = b.project_id
            WHERE sh.id = frames.shot_id
            AND p.user_id = auth.uid()
        )
    );

-- Users can insert frames for their own project shots
CREATE POLICY "Users can insert own project frames" ON frames
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM shots sh
            JOIN scenes sc ON sc.id = sh.scene_id
            JOIN branches b ON b.id = sc.branch_id
            JOIN projects p ON p.id = b.project_id
            WHERE sh.id = frames.shot_id
            AND p.user_id = auth.uid()
        )
    );

-- Users can update frames of their own project shots
CREATE POLICY "Users can update own project frames" ON frames
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM shots sh
            JOIN scenes sc ON sc.id = sh.scene_id
            JOIN branches b ON b.id = sc.branch_id
            JOIN projects p ON p.id = b.project_id
            WHERE sh.id = frames.shot_id
            AND p.user_id = auth.uid()
        )
    );

-- Users can delete frames of their own project shots
CREATE POLICY "Users can delete own project frames" ON frames
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM shots sh
            JOIN scenes sc ON sc.id = sh.scene_id
            JOIN branches b ON b.id = sc.branch_id
            JOIN projects p ON p.id = b.project_id
            WHERE sh.id = frames.shot_id
            AND p.user_id = auth.uid()
        )
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_frames_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER frames_updated_at
    BEFORE UPDATE ON frames
    FOR EACH ROW
    EXECUTE FUNCTION update_frames_updated_at();

-- Comments for documentation
COMMENT ON TABLE frames IS 'Stage 10 frame images for shot start/end points with approval workflow';
COMMENT ON COLUMN frames.frame_type IS 'Whether this is a start frame or end frame for the shot';
COMMENT ON COLUMN frames.status IS 'Workflow status: pending → generating → generated → approved/rejected';
COMMENT ON COLUMN frames.previous_frame_id IS 'Reference to previous shot end frame for continuity comparison';
COMMENT ON COLUMN frames.prompt_snapshot IS 'Locked prompt used at generation time for reproducibility';
COMMENT ON COLUMN frames.current_job_id IS 'Active/latest image_generation_jobs entry for this frame';
