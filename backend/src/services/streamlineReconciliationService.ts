/**
 * Streamline Phase 4 — reconciliation pass (Task 4.4, spec §2.9.3). One
 * backend call per Ask Auteur session, given every submitted document's text
 * plus the full Q&A transcript: identifies which documents need a change,
 * classifies each change's scope, and emits the revised text.
 *
 * Simplification versus the spec's literal wording: §2.9.3 describes a
 * find/replace list for word_patch and full revised text for the other two
 * scopes. This always returns full revised text regardless of scope —
 * generating a reliable minimal diff is a second failure mode an LLM call
 * doesn't need, and a full-text patch is what actually gets written back
 * either way. edit_scope still drives the cost/UI classification exactly as
 * specified; only the wire format for *applying* the change is simplified.
 */

import { llmClient } from './llm-client.js';
import { extractJsonArray } from '../utils/llmJson.js';
import type { StreamlineBatchFile } from './streamlineQuestionService.js';

export type StreamlineEditScope = 'word_patch' | 'paragraph_rewrite' | 'structural_cascade';

export interface StreamlineQAPair {
  questionText: string;
  selectedAnswer: string;
  subjectEntityName?: string;
}

export interface ReconciledDocument {
  fileId: string;
  fileName: string;
  editScope: StreamlineEditScope;
  reconciledText: string;
  diffSummary: string;
}

interface RawReconciledDocument {
  fileName?: string;
  editScope?: string;
  reconciledText?: string;
  diffSummary?: string;
}

const VALID_SCOPES: StreamlineEditScope[] = ['word_patch', 'paragraph_rewrite', 'structural_cascade'];

function buildSystemPrompt(): string {
  return `You are applying a filmmaker's clarification answers back into the documents they came from, for a film pre-production intake pipeline.

Given a set of documents and a transcript of questions + the filmmaker's answers, decide which documents actually need a change to reflect those answers. For each one that does:
- Classify the change's scope:
  - "word_patch": a small factual correction (e.g. a name spelling) — near-zero-cost, surgical.
  - "paragraph_rewrite": a clarification that affects one description or paragraph (e.g. adding a trait).
  - "structural_cascade": an answer that affects plot/structure and requires rewriting a larger section.
- Emit the FULL revised document text (not a diff) — every other part of the document must stay exactly as it was, only the specific facts affected by the answers change.
- Write a one-line, human-readable diff_summary describing what changed.

Do not include documents that need no change at all.

Return ONLY a JSON array, no prose, no markdown fences. Each element:
{"fileName": "...", "editScope": "word_patch"|"paragraph_rewrite"|"structural_cascade", "reconciledText": "...", "diffSummary": "..."}`;
}

function buildUserPrompt(files: StreamlineBatchFile[], qaPairs: StreamlineQAPair[]): string {
  const transcript = qaPairs
    .map(qa => `Q: ${qa.questionText}\nA: ${qa.selectedAnswer}${qa.subjectEntityName ? ` (about: ${qa.subjectEntityName})` : ''}`)
    .join('\n\n');

  const documents = files
    .map(f => `--- FILE: ${f.name} ---\n${f.text}`)
    .join('\n\n');

  return `Q&A TRANSCRIPT:\n\n${transcript}\n\nDOCUMENTS:\n\n${documents}`;
}

export async function reconcileDocuments(
  files: StreamlineBatchFile[],
  qaPairs: StreamlineQAPair[]
): Promise<ReconciledDocument[]> {
  if (files.length === 0 || qaPairs.length === 0) return [];

  const response = await llmClient.generate({
    systemPrompt: buildSystemPrompt(),
    userPrompt: buildUserPrompt(files, qaPairs),
    temperature: 0.2,
    maxTokens: 8192,
    metadata: { action: 'streamline_reconcile', fileCount: files.length, qaCount: qaPairs.length },
  });

  const raw = extractJsonArray<RawReconciledDocument>(response.content);
  const filesByName = new Map(files.map(f => [f.name, f]));

  return raw
    .filter(doc => doc.fileName && filesByName.has(doc.fileName) && doc.reconciledText)
    .map(doc => {
      const file = filesByName.get(doc.fileName!)!;
      return {
        fileId: file.id,
        fileName: file.name,
        editScope: VALID_SCOPES.includes(doc.editScope as StreamlineEditScope)
          ? (doc.editScope as StreamlineEditScope)
          : 'paragraph_rewrite',
        reconciledText: doc.reconciledText!,
        diffSummary: doc.diffSummary || 'Updated to reflect your answer.',
      };
    });
}
