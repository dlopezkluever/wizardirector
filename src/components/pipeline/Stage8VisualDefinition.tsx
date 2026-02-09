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
import { SceneAssetListPanel, type AssetFilters } from '@/components/pipeline/Stage8/SceneAssetListPanel';
import { VisualStateEditorPanel } from '@/components/pipeline/Stage8/VisualStateEditorPanel';
import { TagCarryForwardPrompt, type TagCarryForwardDecision } from '@/components/pipeline/Stage8/TagCarryForwardPrompt';
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
import { RearviewMirror } from '@/components/pipeline/RearviewMirror';
import { AssetDrawer } from '@/components/pipeline/AssetDrawer';
import { sceneAssetService } from '@/lib/services/sceneAssetService';
import { sceneService } from '@/lib/services/sceneService';
import { cn } from '@/lib/utils';
import type { SceneAssetInstance, SceneAssetRelevanceResult } from '@/types/scene';
import { LockedStageHeader } from './LockedStageHeader';
import { UnlockWarningDialog } from './UnlockWarningDialog';
import { useSceneStageLock } from '@/lib/hooks/useSceneStageLock';
import type { UnlockImpact } from '@/lib/services/sceneStageLockService';

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
            This action will use approximately {estimatedCredits} credit{estimatedCredits !== 1 ? 's' : ''} and generate {selectedCount} image{selectedCount !== 1 ? 's' : ''}. Continue?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isGenerating}>Cancel</Button>
          <Button variant="gold" onClick={onConfirm} disabled={isGenerating}>
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Confirm & Generate
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
  onNext?: () => void;
}

export function Stage8VisualDefinition({ projectId, sceneId, onComplete, onBack, onNext }: Stage8VisualDefinitionProps) {
  const {
    isLocked: isStageLocked,
    isOutdated: isStageOutdated,
    lockStage,
    unlockStage,
    confirmUnlock,
    relockStage,
  } = useSceneStageLock({ projectId, sceneId });

  const [showUnlockWarning, setShowUnlockWarning] = useState(false);
  const [unlockImpact, setUnlockImpact] = useState<UnlockImpact | null>(null);
  const [isConfirmingUnlock, setIsConfirmingUnlock] = useState(false);

  const stage8Locked = isStageLocked(8);
  const stage8Outdated = isStageOutdated(8);

  const handleUnlockAndEdit = async () => {
    try {
      const impact = await unlockStage(8);
      if (impact) { setUnlockImpact(impact); setShowUnlockWarning(true); }
    } catch { /* handled by dialog */ }
  };

  const handleConfirmUnlock = async () => {
    try {
      setIsConfirmingUnlock(true);
      await confirmUnlock(8);
      setShowUnlockWarning(false);
      setUnlockImpact(null);
    } catch { /* handled */ } finally { setIsConfirmingUnlock(false); }
  };

  const handleLockAndProceed = async () => {
    try {
      await lockStage(8);
      onComplete();
    } catch { /* handled */ }
  };
  const queryClient = useQueryClient();
  // Keep URL in sync so refresh stays on Stage 8 with this scene
  useEffect(() => {
    if (sceneId) {
      const url = new URL(window.location.href);
      url.searchParams.set('stage', '8');
      url.searchParams.set('sceneId', sceneId);
      window.history.replaceState({}, '', url.toString());
    }
  }, [sceneId]);
  const [selectedAsset, setSelectedAsset] = useState<SceneAssetInstance | null>(null);
  const [selectedForGeneration, setSelectedForGeneration] = useState<string[]>([]);
  const [assetDrawerOpen, setAssetDrawerOpen] = useState(false);
  const [costConfirmOpen, setCostConfirmOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingSingle, setIsGeneratingSingle] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ completed: number; total: number } | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [newAssetsRequired, setNewAssetsRequired] = useState<SceneAssetRelevanceResult['new_assets_required']>([]);
  const [assetFilters, setAssetFilters] = useState<AssetFilters | null>(null);

  // Prior scene data for Continuity Header
  const [priorSceneData, setPriorSceneData] = useState<{
    endState?: string;
    endFrame?: string;
    sceneNumber?: number;
  } | null>(null);
  const [currentSceneNumber, setCurrentSceneNumber] = useState<number>(0);

  // Tag carry-forward prompt (Task 5, Feature 5.3)
  const [showTagCarryForwardPrompt, setShowTagCarryForwardPrompt] = useState(false);
  const [priorInstancesWithTags, setPriorInstancesWithTags] = useState<Array<{
    instance: SceneAssetInstance;
    assetName: string;
  }>>([]);

  useEffect(() => {
    if (!projectId || !sceneId) return;
    sceneService.fetchScenes(projectId).then(scenes => {
      const idx = scenes.findIndex(s => s.id === sceneId);
      if (idx >= 0) {
        setCurrentSceneNumber(scenes[idx].sceneNumber);
      }
      if (idx <= 0) return;
      const prior = scenes[idx - 1];
      setPriorSceneData({
        endState: prior.priorSceneEndState,
        endFrame: prior.endFrameThumbnail,
        sceneNumber: prior.sceneNumber,
      });
    }).catch(() => {});
  }, [projectId, sceneId]);

  const { data: scenes } = useQuery({
    queryKey: ['scenes', projectId],
    queryFn: () => sceneService.fetchScenes(projectId),
    enabled: !!projectId,
  });
  const currentScene = scenes?.find(s => s.id === sceneId);

  const { data: sceneAssets = [], isLoading, refetch } = useQuery({
    queryKey: ['scene-assets', projectId, sceneId],
    queryFn: () => sceneAssetService.listSceneAssets(projectId, sceneId),
    enabled: Boolean(projectId && sceneId),
  });

  // Task 5: Show tag carry-forward prompt when entering Stage 8 with inherited instances that have tags
  useEffect(() => {
    if (!sceneAssets || sceneAssets.length === 0 || !priorSceneData?.sceneNumber) return;

    const inheritedWithTags = sceneAssets.filter(a =>
      a.inherited_from_instance_id &&
      (a.status_tags?.length ?? 0) > 0
    );

    const promptKey = `tag-prompt-${sceneId}`;
    const alreadyPrompted = localStorage.getItem(promptKey);

    if (inheritedWithTags.length > 0 && !alreadyPrompted) {
      setPriorInstancesWithTags(
        inheritedWithTags.map(a => ({
          instance: a,
          assetName: a.project_asset?.name ?? 'Unknown',
        }))
      );
      setShowTagCarryForwardPrompt(true);
    }
  }, [sceneAssets, priorSceneData?.sceneNumber, sceneId]);

  const handleTagCarryForwardConfirm = useCallback(async (decisions: TagCarryForwardDecision[]) => {
    try {
      await Promise.all(
        decisions.map(decision =>
          sceneAssetService.updateSceneAsset(projectId, sceneId, decision.instanceId, {
            statusTags: decision.tagsToCarry,
            modificationReason: decision.carryAll
              ? 'Carried forward all tags from prior scene'
              : decision.tagsToCarry.length === 0
                ? 'Removed all tags from prior scene'
                : 'Carried forward selected tags from prior scene',
          })
        )
      );
      localStorage.setItem(`tag-prompt-${sceneId}`, 'true');
      queryClient.invalidateQueries({ queryKey: ['scene-assets', projectId, sceneId] });
      toast.success('Tag carry-forward applied');
    } catch (error) {
      console.error('Tag carry-forward error:', error);
      toast.error('Failed to apply tag carry-forward');
    }
  }, [projectId, sceneId, queryClient]);

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

  // Poll single image job until completed/failed (Issue 1b: image appears without refresh)
  const pollSingleImageJob = useCallback(
    async (jobId: string): Promise<void> => {
      const maxAttempts = 60;
      const pollIntervalMs = 2000;
      for (let i = 0; i < maxAttempts; i++) {
        const job = await sceneAssetService.getImageJobStatus(jobId);
        if (job.status === 'completed') return;
        if (job.status === 'failed') {
          const msg = job.error?.message ?? job.error?.code ?? 'Image generation failed';
          throw new Error(typeof msg === 'string' ? msg : 'Image generation failed');
        }
        await new Promise(r => setTimeout(r, pollIntervalMs));
      }
      throw new Error('Image generation timeout');
    },
    []
  );

  const handleDetectAndPopulateAssets = useCallback(async () => {
    setIsDetecting(true);
    try {
      // Try deterministic pre-population first (instant, no LLM)
      const depResult = await sceneAssetService.populateFromDependencies(projectId, sceneId);

      if (depResult.matched > 0) {
        queryClient.invalidateQueries({ queryKey: ['scene-assets', projectId, sceneId] });
        toast.success(`Pre-populated ${depResult.matched} assets from script dependencies`);
        return; // Success — skip AI detection
      }

      // Fallback: AI relevance detection if no dependencies matched
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
    setBulkProgress({ completed: 0, total: selectedForGeneration.length });
    try {
      const result = await sceneAssetService.bulkGenerateImages(projectId, sceneId, selectedForGeneration);
      const statuses = result.statuses;
      await sceneAssetService.pollBulkImageJobs(statuses, {
        pollIntervalMs: 2000,
        maxAttempts: 60,
        onProgress: (completed, total) => setBulkProgress({ completed, total }),
      });
      await queryClient.invalidateQueries({ queryKey: ['scene-assets', projectId, sceneId] });
      const completedCount = statuses.filter(s => s.status === 'completed').length;
      const failedCount = statuses.filter(s => s.status === 'failed').length;
      if (failedCount === 0) {
        toast.success(`Generated ${completedCount} image(s)`);
      } else if (completedCount > 0) {
        toast.warning(`${completedCount} completed, ${failedCount} failed`);
      } else {
        toast.error('Image generation failed');
      }
      setSelectedForGeneration([]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Bulk generation failed');
    } finally {
      setIsGenerating(false);
      setBulkProgress(null);
    }
  }, [projectId, sceneId, selectedForGeneration, queryClient]);

  const handleUpdateAsset = useCallback(
    (instanceId: string, updates: { descriptionOverride?: string; modificationReason?: string | null; statusTags?: string[]; carryForward?: boolean }) => {
      updateMutation.mutate({ instanceId, updates });
    },
    [updateMutation]
  );

  const handleGenerateImage = useCallback(
    async (instanceId: string) => {
      setIsGeneratingSingle(true);
      try {
        const result = await sceneAssetService.generateSceneAssetImage(projectId, sceneId, instanceId);
        await pollSingleImageJob(result.jobId);
        await queryClient.invalidateQueries({ queryKey: ['scene-assets', projectId, sceneId] });
        toast.success('Image generated successfully');
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Image generation failed');
      } finally {
        setIsGeneratingSingle(false);
      }
    },
    [projectId, sceneId, queryClient, pollSingleImageJob]
  );

  const handleCreateNewAsset = useCallback(() => {
    setAssetDrawerOpen(true);
  }, []);

  const handleSceneInstanceCreated = useCallback(
    (instance: SceneAssetInstance) => {
      refetch();
      toast.success(`Added ${instance.project_asset?.name ?? 'asset'} to scene`);
      setAssetDrawerOpen(false);
    },
    [refetch]
  );

  /** Task 10: Gatekeeper – only allow proceeding to Stage 9 when all assets have visual references. */
  const handleProceedToStage9 = useCallback(() => {
    const missingImages = sceneAssets.filter(a => !a.image_key_url);
    if (missingImages.length > 0) {
      toast.error(
        `Cannot proceed: ${missingImages.length} asset(s) missing visual references. Generate images first.`
      );
      return;
    }
    onComplete();
  }, [sceneAssets, onComplete]);

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
        {currentScene && (
          <div className="px-6 py-3 border-b border-border/50 bg-card/30 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="text-sm font-mono">
                  Scene {currentScene.sceneNumber}
                </Badge>
                <h2 className="text-lg font-semibold">
                  {currentScene.slug}
                </h2>
              </div>
              <Badge
                variant={currentScene.status === 'shot_list_ready' ? 'default' : 'outline'}
                className="text-xs"
              >
                {currentScene.status.replace(/_/g, ' ')}
              </Badge>
            </div>
          </div>
        )}
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
      {(stage8Locked || stage8Outdated) && (
        <LockedStageHeader
          stageNumber={8}
          title="Visual Definition"
          isLocked={stage8Locked}
          isOutdated={stage8Outdated}
          onBack={onBack}
          onNext={onNext}
          onUnlockAndEdit={handleUnlockAndEdit}
          onRelock={stage8Outdated ? () => relockStage(8) : undefined}
          onLockAndProceed={!stage8Locked && !stage8Outdated ? handleLockAndProceed : undefined}
          lockAndProceedLabel="Lock & Proceed"
        />
      )}
      {currentScene && (
        <div className="px-6 py-3 border-b border-border/50 bg-card/30 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="text-sm font-mono">
                Scene {currentScene.sceneNumber}
              </Badge>
              <h2 className="text-lg font-semibold">
                {currentScene.slug}
              </h2>
            </div>
            <Badge
              variant={currentScene.status === 'shot_list_ready' ? 'default' : 'outline'}
              className="text-xs"
            >
              {currentScene.status.replace(/_/g, ' ')}
            </Badge>
          </div>
        </div>
      )}
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
          bulkProgress={bulkProgress}
          newAssetsRequired={newAssetsRequired}
          onOpenAssetDrawer={() => setAssetDrawerOpen(true)}
          onIgnoreSuggested={index => setNewAssetsRequired(prev => prev.filter((_, i) => i !== index))}
          onInherit={() => inheritMutation.mutate()}
          isInheriting={inheritMutation.isPending}
          onFilterChange={setAssetFilters}
        />

        <VisualStateEditorPanel
          selectedAsset={selectedAsset}
          onUpdateAsset={handleUpdateAsset}
          onGenerateImage={handleGenerateImage}
          projectId={projectId}
          sceneId={sceneId}
          isUpdating={updateMutation.isPending}
          isGeneratingImage={isGeneratingSingle}
          inheritedFromSceneNumber={priorSceneData?.sceneNumber ?? null}
        />

        <AssetDrawerTriggerPanel
          onOpenAssetDrawer={() => setAssetDrawerOpen(true)}
          onCreateNewAsset={handleCreateNewAsset}
          onBack={onBack}
          onComplete={handleProceedToStage9}
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

      <TagCarryForwardPrompt
        isOpen={showTagCarryForwardPrompt}
        onClose={() => {
          setShowTagCarryForwardPrompt(false);
          localStorage.setItem(`tag-prompt-${sceneId}`, 'true');
        }}
        priorSceneNumber={priorSceneData?.sceneNumber ?? 0}
        currentSceneNumber={currentSceneNumber}
        priorInstances={priorInstancesWithTags}
        onConfirm={handleTagCarryForwardConfirm}
      />

      <UnlockWarningDialog
        open={showUnlockWarning}
        onOpenChange={setShowUnlockWarning}
        impact={unlockImpact}
        stageNumber={8}
        stageTitle="Visual Definition"
        onConfirm={handleConfirmUnlock}
        isConfirming={isConfirmingUnlock}
      />
    </div>
  );
}
