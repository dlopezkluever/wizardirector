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
  const [projectTitle, setProjectTitle] = useState('Loading...');
  const [currentBranch, setCurrentBranch] = useState('main');
  const [isLoadingProject, setIsLoadingProject] = useState(true);
  const hasRestoredStage = useRef(false);

  // Load all stage states for the project
  const { stageStates, isLoading: isLoadingStates, getStageState } = useProjectStageStates(projectId);

  // Helper function to get localStorage key for stage persistence
  const getStageStorageKey = (projectId: string | null | undefined) => {
    return projectId && projectId !== 'new' ? `project_${projectId}_stage` : null;
  };

  const getSceneIdStorageKey = (projectId: string | null | undefined) => {
    return projectId && projectId !== 'new' ? `project_${projectId}_sceneId` : null;
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

  // Wrapper for setCurrentStage that also persists
  const setCurrentStageWithPersistence = (stage: number, sceneId?: string | null) => {
    setCurrentStage(stage);
    persistStage(stage, sceneId);
  };

  // Reset restoration flag when projectId changes
  useEffect(() => {
    hasRestoredStage.current = false;
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
        if (!stageFromUrl) hasRestoredStage.current = true;
        return;
      }
      setCurrentStage(persistedStage);
      if (!stageFromUrl) hasRestoredStage.current = true;
    } else if (persistedStage === currentStage && !stageFromUrl) {
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

    // Find the highest stage number with a locked or draft status
    let highestStage = 1;
    const updatedStages = initialPhaseAStages.map(stageProgress => {
      const stageState = stageStates.find(s => s.stage_number === stageProgress.stage);
      
      if (stageState) {
        highestStage = Math.max(highestStage, stageProgress.stage);
        
        // Map database status to UI status
        if (stageState.status === 'locked') {
          return { ...stageProgress, status: 'locked' as StageStatus };
        } else if (stageState.status === 'draft') {
          return { ...stageProgress, status: 'active' as StageStatus };
        } else if (stageState.status === 'outdated') {
          return { ...stageProgress, status: 'outdated' as StageStatus };
        }
      }
      
      return stageProgress;
    });

    // Check current stage - if it's 6+, keep it (already restored)
    if (currentStage > 5) {
      setStages(updatedStages);
      return;
    }

    // For Stage 1-5, validate currentStage is allowed
    // If currentStage was restored and is valid, keep it
    const maxAllowedStage = Math.min(highestStage + 1, 5);
    
    if (currentStage <= maxAllowedStage && currentStage >= 1) {
      // Current stage is valid, just update the stages array
      const finalStages = updatedStages.map(s => 
        s.stage === currentStage ? { ...s, status: 'active' as StageStatus } : s
      );
      setStages(finalStages);
      // Ensure it's persisted
      persistStage(currentStage);
      return;
    }

    // Current stage is invalid or not set, use the calculated next stage
    const nextStage = Math.min(highestStage + 1, 5);
    const finalStages = updatedStages.map(s => 
      s.stage === nextStage ? { ...s, status: 'active' as StageStatus } : s
    );

    setStages(finalStages);
    setCurrentStageWithPersistence(nextStage);
  }, [stageStates, isLoadingStates, projectId, currentStage]);

  // Navigation guard: Ensure currentStage is always valid
  useEffect(() => {
    // Allow Stage 6+ (Phase B) to proceed without validation against Phase A stages
    if (currentStage > 5) {
      return;
    }

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

    if (stageFromUrl) {
      const stage = parseInt(stageFromUrl, 10);
      if (!isNaN(stage) && stage >= 7) {
        const sceneId = sceneIdFromUrl ?? (stage === 8 ? localStorage.getItem(getSceneIdStorageKey(projectId) ?? '') : null);
        if (sceneId) {
          setActiveSceneId(sceneId);
          setSceneStage(stage as SceneStage);
          setCurrentStage(stage);
          // Restore completedSceneStages so sidebar allows navigating back to Stage 8 after viewing Stage 7
          setCompletedSceneStages(
            Array.from({ length: Math.max(0, stage - 7) }, (_, i) => (7 + i) as SceneStage)
          );
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
      setCompletedSceneStages(
        Array.from({ length: Math.max(0, currentStage - 7) }, (_, i) => (7 + i) as SceneStage)
      );
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

  const handleEnterScene = (sceneId: string) => {
    setActiveSceneId(sceneId);
    setSceneStage(7);
    setCompletedSceneStages([]);
    setCurrentStageWithPersistence(7, sceneId);
  };

  const handleExitScene = () => {
    setActiveSceneId(null);
    setSceneStage(7);
    setCurrentStageWithPersistence(6);
  };

  const handleSceneStageComplete = () => {
    setCompletedSceneStages(prev => [...prev, sceneStage]);
    if (sceneStage < 12) {
      setSceneStage((sceneStage + 1) as SceneStage);
    } else {
      toast.success('Scene completed!');
      handleExitScene();
    }
  };

  const handleSceneStageBack = () => {
    if (sceneStage > 7) {
      setSceneStage((sceneStage - 1) as SceneStage);
    } else {
      handleExitScene();
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
              />
            )}
            {sceneStage === 8 && projectId && activeSceneId && (
              <Stage8VisualDefinition 
                projectId={projectId}
                sceneId={activeSceneId} 
                onComplete={handleSceneStageComplete}
                onBack={handleSceneStageBack}
              />
            )}
            {sceneStage === 9 && projectId && activeSceneId && (
              <Stage9PromptSegmentation
                projectId={projectId}
                sceneId={activeSceneId}
                onComplete={handleSceneStageComplete}
                onBack={handleSceneStageBack}
              />
            )}
            {sceneStage === 10 && projectId && (
              <Stage10FrameGeneration 
                projectId={projectId}
                sceneId={activeSceneId} 
                onComplete={handleSceneStageComplete}
                onBack={handleSceneStageBack}
              />
            )}
            {sceneStage === 11 && (
              <Stage11Confirmation 
                sceneId={activeSceneId} 
                onComplete={handleSceneStageComplete}
                onBack={handleSceneStageBack}
              />
            )}
            {sceneStage === 12 && (
              <Stage12VideoGeneration 
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
          onBack={onBack || (() => window.history.back())}
          onOpenVault={() => toast.info('Artifact Vault coming soon')}
          onOpenVersionHistory={() => toast.info('Story Timelines coming soon')}
          onCreateBranch={() => toast.info('Branch creation coming soon')}
        />
        
        <Stage6ScriptHub 
          onEnterScene={handleEnterScene}
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
        onBack={onBack || (() => window.history.back())}
        onOpenVault={() => toast.info('Artifact Vault coming soon')}
        onOpenVersionHistory={() => toast.info('Story Timelines coming soon')}
        onCreateBranch={() => toast.info('Branch creation coming soon')}
      />
      
      <PhaseTimeline stages={stages} currentStage={currentStage} onStageClick={handleNavigate} />
      
      {currentStage === 1 && (
        <Stage1InputMode projectId={projectId} onComplete={() => handleStageComplete(1)} />
      )}
      {currentStage === 2 && <Stage2Treatment projectId={projectId} onComplete={() => handleStageComplete(2)} onBack={() => handleGoBack(1)} />}
      {currentStage === 3 && <Stage3BeatSheet projectId={projectId} onComplete={() => handleStageComplete(3)} onBack={() => handleGoBack(2)} />}
      {currentStage === 4 && <Stage4MasterScript projectId={projectId} onComplete={() => handleStageComplete(4)} onBack={() => handleGoBack(3)} />}
      {currentStage === 5 && <Stage5Assets projectId={projectId} onComplete={() => handleStageComplete(5)} onBack={() => handleGoBack(4)} />}
    </div>
  );
}
