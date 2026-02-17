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
  Pencil,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { Frame, FrameType } from '@/types/scene';

interface ReferenceImageEntry {
  label: string;
  assetName: string;
  url: string;
  type: string;
}

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
  onRegenerateWithCorrection?: (correction: string) => void;
  onRegenerateWithEditedPrompt?: (prompt: string) => void;
  currentPrompt?: string;
  onInpaint: () => void;
  onCompare?: () => void;
  showCompare?: boolean;
  referenceImages?: ReferenceImageEntry[];
  hideHeader?: boolean;
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
  onRegenerateWithCorrection,
  onRegenerateWithEditedPrompt,
  currentPrompt,
  onInpaint,
  onCompare,
  showCompare = false,
  referenceImages,
  hideHeader = false,
}: FramePanelProps) {
  const [imageError, setImageError] = useState(false);
  const [showRegenOptions, setShowRegenOptions] = useState(false);
  const [correctionText, setCorrectionText] = useState('');
  const [showManualEdit, setShowManualEdit] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState('');

  const status = frame?.status || 'pending';
  const hasImage = frame?.imageUrl && !imageError;
  const isGenerating = status === 'generating';
  const isApproved = status === 'approved';
  const canApprove = status === 'generated';
  const canRegenerate = status === 'generated' || status === 'rejected' || status === 'approved';
  const needsGeneration = status === 'pending' || status === 'rejected';

  const statusStyle = STATUS_STYLES[status] || STATUS_STYLES.pending;

  const handleRegenClick = () => {
    if (onRegenerateWithCorrection) {
      setShowRegenOptions(true);
      setCorrectionText('');
      setShowManualEdit(false);
      setEditedPrompt(currentPrompt || '');
    } else {
      onRegenerate();
    }
  };

  const handleCorrectionSubmit = () => {
    if (correctionText.trim() && onRegenerateWithCorrection) {
      onRegenerateWithCorrection(correctionText.trim());
      setShowRegenOptions(false);
      setCorrectionText('');
    }
  };

  const handleManualPromptSubmit = () => {
    if (editedPrompt.trim() && onRegenerateWithEditedPrompt) {
      onRegenerateWithEditedPrompt(editedPrompt.trim());
      setShowRegenOptions(false);
      setEditedPrompt('');
      setShowManualEdit(false);
    }
  };

  return (
    <div className={cn('flex flex-col', isDisabled && 'opacity-60')}>
      {/* Header */}
      {!hideHeader && (
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-foreground capitalize">
            {frameType} Frame
          </h3>
          <Badge variant="secondary" className={statusStyle.badge}>
            {isGenerating && <RefreshCw className="w-3 h-3 mr-1 animate-spin" />}
            {statusStyle.label}
          </Badge>
        </div>
      )}

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

      {/* Reference image thumbnails */}
      {referenceImages && referenceImages.length > 0 && (
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          <span className="text-[10px] text-muted-foreground">Refs:</span>
          {referenceImages.map((ref, idx) => (
            <div
              key={idx}
              className="relative w-8 h-8 rounded border border-border/50 overflow-hidden group/thumb"
              title={`${ref.assetName} (${ref.type})`}
            >
              <img
                src={ref.url}
                alt={ref.assetName}
                className="w-full h-full object-cover"
              />
              <span className="absolute top-0 left-0 bg-black/70 text-[8px] text-white px-0.5 leading-tight">
                {idx + 1}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 mt-3">
        {needsGeneration && !isGenerating ? (
          <Button
            variant="gold"
            className="w-full"
            disabled={isDisabled || isGenerating}
            onClick={frame ? handleRegenClick : onGenerate}
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
              onClick={handleRegenClick}
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

      {/* Regeneration correction area */}
      {showRegenOptions && canRegenerate && (
        <div className="mt-3 p-3 rounded-lg border border-border/50 bg-card/50 space-y-3">
          {!showManualEdit ? (
            <>
              <div className="space-y-2">
                <Textarea
                  value={correctionText}
                  onChange={(e) => setCorrectionText(e.target.value)}
                  rows={2}
                  placeholder="Describe what to change... (e.g. &quot;tighter on face, lower angle&quot;)"
                  className="resize-none text-xs"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    variant="gold"
                    size="sm"
                    className="flex-1"
                    onClick={handleCorrectionSubmit}
                    disabled={!correctionText.trim()}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Regenerate with Correction
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onRegenerate();
                      setShowRegenOptions(false);
                    }}
                  >
                    Re-roll
                  </Button>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowManualEdit(true);
                  setEditedPrompt(currentPrompt || '');
                }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                <Pencil className="w-3 h-3" />
                Edit prompt manually
              </button>
            </>
          ) : (
            <div className="space-y-2">
              <Textarea
                value={editedPrompt}
                onChange={(e) => setEditedPrompt(e.target.value)}
                rows={4}
                placeholder="Full prompt..."
                className="resize-none text-xs"
              />
              <div className="flex gap-2">
                <Button
                  variant="gold"
                  size="sm"
                  className="flex-1"
                  onClick={handleManualPromptSubmit}
                  disabled={!editedPrompt.trim()}
                >
                  <ImageIcon className="w-3 h-3 mr-1" />
                  Generate with Edited Prompt
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowManualEdit(false)}
                >
                  Back
                </Button>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={() => setShowRegenOptions(false)}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
