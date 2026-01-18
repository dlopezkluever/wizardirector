/**
 * Project Asset Service
 * Frontend API client for Stage 5 project-specific assets
 */

import { supabase } from '@/lib/supabase';
import type { ProjectAsset } from '@/types/asset';

export interface ExtractAssetsResponse {
  assets: ProjectAsset[];
  count: number;
}

export interface MergeAssetsRequest {
  sourceAssetId: string;
  targetAssetId: string;
  mergedDescription: string;
}

export interface CreateProjectAssetRequest {
  name: string;
  asset_type: 'character' | 'prop' | 'location';
  description: string;
  visual_style_capsule_id?: string;
}

export interface UpdateProjectAssetRequest {
  name?: string;
  description?: string;
  image_prompt?: string;
}

export interface ImageGenerationJobResponse {
  jobId: string;
  status: 'queued' | 'processing' | 'generating' | 'uploading' | 'completed' | 'failed';
  publicUrl?: string;
  error?: {
    code: string;
    message: string;
  };
}

class ProjectAssetService {
  /**
   * Extract assets from Stage 4 script using two-pass LLM
   */
  async extractAssets(projectId: string): Promise<ProjectAsset[]> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    console.log(`[ProjectAssetService] Extracting assets for project ${projectId}`);

    const response = await fetch(`/api/projects/${projectId}/assets/extract`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to extract assets');
    }

    return response.json();
  }

  /**
   * List all assets for a project
   */
  async listAssets(projectId: string, type?: 'character' | 'prop' | 'location'): Promise<ProjectAsset[]> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const params = new URLSearchParams();
    if (type) {
      params.append('type', type);
    }

    const response = await fetch(`/api/projects/${projectId}/assets?${params.toString()}`, {
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
   * Get a specific asset
   */
  async getAsset(projectId: string, assetId: string): Promise<ProjectAsset> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`/api/projects/${projectId}/assets/${assetId}`, {
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
   * Update an asset
   */
  async updateAsset(
    projectId: string,
    assetId: string,
    updates: UpdateProjectAssetRequest
  ): Promise<ProjectAsset> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`/api/projects/${projectId}/assets/${assetId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update asset');
    }

    return response.json();
  }

  /**
   * Delete an asset
   */
  async deleteAsset(projectId: string, assetId: string): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`/api/projects/${projectId}/assets/${assetId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete asset');
    }
  }

  /**
   * Merge two assets into one
   */
  async mergeAssets(projectId: string, request: MergeAssetsRequest): Promise<ProjectAsset> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`/api/projects/${projectId}/assets/merge`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to merge assets');
    }

    return response.json();
  }

  /**
   * Create a new asset manually
   */
  async createAsset(projectId: string, request: CreateProjectAssetRequest): Promise<ProjectAsset> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`/api/projects/${projectId}/assets`, {
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
   * Generate image key for an asset
   */
  async generateImage(projectId: string, assetId: string): Promise<ImageGenerationJobResponse> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    console.log(`[ProjectAssetService] Generating image for asset ${assetId}`);

    const response = await fetch(`/api/projects/${projectId}/assets/${assetId}/generate-image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate image');
    }

    const jobResponse = await response.json();

    // Poll for completion
    return this.pollImageJob(jobResponse.jobId, session.access_token);
  }

  /**
   * Poll image generation job until completion
   */
  private async pollImageJob(
    jobId: string,
    accessToken: string,
    maxAttempts: number = 60,
    intervalMs: number = 1000
  ): Promise<ImageGenerationJobResponse> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const response = await fetch(`/api/images/jobs/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch job status');
      }

      const job = await response.json();

      // Check terminal states
      if (job.status === 'completed') {
        console.log(`✅ [ProjectAssetService] Image generation completed`);
        return {
          jobId,
          status: 'completed',
          publicUrl: job.publicUrl,
        };
      }

      if (job.status === 'failed') {
        throw new Error(`Image generation failed: ${job.error?.message || 'Unknown error'}`);
      }

      // Still processing, wait and retry
      console.log(`⏳ [ProjectAssetService] Job ${jobId} status: ${job.status}`);
      await this.sleep(intervalMs);
    }

    throw new Error('Image generation timed out');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Lock an individual asset
   */
  async lockAsset(projectId: string, assetId: string): Promise<ProjectAsset> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`/api/projects/${projectId}/assets/${assetId}/lock`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to lock asset');
    }

    return response.json();
  }

  /**
   * Lock all assets (gatekeeper for Stage 6)
   */
  async lockAllAssets(projectId: string): Promise<{ message: string; lockedCount: number; totalCount: number }> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`/api/projects/${projectId}/assets/lock-all`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to lock all assets');
    }

    return response.json();
  }

  /**
   * Promote asset to global library
   */
  async promoteToGlobal(projectId: string, assetId: string): Promise<any> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`/api/projects/${projectId}/assets/${assetId}/promote`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to promote asset');
    }

    return response.json();
  }
}

export const projectAssetService = new ProjectAssetService();

