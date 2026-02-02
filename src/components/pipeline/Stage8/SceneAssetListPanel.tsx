/**
 * Stage 8 – Scene Asset List Panel (Left)
 * Grouped list of scene asset instances with multi-select, status badges, and suggested-assets section.
 * Task 4: 5.2-dev-plan-v1 (740–830)
 */

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { User, MapPin, Package, Lock, RefreshCw, Sparkles, Plus, X, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { getTagColors } from '@/lib/constants/statusTags';
import type { SceneAssetInstance, SceneAssetRelevanceResult } from '@/types/scene';

type AssetTypeKey = 'character' | 'location' | 'prop';

const typeIcons = {
  character: User,
  location: MapPin,
  prop: Package,
};

const typeLabels: Record<AssetTypeKey, string> = {
  character: 'Characters',
  location: 'Locations',
  prop: 'Props',
};

function sourceBadge(instance: SceneAssetInstance): 'Master' | 'Prior Scene' | 'New' {
  if (instance.inherited_from_instance_id) return 'Prior Scene';
  return 'Master';
}

function getReviewStatus(asset: SceneAssetInstance): 'unreviewed' | 'edited' | 'locked' {
  if (!asset.image_key_url) return 'unreviewed';
  if (asset.modification_count != null && asset.modification_count > 0) return 'edited';
  return 'locked';
}

const statusColors: Record<string, string> = {
  unreviewed: 'bg-muted text-muted-foreground',
  edited: 'bg-amber-500/20 text-amber-400',
  locked: 'bg-emerald-500/20 text-emerald-400',
};

type NewAssetRequired = SceneAssetRelevanceResult['new_assets_required'][number];

export interface SceneAssetListPanelProps {
  assets: SceneAssetInstance[];
  selectedAsset: SceneAssetInstance | null;
  selectedForGeneration: string[];
  onSelectAsset: (asset: SceneAssetInstance | null) => void;
  onToggleSelection: (instanceId: string) => void;
  onBulkGenerate: () => void;
  isGenerating: boolean;
  /** During bulk generation: { completed, total } for progress display */
  bulkProgress?: { completed: number; total: number } | null;
  /** Suggested assets from relevance agent (not in library); show "Add from library" / "Ignore" */
  newAssetsRequired?: NewAssetRequired[];
  onOpenAssetDrawer?: () => void;
  onIgnoreSuggested?: (index: number) => void;
  onInherit?: () => void;
  isInheriting?: boolean;
}

function AssetTypeGroup({
  type,
  assets,
  selectedAssetId,
  selectedForGeneration,
  onSelectAsset,
  onToggleSelection,
}: {
  type: AssetTypeKey;
  assets: SceneAssetInstance[];
  selectedAssetId: string | null;
  selectedForGeneration: string[];
  onSelectAsset: (asset: SceneAssetInstance | null) => void;
  onToggleSelection: (instanceId: string) => void;
}) {
  const Icon = typeIcons[type];
  if (assets.length === 0) return null;

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 px-2 py-1 mb-1">
        <Icon className="w-4 h-4 text-primary" />
        <span className="text-xs font-medium text-foreground">{typeLabels[type]}</span>
        <span className="text-xs text-muted-foreground">({assets.length})</span>
      </div>
      {assets.map(instance => {
        const status = getReviewStatus(instance);
        const source = sourceBadge(instance);
        const name = instance.project_asset?.name ?? 'Unknown';
        return (
          <motion.div
            key={instance.id}
            whileHover={{ scale: 1.01 }}
            className={cn(
              'p-3 rounded-lg mb-1 cursor-pointer transition-all',
              selectedAssetId === instance.id
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
                {/* Status Tags */}
                {instance.status_tags && instance.status_tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {instance.status_tags.slice(0, 3).map(tag => {
                      const colors = getTagColors(tag);
                      return (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className={cn(
                            'text-[10px] px-1.5 py-0 h-4 border',
                            colors.bg,
                            colors.text,
                            colors.border
                          )}
                        >
                          {tag}
                        </Badge>
                      );
                    })}
                    {instance.status_tags.length > 3 && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 h-4 text-muted-foreground"
                      >
                        +{instance.status_tags.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
                {/* Carry Forward Indicator (only if tags exist and carry_forward is true) */}
                {instance.status_tags && instance.status_tags.length > 0 && instance.carry_forward && (
                  <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                    <Link2 className="w-3 h-3" />
                    <span>Will carry forward</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

export function SceneAssetListPanel({
  assets,
  selectedAsset,
  selectedForGeneration,
  onSelectAsset,
  onToggleSelection,
  onBulkGenerate,
  isGenerating,
  bulkProgress = null,
  newAssetsRequired = [],
  onOpenAssetDrawer,
  onIgnoreSuggested,
  onInherit,
  isInheriting,
}: SceneAssetListPanelProps) {
  const groupedAssets = useMemo(
    () => ({
      character: assets.filter(a => (a.project_asset?.asset_type ?? 'prop') === 'character'),
      location: assets.filter(a => (a.project_asset?.asset_type ?? 'prop') === 'location'),
      prop: assets.filter(a => (a.project_asset?.asset_type ?? 'prop') === 'prop'),
    }),
    [assets]
  );

  const order: AssetTypeKey[] = ['character', 'location', 'prop'];
  const withVisuals = assets.filter(a => a.image_key_url).length;
  const totalTags = assets.reduce((sum, a) => sum + (a.status_tags?.length ?? 0), 0);
  const assetsWithTags = assets.filter(a => (a.status_tags?.length ?? 0) > 0).length;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="w-80 border-r border-border/50 bg-card/30 backdrop-blur-sm flex flex-col shrink-0"
    >
      <div className="p-4 border-b border-border/50">
        <h2 className="font-display text-lg font-semibold text-foreground">Scene Assets</h2>
        <p className="text-xs text-muted-foreground mt-1">
          {assets.length} asset{assets.length !== 1 ? 's' : ''} • {withVisuals} with visuals • {assetsWithTags} with tags ({totalTags} total)
        </p>
        {onInherit && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 w-full"
            onClick={onInherit}
            disabled={isInheriting}
          >
            {isInheriting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-1" />
                Inherit from prior scene
              </>
            )}
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {order.map(type => (
            <AssetTypeGroup
              key={type}
              type={type}
              assets={groupedAssets[type]}
              selectedAssetId={selectedAsset?.id ?? null}
              selectedForGeneration={selectedForGeneration}
              onSelectAsset={onSelectAsset}
              onToggleSelection={onToggleSelection}
            />
          ))}

          {/* Suggested – not in library (from new_assets_required) */}
          {newAssetsRequired.length > 0 && (
            <div className="mt-4 p-2 rounded-lg border border-amber-500/40 bg-amber-500/5">
              <div className="flex items-center gap-2 px-2 py-1 mb-2">
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                  Suggested – not in library
                </span>
              </div>
              {newAssetsRequired.map((item, index) => (
                <div
                  key={`${item.name}-${index}`}
                  className="p-3 rounded-lg mb-1 border border-amber-500/20 bg-card/50 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground truncate">{item.name}</span>
                    <Badge variant="secondary" className="text-[10px] shrink-0 bg-amber-500/20 text-amber-600 dark:text-amber-400">
                      {item.asset_type}
                    </Badge>
                  </div>
                  {item.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                  )}
                  <div className="flex gap-2">
                    {onOpenAssetDrawer && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-8 text-xs"
                        onClick={() => onOpenAssetDrawer()}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add from library
                      </Button>
                    )}
                    {onIgnoreSuggested && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs text-muted-foreground"
                        onClick={() => onIgnoreSuggested(index)}
                      >
                        <X className="w-3 h-3 mr-1" />
                        Ignore
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
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
              {bulkProgress
                ? `Generating (${bulkProgress.completed}/${bulkProgress.total})…`
                : `Generating (${selectedForGeneration.length})…`}
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Visuals ({selectedForGeneration.length})
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}
