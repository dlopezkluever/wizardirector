import { supabase } from '@/lib/supabase';
import { stageStateService } from './stageStateService';
import { styleCapsuleService } from './styleCapsuleService';

export interface Beat {
  id: string;
  order: number;
  text: string;
  rationale?: string;
  estimatedScreenTimeSeconds: number;
  originalTreatmentExcerpt?: string;
  isExpanded?: boolean;
}

export interface GenerateBeatsRequest {
  treatmentProse: string;
  selectedVariantId: string;
  projectParams: {
    projectId?: string;
    targetLengthMin: number;
    targetLengthMax: number;
    genres: string[];
    tonalPrecision: string;
    writingStyleCapsuleId?: string;
  };
}

export interface GenerateBeatsResponse {
  beats: Beat[];
  totalEstimatedRuntime: number;
  narrativeStructure: string;
  langsmithTraceId: string;
  promptTemplateVersion: string;
  styleCapsuleMetadata?: {
    styleCapsuleId: string;
    injectionContext: Record<string, any>;
  };
}

class BeatService {
  /**
   * Generate beats from a treatment
   */
  async generateBeats(request: GenerateBeatsRequest): Promise<GenerateBeatsResponse> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    // Get current stage state ID for application logging
    const projectId = request.projectParams.projectId || '';
    const currentStageState = projectId ? await stageStateService.getStageState(projectId, 3) : null;

    const llmRequest = {
      templateName: 'beat_extraction',
      variables: {
        treatment_prose: request.treatmentProse,
        selected_variant_id: request.selectedVariantId,
        target_length_min: request.projectParams.targetLengthMin,
        target_length_max: request.projectParams.targetLengthMax,
        genres: request.projectParams.genres.join(', '),
        tonal_precision: request.projectParams.tonalPrecision,
        writing_style_context: '', // Empty placeholder - backend will inject
        writing_style_capsule_id: request.projectParams.writingStyleCapsuleId || ''
      },
      metadata: {
        projectId: projectId,
        branchId: 'main', // Backend will look up active branch from projectId
        stage: 3,
        stageStateId: currentStageState?.id,
        operation: 'beat_extraction'
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
      throw new Error(error.error || 'Failed to generate beats');
    }

    const result = await response.json();
    const parsedBeats = this.parseBeatsResponse(result.data.content);

    return {
      beats: parsedBeats.beats,
      totalEstimatedRuntime: parsedBeats.totalEstimatedRuntime,
      narrativeStructure: parsedBeats.narrativeStructure,
      langsmithTraceId: result.data.traceId,
      promptTemplateVersion: result.data.promptTemplateVersion || '1.0.0',
      styleCapsuleMetadata: result.data.styleCapsuleMetadata // Pass through from backend
    };
  }

  /**
   * Regenerate beats with user guidance
   */
  async regenerateBeats(
    projectId: string,
    request: GenerateBeatsRequest,
    guidance: string
  ): Promise<GenerateBeatsResponse> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    // Get writing style capsule injection
    let writingStyleContext = '';
    if (request.projectParams.writingStyleCapsuleId) {
      try {
        const capsule = await styleCapsuleService.getCapsule(request.projectParams.writingStyleCapsuleId);
        writingStyleContext = styleCapsuleService.formatWritingStyleInjection(capsule);
      } catch (error) {
        console.warn('Failed to load writing style capsule:', error);
      }
    }

    // Get current stage state ID for application logging
    const currentStageState = await stageStateService.getStageState(projectId, 3);

    const llmRequest = {
      templateName: 'beat_extraction',
      variables: {
        treatment_prose: request.treatmentProse,
        selected_variant_id: request.selectedVariantId,
        target_length_min: request.projectParams.targetLengthMin,
        target_length_max: request.projectParams.targetLengthMax,
        genres: request.projectParams.genres.join(', '),
        tonal_precision: request.projectParams.tonalPrecision,
        writing_style_context: writingStyleContext,
        regeneration_guidance: guidance
      },
      metadata: {
        projectId,
        branchId: 'main',
        stage: 3,
        stageStateId: currentStageState?.id,
        operation: 'beat_regeneration',
        regenerationGuidance: guidance
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
      throw new Error(error.error || 'Failed to regenerate beats');
    }

    const result = await response.json();
    const parsedBeats = this.parseBeatsResponse(result.data.content);

    return {
      beats: parsedBeats.beats,
      totalEstimatedRuntime: parsedBeats.totalEstimatedRuntime,
      narrativeStructure: parsedBeats.narrativeStructure,
      langsmithTraceId: result.data.traceId,
      promptTemplateVersion: result.data.promptTemplateVersion || '1.0.0',
      styleCapsuleMetadata: result.data.styleCapsuleMetadata // Pass through from backend
    };
  }

  /**
   * Brainstorm alternatives for a specific beat
   */
  async brainstormBeatAlternatives(
    projectId: string,
    beat: Beat,
    context: Beat[],
    guidance?: string
  ): Promise<Beat[]> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const guidanceBlock = guidance ? `\n\nUSER GUIDANCE:\n${guidance}` : '';

    const llmRequest = {
      systemPrompt: `You are a narrative structure analyst. Your task is to brainstorm alternative versions of a specific story beat while maintaining narrative coherence.

INSTRUCTIONS:
1. Generate exactly 3 alternative versions of the given beat
2. Maintain consistency with the surrounding beats
3. Each alternative should explore a different approach (tone, action, character focus, etc.)
4. Keep the same estimated screen time
5. Ensure alternatives still serve the same narrative function

OUTPUT FORMAT:
Respond with a JSON array of objects, each with a "text" field containing the alternative beat text.
Example: [{"text": "Alternative beat 1..."}, {"text": "Alternative beat 2..."}, {"text": "Alternative beat 3..."}]`,
      userPrompt: `CURRENT BEAT TO REIMAGINE:
Beat ${beat.order}: ${beat.text}

SURROUNDING CONTEXT:
${context.map(b => `Beat ${b.order}: ${b.text}`).join('\n')}

Generate 3 alternative versions of Beat ${beat.order} that maintain narrative flow while exploring different approaches.${guidanceBlock}`,
      metadata: {
        projectId,
        stage: 3,
        operation: 'beat_brainstorm',
        originalBeatId: beat.id
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
      throw new Error(error.error || 'Failed to brainstorm alternatives');
    }

    const result = await response.json();
    return this.parseAlternativesResponse(result.data.content, beat);
  }

  /**
   * Split a beat into multiple beats
   */
  async splitBeat(
    projectId: string,
    beat: Beat,
    guidance: string
  ): Promise<Beat[]> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const llmRequest = {
      systemPrompt: `You are a narrative structure analyst. Your task is to split a single story beat into multiple coherent beats.

INSTRUCTIONS:
1. Break the given beat into 2-3 smaller, more granular beats
2. Each new beat should be self-contained and actionable
3. Maintain the total estimated screen time across all new beats
4. Ensure proper cause-and-effect flow between the new beats
5. Follow the user's guidance for how to split the beat`,
      userPrompt: `BEAT TO SPLIT:
Beat ${beat.order}: ${beat.text}
Estimated time: ${beat.estimatedScreenTimeSeconds} seconds

USER GUIDANCE:
${guidance}

Split this beat into 2-3 more detailed beats that collectively tell the same story but with more granular structure.`,
      metadata: {
        projectId,
        stage: 3,
        operation: 'beat_split',
        originalBeatId: beat.id
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
      throw new Error(error.error || 'Failed to split beat');
    }

    const result = await response.json();
    return this.parseSplitBeatsResponse(result.data.content, beat);
  }

  /**
   * Parse LLM response for beat generation
   */
  private parseBeatsResponse(content: string | any): {
    beats: Beat[];
    totalEstimatedRuntime: number;
    narrativeStructure: string;
  } {
    console.log('🔍 [BEAT PARSE] Input type:', typeof content);
    console.log('🔍 [BEAT PARSE] Input preview:', typeof content === 'string' ? content.substring(0, 200) : content);

    let parsed: any;

    // Handle case where content is already parsed
    if (typeof content === 'object' && content !== null) {
      console.log('🔍 [BEAT PARSE] Content is already an object');
      parsed = content;
    } else if (typeof content === 'string') {
      // Strip markdown code block markers if present
      let cleanedContent = content.trim();
      if (cleanedContent.startsWith('```')) {
        console.log('🔍 [BEAT PARSE] Removing markdown code block markers');
        // Remove opening ```json or ```
        cleanedContent = cleanedContent.replace(/^```(?:json)?\s*\n?/, '');
        // Remove closing ```
        cleanedContent = cleanedContent.replace(/\n?```\s*$/, '');
        cleanedContent = cleanedContent.trim();
        console.log('🔍 [BEAT PARSE] Cleaned content preview:', cleanedContent.substring(0, 100));
      }

      // Try to parse string as JSON
      try {
        parsed = JSON.parse(cleanedContent);
        console.log('🔍 [BEAT PARSE] Successfully parsed JSON string');
      } catch (error) {
        console.warn('⚠️ [BEAT PARSE] Failed to parse as JSON, attempting text extraction');
        // Fallback: Parse text format
        const lines = content.split('\n').filter(line => line.trim());
        const beats: Beat[] = [];
        let currentBeat = 1;

        for (const line of lines) {
          if (line.match(/^\d+\.|Beat \d+/i)) {
            const text = line.replace(/^\d+\.\s*|Beat \d+:?\s*/i, '').trim();
            if (text) {
              beats.push({
                id: `beat-${Date.now()}-${currentBeat}`,
                order: currentBeat,
                text,
                rationale: '',
                estimatedScreenTimeSeconds: 20,
                isExpanded: false
              });
              currentBeat++;
            }
          }
        }

        return {
          beats: beats.length > 0 ? beats : [{
            id: `beat-${Date.now()}-1`,
            order: 1,
            text: content.trim(),
            rationale: '',
            estimatedScreenTimeSeconds: 60,
            isExpanded: false
          }],
          totalEstimatedRuntime: beats.length * 20,
          narrativeStructure: '3-act structure'
        };
      }
    } else {
      console.error('❌ [BEAT PARSE] Unexpected content type:', typeof content);
      return {
        beats: [],
        totalEstimatedRuntime: 0,
        narrativeStructure: '3-act structure'
      };
    }

    // Now we have a parsed object, extract beats
    if (parsed.beats && Array.isArray(parsed.beats)) {
      console.log('✅ [BEAT PARSE] Found beats array with', parsed.beats.length, 'items');
      
      const beats: Beat[] = parsed.beats.map((b: any, index: number) => {
        // Extract the beat text - ensure we get a string, not an object
        let beatText = '';
        if (typeof b.text === 'string') {
          beatText = b.text;
        } else if (typeof b.content === 'string') {
          beatText = b.content;
        } else if (typeof b.description === 'string') {
          beatText = b.description;
        } else if (typeof b === 'string') {
          beatText = b;
        } else {
          // If we got an object, stringify it as last resort (but log warning)
          console.warn('⚠️ [BEAT PARSE] Beat text is not a string:', b);
          beatText = JSON.stringify(b);
        }

        const beat: Beat = {
          id: b.beat_id || b.id || `beat-${Date.now()}-${index}`,
          order: b.order || index + 1,
          text: beatText,
          rationale: b.rationale || '',
          estimatedScreenTimeSeconds: b.estimated_screen_time_seconds || b.estimatedScreenTimeSeconds || 20,
          isExpanded: false
        };

        console.log(`✅ [BEAT PARSE] Beat ${index + 1} parsed:`, {
          textLength: beat.text.length,
          order: beat.order,
          isString: typeof beat.text === 'string'
        });

        return beat;
      });

      return {
        beats,
        totalEstimatedRuntime: parsed.total_estimated_runtime || parsed.totalEstimatedRuntime || beats.reduce((sum, b) => sum + b.estimatedScreenTimeSeconds, 0),
        narrativeStructure: parsed.narrative_structure || parsed.narrativeStructure || '3-act structure'
      };
    }

    console.warn('⚠️ [BEAT PARSE] No beats array found in parsed object:', Object.keys(parsed));
    
    // Fallback: Return entire content as single beat
    return {
      beats: [{
        id: `beat-${Date.now()}-1`,
        order: 1,
        text: typeof parsed === 'string' ? parsed : JSON.stringify(parsed),
        rationale: '',
        estimatedScreenTimeSeconds: 60,
        isExpanded: false
      }],
      totalEstimatedRuntime: 60,
      narrativeStructure: '3-act structure'
    };
  }

  /**
   * Parse alternatives response
   */
  private parseAlternativesResponse(content: string, originalBeat: Beat): Beat[] {
    const makeBeat = (text: string, index: number): Beat => ({
      id: `${originalBeat.id}-alt-${index}`,
      order: originalBeat.order,
      text: text.trim(),
      rationale: `Alternative ${index} for original beat`,
      estimatedScreenTimeSeconds: originalBeat.estimatedScreenTimeSeconds,
      isExpanded: false
    });

    const extractText = (item: Record<string, string>): string =>
      item.text || item.content || JSON.stringify(item);

    const raw = typeof content === 'string' ? content : JSON.stringify(content);

    // Strategy 1: Try JSON parsing (strip markdown code block if present)
    try {
      let cleaned = raw.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
      }
      const parsed = JSON.parse(cleaned);
      const arr: unknown[] = Array.isArray(parsed) ? parsed : parsed.alternatives || parsed.beats || [];
      if (arr.length > 0) {
        const beats = arr
          .map((item, i) => makeBeat(typeof item === 'string' ? item : extractText(item as Record<string, string>), i + 1))
          .filter((b: Beat) => b.text.length > 0);
        if (beats.length > 0) return beats;
      }
    } catch {
      // Not JSON, try text parsing
    }

    // Strategy 2: Multi-line text parsing — split by numbered headers or "Alternative N"
    const alternatives: Beat[] = [];
    const lines = raw.split('\n');
    let currentText = '';
    let altIndex = 0;

    for (const line of lines) {
      const headerMatch = line.match(/^(?:\d+\.\s*|Alternative\s+\d+[:\s]*|##?\s*Alternative\s+\d+[:\s]*)/i);
      if (headerMatch) {
        // Save previous block if any
        if (currentText.trim() && altIndex > 0) {
          alternatives.push(makeBeat(currentText, altIndex));
        }
        altIndex++;
        // Text after the header on the same line
        currentText = line.replace(headerMatch[0], '').trim();
      } else if (altIndex > 0 && line.trim()) {
        // Continuation line for current alternative
        currentText += (currentText ? ' ' : '') + line.trim();
      }
    }
    // Flush last block
    if (currentText.trim() && altIndex > 0) {
      alternatives.push(makeBeat(currentText, altIndex));
    }

    if (alternatives.length > 0) return alternatives;

    // Strategy 3: Fallback — return original beat unchanged
    return [originalBeat];
  }

  /**
   * Parse split beats response
   */
  private parseSplitBeatsResponse(content: string, originalBeat: Beat): Beat[] {
    const lines = content.split('\n').filter(line => line.trim());
    const splitBeats: Beat[] = [];
    let splitIndex = 1;
    const timePerBeat = Math.floor(originalBeat.estimatedScreenTimeSeconds / 3);

    for (const line of lines) {
      if (line.match(/^\d+\.|Beat \d+/i)) {
        const text = line.replace(/^\d+\.\s*|Beat \d+:?\s*/i, '').trim();
        if (text) {
          splitBeats.push({
            id: `${originalBeat.id}-split-${splitIndex}`,
            order: originalBeat.order + (splitIndex - 1) * 0.1, // Maintain order with decimals
            text,
            rationale: `Split from original beat ${originalBeat.order}`,
            estimatedScreenTimeSeconds: timePerBeat,
            isExpanded: false
          });
          splitIndex++;
        }
      }
    }

    return splitBeats.length > 0 ? splitBeats : [originalBeat];
  }
}

export const beatService = new BeatService();
