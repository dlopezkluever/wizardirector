/**
 * Project Asset Service
 * Frontend API client for Stage 5 project-specific assets
 */

import { supabase } from '@/lib/supabase';
import type { ProjectAsset, CloneAssetRequest, AssetVersionStatus, AssetPreviewResponse, AssetType, AssetDecision, ProjectAssetGenerationAttempt } from '@/types/asset';

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
  deferred?: boolean;
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
   * Instant preview of entities extracted from scene dependencies (no LLM).
   */
  async extractPreview(projectId: string): Promise<AssetPreviewResponse> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`/api/projects/${projectId}/assets/extract-preview`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to preview assets');
    }

    return response.json();
  }

  /**
   * Confirm extraction: run LLM Pass 2 only for user-selected entities.
   */
  async extractConfirm(
    projectId: string,
    selectedEntities: Array<{ name: string; type: AssetType; decision?: AssetDecision; sceneNumbers?: number[] }>
  ): Promise<ProjectAsset[]> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`/api/projects/${projectId}/assets/extract-confirm`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ selectedEntities }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to confirm asset extraction');
    }

    return response.json();
  }

  /**
   * @deprecated Use extractPreview() + extractConfirm() for two-pass flow.
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
   * Upload image for a project asset
   */
  async uploadImage(projectId: string, assetId: string, imageFile: File): Promise<ProjectAsset> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const formData = new FormData();
    formData.append('image', imageFile);

    const response = await fetch(`/api/projects/${projectId}/assets/${assetId}/upload-image`, {
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

  /**
   * Clone/inherit a global asset into the project
   */
  async cloneFromGlobal(
    projectId: string,
    globalAssetId: string,
    options?: {
      overrideDescription?: string;
      targetBranchId?: string;
      matchWithAssetId?: string;
      descriptionStrategy?: 'global' | 'project' | 'merge';
      regenerateImage?: boolean;
      nameStrategy?: 'project' | 'global' | 'custom';
      customName?: string;
    }
  ): Promise<ProjectAsset> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const requestBody: CloneAssetRequest = {
      globalAssetId,
      overrideDescription: options?.overrideDescription,
      target_branch_id: options?.targetBranchId,
      matchWithAssetId: options?.matchWithAssetId,
      descriptionStrategy: options?.descriptionStrategy,
      regenerateImage: options?.regenerateImage,
      nameStrategy: options?.nameStrategy,
      customName: options?.customName,
    };

    const response = await fetch(`/api/projects/${projectId}/assets/clone-from-global`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || error.message || 'Failed to clone asset from global library');
    }

    return response.json();
  }

  /**
   * Check version sync status for project assets
   */
  async checkVersionSync(projectId: string): Promise<{
    outdated: AssetVersionStatus[];
  }> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`/api/projects/${projectId}/assets/version-sync-status`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to check version sync status');
    }

    return response.json();
  }

  /**
   * Defer an asset (mark as not required for Stage 5 completion)
   */
  async deferAsset(projectId: string, assetId: string): Promise<ProjectAsset> {
    return this.updateAsset(projectId, assetId, { deferred: true });
  }

  /**
   * Restore a deferred asset back to active
   */
  async restoreAsset(projectId: string, assetId: string): Promise<ProjectAsset> {
    return this.updateAsset(projectId, assetId, { deferred: false });
  }

  /**
   * List generation attempts for a project asset
   */
  async listAttempts(projectId: string, assetId: string): Promise<ProjectAssetGenerationAttempt[]> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`/api/projects/${projectId}/assets/${assetId}/attempts`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to list attempts');
    }

    return response.json();
  }

  /**
   * Select a specific generation attempt as the active image
   */
  async selectAttempt(projectId: string, assetId: string, attemptId: string): Promise<ProjectAssetGenerationAttempt> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`/api/projects/${projectId}/assets/${assetId}/attempts/${attemptId}/select`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to select attempt');
    }

    return response.json();
  }

  /**
   * Delete a generation attempt
   */
  async deleteAttempt(projectId: string, assetId: string, attemptId: string): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`/api/projects/${projectId}/assets/${assetId}/attempts/${attemptId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete attempt');
    }
  }

  /**
   * Sync project asset with latest version from global library
   */
  async syncFromGlobal(projectId: string, assetId: string): Promise<ProjectAsset> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`/api/projects/${projectId}/assets/${assetId}/sync-from-global`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || error.message || 'Failed to sync asset from global library');
    }

    return response.json();
  }
}

export const projectAssetService = new ProjectAssetService();

