import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  Lock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Unlock,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LockedStageHeaderProps {
  stageNumber: number;
  title: string;
  subtitle?: string;
  isLocked: boolean;
  isOutdated?: boolean;
  onBack?: () => void;
  onNext?: () => void;
  onUnlockAndEdit?: () => void;
  onLockAndProceed?: () => void;
  lockAndProceedLabel?: string;
  lockAndProceedDisabled?: boolean;
  isLocking?: boolean;
  onRelock?: () => void;
  editingActions?: ReactNode;
}

export function LockedStageHeader({
  stageNumber,
  title,
  subtitle,
  isLocked,
  isOutdated,
  onBack,
  onNext,
  onUnlockAndEdit,
  onLockAndProceed,
  lockAndProceedLabel = 'Lock & Proceed',
  lockAndProceedDisabled,
  isLocking,
  onRelock,
  editingActions,
}: LockedStageHeaderProps) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card shrink-0">
      {/* Left: Back + Title */}
      <div className="flex items-center gap-3">
        {onBack && (
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ChevronLeft className="w-4 h-4" />
            Back
          </Button>
        )}
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Stage {stageNumber}
            </span>
            <h2 className="text-lg font-semibold">{title}</h2>
          </div>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Right: Status + Actions */}
      <div className="flex items-center gap-3">
        {isLocked && (
          <>
            {/* LOCKED-IN badge */}
            <div className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium',
              'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            )}>
              <Lock className="w-3 h-3" />
              LOCKED-IN
            </div>

            {onUnlockAndEdit && (
              <Button variant="outline" size="sm" onClick={onUnlockAndEdit}>
                <Unlock className="w-3.5 h-3.5" />
                Unlock & Edit
              </Button>
            )}

            {onNext && (
              <Button variant="ghost" size="sm" onClick={onNext}>
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </>
        )}

        {isOutdated && (
          <>
            {/* OUTDATED badge */}
            <div className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium',
              'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            )}>
              <AlertTriangle className="w-3 h-3" />
              OUTDATED
            </div>

            {onRelock && (
              <Button variant="outline" size="sm" onClick={onRelock}>
                <RefreshCw className="w-3.5 h-3.5" />
                Re-lock
              </Button>
            )}

            {onUnlockAndEdit && (
              <Button variant="outline" size="sm" onClick={onUnlockAndEdit}>
                <Unlock className="w-3.5 h-3.5" />
                Edit
              </Button>
            )}

            {onNext && (
              <Button variant="ghost" size="sm" onClick={onNext}>
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </>
        )}

        {!isLocked && !isOutdated && (
          <>
            {editingActions}

            {onLockAndProceed && (
              <Button
                size="sm"
                onClick={onLockAndProceed}
                disabled={lockAndProceedDisabled || isLocking}
              >
                {isLocking ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Lock className="w-3.5 h-3.5" />
                )}
                {lockAndProceedLabel}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
