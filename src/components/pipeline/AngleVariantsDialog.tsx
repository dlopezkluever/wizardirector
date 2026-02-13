import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Loader2, RefreshCw, Trash2, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { projectAssetService } from '@/lib/services/projectAssetService';
import type { ProjectAsset, AngleType, AssetAngleVariant } from '@/types/asset';
import { ANGLE_LABELS } from '@/types/asset';

interface AngleVariantsDialogProps {
  projectId: string;
  asset: ProjectAsset;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ALL_ANGLES: AngleType[] = ['front', 'side', 'three_quarter', 'back'];

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-muted text-muted-foreground',
  generating: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  completed: 'bg-green-500/10 text-green-600 border-green-500/20',
  failed: 'bg-red-500/10 text-red-600 border-red-500/20',
};

export function AngleVariantsDialog({ projectId, asset, open, onOpenChange }: AngleVariantsDialogProps) {
  const [variants, setVariants] = useState<AssetAngleVariant[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatingAngles, setGeneratingAngles] = useState<Set<AngleType>>(new Set());
  const [pollingAngles, setPollingAngles] = useState<Set<AngleType>>(new Set());
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const fetchVariants = useCallback(async () => {
    try {
      setLoading(true);
      const data = await projectAssetService.listAngleVariants(projectId, asset.id);
      setVariants(data);
    } catch (error) {
      console.error('Failed to fetch angle variants:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId, asset.id]);

  useEffect(() => {
    if (open) {
      fetchVariants();
    }
  }, [open, fetchVariants]);

  // Poll for generating variants
  useEffect(() => {
    if (!open || pollingAngles.size === 0) return;

    const interval = setInterval(async () => {
      try {
        const data = await projectAssetService.listAngleVariants(projectId, asset.id);
        setVariants(data);

        // Check if any polling angles are done
        const stillGenerating = new Set<AngleType>();
        for (const angle of pollingAngles) {
          const variant = data.find(v => v.angle_type === angle);
          if (variant && variant.status === 'generating') {
            stillGenerating.add(angle);
          }
        }

        if (stillGenerating.size < pollingAngles.size) {
          const completed = [...pollingAngles].filter(a => !stillGenerating.has(a));
          for (const angle of completed) {
            const variant = data.find(v => v.angle_type === angle);
            if (variant?.status === 'completed') {
              toast.success(`${ANGLE_LABELS[angle]} generated!`);
            } else if (variant?.status === 'failed') {
              toast.error(`${ANGLE_LABELS[angle]} generation failed.`);
            }
          }
        }

        setPollingAngles(stillGenerating);
        setGeneratingAngles(prev => {
          const next = new Set(prev);
          for (const angle of prev) {
            if (!stillGenerating.has(angle)) next.delete(angle);
          }
          return next;
        });
      } catch (error) {
        console.error('Polling angle variants failed:', error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [open, pollingAngles, projectId, asset.id]);

  const getVariantForAngle = (angle: AngleType): AssetAngleVariant | undefined => {
    return variants.find(v => v.angle_type === angle);
  };

  const handleGenerateSingle = async (angle: AngleType) => {
    try {
      setGeneratingAngles(prev => new Set(prev).add(angle));
      setPollingAngles(prev => new Set(prev).add(angle));

      await projectAssetService.generateAngleVariants(projectId, asset.id, [angle]);
      toast.info(`Generating ${ANGLE_LABELS[angle]}...`);

      // Refresh to pick up the new pending variant
      await fetchVariants();
    } catch (error) {
      console.error(`Failed to generate ${angle}:`, error);
      toast.error(`Failed to start ${ANGLE_LABELS[angle]} generation.`);
      setGeneratingAngles(prev => {
        const next = new Set(prev);
        next.delete(angle);
        return next;
      });
      setPollingAngles(prev => {
        const next = new Set(prev);
        next.delete(angle);
        return next;
      });
    }
  };

  const handleGenerateAll = async () => {
    const missingAngles = ALL_ANGLES.filter(a => {
      const v = getVariantForAngle(a);
      return !v || v.status === 'failed';
    });

    if (missingAngles.length === 0) {
      toast.info('All angles already generated.');
      return;
    }

    try {
      const newSet = new Set(missingAngles);
      setGeneratingAngles(prev => new Set([...prev, ...newSet]));
      setPollingAngles(prev => new Set([...prev, ...newSet]));

      await projectAssetService.generateAngleVariants(projectId, asset.id, missingAngles);
      toast.info(`Generating ${missingAngles.length} angle view${missingAngles.length > 1 ? 's' : ''}...`);

      await fetchVariants();
    } catch (error) {
      console.error('Failed to generate all angles:', error);
      toast.error('Failed to start angle generation.');
      setGeneratingAngles(new Set());
      setPollingAngles(new Set());
    }
  };

  const handleDeleteVariant = async (variant: AssetAngleVariant) => {
    try {
      await projectAssetService.deleteAngleVariant(projectId, asset.id, variant.id);
      toast.success(`${ANGLE_LABELS[variant.angle_type as AngleType]} deleted.`);
      await fetchVariants();
    } catch (error) {
      console.error('Failed to delete variant:', error);
      toast.error('Failed to delete angle variant.');
    }
  };

  const completedCount = variants.filter(v => v.status === 'completed').length;
  const anyGenerating = generatingAngles.size > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-base">Angle Variants — {asset.name}</DialogTitle>
          <DialogDescription className="text-xs">
            Generate multiple angle views for consistent frame composition.
            {completedCount > 0 && ` ${completedCount}/${ALL_ANGLES.length} generated.`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {/* Generate All button */}
          <div className="flex justify-end">
            <Button
              onClick={handleGenerateAll}
              disabled={anyGenerating}
              size="sm"
              variant="outline"
            >
              {anyGenerating ? (
                <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3 h-3 mr-1.5" />
              )}
              Generate Missing Angles
            </Button>
          </div>

          {/* 2x2 Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {ALL_ANGLES.map(angle => {
                const variant = getVariantForAngle(angle);
                const isGenerating = generatingAngles.has(angle);
                const hasImage = variant?.status === 'completed' && variant.image_url;

                return (
                  <div
                    key={angle}
                    className="border rounded-lg p-2 space-y-1.5"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">{ANGLE_LABELS[angle]}</span>
                      {variant && (
                        <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${STATUS_COLORS[variant.status]}`}>
                          {variant.status}
                        </Badge>
                      )}
                    </div>

                    {/* Image area — compact square */}
                    <div
                      className={cn(
                        "aspect-square bg-muted/30 rounded-md flex items-center justify-center overflow-hidden",
                        hasImage && "cursor-pointer"
                      )}
                      onClick={() => {
                        if (hasImage) setPreviewUrl(variant.image_url!);
                      }}
                    >
                      {isGenerating || variant?.status === 'generating' ? (
                        <div className="flex flex-col items-center gap-1 text-muted-foreground">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span className="text-[10px]">Generating...</span>
                        </div>
                      ) : hasImage ? (
                        <img
                          src={variant.image_url!}
                          alt={`${asset.name} — ${ANGLE_LABELS[angle]}`}
                          className="w-full h-full object-contain rounded-md"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-muted-foreground">
                          <ImageIcon className="w-6 h-6" />
                          <span className="text-[10px]">Not generated</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-7 text-xs"
                        disabled={isGenerating || variant?.status === 'generating'}
                        onClick={() => handleGenerateSingle(angle)}
                      >
                        {isGenerating || variant?.status === 'generating' ? (
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3 h-3 mr-1" />
                        )}
                        {hasImage ? 'Redo' : 'Generate'}
                      </Button>
                      {variant && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteVariant(variant)}
                          disabled={isGenerating || variant.status === 'generating'}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>

      {/* Full-size image preview */}
      {previewUrl && (
        <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
          <DialogContent className="max-w-3xl p-2 bg-black/90 border-none">
            <img
              src={previewUrl}
              alt="Angle variant preview"
              className="w-full h-auto max-h-[85vh] object-contain rounded"
            />
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}
