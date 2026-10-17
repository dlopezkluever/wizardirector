export type LocationCoverageMode = 'basic' | 'advanced';
export type LocationCoverageStrength = 'strong' | 'usable' | 'weak' | 'missing';
export type LocationCoverageSeverity = 'good' | 'advisory' | 'warning';

export type LocationCoverageShotState =
  | 'matched_view'
  | 'fallback_view'
  | 'missing_view_image'
  | 'unassigned_direction'
  | 'direction_location_mismatch';

export interface LocationCoverageShotInput {
  id: string;
  shot_id?: string | null;
  setting?: string | null;
  camera?: string | null;
  camera_distance?: string | null;
  camera_height?: string | null;
  camera_direction_id?: string | null;
  location_asset_id?: string | null;
  location_match_confidence?: number | string | null;
  location_match_source?: string | null;
}

export interface LocationCoverageAssetInput {
  id: string;
  name: string;
  image_key_url?: string | null;
  scene_image_key_url?: string | null;
}

export interface LocationCoverageViewInput {
  id: string;
  project_asset_id: string;
  name: string;
  alias?: string | null;
  description?: string | null;
  view_type: 'establishing' | 'direction';
  camera_distance?: string | null;
  camera_height?: string | null;
  image_key_url?: string | null;
  is_primary?: boolean | null;
  source?: 'user' | 'established' | 'stage7_inferred' | string | null;
  sort_order?: number | null;
  created_at?: string | null;
}

export interface LocationCoverageViewSummary {
  id: string;
  locationAssetId: string;
  name: string;
  alias: string | null;
  description: string | null;
  viewType: 'establishing' | 'direction';
  cameraDistance: string | null;
  cameraHeight: string | null;
  imageUrl: string | null;
  isPrimary: boolean;
  source: 'user' | 'established' | 'stage7_inferred' | string;
  shotCount: number;
}

export interface LocationCoverageShotSummary {
  shotId: string;
  shotLabel: string;
  setting: string;
  camera: string;
  locationAssetId: string | null;
  locationName: string | null;
  cameraDirectionId: string | null;
  cameraDirectionName: string | null;
  cameraDistance: string | null;
  cameraHeight: string | null;
  coverageState: LocationCoverageShotState;
  severity: LocationCoverageSeverity;
  fallbackViewId: string | null;
  fallbackLabel: string | null;
  notices: string[];
  recommendedAction: string | null;
}

export interface LocationCoverageSummary {
  location: {
    id: string;
    name: string;
    assetType: 'location';
    imageUrl: string | null;
  };
  continuityMode: LocationCoverageMode;
  shots: LocationCoverageShotSummary[];
  views: LocationCoverageViewSummary[];
  establishingView: LocationCoverageViewSummary | null;
  primaryDirection: LocationCoverageViewSummary | null;
  totalShots: number;
  matchedDirectionShots: number;
  fallbackShots: number;
  missingImageShots: number;
  unassignedDirectionShots: number;
  directionMismatchShots: number;
  strength: LocationCoverageStrength;
  notices: string[];
  availableRepairActions: Array<
    | 'create_view'
    | 'assign_direction'
    | 'generate_missing_view'
    | 'use_approved_frame'
  >;
}

export interface LocationCoverageResponse {
  continuityMode: LocationCoverageMode;
  locations: LocationCoverageSummary[];
  unresolvedShots: LocationCoverageShotSummary[];
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
    strength: LocationCoverageStrength;
  };
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function nullableText(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function directionLabel(view: Pick<LocationCoverageViewSummary, 'name' | 'alias'>): string {
  const base = view.name.replace(/_/g, ' ');
  return view.alias ? `${base} "${view.alias}"` : base;
}

function sortViews(a: LocationCoverageViewInput, b: LocationCoverageViewInput): number {
  const orderA = typeof a.sort_order === 'number' ? a.sort_order : Number.MAX_SAFE_INTEGER;
  const orderB = typeof b.sort_order === 'number' ? b.sort_order : Number.MAX_SAFE_INTEGER;
  if (orderA !== orderB) return orderA - orderB;
  return text(a.created_at).localeCompare(text(b.created_at));
}

function toViewSummary(
  view: LocationCoverageViewInput,
  shotCount: number
): LocationCoverageViewSummary {
  return {
    id: view.id,
    locationAssetId: view.project_asset_id,
    name: view.name,
    alias: nullableText(view.alias),
    description: nullableText(view.description),
    viewType: view.view_type,
    cameraDistance: nullableText(view.camera_distance),
    cameraHeight: nullableText(view.camera_height),
    imageUrl: nullableText(view.image_key_url),
    isPrimary: !!view.is_primary,
    source: view.source || 'user',
    shotCount,
  };
}

function fallbackSeverity(mode: LocationCoverageMode): LocationCoverageSeverity {
  return mode === 'advanced' ? 'warning' : 'advisory';
}

function missingImageSeverity(mode: LocationCoverageMode): LocationCoverageSeverity {
  return mode === 'advanced' ? 'warning' : 'advisory';
}

function buildUnresolvedShot(shot: LocationCoverageShotInput): LocationCoverageShotSummary {
  return {
    shotId: shot.id,
    shotLabel: text(shot.shot_id) || 'Shot',
    setting: text(shot.setting),
    camera: text(shot.camera),
    locationAssetId: null,
    locationName: null,
    cameraDirectionId: nullableText(shot.camera_direction_id),
    cameraDirectionName: null,
    cameraDistance: nullableText(shot.camera_distance),
    cameraHeight: nullableText(shot.camera_height),
    coverageState: 'unassigned_direction',
    severity: 'warning',
    fallbackViewId: null,
    fallbackLabel: null,
    notices: ['This shot has no canonical linked location yet.'],
    recommendedAction: 'Link the shot to a location in Stage 7 before assigning advanced coverage.',
  };
}

function locationStrength(
  totalShots: number,
  matchedDirectionShots: number,
  fallbackShots: number,
  missingImageShots: number,
  directionMismatchShots: number,
  mode: LocationCoverageMode,
  hasAnyReference: boolean
): LocationCoverageStrength {
  if (totalShots === 0) return hasAnyReference ? 'usable' : 'missing';
  if (matchedDirectionShots === totalShots) return 'strong';
  if (!hasAnyReference) return 'missing';
  if (missingImageShots > 0 || directionMismatchShots > 0) return 'weak';
  if (fallbackShots > 0) return mode === 'advanced' ? 'weak' : 'usable';
  return 'weak';
}

function responseStrength(locations: LocationCoverageSummary[], unresolvedCount: number): LocationCoverageStrength {
  if (unresolvedCount > 0) return 'weak';
  if (locations.length === 0) return 'missing';
  if (locations.every(location => location.strength === 'strong')) return 'strong';
  if (locations.some(location => location.strength === 'missing' || location.strength === 'weak')) return 'weak';
  return 'usable';
}

export class LocationCoverageService {
  buildCoverage(input: {
    mode?: LocationCoverageMode;
    locations: LocationCoverageAssetInput[];
    views: LocationCoverageViewInput[];
    shots: LocationCoverageShotInput[];
  }): LocationCoverageResponse {
    const mode = input.mode || 'basic';
    const locationById = new Map(input.locations.map(location => [location.id, location]));
    const viewsByLocation = new Map<string, LocationCoverageViewInput[]>();

    for (const view of input.views) {
      const list = viewsByLocation.get(view.project_asset_id) || [];
      list.push(view);
      viewsByLocation.set(view.project_asset_id, list);
    }

    for (const [locationId, views] of viewsByLocation.entries()) {
      viewsByLocation.set(locationId, [...views].sort(sortViews));
    }

    const shotsByLocation = new Map<string, LocationCoverageShotInput[]>();
    const unresolvedShots: LocationCoverageShotSummary[] = [];

    for (const shot of input.shots) {
      const locationId = nullableText(shot.location_asset_id);
      if (!locationId || !locationById.has(locationId)) {
        unresolvedShots.push(buildUnresolvedShot(shot));
        continue;
      }

      const list = shotsByLocation.get(locationId) || [];
      list.push(shot);
      shotsByLocation.set(locationId, list);
    }

    const locations = input.locations.map(location => {
      const locationShots = shotsByLocation.get(location.id) || [];
      const rawViews = viewsByLocation.get(location.id) || [];
      const shotCountByDirection = new Map<string, number>();

      for (const shot of locationShots) {
        const cameraDirectionId = nullableText(shot.camera_direction_id);
        if (!cameraDirectionId) continue;
        shotCountByDirection.set(
          cameraDirectionId,
          (shotCountByDirection.get(cameraDirectionId) || 0) + 1
        );
      }

      const views = rawViews.map(view =>
        toViewSummary(view, shotCountByDirection.get(view.id) || 0)
      );
      const directionViews = views.filter(view => view.viewType === 'direction');
      const establishingView = views.find(view => view.viewType === 'establishing') || null;
      const primaryDirection =
        directionViews.find(view => view.isPrimary) ||
        directionViews[0] ||
        null;
      const firstDirectionWithImage = directionViews.find(view => !!view.imageUrl) || null;
      const fallbackView =
        (primaryDirection?.imageUrl ? primaryDirection : null) ||
        (establishingView?.imageUrl ? establishingView : null) ||
        firstDirectionWithImage;
      const locationImageUrl =
        nullableText(location.scene_image_key_url) ||
        nullableText(location.image_key_url);
      const hasAnyReference = !!locationImageUrl || views.some(view => !!view.imageUrl);

      const shots = locationShots.map(shot => {
        const cameraDirectionId = nullableText(shot.camera_direction_id);
        const assignedView = cameraDirectionId
          ? views.find(view => view.id === cameraDirectionId) || null
          : null;
        const notices: string[] = [];
        let coverageState: LocationCoverageShotState;
        let severity: LocationCoverageSeverity = 'good';
        let recommendedAction: string | null = null;
        let fallbackViewId: string | null = null;
        let fallbackLabel: string | null = null;

        if (assignedView && assignedView.locationAssetId !== location.id) {
          coverageState = 'direction_location_mismatch';
          severity = 'warning';
          notices.push('Assigned direction belongs to a different location.');
          recommendedAction = 'Choose a direction view from the linked location.';
        } else if (assignedView?.imageUrl) {
          coverageState = 'matched_view';
        } else if (assignedView) {
          coverageState = 'missing_view_image';
          severity = missingImageSeverity(mode);
          notices.push('Assigned direction has no image yet.');
          recommendedAction = 'Generate or establish an image for this direction view.';
          if (fallbackView) {
            fallbackViewId = fallbackView.id;
            fallbackLabel = directionLabel(fallbackView);
            notices.push(`Fallback available from ${fallbackLabel}.`);
          } else if (locationImageUrl) {
            fallbackLabel = 'baseline location reference';
            notices.push('Fallback available from the baseline location reference.');
          }
        } else if (fallbackView || locationImageUrl) {
          coverageState = 'fallback_view';
          severity = fallbackSeverity(mode);
          fallbackViewId = fallbackView?.id || null;
          fallbackLabel = fallbackView ? directionLabel(fallbackView) : 'baseline location reference';
          notices.push(
            mode === 'advanced'
              ? 'Advanced continuity should assign a specific camera direction.'
              : 'Using a fallback location reference until a direction is assigned.'
          );
          recommendedAction = 'Assign a camera direction for stronger continuity.';
        } else {
          coverageState = 'unassigned_direction';
          severity = fallbackSeverity(mode);
          notices.push('No direction or fallback location image is available.');
          recommendedAction = 'Create or generate a location view, then assign this shot.';
        }

        return {
          shotId: shot.id,
          shotLabel: text(shot.shot_id) || 'Shot',
          setting: text(shot.setting),
          camera: text(shot.camera),
          locationAssetId: location.id,
          locationName: location.name,
          cameraDirectionId,
          cameraDirectionName: assignedView ? directionLabel(assignedView) : null,
          cameraDistance: nullableText(shot.camera_distance),
          cameraHeight: nullableText(shot.camera_height),
          coverageState,
          severity,
          fallbackViewId,
          fallbackLabel,
          notices,
          recommendedAction,
        };
      });

      const matchedDirectionShots = shots.filter(shot => shot.coverageState === 'matched_view').length;
      const fallbackShots = shots.filter(shot => shot.coverageState === 'fallback_view').length;
      const missingImageShots = shots.filter(shot => shot.coverageState === 'missing_view_image').length;
      const directionMismatchShots = shots.filter(shot => shot.coverageState === 'direction_location_mismatch').length;
      const unassignedDirectionShots = shots.filter(shot => !shot.cameraDirectionId).length;
      const strength = locationStrength(
        shots.length,
        matchedDirectionShots,
        fallbackShots,
        missingImageShots,
        directionMismatchShots,
        mode,
        hasAnyReference
      );
      const notices: string[] = [];

      if (views.length === 0) {
        notices.push('No location views exist for this location.');
      } else if (directionViews.length === 0) {
        notices.push('Only establishing coverage exists; direction views are not defined yet.');
      }
      if (!hasAnyReference) {
        notices.push('No usable location image is available for fallback generation.');
      }
      if (unassignedDirectionShots > 0) {
        notices.push(
          mode === 'advanced'
            ? `${unassignedDirectionShots} shot(s) need explicit direction assignment.`
            : `${unassignedDirectionShots} shot(s) are using advisory direction fallback.`
        );
      }
      if (missingImageShots > 0) {
        notices.push(`${missingImageShots} assigned direction view(s) are missing images.`);
      }
      if (directionMismatchShots > 0) {
        notices.push(`${directionMismatchShots} shot(s) point to a direction from another location.`);
      }

      const availableRepairActions = new Set<LocationCoverageSummary['availableRepairActions'][number]>();
      availableRepairActions.add('create_view');
      if (directionViews.length > 0 && shots.length > 0) availableRepairActions.add('assign_direction');
      if (views.some(view => !view.imageUrl) && hasAnyReference) availableRepairActions.add('generate_missing_view');
      availableRepairActions.add('use_approved_frame');

      return {
        location: {
          id: location.id,
          name: location.name,
          assetType: 'location' as const,
          imageUrl: locationImageUrl,
        },
        continuityMode: mode,
        shots,
        views,
        establishingView,
        primaryDirection,
        totalShots: shots.length,
        matchedDirectionShots,
        fallbackShots,
        missingImageShots,
        unassignedDirectionShots,
        directionMismatchShots,
        strength,
        notices,
        availableRepairActions: [...availableRepairActions],
      };
    });

    const matchedDirectionShots = locations.reduce((sum, location) => sum + location.matchedDirectionShots, 0);
    const fallbackShots = locations.reduce((sum, location) => sum + location.fallbackShots, 0);
    const missingImageShots = locations.reduce((sum, location) => sum + location.missingImageShots, 0);
    const unassignedDirectionShots = locations.reduce((sum, location) => sum + location.unassignedDirectionShots, 0);
    const directionMismatchShots = locations.reduce((sum, location) => sum + location.directionMismatchShots, 0);
    const weakShotCount = unresolvedShots.length + fallbackShots + missingImageShots + directionMismatchShots;

    return {
      continuityMode: mode,
      locations,
      unresolvedShots,
      totals: {
        totalLocations: locations.length,
        totalShots: input.shots.length,
        unresolvedLocationShots: unresolvedShots.length,
        matchedDirectionShots,
        fallbackShots,
        missingImageShots,
        unassignedDirectionShots,
        directionMismatchShots,
        weakShotCount,
        strength: responseStrength(locations, unresolvedShots.length),
      },
    };
  }
}

export const locationCoverageService = new LocationCoverageService();
