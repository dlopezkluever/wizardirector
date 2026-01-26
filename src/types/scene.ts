// Aligned with database schema (migration 003)
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
  expectedCharacters: string[]; // Future enhancement - extracted from script
  expectedLocation: string; // Future enhancement - extracted from scene heading
  priorSceneEndState?: string;
  endFrameThumbnail?: string;
  shots: Shot[];
  continuityRisk?: ContinuityRisk;
}

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
