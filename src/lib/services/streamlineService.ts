import { supabase } from '../supabase';
import type { StageState, BackendStageStatus, BackendStageOrigin } from './stageStateService';

export type StageTransition =
  | 'skip'
  | 'locked'
  | { status: BackendStageStatus; content: Record<string, unknown>; origin?: BackendStageOrigin; regenerationGuidance?: string };

export interface StreamlineCommitRequest {
  stageTransitions: Record<string, StageTransition>;
  projectConfig?: Record<string, unknown>;
  stage1Draft?: { content: Record<string, unknown>; origin?: BackendStageOrigin; regenerationGuidance?: string };
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

export interface StreamlineAssetDraft {
  name: string;
  type: 'character' | 'prop' | 'location';
  description: string;
}

export interface StreamlineExtractFileResult {
  filename: string;
  text: string;
  classification: StreamlineClassification;
  /** Only present when classification.type === 'character_notes' (Task 3.5). */
  assetDraft?: StreamlineAssetDraft;
}

export interface StreamlineFormatFileResult {
  targetType: 'treatment' | 'beat_sheet';
  treatment?: string;
  beats?: Array<{ id: string; order: number; text: string; rationale?: string; estimatedScreenTimeSeconds: number }>;
  totalEstimatedRuntime?: number;
}

export interface StreamlineClassifyImageResult {
  imageUrl: string;
  filename: string;
  classification: StreamlineAssetDraft & { confidence: number };
}

export type StreamlineQuestionCategory = 'contradiction' | 'vague_trait' | 'ambiguous_structure' | 'missing_info';

export interface StreamlineQuestion {
  id: string;
  category: StreamlineQuestionCategory;
  questionText: string;
  options: Array<{ id: string; label: string }>;
  subjectEntityType?: string;
  subjectEntityName?: string;
  conflictingSources?: string[];
}

export interface StreamlineAnalyzeRequestFile {
  id: string;
  name: string;
  text: string;
  isPrimary: boolean;
}

export type StreamlineEditScope = 'word_patch' | 'paragraph_rewrite' | 'structural_cascade';

export interface StreamlineReconciledDocument {
  fileId: string;
  fileName: string;
  editScope: StreamlineEditScope;
  reconciledText: string;
  diffSummary: string;
}

export interface StreamlineQAPair {
  questionText: string;
  selectedAnswer: string;
  subjectEntityName?: string;
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

  /**
   * "AI-format" per-file choice (Task 3.1/3.3) — reformats a submitted
   * file's text into the target stage's structure. Never called for scripts.
   */
  async formatFile(projectId: string, text: string, targetType: 'treatment' | 'beat_sheet'): Promise<StreamlineFormatFileResult> {
    const headers = await authHeaders();

    const response = await fetch(`/api/projects/${projectId}/streamline/format-file`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ text, targetType }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to reformat file');
    }

    return response.json();
  }

  /**
   * Uploads + classifies one image for the batch image review grid (Task 3.6).
   */
  async classifyImage(projectId: string, file: File): Promise<StreamlineClassifyImageResult> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`/api/projects/${projectId}/streamline/classify-image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Failed to classify image ${file.name}`);
    }

    return response.json();
  }

  /**
   * Ask Auteur question generation (Task 4.2) — call only once full-batch
   * classification has settled (StreamlineDropZone's onBatchSettled signal).
   */
  async analyze(projectId: string, files: StreamlineAnalyzeRequestFile[]): Promise<{ questions: StreamlineQuestion[] }> {
    const headers = await authHeaders();

    const response = await fetch(`/api/projects/${projectId}/streamline/analyze`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ files }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to analyze submitted material');
    }

    return response.json();
  }

  /**
   * Reconciliation pass (Task 4.4) — takes the accumulated Q&A transcript,
   * returns reconciled document text + diff summaries + edit_scope.
   */
  async reconcile(
    projectId: string,
    files: StreamlineAnalyzeRequestFile[],
    qaPairs: StreamlineQAPair[]
  ): Promise<{ reconciledDocuments: StreamlineReconciledDocument[] }> {
    const headers = await authHeaders();

    const response = await fetch(`/api/projects/${projectId}/streamline/reconcile`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ files, qaPairs }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to reconcile documents');
    }

    return response.json();
  }
}

export const streamlineService = new StreamlineService();
