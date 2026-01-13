import { useState, useRef, useCallback } from 'react';
import { Upload, X, Image as ImageIcon, AlertCircle, CheckCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

import { styleCapsuleService } from '@/lib/services/styleCapsuleService';

interface ImageUploaderProps {
  capsuleId?: string; // If provided, uploads directly to this capsule
  onImagesUploaded?: (imageUrls: string[]) => void;
  maxFiles?: number;
  acceptedTypes?: string[];
  maxFileSizeMB?: number;
  className?: string;
}

interface UploadState {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
  url?: string;
}

export function ImageUploader({
  capsuleId,
  onImagesUploaded,
  maxFiles = 5,
  acceptedTypes = ['image/png', 'image/jpeg', 'image/webp'],
  maxFileSizeMB = 5,
  className
}: ImageUploaderProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploads, setUploads] = useState<UploadState[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const validateFile = useCallback((file: File): string | null => {
    // Check file type
    if (!acceptedTypes.includes(file.type)) {
      return `Invalid file type. Only ${acceptedTypes.join(', ')} are allowed.`;
    }

    // Check file size
    const maxSizeBytes = maxFileSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return `File size exceeds ${maxFileSizeMB}MB limit.`;
    }

    return null;
  }, [acceptedTypes, maxFileSizeMB]);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);

    // Check total file limit
    if (uploads.length + fileArray.length > maxFiles) {
      toast({
        title: 'Too many files',
        description: `You can upload a maximum of ${maxFiles} files at once.`,
        variant: 'destructive',
      });
      return;
    }

    const validFiles: File[] = [];
    const errors: string[] = [];

    // Validate each file
    for (const file of fileArray) {
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
      } else {
        validFiles.push(file);
      }
    }

    // Show validation errors
    if (errors.length > 0) {
      toast({
        title: 'File validation errors',
        description: errors.join('\n'),
        variant: 'destructive',
      });
    }

    if (validFiles.length === 0) return;

    // Add files to upload queue
    const newUploads: UploadState[] = validFiles.map(file => ({
      file,
      progress: 0,
      status: 'pending'
    }));

    setUploads(prev => [...prev, ...newUploads]);

    // Start uploading if we have a capsule ID
    if (capsuleId) {
      await uploadFilesToCapsule(newUploads);
    }
  }, [uploads.length, maxFiles, validateFile, capsuleId, toast]);

  const uploadFilesToCapsule = async (uploadStates: UploadState[]) => {
    if (!capsuleId) return;

    setIsUploading(true);

    try {
      const uploadPromises = uploadStates.map(async (uploadState, index) => {
        try {
          // Update status to uploading
          setUploads(prev => prev.map((u, i) =>
            uploads.findIndex(up => up.file === uploadState.file) === i
              ? { ...u, status: 'uploading' as const, progress: 10 }
              : u
          ));

          // Upload the image
          const result = await styleCapsuleService.uploadImage(capsuleId, uploadState.file);

          // Update status to completed
          setUploads(prev => prev.map((u, i) =>
            uploads.findIndex(up => up.file === uploadState.file) === i
              ? { ...u, status: 'completed' as const, progress: 100, url: result.referenceImageUrls?.[result.referenceImageUrls.length - 1] }
              : u
          ));

          return result.referenceImageUrls?.[result.referenceImageUrls.length - 1];
        } catch (error) {
          console.error('Upload failed:', error);

          // Update status to error
          setUploads(prev => prev.map((u, i) =>
            uploads.findIndex(up => up.file === uploadState.file) === i
              ? { ...u, status: 'error' as const, error: error instanceof Error ? error.message : 'Upload failed' }
              : u
          ));

          return null;
        }
      });

      const results = await Promise.allSettled(uploadPromises);
      const successfulUploads = results
        .filter((result): result is PromiseFulfilledResult<string | null> => result.status === 'fulfilled')
        .map(result => result.value)
        .filter(Boolean) as string[];

      if (successfulUploads.length > 0) {
        onImagesUploaded?.(successfulUploads);
        toast({
          title: 'Success',
          description: `Successfully uploaded ${successfulUploads.length} image${successfulUploads.length !== 1 ? 's' : ''}.`,
        });
      }

      // Remove completed uploads after a delay
      setTimeout(() => {
        setUploads(prev => prev.filter(u => u.status !== 'completed'));
      }, 2000);

    } finally {
      setIsUploading(false);
    }
  };

  const removeUpload = (index: number) => {
    setUploads(prev => prev.filter((_, i) => i !== index));
  };

  const retryUpload = async (index: number) => {
    const uploadState = uploads[index];
    if (!uploadState || uploadState.status !== 'error') return;

    await uploadFilesToCapsule([uploadState]);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFiles(files);
    }
  }, [handleFiles]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Upload Zone */}
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
          isDragOver
            ? 'border-primary bg-primary/10'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50',
          isUploading && 'opacity-50 pointer-events-none'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <div className="flex flex-col items-center gap-4">
          <div className={cn(
            'w-12 h-12 rounded-full flex items-center justify-center',
            isDragOver ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
          )}>
            <Upload className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">
              {isDragOver ? 'Drop images here' : 'Drag & drop images here, or click to browse'}
            </p>
            <p className="text-xs text-muted-foreground">
              Supports: {acceptedTypes.join(', ')} • Max {maxFileSizeMB}MB per file • Up to {maxFiles} files
            </p>
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedTypes.join(',')}
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Upload Queue */}
      {uploads.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Uploads</h4>
          <div className="space-y-2">
            {uploads.map((upload, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 border rounded-lg bg-card"
              >
                <div className="flex-shrink-0">
                  {upload.status === 'completed' && <CheckCircle className="w-5 h-5 text-green-500" />}
                  {upload.status === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
                  {upload.status === 'uploading' && <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />}
                  {upload.status === 'pending' && <ImageIcon className="w-5 h-5 text-muted-foreground" />}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{upload.file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(upload.file.size / 1024 / 1024).toFixed(1)}MB
                  </p>
                  {upload.status === 'uploading' && (
                    <Progress value={upload.progress} className="mt-1 h-1" />
                  )}
                  {upload.status === 'error' && upload.error && (
                    <p className="text-xs text-red-500 mt-1">{upload.error}</p>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {upload.status === 'error' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        retryUpload(index);
                      }}
                      className="h-7 px-2"
                    >
                      Retry
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeUpload(index);
                    }}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <Alert>
        <ImageIcon className="h-4 w-4" />
        <AlertDescription className="text-sm">
          Images will be uploaded to secure cloud storage and associated with your style capsule.
          They help the AI understand your visual preferences and generate more consistent results.
        </AlertDescription>
      </Alert>
    </div>
  );
}
