import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Image as ImageIcon,
  Video,
  ChevronDown,
  ChevronRight,
  Check,
  ArrowLeft,
  Edit3,
  Lock,
  AlertTriangle,
  Info,
  Loader2,
  RefreshCw,
  Sparkles,
  Save,
  Unlock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { promptService } from '@/lib/services/promptService';
import type { PromptSet } from '@/types/scene';
import { LockedStageHeader } from './LockedStageHeader';
import { UnlockWarningDialog } from './UnlockWarningDialog';
import { useSceneStageLock } from '@/lib/hooks/useSceneStageLock';
import type { UnlockImpact } from '@/lib/services/sceneStageLockService';
import { ContentAccessCarousel } from './ContentAccessCarousel';
import { ReferenceImageThumbnail } from './ReferenceImageThumbnail';

interface Stage9PromptSegmentationProps {
  projectId: string;
  sceneId: string;
  onComplete: () => void;
  onBack: () => void;
  onNext?: () => void;
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// Validation constants
const FRAME_PROMPT_MAX = 1000;
const FRAME_PROMPT_WARN = 500;
const VIDEO_PROMPT_MAX = 800;
const VIDEO_PROMPT_WARN = 400;

export function Stage9PromptSegmentation({ projectId, sceneId, onComplete, onBack, onNext }: Stage9PromptSegmentationProps) {
  const { isLocked: isStageLocked, isOutdated: isStageOutdated, lockStage, unlockStage, confirmUnlock, relockStage } = useSceneStageLock({ projectId, sceneId });
  const [showUnlockWarning, setShowUnlockWarning] = useState(false);
  const [unlockImpact, setUnlockImpact] = useState<UnlockImpact | null>(null);
  const [isConfirmingUnlock, setIsConfirmingUnlock] = useState(false);
  const stage9Locked = isStageLocked(9);
  const stage9Outdated = isStageOutdated(9);

  // State
  const [promptSets, setPromptSets] = useState<PromptSet[]>([]);
  const [sceneNumber, setSceneNumber] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedShots, setExpandedShots] = useState<string[]>([]);
  const [editingFramePrompts, setEditingFramePrompts] = useState<Set<string>>(new Set());
  const [regeneratingShots, setRegeneratingShots] = useState<Set<string>>(new Set());

  // Auto-save state
  const [pendingUpdates, setPendingUpdates] = useState<Map<string, { framePrompt?: string; videoPrompt?: string }>>(new Map());
  const [isSaving, setIsSaving] = useState(false);
  const debouncedUpdates = useDebounce(pendingUpdates, 500);

  // Track initial load
  const hasLoadedRef = useRef(false);

  // Load prompts on mount
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    loadPrompts();
  }, [projectId, sceneId]);

  // Auto-save debounced updates
  useEffect(() => {
    if (debouncedUpdates.size === 0) return;
    saveUpdates();
  }, [debouncedUpdates]);

  const loadPrompts = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await promptService.fetchPrompts(projectId, sceneId);
      setPromptSets(response.prompts);
      setSceneNumber(response.sceneNumber);

      // Auto-expand first shot if exists
      if (response.prompts.length > 0) {
        setExpandedShots([response.prompts[0].shotId]);
      }
    } catch (err) {
      console.error('Error loading prompts:', err);
      setError(err instanceof Error ? err.message : 'Failed to load prompts');
      toast({
        title: 'Error',
        description: 'Failed to load prompts',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveUpdates = async () => {
    if (pendingUpdates.size === 0) return;

    setIsSaving(true);
    const updates = new Map(pendingUpdates);
    setPendingUpdates(new Map());

    try {
      const promises = Array.from(updates.entries()).map(async ([shotUuid, changes]) => {
        await promptService.updatePrompt(projectId, sceneId, shotUuid, changes);
      });

      await Promise.all(promises);
    } catch (err) {
      console.error('Error saving updates:', err);
      toast({
        title: 'Save failed',
        description: 'Some changes could not be saved',
        variant: 'destructive',
      });
      // Re-queue failed updates
      setPendingUpdates(prev => new Map([...prev, ...updates]));
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateAllPrompts = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await promptService.generatePrompts(projectId, sceneId);
      setPromptSets(response.prompts);

      if (response.failed > 0) {
        toast({
          title: 'Partial success',
          description: `Generated ${response.generated} prompts, ${response.failed} failed`,
          variant: 'default',
        });
      } else {
        toast({
          title: 'Success',
          description: `Generated prompts for ${response.generated} shots`,
        });
      }
    } catch (err) {
      console.error('Error generating prompts:', err);
      const message = err instanceof Error ? err.message : 'Failed to generate prompts';
      setError(message);
      toast({
        title: 'Generation failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerateShotPrompt = async (shotUuid: string, shotId: string) => {
    setRegeneratingShots(prev => new Set(prev).add(shotId));

    try {
      const updatedPrompt = await promptService.regenerateSinglePrompt(projectId, sceneId, shotUuid);

      setPromptSets(prev => prev.map(ps =>
        ps.shotUuid === shotUuid ? { ...ps, ...updatedPrompt } : ps
      ));

      toast({
        title: 'Regenerated',
        description: `Prompts regenerated for Shot ${shotId}`,
      });
    } catch (err) {
      console.error('Error regenerating prompt:', err);
      toast({
        title: 'Regeneration failed',
        description: err instanceof Error ? err.message : 'Failed to regenerate prompt',
        variant: 'destructive',
      });
    } finally {
      setRegeneratingShots(prev => {
        const next = new Set(prev);
        next.delete(shotId);
        return next;
      });
    }
  };

  const toggleExpanded = (shotId: string) => {
    setExpandedShots(prev =>
      prev.includes(shotId)
        ? prev.filter(id => id !== shotId)
        : [...prev, shotId]
    );
  };

  const toggleFrameEditing = (shotId: string) => {
    setEditingFramePrompts(prev => {
      const next = new Set(prev);
      if (next.has(shotId)) {
        next.delete(shotId);
      } else {
        next.add(shotId);
      }
      return next;
    });
  };

  const handlePromptUpdate = useCallback((shotUuid: string, shotId: string, type: 'framePrompt' | 'videoPrompt', value: string) => {
    // Update local state immediately
    setPromptSets(prev => prev.map(ps =>
      ps.shotId === shotId ? { ...ps, [type]: value, hasChanges: true } : ps
    ));

    // Queue for auto-save
    setPendingUpdates(prev => {
      const next = new Map(prev);
      const existing = next.get(shotUuid) || {};
      next.set(shotUuid, { ...existing, [type]: value });
      return next;
    });
  }, []);

  // Validation helpers
  const hasAllPrompts = promptSets.every(ps => ps.framePrompt && ps.videoPrompt);
  const hasAnyPrompts = promptSets.some(ps => ps.framePrompt || ps.videoPrompt);

  const getFramePromptStatus = (prompt: string) => {
    if (prompt.length > FRAME_PROMPT_MAX) return 'error';
    if (prompt.length > FRAME_PROMPT_WARN) return 'warning';
    return 'ok';
  };

  const getVideoPromptStatus = (prompt: string) => {
    if (prompt.length > VIDEO_PROMPT_MAX) return 'error';
    if (prompt.length > VIDEO_PROMPT_WARN) return 'warning';
    return 'ok';
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading prompts...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !promptSets.length) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertTriangle className="w-8 h-8 text-destructive mx-auto" />
          <p className="text-destructive">{error}</p>
          <Button variant="outline" onClick={loadPrompts}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Empty state
  if (promptSets.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto" />
          <h3 className="text-lg font-medium">No Shots Found</h3>
          <p className="text-muted-foreground text-sm">
            This scene doesn't have any shots yet. Please go back to Stage 7 to extract shots first.
          </p>
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Shot List
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {(stage9Locked || stage9Outdated) && (
        <LockedStageHeader
          stageNumber={9}
          title="Prompt Segmentation"
          isLocked={stage9Locked}
          isOutdated={stage9Outdated}
          onBack={onBack}
          onNext={onNext}
          onUnlockAndEdit={async () => {
            try {
              const impact = await unlockStage(9);
              if (impact) { setUnlockImpact(impact); setShowUnlockWarning(true); }
            } catch { /* handled */ }
          }}
          onRelock={stage9Outdated ? () => relockStage(9) : undefined}
          lockAndProceedLabel="Lock & Proceed"
        />
      )}

      {/* Content Access Carousel */}
      <ContentAccessCarousel
        projectId={projectId}
        sceneId={sceneId}
        stageNumber={9}
      />

      {/* Header */}
      <div className="p-4 border-b border-border/50 flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Prompt Segmentation
            <Badge variant="outline" className="ml-2">Scene {sceneNumber}</Badge>
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Review and edit prompts for frame and video generation
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Save indicator */}
          {(isSaving || pendingUpdates.size > 0) && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {isSaving ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3 h-3" />
                  <span>Unsaved changes</span>
                </>
              )}
            </div>
          )}

          {/* Generate button */}
          <Button
            variant="gold"
            size="sm"
            onClick={handleGenerateAllPrompts}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                {hasAnyPrompts ? 'Regenerate All' : 'Generate All Prompts'}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Info banner */}
      <div className="px-6 py-3 bg-blue-500/10 border-b border-blue-500/20">
        <div className="flex items-center gap-2 text-xs text-blue-400">
          <Info className="w-4 h-4 flex-shrink-0" />
          <span>
            Frame prompts are read-only by default to preserve AI-generated precision.
            Video prompts are always editable for audio/dialogue tuning.
          </span>
        </div>
      </div>

      {/* Prompt Cards */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-4">
          {promptSets.map((promptSet, index) => {
            const isExpanded = expandedShots.includes(promptSet.shotId);
            const isEditingFrame = editingFramePrompts.has(promptSet.shotId);
            const isRegenerating = regeneratingShots.has(promptSet.shotId);
            const frameStatus = getFramePromptStatus(promptSet.framePrompt);
            const videoStatus = getVideoPromptStatus(promptSet.videoPrompt);
            const hasPrompts = promptSet.framePrompt && promptSet.videoPrompt;

            return (
              <motion.div
                key={promptSet.shotId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "bg-card/50 rounded-xl border overflow-hidden transition-colors",
                  hasPrompts ? "border-border/30" : "border-amber-500/30"
                )}
              >
                {/* Shot Header */}
                <button
                  onClick={() => toggleExpanded(promptSet.shotId)}
                  className="w-full p-4 flex items-center justify-between hover:bg-card/80 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="font-mono">
                      Shot {promptSet.shotId}
                    </Badge>
                    <div className="flex items-center gap-2">
                      {!hasPrompts && (
                        <Badge
                          variant="secondary"
                          className="bg-amber-500/20 text-amber-400 text-xs"
                        >
                          No prompts
                        </Badge>
                      )}
                      {promptSet.aiRecommendsEndFrame != null && (
                        <Badge
                          variant="secondary"
                          className={cn(
                            'text-xs select-none',
                            promptSet.aiRecommendsEndFrame
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-muted/40 text-muted-foreground'
                          )}
                        >
                          {promptSet.aiRecommendsEndFrame ? 'AI: End Frame' : 'AI: No End Frame'}
                        </Badge>
                      )}
                      {/* Transformation state badges */}
                      {promptSet.transformationContext?.map((tc, idx) => (
                        <Badge
                          key={idx}
                          variant="secondary"
                          className={cn(
                            'text-xs select-none',
                            tc.state === 'transforming'
                              ? 'bg-orange-500/20 text-orange-400'
                              : tc.state === 'post-transform'
                                ? 'bg-purple-500/20 text-purple-400'
                                : 'bg-muted/40 text-muted-foreground'
                          )}
                        >
                          {tc.assetName}: {tc.state === 'transforming' ? 'Transforming' : tc.state === 'post-transform' ? 'Post-Transform' : 'Pre-Transform'}
                        </Badge>
                      ))}
                      <div
                        className="flex items-center gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-[10px] text-muted-foreground">End Frame</span>
                        <Switch
                          checked={promptSet.requiresEndFrame}
                          onCheckedChange={(checked) => {
                            if (!promptSet.shotUuid) return;
                            // Optimistic local update
                            setPromptSets(prev => prev.map(ps =>
                              ps.shotId === promptSet.shotId ? { ...ps, requiresEndFrame: checked } : ps
                            ));
                            // Persist to backend
                            promptService.updatePrompt(projectId, sceneId, promptSet.shotUuid, {
                              requiresEndFrame: checked,
                            }).catch(() => {
                              // Revert on failure
                              setPromptSets(prev => prev.map(ps =>
                                ps.shotId === promptSet.shotId ? { ...ps, requiresEndFrame: !checked } : ps
                              ));
                              toast({
                                title: 'Error',
                                description: 'Failed to update end frame setting',
                                variant: 'destructive',
                              });
                            });
                          }}
                          className="scale-75"
                        />
                      </div>
                      {promptSet.hasChanges && (
                        <Badge
                          variant="secondary"
                          className="bg-yellow-500/20 text-yellow-400 text-xs"
                        >
                          Edited
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {promptSet.duration && (
                      <span className="text-xs text-muted-foreground">{promptSet.duration}s</span>
                    )}
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {/* Expanded Content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-border/30"
                    >
                      <div className="p-4 space-y-4">
                        {/* Shot context info */}
                        {(promptSet.action || promptSet.dialogue) && (
                          <div className="bg-muted/20 rounded-lg p-3 text-xs space-y-1">
                            {promptSet.action && (
                              <p><span className="text-muted-foreground">Action:</span> {promptSet.action}</p>
                            )}
                            {promptSet.dialogue && (
                              <p><span className="text-muted-foreground">Dialogue:</span> "{promptSet.dialogue}"</p>
                            )}
                            {promptSet.camera && (
                              <p><span className="text-muted-foreground">Camera:</span> {promptSet.camera}</p>
                            )}
                          </div>
                        )}

                        {/* Reference Image Thumbnails */}
                        {promptSet.referenceImageOrder && promptSet.referenceImageOrder.length > 0 && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-muted-foreground">Refs:</span>
                            {promptSet.referenceImageOrder.map((ref, idx) => (
                              <ReferenceImageThumbnail
                                key={idx}
                                url={ref.url}
                                assetName={ref.assetName}
                                type={ref.type}
                                index={idx}
                              />
                            ))}
                          </div>
                        )}

                        {/* Frame Prompt */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-foreground flex items-center gap-2">
                              <ImageIcon className="w-4 h-4 text-blue-400" />
                              Frame Prompt
                              <span className="text-xs text-muted-foreground">(Image Generation)</span>
                            </label>
                            <div className="flex items-center gap-3">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => promptSet.shotUuid && handleRegenerateShotPrompt(promptSet.shotUuid, promptSet.shotId)}
                                disabled={isRegenerating || !promptSet.shotUuid}
                                className="h-7 px-2"
                              >
                                {isRegenerating ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <RefreshCw className="w-3 h-3" />
                                )}
                              </Button>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">
                                  {isEditingFrame ? 'Editing' : 'Locked'}
                                </span>
                                <Switch
                                  checked={isEditingFrame}
                                  onCheckedChange={() => toggleFrameEditing(promptSet.shotId)}
                                />
                              </div>
                            </div>
                          </div>
                          <div className={cn(
                            'relative rounded-lg border transition-colors',
                            isEditingFrame ? 'border-blue-500/50' : 'border-border/30 bg-muted/20',
                            frameStatus === 'error' && 'border-destructive/50',
                            frameStatus === 'warning' && 'border-amber-500/50'
                          )}>
                            <Textarea
                              value={promptSet.framePrompt}
                              onChange={(e) => promptSet.shotUuid && handlePromptUpdate(
                                promptSet.shotUuid,
                                promptSet.shotId,
                                'framePrompt',
                                e.target.value
                              )}
                              disabled={!isEditingFrame}
                              rows={4}
                              placeholder="No frame prompt generated yet..."
                              className={cn(
                                'resize-none border-0',
                                !isEditingFrame && 'cursor-not-allowed opacity-80'
                              )}
                            />
                            {!isEditingFrame && (
                              <div className="absolute top-2 right-2">
                                <Lock className="w-4 h-4 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className={cn(
                              'text-xs',
                              frameStatus === 'error' ? 'text-destructive' :
                              frameStatus === 'warning' ? 'text-amber-400' :
                              'text-muted-foreground'
                            )}>
                              {promptSet.framePrompt.length}/{FRAME_PROMPT_MAX} characters
                            </span>
                            {frameStatus !== 'ok' && (
                              <span className="text-xs text-amber-400 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                {frameStatus === 'error' ? 'Prompt too long' : 'Consider shortening'}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Video Prompt */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-foreground flex items-center gap-2">
                              <Video className="w-4 h-4 text-purple-400" />
                              Video Prompt
                              <span className="text-xs text-muted-foreground">(Video Generation)</span>
                            </label>
                            <Badge variant="outline" className="text-xs">
                              <Unlock className="w-3 h-3 mr-1" />
                              Always Editable
                            </Badge>
                          </div>
                          <div className={cn(
                            'rounded-lg border transition-colors',
                            'border-purple-500/30',
                            videoStatus === 'error' && 'border-destructive/50',
                            videoStatus === 'warning' && 'border-amber-500/50'
                          )}>
                            <Textarea
                              value={promptSet.videoPrompt}
                              onChange={(e) => promptSet.shotUuid && handlePromptUpdate(
                                promptSet.shotUuid,
                                promptSet.shotId,
                                'videoPrompt',
                                e.target.value
                              )}
                              rows={4}
                              placeholder="No video prompt generated yet..."
                              className="resize-none border-0"
                            />
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className={cn(
                              'text-xs',
                              videoStatus === 'error' ? 'text-destructive' :
                              videoStatus === 'warning' ? 'text-amber-400' :
                              'text-muted-foreground'
                            )}>
                              {promptSet.videoPrompt.length}/{VIDEO_PROMPT_MAX} characters
                            </span>
                            {videoStatus !== 'ok' && (
                              <span className="text-xs text-amber-400 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                {videoStatus === 'error' ? 'Prompt too long' : 'Consider shortening'}
                              </span>
                            )}
                          </div>
                        </div>

                        {promptSet.promptsGeneratedAt && (
                          <div className="pt-2 border-t border-border/30">
                            <span className="text-xs text-muted-foreground">
                              Generated: {new Date(promptSet.promptsGeneratedAt).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Footer — hidden when locked */}
      {!stage9Locked && !stage9Outdated && (
        <div className="p-4 border-t border-border/50 flex items-center justify-between bg-card/30">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Visuals
          </Button>

          <div className="flex items-center gap-3">
            {!hasAllPrompts && (
              <span className="text-xs text-amber-400 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" />
                Some shots are missing prompts
              </span>
            )}
            <Button
              variant="gold"
              onClick={async () => {
                try { await lockStage(9); } catch { /* best-effort */ }
                onComplete();
              }}
              disabled={!hasAllPrompts || pendingUpdates.size > 0}
            >
              <Check className="w-4 h-4 mr-2" />
              Lock & Proceed
            </Button>
          </div>
        </div>
      )}

      <UnlockWarningDialog
        open={showUnlockWarning}
        onOpenChange={setShowUnlockWarning}
        impact={unlockImpact}
        stageNumber={9}
        stageTitle="Prompt Segmentation"
        onConfirm={async () => {
          try {
            setIsConfirmingUnlock(true);
            await confirmUnlock(9);
            setShowUnlockWarning(false);
            setUnlockImpact(null);
          } catch { /* handled */ } finally { setIsConfirmingUnlock(false); }
        }}
        isConfirming={isConfirmingUnlock}
      />
    </div>
  );
}
