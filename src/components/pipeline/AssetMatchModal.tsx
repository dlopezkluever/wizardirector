import { useState, useMemo } from 'react';
import { User, MapPin, Package, Loader2, Info } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { projectAssetService } from '@/lib/services/projectAssetService';
import type { GlobalAsset, ProjectAsset, AssetType } from '@/types/asset';
import { cn } from '@/lib/utils';

interface AssetMatchModalProps {
  globalAsset: GlobalAsset;
  projectAssets: ProjectAsset[]; // Extracted assets only (those without global_asset_id)
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onMatched: (asset: ProjectAsset) => void; // Called after successful match
  onClonedWithoutMatch: (asset: ProjectAsset) => void; // Existing behavior
}

const assetTypeConfig: Record<AssetType, { icon: any; label: string; color: string }> = {
  character: {
    icon: User,
    label: 'Character',
    color: 'bg-blue-500',
  },
  prop: {
    icon: Package,
    label: 'Prop',
    color: 'bg-green-500',
  },
  location: {
    icon: MapPin,
    label: 'Location',
    color: 'bg-purple-500',
  },
};

export function AssetMatchModal({
  globalAsset,
  projectAssets,
  projectId,
  isOpen,
  onClose,
  onMatched,
  onClonedWithoutMatch,
}: AssetMatchModalProps) {
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [nameStrategy, setNameStrategy] = useState<'project' | 'global' | 'custom'>('project');
  const [customName, setCustomName] = useState<string>('');
  const [descriptionStrategy, setDescriptionStrategy] = useState<'global' | 'project' | 'merge'>('merge');
  const [regenerateImage, setRegenerateImage] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Group project assets by type for dropdown
  const groupedAssets = useMemo(() => {
    const groups: Record<AssetType, ProjectAsset[]> = {
      character: [],
      prop: [],
      location: [],
    };

    projectAssets.forEach(asset => {
      if (groups[asset.asset_type]) {
        groups[asset.asset_type].push(asset);
      }
    });

    return groups;
  }, [projectAssets]);

  // Get selected project asset for name display
  const selectedProjectAsset = useMemo(() => {
    return projectAssets.find(asset => asset.id === selectedAssetId);
  }, [projectAssets, selectedAssetId]);

  // Reset state when modal closes
  const handleClose = () => {
    if (!isProcessing) {
      setSelectedAssetId('');
      setNameStrategy('project');
      setCustomName('');
      setDescriptionStrategy('merge');
      setRegenerateImage(false);
      onClose();
    }
  };

  const handleMatchAndClone = async () => {
    if (!selectedAssetId) {
      toast.error('Please select an asset to match with');
      return;
    }

    // Validate custom name if custom strategy is selected
    if (nameStrategy === 'custom' && !customName.trim()) {
      toast.error('Please enter a custom name');
      return;
    }

    setIsProcessing(true);
    try {
      const matchedAsset = await projectAssetService.cloneFromGlobal(projectId, globalAsset.id, {
        matchWithAssetId: selectedAssetId,
        nameStrategy,
        customName: nameStrategy === 'custom' ? customName.trim() : undefined,
        descriptionStrategy,
        regenerateImage,
      });

      toast.success(`Successfully matched "${globalAsset.name}" with project asset`);
      onMatched(matchedAsset);
      handleClose();
    } catch (error) {
      console.error('Failed to match asset:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to match asset';
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloneWithoutMatch = async () => {
    setIsProcessing(true);
    try {
      const clonedAsset = await projectAssetService.cloneFromGlobal(projectId, globalAsset.id);

      toast.success(`Successfully cloned "${globalAsset.name}" to project`);
      onClonedWithoutMatch(clonedAsset);
      handleClose();
    } catch (error) {
      console.error('Failed to clone asset:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to clone asset';
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const globalAssetConfig = assetTypeConfig[globalAsset.asset_type];
  const GlobalIcon = globalAssetConfig.icon;

  // Check if there are any assets to match with
  const hasAssetsToMatch = projectAssets.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Match Global Asset with Project Asset</DialogTitle>
          <DialogDescription>
            Match this global asset with an extracted project asset, or clone it without matching.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          {/* Left: Global Asset Preview */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground">Global Asset</h3>
            <Card>
              <div className="relative h-48 bg-muted flex items-center justify-center overflow-hidden rounded-t-lg">
                {globalAsset.image_key_url ? (
                  <img
                    src={globalAsset.image_key_url}
                    alt={globalAsset.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <GlobalIcon className="h-16 w-16 mb-2" strokeWidth={1.5} />
                    <span className="text-sm">No image</span>
                  </div>
                )}
                <div className="absolute top-2 left-2">
                  <Badge className={`${globalAssetConfig.color} text-white`}>
                    <GlobalIcon className="mr-1 h-3 w-3" />
                    {globalAssetConfig.label}
                  </Badge>
                </div>
              </div>
              <CardHeader>
                <CardTitle>{globalAsset.name}</CardTitle>
                <CardDescription className="line-clamp-3">
                  {globalAsset.description}
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* Right: Matching Controls */}
          <div className="space-y-6">
            <h3 className="text-sm font-semibold text-muted-foreground">Matching Options</h3>

            {/* Asset Selection Dropdown */}
            {hasAssetsToMatch ? (
              <div className="space-y-2">
                <Label htmlFor="asset-select">Match with Project Asset</Label>
                <Select value={selectedAssetId} onValueChange={setSelectedAssetId}>
                  <SelectTrigger id="asset-select">
                    <SelectValue placeholder="Select an asset to match with..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(groupedAssets).map(([type, assets]) => {
                      if (assets.length === 0) return null;
                      const typeConfig = assetTypeConfig[type as AssetType];
                      const TypeIcon = typeConfig.icon;

                      return (
                        <SelectGroup key={type}>
                          <SelectLabel className="flex items-center gap-2">
                            <TypeIcon className="h-4 w-4" />
                            {typeConfig.label}s ({assets.length})
                          </SelectLabel>
                          {assets.map(asset => (
                            <SelectItem key={asset.id} value={asset.id}>
                              <div className="flex items-center gap-2">
                                <span>{asset.name}</span>
                                {asset.image_key_url && (
                                  <Badge variant="outline" className="text-xs">
                                    Has Image
                                  </Badge>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      );
                    })}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Select an extracted project asset to merge with this global asset.
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-4 text-center">
                <Info className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No extracted assets available to match with.
                </p>
              </div>
            )}

            {/* Name Selection */}
            {selectedAssetId && selectedProjectAsset && (
              <div className="space-y-3">
                <Label>Asset Name</Label>
                <RadioGroup
                  value={nameStrategy}
                  onValueChange={(value) => setNameStrategy(value as 'project' | 'global' | 'custom')}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="project" id="name-project" />
                    <Label htmlFor="name-project" className="font-normal cursor-pointer">
                      {selectedProjectAsset.name}
                      <span className="block text-xs text-muted-foreground mt-0.5">
                        Use project asset name (default)
                      </span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="global" id="name-global" />
                    <Label htmlFor="name-global" className="font-normal cursor-pointer">
                      {globalAsset.name} ({selectedProjectAsset.name})
                      <span className="block text-xs text-muted-foreground mt-0.5">
                        Use global name with project name in parentheses
                      </span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="custom" id="name-custom" />
                    <div className="flex-1 space-y-1">
                      <Label htmlFor="name-custom" className="font-normal cursor-pointer">
                        Custom Name
                        <span className="block text-xs text-muted-foreground mt-0.5">
                          Enter custom name with project name in parentheses
                        </span>
                      </Label>
                      {nameStrategy === 'custom' && (
                        <>
                          <Input
                            id="custom-name-input"
                            value={customName}
                            onChange={(e) => setCustomName(e.target.value)}
                            placeholder="Enter custom name"
                            className="mt-1"
                          />
                          <p className="text-xs text-muted-foreground">
                            Will be saved as: {customName.trim() || '...'} ({selectedProjectAsset.name})
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </RadioGroup>
              </div>
            )}

            {/* Description Strategy */}
            {selectedAssetId && (
              <div className="space-y-3">
                <Label>Description Strategy</Label>
                <RadioGroup
                  value={descriptionStrategy}
                  onValueChange={(value) => setDescriptionStrategy(value as 'global' | 'project' | 'merge')}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="global" id="strategy-global" />
                    <Label htmlFor="strategy-global" className="font-normal cursor-pointer">
                      Use Global Asset
                      <span className="block text-xs text-muted-foreground mt-0.5">
                        Completely replace extracted description
                      </span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="project" id="strategy-project" />
                    <Label htmlFor="strategy-project" className="font-normal cursor-pointer">
                      Use Project Asset
                      <span className="block text-xs text-muted-foreground mt-0.5">
                        Keep extracted description, ignore global
                      </span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="merge" id="strategy-merge" />
                    <Label htmlFor="strategy-merge" className="font-normal cursor-pointer">
                      Merge Descriptions
                      <span className="block text-xs text-muted-foreground mt-0.5">
                        Global as base + project additions
                      </span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {/* Image Regeneration Toggle */}
            {selectedAssetId && globalAsset.image_key_url && (
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="regenerate-image" className="cursor-pointer">
                    Regenerate Image
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Generate new image using merged description (uses global image as reference)
                  </p>
                </div>
                <Switch
                  id="regenerate-image"
                  checked={regenerateImage}
                  onCheckedChange={setRegenerateImage}
                />
              </div>
            )}
          </div>
        </div>

        <Separator />

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleCloneWithoutMatch}
            disabled={isProcessing}
            className="w-full sm:w-auto"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cloning...
              </>
            ) : (
              'Clone Without Matching'
            )}
          </Button>
          {hasAssetsToMatch && (
            <Button
              onClick={handleMatchAndClone}
              disabled={isProcessing || !selectedAssetId}
              className="w-full sm:w-auto"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Matching...
                </>
              ) : (
                'Match & Clone'
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

