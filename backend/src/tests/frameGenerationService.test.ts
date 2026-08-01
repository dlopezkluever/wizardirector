import { describe, expect, it, beforeEach, jest } from '@jest/globals';

const mockFrom = jest.fn<(...args: unknown[]) => unknown>();

jest.mock('../config/supabase.js', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import { frameGenerationService } from '../services/frameGenerationService.js';

function mockChain(finalResult: { data?: unknown; error?: { message: string } | null }) {
  const proxy: any = new Proxy({}, {
    get(_target, prop) {
      if (prop === 'then') {
        return (resolve: (value: unknown) => void) => resolve(finalResult);
      }
      return (..._args: unknown[]) => proxy;
    },
  });
  return proxy;
}

interface ShotRowOptions {
  referenceImageOrder?: unknown[];
  selectedContinuityBaseFrameId?: string | null;
  locationAssetId?: string | null;
  cameraDirectionId?: string | null;
}

interface BaseFrameRowOptions {
  id: string;
  imageUrl?: string | null;
  status?: string | null;
  sourceShotId?: string;
  sourceShotLabel?: string;
  sourceLocationAssetId?: string | null;
  sourceCameraDirectionId?: string | null;
}

function mockShotAndFrame(shotOptions: ShotRowOptions, baseFrame: BaseFrameRowOptions | null) {
  mockFrom.mockImplementation(((table: string) => {
    if (table === 'shots') {
      return mockChain({
        data: {
          reference_image_order: shotOptions.referenceImageOrder ?? [],
          selected_continuity_base_frame_id: shotOptions.selectedContinuityBaseFrameId ?? null,
          location_asset_id: shotOptions.locationAssetId ?? null,
          camera_direction_id: shotOptions.cameraDirectionId ?? null,
        },
        error: null,
      });
    }
    if (table === 'frames') {
      return mockChain({
        data: baseFrame
          ? {
              id: baseFrame.id,
              image_url: baseFrame.imageUrl === undefined ? 'https://img.test/base.png' : baseFrame.imageUrl,
              status: baseFrame.status === undefined ? 'approved' : baseFrame.status,
              shots: {
                id: baseFrame.sourceShotId ?? 'shot-source',
                shot_id: baseFrame.sourceShotLabel ?? '1',
                location_asset_id: baseFrame.sourceLocationAssetId === undefined ? null : baseFrame.sourceLocationAssetId,
                camera_direction_id: baseFrame.sourceCameraDirectionId === undefined ? null : baseFrame.sourceCameraDirectionId,
              },
            }
          : null,
        error: null,
      });
    }
    return mockChain({ data: null, error: null });
  }) as any);
}

async function fetchContext(shotId = 'shot-1') {
  return (frameGenerationService as any).fetchShotReferenceImageContext(shotId);
}

describe('frameGenerationService.fetchShotReferenceImageContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns persisted references unchanged when no base is selected', async () => {
    const refs = [{ url: 'https://img.test/loc.png', role: 'style' }];
    mockShotAndFrame({ referenceImageOrder: refs, selectedContinuityBaseFrameId: null }, null);

    const context = await fetchContext();

    expect(context.references).toEqual([{ url: 'https://img.test/loc.png', role: 'style' }]);
    expect(context.continuityBaseFrameId).toBeNull();
    expect(context.continuityBaseRole).toBeNull();
    // No frames lookup should happen when there's no selected base.
    expect(mockFrom).not.toHaveBeenCalledWith('frames');
  });

  it('degrades to persisted refs without crashing when the selected base frame no longer exists', async () => {
    const refs = [{ url: 'https://img.test/loc.png', role: 'style' }];
    mockShotAndFrame(
      { referenceImageOrder: refs, selectedContinuityBaseFrameId: 'frame-deleted' },
      null // frame row not found (e.g. deleted)
    );

    const context = await fetchContext();

    expect(context.references).toEqual(refs);
    expect(context.continuityBaseFrameId).toBeNull();
    expect(context.continuityBaseShotLabel).toBeNull();
    expect(context.continuityBaseReason).toBeNull();
    expect(context.continuityBaseRole).toBeNull();
  });

  it('degrades to persisted refs when the selected base frame is rejected', async () => {
    const refs = [{ url: 'https://img.test/loc.png', role: 'style' }];
    mockShotAndFrame(
      { referenceImageOrder: refs, selectedContinuityBaseFrameId: 'frame-1' },
      { id: 'frame-1', imageUrl: 'https://img.test/base.png', status: 'rejected' }
    );

    const context = await fetchContext();

    expect(context.references).toEqual(refs);
    expect(context.continuityBaseFrameId).toBeNull();
  });

  it('degrades to persisted refs when the selected base frame has no image url', async () => {
    const refs = [{ url: 'https://img.test/loc.png', role: 'style' }];
    mockShotAndFrame(
      { referenceImageOrder: refs, selectedContinuityBaseFrameId: 'frame-1' },
      { id: 'frame-1', imageUrl: null, status: 'approved' }
    );

    const context = await fetchContext();

    expect(context.references).toEqual(refs);
    expect(context.continuityBaseFrameId).toBeNull();
  });

  it('prepends the base image when its url is not already in the persisted refs', async () => {
    const refs = [{ url: 'https://img.test/loc.png', role: 'style' }];
    mockShotAndFrame(
      {
        referenceImageOrder: refs,
        selectedContinuityBaseFrameId: 'frame-1',
        locationAssetId: 'loc-1',
        cameraDirectionId: 'dir-A',
      },
      {
        id: 'frame-1',
        imageUrl: 'https://img.test/base.png',
        status: 'approved',
        sourceShotId: 'shot-0',
        sourceShotLabel: '1',
        sourceLocationAssetId: 'loc-1',
        sourceCameraDirectionId: 'dir-A',
      }
    );

    const context = await fetchContext();

    expect(context.references).toEqual([
      { url: 'https://img.test/base.png', role: 'identity' },
      { url: 'https://img.test/loc.png', role: 'style' },
    ]);
    expect(context.continuityBaseFrameId).toBe('frame-1');
    expect(context.continuityBaseRole).toBe('reuse_match');
  });

  it('does not duplicate the base image when its url is already present in the persisted refs', async () => {
    const refs = [
      { url: 'https://img.test/base.png', role: 'identity', referenceRole: 'continuity_base_frame' },
      { url: 'https://img.test/loc.png', role: 'style' },
    ];
    mockShotAndFrame(
      {
        referenceImageOrder: refs,
        selectedContinuityBaseFrameId: 'frame-1',
        locationAssetId: 'loc-1',
        cameraDirectionId: 'dir-A',
      },
      {
        id: 'frame-1',
        imageUrl: 'https://img.test/base.png',
        status: 'approved',
        sourceShotId: 'shot-0',
        sourceShotLabel: '1',
        sourceLocationAssetId: 'loc-1',
        sourceCameraDirectionId: 'dir-A',
      }
    );

    const context = await fetchContext();

    expect(context.references).toHaveLength(2);
    expect(context.references[0]).toEqual({ url: 'https://img.test/base.png', role: 'identity' });
  });

  it('reports reuse_edit when the base has a different camera direction than the shot', async () => {
    mockShotAndFrame(
      {
        referenceImageOrder: [],
        selectedContinuityBaseFrameId: 'frame-1',
        locationAssetId: 'loc-1',
        cameraDirectionId: 'dir-A',
      },
      {
        id: 'frame-1',
        imageUrl: 'https://img.test/base.png',
        status: 'generated',
        sourceShotId: 'shot-0',
        sourceShotLabel: '1',
        sourceLocationAssetId: 'loc-1',
        sourceCameraDirectionId: 'dir-B',
      }
    );

    const context = await fetchContext();

    expect(context.continuityBaseRole).toBe('reuse_edit');
    expect(context.continuityBaseReason).toMatch(/adapt framing/i);
  });

  it('flags a location mismatch in the reason when the base comes from a different location', async () => {
    mockShotAndFrame(
      {
        referenceImageOrder: [],
        selectedContinuityBaseFrameId: 'frame-1',
        locationAssetId: 'loc-1',
        cameraDirectionId: 'dir-A',
      },
      {
        id: 'frame-1',
        imageUrl: 'https://img.test/base.png',
        status: 'approved',
        sourceShotId: 'shot-0',
        sourceShotLabel: '1',
        sourceLocationAssetId: 'loc-other',
        sourceCameraDirectionId: 'dir-A',
      }
    );

    const context = await fetchContext();

    expect(context.continuityBaseReason).toMatch(/verify the location still matches/i);
  });
});
