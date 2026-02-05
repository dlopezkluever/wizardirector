/**
 * Checkout Service
 * Frontend API client for Stage 11/12 checkout and video generation.
 * Use with React Query: useQuery for fetch, useMutation for actions.
 */

import { supabase } from '@/lib/supabase';
import type {
  CheckoutData,
  UserCreditBalance,
  ConfirmRenderResult,
  ModelVariant,
  VideoJobsResponse,
  VideoGenerationJob,
} from '@/types/scene';

class CheckoutService {
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
   * Get full checkout/cost breakdown data for Stage 11
   */
  async getCostBreakdown(projectId: string, sceneId: string): Promise<CheckoutData> {
    const headers = await this.getAuthHeaders();

    const response = await fetch(
      `/api/projects/${projectId}/scenes/${sceneId}/cost-breakdown`,
      { headers }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch checkout data');
    }

    return response.json();
  }

  /**
   * Get user's credit balance
   */
  async getCreditBalance(projectId: string): Promise<UserCreditBalance> {
    const headers = await this.getAuthHeaders();

    const response = await fetch(
      `/api/projects/${projectId}/credit-balance`,
      { headers }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch credit balance');
    }

    return response.json();
  }

  /**
   * Confirm render and queue video generation jobs
   */
  async confirmRender(
    projectId: string,
    sceneId: string,
    modelVariant: ModelVariant
  ): Promise<ConfirmRenderResult> {
    const headers = await this.getAuthHeaders();

    const response = await fetch(
      `/api/projects/${projectId}/scenes/${sceneId}/confirm-render`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ modelVariant }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to confirm render');
    }

    return response.json();
  }

  /**
   * Get all video jobs for a scene (Stage 12 display)
   */
  async getVideoJobs(projectId: string, sceneId: string): Promise<VideoJobsResponse> {
    const headers = await this.getAuthHeaders();

    const response = await fetch(
      `/api/projects/${projectId}/scenes/${sceneId}/video-jobs`,
      { headers }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch video jobs');
    }

    return response.json();
  }

  /**
   * Get a single video job status (for polling)
   */
  async getVideoJobStatus(
    projectId: string,
    sceneId: string,
    jobId: string
  ): Promise<VideoGenerationJob> {
    const headers = await this.getAuthHeaders();

    const response = await fetch(
      `/api/projects/${projectId}/scenes/${sceneId}/video-jobs/${jobId}`,
      { headers }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch video job status');
    }

    return response.json();
  }

  /**
   * Check if all jobs are complete or failed (no active jobs)
   */
  isRenderComplete(jobs: VideoGenerationJob[]): boolean {
    if (jobs.length === 0) return false;
    return jobs.every(job =>
      job.status === 'completed' || job.status === 'failed'
    );
  }

  /**
   * Check if all jobs completed successfully
   */
  isRenderSuccessful(jobs: VideoGenerationJob[]): boolean {
    if (jobs.length === 0) return false;
    return jobs.every(job => job.status === 'completed');
  }

  /**
   * Get count of active jobs (for progress display)
   */
  getActiveJobCount(jobs: VideoGenerationJob[]): number {
    return jobs.filter(job =>
      ['queued', 'processing', 'generating', 'uploading'].includes(job.status)
    ).length;
  }

  /**
   * Format cost for display
   */
  formatCost(cost: number): string {
    return `$${cost.toFixed(2)}`;
  }

  /**
   * Get rate for model variant ($/second)
   */
  getModelRate(variant: ModelVariant): number {
    return variant === 'veo_3_1_fast' ? 0.15 : 0.40;
  }

  /**
   * Get model variant display name
   */
  getModelName(variant: ModelVariant): string {
    return variant === 'veo_3_1_fast' ? 'Veo 3.1 Fast' : 'Veo 3.1 Standard';
  }
}

export const checkoutService = new CheckoutService();
