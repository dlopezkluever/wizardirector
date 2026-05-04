-- Migration 039: Baseline shot-level location identity
-- Phase 1 of the location continuity rollout.
--
-- Adds canonical location linkage to shots, lightweight alias support for
-- location assets, and an audit table for resolver calibration.

-- ============================================================================
-- 1. project_assets location aliases
-- ============================================================================

ALTER TABLE project_assets
    ADD COLUMN IF NOT EXISTS location_aliases JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE project_assets
    ADD CONSTRAINT chk_project_assets_location_aliases_array
        CHECK (jsonb_typeof(location_aliases) = 'array');

CREATE INDEX IF NOT EXISTS idx_project_assets_location_aliases_gin
    ON project_assets USING GIN (location_aliases)
    WHERE asset_type = 'location';

COMMENT ON COLUMN project_assets.location_aliases IS
    'Optional aliases used by the location resolver for project location assets.';

-- ============================================================================
-- 2. shots canonical location fields
-- ============================================================================

ALTER TABLE shots
    ADD COLUMN IF NOT EXISTS location_asset_id UUID REFERENCES project_assets(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS location_match_confidence NUMERIC(4,3),
    ADD COLUMN IF NOT EXISTS location_match_source TEXT,
    ADD COLUMN IF NOT EXISTS location_match_notes TEXT;

ALTER TABLE shots
    ADD CONSTRAINT chk_shots_location_match_confidence
        CHECK (
            location_match_confidence IS NULL
            OR (location_match_confidence >= 0 AND location_match_confidence <= 1)
        ),
    ADD CONSTRAINT chk_shots_location_match_source
        CHECK (
            location_match_source IS NULL
            OR location_match_source IN (
                'manual',
                'resolver_exact',
                'resolver_alias',
                'resolver_fuzzy',
                'stage7_inferred',
                'legacy_backfill',
                'camera_direction_parent'
            )
        );

CREATE INDEX IF NOT EXISTS idx_shots_location_asset
    ON shots(location_asset_id)
    WHERE location_asset_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shots_scene_location_asset
    ON shots(scene_id, location_asset_id);

CREATE INDEX IF NOT EXISTS idx_shots_location_match_source
    ON shots(location_match_source)
    WHERE location_match_source IS NOT NULL;

COMMENT ON COLUMN shots.location_asset_id IS
    'Canonical project_assets location assigned to this shot.';
COMMENT ON COLUMN shots.location_match_confidence IS
    'Resolver or manual confidence for shot-to-location identity, from 0 to 1.';
COMMENT ON COLUMN shots.location_match_source IS
    'How the current shot-to-location identity was assigned.';
COMMENT ON COLUMN shots.location_match_notes IS
    'Short resolver note or review hint for the current location assignment.';

-- Compatibility fix recorded in the Phase 0 audit: live code already reads and
-- writes this column, but no migration in this repo created it.
ALTER TABLE shots
    ADD COLUMN IF NOT EXISTS end_frame_reference_image_order JSONB;

-- ============================================================================
-- 3. resolver audit/calibration events
-- ============================================================================

CREATE TABLE IF NOT EXISTS location_match_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    scene_id UUID REFERENCES scenes(id) ON DELETE CASCADE,
    shot_id UUID REFERENCES shots(id) ON DELETE CASCADE,
    raw_setting TEXT,
    scene_expected_location TEXT,
    camera_direction_id UUID,
    result_location_asset_id UUID REFERENCES project_assets(id) ON DELETE SET NULL,
    result_confidence NUMERIC(4,3),
    result_source TEXT,
    result_reason TEXT,
    is_ambiguous BOOLEAN NOT NULL DEFAULT FALSE,
    was_applied BOOLEAN NOT NULL DEFAULT FALSE,
    candidates JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT chk_location_match_events_confidence
        CHECK (
            result_confidence IS NULL
            OR (result_confidence >= 0 AND result_confidence <= 1)
        ),
    CONSTRAINT chk_location_match_events_source
        CHECK (
            result_source IS NULL
            OR result_source IN (
                'manual',
                'resolver_exact',
                'resolver_alias',
                'resolver_fuzzy',
                'stage7_inferred',
                'legacy_backfill',
                'camera_direction_parent'
            )
        ),
    CONSTRAINT chk_location_match_events_candidates_array
        CHECK (jsonb_typeof(candidates) = 'array')
);

CREATE INDEX IF NOT EXISTS idx_location_match_events_project_created
    ON location_match_events(project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_location_match_events_scene
    ON location_match_events(scene_id, created_at DESC)
    WHERE scene_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_location_match_events_result_asset
    ON location_match_events(result_location_asset_id)
    WHERE result_location_asset_id IS NOT NULL;

ALTER TABLE location_match_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own location match events" ON location_match_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = location_match_events.project_id
            AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own location match events" ON location_match_events
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = location_match_events.project_id
            AND p.user_id = auth.uid()
        )
    );

COMMENT ON TABLE location_match_events IS
    'Resolver audit events used to calibrate shot-to-location matching.';
