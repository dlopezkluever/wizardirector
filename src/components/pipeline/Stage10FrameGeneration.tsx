import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Image as ImageIcon,
  ArrowLeft,
  Check,
  Zap,
  Shield,
  ChevronRight,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Save,
  Loader2,
  Link2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ContentAccessCarousel } from './ContentAccessCarousel';
import { FramePanel } from './FramePanel';
import { CostDisplay } from './CostDisplay';
import { SliderComparison } from './SliderComparison';
import { InpaintingModal } from './InpaintingModal';
import { FrameGrid } from './FrameGrid';
import { frameService, type FetchFramesResponse } from '@/lib/services/frameService';
import { sceneService } from '@/lib/services/sceneService';
import { promptService } from '@/lib/services/promptService';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { ShotWithFrames, GenerationMode, Frame } from '@/types/scene';
import { LockedStageHeader } from './LockedStageHeader';
import { UnlockWarningDialog } from './UnlockWarningDialog';
import { useSceneStageLock } from '@/lib/hooks/useSceneStageLock';
import type { UnlockImpact } from '@/lib/services/sceneStageLockService';

interface Stage10FrameGenerationProps {
  projectId: string;
  sceneId: string;
  onComplete: () => void;
  onBack: () => void;
  onNext?: () => void;
}

export function Stage10FrameGeneration({
  projectId,
  sceneId,
  onComplete,
  onBack,
  onNext,
}: Stage10FrameGenerationProps) {
  const { isLocked: isStageLocked, isOutdated: isStageOutdated, lockStage, unlockStage, confirmUnlock, relockStage } = useSceneStageLock({ projectId, sceneId });
  const [showUnlockWarning, setShowUnlockWarning] = useState(false);
  const [unlockImpact, setUnlockImpact] = useState<UnlockImpact | null>(null);
  const [isConfirmingUnlock, setIsConfirmingUnlock] = useState(false);
  const stage10Locked = isStageLocked(10);
  const stage10Outdated = isStageOutdated(10);
  const queryClient = useQueryClient();

  // Mode and selection state
  const [mode, setMode] = useState<GenerationMode>('control');
  const [selectedShotId, setSelectedShotId] = useState<string | null>(null);

  // Modal state
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonImages, setComparisonImages] = useState<{
    left: string;
    right: string;
    leftLabel?: string;
    rightLabel?: string;
  } | null>(null);

  const [showInpainting, setShowInpainting] = useState(false);
  const [inpaintTarget, setInpaintTarget] = useState<{
    frame: Frame;
    shotId: string;
    frameType: 'start' | 'end';
  } | null>(null);

  // End frame prompt editor state
  const [editedEndPrompt, setEditedEndPrompt] = useState('');

  // Prior scene data (for comparison feature — display handled by ContentAccessCarousel)
  const { data: allScenes } = useQuery({
    queryKey: ['scenes', projectId],
    queryFn: () => sceneService.fetchScenes(projectId),
    enabled: !!projectId,
    staleTime: 60_000,
  });
  const priorSceneData = useMemo(() => {
    if (!allScenes) return null;
    const idx = allScenes.findIndex(s => s.id === sceneId);
    if (idx <= 0) return null;
    const prior = allScenes[idx - 1];
    return { endFrame: prior.endFrameThumbnail, sceneNumber: prior.sceneNumber };
  }, [allScenes, sceneId]);

  // Fetch frames data
  const {
    data: framesData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['frames', projectId, sceneId],
    queryFn: () => frameService.fetchFrames(projectId, sceneId),
    refetchInterval: (query) => {
      // Poll while generating
      const data = query.state.data;
      if (!data) return false;
      const progress = frameService.calculateProgress(data.shots);
      return progress.generatingFrames > 0 ? 2000 : false;
    },
  });

  const shots = useMemo(() => framesData?.shots || [], [framesData?.shots]);
  const costSummary = framesData?.costSummary || { totalCredits: 0, frameCount: 0 };
  const allFramesApproved = framesData?.allFramesApproved || false;

  // Calculate progress
  const progress = frameService.calculateProgress(shots);

  // Select first shot by default
  useEffect(() => {
    if (shots.length > 0 && !selectedShotId) {
      setSelectedShotId(shots[0].id);
    }
  }, [shots, selectedShotId]);


  // Generate frames mutation
  const generateMutation = useMutation({
    mutationFn: ({
      shotIds,
      startOnly,
    }: {
      shotIds?: string[];
      startOnly?: boolean;
    }) =>
      frameService.generateFrames(projectId, sceneId, {
        mode,
        shotIds,
        startOnly: mode === 'control' ? startOnly : false,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['frames', projectId, sceneId] });
    },
  });

  // Regenerate frame mutation
  const regenerateMutation = useMutation({
    mutationFn: (frameId: string) =>
      frameService.regenerateFrame(projectId, sceneId, frameId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['frames', projectId, sceneId] });
    },
  });

  // Inpaint frame mutation
  const inpaintMutation = useMutation({
    mutationFn: ({
      frameId,
      maskDataUrl,
      prompt,
    }: {
      frameId: string;
      maskDataUrl: string;
      prompt: string;
    }) => frameService.inpaintFrame(projectId, sceneId, frameId, { maskDataUrl, prompt }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['frames', projectId, sceneId] });
    },
  });

  // Generate end frame prompt mutation
  const generateEndFramePromptMutation = useMutation({
    mutationFn: (shotId: string) =>
      frameService.generateEndFramePrompt(projectId, sceneId, shotId),
    onSuccess: (data) => {
      setEditedEndPrompt(data.endFramePrompt);
      queryClient.invalidateQueries({ queryKey: ['frames', projectId, sceneId] });
    },
  });

  // Save end frame prompt mutation
  const saveEndFramePromptMutation = useMutation({
    mutationFn: ({ shotId, prompt }: { shotId: string; prompt: string }) =>
      frameService.saveEndFramePrompt(projectId, sceneId, shotId, prompt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['frames', projectId, sceneId] });
    },
  });

  // Regenerate with correction mutation
  const regenerateWithCorrectionMutation = useMutation({
    mutationFn: ({ frameId, correction }: { frameId: string; correction: string }) =>
      frameService.regenerateWithCorrection(projectId, sceneId, frameId, correction),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['frames', projectId, sceneId] });
    },
  });

  // Regenerate with edited prompt mutation
  const regenerateWithPromptMutation = useMutation({
    mutationFn: ({ frameId, prompt }: { frameId: string; prompt: string }) =>
      frameService.regenerateWithPrompt(projectId, sceneId, frameId, prompt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['frames', projectId, sceneId] });
    },
  });

  // Chain end frame to next shot mutation
  const chainEndFrameMutation = useMutation({
    mutationFn: ({ shotId, endFrameUrl, fromShotId }: { shotId: string; endFrameUrl: string; fromShotId: string }) =>
      frameService.chainFromEndFrame(projectId, sceneId, shotId, endFrameUrl, fromShotId),
    onSuccess: (_data, variables) => {
      const nextShot = getNextShot(variables.fromShotId);
      toast({
        title: 'Frame linked',
        description: `End frame linked as reference for Shot ${nextShot?.shotId ?? 'next'}`,
      });
      queryClient.invalidateQueries({ queryKey: ['frames', projectId, sceneId] });
    },
  });

  // Toggle requiresEndFrame for selected shot
  const handleToggleEndFrame = useCallback(async (shot: ShotWithFrames, newValue: boolean) => {
    // Optimistic update via query cache
    queryClient.setQueryData<FetchFramesResponse | undefined>(['frames', projectId, sceneId], (old) => {
      if (!old) return old;
      return {
        ...old,
        shots: old.shots.map((s: ShotWithFrames) =>
          s.id === shot.id ? { ...s, requiresEndFrame: newValue } : s
        ),
      };
    });

    try {
      await promptService.updatePrompt(projectId, sceneId, shot.id, {
        requiresEndFrame: newValue,
      });
    } catch {
      // Revert on error
      queryClient.setQueryData<FetchFramesResponse | undefined>(['frames', projectId, sceneId], (old) => {
        if (!old) return old;
        return {
          ...old,
          shots: old.shots.map((s: ShotWithFrames) =>
            s.id === shot.id ? { ...s, requiresEndFrame: !newValue } : s
          ),
        };
      });
      toast({
        title: 'Error',
        description: 'Failed to update end frame setting',
        variant: 'destructive',
      });
    }
  }, [projectId, sceneId, queryClient]);

  // Get selected shot
  const selectedShot = shots.find((s) => s.id === selectedShotId);

  // Sync edited end prompt when selected shot changes
  useEffect(() => {
    if (selectedShot?.endFramePrompt) {
      setEditedEndPrompt(selectedShot.endFramePrompt);
    } else {
      setEditedEndPrompt('');
    }
  }, [selectedShot?.id, selectedShot?.endFramePrompt]);

  const endPromptHasChanges = selectedShot?.endFramePrompt !== editedEndPrompt && editedEndPrompt !== '';

  // Get previous shot for continuity comparison
  const getPreviousShot = useCallback(
    (currentShotId: string): ShotWithFrames | null => {
      const index = shots.findIndex((s) => s.id === currentShotId);
      return index > 0 ? shots[index - 1] : null;
    },
    [shots]
  );

  // Get next shot for frame chaining
  const getNextShot = useCallback(
    (currentShotId: string): ShotWithFrames | null => {
      const index = shots.findIndex((s) => s.id === currentShotId);
      return index >= 0 && index < shots.length - 1 ? shots[index + 1] : null;
    },
    [shots]
  );

  // Handle compare click
  const handleCompare = useCallback(
    (shotId: string) => {
      const currentShot = shots.find((s) => s.id === shotId);
      const previousShot = getPreviousShot(shotId);

      if (!currentShot?.startFrame?.imageUrl) return;

      // Compare with previous shot's end frame or prior scene
      if (previousShot?.endFrame?.imageUrl) {
        setComparisonImages({
          left: previousShot.endFrame.imageUrl,
          right: currentShot.startFrame.imageUrl,
          leftLabel: `Shot ${previousShot.shotId} End`,
          rightLabel: `Shot ${currentShot.shotId} Start`,
        });
      } else if (priorSceneData?.endFrame) {
        setComparisonImages({
          left: priorSceneData.endFrame,
          right: currentShot.startFrame.imageUrl,
          leftLabel: `Scene ${priorSceneData.sceneNumber} End`,
          rightLabel: `Shot ${currentShot.shotId} Start`,
        });
      } else {
        return; // Nothing to compare with
      }

      setShowComparison(true);
    },
    [shots, getPreviousShot, priorSceneData]
  );

  // Handle inpaint click
  const handleInpaint = useCallback(
    (frame: Frame, shotId: string, frameType: 'start' | 'end') => {
      if (!frame.imageUrl) return;
      setInpaintTarget({ frame, shotId, frameType });
      setShowInpainting(true);
    },
    []
  );

  // Handle inpaint submit
  const handleInpaintSubmit = async (maskDataUrl: string, prompt: string) => {
    if (!inpaintTarget) return;
    await inpaintMutation.mutateAsync({
      frameId: inpaintTarget.frame.id,
      maskDataUrl,
      prompt,
    });
    setShowInpainting(false);
    setInpaintTarget(null);
  };

  // Handle generate for a single shot
  const handleGenerateShot = (shotId: string, startOnly: boolean) => {
    generateMutation.mutate({ shotIds: [shotId], startOnly });
  };

  // Handle generate all (Quick Mode)
  const handleGenerateAll = () => {
    generateMutation.mutate({ startOnly: false });
  };

  // Check if there's something to compare with for current shot
  const canCompare = useCallback(
    (shotId: string) => {
      const shot = shots.find((s) => s.id === shotId);
      if (!shot?.startFrame?.imageUrl) return false;

      const previousShot = getPreviousShot(shotId);
      return !!(previousShot?.endFrame?.imageUrl || priorSceneData?.endFrame);
    },
    [shots, getPreviousShot, priorSceneData]
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading frames...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <p className="text-destructive mb-4">Failed to load frames</p>
          <Button onClick={() => refetch()}>Try Again</Button>
        </div>
      </div>
    );
  }

  // No shots state
  if (shots.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">
            No shots with prompts found. Generate prompts in Stage 9 first.
          </p>
          <Button onClick={onBack}>Back to Prompts</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {(stage10Locked || stage10Outdated) && (
        <LockedStageHeader
          stageNumber={10}
          title="Frame Generation"
          isLocked={stage10Locked}
          isOutdated={stage10Outdated}
          onBack={onBack}
          onNext={onNext}
          onUnlockAndEdit={async () => {
            try {
              const impact = await unlockStage(10);
              if (impact) { setUnlockImpact(impact); setShowUnlockWarning(true); }
            } catch { /* handled */ }
          }}
          onRelock={stage10Outdated ? () => relockStage(10) : undefined}
          lockAndProceedLabel="Lock & Proceed"
          lockAndProceedDisabled={!allFramesApproved}
        />
      )}

      {/* Content Access Carousel */}
      <ContentAccessCarousel
        projectId={projectId}
        sceneId={sceneId}
        stageNumber={10}
      />

      {/* Cost Display */}
      <CostDisplay
        totalCredits={costSummary.totalCredits}
        readyFrames={progress.readyFrames}
        generatingFrames={progress.generatingFrames}
        totalFrames={progress.totalFrames}
      />

      {/* Mode Selection */}
      <div className="p-4 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-primary" />
            Frame Generation
          </h2>

          <div className="flex items-center gap-2 bg-card/50 rounded-lg p-1">
            <button
              onClick={() => setMode('quick')}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2',
                mode === 'quick'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Zap className="w-4 h-4" />
              Quick Mode
            </button>
            <button
              onClick={() => setMode('control')}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2',
                mode === 'control'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Shield className="w-4 h-4" />
              Control Mode
            </button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          {mode === 'quick'
            ? 'Bulk generate all frames at once (faster)'
            : 'Approve each frame before proceeding (cost-efficient)'}
        </p>
      </div>

      {/* Main content - varies by mode */}
      {mode === 'quick' ? (
        <FrameGrid
          shots={shots}
          onSelectShot={setSelectedShotId}
          onGenerateAll={handleGenerateAll}
          isGenerating={generateMutation.isPending}
          selectedShotId={selectedShotId || undefined}
        />
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Shot List Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-64 border-r border-border/50 bg-card/30 backdrop-blur-sm"
          >
            <ScrollArea className="h-full">
              <div className="p-2">
                {shots.map((shot) => {
                  const isSelected = selectedShotId === shot.id;

                  return (
                    <motion.button
                      key={shot.id}
                      onClick={() => setSelectedShotId(shot.id)}
                      whileHover={{ scale: 1.01 }}
                      className={cn(
                        'w-full p-3 rounded-lg mb-2 text-left transition-all',
                        isSelected
                          ? 'bg-primary/10 border border-primary/30'
                          : 'bg-card/50 border border-border/30 hover:border-border'
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="font-mono">
                          Shot {shot.shotId}
                        </Badge>
                        <ChevronRight
                          className={cn(
                            'w-4 h-4',
                            isSelected ? 'text-primary' : 'text-muted-foreground'
                          )}
                        />
                      </div>

                      <div className="flex gap-2">
                        <div
                          className={cn(
                            'flex-1 h-12 rounded border flex items-center justify-center overflow-hidden',
                            (shot.startFrame?.status === 'approved' || shot.startFrame?.status === 'generated')
                              ? 'border-emerald-500/50 bg-emerald-500/10'
                              : 'border-border/30 bg-muted/20'
                          )}
                        >
                          {shot.startFrame?.imageUrl ? (
                            <img
                              src={shot.startFrame.imageUrl}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-[10px] text-muted-foreground">
                              Start
                            </span>
                          )}
                        </div>
                        {shot.requiresEndFrame && (
                          <div
                            className={cn(
                              'flex-1 h-12 rounded border flex items-center justify-center overflow-hidden',
                              (shot.endFrame?.status === 'approved' || shot.endFrame?.status === 'generated')
                                ? 'border-emerald-500/50 bg-emerald-500/10'
                                : 'border-border/30 bg-muted/20'
                            )}
                          >
                            {shot.endFrame?.imageUrl ? (
                              <img
                                src={shot.endFrame.imageUrl}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-[10px] text-muted-foreground">
                                End
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </ScrollArea>
          </motion.div>

          {/* Frame Editor — 2-column grid */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            {selectedShot && (
              <ScrollArea className="flex-1">
                <div className="p-6">
                  <div className="grid grid-cols-2 gap-6">
                    {/* Top-left: Start Frame */}
                    <FramePanel
                      frame={selectedShot.startFrame}
                      frameType="start"
                      shotId={selectedShot.shotId}
                      projectId={projectId}
                      sceneId={sceneId}
                      onGenerate={() => handleGenerateShot(selectedShot.id, true)}
                      onRegenerate={() =>
                        selectedShot.startFrame &&
                        regenerateMutation.mutate(selectedShot.startFrame.id)
                      }
                      onRegenerateWithCorrection={(correction) =>
                        selectedShot.startFrame &&
                        regenerateWithCorrectionMutation.mutate({
                          frameId: selectedShot.startFrame.id,
                          correction,
                        })
                      }
                      onRegenerateWithEditedPrompt={(prompt) =>
                        selectedShot.startFrame &&
                        regenerateWithPromptMutation.mutate({
                          frameId: selectedShot.startFrame.id,
                          prompt,
                        })
                      }
                      currentPrompt={selectedShot.framePrompt ?? undefined}
                      onInpaint={() =>
                        selectedShot.startFrame &&
                        handleInpaint(
                          selectedShot.startFrame,
                          selectedShot.shotId,
                          'start'
                        )
                      }
                      onCompare={() => handleCompare(selectedShot.id)}
                      showCompare={canCompare(selectedShot.id)}
                      referenceImages={selectedShot.referenceImageOrder ?? undefined}
                    />

                    {/* Top-right: End Frame */}
                    {selectedShot.requiresEndFrame ? (
                      <div className="flex flex-col">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-medium text-foreground">End Frame</h3>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {selectedShot.requiresEndFrame ? 'On' : 'Off'}
                            </span>
                            <Switch
                              checked={selectedShot.requiresEndFrame}
                              onCheckedChange={(checked) => handleToggleEndFrame(selectedShot, checked)}
                            />
                          </div>
                        </div>
                        <FramePanel
                          frame={selectedShot.endFrame}
                          frameType="end"
                          shotId={selectedShot.shotId}
                          projectId={projectId}
                          sceneId={sceneId}
                          isGenerateDisabled={selectedShot.startFrame?.status !== 'approved' && selectedShot.startFrame?.status !== 'generated'}
                          disabledReason="Start frame must be ready first"
                          onGenerate={() => handleGenerateShot(selectedShot.id, false)}
                          onRegenerate={() =>
                            selectedShot.endFrame &&
                            regenerateMutation.mutate(selectedShot.endFrame.id)
                          }
                          onRegenerateWithCorrection={(correction) =>
                            selectedShot.endFrame &&
                            regenerateWithCorrectionMutation.mutate({
                              frameId: selectedShot.endFrame.id,
                              correction,
                            })
                          }
                          onRegenerateWithEditedPrompt={(prompt) =>
                            selectedShot.endFrame &&
                            regenerateWithPromptMutation.mutate({
                              frameId: selectedShot.endFrame.id,
                              prompt,
                            })
                          }
                          currentPrompt={selectedShot.endFramePrompt ?? undefined}
                          onInpaint={() =>
                            selectedShot.endFrame &&
                            handleInpaint(
                              selectedShot.endFrame,
                              selectedShot.shotId,
                              'end'
                            )
                          }
                          referenceImages={selectedShot.referenceImageOrder ?? undefined}
                          hideHeader
                        />
                        {/* "Use as Next Start" chain button */}
                        {(selectedShot.endFrame?.status === 'approved' || selectedShot.endFrame?.status === 'generated') &&
                          selectedShot.endFrame?.imageUrl &&
                          getNextShot(selectedShot.id) && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() =>
                              chainEndFrameMutation.mutate({
                                shotId: getNextShot(selectedShot.id)!.id,
                                endFrameUrl: selectedShot.endFrame!.imageUrl!,
                                fromShotId: selectedShot.id,
                              })
                            }
                            disabled={chainEndFrameMutation.isPending}
                          >
                            {chainEndFrameMutation.isPending ? (
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            ) : (
                              <Link2 className="w-3 h-3 mr-1" />
                            )}
                            Use as Next Start
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/50 bg-muted/10 p-6">
                        <p className="text-sm text-muted-foreground mb-3">End frame is off</p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Enable</span>
                          <Switch
                            checked={false}
                            onCheckedChange={(checked) => handleToggleEndFrame(selectedShot, checked)}
                          />
                        </div>
                      </div>
                    )}

                    {/* Bottom-left: Shot Context */}
                    <div className={cn(
                      'p-4 rounded-lg bg-muted/30 border border-border/30',
                      !selectedShot.requiresEndFrame && 'col-span-2'
                    )}>
                      <h4 className="text-sm font-medium text-foreground mb-2">
                        Shot Context
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Setting: </span>
                          <span className="text-foreground">{selectedShot.setting}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Camera: </span>
                          <span className="text-foreground">{selectedShot.camera}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Action: </span>
                          <span className="text-foreground">{selectedShot.action}</span>
                        </div>
                        {selectedShot.framePrompt && (
                          <div>
                            <span className="text-muted-foreground">Frame Prompt: </span>
                            <span className="text-foreground text-xs">
                              {selectedShot.framePrompt}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom-right: End Frame Prompt Editor (only when end frame is on) */}
                    {selectedShot.requiresEndFrame && (
                      <div className="p-4 rounded-lg bg-muted/30 border border-border/30 flex flex-col h-full gap-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium text-foreground">
                            End Frame Prompt
                          </h4>
                          <Badge
                            variant="secondary"
                            className={cn(
                              'text-xs',
                              selectedShot.endFramePrompt
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-muted text-muted-foreground'
                            )}
                          >
                            {selectedShot.endFramePrompt ? 'Set' : 'Empty'}
                          </Badge>
                        </div>

                        {!selectedShot.endFramePrompt && !editedEndPrompt ? (
                          <div className="flex flex-col flex-1 items-center justify-center gap-3">
                            <p className="text-xs text-muted-foreground">
                              Generate a dedicated end frame prompt using LLM.
                            </p>
                            <Button
                              variant="gold"
                              size="sm"
                              className="w-full"
                              onClick={() => generateEndFramePromptMutation.mutate(selectedShot.id)}
                              disabled={generateEndFramePromptMutation.isPending || !selectedShot.framePrompt}
                            >
                              {generateEndFramePromptMutation.isPending ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <Sparkles className="w-4 h-4 mr-2" />
                              )}
                              Generate Prompt
                            </Button>
                          </div>
                        ) : (
                          <div className="flex flex-col flex-1 min-h-0 gap-3">
                            <Textarea
                              value={editedEndPrompt}
                              onChange={(e) => setEditedEndPrompt(e.target.value)}
                              placeholder="End frame prompt..."
                              className="resize-none text-xs flex-1 min-h-[100px]"
                            />
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={() => generateEndFramePromptMutation.mutate(selectedShot.id)}
                                disabled={generateEndFramePromptMutation.isPending}
                              >
                                {generateEndFramePromptMutation.isPending ? (
                                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                ) : (
                                  <Sparkles className="w-3 h-3 mr-1" />
                                )}
                                Regenerate Prompt
                              </Button>
                              {endPromptHasChanges && (
                                <Button
                                  variant="gold"
                                  size="sm"
                                  className="flex-1"
                                  onClick={() => saveEndFramePromptMutation.mutate({
                                    shotId: selectedShot.id,
                                    prompt: editedEndPrompt,
                                  })}
                                  disabled={saveEndFramePromptMutation.isPending}
                                >
                                  {saveEndFramePromptMutation.isPending ? (
                                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                  ) : (
                                    <Save className="w-3 h-3 mr-1" />
                                  )}
                                  Save
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            )}
          </motion.div>
        </div>
      )}

      {/* Footer — hidden when locked */}
      {!stage10Locked && !stage10Outdated && (
        <div className="p-4 border-t border-border/50 flex items-center justify-between bg-card/30">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Prompts
          </Button>
          <Button variant="gold" onClick={async () => {
            try { await lockStage(10); } catch { /* best-effort */ }
            onComplete();
          }} disabled={!allFramesApproved}>
            <Check className="w-4 h-4 mr-2" />
            Lock & Proceed
          </Button>
        </div>
      )}

      {/* Slider Comparison Modal */}
      {comparisonImages && (
        <SliderComparison
          isOpen={showComparison}
          onClose={() => {
            setShowComparison(false);
            setComparisonImages(null);
          }}
          leftImage={comparisonImages.left}
          rightImage={comparisonImages.right}
          leftLabel={comparisonImages.leftLabel}
          rightLabel={comparisonImages.rightLabel}
        />
      )}

      {/* Inpainting Modal */}
      {inpaintTarget && (
        <InpaintingModal
          isOpen={showInpainting}
          onClose={() => {
            setShowInpainting(false);
            setInpaintTarget(null);
          }}
          sourceImageUrl={inpaintTarget.frame.imageUrl!}
          shotId={inpaintTarget.shotId}
          frameType={inpaintTarget.frameType}
          onSubmit={handleInpaintSubmit}
        />
      )}

      <UnlockWarningDialog
        open={showUnlockWarning}
        onOpenChange={setShowUnlockWarning}
        impact={unlockImpact}
        stageNumber={10}
        stageTitle="Frame Generation"
        onConfirm={async () => {
          try {
            setIsConfirmingUnlock(true);
            await confirmUnlock(10);
            setShowUnlockWarning(false);
            setUnlockImpact(null);
          } catch { /* handled */ } finally { setIsConfirmingUnlock(false); }
        }}
        isConfirming={isConfirmingUnlock}
      />
    </div>
  );
}
