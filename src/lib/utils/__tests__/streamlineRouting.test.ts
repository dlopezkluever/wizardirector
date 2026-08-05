import { describe, it, expect } from 'vitest';
import { computeStreamlineRouting, effectiveType } from '../streamlineRouting';
import type { StreamlineFile } from '@/components/pipeline/streamline/StreamlineDropZone';
import type { StreamlineImageCard } from '../streamlineRouting';

const FORMATTED_SCRIPT = `
INT. KITCHEN - DAY

MARCUS
It's been three days.

EXT. BACKYARD - CONTINUOUS

Marcus steps outside.

MARCUS
I can't keep doing this.

INT. KITCHEN - LATER

The mug is still there.
`;

function makeFile(overrides: Partial<StreamlineFile> & { id: string; name: string }): StreamlineFile {
  return {
    size: 100,
    mimeType: 'text/plain',
    isPrimary: false,
    status: 'success',
    source: 'upload',
    ...overrides,
  };
}

function makeImage(overrides: Partial<StreamlineImageCard> & { id: string }): StreamlineImageCard {
  return {
    imageUrl: 'https://example.com/img.png',
    name: 'Unnamed',
    type: 'character',
    description: '',
    accepted: true,
    ...overrides,
  };
}

describe('effectiveType', () => {
  it('prefers the user override over the server classification', () => {
    const file = makeFile({ id: '1', name: 'a.txt', classification: { type: 'unclassified', confidence: 0 }, typeOverride: 'treatment' });
    expect(effectiveType(file)).toBe('treatment');
  });

  it('falls back to the server classification when no override is set', () => {
    const file = makeFile({ id: '1', name: 'a.txt', classification: { type: 'beat_sheet', confidence: 0.8 } });
    expect(effectiveType(file)).toBe('beat_sheet');
  });

  it('falls back to unclassified when neither is present', () => {
    const file = makeFile({ id: '1', name: 'a.txt' });
    expect(effectiveType(file)).toBe('unclassified');
  });
});

describe('computeStreamlineRouting', () => {
  it('blocks with no files and no images', () => {
    const result = computeStreamlineRouting([], [], true);
    expect(result.canConfirm).toBe(false);
    expect(result.stageTransitions).toEqual({});
  });

  it('blocks when project configuration is incomplete', () => {
    const files = [makeFile({ id: '1', name: 'script.txt', text: FORMATTED_SCRIPT, classification: { type: 'script', confidence: 0.95 }, isPrimary: true })];
    const result = computeStreamlineRouting(files, [], false);
    expect(result.canConfirm).toBe(false);
    expect(result.lines[0]).toMatch(/project type and tonal precision/i);
  });

  it('routes a script-only submission: skip 2/3, lock 4', () => {
    const files = [makeFile({ id: '1', name: 'script.txt', text: FORMATTED_SCRIPT, classification: { type: 'script', confidence: 0.95 }, isPrimary: true })];
    const result = computeStreamlineRouting(files, [], true);

    expect(result.canConfirm).toBe(true);
    expect(result.stageTransitions['1']).toBe('locked');
    expect(result.stageTransitions['2']).toBe('skip');
    expect(result.stageTransitions['3']).toBe('skip');
    expect(result.stageTransitions['4']).toMatchObject({ status: 'locked', origin: 'imported' });
    expect((result.stageTransitions['4'] as unknown as { content: { formattedScript: string } }).content.formattedScript).toBe(FORMATTED_SCRIPT);
  });

  it('routes a script + treatment submission: fill 2, skip 3, lock 4', () => {
    const files = [
      makeFile({ id: '1', name: 'script.txt', text: FORMATTED_SCRIPT, classification: { type: 'script', confidence: 0.95 }, isPrimary: true }),
      makeFile({ id: '2', name: 'treatment.txt', text: 'A treatment about grief.', classification: { type: 'treatment', confidence: 0.9 } }),
    ];
    const result = computeStreamlineRouting(files, [], true);

    expect(result.stageTransitions['2']).toMatchObject({ status: 'locked', origin: 'imported' });
    expect(result.stageTransitions['3']).toBe('skip');
    expect(result.stageTransitions['4']).toMatchObject({ status: 'locked' });
  });

  it('uses the AI-formatted text over the raw text when present', () => {
    const files = [
      makeFile({
        id: '1',
        name: 'notes.txt',
        text: 'loose notes',
        classification: { type: 'treatment', confidence: 0.4 },
        isPrimary: true,
        formatChoice: 'ai-format',
        formattedText: 'A polished treatment.',
      }),
    ];
    const result = computeStreamlineRouting(files, [], true);
    const stage2 = result.stageTransitions['2'] as unknown as { content: { variations: Array<{ content: string }> } };
    expect(stage2.content.variations[0].content).toBe('A polished treatment.');
  });

  it('routes a beat-sheet-only submission: skip 2, lock 3, no stage 4 transition', () => {
    const files = [makeFile({ id: '1', name: 'beats.txt', text: 'beat notes', classification: { type: 'beat_sheet', confidence: 0.8 }, isPrimary: true })];
    const result = computeStreamlineRouting(files, [], true);

    expect(result.stageTransitions['2']).toBe('skip');
    expect(result.stageTransitions['3']).toMatchObject({ status: 'locked' });
    expect(result.stageTransitions['4']).toBeUndefined();
  });

  it('routes a treatment-only submission: lock 2 only, leaving 3/4 untouched', () => {
    const files = [makeFile({ id: '1', name: 'treatment.txt', text: 'a treatment', classification: { type: 'treatment', confidence: 0.9 }, isPrimary: true })];
    const result = computeStreamlineRouting(files, [], true);

    expect(result.stageTransitions['2']).toMatchObject({ status: 'locked' });
    expect(result.stageTransitions['3']).toBeUndefined();
    expect(result.stageTransitions['4']).toBeUndefined();
  });

  it('a low-confidence unclassified batch with no narrative material is blocked', () => {
    const files = [makeFile({ id: '1', name: 'mystery.txt', text: 'hmm', classification: { type: 'unclassified', confidence: 0 }, isPrimary: true })];
    const result = computeStreamlineRouting(files, [], true);

    expect(result.canConfirm).toBe(false);
    expect(result.stageTransitions).toEqual({});
  });

  it('character_notes files with no narrative material still produce a valid asset-only commit', () => {
    const files = [
      makeFile({
        id: '1', name: 'marcus.txt', text: 'Marcus notes', isPrimary: true,
        classification: { type: 'character_notes', confidence: 0.8 },
        assetDraft: { name: 'Marcus', type: 'character', description: 'A weary man.' },
      }),
    ];
    const result = computeStreamlineRouting(files, [], true);

    expect(result.canConfirm).toBe(true);
    expect(result.stageTransitions['1']).toBe('locked');
    expect(result.stageTransitions['2']).toBeUndefined();
    expect(result.assetDrafts).toEqual([{ sourceFileId: '1', name: 'Marcus', type: 'character', description: 'A weary man.' }]);
  });

  it('includes accepted images as asset drafts and excludes skipped ones', () => {
    const files = [makeFile({ id: '1', name: 'script.txt', text: FORMATTED_SCRIPT, classification: { type: 'script', confidence: 0.95 }, isPrimary: true })];
    const images = [
      makeImage({ id: 'img1', name: 'Marcus', accepted: true }),
      makeImage({ id: 'img2', name: 'Skip Me', accepted: false }),
    ];
    const result = computeStreamlineRouting(files, images, true);

    expect(result.assetDrafts).toHaveLength(1);
    expect(result.assetDrafts[0].name).toBe('Marcus');
  });

  it('a script that fails client-side confidence (e.g. corrupted extraction) does not get routed as a script', () => {
    const files = [makeFile({ id: '1', name: 'weird.txt', text: 'no scene headings here', classification: { type: 'script', confidence: 0.5 }, isPrimary: true })];
    const result = computeStreamlineRouting(files, [], true);

    // No scene headings in the actual text -> isUsableScript() is false regardless of the server's classification guess.
    expect(result.stageTransitions['4']).toBeUndefined();
    expect(result.canConfirm).toBe(false);
  });
});
