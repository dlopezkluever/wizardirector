-- 034_frame_links.sql
-- Reactive frame links: when a source frame changes, the target frame auto-updates.
-- Only 'match' links are reactive (ref operations are one-shot copies).

CREATE TABLE IF NOT EXISTS frame_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_frame_id UUID NOT NULL REFERENCES frames(id) ON DELETE CASCADE,
  target_frame_id UUID NOT NULL REFERENCES frames(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL DEFAULT 'match' CHECK (link_type IN ('match')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(target_frame_id, link_type)
);

CREATE INDEX IF NOT EXISTS idx_frame_links_source ON frame_links(source_frame_id);
CREATE INDEX IF NOT EXISTS idx_frame_links_target ON frame_links(target_frame_id);

-- RLS policies
ALTER TABLE frame_links ENABLE ROW LEVEL SECURITY;

-- Users can read links for frames they own (through project ownership chain)
CREATE POLICY "Users can read their frame links"
  ON frame_links FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM frames f
      JOIN shots s ON s.id = f.shot_id
      JOIN scenes sc ON sc.id = s.scene_id
      JOIN branches b ON b.id = sc.branch_id
      JOIN projects p ON p.id = b.project_id
      WHERE f.id = frame_links.source_frame_id
        AND p.user_id = auth.uid()
    )
  );

-- Users can insert/update/delete links for their own frames
CREATE POLICY "Users can manage their frame links"
  ON frame_links FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM frames f
      JOIN shots s ON s.id = f.shot_id
      JOIN scenes sc ON sc.id = s.scene_id
      JOIN branches b ON b.id = sc.branch_id
      JOIN projects p ON p.id = b.project_id
      WHERE f.id = frame_links.source_frame_id
        AND p.user_id = auth.uid()
    )
  );
