/**
 * Style Capsule Types
 * TypeScript interfaces for style capsules used in writing and visual generation
 */

export type StyleCapsuleType = 'writing' | 'visual';

export interface DesignPillars {
  colorPalette?: string;
  mood?: string;
  medium?: string;
  lighting?: string;
  cameraLanguage?: string;
  [key: string]: string | undefined;
}

export interface StyleCapsuleLibrary {
  id: string;
  userId: string | null;
  name: string;
  description?: string;
  isPreset: boolean;
  createdAt: string;
  updatedAt: string;
  capsules?: StyleCapsule[];
}

export interface BaseStyleCapsule {
  id: string;
  libraryId: string;
  userId: string;
  name: string;
  type: StyleCapsuleType;
  isPreset: boolean;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
  library?: StyleCapsuleLibrary;
}

export interface WritingStyleCapsule extends BaseStyleCapsule {
  type: 'writing';
  exampleTextExcerpts?: string[];
  styleLabels?: string[];
  negativeConstraints?: string[];
  freeformNotes?: string;
}

export interface VisualStyleCapsule extends BaseStyleCapsule {
  type: 'visual';
  designPillars?: DesignPillars;
  referenceImageUrls?: string[];
  descriptorStrings?: string;
}

export type StyleCapsule = WritingStyleCapsule | VisualStyleCapsule;

// Create/Update interfaces
export interface WritingStyleCapsuleCreate {
  name: string;
  type: 'writing';
  libraryId: string;
  exampleTextExcerpts?: string[];
  styleLabels?: string[];
  negativeConstraints?: string[];
  freeformNotes?: string;
}

export interface VisualStyleCapsuleCreate {
  name: string;
  type: 'visual';
  libraryId: string;
  designPillars?: DesignPillars;
  referenceImageUrls?: string[];
  descriptorStrings?: string;
}

export type StyleCapsuleCreate = WritingStyleCapsuleCreate | VisualStyleCapsuleCreate;

// Update interfaces
export interface WritingStyleCapsuleUpdate {
  name?: string;
  exampleTextExcerpts?: string[];
  styleLabels?: string[];
  negativeConstraints?: string[];
  freeformNotes?: string;
  isFavorite?: boolean;
}

export interface VisualStyleCapsuleUpdate {
  name?: string;
  designPillars?: DesignPillars;
  referenceImageUrls?: string[];
  descriptorStrings?: string;
  isFavorite?: boolean;
}

export type StyleCapsuleUpdate = WritingStyleCapsuleUpdate | VisualStyleCapsuleUpdate;

// API Response types
export interface StyleCapsuleListResponse {
  data: StyleCapsule[];
}

export interface StyleCapsuleResponse {
  data: StyleCapsule;
}

export interface StyleCapsuleLibraryListResponse {
  data: StyleCapsuleLibrary[];
}

export interface StyleCapsuleLibraryResponse {
  data: StyleCapsuleLibrary;
}

// Form data types for editors
export interface WritingStyleCapsuleFormData {
  name: string;
  exampleTextExcerpts: string[];
  styleLabels: string[];
  negativeConstraints: string[];
  freeformNotes: string;
  isAdvancedMode: boolean;
}

export interface VisualStyleCapsuleFormData {
  name: string;
  designPillars: DesignPillars;
  descriptorStrings: string;
  referenceImages: File[];
}

// Utility types
export interface StyleCapsuleFilter {
  type?: StyleCapsuleType;
  isPreset?: boolean;
  isFavorite?: boolean;
  search?: string;
}

// Preset capsule IDs (for easy reference)
export const PRESET_CAPSULE_IDS = {
  WRITING: {
    HEMINGWAY_MINIMALIST: 'preset-hemingway-minimalist',
    VICTORIAN_ORNATE: 'preset-victorian-ornate',
    HARD_BOILED_NOIR: 'preset-hard-boiled-noir',
    WHIMSICAL_FANTASY: 'preset-whimsical-fantasy'
  },
  VISUAL: {
    NEO_NOIR: 'preset-neo-noir',
    PIXAR_ANIMATION: 'preset-pixar-animation',
    CINEMA_VERITE: 'preset-cinema-verite',
    CYBERPUNK_NEON: 'preset-cyberpunk-neon'
  }
} as const;

// Type guards
export function isWritingStyleCapsule(capsule: StyleCapsule): capsule is WritingStyleCapsule {
  return capsule.type === 'writing';
}

export function isVisualStyleCapsule(capsule: StyleCapsule): capsule is VisualStyleCapsule {
  return capsule.type === 'visual';
}

// Validation helpers
export function validateWritingStyleCapsule(data: Partial<WritingStyleCapsuleCreate>): string[] {
  const errors: string[] = [];

  if (!data.name?.trim()) {
    errors.push('Name is required');
  }

  if (!data.libraryId) {
    errors.push('Library selection is required');
  }

  if (data.exampleTextExcerpts && data.exampleTextExcerpts.some(excerpt => !excerpt.trim())) {
    errors.push('Example text excerpts cannot be empty');
  }

  return errors;
}

export function validateVisualStyleCapsule(data: Partial<VisualStyleCapsuleCreate>): string[] {
  const errors: string[] = [];

  if (!data.name?.trim()) {
    errors.push('Name is required');
  }

  if (!data.libraryId) {
    errors.push('Library selection is required');
  }

  return errors;
}

// Default values
export const DEFAULT_DESIGN_PILLARS: DesignPillars = {
  colorPalette: '',
  mood: '',
  medium: '',
  lighting: '',
  cameraLanguage: ''
};

export const DEFAULT_WRITING_CAPSULE_FORM: WritingStyleCapsuleFormData = {
  name: '',
  exampleTextExcerpts: [''],
  styleLabels: [],
  negativeConstraints: [],
  freeformNotes: '',
  isAdvancedMode: false
};

export const DEFAULT_VISUAL_CAPSULE_FORM: VisualStyleCapsuleFormData = {
  name: '',
  designPillars: { ...DEFAULT_DESIGN_PILLARS },
  descriptorStrings: '',
  referenceImages: []
};
