import { describe, it, expect } from 'vitest';
import {
  parseScriptToTiptapJson,
  tiptapJsonToPlainText,
  stripHtmlTags,
} from '../screenplay-converter';

// ── stripHtmlTags ──────────────────────────────────────────────────────

describe('stripHtmlTags', () => {
  it('should strip simple HTML tags', () => {
    expect(stripHtmlTags('<center>FADE IN:</center>')).toBe('FADE IN:');
  });

  it('should strip nested tags', () => {
    expect(stripHtmlTags('<div><b>Bold</b> text</div>')).toBe('Bold text');
  });

  it('should return plain text unchanged', () => {
    expect(stripHtmlTags('No tags here')).toBe('No tags here');
  });

  it('should handle self-closing tags', () => {
    expect(stripHtmlTags('Line one<br/>Line two')).toBe('Line oneLine two');
  });

  it('should handle empty string', () => {
    expect(stripHtmlTags('')).toBe('');
  });
});

// ── parseScriptToTiptapJson ────────────────────────────────────────────

describe('parseScriptToTiptapJson', () => {
  it('should parse a scene heading', () => {
    const doc = parseScriptToTiptapJson('INT. KITCHEN - DAY\n\nJohn enters.');
    expect(doc.type).toBe('doc');
    expect(doc.content[0].type).toBe('sceneHeading');
    expect(doc.content[0].content?.[0].text).toBe('INT. KITCHEN - DAY');
  });

  it('should parse action lines', () => {
    const doc = parseScriptToTiptapJson('INT. ROOM - NIGHT\n\nJohn walks to the door.');
    const actionNode = doc.content.find(n => n.type === 'action');
    expect(actionNode).toBeDefined();
    expect(actionNode!.content?.[0].text).toBe('John walks to the door.');
  });

  it('should parse character + dialogue blocks', () => {
    const script = `INT. OFFICE - DAY

JOHN
Hello there.`;

    const doc = parseScriptToTiptapJson(script);
    const dialogueNode = doc.content.find(n => n.type === 'dialogueLine');
    expect(dialogueNode).toBeDefined();
    const text = dialogueNode!.content?.[0].text || '';
    expect(text).toContain('JOHN');
    expect(text).toContain('Hello there.');
  });

  it('should parse parentheticals within dialogue', () => {
    const script = `INT. OFFICE - DAY

SARAH
(whispering)
Be quiet.`;

    const doc = parseScriptToTiptapJson(script);
    const dialogueNode = doc.content.find(n => n.type === 'dialogueLine');
    const text = dialogueNode!.content?.[0].text || '';
    expect(text).toContain('SARAH');
    expect(text).toContain('(whispering)');
    expect(text).toContain('Be quiet.');
  });

  it('should parse transitions', () => {
    const doc = parseScriptToTiptapJson('FADE IN.\n\nINT. ROOM - DAY\n\nAction.\n\nCUT TO:');
    const transitions = doc.content.filter(n => n.type === 'transition');
    expect(transitions.length).toBe(2);
  });

  it('should handle empty input', () => {
    const doc = parseScriptToTiptapJson('');
    expect(doc.type).toBe('doc');
    expect(doc.content.length).toBe(1);
    expect(doc.content[0].type).toBe('paragraph');
  });

  it('should handle multiple scenes', () => {
    const script = `INT. KITCHEN - DAY

John cooks.

EXT. GARDEN - NIGHT

Sarah reads.`;

    const doc = parseScriptToTiptapJson(script);
    const headings = doc.content.filter(n => n.type === 'sceneHeading');
    expect(headings.length).toBe(2);
    expect(headings[0].content?.[0].text).toBe('INT. KITCHEN - DAY');
    expect(headings[1].content?.[0].text).toBe('EXT. GARDEN - NIGHT');
  });

  it('should handle multi-line dialogue', () => {
    const script = `INT. ROOM - DAY

JOHN
I need to tell you something.
It is very important.`;

    const doc = parseScriptToTiptapJson(script);
    const dialogueNode = doc.content.find(n => n.type === 'dialogueLine');
    const text = dialogueNode!.content?.[0].text || '';
    expect(text).toContain('I need to tell you something.');
    expect(text).toContain('It is very important.');
  });

  it('should strip residual HTML tags from input', () => {
    const script = '<center>FADE IN.</center>\n\nINT. ROOM - DAY\n\nAction.';
    const doc = parseScriptToTiptapJson(script);
    const transition = doc.content.find(n => n.type === 'transition');
    expect(transition).toBeDefined();
    expect(transition!.content?.[0].text).toBe('FADE IN.');
  });

  it('should strip blockquote markers from input', () => {
    const script = '> INT. ROOM - DAY\n>\n> John enters.';
    const doc = parseScriptToTiptapJson(script);
    const heading = doc.content.find(n => n.type === 'sceneHeading');
    expect(heading).toBeDefined();
    expect(heading!.content?.[0].text).toBe('INT. ROOM - DAY');
  });
});

// ── tiptapJsonToPlainText ──────────────────────────────────────────────

describe('tiptapJsonToPlainText', () => {
  it('should convert scene headings to uppercase', () => {
    const doc = parseScriptToTiptapJson('INT. Kitchen - Day\n\nAction.');
    const text = tiptapJsonToPlainText(doc);
    expect(text).toContain('INT. KITCHEN - DAY');
  });

  it('should convert transitions to uppercase', () => {
    const doc = parseScriptToTiptapJson('CUT TO:');
    const text = tiptapJsonToPlainText(doc);
    expect(text).toContain('CUT TO:');
  });

  it('should handle null/undefined doc gracefully', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(tiptapJsonToPlainText(null as unknown as any)).toBe('');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(tiptapJsonToPlainText({ type: 'doc', content: null as unknown as any })).toBe('');
  });

  it('should handle empty doc', () => {
    const result = tiptapJsonToPlainText({ type: 'doc', content: [] });
    expect(result).toBe('');
  });

  it('should preserve dialogue structure', () => {
    const script = `INT. ROOM - DAY

JOHN
Hello world.`;

    const doc = parseScriptToTiptapJson(script);
    const plainText = tiptapJsonToPlainText(doc);
    expect(plainText).toContain('JOHN');
    expect(plainText).toContain('Hello world.');
  });
});

// ── Round-trip fidelity ────────────────────────────────────────────────

describe('Round-trip fidelity', () => {
  it('should preserve scene headings through parse -> serialize', () => {
    const original = 'INT. KITCHEN - DAY';
    const doc = parseScriptToTiptapJson(original + '\n\nJohn cooks.');
    const result = tiptapJsonToPlainText(doc);
    expect(result).toContain(original);
  });

  it('should preserve action text through parse -> serialize', () => {
    const doc = parseScriptToTiptapJson('INT. ROOM - DAY\n\nThe door creaks open slowly.');
    const result = tiptapJsonToPlainText(doc);
    expect(result).toContain('The door creaks open slowly.');
  });

  it('should preserve character names through parse -> serialize', () => {
    const script = `INT. ROOM - DAY

SARAH
Good morning.`;

    const doc = parseScriptToTiptapJson(script);
    const result = tiptapJsonToPlainText(doc);
    expect(result).toContain('SARAH');
    expect(result).toContain('Good morning.');
  });
});
