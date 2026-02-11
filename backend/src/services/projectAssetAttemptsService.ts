/**
 * Project Asset Generation Attempts Service
 * Manages generation history per project asset (3A.6)
 * Simplified version of sceneAssetAttemptsService — no cost_credits, prompt_snapshot, copied_from_url
 */

import { supabase } from '../config/supabase.js';

const MAX_ATTEMPTS = 4;

export interface CreateProjectAttemptData {
  image_url: string;
  storage_path?: string;
  source: 'generated' | 'uploaded';
  is_selected?: boolean;
  original_filename?: string;
  file_size_bytes?: number;
  mime_type?: string;
}

export class ProjectAssetAttemptsService {
  /**
   * List all attempts for a project asset, newest first
   */
  async listAttempts(assetId: string) {
    const { data, error } = await supabase
      .from('project_asset_generation_attempts')
      .select('*')
      .eq('project_asset_id', assetId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to list attempts: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Create a new attempt for a project asset
   */
  async createAttempt(assetId: string, data: CreateProjectAttemptData) {
    const attemptNumber = await this.getNextAttemptNumber(assetId);

    // If this attempt should be selected, deselect existing
    if (data.is_selected) {
      await supabase
        .from('project_asset_generation_attempts')
        .update({ is_selected: false })
        .eq('project_asset_id', assetId)
        .eq('is_selected', true);
    }

    const { data: attempt, error } = await supabase
      .from('project_asset_generation_attempts')
      .insert({
        project_asset_id: assetId,
        image_url: data.image_url,
        storage_path: data.storage_path,
        source: data.source,
        is_selected: data.is_selected ?? false,
        original_filename: data.original_filename,
        file_size_bytes: data.file_size_bytes,
        mime_type: data.mime_type,
        attempt_number: attemptNumber,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create attempt: ${error.message}`);
    }

    // If selected, also update project_assets.image_key_url
    if (data.is_selected) {
      await supabase
        .from('project_assets')
        .update({ image_key_url: data.image_url })
        .eq('id', assetId);
    }

    return attempt;
  }

  /**
   * Select an attempt: deselect all others, select target, update asset image_key_url.
   */
  async selectAttempt(assetId: string, attemptId: string) {
    // Step 1: Deselect all attempts for this asset
    const { error: deselectError } = await supabase
      .from('project_asset_generation_attempts')
      .update({ is_selected: false })
      .eq('project_asset_id', assetId)
      .eq('is_selected', true);

    if (deselectError) {
      throw new Error(`Failed to deselect attempts: ${deselectError.message}`);
    }

    // Step 2: Select the target attempt
    const { data: attempt, error: selectError } = await supabase
      .from('project_asset_generation_attempts')
      .update({ is_selected: true })
      .eq('id', attemptId)
      .eq('project_asset_id', assetId)
      .select()
      .single();

    if (selectError || !attempt) {
      throw new Error(`Failed to select attempt: ${selectError?.message || 'Attempt not found'}`);
    }

    // Step 3: Update the project_assets.image_key_url
    const { error: updateError } = await supabase
      .from('project_assets')
      .update({ image_key_url: attempt.image_url })
      .eq('id', assetId);

    if (updateError) {
      throw new Error(`Failed to update asset image: ${updateError.message}`);
    }

    return attempt;
  }

  /**
   * Delete an attempt. Cannot delete the currently selected attempt.
   * Also removes the storage file if present.
   */
  async deleteAttempt(assetId: string, attemptId: string) {
    // Fetch the attempt to check selection and get storage path
    const { data: attempt, error: fetchError } = await supabase
      .from('project_asset_generation_attempts')
      .select('*')
      .eq('id', attemptId)
      .eq('project_asset_id', assetId)
      .single();

    if (fetchError || !attempt) {
      throw new Error('Attempt not found');
    }

    if (attempt.is_selected) {
      throw new Error('Cannot delete the currently selected attempt');
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('project_asset_generation_attempts')
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
  async enforceAttemptCap(assetId: string) {
    const { data: attempts, error } = await supabase
      .from('project_asset_generation_attempts')
      .select('id, is_selected, storage_path, created_at')
      .eq('project_asset_id', assetId)
      .order('created_at', { ascending: true });

    if (error || !attempts) return;

    if (attempts.length >= MAX_ATTEMPTS) {
      // Find oldest non-selected attempt
      const toDelete = attempts.find(a => !a.is_selected);
      if (toDelete) {
        await supabase
          .from('project_asset_generation_attempts')
          .delete()
          .eq('id', toDelete.id);

        if (toDelete.storage_path) {
          await supabase.storage
            .from('asset-images')
            .remove([toDelete.storage_path]);
        }

        console.log(`[ProjectAssetAttempts] Enforced cap: deleted attempt ${toDelete.id} for asset ${assetId}`);
      }
    }
  }

  /**
   * Get next attempt number for an asset
   */
  async getNextAttemptNumber(assetId: string): Promise<number> {
    const { data, error } = await supabase
      .from('project_asset_generation_attempts')
      .select('attempt_number')
      .eq('project_asset_id', assetId)
      .order('attempt_number', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      return 1;
    }

    return data[0].attempt_number + 1;
  }

  /**
   * Lazy migration: if no attempts exist but image_key_url is set,
   * create a single attempt from existing data
   */
  async backfillAttemptIfNeeded(assetId: string) {
    const { data: attempts } = await supabase
      .from('project_asset_generation_attempts')
      .select('id')
      .eq('project_asset_id', assetId)
      .limit(1);

    if (attempts && attempts.length > 0) return; // Already has attempts

    const { data: asset } = await supabase
      .from('project_assets')
      .select('image_key_url')
      .eq('id', assetId)
      .single();

    if (!asset?.image_key_url) return; // No image to backfill

    await this.createAttempt(assetId, {
      image_url: asset.image_key_url,
      source: 'generated',
      is_selected: true,
    });

    console.log(`[ProjectAssetAttempts] Backfilled attempt for asset ${assetId}`);
  }
}
