export type AssetType = 'character' | 'prop' | 'location' | 'extra_archetype';

export interface GlobalAsset {
  id: string;
  user_id: string;
  name: string;
  asset_type: AssetType;
  description: string;
  image_prompt?: string;
  image_key_url?: string;
  visual_style_capsule_id?: string;
  voice_profile_id?: string;
  version: number;
  created_at: string;
  updated_at: string;
  promoted_from_project_id?: string;
}

export interface ProjectAsset {
  id: string;
  project_id: string;
  branch_id: string;
  global_asset_id?: string;
  source_version?: number;
  name: string;
  asset_type: AssetType;
  description: string;
  image_prompt?: string;
  image_key_url?: string;
  visual_style_capsule_id?: string;
  locked: boolean;
  deferred?: boolean;
  style_outdated?: boolean;
  scene_numbers?: number[];
  source?: 'extracted' | 'manual' | 'cloned';
  overridden_fields?: string[]; // Fields that have been manually edited and should not be overwritten during sync
  last_synced_at?: string; // Timestamp of last sync from global asset
  metadata?: {
    confidence_score?: number;
    is_priority?: boolean;
    has_conflicts?: boolean;
    conflict_details?: string;
    source_mentions?: string[];
  };
  created_at: string;
  updated_at: string;
}

export type AssetDecision = 'keep' | 'defer' | 'delete';

export interface ProjectAssetGenerationAttempt {
  id: string;
  project_asset_id: string;
  image_url: string;
  storage_path?: string;
  source: 'generated' | 'uploaded';
  is_selected: boolean;
  original_filename?: string;
  file_size_bytes?: number;
  mime_type?: string;
  attempt_number: number;
  created_at: string;
  updated_at: string;
}

export interface CreateAssetRequest {
  name: string;
  assetType: AssetType;
  description: string;
  imagePrompt?: string;
  visualStyleCapsuleId?: string;
  voiceProfileId?: string;
  promotedFromProjectId?: string;
}

export interface UpdateAssetRequest {
  name?: string;
  assetType?: AssetType;
  description?: string;
  imagePrompt?: string;
  visualStyleCapsuleId?: string;
  voiceProfileId?: string;
  removeImage?: boolean;
}

export interface AssetFilter {
  type?: AssetType;
  hasImage?: boolean;
  searchQuery?: string;
}

export interface AssetUsage {
  id: string;
  title: string;
}

export interface DeleteAssetError {
  error: string;
  message: string;
  projects: AssetUsage[];
}

export interface AssetVersionStatus {
  projectAssetId: string;
  globalAssetId: string;
  projectVersion: number;
  globalVersion: number;
  isOutdated: boolean;
  globalAssetName: string;
}

export interface CloneAssetRequest {
  globalAssetId: string;
  overrideDescription?: string;
  target_branch_id?: string;
  matchWithAssetId?: string;
  descriptionStrategy?: 'global' | 'project' | 'merge';
  regenerateImage?: boolean;
  nameStrategy?: 'project' | 'global' | 'custom';
  customName?: string;
}

export interface AssetMatchResult {
  projectAsset: ProjectAsset;
  matched: boolean; // true if matched with existing, false if cloned new
}

// 3C.2: Multi-angle asset generation types
export type AngleType = 'front' | 'side' | 'three_quarter' | 'back';

export interface AssetAngleVariant {
  id: string;
  project_asset_id: string;
  angle_type: AngleType;
  image_url: string | null;
  storage_path: string | null;
  image_generation_job_id: string | null;
  prompt_snapshot: string | null;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

export const ANGLE_LABELS: Record<AngleType, string> = {
  front: 'Front View',
  side: 'Side Profile',
  three_quarter: '3/4 View',
  back: 'Back View',
};

export const ANGLE_PROMPTS: Record<AngleType, string> = {
  front: 'front-facing view, looking directly at the camera',
  side: 'side profile view, facing left, showing full silhouette',
  three_quarter: 'three-quarter angle view, slightly turned from the camera',
  back: 'rear view from behind, showing the back of the character',
};

// Two-pass extraction types (3A.1)
export interface AssetPreviewEntity {
  name: string;
  type: AssetType;
  sceneNumbers: number[];
  mentionCount: number;
}

export interface AssetPreviewResponse {
  entities: AssetPreviewEntity[];
  counts: { characters: number; locations: number; props: number };
}

export interface AssetConfirmRequest {
  selectedEntities: Array<{
    name: string;
    type: AssetType;
    decision?: AssetDecision;
    sceneNumbers?: number[];
  }>;
}

// Merge & Split types (Stage 5 asset deduplication / variant creation)
export interface MergeAssetsRequest {
  survivorAssetId: string;
  absorbedAssetIds: string[];
  updatedName?: string;
}

export interface MergeAssetsResponse {
  success: true;
  survivor: ProjectAsset;
  instancesRepointed: number;
  assetsAbsorbed: number;
}

export interface SplitAssetRequest {
  variantName: string;
  variantDescription?: string;
  scenesForVariant: number[];
}

export interface SplitAssetResponse {
  success: true;
  original: ProjectAsset;
  variant: ProjectAsset;
  instancesRepointed: number;
}

