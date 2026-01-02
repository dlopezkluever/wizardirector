import { supabase } from '../supabase';

export interface StageState {
  id: string;
  branch_id: string;
  stage_number: number;
  version: number;
  status: 'draft' | 'locked' | 'invalidated' | 'outdated';
  content: Record<string, any>;
  regeneration_guidance: string;
  created_at: string;
  created_by: string;
}

export interface SaveStageStateOptions {
  content: Record<string, any>;
  status?: 'draft' | 'locked' | 'invalidated' | 'outdated';
  regenerationGuidance?: string;
}

class StageStateService {
  private autoSaveTimers: Map<string, NodeJS.Timeout> = new Map();
  private autoSaveDelay = 1000; // 1 second debounce

  /**
   * Get all stage states for a project's active branch
   */
  async getStageStates(projectId: string): Promise<StageState[]> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`/api/projects/${projectId}/stages`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch stage states');
    }

    return response.json();
  }

  /**
   * Get a specific stage state
   */
  async getStageState(projectId: string, stageNumber: number): Promise<StageState | null> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`/api/projects/${projectId}/stages/${stageNumber}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch stage state');
    }

    return response.json();
  }

  /**
   * Save or update a stage state
   */
  async saveStageState(
    projectId: string,
    stageNumber: number,
    options: SaveStageStateOptions
  ): Promise<StageState> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`/api/projects/${projectId}/stages/${stageNumber}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: options.content,
        status: options.status || 'draft',
        regenerationGuidance: options.regenerationGuidance || ''
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save stage state');
    }

    return response.json();
  }

  /**
   * Lock a stage (mark as completed and prevent further edits)
   */
  async lockStage(projectId: string, stageNumber: number): Promise<StageState> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`/api/projects/${projectId}/stages/${stageNumber}/lock`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to lock stage');
    }

    return response.json();
  }

  /**
   * Auto-save with debouncing to prevent excessive API calls
   */
  autoSave(
    projectId: string,
    stageNumber: number,
    options: SaveStageStateOptions,
    callback?: (success: boolean, error?: Error) => void
  ): void {
    // Create a unique key for this auto-save operation
    const key = `${projectId}-${stageNumber}`;

    // Clear any existing timer for this stage
    const existingTimer = this.autoSaveTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set a new timer
    const timer = setTimeout(async () => {
      try {
        await this.saveStageState(projectId, stageNumber, options);
        this.autoSaveTimers.delete(key);
        callback?.(true);
      } catch (error) {
        console.error('Auto-save failed:', error);
        this.autoSaveTimers.delete(key);
        callback?.(false, error as Error);
      }
    }, this.autoSaveDelay);

    this.autoSaveTimers.set(key, timer);
  }

  /**
   * Cancel pending auto-save for a specific stage
   */
  cancelAutoSave(projectId: string, stageNumber: number): void {
    const key = `${projectId}-${stageNumber}`;
    const timer = this.autoSaveTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.autoSaveTimers.delete(key);
    }
  }

  /**
   * Force immediate save (bypassing debounce)
   */
  async forceSave(
    projectId: string,
    stageNumber: number,
    options: SaveStageStateOptions
  ): Promise<StageState> {
    // Cancel any pending auto-save
    this.cancelAutoSave(projectId, stageNumber);

    // Perform immediate save
    return this.saveStageState(projectId, stageNumber, options);
  }

  /**
   * Get the current auto-save delay in milliseconds
   */
  getAutoSaveDelay(): number {
    return this.autoSaveDelay;
  }

  /**
   * Set the auto-save delay (useful for testing or user preferences)
   */
  setAutoSaveDelay(delayMs: number): void {
    this.autoSaveDelay = Math.max(500, delayMs); // Minimum 500ms
  }
}

export const stageStateService = new StageStateService();

