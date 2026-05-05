import { supabase } from '../config/supabase.js';
import {
  buildFrameReferenceManifests,
  buildNumberedImageManifest,
  enrichAssetsWithAngleMatch,
  parseCameraMetadata,
  scopeAssetsForShotContinuity,
  type LocationViewData,
  type ReferenceImageOrderEntry,
  type SceneAssetInstanceData,
  type ShotAssetAssignmentForPrompt,
  type ShotData,
} from './promptGenerationService.js';

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
  viewType: 'establishing' | 'direction';
  cameraDistance?: string | null;
  cameraHeight?: string | null;
  imageUrl?: string | null;
  isPrimary: boolean;
  source: string;
  shotCount?: number;
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
  source?: string | null;
  notes?: string | null;
  state: 'resolved' | 'suggested' | 'ambiguous' | 'unresolved';
  candidates: [];
  cameraDirectionId?: string | null;
  cameraDirection?: LocationViewSummary | null;
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
  persistedStartFrameManifest: ReferenceImageOrderEntry[];
  persistedEndFrameManifest: ReferenceImageOrderEntry[];
  selectedContinuityBase?: ContinuityBaseCandidate | null;
  preview: ShotContinuityPreview;
  debugMetadata?: Record<string, unknown>;
}

export interface ContinuityCompositionInput {
  shot: ShotData;
  sceneAssets: SceneAssetInstanceData[];
  shotAssignments?: ShotAssetAssignmentForPrompt[];
  sceneExpectedLocation?: string | null;
  locationNameById?: Map<string, string>;
  locationImageById?: Map<string, string | null>;
  generationMode?: ShotContinuityPreview['generationMode'];
}

function numeric(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toLocationViewSummary(
  view: LocationViewData | undefined,
  locationAssetId: string | null
): LocationViewSummary | null {
  if (!view || !locationAssetId) return null;

  return {
    id: view.id,
    locationAssetId,
    name: view.name,
    alias: view.alias || null,
    description: view.description || null,
    viewType: view.view_type,
    cameraDistance: view.camera_distance || null,
    cameraHeight: view.camera_height || null,
    imageUrl: view.image_key_url || null,
    isPrimary: !!view.is_primary,
    source: view.source || 'user',
  };
}

function toAssetType(type: string): GenerationReferenceManifestEntry['assetType'] {
  if (type === 'character' || type === 'location' || type === 'prop') return type;
  if (type === 'continuity' || type === 'blocking' || type === 'manual' || type === 'style') return type;
  return 'manual';
}

function toSemanticRole(entry: ReferenceImageOrderEntry): GenerationReferenceRole {
  if (entry.referenceRole) return entry.referenceRole;
  if (entry.type === 'location') return 'location_asset_fallback';
  if (entry.type === 'character') return 'character_identity';
  if (entry.type === 'prop') return 'prop_identity';
  if (entry.type === 'continuity') return 'continuity_base_frame';
  return 'manual_reference';
}

function toProviderRole(entry: ReferenceImageOrderEntry): 'identity' | 'style' {
  return entry.role === 'style' ? 'style' : 'identity';
}

function toManifestEntry(entry: ReferenceImageOrderEntry, index: number): GenerationReferenceManifestEntry {
  return {
    id: entry.id || `${entry.label || `Image #${index + 1}`}-${index}`,
    label: entry.label || `Image #${index + 1}`,
    assetName: entry.assetName || 'Reference',
    url: entry.url,
    assetType: toAssetType(entry.type),
    role: toSemanticRole(entry),
    providerRole: toProviderRole(entry),
    reason: entry.reason || `Using ${entry.assetName || 'reference image'} for generation continuity.`,
    source: entry.source || 'manual_upload',
  };
}

function locationStateFromShot(
  shot: ShotData,
  locationAsset: SceneAssetInstanceData | undefined,
  direction: LocationViewData | undefined,
  input: ContinuityCompositionInput
): ShotLocationState {
  const confidence = numeric(shot.location_match_confidence);
  const locationAssetId = shot.location_asset_id || null;
  const locationName =
    locationAsset?.project_asset?.name ||
    (locationAssetId ? input.locationNameById?.get(locationAssetId) : undefined) ||
    null;

  let state: ShotLocationState['state'] = 'unresolved';
  if (locationAssetId) {
    state = confidence !== null && confidence < 0.8 ? 'suggested' : 'resolved';
  }

  return {
    shotId: shot.id,
    shotLabel: shot.shot_id,
    rawSetting: shot.setting || '',
    sceneExpectedLocation: input.sceneExpectedLocation || null,
    expectedLocationAssetId: null,
    locationAssetId,
    locationName,
    confidence,
    source: shot.location_match_source || null,
    notes: shot.location_match_notes || null,
    state,
    candidates: [],
    cameraDirectionId: shot.camera_direction_id || null,
    cameraDirection: shot.camera_direction_id
      ? toLocationViewSummary(direction, locationAssetId)
      : null,
  };
}

function generationModeForShot(shot: ShotData): ShotContinuityPreview['generationMode'] {
  if (shot.start_continuity === 'match') return 'match_copy';
  if (shot.start_continuity === 'camera_change') return 'camera_change';
  return 'fresh';
}

function buildFrameInstructions(
  shot: ShotData,
  locationAsset: SceneAssetInstanceData | undefined,
  referenceManifest: GenerationReferenceManifestEntry[]
): string {
  const locationName = locationAsset?.project_asset?.name || shot.setting || 'the linked location';
  const camera = parseCameraMetadata(shot.camera || '');
  const directionRef = referenceManifest.find(ref => ref.role === 'location_direction_main');
  const fallbackRef = referenceManifest.find(ref => ref.role === 'location_asset_fallback');
  const establishingRef = referenceManifest.find(ref => ref.role === 'location_establishing_context');

  if (directionRef) {
    return `Use ${locationName} from the assigned direction reference as the background identity. Frame the shot as ${camera.distance} distance, ${camera.height.replace(/_/g, ' ')} height, with ${camera.movement.replace(/_/g, ' ')} movement reserved for video.`;
  }

  if (fallbackRef) {
    return `Use ${fallbackRef.assetName} as fallback location context for ${locationName}; adapt the camera to ${camera.distance} distance and ${camera.height.replace(/_/g, ' ')} height without implying an exact matched view.`;
  }

  if (establishingRef) {
    return `Use the establishing view as spatial support for ${locationName}; describe the target camera angle explicitly because no exact direction image is available.`;
  }

  return `No usable location reference image is attached. Generate from text-only setting context for ${locationName} and avoid borrowing unrelated locations.`;
}

function buildContinuityInstructions(
  shot: ShotData,
  generationMode: ShotContinuityPreview['generationMode'],
  referenceManifest: GenerationReferenceManifestEntry[]
): string | null {
  if (generationMode !== 'camera_change') return null;
  const locationRefs = referenceManifest
    .filter(ref => ref.assetType === 'location')
    .map(ref => `${ref.label}: ${ref.reason}`)
    .join(' ');

  return `Recompose the selected continuity frame for Shot ${shot.shot_id} using camera metadata (${shot.camera}). Preserve the continuity reference frame while carrying these canonical location references forward: ${locationRefs || 'no location reference images available'}.`;
}

function buildFallbackChain(
  shot: ShotData,
  locationAsset: SceneAssetInstanceData | undefined,
  manifest: GenerationReferenceManifestEntry[]
): string[] {
  const chain: string[] = [];
  const locationName = locationAsset?.project_asset?.name || shot.setting || 'unlinked location';

  if (!shot.location_asset_id) {
    chain.push('No canonical location assigned.');
    return chain;
  }

  chain.push(`Canonical location: ${locationName}.`);

  const locationRefs = manifest.filter(ref => ref.assetType === 'location');
  if (locationRefs.length === 0) {
    chain.push('Text-only location context.');
    return chain;
  }

  for (const ref of locationRefs) {
    chain.push(`${ref.label}: ${ref.reason}`);
  }

  return chain;
}

function buildAdaptationNotes(
  shot: ShotData,
  locationAsset: SceneAssetInstanceData | undefined,
  manifest: GenerationReferenceManifestEntry[]
): string[] {
  const notes: string[] = [];
  const delta = locationAsset?.location_delta_description;
  if (delta) notes.push(delta);

  if (!shot.camera_direction_id && manifest.some(ref => ref.role === 'location_asset_fallback')) {
    notes.push('No camera direction is assigned, so the generator will adapt from the best available location fallback.');
  }

  if (shot.camera_direction_id && locationAsset?.location_reference_strategy === 'direction_missing_image') {
    notes.push('The assigned direction exists but has no image; establishing or baseline location references will carry spatial continuity.');
  }

  return notes;
}

function buildRiskNotices(
  shot: ShotData,
  locationAsset: SceneAssetInstanceData | undefined,
  manifest: GenerationReferenceManifestEntry[]
): string[] {
  const risks: string[] = [];
  const hasLocationRef = manifest.some(ref => ref.assetType === 'location');

  if (!shot.location_asset_id) {
    risks.push('This shot has no canonical linked location.');
  } else if (!locationAsset) {
    risks.push('The linked location is not available in this scene asset set.');
  }

  if (shot.location_asset_id && !hasLocationRef) {
    risks.push('No usable location image will be attached for generation.');
  }

  if (!shot.camera_direction_id && hasLocationRef) {
    risks.push('No camera direction is assigned; location continuity will rely on fallback adaptation.');
  }

  if (shot.camera_direction_id && locationAsset?.location_reference_strategy === 'direction_missing_image') {
    risks.push('Assigned direction view is missing an image.');
  }

  return risks;
}

function strengthFromPackage(
  shot: ShotData,
  locationAsset: SceneAssetInstanceData | undefined,
  manifest: GenerationReferenceManifestEntry[],
  risks: string[]
): ContinuityStrength {
  if (!shot.location_asset_id) return 'missing';
  if (!locationAsset) return 'missing';
  if (!manifest.some(ref => ref.assetType === 'location')) return 'weak';
  if (manifest.some(ref => ref.role === 'location_direction_main')) return risks.length ? 'usable' : 'strong';
  if (manifest.some(ref => ref.role === 'location_asset_fallback' || ref.role === 'location_establishing_context')) return 'usable';
  return 'weak';
}

export class ContinuityCompositionService {
  async loadSceneAssetsForContinuity(sceneId: string): Promise<SceneAssetInstanceData[]> {
    const { data: assetInstances, error } = await supabase
      .from('scene_asset_instances')
      .select(`
        id,
        description_override,
        effective_description,
        status_tags,
        image_key_url,
        carry_forward,
        inherited_from_instance_id,
        use_master_as_is,
        selected_master_reference_url,
        project_assets!inner (
          id,
          name,
          asset_type,
          description,
          image_key_url
        )
      `)
      .eq('scene_id', sceneId);

    if (error) {
      throw new Error(`Failed to fetch scene assets: ${error.message}`);
    }

    const sceneAssets: SceneAssetInstanceData[] = (assetInstances || []).map((instance: any) => ({
      id: instance.id,
      project_asset: instance.project_assets ? {
        id: instance.project_assets.id,
        name: instance.project_assets.name,
        asset_type: instance.project_assets.asset_type,
        description: instance.project_assets.description,
        image_key_url: instance.project_assets.image_key_url || undefined,
      } : undefined,
      description_override: instance.description_override,
      effective_description: instance.effective_description || instance.description_override || instance.project_assets?.description || '',
      status_tags: instance.status_tags || [],
      image_key_url: instance.image_key_url || undefined,
      master_image_url: instance.selected_master_reference_url || instance.project_assets?.image_key_url || undefined,
      carry_forward: instance.carry_forward ?? false,
      inherited_from_instance_id: instance.inherited_from_instance_id || undefined,
    }));

    await this.attachCharacterAngleVariants(sceneAssets);
    await this.attachLocationViews(sceneAssets);

    return sceneAssets;
  }

  private async attachCharacterAngleVariants(sceneAssets: SceneAssetInstanceData[]): Promise<void> {
    const characterAssetIds = sceneAssets
      .filter(asset => asset.project_asset?.asset_type === 'character' && asset.project_asset?.id)
      .map(asset => asset.project_asset!.id);

    if (characterAssetIds.length === 0) return;

    const { data: angleVariants } = await supabase
      .from('asset_angle_variants')
      .select('project_asset_id, angle_type, image_url, status')
      .in('project_asset_id', characterAssetIds)
      .eq('status', 'completed');

    const variantsByAsset = new Map<string, Array<{ angle_type: string; image_url: string | null; status: string }>>();
    for (const variant of angleVariants || []) {
      const list = variantsByAsset.get(variant.project_asset_id) || [];
      list.push({
        angle_type: variant.angle_type,
        image_url: variant.image_url,
        status: variant.status,
      });
      variantsByAsset.set(variant.project_asset_id, list);
    }

    for (const asset of sceneAssets) {
      if (asset.project_asset?.id && variantsByAsset.has(asset.project_asset.id)) {
        asset.angle_variants = variantsByAsset.get(asset.project_asset.id);
      }
    }
  }

  private async attachLocationViews(sceneAssets: SceneAssetInstanceData[]): Promise<void> {
    const locationAssetIds = sceneAssets
      .filter(asset => asset.project_asset?.asset_type === 'location' && asset.project_asset?.id)
      .map(asset => asset.project_asset!.id);

    if (locationAssetIds.length === 0) return;

    const { data: locationViews } = await supabase
      .from('location_views')
      .select('id, project_asset_id, name, alias, description, view_type, camera_distance, camera_height, image_key_url, is_primary, source, sort_order, created_at')
      .in('project_asset_id', locationAssetIds)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    const viewsByAsset = new Map<string, LocationViewData[]>();
    for (const view of locationViews || []) {
      const list = viewsByAsset.get(view.project_asset_id) || [];
      list.push({
        id: view.id,
        name: view.name,
        alias: view.alias || undefined,
        description: view.description || undefined,
        view_type: view.view_type,
        camera_distance: view.camera_distance,
        camera_height: view.camera_height,
        image_key_url: view.image_key_url || undefined,
        is_primary: view.is_primary,
        source: view.source,
      });
      viewsByAsset.set(view.project_asset_id, list);
    }

    for (const asset of sceneAssets) {
      if (asset.project_asset?.id && viewsByAsset.has(asset.project_asset.id)) {
        asset.location_views = viewsByAsset.get(asset.project_asset.id);
      }
    }
  }

  buildGenerationPackage(input: ContinuityCompositionInput): GenerationContinuityPackage {
    const scopedAssets = scopeAssetsForShotContinuity(input.sceneAssets, input.shot, input.shotAssignments);
    const enrichedAssets = enrichAssetsWithAngleMatch(scopedAssets, input.shot.camera, input.shot);
    const locationAsset = enrichedAssets.find(asset => asset.project_asset?.asset_type === 'location');
    const direction = locationAsset?.matched_direction_view;

    let startFrameManifest = '';
    let endFrameManifest = '';
    let startFrameImageOrder: ReferenceImageOrderEntry[] = [];
    let endFrameImageOrder: ReferenceImageOrderEntry[] = [];

    if (input.shotAssignments && input.shotAssignments.length > 0) {
      const manifests = buildFrameReferenceManifests(enrichedAssets, input.shotAssignments);
      startFrameManifest = manifests.startFrameManifest;
      endFrameManifest = manifests.endFrameManifest;
      startFrameImageOrder = manifests.startFrameImageOrder;
      endFrameImageOrder = manifests.endFrameImageOrder;
    } else {
      const manifest = buildNumberedImageManifest(enrichedAssets);
      startFrameManifest = manifest.manifest;
      startFrameImageOrder = manifest.imageOrder;
    }

    const startEntries = startFrameImageOrder.map(toManifestEntry);
    const endEntries = endFrameImageOrder.map(toManifestEntry);
    const locationState = locationStateFromShot(input.shot, locationAsset, direction, input);
    const generationMode = input.generationMode || generationModeForShot(input.shot);
    const riskNotices = buildRiskNotices(input.shot, locationAsset, startEntries);
    const strength = strengthFromPackage(input.shot, locationAsset, startEntries, riskNotices);
    const framePromptInstructions = buildFrameInstructions(input.shot, locationAsset, startEntries);
    const continuityPromptInstructions = buildContinuityInstructions(input.shot, generationMode, startEntries);

    const preview: ShotContinuityPreview = {
      shotId: input.shot.id,
      shotLabel: input.shot.shot_id,
      locationState,
      direction: toLocationViewSummary(direction, input.shot.location_asset_id || null),
      strength,
      generationMode,
      referenceManifest: startEntries,
      fallbackChain: buildFallbackChain(input.shot, locationAsset, startEntries),
      adaptationNotes: buildAdaptationNotes(input.shot, locationAsset, startEntries),
      riskNotices,
      continuityBase: null,
    };

    return {
      shotId: input.shot.id,
      framePromptInstructions,
      continuityPromptInstructions,
      startFrameReferenceManifest: startEntries,
      endFrameReferenceManifest: endEntries,
      providerReadyReferences: startEntries.map(entry => ({
        url: entry.url,
        role: entry.providerRole,
        manifestEntryId: entry.id,
      })),
      persistedStartFrameManifest: startFrameImageOrder,
      persistedEndFrameManifest: endFrameImageOrder,
      selectedContinuityBase: null,
      preview,
      debugMetadata: {
        startFrameManifest,
        endFrameManifest,
        scopedAssetCount: scopedAssets.length,
        enrichedAssetCount: enrichedAssets.length,
        locationReferenceStrategy: locationAsset?.location_reference_strategy || 'none',
      },
    };
  }

  buildGenerationPackages(inputs: ContinuityCompositionInput[]): GenerationContinuityPackage[] {
    return inputs.map(input => this.buildGenerationPackage(input));
  }
}

export const continuityCompositionService = new ContinuityCompositionService();
