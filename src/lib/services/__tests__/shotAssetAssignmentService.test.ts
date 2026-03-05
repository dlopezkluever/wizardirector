/**
 * Frontend Shot Asset Assignment Service — Unit Tests
 * Verifies API calls, headers, payloads, and error handling using MSW.
 */

import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

// Mock supabase BEFORE importing the service
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: { access_token: 'test-token-123' },
        },
      }),
    },
  },
}));

import { shotAssetAssignmentService } from '../shotAssetAssignmentService';
import { supabase } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// MSW Setup
// ---------------------------------------------------------------------------

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const PROJECT_ID = 'proj-1';
const SCENE_ID = 'scene-1';
const SHOT_ID = 'shot-1';
const ASSIGNMENT_ID = 'assign-1';
const BASE = `/api/projects/${PROJECT_ID}/scenes/${SCENE_ID}/shot-assignments`;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('shotAssetAssignmentService', () => {
  // =========================================================================
  // listForScene
  // =========================================================================

  describe('listForScene', () => {
    it('should GET assignments for scene and return them', async () => {
      const mockData = [
        { id: 'a1', shot_id: SHOT_ID, presence_type: 'throughout' },
      ];
      server.use(
        http.get(BASE, () => {
          return HttpResponse.json({ assignments: mockData });
        })
      );

      const result = await shotAssetAssignmentService.listForScene(PROJECT_ID, SCENE_ID);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('a1');
    });

    it('should send Authorization header with bearer token', async () => {
      let receivedAuth = '';
      server.use(
        http.get(BASE, ({ request }) => {
          receivedAuth = request.headers.get('Authorization') || '';
          return HttpResponse.json({ assignments: [] });
        })
      );

      await shotAssetAssignmentService.listForScene(PROJECT_ID, SCENE_ID);
      expect(receivedAuth).toBe('Bearer test-token-123');
    });

    it('should throw on error response', async () => {
      server.use(
        http.get(BASE, () => {
          return HttpResponse.json({ error: 'Not found' }, { status: 404 });
        })
      );

      await expect(shotAssetAssignmentService.listForScene(PROJECT_ID, SCENE_ID))
        .rejects.toThrow('Not found');
    });
  });

  // =========================================================================
  // listForShot
  // =========================================================================

  describe('listForShot', () => {
    it('should GET assignments for a specific shot', async () => {
      const mockData = [
        { id: 'a1', shot_id: SHOT_ID, presence_type: 'enters' },
      ];
      server.use(
        http.get(`${BASE}/shots/${SHOT_ID}`, () => {
          return HttpResponse.json({ assignments: mockData });
        })
      );

      const result = await shotAssetAssignmentService.listForShot(PROJECT_ID, SCENE_ID, SHOT_ID);
      expect(result).toHaveLength(1);
      expect(result[0].presence_type).toBe('enters');
    });
  });

  // =========================================================================
  // createAssignments
  // =========================================================================

  describe('createAssignments', () => {
    it('should POST assignments and return created records', async () => {
      const createdData = [
        { id: 'a-new', shot_id: SHOT_ID, scene_asset_instance_id: 'i1', presence_type: 'throughout' },
      ];
      server.use(
        http.post(BASE, async ({ request }) => {
          const body = await request.json() as Record<string, unknown>;
          expect(body).toHaveProperty('assignments');
          return HttpResponse.json({ assignments: createdData }, { status: 201 });
        })
      );

      const result = await shotAssetAssignmentService.createAssignments(PROJECT_ID, SCENE_ID, [
        { shotId: SHOT_ID, instanceId: 'i1', presenceType: 'throughout' },
      ]);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('a-new');
    });

    it('should throw on API error', async () => {
      server.use(
        http.post(BASE, () => {
          return HttpResponse.json({ error: 'Invalid request body' }, { status: 400 });
        })
      );

      await expect(
        shotAssetAssignmentService.createAssignments(PROJECT_ID, SCENE_ID, [
          { shotId: SHOT_ID, instanceId: 'i1', presenceType: 'throughout' },
        ])
      ).rejects.toThrow('Invalid request body');
    });
  });

  // =========================================================================
  // updateAssignment
  // =========================================================================

  describe('updateAssignment', () => {
    it('should PUT updated presence_type', async () => {
      let receivedBody: any = null;
      server.use(
        http.put(`${BASE}/${ASSIGNMENT_ID}`, async ({ request }) => {
          receivedBody = await request.json();
          return HttpResponse.json({
            assignment: { id: ASSIGNMENT_ID, presence_type: 'exits' },
          });
        })
      );

      const result = await shotAssetAssignmentService.updateAssignment(
        PROJECT_ID, SCENE_ID, ASSIGNMENT_ID, 'exits'
      );
      expect(result.presence_type).toBe('exits');
      expect(receivedBody).toEqual({ presenceType: 'exits' });
    });
  });

  // =========================================================================
  // deleteAssignment
  // =========================================================================

  describe('deleteAssignment', () => {
    it('should DELETE the assignment', async () => {
      server.use(
        http.delete(`${BASE}/${ASSIGNMENT_ID}`, () => {
          return HttpResponse.json({ success: true });
        })
      );

      await expect(
        shotAssetAssignmentService.deleteAssignment(PROJECT_ID, SCENE_ID, ASSIGNMENT_ID)
      ).resolves.toBeUndefined();
    });

    it('should throw on error', async () => {
      server.use(
        http.delete(`${BASE}/${ASSIGNMENT_ID}`, () => {
          return HttpResponse.json({ error: 'Not found' }, { status: 404 });
        })
      );

      await expect(
        shotAssetAssignmentService.deleteAssignment(PROJECT_ID, SCENE_ID, ASSIGNMENT_ID)
      ).rejects.toThrow('Not found');
    });
  });

  // =========================================================================
  // autoPopulate
  // =========================================================================

  describe('autoPopulate', () => {
    it('should POST to auto-populate endpoint and return result', async () => {
      server.use(
        http.post(`${BASE}/auto-populate`, () => {
          return HttpResponse.json({ created: 6, existing: 0 });
        })
      );

      const result = await shotAssetAssignmentService.autoPopulate(PROJECT_ID, SCENE_ID);
      expect(result.created).toBe(6);
      expect(result.existing).toBe(0);
    });
  });

  // =========================================================================
  // hasAssignments
  // =========================================================================

  describe('hasAssignments', () => {
    it('should GET and return boolean', async () => {
      server.use(
        http.get(`${BASE}/has-assignments`, () => {
          return HttpResponse.json({ hasAssignments: true });
        })
      );

      const result = await shotAssetAssignmentService.hasAssignments(PROJECT_ID, SCENE_ID);
      expect(result).toBe(true);
    });

    it('should return false when no assignments exist', async () => {
      server.use(
        http.get(`${BASE}/has-assignments`, () => {
          return HttpResponse.json({ hasAssignments: false });
        })
      );

      const result = await shotAssetAssignmentService.hasAssignments(PROJECT_ID, SCENE_ID);
      expect(result).toBe(false);
    });
  });

  // =========================================================================
  // Auth failure
  // =========================================================================

  describe('authentication', () => {
    it('should throw when no session exists', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: { session: null },
        error: null,
      } as unknown as Awaited<ReturnType<typeof supabase.auth.getSession>>);

      await expect(shotAssetAssignmentService.listForScene(PROJECT_ID, SCENE_ID))
        .rejects.toThrow('User not authenticated');
    });
  });
});
