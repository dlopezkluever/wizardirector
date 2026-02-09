import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
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
  DollarSign,
  Maximize,
  Volume2,
  VolumeX,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { checkoutService } from '@/lib/services/checkoutService';
import type { VideoGenerationJob, VideoJobStatus, IssueType } from '@/types/scene';
import { LockedStageHeader } from './LockedStageHeader';
import { useSceneStageLock } from '@/lib/hooks/useSceneStageLock';

const issueTypes: { type: IssueType; label: string; icon: typeof AlertTriangle; returnStage: number; description: string }[] = [
  { type: 'visual-continuity', label: 'Visual Continuity', icon: ImageIcon, returnStage: 8, description: 'Character appearance, set dressing, or visual style issues' },
  { type: 'timing', label: 'Timing Issue', icon: Clock, returnStage: 7, description: 'Shot duration, pacing, or rhythm problems' },
  { type: 'dialogue-audio', label: 'Dialogue/Audio', icon: MessageSquare, returnStage: 9, description: 'Dialogue timing, audio sync, or voice issues' },
  { type: 'narrative-structure', label: 'Narrative Structure', icon: ListOrdered, returnStage: 7, description: 'Story flow, scene ordering, or dramatic beat issues' },
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
  const { isLocked: isStageLocked, lockStage } = useSceneStageLock({ projectId, sceneId });
  const stage12Locked = isStageLocked(12);
  const [selectedIssue, setSelectedIssue] = useState<IssueType | null>(null);
  const [issueDescription, setIssueDescription] = useState('');
  const [showIssueConfirm, setShowIssueConfirm] = useState(false);
  const [currentShotIndex, setCurrentShotIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [wasAllComplete, setWasAllComplete] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

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
      const data = query.state.data;
      if (!data) return 3000;
      const hasActive = data.jobs.some(j =>
        ['queued', 'processing', 'generating', 'uploading'].includes(j.status)
      );
      return hasActive ? 3000 : false;
    },
    staleTime: 1000,
  });

  const jobs = useMemo(() => jobsData?.jobs || [], [jobsData?.jobs]);
  const summary = jobsData?.summary || { total: 0, completed: 0, failed: 0, active: 0, progress: 0 };
  const allComplete = checkoutService.isRenderComplete(jobs);
  const allSuccessful = checkoutService.isRenderSuccessful(jobs);
  const currentJob = jobs[currentShotIndex];

  // Completed jobs sorted by their order for sequential playback
  const completedJobs = jobs.filter(j => j.status === 'completed' && j.videoUrl);

  // Toast notification when rendering completes
  useEffect(() => {
    if (allComplete && !wasAllComplete && jobs.length > 0) {
      if (allSuccessful) {
        toast.success('All videos rendered! Ready for review.');
      } else if (summary.failed > 0) {
        toast.warning(`Rendering complete with ${summary.failed} failed job(s)`);
      }
      setWasAllComplete(true);
    }
  }, [allComplete, wasAllComplete, allSuccessful, summary.failed, jobs.length]);

  // Handle video ended - auto-advance to next shot
  const handleVideoEnded = useCallback(() => {
    const nextIndex = currentShotIndex + 1;
    if (nextIndex < jobs.length && jobs[nextIndex]?.status === 'completed' && jobs[nextIndex]?.videoUrl) {
      setCurrentShotIndex(nextIndex);
      // Video src change will trigger play via the effect below
    } else {
      setIsPlaying(false);
    }
  }, [currentShotIndex, jobs]);

  // Update video src and play state when currentShotIndex changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const job = jobs[currentShotIndex];
    if (job?.status === 'completed' && job.videoUrl) {
      video.src = job.videoUrl;
      if (isPlaying) {
        video.play().catch(() => { /* user interaction required */ });
      }
    }
  }, [currentShotIndex, jobs, isPlaying]);

  // Track playback progress
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      if (video.duration > 0) {
        setPlaybackProgress((video.currentTime / video.duration) * 100);
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, []);

  const handlePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      // If no video loaded yet, start from first completed job
      if (!video.src && completedJobs.length > 0) {
        const firstCompletedIdx = jobs.findIndex(j => j.status === 'completed' && j.videoUrl);
        if (firstCompletedIdx >= 0) {
          setCurrentShotIndex(firstCompletedIdx);
        }
      }
      video.play().then(() => setIsPlaying(true)).catch(() => { /* user interaction required */ });
    }
  }, [isPlaying, completedJobs.length, jobs]);

  const handleSkipBack = () => {
    const prevIndex = Math.max(0, currentShotIndex - 1);
    setCurrentShotIndex(prevIndex);
  };

  const handleSkipForward = () => {
    const nextIndex = Math.min(jobs.length - 1, currentShotIndex + 1);
    setCurrentShotIndex(nextIndex);
  };

  const handleToggleMute = () => {
    const video = videoRef.current;
    if (video) {
      video.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleFullscreen = () => {
    const video = videoRef.current;
    if (video?.requestFullscreen) {
      video.requestFullscreen();
    }
  };

  const handleRetryJob = async (jobId: string) => {
    try {
      await checkoutService.retryVideoJob(projectId, sceneId, jobId);
      toast.success('Job queued for retry');
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to retry job');
    }
  };

  const handleIssueSelect = (type: IssueType) => {
    setSelectedIssue(type);
    setShowIssueConfirm(true);
  };

  const handleIssueConfirm = () => {
    const issue = issueTypes.find(i => i.type === selectedIssue);
    if (issue) {
      setShowIssueConfirm(false);
      setSelectedIssue(null);
      setIssueDescription('');
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

  // Calculate total scene duration for timeline proportions
  const totalDuration = jobs.reduce((sum, j) => sum + (j.durationSeconds || 0), 0);

  // Calculate ETA based on average generation time
  const getETA = () => {
    const completedWithTime = jobs.filter(j => j.status === 'completed' && j.processingStartedAt && j.completedAt);
    if (completedWithTime.length === 0) return null;

    const avgTime = completedWithTime.reduce((sum, j) => {
      const start = new Date(j.processingStartedAt!).getTime();
      const end = new Date(j.completedAt!).getTime();
      return sum + (end - start);
    }, 0) / completedWithTime.length;

    const remainingJobs = summary.active;
    const etaMs = avgTime * remainingJobs;
    const etaMinutes = Math.ceil(etaMs / 60000);
    return etaMinutes > 0 ? `~${etaMinutes}m remaining` : 'Almost done...';
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
      {stage12Locked && (
        <LockedStageHeader
          stageNumber={12}
          title="Video Generation"
          isLocked={true}
          onBack={onBack}
          lockAndProceedLabel="Complete Scene"
          onLockAndProceed={async () => {
            try { await lockStage(12); } catch { /* best-effort */ }
            onComplete();
          }}
        />
      )}

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
              {!allComplete && getETA() && (
                <span className="ml-2 text-primary">{getETA()}</span>
              )}
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
                {/* Hidden video element for playback */}
                <video
                  ref={videoRef}
                  className={cn(
                    'w-full h-full object-cover',
                    (currentJob?.status === 'completed' && currentJob.videoUrl) ? 'block' : 'hidden'
                  )}
                  onEnded={handleVideoEnded}
                  muted={isMuted}
                  playsInline
                />

                {/* Shot label overlay */}
                {isPlaying && currentJob && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm rounded-md px-2 py-1"
                  >
                    <span className="text-xs text-white font-mono">
                      Shot {currentShotIndex + 1}/{jobs.length}
                    </span>
                  </motion.div>
                )}

                {/* Non-playing completed state: show start frame with play button */}
                {!isPlaying && currentJob?.status === 'completed' && currentJob.videoUrl && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    {currentJob.startFrameUrl && (
                      <img
                        src={currentJob.startFrameUrl}
                        alt="Video preview"
                        className="w-full h-full object-cover absolute inset-0"
                      />
                    )}
                    <button
                      onClick={handlePlayPause}
                      className="relative w-20 h-20 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-colors"
                    >
                      <Play className="w-8 h-8 text-white ml-1" />
                    </button>
                  </div>
                )}

                {/* Failed state */}
                {currentJob?.status === 'failed' && (
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
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => handleRetryJob(currentJob.id)}
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Retry Job
                    </Button>
                  </div>
                )}

                {/* Rendering state */}
                {['queued', 'processing', 'generating', 'uploading'].includes(currentJob?.status || '') && (
                  <div className="w-full h-full flex flex-col items-center justify-center relative">
                    {/* Background start frame preview */}
                    {currentJob?.startFrameUrl && (
                      <img
                        src={currentJob.startFrameUrl}
                        alt="Start frame preview"
                        className="absolute inset-0 w-full h-full object-cover opacity-20"
                      />
                    )}
                    <div className="relative z-10 flex flex-col items-center">
                      <RefreshCw className="w-12 h-12 text-primary animate-spin mb-4" />
                      <span className="text-foreground font-medium">
                        {getStatusLabel(currentJob?.status)}
                      </span>
                      <span className="text-sm text-muted-foreground mt-1">
                        Duration: {currentJob?.durationSeconds}s
                      </span>
                    </div>
                  </div>
                )}

                {/* No job selected state */}
                {!currentJob && (
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
                  onClick={handleSkipBack}
                  disabled={currentShotIndex === 0}
                >
                  <SkipBack className="w-4 h-4" />
                </Button>

                <Button
                  variant="gold"
                  onClick={handlePlayPause}
                  disabled={completedJobs.length === 0}
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
                  onClick={handleSkipForward}
                  disabled={currentShotIndex === jobs.length - 1}
                >
                  <SkipForward className="w-4 h-4" />
                </Button>

                <div className="border-l border-border/30 h-6 mx-2" />

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleToggleMute}
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleFullscreen}
                  disabled={!currentJob?.videoUrl}
                >
                  <Maximize className="w-4 h-4" />
                </Button>
              </div>

              {/* Segmented Timeline */}
              <div className="mt-4 flex gap-1 h-10">
                {jobs.map((job, index) => {
                  const widthPercent = totalDuration > 0
                    ? (job.durationSeconds / totalDuration) * 100
                    : (100 / jobs.length);

                  return (
                    <button
                      key={job.id}
                      onClick={() => setCurrentShotIndex(index)}
                      style={{ width: `${widthPercent}%` }}
                      className={cn(
                        'rounded-md border transition-all relative overflow-hidden flex-shrink-0',
                        currentShotIndex === index
                          ? 'border-primary ring-1 ring-primary/50'
                          : 'border-border/30 hover:border-border',
                        getTimelineSegmentColor(job.status)
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
                        <span className="text-[10px] text-white/70 font-mono">
                          {index + 1}
                        </span>
                      </div>
                      {/* Active shot playback indicator */}
                      {isPlaying && currentShotIndex === index && (
                        <div
                          className="absolute bottom-0 left-0 h-0.5 bg-primary transition-all"
                          style={{ width: `${playbackProgress}%` }}
                        />
                      )}
                    </button>
                  );
                })}
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
          {/* Job List Header */}
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
                  shotIndex={index}
                  isSelected={currentShotIndex === index}
                  onClick={() => setCurrentShotIndex(index)}
                  onRetry={() => handleRetryJob(job.id)}
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
                {issueTypes.map(({ type, label, icon: Icon, returnStage, description }) => (
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
                        'w-5 h-5 flex-shrink-0',
                        selectedIssue === type ? 'text-destructive' : 'text-muted-foreground'
                      )} />
                      <div className="min-w-0">
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

      {/* Footer — hidden when locked */}
      {!stage12Locked && (
        <div className="p-4 border-t border-border/50 bg-card/30">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Confirmation
          </Button>
        </div>
      )}

      {/* Issue Confirmation Dialog */}
      <AnimatePresence>
        {showIssueConfirm && selectedIssue && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowIssueConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-border rounded-xl p-6 max-w-md mx-4"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-semibold text-foreground">
                    Return to Stage {issueTypes.find(i => i.type === selectedIssue)?.returnStage}?
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {issueTypes.find(i => i.type === selectedIssue)?.label}
                  </p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-4">
                This will return you to an earlier stage to resolve the issue.
                Your current video jobs will be preserved.
              </p>

              {/* Issue description text area */}
              <div className="mb-4">
                <label className="text-sm font-medium text-foreground block mb-1">
                  Describe the issue (optional)
                </label>
                <textarea
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  placeholder="What specifically needs to be fixed..."
                  className="w-full h-20 px-3 py-2 rounded-lg bg-muted/50 border border-border/50 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowIssueConfirm(false);
                    setSelectedIssue(null);
                    setIssueDescription('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="gold"
                  className="flex-1"
                  onClick={handleIssueConfirm}
                >
                  Return to Stage {issueTypes.find(i => i.type === selectedIssue)?.returnStage}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Helper: get human-readable status label
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

// Helper: get timeline segment background color
function getTimelineSegmentColor(status: VideoJobStatus): string {
  switch (status) {
    case 'completed':
      return 'bg-emerald-500/20';
    case 'failed':
      return 'bg-destructive/20';
    case 'queued':
      return 'bg-muted/30';
    case 'processing':
    case 'generating':
    case 'uploading':
      return 'bg-amber-500/20';
    default:
      return 'bg-muted/20';
  }
}

// Job Status Indicator Component
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

// Job Card Component
interface JobCardProps {
  job: VideoGenerationJob;
  shotIndex: number;
  isSelected: boolean;
  onClick: () => void;
  onRetry: () => void;
}

function JobCard({ job, shotIndex, isSelected, onClick, onRetry }: JobCardProps) {
  const statusColors: Record<VideoJobStatus, string> = {
    queued: 'text-muted-foreground border-border/30',
    processing: 'text-amber-400 border-amber-400/30',
    generating: 'text-primary border-primary/30',
    uploading: 'text-blue-400 border-blue-400/30',
    completed: 'text-green-400 border-green-400/30',
    failed: 'text-destructive border-destructive/30',
  };

  // Calculate generation time for completed jobs
  const genTime = job.status === 'completed' && job.processingStartedAt && job.completedAt
    ? Math.round((new Date(job.completedAt).getTime() - new Date(job.processingStartedAt).getTime()) / 1000)
    : null;

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
            <span className="text-xs font-mono text-primary">
              Shot {shotIndex + 1}
            </span>
            <span className="text-sm font-medium text-foreground truncate">
              {job.durationSeconds}s
            </span>
            <Badge
              variant="outline"
              className={cn('text-xs ml-auto', statusColors[job.status])}
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
            {genTime !== null && (
              <>
                <Clock className="w-3 h-3 text-muted-foreground ml-2" />
                <span className="text-xs text-muted-foreground">
                  {genTime}s
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Error message if failed */}
      {job.status === 'failed' && (
        <div className="mt-2">
          {job.errorMessage && (
            <p className="text-xs text-destructive truncate mb-1">
              {job.errorMessage}
            </p>
          )}
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs h-7"
            onClick={(e) => {
              e.stopPropagation();
              onRetry();
            }}
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Retry
          </Button>
        </div>
      )}
    </button>
  );
}
