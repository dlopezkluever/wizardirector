/**
 * Shot List Locking Integration Tests (Plan 4.5 Task 11)
 * Tests for POST .../shots/lock and POST .../shots/unlock.
 * Uses a minimal app (projects router only) to avoid loading full server and other routes.
 * Full lock/unlock tests require a real project, scene, shots, and auth token (manual or E2E).
 */

import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { projectsRouter } from '../routes/projects.js';
import { authenticateUser } from '../middleware/auth.js';
import { errorHandler } from '../middleware/errorHandler.js';

const app = express();
app.use(express.json());
app.use('/api/projects', authenticateUser, projectsRouter);
app.use(errorHandler);

// Placeholders for integration tests that need real DB + auth
const projectId = process.env.TEST_PROJECT_ID ?? '00000000-0000-0000-0000-000000000001';
const sceneId = process.env.TEST_SCENE_ID ?? '00000000-0000-0000-0000-000000000002';
const token = process.env.TEST_AUTH_TOKEN ?? '';

describe('Shot List Locking Endpoints', () => {
  describe('POST /api/projects/:id/scenes/:sceneId/shots/lock', () => {
    it('should return 401 when not authenticated', async () => {
      const res = await request(app)
        .post(`/api/projects/${projectId}/scenes/${sceneId}/shots/lock`)
        .set('Authorization', 'Bearer invalid-or-missing')
        .send({ force: false });

      expect(res.status).toBe(401);
    });

    it.skip('should lock shot list with valid shots (requires DB + auth)', async () => {
      const res = await request(app)
        .post(`/api/projects/${projectId}/scenes/${sceneId}/shots/lock`)
        .set('Authorization', `Bearer ${token}`)
        .send({ force: false });

      expect(res.status).toBe(200);
      expect(res.body.scene?.shotListLockedAt).toBeTruthy();
      expect(res.body.scene?.status).toBe('shot_list_ready');
    });

    it.skip('should return 400 on validation errors (requires DB + auth)', async () => {
      const res = await request(app)
        .post(`/api/projects/${projectId}/scenes/${sceneId}/shots/lock`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
      expect(res.body.canForce).toBe(false);
    });

    it.skip('should return 409 on validation warnings (requires DB + auth)', async () => {
      const res = await request(app)
        .post(`/api/projects/${projectId}/scenes/${sceneId}/shots/lock`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(409);
      expect(res.body.warnings).toBeDefined();
      expect(res.body.canForce).toBe(true);
    });

    it.skip('should be idempotent (requires DB + auth)', async () => {
      await request(app)
        .post(`/api/projects/${projectId}/scenes/${sceneId}/shots/lock`)
        .set('Authorization', `Bearer ${token}`);

      const res = await request(app)
        .post(`/api/projects/${projectId}/scenes/${sceneId}/shots/lock`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/projects/:id/scenes/:sceneId/shots/unlock', () => {
    it('should return 401 when not authenticated', async () => {
      const res = await request(app)
        .post(`/api/projects/${projectId}/scenes/${sceneId}/shots/unlock`)
        .set('Authorization', 'Bearer invalid-or-missing')
        .send({ confirm: false });

      expect(res.status).toBe(401);
    });

    it.skip('should unlock without confirmation if no downstream work (requires DB + auth)', async () => {
      const res = await request(app)
        .post(`/api/projects/${projectId}/scenes/${sceneId}/shots/unlock`)
        .set('Authorization', `Bearer ${token}`)
        .send({ confirm: false });

      expect(res.status).toBe(200);
    });

    it.skip('should require confirmation if frames exist (requires DB + auth)', async () => {
      const res = await request(app)
        .post(`/api/projects/${projectId}/scenes/${sceneId}/shots/unlock`)
        .set('Authorization', `Bearer ${token}`)
        .send({ confirm: false });

      expect(res.status).toBe(409);
      expect(res.body.details?.framesAffected).toBeGreaterThan(0);
      expect(res.body.requiresConfirmation).toBe(true);
    });
  });
});
