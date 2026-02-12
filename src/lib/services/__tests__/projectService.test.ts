import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

// Mock supabase before importing projectService
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

import { projectService } from '../projectService';
import { supabase } from '@/lib/supabase';

// ── MSW Server ─────────────────────────────────────────────────────────

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// ── Tests ──────────────────────────────────────────────────────────────

describe('projectService', () => {
  describe('createProject', () => {
    it('should POST to /api/projects and return the created project', async () => {
      server.use(
        http.post('/api/projects', async ({ request }) => {
          const body = await request.json() as Record<string, unknown>;
          return HttpResponse.json({
            id: 'proj-123',
            title: body.title,
            created_at: '2026-02-12T00:00:00Z',
          });
        })
      );

      const result = await projectService.createProject({ title: 'My Film' });
      expect(result.id).toBe('proj-123');
      expect(result.title).toBe('My Film');
    });

    it('should send Authorization header with session token', async () => {
      let receivedAuth = '';
      server.use(
        http.post('/api/projects', ({ request }) => {
          receivedAuth = request.headers.get('Authorization') || '';
          return HttpResponse.json({ id: 'proj-1', title: 'Test' });
        })
      );

      await projectService.createProject({ title: 'Test' });
      expect(receivedAuth).toBe('Bearer test-token-123');
    });

    it('should throw on API error response', async () => {
      server.use(
        http.post('/api/projects', () => {
          return HttpResponse.json({ error: 'Title is required' }, { status: 400 });
        })
      );

      await expect(projectService.createProject({ title: '' }))
        .rejects.toThrow('Title is required');
    });
  });

  describe('getProject', () => {
    it('should GET /api/projects/:id and return the project', async () => {
      server.use(
        http.get('/api/projects/proj-456', () => {
          return HttpResponse.json({
            id: 'proj-456',
            title: 'Fetched Project',
          });
        })
      );

      const result = await projectService.getProject('proj-456');
      expect(result.id).toBe('proj-456');
      expect(result.title).toBe('Fetched Project');
    });

    it('should throw on 404', async () => {
      server.use(
        http.get('/api/projects/missing', () => {
          return HttpResponse.json({ error: 'Project not found' }, { status: 404 });
        })
      );

      await expect(projectService.getProject('missing'))
        .rejects.toThrow('Project not found');
    });
  });

  describe('listProjects', () => {
    it('should GET /api/projects and return an array', async () => {
      server.use(
        http.get('/api/projects', () => {
          return HttpResponse.json([
            { id: 'p1', title: 'Project 1' },
            { id: 'p2', title: 'Project 2' },
          ]);
        })
      );

      const result = await projectService.listProjects();
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Project 1');
    });
  });

  describe('deleteProject', () => {
    it('should DELETE /api/projects/:id without throwing', async () => {
      server.use(
        http.delete('/api/projects/proj-del', () => {
          return new HttpResponse(null, { status: 204 });
        })
      );

      await expect(projectService.deleteProject('proj-del')).resolves.toBeUndefined();
    });

    it('should throw on delete failure', async () => {
      server.use(
        http.delete('/api/projects/proj-fail', () => {
          return HttpResponse.json({ error: 'Forbidden' }, { status: 403 });
        })
      );

      await expect(projectService.deleteProject('proj-fail'))
        .rejects.toThrow('Forbidden');
    });
  });

  describe('authentication', () => {
    it('should throw when no session exists', async () => {
      // Override mock to return no session
      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: { session: null },
        error: null,
      } as unknown as Awaited<ReturnType<typeof supabase.auth.getSession>>);

      await expect(projectService.listProjects())
        .rejects.toThrow('User not authenticated');
    });
  });
});
