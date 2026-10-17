/**
 * Streamline Phase 4 — POST /:projectId/streamline/analyze and
 * POST /:projectId/streamline/reconcile route tests.
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import { mockSupabaseTarget, configureSupabaseMock, type MockResult } from './helpers/supabaseMock.js';
import { app } from '../server.js';
import { analyzeBatch } from '../services/streamlineQuestionService.js';
import { reconcileDocuments } from '../services/streamlineReconciliationService.js';

jest.mock('../config/supabase.js', () => ({
  supabase: mockSupabaseTarget,
}));

jest.mock('../services/streamlineQuestionService.js', () => ({
  analyzeBatch: jest.fn(),
}));

jest.mock('../services/streamlineReconciliationService.js', () => ({
  reconcileDocuments: jest.fn(),
}));

const mockAnalyzeBatch = analyzeBatch as jest.MockedFunction<typeof analyzeBatch>;
const mockReconcileDocuments = reconcileDocuments as jest.MockedFunction<typeof reconcileDocuments>;

const PROJECT_ID = '11111111-1111-1111-1111-111111111111';

function ok(data: unknown): MockResult {
  return { data, error: null };
}

describe('POST /api/projects/:projectId/streamline/analyze', () => {
  beforeEach(() => {
    configureSupabaseMock([ok({ id: PROJECT_ID })]);
    mockAnalyzeBatch.mockReset();
  });

  it('returns the questions from analyzeBatch', async () => {
    mockAnalyzeBatch.mockResolvedValue([
      { id: 'q1', category: 'contradiction', questionText: 'Which name?', options: [{ id: 'o1', label: 'Marcus' }, { id: 'o2', label: 'Marc' }] },
    ]);

    const res = await request(app)
      .post(`/api/projects/${PROJECT_ID}/streamline/analyze`)
      .set('Authorization', 'Bearer test-token')
      .send({ files: [{ id: 'f1', name: 'script.txt', text: 'INT. HOUSE', isPrimary: true }] });

    expect(res.status).toBe(200);
    expect(res.body.questions).toHaveLength(1);
  });

  it('returns an empty questions array (no session offered) rather than an error when there is nothing to ask', async () => {
    mockAnalyzeBatch.mockResolvedValue([]);

    const res = await request(app)
      .post(`/api/projects/${PROJECT_ID}/streamline/analyze`)
      .set('Authorization', 'Bearer test-token')
      .send({ files: [{ id: 'f1', name: 'script.txt', text: 'INT. HOUSE', isPrimary: true }] });

    expect(res.status).toBe(200);
    expect(res.body.questions).toEqual([]);
  });

  it('rejects a missing files array', async () => {
    const res = await request(app)
      .post(`/api/projects/${PROJECT_ID}/streamline/analyze`)
      .set('Authorization', 'Bearer test-token')
      .send({});

    expect(res.status).toBe(400);
  });

  it('returns 404 when the project is not owned by the caller', async () => {
    configureSupabaseMock([{ data: null, error: { code: 'PGRST116' } }]);

    const res = await request(app)
      .post(`/api/projects/${PROJECT_ID}/streamline/analyze`)
      .set('Authorization', 'Bearer test-token')
      .send({ files: [{ id: 'f1', name: 'a.txt', text: 'x', isPrimary: true }] });

    expect(res.status).toBe(404);
  });
});

describe('POST /api/projects/:projectId/streamline/reconcile', () => {
  beforeEach(() => {
    configureSupabaseMock([ok({ id: PROJECT_ID })]);
    mockReconcileDocuments.mockReset();
  });

  it('returns the reconciled documents', async () => {
    mockReconcileDocuments.mockResolvedValue([
      { fileId: 'f1', fileName: 'notes.txt', editScope: 'word_patch', reconciledText: 'Marcus', diffSummary: 'Fixed name' },
    ]);

    const res = await request(app)
      .post(`/api/projects/${PROJECT_ID}/streamline/reconcile`)
      .set('Authorization', 'Bearer test-token')
      .send({
        files: [{ id: 'f1', name: 'notes.txt', text: 'Marc', isPrimary: true }],
        qaPairs: [{ questionText: 'Which name?', selectedAnswer: 'Marcus' }],
      });

    expect(res.status).toBe(200);
    expect(res.body.reconciledDocuments).toHaveLength(1);
  });

  it('rejects a missing qaPairs field', async () => {
    const res = await request(app)
      .post(`/api/projects/${PROJECT_ID}/streamline/reconcile`)
      .set('Authorization', 'Bearer test-token')
      .send({ files: [{ id: 'f1', name: 'a.txt', text: 'x', isPrimary: true }] });

    expect(res.status).toBe(400);
  });

  it('returns 404 when the project is not owned by the caller', async () => {
    configureSupabaseMock([{ data: null, error: { code: 'PGRST116' } }]);

    const res = await request(app)
      .post(`/api/projects/${PROJECT_ID}/streamline/reconcile`)
      .set('Authorization', 'Bearer test-token')
      .send({ files: [{ id: 'f1', name: 'a.txt', text: 'x', isPrimary: true }], qaPairs: [] });

    expect(res.status).toBe(404);
  });
});
