import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  User, MapPin, Package, Sparkles, Check, Lock, Loader2, 
  AlertTriangle, Info, MoreVertical, Trash2, Edit, Upload,
  RefreshCw, Plus, Merge as MergeIcon, Save
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useStageState } from '@/lib/hooks/useStageState';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { stageStateService } from '@/lib/services/stageStateService';
import { projectAssetService } from '@/lib/services/projectAssetService';
import { StyleCapsuleSelector } from '@/components/styleCapsules/StyleCapsuleSelector';
import type { ProjectAsset } from '@/types/asset';

interface Stage5AssetsProps {
  projectId: string;
  onComplete: () => void;
  onBack: () => void;
}

const ASPECT_RATIOS = {
  character: { width: 512, height: 768, label: '2:3 portrait' },
  location: { width: 1024, height: 576, label: '16:9 cinematic' },
  prop: { width: 512, height: 512, label: '1:1 square' }
};

export function Stage5Assets({ projectId, onComplete, onBack }: Stage5AssetsProps) {
  const { content, setContent, stageState, isLoading } = useStageState({
    projectId,
    stageNumber: 5,
    initialContent: {
      locked_visual_style_capsule_id: null,
      style_locked_at: null
    },
    autoSave: true
  });

  const [lockedStyleId, setLockedStyleId] = useState<string | null>(null);
  const [isStyleLocked, setIsStyleLocked] = useState(false);
  const [assets, setAssets] = useState<ProjectAsset[]>([]);
  const [hasExtracted, setHasExtracted] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [expandedAssetId, setExpandedAssetId] = useState<string | null>(null);
  const [editingDescriptions, setEditingDescriptions] = useState<Record<string, string>>({});
  const [savingAssets, setSavingAssets] = useState<Set<string>>(new Set());
  const [saveTimeouts, setSaveTimeouts] = useState<Record<string, NodeJS.Timeout>>({});

  // Initialize from saved state
  useEffect(() => {
    if (content?.locked_visual_style_capsule_id) {
      setLockedStyleId(content.locked_visual_style_capsule_id);
      setIsStyleLocked(true);
    }
  }, [content]);

  // Load existing assets
  useEffect(() => {
    if (projectId) {
      loadAssets();
    }
  }, [projectId]);

  const loadAssets = async () => {
    try {
      const existingAssets = await projectAssetService.listAssets(projectId);
      if (existingAssets.length > 0) {
        setAssets(existingAssets);
        setHasExtracted(true);
      }
    } catch (error) {
      console.error('Failed to load assets:', error);
    }
  };

  const handleStyleLock = async (styleId: string) => {
    setLockedStyleId(styleId);
    setIsStyleLocked(true);

    setContent({
      locked_visual_style_capsule_id: styleId,
      style_locked_at: new Date().toISOString()
    });

    toast.success('Visual style locked! You can now extract assets.');
  };

  const handleExtractAssets = async () => {
    if (!lockedStyleId) {
      toast.error('Please select a visual style first');
      return;
    }

    try {
      setIsExtracting(true);
      toast.info('Extracting assets from script... This may take 30-60 seconds.');

      const extractedAssets = await projectAssetService.extractAssets(projectId);
      
      if (!extractedAssets || extractedAssets.length === 0) {
        toast.warning('No assets found in script. You can manually add assets below.');
        setHasExtracted(true);
        return;
      }

      setAssets(extractedAssets);
      setHasExtracted(true);

      toast.success(`Extracted ${extractedAssets.length} assets!`);
    } catch (error) {
      console.error('Failed to extract assets:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to extract assets';
      
      // Provide helpful error messages based on error type
      if (errorMessage.includes('Stage 4 must be completed')) {
        toast.error('Please complete Stage 4 (Script) before extracting assets.');
      } else if (errorMessage.includes('Visual Style Capsule must be selected')) {
        toast.error('Please select a visual style capsule first.');
      } else if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
        toast.error('Extraction timed out. The script may be too long. Please try again or contact support.');
      } else {
        toast.error(`Extraction failed: ${errorMessage}. You can manually add assets.`);
      }
      
      // Still allow manual asset creation even if extraction fails
      setHasExtracted(true);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleGenerateImage = async (assetId: string) => {
    const asset = assets.find(a => a.id === assetId);
    if (!asset) return;

    try {
      toast.info(`Generating ${asset.asset_type} image...`);

      const result = await projectAssetService.generateImage(projectId, assetId);

      // Update asset with generated image
      setAssets(prev => prev.map(a =>
        a.id === assetId
          ? { ...a, image_key_url: result.publicUrl }
          : a
      ));

      toast.success(`Image generated for ${asset.name}!`);
    } catch (error) {
      console.error('Failed to generate image:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate image';
      
      // Provide helpful error messages
      if (errorMessage.includes('Visual Style Capsule is required')) {
        toast.error('Visual style is required for image generation.');
      } else if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
        toast.error(`Image generation timed out for ${asset.name}. Please try again.`);
      } else if (errorMessage.includes('rate limit')) {
        toast.error('Rate limit reached. Please wait a moment and try again.');
      } else {
        toast.error(`Failed to generate image for ${asset.name}: ${errorMessage}`);
      }
    }
  };

  const handleUpdateDescription = useCallback(async (assetId: string, description: string) => {
    try {
      setSavingAssets(prev => new Set(prev).add(assetId));
      await projectAssetService.updateAsset(projectId, assetId, { description });
      setAssets(prev => prev.map(a =>
        a.id === assetId ? { ...a, description } : a
      ));
      // Silent save - no toast
    } catch (error) {
      console.error('Failed to update description:', error);
      toast.error('Failed to save description');
    } finally {
      setSavingAssets(prev => {
        const next = new Set(prev);
        next.delete(assetId);
        return next;
      });
    }
  }, [projectId]);

  const handleDescriptionChange = useCallback((assetId: string, newDescription: string) => {
    // Update local state immediately
    setEditingDescriptions(prev => ({
      ...prev,
      [assetId]: newDescription
    }));

    // Clear existing timeout for this asset
    if (saveTimeouts[assetId]) {
      clearTimeout(saveTimeouts[assetId]);
    }

    // Set new timeout for auto-save (1 second debounce)
    const timeoutId = setTimeout(() => {
      const asset = assets.find(a => a.id === assetId);
      if (asset && newDescription !== asset.description && newDescription.length > 0) {
        handleUpdateDescription(assetId, newDescription);
      }
    }, 1000);

    setSaveTimeouts(prev => ({
      ...prev,
      [assetId]: timeoutId
    }));
  }, [assets, saveTimeouts, handleUpdateDescription]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(saveTimeouts).forEach(clearTimeout);
    };
  }, []);

  const handleDeleteAsset = async (assetId: string) => {
    if (!confirm('Remove this asset? This cannot be undone.')) return;

    try {
      await projectAssetService.deleteAsset(projectId, assetId);
      setAssets(prev => prev.filter(a => a.id !== assetId));
      toast.success('Asset removed');
    } catch (error) {
      console.error('Failed to delete asset:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete asset');
    }
  };

  const handleLockAsset = async (assetId: string) => {
    try {
      const lockedAsset = await projectAssetService.lockAsset(projectId, assetId);
      setAssets(prev => prev.map(a =>
        a.id === assetId ? lockedAsset : a
      ));
      toast.success('Asset locked');
    } catch (error) {
      console.error('Failed to lock asset:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to lock asset');
    }
  };

  const handlePromoteToGlobal = async (assetId: string) => {
    try {
      await projectAssetService.promoteToGlobal(projectId, assetId);
      toast.success('Asset promoted to Global Library!');
    } catch (error) {
      console.error('Failed to promote asset:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to promote asset');
    }
  };

  const handleLockAllAssets = async () => {
    // Validate prerequisites
    if (!isStyleLocked) {
      toast.error('Visual style must be selected');
      return;
    }

    const unlockedAssets = assets.filter(a => !a.locked);
    if (unlockedAssets.length > 0) {
      toast.error(`${unlockedAssets.length} assets still need to be locked`);
      return;
    }

    const assetsWithoutImages = assets.filter(a => !a.image_key_url);
    if (assetsWithoutImages.length > 0) {
      toast.error(`${assetsWithoutImages.length} assets need image keys`);
      return;
    }

    try {
      setIsLocking(true);

      await projectAssetService.lockAllAssets(projectId);
      await stageStateService.lockStage(projectId, 5);

      toast.success('Stage 5 completed! All assets locked.');
      onComplete();
    } catch (error) {
      console.error('Failed to lock assets:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to lock assets');
    } finally {
      setIsLocking(false);
    }
  };

  const getAssetIcon = (type: ProjectAsset['asset_type']) => {
    switch (type) {
      case 'character': return User;
      case 'location': return MapPin;
      case 'prop': return Package;
    }
  };

  const groupedAssets = {
    characters: assets.filter(a => a.asset_type === 'character'),
    locations: assets.filter(a => a.asset_type === 'location'),
    props: assets.filter(a => a.asset_type === 'prop')
  };

  const allAssetsLocked = assets.every(a => a.locked && a.image_key_url);
  const canProceed = isStyleLocked && allAssetsLocked && assets.length > 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>← Back</Button>
          <div>
            <h2 className="font-display text-xl font-semibold text-foreground">Stage 5: Global Assets & Style Lock</h2>
            <p className="text-sm text-muted-foreground">Define visual keys for all characters, locations, and props</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 pb-24">
        <div className="max-w-4xl mx-auto space-y-8">

          {/* STEP 0: Visual Style Selection (MANDATORY FIRST STEP) */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                isStyleLocked ? "bg-success text-white" : "bg-primary text-white"
              )}>
                {isStyleLocked ? '✓' : '1'}
              </div>
              <h3 className="font-display text-xl font-semibold">
                Select Visual Style Capsule
              </h3>
              {isStyleLocked && (
                <Badge variant="default" className="bg-success">LOCKED</Badge>
              )}
            </div>

            <Alert className={isStyleLocked ? "border-success" : "border-primary"}>
              <AlertDescription>
                {isStyleLocked
                  ? "Visual style is locked. All assets will use this style."
                  : "⚠️ You must select a visual style before extracting assets. This ensures all generated images are consistent."}
              </AlertDescription>
            </Alert>

            <StyleCapsuleSelector
              type="visual"
              value={lockedStyleId || ''}
              onChange={handleStyleLock}
              required={true}
              disabled={isStyleLocked}
              showPreview={true}
            />
          </section>

          {/* STEP 1: Asset Extraction */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                !isStyleLocked ? "bg-muted text-muted-foreground" :
                hasExtracted ? "bg-success text-white" : "bg-primary text-white"
              )}>
                {hasExtracted ? '✓' : '2'}
              </div>
              <h3 className={cn(
                "font-display text-xl font-semibold",
                !isStyleLocked && "text-muted-foreground"
              )}>
                Extract Assets from Script
              </h3>
            </div>

            {!hasExtracted && (
              <Button
                onClick={handleExtractAssets}
                disabled={!isStyleLocked || isExtracting}
                size="lg"
                className="w-full"
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Analyzing Script...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Extract Characters, Props & Locations
                  </>
                )}
              </Button>
            )}

            {hasExtracted && (
              <Alert variant="default" className="border-success">
                <Check className="w-4 h-4" />
                <AlertDescription>
                  {assets.length} assets extracted successfully
                </AlertDescription>
              </Alert>
            )}
          </section>

          {/* STEP 2: Review & Generate Assets */}
          {hasExtracted && (
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
                    3
                  </div>
                  <h3 className="font-display text-xl font-semibold">
                    Review & Generate Visual Keys
                  </h3>
                </div>

                <div className="text-sm text-muted-foreground">
                  {assets.filter(a => a.image_key_url).length}/{assets.length} images generated •{' '}
                  {assets.filter(a => a.locked).length}/{assets.length} locked
                </div>
              </div>

              {/* Batch Actions */}
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const assetsWithoutImages = assets.filter(a => !a.image_key_url && !a.locked);
                    if (assetsWithoutImages.length === 0) {
                      toast.info('All assets already have images');
                      return;
                    }
                    
                    toast.info(`Generating ${assetsWithoutImages.length} images...`);
                    
                    for (const asset of assetsWithoutImages) {
                      try {
                        await handleGenerateImage(asset.id);
                      } catch (error) {
                        console.error(`Failed to generate image for ${asset.name}:`, error);
                      }
                    }
                  }}
                  disabled={assets.filter(a => !a.image_key_url && !a.locked).length === 0}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate All Images ({assets.filter(a => !a.image_key_url && !a.locked).length})
                </Button>
              </div>

              {/* Asset Type Groups */}
              {Object.entries(groupedAssets).map(([type, typeAssets]) => {
                if (typeAssets.length === 0) return null;

                const Icon = getAssetIcon(typeAssets[0].asset_type);

                return (
                  <div key={type} className="space-y-3">
                    <h4 className="font-semibold capitalize flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      {type} ({typeAssets.length})
                    </h4>

                    <div className="space-y-3">
                      {typeAssets.map(asset => {
                        const AspectIcon = getAssetIcon(asset.asset_type);
                        const aspectInfo = ASPECT_RATIOS[asset.asset_type];
                        const isExpanded = expandedAssetId === asset.id;
                        const editingDescription = editingDescriptions[asset.id] ?? asset.description;
                        const isSaving = savingAssets.has(asset.id);

                        return (
                          <Card key={asset.id} className={cn(
                            'transition-all',
                            asset.locked && 'border-success bg-success/5'
                          )}>
                            <CardHeader>
                              <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3 flex-1">
                                  <div className={cn(
                                    'flex items-center justify-center w-10 h-10 rounded-lg shrink-0',
                                    asset.image_key_url ? 'bg-success/20 text-success' : 'bg-secondary text-muted-foreground'
                                  )}>
                                    <AspectIcon className="w-5 h-5" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <CardTitle className="text-lg">{asset.name}</CardTitle>
                                      <Badge variant="outline">{asset.asset_type}</Badge>
                                      {asset.metadata?.is_priority && (
                                        <Badge variant="default">Priority</Badge>
                                      )}
                                      {asset.metadata?.has_conflicts && (
                                        <Badge variant="destructive">
                                          <AlertTriangle className="w-3 h-3 mr-1" />
                                          Conflicts
                                        </Badge>
                                      )}
                                      {asset.locked && (
                                        <Badge variant="default" className="bg-success">
                                          <Lock className="w-3 h-3 mr-1" />
                                          Locked
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <MoreVertical className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => setExpandedAssetId(isExpanded ? null : asset.id)}>
                                      <Edit className="w-4 h-4 mr-2" />
                                      {isExpanded ? 'Collapse' : 'Edit Details'}
                                    </DropdownMenuItem>
                                    {asset.image_key_url && (
                                      <DropdownMenuItem onClick={() => handlePromoteToGlobal(asset.id)}>
                                        <Upload className="w-4 h-4 mr-2" />
                                        Promote to Global Library
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => handleDeleteAsset(asset.id)}
                                      className="text-destructive"
                                      disabled={asset.locked}
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Remove Asset
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </CardHeader>

                            <CardContent className="space-y-4">
                              {/* Conflict Warning */}
                              {asset.metadata?.has_conflicts && asset.metadata?.conflict_details && (
                                <Alert variant="destructive">
                                  <AlertTriangle className="w-4 h-4" />
                                  <AlertDescription>
                                    <strong>Visual Conflict Detected:</strong> {asset.metadata.conflict_details}
                                    <br />
                                    <span className="text-xs">Please review and edit the description to resolve inconsistencies.</span>
                                  </AlertDescription>
                                </Alert>
                              )}

                              {/* Image Preview */}
                              {asset.image_key_url ? (
                                <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                                  <img
                                    src={asset.image_key_url}
                                    alt={asset.name}
                                    className="w-full h-full object-cover"
                                  />
                                  <Badge className="absolute top-2 right-2 bg-success">
                                    <Check className="w-3 h-3 mr-1" />
                                    Generated
                                  </Badge>
                                </div>
                              ) : (
                                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                                  <div className="text-center text-muted-foreground">
                                    <AspectIcon className="w-12 h-12 mx-auto mb-2" />
                                    <p className="text-sm">No image generated yet</p>
                                  </div>
                                </div>
                              )}

                              {/* Description (always visible) */}
                              {isExpanded ? (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label>Visual Description</Label>
                                    {isSaving && (
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                        Saving...
                                      </div>
                                    )}
                                  </div>
                                  <Textarea
                                    value={editingDescription}
                                    onChange={(e) => handleDescriptionChange(asset.id, e.target.value)}
                                    rows={4}
                                    className="resize-none"
                                    disabled={asset.locked}
                                    placeholder="Describe the visual appearance..."
                                  />
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Info className="w-3 h-3" />
                                    Auto-sizing: {aspectInfo.width}x{aspectInfo.height} ({aspectInfo.label})
                                    {!isSaving && editingDescription !== asset.description && (
                                      <span className="text-success">• Changes saved</span>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {asset.description}
                                </p>
                              )}

                              {/* Actions */}
                              <div className="flex gap-2">
                                {!asset.image_key_url ? (
                                  <Button
                                    onClick={() => handleGenerateImage(asset.id)}
                                    disabled={asset.locked}
                                    className="flex-1"
                                  >
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    Generate Image Key
                                  </Button>
                                ) : (
                                  <Button
                                    variant="outline"
                                    onClick={() => handleGenerateImage(asset.id)}
                                    disabled={asset.locked}
                                    className="flex-1"
                                  >
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Regenerate
                                  </Button>
                                )}

                                {asset.image_key_url && !asset.locked && (
                                  <Button
                                    variant="default"
                                    onClick={() => handleLockAsset(asset.id)}
                                    className="bg-success hover:bg-success/90"
                                  >
                                    <Check className="w-4 h-4 mr-2" />
                                    Lock Asset
                                  </Button>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </section>
          )}

        </div>
      </div>

      {/* Floating Gatekeeper Bar */}
      {hasExtracted && (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t p-4 shadow-lg">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="text-sm">
              <div className="font-medium">Stage 5 Progress</div>
              <div className="text-muted-foreground">
                {assets.filter(a => a.locked).length}/{assets.length} assets locked
                {!isStyleLocked && ' • Style not locked'}
              </div>
            </div>

            <Button
              onClick={handleLockAllAssets}
              disabled={!canProceed || isLocking}
              size="lg"
              variant="default"
              className="bg-gold hover:bg-gold/90"
            >
              {isLocking ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Locking...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Lock All Assets & Begin Production
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
