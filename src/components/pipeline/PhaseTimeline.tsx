import { motion } from 'framer-motion';
import { Check, Circle, AlertTriangle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StageProgress, StageStatus } from '@/types/project';

interface PhaseTimelineProps {
  stages: StageProgress[];
  currentStage: number;
  onStageClick?: (stageNumber: number) => void;
  showReturnToPhaseB?: boolean;
  onReturnToPhaseB?: () => void;
}

const stageIcons: Record<StageStatus, React.ElementType> = {
  locked: Check,
  active: Circle,
  pending: Circle,
  outdated: AlertTriangle,
};

export function PhaseTimeline({ stages, currentStage, onStageClick, showReturnToPhaseB, onReturnToPhaseB }: PhaseTimelineProps) {
  return (
    <div className="flex items-center gap-2 px-6 py-4 bg-card border-b border-border overflow-x-auto">
      {stages.map((stage, index) => {
        const Icon = stageIcons[stage.status];
        const isLast = index === stages.length - 1;

        return (
          <div key={stage.stage} className="flex items-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center gap-2"
            >
              {/* Stage Node */}
              <div
                className={cn(
                  'stage-node',
                  stage.status === 'locked' && 'stage-node-locked',
                  stage.status === 'active' && 'stage-node-active',
                  stage.status === 'pending' && 'stage-node-pending',
                  stage.status === 'outdated' && 'stage-node-outdated',
                  onStageClick && stage.status !== 'pending' && 'cursor-pointer hover:scale-110 transition-transform'
                )}
                onClick={() => {
                  if (onStageClick && stage.status !== 'pending') {
                    onStageClick(stage.stage);
                  }
                }}
              >
                <Icon className="w-4 h-4" />
              </div>

              {/* Stage Label */}
              <div className="flex flex-col min-w-[80px]">
                <span className="text-xs text-muted-foreground">
                  Stage {stage.stage}
                </span>
                <span
                  className={cn(
                    'text-sm font-medium',
                    stage.status === 'active' && 'text-primary',
                    stage.status === 'locked' && 'text-success',
                    stage.status === 'pending' && 'text-muted-foreground',
                    stage.status === 'outdated' && 'text-warning'
                  )}
                >
                  {stage.label}
                </span>
              </div>
            </motion.div>

            {/* Connector Line */}
            {!isLast && (
              <div
                className={cn(
                  'w-8 h-0.5 mx-2',
                  index < currentStage - 1
                    ? 'bg-success'
                    : 'bg-border'
                )}
              />
            )}
          </div>
        );
      })}

      {showReturnToPhaseB && onReturnToPhaseB && (
        <motion.button
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          onClick={onReturnToPhaseB}
          className="ml-auto flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/20 border border-primary text-primary text-sm font-medium hover:bg-primary/30 transition-colors whitespace-nowrap cursor-pointer"
        >
          Script Hub
          <ArrowRight className="w-4 h-4" />
        </motion.button>
      )}
    </div>
  );
}
