/**
 * Scene Asset Instance Routes
 * Handles Stage 8 scene-specific asset management with inheritance (Feature 5.1)
 */

import { Router } from 'express';
import { supabase } from '../config/supabase.js';
import { AssetInheritanceService } from '../services/assetInheritanceService.js';

const router = Router();

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

export const sceneAssetsRouter = router;
