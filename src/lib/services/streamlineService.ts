import { supabase } from '../supabase';
import type { StageState, BackendStageStatus, BackendStageOrigin } from './stageStateService';

export type StageTransition =
  | 'skip'
  | 'locked'
  | { status: BackendStageStatus; content: Record<string, unknown>; origin?: BackendStageOrigin; regenerationGuidance?: string };

export interface StreamlineCommitRequest {
  stageTransitions: Record<string, StageTransition>;
  assets?: Array<Record<string, unknown>>;
  resolutions?: Array<Record<string, unknown>>;
  resolutionEdits?: Array<Record<string, unknown>>;
}

export interface StreamlineCommitResult {
  success: boolean;
  project_id: string;
  branch_id: string;
  stages: Array<{ stage_number: number; id: string; version: number; status: string; origin: string | null }>;
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('User not authenticated');
  }
  return {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  };
}

class StreamlineService {
  /**
   * Atomic commit — applies stage transitions (and, in later phases, assets /
   * Ask Auteur resolutions) in one transaction via the streamline_commit RPC.
   */
  async commit(projectId: string, request: StreamlineCommitRequest): Promise<StreamlineCommitResult> {
    const headers = await authHeaders();

    const response = await fetch(`/api/projects/${projectId}/streamline/commit`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to commit Streamline intake');
    }

    return response.json();
  }

  /**
   * "Generate from script" — backfills a skipped Stage 2 or 3 from the locked
   * Stage 4 script, locking it directly with origin 'ai-generated'.
   */
  async backfillStage(projectId: string, stageNumber: number): Promise<StageState> {
    const headers = await authHeaders();

    const response = await fetch(`/api/projects/${projectId}/streamline/backfill/${stageNumber}`, {
      method: 'POST',
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate content from script');
    }

    return response.json();
  }
}

export const streamlineService = new StreamlineService();
