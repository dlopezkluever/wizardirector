import { useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Video,
  XCircle,
  RefreshCw,
  RotateCcw,
  Maximize,
  Volume2,
  VolumeX,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { VideoPlayerProps } from './types';
import { getStatusLabel } from './utils';

export function VideoPlayer({
  jobs,
  currentShotIndex,
  isPlaying,
  isMuted,
  seekTarget,
  onPlayPause,
  onShotEnded,
  onTimeUpdate,
  onSeekComplete,
  onSkipBack,
  onSkipForward,
  onToggleMute,
  onFullscreen,
  onRetryJob,
}: VideoPlayerProps) {
  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);
  const activeSlotRef = useRef<'A' | 'B'>('A');
  const preloadReadyRef = useRef(false);
  const preloadedIndexRef = useRef<number | null>(null);

  const currentJob = jobs[currentShotIndex];
  const completedJobs = jobs.filter(j => j.status === 'completed' && j.videoUrl);
  const isCurrentPlayable = currentJob?.status === 'completed' && !!currentJob.videoUrl;

  const getActiveVideo = useCallback(() => {
    return activeSlotRef.current === 'A' ? videoARef.current : videoBRef.current;
  }, []);

  const getPreloadVideo = useCallback(() => {
    return activeSlotRef.current === 'A' ? videoBRef.current : videoARef.current;
  }, []);

  // Find next playable shot index after the given index
  const findNextPlayable = useCallback(
    (afterIndex: number): number | null => {
      for (let i = afterIndex + 1; i < jobs.length; i++) {
        if (jobs[i].status === 'completed' && jobs[i].videoUrl) return i;
      }
      return null;
    },
    [jobs]
  );

  // Preload next playable shot
  const preloadNext = useCallback(
    (afterIndex: number) => {
      const nextIdx = findNextPlayable(afterIndex);
      if (nextIdx === null) {
        preloadReadyRef.current = false;
        preloadedIndexRef.current = null;
        return;
      }

      const preloadEl = getPreloadVideo();
      if (!preloadEl) return;

      const url = jobs[nextIdx].videoUrl!;
      preloadReadyRef.current = false;
      preloadedIndexRef.current = nextIdx;
      preloadEl.src = url;
      preloadEl.load();

      const onCanPlay = () => {
        preloadReadyRef.current = true;
        preloadEl.removeEventListener('canplaythrough', onCanPlay);
      };
      preloadEl.addEventListener('canplaythrough', onCanPlay);
    },
    [findNextPlayable, getPreloadVideo, jobs]
  );

  // Load current shot on active video element
  useEffect(() => {
    const activeEl = getActiveVideo();
    if (!activeEl) return;

    if (isCurrentPlayable) {
      // Check if preloaded slot already has this shot — if so, swap
      if (preloadedIndexRef.current === currentShotIndex && preloadReadyRef.current) {
        activeSlotRef.current = activeSlotRef.current === 'A' ? 'B' : 'A';
        const newActive = getActiveVideo();
        const oldActive = getPreloadVideo();
        if (newActive && oldActive) {
          newActive.style.display = 'block';
          oldActive.style.display = 'none';
          oldActive.pause();
          if (isPlaying) {
            newActive.play().catch(() => {});
          }
          preloadNext(currentShotIndex);
        }
        return;
      }

      activeEl.src = currentJob.videoUrl!;
      activeEl.load();
      if (isPlaying) {
        const onLoaded = () => {
          activeEl.play().catch(() => {});
          activeEl.removeEventListener('loadeddata', onLoaded);
        };
        activeEl.addEventListener('loadeddata', onLoaded);
      }
      preloadNext(currentShotIndex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentShotIndex, isCurrentPlayable]);

  // Play / pause sync
  useEffect(() => {
    const activeEl = getActiveVideo();
    if (!activeEl || !isCurrentPlayable) return;

    if (isPlaying) {
      activeEl.play().catch(() => {});
    } else {
      activeEl.pause();
    }
  }, [isPlaying, getActiveVideo, isCurrentPlayable]);

  // Mute sync
  useEffect(() => {
    const a = videoARef.current;
    const b = videoBRef.current;
    if (a) a.muted = isMuted;
    if (b) b.muted = isMuted;
  }, [isMuted]);

  // Handle seek target command prop
  useEffect(() => {
    if (!seekTarget) return;

    const activeEl = getActiveVideo();
    if (!activeEl) { onSeekComplete(); return; }

    if (seekTarget.shotIndex === currentShotIndex && isCurrentPlayable) {
      // Same shot — just seek
      activeEl.currentTime = seekTarget.timeOffset;
      onSeekComplete();
    }
    // If different shot, orchestrator already updated currentShotIndex — the
    // effect above will load the correct video. We just need to set currentTime
    // once it's loaded.
    else if (seekTarget.shotIndex !== currentShotIndex) {
      // Will be handled by the load effect + a one-time loadeddata listener
      const onLoaded = () => {
        activeEl.currentTime = seekTarget.timeOffset;
        onSeekComplete();
        activeEl.removeEventListener('loadeddata', onLoaded);
      };
      activeEl.addEventListener('loadeddata', onLoaded);
    } else {
      onSeekComplete();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seekTarget]);

  // timeupdate event → notify orchestrator
  useEffect(() => {
    const activeEl = getActiveVideo();
    if (!activeEl) return;

    const handleTime = () => {
      if (activeEl.duration > 0) {
        onTimeUpdate(currentShotIndex, activeEl.currentTime, activeEl.duration);
      }
    };

    activeEl.addEventListener('timeupdate', handleTime);
    return () => activeEl.removeEventListener('timeupdate', handleTime);
  }, [currentShotIndex, getActiveVideo, onTimeUpdate]);

  // ended event → auto-advance with pre-loaded swap
  useEffect(() => {
    const activeEl = getActiveVideo();
    if (!activeEl) return;

    const handleEnded = () => {
      const nextIdx = findNextPlayable(currentShotIndex);
      if (nextIdx === null) {
        onShotEnded();
        return;
      }

      // If preloaded and ready, do seamless swap
      if (preloadedIndexRef.current === nextIdx && preloadReadyRef.current) {
        activeSlotRef.current = activeSlotRef.current === 'A' ? 'B' : 'A';
        const newActive = getActiveVideo();
        const oldActive = getPreloadVideo();
        if (newActive && oldActive) {
          newActive.style.display = 'block';
          oldActive.style.display = 'none';
          oldActive.pause();
          newActive.play().catch(() => {});
        }
        preloadReadyRef.current = false;
        preloadedIndexRef.current = null;
      }
      onShotEnded();
    };

    activeEl.addEventListener('ended', handleEnded);
    return () => activeEl.removeEventListener('ended', handleEnded);
  }, [currentShotIndex, findNextPlayable, getActiveVideo, getPreloadVideo, onShotEnded]);

  // Ensure correct slot visibility on mount
  useEffect(() => {
    const a = videoARef.current;
    const b = videoBRef.current;
    if (a) a.style.display = activeSlotRef.current === 'A' ? 'block' : 'none';
    if (b) b.style.display = activeSlotRef.current === 'B' ? 'block' : 'none';
  }, []);

  const isRendering = ['queued', 'processing', 'generating', 'uploading'].includes(currentJob?.status || '');

  return (
    <div className="flex-1 flex flex-col">
      {/* Player Area */}
      <div className="flex-1 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-4xl">
          <div className="aspect-video bg-muted/20 rounded-xl border border-border/30 overflow-hidden relative">
            {/* Dual video elements */}
            <video
              ref={videoARef}
              className="w-full h-full object-cover absolute inset-0"
              muted={isMuted}
              playsInline
            />
            <video
              ref={videoBRef}
              className="w-full h-full object-cover absolute inset-0"
              style={{ display: 'none' }}
              muted={isMuted}
              playsInline
            />

            {/* Shot label overlay */}
            {isPlaying && currentJob && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm rounded-md px-2 py-1 z-10"
              >
                <span className="text-xs text-white font-mono">
                  Shot {currentShotIndex + 1}/{jobs.length}
                </span>
              </motion.div>
            )}

            {/* Paused + completed: start frame + play button */}
            {!isPlaying && isCurrentPlayable && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-10">
                {currentJob.startFrameUrl && (
                  <img
                    src={currentJob.startFrameUrl}
                    alt="Video preview"
                    className="w-full h-full object-cover absolute inset-0"
                  />
                )}
                <button
                  onClick={onPlayPause}
                  className="relative w-20 h-20 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-colors"
                >
                  <Play className="w-8 h-8 text-white ml-1" />
                </button>
              </div>
            )}

            {/* Failed state */}
            {currentJob?.status === 'failed' && (
              <div className="w-full h-full flex flex-col items-center justify-center relative z-10">
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
                  onClick={() => onRetryJob(currentJob.id)}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Retry Job
                </Button>
              </div>
            )}

            {/* Rendering state */}
            {isRendering && (
              <div className="w-full h-full flex flex-col items-center justify-center relative z-10">
                {currentJob?.startFrameUrl && (
                  <img
                    src={currentJob.startFrameUrl}
                    alt="Start frame preview"
                    className="absolute inset-0 w-full h-full object-cover opacity-20"
                  />
                )}
                <div className="relative z-10 flex flex-col items-center">
                  <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                  <span className="text-foreground font-medium">
                    {getStatusLabel(currentJob?.status)}
                  </span>
                  <span className="text-sm text-muted-foreground mt-1">
                    Duration: {currentJob?.durationSeconds}s
                  </span>
                </div>
              </div>
            )}

            {/* No job selected */}
            {!currentJob && (
              <div className="w-full h-full flex flex-col items-center justify-center relative z-10">
                <Video className="w-12 h-12 text-muted-foreground mb-4" />
                <span className="text-muted-foreground">Select a job to preview</span>
              </div>
            )}
          </div>

          {/* Playback controls bar */}
          <div className="mt-4 flex items-center justify-center gap-4">
            <Button variant="ghost" size="sm" onClick={onSkipBack} disabled={currentShotIndex === 0}>
              <SkipBack className="w-4 h-4" />
            </Button>

            <Button variant="gold" onClick={onPlayPause} disabled={completedJobs.length === 0}>
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

            <Button variant="ghost" size="sm" onClick={onSkipForward} disabled={currentShotIndex === jobs.length - 1}>
              <SkipForward className="w-4 h-4" />
            </Button>

            <div className="border-l border-border/30 h-6 mx-2" />

            <Button variant="ghost" size="sm" onClick={onToggleMute}>
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>

            <Button variant="ghost" size="sm" onClick={onFullscreen} disabled={!isCurrentPlayable}>
              <Maximize className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
