import { beforeEach, describe, expect, it, jest } from '@jest/globals';

// frameGenerationService touches supabase for shot/frame lookups in
// fetchShotReferenceImageContext; stub it so the parity tests below can
// drive exact row shapes without a live database.
const mockFrom = jest.fn<(...args: unknown[]) => unknown>();
jest.mock('../config/supabase.js', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import { continuityCompositionService, type ContinuityBaseCandidate } from '../services/continuityCompositionService.js';
import { frameGenerationService } from '../services/frameGenerationService.js';
import type { ReferenceImageOrderEntry, SceneAssetInstanceData, ShotData } from '../services/promptGenerationService.js';

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

// ---------------------------------------------------------------------------
// Preview/generation parity — 5-3 "Risk 6": whatever Stage 9 previews as the
// persisted start-frame manifest must be exactly what Stage 10 generation
// (frameGenerationService.fetchShotReferenceImageContext) sends to the
// provider, in the same url + role sequence.
// ---------------------------------------------------------------------------

function toRoleSequence(entries: ReferenceImageOrderEntry[]): Array<{ url: string; role: 'identity' | 'style' }> {
  return entries.map(entry => ({
    url: entry.url,
    role: entry.role === 'style' ? 'style' : 'identity',
  }));
}

function mockShotAndBaseFrame(options: {
  shotId: string;
  persistedOrder: ReferenceImageOrderEntry[];
  locationAssetId: string | null;
  cameraDirectionId: string | null;
  selectedBaseFrameId: string | null;
  baseFrame?: {
    id: string;
    image_url: string | null;
    status: string;
    sourceShotId: string;
    sourceShotLabel: string;
    sourceLocationAssetId: string | null;
    sourceCameraDirectionId: string | null;
  } | null;
}) {
  mockFrom.mockImplementation(((table: string) => {
    const proxy: any = new Proxy({}, {
      get(_target, prop) {
        if (prop === 'then') {
          return (resolve: (v: unknown) => void) => {
            if (table === 'shots') {
              resolve({
                data: {
                  reference_image_order: options.persistedOrder,
                  selected_continuity_base_frame_id: options.selectedBaseFrameId,
                  location_asset_id: options.locationAssetId,
                  camera_direction_id: options.cameraDirectionId,
                },
                error: null,
              });
              return;
            }
            if (table === 'frames') {
              const base = options.baseFrame;
              resolve({
                data: base
                  ? {
                      id: base.id,
                      image_url: base.image_url,
                      status: base.status,
                      shots: {
                        id: base.sourceShotId,
                        shot_id: base.sourceShotLabel,
                        location_asset_id: base.sourceLocationAssetId,
                        camera_direction_id: base.sourceCameraDirectionId,
                      },
                    }
                  : null,
                error: null,
              });
              return;
            }
            resolve({ data: null, error: null });
          };
        }
        return (..._args: unknown[]) => proxy;
      },
    });
    return proxy;
  }) as any);
}

describe('preview/generation parity (Stage 9 preview vs Stage 10 generation)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('matches url+role sequence when the base has the same camera direction', async () => {
    const pkg = continuityCompositionService.buildGenerationPackage({
      shot,
      sceneAssets: [locationAsset],
      continuityBase,
      continuityBaseCandidates: [continuityBase],
    });

    mockShotAndBaseFrame({
      shotId: shot.id,
      persistedOrder: pkg.persistedStartFrameManifest,
      locationAssetId: shot.location_asset_id!,
      cameraDirectionId: shot.camera_direction_id!,
      selectedBaseFrameId: continuityBase.frameId,
      baseFrame: {
        id: continuityBase.frameId,
        image_url: continuityBase.imageUrl,
        status: 'approved',
        sourceShotId: continuityBase.sourceShotId,
        sourceShotLabel: continuityBase.sourceShotLabel,
        sourceLocationAssetId: shot.location_asset_id!,
        sourceCameraDirectionId: shot.camera_direction_id!,
      },
    });

    const context = await (frameGenerationService as any).fetchShotReferenceImageContext(shot.id);

    expect(context.references).toEqual(toRoleSequence(pkg.persistedStartFrameManifest));
    expect(context.continuityBaseRole).toBe('reuse_match');
  });

  it('matches url+role sequence when the base has a different camera direction', async () => {
    const mismatchedBase: ContinuityBaseCandidate = { ...continuityBase, sameDirection: false };
    const pkg = continuityCompositionService.buildGenerationPackage({
      shot,
      sceneAssets: [locationAsset],
      continuityBase: mismatchedBase,
      continuityBaseCandidates: [mismatchedBase],
    });

    mockShotAndBaseFrame({
      shotId: shot.id,
      persistedOrder: pkg.persistedStartFrameManifest,
      locationAssetId: shot.location_asset_id!,
      cameraDirectionId: shot.camera_direction_id!,
      selectedBaseFrameId: mismatchedBase.frameId,
      baseFrame: {
        id: mismatchedBase.frameId,
        image_url: mismatchedBase.imageUrl,
        status: 'approved',
        sourceShotId: mismatchedBase.sourceShotId,
        sourceShotLabel: mismatchedBase.sourceShotLabel,
        sourceLocationAssetId: shot.location_asset_id!,
        // Different camera direction id than the shot -> reuse_edit path
        sourceCameraDirectionId: 'view-other',
      },
    });

    const context = await (frameGenerationService as any).fetchShotReferenceImageContext(shot.id);

    expect(context.references).toEqual(toRoleSequence(pkg.persistedStartFrameManifest));
    expect(context.continuityBaseRole).toBe('reuse_edit');
  });

  it('matches url+role sequence with no base selected (fallback chain only)', async () => {
    const pkg = continuityCompositionService.buildGenerationPackage({
      shot,
      sceneAssets: [locationAsset],
    });

    mockShotAndBaseFrame({
      shotId: shot.id,
      persistedOrder: pkg.persistedStartFrameManifest,
      locationAssetId: shot.location_asset_id!,
      cameraDirectionId: shot.camera_direction_id!,
      selectedBaseFrameId: null,
    });

    const context = await (frameGenerationService as any).fetchShotReferenceImageContext(shot.id);

    expect(context.references).toEqual(toRoleSequence(pkg.persistedStartFrameManifest));
    expect(context.continuityBaseFrameId).toBeNull();
  });

  it('preserves manual reference entries alongside the continuity base', async () => {
    const pkg = continuityCompositionService.buildGenerationPackage({
      shot,
      sceneAssets: [locationAsset],
      continuityBase,
      continuityBaseCandidates: [continuityBase],
    });

    const manualEntry: ReferenceImageOrderEntry = {
      id: 'manual-1',
      label: 'Image #99',
      assetName: 'Continuity note card',
      url: 'https://img.test/manual-note.png',
      type: 'manual',
      role: 'style',
      referenceRole: 'manual_reference',
      reason: 'User-attached manual reference.',
      source: 'manual_upload',
    };
    const persistedOrderWithManual = [...pkg.persistedStartFrameManifest, manualEntry];

    mockShotAndBaseFrame({
      shotId: shot.id,
      persistedOrder: persistedOrderWithManual,
      locationAssetId: shot.location_asset_id!,
      cameraDirectionId: shot.camera_direction_id!,
      selectedBaseFrameId: continuityBase.frameId,
      baseFrame: {
        id: continuityBase.frameId,
        image_url: continuityBase.imageUrl,
        status: 'approved',
        sourceShotId: continuityBase.sourceShotId,
        sourceShotLabel: continuityBase.sourceShotLabel,
        sourceLocationAssetId: shot.location_asset_id!,
        sourceCameraDirectionId: shot.camera_direction_id!,
      },
    });

    const context = await (frameGenerationService as any).fetchShotReferenceImageContext(shot.id);

    expect(context.references).toEqual(toRoleSequence(persistedOrderWithManual));
    expect(context.references).toHaveLength(pkg.persistedStartFrameManifest.length + 1);
  });
});
