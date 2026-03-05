import { useCallback, useRef, useState } from 'react';
import { Upload, Loader2, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

interface FrameUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (file: File, usage: 'variant' | 'reference') => void;
  isUploading?: boolean;
}

export function FrameUploadModal({
  open,
  onOpenChange,
  onUpload,
  isUploading = false,
}: FrameUploadModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [usage, setUsage] = useState<'variant' | 'reference'>('variant');
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setUsage('variant');
    setError(null);
  }, []);

  const handleFile = useCallback((file: File) => {
    setError(null);
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Invalid file type. Only PNG, JPEG, and WebP are allowed.');
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError('File too large. Maximum size is 5MB.');
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (isUploading) return;
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [isUploading, handleFile]
  );

  const handleSubmit = () => {
    if (!selectedFile) return;
    onUpload(selectedFile, usage);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Upload Frame Image
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Drop zone / preview */}
          {previewUrl ? (
            <div className="relative">
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full aspect-video object-cover rounded-lg border border-border/50"
              />
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white text-xs"
                onClick={() => {
                  setSelectedFile(null);
                  setPreviewUrl(null);
                }}
              >
                Change
              </Button>
            </div>
          ) : (
            <div
              className={cn(
                'rounded-lg border-2 border-dashed p-8 text-center cursor-pointer transition-colors',
                isDragOver ? 'border-primary bg-primary/5' : 'border-border/40 hover:border-border/60',
                isUploading && 'opacity-50 cursor-not-allowed'
              )}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onClick={() => !isUploading && fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".png,.jpg,.jpeg,.webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                  e.target.value = '';
                }}
              />
              <ImageIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Drop image or click to select
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PNG, JPEG, or WebP (max 5MB)
              </p>
            </div>
          )}

          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}

          {/* Usage selection */}
          {selectedFile && (
            <RadioGroup value={usage} onValueChange={(v) => setUsage(v as 'variant' | 'reference')}>
              <div className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted/30">
                <RadioGroupItem value="variant" id="variant" />
                <Label htmlFor="variant" className="cursor-pointer flex-1">
                  <span className="text-sm font-medium">Use as frame variant</span>
                  <span className="block text-xs text-muted-foreground">
                    Adds to the carousel as a selectable option
                  </span>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted/30">
                <RadioGroupItem value="reference" id="reference" />
                <Label htmlFor="reference" className="cursor-pointer flex-1">
                  <span className="text-sm font-medium">Use as reference image</span>
                  <span className="block text-xs text-muted-foreground">
                    Adds to reference thumbnails for generation guidance
                  </span>
                </Label>
              </div>
            </RadioGroup>
          )}

          {/* Submit */}
          <Button
            className="w-full"
            variant="gold"
            onClick={handleSubmit}
            disabled={!selectedFile || isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
