/**
 * Scene Dependency Extraction Service
 *
 * @deprecated Prefer deterministic extraction via extractManifest() in
 * backend/src/utils/scriptManifest.ts. This LLM-based service is kept as a
 * legacy fallback for projects that were approved before tiptapDoc was
 * available. New code should NOT call this service directly.
 *
 * Extracts raw character names, location, and props from scene script excerpts
 * Called during Stage 4 scene parsing (not Stage 6 scene fetching)
 *
 * CRITICAL: No fuzzy matching at this stage - raw extraction only
 * Fuzzy matching happens in Stage 5 when assets are created
 */

import { llmClient, type LLMRequest, LLMClientError } from './llm-client.js';

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

/**
 * @deprecated Use extractManifest() from backend/src/utils/scriptManifest.ts instead.
 */
export class SceneDependencyExtractionService {
  /**
   * @deprecated Use extractManifest() for deterministic extraction from tiptapDoc.
   * This LLM-based method is kept as a legacy fallback only.
   *
   * Extract raw dependencies from a single scene
   * Called during Stage 4 scene parsing (scriptService.extractScenes)
   * No fuzzy matching - that happens in Stage 5 asset aggregation
   */
  async extractDependencies(
    sceneHeading: string,
    scriptExcerpt: string
  ): Promise<SceneDependencies> {
    console.warn(`⚠️ [SceneDependency] Legacy LLM path invoked for scene: ${sceneHeading}. Consider migrating to extractManifest().`);
    console.log(`🔍 [SceneDependency] Extracting dependencies for scene: ${sceneHeading}`);

    // First, try regex-based location extraction from heading (always available as fallback)
    const locationFromHeading = this.parseLocationFromHeading(sceneHeading);
    
    // Token optimization: Only analyze opening portion (first 20 lines)
    const lines = scriptExcerpt.split('\n');
    const openingExcerpt = lines.slice(0, 20).join('\n');
    
    try {
      // Use Promise.race to enforce 10-second timeout
      const result = await Promise.race([
        this.extractWithLLM(sceneHeading, openingExcerpt, locationFromHeading),
        this.timeout(15000) // 15 second timeout
      ]);
      
      console.log(`✅ [SceneDependency] Extracted ${result.characters.length} characters, ${result.props.length} props`);
      
      return {
        expectedCharacters: result.characters,
        expectedLocation: result.location || locationFromHeading || sceneHeading,
        expectedProps: result.props
      };
    } catch (error) {
      // Handle specific error types
      if (error instanceof Error && error.message === 'Extraction timeout') {
        console.warn(`⏱️ [SceneDependency] Extraction timed out after 15 seconds for scene: ${sceneHeading}`);
        // Return partial results with regex-based location extraction
        return {
          expectedCharacters: [],
          expectedLocation: locationFromHeading || sceneHeading,
          expectedProps: []
        };
      }
      
      // Handle rate limiting errors
      if (error instanceof LLMClientError && error.code === 'RATE_LIMIT') {
        console.warn(`🚫 [SceneDependency] Rate limit exceeded for scene: ${sceneHeading}. Returning empty dependencies.`);
        // TODO: Return cached values if available (caching not yet implemented)
        // For now, return empty values
        return {
          expectedCharacters: [],
          expectedLocation: locationFromHeading || sceneHeading,
          expectedProps: []
        };
      }
      
      // Handle all other errors
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`⚠️ [SceneDependency] Extraction failed for scene "${sceneHeading}": ${errorMessage}`);
      
      // Fallback: return minimal dependencies based on regex parsing
      return {
        expectedCharacters: [],
        expectedLocation: locationFromHeading || sceneHeading,
        expectedProps: []
      };
    }
  }

  /**
   * Creates a promise that rejects after the specified timeout
   * Used to enforce maximum extraction time
   */
  private timeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Extraction timeout'));
      }, ms);
    });
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
