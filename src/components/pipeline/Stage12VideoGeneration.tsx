import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowLeft,
  AlertTriangle,
  Video,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { checkoutService } from '@/lib/services/checkoutService';
import { LockedStageHeader } from './LockedStageHeader';
import { useSceneStageLock } from '@/lib/hooks/useSceneStageLock';
import { ContentAccessCarousel } from './ContentAccessCarousel';
import { SceneIndicator } from './SceneIndicator';
import { useSceneInfo } from '@/hooks/useSceneInfo';
import { VideoPlayer } from './Stage12/VideoPlayer';
import { TimelineBar } from './Stage12/TimelineBar';
import { ShotListPanel } from './Stage12/ShotListPanel';
import { computeTimelineSegments, computeETA } from './Stage12/utils';
import type { SeekTarget } from './Stage12/types';

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
  onReturnToStage,
}: Stage12VideoGenerationProps) {
  const { sceneNumber, slug: sceneSlug } = useSceneInfo(sceneId);
  const { isLocked: isStageLocked, lockStage } = useSceneStageLock({ projectId, sceneId });
  const stage12Locked = isStageLocked(12);

  // Orchestrator state
  const [currentShotIndex, setCurrentShotIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [globalTimePosition, setGlobalTimePosition] = useState(0);
  const [seekTarget, setSeekTarget] = useState<SeekTarget | null>(null);
  const [wasAllComplete, setWasAllComplete] = useState(false);
  const videoPlayerContainerRef = useRef<HTMLDivElement>(null);

  // Data fetching with polling
  const { data: jobsData, isLoading, error, refetch } = useQuery({
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

  const { segments, totalDuration } = useMemo(() => computeTimelineSegments(jobs), [jobs]);
  const eta = useMemo(() => computeETA(jobs, summary.active), [jobs, summary.active]);

  // Toast on completion
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

  // --- Callbacks ---

  const handleShotEnded = useCallback(() => {
    // Find next playable shot
    for (let i = currentShotIndex + 1; i < jobs.length; i++) {
      if (jobs[i].status === 'completed' && jobs[i].videoUrl) {
        setCurrentShotIndex(i);
        return;
      }
    }
    // No more playable shots — pause
    setIsPlaying(false);
  }, [currentShotIndex, jobs]);

  const handleSeek = useCallback((shotIndex: number, timeOffset: number) => {
    setCurrentShotIndex(shotIndex);
    setSeekTarget({ shotIndex, timeOffset });
  }, []);

  const handleTimeUpdate = useCallback(
    (shotIndex: number, currentTime: number, _duration: number) => {
      if (segments[shotIndex]) {
        setGlobalTimePosition(segments[shotIndex].startOffset + currentTime);
      }
    },
    [segments]
  );

  const handleSeekComplete = useCallback(() => {
    setSeekTarget(null);
  }, []);

  const handleSelectShot = useCallback((index: number) => {
    setCurrentShotIndex(index);
    setIsPlaying(false);
  }, []);

  const handlePlayPause = useCallback(() => {
    if (!isPlaying) {
      // If current shot isn't playable, find first playable
      const currentJob = jobs[currentShotIndex];
      if (!currentJob || currentJob.status !== 'completed' || !currentJob.videoUrl) {
        const firstPlayable = jobs.findIndex(j => j.status === 'completed' && j.videoUrl);
        if (firstPlayable >= 0) setCurrentShotIndex(firstPlayable);
      }
    }
    setIsPlaying(prev => !prev);
  }, [isPlaying, jobs, currentShotIndex]);

  const handleSkipBack = useCallback(() => {
    setCurrentShotIndex(prev => Math.max(0, prev - 1));
  }, []);

  const handleSkipForward = useCallback(() => {
    setCurrentShotIndex(prev => Math.min(jobs.length - 1, prev + 1));
  }, [jobs.length]);

  const handleToggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  const handleFullscreen = useCallback(() => {
    const container = videoPlayerContainerRef.current;
    if (container?.requestFullscreen) {
      container.requestFullscreen();
    }
  }, []);

  const handleRetryJob = useCallback(async (jobId: string) => {
    try {
      await checkoutService.retryVideoJob(projectId, sceneId, jobId);
      toast.success('Job queued for retry');
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to retry job');
    }
  }, [projectId, sceneId, refetch]);

  const handleComplete = useCallback(() => {
    if (allSuccessful) {
      toast.success('Scene rendering complete!');
      onComplete();
    } else if (summary.failed > 0) {
      toast.warning(`Scene complete with ${summary.failed} failed job(s)`);
      onComplete();
    }
  }, [allSuccessful, summary.failed, onComplete]);

  // --- Render ---

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

      <ContentAccessCarousel
        projectId={projectId}
        sceneId={sceneId}
        stageNumber={12}
      />

      {/* Header */}
      <div className="p-4 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Video className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
              Video Generation
              <SceneIndicator sceneNumber={sceneNumber} slug={sceneSlug} />
            </h2>
            <p className="text-xs text-muted-foreground">
              {allComplete
                ? (allSuccessful ? 'All videos rendered successfully' : `Rendering complete - ${summary.failed} failed`)
                : `Rendering in progress - ${summary.active} active`}
              {!allComplete && eta && (
                <span className="ml-2 text-primary">{eta}</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-48">
            <Progress value={summary.progress} className="h-2" />
          </div>
          <span className="text-sm text-muted-foreground">
            {summary.completed}/{summary.total} complete
          </span>
        </div>
      </div>

      {/* Main content: video player left, shot list right */}
      <div className="flex-1 flex overflow-hidden">
        <motion.div
          ref={videoPlayerContainerRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex-1 flex flex-col"
        >
          <VideoPlayer
            jobs={jobs}
            currentShotIndex={currentShotIndex}
            isPlaying={isPlaying}
            isMuted={isMuted}
            seekTarget={seekTarget}
            onPlayPause={handlePlayPause}
            onShotEnded={handleShotEnded}
            onTimeUpdate={handleTimeUpdate}
            onSeekComplete={handleSeekComplete}
            onSkipBack={handleSkipBack}
            onSkipForward={handleSkipForward}
            onToggleMute={handleToggleMute}
            onFullscreen={handleFullscreen}
            onRetryJob={handleRetryJob}
          />

          {/* Timeline bar below the player */}
          <div className="px-4 pb-4">
            <TimelineBar
              segments={segments}
              totalDuration={totalDuration}
              globalTimePosition={globalTimePosition}
              currentShotIndex={currentShotIndex}
              isPlaying={isPlaying}
              onSeek={handleSeek}
            />
          </div>
        </motion.div>

        <ShotListPanel
          jobs={jobs}
          currentShotIndex={currentShotIndex}
          allComplete={allComplete}
          summary={summary}
          onSelectShot={handleSelectShot}
          onRetryJob={handleRetryJob}
          onComplete={handleComplete}
          onReturnToStage={onReturnToStage}
        />
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
    </div>
  );
}
