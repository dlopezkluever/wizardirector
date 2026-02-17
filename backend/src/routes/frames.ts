import { Router } from 'express';
import { supabase } from '../config/supabase.js';
import { frameGenerationService } from '../services/frameGenerationService.js';
import { promptGenerationService, enrichAssetsWithAngleMatch } from '../services/promptGenerationService.js';
import type { ShotData, SceneAssetInstanceData } from '../services/promptGenerationService.js';
import { StyleCapsuleService } from '../services/styleCapsuleService.js';

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

        // Generate end frame prompt
        const endFramePrompt = await promptGenerationService.generateEndFramePrompt(
            shotData,
            shot.frame_prompt,
            (sceneAssets || []) as unknown as SceneAssetInstanceData[],
            styleCapsule
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

export const framesRouter = router;
