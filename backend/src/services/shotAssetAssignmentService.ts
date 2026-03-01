/**
 * Shot Asset Assignment Service
 * CRUD and auto-population for per-shot asset assignments with presence_type control.
 */

import { supabase } from '../config/supabase.js';

export type PresenceType = 'throughout' | 'enters' | 'exits' | 'passes_through';

export interface ShotAssetAssignment {
  id: string;
  shot_id: string;
  scene_asset_instance_id: string;
  presence_type: PresenceType;
  created_at: string;
  updated_at: string;
}

export interface ShotAssetAssignmentWithData extends ShotAssetAssignment {
  scene_asset_instance?: {
    id: string;
    project_asset_id: string;
    description_override?: string | null;
    effective_description: string;
    image_key_url?: string | null;
    status_tags: string[];
    use_master_as_is?: boolean;
    selected_master_reference_url?: string | null;
    project_asset?: {
      id: string;
      name: string;
      type: string;
      description: string;
      master_image_url?: string | null;
      angle_variants?: { angle_type: string; image_url: string }[];
    };
  };
}

class ShotAssetAssignmentService {
  /** Get all assignments for a single shot, joined with asset data */
  async getAssignmentsForShot(shotId: string): Promise<ShotAssetAssignmentWithData[]> {
    const { data, error } = await supabase
      .from('shot_asset_assignments')
      .select(`
        *,
        scene_asset_instance:scene_asset_instances (
          id,
          project_asset_id,
          description_override,
          effective_description,
          image_key_url,
          status_tags,
          use_master_as_is,
          selected_master_reference_url,
          project_asset:project_assets (
            id,
            name,
            type,
            description,
            master_image_url,
            angle_variants:asset_angle_variants (
              angle_type,
              image_url
            )
          )
        )
      `)
      .eq('shot_id', shotId);

    if (error) throw new Error(`Failed to get assignments for shot: ${error.message}`);
    return (data || []) as unknown as ShotAssetAssignmentWithData[];
  }

  /** Get all assignments for all shots in a scene */
  async getAssignmentsForScene(sceneId: string): Promise<ShotAssetAssignmentWithData[]> {
    // First get all shot IDs for the scene
    const { data: shots, error: shotsError } = await supabase
      .from('shots')
      .select('id')
      .eq('scene_id', sceneId);

    if (shotsError) throw new Error(`Failed to get shots: ${shotsError.message}`);
    if (!shots || shots.length === 0) return [];

    const shotIds = shots.map(s => s.id);

    const { data, error } = await supabase
      .from('shot_asset_assignments')
      .select(`
        *,
        scene_asset_instance:scene_asset_instances (
          id,
          project_asset_id,
          description_override,
          effective_description,
          image_key_url,
          status_tags,
          use_master_as_is,
          selected_master_reference_url,
          project_asset:project_assets (
            id,
            name,
            type,
            description,
            master_image_url,
            angle_variants:asset_angle_variants (
              angle_type,
              image_url
            )
          )
        )
      `)
      .in('shot_id', shotIds);

    if (error) throw new Error(`Failed to get assignments for scene: ${error.message}`);
    return (data || []) as unknown as ShotAssetAssignmentWithData[];
  }

  /** Create a single assignment */
  async createAssignment(
    shotId: string,
    instanceId: string,
    presenceType: PresenceType = 'throughout'
  ): Promise<ShotAssetAssignment> {
    const { data, error } = await supabase
      .from('shot_asset_assignments')
      .insert({
        shot_id: shotId,
        scene_asset_instance_id: instanceId,
        presence_type: presenceType,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create assignment: ${error.message}`);
    return data as ShotAssetAssignment;
  }

  /** Bulk create assignments (when adding asset to multiple shots from Stage 8) */
  async bulkCreateAssignments(
    assignments: { shotId: string; instanceId: string; presenceType: PresenceType }[]
  ): Promise<ShotAssetAssignment[]> {
    const rows = assignments.map(a => ({
      shot_id: a.shotId,
      scene_asset_instance_id: a.instanceId,
      presence_type: a.presenceType,
    }));

    const { data, error } = await supabase
      .from('shot_asset_assignments')
      .upsert(rows, { onConflict: 'shot_id,scene_asset_instance_id' })
      .select();

    if (error) throw new Error(`Failed to bulk create assignments: ${error.message}`);
    return (data || []) as ShotAssetAssignment[];
  }

  /** Update presence_type for an existing assignment */
  async updateAssignment(assignmentId: string, presenceType: PresenceType): Promise<ShotAssetAssignment> {
    const { data, error } = await supabase
      .from('shot_asset_assignments')
      .update({ presence_type: presenceType })
      .eq('id', assignmentId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update assignment: ${error.message}`);
    return data as ShotAssetAssignment;
  }

  /** Delete an assignment (remove asset from shot) */
  async deleteAssignment(assignmentId: string): Promise<void> {
    const { error } = await supabase
      .from('shot_asset_assignments')
      .delete()
      .eq('id', assignmentId);

    if (error) throw new Error(`Failed to delete assignment: ${error.message}`);
  }

  /** Auto-populate: Create 'throughout' assignments for all scene assets × all shots that don't have assignments yet */
  async autoPopulate(sceneId: string): Promise<{ created: number; existing: number }> {
    // Get all shots for the scene
    const { data: shots, error: shotsError } = await supabase
      .from('shots')
      .select('id')
      .eq('scene_id', sceneId);

    if (shotsError) throw new Error(`Failed to get shots: ${shotsError.message}`);
    if (!shots || shots.length === 0) return { created: 0, existing: 0 };

    // Get all scene asset instances
    const { data: instances, error: instancesError } = await supabase
      .from('scene_asset_instances')
      .select('id')
      .eq('scene_id', sceneId);

    if (instancesError) throw new Error(`Failed to get scene assets: ${instancesError.message}`);
    if (!instances || instances.length === 0) return { created: 0, existing: 0 };

    const shotIds = shots.map(s => s.id);
    const instanceIds = instances.map(i => i.id);

    // Get existing assignments to avoid duplicates
    const { data: existing, error: existingError } = await supabase
      .from('shot_asset_assignments')
      .select('shot_id, scene_asset_instance_id')
      .in('shot_id', shotIds);

    if (existingError) throw new Error(`Failed to check existing assignments: ${existingError.message}`);

    const existingSet = new Set(
      (existing || []).map(e => `${e.shot_id}:${e.scene_asset_instance_id}`)
    );

    // Build rows for all missing combinations
    const newRows: { shot_id: string; scene_asset_instance_id: string; presence_type: string }[] = [];
    for (const shot of shots) {
      for (const instance of instances) {
        const key = `${shot.id}:${instance.id}`;
        if (!existingSet.has(key)) {
          newRows.push({
            shot_id: shot.id,
            scene_asset_instance_id: instance.id,
            presence_type: 'throughout',
          });
        }
      }
    }

    if (newRows.length > 0) {
      const { error: insertError } = await supabase
        .from('shot_asset_assignments')
        .insert(newRows);

      if (insertError) throw new Error(`Failed to auto-populate assignments: ${insertError.message}`);
    }

    return { created: newRows.length, existing: existingSet.size };
  }

  /** Check if a scene has any assignments */
  async hasAssignments(sceneId: string): Promise<boolean> {
    const { data: shots, error: shotsError } = await supabase
      .from('shots')
      .select('id')
      .eq('scene_id', sceneId);

    if (shotsError) throw new Error(`Failed to get shots: ${shotsError.message}`);
    if (!shots || shots.length === 0) return false;

    const { count, error } = await supabase
      .from('shot_asset_assignments')
      .select('id', { count: 'exact', head: true })
      .in('shot_id', shots.map(s => s.id));

    if (error) throw new Error(`Failed to check assignments: ${error.message}`);
    return (count || 0) > 0;
  }

  /** Get the scene_id from a shot_id (for invalidation) */
  async getSceneIdForShot(shotId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('shots')
      .select('scene_id')
      .eq('id', shotId)
      .single();

    if (error || !data) return null;
    return data.scene_id;
  }

  /** Get scene_id from an assignment_id */
  async getSceneIdForAssignment(assignmentId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('shot_asset_assignments')
      .select('shot_id')
      .eq('id', assignmentId)
      .single();

    if (error || !data) return null;
    return this.getSceneIdForShot(data.shot_id);
  }

  /**
   * Invalidate Stage 9 and downstream (10, 11, 12) when assignments change.
   * Marks locked stages as 'outdated' using the existing two-phase unlock pattern.
   */
  async invalidateStage9AndDownstream(sceneId: string): Promise<void> {
    const { data: scene, error } = await supabase
      .from('scenes')
      .select('stage_locks')
      .eq('id', sceneId)
      .single();

    if (error || !scene) return;

    const locks: Record<string, { status: string }> = scene.stage_locks || {};
    let changed = false;

    for (let s = 9; s <= 12; s++) {
      const key = String(s);
      if (locks[key]?.status === 'locked') {
        locks[key] = { status: 'outdated' };
        changed = true;
      }
    }

    if (changed) {
      await supabase
        .from('scenes')
        .update({ stage_locks: locks, updated_at: new Date().toISOString() })
        .eq('id', sceneId);
    }
  }
}

export const shotAssetAssignmentService = new ShotAssetAssignmentService();
