import { supabase } from '@/lib/supabase';

export type StageLockStatus = 'draft' | 'locked' | 'outdated';

export interface StageLockEntry {
  status: StageLockStatus;
  locked_at?: string;
}

export type StageLocks = Record<string, StageLockEntry>;

export interface UnlockImpact {
  stage: number;
  downstreamStages: number[];
  framesAffected: number;
  videosAffected: number;
  estimatedCost: string;
  message: string;
}

export interface LockResult {
  success: boolean;
  stageLocks: StageLocks;
}

export interface UnlockResult {
  success: boolean;
  stageLocks: StageLocks;
  invalidated: {
    downstreamStages: number[];
    framesAffected: number;
    videosAffected: number;
  };
}

class SceneStageLockService {
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

  async getStageLocks(projectId: string, sceneId: string): Promise<StageLocks> {
    const headers = await this.getAuthHeaders();

    const response = await fetch(
      `/api/projects/${projectId}/scenes/${sceneId}/stage-locks`,
      { headers }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch stage locks');
    }

    const result = await response.json();
    return result.stageLocks;
  }

  async lockStage(projectId: string, sceneId: string, stageNumber: number): Promise<LockResult> {
    const headers = await this.getAuthHeaders();

    const response = await fetch(
      `/api/projects/${projectId}/scenes/${sceneId}/stage-locks/${stageNumber}/lock`,
      { method: 'POST', headers }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to lock stage');
    }

    return response.json();
  }

  /**
   * Two-phase unlock:
   * - Without confirm: returns impact assessment (throws with details)
   * - With confirm=true: executes unlock + cascade
   */
  async unlockStage(
    projectId: string,
    sceneId: string,
    stageNumber: number,
    confirm = false
  ): Promise<UnlockResult | UnlockImpact> {
    const headers = await this.getAuthHeaders();

    const response = await fetch(
      `/api/projects/${projectId}/scenes/${sceneId}/stage-locks/${stageNumber}/unlock`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ confirm }),
      }
    );

    const result = await response.json();

    if (response.status === 409 && result.requiresConfirmation) {
      // Return impact assessment for the dialog
      return result.details as UnlockImpact;
    }

    if (!response.ok) {
      throw new Error(result.error || 'Failed to unlock stage');
    }

    return result as UnlockResult;
  }

  async relockStage(projectId: string, sceneId: string, stageNumber: number): Promise<LockResult> {
    const headers = await this.getAuthHeaders();

    const response = await fetch(
      `/api/projects/${projectId}/scenes/${sceneId}/stage-locks/${stageNumber}/relock`,
      { method: 'POST', headers }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to re-lock stage');
    }

    return response.json();
  }
}

export const sceneStageLockService = new SceneStageLockService();
