/**
 * Asset Type Change & Cross-Type Merge Tests
 *
 * Tests the Phase A features:
 * - PUT /assets/:assetId: asset_type change (unlocked, locked, invalid)
 * - POST /assets/merge: cross-type merge, assignment migration, updatedDescription
 * - POST /assets/merge-descriptions: LLM description merge
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

// ---------------------------------------------------------------------------
// Mock Supabase
// ---------------------------------------------------------------------------

const mockFrom = jest.fn();
const mockGetUser = jest.fn();

jest.mock('../config/supabase.js', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
    },
  },
}));

// Mock mergeDescriptions (LLM)
const mockMergeDescriptions = jest.fn();
jest.mock('../services/assetDescriptionMerger.js', () => ({
  mergeDescriptions: (...args: unknown[]) => mockMergeDescriptions(...args),
}));

import request from 'supertest';
import { app } from '../server.js';

// ---------------------------------------------------------------------------
// Helpers — chainable Supabase mock
// ---------------------------------------------------------------------------

function mockChain(finalResult: { data?: unknown; error?: unknown; count?: number | null }) {
  const proxy: any = new Proxy({}, {
    get(_target, prop) {
      if (prop === 'then') {
        return (resolve: (v: unknown) => void) => resolve(finalResult);
      }
      return jest.fn().mockReturnValue(proxy);
    },
  });
  return proxy;
}

// Authenticate all requests as user-1
function authAsUser1() {
  mockGetUser.mockResolvedValue({
    data: { user: { id: 'user-1', email: 'test@test.com' } },
    error: null,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Asset Type & Cross-Type Merge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authAsUser1();
  });

  // =========================================================================
  // PUT /api/projects/:projectId/assets/:assetId — Change Type
  // =========================================================================

  describe('PUT — Change Asset Type', () => {
    it('should change asset_type when unlocked', async () => {
      // 1. Project ownership check
      mockFrom.mockReturnValueOnce(
        mockChain({ data: { id: 'proj-1' }, error: null })
      );
      // 2. Fetch existing asset (unlocked, no global link)
      mockFrom.mockReturnValueOnce(
        mockChain({
          data: { id: 'asset-1', locked: false, global_asset_id: null, overridden_fields: [] },
          error: null,
        })
      );
      // 3. Update returns updated asset
      mockFrom.mockReturnValueOnce(
        mockChain({
          data: { id: 'asset-1', asset_type: 'location', locked: false },
          error: null,
        })
      );

      const res = await request(app)
        .put('/api/projects/proj-1/assets/asset-1')
        .set('Authorization', 'Bearer test-token')
        .send({ asset_type: 'location' });

      expect(res.status).toBe(200);
      expect(res.body.asset_type).toBe('location');
    });

    it('should reject type change on locked asset (400)', async () => {
      // 1. Project ownership
      mockFrom.mockReturnValueOnce(
        mockChain({ data: { id: 'proj-1' }, error: null })
      );
      // 2. Existing asset is locked
      mockFrom.mockReturnValueOnce(
        mockChain({
          data: { id: 'asset-1', locked: true, global_asset_id: null, overridden_fields: [] },
          error: null,
        })
      );

      const res = await request(app)
        .put('/api/projects/proj-1/assets/asset-1')
        .set('Authorization', 'Bearer test-token')
        .send({ asset_type: 'prop' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Cannot modify locked asset');
    });

    it('should allow deferred toggle on locked asset (not blocked)', async () => {
      // 1. Project ownership
      mockFrom.mockReturnValueOnce(
        mockChain({ data: { id: 'proj-1' }, error: null })
      );
      // 2. Existing asset is locked
      mockFrom.mockReturnValueOnce(
        mockChain({
          data: { id: 'asset-1', locked: true, global_asset_id: null, overridden_fields: [] },
          error: null,
        })
      );
      // 3. Update succeeds
      mockFrom.mockReturnValueOnce(
        mockChain({
          data: { id: 'asset-1', locked: true, deferred: true },
          error: null,
        })
      );

      const res = await request(app)
        .put('/api/projects/proj-1/assets/asset-1')
        .set('Authorization', 'Bearer test-token')
        .send({ deferred: true });

      expect(res.status).toBe(200);
      expect(res.body.deferred).toBe(true);
    });

    it('should reject invalid asset_type (400)', async () => {
      // 1. Project ownership
      mockFrom.mockReturnValueOnce(
        mockChain({ data: { id: 'proj-1' }, error: null })
      );
      // 2. Existing asset unlocked
      mockFrom.mockReturnValueOnce(
        mockChain({
          data: { id: 'asset-1', locked: false, global_asset_id: null, overridden_fields: [] },
          error: null,
        })
      );

      const res = await request(app)
        .put('/api/projects/proj-1/assets/asset-1')
        .set('Authorization', 'Bearer test-token')
        .send({ asset_type: 'invalid_type' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid asset type');
    });

    it('should track asset_type in overridden_fields when global_asset_id exists', async () => {
      // 1. Project ownership
      mockFrom.mockReturnValueOnce(
        mockChain({ data: { id: 'proj-1' }, error: null })
      );
      // 2. Existing asset has global link
      mockFrom.mockReturnValueOnce(
        mockChain({
          data: { id: 'asset-1', locked: false, global_asset_id: 'global-1', overridden_fields: ['name'] },
          error: null,
        })
      );
      // 3. Update — we check it was called
      const updateChain = mockChain({
        data: { id: 'asset-1', asset_type: 'character', overridden_fields: ['name', 'asset_type'] },
        error: null,
      });
      mockFrom.mockReturnValueOnce(updateChain);

      const res = await request(app)
        .put('/api/projects/proj-1/assets/asset-1')
        .set('Authorization', 'Bearer test-token')
        .send({ asset_type: 'character' });

      expect(res.status).toBe(200);
    });
  });

  // =========================================================================
  // POST /api/projects/:projectId/assets/merge — Cross-Type Merge
  // =========================================================================

  describe('POST merge — Cross-Type Merge', () => {
    it('should allow merging assets of different types (no 400)', async () => {
      // 1. Project ownership
      mockFrom.mockReturnValueOnce(
        mockChain({ data: { id: 'proj-1' }, error: null })
      );
      // 2. Fetch all involved assets (different types)
      mockFrom.mockReturnValueOnce(
        mockChain({
          data: [
            { id: 'survivor', asset_type: 'character', locked: false, scene_numbers: [1, 2] },
            { id: 'absorbed', asset_type: 'prop', locked: false, scene_numbers: [3] },
          ],
          error: null,
        })
      );
      // 3. Survivor instances
      mockFrom.mockReturnValueOnce(
        mockChain({ data: [{ id: 'inst-s1', scene_id: 'scene-1' }], error: null })
      );
      // 4. Absorbed instances — different scene, so will be repointed
      mockFrom.mockReturnValueOnce(
        mockChain({ data: [{ id: 'inst-a1', scene_id: 'scene-2' }], error: null })
      );
      // 5. Repoint
      mockFrom.mockReturnValueOnce(mockChain({ data: null, error: null }));
      // 6. Update survivor (scene_numbers union)
      mockFrom.mockReturnValueOnce(
        mockChain({
          data: { id: 'survivor', asset_type: 'character', scene_numbers: [1, 2, 3] },
          error: null,
        })
      );
      // 7. Delete absorbed assets
      mockFrom.mockReturnValueOnce(mockChain({ data: null, error: null }));

      const res = await request(app)
        .post('/api/projects/proj-1/assets/merge')
        .set('Authorization', 'Bearer test-token')
        .send({
          survivorAssetId: 'survivor',
          absorbedAssetIds: ['absorbed'],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.instancesRepointed).toBe(1);
      expect(res.body.assetsAbsorbed).toBe(1);
    });

    it('should include assignmentsMigrated in response', async () => {
      // 1. Project ownership
      mockFrom.mockReturnValueOnce(
        mockChain({ data: { id: 'proj-1' }, error: null })
      );
      // 2. Fetch assets
      mockFrom.mockReturnValueOnce(
        mockChain({
          data: [
            { id: 'survivor', asset_type: 'character', locked: false, scene_numbers: [1] },
            { id: 'absorbed', asset_type: 'character', locked: false, scene_numbers: [1] },
          ],
          error: null,
        })
      );
      // 3. Survivor instances — scene-1
      mockFrom.mockReturnValueOnce(
        mockChain({ data: [{ id: 'inst-s', scene_id: 'scene-1' }], error: null })
      );
      // 4. Absorbed instances — SAME scene-1 (duplicate → will be deleted after migration)
      mockFrom.mockReturnValueOnce(
        mockChain({ data: [{ id: 'inst-a', scene_id: 'scene-1' }], error: null })
      );
      // 5. Fetch absorbed assignments — one assignment with no conflict
      mockFrom.mockReturnValueOnce(
        mockChain({
          data: [{ id: 'assign-a1', shot_id: 'shot-1', presence_type: 'throughout' }],
          error: null,
        })
      );
      // 6. Fetch survivor assignments — empty (no conflict)
      mockFrom.mockReturnValueOnce(
        mockChain({ data: [], error: null })
      );
      // 7. Re-point assignment to survivor instance
      mockFrom.mockReturnValueOnce(mockChain({ data: null, error: null }));
      // 8. Delete duplicate instances
      mockFrom.mockReturnValueOnce(mockChain({ data: null, error: null }));
      // 9. Update survivor
      mockFrom.mockReturnValueOnce(
        mockChain({ data: { id: 'survivor', scene_numbers: [1] }, error: null })
      );
      // 10. Delete absorbed assets
      mockFrom.mockReturnValueOnce(mockChain({ data: null, error: null }));

      const res = await request(app)
        .post('/api/projects/proj-1/assets/merge')
        .set('Authorization', 'Bearer test-token')
        .send({
          survivorAssetId: 'survivor',
          absorbedAssetIds: ['absorbed'],
        });

      expect(res.status).toBe(200);
      expect(res.body.assignmentsMigrated).toBeDefined();
      expect(typeof res.body.assignmentsMigrated).toBe('number');
    });

    it('should apply updatedDescription to survivor when provided', async () => {
      // 1. Project ownership
      mockFrom.mockReturnValueOnce(
        mockChain({ data: { id: 'proj-1' }, error: null })
      );
      // 2. Fetch assets
      mockFrom.mockReturnValueOnce(
        mockChain({
          data: [
            { id: 'survivor', asset_type: 'character', locked: false, scene_numbers: [1], description: 'old desc' },
            { id: 'absorbed', asset_type: 'character', locked: false, scene_numbers: [2], description: 'other desc' },
          ],
          error: null,
        })
      );
      // 3. Survivor instances — none in shared scenes
      mockFrom.mockReturnValueOnce(
        mockChain({ data: [{ id: 'inst-s', scene_id: 'scene-1' }], error: null })
      );
      // 4. Absorbed instances — different scene
      mockFrom.mockReturnValueOnce(
        mockChain({ data: [{ id: 'inst-a', scene_id: 'scene-2' }], error: null })
      );
      // 5. Repoint
      mockFrom.mockReturnValueOnce(mockChain({ data: null, error: null }));
      // 6. Update survivor with new description
      mockFrom.mockReturnValueOnce(
        mockChain({
          data: { id: 'survivor', scene_numbers: [1, 2], description: 'merged description' },
          error: null,
        })
      );
      // 7. Delete absorbed
      mockFrom.mockReturnValueOnce(mockChain({ data: null, error: null }));

      const res = await request(app)
        .post('/api/projects/proj-1/assets/merge')
        .set('Authorization', 'Bearer test-token')
        .send({
          survivorAssetId: 'survivor',
          absorbedAssetIds: ['absorbed'],
          updatedDescription: 'merged description',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject merge with locked asset', async () => {
      // 1. Project ownership
      mockFrom.mockReturnValueOnce(
        mockChain({ data: { id: 'proj-1' }, error: null })
      );
      // 2. Fetch assets — one is locked
      mockFrom.mockReturnValueOnce(
        mockChain({
          data: [
            { id: 'survivor', asset_type: 'character', locked: false, scene_numbers: [1] },
            { id: 'absorbed', asset_type: 'character', locked: true, name: 'LockedAsset', scene_numbers: [2] },
          ],
          error: null,
        })
      );

      const res = await request(app)
        .post('/api/projects/proj-1/assets/merge')
        .set('Authorization', 'Bearer test-token')
        .send({
          survivorAssetId: 'survivor',
          absorbedAssetIds: ['absorbed'],
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Cannot merge locked asset');
    });

    it('should reject merge with missing fields', async () => {
      const res = await request(app)
        .post('/api/projects/proj-1/assets/merge')
        .set('Authorization', 'Bearer test-token')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Missing required fields');
    });
  });

  // =========================================================================
  // Assignment Migration — specificity logic
  // =========================================================================

  describe('POST merge — Assignment Migration Specificity', () => {
    /**
     * Helper: set up a merge scenario where survivor and absorbed share one scene,
     * and the absorbed instance has one shot assignment.
     * Returns the supertest response.
     */
    async function mergeWithAssignments(opts: {
      absorbedPresenceType: string;
      survivorPresenceType?: string; // undefined = no conflict
    }) {
      // 1. Project ownership
      mockFrom.mockReturnValueOnce(
        mockChain({ data: { id: 'proj-1' }, error: null })
      );
      // 2. Fetch assets
      mockFrom.mockReturnValueOnce(
        mockChain({
          data: [
            { id: 'survivor', asset_type: 'character', locked: false, scene_numbers: [1] },
            { id: 'absorbed', asset_type: 'character', locked: false, scene_numbers: [1] },
          ],
          error: null,
        })
      );
      // 3. Survivor instances
      mockFrom.mockReturnValueOnce(
        mockChain({ data: [{ id: 'inst-s', scene_id: 'scene-1' }], error: null })
      );
      // 4. Absorbed instances — same scene (duplicate)
      mockFrom.mockReturnValueOnce(
        mockChain({ data: [{ id: 'inst-a', scene_id: 'scene-1' }], error: null })
      );
      // 5. Fetch absorbed assignments
      mockFrom.mockReturnValueOnce(
        mockChain({
          data: [{
            id: 'assign-absorbed',
            shot_id: 'shot-1',
            presence_type: opts.absorbedPresenceType,
          }],
          error: null,
        })
      );
      // 6. Fetch survivor assignments
      const survivorAssignments = opts.survivorPresenceType
        ? [{
            id: 'assign-survivor',
            shot_id: 'shot-1',
            presence_type: opts.survivorPresenceType,
          }]
        : [];
      mockFrom.mockReturnValueOnce(
        mockChain({ data: survivorAssignments, error: null })
      );

      if (!opts.survivorPresenceType) {
        // No conflict → re-point absorbed assignment
        mockFrom.mockReturnValueOnce(mockChain({ data: null, error: null }));
      } else {
        // Conflict path
        const absSpec = ['enters', 'exits', 'passes_through'].includes(opts.absorbedPresenceType) ? 3 : 1;
        const surSpec = ['enters', 'exits', 'passes_through'].includes(opts.survivorPresenceType) ? 3 : 1;
        if (absSpec > surSpec) {
          // Absorbed wins: update survivor assignment + delete absorbed
          mockFrom.mockReturnValueOnce(mockChain({ data: null, error: null }));
          mockFrom.mockReturnValueOnce(mockChain({ data: null, error: null }));
        } else {
          // Survivor wins or tie: just delete absorbed
          mockFrom.mockReturnValueOnce(mockChain({ data: null, error: null }));
        }
      }

      // Delete duplicate instances
      mockFrom.mockReturnValueOnce(mockChain({ data: null, error: null }));
      // Update survivor
      mockFrom.mockReturnValueOnce(
        mockChain({ data: { id: 'survivor', scene_numbers: [1] }, error: null })
      );
      // Delete absorbed assets
      mockFrom.mockReturnValueOnce(mockChain({ data: null, error: null }));

      return request(app)
        .post('/api/projects/proj-1/assets/merge')
        .set('Authorization', 'Bearer test-token')
        .send({
          survivorAssetId: 'survivor',
          absorbedAssetIds: ['absorbed'],
        });
    }

    it('should re-point assignment when no conflict exists', async () => {
      const res = await mergeWithAssignments({
        absorbedPresenceType: 'throughout',
      });

      expect(res.status).toBe(200);
      expect(res.body.assignmentsMigrated).toBe(1);
    });

    it('should use absorbed "enters" over survivor "throughout" (absorbed wins)', async () => {
      const res = await mergeWithAssignments({
        absorbedPresenceType: 'enters',
        survivorPresenceType: 'throughout',
      });

      expect(res.status).toBe(200);
      expect(res.body.assignmentsMigrated).toBe(1);
    });

    it('should keep survivor "exits" over absorbed "throughout" (survivor wins)', async () => {
      const res = await mergeWithAssignments({
        absorbedPresenceType: 'throughout',
        survivorPresenceType: 'exits',
      });

      expect(res.status).toBe(200);
      // Survivor wins = no migration needed for the conflicting assignment
      expect(res.body.assignmentsMigrated).toBe(0);
    });

    it('should keep survivor when both have same specificity (tie)', async () => {
      const res = await mergeWithAssignments({
        absorbedPresenceType: 'throughout',
        survivorPresenceType: 'throughout',
      });

      expect(res.status).toBe(200);
      expect(res.body.assignmentsMigrated).toBe(0);
    });
  });

  // =========================================================================
  // POST /api/projects/:projectId/assets/merge-descriptions
  // =========================================================================

  describe('POST merge-descriptions', () => {
    it('should return merged description text', async () => {
      mockMergeDescriptions.mockResolvedValue('A tall warrior with a scarred face and heavy armor.');

      // 1. Project ownership
      mockFrom.mockReturnValueOnce(
        mockChain({ data: { id: 'proj-1' }, error: null })
      );

      const res = await request(app)
        .post('/api/projects/proj-1/assets/merge-descriptions')
        .set('Authorization', 'Bearer test-token')
        .send({
          descriptions: ['A tall warrior.', 'He has a scarred face and heavy armor.'],
        });

      expect(res.status).toBe(200);
      expect(res.body.mergedDescription).toBe('A tall warrior with a scarred face and heavy armor.');
      expect(mockMergeDescriptions).toHaveBeenCalledWith(
        'A tall warrior.',
        'He has a scarred face and heavy armor.',
        'merge'
      );
    });

    it('should reject when descriptions has fewer than 2 items', async () => {
      const res = await request(app)
        .post('/api/projects/proj-1/assets/merge-descriptions')
        .set('Authorization', 'Bearer test-token')
        .send({ descriptions: ['only one'] });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('at least 2');
    });

    it('should reject when descriptions is not an array', async () => {
      const res = await request(app)
        .post('/api/projects/proj-1/assets/merge-descriptions')
        .set('Authorization', 'Bearer test-token')
        .send({ descriptions: 'not an array' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('at least 2');
    });

    it('should handle 3+ descriptions (joins absorbed, passes pair to LLM)', async () => {
      mockMergeDescriptions.mockResolvedValue('Combined description.');

      // 1. Project ownership
      mockFrom.mockReturnValueOnce(
        mockChain({ data: { id: 'proj-1' }, error: null })
      );

      const res = await request(app)
        .post('/api/projects/proj-1/assets/merge-descriptions')
        .set('Authorization', 'Bearer test-token')
        .send({
          descriptions: ['Survivor desc', 'Absorbed1 desc', 'Absorbed2 desc'],
        });

      expect(res.status).toBe(200);
      // The endpoint joins absorbed descs and calls mergeDescriptions(survivor, joined, 'merge')
      expect(mockMergeDescriptions).toHaveBeenCalledWith(
        'Survivor desc',
        'Absorbed1 desc\n\nAbsorbed2 desc',
        'merge'
      );
    });
  });
});
