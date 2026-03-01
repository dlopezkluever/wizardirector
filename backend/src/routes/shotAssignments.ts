/**
 * Shot Asset Assignment Routes
 * Per-shot asset assignment CRUD with presence_type control.
 * Mounted at /api/projects/:projectId/scenes/:sceneId/shot-assignments
 */

import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase.js';
import { shotAssetAssignmentService } from '../services/shotAssetAssignmentService.js';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const PresenceTypeSchema = z.enum(['throughout', 'enters', 'exits', 'passes_through']);

const CreateAssignmentsSchema = z.object({
  assignments: z.array(z.object({
    shotId: z.string().uuid(),
    instanceId: z.string().uuid(),
    presenceType: PresenceTypeSchema.default('throughout'),
  })).min(1),
});

const UpdateAssignmentSchema = z.object({
  presenceType: PresenceTypeSchema,
});

// ============================================================================
// HELPER: Verify project ownership
// ============================================================================

async function verifyProjectOwnership(
  userId: string,
  projectId: string,
  sceneId: string
): Promise<{ valid: boolean; error?: string }> {
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single();

  if (projectError || !project) {
    return { valid: false, error: 'Project not found' };
  }

  const { data: scene, error: sceneError } = await supabase
    .from('scenes')
    .select('id, branch_id')
    .eq('id', sceneId)
    .single();

  if (sceneError || !scene) {
    return { valid: false, error: 'Scene not found' };
  }

  // Verify scene belongs to project via branch
  const { data: branch, error: branchError } = await supabase
    .from('branches')
    .select('id')
    .eq('id', scene.branch_id)
    .eq('project_id', projectId)
    .single();

  if (branchError || !branch) {
    return { valid: false, error: 'Scene does not belong to this project' };
  }

  return { valid: true };
}

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/projects/:projectId/scenes/:sceneId/shot-assignments
 * List all assignments for the scene (grouped by shot)
 */
router.get('/:projectId/scenes/:sceneId/shot-assignments', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { projectId, sceneId } = req.params;

    const ownership = await verifyProjectOwnership(userId, projectId, sceneId);
    if (!ownership.valid) {
      return res.status(404).json({ error: ownership.error });
    }

    const assignments = await shotAssetAssignmentService.getAssignmentsForScene(sceneId);
    return res.json({ assignments });
  } catch (error: any) {
    console.error('Error listing shot assignments:', error);
    return res.status(500).json({ error: error.message || 'Failed to list assignments' });
  }
});

/**
 * GET /api/projects/:projectId/scenes/:sceneId/shot-assignments/shots/:shotId
 * List assignments for a specific shot
 */
router.get('/:projectId/scenes/:sceneId/shot-assignments/shots/:shotId', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { projectId, sceneId, shotId } = req.params;

    const ownership = await verifyProjectOwnership(userId, projectId, sceneId);
    if (!ownership.valid) {
      return res.status(404).json({ error: ownership.error });
    }

    const assignments = await shotAssetAssignmentService.getAssignmentsForShot(shotId);
    return res.json({ assignments });
  } catch (error: any) {
    console.error('Error listing shot assignments:', error);
    return res.status(500).json({ error: error.message || 'Failed to list assignments' });
  }
});

/**
 * POST /api/projects/:projectId/scenes/:sceneId/shot-assignments
 * Create one or more assignments
 */
router.post('/:projectId/scenes/:sceneId/shot-assignments', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { projectId, sceneId } = req.params;

    const ownership = await verifyProjectOwnership(userId, projectId, sceneId);
    if (!ownership.valid) {
      return res.status(404).json({ error: ownership.error });
    }

    const parsed = CreateAssignmentsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request body', details: parsed.error.issues });
    }

    const result = await shotAssetAssignmentService.bulkCreateAssignments(parsed.data.assignments);

    // Invalidate Stage 9+ when manually creating assignments (not from auto-populate)
    shotAssetAssignmentService.invalidateStage9AndDownstream(sceneId).catch(err => {
      console.warn('Failed to invalidate stages after assignment create:', err);
    });

    return res.status(201).json({ assignments: result });
  } catch (error: any) {
    console.error('Error creating shot assignments:', error);
    return res.status(500).json({ error: error.message || 'Failed to create assignments' });
  }
});

/**
 * PUT /api/projects/:projectId/scenes/:sceneId/shot-assignments/:assignmentId
 * Update presence_type
 */
router.put('/:projectId/scenes/:sceneId/shot-assignments/:assignmentId', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { projectId, sceneId, assignmentId } = req.params;

    const ownership = await verifyProjectOwnership(userId, projectId, sceneId);
    if (!ownership.valid) {
      return res.status(404).json({ error: ownership.error });
    }

    const parsed = UpdateAssignmentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request body', details: parsed.error.issues });
    }

    const result = await shotAssetAssignmentService.updateAssignment(assignmentId, parsed.data.presenceType);

    // Invalidate Stage 9+ when presence_type changes
    shotAssetAssignmentService.invalidateStage9AndDownstream(sceneId).catch(err => {
      console.warn('Failed to invalidate stages after assignment update:', err);
    });

    return res.json({ assignment: result });
  } catch (error: any) {
    console.error('Error updating shot assignment:', error);
    return res.status(500).json({ error: error.message || 'Failed to update assignment' });
  }
});

/**
 * DELETE /api/projects/:projectId/scenes/:sceneId/shot-assignments/:assignmentId
 * Remove assignment
 */
router.delete('/:projectId/scenes/:sceneId/shot-assignments/:assignmentId', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { projectId, sceneId, assignmentId } = req.params;

    const ownership = await verifyProjectOwnership(userId, projectId, sceneId);
    if (!ownership.valid) {
      return res.status(404).json({ error: ownership.error });
    }

    await shotAssetAssignmentService.deleteAssignment(assignmentId);

    // Invalidate Stage 9+ when assignment removed
    shotAssetAssignmentService.invalidateStage9AndDownstream(sceneId).catch(err => {
      console.warn('Failed to invalidate stages after assignment delete:', err);
    });

    return res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting shot assignment:', error);
    return res.status(500).json({ error: error.message || 'Failed to delete assignment' });
  }
});

/**
 * POST /api/projects/:projectId/scenes/:sceneId/shot-assignments/auto-populate
 * Trigger auto-population for the scene
 */
router.post('/:projectId/scenes/:sceneId/shot-assignments/auto-populate', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { projectId, sceneId } = req.params;

    const ownership = await verifyProjectOwnership(userId, projectId, sceneId);
    if (!ownership.valid) {
      return res.status(404).json({ error: ownership.error });
    }

    const result = await shotAssetAssignmentService.autoPopulate(sceneId);
    return res.json(result);
  } catch (error: any) {
    console.error('Error auto-populating shot assignments:', error);
    return res.status(500).json({ error: error.message || 'Failed to auto-populate' });
  }
});

/**
 * GET /api/projects/:projectId/scenes/:sceneId/shot-assignments/has-assignments
 * Check if a scene has any assignments
 */
router.get('/:projectId/scenes/:sceneId/shot-assignments/has-assignments', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { projectId, sceneId } = req.params;

    const ownership = await verifyProjectOwnership(userId, projectId, sceneId);
    if (!ownership.valid) {
      return res.status(404).json({ error: ownership.error });
    }

    const hasAssignments = await shotAssetAssignmentService.hasAssignments(sceneId);
    return res.json({ hasAssignments });
  } catch (error: any) {
    console.error('Error checking assignments:', error);
    return res.status(500).json({ error: error.message || 'Failed to check assignments' });
  }
});

export { router as shotAssignmentsRouter };
