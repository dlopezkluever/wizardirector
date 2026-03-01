/**
 * Hook: Auto-populate shot-asset assignments when none exist.
 * Fires once per scene load — creates 'throughout' assignments for all (shot × asset) pairs.
 */

import { useState, useEffect, useRef } from 'react';
import { shotAssetAssignmentService } from '@/lib/services/shotAssetAssignmentService';

interface UseShotAssetAutoPopulateOptions {
  projectId: string;
  sceneId: string;
  /** Only trigger when true (e.g., after shots and assets have loaded) */
  enabled: boolean;
  /** Callback fired after auto-population completes (to refetch assignments, show toast, etc.) */
  onPopulated?: (result: { created: number; existing: number }) => void;
}

interface UseShotAssetAutoPopulateReturn {
  isAutoPopulating: boolean;
  autoPopulated: boolean;
}

export function useShotAssetAutoPopulate({
  projectId,
  sceneId,
  enabled,
  onPopulated,
}: UseShotAssetAutoPopulateOptions): UseShotAssetAutoPopulateReturn {
  const [isAutoPopulating, setIsAutoPopulating] = useState(false);
  const [autoPopulated, setAutoPopulated] = useState(false);
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !projectId || !sceneId || hasCheckedRef.current) return;
    hasCheckedRef.current = true;

    let cancelled = false;

    (async () => {
      try {
        const has = await shotAssetAssignmentService.hasAssignments(projectId, sceneId);
        if (has || cancelled) {
          setAutoPopulated(true);
          return;
        }

        setIsAutoPopulating(true);
        const result = await shotAssetAssignmentService.autoPopulate(projectId, sceneId);
        if (!cancelled) {
          setAutoPopulated(true);
          onPopulated?.(result);
        }
      } catch (err) {
        console.error('Auto-populate shot assignments failed:', err);
      } finally {
        if (!cancelled) setIsAutoPopulating(false);
      }
    })();

    return () => { cancelled = true; };
  }, [enabled, projectId, sceneId, onPopulated]);

  return { isAutoPopulating, autoPopulated };
}
