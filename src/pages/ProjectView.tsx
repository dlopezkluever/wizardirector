import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { PhaseTimeline } from '@/components/pipeline/PhaseTimeline';
import { ProjectHeader } from '@/components/pipeline/ProjectHeader';
import { Stage1InputMode } from '@/components/pipeline/Stage1InputMode';
import { Stage2Treatment } from '@/components/pipeline/Stage2Treatment';
import { Stage3BeatSheet } from '@/components/pipeline/Stage3BeatSheet';
import { Stage4MasterScript } from '@/components/pipeline/Stage4MasterScript';
import { Stage5Assets } from '@/components/pipeline/Stage5Assets';
import { Stage6ScriptHub } from '@/components/pipeline/Stage6ScriptHub';
import { Stage7ShotList } from '@/components/pipeline/Stage7ShotList';
import { Stage8VisualDefinition } from '@/components/pipeline/Stage8VisualDefinition';
import { Stage9PromptSegmentation } from '@/components/pipeline/Stage9PromptSegmentation';
import { Stage10FrameGeneration } from '@/components/pipeline/Stage10FrameGeneration';
import { Stage11Confirmation } from '@/components/pipeline/Stage11Confirmation';
import { Stage12VideoGeneration } from '@/components/pipeline/Stage12VideoGeneration';
import { SceneWorkflowSidebar } from '@/components/pipeline/SceneWorkflowSidebar';
import type { StageProgress, StageStatus } from '@/types/project';
import { useProjectStageStates } from '@/lib/hooks/useStageState';
import { projectService } from '@/lib/services/projectService';
import { stageStateService } from '@/lib/services/stageStateService';
import { sceneStageLockService, type StageLocks, type StageLockStatus } from '@/lib/services/sceneStageLockService';
import { UnlockWarningDialog } from '@/components/pipeline/UnlockWarningDialog';
import type { UnlockImpact } from '@/lib/services/sceneStageLockService';

const initialPhaseAStages: StageProgress[] = [
  { stage: 1, status: 'active' as StageStatus, label: 'Input' },
  { stage: 2, status: 'pending' as StageStatus, label: 'Treatment' },
  { stage: 3, status: 'pending' as StageStatus, label: 'Beat Sheet' },
  { stage: 4, status: 'pending' as StageStatus, label: 'Script' },
  { stage: 5, status: 'pending' as StageStatus, label: 'Assets' },
];

interface ProjectViewProps {
  projectId?: string;
  onBack?: () => void;
}

type SceneStage = 7 | 8 | 9 | 10 | 11 | 12;

export function ProjectView({ projectId: propProjectId, onBack }: ProjectViewProps) {
  // Get projectId from URL params if not provided as prop
  const { projectId: urlProjectId } = useParams<{ projectId: string }>();
  const projectId = propProjectId || urlProjectId;
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [currentStage, setCurrentStage] = useState(1);
  const [stages, setStages] = useState<StageProgress[]>(initialPhaseAStages);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [sceneStage, setSceneStage] = useState<SceneStage>(7);
  const [completedSceneStages, setCompletedSceneStages] = useState<SceneStage[]>([]);
  const [sceneStageLocks, setSceneStageLocks] = useState<StageLocks>({});

  // Phase A unlock dialog state
  const [phaseAUnlockStage, setPhaseAUnlockStage] = useState<number | null>(null);
  const [phaseAUnlockImpact, setPhaseAUnlockImpact] = useState<UnlockImpact | null>(null);
  const [isConfirmingPhaseAUnlock, setIsConfirmingPhaseAUnlock] = useState(false);

  const [projectTitle, setProjectTitle] = useState('Loading...');
  const [currentBranch, setCurrentBranch] = useState('main');
  const [projectAspectRatio, setProjectAspectRatio] = useState<string>('16:9');
  const [isLoadingProject, setIsLoadingProject] = useState(true);
  const [hasReachedPhaseB, setHasReachedPhaseB] = useState(false);
  const hasRestoredStage = useRef(false);
  const isHydrated = useRef(false);

  // Load all stage states for the project
  const { stageStates, isLoading: isLoadingStates, getStageState } = useProjectStageStates(projectId);

  // Helper function to get localStorage key for stage persistence
  const getStageStorageKey = (projectId: string | null | undefined) => {
    return projectId && projectId !== 'new' ? `project_${projectId}_stage` : null;
  };

  const getSceneIdStorageKey = (projectId: string | null | undefined) => {
    return projectId && projectId !== 'new' ? `project_${projectId}_sceneId` : null;
  };

  const getPhaseBReachedKey = (projectId: string | null | undefined) => {
    return projectId && projectId !== 'new' ? `project_${projectId}_reachedPhaseB` : null;
  };

  // Helper function to persist stage to localStorage and URL (sceneId required for Stage 8)
  const persistStage = (stage: number, sceneId?: string | null) => {
    if (!projectId || projectId === 'new') return;

    const storageKey = getStageStorageKey(projectId);
    if (storageKey) {
      localStorage.setItem(storageKey, stage.toString());
    }
    if (stage >= 7 && sceneId) {
      const sceneKey = getSceneIdStorageKey(projectId);
      if (sceneKey) localStorage.setItem(sceneKey, sceneId);
    }

    const newParams = new URLSearchParams(searchParams);
    newParams.set('stage', stage.toString());
    if (sceneId) {
      newParams.set('sceneId', sceneId);
    } else {
      newParams.delete('sceneId');
    }
    setSearchParams(newParams, { replace: true });
  };

  // Helper function to restore stage from URL or localStorage
  const restoreStage = (): number | null => {
    // First check URL params
    const stageFromUrl = searchParams.get('stage');
    if (stageFromUrl) {
      const stage = parseInt(stageFromUrl, 10);
      if (!isNaN(stage) && stage >= 1 && stage <= 12) {
        return stage;
      }
    }

    // Fall back to localStorage
    const storageKey = getStageStorageKey(projectId);
    if (storageKey) {
      const storedStage = localStorage.getItem(storageKey);
      if (storedStage) {
        const stage = parseInt(storedStage, 10);
        if (!isNaN(stage) && stage >= 1 && stage <= 12) {
          return stage;
        }
      }
    }

    return null;
  };

  // Load project details on mount
  useEffect(() => {
    const loadProject = async () => {
      try {
        setIsLoadingProject(true);
        const project = await projectService.getProject(projectId);
        setProjectTitle(project.title);
        setCurrentBranch(project.branch);
        setProjectAspectRatio(project.aspectRatio || '16:9');
      } catch (error) {
        console.error('Failed to load project:', error);
        toast.error('Failed to load project');
      } finally {
        setIsLoadingProject(false);
      }
    };

    if (projectId && projectId !== 'new') {
      loadProject();
    } else {
      setProjectTitle('New Project');
      setIsLoadingProject(false);
    }
  }, [projectId]);

  // Track when user reaches Phase B (persisted across sessions)
  useEffect(() => {
    const key = getPhaseBReachedKey(projectId);
    if (key) {
      const stored = localStorage.getItem(key);
      if (stored === 'true') {
        setHasReachedPhaseB(true);
      }
    }
  }, [projectId]);

  useEffect(() => {
    if (currentStage > 5) {
      setHasReachedPhaseB(true);
      const key = getPhaseBReachedKey(projectId);
      if (key) {
        localStorage.setItem(key, 'true');
      }
    }
  }, [currentStage, projectId]);

  // Wrapper for setCurrentStage that also persists
  const setCurrentStageWithPersistence = (stage: number, sceneId?: string | null) => {
    setCurrentStage(stage);
    persistStage(stage, sceneId);
  };

  // Reset restoration flags when projectId changes
  useEffect(() => {
    hasRestoredStage.current = false;
    isHydrated.current = false;
  }, [projectId]);

  // Restore persisted stage on initial mount (before hydration). Stage 8 requires sceneId.
  useEffect(() => {
    if (projectId === 'new') return;

    const stageFromUrl = searchParams.get('stage');
    const sceneIdFromUrl = searchParams.get('sceneId');
    let persistedStage: number | null = null;
    let persistedSceneId: string | null = null;

    if (stageFromUrl) {
      const stage = parseInt(stageFromUrl, 10);
      if (!isNaN(stage) && stage >= 1 && stage <= 12) {
        persistedStage = stage;
        if (stage === 8) {
          if (sceneIdFromUrl) persistedSceneId = sceneIdFromUrl;
          else {
            const sceneKey = getSceneIdStorageKey(projectId);
            if (sceneKey) persistedSceneId = localStorage.getItem(sceneKey);
            if (persistedSceneId) {
              const newParams = new URLSearchParams(searchParams);
              newParams.set('stage', '8');
              newParams.set('sceneId', persistedSceneId);
              setSearchParams(newParams, { replace: true });
            } else {
              console.warn('[Stage8] No sceneId for Stage 8, redirecting to Stage 7');
              persistedStage = 7;
              persistedSceneId = null;
            }
          }
        } else if (stage >= 7 && sceneIdFromUrl) persistedSceneId = sceneIdFromUrl;
      }
    }

    if (persistedStage === null && !hasRestoredStage.current) {
      const storageKey = getStageStorageKey(projectId);
      if (storageKey) {
        const storedStage = localStorage.getItem(storageKey);
        if (storedStage) {
          const stage = parseInt(storedStage, 10);
          if (!isNaN(stage) && stage >= 1 && stage <= 12) {
            persistedStage = stage;
            if (stage === 8) {
              const sceneKey = getSceneIdStorageKey(projectId);
              if (sceneKey) persistedSceneId = localStorage.getItem(sceneKey);
              if (!persistedSceneId) {
                persistedStage = 7;
                persistedSceneId = null;
              }
            }
            const newParams = new URLSearchParams(searchParams);
            newParams.set('stage', persistedStage.toString());
            if (persistedSceneId) newParams.set('sceneId', persistedSceneId);
            setSearchParams(newParams, { replace: true });
          }
        }
      }
    }

    if (persistedStage !== null && persistedStage !== currentStage) {
      if (persistedStage > 5) {
        setCurrentStage(persistedStage);
        if (persistedSceneId && persistedStage >= 7) {
          setActiveSceneId(persistedSceneId);
          setSceneStage(persistedStage as SceneStage);
        }
        hasRestoredStage.current = true;
        return;
      }
      setCurrentStage(persistedStage);
      hasRestoredStage.current = true;
    } else if (persistedStage === currentStage) {
      hasRestoredStage.current = true;
    }
  }, [projectId, searchParams, setSearchParams]);

  // Hydrate stage progression from database
  useEffect(() => {
    // Skip hydration for new projects
    if (projectId === 'new') {
      return;
    }

    if (isLoadingStates || stageStates.length === 0) {
      return;
    }

    // Only hydrate once per project load to prevent re-hydration loops
    if (isHydrated.current) return;

    // Track locked and draft stages separately for correct derivation
    let highestLockedStage = 0;
    let highestDraftStage = 0;

    const updatedStages = initialPhaseAStages.map(stageProgress => {
      const stageState = stageStates.find(s => s.stage_number === stageProgress.stage);

      if (stageState) {
        if (stageState.status === 'locked') {
          highestLockedStage = Math.max(highestLockedStage, stageProgress.stage);
          return { ...stageProgress, status: 'locked' as StageStatus };
        } else if (stageState.status === 'draft') {
          highestDraftStage = Math.max(highestDraftStage, stageProgress.stage);
          return { ...stageProgress, status: 'active' as StageStatus };
        } else if (stageState.status === 'outdated') {
          return { ...stageProgress, status: 'outdated' as StageStatus };
        }
      }

      return stageProgress;
    });

    // Derive the correct stage: stay on draft, or advance past locked
    const derivedStage = highestDraftStage > 0
      ? highestDraftStage
      : Math.min(highestLockedStage + 1, 5);

    // Phase B: keep current stage, just update the stages array
    if (currentStage > 5) {
      setStages(updatedStages);
      isHydrated.current = true;
      return;
    }

    // If stage was restored from URL/localStorage, validate and keep it
    const maxAllowedStage = Math.min(
      Math.max(highestLockedStage, highestDraftStage) + 1, 5
    );

    if (hasRestoredStage.current && currentStage >= 1 && currentStage <= maxAllowedStage) {
      const finalStages = updatedStages.map(s =>
        s.stage === currentStage && s.status === 'pending'
          ? { ...s, status: 'active' as StageStatus } : s
      );
      setStages(finalStages);
      persistStage(currentStage);
      isHydrated.current = true;
      return;
    }

    // No valid restored stage — use derived stage
    const finalStages = updatedStages.map(s =>
      s.stage === derivedStage && s.status !== 'locked' && s.status !== 'outdated'
        ? { ...s, status: 'active' as StageStatus } : s
    );
    setStages(finalStages);
    setCurrentStageWithPersistence(derivedStage);
    isHydrated.current = true;
  }, [stageStates, isLoadingStates, projectId, currentStage]);

  // Navigation guard: Ensure currentStage is always valid
  useEffect(() => {
    // Allow Stage 6+ (Phase B) to proceed without validation against Phase A stages
    if (currentStage > 5) {
      return;
    }

    // Wait for hydration to complete before validating navigation
    if (!isHydrated.current) return;

    if (stages.length > 0) {
      const currentStageData = stages.find(s => s.stage === currentStage);
      if (!currentStageData || currentStageData.status === 'pending') {
        // Find the highest stage that is not pending
        const highestAllowedStage = stages
          .filter(s => s.status !== 'pending')
          .reduce((max, s) => s.stage > max.stage ? s : max, stages[0]);

        if (highestAllowedStage && highestAllowedStage.stage !== currentStage) {
          console.warn(`Redirecting from invalid stage ${currentStage} to highest allowed stage ${highestAllowedStage.stage}`);
          setCurrentStageWithPersistence(highestAllowedStage.stage);
        }
      }
    }
  }, [stages, currentStage]);

  // Restore scene context from URL on mount/refresh (Stage 8 must have sceneId from URL or localStorage)
  useEffect(() => {
    const sceneIdFromUrl = searchParams.get('sceneId');
    const stageFromUrl = searchParams.get('stage');

    const fetchSceneLocks = async (scnId: string) => {
      if (!projectId) return;
      try {
        const locks = await sceneStageLockService.getStageLocks(projectId, scnId);
        setSceneStageLocks(locks);
        // Build completed stages from DB locks
        const completed: SceneStage[] = [];
        for (let s = 7; s <= 12; s++) {
          const entry = locks[s.toString()];
          if (entry && (entry.status === 'locked' || entry.status === 'outdated')) {
            completed.push(s as SceneStage);
          }
        }
        setCompletedSceneStages(completed);
      } catch (error) {
        console.error('Failed to fetch scene locks on restore:', error);
      }
    };

    if (stageFromUrl) {
      const stage = parseInt(stageFromUrl, 10);
      if (!isNaN(stage) && stage >= 7) {
        const sceneId = sceneIdFromUrl ?? (stage === 8 ? localStorage.getItem(getSceneIdStorageKey(projectId) ?? '') : null);
        if (sceneId) {
          setActiveSceneId(sceneId);
          setSceneStage(stage as SceneStage);
          setCurrentStage(stage);
          // Fetch real lock state from DB instead of assuming linear completion
          fetchSceneLocks(sceneId);
          if (stage === 8 && !sceneIdFromUrl) {
            const newParams = new URLSearchParams(searchParams);
            newParams.set('stage', '8');
            newParams.set('sceneId', sceneId);
            setSearchParams(newParams, { replace: true });
          }
        } else if (stage === 6) {
          setActiveSceneId(null);
          setCurrentStage(stage);
        }
      } else if (!isNaN(stage) && stage === 6) {
        setActiveSceneId(null);
        setCurrentStage(stage);
      }
    } else if (sceneIdFromUrl && currentStage >= 7) {
      setActiveSceneId(sceneIdFromUrl);
      setSceneStage(currentStage as SceneStage);
      fetchSceneLocks(sceneIdFromUrl);
    }
  }, [searchParams, projectId]);

  const handleStageComplete = async (stageNumber: number) => {
    try {
      // Call backend to lock the stage
      await stageStateService.lockStage(projectId!, stageNumber);

      // Update local state
      setStages(prev => prev.map(s =>
        s.stage === stageNumber
          ? { ...s, status: 'locked' as StageStatus }
          : s.stage === stageNumber + 1 && stageNumber < 5 // Only advance to next stage in Phase A
            ? { ...s, status: 'active' as StageStatus }
            : s
      ));

      // Advance to next stage
      // For Stage 5, transition to Stage 6 (Script Hub)
      if (stageNumber === 5) {
        setCurrentStageWithPersistence(6);
        toast.success('Stage 5 completed! Proceeding to Script Hub...');
      } else if (stageNumber < 5) {
        // Normal Phase A progression
        setCurrentStageWithPersistence(stageNumber + 1);
        toast.success(`Stage ${stageNumber} completed and locked`);
      } else {
        toast.success(`Stage ${stageNumber} completed and locked`);
      }
    } catch (error) {
      console.error('Failed to complete stage:', error);
      toast.error('Failed to complete stage. Please try again.');
    }
  };

  const handleGoBack = (toStage: number) => {
    setCurrentStageWithPersistence(toStage);
  };

  const handleNavigate = (toStage: number) => {
    const targetStage = stages.find(s => s.stage === toStage);
    if (targetStage && targetStage.status !== 'pending') {
      setCurrentStageWithPersistence(toStage);
    } else if (toStage > 5) {
      // Allow navigation to Stage 6+ regardless of Phase A status
      setCurrentStageWithPersistence(toStage);
    }
  };

  const handleEnterScene = async (sceneId: string) => {
    setActiveSceneId(sceneId);

    try {
      // Fetch scene's stage_locks from DB
      const locks = await sceneStageLockService.getStageLocks(projectId!, sceneId);
      setSceneStageLocks(locks);

      // Find first stage where status !== 'locked' (resume target)
      let resumeTarget: SceneStage = 7;
      const completed: SceneStage[] = [];

      for (let s = 7; s <= 12; s++) {
        const entry = locks[s.toString()];
        if (entry && (entry.status === 'locked' || entry.status === 'outdated')) {
          completed.push(s as SceneStage);
        } else {
          resumeTarget = s as SceneStage;
          break;
        }
        // If all stages are locked/outdated, resume at last one
        if (s === 12) {
          resumeTarget = 12;
        }
      }

      setSceneStage(resumeTarget);
      setCompletedSceneStages(completed);
      setCurrentStageWithPersistence(resumeTarget, sceneId);
    } catch (error) {
      console.error('Failed to fetch scene stage locks:', error);
      // Fallback: start at Stage 7
      setSceneStage(7);
      setCompletedSceneStages([]);
      setCurrentStageWithPersistence(7, sceneId);
    }
  };

  const handleEnterSceneAtStage = async (sceneId: string, stage: number) => {
    if (stage >= 7 && stage <= 12) {
      setActiveSceneId(sceneId);
      setSceneStage(stage as SceneStage);

      try {
        const locks = await sceneStageLockService.getStageLocks(projectId!, sceneId);
        setSceneStageLocks(locks);

        // Build completed stages from DB
        const completed: SceneStage[] = [];
        for (let s = 7; s <= 12; s++) {
          const entry = locks[s.toString()];
          if (entry && (entry.status === 'locked' || entry.status === 'outdated')) {
            completed.push(s as SceneStage);
          }
        }
        setCompletedSceneStages(completed);
      } catch (error) {
        console.error('Failed to fetch scene stage locks:', error);
        // Fallback: assume stages before target are completed
        setCompletedSceneStages(
          Array.from({ length: Math.max(0, stage - 7) }, (_, i) => (7 + i) as SceneStage)
        );
      }

      setCurrentStageWithPersistence(stage, sceneId);
    }
  };

  const handleExitScene = () => {
    setActiveSceneId(null);
    setSceneStage(7);
    setCurrentStageWithPersistence(6);
  };

  const handleSceneStageComplete = async () => {
    // Lock the current stage via new system (best-effort — Stage 7 already locks via its own hook)
    if (projectId && activeSceneId) {
      try {
        const result = await sceneStageLockService.lockStage(projectId, activeSceneId, sceneStage);
        if (result.stageLocks) {
          setSceneStageLocks(result.stageLocks);
        }
      } catch (error) {
        console.error('Failed to lock scene stage:', error);
      }
    }

    setCompletedSceneStages(prev => {
      if (prev.includes(sceneStage)) return prev;
      return [...prev, sceneStage];
    });

    if (sceneStage < 12) {
      const nextStage = (sceneStage + 1) as SceneStage;
      setSceneStage(nextStage);
      persistStage(nextStage, activeSceneId);
    } else {
      toast.success('Scene completed!');
      handleExitScene();
    }
  };

  const handleSceneStageNext = () => {
    if (sceneStage < 12) {
      const nextStage = (sceneStage + 1) as SceneStage;
      setSceneStage(nextStage);
      persistStage(nextStage, activeSceneId);
    }
  };

  const handleSceneStageBack = () => {
    if (sceneStage > 7) {
      setSceneStage((sceneStage - 1) as SceneStage);
    } else {
      handleExitScene();
    }
  };

  // Derive stage lock statuses for SceneWorkflowSidebar from sceneStageLocks
  const deriveSidebarLockStatuses = (): Record<number, StageLockStatus> => {
    const statuses: Record<number, StageLockStatus> = {};
    for (let s = 7; s <= 12; s++) {
      const entry = sceneStageLocks[s.toString()];
      statuses[s] = entry?.status ?? 'draft';
    }
    return statuses;
  };

  // Get the StageStatus for a Phase A stage (for passing to components)
  const getPhaseAStageStatus = (stageNumber: number): StageStatus | undefined => {
    const stageData = stages.find(s => s.stage === stageNumber);
    return stageData?.status;
  };

  // Phase A unlock flow
  const handlePhaseAUnlock = async (stageNumber: number) => {
    if (!projectId) return;
    try {
      const result = await stageStateService.unlockStage(projectId, stageNumber, false);
      if (result.downstreamStages) {
        // Got impact assessment — show warning dialog
        setPhaseAUnlockStage(stageNumber);
        setPhaseAUnlockImpact({
          stage: stageNumber,
          downstreamStages: result.downstreamStages,
          framesAffected: 0,
          videosAffected: 0,
          estimatedCost: 'N/A',
          message: result.message || `Unlocking Stage ${stageNumber} will mark downstream stages as outdated.`,
        });
      } else {
        // No downstream impact, just unlock directly
        setPhaseAUnlockStage(stageNumber);
        setPhaseAUnlockImpact(null);
        await handleConfirmPhaseAUnlock(stageNumber);
      }
    } catch (error) {
      console.error('Failed to unlock Phase A stage:', error);
      toast.error('Failed to unlock stage');
    }
  };

  const handleConfirmPhaseAUnlock = async (stageOverride?: number) => {
    const stageNumber = stageOverride ?? phaseAUnlockStage;
    if (!projectId || !stageNumber) return;

    setIsConfirmingPhaseAUnlock(true);
    try {
      await stageStateService.unlockStage(projectId, stageNumber, true);

      // Update local stages state: set stage to active, downstream to outdated
      setStages(prev => prev.map(s => {
        if (s.stage === stageNumber) return { ...s, status: 'active' as StageStatus };
        if (s.stage > stageNumber) {
          const wasLocked = s.status === 'locked';
          return wasLocked ? { ...s, status: 'outdated' as StageStatus } : s;
        }
        return s;
      }));

      // Navigate to the unlocked stage
      setCurrentStageWithPersistence(stageNumber);
      setPhaseAUnlockStage(null);
      setPhaseAUnlockImpact(null);
      toast.success(`Stage ${stageNumber} unlocked for editing`);
    } catch (error) {
      console.error('Failed to confirm Phase A unlock:', error);
      toast.error('Failed to unlock stage');
    } finally {
      setIsConfirmingPhaseAUnlock(false);
    }
  };

  // Phase A navigation: navigate to next stage without locking (for browsing locked stages)
  const handlePhaseANext = (fromStage: number) => {
    if (fromStage < 5) {
      setCurrentStageWithPersistence(fromStage + 1);
    } else if (fromStage === 5) {
      setCurrentStageWithPersistence(6);
    }
  };

  const handleReturnToStage = (stage: number) => {
    if (stage >= 7 && stage <= 12) {
      setSceneStage(stage as SceneStage);
    }
  };

  // Phase B with active scene
  if (currentStage > 5 && activeSceneId) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <ProjectHeader
          projectTitle={projectTitle}
          currentBranch={currentBranch}
          aspectRatio={projectAspectRatio}
          onBack={handleExitScene}
          onOpenVault={() => toast.info('Artifact Vault coming soon')}
          onOpenVersionHistory={() => toast.info('Story Timelines coming soon')}
          onCreateBranch={() => toast.info('Branch creation coming soon')}
        />
        
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden">
            {sceneStage === 7 && projectId && (
              <Stage7ShotList
                projectId={projectId}
                sceneId={activeSceneId}
                onComplete={handleSceneStageComplete}
                onBack={handleSceneStageBack}
                onNext={handleSceneStageNext}
              />
            )}
            {sceneStage === 8 && projectId && activeSceneId && (
              <Stage8VisualDefinition
                projectId={projectId}
                sceneId={activeSceneId}
                onComplete={handleSceneStageComplete}
                onBack={handleSceneStageBack}
                onNext={handleSceneStageNext}
              />
            )}
            {sceneStage === 9 && projectId && activeSceneId && (
              <Stage9PromptSegmentation
                projectId={projectId}
                sceneId={activeSceneId}
                onComplete={handleSceneStageComplete}
                onBack={handleSceneStageBack}
                onNext={handleSceneStageNext}
              />
            )}
            {sceneStage === 10 && projectId && (
              <Stage10FrameGeneration
                projectId={projectId}
                sceneId={activeSceneId}
                onComplete={handleSceneStageComplete}
                onBack={handleSceneStageBack}
                onNext={handleSceneStageNext}
              />
            )}
            {sceneStage === 11 && projectId && (
              <Stage11Confirmation
                projectId={projectId}
                sceneId={activeSceneId}
                onComplete={handleSceneStageComplete}
                onBack={handleSceneStageBack}
                onNext={handleSceneStageNext}
              />
            )}
            {sceneStage === 12 && projectId && (
              <Stage12VideoGeneration
                projectId={projectId}
                sceneId={activeSceneId}
                onComplete={handleSceneStageComplete}
                onBack={handleSceneStageBack}
                onReturnToStage={handleReturnToStage}
              />
            )}
          </div>

          <SceneWorkflowSidebar
            currentStage={sceneStage}
            completedStages={completedSceneStages}
            onStageSelect={setSceneStage}
            stageLockStatuses={deriveSidebarLockStatuses()}
          />
        </div>
      </div>
    );
  }

  // Phase B - Script Hub
  if (currentStage > 5) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <ProjectHeader
          projectTitle={projectTitle}
          currentBranch={currentBranch}
          aspectRatio={projectAspectRatio}
          onBack={onBack || (() => window.history.back())}
          onOpenVault={() => toast.info('Artifact Vault coming soon')}
          onOpenVersionHistory={() => toast.info('Story Timelines coming soon')}
          onCreateBranch={() => toast.info('Branch creation coming soon')}
        />

        <Stage6ScriptHub
          onEnterScene={handleEnterScene}
          onEnterSceneAtStage={handleEnterSceneAtStage}
          onBack={() => setCurrentStageWithPersistence(5)}
        />
      </div>
    );
  }

  // Phase A
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <ProjectHeader
        projectTitle={projectTitle}
        currentBranch={currentBranch}
        aspectRatio={projectAspectRatio}
        onBack={onBack || (() => window.history.back())}
        onOpenVault={() => toast.info('Artifact Vault coming soon')}
        onOpenVersionHistory={() => toast.info('Story Timelines coming soon')}
        onCreateBranch={() => toast.info('Branch creation coming soon')}
      />

      <PhaseTimeline
        stages={stages}
        currentStage={currentStage}
        onStageClick={handleNavigate}
        showReturnToPhaseB={hasReachedPhaseB}
        onReturnToPhaseB={() => setCurrentStageWithPersistence(6)}
      />
      
      {currentStage === 1 && (
        <Stage1InputMode
          projectId={projectId}
          onComplete={() => handleStageComplete(1)}
          stageStatus={getPhaseAStageStatus(1)}
          onNext={() => handlePhaseANext(1)}
          onUnlock={() => handlePhaseAUnlock(1)}
        />
      )}
      {currentStage === 2 && (
        <Stage2Treatment
          projectId={projectId}
          onComplete={() => handleStageComplete(2)}
          onBack={() => handleGoBack(1)}
          stageStatus={getPhaseAStageStatus(2)}
          onNext={() => handlePhaseANext(2)}
          onUnlock={() => handlePhaseAUnlock(2)}
        />
      )}
      {currentStage === 3 && (
        <Stage3BeatSheet
          projectId={projectId}
          onComplete={() => handleStageComplete(3)}
          onBack={() => handleGoBack(2)}
          stageStatus={getPhaseAStageStatus(3)}
          onNext={() => handlePhaseANext(3)}
          onUnlock={() => handlePhaseAUnlock(3)}
        />
      )}
      {currentStage === 4 && (
        <Stage4MasterScript
          projectId={projectId}
          onComplete={() => handleStageComplete(4)}
          onBack={() => handleGoBack(3)}
          stageStatus={getPhaseAStageStatus(4)}
          onNext={() => handlePhaseANext(4)}
          onUnlock={() => handlePhaseAUnlock(4)}
        />
      )}
      {currentStage === 5 && (
        <Stage5Assets
          projectId={projectId}
          onComplete={() => handleStageComplete(5)}
          onBack={() => handleGoBack(4)}
          stageStatus={getPhaseAStageStatus(5)}
          onNext={() => handlePhaseANext(5)}
          onUnlock={() => handlePhaseAUnlock(5)}
        />
      )}

      {/* Phase A Unlock Warning Dialog */}
      <UnlockWarningDialog
        open={phaseAUnlockStage !== null && phaseAUnlockImpact !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPhaseAUnlockStage(null);
            setPhaseAUnlockImpact(null);
          }
        }}
        impact={phaseAUnlockImpact}
        stageNumber={phaseAUnlockStage ?? 0}
        stageTitle={`Stage ${phaseAUnlockStage}`}
        onConfirm={() => handleConfirmPhaseAUnlock()}
        isConfirming={isConfirmingPhaseAUnlock}
      />
    </div>
  );
}
