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

        // First, get the job without joins to check if it's project-based or global asset
        const { data: job, error: jobError } = await supabase
            .from('image_generation_jobs')
            .select('id, project_id, asset_id, job_type, status, public_url, error_code, error_message, failure_stage, cost_credits, estimated_cost, created_at, completed_at')
            .eq('id', jobId)
            .single();

        if (jobError || !job) {
            return res.status(404).json({ error: 'Job not found' });
        }

        // Verify ownership based on job type
        if (job.project_id) {
            // Project-based job: verify through projects table
            const { data: project, error: projectError } = await supabase
                .from('projects')
                .select('user_id')
                .eq('id', job.project_id)
                .eq('user_id', userId)
                .single();

            if (projectError || !project) {
                return res.status(403).json({ error: 'Access denied' });
            }
        } else if (job.asset_id) {
            // Global asset job: verify through global_assets table
            const { data: asset, error: assetError } = await supabase
                .from('global_assets')
                .select('user_id')
                .eq('id', job.asset_id)
                .eq('user_id', userId)
                .single();

            if (assetError || !asset) {
                return res.status(403).json({ error: 'Access denied' });
            }
        } else {
            // Job has neither project_id nor asset_id - invalid state
            return res.status(400).json({ error: 'Invalid job: missing project_id or asset_id' });
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

// GET /api/images/debug-style-capsule/:capsuleId - Debug endpoint to inspect style capsule data
router.get('/debug-style-capsule/:capsuleId', async (req, res) => {
    try {
        const userId = req.user!.id;
        const { capsuleId } = req.params;

        // Fetch capsule with all relevant fields
        const { data: capsule, error } = await supabase
            .from('style_capsules')
            .select('id, name, type, design_pillars, descriptor_strings, reference_image_urls, user_id, is_preset')
            .eq('id', capsuleId)
            .single();

        if (error || !capsule) {
            return res.status(404).json({ error: 'Style capsule not found' });
        }

        // Verify access (user's own or preset)
        if (!capsule.is_preset && capsule.user_id !== userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Return diagnostic information
        res.json({
            capsuleId: capsule.id,
            name: capsule.name,
            type: capsule.type,
            hasDescriptorStrings: !!capsule.descriptor_strings && capsule.descriptor_strings.trim().length > 0,
            descriptorStringsLength: capsule.descriptor_strings?.length || 0,
            descriptorStrings: capsule.descriptor_strings || null,
            hasDesignPillars: !!capsule.design_pillars && Object.keys(capsule.design_pillars).length > 0,
            designPillars: capsule.design_pillars || {},
            hasReferenceImages: !!capsule.reference_image_urls && capsule.reference_image_urls.length > 0,
            referenceImageCount: capsule.reference_image_urls?.length || 0,
            referenceImageUrls: capsule.reference_image_urls || [],
            diagnostic: {
                textContextAvailable: !!(capsule.descriptor_strings?.trim() || capsule.design_pillars),
                imageContextAvailable: !!(capsule.reference_image_urls && capsule.reference_image_urls.length > 0),
                willUseImages: !!(capsule.reference_image_urls && capsule.reference_image_urls.length > 0)
            }
        });
    } catch (error) {
        console.error('[API] Debug style capsule error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export { router as imagesRouter };

