import { supabase } from '../../config/supabase.js';
import { NanoBananaClient } from './NanoBananaClient.js';
import { ImageProvider, ImageGenerationOptions, ImageArtifact } from './ImageProviderInterface.js';
import { v4 as uuidv4 } from 'uuid';

export interface CreateImageJobRequest {
    projectId: string;
    branchId: string;
    jobType: 'master_asset' | 'start_frame' | 'end_frame' | 'inpaint';
    prompt: string;
    visualStyleCapsuleId?: string;
    width?: number;
    height?: number;
    assetId?: string;
    sceneId?: string;
    shotId?: string;
    idempotencyKey?: string;
}

export interface ImageJobResult {
    jobId: string;
    status: 'queued' | 'processing' | 'generating' | 'uploading' | 'completed' | 'failed';
    publicUrl?: string;
    storagePath?: string;
    error?: {
        code: string;
        message: string;
        failureStage?: string;
    };
}

export class ImageGenerationService {
    private provider: ImageProvider;
    
    // Type-specific aspect ratios for master assets
    private readonly ASPECT_RATIOS = {
        character: { width: 512, height: 768 },   // 2:3 portrait for full-body
        prop: { width: 512, height: 512 },        // 1:1 square for product-style
        location: { width: 1024, height: 576 }    // 16:9 cinematic landscape
    };

    constructor() {
        this.provider = new NanoBananaClient();
    }

    /**
     * Create image generation job and execute in background
     * Returns immediately with job ID for polling
     */
    async createImageJob(request: CreateImageJobRequest): Promise<ImageJobResult> {
        // Check for existing job with same idempotency key
        if (request.idempotencyKey) {
            const existingJob = await this.findJobByIdempotencyKey(
                request.projectId,
                request.idempotencyKey
            );
            
            if (existingJob) {
                console.log(`[ImageService] Returning existing job ${existingJob.id} for idempotency key`);
                return this.formatJobResult(existingJob);
            }
        }

        // Auto-determine aspect ratio for master_asset job type
        if (request.jobType === 'master_asset' && request.assetId) {
            const asset = await this.getAssetDetails(request.assetId);
            if (asset) {
                const dimensions = this.ASPECT_RATIOS[asset.asset_type];
                request.width = dimensions.width;
                request.height = dimensions.height;
                
                console.log(`[ImageService] Auto-sizing ${asset.asset_type}: ${dimensions.width}x${dimensions.height}`);
            }
        }

        // Enforce visual style for Stage 5 master assets
        if (request.jobType === 'master_asset' && !request.visualStyleCapsuleId) {
            throw new Error('Visual Style Capsule is required for master asset generation');
        }

        const jobId = uuidv4();

        // Step 1: Persist job record (status: queued)
        const { data: job, error: insertError } = await supabase
            .from('image_generation_jobs')
            .insert({
                id: jobId,
                idempotency_key: request.idempotencyKey,
                project_id: request.projectId,
                branch_id: request.branchId,
                scene_id: request.sceneId,
                shot_id: request.shotId,
                asset_id: request.assetId,
                job_type: request.jobType,
                status: 'queued',
                prompt: request.prompt,
                visual_style_capsule_id: request.visualStyleCapsuleId,
                width: request.width || 512,
                height: request.height || 512,
                estimated_cost: this.provider.estimateCost({
                    prompt: request.prompt,
                    width: request.width,
                    height: request.height
                })
            })
            .select()
            .single();

        if (insertError || !job) {
            throw new Error(`Failed to create job: ${insertError?.message}`);
        }

        console.log(`[ImageService] Created job ${jobId}, queued for execution`);

        // Step 2: Execute in background (don't await)
        this.executeJobInBackground(jobId, request).catch(error => {
            console.error(`[ImageService] Background execution failed for job ${jobId}:`, error);
        });

        // Step 3: Return immediately
        return {
            jobId,
            status: 'queued'
        };
    }

    /**
     * Execute job asynchronously with granular state tracking
     */
    private async executeJobInBackground(jobId: string, request: CreateImageJobRequest): Promise<void> {
        try {
            // Update to processing
            await this.updateJobState(jobId, 'processing', {
                processing_started_at: new Date().toISOString(),
                attempt_count: 1,
                last_attempt_at: new Date().toISOString()
            });

            // Get visual style context if provided
            let visualStyleContext = '';
            if (request.visualStyleCapsuleId) {
                visualStyleContext = await this.getVisualStyleContext(request.visualStyleCapsuleId);
            }

            // Update to generating
            await this.updateJobState(jobId, 'generating', {
                generating_started_at: new Date().toISOString()
            });

            // Execute generation
            const result = await this.provider.generateImage({
                prompt: request.prompt,
                width: request.width,
                height: request.height,
                visualStyleContext
            });

            // Update to uploading
            await this.updateJobState(jobId, 'uploading', {
                uploading_started_at: new Date().toISOString()
            });

            // Convert artifact to buffer for upload
            const imageBuffer = await this.artifactToBuffer(result.artifact);

            // Upload to Supabase Storage
            const storagePath = this.buildStoragePath(request);
            const { error: uploadError } = await supabase.storage
                .from('asset-images')
                .upload(storagePath, imageBuffer, {
                    contentType: result.artifact.contentType || 'image/png',
                    upsert: false
                });

            if (uploadError) {
                throw new Error(`Storage upload failed: ${uploadError.message}`);
            }

            // Get public URL
            const { data: urlData } = supabase.storage
                .from('asset-images')
                .getPublicUrl(storagePath);

            // Update job with success
            await this.updateJobState(jobId, 'completed', {
                storage_path: storagePath,
                public_url: urlData.publicUrl,
                cost_credits: result.metadata.actualCost || result.metadata.estimatedCost,
                provider_metadata: result.providerRawResponse,
                completed_at: new Date().toISOString()
            });

            console.log(`[ImageService] Job ${jobId} completed successfully`);

        } catch (error: any) {
            console.error(`[ImageService] Job ${jobId} failed:`, error);

            // Determine failure stage from current status
            const { data: currentJob } = await supabase
                .from('image_generation_jobs')
                .select('status')
                .eq('id', jobId)
                .single();

            const failureStage = currentJob?.status === 'uploading' 
                ? 'uploading' 
                : currentJob?.status === 'generating'
                ? 'generating'
                : 'persisting';

            const errorCode = error.code || 'UNKNOWN';
            const errorMessage = error.message || 'Unknown error';

            await this.updateJobState(jobId, 'failed', {
                error_code: errorCode,
                error_message: errorMessage,
                failure_stage: failureStage
            });
        }
    }

    /**
     * Convert ImageArtifact to Buffer for storage upload
     */
    private async artifactToBuffer(artifact: ImageArtifact): Promise<Buffer> {
        if (artifact.type === 'buffer') {
            return artifact.data as Buffer;
        }
        
        if (artifact.type === 'base64') {
            return Buffer.from(artifact.data as string, 'base64');
        }
        
        if (artifact.type === 'url') {
            const response = await fetch(artifact.data as string);
            const arrayBuffer = await response.arrayBuffer();
            return Buffer.from(arrayBuffer);
        }

        throw new Error(`Unknown artifact type: ${artifact.type}`);
    }

    private buildStoragePath(request: CreateImageJobRequest): string {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 9);
        
        if (request.jobType === 'master_asset') {
            return `project_${request.projectId}/branch_${request.branchId}/master-assets/${request.assetId}_${timestamp}_${random}.png`;
        } else if (request.shotId) {
            return `project_${request.projectId}/branch_${request.branchId}/scene_${request.sceneId}/shot_${request.shotId}/${request.jobType}_${timestamp}_${random}.png`;
        }
        
        return `project_${request.projectId}/branch_${request.branchId}/misc/${timestamp}_${random}.png`;
    }

    private async updateJobState(jobId: string, status: string, additionalFields: Record<string, any> = {}) {
        await supabase
            .from('image_generation_jobs')
            .update({ 
                status,
                updated_at: new Date().toISOString(),
                ...additionalFields
            })
            .eq('id', jobId);
    }

    private async getVisualStyleContext(capsuleId: string): Promise<string> {
        const { data: capsule } = await supabase
            .from('style_capsules')
            .select('descriptors, design_pillars')
            .eq('id', capsuleId)
            .single();

        if (!capsule) return '';

        const descriptors = capsule.descriptors?.join(', ') || '';
        const pillars = capsule.design_pillars 
            ? Object.entries(capsule.design_pillars).map(([k, v]) => `${k}: ${v}`).join('; ')
            : '';

        return [descriptors, pillars].filter(Boolean).join('. ');
    }

    private async findJobByIdempotencyKey(projectId: string, idempotencyKey: string) {
        const { data } = await supabase
            .from('image_generation_jobs')
            .select('*')
            .eq('project_id', projectId)
            .eq('idempotency_key', idempotencyKey)
            .single();

        return data;
    }

    private formatJobResult(job: any): ImageJobResult {
        return {
            jobId: job.id,
            status: job.status,
            publicUrl: job.public_url,
            storagePath: job.storage_path,
            error: job.error_code ? {
                code: job.error_code,
                message: job.error_message,
                failureStage: job.failure_stage
            } : undefined
        };
    }

    /**
     * Get job status for polling
     */
    async getJobStatus(jobId: string): Promise<ImageJobResult> {
        const { data: job, error } = await supabase
            .from('image_generation_jobs')
            .select('*')
            .eq('id', jobId)
            .single();

        if (error || !job) {
            throw new Error('Job not found');
        }

        return this.formatJobResult(job);
    }

    /**
     * Get asset details from project_assets or global_assets
     */
    private async getAssetDetails(assetId: string): Promise<{ asset_type: 'character' | 'prop' | 'location'; name: string; description: string } | null> {
        // Try project_assets first
        const { data: projectAsset } = await supabase
            .from('project_assets')
            .select('asset_type, name, description')
            .eq('id', assetId)
            .single();

        if (projectAsset) {
            return projectAsset as { asset_type: 'character' | 'prop' | 'location'; name: string; description: string };
        }

        // Fallback to global_assets
        const { data: globalAsset } = await supabase
            .from('global_assets')
            .select('asset_type, name, description')
            .eq('id', assetId)
            .single();

        if (globalAsset) {
            return globalAsset as { asset_type: 'character' | 'prop' | 'location'; name: string; description: string };
        }

        return null;
    }
}

