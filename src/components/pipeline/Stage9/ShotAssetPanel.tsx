/**
 * ShotAssetPanel — Per-shot asset assignment panel for Stage 9.
 * Lists assigned assets with presence_type dropdowns, add/remove controls.
 */

import { useState, useCallback } from 'react';
import { Users, MapPin, Package, Plus, Trash2, Loader2, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import type { ShotAssetAssignment, PresenceType, SceneAssetInstance } from '@/types/scene';

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
}

export function ShotAssetPanel({
  projectId,
  sceneId,
  shotId,
  shotLabel,
  assignments,
  sceneAssets,
  onAssignmentsChanged,
}: ShotAssetPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [removeConfirmId, setRemoveConfirmId] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [addPickerOpen, setAddPickerOpen] = useState(false);

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
              const assetType = instance?.project_asset?.type || 'prop';
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

          {/* Passes-through warning */}
          {assignments.some(a => a.presence_type === 'passes_through') && (
            <div className="flex items-start gap-1.5 p-2 rounded-md bg-amber-500/10 text-amber-400 text-[10px]">
              <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
              <span>
                &ldquo;Passes Through&rdquo; assets won&apos;t appear in start or end frame images. Visual accuracy depends on the video model.
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
    </div>
  );
}
