/**
 * Scene Asset Service
 * Frontend API client for Stage 8 scene asset instances (CRUD, inherit, detect-relevance, generate-image).
 * Use with React Query: useQuery for list, useMutation for create/update/delete/inherit/generate-image.
 */

import { supabase } from '@/lib/supabase';
import type {
  SceneAssetInstance,
  CreateSceneAssetInstanceRequest,
  UpdateSceneAssetInstanceRequest,
  SceneAssetRelevanceResult,
} from '@/types/scene';

export interface BulkImageGenerationRequest {
  instanceIds: string[];
}

export interface BulkImageGenerationResult {
  jobId: string;
  totalJobs: number;
  statuses: Array<{
    instanceId: string;
    jobId: string;
    status: 'queued' | 'processing' | 'completed' | 'failed';
  }>;
}

class SceneAssetService {
  /**
   * List all asset instances for a scene
   */
  async listSceneAssets(projectId: string, sceneId: string): Promise<SceneAssetInstance[]> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(
      `/api/projects/${projectId}/scenes/${sceneId}/assets`,
      {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch scene assets');
    }

    return response.json();
  }

  /**
   * Create a new scene asset instance
   */
  async createSceneAsset(
    projectId: string,
    request: CreateSceneAssetInstanceRequest
  ): Promise<SceneAssetInstance> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(
      `/api/projects/${projectId}/scenes/${request.sceneId}/assets`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectAssetId: request.projectAssetId,
          descriptionOverride: request.descriptionOverride,
          statusTags: request.statusTags,
          carryForward: request.carryForward,
          inheritedFromInstanceId: request.inheritedFromInstanceId,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create scene asset');
    }

    return response.json();
  }

  /**
   * Update scene asset instance
   */
  async updateSceneAsset(
    projectId: string,
    sceneId: string,
    instanceId: string,
    updates: UpdateSceneAssetInstanceRequest
  ): Promise<SceneAssetInstance> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(
      `/api/projects/${projectId}/scenes/${sceneId}/assets/${instanceId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update scene asset');
    }

    return response.json();
  }

  /**
   * Delete scene asset instance
   */
  async deleteSceneAsset(
    projectId: string,
    sceneId: string,
    instanceId: string
  ): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(
      `/api/projects/${projectId}/scenes/${sceneId}/assets/${instanceId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete scene asset');
    }
  }

  /**
   * Trigger asset inheritance from prior scene
   */
  async inheritAssets(projectId: string, sceneId: string): Promise<{ count: number }> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(
      `/api/projects/${projectId}/scenes/${sceneId}/assets/inherit`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to inherit assets');
    }

    return response.json();
  }

  /**
   * Detect relevant assets using AI
   */
  async detectRelevantAssets(
    projectId: string,
    sceneId: string
  ): Promise<SceneAssetRelevanceResult> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(
      `/api/projects/${projectId}/scenes/${sceneId}/assets/detect-relevance`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to detect relevant assets');
    }

    return response.json();
  }

  /**
   * Generate image for single scene asset instance
   */
  async generateSceneAssetImage(
    projectId: string,
    sceneId: string,
    instanceId: string
  ): Promise<{ jobId: string; status: string }> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(
      `/api/projects/${projectId}/scenes/${sceneId}/assets/${instanceId}/generate-image`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate image');
    }

    return response.json();
  }

  /**
   * Bulk generate images for multiple scene asset instances
   */
  async bulkGenerateImages(
    projectId: string,
    sceneId: string,
    instanceIds: string[]
  ): Promise<BulkImageGenerationResult> {
    const results = await Promise.allSettled(
      instanceIds.map(id => this.generateSceneAssetImage(projectId, sceneId, id))
    );

    const statuses = results.map((result, idx) => {
      if (result.status === 'fulfilled') {
        return {
          instanceId: instanceIds[idx],
          jobId: result.value.jobId,
          status: result.value.status as 'queued' | 'processing' | 'completed' | 'failed',
        };
      } else {
        return {
          instanceId: instanceIds[idx],
          jobId: '',
          status: 'failed' as const,
        };
      }
    });

    return {
      jobId: `bulk-${Date.now()}`,
      totalJobs: instanceIds.length,
      statuses,
    };
  }
}

export const sceneAssetService = new SceneAssetService();
