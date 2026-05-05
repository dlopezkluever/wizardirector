import type { CameraDistance, CameraHeight, LocationViewSource, LocationViewType } from './asset';
import type { ContinuityMode } from './scene';

export type LocationMatchSource =
  | 'manual'
  | 'resolver_exact'
  | 'resolver_alias'
  | 'resolver_fuzzy'
  | 'stage7_inferred'
  | 'legacy_backfill'
  | 'camera_direction_parent';

export type LocationContinuityState =
  | 'resolved'
  | 'suggested'
  | 'ambiguous'
  | 'unresolved';

export type ContinuityStrength = 'strong' | 'usable' | 'weak' | 'missing';

export type GenerationReferenceRole =
  | 'location_direction_main'
  | 'location_establishing_context'
  | 'location_asset_fallback'
  | 'continuity_base_frame'
  | 'blocking_composition_reference'
  | 'blocking_start_frame'
  | 'blocking_end_frame'
  | 'character_identity'
  | 'prop_identity'
  | 'style_reference'
  | 'manual_reference';

export interface LocationReferenceSummary {
  id: string;
  name: string;
  assetType: 'location';
  imageUrl?: string | null;
}

export interface LocationViewSummary {
  id: string;
  locationAssetId: string;
  name: string;
  alias?: string | null;
  description?: string | null;
  viewType: LocationViewType;
  cameraDistance?: CameraDistance | null;
  cameraHeight?: CameraHeight | null;
  imageUrl?: string | null;
  isPrimary: boolean;
  source: LocationViewSource;
  shotCount?: number;
}

export interface LocationCandidate {
  locationAssetId: string;
  name: string;
  confidence: number;
  source: LocationMatchSource;
  reason: string;
}

export interface ShotLocationState {
  shotId: string;
  shotLabel: string;
  rawSetting: string;
  sceneExpectedLocation?: string | null;
  expectedLocationAssetId?: string | null;
  locationAssetId?: string | null;
  locationName?: string | null;
  confidence?: number | null;
  source?: LocationMatchSource | null;
  notes?: string | null;
  state: LocationContinuityState;
  candidates: LocationCandidate[];
  cameraDirectionId?: string | null;
  cameraDirection?: LocationViewSummary | null;
}

export interface LocationCoverageShot {
  shotId: string;
  shotLabel: string;
  setting: string;
  camera: string;
  locationAssetId?: string | null;
  locationName?: string | null;
  cameraDirectionId?: string | null;
  cameraDirectionName?: string | null;
  cameraDistance?: CameraDistance | null;
  cameraHeight?: CameraHeight | null;
  coverageState:
    | 'matched_view'
    | 'fallback_view'
    | 'missing_view_image'
    | 'unassigned_direction'
    | 'direction_location_mismatch';
  severity?: 'good' | 'advisory' | 'warning';
  fallbackViewId?: string | null;
  fallbackLabel?: string | null;
  notices?: string[];
  recommendedAction?: string | null;
}

export interface LocationCoverageSummary {
  location: LocationReferenceSummary;
  continuityMode?: 'basic' | 'advanced';
  shots: LocationCoverageShot[];
  views: LocationViewSummary[];
  establishingView?: LocationViewSummary | null;
  primaryDirection?: LocationViewSummary | null;
  totalShots: number;
  matchedDirectionShots: number;
  fallbackShots: number;
  missingImageShots: number;
  unassignedDirectionShots: number;
  directionMismatchShots?: number;
  strength: ContinuityStrength;
  notices: string[];
  availableRepairActions?: Array<
    | 'create_view'
    | 'assign_direction'
    | 'generate_missing_view'
    | 'use_approved_frame'
  >;
}

export interface LocationCoverageResponse {
  continuityMode: 'basic' | 'advanced';
  locations: LocationCoverageSummary[];
  unresolvedShots: LocationCoverageShot[];
  totals: {
    totalLocations: number;
    totalShots: number;
    unresolvedLocationShots: number;
    matchedDirectionShots: number;
    fallbackShots: number;
    missingImageShots: number;
    unassignedDirectionShots: number;
    directionMismatchShots: number;
    weakShotCount: number;
    strength: ContinuityStrength;
  };
}

export interface GenerationReferenceManifestEntry {
  id: string;
  label: string;
  assetName: string;
  url: string;
  assetType: 'character' | 'location' | 'prop' | 'style' | 'continuity' | 'blocking' | 'manual';
  role: GenerationReferenceRole;
  providerRole: 'identity' | 'style';
  reason: string;
  source:
    | 'scene_asset'
    | 'project_asset'
    | 'location_view'
    | 'approved_frame'
    | 'blocking_reference'
    | 'manual_upload'
    | 'transformation';
}

export interface ContinuityBaseCandidate {
  frameId: string;
  sourceShotId: string;
  sourceShotLabel: string;
  imageUrl: string;
  sameLocation: boolean;
  sameDirection: boolean;
  suitability: ContinuityStrength;
  confidence: number;
  reason: string;
}

export interface ShotContinuityPreview {
  shotId: string;
  shotLabel: string;
  locationState: ShotLocationState;
  direction?: LocationViewSummary | null;
  strength: ContinuityStrength;
  generationMode: 'fresh' | 'match_copy' | 'camera_change' | 'reuse_edit';
  referenceManifest: GenerationReferenceManifestEntry[];
  fallbackChain: string[];
  adaptationNotes: string[];
  riskNotices: string[];
  continuityBase?: ContinuityBaseCandidate | null;
}

export interface GenerationContinuityPackage {
  shotId: string;
  framePromptInstructions: string;
  continuityPromptInstructions?: string | null;
  startFrameReferenceManifest: GenerationReferenceManifestEntry[];
  endFrameReferenceManifest: GenerationReferenceManifestEntry[];
  providerReadyReferences: Array<{
    url: string;
    role: 'identity' | 'style';
    manifestEntryId: string;
  }>;
  persistedStartFrameManifest: GenerationReferenceManifestEntry[];
  persistedEndFrameManifest: GenerationReferenceManifestEntry[];
  selectedContinuityBase?: ContinuityBaseCandidate | null;
  preview: ShotContinuityPreview;
  debugMetadata?: Record<string, unknown>;
}
