/**
 * Transformation Event Service
 *
 * Manages within-scene asset transformations (e.g., a character changes costume mid-scene).
 * Core responsibility: resolve which asset description to use per-shot based on
 * transformation event boundaries.
 */

import { supabase } from '../config/supabase.js';
import { llmClient } from './llm-client.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TransformationType = 'instant' | 'gradual' | 'within_shot';
export type DetectedBy = 'stage7_extraction' | 'stage8_relevance' | 'manual';

export interface TransformationEvent {
  id: string;
  scene_asset_instance_id: string;
  scene_id: string;
  trigger_shot_id: string;
  transformation_type: TransformationType;
  completion_shot_id: string | null;
  pre_description: string;
  post_description: string;
  transformation_narrative: string | null;
  pre_image_key_url: string | null;
  post_image_key_url: string | null;
  pre_status_tags: string[];
  post_status_tags: string[];
  detected_by: DetectedBy;
  confirmed: boolean;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined shot data (optional, populated when fetched with joins)
  trigger_shot?: { id: string; shot_id: string; shot_order: number };
  completion_shot?: { id: string; shot_id: string; shot_order: number } | null;
}

export interface ShotAssetOverride {
  asset_instance_id: string;
  effective_description: string;
  image_key_url?: string;
  is_transforming: boolean;
  transformation_narrative?: string;
  post_description?: string;
  post_image_key_url?: string;
}

export interface CreateTransformationEventInput {
  scene_asset_instance_id: string;
  scene_id: string;
  trigger_shot_id: string;
  transformation_type: TransformationType;
  completion_shot_id?: string | null;
  pre_description?: string;
  post_description: string;
  transformation_narrative?: string | null;
  pre_image_key_url?: string | null;
  post_image_key_url?: string | null;
  pre_status_tags?: string[];
  post_status_tags?: string[];
  detected_by: DetectedBy;
}

export interface UpdateTransformationEventInput {
  transformation_type?: TransformationType;
  trigger_shot_id?: string;
  completion_shot_id?: string | null;
  pre_description?: string;
  post_description?: string;
  transformation_narrative?: string | null;
  pre_image_key_url?: string | null;
  post_image_key_url?: string | null;
  pre_status_tags?: string[];
  post_status_tags?: string[];
}

interface ShotRef {
  id: string;
  shot_id: string;
  shot_order: number;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class TransformationEventService {
  /**
   * Core resolution algorithm: given a shot and the scene's transformation events,
   * return overrides for any asset whose description differs from its default
   * effective_description at this shot position.
   *
   * Resolution per asset (events sorted by trigger shot_order):
   *
   * | Shot position          | instant        | within_shot                          | gradual                |
   * |------------------------|----------------|--------------------------------------|------------------------|
   * | Before trigger         | pre (no override) | pre (no override)                | pre (no override)      |
   * | At trigger             | post           | pre + is_transforming=true           | pre (mid-transition)   |
   * | Between trigger & comp | N/A            | post                                 | pre (mid-transition)   |
   * | At/after completion    | N/A            | post                                 | post                   |
   */
  resolveOverridesForShot(
    shot: ShotRef,
    sceneAssets: Array<{ id: string; effective_description: string; image_key_url?: string | null }>,
    events: TransformationEvent[],
    allShots: ShotRef[]
  ): ShotAssetOverride[] {
    if (!events.length) return [];

    const shotOrder = shot.shot_order;
    const overrides: ShotAssetOverride[] = [];

    // Group events by asset instance
    const eventsByAsset = new Map<string, TransformationEvent[]>();
    for (const event of events) {
      if (!event.confirmed) continue;
      const list = eventsByAsset.get(event.scene_asset_instance_id) || [];
      list.push(event);
      eventsByAsset.set(event.scene_asset_instance_id, list);
    }

    for (const [assetInstanceId, assetEvents] of eventsByAsset) {
      const asset = sceneAssets.find(a => a.id === assetInstanceId);
      if (!asset) continue;

      // Sort events by trigger shot_order
      const sorted = [...assetEvents].sort((a, b) => {
        const orderA = this.getShotOrder(a.trigger_shot_id, a.trigger_shot, allShots);
        const orderB = this.getShotOrder(b.trigger_shot_id, b.trigger_shot, allShots);
        return orderA - orderB;
      });

      // Walk through events to determine cumulative state at this shot
      let currentDescription = asset.effective_description;
      let currentImageUrl = asset.image_key_url ?? undefined;
      let isTransforming = false;
      let transformNarrative: string | undefined;
      let postDesc: string | undefined;
      let postImageUrl: string | undefined;

      for (const event of sorted) {
        const triggerOrder = this.getShotOrder(event.trigger_shot_id, event.trigger_shot, allShots);
        const completionOrder = event.completion_shot_id
          ? this.getShotOrder(event.completion_shot_id, event.completion_shot, allShots)
          : null;

        if (event.transformation_type === 'instant') {
          if (shotOrder >= triggerOrder) {
            // At or after trigger: use post
            currentDescription = event.post_description;
            currentImageUrl = event.post_image_key_url ?? currentImageUrl;
          }
          // Before trigger: no change
        } else if (event.transformation_type === 'within_shot') {
          if (shotOrder === triggerOrder) {
            // At trigger shot: still show pre, but flag as transforming
            // currentDescription stays as pre (or whatever accumulated so far)
            isTransforming = true;
            transformNarrative = event.transformation_narrative ?? undefined;
            postDesc = event.post_description;
            postImageUrl = event.post_image_key_url ?? undefined;
          } else if (shotOrder > triggerOrder) {
            // After trigger: use post
            currentDescription = event.post_description;
            currentImageUrl = event.post_image_key_url ?? currentImageUrl;
          }
          // Before trigger: no change
        } else if (event.transformation_type === 'gradual') {
          if (completionOrder !== null && shotOrder >= completionOrder) {
            // At or after completion: use post
            currentDescription = event.post_description;
            currentImageUrl = event.post_image_key_url ?? currentImageUrl;
          }
          // Before completion (including at trigger): pre stays (mid-transition, no override)
        }
      }

      // Only emit an override if something changed from the default
      const hasDescChange = currentDescription !== asset.effective_description;
      const hasImageChange = currentImageUrl !== (asset.image_key_url ?? undefined);

      if (hasDescChange || hasImageChange || isTransforming) {
        overrides.push({
          asset_instance_id: assetInstanceId,
          effective_description: currentDescription,
          image_key_url: currentImageUrl,
          is_transforming: isTransforming,
          transformation_narrative: transformNarrative,
          post_description: postDesc,
          post_image_key_url: postImageUrl,
        });
      }
    }

    return overrides;
  }

  private getShotOrder(
    shotId: string,
    joinedShot: { shot_order: number } | null | undefined,
    allShots: ShotRef[]
  ): number {
    if (joinedShot?.shot_order !== undefined) return joinedShot.shot_order;
    const found = allShots.find(s => s.id === shotId);
    return found?.shot_order ?? 0;
  }

  // ---------------------------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------------------------

  async getTransformationEventsForScene(sceneId: string): Promise<TransformationEvent[]> {
    const { data, error } = await supabase
      .from('transformation_events')
      .select(`
        *,
        trigger_shot:shots!trigger_shot_id(id, shot_id, shot_order),
        completion_shot:shots!completion_shot_id(id, shot_id, shot_order)
      `)
      .eq('scene_id', sceneId)
      .order('created_at');

    if (error) throw new Error(`Failed to fetch transformation events: ${error.message}`);

    return (data ?? []).map(row => ({
      ...row,
      trigger_shot: Array.isArray(row.trigger_shot) ? row.trigger_shot[0] : row.trigger_shot,
      completion_shot: Array.isArray(row.completion_shot) ? row.completion_shot[0] : row.completion_shot,
    })) as TransformationEvent[];
  }

  async createTransformationEvent(input: CreateTransformationEventInput): Promise<TransformationEvent> {
    // Auto-populate pre_description from scene_asset_instance if not provided
    let preDescription = input.pre_description;
    if (!preDescription) {
      const { data: instance } = await supabase
        .from('scene_asset_instances')
        .select('effective_description')
        .eq('id', input.scene_asset_instance_id)
        .single();
      preDescription = instance?.effective_description ?? '';
    }

    const { data, error } = await supabase
      .from('transformation_events')
      .insert({
        scene_asset_instance_id: input.scene_asset_instance_id,
        scene_id: input.scene_id,
        trigger_shot_id: input.trigger_shot_id,
        transformation_type: input.transformation_type,
        completion_shot_id: input.completion_shot_id ?? null,
        pre_description: preDescription,
        post_description: input.post_description,
        transformation_narrative: input.transformation_narrative ?? null,
        pre_image_key_url: input.pre_image_key_url ?? null,
        post_image_key_url: input.post_image_key_url ?? null,
        pre_status_tags: input.pre_status_tags ?? [],
        post_status_tags: input.post_status_tags ?? [],
        detected_by: input.detected_by,
        confirmed: false,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create transformation event: ${error.message}`);
    return data as TransformationEvent;
  }

  async updateTransformationEvent(
    id: string,
    updates: UpdateTransformationEventInput
  ): Promise<TransformationEvent> {
    const payload: Record<string, unknown> = {};
    if (updates.transformation_type !== undefined) payload.transformation_type = updates.transformation_type;
    if (updates.trigger_shot_id !== undefined) payload.trigger_shot_id = updates.trigger_shot_id;
    if (updates.completion_shot_id !== undefined) payload.completion_shot_id = updates.completion_shot_id;
    if (updates.pre_description !== undefined) payload.pre_description = updates.pre_description;
    if (updates.post_description !== undefined) payload.post_description = updates.post_description;
    if (updates.transformation_narrative !== undefined) payload.transformation_narrative = updates.transformation_narrative;
    if (updates.pre_image_key_url !== undefined) payload.pre_image_key_url = updates.pre_image_key_url;
    if (updates.post_image_key_url !== undefined) payload.post_image_key_url = updates.post_image_key_url;
    if (updates.pre_status_tags !== undefined) payload.pre_status_tags = updates.pre_status_tags;
    if (updates.post_status_tags !== undefined) payload.post_status_tags = updates.post_status_tags;

    const { data, error } = await supabase
      .from('transformation_events')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update transformation event: ${error.message}`);
    return data as TransformationEvent;
  }

  async confirmTransformationEvent(id: string): Promise<TransformationEvent> {
    const { data, error } = await supabase
      .from('transformation_events')
      .update({ confirmed: true, confirmed_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to confirm transformation event: ${error.message}`);
    return data as TransformationEvent;
  }

  async deleteTransformationEvent(id: string): Promise<void> {
    const { error } = await supabase
      .from('transformation_events')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Failed to delete transformation event: ${error.message}`);
  }

  // ---------------------------------------------------------------------------
  // LLM: Generate post_description from context
  // ---------------------------------------------------------------------------

  async generatePostDescription(eventId: string): Promise<string> {
    const { data: event, error } = await supabase
      .from('transformation_events')
      .select(`
        *,
        scene_asset_instance:scene_asset_instances(
          effective_description,
          project_asset:project_assets(name, asset_type)
        )
      `)
      .eq('id', eventId)
      .single();

    if (error || !event) throw new Error('Transformation event not found');

    const assetName = (event.scene_asset_instance as any)?.project_asset?.name ?? 'the asset';
    const preDesc = event.pre_description;
    const narrative = event.transformation_narrative ?? 'visual transformation';

    // Fetch scene script for context
    const { data: scene } = await supabase
      .from('scenes')
      .select('script_excerpt')
      .eq('id', event.scene_id)
      .single();

    const response = await llmClient.generate({
      systemPrompt: `You are a visual description writer for an AI film pipeline. Given a character/asset's appearance BEFORE a transformation and what happens during the transformation, write a concise post-transformation visual description. Output ONLY the description text (one paragraph, max 500 chars). No JSON, no headers.`,
      userPrompt: `Asset: ${assetName}
Before: ${preDesc}
Transformation: ${narrative}
Scene context: ${scene?.script_excerpt ?? '(none)'}

Write the post-transformation visual description. What does ${assetName} look like AFTER the transformation?`,
      temperature: 0.5,
      maxTokens: 512,
    });

    const postDescription = response.content.trim().substring(0, 500);

    // Save it
    await supabase
      .from('transformation_events')
      .update({ post_description: postDescription })
      .eq('id', eventId);

    return postDescription;
  }

  // ---------------------------------------------------------------------------
  // LLM: Generate prefill data from trigger shot context
  // ---------------------------------------------------------------------------

  async generateTransformationPrefill(
    triggerShotId: string,
    sceneAssetInstanceId: string,
    transformationType: TransformationType,
    sceneId: string
  ): Promise<{ post_description: string; transformation_narrative: string }> {
    // Fetch trigger shot fields
    const { data: shot, error: shotError } = await supabase
      .from('shots')
      .select('action, dialogue, setting, camera, characters_foreground')
      .eq('id', triggerShotId)
      .single();

    if (shotError || !shot) throw new Error('Trigger shot not found');

    // Fetch asset details
    const { data: instance, error: instanceError } = await supabase
      .from('scene_asset_instances')
      .select(`
        effective_description,
        project_asset:project_assets(name, asset_type)
      `)
      .eq('id', sceneAssetInstanceId)
      .single();

    if (instanceError || !instance) throw new Error('Scene asset instance not found');

    const assetName = (instance.project_asset as any)?.name ?? 'the asset';
    const currentAppearance = instance.effective_description ?? '';

    // Fetch scene script
    const { data: scene } = await supabase
      .from('scenes')
      .select('script_excerpt')
      .eq('id', sceneId)
      .single();

    const typeLabel = transformationType === 'instant'
      ? 'between-shots (off-camera)'
      : transformationType === 'within_shot'
        ? 'within-shot (on-camera)'
        : 'gradual (spans multiple shots)';

    const response = await llmClient.generate({
      systemPrompt: `You are a visual description writer for an AI film pipeline. Given an asset's current appearance and what happens in a trigger shot, infer and write:
1. A concise post-transformation visual description (what the asset looks like AFTER)
2. A brief transformation narrative (what happens visually during the change)
Output ONLY valid JSON: { "post_description": "...", "transformation_narrative": "..." }
No extra text, no markdown fences.`,
      userPrompt: `Asset: ${assetName}
Current appearance (before): ${currentAppearance}
Transformation type: ${typeLabel}
Trigger shot action: ${shot.action ?? '(none)'}
Trigger shot dialogue: ${shot.dialogue ?? '(none)'}
Trigger shot setting: ${shot.setting ?? '(none)'}
Trigger shot camera: ${shot.camera ?? '(none)'}
Characters in shot: ${(shot.characters_foreground ?? []).join(', ') || '(none)'}
Scene script excerpt: ${scene?.script_excerpt?.substring(0, 800) ?? '(none)'}

Based on this context, what transformation does ${assetName} undergo? Write the post-transformation appearance and the transformation narrative.`,
      temperature: 0.5,
      maxTokens: 768,
    });

    try {
      const parsed = JSON.parse(response.content.trim());
      return {
        post_description: (parsed.post_description ?? '').substring(0, 500),
        transformation_narrative: (parsed.transformation_narrative ?? '').substring(0, 500),
      };
    } catch {
      // If JSON parsing fails, use the raw content as post_description
      return {
        post_description: response.content.trim().substring(0, 500),
        transformation_narrative: '',
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Cross-scene inheritance helper
  // ---------------------------------------------------------------------------

  /**
   * If an asset has confirmed transformation events in a scene, return the
   * LAST event's post_description and post_status_tags as the final state.
   * Otherwise returns null (caller should use effective_description).
   */
  async getLastAssetStateForInheritance(
    sceneId: string,
    sceneAssetInstanceId: string
  ): Promise<{ description: string; statusTags: string[]; imageKeyUrl: string | null } | null> {
    const { data: events } = await supabase
      .from('transformation_events')
      .select(`
        post_description, post_status_tags, post_image_key_url,
        trigger_shot:shots!trigger_shot_id(shot_order)
      `)
      .eq('scene_id', sceneId)
      .eq('scene_asset_instance_id', sceneAssetInstanceId)
      .eq('confirmed', true);

    if (!events?.length) return null;

    // Sort by trigger shot_order descending, pick the last one
    const sorted = events.sort((a, b) => {
      const orderA = Array.isArray(a.trigger_shot) ? a.trigger_shot[0]?.shot_order ?? 0 : (a.trigger_shot as any)?.shot_order ?? 0;
      const orderB = Array.isArray(b.trigger_shot) ? b.trigger_shot[0]?.shot_order ?? 0 : (b.trigger_shot as any)?.shot_order ?? 0;
      return orderB - orderA;
    });

    const last = sorted[0];
    return {
      description: last.post_description,
      statusTags: last.post_status_tags ?? [],
      imageKeyUrl: last.post_image_key_url ?? null,
    };
  }
}

// Export singleton instance
export const transformationEventService = new TransformationEventService();
