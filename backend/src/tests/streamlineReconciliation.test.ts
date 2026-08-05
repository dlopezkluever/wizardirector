import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { llmClient } from '../services/llm-client.js';
import { reconcileDocuments } from '../services/streamlineReconciliationService.js';
import type { StreamlineBatchFile } from '../services/streamlineQuestionService.js';

jest.mock('../services/llm-client.js', () => ({
  llmClient: { generate: jest.fn() },
}));

const mockGenerate = llmClient.generate as jest.MockedFunction<typeof llmClient.generate>;

function mockResponse(content: string) {
  return { content, usage: {} as never, traceId: 't', requestId: 'r', model: 'm' };
}

const FILES: StreamlineBatchFile[] = [
  { id: 'f1', name: 'notes.txt', text: 'The antagonist is named Marc.', isPrimary: true },
];

describe('reconcileDocuments', () => {
  beforeEach(() => { mockGenerate.mockReset(); });

  it('short-circuits to an empty array with no LLM call when there are no Q&A pairs (declined session)', async () => {
    const result = await reconcileDocuments(FILES, []);
    expect(result).toEqual([]);
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it('short-circuits to an empty array when there are no files', async () => {
    const result = await reconcileDocuments([], [{ questionText: 'q', selectedAnswer: 'a' }]);
    expect(result).toEqual([]);
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it('parses a well-formed reconciliation result and maps it back to the source file', async () => {
    mockGenerate.mockResolvedValue(mockResponse(JSON.stringify([
      {
        fileName: 'notes.txt',
        editScope: 'word_patch',
        reconciledText: 'The antagonist is named Marcus.',
        diffSummary: 'Corrected "Marc" to "Marcus".',
      },
    ])));

    const result = await reconcileDocuments(FILES, [{ questionText: 'Which name is correct?', selectedAnswer: 'Marcus', subjectEntityName: 'Marcus' }]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      fileId: 'f1',
      fileName: 'notes.txt',
      editScope: 'word_patch',
      reconciledText: 'The antagonist is named Marcus.',
      diffSummary: 'Corrected "Marc" to "Marcus".',
    });
  });

  it('ignores reconciled documents that reference an unknown filename', async () => {
    mockGenerate.mockResolvedValue(mockResponse(JSON.stringify([
      { fileName: 'unknown.txt', editScope: 'word_patch', reconciledText: 'x', diffSummary: 'y' },
    ])));

    const result = await reconcileDocuments(FILES, [{ questionText: 'q', selectedAnswer: 'a' }]);
    expect(result).toEqual([]);
  });

  it('defaults an invalid editScope to paragraph_rewrite', async () => {
    mockGenerate.mockResolvedValue(mockResponse(JSON.stringify([
      { fileName: 'notes.txt', editScope: 'not_a_real_scope', reconciledText: 'updated text', diffSummary: 'changed something' },
    ])));

    const result = await reconcileDocuments(FILES, [{ questionText: 'q', selectedAnswer: 'a' }]);
    expect(result[0].editScope).toBe('paragraph_rewrite');
  });

  it('omits documents the model decided need no change', async () => {
    mockGenerate.mockResolvedValue(mockResponse('[]'));
    const result = await reconcileDocuments(FILES, [{ questionText: 'q', selectedAnswer: 'a' }]);
    expect(result).toEqual([]);
  });
});
