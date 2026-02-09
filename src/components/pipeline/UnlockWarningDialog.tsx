import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Unlock, Loader2 } from 'lucide-react';
import type { UnlockImpact } from '@/lib/services/sceneStageLockService';

interface UnlockWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  impact: UnlockImpact | null;
  stageNumber: number;
  stageTitle: string;
  onConfirm: () => void;
  isConfirming?: boolean;
}

const STAGE_NAMES: Record<number, string> = {
  1: 'Input',
  2: 'Treatment',
  3: 'Beat Sheet',
  4: 'Master Script',
  5: 'Assets',
  7: 'Shot List',
  8: 'Visual Definition',
  9: 'Prompt Segmentation',
  10: 'Frame Generation',
  11: 'Confirmation',
  12: 'Video Generation',
};

export function UnlockWarningDialog({
  open,
  onOpenChange,
  impact,
  stageNumber,
  stageTitle,
  onConfirm,
  isConfirming,
}: UnlockWarningDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            Unlock Stage {stageNumber}: {stageTitle}?
          </DialogTitle>
          <DialogDescription>
            Unlocking this stage will allow you to make changes, but may affect downstream work.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {impact && impact.downstreamStages.length > 0 && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
              <p className="font-medium text-amber-400 mb-1">
                Downstream stages will be marked as outdated:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                {impact.downstreamStages.map((s) => (
                  <li key={s}>
                    Stage {s}: {STAGE_NAMES[s] || `Stage ${s}`}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {impact && (impact.framesAffected > 0 || impact.videosAffected > 0) && (
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm space-y-1">
              {impact.framesAffected > 0 && (
                <p className="text-muted-foreground">
                  {impact.framesAffected} frame{impact.framesAffected !== 1 ? 's' : ''} may need regeneration
                </p>
              )}
              {impact.videosAffected > 0 && (
                <p className="text-muted-foreground">
                  {impact.videosAffected} video{impact.videosAffected !== 1 ? 's' : ''} may need regeneration
                </p>
              )}
              {parseFloat(impact.estimatedCost) > 0 && (
                <p className="font-medium text-foreground">
                  Estimated regeneration cost: ${impact.estimatedCost}
                </p>
              )}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Data will NOT be deleted. Downstream stages can be re-locked once you're done editing.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isConfirming}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isConfirming}>
            {isConfirming ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Unlock className="w-4 h-4" />
            )}
            Unlock & Edit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
