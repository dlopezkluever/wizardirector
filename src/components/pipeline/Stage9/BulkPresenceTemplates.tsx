/**
 * BulkPresenceTemplates — Scene-level templates for common assignment patterns.
 * Allows users to quickly re-assign all assets in a scene using predefined patterns.
 */

import { useState, useCallback } from 'react';
import { Wand2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { shotAssetAssignmentService } from '@/lib/services/shotAssetAssignmentService';
import { matchAssetToShots, type MatchableAsset } from '@/lib/utils/shotAssetMatcher';
import type { SceneAssetInstance, Shot, PresenceType } from '@/types/scene';

export type TemplateId = 'all-throughout' | 'match-characters' | 'locations-throughout';

interface BulkPresenceTemplatesProps {
  projectId: string;
  sceneId: string;
  sceneAssets: SceneAssetInstance[];
  shots: Shot[];
  onApplied: () => void;
}

const TEMPLATE_LABELS: Record<TemplateId, string> = {
  'all-throughout': 'All Throughout',
  'match-characters': 'Match Shot Characters',
  'locations-throughout': 'Locations Throughout',
};

const TEMPLATE_DESCRIPTIONS: Record<TemplateId, string> = {
  'all-throughout': 'Every asset appears in every shot as "Throughout"',
  'match-characters': 'Characters matched to shots by name, locations throughout, props unassigned',
  'locations-throughout': 'Locations appear throughout all shots, characters/props unassigned',
};

/**
 * Build assignment rows for a given template.
 * Returns { shotId, instanceId, presenceType } tuples ready for the API.
 */
export function buildTemplateAssignments(
  templateId: TemplateId,
  sceneAssets: SceneAssetInstance[],
  shots: Shot[]
): { shotId: string; instanceId: string; presenceType: PresenceType }[] {
  const assignments: { shotId: string; instanceId: string; presenceType: PresenceType }[] = [];

  switch (templateId) {
    case 'all-throughout':
      // Every asset × every shot = throughout
      for (const asset of sceneAssets) {
        for (const shot of shots) {
          assignments.push({ shotId: shot.id, instanceId: asset.id, presenceType: 'throughout' });
        }
      }
      break;

    case 'match-characters': {
      // Characters: matched via heuristic, locations: throughout all shots, props: unassigned
      for (const asset of sceneAssets) {
        const assetType = asset.project_asset?.asset_type;
        if (assetType === 'character') {
          const matchable: MatchableAsset = {
            name: asset.project_asset?.name || '',
            asset_type: 'character',
            description: asset.project_asset?.description,
          };
          const results = matchAssetToShots(matchable, shots);
          for (const r of results) {
            if (r.matched) {
              assignments.push({ shotId: r.shotId, instanceId: asset.id, presenceType: 'throughout' });
            }
          }
        } else if (assetType === 'location') {
          for (const shot of shots) {
            assignments.push({ shotId: shot.id, instanceId: asset.id, presenceType: 'throughout' });
          }
        }
        // props: intentionally unassigned
      }
      break;
    }

    case 'locations-throughout': {
      // Locations: throughout all shots, characters/props: unassigned
      for (const asset of sceneAssets) {
        if (asset.project_asset?.asset_type === 'location') {
          for (const shot of shots) {
            assignments.push({ shotId: shot.id, instanceId: asset.id, presenceType: 'throughout' });
          }
        }
      }
      break;
    }
  }

  return assignments;
}

export function BulkPresenceTemplates({
  projectId,
  sceneId,
  sceneAssets,
  shots,
  onApplied,
}: BulkPresenceTemplatesProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId | ''>('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const handleApply = useCallback(async () => {
    if (!selectedTemplate) return;
    setIsApplying(true);
    try {
      // 1. Delete all existing assignments
      await shotAssetAssignmentService.deleteAllForScene(projectId, sceneId);

      // 2. Build new assignments from template
      const newAssignments = buildTemplateAssignments(selectedTemplate, sceneAssets, shots);

      // 3. Create new assignments (if any)
      if (newAssignments.length > 0) {
        await shotAssetAssignmentService.createAssignments(projectId, sceneId, newAssignments);
      }

      onApplied();
    } catch (err) {
      console.error('Failed to apply template:', err);
    } finally {
      setIsApplying(false);
      setShowConfirm(false);
    }
  }, [selectedTemplate, projectId, sceneId, sceneAssets, shots, onApplied]);

  if (sceneAssets.length === 0 || shots.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <Select value={selectedTemplate} onValueChange={(v) => setSelectedTemplate(v as TemplateId)}>
        <SelectTrigger className="h-7 w-[180px] text-xs">
          <SelectValue placeholder="Bulk template..." />
        </SelectTrigger>
        <SelectContent>
          {(Object.entries(TEMPLATE_LABELS) as [TemplateId, string][]).map(([id, label]) => (
            <SelectItem key={id} value={id} className="text-xs">
              <div>
                <div>{label}</div>
                <div className="text-[10px] text-muted-foreground">{TEMPLATE_DESCRIPTIONS[id]}</div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        size="sm"
        className="h-7 text-xs"
        disabled={!selectedTemplate || isApplying}
        onClick={() => setShowConfirm(true)}
      >
        {isApplying ? (
          <Loader2 className="w-3 h-3 animate-spin mr-1" />
        ) : (
          <Wand2 className="w-3 h-3 mr-1" />
        )}
        Apply
      </Button>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply Bulk Template?</AlertDialogTitle>
            <AlertDialogDescription>
              This will <strong>replace all existing shot assignments</strong> in this scene with the &ldquo;{selectedTemplate ? TEMPLATE_LABELS[selectedTemplate] : ''}&rdquo; template. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isApplying}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApply} disabled={isApplying}>
              {isApplying && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Apply Template
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
