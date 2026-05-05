import { describe, expect, it, beforeEach, jest } from '@jest/globals';

const mockFrom = jest.fn<(...args: unknown[]) => unknown>();
const mockGetUser = jest.fn<() => Promise<unknown>>();

jest.mock('../config/supabase.js', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    auth: {
      getUser: () => mockGetUser(),
    },
  },
}));

import request from 'supertest';
import { app } from '../server.js';

type MethodCall = { method: string; args: unknown[] };

function mockChain(
  finalResult: { data?: unknown; error?: { message: string } | null },
  calls?: MethodCall[]
) {
  const proxy: any = new Proxy({}, {
    get(_target, prop) {
      if (prop === 'then') {
        return (resolve: (value: unknown) => void) => resolve(finalResult);
      }
      return (...args: unknown[]) => {
        calls?.push({ method: String(prop), args });
        return proxy;
      };
    },
  });
  return proxy;
}

describe('shot location resolver route integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'test@example.com' } },
      error: null,
    });
  });

  it('resolves and persists location fields when shot setting changes', async () => {
    const shotUpdateCalls: MethodCall[] = [];

    mockFrom
      .mockReturnValueOnce(mockChain({ data: { id: 'project-1', active_branch_id: 'branch-1' }, error: null }))
      .mockReturnValueOnce(mockChain({ data: { id: 'scene-1', expected_location: 'Kitchen' }, error: null }))
      .mockReturnValueOnce(mockChain({
        data: {
          id: 'shot-1',
          setting: 'Old setting',
          camera_direction_id: null,
          location_match_source: null,
        },
        error: null,
      }))
      .mockReturnValueOnce(mockChain({
        data: [
          {
            id: 'loc-kitchen',
            name: 'Kitchen',
            description: 'A warm kitchen',
            location_aliases: [],
          },
        ],
        error: null,
      }))
      .mockReturnValueOnce(mockChain({ data: [], error: null }))
      .mockReturnValueOnce(mockChain({
        data: {
          id: 'shot-1',
          scene_id: 'scene-1',
          shot_id: '1A',
          setting: 'Kitchen, warm practical light',
          camera_direction_id: null,
          location_asset_id: 'loc-kitchen',
          location_match_confidence: 0.88,
          location_match_source: 'resolver_exact',
          location_match_notes: 'matched',
        },
        error: null,
      }, shotUpdateCalls))
      .mockReturnValueOnce(mockChain({ data: null, error: null }))
      .mockReturnValueOnce(mockChain({
        data: [
          {
            id: 'loc-kitchen',
            name: 'Kitchen',
            description: 'A warm kitchen',
            location_aliases: [],
          },
        ],
        error: null,
      }))
      .mockReturnValueOnce(mockChain({ data: [], error: null }));

    const response = await request(app)
      .put('/api/projects/project-1/scenes/scene-1/shots/shot-1')
      .set('Authorization', 'Bearer test-token')
      .send({ setting: 'Kitchen, warm practical light' });

    expect(response.status).toBe(200);

    const updateCall = shotUpdateCalls.find(call => call.method === 'update');
    expect(updateCall).toBeDefined();
    expect(updateCall?.args[0]).toEqual(expect.objectContaining({
      setting: 'Kitchen, warm practical light',
      location_asset_id: 'loc-kitchen',
      location_match_source: 'resolver_exact',
    }));
  });

  it('stores explicit manual location assignments', async () => {
    const shotUpdateCalls: MethodCall[] = [];

    mockFrom
      .mockReturnValueOnce(mockChain({ data: { id: 'project-1', active_branch_id: 'branch-1' }, error: null }))
      .mockReturnValueOnce(mockChain({ data: { id: 'scene-1', expected_location: 'Kitchen' }, error: null }))
      .mockReturnValueOnce(mockChain({ data: { id: 'loc-kitchen', name: 'Kitchen' }, error: null }))
      .mockReturnValueOnce(mockChain({
        data: {
          id: 'shot-1',
          scene_id: 'scene-1',
          shot_id: '1A',
          setting: 'Kitchen',
          camera_direction_id: null,
          location_asset_id: 'loc-kitchen',
          location_match_confidence: 1,
          location_match_source: 'manual',
          location_match_notes: 'Manual assignment to "Kitchen".',
        },
        error: null,
      }, shotUpdateCalls))
      .mockReturnValueOnce(mockChain({
        data: [
          { id: 'loc-kitchen', name: 'Kitchen', description: 'A warm kitchen', location_aliases: [] },
        ],
        error: null,
      }))
      .mockReturnValueOnce(mockChain({ data: [], error: null }));

    const response = await request(app)
      .put('/api/projects/project-1/scenes/scene-1/shots/shot-1/location')
      .set('Authorization', 'Bearer test-token')
      .send({ locationAssetId: 'loc-kitchen' });

    expect(response.status).toBe(200);
    expect(response.body.shot.locationState.state).toBe('resolved');
    expect(response.body.shot.locationState.source).toBe('manual');

    const updateCall = shotUpdateCalls.find(call => call.method === 'update');
    expect(updateCall?.args[0]).toEqual(expect.objectContaining({
      location_asset_id: 'loc-kitchen',
      location_match_confidence: 1,
      location_match_source: 'manual',
    }));
  });

  it('batch-applies resolver suggestions while preserving manual assignments', async () => {
    const shotUpdateCalls: MethodCall[] = [];

    mockFrom
      .mockReturnValueOnce(mockChain({ data: { id: 'project-1', active_branch_id: 'branch-1' }, error: null }))
      .mockReturnValueOnce(mockChain({ data: { id: 'scene-1', expected_location: 'Kitchen' }, error: null }))
      .mockReturnValueOnce(mockChain({
        data: [
          {
            id: 'shot-1',
            scene_id: 'scene-1',
            shot_id: '1A',
            setting: 'Kitchen table',
            camera_direction_id: null,
            location_asset_id: null,
            location_match_source: null,
          },
          {
            id: 'shot-2',
            scene_id: 'scene-1',
            shot_id: '1B',
            setting: 'Kitchen sink',
            camera_direction_id: null,
            location_asset_id: 'loc-kitchen',
            location_match_source: 'manual',
          },
        ],
        error: null,
      }))
      .mockReturnValueOnce(mockChain({
        data: [
          { id: 'loc-kitchen', name: 'Kitchen', description: 'A warm kitchen', location_aliases: [] },
        ],
        error: null,
      }))
      .mockReturnValueOnce(mockChain({ data: [], error: null }))
      .mockReturnValueOnce(mockChain({
        data: {
          id: 'shot-1',
          scene_id: 'scene-1',
          shot_id: '1A',
          setting: 'Kitchen table',
          camera_direction_id: null,
          location_asset_id: 'loc-kitchen',
          location_match_confidence: 0.88,
          location_match_source: 'resolver_exact',
          location_match_notes: 'matched',
        },
        error: null,
      }, shotUpdateCalls))
      .mockReturnValueOnce(mockChain({ data: null, error: null }));

    const response = await request(app)
      .post('/api/projects/project-1/scenes/scene-1/shots/resolve-locations')
      .set('Authorization', 'Bearer test-token')
      .send({ apply: true, preserveManual: true });

    expect(response.status).toBe(200);
    expect(response.body.appliedCount).toBe(1);
    expect(response.body.shots[0].location_asset_id).toBe('loc-kitchen');
    expect(response.body.shots[1].location_match_source).toBe('manual');

    const updateCall = shotUpdateCalls.find(call => call.method === 'update');
    expect(updateCall?.args[0]).toEqual(expect.objectContaining({
      location_asset_id: 'loc-kitchen',
      location_match_source: 'resolver_exact',
    }));
  });

  it('returns canonical Stage 8 location coverage from the server', async () => {
    mockFrom
      .mockReturnValueOnce(mockChain({ data: { id: 'project-1', active_branch_id: 'branch-1' }, error: null }))
      .mockReturnValueOnce(mockChain({ data: { id: 'scene-1' }, error: null }))
      .mockReturnValueOnce(mockChain({
        data: [
          {
            id: 'shot-1',
            shot_id: '1A',
            setting: 'Kitchen table',
            camera: 'Wide',
            camera_direction_id: 'view-kitchen-primary',
            location_asset_id: 'loc-kitchen',
          },
          {
            id: 'shot-2',
            shot_id: '1B',
            setting: 'Kitchen counter',
            camera: 'Close',
            camera_direction_id: null,
            location_asset_id: 'loc-kitchen',
          },
        ],
        error: null,
      }))
      .mockReturnValueOnce(mockChain({
        data: [
          { project_asset_id: 'loc-kitchen', image_key_url: null },
        ],
        error: null,
      }))
      .mockReturnValueOnce(mockChain({
        data: [
          { id: 'loc-kitchen', name: 'Kitchen', image_key_url: 'https://example.com/kitchen.png' },
          { id: 'loc-office', name: 'Office', image_key_url: 'https://example.com/office.png' },
        ],
        error: null,
      }))
      .mockReturnValueOnce(mockChain({
        data: [
          {
            id: 'view-kitchen-primary',
            project_asset_id: 'loc-kitchen',
            name: 'direction_1',
            alias: 'sink wall',
            view_type: 'direction',
            camera_distance: 'wide',
            camera_height: 'eye_level',
            image_key_url: 'https://example.com/sink.png',
            is_primary: true,
            source: 'user',
            sort_order: 0,
            created_at: '2026-05-04T00:00:00Z',
          },
        ],
        error: null,
      }));

    const response = await request(app)
      .get('/api/projects/project-1/scenes/scene-1/location-coverage?mode=advanced')
      .set('Authorization', 'Bearer test-token');

    expect(response.status).toBe(200);
    expect(response.body.continuityMode).toBe('advanced');
    expect(response.body.locations).toHaveLength(1);
    expect(response.body.locations[0].location.id).toBe('loc-kitchen');
    expect(response.body.locations[0].matchedDirectionShots).toBe(1);
    expect(response.body.locations[0].fallbackShots).toBe(1);
    expect(response.body.locations[0].shots[1].severity).toBe('warning');
  });

  it('assigns camera direction through the Stage 8 repair endpoint', async () => {
    const shotUpdateCalls: MethodCall[] = [];

    mockFrom
      .mockReturnValueOnce(mockChain({ data: { id: 'project-1', active_branch_id: 'branch-1' }, error: null }))
      .mockReturnValueOnce(mockChain({ data: { id: 'scene-1', expected_location: 'Kitchen' }, error: null }))
      .mockReturnValueOnce(mockChain({
        data: {
          id: 'shot-1',
          setting: 'Kitchen table',
          camera_direction_id: null,
          location_asset_id: null,
          location_match_source: null,
        },
        error: null,
      }))
      .mockReturnValueOnce(mockChain({
        data: {
          id: 'view-kitchen-primary',
          project_asset_id: 'loc-kitchen',
          name: 'direction_1',
          view_type: 'direction',
        },
        error: null,
      }))
      .mockReturnValueOnce(mockChain({
        data: {
          id: 'loc-kitchen',
          name: 'Kitchen',
        },
        error: null,
      }))
      .mockReturnValueOnce(mockChain({
        data: {
          id: 'shot-1',
          scene_id: 'scene-1',
          shot_id: '1A',
          setting: 'Kitchen table',
          camera_direction_id: 'view-kitchen-primary',
          location_asset_id: 'loc-kitchen',
          location_match_confidence: 1,
          location_match_source: 'camera_direction_parent',
          location_match_notes: 'Camera direction "direction_1" belongs to "Kitchen".',
        },
        error: null,
      }, shotUpdateCalls))
      .mockReturnValueOnce(mockChain({
        data: [
          { id: 'loc-kitchen', name: 'Kitchen', description: 'A warm kitchen', location_aliases: [] },
        ],
        error: null,
      }))
      .mockReturnValueOnce(mockChain({
        data: [
          { id: 'view-kitchen-primary', project_asset_id: 'loc-kitchen' },
        ],
        error: null,
      }));

    const response = await request(app)
      .put('/api/projects/project-1/scenes/scene-1/shots/shot-1/camera-direction')
      .set('Authorization', 'Bearer test-token')
      .send({ cameraDirectionId: 'view-kitchen-primary' });

    expect(response.status).toBe(200);
    expect(response.body.shot.camera_direction_id).toBe('view-kitchen-primary');
    expect(response.body.shot.location_asset_id).toBe('loc-kitchen');

    const updateCall = shotUpdateCalls.find(call => call.method === 'update');
    expect(updateCall?.args[0]).toEqual(expect.objectContaining({
      camera_direction_id: 'view-kitchen-primary',
      location_asset_id: 'loc-kitchen',
      location_match_source: 'camera_direction_parent',
    }));
  });
});
