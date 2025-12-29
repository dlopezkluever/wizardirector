import { motion } from 'framer-motion';
import { 
  ListOrdered, 
  Users, 
  MessageSquare, 
  Image, 
  CreditCard, 
  Play,
  Check,
  Lock
} from 'lucide-react';
import { cn } from '@/lib/utils';

type SceneStage = 7 | 8 | 9 | 10 | 11 | 12;

interface SceneWorkflowSidebarProps {
  currentStage: SceneStage;
  completedStages: SceneStage[];
  onStageSelect: (stage: SceneStage) => void;
}

const sceneStages = [
  { stage: 7 as SceneStage, label: 'Shot List', icon: ListOrdered },
  { stage: 8 as SceneStage, label: 'Visuals', icon: Users },
  { stage: 9 as SceneStage, label: 'Prompts', icon: MessageSquare },
  { stage: 10 as SceneStage, label: 'Frames', icon: Image },
  { stage: 11 as SceneStage, label: 'Review', icon: CreditCard },
  { stage: 12 as SceneStage, label: 'Video', icon: Play },
];

export function SceneWorkflowSidebar({ 
  currentStage, 
  completedStages, 
  onStageSelect 
}: SceneWorkflowSidebarProps) {
  return (
    <motion.aside
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="w-20 border-l border-border/50 bg-card/30 backdrop-blur-sm flex flex-col items-center py-6 gap-2"
    >
      {sceneStages.map(({ stage, label, icon: Icon }, index) => {
        const isCompleted = completedStages.includes(stage);
        const isCurrent = currentStage === stage;
        const isLocked = !isCompleted && stage > Math.max(...completedStages, 6) + 1;
        const previousCompleted = index === 0 || completedStages.includes(sceneStages[index - 1].stage);

        return (
          <motion.button
            key={stage}
            onClick={() => !isLocked && onStageSelect(stage)}
            disabled={isLocked}
            whileHover={!isLocked ? { scale: 1.05 } : undefined}
            whileTap={!isLocked ? { scale: 0.95 } : undefined}
            className={cn(
              'relative w-14 h-14 rounded-xl flex flex-col items-center justify-center gap-1 transition-all',
              isCurrent && 'bg-primary text-primary-foreground shadow-lg shadow-primary/25',
              isCompleted && !isCurrent && 'bg-primary/20 text-primary',
              !isCurrent && !isCompleted && !isLocked && 'bg-card hover:bg-card/80 text-muted-foreground',
              isLocked && 'bg-muted/20 text-muted-foreground/50 cursor-not-allowed'
            )}
          >
            {isCompleted && !isCurrent ? (
              <Check className="w-4 h-4" />
            ) : isLocked ? (
              <Lock className="w-4 h-4" />
            ) : (
              <Icon className="w-4 h-4" />
            )}
            <span className="text-[10px] font-medium">{label}</span>
            
            {/* Stage number badge */}
            <span className={cn(
              'absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center',
              isCurrent ? 'bg-background text-primary' : 'bg-muted text-muted-foreground'
            )}>
              {stage}
            </span>
          </motion.button>
        );
      })}
    </motion.aside>
  );
}
