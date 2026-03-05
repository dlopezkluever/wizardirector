import { describe, it, expect } from 'vitest';
import { matchAssetToShots, type MatchableAsset, type ShotMatchResult } from '../shotAssetMatcher';
import type { Shot } from '@/types/scene';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

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

const shots: Shot[] = [
  makeShot({
    id: 'shot-1',
    charactersForeground: ['Alice', 'Bob'],
    charactersBackground: ['Guard'],
    setting: 'Castle Throne Room',
    action: 'Alice draws the enchanted sword from the stone',
    dialogue: 'ALICE: This is my destiny.',
  }),
  makeShot({
    id: 'shot-2',
    charactersForeground: ['Bob'],
    charactersBackground: [],
    setting: 'Dark Forest',
    action: 'Bob rides through the forest on horseback',
    dialogue: '',
  }),
  makeShot({
    id: 'shot-3',
    charactersForeground: ['Guard Captain'],
    charactersBackground: ['Alice'],
    setting: 'Castle Gate',
    action: 'Guard Captain opens the gate',
    dialogue: 'GUARD CAPTAIN: The way is open.',
  }),
];

// ---------------------------------------------------------------------------
// Character matching
// ---------------------------------------------------------------------------

describe('matchAssetToShots — characters', () => {
  const alice: MatchableAsset = { name: 'Alice', asset_type: 'character' };
  const bob: MatchableAsset = { name: 'Bob', asset_type: 'character' };
  const eve: MatchableAsset = { name: 'Eve', asset_type: 'character' };

  it('should match foreground character with high confidence', () => {
    const results = matchAssetToShots(alice, shots);
    const shot1 = results.find(r => r.shotId === 'shot-1')!;
    expect(shot1.matched).toBe(true);
    expect(shot1.confidence).toBe(1.0);
    expect(shot1.matchReason).toContain('Foreground');
  });

  it('should match background character with medium confidence', () => {
    const results = matchAssetToShots(alice, shots);
    const shot3 = results.find(r => r.shotId === 'shot-3')!;
    expect(shot3.matched).toBe(true);
    expect(shot3.confidence).toBe(0.7);
    expect(shot3.matchReason).toContain('Background');
  });

  it('should not match character not present in any shot', () => {
    const results = matchAssetToShots(eve, shots);
    expect(results.every(r => !r.matched)).toBe(true);
  });

  it('should match Bob in both shots he appears in', () => {
    const results = matchAssetToShots(bob, shots);
    const matched = results.filter(r => r.matched);
    expect(matched).toHaveLength(2);
    expect(matched.map(r => r.shotId)).toContain('shot-1');
    expect(matched.map(r => r.shotId)).toContain('shot-2');
  });

  it('should do case-insensitive matching', () => {
    const alice2: MatchableAsset = { name: 'alice', asset_type: 'character' };
    const results = matchAssetToShots(alice2, shots);
    expect(results.filter(r => r.matched).length).toBeGreaterThan(0);
  });

  it('should match character mentioned in dialogue with low confidence', () => {
    // "Guard Captain" is mentioned in dialogue of shot-3
    const guardCaptain: MatchableAsset = { name: 'Guard Captain', asset_type: 'character' };
    const results = matchAssetToShots(guardCaptain, shots);
    const shot3 = results.find(r => r.shotId === 'shot-3')!;
    // Should match foreground first (highest priority)
    expect(shot3.matched).toBe(true);
    expect(shot3.confidence).toBe(1.0);
  });

  it('should prioritize foreground over background match', () => {
    // Alice is foreground in shot-1, background in shot-3
    const results = matchAssetToShots(alice, shots);
    const shot1 = results.find(r => r.shotId === 'shot-1')!;
    const shot3 = results.find(r => r.shotId === 'shot-3')!;
    expect(shot1.confidence).toBeGreaterThan(shot3.confidence);
  });

  it('should return correct confidence ordering: foreground > background > dialogue', () => {
    // Create a shot with only dialogue mention
    const dialogueOnlyShot = makeShot({
      id: 'dialogue-shot',
      dialogue: 'Someone says: Alice is coming!',
    });
    const results = matchAssetToShots(alice, [dialogueOnlyShot]);
    const result = results.find(r => r.shotId === 'dialogue-shot')!;
    expect(result.matched).toBe(true);
    expect(result.confidence).toBe(0.4); // dialogue mention
  });
});

// ---------------------------------------------------------------------------
// Location matching
// ---------------------------------------------------------------------------

describe('matchAssetToShots — locations', () => {
  const castle: MatchableAsset = { name: 'Castle Throne Room', asset_type: 'location' };
  const forest: MatchableAsset = { name: 'Dark Forest', asset_type: 'location' };
  const beach: MatchableAsset = { name: 'Beach', asset_type: 'location' };

  it('should match location by setting name', () => {
    const results = matchAssetToShots(castle, shots);
    const shot1 = results.find(r => r.shotId === 'shot-1')!;
    expect(shot1.matched).toBe(true);
    expect(shot1.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it('should match forest location', () => {
    const results = matchAssetToShots(forest, shots);
    const shot2 = results.find(r => r.shotId === 'shot-2')!;
    expect(shot2.matched).toBe(true);
  });

  it('should not match location absent from all settings', () => {
    const results = matchAssetToShots(beach, shots);
    expect(results.every(r => !r.matched)).toBe(true);
  });

  it('should match partial location name (Castle matches Castle Gate)', () => {
    const castleGeneral: MatchableAsset = { name: 'Castle', asset_type: 'location' };
    const results = matchAssetToShots(castleGeneral, shots);
    const castleShots = results.filter(r => r.matched);
    // Should match shot-1 (Castle Throne Room) and shot-3 (Castle Gate)
    expect(castleShots.length).toBeGreaterThanOrEqual(2);
  });

  it('should match location with description fallback', () => {
    const genericLocation: MatchableAsset = {
      name: 'Outdoor Area',
      asset_type: 'location',
      description: 'Dark Forest',
    };
    const results = matchAssetToShots(genericLocation, shots);
    const shot2 = results.find(r => r.shotId === 'shot-2')!;
    expect(shot2.matched).toBe(true);
    expect(shot2.confidence).toBe(0.5); // description partial match
  });

  it('should have higher confidence for direct name match vs description match', () => {
    const directMatch: MatchableAsset = { name: 'Dark Forest', asset_type: 'location' };
    const descriptionMatch: MatchableAsset = {
      name: 'Woodland',
      asset_type: 'location',
      description: 'Dark forest clearing',
    };
    const directResults = matchAssetToShots(directMatch, shots);
    const descResults = matchAssetToShots(descriptionMatch, shots);
    const directShot2 = directResults.find(r => r.shotId === 'shot-2')!;
    const descShot2 = descResults.find(r => r.shotId === 'shot-2');
    expect(directShot2.confidence).toBeGreaterThan(descShot2?.confidence || 0);
  });
});

// ---------------------------------------------------------------------------
// Prop matching
// ---------------------------------------------------------------------------

describe('matchAssetToShots — props', () => {
  const sword: MatchableAsset = { name: 'Sword', asset_type: 'prop' };
  const horseProp: MatchableAsset = { name: 'Horse', asset_type: 'prop' };
  const crown: MatchableAsset = { name: 'Crown', asset_type: 'prop' };

  it('should match prop mentioned in action', () => {
    const results = matchAssetToShots(sword, shots);
    const shot1 = results.find(r => r.shotId === 'shot-1')!;
    expect(shot1.matched).toBe(true);
    expect(shot1.matchReason).toContain('action');
  });

  it('should match horseback as horse in action', () => {
    const results = matchAssetToShots(horseProp, shots);
    const shot2 = results.find(r => r.shotId === 'shot-2')!;
    expect(shot2.matched).toBe(true);
  });

  it('should not match prop not mentioned anywhere', () => {
    const results = matchAssetToShots(crown, shots);
    expect(results.every(r => !r.matched)).toBe(true);
  });

  it('should match prop in action with higher confidence than dialogue', () => {
    const shotWithBoth = makeShot({
      id: 'both-shot',
      action: 'She picks up the sword',
      dialogue: 'ALICE: Hand me that sword!',
    });
    const results = matchAssetToShots(sword, [shotWithBoth]);
    const result = results[0];
    expect(result.matched).toBe(true);
    expect(result.confidence).toBe(0.8); // action match takes priority
  });

  it('should match prop mentioned only in dialogue', () => {
    const shotDialogueOnly = makeShot({
      id: 'dialogue-prop-shot',
      dialogue: 'BOB: Where did I leave my sword?',
    });
    const results = matchAssetToShots(sword, [shotDialogueOnly]);
    const result = results[0];
    expect(result.matched).toBe(true);
    expect(result.confidence).toBe(0.5); // dialogue mention
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('matchAssetToShots — edge cases', () => {
  it('should return empty array for empty shots list', () => {
    const asset: MatchableAsset = { name: 'Alice', asset_type: 'character' };
    const results = matchAssetToShots(asset, []);
    expect(results).toHaveLength(0);
  });

  it('should handle asset with empty name gracefully', () => {
    const asset: MatchableAsset = { name: '', asset_type: 'character' };
    const results = matchAssetToShots(asset, shots);
    expect(results.every(r => !r.matched)).toBe(true);
  });

  it('should return one result per shot', () => {
    const asset: MatchableAsset = { name: 'Alice', asset_type: 'character' };
    const results = matchAssetToShots(asset, shots);
    expect(results).toHaveLength(shots.length);
  });

  it('should handle shot with empty foreground/background arrays', () => {
    const emptyShot = makeShot({ id: 'empty' });
    const asset: MatchableAsset = { name: 'Alice', asset_type: 'character' };
    const results = matchAssetToShots(asset, [emptyShot]);
    expect(results[0].matched).toBe(false);
  });

  it('should handle asset name with special characters', () => {
    const specialAsset: MatchableAsset = { name: "O'Brien", asset_type: 'character' };
    const shotWithSpecial = makeShot({
      id: 'special-shot',
      charactersForeground: ["O'Brien"],
    });
    const results = matchAssetToShots(specialAsset, [shotWithSpecial]);
    expect(results[0].matched).toBe(true);
  });

  it('should handle multi-word character names', () => {
    const multiWord: MatchableAsset = { name: 'Guard Captain', asset_type: 'character' };
    const results = matchAssetToShots(multiWord, shots);
    const shot3 = results.find(r => r.shotId === 'shot-3')!;
    expect(shot3.matched).toBe(true);
  });

  it('should handle whitespace variations in names', () => {
    const spacedName: MatchableAsset = { name: '  Alice  ', asset_type: 'character' };
    const results = matchAssetToShots(spacedName, shots);
    expect(results.filter(r => r.matched).length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Confidence thresholds
// ---------------------------------------------------------------------------

describe('matchAssetToShots — confidence values', () => {
  it('character foreground confidence should be 1.0', () => {
    const asset: MatchableAsset = { name: 'Alice', asset_type: 'character' };
    const shot = makeShot({ id: 's1', charactersForeground: ['Alice'] });
    const result = matchAssetToShots(asset, [shot])[0];
    expect(result.confidence).toBe(1.0);
  });

  it('character background confidence should be 0.7', () => {
    const asset: MatchableAsset = { name: 'Alice', asset_type: 'character' };
    const shot = makeShot({ id: 's1', charactersBackground: ['Alice'] });
    const result = matchAssetToShots(asset, [shot])[0];
    expect(result.confidence).toBe(0.7);
  });

  it('character dialogue confidence should be 0.4', () => {
    const asset: MatchableAsset = { name: 'Alice', asset_type: 'character' };
    const shot = makeShot({ id: 's1', dialogue: 'NARRATOR: Alice walked in.' });
    const result = matchAssetToShots(asset, [shot])[0];
    expect(result.confidence).toBe(0.4);
  });

  it('location setting confidence should be 0.9', () => {
    const asset: MatchableAsset = { name: 'Forest', asset_type: 'location' };
    const shot = makeShot({ id: 's1', setting: 'Deep Forest' });
    const result = matchAssetToShots(asset, [shot])[0];
    expect(result.confidence).toBe(0.9);
  });

  it('location description confidence should be 0.5', () => {
    const asset: MatchableAsset = { name: 'Outdoors', asset_type: 'location', description: 'Forest clearing' };
    const shot = makeShot({ id: 's1', setting: 'Forest clearing by the river' });
    const result = matchAssetToShots(asset, [shot])[0];
    expect(result.confidence).toBe(0.5);
  });

  it('prop action confidence should be 0.8', () => {
    const asset: MatchableAsset = { name: 'Sword', asset_type: 'prop' };
    const shot = makeShot({ id: 's1', action: 'He picks up the sword.' });
    const result = matchAssetToShots(asset, [shot])[0];
    expect(result.confidence).toBe(0.8);
  });

  it('prop dialogue confidence should be 0.5', () => {
    const asset: MatchableAsset = { name: 'Sword', asset_type: 'prop' };
    const shot = makeShot({ id: 's1', dialogue: 'BOB: Get the sword!' });
    const result = matchAssetToShots(asset, [shot])[0];
    expect(result.confidence).toBe(0.5);
  });

  it('unmatched confidence should be 0', () => {
    const asset: MatchableAsset = { name: 'Unicorn', asset_type: 'character' };
    const shot = makeShot({ id: 's1' });
    const result = matchAssetToShots(asset, [shot])[0];
    expect(result.matched).toBe(false);
    expect(result.confidence).toBe(0);
  });
});
