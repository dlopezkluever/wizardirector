/**
 * Video Job Executor
 * Polls video_generation_jobs table for queued jobs and processes them
 * using the configured video provider (mock or Veo3).
 *
 * Follows the same pattern as ImageGenerationService.executeJobInBackground()
 */

import { supabase } from '../../config/supabase.js';
import { createVideoProvider } from './createVideoProvider.js';
import type { VideoProvider } from './VideoProviderInterface.js';
import { videoGenerationService } from '../videoGenerationService.js';

class VideoJobExecutor {
    private isProcessing = false;
    private pollIntervalMs = 5000;
    private provider: VideoProvider;

    constructor() {
        this.provider = createVideoProvider();
    }

    /**
     * Process all queued jobs. Called fire-and-forget after confirmAndQueueRender.
     * Processes jobs one at a time to avoid overloading.
     */
    async processQueuedJobs(): Promise<void> {
        if (this.isProcessing) {
            console.log('[VideoJobExecutor] Already processing, skipping');
            return;
        }

        this.isProcessing = true;
        console.log('[VideoJobExecutor] Starting job processing loop');

        try {
            // Keep processing until no more queued jobs
            let hasMore = true;
            while (hasMore) {
                const job = await this.fetchNextQueuedJob();
                if (!job) {
                    hasMore = false;
                    break;
                }

                await this.processJob(job);

                // Small delay between jobs to prevent tight looping
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        } catch (error) {
            console.error('[VideoJobExecutor] Fatal error in processing loop:', error);
        } finally {
            this.isProcessing = false;
            console.log('[VideoJobExecutor] Job processing loop ended');
        }
    }

    /**
     * Fetch the next queued job (oldest first)
     */
    private async fetchNextQueuedJob(): Promise<any | null> {
        const { data: job, error } = await supabase
            .from('video_generation_jobs')
            .select('*')
            .eq('status', 'queued')
            .order('created_at', { ascending: true })
            .limit(1)
            .single();

        if (error || !job) {
            return null;
        }

        return job;
    }

    /**
     * Process a single video generation job through the full lifecycle
     */
    private async processJob(job: any): Promise<void> {
        const jobId = job.id;
        console.log(`[VideoJobExecutor] Processing job ${jobId}`);

        try {
            // 1. Update status → processing
            await videoGenerationService.updateJobStatus(jobId, 'processing');

            // Increment attempt count
            await supabase
                .from('video_generation_jobs')
                .update({ attempt_count: (job.attempt_count || 0) + 1 })
                .eq('id', jobId);

            // 2. Update status → generating
            await videoGenerationService.updateJobStatus(jobId, 'generating');

            // 3. Call video provider
            const result = await this.provider.generateVideo({
                startFrameUrl: job.start_frame_url,
                endFrameUrl: job.end_frame_url,
                prompt: job.video_prompt_snapshot || '',
                durationSeconds: job.duration_seconds,
                modelVariant: job.model_variant,
            });

            // 4. Update status → uploading
            await videoGenerationService.updateJobStatus(jobId, 'uploading', {
                providerJobId: result.providerJobId,
                providerMetadata: result.providerMetadata,
            });

            // 5. For mock provider, use the URL directly. For real providers,
            //    we'd upload to Supabase Storage here.
            const videoUrl = result.videoUrl;
            const storagePath = result.storagePath;

            // 6. Update status → completed
            await videoGenerationService.updateJobStatus(jobId, 'completed', {
                videoUrl,
                storagePath,
                actualCost: result.actualCost,
                providerJobId: result.providerJobId,
                providerMetadata: result.providerMetadata,
            });

            console.log(`[VideoJobExecutor] Job ${jobId} completed successfully`);

            // 7. Check if all jobs for this scene are complete
            await videoGenerationService.checkAndUpdateSceneStatus(job.scene_id);

        } catch (error: any) {
            console.error(`[VideoJobExecutor] Job ${jobId} failed:`, error.message);

            const attemptCount = (job.attempt_count || 0) + 1;
            const maxRetries = job.max_retries || 3;

            if (attemptCount < maxRetries) {
                // Retry: reset to queued
                console.log(`[VideoJobExecutor] Job ${jobId} will retry (attempt ${attemptCount}/${maxRetries})`);
                await supabase
                    .from('video_generation_jobs')
                    .update({
                        status: 'queued',
                        error_message: error.message,
                        attempt_count: attemptCount,
                    })
                    .eq('id', jobId);
            } else {
                // Max retries exceeded: mark as failed
                await videoGenerationService.updateJobStatus(jobId, 'failed', {
                    errorCode: error.code || 'GENERATION_FAILED',
                    errorMessage: error.message || 'Video generation failed after max retries',
                });

                // Still check scene status (to handle partial completion)
                await videoGenerationService.checkAndUpdateSceneStatus(job.scene_id);
            }
        }
    }
}

// Export singleton
export const videoJobExecutor = new VideoJobExecutor();
