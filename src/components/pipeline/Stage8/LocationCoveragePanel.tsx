/**
 * Stage 8 Location Coverage Panel
 *
 * Renders server-derived canonical location coverage. Stage 8 owns advanced
 * direction/view repair, while baseline location identity stays linked to
 * shot.location_asset_id from Stage 7.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Eye,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Plus,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { frameService } from '@/lib/services/frameService';
import { locationContinuityService } from '@/lib/services/locationContinuityService';
import { projectAssetService } from '@/lib/services/projectAssetService';
import type {
  ContinuityStrength,
  LocationCoverageResponse,
  LocationCoverageShot,
  LocationCoverageSummary,
  LocationViewSummary,
} from '@/types/locationContinuity';

interface LocationCoveragePanelProps {
  projectId: string;
  sceneId: string;
}

type CoverageStatus = 'good' | 'partial' | 'weak';

const CLEAR_DIRECTION_VALUE = 'unassigned';

function getCoverageStatus(strength: ContinuityStrength): CoverageStatus {
  if (strength === 'strong') return 'good';
  if (strength === 'usable') return 'partial';
  return 'weak';
}

function getStatusIcon(status: CoverageStatus) {
  switch (status) {
    case 'good':
      return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    case 'partial':
      return <AlertTriangle className="w-4 h-4 text-amber-400" />;
    case 'weak':
      return <AlertTriangle className="w-4 h-4 text-red-400" />;
  }
}

function getStrengthLabel(strength: ContinuityStrength): string {
  switch (strength) {
    case 'strong':
      return 'Strong';
    case 'usable':
      return 'Fallback';
    case 'weak':
      return 'Needs repair';
    case 'missing':
      return 'Missing';
  }
}

function getDirectionLabel(view: LocationViewSummary): string {
  const base = view.name.replace(/_/g, ' ');
  return view.alias ? `${base} "${view.alias}"` : base;
}

function getSourceBadge(source: LocationViewSummary['source']) {
  switch (source) {
    case 'user':
      return <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">User</span>;
    case 'established':
      return <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">Established</span>;
    case 'stage7_inferred':
      return <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">Inferred</span>;
    default:
      return <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">View</span>;
  }
}

function nextDirectionName(views: LocationViewSummary[]): string {
  const directionNumbers = views
    .filter(view => view.viewType === 'direction')
    .map(view => {
      const match = view.name.match(/^direction_(\d+)$/);
      return match ? Number(match[1]) : 0;
    });
  const next = Math.max(0, ...directionNumbers) + 1;
  return `direction_${next}`;
}

export function LocationCoveragePanel({ projectId, sceneId }: LocationCoveragePanelProps) {
  const queryClient = useQueryClient();
  const [continuityMode, setContinuityMode] = useState<'basic' | 'advanced'>('basic');
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set());
  const [generatingViewIds, setGeneratingViewIds] = useState<Set<string>>(new Set());
  const [creatingLocationIds, setCreatingLocationIds] = useState<Set<string>>(new Set());
  const [establishingShotIds, setEstablishingShotIds] = useState<Set<string>>(new Set());

  const continuityModeQuery = useQuery({
    queryKey: ['continuity-mode', projectId],
    queryFn: () => locationContinuityService.fetchContinuityMode(projectId),
    enabled: Boolean(projectId),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (continuityModeQuery.data) {
      setContinuityMode(continuityModeQuery.data);
    }
  }, [continuityModeQuery.data]);

  const updateContinuityModeMutation = useMutation({
    mutationFn: (mode: 'basic' | 'advanced') => locationContinuityService.updateContinuityMode(projectId, mode),
    onSuccess: (mode) => {
      setContinuityMode(mode);
      queryClient.invalidateQueries({ queryKey: ['continuity-mode', projectId] });
      queryClient.invalidateQueries({ queryKey: ['continuity-metrics', projectId, sceneId] });
    },
  });

  const coverageQuery = useQuery({
    queryKey: ['location-coverage', projectId, sceneId, continuityMode],
    queryFn: () => locationContinuityService.fetchCoverage(projectId, sceneId, continuityMode),
    enabled: Boolean(projectId && sceneId),
  });

  const coverage = coverageQuery.data;
  const locations = useMemo(() => coverage?.locations ?? [], [coverage]);

  const approvedFramesQuery = useQuery({
    queryKey: ['stage8-approved-frames', projectId, sceneId],
    queryFn: () => frameService.fetchFrames(projectId, sceneId),
    enabled: Boolean(projectId && sceneId && (coverage?.totals.missingImageShots || 0) > 0),
    retry: false,
  });

  const approvedFrameUrlByShotId = useMemo(() => {
    const map = new Map<string, string>();
    for (const shot of approvedFramesQuery.data?.shots ?? []) {
      if (shot.startFrame?.status === 'approved' && shot.startFrame.imageUrl) {
        map.set(shot.id, shot.startFrame.imageUrl);
      }
    }
    return map;
  }, [approvedFramesQuery.data]);

  useEffect(() => {
    if (locations.length > 0 && expandedLocations.size === 0) {
      setExpandedLocations(new Set([locations[0].location.id]));
    }
  }, [expandedLocations.size, locations]);

  const refreshCoverage = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['location-coverage', projectId, sceneId] });
  }, [projectId, sceneId, queryClient]);

  const toggleLocation = useCallback((assetId: string) => {
    setExpandedLocations(prev => {
      const next = new Set(prev);
      if (next.has(assetId)) next.delete(assetId);
      else next.add(assetId);
      return next;
    });
  }, []);

  const handleDirectionChange = useCallback(
    async (shotId: string, directionId: string | null) => {
      try {
        await locationContinuityService.assignCameraDirection(projectId, sceneId, shotId, directionId);
        queryClient.invalidateQueries({ queryKey: ['shots', projectId, sceneId] });
        refreshCoverage();
        toast.success('Direction assignment updated');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to update direction');
      }
    },
    [projectId, sceneId, queryClient, refreshCoverage]
  );

  const handleGenerateViewImage = useCallback(
    async (assetId: string, viewId: string) => {
      setGeneratingViewIds(prev => new Set(prev).add(viewId));
      try {
        const result = await projectAssetService.generateLocationViewImage(projectId, assetId, viewId);
        if (result.status === 'completed') {
          toast.success('View image generated');
          refreshCoverage();
          queryClient.invalidateQueries({ queryKey: ['location-views', projectId, assetId] });
        } else {
          toast.error('Generation failed: ' + (result.error?.message || 'Unknown error'));
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to generate view image');
      } finally {
        setGeneratingViewIds(prev => {
          const next = new Set(prev);
          next.delete(viewId);
          return next;
        });
      }
    },
    [projectId, queryClient, refreshCoverage]
  );

  const handleGenerateMissing = useCallback(
    async (summary: LocationCoverageSummary) => {
      const missingViews = summary.views.filter(view => !view.imageUrl);
      if (missingViews.length === 0) {
        toast.info('All views already have images');
        return;
      }

      for (const view of missingViews) {
        await handleGenerateViewImage(summary.location.id, view.id);
      }
    },
    [handleGenerateViewImage]
  );

  const handleCreateDefaultViews = useCallback(
    async (summary: LocationCoverageSummary) => {
      setCreatingLocationIds(prev => new Set(prev).add(summary.location.id));
      try {
        await projectAssetService.suggestDefaultViews(projectId, summary.location.id);
        toast.success('Default views created');
        refreshCoverage();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to create default views');
      } finally {
        setCreatingLocationIds(prev => {
          const next = new Set(prev);
          next.delete(summary.location.id);
          return next;
        });
      }
    },
    [projectId, refreshCoverage]
  );

  const handleCreateDirection = useCallback(
    async (summary: LocationCoverageSummary) => {
      setCreatingLocationIds(prev => new Set(prev).add(summary.location.id));
      try {
        const name = nextDirectionName(summary.views);
        const directionCount = summary.views.filter(view => view.viewType === 'direction').length;
        await projectAssetService.createLocationView(projectId, summary.location.id, {
          name,
          view_type: 'direction',
          alias: `Direction ${directionCount + 1}`,
          description: '',
          camera_distance: 'wide',
          camera_height: 'eye_level',
          is_primary: directionCount === 0,
          source: 'stage7_inferred',
        });
        toast.success('Direction view created');
        refreshCoverage();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to create direction');
      } finally {
        setCreatingLocationIds(prev => {
          const next = new Set(prev);
          next.delete(summary.location.id);
          return next;
        });
      }
    },
    [projectId, refreshCoverage]
  );

  const handleUseApprovedFrameAsView = useCallback(
    async (summary: LocationCoverageSummary, shot: LocationCoverageShot) => {
      const frameImageUrl = approvedFrameUrlByShotId.get(shot.shotId);
      if (!shot.cameraDirectionId || !frameImageUrl) {
        toast.error('This shot needs an approved frame and assigned direction first');
        return;
      }

      setEstablishingShotIds(prev => new Set(prev).add(shot.shotId));
      try {
        await projectAssetService.establishViewFromFrame(
          projectId,
          summary.location.id,
          shot.cameraDirectionId,
          {
            frameImageUrl,
            shotId: shot.shotId,
            sceneId,
          }
        );
        toast.success('Approved frame established as view');
        refreshCoverage();
        queryClient.invalidateQueries({ queryKey: ['location-views', projectId, summary.location.id] });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to establish view');
      } finally {
        setEstablishingShotIds(prev => {
          const next = new Set(prev);
          next.delete(shot.shotId);
          return next;
        });
      }
    },
    [approvedFrameUrlByShotId, projectId, sceneId, queryClient, refreshCoverage]
  );

  if (coverageQuery.isLoading) {
    return (
      <div className="border-t border-border/50 bg-card/30 px-4 py-3 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
        Loading location coverage...
      </div>
    );
  }

  if (coverageQuery.isError) {
    return (
      <div className="border-t border-border/50 bg-card/30 px-4 py-3 flex items-center gap-2 text-sm text-amber-300">
        <AlertTriangle className="w-4 h-4" />
        Location coverage could not be loaded.
      </div>
    );
  }

  if (!coverage || (locations.length === 0 && coverage.unresolvedShots.length === 0)) {
    return null;
  }

  return (
    <div className="border-t border-border/50 bg-card/30">
      <div className="px-4 py-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Camera className="w-4 h-4 text-primary shrink-0" />
          <h3 className="text-sm font-medium text-foreground">Location Coverage</h3>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="inline-flex h-7 overflow-hidden rounded-md border border-border/60 bg-muted/20">
            <button
              type="button"
              className={`px-2.5 text-xs transition-colors ${
                continuityMode === 'basic'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => updateContinuityModeMutation.mutate('basic')}
              disabled={updateContinuityModeMutation.isPending}
            >
              Basic
            </button>
            <button
              type="button"
              className={`px-2.5 text-xs transition-colors ${
                continuityMode === 'advanced'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => updateContinuityModeMutation.mutate('advanced')}
              disabled={updateContinuityModeMutation.isPending}
            >
              Advanced
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 pb-4 space-y-3">
        <CoverageSummaryStrip coverage={coverage} />

        {coverage.unresolvedShots.length > 0 && (
          <UnresolvedShots shots={coverage.unresolvedShots} />
        )}

        {locations.map(summary => {
          const isExpanded = expandedLocations.has(summary.location.id);
          const status = getCoverageStatus(summary.strength);

          return (
            <Collapsible
              key={summary.location.id}
              open={isExpanded}
              onOpenChange={() => toggleLocation(summary.location.id)}
            >
              <CollapsibleTrigger className="w-full flex items-center gap-2 px-3 py-2 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors text-left">
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                )}
                <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium flex-1 truncate">{summary.location.name}</span>
                {getStatusIcon(status)}
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {summary.matchedDirectionShots}/{summary.totalShots} matched
                </span>
              </CollapsibleTrigger>

              <CollapsibleContent className="mt-1">
                <div className="ml-5 space-y-2 py-1">
                  <LocationRiskList summary={summary} />

                  <ViewInventory
                    summary={summary}
                    generatingViewIds={generatingViewIds}
                    onGenerateView={handleGenerateViewImage}
                  />

                  <ShotAssignmentTable
                    summary={summary}
                    onDirectionChange={handleDirectionChange}
                    approvedFrameUrlByShotId={approvedFrameUrlByShotId}
                    establishingShotIds={establishingShotIds}
                    onUseApprovedFrameAsView={handleUseApprovedFrameAsView}
                  />

                  <LocationActions
                    summary={summary}
                    isCreating={creatingLocationIds.has(summary.location.id)}
                    isGenerating={summary.views.some(view => generatingViewIds.has(view.id))}
                    onCreateDefaults={handleCreateDefaultViews}
                    onCreateDirection={handleCreateDirection}
                    onGenerateMissing={handleGenerateMissing}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
}

function CoverageSummaryStrip({ coverage }: { coverage: LocationCoverageResponse }) {
  const strength = getStrengthLabel(coverage.totals.strength);

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
      <SummaryMetric label="Mode" value={coverage.continuityMode === 'advanced' ? 'Advanced' : 'Basic'} />
      <SummaryMetric label="Strength" value={strength} />
      <SummaryMetric label="Matched" value={String(coverage.totals.matchedDirectionShots)} />
      <SummaryMetric label="Fallback" value={String(coverage.totals.fallbackShots)} />
      <SummaryMetric label="Issues" value={String(coverage.totals.weakShotCount)} tone={coverage.totals.weakShotCount > 0 ? 'warning' : 'normal'} />
    </div>
  );
}

function SummaryMetric({
  label,
  value,
  tone = 'normal',
}: {
  label: string;
  value: string;
  tone?: 'normal' | 'warning';
}) {
  return (
    <div className="rounded-md border border-border/40 bg-muted/15 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-sm font-medium ${tone === 'warning' ? 'text-amber-300' : 'text-foreground'}`}>
        {value}
      </div>
    </div>
  );
}

function UnresolvedShots({ shots }: { shots: LocationCoverageShot[] }) {
  return (
    <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2">
      <div className="flex items-center gap-2 text-xs font-medium text-red-300">
        <AlertTriangle className="w-3.5 h-3.5" />
        {shots.length} shot{shots.length !== 1 ? 's' : ''} need linked locations
      </div>
      <div className="mt-1 space-y-0.5">
        {shots.slice(0, 3).map(shot => (
          <div key={shot.shotId} className="text-[11px] text-muted-foreground">
            <span className="font-mono">{shot.shotLabel}</span>
            <span className="mx-1">-</span>
            <span>{shot.setting || shot.camera || 'No setting text'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LocationRiskList({ summary }: { summary: LocationCoverageSummary }) {
  if (summary.notices.length === 0) return null;

  return (
    <div className="space-y-1">
      {summary.notices.map(notice => (
        <div
          key={notice}
          className="flex items-start gap-2 rounded bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 text-xs text-amber-200"
        >
          <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
          <span>{notice}</span>
        </div>
      ))}
    </div>
  );
}

function ViewInventory({
  summary,
  generatingViewIds,
  onGenerateView,
}: {
  summary: LocationCoverageSummary;
  generatingViewIds: Set<string>;
  onGenerateView: (assetId: string, viewId: string) => void;
}) {
  if (summary.views.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border/50 bg-muted/10 px-3 py-3 text-xs text-muted-foreground">
        No direction inventory yet.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
      {summary.views.map(view => {
        const isGenerating = generatingViewIds.has(view.id);
        const label = getDirectionLabel(view);

        return (
          <div
            key={view.id}
            className="flex items-center gap-2 px-3 py-1.5 text-xs rounded bg-muted/20"
          >
            {view.imageUrl ? (
              <div className="w-7 h-7 rounded overflow-hidden shrink-0 border border-border/50">
                <img src={view.imageUrl} alt={label} className="w-full h-full object-cover" />
              </div>
            ) : isGenerating ? (
              <div className="w-7 h-7 rounded shrink-0 border border-blue-500/30 flex items-center justify-center">
                <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />
              </div>
            ) : (
              <div className="w-7 h-7 rounded shrink-0 border border-dashed border-border/50 flex items-center justify-center">
                {view.viewType === 'establishing' ? (
                  <Eye className="w-3 h-3 text-muted-foreground/60" />
                ) : (
                  <ImageIcon className="w-3 h-3 text-muted-foreground/60" />
                )}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="capitalize font-medium truncate">{label}</div>
              <div className="text-[10px] text-muted-foreground">
                {view.viewType === 'establishing' ? 'Establishing' : `${view.shotCount ?? 0} shot${(view.shotCount ?? 0) === 1 ? '' : 's'}`}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {!view.imageUrl && !isGenerating && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => onGenerateView(summary.location.id, view.id)}
                      className="inline-flex items-center justify-center w-6 h-6 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Sparkles className="w-3 h-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="text-xs">Generate view image</TooltipContent>
                </Tooltip>
              )}
              {getSourceBadge(view.source)}
              {view.imageUrl ? (
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              ) : isGenerating ? (
                <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />
              ) : (
                <AlertTriangle className="w-3 h-3 text-amber-400" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ShotAssignmentTable({
  summary,
  onDirectionChange,
  approvedFrameUrlByShotId,
  establishingShotIds,
  onUseApprovedFrameAsView,
}: {
  summary: LocationCoverageSummary;
  onDirectionChange: (shotId: string, directionId: string | null) => void;
  approvedFrameUrlByShotId: Map<string, string>;
  establishingShotIds: Set<string>;
  onUseApprovedFrameAsView: (summary: LocationCoverageSummary, shot: LocationCoverageShot) => void;
}) {
  if (summary.shots.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border/50 bg-muted/10 px-3 py-3 text-xs text-muted-foreground">
        No shots are canonically linked to this location yet.
      </div>
    );
  }

  const directions = summary.views.filter(view => view.viewType === 'direction');

  return (
    <div className="space-y-1">
      {summary.shots.map(shot => (
        <ShotDirectionAssignment
          key={shot.shotId}
          shot={shot}
          directions={directions}
          onDirectionChange={onDirectionChange}
          approvedFrameUrl={approvedFrameUrlByShotId.get(shot.shotId)}
          isEstablishingView={establishingShotIds.has(shot.shotId)}
          onUseApprovedFrameAsView={() => onUseApprovedFrameAsView(summary, shot)}
        />
      ))}
    </div>
  );
}

function ShotDirectionAssignment({
  shot,
  directions,
  onDirectionChange,
  approvedFrameUrl,
  isEstablishingView,
  onUseApprovedFrameAsView,
}: {
  shot: LocationCoverageShot;
  directions: LocationViewSummary[];
  onDirectionChange: (shotId: string, directionId: string | null) => void;
  approvedFrameUrl?: string;
  isEstablishingView: boolean;
  onUseApprovedFrameAsView: () => void;
}) {
  const isWeak = shot.coverageState !== 'matched_view';
  const canUseApprovedFrame =
    !!approvedFrameUrl &&
    !!shot.cameraDirectionId &&
    shot.coverageState === 'missing_view_image';

  return (
    <div className={`grid grid-cols-[4.5rem_minmax(0,1fr)_10rem] gap-2 items-center px-2 py-1.5 text-[11px] rounded ${
      isWeak ? 'bg-amber-500/10 border border-amber-500/15' : 'bg-muted/10'
    }`}>
      <span className="font-mono text-muted-foreground truncate">{shot.shotLabel}</span>
      <div className="min-w-0">
        <div className="truncate text-muted-foreground">{shot.camera || shot.setting || 'No camera text'}</div>
        {shot.fallbackLabel && (
          <div className="truncate text-[10px] text-amber-300">fallback: {shot.fallbackLabel}</div>
        )}
      </div>
      <div className="flex items-center gap-1">
        {canUseApprovedFrame && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onUseApprovedFrameAsView}
                disabled={isEstablishingView}
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded border border-border/40 bg-muted/20 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
              >
                {isEstablishingView ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <ImageIcon className="w-3 h-3" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="text-xs">Use approved frame as view</TooltipContent>
          </Tooltip>
        )}
        <Select
          value={shot.cameraDirectionId ?? CLEAR_DIRECTION_VALUE}
          onValueChange={value => onDirectionChange(shot.shotId, value === CLEAR_DIRECTION_VALUE ? null : value)}
        >
          <SelectTrigger className="h-7 min-w-0 flex-1 text-[11px] border-border/30">
            <SelectValue placeholder="Assign..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={CLEAR_DIRECTION_VALUE}>Unassigned</SelectItem>
            {directions.map(direction => (
              <SelectItem key={direction.id} value={direction.id}>
                {getDirectionLabel(direction)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function LocationActions({
  summary,
  isCreating,
  isGenerating,
  onCreateDefaults,
  onCreateDirection,
  onGenerateMissing,
}: {
  summary: LocationCoverageSummary;
  isCreating: boolean;
  isGenerating: boolean;
  onCreateDefaults: (summary: LocationCoverageSummary) => void;
  onCreateDirection: (summary: LocationCoverageSummary) => void;
  onGenerateMissing: (summary: LocationCoverageSummary) => void;
}) {
  const missingCount = summary.views.filter(view => !view.imageUrl).length;

  return (
    <div className="pt-2 border-t border-border/20 flex flex-wrap gap-2">
      {summary.views.length === 0 ? (
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => onCreateDefaults(summary)}
          disabled={isCreating}
        >
          {isCreating ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Plus className="w-3 h-3 mr-1" />}
          Create Default Views
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => onCreateDirection(summary)}
          disabled={isCreating}
        >
          {isCreating ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Plus className="w-3 h-3 mr-1" />}
          Add Direction
        </Button>
      )}

      {missingCount > 0 && (
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => onGenerateMissing(summary)}
          disabled={isGenerating}
        >
          {isGenerating ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
          Generate Missing ({missingCount})
        </Button>
      )}
    </div>
  );
}
