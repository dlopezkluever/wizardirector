import { useState } from 'react';
import { toast } from 'sonner';
import { PhaseTimeline } from '@/components/pipeline/PhaseTimeline';
import { ProjectHeader } from '@/components/pipeline/ProjectHeader';
import { Stage1InputMode } from '@/components/pipeline/Stage1InputMode';
import { Stage2Treatment } from '@/components/pipeline/Stage2Treatment';
import { Stage3BeatSheet } from '@/components/pipeline/Stage3BeatSheet';
import { Stage4MasterScript } from '@/components/pipeline/Stage4MasterScript';
import { Stage5Assets } from '@/components/pipeline/Stage5Assets';
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

export function ProjectView({ projectId, onBack }: ProjectViewProps) {
  const [currentStage, setCurrentStage] = useState(1);
  const [stages, setStages] = useState<StageProgress[]>(initialPhaseAStages);

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
      
      {currentStage > 5 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="font-display text-2xl font-bold text-primary mb-2">Phase A Complete!</h2>
            <p className="text-muted-foreground">Ready for Phase B: Production Engine</p>
          </div>
        </div>
      )}
    </div>
  );
}
