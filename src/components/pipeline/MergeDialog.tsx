import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Loader2, User, MapPin, Package, Users } from 'lucide-react';
import type { ProjectAsset } from '@/types/asset';

interface MergeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assets: ProjectAsset[];
  onConfirm: (survivorId: string, updatedName?: string) => Promise<void>;
}

const getAssetIcon = (type: ProjectAsset['asset_type']) => {
  switch (type) {
    case 'character': return User;
    case 'location': return MapPin;
    case 'prop': return Package;
    case 'extra_archetype': return Users;
    default: return Package;
  }
};

export function MergeDialog({ open, onOpenChange, assets, onConfirm }: MergeDialogProps) {
  const [survivorId, setSurvivorId] = useState<string>(assets[0]?.id || '');
  const [updatedName, setUpdatedName] = useState('');
  const [isMerging, setIsMerging] = useState(false);

  // Reset state when dialog opens
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setSurvivorId(assets[0]?.id || '');
      setUpdatedName('');
    }
    onOpenChange(nextOpen);
  };

  const survivor = assets.find(a => a.id === survivorId);
  const absorbed = assets.filter(a => a.id !== survivorId);

  // Count total scene instances that will be re-pointed
  const absorbedSceneCount = absorbed.reduce(
    (sum, a) => sum + (a.scene_numbers?.length || 0),
    0
  );

  const absorbedWithImages = absorbed.filter(a => a.image_key_url);

  const handleConfirm = async () => {
    try {
      setIsMerging(true);
      await onConfirm(survivorId, updatedName.trim() || undefined);
    } finally {
      setIsMerging(false);
    }
  };

  if (assets.length < 2) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Merge {assets.length} Assets</DialogTitle>
          <DialogDescription>
            Choose which asset survives. The others will be absorbed and deleted.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Survivor Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Select Survivor</Label>
            <RadioGroup value={survivorId} onValueChange={setSurvivorId}>
              {assets.map(asset => {
                const Icon = getAssetIcon(asset.asset_type);
                return (
                  <label
                    key={asset.id}
                    className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                  >
                    <RadioGroupItem value={asset.id} />
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {asset.image_key_url ? (
                        <img
                          src={asset.image_key_url}
                          alt={asset.name}
                          className="w-10 h-10 rounded object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0">
                          <Icon className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{asset.name}</p>
                        <div className="flex gap-1 flex-wrap mt-0.5">
                          {asset.scene_numbers?.map(n => (
                            <Badge key={n} variant="secondary" className="text-[10px] px-1">
                              Sc.{n}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </label>
                );
              })}
            </RadioGroup>
          </div>

          {/* Optional Name Edit */}
          <div className="space-y-1">
            <Label className="text-sm font-medium">Rename Survivor (optional)</Label>
            <Input
              value={updatedName}
              onChange={e => setUpdatedName(e.target.value)}
              placeholder={survivor?.name || 'Keep current name'}
            />
          </div>

          {/* Summary */}
          <div className="rounded-md bg-muted/50 p-3 text-sm space-y-1">
            <p>
              <strong>{absorbed.length}</strong> asset{absorbed.length > 1 ? 's' : ''} will be absorbed into{' '}
              <strong>{updatedName.trim() || survivor?.name}</strong>
            </p>
            {absorbedSceneCount > 0 && (
              <p className="text-muted-foreground">
                {absorbedSceneCount} scene assignment{absorbedSceneCount > 1 ? 's' : ''} will be re-pointed to the survivor
              </p>
            )}
          </div>

          {/* Warning about lost images */}
          {absorbedWithImages.length > 0 && (
            <Alert variant="destructive" className="py-2">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription className="text-xs">
                {absorbedWithImages.length} absorbed asset{absorbedWithImages.length > 1 ? 's have' : ' has'} generated images that will be lost:
                {' '}{absorbedWithImages.map(a => a.name).join(', ')}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isMerging}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isMerging || !survivorId}>
            {isMerging ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Merging...
              </>
            ) : (
              'Confirm Merge'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
