import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import { app } from '../server.js';

describe('GET /api/health', () => {
  it('should return 200 with health status', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('healthy');
    expect(response.body.service).toBe('wizardirector-api');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('version');
    expect(response.body.version).toBe('1.0.0');
  });

  it('should include environment info', async () => {
    const response = await request(app).get('/api/health');

    expect(response.body).toHaveProperty('environment');
    expect(typeof response.body.environment).toBe('string');
  });

  it('should return valid ISO timestamp', async () => {
    const response = await request(app).get('/api/health');

    const timestamp = new Date(response.body.timestamp);
    expect(timestamp.getTime()).not.toBeNaN();
  });
});
