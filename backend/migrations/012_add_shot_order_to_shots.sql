-- Migration 012: Add shot_order to shots table
-- The API orders shots by shot_order; this column was missing from 006_shots_table.sql.
-- Required for GET /api/projects/:id/scenes/:sceneId/shots and reorder/split logic.

-- Add column (default 0 so existing rows get a value)
ALTER TABLE shots ADD COLUMN IF NOT EXISTS shot_order INTEGER NOT NULL DEFAULT 0;

-- Backfill: assign shot_order 0, 1, 2, ... per scene (by created_at, then id)
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY scene_id ORDER BY created_at, id) - 1 AS rn
  FROM shots
)
UPDATE shots s SET shot_order = ordered.rn FROM ordered WHERE s.id = ordered.id;

-- Index for efficient ordering by scene
CREATE INDEX IF NOT EXISTS idx_shots_scene_order ON shots(scene_id, shot_order);
