/**
 * Streamline Phase 3 — per-file classification (spec Task 3.1).
 * Script detection is free/deterministic (reuses Phase 1's confidence rule,
 * §2.8). Everything else runs one LLM call to distinguish treatment / beat
 * sheet / character notes / unclassified prose.
 */

import { llmClient } from './llm-client.js';
import { extractJsonObject } from '../utils/llmJson.js';
import { detectScriptConfidence, type ScriptConfidenceResult } from '../utils/scriptConfidence.js';
import { MIN_SCENE_HEADINGS } from '../config/streamlineConfig.js';

export type StreamlineFileType = 'script' | 'treatment' | 'beat_sheet' | 'character_notes' | 'unclassified';

export interface StreamlineClassification {
  type: StreamlineFileType;
  confidence: number;
}

function scriptConfidenceScore(result: ScriptConfidenceResult): number {
  if (result.confidence === 'high') return 0.95;
  if (result.confidence === 'ambiguous') {
    const headingScore = Math.min(result.sceneHeadingCount / MIN_SCENE_HEADINGS, 1) * 0.4;
    const dialogueScore = result.dialogueCount > 0 ? 0.2 : 0;
    return Math.min(0.4 + headingScore + dialogueScore, 0.75);
  }
  return 0;
}

async function classifyProseViaLLM(text: string, filename: string): Promise<StreamlineClassification> {
  const systemPrompt = `You are classifying an uploaded document for a film pre-production intake pipeline. Given a document's text, classify it as exactly one of:
- "treatment": a prose narrative summary/pitch of a story
- "beat_sheet": a structured list of narrative beats or plot points
- "character_notes": character, location, or prop descriptions
- "unclassified": none of the above, or too ambiguous to tell

Return ONLY a JSON object, no prose, no markdown fences: {"type": "treatment"|"beat_sheet"|"character_notes"|"unclassified", "confidence": 0.0-1.0}`;

  const userPrompt = `FILENAME: ${filename}\n\nDOCUMENT TEXT:\n\n${text.slice(0, 6000)}`;

  try {
    const response = await llmClient.generate({
      systemPrompt,
      userPrompt,
      temperature: 0.2,
      maxTokens: 200,
      metadata: { action: 'streamline_classify_file', filename },
    });

    const parsed = extractJsonObject<{ type: string; confidence: number }>(response.content);
    const validTypes: StreamlineFileType[] = ['treatment', 'beat_sheet', 'character_notes', 'unclassified'];
    const type = validTypes.includes(parsed.type as StreamlineFileType) ? (parsed.type as StreamlineFileType) : 'unclassified';
    const confidence = typeof parsed.confidence === 'number' ? Math.max(0, Math.min(1, parsed.confidence)) : 0.5;

    return { type, confidence };
  } catch (error) {
    console.error('[StreamlineClassification] LLM classification failed, returning unclassified:', error);
    return { type: 'unclassified', confidence: 0 };
  }
}

/**
 * Classifies extracted document text. Script detection never calls the LLM;
 * everything else does, with a best-effort fallback to 'unclassified' on
 * failure so a classification error never breaks file extraction itself.
 */
export async function classifyFile(text: string, filename: string): Promise<StreamlineClassification> {
  const scriptResult = detectScriptConfidence(text);

  if (scriptResult.confidence !== 'low') {
    return { type: 'script', confidence: scriptConfidenceScore(scriptResult) };
  }

  return classifyProseViaLLM(text, filename);
}
