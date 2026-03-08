/**
 * Shot Extraction Service
 *
 * LLM-based service to extract shots from scene script content.
 * Follows sceneDependencyExtraction.ts structure.
 * Used in Stage 7 to break a scene into 8-second atomic shots.
 */

import { llmClient, type LLMRequest, LLMClientError } from './llm-client.js';
import { parseCameraMetadata } from './promptGenerationService.js';

export interface TransformationFlag {
  characterName: string;
  type: 'instant' | 'within_shot' | 'gradual';
  description: string;
  isTrigger: boolean;
  isCompletion?: boolean;
}

export interface ExtractedShot {
  shotId: string;
  shotOrder: number;
  duration: number;
  dialogue: string;
  action: string;
  charactersForeground: string[];
  charactersBackground: string[];
  setting: string;
  camera: string;
  // 3.7 Phase D: Structured camera metadata
  camera_distance?: 'wide' | 'medium' | 'close';
  camera_height?: 'eye_level' | 'high_angle' | 'low_angle' | 'overhead' | 'ground_level';
  camera_movement?: string;
  camera_direction_name?: string; // direction name assigned by LLM (e.g., "direction_1")
  continuityFlags: string[];
  beatReference?: string;
  transformationFlags?: TransformationFlag[];
}

interface LLMShotCharacter {
  name: string;
  prominence: 'foreground' | 'background' | 'off-screen';
}

interface LLMTransformationFlag {
  character_name: string;
  type: 'instant' | 'within_shot' | 'gradual';
  description: string;
  is_trigger: boolean;
  is_completion?: boolean;
}

interface LLMShotRaw {
  shot_order: number;
  duration?: number;
  dialogue?: string | null;
  action: string;
  characters?: LLMShotCharacter[];
  setting: string;
  camera: string;
  // 3.7 Phase D: Structured camera metadata from LLM
  camera_distance?: 'wide' | 'medium' | 'close';
  camera_height?: 'eye_level' | 'high_angle' | 'low_angle' | 'overhead' | 'ground_level';
  camera_movement?: string;
  camera_direction?: string; // direction name: "direction_1", "direction_2", etc.
  continuity_flags?: string[];
  beat_reference?: string;
  transformation_flags?: LLMTransformationFlag[];
}

export interface LocationDirectionContext {
  name: string;
  alias?: string;
  description?: string;
}

export interface NewDirectionRaw {
  name: string;
  alias?: string;
  description?: string;
}

export interface ShotExtractionResult {
  shots: ExtractedShot[];
  newDirections: NewDirectionRaw[];
}

interface ExtractionContext {
  priorSceneEndState?: string | null;
  beatSheetSummary?: string;
  masterScriptSummary?: string;
  // 3.7 Phase D: Available location directions for this scene's location
  locationDirections?: LocationDirectionContext[];
  locationName?: string;
}

const SHOT_EXTRACTION_TIMEOUT_MS = 20000;
const REQUIRED_STRING_FIELDS = ['action', 'setting', 'camera'] as const;
const DEFAULT_DURATION = 8;

/**
 * Generate shot ID in format {sceneNumber}{Letter} (e.g. 1A, 1B, 2A).
 * Letters reset per scene; supports >26 shots (AA, AB, ...).
 */
export function generateShotId(sceneNumber: number, shotIndex: number): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let id = '';
  let index = shotIndex;
  while (index >= 0) {
    id = letters[index % 26] + id;
    index = Math.floor(index / 26) - 1;
  }
  return `${sceneNumber}${id}`;
}

function buildGlobalContextSection(ctx: ExtractionContext | undefined): string {
  if (!ctx) return 'No global context available.';
  const parts: string[] = [];
  if (ctx.masterScriptSummary) {
    parts.push(`MASTER SCRIPT SUMMARY:\n${ctx.masterScriptSummary}`);
  }
  if (ctx.beatSheetSummary) {
    parts.push(`BEAT SHEET:\n${ctx.beatSheetSummary}`);
  }
  if (parts.length === 0) return 'No global context available.';
  return parts.join('\n\n');
}

function buildCameraDirectionsSection(ctx: ExtractionContext | undefined): string {
  if (!ctx?.locationDirections || ctx.locationDirections.length === 0) {
    return '';
  }
  const lines = ctx.locationDirections.map(d => {
    let line = `  - ${d.name}`;
    if (d.alias) line += ` (alias: '${d.alias}')`;
    if (d.description) line += `: ${d.description}`;
    return line;
  });
  return `\nCAMERA DIRECTION CONTEXT:
Location: ${ctx.locationName || 'Unknown'}
Available camera directions:
${lines.join('\n')}

For each shot, assign "camera_direction" to the most appropriate direction name above based on where the camera would be facing given the action. If none of the above directions fit a shot, you may propose a NEW direction by setting camera_direction to a new name like "direction_3", "direction_4", etc. and provide camera_direction_alias and camera_direction_description for any new direction you propose.`;
}

function buildNoDirectionsSection(ctx: ExtractionContext | undefined): string {
  if (!ctx?.locationName) return '';
  if (ctx.locationDirections && ctx.locationDirections.length > 0) return '';
  return `\nCAMERA DIRECTION CREATION:
No camera directions exist for location "${ctx.locationName}". Analyze the scene narrative and CREATE directions by assigning a camera_direction name (e.g., "direction_1", "direction_2") to each shot. For each new direction you create, provide camera_direction_alias (short label like "stove wall", "window side") and camera_direction_description (what this view shows). Group shots that face the same direction under the same direction name.`;
}

function buildPreviousSceneSection(ctx: ExtractionContext | undefined): string {
  if (!ctx?.priorSceneEndState || ctx.priorSceneEndState.trim() === '') {
    return 'No previous scene (this is the first scene).';
  }
  return ctx.priorSceneEndState;
}

function mapCharactersToForegroundBackground(
  characters: LLMShotCharacter[] | undefined
): { foreground: string[]; background: string[] } {
  const foreground: string[] = [];
  const background: string[] = [];
  if (!Array.isArray(characters)) return { foreground, background };
  for (const c of characters) {
    const name = typeof c.name === 'string' ? c.name.trim() : '';
    if (!name) continue;
    const prom = (c.prominence || '').toLowerCase();
    if (prom === 'foreground') foreground.push(name);
    else if (prom === 'background' || prom === 'off-screen') background.push(name);
    else foreground.push(name); // default to foreground
  }
  return { foreground, background };
}

function validateShot(raw: LLMShotRaw, index: number): boolean {
  for (const field of REQUIRED_STRING_FIELDS) {
    const v = (raw as any)[field];
    if (typeof v !== 'string' || v.trim() === '') return false;
  }
  const duration = raw.duration;
  if (duration != null && (typeof duration !== 'number' || duration < 1 || duration > 30)) {
    return false;
  }
  return true;
}

export class ShotExtractionService {
  /**
   * Extract shots from scene script using LLM.
   * Uses 20s timeout; returns empty array on timeout/rate limit; validates and discards invalid shots.
   */
  async extractShots(
    sceneId: string,
    scriptExcerpt: string,
    sceneNumber: number,
    context?: ExtractionContext
  ): Promise<ShotExtractionResult> {
    console.log(`[ShotExtraction] Extracting shots for scene ${sceneId} (scene #${sceneNumber})`);

    const globalContextPackage = buildGlobalContextSection(context);
    const previousSceneEndState = buildPreviousSceneSection(context);
    const cameraDirectionsSection = buildCameraDirectionsSection(context);
    const noDirectionsSection = buildNoDirectionsSection(context);

    const systemPrompt = `You are a technical shot breakdown specialist for an AI video generation pipeline. Your role is to translate narrative scenes into precise, time-bounded shots that feed directly into image and video generation models. Precision in your descriptions directly determines output quality.

GLOBAL CONTEXT:
${globalContextPackage}

CURRENT SCENE CONTEXT:
Scene ID: ${sceneId}
Scene Number: ${sceneNumber}
Scene Content will be provided in the user message.

PREVIOUS SCENE END-STATE (LOCAL CONTEXT):
${previousSceneEndState}
${cameraDirectionsSection}${noDirectionsSection}

SHOT BREAKDOWN RULES:
1. Each shot must be EXACTLY 8 seconds (or explicitly justified if different — use 4-6s for complex action).
2. Each shot must be ATOMIC (one primary action or dialogue exchange).
3. Camera specs must be technically precise with THREE components: SHOT_TYPE - ANGLE - MOVEMENT (e.g., "MS - Eye Level - Static", "CU - Low Angle - Slow Dolly In", "WS - High Angle - Slow Pan Right").
4. Character prominence must be explicit: use "foreground", "background", or "off-screen" for each character.

SHOT DESCRIPTION QUALITY REQUIREMENTS:
The "action" field must describe what a VIEWER WOULD SEE, not narrate story beats. It feeds image and video generation — precision matters.
- Include character blocking and positioning (who is where in the frame — foreground, midground, background)
- Include body language and emotional state visible in performance (e.g., "shoulders tense, jaw clenched" not just "angry")
- Include environmental/atmospheric details relevant to the shot (rain streaking windows, dust motes in light, steam rising)
- Include lighting cues when implied by script (e.g., "warm golden light streams through the window", "a single overhead lamp casts harsh shadows")
- Include spatial relationships between characters and objects (e.g., "facing each other across a narrow table", "silhouetted against the doorway")
- Do NOT write vague actions like "they talk" — describe the physical performance

The "camera" field must specify all three components:
- Shot type: EWS, WS, MS, MCU, CU, ECU
- Angle: Eye Level, Low Angle, High Angle, Bird's Eye, Dutch Angle, Worm's Eye
- Movement: Static, Slow Dolly In, Slow Pan Left, Truck Right, Crane Up, Handheld, Steadicam, etc.
- Include framing notes when relevant (e.g., "subject frame-left, looking frame-right")

STRUCTURED CAMERA METADATA:
In addition to the free-text "camera" field, you MUST output these structured fields for each shot:
- "camera_distance": "wide" | "medium" | "close" (derived from shot type: EWS/WS/FS→wide, MS→medium, MCU/CU/ECU→close)
- "camera_height": "eye_level" | "high_angle" | "low_angle" | "overhead" | "ground_level" (derived from angle)
- "camera_movement": free-text movement descriptor (e.g., "static", "slow_dolly_in", "pan_right")
- "camera_direction": the direction name this shot faces (e.g., "direction_1", "direction_2"). See CAMERA DIRECTION sections above.

CONTINUITY REQUIREMENTS:
- The first shot must visually connect to the previous scene's end state if there is one.
- Character positions and states must be consistent with prior scene endings.
- Setting must match or explicitly transition.

TRANSFORMATION DETECTION:
If a character/asset undergoes a VISUAL TRANSFORMATION in this scene (costume change, physical transformation, injury, disguise, magical change, etc.), flag it:
- Set transformation_flags on the shot where the change occurs
- Types: "instant" (cut-based, change happens between shots), "within_shot" (on-camera transformation during the shot), "gradual" (spans multiple shots)
- For gradual: mark is_trigger=true on the start shot, is_completion=true on the end shot
- Only flag genuine visual appearance changes, not emotional shifts or dialogue changes

OUTPUT: Return ONLY a valid JSON object with this exact structure (no markdown, no extra text):
{
  "new_directions": [{"name": "direction_1", "alias": "stove wall", "description": "Kitchen seen from stove side"}],
  "shots": [
    {
      "shot_order": 0,
      "duration": 8,
      "dialogue": "exact lines or empty string",
      "action": "Detailed description: character positions and blocking, movement, body language, emotional state, environmental details, lighting cues if relevant",
      "characters": [{"name": "CHARACTER_NAME", "prominence": "foreground"|"background"|"off-screen"}],
      "setting": "specific location with atmosphere and spatial details",
      "camera": "SHOT_TYPE - ANGLE - MOVEMENT (e.g., MS - Eye Level - Static)",
      "camera_distance": "wide"|"medium"|"close",
      "camera_height": "eye_level"|"high_angle"|"low_angle"|"overhead"|"ground_level",
      "camera_movement": "static",
      "camera_direction": "direction_1",
      "camera_direction_alias": "optional: alias for NEW directions only",
      "camera_direction_description": "optional: description for NEW directions only",
      "continuity_flags": ["optional strings"],
      "beat_reference": "optional beat id",
      "transformation_flags": [{"character_name": "NAME", "type": "instant|within_shot|gradual", "description": "what changes visually", "is_trigger": true, "is_completion": false}]
    }
  ]
}
IMPORTANT: The "new_directions" array should contain ONLY directions you are creating that don't already exist. If directions already exist (listed above), do NOT include them in new_directions — just reference them by name in camera_direction. If no new directions are needed, set new_directions to an empty array.`;

    const userPrompt = `Extract the shot list for this scene. Scene number: ${sceneNumber}.

SCENE CONTENT:
${scriptExcerpt || '(No content)'}

Return ONLY the JSON object with a "shots" array. Each shot must have action, setting, and camera as non-empty strings. Use duration 8 unless justified.`;

    let responseContent: string;
    try {
      responseContent = await Promise.race([
        this.extractWithLLM(systemPrompt, userPrompt),
        this.timeout(SHOT_EXTRACTION_TIMEOUT_MS)
      ]);
    } catch (error) {
      if (error instanceof Error && error.message === 'Extraction timeout') {
        console.warn(`[ShotExtraction] Timeout after ${SHOT_EXTRACTION_TIMEOUT_MS / 1000}s for scene ${sceneId}`);
        return { shots: [], newDirections: [] };
      }
      if (error instanceof LLMClientError && error.code === 'RATE_LIMIT') {
        console.warn(`[ShotExtraction] Rate limit exceeded for scene ${sceneId}`);
        throw error; // Caller can show user message
      }
      throw error;
    }

    let parsed: { shots: LLMShotRaw[]; new_directions?: NewDirectionRaw[] };
    try {
      parsed = this.parseResponse(responseContent);
    } catch {
      console.warn(`[ShotExtraction] Malformed JSON for scene ${sceneId}, retrying with simpler prompt`);
      try {
        const retryContent = await this.extractWithLLM(
          'You extract a shot list from screenplay text. Return ONLY valid JSON: {"new_directions":[],"shots":[{"shot_order":0,"duration":8,"dialogue":"","action":"","characters":[],"setting":"","camera":"","camera_distance":"medium","camera_height":"eye_level","camera_movement":"static","camera_direction":"direction_1","continuity_flags":[]}]}. Each shot needs non-empty action, setting, camera.',
          userPrompt
        );
        parsed = this.parseResponse(retryContent);
      } catch (retryErr) {
        console.error('[ShotExtraction] Retry failed:', retryErr);
        return { shots: [], newDirections: [] };
      }
    }
    if (!parsed.shots || !Array.isArray(parsed.shots)) {
      console.warn('[ShotExtraction] No shots array in response');
      return { shots: [], newDirections: [] };
    }

    // Collect new directions proposed by the LLM
    const newDirections: NewDirectionRaw[] = [];
    if (Array.isArray(parsed.new_directions)) {
      for (const nd of parsed.new_directions) {
        if (nd.name && typeof nd.name === 'string') {
          newDirections.push({
            name: nd.name.trim(),
            alias: typeof nd.alias === 'string' ? nd.alias.trim() : undefined,
            description: typeof nd.description === 'string' ? nd.description.trim() : undefined,
          });
        }
      }
    }

    // Also collect inline new directions from shots (camera_direction_alias/description)
    const inlineDirectionNames = new Set(newDirections.map(d => d.name));
    const existingDirNames = new Set((context?.locationDirections || []).map(d => d.name));
    for (const raw of parsed.shots) {
      const dirName = typeof raw.camera_direction === 'string' ? raw.camera_direction.trim() : '';
      if (dirName && !existingDirNames.has(dirName) && !inlineDirectionNames.has(dirName)) {
        const alias = (raw as any).camera_direction_alias;
        const desc = (raw as any).camera_direction_description;
        newDirections.push({
          name: dirName,
          alias: typeof alias === 'string' ? alias.trim() : undefined,
          description: typeof desc === 'string' ? desc.trim() : undefined,
        });
        inlineDirectionNames.add(dirName);
      }
    }

    const validated: ExtractedShot[] = [];
    for (let i = 0; i < parsed.shots.length; i++) {
      const raw = parsed.shots[i] as LLMShotRaw;
      if (!validateShot(raw, i)) {
        console.warn(`[ShotExtraction] Discarding invalid shot at index ${i}: missing or invalid required fields`);
        continue;
      }
      const { foreground, background } = mapCharactersToForegroundBackground(raw.characters);
      // Parse transformation flags with safe defaults
      let transformationFlags: TransformationFlag[] | undefined;
      if (Array.isArray(raw.transformation_flags) && raw.transformation_flags.length > 0) {
        transformationFlags = raw.transformation_flags
          .filter((tf): tf is LLMTransformationFlag =>
            typeof tf.character_name === 'string' &&
            typeof tf.type === 'string' &&
            ['instant', 'within_shot', 'gradual'].includes(tf.type)
          )
          .map(tf => ({
            characterName: tf.character_name.trim(),
            type: tf.type as 'instant' | 'within_shot' | 'gradual',
            description: typeof tf.description === 'string' ? tf.description.trim() : '',
            isTrigger: tf.is_trigger === true,
            isCompletion: tf.is_completion === true,
          }));
        if (transformationFlags.length === 0) transformationFlags = undefined;
      }

      // 3.7 Phase D: Extract structured camera metadata
      // Use LLM output if available, otherwise parse from free-text camera field
      const cameraText = (raw.camera || '').trim();
      const fallback = parseCameraMetadata(cameraText);

      const VALID_DISTANCES = ['wide', 'medium', 'close'];
      const VALID_HEIGHTS = ['eye_level', 'high_angle', 'low_angle', 'overhead', 'ground_level'];

      const camera_distance = (VALID_DISTANCES.includes(raw.camera_distance as string)
        ? raw.camera_distance
        : fallback.distance) as ExtractedShot['camera_distance'];

      const camera_height = (VALID_HEIGHTS.includes(raw.camera_height as string)
        ? raw.camera_height
        : fallback.height) as ExtractedShot['camera_height'];

      const camera_movement = typeof raw.camera_movement === 'string'
        ? raw.camera_movement.trim()
        : fallback.movement;

      const camera_direction_name = typeof raw.camera_direction === 'string'
        ? raw.camera_direction.trim()
        : undefined;

      validated.push({
        shotId: generateShotId(sceneNumber, validated.length),
        shotOrder: validated.length,
        duration: typeof raw.duration === 'number' ? raw.duration : DEFAULT_DURATION,
        dialogue: typeof raw.dialogue === 'string' ? raw.dialogue : '',
        action: (raw.action || '').trim(),
        charactersForeground: foreground,
        charactersBackground: background,
        setting: (raw.setting || '').trim(),
        camera: cameraText,
        camera_distance,
        camera_height,
        camera_movement,
        camera_direction_name,
        continuityFlags: Array.isArray(raw.continuity_flags) ? raw.continuity_flags : [],
        beatReference: typeof raw.beat_reference === 'string' ? raw.beat_reference : undefined,
        transformationFlags,
      });
    }

    if (validated.length < parsed.shots.length) {
      console.warn(`[ShotExtraction] ${parsed.shots.length - validated.length} shot(s) discarded for scene ${sceneId}; consider user review.`);
    }
    console.log(`[ShotExtraction] Extracted ${validated.length} shots for scene ${sceneId}, ${newDirections.length} new direction(s) proposed`);
    return { shots: validated, newDirections };
  }

  private timeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Extraction timeout')), ms);
    });
  }

  private async extractWithLLM(systemPrompt: string, userPrompt: string): Promise<string> {
    const request: LLMRequest = {
      systemPrompt,
      userPrompt,
      temperature: 0.3,
      maxTokens: 4096,
      metadata: { operation: 'shot_extraction', stage: 7 }
    };
    const response = await llmClient.generate(request);
    return response.content;
  }

  private parseResponse(content: string): { shots: LLMShotRaw[]; new_directions?: NewDirectionRaw[] } {
    let text = content.trim();
    text = text.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
    try {
      return JSON.parse(text);
    } catch (e) {
      console.error('[ShotExtraction] Failed to parse LLM response:', e);
      throw new Error('Failed to parse shot extraction response');
    }
  }
}
