import { supabase } from '@/lib/supabase';
import type { Shot } from '@/types/scene';

/** Normalize API shot (camelCase or snake_case) to Shot type */
function normalizeShot(raw: Record<string, unknown>): Shot {
  return {
    id: String(raw.id ?? ''),
    sceneId: String(raw.sceneId ?? raw.scene_id ?? ''),
    shotId: String(raw.shotId ?? raw.shot_id ?? ''),
    duration: Number(raw.duration ?? 8),
    dialogue: String(raw.dialogue ?? ''),
    action: String(raw.action ?? ''),
    charactersForeground: (raw.charactersForeground ?? raw.characters_foreground ?? []) as string[],
    charactersBackground: (raw.charactersBackground ?? raw.characters_background ?? []) as string[],
    setting: String(raw.setting ?? ''),
    camera: String(raw.camera ?? ''),
    continuityFlags: (raw.continuityFlags ?? raw.continuity_flags ?? []) as string[],
    beatReference: raw.beatReference != null ? String(raw.beatReference) : raw.beat_reference != null ? String(raw.beat_reference) : undefined,
  };
}

/**
 * Payload for updating a shot. Keys match backend whitelist (snake_case).
 * We accept Partial<Shot> from callers and map to this shape when sending.
 */
function toBackendShotUpdate(updates: Partial<Shot>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (updates.duration !== undefined) out.duration = updates.duration;
  if (updates.dialogue !== undefined) out.dialogue = updates.dialogue;
  if (updates.action !== undefined) out.action = updates.action;
  if (updates.charactersForeground !== undefined) out.characters_foreground = updates.charactersForeground;
  if (updates.charactersBackground !== undefined) out.characters_background = updates.charactersBackground;
  if (updates.setting !== undefined) out.setting = updates.setting;
  if (updates.camera !== undefined) out.camera = updates.camera;
  if (updates.continuityFlags !== undefined) out.continuity_flags = updates.continuityFlags;
  if (updates.beatReference !== undefined) out.beat_reference = updates.beatReference;
  return out;
}

export class ShotService {
  /**
   * Fetch all shots for a scene (ordered by shot_order)
   */
  async fetchShots(projectId: string, sceneId: string): Promise<Shot[]> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(
      `/api/projects/${projectId}/scenes/${sceneId}/shots`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Failed to fetch shots: ${response.statusText}`);
    }

    const result = await response.json();
    const shots = result.shots || [];
    return shots.map((s: Record<string, unknown>) => normalizeShot(s));
  }

  /**
   * Auto-extract shots from scene using LLM.
   * Called automatically on Stage 7 mount if no shots exist.
   */
  async extractShots(projectId: string, sceneId: string): Promise<Shot[]> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(
      `/api/projects/${projectId}/scenes/${sceneId}/shots/extract`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Failed to extract shots: ${response.statusText}`);
    }

    const result = await response.json();
    const shots = result.shots || [];
    return shots.map((s: Record<string, unknown>) => normalizeShot(s));
  }

  /**
   * Update a single shot (debounced auto-save).
   * shotId is the shot row id (UUID). Updates are sent in backend whitelist shape.
   */
  async updateShot(
    projectId: string,
    sceneId: string,
    shotId: string,
    updates: Partial<Shot>
  ): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const body = toBackendShotUpdate(updates);
    if (Object.keys(body).length === 0) return;

    const response = await fetch(
      `/api/projects/${projectId}/scenes/${sceneId}/shots/${shotId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Failed to update shot: ${response.statusText}`);
    }
  }

  /**
   * Split shot into two using LLM agent.
   * shotId is the shot row id (UUID). Returns the two new shots.
   */
  async splitShot(
    projectId: string,
    sceneId: string,
    shotId: string,
    userGuidance?: string
  ): Promise<Shot[]> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(
      `/api/projects/${projectId}/scenes/${sceneId}/shots/${shotId}/split`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userGuidance }),
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Failed to split shot: ${response.statusText}`);
    }

    const result = await response.json();
    const newShots = result.newShots || [];
    return newShots.map((s: Record<string, unknown>) => normalizeShot(s));
  }

  /**
   * Delete a shot (removes from database). Use reorder after if needed.
   * shotId is the shot row id (UUID).
   */
  async deleteShot(
    projectId: string,
    sceneId: string,
    shotId: string
  ): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(
      `/api/projects/${projectId}/scenes/${sceneId}/shots/${shotId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Failed to delete shot: ${response.statusText}`);
    }
  }

  /**
   * Batch reorder shots by ordered list of shot row ids (UUIDs).
   */
  async reorderShots(
    projectId: string,
    sceneId: string,
    orderedShotIds: string[]
  ): Promise<Shot[]> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(
      `/api/projects/${projectId}/scenes/${sceneId}/shots/reorder`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderedShotIds }),
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Failed to reorder shots: ${response.statusText}`);
    }

    const result = await response.json();
    const shots = result.shots || [];
    return shots.map((s: Record<string, unknown>) => normalizeShot(s));
  }
}

export const shotService = new ShotService();
