-- Migration 018: Stage 9 Prompt Segmentation
-- Adds columns to shots table for storing generated frame and video prompts

-- Add prompt columns to shots table
ALTER TABLE shots ADD COLUMN IF NOT EXISTS frame_prompt TEXT;
ALTER TABLE shots ADD COLUMN IF NOT EXISTS video_prompt TEXT;
ALTER TABLE shots ADD COLUMN IF NOT EXISTS requires_end_frame BOOLEAN DEFAULT TRUE;
ALTER TABLE shots ADD COLUMN IF NOT EXISTS compatible_models TEXT[] DEFAULT '{"Veo3"}';
ALTER TABLE shots ADD COLUMN IF NOT EXISTS prompts_generated_at TIMESTAMPTZ;

-- Add index for efficient queries on prompts_generated_at
CREATE INDEX IF NOT EXISTS idx_shots_prompts_generated ON shots(prompts_generated_at) WHERE prompts_generated_at IS NOT NULL;

-- Comment on columns for documentation
COMMENT ON COLUMN shots.frame_prompt IS 'AI-generated visual prompt for image generation (asset-heavy, spatially explicit)';
COMMENT ON COLUMN shots.video_prompt IS 'AI-generated action/audio prompt for video generation (minimal visual description)';
COMMENT ON COLUMN shots.requires_end_frame IS 'Whether this shot needs an end frame for video generation';
COMMENT ON COLUMN shots.compatible_models IS 'List of video generation models compatible with this shot''s prompts';
COMMENT ON COLUMN shots.prompts_generated_at IS 'Timestamp when prompts were last generated';
