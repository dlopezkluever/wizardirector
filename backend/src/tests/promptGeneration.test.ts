/**
 * Prompt Generation — buildFrameReferenceManifests + buildPresenceVideoContext tests.
 * Pure function tests — no mocking required.
 */

import { describe, it, expect } from '@jest/globals';
import {
  buildFrameReferenceManifests,
  buildNumberedImageManifest,
  extractTraitSummary,
  parseCameraMetadata,
  matchShotToLocationView,
  buildLocationDeltaDescription,
  enrichAssetsWithAngleMatch,
  type SceneAssetInstanceData,
  type ShotAssetAssignmentForPrompt,
  type LocationViewData,
  type ShotData,
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
    // Locations are now always present in both start and end frames so the
    // canonical location/background reference is preserved across frames.
    const startNames = result.startFrameImageOrder.map(e => e.assetName);
    expect(startNames).toContain('Alice');
    expect(startNames).toContain('Café');
    expect(startNames).not.toContain('Bob');
    expect(startNames).not.toContain('Coffee Cup');

    // End frame: Alice + Bob + Café (throughout + enters + location always carried)
    const endNames = result.endFrameImageOrder.map(e => e.assetName);
    expect(endNames).toContain('Alice');
    expect(endNames).toContain('Bob');
    expect(endNames).toContain('Café');
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
  it('should sort assets as locations → characters → props', () => {
    // Phase 4 generation contract: locations come first because they are the
    // primary background/identity reference for image generation.
    const assets = [propCoffeeCup, locationCafe, characterAlice];
    const { imageOrder } = buildNumberedImageManifest(assets);

    expect(imageOrder[0].type).toBe('location');
    expect(imageOrder[1].type).toBe('character');
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

// ---------------------------------------------------------------------------
// parseCameraMetadata (3.7 Phase D)
// ---------------------------------------------------------------------------

describe('parseCameraMetadata', () => {
  it('should parse wide shot at eye level static', () => {
    const result = parseCameraMetadata('WS - Eye Level - Static');
    expect(result.distance).toBe('wide');
    expect(result.height).toBe('eye_level');
    expect(result.movement).toBe('static');
  });

  it('should parse close-up at low angle with dolly', () => {
    const result = parseCameraMetadata('CU - Low Angle - Slow Dolly In');
    expect(result.distance).toBe('close');
    expect(result.height).toBe('low_angle');
    expect(result.movement).toMatch(/dolly_in/);
  });

  it('should parse medium shot at high angle with pan', () => {
    const result = parseCameraMetadata('MS - High Angle - Slow Pan Right');
    expect(result.distance).toBe('medium');
    expect(result.height).toBe('high_angle');
    expect(result.movement).toMatch(/pan_right/);
  });

  it('should parse extreme wide shot as wide', () => {
    const result = parseCameraMetadata('EWS - Bird\'s Eye - Crane Down');
    expect(result.distance).toBe('wide');
    expect(result.height).toBe('overhead');
    expect(result.movement).toMatch(/crane_down/);
  });

  it('should parse MCU as close', () => {
    const result = parseCameraMetadata('MCU - Eye Level - Static');
    expect(result.distance).toBe('close');
    expect(result.height).toBe('eye_level');
  });

  it('should handle ground level / worm\'s eye', () => {
    const result = parseCameraMetadata('WS - Worm\'s Eye - Handheld');
    expect(result.distance).toBe('wide');
    expect(result.height).toBe('ground_level');
    expect(result.movement).toBe('handheld');
  });

  it('should default to medium/eye_level/static for ambiguous input', () => {
    const result = parseCameraMetadata('something weird');
    expect(result.distance).toBe('medium');
    expect(result.height).toBe('eye_level');
    expect(result.movement).toBe('static');
  });

  it('should handle dutch angle as eye_level', () => {
    const result = parseCameraMetadata('MS - Dutch Angle - Steadicam');
    expect(result.distance).toBe('medium');
    expect(result.height).toBe('eye_level');
    expect(result.movement).toBe('steadicam');
  });
});

// ---------------------------------------------------------------------------
// 3.7 Phase F: matchShotToLocationView
// ---------------------------------------------------------------------------

function makeDirection(overrides: Partial<LocationViewData> & { id: string }): LocationViewData {
  return {
    name: 'direction_1',
    view_type: 'direction',
    camera_distance: 'wide',
    camera_height: 'eye_level',
    is_primary: false,
    source: 'user',
    ...overrides,
  };
}

function makeShotData(overrides: Partial<ShotData>): ShotData {
  return {
    id: 'shot-1',
    shot_id: 'S01',
    duration: 8,
    dialogue: '',
    action: '',
    characters_foreground: [],
    characters_background: [],
    setting: '',
    camera: 'MS - eye level static',
    ...overrides,
  };
}

describe('matchShotToLocationView', () => {
  const dir1 = makeDirection({ id: 'd1', name: 'direction_1', alias: 'stove wall', camera_height: 'eye_level', camera_distance: 'wide', is_primary: true });
  const dir2 = makeDirection({ id: 'd2', name: 'direction_2', alias: 'window side', camera_height: 'eye_level', camera_distance: 'medium' });
  const dir3 = makeDirection({ id: 'd3', name: 'direction_3', alias: 'high shelf', camera_height: 'high_angle', camera_distance: 'wide' });

  it('should return assigned direction when camera_direction_id matches', () => {
    const shot = makeShotData({ camera_direction_id: 'd2' });
    const result = matchShotToLocationView(shot, [dir1, dir2, dir3]);
    expect(result?.id).toBe('d2');
  });

  it('should match by alias keyword in action text', () => {
    const shot = makeShotData({ action: 'She turns toward the stove and reaches for a pot', camera: 'MS - eye level static' });
    const result = matchShotToLocationView(shot, [dir1, dir2, dir3]);
    expect(result?.id).toBe('d1');
  });

  it('should match by camera height when alias does not match', () => {
    const shot = makeShotData({ action: 'He looks around', camera: 'WS - high angle crane down', camera_height: 'high_angle', camera_distance: 'wide' });
    const result = matchShotToLocationView(shot, [dir1, dir2, dir3]);
    expect(result?.id).toBe('d3');
  });

  it('should fall back to is_primary direction when score is 0', () => {
    const shot = makeShotData({ action: 'silent', camera: 'ECU - ground level static', camera_height: 'ground_level', camera_distance: 'close' });
    const result = matchShotToLocationView(shot, [dir1, dir2, dir3]);
    expect(result?.id).toBe('d1'); // dir1 is is_primary
  });

  it('should return undefined for empty directions list', () => {
    const shot = makeShotData({});
    const result = matchShotToLocationView(shot, []);
    expect(result).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 3.7 Phase F: buildLocationDeltaDescription
// ---------------------------------------------------------------------------

describe('buildLocationDeltaDescription', () => {
  it('should return undefined when height and distance match', () => {
    const view = makeDirection({ id: 'd1', camera_height: 'eye_level', camera_distance: 'wide' });
    const shot = makeShotData({ camera_height: 'eye_level', camera_distance: 'wide' });
    const result = buildLocationDeltaDescription(view, shot, 'Kitchen');
    expect(result).toBeUndefined();
  });

  it('should describe height delta when height differs', () => {
    const view = makeDirection({ id: 'd1', camera_height: 'eye_level', camera_distance: 'wide', alias: 'stove wall' });
    const shot = makeShotData({ camera_height: 'high_angle', camera_distance: 'wide' });
    const result = buildLocationDeltaDescription(view, shot, 'Kitchen');
    expect(result).toContain('HIGH ANGLE');
    expect(result).toContain('Kitchen');
  });

  it('should describe distance delta when distance differs', () => {
    const view = makeDirection({ id: 'd1', camera_height: 'eye_level', camera_distance: 'wide' });
    const shot = makeShotData({ camera_height: 'eye_level', camera_distance: 'close' });
    const result = buildLocationDeltaDescription(view, shot, 'Kitchen');
    expect(result).toContain('CLOSE-UP');
  });
});

// ---------------------------------------------------------------------------
// 3.7 Phase F: enrichAssetsWithAngleMatch — location views
// ---------------------------------------------------------------------------

describe('enrichAssetsWithAngleMatch — location views', () => {
  it('should attach matched_direction_view and establishing_view to location assets', () => {
    const estView: LocationViewData = makeDirection({ id: 'est', name: 'establishing', view_type: 'establishing', camera_height: 'overhead', image_key_url: 'https://img/est.png' });
    const dir1View: LocationViewData = makeDirection({ id: 'd1', name: 'direction_1', alias: 'stove', camera_height: 'eye_level', is_primary: true, image_key_url: 'https://img/d1.png' });

    const locationAsset = makeAsset({
      id: 'kitchen',
      project_asset: { id: 'pa-kitchen', name: 'Kitchen', asset_type: 'location' },
      location_views: [estView, dir1View],
    });

    const shot = makeShotData({ camera: 'MS - eye level static' });
    const result = enrichAssetsWithAngleMatch([locationAsset], 'MS - eye level static', shot);

    expect(result[0].matched_direction_view?.id).toBe('d1');
    expect(result[0].establishing_view?.id).toBe('est');
  });

  it('should still handle character angle matching', () => {
    const charAsset = makeAsset({
      id: 'hero',
      project_asset: { id: 'pa-hero', name: 'Hero', asset_type: 'character' },
      angle_variants: [
        { angle_type: 'front', image_url: 'https://img/front.png', status: 'completed' },
        { angle_type: 'side', image_url: 'https://img/side.png', status: 'completed' },
      ],
    });

    const result = enrichAssetsWithAngleMatch([charAsset], 'MS - profile view static');
    expect(result[0].matched_angle_url).toBe('https://img/side.png');
  });
});

// ---------------------------------------------------------------------------
// 3.7 Phase F: buildNumberedImageManifest — location 2-ref pattern
// ---------------------------------------------------------------------------

describe('buildNumberedImageManifest — location views', () => {
  it('should include 2 location refs (direction + establishing) with role: style', () => {
    const estView: LocationViewData = makeDirection({ id: 'est', name: 'establishing', view_type: 'establishing', camera_height: 'overhead', image_key_url: 'https://img/est.png' });
    const dirView: LocationViewData = makeDirection({ id: 'd1', name: 'direction_1', alias: 'stove wall', is_primary: true, image_key_url: 'https://img/d1.png', description: 'Kitchen from the stove side' });

    const locationAsset = makeAsset({
      id: 'kitchen',
      project_asset: { id: 'pa-kitchen', name: 'Kitchen', asset_type: 'location' },
      matched_direction_view: dirView,
      establishing_view: estView,
    });

    const { manifest, imageOrder } = buildNumberedImageManifest([locationAsset]);
    expect(imageOrder).toHaveLength(2);
    expect(imageOrder[0].role).toBe('style');
    expect(imageOrder[0].url).toBe('https://img/d1.png');
    expect(imageOrder[1].role).toBe('style');
    expect(imageOrder[1].url).toBe('https://img/est.png');
    expect(manifest).toContain('MAIN REFERENCE');
    expect(manifest).toContain('SPATIAL CONTEXT');
  });

  it('should fall back to master image when no direction or establishing has images', () => {
    const dirView: LocationViewData = makeDirection({ id: 'd1', name: 'direction_1', is_primary: true }); // no image_key_url

    const locationAsset = makeAsset({
      id: 'kitchen',
      project_asset: { id: 'pa-kitchen', name: 'Kitchen', asset_type: 'location' },
      matched_direction_view: dirView,
      image_key_url: 'https://img/master.png',
    });

    const { imageOrder } = buildNumberedImageManifest([locationAsset]);
    expect(imageOrder).toHaveLength(1);
    expect(imageOrder[0].role).toBe('style');
    expect(imageOrder[0].url).toBe('https://img/master.png');
  });

  it('should include delta description in manifest when angle is imperfect', () => {
    const dirView: LocationViewData = makeDirection({ id: 'd1', name: 'direction_1', alias: 'stove wall', camera_height: 'eye_level', is_primary: true, image_key_url: 'https://img/d1.png' });

    const locationAsset = makeAsset({
      id: 'kitchen',
      project_asset: { id: 'pa-kitchen', name: 'Kitchen', asset_type: 'location' },
      matched_direction_view: dirView,
      location_delta_description: 'Frame this shot from a HIGH ANGLE perspective.',
    });

    const { manifest } = buildNumberedImageManifest([locationAsset]);
    expect(manifest).toContain('DELTA');
    expect(manifest).toContain('HIGH ANGLE');
  });

  it('should set role: identity for character and prop assets', () => {
    const charAsset = makeAsset({
      id: 'alice',
      project_asset: { id: 'pa-alice', name: 'Alice', asset_type: 'character' },
    });
    const propAsset = makeAsset({
      id: 'cup',
      project_asset: { id: 'pa-cup', name: 'Cup', asset_type: 'prop' },
    });

    const { imageOrder } = buildNumberedImageManifest([charAsset, propAsset]);
    expect(imageOrder[0].role).toBe('identity');
    expect(imageOrder[1].role).toBe('identity');
  });
});
