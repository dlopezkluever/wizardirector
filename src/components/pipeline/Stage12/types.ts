import type { VideoGenerationJob, IssueType } from '@/types/scene';

/** Computed per-shot metadata for the virtual timeline */
export interface ShotTimelineSegment {
  jobIndex: number;
  job: VideoGenerationJob;
  startOffset: number;
  endOffset: number;
  durationSeconds: number;
  widthPercent: number;
  isPlayable: boolean;
}

export interface SeekTarget {
  shotIndex: number;
  timeOffset: number;
}

export interface VideoPlayerProps {
  jobs: VideoGenerationJob[];
  currentShotIndex: number;
  isPlaying: boolean;
  isMuted: boolean;
  seekTarget: SeekTarget | null;
  onPlayPause: () => void;
  onShotEnded: () => void;
  onTimeUpdate: (shotIndex: number, currentTime: number, duration: number) => void;
  onSeekComplete: () => void;
  onSkipBack: () => void;
  onSkipForward: () => void;
  onToggleMute: () => void;
  onFullscreen: () => void;
  onRetryJob: (jobId: string) => void;
}

export interface TimelineBarProps {
  segments: ShotTimelineSegment[];
  totalDuration: number;
  globalTimePosition: number;
  currentShotIndex: number;
  isPlaying: boolean;
  onSeek: (shotIndex: number, timeOffset: number) => void;
}

export interface ShotListPanelProps {
  jobs: VideoGenerationJob[];
  currentShotIndex: number;
  allComplete: boolean;
  summary: {
    total: number;
    completed: number;
    failed: number;
    active: number;
    progress: number;
  };
  onSelectShot: (index: number) => void;
  onRetryJob: (jobId: string) => void;
  onComplete: () => void;
  onReturnToStage: (stage: number) => void;
}

export interface IssueResolutionSectionProps {
  onReturnToStage: (stage: number) => void;
}
