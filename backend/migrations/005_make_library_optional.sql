-- Migration 005: Make library_id optional for style capsules
-- This allows capsules to exist without being tied to a specific library

-- Step 1: Drop the unique constraint that includes library_id
ALTER TABLE style_capsules 
DROP CONSTRAINT IF EXISTS style_capsules_library_id_name_key;

-- Step 2: Make library_id nullable by dropping the NOT NULL constraint (if it exists)
-- Note: The original migration already allows NULL, but this ensures it
ALTER TABLE style_capsules 
ALTER COLUMN library_id DROP NOT NULL;

-- Step 3: Add a new unique constraint that only applies when library_id is not null
-- This allows multiple capsules with the same name as long as they don't share a library
ALTER TABLE style_capsules 
ADD CONSTRAINT style_capsules_library_name_unique 
UNIQUE (library_id, name) 
DEFERRABLE INITIALLY DEFERRED;

-- Step 4: Add a unique constraint for user capsules without libraries
-- This prevents users from creating multiple capsules with the same name when library_id is null
ALTER TABLE style_capsules 
ADD CONSTRAINT style_capsules_user_name_unique 
UNIQUE (user_id, name) 
WHERE library_id IS NULL;

-- Note: This migration allows:
-- 1. Multiple capsules with the same name across different libraries
-- 2. Multiple capsules with the same name when library_id is null (for different users)
-- 3. But prevents duplicate names within the same library or for the same user when library_id is null
