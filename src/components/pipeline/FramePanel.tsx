import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Image as ImageIcon,
  RefreshCw,
  Check,
  X,
  Paintbrush,
  Eye,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Frame, FrameType } from '@/types/scene';

interface FramePanelProps {
  frame: Frame | null;
  frameType: FrameType;
  shotId: string;
  isDisabled?: boolean;
  disabledReason?: string;
  onGenerate: () => void;
  onApprove: () => void;
  onReject: () => void;
  onRegenerate: () => void;
  onInpaint: () => void;
  onCompare?: () => void;
  showCompare?: boolean;
}

const STATUS_STYLES: Record<string, { badge: string; label: string }> = {
  pending: { badge: 'bg-muted text-muted-foreground', label: 'Pending' },
  generating: { badge: 'bg-blue-500/20 text-blue-400', label: 'Generating' },
  generated: { badge: 'bg-amber-500/20 text-amber-400', label: 'Ready' },
  approved: { badge: 'bg-emerald-500/20 text-emerald-400', label: 'Approved' },
  rejected: { badge: 'bg-red-500/20 text-red-400', label: 'Rejected' },
};

export function FramePanel({
  frame,
  frameType,
  shotId,
  isDisabled = false,
  disabledReason,
  onGenerate,
  onApprove,
  onReject,
  onRegenerate,
  onInpaint,
  onCompare,
  showCompare = false,
}: FramePanelProps) {
  const [imageError, setImageError] = useState(false);

  const status = frame?.status || 'pending';
  const hasImage = frame?.imageUrl && !imageError;
  const isGenerating = status === 'generating';
  const isApproved = status === 'approved';
  const canApprove = status === 'generated';
  const canRegenerate = status === 'generated' || status === 'rejected' || status === 'approved';
  const needsGeneration = status === 'pending' || status === 'rejected';

  const statusStyle = STATUS_STYLES[status] || STATUS_STYLES.pending;

  return (
    <div className={cn('flex flex-col', isDisabled && 'opacity-60')}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-foreground capitalize">
          {frameType} Frame
        </h3>
        <Badge variant="secondary" className={statusStyle.badge}>
          {isGenerating && <RefreshCw className="w-3 h-3 mr-1 animate-spin" />}
          {statusStyle.label}
        </Badge>
      </div>

      {/* Frame Display */}
      <div
        className={cn(
          'aspect-video bg-muted/50 rounded-lg border overflow-hidden relative group',
          isApproved ? 'border-emerald-500/50' : 'border-border/30',
          isGenerating && 'border-blue-500/30'
        )}
      >
        {hasImage ? (
          <>
            <motion.img
              src={frame.imageUrl!}
              alt={`${frameType} frame for shot ${shotId}`}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            />
            {/* Hover actions overlay */}
            {!isDisabled && !isGenerating && (
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  variant="glass"
                  size="sm"
                  onClick={onInpaint}
                  disabled={!hasImage}
                >
                  <Paintbrush className="w-4 h-4 mr-1" />
                  Inpaint
                </Button>
                {showCompare && onCompare && (
                  <Button variant="glass" size="sm" onClick={onCompare}>
                    <Eye className="w-4 h-4 mr-1" />
                    Compare
                  </Button>
                )}
              </div>
            )}
          </>
        ) : isGenerating ? (
          <div className="w-full h-full flex flex-col items-center justify-center">
            <Loader2 className="w-12 h-12 text-blue-400 mb-3 animate-spin" />
            <span className="text-sm text-muted-foreground">Generating frame...</span>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center">
            <ImageIcon className="w-12 h-12 text-muted-foreground mb-2" />
            <span className="text-sm text-muted-foreground">
              {isDisabled && disabledReason ? disabledReason : 'No frame generated'}
            </span>
          </div>
        )}

        {/* Generation count badge */}
        {frame && frame.generationCount > 0 && (
          <div className="absolute top-2 right-2">
            <Badge variant="outline" className="bg-black/50 text-xs">
              Gen #{frame.generationCount}
            </Badge>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mt-3">
        {needsGeneration && !isGenerating ? (
          <Button
            variant="gold"
            className="w-full"
            disabled={isDisabled || isGenerating}
            onClick={frame ? onRegenerate : onGenerate}
          >
            <ImageIcon className="w-4 h-4 mr-2" />
            {frame ? 'Regenerate' : 'Generate'} {frameType} Frame
          </Button>
        ) : isGenerating ? (
          <Button variant="outline" className="w-full" disabled>
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            Generating...
          </Button>
        ) : canApprove ? (
          <>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={onReject}
              disabled={isDisabled}
            >
              <X className="w-4 h-4 mr-1" />
              Reject
            </Button>
            <Button
              variant="gold"
              size="sm"
              className="flex-1"
              onClick={onApprove}
              disabled={isDisabled}
            >
              <Check className="w-4 h-4 mr-1" />
              Approve
            </Button>
          </>
        ) : isApproved ? (
          <>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={onRegenerate}
              disabled={isDisabled}
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Regenerate
            </Button>
            <Button variant="gold" size="sm" className="flex-1" disabled>
              <Check className="w-4 h-4 mr-1" />
              Approved
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
