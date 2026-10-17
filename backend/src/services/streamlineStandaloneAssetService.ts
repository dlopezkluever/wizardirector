/**
 * Streamline Phase 3 — standalone asset-file ingestion (spec Task 3.5).
 * A standalone character/location/prop note file has no scene to attach
 * dependencies to, so it can't go through aggregatePreview (which requires
 * real scene rows). This is a second, lighter mechanism: one LLM call per
 * file, pre-filling a single Stage 5 asset draft for user confirmation.
 * Costed and estimated separately from the script-derived asset chain.
 */

import { llmClient } from './llm-client.js';
import { extractJsonObject } from '../utils/llmJson.js';

export interface StandaloneAssetDraft {
  name: string;
  type: 'character' | 'prop' | 'location';
  description: string;
}

export async function extractStandaloneAssetDraft(text: string, filename: string): Promise<StandaloneAssetDraft> {
  const systemPrompt = `You are pre-filling a single film production asset record from a standalone note file (character sketch, location description, or prop notes). Read the document and identify the single primary subject it describes.

Return ONLY a JSON object, no prose, no markdown fences:
{"name": "canonical name", "type": "character"|"prop"|"location", "description": "2-4 sentence visual/narrative description grounded in the document"}`;

  const userPrompt = `FILENAME: ${filename}\n\nDOCUMENT TEXT:\n\n${text.slice(0, 4000)}`;

  const response = await llmClient.generate({
    systemPrompt,
    userPrompt,
    temperature: 0.3,
    maxTokens: 500,
    metadata: { action: 'streamline_standalone_asset_draft', filename },
  });

  const parsed = extractJsonObject<{ name: string; type: string; description: string }>(response.content);
  const type: StandaloneAssetDraft['type'] = ['character', 'prop', 'location'].includes(parsed.type)
    ? (parsed.type as StandaloneAssetDraft['type'])
    : 'character';

  return {
    name: parsed.name || filename.replace(/\.[^.]+$/, ''),
    type,
    description: parsed.description || '',
  };
}
