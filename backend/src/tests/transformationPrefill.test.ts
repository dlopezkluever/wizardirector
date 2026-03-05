/**
 * Transformation Prefill Tests (Phase B)
 *
 * Tests the generateTransformationPrefill method:
 * - Without absorbed_id: returns standard format (post_description + narrative)
 * - With absorbed_id: returns enriched format (trigger_shot_id, transformation_type, completion_shot_id)
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

// ---------------------------------------------------------------------------
// Mock Supabase + LLM
// ---------------------------------------------------------------------------

const mockFrom = jest.fn();
jest.mock('../config/supabase.js', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

const mockGenerate = jest.fn();
jest.mock('../services/llm-client.js', () => ({
  llmClient: {
    generate: (...args: unknown[]) => mockGenerate(...args),
  },
}));

import { TransformationEventService } from '../services/transformationEventService.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockChain(finalResult: { data?: unknown; error?: unknown }) {
  const proxy: any = new Proxy({}, {
    get(_target, prop) {
      if (prop === 'then') {
        return (resolve: (v: unknown) => void) => resolve(finalResult);
      }
      return jest.fn().mockReturnValue(proxy);
    },
  });
  return proxy;
}

const service = new TransformationEventService();

describe('generateTransformationPrefill', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return post_description and narrative without absorbed_id', async () => {
    // 1. Fetch trigger shot
    mockFrom.mockReturnValueOnce(
      mockChain({
        data: {
          action: 'Character removes mask',
          dialogue: null,
          setting: 'Dark alley',
          camera: 'Close-up',
          characters_foreground: ['John'],
        },
        error: null,
      })
    );
    // 2. Fetch asset instance
    mockFrom.mockReturnValueOnce(
      mockChain({
        data: {
          effective_description: 'A man wearing a black mask',
          project_asset: { name: 'John', asset_type: 'character' },
        },
        error: null,
      })
    );
    // 3. Fetch scene
    mockFrom.mockReturnValueOnce(
      mockChain({
        data: { script_excerpt: 'EXT. DARK ALLEY - NIGHT' },
        error: null,
      })
    );

    // LLM response
    mockGenerate.mockResolvedValue({
      content: JSON.stringify({
        post_description: 'A man with face fully revealed, no mask',
        transformation_narrative: 'He slowly removes the black mask revealing his face',
      }),
    });

    const result = await service.generateTransformationPrefill(
      'trigger-shot-1',
      'instance-1',
      'instant',
      'scene-1',
      // no absorbedInstanceId
    );

    expect(result.post_description).toBe('A man with face fully revealed, no mask');
    expect(result.transformation_narrative).toBe('He slowly removes the black mask revealing his face');
    // Should NOT have trigger_shot_id etc when no absorbed instance
    expect(result.trigger_shot_id).toBeUndefined();
    expect(result.transformation_type).toBeUndefined();
    expect(result.completion_shot_id).toBeUndefined();
  });

  it('should return enriched response with absorbed_id (single assignment → instant)', async () => {
    // 1. Fetch trigger shot
    mockFrom.mockReturnValueOnce(
      mockChain({
        data: {
          action: 'Character changes outfit',
          dialogue: null,
          setting: 'Bedroom',
          camera: 'Medium shot',
          characters_foreground: ['Jane'],
        },
        error: null,
      })
    );
    // 2. Fetch base asset instance
    mockFrom.mockReturnValueOnce(
      mockChain({
        data: {
          effective_description: 'A woman in a red dress',
          project_asset: { name: 'Jane', asset_type: 'character' },
        },
        error: null,
      })
    );
    // 3. Fetch scene
    mockFrom.mockReturnValueOnce(
      mockChain({
        data: { script_excerpt: 'INT. BEDROOM - DAY' },
        error: null,
      })
    );
    // 4. Fetch absorbed instance details
    mockFrom.mockReturnValueOnce(
      mockChain({
        data: {
          effective_description: 'A woman in a blue gown',
          image_key_url: 'https://example.com/blue-gown.jpg',
          project_asset: { name: 'Jane Disguised', asset_type: 'character' },
        },
        error: null,
      })
    );
    // 5. Fetch absorbed shot assignments (single = instant)
    mockFrom.mockReturnValueOnce(
      mockChain({
        data: [
          { shot_id: 'shot-3', shots: { shot_order: 2 } },
        ],
        error: null,
      })
    );

    // LLM response
    mockGenerate.mockResolvedValue({
      content: JSON.stringify({
        post_description: 'A woman in a blue gown with silver trim',
        transformation_narrative: 'She changes from her red dress into a blue gown',
      }),
    });

    const result = await service.generateTransformationPrefill(
      'trigger-shot-1',
      'instance-1',
      'instant',
      'scene-1',
      'absorbed-instance-1',
    );

    expect(result.post_description).toBe('A woman in a blue gown with silver trim');
    expect(result.transformation_narrative).toBe('She changes from her red dress into a blue gown');
    // Enriched fields from absorbed instance
    expect(result.trigger_shot_id).toBe('shot-3');
    expect(result.transformation_type).toBe('instant');
    expect(result.completion_shot_id).toBeUndefined();
  });

  it('should infer gradual type when absorbed has multiple shot assignments', async () => {
    // 1. Fetch trigger shot
    mockFrom.mockReturnValueOnce(
      mockChain({
        data: {
          action: 'Poison spreads',
          dialogue: null,
          setting: 'Lab',
          camera: 'Wide',
          characters_foreground: [],
        },
        error: null,
      })
    );
    // 2. Fetch base asset instance
    mockFrom.mockReturnValueOnce(
      mockChain({
        data: {
          effective_description: 'A clear liquid in a flask',
          project_asset: { name: 'Poison Flask', asset_type: 'prop' },
        },
        error: null,
      })
    );
    // 3. Fetch scene
    mockFrom.mockReturnValueOnce(
      mockChain({ data: { script_excerpt: 'INT. LAB - NIGHT' }, error: null })
    );
    // 4. Fetch absorbed instance
    mockFrom.mockReturnValueOnce(
      mockChain({
        data: {
          effective_description: 'A glowing green liquid',
          image_key_url: null,
          project_asset: { name: 'Transformed Flask', asset_type: 'prop' },
        },
        error: null,
      })
    );
    // 5. Fetch absorbed shot assignments (multiple = gradual)
    mockFrom.mockReturnValueOnce(
      mockChain({
        data: [
          { shot_id: 'shot-2', shots: { shot_order: 1 } },
          { shot_id: 'shot-3', shots: { shot_order: 2 } },
          { shot_id: 'shot-5', shots: { shot_order: 4 } },
        ],
        error: null,
      })
    );

    mockGenerate.mockResolvedValue({
      content: JSON.stringify({
        post_description: 'A glowing green liquid bubbling in the flask',
        transformation_narrative: 'The liquid gradually turns from clear to glowing green',
      }),
    });

    const result = await service.generateTransformationPrefill(
      'trigger-shot-1',
      'instance-1',
      'instant',
      'scene-1',
      'absorbed-instance-2',
    );

    expect(result.trigger_shot_id).toBe('shot-2'); // First assigned
    expect(result.transformation_type).toBe('gradual');
    expect(result.completion_shot_id).toBe('shot-5'); // Last assigned
  });

  it('should handle absorbed instance with no shot assignments', async () => {
    // 1. Fetch trigger shot
    mockFrom.mockReturnValueOnce(
      mockChain({
        data: {
          action: 'Action',
          dialogue: null,
          setting: 'Set',
          camera: 'Wide',
          characters_foreground: [],
        },
        error: null,
      })
    );
    // 2. Fetch base asset instance
    mockFrom.mockReturnValueOnce(
      mockChain({
        data: {
          effective_description: 'desc',
          project_asset: { name: 'Asset', asset_type: 'prop' },
        },
        error: null,
      })
    );
    // 3. Scene
    mockFrom.mockReturnValueOnce(
      mockChain({ data: { script_excerpt: '' }, error: null })
    );
    // 4. Absorbed instance
    mockFrom.mockReturnValueOnce(
      mockChain({
        data: {
          effective_description: 'absorbed desc',
          image_key_url: null,
          project_asset: { name: 'Absorbed', asset_type: 'prop' },
        },
        error: null,
      })
    );
    // 5. Absorbed shot assignments — empty
    mockFrom.mockReturnValueOnce(
      mockChain({ data: [], error: null })
    );

    mockGenerate.mockResolvedValue({
      content: JSON.stringify({
        post_description: 'post desc',
        transformation_narrative: 'narrative',
      }),
    });

    const result = await service.generateTransformationPrefill(
      'trigger-shot-1',
      'instance-1',
      'instant',
      'scene-1',
      'absorbed-no-assignments',
    );

    // No inferred values when no assignments
    expect(result.trigger_shot_id).toBeUndefined();
    expect(result.transformation_type).toBeUndefined();
    expect(result.completion_shot_id).toBeUndefined();
    // But still has the description
    expect(result.post_description).toBe('post desc');
  });

  it('should handle LLM returning markdown-fenced JSON', async () => {
    // 1. Trigger shot
    mockFrom.mockReturnValueOnce(
      mockChain({
        data: { action: 'A', dialogue: null, setting: 'S', camera: 'C', characters_foreground: [] },
        error: null,
      })
    );
    // 2. Asset instance
    mockFrom.mockReturnValueOnce(
      mockChain({
        data: { effective_description: 'd', project_asset: { name: 'X', asset_type: 'prop' } },
        error: null,
      })
    );
    // 3. Scene
    mockFrom.mockReturnValueOnce(
      mockChain({ data: { script_excerpt: '' }, error: null })
    );

    mockGenerate.mockResolvedValue({
      content: '```json\n{"post_description":"fenced post","transformation_narrative":"fenced nar"}\n```',
    });

    const result = await service.generateTransformationPrefill(
      'shot-1', 'inst-1', 'instant', 'scene-1'
    );

    expect(result.post_description).toBe('fenced post');
    expect(result.transformation_narrative).toBe('fenced nar');
  });
});
