/**
 * Tests for Shot Extraction and Shot Split services (Stage 7).
 * - generateShotId: pure function, no mocks.
 * - ShotExtractionService.extractShots: mocks LLM to avoid real API calls.
 * - ShotSplitService.splitShot: mocks LLM to avoid real API calls.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { generateShotId, ShotExtractionService } from '../services/shotExtractionService.js';
import { ShotSplitService } from '../services/shotSplitService.js';

// Mock LLM client so we don't call real API
const mockGenerate = jest.fn();
jest.mock('../services/llm-client.js', () => ({
  llmClient: { generate: (...args: unknown[]) => mockGenerate(...args) },
  LLMClientError: class LLMClientError extends Error {
    code?: string;
    constructor(message: string, code?: string) {
      super(message);
      this.name = 'LLMClientError';
      this.code = code;
    }
  },
}));

describe('generateShotId', () => {
  it('should produce 1A, 1B, 1C for scene 1 indices 0,1,2', () => {
    expect(generateShotId(1, 0)).toBe('1A');
    expect(generateShotId(1, 1)).toBe('1B');
    expect(generateShotId(1, 2)).toBe('1C');
  });

  it('should produce 3A, 3B for scene 3', () => {
    expect(generateShotId(3, 0)).toBe('3A');
    expect(generateShotId(3, 1)).toBe('3B');
  });

  it('should support more than 26 shots (AA, AB)', () => {
    expect(generateShotId(1, 26)).toBe('1AA');
    expect(generateShotId(1, 27)).toBe('1AB');
  });
});

describe('ShotExtractionService', () => {
  let service: ShotExtractionService;

  beforeEach(() => {
    service = new ShotExtractionService();
    mockGenerate.mockReset();
  });

  it('should parse LLM response and return validated shots with generated IDs', async () => {
    const fakeResponse = {
      content: JSON.stringify({
        shots: [
          {
            shot_order: 0,
            duration: 8,
            dialogue: 'Hello.',
            action: 'John enters the room.',
            characters: [
              { name: 'John', prominence: 'foreground' },
              { name: 'Mary', prominence: 'background' },
            ],
            setting: 'Kitchen',
            camera: 'Wide shot',
            continuity_flags: [],
            beat_reference: 'b1',
          },
          {
            shot_order: 1,
            duration: 8,
            dialogue: '',
            action: 'Mary turns around.',
            characters: [{ name: 'Mary', prominence: 'foreground' }],
            setting: 'Kitchen',
            camera: 'Close up',
            continuity_flags: [],
          },
        ],
      }),
    };
    mockGenerate.mockResolvedValue(fakeResponse);

    const result = await service.extractShots(
      'scene-uuid',
      'INT. KITCHEN - DAY\nJohn enters. Mary is at the sink.',
      2,
      undefined
    );

    expect(mockGenerate).toHaveBeenCalled();
    expect(result.shots).toHaveLength(2);
    expect(result.shots[0].shotId).toBe('2A');
    expect(result.shots[0].shotOrder).toBe(0);
    expect(result.shots[0].duration).toBe(8);
    expect(result.shots[0].action).toBe('John enters the room.');
    expect(result.shots[0].charactersForeground).toEqual(['John']);
    expect(result.shots[0].charactersBackground).toEqual(['Mary']);
    expect(result.shots[0].setting).toBe('Kitchen');
    expect(result.shots[0].camera).toBe('Wide shot');
    expect(result.shots[0].beatReference).toBe('b1');

    expect(result.shots[1].shotId).toBe('2B');
    expect(result.shots[1].action).toBe('Mary turns around.');
    expect(result.shots[1].charactersForeground).toEqual(['Mary']);
  });

  it('should discard invalid shots (missing required fields)', async () => {
    const fakeResponse = {
      content: JSON.stringify({
        shots: [
          { shot_order: 0, action: 'Valid.', setting: 'Room', camera: 'CU' },
          { shot_order: 1, action: '', setting: 'Room', camera: 'CU' }, // invalid: empty action
          { shot_order: 2, action: 'Also valid.', setting: 'Room', camera: 'WS' },
        ],
      }),
    };
    mockGenerate.mockResolvedValue(fakeResponse);

    const result = await service.extractShots('scene-uuid', 'Some script.', 1, undefined);

    expect(result.shots).toHaveLength(2);
    expect(result.shots[0].shotId).toBe('1A');
    expect(result.shots[1].shotId).toBe('1B');
  });

  it('should extract structured camera metadata from LLM output and fallback to parsing', async () => {
    const fakeResponse = {
      content: JSON.stringify({
        new_directions: [{ name: 'direction_1', alias: 'stove wall', description: 'Facing the stove' }],
        shots: [
          {
            shot_order: 0,
            duration: 8,
            action: 'Hansel backs away.',
            characters: [{ name: 'Hansel', prominence: 'foreground' }],
            setting: 'Kitchen',
            camera: 'WS - High Angle - Slow Pan Right',
            camera_distance: 'wide',
            camera_height: 'high_angle',
            camera_movement: 'slow_pan_right',
            camera_direction: 'direction_1',
          },
          {
            shot_order: 1,
            duration: 8,
            action: 'Gretel watches.',
            characters: [{ name: 'Gretel', prominence: 'foreground' }],
            setting: 'Kitchen',
            camera: 'CU - Eye Level - Static',
            // No structured fields — should fallback to parseCameraMetadata
          },
        ],
      }),
    };
    mockGenerate.mockResolvedValue(fakeResponse);

    const result = await service.extractShots('scene-uuid', 'Scene text', 1, undefined);

    // First shot: LLM-provided metadata
    expect(result.shots[0].camera_distance).toBe('wide');
    expect(result.shots[0].camera_height).toBe('high_angle');
    expect(result.shots[0].camera_movement).toBe('slow_pan_right');
    expect(result.shots[0].camera_direction_name).toBe('direction_1');

    // Second shot: fallback parsed metadata
    expect(result.shots[1].camera_distance).toBe('close');
    expect(result.shots[1].camera_height).toBe('eye_level');
    expect(result.shots[1].camera_movement).toBe('static');

    // New directions
    expect(result.newDirections).toHaveLength(1);
    expect(result.newDirections[0].name).toBe('direction_1');
    expect(result.newDirections[0].alias).toBe('stove wall');
  });

  it('should return empty array on timeout', async () => {
    mockGenerate.mockImplementation(
      () => new Promise((_, reject) => setTimeout(() => reject(new Error('Extraction timeout')), 10))
    );

    const result = await service.extractShots('scene-uuid', 'Script', 1, undefined);

    expect(result).toEqual({ shots: [], newDirections: [] });
  });
});

describe('ShotSplitService', () => {
  let service: ShotSplitService;

  beforeEach(() => {
    service = new ShotSplitService();
    mockGenerate.mockReset();
  });

  it('should return two shots with server-generated IDs (originalId-1, originalId-2)', async () => {
    const fakeResponse = {
      content: JSON.stringify({
        new_shots: [
          {
            duration: 4,
            dialogue: 'Hi.',
            action: 'John walks in.',
            characters: [{ name: 'John', prominence: 'foreground' }],
            setting: 'Kitchen',
            camera: 'Wide',
            continuity_flags: [],
            split_rationale: 'First half',
          },
          {
            duration: 4,
            dialogue: '',
            action: 'John sits down.',
            characters: [{ name: 'John', prominence: 'foreground' }],
            setting: 'Kitchen',
            camera: 'Medium',
            continuity_flags: [],
            split_rationale: 'Second half',
          },
        ],
      }),
    };
    mockGenerate.mockResolvedValue(fakeResponse);

    const originalShot = {
      shot_id: '3B',
      duration: 8,
      dialogue: 'Hi.',
      action: 'John walks in and sits down.',
      characters_foreground: ['John'],
      characters_background: [] as string[],
      setting: 'Kitchen',
      camera: 'Wide',
      continuity_flags: [] as string[],
      beat_reference: null as string | null,
    };

    const result = await service.splitShot(originalShot, 'Split when he sits');

    expect(mockGenerate).toHaveBeenCalled();
    expect(result).toHaveLength(2);
    expect(result[0].shot_id).toBe('3B-1');
    expect(result[0].duration).toBe(8);
    expect(result[0].action).toBe('John walks in.');
    expect(result[1].shot_id).toBe('3B-2');
    expect(result[1].duration).toBe(8);
    expect(result[1].action).toBe('John sits down.');
  });
});
