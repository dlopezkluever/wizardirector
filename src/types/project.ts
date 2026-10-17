export type ProjectStatus = 
  | 'draft' 
  | 'in-progress' 
  | 'complete' 
  | 'archived';

export type StageStatus =
  | 'locked'
  | 'active'
  | 'pending'
  | 'outdated'
  | 'skipped';

/** Provenance tag for a stage's content, mirrors backend stage_states.origin. */
export type StageOrigin =
  | 'skipped'
  | 'imported'
  | 'ai-generated'
  | 'authored';

export type InputMode =
  | 'expansion'
  | 'condensation'
  | 'transformation'
  | 'script-skip'
  | 'streamline';

export type ProjectType = 
  | 'narrative' 
  | 'commercial' 
  | 'audio-visual';

export type ContentRating =
  | 'G'
  | 'PG'
  | 'PG-13'
  | 'M';

export type AspectRatio = '16:9' | '9:16';

export interface StageProgress {
  stage: number;
  status: StageStatus;
  label: string;
  origin?: StageOrigin;
}

export interface SceneProgress {
  totalScenes: number;
  completedScenes: number;
  currentSceneNumber: number | null;
  currentSceneStage: number | null;
  currentSceneStatus: string | null;
  latestSceneUpdate: string | null;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  branch: string;
  currentStage: number;
  stages: StageProgress[];
  createdAt: Date;
  updatedAt: Date;
  thumbnail?: string;
  inputMode?: InputMode;
  projectType?: ProjectType;
  contentRating?: ContentRating;
  genres?: string[];
  targetLength?: {
    min: number;
    max: number;
  };
  aspectRatio?: AspectRatio;
  sceneProgress?: SceneProgress;
}

export interface ProjectSettings {
  projectTitle?: string;
  inputMode: InputMode;
  projectType: ProjectType;
  contentRating: ContentRating;
  genres: string[];
  tonalPrecision: string;
  targetLength: {
    min: number;
    max: number;
  };
  writingStyleCapsuleId?: string;
  aspectRatio?: AspectRatio;
}
