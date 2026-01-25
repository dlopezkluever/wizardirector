import { supabase } from '@/lib/supabase';
import type {
  GlobalAsset,
  CreateAssetRequest,
  UpdateAssetRequest,
  AssetFilter,
  DeleteAssetError
} from '@/types/asset';

export interface ImageJobResponse {
  jobId: string;
  status: string;
  estimatedCost?: number;
}

export interface ImageJobStatus {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  publicUrl?: string;
  error?: {
    code: string;
    message: string;
    failureStage?: string;
  };
  cost?: {
    estimated?: number;
    actual?: number;
  };
  createdAt: string;
  completedAt?: string;
}

class AssetService {
  /**
   * List all global assets with optional filtering
   */
  async listAssets(filter?: AssetFilter): Promise<GlobalAsset[]> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const params = new URLSearchParams();
    if (filter?.type) {
      params.append('type', filter.type);
    }
    if (filter?.searchQuery) {
      params.append('search', filter.searchQuery);
    }
    if (filter?.hasImage !== undefined) {
      params.append('has_image', String(filter.hasImage));
    }

    const response = await fetch(`/api/assets?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch assets');
    }

    return response.json();
  }

  /**
   * Get a specific asset by ID
   */
  async getAsset(id: string): Promise<GlobalAsset> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`/api/assets/${id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch asset');
    }

    return response.json();
  }

  /**
   * Create a new global asset
   */
  async createAsset(request: CreateAssetRequest): Promise<GlobalAsset> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch('/api/assets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create asset');
    }

    return response.json();
  }

  /**
   * Update an existing asset
   */
  async updateAsset(id: string, request: UpdateAssetRequest): Promise<GlobalAsset> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`/api/assets/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update asset');
    }

    return response.json();
  }

  /**
   * Delete an asset (will fail if asset is in use)
   */
  async deleteAsset(id: string): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`/api/assets/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json() as DeleteAssetError;
      
      // If asset is in use, throw error with project details
      if (response.status === 409 && error.projects) {
        const projectTitles = error.projects.map(p => p.title).join(', ');
        throw new Error(`Cannot delete asset: currently used in projects: ${projectTitles}`);
      }
      
      throw new Error(error.error || 'Failed to delete asset');
    }
  }

  /**
   * Generate or regenerate image key for a global asset
   */
  async generateImageKey(
    assetId: string,
    prompt?: string,
    visualStyleCapsuleId?: string
  ): Promise<ImageJobResponse> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`/api/assets/${assetId}/generate-image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        visualStyleCapsuleId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || error.message || 'Failed to generate image');
    }

    return response.json();
  }

  /**
   * Check the status of an image generation job
   */
  async checkImageJobStatus(jobId: string): Promise<ImageJobStatus> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`/api/images/jobs/${jobId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to check job status');
    }

    return response.json();
  }

  /**
   * Upload an image for a global asset
   */
  async uploadImage(assetId: string, imageFile: File): Promise<GlobalAsset> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const formData = new FormData();
    formData.append('image', imageFile);

    const response = await fetch(`/api/assets/${assetId}/upload-image`, {
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

    return response.json();
  }
}

export const assetService = new AssetService();

