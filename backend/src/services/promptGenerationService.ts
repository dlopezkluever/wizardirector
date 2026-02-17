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

export interface AngleVariantData {
  angle_type: string;
  image_url: string | null;
  status: string;
}

export interface SceneAssetInstanceData {
  id: string;
  project_asset?: {
    id: string;
    name: string;
    asset_type: 'character' | 'prop' | 'location';
    description?: string;
    image_key_url?: string;
  };
  description_override?: string | null;
  effective_description: string;
  status_tags: string[];
  image_key_url?: string;
  master_image_url?: string;
  carry_forward?: boolean;
  inherited_from_instance_id?: string;
  angle_variants?: AngleVariantData[];
  matched_angle_url?: string;
}

export interface ReferenceImageOrderEntry {
  label: string;
  assetName: string;
  url: string;
  type: string;
}

export interface GeneratedPromptSet {
  framePrompt: string;
  videoPrompt: string;
  requiresEndFrame: boolean;
  compatibleModels: string[];
  referenceImageOrder: ReferenceImageOrderEntry[];
}

export interface BulkPromptGenerationResult {
  shotId: string;
  success: boolean;
  framePrompt?: string;
  videoPrompt?: string;
  requiresEndFrame?: boolean;
  compatibleModels?: string[];
  referenceImageOrder?: ReferenceImageOrderEntry[];
  error?: string;
}

const PROMPT_GENERATION_TIMEOUT_MS = 30000;
const DEFAULT_COMPATIBLE_MODELS = ['Veo3'];

/**
 * 3C.2: Map a shot's camera angle text to the best matching asset angle variant.
 * Parses the free-text camera field to extract the angle component, then maps it
 * to the closest available angle variant for reference image selection.
 */
export function mapCameraToAngleType(camera: string): string {
  const lower = camera.toLowerCase();

  if (lower.includes('profile') || lower.includes('side')) return 'side';
  if (lower.includes('three-quarter') || lower.includes('3/4') || lower.includes('three quarter')) return 'three_quarter';
  if (lower.includes('behind') || lower.includes('over-the-shoulder') || lower.includes('over the shoulder') || lower.includes('back') || lower.includes('rear')) return 'back';

  // Default: front-facing (covers eye-level, low-angle, high-angle, dutch, bird's-eye)
  return 'front';
}

/**
 * 3C.2: Enrich scene assets with angle-matched reference URLs for a given shot camera.
 * For each character asset with angle variants, select the best matching angle
 * variant image based on the shot's camera angle.
 */
export function enrichAssetsWithAngleMatch(
  assets: SceneAssetInstanceData[],
  shotCamera: string
): SceneAssetInstanceData[] {
  const targetAngle = mapCameraToAngleType(shotCamera);

  return assets.map(asset => {
    if (
      asset.project_asset?.asset_type !== 'character' ||
      !asset.angle_variants?.length
    ) {
      return asset;
    }

    // Find the target angle variant, fall back to front
    const match =
      asset.angle_variants.find(v => v.angle_type === targetAngle && v.status === 'completed' && v.image_url) ||
      asset.angle_variants.find(v => v.angle_type === 'front' && v.status === 'completed' && v.image_url);

    return {
      ...asset,
      matched_angle_url: match?.image_url ?? undefined,
    };
  });
}

/**
 * 4D.2: Build a numbered image manifest for the LLM system prompt and an ordered
 * list of reference images for the image generation API.
 *
 * Sorts assets: characters → locations → props.
 * For each asset with an image, picks the best URL:
 *   matched_angle_url > image_key_url (scene instance) > master_image_url
 */
export function buildNumberedImageManifest(
  assets: SceneAssetInstanceData[]
): { manifest: string; imageOrder: ReferenceImageOrderEntry[] } {
  const sortOrder: Record<string, number> = { character: 0, location: 1, prop: 2 };
  const sorted = [...assets].sort((a, b) => {
    const aOrder = sortOrder[a.project_asset?.asset_type ?? 'prop'] ?? 2;
    const bOrder = sortOrder[b.project_asset?.asset_type ?? 'prop'] ?? 2;
    return aOrder - bOrder;
  });

  const imageOrder: ReferenceImageOrderEntry[] = [];
  let index = 1;

  for (const asset of sorted) {
    const url = asset.matched_angle_url || asset.image_key_url || asset.master_image_url;
    if (!url) continue;

    const name = asset.project_asset?.name ?? 'Unknown';
    const type = asset.project_asset?.asset_type ?? 'unknown';
    imageOrder.push({
      label: `Image #${index}`,
      assetName: name,
      url,
      type,
    });
    index++;
  }

  if (imageOrder.length === 0) {
    return { manifest: '', imageOrder: [] };
  }

  const lines = imageOrder.map(entry => `${entry.label}: ${entry.assetName} (${entry.type})`);
  const manifest = `REFERENCE IMAGES (attached alongside this prompt during image generation):\n${lines.join('\n')}`;

  return { manifest, imageOrder };
}

/**
 * Build rich asset context for frame prompt generation.
 * Groups by type, includes inheritance chain info, image reference indicators,
 * effective descriptions, and status tags for guide-compliant prompts.
 */
function buildAssetContext(assets: SceneAssetInstanceData[]): string {
  if (!assets.length) return 'No scene assets available.';

  const characterAssets = assets.filter(a => a.project_asset?.asset_type === 'character');
  const locationAssets = assets.filter(a => a.project_asset?.asset_type === 'location');
  const propAssets = assets.filter(a => a.project_asset?.asset_type === 'prop');

  const parts: string[] = [];

  const formatAssetEntry = (a: SceneAssetInstanceData): string => {
    const name = a.project_asset?.name ?? 'Unknown';
    const tags = a.status_tags.length ? ` [${a.status_tags.join(', ')}]` : '';

    // Inheritance indicators
    const inheritanceNotes: string[] = [];
    if (a.inherited_from_instance_id) inheritanceNotes.push('inherited');
    if (a.carry_forward) inheritanceNotes.push('carry_forward');
    const inheritanceStr = inheritanceNotes.length ? ` [${inheritanceNotes.join(', ')}]` : '';

    // Image reference indicators (3C.2: angle-matched reference takes priority)
    const hasAngleRef = !!a.matched_angle_url;
    const hasSceneRef = !!a.image_key_url;
    const hasMasterRef = !!a.master_image_url;
    let refNote = '';
    if (hasAngleRef) refNote = ' Angle-matched reference image available.';
    else if (hasSceneRef) refNote = ' Scene reference image available.';
    else if (hasMasterRef) refNote = ' Master reference image available.';

    return `- ${name}${inheritanceStr}${tags}: ${a.effective_description}${refNote}`;
  };

  if (characterAssets.length) {
    parts.push('CHARACTERS:');
    characterAssets.forEach(a => parts.push(formatAssetEntry(a)));
  }

  if (locationAssets.length) {
    parts.push('\nLOCATIONS:');
    locationAssets.forEach(a => parts.push(formatAssetEntry(a)));
  }

  if (propAssets.length) {
    parts.push('\nPROPS:');
    propAssets.forEach(a => parts.push(formatAssetEntry(a)));
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

    // 3C.2: Enrich assets with angle-matched reference URLs based on shot camera
    const enrichedAssets = enrichAssetsWithAngleMatch(sceneAssets, shot.camera);
    const assetContext = buildAssetContext(enrichedAssets);
    const styleContext = buildStyleContext(styleCapsule);

    // 4D.2: Build numbered image manifest for LLM context + API reference ordering
    const { manifest: imageManifest, imageOrder: referenceImageOrder } = buildNumberedImageManifest(enrichedAssets);
    if (referenceImageOrder.length > 0) {
      console.log(`[PromptGeneration] Built image manifest with ${referenceImageOrder.length} reference(s) for shot ${shot.shot_id}`);
    }

    // Generate frame prompt (visual/spatial focus)
    const framePrompt = await this.generateFramePrompt(shot, assetContext, styleContext, imageManifest);

    // Generate video prompt (action/audio focus)
    const videoPrompt = await this.generateVideoPrompt(shot, framePrompt);

    // Determine end frame requirement and model compatibility
    const requiresEndFrame = determineRequiresEndFrame(shot);
    const compatibleModels = determineCompatibleModels(shot, framePrompt);

    console.log(`[PromptGeneration] Generated prompts for shot ${shot.shot_id} (endFrame: ${requiresEndFrame}, refs: ${referenceImageOrder.length})`);

    return {
      framePrompt,
      videoPrompt,
      requiresEndFrame,
      compatibleModels,
      referenceImageOrder,
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
          referenceImageOrder: promptSet.referenceImageOrder,
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
   * Follows the Veo 3.1 Frame Prompt 5-part formula:
   * [Camera Position & Framing] + [Subject Appearance] + [Spatial Placement & Pose] + [Environment & Props] + [Lighting, Color & Style]
   */
  private async generateFramePrompt(
    shot: ShotData,
    assetContext: string,
    styleContext: string,
    imageManifest: string = ''
  ): Promise<string> {
    const systemPrompt = `You are a visual prompt engineer for AI image generation (starting frames for Veo 3.1 video pipeline).

YOUR TASK: Generate a single dense paragraph describing a FROZEN VISUAL SNAPSHOT — the starting frame of a shot. This is a PHOTOGRAPH, not a video. There is NO action, NO dialogue, NO sound, NO movement.

STRUCTURE your output following this 5-part formula IN ORDER:
1. CAMERA POSITION & FRAMING: Shot type (EWS/WS/MS/MCU/CU/ECU), camera angle (eye-level/low-angle/high-angle/Dutch/bird's-eye), lens characteristics (depth of field, focal plane). Do NOT include camera movement (no pan, dolly, track — those go in the video prompt).
2. SUBJECT APPEARANCE: Full physical description of each visible character using the asset descriptions below. Include face, hair, build, clothing, accessories, posture. Copy-paste character details verbatim from assets — consistency is critical.
3. SPATIAL PLACEMENT & POSE: Where each subject/object sits in frame (frame-left, center, foreground, background). Body orientation relative to camera, hand positions, eye-line direction, weight distribution. Static poses only.
4. ENVIRONMENT & PROPS: Location details, architecture, furniture, surfaces, props with positions, depth layers (foreground/midground/background), atmospheric visuals (dust, fog, rain on glass), time-of-day cues.
5. LIGHTING, COLOR & STYLE: Key light direction and quality, fill/rim light, practical lights, color palette, contrast, film stock/aesthetic, overall visual mood.

RULES:
- NO action verbs, NO dialogue, NO sound, NO movement — this is a still image
- Reference character appearances EXACTLY from the asset descriptions
- If a character has a reference image noted, describe them with extra precision
- Output ONLY the prompt text as a single paragraph, max 1200 characters
- No JSON, no headers, no formatting

ASSET DESCRIPTIONS:
${assetContext}

${styleContext}${imageManifest ? `

${imageManifest}

IMPORTANT: The reference images above will be attached during generation. Write vivid descriptions INFORMED by knowing these refs exist. Do NOT include "Image #N" in your output text.` : ''}`;

    // Extract static camera info (shot type + angle) vs movement for routing guidance
    const userPrompt = `Generate a STARTING FRAME prompt for this shot:

Shot: ${shot.shot_id} | Duration: ${shot.duration}s
Action context (for understanding the moment, NOT for inclusion): ${shot.action}
Setting: ${shot.setting}
Camera (extract STATIC position — shot type, angle, lens — ignore any movement): ${shot.camera}
Foreground characters: ${shot.characters_foreground.join(', ') || 'None'}
Background characters: ${shot.characters_background.join(', ') || 'None'}
Continuity notes: ${shot.continuity_flags?.join(', ') || 'None'}

Camera split guidance: Camera POSITION (shot type, angle, lens) goes here in the frame prompt. Camera MOVEMENT (pan, dolly, track) belongs in the video prompt only.

Write the frame prompt as a single dense paragraph. Describe ONLY what a viewer would see in a freeze-frame. Output ONLY the prompt text.`;

    const response = await this.callLLM(systemPrompt, userPrompt, 'frame_prompt');
    return this.cleanPromptOutput(response, 1200);
  }

  /**
   * Generate video prompt (action/audio focused, NO visual description)
   * Follows the Veo 3.1 Video Prompt formula:
   * [Camera Movement] + [Action/Performance] + [Dialogue] + [Sound Design]
   */
  private async generateVideoPrompt(
    shot: ShotData,
    framePrompt: string
  ): Promise<string> {
    const systemPrompt = `You are a video prompt engineer for Veo 3.1 frame-to-video generation.

THE STARTING FRAME ALREADY ENCODES ALL VISUAL TRUTH. Do NOT describe what anyone looks like, what the environment looks like, what the lighting is, or what colors are present. The frame image handles all of that.

YOUR TASK: Generate a lean prompt describing ONLY what HAPPENS when you press play.

STRUCTURE your output following this 4-part formula:
1. CAMERA MOVEMENT: How the camera moves (static, pan, dolly in/out, truck, crane, handheld, steadicam, arc, rack focus). If no movement, state "Static camera." Do NOT repeat shot type or angle — that's in the frame.
2. ACTION / PERFORMANCE: What subjects DO — physical movement, facial performance shifts, gestures, body language, interactions. Use verbs and behaviors, not appearances. One major action per shot.
3. DIALOGUE: Exact words in quotes with speaker ID. Include voice direction: accent, tone, pitch, pace, emotion, delivery style (whispered, shouted, deadpan, trembling). If no dialogue, omit.
4. SOUND DESIGN: SFX tied to actions (door slam, footsteps on gravel). Ambient audio (rain, traffic, wind). Musical cues if relevant. Note silence explicitly if the beat should be quiet.

RULES:
- NO character appearance descriptions (face, hair, clothing, build)
- NO environment descriptions (room, furniture, architecture)
- NO lighting or color palette mentions
- NO film stock or aesthetic mentions
- Keep it lean — max 500 characters
- Output a single paragraph, no JSON, no headers`;

    const userPrompt = `Generate a VIDEO prompt for this shot. Visual truth is locked in the starting frame.

Shot: ${shot.shot_id} | Duration: ${shot.duration}s
Action: ${shot.action}
Camera (extract MOVEMENT only — ignore shot type/angle): ${shot.camera}
Dialogue: ${shot.dialogue || 'None'}
Foreground characters: ${shot.characters_foreground.join(', ') || 'None'}
Background characters: ${shot.characters_background.join(', ') || 'None'}

Camera split guidance: Camera MOVEMENT (pan, dolly, track, crane) goes here. Camera POSITION (shot type, angle, lens) is already in the frame.

Write the video prompt. Focus on action, movement, dialogue delivery, and sound. Output ONLY the prompt text.`;

    const response = await this.callLLM(systemPrompt, userPrompt, 'video_prompt');
    return this.cleanPromptOutput(response, 500);
  }

  /**
   * Generate an end frame prompt for a shot.
   * Describes the frozen end-state: same camera, same characters (only pose/expression changes),
   * references the start frame prompt as "before" state, shot action as "what happened".
   */
  async generateEndFramePrompt(
    shot: ShotData,
    startFramePrompt: string,
    sceneAssets: SceneAssetInstanceData[],
    styleCapsule?: StyleCapsule | null
  ): Promise<string> {
    console.log(`[PromptGeneration] Generating end frame prompt for shot ${shot.shot_id}`);

    const enrichedAssets = enrichAssetsWithAngleMatch(sceneAssets, shot.camera);
    const assetContext = buildAssetContext(enrichedAssets);
    const styleContext = buildStyleContext(styleCapsule);

    const systemPrompt = `You are a visual prompt engineer for AI image generation (end frames for Veo 3.1 video pipeline).

YOUR TASK: Generate a single dense paragraph describing a FROZEN VISUAL SNAPSHOT — the END frame of a shot. This is a PHOTOGRAPH, not a video. There is NO action, NO dialogue, NO sound, NO movement.

This end frame shows the RESULT of the action that occurred during the shot. Same camera position, same characters — only their poses, expressions, and positions have changed.

CONTEXT:
- The START frame prompt (below) describes how the shot BEGAN
- The shot action describes WHAT HAPPENED during the shot
- The shot duration tells you HOW LONG the action took
- Your job is to describe the RESULTING end state

RULES:
- Same camera position and framing as the start frame
- Same characters, same clothing, same environment
- Only change: poses, expressions, positions, and effects of the action
- NO action verbs, NO dialogue, NO sound, NO movement — this is a still image
- Reference character appearances EXACTLY from the asset descriptions
- Output ONLY the prompt text as a single paragraph, max 1200 characters
- No JSON, no headers, no formatting

ASSET DESCRIPTIONS:
${assetContext}

${styleContext}`;

    const userPrompt = `Generate an END FRAME prompt for this shot:

Shot: ${shot.shot_id} | Duration: ${shot.duration}s
Camera: ${shot.camera}
Action that occurred: ${shot.action}
Dialogue that was spoken: ${shot.dialogue || 'None'}
Foreground characters: ${shot.characters_foreground.join(', ') || 'None'}
Background characters: ${shot.characters_background.join(', ') || 'None'}

START FRAME (the "before" state):
${startFramePrompt}

Describe the RESULTING end state — what does the scene look like AFTER the action is complete? Same camera, same environment, only poses/expressions/positions changed. Output ONLY the prompt text.`;

    const response = await this.callLLM(systemPrompt, userPrompt, 'end_frame_prompt');
    return this.cleanPromptOutput(response, 1200);
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
