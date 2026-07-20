/**
 * EstablishViewPrompt — Phase G
 *
 * Appears below the FramePanel in Stage 10 when a generated frame could fill
 * a location coverage gap. Proactively suggests locking the frame as an
 * "established view" for the shot's camera direction.
 *
 * - If the direction has NO image → proactive suggestion (prominent banner)
 * - If the direction HAS an image → secondary action (small text link)
 * - Replace dialog when overwriting an existing reference
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Lock,
  MapPin,
  AlertTriangle,
  Loader2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { projectAssetService } from '@/lib/services/projectAssetService';
import type { LocationView } from '@/types/asset';

interface EstablishViewPromptProps {
  projectId: string;
  sceneId: string;
  shotId: string;
  frameImageUrl: string | null;
  frameId?: string | null;
  frameStatus: string;
  /** The location view for the shot's assigned camera direction */
  directionView: LocationView | null;
  /** The location asset this direction belongs to */
  locationAssetId: string | null;
  locationName: string | null;
  /** Callback after establishing (to refresh queries) */
  onEstablished?: () => void;
}

export function EstablishViewPrompt({
  projectId,
  sceneId,
  shotId,
  frameImageUrl,
  frameId,
  frameStatus,
  directionView,
  locationAssetId,
  locationName,
  onEstablished,
}: EstablishViewPromptProps) {
  const queryClient = useQueryClient();
  const [dismissed, setDismissed] = useState(false);
  const [showReplaceDialog, setShowReplaceDialog] = useState(false);

  const isFrameReady = frameStatus === 'generated' || frameStatus === 'approved';

  const hasExistingImage = !!directionView?.image_key_url;
  const isGapFill = !hasExistingImage;
  const directionLabel = directionView?.alias
    ? `${directionView.name.replace('_', ' ')} "${directionView.alias}"`
    : directionView?.name?.replace('_', ' ') ?? '';

  const establishMutation = useMutation({
    mutationFn: () =>
      projectAssetService.establishViewFromFrame(
        projectId,
        locationAssetId!,
        directionView!.id,
        {
          frameImageUrl: frameImageUrl!,
          shotId,
          sceneId,
          ...(frameId ? { frameId } : {}),
        }
      ),
    onSuccess: () => {
      toast({
        title: 'View established',
        description: `Locked as reference for ${directionLabel}`,
      });
      queryClient.invalidateQueries({ queryKey: ['location-coverage-views'] });
      queryClient.invalidateQueries({ queryKey: ['location-views'] });
      queryClient.invalidateQueries({ queryKey: ['location-views-stage10'] });
      onEstablished?.();
      setDismissed(true);
    },
    onError: (err) => {
      toast({
        title: 'Failed to establish view',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    },
  });

  // Don't render if frame isn't ready, no direction, or dismissed
  if (!isFrameReady || !frameImageUrl || !directionView || !locationAssetId || dismissed) {
    return null;
  }

  const handleEstablish = () => {
    if (hasExistingImage) {
      setShowReplaceDialog(true);
    } else {
      establishMutation.mutate();
    }
  };

  // Proactive suggestion — gap fill (prominent)
  if (isGapFill) {
    return (
      <>
        <div className="mt-2 px-3 py-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5">
          <div className="flex items-start gap-2">
            <MapPin className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-emerald-300">
                This fills a coverage gap!
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {locationName}: {directionLabel} — no reference image yet
              </p>
            </div>
            <button
              onClick={() => setDismissed(true)}
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-2 h-7 text-xs border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"
            onClick={handleEstablish}
            disabled={establishMutation.isPending}
          >
            {establishMutation.isPending ? (
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            ) : (
              <Lock className="w-3 h-3 mr-1" />
            )}
            Lock as Established View
          </Button>
        </div>
      </>
    );
  }

  // Secondary action — direction already has an image (subtle link)
  return (
    <>
      <button
        onClick={handleEstablish}
        disabled={establishMutation.isPending}
        className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
      >
        {establishMutation.isPending ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Lock className="w-3 h-3" />
        )}
        Lock as established view for {directionLabel}
      </button>

      {/* Replace confirmation dialog */}
      <AlertDialog open={showReplaceDialog} onOpenChange={setShowReplaceDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace existing reference?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                <span className="font-medium text-foreground">{directionLabel}</span> already has a reference image.
              </span>
              <span className="block">
                Replace it with this generated frame? The current reference will be overwritten.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Current reference</p>
              <div className="aspect-video rounded border border-border/50 overflow-hidden bg-muted/50">
                {directionView.image_key_url && (
                  <img
                    src={directionView.image_key_url}
                    alt="Current reference"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">New frame</p>
              <div className="aspect-video rounded border border-emerald-500/30 overflow-hidden bg-muted/50">
                <img
                  src={frameImageUrl}
                  alt="New frame"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-amber-500/10 border border-amber-500/20">
            <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
            <span className="text-xs text-amber-300">
              All future shots using this direction will reference the new image.
            </span>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep existing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowReplaceDialog(false);
                establishMutation.mutate();
              }}
            >
              Replace
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
