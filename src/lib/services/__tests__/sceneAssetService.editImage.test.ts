/**
 * SceneAssetService – startEditImageJob / analyzeSceneAssetImage tests
 * Tests the 3.7 Phase 1 Enhanced Upload Modal service methods for Stage 8.
 */

import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: { access_token: 'test-token-456' },
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

describe('sceneAssetService – editImage methods', () => {
  // ===========================================================================
  // startEditImageJob
  // ===========================================================================
  describe('startEditImageJob', () => {
    it('should POST edit instructions and return job', async () => {
      let capturedBody: Record<string, unknown> = {};
      server.use(
        http.post(
          '/api/projects/proj-1/scenes/scene-1/assets/inst-1/edit-image',
          async ({ request }) => {
            capturedBody = await request.json() as Record<string, unknown>;
            return HttpResponse.json({ jobId: 'scene-job-1', status: 'queued' });
          }
        )
      );

      const result = await sceneAssetService.startEditImageJob(
        'proj-1', 'scene-1', 'inst-1',
        {
          referenceImageUrl: 'https://example.com/scene-img.png',
          editInstructions: 'add scar on left cheek',
          description: 'A warrior in armor',
        }
      );

      expect(result.jobId).toBe('scene-job-1');
      expect(capturedBody.editInstructions).toBe('add scar on left cheek');
      expect(capturedBody.referenceImageUrl).toBe('https://example.com/scene-img.png');
      expect(capturedBody.description).toBe('A warrior in armor');
    });

    it('should POST with removeBackground for background removal', async () => {
      let capturedBody: Record<string, unknown> = {};
      server.use(
        http.post(
          '/api/projects/proj-1/scenes/scene-1/assets/inst-1/edit-image',
          async ({ request }) => {
            capturedBody = await request.json() as Record<string, unknown>;
            return HttpResponse.json({ jobId: 'scene-job-bg', status: 'queued' });
          }
        )
      );

      await sceneAssetService.startEditImageJob(
        'proj-1', 'scene-1', 'inst-1',
        {
          referenceImageUrl: 'https://example.com/scene-img.png',
          description: 'A prop sword',
          removeBackground: true,
        }
      );

      expect(capturedBody.removeBackground).toBe(true);
    });

    it('should POST without reference for regeneration', async () => {
      let capturedBody: Record<string, unknown> = {};
      server.use(
        http.post(
          '/api/projects/proj-1/scenes/scene-2/assets/inst-2/edit-image',
          async ({ request }) => {
            capturedBody = await request.json() as Record<string, unknown>;
            return HttpResponse.json({ jobId: 'scene-job-regen', status: 'queued' });
          }
        )
      );

      await sceneAssetService.startEditImageJob(
        'proj-1', 'scene-2', 'inst-2',
        { description: 'A dark alley at night' }
      );

      expect(capturedBody.referenceImageUrl).toBeUndefined();
      expect(capturedBody.description).toBe('A dark alley at night');
    });

    it('should send Authorization header', async () => {
      let receivedAuth = '';
      server.use(
        http.post(
          '/api/projects/proj-1/scenes/scene-1/assets/inst-1/edit-image',
          ({ request }) => {
            receivedAuth = request.headers.get('Authorization') || '';
            return HttpResponse.json({ jobId: 'j', status: 'queued' });
          }
        )
      );

      await sceneAssetService.startEditImageJob(
        'proj-1', 'scene-1', 'inst-1',
        { description: 'test' }
      );

      expect(receivedAuth).toBe('Bearer test-token-456');
    });

    it('should throw on API error', async () => {
      server.use(
        http.post(
          '/api/projects/proj-1/scenes/scene-1/assets/inst-bad/edit-image',
          () => HttpResponse.json({ error: 'Instance not found' }, { status: 404 })
        )
      );

      await expect(
        sceneAssetService.startEditImageJob(
          'proj-1', 'scene-1', 'inst-bad',
          { description: 'test' }
        )
      ).rejects.toThrow('Instance not found');
    });

    it('should throw when not authenticated', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: { session: null },
        error: null,
      } as unknown as Awaited<ReturnType<typeof supabase.auth.getSession>>);

      await expect(
        sceneAssetService.startEditImageJob(
          'proj-1', 'scene-1', 'inst-1',
          { description: 'test' }
        )
      ).rejects.toThrow('User not authenticated');
    });
  });

  // ===========================================================================
  // analyzeSceneAssetImage
  // ===========================================================================
  describe('analyzeSceneAssetImage', () => {
    it('should POST and return analysis result', async () => {
      server.use(
        http.post(
          '/api/projects/proj-1/scenes/scene-1/assets/inst-1/analyze-image',
          () => {
            return HttpResponse.json({
              extractedDescription: 'A warrior with plate armor and a shield',
              suggestedMerge: 'A warrior in heavy plate armor carrying a round shield',
              confidence: 0.87,
            });
          }
        )
      );

      const result = await sceneAssetService.analyzeSceneAssetImage(
        'proj-1', 'scene-1', 'inst-1'
      );

      expect(result.extractedDescription).toBe('A warrior with plate armor and a shield');
      expect(result.suggestedMerge).toContain('plate armor');
      expect(result.confidence).toBe(0.87);
    });

    it('should send Authorization header', async () => {
      let receivedAuth = '';
      server.use(
        http.post(
          '/api/projects/proj-1/scenes/scene-1/assets/inst-1/analyze-image',
          ({ request }) => {
            receivedAuth = request.headers.get('Authorization') || '';
            return HttpResponse.json({
              extractedDescription: 'desc',
              suggestedMerge: 'merge',
              confidence: 0.5,
            });
          }
        )
      );

      await sceneAssetService.analyzeSceneAssetImage('proj-1', 'scene-1', 'inst-1');
      expect(receivedAuth).toBe('Bearer test-token-456');
    });

    it('should throw on API error', async () => {
      server.use(
        http.post(
          '/api/projects/proj-1/scenes/scene-1/assets/inst-none/analyze-image',
          () => HttpResponse.json({ error: 'Scene asset has no image to analyze' }, { status: 400 })
        )
      );

      await expect(
        sceneAssetService.analyzeSceneAssetImage('proj-1', 'scene-1', 'inst-none')
      ).rejects.toThrow('Scene asset has no image to analyze');
    });

    it('should throw when not authenticated', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: { session: null },
        error: null,
      } as unknown as Awaited<ReturnType<typeof supabase.auth.getSession>>);

      await expect(
        sceneAssetService.analyzeSceneAssetImage('proj-1', 'scene-1', 'inst-1')
      ).rejects.toThrow('User not authenticated');
    });
  });
});
