-- Add ai_recommends_end_frame column to shots table
-- Separates AI recommendation from user override (requires_end_frame)
ALTER TABLE shots ADD COLUMN IF NOT EXISTS ai_recommends_end_frame BOOLEAN DEFAULT NULL;

-- Backfill existing shots that have already had prompts generated
UPDATE shots SET ai_recommends_end_frame = requires_end_frame
WHERE prompts_generated_at IS NOT NULL AND ai_recommends_end_frame IS NULL;
