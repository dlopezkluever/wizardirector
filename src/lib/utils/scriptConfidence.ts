import { parseScriptToTiptapJson } from './screenplay-converter';
import { MIN_SCENE_HEADINGS, MIN_DIALOGUE_LINES } from './streamlineConfig';

export type ScriptConfidenceLevel = 'high' | 'ambiguous' | 'low';

export interface ScriptConfidenceResult {
  confidence: ScriptConfidenceLevel;
  sceneHeadingCount: number;
  dialogueCount: number;
  tiptapDoc: ReturnType<typeof parseScriptToTiptapJson>;
}

/**
 * Script-confidence detector (spec §2.8) — shared by Phase 1's skip-to-Stage-4
 * offer and Phase 3's general file classifier. Reuses the same parse that also
 * produces Stage 4's TipTap content, so detection and content-generation never
 * diverge into two separate parses of the same text.
 *
 * - high: >= MIN_SCENE_HEADINGS scene headings and >= MIN_DIALOGUE_LINES dialogue lines
 *   -> offer skip-to-Stage-4 directly.
 * - ambiguous: 1-2 headings, or headings with zero dialogue -> surface a confirmation prompt.
 * - low: zero scene headings -> treat as prose (treatment/notes), don't offer skip.
 */
export function detectScriptConfidence(plainText: string): ScriptConfidenceResult {
  const tiptapDoc = parseScriptToTiptapJson(plainText);

  let sceneHeadingCount = 0;
  let dialogueCount = 0;

  for (const node of tiptapDoc.content) {
    if (node.type === 'sceneHeading') sceneHeadingCount++;
    if (node.type === 'dialogueLine') dialogueCount++;
  }

  let confidence: ScriptConfidenceLevel;
  if (sceneHeadingCount === 0) {
    confidence = 'low';
  } else if (sceneHeadingCount >= MIN_SCENE_HEADINGS && dialogueCount >= MIN_DIALOGUE_LINES) {
    confidence = 'high';
  } else {
    confidence = 'ambiguous';
  }

  return { confidence, sceneHeadingCount, dialogueCount, tiptapDoc };
}
