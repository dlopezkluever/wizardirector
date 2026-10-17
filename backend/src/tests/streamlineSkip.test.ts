/**
 * Streamline Phase 1 — skip endpoint validation + lock endpoint's updated
 * sequential check. Mocks the Supabase client entirely (no live DB / pending
 * migration needed) so these can run standalone.
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
// Must be imported before ../server.js: jest.mock() below is hoisted above all
// imports in THIS file, but ../server.js's own transitive require of
// ../config/supabase.js still runs in source order relative to this import —
// mockSupabaseTarget must already be initialized by the time that happens.
import { mockSupabaseTarget, configureSupabaseMock, type MockResult } from './helpers/supabaseMock.js';
import { app } from '../server.js';

jest.mock('../config/supabase.js', () => ({
  supabase: mockSupabaseTarget,
}));

const PROJECT_ID = '11111111-1111-1111-1111-111111111111';
const BRANCH_ID = '22222222-2222-2222-2222-222222222222';

function ok(data: unknown): MockResult {
  return { data, error: null };
}

function setQueue(results: MockResult[]) {
  configureSupabaseMock(results);
}

describe('POST /api/projects/:projectId/stages/:stageNumber/skip', () => {
  beforeEach(() => {
    setQueue([]);
  });

  it('rejects stage 1', async () => {
    const res = await request(app)
      .post(`/api/projects/${PROJECT_ID}/stages/1/skip`)
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/only stages 2, 3, and 4/i);
  });

  it('rejects stage 5', async () => {
    const res = await request(app)
      .post(`/api/projects/${PROJECT_ID}/stages/5/skip`)
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/only stages 2, 3, and 4/i);
  });

  it('rejects out-of-order skip (previous stage neither locked nor skipped)', async () => {
    setQueue([
      ok({ id: PROJECT_ID, active_branch_id: BRANCH_ID }), // project lookup
      ok({ id: 'prev-state-id', status: 'draft' }),        // previous stage (stage 1) — draft, not locked/skipped
    ]);

    const res = await request(app)
      .post(`/api/projects/${PROJECT_ID}/stages/2/skip`)
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/stage 1 must be locked or skipped first/i);
  });

  it('rejects skipping over an already-locked stage', async () => {
    setQueue([
      ok({ id: PROJECT_ID, active_branch_id: BRANCH_ID }),   // project lookup
      ok({ id: 'prev-state-id', status: 'locked' }),         // previous stage locked
      ok({ id: 'current-state-id', version: 1, status: 'locked' }), // current stage already locked
    ]);

    const res = await request(app)
      .post(`/api/projects/${PROJECT_ID}/stages/2/skip`)
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already has locked content/i);
  });

  it('skips a stage when the previous stage is locked and this stage has no locked content', async () => {
    setQueue([
      ok({ id: PROJECT_ID, active_branch_id: BRANCH_ID }),         // project lookup
      ok({ id: 'prev-state-id', status: 'locked' }),               // previous stage locked
      ok(null),                                                     // current stage: no existing row
      ok({ id: 'new-skip-id', stage_number: 2, version: 1, status: 'skipped', origin: 'skipped', content: {} }), // insert
      ok(null),                                                     // project.updated_at touch
    ]);

    const res = await request(app)
      .post(`/api/projects/${PROJECT_ID}/stages/2/skip`)
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('skipped');
    expect(res.body.origin).toBe('skipped');
  });

  it('skips a stage when the previous stage was itself skipped (generalizes the sequential check)', async () => {
    setQueue([
      ok({ id: PROJECT_ID, active_branch_id: BRANCH_ID }),
      ok({ id: 'prev-state-id', status: 'skipped' }), // previous stage skipped, not locked
      ok(null),
      ok({ id: 'new-skip-id', stage_number: 3, version: 1, status: 'skipped', origin: 'skipped', content: {} }),
      ok(null),
    ]);

    const res = await request(app)
      .post(`/api/projects/${PROJECT_ID}/stages/3/skip`)
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('skipped');
  });
});

describe('POST /api/projects/:projectId/stages/:stageNumber/lock — updated sequential check', () => {
  beforeEach(() => {
    setQueue([]);
  });

  it('rejects locking stage N when stage N-1 is still draft', async () => {
    setQueue([
      ok({ id: PROJECT_ID, active_branch_id: BRANCH_ID }),                       // project lookup
      ok({ id: 'current-id', version: 1, status: 'draft', content: {}, regeneration_guidance: '' }), // current state to lock
      ok({ id: 'prev-id', status: 'draft' }),                                     // previous stage — draft
    ]);

    const res = await request(app)
      .post(`/api/projects/${PROJECT_ID}/stages/4/lock`)
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/must be locked or skipped first/i);
  });

  it('allows locking stage N when stage N-1 is skipped (not just locked)', async () => {
    setQueue([
      ok({ id: PROJECT_ID, active_branch_id: BRANCH_ID }),
      ok({ id: 'current-id', version: 1, status: 'draft', content: { formattedScript: 'INT. HOUSE - DAY' }, regeneration_guidance: '' }),
      ok({ id: 'prev-id', status: 'skipped' }), // previous stage skipped — should now be accepted
      ok({ id: 'locked-id', stage_number: 4, version: 2, status: 'locked' }), // insert result
    ]);

    const res = await request(app)
      .post(`/api/projects/${PROJECT_ID}/stages/4/lock`)
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('locked');
  });
});
