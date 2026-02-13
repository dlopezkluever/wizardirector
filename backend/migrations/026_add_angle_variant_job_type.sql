-- Migration 026: Allow 'angle_variant' job type in image_generation_jobs (3C.2)
-- Enables multi-angle asset generation for character assets

ALTER TABLE image_generation_jobs
  DROP CONSTRAINT IF EXISTS image_generation_jobs_job_type_check;

ALTER TABLE image_generation_jobs
  ADD CONSTRAINT image_generation_jobs_job_type_check
  CHECK (job_type IN (
    'master_asset',
    'start_frame',
    'end_frame',
    'inpaint',
    'scene_asset',
    'angle_variant'
  ));

COMMENT ON COLUMN image_generation_jobs.job_type IS
  'master_asset=Stage 5 keys; start_frame/end_frame=Stage 10; inpaint=continuity; scene_asset=scene-specific keys (5.1); angle_variant=multi-angle views (3C.2)';
