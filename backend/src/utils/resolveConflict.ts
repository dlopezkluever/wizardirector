/**
 * Streamline Phase 4 — conflict authority ranking (spec §2.10). No new enum:
 * resolved entirely from `answer_source` (already on intake_resolutions) and
 * `isPrimary` (already named on StreamlineFile, Task 2.1). Used by both the
 * reconciliation pass and any silent below-question-threshold auto-resolution.
 *
 * Four tiers, highest wins:
 *   1. Explicit answer   — answerSource is 'option' or 'freetext'
 *   2. Primary doc       — isPrimary === true
 *   3. Supporting doc    — isPrimary === false
 *   4. AI-inferred        — answerSource === 'ai_inferred'
 *
 * Within a tier, the LAST matching candidate wins — candidates are expected
 * in chronological order, and a later value for the same fact supersedes an
 * earlier one (mirrors the re-ask rule, §2.9.6: a new contradicting answer
 * is authoritative over an older one, never mutated in place).
 */

export interface ConflictCandidate {
  value: string;
  /** Present when this candidate came from an Ask Auteur answer (explicit) or a declined/auto-resolved trigger (ai_inferred). */
  answerSource?: 'option' | 'freetext' | 'ai_inferred';
  /** Present when this candidate came from a submitted document (StreamlineFile.isPrimary). */
  isPrimary?: boolean;
}

function lastMatching<T>(items: T[], predicate: (item: T) => boolean): T | null {
  for (let i = items.length - 1; i >= 0; i--) {
    if (predicate(items[i])) return items[i];
  }
  return null;
}

export function resolveConflict(candidates: ConflictCandidate[]): ConflictCandidate | null {
  if (candidates.length === 0) return null;

  const explicit = lastMatching(candidates, c => c.answerSource === 'option' || c.answerSource === 'freetext');
  if (explicit) return explicit;

  const primaryDoc = lastMatching(candidates, c => c.isPrimary === true);
  if (primaryDoc) return primaryDoc;

  const supportingDoc = lastMatching(candidates, c => c.isPrimary === false);
  if (supportingDoc) return supportingDoc;

  const aiInferred = lastMatching(candidates, c => c.answerSource === 'ai_inferred');
  if (aiInferred) return aiInferred;

  // Nothing matched a known tier (e.g. a candidate with neither field set) — fall back to the last one given.
  return candidates[candidates.length - 1];
}
