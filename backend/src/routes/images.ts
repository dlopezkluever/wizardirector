import { Router } from 'express';
import { ImageGenerationService } from '../services/image-generation/ImageGenerationService.js';
import { supabase } from '../config/supabase.js';

const router = Router();
const imageService = new ImageGenerationService();

// POST /api/images/generate - Create image generation job
router.post('/generate', async (req, res) => {
    try {
        const userId = req.user!.id;
        const {
            projectId,
            branchId,
            jobType,
            prompt,
            visualStyleCapsuleId,
            width,
            height,
            assetId,
            sceneId,
            shotId,
            idempotencyKey
        } = req.body;

        // Validate project ownership
        const { data: project, error: projectError } = await supabase
            .from('projects')
            .select('id')
            .eq('id', projectId)
            .eq('user_id', userId)
            .single();

        if (projectError || !project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Validate required fields
        if (!prompt || !jobType || !branchId) {
            return res.status(400).json({ 
                error: 'Missing required fields: prompt, jobType, branchId' 
            });
        }

        console.log(`[API] Image generation requested for project ${projectId}`);

        // Create job (returns immediately)
        const result = await imageService.createImageJob({
            projectId,
            branchId,
            jobType,
            prompt,
            visualStyleCapsuleId,
            width,
            height,
            assetId,
            sceneId,
            shotId,
            idempotencyKey
        });

        // Return job ID for polling
        res.json(result);
    } catch (error) {
        console.error('[API] Image generation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/images/jobs/:jobId - Get job status (for polling)
router.get('/jobs/:jobId', async (req, res) => {
    try {
        const userId = req.user!.id;
        const { jobId } = req.params;

        const { data: job, error } = await supabase
            .from('image_generation_jobs')
            .select(`
                id,
                project_id,
                job_type,
                status,
                public_url,
                error_code,
                error_message,
                failure_stage,
                cost_credits,
                estimated_cost,
                created_at,
                completed_at,
                projects!inner (
                    user_id
                )
            `)
            .eq('id', jobId)
            .single();

        if (error || !job) {
            return res.status(404).json({ error: 'Job not found' });
        }

        // Verify ownership
        if ((job as any).projects.user_id !== userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json({
            jobId: job.id,
            status: job.status,
            publicUrl: job.public_url,
            error: job.error_code ? {
                code: job.error_code,
                message: job.error_message,
                failureStage: job.failure_stage
            } : undefined,
            cost: {
                estimated: job.estimated_cost,
                actual: job.cost_credits
            },
            createdAt: job.created_at,
            completedAt: job.completed_at
        });
    } catch (error) {
        console.error('[API] Job status error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export { router as imagesRouter };

