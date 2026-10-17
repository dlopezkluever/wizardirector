import { describe, expect, it } from '@jest/globals';
import {
  DEFAULT_LOCATION_AUTO_APPLY_CONFIDENCE,
  LocationResolverService,
  normalizeLocationText,
  tokenizeLocationText,
  type LocationResolverContext,
} from '../services/locationResolverService.js';

function makeContext(): LocationResolverContext {
  return {
    branchId: 'branch-1',
    locationAssets: [
      {
        id: 'loc-kitchen',
        name: 'Kitchen',
        location_aliases: ['stove wall', 'breakfast nook'],
      },
      {
        id: 'loc-office',
        name: 'Office',
        location_aliases: ['study'],
      },
    ],
    cameraDirectionParents: new Map([
      [
        'view-kitchen-window',
        {
          cameraDirectionId: 'view-kitchen-window',
          locationAssetId: 'loc-kitchen',
          locationName: 'Kitchen',
        },
      ],
    ]),
  };
}

describe('locationResolverService', () => {
  const service = new LocationResolverService();

  it('normalizes screenplay location headings', () => {
    expect(normalizeLocationText('INT. Kitchen - NIGHT')).toBe('kitchen');
    expect(tokenizeLocationText('EXT. Old Office, morning')).toEqual(['old', 'office']);
  });

  it('resolves exact location names from shot setting', () => {
    const result = service.resolveShotLocation(
      { setting: 'Kitchen, warm practical light' },
      makeContext()
    );

    expect(result.locationAssetId).toBe('loc-kitchen');
    expect(result.source).toBe('resolver_exact');
    expect(result.confidence).toBeGreaterThanOrEqual(DEFAULT_LOCATION_AUTO_APPLY_CONFIDENCE);
    expect(result.isAmbiguous).toBe(false);
    expect(service.shouldApplyResolution(result)).toBe(true);
  });

  it('resolves location aliases', () => {
    const result = service.resolveShotLocation(
      { setting: 'Close on the breakfast nook table' },
      makeContext()
    );

    expect(result.locationAssetId).toBe('loc-kitchen');
    expect(result.source).toBe('resolver_alias');
    expect(result.reason).toContain('breakfast nook');
  });

  it('uses camera direction parent mapping before text matching', () => {
    const result = service.resolveShotLocation(
      { setting: 'Office', cameraDirectionId: 'view-kitchen-window' },
      makeContext()
    );

    expect(result.locationAssetId).toBe('loc-kitchen');
    expect(result.source).toBe('camera_direction_parent');
    expect(result.confidence).toBe(1);
  });

  it('keeps ambiguous matches reviewable instead of auto-applying', () => {
    const context: LocationResolverContext = {
      branchId: 'branch-1',
      locationAssets: [
        { id: 'loc-kitchen-a', name: 'Kitchen' },
        { id: 'loc-kitchen-b', name: 'Kitchen' },
      ],
      cameraDirectionParents: new Map(),
    };

    const result = service.resolveShotLocation({ setting: 'Kitchen' }, context);
    const patch = service.toShotLocationPatch(result);

    expect(result.isAmbiguous).toBe(true);
    expect(service.shouldApplyResolution(result)).toBe(false);
    expect(patch.location_asset_id).toBeNull();
    expect(patch.location_match_notes).toContain('Ambiguous');
  });

  it('falls back to scene expected location when shot setting does not resolve', () => {
    const result = service.resolveShotLocation(
      {
        setting: 'A cramped corner behind the counter',
        sceneExpectedLocation: 'Kitchen',
      },
      makeContext()
    );

    expect(result.locationAssetId).toBe('loc-kitchen');
    expect(result.matchedFrom).toBe('scene_expected_location');
  });
});
