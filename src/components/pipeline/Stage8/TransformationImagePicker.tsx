/**
 * TransformationImagePicker
 * Small dialog for reusing existing transformation images across scenes.
 * Shows a grid of prior transformation images for the same project asset.
 */

import { useEffect, useState } from 'react';
import { Loader2, Image as ImageIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { transformationEventService } from '@/lib/services/transformationEventService';

interface TransformationImage {
  imageUrl: string;
  postDescription: string;
  sceneNumber: number;
  eventId: string;
}

export interface TransformationImagePickerProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  projectAssetId: string;
  onSelect: (imageUrl: string) => void;
}

export function TransformationImagePicker({
  open,
  onClose,
  projectId,
  projectAssetId,
  onSelect,
}: TransformationImagePickerProps) {
  const [images, setImages] = useState<TransformationImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!open || !projectId || !projectAssetId) return;
    let cancelled = false;
    setIsLoading(true);
    transformationEventService.fetchTransformationImages(projectId, projectAssetId)
      .then(data => { if (!cancelled) setImages(data); })
      .catch(() => { if (!cancelled) setImages([]); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [open, projectId, projectAssetId]);

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ImageIcon className="w-4 h-4" />
            Reuse Existing Transformation Image
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : images.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No existing transformation images found for this asset.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto py-2">
            {images.map(img => (
              <button
                key={img.eventId}
                type="button"
                onClick={() => onSelect(img.imageUrl)}
                className="group relative rounded-lg border border-border/30 overflow-hidden hover:border-primary transition-colors text-left"
              >
                <div className="aspect-square">
                  <img
                    src={img.imageUrl}
                    alt={`Transformation from Scene ${img.sceneNumber}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-2 space-y-0.5">
                  <span className="text-[10px] font-medium text-primary">
                    Scene {img.sceneNumber}
                  </span>
                  <p className="text-[10px] text-muted-foreground line-clamp-2">
                    {img.postDescription}
                  </p>
                </div>
                <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
