import { supabase } from '@/lib/supabase';
import type { Shot } from '@/types/scene';
import type { ShotLocationState } from '@/types/locationContinuity';

export interface ShotLocationValidationSummary {
  unresolvedCount: number;
  ambiguousCount: number;
  mismatchCount: number;
  totalIssueCount: number;
}

export interface ShotLocationResolveResponse {
  success: boolean;
  mode: 'dry_run' | 'apply';
  appliedCount: number;
  shots: Shot[];
  locationValidation?: ShotLocationValidationSummary;
}

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
    camera_distance: (raw.camera_distance as string) || undefined,
    camera_height: (raw.camera_height as string) || undefined,
    camera_movement: (raw.camera_movement as string) || undefined,
    camera_direction_id: (raw.camera_direction_id as string) || null,
    location_asset_id: (raw.location_asset_id as string) || null,
    location_match_confidence: raw.location_match_confidence != null ? Number(raw.location_match_confidence) : null,
    location_match_source: (raw.location_match_source as Shot['location_match_source']) || null,
    location_match_notes: (raw.location_match_notes as string) || null,
    locationState: (raw.locationState ?? raw.location_state) as ShotLocationState | undefined,
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
  if (updates.camera_distance !== undefined) out.camera_distance = updates.camera_distance;
  if (updates.camera_height !== undefined) out.camera_height = updates.camera_height;
  if (updates.camera_movement !== undefined) out.camera_movement = updates.camera_movement;
  if (updates.camera_direction_id !== undefined) out.camera_direction_id = updates.camera_direction_id;
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
  ): Promise<Shot | null> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const body = toBackendShotUpdate(updates);
    if (Object.keys(body).length === 0) return null;

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

    const result = await response.json();
    return result.shot ? normalizeShot(result.shot as Record<string, unknown>) : null;
  }

  async assignShotLocation(
    projectId: string,
    sceneId: string,
    shotId: string,
    locationAssetId: string | null
  ): Promise<Shot> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(
      `/api/projects/${projectId}/scenes/${sceneId}/shots/${shotId}/location`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          locationAssetId
            ? { locationAssetId }
            : { clear: true }
        ),
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Failed to update shot location: ${response.statusText}`);
    }

    const result = await response.json();
    if (!result.shot) throw new Error('Location update response missing shot');
    return normalizeShot(result.shot as Record<string, unknown>);
  }

  async resolveShotLocations(
    projectId: string,
    sceneId: string,
    options?: { apply?: boolean; threshold?: number; preserveManual?: boolean }
  ): Promise<ShotLocationResolveResponse> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(
      `/api/projects/${projectId}/scenes/${sceneId}/shots/resolve-locations`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apply: options?.apply ?? false,
          threshold: options?.threshold,
          preserveManual: options?.preserveManual ?? true,
        }),
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Failed to resolve shot locations: ${response.statusText}`);
    }

    const result = await response.json();
    return {
      success: !!result.success,
      mode: result.mode === 'apply' ? 'apply' : 'dry_run',
      appliedCount: Number(result.appliedCount ?? 0),
      shots: (result.shots || []).map((s: Record<string, unknown>) => normalizeShot(s)),
      locationValidation: result.locationValidation,
    };
  }

  /**
   * Split shot into two using LLM agent.
   * shotId is the shot row id (UUID). Returns the new split shots.
   * splitCount: 2 (default) or 3 for three-way split.
   */
  async splitShot(
    projectId: string,
    sceneId: string,
    shotId: string,
    userGuidance?: string,
    splitCount?: 2 | 3
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
        body: JSON.stringify({ userGuidance, splitCount }),
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
   * Merge the selected shot with the next or previous shot using LLM.
   * shotId is the shot row id (UUID). direction: 'next' | 'previous'. Returns the merged shot.
   */
  async mergeShot(
    projectId: string,
    sceneId: string,
    shotId: string,
    direction: 'next' | 'previous'
  ): Promise<Shot> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(
      `/api/projects/${projectId}/scenes/${sceneId}/shots/${shotId}/merge`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ direction }),
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Failed to merge shot: ${response.statusText}`);
    }

    const result = await response.json();
    const merged = result.mergedShot;
    if (!merged) throw new Error('Merge response missing mergedShot');
    return normalizeShot(merged as Record<string, unknown>);
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

  /**
   * Lock shot list for the scene (Stage 7 gatekeeper).
   * Validates shots server-side; use force=true to bypass warnings only.
   */
  async lockShotList(
    projectId: string,
    sceneId: string,
    force: boolean = false
  ): Promise<{ success: boolean; scene: Record<string, unknown> }> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(
      `/api/projects/${projectId}/scenes/${sceneId}/shots/lock`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ force }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const err: Error & { status?: number; data?: unknown } = new Error(data.error || 'Failed to lock shot list');
      err.status = response.status;
      err.data = data;
      throw err;
    }

    return data;
  }

  /**
   * Unlock shot list. If downstream work exists, pass confirm: true (and optional reason).
   */
  async unlockShotList(
    projectId: string,
    sceneId: string,
    options?: { reason?: string; confirm?: boolean }
  ): Promise<{ success: boolean; scene?: Record<string, unknown>; invalidated?: { frames: number; videos: number } }> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(
      `/api/projects/${projectId}/scenes/${sceneId}/shots/unlock`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          reason: options?.reason,
          confirm: options?.confirm,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const err: Error & { status?: number; data?: unknown } = new Error(data.error || 'Failed to unlock shot list');
      err.status = response.status;
      err.data = data;
      throw err;
    }

    return data;
  }
}

export const shotService = new ShotService();
