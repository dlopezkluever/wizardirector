// Aligned with database schema (migration 003)
import type { ProjectAsset } from './asset';

export type SceneStatus = 
  | 'draft'
  | 'shot_list_ready'
  | 'frames_locked'
  | 'video_complete'
  | 'outdated'
  | 'continuity_broken';

export type ContinuityRisk = 'safe' | 'risky' | 'broken';

export type PromptType = 'frame' | 'video' | 'system';

export interface Shot {
  id: string;
  sceneId: string;
  shotId: string;
  duration: number;
  dialogue: string;
  action: string;
  charactersForeground: string[];
  charactersBackground: string[];
  setting: string;
  camera: string;
  continuityFlags?: string[];
  beatReference?: string;
}

export interface Scene {
  id: string;
  sceneNumber: number;
  slug: string;
  status: SceneStatus;
  scriptExcerpt: string; // Full scene text from database
  header: string; // Derived from scriptExcerpt (first line)
  openingAction: string; // Derived from scriptExcerpt (lines after header)
  expectedCharacters: string[]; // Raw extracted character names (from Stage 4 dependency extraction)
  expectedLocation: string; // Extracted location (from Stage 4 dependency extraction)
  expectedProps: string[]; // Raw extracted prop names (from Stage 4 dependency extraction)
  priorSceneEndState?: string;
  endFrameThumbnail?: string;
  shots: Shot[];
  continuityRisk?: ContinuityRisk;
  /** ISO timestamp when shot list was locked; present when scene is locked for Stage 8+ */
  shotListLockedAt?: string;
  /** Phase 5: Scene asset instances (lazy-loaded via API) */
  assetInstances?: SceneAssetInstance[];
}

/** Legacy shape; prefer SceneAssetInstance for new code (aligned with scene_asset_instances table). */
export interface SceneAsset {
  id: string;
  sceneId: string;
  name: string;
  type: 'character' | 'location' | 'prop';
  source: 'master' | 'prior-scene' | 'new';
  reviewStatus: 'unreviewed' | 'edited' | 'locked';
  description: string;
  imageKey?: string;
  masterAssetId?: string;
}

/** Aligned with database schema (migration 015 scene_asset_instances). */
export interface SceneAssetInstance {
  id: string;
  scene_id: string;
  project_asset_id: string;
  description_override?: string | null;
  image_key_url?: string | null;
  status_tags: string[];
  carry_forward: boolean;
  inherited_from_instance_id?: string | null;
  project_asset?: ProjectAsset;
  effective_description: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSceneAssetInstanceRequest {
  sceneId: string;
  projectAssetId: string;
  descriptionOverride?: string;
  statusTags?: string[];
  carryForward?: boolean;
  inheritedFromInstanceId?: string;
}

export interface UpdateSceneAssetInstanceRequest {
  descriptionOverride?: string;
  imageKeyUrl?: string;
  statusTags?: string[];
  carryForward?: boolean;
}

export interface SceneAssetRelevanceResult {
  scene_id: string;
  relevant_assets: Array<{
    project_asset_id: string;
    name: string;
    asset_type: 'character' | 'prop' | 'location';
    inherited_from: 'master' | 'previous_scene_instance';
    starting_description: string;
    requires_visual_update: boolean;
    status_tags_inherited: string[];
    relevance_rationale: string;
  }>;
  new_assets_required: Array<{
    name: string;
    asset_type: string;
    description: string;
    justification: string;
  }>;
}

export interface PromptSet {
  shotId: string;
  framePrompt: string;
  videoPrompt: string;
  systemPrompt?: string;
  requiresEndFrame: boolean;
  compatibleModels: string[];
}

export interface FramePair {
  shotId: string;
  startFrame?: string;
  endFrame?: string;
  startFrameStatus: 'pending' | 'generating' | 'approved' | 'rejected';
  endFrameStatus: 'pending' | 'generating' | 'approved' | 'rejected';
}

export interface SceneCheckout {
  sceneId: string;
  shots: {
    shotId: string;
    startFrame: string;
    endFrame?: string;
    prompt: string;
    creditCost: number;
  }[];
  totalCreditCost: number;
}

export interface VideoClip {
  shotId: string;
  videoUrl?: string;
  status: 'pending' | 'rendering' | 'complete' | 'failed';
  duration: number;
}

export type IssueType = 
  | 'visual-continuity'
  | 'timing'
  | 'dialogue-audio'
  | 'narrative-structure';

export interface SceneReview {
  sceneId: string;
  clips: VideoClip[];
  issues: {
    type: IssueType;
    shotId: string;
    description: string;
  }[];
}
