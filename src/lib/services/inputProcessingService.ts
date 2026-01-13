import type { InputMode, ProjectType, ContentRating } from '@/types/project';
import type { UploadedFile } from '@/components/pipeline/FileStagingArea';

export interface ProcessedInput {
  mode: InputMode;
  primaryContent: string;
  contextFiles: Array<{
    name: string;
    content: string;
    tag?: string;
  }>;
  projectParams: {
    targetLengthMin: number;
    targetLengthMax: number;
    projectType: ProjectType;
    contentRating: ContentRating;
    genres: string[];
    tonalPrecision: string;
    writingStyleCapsuleId?: string;
  };
}

export interface InputProcessingRequest {
  selectedMode: InputMode;
  selectedProjectType: ProjectType;
  selectedRating: ContentRating;
  selectedGenres: string[];
  targetLength: [number, number];
  tonalPrecision: string;
  uploadedFiles: UploadedFile[];
  ideaText: string;
}

class InputProcessingService {
  /**
   * Process Stage 1 input based on the selected mode
   */
  processInput(request: InputProcessingRequest): ProcessedInput {
    const {
      selectedMode,
      selectedProjectType,
      selectedRating,
      selectedGenres,
      targetLength,
      tonalPrecision,
      uploadedFiles,
      ideaText
    } = request;

    // Find primary input
    let primaryContent = '';
    const contextFiles: Array<{ name: string; content: string; tag?: string }> = [];

    if (selectedMode === 'expansion') {
      // For expansion mode, use the idea text as primary content
      primaryContent = ideaText;
      
      // All uploaded files become context files
      uploadedFiles.forEach(file => {
        if (file.content) {
          contextFiles.push({
            name: file.name,
            content: file.content,
            tag: file.tag
          });
        }
      });
    } else {
      // For other modes, find the primary file
      const primaryFile = uploadedFiles.find(f => f.isPrimary);
      if (primaryFile?.content) {
        primaryContent = primaryFile.content;
      }

      // All non-primary files become context files
      uploadedFiles
        .filter(f => !f.isPrimary && f.content)
        .forEach(file => {
          contextFiles.push({
            name: file.name,
            content: file.content!,
            tag: file.tag
          });
        });
    }

    return {
      mode: selectedMode,
      primaryContent,
      contextFiles,
      projectParams: {
        targetLengthMin: targetLength[0] * 60, // Convert to seconds
        targetLengthMax: targetLength[1] * 60,
        projectType: selectedProjectType,
        contentRating: selectedRating,
        genres: selectedGenres,
        tonalPrecision
      }
    };
  }

  /**
   * Validate that the input is ready for processing
   */
  validateInput(request: InputProcessingRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required fields
    if (!request.selectedMode) {
      errors.push('Input mode is required');
    }

    if (!request.selectedProjectType) {
      errors.push('Project type is required');
    }

    if (request.tonalPrecision.length < 10) {
      errors.push('Tonal precision must be at least 10 characters');
    }

    // Mode-specific validation
    if (request.selectedMode === 'expansion') {
      if (request.ideaText.length < 20) {
        errors.push('Idea text must be at least 20 characters for expansion mode');
      }
    } else {
      // Other modes require file uploads
      if (request.uploadedFiles.length === 0) {
        errors.push(`${request.selectedMode} mode requires at least one file upload`);
      }

      const primaryFile = request.uploadedFiles.find(f => f.isPrimary);
      if (!primaryFile) {
        errors.push('A primary input file must be designated');
      }

      if (primaryFile && !primaryFile.content) {
        errors.push('Primary file content could not be read');
      }
    }

    // Validate target length
    if (request.targetLength[0] >= request.targetLength[1]) {
      errors.push('Target length minimum must be less than maximum');
    }

    if (request.targetLength[0] < 1 || request.targetLength[1] > 15) {
      errors.push('Target length must be between 1 and 15 minutes');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get mode-specific instructions for the user
   */
  getModeInstructions(mode: InputMode): string {
    switch (mode) {
      case 'expansion':
        return 'Provide a brief story idea or concept. The AI will expand this into a full narrative treatment with detailed scenes and character development.';
      
      case 'condensation':
        return 'Upload a large document (novel, long script, etc.). The AI will analyze and condense it into a focused cinematic narrative suitable for your target length.';
      
      case 'transformation':
        return 'Upload source material and optionally provide reference files. The AI will transform the narrative based on your tonal guidance (e.g., "Hamlet in space" or "Pride and Prejudice as a thriller").';
      
      case 'script-skip':
        return 'Upload a formatted screenplay. The system will parse it directly and skip to the Master Script stage, optionally using any character/setting definition files you provide.';
      
      default:
        return 'Select an input mode to see specific instructions.';
    }
  }

  /**
   * Get recommended file types for each mode
   */
  getRecommendedFileTypes(mode: InputMode): string[] {
    switch (mode) {
      case 'expansion':
        return ['Text files with research notes', 'Character descriptions', 'World-building documents'];
      
      case 'condensation':
        return ['Novels (PDF/Word)', 'Long scripts', 'Story collections'];
      
      case 'transformation':
        return ['Source material (any format)', 'Reference works', 'Style guides', 'Parody targets'];
      
      case 'script-skip':
        return ['Formatted screenplays', 'Character sheets (JSON/structured)', 'Setting descriptions'];
      
      default:
        return [];
    }
  }
}

export const inputProcessingService = new InputProcessingService();
