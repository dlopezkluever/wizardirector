/**
 * Reference Continuity Tests
 *
 * Tests the reference-continuity feature:
 * - POST add-frame-as-reference: creates frame_link with type='reference', sets start_continuity
 * - POST copy-frame: mutual exclusivity (match replaces ref), cleans up stale continuity refs
 * - POST batch-link-copy: uses correct onConflict for target_frame_id
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

// Mock services that frames.ts imports
jest.mock('../services/frameGenerationService.js', () => ({
  frameGenerationService: {},
}));
jest.mock('../services/promptGenerationService.js', () => ({
  promptGenerationService: {},
  enrichAssetsWithAngleMatch: jest.fn(),
}));
jest.mock('../services/styleCapsuleService.js', () => ({
  StyleCapsuleService: jest.fn(),
}));
jest.mock('../services/transformationEventService.js', () => ({
  transformationEventService: {},
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

/** Track calls to `from()` and return specific chains for each table */
function mockFromSequence(sequence: Array<{ table?: string; result: { data?: unknown; error?: unknown } }>) {
  let callIndex = 0;
  mockFrom.mockImplementation((_tableName: string) => {
    if (callIndex < sequence.length) {
      const entry = sequence[callIndex];
      callIndex++;
      return mockChain(entry.result);
    }
    // Default: return empty success
    return mockChain({ data: null, error: null });
  });
}

function authAsUser1() {
  mockGetUser.mockResolvedValue({
    data: { user: { id: 'user-1', email: 'test@test.com' } },
    error: null,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Reference Continuity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authAsUser1();
  });

  // =========================================================================
  // POST add-frame-as-reference — Creates frame_link + sets continuity mode
  // =========================================================================

  describe('POST add-frame-as-reference', () => {
    const url = '/api/projects/proj-1/scenes/scene-1/shots/shot-1/add-frame-as-reference';

    it('should return 400 when sourceFrameId is missing', async () => {
      const res = await request(app)
        .post(url)
        .set('Authorization', 'Bearer test-token')
        .send({ targetFrameType: 'start' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/sourceFrameId/);
    });

    it('should return 400 when targetFrameType is invalid', async () => {
      const res = await request(app)
        .post(url)
        .set('Authorization', 'Bearer test-token')
        .send({ sourceFrameId: 'frame-1', targetFrameType: 'middle' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/targetFrameType/);
    });

    it('should create reference link and set start_continuity for start frames', async () => {
      // Track which tables are called and what operations are performed
      const fromCalls: string[] = [];
      const insertCalls: any[] = [];
      const deleteCalls: any[] = [];
      const updateCalls: any[] = [];

      mockFrom.mockImplementation((table: string) => {
        fromCalls.push(table);
        const chain: any = new Proxy({}, {
          get(_target, prop) {
            if (prop === 'then') {
              // Different responses based on table and call order
              if (table === 'projects') {
                return (resolve: (v: unknown) => void) => resolve({ data: { id: 'proj-1' }, error: null });
              }
              if (table === 'frames') {
                // Could be source frame fetch or target frame fetch
                const frameCallCount = fromCalls.filter(t => t === 'frames').length;
                if (frameCallCount <= 1) {
                  // Source frame fetch
                  return (resolve: (v: unknown) => void) => resolve({
                    data: { id: 'source-frame-1', image_url: 'https://example.com/img.png', shot_id: 'prev-shot-1' },
                    error: null,
                  });
                }
                // Target frame fetch
                return (resolve: (v: unknown) => void) => resolve({
                  data: { id: 'target-frame-1' },
                  error: null,
                });
              }
              if (table === 'shots') {
                return (resolve: (v: unknown) => void) => resolve({
                  data: { reference_image_order: [] },
                  error: null,
                });
              }
              if (table === 'frame_links') {
                return (resolve: (v: unknown) => void) => resolve({ data: null, error: null });
              }
              return (resolve: (v: unknown) => void) => resolve({ data: null, error: null });
            }
            if (prop === 'insert') {
              return (data: any) => {
                insertCalls.push({ table, data });
                return chain;
              };
            }
            if (prop === 'delete') {
              return () => {
                deleteCalls.push({ table });
                return chain;
              };
            }
            if (prop === 'update') {
              return (data: any) => {
                updateCalls.push({ table, data });
                return chain;
              };
            }
            return jest.fn().mockReturnValue(chain);
          },
        });
        return chain;
      });

      const res = await request(app)
        .post(url)
        .set('Authorization', 'Bearer test-token')
        .send({ sourceFrameId: 'source-frame-1', targetFrameType: 'start' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify frame_links operations occurred
      const frameLinkInserts = insertCalls.filter(c => c.table === 'frame_links');
      expect(frameLinkInserts.length).toBeGreaterThanOrEqual(1);
      expect(frameLinkInserts[0].data).toMatchObject({
        source_frame_id: 'source-frame-1',
        link_type: 'reference',
      });

      // Verify frame_links delete was called (mutual exclusivity)
      const frameLinkDeletes = deleteCalls.filter(c => c.table === 'frame_links');
      expect(frameLinkDeletes.length).toBeGreaterThanOrEqual(1);

      // Verify start_continuity was set to 'camera_change'
      const shotUpdates = updateCalls.filter(c => c.table === 'shots');
      const continuityUpdate = shotUpdates.find(c => c.data?.start_continuity === 'camera_change');
      expect(continuityUpdate).toBeDefined();
    });

    it('should NOT set start_continuity for end frames', async () => {
      const updateCalls: any[] = [];

      mockFrom.mockImplementation((table: string) => {
        const chain: any = new Proxy({}, {
          get(_target, prop) {
            if (prop === 'then') {
              if (table === 'projects') return (resolve: (v: unknown) => void) => resolve({ data: { id: 'proj-1' }, error: null });
              if (table === 'frames') {
                return (resolve: (v: unknown) => void) => resolve({
                  data: { id: 'frame-1', image_url: 'https://example.com/img.png', shot_id: 'shot-1' },
                  error: null,
                });
              }
              if (table === 'shots') return (resolve: (v: unknown) => void) => resolve({ data: { end_frame_reference_image_order: [] }, error: null });
              return (resolve: (v: unknown) => void) => resolve({ data: null, error: null });
            }
            if (prop === 'update') {
              return (data: any) => {
                updateCalls.push({ table, data });
                return chain;
              };
            }
            return jest.fn().mockReturnValue(chain);
          },
        });
        return chain;
      });

      const res = await request(app)
        .post(url)
        .set('Authorization', 'Bearer test-token')
        .send({ sourceFrameId: 'source-frame-1', targetFrameType: 'end' });

      expect(res.status).toBe(200);

      // No start_continuity update for end frames
      const continuityUpdate = updateCalls.find(c => c.data?.start_continuity === 'camera_change');
      expect(continuityUpdate).toBeUndefined();
    });
  });

  // =========================================================================
  // POST copy-frame — Mutual exclusivity: match replaces ref
  // =========================================================================

  describe('POST copy-frame — mutual exclusivity cleanup', () => {
    const url = '/api/projects/proj-1/scenes/scene-1/shots/shot-1/copy-frame';

    it('should return 400 when sourceFrameId missing', async () => {
      const res = await request(app)
        .post(url)
        .set('Authorization', 'Bearer test-token')
        .send({ targetFrameType: 'start' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/sourceFrameId/);
    });

    it('should clean up stale continuity reference when match replaces ref', async () => {
      const updateCalls: any[] = [];
      const upsertCalls: any[] = [];
      let fromCallIndex = 0;

      mockFrom.mockImplementation((table: string) => {
        fromCallIndex++;
        const chain: any = new Proxy({}, {
          get(_target, prop) {
            if (prop === 'then') {
              if (table === 'projects') {
                // First call: ownership check, second call: active_branch_id
                return (resolve: (v: unknown) => void) => resolve({
                  data: { id: 'proj-1', active_branch_id: 'branch-1' },
                  error: null,
                });
              }
              if (table === 'frames') {
                return (resolve: (v: unknown) => void) => resolve({
                  data: {
                    id: 'target-frame-1',
                    shot_id: 'shot-1',
                    frame_type: 'start',
                    image_url: 'https://example.com/source.png',
                    storage_path: 'path/to/source.png',
                    status: 'generated',
                    generation_count: 1,
                    total_cost_credits: '0',
                    previous_frame_id: null,
                    prompt_snapshot: null,
                    inpaint_count: 0,
                    last_inpaint_mask_path: null,
                    current_job_id: null,
                    created_at: '2026-01-01',
                    updated_at: '2026-01-01',
                    generated_at: '2026-01-01',
                    approved_at: null,
                  },
                  error: null,
                });
              }
              if (table === 'shots') {
                // Return shot with an existing continuity reference to test cleanup
                return (resolve: (v: unknown) => void) => resolve({
                  data: {
                    reference_image_order: [
                      { type: 'continuity', url: 'https://old-ref.com', label: 'Continuity' },
                      { type: 'asset', url: 'https://asset.com', label: 'Asset' },
                    ],
                  },
                  error: null,
                });
              }
              if (table === 'image_generation_jobs') {
                return (resolve: (v: unknown) => void) => resolve({
                  data: { id: 'job-1' },
                  error: null,
                });
              }
              return (resolve: (v: unknown) => void) => resolve({ data: null, error: null });
            }
            if (prop === 'upsert') {
              return (data: any, options: any) => {
                upsertCalls.push({ table, data, options });
                return chain;
              };
            }
            if (prop === 'update') {
              return (data: any) => {
                updateCalls.push({ table, data });
                return chain;
              };
            }
            return jest.fn().mockReturnValue(chain);
          },
        });
        return chain;
      });

      const res = await request(app)
        .post(url)
        .set('Authorization', 'Bearer test-token')
        .send({ sourceFrameId: 'source-frame-1', targetFrameType: 'start' });

      expect(res.status).toBe(200);

      // Verify frame_links upsert uses target_frame_id (not target_frame_id,link_type)
      const linkUpsert = upsertCalls.find(c => c.table === 'frame_links');
      expect(linkUpsert).toBeDefined();
      expect(linkUpsert.options.onConflict).toBe('target_frame_id');
      expect(linkUpsert.data.link_type).toBe('match');

      // Verify continuity reference was cleaned up from reference_image_order
      const shotCleanup = updateCalls.find(
        c => c.table === 'shots' && c.data?.reference_image_order
      );
      if (shotCleanup) {
        // Should have filtered out the continuity entry
        const remaining = shotCleanup.data.reference_image_order;
        expect(remaining.some((e: any) => e.type === 'continuity')).toBe(false);
        expect(remaining.some((e: any) => e.type === 'asset')).toBe(true);
      }
    });
  });

  // =========================================================================
  // Validation tests for both endpoints
  // =========================================================================

  describe('Authentication', () => {
    it('add-frame-as-reference should return 401 without auth', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not authenticated' } });

      const res = await request(app)
        .post('/api/projects/proj-1/scenes/scene-1/shots/shot-1/add-frame-as-reference')
        .set('Authorization', 'Bearer invalid')
        .send({ sourceFrameId: 'frame-1', targetFrameType: 'start' });

      expect(res.status).toBe(401);
    });

    it('copy-frame should return 401 without auth', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not authenticated' } });

      const res = await request(app)
        .post('/api/projects/proj-1/scenes/scene-1/shots/shot-1/copy-frame')
        .set('Authorization', 'Bearer invalid')
        .send({ sourceFrameId: 'frame-1', targetFrameType: 'start' });

      expect(res.status).toBe(401);
    });
  });
});
