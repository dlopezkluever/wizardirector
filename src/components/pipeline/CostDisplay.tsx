import { Coins, Image as ImageIcon, Check, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface CostDisplayProps {
  totalCredits: number;
  approvedFrames: number;
  generatedFrames: number;
  generatingFrames: number;
  totalFrames: number;
  className?: string;
}

export function CostDisplay({
  totalCredits,
  approvedFrames,
  generatedFrames,
  generatingFrames,
  totalFrames,
  className,
}: CostDisplayProps) {
  const completedFrames = approvedFrames;
  const progressPercent = totalFrames > 0 ? (completedFrames / totalFrames) * 100 : 0;
  const isComplete = completedFrames === totalFrames && totalFrames > 0;

  return (
    <div
      className={cn(
        'flex items-center justify-between px-4 py-2 bg-card/50 border-b border-border/30',
        className
      )}
    >
      {/* Left: Cost */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Coins className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-medium text-foreground">
            {totalCredits.toFixed(2)} credits
          </span>
        </div>
      </div>

      {/* Center: Progress */}
      <div className="flex items-center gap-3">
        {/* Progress bar */}
        <div className="w-32 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full transition-all duration-300',
              isComplete ? 'bg-emerald-500' : 'bg-primary'
            )}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Frame counts */}
        <div className="flex items-center gap-2 text-sm">
          <Badge
            variant="outline"
            className={cn(
              'gap-1',
              isComplete
                ? 'border-emerald-500/50 text-emerald-400'
                : 'border-border'
            )}
          >
            <Check className="w-3 h-3" />
            {approvedFrames}
          </Badge>

          {generatedFrames > 0 && (
            <Badge variant="outline" className="gap-1 border-amber-500/50 text-amber-400">
              <ImageIcon className="w-3 h-3" />
              {generatedFrames}
            </Badge>
          )}

          {generatingFrames > 0 && (
            <Badge variant="outline" className="gap-1 border-blue-500/50 text-blue-400">
              <Loader2 className="w-3 h-3 animate-spin" />
              {generatingFrames}
            </Badge>
          )}

          <span className="text-muted-foreground">/ {totalFrames}</span>
        </div>
      </div>

      {/* Right: Status */}
      <div className="flex items-center">
        {isComplete ? (
          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
            <Check className="w-3 h-3 mr-1" />
            All frames approved
          </Badge>
        ) : generatingFrames > 0 ? (
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Generating...
          </Badge>
        ) : generatedFrames > 0 ? (
          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
            {generatedFrames} ready for review
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-muted-foreground">
            No frames generated
          </Badge>
        )}
      </div>
    </div>
  );
}
