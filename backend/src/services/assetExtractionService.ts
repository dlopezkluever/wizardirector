/**
 * Asset Extraction Service - Aggregation-Based Extraction (Task 3B)
 * 
 * NEW APPROACH (Task 3B):
 * - Pass 0: Aggregate dependencies from scenes (replaces full script parsing)
 *   Uses pre-extracted scene dependencies from Stage 4 to avoid duplicate extraction
 * - Pass 1: Deduplication happens during aggregation (case-insensitive matching)
 * - Pass 2: Distill each entity's mentions into a concise visual summary
 * 
 * This approach:
 * - Eliminates duplicate extraction (Stage 4 + Stage 5 now share same data)
 * - Ensures consistency between Stage 6 scene display and Stage 5 asset definitions
 * - Focuses Stage 5 on asset refinement (visual descriptions), not entity discovery
 * - Prevents token limit issues by using pre-extracted dependencies
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
   * Main orchestrator: Aggregation-based extraction (Pass 0 + Pass 2)
   * 
   * NEW APPROACH (Task 3B):
   * - Pass 0: Aggregate dependencies from scenes (replaces full script parsing)
   * - Pass 1: Deduplication happens during aggregation
   * - Pass 2: Distill each entity into visual summary (unchanged)
   * 
   * @param masterScript - DEPRECATED: No longer used, kept for backwards compatibility
   * @param branchId - Branch ID to aggregate scenes from
   * @param visualStyleId - Visual style capsule ID for distillation
   */
  async extractAssets(
    masterScript: string, // DEPRECATED - not used in new approach
    branchId: string,
    visualStyleId: string
  ): Promise<ExtractedAsset[]> {
    console.log('[AssetExtraction] Starting aggregation-based extraction...');

    // Pass 0: Aggregate dependencies from scenes instead of parsing full script
    const rawEntities = await this.aggregateSceneDependencies(branchId);
    console.log(`[AssetExtraction] Aggregated ${rawEntities.length} entities from scenes`);

    // Pass 2: Distill each entity into visual summary (UNCHANGED)
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
   * Pass 0: Aggregate scene dependencies from database
   * Replaces full script parsing - uses pre-extracted dependencies from Stage 4
   * 
   * @param branchId - Branch ID to fetch scenes from
   * @returns Array of RawEntity objects aggregated from all scenes
   */
  private async aggregateSceneDependencies(branchId: string): Promise<RawEntity[]> {
    console.log(`[AssetExtraction] Aggregating dependencies from scenes for branch ${branchId}`);
    
    // Fetch all scenes for this branch with their dependencies
    const { data: scenes, error } = await supabase
      .from('scenes')
      .select('scene_number, script_excerpt, expected_characters, expected_location, expected_props')
      .eq('branch_id', branchId)
      .order('scene_number', { ascending: true });

    if (error) {
      console.error('[AssetExtraction] Failed to fetch scenes:', error);
      throw new Error(`Failed to fetch scenes for aggregation: ${error.message}`);
    }

    if (!scenes || scenes.length === 0) {
      console.warn('[AssetExtraction] No scenes found for branch, returning empty entities');
      return [];
    }

    console.log(`[AssetExtraction] Found ${scenes.length} scenes to aggregate`);

    // Use Map for deduplication (key = lowercase name)
    const entityMap = new Map<string, RawEntity>();

    // Aggregate characters from all scenes
    scenes.forEach(scene => {
      const characters = scene.expected_characters || [];
      if (characters.length === 0) return;

      characters.forEach(char => {
        const charName = char.trim();
        if (!charName) return;

        const key = charName.toLowerCase();
        
        if (!entityMap.has(key)) {
          entityMap.set(key, {
            name: charName, // Use first occurrence as canonical name
            aliases: [charName],
            type: 'character',
            mentions: []
          });
        } else {
          // Add to aliases if different casing/variation
          const existing = entityMap.get(key)!;
          if (!existing.aliases.includes(charName)) {
            existing.aliases.push(charName);
          }
        }

        // Add scene mention with context
        const context = this.extractContextFromScript(scene.script_excerpt);
        entityMap.get(key)!.mentions.push({
          sceneNumber: scene.scene_number,
          text: `Character appears in scene ${scene.scene_number}`,
          context: context
        });
      });
    });

    // Aggregate props from all scenes
    scenes.forEach(scene => {
      const props = scene.expected_props || [];
      if (props.length === 0) return;

      props.forEach(prop => {
        const propName = prop.trim();
        if (!propName) return;

        const key = propName.toLowerCase();
        
        if (!entityMap.has(key)) {
          entityMap.set(key, {
            name: propName, // Use first occurrence as canonical name
            aliases: [propName],
            type: 'prop',
            mentions: []
          });
        } else {
          // Add to aliases if different casing/variation
          const existing = entityMap.get(key)!;
          if (!existing.aliases.includes(propName)) {
            existing.aliases.push(propName);
          }
        }

        // Add scene mention with context
        const context = this.extractContextFromScript(scene.script_excerpt);
        entityMap.get(key)!.mentions.push({
          sceneNumber: scene.scene_number,
          text: `Prop appears in scene ${scene.scene_number}`,
          context: context
        });
      });
    });

    // Aggregate locations from all scenes
    scenes.forEach(scene => {
      if (!scene.expected_location) return;

      const location = scene.expected_location.trim();
      if (!location) return;

      const key = location.toLowerCase();
      
      if (!entityMap.has(key)) {
        entityMap.set(key, {
          name: location, // Use first occurrence as canonical name
          aliases: [location],
          type: 'location',
          mentions: []
        });
      } else {
        // Add to aliases if different casing/variation
        const existing = entityMap.get(key)!;
        if (!existing.aliases.includes(location)) {
          existing.aliases.push(location);
        }
      }

      // Add scene mention with context
      const context = this.extractContextFromScript(scene.script_excerpt);
      entityMap.get(key)!.mentions.push({
        sceneNumber: scene.scene_number,
        text: `Location: ${location}`,
        context: context
      });
    });

    const entities = Array.from(entityMap.values());
    console.log(`[AssetExtraction] Aggregated ${entities.length} unique entities (${entities.filter(e => e.type === 'character').length} characters, ${entities.filter(e => e.type === 'prop').length} props, ${entities.filter(e => e.type === 'location').length} locations)`);
    
    return entities;
  }

  /**
   * Extract context snippet from script excerpt for mention context
   * Returns first 3 lines or first 200 characters, whichever is shorter
   */
  private extractContextFromScript(scriptExcerpt: string | null): string {
    if (!scriptExcerpt) return '';
    
    const lines = scriptExcerpt.split('\n').slice(0, 3);
    const context = lines.join(' ').trim();
    
    // Limit to 200 characters to avoid token bloat
    return context.length > 200 ? context.substring(0, 200) + '...' : context;
  }

  /**
   * Pass 1: Extract all entity names and their mentions from script
   * 
   * @deprecated This method is no longer used. Asset extraction now uses
   * scene dependency aggregation (aggregateSceneDependencies) instead of
   * parsing the full master script. Kept for backwards compatibility/debugging.
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
      .select('name, descriptor_strings, design_pillars')
      .eq('id', styleId)
      .single();

    if (error || !capsule) {
      console.warn('[AssetExtraction] Failed to fetch style context, using default');
      return {
        name: 'Default',
        description: 'Cinematic, high-quality visual style'
      };
    }

    const descriptorStrings = capsule.descriptor_strings || '';
    const pillars = capsule.design_pillars
      ? Object.entries(capsule.design_pillars).map(([k, v]) => `${k}: ${v}`).join('; ')
      : '';

    return {
      name: capsule.name,
      description: [descriptorStrings, pillars].filter(Boolean).join('. ')
    };
  }
}

