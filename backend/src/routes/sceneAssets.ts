/**
 * Scene Asset Instance Routes
 * Handles Stage 8 scene-specific asset management with inheritance (Feature 5.1)
 */

import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase.js';
import { AssetInheritanceService } from '../services/assetInheritanceService.js';
import { ImageGenerationService } from '../services/image-generation/ImageGenerationService.js';
import { SceneAssetRelevanceService } from '../services/sceneAssetRelevanceService.js';
import { SceneAssetAttemptsService } from '../services/sceneAssetAttemptsService.js';
import { transformationEventService } from '../services/transformationEventService.js';
import type { TransformationType, DetectedBy } from '../services/transformationEventService.js';
import multer from 'multer';
import path from 'path';

// Configure multer for scene asset image uploads (3B.3)
const sceneAssetStorage = multer.memoryStorage();
const sceneAssetUpload = multer({
  storage: sceneAssetStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Invalid file type. Only PNG, JPEG, and WebP are allowed.'));
    }
    cb(null, true);
  }
});

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
 * POST /api/projects/:projectId/scenes/:sceneId/assets/detect-relevance
 * AI agent detects which assets are needed for this scene (Stage 8 relevance)
 */
router.post('/:projectId/scenes/:sceneId/assets/detect-relevance', async (req, res) => {
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
      .select('id, branch_id')
      .eq('id', sceneId)
      .eq('branch_id', project.active_branch_id)
      .single();

    if (sceneError || !scene) {
      return res.status(404).json({ error: 'Scene not found' });
    }

    const relevanceService = new SceneAssetRelevanceService();
    const result = await relevanceService.detectRelevantAssets(
      sceneId,
      project.active_branch_id
    );

    res.json(result);
  } catch (error) {
    console.error('[SceneAssets] Relevance detection error:', error);
    res.status(500).json({
      error: 'Asset relevance detection failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
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
      .select('id, branch_id, scene_number')
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

    // Update project_asset.scene_numbers to include this scene's number
    if (scene.scene_number) {
      try {
        const { data: pa } = await supabase
          .from('project_assets')
          .select('scene_numbers')
          .eq('id', projectAssetId)
          .single();
        const current: number[] = pa?.scene_numbers || [];
        if (!current.includes(scene.scene_number)) {
          await supabase
            .from('project_assets')
            .update({ scene_numbers: [...current, scene.scene_number] })
            .eq('id', projectAssetId);
        }
      } catch (sceneNumErr) {
        console.warn('[SceneAssets] Failed to update scene_numbers:', sceneNumErr);
      }
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

    const stage5Content = stage5States?.[0]?.content;
    const visualStyleId = stage5Content?.locked_visual_style_capsule_id;
    const manualVisualTone = stage5Content?.manual_visual_tone;
    if (!visualStyleId && !manualVisualTone) {
      return res.status(400).json({
        error: 'Visual style not found. Complete Stage 5 first.',
      });
    }

    const imageService = new ImageGenerationService();
    const result = await imageService.createSceneAssetImageJob(
      instanceId,
      projectId,
      project.active_branch_id,
      visualStyleId,
      manualVisualTone
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

// ============================================================================
// SUGGESTIONS ENDPOINTS (3B.8)
// ============================================================================

const BulkSuggestionsSchema = z.object({
  suggestions: z.array(z.object({
    name: z.string().min(1),
    assetType: z.string(),
    description: z.string().optional().default(''),
    justification: z.string().optional().default(''),
  })),
});

const UpdateSuggestionSchema = z.object({
  accepted: z.boolean().optional(),
  dismissed: z.boolean().optional(),
});

/**
 * GET /api/projects/:projectId/scenes/:sceneId/suggestions
 * Fetch non-dismissed suggestions for a scene
 */
router.get('/:projectId/scenes/:sceneId/suggestions', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { projectId, sceneId } = req.params;

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const { data: suggestions, error } = await supabase
      .from('scene_asset_suggestions')
      .select('*')
      .eq('scene_id', sceneId)
      .eq('dismissed', false)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[SceneAssets] List suggestions error:', error);
      return res.status(500).json({ error: 'Failed to fetch suggestions' });
    }

    res.json(suggestions || []);
  } catch (err) {
    console.error('[SceneAssets] List suggestions error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/projects/:projectId/scenes/:sceneId/suggestions
 * Bulk-create suggestions (from AI detection)
 */
router.post('/:projectId/scenes/:sceneId/suggestions', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { projectId, sceneId } = req.params;

    const validation = BulkSuggestionsSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: validation.error.errors,
      });
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const rows = validation.data.suggestions.map(s => ({
      scene_id: sceneId,
      name: s.name,
      asset_type: s.assetType,
      description: s.description || null,
      justification: s.justification || null,
      suggested_by: 'ai_relevance',
    }));

    const { data: created, error: insertError } = await supabase
      .from('scene_asset_suggestions')
      .insert(rows)
      .select('*');

    if (insertError) {
      console.error('[SceneAssets] Bulk create suggestions error:', insertError);
      return res.status(500).json({ error: 'Failed to save suggestions' });
    }

    res.status(201).json(created || []);
  } catch (err) {
    console.error('[SceneAssets] Bulk create suggestions error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/projects/:projectId/scenes/:sceneId/suggestions/:suggestionId
 * Update a suggestion (accept or dismiss)
 */
router.patch('/:projectId/scenes/:sceneId/suggestions/:suggestionId', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { projectId, sceneId, suggestionId } = req.params;

    const validation = UpdateSuggestionSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: validation.error.errors,
      });
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (validation.data.accepted !== undefined) payload.accepted = validation.data.accepted;
    if (validation.data.dismissed !== undefined) payload.dismissed = validation.data.dismissed;

    const { data: updated, error: updateError } = await supabase
      .from('scene_asset_suggestions')
      .update(payload)
      .eq('id', suggestionId)
      .eq('scene_id', sceneId)
      .select('*')
      .single();

    if (updateError) {
      console.error('[SceneAssets] Update suggestion error:', updateError);
      return res.status(500).json({ error: 'Failed to update suggestion' });
    }

    res.json(updated);
  } catch (err) {
    console.error('[SceneAssets] Update suggestion error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// CREATE WITH PROJECT ASSET (3B.6)
// ============================================================================

const CreateWithProjectAssetSchema = z.object({
  name: z.string().min(1).max(200),
  assetType: z.enum(['character', 'location', 'prop']),
  description: z.string().max(2000).optional().default(''),
});

/**
 * POST /api/projects/:projectId/scenes/:sceneId/assets/create-with-project-asset
 * Atomically creates a project_asset + scene_asset_instance in one request
 */
router.post('/:projectId/scenes/:sceneId/assets/create-with-project-asset', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { projectId, sceneId } = req.params;

    const validation = CreateWithProjectAssetSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: validation.error.errors,
      });
    }

    const { name, assetType, description } = validation.data;

    // Verify project ownership + get active_branch_id
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, active_branch_id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Verify scene belongs to project
    const { data: scene, error: sceneError } = await supabase
      .from('scenes')
      .select('id, branch_id, scene_number')
      .eq('id', sceneId)
      .eq('branch_id', project.active_branch_id)
      .single();

    if (sceneError || !scene) {
      return res.status(404).json({ error: 'Scene not found' });
    }

    // 1. Create project_asset
    const { data: projectAsset, error: paError } = await supabase
      .from('project_assets')
      .insert({
        project_id: projectId,
        branch_id: project.active_branch_id,
        name,
        asset_type: assetType,
        description: description || null,
        locked: true,
        source: 'manual',
        scene_numbers: scene.scene_number ? [scene.scene_number] : [],
      })
      .select('id')
      .single();

    if (paError || !projectAsset) {
      console.error('[SceneAssets] Create project asset error:', paError);
      return res.status(500).json({ error: 'Failed to create project asset' });
    }

    // 2. Create scene_asset_instance
    const { data: instance, error: insertError } = await supabase
      .from('scene_asset_instances')
      .insert({
        scene_id: sceneId,
        project_asset_id: projectAsset.id,
        effective_description: description || null,
        description_override: description || null,
        status_tags: [],
        carry_forward: true,
      })
      .select(`
        *,
        project_asset:project_assets(
          id, name, asset_type, description, image_key_url
        )
      `)
      .single();

    if (insertError) {
      console.error('[SceneAssets] Create scene instance error:', insertError);
      // Attempt cleanup of the orphaned project_asset
      await supabase.from('project_assets').delete().eq('id', projectAsset.id);
      return res.status(500).json({ error: 'Failed to create scene asset instance' });
    }

    console.log(
      `[SceneAssets] Created project asset ${projectAsset.id} + scene instance ${instance.id} for scene ${sceneId}`
    );
    res.status(201).json(instance);
  } catch (err) {
    console.error('[SceneAssets] Create with project asset error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// DETERMINISTIC PRE-POPULATION
// ============================================================================

/**
 * POST /api/projects/:projectId/scenes/:sceneId/assets/populate-from-dependencies
 * Pre-populate scene asset instances from scene expected_* fields matched
 * against locked project_assets. Instant, no LLM.
 */
router.post('/:projectId/scenes/:sceneId/assets/populate-from-dependencies', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { projectId, sceneId } = req.params;

    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, active_branch_id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Fetch scene dependencies
    const { data: scene, error: sceneError } = await supabase
      .from('scenes')
      .select('id, expected_characters, expected_location, expected_props')
      .eq('id', sceneId)
      .eq('branch_id', project.active_branch_id)
      .single();

    if (sceneError || !scene) {
      return res.status(404).json({ error: 'Scene not found' });
    }

    const expectedChars: string[] = scene.expected_characters || [];
    const expectedLocation: string = scene.expected_location || '';
    const expectedProps: string[] = scene.expected_props || [];

    // If no dependencies at all, return empty
    if (expectedChars.length === 0 && !expectedLocation && expectedProps.length === 0) {
      return res.json({ instances: [], matched: 0 });
    }

    // Fetch all project_assets for this branch
    const { data: projectAssets, error: assetsError } = await supabase
      .from('project_assets')
      .select('id, name, asset_type, description')
      .eq('branch_id', project.active_branch_id);

    if (assetsError || !projectAssets) {
      return res.status(500).json({ error: 'Failed to fetch project assets' });
    }

    // Check for existing scene asset instances to avoid duplicates
    const { data: existingInstances } = await supabase
      .from('scene_asset_instances')
      .select('project_asset_id')
      .eq('scene_id', sceneId);

    const existingAssetIds = new Set(
      (existingInstances || []).map((i: { project_asset_id: string }) => i.project_asset_id)
    );

    // Build a case-insensitive lookup map
    const assetsByNameLower = new Map<string, typeof projectAssets[0]>();
    for (const asset of projectAssets) {
      assetsByNameLower.set(asset.name.toLowerCase(), asset);
    }

    // Match expected dependencies to project assets
    const instancesToCreate: Array<{
      scene_id: string;
      project_asset_id: string;
      carry_forward: boolean;
      status_tags: string[];
      effective_description: string;
    }> = [];

    for (const charName of expectedChars) {
      const asset = assetsByNameLower.get(charName.toLowerCase());
      if (asset && !existingAssetIds.has(asset.id)) {
        instancesToCreate.push({
          scene_id: sceneId,
          project_asset_id: asset.id,
          carry_forward: true,
          status_tags: [],
          effective_description: asset.description ?? '',
        });
        existingAssetIds.add(asset.id);
      }
    }

    if (expectedLocation) {
      const asset = assetsByNameLower.get(expectedLocation.toLowerCase());
      if (asset && !existingAssetIds.has(asset.id)) {
        instancesToCreate.push({
          scene_id: sceneId,
          project_asset_id: asset.id,
          carry_forward: true,
          status_tags: [],
          effective_description: asset.description ?? '',
        });
        existingAssetIds.add(asset.id);
      }
    }

    for (const propName of expectedProps) {
      const asset = assetsByNameLower.get(propName.toLowerCase());
      if (asset && !existingAssetIds.has(asset.id)) {
        instancesToCreate.push({
          scene_id: sceneId,
          project_asset_id: asset.id,
          carry_forward: true,
          status_tags: [],
          effective_description: asset.description ?? '',
        });
        existingAssetIds.add(asset.id);
      }
    }

    if (instancesToCreate.length === 0) {
      return res.json({ instances: [], matched: 0 });
    }

    const { data: createdInstances, error: insertError } = await supabase
      .from('scene_asset_instances')
      .insert(instancesToCreate)
      .select('*, project_assets(*)');

    if (insertError) {
      console.error('[SceneAssets] Populate from deps insert error:', insertError);
      return res.status(500).json({ error: 'Failed to create scene asset instances' });
    }

    console.log(`[SceneAssets] Pre-populated ${createdInstances.length} assets from dependencies for scene ${sceneId}`);
    res.json({ instances: createdInstances, matched: createdInstances.length });
  } catch (err) {
    console.error('[SceneAssets] Populate from dependencies error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// GENERATION ATTEMPTS ENDPOINTS (3B.1)
// ============================================================================

/**
 * GET /api/projects/:projectId/scenes/:sceneId/assets/:instanceId/attempts
 * List all generation attempts for a scene asset instance (with lazy backfill)
 */
router.get('/:projectId/scenes/:sceneId/assets/:instanceId/attempts', async (req, res) => {
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

    // Verify instance belongs to scene
    const { data: instance, error: instanceError } = await supabase
      .from('scene_asset_instances')
      .select('id')
      .eq('id', instanceId)
      .eq('scene_id', sceneId)
      .single();

    if (instanceError || !instance) {
      return res.status(404).json({ error: 'Scene asset instance not found' });
    }

    const attemptsService = new SceneAssetAttemptsService();
    await attemptsService.backfillAttemptIfNeeded(instanceId);
    const attempts = await attemptsService.listAttempts(instanceId);

    res.json(attempts);
  } catch (err) {
    console.error('[SceneAssets] List attempts error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/projects/:projectId/scenes/:sceneId/assets/:instanceId/attempts/:attemptId/select
 * Select a specific attempt as the active image
 */
router.post('/:projectId/scenes/:sceneId/assets/:instanceId/attempts/:attemptId/select', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { projectId, sceneId, instanceId, attemptId } = req.params;

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const { data: instance, error: instanceError } = await supabase
      .from('scene_asset_instances')
      .select('id')
      .eq('id', instanceId)
      .eq('scene_id', sceneId)
      .single();

    if (instanceError || !instance) {
      return res.status(404).json({ error: 'Scene asset instance not found' });
    }

    const attemptsService = new SceneAssetAttemptsService();
    const attempt = await attemptsService.selectAttempt(instanceId, attemptId);

    res.json(attempt);
  } catch (err) {
    console.error('[SceneAssets] Select attempt error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Internal server error' });
  }
});

/**
 * DELETE /api/projects/:projectId/scenes/:sceneId/assets/:instanceId/attempts/:attemptId
 * Delete a non-selected attempt
 */
router.delete('/:projectId/scenes/:sceneId/assets/:instanceId/attempts/:attemptId', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { projectId, sceneId, instanceId, attemptId } = req.params;

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const { data: instance, error: instanceError } = await supabase
      .from('scene_asset_instances')
      .select('id')
      .eq('id', instanceId)
      .eq('scene_id', sceneId)
      .single();

    if (instanceError || !instance) {
      return res.status(404).json({ error: 'Scene asset instance not found' });
    }

    const attemptsService = new SceneAssetAttemptsService();
    await attemptsService.deleteAttempt(instanceId, attemptId);

    res.status(204).send();
  } catch (err) {
    console.error('[SceneAssets] Delete attempt error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Internal server error' });
  }
});

// ============================================================================
// USE MASTER AS-IS ENDPOINTS (3B.4)
// ============================================================================

/**
 * POST /api/projects/:projectId/scenes/:sceneId/assets/:instanceId/use-master-as-is
 * Toggle "use master as-is" mode
 */
router.post('/:projectId/scenes/:sceneId/assets/:instanceId/use-master-as-is', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { projectId, sceneId, instanceId } = req.params;
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled must be a boolean' });
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, active_branch_id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const { data: instance, error: instanceError } = await supabase
      .from('scene_asset_instances')
      .select('*, project_asset:project_assets(image_key_url)')
      .eq('id', instanceId)
      .eq('scene_id', sceneId)
      .single();

    if (instanceError || !instance) {
      return res.status(404).json({ error: 'Scene asset instance not found' });
    }

    if (enabled) {
      // Determine the master reference URL
      const projectAsset = instance.project_asset as { image_key_url?: string | null } | null;
      const masterUrl = instance.selected_master_reference_url || projectAsset?.image_key_url;

      if (!masterUrl) {
        return res.status(400).json({ error: 'No master image available to use' });
      }

      const attemptsService = new SceneAssetAttemptsService();

      // Enforce cap
      await attemptsService.enforceAttemptCap(instanceId);

      // Deselect previous
      await supabase
        .from('scene_asset_generation_attempts')
        .update({ is_selected: false })
        .eq('scene_asset_instance_id', instanceId)
        .eq('is_selected', true);

      // Create master_copy attempt
      await attemptsService.createAttempt(instanceId, {
        image_url: masterUrl,
        source: 'master_copy',
        is_selected: true,
        copied_from_url: masterUrl,
      });

      // Update instance
      await supabase
        .from('scene_asset_instances')
        .update({
          use_master_as_is: true,
          image_key_url: masterUrl,
        })
        .eq('id', instanceId);
    } else {
      // Just toggle off — do NOT change image_key_url
      await supabase
        .from('scene_asset_instances')
        .update({ use_master_as_is: false })
        .eq('id', instanceId);
    }

    // Fetch updated instance
    const { data: updated } = await supabase
      .from('scene_asset_instances')
      .select(`
        *,
        project_asset:project_assets(
          id, name, asset_type, description, image_key_url
        )
      `)
      .eq('id', instanceId)
      .single();

    res.json(updated);
  } catch (err) {
    console.error('[SceneAssets] Use master as-is error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/projects/:projectId/scenes/:sceneId/assets/bulk-use-master-as-is
 * Bulk toggle "use master as-is" for multiple instances
 */
router.post('/:projectId/scenes/:sceneId/assets/bulk-use-master-as-is', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { projectId, sceneId } = req.params;
    const { instanceIds, enabled } = req.body;

    if (!Array.isArray(instanceIds) || typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'instanceIds must be an array and enabled must be a boolean' });
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, active_branch_id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const attemptsService = new SceneAssetAttemptsService();
    const results: Array<{ instanceId: string; success: boolean; error?: string }> = [];

    for (const instanceId of instanceIds) {
      try {
        const { data: instance } = await supabase
          .from('scene_asset_instances')
          .select('*, project_asset:project_assets(image_key_url)')
          .eq('id', instanceId)
          .eq('scene_id', sceneId)
          .single();

        if (!instance) {
          results.push({ instanceId, success: false, error: 'Instance not found' });
          continue;
        }

        if (enabled) {
          const projectAsset = instance.project_asset as { image_key_url?: string | null } | null;
          const masterUrl = instance.selected_master_reference_url || projectAsset?.image_key_url;

          if (!masterUrl) {
            results.push({ instanceId, success: false, error: 'No master image' });
            continue;
          }

          await attemptsService.enforceAttemptCap(instanceId);

          await supabase
            .from('scene_asset_generation_attempts')
            .update({ is_selected: false })
            .eq('scene_asset_instance_id', instanceId)
            .eq('is_selected', true);

          await attemptsService.createAttempt(instanceId, {
            image_url: masterUrl,
            source: 'master_copy',
            is_selected: true,
            copied_from_url: masterUrl,
          });

          await supabase
            .from('scene_asset_instances')
            .update({ use_master_as_is: true, image_key_url: masterUrl })
            .eq('id', instanceId);
        } else {
          await supabase
            .from('scene_asset_instances')
            .update({ use_master_as_is: false })
            .eq('id', instanceId);
        }

        results.push({ instanceId, success: true });
      } catch (e) {
        results.push({ instanceId, success: false, error: e instanceof Error ? e.message : 'Unknown error' });
      }
    }

    res.json({ results });
  } catch (err) {
    console.error('[SceneAssets] Bulk use master as-is error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// MASTER REFERENCE CHAIN ENDPOINTS (3B.2)
// ============================================================================

/**
 * GET /api/projects/:projectId/scenes/:sceneId/assets/:instanceId/reference-chain
 * Get Stage 5 master image + selected images from prior scenes for this asset
 */
router.get('/:projectId/scenes/:sceneId/assets/:instanceId/reference-chain', async (req, res) => {
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

    // Get the instance to find project_asset_id and current scene_number
    const { data: instance, error: instanceError } = await supabase
      .from('scene_asset_instances')
      .select('id, project_asset_id, scene_id')
      .eq('id', instanceId)
      .eq('scene_id', sceneId)
      .single();

    if (instanceError || !instance) {
      return res.status(404).json({ error: 'Scene asset instance not found' });
    }

    // Get current scene number
    const { data: currentScene } = await supabase
      .from('scenes')
      .select('scene_number')
      .eq('id', sceneId)
      .single();

    if (!currentScene) {
      return res.status(404).json({ error: 'Scene not found' });
    }

    const chain: Array<{
      source: 'stage5_master' | 'prior_scene_instance' | 'transformation';
      imageUrl: string;
      sceneNumber: number | null;
      instanceId?: string;
      transformationDescription?: string;
    }> = [];

    // 1. Get Stage 5 master image
    const { data: projectAsset } = await supabase
      .from('project_assets')
      .select('image_key_url')
      .eq('id', instance.project_asset_id)
      .single();

    if (projectAsset?.image_key_url) {
      chain.push({
        source: 'stage5_master',
        imageUrl: projectAsset.image_key_url,
        sceneNumber: null,
      });
    }

    // 2. Get prior scene instances for this project_asset
    const { data: priorScenes } = await supabase
      .from('scenes')
      .select('id, scene_number')
      .eq('branch_id', project.active_branch_id)
      .lt('scene_number', currentScene.scene_number)
      .order('scene_number', { ascending: true });

    if (priorScenes) {
      for (const priorScene of priorScenes) {
        const { data: priorInstance } = await supabase
          .from('scene_asset_instances')
          .select('id, image_key_url')
          .eq('scene_id', priorScene.id)
          .eq('project_asset_id', instance.project_asset_id)
          .single();

        if (priorInstance) {
          // Try to get the selected attempt image, fallback to image_key_url
          const { data: selectedAttempt } = await supabase
            .from('scene_asset_generation_attempts')
            .select('image_url')
            .eq('scene_asset_instance_id', priorInstance.id)
            .eq('is_selected', true)
            .single();

          const imageUrl = selectedAttempt?.image_url || priorInstance.image_key_url;
          if (imageUrl) {
            chain.push({
              source: 'prior_scene_instance',
              imageUrl,
              sceneNumber: priorScene.scene_number,
              instanceId: priorInstance.id,
            });
          }
        }
      }
    }

    // 3. Get confirmed transformation images for this project_asset (across all scenes)
    const { data: transformationResults } = await supabase
      .from('transformation_events')
      .select(`
        post_image_key_url,
        post_description,
        scene:scenes!inner(scene_number),
        scene_asset_instance:scene_asset_instances!inner(project_asset_id)
      `)
      .eq('scene_asset_instance.project_asset_id', instance.project_asset_id)
      .eq('confirmed', true)
      .not('post_image_key_url', 'is', null);

    if (transformationResults) {
      for (const tr of transformationResults) {
        const sceneNum = (tr.scene as any)?.scene_number ?? null;
        // Only include transformation images from prior scenes or current scene
        if (sceneNum !== null && sceneNum <= currentScene.scene_number) {
          chain.push({
            source: 'transformation',
            imageUrl: tr.post_image_key_url!,
            sceneNumber: sceneNum,
            transformationDescription: tr.post_description ?? undefined,
          });
        }
      }
    }

    res.json(chain);
  } catch (err) {
    console.error('[SceneAssets] Reference chain error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/projects/:projectId/scenes/:sceneId/assets/:instanceId/select-master-reference
 * Select a master reference from the chain
 */
router.post('/:projectId/scenes/:sceneId/assets/:instanceId/select-master-reference', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { projectId, sceneId, instanceId } = req.params;
    const { source, instanceId: refInstanceId, imageUrl } = req.body;

    if (!source || !imageUrl) {
      return res.status(400).json({ error: 'source and imageUrl are required' });
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const updatePayload: Record<string, unknown> = {
      selected_master_reference_url: imageUrl,
      selected_master_reference_source: source,
      selected_master_reference_instance_id: refInstanceId || null,
    };

    // If use_master_as_is is true, also update image_key_url + create master_copy attempt
    const { data: instance } = await supabase
      .from('scene_asset_instances')
      .select('use_master_as_is')
      .eq('id', instanceId)
      .eq('scene_id', sceneId)
      .single();

    if (instance?.use_master_as_is) {
      updatePayload.image_key_url = imageUrl;

      const attemptsService = new SceneAssetAttemptsService();
      await attemptsService.enforceAttemptCap(instanceId);

      await supabase
        .from('scene_asset_generation_attempts')
        .update({ is_selected: false })
        .eq('scene_asset_instance_id', instanceId)
        .eq('is_selected', true);

      await attemptsService.createAttempt(instanceId, {
        image_url: imageUrl,
        source: 'master_copy',
        is_selected: true,
        copied_from_url: imageUrl,
      });
    }

    await supabase
      .from('scene_asset_instances')
      .update(updatePayload)
      .eq('id', instanceId);

    const { data: updated } = await supabase
      .from('scene_asset_instances')
      .select(`
        *,
        project_asset:project_assets(
          id, name, asset_type, description, image_key_url
        )
      `)
      .eq('id', instanceId)
      .single();

    res.json(updated);
  } catch (err) {
    console.error('[SceneAssets] Select master reference error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// IMAGE UPLOAD ENDPOINT (3B.3)
// ============================================================================

/**
 * POST /api/projects/:projectId/scenes/:sceneId/assets/:instanceId/upload-image
 * Upload a custom image for a scene asset instance
 */
router.post('/:projectId/scenes/:sceneId/assets/:instanceId/upload-image', sceneAssetUpload.single('image'), async (req, res) => {
  try {
    const userId = req.user!.id;
    const { projectId, sceneId, instanceId } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, active_branch_id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const { data: instance, error: instanceError } = await supabase
      .from('scene_asset_instances')
      .select('id, use_master_as_is')
      .eq('id', instanceId)
      .eq('scene_id', sceneId)
      .single();

    if (instanceError || !instance) {
      return res.status(404).json({ error: 'Scene asset instance not found' });
    }

    const attemptsService = new SceneAssetAttemptsService();

    // Enforce 8-attempt cap
    await attemptsService.enforceAttemptCap(instanceId);

    // Upload to Supabase Storage
    const fileExt = path.extname(req.file.originalname);
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    const storagePath = `project_${projectId}/branch_${project.active_branch_id}/scene_${sceneId}/scene-assets/uploads/${instanceId}_${timestamp}_${random}${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('asset-images')
      .upload(storagePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      console.error('[SceneAssets] Upload error:', uploadError);
      return res.status(500).json({ error: 'Failed to upload image' });
    }

    const { data: urlData } = supabase.storage
      .from('asset-images')
      .getPublicUrl(storagePath);

    // Deselect previous
    await supabase
      .from('scene_asset_generation_attempts')
      .update({ is_selected: false })
      .eq('scene_asset_instance_id', instanceId)
      .eq('is_selected', true);

    // Create uploaded attempt as selected
    await attemptsService.createAttempt(instanceId, {
      image_url: urlData.publicUrl,
      storage_path: storagePath,
      source: 'uploaded',
      is_selected: true,
      original_filename: req.file.originalname,
      file_size_bytes: req.file.size,
      mime_type: req.file.mimetype,
    });

    // Update instance image_key_url + turn off use_master_as_is if it was on
    const updatePayload: Record<string, unknown> = {
      image_key_url: urlData.publicUrl,
    };
    if (instance.use_master_as_is) {
      updatePayload.use_master_as_is = false;
    }

    await supabase
      .from('scene_asset_instances')
      .update(updatePayload)
      .eq('id', instanceId);

    // Fetch updated instance
    const { data: updated } = await supabase
      .from('scene_asset_instances')
      .select(`
        *,
        project_asset:project_assets(
          id, name, asset_type, description, image_key_url
        )
      `)
      .eq('id', instanceId)
      .single();

    res.json(updated);
  } catch (err) {
    console.error('[SceneAssets] Upload image error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// TRANSFORMATION EVENT ROUTES
// ============================================================================

const CreateTransformationEventSchema = z.object({
  scene_asset_instance_id: z.string().uuid(),
  trigger_shot_id: z.string().uuid(),
  transformation_type: z.enum(['instant', 'gradual', 'within_shot']),
  completion_shot_id: z.string().uuid().optional().nullable(),
  pre_description: z.string().optional(),
  post_description: z.string().min(1),
  transformation_narrative: z.string().optional().nullable(),
  pre_status_tags: z.array(z.string()).optional(),
  post_status_tags: z.array(z.string()).optional(),
  detected_by: z.enum(['stage7_extraction', 'stage8_relevance', 'manual']),
});

const UpdateTransformationEventSchema = z.object({
  transformation_type: z.enum(['instant', 'gradual', 'within_shot']).optional(),
  trigger_shot_id: z.string().uuid().optional(),
  completion_shot_id: z.string().uuid().optional().nullable(),
  pre_description: z.string().optional(),
  post_description: z.string().optional(),
  transformation_narrative: z.string().optional().nullable(),
  pre_image_key_url: z.string().optional().nullable(),
  post_image_key_url: z.string().optional().nullable(),
  pre_status_tags: z.array(z.string()).optional(),
  post_status_tags: z.array(z.string()).optional(),
});

/**
 * GET /:projectId/scenes/:sceneId/transformation-events
 * List all transformation events for a scene (with shot joins)
 */
router.get('/:projectId/scenes/:sceneId/transformation-events', async (req, res) => {
  try {
    const { sceneId } = req.params;
    const events = await transformationEventService.getTransformationEventsForScene(sceneId);
    res.json(events);
  } catch (err) {
    console.error('[TransformationEvents] Fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch transformation events' });
  }
});

/**
 * POST /:projectId/scenes/:sceneId/transformation-events
 * Create a transformation event (manual or from detection)
 */
router.post('/:projectId/scenes/:sceneId/transformation-events', async (req, res) => {
  try {
    const { sceneId } = req.params;
    const parsed = CreateTransformationEventSchema.parse(req.body);
    const event = await transformationEventService.createTransformationEvent({
      ...parsed,
      scene_id: sceneId,
      transformation_type: parsed.transformation_type as TransformationType,
      detected_by: parsed.detected_by as DetectedBy,
    });
    res.status(201).json(event);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    console.error('[TransformationEvents] Create error:', err);
    res.status(500).json({ error: 'Failed to create transformation event' });
  }
});

/**
 * PUT /:projectId/scenes/:sceneId/transformation-events/:eventId
 * Update a transformation event
 */
router.put('/:projectId/scenes/:sceneId/transformation-events/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const parsed = UpdateTransformationEventSchema.parse(req.body);
    const event = await transformationEventService.updateTransformationEvent(eventId, parsed);
    res.json(event);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    console.error('[TransformationEvents] Update error:', err);
    res.status(500).json({ error: 'Failed to update transformation event' });
  }
});

/**
 * POST /:projectId/scenes/:sceneId/transformation-events/:eventId/confirm
 * Confirm a detected transformation event
 */
router.post('/:projectId/scenes/:sceneId/transformation-events/:eventId/confirm', async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await transformationEventService.confirmTransformationEvent(eventId);
    res.json(event);
  } catch (err) {
    console.error('[TransformationEvents] Confirm error:', err);
    res.status(500).json({ error: 'Failed to confirm transformation event' });
  }
});

/**
 * DELETE /:projectId/scenes/:sceneId/transformation-events/:eventId
 * Delete a transformation event
 */
router.delete('/:projectId/scenes/:sceneId/transformation-events/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    await transformationEventService.deleteTransformationEvent(eventId);
    res.json({ success: true });
  } catch (err) {
    console.error('[TransformationEvents] Delete error:', err);
    res.status(500).json({ error: 'Failed to delete transformation event' });
  }
});

/**
 * POST /:projectId/scenes/:sceneId/transformation-events/:eventId/generate-post-description
 * LLM-generate post_description from pre_description + narrative
 */
router.post('/:projectId/scenes/:sceneId/transformation-events/:eventId/generate-post-description', async (req, res) => {
  try {
    const { eventId } = req.params;
    const postDescription = await transformationEventService.generatePostDescription(eventId);
    res.json({ post_description: postDescription });
  } catch (err) {
    console.error('[TransformationEvents] Generate post-description error:', err);
    res.status(500).json({ error: 'Failed to generate post-description' });
  }
});

/**
 * POST /:projectId/scenes/:sceneId/transformation-events/generate-prefill
 * LLM-generate pre-fill data (post_description + transformation_narrative) from trigger shot context
 */
router.post('/:projectId/scenes/:sceneId/transformation-events/generate-prefill', async (req, res) => {
  try {
    const { sceneId } = req.params;
    const { trigger_shot_id, scene_asset_instance_id, transformation_type } = req.body;

    if (!trigger_shot_id || !scene_asset_instance_id) {
      return res.status(400).json({ error: 'trigger_shot_id and scene_asset_instance_id are required' });
    }

    const result = await transformationEventService.generateTransformationPrefill(
      trigger_shot_id,
      scene_asset_instance_id,
      transformation_type || 'instant',
      sceneId
    );

    res.json(result);
  } catch (err) {
    console.error('[TransformationEvents] Generate prefill error:', err);
    res.status(500).json({ error: 'Failed to generate prefill' });
  }
});

/**
 * POST /:projectId/scenes/:sceneId/transformation-events/:eventId/generate-post-image
 * Generate post-transformation reference image for a transformation event
 */
router.post('/:projectId/scenes/:sceneId/transformation-events/:eventId/generate-post-image', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { projectId, sceneId, eventId } = req.params;

    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, active_branch_id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Fetch transformation event with asset details
    const { data: event, error: eventError } = await supabase
      .from('transformation_events')
      .select(`
        *,
        scene_asset_instance:scene_asset_instances(
          id, project_asset_id, image_key_url,
          project_asset:project_assets(id, asset_type, image_key_url)
        )
      `)
      .eq('id', eventId)
      .eq('scene_id', sceneId)
      .single();

    if (eventError || !event) {
      return res.status(404).json({ error: 'Transformation event not found' });
    }

    if (!event.post_description?.trim()) {
      return res.status(400).json({ error: 'Post-description is required before generating an image' });
    }

    const assetInstance = event.scene_asset_instance as any;
    const projectAsset = assetInstance?.project_asset;
    if (!projectAsset) {
      return res.status(400).json({ error: 'Asset not found for this transformation event' });
    }

    // Fetch Stage 5 visual style
    const { data: stage5States } = await supabase
      .from('stage_states')
      .select('content')
      .eq('branch_id', project.active_branch_id)
      .eq('stage_number', 5)
      .order('version', { ascending: false })
      .limit(1);

    const stage5Content = stage5States?.[0]?.content;
    const visualStyleId = stage5Content?.locked_visual_style_capsule_id;
    const manualVisualTone = stage5Content?.manual_visual_tone;
    if (!visualStyleId && !manualVisualTone) {
      return res.status(400).json({ error: 'Visual style not found. Complete Stage 5 first.' });
    }

    // Generate image using ImageGenerationService
    const imageService = new ImageGenerationService();

    // Use the asset's current image as reference for identity
    const referenceImageUrl = assetInstance?.image_key_url || projectAsset?.image_key_url;

    const result = await imageService.createImageJob({
      projectId,
      branchId: project.active_branch_id,
      jobType: 'transformation_post',
      prompt: event.post_description,
      visualStyleCapsuleId: visualStyleId,
      manualVisualTone,
      width: projectAsset.asset_type === 'location' ? 1024 : projectAsset.asset_type === 'prop' ? 512 : 512,
      height: projectAsset.asset_type === 'location' ? 576 : projectAsset.asset_type === 'prop' ? 512 : 768,
      assetId: assetInstance.project_asset_id,
      sceneId,
      transformationEventId: eventId,
      idempotencyKey: `post-transform-${eventId}-${Date.now()}`,
      referenceImageUrl: referenceImageUrl ?? undefined,
    });

    res.json({ jobId: result.jobId, status: result.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to generate post-image';
    console.error('[TransformationEvents] Generate post-image error:', message, err);
    res.status(500).json({ error: message });
  }
});

// ============================================================================
// TRANSFORMATION IMAGES ENDPOINT (Improvement 4)
// ============================================================================

/**
 * GET /:projectId/assets/:projectAssetId/transformation-images
 * Fetch all confirmed transformation events with post images for a given project asset
 */
router.get('/:projectId/assets/:projectAssetId/transformation-images', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { projectId, projectAssetId } = req.params;

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const { data: results, error } = await supabase
      .from('transformation_events')
      .select(`
        id,
        post_description,
        post_image_key_url,
        scene_asset_instance:scene_asset_instances!inner(
          project_asset_id,
          scene:scenes!inner(scene_number)
        )
      `)
      .eq('scene_asset_instance.project_asset_id', projectAssetId)
      .eq('confirmed', true)
      .not('post_image_key_url', 'is', null);

    if (error) {
      console.error('[TransformationImages] Fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch transformation images' });
    }

    const images = (results ?? []).map((r: any) => ({
      eventId: r.id,
      postDescription: r.post_description,
      imageUrl: r.post_image_key_url,
      sceneNumber: r.scene_asset_instance?.scene?.scene_number ?? 0,
    }));

    // Sort by scene number
    images.sort((a: any, b: any) => a.sceneNumber - b.sceneNumber);

    res.json(images);
  } catch (err) {
    console.error('[TransformationImages] Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export const sceneAssetsRouter = router;
