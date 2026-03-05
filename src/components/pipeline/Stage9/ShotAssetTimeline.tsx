/**
 * ShotAssetTimeline — Matrix view for shot × asset presence.
 * Shots as columns, assets as rows, color-coded presence cells.
 * Click cell to cycle presence type or create/remove assignments.
 */

import { useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { shotAssetAssignmentService } from '@/lib/services/shotAssetAssignmentService';
import { cn } from '@/lib/utils';
import type { ShotAssetAssignment, PresenceType, SceneAssetInstance, PromptSet } from '@/types/scene';

interface ShotAssetTimelineProps {
  projectId: string;
  sceneId: string;
  promptSets: PromptSet[];
  assignments: ShotAssetAssignment[];
  sceneAssets: SceneAssetInstance[];
  onAssignmentsChanged: () => void;
}

const PRESENCE_CYCLE: (PresenceType | null)[] = [null, 'throughout', 'enters', 'exits', 'passes_through'];

const PRESENCE_COLORS: Record<PresenceType, string> = {
  throughout: 'bg-blue-500/40 border-blue-500/60 hover:bg-blue-500/50',
  enters: 'bg-emerald-500/40 border-emerald-500/60 hover:bg-emerald-500/50',
  exits: 'bg-red-500/40 border-red-500/60 hover:bg-red-500/50',
  passes_through: 'bg-amber-500/30 border-amber-500/50 border-dashed hover:bg-amber-500/40',
};

const PRESENCE_LABELS: Record<PresenceType, string> = {
  throughout: 'T',
  enters: 'E',
  exits: 'X',
  passes_through: 'P',
};

const PRESENCE_FULL_LABELS: Record<PresenceType, string> = {
  throughout: 'Throughout',
  enters: 'Enters',
  exits: 'Exits',
  passes_through: 'Passes Through',
};

export function ShotAssetTimeline({
  projectId,
  sceneId,
  promptSets,
  assignments,
  sceneAssets,
  onAssignmentsChanged,
}: ShotAssetTimelineProps) {
  const [updatingCell, setUpdatingCell] = useState<string | null>(null);

  // Build a lookup: `${shotUuid}:${instanceId}` → assignment
  const assignmentMap = new Map<string, ShotAssetAssignment>();
  for (const a of assignments) {
    assignmentMap.set(`${a.shot_id}:${a.scene_asset_instance_id}`, a);
  }

  // Get shots from prompt sets (with UUIDs)
  const shotsWithUuid = promptSets.filter(ps => ps.shotUuid);

  const handleCellClick = useCallback(async (shotUuid: string, instanceId: string) => {
    const key = `${shotUuid}:${instanceId}`;
    setUpdatingCell(key);

    try {
      const existing = assignmentMap.get(key);

      if (!existing) {
        // No assignment → create as 'throughout'
        await shotAssetAssignmentService.createAssignments(projectId, sceneId, [
          { shotId: shotUuid, instanceId, presenceType: 'throughout' },
        ]);
      } else {
        // Cycle through presence types
        const currentIndex = PRESENCE_CYCLE.indexOf(existing.presence_type);
        const nextIndex = (currentIndex + 1) % PRESENCE_CYCLE.length;
        const nextPresence = PRESENCE_CYCLE[nextIndex];

        if (nextPresence === null) {
          // Cycle back to null = delete
          await shotAssetAssignmentService.deleteAssignment(projectId, sceneId, existing.id);
        } else {
          await shotAssetAssignmentService.updateAssignment(projectId, sceneId, existing.id, nextPresence);
        }
      }

      onAssignmentsChanged();
    } catch (err) {
      console.error('Failed to update assignment:', err);
    } finally {
      setUpdatingCell(null);
    }
  }, [projectId, sceneId, assignmentMap, onAssignmentsChanged]);

  if (shotsWithUuid.length === 0 || sceneAssets.length === 0) {
    return (
      <div className="text-xs text-muted-foreground text-center py-4">
        No shots or assets to display in timeline.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Matrix */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-background text-left px-2 py-1.5 border-b border-r border-border/30 min-w-[140px]">
                Asset
              </th>
              {shotsWithUuid.map(ps => (
                <th
                  key={ps.shotId}
                  className="px-2 py-1.5 border-b border-border/30 text-center whitespace-nowrap font-medium"
                >
                  {ps.shotId}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sceneAssets.map(asset => {
              const assetType = asset.project_asset?.asset_type || 'prop';
              const assetName = asset.project_asset?.name || 'Unknown';

              return (
                <tr key={asset.id}>
                  <td className="sticky left-0 z-10 bg-background px-2 py-1 border-r border-border/30 truncate max-w-[140px]">
                    <div className="flex items-center gap-1.5">
                      <span className={cn(
                        'w-2 h-2 rounded-full shrink-0',
                        assetType === 'character' ? 'bg-blue-500' :
                        assetType === 'location' ? 'bg-purple-500' :
                        'bg-green-500'
                      )} />
                      <span className="truncate">{assetName}</span>
                    </div>
                  </td>
                  {shotsWithUuid.map(ps => {
                    const key = `${ps.shotUuid}:${asset.id}`;
                    const assignment = assignmentMap.get(key);
                    const isUpdating = updatingCell === key;
                    const presence = assignment?.presence_type;

                    return (
                      <td key={ps.shotId} className="px-1 py-1 text-center">
                        <button
                          className={cn(
                            'w-full h-7 rounded border text-[10px] font-medium transition-colors',
                            presence ? PRESENCE_COLORS[presence] : 'bg-muted/20 border-border/20 hover:bg-muted/30 text-muted-foreground/50'
                          )}
                          onClick={() => ps.shotUuid && handleCellClick(ps.shotUuid, asset.id)}
                          disabled={isUpdating || !ps.shotUuid}
                          title={presence ? PRESENCE_FULL_LABELS[presence] : 'No assignment (click to add)'}
                        >
                          {isUpdating ? (
                            <Loader2 className="w-3 h-3 animate-spin mx-auto" />
                          ) : (
                            presence ? PRESENCE_LABELS[presence] : '—'
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-muted-foreground px-2">
        <span className="font-medium">Legend:</span>
        <div className="flex items-center gap-1">
          <span className="w-4 h-4 rounded bg-blue-500/40 border border-blue-500/60 inline-flex items-center justify-center text-[9px] font-medium">T</span>
          <span>Throughout</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-4 h-4 rounded bg-emerald-500/40 border border-emerald-500/60 inline-flex items-center justify-center text-[9px] font-medium">E</span>
          <span>Enters</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-4 h-4 rounded bg-red-500/40 border border-red-500/60 inline-flex items-center justify-center text-[9px] font-medium">X</span>
          <span>Exits</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-4 h-4 rounded bg-amber-500/30 border border-amber-500/50 border-dashed inline-flex items-center justify-center text-[9px] font-medium">P</span>
          <span>Passes Through</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-4 h-4 rounded bg-muted/20 border border-border/20 inline-flex items-center justify-center text-[9px] text-muted-foreground/50">—</span>
          <span>None</span>
        </div>
      </div>
    </div>
  );
}
