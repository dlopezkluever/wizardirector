import { describe, expect, it } from '@jest/globals';
import { continuityCompositionService, type ContinuityBaseCandidate } from '../services/continuityCompositionService.js';
import type { SceneAssetInstanceData, ShotData } from '../services/promptGenerationService.js';

const locationAsset: SceneAssetInstanceData = {
  id: 'scene-location-1',
  project_asset: {
    id: 'location-1',
    name: 'Kitchen',
    asset_type: 'location',
    description: 'A practical family kitchen.',
    image_key_url: 'https://img.test/kitchen-master.png',
  },
  effective_description: 'A practical family kitchen with white tile and a window over the sink.',
  status_tags: [],
  image_key_url: 'https://img.test/kitchen-scene.png',
  location_views: [
    {
      id: 'view-1',
      name: 'direction_1',
      alias: 'sink wall',
      description: 'Kitchen seen from the island toward the sink wall.',
      view_type: 'direction',
      camera_distance: 'medium',
      camera_height: 'eye_level',
      image_key_url: 'https://img.test/kitchen-direction.png',
      is_primary: true,
      source: 'user',
    },
  ],
};

const shot: ShotData = {
  id: 'shot-2',
  shot_id: '2',
  shot_order: 2,
  duration: 6,
  dialogue: '',
  action: 'Mara turns toward the counter.',
  characters_foreground: [],
  characters_background: [],
  setting: 'Kitchen',
  camera: 'medium shot, eye-level, static',
  continuity_flags: [],
  camera_direction_id: 'view-1',
  location_asset_id: 'location-1',
  location_match_confidence: 0.98,
  location_match_source: 'manual',
  start_continuity: 'none',
};

const continuityBase: ContinuityBaseCandidate = {
  frameId: 'frame-1',
  sourceShotId: 'shot-1',
  sourceShotLabel: '1',
  imageUrl: 'https://img.test/shot-1-start.png',
  sameLocation: true,
  sameDirection: true,
  suitability: 'strong',
  confidence: 0.97,
  reason: 'Same canonical location and same camera direction.',
  sourceSceneId: 'scene-1',
  sourceSceneNumber: 1,
  status: 'approved',
  approvedAt: '2026-05-04T00:00:00.000Z',
  generatedAt: '2026-05-04T00:00:00.000Z',
};

describe('continuityCompositionService Phase 5 reuse base support', () => {
  it('places a selected continuity base first and marks the package as reuse/edit', () => {
    const pkg = continuityCompositionService.buildGenerationPackage({
      shot,
      sceneAssets: [locationAsset],
      continuityBase,
      continuityBaseCandidates: [continuityBase],
    });

    expect(pkg.preview.generationMode).toBe('reuse_edit');
    expect(pkg.preview.continuityBase?.frameId).toBe('frame-1');
    expect(pkg.continuityBaseCandidates).toHaveLength(1);
    expect(pkg.startFrameReferenceManifest[0]).toMatchObject({
      role: 'continuity_base_frame',
      assetType: 'continuity',
      url: 'https://img.test/shot-1-start.png',
    });
    expect(pkg.providerReadyReferences[0]).toMatchObject({
      role: 'identity',
      manifestEntryId: 'continuity-base-frame-1',
    });
    expect(pkg.persistedStartFrameManifest[0]).toMatchObject({
      referenceRole: 'continuity_base_frame',
      type: 'continuity',
    });
  });
});
