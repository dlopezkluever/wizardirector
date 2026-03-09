/**
 * Enhanced Upload Modal – Shared component for Stage 5 & Stage 8
 * After uploading an image, lets the user reconcile the description,
 * edit the image via text instructions, apply visual style, remove
 * the background, or regenerate from description.
 */

import { useState, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  Edit3,
  Palette,
  Eraser,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Info,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface EnhancedUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  assetName: string;
  assetType: string;
  currentDescription: string;
  extractedDescription: string;
  suggestedMerge: string;
  confidence: number;
  initialImageUrl: string;
  onEditImage: (params: {
    referenceImageUrl: string;
    editInstructions: string;
    description: string;
  }) => Promise<{ jobId: string }>;
  onApplyStyle: (params: {
    referenceImageUrl: string;
    description: string;
  }) => Promise<{ jobId: string }>;
  onRemoveBackground: (params: {
    referenceImageUrl: string;
    description: string;
  }) => Promise<{ jobId: string }>;
  onRegenerate: (params: {
    description: string;
    referenceImageUrl?: string;
  }) => Promise<{ jobId: string }>;
  onPollJob: (jobId: string) => Promise<{
    status: string;
    publicUrl?: string;
    error?: { message?: string };
  }>;
  onAccept: (finalDescription: string, finalImageUrl: string) => void;
}

type ActionType = 'edit' | 'style' | 'background' | 'regenerate';

const ACTION_LABELS: Record<ActionType, string> = {
  edit: 'Editing image...',
  style: 'Applying style...',
  background: 'Removing background...',
  regenerate: 'Regenerating...',
};

export function EnhancedUploadModal({
  isOpen,
  onClose,
  assetName,
  assetType,
  currentDescription,
  extractedDescription,
  suggestedMerge,
  confidence,
  initialImageUrl,
  onEditImage,
  onApplyStyle,
  onRemoveBackground,
  onRegenerate,
  onPollJob,
  onAccept,
}: EnhancedUploadModalProps) {
  const [finalDescription, setFinalDescription] = useState(
    suggestedMerge || extractedDescription
  );
  const [imageHistory, setImageHistory] = useState<string[]>([initialImageUrl]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [activeAction, setActiveAction] = useState<ActionType | null>(null);
  const [showEditInput, setShowEditInput] = useState(false);
  const [editInstructions, setEditInstructions] = useState('');
  const cancelledRef = useRef(false);
  const [useImageAsReference, setUseImageAsReference] = useState(true);

  const currentImageUrl = imageHistory[currentImageIndex];
  const showBackgroundButton = assetType !== 'location';

  const pollForCompletion = useCallback(
    async (jobId: string): Promise<string> => {
      const maxAttempts = 90;
      const interval = 2000;

      for (let i = 0; i < maxAttempts; i++) {
        if (cancelledRef.current) throw new Error('Cancelled');

        const result = await onPollJob(jobId);
        if (result.status === 'completed' && result.publicUrl) {
          return result.publicUrl;
        }
        if (result.status === 'failed') {
          throw new Error(result.error?.message || 'Generation failed');
        }
        await new Promise((r) => setTimeout(r, interval));
      }
      throw new Error('Generation timed out');
    },
    [onPollJob]
  );

  const handleAction = useCallback(
    async (action: ActionType, jobPromise: Promise<{ jobId: string }>) => {
      setActiveAction(action);
      cancelledRef.current = false;
      try {
        const { jobId } = await jobPromise;
        const newImageUrl = await pollForCompletion(jobId);
        setImageHistory((prev) => {
          const updated = [...prev, newImageUrl];
          setCurrentImageIndex(updated.length - 1);
          return updated;
        });
        toast.success('Image generated');
      } catch (error) {
        if (!cancelledRef.current) {
          toast.error(
            error instanceof Error ? error.message : 'Action failed'
          );
        }
      } finally {
        setActiveAction(null);
      }
    },
    [pollForCompletion]
  );

  const handleEditImage = useCallback(() => {
    if (!editInstructions.trim()) {
      toast.error('Please enter edit instructions');
      return;
    }
    handleAction(
      'edit',
      onEditImage({
        referenceImageUrl: currentImageUrl,
        editInstructions: editInstructions.trim(),
        description: finalDescription,
      })
    );
    setEditInstructions('');
    setShowEditInput(false);
  }, [handleAction, onEditImage, currentImageUrl, editInstructions, finalDescription]);

  const handleApplyStyle = useCallback(() => {
    handleAction(
      'style',
      onApplyStyle({
        referenceImageUrl: currentImageUrl,
        description: finalDescription,
      })
    );
  }, [handleAction, onApplyStyle, currentImageUrl, finalDescription]);

  const handleRemoveBackground = useCallback(() => {
    handleAction(
      'background',
      onRemoveBackground({
        referenceImageUrl: currentImageUrl,
        description: finalDescription,
      })
    );
  }, [handleAction, onRemoveBackground, currentImageUrl, finalDescription]);

  const handleRegenerate = useCallback(() => {
    handleAction(
      'regenerate',
      onRegenerate({
        description: finalDescription,
        ...(useImageAsReference ? { referenceImageUrl: currentImageUrl } : {}),
      })
    );
  }, [handleAction, onRegenerate, finalDescription, useImageAsReference, currentImageUrl]);

  const handleAccept = useCallback(() => {
    onAccept(finalDescription, currentImageUrl);
    onClose();
  }, [onAccept, onClose, finalDescription, currentImageUrl]);

  const handleCancel = useCallback(() => {
    cancelledRef.current = true;
    onClose();
  }, [onClose]);

  const canNavigateLeft = currentImageIndex > 0;
  const canNavigateRight = currentImageIndex < imageHistory.length - 1;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col gap-0">
      <TooltipProvider delayDuration={300}>
        <DialogHeader className="pb-4">
          <DialogTitle className="text-base">Review Uploaded Image</DialogTitle>
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            {assetName}
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex cursor-help">
                  <Badge variant="secondary" className="text-[10px]">
                    {Math.round(confidence * 100)}% match
                    <Info className="w-3 h-3 ml-1 inline-block opacity-50" />
                  </Badge>
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[220px] text-xs">
                How closely the AI thinks this image matches the existing asset description
              </TooltipContent>
            </Tooltip>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto py-2">
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] gap-5">
            {/* Left: Image Preview */}
            <div className="space-y-2">
              <div
                className={cn(
                  'relative rounded-lg border border-border/40 bg-muted/20 overflow-hidden',
                  'flex items-center justify-center min-h-[260px]'
                )}
              >
                {activeAction ? (
                  <div className="flex flex-col items-center gap-2 p-8">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <span className="text-xs text-muted-foreground">
                      {ACTION_LABELS[activeAction]}
                    </span>
                  </div>
                ) : (
                  <img
                    src={currentImageUrl}
                    alt={assetName}
                    className="max-w-full max-h-[340px] object-contain"
                  />
                )}
              </div>

              {imageHistory.length > 1 && (
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={!canNavigateLeft || !!activeAction}
                    onClick={() => setCurrentImageIndex((i) => i - 1)}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {currentImageIndex + 1} / {imageHistory.length}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={!canNavigateRight || !!activeAction}
                    onClick={() => setCurrentImageIndex((i) => i + 1)}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Right: Description + Actions */}
            <div className="space-y-3">
              {/* Section 1: Description Reconciliation */}
              {currentDescription && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Current Description
                  </Label>
                  <div className="rounded-md border border-border/40 bg-muted/30 p-2.5 text-xs leading-relaxed max-h-[72px] overflow-auto">
                    {currentDescription}
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs text-primary font-medium flex items-center gap-1">
                  Extracted from Image
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3 h-3 opacity-50 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-[220px] text-xs">
                      AI-generated description of what&apos;s visible in the uploaded image
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <div className="rounded-md border border-primary/30 bg-primary/5 p-2.5 text-xs leading-relaxed max-h-[72px] overflow-auto">
                  {extractedDescription}
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium flex items-center gap-1">
                  Final Description
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3 h-3 opacity-50 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-[220px] text-xs">
                      This is the description that will be saved when you click Accept
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Textarea
                  value={finalDescription}
                  onChange={(e) => setFinalDescription(e.target.value)}
                  rows={3}
                  className="text-xs resize-none leading-relaxed"
                  placeholder="Edit the final description..."
                />
              </div>

              {/* Section 2: Image Actions */}
              <div className="space-y-2 pt-1">
                <Label className="text-xs text-muted-foreground">
                  Image Actions
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => setShowEditInput(!showEditInput)}
                        disabled={!!activeAction}
                      >
                        <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                        Edit Image
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[220px] text-xs">
                      Modify the current image with text instructions
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={handleApplyStyle}
                        disabled={!!activeAction}
                      >
                        {activeAction === 'style' ? (
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        ) : (
                          <Palette className="w-3.5 h-3.5 mr-1.5" />
                        )}
                        Apply Style
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[220px] text-xs">
                      Re-render the current image in this project&apos;s visual style
                    </TooltipContent>
                  </Tooltip>
                  {showBackgroundButton && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={handleRemoveBackground}
                          disabled={!!activeAction}
                        >
                          {activeAction === 'background' ? (
                            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          ) : (
                            <Eraser className="w-3.5 h-3.5 mr-1.5" />
                          )}
                          Remove BG
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-[220px] text-xs">
                        Remove the background, keeping only the subject
                      </TooltipContent>
                    </Tooltip>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={handleRegenerate}
                        disabled={!!activeAction}
                      >
                        {activeAction === 'regenerate' ? (
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                        )}
                        Regenerate
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[260px] text-xs">
                      Generate a new image from the Final Description. When &quot;Use as ref&quot; is on, the current image guides style and composition.
                    </TooltipContent>
                  </Tooltip>
                  <div className="flex items-center gap-1.5">
                    <Checkbox
                      id="use-as-ref"
                      checked={useImageAsReference}
                      onCheckedChange={(checked) => setUseImageAsReference(checked === true)}
                    />
                    <label htmlFor="use-as-ref" className="text-[10px] text-muted-foreground cursor-pointer select-none">
                      Use as ref
                    </label>
                  </div>
                </div>

                {showEditInput && (
                  <div className="flex gap-2">
                    <Input
                      value={editInstructions}
                      onChange={(e) => setEditInstructions(e.target.value)}
                      placeholder="e.g., change suit to orange jumpsuit"
                      className="text-xs h-8"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && editInstructions.trim()) {
                          handleEditImage();
                        }
                      }}
                      disabled={!!activeAction}
                      autoFocus
                    />
                    <Button
                      size="sm"
                      className="h-8 px-3 text-xs"
                      onClick={handleEditImage}
                      disabled={!!activeAction || !editInstructions.trim()}
                    >
                      {activeAction === 'edit' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        'Go'
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-4 gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={!!activeAction}
              >
                Cancel
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Discard all changes and close
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button onClick={handleAccept} disabled={!!activeAction}>
                Accept
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[240px] text-xs">
              Save the Final Description and currently displayed image to this asset
            </TooltipContent>
          </Tooltip>
        </DialogFooter>
      </TooltipProvider>
      </DialogContent>
    </Dialog>
  );
}
