import { Router } from 'express';
import { supabase } from '../config/supabase.js';
import { frameGenerationService } from '../services/frameGenerationService.js';

const router = Router();

/**
 * GET /api/projects/:projectId/scenes/:sceneId/frames
 * Fetch all frames for a scene with shot context
 */
router.get('/:projectId/scenes/:sceneId/frames', async (req, res) => {
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

        // Verify scene exists in project's active branch
        const { data: scene, error: sceneError } = await supabase
            .from('scenes')
            .select('id, scene_number')
            .eq('id', sceneId)
            .eq('branch_id', project.active_branch_id)
            .single();

        if (sceneError || !scene) {
            return res.status(404).json({ error: 'Scene not found' });
        }

        // Fetch frames with shot context
        const shotsWithFrames = await frameGenerationService.fetchFramesForScene(sceneId);

        // Get cost summary
        const costSummary = await frameGenerationService.getSceneFrameCosts(sceneId);

        // Check completion status
        const allApproved = await frameGenerationService.areAllFramesApproved(sceneId);

        res.json({
            shots: shotsWithFrames,
            sceneNumber: scene.scene_number,
            costSummary,
            allFramesApproved: allApproved,
        });
    } catch (error) {
        console.error('Error in GET /api/projects/:projectId/scenes/:sceneId/frames:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/projects/:projectId/scenes/:sceneId/generate-frames
 * Start frame generation for a scene
 */
router.post('/:projectId/scenes/:sceneId/generate-frames', async (req, res) => {
    try {
        const { projectId, sceneId } = req.params;
        const { mode = 'control', shotIds, startOnly = true } = req.body;
        const userId = req.user!.id;

        console.log(`[Stage10] Generating frames for scene ${sceneId}, mode: ${mode}`);

        // Verify project ownership and get aspect_ratio
        const { data: project, error: projectError } = await supabase
            .from('projects')
            .select('id, active_branch_id, aspect_ratio')
            .eq('id', projectId)
            .eq('user_id', userId)
            .single();

        if (projectError || !project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Verify scene exists
        const { data: scene, error: sceneError } = await supabase
            .from('scenes')
            .select('id')
            .eq('id', sceneId)
            .eq('branch_id', project.active_branch_id)
            .single();

        if (sceneError || !scene) {
            return res.status(404).json({ error: 'Scene not found' });
        }

        // Get visual style capsule from stage state (if available)
        const { data: stageState } = await supabase
            .from('stage_states')
            .select('state_data')
            .eq('project_id', projectId)
            .eq('stage_number', 3)
            .single();

        const visualStyleCapsuleId = stageState?.state_data?.visualStyleCapsuleId;

        // Generate frames with project aspect ratio
        const result = await frameGenerationService.generateFrames(
            projectId,
            project.active_branch_id,
            sceneId,
            { mode, shotIds, startOnly },
            visualStyleCapsuleId,
            project.aspect_ratio || '16:9'
        );

        // Fetch updated frames
        const shotsWithFrames = await frameGenerationService.fetchFramesForScene(sceneId);

        res.json({
            success: true,
            jobsCreated: result.jobsCreated,
            shots: shotsWithFrames,
        });
    } catch (error: any) {
        console.error('Error in POST /api/projects/:projectId/scenes/:sceneId/generate-frames:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

/**
 * PUT /api/projects/:projectId/scenes/:sceneId/frames/:frameId/approve
 * Approve a frame
 */
router.put('/:projectId/scenes/:sceneId/frames/:frameId/approve', async (req, res) => {
    try {
        const { projectId, sceneId, frameId } = req.params;
        const userId = req.user!.id;

        // Verify project ownership
        const { data: project, error: projectError } = await supabase
            .from('projects')
            .select('id')
            .eq('id', projectId)
            .eq('user_id', userId)
            .single();

        if (projectError || !project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Approve frame
        const frame = await frameGenerationService.approveFrame(frameId);

        res.json({
            success: true,
            frame,
        });
    } catch (error: any) {
        console.error('Error in PUT /api/projects/:projectId/scenes/:sceneId/frames/:frameId/approve:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

/**
 * PUT /api/projects/:projectId/scenes/:sceneId/frames/:frameId/reject
 * Reject a frame
 */
router.put('/:projectId/scenes/:sceneId/frames/:frameId/reject', async (req, res) => {
    try {
        const { projectId, sceneId, frameId } = req.params;
        const userId = req.user!.id;

        // Verify project ownership
        const { data: project, error: projectError } = await supabase
            .from('projects')
            .select('id')
            .eq('id', projectId)
            .eq('user_id', userId)
            .single();

        if (projectError || !project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Reject frame
        const frame = await frameGenerationService.rejectFrame(frameId);

        res.json({
            success: true,
            frame,
        });
    } catch (error: any) {
        console.error('Error in PUT /api/projects/:projectId/scenes/:sceneId/frames/:frameId/reject:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

/**
 * POST /api/projects/:projectId/scenes/:sceneId/frames/:frameId/regenerate
 * Regenerate a frame
 */
router.post('/:projectId/scenes/:sceneId/frames/:frameId/regenerate', async (req, res) => {
    try {
        const { projectId, sceneId, frameId } = req.params;
        const userId = req.user!.id;

        // Verify project ownership and get aspect_ratio
        const { data: project, error: projectError } = await supabase
            .from('projects')
            .select('id, active_branch_id, aspect_ratio')
            .eq('id', projectId)
            .eq('user_id', userId)
            .single();

        if (projectError || !project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Get visual style capsule
        const { data: stageState } = await supabase
            .from('stage_states')
            .select('state_data')
            .eq('project_id', projectId)
            .eq('stage_number', 3)
            .single();

        const visualStyleCapsuleId = stageState?.state_data?.visualStyleCapsuleId;

        // Regenerate frame
        const frame = await frameGenerationService.regenerateFrame(
            frameId,
            projectId,
            project.active_branch_id,
            sceneId,
            visualStyleCapsuleId,
            project.aspect_ratio || '16:9'
        );

        res.json({
            success: true,
            frame,
        });
    } catch (error: any) {
        console.error('Error in POST /api/projects/:projectId/scenes/:sceneId/frames/:frameId/regenerate:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

/**
 * POST /api/projects/:projectId/scenes/:sceneId/frames/:frameId/inpaint
 * Inpaint a frame with mask
 */
router.post('/:projectId/scenes/:sceneId/frames/:frameId/inpaint', async (req, res) => {
    try {
        const { projectId, sceneId, frameId } = req.params;
        const { maskDataUrl, prompt } = req.body;
        const userId = req.user!.id;

        if (!maskDataUrl || !prompt) {
            return res.status(400).json({ error: 'maskDataUrl and prompt are required' });
        }

        // Verify project ownership and get aspect_ratio
        const { data: project, error: projectError } = await supabase
            .from('projects')
            .select('id, active_branch_id, aspect_ratio')
            .eq('id', projectId)
            .eq('user_id', userId)
            .single();

        if (projectError || !project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Get visual style capsule
        const { data: stageState } = await supabase
            .from('stage_states')
            .select('state_data')
            .eq('project_id', projectId)
            .eq('stage_number', 3)
            .single();

        const visualStyleCapsuleId = stageState?.state_data?.visualStyleCapsuleId;

        // Inpaint frame
        const frame = await frameGenerationService.inpaintFrame(
            frameId,
            projectId,
            project.active_branch_id,
            sceneId,
            { maskDataUrl, prompt },
            visualStyleCapsuleId,
            project.aspect_ratio || '16:9'
        );

        res.json({
            success: true,
            frame,
        });
    } catch (error: any) {
        console.error('Error in POST /api/projects/:projectId/scenes/:sceneId/frames/:frameId/inpaint:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

/**
 * GET /api/projects/:projectId/scenes/:sceneId/frames/:frameId/status
 * Poll for frame job status
 */
router.get('/:projectId/scenes/:sceneId/frames/:frameId/status', async (req, res) => {
    try {
        const { projectId, frameId } = req.params;
        const userId = req.user!.id;

        // Verify project ownership
        const { data: project, error: projectError } = await supabase
            .from('projects')
            .select('id')
            .eq('id', projectId)
            .eq('user_id', userId)
            .single();

        if (projectError || !project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Get job status
        const status = await frameGenerationService.getFrameJobStatus(frameId);

        if (!status) {
            return res.status(404).json({ error: 'No active job for this frame' });
        }

        res.json(status);
    } catch (error: any) {
        console.error('Error in GET /api/projects/:projectId/scenes/:sceneId/frames/:frameId/status:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

export const framesRouter = router;
