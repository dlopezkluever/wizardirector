import { motion } from 'framer-motion';
import {
  Image as ImageIcon,
  Check,
  RefreshCw,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { ShotWithFrames, Frame } from '@/types/scene';

interface FrameGridProps {
  shots: ShotWithFrames[];
  onSelectShot: (shotId: string) => void;
  onGenerateAll: () => void;
  onApproveAllGenerated: () => void;
  isGenerating: boolean;
  selectedShotId?: string;
}

function FrameThumbnail({
  frame,
  label,
  requiresFrame = true,
}: {
  frame: Frame | null;
  label: string;
  requiresFrame?: boolean;
}) {
  if (!requiresFrame) {
    return (
      <div className="aspect-video rounded border border-border/20 bg-muted/20 flex items-center justify-center">
        <span className="text-[8px] text-muted-foreground/50">N/A</span>
      </div>
    );
  }

  const status = frame?.status || 'pending';

  return (
    <div
      className={cn(
        'aspect-video rounded border overflow-hidden relative',
        status === 'approved' && 'border-emerald-500/50',
        status === 'generated' && 'border-amber-500/50',
        status === 'generating' && 'border-blue-500/50',
        status === 'rejected' && 'border-red-500/50',
        status === 'pending' && 'border-border/30'
      )}
    >
      {frame?.imageUrl ? (
        <img
          src={frame.imageUrl}
          alt={label}
          className="w-full h-full object-cover"
        />
      ) : status === 'generating' ? (
        <div className="w-full h-full bg-blue-500/10 flex items-center justify-center">
          <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />
        </div>
      ) : (
        <div className="w-full h-full bg-muted/30 flex items-center justify-center">
          <ImageIcon className="w-3 h-3 text-muted-foreground/50" />
        </div>
      )}

      {/* Status indicator */}
      {status === 'approved' && (
        <div className="absolute top-0.5 right-0.5">
          <div className="w-3 h-3 rounded-full bg-emerald-500 flex items-center justify-center">
            <Check className="w-2 h-2 text-white" />
          </div>
        </div>
      )}
    </div>
  );
}

export function FrameGrid({
  shots,
  onSelectShot,
  onGenerateAll,
  onApproveAllGenerated,
  isGenerating,
  selectedShotId,
}: FrameGridProps) {
  // Calculate stats
  const totalFrames = shots.reduce(
    (acc, shot) => acc + 1 + (shot.requiresEndFrame ? 1 : 0),
    0
  );

  const generatedFrames = shots.reduce((acc, shot) => {
    let count = 0;
    if (shot.startFrame?.status === 'generated') count++;
    if (shot.endFrame?.status === 'generated') count++;
    return acc + count;
  }, 0);

  const approvedFrames = shots.reduce((acc, shot) => {
    let count = 0;
    if (shot.startFrame?.status === 'approved') count++;
    if (shot.endFrame?.status === 'approved') count++;
    return acc + count;
  }, 0);

  const generatingFrames = shots.reduce((acc, shot) => {
    let count = 0;
    if (shot.startFrame?.status === 'generating') count++;
    if (shot.endFrame?.status === 'generating') count++;
    return acc + count;
  }, 0);

  const pendingFrames = shots.reduce((acc, shot) => {
    let count = 0;
    const startStatus = shot.startFrame?.status || 'pending';
    const endStatus = shot.endFrame?.status || 'pending';
    if (startStatus === 'pending' || startStatus === 'rejected') count++;
    if (shot.requiresEndFrame && (endStatus === 'pending' || endStatus === 'rejected')) count++;
    return acc + count;
  }, 0);

  const canGenerateAll = pendingFrames > 0 && !isGenerating;
  const canApproveAll = generatedFrames > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header with bulk actions */}
      <div className="flex items-center justify-between p-4 border-b border-border/30">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-medium text-foreground">All Frames</h3>
          <div className="flex items-center gap-2 text-xs">
            <Badge variant="outline" className="gap-1">
              <Check className="w-3 h-3 text-emerald-500" />
              {approvedFrames}
            </Badge>
            {generatedFrames > 0 && (
              <Badge variant="outline" className="gap-1 text-amber-400">
                <AlertCircle className="w-3 h-3" />
                {generatedFrames}
              </Badge>
            )}
            {generatingFrames > 0 && (
              <Badge variant="outline" className="gap-1 text-blue-400">
                <Loader2 className="w-3 h-3 animate-spin" />
                {generatingFrames}
              </Badge>
            )}
            <span className="text-muted-foreground">/ {totalFrames} frames</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onApproveAllGenerated}
            disabled={!canApproveAll || isGenerating}
          >
            <Check className="w-4 h-4 mr-1" />
            Approve All Ready
          </Button>
          <Button
            variant="gold"
            size="sm"
            onClick={onGenerateAll}
            disabled={!canGenerateAll}
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <ImageIcon className="w-4 h-4 mr-1" />
                {pendingFrames === totalFrames ? 'Generate All' : 'Generate Remaining'}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Grid */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {shots.map((shot, index) => {
              const isSelected = shot.id === selectedShotId;
              const startApproved = shot.startFrame?.status === 'approved';
              const endApproved = !shot.requiresEndFrame || shot.endFrame?.status === 'approved';
              const allApproved = startApproved && endApproved;

              return (
                <motion.button
                  key={shot.id}
                  onClick={() => onSelectShot(shot.id)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    'p-3 rounded-lg border transition-all text-left',
                    isSelected
                      ? 'bg-primary/10 border-primary/50'
                      : allApproved
                      ? 'bg-emerald-500/5 border-emerald-500/30 hover:border-emerald-500/50'
                      : 'bg-card/50 border-border/30 hover:border-border'
                  )}
                >
                  {/* Shot header */}
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="font-mono text-xs">
                      {shot.shotId}
                    </Badge>
                    {allApproved && (
                      <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <Check className="w-3 h-3 text-emerald-500" />
                      </div>
                    )}
                  </div>

                  {/* Frame thumbnails */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <div>
                      <span className="text-[9px] text-muted-foreground block mb-0.5">
                        Start
                      </span>
                      <FrameThumbnail frame={shot.startFrame} label="Start" />
                    </div>
                    <div>
                      <span className="text-[9px] text-muted-foreground block mb-0.5">
                        End
                      </span>
                      <FrameThumbnail
                        frame={shot.endFrame}
                        label="End"
                        requiresFrame={shot.requiresEndFrame}
                      />
                    </div>
                  </div>

                  {/* Shot info */}
                  <div className="mt-2 text-xs text-muted-foreground truncate">
                    {shot.setting}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
