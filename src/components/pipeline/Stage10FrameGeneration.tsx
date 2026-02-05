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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RearviewMirror } from './RearviewMirror';
import { FramePanel } from './FramePanel';
import { CostDisplay } from './CostDisplay';
import { SliderComparison } from './SliderComparison';
import { InpaintingModal } from './InpaintingModal';
import { FrameGrid } from './FrameGrid';
import { frameService } from '@/lib/services/frameService';
import { sceneService } from '@/lib/services/sceneService';
import { cn } from '@/lib/utils';
import type { ShotWithFrames, GenerationMode, Frame } from '@/types/scene';

interface Stage10FrameGenerationProps {
  projectId: string;
  sceneId: string;
  onComplete: () => void;
  onBack: () => void;
}

export function Stage10FrameGeneration({
  projectId,
  sceneId,
  onComplete,
  onBack,
}: Stage10FrameGenerationProps) {
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

  // Prior scene state
  const [priorSceneData, setPriorSceneData] = useState<{
    endState?: string;
    endFrame?: string;
    sceneNumber?: number;
  } | null>(null);
  const [imageError, setImageError] = useState(false);

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

  // Fetch prior scene data
  useEffect(() => {
    const fetchPriorScene = async () => {
      try {
        const scenes = await sceneService.fetchScenes(projectId);
        const currentSceneIndex = scenes.findIndex((s) => s.id === sceneId);
        if (currentSceneIndex > 0) {
          const priorScene = scenes[currentSceneIndex - 1];
          setPriorSceneData({
            endState: priorScene.priorSceneEndState,
            endFrame: priorScene.endFrameThumbnail,
            sceneNumber: priorScene.sceneNumber,
          });
          setImageError(false);
        }
      } catch (error) {
        console.error('Failed to fetch prior scene:', error);
      }
    };
    fetchPriorScene();
  }, [projectId, sceneId]);

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

  // Approve frame mutation
  const approveMutation = useMutation({
    mutationFn: (frameId: string) =>
      frameService.approveFrame(projectId, sceneId, frameId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['frames', projectId, sceneId] });
    },
  });

  // Reject frame mutation
  const rejectMutation = useMutation({
    mutationFn: (frameId: string) =>
      frameService.rejectFrame(projectId, sceneId, frameId),
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

  // Get selected shot
  const selectedShot = shots.find((s) => s.id === selectedShotId);

  // Get previous shot for continuity comparison
  const getPreviousShot = useCallback(
    (currentShotId: string): ShotWithFrames | null => {
      const index = shots.findIndex((s) => s.id === currentShotId);
      return index > 0 ? shots[index - 1] : null;
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

  // Handle approve all generated frames
  const handleApproveAllGenerated = async () => {
    const framesToApprove = shots.flatMap((shot) => {
      const frames: string[] = [];
      if (shot.startFrame?.status === 'generated') {
        frames.push(shot.startFrame.id);
      }
      if (shot.endFrame?.status === 'generated') {
        frames.push(shot.endFrame.id);
      }
      return frames;
    });

    for (const frameId of framesToApprove) {
      await approveMutation.mutateAsync(frameId);
    }
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
      {/* Rearview Mirror */}
      <RearviewMirror
        mode={priorSceneData?.endFrame && !imageError ? 'visual' : 'text'}
        priorSceneEndState={priorSceneData?.endState}
        priorEndFrame={priorSceneData?.endFrame}
        priorSceneName={
          priorSceneData?.sceneNumber
            ? `Scene ${priorSceneData.sceneNumber}`
            : undefined
        }
        onImageError={() => setImageError(true)}
      />

      {/* Cost Display */}
      <CostDisplay
        totalCredits={costSummary.totalCredits}
        approvedFrames={progress.approvedFrames}
        generatedFrames={progress.generatedFrames}
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
          onApproveAllGenerated={handleApproveAllGenerated}
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
                  const startReady =
                    shot.startFrame?.status === 'approved' ||
                    shot.startFrame?.status === 'generated';
                  const endReady =
                    !shot.requiresEndFrame ||
                    shot.endFrame?.status === 'approved' ||
                    shot.endFrame?.status === 'generated';

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
                            shot.startFrame?.status === 'approved'
                              ? 'border-emerald-500/50 bg-emerald-500/10'
                              : shot.startFrame?.status === 'generated'
                              ? 'border-amber-500/50 bg-amber-500/10'
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
                              shot.endFrame?.status === 'approved'
                                ? 'border-emerald-500/50 bg-emerald-500/10'
                                : shot.endFrame?.status === 'generated'
                                ? 'border-amber-500/50 bg-amber-500/10'
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

          {/* Frame Editor */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            {selectedShot && (
              <ScrollArea className="flex-1">
                <div className="p-6">
                  <div className="grid grid-cols-2 gap-6">
                    {/* Start Frame */}
                    <FramePanel
                      frame={selectedShot.startFrame}
                      frameType="start"
                      shotId={selectedShot.shotId}
                      onGenerate={() => handleGenerateShot(selectedShot.id, true)}
                      onApprove={() =>
                        selectedShot.startFrame &&
                        approveMutation.mutate(selectedShot.startFrame.id)
                      }
                      onReject={() =>
                        selectedShot.startFrame &&
                        rejectMutation.mutate(selectedShot.startFrame.id)
                      }
                      onRegenerate={() =>
                        selectedShot.startFrame &&
                        regenerateMutation.mutate(selectedShot.startFrame.id)
                      }
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
                    />

                    {/* End Frame */}
                    {selectedShot.requiresEndFrame && (
                      <FramePanel
                        frame={selectedShot.endFrame}
                        frameType="end"
                        shotId={selectedShot.shotId}
                        isDisabled={selectedShot.startFrame?.status !== 'approved'}
                        disabledReason="Approve start frame first"
                        onGenerate={() => handleGenerateShot(selectedShot.id, false)}
                        onApprove={() =>
                          selectedShot.endFrame &&
                          approveMutation.mutate(selectedShot.endFrame.id)
                        }
                        onReject={() =>
                          selectedShot.endFrame &&
                          rejectMutation.mutate(selectedShot.endFrame.id)
                        }
                        onRegenerate={() =>
                          selectedShot.endFrame &&
                          regenerateMutation.mutate(selectedShot.endFrame.id)
                        }
                        onInpaint={() =>
                          selectedShot.endFrame &&
                          handleInpaint(
                            selectedShot.endFrame,
                            selectedShot.shotId,
                            'end'
                          )
                        }
                      />
                    )}
                  </div>

                  {/* Shot context */}
                  <div className="mt-6 p-4 rounded-lg bg-muted/30 border border-border/30">
                    <h4 className="text-sm font-medium text-foreground mb-2">
                      Shot Context
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Setting: </span>
                        <span className="text-foreground">{selectedShot.setting}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Camera: </span>
                        <span className="text-foreground">{selectedShot.camera}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Action: </span>
                        <span className="text-foreground">{selectedShot.action}</span>
                      </div>
                      {selectedShot.framePrompt && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Frame Prompt: </span>
                          <span className="text-foreground text-xs">
                            {selectedShot.framePrompt}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            )}
          </motion.div>
        </div>
      )}

      {/* Footer */}
      <div className="p-4 border-t border-border/50 flex items-center justify-between bg-card/30">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Prompts
        </Button>
        <Button variant="gold" onClick={onComplete} disabled={!allFramesApproved}>
          <Check className="w-4 h-4 mr-2" />
          Proceed to Confirmation
        </Button>
      </div>

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
    </div>
  );
}
