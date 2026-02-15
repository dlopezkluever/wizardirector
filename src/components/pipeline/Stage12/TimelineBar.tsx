import { useRef, useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import type { TimelineBarProps } from './types';
import { getTimelineSegmentColor, resolveGlobalTime } from './utils';

export function TimelineBar({
  segments,
  totalDuration,
  globalTimePosition,
  currentShotIndex,
  isPlaying,
  onSeek,
}: TimelineBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const rafRef = useRef<number | null>(null);

  const computeSeekFromX = useCallback(
    (clientX: number) => {
      const bar = barRef.current;
      if (!bar || totalDuration === 0) return;
      const rect = bar.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const globalTime = ratio * totalDuration;
      const { shotIndex, localOffset } = resolveGlobalTime(segments, globalTime);
      onSeek(shotIndex, localOffset);
    },
    [segments, totalDuration, onSeek]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      computeSeekFromX(e.clientX);

      const handleMouseMove = (ev: MouseEvent) => {
        if (rafRef.current !== null) return;
        rafRef.current = requestAnimationFrame(() => {
          computeSeekFromX(ev.clientX);
          rafRef.current = null;
        });
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [computeSeekFromX]
  );

  const playheadPercent = totalDuration > 0 ? (globalTimePosition / totalDuration) * 100 : 0;

  return (
    <div
      ref={barRef}
      className={cn('relative h-12 select-none', isDragging ? 'cursor-grabbing' : 'cursor-pointer')}
      onMouseDown={handleMouseDown}
    >
      {/* Segment track */}
      <div className="flex h-full gap-0.5">
        {segments.map((seg) => (
          <div
            key={seg.jobIndex}
            style={{ width: `${seg.widthPercent}%` }}
            className={cn(
              'rounded-sm border border-border/20 relative overflow-hidden flex-shrink-0 transition-colors',
              currentShotIndex === seg.jobIndex && 'ring-1 ring-primary/50 border-primary',
              getTimelineSegmentColor(seg.job.status)
            )}
          >
            {/* Optional thumbnail bg */}
            {seg.job.startFrameUrl && (
              <img
                src={seg.job.startFrameUrl}
                alt=""
                className="w-full h-full object-cover opacity-20 pointer-events-none"
              />
            )}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-[10px] text-white/70 font-mono">{seg.jobIndex + 1}</span>
            </div>
            {/* Per-segment progress indicator when playing */}
            {isPlaying && currentShotIndex === seg.jobIndex && seg.durationSeconds > 0 && (
              <div
                className="absolute bottom-0 left-0 h-0.5 bg-primary transition-all"
                style={{
                  width: `${Math.min(100, ((globalTimePosition - seg.startOffset) / seg.durationSeconds) * 100)}%`,
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Playhead */}
      <div
        className="absolute top-0 bottom-0 pointer-events-none"
        style={{ left: `${playheadPercent}%` }}
      >
        <div className="relative h-full">
          {/* Vertical line */}
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary -translate-x-1/2" />
          {/* Grab handle */}
          <div className="absolute left-0 -top-1 w-3 h-3 rounded-full bg-primary border-2 border-background -translate-x-1/2" />
        </div>
      </div>
    </div>
  );
}
