import { supabase } from '../config/supabase.js';

export const LOCATION_MATCH_SOURCES = [
  'manual',
  'resolver_exact',
  'resolver_alias',
  'resolver_fuzzy',
  'stage7_inferred',
  'legacy_backfill',
  'camera_direction_parent',
] as const;

export type LocationMatchSource = typeof LOCATION_MATCH_SOURCES[number];

export interface LocationAssetForResolution {
  id: string;
  name: string;
  description?: string | null;
  location_aliases?: unknown;
}

export interface CameraDirectionParent {
  cameraDirectionId: string;
  locationAssetId: string;
  locationName: string;
}

export interface LocationResolverContext {
  branchId: string;
  locationAssets: LocationAssetForResolution[];
  cameraDirectionParents: Map<string, CameraDirectionParent>;
}

export interface ResolveShotLocationInput {
  setting?: string | null;
  sceneExpectedLocation?: string | null;
  cameraDirectionId?: string | null;
}

export interface LocationMatchCandidate {
  locationAssetId: string;
  name: string;
  confidence: number;
  source: Exclude<LocationMatchSource, 'manual' | 'legacy_backfill' | 'stage7_inferred'>;
  reason: string;
  matchedFrom: 'camera_direction' | 'setting' | 'scene_expected_location';
  matchedText?: string;
}

export interface LocationResolveResult {
  locationAssetId: string | null;
  confidence: number | null;
  source: LocationMatchSource | null;
  reason: string;
  candidates: LocationMatchCandidate[];
  isAmbiguous: boolean;
  matchedFrom: LocationMatchCandidate['matchedFrom'] | null;
}

export interface LocationMatchEventInput {
  projectId: string;
  branchId: string;
  sceneId?: string | null;
  shotId?: string | null;
  rawSetting?: string | null;
  sceneExpectedLocation?: string | null;
  cameraDirectionId?: string | null;
  result: LocationResolveResult;
  wasApplied: boolean;
}

const MIN_CANDIDATE_CONFIDENCE = 0.56;
export const DEFAULT_LOCATION_AUTO_APPLY_CONFIDENCE = 0.72;
const AMBIGUITY_CONFIDENCE_DELTA = 0.06;

const SCREENPLAY_QUALIFIERS = new Set([
  'int',
  'ext',
  'interior',
  'exterior',
  'ie',
  'day',
  'night',
  'dawn',
  'dusk',
  'morning',
  'afternoon',
  'evening',
  'later',
  'continuous',
  'same',
  'moments',
  'flashback',
  'present',
]);

const TOKEN_STOP_WORDS = new Set([
  ...SCREENPLAY_QUALIFIERS,
  'the',
  'a',
  'an',
  'and',
  'or',
  'of',
  'to',
  'in',
  'on',
  'at',
  'with',
  'from',
  'near',
  'inside',
  'outside',
]);

export function normalizeLocationText(value: string | null | undefined): string {
  if (!value) return '';

  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\bint\s*\/\s*ext\b/g, ' ')
    .replace(/\bint\.?\b/g, ' ')
    .replace(/\bext\.?\b/g, ' ')
    .replace(/['"`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter(token => token && !SCREENPLAY_QUALIFIERS.has(token))
    .join(' ')
    .trim();
}

export function tokenizeLocationText(value: string | null | undefined): string[] {
  const normalized = normalizeLocationText(value);
  if (!normalized) return [];

  return normalized
    .split(/\s+/)
    .filter(token => token && !TOKEN_STOP_WORDS.has(token));
}

function parseAliases(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.filter((alias): alias is string => typeof alias === 'string' && alias.trim().length > 0);
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter((alias): alias is string => typeof alias === 'string' && alias.trim().length > 0);
      }
    } catch {
      return value.trim() ? [value.trim()] : [];
    }
  }
  return [];
}

function roundConfidence(value: number): number {
  return Math.max(0, Math.min(1, Math.round(value * 1000) / 1000));
}

function phraseMatches(text: string, phrase: string): boolean {
  if (!text || !phrase) return false;
  if (text === phrase) return true;
  return ` ${text} `.includes(` ${phrase} `);
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  const current = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i++) {
    current[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + substitutionCost
      );
    }
    for (let j = 0; j <= b.length; j++) previous[j] = current[j];
  }

  return previous[b.length];
}

function stringSimilarity(a: string, b: string): number {
  const maxLength = Math.max(a.length, b.length);
  if (maxLength === 0) return 1;
  return 1 - levenshteinDistance(a, b) / maxLength;
}

function bestTokenSimilarity(assetToken: string, textTokens: string[]): number {
  if (textTokens.includes(assetToken)) return 1;
  return textTokens.reduce((best, token) => Math.max(best, stringSimilarity(assetToken, token)), 0);
}

function scoreTokenOverlap(assetText: string, rawText: string): number {
  const assetTokens = tokenizeLocationText(assetText);
  const textTokens = tokenizeLocationText(rawText);
  if (assetTokens.length === 0 || textTokens.length === 0) return 0;

  const matchedTokenCount = assetTokens.filter(token => bestTokenSimilarity(token, textTokens) >= 0.84).length;
  const coverage = matchedTokenCount / assetTokens.length;
  if (coverage < 0.66) return 0;

  const exactIntersection = assetTokens.filter(token => textTokens.includes(token)).length;
  const union = new Set([...assetTokens, ...textTokens]).size;
  const jaccard = union > 0 ? exactIntersection / union : 0;
  const oneTokenPenalty = assetTokens.length === 1 && textTokens.length > 3 ? 0.06 : 0;

  return roundConfidence(0.55 + coverage * 0.26 + jaccard * 0.16 - oneTokenPenalty);
}

function candidateForText(
  asset: LocationAssetForResolution,
  rawText: string,
  matchedFrom: LocationMatchCandidate['matchedFrom']
): LocationMatchCandidate | null {
  const normalizedText = normalizeLocationText(rawText);
  const normalizedName = normalizeLocationText(asset.name);
  if (!normalizedText || !normalizedName) return null;

  if (normalizedText === normalizedName) {
    return {
      locationAssetId: asset.id,
      name: asset.name,
      confidence: 0.99,
      source: 'resolver_exact',
      reason: `${matchedFrom} exactly matches location name "${asset.name}".`,
      matchedFrom,
      matchedText: rawText,
    };
  }

  if (phraseMatches(normalizedText, normalizedName)) {
    return {
      locationAssetId: asset.id,
      name: asset.name,
      confidence: normalizedName.split(' ').length > 1 ? 0.93 : 0.88,
      source: 'resolver_exact',
      reason: `${matchedFrom} contains location name "${asset.name}".`,
      matchedFrom,
      matchedText: rawText,
    };
  }

  for (const alias of parseAliases(asset.location_aliases)) {
    const normalizedAlias = normalizeLocationText(alias);
    if (!normalizedAlias) continue;

    if (normalizedText === normalizedAlias) {
      return {
        locationAssetId: asset.id,
        name: asset.name,
        confidence: 0.97,
        source: 'resolver_alias',
        reason: `${matchedFrom} exactly matches alias "${alias}" for "${asset.name}".`,
        matchedFrom,
        matchedText: rawText,
      };
    }

    if (phraseMatches(normalizedText, normalizedAlias)) {
      return {
        locationAssetId: asset.id,
        name: asset.name,
        confidence: normalizedAlias.split(' ').length > 1 ? 0.9 : 0.84,
        source: 'resolver_alias',
        reason: `${matchedFrom} contains alias "${alias}" for "${asset.name}".`,
        matchedFrom,
        matchedText: rawText,
      };
    }
  }

  const fuzzyConfidence = scoreTokenOverlap(asset.name, rawText);
  if (fuzzyConfidence >= MIN_CANDIDATE_CONFIDENCE) {
    return {
      locationAssetId: asset.id,
      name: asset.name,
      confidence: fuzzyConfidence,
      source: 'resolver_fuzzy',
      reason: `${matchedFrom} overlaps location tokens for "${asset.name}".`,
      matchedFrom,
      matchedText: rawText,
    };
  }

  return null;
}

function mergeCandidate(bestByAsset: Map<string, LocationMatchCandidate>, candidate: LocationMatchCandidate) {
  const existing = bestByAsset.get(candidate.locationAssetId);
  if (!existing || candidate.confidence > existing.confidence) {
    bestByAsset.set(candidate.locationAssetId, candidate);
  }
}

export class LocationResolverService {
  async loadProjectLocationContext(branchId: string): Promise<LocationResolverContext> {
    const { data: locationAssets, error: assetsError } = await supabase
      .from('project_assets')
      .select('id, name, description, location_aliases')
      .eq('branch_id', branchId)
      .eq('asset_type', 'location');

    if (assetsError) {
      throw new Error(`Failed to load location assets: ${assetsError.message}`);
    }

    const assets = (locationAssets || []) as LocationAssetForResolution[];
    const assetIds = assets.map(asset => asset.id);
    const assetNameById = new Map(assets.map(asset => [asset.id, asset.name]));
    const cameraDirectionParents = new Map<string, CameraDirectionParent>();

    if (assetIds.length > 0) {
      const { data: views, error: viewsError } = await supabase
        .from('location_views')
        .select('id, project_asset_id')
        .in('project_asset_id', assetIds);

      if (viewsError) {
        throw new Error(`Failed to load location view parent map: ${viewsError.message}`);
      }

      for (const view of views || []) {
        const locationName = assetNameById.get(view.project_asset_id) || 'Unknown location';
        cameraDirectionParents.set(view.id, {
          cameraDirectionId: view.id,
          locationAssetId: view.project_asset_id,
          locationName,
        });
      }
    }

    return {
      branchId,
      locationAssets: assets,
      cameraDirectionParents,
    };
  }

  resolveShotLocation(
    input: ResolveShotLocationInput,
    context: LocationResolverContext
  ): LocationResolveResult {
    if (input.cameraDirectionId) {
      const parent = context.cameraDirectionParents.get(input.cameraDirectionId);
      if (parent) {
        const candidate: LocationMatchCandidate = {
          locationAssetId: parent.locationAssetId,
          name: parent.locationName,
          confidence: 1,
          source: 'camera_direction_parent',
          reason: `camera_direction_id belongs to "${parent.locationName}".`,
          matchedFrom: 'camera_direction',
        };
        return {
          locationAssetId: parent.locationAssetId,
          confidence: 1,
          source: 'camera_direction_parent',
          reason: candidate.reason,
          candidates: [candidate],
          isAmbiguous: false,
          matchedFrom: 'camera_direction',
        };
      }
    }

    const bestByAsset = new Map<string, LocationMatchCandidate>();
    const textInputs: Array<{ value?: string | null; matchedFrom: LocationMatchCandidate['matchedFrom'] }> = [
      { value: input.setting, matchedFrom: 'setting' },
      { value: input.sceneExpectedLocation, matchedFrom: 'scene_expected_location' },
    ];

    for (const textInput of textInputs) {
      if (!textInput.value?.trim()) continue;
      for (const asset of context.locationAssets) {
        const candidate = candidateForText(asset, textInput.value, textInput.matchedFrom);
        if (candidate) mergeCandidate(bestByAsset, candidate);
      }
    }

    const candidates = [...bestByAsset.values()]
      .sort((a, b) => b.confidence - a.confidence)
      .map(candidate => ({
        ...candidate,
        confidence: roundConfidence(candidate.confidence),
      }));

    const top = candidates[0];
    if (!top) {
      return {
        locationAssetId: null,
        confidence: null,
        source: null,
        reason: 'No matching location asset found.',
        candidates: [],
        isAmbiguous: false,
        matchedFrom: null,
      };
    }

    if (top.confidence < MIN_CANDIDATE_CONFIDENCE) {
      return {
        locationAssetId: null,
        confidence: top.confidence,
        source: top.source,
        reason: `No candidate reached the minimum confidence threshold. Best candidate: "${top.name}".`,
        candidates,
        isAmbiguous: false,
        matchedFrom: top.matchedFrom,
      };
    }

    const second = candidates[1];
    const isAmbiguous = !!second && top.confidence - second.confidence <= AMBIGUITY_CONFIDENCE_DELTA;

    return {
      locationAssetId: top.locationAssetId,
      confidence: top.confidence,
      source: top.source,
      reason: isAmbiguous
        ? `Ambiguous location match between "${top.name}" and "${second.name}".`
        : top.reason,
      candidates,
      isAmbiguous,
      matchedFrom: top.matchedFrom,
    };
  }

  shouldApplyResolution(
    result: LocationResolveResult,
    threshold = DEFAULT_LOCATION_AUTO_APPLY_CONFIDENCE
  ): boolean {
    return !!result.locationAssetId && !result.isAmbiguous && (result.confidence ?? 0) >= threshold;
  }

  toShotLocationPatch(
    result: LocationResolveResult,
    options?: {
      threshold?: number;
      sourceOverride?: LocationMatchSource;
    }
  ): {
    location_asset_id: string | null;
    location_match_confidence: number | null;
    location_match_source: LocationMatchSource | null;
    location_match_notes: string | null;
  } {
    const shouldApply = this.shouldApplyResolution(result, options?.threshold);
    const source = result.source
      ? (options?.sourceOverride && shouldApply ? options.sourceOverride : result.source)
      : null;

    return {
      location_asset_id: shouldApply ? result.locationAssetId : null,
      location_match_confidence: result.confidence,
      location_match_source: source,
      location_match_notes: this.buildMatchNotes(result),
    };
  }

  buildMatchNotes(result: LocationResolveResult): string | null {
    const candidateNote = result.candidates
      .slice(0, 3)
      .map(candidate => `${candidate.name} ${candidate.confidence.toFixed(3)}`)
      .join(', ');
    const notes = candidateNote ? `${result.reason} Candidates: ${candidateNote}.` : result.reason;
    return notes.length > 500 ? `${notes.slice(0, 497)}...` : notes;
  }

  async recordMatchEvent(input: LocationMatchEventInput): Promise<void> {
    const { result } = input;
    const { error } = await supabase
      .from('location_match_events')
      .insert({
        project_id: input.projectId,
        branch_id: input.branchId,
        scene_id: input.sceneId || null,
        shot_id: input.shotId || null,
        raw_setting: input.rawSetting || null,
        scene_expected_location: input.sceneExpectedLocation || null,
        camera_direction_id: input.cameraDirectionId || null,
        result_location_asset_id: input.wasApplied ? result.locationAssetId : null,
        result_confidence: result.confidence,
        result_source: result.source,
        result_reason: result.reason,
        is_ambiguous: result.isAmbiguous,
        was_applied: input.wasApplied,
        candidates: result.candidates,
      });

    if (error) {
      console.warn('[LocationResolver] Failed to record location match event:', error.message);
    }
  }
}

export const locationResolverService = new LocationResolverService();
