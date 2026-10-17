import { Loader2, Sparkles, FileText, AlertTriangle, PenLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { StreamlineFile } from './StreamlineDropZone';

export interface StreamlineRoutingSummary {
  /** Human-readable lines describing what will happen — "Stage 4 will be filled from script.pdf", "Stages 2/3 skipped", etc. */
  lines: string[];
  /** Free-form credit estimate line. Phase 2: extraction/classification only, always free. Phase 3/4 attach real numbers as those costs become known. */
  creditEstimate: string;
  canConfirm: boolean;
  blockedReason?: string;
}

export interface StreamlineEditSummary {
  fileName: string;
  diffSummary: string;
}

interface StreamlineReviewScreenProps {
  files: StreamlineFile[];
  routing: StreamlineRoutingSummary;
  onConfirm: () => void;
  isCommitting?: boolean;
  /** Ask Auteur's edit summaries (Task 4.5) — "as-is" and "touched by Ask Auteur" are independent axes, so this is its own section, distinct from the SKIPPED/IMPORTED/AUTO-FILLED badge row above. */
  editSummaries?: StreamlineEditSummary[];
  /** Extension point for later phases. */
  children?: React.ReactNode;
}

/**
 * Pre-commit summary screen (spec Task 2.3) — a container other phases add
 * sections to, not a one-shot component. Phase 2 shows per-file status and a
 * routing preview computed from what's classified so far; Phase 3 makes that
 * preview span every stage 2-5, Phase 4 appends the Ask Auteur edit summary.
 */
export function StreamlineReviewScreen({ files, routing, onConfirm, isCommitting, editSummaries, children }: StreamlineReviewScreenProps) {
  const successFiles = files.filter(f => f.status === 'success');
  const errorFiles = files.filter(f => f.status === 'error');

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="font-display text-lg font-semibold text-foreground">Review before we commit</h3>
        <p className="text-sm text-muted-foreground">Nothing writes to your project until you confirm.</p>
      </div>

      <div className="space-y-2">
        {successFiles.map(f => (
          <div key={f.id} className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-card border border-border text-sm">
            <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="font-medium text-foreground truncate">{f.name}</span>
            {f.isPrimary && <span className="text-xs text-primary shrink-0">Primary</span>}
            <span className="ml-auto text-xs text-muted-foreground shrink-0">
              {f.classification && f.classification.confidence > 0
                ? `${Math.round(f.classification.confidence * 100)}% confident: ${f.classification.type.replace('_', ' ')}`
                : f.classification?.type ?? 'Unclassified'}
            </span>
          </div>
        ))}
        {errorFiles.length > 0 && (
          <div className="flex items-start gap-2 px-4 py-2.5 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{errorFiles.length} file(s) failed to extract and won't be included — you can still proceed with the rest.</span>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-2">
        <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          What happens next
        </h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          {routing.lines.map((line, i) => (
            <li key={i}>• {line}</li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground pt-1 border-t border-border/50">{routing.creditEstimate}</p>
      </div>

      {editSummaries && editSummaries.length > 0 && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-2">
          <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
            <PenLine className="w-4 h-4 text-primary" />
            {editSummaries.length} edit{editSummaries.length === 1 ? '' : 's'} applied from your answers
          </h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            {editSummaries.map((edit, i) => (
              <li key={i}>• <span className="text-foreground">{edit.fileName}</span> — {edit.diffSummary}</li>
            ))}
          </ul>
        </div>
      )}

      {children}

      {routing.blockedReason && (
        <p className="text-sm text-warning">{routing.blockedReason}</p>
      )}

      <div className="flex justify-end">
        <Button
          variant="gold"
          size="lg"
          disabled={!routing.canConfirm || isCommitting}
          onClick={onConfirm}
          className="min-w-[200px]"
        >
          {isCommitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {isCommitting ? 'Processing...' : 'Confirm & Skip Ahead'}
        </Button>
      </div>
    </div>
  );
}
