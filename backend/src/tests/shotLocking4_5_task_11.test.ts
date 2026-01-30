
import { describe, it, expect, beforeAll } from '@jest/globals';
import { shotValidationService } from '../services/shotValidationService';

describe('Shot List Locking Endpoints', () => {
    describe('POST /api/projects/:id/scenes/:sceneId/shots/lock', () => {
      it('should lock shot list with valid shots', async () => {
        // Setup: Create project, scene, valid shots
        const res = await request(app)
          .post(`/api/projects/${projectId}/scenes/${sceneId}/shots/lock`)
          .set('Authorization', `Bearer ${token}`)
          .send({ force: false });
        
        expect(res.status).toBe(200);
        expect(res.body.scene.shotListLockedAt).toBeTruthy();
        expect(res.body.scene.status).toBe('shot_list_ready');
      });
  
      it('should return 400 on validation errors', async () => {
        // Setup: Scene with invalid shots (missing required field)
        const res = await request(app)
          .post(`/api/projects/${projectId}/scenes/${sceneId}/shots/lock`)
          .set('Authorization', `Bearer ${token}`);
        
        expect(res.status).toBe(400);
        expect(res.body.errors).toBeDefined();
        expect(res.body.canForce).toBe(false);
      });
  
      it('should return 409 on validation warnings', async () => {
        // Setup: Scene with unusual duration
        const res = await request(app)
          .post(`/api/projects/${projectId}/scenes/${sceneId}/shots/lock`)
          .set('Authorization', `Bearer ${token}`);
        
        expect(res.status).toBe(409);
        expect(res.body.warnings).toBeDefined();
        expect(res.body.canForce).toBe(true);
      });
  
      it('should be idempotent', async () => {
        // Lock once
        await request(app)
          .post(`/api/projects/${projectId}/scenes/${sceneId}/shots/lock`)
          .set('Authorization', `Bearer ${token}`);
        
        // Lock again
        const res = await request(app)
          .post(`/api/projects/${projectId}/scenes/${sceneId}/shots/lock`)
          .set('Authorization', `Bearer ${token}`);
        
        expect(res.status).toBe(200);
      });
    });
  
    describe('POST /api/projects/:id/scenes/:sceneId/shots/unlock', () => {
      it('should unlock without confirmation if no downstream work', async () => {
        const res = await request(app)
          .post(`/api/projects/${projectId}/scenes/${sceneId}/shots/unlock`)
          .set('Authorization', `Bearer ${token}`)
          .send({ confirm: false });
        
        expect(res.status).toBe(200);
      });
  
      it('should require confirmation if frames exist', async () => {
        // Setup: Create frames for scene
        const res = await request(app)
          .post(`/api/projects/${projectId}/scenes/${sceneId}/shots/unlock`)
          .set('Authorization', `Bearer ${token}`)
          .send({ confirm: false });
        
        expect(res.status).toBe(409);
        expect(res.body.details.framesAffected).toBeGreaterThan(0);
        expect(res.body.requiresConfirmation).toBe(true);
      });
    });
  });