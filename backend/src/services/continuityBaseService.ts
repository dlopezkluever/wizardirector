import { supabase } from '../config/supabase.js';

export type ContinuityBaseSuitability = 'strong' | 'usable' | 'weak' | 'missing';

export interface ContinuityBaseCandidate {
  frameId: string;
  sourceShotId: string;
  sourceShotLabel: string;
  sourceSceneId: string;
  sourceSceneNumber: number | null;
  imageUrl: string;
  sameLocation: boolean;
  sameDirection: boolean;
  suitability: ContinuityBaseSuitability;
  confidence: number;
  reason: string;
  status: 'approved' | 'generated';
  approvedAt: string | null;
  generatedAt: string | null;
}

export interface ContinuityBaseQuery {
  projectId: string;
  branchId: string;
  shotId: string;
  locationAssetId: string | null;
  cameraDirectionId: string | null;
  sceneId: string;
  limit?: number;
}

interface ApprovedFrameRow {
  id: string;
  image_url: string | null;
  status: string;
  approved_at: string | null;
  generated_at: string | null;
  shot_id: string;
  shots?: {
    id: string;
    shot_id: string;
    shot_order: number;
    scene_id: string;
    location_asset_id: string | null;
    camera_direction_id: string | null;
    scenes?: {
      id: string;
      scene_number: number;
      branch_id: string;
    };
  };
}

const DEFAULT_CANDIDATE_LIMIT = 8;

export class ContinuityBaseService {
  /**
   * Rank approved or generated frames as reuse/edit base candidates for a shot.
   *
   * Suitability tiers:
   *  - strong: same location + same camera direction
   *  - usable: same location, no direction conflict, or directionless on both sides
   *  - weak  : same location but explicit direction mismatch
   *  - missing: no candidate satisfies the constraints
   *
   * Status priority: approved > generated. Approved-at/generated-at recency breaks ties.
   * Frames belonging to the requesting shot itself are excluded.
   */
  async listCandidates(query: ContinuityBaseQuery): Promise<ContinuityBaseCandidate[]> {
    if (!query.locationAssetId) return [];

    const limit = query.limit ?? DEFAULT_CANDIDATE_LIMIT;

    const { data, error } = await supabase
      .from('frames')
      .select(`
        id,
        image_url,
        status,
        approved_at,
        generated_at,
        shot_id,
        shots!frames_shot_id_fkey!inner (
          id,
          shot_id,
          shot_order,
          scene_id,
          location_asset_id,
          camera_direction_id,
          scenes!inner (
            id,
            scene_number,
            branch_id
          )
        )
      `)
      .eq('frame_type', 'start')
      .in('status', ['approved', 'generated'])
      .eq('shots.scenes.branch_id', query.branchId)
      .not('image_url', 'is', null);

    if (error) {
      console.error('[ContinuityBase] Failed to query frames:', error);
      return [];
    }

    const rows = (data || []) as unknown as ApprovedFrameRow[];

    const candidates: ContinuityBaseCandidate[] = [];
    for (const row of rows) {
      const shot = row.shots;
      const scene = shot?.scenes;
      if (!shot || !scene) continue;
      if (scene.branch_id !== query.branchId) continue;
      if (shot.id === query.shotId) continue;
      if (!row.image_url) continue;
      if (shot.location_asset_id !== query.locationAssetId) continue;

      const sameDirection =
        !!query.cameraDirectionId &&
        !!shot.camera_direction_id &&
        shot.camera_direction_id === query.cameraDirectionId;

      const directionsConflict =
        !!query.cameraDirectionId &&
        !!shot.camera_direction_id &&
        shot.camera_direction_id !== query.cameraDirectionId;

      let suitability: ContinuityBaseSuitability;
      let confidence: number;
      let reason: string;

      if (sameDirection) {
        suitability = 'strong';
        confidence = 0.95;
        reason = 'Same canonical location and same camera direction.';
      } else if (!query.cameraDirectionId && !shot.camera_direction_id) {
        suitability = 'usable';
        confidence = 0.7;
        reason = 'Same location; neither shot has a pinned camera direction.';
      } else if (!directionsConflict) {
        suitability = 'usable';
        confidence = 0.6;
        reason = query.cameraDirectionId
          ? 'Same location; the candidate has no direction so adapt the angle in the prompt.'
          : 'Same location; this shot has no direction so the candidate provides the angle.';
      } else {
        suitability = 'weak';
        confidence = 0.4;
        reason = 'Same location but the camera direction differs; treat composition as a delta.';
      }

      const sceneRecency = scene.scene_number ?? 0;
      const sameScene = scene.id === query.sceneId;
      if (sameScene) {
        confidence = Math.min(1, confidence + 0.03);
        reason += ' Same scene continuity.';
      }
      if (row.status === 'approved') {
        confidence = Math.min(1, confidence + 0.02);
      }

      candidates.push({
        frameId: row.id,
        sourceShotId: shot.id,
        sourceShotLabel: shot.shot_id,
        sourceSceneId: scene.id,
        sourceSceneNumber: sceneRecency || null,
        imageUrl: row.image_url,
        sameLocation: true,
        sameDirection,
        suitability,
        confidence,
        reason,
        status: row.status === 'approved' ? 'approved' : 'generated',
        approvedAt: row.approved_at,
        generatedAt: row.generated_at,
      });
    }

    candidates.sort((a, b) => {
      // primary: suitability tier, then confidence
      const tierRank: Record<ContinuityBaseSuitability, number> = { strong: 3, usable: 2, weak: 1, missing: 0 };
      if (tierRank[b.suitability] !== tierRank[a.suitability]) {
        return tierRank[b.suitability] - tierRank[a.suitability];
      }
      if (b.confidence !== a.confidence) return b.confidence - a.confidence;
      // tie-breaker: prefer approved status, then most-recent approval/generation
      if (a.status !== b.status) return a.status === 'approved' ? -1 : 1;
      const aTs = a.approvedAt || a.generatedAt || '';
      const bTs = b.approvedAt || b.generatedAt || '';
      return bTs.localeCompare(aTs);
    });

    return candidates.slice(0, limit);
  }

  async pickCandidateById(
    candidates: ContinuityBaseCandidate[],
    frameId: string | null | undefined
  ): Promise<ContinuityBaseCandidate | null> {
    if (!frameId) return null;
    return candidates.find(c => c.frameId === frameId) || null;
  }
}

export const continuityBaseService = new ContinuityBaseService();
