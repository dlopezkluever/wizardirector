import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export interface StructuralCascadeItem {
  fileName: string;
  diffSummary: string;
}

interface StructuralCascadeConfirmDialogProps {
  open: boolean;
  items: StructuralCascadeItem[];
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Structural-cascade answers get their own inline confirmation at resolution
 * time (spec §2.9.3) — a plot-affecting answer that rewrites a larger section
 * is disclosed before it's applied, not just line-itemed on the final review screen.
 */
export function StructuralCascadeConfirmDialog({ open, items, onConfirm, onCancel }: StructuralCascadeConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onCancel(); }}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            <DialogTitle>This answer affects the plot</DialogTitle>
          </div>
          <DialogDescription>
            Applying it will rewrite the following section(s) of your submitted material, not just fix a name or add a detail. Review before proceeding.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          {items.map((item, i) => (
            <div key={i} className="text-sm rounded-lg border border-warning/30 bg-warning/10 px-3 py-2">
              <p className="font-medium text-foreground">{item.fileName}</p>
              <p className="text-muted-foreground">{item.diffSummary}</p>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button variant="gold" onClick={onConfirm}>Apply and continue</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
