-- Migration 040: Continuity lineage and Stage 10 reuse/edit base selection
-- Phase 5 of the location continuity rollout. Phase 6 adds project continuity mode.
--
-- Adds:
--   1. shots.selected_continuity_base_frame_id     — user-chosen reuse/edit base for this shot
--   2. frames.generated_from_frame_id              — frame this frame was derived from
--   3. frames.continuity_base_role                 — how the base was used (reuse_match / reuse_edit / camera_change_ref)
--   4. frames.promoted_to_view_id                  — view this frame was promoted to (when established)
--   5. location_views.promoted_from_frame_id       — frame whose image populated this view
--   6. projects.continuity_mode                    — basic | advanced (Phase 6 progressive disclosure)
--
-- Notes:
-- * `location_views.established_from_shot_id` already exists (migration 038); this
--   migration adds the frame-level pointer so lineage chains stay traversable.
-- * `frames.previous_frame_id` already exists for adjacency chaining; the new
--   `generated_from_frame_id` is for cross-shot reuse/edit, distinct from chaining.

-- ============================================================================
-- 1. shots.selected_continuity_base_frame_id
-- ============================================================================

ALTER TABLE shots
    ADD COLUMN IF NOT EXISTS selected_continuity_base_frame_id UUID
        REFERENCES frames(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_shots_continuity_base_frame
    ON shots(selected_continuity_base_frame_id)
    WHERE selected_continuity_base_frame_id IS NOT NULL;

COMMENT ON COLUMN shots.selected_continuity_base_frame_id IS
    'Stage 10 reuse/edit: approved frame chosen as the visual base for this shot''s start frame generation.';

-- ============================================================================
-- 2. frames.generated_from_frame_id + continuity_base_role + promoted_to_view_id
-- ============================================================================

ALTER TABLE frames
    ADD COLUMN IF NOT EXISTS generated_from_frame_id UUID
        REFERENCES frames(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS continuity_base_role TEXT,
    ADD COLUMN IF NOT EXISTS promoted_to_view_id UUID
        REFERENCES location_views(id) ON DELETE SET NULL;

ALTER TABLE frames DROP CONSTRAINT IF EXISTS chk_frames_continuity_base_role;
ALTER TABLE frames
    ADD CONSTRAINT chk_frames_continuity_base_role
        CHECK (
            continuity_base_role IS NULL
            OR continuity_base_role IN (
                'reuse_match',
                'reuse_edit',
                'camera_change_ref',
                'match_copy',
                'manual'
            )
        );

CREATE INDEX IF NOT EXISTS idx_frames_generated_from
    ON frames(generated_from_frame_id)
    WHERE generated_from_frame_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_frames_promoted_to_view
    ON frames(promoted_to_view_id)
    WHERE promoted_to_view_id IS NOT NULL;

COMMENT ON COLUMN frames.generated_from_frame_id IS
    'Lineage pointer to the approved frame this frame was generated from (reuse/edit / camera-change continuity).';
COMMENT ON COLUMN frames.continuity_base_role IS
    'How the base frame contributed to this generation.';
COMMENT ON COLUMN frames.promoted_to_view_id IS
    'Location view that adopted this frame as its established reference image.';

-- ============================================================================
-- 3. location_views.promoted_from_frame_id
-- ============================================================================

ALTER TABLE location_views
    ADD COLUMN IF NOT EXISTS promoted_from_frame_id UUID
        REFERENCES frames(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_location_views_promoted_from
    ON location_views(promoted_from_frame_id)
    WHERE promoted_from_frame_id IS NOT NULL;

COMMENT ON COLUMN location_views.promoted_from_frame_id IS
    'Frame whose generated image was promoted into this location view (complements established_from_shot_id).';

-- ============================================================================
-- 4. projects.continuity_mode (Phase 6 progressive disclosure)
-- ============================================================================

ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS continuity_mode TEXT NOT NULL DEFAULT 'basic';

ALTER TABLE projects DROP CONSTRAINT IF EXISTS chk_projects_continuity_mode;
ALTER TABLE projects
    ADD CONSTRAINT chk_projects_continuity_mode
        CHECK (continuity_mode IN ('basic', 'advanced'));

COMMENT ON COLUMN projects.continuity_mode IS
    'Two-tier continuity disclosure mode: basic (lightweight) or advanced (full coverage discipline).';