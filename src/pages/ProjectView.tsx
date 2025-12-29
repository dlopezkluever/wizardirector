import { useState } from 'react';
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

const initialPhaseAStages: StageProgress[] = [
  { stage: 1, status: 'active' as StageStatus, label: 'Input' },
  { stage: 2, status: 'pending' as StageStatus, label: 'Treatment' },
  { stage: 3, status: 'pending' as StageStatus, label: 'Beat Sheet' },
  { stage: 4, status: 'pending' as StageStatus, label: 'Script' },
  { stage: 5, status: 'pending' as StageStatus, label: 'Assets' },
];

interface ProjectViewProps {
  projectId: string;
  onBack: () => void;
}

type SceneStage = 7 | 8 | 9 | 10 | 11 | 12;

export function ProjectView({ projectId, onBack }: ProjectViewProps) {
  const [currentStage, setCurrentStage] = useState(1);
  const [stages, setStages] = useState<StageProgress[]>(initialPhaseAStages);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [sceneStage, setSceneStage] = useState<SceneStage>(7);
  const [completedSceneStages, setCompletedSceneStages] = useState<SceneStage[]>([]);

  const projectTitle = projectId === 'new' ? 'New Project' : 'The Last Sunset';
  const currentBranch = 'main';

  const handleStageComplete = (stageNumber: number) => {
    setStages(prev => prev.map(s => 
      s.stage === stageNumber 
        ? { ...s, status: 'locked' as StageStatus }
        : s.stage === stageNumber + 1
          ? { ...s, status: 'active' as StageStatus }
          : s
    ));
    setCurrentStage(stageNumber + 1);
    toast.success(`Stage ${stageNumber} completed`);
  };

  const handleGoBack = (toStage: number) => {
    setCurrentStage(toStage);
  };

  const handleEnterScene = (sceneId: string) => {
    setActiveSceneId(sceneId);
    setSceneStage(7);
    setCompletedSceneStages([]);
  };

  const handleExitScene = () => {
    setActiveSceneId(null);
    setSceneStage(7);
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
            {sceneStage === 7 && (
              <Stage7ShotList 
                sceneId={activeSceneId} 
                onComplete={handleSceneStageComplete}
                onBack={handleSceneStageBack}
              />
            )}
            {sceneStage === 8 && (
              <Stage8VisualDefinition 
                sceneId={activeSceneId} 
                onComplete={handleSceneStageComplete}
                onBack={handleSceneStageBack}
              />
            )}
            {sceneStage === 9 && (
              <Stage9PromptSegmentation 
                sceneId={activeSceneId} 
                onComplete={handleSceneStageComplete}
                onBack={handleSceneStageBack}
              />
            )}
            {sceneStage === 10 && (
              <Stage10FrameGeneration 
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
          onBack={onBack}
          onOpenVault={() => toast.info('Artifact Vault coming soon')}
          onOpenVersionHistory={() => toast.info('Story Timelines coming soon')}
          onCreateBranch={() => toast.info('Branch creation coming soon')}
        />
        
        <Stage6ScriptHub 
          onEnterScene={handleEnterScene}
          onBack={() => setCurrentStage(5)}
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
        onBack={onBack}
        onOpenVault={() => toast.info('Artifact Vault coming soon')}
        onOpenVersionHistory={() => toast.info('Story Timelines coming soon')}
        onCreateBranch={() => toast.info('Branch creation coming soon')}
      />
      
      <PhaseTimeline stages={stages} currentStage={currentStage} />
      
      {currentStage === 1 && <Stage1InputMode onComplete={() => handleStageComplete(1)} />}
      {currentStage === 2 && <Stage2Treatment onComplete={() => handleStageComplete(2)} onBack={() => handleGoBack(1)} />}
      {currentStage === 3 && <Stage3BeatSheet onComplete={() => handleStageComplete(3)} onBack={() => handleGoBack(2)} />}
      {currentStage === 4 && <Stage4MasterScript onComplete={() => handleStageComplete(4)} onBack={() => handleGoBack(3)} />}
      {currentStage === 5 && <Stage5Assets onComplete={() => handleStageComplete(5)} onBack={() => handleGoBack(4)} />}
    </div>
  );
}
