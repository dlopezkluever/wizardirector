-- Add 'transformation' as valid source for selected_master_reference_source
-- Previously only 'stage5_master' and 'prior_scene_instance' were allowed,
-- which silently rejected transformation image selections.

ALTER TABLE scene_asset_instances
  DROP CONSTRAINT IF EXISTS scene_asset_instances_selected_master_reference_source_check;

ALTER TABLE scene_asset_instances
  ADD CONSTRAINT scene_asset_instances_selected_master_reference_source_check
    CHECK (selected_master_reference_source IN ('stage5_master', 'prior_scene_instance', 'transformation'));

COMMENT ON COLUMN scene_asset_instances.selected_master_reference_source
  IS '3B.2: Source of master reference (stage5_master, prior_scene_instance, or transformation)';
