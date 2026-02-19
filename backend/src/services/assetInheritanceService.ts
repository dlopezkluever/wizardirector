/**
 * Asset Inheritance Service
 * Implements Scene N → Scene N+1 asset state propagation
 * Adheres to inheritance_contract.md rules (lines 1-224)
 */

import { supabase } from '../config/supabase.js';
import { transformationEventService } from './transformationEventService.js';

export interface InheritanceSource {
  priorSceneId: string;
  priorSceneNumber: number;
}

export interface InheritedAssetState {
  projectAssetId: string;
  descriptionOverride?: string | null;
  imageKeyUrl?: string | null;
  statusTags: string[];
  carryForward: boolean;
  sourceInstanceId: string;
  /** Base description from project_asset (used for effective_description when reset). */
  baseDescription?: string | null;
}

/**
 * Business Logic Rules for Asset Inheritance
 *
 * CARRY_FORWARD=TRUE:
 * - Instance inherits status_tags, description_override, and image_key_url from prior instance
 * - Maintains link via inherited_from_instance_id for history tracking
 * - Default behavior (most common case)
 *
 * CARRY_FORWARD=FALSE:
 * - Instance RESETS to project_asset base state (description, image_key_url)
 * - status_tags are cleared (empty array)
 * - description_override is NULL
 * - inherited_from_instance_id is still set (for history/audit trail)
 * - Use case: Asset "resets" between scenes (e.g., character changes costume back to original)
 *
 * TEMPORAL VALIDATION:
 * - Inheritance must respect scene_number order (Scene N can only inherit from Scene N-1)
 * - Prevents "future inheritance" paradoxes
 */

export class AssetInheritanceService {
  /**
   * Get the prior scene for a given scene in the same branch
   * Returns null if scene_number === 1
   */
  async getPriorScene(sceneId: string): Promise<InheritanceSource | null> {
    const { data: currentScene, error } = await supabase
      .from('scenes')
      .select('scene_number, branch_id')
      .eq('id', sceneId)
      .single();

    if (error || !currentScene) {
      throw new Error(`Scene ${sceneId} not found`);
    }

    if (currentScene.scene_number === 1) {
      return null;
    }

    const { data: priorScene, error: priorError } = await supabase
      .from('scenes')
      .select('id, scene_number')
      .eq('branch_id', currentScene.branch_id)
      .eq('scene_number', currentScene.scene_number - 1)
      .single();

    if (priorError || !priorScene) {
      console.warn(`[AssetInheritance] Prior scene not found for scene ${sceneId}`);
      return null;
    }

    return {
      priorSceneId: priorScene.id,
      priorSceneNumber: priorScene.scene_number,
    };
  }

  /**
   * Get inheritable asset states from the prior scene
   * Returns array of inherited states based on carry_forward flag
   *
   * BUSINESS LOGIC:
   * - If carry_forward=true: Full state inheritance (description_override, status_tags, image_key_url)
   * - If carry_forward=false: Reset to project_asset base state (empty tags, no override)
   */
  async getInheritableAssetStates(priorSceneId: string): Promise<InheritedAssetState[]> {
    const { data: priorInstances, error } = await supabase
      .from('scene_asset_instances')
      .select('*, project_asset:project_assets(description, image_key_url)')
      .eq('scene_id', priorSceneId);

    if (error) {
      throw new Error(`Failed to fetch prior scene assets: ${error.message}`);
    }

    if (!priorInstances || priorInstances.length === 0) {
      return [];
    }

    const projectAsset = (inst: { project_asset?: { description?: string; image_key_url?: string | null } | null }) =>
      inst.project_asset;

    const results: InheritedAssetState[] = [];

    for (const instance of priorInstances) {
      const pa = projectAsset(instance);

      if (instance.carry_forward === false) {
        results.push({
          projectAssetId: instance.project_asset_id,
          descriptionOverride: null,
          imageKeyUrl: pa?.image_key_url ?? null,
          statusTags: [] as string[],
          carryForward: false,
          sourceInstanceId: instance.id,
          baseDescription: pa?.description ?? null,
        });
        continue;
      }

      // Check for transformation events — if asset transformed, inherit the post-state
      const transformState = await transformationEventService.getLastAssetStateForInheritance(
        priorSceneId,
        instance.id
      );

      if (transformState) {
        results.push({
          projectAssetId: instance.project_asset_id,
          descriptionOverride: transformState.description,
          imageKeyUrl: transformState.imageKeyUrl ?? instance.image_key_url ?? pa?.image_key_url ?? null,
          statusTags: transformState.statusTags,
          carryForward: instance.carry_forward ?? true,
          sourceInstanceId: instance.id,
          baseDescription: pa?.description ?? null,
        });
      } else {
        results.push({
          projectAssetId: instance.project_asset_id,
          descriptionOverride: instance.description_override ?? null,
          imageKeyUrl: instance.image_key_url ?? pa?.image_key_url ?? null,
          statusTags: (instance.status_tags as string[]) || [],
          carryForward: instance.carry_forward ?? true,
          sourceInstanceId: instance.id,
          baseDescription: pa?.description ?? null,
        });
      }
    }

    return results;
  }

  /**
   * Bootstrap scene asset instances from project assets (Scene 1 only)
   * Creates instances without inheritance (inherited_from_instance_id = NULL)
   */
  async bootstrapSceneAssetsFromProjectAssets(
    sceneId: string,
    branchId: string
  ): Promise<number> {
    console.log(`[AssetInheritance] Bootstrapping Scene 1 assets for scene ${sceneId}`);

    const { data: scene, error: sceneError } = await supabase
      .from('scenes')
      .select('scene_number')
      .eq('id', sceneId)
      .single();

    if (sceneError || !scene) {
      throw new Error(`Scene ${sceneId} not found`);
    }

    if (scene.scene_number !== 1) {
      throw new Error(`Bootstrap only allowed for Scene 1. Current scene number: ${scene.scene_number}`);
    }

    // Include both locked and deferred assets; deferred assets get instances with null image
    const { data: projectAssets, error: assetsError } = await supabase
      .from('project_assets')
      .select('id, description, image_key_url, deferred')
      .eq('branch_id', branchId)
      .or('locked.eq.true,deferred.eq.true');

    if (assetsError) {
      throw new Error(`Failed to fetch project assets: ${assetsError.message}`);
    }

    if (!projectAssets || projectAssets.length === 0) {
      console.warn(`[AssetInheritance] No locked project assets found for branch ${branchId}`);
      return 0;
    }

    const instancesToCreate = projectAssets.map((asset: { id: string; description: string; image_key_url: string | null; deferred?: boolean }) => ({
      scene_id: sceneId,
      project_asset_id: asset.id,
      description_override: null,
      image_key_url: asset.deferred ? null : (asset.image_key_url ?? null),
      status_tags: [] as string[],
      carry_forward: true,
      inherited_from_instance_id: null,
      effective_description: asset.description ?? '',
    }));

    const { data, error: insertError } = await supabase
      .from('scene_asset_instances')
      .insert(instancesToCreate)
      .select();

    if (insertError) {
      throw new Error(`Failed to bootstrap scene assets: ${insertError.message}`);
    }

    console.log(`[AssetInheritance] Bootstrapped ${data?.length ?? 0} assets for Scene 1`);
    return data?.length ?? 0;
  }

  /**
   * Inherit asset states from prior scene to current scene
   * Creates scene_asset_instances with inherited_from_instance_id set
   *
   * TEMPORAL VALIDATION: Ensures scenes inherit in sequential order
   */
  async inheritAssetsFromPriorScene(
    currentSceneId: string,
    branchId: string
  ): Promise<number> {
    console.log(`[AssetInheritance] Inheriting assets for scene ${currentSceneId}`);

    const { data: currentScene, error: currentSceneError } = await supabase
      .from('scenes')
      .select('scene_number, branch_id')
      .eq('id', currentSceneId)
      .single();

    if (currentSceneError || !currentScene) {
      throw new Error(`Current scene ${currentSceneId} not found`);
    }

    const priorScene = await this.getPriorScene(currentSceneId);

    if (!priorScene) {
      return await this.bootstrapSceneAssetsFromProjectAssets(currentSceneId, branchId);
    }

    if (priorScene.priorSceneNumber >= currentScene.scene_number) {
      throw new Error(
        `Temporal paradox detected: Cannot inherit from Scene ${priorScene.priorSceneNumber} to Scene ${currentScene.scene_number}. Inheritance must flow forward in time.`
      );
    }

    const inheritedStates = await this.getInheritableAssetStates(priorScene.priorSceneId);

    if (inheritedStates.length === 0) {
      console.warn(`[AssetInheritance] No inheritable assets from scene ${priorScene.priorSceneNumber}`);
      return 0;
    }

    const instancesToCreate = inheritedStates.map((state) => ({
      scene_id: currentSceneId,
      project_asset_id: state.projectAssetId,
      description_override: state.descriptionOverride,
      image_key_url: state.imageKeyUrl,
      status_tags: state.statusTags,
      carry_forward: state.carryForward,
      inherited_from_instance_id: state.sourceInstanceId,
      effective_description: state.descriptionOverride ?? state.baseDescription ?? '',
    }));

    const { data, error: insertError } = await supabase
      .from('scene_asset_instances')
      .insert(instancesToCreate)
      .select();

    if (insertError) {
      throw new Error(`Failed to inherit scene assets: ${insertError.message}`);
    }

    console.log(`[AssetInheritance] Inherited ${data?.length ?? 0} assets from Scene ${priorScene.priorSceneNumber}`);
    return data?.length ?? 0;
  }

  /**
   * Get the inheritance chain for a scene asset instance
   * Traces back through inherited_from_instance_id to find the root
   */
  async getInheritanceChain(instanceId: string): Promise<InheritanceChainNode[]> {
    const chain: InheritanceChainNode[] = [];
    let currentInstanceId: string | null = instanceId;

    while (currentInstanceId) {
      const { data: row, error } = await supabase
        .from('scene_asset_instances')
        .select(`
          id,
          scene_id,
          project_asset_id,
          description_override,
          status_tags,
          inherited_from_instance_id,
          scene:scenes(scene_number)
        `)
        .eq('id', currentInstanceId)
        .single();

      if (error || !row) {
        break;
      }

      const instance = row as {
        id: string;
        scene_id: string;
        description_override: string | null;
        status_tags: string[] | null;
        inherited_from_instance_id: string | null;
        scene: { scene_number: number } | { scene_number: number }[] | null;
      };
      const sceneRef = Array.isArray(instance.scene) ? instance.scene[0] : instance.scene;
      const sceneNumber = sceneRef?.scene_number ?? 0;

      chain.push({
        instanceId: instance.id,
        sceneId: instance.scene_id,
        sceneNumber,
        descriptionOverride: instance.description_override,
        statusTags: instance.status_tags || [],
      });

      currentInstanceId = instance.inherited_from_instance_id;
    }

    return chain.reverse();
  }
}

export interface InheritanceChainNode {
  instanceId: string;
  sceneId: string;
  sceneNumber: number;
  descriptionOverride?: string | null;
  statusTags: string[];
}
