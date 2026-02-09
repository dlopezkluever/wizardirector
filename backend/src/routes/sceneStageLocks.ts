import { Router } from 'express';
import { supabase } from '../config/supabase.js';

const router = Router();

// Type for stage lock status
type StageLockStatus = 'draft' | 'locked' | 'outdated';

interface StageLockEntry {
  status: StageLockStatus;
  locked_at?: string;
}

type StageLocks = Record<string, StageLockEntry>;

// GET /api/projects/:projectId/scenes/:sceneId/stage-locks
// Return full stage_locks JSONB for a scene
router.get('/:projectId/scenes/:sceneId/stage-locks', async (req, res) => {
  try {
    const { projectId, sceneId } = req.params;
    const userId = req.user!.id;

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

    // Fetch scene
    const { data: scene, error: sceneError } = await supabase
      .from('scenes')
      .select('id, stage_locks')
      .eq('id', sceneId)
      .eq('branch_id', project.active_branch_id)
      .single();

    if (sceneError || !scene) {
      return res.status(404).json({ error: 'Scene not found' });
    }

    res.json({ stageLocks: scene.stage_locks || {} });
  } catch (error) {
    console.error('Error in GET stage-locks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/projects/:projectId/scenes/:sceneId/stage-locks/:stageNumber/lock
// Lock a specific stage (validates previous stage is locked)
router.post('/:projectId/scenes/:sceneId/stage-locks/:stageNumber/lock', async (req, res) => {
  try {
    const { projectId, sceneId, stageNumber } = req.params;
    const userId = req.user!.id;
    const stage = parseInt(stageNumber);

    if (isNaN(stage) || stage < 7 || stage > 12) {
      return res.status(400).json({ error: 'Invalid stage number. Must be between 7 and 12' });
    }

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

    // Fetch scene with current stage_locks
    const { data: scene, error: sceneError } = await supabase
      .from('scenes')
      .select('id, stage_locks, shot_list_locked_at')
      .eq('id', sceneId)
      .eq('branch_id', project.active_branch_id)
      .single();

    if (sceneError || !scene) {
      return res.status(404).json({ error: 'Scene not found' });
    }

    const stageLocks: StageLocks = scene.stage_locks || {};

    // Validate previous stage is locked (except stage 7 which is the first scene stage)
    if (stage > 7) {
      const prevLock = stageLocks[String(stage - 1)];
      if (!prevLock || prevLock.status !== 'locked') {
        return res.status(400).json({
          error: `Cannot lock stage ${stage}. Stage ${stage - 1} must be locked first.`,
          details: {
            requiredStage: stage - 1,
            requiredStatus: 'locked',
            currentStatus: prevLock?.status || 'draft'
          }
        });
      }
    }

    // Update stage_locks
    const now = new Date().toISOString();
    stageLocks[String(stage)] = { status: 'locked', locked_at: now };

    const updateData: Record<string, unknown> = {
      stage_locks: stageLocks,
      updated_at: now
    };

    // Backward compat: also set shot_list_locked_at for stage 7
    if (stage === 7) {
      updateData.shot_list_locked_at = now;
    }

    const { data: updated, error: updateError } = await supabase
      .from('scenes')
      .update(updateData)
      .eq('id', sceneId)
      .select('id, stage_locks')
      .single();

    if (updateError || !updated) {
      console.error('Failed to lock stage:', updateError);
      return res.status(500).json({ error: 'Failed to lock stage' });
    }

    res.json({
      success: true,
      stageLocks: updated.stage_locks
    });
  } catch (error) {
    console.error('Error in POST stage-locks lock:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/projects/:projectId/scenes/:sceneId/stage-locks/:stageNumber/unlock
// Two-phase: without confirm returns impact assessment; with confirm=true executes unlock + cascade
router.post('/:projectId/scenes/:sceneId/stage-locks/:stageNumber/unlock', async (req, res) => {
  try {
    const { projectId, sceneId, stageNumber } = req.params;
    const { confirm = false } = req.body;
    const userId = req.user!.id;
    const stage = parseInt(stageNumber);

    if (isNaN(stage) || stage < 7 || stage > 12) {
      return res.status(400).json({ error: 'Invalid stage number. Must be between 7 and 12' });
    }

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

    // Fetch scene
    const { data: scene, error: sceneError } = await supabase
      .from('scenes')
      .select('id, stage_locks')
      .eq('id', sceneId)
      .eq('branch_id', project.active_branch_id)
      .single();

    if (sceneError || !scene) {
      return res.status(404).json({ error: 'Scene not found' });
    }

    const stageLocks: StageLocks = scene.stage_locks || {};
    const currentLock = stageLocks[String(stage)];

    if (!currentLock || currentLock.status === 'draft') {
      return res.status(400).json({ error: 'Stage is not locked' });
    }

    // Find downstream locked/outdated stages
    const downstreamStages: number[] = [];
    for (let s = stage + 1; s <= 12; s++) {
      const lock = stageLocks[String(s)];
      if (lock && (lock.status === 'locked' || lock.status === 'outdated')) {
        downstreamStages.push(s);
      }
    }

    // Count affected frames/videos for impact assessment
    let framesAffected = 0;
    let videosAffected = 0;

    const { data: shots } = await supabase
      .from('shots')
      .select('id')
      .eq('scene_id', sceneId);

    const shotIds = (shots || []).map(s => s.id);

    if (shotIds.length > 0) {
      const { data: frames } = await supabase
        .from('frames')
        .select('id')
        .in('shot_id', shotIds)
        .neq('status', 'invalidated');

      const { data: videos } = await supabase
        .from('videos')
        .select('id')
        .in('shot_id', shotIds)
        .neq('status', 'invalidated');

      framesAffected = frames?.length || 0;
      videosAffected = videos?.length || 0;
    }

    const estimatedCost = framesAffected * 0.05 + videosAffected * 2.50;

    // Phase 1: Return impact assessment if not confirmed
    if (!confirm) {
      return res.status(409).json({
        error: 'Unlocking will affect downstream stages',
        details: {
          stage,
          downstreamStages,
          framesAffected,
          videosAffected,
          estimatedCost: estimatedCost.toFixed(2),
          message: downstreamStages.length > 0
            ? `Stages ${downstreamStages.join(', ')} will be marked as outdated. ${framesAffected} frames and ${videosAffected} videos may need regeneration.`
            : 'No downstream stages affected.'
        },
        requiresConfirmation: true
      });
    }

    // Phase 2: Execute unlock + cascade
    // Set this stage to draft, downstream locked stages to outdated
    stageLocks[String(stage)] = { status: 'draft' };
    for (const ds of downstreamStages) {
      stageLocks[String(ds)] = { status: 'outdated' };
    }

    const updateData: Record<string, unknown> = {
      stage_locks: stageLocks,
      updated_at: new Date().toISOString()
    };

    // Backward compat: clear shot_list_locked_at for stage 7
    if (stage === 7) {
      updateData.shot_list_locked_at = null;
    }

    const { data: updated, error: updateError } = await supabase
      .from('scenes')
      .update(updateData)
      .eq('id', sceneId)
      .select('id, stage_locks')
      .single();

    if (updateError || !updated) {
      console.error('Failed to unlock stage:', updateError);
      return res.status(500).json({ error: 'Failed to unlock stage' });
    }

    res.json({
      success: true,
      stageLocks: updated.stage_locks,
      invalidated: {
        downstreamStages,
        framesAffected,
        videosAffected
      }
    });
  } catch (error) {
    console.error('Error in POST stage-locks unlock:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/projects/:projectId/scenes/:sceneId/stage-locks/:stageNumber/relock
// Re-lock an outdated stage without changes
router.post('/:projectId/scenes/:sceneId/stage-locks/:stageNumber/relock', async (req, res) => {
  try {
    const { projectId, sceneId, stageNumber } = req.params;
    const userId = req.user!.id;
    const stage = parseInt(stageNumber);

    if (isNaN(stage) || stage < 7 || stage > 12) {
      return res.status(400).json({ error: 'Invalid stage number. Must be between 7 and 12' });
    }

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

    // Fetch scene
    const { data: scene, error: sceneError } = await supabase
      .from('scenes')
      .select('id, stage_locks')
      .eq('id', sceneId)
      .eq('branch_id', project.active_branch_id)
      .single();

    if (sceneError || !scene) {
      return res.status(404).json({ error: 'Scene not found' });
    }

    const stageLocks: StageLocks = scene.stage_locks || {};
    const currentLock = stageLocks[String(stage)];

    if (!currentLock || currentLock.status !== 'outdated') {
      return res.status(400).json({ error: 'Stage is not in outdated status' });
    }

    // Validate previous stage is locked
    if (stage > 7) {
      const prevLock = stageLocks[String(stage - 1)];
      if (!prevLock || (prevLock.status !== 'locked')) {
        return res.status(400).json({
          error: `Cannot re-lock stage ${stage}. Stage ${stage - 1} must be locked first.`
        });
      }
    }

    // Re-lock
    const now = new Date().toISOString();
    stageLocks[String(stage)] = { status: 'locked', locked_at: now };

    const updateData: Record<string, unknown> = {
      stage_locks: stageLocks,
      updated_at: now
    };

    // Backward compat for stage 7
    if (stage === 7) {
      updateData.shot_list_locked_at = now;
    }

    const { data: updated, error: updateError } = await supabase
      .from('scenes')
      .update(updateData)
      .eq('id', sceneId)
      .select('id, stage_locks')
      .single();

    if (updateError || !updated) {
      console.error('Failed to re-lock stage:', updateError);
      return res.status(500).json({ error: 'Failed to re-lock stage' });
    }

    res.json({
      success: true,
      stageLocks: updated.stage_locks
    });
  } catch (error) {
    console.error('Error in POST stage-locks relock:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as sceneStageLockRouter };
