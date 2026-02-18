import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Loader2 } from 'lucide-react';
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
import { frameService, type FrameGeneration } from '@/lib/services/frameService';

interface FrameGenerationCarouselProps {
  projectId: string;
  sceneId: string;
  frameId: string;
  generationCount: number;
}

export function FrameGenerationCarousel({
  projectId,
  sceneId,
  frameId,
  generationCount,
}: FrameGenerationCarouselProps) {
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const queryKey = ['frame-generations', projectId, sceneId, frameId];

  const { data: generations = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => frameService.fetchFrameGenerations(projectId, sceneId, frameId),
    enabled: generationCount > 1,
  });

  const selectMutation = useMutation({
    mutationFn: (jobId: string) =>
      frameService.selectFrameGeneration(projectId, sceneId, frameId, jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['frames', projectId, sceneId] });
    },
  });

  if (generationCount <= 1 || isLoading || generations.length <= 1) {
    return null;
  }

  const total = generations.length;

  return (
    <div className="mt-2 space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground font-medium">
          Generation History
        </span>
        <span className="text-[10px] text-muted-foreground">
          {currentIndex + 1}/{total}
        </span>
      </div>

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
              <div
                className={cn(
                  'aspect-video rounded-lg border-2 overflow-hidden bg-muted/50 relative group',
                  gen.isCurrent
                    ? 'border-amber-400'
                    : 'border-border/30'
                )}
              >
                <img
                  src={gen.imageUrl}
                  alt={`Generation`}
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => setPreviewUrl(gen.imageUrl)}
                />

                {/* Current badge */}
                {gen.isCurrent && (
                  <Badge
                    className="absolute top-1 left-1 bg-amber-400 text-amber-900 text-[10px] gap-1"
                  >
                    <Check className="w-3 h-3" />
                    Current
                  </Badge>
                )}

                {/* Date badge */}
                <Badge
                  variant="secondary"
                  className="absolute top-1 right-1 text-[10px] bg-background/80 backdrop-blur-sm"
                >
                  {new Date(gen.createdAt).toLocaleDateString()}
                </Badge>

                {/* Select overlay for non-current items */}
                {!gen.isCurrent && (
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
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
              alt="Frame preview"
              className="w-full h-auto max-h-[85vh] object-contain rounded"
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
