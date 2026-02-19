/**
 * Scene Asset Relevance Service
 * AI agent that detects which project assets are needed for a scene based on the locked shot list.
 * Implements non-linear inheritance context (most recent instance per asset in branch).
 * Adheres to 5.2-dev-plan Task 1: no asset hallucination—only existing locked project assets.
 */

import { supabase } from '../config/supabase.js';
import { llmClient } from './llm-client.js';
import { transformationEventService } from './transformationEventService.js';

/** Result shape returned by detectRelevantAssets; matches frontend SceneAssetRelevanceResult. */
export interface SceneAssetRelevanceResult {
  scene_id: string;
  relevant_assets: Array<{
    project_asset_id: string;
    name: string;
    asset_type: 'character' | 'prop' | 'location';
    inherited_from: 'master' | 'previous_scene_instance';
    starting_description: string;
    requires_visual_update: boolean;
    status_tags_inherited: string[];
    relevance_rationale: string;
  }>;
  new_assets_required: Array<{
    name: string;
    asset_type: string;
    description: string;
    justification: string;
  }>;
}

type LastInstanceState = {
  scene_number: number;
  effective_description: string;
  status_tags: string[];
  inherited_from_instance_id: string | null;
};

export class SceneAssetRelevanceService {
  /**
   * Get the most recent instance of each project asset in prior scenes (same branch).
   * Used for non-linear inheritance: if an asset skips a scene, we inherit from its last appearance.
   */
  private async getLastInstancePerAsset(
    branchId: string,
    currentSceneNumber: number
  ): Promise<Map<string, LastInstanceState>> {
    const { data: priorScenes } = await supabase
      .from('scenes')
      .select('id, scene_number')
      .eq('branch_id', branchId)
      .lt('scene_number', currentSceneNumber)
      .order('scene_number', { ascending: false });

    if (!priorScenes?.length) return new Map();

    const sceneIds = priorScenes.map((s) => s.id);
    const { data: instances } = await supabase
      .from('scene_asset_instances')
      .select(
        'id, project_asset_id, effective_description, status_tags, inherited_from_instance_id, scene_id'
      )
      .in('scene_id', sceneIds);

    const sceneNumberById = new Map(priorScenes.map((s) => [s.id, s.scene_number]));
    // Sort by scene_number descending so first occurrence per asset is the most recent
    const sorted = (instances ?? []).slice().sort((a, b) => {
      const na = sceneNumberById.get(a.scene_id) ?? 0;
      const nb = sceneNumberById.get(b.scene_id) ?? 0;
      return nb - na;
    });

    const byAsset = new Map<string, LastInstanceState>();
    for (const inst of sorted) {
      if (!byAsset.has(inst.project_asset_id)) {
        const sceneNumber = sceneNumberById.get(inst.scene_id) ?? 0;

        // Check for transformation events — if asset transformed, use post-state
        const transformState = await transformationEventService.getLastAssetStateForInheritance(
          inst.scene_id,
          inst.id
        );

        if (transformState) {
          byAsset.set(inst.project_asset_id, {
            scene_number: sceneNumber,
            effective_description: transformState.description,
            status_tags: transformState.statusTags,
            inherited_from_instance_id: inst.inherited_from_instance_id ?? null,
          });
        } else {
          byAsset.set(inst.project_asset_id, {
            scene_number: sceneNumber,
            effective_description: inst.effective_description ?? '',
            status_tags: inst.status_tags ?? [],
            inherited_from_instance_id: inst.inherited_from_instance_id ?? null,
          });
        }
      }
    }
    return byAsset;
  }

  /**
   * Analyze shot list to determine which project assets are relevant.
   * Non-linear inheritance context; project-asset-only output (no hallucinated IDs).
   */
  async detectRelevantAssets(
    sceneId: string,
    branchId: string
  ): Promise<SceneAssetRelevanceResult> {
    const { data: scene, error: sceneErr } = await supabase
      .from('scenes')
      .select('id, scene_number, script_excerpt')
      .eq('id', sceneId)
      .single();
    if (sceneErr || !scene) throw new Error('Scene not found');

    const { data: shots } = await supabase
      .from('shots')
      .select('shot_id, characters_foreground, characters_background, setting, action')
      .eq('scene_id', sceneId)
      .order('shot_order');

    const lastInstancePerAsset = await this.getLastInstancePerAsset(
      branchId,
      scene.scene_number
    );

    const { data: projectAssets } = await supabase
      .from('project_assets')
      .select('id, name, asset_type, description, image_key_url')
      .eq('branch_id', branchId)
      .eq('locked', true);

    const prompt = this.buildRelevancePrompt(
      scene,
      shots ?? [],
      lastInstancePerAsset,
      projectAssets ?? []
    );
    const response = await llmClient.generate({
      systemPrompt:
        'You are an asset continuity manager. Respond with valid JSON only, no markdown or extra text.',
      userPrompt: prompt,
      temperature: 0.3,
      maxTokens: 4096,
    });
    const raw = this.parseRelevanceResponse(response.content);

    const validIds = new Set((projectAssets ?? []).map((a) => a.id));
    const relevant_assets = (raw.relevant_assets ?? []).filter((ra) =>
      validIds.has(ra.project_asset_id)
    );
    return { ...raw, relevant_assets };
  }

  private buildRelevancePrompt(
    scene: { id: string; scene_number: number; script_excerpt: string },
    shots: Array<{
      shot_id: string;
      characters_foreground: string[] | null;
      characters_background: string[] | null;
      setting: string;
      action: string;
    }>,
    lastInstancePerAsset: Map<string, LastInstanceState>,
    projectAssets: Array<{
      id: string;
      name: string;
      asset_type: string;
      description: string;
      image_key_url?: string | null;
    }>
  ): string {
    const inheritanceContext = Array.from(lastInstancePerAsset.entries()).map(
      ([project_asset_id, state]) =>
        `project_asset_id ${project_asset_id}: last in scene ${state.scene_number}, description: ${state.effective_description}, status_tags: ${(state.status_tags ?? []).join(', ') || 'none'}`
    );

    const shotLines = shots.map(
      (s) =>
        `- Shot ${s.shot_id}: Characters: ${(s.characters_foreground ?? []).join(', ')}; Setting: ${s.setting}; Action: ${s.action}`
    );
    const assetLines = projectAssets.map(
      (a) =>
        `- id: ${a.id}, name: ${a.name}, type: ${a.asset_type}, description: ${a.description}`
    );

    return `
You are an asset continuity manager. Determine which **existing** Master Assets (from the list below) appear in the current scene and their starting visual state.

CRITICAL: You may ONLY reference project_asset_id values that appear in "AVAILABLE PROJECT ASSETS". Do not invent IDs. If the shot list mentions something not in that list, put it in "new_assets_required" only (advisory; no IDs).

CURRENT SCENE:
Scene Number: ${scene.scene_number}
Script Excerpt: ${scene.script_excerpt}

Shot List:
${shotLines.join('\n')}

LAST KNOWN STATE PER ASSET (most recent prior appearance in this branch):
${inheritanceContext.length ? inheritanceContext.join('\n') : 'None (Scene 1)'}

AVAILABLE PROJECT ASSETS (only these may appear in relevant_assets):
${assetLines.join('\n')}

RELEVANCE RULES:
1. Include only characters/props/settings explicitly or clearly implied in the shot list.
2. For each asset, use LAST KNOWN STATE if present; otherwise use Master Asset description.
3. relevant_assets[].project_asset_id MUST be one of the AVAILABLE PROJECT ASSETS ids.

STATE INHERITANCE:
- If the asset has a "last known state" above, use that as starting_description and status_tags_inherited.
- If new to this scene, use the Master Asset description.

OUTPUT (JSON only):
{
  "scene_id": "${scene.id}",
  "relevant_assets": [
    {
      "project_asset_id": "<must be from AVAILABLE PROJECT ASSETS>",
      "name": "string",
      "asset_type": "character | prop | location",
      "inherited_from": "master | previous_scene_instance",
      "starting_description": "string",
      "requires_visual_update": false,
      "status_tags_inherited": [],
      "relevance_rationale": "string"
    }
  ],
  "new_assets_required": [
    { "name": "string", "asset_type": "character | prop | location", "description": "string", "justification": "string" }
  ]
}

Generate the JSON output now.
`;
  }

  private parseRelevanceResponse(aiResponse: string): SceneAssetRelevanceResult {
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in AI response');
      return JSON.parse(jsonMatch[0]) as SceneAssetRelevanceResult;
    } catch (e) {
      throw new Error(
        `Failed to parse AI relevance response: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }
}
