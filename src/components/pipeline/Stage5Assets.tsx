import { useState, useEffect, useCallback, useRef } from 'react';
import {
  User, MapPin, Package, Sparkles, Check, Lock, Loader2,
  AlertTriangle, Info, MoreVertical, Trash2, Edit, Upload,
  RefreshCw, PauseCircle, Play, ChevronDown, Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useStageState } from '@/lib/hooks/useStageState';
import { stageStateService } from '@/lib/services/stageStateService';
import { projectAssetService } from '@/lib/services/projectAssetService';
import { StyleCapsuleSelector } from '@/components/styleCapsules/StyleCapsuleSelector';
import { AssetDrawer } from './AssetDrawer';
import { AssetFilterModal } from './AssetFilterModal';
import { AssetVersionSync } from './AssetVersionSync';
import { AddAssetModal } from './AddAssetModal';
import { ProjectAssetCarousel } from './ProjectAssetCarousel';
import type { ProjectAsset, AssetPreviewEntity, AssetType, AssetDecision } from '@/types/asset';
import type { StageStatus } from '@/types/project';
import { LockedStageHeader } from './LockedStageHeader';

interface Stage5AssetsProps {
  projectId: string;
  onComplete: () => void;
  onBack: () => void;
  stageStatus?: StageStatus;
  onNext?: () => void;
  onUnlock?: () => void;
}

const ASPECT_RATIOS = {
  character: { width: 512, height: 768, label: '2:3 portrait' },
  location: { width: 1024, height: 576, label: '16:9 cinematic' },
  prop: { width: 512, height: 512, label: '1:1 square' }
};

export function Stage5Assets({ projectId, onComplete, onBack, stageStatus, onNext, onUnlock }: Stage5AssetsProps) {
  const isStageLockedOrOutdated = stageStatus === 'locked' || stageStatus === 'outdated';
  const queryClient = useQueryClient();
  const { content, setContent } = useStageState({
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
  const [expandedAssetId, setExpandedAssetId] = useState<string | null>(null);
  const [editingDescriptions, setEditingDescriptions] = useState<Record<string, string>>({});
  const [savingAssets, setSavingAssets] = useState<Set<string>>(new Set());
  const [saveTimeouts, setSaveTimeouts] = useState<Record<string, NodeJS.Timeout>>({});
  const [promotingAssetId, setPromotingAssetId] = useState<string | null>(null);
  const [promotionConfirmOpen, setPromotionConfirmOpen] = useState(false);
  const [assetDrawerOpen, setAssetDrawerOpen] = useState(false);
  const [uploadingAssetId, setUploadingAssetId] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Two-pass extraction state
  const [previewEntities, setPreviewEntities] = useState<AssetPreviewEntity[]>([]);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  // Add Asset modal state
  const [showAddAssetModal, setShowAddAssetModal] = useState(false);

  // Deferred section state
  const [deferredOpen, setDeferredOpen] = useState(false);

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
      setAssets(existingAssets);
      if (existingAssets.length > 0) {
        setHasExtracted(true);
      }
    } catch (error) {
      console.error('Failed to load assets:', error);
    }
  };

  // Split assets into active and deferred
  const activeAssets = assets.filter(a => !a.deferred);
  const deferredAssets = assets.filter(a => a.deferred);

  const groupedAssets = {
    characters: activeAssets.filter(a => a.asset_type === 'character'),
    locations: activeAssets.filter(a => a.asset_type === 'location'),
    props: activeAssets.filter(a => a.asset_type === 'prop')
  };

  const allActiveHaveImages = activeAssets.every(a => a.image_key_url);
  const canProceed = isStyleLocked && allActiveHaveImages && activeAssets.length > 0;

  const handleStyleLock = async (styleId: string) => {
    setLockedStyleId(styleId);
    setIsStyleLocked(true);

    setContent({
      locked_visual_style_capsule_id: styleId,
      style_locked_at: new Date().toISOString()
    });

    toast.success('Visual style locked! You can now extract assets.');
  };

  // Step 1: Instant preview scan — no LLM, opens filter modal
  const handleExtractAssets = async () => {
    if (!lockedStyleId) {
      toast.error('Please select a visual style first');
      return;
    }

    try {
      setIsExtracting(true);

      const preview = await projectAssetService.extractPreview(projectId);

      if (!preview.entities || preview.entities.length === 0) {
        toast.warning('No assets found in script. You can manually add assets below.');
        setHasExtracted(true);
        return;
      }

      setPreviewEntities(preview.entities);
      setShowFilterModal(true);
    } catch (error) {
      console.error('Failed to preview assets:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to scan assets';

      if (errorMessage.includes('Stage 4 must be completed')) {
        toast.error('Please complete Stage 4 (Script) before extracting assets.');
      } else {
        toast.error(`Scan failed: ${errorMessage}. You can manually add assets.`);
      }
      setHasExtracted(true);
    } finally {
      setIsExtracting(false);
    }
  };

  // Step 2: Confirm selection — LLM Pass 2 only for selected entities (with decisions)
  const handleConfirmSelection = async (selected: Array<{ name: string; type: AssetType; decision: AssetDecision; sceneNumbers: number[] }>) => {
    try {
      setIsConfirming(true);
      toast.info(`Generating visual descriptions for ${selected.length} assets...`);

      const confirmedAssets = await projectAssetService.extractConfirm(projectId, selected);

      if (!confirmedAssets || confirmedAssets.length === 0) {
        toast.warning('No assets were created. You can manually add assets below.');
      } else {
        setAssets(confirmedAssets);
        toast.success(`Created ${confirmedAssets.length} assets with visual descriptions!`);
      }

      setHasExtracted(true);
      setShowFilterModal(false);
    } catch (error) {
      console.error('Failed to confirm extraction:', error);
      const errorMessage = error instanceof Error ? error.message : 'Extraction failed';
      toast.error(`Extraction failed: ${errorMessage}`);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleGenerateImage = async (assetId: string) => {
    const asset = assets.find(a => a.id === assetId);
    if (!asset) return;

    try {
      toast.info(`Generating ${asset.asset_type} image...`);

      await projectAssetService.generateImage(projectId, assetId);

      // Refresh asset from database to ensure image_key_url is saved
      const refreshedAsset = await projectAssetService.getAsset(projectId, assetId);

      // Update asset with refreshed data
      setAssets(prev => prev.map(a =>
        a.id === assetId ? refreshedAsset : a
      ));

      // Invalidate carousel query
      queryClient.invalidateQueries({ queryKey: ['project-asset-attempts', projectId, assetId] });

      toast.success(`Image generated for ${asset.name}!`);
    } catch (error) {
      console.error('Failed to generate image:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate image';

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

  const handleUploadImage = async (assetId: string, file: File) => {
    const asset = assets.find(a => a.id === assetId);
    if (!asset) return;

    try {
      setUploadingAssetId(assetId);
      toast.info(`Uploading image for ${asset.name}...`);

      const updatedAsset = await projectAssetService.uploadImage(projectId, assetId, file);

      setAssets(prev => prev.map(a =>
        a.id === assetId ? updatedAsset : a
      ));

      // Invalidate carousel query
      queryClient.invalidateQueries({ queryKey: ['project-asset-attempts', projectId, assetId] });

      toast.success(`Image uploaded for ${asset.name}!`);
    } catch (error) {
      console.error('Failed to upload image:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload image';

      if (errorMessage.includes('Invalid file type')) {
        toast.error('Invalid file type. Only PNG, JPEG, and WebP are allowed.');
      } else if (errorMessage.includes('file size')) {
        toast.error('File size exceeds 10MB limit.');
      } else {
        toast.error(`Failed to upload image for ${asset.name}: ${errorMessage}`);
      }
    } finally {
      setUploadingAssetId(null);
    }
  };

  const handleFileInputChange = (assetId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUploadImage(assetId, file);
    }
    if (fileInputRefs.current[assetId]) {
      fileInputRefs.current[assetId]!.value = '';
    }
  };

  const triggerFileInput = (assetId: string) => {
    fileInputRefs.current[assetId]?.click();
  };

  const handleUpdateDescription = useCallback(async (assetId: string, description: string) => {
    try {
      setSavingAssets(prev => new Set(prev).add(assetId));
      await projectAssetService.updateAsset(projectId, assetId, { description });
      setAssets(prev => prev.map(a =>
        a.id === assetId ? { ...a, description } : a
      ));
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
    setEditingDescriptions(prev => ({
      ...prev,
      [assetId]: newDescription
    }));

    if (saveTimeouts[assetId]) {
      clearTimeout(saveTimeouts[assetId]);
    }

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

  const handleDeferAsset = async (assetId: string) => {
    try {
      await projectAssetService.deferAsset(projectId, assetId);
      setAssets(prev => prev.map(a =>
        a.id === assetId ? { ...a, deferred: true } : a
      ));
      toast.success('Asset deferred');
    } catch (error) {
      console.error('Failed to defer asset:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to defer asset');
    }
  };

  const handleRestoreAsset = async (assetId: string) => {
    try {
      await projectAssetService.restoreAsset(projectId, assetId);
      setAssets(prev => prev.map(a =>
        a.id === assetId ? { ...a, deferred: false } : a
      ));
      toast.success('Asset restored to active');
    } catch (error) {
      console.error('Failed to restore asset:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to restore asset');
    }
  };

  const handlePromoteToGlobal = async (assetId: string) => {
    setPromotingAssetId(assetId);
    setPromotionConfirmOpen(true);
  };

  const confirmPromotion = async () => {
    if (!promotingAssetId) return;

    try {
      await projectAssetService.promoteToGlobal(projectId, promotingAssetId);
      toast.success(`"${assets.find(a => a.id === promotingAssetId)?.name}" promoted to Global Library!`, {
        description: 'You can now use this asset in other projects.',
      });

      await loadAssets();
    } catch (error) {
      console.error('Failed to promote asset:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to promote asset';

      if (errorMessage.includes('must have a generated image')) {
        toast.error('Asset must have a generated image before promotion');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setPromotingAssetId(null);
      setPromotionConfirmOpen(false);
    }
  };

  const handleAssetCloned = async (clonedAsset: ProjectAsset) => {
    await loadAssets();
    toast.success(`"${clonedAsset.name}" cloned to project`);
  };

  const handleLockAllAssets = async () => {
    if (!isStyleLocked) {
      toast.error('Visual style must be selected');
      return;
    }

    if (activeAssets.length === 0) {
      toast.error('At least one active asset is required');
      return;
    }

    const activeWithoutImages = activeAssets.filter(a => !a.image_key_url);
    if (activeWithoutImages.length > 0) {
      toast.error(`${activeWithoutImages.length} active assets need image keys`);
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

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      {isStageLockedOrOutdated ? (
        <LockedStageHeader
          stageNumber={5}
          title="Assets"
          subtitle="Global Assets & Style Lock"
          isLocked={stageStatus === 'locked'}
          isOutdated={stageStatus === 'outdated'}
          onBack={onBack}
          onNext={onNext}
          onUnlockAndEdit={onUnlock}
          lockAndProceedLabel="Lock All Assets"
        />
      ) : (
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onBack}>← Back</Button>
            <div>
              <h2 className="font-display text-xl font-semibold text-foreground">Stage 5: Global Assets & Style Lock</h2>
              <p className="text-sm text-muted-foreground">Define visual keys for all characters, locations, and props</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto p-6 pb-24">
        <div className="max-w-6xl mx-auto space-y-8">

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
                  : "You must select a visual style before extracting assets. This ensures all generated images are consistent."}
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
                    Scanning Script...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Scan Script for Assets
                  </>
                )}
              </Button>
            )}

            {hasExtracted && (
              <Alert variant="default" className="border-success">
                <Check className="w-4 h-4" />
                <AlertDescription>
                  {activeAssets.length} active assets{deferredAssets.length > 0 ? `, ${deferredAssets.length} deferred` : ''}
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
                  {activeAssets.filter(a => a.image_key_url).length}/{activeAssets.length} active assets have images
                  {deferredAssets.length > 0 && ` | ${deferredAssets.length} deferred`}
                </div>
              </div>

              {/* Batch Actions */}
              <div className="flex gap-2 justify-end items-center flex-wrap">
                <AssetVersionSync
                  projectId={projectId}
                  onSyncComplete={loadAssets}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAssetDrawerOpen(true)}
                >
                  <Package className="w-4 h-4 mr-2" />
                  Browse Global Library
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddAssetModal(true)}
                  disabled={isStageLockedOrOutdated}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Asset
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const assetsWithoutImages = activeAssets.filter(a => !a.image_key_url);
                    if (assetsWithoutImages.length === 0) {
                      toast.info('All active assets already have images');
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
                  disabled={activeAssets.filter(a => !a.image_key_url).length === 0}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate All Images ({activeAssets.filter(a => !a.image_key_url).length})
                </Button>
              </div>

              {/* Asset Type Groups — Grid Layout */}
              {Object.entries(groupedAssets).map(([type, typeAssets]) => {
                if (typeAssets.length === 0) return null;

                const Icon = getAssetIcon(typeAssets[0].asset_type);

                return (
                  <div key={type} className="space-y-3">
                    <h4 className="font-semibold capitalize flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      {type} ({typeAssets.length})
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {typeAssets.map(asset => {
                        const AspectIcon = getAssetIcon(asset.asset_type);
                        const aspectInfo = ASPECT_RATIOS[asset.asset_type];
                        const isExpanded = expandedAssetId === asset.id;
                        const editingDescription = editingDescriptions[asset.id] ?? asset.description;
                        const isSaving = savingAssets.has(asset.id);

                        return (
                          <Card key={asset.id} className="transition-all">
                            <CardHeader className="p-4 pb-2">
                              <div className="flex items-start justify-between">
                                <div className="flex items-start gap-2 flex-1 min-w-0">
                                  <div className={cn(
                                    'flex items-center justify-center w-8 h-8 rounded-lg shrink-0',
                                    asset.image_key_url ? 'bg-success/20 text-success' : 'bg-secondary text-muted-foreground'
                                  )}>
                                    <AspectIcon className="w-4 h-4" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <CardTitle className="text-base truncate">{asset.name}</CardTitle>
                                      <Badge variant="outline" className="text-[10px] px-1">{asset.asset_type}</Badge>
                                      {asset.source === 'manual' && (
                                        <Badge variant="secondary" className="text-[10px] px-1">Manual</Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7">
                                      <MoreVertical className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => setExpandedAssetId(isExpanded ? null : asset.id)}>
                                      <Edit className="w-4 h-4 mr-2" />
                                      {isExpanded ? 'Collapse' : 'Edit Details'}
                                    </DropdownMenuItem>
                                    {!isStageLockedOrOutdated && (
                                      <DropdownMenuItem onClick={() => handleDeferAsset(asset.id)}>
                                        <PauseCircle className="w-4 h-4 mr-2" />
                                        Defer Asset
                                      </DropdownMenuItem>
                                    )}
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
                                      disabled={isStageLockedOrOutdated}
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Remove Asset
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </CardHeader>

                            <CardContent className="p-4 pt-2 space-y-3">
                              {/* Conflict Warning */}
                              {asset.metadata?.has_conflicts && asset.metadata?.conflict_details && (
                                <Alert variant="destructive" className="py-2">
                                  <AlertTriangle className="w-3 h-3" />
                                  <AlertDescription className="text-xs">
                                    <strong>Visual Conflict:</strong> {asset.metadata.conflict_details}
                                  </AlertDescription>
                                </Alert>
                              )}

                              {/* Image Carousel */}
                              <ProjectAssetCarousel
                                projectId={projectId}
                                assetId={asset.id}
                                disabled={isStageLockedOrOutdated}
                              />

                              {/* Description */}
                              {isExpanded ? (
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs">Visual Description</Label>
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
                                    rows={3}
                                    className="resize-none text-xs"
                                    disabled={isStageLockedOrOutdated}
                                    placeholder="Describe the visual appearance..."
                                  />
                                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                    <Info className="w-3 h-3" />
                                    {aspectInfo.width}x{aspectInfo.height} ({aspectInfo.label})
                                  </div>
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground line-clamp-3">
                                  {asset.description}
                                </p>
                              )}

                              {/* Actions */}
                              {!isStageLockedOrOutdated && (
                                <div className="flex gap-2">
                                  <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    className="hidden"
                                    ref={(el) => {
                                      if (el) fileInputRefs.current[asset.id] = el;
                                    }}
                                    onChange={(e) => handleFileInputChange(asset.id, e)}
                                  />
                                  <Button
                                    onClick={() => triggerFileInput(asset.id)}
                                    disabled={uploadingAssetId === asset.id}
                                    variant="outline"
                                    size="sm"
                                    className="flex-1"
                                  >
                                    {uploadingAssetId === asset.id ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <>
                                        <Upload className="w-3 h-3 mr-1" />
                                        Upload
                                      </>
                                    )}
                                  </Button>
                                  <Button
                                    onClick={() => handleGenerateImage(asset.id)}
                                    size="sm"
                                    className="flex-1"
                                  >
                                    {asset.image_key_url ? (
                                      <>
                                        <RefreshCw className="w-3 h-3 mr-1" />
                                        Regenerate
                                      </>
                                    ) : (
                                      <>
                                        <Sparkles className="w-3 h-3 mr-1" />
                                        Generate
                                      </>
                                    )}
                                  </Button>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Deferred Assets Section */}
              {deferredAssets.length > 0 && (
                <Collapsible open={deferredOpen} onOpenChange={setDeferredOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between px-3 py-2 h-auto">
                      <span className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                        <PauseCircle className="w-4 h-4" />
                        Deferred Assets ({deferredAssets.length})
                      </span>
                      <ChevronDown className={cn(
                        "w-4 h-4 transition-transform text-muted-foreground",
                        deferredOpen && "rotate-180"
                      )} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mt-3">
                      {deferredAssets.map(asset => {
                        const Icon = getAssetIcon(asset.asset_type);
                        return (
                          <Card key={asset.id} className="border-dashed border-amber-500/30 bg-amber-500/5">
                            <CardContent className="p-3 flex items-center gap-3">
                              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 shrink-0">
                                <Icon className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{asset.name}</p>
                                <div className="flex gap-1 mt-0.5 flex-wrap">
                                  <Badge variant="outline" className="text-[10px] px-1">{asset.asset_type}</Badge>
                                  {asset.scene_numbers && asset.scene_numbers.length > 0 && (
                                    asset.scene_numbers.map(n => (
                                      <Badge key={n} variant="secondary" className="text-[10px] px-1">Sc.{n}</Badge>
                                    ))
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-1 shrink-0">
                                {!isStageLockedOrOutdated && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 text-xs"
                                      onClick={() => handleRestoreAsset(asset.id)}
                                    >
                                      <Play className="w-3 h-3 mr-1" />
                                      Restore
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 text-xs text-destructive"
                                      onClick={() => handleDeleteAsset(asset.id)}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </section>
          )}

        </div>
      </div>

      {/* Asset Filter Modal (two-pass extraction) */}
      <AssetFilterModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        entities={previewEntities}
        onConfirm={handleConfirmSelection}
        isConfirming={isConfirming}
      />

      {/* Add Asset Modal */}
      <AddAssetModal
        isOpen={showAddAssetModal}
        onClose={() => setShowAddAssetModal(false)}
        projectId={projectId}
        onAssetCreated={loadAssets}
      />

      {/* Asset Drawer */}
      <AssetDrawer
        projectId={projectId}
        isOpen={assetDrawerOpen}
        onClose={() => setAssetDrawerOpen(false)}
        onAssetCloned={handleAssetCloned}
      />

      {/* Promotion Confirmation Dialog */}
      <AlertDialog open={promotionConfirmOpen} onOpenChange={setPromotionConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Promote Asset to Global Library?</AlertDialogTitle>
            <AlertDialogDescription>
              {promotingAssetId && (
                <>
                  This will add <strong>{assets.find(a => a.id === promotingAssetId)?.name}</strong> to your Global Library,
                  making it available for use in all your projects. The asset will be copied to the library
                  and can be cloned into other projects.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPromotingAssetId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPromotion}>Promote</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Floating Gatekeeper Bar - Fixed to bottom, respecting sidebar */}
      {hasExtracted && !isStageLockedOrOutdated && (
        <div className="fixed bottom-0 left-[280px] right-0 bg-card border-t border-border p-4 shadow-lg z-50">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
            <div className="text-sm">
              <div className="font-medium text-foreground flex items-center gap-2">
                Stage 5 Progress
                {canProceed && (
                  <Badge variant="default" className="bg-success">
                    <Check className="w-3 h-3 mr-1" />
                    Ready
                  </Badge>
                )}
              </div>
              <div className="text-muted-foreground">
                {activeAssets.filter(a => a.image_key_url).length}/{activeAssets.length} active assets have images
                {deferredAssets.length > 0 && ` | ${deferredAssets.length} deferred`}
                {!isStyleLocked && ' | Style not locked'}
              </div>
            </div>

            <Button
              onClick={handleLockAllAssets}
              disabled={!canProceed || isLocking}
              size="lg"
              variant="default"
              className={cn(
                "font-semibold shadow-md transition-all",
                canProceed
                  ? "bg-amber-500 hover:bg-amber-600 text-white"
                  : "bg-muted text-muted-foreground cursor-not-allowed",
                "disabled:opacity-50"
              )}
            >
              {isLocking ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Locking Assets...
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
