/**
 * Streamline Phase 4 — ContextManager's Ask Auteur injection (Task 4.6/4.9).
 * Only exercises the pure formatting methods (prepareStageContext,
 * formatForInjection) with a manually-built GlobalContext — no DB calls,
 * no mocking needed.
 */

import { describe, it, expect } from '@jest/globals';
import { ContextManager, type GlobalContext, type IntakeResolution } from '../services/contextManager.js';

const contextManager = new ContextManager();

const baseContext: GlobalContext = {
  projectId: 'project-1',
  branchId: 'branch-1',
  projectParams: {
    targetLengthMin: 180,
    targetLengthMax: 300,
    projectType: 'narrative',
    contentRating: 'PG-13',
    genres: ['Drama'],
    tonalPrecision: 'Quiet and melancholic',
  },
};

const resolutions: IntakeResolution[] = [
  { questionText: 'Antagonist name?', selectedAnswer: 'The antagonist is named Marcus, not Marc.', subjectEntityType: 'character', subjectEntityName: 'Marcus' },
  { questionText: 'What genre?', selectedAnswer: null, subjectEntityType: null, subjectEntityName: null },
];

describe('ContextManager — Ask Auteur established facts injection', () => {
  it('formatAuteurResolutions produces the ESTABLISHED FACTS block', () => {
    const formatted = contextManager.formatAuteurResolutions(resolutions);
    expect(formatted).toContain('ESTABLISHED FACTS (do not contradict):');
    expect(formatted).toContain('Marcus: The antagonist is named Marcus, not Marc.');
    expect(formatted).toContain('What genre?');
  });

  it('formatForInjection includes established facts when present', () => {
    const injected = contextManager.formatForInjection({ ...baseContext, auteurResolutions: resolutions });
    expect(injected).toContain('ESTABLISHED FACTS (do not contradict):');
  });

  it('formatForInjection omits the block entirely when there are no resolutions', () => {
    const injected = contextManager.formatForInjection(baseContext);
    expect(injected).not.toContain('ESTABLISHED FACTS');
  });

  it('Stage 2 (treatment) context includes established facts', async () => {
    const stageContext = await contextManager.prepareStageContext(2, { ...baseContext, auteurResolutions: resolutions });
    expect(stageContext.formattedContext).toContain('ESTABLISHED FACTS (do not contradict):');
  });

  it('Stage 3 (beat sheet) context includes established facts', async () => {
    const stageContext = await contextManager.prepareStageContext(3, { ...baseContext, auteurResolutions: resolutions });
    expect(stageContext.formattedContext).toContain('ESTABLISHED FACTS (do not contradict):');
  });

  it('Stage 4 (script) context includes established facts alongside the beat sheet reference', async () => {
    const stageContext = await contextManager.prepareStageContext(4, {
      ...baseContext,
      auteurResolutions: resolutions,
      beatSheet: [{ id: 'b1', order: 1, text: 'Setup', estimatedScreenTimeSeconds: 30 }],
    });
    expect(stageContext.formattedContext).toContain('ESTABLISHED FACTS (do not contradict):');
    expect(stageContext.formattedContext).toContain('Beat Sheet Reference:');
  });

  it('stage contexts omit the block when no resolutions exist yet (expected for early/fresh projects)', async () => {
    const stageContext = await contextManager.prepareStageContext(2, baseContext);
    expect(stageContext.formattedContext).not.toContain('ESTABLISHED FACTS');
  });
});
