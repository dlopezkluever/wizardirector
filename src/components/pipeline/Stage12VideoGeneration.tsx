import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ArrowLeft,
  AlertTriangle,
  Image as ImageIcon,
  ListOrdered,
  Video,
  MessageSquare,
  Clock,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
  Zap,
  DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { checkoutService } from '@/lib/services/checkoutService';
import type { VideoGenerationJob, VideoJobStatus, IssueType } from '@/types/scene';

const issueTypes: { type: IssueType; label: string; icon: typeof AlertTriangle; returnStage: number }[] = [
  { type: 'visual-continuity', label: 'Visual Continuity', icon: ImageIcon, returnStage: 10 },
  { type: 'timing', label: 'Timing Issue', icon: Clock, returnStage: 7 },
  { type: 'dialogue-audio', label: 'Dialogue/Audio', icon: MessageSquare, returnStage: 9 },
  { type: 'narrative-structure', label: 'Narrative Structure', icon: ListOrdered, returnStage: 7 },
];

interface Stage12VideoGenerationProps {
  projectId: string;
  sceneId: string;
  onComplete: () => void;
  onBack: () => void;
  onReturnToStage: (stage: number) => void;
}

export function Stage12VideoGeneration({
  projectId,
  sceneId,
  onComplete,
  onBack,
  onReturnToStage
}: Stage12VideoGenerationProps) {
  const [selectedIssue, setSelectedIssue] = useState<IssueType | null>(null);
  const [currentJobIndex, setCurrentJobIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Fetch video jobs with polling
  const {
    data: jobsData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['video-jobs', projectId, sceneId],
    queryFn: () => checkoutService.getVideoJobs(projectId, sceneId),
    refetchInterval: (query) => {
      // Poll every 3 seconds if there are active jobs
      const data = query.state.data;
      if (!data) return 3000;
      const hasActive = data.jobs.some(j =>
        ['queued', 'processing', 'generating', 'uploading'].includes(j.status)
      );
      return hasActive ? 3000 : false;
    },
    staleTime: 1000,
  });

  const jobs = jobsData?.jobs || [];
  const summary = jobsData?.summary || { total: 0, completed: 0, failed: 0, active: 0, progress: 0 };
  const allComplete = checkoutService.isRenderComplete(jobs);
  const allSuccessful = checkoutService.isRenderSuccessful(jobs);
  const currentJob = jobs[currentJobIndex];

  const handleIssueSelect = (type: IssueType) => {
    setSelectedIssue(type);
    const issue = issueTypes.find(i => i.type === type);
    if (issue) {
      onReturnToStage(issue.returnStage);
    }
  };

  const handleComplete = () => {
    if (allSuccessful) {
      toast.success('Scene rendering complete!');
      onComplete();
    } else if (summary.failed > 0) {
      toast.warning(`Scene complete with ${summary.failed} failed job(s)`);
      onComplete();
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading video jobs...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Failed to Load Jobs</h3>
          <p className="text-muted-foreground mb-4">
            {(error as Error)?.message || 'Unable to fetch video jobs'}
          </p>
          <Button onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // No jobs state
  if (jobs.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Video className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Video Jobs</h3>
          <p className="text-muted-foreground mb-4">
            No video generation jobs have been queued for this scene.
          </p>
          <Button onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Confirmation
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Video className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">
              Video Generation
            </h2>
            <p className="text-xs text-muted-foreground">
              {allComplete
                ? (allSuccessful ? 'All videos rendered successfully' : `Rendering complete - ${summary.failed} failed`)
                : `Rendering in progress - ${summary.active} active`}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center gap-3">
          <div className="w-48">
            <Progress value={summary.progress} className="h-2" />
          </div>
          <span className="text-sm text-muted-foreground">
            {summary.completed}/{summary.total} complete
          </span>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Video Player / Preview Area */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex-1 flex flex-col"
        >
          {/* Player Area */}
          <div className="flex-1 flex items-center justify-center bg-black/50 p-8">
            <div className="w-full max-w-4xl">
              <div className="aspect-video bg-muted/20 rounded-xl border border-border/30 overflow-hidden relative">
                {currentJob?.status === 'completed' && currentJob.videoUrl ? (
                  <>
                    <video
                      src={currentJob.videoUrl}
                      className="w-full h-full object-cover"
                      controls={isPlaying}
                      autoPlay={isPlaying}
                    />
                    {!isPlaying && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <img
                          src={currentJob.startFrameUrl}
                          alt="Video preview"
                          className="w-full h-full object-cover absolute inset-0"
                        />
                        <button
                          onClick={() => setIsPlaying(true)}
                          className="relative w-20 h-20 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-colors"
                        >
                          <Play className="w-8 h-8 text-white ml-1" />
                        </button>
                      </div>
                    )}
                  </>
                ) : currentJob?.status === 'failed' ? (
                  <div className="w-full h-full flex flex-col items-center justify-center">
                    <XCircle className="w-12 h-12 text-destructive mb-4" />
                    <span className="text-foreground font-medium">Generation Failed</span>
                    <span className="text-sm text-muted-foreground mt-1">
                      {currentJob.errorMessage || 'Unknown error'}
                    </span>
                    {currentJob.errorCode && (
                      <Badge variant="outline" className="mt-2 text-xs">
                        Error: {currentJob.errorCode}
                      </Badge>
                    )}
                  </div>
                ) : ['queued', 'processing', 'generating', 'uploading'].includes(currentJob?.status || '') ? (
                  <div className="w-full h-full flex flex-col items-center justify-center">
                    <RefreshCw className="w-12 h-12 text-primary animate-spin mb-4" />
                    <span className="text-foreground font-medium">
                      {getStatusLabel(currentJob?.status)}
                    </span>
                    <span className="text-sm text-muted-foreground mt-1">
                      Duration: {currentJob?.durationSeconds}s
                    </span>
                    {/* Preview start frame while rendering */}
                    {currentJob?.startFrameUrl && (
                      <div className="mt-4 w-40 h-24 rounded border border-border/30 overflow-hidden">
                        <img
                          src={currentJob.startFrameUrl}
                          alt="Start frame"
                          className="w-full h-full object-cover opacity-50"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center">
                    <Video className="w-12 h-12 text-muted-foreground mb-4" />
                    <span className="text-muted-foreground">Select a job to preview</span>
                  </div>
                )}
              </div>

              {/* Player Controls */}
              <div className="mt-4 flex items-center justify-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentJobIndex(Math.max(0, currentJobIndex - 1))}
                  disabled={currentJobIndex === 0}
                >
                  <SkipBack className="w-4 h-4" />
                </Button>

                <Button
                  variant="gold"
                  onClick={() => setIsPlaying(!isPlaying)}
                  disabled={!allComplete || summary.completed === 0}
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-4 h-4 mr-2" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Play Scene
                    </>
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentJobIndex(Math.min(jobs.length - 1, currentJobIndex + 1))}
                  disabled={currentJobIndex === jobs.length - 1}
                >
                  <SkipForward className="w-4 h-4" />
                </Button>
              </div>

              {/* Job Timeline */}
              <div className="mt-4 flex gap-2">
                {jobs.map((job, index) => (
                  <button
                    key={job.id}
                    onClick={() => setCurrentJobIndex(index)}
                    className={cn(
                      'flex-1 h-12 rounded-lg border transition-all relative overflow-hidden',
                      currentJobIndex === index
                        ? 'border-primary bg-primary/20'
                        : 'border-border/30 bg-card/50 hover:border-border'
                    )}
                  >
                    {/* Preview thumbnail */}
                    {job.startFrameUrl && (
                      <img
                        src={job.startFrameUrl}
                        alt=""
                        className="w-full h-full object-cover opacity-30"
                      />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <JobStatusIndicator status={job.status} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Side Panel */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-80 border-l border-border/50 bg-card/30 backdrop-blur-sm flex flex-col"
        >
          {/* Job List */}
          <div className="p-4 border-b border-border/50">
            <h3 className="font-display text-sm font-semibold text-foreground">
              Video Jobs
            </h3>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-2">
              {jobs.map((job, index) => (
                <JobCard
                  key={job.id}
                  job={job}
                  isSelected={currentJobIndex === index}
                  onClick={() => setCurrentJobIndex(index)}
                />
              ))}
            </div>
          </ScrollArea>

          {/* Issue Resolution (only show when complete) */}
          {allComplete && (
            <>
              <div className="p-4 border-t border-border/50">
                <h3 className="font-display text-sm font-semibold text-foreground">
                  Issue Resolution
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Found an issue? Select the type to return to the appropriate stage.
                </p>
              </div>

              <div className="p-4 space-y-2 border-t border-border/50">
                {issueTypes.map(({ type, label, icon: Icon, returnStage }) => (
                  <button
                    key={type}
                    onClick={() => handleIssueSelect(type)}
                    className={cn(
                      'w-full p-3 rounded-lg border text-left transition-all',
                      selectedIssue === type
                        ? 'bg-destructive/10 border-destructive/30'
                        : 'bg-card/50 border-border/30 hover:border-border'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={cn(
                        'w-5 h-5',
                        selectedIssue === type ? 'text-destructive' : 'text-muted-foreground'
                      )} />
                      <div>
                        <span className="text-sm font-medium text-foreground">{label}</span>
                        <p className="text-xs text-muted-foreground">
                          Return to Stage {returnStage}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Complete Button */}
          <div className="p-4 border-t border-border/50 space-y-2">
            <Button
              variant="gold"
              className="w-full"
              onClick={handleComplete}
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
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border/50 bg-card/30">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Confirmation
        </Button>
      </div>
    </div>
  );
}

// Helper function to get human-readable status label
function getStatusLabel(status?: VideoJobStatus): string {
  switch (status) {
    case 'queued':
      return 'Waiting in queue...';
    case 'processing':
      return 'Starting generation...';
    case 'generating':
      return 'Generating video...';
    case 'uploading':
      return 'Uploading video...';
    case 'completed':
      return 'Complete';
    case 'failed':
      return 'Failed';
    default:
      return 'Unknown';
  }
}

// Job Status Indicator Component
function JobStatusIndicator({ status }: { status: VideoJobStatus }) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="w-5 h-5 text-green-400" />;
    case 'failed':
      return <XCircle className="w-5 h-5 text-destructive" />;
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

// Job Card Component
interface JobCardProps {
  job: VideoGenerationJob;
  isSelected: boolean;
  onClick: () => void;
}

function JobCard({ job, isSelected, onClick }: JobCardProps) {
  const statusColors: Record<VideoJobStatus, string> = {
    queued: 'text-muted-foreground border-border/30',
    processing: 'text-amber-400 border-amber-400/30',
    generating: 'text-primary border-primary/30',
    uploading: 'text-blue-400 border-blue-400/30',
    completed: 'text-green-400 border-green-400/30',
    failed: 'text-destructive border-destructive/30',
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full p-3 rounded-lg border text-left transition-all',
        isSelected
          ? 'bg-primary/10 border-primary/50'
          : 'bg-card/50 border-border/30 hover:border-border'
      )}
    >
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

        {/* Job Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground truncate">
              {job.durationSeconds}s video
            </span>
            <Badge
              variant="outline"
              className={cn('text-xs', statusColors[job.status])}
            >
              <JobStatusIndicator status={job.status} />
              <span className="ml-1">{job.status}</span>
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <DollarSign className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              ${job.estimatedCost.toFixed(2)}
            </span>
            <Zap className="w-3 h-3 text-muted-foreground ml-2" />
            <span className="text-xs text-muted-foreground">
              {job.modelVariant === 'veo_3_1_fast' ? 'Fast' : 'Standard'}
            </span>
          </div>
        </div>
      </div>

      {/* Error message if failed */}
      {job.status === 'failed' && job.errorMessage && (
        <p className="text-xs text-destructive mt-2 truncate">
          {job.errorMessage}
        </p>
      )}
    </button>
  );
}
