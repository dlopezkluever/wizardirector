/**
 * Streamline Phase 2 — POST /:projectId/streamline/extract-file route test.
 * Exercises the real multer + extraction pipeline end-to-end via supertest
 * multipart uploads (only Supabase's project-ownership lookup is mocked).
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import { mockSupabaseTarget, configureSupabaseMock, type MockResult } from './helpers/supabaseMock.js';
import { app } from '../server.js';

jest.mock('../config/supabase.js', () => ({
  supabase: mockSupabaseTarget,
}));

const PROJECT_ID = '11111111-1111-1111-1111-111111111111';

function ok(data: unknown): MockResult {
  return { data, error: null };
}

describe('POST /api/projects/:projectId/streamline/extract-file', () => {
  beforeEach(() => {
    configureSupabaseMock([ok({ id: PROJECT_ID })]);
  });

  it('extracts text from an uploaded .txt file and returns a stubbed classification', async () => {
    const res = await request(app)
      .post(`/api/projects/${PROJECT_ID}/streamline/extract-file`)
      .set('Authorization', 'Bearer test-token')
      .attach('file', Buffer.from('INT. KITCHEN - DAY\n\nMarcus stands alone.'), {
        filename: 'script.txt',
        contentType: 'text/plain',
      });

    expect(res.status).toBe(200);
    expect(res.body.text).toBe('INT. KITCHEN - DAY\n\nMarcus stands alone.');
    expect(res.body.classification).toEqual({ type: 'unclassified', confidence: 0 });
    expect(res.body.filename).toBe('script.txt');
  });

  it('rejects a legacy .doc file with a clear message', async () => {
    const res = await request(app)
      .post(`/api/projects/${PROJECT_ID}/streamline/extract-file`)
      .set('Authorization', 'Bearer test-token')
      .attach('file', Buffer.from('legacy doc bytes'), {
        filename: 'old.doc',
        contentType: 'application/msword',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/save as \.docx or \.pdf/i);
  });

  it('returns 400 when no file is attached', async () => {
    const res = await request(app)
      .post(`/api/projects/${PROJECT_ID}/streamline/extract-file`)
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no file uploaded/i);
  });

  it('rejects an oversized file', async () => {
    const oversized = Buffer.alloc(21 * 1024 * 1024, 'a');

    const res = await request(app)
      .post(`/api/projects/${PROJECT_ID}/streamline/extract-file`)
      .set('Authorization', 'Bearer test-token')
      .attach('file', oversized, { filename: 'huge.txt', contentType: 'text/plain' });

    expect(res.status).toBeGreaterThanOrEqual(400);
  }, 30000);

  it('returns 404 when the project is not owned by the caller', async () => {
    configureSupabaseMock([{ data: null, error: { code: 'PGRST116' } }]);

    const res = await request(app)
      .post(`/api/projects/${PROJECT_ID}/streamline/extract-file`)
      .set('Authorization', 'Bearer test-token')
      .attach('file', Buffer.from('hello'), { filename: 'notes.txt', contentType: 'text/plain' });

    expect(res.status).toBe(404);
  });
});
