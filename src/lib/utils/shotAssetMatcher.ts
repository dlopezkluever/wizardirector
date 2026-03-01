/**
 * shotAssetMatcher — heuristic matching of assets to shots based on name/field overlap.
 * Used to pre-check matching shots in the Asset Drawer checklist (§4).
 */

import type { Shot } from '@/types/scene';

export interface MatchableAsset {
  name: string;
  asset_type: 'character' | 'prop' | 'location';
  description?: string;
}

export interface ShotMatchResult {
  shotId: string;
  matched: boolean;
  confidence: number; // 0–1
  matchReason: string;
}

/**
 * Normalize a string for fuzzy comparison: lowercase, trim, collapse whitespace.
 */
function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Check if `needle` appears as a substring in `haystack` (case-insensitive).
 * Also checks individual words from multi-word names.
 */
function fuzzyContains(haystack: string, needle: string): boolean {
  const h = normalize(haystack);
  const n = normalize(needle);
  if (!h || !n) return false;
  // Direct substring
  if (h.includes(n)) return true;
  // For multi-word names, check if all significant words appear
  const words = n.split(' ').filter(w => w.length > 2); // skip short words like "a", "of"
  if (words.length > 1) {
    return words.every(w => h.includes(w));
  }
  return false;
}

/**
 * Check if `needle` matches any entry in a string array (case-insensitive substring).
 */
function matchesAnyEntry(entries: string[], needle: string): boolean {
  return entries.some(entry => fuzzyContains(entry, needle) || fuzzyContains(needle, entry));
}

/**
 * Match a single asset against a list of shots.
 * Returns a result per shot indicating whether the asset likely appears in it.
 */
export function matchAssetToShots(asset: MatchableAsset, shots: Shot[]): ShotMatchResult[] {
  return shots.map(shot => {
    switch (asset.asset_type) {
      case 'character':
        return matchCharacter(asset, shot);
      case 'location':
        return matchLocation(asset, shot);
      case 'prop':
        return matchProp(asset, shot);
      default:
        return { shotId: shot.id, matched: false, confidence: 0, matchReason: '' };
    }
  });
}

function matchCharacter(asset: MatchableAsset, shot: Shot): ShotMatchResult {
  const name = asset.name;
  // Check foreground characters (high confidence)
  if (matchesAnyEntry(shot.charactersForeground, name)) {
    return { shotId: shot.id, matched: true, confidence: 1.0, matchReason: 'Foreground character match' };
  }
  // Check background characters (medium confidence)
  if (matchesAnyEntry(shot.charactersBackground, name)) {
    return { shotId: shot.id, matched: true, confidence: 0.7, matchReason: 'Background character match' };
  }
  // Check dialogue for character name (lower confidence)
  if (shot.dialogue && fuzzyContains(shot.dialogue, name)) {
    return { shotId: shot.id, matched: true, confidence: 0.4, matchReason: 'Name mentioned in dialogue' };
  }
  return { shotId: shot.id, matched: false, confidence: 0, matchReason: '' };
}

function matchLocation(asset: MatchableAsset, shot: Shot): ShotMatchResult {
  const name = asset.name;
  if (fuzzyContains(shot.setting, name) || fuzzyContains(name, shot.setting)) {
    return { shotId: shot.id, matched: true, confidence: 0.9, matchReason: 'Setting match' };
  }
  // Check if description words match setting
  if (asset.description && fuzzyContains(shot.setting, asset.description)) {
    return { shotId: shot.id, matched: true, confidence: 0.5, matchReason: 'Setting partially matches description' };
  }
  return { shotId: shot.id, matched: false, confidence: 0, matchReason: '' };
}

function matchProp(asset: MatchableAsset, shot: Shot): ShotMatchResult {
  const name = asset.name;
  // Check action text for prop mentions
  if (shot.action && fuzzyContains(shot.action, name)) {
    return { shotId: shot.id, matched: true, confidence: 0.8, matchReason: 'Prop mentioned in action' };
  }
  // Check dialogue for prop mentions
  if (shot.dialogue && fuzzyContains(shot.dialogue, name)) {
    return { shotId: shot.id, matched: true, confidence: 0.5, matchReason: 'Prop mentioned in dialogue' };
  }
  return { shotId: shot.id, matched: false, confidence: 0, matchReason: '' };
}
