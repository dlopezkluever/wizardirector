/**
 * Prompt Service
 * Frontend API client for Stage 9 prompt segmentation (CRUD, generate).
 * Use with React Query: useQuery for fetch, useMutation for update/generate.
 */

import { supabase } from '@/lib/supabase';
import type { PromptSet } from '@/types/scene';

export interface FetchPromptsResponse {
  prompts: PromptSet[];
  sceneNumber: number;
}

export interface UpdatePromptRequest {
  framePrompt?: string;
  videoPrompt?: string;
  requiresEndFrame?: boolean;
  compatibleModels?: string[];
}

export interface GeneratePromptsResponse {
  success: boolean;
  prompts: PromptSet[];
  generated: number;
  failed: number;
  errors: Array<{ shotId: string; error: string }>;
}

class PromptService {
  /**
   * Fetch all prompts for a scene
   */
  async fetchPrompts(projectId: string, sceneId: string): Promise<FetchPromptsResponse> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(
      `/api/projects/${projectId}/scenes/${sceneId}/prompts`,
      {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch prompts');
    }

    return response.json();
  }

  /**
   * Update prompts for a single shot
   */
  async updatePrompt(
    projectId: string,
    sceneId: string,
    shotUuid: string,
    updates: UpdatePromptRequest
  ): Promise<PromptSet> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(
      `/api/projects/${projectId}/scenes/${sceneId}/shots/${shotUuid}/prompts`,
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
      throw new Error(error.error || 'Failed to update prompt');
    }

    const result = await response.json();
    return result.shot;
  }

  /**
   * Generate prompts for all shots in a scene (or specific shots)
   */
  async generatePrompts(
    projectId: string,
    sceneId: string,
    shotIds?: string[]
  ): Promise<GeneratePromptsResponse> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(
      `/api/projects/${projectId}/scenes/${sceneId}/generate-prompts`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ shotIds }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please wait a moment and try again.');
      }
      throw new Error(error.error || 'Failed to generate prompts');
    }

    return response.json();
  }

  /**
   * Regenerate prompt for a single shot
   */
  async regenerateSinglePrompt(
    projectId: string,
    sceneId: string,
    shotUuid: string
  ): Promise<PromptSet> {
    const result = await this.generatePrompts(projectId, sceneId, [shotUuid]);

    if (result.failed > 0) {
      const errorMsg = result.errors.find(e => e.shotId === shotUuid)?.error || 'Failed to regenerate prompt';
      throw new Error(errorMsg);
    }

    const prompt = result.prompts.find(p => p.shotUuid === shotUuid);
    if (!prompt) {
      throw new Error('Generated prompt not found in response');
    }

    return prompt;
  }
}

export const promptService = new PromptService();
