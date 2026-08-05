import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { llmClient } from '../services/llm-client.js';
import { extractStandaloneAssetDraft } from '../services/streamlineStandaloneAssetService.js';

jest.mock('../services/llm-client.js', () => ({
  llmClient: { generate: jest.fn() },
}));

const mockGenerate = llmClient.generate as jest.MockedFunction<typeof llmClient.generate>;

function mockResponse(content: string) {
  return { content, usage: {} as never, traceId: 't', requestId: 'r', model: 'm' };
}

describe('extractStandaloneAssetDraft', () => {
  beforeEach(() => { mockGenerate.mockReset(); });

  it('parses a well-formed draft from the LLM response', async () => {
    mockGenerate.mockResolvedValue(mockResponse('{"name": "Marcus", "type": "character", "description": "A weary man in his 40s."}'));

    const draft = await extractStandaloneAssetDraft('Marcus is tired and grieving.', 'marcus-notes.txt');
    expect(draft).toEqual({ name: 'Marcus', type: 'character', description: 'A weary man in his 40s.' });
  });

  it('falls back to type "character" for an invalid type value', async () => {
    mockGenerate.mockResolvedValue(mockResponse('{"name": "The Attic", "type": "place", "description": "Dusty and dim."}'));

    const draft = await extractStandaloneAssetDraft('notes', 'attic.txt');
    expect(draft.type).toBe('character');
  });

  it('falls back to a filename-derived name when the LLM omits one', async () => {
    mockGenerate.mockResolvedValue(mockResponse('{"type": "location", "description": "A quiet room."}'));

    const draft = await extractStandaloneAssetDraft('notes', 'quiet-room.txt');
    expect(draft.name).toBe('quiet-room');
  });
});
