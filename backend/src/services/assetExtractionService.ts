/**
 * Asset Extraction Service - Two-Pass LLM Extraction
 * 
 * Pass 1: Extract all entity names and their mentions from the script
 * Pass 2: Distill each entity's mentions into a concise visual summary
 * 
 * This approach prevents token limit issues and reduces hallucinations
 * by separating entity discovery from description synthesis.
 */

import { llmClient } from './llm-client.js';
import { supabase } from '../config/supabase.js';

// Raw entity from Pass 1
export interface RawEntity {
  name: string;
  aliases: string[]; // ["John", "John Doe", "Mr. Doe"]
  type: 'character' | 'prop' | 'location';
  mentions: Array<{
    sceneNumber: number;
    text: string;
    context: string;
  }>;
}

// Final extracted asset from Pass 2
export interface ExtractedAsset {
  name: string; // Canonical name
  type: 'character' | 'prop' | 'location';
  description: string; // DISTILLED 3-5 sentence visual summary
  mentions: string[]; // Preserved for reference
  confidenceScore: number; // 0-1, LLM's confidence in extraction
  isPriority: boolean; // true for main characters/key props
  hasVisualConflicts: boolean; // true if LLM detects contradictions
  conflictDetails?: string; // e.g., "Coat color changes from blue to red"
}

interface StyleContext {
  name: string;
  description: string;
}

export class AssetExtractionService {
  /**
   * Main orchestrator: Two-pass extraction
   */
  async extractAssets(
    masterScript: string,
    branchId: string,
    visualStyleId: string
  ): Promise<ExtractedAsset[]> {
    console.log('[AssetExtraction] Starting two-pass extraction...');

    // Pass 1: Extract raw entities with all mentions
    const rawEntities = await this.extractEntityMentions(masterScript);
    console.log(`[AssetExtraction] Pass 1 complete: ${rawEntities.length} entities found`);

    // Pass 2: Distill each entity into visual summary
    const distilledAssets: ExtractedAsset[] = [];
    for (const entity of rawEntities) {
      const asset = await this.distillVisualSummary(entity, visualStyleId);
      distilledAssets.push(asset);
    }

    console.log(`[AssetExtraction] Pass 2 complete: ${distilledAssets.length} assets distilled`);

    // Sort by priority (main characters first)
    return distilledAssets.sort((a, b) =>
      (b.isPriority ? 1 : 0) - (a.isPriority ? 1 : 0)
    );
  }

  /**
   * Pass 1: Extract all entity names and their mentions from script
   */
  private async extractEntityMentions(masterScript: string): Promise<RawEntity[]> {
    const systemPrompt = `You are a screenplay analyst. Extract all unique characters, props, and locations from this script.

CRITICAL RULES:
1. DEDUPLICATE: "John", "John Doe", and "Mr. Doe" are the SAME character
2. FOCUS ON VISUALS: Only extract physical objects/people/places
3. EXCLUDE ABSTRACTS: No "atmosphere", "tension", "mood" - only tangible assets
4. KEY ASSETS ONLY: Main characters, important props, primary locations
5. SCENE REFERENCES: Include which scenes each asset appears in
6. ESCAPE QUOTES: Use \\" for quotes inside text fields to ensure valid JSON

OUTPUT FORMAT: Return ONLY valid JSON array, no markdown formatting, no text outside the JSON. Ensure all strings are properly escaped.`;

    const userPrompt = `Analyze this screenplay and extract all key visual assets:

${masterScript}

Return a JSON array with this structure:
[{
  "name": "canonical name",
  "aliases": ["alternate names"],
  "type": "character|prop|location",
  "mentions": [{"sceneNumber": 1, "text": "excerpt with visual details", "context": "brief scene context"}]
}]`;

    try {
      const response = await llmClient.generate({
        systemPrompt,
        userPrompt,
        temperature: 0.3, // Low temperature for consistency
        maxTokens: 16384, // Increased to handle longer scripts
        metadata: { stage: 5, pass: 1, action: 'extract_entities' }
      });

      // Parse JSON response (strip markdown code blocks if present)
      let jsonContent = response.content.trim();
      
      // Remove markdown code blocks
      if (jsonContent.includes('```json')) {
        const jsonMatch = jsonContent.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          jsonContent = jsonMatch[1].trim();
        } else {
          jsonContent = jsonContent.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
        }
      } else if (jsonContent.includes('```')) {
        const codeMatch = jsonContent.match(/```\s*([\s\S]*?)\s*```/);
        if (codeMatch) {
          jsonContent = codeMatch[1].trim();
        } else {
          jsonContent = jsonContent.replace(/```\n?/g, '').replace(/```\n?$/g, '');
        }
      }

      // Try to extract JSON array if response contains other text
      const arrayMatch = jsonContent.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        jsonContent = arrayMatch[0];
      }

      // Attempt to parse JSON with better error handling
      let entities;
      try {
        entities = JSON.parse(jsonContent);
      } catch (parseError) {
        console.error('[AssetExtraction] JSON parse error:', parseError);
        console.error('[AssetExtraction] Problematic JSON length:', jsonContent.length);
        console.error('[AssetExtraction] Problematic JSON (first 500 chars):', jsonContent.substring(0, 500));
        console.error('[AssetExtraction] Problematic JSON (last 500 chars):', jsonContent.substring(Math.max(0, jsonContent.length - 500)));
        
        // Try to extract and repair the JSON array
        const firstBracket = jsonContent.indexOf('[');
        const lastBracket = jsonContent.lastIndexOf(']');
        
        if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
          let arrayOnly = jsonContent.substring(firstBracket, lastBracket + 1);
          console.log('[AssetExtraction] Attempting to parse extracted array (length:', arrayOnly.length, ')');
          
          // Try repair strategies in order
          try {
            // Strategy 1: Remove trailing commas
            const cleaned = arrayOnly.replace(/,(\s*[}\]])/g, '$1');
            entities = JSON.parse(cleaned);
            console.log('[AssetExtraction] Successfully parsed after removing trailing commas');
          } catch (retryError1) {
            try {
              // Strategy 2: Find last complete object and truncate there
              let braceCount = 0;
              let lastCompleteIndex = -1;
              for (let i = arrayOnly.length - 2; i >= 0; i--) { // -2 to skip the final ']'
                if (arrayOnly[i] === '}') braceCount++;
                if (arrayOnly[i] === '{') {
                  braceCount--;
                  if (braceCount === 0) {
                    lastCompleteIndex = i;
                    break;
                  }
                }
              }
              
              if (lastCompleteIndex > 0) {
                // Find the end of this complete object
                let objectEnd = lastCompleteIndex;
                braceCount = 1;
                for (let i = lastCompleteIndex + 1; i < arrayOnly.length; i++) {
                  if (arrayOnly[i] === '{') braceCount++;
                  if (arrayOnly[i] === '}') {
                    braceCount--;
                    if (braceCount === 0) {
                      objectEnd = i;
                      break;
                    }
                  }
                }
                const truncated = arrayOnly.substring(0, objectEnd + 1) + ']';
                entities = JSON.parse(truncated);
                console.log('[AssetExtraction] Successfully parsed by truncating at last complete object');
              } else {
                throw retryError1;
              }
            } catch (retryError2) {
              // Last resort: Extract all complete JSON objects using regex
              const objectPattern = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
              const matches = arrayOnly.match(objectPattern);
              if (matches && matches.length > 0) {
                try {
                  entities = JSON.parse('[' + matches.join(',') + ']');
                  console.log('[AssetExtraction] Successfully parsed by extracting', matches.length, 'complete objects');
                } catch (finalError) {
                  throw new Error(`Failed to parse JSON response after all repair attempts: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
                }
              } else {
                throw new Error(`Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}. The LLM response may be truncated or contain invalid JSON.`);
              }
            }
          }
        } else {
          throw new Error(`Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}. No valid JSON array found in response.`);
        }
      }
      
      if (!Array.isArray(entities)) {
        throw new Error('LLM did not return an array');
      }

      return entities;
    } catch (error) {
      console.error('[AssetExtraction] Pass 1 failed:', error);
      throw new Error(`Failed to extract entities: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Pass 2: Distill entity mentions into concise visual summary
   */
  private async distillVisualSummary(
    entity: RawEntity,
    visualStyleId: string
  ): Promise<ExtractedAsset> {
    // Get visual style context for consistency
    const styleContext = await this.getStyleContext(visualStyleId);

    const systemPrompt = `You are a visual description specialist. Create a concise, vivid 3-5 sentence description suitable for AI image generation.

CRITICAL RULES:
1. PHYSICAL ONLY: Focus on appearance, clothing, colors, textures
2. CONSISTENCY: If descriptions conflict, note it clearly
3. ACTIONABLE: Use concrete details image AI can render
4. STYLE-ALIGNED: Consider the ${styleContext.name} visual style
5. PRIORITY: Assess if this is a main character/key prop vs background element

OUTPUT FORMAT: Return ONLY valid JSON, no markdown formatting, no text outside the JSON. Ensure all strings are properly escaped with \\" for quotes.`;

    const mentionsText = entity.mentions
      .map(m => `Scene ${m.sceneNumber}: ${m.text}`)
      .join('\n\n');

    const userPrompt = `Asset: ${entity.name} (${entity.type})
Style Context: ${styleContext.description}

All script mentions:
${mentionsText}

Create:
1. A 3-5 sentence visual description for image generation
2. Confidence score (0-1) in the consistency of descriptions
3. Priority assessment (is this a main character/key prop?)
4. Flag any visual contradictions

Return JSON:
{
  "description": "vivid visual summary",
  "confidenceScore": 0.95,
  "isPriority": true,
  "hasVisualConflicts": false,
  "conflictDetails": null
}`;

    try {
      const response = await llmClient.generate({
        systemPrompt,
        userPrompt,
        temperature: 0.4,
        maxTokens: 2048,
        metadata: { stage: 5, pass: 2, entityName: entity.name }
      });

      // Parse JSON response (strip markdown code blocks if present)
      let jsonContent = response.content.trim();
      
      // Remove markdown code blocks
      if (jsonContent.includes('```json')) {
        const jsonMatch = jsonContent.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          jsonContent = jsonMatch[1].trim();
        } else {
          jsonContent = jsonContent.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
        }
      } else if (jsonContent.includes('```')) {
        const codeMatch = jsonContent.match(/```\s*([\s\S]*?)\s*```/);
        if (codeMatch) {
          jsonContent = codeMatch[1].trim();
        } else {
          jsonContent = jsonContent.replace(/```\n?/g, '').replace(/```\n?$/g, '');
        }
      }

      // Try to extract JSON object if response contains other text
      const objectMatch = jsonContent.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        jsonContent = objectMatch[0];
      }

      // Attempt to parse JSON with better error handling
      let distilled;
      try {
        distilled = JSON.parse(jsonContent);
      } catch (parseError) {
        console.error(`[AssetExtraction] Pass 2 JSON parse error for ${entity.name}:`, parseError);
        
        // Try to extract just the object portion
        const firstBrace = jsonContent.indexOf('{');
        const lastBrace = jsonContent.lastIndexOf('}');
        
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          const objectOnly = jsonContent.substring(firstBrace, lastBrace + 1);
          try {
            const cleaned = objectOnly.replace(/,(\s*[}\]])/g, '$1');
            distilled = JSON.parse(cleaned);
          } catch (retryError) {
            console.error(`[AssetExtraction] Failed to parse extracted object for ${entity.name}:`, retryError);
            throw new Error(`Failed to parse JSON response for ${entity.name}: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
          }
        } else {
          throw new Error(`Failed to parse JSON response for ${entity.name}: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
        }
      }

      return {
        name: entity.name,
        type: entity.type,
        description: distilled.description,
        mentions: entity.mentions.map(m => m.text),
        confidenceScore: distilled.confidenceScore,
        isPriority: distilled.isPriority,
        hasVisualConflicts: distilled.hasVisualConflicts,
        conflictDetails: distilled.conflictDetails
      };
    } catch (error) {
      console.error(`[AssetExtraction] Pass 2 failed for ${entity.name}:`, error);
      
      // Fallback: Use raw concatenated mentions if distillation fails
      console.warn(`[AssetExtraction] Using fallback description for ${entity.name}`);
      return {
        name: entity.name,
        type: entity.type,
        description: entity.mentions.map(m => m.text).join(' '),
        mentions: entity.mentions.map(m => m.text),
        confidenceScore: 0.5,
        isPriority: false,
        hasVisualConflicts: false
      };
    }
  }

  /**
   * Fetch visual style capsule context for prompt injection
   */
  private async getStyleContext(styleId: string): Promise<StyleContext> {
    const { data: capsule, error } = await supabase
      .from('style_capsules')
      .select('name, descriptors, design_pillars')
      .eq('id', styleId)
      .single();

    if (error || !capsule) {
      console.warn('[AssetExtraction] Failed to fetch style context, using default');
      return {
        name: 'Default',
        description: 'Cinematic, high-quality visual style'
      };
    }

    const descriptors = capsule.descriptors?.join(', ') || '';
    const pillars = capsule.design_pillars
      ? Object.entries(capsule.design_pillars).map(([k, v]) => `${k}: ${v}`).join('; ')
      : '';

    return {
      name: capsule.name,
      description: [descriptors, pillars].filter(Boolean).join('. ')
    };
  }
}

