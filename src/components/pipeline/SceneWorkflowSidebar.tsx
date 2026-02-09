import { motion } from 'framer-motion';
import {
  ListOrdered,
  Users,
  MessageSquare,
  Image,
  CreditCard,
  Play,
  Check,
  Lock,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StageLockStatus } from '@/lib/services/sceneStageLockService';

type SceneStage = 7 | 8 | 9 | 10 | 11 | 12;

interface SceneWorkflowSidebarProps {
  currentStage: SceneStage;
  completedStages: SceneStage[];
  onStageSelect: (stage: SceneStage) => void;
  stageLockStatuses?: Record<number, StageLockStatus>;
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
  onStageSelect,
  stageLockStatuses,
}: SceneWorkflowSidebarProps) {
  return (
    <motion.aside
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="w-20 border-l border-border/50 bg-card/30 backdrop-blur-sm flex flex-col items-center py-6 gap-2"
    >
      {sceneStages.map(({ stage, label, icon: Icon }) => {
        const lockStatus = stageLockStatuses?.[stage];
        const isCurrent = currentStage === stage;
        const isStageLocked = lockStatus === 'locked';
        const isStageOutdated = lockStatus === 'outdated';
        const isCompleted = completedStages.includes(stage) || isStageLocked || isStageOutdated;

        // A stage is reachable if it's locked/outdated/completed, or if all prior stages are
        const isReachable = isCompleted || isCurrent || (() => {
          // Check if stage is reachable: previous stage must be locked/completed
          for (let s = 7; s < stage; s++) {
            const prevStatus = stageLockStatuses?.[s];
            const prevCompleted = completedStages.includes(s as SceneStage);
            if (prevStatus !== 'locked' && prevStatus !== 'outdated' && !prevCompleted) {
              return false;
            }
          }
          return true;
        })();

        const isDisabled = !isReachable && !isCurrent;

        return (
          <motion.button
            key={stage}
            onClick={() => !isDisabled && onStageSelect(stage)}
            disabled={isDisabled}
            whileHover={!isDisabled ? { scale: 1.05 } : undefined}
            whileTap={!isDisabled ? { scale: 0.95 } : undefined}
            className={cn(
              'relative w-14 h-14 rounded-xl flex flex-col items-center justify-center gap-1 transition-all',
              isCurrent && 'bg-primary text-primary-foreground shadow-lg shadow-primary/25',
              isStageLocked && !isCurrent && 'bg-emerald-500/15 text-emerald-400',
              isStageOutdated && !isCurrent && 'bg-amber-500/15 text-amber-400',
              isCompleted && !isCurrent && !isStageLocked && !isStageOutdated && 'bg-primary/20 text-primary',
              !isCurrent && !isCompleted && !isDisabled && 'bg-card hover:bg-card/80 text-muted-foreground',
              isDisabled && 'bg-muted/20 text-muted-foreground/50 cursor-not-allowed'
            )}
          >
            {isStageLocked && !isCurrent ? (
              <Lock className="w-4 h-4" />
            ) : isStageOutdated && !isCurrent ? (
              <AlertTriangle className="w-4 h-4" />
            ) : isCompleted && !isCurrent && !isStageLocked && !isStageOutdated ? (
              <Check className="w-4 h-4" />
            ) : isDisabled ? (
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
