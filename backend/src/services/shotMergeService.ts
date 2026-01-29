/**
 * Shot Merge Service
 *
 * LLM-based service to merge two consecutive shots into one coherent shot.
 * Used by Stage 7 merge endpoint. Duration of the merged shot is the sum of the two.
 */

import { llmClient, type LLMRequest } from './llm-client.js';
import type { ShotForInsert } from './shotSplitService.js';

/** Shot row shape needed for merge (same scene, ordered by shot_order). */
export interface ShotRowForMerge {
  id: string;
  scene_id: string;
  shot_id: string;
  shot_order: number;
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

interface LLMMergedShot {
  dialogue?: string | null;
  action?: string;
  characters?: LLMCharacter[];
  setting?: string;
  camera?: string;
  continuity_flags?: string[];
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

export class ShotMergeService {
  /**
   * Merge two consecutive shots into one using LLM.
   * Shots must have the same scene_id. They are ordered by shot_order; merged shot_id is {firstShotId}-M.
   * Duration = sum of both shots' durations.
   */
  async mergeShots(
    shotA: ShotRowForMerge,
    shotB: ShotRowForMerge,
    userGuidance?: string
  ): Promise<ShotForInsert> {
    if (shotA.scene_id !== shotB.scene_id) {
      throw new Error('Shots must belong to the same scene');
    }
    const [first, second] = shotA.shot_order <= shotB.shot_order ? [shotA, shotB] : [shotB, shotA];
    const mergedDuration = first.duration + second.duration;

    const shotsJson = JSON.stringify(
      [
        {
          shot_id: first.shot_id,
          duration: first.duration,
          dialogue: first.dialogue || '',
          action: first.action,
          characters: [
            ...(first.characters_foreground || []).map(name => ({ name, prominence: 'foreground' })),
            ...(first.characters_background || []).map(name => ({ name, prominence: 'background' }))
          ],
          setting: first.setting,
          camera: first.camera,
          continuity_flags: first.continuity_flags || []
        },
        {
          shot_id: second.shot_id,
          duration: second.duration,
          dialogue: second.dialogue || '',
          action: second.action,
          characters: [
            ...(second.characters_foreground || []).map(name => ({ name, prominence: 'foreground' })),
            ...(second.characters_background || []).map(name => ({ name, prominence: 'background' }))
          ],
          setting: second.setting,
          camera: second.camera,
          continuity_flags: second.continuity_flags || []
        }
      ],
      null,
      2
    );

    const systemPrompt = `You are a shot consolidation specialist. Your role is to merge two consecutive shots into one coherent shot without inventing new narrative content.

TWO SHOTS TO MERGE:
${shotsJson}

MERGE REQUIREMENTS:
1. Combine dialogue, action, characters, setting, camera, and continuity_flags into a single coherent shot.
2. Do not invent new narrative content; only consolidate what is in the two shots.
3. The merged shot should read as one continuous beat. Adjust camera/setting only to reflect a single coherent description.
4. Duration will be set server-side to the sum of the two shots (${mergedDuration} seconds).

${userGuidance ? `USER GUIDANCE: ${userGuidance}` : ''}

OUTPUT: Return ONLY a valid JSON object (no markdown):
{
  "dialogue": "combined or first+second dialogue",
  "action": "combined action description",
  "characters": [{"name": "CHARACTER", "prominence": "foreground"|"background"}],
  "setting": "unified setting",
  "camera": "unified camera spec",
  "continuity_flags": []
}`;

    const userPrompt = userGuidance
      ? `Merge the two shots according to this guidance: ${userGuidance}\n\nReturn ONLY the JSON object.`
      : `Merge the two shots into one coherent shot. Return ONLY the JSON object.`;

    const request: LLMRequest = {
      systemPrompt,
      userPrompt,
      temperature: 0.3,
      maxTokens: 2048,
      metadata: { operation: 'shot_merge', stage: 7 }
    };

    const response = await llmClient.generate(request);
    const content = response.content
      .trim()
      .replace(/^```(?:json)?\s*\n?/, '')
      .replace(/\n?```\s*$/, '')
      .trim();

    let parsed: LLMMergedShot;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.error('[ShotMerge] Failed to parse LLM response:', e);
      throw new Error('Failed to parse shot merge response');
    }

    const action = (parsed.action || '').trim();
    const setting = (parsed.setting || '').trim();
    const camera = (parsed.camera || '').trim();
    if (!action || !setting || !camera) {
      throw new Error('Shot merge response missing required fields (action, setting, camera)');
    }

    const { foreground, background } = mapCharactersToForegroundBackground(parsed.characters);
    const mergedShotId = `${first.shot_id}-M`;

    const result: ShotForInsert = {
      shot_id: mergedShotId,
      duration: mergedDuration,
      dialogue: typeof parsed.dialogue === 'string' ? parsed.dialogue : '',
      action,
      characters_foreground: foreground,
      characters_background: background,
      setting,
      camera,
      continuity_flags: Array.isArray(parsed.continuity_flags) ? parsed.continuity_flags : [],
      beat_reference: first.beat_reference
    };
    return result;
  }
}
