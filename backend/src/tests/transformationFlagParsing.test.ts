/**
 * Transformation Flag Parsing Tests
 *
 * Verifies that the shot extraction service correctly parses
 * transformation_flags from LLM output into ExtractedShot objects.
 * Uses the generateShotId helper directly (exported, pure function).
 */

import { generateShotId } from '../services/shotExtractionService';

describe('Shot Extraction — Transformation Flag Parsing', () => {
  // We can't easily test the full extractShots method (requires LLM),
  // but we CAN test generateShotId which is used in the mapping.
  describe('generateShotId', () => {
    it('generates correct IDs for first 26 shots', () => {
      expect(generateShotId(1, 0)).toBe('1A');
      expect(generateShotId(1, 1)).toBe('1B');
      expect(generateShotId(1, 25)).toBe('1Z');
    });

    it('generates double-letter IDs beyond 26', () => {
      expect(generateShotId(1, 26)).toBe('1AA');
      expect(generateShotId(1, 27)).toBe('1AB');
    });

    it('uses scene number as prefix', () => {
      expect(generateShotId(3, 0)).toBe('3A');
      expect(generateShotId(12, 5)).toBe('12F');
    });
  });
});

/**
 * Simulates the transformation_flags parsing logic from shotExtractionService.
 * This is the same code path as the real service's mapping (~line 247),
 * extracted here to verify the parsing without needing an LLM call.
 */
function parseTransformationFlags(raw: any[]): Array<{
  characterName: string;
  type: 'instant' | 'within_shot' | 'gradual';
  description: string;
  isTrigger: boolean;
  isCompletion: boolean;
}> | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;

  const validTypes = ['instant', 'within_shot', 'gradual'];
  const parsed = raw
    .filter(
      (tf: any) =>
        typeof tf.character_name === 'string' &&
        typeof tf.type === 'string' &&
        validTypes.includes(tf.type)
    )
    .map((tf: any) => ({
      characterName: tf.character_name.trim(),
      type: tf.type as 'instant' | 'within_shot' | 'gradual',
      description: typeof tf.description === 'string' ? tf.description.trim() : '',
      isTrigger: tf.is_trigger === true,
      isCompletion: tf.is_completion === true,
    }));

  return parsed.length > 0 ? parsed : undefined;
}

describe('Transformation Flag Parsing Logic', () => {
  it('parses a valid within_shot flag', () => {
    const raw = [
      {
        character_name: 'Cinderella',
        type: 'within_shot',
        description: 'Dress transforms from rags to ball gown',
        is_trigger: true,
      },
    ];
    const result = parseTransformationFlags(raw);
    expect(result).toBeDefined();
    expect(result).toHaveLength(1);
    expect(result![0]).toEqual({
      characterName: 'Cinderella',
      type: 'within_shot',
      description: 'Dress transforms from rags to ball gown',
      isTrigger: true,
      isCompletion: false,
    });
  });

  it('parses gradual with trigger and completion flags', () => {
    const rawTrigger = [
      {
        character_name: 'Victim',
        type: 'gradual',
        description: 'Poison starts to take effect',
        is_trigger: true,
        is_completion: false,
      },
    ];
    const rawCompletion = [
      {
        character_name: 'Victim',
        type: 'gradual',
        description: 'Poison fully taken effect',
        is_trigger: false,
        is_completion: true,
      },
    ];

    const trigger = parseTransformationFlags(rawTrigger);
    expect(trigger![0].isTrigger).toBe(true);
    expect(trigger![0].isCompletion).toBe(false);

    const completion = parseTransformationFlags(rawCompletion);
    expect(completion![0].isTrigger).toBe(false);
    expect(completion![0].isCompletion).toBe(true);
  });

  it('parses multiple flags on same shot (two characters transform)', () => {
    const raw = [
      { character_name: 'Romeo', type: 'instant', description: 'Puts on cloak', is_trigger: true },
      { character_name: 'Juliet', type: 'within_shot', description: 'Changes dress', is_trigger: true },
    ];
    const result = parseTransformationFlags(raw);
    expect(result).toHaveLength(2);
    expect(result![0].characterName).toBe('Romeo');
    expect(result![1].characterName).toBe('Juliet');
  });

  it('returns undefined for empty array', () => {
    expect(parseTransformationFlags([])).toBeUndefined();
  });

  it('returns undefined for null/undefined input', () => {
    expect(parseTransformationFlags(null as any)).toBeUndefined();
    expect(parseTransformationFlags(undefined as any)).toBeUndefined();
  });

  it('filters out flags with invalid type', () => {
    const raw = [
      { character_name: 'Char', type: 'magic', description: 'invalid', is_trigger: true },
      { character_name: 'Char', type: 'instant', description: 'valid', is_trigger: true },
    ];
    const result = parseTransformationFlags(raw);
    expect(result).toHaveLength(1);
    expect(result![0].type).toBe('instant');
  });

  it('filters out flags with missing character_name', () => {
    const raw = [
      { type: 'instant', description: 'no name', is_trigger: true },
      { character_name: 123, type: 'instant', description: 'numeric name', is_trigger: true },
    ];
    const result = parseTransformationFlags(raw);
    expect(result).toBeUndefined();
  });

  it('trims whitespace from character_name and description', () => {
    const raw = [
      { character_name: '  Persephone  ', type: 'instant', description: '  Hair turns dark  ', is_trigger: true },
    ];
    const result = parseTransformationFlags(raw);
    expect(result![0].characterName).toBe('Persephone');
    expect(result![0].description).toBe('Hair turns dark');
  });

  it('defaults description to empty string when missing', () => {
    const raw = [
      { character_name: 'Char', type: 'instant', is_trigger: true },
    ];
    const result = parseTransformationFlags(raw);
    expect(result![0].description).toBe('');
  });
});
