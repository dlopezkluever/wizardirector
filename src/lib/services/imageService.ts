import { supabase } from '@/lib/supabase';
import { styleCapsuleService } from './styleCapsuleService';
import type { StyleCapsule } from '@/types/styleCapsule';

export interface ImageGenerationRequest {
  prompt: string;
  visualStyleCapsuleId?: string;
  projectId: string;
  stageNumber: number;
  assetId?: string;
  width?: number;
  height?: number;
}

export interface ImageGenerationResponse {
  imageUrl: string;
  generationId: string;
  prompt: string;
  visualStyleContext?: string;
}

class ImageService {
  /**
   * Generate an image using Nano Banana API with visual style injection
   */
  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    console.log('🎨 [ImageService] Creating image generation job...');

    // Generate idempotency key for this request
    const idempotencyKey = `${request.assetId || 'misc'}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Step 1: Get active branch ID
    const branchId = await this.getActiveBranchId(request.projectId);

    // Step 2: Create job (returns immediately)
    const createResponse = await fetch('/api/images/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        projectId: request.projectId,
        branchId,
        jobType: this.mapStageToJobType(request.stageNumber),
        prompt: request.prompt,
        visualStyleCapsuleId: request.visualStyleCapsuleId,
        width: request.width,
        height: request.height,
        assetId: request.assetId,
        idempotencyKey
      })
    });

    if (!createResponse.ok) {
      const error = await createResponse.json();
      throw new Error(error.error || 'Failed to create image generation job');
    }

    const { jobId } = await createResponse.json();

    console.log(`🎨 [ImageService] Job ${jobId} created, polling for completion...`);

    // Step 3: Poll for completion
    const result = await this.pollJobStatus(jobId, session.access_token);

    // Step 4: Log style capsule application
    if (request.visualStyleCapsuleId) {
      try {
        await styleCapsuleService.recordApplication({
          stage_state_id: `${request.projectId}_stage_${request.stageNumber}`,
          style_capsule_id: request.visualStyleCapsuleId,
          injection_context: {
            prompt: request.prompt,
            jobId: jobId
          }
        });
      } catch (error) {
        console.warn('Failed to record style capsule application:', error);
      }
    }

    return {
      imageUrl: result.publicUrl!,
      generationId: jobId,
      prompt: request.prompt
    };
  }

  /**
   * Poll job status until completion
   */
  private async pollJobStatus(
    jobId: string,
    accessToken: string,
    maxAttempts: number = 60, // 60 attempts = 60 seconds max
    intervalMs: number = 1000  // Poll every second
  ): Promise<any> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const response = await fetch(`/api/images/jobs/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch job status');
      }

      const job = await response.json();

      // Check terminal states
      if (job.status === 'completed') {
        console.log(`✅ [ImageService] Job ${jobId} completed`);
        return job;
      }

      if (job.status === 'failed') {
        throw new Error(`Image generation failed: ${job.error?.message || 'Unknown error'}`);
      }

      // Still processing, wait and retry
      console.log(`⏳ [ImageService] Job ${jobId} status: ${job.status}`);
      await this.sleep(intervalMs);
    }

    throw new Error('Image generation timed out');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private mapStageToJobType(stageNumber: number): string {
    if (stageNumber === 5) return 'master_asset';
    if (stageNumber === 10) return 'start_frame';
    return 'master_asset';
  }

  private async getActiveBranchId(projectId: string): Promise<string> {
    const { data: project } = await supabase
      .from('projects')
      .select('active_branch_id')
      .eq('id', projectId)
      .single();

    if (!project?.active_branch_id) {
      throw new Error('Project has no active branch');
    }

    return project.active_branch_id;
  }

  /**
   * Generate asset image keys for Stage 5
   */
  async generateAssetImageKey(
    projectId: string,
    assetDescription: string,
    visualStyleCapsuleId?: string
  ): Promise<ImageGenerationResponse> {
    const request: ImageGenerationRequest = {
      prompt: `Generate a visual reference image for: ${assetDescription}. This should be a clear, well-composed image suitable as a reference for AI video generation.`,
      visualStyleCapsuleId,
      projectId,
      stageNumber: 5,
      width: 512,
      height: 512
    };

    return this.generateImage(request);
  }

  /**
   * Generate frame anchors for Stage 10
   */
  async generateFrameAnchor(
    projectId: string,
    prompt: string,
    visualStyleCapsuleId: string,
    isStartFrame: boolean = true
  ): Promise<ImageGenerationResponse> {
    const frameType = isStartFrame ? 'start' : 'end';
    const enhancedPrompt = `${prompt}\n\nThis is the ${frameType} frame of an 8-second video shot. Ensure the composition and lighting are consistent with the visual style.`;

    const request: ImageGenerationRequest = {
      prompt: enhancedPrompt,
      visualStyleCapsuleId,
      projectId,
      stageNumber: 10,
      width: 1024,
      height: 576 // 16:9 aspect ratio
    };

    return this.generateImage(request);
  }

  /**
   * Inpaint/regenerate part of an image for continuity fixes
   */
  async inpaintImage(
    imageUrl: string,
    maskDescription: string,
    newContent: string,
    visualStyleCapsuleId?: string
  ): Promise<ImageGenerationResponse> {
    // TODO: Implement inpainting functionality
    // This would use Nano Banana's inpainting capabilities

    const prompt = `Inpaint the following area: ${maskDescription}. Replace with: ${newContent}. Maintain the overall composition and visual style.`;

    const request: ImageGenerationRequest = {
      prompt,
      visualStyleCapsuleId,
      projectId: 'unknown', // Would need to be passed in
      stageNumber: 10,
      width: 1024,
      height: 576
    };

    return this.generateImage(request);
  }
}

export const imageService = new ImageService();
