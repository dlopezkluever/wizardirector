/**
 * Scene Asset Instance Routes
 * Handles Stage 8 scene-specific asset management with inheritance (Feature 5.1)
 */

import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase.js';
import { AssetInheritanceService } from '../services/assetInheritanceService.js';
import { ImageGenerationService } from '../services/image-generation/ImageGenerationService.js';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const CreateSceneAssetInstanceSchema = z.object({
  projectAssetId: z.string().uuid(),
  descriptionOverride: z.string().optional(),
  statusTags: z.array(z.string()).optional(),
  carryForward: z.boolean().optional(),
  inheritedFromInstanceId: z.string().uuid().optional(),
});

const UpdateSceneAssetInstanceSchema = z.object({
  descriptionOverride: z.string().optional().nullable(),
  imageKeyUrl: z.string().url().optional().nullable(),
  statusTags: z.array(z.string()).optional(),
  carryForward: z.boolean().optional(),
  modificationReason: z.string().optional().nullable(),
});

// ============================================================================
// CRUD ENDPOINTS
// ============================================================================

/**
 * GET /api/projects/:projectId/scenes/:sceneId/assets
 * List all asset instances for a specific scene (with project_asset details joined)
 */
router.get('/:projectId/scenes/:sceneId/assets', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { projectId, sceneId } = req.params;

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, active_branch_id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const { data: scene, error: sceneError } = await supabase
      .from('scenes')
      .select('id, branch_id, scene_number')
      .eq('id', sceneId)
      .eq('branch_id', project.active_branch_id)
      .single();

    if (sceneError || !scene) {
      return res.status(404).json({ error: 'Scene not found' });
    }

    const { data: instances, error } = await supabase
      .from('scene_asset_instances')
      .select(`
        *,
        project_asset:project_assets(
          id, name, asset_type, description,
          image_key_url, visual_style_capsule_id
        )
      `)
      .eq('scene_id', sceneId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[SceneAssets] List error:', error);
      return res.status(500).json({ error: 'Failed to fetch scene assets' });
    }

    res.json(instances || []);
  } catch (err) {
    console.error('[SceneAssets] List error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/projects/:projectId/scenes/:sceneId/assets
 * Create a new scene asset instance (manual or via inheritance)
 */
router.post('/:projectId/scenes/:sceneId/assets', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { projectId, sceneId } = req.params;

    const validation = CreateSceneAssetInstanceSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: validation.error.errors,
      });
    }

    const {
      projectAssetId,
      descriptionOverride,
      statusTags,
      carryForward,
      inheritedFromInstanceId,
    } = validation.data;

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, active_branch_id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const { data: scene, error: sceneError } = await supabase
      .from('scenes')
      .select('id, branch_id')
      .eq('id', sceneId)
      .eq('branch_id', project.active_branch_id)
      .single();

    if (sceneError || !scene) {
      return res.status(404).json({ error: 'Scene not found' });
    }

    const { data: projectAsset, error: assetError } = await supabase
      .from('project_assets')
      .select('id, branch_id, description')
      .eq('id', projectAssetId)
      .eq('branch_id', project.active_branch_id)
      .single();

    if (assetError || !projectAsset) {
      return res.status(404).json({ error: 'Project asset not found' });
    }

    const effectiveDescription = descriptionOverride ?? projectAsset.description ?? null;

    const { data: instance, error: insertError } = await supabase
      .from('scene_asset_instances')
      .insert({
        scene_id: sceneId,
        project_asset_id: projectAssetId,
        description_override: descriptionOverride ?? null,
        status_tags: statusTags ?? [],
        carry_forward: carryForward ?? true,
        inherited_from_instance_id: inheritedFromInstanceId ?? null,
        effective_description: effectiveDescription,
      })
      .select(`
        *,
        project_asset:project_assets(
          id, name, asset_type, description, image_key_url
        )
      `)
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        return res.status(409).json({
          error: 'Asset instance already exists for this scene',
        });
      }
      console.error('[SceneAssets] Insert error:', insertError);
      return res.status(500).json({ error: 'Failed to create scene asset instance' });
    }

    console.log(
      `[SceneAssets] Created instance ${instance.id} for asset ${projectAssetId} in scene ${sceneId}`
    );
    res.status(201).json(instance);
  } catch (err) {
    console.error('[SceneAssets] Create error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/projects/:projectId/scenes/:sceneId/assets/inherit
 * Trigger asset inheritance from prior scene (or bootstrap from project_assets for Scene 1)
 */
router.post('/:projectId/scenes/:sceneId/assets/inherit', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { projectId, sceneId } = req.params;

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, active_branch_id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const { data: scene, error: sceneError } = await supabase
      .from('scenes')
      .select('id, branch_id, scene_number')
      .eq('id', sceneId)
      .eq('branch_id', project.active_branch_id)
      .single();

    if (sceneError || !scene) {
      return res.status(404).json({ error: 'Scene not found' });
    }

    const { data: existingInstances } = await supabase
      .from('scene_asset_instances')
      .select('id')
      .eq('scene_id', sceneId)
      .limit(1);

    if (existingInstances && existingInstances.length > 0) {
      return res.status(400).json({
        error: 'Scene already has asset instances. Delete them first to re-inherit.',
      });
    }

    const inheritanceService = new AssetInheritanceService();
    const count = await inheritanceService.inheritAssetsFromPriorScene(
      sceneId,
      project.active_branch_id
    );

    res.json({
      message: `Inherited ${count} assets for Scene ${scene.scene_number}`,
      count,
    });
  } catch (error) {
    console.error('[SceneAssets] Inheritance error:', error);
    res.status(500).json({
      error: 'Asset inheritance failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/projects/:projectId/scenes/:sceneId/assets/:instanceId/generate-image
 * Generate image for scene asset instance (uses scene-specific description)
 */
router.post('/:projectId/scenes/:sceneId/assets/:instanceId/generate-image', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { projectId, sceneId, instanceId } = req.params;

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, active_branch_id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const { data: stage5States } = await supabase
      .from('stage_states')
      .select('content')
      .eq('branch_id', project.active_branch_id)
      .eq('stage_number', 5)
      .order('version', { ascending: false })
      .limit(1);

    const visualStyleId = stage5States?.[0]?.content?.locked_visual_style_capsule_id;
    if (!visualStyleId) {
      return res.status(400).json({
        error: 'Visual style capsule not found. Complete Stage 5 first.',
      });
    }

    const imageService = new ImageGenerationService();
    const result = await imageService.createSceneAssetImageJob(
      instanceId,
      projectId,
      project.active_branch_id,
      visualStyleId
    );

    res.json(result);
  } catch (error) {
    console.error('[SceneAssets] Image generation error:', error);
    res.status(500).json({
      error: 'Image generation failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PUT /api/projects/:projectId/scenes/:sceneId/assets/:instanceId
 * Update scene asset instance (description override, status tags, etc.)
 * Does not trigger image regeneration; frontend must call generate-image if needed.
 */
router.put('/:projectId/scenes/:sceneId/assets/:instanceId', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { projectId, sceneId, instanceId } = req.params;

    const validation = UpdateSceneAssetInstanceSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: validation.error.errors,
      });
    }

    const updates = validation.data;

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, active_branch_id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const { data: existingInstance, error: fetchError } = await supabase
      .from('scene_asset_instances')
      .select('*, project_asset:project_assets(description)')
      .eq('id', instanceId)
      .eq('scene_id', sceneId)
      .single();

    if (fetchError || !existingInstance) {
      return res.status(404).json({ error: 'Scene asset instance not found' });
    }

    const projectAsset = existingInstance.project_asset as { description?: string } | null;
    const baseDescription = projectAsset?.description ?? null;

    let effectiveDescription = existingInstance.effective_description;
    if (updates.descriptionOverride !== undefined) {
      effectiveDescription = updates.descriptionOverride ?? baseDescription;
    }

    const payload: Record<string, unknown> = {
      effective_description: effectiveDescription,
    };
    if (updates.descriptionOverride !== undefined) {
      payload.description_override = updates.descriptionOverride;
    }
    if (updates.imageKeyUrl !== undefined) {
      payload.image_key_url = updates.imageKeyUrl;
    }
    if (updates.statusTags !== undefined) {
      payload.status_tags = updates.statusTags;
    }
    if (updates.carryForward !== undefined) {
      payload.carry_forward = updates.carryForward;
    }
    if (updates.modificationReason !== undefined) {
      payload.modification_reason = updates.modificationReason;
    }

    const { data: updatedInstance, error: updateError } = await supabase
      .from('scene_asset_instances')
      .update(payload)
      .eq('id', instanceId)
      .select(`
        *,
        project_asset:project_assets(
          id, name, asset_type, description, image_key_url
        )
      `)
      .single();

    if (updateError) {
      console.error('[SceneAssets] Update error:', updateError);
      return res.status(500).json({ error: 'Failed to update scene asset instance' });
    }

    res.json(updatedInstance);
  } catch (err) {
    console.error('[SceneAssets] Update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/projects/:projectId/scenes/:sceneId/assets/:instanceId
 * Remove asset instance from scene
 */
router.delete('/:projectId/scenes/:sceneId/assets/:instanceId', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { projectId, sceneId, instanceId } = req.params;

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const { error: deleteError } = await supabase
      .from('scene_asset_instances')
      .delete()
      .eq('id', instanceId)
      .eq('scene_id', sceneId);

    if (deleteError) {
      console.error('[SceneAssets] Delete error:', deleteError);
      return res.status(500).json({ error: 'Failed to delete scene asset instance' });
    }

    res.status(204).send();
  } catch (err) {
    console.error('[SceneAssets] Delete error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export const sceneAssetsRouter = router;
