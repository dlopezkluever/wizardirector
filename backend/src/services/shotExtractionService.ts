/**
 * Shot Extraction Service
 *
 * LLM-based service to extract shots from scene script content.
 * Follows sceneDependencyExtraction.ts structure.
 * Used in Stage 7 to break a scene into 8-second atomic shots.
 */

import { llmClient, type LLMRequest, LLMClientError } from './llm-client.js';

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
  continuityFlags: string[];
  beatReference?: string;
}

interface LLMShotCharacter {
  name: string;
  prominence: 'foreground' | 'background' | 'off-screen';
}

interface LLMShotRaw {
  shot_order: number;
  duration?: number;
  dialogue?: string | null;
  action: string;
  characters?: LLMShotCharacter[];
  setting: string;
  camera: string;
  continuity_flags?: string[];
  beat_reference?: string;
}

interface ExtractionContext {
  priorSceneEndState?: string | null;
  beatSheetSummary?: string;
  masterScriptSummary?: string;
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
  ): Promise<ExtractedShot[]> {
    console.log(`[ShotExtraction] Extracting shots for scene ${sceneId} (scene #${sceneNumber})`);

    const globalContextPackage = buildGlobalContextSection(context);
    const previousSceneEndState = buildPreviousSceneSection(context);

    const systemPrompt = `You are a technical shot breakdown specialist for an AI video generation pipeline. Your role is to translate narrative scenes into precise, time-bounded shots that feed directly into image and video generation models. Precision in your descriptions directly determines output quality.

GLOBAL CONTEXT:
${globalContextPackage}

CURRENT SCENE CONTEXT:
Scene ID: ${sceneId}
Scene Number: ${sceneNumber}
Scene Content will be provided in the user message.

PREVIOUS SCENE END-STATE (LOCAL CONTEXT):
${previousSceneEndState}

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

CONTINUITY REQUIREMENTS:
- The first shot must visually connect to the previous scene's end state if there is one.
- Character positions and states must be consistent with prior scene endings.
- Setting must match or explicitly transition.

OUTPUT: Return ONLY a valid JSON object with this exact structure (no markdown, no extra text):
{
  "shots": [
    {
      "shot_order": 0,
      "duration": 8,
      "dialogue": "exact lines or empty string",
      "action": "Detailed description: character positions and blocking, movement, body language, emotional state, environmental details, lighting cues if relevant",
      "characters": [{"name": "CHARACTER_NAME", "prominence": "foreground"|"background"|"off-screen"}],
      "setting": "specific location with atmosphere and spatial details",
      "camera": "SHOT_TYPE - ANGLE - MOVEMENT (e.g., MS - Eye Level - Static)",
      "continuity_flags": ["optional strings"],
      "beat_reference": "optional beat id"
    }
  ]
}`;

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
        return [];
      }
      if (error instanceof LLMClientError && error.code === 'RATE_LIMIT') {
        console.warn(`[ShotExtraction] Rate limit exceeded for scene ${sceneId}`);
        throw error; // Caller can show user message
      }
      throw error;
    }

    let parsed: { shots: LLMShotRaw[] };
    try {
      parsed = this.parseResponse(responseContent);
    } catch {
      console.warn(`[ShotExtraction] Malformed JSON for scene ${sceneId}, retrying with simpler prompt`);
      try {
        const retryContent = await this.extractWithLLM(
          'You extract a shot list from screenplay text. Return ONLY valid JSON: {"shots":[{"shot_order":0,"duration":8,"dialogue":"","action":"","characters":[],"setting":"","camera":"","continuity_flags":[]}]}. Each shot needs non-empty action, setting, camera.',
          userPrompt
        );
        parsed = this.parseResponse(retryContent);
      } catch (retryErr) {
        console.error('[ShotExtraction] Retry failed:', retryErr);
        return [];
      }
    }
    if (!parsed.shots || !Array.isArray(parsed.shots)) {
      console.warn('[ShotExtraction] No shots array in response');
      return [];
    }

    const validated: ExtractedShot[] = [];
    for (let i = 0; i < parsed.shots.length; i++) {
      const raw = parsed.shots[i] as LLMShotRaw;
      if (!validateShot(raw, i)) {
        console.warn(`[ShotExtraction] Discarding invalid shot at index ${i}: missing or invalid required fields`);
        continue;
      }
      const { foreground, background } = mapCharactersToForegroundBackground(raw.characters);
      validated.push({
        shotId: generateShotId(sceneNumber, validated.length),
        shotOrder: validated.length,
        duration: typeof raw.duration === 'number' ? raw.duration : DEFAULT_DURATION,
        dialogue: typeof raw.dialogue === 'string' ? raw.dialogue : '',
        action: (raw.action || '').trim(),
        charactersForeground: foreground,
        charactersBackground: background,
        setting: (raw.setting || '').trim(),
        camera: (raw.camera || '').trim(),
        continuityFlags: Array.isArray(raw.continuity_flags) ? raw.continuity_flags : [],
        beatReference: typeof raw.beat_reference === 'string' ? raw.beat_reference : undefined
      });
    }

    if (validated.length < parsed.shots.length) {
      console.warn(`[ShotExtraction] ${parsed.shots.length - validated.length} shot(s) discarded for scene ${sceneId}; consider user review.`);
    }
    console.log(`[ShotExtraction] Extracted ${validated.length} shots for scene ${sceneId}`);
    return validated;
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

  private parseResponse(content: string): { shots: LLMShotRaw[] } {
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
