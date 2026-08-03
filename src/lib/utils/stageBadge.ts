import type { StageStatus, StageOrigin } from '@/types/project';

export type StageBadgeIcon = 'skip' | 'sparkles' | 'import' | 'warning' | null;

export interface StageBadgeInfo {
  label: string;
  colorClass: string;
  icon: StageBadgeIcon;
  tooltip?: string;
}

/**
 * Pure precedence function for stage badges (spec §2.5).
 *
 * | status      | origin        | badge       |
 * |-------------|---------------|-------------|
 * | skipped     | (always {})   | SKIPPED     |
 * | locked      | imported      | IMPORTED    |
 * | locked      | ai-generated  | AUTO-FILLED |
 * | locked      | authored/none | (none)      |
 * | draft       | any           | (none)      |
 * | outdated    | any           | OUTDATED (origin shown as secondary subtext) |
 * | pending     | (no row)      | (none)      |
 *
 * outdated (a staleness warning) always outranks an origin badge — safety
 * beats provenance. skipped outranks everything else trivially, since
 * nothing else co-occurs on a skipped row.
 */
export function getStageBadge(status: StageStatus, origin?: StageOrigin | null): StageBadgeInfo | null {
  if (status === 'outdated') {
    const subtext =
      origin === 'imported' ? ' · Imported'
      : origin === 'ai-generated' ? ' · Auto-filled'
      : origin === 'authored' ? ' · Authored'
      : '';
    return {
      label: `OUTDATED${subtext}`,
      colorClass: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
      icon: 'warning',
    };
  }

  if (status === 'skipped') {
    return {
      label: 'SKIPPED',
      colorClass: 'bg-slate-500/20 text-slate-400 border border-slate-500/30',
      icon: 'skip',
    };
  }

  if (status === 'locked' && origin === 'imported') {
    return {
      label: 'IMPORTED',
      colorClass: 'bg-sky-500/20 text-sky-400 border border-sky-500/30',
      icon: 'import',
    };
  }

  if (status === 'locked' && origin === 'ai-generated') {
    return {
      label: 'AUTO-FILLED',
      colorClass: 'bg-violet-500/20 text-violet-400 border border-violet-500/30',
      icon: 'sparkles',
      tooltip: "Generated from script on lock — won't update automatically if the script changes later.",
    };
  }

  // locked+authored/absent, draft/active, pending — existing rendering, no special badge.
  return null;
}
