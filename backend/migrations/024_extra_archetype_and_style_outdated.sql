-- Migration 024: Add extra_archetype type + style_outdated flag
-- Features: 3A.5 (Extra Archetypes), 3A.9 (Style Change Tracking)

-- Add extra_archetype to project_assets type constraint
ALTER TABLE project_assets DROP CONSTRAINT IF EXISTS project_assets_asset_type_check;
ALTER TABLE project_assets ADD CONSTRAINT project_assets_asset_type_check
    CHECK (asset_type IN ('character', 'prop', 'location', 'extra_archetype'));

-- Add extra_archetype to global_assets type constraint
ALTER TABLE global_assets DROP CONSTRAINT IF EXISTS global_assets_asset_type_check;
ALTER TABLE global_assets ADD CONSTRAINT global_assets_asset_type_check
    CHECK (asset_type IN ('character', 'prop', 'location', 'extra_archetype'));

-- Add style_outdated tracking column
ALTER TABLE project_assets ADD COLUMN IF NOT EXISTS style_outdated BOOLEAN DEFAULT FALSE;
