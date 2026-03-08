/**
 * Story Context Service
 * Assembles scene-level story context from Stages 2/3/7 for asset condition inference.
 * Used by the "Update from Story Context" feature (Phase 2, Task 2).
 */

import { supabase } from '../config/supabase.js';
import { llmClient } from './llm-client.js';

export interface SceneStoryContext {
  scriptExcerpt: string;
  beatEntry: string;
  treatmentSection: string;
  shotActions: string[];
}

export interface AssetContextSuggestion {
  suggested_description: string;
  suggested_tags: string[];
  reasoning: string;
}

export interface BulkAssetContextResult {
  instanceId: string;
  assetName: string;
  assetType: string;
  current_description: string;
  suggested_description: string;
  current_tags: string[];
  suggested_tags: string[];
  reasoning: string;
}

/** Shape of a scene_asset_instance row with joined project_asset from Supabase. */
interface InstanceWithAsset {
  id: string;
  effective_description?: string | null;
  status_tags?: string[] | null;
  project_asset?: {
    id: string;
    name: string;
    asset_type: string;
    description: string;
  } | null;
}

export class StoryContextService {
  /**
   * Assemble story context for a scene from Stages 2, 3, and 7.
   * Fetched once and reused across all assets in a bulk call.
   */
  async assembleSceneStoryContext(
    sceneId: string,
    branchId: string
  ): Promise<SceneStoryContext> {
    // 1. Scene script excerpt (from scenes table, populated by Stage 4)
    const { data: scene } = await supabase
      .from('scenes')
      .select('script_excerpt, scene_number')
      .eq('id', sceneId)
      .single();

    const scriptExcerpt = scene?.script_excerpt ?? '';

    // 2. Beat sheet from Stage 3
    const { data: stage3Data } = await supabase
      .from('stage_states')
      .select('content')
      .eq('branch_id', branchId)
      .eq('stage_number', 3)
      .eq('status', 'locked')
      .order('version', { ascending: false })
      .limit(1);

    let beatEntry = '';
    let treatmentSection = '';

    if (stage3Data && stage3Data.length > 0) {
      const content = stage3Data[0].content as Record<string, unknown>;

      // Beat sheet: find beats that reference this scene or nearby beats
      if (content.beats && Array.isArray(content.beats)) {
        const beats = content.beats as Array<{
          order: number;
          text: string;
          rationale?: string;
        }>;
        // Include all beats as narrative context (they're project-level, not scene-specific)
        beatEntry = beats
          .map((b) => `Beat ${b.order}: ${b.text}`)
          .join('\n');
      }

      // Treatment prose (project-level)
      if (content.treatmentProse && typeof content.treatmentProse === 'string') {
        treatmentSection = content.treatmentProse;
      }
    }

    // 2b. If no treatment in Stage 3, try Stage 2 selected treatment
    if (!treatmentSection) {
      const { data: stage2Data } = await supabase
        .from('stage_states')
        .select('content')
        .eq('branch_id', branchId)
        .eq('stage_number', 2)
        .eq('status', 'locked')
        .order('version', { ascending: false })
        .limit(1);

      if (stage2Data && stage2Data.length > 0) {
        const content = stage2Data[0].content as Record<string, unknown>;
        const treatments = content.treatments as Array<{ id: string; content?: string }> | undefined;
        const selectedId = content.selectedTreatmentId as string | undefined;
        if (treatments && selectedId) {
          const selected = treatments.find(
            (t) => t.id === selectedId
          );
          if (selected) {
            treatmentSection = selected.content ?? '';
          }
        } else if (treatments && treatments.length > 0) {
          treatmentSection = treatments[0].content ?? '';
        }
      }
    }

    // 3. Shot list from Stage 7 (shots table)
    const { data: shots } = await supabase
      .from('shots')
      .select('shot_id, action, dialogue, setting, camera, characters_foreground')
      .eq('scene_id', sceneId)
      .order('shot_order');

    const shotActions = (shots ?? []).map((s) => {
      const parts = [`Shot ${s.shot_id}:`];
      if (s.action) parts.push(`Action: ${s.action}`);
      if (s.dialogue) parts.push(`Dialogue: ${s.dialogue}`);
      if (s.setting) parts.push(`Setting: ${s.setting}`);
      if (s.characters_foreground?.length)
        parts.push(`Characters: ${s.characters_foreground.join(', ')}`);
      return parts.join(' | ');
    });

    return { scriptExcerpt, beatEntry, treatmentSection, shotActions };
  }

  /**
   * Infer context-based description and tags for a single asset.
   */
  async inferAssetContext(
    sceneId: string,
    branchId: string,
    instanceId: string
  ): Promise<AssetContextSuggestion> {
    // Fetch the asset instance with project asset data
    const { data: instance, error } = await supabase
      .from('scene_asset_instances')
      .select(`
        *,
        project_asset:project_assets(id, name, asset_type, description)
      `)
      .eq('id', instanceId)
      .single();

    if (error || !instance) {
      throw new Error('Scene asset instance not found');
    }

    const storyContext = await this.assembleSceneStoryContext(sceneId, branchId);

    return this.callInferenceLLM(instance as unknown as InstanceWithAsset, storyContext);
  }

  /**
   * Bulk infer context for multiple assets in one scene.
   * Fetches story context once, then runs inference per asset.
   */
  async bulkInferAssetContext(
    sceneId: string,
    branchId: string,
    instanceIds: string[]
  ): Promise<BulkAssetContextResult[]> {
    // Fetch all instances at once
    const { data: instances, error } = await supabase
      .from('scene_asset_instances')
      .select(`
        *,
        project_asset:project_assets(id, name, asset_type, description)
      `)
      .in('id', instanceIds);

    if (error || !instances) {
      throw new Error('Failed to fetch scene asset instances');
    }

    const typedInstances = instances as unknown as InstanceWithAsset[];

    // Assemble context once for the scene
    const storyContext = await this.assembleSceneStoryContext(sceneId, branchId);

    // If <= 4 assets, batch into a single LLM call for efficiency
    if (typedInstances.length <= 4) {
      return this.callBulkInferenceLLM(typedInstances, storyContext);
    }

    // Otherwise, parallelize individual calls
    const results = await Promise.all(
      typedInstances.map(async (instance) => {
        try {
          const suggestion = await this.callInferenceLLM(instance, storyContext);
          const pa = instance.project_asset;
          return {
            instanceId: instance.id,
            assetName: pa?.name ?? 'Unknown',
            assetType: pa?.asset_type ?? 'prop',
            current_description:
              instance.effective_description ?? pa?.description ?? '',
            suggested_description: suggestion.suggested_description,
            current_tags: instance.status_tags ?? [],
            suggested_tags: suggestion.suggested_tags,
            reasoning: suggestion.reasoning,
          };
        } catch (err) {
          const pa = instance.project_asset;
          return {
            instanceId: instance.id,
            assetName: pa?.name ?? 'Unknown',
            assetType: pa?.asset_type ?? 'prop',
            current_description:
              instance.effective_description ?? pa?.description ?? '',
            suggested_description: '',
            current_tags: instance.status_tags ?? [],
            suggested_tags: [],
            reasoning: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
          };
        }
      })
    );

    return results;
  }

  /**
   * Call LLM for a single asset context inference.
   */
  private async callInferenceLLM(
    instance: InstanceWithAsset,
    storyContext: SceneStoryContext
  ): Promise<AssetContextSuggestion> {
    const pa = instance.project_asset;
    const assetName = pa?.name ?? 'Unknown';
    const assetType = pa?.asset_type ?? 'prop';
    const masterDescription = pa?.description ?? '';
    const effectiveDescription =
      instance.effective_description ?? masterDescription;
    const currentTags = (instance.status_tags ?? []).join(', ') || 'none';

    const userPrompt = this.buildInferencePrompt(
      assetName,
      assetType,
      masterDescription,
      effectiveDescription,
      currentTags,
      storyContext
    );

    const response = await llmClient.generate({
      systemPrompt:
        'You are a visual continuity specialist for film production. Analyze story context to determine the precise visual condition of assets in each scene. Respond with valid JSON only, no markdown or extra text.',
      userPrompt,
      temperature: 0.3,
      maxTokens: 2048,
    });

    return this.parseInferenceResponse(response.content);
  }

  /**
   * Batch LLM call for multiple assets in a single request.
   */
  private async callBulkInferenceLLM(
    instances: InstanceWithAsset[],
    storyContext: SceneStoryContext
  ): Promise<BulkAssetContextResult[]> {
    const assetsBlock = instances
      .map((inst) => {
        const pa = inst.project_asset;
        return `- Asset "${pa?.name ?? 'Unknown'}" (${pa?.asset_type ?? 'prop'}, id: ${inst.id})
  Master description: ${pa?.description ?? 'N/A'}
  Current scene description: ${inst.effective_description ?? pa?.description ?? 'N/A'}
  Current status tags: ${(inst.status_tags ?? []).join(', ') || 'none'}`;
      })
      .join('\n\n');

    const userPrompt = `
Analyze the following scene from a screenplay and determine the visual condition of EACH asset listed below.

SCENE CONTEXT:
Script: ${storyContext.scriptExcerpt || '(not available)'}

Beat Sheet:
${storyContext.beatEntry || '(not available)'}

Treatment:
${storyContext.treatmentSection ? storyContext.treatmentSection.substring(0, 2000) : '(not available)'}

Shot List:
${storyContext.shotActions.join('\n') || '(not available)'}

ASSETS TO ANALYZE:
${assetsBlock}

For EACH asset, determine:
1. An updated visual description reflecting this asset's condition IN THIS SPECIFIC SCENE
2. Suggested status tags (short visual modifiers like "muddy", "bleeding", "formal_attire")
3. Brief reasoning explaining what story context informed your suggestions

IMPORTANT:
- Only suggest changes that are clearly supported by the story context
- If the asset's current description already accurately reflects the scene, say so in reasoning and return the current description unchanged
- Status tags should be concrete visual modifiers, not narrative states
- Keep descriptions focused on visual appearance for image generation

Return JSON:
{
  "results": [
    {
      "instanceId": "<asset id>",
      "suggested_description": "...",
      "suggested_tags": ["tag1", "tag2"],
      "reasoning": "..."
    }
  ]
}
`;

    const response = await llmClient.generate({
      systemPrompt:
        'You are a visual continuity specialist for film production. Analyze story context to determine the precise visual condition of assets in each scene. Respond with valid JSON only, no markdown or extra text.',
      userPrompt,
      temperature: 0.3,
      maxTokens: 4096,
    });

    const parsed = this.parseBulkInferenceResponse(response.content);

    // Map parsed results back to full BulkAssetContextResult
    return instances.map((inst) => {
      const pa = inst.project_asset;
      const match = parsed.find((r) => r.instanceId === inst.id);
      return {
        instanceId: inst.id,
        assetName: pa?.name ?? 'Unknown',
        assetType: pa?.asset_type ?? 'prop',
        current_description:
          inst.effective_description ?? pa?.description ?? '',
        suggested_description: match?.suggested_description ?? '',
        current_tags: inst.status_tags ?? [],
        suggested_tags: match?.suggested_tags ?? [],
        reasoning: match?.reasoning ?? 'No suggestion returned',
      };
    });
  }

  private buildInferencePrompt(
    assetName: string,
    assetType: string,
    masterDescription: string,
    effectiveDescription: string,
    currentTags: string,
    storyContext: SceneStoryContext
  ): string {
    return `
You are analyzing a scene from a screenplay to determine the visual condition of a specific asset in this scene.

ASSET:
- Name: ${assetName}
- Type: ${assetType}
- Master description: ${masterDescription}
- Current scene description: ${effectiveDescription}
- Current status tags: ${currentTags}

SCENE CONTEXT:
Script: ${storyContext.scriptExcerpt || '(not available)'}

Beat Sheet:
${storyContext.beatEntry || '(not available)'}

Treatment:
${storyContext.treatmentSection ? storyContext.treatmentSection.substring(0, 2000) : '(not available)'}

Shot List:
${storyContext.shotActions.join('\n') || '(not available)'}

Determine:
1. An updated visual description that reflects this asset's condition IN THIS SCENE
   (what they're wearing, their physical state, emotional state, any changes from master)
2. Suggested status tags (short visual modifiers like "muddy", "bleeding", "formal_attire", "night_lighting")
3. Brief reasoning explaining what story context informed these suggestions

IMPORTANT:
- Only suggest changes clearly supported by the story context
- If the current description already accurately reflects the scene, return it unchanged and explain why
- Status tags should be concrete visual modifiers useful for image generation
- Keep descriptions focused on visual appearance

Return JSON:
{
  "suggested_description": "...",
  "suggested_tags": ["tag1", "tag2"],
  "reasoning": "Brief explanation of what story context informed these suggestions"
}
`;
  }

  private parseInferenceResponse(aiResponse: string): AssetContextSuggestion {
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in AI response');
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        suggested_description: parsed.suggested_description ?? '',
        suggested_tags: Array.isArray(parsed.suggested_tags)
          ? parsed.suggested_tags
          : [],
        reasoning: parsed.reasoning ?? '',
      };
    } catch (e) {
      throw new Error(
        `Failed to parse AI inference response: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }

  private parseBulkInferenceResponse(
    aiResponse: string
  ): Array<{
    instanceId: string;
    suggested_description: string;
    suggested_tags: string[];
    reasoning: string;
  }> {
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in AI response');
      const parsed = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(parsed.results)) {
        throw new Error('Expected results array in response');
      }
      return parsed.results.map((r: Record<string, unknown>) => ({
        instanceId: r.instanceId ?? '',
        suggested_description: r.suggested_description ?? '',
        suggested_tags: Array.isArray(r.suggested_tags)
          ? r.suggested_tags
          : [],
        reasoning: r.reasoning ?? '',
      }));
    } catch (e) {
      throw new Error(
        `Failed to parse bulk AI inference response: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }
}
