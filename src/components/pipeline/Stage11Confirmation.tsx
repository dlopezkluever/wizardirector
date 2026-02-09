import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  CreditCard,
  Image as ImageIcon,
  Play,
  ArrowLeft,
  AlertTriangle,
  DollarSign,
  Clock,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Loader2,
  Zap,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { checkoutService } from '@/lib/services/checkoutService';
import type { ModelVariant, ShotCheckoutDetail } from '@/types/scene';
import { LockedStageHeader } from './LockedStageHeader';
import { UnlockWarningDialog } from './UnlockWarningDialog';
import { useSceneStageLock } from '@/lib/hooks/useSceneStageLock';
import type { UnlockImpact } from '@/lib/services/sceneStageLockService';

interface Stage11ConfirmationProps {
  projectId: string;
  sceneId: string;
  onComplete: () => void;
  onBack: () => void;
  onNext?: () => void;
}

export function Stage11Confirmation({
  projectId,
  sceneId,
  onComplete,
  onBack,
  onNext,
}: Stage11ConfirmationProps) {
  const { isLocked: isStageLocked, isOutdated: isStageOutdated, lockStage, unlockStage, confirmUnlock, relockStage } = useSceneStageLock({ projectId, sceneId });
  const [showUnlockWarning, setShowUnlockWarning] = useState(false);
  const [unlockImpact, setUnlockImpact] = useState<UnlockImpact | null>(null);
  const [isConfirmingUnlock, setIsConfirmingUnlock] = useState(false);
  const stage11Locked = isStageLocked(11);
  const stage11Outdated = isStageOutdated(11);
  const queryClient = useQueryClient();
  const [expandedShots, setExpandedShots] = useState<string[]>([]);
  const [modelVariant, setModelVariant] = useState<ModelVariant>('veo_3_1_fast');

  // Fetch checkout data
  const {
    data: checkoutData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['checkout', projectId, sceneId],
    queryFn: () => checkoutService.getCostBreakdown(projectId, sceneId),
    staleTime: 30000, // 30 seconds
  });

  // Confirm render mutation
  const confirmMutation = useMutation({
    mutationFn: () => checkoutService.confirmRender(projectId, sceneId, modelVariant),
    onSuccess: (result) => {
      toast.success(`Queued ${result.jobsCreated} video jobs for rendering`);
      queryClient.invalidateQueries({ queryKey: ['video-jobs', projectId, sceneId] });
      onComplete();
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to queue render');
    },
  });

  const toggleExpanded = (shotId: string) => {
    setExpandedShots(prev =>
      prev.includes(shotId)
        ? prev.filter(id => id !== shotId)
        : [...prev, shotId]
    );
  };

  const handleConfirm = () => {
    confirmMutation.mutate();
  };

  // Calculate totals based on selected model
  const totalCost = checkoutData
    ? (modelVariant === 'veo_3_1_fast'
        ? checkoutData.sceneTotalCostFast
        : checkoutData.sceneTotalCostStandard)
    : 0;

  const totalDuration = checkoutData?.shots.reduce((sum, s) => sum + s.duration, 0) || 0;
  const hasUnapprovedFrames = (checkoutData?.warnings.unapprovedFrames.length || 0) > 0;
  const hasPriorSceneMismatch = checkoutData?.warnings.priorSceneMismatch || false;

  // Loading state
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading checkout data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !checkoutData) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Failed to Load Checkout</h3>
          <p className="text-muted-foreground mb-4">
            {(error as Error)?.message || 'Unable to fetch checkout data'}
          </p>
          <Button onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {(stage11Locked || stage11Outdated) && (
        <LockedStageHeader
          stageNumber={11}
          title="Confirmation"
          isLocked={stage11Locked}
          isOutdated={stage11Outdated}
          onBack={onBack}
          onNext={onNext}
          onUnlockAndEdit={async () => {
            try {
              const impact = await unlockStage(11);
              if (impact) { setUnlockImpact(impact); setShowUnlockWarning(true); }
            } catch { /* handled */ }
          }}
          onRelock={stage11Outdated ? () => relockStage(11) : undefined}
          lockAndProceedLabel="Confirm & Render"
        />
      )}

      {/* Header */}
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-foreground">
              Confirm & Render
            </h2>
            <p className="text-sm text-muted-foreground">
              {checkoutData.sceneName} - Review before video generation
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Shot Summary */}
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-4">
            {/* Dependency Warnings */}
            {(hasUnapprovedFrames || hasPriorSceneMismatch) && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-amber-500/10 rounded-xl p-4 border border-amber-500/30 mb-4"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-amber-400 mb-1">Dependency Warnings</h4>
                    <ul className="text-xs text-amber-400/80 space-y-1">
                      {hasUnapprovedFrames && (
                        <li>
                          {checkoutData.warnings.unapprovedFrames.length} frame(s) not yet approved -
                          rendering will use current frames
                        </li>
                      )}
                      {hasPriorSceneMismatch && (
                        <li>Prior scene has not been rendered - continuity may be affected</li>
                      )}
                    </ul>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Shot Cards */}
            {checkoutData.shots.map((shot, index) => (
              <ShotCard
                key={shot.shotUuid}
                shot={shot}
                index={index}
                isExpanded={expandedShots.includes(shot.shotId)}
                modelVariant={modelVariant}
                onToggle={() => toggleExpanded(shot.shotId)}
              />
            ))}
          </div>
        </ScrollArea>

        {/* Cost Summary Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-80 border-l border-border/50 bg-card/30 backdrop-blur-sm flex flex-col"
        >
          <div className="p-6 border-b border-border/50">
            <h3 className="font-display text-lg font-semibold text-foreground mb-4">
              Cost Summary
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Shots</span>
                <span className="font-medium text-foreground">{checkoutData.shots.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Duration</span>
                <span className="font-medium text-foreground">{totalDuration}s</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Image Costs</span>
                <span className="font-medium text-foreground">
                  ${checkoutData.shots.reduce((sum, s) => sum + s.imageCost, 0).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Video Generation</span>
                <span className="font-medium text-foreground">
                  ${(totalCost - checkoutData.shots.reduce((sum, s) => sum + s.imageCost, 0)).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Model Selector */}
          <div className="p-6 border-b border-border/50">
            <h4 className="text-sm font-medium text-foreground mb-3">Model Selection</h4>
            <div className="space-y-2">
              <button
                onClick={() => setModelVariant('veo_3_1_fast')}
                className={cn(
                  'w-full p-3 rounded-lg border text-left transition-all',
                  modelVariant === 'veo_3_1_fast'
                    ? 'bg-primary/10 border-primary/50'
                    : 'bg-card/50 border-border/30 hover:border-border'
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Veo 3.1 Fast</span>
                  {modelVariant === 'veo_3_1_fast' && (
                    <Check className="w-4 h-4 text-primary ml-auto" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">$0.15/second - Quick preview quality</p>
              </button>
              <button
                onClick={() => setModelVariant('veo_3_1_standard')}
                className={cn(
                  'w-full p-3 rounded-lg border text-left transition-all',
                  modelVariant === 'veo_3_1_standard'
                    ? 'bg-primary/10 border-primary/50'
                    : 'bg-card/50 border-border/30 hover:border-border'
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-medium text-foreground">Veo 3.1 Standard</span>
                  {modelVariant === 'veo_3_1_standard' && (
                    <Check className="w-4 h-4 text-primary ml-auto" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">$0.40/second - Production quality</p>
              </button>
            </div>
          </div>

          <div className="p-6 flex-1">
            {/* Total Cost */}
            <div className="bg-primary/10 rounded-xl p-4 border border-primary/30 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium text-foreground">Total Scene Cost</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-4xl font-bold text-primary">
                  ${totalCost.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Credit Balance */}
            <div className={cn(
              'rounded-xl p-4 border mb-4',
              checkoutData.isLowCredit
                ? 'bg-amber-500/10 border-amber-500/30'
                : 'bg-card/50 border-border/30'
            )}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-muted-foreground">Your Balance</span>
                {checkoutData.isLowCredit && (
                  <Badge variant="outline" className="text-amber-400 border-amber-400/30 text-xs">
                    Low Balance
                  </Badge>
                )}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-2xl font-bold text-foreground">
                  ${checkoutData.userBalance.toFixed(2)}
                </span>
              </div>
              {checkoutData.userBalance < totalCost && (
                <p className="text-xs text-destructive mt-2">
                  Insufficient credits for this render
                </p>
              )}
            </div>

            {/* Project Running Total */}
            {checkoutData.projectRunningTotal > 0 && (
              <div className="text-xs text-muted-foreground mb-4">
                <span>Project total so far: </span>
                <span className="font-mono">${checkoutData.projectRunningTotal.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Confirm Button */}
          <div className="p-4 border-t border-border/50">
            <div className="bg-amber-500/10 rounded-lg p-3 border border-amber-500/30 mb-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-400">
                  No further edits are possible after confirmation.
                  Make sure all frames and prompts are correct.
                </p>
              </div>
            </div>

            <Button
              variant="gold"
              className="w-full"
              onClick={handleConfirm}
              disabled={confirmMutation.isPending || checkoutData.userBalance < totalCost}
            >
              {confirmMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Queueing Render...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Confirm & Render
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Footer — hidden when locked */}
      {!stage11Locked && !stage11Outdated && (
        <div className="p-4 border-t border-border/50 bg-card/30">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Frames
          </Button>
        </div>
      )}

      <UnlockWarningDialog
        open={showUnlockWarning}
        onOpenChange={setShowUnlockWarning}
        impact={unlockImpact}
        stageNumber={11}
        stageTitle="Confirmation"
        onConfirm={async () => {
          try {
            setIsConfirmingUnlock(true);
            await confirmUnlock(11);
            setShowUnlockWarning(false);
            setUnlockImpact(null);
          } catch { /* handled */ } finally { setIsConfirmingUnlock(false); }
        }}
        isConfirming={isConfirmingUnlock}
      />
    </div>
  );
}

// Shot Card Component
interface ShotCardProps {
  shot: ShotCheckoutDetail;
  index: number;
  isExpanded: boolean;
  modelVariant: ModelVariant;
  onToggle: () => void;
}

function ShotCard({ shot, index, isExpanded, modelVariant, onToggle }: ShotCardProps) {
  const videoCost = modelVariant === 'veo_3_1_fast' ? shot.videoCostFast : shot.videoCostStandard;
  const totalShotCost = shot.imageCost + videoCost;

  const getStatusBadge = (status: string | null) => {
    if (!status) return null;

    const variants: Record<string, { color: string; icon: typeof Check }> = {
      approved: { color: 'text-green-400 border-green-400/30', icon: Check },
      generated: { color: 'text-blue-400 border-blue-400/30', icon: Check },
      pending: { color: 'text-muted-foreground border-border/30', icon: Clock },
      generating: { color: 'text-amber-400 border-amber-400/30', icon: Loader2 },
      rejected: { color: 'text-destructive border-destructive/30', icon: X },
    };

    const variant = variants[status] || variants.pending;
    const Icon = variant.icon;

    return (
      <Badge
        variant="outline"
        className={cn('text-xs', variant.color)}
      >
        <Icon className={cn('w-3 h-3 mr-1', status === 'generating' && 'animate-spin')} />
        {status}
      </Badge>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-card/50 rounded-xl border border-border/30 overflow-hidden"
    >
      <div
        className="p-4 flex items-center gap-4 cursor-pointer hover:bg-card/80 transition-colors"
        onClick={onToggle}
      >
        {/* Frame Previews */}
        <div className="flex gap-2">
          <div className="relative w-20 h-12 rounded border border-border/30 overflow-hidden bg-muted/50">
            {shot.startFrameUrl ? (
              <img src={shot.startFrameUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
            {shot.startFrameStatus !== 'approved' && (
              <div className="absolute inset-0 bg-amber-500/20 flex items-center justify-center">
                <AlertTriangle className="w-3 h-3 text-amber-400" />
              </div>
            )}
          </div>
          {shot.requiresEndFrame && (
            <div className="relative w-20 h-12 rounded border border-border/30 overflow-hidden bg-muted/50">
              {shot.endFrameUrl ? (
                <img src={shot.endFrameUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
              {shot.endFrameStatus && shot.endFrameStatus !== 'approved' && (
                <div className="absolute inset-0 bg-amber-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Shot Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="font-mono">
              Shot {shot.shotId}
            </Badge>
            <span className="text-xs text-muted-foreground">{shot.duration}s</span>
            {getStatusBadge(shot.startFrameStatus)}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-1">
            {shot.videoPrompt || shot.framePrompt || 'No prompt set'}
          </p>
        </div>

        {/* Cost */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="flex items-center gap-1 text-primary">
              <DollarSign className="w-4 h-4" />
              <span className="font-mono font-bold">{totalShotCost.toFixed(2)}</span>
            </div>
            <span className="text-xs text-muted-foreground">total</span>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="border-t border-border/30 p-4 space-y-4"
        >
          {/* Cost Breakdown */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h5 className="text-xs font-medium text-muted-foreground mb-1">Image Cost</h5>
              <span className="text-sm font-mono text-foreground">${shot.imageCost.toFixed(2)}</span>
            </div>
            <div>
              <h5 className="text-xs font-medium text-muted-foreground mb-1">Video Cost</h5>
              <span className="text-sm font-mono text-foreground">${videoCost.toFixed(2)}</span>
            </div>
          </div>

          {/* Frame Prompt */}
          {shot.framePrompt && (
            <div>
              <h5 className="text-xs font-medium text-muted-foreground mb-2">Frame Prompt</h5>
              <p className="text-sm text-muted-foreground bg-muted/20 rounded-lg p-3">
                {shot.framePrompt}
              </p>
            </div>
          )}

          {/* Video Prompt */}
          {shot.videoPrompt && (
            <div>
              <h5 className="text-xs font-medium text-muted-foreground mb-2">Video Prompt</h5>
              <p className="text-sm text-muted-foreground bg-muted/20 rounded-lg p-3">
                {shot.videoPrompt}
              </p>
            </div>
          )}

          {/* Frame Status */}
          <div className="flex items-center gap-4">
            <div>
              <h5 className="text-xs font-medium text-muted-foreground mb-1">Start Frame</h5>
              {getStatusBadge(shot.startFrameStatus)}
            </div>
            {shot.requiresEndFrame && (
              <div>
                <h5 className="text-xs font-medium text-muted-foreground mb-1">End Frame</h5>
                {getStatusBadge(shot.endFrameStatus)}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
