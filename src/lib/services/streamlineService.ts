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

/** File-type classification — Phase 2 always returns the 'unclassified' stub; Phase 3 fills this in for real. */
export type StreamlineFileType = 'script' | 'treatment' | 'beat_sheet' | 'character_notes' | 'unclassified';

export interface StreamlineClassification {
  type: StreamlineFileType;
  confidence: number;
}

export interface StreamlineExtractFileResult {
  filename: string;
  text: string;
  classification: StreamlineClassification;
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

  /**
   * Server-side text extraction for one uploaded file (spec §2.7) — PDF,
   * DOCX, RTF, TXT, MD. One file per call so a batch's per-file
   * extract/retry/drop can be independent (partial-success handling).
   */
  async extractFile(projectId: string, file: File): Promise<StreamlineExtractFileResult> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`/api/projects/${projectId}/streamline/extract-file`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Failed to extract text from ${file.name}`);
    }

    return response.json();
  }
}

export const streamlineService = new StreamlineService();
