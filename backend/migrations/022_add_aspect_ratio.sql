-- Migration 022: Add aspect_ratio column to projects table
-- Supports project-level aspect ratio setting for frame and video generation
-- Only 16:9 (landscape) and 9:16 (portrait) are supported per Veo3 capabilities

ALTER TABLE projects
  ADD COLUMN aspect_ratio TEXT NOT NULL DEFAULT '16:9';

ALTER TABLE projects
  ADD CONSTRAINT projects_aspect_ratio_check
  CHECK (aspect_ratio IN ('16:9', '9:16'));
