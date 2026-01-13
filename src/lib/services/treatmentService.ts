import { supabase } from '@/lib/supabase';
import { styleCapsuleService } from './styleCapsuleService';
import type { ProcessedInput } from './inputProcessingService';

export interface TreatmentVariation {
  id: string;
  content: string;
  structuralEmphasis: string;
  estimatedRuntimeSeconds: number;
  createdAt: Date;
}

export interface GenerateTreatmentRequest {
  processedInput: ProcessedInput;
  projectId: string;
}

export interface GenerateTreatmentResponse {
  variations: TreatmentVariation[];
  langsmithTraceId: string;
  promptTemplateVersion: string;
}

export interface RegenerateTreatmentRequest {
  projectId: string;
  guidance: string;
  processedInput: ProcessedInput;
}

class TreatmentService {
  /**
   * Generate 3 treatment variations from processed Stage 1 input
   */
  async generateTreatments(request: GenerateTreatmentRequest): Promise<GenerateTreatmentResponse> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    // Prepare the LLM request
    console.log('🔍 [DEBUG] treatmentService.generateTreatments - Processing request:', {
      projectId: request.projectId,
      processedInputKeys: Object.keys(request.processedInput),
      mode: request.processedInput.mode,
      primaryContentLength: request.processedInput.primaryContent?.length || 0,
      contextFilesCount: request.processedInput.contextFiles?.length || 0,
      projectParams: request.processedInput.projectParams
    });

    // Get writing style capsule injection
    let writingStyleContext = '';
    if (request.processedInput.projectParams.writingStyleCapsuleId) {
      try {
        const capsule = await styleCapsuleService.getCapsule(request.processedInput.projectParams.writingStyleCapsuleId);
        writingStyleContext = styleCapsuleService.formatWritingStyleInjection(capsule);
      } catch (error) {
        console.warn('Failed to load writing style capsule:', error);
      }
    }

    const variables = {
      input_mode: request.processedInput.mode,
      primary_content: request.processedInput.primaryContent,
      context_files: request.processedInput.contextFiles.map(f =>
        `${f.name}${f.tag ? ` (${f.tag})` : ''}:\n${f.content}`
      ).join('\n\n---\n\n'),
      target_length_min: request.processedInput.projectParams.targetLengthMin,
      target_length_max: request.processedInput.projectParams.targetLengthMax,
      project_type: request.processedInput.projectParams.projectType,
      content_rating: request.processedInput.projectParams.contentRating,
      genres: request.processedInput.projectParams.genres.join(', '),
      tonal_precision: request.processedInput.projectParams.tonalPrecision,
      writing_style_context: writingStyleContext
    };

    console.log('🔍 [DEBUG] Template variables being sent:', {
      templateName: 'treatment_expansion',
      variableKeys: Object.keys(variables),
      variables: variables
    });

    const llmRequest = {
      templateName: 'treatment_expansion',
      variables,
      metadata: {
        projectId: request.projectId,
        stage: 2,
        inputMode: request.processedInput.mode
      }
    };

    console.log('🔍 [DEBUG] Full LLM request:', llmRequest);

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
      throw new Error(error.error || 'Failed to generate treatments');
    }

    const result = await response.json();
    
    // Parse the LLM response to extract the 3 variations
    // This assumes the LLM returns structured JSON with the variations
    const variations: TreatmentVariation[] = this.parseTreatmentResponse(result.data.content);

    return {
      variations,
      langsmithTraceId: result.data.traceId,
      promptTemplateVersion: result.data.promptTemplateVersion || '1.0.0'
    };
  }

  /**
   * Regenerate treatments with user guidance
   */
  async regenerateTreatments(request: RegenerateTreatmentRequest): Promise<GenerateTreatmentResponse> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    // Get writing style capsule injection
    let writingStyleContext = '';
    if (request.processedInput.projectParams.writingStyleCapsuleId) {
      try {
        const capsule = await styleCapsuleService.getCapsule(request.processedInput.projectParams.writingStyleCapsuleId);
        writingStyleContext = styleCapsuleService.formatWritingStyleInjection(capsule);
      } catch (error) {
        console.warn('Failed to load writing style capsule:', error);
      }
    }

    // Enhanced prompt with regeneration guidance
    const llmRequest = {
      templateName: 'treatment_expansion',
      variables: {
        input_mode: request.processedInput.mode,
        primary_content: request.processedInput.primaryContent,
        context_files: request.processedInput.contextFiles.map(f => 
          `${f.name}${f.tag ? ` (${f.tag})` : ''}:\n${f.content}`
        ).join('\n\n---\n\n'),
        target_length_min: request.processedInput.projectParams.targetLengthMin,
        target_length_max: request.processedInput.projectParams.targetLengthMax,
        project_type: request.processedInput.projectParams.projectType,
        content_rating: request.processedInput.projectParams.contentRating,
        genres: request.processedInput.projectParams.genres.join(', '),
        tonal_precision: request.processedInput.projectParams.tonalPrecision,
        writing_style_context: writingStyleContext,
        regeneration_guidance: request.guidance
      },
      metadata: {
        projectId: request.projectId,
        stage: 2,
        inputMode: request.processedInput.mode,
        regenerationGuidance: request.guidance
      }
    };

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
      throw new Error(error.error || 'Failed to regenerate treatments');
    }

    const result = await response.json();
    const variations: TreatmentVariation[] = this.parseTreatmentResponse(result.data.content);

    return {
      variations,
      langsmithTraceId: result.data.traceId,
      promptTemplateVersion: result.data.promptTemplateVersion || '1.0.0'
    };
  }

  /**
   * Regenerate a specific section of a treatment
   */
  async regenerateSection(
    projectId: string,
    treatmentContent: string,
    selectedText: string,
    guidance: string
  ): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const llmRequest = {
      systemPrompt: `You are a narrative editor. Your task is to rewrite a specific section of a treatment based on user guidance while maintaining consistency with the surrounding text.

INSTRUCTIONS:
1. Only rewrite the selected text portion
2. Maintain the same tone and style as the surrounding content
3. Ensure the rewritten section flows naturally with the context
4. Follow the user's specific guidance for the changes`,
      userPrompt: `FULL TREATMENT CONTEXT:
${treatmentContent}

SELECTED TEXT TO REWRITE:
"${selectedText}"

USER GUIDANCE:
${guidance}

Rewrite only the selected text portion according to the guidance, ensuring it fits naturally with the surrounding content.`,
      metadata: {
        projectId,
        stage: 2,
        operation: 'section_regeneration'
      }
    };

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
    return result.data.content;
  }

  /**
   * Parse LLM response to extract treatment variations
   */
  private parseTreatmentResponse(content: string | any): TreatmentVariation[] {
    console.log('🔍 [TREATMENT PARSE] Input type:', typeof content);
    console.log('🔍 [TREATMENT PARSE] Input preview:', typeof content === 'string' ? content.substring(0, 200) : content);

    let parsed: any;

    // Handle case where content is already parsed
    if (typeof content === 'object' && content !== null) {
      console.log('🔍 [TREATMENT PARSE] Content is already an object');
      parsed = content;
    } else if (typeof content === 'string') {
      // Strip markdown code block markers if present
      let cleanedContent = content.trim();
      if (cleanedContent.startsWith('```')) {
        console.log('🔍 [TREATMENT PARSE] Removing markdown code block markers');
        // Remove opening ```json or ```
        cleanedContent = cleanedContent.replace(/^```(?:json)?\s*\n?/, '');
        // Remove closing ```
        cleanedContent = cleanedContent.replace(/\n?```\s*$/, '');
        cleanedContent = cleanedContent.trim();
        console.log('🔍 [TREATMENT PARSE] Cleaned content preview:', cleanedContent.substring(0, 100));
      }

      // Try to parse string as JSON
      try {
        parsed = JSON.parse(cleanedContent);
        console.log('🔍 [TREATMENT PARSE] Successfully parsed JSON string');
      } catch (error) {
        console.warn('⚠️ [TREATMENT PARSE] Failed to parse as JSON, attempting text extraction');
        // Fallback: Split content into 3 parts if structured response fails
        const sections = content.split(/(?:TREATMENT|VARIATION)\s*[123]/i).filter(s => s.trim());
        
        if (sections.length >= 3) {
          return sections.slice(0, 3).map((section, index) => ({
            id: `treatment-${Date.now()}-${index}`,
            content: section.trim(),
            structuralEmphasis: `Variation ${index + 1}`,
            estimatedRuntimeSeconds: 300,
            createdAt: new Date()
          }));
        }

        // Ultimate fallback: Return single treatment
        return [{
          id: `treatment-${Date.now()}-0`,
          content: content.trim(),
          structuralEmphasis: 'Single Variation',
          estimatedRuntimeSeconds: 300,
          createdAt: new Date()
        }];
      }
    } else {
      console.error('❌ [TREATMENT PARSE] Unexpected content type:', typeof content);
      return [];
    }

    // Now we have a parsed object, extract treatments
    if (parsed.treatments && Array.isArray(parsed.treatments)) {
      console.log('✅ [TREATMENT PARSE] Found treatments array with', parsed.treatments.length, 'items');
      
      return parsed.treatments.map((t: any, index: number) => {
        // Extract the prose text - ensure we get a string, not an object
        let proseContent = '';
        if (typeof t.prose === 'string') {
          proseContent = t.prose;
        } else if (typeof t.content === 'string') {
          proseContent = t.content;
        } else if (typeof t.text === 'string') {
          proseContent = t.text;
        } else if (typeof t === 'string') {
          proseContent = t;
        } else {
          // If we got an object, stringify it as last resort (but log warning)
          console.warn('⚠️ [TREATMENT PARSE] Treatment prose is not a string:', t);
          proseContent = JSON.stringify(t);
        }

        const variation: TreatmentVariation = {
          id: `treatment-${Date.now()}-${index}`,
          content: proseContent,
          structuralEmphasis: t.structural_emphasis || t.emphasis || t.structuralEmphasis || `Variation ${index + 1}`,
          estimatedRuntimeSeconds: t.estimated_runtime_seconds || t.estimatedRuntimeSeconds || 300,
          createdAt: new Date()
        };

        console.log(`✅ [TREATMENT PARSE] Variation ${index + 1} parsed:`, {
          contentLength: variation.content.length,
          structuralEmphasis: variation.structuralEmphasis,
          isString: typeof variation.content === 'string'
        });

        return variation;
      });
    }

    console.warn('⚠️ [TREATMENT PARSE] No treatments array found in parsed object:', Object.keys(parsed));
    
    // Fallback: Return entire content as single treatment
    return [{
      id: `treatment-${Date.now()}-0`,
      content: typeof parsed === 'string' ? parsed : JSON.stringify(parsed),
      structuralEmphasis: 'Single Variation',
      estimatedRuntimeSeconds: 300,
      createdAt: new Date()
    }];
  }
}

export const treatmentService = new TreatmentService();
