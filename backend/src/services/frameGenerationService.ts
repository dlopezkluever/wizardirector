import { supabase } from '../config/supabase.js';
import { ImageGenerationService } from './image-generation/ImageGenerationService.js';
import type { ReferenceImage } from './image-generation/ImageProviderInterface.js';
import { v4 as uuidv4 } from 'uuid';

// Frame status type
export type FrameStatus = 'pending' | 'generating' | 'generated' | 'approved' | 'rejected';
export type FrameType = 'start' | 'end';
export type GenerationMode = 'quick' | 'control';

export interface Frame {
    id: string;
    shotId: string;
    frameType: FrameType;
    status: FrameStatus;
    imageUrl: string | null;
    storagePath: string | null;
    currentJobId: string | null;
    generationCount: number;
    totalCostCredits: number;
    previousFrameId: string | null;
    promptSnapshot: string | null;
    inpaintCount: number;
    lastInpaintMaskPath: string | null;
    createdAt: string;
    updatedAt: string;
    generatedAt: string | null;
    approvedAt: string | null;
}

export interface ShotWithFrames {
    id: string;
    shotId: string;
    shotOrder: number;
    duration: number;
    action: string;
    dialogue: string;
    setting: string;
    camera: string;
    requiresEndFrame: boolean;
    framePrompt: string | null;
    videoPrompt: string | null;
    referenceImageOrder: { label: string; assetName: string; url: string; type: string }[] | null;
    endFramePrompt: string | null;
    startFrame: Frame | null;
    endFrame: Frame | null;
}

export interface GenerateFramesRequest {
    mode: GenerationMode;
    shotIds?: string[];       // Specific shots to generate (optional)
    startOnly?: boolean;      // In control mode, only generate start frames initially
}

export interface InpaintRequest {
    maskDataUrl: string;      // Base64 PNG mask data URL
    prompt: string;           // Inpainting instruction
}

// Job status polling result
export interface FrameJobStatus {
    frameId: string;
    jobId: string;
    status: 'queued' | 'processing' | 'generating' | 'uploading' | 'completed' | 'failed';
    imageUrl?: string;
    error?: {
        code: string;
        message: string;
    };
}

export class FrameGenerationService {
    private imageService: ImageGenerationService;

    // Frame dimensions by aspect ratio
    private readonly FRAME_DIMENSIONS: Record<string, { width: number; height: number }> = {
        '16:9': { width: 1280, height: 720 },
        '9:16': { width: 720, height: 1280 }
    };

    constructor() {
        this.imageService = new ImageGenerationService();
    }

    /**
     * Fetch all frames for a scene with shot context
     */
    async fetchFramesForScene(sceneId: string): Promise<ShotWithFrames[]> {
        // Fetch shots with frame data
        const { data: shots, error: shotsError } = await supabase
            .from('shots')
            .select(`
                id,
                shot_id,
                shot_order,
                duration,
                action,
                dialogue,
                setting,
                camera,
                requires_end_frame,
                frame_prompt,
                video_prompt,
                reference_image_order,
                end_frame_prompt
            `)
            .eq('scene_id', sceneId)
            .order('shot_order', { ascending: true });

        if (shotsError) {
            throw new Error(`Failed to fetch shots: ${shotsError.message}`);
        }

        if (!shots || shots.length === 0) {
            return [];
        }

        // Fetch frames for all shots in this scene
        const shotIds = shots.map(s => s.id);
        const { data: frames, error: framesError } = await supabase
            .from('frames')
            .select('*')
            .in('shot_id', shotIds);

        if (framesError) {
            console.error('Error fetching frames:', framesError);
            // Continue without frames rather than failing
        }

        // Build a map of frames by shot_id and frame_type
        const frameMap = new Map<string, { start: Frame | null; end: Frame | null }>();
        for (const shot of shots) {
            frameMap.set(shot.id, { start: null, end: null });
        }

        if (frames) {
            for (const frame of frames) {
                const entry = frameMap.get(frame.shot_id);
                if (entry) {
                    const mappedFrame: Frame = {
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
                    };
                    if (frame.frame_type === 'start') {
                        entry.start = mappedFrame;
                    } else if (frame.frame_type === 'end') {
                        entry.end = mappedFrame;
                    }
                }
            }
        }

        // Transform to response format
        return shots.map((shot: any) => {
            const frameEntry = frameMap.get(shot.id) || { start: null, end: null };
            return {
                id: shot.id,
                shotId: shot.shot_id,
                shotOrder: shot.shot_order,
                duration: shot.duration,
                action: shot.action,
                dialogue: shot.dialogue || '',
                setting: shot.setting,
                camera: shot.camera,
                requiresEndFrame: shot.requires_end_frame ?? true,
                framePrompt: shot.frame_prompt,
                videoPrompt: shot.video_prompt,
                referenceImageOrder: shot.reference_image_order || null,
                endFramePrompt: shot.end_frame_prompt || null,
                startFrame: frameEntry.start,
                endFrame: frameEntry.end,
            };
        });
    }

    /**
     * Generate frames for a scene
     * Control mode: Generate start frames first, require approval before end frames
     * Quick mode: Generate all frames at once
     */
    async generateFrames(
        projectId: string,
        branchId: string,
        sceneId: string,
        request: GenerateFramesRequest,
        visualStyleCapsuleId?: string,
        aspectRatio: string = '16:9'
    ): Promise<{ jobsCreated: number; frames: Frame[] }> {
        // Fetch shots
        let shotsQuery = supabase
            .from('shots')
            .select('*')
            .eq('scene_id', sceneId)
            .order('shot_order', { ascending: true });

        if (request.shotIds && request.shotIds.length > 0) {
            shotsQuery = shotsQuery.in('id', request.shotIds);
        }

        const { data: shots, error: shotsError } = await shotsQuery;

        if (shotsError || !shots || shots.length === 0) {
            throw new Error('No shots found for frame generation');
        }

        const createdFrames: Frame[] = [];
        let jobsCreated = 0;

        // Determine previous shot end frame for continuity chaining
        let previousEndFrameId: string | null = null;

        for (const shot of shots) {
            // Check if frame prompt exists
            if (!shot.frame_prompt) {
                console.warn(`[FrameService] Shot ${shot.shot_id} has no frame_prompt, skipping`);
                continue;
            }

            // Fetch asset reference images for this shot
            const shotRefImages = await this.fetchShotReferenceImages(shot.id);

            // Generate start frame
            const startFrame = await this.ensureFrame(shot.id, 'start', previousEndFrameId);
            if (startFrame.status === 'pending' || startFrame.status === 'rejected') {
                await this.startFrameGeneration(
                    startFrame.id,
                    projectId,
                    branchId,
                    sceneId,
                    shot.id,
                    shot.frame_prompt,
                    visualStyleCapsuleId,
                    aspectRatio,
                    shotRefImages
                );
                jobsCreated++;
            }
            createdFrames.push(startFrame);

            // In Control mode with startOnly, don't generate end frames yet
            if (request.mode === 'control' && request.startOnly) {
                // Set up the end frame record if needed, but don't generate yet
                if (shot.requires_end_frame) {
                    const endFrame = await this.ensureFrame(shot.id, 'end', null);
                    createdFrames.push(endFrame);
                }
            } else if (shot.requires_end_frame) {
                // Quick mode or Control mode after start approved: generate end frames
                const endFrame = await this.ensureFrame(shot.id, 'end', null);
                if (endFrame.status === 'pending' || endFrame.status === 'rejected') {
                    // Use end_frame_prompt if available; fall back to old suffix for legacy data
                    const endPrompt = shot.end_frame_prompt
                        ? shot.end_frame_prompt
                        : shot.frame_prompt + ' [End of shot - showing action completion]';

                    // For end frames: prepend approved start frame image as identity reference
                    const endRefImages = [...shotRefImages];
                    if (startFrame.imageUrl) {
                        endRefImages.unshift({ url: startFrame.imageUrl, role: 'identity' as const });
                    }

                    await this.startFrameGeneration(
                        endFrame.id,
                        projectId,
                        branchId,
                        sceneId,
                        shot.id,
                        endPrompt,
                        visualStyleCapsuleId,
                        aspectRatio,
                        endRefImages
                    );
                    jobsCreated++;
                }
                createdFrames.push(endFrame);
                previousEndFrameId = endFrame.id;
            }
        }

        return { jobsCreated, frames: createdFrames };
    }

    /**
     * Ensure a frame record exists, create if not
     */
    private async ensureFrame(shotId: string, frameType: FrameType, previousFrameId: string | null): Promise<Frame> {
        // Check if frame already exists
        const { data: existingFrame } = await supabase
            .from('frames')
            .select('*')
            .eq('shot_id', shotId)
            .eq('frame_type', frameType)
            .single();

        if (existingFrame) {
            return this.mapFrameFromDb(existingFrame);
        }

        // Create new frame
        const { data: newFrame, error: insertError } = await supabase
            .from('frames')
            .insert({
                shot_id: shotId,
                frame_type: frameType,
                status: 'pending',
                previous_frame_id: previousFrameId,
            })
            .select()
            .single();

        if (insertError || !newFrame) {
            throw new Error(`Failed to create frame: ${insertError?.message}`);
        }

        return this.mapFrameFromDb(newFrame);
    }

    /**
     * Fetch asset reference images for a shot from reference_image_order column
     */
    private async fetchShotReferenceImages(shotId: string): Promise<ReferenceImage[]> {
        const { data: shot } = await supabase
            .from('shots')
            .select('reference_image_order')
            .eq('id', shotId)
            .single();

        if (!shot?.reference_image_order || !Array.isArray(shot.reference_image_order)) {
            return [];
        }

        return shot.reference_image_order.map((entry: { url: string }) => ({
            url: entry.url,
            role: 'identity' as const,
        }));
    }

    /**
     * Start frame generation job
     */
    private async startFrameGeneration(
        frameId: string,
        projectId: string,
        branchId: string,
        sceneId: string,
        shotId: string,
        prompt: string,
        visualStyleCapsuleId?: string,
        aspectRatio: string = '16:9',
        referenceImageUrls?: ReferenceImage[]
    ): Promise<void> {
        // Get current frame data
        const { data: frame, error: fetchError } = await supabase
            .from('frames')
            .select('frame_type, generation_count')
            .eq('id', frameId)
            .single();

        if (fetchError || !frame) {
            throw new Error(`Frame not found: ${fetchError?.message}`);
        }

        // Update frame status to generating
        const { error: updateError } = await supabase
            .from('frames')
            .update({
                status: 'generating',
                prompt_snapshot: prompt,
            })
            .eq('id', frameId);

        if (updateError) {
            throw new Error(`Failed to update frame status: ${updateError.message}`);
        }

        const jobType = frame.frame_type === 'start' ? 'start_frame' : 'end_frame';

        try {
            // Create image generation job
            const result = await this.imageService.createImageJob({
                projectId,
                branchId,
                sceneId,
                shotId,
                jobType,
                prompt,
                visualStyleCapsuleId,
                width: (this.FRAME_DIMENSIONS[aspectRatio] || this.FRAME_DIMENSIONS['16:9']).width,
                height: (this.FRAME_DIMENSIONS[aspectRatio] || this.FRAME_DIMENSIONS['16:9']).height,
                idempotencyKey: `frame-${frameId}-${Date.now()}`,
                referenceImageUrls,
            });

            // Update frame with job ID and increment generation count
            const { error: jobUpdateError } = await supabase
                .from('frames')
                .update({
                    current_job_id: result.jobId,
                    generation_count: (frame.generation_count || 0) + 1,
                })
                .eq('id', frameId);

            if (jobUpdateError) {
                console.error(`[FrameService] Failed to update frame with job ID: ${jobUpdateError.message}`);
            }

            console.log(`[FrameService] Started generation job ${result.jobId} for frame ${frameId}`);

        } catch (error: any) {
            // Revert frame status on job creation failure
            console.error(`[FrameService] Job creation failed for frame ${frameId}:`, error);
            await supabase
                .from('frames')
                .update({ status: 'pending' })
                .eq('id', frameId);
            throw error;
        }
    }

    /**
     * Approve a frame
     */
    async approveFrame(frameId: string): Promise<Frame> {
        const now = new Date().toISOString();

        const { data: frame, error } = await supabase
            .from('frames')
            .update({
                status: 'approved',
                approved_at: now,
            })
            .eq('id', frameId)
            .select()
            .single();

        if (error || !frame) {
            throw new Error(`Failed to approve frame: ${error?.message}`);
        }

        return this.mapFrameFromDb(frame);
    }

    /**
     * Reject a frame
     */
    async rejectFrame(frameId: string): Promise<Frame> {
        const { data: frame, error } = await supabase
            .from('frames')
            .update({
                status: 'rejected',
            })
            .eq('id', frameId)
            .select()
            .single();

        if (error || !frame) {
            throw new Error(`Failed to reject frame: ${error?.message}`);
        }

        return this.mapFrameFromDb(frame);
    }

    /**
     * Regenerate a frame
     */
    async regenerateFrame(
        frameId: string,
        projectId: string,
        branchId: string,
        sceneId: string,
        visualStyleCapsuleId?: string,
        aspectRatio: string = '16:9'
    ): Promise<Frame> {
        // Get frame and shot info
        const { data: frame, error: frameError } = await supabase
            .from('frames')
            .select(`
                *,
                shots!inner (
                    id,
                    frame_prompt,
                    end_frame_prompt
                )
            `)
            .eq('id', frameId)
            .single();

        if (frameError || !frame) {
            throw new Error(`Frame not found: ${frameError?.message}`);
        }

        const shot = (frame as any).shots;
        if (!shot?.frame_prompt) {
            throw new Error('Shot has no frame prompt');
        }

        // Prepare prompt: use end_frame_prompt for end frames, fall back to old suffix
        let prompt = shot.frame_prompt;
        if (frame.frame_type === 'end') {
            prompt = shot.end_frame_prompt
                ? shot.end_frame_prompt
                : shot.frame_prompt + ' [End of shot - showing action completion]';
        }

        // Fetch reference images for the shot
        const shotRefImages = await this.fetchShotReferenceImages(shot.id);

        // For end frames: prepend start frame image as identity reference
        const refImages = [...shotRefImages];
        if (frame.frame_type === 'end') {
            const { data: startFrame } = await supabase
                .from('frames')
                .select('image_url')
                .eq('shot_id', shot.id)
                .eq('frame_type', 'start')
                .single();
            if (startFrame?.image_url) {
                refImages.unshift({ url: startFrame.image_url, role: 'identity' as const });
            }
        }

        // Start regeneration
        await this.startFrameGeneration(
            frameId,
            projectId,
            branchId,
            sceneId,
            shot.id,
            prompt,
            visualStyleCapsuleId,
            aspectRatio,
            refImages
        );

        // Return updated frame
        const { data: updatedFrame } = await supabase
            .from('frames')
            .select('*')
            .eq('id', frameId)
            .single();

        return this.mapFrameFromDb(updatedFrame);
    }

    /**
     * Inpaint a frame with mask
     */
    async inpaintFrame(
        frameId: string,
        projectId: string,
        branchId: string,
        sceneId: string,
        request: InpaintRequest,
        visualStyleCapsuleId?: string,
        aspectRatio: string = '16:9'
    ): Promise<Frame> {
        // Get frame info
        const { data: frame, error: frameError } = await supabase
            .from('frames')
            .select('*, shots!inner(id)')
            .eq('id', frameId)
            .single();

        if (frameError || !frame) {
            throw new Error(`Frame not found: ${frameError?.message}`);
        }

        if (!frame.image_url) {
            throw new Error('Frame has no image to inpaint');
        }

        // Update frame status
        await supabase
            .from('frames')
            .update({
                status: 'generating',
                inpaint_count: (frame.inpaint_count || 0) + 1,
            })
            .eq('id', frameId);

        // Store mask (optional - for debugging/history)
        const maskPath = await this.storeMask(projectId, frameId, request.maskDataUrl);

        // Create inpaint job
        const shot = (frame as any).shots;
        const jobType = frame.frame_type === 'start' ? 'start_frame' : 'end_frame';

        // Build inpaint prompt
        const inpaintPrompt = `${request.prompt}\n\n[Inpainting: Apply changes only to masked regions]`;

        const result = await this.imageService.createImageJob({
            projectId,
            branchId,
            sceneId,
            shotId: shot.id,
            jobType,
            prompt: inpaintPrompt,
            visualStyleCapsuleId,
            width: (this.FRAME_DIMENSIONS[aspectRatio] || this.FRAME_DIMENSIONS['16:9']).width,
            height: (this.FRAME_DIMENSIONS[aspectRatio] || this.FRAME_DIMENSIONS['16:9']).height,
            idempotencyKey: `inpaint-${frameId}-${Date.now()}`,
            referenceImageUrl: frame.image_url, // Pass current image as reference
        });

        // Update frame with job ID and mask path
        await supabase
            .from('frames')
            .update({
                current_job_id: result.jobId,
                last_inpaint_mask_path: maskPath,
            })
            .eq('id', frameId);

        // Return updated frame
        const { data: updatedFrame } = await supabase
            .from('frames')
            .select('*')
            .eq('id', frameId)
            .single();

        return this.mapFrameFromDb(updatedFrame);
    }

    /**
     * Store mask image to storage
     */
    private async storeMask(projectId: string, frameId: string, maskDataUrl: string): Promise<string | null> {
        try {
            // Parse data URL
            const matches = maskDataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
            if (!matches) {
                console.warn('[FrameService] Invalid mask data URL format');
                return null;
            }

            const [, format, base64Data] = matches;
            const buffer = Buffer.from(base64Data, 'base64');

            const maskPath = `project_${projectId}/inpaint-masks/${frameId}_${Date.now()}.${format}`;

            const { error: uploadError } = await supabase.storage
                .from('asset-images')
                .upload(maskPath, buffer, {
                    contentType: `image/${format}`,
                    upsert: true,
                });

            if (uploadError) {
                console.error('[FrameService] Failed to upload mask:', uploadError);
                return null;
            }

            return maskPath;
        } catch (error) {
            console.error('[FrameService] Error storing mask:', error);
            return null;
        }
    }

    /**
     * Get job status for a frame
     */
    async getFrameJobStatus(frameId: string): Promise<FrameJobStatus | null> {
        const { data: frame, error } = await supabase
            .from('frames')
            .select('id, current_job_id')
            .eq('id', frameId)
            .single();

        if (error || !frame || !frame.current_job_id) {
            return null;
        }

        const jobStatus = await this.imageService.getJobStatus(frame.current_job_id);

        // If job completed, update frame
        if (jobStatus.status === 'completed' && jobStatus.publicUrl) {
            await this.onJobCompleted(frameId, jobStatus.publicUrl, jobStatus.storagePath);
        } else if (jobStatus.status === 'failed') {
            await this.onJobFailed(frameId);
        }

        return {
            frameId,
            jobId: frame.current_job_id,
            status: jobStatus.status,
            imageUrl: jobStatus.publicUrl,
            error: jobStatus.error,
        };
    }

    /**
     * Handle job completion
     */
    private async onJobCompleted(frameId: string, imageUrl: string, storagePath?: string): Promise<void> {
        // Get job cost
        const { data: frame } = await supabase
            .from('frames')
            .select('current_job_id, total_cost_credits')
            .eq('id', frameId)
            .single();

        let costToAdd = 0;
        if (frame?.current_job_id) {
            const { data: job } = await supabase
                .from('image_generation_jobs')
                .select('cost_credits')
                .eq('id', frame.current_job_id)
                .single();
            costToAdd = parseFloat(job?.cost_credits) || 0;
        }

        await supabase
            .from('frames')
            .update({
                status: 'generated',
                image_url: imageUrl,
                storage_path: storagePath,
                generated_at: new Date().toISOString(),
                total_cost_credits: (parseFloat(frame?.total_cost_credits) || 0) + costToAdd,
            })
            .eq('id', frameId);
    }

    /**
     * Handle job failure
     */
    private async onJobFailed(frameId: string): Promise<void> {
        await supabase
            .from('frames')
            .update({
                status: 'rejected',  // Set to rejected so user can retry
            })
            .eq('id', frameId);
    }

    /**
     * Map database row to Frame interface
     */
    private mapFrameFromDb(row: any): Frame {
        return {
            id: row.id,
            shotId: row.shot_id,
            frameType: row.frame_type,
            status: row.status,
            imageUrl: row.image_url,
            storagePath: row.storage_path,
            currentJobId: row.current_job_id,
            generationCount: row.generation_count || 0,
            totalCostCredits: parseFloat(row.total_cost_credits) || 0,
            previousFrameId: row.previous_frame_id,
            promptSnapshot: row.prompt_snapshot,
            inpaintCount: row.inpaint_count || 0,
            lastInpaintMaskPath: row.last_inpaint_mask_path,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            generatedAt: row.generated_at,
            approvedAt: row.approved_at,
        };
    }

    /**
     * Calculate total credits used for a scene's frames
     */
    async getSceneFrameCosts(sceneId: string): Promise<{ totalCredits: number; frameCount: number }> {
        const { data: shots } = await supabase
            .from('shots')
            .select('id')
            .eq('scene_id', sceneId);

        if (!shots || shots.length === 0) {
            return { totalCredits: 0, frameCount: 0 };
        }

        const shotIds = shots.map(s => s.id);

        const { data: frames } = await supabase
            .from('frames')
            .select('total_cost_credits')
            .in('shot_id', shotIds);

        if (!frames) {
            return { totalCredits: 0, frameCount: 0 };
        }

        const totalCredits = frames.reduce((sum, f) => sum + (parseFloat(f.total_cost_credits) || 0), 0);

        return {
            totalCredits,
            frameCount: frames.length,
        };
    }

    /**
     * Check if all required frames are approved for a scene (stage completion gate)
     */
    async areAllFramesApproved(sceneId: string): Promise<boolean> {
        const shotsWithFrames = await this.fetchFramesForScene(sceneId);

        for (const shot of shotsWithFrames) {
            // Check start frame
            if (!shot.startFrame || shot.startFrame.status !== 'approved') {
                return false;
            }

            // Check end frame if required
            if (shot.requiresEndFrame) {
                if (!shot.endFrame || shot.endFrame.status !== 'approved') {
                    return false;
                }
            }
        }

        return true;
    }
}

// Export singleton instance
export const frameGenerationService = new FrameGenerationService();
