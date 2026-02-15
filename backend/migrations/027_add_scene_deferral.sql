-- 027: Add scene deferral column
-- Allows users to defer/sideline scenes they want to skip temporarily

ALTER TABLE scenes ADD COLUMN IF NOT EXISTS is_deferred BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_scenes_is_deferred ON scenes(is_deferred) WHERE is_deferred = TRUE;
