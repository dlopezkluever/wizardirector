/**
 * Server-side mirror of src/lib/utils/scriptConfidence.ts's detection rule
 * (spec §2.8) — frontend and backend are separate TS projects with no shared
 * package, so the confidence rule is duplicated here rather than the full
 * TipTap parse. Only the counting matters for classification; the frontend
 * owns building the actual tiptapDoc when a script is what gets committed.
 * Keep the regexes and thresholds in sync with the frontend version.
 */

import { MIN_SCENE_HEADINGS, MIN_DIALOGUE_LINES } from '../config/streamlineConfig.js';

export type ScriptConfidenceLevel = 'high' | 'ambiguous' | 'low';

export interface ScriptConfidenceResult {
  confidence: ScriptConfidenceLevel;
  sceneHeadingCount: number;
  dialogueCount: number;
}

const SCENE_HEADING_RE = /^(INT\.|EXT\.)/i;
const CHARACTER_RE = /^[A-Z][A-Z\s.''’_-]+(?:\s*\((?:O\.S\.|V\.O\.|CONT'D|CONTINUED|O\.C\.)\))?$/;

function isCharacterLine(line: string): boolean {
  return CHARACTER_RE.test(line) && line.length < 60 && line.length > 0;
}

export function detectScriptConfidence(plainText: string): ScriptConfidenceResult {
  const lines = plainText.split('\n').map(l => l.trim());

  let sceneHeadingCount = 0;
  let dialogueCount = 0;
  let awaitingDialogue = false;

  for (const line of lines) {
    if (line.length === 0) continue;

    if (SCENE_HEADING_RE.test(line)) {
      sceneHeadingCount++;
      awaitingDialogue = false;
      continue;
    }

    if (isCharacterLine(line)) {
      awaitingDialogue = true;
      continue;
    }

    if (awaitingDialogue && !/^\(.*\)$/.test(line)) {
      dialogueCount++;
      awaitingDialogue = false;
    }
  }

  let confidence: ScriptConfidenceLevel;
  if (sceneHeadingCount === 0) {
    confidence = 'low';
  } else if (sceneHeadingCount >= MIN_SCENE_HEADINGS && dialogueCount >= MIN_DIALOGUE_LINES) {
    confidence = 'high';
  } else {
    confidence = 'ambiguous';
  }

  return { confidence, sceneHeadingCount, dialogueCount };
}
