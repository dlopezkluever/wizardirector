  ALTER TABLE shots ADD COLUMN IF NOT EXISTS start_continuity TEXT DEFAULT 'none'
    CHECK (start_continuity IN ('none', 'match', 'camera_change'));
  ALTER TABLE shots ADD COLUMN IF NOT EXISTS ai_start_continuity TEXT
    CHECK (ai_start_continuity IN ('none', 'match', 'camera_change'));
  ALTER TABLE shots ADD COLUMN IF NOT EXISTS continuity_frame_prompt TEXT;