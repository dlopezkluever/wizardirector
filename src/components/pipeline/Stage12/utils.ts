import type { VideoGenerationJob, VideoJobStatus } from '@/types/scene';
import type { ShotTimelineSegment } from './types';

/** Human-readable status label */
export function getStatusLabel(status?: VideoJobStatus): string {
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

/** Timeline segment background color by status */
export function getTimelineSegmentColor(status: VideoJobStatus): string {
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

/** Build cumulative offset array for timeline segments */
export function computeTimelineSegments(jobs: VideoGenerationJob[]): {
  segments: ShotTimelineSegment[];
  totalDuration: number;
} {
  const totalDuration = jobs.reduce((sum, j) => sum + (j.durationSeconds || 0), 0);

  let offset = 0;
  const segments: ShotTimelineSegment[] = jobs.map((job, index) => {
    const dur = job.durationSeconds || 0;
    const seg: ShotTimelineSegment = {
      jobIndex: index,
      job,
      startOffset: offset,
      endOffset: offset + dur,
      durationSeconds: dur,
      widthPercent: totalDuration > 0 ? (dur / totalDuration) * 100 : 100 / jobs.length,
      isPlayable: job.status === 'completed' && !!job.videoUrl,
    };
    offset += dur;
    return seg;
  });

  return { segments, totalDuration };
}

/** Map a global playhead time to a specific shot + local offset */
export function resolveGlobalTime(
  segments: ShotTimelineSegment[],
  globalTime: number
): { shotIndex: number; localOffset: number } {
  if (segments.length === 0) return { shotIndex: 0, localOffset: 0 };

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (globalTime < seg.endOffset || i === segments.length - 1) {
      return {
        shotIndex: i,
        localOffset: Math.max(0, globalTime - seg.startOffset),
      };
    }
  }

  return { shotIndex: 0, localOffset: 0 };
}

/** ETA based on average generation time */
export function computeETA(jobs: VideoGenerationJob[], activeCount: number): string | null {
  const completedWithTime = jobs.filter(
    j => j.status === 'completed' && j.processingStartedAt && j.completedAt
  );
  if (completedWithTime.length === 0) return null;

  const avgTime =
    completedWithTime.reduce((sum, j) => {
      const start = new Date(j.processingStartedAt!).getTime();
      const end = new Date(j.completedAt!).getTime();
      return sum + (end - start);
    }, 0) / completedWithTime.length;

  const etaMs = avgTime * activeCount;
  const etaMinutes = Math.ceil(etaMs / 60000);
  return etaMinutes > 0 ? `~${etaMinutes}m remaining` : 'Almost done...';
}
