import { supabase } from '../supabase';

export type BackendStageStatus = 'draft' | 'locked' | 'invalidated' | 'outdated' | 'skipped';
export type BackendStageOrigin = 'skipped' | 'imported' | 'ai-generated' | 'authored';

export interface StageState {
  id: string;
  branch_id: string;
  stage_number: number;
  version: number;
  status: BackendStageStatus;
  origin?: BackendStageOrigin | null;
  content: Record<string, any>;
  regeneration_guidance: string;
  created_at: string;
  created_by: string;
}

export interface SaveStageStateOptions {
  content: Record<string, any>;
  status?: BackendStageStatus;
  origin?: BackendStageOrigin;
  regenerationGuidance?: string;
  styleCapsuleMetadata?: {
    styleCapsuleId: string;
    injectionContext: Record<string, any>;
  };
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
      console.error('❌ No auth session found');
      throw new Error('User not authenticated');
    }

    console.log('✅ Auth session found, making API request...');

    // Extract styleCapsuleMetadata from content if present (temporary storage)
    const styleCapsuleMetadata = options.styleCapsuleMetadata || (options.content as any)?._styleCapsuleMetadata;
    
    // Remove temporary metadata from content before saving
    const contentToSave = { ...options.content };
    delete (contentToSave as any)._styleCapsuleMetadata;

    const requestBody = {
      content: contentToSave,
      status: options.status || 'draft',
      origin: options.origin,
      regenerationGuidance: options.regenerationGuidance || '',
      styleCapsuleMetadata: styleCapsuleMetadata // Pass through if provided
    };

    console.log('📤 Request body:', requestBody);

    const response = await fetch(`/api/projects/${projectId}/stages/${stageNumber}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('📥 Response status:', response.status);

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ API Error:', error);
      throw new Error(error.error || 'Failed to save stage state');
    }

    const result = await response.json();
    console.log('✅ Save successful:', result);
    return result;
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
   * Unlock a Phase A stage (1-5). Two-phase: without confirm returns impact, with confirm executes.
   */
  async unlockStage(projectId: string, stageNumber: number, confirm = false): Promise<{ downstreamStages?: number[]; message?: string; success?: boolean }> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`/api/projects/${projectId}/stages/${stageNumber}/unlock`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ confirm }),
    });

    // 409 = impact assessment (not yet confirmed)
    if (response.status === 409) {
      return response.json();
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to unlock stage');
    }

    return response.json();
  }

  /**
   * Mark a Phase A stage (2, 3, or 4) as intentionally skipped.
   */
  async skipStage(projectId: string, stageNumber: number): Promise<StageState> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`/api/projects/${projectId}/stages/${stageNumber}/skip`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to skip stage');
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
        console.log('✅ Auto-save completed successfully');
        callback?.(true);
      } catch (error) {
        console.error('❌ Auto-save failed:', error);
        this.autoSaveTimers.delete(key);
        callback?.(false, error as Error);
      }
    }, this.autoSaveDelay);

    this.autoSaveTimers.set(key, timer);
    console.log(`⏳ Auto-save scheduled in ${this.autoSaveDelay}ms`);
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

