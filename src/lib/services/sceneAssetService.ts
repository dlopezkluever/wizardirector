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
  SceneAssetGenerationAttempt,
  MasterReferenceItem,
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

export interface ImageJobStatusResponse {
  jobId: string;
  status: string;
  publicUrl?: string;
  error?: { code?: string; message?: string; failureStage?: string };
  cost?: { estimated?: number; actual?: number };
  createdAt?: string;
  completedAt?: string;
}

class SceneAssetService {
  /**
   * Deterministic pre-population from scene expected_* dependencies.
   * Instant, no LLM — matches scene deps against project_assets by name.
   */
  async populateFromDependencies(
    projectId: string,
    sceneId: string
  ): Promise<{ instances: SceneAssetInstance[]; matched: number }> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(
      `/api/projects/${projectId}/scenes/${sceneId}/assets/populate-from-dependencies`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to populate from dependencies');
    }

    return response.json();
  }

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

  /**
   * Get status of a single image generation job (for polling)
   */
  async getImageJobStatus(jobId: string): Promise<ImageJobStatusResponse> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`/api/images/jobs/${jobId}`, {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch job status');
    }

    return response.json();
  }

  /**
   * Poll bulk image jobs until all are completed or failed (or timeout).
   * Updates statuses in place; optionally call onProgress(completed, total) each poll round.
   */
  async pollBulkImageJobs(
    statuses: Array<{ instanceId: string; jobId: string; status: string }>,
    options?: {
      pollIntervalMs?: number;
      maxAttempts?: number;
      onProgress?: (completed: number, total: number) => void;
    }
  ): Promise<void> {
    const pollIntervalMs = options?.pollIntervalMs ?? 2000;
    const maxAttempts = options?.maxAttempts ?? 60;
    const onProgress = options?.onProgress;

    const toPoll = statuses.filter(s => s.jobId && s.status !== 'completed' && s.status !== 'failed');
    if (toPoll.length === 0) return;

    let attempt = 0;
    while (attempt < maxAttempts) {
      const results = await Promise.all(
        toPoll.map(async (s) => {
          try {
            const job = await this.getImageJobStatus(s.jobId);
            return { ...s, status: job.status };
          } catch {
            return { ...s };
          }
        })
      );

      results.forEach((r, idx) => {
        const orig = toPoll[idx];
        if (orig) orig.status = r.status;
      });

      const completed = statuses.filter(s => s.status === 'completed' || s.status === 'failed').length;
      const total = statuses.length;
      onProgress?.(completed, total);

      const allDone = statuses.every(s => s.status === 'completed' || s.status === 'failed');
      if (allDone) break;

      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
      attempt++;
    }
  }
  // ===========================================================================
  // GENERATION ATTEMPTS (3B.1)
  // ===========================================================================

  /**
   * List all generation attempts for a scene asset instance
   */
  async listAttempts(
    projectId: string,
    sceneId: string,
    instanceId: string
  ): Promise<SceneAssetGenerationAttempt[]> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(
      `/api/projects/${projectId}/scenes/${sceneId}/assets/${instanceId}/attempts`,
      {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch attempts');
    }

    return response.json();
  }

  /**
   * Select an attempt as the active image
   */
  async selectAttempt(
    projectId: string,
    sceneId: string,
    instanceId: string,
    attemptId: string
  ): Promise<SceneAssetGenerationAttempt> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(
      `/api/projects/${projectId}/scenes/${sceneId}/assets/${instanceId}/attempts/${attemptId}/select`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to select attempt');
    }

    return response.json();
  }

  /**
   * Delete a non-selected attempt
   */
  async deleteAttempt(
    projectId: string,
    sceneId: string,
    instanceId: string,
    attemptId: string
  ): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(
      `/api/projects/${projectId}/scenes/${sceneId}/assets/${instanceId}/attempts/${attemptId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete attempt');
    }
  }

  // ===========================================================================
  // USE MASTER AS-IS (3B.4)
  // ===========================================================================

  /**
   * Toggle "use master as-is" for a single instance
   */
  async setUseMasterAsIs(
    projectId: string,
    sceneId: string,
    instanceId: string,
    enabled: boolean
  ): Promise<SceneAssetInstance> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(
      `/api/projects/${projectId}/scenes/${sceneId}/assets/${instanceId}/use-master-as-is`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to set use master as-is');
    }

    return response.json();
  }

  /**
   * Bulk toggle "use master as-is" for multiple instances
   */
  async bulkUseMasterAsIs(
    projectId: string,
    sceneId: string,
    instanceIds: string[],
    enabled: boolean
  ): Promise<{ results: Array<{ instanceId: string; success: boolean; error?: string }> }> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(
      `/api/projects/${projectId}/scenes/${sceneId}/assets/bulk-use-master-as-is`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ instanceIds, enabled }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to bulk set use master as-is');
    }

    return response.json();
  }

  // ===========================================================================
  // MASTER REFERENCE CHAIN (3B.2)
  // ===========================================================================

  /**
   * Get the master reference chain for a scene asset instance
   */
  async getReferenceChain(
    projectId: string,
    sceneId: string,
    instanceId: string
  ): Promise<MasterReferenceItem[]> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(
      `/api/projects/${projectId}/scenes/${sceneId}/assets/${instanceId}/reference-chain`,
      {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch reference chain');
    }

    return response.json();
  }

  /**
   * Select a master reference from the chain
   */
  async selectMasterReference(
    projectId: string,
    sceneId: string,
    instanceId: string,
    item: MasterReferenceItem
  ): Promise<SceneAssetInstance> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(
      `/api/projects/${projectId}/scenes/${sceneId}/assets/${instanceId}/select-master-reference`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source: item.source,
          instanceId: item.instanceId,
          imageUrl: item.imageUrl,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to select master reference');
    }

    return response.json();
  }

  // ===========================================================================
  // IMAGE UPLOAD (3B.3)
  // ===========================================================================

  /**
   * Upload a custom image for a scene asset instance
   */
  async uploadSceneAssetImage(
    projectId: string,
    sceneId: string,
    instanceId: string,
    file: File
  ): Promise<SceneAssetInstance> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(
      `/api/projects/${projectId}/scenes/${sceneId}/assets/${instanceId}/upload-image`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to upload image');
    }

    return response.json();
  }
}

export const sceneAssetService = new SceneAssetService();
