/**
 * Frontend Text Field Version Service — Unit Tests
 * Verifies API calls, headers, payloads, response mapping, and error handling using MSW.
 */

import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

// Mock supabase BEFORE importing the service
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: { access_token: 'test-token-abc' },
        },
      }),
    },
  },
}));

import { textFieldVersionService, type TextFieldVersion } from '../textFieldVersionService';

// ---------------------------------------------------------------------------
// MSW Setup
// ---------------------------------------------------------------------------

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const PROJECT_ID = 'proj-1';
const SCENE_ID = 'scene-1';
const SHOT_ID = 'shot-1';
const INSTANCE_ID = 'inst-1';
const VERSION_ID = 'ver-1';

const SHOT_BASE = `/api/projects/${PROJECT_ID}/scenes/${SCENE_ID}/shots/${SHOT_ID}/field-versions`;
const ASSET_BASE = `/api/projects/${PROJECT_ID}/scenes/${SCENE_ID}/assets/${INSTANCE_ID}/field-versions`;

// Helper: API-format version (snake_case)
function makeApiVersion(overrides: Record<string, any> = {}) {
  return {
    id: VERSION_ID,
    entity_type: 'shot',
    entity_id: SHOT_ID,
    field_name: 'frame_prompt',
    content: 'A cinematic landscape',
    is_selected: true,
    source: 'user_save',
    version_number: 1,
    created_at: '2026-03-01T00:00:00Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Shot Field Version Tests
// ---------------------------------------------------------------------------

describe('textFieldVersionService — shot fields', () => {
  describe('listShotFieldVersions', () => {
    it('should GET versions and map snake_case to camelCase', async () => {
      const apiVersions = [makeApiVersion(), makeApiVersion({ id: 'ver-2', version_number: 2, is_selected: false })];
      server.use(
        http.get(`${SHOT_BASE}/frame_prompt`, () => {
          return HttpResponse.json({ versions: apiVersions });
        })
      );

      const result = await textFieldVersionService.listShotFieldVersions(PROJECT_ID, SCENE_ID, SHOT_ID, 'frame_prompt');
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(VERSION_ID);
      expect(result[0].isSelected).toBe(true);
      expect(result[0].versionNumber).toBe(1);
      expect(result[0].entityType).toBe('shot');
      expect(result[0].fieldName).toBe('frame_prompt');
      expect(result[0].createdAt).toBe('2026-03-01T00:00:00Z');
    });

    it('should send Authorization header', async () => {
      let receivedAuth = '';
      server.use(
        http.get(`${SHOT_BASE}/frame_prompt`, ({ request }) => {
          receivedAuth = request.headers.get('Authorization') || '';
          return HttpResponse.json({ versions: [] });
        })
      );

      await textFieldVersionService.listShotFieldVersions(PROJECT_ID, SCENE_ID, SHOT_ID, 'frame_prompt');
      expect(receivedAuth).toBe('Bearer test-token-abc');
    });

    it('should throw on error response', async () => {
      server.use(
        http.get(`${SHOT_BASE}/frame_prompt`, () => {
          return HttpResponse.json({ error: 'Not found' }, { status: 404 });
        })
      );

      await expect(
        textFieldVersionService.listShotFieldVersions(PROJECT_ID, SCENE_ID, SHOT_ID, 'frame_prompt')
      ).rejects.toThrow('Not found');
    });
  });

  describe('createShotFieldVersion', () => {
    it('should POST with content and source, return mapped version', async () => {
      let receivedBody: any;
      server.use(
        http.post(`${SHOT_BASE}/video_prompt`, async ({ request }) => {
          receivedBody = await request.json();
          return HttpResponse.json({ version: makeApiVersion({ field_name: 'video_prompt', version_number: 3 }) });
        })
      );

      const result = await textFieldVersionService.createShotFieldVersion(
        PROJECT_ID, SCENE_ID, SHOT_ID, 'video_prompt', 'New video text', 'user_save'
      );

      expect(receivedBody.content).toBe('New video text');
      expect(receivedBody.source).toBe('user_save');
      expect(result.versionNumber).toBe(3);
      expect(result.fieldName).toBe('video_prompt');
    });

    it('should default source to user_save if not provided', async () => {
      let receivedBody: any;
      server.use(
        http.post(`${SHOT_BASE}/frame_prompt`, async ({ request }) => {
          receivedBody = await request.json();
          return HttpResponse.json({ version: makeApiVersion() });
        })
      );

      await textFieldVersionService.createShotFieldVersion(
        PROJECT_ID, SCENE_ID, SHOT_ID, 'frame_prompt', 'content'
      );

      expect(receivedBody.source).toBe('user_save');
    });

    it('should throw on error response', async () => {
      server.use(
        http.post(`${SHOT_BASE}/frame_prompt`, () => {
          return HttpResponse.json({ error: 'Validation failed' }, { status: 400 });
        })
      );

      await expect(
        textFieldVersionService.createShotFieldVersion(PROJECT_ID, SCENE_ID, SHOT_ID, 'frame_prompt', '')
      ).rejects.toThrow('Validation failed');
    });
  });

  describe('selectShotFieldVersion', () => {
    it('should POST to select endpoint and return mapped version', async () => {
      server.use(
        http.post(`${SHOT_BASE}/frame_prompt/${VERSION_ID}/select`, () => {
          return HttpResponse.json({ version: makeApiVersion({ is_selected: true }) });
        })
      );

      const result = await textFieldVersionService.selectShotFieldVersion(
        PROJECT_ID, SCENE_ID, SHOT_ID, 'frame_prompt', VERSION_ID
      );

      expect(result.isSelected).toBe(true);
      expect(result.id).toBe(VERSION_ID);
    });

    it('should throw on error', async () => {
      server.use(
        http.post(`${SHOT_BASE}/frame_prompt/${VERSION_ID}/select`, () => {
          return HttpResponse.json({ error: 'Version not found' }, { status: 404 });
        })
      );

      await expect(
        textFieldVersionService.selectShotFieldVersion(PROJECT_ID, SCENE_ID, SHOT_ID, 'frame_prompt', VERSION_ID)
      ).rejects.toThrow('Version not found');
    });
  });
});

// ---------------------------------------------------------------------------
// Asset Field Version Tests
// ---------------------------------------------------------------------------

describe('textFieldVersionService — asset fields', () => {
  describe('listAssetFieldVersions', () => {
    it('should GET description_override versions', async () => {
      const apiVersions = [
        makeApiVersion({ entity_type: 'scene_asset_instance', entity_id: INSTANCE_ID, field_name: 'description_override' }),
      ];
      server.use(
        http.get(`${ASSET_BASE}/description_override`, () => {
          return HttpResponse.json({ versions: apiVersions });
        })
      );

      const result = await textFieldVersionService.listAssetFieldVersions(PROJECT_ID, SCENE_ID, INSTANCE_ID);
      expect(result).toHaveLength(1);
      expect(result[0].entityType).toBe('scene_asset_instance');
      expect(result[0].fieldName).toBe('description_override');
    });
  });

  describe('createAssetFieldVersion', () => {
    it('should POST content and return mapped version', async () => {
      let receivedBody: any;
      server.use(
        http.post(`${ASSET_BASE}/description_override`, async ({ request }) => {
          receivedBody = await request.json();
          return HttpResponse.json({
            version: makeApiVersion({
              entity_type: 'scene_asset_instance',
              entity_id: INSTANCE_ID,
              field_name: 'description_override',
              content: 'New desc',
              version_number: 2,
            }),
          });
        })
      );

      const result = await textFieldVersionService.createAssetFieldVersion(
        PROJECT_ID, SCENE_ID, INSTANCE_ID, 'New desc', 'user_save'
      );

      expect(receivedBody.content).toBe('New desc');
      expect(result.versionNumber).toBe(2);
    });
  });

  describe('selectAssetFieldVersion', () => {
    it('should POST to select and return mapped version', async () => {
      server.use(
        http.post(`${ASSET_BASE}/description_override/${VERSION_ID}/select`, () => {
          return HttpResponse.json({
            version: makeApiVersion({
              entity_type: 'scene_asset_instance',
              entity_id: INSTANCE_ID,
              field_name: 'description_override',
              is_selected: true,
            }),
          });
        })
      );

      const result = await textFieldVersionService.selectAssetFieldVersion(
        PROJECT_ID, SCENE_ID, INSTANCE_ID, VERSION_ID
      );

      expect(result.isSelected).toBe(true);
    });
  });
});
