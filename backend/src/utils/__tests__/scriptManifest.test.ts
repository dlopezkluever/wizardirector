import { describe, it, expect } from '@jest/globals';
import {
  getNodeText,
  parseDialogueLine,
  extractManifest,
  type TipTapNode,
} from '../scriptManifest.js';

// ── getNodeText ────────────────────────────────────────────────────────

describe('getNodeText', () => {
  it('should extract text from a leaf node', () => {
    const node: TipTapNode = { type: 'text', text: 'Hello' };
    expect(getNodeText(node)).toBe('Hello');
  });

  it('should return empty string for node without text or content', () => {
    const node: TipTapNode = { type: 'paragraph' };
    expect(getNodeText(node)).toBe('');
  });

  it('should recursively extract text from nested nodes', () => {
    const node: TipTapNode = {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Hello ' },
        { type: 'text', text: 'World' },
      ],
    };
    expect(getNodeText(node)).toBe('Hello World');
  });

  it('should handle deeply nested content', () => {
    const node: TipTapNode = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Deep' },
          ],
        },
      ],
    };
    expect(getNodeText(node)).toBe('Deep');
  });
});

// ── parseDialogueLine ──────────────────────────────────────────────────

describe('parseDialogueLine', () => {
  it('should parse simple character dialogue', () => {
    const result = parseDialogueLine('JOHN: "Hello there."');
    expect(result).not.toBeNull();
    expect(result!.characterName).toBe('JOHN');
    expect(result!.dialogue).toBe('Hello there.');
    expect(result!.extensions).toEqual([]);
    expect(result!.parenthetical).toBeNull();
  });

  it('should parse character with V.O. extension', () => {
    const result = parseDialogueLine('SARAH (V.O.): "I remember that day."');
    expect(result).not.toBeNull();
    expect(result!.characterName).toBe('SARAH');
    expect(result!.extensions).toEqual(['V.O.']);
    expect(result!.dialogue).toBe('I remember that day.');
  });

  it('should parse character with O.S. extension', () => {
    const result = parseDialogueLine('MIKE (O.S.): "Over here!"');
    expect(result).not.toBeNull();
    expect(result!.characterName).toBe('MIKE');
    expect(result!.extensions).toEqual(['O.S.']);
  });

  it('should parse parenthetical', () => {
    const result = parseDialogueLine('JOHN: (whispering) "Be quiet."');
    expect(result).not.toBeNull();
    expect(result!.parenthetical).toBe('(whispering)');
    expect(result!.dialogue).toBe('Be quiet.');
  });

  it('should return null for text without colon', () => {
    expect(parseDialogueLine('No colon here')).toBeNull();
  });

  it('should handle dialogue without quotes', () => {
    const result = parseDialogueLine('JOHN: Hello there.');
    expect(result).not.toBeNull();
    expect(result!.dialogue).toBe('Hello there.');
  });

  it('should handle empty dialogue after colon', () => {
    const result = parseDialogueLine('JOHN:');
    expect(result).not.toBeNull();
    expect(result!.characterName).toBe('JOHN');
    expect(result!.dialogue).toBe('');
  });
});

// ── extractManifest ────────────────────────────────────────────────────

describe('extractManifest', () => {
  const makeDoc = (nodes: TipTapNode[]): TipTapNode => ({
    type: 'doc',
    content: nodes,
  });

  const sceneHeading = (text: string): TipTapNode => ({
    type: 'sceneHeading',
    content: [{ type: 'text', text }],
  });

  const action = (text: string): TipTapNode => ({
    type: 'action',
    content: [{ type: 'text', text }],
  });

  const dialogueLine = (text: string): TipTapNode => ({
    type: 'dialogueLine',
    content: [{ type: 'text', text }],
  });

  it('should extract scenes from a TipTap doc', () => {
    const doc = makeDoc([
      sceneHeading('INT. KITCHEN - DAY'),
      action('John enters the room.'),
      sceneHeading('EXT. GARDEN - NIGHT'),
      action('Sarah reads a book.'),
    ]);

    const manifest = extractManifest(doc);
    expect(manifest.scenes).toHaveLength(2);
    expect(manifest.scenes[0].intExt).toBe('INT');
    expect(manifest.scenes[0].location).toBe('KITCHEN');
    expect(manifest.scenes[0].timeOfDay).toBe('DAY');
    expect(manifest.scenes[1].intExt).toBe('EXT');
    expect(manifest.scenes[1].location).toBe('GARDEN');
  });

  it('should extract characters from dialogue nodes', () => {
    const doc = makeDoc([
      sceneHeading('INT. OFFICE - DAY'),
      dialogueLine('JOHN: "Good morning."'),
      dialogueLine('SARAH: "Hello."'),
      dialogueLine('JOHN: "How are you?"'),
    ]);

    const manifest = extractManifest(doc);
    expect(manifest.globalCharacters.size).toBe(2);

    const john = manifest.globalCharacters.get('JOHN');
    expect(john).toBeDefined();
    expect(john!.dialogueCount).toBe(2);
    expect(john!.sceneNumbers).toEqual([1]);

    const sarah = manifest.globalCharacters.get('SARAH');
    expect(sarah).toBeDefined();
    expect(sarah!.dialogueCount).toBe(1);
  });

  it('should find characters mentioned in action nodes', () => {
    const doc = makeDoc([
      sceneHeading('INT. ROOM - DAY'),
      dialogueLine('JOHN: "Hello."'),
      sceneHeading('EXT. PARK - NIGHT'),
      action('JOHN walks through the park.'),
    ]);

    const manifest = extractManifest(doc);
    const john = manifest.globalCharacters.get('JOHN');
    expect(john).toBeDefined();
    // JOHN appears in scene 1 (dialogue) and scene 2 (action)
    expect(john!.sceneNumbers).toContain(1);
    expect(john!.sceneNumbers).toContain(2);
  });

  it('should extract global locations', () => {
    const doc = makeDoc([
      sceneHeading('INT. KITCHEN - DAY'),
      action('Action.'),
      sceneHeading('EXT. GARDEN - NIGHT'),
      action('Action.'),
      sceneHeading('INT. KITCHEN - NIGHT'),
      action('Action.'),
    ]);

    const manifest = extractManifest(doc);
    // KITCHEN appears twice but should be deduplicated
    expect(manifest.globalLocations).toContain('KITCHEN');
    expect(manifest.globalLocations).toContain('GARDEN');
  });

  it('should extract CAPS props from action nodes', () => {
    const doc = makeDoc([
      sceneHeading('INT. ROOM - DAY'),
      action('John picks up the GOLDEN COMPASS from the table.'),
    ]);

    const manifest = extractManifest(doc);
    const propKeys = Array.from(manifest.globalProps.keys());
    expect(propKeys).toContain('golden compass');
  });

  it('should filter out screenplay terms from props', () => {
    const doc = makeDoc([
      sceneHeading('INT. ROOM - DAY'),
      action('CUT TO the window. FADE OUT slowly.'),
    ]);

    const manifest = extractManifest(doc);
    const propKeys = Array.from(manifest.globalProps.keys());
    expect(propKeys).not.toContain('cut');
    expect(propKeys).not.toContain('fade');
  });

  it('should not count known characters as props', () => {
    const doc = makeDoc([
      sceneHeading('INT. ROOM - DAY'),
      dialogueLine('SARAH: "Hello."'),
      action('SARAH picks up the book.'),
    ]);

    const manifest = extractManifest(doc);
    const propKeys = Array.from(manifest.globalProps.keys());
    expect(propKeys).not.toContain('sarah');
  });

  it('should handle empty document', () => {
    const doc = makeDoc([]);

    const manifest = extractManifest(doc);
    expect(manifest.scenes).toHaveLength(0);
    expect(manifest.globalCharacters.size).toBe(0);
    expect(manifest.globalLocations).toHaveLength(0);
    expect(manifest.globalProps.size).toBe(0);
  });

  it('should track speaking characters per scene', () => {
    const doc = makeDoc([
      sceneHeading('INT. ROOM - DAY'),
      dialogueLine('JOHN: "Hello."'),
      dialogueLine('SARAH: "Hi."'),
      sceneHeading('EXT. PARK - NIGHT'),
      action('SARAH walks through the park.'),
    ]);

    const manifest = extractManifest(doc);
    // Scene 1: both JOHN and SARAH speak
    expect(manifest.scenes[0].speakingCharacters).toContain('JOHN');
    expect(manifest.scenes[0].speakingCharacters).toContain('SARAH');
    // Scene 2: SARAH appears in action (enriched from dialogue detection)
    expect(manifest.scenes[1].characters).toContain('SARAH');
    // SARAH doesn't speak in scene 2
    expect(manifest.scenes[1].speakingCharacters).not.toContain('SARAH');
  });
});
