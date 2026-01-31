-- Migration 016: Allow 'scene_asset' job type in image_generation_jobs (Feature 5.1)
-- Enables scene-specific image key generation for scene_asset_instances

ALTER TABLE image_generation_jobs
  DROP CONSTRAINT IF EXISTS image_generation_jobs_job_type_check;

ALTER TABLE image_generation_jobs
  ADD CONSTRAINT image_generation_jobs_job_type_check
  CHECK (job_type IN (
    'master_asset',
    'start_frame',
    'end_frame',
    'inpaint',
    'scene_asset'
  ));

COMMENT ON COLUMN image_generation_jobs.job_type IS
  'master_asset=Stage 5 keys; start_frame/end_frame=Stage 10; inpaint=continuity; scene_asset=scene-specific keys (5.1)';
