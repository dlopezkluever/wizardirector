export type AssetType = 'character' | 'prop' | 'location';

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

