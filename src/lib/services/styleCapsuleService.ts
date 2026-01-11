import { supabase } from '@/lib/supabase';
import type {
  StyleCapsule,
  StyleCapsuleCreate,
  StyleCapsuleUpdate,
  StyleCapsuleListResponse,
  StyleCapsuleResponse,
  StyleCapsuleLibrary,
  StyleCapsuleLibraryListResponse,
  StyleCapsuleLibraryResponse
} from '@/types/styleCapsule';

export interface DuplicateCapsuleRequest {
  libraryId: string;
  newName?: string;
}

export interface CreateLibraryRequest {
  name: string;
  description?: string;
}

class StyleCapsuleService {
  /**
   * Get all accessible style capsules for the current user
   */
  async getCapsules(): Promise<StyleCapsule[]> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch('/api/style-capsules', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch style capsules');
    }

    const result: StyleCapsuleListResponse = await response.json();
    return result.data;
  }

  /**
   * Get a single style capsule by ID
   */
  async getCapsule(capsuleId: string): Promise<StyleCapsule> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`/api/style-capsules/${capsuleId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch style capsule');
    }

    const result: StyleCapsuleResponse = await response.json();
    return result.data;
  }

  /**
   * Create a new style capsule
   */
  async createCapsule(capsuleData: StyleCapsuleCreate): Promise<StyleCapsule> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch('/api/style-capsules', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(capsuleData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create style capsule');
    }

    const result: StyleCapsuleResponse = await response.json();
    return result.data;
  }

  /**
   * Update an existing style capsule
   */
  async updateCapsule(capsuleId: string, updates: StyleCapsuleUpdate): Promise<StyleCapsule> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`/api/style-capsules/${capsuleId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update style capsule');
    }

    const result: StyleCapsuleResponse = await response.json();
    return result.data;
  }

  /**
   * Delete a style capsule
   */
  async deleteCapsule(capsuleId: string): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`/api/style-capsules/${capsuleId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete style capsule');
    }
  }

  /**
   * Toggle favorite status of a capsule
   */
  async toggleFavorite(capsuleId: string): Promise<StyleCapsule> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`/api/style-capsules/${capsuleId}/favorite`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to toggle favorite status');
    }

    const result: StyleCapsuleResponse = await response.json();
    return result.data;
  }

  /**
   * Duplicate a preset capsule to user's library
   */
  async duplicateCapsule(capsuleId: string, request: DuplicateCapsuleRequest): Promise<StyleCapsule> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`/api/style-capsules/${capsuleId}/duplicate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to duplicate capsule');
    }

    const result: StyleCapsuleResponse = await response.json();
    return result.data;
  }

  /**
   * Upload a reference image for a visual style capsule
   */
  async uploadImage(capsuleId: string, imageFile: File): Promise<StyleCapsule> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const formData = new FormData();
    formData.append('image', imageFile);

    const response = await fetch(`/api/style-capsules/${capsuleId}/upload-image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to upload image');
    }

    const result: StyleCapsuleResponse = await response.json();
    return result.data;
  }

  /**
   * Remove a reference image from a visual style capsule
   */
  async removeImage(capsuleId: string, imageIndex: number): Promise<StyleCapsule> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`/api/style-capsules/${capsuleId}/images/${imageIndex}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to remove image');
    }

    const result: StyleCapsuleResponse = await response.json();
    return result.data;
  }

  /**
   * Get all user libraries
   */
  async getLibraries(): Promise<StyleCapsuleLibrary[]> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch('/api/style-capsules/libraries/all', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch libraries');
    }

    const result: StyleCapsuleLibraryListResponse = await response.json();
    return result.data;
  }

  /**
   * Create a new library
   */
  async createLibrary(request: CreateLibraryRequest): Promise<StyleCapsuleLibrary> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch('/api/style-capsules/libraries', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create library');
    }

    const result: StyleCapsuleLibraryResponse = await response.json();
    return result.data;
  }
}

export const styleCapsuleService = new StyleCapsuleService();
