import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Image as ImageIcon,
  RefreshCw,
  Check,
  Paintbrush,
  Eye,
  Loader2,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from '@/components/ui/carousel';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { Frame, FrameType } from '@/types/scene';
import { ReferenceImageThumbnail } from './ReferenceImageThumbnail';
import { frameService, type FrameGeneration, type AvailableReferenceAsset } from '@/lib/services/frameService';

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
  shotUuid?: string;
  isDisabled?: boolean;
  isGenerateDisabled?: boolean;
  disabledReason?: string;
  onGenerate: () => void;
  onRegenerate: () => void;
  onRegenerateWithCorrection?: (correction: string) => void;
  onRegenerateWithEditedPrompt?: (prompt: string) => void;
  currentPrompt?: string;
  onInpaint: () => void;
  onCompare?: () => void;
  showCompare?: boolean;
  referenceImages?: ReferenceImageEntry[];
  onUpdateReferenceImages?: (refs: ReferenceImageEntry[]) => void;
  hideHeader?: boolean;
  projectId?: string;
  sceneId?: string;
}

const STATUS_STYLES: Record<string, { badge: string; label: string }> = {
  pending: { badge: 'bg-muted text-muted-foreground', label: 'Pending' },
  generating: { badge: 'bg-blue-500/20 text-blue-400', label: 'Generating' },
  generated: { badge: 'bg-emerald-500/20 text-emerald-400', label: 'Ready' },
  approved: { badge: 'bg-emerald-500/20 text-emerald-400', label: 'Ready' },
  rejected: { badge: 'bg-red-500/20 text-red-400', label: 'Rejected' },
};

export function FramePanel({
  frame,
  frameType,
  shotId,
  shotUuid,
  isDisabled = false,
  isGenerateDisabled = false,
  disabledReason,
  onGenerate,
  onRegenerate,
  onRegenerateWithCorrection,
  onRegenerateWithEditedPrompt,
  currentPrompt,
  onInpaint,
  onCompare,
  showCompare = false,
  referenceImages,
  onUpdateReferenceImages,
  hideHeader = false,
  projectId,
  sceneId,
}: FramePanelProps) {
  const queryClient = useQueryClient();
  const [imageError, setImageError] = useState(false);
  const [showRegenOptions, setShowRegenOptions] = useState(false);
  const [correctionText, setCorrectionText] = useState('');
  const [showManualEdit, setShowManualEdit] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [replacingRefIndex, setReplacingRefIndex] = useState<number | null>(null);

  // Fetch available references when replacing
  const { data: availableRefs } = useQuery({
    queryKey: ['available-references', projectId, sceneId, shotUuid],
    queryFn: () => frameService.fetchAvailableReferences(projectId!, sceneId!, shotUuid!),
    enabled: replacingRefIndex !== null && !!projectId && !!sceneId && !!shotUuid,
  });

  const handleReplaceRef = (index: number) => {
    setReplacingRefIndex(index);
  };

  const handleSelectReplacement = (url: string) => {
    if (replacingRefIndex === null || !referenceImages || !onUpdateReferenceImages) return;
    const updated = [...referenceImages];
    updated[replacingRefIndex] = { ...updated[replacingRefIndex], url };
    onUpdateReferenceImages(updated);
    setReplacingRefIndex(null);
  };

  const status = frame?.status || 'pending';
  const hasImage = frame?.imageUrl && !imageError;
  const isGenerating = status === 'generating';
  const canRegenerate = status === 'generated' || status === 'rejected' || status === 'approved';
  const needsGeneration = status === 'pending' || status === 'rejected';

  const statusStyle = STATUS_STYLES[status] || STATUS_STYLES.pending;

  // Fetch generations for carousel
  const frameId = frame?.id;
  const generationCount = frame?.generationCount || 0;
  const generationsQueryKey = ['frame-generations', projectId, sceneId, frameId];

  const { data: generations = [] } = useQuery({
    queryKey: generationsQueryKey,
    queryFn: () => frameService.fetchFrameGenerations(projectId!, sceneId!, frameId!),
    enabled: generationCount > 1 && !!projectId && !!sceneId && !!frameId,
  });

  const selectMutation = useMutation({
    mutationFn: (jobId: string) =>
      frameService.selectFrameGeneration(projectId!, sceneId!, frameId!, jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: generationsQueryKey });
      queryClient.invalidateQueries({ queryKey: ['frames', projectId, sceneId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (jobId: string) =>
      frameService.deleteFrameGeneration(projectId!, sceneId!, frameId!, jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: generationsQueryKey });
      queryClient.invalidateQueries({ queryKey: ['frames', projectId, sceneId] });
    },
  });

  const showCarousel = generations.length > 1;
  const total = generations.length;

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

  // Render a single image with hover overlay (used for single-generation mode)
  const renderSingleImage = () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            'aspect-video bg-muted/50 rounded-lg border-2 overflow-hidden relative group cursor-pointer',
            (status === 'approved' || status === 'generated') ? 'border-emerald-500/50' : 'border-border/30',
            isGenerating && 'border-blue-500/30'
          )}
          onClick={() => frame?.imageUrl && setPreviewUrl(frame.imageUrl)}
        >
          <motion.img
            src={frame!.imageUrl!}
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
                onClick={(e) => { e.stopPropagation(); onInpaint(); }}
                disabled={!hasImage}
              >
                <Paintbrush className="w-4 h-4 mr-1" />
                Inpaint
              </Button>
              {showCompare && onCompare && (
                <Button variant="glass" size="sm" onClick={(e) => { e.stopPropagation(); onCompare(); }}>
                  <Eye className="w-4 h-4 mr-1" />
                  Compare
                </Button>
              )}
            </div>
          )}
        </div>
      </TooltipTrigger>
      {frame?.promptSnapshot && (
        <TooltipContent side="bottom" className="max-w-sm text-xs">
          <p className="font-medium mb-1">Prompt:</p>
          <p className="text-muted-foreground line-clamp-3">{frame.promptSnapshot}</p>
          {frame.generatedAt && (
            <p className="text-muted-foreground mt-1">
              {new Date(frame.generatedAt).toLocaleDateString()}
            </p>
          )}
        </TooltipContent>
      )}
    </Tooltip>
  );

  // Render carousel for multiple generations
  const renderCarousel = () => (
    <Carousel
      className="w-full"
      opts={{ startIndex: generations.findIndex(g => g.isCurrent) }}
      setApi={(api) => {
        if (!api) return;
        api.on('select', () => {
          setCurrentIndex(api.selectedScrollSnap());
        });
        setCurrentIndex(api.selectedScrollSnap());
      }}
    >
      <CarouselContent>
        {generations.map((gen: FrameGeneration) => (
          <CarouselItem key={gen.jobId}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    'aspect-video rounded-lg border-2 overflow-hidden bg-muted/50 relative group cursor-pointer',
                    gen.isCurrent
                      ? 'border-amber-400'
                      : 'border-border/30'
                  )}
                  onClick={() => setPreviewUrl(gen.imageUrl)}
                >
                  <img
                    src={gen.imageUrl}
                    alt="Generation"
                    className="w-full h-full object-cover"
                  />

                  {/* Selected badge - top left */}
                  {gen.isCurrent && (
                    <Badge
                      className="absolute top-1 left-1 z-10 bg-amber-400 text-amber-900 text-[10px] gap-1"
                    >
                      <Check className="w-3 h-3" />
                      Selected
                    </Badge>
                  )}

                  {/* Date badge - top right */}
                  <Badge
                    variant="secondary"
                    className="absolute top-1 right-1 z-10 text-[10px] bg-background/80 backdrop-blur-sm"
                  >
                    {new Date(gen.createdAt).toLocaleDateString()}
                  </Badge>

                  {/* Counter badge - bottom right */}
                  <Badge
                    variant="secondary"
                    className="absolute bottom-1 right-1 z-10 text-[10px] bg-background/80 backdrop-blur-sm font-mono"
                  >
                    {currentIndex + 1}/{total}
                  </Badge>

                  {/* Current/selected item overlay: Inpaint + Compare */}
                  {gen.isCurrent && !isDisabled && !isGenerating && (
                    <div className="absolute inset-0 z-20 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        variant="glass"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); onInpaint(); }}
                      >
                        <Paintbrush className="w-4 h-4 mr-1" />
                        Inpaint
                      </Button>
                      {showCompare && onCompare && (
                        <Button variant="glass" size="sm" onClick={(e) => { e.stopPropagation(); onCompare(); }}>
                          <Eye className="w-4 h-4 mr-1" />
                          Compare
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Non-current item overlay: Select + Delete */}
                  {!gen.isCurrent && (
                    <div className="absolute inset-0 z-20 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        size="sm"
                        className="bg-amber-400 hover:bg-amber-500 text-amber-900"
                        onClick={(e) => {
                          e.stopPropagation();
                          selectMutation.mutate(gen.jobId);
                        }}
                        disabled={selectMutation.isPending}
                      >
                        {selectMutation.isPending ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <>
                            <Check className="w-3 h-3 mr-1" />
                            Select
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMutation.mutate(gen.jobId);
                        }}
                        disabled={deleteMutation.isPending}
                      >
                        {deleteMutation.isPending ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-sm text-xs">
                {gen.prompt && (
                  <>
                    <p className="font-medium mb-1">Prompt:</p>
                    <p className="text-muted-foreground line-clamp-3">{gen.prompt}</p>
                  </>
                )}
                {gen.costCredits > 0 && (
                  <p className="text-muted-foreground mt-1">Cost: {gen.costCredits.toFixed(2)} credits</p>
                )}
                <p className="text-muted-foreground mt-1">
                  {new Date(gen.createdAt).toLocaleDateString()}
                </p>
              </TooltipContent>
            </Tooltip>
          </CarouselItem>
        ))}
      </CarouselContent>
      {total > 1 && (
        <>
          <CarouselPrevious className="left-2 z-30 h-7 w-7 bg-black/60 border-white/20 text-white hover:bg-black/80 hover:text-white disabled:hidden" />
          <CarouselNext className="right-2 z-30 h-7 w-7 bg-black/60 border-white/20 text-white hover:bg-black/80 hover:text-white disabled:hidden" />
        </>
      )}
    </Carousel>
  );

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
      {showCarousel ? (
        renderCarousel()
      ) : hasImage ? (
        renderSingleImage()
      ) : isGenerating ? (
        <div
          className="aspect-video bg-muted/50 rounded-lg border border-blue-500/30 overflow-hidden relative flex flex-col items-center justify-center"
        >
          <Loader2 className="w-12 h-12 text-blue-400 mb-3 animate-spin" />
          <span className="text-sm text-muted-foreground">Generating frame...</span>
        </div>
      ) : (
        <div
          className="aspect-video bg-muted/50 rounded-lg border border-border/30 overflow-hidden relative flex flex-col items-center justify-center"
        >
          <ImageIcon className="w-12 h-12 text-muted-foreground mb-2" />
          <span className="text-sm text-muted-foreground">
            {(isDisabled || isGenerateDisabled) && disabledReason ? disabledReason : 'No frame generated'}
          </span>
        </div>
      )}

      {/* Reference image thumbnails */}
      {referenceImages && referenceImages.length > 0 && (
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          <span className="text-[10px] text-muted-foreground">Refs:</span>
          {referenceImages.map((ref, idx) => {
            const isReplacing = replacingRefIndex === idx;
            const currentAssetName = ref.assetName;
            const assetOptions = availableRefs?.find(
              (a: AvailableReferenceAsset) => a.assetName.toUpperCase() === currentAssetName?.toUpperCase()
            );

            if (onUpdateReferenceImages && shotUuid) {
              return (
                <Popover
                  key={idx}
                  open={isReplacing}
                  onOpenChange={(open) => {
                    if (!open) setReplacingRefIndex(null);
                  }}
                >
                  <PopoverTrigger asChild>
                    <span>
                      <ReferenceImageThumbnail
                        url={ref.url}
                        assetName={ref.assetName}
                        type={ref.type}
                        index={idx}
                        onReplace={handleReplaceRef}
                      />
                    </span>
                  </PopoverTrigger>
                  <PopoverContent side="top" className="w-64 p-2">
                    <p className="text-xs font-medium text-foreground mb-2">
                      Replace: {currentAssetName}
                    </p>
                    {!assetOptions ? (
                      <div className="flex items-center justify-center py-3">
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : assetOptions.options.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">No alternatives available</p>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {assetOptions.options.map((opt, optIdx) => (
                          <button
                            key={optIdx}
                            className={cn(
                              'w-full flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 transition-colors text-left',
                              opt.url === ref.url && 'bg-primary/10 border border-primary/30'
                            )}
                            onClick={() => handleSelectReplacement(opt.url)}
                          >
                            <img
                              src={opt.url}
                              alt={opt.label}
                              className="w-10 h-10 rounded border border-border/30 object-cover shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-foreground truncate">
                                {opt.label}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {opt.source.replace(/_/g, ' ')}
                              </p>
                            </div>
                            {opt.url === ref.url && (
                              <Check className="w-3 h-3 text-primary shrink-0 ml-auto" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              );
            }

            return (
              <ReferenceImageThumbnail
                key={idx}
                url={ref.url}
                assetName={ref.assetName}
                type={ref.type}
                index={idx}
              />
            );
          })}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 mt-3">
        {needsGeneration && !isGenerating ? (
          <Button
            variant="gold"
            className="w-full"
            disabled={isDisabled || isGenerateDisabled || isGenerating}
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
        ) : hasImage && !isGenerating ? (
          <Button
            variant="outline"
            className="w-full"
            onClick={handleRegenClick}
            disabled={isDisabled || isGenerateDisabled}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Regenerate
          </Button>
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

      {/* Full-size preview dialog */}
      {previewUrl && (
        <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
          <DialogContent className="max-w-3xl p-2 bg-black/90 border-none">
            <img
              src={previewUrl}
              alt="Frame preview"
              className="w-full h-auto max-h-[85vh] object-contain rounded"
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
