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
  Lock,
  ArrowLeft,
  Sparkles,
  Image as ImageIcon,
  Edit3,
  Plus,
  RefreshCw,
  Loader2,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
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
// Empty State: no assets – user chooses Detect or Add Manually
// ---------------------------------------------------------------------------
interface EmptyStatePanelProps {
  onDetectAssets: () => void;
  onAddManually: () => void;
  isDetecting: boolean;
}

function EmptyStatePanel({ onDetectAssets, onAddManually, isDetecting }: EmptyStatePanelProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
      <div className="text-center max-w-md">
        <Eye className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="font-display text-lg font-semibold text-foreground mb-2">
          No scene assets yet
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          Detect required assets from the shot list and script, or add assets manually from the
          project library.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="gold"
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
                <Sparkles className="w-4 h-4 mr-2" />
                Detect Required Assets
              </>
            )}
          </Button>
          <Button variant="outline" onClick={onAddManually}>
            <Plus className="w-4 h-4 mr-2" />
            Add Manually
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Scene Asset List Panel (left): grouped by type, source badge, status, multi-select
// ---------------------------------------------------------------------------
interface SceneAssetListPanelProps {
  assets: SceneAssetInstance[];
  selectedAsset: SceneAssetInstance | null;
  selectedForGeneration: string[];
  onSelectAsset: (asset: SceneAssetInstance | null) => void;
  onToggleSelection: (instanceId: string) => void;
  onBulkGenerate: () => void;
  isGenerating: boolean;
  onInherit?: () => void;
  isInheriting?: boolean;
}

function SceneAssetListPanel({
  assets,
  selectedAsset,
  selectedForGeneration,
  onSelectAsset,
  onToggleSelection,
  onBulkGenerate,
  isGenerating,
  onInherit,
  isInheriting,
}: SceneAssetListPanelProps) {
  const grouped = assets.reduce(
    (acc, a) => {
      const type = (a.project_asset?.asset_type ?? 'prop') as AssetTypeKey;
      if (!acc[type]) acc[type] = [];
      acc[type].push(a);
      return acc;
    },
    {} as Record<AssetTypeKey, SceneAssetInstance[]>
  );
  const order: AssetTypeKey[] = ['character', 'location', 'prop'];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="w-80 border-r border-border/50 bg-card/30 backdrop-blur-sm flex flex-col shrink-0"
    >
      <div className="p-4 border-b border-border/50">
        <h2 className="font-display text-lg font-semibold text-foreground">Scene Visual Elements</h2>
        <p className="text-xs text-muted-foreground mt-1">
          {assets.length} assets • {assets.filter(a => reviewStatus(a) === 'locked').length} locked
        </p>
        {onInherit && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 w-full"
            onClick={onInherit}
            disabled={isInheriting}
          >
            {isInheriting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
            Inherit from prior scene
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {order.map(type => {
            const list = grouped[type] ?? [];
            if (list.length === 0) return null;
            const Icon = typeIcons[type];
            return (
              <div key={type} className="mb-4">
                <div className="flex items-center gap-2 px-2 py-1 mb-1">
                  <Icon className="w-4 h-4 text-primary" />
                  <span className="text-xs font-medium text-foreground capitalize">{type}s</span>
                  <span className="text-xs text-muted-foreground">({list.length})</span>
                </div>
                {list.map(instance => {
                  const status = reviewStatus(instance);
                  const source = sourceBadge(instance);
                  const name = instance.project_asset?.name ?? 'Unknown';
                  return (
                    <motion.div
                      key={instance.id}
                      whileHover={{ scale: 1.01 }}
                      className={cn(
                        'p-3 rounded-lg mb-1 cursor-pointer transition-all',
                        selectedAsset?.id === instance.id
                          ? 'bg-primary/10 border border-primary/30'
                          : 'bg-card/50 border border-border/30 hover:border-border'
                      )}
                      onClick={() => onSelectAsset(instance)}
                    >
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedForGeneration.includes(instance.id)}
                          onCheckedChange={() => onToggleSelection(instance.id)}
                          onClick={e => e.stopPropagation()}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-sm font-medium text-foreground truncate">{name}</span>
                            <Badge variant="secondary" className={cn('text-[10px] shrink-0', statusColors[status])}>
                              {status === 'locked' && <Lock className="w-2 h-2 mr-1" />}
                              {status}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">{source}</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-border/50">
        <Button
          variant="gold"
          className="w-full"
          disabled={selectedForGeneration.length === 0 || isGenerating}
          onClick={onBulkGenerate}
        >
          {isGenerating ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Scene Starting Visuals ({selectedForGeneration.length})
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Visual State Editor (center): effective_description, project_asset, inheritance, audit
// ---------------------------------------------------------------------------
interface VisualStateEditorPanelProps {
  selectedAsset: SceneAssetInstance | null;
  onUpdateAsset: (instanceId: string, updates: { descriptionOverride?: string; modificationReason?: string | null; statusTags?: string[] }) => void;
  onGenerateImage: (instanceId: string) => void;
  projectId: string;
  sceneId: string;
  isUpdating?: boolean;
  isGeneratingImage?: boolean;
  inheritedFromSceneNumber?: number | null;
}

function VisualStateEditorPanel({
  selectedAsset,
  onUpdateAsset,
  onGenerateImage,
  projectId,
  sceneId,
  isUpdating,
  isGeneratingImage,
  inheritedFromSceneNumber,
}: VisualStateEditorPanelProps) {
  const [localDescription, setLocalDescription] = useState('');
  const [localReason, setLocalReason] = useState('');

  useEffect(() => {
    if (selectedAsset) {
      setLocalDescription(selectedAsset.description_override ?? selectedAsset.effective_description ?? '');
      setLocalReason(selectedAsset.modification_reason ?? '');
    }
  }, [selectedAsset?.id, selectedAsset?.description_override, selectedAsset?.effective_description, selectedAsset?.modification_reason]);

  if (!selectedAsset) {
    return (
      <div className="flex-1 flex items-center justify-center bg-card/20">
        <p className="text-muted-foreground">Select an asset to edit</p>
      </div>
    );
  }

  const name = selectedAsset.project_asset?.name ?? 'Unknown';
  const assetType = selectedAsset.project_asset?.asset_type ?? 'prop';
  const Icon = typeIcons[assetType as AssetTypeKey];
  const isLocked = (selectedAsset.status_tags ?? []).includes('locked');

  const handleSaveDescription = () => {
    if (localDescription !== (selectedAsset.description_override ?? selectedAsset.effective_description))
      onUpdateAsset(selectedAsset.id, { descriptionOverride: localDescription });
  };

  const handleLock = () => {
    const tags = selectedAsset.status_tags ?? [];
    const withLocked = tags.includes('locked') ? tags : [...tags, 'locked'];
    onUpdateAsset(selectedAsset.id, {
      modificationReason: localReason || 'Locked by user',
      statusTags: withLocked,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 flex flex-col overflow-hidden bg-card/20"
    >
      <div className="p-4 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-primary" />
          <div>
            <h3 className="text-lg font-semibold text-foreground">{name}</h3>
            <p className="text-xs text-muted-foreground">
              {selectedAsset.inherited_from_instance_id
                ? inheritedFromSceneNumber != null
                  ? `Inheriting from Scene ${inheritedFromSceneNumber}`
                  : 'Inheriting from prior scene'
                : 'Inheritance source: Master'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {!isLocked && (
            <Button variant="outline" size="sm" onClick={handleLock} disabled={isUpdating}>
              <Lock className="w-4 h-4 mr-1" />
              Lock
            </Button>
          )}
          <Button
            variant="gold"
            size="sm"
            onClick={() => onGenerateImage(selectedAsset.id)}
            disabled={isGeneratingImage}
          >
            {isGeneratingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
            Generate image
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {selectedAsset.project_asset?.image_key_url && (
            <div>
              <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-3">
                <ImageIcon className="w-4 h-4 text-primary" />
                Master reference
              </label>
              <div className="aspect-video max-w-xs rounded-lg border border-border/30 overflow-hidden bg-muted/50">
                <img
                  src={selectedAsset.project_asset.image_key_url}
                  alt={name}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-3">
              <Edit3 className="w-4 h-4 text-primary" />
              Visual state description
            </label>
            <Textarea
              value={localDescription}
              onChange={e => setLocalDescription(e.target.value)}
              onBlur={handleSaveDescription}
              placeholder="Starting look for this asset in this scene…"
              rows={6}
              disabled={isLocked}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Mid-scene visual changes are handled in Stage 10.
            </p>
          </div>

          {(selectedAsset.modification_count != null && selectedAsset.modification_count > 0) && (
            <div className="bg-card/50 rounded-lg p-4 border border-border/30">
              <h4 className="text-sm font-medium text-foreground mb-2">Audit</h4>
              <p className="text-xs text-muted-foreground">
                Modifications: {selectedAsset.modification_count}
                {selectedAsset.last_modified_field && ` • Last field: ${selectedAsset.last_modified_field}`}
              </p>
            </div>
          )}

          {selectedAsset.inherited_from_instance_id && (
            <div className="bg-card/50 rounded-lg p-4 border border-border/30">
              <h4 className="text-sm font-medium text-foreground mb-2">Inheritance</h4>
              <p className="text-xs text-muted-foreground">
                This instance inherits from a prior scene instance. Edits here create a new scene
                instance and are saved to the asset history.
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </motion.div>
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
    mutationFn: ({ instanceId, updates }: { instanceId: string; updates: { descriptionOverride?: string; modificationReason?: string | null; statusTags?: string[] } }) =>
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

  const detectMutation = useMutation({
    mutationFn: () => sceneAssetService.detectRelevantAssets(projectId, sceneId),
    onSuccess: async (relevance: SceneAssetRelevanceResult) => {
      for (const ra of relevance.relevant_assets) {
        const projectAssetId = ra.project_asset_id;
        try {
          await sceneAssetService.createSceneAsset(projectId, {
            sceneId,
            projectAssetId,
            descriptionOverride: ra.starting_description || undefined,
          });
        } catch {
          // Skip duplicates or errors
        }
      }
      if (relevance.new_assets_required?.length) setNewAssetsRequired(relevance.new_assets_required);
      queryClient.invalidateQueries({ queryKey: ['scene-assets', projectId, sceneId] });
      toast.success(`Added ${relevance.relevant_assets.length} relevant asset(s). ${relevance.new_assets_required?.length ?? 0} new assets suggested.`);
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

  const handleDetectAndPopulateAssets = useCallback(() => {
    detectMutation.mutate();
  }, [detectMutation]);

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
    (instanceId: string, updates: { descriptionOverride?: string; modificationReason?: string | null; statusTags?: string[] }) => {
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
          isDetecting={detectMutation.isPending}
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
