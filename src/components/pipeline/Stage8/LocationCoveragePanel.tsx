/**
 * Stage 8 Location Coverage Panel — Phases E + H
 *
 * Shows per-location coverage status: which camera directions have reference
 * images, which shots are assigned to each direction, and highlights gaps.
 * Also provides an editable direction assignment table for shots.
 * Phase H: "Generate Missing Views" batch generation from coverage gaps.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  CheckCircle2,
  AlertTriangle,
  Camera,
  ChevronDown,
  ChevronRight,
  Image as ImageIcon,
  MapPin,
  Eye,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { projectAssetService } from '@/lib/services/projectAssetService';
import { shotService } from '@/lib/services/shotService';
import type { Shot, SceneAssetInstance } from '@/types/scene';
import type { LocationView } from '@/types/asset';

// ─── Types ───────────────────────────────────────────────────────────────────

interface DirectionGroup {
  direction: LocationView;
  shots: Shot[];
  hasImage: boolean;
}

interface UnmatchedGroup {
  shots: Shot[];
  fallbackDirection?: LocationView;
}

interface LocationCoverage {
  locationAsset: SceneAssetInstance;
  locationViews: LocationView[];
  directionGroups: DirectionGroup[];
  establishingView?: LocationView;
  unmatchedGroup: UnmatchedGroup;
  totalShots: number;
  coveredShots: number;
}

type CoverageStatus = 'fully_covered' | 'partial' | 'no_coverage';

// ─── Props ───────────────────────────────────────────────────────────────────

interface LocationCoveragePanelProps {
  projectId: string;
  sceneId: string;
  shots: Shot[];
  sceneAssets: SceneAssetInstance[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getCoverageStatus(coverage: LocationCoverage): CoverageStatus {
  if (coverage.totalShots === 0) return 'fully_covered';
  if (coverage.coveredShots === coverage.totalShots && coverage.unmatchedGroup.shots.length === 0) {
    return 'fully_covered';
  }
  if (coverage.coveredShots > 0) return 'partial';
  return 'no_coverage';
}

function getStatusIcon(status: CoverageStatus) {
  switch (status) {
    case 'fully_covered':
      return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    case 'partial':
      return <AlertTriangle className="w-4 h-4 text-amber-400" />;
    case 'no_coverage':
      return <AlertTriangle className="w-4 h-4 text-red-400" />;
  }
}

function getDirectionLabel(view: LocationView): string {
  if (view.alias) return `${view.name.replace('_', ' ')} "${view.alias}"`;
  return view.name.replace('_', ' ');
}

function getSourceBadge(source: LocationView['source']) {
  switch (source) {
    case 'user':
      return <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">User</span>;
    case 'established':
      return <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">Established</span>;
    case 'stage7_inferred':
      return <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">Inferred</span>;
  }
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function LocationCoveragePanel({
  projectId,
  sceneId,
  shots,
  sceneAssets,
}: LocationCoveragePanelProps) {
  const queryClient = useQueryClient();
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set());
  // Phase H: track generating state per view ID
  const [generatingViewIds, setGeneratingViewIds] = useState<Set<string>>(new Set());

  // Find all location assets in the scene
  const locationAssets = useMemo(
    () => sceneAssets.filter(a => a.project_asset?.asset_type === 'location'),
    [sceneAssets]
  );

  // Fetch location views for all location assets
  const locationViewsQueries = useQuery({
    queryKey: ['location-coverage-views', projectId, locationAssets.map(a => a.project_asset_id)],
    queryFn: async () => {
      const results = new Map<string, LocationView[]>();
      for (const asset of locationAssets) {
        try {
          const views = await projectAssetService.listLocationViews(projectId, asset.project_asset_id);
          results.set(asset.project_asset_id, views);
        } catch {
          results.set(asset.project_asset_id, []);
        }
      }
      return results;
    },
    enabled: locationAssets.length > 0,
  });

  const allLocationViews = useMemo(
    () => locationViewsQueries.data ?? new Map<string, LocationView[]>(),
    [locationViewsQueries.data]
  );

  // Build coverage analysis for each location
  const coverageData: LocationCoverage[] = useMemo(() => {
    if (locationAssets.length === 0) return [];

    return locationAssets.map(locationAsset => {
      const views = allLocationViews.get(locationAsset.project_asset_id) ?? [];
      const locationName = locationAsset.project_asset?.name?.toLowerCase() ?? '';

      // Find shots that reference this location (by setting match or camera_direction_id)
      const locationShots = shots.filter(shot => {
        // Direct direction assignment
        if (shot.camera_direction_id) {
          const matchedView = views.find(v => v.id === shot.camera_direction_id);
          if (matchedView) return true;
        }
        // Setting-based match
        if (shot.setting && locationName && shot.setting.toLowerCase().includes(locationName)) {
          return true;
        }
        return false;
      });

      // Separate establishing from directions
      const establishingView = views.find(v => v.view_type === 'establishing');
      const directionViews = views.filter(v => v.view_type === 'direction');
      const primaryDirection = directionViews.find(v => v.is_primary) ?? directionViews[0];

      // Group shots by assigned direction
      const directionGroups: DirectionGroup[] = directionViews.map(direction => ({
        direction,
        shots: locationShots.filter(s => s.camera_direction_id === direction.id),
        hasImage: !!direction.image_key_url,
      }));

      // Unmatched shots (have no direction assignment or direction is not in our views)
      const assignedShotIds = new Set(
        directionGroups.flatMap(g => g.shots.map(s => s.id))
      );
      const unmatchedShots = locationShots.filter(s => !assignedShotIds.has(s.id));

      // Count covered shots (assigned to a direction WITH an image)
      const coveredShots = directionGroups
        .filter(g => g.hasImage)
        .reduce((sum, g) => sum + g.shots.length, 0);

      return {
        locationAsset,
        locationViews: views,
        directionGroups,
        establishingView,
        unmatchedGroup: { shots: unmatchedShots, fallbackDirection: primaryDirection },
        totalShots: locationShots.length,
        coveredShots,
      };
    });
  }, [locationAssets, allLocationViews, shots]);

  // Auto-expand first location
  useEffect(() => {
    if (coverageData.length > 0 && expandedLocations.size === 0) {
      setExpandedLocations(new Set([coverageData[0].locationAsset.project_asset_id]));
    }
  }, [coverageData, expandedLocations.size]);

  const toggleLocation = useCallback((assetId: string) => {
    setExpandedLocations(prev => {
      const next = new Set(prev);
      if (next.has(assetId)) next.delete(assetId);
      else next.add(assetId);
      return next;
    });
  }, []);

  // Handle direction assignment change for a shot
  const handleDirectionChange = useCallback(
    async (shotId: string, directionId: string | null) => {
      try {
        await shotService.updateShot(projectId, sceneId, shotId, {
          camera_direction_id: directionId ?? undefined,
        } as Partial<Shot>);
        queryClient.invalidateQueries({ queryKey: ['shots', projectId, sceneId] });
        toast.success('Direction assignment updated');
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to update direction');
      }
    },
    [projectId, sceneId, queryClient]
  );

  // Phase H: Generate a single location view image
  const handleGenerateViewImage = useCallback(
    async (assetId: string, viewId: string) => {
      setGeneratingViewIds(prev => new Set(prev).add(viewId));
      try {
        const result = await projectAssetService.generateLocationViewImage(projectId, assetId, viewId);
        if (result.status === 'completed') {
          toast.success('View image generated');
          queryClient.invalidateQueries({ queryKey: ['location-coverage-views'] });
          queryClient.invalidateQueries({ queryKey: ['location-views'] });
        } else {
          toast.error('Generation failed: ' + (result.error?.message || 'Unknown error'));
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to generate view image');
      } finally {
        setGeneratingViewIds(prev => {
          const next = new Set(prev);
          next.delete(viewId);
          return next;
        });
      }
    },
    [projectId, queryClient]
  );

  // Phase H: Batch generate all missing view images for a location
  const handleGenerateMissing = useCallback(
    async (coverage: LocationCoverage) => {
      const assetId = coverage.locationAsset.project_asset_id;
      // Find directions without images (excluding establishing)
      const missingDirections = coverage.directionGroups
        .filter(g => !g.hasImage && g.direction.view_type === 'direction')
        .map(g => g.direction);

      // Also check establishing
      if (coverage.establishingView && !coverage.establishingView.image_key_url) {
        missingDirections.unshift(coverage.establishingView);
      }

      if (missingDirections.length === 0) {
        toast.info('All directions already have images');
        return;
      }

      // Generate sequentially to avoid overwhelming the API
      for (const dir of missingDirections) {
        await handleGenerateViewImage(assetId, dir.id);
      }
    },
    [handleGenerateViewImage]
  );

  if (locationAssets.length === 0) return null;
  if (coverageData.every(c => c.totalShots === 0)) return null;

  return (
    <div className="border-t border-border/50 bg-card/30">
      <div className="px-4 py-3 flex items-center gap-2">
        <Camera className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-medium text-foreground">Location Coverage</h3>
      </div>

      <div className="px-4 pb-4 space-y-2">
        {coverageData.map(coverage => {
          const status = getCoverageStatus(coverage);
          const isExpanded = expandedLocations.has(coverage.locationAsset.project_asset_id);
          const name = coverage.locationAsset.project_asset?.name ?? 'Unknown Location';

          return (
            <Collapsible
              key={coverage.locationAsset.project_asset_id}
              open={isExpanded}
              onOpenChange={() => toggleLocation(coverage.locationAsset.project_asset_id)}
            >
              <CollapsibleTrigger className="w-full flex items-center gap-2 px-3 py-2 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors text-left">
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                )}
                <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium flex-1 truncate">{name}</span>
                {getStatusIcon(status)}
                <span className="text-xs text-muted-foreground">
                  {coverage.coveredShots}/{coverage.totalShots} shots covered
                </span>
              </CollapsibleTrigger>

              <CollapsibleContent className="mt-1">
                <div className="ml-5 space-y-1.5 py-1">
                  {/* Establishing view */}
                  {coverage.establishingView && (
                    <div className="flex items-center gap-2 px-3 py-1.5 text-xs rounded bg-muted/20">
                      <Eye className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">Establishing</span>
                      {coverage.establishingView.alias && (
                        <span className="text-muted-foreground/70">"{coverage.establishingView.alias}"</span>
                      )}
                      {coverage.establishingView.image_key_url ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 ml-auto shrink-0" />
                      ) : (
                        <AlertTriangle className="w-3 h-3 text-amber-400 ml-auto shrink-0" />
                      )}
                      {getSourceBadge(coverage.establishingView.source)}
                    </div>
                  )}

                  {/* Direction groups */}
                  {coverage.directionGroups.map(group => (
                    <DirectionRow
                      key={group.direction.id}
                      group={group}
                      allDirections={coverage.locationViews.filter(v => v.view_type === 'direction')}
                      isGenerating={generatingViewIds.has(group.direction.id)}
                      onGenerate={() => handleGenerateViewImage(
                        coverage.locationAsset.project_asset_id,
                        group.direction.id
                      )}
                      hasStyleReference={
                        !!(coverage.establishingView?.image_key_url) ||
                        !!coverage.directionGroups.some(g => g.hasImage) ||
                        !!(coverage.locationAsset.project_asset?.image_key_url)
                      }
                    />
                  ))}

                  {/* Unmatched shots */}
                  {coverage.unmatchedGroup.shots.length > 0 && (
                    <div className="space-y-1 mt-2">
                      <div className="flex items-center gap-2 px-3 py-1.5 text-xs rounded bg-amber-500/10 border border-amber-500/20">
                        <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                        <span className="text-amber-300 font-medium">
                          {coverage.unmatchedGroup.shots.length} unassigned shot(s)
                        </span>
                        {coverage.unmatchedGroup.fallbackDirection && (
                          <span className="text-muted-foreground ml-auto">
                            fallback: {getDirectionLabel(coverage.unmatchedGroup.fallbackDirection)}
                          </span>
                        )}
                      </div>
                      {/* Shot assignment table for unmatched */}
                      <div className="ml-4 space-y-0.5">
                        {coverage.unmatchedGroup.shots.map(shot => (
                          <ShotDirectionAssignment
                            key={shot.id}
                            shot={shot}
                            directions={coverage.locationViews.filter(v => v.view_type === 'direction')}
                            onDirectionChange={handleDirectionChange}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Phase H: Generate Missing Views button */}
                  {(() => {
                    const missingCount = coverage.directionGroups.filter(g => !g.hasImage).length +
                      (coverage.establishingView && !coverage.establishingView.image_key_url ? 1 : 0);
                    const hasAnyRef = !!(coverage.establishingView?.image_key_url) ||
                      coverage.directionGroups.some(g => g.hasImage) ||
                      !!(coverage.locationAsset.project_asset?.image_key_url);
                    const isAnyGenerating = coverage.directionGroups.some(g => generatingViewIds.has(g.direction.id)) ||
                      (coverage.establishingView && generatingViewIds.has(coverage.establishingView.id));

                    if (missingCount === 0 || !hasAnyRef) return null;

                    return (
                      <div className="mt-2 pt-2 border-t border-border/20">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full h-7 text-xs"
                          onClick={() => handleGenerateMissing(coverage)}
                          disabled={!!isAnyGenerating}
                        >
                          {isAnyGenerating ? (
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          ) : (
                            <Sparkles className="w-3 h-3 mr-1" />
                          )}
                          Generate {missingCount} Missing View{missingCount !== 1 ? 's' : ''}
                        </Button>
                      </div>
                    );
                  })()}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function DirectionRow({
  group,
  allDirections,
  isGenerating,
  onGenerate,
  hasStyleReference,
}: {
  group: DirectionGroup;
  allDirections: LocationView[];
  isGenerating?: boolean;
  onGenerate?: () => void;
  hasStyleReference?: boolean;
}) {
  const [showShots, setShowShots] = useState(false);
  const label = getDirectionLabel(group.direction);

  return (
    <div>
      <div
        className="flex items-center gap-2 px-3 py-1.5 text-xs rounded bg-muted/20 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => group.shots.length > 0 && setShowShots(!showShots)}
      >
        {group.direction.image_key_url ? (
          <div className="w-6 h-6 rounded overflow-hidden shrink-0 border border-border/50">
            <img
              src={group.direction.image_key_url}
              alt={label}
              className="w-full h-full object-cover"
            />
          </div>
        ) : isGenerating ? (
          <div className="w-6 h-6 rounded shrink-0 border border-blue-500/30 flex items-center justify-center">
            <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />
          </div>
        ) : (
          <div className="w-6 h-6 rounded shrink-0 border border-dashed border-border/50 flex items-center justify-center">
            <ImageIcon className="w-3 h-3 text-muted-foreground/50" />
          </div>
        )}

        <span className="capitalize font-medium">{label}</span>

        <span className="text-muted-foreground">
          ({group.shots.length} shot{group.shots.length !== 1 ? 's' : ''})
        </span>

        <div className="ml-auto flex items-center gap-1.5">
          {/* Phase H: per-direction generate button */}
          {!group.hasImage && !isGenerating && onGenerate && hasStyleReference && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => { e.stopPropagation(); onGenerate(); }}
                  className="inline-flex items-center justify-center w-5 h-5 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Sparkles className="w-3 h-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="left" className="text-xs">Generate view image</TooltipContent>
            </Tooltip>
          )}
          {getSourceBadge(group.direction.source)}
          {group.hasImage ? (
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          ) : isGenerating ? (
            <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />
          ) : (
            <AlertTriangle className="w-3 h-3 text-amber-400" />
          )}
        </div>
      </div>

      {/* Expandable shot list — currently hidden for brevity unless user clicks */}
      {showShots && group.shots.length > 0 && (
        <div className="ml-10 mt-0.5 space-y-0.5">
          {group.shots.map(shot => (
            <div
              key={shot.id}
              className="flex items-center gap-2 px-2 py-1 text-[11px] text-muted-foreground rounded bg-muted/10"
            >
              <span className="font-mono">{shot.shotId}</span>
              <span className="truncate flex-1">{shot.camera}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ShotDirectionAssignment({
  shot,
  directions,
  onDirectionChange,
}: {
  shot: Shot;
  directions: LocationView[];
  onDirectionChange: (shotId: string, directionId: string | null) => void;
}) {
  return (
    <div className="flex items-center gap-2 px-2 py-1 text-[11px] rounded bg-muted/10">
      <span className="font-mono text-muted-foreground w-16 shrink-0">{shot.shotId}</span>
      <span className="text-muted-foreground truncate flex-1">{shot.camera}</span>
      <Select
        value={shot.camera_direction_id ?? 'unassigned'}
        onValueChange={(val) => onDirectionChange(shot.id, val === 'unassigned' ? null : val)}
      >
        <SelectTrigger className="h-6 w-36 text-[11px] border-border/30">
          <SelectValue placeholder="Assign..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="unassigned">Unassigned</SelectItem>
          {directions.map(d => (
            <SelectItem key={d.id} value={d.id}>
              {d.alias ? `${d.name.replace('_', ' ')} "${d.alias}"` : d.name.replace('_', ' ')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
