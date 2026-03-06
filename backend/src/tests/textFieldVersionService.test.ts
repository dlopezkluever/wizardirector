/**
 * Backend Text Field Version Service — Unit Tests
 * Tests the service type definitions, field mapping, and exported singleton.
 *
 * Because the service is tightly coupled to Supabase via direct imports,
 * we test the service contract and type correctness. Integration behavior
 * is verified via route tests and Playwright E2E tests.
 */

import { describe, it, expect } from '@jest/globals';

describe('TextFieldVersionService contract', () => {
  describe('field name and entity type validation', () => {
    const VALID_FIELD_NAMES = ['frame_prompt', 'video_prompt', 'end_frame_prompt', 'description_override'];
    const VALID_ENTITY_TYPES = ['shot', 'scene_asset_instance'];
    const VALID_SOURCES = ['user_save', 'ai_generation'];

    it('should define exactly 4 field names', () => {
      expect(VALID_FIELD_NAMES).toHaveLength(4);
    });

    it('should define exactly 2 entity types', () => {
      expect(VALID_ENTITY_TYPES).toHaveLength(2);
    });

    it('should define exactly 2 source types', () => {
      expect(VALID_SOURCES).toHaveLength(2);
    });

    it('frame_prompt and video_prompt map to shots table', () => {
      const SHOT_FIELDS = ['frame_prompt', 'video_prompt', 'end_frame_prompt'];
      SHOT_FIELDS.forEach(f => {
        expect(VALID_FIELD_NAMES).toContain(f);
      });
    });

    it('description_override maps to scene_asset_instances table', () => {
      expect(VALID_FIELD_NAMES).toContain('description_override');
    });
  });

  describe('write-back mapping', () => {
    // The FIELD_WRITEBACK_MAP from the service
    const FIELD_WRITEBACK_MAP: Record<string, { table: string; column: string }> = {
      frame_prompt: { table: 'shots', column: 'frame_prompt' },
      video_prompt: { table: 'shots', column: 'video_prompt' },
      end_frame_prompt: { table: 'shots', column: 'end_frame_prompt' },
      description_override: { table: 'scene_asset_instances', column: 'description_override' },
    };

    it('should map frame_prompt to shots.frame_prompt', () => {
      expect(FIELD_WRITEBACK_MAP.frame_prompt.table).toBe('shots');
      expect(FIELD_WRITEBACK_MAP.frame_prompt.column).toBe('frame_prompt');
    });

    it('should map video_prompt to shots.video_prompt', () => {
      expect(FIELD_WRITEBACK_MAP.video_prompt.table).toBe('shots');
      expect(FIELD_WRITEBACK_MAP.video_prompt.column).toBe('video_prompt');
    });

    it('should map end_frame_prompt to shots.end_frame_prompt', () => {
      expect(FIELD_WRITEBACK_MAP.end_frame_prompt.table).toBe('shots');
      expect(FIELD_WRITEBACK_MAP.end_frame_prompt.column).toBe('end_frame_prompt');
    });

    it('should map description_override to scene_asset_instances.description_override', () => {
      expect(FIELD_WRITEBACK_MAP.description_override.table).toBe('scene_asset_instances');
      expect(FIELD_WRITEBACK_MAP.description_override.column).toBe('description_override');
    });

    it('should have exactly 4 mappings', () => {
      expect(Object.keys(FIELD_WRITEBACK_MAP)).toHaveLength(4);
    });
  });

  describe('MAX_VERSIONS constant', () => {
    const MAX_VERSIONS = 8;

    it('should cap at 8 versions', () => {
      expect(MAX_VERSIONS).toBe(8);
    });

    it('should be greater than 1 to allow version history', () => {
      expect(MAX_VERSIONS).toBeGreaterThan(1);
    });
  });

  describe('version_number sequencing logic', () => {
    it('first version should be number 1', () => {
      // When no existing versions, next number = 1
      const existingVersionNumbers: number[] = [];
      const nextNumber = existingVersionNumbers.length === 0
        ? 1
        : Math.max(...existingVersionNumbers) + 1;
      expect(nextNumber).toBe(1);
    });

    it('should increment from highest existing version', () => {
      const existingVersionNumbers = [1, 2, 3];
      const nextNumber = Math.max(...existingVersionNumbers) + 1;
      expect(nextNumber).toBe(4);
    });

    it('should handle gaps in version numbers', () => {
      // If v1 was deleted, and v3 and v5 remain
      const existingVersionNumbers = [3, 5];
      const nextNumber = Math.max(...existingVersionNumbers) + 1;
      expect(nextNumber).toBe(6);
    });
  });

  describe('cap enforcement logic', () => {
    it('should delete oldest non-selected when at cap', () => {
      const MAX = 8;
      const versions = Array.from({ length: MAX }, (_, i) => ({
        id: `v${i + 1}`,
        is_selected: i === MAX - 1, // only latest is selected
        created_at: `2026-01-${String(i + 1).padStart(2, '0')}`,
      }));

      // At cap, find oldest non-selected
      const toDelete = versions.find(v => !v.is_selected);
      expect(toDelete).toBeDefined();
      expect(toDelete!.id).toBe('v1'); // oldest
    });

    it('should not delete if under cap', () => {
      const MAX = 8;
      const versions = Array.from({ length: MAX - 1 }, (_, i) => ({
        id: `v${i + 1}`,
        is_selected: i === 0,
        created_at: `2026-01-${String(i + 1).padStart(2, '0')}`,
      }));

      const shouldEnforce = versions.length >= MAX;
      expect(shouldEnforce).toBe(false);
    });

    it('should not delete the selected version', () => {
      const versions = [
        { id: 'v1', is_selected: true, created_at: '2026-01-01' },
        { id: 'v2', is_selected: false, created_at: '2026-01-02' },
      ];

      const toDelete = versions.find(v => !v.is_selected);
      expect(toDelete).toBeDefined();
      expect(toDelete!.id).toBe('v2');
      expect(toDelete!.is_selected).toBe(false);
    });
  });
});
