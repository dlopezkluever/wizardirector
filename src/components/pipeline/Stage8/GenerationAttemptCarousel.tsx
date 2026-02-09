/**
 * Stage 8 – Generation Attempt Carousel (3B.1)
 * Displays all generation attempts for a scene asset instance in a carousel.
 * Users can browse, select, and delete attempts.
 */

import { useCallback, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, Trash2, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from '@/components/ui/carousel';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { sceneAssetService } from '@/lib/services/sceneAssetService';
import type { SceneAssetGenerationAttempt } from '@/types/scene';

interface GenerationAttemptCarouselProps {
  projectId: string;
  sceneId: string;
  instanceId: string;
}

function sourceLabel(source: string): string {
  switch (source) {
    case 'generated': return 'AI Generated';
    case 'uploaded': return 'Uploaded';
    case 'master_copy': return 'Master Copy';
    default: return source;
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function GenerationAttemptCarousel({
  projectId,
  sceneId,
  instanceId,
}: GenerationAttemptCarouselProps) {
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);

  const queryKey = ['scene-asset-attempts', projectId, sceneId, instanceId];

  const { data: attempts = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => sceneAssetService.listAttempts(projectId, sceneId, instanceId),
    enabled: !!instanceId,
  });

  const selectMutation = useMutation({
    mutationFn: (attemptId: string) =>
      sceneAssetService.selectAttempt(projectId, sceneId, instanceId, attemptId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['scene-assets', projectId, sceneId] });
      toast.success('Image selected');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (attemptId: string) =>
      sceneAssetService.deleteAttempt(projectId, sceneId, instanceId, attemptId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Attempt deleted');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const handleSelect = useCallback(
    (attempt: SceneAssetGenerationAttempt) => {
      if (attempt.is_selected) return;
      selectMutation.mutate(attempt.id);
    },
    [selectMutation]
  );

  const handleDelete = useCallback(
    (attempt: SceneAssetGenerationAttempt) => {
      if (attempt.is_selected) {
        toast.error('Cannot delete the selected image');
        return;
      }
      deleteMutation.mutate(attempt.id);
    },
    [deleteMutation]
  );

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-primary" />
          Scene instance image
        </Label>
        <div className="aspect-video max-w-xs rounded-lg border border-border/30 bg-muted/50 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (attempts.length === 0) {
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-primary" />
          Scene instance image
        </Label>
        <div className="aspect-video max-w-xs rounded-lg border border-dashed border-border/50 bg-muted/30 flex items-center justify-center">
          <p className="text-xs text-muted-foreground">No image yet. Generate above.</p>
        </div>
      </div>
    );
  }

  const total = attempts.length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-primary" />
          Scene instance image
        </Label>
        {total > 1 && (
          <span className="text-xs text-muted-foreground">
            {currentIndex + 1}/{total}
          </span>
        )}
      </div>

      <TooltipProvider>
        <Carousel
          className="max-w-xs"
          opts={{ startIndex: attempts.findIndex(a => a.is_selected) }}
          setApi={(api) => {
            if (!api) return;
            api.on('select', () => {
              setCurrentIndex(api.selectedScrollSnap());
            });
            // Set initial index
            setCurrentIndex(api.selectedScrollSnap());
          }}
        >
          <CarouselContent>
            {attempts.map((attempt) => (
              <CarouselItem key={attempt.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
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
                        className="w-full h-full object-cover"
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
                      {!attempt.is_selected && (
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="gold"
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
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <div className="space-y-1 text-xs">
                      <p><strong>Source:</strong> {sourceLabel(attempt.source)}</p>
                      <p><strong>Created:</strong> {formatDate(attempt.created_at)}</p>
                      {attempt.prompt_snapshot && (
                        <p><strong>Prompt:</strong> {attempt.prompt_snapshot.substring(0, 120)}...</p>
                      )}
                      {attempt.cost_credits != null && (
                        <p><strong>Cost:</strong> {attempt.cost_credits} credits</p>
                      )}
                      {attempt.original_filename && (
                        <p><strong>File:</strong> {attempt.original_filename}</p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
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
      </TooltipProvider>
    </div>
  );
}
