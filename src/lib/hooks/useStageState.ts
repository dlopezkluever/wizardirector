import { useState, useEffect, useCallback, useRef } from 'react';
import { stageStateService, type StageState, type SaveStageStateOptions } from '../services/stageStateService';
import { toast } from 'sonner';

interface UseStageStateOptions<T> {
  projectId: string;
  stageNumber: number;
  initialContent: T;
  autoSave?: boolean;
  onSaveSuccess?: () => void;
  onSaveError?: (error: Error) => void;
}

interface UseStageStateReturn<T> {
  content: T;
  setContent: (content: T | ((prev: T) => T)) => void;
  stageState: StageState | null;
  isLoading: boolean;
  isSaving: boolean;
  save: (options?: Partial<SaveStageStateOptions>) => Promise<void>;
  lock: () => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Custom hook for managing stage state with auto-save functionality
 * 
 * @example
 * const { content, setContent, save } = useStageState({
 *   projectId: '123',
 *   stageNumber: 1,
 *   initialContent: { inputMode: 'expansion' },
 *   autoSave: true
 * });
 */
export function useStageState<T extends Record<string, any>>({
  projectId,
  stageNumber,
  initialContent,
  autoSave = true,
  onSaveSuccess,
  onSaveError
}: UseStageStateOptions<T>): UseStageStateReturn<T> {
  const [content, setContentState] = useState<T>(initialContent);
  const [stageState, setStageState] = useState<StageState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const isFirstRender = useRef(true);
  const contentRef = useRef(content);

  // Keep ref in sync with content
  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  /**
   * Load stage state on mount
   */
  const loadStageState = useCallback(async () => {
    try {
      setIsLoading(true);
      const state = await stageStateService.getStageState(projectId, stageNumber);
      
      if (state) {
        setStageState(state);
        setContentState(state.content as T);
      }
    } catch (error) {
      console.error('Failed to load stage state:', error);
      // Don't show error toast on initial load - just use initial content
    } finally {
      setIsLoading(false);
    }
  }, [projectId, stageNumber]);

  /**
   * Load stage state on mount
   */
  useEffect(() => {
    loadStageState();
  }, [loadStageState]);

  /**
   * Auto-save when content changes (skip first render)
   */
  useEffect(() => {
    // Skip auto-save on first render and during initial load
    if (isFirstRender.current || isLoading) {
      isFirstRender.current = false;
      return;
    }

    if (!autoSave) {
      return;
    }

    // Trigger auto-save with debouncing
    stageStateService.autoSave(
      projectId,
      stageNumber,
      { content: contentRef.current },
      (success, error) => {
        if (success) {
          onSaveSuccess?.();
        } else {
          onSaveError?.(error!);
          toast.error('Auto-save failed');
        }
      }
    );

    // Cleanup: cancel auto-save on unmount
    return () => {
      stageStateService.cancelAutoSave(projectId, stageNumber);
    };
  }, [content, projectId, stageNumber, autoSave, isLoading, onSaveSuccess, onSaveError]);

  /**
   * Manually save stage state
   */
  const save = useCallback(async (options?: Partial<SaveStageStateOptions>) => {
    try {
      setIsSaving(true);
      const savedState = await stageStateService.forceSave(
        projectId,
        stageNumber,
        {
          content: contentRef.current,
          status: options?.status,
          regenerationGuidance: options?.regenerationGuidance
        }
      );
      setStageState(savedState);
      onSaveSuccess?.();
      toast.success('Saved successfully');
    } catch (error) {
      console.error('Failed to save stage state:', error);
      onSaveError?.(error as Error);
      toast.error('Failed to save');
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [projectId, stageNumber, onSaveSuccess, onSaveError]);

  /**
   * Lock the stage (mark as completed)
   */
  const lock = useCallback(async () => {
    try {
      setIsSaving(true);
      const lockedState = await stageStateService.lockStage(projectId, stageNumber);
      setStageState(lockedState);
      toast.success('Stage locked');
    } catch (error) {
      console.error('Failed to lock stage:', error);
      toast.error('Failed to lock stage');
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [projectId, stageNumber]);

  /**
   * Refresh stage state from server
   */
  const refresh = useCallback(async () => {
    await loadStageState();
  }, [loadStageState]);

  /**
   * Wrapper for setContent that works with both direct values and updater functions
   */
  const setContent = useCallback((newContent: T | ((prev: T) => T)) => {
    setContentState(prev => {
      const next = typeof newContent === 'function' 
        ? (newContent as (prev: T) => T)(prev)
        : newContent;
      return next;
    });
  }, []);

  return {
    content,
    setContent,
    stageState,
    isLoading,
    isSaving,
    save,
    lock,
    refresh
  };
}

/**
 * Hook to load all stage states for a project
 */
export function useProjectStageStates(projectId: string | null) {
  const [stageStates, setStageStates] = useState<StageState[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadStageStates = useCallback(async () => {
    if (!projectId) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const states = await stageStateService.getStageStates(projectId);
      setStageStates(states);
    } catch (err) {
      console.error('Failed to load stage states:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadStageStates();
  }, [loadStageStates]);

  return {
    stageStates,
    isLoading,
    error,
    refresh: loadStageStates,
    getStageState: (stageNumber: number) => 
      stageStates.find(s => s.stage_number === stageNumber) || null
  };
}

