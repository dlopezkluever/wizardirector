import { useState, useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Loader2, User, MapPin, Package, Users, Sparkles } from 'lucide-react';
import { projectAssetService } from '@/lib/services/projectAssetService';
import { toast } from 'sonner';
import type { ProjectAsset } from '@/types/asset';

interface MergeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assets: ProjectAsset[];
  projectId: string;
  onConfirm: (survivorId: string, updatedName?: string, updatedDescription?: string) => Promise<void>;
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

const formatTypeName = (type: string) =>
  type === 'extra_archetype' ? 'Extra/Archetype' : type.charAt(0).toUpperCase() + type.slice(1);

export function MergeDialog({ open, onOpenChange, assets, projectId, onConfirm }: MergeDialogProps) {
  const [survivorId, setSurvivorId] = useState<string>(assets[0]?.id || '');
  const [updatedName, setUpdatedName] = useState('');
  const [updatedDescription, setUpdatedDescription] = useState('');
  const [originalSurvivorDesc, setOriginalSurvivorDesc] = useState('');
  const [isMerging, setIsMerging] = useState(false);
  const [isMergingDescriptions, setIsMergingDescriptions] = useState(false);

  // Reset state when dialog opens
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setSurvivorId(assets[0]?.id || '');
      setUpdatedName('');
      const desc = assets[0]?.description || '';
      setUpdatedDescription(desc);
      setOriginalSurvivorDesc(desc);
    }
    onOpenChange(nextOpen);
  };

  // Update description when survivor changes
  useEffect(() => {
    const s = assets.find(a => a.id === survivorId);
    if (s) {
      const desc = s.description || '';
      setUpdatedDescription(desc);
      setOriginalSurvivorDesc(desc);
    }
  }, [survivorId, assets]);

  const survivor = assets.find(a => a.id === survivorId);
  const absorbed = assets.filter(a => a.id !== survivorId);

  // Detect mixed types
  const uniqueTypes = new Set(assets.map(a => a.asset_type));
  const hasMixedTypes = uniqueTypes.size > 1;

  // Count total scene instances that will be re-pointed
  const absorbedSceneCount = absorbed.reduce(
    (sum, a) => sum + (a.scene_numbers?.length || 0),
    0
  );

  const absorbedWithImages = absorbed.filter(a => a.image_key_url);

  const handleAIMerge = async () => {
    if (!survivor) return;
    const descriptions = [
      survivor.description || '',
      ...absorbed.map(a => a.description || '').filter(Boolean),
    ];
    if (descriptions.filter(Boolean).length < 2) {
      toast.error('Need at least 2 non-empty descriptions to merge');
      return;
    }
    try {
      setIsMergingDescriptions(true);
      const merged = await projectAssetService.mergeDescriptions(projectId, descriptions);
      setUpdatedDescription(merged);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to merge descriptions');
    } finally {
      setIsMergingDescriptions(false);
    }
  };

  const handleConfirm = async () => {
    try {
      setIsMerging(true);
      // Only send updatedDescription if it was actually changed from the survivor's original
      const descToSend = updatedDescription !== originalSurvivorDesc ? updatedDescription : undefined;
      await onConfirm(survivorId, updatedName.trim() || undefined, descToSend);
    } finally {
      setIsMerging(false);
    }
  };

  if (assets.length < 2) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Merge {assets.length} Assets</DialogTitle>
          <DialogDescription>
            Choose which asset survives. The others will be absorbed and deleted.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Cross-type warning */}
          {hasMixedTypes && (
            <Alert className="border-amber-500/50 bg-amber-500/10 py-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <AlertDescription className="text-xs text-amber-700 dark:text-amber-400">
                These assets have different types. The survivor will keep its type
                ({survivor ? formatTypeName(survivor.asset_type) : ''}).
                Absorbed assets and their scene associations will be transferred.
              </AlertDescription>
            </Alert>
          )}

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
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium truncate">{asset.name}</p>
                          <Badge variant="outline" className="text-[10px] px-1 shrink-0">
                            {formatTypeName(asset.asset_type)}
                          </Badge>
                        </div>
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

          {/* Description Merge Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Description</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAIMerge}
                disabled={isMergingDescriptions}
                className="h-7 text-xs"
              >
                {isMergingDescriptions ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                    Merging...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3 mr-1" />
                    AI Merge
                  </>
                )}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {/* Left: Absorbed descriptions (read-only) */}
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Absorbed Descriptions</Label>
                <div className="max-h-40 overflow-y-auto space-y-2 rounded border p-2 bg-muted/30">
                  {absorbed.map(a => (
                    <div key={a.id} className="text-xs space-y-0.5">
                      <p className="font-medium text-muted-foreground">{a.name}</p>
                      <p className="text-muted-foreground/80">{a.description || '(no description)'}</p>
                    </div>
                  ))}
                </div>
              </div>
              {/* Right: Survivor description (editable) */}
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Survivor Description</Label>
                <Textarea
                  value={updatedDescription}
                  onChange={e => setUpdatedDescription(e.target.value)}
                  className="resize-none text-xs min-h-[10rem]"
                  placeholder="Edit the merged description..."
                />
              </div>
            </div>
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
