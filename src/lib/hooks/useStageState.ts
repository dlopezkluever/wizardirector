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
  console.log('🔧 useStageState initialized:', { projectId, stageNumber, autoSave, initialContent });
  
  const [content, setContentState] = useState<T>(initialContent);
  const [stageState, setStageState] = useState<StageState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const isFirstRender = useRef(true);
  const contentRef = useRef(content);

  // Keep ref in sync with content
  useEffect(() => {
    console.log('📝 Content updated in useStageState:', content);
    contentRef.current = content;
  }, [content]);

  /**
   * Load stage state on mount
   */
  const loadStageState = useCallback(async () => {
    console.log('🔄 loadStageState called:', { projectId, stageNumber });
    
    // Skip loading if this is a new project (no real ID yet)
    if (!projectId || projectId === 'new') {
      console.log('⏭️ Skipping load - projectId is new or invalid:', projectId);
      setIsLoading(false);
      return;
    }

    try {
      console.log('📥 Loading stage state from API...');
      setIsLoading(true);
      const state = await stageStateService.getStageState(projectId, stageNumber);
      
      if (state) {
        console.log('✅ Stage state loaded:', state);
        setStageState(state);
        setContentState(state.content as T);
      } else {
        console.log('ℹ️ No existing stage state found - using initial content');
      }
    } catch (error) {
      console.error('❌ Failed to load stage state:', error);
      // Don't show error toast on initial load - just use initial content
    } finally {
      console.log('✅ Load stage state completed');
      setIsLoading(false);
    }
  }, [projectId, stageNumber]);

  /**
   * Load stage state on mount
   */
  useEffect(() => {
    console.log('🚀 useEffect for loadStageState triggered');
    loadStageState();
  }, [loadStageState]);

  /**
   * Auto-save when content changes (skip first render)
   */
  useEffect(() => {
    console.log('🔄 Auto-save useEffect triggered:', {
      isFirstRender: isFirstRender.current,
      isLoading,
      projectId,
      autoSave,
      contentKeys: Object.keys(content)
    });

    // Skip auto-save on first render and during initial load
    if (isFirstRender.current || isLoading) {
      console.log('⏭️ Skipping auto-save - first render or loading:', { isFirstRender: isFirstRender.current, isLoading });
      isFirstRender.current = false;
      return;
    }

    // Skip auto-save for new projects (no real ID yet)
    if (!projectId || projectId === 'new') {
      console.log('⏭️ Skipping auto-save - invalid projectId:', projectId);
      return;
    }

    if (!autoSave) {
      console.log('⏭️ Skipping auto-save - autoSave disabled');
      return;
    }

    console.log('🚀 Triggering auto-save with content:', contentRef.current);

    // Trigger auto-save with debouncing
    stageStateService.autoSave(
      projectId,
      stageNumber,
      { content: contentRef.current },
      (success, error) => {
        console.log('📋 Auto-save callback:', { success, error });
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
      console.log('🧹 Cleaning up auto-save for:', projectId, stageNumber);
      stageStateService.cancelAutoSave(projectId, stageNumber);
    };
  }, [content, projectId, stageNumber, autoSave, isLoading, onSaveSuccess, onSaveError]);

  /**
   * Manually save stage state
   */
  const save = useCallback(async (options?: Partial<SaveStageStateOptions>) => {
    // Skip saving for new projects (no real ID yet)
    if (!projectId || projectId === 'new') {
      toast.error('Cannot save - project not created yet');
      return;
    }

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
    // Skip locking for new projects (no real ID yet)
    if (!projectId || projectId === 'new') {
      toast.error('Cannot lock stage - project not created yet');
      return;
    }

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
    console.log('📝 setContent called with:', typeof newContent === 'function' ? 'function' : newContent);
    setContentState(prev => {
      const next = typeof newContent === 'function' 
        ? (newContent as (prev: T) => T)(prev)
        : newContent;
      console.log('📝 Content changing from:', prev, 'to:', next);
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
    // Skip loading for new projects or invalid IDs
    if (!projectId || projectId === 'new') {
      setIsLoading(false);
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

