/**
 * Scene Asset Generation Attempts Service
 * Manages generation history per scene asset instance (3B.1)
 */

import { supabase } from '../config/supabase.js';

const MAX_ATTEMPTS = 8;

export interface CreateAttemptData {
  image_url: string;
  storage_path?: string;
  source: 'generated' | 'uploaded' | 'master_copy';
  is_selected?: boolean;
  image_generation_job_id?: string;
  prompt_snapshot?: string;
  cost_credits?: number;
  original_filename?: string;
  file_size_bytes?: number;
  mime_type?: string;
  copied_from_url?: string;
}

export class SceneAssetAttemptsService {
  /**
   * List all attempts for a scene asset instance, newest first
   */
  async listAttempts(instanceId: string) {
    const { data, error } = await supabase
      .from('scene_asset_generation_attempts')
      .select('*')
      .eq('scene_asset_instance_id', instanceId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to list attempts: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Create a new attempt for a scene asset instance
   */
  async createAttempt(instanceId: string, data: CreateAttemptData) {
    const attemptNumber = await this.getNextAttemptNumber(instanceId);

    const { data: attempt, error } = await supabase
      .from('scene_asset_generation_attempts')
      .insert({
        scene_asset_instance_id: instanceId,
        image_url: data.image_url,
        storage_path: data.storage_path,
        source: data.source,
        is_selected: data.is_selected ?? false,
        image_generation_job_id: data.image_generation_job_id,
        prompt_snapshot: data.prompt_snapshot,
        cost_credits: data.cost_credits,
        original_filename: data.original_filename,
        file_size_bytes: data.file_size_bytes,
        mime_type: data.mime_type,
        copied_from_url: data.copied_from_url,
        attempt_number: attemptNumber,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create attempt: ${error.message}`);
    }

    return attempt;
  }

  /**
   * Select an attempt: deselect all others, select target, update instance image_key_url.
   * Uses sequential operations to respect the partial unique index.
   */
  async selectAttempt(instanceId: string, attemptId: string) {
    // Step 1: Deselect all attempts for this instance
    const { error: deselectError } = await supabase
      .from('scene_asset_generation_attempts')
      .update({ is_selected: false })
      .eq('scene_asset_instance_id', instanceId)
      .eq('is_selected', true);

    if (deselectError) {
      throw new Error(`Failed to deselect attempts: ${deselectError.message}`);
    }

    // Step 2: Select the target attempt
    const { data: attempt, error: selectError } = await supabase
      .from('scene_asset_generation_attempts')
      .update({ is_selected: true })
      .eq('id', attemptId)
      .eq('scene_asset_instance_id', instanceId)
      .select()
      .single();

    if (selectError || !attempt) {
      throw new Error(`Failed to select attempt: ${selectError?.message || 'Attempt not found'}`);
    }

    // Step 3: Update the scene_asset_instances.image_key_url
    const { error: updateError } = await supabase
      .from('scene_asset_instances')
      .update({ image_key_url: attempt.image_url })
      .eq('id', instanceId);

    if (updateError) {
      throw new Error(`Failed to update instance image: ${updateError.message}`);
    }

    return attempt;
  }

  /**
   * Delete an attempt. Cannot delete the currently selected attempt.
   * Also removes the storage file if present.
   */
  async deleteAttempt(instanceId: string, attemptId: string) {
    // Fetch the attempt to check selection and get storage path
    const { data: attempt, error: fetchError } = await supabase
      .from('scene_asset_generation_attempts')
      .select('*')
      .eq('id', attemptId)
      .eq('scene_asset_instance_id', instanceId)
      .single();

    if (fetchError || !attempt) {
      throw new Error('Attempt not found');
    }

    if (attempt.is_selected) {
      throw new Error('Cannot delete the currently selected attempt');
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('scene_asset_generation_attempts')
      .delete()
      .eq('id', attemptId);

    if (deleteError) {
      throw new Error(`Failed to delete attempt: ${deleteError.message}`);
    }

    // Delete storage file if present
    if (attempt.storage_path) {
      await supabase.storage
        .from('asset-images')
        .remove([attempt.storage_path]);
    }

    return { deleted: true };
  }

  /**
   * Enforce attempt cap: if count >= MAX_ATTEMPTS, delete oldest non-selected attempt
   */
  async enforceAttemptCap(instanceId: string) {
    const { data: attempts, error } = await supabase
      .from('scene_asset_generation_attempts')
      .select('id, is_selected, storage_path, created_at')
      .eq('scene_asset_instance_id', instanceId)
      .order('created_at', { ascending: true });

    if (error || !attempts) return;

    if (attempts.length >= MAX_ATTEMPTS) {
      // Find oldest non-selected attempt
      const toDelete = attempts.find(a => !a.is_selected);
      if (toDelete) {
        await supabase
          .from('scene_asset_generation_attempts')
          .delete()
          .eq('id', toDelete.id);

        if (toDelete.storage_path) {
          await supabase.storage
            .from('asset-images')
            .remove([toDelete.storage_path]);
        }

        console.log(`[AttemptsService] Enforced cap: deleted attempt ${toDelete.id} for instance ${instanceId}`);
      }
    }
  }

  /**
   * Get next attempt number for an instance
   */
  async getNextAttemptNumber(instanceId: string): Promise<number> {
    const { data, error } = await supabase
      .from('scene_asset_generation_attempts')
      .select('attempt_number')
      .eq('scene_asset_instance_id', instanceId)
      .order('attempt_number', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      return 1;
    }

    return data[0].attempt_number + 1;
  }

  /**
   * Lazy migration: if no attempts exist but image_key_url is set,
   * create a single source='generated' attempt from existing data
   */
  async backfillAttemptIfNeeded(instanceId: string) {
    const { data: attempts } = await supabase
      .from('scene_asset_generation_attempts')
      .select('id')
      .eq('scene_asset_instance_id', instanceId)
      .limit(1);

    if (attempts && attempts.length > 0) return; // Already has attempts

    const { data: instance } = await supabase
      .from('scene_asset_instances')
      .select('image_key_url')
      .eq('id', instanceId)
      .single();

    if (!instance?.image_key_url) return; // No image to backfill

    await this.createAttempt(instanceId, {
      image_url: instance.image_key_url,
      source: 'generated',
      is_selected: true,
    });

    console.log(`[AttemptsService] Backfilled attempt for instance ${instanceId}`);
  }
}
