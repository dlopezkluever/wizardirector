import { describe, expect, it, beforeEach, jest } from '@jest/globals';

const mockFrom = jest.fn<(...args: unknown[]) => unknown>();

jest.mock('../config/supabase.js', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import { ContinuityBaseService } from '../services/continuityBaseService.js';

type MethodCall = { method: string; args: unknown[] };

function mockChain(finalResult: { data?: unknown; error?: { message: string } | null }, calls?: MethodCall[]) {
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

interface RowOverrides {
  id?: string;
  image_url?: string | null;
  status?: string;
  approved_at?: string | null;
  generated_at?: string | null;
  shotId?: string;
  shotLabel?: string;
  sceneId?: string;
  sceneNumber?: number;
  branchId?: string;
  locationAssetId?: string | null;
  cameraDirectionId?: string | null;
}

function makeRow(overrides: RowOverrides = {}) {
  const shotId = overrides.shotId ?? 'shot-candidate';
  return {
    id: overrides.id ?? `frame-${shotId}`,
    image_url: overrides.image_url === undefined ? 'https://img.test/frame.png' : overrides.image_url,
    status: overrides.status ?? 'approved',
    approved_at: overrides.approved_at === undefined ? '2026-05-01T00:00:00.000Z' : overrides.approved_at,
    generated_at: overrides.generated_at === undefined ? '2026-05-01T00:00:00.000Z' : overrides.generated_at,
    shot_id: shotId,
    shots: {
      id: shotId,
      shot_id: overrides.shotLabel ?? shotId,
      shot_order: 1,
      scene_id: overrides.sceneId ?? 'scene-1',
      location_asset_id: overrides.locationAssetId === undefined ? 'loc-1' : overrides.locationAssetId,
      camera_direction_id: overrides.cameraDirectionId === undefined ? null : overrides.cameraDirectionId,
      scenes: {
        id: overrides.sceneId ?? 'scene-1',
        scene_number: overrides.sceneNumber ?? 1,
        branch_id: overrides.branchId ?? 'branch-1',
      },
    },
  };
}

const baseQuery = {
  projectId: 'project-1',
  branchId: 'branch-1',
  shotId: 'shot-query',
  locationAssetId: 'loc-1',
  cameraDirectionId: 'dir-A',
  sceneId: 'scene-1',
};

describe('continuityBaseService', () => {
  let service: ContinuityBaseService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ContinuityBaseService();
  });

  describe('listCandidates — early exit', () => {
    it('returns [] without querying supabase when locationAssetId is null', async () => {
      const candidates = await service.listCandidates({ ...baseQuery, locationAssetId: null });

      expect(candidates).toEqual([]);
      expect(mockFrom).not.toHaveBeenCalled();
    });
  });

  describe('tier assignment', () => {
    // These rows deliberately use status 'generated' + a different scene id than the
    // query so the +0.02 (approved) and +0.03 (same scene) bonuses don't apply,
    // isolating the tier base confidence.
    it('scores same location + same camera direction as strong (0.95 base)', async () => {
      mockFrom.mockReturnValueOnce(
        mockChain({
          data: [makeRow({ shotId: 'shot-a', cameraDirectionId: 'dir-A', status: 'generated', sceneId: 'scene-other' })],
          error: null,
        })
      );

      const candidates = await service.listCandidates(baseQuery);

      expect(candidates).toHaveLength(1);
      expect(candidates[0].suitability).toBe('strong');
      expect(candidates[0].sameDirection).toBe(true);
      expect(candidates[0].confidence).toBeCloseTo(0.95, 5);
    });

    it('scores same location with both sides directionless as usable (0.7 base)', async () => {
      mockFrom.mockReturnValueOnce(
        mockChain({
          data: [makeRow({ shotId: 'shot-b', cameraDirectionId: null, status: 'generated', sceneId: 'scene-other' })],
          error: null,
        })
      );

      const candidates = await service.listCandidates({ ...baseQuery, cameraDirectionId: null });

      expect(candidates[0].suitability).toBe('usable');
      expect(candidates[0].confidence).toBeCloseTo(0.7, 5);
    });

    it('scores same location where only one side has a direction as usable (0.6 base)', async () => {
      mockFrom.mockReturnValueOnce(
        mockChain({
          data: [makeRow({ shotId: 'shot-c', cameraDirectionId: null, status: 'generated', sceneId: 'scene-other' })],
          error: null,
        })
      );

      // query has a direction, candidate does not -> no conflict, but not an exact match either
      const candidates = await service.listCandidates(baseQuery);

      expect(candidates[0].suitability).toBe('usable');
      expect(candidates[0].confidence).toBeCloseTo(0.6, 5);
    });

    it('scores same location with a conflicting camera direction as weak (0.4 base)', async () => {
      mockFrom.mockReturnValueOnce(
        mockChain({
          data: [makeRow({ shotId: 'shot-d', cameraDirectionId: 'dir-B', status: 'generated', sceneId: 'scene-other' })],
          error: null,
        })
      );

      const candidates = await service.listCandidates(baseQuery);

      expect(candidates[0].suitability).toBe('weak');
      expect(candidates[0].confidence).toBeCloseTo(0.4, 5);
    });

    it('adds a same-scene bonus and an approved-status bonus, capped at 1', async () => {
      mockFrom.mockReturnValueOnce(
        mockChain({
          data: [makeRow({ shotId: 'shot-e', cameraDirectionId: 'dir-A', sceneId: 'scene-1', status: 'approved' })],
          error: null,
        })
      );

      const candidates = await service.listCandidates(baseQuery);

      // 0.95 (strong) + 0.03 (same scene) + 0.02 (approved) = 1.0, capped
      expect(candidates[0].confidence).toBeCloseTo(1, 5);
    });
  });

  describe('exclusions', () => {
    it('excludes the requesting shot itself even if location matches', async () => {
      mockFrom.mockReturnValueOnce(
        mockChain({ data: [makeRow({ shotId: baseQuery.shotId })], error: null })
      );

      const candidates = await service.listCandidates(baseQuery);

      expect(candidates).toHaveLength(0);
    });

    it('excludes frames from a different canonical location', async () => {
      mockFrom.mockReturnValueOnce(
        mockChain({ data: [makeRow({ shotId: 'shot-f', locationAssetId: 'loc-other' })], error: null })
      );

      const candidates = await service.listCandidates(baseQuery);

      expect(candidates).toHaveLength(0);
    });

    it('excludes rows without an image_url even if the DB filter did not catch it', async () => {
      mockFrom.mockReturnValueOnce(
        mockChain({ data: [makeRow({ shotId: 'shot-g', image_url: null })], error: null })
      );

      const candidates = await service.listCandidates(baseQuery);

      expect(candidates).toHaveLength(0);
    });

    it('requests only approved/generated frames from the DB (status filter)', async () => {
      const calls: MethodCall[] = [];
      mockFrom.mockReturnValueOnce(mockChain({ data: [], error: null }, calls));

      await service.listCandidates(baseQuery);

      const inCall = calls.find(c => c.method === 'in' && c.args[0] === 'status');
      expect(inCall).toBeDefined();
      expect(inCall?.args[1]).toEqual(['approved', 'generated']);

      const notCall = calls.find(c => c.method === 'not');
      expect(notCall).toBeDefined();
      expect(notCall?.args).toEqual(['image_url', 'is', null]);
    });
  });

  describe('sort order', () => {
    it('sorts by tier, then confidence, then approved-before-generated, then recency', async () => {
      const rows = [
        // weak tier, should sort last regardless of other fields
        makeRow({ shotId: 'shot-weak', cameraDirectionId: 'dir-B', approved_at: '2026-06-01T00:00:00.000Z' }),
        // strong tier, generated, older
        makeRow({
          shotId: 'shot-strong-generated-old',
          cameraDirectionId: 'dir-A',
          status: 'generated',
          approved_at: null,
          generated_at: '2026-01-01T00:00:00.000Z',
        }),
        // strong tier, approved -> should outrank the generated one at the same tier
        makeRow({
          shotId: 'shot-strong-approved',
          cameraDirectionId: 'dir-A',
          status: 'approved',
          approved_at: '2026-02-01T00:00:00.000Z',
        }),
        // strong tier, generated, more recent than the other generated row
        makeRow({
          shotId: 'shot-strong-generated-new',
          cameraDirectionId: 'dir-A',
          status: 'generated',
          approved_at: null,
          generated_at: '2026-03-01T00:00:00.000Z',
        }),
      ];
      mockFrom.mockReturnValueOnce(mockChain({ data: rows, error: null }));

      const candidates = await service.listCandidates(baseQuery);

      expect(candidates.map(c => c.sourceShotId)).toEqual([
        'shot-strong-approved',
        'shot-strong-generated-new',
        'shot-strong-generated-old',
        'shot-weak',
      ]);
    });

    it('respects the limit after sorting', async () => {
      const rows = Array.from({ length: 12 }, (_, i) =>
        makeRow({ shotId: `shot-${i}`, cameraDirectionId: 'dir-A', generated_at: `2026-0${(i % 9) + 1}-01T00:00:00.000Z` })
      );
      mockFrom.mockReturnValueOnce(mockChain({ data: rows, error: null }));

      const candidates = await service.listCandidates({ ...baseQuery, limit: 3 });

      expect(candidates).toHaveLength(3);
    });
  });

  describe('listCandidatesForShots (batch)', () => {
    it('issues exactly one frames query regardless of shot count', async () => {
      mockFrom.mockReturnValueOnce(
        mockChain({
          data: [
            makeRow({ shotId: 'shot-a', cameraDirectionId: 'dir-A' }),
            makeRow({ shotId: 'shot-b', locationAssetId: 'loc-2', cameraDirectionId: 'dir-B' }),
          ],
          error: null,
        })
      );

      const results = await service.listCandidatesForShots({
        projectId: 'project-1',
        branchId: 'branch-1',
        sceneId: 'scene-1',
        shots: [
          { shotId: 'shot-query-1', locationAssetId: 'loc-1', cameraDirectionId: 'dir-A' },
          { shotId: 'shot-query-2', locationAssetId: 'loc-2', cameraDirectionId: 'dir-B' },
          { shotId: 'shot-query-3', locationAssetId: 'loc-3', cameraDirectionId: null },
        ],
      });

      expect(mockFrom).toHaveBeenCalledTimes(1);
      expect(results.get('shot-query-1')?.[0]?.sourceShotId).toBe('shot-a');
      expect(results.get('shot-query-2')?.[0]?.sourceShotId).toBe('shot-b');
      expect(results.get('shot-query-3')).toEqual([]);
    });

    it('skips the query entirely when no shot has a location assigned', async () => {
      const results = await service.listCandidatesForShots({
        projectId: 'project-1',
        branchId: 'branch-1',
        sceneId: 'scene-1',
        shots: [
          { shotId: 'shot-query-1', locationAssetId: null, cameraDirectionId: null },
          { shotId: 'shot-query-2', locationAssetId: null, cameraDirectionId: null },
        ],
      });

      expect(mockFrom).not.toHaveBeenCalled();
      expect(results.get('shot-query-1')).toEqual([]);
      expect(results.get('shot-query-2')).toEqual([]);
    });

    it('produces the same ranking as listCandidates for an equivalent single-shot query', async () => {
      const rows = [
        makeRow({ shotId: 'shot-a', cameraDirectionId: 'dir-A', status: 'approved' }),
        makeRow({ shotId: 'shot-b', cameraDirectionId: null, status: 'generated' }),
      ];
      mockFrom.mockReturnValueOnce(mockChain({ data: rows, error: null }));
      const single = await service.listCandidates(baseQuery);

      mockFrom.mockReturnValueOnce(mockChain({ data: rows, error: null }));
      const batch = await service.listCandidatesForShots({
        projectId: baseQuery.projectId,
        branchId: baseQuery.branchId,
        sceneId: baseQuery.sceneId,
        shots: [{ shotId: baseQuery.shotId, locationAssetId: baseQuery.locationAssetId, cameraDirectionId: baseQuery.cameraDirectionId }],
      });

      expect(batch.get(baseQuery.shotId)).toEqual(single);
    });
  });

  describe('pickCandidateById', () => {
    it('returns null when frameId is null/undefined', async () => {
      const candidates = [{ frameId: 'frame-1' } as any];
      expect(await service.pickCandidateById(candidates, null)).toBeNull();
      expect(await service.pickCandidateById(candidates, undefined)).toBeNull();
    });

    it('finds the candidate matching frameId', async () => {
      const candidates = [{ frameId: 'frame-1' } as any, { frameId: 'frame-2' } as any];
      expect(await service.pickCandidateById(candidates, 'frame-2')).toBe(candidates[1]);
    });

    it('returns null when no candidate matches', async () => {
      const candidates = [{ frameId: 'frame-1' } as any];
      expect(await service.pickCandidateById(candidates, 'frame-unknown')).toBeNull();
    });
  });
});
