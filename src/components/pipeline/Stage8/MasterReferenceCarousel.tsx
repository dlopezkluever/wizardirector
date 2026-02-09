/**
 * Stage 8 – Master Reference Carousel (3B.2)
 * Shows the Stage 5 master image and selected images from prior scenes for the same asset.
 * Users can select which reference to use as the master reference.
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Image as ImageIcon, Loader2, Check } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { sceneAssetService } from '@/lib/services/sceneAssetService';
import type { MasterReferenceItem } from '@/types/scene';

interface MasterReferenceCarouselProps {
  projectId: string;
  sceneId: string;
  instanceId: string;
  selectedMasterReferenceUrl?: string | null;
}

function referenceLabel(item: MasterReferenceItem): string {
  if (item.source === 'stage5_master') return 'Stage 5 Master';
  return `Scene ${item.sceneNumber}`;
}

export function MasterReferenceCarousel({
  projectId,
  sceneId,
  instanceId,
  selectedMasterReferenceUrl,
}: MasterReferenceCarouselProps) {
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);

  const queryKey = ['master-reference-chain', projectId, sceneId, instanceId];

  const { data: chain = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => sceneAssetService.getReferenceChain(projectId, sceneId, instanceId),
    enabled: !!instanceId,
  });

  const selectMutation = useMutation({
    mutationFn: (item: MasterReferenceItem) =>
      sceneAssetService.selectMasterReference(projectId, sceneId, instanceId, item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['scene-assets', projectId, sceneId] });
      queryClient.invalidateQueries({ queryKey: ['scene-asset-attempts', projectId, sceneId, instanceId] });
      toast.success('Master reference updated');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const handleSelectReference = useCallback(
    (item: MasterReferenceItem) => {
      selectMutation.mutate(item);
    },
    [selectMutation]
  );

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-primary" />
          Master reference
        </Label>
        <div className="aspect-video max-w-xs rounded-lg border border-border/30 bg-muted/50 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (chain.length === 0) {
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-primary" />
          Master reference
        </Label>
        <div className="aspect-video max-w-xs rounded-lg border border-dashed border-border/50 bg-muted/30 flex items-center justify-center">
          <p className="text-xs text-muted-foreground">No master reference available.</p>
        </div>
      </div>
    );
  }

  const total = chain.length;
  // Default to the last item (most recent) if no selection
  const defaultStartIndex = chain.length - 1;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-primary" />
          Master reference
        </Label>
        {total > 1 && (
          <span className="text-xs text-muted-foreground">
            {currentIndex + 1}/{total}
          </span>
        )}
      </div>

      <Carousel
        className="max-w-xs"
        opts={{ startIndex: defaultStartIndex }}
        setApi={(api) => {
          if (!api) return;
          api.on('select', () => {
            setCurrentIndex(api.selectedScrollSnap());
          });
          setCurrentIndex(api.selectedScrollSnap());
        }}
      >
        <CarouselContent>
          {chain.map((item, idx) => {
            const isActive = selectedMasterReferenceUrl === item.imageUrl;
            return (
              <CarouselItem key={`${item.source}-${item.sceneNumber ?? 'master'}-${idx}`}>
                <div
                  className={cn(
                    'aspect-video rounded-lg border-2 overflow-hidden bg-muted/50 relative group',
                    isActive ? 'border-primary' : 'border-border/30'
                  )}
                >
                  <img
                    src={item.imageUrl}
                    alt={referenceLabel(item)}
                    className="w-full h-full object-cover"
                  />

                  {/* Label badge */}
                  <Badge
                    variant="secondary"
                    className="absolute top-2 left-2 text-[10px] bg-background/80 backdrop-blur-sm"
                  >
                    {referenceLabel(item)}
                  </Badge>

                  {/* Active indicator */}
                  {isActive && (
                    <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground text-[10px] gap-1">
                      <Check className="w-3 h-3" />
                      Active
                    </Badge>
                  )}

                  {/* Select action overlay */}
                  {!isActive && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-background/90"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectReference(item);
                        }}
                        disabled={selectMutation.isPending}
                      >
                        {selectMutation.isPending ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          'Use This Reference'
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        {total > 1 && (
          <>
            <CarouselPrevious className="-left-10" />
            <CarouselNext className="-right-10" />
          </>
        )}
      </Carousel>
    </div>
  );
}
