/**
 * Streamline Phase 3 — "AI-format" per-file choice (spec Task 3.1/3.3).
 * When a user submits a loose/informal document and picks AI-format instead
 * of as-is, this reformats it into the stage's expected structure before
 * it's wrapped into the commit payload. formatAsScript is deliberately not
 * here — script files always go through the deterministic tiptap parse on
 * the frontend, never an LLM reformat pass.
 */

import { v4 as uuidv4 } from 'uuid';
import { llmClient } from './llm-client.js';
import { extractJsonArray } from '../utils/llmJson.js';

export interface FormattedBeat {
  id: string;
  order: number;
  text: string;
  rationale?: string;
  estimatedScreenTimeSeconds: number;
}

/**
 * Reformats loose notes/a document into a single cohesive prose treatment.
 */
export async function formatAsTreatment(text: string): Promise<string> {
  const systemPrompt = `You are a script editor. Reformat the given document into a single cohesive prose treatment (2-4 paragraphs) suitable for a film pre-production pipeline. Preserve all factual content from the source — do not invent new plot points, characters, or events. Return plain prose only — no headers, no markdown, no JSON.`;

  const response = await llmClient.generate({
    systemPrompt,
    userPrompt: text,
    temperature: 0.5,
    maxTokens: 2048,
    metadata: { action: 'streamline_format_treatment' },
  });

  return response.content.trim();
}

/**
 * Reformats loose notes/a document into a structured beat list.
 */
export async function formatAsBeatSheet(text: string): Promise<{ beats: FormattedBeat[]; totalEstimatedRuntime: number }> {
  const systemPrompt = `You are a script editor. Reformat the given document into a JSON array of structured narrative beats. Ground every beat in what's actually in the source document — do not invent events.

Return ONLY a JSON array with this exact shape, no prose, no markdown fences:
[{"order": 1, "text": "beat description", "rationale": "why this is a beat", "estimatedScreenTimeSeconds": 30}]`;

  const response = await llmClient.generate({
    systemPrompt,
    userPrompt: text,
    temperature: 0.4,
    maxTokens: 4096,
    metadata: { action: 'streamline_format_beats' },
  });

  const rawBeats = extractJsonArray<{ order: number; text: string; rationale?: string; estimatedScreenTimeSeconds?: number }>(response.content);

  const beats: FormattedBeat[] = rawBeats.map((b, index) => ({
    id: uuidv4(),
    order: b.order ?? index + 1,
    text: b.text,
    rationale: b.rationale,
    estimatedScreenTimeSeconds: b.estimatedScreenTimeSeconds ?? 0,
  }));

  return {
    beats,
    totalEstimatedRuntime: beats.reduce((sum, b) => sum + (b.estimatedScreenTimeSeconds || 0), 0),
  };
}
