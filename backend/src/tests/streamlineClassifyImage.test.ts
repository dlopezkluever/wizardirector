/**
 * Streamline Phase 3 — POST /:projectId/streamline/classify-image route test.
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import { mockSupabaseTarget, configureSupabaseMock, configureSupabaseStorageMock, type MockResult } from './helpers/supabaseMock.js';
import { app } from '../server.js';

const mockClassifyUploadedImage: jest.Mock<() => Promise<unknown>> = jest.fn();

jest.mock('../config/supabase.js', () => ({
  supabase: mockSupabaseTarget,
}));

jest.mock('../services/imageAnalysisService.js', () => ({
  ImageAnalysisService: jest.fn().mockImplementation(() => ({
    classifyUploadedImage: mockClassifyUploadedImage,
  })),
}));

const PROJECT_ID = '11111111-1111-1111-1111-111111111111';

function ok(data: unknown): MockResult {
  return { data, error: null };
}

describe('POST /api/projects/:projectId/streamline/classify-image', () => {
  beforeEach(() => {
    configureSupabaseMock([ok({ id: PROJECT_ID })]);
    configureSupabaseStorageMock({ publicUrl: 'https://storage.example/streamline/marcus.png' });
    mockClassifyUploadedImage.mockReset();
  });

  it('uploads the image and returns its classification', async () => {
    mockClassifyUploadedImage.mockResolvedValue({ name: 'Marcus', type: 'character', description: 'A weary man.', confidence: 0.8 });

    const res = await request(app)
      .post(`/api/projects/${PROJECT_ID}/streamline/classify-image`)
      .set('Authorization', 'Bearer test-token')
      .attach('file', Buffer.from('fake-png-bytes'), { filename: 'marcus.png', contentType: 'image/png' });

    expect(res.status).toBe(200);
    expect(res.body.imageUrl).toBe('https://storage.example/streamline/marcus.png');
    expect(res.body.classification).toEqual({ name: 'Marcus', type: 'character', description: 'A weary man.', confidence: 0.8 });
  });

  it('rejects a non-image file type', async () => {
    const res = await request(app)
      .post(`/api/projects/${PROJECT_ID}/streamline/classify-image`)
      .set('Authorization', 'Bearer test-token')
      .attach('file', Buffer.from('not an image'), { filename: 'notes.txt', contentType: 'text/plain' });

    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('still returns the uploaded image URL with a fallback guess if classification fails', async () => {
    mockClassifyUploadedImage.mockRejectedValue(new Error('Vision model unavailable'));

    const res = await request(app)
      .post(`/api/projects/${PROJECT_ID}/streamline/classify-image`)
      .set('Authorization', 'Bearer test-token')
      .attach('file', Buffer.from('fake-png-bytes'), { filename: 'photo.png', contentType: 'image/png' });

    expect(res.status).toBe(200);
    expect(res.body.imageUrl).toBeTruthy();
    expect(res.body.classification.confidence).toBe(0);
  });

  it('returns 404 when the project is not owned by the caller', async () => {
    configureSupabaseMock([{ data: null, error: { code: 'PGRST116' } }]);

    const res = await request(app)
      .post(`/api/projects/${PROJECT_ID}/streamline/classify-image`)
      .set('Authorization', 'Bearer test-token')
      .attach('file', Buffer.from('fake-png-bytes'), { filename: 'photo.png', contentType: 'image/png' });

    expect(res.status).toBe(404);
  });
});
