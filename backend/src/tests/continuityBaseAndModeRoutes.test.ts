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

function authAsUser1() {
  mockGetUser.mockResolvedValue({
    data: { user: { id: 'user-1', email: 'test@example.com' } },
    error: null,
  });
}

describe('continuity-base / continuity-mode / continuity-metrics routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authAsUser1();
  });

  // =========================================================================
  // PUT .../shots/:shotId/continuity-base
  // =========================================================================

  describe('PUT .../continuity-base', () => {
    const url = '/api/projects/project-1/scenes/scene-1/shots/shot-2/continuity-base';

    it('selects a valid candidate and prepends it to the reference manifest', async () => {
      const shotUpdateCalls: MethodCall[] = [];

      mockFrom
        // project ownership + active_branch_id
        .mockReturnValueOnce(mockChain({ data: { id: 'project-1', active_branch_id: 'branch-1' }, error: null }))
        // scene lookup
        .mockReturnValueOnce(mockChain({ data: { id: 'scene-1' }, error: null }))
        // shot lookup
        .mockReturnValueOnce(mockChain({
          data: { id: 'shot-2', location_asset_id: 'loc-1', camera_direction_id: 'dir-A', reference_image_order: [] },
          error: null,
        }))
        // continuityBaseService.listCandidates -> frames query
        .mockReturnValueOnce(mockChain({
          data: [
            {
              id: 'frame-1',
              image_url: 'https://img.test/frame-1.png',
              status: 'approved',
              approved_at: '2026-05-01T00:00:00.000Z',
              generated_at: '2026-05-01T00:00:00.000Z',
              shot_id: 'shot-1',
              shots: {
                id: 'shot-1',
                shot_id: '1',
                shot_order: 1,
                scene_id: 'scene-1',
                location_asset_id: 'loc-1',
                camera_direction_id: 'dir-A',
                scenes: { id: 'scene-1', scene_number: 1, branch_id: 'branch-1' },
              },
            },
          ],
          error: null,
        }))
        // final shots update
        .mockReturnValueOnce(mockChain({ data: null, error: null }, shotUpdateCalls));

      const response = await request(app)
        .put(url)
        .set('Authorization', 'Bearer test-token')
        .send({ frameId: 'frame-1' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.selectedContinuityBase.frameId).toBe('frame-1');
      expect(response.body.referenceImageOrder[0]).toMatchObject({
        id: 'continuity-base-frame-1',
        label: 'Image #1',
        referenceRole: 'continuity_base_frame',
      });

      const updateCall = shotUpdateCalls.find(c => c.method === 'update');
      expect(updateCall?.args[0]).toMatchObject({ selected_continuity_base_frame_id: 'frame-1' });
    });

    it('clears the selected base and renumbers remaining reference entries', async () => {
      const shotUpdateCalls: MethodCall[] = [];

      mockFrom
        .mockReturnValueOnce(mockChain({ data: { id: 'project-1', active_branch_id: 'branch-1' }, error: null }))
        .mockReturnValueOnce(mockChain({ data: { id: 'scene-1' }, error: null }))
        .mockReturnValueOnce(mockChain({
          data: {
            id: 'shot-2',
            location_asset_id: 'loc-1',
            camera_direction_id: 'dir-A',
            reference_image_order: [
              { id: 'continuity-base-frame-1', label: 'Image #1', assetName: 'Shot 1', url: 'https://img.test/frame-1.png', type: 'continuity', referenceRole: 'continuity_base_frame' },
              { id: 'loc-ref', label: 'Image #2', assetName: 'Kitchen', url: 'https://img.test/kitchen.png', type: 'location', referenceRole: 'location_direction_main' },
            ],
          },
          error: null,
        }))
        .mockReturnValueOnce(mockChain({ data: null, error: null }, shotUpdateCalls));

      const response = await request(app)
        .put(url)
        .set('Authorization', 'Bearer test-token')
        .send({ clear: true });

      expect(response.status).toBe(200);
      expect(response.body.selectedContinuityBase).toBeNull();
      expect(response.body.referenceImageOrder).toHaveLength(1);
      expect(response.body.referenceImageOrder[0]).toMatchObject({ id: 'loc-ref', label: 'Image #1' });

      const updateCall = shotUpdateCalls.find(c => c.method === 'update');
      expect(updateCall?.args[0]).toMatchObject({ selected_continuity_base_frame_id: null });
    });

    it('rejects a frameId that is not a valid candidate for the shot (400)', async () => {
      mockFrom
        .mockReturnValueOnce(mockChain({ data: { id: 'project-1', active_branch_id: 'branch-1' }, error: null }))
        .mockReturnValueOnce(mockChain({ data: { id: 'scene-1' }, error: null }))
        .mockReturnValueOnce(mockChain({
          data: { id: 'shot-2', location_asset_id: 'loc-1', camera_direction_id: 'dir-A', reference_image_order: [] },
          error: null,
        }))
        // listCandidates returns no rows -> pickCandidateById finds nothing
        .mockReturnValueOnce(mockChain({ data: [], error: null }));

      const response = await request(app)
        .put(url)
        .set('Authorization', 'Bearer test-token')
        .send({ frameId: 'frame-does-not-exist' });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/not a valid continuity base/);
    });

    it('returns 404 when the project is not found', async () => {
      mockFrom.mockReturnValueOnce(mockChain({ data: null, error: { message: 'not found' } }));

      const response = await request(app)
        .put(url)
        .set('Authorization', 'Bearer test-token')
        .send({ frameId: 'frame-1' });

      expect(response.status).toBe(404);
    });

    it('returns 404 when the shot is not found', async () => {
      mockFrom
        .mockReturnValueOnce(mockChain({ data: { id: 'project-1', active_branch_id: 'branch-1' }, error: null }))
        .mockReturnValueOnce(mockChain({ data: { id: 'scene-1' }, error: null }))
        .mockReturnValueOnce(mockChain({ data: null, error: { message: 'not found' } }));

      const response = await request(app)
        .put(url)
        .set('Authorization', 'Bearer test-token')
        .send({ frameId: 'frame-1' });

      expect(response.status).toBe(404);
    });
  });

  // =========================================================================
  // GET / PUT .../continuity-mode
  // =========================================================================

  describe('GET .../continuity-mode', () => {
    it('returns the stored mode', async () => {
      mockFrom.mockReturnValueOnce(mockChain({ data: { id: 'project-1', continuity_mode: 'advanced' }, error: null }));

      const response = await request(app)
        .get('/api/projects/project-1/continuity-mode')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.continuityMode).toBe('advanced');
    });

    it('defaults to basic when unset', async () => {
      mockFrom.mockReturnValueOnce(mockChain({ data: { id: 'project-1', continuity_mode: null }, error: null }));

      const response = await request(app)
        .get('/api/projects/project-1/continuity-mode')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.continuityMode).toBe('basic');
    });

    it('returns 404 when the project is not found', async () => {
      mockFrom.mockReturnValueOnce(mockChain({ data: null, error: { message: 'not found' } }));

      const response = await request(app)
        .get('/api/projects/project-1/continuity-mode')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(404);
    });
  });

  describe('PUT .../continuity-mode', () => {
    it('rejects a junk continuityMode value (400)', async () => {
      const response = await request(app)
        .put('/api/projects/project-1/continuity-mode')
        .set('Authorization', 'Bearer test-token')
        .send({ continuityMode: 'ultra' });

      expect(response.status).toBe(400);
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it('accepts basic/advanced and persists it', async () => {
      mockFrom.mockReturnValueOnce(mockChain({ data: { id: 'project-1', continuity_mode: 'advanced' }, error: null }));

      const response = await request(app)
        .put('/api/projects/project-1/continuity-mode')
        .set('Authorization', 'Bearer test-token')
        .send({ continuityMode: 'advanced' });

      expect(response.status).toBe(200);
      expect(response.body.continuityMode).toBe('advanced');
    });
  });

  // =========================================================================
  // GET .../continuity-metrics
  // =========================================================================

  describe('GET .../continuity-metrics', () => {
    const shots = [
      // 1. no canonical location -> unresolved + weak
      { id: 'shot-1', scene_id: 'scene-1', location_asset_id: null, location_match_source: null, location_match_confidence: null, camera_direction_id: null, reference_image_order: [], selected_continuity_base_frame_id: null },
      // 2. ambiguous match, no direction, no location ref -> ambiguous + direction gap + weak
      { id: 'shot-2', scene_id: 'scene-1', location_asset_id: 'loc-1', location_match_source: 'ambiguous', location_match_confidence: 0.5, camera_direction_id: null, reference_image_order: [], selected_continuity_base_frame_id: null },
      // 3. resolved, direction assigned, has a direction-main reference -> clean
      { id: 'shot-3', scene_id: 'scene-1', location_asset_id: 'loc-1', location_match_source: 'resolver_exact', location_match_confidence: 0.9, camera_direction_id: 'dir-A', reference_image_order: [{ type: 'location', referenceRole: 'location_direction_main' }], selected_continuity_base_frame_id: null },
      // 4. resolved, fallback reference -> fallbackReferenceShots
      { id: 'shot-4', scene_id: 'scene-1', location_asset_id: 'loc-1', location_match_source: 'resolver_exact', location_match_confidence: 0.85, camera_direction_id: 'dir-B', reference_image_order: [{ type: 'location', referenceRole: 'location_asset_fallback' }], selected_continuity_base_frame_id: null },
      // 5. continuity base selected but no location reference alongside it -> weak + selectedContinuityBaseShots
      { id: 'shot-5', scene_id: 'scene-1', location_asset_id: 'loc-1', location_match_source: 'manual', location_match_confidence: 1, camera_direction_id: 'dir-A', reference_image_order: [{ type: 'continuity', referenceRole: 'continuity_base_frame' }], selected_continuity_base_frame_id: 'frame-9' },
    ];

    it('computes totals, suggestions, and reuse rate from a seeded fixture (basic mode)', async () => {
      mockFrom
        .mockReturnValueOnce(mockChain({ data: { id: 'project-1', active_branch_id: 'branch-1', continuity_mode: 'basic' }, error: null }))
        .mockReturnValueOnce(mockChain({ data: [{ id: 'scene-1', scene_number: 1 }], error: null }))
        .mockReturnValueOnce(mockChain({ data: shots, error: null }))
        .mockReturnValueOnce(mockChain({ data: [{ id: 'lineage-frame-1' }, { id: 'lineage-frame-2' }], error: null }));

      const response = await request(app)
        .get('/api/projects/project-1/continuity-metrics')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.continuityMode).toBe('basic');
      expect(response.body.scope).toBe('project');
      expect(response.body.totals).toEqual({
        totalScenes: 1,
        totalShots: 5,
        unresolvedBaselineLocations: 1,
        ambiguousBaselineLocations: 1,
        directionCoverageGaps: 1,
        fallbackReferenceShots: 1,
        weakReferenceShots: 3,
        selectedContinuityBaseShots: 1,
        generatedFromBaseFrames: 2,
        stage10ReuseRate: 0.2,
      });
      expect(response.body.suggestions).toHaveLength(2);
      expect(response.body.strictValidation).toEqual({ enabled: false, canProceed: true, issues: [] });
    });

    it('surfaces strict issues and blocks proceeding in advanced mode', async () => {
      mockFrom
        .mockReturnValueOnce(mockChain({ data: { id: 'project-1', active_branch_id: 'branch-1', continuity_mode: 'advanced' }, error: null }))
        .mockReturnValueOnce(mockChain({ data: [{ id: 'scene-1', scene_number: 1 }], error: null }))
        .mockReturnValueOnce(mockChain({ data: shots, error: null }))
        .mockReturnValueOnce(mockChain({ data: [], error: null }));

      const response = await request(app)
        .get('/api/projects/project-1/continuity-metrics')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.strictValidation.enabled).toBe(true);
      expect(response.body.strictValidation.canProceed).toBe(false);
      expect(response.body.strictValidation.issues).toEqual([
        '1 shot(s) need canonical locations.',
        '1 shot(s) need camera direction assignments.',
        '3 shot(s) have weak or missing generation references.',
      ]);
    });

    it('returns zeroed totals when the scene has no shots', async () => {
      mockFrom
        .mockReturnValueOnce(mockChain({ data: { id: 'project-1', active_branch_id: 'branch-1', continuity_mode: 'basic' }, error: null }))
        .mockReturnValueOnce(mockChain({ data: [], error: null }));

      const response = await request(app)
        .get('/api/projects/project-1/continuity-metrics')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.totals.totalShots).toBe(0);
      expect(response.body.suggestions).toEqual([]);
    });

    it('returns 404 when the project is not found', async () => {
      mockFrom.mockReturnValueOnce(mockChain({ data: null, error: { message: 'not found' } }));

      const response = await request(app)
        .get('/api/projects/project-1/continuity-metrics')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(404);
    });
  });
});
