/**
 * Streamline Phase 4 — Ask Auteur question generation (Task 4.2).
 * One LLM call over the full submitted batch, run only once full-batch
 * classification completes (spec §2.9.6 — gates the same-session race).
 * Zero triggers means no session is offered at all (§2.9's "opt-in every
 * time, not a mandatory gate").
 */

import { llmClient } from './llm-client.js';
import { extractJsonArray } from '../utils/llmJson.js';

export type StreamlineQuestionCategory = 'contradiction' | 'vague_trait' | 'ambiguous_structure' | 'missing_info';
export type StreamlineEntityType = 'character' | 'location' | 'prop' | 'style' | 'structure' | 'other';

export interface StreamlineQuestionOption {
  id: string;
  label: string;
}

export interface StreamlineQuestion {
  id: string;
  category: StreamlineQuestionCategory;
  questionText: string;
  options: StreamlineQuestionOption[];
  subjectEntityType?: StreamlineEntityType;
  subjectEntityName?: string;
  conflictingSources?: string[];
}

export interface StreamlineBatchFile {
  id: string;
  name: string;
  text: string;
  isPrimary: boolean;
}

interface RawQuestion {
  category?: string;
  questionText?: string;
  options?: Array<{ label?: string } | string>;
  subjectEntityType?: string;
  subjectEntityName?: string;
  conflictingSources?: string[];
}

const VALID_CATEGORIES: StreamlineQuestionCategory[] = ['contradiction', 'vague_trait', 'ambiguous_structure', 'missing_info'];
const VALID_ENTITY_TYPES: StreamlineEntityType[] = ['character', 'location', 'prop', 'style', 'structure', 'other'];

function buildSystemPrompt(): string {
  return `You are Ask Auteur, a clarification assistant for a film pre-production intake pipeline. You've been given a batch of documents a filmmaker just submitted (scripts, treatments, beat sheets, character notes). Find things worth a targeted clarifying question BEFORE this material gets used to generate the rest of the pipeline. Only surface real, high-value issues — a handful of sharp questions beats a long form.

Four trigger categories:
- "contradiction": two documents disagree on a fact (e.g. a character's name spelled two ways, conflicting ages, different settings for the same scene).
- "vague_trait": something is underspecified in a way that will visibly affect generation (e.g. no visual description for a lead character, an accent or key trait left vague).
- "ambiguous_structure": the narrative structure is unclear (e.g. a paragraph that could be read as either continuing the current scene or starting a new one).
- "missing_info": something needed downstream is absent entirely from every document (e.g. no visual style/tone specified anywhere, no indication of setting/time period).

For each issue found, produce a multiple-choice question (2-4 short, concrete options — never yes/no, never open-ended-only) a filmmaker could tap to resolve it. A free-text "type your own answer" option is always available in the UI already — do not add one yourself.

Return ONLY a JSON array, no prose, no markdown fences. Each element:
{
  "category": "contradiction"|"vague_trait"|"ambiguous_structure"|"missing_info",
  "questionText": "...",
  "options": ["Option A", "Option B", "Option C"],
  "subjectEntityType": "character"|"location"|"prop"|"style"|"structure"|"other"|null,
  "subjectEntityName": "canonical name or null",
  "conflictingSources": ["filename1", "filename2"] or null
}

If nothing rises to the level of a real question, return an empty array [].`;
}

function buildUserPrompt(files: StreamlineBatchFile[]): string {
  return files
    .map(f => `--- FILE: ${f.name}${f.isPrimary ? ' (PRIMARY)' : ''} ---\n${f.text.slice(0, 4000)}`)
    .join('\n\n');
}

export async function analyzeBatch(files: StreamlineBatchFile[]): Promise<StreamlineQuestion[]> {
  if (files.length === 0) return [];

  try {
    const response = await llmClient.generate({
      systemPrompt: buildSystemPrompt(),
      userPrompt: buildUserPrompt(files),
      temperature: 0.3,
      maxTokens: 2048,
      metadata: { action: 'streamline_analyze_batch', fileCount: files.length },
    });

    const raw = extractJsonArray<RawQuestion>(response.content);

    return raw
      .filter(q => q.questionText && q.category && VALID_CATEGORIES.includes(q.category as StreamlineQuestionCategory))
      .map((q, index) => ({
        id: `q-${index}-${Date.now()}`,
        category: q.category as StreamlineQuestionCategory,
        questionText: q.questionText!,
        options: (q.options ?? []).map((opt, optIndex) => ({
          id: `opt-${index}-${optIndex}`,
          label: typeof opt === 'string' ? opt : (opt.label ?? ''),
        })).filter(opt => opt.label.length > 0),
        subjectEntityType: VALID_ENTITY_TYPES.includes(q.subjectEntityType as StreamlineEntityType)
          ? (q.subjectEntityType as StreamlineEntityType)
          : undefined,
        subjectEntityName: q.subjectEntityName || undefined,
        conflictingSources: q.conflictingSources && q.conflictingSources.length > 0 ? q.conflictingSources : undefined,
      }));
  } catch (error) {
    console.error('[StreamlineQuestion] analyzeBatch failed, returning no questions (never blocks commit):', error);
    return [];
  }
}
