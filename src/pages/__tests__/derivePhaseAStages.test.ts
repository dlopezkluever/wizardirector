import { describe, it, expect } from 'vitest';
import { derivePhaseAStages } from '../ProjectView';
import type { StageState } from '@/lib/services/stageStateService';

function stageState(overrides: Partial<StageState> & { stage_number: number; status: StageState['status'] }): StageState {
  return {
    id: `state-${overrides.stage_number}`,
    branch_id: 'branch-1',
    version: 1,
    content: {},
    origin: null,
    regeneration_guidance: '',
    created_at: '2026-01-01',
    created_by: 'user-1',
    ...overrides,
  };
}

describe('derivePhaseAStages — isPassed walk (spec §2.3)', () => {
  it('treats a locked stage as passed', () => {
    const { updatedStages, highestPassedStage } = derivePhaseAStages([
      stageState({ stage_number: 1, status: 'locked' }),
    ]);
    expect(updatedStages.find(s => s.stage === 1)?.status).toBe('locked');
    expect(highestPassedStage).toBe(1);
  });

  it('treats a skipped stage as passed, identically to locked, for derivation', () => {
    const { updatedStages, highestPassedStage } = derivePhaseAStages([
      stageState({ stage_number: 1, status: 'locked' }),
      stageState({ stage_number: 2, status: 'skipped', origin: 'skipped' }),
    ]);
    expect(updatedStages.find(s => s.stage === 2)?.status).toBe('skipped');
    expect(updatedStages.find(s => s.stage === 2)?.origin).toBe('skipped');
    expect(highestPassedStage).toBe(2);
  });

  it('derives the first non-passed stage as the active one (skip 2 and 3, land on locked 4)', () => {
    const { updatedStages, highestPassedStage, highestDraftStage } = derivePhaseAStages([
      stageState({ stage_number: 1, status: 'locked' }),
      stageState({ stage_number: 2, status: 'skipped', origin: 'skipped' }),
      stageState({ stage_number: 3, status: 'skipped', origin: 'skipped' }),
      stageState({ stage_number: 4, status: 'locked', origin: 'imported' }),
    ]);
    expect(highestPassedStage).toBe(4);
    expect(highestDraftStage).toBe(0);
    // Stage 5 has no row — the caller advances currentStage to highestPassedStage + 1 = 5.
    expect(updatedStages.find(s => s.stage === 5)?.status).toBe('pending');
  });

  it('a draft stage takes precedence over passed stages for where to resume', () => {
    const { highestDraftStage } = derivePhaseAStages([
      stageState({ stage_number: 1, status: 'locked' }),
      stageState({ stage_number: 2, status: 'draft' }),
    ]);
    expect(highestDraftStage).toBe(2);
  });

  it('carries origin through for outdated stages as secondary info', () => {
    const { updatedStages } = derivePhaseAStages([
      stageState({ stage_number: 2, status: 'outdated', origin: 'imported' }),
    ]);
    expect(updatedStages.find(s => s.stage === 2)?.status).toBe('outdated');
    expect(updatedStages.find(s => s.stage === 2)?.origin).toBe('imported');
  });

  it('stages 2-5 with no row stay pending when no stage_states exist yet', () => {
    const { updatedStages } = derivePhaseAStages([]);
    expect(updatedStages.filter(s => s.stage >= 2).every(s => s.status === 'pending')).toBe(true);
  });
});
