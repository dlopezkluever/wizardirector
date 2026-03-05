-- Migration 036: Text Field Versions
-- Stores version history for text fields (frame_prompt, video_prompt, end_frame_prompt, description_override)
-- Pattern mirrors scene_asset_generation_attempts (MAX 8 versions, is_selected, version_number)

CREATE TABLE IF NOT EXISTS text_field_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('shot', 'scene_asset_instance')),
  entity_id UUID NOT NULL,
  field_name TEXT NOT NULL CHECK (field_name IN ('frame_prompt', 'video_prompt', 'end_frame_prompt', 'description_override')),
  content TEXT NOT NULL,
  is_selected BOOLEAN NOT NULL DEFAULT FALSE,
  source TEXT NOT NULL DEFAULT 'user_save' CHECK (source IN ('user_save', 'ai_generation')),
  version_number INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Partial unique index: only one selected version per entity+field
CREATE UNIQUE INDEX idx_text_field_versions_selected
  ON text_field_versions (entity_id, field_name)
  WHERE is_selected = TRUE;

-- Lookup index for listing versions
CREATE INDEX idx_text_field_versions_lookup
  ON text_field_versions (entity_id, field_name, created_at DESC);

-- RLS policies (mirror scene_asset_generation_attempts pattern)
ALTER TABLE text_field_versions ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access (project ownership checked at API layer)
CREATE POLICY "Users can manage text field versions"
  ON text_field_versions
  FOR ALL
  USING (true)
  WITH CHECK (true);
