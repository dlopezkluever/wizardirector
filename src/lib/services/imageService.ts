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

    // Build the enhanced prompt with visual style injection
    let enhancedPrompt = request.prompt;
    let visualStyleContext = '';

    if (request.visualStyleCapsuleId) {
      try {
        const capsule = await styleCapsuleService.getCapsule(request.visualStyleCapsuleId);
        visualStyleContext = styleCapsuleService.formatVisualStyleInjection(capsule);

        // Combine the asset prompt with visual style context
        enhancedPrompt = `${request.prompt}\n\nStyle: ${visualStyleContext}`;
      } catch (error) {
        console.warn('Failed to load visual style capsule:', error);
      }
    }

    // TODO: Replace with actual Nano Banana API call
    // For now, simulate the API call
    console.log('🎨 [ImageService] Generating image with prompt:', enhancedPrompt);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mock response - in real implementation, this would be the actual API response
    const mockImageUrl = `https://picsum.photos/${request.width || 512}/${request.height || 512}?random=${Date.now()}`;
    const generationId = `gen_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Log the style capsule application for audit trail
    if (request.visualStyleCapsuleId) {
      try {
        await styleCapsuleService.recordApplication({
          stage_state_id: `${request.projectId}_stage_${request.stageNumber}`,
          style_capsule_id: request.visualStyleCapsuleId,
          injection_context: {
            prompt: enhancedPrompt,
            generationId,
            assetId: request.assetId
          }
        });
      } catch (error) {
        console.warn('Failed to record style capsule application:', error);
      }
    }

    return {
      imageUrl: mockImageUrl,
      generationId,
      prompt: enhancedPrompt,
      visualStyleContext
    };
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
