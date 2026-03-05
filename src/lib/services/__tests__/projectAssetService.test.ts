/**
 * ProjectAssetService Tests — mergeDescriptions + updateAsset (type change)
 *
 * Tests the new Phase A frontend service methods.
 */

import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

// Mock supabase before importing service
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

import { projectAssetService } from '../projectAssetService';
import { supabase } from '@/lib/supabase';

// ── MSW Server ─────────────────────────────────────────────────────────

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// ── Tests ──────────────────────────────────────────────────────────────

describe('projectAssetService', () => {
  // =====================================================================
  // mergeDescriptions
  // =====================================================================

  describe('mergeDescriptions', () => {
    it('should POST descriptions and return merged text', async () => {
      server.use(
        http.post('/api/projects/proj-1/assets/merge-descriptions', async ({ request }) => {
          const body = await request.json() as Record<string, unknown>;
          expect(body.descriptions).toEqual(['Desc A', 'Desc B']);
          return HttpResponse.json({
            mergedDescription: 'Combined description of A and B.',
          });
        })
      );

      const result = await projectAssetService.mergeDescriptions('proj-1', ['Desc A', 'Desc B']);
      expect(result).toBe('Combined description of A and B.');
    });

    it('should send Authorization header', async () => {
      let receivedAuth = '';
      server.use(
        http.post('/api/projects/proj-1/assets/merge-descriptions', ({ request }) => {
          receivedAuth = request.headers.get('Authorization') || '';
          return HttpResponse.json({ mergedDescription: 'merged' });
        })
      );

      await projectAssetService.mergeDescriptions('proj-1', ['a', 'b']);
      expect(receivedAuth).toBe('Bearer test-token-123');
    });

    it('should throw on API error', async () => {
      server.use(
        http.post('/api/projects/proj-1/assets/merge-descriptions', () => {
          return HttpResponse.json({ error: 'at least 2 strings' }, { status: 400 });
        })
      );

      await expect(projectAssetService.mergeDescriptions('proj-1', ['only one']))
        .rejects.toThrow('at least 2 strings');
    });

    it('should throw when not authenticated', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: { session: null },
        error: null,
      } as unknown as Awaited<ReturnType<typeof supabase.auth.getSession>>);

      await expect(projectAssetService.mergeDescriptions('proj-1', ['a', 'b']))
        .rejects.toThrow('User not authenticated');
    });
  });

  // =====================================================================
  // updateAsset — asset_type field
  // =====================================================================

  describe('updateAsset (asset_type)', () => {
    it('should PUT with asset_type and return updated asset', async () => {
      server.use(
        http.put('/api/projects/proj-1/assets/asset-1', async ({ request }) => {
          const body = await request.json() as Record<string, unknown>;
          expect(body.asset_type).toBe('location');
          return HttpResponse.json({
            id: 'asset-1',
            asset_type: 'location',
            name: 'Test Asset',
          });
        })
      );

      const result = await projectAssetService.updateAsset('proj-1', 'asset-1', {
        asset_type: 'location',
      });
      expect(result.asset_type).toBe('location');
    });

    it('should handle error when changing type on locked asset', async () => {
      server.use(
        http.put('/api/projects/proj-1/assets/locked-1', () => {
          return HttpResponse.json(
            { error: 'Cannot modify locked asset' },
            { status: 400 }
          );
        })
      );

      await expect(
        projectAssetService.updateAsset('proj-1', 'locked-1', { asset_type: 'prop' })
      ).rejects.toThrow('Cannot modify locked asset');
    });
  });

  // =====================================================================
  // mergeAssets — updatedDescription field
  // =====================================================================

  describe('mergeAssets (updatedDescription)', () => {
    it('should include updatedDescription in merge request', async () => {
      let capturedBody: Record<string, unknown> = {};
      server.use(
        http.post('/api/projects/proj-1/assets/merge', async ({ request }) => {
          capturedBody = await request.json() as Record<string, unknown>;
          return HttpResponse.json({
            success: true,
            survivor: { id: 'survivor', name: 'Merged' },
            instancesRepointed: 1,
            assetsAbsorbed: 1,
            assignmentsMigrated: 0,
          });
        })
      );

      await projectAssetService.mergeAssets('proj-1', {
        survivorAssetId: 'survivor',
        absorbedAssetIds: ['absorbed-1'],
        updatedName: 'Merged',
        updatedDescription: 'A merged description.',
      });

      expect(capturedBody.updatedDescription).toBe('A merged description.');
    });

    it('should return assignmentsMigrated in response', async () => {
      server.use(
        http.post('/api/projects/proj-1/assets/merge', () => {
          return HttpResponse.json({
            success: true,
            survivor: { id: 'survivor' },
            instancesRepointed: 0,
            assetsAbsorbed: 1,
            assignmentsMigrated: 3,
          });
        })
      );

      const result = await projectAssetService.mergeAssets('proj-1', {
        survivorAssetId: 'survivor',
        absorbedAssetIds: ['absorbed-1'],
      });

      expect(result.assignmentsMigrated).toBe(3);
    });
  });
});
