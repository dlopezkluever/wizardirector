import { useState, useEffect, useCallback } from 'react';
import {
  sceneStageLockService,
  type StageLocks,
  type StageLockStatus,
  type UnlockImpact,
} from '@/lib/services/sceneStageLockService';

interface UseSceneStageLockOptions {
  projectId: string;
  sceneId: string;
}

interface UseSceneStageLockReturn {
  stageLocks: StageLocks;
  isLoading: boolean;
  isLocked: (stage: number) => boolean;
  isOutdated: (stage: number) => boolean;
  isDraft: (stage: number) => boolean;
  getStatus: (stage: number) => StageLockStatus;
  lockStage: (stage: number) => Promise<void>;
  unlockStage: (stage: number) => Promise<UnlockImpact | null>;
  confirmUnlock: (stage: number) => Promise<void>;
  relockStage: (stage: number) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useSceneStageLock({
  projectId,
  sceneId,
}: UseSceneStageLockOptions): UseSceneStageLockReturn {
  const [stageLocks, setStageLocks] = useState<StageLocks>({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchLocks = useCallback(async () => {
    if (!projectId || !sceneId) return;
    try {
      setIsLoading(true);
      const locks = await sceneStageLockService.getStageLocks(projectId, sceneId);
      setStageLocks(locks);
    } catch (error) {
      console.error('Failed to fetch stage locks:', error);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, sceneId]);

  useEffect(() => {
    fetchLocks();
  }, [fetchLocks]);

  const getStatus = useCallback(
    (stage: number): StageLockStatus => {
      const lock = stageLocks[String(stage)];
      return lock?.status || 'draft';
    },
    [stageLocks]
  );

  const isLocked = useCallback(
    (stage: number) => getStatus(stage) === 'locked',
    [getStatus]
  );

  const isOutdated = useCallback(
    (stage: number) => getStatus(stage) === 'outdated',
    [getStatus]
  );

  const isDraft = useCallback(
    (stage: number) => getStatus(stage) === 'draft',
    [getStatus]
  );

  const lockStage = useCallback(
    async (stage: number) => {
      const result = await sceneStageLockService.lockStage(projectId, sceneId, stage);
      setStageLocks(result.stageLocks);
    },
    [projectId, sceneId]
  );

  /**
   * Phase 1 of unlock: request impact assessment.
   * Returns UnlockImpact if confirmation is needed, or null if stage wasn't locked.
   */
  const unlockStage = useCallback(
    async (stage: number): Promise<UnlockImpact | null> => {
      const result = await sceneStageLockService.unlockStage(projectId, sceneId, stage, false);
      // If it has 'stage' property, it's an UnlockImpact
      if (result && 'stage' in result && 'downstreamStages' in result) {
        return result as UnlockImpact;
      }
      return null;
    },
    [projectId, sceneId]
  );

  /**
   * Phase 2 of unlock: confirm and execute.
   */
  const confirmUnlock = useCallback(
    async (stage: number) => {
      const result = await sceneStageLockService.unlockStage(projectId, sceneId, stage, true);
      if (result && 'stageLocks' in result) {
        setStageLocks(result.stageLocks);
      }
    },
    [projectId, sceneId]
  );

  const relockStage = useCallback(
    async (stage: number) => {
      const result = await sceneStageLockService.relockStage(projectId, sceneId, stage);
      setStageLocks(result.stageLocks);
    },
    [projectId, sceneId]
  );

  return {
    stageLocks,
    isLoading,
    isLocked,
    isOutdated,
    isDraft,
    getStatus,
    lockStage,
    unlockStage,
    confirmUnlock,
    relockStage,
    refresh: fetchLocks,
  };
}
