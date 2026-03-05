/**
 * Prompt Generation — buildFrameReferenceManifests + buildPresenceVideoContext tests.
 * Pure function tests — no mocking required.
 */

import { describe, it, expect } from '@jest/globals';
import {
  buildFrameReferenceManifests,
  buildNumberedImageManifest,
  extractTraitSummary,
  type SceneAssetInstanceData,
  type ShotAssetAssignmentForPrompt,
} from '../services/promptGenerationService.js';

// ---------------------------------------------------------------------------
// Test asset factories
// ---------------------------------------------------------------------------

function makeAsset(overrides: Partial<SceneAssetInstanceData> & { id: string }): SceneAssetInstanceData {
  return {
    effective_description: 'A test asset',
    status_tags: [],
    image_key_url: `https://img.test/${overrides.id}.png`,
    project_asset: {
      id: `pa-${overrides.id}`,
      name: overrides.id,
      asset_type: 'character',
    },
    ...overrides,
  };
}

const characterAlice = makeAsset({
  id: 'alice',
  effective_description: 'Alice, 30s, red hair',
  project_asset: { id: 'pa-alice', name: 'Alice', asset_type: 'character' },
});

const characterBob = makeAsset({
  id: 'bob',
  effective_description: 'Bob, 40s, suit',
  project_asset: { id: 'pa-bob', name: 'Bob', asset_type: 'character' },
});

const locationCafe = makeAsset({
  id: 'cafe',
  effective_description: 'Cozy café interior',
  project_asset: { id: 'pa-cafe', name: 'Café', asset_type: 'location' },
});

const propCoffeeCup = makeAsset({
  id: 'coffee',
  effective_description: 'Steaming coffee cup',
  project_asset: { id: 'pa-coffee', name: 'Coffee Cup', asset_type: 'prop' },
});

// ---------------------------------------------------------------------------
// buildFrameReferenceManifests
// ---------------------------------------------------------------------------

describe('buildFrameReferenceManifests', () => {
  it('should put "throughout" assets in both start and end manifests', () => {
    const assets = [characterAlice, locationCafe];
    const assignments: ShotAssetAssignmentForPrompt[] = [
      { scene_asset_instance_id: 'alice', presence_type: 'throughout' },
      { scene_asset_instance_id: 'cafe', presence_type: 'throughout' },
    ];

    const result = buildFrameReferenceManifests(assets, assignments);

    // Alice and Café in both
    expect(result.startFrameImageOrder.map(e => e.assetName)).toContain('Alice');
    expect(result.startFrameImageOrder.map(e => e.assetName)).toContain('Café');
    expect(result.endFrameImageOrder.map(e => e.assetName)).toContain('Alice');
    expect(result.endFrameImageOrder.map(e => e.assetName)).toContain('Café');
    expect(result.videoOnlyAssets).toHaveLength(0);
  });

  it('should put "enters" asset in end manifest only', () => {
    const assets = [characterAlice, characterBob];
    const assignments: ShotAssetAssignmentForPrompt[] = [
      { scene_asset_instance_id: 'alice', presence_type: 'throughout' },
      { scene_asset_instance_id: 'bob', presence_type: 'enters' },
    ];

    const result = buildFrameReferenceManifests(assets, assignments);

    // Bob only in end frame
    expect(result.startFrameImageOrder.map(e => e.assetName)).not.toContain('Bob');
    expect(result.endFrameImageOrder.map(e => e.assetName)).toContain('Bob');
    // Alice in both
    expect(result.startFrameImageOrder.map(e => e.assetName)).toContain('Alice');
    expect(result.endFrameImageOrder.map(e => e.assetName)).toContain('Alice');
  });

  it('should put "exits" asset in start manifest only', () => {
    const assets = [characterAlice, characterBob];
    const assignments: ShotAssetAssignmentForPrompt[] = [
      { scene_asset_instance_id: 'alice', presence_type: 'throughout' },
      { scene_asset_instance_id: 'bob', presence_type: 'exits' },
    ];

    const result = buildFrameReferenceManifests(assets, assignments);

    // Bob only in start frame
    expect(result.startFrameImageOrder.map(e => e.assetName)).toContain('Bob');
    expect(result.endFrameImageOrder.map(e => e.assetName)).not.toContain('Bob');
  });

  it('should put "passes_through" asset in neither manifest, only videoOnlyAssets', () => {
    const assets = [characterAlice, propCoffeeCup];
    const assignments: ShotAssetAssignmentForPrompt[] = [
      { scene_asset_instance_id: 'alice', presence_type: 'throughout' },
      { scene_asset_instance_id: 'coffee', presence_type: 'passes_through' },
    ];

    const result = buildFrameReferenceManifests(assets, assignments);

    // Coffee Cup in neither frame manifest
    expect(result.startFrameImageOrder.map(e => e.assetName)).not.toContain('Coffee Cup');
    expect(result.endFrameImageOrder.map(e => e.assetName)).not.toContain('Coffee Cup');
    // But in videoOnlyAssets
    expect(result.videoOnlyAssets).toHaveLength(1);
    expect(result.videoOnlyAssets[0].id).toBe('coffee');
  });

  it('should handle mixed presence types correctly', () => {
    const assets = [characterAlice, characterBob, locationCafe, propCoffeeCup];
    const assignments: ShotAssetAssignmentForPrompt[] = [
      { scene_asset_instance_id: 'alice', presence_type: 'throughout' },
      { scene_asset_instance_id: 'bob', presence_type: 'enters' },
      { scene_asset_instance_id: 'cafe', presence_type: 'exits' },
      { scene_asset_instance_id: 'coffee', presence_type: 'passes_through' },
    ];

    const result = buildFrameReferenceManifests(assets, assignments);

    // Start frame: Alice + Café (throughout + exits)
    const startNames = result.startFrameImageOrder.map(e => e.assetName);
    expect(startNames).toContain('Alice');
    expect(startNames).toContain('Café');
    expect(startNames).not.toContain('Bob');
    expect(startNames).not.toContain('Coffee Cup');

    // End frame: Alice + Bob (throughout + enters)
    const endNames = result.endFrameImageOrder.map(e => e.assetName);
    expect(endNames).toContain('Alice');
    expect(endNames).toContain('Bob');
    expect(endNames).not.toContain('Café');
    expect(endNames).not.toContain('Coffee Cup');

    // Video only: Coffee Cup
    expect(result.videoOnlyAssets).toHaveLength(1);
    expect(result.videoOnlyAssets[0].project_asset?.name).toBe('Coffee Cup');
  });

  it('should default to "throughout" when asset has no assignment', () => {
    const assets = [characterAlice, characterBob];
    const assignments: ShotAssetAssignmentForPrompt[] = [
      // Only Alice has an assignment; Bob has none
      { scene_asset_instance_id: 'alice', presence_type: 'enters' },
    ];

    const result = buildFrameReferenceManifests(assets, assignments);

    // Bob defaults to 'throughout' → both manifests
    expect(result.startFrameImageOrder.map(e => e.assetName)).toContain('Bob');
    expect(result.endFrameImageOrder.map(e => e.assetName)).toContain('Bob');
    // Alice is 'enters' → end only
    expect(result.startFrameImageOrder.map(e => e.assetName)).not.toContain('Alice');
    expect(result.endFrameImageOrder.map(e => e.assetName)).toContain('Alice');
  });

  it('should return empty manifests when no assets have images', () => {
    const noImageAsset = makeAsset({
      id: 'ghost',
      image_key_url: undefined,
      master_image_url: undefined,
    });
    const assignments: ShotAssetAssignmentForPrompt[] = [
      { scene_asset_instance_id: 'ghost', presence_type: 'throughout' },
    ];

    const result = buildFrameReferenceManifests([noImageAsset], assignments);

    expect(result.startFrameManifest).toBe('');
    expect(result.endFrameManifest).toBe('');
    expect(result.startFrameImageOrder).toHaveLength(0);
    expect(result.endFrameImageOrder).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// buildNumberedImageManifest (also tested indirectly above)
// ---------------------------------------------------------------------------

describe('buildNumberedImageManifest', () => {
  it('should sort assets as characters → locations → props', () => {
    const assets = [propCoffeeCup, locationCafe, characterAlice];
    const { imageOrder } = buildNumberedImageManifest(assets);

    expect(imageOrder[0].type).toBe('character');
    expect(imageOrder[1].type).toBe('location');
    expect(imageOrder[2].type).toBe('prop');
  });

  it('should number images sequentially starting at 1', () => {
    const assets = [characterAlice, locationCafe];
    const { imageOrder } = buildNumberedImageManifest(assets);

    expect(imageOrder[0].label).toBe('Image #1');
    expect(imageOrder[1].label).toBe('Image #2');
  });

  it('should skip assets without images', () => {
    const noImage = makeAsset({ id: 'invisible', image_key_url: undefined, master_image_url: undefined });
    const assets = [characterAlice, noImage];
    const { imageOrder } = buildNumberedImageManifest(assets);

    expect(imageOrder).toHaveLength(1);
    expect(imageOrder[0].assetName).toBe('Alice');
  });

  it('should generate manifest text with header and trait summary', () => {
    const { manifest } = buildNumberedImageManifest([characterAlice]);

    expect(manifest).toContain('REFERENCE IMAGES');
    expect(manifest).toContain('Image #1: Alice (character)');
    // Trait summary from effective_description
    expect(manifest).toContain('— Alice, 30s, red hair');
  });

  it('should omit trait summary when effective_description is empty', () => {
    const noDescAsset = makeAsset({
      id: 'blank',
      effective_description: '',
      project_asset: { id: 'pa-blank', name: 'Blank', asset_type: 'character' },
    });
    const { manifest } = buildNumberedImageManifest([noDescAsset]);

    expect(manifest).toContain('Image #1: Blank (character)');
    expect(manifest).not.toContain('—');
  });
});

// ---------------------------------------------------------------------------
// extractTraitSummary
// ---------------------------------------------------------------------------

describe('extractTraitSummary', () => {
  it('should return the first sentence from a description', () => {
    const result = extractTraitSummary('Red-haired woman in blue dress. Mid-20s with freckles.');
    expect(result).toBe('Red-haired woman in blue dress.');
  });

  it('should truncate at word boundary when first sentence exceeds maxLen', () => {
    const long = 'A tall red-haired woman wearing an elaborate Victorian-era blue silk dress with ornate golden embroidery and pearl accessories throughout.';
    const result = extractTraitSummary(long, 60);
    expect(result.length).toBeLessThanOrEqual(64); // 60 + '...'
    expect(result.endsWith('...')).toBe(true);
  });

  it('should return empty string for undefined input', () => {
    expect(extractTraitSummary(undefined)).toBe('');
  });

  it('should return empty string for empty/whitespace input', () => {
    expect(extractTraitSummary('')).toBe('');
    expect(extractTraitSummary('   ')).toBe('');
  });

  it('should handle short descriptions without truncation', () => {
    expect(extractTraitSummary('Bob, 40s, suit')).toBe('Bob, 40s, suit');
  });

  it('should respect custom maxLen', () => {
    const result = extractTraitSummary('A very long detailed description that goes on and on about many things', 20);
    expect(result.length).toBeLessThanOrEqual(24); // 20 + '...'
  });

  it('should handle descriptions with exclamation marks', () => {
    const result = extractTraitSummary('Fiery warrior! Battle-scarred veteran of many wars.');
    expect(result).toBe('Fiery warrior!');
  });

  it('should handle descriptions with question marks', () => {
    const result = extractTraitSummary('Who is this mysterious stranger? Nobody knows.');
    expect(result).toBe('Who is this mysterious stranger?');
  });
});
