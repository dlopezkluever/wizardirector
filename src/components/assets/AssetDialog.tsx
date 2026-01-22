import { useState, useEffect, useRef } from 'react';
import { User, Box, MapPin, Upload, X, Image as ImageIcon, Sparkles, Loader2 } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

import { assetService } from '@/lib/services/assetService';
import type { GlobalAsset, AssetType, CreateAssetRequest } from '@/types/asset';

interface AssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset?: GlobalAsset | null;
  onSaved: () => void;
}

export const AssetDialog = ({ open, onOpenChange, asset, onSaved }: AssetDialogProps) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [name, setName] = useState('');
  const [assetType, setAssetType] = useState<AssetType>('character');
  const [description, setDescription] = useState('');
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Reset form when dialog opens/closes or asset changes
  useEffect(() => {
    if (open) {
      if (asset) {
        // Editing existing asset
        setName(asset.name);
        setAssetType(asset.asset_type);
        setDescription(asset.description);
        setImagePrompt(asset.image_prompt || '');
        setImageUrl(asset.image_key_url || null);
        setImageFile(null);
      } else {
        // Creating new asset
        setName('');
        setAssetType('character');
        setDescription('');
        setImagePrompt('');
        setImageUrl(null);
        setImageFile(null);
      }
    }
  }, [open, asset]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Only PNG, JPEG, and WebP images are allowed',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: 'File too large',
        description: 'Image must be less than 10MB',
        variant: 'destructive',
      });
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImageUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    if (asset?.image_key_url) {
      // Keep existing image URL if editing existing asset
      setImageUrl(asset.image_key_url);
    } else {
      setImageUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleGenerateImage = async () => {
    if (!asset) {
      toast({
        title: 'Error',
        description: 'Please save the asset first before generating an image',
        variant: 'destructive',
      });
      return;
    }

    try {
      setGeneratingImage(true);

      // Use image_prompt if available, otherwise use description
      const prompt = imagePrompt.trim() || description.trim();

      if (!prompt || prompt.length < 10) {
        toast({
          title: 'Error',
          description: 'Please provide a description or image prompt (min 10 characters)',
          variant: 'destructive',
        });
        return;
      }

      const jobResponse = await assetService.generateImageKey(
        asset.id,
        prompt,
        asset.visual_style_capsule_id
      );

      toast({
        title: 'Image generation started',
        description: 'Your image is being generated. This may take a moment...',
      });

      // Poll for job completion
      const pollInterval = setInterval(async () => {
        try {
          const jobStatus = await assetService.checkImageJobStatus(jobResponse.jobId);

          if (jobStatus.status === 'completed' && jobStatus.publicUrl) {
            clearInterval(pollInterval);
            setGeneratingImage(false);
            setImageUrl(jobStatus.publicUrl);
            toast({
              title: 'Success',
              description: 'Image generated successfully',
            });
            // Refresh asset data
            onSaved();
          } else if (jobStatus.status === 'failed') {
            clearInterval(pollInterval);
            setGeneratingImage(false);
            toast({
              title: 'Generation failed',
              description: jobStatus.error?.message || 'Image generation failed',
              variant: 'destructive',
            });
          }
        } catch (error) {
          console.error('Error checking job status:', error);
        }
      }, 2000); // Poll every 2 seconds

      // Timeout after 2 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        setGeneratingImage(false);
        toast({
          title: 'Timeout',
          description: 'Image generation is taking longer than expected. Please check back later.',
          variant: 'destructive',
        });
      }, 120000);

    } catch (error) {
      setGeneratingImage(false);
      console.error('Failed to generate image:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate image',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter an asset name',
        variant: 'destructive',
      });
      return;
    }

    if (!description.trim() || description.trim().length < 10) {
      toast({
        title: 'Validation Error',
        description: 'Description must be at least 10 characters',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);

      let savedAsset: GlobalAsset;

      if (asset) {
        // Update existing asset
        console.log('[AssetDialog] Updating asset:', asset.id);
        savedAsset = await assetService.updateAsset(asset.id, {
          name: name.trim(),
          assetType,
          description: description.trim(),
          imagePrompt: imagePrompt.trim() || undefined,
        });
        console.log('[AssetDialog] Asset updated:', savedAsset);
      } else {
        // Create new asset
        const request: CreateAssetRequest = {
          name: name.trim(),
          assetType,
          description: description.trim(),
          imagePrompt: imagePrompt.trim() || undefined,
        };
        console.log('[AssetDialog] Creating asset:', request);
        savedAsset = await assetService.createAsset(request);
        console.log('[AssetDialog] Asset created:', savedAsset);
      }

      // Upload image if a new file was selected
      if (imageFile && savedAsset) {
        try {
          setUploadingImage(true);
          const updatedAsset = await assetService.uploadImage(savedAsset.id, imageFile);
          console.log('[AssetDialog] Image uploaded:', updatedAsset);
          toast({
            title: 'Success',
            description: 'Asset saved and image uploaded successfully',
          });
        } catch (uploadError) {
          console.error('Failed to upload image:', uploadError);
          toast({
            title: 'Warning',
            description: 'Asset saved but image upload failed. You can upload it later.',
            variant: 'destructive',
          });
        } finally {
          setUploadingImage(false);
        }
      }

      onSaved();
    } catch (error) {
      console.error('Failed to save asset:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save asset',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const assetTypeOptions = [
    { value: 'character' as const, label: 'Character', icon: User },
    { value: 'prop' as const, label: 'Prop', icon: Box },
    { value: 'location' as const, label: 'Location', icon: MapPin },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {asset ? 'Edit Asset' : 'Create New Asset'}
          </DialogTitle>
          <DialogDescription>
            {asset
              ? 'Update the details of your asset'
              : 'Define a reusable character, prop, or location for your projects'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="e.g., Detective Sarah Chen, Enchanted Sword, Cyberpunk Alley"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* Asset Type */}
          <div className="space-y-2">
            <Label htmlFor="assetType">
              Asset Type <span className="text-destructive">*</span>
            </Label>
            <Select
              value={assetType}
              onValueChange={(value) => setAssetType(value as AssetType)}
            >
              <SelectTrigger id="assetType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {assetTypeOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center">
                        <Icon className="mr-2 h-4 w-4" />
                        {option.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="description"
              placeholder="Describe the asset's appearance, personality, or characteristics..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              required
            />
            <p className="text-xs text-muted-foreground">
              {description.length} characters (minimum 10)
            </p>
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <Label>
              Image {asset && !imageFile && imageUrl ? '(Optional)' : ''}
            </Label>
            {imageUrl ? (
              <div className="relative">
                <div className="relative w-full h-48 rounded-lg border overflow-hidden bg-muted">
                  <img
                    src={imageUrl}
                    alt="Asset preview"
                    className="w-full h-full object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={handleRemoveImage}
                    disabled={saving || uploadingImage || generatingImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {imageFile && (
                  <p className="text-xs text-muted-foreground mt-1">
                    New image will be uploaded when you save
                  </p>
                )}
                {asset && (
                  <div className="mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateImage}
                      disabled={saving || uploadingImage || generatingImage}
                      className="w-full"
                    >
                      {generatingImage ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Regenerate Image
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div
                  className={cn(
                    'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                    'hover:border-primary/50 hover:bg-muted/50',
                    (saving || uploadingImage || generatingImage) && 'opacity-50 cursor-not-allowed'
                  )}
                  onClick={() => !saving && !uploadingImage && !generatingImage && fileInputRef.current?.click()}
                >
                  <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm font-medium mb-1">Upload an image</p>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPEG, or WebP (max 10MB)
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={saving || uploadingImage || generatingImage}
                  />
                </div>
                {asset && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateImage}
                    disabled={saving || uploadingImage || generatingImage}
                    className="w-full"
                  >
                    {generatingImage ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generate Image with AI
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
            {!imageUrl && (
              <p className="text-xs text-muted-foreground">
                Image is recommended but optional. You can upload one or generate it with AI after creating the asset.
              </p>
            )}
          </div>

          {/* Image Prompt (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="imagePrompt">
              Image Prompt (Optional)
            </Label>
            <Textarea
              id="imagePrompt"
              placeholder="AI-optimized prompt for image generation (leave empty to use description)"
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Provide a specific prompt for better AI-generated images. If left empty, the description will be used.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving || uploadingImage}>
              {uploadingImage ? 'Uploading Image...' : saving ? 'Saving...' : asset ? 'Update Asset' : 'Create Asset'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

