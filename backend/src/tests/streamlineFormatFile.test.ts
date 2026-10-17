/**
 * Streamline Phase 3 — POST /:projectId/streamline/format-file route test.
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import { mockSupabaseTarget, configureSupabaseMock, type MockResult } from './helpers/supabaseMock.js';
import { app } from '../server.js';
import { formatAsTreatment, formatAsBeatSheet } from '../services/streamlineFormattingService.js';

jest.mock('../config/supabase.js', () => ({
  supabase: mockSupabaseTarget,
}));

jest.mock('../services/streamlineFormattingService.js', () => ({
  formatAsTreatment: jest.fn(),
  formatAsBeatSheet: jest.fn(),
}));

const mockFormatAsTreatment = formatAsTreatment as jest.MockedFunction<typeof formatAsTreatment>;
const mockFormatAsBeatSheet = formatAsBeatSheet as jest.MockedFunction<typeof formatAsBeatSheet>;

const PROJECT_ID = '11111111-1111-1111-1111-111111111111';

function ok(data: unknown): MockResult {
  return { data, error: null };
}

describe('POST /api/projects/:projectId/streamline/format-file', () => {
  beforeEach(() => {
    configureSupabaseMock([ok({ id: PROJECT_ID })]);
    mockFormatAsTreatment.mockReset();
    mockFormatAsBeatSheet.mockReset();
  });

  it('formats as treatment', async () => {
    mockFormatAsTreatment.mockResolvedValue('A cohesive treatment.');

    const res = await request(app)
      .post(`/api/projects/${PROJECT_ID}/streamline/format-file`)
      .set('Authorization', 'Bearer test-token')
      .send({ text: 'loose notes', targetType: 'treatment' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ targetType: 'treatment', treatment: 'A cohesive treatment.' });
  });

  it('formats as beat sheet', async () => {
    mockFormatAsBeatSheet.mockResolvedValue({
      beats: [{ id: 'b1', order: 1, text: 'Setup', estimatedScreenTimeSeconds: 30 }],
      totalEstimatedRuntime: 30,
    });

    const res = await request(app)
      .post(`/api/projects/${PROJECT_ID}/streamline/format-file`)
      .set('Authorization', 'Bearer test-token')
      .send({ text: 'loose notes', targetType: 'beat_sheet' });

    expect(res.status).toBe(200);
    expect(res.body.beats).toHaveLength(1);
    expect(res.body.totalEstimatedRuntime).toBe(30);
  });

  it('rejects an invalid targetType', async () => {
    const res = await request(app)
      .post(`/api/projects/${PROJECT_ID}/streamline/format-file`)
      .set('Authorization', 'Bearer test-token')
      .send({ text: 'loose notes', targetType: 'script' });

    expect(res.status).toBe(400);
  });

  it('returns 404 when the project is not owned by the caller', async () => {
    configureSupabaseMock([{ data: null, error: { code: 'PGRST116' } }]);

    const res = await request(app)
      .post(`/api/projects/${PROJECT_ID}/streamline/format-file`)
      .set('Authorization', 'Bearer test-token')
      .send({ text: 'loose notes', targetType: 'treatment' });

    expect(res.status).toBe(404);
  });
});
