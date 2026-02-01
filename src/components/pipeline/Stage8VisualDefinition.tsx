/**
 * Stage 8: Visual & Character Definition (Asset Assembly)
 * PRD: Section 4.3, 5.3. Layout: Continuity Header (top), Scene Visual Elements (left),
 * Visual State Editor (center), Asset Drawer (right). Real API via sceneAssetService.
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Users,
  MapPin,
  Package,
  Check,
  ArrowLeft,
  Sparkles,
  Plus,
  RefreshCw,
  Loader2,
  Brain,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { SceneAssetListPanel } from '@/components/pipeline/Stage8/SceneAssetListPanel';
import { VisualStateEditorPanel } from '@/components/pipeline/Stage8/VisualStateEditorPanel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { RearviewMirror } from '@/components/pipeline/RearviewMirror';
import { sceneAssetService } from '@/lib/services/sceneAssetService';
import { sceneService } from '@/lib/services/sceneService';
import { projectAssetService } from '@/lib/services/projectAssetService';
import { cn } from '@/lib/utils';
import type { SceneAssetInstance, SceneAssetRelevanceResult } from '@/types/scene';
import type { ProjectAsset } from '@/types/asset';

const typeIcons = {
  character: Users,
  location: MapPin,
  prop: Package,
};

type AssetTypeKey = 'character' | 'location' | 'prop';

function sourceBadge(instance: SceneAssetInstance): 'Master' | 'Prior Scene' | 'New' {
  if (instance.inherited_from_instance_id) return 'Prior Scene';
  return 'Master';
}

function reviewStatus(instance: SceneAssetInstance): 'unreviewed' | 'edited' | 'locked' {
  const tags = instance.status_tags ?? [];
  if (tags.includes('locked')) return 'locked';
  if (instance.image_key_url || (instance.modification_count ?? 0) > 0) return 'edited';
  return 'unreviewed';
}

const statusColors: Record<string, string> = {
  unreviewed: 'bg-muted text-muted-foreground',
  edited: 'bg-amber-500/20 text-amber-400',
  locked: 'bg-emerald-500/20 text-emerald-400',
};

// ---------------------------------------------------------------------------
// Continuity Header (wraps RearviewMirror for Stage 8)
// ---------------------------------------------------------------------------
interface ContinuityHeaderProps {
  priorSceneEndState?: string;
  priorEndFrame?: string;
  priorSceneName?: string;
}

function ContinuityHeader({ priorSceneEndState, priorEndFrame, priorSceneName }: ContinuityHeaderProps) {
  const mode = priorEndFrame ? 'visual' : 'text';
  return (
    <RearviewMirror
      mode={mode}
      priorSceneEndState={priorSceneEndState}
      priorEndFrame={priorEndFrame}
      priorSceneName={priorSceneName}
    />
  );
}

// ---------------------------------------------------------------------------
// Empty State: no assets – user chooses Detect or Add Manually (Task 8)
// ---------------------------------------------------------------------------
interface EmptyStatePanelProps {
  onDetectAssets: () => void;
  onAddManually: () => void;
  isDetecting: boolean;
}

function EmptyStatePanel({ onDetectAssets, onAddManually, isDetecting }: EmptyStatePanelProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <Card className="max-w-md text-center p-8">
        <Sparkles className="w-16 h-16 mx-auto mb-4 text-primary" />
        <h2 className="text-2xl font-bold mb-2">No Assets Defined Yet</h2>
        <p className="text-muted-foreground mb-6">
          Define which characters, props, and locations appear at the start of this scene.
        </p>
        <div className="space-y-3">
          <Button
            variant="gold"
            className="w-full"
            onClick={onDetectAssets}
            disabled={isDetecting}
          >
            {isDetecting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Detecting…
              </>
            ) : (
              <>
                <Brain className="w-4 h-4 mr-2" />
                Detect Required Assets (AI)
              </>
            )}
          </Button>
          <Button variant="outline" className="w-full" onClick={onAddManually}>
            <Plus className="w-4 h-4 mr-2" />
            Add Assets Manually
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Asset Drawer Trigger Panel (right): Add from library, Create new, Back, Proceed
// ---------------------------------------------------------------------------
interface AssetDrawerTriggerPanelProps {
  onOpenAssetDrawer: () => void;
  onCreateNewAsset: () => void;
  onBack: () => void;
  onComplete: () => void;
}

function AssetDrawerTriggerPanel({
  onOpenAssetDrawer,
  onCreateNewAsset,
  onBack,
  onComplete,
}: AssetDrawerTriggerPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="w-64 border-l border-border/50 bg-card/30 backdrop-blur-sm flex flex-col shrink-0"
    >
      <div className="p-4 border-b border-border/50">
        <h3 className="font-display text-sm font-semibold text-foreground">Asset library</h3>
        <p className="text-xs text-muted-foreground mt-1">Add from project or create scene-only</p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          <Button variant="outline" size="sm" className="w-full" onClick={onOpenAssetDrawer}>
            <Plus className="w-4 h-4 mr-2" />
            Add from project assets
          </Button>
          <div
            className="bg-card/50 rounded-lg p-3 border border-dashed border-border/50 text-center cursor-pointer hover:border-primary/30 transition-colors"
            onClick={onCreateNewAsset}
          >
            <Plus className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
            <span className="text-xs text-muted-foreground">Create scene asset</span>
          </div>
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-border/50 space-y-2">
        <Button variant="ghost" size="sm" className="w-full" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button variant="gold" size="sm" className="w-full" onClick={onComplete}>
          <Check className="w-4 h-4 mr-2" />
          Proceed
        </Button>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Asset Drawer (Sheet): list project assets, on select create scene instance
// ---------------------------------------------------------------------------
interface AssetDrawerProps {
  projectId: string;
  sceneId: string;
  isOpen: boolean;
  onClose: () => void;
  onSceneInstanceCreated: () => void;
}

function AssetDrawer({ projectId, sceneId, isOpen, onClose, onSceneInstanceCreated }: AssetDrawerProps) {
  const [projectAssets, setProjectAssets] = useState<ProjectAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [creatingId, setCreatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !projectId) return;
    setLoading(true);
    projectAssetService
      .listAssets(projectId)
      .then(setProjectAssets)
      .catch(() => toast.error('Failed to load project assets'))
      .finally(() => setLoading(false));
  }, [isOpen, projectId]);

  const handleAdd = async (asset: ProjectAsset) => {
    setCreatingId(asset.id);
    try {
      await sceneAssetService.createSceneAsset(projectId, {
        sceneId,
        projectAssetId: asset.id,
      });
      toast.success(`Added ${asset.name} to scene`);
      onSceneInstanceCreated();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to add asset');
    } finally {
      setCreatingId(null);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={open => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Add from project assets</SheetTitle>
          <DialogDescription>Select an asset to add to this scene. Inheritance source: Master.</DialogDescription>
        </SheetHeader>
        <div className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2">
              {projectAssets.map(asset => {
                const Icon = typeIcons[(asset.asset_type ?? 'prop') as AssetTypeKey];
                return (
                  <div
                    key={asset.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border/30 hover:bg-card/50"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">{asset.name}</span>
                      <Badge variant="secondary" className="text-[10px] capitalize">
                        {asset.asset_type}
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleAdd(asset)}
                      disabled={creatingId !== null}
                    >
                      {creatingId === asset.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    </Button>
                  </div>
                );
              })}
              {projectAssets.length === 0 && !loading && (
                <p className="text-sm text-muted-foreground py-4">No project assets. Add assets in Stage 5.</p>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Cost confirmation modal (stub for Task 7.0)
// ---------------------------------------------------------------------------
interface CostConfirmModalProps {
  open: boolean;
  onClose: () => void;
  selectedCount: number;
  estimatedCredits: number;
  onConfirm: () => void;
  isGenerating?: boolean;
}

function CostConfirmModal({
  open,
  onClose,
  selectedCount,
  estimatedCredits,
  onConfirm,
  isGenerating,
}: CostConfirmModalProps) {
  return (
    <Dialog open={open} onOpenChange={open => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate scene starting visuals</DialogTitle>
          <DialogDescription>
            Generate image keys for {selectedCount} asset{selectedCount !== 1 ? 's' : ''}. Estimated credits: {estimatedCredits}.
            (Cost preview – Task 7.0)
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="gold" onClick={onConfirm} disabled={isGenerating}>
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Stage 8 main component
// ---------------------------------------------------------------------------
const COST_PER_IMAGE = 1;

interface Stage8VisualDefinitionProps {
  projectId: string;
  sceneId: string;
  onComplete: () => void;
  onBack: () => void;
}

export function Stage8VisualDefinition({ projectId, sceneId, onComplete, onBack }: Stage8VisualDefinitionProps) {
  const queryClient = useQueryClient();
  const [selectedAsset, setSelectedAsset] = useState<SceneAssetInstance | null>(null);
  const [selectedForGeneration, setSelectedForGeneration] = useState<string[]>([]);
  const [assetDrawerOpen, setAssetDrawerOpen] = useState(false);
  const [costConfirmOpen, setCostConfirmOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [newAssetsRequired, setNewAssetsRequired] = useState<SceneAssetRelevanceResult['new_assets_required']>([]);

  // Prior scene data for Continuity Header
  const [priorSceneData, setPriorSceneData] = useState<{
    endState?: string;
    endFrame?: string;
    sceneNumber?: number;
  } | null>(null);

  useEffect(() => {
    if (!projectId || !sceneId) return;
    sceneService.fetchScenes(projectId).then(scenes => {
      const idx = scenes.findIndex(s => s.id === sceneId);
      if (idx <= 0) return;
      const prior = scenes[idx - 1];
      setPriorSceneData({
        endState: prior.priorSceneEndState,
        endFrame: prior.endFrameThumbnail,
        sceneNumber: prior.sceneNumber,
      });
    }).catch(() => {});
  }, [projectId, sceneId]);

  const { data: sceneAssets = [], isLoading, refetch } = useQuery({
    queryKey: ['scene-assets', projectId, sceneId],
    queryFn: () => sceneAssetService.listSceneAssets(projectId, sceneId),
    enabled: Boolean(projectId && sceneId),
  });

  const createMutation = useMutation({
    mutationFn: (req: { sceneId: string; projectAssetId: string; descriptionOverride?: string }) =>
      sceneAssetService.createSceneAsset(projectId, { ...req, sceneId: req.sceneId, projectAssetId: req.projectAssetId, descriptionOverride: req.descriptionOverride }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scene-assets', projectId, sceneId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ instanceId, updates }: { instanceId: string; updates: { descriptionOverride?: string; modificationReason?: string | null; statusTags?: string[]; carryForward?: boolean } }) =>
      sceneAssetService.updateSceneAsset(projectId, sceneId, instanceId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scene-assets', projectId, sceneId] });
    },
  });

  const inheritMutation = useMutation({
    mutationFn: () => sceneAssetService.inheritAssets(projectId, sceneId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scene-assets', projectId, sceneId] });
      toast.success('Assets inherited from prior scene');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const generateImageMutation = useMutation({
    mutationFn: (instanceId: string) => sceneAssetService.generateSceneAssetImage(projectId, sceneId, instanceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scene-assets', projectId, sceneId] });
      toast.success('Image generation started');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleDetectAndPopulateAssets = useCallback(async () => {
    setIsDetecting(true);
    try {
      const relevance = await sceneAssetService.detectRelevantAssets(projectId, sceneId);
      const createPromises = relevance.relevant_assets.map(ra =>
        sceneAssetService.createSceneAsset(projectId, {
          sceneId,
          projectAssetId: ra.project_asset_id,
          descriptionOverride: ra.starting_description ? ra.starting_description : undefined,
          statusTags: ra.status_tags_inherited ?? [],
          carryForward: true,
        })
      );
      await Promise.all(createPromises);
      queryClient.invalidateQueries({ queryKey: ['scene-assets', projectId, sceneId] });
      toast.success(`Detected ${relevance.relevant_assets.length} relevant assets`);
      if (relevance.new_assets_required?.length > 0) {
        setNewAssetsRequired(relevance.new_assets_required);
      }
    } catch (error) {
      toast.error(`Asset detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDetecting(false);
    }
  }, [projectId, sceneId, queryClient]);

  const handleToggleSelection = useCallback((instanceId: string) => {
    setSelectedForGeneration(prev =>
      prev.includes(instanceId) ? prev.filter(id => id !== instanceId) : [...prev, instanceId]
    );
  }, []);

  const handleBulkGenerateClick = useCallback(() => {
    if (selectedForGeneration.length === 0) return;
    setCostConfirmOpen(true);
  }, [selectedForGeneration.length]);

  const handleBulkGenerateConfirmed = useCallback(async () => {
    setCostConfirmOpen(false);
    setIsGenerating(true);
    try {
      const result = await sceneAssetService.bulkGenerateImages(projectId, sceneId, selectedForGeneration);
      // Stub: no job polling yet; just refetch after a short delay
      await new Promise(r => setTimeout(r, 1500));
      queryClient.invalidateQueries({ queryKey: ['scene-assets', projectId, sceneId] });
      toast.success(`Bulk generation started for ${result.totalJobs} asset(s)`);
      setSelectedForGeneration([]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Bulk generation failed');
    } finally {
      setIsGenerating(false);
    }
  }, [projectId, sceneId, selectedForGeneration, queryClient]);

  const handleUpdateAsset = useCallback(
    (instanceId: string, updates: { descriptionOverride?: string; modificationReason?: string | null; statusTags?: string[]; carryForward?: boolean }) => {
      updateMutation.mutate({ instanceId, updates });
    },
    [updateMutation]
  );

  const handleGenerateImage = useCallback(
    (instanceId: string) => {
      generateImageMutation.mutate(instanceId);
    },
    [generateImageMutation]
  );

  const handleCreateNewAsset = useCallback(() => {
    setAssetDrawerOpen(true);
  }, []);

  const handleSceneInstanceCreated = useCallback(() => {
    refetch();
  }, [refetch]);

  if (!projectId || !sceneId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Missing project or scene context.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (sceneAssets.length === 0) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <ContinuityHeader
          priorSceneEndState={priorSceneData?.endState}
          priorEndFrame={priorSceneData?.endFrame}
          priorSceneName={priorSceneData?.sceneNumber != null ? `Scene ${priorSceneData.sceneNumber}` : undefined}
        />
        <EmptyStatePanel
          onDetectAssets={handleDetectAndPopulateAssets}
          onAddManually={() => setAssetDrawerOpen(true)}
          isDetecting={isDetecting}
        />
        <AssetDrawer
          projectId={projectId}
          sceneId={sceneId}
          isOpen={assetDrawerOpen}
          onClose={() => setAssetDrawerOpen(false)}
          onSceneInstanceCreated={handleSceneInstanceCreated}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <ContinuityHeader
        priorSceneEndState={priorSceneData?.endState}
        priorEndFrame={priorSceneData?.endFrame}
        priorSceneName={priorSceneData?.sceneNumber != null ? `Scene ${priorSceneData.sceneNumber}` : undefined}
      />

      <div className="flex-1 flex overflow-hidden">
        <SceneAssetListPanel
          assets={sceneAssets}
          selectedAsset={selectedAsset}
          selectedForGeneration={selectedForGeneration}
          onSelectAsset={setSelectedAsset}
          onToggleSelection={handleToggleSelection}
          onBulkGenerate={handleBulkGenerateClick}
          isGenerating={isGenerating}
          newAssetsRequired={newAssetsRequired}
          onOpenAssetDrawer={() => setAssetDrawerOpen(true)}
          onIgnoreSuggested={index => setNewAssetsRequired(prev => prev.filter((_, i) => i !== index))}
          onInherit={() => inheritMutation.mutate()}
          isInheriting={inheritMutation.isPending}
        />

        <VisualStateEditorPanel
          selectedAsset={selectedAsset}
          onUpdateAsset={handleUpdateAsset}
          onGenerateImage={handleGenerateImage}
          projectId={projectId}
          sceneId={sceneId}
          isUpdating={updateMutation.isPending}
          isGeneratingImage={generateImageMutation.isPending}
          inheritedFromSceneNumber={priorSceneData?.sceneNumber ?? null}
        />

        <AssetDrawerTriggerPanel
          onOpenAssetDrawer={() => setAssetDrawerOpen(true)}
          onCreateNewAsset={handleCreateNewAsset}
          onBack={onBack}
          onComplete={onComplete}
        />
      </div>

      <AssetDrawer
        projectId={projectId}
        sceneId={sceneId}
        isOpen={assetDrawerOpen}
        onClose={() => setAssetDrawerOpen(false)}
        onSceneInstanceCreated={handleSceneInstanceCreated}
      />

      <CostConfirmModal
        open={costConfirmOpen}
        onClose={() => setCostConfirmOpen(false)}
        selectedCount={selectedForGeneration.length}
        estimatedCredits={selectedForGeneration.length * COST_PER_IMAGE}
        onConfirm={handleBulkGenerateConfirmed}
        isGenerating={isGenerating}
      />
    </div>
  );
}
