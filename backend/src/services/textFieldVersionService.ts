/**
 * Text Field Version Service
 * Manages version history for text fields across shots and scene asset instances.
 * Pattern mirrors sceneAssetAttemptsService (MAX_VERSIONS=8, is_selected, version_number).
 */

import { supabase } from '../config/supabase.js';

const MAX_VERSIONS = 8;

export type EntityType = 'shot' | 'scene_asset_instance';
export type FieldName = 'frame_prompt' | 'video_prompt' | 'end_frame_prompt' | 'description_override';
export type VersionSource = 'user_save' | 'ai_generation';

export interface TextFieldVersion {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  field_name: FieldName;
  content: string;
  is_selected: boolean;
  source: VersionSource;
  version_number: number;
  created_at: string;
}

export interface CreateVersionData {
  content: string;
  source: VersionSource;
}

// Map field_name to source table and column
const FIELD_WRITEBACK_MAP: Record<FieldName, { table: string; column: string }> = {
  frame_prompt: { table: 'shots', column: 'frame_prompt' },
  video_prompt: { table: 'shots', column: 'video_prompt' },
  end_frame_prompt: { table: 'shots', column: 'end_frame_prompt' },
  description_override: { table: 'scene_asset_instances', column: 'description_override' },
};

export class TextFieldVersionService {
  /**
   * List all versions for an entity+field, newest first
   */
  async listVersions(entityId: string, fieldName: FieldName): Promise<TextFieldVersion[]> {
    const { data, error } = await supabase
      .from('text_field_versions')
      .select('*')
      .eq('entity_id', entityId)
      .eq('field_name', fieldName)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to list versions: ${error.message}`);
    }

    return (data || []) as TextFieldVersion[];
  }

  /**
   * Create a new version. Auto-increments version_number, enforces cap, sets is_selected, writes back to source table.
   */
  async createVersion(
    entityType: EntityType,
    entityId: string,
    fieldName: FieldName,
    data: CreateVersionData
  ): Promise<TextFieldVersion> {
    // Enforce cap before creating
    await this.enforceVersionCap(entityId, fieldName);

    const versionNumber = await this.getNextVersionNumber(entityId, fieldName);

    // Deselect all existing versions for this entity+field
    await supabase
      .from('text_field_versions')
      .update({ is_selected: false })
      .eq('entity_id', entityId)
      .eq('field_name', fieldName)
      .eq('is_selected', true);

    // Insert new version as selected
    const { data: version, error } = await supabase
      .from('text_field_versions')
      .insert({
        entity_type: entityType,
        entity_id: entityId,
        field_name: fieldName,
        content: data.content,
        source: data.source,
        is_selected: true,
        version_number: versionNumber,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create version: ${error.message}`);
    }

    // Write back to source table
    await this.writeBackToSource(entityId, fieldName, data.content);

    return version as TextFieldVersion;
  }

  /**
   * Select a specific version: deselect all, select target, write back to source table.
   */
  async selectVersion(entityId: string, fieldName: FieldName, versionId: string): Promise<TextFieldVersion> {
    // Deselect all
    const { error: deselectError } = await supabase
      .from('text_field_versions')
      .update({ is_selected: false })
      .eq('entity_id', entityId)
      .eq('field_name', fieldName)
      .eq('is_selected', true);

    if (deselectError) {
      throw new Error(`Failed to deselect versions: ${deselectError.message}`);
    }

    // Select target
    const { data: version, error: selectError } = await supabase
      .from('text_field_versions')
      .update({ is_selected: true })
      .eq('id', versionId)
      .eq('entity_id', entityId)
      .eq('field_name', fieldName)
      .select()
      .single();

    if (selectError || !version) {
      throw new Error(`Failed to select version: ${selectError?.message || 'Version not found'}`);
    }

    // Write back to source table
    await this.writeBackToSource(entityId, fieldName, version.content);

    return version as TextFieldVersion;
  }

  /**
   * Lazy migration: if no versions exist but field has content, create v1
   */
  async backfillIfNeeded(
    entityType: EntityType,
    entityId: string,
    fieldName: FieldName,
    currentContent: string | null
  ): Promise<void> {
    if (!currentContent) return;

    const { data: existing } = await supabase
      .from('text_field_versions')
      .select('id')
      .eq('entity_id', entityId)
      .eq('field_name', fieldName)
      .limit(1);

    if (existing && existing.length > 0) return;

    // Create v1 from existing content
    await supabase
      .from('text_field_versions')
      .insert({
        entity_type: entityType,
        entity_id: entityId,
        field_name: fieldName,
        content: currentContent,
        source: 'ai_generation',
        is_selected: true,
        version_number: 1,
      });

    console.log(`[TextFieldVersionService] Backfilled v1 for ${entityType}:${entityId}:${fieldName}`);
  }

  /**
   * Enforce version cap: if count >= MAX_VERSIONS, delete oldest non-selected version
   */
  private async enforceVersionCap(entityId: string, fieldName: FieldName): Promise<void> {
    const { data: versions, error } = await supabase
      .from('text_field_versions')
      .select('id, is_selected, created_at')
      .eq('entity_id', entityId)
      .eq('field_name', fieldName)
      .order('created_at', { ascending: true });

    if (error || !versions) return;

    if (versions.length >= MAX_VERSIONS) {
      const toDelete = versions.find(v => !v.is_selected);
      if (toDelete) {
        await supabase
          .from('text_field_versions')
          .delete()
          .eq('id', toDelete.id);

        console.log(`[TextFieldVersionService] Enforced cap: deleted version ${toDelete.id}`);
      }
    }
  }

  /**
   * Get next version number for an entity+field
   */
  private async getNextVersionNumber(entityId: string, fieldName: FieldName): Promise<number> {
    const { data, error } = await supabase
      .from('text_field_versions')
      .select('version_number')
      .eq('entity_id', entityId)
      .eq('field_name', fieldName)
      .order('version_number', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      return 1;
    }

    return data[0].version_number + 1;
  }

  /**
   * Write back the content to the source table column
   */
  private async writeBackToSource(entityId: string, fieldName: FieldName, content: string): Promise<void> {
    const mapping = FIELD_WRITEBACK_MAP[fieldName];
    const updateData: Record<string, string> = {
      [mapping.column]: content,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from(mapping.table)
      .update(updateData)
      .eq('id', entityId);

    if (error) {
      console.error(`[TextFieldVersionService] Write-back failed for ${mapping.table}.${mapping.column}:`, error.message);
    }
  }
}

export const textFieldVersionService = new TextFieldVersionService();
