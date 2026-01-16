import { supabase } from '@/lib/supabase';
import { stripHtmlTags } from '@/lib/utils/screenplay-converter';
import type { Beat } from './beatService';
import { stageStateService } from './stageStateService';

export interface Scene {
  id: string;
  sceneNumber: number;
  slug: string;
  heading: string;
  content: string;
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
      promptTemplateVersion: result.data.promptTemplateVersion || '1.0.0'
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
      promptTemplateVersion: result.data.promptTemplateVersion || '1.0.0'
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
   * Extract scenes from a formatted script
   */
  extractScenes(formattedScript: string): Scene[] {
    const scenes: Scene[] = [];
    const lines = formattedScript.split('\n');
    
    let currentScene: Scene | null = null;
    let sceneNumber = 1;
    let currentContent: string[] = [];

    // Regex to match scene headings: INT. or EXT. at start of line
    const sceneHeadingRegex = /^(INT\.|EXT\.)\s+(.+)$/i;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const match = line.match(sceneHeadingRegex);

      if (match) {
        // Save previous scene if exists
        if (currentScene) {
          currentScene.content = currentContent.join('\n').trim();
          scenes.push(currentScene);
        }

        // Start new scene
        const heading = line;
        const slug = this.generateSlug(heading);
        
        currentScene = {
          id: `scene-${sceneNumber}-${Date.now()}`,
          sceneNumber: sceneNumber,
          slug: slug,
          heading: heading,
          content: ''
        };

        currentContent = [heading]; // Include heading in content
        sceneNumber++;
      } else if (currentScene) {
        // Add line to current scene
        currentContent.push(lines[i]);
      }
    }

    // Save final scene
    if (currentScene) {
      currentScene.content = currentContent.join('\n').trim();
      scenes.push(currentScene);
    }

    console.log(`📋 [SCRIPT SERVICE] Extracted ${scenes.length} scenes from script`);

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
        const formattedScript = cleanedContent;
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
   * Generate a slug from a scene heading
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
   */
  async persistScenes(projectId: string, scenes: Scene[]): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const requestBody = {
      scenes: scenes.map(scene => ({
        sceneNumber: scene.sceneNumber,
        slug: scene.slug,
        scriptExcerpt: scene.content
      }))
    };

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

