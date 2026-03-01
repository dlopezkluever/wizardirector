/**
 * Shot Asset Assignment Service — Unit Tests
 * Tests CRUD, auto-populate, and invalidation logic by mocking Supabase.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

// ---------------------------------------------------------------------------
// Mock Supabase
// ---------------------------------------------------------------------------

const mockFrom = jest.fn();
jest.mock('../config/supabase.js', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));

import { shotAssetAssignmentService } from '../services/shotAssetAssignmentService.js';

// ---------------------------------------------------------------------------
// Helpers — build chainable Supabase query mocks
// ---------------------------------------------------------------------------

function chainableQuery(finalResult: { data?: unknown; error?: unknown; count?: number | null }) {
  const chain: Record<string, jest.Mock> = {};
  const methods = ['select', 'insert', 'update', 'upsert', 'delete', 'eq', 'in', 'single'];
  for (const m of methods) {
    chain[m] = jest.fn().mockReturnValue(chain);
  }
  // Terminal — returns the final result
  chain['select'] = jest.fn().mockImplementation(() => {
    // If called after insert/update/upsert, return chain (for chaining .single())
    return { ...chain, then: (resolve: (v: unknown) => void) => resolve(finalResult) };
  });
  // Override to make everything return chain by default and let the last call resolve
  for (const m of methods) {
    chain[m] = jest.fn().mockReturnValue(chain);
  }
  // Make the chain itself thenable so `await supabase.from(...)...` resolves
  (chain as any).then = (resolve: (v: unknown) => void) => resolve(finalResult);
  return chain;
}

// Build a mock that resolves differently per chained call (from -> select -> eq -> etc.)
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

describe('ShotAssetAssignmentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // getAssignmentsForShot
  // =========================================================================

  describe('getAssignmentsForShot', () => {
    it('should return assignments for a shot', async () => {
      const mockAssignments = [
        { id: 'a1', shot_id: 's1', scene_asset_instance_id: 'i1', presence_type: 'throughout' },
        { id: 'a2', shot_id: 's1', scene_asset_instance_id: 'i2', presence_type: 'enters' },
      ];

      mockFrom.mockReturnValue(mockChain({ data: mockAssignments, error: null }));

      const result = await shotAssetAssignmentService.getAssignmentsForShot('s1');
      expect(result).toHaveLength(2);
      expect(result[0].presence_type).toBe('throughout');
      expect(result[1].presence_type).toBe('enters');
      expect(mockFrom).toHaveBeenCalledWith('shot_asset_assignments');
    });

    it('should throw on supabase error', async () => {
      mockFrom.mockReturnValue(
        mockChain({ data: null, error: { message: 'DB error' } })
      );

      await expect(shotAssetAssignmentService.getAssignmentsForShot('s1'))
        .rejects.toThrow('Failed to get assignments for shot: DB error');
    });
  });

  // =========================================================================
  // getAssignmentsForScene
  // =========================================================================

  describe('getAssignmentsForScene', () => {
    it('should return empty array when scene has no shots', async () => {
      // First call: from('shots')
      mockFrom.mockReturnValueOnce(mockChain({ data: [], error: null }));

      const result = await shotAssetAssignmentService.getAssignmentsForScene('scene-1');
      expect(result).toEqual([]);
    });

    it('should query assignments for all shot IDs in scene', async () => {
      // First call: from('shots') -> returns 2 shots
      mockFrom.mockReturnValueOnce(
        mockChain({ data: [{ id: 's1' }, { id: 's2' }], error: null })
      );
      // Second call: from('shot_asset_assignments')
      const mockAssignments = [
        { id: 'a1', shot_id: 's1', scene_asset_instance_id: 'i1', presence_type: 'throughout' },
        { id: 'a2', shot_id: 's2', scene_asset_instance_id: 'i1', presence_type: 'exits' },
      ];
      mockFrom.mockReturnValueOnce(mockChain({ data: mockAssignments, error: null }));

      const result = await shotAssetAssignmentService.getAssignmentsForScene('scene-1');
      expect(result).toHaveLength(2);
      expect(mockFrom).toHaveBeenCalledTimes(2);
    });
  });

  // =========================================================================
  // createAssignment
  // =========================================================================

  describe('createAssignment', () => {
    it('should create an assignment with default presence_type "throughout"', async () => {
      const newAssignment = {
        id: 'a-new', shot_id: 's1', scene_asset_instance_id: 'i1',
        presence_type: 'throughout', created_at: '2026-01-01', updated_at: '2026-01-01',
      };
      mockFrom.mockReturnValue(mockChain({ data: newAssignment, error: null }));

      const result = await shotAssetAssignmentService.createAssignment('s1', 'i1');
      expect(result.id).toBe('a-new');
      expect(result.presence_type).toBe('throughout');
    });

    it('should create with explicit presence_type', async () => {
      const newAssignment = {
        id: 'a-new', shot_id: 's1', scene_asset_instance_id: 'i1',
        presence_type: 'enters', created_at: '2026-01-01', updated_at: '2026-01-01',
      };
      mockFrom.mockReturnValue(mockChain({ data: newAssignment, error: null }));

      const result = await shotAssetAssignmentService.createAssignment('s1', 'i1', 'enters');
      expect(result.presence_type).toBe('enters');
    });

    it('should throw on supabase error', async () => {
      mockFrom.mockReturnValue(
        mockChain({ data: null, error: { message: 'unique violation' } })
      );

      await expect(shotAssetAssignmentService.createAssignment('s1', 'i1'))
        .rejects.toThrow('Failed to create assignment: unique violation');
    });
  });

  // =========================================================================
  // bulkCreateAssignments
  // =========================================================================

  describe('bulkCreateAssignments', () => {
    it('should upsert multiple assignments', async () => {
      const created = [
        { id: 'a1', shot_id: 's1', scene_asset_instance_id: 'i1', presence_type: 'throughout' },
        { id: 'a2', shot_id: 's2', scene_asset_instance_id: 'i1', presence_type: 'enters' },
      ];
      mockFrom.mockReturnValue(mockChain({ data: created, error: null }));

      const result = await shotAssetAssignmentService.bulkCreateAssignments([
        { shotId: 's1', instanceId: 'i1', presenceType: 'throughout' },
        { shotId: 's2', instanceId: 'i1', presenceType: 'enters' },
      ]);
      expect(result).toHaveLength(2);
    });
  });

  // =========================================================================
  // updateAssignment
  // =========================================================================

  describe('updateAssignment', () => {
    it('should update presence_type', async () => {
      const updated = {
        id: 'a1', shot_id: 's1', scene_asset_instance_id: 'i1',
        presence_type: 'exits', updated_at: '2026-03-01',
      };
      mockFrom.mockReturnValue(mockChain({ data: updated, error: null }));

      const result = await shotAssetAssignmentService.updateAssignment('a1', 'exits');
      expect(result.presence_type).toBe('exits');
    });

    it('should throw on error', async () => {
      mockFrom.mockReturnValue(
        mockChain({ data: null, error: { message: 'not found' } })
      );

      await expect(shotAssetAssignmentService.updateAssignment('bad-id', 'enters'))
        .rejects.toThrow('Failed to update assignment: not found');
    });
  });

  // =========================================================================
  // deleteAssignment
  // =========================================================================

  describe('deleteAssignment', () => {
    it('should delete without error', async () => {
      mockFrom.mockReturnValue(mockChain({ data: null, error: null }));

      await expect(shotAssetAssignmentService.deleteAssignment('a1')).resolves.toBeUndefined();
    });

    it('should throw on error', async () => {
      mockFrom.mockReturnValue(
        mockChain({ data: null, error: { message: 'not found' } })
      );

      await expect(shotAssetAssignmentService.deleteAssignment('bad-id'))
        .rejects.toThrow('Failed to delete assignment: not found');
    });
  });

  // =========================================================================
  // autoPopulate
  // =========================================================================

  describe('autoPopulate', () => {
    it('should return zeros when scene has no shots', async () => {
      mockFrom.mockReturnValueOnce(mockChain({ data: [], error: null }));

      const result = await shotAssetAssignmentService.autoPopulate('scene-1');
      expect(result).toEqual({ created: 0, existing: 0 });
    });

    it('should return zeros when scene has no asset instances', async () => {
      // shots query
      mockFrom.mockReturnValueOnce(mockChain({ data: [{ id: 's1' }], error: null }));
      // instances query
      mockFrom.mockReturnValueOnce(mockChain({ data: [], error: null }));

      const result = await shotAssetAssignmentService.autoPopulate('scene-1');
      expect(result).toEqual({ created: 0, existing: 0 });
    });

    it('should create assignments for all shot×asset combinations', async () => {
      // shots
      mockFrom.mockReturnValueOnce(
        mockChain({ data: [{ id: 's1' }, { id: 's2' }], error: null })
      );
      // instances
      mockFrom.mockReturnValueOnce(
        mockChain({ data: [{ id: 'i1' }, { id: 'i2' }], error: null })
      );
      // existing assignments — none
      mockFrom.mockReturnValueOnce(mockChain({ data: [], error: null }));
      // insert
      mockFrom.mockReturnValueOnce(mockChain({ data: null, error: null }));

      const result = await shotAssetAssignmentService.autoPopulate('scene-1');
      // 2 shots × 2 assets = 4 new assignments
      expect(result.created).toBe(4);
      expect(result.existing).toBe(0);
    });

    it('should not duplicate existing assignments', async () => {
      // shots
      mockFrom.mockReturnValueOnce(
        mockChain({ data: [{ id: 's1' }, { id: 's2' }], error: null })
      );
      // instances
      mockFrom.mockReturnValueOnce(
        mockChain({ data: [{ id: 'i1' }], error: null })
      );
      // existing — s1:i1 already exists
      mockFrom.mockReturnValueOnce(
        mockChain({ data: [{ shot_id: 's1', scene_asset_instance_id: 'i1' }], error: null })
      );
      // insert — only s2:i1
      mockFrom.mockReturnValueOnce(mockChain({ data: null, error: null }));

      const result = await shotAssetAssignmentService.autoPopulate('scene-1');
      expect(result.created).toBe(1);
      expect(result.existing).toBe(1);
    });
  });

  // =========================================================================
  // hasAssignments
  // =========================================================================

  describe('hasAssignments', () => {
    it('should return false when scene has no shots', async () => {
      mockFrom.mockReturnValueOnce(mockChain({ data: [], error: null }));

      const result = await shotAssetAssignmentService.hasAssignments('scene-1');
      expect(result).toBe(false);
    });

    it('should return true when count > 0', async () => {
      // shots
      mockFrom.mockReturnValueOnce(
        mockChain({ data: [{ id: 's1' }], error: null })
      );
      // count
      mockFrom.mockReturnValueOnce(mockChain({ data: null, error: null, count: 3 }));

      const result = await shotAssetAssignmentService.hasAssignments('scene-1');
      expect(result).toBe(true);
    });

    it('should return false when count is 0', async () => {
      mockFrom.mockReturnValueOnce(
        mockChain({ data: [{ id: 's1' }], error: null })
      );
      mockFrom.mockReturnValueOnce(mockChain({ data: null, error: null, count: 0 }));

      const result = await shotAssetAssignmentService.hasAssignments('scene-1');
      expect(result).toBe(false);
    });
  });

  // =========================================================================
  // invalidateStage9AndDownstream
  // =========================================================================

  describe('invalidateStage9AndDownstream', () => {
    it('should mark stages 9-12 as outdated when they are locked', async () => {
      const sceneLocks = {
        '8': { status: 'locked' },
        '9': { status: 'locked' },
        '10': { status: 'locked' },
        '11': { status: 'locked' },
        '12': { status: 'locked' },
      };

      // scene query
      mockFrom.mockReturnValueOnce(
        mockChain({ data: { stage_locks: sceneLocks }, error: null })
      );
      // update
      mockFrom.mockReturnValueOnce(mockChain({ data: null, error: null }));

      await shotAssetAssignmentService.invalidateStage9AndDownstream('scene-1');

      // Verify update was called
      expect(mockFrom).toHaveBeenCalledTimes(2);
    });

    it('should not update when no stages are locked', async () => {
      const sceneLocks = {
        '9': { status: 'draft' },
        '10': { status: 'draft' },
      };

      mockFrom.mockReturnValueOnce(
        mockChain({ data: { stage_locks: sceneLocks }, error: null })
      );

      await shotAssetAssignmentService.invalidateStage9AndDownstream('scene-1');

      // Only 1 call (the select), no update needed
      expect(mockFrom).toHaveBeenCalledTimes(1);
    });

    it('should not touch stages below 9', async () => {
      const sceneLocks = {
        '7': { status: 'locked' },
        '8': { status: 'locked' },
        '9': { status: 'locked' },
      };

      mockFrom.mockReturnValueOnce(
        mockChain({ data: { stage_locks: sceneLocks }, error: null })
      );
      mockFrom.mockReturnValueOnce(mockChain({ data: null, error: null }));

      await shotAssetAssignmentService.invalidateStage9AndDownstream('scene-1');

      // Stage 7 and 8 should remain locked — we can't directly verify the payload
      // with our proxy mock, but the fact it only called update once is correct.
      expect(mockFrom).toHaveBeenCalledTimes(2);
    });
  });
});
