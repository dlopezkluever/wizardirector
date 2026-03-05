-- Allow reference links alongside match links
-- Fully idempotent — safe to re-run

-- 1. Drop the old CHECK on link_type (only allowed 'match')
DO $$
DECLARE
  _check_name TEXT;
BEGIN
  SELECT conname INTO _check_name
    FROM pg_constraint
   WHERE conrelid = 'frame_links'::regclass
     AND contype = 'c'
     AND pg_get_constraintdef(oid) ILIKE '%link_type%'
     AND pg_get_constraintdef(oid) NOT ILIKE '%reference%';

  IF _check_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE frame_links DROP CONSTRAINT %I', _check_name);
  END IF;
END $$;

-- 2. Add new CHECK that allows both match and reference (skip if already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'frame_links'::regclass
       AND contype = 'c'
       AND pg_get_constraintdef(oid) ILIKE '%reference%'
  ) THEN
    ALTER TABLE frame_links ADD CONSTRAINT frame_links_link_type_check
      CHECK (link_type IN ('match', 'reference'));
  END IF;
END $$;

-- 3. Drop the old UNIQUE(target_frame_id, link_type) composite key
DO $$
DECLARE
  _unique_name TEXT;
BEGIN
  SELECT conname INTO _unique_name
    FROM pg_constraint
   WHERE conrelid = 'frame_links'::regclass
     AND contype = 'u'
     AND array_length(conkey, 1) = 2;

  IF _unique_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE frame_links DROP CONSTRAINT %I', _unique_name);
  END IF;
END $$;

-- 4. One link per target frame (skip if already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'frame_links'::regclass
       AND conname = 'frame_links_target_frame_id_key'
  ) THEN
    ALTER TABLE frame_links ADD CONSTRAINT frame_links_target_frame_id_key UNIQUE(target_frame_id);
  END IF;
END $$;
