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

export type TransformationType = 'instant' | 'gradual' | 'within_shot';

export interface TransformationFlag {
  characterName: string;
  type: TransformationType;
  description: string;
  isTrigger: boolean;
  isCompletion?: boolean;
}

export interface TransformationEvent {
  id: string;
  scene_asset_instance_id: string;
  scene_id: string;
  trigger_shot_id: string;
  transformation_type: TransformationType;
  completion_shot_id: string | null;
  pre_description: string;
  post_description: string;
  transformation_narrative: string | null;
  pre_image_key_url: string | null;
  post_image_key_url: string | null;
  pre_status_tags: string[];
  post_status_tags: string[];
  detected_by: 'stage7_extraction' | 'stage8_relevance' | 'manual';
  confirmed: boolean;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
  trigger_shot?: { id: string; shot_id: string; shot_order: number };
  completion_shot?: { id: string; shot_id: string; shot_order: number } | null;
}

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
  transformationFlags?: TransformationFlag[];
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
  /** Whether this scene is deferred/sidelined by the user */
  isDeferred?: boolean;
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

/** Aligned with database schema (migration 015 + 017 + 022 scene_asset_instances). */
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
  /** Audit trail: increments on each update (migration 017). */
  modification_count?: number;
  /** Audit trail: which field was last changed (migration 017). */
  last_modified_field?: string | null;
  /** Audit trail: optional user-provided reason for change (migration 017). */
  modification_reason?: string | null;
  /** 3B.4: Use master asset image directly without generating (migration 022). */
  use_master_as_is?: boolean;
  /** 3B.2: URL of the selected master reference image (migration 022). */
  selected_master_reference_url?: string | null;
  /** 3B.2: Source of master reference (migration 022). */
  selected_master_reference_source?: 'stage5_master' | 'prior_scene_instance' | null;
  /** 3B.2: Instance ID if reference is from a prior scene instance (migration 022). */
  selected_master_reference_instance_id?: string | null;
  created_at: string;
  updated_at: string;
}

/** A single generation attempt for a scene asset instance (migration 022). */
export interface SceneAssetGenerationAttempt {
  id: string;
  scene_asset_instance_id: string;
  image_url: string;
  storage_path?: string | null;
  source: 'generated' | 'uploaded' | 'master_copy';
  is_selected: boolean;
  image_generation_job_id?: string | null;
  prompt_snapshot?: string | null;
  cost_credits?: number | null;
  original_filename?: string | null;
  file_size_bytes?: number | null;
  mime_type?: string | null;
  copied_from_url?: string | null;
  attempt_number: number;
  created_at: string;
  updated_at: string;
}

/** A single item in the master reference chain (3B.2). */
export interface MasterReferenceItem {
  source: 'stage5_master' | 'prior_scene_instance' | 'transformation';
  imageUrl: string;
  sceneNumber: number | null;
  instanceId?: string;
  transformationDescription?: string;
}

/** 3B.8: A persisted AI suggestion for a new asset in a scene. */
export interface SceneAssetSuggestion {
  id: string;
  scene_id: string;
  asset_id?: string | null;
  name: string;
  asset_type: string;
  description?: string;
  justification?: string;
  suggested_by: string;
  accepted: boolean;
  dismissed: boolean;
  created_at: string;
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
  /** Optional reason for change (audit trail). */
  modificationReason?: string | null;
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

export interface ReferenceImageOrderEntry {
  label: string;
  assetName: string;
  url: string;
  type: string;
}

export interface PromptSetTransformationContext {
  assetName: string;
  state: 'pre-transform' | 'post-transform' | 'transforming';
  transformationType: TransformationType;
}

export interface PromptSet {
  shotId: string;
  shotUuid?: string; // Database UUID for API calls
  framePrompt: string;
  videoPrompt: string;
  systemPrompt?: string;
  requiresEndFrame: boolean;
  aiRecommendsEndFrame?: boolean | null;
  compatibleModels: string[];
  referenceImageOrder?: ReferenceImageOrderEntry[] | null;
  promptsGeneratedAt?: string | null;
  // Shot context data (included in API response)
  duration?: number;
  dialogue?: string;
  action?: string;
  setting?: string;
  camera?: string;
  // Transformation context (populated when events affect this shot)
  transformationContext?: PromptSetTransformationContext[];
  // UI state (not persisted)
  isGenerating?: boolean;
  hasChanges?: boolean;
}

export interface FramePair {
  shotId: string;
  startFrame?: string;
  endFrame?: string;
  startFrameStatus: 'pending' | 'generating' | 'approved' | 'rejected';
  endFrameStatus: 'pending' | 'generating' | 'approved' | 'rejected';
}

// Stage 10 Frame Generation Types
export type FrameStatus = 'pending' | 'generating' | 'generated' | 'approved' | 'rejected';
export type FrameType = 'start' | 'end';
export type GenerationMode = 'quick' | 'control';

export interface Frame {
  id: string;
  shotId: string;
  frameType: FrameType;
  status: FrameStatus;
  imageUrl: string | null;
  storagePath: string | null;
  currentJobId: string | null;
  generationCount: number;
  totalCostCredits: number;
  previousFrameId: string | null;
  promptSnapshot: string | null;
  inpaintCount: number;
  lastInpaintMaskPath: string | null;
  createdAt: string;
  updatedAt: string;
  generatedAt: string | null;
  approvedAt: string | null;
}

export interface ShotWithFrames {
  id: string;
  shotId: string;
  shotOrder: number;
  duration: number;
  action: string;
  dialogue: string;
  setting: string;
  camera: string;
  requiresEndFrame: boolean;
  aiRecommendsEndFrame?: boolean | null;
  framePrompt: string | null;
  videoPrompt: string | null;
  referenceImageOrder?: ReferenceImageOrderEntry[] | null;
  endFrameReferenceImageOrder?: ReferenceImageOrderEntry[] | null;
  endFramePrompt?: string | null;
  startFrame: Frame | null;
  endFrame: Frame | null;
}

export interface FrameCostSummary {
  totalCredits: number;
  frameCount: number;
}

export interface FrameJobStatus {
  frameId: string;
  jobId: string;
  status: 'queued' | 'processing' | 'generating' | 'uploading' | 'completed' | 'failed';
  imageUrl?: string;
  error?: {
    code: string;
    message: string;
  };
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

// Stage 11 Checkout Types (API-driven)
export type ModelVariant = 'veo_3_1_fast' | 'veo_3_1_standard';

export interface ShotCheckoutDetail {
  shotId: string;
  shotUuid: string;
  shotOrder: number;
  duration: number;
  startFrameId: string | null;
  endFrameId: string | null;
  startFrameUrl: string | null;
  endFrameUrl: string | null;
  startFrameStatus: FrameStatus;
  endFrameStatus: FrameStatus | null;
  requiresEndFrame: boolean;
  framePrompt: string | null;
  videoPrompt: string | null;
  imageCost: number;
  videoCostFast: number;
  videoCostStandard: number;
}

export interface DependencyWarnings {
  unapprovedFrames: { shotId: string; frameType: 'start' | 'end' }[];
  priorSceneMismatch: boolean;
  priorSceneEndFrameUrl: string | null;
}

export interface CheckoutData {
  sceneId: string;
  sceneName: string;
  sceneNumber: number;
  shots: ShotCheckoutDetail[];
  sceneTotalCostFast: number;
  sceneTotalCostStandard: number;
  projectRunningTotal: number;
  userBalance: number;
  lowCreditThreshold: number;
  isLowCredit: boolean;
  warnings: DependencyWarnings;
}

export interface UserCreditBalance {
  balance: number;
  lowCreditThreshold: number;
  isLowCredit: boolean;
}

export interface ConfirmRenderResult {
  success: boolean;
  jobsCreated: number;
  totalEstimatedCost: number;
  jobs: VideoGenerationJob[];
}

// Stage 12 Video Job Types
export type VideoJobStatus = 'queued' | 'processing' | 'generating' | 'uploading' | 'completed' | 'failed';

export interface VideoGenerationJob {
  id: string;
  projectId: string;
  branchId: string;
  sceneId: string;
  shotId: string;
  modelVariant: ModelVariant;
  status: VideoJobStatus;
  startFrameId: string;
  endFrameId: string | null;
  startFrameUrl: string;
  endFrameUrl: string | null;
  videoPromptSnapshot: string;
  framePromptSnapshot: string | null;
  durationSeconds: number;
  estimatedCost: number;
  actualCost: number | null;
  videoUrl: string | null;
  storagePath: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  attemptCount: number;
  maxRetries: number;
  providerJobId: string | null;
  providerMetadata: Record<string, unknown> | null;
  createdAt: string;
  queuedAt: string;
  processingStartedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
}

export interface VideoJobsResponse {
  jobs: VideoGenerationJob[];
  summary: {
    total: number;
    completed: number;
    failed: number;
    active: number;
    progress: number;
  };
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
