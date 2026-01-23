/**
 * Asset Description Merger Service
 * Merges global and project asset descriptions based on strategy
 */

import { llmClient } from './llm-client.js';

export type DescriptionStrategy = 'global' | 'project' | 'merge';

/**
 * Merge two asset descriptions based on the specified strategy
 * @param globalDescription - Description from global asset
 * @param projectDescription - Description from extracted project asset
 * @param strategy - Merging strategy: 'global' (use global), 'project' (use project), or 'merge' (intelligently combine)
 * @returns Merged description string
 */
export async function mergeDescriptions(
  globalDescription: string,
  projectDescription: string,
  strategy: DescriptionStrategy
): Promise<string> {
  switch (strategy) {
    case 'global':
      return globalDescription;
    
    case 'project':
      return projectDescription;
    
    case 'merge':
      return await mergeWithLLM(globalDescription, projectDescription);
    
    default:
      // Fallback to global if unknown strategy
      console.warn(`[AssetDescriptionMerger] Unknown strategy "${strategy}", defaulting to 'global'`);
      return globalDescription;
  }
}

/**
 * Use LLM to intelligently merge descriptions
 * Global description as base, project description as additions/modifications
 */
async function mergeWithLLM(
  globalDescription: string,
  projectDescription: string
): Promise<string> {
  try {
    const systemPrompt = `You are an expert at combining asset descriptions for visual consistency. 
Your task is to merge two descriptions of the same asset, where:
- The global description is the base/primary definition (the canonical version)
- The project description contains additions or modifications specific to this project

Create a coherent, unified description that:
1. Uses the global description as the foundation
2. Incorporates relevant details from the project description as additions or modifications
3. Maintains consistency and avoids contradictions
4. Preserves all important visual details from both descriptions

Return ONLY the merged description text, no explanations or meta-commentary.`;

    const userPrompt = `Global Description (base):
${globalDescription}

Project Description (additions/modifications):
${projectDescription}

Please merge these descriptions into a single, coherent description.`;

    const response = await llmClient.generate({
      systemPrompt,
      userPrompt,
      temperature: 0.3, // Lower temperature for more consistent merging
      maxTokens: 1024,
      metadata: {
        service: 'asset-description-merger',
        operation: 'merge-descriptions'
      }
    });

    return response.content.trim();
  } catch (error) {
    console.error('[AssetDescriptionMerger] LLM merge failed, falling back to concatenation:', error);
    
    // Fallback: Simple concatenation with separator
    return `${globalDescription}\n\nAdditional details: ${projectDescription}`;
  }
}

