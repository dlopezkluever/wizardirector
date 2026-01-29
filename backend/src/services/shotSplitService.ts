/**
 * Shot Split Service
 *
 * LLM-based service to split a single shot into two coherent shots.
 * Used by Stage 7 split endpoint. Shot IDs for the two new shots are
 * always generated server-side as {originalShotId}-1 and {originalShotId}-2.
 */

import { llmClient, type LLMRequest } from './llm-client.js';

export interface ShotForInsert {
  shot_id: string;
  duration: number;
  dialogue: string;
  action: string;
  characters_foreground: string[];
  characters_background: string[];
  setting: string;
  camera: string;
  continuity_flags: string[];
  beat_reference: string | null;
}

/** DB row shape for shots (subset we need for split). */
export interface OriginalShotRow {
  shot_id: string;
  duration: number;
  dialogue: string | null;
  action: string;
  characters_foreground: string[] | null;
  characters_background: string[] | null;
  setting: string;
  camera: string;
  continuity_flags: string[] | null;
  beat_reference: string | null;
}

interface LLMCharacter {
  name: string;
  prominence: string;
}

interface LLMSplitShot {
  duration: number;
  dialogue?: string | null;
  action: string;
  characters?: LLMCharacter[];
  setting: string;
  camera: string;
  continuity_flags?: string[];
  split_rationale?: string;
}

function mapCharactersToForegroundBackground(
  characters: LLMCharacter[] | undefined
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
    else foreground.push(name);
  }
  return { foreground, background };
}

function toShotForInsert(
  raw: LLMSplitShot,
  shotId: string
): ShotForInsert {
  const { foreground, background } = mapCharactersToForegroundBackground(raw.characters);
  return {
    shot_id: shotId,
    duration: typeof raw.duration === 'number' ? raw.duration : 4,
    dialogue: typeof raw.dialogue === 'string' ? raw.dialogue : '',
    action: (raw.action || '').trim(),
    characters_foreground: foreground,
    characters_background: background,
    setting: (raw.setting || '').trim(),
    camera: (raw.camera || '').trim(),
    continuity_flags: Array.isArray(raw.continuity_flags) ? raw.continuity_flags : [],
    beat_reference: null
  };
}

export class ShotSplitService {
  /**
   * Split one shot into two coherent shots using LLM.
   * Returns two ShotForInsert objects with shot_id set to {originalShotId}-1 and {originalShotId}-2.
   */
  async splitShot(
    originalShot: OriginalShotRow,
    userGuidance?: string
  ): Promise<ShotForInsert[]> {
    const originalShotId = originalShot.shot_id;
    const baseId1 = `${originalShotId}-1`;
    const baseId2 = `${originalShotId}-2`;

    const originalJson = JSON.stringify({
      shot_id: originalShot.shot_id,
      duration: originalShot.duration,
      dialogue: originalShot.dialogue || '',
      action: originalShot.action,
      characters: [
        ...(originalShot.characters_foreground || []).map(name => ({ name, prominence: 'foreground' })),
        ...(originalShot.characters_background || []).map(name => ({ name, prominence: 'background' }))
      ],
      setting: originalShot.setting,
      camera: originalShot.camera,
      continuity_flags: originalShot.continuity_flags || []
    }, null, 2);

    const systemPrompt = `You are a shot segmentation specialist. Your role is to divide a single 8-second shot into two new shots while preserving narrative coherence.

ORIGINAL SHOT CONTEXT:
${originalJson}

SPLIT REQUIREMENTS:
1. The two new shots must collectively cover the same narrative content as the original.
2. Duration must sum to the original (e.g. 4+4 or 5+3).
3. The split point must be a natural action or dialogue break.
4. Camera specs must be adjusted appropriately for each new shot.
5. Continuity flags must be preserved or refined.

OUTPUT: Return ONLY a valid JSON object (no markdown):
{
  "new_shots": [
    {
      "duration": 4,
      "dialogue": "",
      "action": "atomic description",
      "characters": [{"name": "CHARACTER", "prominence": "foreground"|"background"}],
      "setting": "...",
      "camera": "...",
      "continuity_flags": [],
      "split_rationale": "optional"
    },
    {
      "duration": 4,
      "dialogue": "",
      "action": "atomic description",
      "characters": [],
      "setting": "...",
      "camera": "...",
      "continuity_flags": [],
      "split_rationale": "optional"
    }
  ]
}`;

    const userPrompt = userGuidance
      ? `Split the shot according to this guidance: ${userGuidance}\n\nReturn ONLY the JSON object with "new_shots" array.`
      : `Split the shot at a natural action or dialogue break. Return ONLY the JSON object with "new_shots" array.`;

    const request: LLMRequest = {
      systemPrompt,
      userPrompt,
      temperature: 0.3,
      maxTokens: 2048,
      metadata: { operation: 'shot_split', stage: 7 }
    };

    const response = await llmClient.generate(request);
    const content = response.content.trim()
      .replace(/^```(?:json)?\s*\n?/, '')
      .replace(/\n?```\s*$/, '')
      .trim();

    let parsed: { new_shots: LLMSplitShot[] };
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.error('[ShotSplit] Failed to parse LLM response:', e);
      throw new Error('Failed to parse shot split response');
    }

    if (!parsed.new_shots || !Array.isArray(parsed.new_shots) || parsed.new_shots.length < 2) {
      throw new Error('Shot split response must contain exactly two shots');
    }

    const [first, second] = parsed.new_shots;
    return [
      toShotForInsert(first, baseId1),
      toShotForInsert(second, baseId2)
    ];
  }
}
