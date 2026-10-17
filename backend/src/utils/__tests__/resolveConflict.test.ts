import { describe, it, expect } from '@jest/globals';
import { resolveConflict, type ConflictCandidate } from '../resolveConflict.js';

describe('resolveConflict — four-tier authority ranking (spec §2.10)', () => {
  it('returns null for an empty candidate list', () => {
    expect(resolveConflict([])).toBeNull();
  });

  it('tier 1 (explicit answer) beats tier 2 (primary doc)', () => {
    const candidates: ConflictCandidate[] = [
      { value: 'Marcus', isPrimary: true },
      { value: 'Marc', answerSource: 'freetext' },
    ];
    expect(resolveConflict(candidates)?.value).toBe('Marc');
  });

  it('tier 1 (explicit answer, option) beats tier 4 (ai_inferred)', () => {
    const candidates: ConflictCandidate[] = [
      { value: 'auto-guess', answerSource: 'ai_inferred' },
      { value: 'user-picked', answerSource: 'option' },
    ];
    expect(resolveConflict(candidates)?.value).toBe('user-picked');
  });

  it('tier 2 (primary doc) beats tier 3 (supporting doc)', () => {
    const candidates: ConflictCandidate[] = [
      { value: 'from supporting file', isPrimary: false },
      { value: 'from primary file', isPrimary: true },
    ];
    expect(resolveConflict(candidates)?.value).toBe('from primary file');
  });

  it('tier 3 (supporting doc) beats tier 4 (ai_inferred)', () => {
    const candidates: ConflictCandidate[] = [
      { value: 'ai guess', answerSource: 'ai_inferred' },
      { value: 'from supporting file', isPrimary: false },
    ];
    expect(resolveConflict(candidates)?.value).toBe('from supporting file');
  });

  it('falls through to tier 4 (ai_inferred) when nothing else is present', () => {
    const candidates: ConflictCandidate[] = [{ value: 'best guess', answerSource: 'ai_inferred' }];
    expect(resolveConflict(candidates)?.value).toBe('best guess');
  });

  it('within the same tier, the last (most recent) candidate wins — re-ask supersedes the earlier answer', () => {
    const candidates: ConflictCandidate[] = [
      { value: 'Marcus', answerSource: 'option' },
      { value: 'Marc', answerSource: 'freetext' },
    ];
    expect(resolveConflict(candidates)?.value).toBe('Marc');
  });

  it('all four tiers present at once resolves to tier 1', () => {
    const candidates: ConflictCandidate[] = [
      { value: 'ai guess', answerSource: 'ai_inferred' },
      { value: 'supporting doc value', isPrimary: false },
      { value: 'primary doc value', isPrimary: true },
      { value: 'explicit answer', answerSource: 'option' },
    ];
    expect(resolveConflict(candidates)?.value).toBe('explicit answer');
  });
});
