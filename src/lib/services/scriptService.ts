import { supabase } from '@/lib/supabase';
import { stripHtmlTags } from '@/lib/utils/screenplay-converter';
import type { Beat } from './beatService';
import { stageStateService } from './stageStateService';

// Internal interface for scene extraction (before database persistence)
export interface Scene {
  id: string;
  sceneNumber: number;
  slug: string;
  heading: string;
  content: string;
}

// Enhanced parsed heading structure
interface ParsedHeading {
  type: 'INT' | 'EXT';
  location: string;
  timeOfDay?: string;
  fullHeading: string;
}

export interface GenerateScriptRequest {
  beatSheet: Beat[];
  projectParams: {
    projectId?: string;
    targetLengthMin: number;
    targetLengthMax: number;
    contentRating: string;
    genres: string[];
    tonalPrecision: string;
    writingStyleCapsuleId?: string;
  };
}

export interface GenerateScriptResponse {
  formattedScript: string;
  scenes: Scene[];
  estimatedPageCount?: number;
  langsmithTraceId: string;
  promptTemplateVersion: string;
  styleCapsuleMetadata?: {
    styleCapsuleId: string;
    injectionContext: Record<string, any>;
  };
}

export interface RegenerateScriptRequest extends GenerateScriptRequest {
  guidance: string;
}

export interface RegenerateSectionRequest {
  scriptContext: {
    beforeText: string;
    highlightedText: string;
    afterText: string;
  };
  editRequest: string;
}

class ScriptService {
  /**
   * Generate master script from beat sheet
   */
  async generateScript(request: GenerateScriptRequest): Promise<GenerateScriptResponse> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    // Format beat sheet content for the LLM
    const beatSheetContent = this.formatBeatSheetForPrompt(request.beatSheet);

    // Get current stage state ID for application logging
    const projectId = request.projectParams.projectId || '';
    const currentStageState = projectId ? await stageStateService.getStageState(projectId, 4) : null;

    const llmRequest = {
      templateName: 'master_script_generation',
      variables: {
        beat_sheet_content: beatSheetContent,
        target_length_min: request.projectParams.targetLengthMin,
        target_length_max: request.projectParams.targetLengthMax,
        content_rating: request.projectParams.contentRating,
        genres: request.projectParams.genres.join(', '),
        tonal_precision: request.projectParams.tonalPrecision,
        writing_style_context: '', // Empty placeholder - backend will inject
        writing_style_capsule_id: request.projectParams.writingStyleCapsuleId || ''
      },
      metadata: {
        projectId: projectId,
        branchId: 'main', // Backend will look up active branch from projectId
        stage: 4,
        stageStateId: currentStageState?.id,
        operation: 'script_generation'
      }
    };

    console.log('🎬 [SCRIPT SERVICE] Generating script from beat sheet...');

    const response = await fetch('/api/llm/generate-from-template', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(llmRequest),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate script');
    }

    const result = await response.json();
    const parsed = this.parseScriptResponse(result.data.content);

    console.log('✅ [SCRIPT SERVICE] Script generated successfully');

    return {
      formattedScript: parsed.formattedScript,
      scenes: parsed.scenes,
      estimatedPageCount: parsed.estimatedPageCount,
      langsmithTraceId: result.data.traceId,
      promptTemplateVersion: result.data.promptTemplateVersion || '1.0.0',
      styleCapsuleMetadata: result.data.styleCapsuleMetadata // Pass through from backend
    };
  }

  /**
   * Regenerate script with user guidance
   */
  async regenerateScript(request: RegenerateScriptRequest): Promise<GenerateScriptResponse> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const beatSheetContent = this.formatBeatSheetForPrompt(request.beatSheet);

    // Get current stage state ID for application logging
    const projectId = request.projectParams.projectId || '';
    const currentStageState = projectId ? await stageStateService.getStageState(projectId, 4) : null;

    const llmRequest = {
      templateName: 'master_script_generation',
      variables: {
        beat_sheet_content: beatSheetContent,
        target_length_min: request.projectParams.targetLengthMin,
        target_length_max: request.projectParams.targetLengthMax,
        content_rating: request.projectParams.contentRating,
        genres: request.projectParams.genres.join(', '),
        tonal_precision: request.projectParams.tonalPrecision,
        writing_style_context: '', // Empty placeholder - backend will inject
        writing_style_capsule_id: request.projectParams.writingStyleCapsuleId || '',
        regeneration_guidance: request.guidance
      },
      metadata: {
        projectId: projectId,
        branchId: 'main', // Backend will look up active branch from projectId
        stage: 4,
        stageStateId: currentStageState?.id,
        operation: 'script_regeneration',
        regenerationGuidance: request.guidance
      }
    };

    console.log('🔄 [SCRIPT SERVICE] Regenerating script with guidance:', request.guidance);

    const response = await fetch('/api/llm/generate-from-template', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(llmRequest),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to regenerate script');
    }

    const result = await response.json();
    const parsed = this.parseScriptResponse(result.data.content);

    return {
      formattedScript: parsed.formattedScript,
      scenes: parsed.scenes,
      estimatedPageCount: parsed.estimatedPageCount,
      langsmithTraceId: result.data.traceId,
      promptTemplateVersion: result.data.promptTemplateVersion || '1.0.0',
      styleCapsuleMetadata: result.data.styleCapsuleMetadata // Pass through from backend
    };
  }

  /**
   * Regenerate a specific section of the script
   */
  async regenerateSection(request: RegenerateSectionRequest): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const llmRequest = {
      systemPrompt: `You are a screenplay editor. Your task is to rewrite only the highlighted section of a screenplay based on the user's request.

CRITICAL REQUIREMENTS:
1. Maintain industry-standard screenplay format (INT./EXT., Character Names in CAPS, etc.)
2. Keep the same narrative function and timing as the original
3. Be visually verbose - include rich descriptions of characters, settings, props, and actions
4. Ensure the rewritten section flows naturally with the surrounding context
5. Return ONLY the rewritten section, nothing else

The surrounding context is provided for reference only - do NOT modify it.`,
      userPrompt: `CONTEXT BEFORE (for reference only):
${request.scriptContext.beforeText}

SECTION TO REWRITE:
${request.scriptContext.highlightedText}

CONTEXT AFTER (for reference only):
${request.scriptContext.afterText}

USER REQUEST:
${request.editRequest}

Rewrite only the highlighted section based on the user's request. Maintain screenplay format and visual verbosity.`,
      metadata: {
        stage: 4,
        operation: 'section_regeneration'
      }
    };

    console.log('✏️ [SCRIPT SERVICE] Regenerating section with request:', request.editRequest);

    const response = await fetch('/api/llm/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(llmRequest),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to regenerate section');
    }

    const result = await response.json();
    
    // Clean up the response - remove any markdown or extra formatting
    let rewrittenSection = result.data.content;
    if (typeof rewrittenSection === 'string') {
      rewrittenSection = rewrittenSection.trim();
      // Remove markdown code blocks if present
      rewrittenSection = rewrittenSection.replace(/^```(?:text|screenplay)?\s*\n?/, '');
      rewrittenSection = rewrittenSection.replace(/\n?```\s*$/, '');
      rewrittenSection = rewrittenSection.trim();
    }

    console.log('✅ [SCRIPT SERVICE] Section regenerated successfully');

    return rewrittenSection;
  }

  /**
   * Generate 3 alternative rewrites for a selected section of the script
   */
  async regenerateSectionAlternatives(request: RegenerateSectionRequest): Promise<string[]> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const llmRequest = {
      systemPrompt: `You are a screenplay editor. Your task is to generate exactly 3 alternative rewrites of a highlighted section of a screenplay.

CRITICAL REQUIREMENTS:
1. Generate exactly 3 distinct alternative rewrites
2. Each alternative should take a different creative approach
3. Maintain industry-standard screenplay format (INT./EXT., Character Names in CAPS, etc.)
4. Keep the same narrative function and timing as the original
5. Be visually verbose - include rich descriptions
6. Ensure each rewritten section flows naturally with the surrounding context

Return your response as a JSON array of exactly 3 strings:
["alternative 1 text", "alternative 2 text", "alternative 3 text"]

Return ONLY the JSON array, no other text.`,
      userPrompt: `CONTEXT BEFORE (for reference only):
${request.scriptContext.beforeText}

SECTION TO REWRITE:
${request.scriptContext.highlightedText}

CONTEXT AFTER (for reference only):
${request.scriptContext.afterText}

USER REQUEST:
${request.editRequest}

Generate exactly 3 alternative rewrites of the highlighted section. Return as a JSON array of 3 strings. Maintain screenplay format.`,
      metadata: {
        stage: 4,
        operation: 'section_alternatives'
      }
    };

    console.log('✏️ [SCRIPT SERVICE] Generating 3 section alternatives...');

    const response = await fetch('/api/llm/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(llmRequest),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate section alternatives');
    }

    const result = await response.json();
    return this.parseAlternatives(result.data.content);
  }

  /**
   * Parse LLM response to extract alternatives array
   */
  private parseAlternatives(content: string | any): string[] {
    if (Array.isArray(content)) {
      return content.map(item => typeof item === 'string' ? item : JSON.stringify(item)).slice(0, 3);
    }

    if (typeof content === 'string') {
      let cleaned = content.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '');
        cleaned = cleaned.replace(/\n?```\s*$/, '');
        cleaned = cleaned.trim();
      }

      try {
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed)) {
          return parsed.map(item => typeof item === 'string' ? item : JSON.stringify(item)).slice(0, 3);
        }
        if (parsed.alternatives && Array.isArray(parsed.alternatives)) {
          return parsed.alternatives.map((item: any) => typeof item === 'string' ? item : JSON.stringify(item)).slice(0, 3);
        }
      } catch {
        const parts = cleaned.split(/\n\s*(?:\d+[.)]\s*|Alternative\s*\d+[:.]\s*)/i).filter(s => s.trim());
        if (parts.length >= 3) {
          return parts.slice(0, 3).map(p => p.trim());
        }
        return [cleaned];
      }
    }

    return ['Failed to parse alternatives'];
  }

  /**
   * Parse a scene heading into its components
   */
  private parseSceneHeading(heading: string): ParsedHeading | null {
    // Enhanced regex to capture INT/EXT, location, and time of day
    // Pattern: INT./EXT. LOCATION - DAY/NIGHT/CONTINUOUS/etc.
    const sceneHeadingRegex = /^(INT\.|EXT\.)\s+(.+?)(?:\s*-\s*(DAY|NIGHT|CONTINUOUS|LATER|MOMENTS LATER|DAWN|DUSK|MORNING|AFTERNOON|EVENING))?$/i;
    
    const match = heading.trim().match(sceneHeadingRegex);
    
    if (!match) {
      return null;
    }

    const type = match[1].replace('.', '').toUpperCase() as 'INT' | 'EXT';
    const location = match[2].trim();
    const timeOfDay = match[3]?.toUpperCase();

    return {
      type,
      location,
      timeOfDay,
      fullHeading: heading.trim()
    };
  }

  /**
   * Extract scenes from a formatted script with enhanced parsing
   */
  extractScenes(formattedScript: string): Scene[] {
    const scenes: Scene[] = [];
    const lines = formattedScript.split('\n');
    
    let currentScene: Scene | null = null;
    let sceneNumber = 1;
    let currentContent: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Try to parse as scene heading
      const parsedHeading = this.parseSceneHeading(line);

      if (parsedHeading) {
        // Save previous scene if exists
        if (currentScene && currentContent.length > 0) {
          currentScene.content = currentContent.join('\n').trim();
          
          // Validate scene has non-empty content
          if (currentScene.content.length > 0) {
            scenes.push(currentScene);
          } else {
            console.warn(`⚠️ [SCRIPT SERVICE] Scene ${currentScene.sceneNumber} has empty content, skipping`);
          }
        }

        // Generate descriptive slug with scene number for uniqueness
        // Format: {type}-{location}-{timeOfDay}-{sceneNumber} or {type}-{location}-{sceneNumber}
        // Scene number ensures uniqueness even when same location appears multiple times
        const slug = this.generateSlugFromParsedHeading(parsedHeading, sceneNumber);

        // Start new scene
        currentScene = {
          id: `scene-${sceneNumber}-${Date.now()}`,
          sceneNumber: sceneNumber,
          slug: slug,
          heading: parsedHeading.fullHeading,
          content: ''
        };

        currentContent = [parsedHeading.fullHeading]; // Include heading in content
        sceneNumber++;
      } else if (currentScene) {
        // Add line to current scene (preserve original formatting, including empty lines)
        currentContent.push(lines[i]);
      }
    }

    // Save final scene
    if (currentScene && currentContent.length > 0) {
      currentScene.content = currentContent.join('\n').trim();
      
      if (currentScene.content.length > 0) {
        scenes.push(currentScene);
      } else {
        console.warn(`⚠️ [SCRIPT SERVICE] Final scene ${currentScene.sceneNumber} has empty content, skipping`);
      }
    }

    console.log(`📋 [SCRIPT SERVICE] Extracted ${scenes.length} scenes from script`);

    // Log warnings for edge cases
    if (scenes.length === 0) {
      console.warn('⚠️ [SCRIPT SERVICE] No scenes extracted - script may not have valid scene headings');
    }

    return scenes;
  }

  /**
   * Parse LLM response for script generation
   */
  private parseScriptResponse(content: string | any): {
    formattedScript: string;
    scenes: Scene[];
    estimatedPageCount?: number;
  } {
    console.log('🔍 [SCRIPT PARSE] Input type:', typeof content);

    let parsed: any;

    // Handle case where content is already parsed
    if (typeof content === 'object' && content !== null) {
      console.log('🔍 [SCRIPT PARSE] Content is already an object');
      parsed = content;
    } else if (typeof content === 'string') {
      // Strip markdown code block markers if present
      let cleanedContent = content.trim();
      if (cleanedContent.startsWith('```')) {
        console.log('🔍 [SCRIPT PARSE] Removing markdown code block markers');
        cleanedContent = cleanedContent.replace(/^```(?:json)?\s*\n?/, '');
        cleanedContent = cleanedContent.replace(/\n?```\s*$/, '');
        cleanedContent = cleanedContent.trim();
      }

      // Try to parse as JSON first
      try {
        parsed = JSON.parse(cleanedContent);
        console.log('✅ [SCRIPT PARSE] Successfully parsed JSON');
      } catch (error) {
        // If not JSON, treat the entire content as the script
        console.log('ℹ️ [SCRIPT PARSE] Content is not JSON, treating as plain script');
        const formattedScript = stripHtmlTags(cleanedContent);
        const scenes = this.extractScenes(formattedScript);
        
        return {
          formattedScript,
          scenes,
          estimatedPageCount: Math.ceil(formattedScript.split('\n').length / 55) // Rough estimate: 55 lines per page
        };
      }
    } else {
      console.error('❌ [SCRIPT PARSE] Unexpected content type:', typeof content);
      return {
        formattedScript: '',
        scenes: [],
        estimatedPageCount: 0
      };
    }

    // Extract formatted script from parsed object
    let formattedScript = parsed.formatted_script || parsed.formattedScript || parsed.script || '';
    formattedScript = stripHtmlTags(formattedScript);
    
    // Extract or generate scenes
    let scenes: Scene[] = [];
    if (parsed.scenes && Array.isArray(parsed.scenes)) {
      scenes = parsed.scenes.map((s: any, index: number) => ({
        id: s.id || `scene-${index + 1}-${Date.now()}`,
        sceneNumber: s.scene_number || s.sceneNumber || index + 1,
        slug: s.slug || this.generateSlug(s.heading || ''),
        heading: s.heading || '',
        content: s.content || ''
      }));
    } else {
      // Extract scenes from the formatted script
      scenes = this.extractScenes(formattedScript);
    }

    console.log(`✅ [SCRIPT PARSE] Parsed script with ${scenes.length} scenes`);

    return {
      formattedScript,
      scenes,
      estimatedPageCount: parsed.estimated_page_count || parsed.estimatedPageCount || Math.ceil(formattedScript.split('\n').length / 55)
    };
  }

  /**
   * Format beat sheet for LLM prompt
   */
  private formatBeatSheetForPrompt(beats: Beat[]): string {
    return beats
      .map((beat, index) => {
        return `Beat ${beat.order}: ${beat.text}
${beat.rationale ? `Rationale: ${beat.rationale}` : ''}
Estimated screen time: ${beat.estimatedScreenTimeSeconds} seconds
`;
      })
      .join('\n');
  }

  /**
   * Generate a descriptive slug from parsed heading components
   * Format: {type}-{location}-{timeOfDay}-{sceneNumber} or {type}-{location}-{sceneNumber}
   * 
   * Includes:
   * - Scene type (int/ext)
   * - Location (sanitized)
   * - Time of day (if present, sanitized)
   * - Scene number for uniqueness (handles duplicate locations)
   * 
   * Examples: int-kitchen-day-1, int-kitchen-day-5, ext-city-street-night-2
   */
  private generateSlugFromParsedHeading(parsed: ParsedHeading, sceneNumber: number): string {
    // Sanitize location: lowercase, remove special chars, replace spaces with hyphens
    const sanitizedLocation = parsed.location
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

    // Build slug components
    const type = parsed.type.toLowerCase();
    const location = sanitizedLocation;
    
    // Sanitize time of day: lowercase, replace spaces with hyphens (handles "MOMENTS LATER" -> "moments-later")
    const timeOfDay = parsed.timeOfDay
      ? parsed.timeOfDay
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim()
      : undefined;

    // Construct slug with scene number for uniqueness
    // Scene number ensures uniqueness even when same location appears multiple times
    if (timeOfDay) {
      return `${type}-${location}-${timeOfDay}-${sceneNumber}`;
    } else {
      return `${type}-${location}-${sceneNumber}`;
    }
  }

  /**
   * Generate a slug from a scene heading (legacy fallback)
   */
  private generateSlug(heading: string): string {
    return heading
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  /**
   * Persist scenes to database
   * @param tiptapDoc - Optional TipTap JSON doc for deterministic dependency extraction
   */
  async persistScenes(projectId: string, scenes: Scene[], tiptapDoc?: object): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const requestBody: Record<string, unknown> = {
      scenes: scenes.map(scene => ({
        sceneNumber: scene.sceneNumber,
        slug: scene.slug,
        scriptExcerpt: scene.content
      })),
    };

    if (tiptapDoc) {
      requestBody.tiptapDoc = tiptapDoc;
    }

    console.log(`💾 [SCRIPT SERVICE] Persisting ${scenes.length} scenes to database...`);

    const response = await fetch(`/api/projects/${projectId}/scenes`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to persist scenes');
    }

    console.log('✅ [SCRIPT SERVICE] Scenes persisted successfully');
  }
}

export const scriptService = new ScriptService();

