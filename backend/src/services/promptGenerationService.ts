/**
 * Prompt Generation Service
 *
 * LLM-based service to generate Frame Prompts and Video Prompts for Stage 9.
 * Frame Prompts: Visual, asset-heavy, spatially explicit for image generation.
 * Video Prompts: Action/audio focused, minimal visual description for Veo3/video generation.
 */

import { llmClient, type LLMRequest, LLMClientError } from './llm-client.js';
import type { StyleCapsule } from './styleCapsuleService.js';

export interface ShotData {
  id: string;
  shot_id: string;
  duration: number;
  dialogue: string;
  action: string;
  characters_foreground: string[];
  characters_background: string[];
  setting: string;
  camera: string;
  continuity_flags?: string[];
  beat_reference?: string;
}

export interface SceneAssetInstanceData {
  id: string;
  project_asset?: {
    id: string;
    name: string;
    asset_type: 'character' | 'prop' | 'location';
    description?: string;
  };
  description_override?: string | null;
  effective_description: string;
  status_tags: string[];
}

export interface GeneratedPromptSet {
  framePrompt: string;
  videoPrompt: string;
  requiresEndFrame: boolean;
  compatibleModels: string[];
}

export interface BulkPromptGenerationResult {
  shotId: string;
  success: boolean;
  framePrompt?: string;
  videoPrompt?: string;
  requiresEndFrame?: boolean;
  compatibleModels?: string[];
  error?: string;
}

const PROMPT_GENERATION_TIMEOUT_MS = 30000;
const DEFAULT_COMPATIBLE_MODELS = ['Veo3'];

/**
 * Build asset context for frame prompt generation
 */
function buildAssetContext(assets: SceneAssetInstanceData[]): string {
  if (!assets.length) return 'No scene assets available.';

  const characterAssets = assets.filter(a => a.project_asset?.asset_type === 'character');
  const locationAssets = assets.filter(a => a.project_asset?.asset_type === 'location');
  const propAssets = assets.filter(a => a.project_asset?.asset_type === 'prop');

  const parts: string[] = [];

  if (characterAssets.length) {
    parts.push('CHARACTERS:');
    characterAssets.forEach(a => {
      const tags = a.status_tags.length ? ` [${a.status_tags.join(', ')}]` : '';
      parts.push(`- ${a.project_asset?.name}${tags}: ${a.effective_description}`);
    });
  }

  if (locationAssets.length) {
    parts.push('\nLOCATIONS:');
    locationAssets.forEach(a => {
      parts.push(`- ${a.project_asset?.name}: ${a.effective_description}`);
    });
  }

  if (propAssets.length) {
    parts.push('\nPROPS:');
    propAssets.forEach(a => {
      parts.push(`- ${a.project_asset?.name}: ${a.effective_description}`);
    });
  }

  return parts.join('\n');
}

/**
 * Build style context from visual style capsule
 */
function buildStyleContext(styleCapsule?: StyleCapsule | null): string {
  if (!styleCapsule) return 'No visual style capsule applied.';

  const parts: string[] = ['VISUAL STYLE:'];

  if (styleCapsule.design_pillars) {
    const pillars = Object.entries(styleCapsule.design_pillars)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
    parts.push(`Design pillars: ${pillars}`);
  }

  if (styleCapsule.descriptor_strings) {
    parts.push(`Style: ${styleCapsule.descriptor_strings}`);
  }

  if (styleCapsule.style_labels?.length) {
    parts.push(`Labels: ${styleCapsule.style_labels.join(', ')}`);
  }

  if (styleCapsule.negative_constraints?.length) {
    parts.push(`Avoid: ${styleCapsule.negative_constraints.join(', ')}`);
  }

  return parts.join('\n');
}

/**
 * Determine if shot requires an end frame based on content
 */
function determineRequiresEndFrame(shot: ShotData): boolean {
  // Shots with significant movement or camera changes typically need end frames
  const cameraLower = shot.camera.toLowerCase();
  const hasMovement =
    cameraLower.includes('dolly') ||
    cameraLower.includes('track') ||
    cameraLower.includes('pan') ||
    cameraLower.includes('zoom') ||
    cameraLower.includes('crane') ||
    cameraLower.includes('steadicam');

  // Shots with dialogue often need end frames to show reaction/change
  const hasDialogue = shot.dialogue && shot.dialogue.trim().length > 0;

  // Shots longer than 8 seconds often need end frames
  const isLong = shot.duration > 8;

  // Static close-ups without dialogue may not need end frames
  const isStaticCU =
    (cameraLower.includes('cu') || cameraLower.includes('close')) &&
    cameraLower.includes('static') &&
    !hasDialogue;

  if (isStaticCU) return false;

  return hasMovement || hasDialogue || isLong;
}

/**
 * Determine compatible video generation models based on shot content
 */
function determineCompatibleModels(shot: ShotData, framePrompt: string): string[] {
  const models: string[] = ['Veo3']; // Veo3 is always compatible as our primary model

  // Check for features supported by other models
  const promptLength = framePrompt.length;
  const hasDialogue = shot.dialogue && shot.dialogue.trim().length > 0;

  // Runway Gen-3 supports most content but has stricter prompt length limits
  if (promptLength <= 500 && !hasDialogue) {
    models.push('Runway Gen-3');
  }

  // Kling supports longer content
  if (shot.duration <= 10) {
    models.push('Kling');
  }

  return models;
}

export class PromptGenerationService {
  /**
   * Generate frame and video prompts for a single shot
   */
  async generatePromptSet(
    shot: ShotData,
    sceneAssets: SceneAssetInstanceData[],
    styleCapsule?: StyleCapsule | null
  ): Promise<GeneratedPromptSet> {
    console.log(`[PromptGeneration] Generating prompts for shot ${shot.shot_id}`);

    const assetContext = buildAssetContext(sceneAssets);
    const styleContext = buildStyleContext(styleCapsule);

    // Generate frame prompt (visual/spatial focus)
    const framePrompt = await this.generateFramePrompt(shot, assetContext, styleContext);

    // Generate video prompt (action/audio focus)
    const videoPrompt = await this.generateVideoPrompt(shot, framePrompt);

    // Determine end frame requirement and model compatibility
    const requiresEndFrame = determineRequiresEndFrame(shot);
    const compatibleModels = determineCompatibleModels(shot, framePrompt);

    console.log(`[PromptGeneration] Generated prompts for shot ${shot.shot_id} (endFrame: ${requiresEndFrame})`);

    return {
      framePrompt,
      videoPrompt,
      requiresEndFrame,
      compatibleModels,
    };
  }

  /**
   * Generate prompts for multiple shots in a scene
   */
  async generateBulkPromptSets(
    shots: ShotData[],
    sceneAssets: SceneAssetInstanceData[],
    styleCapsule?: StyleCapsule | null
  ): Promise<BulkPromptGenerationResult[]> {
    console.log(`[PromptGeneration] Bulk generating prompts for ${shots.length} shots`);

    const results: BulkPromptGenerationResult[] = [];

    // Process shots sequentially to avoid rate limits
    for (const shot of shots) {
      try {
        const promptSet = await this.generatePromptSet(shot, sceneAssets, styleCapsule);
        results.push({
          shotId: shot.id,
          success: true,
          framePrompt: promptSet.framePrompt,
          videoPrompt: promptSet.videoPrompt,
          requiresEndFrame: promptSet.requiresEndFrame,
          compatibleModels: promptSet.compatibleModels,
        });
      } catch (error) {
        console.error(`[PromptGeneration] Failed to generate prompts for shot ${shot.shot_id}:`, error);
        results.push({
          shotId: shot.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`[PromptGeneration] Bulk generation complete: ${successCount}/${shots.length} successful`);

    return results;
  }

  /**
   * Generate frame prompt (visual, asset-heavy, spatially explicit)
   */
  private async generateFramePrompt(
    shot: ShotData,
    assetContext: string,
    styleContext: string
  ): Promise<string> {
    const systemPrompt = `You are a visual prompt engineer for AI image generation. Generate detailed, visually descriptive prompts that:
- Reference specific character appearances from provided asset descriptions
- Include precise camera specifications (shot type, angle, movement)
- Describe spatial composition and blocking
- Incorporate style capsule aesthetic directives
- Focus on the START frame moment (frozen visual snapshot)

Your output must be a single paragraph of prose, max 800 characters. No JSON, no headers.

ASSET DESCRIPTIONS:
${assetContext}

${styleContext}`;

    const userPrompt = `Generate a frame prompt for this shot:

Shot ID: ${shot.shot_id}
Duration: ${shot.duration} seconds
Action: ${shot.action}
Setting: ${shot.setting}
Camera: ${shot.camera}
Characters in foreground: ${shot.characters_foreground.join(', ') || 'None'}
Characters in background: ${shot.characters_background.join(', ') || 'None'}
Dialogue: ${shot.dialogue || 'None'}
Continuity notes: ${shot.continuity_flags?.join(', ') || 'None'}

Write a detailed visual description for the START frame of this shot. Reference character appearances from the asset descriptions above. Include camera specs, lighting, and spatial composition. Output ONLY the prompt text, no formatting.`;

    const response = await this.callLLM(systemPrompt, userPrompt, 'frame_prompt');
    return this.cleanPromptOutput(response, 1000);
  }

  /**
   * Generate video prompt (action/audio focused, minimal visual description)
   */
  private async generateVideoPrompt(
    shot: ShotData,
    framePrompt: string
  ): Promise<string> {
    const systemPrompt = `You are a video prompt engineer for AI video generation (Veo3). Generate prompts that:
- Focus on ACTION and MOTION, not static visual description
- Include precise dialogue with delivery instructions (whispered, shouted, etc.)
- Specify sound effects and ambient audio
- Describe character movements and interactions
- Assume anchor frames encode visual truth - DO NOT repeat visual descriptions

Follow Veo3 format: [Camera]. [Character] [Action]. Audio: [SFX]. "[Dialogue]"

Your output must be a single paragraph, max 600 characters. No JSON, no headers.`;

    const userPrompt = `Generate a video prompt for this shot. The visual appearance is already encoded in the frame prompt.

Shot ID: ${shot.shot_id}
Duration: ${shot.duration} seconds
Action: ${shot.action}
Camera: ${shot.camera}
Dialogue: ${shot.dialogue || 'None'}
Characters in foreground: ${shot.characters_foreground.join(', ') || 'None'}
Characters in background: ${shot.characters_background.join(', ') || 'None'}

Reference frame prompt (for context, don't repeat visuals):
"${framePrompt.substring(0, 200)}..."

Write a video generation prompt focusing on ACTION, MOTION, AUDIO, and DIALOGUE. The visual elements are already established. Output ONLY the prompt text, no formatting.`;

    const response = await this.callLLM(systemPrompt, userPrompt, 'video_prompt');
    return this.cleanPromptOutput(response, 800);
  }

  /**
   * Call LLM with retry and timeout
   */
  private async callLLM(
    systemPrompt: string,
    userPrompt: string,
    operation: string
  ): Promise<string> {
    const request: LLMRequest = {
      systemPrompt,
      userPrompt,
      temperature: 0.7,
      maxTokens: 1024,
      metadata: { operation, stage: 9 },
    };

    const response = await Promise.race([
      llmClient.generate(request),
      this.timeout(PROMPT_GENERATION_TIMEOUT_MS),
    ]);

    return response.content;
  }

  /**
   * Clean and validate prompt output
   */
  private cleanPromptOutput(content: string, maxLength: number): string {
    let cleaned = content.trim();

    // Remove markdown code blocks if present
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');

    // Remove any JSON wrapping
    try {
      const parsed = JSON.parse(cleaned);
      if (typeof parsed === 'string') cleaned = parsed;
      else if (parsed.prompt) cleaned = parsed.prompt;
      else if (parsed.framePrompt) cleaned = parsed.framePrompt;
      else if (parsed.videoPrompt) cleaned = parsed.videoPrompt;
    } catch {
      // Not JSON, use as-is
    }

    // Remove quotes if wrapped
    if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
      cleaned = cleaned.slice(1, -1);
    }

    // Truncate if too long
    if (cleaned.length > maxLength) {
      cleaned = cleaned.substring(0, maxLength - 3) + '...';
    }

    return cleaned;
  }

  /**
   * Timeout promise
   */
  private timeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Prompt generation timeout')), ms);
    });
  }
}

// Export singleton instance
export const promptGenerationService = new PromptGenerationService();
