/**
 * ProjectAssetService – editImage / startEditImageJob / getImageJobStatus tests
 * Tests the 3.7 Phase 1 Enhanced Upload Modal service methods.
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

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('projectAssetService – editImage methods', () => {
  // ===========================================================================
  // startEditImageJob
  // ===========================================================================
  describe('startEditImageJob', () => {
    it('should POST edit instructions + reference image and return job', async () => {
      let capturedBody: Record<string, unknown> = {};
      server.use(
        http.post('/api/projects/proj-1/assets/asset-1/edit-image', async ({ request }) => {
          capturedBody = await request.json() as Record<string, unknown>;
          return HttpResponse.json({ jobId: 'job-abc', status: 'queued' });
        })
      );

      const result = await projectAssetService.startEditImageJob('proj-1', 'asset-1', {
        referenceImageUrl: 'https://example.com/img.png',
        editInstructions: 'change suit to orange',
        description: 'A man in a suit',
      });

      expect(result.jobId).toBe('job-abc');
      expect(result.status).toBe('queued');
      expect(capturedBody.referenceImageUrl).toBe('https://example.com/img.png');
      expect(capturedBody.editInstructions).toBe('change suit to orange');
      expect(capturedBody.description).toBe('A man in a suit');
    });

    it('should POST with removeBackground flag', async () => {
      let capturedBody: Record<string, unknown> = {};
      server.use(
        http.post('/api/projects/proj-1/assets/asset-1/edit-image', async ({ request }) => {
          capturedBody = await request.json() as Record<string, unknown>;
          return HttpResponse.json({ jobId: 'job-bg', status: 'queued' });
        })
      );

      await projectAssetService.startEditImageJob('proj-1', 'asset-1', {
        referenceImageUrl: 'https://example.com/img.png',
        description: 'A character',
        removeBackground: true,
      });

      expect(capturedBody.removeBackground).toBe(true);
      expect(capturedBody.editInstructions).toBeUndefined();
    });

    it('should POST without reference image for regeneration', async () => {
      let capturedBody: Record<string, unknown> = {};
      server.use(
        http.post('/api/projects/proj-1/assets/asset-1/edit-image', async ({ request }) => {
          capturedBody = await request.json() as Record<string, unknown>;
          return HttpResponse.json({ jobId: 'job-regen', status: 'queued' });
        })
      );

      await projectAssetService.startEditImageJob('proj-1', 'asset-1', {
        description: 'A tall character in a red cloak',
      });

      expect(capturedBody.description).toBe('A tall character in a red cloak');
      expect(capturedBody.referenceImageUrl).toBeUndefined();
      expect(capturedBody.editInstructions).toBeUndefined();
    });

    it('should send Authorization header', async () => {
      let receivedAuth = '';
      server.use(
        http.post('/api/projects/proj-1/assets/asset-1/edit-image', ({ request }) => {
          receivedAuth = request.headers.get('Authorization') || '';
          return HttpResponse.json({ jobId: 'job-1', status: 'queued' });
        })
      );

      await projectAssetService.startEditImageJob('proj-1', 'asset-1', {
        description: 'test',
      });

      expect(receivedAuth).toBe('Bearer test-token-123');
    });

    it('should throw on API error', async () => {
      server.use(
        http.post('/api/projects/proj-1/assets/asset-1/edit-image', () => {
          return HttpResponse.json({ error: 'Asset not found' }, { status: 404 });
        })
      );

      await expect(
        projectAssetService.startEditImageJob('proj-1', 'asset-1', {
          description: 'test',
        })
      ).rejects.toThrow('Asset not found');
    });

    it('should throw when not authenticated', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: { session: null },
        error: null,
      } as unknown as Awaited<ReturnType<typeof supabase.auth.getSession>>);

      await expect(
        projectAssetService.startEditImageJob('proj-1', 'asset-1', {
          description: 'test',
        })
      ).rejects.toThrow('User not authenticated');
    });
  });

  // ===========================================================================
  // getImageJobStatus
  // ===========================================================================
  describe('getImageJobStatus', () => {
    it('should GET job status and return result', async () => {
      server.use(
        http.get('/api/images/jobs/job-123', () => {
          return HttpResponse.json({
            status: 'completed',
            publicUrl: 'https://storage.example.com/img.png',
          });
        })
      );

      const result = await projectAssetService.getImageJobStatus('job-123');

      expect(result.status).toBe('completed');
      expect(result.publicUrl).toBe('https://storage.example.com/img.png');
    });

    it('should return in-progress status', async () => {
      server.use(
        http.get('/api/images/jobs/job-456', () => {
          return HttpResponse.json({ status: 'generating' });
        })
      );

      const result = await projectAssetService.getImageJobStatus('job-456');
      expect(result.status).toBe('generating');
      expect(result.publicUrl).toBeUndefined();
    });

    it('should return failed status with error', async () => {
      server.use(
        http.get('/api/images/jobs/job-fail', () => {
          return HttpResponse.json({
            status: 'failed',
            error: { message: 'Provider timeout' },
          });
        })
      );

      const result = await projectAssetService.getImageJobStatus('job-fail');
      expect(result.status).toBe('failed');
      expect(result.error?.message).toBe('Provider timeout');
    });

    it('should throw on network error', async () => {
      server.use(
        http.get('/api/images/jobs/job-err', () => {
          return HttpResponse.json({ error: 'Not found' }, { status: 404 });
        })
      );

      await expect(
        projectAssetService.getImageJobStatus('job-err')
      ).rejects.toThrow('Failed to fetch job status');
    });
  });
});
