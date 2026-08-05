import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { llmClient } from '../services/llm-client.js';
import { formatAsTreatment, formatAsBeatSheet } from '../services/streamlineFormattingService.js';

jest.mock('../services/llm-client.js', () => ({
  llmClient: { generate: jest.fn() },
}));

const mockGenerate = llmClient.generate as jest.MockedFunction<typeof llmClient.generate>;

function mockResponse(content: string) {
  return { content, usage: {} as never, traceId: 't', requestId: 'r', model: 'm' };
}

describe('formatAsTreatment', () => {
  beforeEach(() => { mockGenerate.mockReset(); });

  it('returns the trimmed LLM prose response', async () => {
    mockGenerate.mockResolvedValue(mockResponse('  A cohesive treatment about grief.  \n'));

    const result = await formatAsTreatment('loose notes about a grieving man');
    expect(result).toBe('A cohesive treatment about grief.');
  });
});

describe('formatAsBeatSheet', () => {
  beforeEach(() => { mockGenerate.mockReset(); });

  it('parses a JSON beat array and computes total runtime', async () => {
    mockGenerate.mockResolvedValue(mockResponse(JSON.stringify([
      { order: 1, text: 'Setup', rationale: 'establishes status quo', estimatedScreenTimeSeconds: 30 },
      { order: 2, text: 'Inciting incident', estimatedScreenTimeSeconds: 20 },
    ])));

    const result = await formatAsBeatSheet('loose notes describing a three-act structure');

    expect(result.beats).toHaveLength(2);
    expect(result.beats[0]).toMatchObject({ order: 1, text: 'Setup', rationale: 'establishes status quo', estimatedScreenTimeSeconds: 30 });
    expect(result.beats[0].id).toBeTruthy();
    expect(result.totalEstimatedRuntime).toBe(50);
  });

  it('defaults missing order/estimatedScreenTimeSeconds fields', async () => {
    mockGenerate.mockResolvedValue(mockResponse(JSON.stringify([{ text: 'Beat with no metadata' }])));

    const result = await formatAsBeatSheet('sparse notes');
    expect(result.beats[0].order).toBe(1);
    expect(result.beats[0].estimatedScreenTimeSeconds).toBe(0);
  });
});
