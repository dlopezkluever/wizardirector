import { describe, it, expect } from 'vitest';
import { buildTemplateAssignments, type TemplateId } from '../BulkPresenceTemplates';
import type { SceneAssetInstance, Shot } from '@/types/scene';

// ---------------------------------------------------------------------------
// Test factories
// ---------------------------------------------------------------------------

function makeSceneAsset(overrides: Partial<SceneAssetInstance> & { id: string; assetType: string; name: string }): SceneAssetInstance {
  return {
    scene_id: 'scene-1',
    project_asset_id: `pa-${overrides.id}`,
    effective_description: '',
    status_tags: [],
    carry_forward: true,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    project_asset: {
      id: `pa-${overrides.id}`,
      project_id: 'proj-1',
      branch_id: 'br-1',
      name: overrides.name,
      asset_type: overrides.assetType as any,
      description: '',
      locked: false,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    },
    ...overrides,
  } as SceneAssetInstance;
}

function makeShot(overrides: Partial<Shot> & { id: string }): Shot {
  return {
    sceneId: 'scene-1',
    shotId: overrides.id,
    duration: 4,
    dialogue: '',
    action: '',
    charactersForeground: [],
    charactersBackground: [],
    setting: '',
    camera: 'MS',
    ...overrides,
  };
}

const alice = makeSceneAsset({ id: 'alice', name: 'Alice', assetType: 'character' });
const bob = makeSceneAsset({ id: 'bob', name: 'Bob', assetType: 'character' });
const cafe = makeSceneAsset({ id: 'cafe', name: 'Café', assetType: 'location' });
const park = makeSceneAsset({ id: 'park', name: 'City Park', assetType: 'location' });
const sword = makeSceneAsset({ id: 'sword', name: 'Sword', assetType: 'prop' });
const phone = makeSceneAsset({ id: 'phone', name: 'Phone', assetType: 'prop' });

const shot1 = makeShot({
  id: 'shot-1',
  charactersForeground: ['Alice'],
  setting: 'Café Interior',
  action: 'Alice draws a sword',
});
const shot2 = makeShot({
  id: 'shot-2',
  charactersForeground: ['Bob'],
  setting: 'Dark Forest',
  action: 'Bob walks through trees',
});
const shot3 = makeShot({
  id: 'shot-3',
  charactersForeground: ['Alice', 'Bob'],
  setting: 'City Park',
  action: 'Alice hands the phone to Bob',
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('buildTemplateAssignments', () => {
  describe('all-throughout', () => {
    it('should create assignments for every asset × every shot', () => {
      const result = buildTemplateAssignments('all-throughout', [alice, bob, cafe, sword], [shot1, shot2]);
      // 4 assets × 2 shots = 8 assignments
      expect(result).toHaveLength(8);
      expect(result.every(a => a.presenceType === 'throughout')).toBe(true);
    });

    it('should return empty for no assets', () => {
      const result = buildTemplateAssignments('all-throughout', [], [shot1, shot2]);
      expect(result).toHaveLength(0);
    });

    it('should return empty for no shots', () => {
      const result = buildTemplateAssignments('all-throughout', [alice, bob], []);
      expect(result).toHaveLength(0);
    });

    it('should cover all combinations (3 assets × 3 shots = 9)', () => {
      const result = buildTemplateAssignments('all-throughout', [alice, cafe, sword], [shot1, shot2, shot3]);
      expect(result).toHaveLength(9);

      // Verify every asset appears in every shot
      for (const asset of [alice, cafe, sword]) {
        for (const shot of [shot1, shot2, shot3]) {
          expect(result.some(a => a.instanceId === asset.id && a.shotId === shot.id)).toBe(true);
        }
      }
    });

    it('should include all asset types (characters, locations, props)', () => {
      const result = buildTemplateAssignments('all-throughout', [alice, cafe, sword], [shot1]);
      const instanceIds = result.map(a => a.instanceId);
      expect(instanceIds).toContain('alice');
      expect(instanceIds).toContain('cafe');
      expect(instanceIds).toContain('sword');
    });
  });

  describe('match-characters', () => {
    it('should match characters to shots and add locations throughout', () => {
      const result = buildTemplateAssignments('match-characters', [alice, bob, cafe, sword], [shot1, shot2]);

      // Alice should be matched to shot-1 (foreground character match)
      expect(result.some(a => a.instanceId === 'alice' && a.shotId === 'shot-1')).toBe(true);
      // Bob should be matched to shot-2 (foreground character match)
      expect(result.some(a => a.instanceId === 'bob' && a.shotId === 'shot-2')).toBe(true);

      // Café (location) should be in both shots
      const cafeAssignments = result.filter(a => a.instanceId === 'cafe');
      expect(cafeAssignments).toHaveLength(2);

      // Sword (prop) should NOT be assigned at all
      const swordAssignments = result.filter(a => a.instanceId === 'sword');
      expect(swordAssignments).toHaveLength(0);
    });

    it('should match character to multiple shots when appearing in both', () => {
      const result = buildTemplateAssignments('match-characters', [alice, bob], [shot1, shot2, shot3]);

      // Alice appears in shot-1 and shot-3 (foreground)
      const aliceAssignments = result.filter(a => a.instanceId === 'alice');
      expect(aliceAssignments.length).toBeGreaterThanOrEqual(2);
      expect(aliceAssignments.some(a => a.shotId === 'shot-1')).toBe(true);
      expect(aliceAssignments.some(a => a.shotId === 'shot-3')).toBe(true);

      // Bob appears in shot-2 and shot-3 (foreground)
      const bobAssignments = result.filter(a => a.instanceId === 'bob');
      expect(bobAssignments.length).toBeGreaterThanOrEqual(2);
      expect(bobAssignments.some(a => a.shotId === 'shot-2')).toBe(true);
      expect(bobAssignments.some(a => a.shotId === 'shot-3')).toBe(true);
    });

    it('should assign multiple locations throughout all shots', () => {
      const result = buildTemplateAssignments('match-characters', [cafe, park], [shot1, shot2, shot3]);

      // Both locations should be in all 3 shots
      const cafeAssignments = result.filter(a => a.instanceId === 'cafe');
      const parkAssignments = result.filter(a => a.instanceId === 'park');
      expect(cafeAssignments).toHaveLength(3);
      expect(parkAssignments).toHaveLength(3);
    });

    it('should not assign character not found in any shot', () => {
      const eve = makeSceneAsset({ id: 'eve', name: 'Eve', assetType: 'character' });
      const result = buildTemplateAssignments('match-characters', [eve], [shot1, shot2]);
      expect(result).toHaveLength(0);
    });

    it('should set all assignments as "throughout"', () => {
      const result = buildTemplateAssignments('match-characters', [alice, bob, cafe], [shot1, shot2, shot3]);
      expect(result.every(a => a.presenceType === 'throughout')).toBe(true);
    });
  });

  describe('locations-throughout', () => {
    it('should only assign locations to all shots', () => {
      const result = buildTemplateAssignments('locations-throughout', [alice, bob, cafe, sword], [shot1, shot2]);

      // Only Café assigned
      expect(result).toHaveLength(2);
      expect(result.every(a => a.instanceId === 'cafe')).toBe(true);
      expect(result.every(a => a.presenceType === 'throughout')).toBe(true);
    });

    it('should return empty when no locations exist', () => {
      const result = buildTemplateAssignments('locations-throughout', [alice, bob, sword], [shot1, shot2]);
      expect(result).toHaveLength(0);
    });

    it('should handle multiple locations', () => {
      const result = buildTemplateAssignments('locations-throughout', [cafe, park], [shot1, shot2, shot3]);
      // 2 locations × 3 shots = 6
      expect(result).toHaveLength(6);
    });

    it('should not assign characters or props', () => {
      const result = buildTemplateAssignments('locations-throughout', [alice, bob, cafe, sword, phone], [shot1, shot2]);
      const assignedIds = new Set(result.map(a => a.instanceId));
      expect(assignedIds.has('alice')).toBe(false);
      expect(assignedIds.has('bob')).toBe(false);
      expect(assignedIds.has('sword')).toBe(false);
      expect(assignedIds.has('phone')).toBe(false);
      expect(assignedIds.has('cafe')).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle single asset and single shot', () => {
      const result = buildTemplateAssignments('all-throughout', [alice], [shot1]);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        shotId: 'shot-1',
        instanceId: 'alice',
        presenceType: 'throughout',
      });
    });

    it('should handle assets without project_asset gracefully', () => {
      const noProjectAsset = {
        id: 'orphan',
        scene_id: 'scene-1',
        project_asset_id: 'pa-orphan',
        effective_description: '',
        status_tags: [],
        carry_forward: true,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
        project_asset: undefined,
      } as unknown as SceneAssetInstance;

      // Should not crash
      const result = buildTemplateAssignments('locations-throughout', [noProjectAsset], [shot1]);
      // Not a location, so no assignments
      expect(result).toHaveLength(0);
    });

    it('should produce unique shotId:instanceId pairs (no duplicates)', () => {
      const result = buildTemplateAssignments('all-throughout', [alice, bob, cafe], [shot1, shot2, shot3]);
      const keys = result.map(a => `${a.shotId}:${a.instanceId}`);
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(keys.length);
    });
  });
});
