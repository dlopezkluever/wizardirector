import { Router } from 'express';
import { supabase } from '../config/supabase.js';
import { frameGenerationService } from '../services/frameGenerationService.js';
import { promptGenerationService, enrichAssetsWithAngleMatch } from '../services/promptGenerationService.js';
import type { ShotData, SceneAssetInstanceData } from '../services/promptGenerationService.js';
import { StyleCapsuleService } from '../services/styleCapsuleService.js';
import { transformationEventService } from '../services/transformationEventService.js';

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

/**
 * POST /api/projects/:projectId/scenes/:sceneId/shots/:shotId/generate-end-frame-prompt
 * Generate an end frame prompt using LLM
 */
router.post('/:projectId/scenes/:sceneId/shots/:shotId/generate-end-frame-prompt', async (req, res) => {
    try {
        const { projectId, sceneId, shotId } = req.params;
        const userId = req.user!.id;

        // Verify project ownership
        const { data: project, error: projectError } = await supabase
            .from('projects')
            .select('id, active_branch_id, visual_style_capsule_id')
            .eq('id', projectId)
            .eq('user_id', userId)
            .single();

        if (projectError || !project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Fetch shot data
        const { data: shot, error: shotError } = await supabase
            .from('shots')
            .select('*')
            .eq('id', shotId)
            .eq('scene_id', sceneId)
            .single();

        if (shotError || !shot) {
            return res.status(404).json({ error: 'Shot not found' });
        }

        if (!shot.frame_prompt) {
            return res.status(400).json({ error: 'Shot has no frame prompt — generate frame prompts first' });
        }

        // Fetch scene assets
        const { data: sceneAssets } = await supabase
            .from('scene_asset_instances')
            .select(`
                id,
                description_override,
                effective_description,
                status_tags,
                image_key_url,
                carry_forward,
                inherited_from_instance_id,
                project_asset:project_assets(id, name, asset_type, description, image_key_url)
            `)
            .eq('scene_id', sceneId);

        // Fetch style capsule
        let styleCapsule = null;
        if (project.visual_style_capsule_id) {
            try {
                const styleCapsuleService = new StyleCapsuleService();
                styleCapsule = await styleCapsuleService.getCapsuleById(project.visual_style_capsule_id, userId);
            } catch {
                // Continue without style capsule
            }
        }

        // Build shot data for the service
        const shotData: ShotData = {
            id: shot.id,
            shot_id: shot.shot_id,
            duration: shot.duration,
            dialogue: shot.dialogue || '',
            action: shot.action,
            characters_foreground: shot.characters_foreground || [],
            characters_background: shot.characters_background || [],
            setting: shot.setting,
            camera: shot.camera,
            continuity_flags: shot.continuity_flags,
            beat_reference: shot.beat_reference,
        };

        // Fetch all shots in scene (needed for transformation overrides + next shot continuity)
        const allShotsResult = await supabase
            .from('shots')
            .select('id, shot_id, shot_order, start_continuity, camera')
            .eq('scene_id', sceneId)
            .order('shot_order');
        const allShotRows = allShotsResult.data ?? [];

        // Fetch confirmed transformation events and resolve overrides for this shot
        const events = await transformationEventService.getTransformationEventsForScene(sceneId);
        const confirmedEvents = events.filter(e => e.confirmed);
        let shotOverrides;
        if (confirmedEvents.length > 0) {
            const shotRefs = allShotRows.map((s: any) => ({ id: s.id, shot_id: s.shot_id, shot_order: s.shot_order }));
            const assetRefs = (sceneAssets ?? []).map((a: any) => ({
                id: a.id,
                effective_description: a.effective_description ?? '',
                image_key_url: a.image_key_url,
            }));
            const shotRef = shotRefs.find(s => s.id === shotId);
            if (shotRef) {
                shotOverrides = transformationEventService.resolveOverridesForShot(
                    shotRef, assetRefs, confirmedEvents, shotRefs
                );
            }
        }

        // Find next shot's continuity info for end frame prompt awareness
        const currentIdx = allShotRows.findIndex((s: any) => s.id === shotId);
        const nextShotRow = currentIdx >= 0 && currentIdx < allShotRows.length - 1
            ? allShotRows[currentIdx + 1]
            : null;
        const nextShotContinuity = nextShotRow
            ? { startContinuity: nextShotRow.start_continuity || 'none', camera: nextShotRow.camera }
            : undefined;

        // Generate end frame prompt (with transformation context if applicable)
        const endFramePrompt = await promptGenerationService.generateEndFramePrompt(
            shotData,
            shot.frame_prompt,
            (sceneAssets || []) as unknown as SceneAssetInstanceData[],
            styleCapsule,
            shotOverrides,
            nextShotContinuity
        );

        // Save to database
        await supabase
            .from('shots')
            .update({ end_frame_prompt: endFramePrompt, updated_at: new Date().toISOString() })
            .eq('id', shotId);

        res.json({ endFramePrompt });
    } catch (error: any) {
        console.error('Error in POST generate-end-frame-prompt:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

/**
 * PUT /api/projects/:projectId/scenes/:sceneId/shots/:shotId/end-frame-prompt
 * Save/update an end frame prompt
 */
router.put('/:projectId/scenes/:sceneId/shots/:shotId/end-frame-prompt', async (req, res) => {
    try {
        const { projectId, sceneId, shotId } = req.params;
        const { endFramePrompt } = req.body;
        const userId = req.user!.id;

        if (typeof endFramePrompt !== 'string') {
            return res.status(400).json({ error: 'endFramePrompt is required and must be a string' });
        }

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

        // Update shot
        const { error: updateError } = await supabase
            .from('shots')
            .update({ end_frame_prompt: endFramePrompt, updated_at: new Date().toISOString() })
            .eq('id', shotId)
            .eq('scene_id', sceneId);

        if (updateError) {
            throw new Error(`Failed to update end frame prompt: ${updateError.message}`);
        }

        res.json({ success: true });
    } catch (error: any) {
        console.error('Error in PUT end-frame-prompt:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

/**
 * POST /api/projects/:projectId/scenes/:sceneId/frames/:frameId/regenerate-with-correction
 * Apply an LLM correction to the frame prompt, then regenerate
 */
router.post('/:projectId/scenes/:sceneId/frames/:frameId/regenerate-with-correction', async (req, res) => {
    try {
        const { projectId, sceneId, frameId } = req.params;
        const { correction } = req.body;
        const userId = req.user!.id;

        if (!correction || typeof correction !== 'string') {
            return res.status(400).json({ error: 'correction is required and must be a string' });
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

        // Get frame and its shot
        const { data: frame, error: frameError } = await supabase
            .from('frames')
            .select('*, shots!inner(id, frame_prompt, end_frame_prompt)')
            .eq('id', frameId)
            .single();

        if (frameError || !frame) {
            return res.status(404).json({ error: 'Frame not found' });
        }

        const shot = (frame as any).shots;
        const currentPrompt = frame.frame_type === 'end'
            ? (shot.end_frame_prompt || shot.frame_prompt)
            : shot.frame_prompt;

        if (!currentPrompt) {
            return res.status(400).json({ error: 'Frame has no prompt to correct' });
        }

        // Apply LLM correction
        const correctedPrompt = await promptGenerationService.applyFramePromptCorrection(
            currentPrompt,
            correction,
            frame.frame_type as 'start' | 'end'
        );

        // Update the shot's prompt in DB
        const promptField = frame.frame_type === 'end' ? 'end_frame_prompt' : 'frame_prompt';
        await supabase
            .from('shots')
            .update({ [promptField]: correctedPrompt, updated_at: new Date().toISOString() })
            .eq('id', shot.id);

        // Get visual style capsule
        const { data: stageState } = await supabase
            .from('stage_states')
            .select('state_data')
            .eq('project_id', projectId)
            .eq('stage_number', 3)
            .single();

        const visualStyleCapsuleId = stageState?.state_data?.visualStyleCapsuleId;

        // Regenerate the frame with corrected prompt
        const updatedFrame = await frameGenerationService.regenerateFrame(
            frameId,
            projectId,
            project.active_branch_id,
            sceneId,
            visualStyleCapsuleId,
            project.aspect_ratio || '16:9'
        );

        res.json({
            success: true,
            frame: updatedFrame,
            updatedPrompt: correctedPrompt,
        });
    } catch (error: any) {
        console.error('Error in POST regenerate-with-correction:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

/**
 * POST /api/projects/:projectId/scenes/:sceneId/frames/:frameId/regenerate-with-prompt
 * Update the frame prompt and regenerate
 */
router.post('/:projectId/scenes/:sceneId/frames/:frameId/regenerate-with-prompt', async (req, res) => {
    try {
        const { projectId, sceneId, frameId } = req.params;
        const { prompt } = req.body;
        const userId = req.user!.id;

        if (!prompt || typeof prompt !== 'string') {
            return res.status(400).json({ error: 'prompt is required and must be a string' });
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

        // Get frame and its shot
        const { data: frame, error: frameError } = await supabase
            .from('frames')
            .select('*, shots!inner(id)')
            .eq('id', frameId)
            .single();

        if (frameError || !frame) {
            return res.status(404).json({ error: 'Frame not found' });
        }

        const shot = (frame as any).shots;

        // Update the shot's prompt in DB
        const promptField = frame.frame_type === 'end' ? 'end_frame_prompt' : 'frame_prompt';
        await supabase
            .from('shots')
            .update({ [promptField]: prompt, updated_at: new Date().toISOString() })
            .eq('id', shot.id);

        // Get visual style capsule
        const { data: stageState } = await supabase
            .from('stage_states')
            .select('state_data')
            .eq('project_id', projectId)
            .eq('stage_number', 3)
            .single();

        const visualStyleCapsuleId = stageState?.state_data?.visualStyleCapsuleId;

        // Regenerate the frame with new prompt
        const updatedFrame = await frameGenerationService.regenerateFrame(
            frameId,
            projectId,
            project.active_branch_id,
            sceneId,
            visualStyleCapsuleId,
            project.aspect_ratio || '16:9'
        );

        res.json({
            success: true,
            frame: updatedFrame,
        });
    } catch (error: any) {
        console.error('Error in POST regenerate-with-prompt:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

/**
 * POST /api/projects/:projectId/scenes/:sceneId/shots/:shotId/chain-from-end-frame
 * Chain an approved end frame as the next shot's start frame reference
 */
router.post('/:projectId/scenes/:sceneId/shots/:shotId/chain-from-end-frame', async (req, res) => {
    try {
        const { projectId, sceneId, shotId } = req.params;
        const { endFrameUrl, fromShotId } = req.body;
        const userId = req.user!.id;

        if (!endFrameUrl || typeof endFrameUrl !== 'string') {
            return res.status(400).json({ error: 'endFrameUrl is required' });
        }

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

        // Get current reference_image_order for the target shot
        const { data: shot, error: shotError } = await supabase
            .from('shots')
            .select('reference_image_order')
            .eq('id', shotId)
            .eq('scene_id', sceneId)
            .single();

        if (shotError || !shot) {
            return res.status(404).json({ error: 'Shot not found' });
        }

        const existingOrder = Array.isArray(shot.reference_image_order) ? shot.reference_image_order : [];

        // Remove any existing continuity reference, then prepend the new one
        const filtered = existingOrder.filter((entry: any) => entry.type !== 'continuity');
        const newOrder = [
            { label: 'Continuity', assetName: 'Previous End Frame', url: endFrameUrl, type: 'continuity' },
            ...filtered,
        ];

        await supabase
            .from('shots')
            .update({ reference_image_order: newOrder, updated_at: new Date().toISOString() })
            .eq('id', shotId);

        res.json({ success: true });
    } catch (error: any) {
        console.error('Error in POST chain-from-end-frame:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

/**
 * GET /api/projects/:projectId/scenes/:sceneId/frames/:frameId/generations
 * Fetch all completed generation attempts for a frame
 */
router.get('/:projectId/scenes/:sceneId/frames/:frameId/generations', async (req, res) => {
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

        // Get the frame to find shot_id, frame_type, current_job_id
        const { data: frame, error: frameError } = await supabase
            .from('frames')
            .select('id, shot_id, frame_type, current_job_id')
            .eq('id', frameId)
            .single();

        if (frameError || !frame) {
            return res.status(404).json({ error: 'Frame not found' });
        }

        // Map frame_type to job_type
        const jobType = frame.frame_type === 'start' ? 'start_frame' : 'end_frame';

        // Fetch all completed image generation jobs for this shot + frame type
        const { data: jobs, error: jobsError } = await supabase
            .from('image_generation_jobs')
            .select('id, public_url, prompt, cost_credits, created_at')
            .eq('shot_id', frame.shot_id)
            .eq('job_type', jobType)
            .eq('status', 'completed')
            .order('created_at', { ascending: false });

        if (jobsError) {
            console.error('Error fetching generation jobs:', jobsError);
            return res.status(500).json({ error: 'Failed to fetch generations' });
        }

        const generations = (jobs || []).map((job: any) => ({
            jobId: job.id,
            imageUrl: job.public_url,
            prompt: job.prompt,
            costCredits: parseFloat(job.cost_credits) || 0,
            createdAt: job.created_at,
            isCurrent: job.id === frame.current_job_id,
        }));

        res.json({ generations });
    } catch (error: any) {
        console.error('Error in GET frame generations:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

/**
 * PUT /api/projects/:projectId/scenes/:sceneId/frames/:frameId/select-generation
 * Select a previous generation as the current frame image
 */
router.put('/:projectId/scenes/:sceneId/frames/:frameId/select-generation', async (req, res) => {
    try {
        const { projectId, frameId } = req.params;
        const { jobId } = req.body;
        const userId = req.user!.id;

        if (!jobId || typeof jobId !== 'string') {
            return res.status(400).json({ error: 'jobId is required' });
        }

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

        // Fetch the job to get its image URL and prompt
        const { data: job, error: jobError } = await supabase
            .from('image_generation_jobs')
            .select('id, public_url, prompt')
            .eq('id', jobId)
            .eq('status', 'completed')
            .single();

        if (jobError || !job) {
            return res.status(404).json({ error: 'Generation job not found' });
        }

        // Update the frame to point to this job
        const { data: frame, error: updateError } = await supabase
            .from('frames')
            .update({
                current_job_id: jobId,
                image_url: job.public_url,
                prompt_snapshot: job.prompt,
                status: 'generated',
                approved_at: null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', frameId)
            .select('*')
            .single();

        if (updateError || !frame) {
            throw new Error(`Failed to update frame: ${updateError?.message}`);
        }

        res.json({
            success: true,
            frame: {
                id: frame.id,
                shotId: frame.shot_id,
                frameType: frame.frame_type,
                status: frame.status,
                imageUrl: frame.image_url,
                storagePath: frame.storage_path,
                currentJobId: frame.current_job_id,
                generationCount: frame.generation_count,
                totalCostCredits: parseFloat(frame.total_cost_credits) || 0,
                previousFrameId: frame.previous_frame_id,
                promptSnapshot: frame.prompt_snapshot,
                inpaintCount: frame.inpaint_count,
                lastInpaintMaskPath: frame.last_inpaint_mask_path,
                createdAt: frame.created_at,
                updatedAt: frame.updated_at,
                generatedAt: frame.generated_at,
                approvedAt: frame.approved_at,
            },
        });
    } catch (error: any) {
        console.error('Error in PUT select-generation:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

/**
 * DELETE /api/projects/:projectId/scenes/:sceneId/frames/:frameId/generations/:jobId
 * Delete a non-current generation from a frame
 */
router.delete('/:projectId/scenes/:sceneId/frames/:frameId/generations/:jobId', async (req, res) => {
    try {
        const { projectId, frameId, jobId } = req.params;
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

        // Get the frame to check current_job_id and generation_count
        const { data: frame, error: frameError } = await supabase
            .from('frames')
            .select('id, shot_id, frame_type, current_job_id, generation_count')
            .eq('id', frameId)
            .single();

        if (frameError || !frame) {
            return res.status(404).json({ error: 'Frame not found' });
        }

        // Guard: cannot delete the currently selected generation
        if (jobId === frame.current_job_id) {
            return res.status(400).json({ error: 'Cannot delete the currently selected generation' });
        }

        // Guard: must have at least 2 completed generations to delete one
        const jobType = frame.frame_type === 'start' ? 'start_frame' : 'end_frame';
        const { count } = await supabase
            .from('image_generation_jobs')
            .select('id', { count: 'exact', head: true })
            .eq('shot_id', frame.shot_id)
            .eq('job_type', jobType)
            .eq('status', 'completed');

        if ((count || 0) < 2) {
            return res.status(400).json({ error: 'Must have at least 2 generations to delete one' });
        }

        // Fetch the job to get storage_path
        const { data: job, error: jobError } = await supabase
            .from('image_generation_jobs')
            .select('id, storage_path')
            .eq('id', jobId)
            .single();

        if (jobError || !job) {
            return res.status(404).json({ error: 'Generation job not found' });
        }

        // Delete from storage if path exists
        if (job.storage_path) {
            await supabase.storage.from('frames').remove([job.storage_path]);
        }

        // Delete the job record
        const { error: deleteError } = await supabase
            .from('image_generation_jobs')
            .delete()
            .eq('id', jobId);

        if (deleteError) {
            throw new Error(`Failed to delete job: ${deleteError.message}`);
        }

        // Decrement generation_count
        await supabase
            .from('frames')
            .update({
                generation_count: Math.max(0, (frame.generation_count || 1) - 1),
                updated_at: new Date().toISOString(),
            })
            .eq('id', frameId);

        res.json({ success: true });
    } catch (error: any) {
        console.error('Error in DELETE generation:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

/**
 * PUT /api/projects/:projectId/scenes/:sceneId/shots/:shotId/reference-images
 * Update reference images for a shot (start or end frame)
 */
router.put('/:projectId/scenes/:sceneId/shots/:shotId/reference-images', async (req, res) => {
    try {
        const { projectId, sceneId, shotId } = req.params;
        const { frameType, referenceImages } = req.body;
        const userId = req.user!.id;

        if (!frameType || !['start', 'end'].includes(frameType)) {
            return res.status(400).json({ error: 'frameType must be "start" or "end"' });
        }
        if (!Array.isArray(referenceImages)) {
            return res.status(400).json({ error: 'referenceImages must be an array' });
        }

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

        // Update the appropriate column
        const column = frameType === 'start' ? 'reference_image_order' : 'end_frame_reference_image_order';
        const { error: updateError } = await supabase
            .from('shots')
            .update({ [column]: referenceImages, updated_at: new Date().toISOString() })
            .eq('id', shotId)
            .eq('scene_id', sceneId);

        if (updateError) {
            throw new Error(`Failed to update reference images: ${updateError.message}`);
        }

        res.json({ success: true });
    } catch (error: any) {
        console.error('Error in PUT reference-images:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

/**
 * GET /api/projects/:projectId/scenes/:sceneId/shots/:shotId/available-references
 * Fetch all available reference images for a shot, grouped by asset
 */
router.get('/:projectId/scenes/:sceneId/shots/:shotId/available-references', async (req, res) => {
    try {
        const { projectId, sceneId, shotId } = req.params;
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

        // Fetch scene asset instances with project_asset data
        const { data: instances } = await supabase
            .from('scene_asset_instances')
            .select(`
                id,
                image_key_url,
                project_asset:project_assets(id, name, asset_type, image_key_url)
            `)
            .eq('scene_id', sceneId);

        if (!instances) {
            return res.json({ assets: [] });
        }

        // Fetch transformation events for this scene
        const { data: transformEvents } = await supabase
            .from('transformation_events')
            .select(`
                id, post_image_key_url, scene_asset_instance_id, trigger_shot_id,
                transformation_type, pre_description, post_description
            `)
            .eq('scene_id', sceneId)
            .eq('confirmed', true);

        // Fetch angle variants for all project assets in this scene
        const projectAssetIds = instances
            .map((i: any) => i.project_asset?.id)
            .filter(Boolean);

        let angleVariants: any[] = [];
        if (projectAssetIds.length > 0) {
            const { data: variants } = await supabase
                .from('asset_angle_variants')
                .select('id, project_asset_id, angle_type, image_url')
                .in('project_asset_id', projectAssetIds);
            angleVariants = variants || [];
        }

        // Build grouped result
        const assets = instances.map((inst: any) => {
            const pa = inst.project_asset;
            if (!pa) return null;

            const options: any[] = [];

            // Scene instance image
            if (inst.image_key_url) {
                options.push({
                    url: inst.image_key_url,
                    source: 'scene_instance',
                    label: 'Scene Asset',
                });
            }

            // Master asset image
            if (pa.image_key_url && pa.image_key_url !== inst.image_key_url) {
                options.push({
                    url: pa.image_key_url,
                    source: 'master',
                    label: 'Master Asset',
                });
            }

            // Transformation post images
            if (transformEvents) {
                for (const event of transformEvents) {
                    if (event.scene_asset_instance_id === inst.id && event.post_image_key_url) {
                        options.push({
                            url: event.post_image_key_url,
                            source: 'transformation_post',
                            label: `Post: ${event.post_description?.substring(0, 40) || 'Transformation'}`,
                            eventId: event.id,
                        });
                    }
                }
            }

            // Angle variants
            for (const variant of angleVariants) {
                if (variant.project_asset_id === pa.id && variant.image_url) {
                    options.push({
                        url: variant.image_url,
                        source: 'angle_variant',
                        label: `${variant.angle_type} Angle`,
                        angleType: variant.angle_type,
                    });
                }
            }

            if (options.length === 0) return null;

            return {
                assetName: pa.name,
                assetType: pa.asset_type,
                options,
            };
        }).filter(Boolean);

        res.json({ assets });
    } catch (error: any) {
        console.error('Error in GET available-references:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

/**
 * POST /api/projects/:projectId/scenes/:sceneId/shots/:shotId/copy-frame
 * Copy a frame from one shot to another (zero cost, pixel-identical)
 */
router.post('/:projectId/scenes/:sceneId/shots/:shotId/copy-frame', async (req, res) => {
    try {
        const { projectId, sceneId, shotId } = req.params;
        const { sourceFrameId, targetFrameType } = req.body;
        const userId = req.user!.id;

        if (!sourceFrameId || typeof sourceFrameId !== 'string') {
            return res.status(400).json({ error: 'sourceFrameId is required' });
        }
        if (!targetFrameType || !['start', 'end'].includes(targetFrameType)) {
            return res.status(400).json({ error: 'targetFrameType must be "start" or "end"' });
        }

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

        // Fetch source frame
        const { data: sourceFrame, error: sourceError } = await supabase
            .from('frames')
            .select('*')
            .eq('id', sourceFrameId)
            .single();

        if (sourceError || !sourceFrame) {
            return res.status(404).json({ error: 'Source frame not found' });
        }

        if (!sourceFrame.image_url) {
            return res.status(400).json({ error: 'Source frame has no image to copy' });
        }

        if (!['generated', 'approved'].includes(sourceFrame.status)) {
            return res.status(400).json({ error: 'Source frame must be generated or approved' });
        }

        // Get source shot info for prompt snapshot
        const { data: sourceShot } = await supabase
            .from('shots')
            .select('shot_id')
            .eq('id', sourceFrame.shot_id)
            .single();

        // Check if target frame already exists
        const { data: existingFrame } = await supabase
            .from('frames')
            .select('id')
            .eq('shot_id', shotId)
            .eq('frame_type', targetFrameType)
            .single();

        const now = new Date().toISOString();
        const frameData = {
            image_url: sourceFrame.image_url,
            storage_path: sourceFrame.storage_path,
            status: 'generated',
            prompt_snapshot: `[Copied from Shot ${sourceShot?.shot_id || 'unknown'} ${sourceFrame.frame_type} frame]`,
            generated_at: now,
            previous_frame_id: sourceFrameId,
            updated_at: now,
        };

        let targetFrame;
        if (existingFrame) {
            // Update existing frame
            const { data, error } = await supabase
                .from('frames')
                .update(frameData)
                .eq('id', existingFrame.id)
                .select()
                .single();
            if (error) throw new Error(`Failed to update frame: ${error.message}`);
            targetFrame = data;
        } else {
            // Create new frame
            const { data, error } = await supabase
                .from('frames')
                .insert({
                    shot_id: shotId,
                    frame_type: targetFrameType,
                    ...frameData,
                })
                .select()
                .single();
            if (error) throw new Error(`Failed to create frame: ${error.message}`);
            targetFrame = data;
        }

        // Create a zero-cost job record for audit trail
        const { data: job } = await supabase
            .from('image_generation_jobs')
            .insert({
                project_id: projectId,
                branch_id: (await supabase.from('projects').select('active_branch_id').eq('id', projectId).single()).data?.active_branch_id,
                scene_id: sceneId,
                shot_id: shotId,
                job_type: targetFrameType === 'start' ? 'start_frame' : 'end_frame',
                status: 'completed',
                cost_credits: 0,
                prompt: '[Frame copy — zero cost]',
                public_url: sourceFrame.image_url,
                completed_at: now,
            })
            .select('id')
            .single();

        // Update frame with job ID
        if (job) {
            await supabase
                .from('frames')
                .update({ current_job_id: job.id })
                .eq('id', targetFrame.id);
        }

        res.json({
            success: true,
            frame: {
                id: targetFrame.id,
                shotId: targetFrame.shot_id,
                frameType: targetFrame.frame_type,
                status: targetFrame.status,
                imageUrl: targetFrame.image_url,
                storagePath: targetFrame.storage_path,
                currentJobId: job?.id || targetFrame.current_job_id,
                generationCount: targetFrame.generation_count || 0,
                totalCostCredits: parseFloat(targetFrame.total_cost_credits) || 0,
                previousFrameId: targetFrame.previous_frame_id,
                promptSnapshot: targetFrame.prompt_snapshot,
                inpaintCount: targetFrame.inpaint_count || 0,
                lastInpaintMaskPath: targetFrame.last_inpaint_mask_path,
                createdAt: targetFrame.created_at,
                updatedAt: targetFrame.updated_at,
                generatedAt: targetFrame.generated_at,
                approvedAt: targetFrame.approved_at,
            },
        });
    } catch (error: any) {
        console.error('Error in POST copy-frame:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

/**
 * POST /api/projects/:projectId/scenes/:sceneId/shots/:shotId/generate-continuity-prompt
 * Generate or regenerate the continuity frame prompt for a shot
 */
router.post('/:projectId/scenes/:sceneId/shots/:shotId/generate-continuity-prompt', async (req, res) => {
    try {
        const { projectId, sceneId, shotId } = req.params;
        const userId = req.user!.id;

        // Verify project ownership
        const { data: project, error: projectError } = await supabase
            .from('projects')
            .select('id, active_branch_id, visual_style_capsule_id')
            .eq('id', projectId)
            .eq('user_id', userId)
            .single();

        if (projectError || !project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Fetch all shots in scene to find previous shot
        const { data: allShots, error: shotsError } = await supabase
            .from('shots')
            .select('*')
            .eq('scene_id', sceneId)
            .order('shot_order', { ascending: true });

        if (shotsError || !allShots) {
            return res.status(500).json({ error: 'Failed to fetch shots' });
        }

        const shotIndex = allShots.findIndex((s: any) => s.id === shotId);
        if (shotIndex === -1) {
            return res.status(404).json({ error: 'Shot not found' });
        }
        if (shotIndex === 0) {
            return res.status(400).json({ error: 'First shot cannot have continuity prompt' });
        }

        const currentShot = allShots[shotIndex];
        const previousShot = allShots[shotIndex - 1];

        // Build ShotData for current and previous
        const buildShotData = (shot: any) => ({
            id: shot.id,
            shot_id: shot.shot_id,
            duration: shot.duration,
            dialogue: shot.dialogue || '',
            action: shot.action,
            characters_foreground: shot.characters_foreground || [],
            characters_background: shot.characters_background || [],
            setting: shot.setting,
            camera: shot.camera,
            continuity_flags: shot.continuity_flags,
            beat_reference: shot.beat_reference,
        });

        // Fetch scene assets
        const { data: sceneAssets } = await supabase
            .from('scene_asset_instances')
            .select(`
                id,
                description_override,
                effective_description,
                status_tags,
                image_key_url,
                carry_forward,
                inherited_from_instance_id,
                project_asset:project_assets(id, name, asset_type, description, image_key_url)
            `)
            .eq('scene_id', sceneId);

        // Fetch style capsule
        let styleCapsule = null;
        if (project.visual_style_capsule_id) {
            try {
                const styleCapsuleService = new StyleCapsuleService();
                styleCapsule = await styleCapsuleService.getCapsuleById(project.visual_style_capsule_id, userId);
            } catch {
                // Continue without
            }
        }

        // Transform assets
        const assets = (sceneAssets || []).map((instance: any) => ({
            id: instance.id,
            project_asset: instance.project_asset ? {
                id: instance.project_asset.id,
                name: instance.project_asset.name,
                asset_type: instance.project_asset.asset_type,
                description: instance.project_asset.description,
                image_key_url: instance.project_asset.image_key_url || undefined,
            } : undefined,
            description_override: instance.description_override,
            effective_description: instance.effective_description || '',
            status_tags: instance.status_tags || [],
            image_key_url: instance.image_key_url || undefined,
        }));

        // Generate continuity prompt
        const continuityPrompt = await promptGenerationService.generateContinuityFramePrompt(
            buildShotData(currentShot),
            buildShotData(previousShot),
            assets,
            styleCapsule
        );

        // Save to database
        await supabase
            .from('shots')
            .update({
                continuity_frame_prompt: continuityPrompt,
                updated_at: new Date().toISOString(),
            })
            .eq('id', shotId);

        res.json({ continuityFramePrompt: continuityPrompt });
    } catch (error: any) {
        console.error('Error in POST generate-continuity-prompt:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

export const framesRouter = router;
