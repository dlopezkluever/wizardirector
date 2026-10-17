/**
 * Streamline Phase 1 — commit RPC wrapper route + backfill route request
 * handling (ownership checks, validation, error mapping). The RPC's own
 * transactional SQL logic is exercised by the migration itself, not here.
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

function setQueue(results: MockResult[]) {
  configureSupabaseMock(results);
}

describe('POST /api/projects/:projectId/streamline/commit', () => {
  beforeEach(() => {
    setQueue([]);
  });

  it('rejects a missing stageTransitions body', async () => {
    const res = await request(app)
      .post(`/api/projects/${PROJECT_ID}/streamline/commit`)
      .set('Authorization', 'Bearer test-token')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/stageTransitions is required/i);
  });

  it('returns 404 when the project is not owned by the caller', async () => {
    setQueue([{ data: null, error: { code: 'PGRST116' } }]);

    const res = await request(app)
      .post(`/api/projects/${PROJECT_ID}/streamline/commit`)
      .set('Authorization', 'Bearer test-token')
      .send({ stageTransitions: { '2': 'skip' } });

    expect(res.status).toBe(404);
  });

  it('calls the streamline_commit RPC and returns its result on success', async () => {
    setQueue([ok({ id: PROJECT_ID })]);
    mockSupabaseTarget.rpc.mockImplementationOnce(async () => ({
      data: { success: true, project_id: PROJECT_ID, branch_id: 'branch-1', stages: [] },
      error: null,
    }));

    const res = await request(app)
      .post(`/api/projects/${PROJECT_ID}/streamline/commit`)
      .set('Authorization', 'Bearer test-token')
      .send({ stageTransitions: { '1': 'locked', '2': 'skip', '3': 'skip' } });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockSupabaseTarget.rpc).toHaveBeenCalledWith('streamline_commit_atomic', {
      payload: expect.objectContaining({
        project_id: PROJECT_ID,
        stage_transitions: { '1': 'locked', '2': 'skip', '3': 'skip' },
      }),
    });
  });

  it('forwards project configuration and the Stage 1 draft in the atomic payload', async () => {
    setQueue([ok({ id: PROJECT_ID })]);
    mockSupabaseTarget.rpc.mockImplementationOnce(async () => ({
      data: { success: true, project_id: PROJECT_ID, branch_id: 'branch-1', stages: [] },
      error: null,
    }));

    const projectConfig = {
      project_type: 'narrative',
      content_rating: 'PG-13',
      genre: ['drama'],
      tonal_precision: 'quiet and tense',
      target_length_min: 180,
      target_length_max: 300,
      aspect_ratio: '16:9',
    };
    const stage1Draft = { content: { selectedProjectType: 'narrative' } };

    const res = await request(app)
      .post(`/api/projects/${PROJECT_ID}/streamline/commit`)
      .set('Authorization', 'Bearer test-token')
      .send({ stageTransitions: { '1': 'locked' }, projectConfig, stage1Draft });

    expect(res.status).toBe(200);
    expect(mockSupabaseTarget.rpc).toHaveBeenCalledWith('streamline_commit_atomic', {
      payload: expect.objectContaining({
        project_config: projectConfig,
        stage_1_draft: stage1Draft,
      }),
    });
  });

  it('maps an RPC exception to a 400 response', async () => {
    setQueue([ok({ id: PROJECT_ID })]);
    mockSupabaseTarget.rpc.mockImplementationOnce(async () => ({
      data: null,
      error: { message: 'streamline_commit: stage 2 cannot be skipped (only stages 2, 3, 4 are skippable)' },
    }));

    const res = await request(app)
      .post(`/api/projects/${PROJECT_ID}/streamline/commit`)
      .set('Authorization', 'Bearer test-token')
      .send({ stageTransitions: { '1': 'skip' } });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/cannot be skipped/i);
  });
});

describe('POST /api/projects/:projectId/streamline/backfill/:stageNumber', () => {
  beforeEach(() => {
    setQueue([]);
  });

  it('rejects a stage number other than 2 or 3', async () => {
    const res = await request(app)
      .post(`/api/projects/${PROJECT_ID}/streamline/backfill/4`)
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/only stages 2 and 3/i);
  });

  it('returns 404 when the project is not found', async () => {
    setQueue([{ data: null, error: { code: 'PGRST116' } }]);

    const res = await request(app)
      .post(`/api/projects/${PROJECT_ID}/streamline/backfill/2`)
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(404);
  });

  it('rejects backfilling a stage that is not currently skipped', async () => {
    setQueue([
      ok({ id: PROJECT_ID, active_branch_id: 'branch-1' }),
      ok({ id: 'state-id', version: 1, status: 'draft' }),
    ]);

    const res = await request(app)
      .post(`/api/projects/${PROJECT_ID}/streamline/backfill/2`)
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/is not currently skipped/i);
  });
});
