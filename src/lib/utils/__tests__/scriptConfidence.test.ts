import { describe, it, expect } from 'vitest';
import { detectScriptConfidence } from '../scriptConfidence';

const FORMATTED_SCRIPT = `
INT. KITCHEN - DAY

MARCUS stands at the counter, staring at a cold cup of coffee.

MARCUS
(quietly)
It's been three days.

He picks up the mug, sets it back down.

EXT. BACKYARD - CONTINUOUS

Marcus steps outside into the grey morning light.

MARCUS
I can't keep doing this.

INT. KITCHEN - LATER

The mug is still there.
`;

const AMBIGUOUS_SNIPPET = `
INT. KITCHEN - DAY

A cold, quiet room. Nothing moves for a long moment.
`;

const PROSE_NOTES = `
Marcus is a man haunted by routine. He hasn't left the house in days.
This treatment explores grief through the mundane — coffee, silence, the
same four walls. No scene structure yet, just a mood.
`;

describe('detectScriptConfidence', () => {
  it('classifies a formatted screenplay with headings and dialogue as high confidence', () => {
    const result = detectScriptConfidence(FORMATTED_SCRIPT);
    expect(result.confidence).toBe('high');
    expect(result.sceneHeadingCount).toBeGreaterThanOrEqual(3);
    expect(result.dialogueCount).toBeGreaterThanOrEqual(1);
  });

  it('classifies a single heading with no dialogue as ambiguous', () => {
    const result = detectScriptConfidence(AMBIGUOUS_SNIPPET);
    expect(result.confidence).toBe('ambiguous');
    expect(result.sceneHeadingCount).toBe(1);
    expect(result.dialogueCount).toBe(0);
  });

  it('classifies plain prose with no scene headings as low confidence', () => {
    const result = detectScriptConfidence(PROSE_NOTES);
    expect(result.confidence).toBe('low');
    expect(result.sceneHeadingCount).toBe(0);
  });

  it('always returns the parsed tiptap doc alongside the confidence result', () => {
    const result = detectScriptConfidence(FORMATTED_SCRIPT);
    expect(result.tiptapDoc.type).toBe('doc');
    expect(Array.isArray(result.tiptapDoc.content)).toBe(true);
  });
});
