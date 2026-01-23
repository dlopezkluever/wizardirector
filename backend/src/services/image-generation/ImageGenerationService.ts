import { supabase } from '../../config/supabase.js';
import { NanoBananaClient } from './NanoBananaClient.js';
import { ImageProvider, ImageGenerationOptions, ImageArtifact, ReferenceImage } from './ImageProviderInterface.js';
import { v4 as uuidv4 } from 'uuid';

interface VisualStyleContext {
    textContext: string;
    referenceImages: ReferenceImage[];
}

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
    referenceImageUrl?: string; // Optional reference image URL for merged assets
}

export interface CreateGlobalAssetImageJobRequest {
    assetId: string;
    userId: string;
    prompt: string;
    visualStyleCapsuleId?: string;
    width?: number;
    height?: number;
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
            let visualStyleContext: VisualStyleContext | null = null;
            if (request.visualStyleCapsuleId) {
                visualStyleContext = await this.getVisualStyleContext(request.visualStyleCapsuleId);
            }

            // Add reference image URL if provided (for merged assets)
            if (request.referenceImageUrl) {
                if (!visualStyleContext) {
                    visualStyleContext = { textContext: '', referenceImages: [] };
                }
                // Add the reference image to the context
                visualStyleContext.referenceImages.push({
                    url: request.referenceImageUrl,
                    mimeType: undefined // Will be detected when downloading
                });
                console.log(`[ImageService] Added reference image URL to context: ${request.referenceImageUrl.substring(0, 80)}...`);
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
                visualStyleContext: visualStyleContext?.textContext,
                referenceImages: visualStyleContext?.referenceImages
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

            // If this is a master_asset job, update the project_assets table FIRST
            // This ensures the asset is updated before the job is marked as completed
            if (request.jobType === 'master_asset' && request.assetId) {
                const { error: updateError } = await supabase
                    .from('project_assets')
                    .update({ image_key_url: urlData.publicUrl })
                    .eq('id', request.assetId);

                if (updateError) {
                    console.error(`[ImageService] Failed to update project_assets.image_key_url for asset ${request.assetId}:`, updateError);
                    // Don't throw - job completed successfully, just log the error
                } else {
                    console.log(`[ImageService] Updated project_assets.image_key_url for asset ${request.assetId}`);
                }
            }

            // Update job with success (after asset update to avoid race conditions)
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

    private async getVisualStyleContext(capsuleId: string): Promise<VisualStyleContext> {
        const { data: capsule } = await supabase
            .from('style_capsules')
            .select('descriptor_strings, design_pillars, reference_image_urls')
            .eq('id', capsuleId)
            .single();

        if (!capsule) {
            console.log(`[ImageService] Style capsule ${capsuleId} not found`);
            return { textContext: '', referenceImages: [] };
        }

        // Log what we're retrieving
        const hasDescriptorStrings = !!capsule.descriptor_strings && capsule.descriptor_strings.trim().length > 0;
        const hasPillars = !!capsule.design_pillars && Object.keys(capsule.design_pillars).length > 0;
        const hasReferenceImages = !!capsule.reference_image_urls && capsule.reference_image_urls.length > 0;
        
        console.log(`[ImageService] Style capsule ${capsuleId} data:`, {
            hasDescriptorStrings,
            descriptorStringsLength: capsule.descriptor_strings?.length || 0,
            hasPillars,
            pillarCount: capsule.design_pillars ? Object.keys(capsule.design_pillars).length : 0,
            hasReferenceImages,
            referenceImageCount: capsule.reference_image_urls?.length || 0,
            referenceImageUrls: capsule.reference_image_urls || []
        });

        const descriptorStrings = capsule.descriptor_strings || '';
        const pillars = capsule.design_pillars 
            ? Object.entries(capsule.design_pillars).map(([k, v]) => `${k}: ${v}`).join('; ')
            : '';

        const textContext = [descriptorStrings, pillars].filter(Boolean).join('. ');
        
        console.log(`[ImageService] Generated text context (${textContext.length} chars):`, textContext);
        
        // Convert reference image URLs to ReferenceImage objects
        const referenceImages: ReferenceImage[] = (capsule.reference_image_urls || []).map(url => ({
            url: url,
            mimeType: undefined // Will be detected when downloading
        }));

        if (hasReferenceImages) {
            console.log(`[ImageService] Found ${referenceImages.length} reference image(s) - will be sent to API`);
        }

        return {
            textContext,
            referenceImages
        };
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
     * Create image generation job for global asset (not tied to a project)
     */
    async createGlobalAssetImageJob(request: CreateGlobalAssetImageJobRequest): Promise<ImageJobResult> {
        // Get asset details to determine aspect ratio
        const asset = await this.getAssetDetails(request.assetId);
        if (!asset) {
            throw new Error('Asset not found');
        }

        // Auto-determine aspect ratio based on asset type
        const dimensions = this.ASPECT_RATIOS[asset.asset_type];
        const width = request.width || dimensions.width;
        const height = request.height || dimensions.height;

        console.log(`[ImageService] Generating image for global asset ${request.assetId} (${asset.asset_type}): ${width}x${height}`);

        const jobId = uuidv4();

        // Create job record (project_id and branch_id will be null for global assets)
        // Note: This requires image_generation_jobs table to allow NULL for these fields
        const { data: job, error: insertError } = await supabase
            .from('image_generation_jobs')
            .insert({
                id: jobId,
                idempotency_key: request.idempotencyKey,
                project_id: null,
                branch_id: null,
                asset_id: request.assetId,
                job_type: 'master_asset',
                status: 'queued',
                prompt: request.prompt,
                visual_style_capsule_id: request.visualStyleCapsuleId,
                width,
                height,
                estimated_cost: this.provider.estimateCost({
                    prompt: request.prompt,
                    width,
                    height
                })
            })
            .select()
            .single();

        if (insertError || !job) {
            throw new Error(`Failed to create job: ${insertError?.message}`);
        }

        console.log(`[ImageService] Created global asset job ${jobId}, queued for execution`);

        // Execute in background
        this.executeGlobalAssetJobInBackground(jobId, request, width, height).catch(error => {
            console.error(`[ImageService] Background execution failed for global asset job ${jobId}:`, error);
        });

        return {
            jobId,
            status: 'queued'
        };
    }

    /**
     * Execute global asset image generation job
     */
    private async executeGlobalAssetJobInBackground(
        jobId: string,
        request: CreateGlobalAssetImageJobRequest,
        width: number,
        height: number
    ): Promise<void> {
        try {
            await this.updateJobState(jobId, 'processing', {
                processing_started_at: new Date().toISOString(),
                attempt_count: 1,
                last_attempt_at: new Date().toISOString()
            });

            // Get visual style context if provided
            let visualStyleContext: VisualStyleContext | null = null;
            if (request.visualStyleCapsuleId) {
                visualStyleContext = await this.getVisualStyleContext(request.visualStyleCapsuleId);
            }

            await this.updateJobState(jobId, 'generating', {
                generating_started_at: new Date().toISOString()
            });

            // Execute generation
            const result = await this.provider.generateImage({
                prompt: request.prompt,
                width,
                height,
                visualStyleContext: visualStyleContext?.textContext,
                referenceImages: visualStyleContext?.referenceImages
            });

            await this.updateJobState(jobId, 'uploading', {
                uploading_started_at: new Date().toISOString()
            });

            // Convert artifact to buffer
            const imageBuffer = await this.artifactToBuffer(result.artifact);

            // Build storage path for global asset
            const timestamp = Date.now();
            const random = Math.random().toString(36).substring(2, 9);
            const storagePath = `global/${request.userId}/${request.assetId}/${timestamp}_${random}.png`;

            // Upload to Supabase Storage
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

            // Update global_assets table with image URL and increment version
            const { data: globalAsset, error: assetFetchError } = await supabase
                .from('global_assets')
                .select('version')
                .eq('id', request.assetId)
                .single();

            if (assetFetchError || !globalAsset) {
                throw new Error('Failed to fetch global asset for update');
            }

            const { error: updateError } = await supabase
                .from('global_assets')
                .update({
                    image_key_url: urlData.publicUrl,
                    version: globalAsset.version + 1
                })
                .eq('id', request.assetId);

            if (updateError) {
                console.error(`[ImageService] Failed to update global_assets.image_key_url for asset ${request.assetId}:`, updateError);
            } else {
                console.log(`[ImageService] Updated global_assets.image_key_url for asset ${request.assetId}`);
            }

            // Update job with success
            await this.updateJobState(jobId, 'completed', {
                storage_path: storagePath,
                public_url: urlData.publicUrl,
                cost_credits: result.metadata.actualCost || result.metadata.estimatedCost,
                provider_metadata: result.providerRawResponse,
                completed_at: new Date().toISOString()
            });

            console.log(`[ImageService] Global asset job ${jobId} completed successfully`);

        } catch (error: any) {
            console.error(`[ImageService] Global asset job ${jobId} failed:`, error);

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

