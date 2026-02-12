-- 024: Scene Asset Suggestions (3B.8)
-- Persists AI-suggested assets so they survive page refreshes.

CREATE TABLE scene_asset_suggestions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  scene_id UUID NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES project_assets(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('character', 'location', 'prop')),
  description TEXT,
  justification TEXT,
  suggested_by TEXT NOT NULL DEFAULT 'ai_relevance',
  accepted BOOLEAN NOT NULL DEFAULT FALSE,
  dismissed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_scene_asset_suggestions_scene_id ON scene_asset_suggestions(scene_id);

ALTER TABLE scene_asset_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage suggestions for their scenes"
  ON scene_asset_suggestions FOR ALL
  USING (
    scene_id IN (
      SELECT s.id FROM scenes s
      JOIN branches b ON s.branch_id = b.id
      JOIN projects p ON b.project_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );
