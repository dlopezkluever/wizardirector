import { useState } from 'react';
import { toast } from 'sonner';
import { PhaseTimeline } from '@/components/pipeline/PhaseTimeline';
import { ProjectHeader } from '@/components/pipeline/ProjectHeader';
import { Stage1InputMode } from '@/components/pipeline/Stage1InputMode';
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

  // Mock project data - in production this would come from state/API
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

  const handleOpenVault = () => {
    toast.info('Artifact Vault coming soon');
  };

  const handleOpenVersionHistory = () => {
    toast.info('Story Timelines coming soon');
  };

  const handleCreateBranch = () => {
    toast.info('Branch creation coming soon');
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <ProjectHeader
        projectTitle={projectTitle}
        currentBranch={currentBranch}
        onBack={onBack}
        onOpenVault={handleOpenVault}
        onOpenVersionHistory={handleOpenVersionHistory}
        onCreateBranch={handleCreateBranch}
      />
      
      <PhaseTimeline stages={stages} currentStage={currentStage} />
      
      {/* Stage Content */}
      {currentStage === 1 && (
        <Stage1InputMode onComplete={() => handleStageComplete(1)} />
      )}
      
      {currentStage > 1 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p className="text-xl font-display">Stage {currentStage}: {stages[currentStage - 1]?.label}</p>
            <p className="mt-2">This stage is under development</p>
          </div>
        </div>
      )}
    </div>
  );
}
