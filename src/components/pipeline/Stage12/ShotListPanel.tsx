import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Video,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  DollarSign,
  Zap,
  RotateCcw,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { VideoGenerationJob, VideoJobStatus } from '@/types/scene';
import type { ShotListPanelProps } from './types';
import { getStatusLabel } from './utils';
import { IssueResolutionSection } from './IssueResolutionSection';

const statusColors: Record<VideoJobStatus, string> = {
  queued: 'text-muted-foreground border-border/30',
  processing: 'text-amber-400 border-amber-400/30',
  generating: 'text-primary border-primary/30',
  uploading: 'text-blue-400 border-blue-400/30',
  completed: 'text-green-400 border-green-400/30',
  failed: 'text-destructive border-destructive/30',
};

function JobStatusIndicator({ status }: { status: VideoJobStatus }) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="w-4 h-4 text-green-400" />;
    case 'failed':
      return <XCircle className="w-4 h-4 text-destructive" />;
    case 'queued':
      return <Clock className="w-4 h-4 text-muted-foreground" />;
    case 'processing':
    case 'generating':
    case 'uploading':
      return <RefreshCw className="w-4 h-4 text-primary animate-spin" />;
    default:
      return null;
  }
}

interface ShotCardProps {
  job: VideoGenerationJob;
  shotIndex: number;
  isSelected: boolean;
  isExpanded: boolean;
  onClick: () => void;
  onToggleExpand: () => void;
  onRetry: () => void;
}

function ShotCard({ job, shotIndex, isSelected, isExpanded, onClick, onToggleExpand, onRetry }: ShotCardProps) {
  const genTime = job.status === 'completed' && job.processingStartedAt && job.completedAt
    ? Math.round((new Date(job.completedAt).getTime() - new Date(job.processingStartedAt).getTime()) / 1000)
    : null;

  return (
    <div
      className={cn(
        'rounded-lg border transition-all',
        isSelected
          ? 'bg-primary/10 border-primary/50'
          : 'bg-card/50 border-border/30 hover:border-border'
      )}
    >
      {/* Main row — clickable to select shot */}
      <button onClick={onClick} className="w-full p-3 text-left">
        <div className="flex items-center gap-3">
          {/* Thumbnail */}
          <div className="w-12 h-8 rounded border border-border/30 overflow-hidden bg-muted/50 flex-shrink-0">
            {job.startFrameUrl ? (
              <img src={job.startFrameUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Video className="w-3 h-3 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Shot info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-primary">Shot {shotIndex + 1}</span>
              <span className="text-sm font-medium text-foreground">{job.durationSeconds}s</span>
              <Badge variant="outline" className={cn('text-xs ml-auto', statusColors[job.status])}>
                <JobStatusIndicator status={job.status} />
                <span className="ml-1">{job.status}</span>
              </Badge>
            </div>
          </div>

          {/* Expand toggle */}
          <button
            onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
            className="p-1 hover:bg-muted/50 rounded"
          >
            <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', isExpanded && 'rotate-180')} />
          </button>
        </div>
      </button>

      {/* Expandable details */}
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-border/20 pt-2 space-y-1">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <DollarSign className="w-3 h-3" />${job.estimatedCost.toFixed(2)}
            </span>
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3" />{job.modelVariant === 'veo_3_1_fast' ? 'Fast' : 'Standard'}
            </span>
            {genTime !== null && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />{genTime}s
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{getStatusLabel(job.status)}</p>

          {job.status === 'failed' && (
            <div className="mt-1">
              {job.errorMessage && (
                <p className="text-xs text-destructive truncate mb-1">{job.errorMessage}</p>
              )}
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs h-7"
                onClick={(e) => { e.stopPropagation(); onRetry(); }}
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Retry
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ShotListPanel({
  jobs,
  currentShotIndex,
  allComplete,
  summary,
  onSelectShot,
  onRetryJob,
  onComplete,
  onReturnToStage,
}: ShotListPanelProps) {
  // By default the selected card is expanded
  const [expandedIndex, setExpandedIndex] = useState<number | null>(currentShotIndex);

  const handleToggleExpand = (index: number) => {
    setExpandedIndex(prev => (prev === index ? null : index));
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="w-80 border-l border-border/50 bg-card/30 backdrop-blur-sm flex flex-col"
    >
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <h3 className="font-display text-sm font-semibold text-foreground">Shot Review</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {summary.completed}/{summary.total} completed
        </p>
      </div>

      {/* Shot list */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {jobs.map((job, index) => (
            <ShotCard
              key={job.id}
              job={job}
              shotIndex={index}
              isSelected={currentShotIndex === index}
              isExpanded={expandedIndex === index}
              onClick={() => onSelectShot(index)}
              onToggleExpand={() => handleToggleExpand(index)}
              onRetry={() => onRetryJob(job.id)}
            />
          ))}
        </div>
      </ScrollArea>

      {/* Issue Resolution (only when all complete) */}
      {allComplete && <IssueResolutionSection onReturnToStage={onReturnToStage} />}

      {/* Complete Button */}
      <div className="p-4 border-t border-border/50 space-y-2">
        <Button
          variant="gold"
          className="w-full"
          onClick={onComplete}
          disabled={!allComplete}
        >
          <CheckCircle2 className="w-4 h-4 mr-2" />
          {allComplete ? 'Complete Scene' : `Rendering... ${summary.progress}%`}
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          {allComplete ? 'Returns to Script Hub' : 'Please wait for rendering to complete'}
        </p>
      </div>
    </motion.div>
  );
}
