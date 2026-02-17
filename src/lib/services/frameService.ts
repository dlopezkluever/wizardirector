/**
 * Frame Service
 * Frontend API client for Stage 10 frame generation (CRUD, generate, approve, inpaint).
 * Use with React Query: useQuery for fetch, useMutation for actions.
 */

import { supabase } from '@/lib/supabase';
import type {
  Frame,
  ShotWithFrames,
  FrameCostSummary,
  FrameJobStatus,
  GenerationMode,
} from '@/types/scene';

export interface FetchFramesResponse {
  shots: ShotWithFrames[];
  sceneNumber: number;
  costSummary: FrameCostSummary;
  allFramesApproved: boolean;
}

export interface GenerateFramesRequest {
  mode: GenerationMode;
  shotIds?: string[];
  startOnly?: boolean;
}

export interface GenerateFramesResponse {
  success: boolean;
  jobsCreated: number;
  shots: ShotWithFrames[];
}

export interface FrameActionResponse {
  success: boolean;
  frame: Frame;
}

export interface InpaintRequest {
  maskDataUrl: string;
  prompt: string;
}

class FrameService {
  private async getAuthHeaders(): Promise<HeadersInit> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }
    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Fetch all frames for a scene with shot context
   */
  async fetchFrames(projectId: string, sceneId: string): Promise<FetchFramesResponse> {
    const headers = await this.getAuthHeaders();

    const response = await fetch(
      `/api/projects/${projectId}/scenes/${sceneId}/frames`,
      { headers }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch frames');
    }

    return response.json();
  }

  /**
   * Generate frames for a scene
   */
  async generateFrames(
    projectId: string,
    sceneId: string,
    request: GenerateFramesRequest
  ): Promise<GenerateFramesResponse> {
    const headers = await this.getAuthHeaders();

    const response = await fetch(
      `/api/projects/${projectId}/scenes/${sceneId}/generate-frames`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate frames');
    }

    return response.json();
  }

  /**
   * Approve a frame
   */
  async approveFrame(
    projectId: string,
    sceneId: string,
    frameId: string
  ): Promise<FrameActionResponse> {
    const headers = await this.getAuthHeaders();

    const response = await fetch(
      `/api/projects/${projectId}/scenes/${sceneId}/frames/${frameId}/approve`,
      {
        method: 'PUT',
        headers,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to approve frame');
    }

    return response.json();
  }

  /**
   * Reject a frame
   */
  async rejectFrame(
    projectId: string,
    sceneId: string,
    frameId: string
  ): Promise<FrameActionResponse> {
    const headers = await this.getAuthHeaders();

    const response = await fetch(
      `/api/projects/${projectId}/scenes/${sceneId}/frames/${frameId}/reject`,
      {
        method: 'PUT',
        headers,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to reject frame');
    }

    return response.json();
  }

  /**
   * Regenerate a frame
   */
  async regenerateFrame(
    projectId: string,
    sceneId: string,
    frameId: string
  ): Promise<FrameActionResponse> {
    const headers = await this.getAuthHeaders();

    const response = await fetch(
      `/api/projects/${projectId}/scenes/${sceneId}/frames/${frameId}/regenerate`,
      {
        method: 'POST',
        headers,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to regenerate frame');
    }

    return response.json();
  }

  /**
   * Inpaint a frame with mask
   */
  async inpaintFrame(
    projectId: string,
    sceneId: string,
    frameId: string,
    request: InpaintRequest
  ): Promise<FrameActionResponse> {
    const headers = await this.getAuthHeaders();

    const response = await fetch(
      `/api/projects/${projectId}/scenes/${sceneId}/frames/${frameId}/inpaint`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to inpaint frame');
    }

    return response.json();
  }

  /**
   * Generate an end frame prompt for a shot using LLM
   */
  async generateEndFramePrompt(
    projectId: string,
    sceneId: string,
    shotId: string
  ): Promise<{ endFramePrompt: string }> {
    const headers = await this.getAuthHeaders();

    const response = await fetch(
      `/api/projects/${projectId}/scenes/${sceneId}/shots/${shotId}/generate-end-frame-prompt`,
      {
        method: 'POST',
        headers,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate end frame prompt');
    }

    return response.json();
  }

  /**
   * Save/update an end frame prompt for a shot
   */
  async saveEndFramePrompt(
    projectId: string,
    sceneId: string,
    shotId: string,
    endFramePrompt: string
  ): Promise<{ success: boolean }> {
    const headers = await this.getAuthHeaders();

    const response = await fetch(
      `/api/projects/${projectId}/scenes/${sceneId}/shots/${shotId}/end-frame-prompt`,
      {
        method: 'PUT',
        headers,
        body: JSON.stringify({ endFramePrompt }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save end frame prompt');
    }

    return response.json();
  }

  /**
   * Poll for frame job status
   */
  async pollFrameStatus(
    projectId: string,
    sceneId: string,
    frameId: string
  ): Promise<FrameJobStatus> {
    const headers = await this.getAuthHeaders();

    const response = await fetch(
      `/api/projects/${projectId}/scenes/${sceneId}/frames/${frameId}/status`,
      { headers }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get frame status');
    }

    return response.json();
  }

  /**
   * Poll multiple frames until all are complete or failed
   * Returns updated shots with frames
   */
  async pollUntilComplete(
    projectId: string,
    sceneId: string,
    frameIds: string[],
    onProgress?: (completed: number, total: number) => void,
    maxPolls = 120,
    intervalMs = 2000
  ): Promise<FetchFramesResponse> {
    let polls = 0;
    const completedFrames = new Set<string>();

    while (polls < maxPolls && completedFrames.size < frameIds.length) {
      await this.sleep(intervalMs);
      polls++;

      // Check status of incomplete frames
      const pendingFrames = frameIds.filter(id => !completedFrames.has(id));

      for (const frameId of pendingFrames) {
        try {
          const status = await this.pollFrameStatus(projectId, sceneId, frameId);

          if (status.status === 'completed' || status.status === 'failed') {
            completedFrames.add(frameId);

            if (onProgress) {
              onProgress(completedFrames.size, frameIds.length);
            }
          }
        } catch (error) {
          // Frame might not have an active job, mark as complete
          completedFrames.add(frameId);
        }
      }
    }

    // Return final state
    return this.fetchFrames(projectId, sceneId);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get all generating frame IDs from shots
   */
  getGeneratingFrameIds(shots: ShotWithFrames[]): string[] {
    const ids: string[] = [];

    for (const shot of shots) {
      if (shot.startFrame?.status === 'generating') {
        ids.push(shot.startFrame.id);
      }
      if (shot.endFrame?.status === 'generating') {
        ids.push(shot.endFrame.id);
      }
    }

    return ids;
  }

  /**
   * Calculate progress stats from shots
   */
  calculateProgress(shots: ShotWithFrames[]): {
    totalFrames: number;
    approvedFrames: number;
    generatedFrames: number;
    generatingFrames: number;
    pendingFrames: number;
    rejectedFrames: number;
  } {
    let totalFrames = 0;
    let approvedFrames = 0;
    let generatedFrames = 0;
    let generatingFrames = 0;
    let pendingFrames = 0;
    let rejectedFrames = 0;

    for (const shot of shots) {
      // Count start frame
      totalFrames++;
      if (shot.startFrame) {
        switch (shot.startFrame.status) {
          case 'approved':
            approvedFrames++;
            break;
          case 'generated':
            generatedFrames++;
            break;
          case 'generating':
            generatingFrames++;
            break;
          case 'rejected':
            rejectedFrames++;
            break;
          default:
            pendingFrames++;
        }
      } else {
        pendingFrames++;
      }

      // Count end frame if required
      if (shot.requiresEndFrame) {
        totalFrames++;
        if (shot.endFrame) {
          switch (shot.endFrame.status) {
            case 'approved':
              approvedFrames++;
              break;
            case 'generated':
              generatedFrames++;
              break;
            case 'generating':
              generatingFrames++;
              break;
            case 'rejected':
              rejectedFrames++;
              break;
            default:
              pendingFrames++;
          }
        } else {
          pendingFrames++;
        }
      }
    }

    return {
      totalFrames,
      approvedFrames,
      generatedFrames,
      generatingFrames,
      pendingFrames,
      rejectedFrames,
    };
  }
}

export const frameService = new FrameService();
