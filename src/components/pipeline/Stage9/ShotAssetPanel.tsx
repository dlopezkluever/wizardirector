/**
 * ShotAssetPanel — Per-shot asset assignment panel for Stage 9.
 * Lists assigned assets with presence_type dropdowns, add/remove controls.
 */

import { useState, useCallback } from 'react';
import { Users, MapPin, Package, Plus, Trash2, Loader2, AlertTriangle, Info, Scissors, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { shotAssetAssignmentService } from '@/lib/services/shotAssetAssignmentService';
import { shotService } from '@/lib/services/shotService';
import { cn } from '@/lib/utils';
import type { ShotAssetAssignment, PresenceType, ContinuityMode, SceneAssetInstance } from '@/types/scene';

const PRESENCE_LABELS: Record<PresenceType, string> = {
  throughout: 'Throughout',
  enters: 'Enters',
  exits: 'Exits',
  passes_through: 'Passes Through',
};

const typeIcons: Record<string, typeof Users> = {
  character: Users,
  location: MapPin,
  prop: Package,
};

interface ShotAssetPanelProps {
  projectId: string;
  sceneId: string;
  shotId: string;
  shotLabel: string;
  assignments: ShotAssetAssignment[];
  sceneAssets: SceneAssetInstance[];
  onAssignmentsChanged: () => void;
  /** Start-frame continuity mode for this shot (from prompt set). */
  startContinuity?: ContinuityMode;
  /** Called after a shot split to refresh the shot list. */
  onShotSplit?: () => void;
}

export function ShotAssetPanel({
  projectId,
  sceneId,
  shotId,
  shotLabel,
  assignments,
  sceneAssets,
  onAssignmentsChanged,
  startContinuity,
  onShotSplit,
}: ShotAssetPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [removeConfirmId, setRemoveConfirmId] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [addPickerOpen, setAddPickerOpen] = useState(false);
  const [isSplitting, setIsSplitting] = useState(false);
  const [showSplitConfirm, setShowSplitConfirm] = useState(false);

  const hasPassesThrough = assignments.some(a => a.presence_type === 'passes_through');

  const handleSplitShot = useCallback(async () => {
    setIsSplitting(true);
    try {
      await shotService.splitShot(projectId, sceneId, shotId);
      onAssignmentsChanged();
      onShotSplit?.();
    } catch (err) {
      console.error('Failed to split shot:', err);
    } finally {
      setIsSplitting(false);
      setShowSplitConfirm(false);
    }
  }, [projectId, sceneId, shotId, onAssignmentsChanged, onShotSplit]);

  // Assets not yet assigned to this shot
  const assignedInstanceIds = new Set(assignments.map(a => a.scene_asset_instance_id));
  const unassignedAssets = sceneAssets.filter(sa => !assignedInstanceIds.has(sa.id));

  const handlePresenceChange = useCallback(async (assignmentId: string, presenceType: PresenceType) => {
    setUpdatingId(assignmentId);
    try {
      await shotAssetAssignmentService.updateAssignment(projectId, sceneId, assignmentId, presenceType);
      onAssignmentsChanged();
    } catch (err) {
      console.error('Failed to update presence type:', err);
    } finally {
      setUpdatingId(null);
    }
  }, [projectId, sceneId, onAssignmentsChanged]);

  const handleRemove = useCallback(async () => {
    if (!removeConfirmId) return;
    setIsRemoving(true);
    try {
      await shotAssetAssignmentService.deleteAssignment(projectId, sceneId, removeConfirmId);
      onAssignmentsChanged();
    } catch (err) {
      console.error('Failed to remove assignment:', err);
    } finally {
      setIsRemoving(false);
      setRemoveConfirmId(null);
    }
  }, [projectId, sceneId, removeConfirmId, onAssignmentsChanged]);

  const handleAddAsset = useCallback(async (instanceId: string) => {
    setIsAdding(true);
    try {
      await shotAssetAssignmentService.createAssignments(projectId, sceneId, [
        { shotId, instanceId, presenceType: 'throughout' },
      ]);
      onAssignmentsChanged();
      setAddPickerOpen(false);
    } catch (err) {
      console.error('Failed to add asset to shot:', err);
    } finally {
      setIsAdding(false);
    }
  }, [projectId, sceneId, shotId, onAssignmentsChanged]);

  return (
    <div className="rounded-lg border border-border/30 bg-muted/10">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-muted/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          )}
          <span className="font-medium">Assets</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {assignments.length}
          </Badge>
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-1.5">
          {assignments.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2 text-center">No assets assigned to this shot.</p>
          ) : (
            assignments.map(assignment => {
              const instance = assignment.scene_asset_instance;
              const assetType = instance?.project_asset?.asset_type || 'prop';
              const Icon = typeIcons[assetType] || Package;
              const assetName = instance?.project_asset?.name || 'Unknown';
              const isPassThrough = assignment.presence_type === 'passes_through';

              return (
                <div
                  key={assignment.id}
                  className={cn(
                    'flex items-center gap-2 p-2 rounded-md border text-xs',
                    isPassThrough ? 'border-amber-500/30 bg-amber-500/5' : 'border-border/20 bg-background/50'
                  )}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                  <span className="font-medium truncate flex-1 min-w-0">{assetName}</span>
                  <Select
                    value={assignment.presence_type}
                    onValueChange={(val) => handlePresenceChange(assignment.id, val as PresenceType)}
                    disabled={updatingId === assignment.id}
                  >
                    <SelectTrigger className="h-6 w-[120px] text-[10px] px-2">
                      {updatingId === assignment.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <SelectValue />
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.entries(PRESENCE_LABELS) as [PresenceType, string][]).map(([val, label]) => (
                        <SelectItem key={val} value={val} className="text-xs">
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => setRemoveConfirmId(assignment.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              );
            })
          )}

          {/* Passes-through warning + split button */}
          {hasPassesThrough && (
            <div className="flex items-start gap-1.5 p-2 rounded-md bg-amber-500/10 text-amber-400 text-[10px]">
              <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span>
                  &ldquo;Passes Through&rdquo; assets won&apos;t appear in start or end frame images. Visual accuracy depends on the video model.
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-1.5 h-6 text-[10px] border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                  disabled={isSplitting}
                  onClick={(e) => { e.stopPropagation(); setShowSplitConfirm(true); }}
                >
                  {isSplitting ? (
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  ) : (
                    <Scissors className="w-3 h-3 mr-1" />
                  )}
                  Split Shot
                </Button>
              </div>
            </div>
          )}

          {/* Continuity + enters info banner */}
          {startContinuity === 'match' && assignments.some(a => a.presence_type === 'enters') && (
            <div className="flex items-start gap-1.5 p-2 rounded-md bg-blue-500/10 text-blue-400 text-[10px]">
              <Info className="w-3 h-3 shrink-0 mt-0.5" />
              <span>
                &ldquo;Enters&rdquo; means the reference image is excluded from the <strong>start frame</strong> (which copies the previous shot&apos;s end frame for continuity). The asset may still be <em>visible</em> in the start frame via the continuity match.
              </span>
            </div>
          )}

          {/* Add asset button */}
          {unassignedAssets.length > 0 && (
            <Popover open={addPickerOpen} onOpenChange={setAddPickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full h-7 text-xs text-muted-foreground">
                  <Plus className="w-3 h-3 mr-1" />
                  Add Asset
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-1" align="start">
                <div className="max-h-48 overflow-y-auto">
                  {unassignedAssets.map(sa => {
                    const Icon = typeIcons[sa.project_asset?.asset_type || 'prop'] || Package;
                    return (
                      <button
                        key={sa.id}
                        className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded hover:bg-muted/50 transition-colors text-left"
                        onClick={() => handleAddAsset(sa.id)}
                        disabled={isAdding}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate">{sa.project_asset?.name || 'Unknown'}</span>
                      </button>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      )}

      {/* Remove confirmation */}
      <AlertDialog open={!!removeConfirmId} onOpenChange={(open) => !open && setRemoveConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove asset from shot?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the asset from Shot {shotLabel}. You can re-add it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove} disabled={isRemoving}>
              {isRemoving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Split confirmation */}
      <AlertDialog open={showSplitConfirm} onOpenChange={setShowSplitConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Split Shot {shotLabel}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will split the shot into two sub-shots using AI. Asset assignments will be cloned to both new shots. This helps handle &ldquo;Passes Through&rdquo; assets by giving each sub-shot clearer enter/exit boundaries.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSplitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSplitShot} disabled={isSplitting}>
              {isSplitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Scissors className="w-4 h-4 mr-1" />}
              Split Shot
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
