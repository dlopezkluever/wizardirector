import { describe, expect, it } from '@jest/globals';
import { LocationCoverageService, type LocationCoverageAssetInput, type LocationCoverageViewInput } from '../services/locationCoverageService.js';

const locations: LocationCoverageAssetInput[] = [
  { id: 'loc-kitchen', name: 'Kitchen', image_key_url: 'https://example.com/kitchen.png' },
  { id: 'loc-office', name: 'Office', image_key_url: 'https://example.com/office.png' },
];

const views: LocationCoverageViewInput[] = [
  {
    id: 'view-kitchen-primary',
    project_asset_id: 'loc-kitchen',
    name: 'direction_1',
    alias: 'sink wall',
    view_type: 'direction',
    image_key_url: 'https://example.com/sink.png',
    is_primary: true,
    source: 'user',
    sort_order: 0,
  },
  {
    id: 'view-office-primary',
    project_asset_id: 'loc-office',
    name: 'direction_1',
    alias: 'desk wall',
    view_type: 'direction',
    image_key_url: 'https://example.com/desk.png',
    is_primary: true,
    source: 'user',
    sort_order: 0,
  },
];

describe('locationCoverageService', () => {
  const service = new LocationCoverageService();

  it('groups shots only by canonical location_asset_id', () => {
    const coverage = service.buildCoverage({
      mode: 'basic',
      locations,
      views,
      shots: [
        {
          id: 'shot-1',
          shot_id: '1A',
          setting: 'Kitchen table',
          camera: 'Wide on the desk',
          location_asset_id: 'loc-office',
          camera_direction_id: null,
        },
      ],
    });

    const kitchen = coverage.locations.find(location => location.location.id === 'loc-kitchen');
    const office = coverage.locations.find(location => location.location.id === 'loc-office');

    expect(kitchen?.totalShots).toBe(0);
    expect(office?.totalShots).toBe(1);
    expect(office?.shots[0].coverageState).toBe('fallback_view');
  });

  it('uses stronger unresolved-direction severity in advanced mode', () => {
    const basic = service.buildCoverage({
      mode: 'basic',
      locations: [locations[0]],
      views: [views[0]],
      shots: [
        {
          id: 'shot-1',
          shot_id: '1A',
          location_asset_id: 'loc-kitchen',
          camera_direction_id: null,
        },
      ],
    });
    const advanced = service.buildCoverage({
      mode: 'advanced',
      locations: [locations[0]],
      views: [views[0]],
      shots: [
        {
          id: 'shot-1',
          shot_id: '1A',
          location_asset_id: 'loc-kitchen',
          camera_direction_id: null,
        },
      ],
    });

    expect(basic.locations[0].shots[0].severity).toBe('advisory');
    expect(basic.locations[0].strength).toBe('usable');
    expect(advanced.locations[0].shots[0].severity).toBe('warning');
    expect(advanced.locations[0].strength).toBe('weak');
  });

  it('flags assigned directions with missing images for repair', () => {
    const coverage = service.buildCoverage({
      mode: 'advanced',
      locations: [locations[0]],
      views: [
        {
          ...views[0],
          image_key_url: null,
        },
      ],
      shots: [
        {
          id: 'shot-1',
          shot_id: '1A',
          location_asset_id: 'loc-kitchen',
          camera_direction_id: 'view-kitchen-primary',
        },
      ],
    });

    expect(coverage.locations[0].shots[0].coverageState).toBe('missing_view_image');
    expect(coverage.locations[0].missingImageShots).toBe(1);
    expect(coverage.locations[0].availableRepairActions).toContain('generate_missing_view');
  });
});
