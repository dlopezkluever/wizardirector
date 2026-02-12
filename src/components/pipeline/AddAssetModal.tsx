import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { projectAssetService } from '@/lib/services/projectAssetService';
import type { AssetType } from '@/types/asset';

interface AddAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onAssetCreated: () => void;
  defaultType?: AssetType;
}

export function AddAssetModal({
  isOpen,
  onClose,
  projectId,
  onAssetCreated,
  defaultType,
}: AddAssetModalProps) {
  const [name, setName] = useState('');
  const [assetType, setAssetType] = useState<AssetType>(defaultType || 'character');
  const [description, setDescription] = useState('');
  const [sceneNumbers, setSceneNumbers] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setName('');
    setAssetType(defaultType || 'character');
    setDescription('');
    setSceneNumbers('');
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (!description.trim()) {
      toast.error('Description is required');
      return;
    }

    try {
      setIsSubmitting(true);

      const parsedSceneNumbers = sceneNumbers
        .split(',')
        .map(s => parseInt(s.trim(), 10))
        .filter(n => !isNaN(n) && n > 0);

      await projectAssetService.createAsset(projectId, {
        name: name.trim(),
        asset_type: assetType,
        description: description.trim(),
      });

      toast.success(`Asset "${name.trim()}" created`);
      resetForm();
      onAssetCreated();
      onClose();
    } catch (error) {
      console.error('Failed to create asset:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create asset');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Asset Manually</DialogTitle>
          <DialogDescription>
            {defaultType === 'extra_archetype'
              ? 'Create a background character prototype for consistent crowd/extras generation.'
              : 'Create a new asset that wasn\'t caught by extraction.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="asset-name">Name</Label>
            <Input
              id="asset-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., ELARA, Castle Courtyard, Magic Staff"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="asset-type">Type</Label>
            <Select value={assetType} onValueChange={(v) => setAssetType(v as AssetType)}>
              <SelectTrigger id="asset-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="character">Character</SelectItem>
                <SelectItem value="location">Location</SelectItem>
                <SelectItem value="prop">Prop</SelectItem>
                <SelectItem value="extra_archetype">Extra Archetype</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="asset-description">Description</Label>
            <Textarea
              id="asset-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Visual description for image generation..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="scene-numbers">Scene Numbers (optional)</Label>
            <Input
              id="scene-numbers"
              value={sceneNumbers}
              onChange={(e) => setSceneNumbers(e.target.value)}
              placeholder="e.g., 1, 3, 5"
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated scene numbers where this asset appears.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !name.trim() || !description.trim()}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Creating...
              </>
            ) : (
              'Create Asset'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
