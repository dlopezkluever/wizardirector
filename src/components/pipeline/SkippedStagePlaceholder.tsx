import { SkipForward, Sparkles, PenLine, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SkippedStagePlaceholderProps {
  stageNumber: number;
  stageLabel: string;
  onGenerateFromScript: () => void;
  onWriteMyself: () => void;
  isGenerating?: boolean;
  isSwitchingToManual?: boolean;
  /** Backfill-from-script only exists for stages 2 and 3 — Stage 4 (the script
   * itself) has nothing later to generate from, so it only offers manual entry. */
  allowGenerate?: boolean;
}

/**
 * Third render mode for a Phase A stage — distinct from both the active
 * editor and the locked read-only view. Shown when a stage's latest
 * stage_states row has status 'skipped' (spec §2.3).
 */
export function SkippedStagePlaceholder({
  stageNumber,
  stageLabel,
  onGenerateFromScript,
  onWriteMyself,
  isGenerating = false,
  isSwitchingToManual = false,
  allowGenerate = true,
}: SkippedStagePlaceholderProps) {
  const busy = isGenerating || isSwitchingToManual;

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="max-w-md w-full text-center space-y-6">
        <div className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium mx-auto',
          'bg-slate-500/20 text-slate-400 border border-slate-500/30'
        )}>
          <SkipForward className="w-3 h-3" />
          SKIPPED
        </div>

        <div>
          <h2 className="text-lg font-semibold">
            Stage {stageNumber} — {stageLabel} was skipped
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Streamline determined your uploaded material already earned you a later stage,
            so this one was intentionally passed over. You can generate it from your script
            or write it yourself.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {allowGenerate && (
            <Button onClick={onGenerateFromScript} disabled={busy} variant="gold">
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Generate this now
            </Button>
          )}
          <Button onClick={onWriteMyself} disabled={busy} variant="outline">
            {isSwitchingToManual ? <Loader2 className="w-4 h-4 animate-spin" /> : <PenLine className="w-4 h-4" />}
            Write this myself
          </Button>
        </div>
      </div>
    </div>
  );
}
