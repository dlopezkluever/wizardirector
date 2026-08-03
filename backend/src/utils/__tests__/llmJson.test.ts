import { describe, it, expect } from '@jest/globals';
import { extractJsonArray, extractJsonObject, LLMJsonParseError } from '../llmJson.js';

describe('extractJsonArray', () => {
  it('parses a clean JSON array', () => {
    const result = extractJsonArray('[{"a":1},{"a":2}]');
    expect(result).toEqual([{ a: 1 }, { a: 2 }]);
  });

  it('strips markdown json code fences', () => {
    const raw = '```json\n[{"a":1}]\n```';
    expect(extractJsonArray(raw)).toEqual([{ a: 1 }]);
  });

  it('strips generic markdown code fences', () => {
    const raw = '```\n[{"a":1}]\n```';
    expect(extractJsonArray(raw)).toEqual([{ a: 1 }]);
  });

  it('extracts the array when surrounded by prose', () => {
    const raw = 'Here is the result:\n[{"a":1}]\nHope that helps!';
    expect(extractJsonArray(raw)).toEqual([{ a: 1 }]);
  });

  it('repairs trailing commas', () => {
    const raw = '[{"a":1},{"a":2},]';
    expect(extractJsonArray(raw)).toEqual([{ a: 1 }, { a: 2 }]);
  });

  it('repairs truncated output by keeping the last complete object', () => {
    const raw = '[{"a":1},{"a":2},{"a":3';
    expect(extractJsonArray(raw)).toEqual([{ a: 1 }, { a: 2 }]);
  });

  it('throws LLMJsonParseError when nothing salvageable is found', () => {
    expect(() => extractJsonArray('not json at all, sorry')).toThrow(LLMJsonParseError);
  });
});

describe('extractJsonObject', () => {
  it('parses a clean JSON object', () => {
    expect(extractJsonObject('{"name":"Marcus","type":"character"}')).toEqual({
      name: 'Marcus',
      type: 'character',
    });
  });

  it('strips markdown fences and surrounding prose', () => {
    const raw = 'Sure, here you go:\n```json\n{"name":"Marcus"}\n```\nLet me know if you need more.';
    expect(extractJsonObject(raw)).toEqual({ name: 'Marcus' });
  });

  it('repairs a trailing comma', () => {
    expect(extractJsonObject('{"name":"Marcus",}')).toEqual({ name: 'Marcus' });
  });

  it('throws LLMJsonParseError for an array instead of an object', () => {
    expect(() => extractJsonObject('[1,2,3]')).toThrow(LLMJsonParseError);
  });

  it('throws LLMJsonParseError when nothing salvageable is found', () => {
    expect(() => extractJsonObject('nope')).toThrow(LLMJsonParseError);
  });
});
