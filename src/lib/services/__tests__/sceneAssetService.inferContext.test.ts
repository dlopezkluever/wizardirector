/**
 * SceneAssetService – inferContext / bulkInferContext tests
 * Tests the Phase 2 Story Context Inference service methods.
 */

import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: { access_token: 'test-token-ctx' },
        },
      }),
    },
  },
}));

import { sceneAssetService } from '../sceneAssetService';
import { supabase } from '@/lib/supabase';

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('sceneAssetService – story context inference', () => {
  // ===========================================================================
  // inferContext (single asset)
  // ===========================================================================
  describe('inferContext', () => {
    it('should POST and return suggestion for a single asset', async () => {
      server.use(
        http.post(
          '/api/projects/proj-1/scenes/scene-1/assets/inst-1/infer-context',
          () => {
            return HttpResponse.json({
              suggested_description: 'Alice, soaked from rain, torn blue dress, visibly exhausted',
              suggested_tags: ['muddy', 'exhausted', 'torn_clothing'],
              reasoning: 'Scene script describes heavy rainfall and a chase sequence',
            });
          }
        )
      );

      const result = await sceneAssetService.inferContext('proj-1', 'scene-1', 'inst-1');

      expect(result.suggested_description).toContain('soaked from rain');
      expect(result.suggested_tags).toEqual(['muddy', 'exhausted', 'torn_clothing']);
      expect(result.reasoning).toContain('heavy rainfall');
    });

    it('should send Authorization header', async () => {
      let receivedAuth = '';
      server.use(
        http.post(
          '/api/projects/proj-1/scenes/scene-1/assets/inst-1/infer-context',
          ({ request }) => {
            receivedAuth = request.headers.get('Authorization') || '';
            return HttpResponse.json({
              suggested_description: 'desc',
              suggested_tags: [],
              reasoning: 'reason',
            });
          }
        )
      );

      await sceneAssetService.inferContext('proj-1', 'scene-1', 'inst-1');
      expect(receivedAuth).toBe('Bearer test-token-ctx');
    });

    it('should throw on API error', async () => {
      server.use(
        http.post(
          '/api/projects/proj-1/scenes/scene-1/assets/inst-bad/infer-context',
          () => HttpResponse.json({ error: 'Scene asset instance not found' }, { status: 404 })
        )
      );

      await expect(
        sceneAssetService.inferContext('proj-1', 'scene-1', 'inst-bad')
      ).rejects.toThrow('Scene asset instance not found');
    });

    it('should throw when not authenticated', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: { session: null },
        error: null,
      } as unknown as Awaited<ReturnType<typeof supabase.auth.getSession>>);

      await expect(
        sceneAssetService.inferContext('proj-1', 'scene-1', 'inst-1')
      ).rejects.toThrow('User not authenticated');
    });

    it('should throw on 500 server error', async () => {
      server.use(
        http.post(
          '/api/projects/proj-1/scenes/scene-1/assets/inst-1/infer-context',
          () => HttpResponse.json({ error: 'Story context inference failed' }, { status: 500 })
        )
      );

      await expect(
        sceneAssetService.inferContext('proj-1', 'scene-1', 'inst-1')
      ).rejects.toThrow('Story context inference failed');
    });
  });

  // ===========================================================================
  // bulkInferContext (multiple assets)
  // ===========================================================================
  describe('bulkInferContext', () => {
    it('should POST instanceIds and return results array', async () => {
      let capturedBody: Record<string, unknown> = {};
      server.use(
        http.post(
          '/api/projects/proj-1/scenes/scene-1/bulk-infer-context',
          async ({ request }) => {
            capturedBody = await request.json() as Record<string, unknown>;
            return HttpResponse.json({
              results: [
                {
                  instanceId: 'inst-1',
                  assetName: 'Alice',
                  assetType: 'character',
                  current_description: 'Alice, tall woman with brown hair',
                  suggested_description: 'Alice, soaked from rain, torn blue dress',
                  current_tags: [],
                  suggested_tags: ['muddy', 'exhausted'],
                  reasoning: 'Heavy rainfall in scene script',
                },
                {
                  instanceId: 'inst-2',
                  assetName: 'Bob',
                  assetType: 'character',
                  current_description: 'Bob in casual clothes',
                  suggested_description: 'Bob in formal black suit, confident posture',
                  current_tags: [],
                  suggested_tags: ['formal_attire', 'smiling'],
                  reasoning: 'Beat sheet indicates Bob arrives at the gala',
                },
              ],
            });
          }
        )
      );

      const result = await sceneAssetService.bulkInferContext(
        'proj-1', 'scene-1', ['inst-1', 'inst-2']
      );

      expect(capturedBody.instanceIds).toEqual(['inst-1', 'inst-2']);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].assetName).toBe('Alice');
      expect(result.results[0].suggested_tags).toContain('muddy');
      expect(result.results[1].assetName).toBe('Bob');
      expect(result.results[1].suggested_tags).toContain('formal_attire');
    });

    it('should send Authorization header', async () => {
      let receivedAuth = '';
      server.use(
        http.post(
          '/api/projects/proj-1/scenes/scene-1/bulk-infer-context',
          ({ request }) => {
            receivedAuth = request.headers.get('Authorization') || '';
            return HttpResponse.json({ results: [] });
          }
        )
      );

      await sceneAssetService.bulkInferContext('proj-1', 'scene-1', ['inst-1']);
      expect(receivedAuth).toBe('Bearer test-token-ctx');
    });

    it('should throw on API error', async () => {
      server.use(
        http.post(
          '/api/projects/proj-1/scenes/scene-bad/bulk-infer-context',
          () => HttpResponse.json({ error: 'Scene not found' }, { status: 404 })
        )
      );

      await expect(
        sceneAssetService.bulkInferContext('proj-1', 'scene-bad', ['inst-1'])
      ).rejects.toThrow('Scene not found');
    });

    it('should throw when not authenticated', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: { session: null },
        error: null,
      } as unknown as Awaited<ReturnType<typeof supabase.auth.getSession>>);

      await expect(
        sceneAssetService.bulkInferContext('proj-1', 'scene-1', ['inst-1'])
      ).rejects.toThrow('User not authenticated');
    });

    it('should handle empty results gracefully', async () => {
      server.use(
        http.post(
          '/api/projects/proj-1/scenes/scene-1/bulk-infer-context',
          () => HttpResponse.json({ results: [] })
        )
      );

      const result = await sceneAssetService.bulkInferContext(
        'proj-1', 'scene-1', ['inst-1']
      );

      expect(result.results).toEqual([]);
    });

    it('should handle results with no changes', async () => {
      server.use(
        http.post(
          '/api/projects/proj-1/scenes/scene-1/bulk-infer-context',
          () => HttpResponse.json({
            results: [
              {
                instanceId: 'inst-3',
                assetName: 'Kitchen Table',
                assetType: 'prop',
                current_description: 'A wooden kitchen table',
                suggested_description: 'A wooden kitchen table',
                current_tags: [],
                suggested_tags: [],
                reasoning: 'No changes needed - asset description is already accurate',
              },
            ],
          })
        )
      );

      const result = await sceneAssetService.bulkInferContext(
        'proj-1', 'scene-1', ['inst-3']
      );

      expect(result.results[0].suggested_description).toBe(result.results[0].current_description);
      expect(result.results[0].suggested_tags).toEqual([]);
    });
  });
});
