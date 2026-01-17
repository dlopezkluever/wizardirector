-- Migration 004: Shots Table
-- This migration adds the shots table for storing individual shots within scenes
-- Must run before 006_image_generation_jobs.sql

CREATE TABLE shots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scene_id UUID NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,

    -- Shot Identity
    shot_id TEXT NOT NULL, -- e.g., "1A", "1B", "2A"

    -- Shot Content
    duration INTEGER NOT NULL DEFAULT 8, -- seconds
    dialogue TEXT DEFAULT '',
    action TEXT NOT NULL,
    characters_foreground TEXT[] DEFAULT '{}',
    characters_background TEXT[] DEFAULT '{}',
    setting TEXT NOT NULL,
    camera TEXT NOT NULL,

    -- Continuity and References
    continuity_flags TEXT[] DEFAULT '{}',
    beat_reference TEXT,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(scene_id, shot_id)
);

-- Indexes for performance
CREATE INDEX idx_shots_scene ON shots(scene_id);
CREATE INDEX idx_shots_shot_id ON shots(shot_id);

-- Row Level Security
ALTER TABLE shots ENABLE ROW LEVEL SECURITY;

-- Users can only access shots of their project scenes
CREATE POLICY "Users can view own project shots" ON shots
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM scenes s
            JOIN branches b ON b.id = s.branch_id
            JOIN projects p ON p.id = b.project_id
            WHERE s.id = shots.scene_id
            AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own project shots" ON shots
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM scenes s
            JOIN branches b ON b.id = s.branch_id
            JOIN projects p ON p.id = b.project_id
            WHERE s.id = shots.scene_id
            AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own project shots" ON shots
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM scenes s
            JOIN branches b ON b.id = s.branch_id
            JOIN projects p ON p.id = b.project_id
            WHERE s.id = shots.scene_id
            AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own project shots" ON shots
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM scenes s
            JOIN branches b ON b.id = s.branch_id
            JOIN projects p ON p.id = b.project_id
            WHERE s.id = shots.scene_id
            AND p.user_id = auth.uid()
        )
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_shots_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER shots_updated_at
    BEFORE UPDATE ON shots
    FOR EACH ROW
    EXECUTE FUNCTION update_shots_updated_at();
