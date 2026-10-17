import { describe, it, expect } from 'vitest';
import { getStageBadge } from '../stageBadge';

describe('getStageBadge — precedence table (spec §2.5)', () => {
  it('skipped status always yields SKIPPED, regardless of origin', () => {
    expect(getStageBadge('skipped', 'skipped')?.label).toBe('SKIPPED');
    expect(getStageBadge('skipped', undefined)?.label).toBe('SKIPPED');
  });

  it('locked + imported yields IMPORTED', () => {
    expect(getStageBadge('locked', 'imported')?.label).toBe('IMPORTED');
  });

  it('locked + ai-generated yields AUTO-FILLED with a tooltip', () => {
    const badge = getStageBadge('locked', 'ai-generated');
    expect(badge?.label).toBe('AUTO-FILLED');
    expect(badge?.tooltip).toMatch(/won't update automatically/i);
  });

  it('locked + authored or absent origin yields no badge', () => {
    expect(getStageBadge('locked', 'authored')).toBeNull();
    expect(getStageBadge('locked', undefined)).toBeNull();
    expect(getStageBadge('locked', null)).toBeNull();
  });

  it('draft status yields no badge regardless of origin', () => {
    expect(getStageBadge('active', undefined)).toBeNull();
    expect(getStageBadge('active', 'imported')).toBeNull();
  });

  it('pending status yields no badge', () => {
    expect(getStageBadge('pending', undefined)).toBeNull();
  });

  it('outdated always outranks an origin badge (safety beats provenance)', () => {
    expect(getStageBadge('outdated', 'imported')?.label).toBe('OUTDATED · Imported');
    expect(getStageBadge('outdated', 'ai-generated')?.label).toBe('OUTDATED · Auto-filled');
    expect(getStageBadge('outdated', undefined)?.label).toBe('OUTDATED');
  });
});
