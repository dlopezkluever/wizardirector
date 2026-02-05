import { Router } from 'express';
import { supabase } from '../config/supabase.js';
import { videoGenerationService } from '../services/videoGenerationService.js';
import { userCreditsService } from '../services/userCreditsService.js';

const router = Router();

/**
 * GET /api/projects/:projectId/scenes/:sceneId/cost-breakdown
 * Get full checkout data for Stage 11: shots, costs, credits, warnings
 */
router.get('/:projectId/scenes/:sceneId/cost-breakdown', async (req, res) => {
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
            .select('id')
            .eq('id', sceneId)
            .eq('branch_id', project.active_branch_id)
            .single();

        if (sceneError || !scene) {
            return res.status(404).json({ error: 'Scene not found' });
        }

        // Get checkout data
        const checkoutData = await videoGenerationService.getSceneCostBreakdown(
            projectId,
            sceneId,
            userId
        );

        res.json(checkoutData);
    } catch (error: any) {
        console.error('Error in GET /api/projects/:projectId/scenes/:sceneId/cost-breakdown:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

/**
 * GET /api/projects/:projectId/credit-balance
 * Get user's current credit balance
 */
router.get('/:projectId/credit-balance', async (req, res) => {
    try {
        const { projectId } = req.params;
        const userId = req.user!.id;

        // Verify project ownership (to ensure user has access)
        const { data: project, error: projectError } = await supabase
            .from('projects')
            .select('id')
            .eq('id', projectId)
            .eq('user_id', userId)
            .single();

        if (projectError || !project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Get credit balance
        const balance = await userCreditsService.getBalance(userId);

        res.json(balance);
    } catch (error: any) {
        console.error('Error in GET /api/projects/:projectId/credit-balance:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

/**
 * POST /api/projects/:projectId/scenes/:sceneId/confirm-render
 * Confirm and queue video generation jobs for a scene
 * Body: { modelVariant: 'veo_3_1_fast' | 'veo_3_1_standard' }
 */
router.post('/:projectId/scenes/:sceneId/confirm-render', async (req, res) => {
    try {
        const { projectId, sceneId } = req.params;
        const { modelVariant = 'veo_3_1_fast' } = req.body;
        const userId = req.user!.id;

        // Validate model variant
        if (!['veo_3_1_fast', 'veo_3_1_standard'].includes(modelVariant)) {
            return res.status(400).json({ error: 'Invalid model variant' });
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

        // Verify scene exists in project's active branch
        const { data: scene, error: sceneError } = await supabase
            .from('scenes')
            .select('id')
            .eq('id', sceneId)
            .eq('branch_id', project.active_branch_id)
            .single();

        if (sceneError || !scene) {
            return res.status(404).json({ error: 'Scene not found' });
        }

        // Confirm and queue render
        const result = await videoGenerationService.confirmAndQueueRender(
            projectId,
            project.active_branch_id,
            sceneId,
            modelVariant,
            userId
        );

        console.log(`[Checkout] User ${userId} queued ${result.jobsCreated} video jobs for scene ${sceneId}`);

        res.json(result);
    } catch (error: any) {
        console.error('Error in POST /api/projects/:projectId/scenes/:sceneId/confirm-render:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

/**
 * GET /api/projects/:projectId/scenes/:sceneId/video-jobs
 * Get all video generation jobs for a scene (for Stage 12 display)
 */
router.get('/:projectId/scenes/:sceneId/video-jobs', async (req, res) => {
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
            .select('id')
            .eq('id', sceneId)
            .eq('branch_id', project.active_branch_id)
            .single();

        if (sceneError || !scene) {
            return res.status(404).json({ error: 'Scene not found' });
        }

        // Get video jobs
        const jobs = await videoGenerationService.getVideoJobs(sceneId);

        // Calculate progress summary
        const totalJobs = jobs.length;
        const completedJobs = jobs.filter(j => j.status === 'completed').length;
        const failedJobs = jobs.filter(j => j.status === 'failed').length;
        const activeJobs = jobs.filter(j =>
            ['queued', 'processing', 'generating', 'uploading'].includes(j.status)
        ).length;

        res.json({
            jobs,
            summary: {
                total: totalJobs,
                completed: completedJobs,
                failed: failedJobs,
                active: activeJobs,
                progress: totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0,
            },
        });
    } catch (error: any) {
        console.error('Error in GET /api/projects/:projectId/scenes/:sceneId/video-jobs:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

/**
 * GET /api/projects/:projectId/scenes/:sceneId/video-jobs/:jobId
 * Get a single video job status (for polling)
 */
router.get('/:projectId/scenes/:sceneId/video-jobs/:jobId', async (req, res) => {
    try {
        const { projectId, jobId } = req.params;
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

        // Get job
        const job = await videoGenerationService.getVideoJob(jobId);

        if (!job) {
            return res.status(404).json({ error: 'Video job not found' });
        }

        res.json(job);
    } catch (error: any) {
        console.error('Error in GET /api/projects/:projectId/scenes/:sceneId/video-jobs/:jobId:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

export const checkoutRouter = router;
