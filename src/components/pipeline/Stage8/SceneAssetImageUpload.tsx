/**
 * Stage 8 – Scene Asset Image Upload (3B.3)
 * Drag-and-drop / click-to-select upload zone for custom scene asset images.
 */

import { useCallback, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Upload, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { sceneAssetService } from '@/lib/services/sceneAssetService';

interface SceneAssetImageUploadProps {
  projectId: string;
  sceneId: string;
  instanceId: string;
  disabled?: boolean;
}

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export function SceneAssetImageUpload({
  projectId,
  sceneId,
  instanceId,
  disabled,
}: SceneAssetImageUploadProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: (file: File) =>
      sceneAssetService.uploadSceneAssetImage(projectId, sceneId, instanceId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scene-asset-attempts', projectId, sceneId, instanceId] });
      queryClient.invalidateQueries({ queryKey: ['scene-assets', projectId, sceneId] });
      toast.success('Image uploaded');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const handleFile = useCallback(
    (file: File) => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast.error('Invalid file type. Only PNG, JPEG, and WebP are allowed.');
        return;
      }
      if (file.size > MAX_SIZE_BYTES) {
        toast.error('File too large. Maximum size is 5MB.');
        return;
      }
      uploadMutation.mutate(file);
    },
    [uploadMutation]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (disabled || uploadMutation.isPending) return;
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [disabled, uploadMutation.isPending, handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleClick = useCallback(() => {
    if (disabled || uploadMutation.isPending) return;
    fileInputRef.current?.click();
  }, [disabled, uploadMutation.isPending]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      // Reset input so same file can be re-selected
      e.target.value = '';
    },
    [handleFile]
  );

  return (
    <div
      className={cn(
        'max-w-xs rounded-lg border-2 border-dashed p-3 text-center cursor-pointer transition-colors',
        isDragOver ? 'border-primary bg-primary/5' : 'border-border/40 hover:border-border/60',
        (disabled || uploadMutation.isPending) && 'opacity-50 cursor-not-allowed'
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.webp"
        className="hidden"
        onChange={handleInputChange}
        disabled={disabled || uploadMutation.isPending}
      />
      {uploadMutation.isPending ? (
        <div className="flex items-center justify-center gap-2 py-1">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Uploading...</span>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2 py-1">
          <Upload className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            Drop image or click to upload
          </span>
        </div>
      )}
    </div>
  );
}
