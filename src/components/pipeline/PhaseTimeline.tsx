import { motion } from 'framer-motion';
import { Check, Circle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StageProgress, StageStatus } from '@/types/project';

interface PhaseTimelineProps {
  stages: StageProgress[];
  currentStage: number;
}

const stageIcons: Record<StageStatus, React.ElementType> = {
  locked: Check,
  active: Circle,
  pending: Circle,
  outdated: AlertTriangle,
};

export function PhaseTimeline({ stages, currentStage }: PhaseTimelineProps) {
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
                  stage.status === 'outdated' && 'stage-node-outdated'
                )}
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
    </div>
  );
}
