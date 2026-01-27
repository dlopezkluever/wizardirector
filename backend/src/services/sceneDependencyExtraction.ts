/**
 * Scene Dependency Extraction Service
 * 
 * Extracts raw character names, location, and props from scene script excerpts
 * Called during Stage 4 scene parsing (not Stage 6 scene fetching)
 * 
 * CRITICAL: No fuzzy matching at this stage - raw extraction only
 * Fuzzy matching happens in Stage 5 when assets are created
 */

import { llmClient, type LLMRequest } from './llm-client.js';

export interface SceneDependencies {
  expectedCharacters: string[]; // Raw extracted names (not yet matched to assets)
  expectedLocation: string;      // Parsed from heading or extracted
  expectedProps: string[];       // Raw extracted props (not yet matched to assets)
}

interface ExtractionResult {
  characters: string[];
  location: string;
  props: string[];
}

export class SceneDependencyExtractionService {
  /**
   * Extract raw dependencies from a single scene
   * Called during Stage 4 scene parsing (scriptService.extractScenes)
   * No fuzzy matching - that happens in Stage 5 asset aggregation
   */
  async extractDependencies(
    sceneHeading: string, 
    scriptExcerpt: string
  ): Promise<SceneDependencies> {
    console.log(`🔍 [DEPENDENCY EXTRACTION] Extracting dependencies for scene: ${sceneHeading}`);

    // First, try regex-based location extraction from heading
    const locationFromHeading = this.parseLocationFromHeading(sceneHeading);
    
    // Token optimization: Only analyze opening portion (first 20 lines)
    const lines = scriptExcerpt.split('\n');
    const openingExcerpt = lines.slice(0, 20).join('\n');
    
    try {
      // Use LLM to extract characters, location (refined), and props
      const extracted = await this.extractWithLLM(sceneHeading, openingExcerpt, locationFromHeading);
      
      console.log(`✅ [DEPENDENCY EXTRACTION] Extracted ${extracted.characters.length} characters, ${extracted.props.length} props`);
      
      return {
        expectedCharacters: extracted.characters,
        expectedLocation: extracted.location || locationFromHeading || sceneHeading,
        expectedProps: extracted.props
      };
    } catch (error) {
      console.error('❌ [DEPENDENCY EXTRACTION] LLM extraction failed, using fallback:', error);
      
      // Fallback: return minimal dependencies based on regex parsing
      return {
        expectedCharacters: [],
        expectedLocation: locationFromHeading || sceneHeading,
        expectedProps: []
      };
    }
  }

  /**
   * Fallback regex parser for location
   * Extracts location from scene heading (e.g., "INT. KITCHEN - DAY" → "KITCHEN")
   */
  private parseLocationFromHeading(heading: string): string {
    // Pattern: INT./EXT. LOCATION - DAY/NIGHT/etc.
    const headingRegex = /^(?:INT\.|EXT\.)\s+(.+?)(?:\s*-\s*(?:DAY|NIGHT|CONTINUOUS|LATER|MOMENTS LATER|DAWN|DUSK|MORNING|AFTERNOON|EVENING))?$/i;
    
    const match = heading.trim().match(headingRegex);
    
    if (match && match[1]) {
      return match[1].trim();
    }
    
    // Fallback: return the entire heading
    return heading.trim();
  }

  /**
   * Extract dependencies using LLM
   * Extracts raw names only - no asset matching at this stage
   */
  private async extractWithLLM(
    sceneHeading: string,
    openingExcerpt: string,
    locationFromHeading: string
  ): Promise<ExtractionResult> {
    const systemPrompt = `You are a script analysis assistant that extracts key information from screenplay scenes.

Your task is to identify:
1. CHARACTER NAMES: All character names mentioned in dialogue or action lines
2. LOCATION: The specific location/setting of the scene (refine if the heading is ambiguous)
3. PROPS: Key props or objects mentioned that are important to the scene

CRITICAL RULES:
- Extract RAW NAMES ONLY - do not try to match or normalize them
- For characters: Extract exactly as they appear (e.g., "ALICE", "BOB", "THE GUARD")
- For props: Extract descriptive names (e.g., "a gun", "the letter", "his watch")
- For location: Use the scene heading as primary source, but refine if more specific location is mentioned
- Return ONLY the JSON response, no additional commentary

Output format (JSON only):
{
  "characters": ["CHARACTER_NAME_1", "CHARACTER_NAME_2"],
  "location": "SPECIFIC_LOCATION",
  "props": ["prop 1", "prop 2"]
}`;

    const userPrompt = `Scene Heading: ${sceneHeading}

Opening Action/Dialogue:
${openingExcerpt}

Extract the character names, location, and key props from this scene opening.
Location from heading: "${locationFromHeading}" (refine if more specific location is mentioned in the action)

Return ONLY valid JSON in the format specified.`;

    const llmRequest: LLMRequest = {
      systemPrompt,
      userPrompt,
      temperature: 0.3, // Low temperature for consistent extraction
      maxTokens: 500, // Short response expected
      metadata: {
        operation: 'scene_dependency_extraction',
        stage: 4
      }
    };

    const response = await llmClient.generate(llmRequest);
    
    // Parse JSON response
    let parsed: ExtractionResult;
    try {
      // Clean up response - remove markdown code blocks if present
      let content = response.content.trim();
      content = content.replace(/^```(?:json)?\s*\n?/, '');
      content = content.replace(/\n?```\s*$/, '');
      content = content.trim();
      
      parsed = JSON.parse(content);
    } catch (parseError) {
      console.error('❌ [DEPENDENCY EXTRACTION] Failed to parse LLM response:', parseError);
      console.error('Raw response:', response.content);
      throw new Error('Failed to parse dependency extraction response');
    }

    // Validate and normalize response
    return {
      characters: Array.isArray(parsed.characters) ? parsed.characters : [],
      location: typeof parsed.location === 'string' ? parsed.location : locationFromHeading,
      props: Array.isArray(parsed.props) ? parsed.props : []
    };
  }
}

// Export singleton instance
export const sceneDependencyExtractionService = new SceneDependencyExtractionService();
