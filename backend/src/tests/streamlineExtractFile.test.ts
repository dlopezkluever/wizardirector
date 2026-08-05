/**
 * Streamline Phase 2/3 — POST /:projectId/streamline/extract-file route test.
 * Exercises the real multer + extraction pipeline end-to-end via supertest
 * multipart uploads. Classification and standalone-asset-drafting (Phase 3,
 * both LLM-backed) are mocked at the service level here — their own
 * correctness is covered by streamlineClassification.test.ts and
 * streamlineStandaloneAsset.test.ts; this file focuses on route behavior
 * (auth, ownership, multipart handling, error mapping).
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import { mockSupabaseTarget, configureSupabaseMock, type MockResult } from './helpers/supabaseMock.js';
import { app } from '../server.js';
import { classifyFile } from '../services/streamlineClassificationService.js';
import { extractStandaloneAssetDraft } from '../services/streamlineStandaloneAssetService.js';

jest.mock('../config/supabase.js', () => ({
  supabase: mockSupabaseTarget,
}));

jest.mock('../services/streamlineClassificationService.js', () => ({
  classifyFile: jest.fn(),
}));

jest.mock('../services/streamlineStandaloneAssetService.js', () => ({
  extractStandaloneAssetDraft: jest.fn(),
}));

const mockClassifyFile = classifyFile as jest.MockedFunction<typeof classifyFile>;
const mockExtractStandaloneAssetDraft = extractStandaloneAssetDraft as jest.MockedFunction<typeof extractStandaloneAssetDraft>;

const PROJECT_ID = '11111111-1111-1111-1111-111111111111';

function ok(data: unknown): MockResult {
  return { data, error: null };
}

describe('POST /api/projects/:projectId/streamline/extract-file', () => {
  beforeEach(() => {
    configureSupabaseMock([ok({ id: PROJECT_ID })]);
    mockClassifyFile.mockReset();
    mockExtractStandaloneAssetDraft.mockReset();
    mockClassifyFile.mockResolvedValue({ type: 'script', confidence: 0.95 });
  });

  it('extracts text from an uploaded .txt file and returns its classification', async () => {
    const res = await request(app)
      .post(`/api/projects/${PROJECT_ID}/streamline/extract-file`)
      .set('Authorization', 'Bearer test-token')
      .attach('file', Buffer.from('INT. KITCHEN - DAY\n\nMarcus stands alone.'), {
        filename: 'script.txt',
        contentType: 'text/plain',
      });

    expect(res.status).toBe(200);
    expect(res.body.text).toBe('INT. KITCHEN - DAY\n\nMarcus stands alone.');
    expect(res.body.classification).toEqual({ type: 'script', confidence: 0.95 });
    expect(res.body.filename).toBe('script.txt');
    expect(res.body.assetDraft).toBeUndefined();
  });

  it('enriches character_notes classifications with a standalone asset draft', async () => {
    mockClassifyFile.mockResolvedValue({ type: 'character_notes', confidence: 0.7 });
    mockExtractStandaloneAssetDraft.mockResolvedValue({ name: 'Marcus', type: 'character', description: 'A weary man.' });

    const res = await request(app)
      .post(`/api/projects/${PROJECT_ID}/streamline/extract-file`)
      .set('Authorization', 'Bearer test-token')
      .attach('file', Buffer.from('Marcus is tired.'), { filename: 'marcus.txt', contentType: 'text/plain' });

    expect(res.status).toBe(200);
    expect(res.body.assetDraft).toEqual({ name: 'Marcus', type: 'character', description: 'A weary man.' });
  });

  it('does not fail extraction if standalone asset drafting throws', async () => {
    mockClassifyFile.mockResolvedValue({ type: 'character_notes', confidence: 0.7 });
    mockExtractStandaloneAssetDraft.mockRejectedValue(new Error('LLM unavailable'));

    const res = await request(app)
      .post(`/api/projects/${PROJECT_ID}/streamline/extract-file`)
      .set('Authorization', 'Bearer test-token')
      .attach('file', Buffer.from('Marcus is tired.'), { filename: 'marcus.txt', contentType: 'text/plain' });

    expect(res.status).toBe(200);
    expect(res.body.assetDraft).toBeUndefined();
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
