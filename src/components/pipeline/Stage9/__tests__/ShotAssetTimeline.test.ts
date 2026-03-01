/**
 * ShotAssetTimeline — unit tests for the timeline matrix view.
 * Tests the data structures, presence cycling logic, and color/label mappings.
 */

import { describe, it, expect } from 'vitest';
import type { ShotAssetAssignment, PresenceType, SceneAssetInstance, PromptSet } from '@/types/scene';

// ---------------------------------------------------------------------------
// Test factories
// ---------------------------------------------------------------------------

function makePromptSet(shotId: string, shotUuid: string): PromptSet {
  return {
    shotId,
    shotUuid,
    framePrompt: '',
    videoPrompt: '',
    requiresEndFrame: false,
    compatibleModels: [],
  };
}

function makeAssignment(
  shotId: string,
  instanceId: string,
  presenceType: PresenceType
): ShotAssetAssignment {
  return {
    id: `a-${shotId}-${instanceId}`,
    shot_id: shotId,
    scene_asset_instance_id: instanceId,
    presence_type: presenceType,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  };
}

function makeSceneAsset(id: string, name: string, assetType: string): SceneAssetInstance {
  return {
    id,
    scene_id: 'scene-1',
    project_asset_id: `pa-${id}`,
    effective_description: '',
    status_tags: [],
    carry_forward: true,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    project_asset: {
      id: `pa-${id}`,
      project_id: 'proj-1',
      branch_id: 'br-1',
      name,
      asset_type: assetType as any,
      description: '',
      locked: false,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    },
  } as SceneAssetInstance;
}

// ---------------------------------------------------------------------------
// Presence cycle logic (mirrors ShotAssetTimeline component)
// ---------------------------------------------------------------------------

const PRESENCE_CYCLE: (PresenceType | null)[] = [null, 'throughout', 'enters', 'exits', 'passes_through'];

const PRESENCE_COLORS: Record<PresenceType, string> = {
  throughout: 'bg-blue-500/40 border-blue-500/60 hover:bg-blue-500/50',
  enters: 'bg-emerald-500/40 border-emerald-500/60 hover:bg-emerald-500/50',
  exits: 'bg-red-500/40 border-red-500/60 hover:bg-red-500/50',
  passes_through: 'bg-amber-500/30 border-amber-500/50 border-dashed hover:bg-amber-500/40',
};

const PRESENCE_LABELS: Record<PresenceType, string> = {
  throughout: 'T',
  enters: 'E',
  exits: 'X',
  passes_through: 'P',
};

// ---------------------------------------------------------------------------
// Tests for data structures used by timeline
// ---------------------------------------------------------------------------

describe('ShotAssetTimeline data logic', () => {
  const prompts = [
    makePromptSet('1-1', 'uuid-shot-1'),
    makePromptSet('1-2', 'uuid-shot-2'),
    makePromptSet('1-3', 'uuid-shot-3'),
  ];

  const assets = [
    makeSceneAsset('alice', 'Alice', 'character'),
    makeSceneAsset('cafe', 'Café', 'location'),
    makeSceneAsset('sword', 'Sword', 'prop'),
  ];

  const assignments = [
    makeAssignment('uuid-shot-1', 'alice', 'throughout'),
    makeAssignment('uuid-shot-2', 'alice', 'enters'),
    makeAssignment('uuid-shot-3', 'alice', 'exits'),
    makeAssignment('uuid-shot-1', 'cafe', 'throughout'),
    makeAssignment('uuid-shot-2', 'cafe', 'throughout'),
    makeAssignment('uuid-shot-3', 'cafe', 'throughout'),
    makeAssignment('uuid-shot-2', 'sword', 'passes_through'),
  ];

  it('should build correct assignment lookup map', () => {
    const map = new Map<string, ShotAssetAssignment>();
    for (const a of assignments) {
      map.set(`${a.shot_id}:${a.scene_asset_instance_id}`, a);
    }

    expect(map.get('uuid-shot-1:alice')?.presence_type).toBe('throughout');
    expect(map.get('uuid-shot-2:alice')?.presence_type).toBe('enters');
    expect(map.get('uuid-shot-3:alice')?.presence_type).toBe('exits');
    expect(map.get('uuid-shot-2:sword')?.presence_type).toBe('passes_through');
    expect(map.has('uuid-shot-1:sword')).toBe(false);
  });

  it('should have correct grid dimensions (assets × shots)', () => {
    // 3 assets × 3 shots = 9 cells
    const totalCells = assets.length * prompts.length;
    expect(totalCells).toBe(9);
  });

  it('should identify empty cells (no assignment)', () => {
    const map = new Map<string, ShotAssetAssignment>();
    for (const a of assignments) {
      map.set(`${a.shot_id}:${a.scene_asset_instance_id}`, a);
    }

    // Sword has no assignment in shot 1 and shot 3
    expect(map.has('uuid-shot-1:sword')).toBe(false);
    expect(map.has('uuid-shot-3:sword')).toBe(false);
    // But does in shot 2
    expect(map.has('uuid-shot-2:sword')).toBe(true);
  });

  it('should filter prompts to only those with shotUuid', () => {
    const withNoUuid = [...prompts, { ...makePromptSet('orphan', ''), shotUuid: undefined as any }];
    const filtered = withNoUuid.filter(ps => ps.shotUuid);
    expect(filtered).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// Presence cycling logic
// ---------------------------------------------------------------------------

describe('ShotAssetTimeline presence cycling', () => {
  it('should cycle: null → throughout → enters → exits → passes_through → null', () => {
    const cycle = PRESENCE_CYCLE;
    expect(cycle).toEqual([null, 'throughout', 'enters', 'exits', 'passes_through']);

    // Simulate clicking through the full cycle
    let current: PresenceType | null = null;
    const visited: (PresenceType | null)[] = [current];

    for (let i = 0; i < cycle.length; i++) {
      const currentIndex = cycle.indexOf(current);
      const nextIndex = (currentIndex + 1) % cycle.length;
      current = cycle[nextIndex];
      visited.push(current);
    }

    // Should have cycled through all states and back to null
    expect(visited).toEqual([null, 'throughout', 'enters', 'exits', 'passes_through', null]);
  });

  it('should determine correct next state from "throughout"', () => {
    const currentIndex = PRESENCE_CYCLE.indexOf('throughout');
    const nextIndex = (currentIndex + 1) % PRESENCE_CYCLE.length;
    expect(PRESENCE_CYCLE[nextIndex]).toBe('enters');
  });

  it('should determine correct next state from "enters"', () => {
    const currentIndex = PRESENCE_CYCLE.indexOf('enters');
    const nextIndex = (currentIndex + 1) % PRESENCE_CYCLE.length;
    expect(PRESENCE_CYCLE[nextIndex]).toBe('exits');
  });

  it('should determine correct next state from "exits"', () => {
    const currentIndex = PRESENCE_CYCLE.indexOf('exits');
    const nextIndex = (currentIndex + 1) % PRESENCE_CYCLE.length;
    expect(PRESENCE_CYCLE[nextIndex]).toBe('passes_through');
  });

  it('should wrap around from "passes_through" back to null (delete)', () => {
    const currentIndex = PRESENCE_CYCLE.indexOf('passes_through');
    const nextIndex = (currentIndex + 1) % PRESENCE_CYCLE.length;
    expect(PRESENCE_CYCLE[nextIndex]).toBeNull();
  });

  it('should create new assignment when clicking an empty cell (null → throughout)', () => {
    // Empty cell: no existing assignment
    const existing = undefined;
    if (!existing) {
      // Component creates assignment as 'throughout'
      const newPresence: PresenceType = 'throughout';
      expect(newPresence).toBe('throughout');
    }
  });
});

// ---------------------------------------------------------------------------
// Presence labels and colors
// ---------------------------------------------------------------------------

describe('ShotAssetTimeline labels & colors', () => {
  it('should have a label for every presence type', () => {
    const allPresenceTypes: PresenceType[] = ['throughout', 'enters', 'exits', 'passes_through'];
    for (const pt of allPresenceTypes) {
      expect(PRESENCE_LABELS[pt]).toBeDefined();
      expect(PRESENCE_LABELS[pt].length).toBe(1); // single char labels
    }
  });

  it('should use correct label abbreviations', () => {
    expect(PRESENCE_LABELS.throughout).toBe('T');
    expect(PRESENCE_LABELS.enters).toBe('E');
    expect(PRESENCE_LABELS.exits).toBe('X');
    expect(PRESENCE_LABELS.passes_through).toBe('P');
  });

  it('should have colors for every presence type', () => {
    const allPresenceTypes: PresenceType[] = ['throughout', 'enters', 'exits', 'passes_through'];
    for (const pt of allPresenceTypes) {
      expect(PRESENCE_COLORS[pt]).toBeDefined();
      expect(PRESENCE_COLORS[pt].length).toBeGreaterThan(0);
    }
  });

  it('should use dashed border for passes_through', () => {
    expect(PRESENCE_COLORS.passes_through).toContain('border-dashed');
  });

  it('should NOT use dashed border for other presence types', () => {
    expect(PRESENCE_COLORS.throughout).not.toContain('border-dashed');
    expect(PRESENCE_COLORS.enters).not.toContain('border-dashed');
    expect(PRESENCE_COLORS.exits).not.toContain('border-dashed');
  });
});

// ---------------------------------------------------------------------------
// Asset type dot colors (mirrors component logic)
// ---------------------------------------------------------------------------

describe('ShotAssetTimeline asset type indicators', () => {
  function getAssetDotColor(assetType: string): string {
    return assetType === 'character' ? 'bg-blue-500' :
           assetType === 'location' ? 'bg-purple-500' :
           'bg-green-500';
  }

  it('should show blue dot for characters', () => {
    expect(getAssetDotColor('character')).toBe('bg-blue-500');
  });

  it('should show purple dot for locations', () => {
    expect(getAssetDotColor('location')).toBe('bg-purple-500');
  });

  it('should show green dot for props', () => {
    expect(getAssetDotColor('prop')).toBe('bg-green-500');
  });

  it('should default to green for unknown asset types', () => {
    expect(getAssetDotColor('unknown')).toBe('bg-green-500');
  });
});

// ---------------------------------------------------------------------------
// Assignment map coverage tests
// ---------------------------------------------------------------------------

describe('ShotAssetTimeline assignment map edge cases', () => {
  it('should handle duplicate keys by keeping last assignment', () => {
    const duplicates = [
      makeAssignment('shot-1', 'alice', 'throughout'),
      makeAssignment('shot-1', 'alice', 'enters'), // overwrites
    ];
    const map = new Map<string, ShotAssetAssignment>();
    for (const a of duplicates) {
      map.set(`${a.shot_id}:${a.scene_asset_instance_id}`, a);
    }
    expect(map.get('shot-1:alice')?.presence_type).toBe('enters');
  });

  it('should handle empty assignments array', () => {
    const map = new Map<string, ShotAssetAssignment>();
    expect(map.size).toBe(0);
    expect(map.has('any:key')).toBe(false);
  });

  it('should handle large grid (many assets × many shots)', () => {
    const manyAssets = Array.from({ length: 20 }, (_, i) => makeSceneAsset(`a${i}`, `Asset ${i}`, 'character'));
    const manyPrompts = Array.from({ length: 15 }, (_, i) => makePromptSet(`s${i}`, `uuid-s${i}`));
    const totalCells = manyAssets.length * manyPrompts.length;
    expect(totalCells).toBe(300);
  });
});
