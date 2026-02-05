import { supabase } from '../config/supabase.js';
import { userCreditsService } from './userCreditsService.js';

// Pricing constants ($/second)
export const VEO_31_FAST_RATE = 0.15;
export const VEO_31_STANDARD_RATE = 0.40;

export type ModelVariant = 'veo_3_1_fast' | 'veo_3_1_standard';
export type VideoJobStatus = 'queued' | 'processing' | 'generating' | 'uploading' | 'completed' | 'failed';

export interface ShotCheckoutDetail {
    shotId: string;
    shotUuid: string;
    shotOrder: number;
    duration: number;
    startFrameId: string | null;
    endFrameId: string | null;
    startFrameUrl: string | null;
    endFrameUrl: string | null;
    startFrameStatus: string;
    endFrameStatus: string | null;
    requiresEndFrame: boolean;
    framePrompt: string | null;
    videoPrompt: string | null;
    imageCost: number;
    videoCostFast: number;
    videoCostStandard: number;
}

export interface DependencyWarnings {
    unapprovedFrames: { shotId: string; frameType: 'start' | 'end' }[];
    priorSceneMismatch: boolean;
    priorSceneEndFrameUrl: string | null;
}

export interface CheckoutData {
    sceneId: string;
    sceneName: string;
    sceneNumber: number;
    shots: ShotCheckoutDetail[];
    sceneTotalCostFast: number;
    sceneTotalCostStandard: number;
    projectRunningTotal: number;
    userBalance: number;
    lowCreditThreshold: number;
    isLowCredit: boolean;
    warnings: DependencyWarnings;
}

export interface VideoGenerationJob {
    id: string;
    projectId: string;
    branchId: string;
    sceneId: string;
    shotId: string;
    modelVariant: ModelVariant;
    status: VideoJobStatus;
    startFrameId: string;
    endFrameId: string | null;
    startFrameUrl: string;
    endFrameUrl: string | null;
    videoPromptSnapshot: string;
    framePromptSnapshot: string | null;
    durationSeconds: number;
    estimatedCost: number;
    actualCost: number | null;
    videoUrl: string | null;
    storagePath: string | null;
    errorCode: string | null;
    errorMessage: string | null;
    attemptCount: number;
    maxRetries: number;
    providerJobId: string | null;
    providerMetadata: any;
    createdAt: string;
    queuedAt: string;
    processingStartedAt: string | null;
    completedAt: string | null;
    updatedAt: string;
}

export interface ConfirmRenderResult {
    success: boolean;
    jobsCreated: number;
    totalEstimatedCost: number;
    jobs: VideoGenerationJob[];
}

export class VideoGenerationService {
    /**
     * Get the rate for a model variant
     */
    getRate(modelVariant: ModelVariant): number {
        return modelVariant === 'veo_3_1_fast' ? VEO_31_FAST_RATE : VEO_31_STANDARD_RATE;
    }

    /**
     * Calculate video cost for a duration and model
     */
    calculateVideoCost(durationSeconds: number, modelVariant: ModelVariant): number {
        const rate = this.getRate(modelVariant);
        return parseFloat((durationSeconds * rate).toFixed(4));
    }

    /**
     * Get full checkout data for a scene including costs, credits, and warnings
     */
    async getSceneCostBreakdown(
        projectId: string,
        sceneId: string,
        userId: string
    ): Promise<CheckoutData> {
        // Get scene info
        const { data: scene, error: sceneError } = await supabase
            .from('scenes')
            .select('id, scene_number, slug, branch_id')
            .eq('id', sceneId)
            .single();

        if (sceneError || !scene) {
            throw new Error(`Scene not found: ${sceneError?.message}`);
        }

        // Get shots with frames
        const { data: shots, error: shotsError } = await supabase
            .from('shots')
            .select(`
                id,
                shot_id,
                shot_order,
                duration,
                requires_end_frame,
                frame_prompt,
                video_prompt
            `)
            .eq('scene_id', sceneId)
            .order('shot_order', { ascending: true });

        if (shotsError) {
            throw new Error(`Failed to fetch shots: ${shotsError.message}`);
        }

        if (!shots || shots.length === 0) {
            throw new Error('No shots found for this scene');
        }

        // Get frames for all shots
        const shotIds = shots.map(s => s.id);
        const { data: frames, error: framesError } = await supabase
            .from('frames')
            .select('*')
            .in('shot_id', shotIds);

        if (framesError) {
            console.error('Error fetching frames:', framesError);
        }

        // Build frame lookup map
        const frameMap = new Map<string, { start: any; end: any }>();
        for (const shot of shots) {
            frameMap.set(shot.id, { start: null, end: null });
        }
        if (frames) {
            for (const frame of frames) {
                const entry = frameMap.get(frame.shot_id);
                if (entry) {
                    if (frame.frame_type === 'start') {
                        entry.start = frame;
                    } else if (frame.frame_type === 'end') {
                        entry.end = frame;
                    }
                }
            }
        }

        // Build shot checkout details
        const shotDetails: ShotCheckoutDetail[] = [];
        const unapprovedFrames: { shotId: string; frameType: 'start' | 'end' }[] = [];

        for (const shot of shots) {
            const frameEntry = frameMap.get(shot.id);
            const startFrame = frameEntry?.start;
            const endFrame = frameEntry?.end;

            // Track unapproved frames
            if (startFrame && startFrame.status !== 'approved') {
                unapprovedFrames.push({ shotId: shot.shot_id, frameType: 'start' });
            }
            if (shot.requires_end_frame && endFrame && endFrame.status !== 'approved') {
                unapprovedFrames.push({ shotId: shot.shot_id, frameType: 'end' });
            }

            // Calculate costs
            const imageCost = parseFloat(startFrame?.total_cost_credits || 0) +
                parseFloat(endFrame?.total_cost_credits || 0);
            const videoCostFast = this.calculateVideoCost(shot.duration, 'veo_3_1_fast');
            const videoCostStandard = this.calculateVideoCost(shot.duration, 'veo_3_1_standard');

            shotDetails.push({
                shotId: shot.shot_id,
                shotUuid: shot.id,
                shotOrder: shot.shot_order,
                duration: shot.duration,
                startFrameId: startFrame?.id || null,
                endFrameId: endFrame?.id || null,
                startFrameUrl: startFrame?.image_url || null,
                endFrameUrl: endFrame?.image_url || null,
                startFrameStatus: startFrame?.status || 'pending',
                endFrameStatus: shot.requires_end_frame ? (endFrame?.status || 'pending') : null,
                requiresEndFrame: shot.requires_end_frame ?? true,
                framePrompt: shot.frame_prompt,
                videoPrompt: shot.video_prompt,
                imageCost,
                videoCostFast,
                videoCostStandard,
            });
        }

        // Calculate scene totals
        const sceneTotalCostFast = shotDetails.reduce((sum, s) => sum + s.imageCost + s.videoCostFast, 0);
        const sceneTotalCostStandard = shotDetails.reduce((sum, s) => sum + s.imageCost + s.videoCostStandard, 0);

        // Get project running total (previous video generation costs)
        const projectRunningTotal = await this.getProjectRunningTotal(projectId);

        // Get user credits
        const creditBalance = await userCreditsService.getBalance(userId);

        // Check for prior scene continuity
        const dependencyWarnings = await this.getDependencyWarnings(sceneId, scene.branch_id, scene.scene_number);
        dependencyWarnings.unapprovedFrames = unapprovedFrames;

        return {
            sceneId,
            sceneName: scene.slug || `Scene ${scene.scene_number}`,
            sceneNumber: scene.scene_number,
            shots: shotDetails,
            sceneTotalCostFast: parseFloat(sceneTotalCostFast.toFixed(4)),
            sceneTotalCostStandard: parseFloat(sceneTotalCostStandard.toFixed(4)),
            projectRunningTotal: parseFloat(projectRunningTotal.toFixed(4)),
            userBalance: creditBalance.balance,
            lowCreditThreshold: creditBalance.lowCreditThreshold,
            isLowCredit: creditBalance.isLowCredit,
            warnings: dependencyWarnings,
        };
    }

    /**
     * Get total cost of all previous video generation jobs for a project
     */
    async getProjectRunningTotal(projectId: string): Promise<number> {
        const { data: jobs, error } = await supabase
            .from('video_generation_jobs')
            .select('estimated_cost, actual_cost, status')
            .eq('project_id', projectId);

        if (error || !jobs) {
            return 0;
        }

        // Sum up actual costs for completed jobs, estimated for others
        return jobs.reduce((total, job) => {
            const cost = job.status === 'completed' && job.actual_cost
                ? parseFloat(job.actual_cost)
                : parseFloat(job.estimated_cost);
            return total + (cost || 0);
        }, 0);
    }

    /**
     * Check for dependency warnings (prior scene continuity)
     */
    async getDependencyWarnings(
        sceneId: string,
        branchId: string,
        sceneNumber: number
    ): Promise<DependencyWarnings> {
        const warnings: DependencyWarnings = {
            unapprovedFrames: [],
            priorSceneMismatch: false,
            priorSceneEndFrameUrl: null,
        };

        // Check for prior scene
        if (sceneNumber > 1) {
            // Get prior scene
            const { data: priorScene } = await supabase
                .from('scenes')
                .select('id, end_frame_thumbnail')
                .eq('branch_id', branchId)
                .eq('scene_number', sceneNumber - 1)
                .single();

            if (priorScene) {
                warnings.priorSceneEndFrameUrl = priorScene.end_frame_thumbnail;

                // Check if prior scene has completed videos
                const { data: priorJobs } = await supabase
                    .from('video_generation_jobs')
                    .select('status')
                    .eq('scene_id', priorScene.id);

                // If prior scene has no jobs or incomplete jobs, flag mismatch
                if (!priorJobs || priorJobs.length === 0 ||
                    priorJobs.some(j => j.status !== 'completed')) {
                    warnings.priorSceneMismatch = true;
                }
            }
        }

        return warnings;
    }

    /**
     * Confirm render and queue video generation jobs
     */
    async confirmAndQueueRender(
        projectId: string,
        branchId: string,
        sceneId: string,
        modelVariant: ModelVariant,
        userId: string
    ): Promise<ConfirmRenderResult> {
        // Get checkout data first to validate
        const checkoutData = await this.getSceneCostBreakdown(projectId, sceneId, userId);

        // Calculate total cost
        const totalCost = modelVariant === 'veo_3_1_fast'
            ? checkoutData.sceneTotalCostFast
            : checkoutData.sceneTotalCostStandard;

        // Verify sufficient credits
        const hasSufficient = await userCreditsService.hasSufficientCredits(userId, totalCost);
        if (!hasSufficient) {
            throw new Error(`Insufficient credits. Required: ${totalCost}, Available: ${checkoutData.userBalance}`);
        }

        // Create video generation jobs for each shot
        const jobs: VideoGenerationJob[] = [];
        const jobsToInsert: any[] = [];

        for (const shot of checkoutData.shots) {
            // Skip shots without approved start frame
            if (!shot.startFrameUrl) {
                console.warn(`[VideoGen] Skipping shot ${shot.shotId}: no start frame`);
                continue;
            }

            const estimatedCost = modelVariant === 'veo_3_1_fast'
                ? shot.videoCostFast
                : shot.videoCostStandard;

            const jobData = {
                project_id: projectId,
                branch_id: branchId,
                scene_id: sceneId,
                shot_id: shot.shotUuid,
                model_variant: modelVariant,
                status: 'queued' as VideoJobStatus,
                start_frame_id: shot.startFrameId,
                end_frame_id: shot.endFrameId,
                start_frame_url: shot.startFrameUrl,
                end_frame_url: shot.endFrameUrl,
                video_prompt_snapshot: shot.videoPrompt || '',
                frame_prompt_snapshot: shot.framePrompt,
                duration_seconds: shot.duration,
                estimated_cost: estimatedCost,
            };

            jobsToInsert.push(jobData);
        }

        if (jobsToInsert.length === 0) {
            throw new Error('No shots with valid frames to render');
        }

        // Insert all jobs
        const { data: insertedJobs, error: insertError } = await supabase
            .from('video_generation_jobs')
            .insert(jobsToInsert)
            .select();

        if (insertError || !insertedJobs) {
            throw new Error(`Failed to create video jobs: ${insertError?.message}`);
        }

        // Map inserted jobs
        for (const job of insertedJobs) {
            jobs.push(this.mapJobFromDb(job));
        }

        console.log(`[VideoGen] Created ${jobs.length} video generation jobs for scene ${sceneId}`);

        return {
            success: true,
            jobsCreated: jobs.length,
            totalEstimatedCost: parseFloat(totalCost.toFixed(4)),
            jobs,
        };
    }

    /**
     * Get all video generation jobs for a scene
     */
    async getVideoJobs(sceneId: string): Promise<VideoGenerationJob[]> {
        const { data: jobs, error } = await supabase
            .from('video_generation_jobs')
            .select('*')
            .eq('scene_id', sceneId)
            .order('created_at', { ascending: true });

        if (error) {
            throw new Error(`Failed to fetch video jobs: ${error.message}`);
        }

        return (jobs || []).map(job => this.mapJobFromDb(job));
    }

    /**
     * Get a single video job by ID
     */
    async getVideoJob(jobId: string): Promise<VideoGenerationJob | null> {
        const { data: job, error } = await supabase
            .from('video_generation_jobs')
            .select('*')
            .eq('id', jobId)
            .single();

        if (error || !job) {
            return null;
        }

        return this.mapJobFromDb(job);
    }

    /**
     * Update video job status
     */
    async updateJobStatus(
        jobId: string,
        status: VideoJobStatus,
        additionalData?: Partial<{
            videoUrl: string;
            storagePath: string;
            actualCost: number;
            errorCode: string;
            errorMessage: string;
            providerJobId: string;
            providerMetadata: any;
        }>
    ): Promise<VideoGenerationJob> {
        const updateData: any = {
            status,
        };

        if (status === 'processing') {
            updateData.processing_started_at = new Date().toISOString();
            // Note: attempt_count incrementing would need a DB function or separate update
        }

        if (status === 'completed') {
            updateData.completed_at = new Date().toISOString();
        }

        if (additionalData) {
            if (additionalData.videoUrl) updateData.video_url = additionalData.videoUrl;
            if (additionalData.storagePath) updateData.storage_path = additionalData.storagePath;
            if (additionalData.actualCost !== undefined) updateData.actual_cost = additionalData.actualCost;
            if (additionalData.errorCode) updateData.error_code = additionalData.errorCode;
            if (additionalData.errorMessage) updateData.error_message = additionalData.errorMessage;
            if (additionalData.providerJobId) updateData.provider_job_id = additionalData.providerJobId;
            if (additionalData.providerMetadata) updateData.provider_metadata = additionalData.providerMetadata;
        }

        const { data: updated, error } = await supabase
            .from('video_generation_jobs')
            .update(updateData)
            .eq('id', jobId)
            .select()
            .single();

        if (error || !updated) {
            throw new Error(`Failed to update job status: ${error?.message}`);
        }

        return this.mapJobFromDb(updated);
    }

    /**
     * Map database row to TypeScript interface
     */
    private mapJobFromDb(row: any): VideoGenerationJob {
        return {
            id: row.id,
            projectId: row.project_id,
            branchId: row.branch_id,
            sceneId: row.scene_id,
            shotId: row.shot_id,
            modelVariant: row.model_variant,
            status: row.status,
            startFrameId: row.start_frame_id,
            endFrameId: row.end_frame_id,
            startFrameUrl: row.start_frame_url,
            endFrameUrl: row.end_frame_url,
            videoPromptSnapshot: row.video_prompt_snapshot,
            framePromptSnapshot: row.frame_prompt_snapshot,
            durationSeconds: row.duration_seconds,
            estimatedCost: parseFloat(row.estimated_cost) || 0,
            actualCost: row.actual_cost ? parseFloat(row.actual_cost) : null,
            videoUrl: row.video_url,
            storagePath: row.storage_path,
            errorCode: row.error_code,
            errorMessage: row.error_message,
            attemptCount: row.attempt_count || 0,
            maxRetries: row.max_retries || 3,
            providerJobId: row.provider_job_id,
            providerMetadata: row.provider_metadata,
            createdAt: row.created_at,
            queuedAt: row.queued_at,
            processingStartedAt: row.processing_started_at,
            completedAt: row.completed_at,
            updatedAt: row.updated_at,
        };
    }
}

// Export singleton instance
export const videoGenerationService = new VideoGenerationService();
