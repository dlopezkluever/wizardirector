import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { llmClient } from '../services/llm-client.js';
import { classifyFile } from '../services/streamlineClassificationService.js';

jest.mock('../services/llm-client.js', () => ({
  llmClient: { generate: jest.fn() },
}));

const mockGenerate = llmClient.generate as jest.MockedFunction<typeof llmClient.generate>;

function mockResponse(content: string) {
  return { content, usage: {} as never, traceId: 't', requestId: 'r', model: 'm' };
}

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

const TREATMENT_PROSE = `Marcus is a man haunted by routine. He hasn't left the house in days. This treatment explores grief through the mundane.`;

describe('classifyFile', () => {
  beforeEach(() => {
    mockGenerate.mockReset();
  });


  it('classifies a well-formatted script deterministically, without calling the LLM', async () => {
    const result = await classifyFile(FORMATTED_SCRIPT, 'script.txt');
    expect(result.type).toBe('script');
    expect(result.confidence).toBeGreaterThan(0.9);
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it('classifies prose via the LLM when there are no scene headings', async () => {
    mockGenerate.mockResolvedValue(mockResponse('{"type": "treatment", "confidence": 0.82}'));

    const result = await classifyFile(TREATMENT_PROSE, 'treatment.txt');
    expect(result).toEqual({ type: 'treatment', confidence: 0.82 });
    expect(mockGenerate).toHaveBeenCalledTimes(1);
  });

  it('strips markdown fences from the LLM response before parsing', async () => {
    mockGenerate.mockResolvedValue(mockResponse('```json\n{"type": "character_notes", "confidence": 0.7}\n```'));

    const result = await classifyFile(TREATMENT_PROSE, 'notes.txt');
    expect(result.type).toBe('character_notes');
  });

  it('falls back to unclassified when the LLM returns an invalid type', async () => {
    mockGenerate.mockResolvedValue(mockResponse('{"type": "screenplay", "confidence": 0.9}'));

    const result = await classifyFile(TREATMENT_PROSE, 'mystery.txt');
    expect(result.type).toBe('unclassified');
  });

  it('falls back to unclassified (never throws) when the LLM call fails', async () => {
    mockGenerate.mockRejectedValue(new Error('LLM unavailable'));

    const result = await classifyFile(TREATMENT_PROSE, 'notes.txt');
    expect(result).toEqual({ type: 'unclassified', confidence: 0 });
  });
});
