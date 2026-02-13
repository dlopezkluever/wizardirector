/**
 * Project Asset Carousel (3A.6)
 * Displays all generation attempts for a project asset in a carousel.
 * Users can browse, select, and delete attempts.
 */

import { useCallback, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, Trash2, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from '@/components/ui/carousel';
import { cn } from '@/lib/utils';
import { projectAssetService } from '@/lib/services/projectAssetService';
import type { ProjectAssetGenerationAttempt } from '@/types/asset';

interface ProjectAssetCarouselProps {
  projectId: string;
  assetId: string;
  disabled?: boolean;
}

function sourceLabel(source: string): string {
  switch (source) {
    case 'generated': return 'AI Generated';
    case 'uploaded': return 'Uploaded';
    default: return source;
  }
}

export function ProjectAssetCarousel({
  projectId,
  assetId,
  disabled,
}: ProjectAssetCarouselProps) {
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const queryKey = ['project-asset-attempts', projectId, assetId];

  const { data: attempts = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => projectAssetService.listAttempts(projectId, assetId),
    enabled: !!assetId,
  });

  const selectMutation = useMutation({
    mutationFn: (attemptId: string) =>
      projectAssetService.selectAttempt(projectId, assetId, attemptId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['project-assets', projectId] });
      toast.success('Image selected');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (attemptId: string) =>
      projectAssetService.deleteAttempt(projectId, assetId, attemptId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Attempt deleted');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const handleSelect = useCallback(
    (attempt: ProjectAssetGenerationAttempt) => {
      if (attempt.is_selected || disabled) return;
      selectMutation.mutate(attempt.id);
    },
    [selectMutation, disabled]
  );

  const handleDelete = useCallback(
    (attempt: ProjectAssetGenerationAttempt) => {
      if (attempt.is_selected) {
        toast.error('Cannot delete the selected image');
        return;
      }
      if (disabled) return;
      deleteMutation.mutate(attempt.id);
    },
    [deleteMutation, disabled]
  );

  if (isLoading) {
    return (
      <div className="aspect-video rounded-lg border border-border/30 bg-muted/50 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (attempts.length === 0) {
    return (
      <div className="aspect-video rounded-lg border border-dashed border-border/50 bg-muted/30 flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <ImageIcon className="w-8 h-8 mx-auto mb-1" />
          <p className="text-xs">No image yet</p>
        </div>
      </div>
    );
  }

  const total = attempts.length;

  // Single image — no carousel needed
  if (total === 1) {
    const attempt = attempts[0];
    return (
      <>
        <div
          className="relative aspect-video rounded-lg overflow-hidden bg-muted/50 border-2 border-amber-400 cursor-pointer"
          onClick={() => setPreviewUrl(attempt.image_url)}
        >
          <img
            src={attempt.image_url}
            alt="Asset image"
            className="w-full h-full object-cover"
          />
          <Badge className="absolute top-2 left-2 bg-amber-400 text-amber-900 text-[10px] gap-1">
            <Check className="w-3 h-3" />
            Selected
          </Badge>
          <Badge
            variant="secondary"
            className="absolute top-2 right-2 text-[10px] bg-background/80 backdrop-blur-sm"
          >
            {sourceLabel(attempt.source)}
          </Badge>
        </div>
        {previewUrl && (
          <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
            <DialogContent className="max-w-3xl p-2 bg-black/90 border-none">
              <img
                src={previewUrl}
                alt="Asset preview"
                className="w-full h-auto max-h-[85vh] object-contain rounded"
              />
            </DialogContent>
          </Dialog>
        )}
      </>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-end">
        {total > 1 && (
          <span className="text-xs text-muted-foreground">
            {currentIndex + 1}/{total}
          </span>
        )}
      </div>

      <Carousel
        className="w-full"
        opts={{ startIndex: attempts.findIndex(a => a.is_selected) }}
        setApi={(api) => {
          if (!api) return;
          api.on('select', () => {
            setCurrentIndex(api.selectedScrollSnap());
          });
          setCurrentIndex(api.selectedScrollSnap());
        }}
      >
        <CarouselContent>
          {attempts.map((attempt) => (
            <CarouselItem key={attempt.id}>
              <div
                className={cn(
                  'aspect-video rounded-lg border-2 overflow-hidden bg-muted/50 relative group',
                  attempt.is_selected
                    ? 'border-amber-400'
                    : 'border-border/30'
                )}
              >
                <img
                  src={attempt.image_url}
                  alt={`Attempt ${attempt.attempt_number}`}
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => setPreviewUrl(attempt.image_url)}
                />

                {/* Selected badge */}
                {attempt.is_selected && (
                  <Badge
                    className="absolute top-2 left-2 bg-amber-400 text-amber-900 text-[10px] gap-1"
                  >
                    <Check className="w-3 h-3" />
                    Selected
                  </Badge>
                )}

                {/* Source badge */}
                <Badge
                  variant="secondary"
                  className="absolute top-2 right-2 text-[10px] bg-background/80 backdrop-blur-sm"
                >
                  {sourceLabel(attempt.source)}
                </Badge>

                {/* Actions overlay */}
                {!attempt.is_selected && !disabled && (
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      size="sm"
                      className="bg-amber-400 hover:bg-amber-500 text-amber-900"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(attempt);
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
                        handleDelete(attempt);
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        {total > 1 && (
          <>
            <CarouselPrevious className="-left-10" />
            <CarouselNext className="-right-10" />
          </>
        )}
      </Carousel>

      {previewUrl && (
        <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
          <DialogContent className="max-w-3xl p-2 bg-black/90 border-none">
            <img
              src={previewUrl}
              alt="Asset preview"
              className="w-full h-auto max-h-[85vh] object-contain rounded"
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
