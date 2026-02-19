-- Migration 030: Transformation Events
-- Feature: Within-scene asset transformations (e.g., character costume change mid-scene)
-- Purpose: Track transformation boundaries per shot so prompt generation can resolve
-- the correct asset description for each shot in a scene.

-- ============================================================================
-- TRANSFORMATION EVENTS TABLE
-- ============================================================================

CREATE TABLE transformation_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Which asset transforms
    scene_asset_instance_id UUID NOT NULL REFERENCES scene_asset_instances(id) ON DELETE CASCADE,

    -- Parent scene (denormalized for query performance)
    scene_id UUID NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,

    -- Shot where transformation occurs
    trigger_shot_id UUID NOT NULL REFERENCES shots(id) ON DELETE CASCADE,

    -- Type of transformation
    transformation_type TEXT NOT NULL CHECK (transformation_type IN ('instant', 'gradual', 'within_shot')),

    -- For 'gradual' only: where it finishes. NULL for instant/within_shot.
    completion_shot_id UUID REFERENCES shots(id) ON DELETE SET NULL,

    -- Appearance before and after
    pre_description TEXT NOT NULL,
    post_description TEXT NOT NULL,

    -- What happens visually (for video prompts, especially within_shot)
    transformation_narrative TEXT,

    -- Reference images for pre/post states
    pre_image_key_url TEXT,
    post_image_key_url TEXT,

    -- Status tags for pre/post states
    pre_status_tags TEXT[] DEFAULT '{}',
    post_status_tags TEXT[] DEFAULT '{}',

    -- How this event was created
    detected_by TEXT NOT NULL CHECK (detected_by IN ('stage7_extraction', 'stage8_relevance', 'manual')),

    -- User must confirm before use in prompts
    confirmed BOOLEAN DEFAULT FALSE,
    confirmed_at TIMESTAMPTZ,

    -- Standard timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_transformation_events_scene ON transformation_events(scene_id);
CREATE INDEX idx_transformation_events_instance ON transformation_events(scene_asset_instance_id);
CREATE INDEX idx_transformation_events_trigger_shot ON transformation_events(trigger_shot_id);
CREATE INDEX idx_transformation_events_scene_instance ON transformation_events(scene_id, scene_asset_instance_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE transformation_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transformation events" ON transformation_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM scenes s
            JOIN branches b ON b.id = s.branch_id
            JOIN projects p ON p.id = b.project_id
            WHERE s.id = transformation_events.scene_id
            AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own transformation events" ON transformation_events
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM scenes s
            JOIN branches b ON b.id = s.branch_id
            JOIN projects p ON p.id = b.project_id
            WHERE s.id = transformation_events.scene_id
            AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own transformation events" ON transformation_events
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM scenes s
            JOIN branches b ON b.id = s.branch_id
            JOIN projects p ON p.id = b.project_id
            WHERE s.id = transformation_events.scene_id
            AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own transformation events" ON transformation_events
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM scenes s
            JOIN branches b ON b.id = s.branch_id
            JOIN projects p ON p.id = b.project_id
            WHERE s.id = transformation_events.scene_id
            AND p.user_id = auth.uid()
        )
    );

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_transformation_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_transformation_events_timestamp
    BEFORE UPDATE ON transformation_events
    FOR EACH ROW
    EXECUTE FUNCTION update_transformation_events_updated_at();

-- ============================================================================
-- SHOTS TABLE: ADD TRANSFORMATION_FLAGS COLUMN
-- ============================================================================

ALTER TABLE shots ADD COLUMN IF NOT EXISTS transformation_flags JSONB DEFAULT NULL;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE transformation_events IS 'Tracks within-scene asset transformations (visual changes between/during shots)';
COMMENT ON COLUMN transformation_events.transformation_type IS 'instant: cut-based change; gradual: spans multiple shots; within_shot: on-camera during single shot';
COMMENT ON COLUMN transformation_events.trigger_shot_id IS 'Shot where the transformation starts';
COMMENT ON COLUMN transformation_events.completion_shot_id IS 'For gradual only: shot where transformation completes';
COMMENT ON COLUMN transformation_events.pre_description IS 'Asset appearance before transformation';
COMMENT ON COLUMN transformation_events.post_description IS 'Asset appearance after transformation';
COMMENT ON COLUMN transformation_events.transformation_narrative IS 'Visual description of the transformation itself (used in video prompts for within_shot)';
COMMENT ON COLUMN transformation_events.detected_by IS 'How this event was created: stage7_extraction, stage8_relevance, or manual';
COMMENT ON COLUMN transformation_events.confirmed IS 'Must be true before event is used in prompt generation';
COMMENT ON COLUMN shots.transformation_flags IS 'Raw LLM detection output from Stage 7 shot extraction (staging data)';
