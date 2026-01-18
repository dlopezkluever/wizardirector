import { useState, useEffect } from 'react';
import { User, Box, MapPin } from 'lucide-react';

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

  // Form state
  const [name, setName] = useState('');
  const [assetType, setAssetType] = useState<AssetType>('character');
  const [description, setDescription] = useState('');
  const [imagePrompt, setImagePrompt] = useState('');

  // Reset form when dialog opens/closes or asset changes
  useEffect(() => {
    if (open) {
      if (asset) {
        // Editing existing asset
        setName(asset.name);
        setAssetType(asset.asset_type);
        setDescription(asset.description);
        setImagePrompt(asset.image_prompt || '');
      } else {
        // Creating new asset
        setName('');
        setAssetType('character');
        setDescription('');
        setImagePrompt('');
      }
    }
  }, [open, asset]);

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

      if (asset) {
        // Update existing asset
        console.log('[AssetDialog] Updating asset:', asset.id);
        const updated = await assetService.updateAsset(asset.id, {
          name: name.trim(),
          assetType,
          description: description.trim(),
          imagePrompt: imagePrompt.trim() || undefined,
        });
        console.log('[AssetDialog] Asset updated:', updated);
      } else {
        // Create new asset
        const request: CreateAssetRequest = {
          name: name.trim(),
          assetType,
          description: description.trim(),
          imagePrompt: imagePrompt.trim() || undefined,
        };
        console.log('[AssetDialog] Creating asset:', request);
        const created = await assetService.createAsset(request);
        console.log('[AssetDialog] Asset created:', created);
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
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : asset ? 'Update Asset' : 'Create Asset'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

