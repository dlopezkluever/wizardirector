-- Migration 003: Add scenes table for Phase B production pipeline
-- This migration adds the scenes table which stores extracted scenes from the master script

-- Create scenes table
CREATE TABLE IF NOT EXISTS scenes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    
    -- Scene Identity
    scene_number INTEGER NOT NULL,
    slug TEXT NOT NULL, -- e.g., "int-kitchen-day"
    
    -- Script Content (extracted from Stage 4)
    script_excerpt TEXT NOT NULL, -- the actual scene script text
    
    -- Production Status
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft', 
        'shot_list_ready', 
        'frames_locked', 
        'video_complete', 
        'outdated', 
        'continuity_broken'
    )),
    
    -- Continuity Tracking
    end_state_summary TEXT, -- prose description of final moment
    end_frame_id UUID, -- FK to frames table (to be added in future migration)
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(branch_id, scene_number)
);

-- Create indexes for common queries
CREATE INDEX idx_scenes_branch ON scenes(branch_id);
CREATE INDEX idx_scenes_status ON scenes(status);
CREATE INDEX idx_scenes_scene_number ON scenes(scene_number);

-- Row Level Security
ALTER TABLE scenes ENABLE ROW LEVEL SECURITY;

-- Users can only access scenes of their project branches
CREATE POLICY "Users can view own project scenes" ON scenes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM branches b
            JOIN projects p ON p.id = b.project_id
            WHERE b.id = scenes.branch_id
            AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own project scenes" ON scenes
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM branches b
            JOIN projects p ON p.id = b.project_id
            WHERE b.id = scenes.branch_id
            AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own project scenes" ON scenes
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM branches b
            JOIN projects p ON p.id = b.project_id
            WHERE b.id = scenes.branch_id
            AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own project scenes" ON scenes
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM branches b
            JOIN projects p ON p.id = b.project_id
            WHERE b.id = scenes.branch_id
            AND p.user_id = auth.uid()
        )
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_scenes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER scenes_updated_at
    BEFORE UPDATE ON scenes
    FOR EACH ROW
    EXECUTE FUNCTION update_scenes_updated_at();

