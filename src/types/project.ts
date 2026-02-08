export type ProjectStatus = 
  | 'draft' 
  | 'in-progress' 
  | 'complete' 
  | 'archived';

export type StageStatus = 
  | 'locked' 
  | 'active' 
  | 'pending' 
  | 'outdated';

export type InputMode = 
  | 'expansion' 
  | 'condensation' 
  | 'transformation' 
  | 'script-skip';

export type ProjectType = 
  | 'narrative' 
  | 'commercial' 
  | 'audio-visual';

export type ContentRating = 
  | 'G' 
  | 'PG' 
  | 'PG-13' 
  | 'M';

export interface StageProgress {
  stage: number;
  status: StageStatus;
  label: string;
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
}
