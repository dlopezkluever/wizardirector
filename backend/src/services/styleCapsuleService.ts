/**
 * Style Capsule Service
 * Manages style capsules for writing and visual styles with prompt injection
 */

import { supabase } from '../config/supabase.js';

export interface StyleCapsule {
  id: string;
  library_id: string;
  user_id: string;
  name: string;
  type: 'writing' | 'visual';
  example_text_excerpts?: string[];
  style_labels?: string[];
  negative_constraints?: string[];
  freeform_notes?: string;
  design_pillars?: Record<string, any>;
  reference_image_urls?: string[];
  descriptor_strings?: string;
  is_preset: boolean;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface StyleCapsuleLibrary {
  id: string;
  user_id: string | null;
  name: string;
  description?: string;
  is_preset: boolean;
  created_at: string;
  updated_at: string;
}

export interface StyleCapsuleCreate {
  name: string;
  type: 'writing' | 'visual';
  library_id: string;
  example_text_excerpts?: string[];
  style_labels?: string[];
  negative_constraints?: string[];
  freeform_notes?: string;
  design_pillars?: Record<string, any>;
  reference_image_urls?: string[];
  descriptor_strings?: string;
}

export interface StyleCapsuleUpdate {
  name?: string;
  example_text_excerpts?: string[];
  style_labels?: string[];
  negative_constraints?: string[];
  freeform_notes?: string;
  design_pillars?: Record<string, any>;
  reference_image_urls?: string[];
  descriptor_strings?: string;
  is_favorite?: boolean;
}

export interface StyleCapsuleApplication {
  stage_state_id: string;
  style_capsule_id: string;
  injection_context?: Record<string, any>;
}

export class StyleCapsuleError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'StyleCapsuleError';
  }
}

export class StyleCapsuleService {
  /**
   * Get all accessible style capsules for a user (their own + presets)
   */
  async getUserCapsules(userId: string): Promise<StyleCapsule[]> {
    console.log(`[StyleCapsuleService] Fetching capsules for user ${userId}`);

    const { data, error } = await supabase
      .from('style_capsules')
      .select('*')
      .or(`user_id.eq.${userId},is_preset.eq.true`)
      .order('is_preset', { ascending: false })
      .order('name');

    if (error) {
      console.error('[StyleCapsuleService] Error fetching capsules:', error);
      throw new StyleCapsuleError('Failed to fetch style capsules', 'FETCH_ERROR');
    }

    return data || [];
  }

  /**
   * Get a single style capsule by ID (with access control)
   */
  async getCapsuleById(capsuleId: string, userId: string): Promise<StyleCapsule | null> {
    console.log(`[StyleCapsuleService] Fetching capsule ${capsuleId} for user ${userId}`);

    const { data, error } = await supabase
      .from('style_capsules')
      .select('*')
      .eq('id', capsuleId)
      .or(`user_id.eq.${userId},is_preset.eq.true`)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      console.error('[StyleCapsuleService] Error fetching capsule:', error);
      throw new StyleCapsuleError('Failed to fetch style capsule', 'FETCH_ERROR');
    }

    return data;
  }

  /**
   * Create a new style capsule
   */
  async createCapsule(userId: string, capsuleData: StyleCapsuleCreate): Promise<StyleCapsule> {
    console.log(`[StyleCapsuleService] Creating capsule "${capsuleData.name}" for user ${userId}`);

    // Verify library ownership
    const { data: library, error: libraryError } = await supabase
      .from('style_capsule_libraries')
      .select('id')
      .eq('id', capsuleData.library_id)
      .eq('user_id', userId)
      .single();

    if (libraryError || !library) {
      throw new StyleCapsuleError('Library not found or access denied', 'LIBRARY_ACCESS_DENIED');
    }

    const { data, error } = await supabase
      .from('style_capsules')
      .insert({
        ...capsuleData,
        user_id: userId
      })
      .select()
      .single();

    if (error) {
      console.error('[StyleCapsuleService] Error creating capsule:', error);
      throw new StyleCapsuleError('Failed to create style capsule', 'CREATE_ERROR');
    }

    return data;
  }

  /**
   * Update an existing style capsule
   */
  async updateCapsule(capsuleId: string, userId: string, updates: StyleCapsuleUpdate): Promise<StyleCapsule> {
    console.log(`[StyleCapsuleService] Updating capsule ${capsuleId} for user ${userId}`);

    // Check ownership and preset status
    const { data: existingCapsule, error: fetchError } = await supabase
      .from('style_capsules')
      .select('user_id, is_preset')
      .eq('id', capsuleId)
      .single();

    if (fetchError) {
      throw new StyleCapsuleError('Style capsule not found', 'NOT_FOUND');
    }

    if (existingCapsule.is_preset) {
      throw new StyleCapsuleError('Cannot modify preset capsules', 'PRESET_MODIFICATION_DENIED');
    }

    if (existingCapsule.user_id !== userId) {
      throw new StyleCapsuleError('Access denied', 'ACCESS_DENIED');
    }

    const { data, error } = await supabase
      .from('style_capsules')
      .update(updates)
      .eq('id', capsuleId)
      .select()
      .single();

    if (error) {
      console.error('[StyleCapsuleService] Error updating capsule:', error);
      throw new StyleCapsuleError('Failed to update style capsule', 'UPDATE_ERROR');
    }

    return data;
  }

  /**
   * Delete a style capsule
   */
  async deleteCapsule(capsuleId: string, userId: string): Promise<void> {
    console.log(`[StyleCapsuleService] Deleting capsule ${capsuleId} for user ${userId}`);

    // Check ownership and preset status
    const { data: capsule, error: fetchError } = await supabase
      .from('style_capsules')
      .select('user_id, is_preset')
      .eq('id', capsuleId)
      .single();

    if (fetchError) {
      throw new StyleCapsuleError('Style capsule not found', 'NOT_FOUND');
    }

    if (capsule.is_preset) {
      throw new StyleCapsuleError('Cannot delete preset capsules', 'PRESET_DELETION_DENIED');
    }

    if (capsule.user_id !== userId) {
      throw new StyleCapsuleError('Access denied', 'ACCESS_DENIED');
    }

    const { error } = await supabase
      .from('style_capsules')
      .delete()
      .eq('id', capsuleId);

    if (error) {
      console.error('[StyleCapsuleService] Error deleting capsule:', error);
      throw new StyleCapsuleError('Failed to delete style capsule', 'DELETE_ERROR');
    }
  }

  /**
   * Toggle favorite status of a capsule
   */
  async toggleFavorite(capsuleId: string, userId: string): Promise<StyleCapsule> {
    console.log(`[StyleCapsuleService] Toggling favorite for capsule ${capsuleId}`);

    // Check access
    const { data: capsule, error: fetchError } = await supabase
      .from('style_capsules')
      .select('user_id, is_favorite')
      .eq('id', capsuleId)
      .or(`user_id.eq.${userId},is_preset.eq.true`)
      .single();

    if (fetchError || !capsule) {
      throw new StyleCapsuleError('Style capsule not found', 'NOT_FOUND');
    }

    const newFavoriteStatus = !capsule.is_favorite;

    const { data, error } = await supabase
      .from('style_capsules')
      .update({ is_favorite: newFavoriteStatus })
      .eq('id', capsuleId)
      .select()
      .single();

    if (error) {
      console.error('[StyleCapsuleService] Error toggling favorite:', error);
      throw new StyleCapsuleError('Failed to update favorite status', 'FAVORITE_ERROR');
    }

    return data;
  }

  /**
   * Duplicate a preset capsule to user's library
   */
  async duplicatePreset(presetId: string, userId: string, libraryId: string, newName?: string): Promise<StyleCapsule> {
    console.log(`[StyleCapsuleService] Duplicating preset ${presetId} for user ${userId}`);

    // Get the preset capsule
    const { data: presetCapsule, error: fetchError } = await supabase
      .from('style_capsules')
      .select('*')
      .eq('id', presetId)
      .eq('is_preset', true)
      .single();

    if (fetchError || !presetCapsule) {
      throw new StyleCapsuleError('Preset capsule not found', 'PRESET_NOT_FOUND');
    }

    // Verify library ownership
    const { data: library, error: libraryError } = await supabase
      .from('style_capsule_libraries')
      .select('id')
      .eq('id', libraryId)
      .eq('user_id', userId)
      .single();

    if (libraryError || !library) {
      throw new StyleCapsuleError('Library not found or access denied', 'LIBRARY_ACCESS_DENIED');
    }

    // Create duplicate
    const duplicateName = newName || `${presetCapsule.name} (Copy)`;
    const { data, error } = await supabase
      .from('style_capsules')
      .insert({
        name: duplicateName,
        type: presetCapsule.type,
        library_id: libraryId,
        user_id: userId,
        example_text_excerpts: presetCapsule.example_text_excerpts,
        style_labels: presetCapsule.style_labels,
        negative_constraints: presetCapsule.negative_constraints,
        freeform_notes: presetCapsule.freeform_notes,
        design_pillars: presetCapsule.design_pillars,
        descriptor_strings: presetCapsule.descriptor_strings,
        reference_image_urls: presetCapsule.reference_image_urls,
        is_preset: false,
        is_favorite: false
      })
      .select()
      .single();

    if (error) {
      console.error('[StyleCapsuleService] Error duplicating capsule:', error);
      throw new StyleCapsuleError('Failed to duplicate capsule', 'DUPLICATE_ERROR');
    }

    return data;
  }

  /**
   * Format writing style capsule for prompt injection
   */
  formatWritingStyleInjection(capsule: StyleCapsule): string {
    if (capsule.type !== 'writing') {
      throw new StyleCapsuleError('Capsule is not a writing style capsule', 'INVALID_TYPE');
    }

    const parts: string[] = [];

    // Add example excerpts
    if (capsule.example_text_excerpts && capsule.example_text_excerpts.length > 0) {
      parts.push('Example excerpts:');
      capsule.example_text_excerpts.forEach(excerpt => {
        parts.push(`"${excerpt}"`);
      });
    }

    // Add style labels
    if (capsule.style_labels && capsule.style_labels.length > 0) {
      parts.push(`Style characteristics: ${capsule.style_labels.join(', ')}`);
    }

    // Add negative constraints
    if (capsule.negative_constraints && capsule.negative_constraints.length > 0) {
      parts.push(`Avoid: ${capsule.negative_constraints.join(', ')}`);
    }

    // Add freeform notes
    if (capsule.freeform_notes) {
      parts.push(`Additional notes: ${capsule.freeform_notes}`);
    }

    return parts.join('\n\n');
  }

  /**
   * Format visual style capsule for prompt injection
   */
  formatVisualStyleInjection(capsule: StyleCapsule): string {
    if (capsule.type !== 'visual') {
      throw new StyleCapsuleError('Capsule is not a visual style capsule', 'INVALID_TYPE');
    }

    const parts: string[] = [];

    // Add design pillars
    if (capsule.design_pillars) {
      const pillars = Object.entries(capsule.design_pillars)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      parts.push(`Design pillars: ${pillars}`);
    }

    // Add descriptor strings
    if (capsule.descriptor_strings) {
      parts.push(`Style description: ${capsule.descriptor_strings}`);
    }

    // Add reference image URLs (for context, though actual images are handled separately)
    if (capsule.reference_image_urls && capsule.reference_image_urls.length > 0) {
      parts.push(`Reference imagery available: ${capsule.reference_image_urls.length} image(s) provided`);
    }

    return parts.join('\n\n');
  }

  /**
   * Record style capsule application for audit trail
   */
  async recordApplication(application: StyleCapsuleApplication): Promise<void> {
    console.log(`[StyleCapsuleService] Recording capsule application for stage state ${application.stage_state_id}`);

    const { error } = await supabase
      .from('style_capsule_applications')
      .insert({
        stage_state_id: application.stage_state_id,
        style_capsule_id: application.style_capsule_id,
        applied_at: new Date().toISOString(),
        injection_context: application.injection_context
      });

    if (error) {
      console.error('[StyleCapsuleService] Error recording application:', error);
      // Don't throw here - application logging failure shouldn't break the main flow
    }
  }

  /**
   * Get all user libraries (their own + preset library)
   */
  async getUserLibraries(userId: string): Promise<StyleCapsuleLibrary[]> {
    console.log(`[StyleCapsuleService] Fetching libraries for user ${userId}`);

    const { data, error } = await supabase
      .from('style_capsule_libraries')
      .select(`
        id,
        user_id,
        name,
        description,
        is_preset,
        created_at,
        updated_at,
        style_capsules (
          id,
          name,
          type,
          is_preset
        )
      `)
      .or(`user_id.eq.${userId},is_preset.eq.true`)
      .order('is_preset', { ascending: false })
      .order('name');

    if (error) {
      console.error('[StyleCapsuleService] Error fetching libraries:', error);
      throw new StyleCapsuleError('Failed to fetch libraries', 'FETCH_ERROR');
    }

    return data || [];
  }

  /**
   * Create a new library for a user
   */
  async createLibrary(userId: string, name: string, description?: string): Promise<StyleCapsuleLibrary> {
    console.log(`[StyleCapsuleService] Creating library "${name}" for user ${userId}`);

    const { data, error } = await supabase
      .from('style_capsule_libraries')
      .insert({
        name,
        description,
        user_id: userId,
        is_preset: false
      })
      .select()
      .single();

    if (error) {
      console.error('[StyleCapsuleService] Error creating library:', error);
      throw new StyleCapsuleError('Failed to create library', 'CREATE_ERROR');
    }

    return data;
  }
}

export const styleCapsuleService = new StyleCapsuleService();