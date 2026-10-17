import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { llmClient } from '../services/llm-client.js';
import { analyzeBatch, type StreamlineBatchFile } from '../services/streamlineQuestionService.js';

jest.mock('../services/llm-client.js', () => ({
  llmClient: { generate: jest.fn() },
}));

const mockGenerate = llmClient.generate as jest.MockedFunction<typeof llmClient.generate>;

function mockResponse(content: string) {
  return { content, usage: {} as never, traceId: 't', requestId: 'r', model: 'm' };
}

const FILES: StreamlineBatchFile[] = [
  { id: 'f1', name: 'script.txt', text: 'INT. HOUSE - DAY\n\nMARCUS enters.', isPrimary: true },
  { id: 'f2', name: 'notes.txt', text: 'The antagonist is named Marc.', isPrimary: false },
];

describe('analyzeBatch', () => {
  beforeEach(() => { mockGenerate.mockReset(); });

  it('returns an empty array immediately for an empty batch, without calling the LLM', async () => {
    const result = await analyzeBatch([]);
    expect(result).toEqual([]);
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it('parses a well-formed question array and assigns stable ids', async () => {
    mockGenerate.mockResolvedValue(mockResponse(JSON.stringify([
      {
        category: 'contradiction',
        questionText: 'You mentioned two different names for the antagonist — which is correct?',
        options: ['Marcus', 'Marc'],
        subjectEntityType: 'character',
        subjectEntityName: 'Marcus',
        conflictingSources: ['script.txt', 'notes.txt'],
      },
    ])));

    const result = await analyzeBatch(FILES);

    expect(result).toHaveLength(1);
    expect(result[0].category).toBe('contradiction');
    expect(result[0].options.map(o => o.label)).toEqual(['Marcus', 'Marc']);
    expect(result[0].subjectEntityName).toBe('Marcus');
    expect(result[0].conflictingSources).toEqual(['script.txt', 'notes.txt']);
    expect(result[0].id).toBeTruthy();
  });

  it('drops questions with an invalid category', async () => {
    mockGenerate.mockResolvedValue(mockResponse(JSON.stringify([
      { category: 'not_a_real_category', questionText: 'Bogus?', options: ['A', 'B'] },
    ])));

    const result = await analyzeBatch(FILES);
    expect(result).toEqual([]);
  });

  it('returns an empty array when the model finds nothing worth asking', async () => {
    mockGenerate.mockResolvedValue(mockResponse('[]'));
    const result = await analyzeBatch(FILES);
    expect(result).toEqual([]);
  });

  it('never throws — returns an empty array (no session offered) if the LLM call fails', async () => {
    mockGenerate.mockRejectedValue(new Error('LLM unavailable'));
    const result = await analyzeBatch(FILES);
    expect(result).toEqual([]);
  });
});
