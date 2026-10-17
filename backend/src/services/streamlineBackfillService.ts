/**
 * Streamline backfill service — "Generate from script" for a skipped Stage 2 or 3.
 *
 * Existing Stage 2/3 generation (treatmentService.ts / beatService.ts, frontend-driven
 * via /api/llm/generate-from-template) is built for forward generation (idea -> treatment,
 * treatment -> beats). Backfilling a skipped stage from an already-locked Stage 4 script
 * runs the opposite direction, so this is genuinely new generation logic, not a duplicate.
 */

import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../config/supabase.js';
import { llmClient } from './llm-client.js';
import { ContextManager } from './contextManager.js';
import { extractJsonArray } from '../utils/llmJson.js';

export class StreamlineBackfillError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'StreamlineBackfillError';
  }
}

interface LockedScript {
  formattedScript: string;
}

const contextManager = new ContextManager();

async function fetchLockedScript(branchId: string): Promise<LockedScript> {
  const { data, error } = await supabase
    .from('stage_states')
    .select('content')
    .eq('branch_id', branchId)
    .eq('stage_number', 4)
    .eq('status', 'locked')
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    throw new StreamlineBackfillError('Stage 4 (Master Script) is not locked — cannot backfill from it', 'SCRIPT_NOT_LOCKED');
  }

  const formattedScript: string = data.content?.formattedScript || '';
  if (!formattedScript.trim()) {
    throw new StreamlineBackfillError('Stage 4 has no script text to backfill from', 'SCRIPT_EMPTY');
  }

  return { formattedScript };
}

export class StreamlineBackfillService {
  /**
   * Backfill Stage 2 (Treatment) content from the locked Stage 4 script.
   * Returns a Stage2Content-shaped object ready to lock via the commit/PUT path.
   */
  async backfillTreatment(projectId: string, branchId: string, userId: string) {
    const { formattedScript } = await fetchLockedScript(branchId);
    const globalContext = await contextManager.assembleGlobalContext(projectId, branchId, userId);

    const styleGuidance = globalContext.writingStyleCapsule
      ? contextManager.formatForInjection({ ...globalContext, beatSheet: undefined, masterScriptSummary: undefined })
      : '';

    const systemPrompt = `You are a script analyst. Given a finished screenplay, write a single cohesive prose treatment (2-4 paragraphs) that faithfully summarizes its plot, characters, and tone. Do not invent events that aren't in the script. Return plain prose only — no headers, no markdown, no JSON.`;

    const userPrompt = [
      `PROJECT GENRE: ${globalContext.projectParams.genres.join(', ') || 'unspecified'}`,
      `CONTENT RATING: ${globalContext.projectParams.contentRating}`,
      `TARGET LENGTH: ${globalContext.projectParams.targetLengthMin}-${globalContext.projectParams.targetLengthMax} seconds`,
      styleGuidance ? `\n${styleGuidance}` : '',
      `\nSCREENPLAY:\n\n${formattedScript}`,
    ].filter(Boolean).join('\n');

    const response = await llmClient.generate({
      systemPrompt,
      userPrompt,
      temperature: 0.5,
      maxTokens: 2048,
      metadata: { stage: 2, action: 'streamline_backfill_treatment', projectId },
    });

    const content = response.content.trim();
    const runtimeMidpoint = Math.round(
      (globalContext.projectParams.targetLengthMin + globalContext.projectParams.targetLengthMax) / 2
    );

    return {
      variations: [
        {
          id: uuidv4(),
          content,
          structuralEmphasis: 'balanced',
          estimatedRuntimeSeconds: runtimeMidpoint,
          createdAt: new Date().toISOString(),
        },
      ],
      activeVariation: 0,
    };
  }

  /**
   * Backfill Stage 3 (Beat Sheet) content from the locked Stage 4 script.
   * Returns a Stage3Content-shaped object ready to lock via the commit/PUT path.
   */
  async backfillBeatSheet(projectId: string, branchId: string, userId: string) {
    const { formattedScript } = await fetchLockedScript(branchId);
    const globalContext = await contextManager.assembleGlobalContext(projectId, branchId, userId);

    const systemPrompt = `You are a script analyst. Given a finished screenplay, extract its major structural beats as a JSON array. Each beat is a distinct narrative movement (setup, inciting incident, turns, climax, resolution, etc.) grounded in what's actually in the script — do not invent events.

Return ONLY a JSON array with this exact shape, no prose, no markdown fences:
[{"order": 1, "text": "beat description", "rationale": "why this is a beat", "estimatedScreenTimeSeconds": 30}]`;

    const userPrompt = `TARGET LENGTH: ${globalContext.projectParams.targetLengthMin}-${globalContext.projectParams.targetLengthMax} seconds\n\nSCREENPLAY:\n\n${formattedScript}`;

    const response = await llmClient.generate({
      systemPrompt,
      userPrompt,
      temperature: 0.4,
      maxTokens: 4096,
      metadata: { stage: 3, action: 'streamline_backfill_beats', projectId },
    });

    const rawBeats = extractJsonArray<{
      order: number;
      text: string;
      rationale?: string;
      estimatedScreenTimeSeconds?: number;
    }>(response.content);

    const beats = rawBeats.map((b, index) => ({
      id: uuidv4(),
      order: b.order ?? index + 1,
      text: b.text,
      rationale: b.rationale,
      estimatedScreenTimeSeconds: b.estimatedScreenTimeSeconds ?? 0,
    }));

    const totalEstimatedRuntime = beats.reduce((sum, b) => sum + (b.estimatedScreenTimeSeconds || 0), 0);

    return {
      beats,
      totalEstimatedRuntime,
      narrativeStructure: 'derived_from_script',
    };
  }
}

export const streamlineBackfillService = new StreamlineBackfillService();
