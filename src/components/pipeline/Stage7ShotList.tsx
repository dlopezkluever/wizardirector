import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Trash2, 
  Split, 
  Merge,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Clock,
  Users,
  Camera,
  MapPin,
  MessageSquare,
  Zap,
  Check,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  AlertCircle,
  Save,
  GripVertical,
  Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ContentAccessCarousel } from './ContentAccessCarousel';
import { shotService } from '@/lib/services/shotService';
import { sceneService } from '@/lib/services/sceneService';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Shot } from '@/types/scene';
import { LockedStageHeader } from './LockedStageHeader';
import { UnlockWarningDialog } from './UnlockWarningDialog';
import { useSceneStageLock } from '@/lib/hooks/useSceneStageLock';
import type { UnlockImpact } from '@/lib/services/sceneStageLockService';

export interface ValidationError {
  shotId: string;
  shotOrder: number;
  field: string;
  message: string;
  severity: 'error' | 'warning';
}
export type ValidationWarning = ValidationError;

interface Stage7ShotListProps {
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

export function Stage7ShotList({ projectId, sceneId, onComplete, onBack, onNext }: Stage7ShotListProps) {

  // Scene stage lock hook
  const {
    isLocked: isStageLocked,
    isOutdated: isStageOutdated,
    lockStage: lockStageViaHook,
    unlockStage: unlockStageViaHook,
    confirmUnlock: confirmUnlockViaHook,
    relockStage: relockStageViaHook,
  } = useSceneStageLock({ projectId, sceneId });

  // Unlock warning dialog state
  const [showUnlockWarning, setShowUnlockWarning] = useState(false);
  const [unlockImpact, setUnlockImpact] = useState<UnlockImpact | null>(null);
  const [isConfirmingUnlock, setIsConfirmingUnlock] = useState(false);

  const stage7Locked = isStageLocked(7);
  const stage7Outdated = isStageOutdated(7);

  // Main state
  const [shots, setShots] = useState<Shot[]>([]);
  const [selectedShot, setSelectedShot] = useState<Shot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Auto-save state
  const [pendingUpdates, setPendingUpdates] = useState<Map<string, Partial<Shot>>>(new Map());
  const [isSaving, setIsSaving] = useState(false);
  const debouncedUpdates = useDebounce(pendingUpdates, 800);
  
  // Split dialog state
  const [showSplitDialog, setShowSplitDialog] = useState(false);
  const [splitShotId, setSplitShotId] = useState<string | null>(null);
  const [splitGuidance, setSplitGuidance] = useState('');
  const [isSplitting, setIsSplitting] = useState(false);

  // Merge: direction and loading
  const [mergeDirection, setMergeDirection] = useState<'next' | 'previous'>('next');
  const [isMerging, setIsMerging] = useState(false);

  // Lock / validation state
  const [isSceneLocked, setIsSceneLocked] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<ValidationWarning[]>([]);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [isEditable, setIsEditable] = useState(true);

  // Sync isSceneLocked with stage lock hook
  useEffect(() => {
    if (stage7Locked || stage7Outdated) {
      setIsSceneLocked(true);
    }
  }, [stage7Locked, stage7Outdated]);

  // Initial data fetch
  useEffect(() => {
    const fetchOrExtractShots = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // 1. Try to fetch existing shots
        const existingShots = await shotService.fetchShots(projectId, sceneId);
        
        if (existingShots.length > 0) {
          // Shots already exist, display them
          setShots(existingShots);
          setSelectedShot(existingShots[0]);
        } else {
          // No shots exist, auto-extract
          setIsExtracting(true);
          toast({
            title: 'Extracting shots...',
            description: 'Using AI to break down scene into shots',
          });
          
          const extractedShots = await shotService.extractShots(projectId, sceneId);
          
          if (extractedShots.length === 0) {
            throw new Error('Shot extraction returned no shots');
          }
          
          setShots(extractedShots);
          setSelectedShot(extractedShots[0]);
          toast({
            title: 'Shots extracted successfully',
            description: `Created ${extractedShots.length} shots from scene`,
          });
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load shots';
        setError(errorMessage);
        toast({
          title: 'Error loading shots',
          description: errorMessage,
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
        setIsExtracting(false);
      }
    };
    
    fetchOrExtractShots();
  }, [projectId, sceneId]);

  // Fetch current scene lock status
  useEffect(() => {
    const fetchLockStatus = async () => {
      try {
        const scenes = await sceneService.fetchScenes(projectId);
        const currentScene = scenes.find(s => s.id === sceneId);
        setIsSceneLocked(!!currentScene?.shotListLockedAt);
      } catch (error) {
        console.error('Failed to fetch lock status:', error);
      }
    };

    fetchLockStatus();
  }, [projectId, sceneId]);

  // Auto-save effect
  useEffect(() => {
    const saveUpdates = async () => {
      if (debouncedUpdates.size === 0) return;
      
      setIsSaving(true);
      const updatePromises: Promise<void>[] = [];
      
      for (const [shotId, updates] of debouncedUpdates.entries()) {
        updatePromises.push(
          shotService.updateShot(projectId, sceneId, shotId, updates)
            .catch(error => {
              console.error(`Failed to save shot ${shotId}:`, error);
              toast({
                title: 'Failed to save changes',
                description: error instanceof Error ? error.message : 'Unknown error',
                variant: 'destructive',
              });
            })
        );
      }
      
      try {
        await Promise.all(updatePromises);
        setPendingUpdates(new Map()); // Clear after successful save
      } finally {
        setIsSaving(false);
      }
    };
    
    saveUpdates();
  }, [debouncedUpdates, projectId, sceneId]);

  // Handlers
  const handleShotUpdate = (shotId: string, field: keyof Shot, value: string | number | string[]) => {
    // Update local state immediately for responsive UI
    setShots(prev => prev.map(shot => 
      shot.id === shotId ? { ...shot, [field]: value } : shot
    ));
    
    if (selectedShot?.id === shotId) {
      setSelectedShot(prev => prev ? { ...prev, [field]: value } : null);
    }
    
    // Track pending update for debounced save
    setPendingUpdates(prev => {
      const updated = new Map(prev);
      const existing = updated.get(shotId) || {};
      updated.set(shotId, { ...existing, [field]: value });
      return updated;
    });
  };

  const handleSplitShot = (shotId: string) => {
    setSplitShotId(shotId);
    setShowSplitDialog(true);
  };

  const performSplit = async () => {
    if (!splitShotId) return;
    
    try {
      setIsSplitting(true);
      toast({
        title: 'Splitting shot...',
        description: 'Using AI to intelligently divide shot',
      });
      
      const newShots = await shotService.splitShot(
        projectId, 
        sceneId, 
        splitShotId, 
        splitGuidance || undefined
      );
      
      // Replace original shot with two new shots
      setShots(prev => {
        const index = prev.findIndex(s => s.id === splitShotId);
        if (index === -1) return prev;
        
        const updated = [...prev];
        updated.splice(index, 1, ...newShots);
        return updated;
      });
      
      setSelectedShot(newShots[0]);
      toast({
        title: 'Shot split successfully',
        description: `Created ${newShots.length} new shots`,
      });
      setShowSplitDialog(false);
      setSplitGuidance('');
      setSplitShotId(null);
    } catch (error) {
      toast({
        title: 'Failed to split shot',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsSplitting(false);
    }
  };

  const handleDeleteShot = async (shotId: string) => {
    try {
      await shotService.deleteShot(projectId, sceneId, shotId);
      
      setShots(prev => prev.filter(s => s.id !== shotId));
      
      if (selectedShot?.id === shotId) {
        setSelectedShot(shots.find(s => s.id !== shotId) || null);
      }
      
      toast({
        title: 'Shot deleted',
        description: 'Shot removed successfully',
      });
    } catch (error) {
      toast({
        title: 'Failed to delete shot',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const selectedIndex = selectedShot ? shots.findIndex(s => s.id === selectedShot.id) : -1;
  const hasNext = selectedIndex >= 0 && selectedIndex < shots.length - 1;
  const hasPrevious = selectedIndex > 0;
  const canMergeWithNext = hasNext;
  const canMergeWithPrevious = hasPrevious;
  const canMerge =
    (mergeDirection === 'next' && canMergeWithNext) || (mergeDirection === 'previous' && canMergeWithPrevious);

  const handleMergeShot = async () => {
    if (!selectedShot || !canMerge) return;
    try {
      setIsMerging(true);
      toast({
        title: 'Merging shots...',
        description: 'Using AI to combine shots',
      });
      const mergedShot = await shotService.mergeShot(projectId, sceneId, selectedShot.id, mergeDirection);
      const idx = shots.findIndex(s => s.id === selectedShot.id);
      const neighbourIdx = mergeDirection === 'next' ? idx + 1 : idx - 1;
      const neighbourId = shots[neighbourIdx]?.id;
      const lowerIdx = Math.min(idx, neighbourIdx);
      setShots(prev => {
        const withoutTwo = prev.filter(s => s.id !== selectedShot.id && s.id !== neighbourId);
        return [...withoutTwo.slice(0, lowerIdx), mergedShot, ...withoutTwo.slice(lowerIdx)];
      });
      setSelectedShot(mergedShot);
      toast({
        title: 'Shots merged',
        description: `Merged into ${mergedShot.shotId}`,
      });
    } catch (error) {
      toast({
        title: 'Failed to merge shots',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsMerging(false);
    }
  };

  const validateShotsLocally = (): { errors: ValidationError[]; warnings: ValidationWarning[] } => {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (shots.length === 0) {
      errors.push({
        shotId: 'scene',
        shotOrder: -1,
        field: 'shot_count',
        message: 'Scene must have at least one shot',
        severity: 'error',
      });
      return { errors, warnings };
    }

    const shotIdCounts = new Map<string, number>();
    shots.forEach(shot => {
      const count = shotIdCounts.get(shot.shotId) || 0;
      shotIdCounts.set(shot.shotId, count + 1);
    });
    shotIdCounts.forEach((count, shotId) => {
      if (count > 1) {
        errors.push({
          shotId,
          shotOrder: -1,
          field: 'shotId',
          message: `Duplicate shot ID "${shotId}" found`,
          severity: 'error',
        });
      }
    });

    shots.forEach((shot, index) => {
      if (!shot.action?.trim()) {
        errors.push({ shotId: shot.shotId, shotOrder: index, field: 'action', message: 'Action is required', severity: 'error' });
      }
      if (!shot.setting?.trim()) {
        errors.push({ shotId: shot.shotId, shotOrder: index, field: 'setting', message: 'Setting is required', severity: 'error' });
      }
      if (!shot.camera?.trim()) {
        errors.push({ shotId: shot.shotId, shotOrder: index, field: 'camera', message: 'Camera is required', severity: 'error' });
      }
      if (shot.duration < 1) {
        errors.push({ shotId: shot.shotId, shotOrder: index, field: 'duration', message: 'Minimum duration is 1 second', severity: 'error' });
      } else if (shot.duration > 30) {
        errors.push({ shotId: shot.shotId, shotOrder: index, field: 'duration', message: 'Maximum duration is 30 seconds', severity: 'error' });
      } else if (shot.duration < 4) {
        warnings.push({ shotId: shot.shotId, shotOrder: index, field: 'duration', message: `Duration ${shot.duration}s is very short`, severity: 'warning' });
      } else if (shot.duration > 12) {
        warnings.push({ shotId: shot.shotId, shotOrder: index, field: 'duration', message: `Duration ${shot.duration}s is unusually long`, severity: 'warning' });
      }
    });

    const totalDuration = shots.reduce((sum, s) => sum + s.duration, 0);
    const expectedMin = shots.length * 4;
    const expectedMax = shots.length * 15;
    if (totalDuration < expectedMin) {
      warnings.push({ shotId: 'scene', shotOrder: -1, field: 'total_duration', message: `Scene duration (${totalDuration}s) is unusually short for ${shots.length} shots`, severity: 'warning' });
    } else if (totalDuration > expectedMax) {
      warnings.push({ shotId: 'scene', shotOrder: -1, field: 'total_duration', message: `Scene duration (${totalDuration}s) is very long for ${shots.length} shots`, severity: 'warning' });
    }

    return { errors, warnings };
  };

  const canEdit = !isSceneLocked && isEditable;

  const getFieldValidationState = (shot: Shot, field: string): 'valid' | 'warning' | 'error' => {
    if (!canEdit) return 'valid';
    if (field === 'action' && !shot.action?.trim()) return 'error';
    if (field === 'camera' && !shot.camera?.trim()) return 'error';
    if (field === 'setting' && !shot.setting?.trim()) return 'error';
    if (field === 'duration') {
      if (shot.duration < 1 || shot.duration > 30) return 'error';
      if (shot.duration < 4 || shot.duration > 12) return 'warning';
    }
    return 'valid';
  };

  const lockShotList = async (force: boolean) => {
    try {
      await shotService.lockShotList(projectId, sceneId, force);
      // Also lock via new stage_locks system
      try { await lockStageViaHook(7); } catch { /* best-effort */ }
      setIsSceneLocked(true);
      toast({
        title: 'Shot list locked',
        description: 'Scene is ready for asset assignment',
      });
      setShowValidationModal(false);
      onComplete();
    } catch (error: unknown) {
      const err = error as { status?: number; data?: { errors?: ValidationError[]; warnings?: ValidationWarning[] }; message?: string };
      setIsLocking(false);
      if (err.status === 409) {
        setValidationWarnings(err.data?.warnings ?? []);
        setShowValidationModal(true);
        setIsEditable(true);
      } else if (err.status === 400) {
        setValidationErrors(err.data?.errors ?? []);
        setShowValidationModal(true);
        setIsEditable(true);
        toast({
          title: 'Validation failed',
          description: `${(err.data?.errors?.length ?? 0)} issues must be fixed`,
          variant: 'destructive',
        });
      } else {
        setIsEditable(true);
        toast({
          title: 'Failed to lock shot list',
          description: err.message ?? 'Unknown error',
          variant: 'destructive',
        });
      }
    }
  };

  const handleLockShotList = async () => {
    try {
      setIsLocking(true);
      setIsEditable(false);

      if (pendingUpdates.size > 0) {
        toast({
          title: 'Saving final changes...',
          description: 'Please wait',
        });
        const dirtyUpdates: Array<{ shotId: string; updates: Partial<Shot> }> = [];
        for (const [shotId, updates] of pendingUpdates.entries()) {
          dirtyUpdates.push({ shotId, updates });
        }
        try {
          await Promise.all(
            dirtyUpdates.map(({ shotId, updates }) => shotService.updateShot(projectId, sceneId, shotId, updates))
          );
          setPendingUpdates(new Map());
        } catch (saveError) {
          console.error('Failed to save pending changes:', saveError);
          toast({
            title: 'Failed to save changes',
            description: saveError instanceof Error ? saveError.message : 'Please try again',
            variant: 'destructive',
          });
          setIsEditable(true);
          setIsLocking(false);
          return;
        }
        await new Promise(resolve => setTimeout(resolve, 150));
      }

      const { errors, warnings } = validateShotsLocally();
      setValidationErrors(errors);
      setValidationWarnings(warnings);

      if (errors.length > 0 || warnings.length > 0) {
        setShowValidationModal(true);
        setIsEditable(true);
        return;
      }

      await lockShotList(false);
    } catch (error) {
      console.error('Lock handler error:', error);
      setIsEditable(true);
      toast({
        title: 'Failed to lock shot list',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsLocking(false);
    }
  };

  const handleUnlockAndEdit = async () => {
    try {
      const impact = await unlockStageViaHook(7);
      if (impact) {
        setUnlockImpact(impact);
        setShowUnlockWarning(true);
      }
    } catch (error) {
      toast({
        title: 'Failed to unlock',
        description: error instanceof Error ? error.message : 'Could not unlock shot list',
        variant: 'destructive',
      });
    }
  };

  const handleConfirmUnlock = async () => {
    try {
      setIsConfirmingUnlock(true);
      await confirmUnlockViaHook(7);
      // Also unlock via old system for backward compat
      try {
        await shotService.unlockShotList(projectId, sceneId, { confirm: true });
      } catch {
        // Old system unlock is best-effort
      }
      setIsSceneLocked(false);
      setShowUnlockWarning(false);
      setUnlockImpact(null);
      toast({
        title: 'Shot list unlocked',
        description: 'You can edit the shot list again.',
      });
    } catch (error) {
      toast({
        title: 'Failed to unlock',
        description: error instanceof Error ? error.message : 'Could not unlock shot list',
        variant: 'destructive',
      });
    } finally {
      setIsConfirmingUnlock(false);
    }
  };

  const handleRelock = async () => {
    try {
      await relockStageViaHook(7);
      toast({ title: 'Shot list re-locked' });
    } catch (error) {
      toast({
        title: 'Failed to re-lock',
        description: error instanceof Error ? error.message : 'Could not re-lock shot list',
        variant: 'destructive',
      });
    }
  };

  // Calculate total duration
  const totalDuration = shots.reduce((sum, shot) => sum + shot.duration, 0);

  // Loading and error states
  if (isLoading || isExtracting) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-lg text-foreground font-medium mb-2">
              {isExtracting ? 'Extracting Shots from Scene' : 'Loading Shots'}
            </p>
            <p className="text-sm text-muted-foreground">
              {isExtracting ? 'AI is analyzing the scene and breaking it into shots...' : 'Please wait...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-destructive" />
            <p className="text-lg text-foreground font-medium mb-2">Failed to Load Shots</p>
            <p className="text-sm text-muted-foreground mb-6">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (shots.length === 0) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg text-muted-foreground">No shots available</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Locked/Outdated Stage Header */}
      {(stage7Locked || stage7Outdated) && (
        <LockedStageHeader
          stageNumber={7}
          title="Shot List"
          subtitle={`${shots.length} shots • ${totalDuration}s total`}
          isLocked={stage7Locked}
          isOutdated={stage7Outdated}
          onBack={onBack}
          onNext={onNext}
          onUnlockAndEdit={handleUnlockAndEdit}
          onRelock={stage7Outdated ? handleRelock : undefined}
          lockAndProceedLabel="Lock Shot List & Proceed"
        />
      )}

      {/* Content Access Carousel */}
      <ContentAccessCarousel
        projectId={projectId}
        sceneId={sceneId}
        stageNumber={7}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Shot List - Left Panel */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-96 border-r border-border/50 bg-card/30 backdrop-blur-sm flex flex-col"
        >
          <div className="p-4 border-b border-border/50">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-display text-lg font-semibold text-foreground">Shot List</h2>
                <p className="text-xs text-muted-foreground">
                  {shots.length} shots • {totalDuration}s total
                </p>
              </div>
              {isSaving && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Saving...</span>
                </div>
              )}
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2 space-y-2">
              <AnimatePresence mode="popLayout">
                {shots.map((shot, index) => (
                  <motion.button
                    key={shot.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={() => setSelectedShot(shot)}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className={cn(
                      'w-full p-3 rounded-lg text-left transition-all relative group',
                      selectedShot?.id === shot.id 
                        ? 'bg-primary/10 border-2 border-primary/40 shadow-md' 
                        : 'bg-card/50 border border-border/30 hover:border-border hover:bg-card/70'
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "font-mono text-xs",
                            selectedShot?.id === shot.id && "border-primary/50 text-primary"
                          )}
                        >
                          {shot.shotId}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {shot.duration}s
                        </span>
                      </div>
                      <ChevronRight className={cn(
                        'w-4 h-4 transition-transform',
                        selectedShot?.id === shot.id ? 'text-primary translate-x-1' : 'text-muted-foreground'
                      )} />
                    </div>
                    
                    <p className="text-sm text-foreground line-clamp-2 mb-1">
                      {shot.action || 'No action defined'}
                    </p>
                    
                    {shot.dialogue && (
                      <p className="text-xs text-primary/70 mt-1 italic line-clamp-1">
                        "{shot.dialogue}"
                      </p>
                    )}

                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {shot.charactersForeground.length > 0 && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {shot.charactersForeground.slice(0, 2).join(', ')}
                          {shot.charactersForeground.length > 2 && ` +${shot.charactersForeground.length - 2}`}
                        </span>
                      )}
                      {shot.camera && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Camera className="w-3 h-3" />
                          {shot.camera.split(',')[0]}
                        </span>
                      )}
                    </div>
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          </ScrollArea>
        </motion.div>

        {/* Shot Inspector - Main Panel */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex-1 flex flex-col overflow-hidden"
        >
          {selectedShot ? (
            <>
              {/* Lock banner removed — replaced by LockedStageHeader */}
              {/* Inspector Header */}
              <div className="p-4 border-b border-border/50 bg-card/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="font-mono text-lg px-3 py-1.5 border-primary/30">
                      {selectedShot.shotId}
                    </Badge>
                    <div>
                      <p className="text-sm text-foreground font-medium">Shot Inspector</p>
                      {selectedShot.beatReference && (
                        <p className="text-xs text-muted-foreground">{selectedShot.beatReference}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={!canEdit}
                      onClick={() => handleSplitShot(selectedShot.id)}
                      className="border-primary/20 hover:border-primary/40"
                    >
                      <Split className="w-4 h-4 mr-1.5" />
                      Split Shot
                    </Button>
                    <div className="flex items-center gap-1">
                      <div className="flex rounded-md border border-border/50 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setMergeDirection('next')}
                          disabled={!canEdit}
                          className={cn(
                            'px-2 py-1.5 text-xs flex items-center gap-1 transition-colors',
                            mergeDirection === 'next'
                              ? 'bg-primary/20 text-primary'
                              : 'bg-muted/30 text-muted-foreground hover:text-foreground',
                            !canEdit && 'opacity-50 cursor-not-allowed'
                          )}
                          title="Merge with next shot"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                          Next
                        </button>
                        <button
                          type="button"
                          onClick={() => setMergeDirection('previous')}
                          disabled={!canEdit}
                          className={cn(
                            'px-2 py-1.5 text-xs flex items-center gap-1 transition-colors',
                            mergeDirection === 'previous'
                              ? 'bg-primary/20 text-primary'
                              : 'bg-muted/30 text-muted-foreground hover:text-foreground',
                            !canEdit && 'opacity-50 cursor-not-allowed'
                          )}
                          title="Merge with previous shot"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                          Prev
                        </button>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        disabled={!canEdit || !canMerge || isMerging}
                        onClick={handleMergeShot}
                        className="border-primary/20 hover:border-primary/40"
                      >
                        {isMerging ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Merge className="w-4 h-4 mr-1.5" />}
                        Merge
                      </Button>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      disabled={!canEdit}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteShot(selectedShot.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-1.5" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-6 space-y-6 max-w-4xl">
                  {/* Duration */}
                  <div>
                    <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-primary" />
                      Duration (seconds)
                    </label>
                    <Input
                      type="number"
                      value={selectedShot.duration}
                      onChange={(e) => handleShotUpdate(selectedShot.id, 'duration', parseInt(e.target.value) || 8)}
                      min={1}
                      max={30}
                      disabled={!canEdit || isSaving}
                      className={cn(
                        'w-32',
                        getFieldValidationState(selectedShot, 'duration') === 'error' && 'border-b-2 border-b-red-500',
                        getFieldValidationState(selectedShot, 'duration') === 'warning' && 'border-b-2 border-b-yellow-500'
                      )}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Typical shot length is 8 seconds
                    </p>
                  </div>

                  {/* Action */}
                  <div>
                    <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                      <Zap className="w-4 h-4 text-primary" />
                      Action
                      <span className="text-xs text-muted-foreground font-normal">(Required)</span>
                    </label>
                    <Textarea
                      value={selectedShot.action}
                      onChange={(e) => handleShotUpdate(selectedShot.id, 'action', e.target.value)}
                      disabled={!canEdit || isSaving}
                      placeholder="Describe the atomic physical action for this shot..."
                      rows={4}
                      className={cn(
                        'resize-none',
                        getFieldValidationState(selectedShot, 'action') === 'error' && 'border-b-2 border-b-red-500',
                        getFieldValidationState(selectedShot, 'action') === 'warning' && 'border-b-2 border-b-yellow-500'
                      )}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Describe specific physical movements and visual details
                    </p>
                  </div>

                  {/* Dialogue */}
                  <div>
                    <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                      <MessageSquare className="w-4 h-4 text-primary" />
                      Dialogue (Verbatim)
                      <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
                    </label>
                    <Textarea
                      value={selectedShot.dialogue}
                      onChange={(e) => handleShotUpdate(selectedShot.id, 'dialogue', e.target.value)}
                      disabled={!canEdit || isSaving}
                      placeholder="CHARACTER: Exact dialogue spoken in this shot..."
                      rows={3}
                      className="resize-none font-mono text-sm"
                    />
                  </div>

                  {/* Characters */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-primary" />
                        Foreground Characters
                      </label>
                      <Input
                        value={selectedShot.charactersForeground.join(', ')}
                        onChange={(e) => handleShotUpdate(selectedShot.id, 'charactersForeground', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                        disabled={!canEdit || isSaving}
                        placeholder="Maya, John"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Comma-separated list
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        Background Characters
                      </label>
                      <Input
                        value={selectedShot.charactersBackground.join(', ')}
                        onChange={(e) => handleShotUpdate(selectedShot.id, 'charactersBackground', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                        disabled={!canEdit || isSaving}
                        placeholder="Crowd, extras"
                      />
                    </div>
                  </div>

                  {/* Setting */}
                  <div>
                    <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      Setting
                    </label>
                    <Input
                      value={selectedShot.setting}
                      onChange={(e) => handleShotUpdate(selectedShot.id, 'setting', e.target.value)}
                      disabled={!canEdit || isSaving}
                      placeholder="Train Platform - Dawn"
                      className={cn(
                        getFieldValidationState(selectedShot, 'setting') === 'error' && 'border-b-2 border-b-red-500',
                        getFieldValidationState(selectedShot, 'setting') === 'warning' && 'border-b-2 border-b-yellow-500'
                      )}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Specific location and lighting conditions
                    </p>
                  </div>

                  {/* Camera */}
                  <div>
                    <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                      <Camera className="w-4 h-4 text-primary" />
                      Camera
                    </label>
                    <Input
                      value={selectedShot.camera}
                      onChange={(e) => handleShotUpdate(selectedShot.id, 'camera', e.target.value)}
                      disabled={!canEdit || isSaving}
                      placeholder="Wide shot, tracking left to right"
                      className={cn(
                        getFieldValidationState(selectedShot, 'camera') === 'error' && 'border-b-2 border-b-red-500',
                        getFieldValidationState(selectedShot, 'camera') === 'warning' && 'border-b-2 border-b-yellow-500'
                      )}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Shot type, movement, and angle
                    </p>
                  </div>

                  {/* Beat Reference (Read-only) */}
                  {selectedShot.beatReference && (
                    <div className="bg-card/50 border border-border/30 rounded-lg p-4">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Beat Reference</p>
                      <p className="text-sm text-foreground">{selectedShot.beatReference}</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Camera className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground">Select a shot to inspect and edit</p>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Footer Actions — only shown when not locked */}
      {!stage7Locked && !stage7Outdated && (
        <div className="p-4 border-t border-border/50 flex items-center justify-between bg-card/30 backdrop-blur-sm">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Script Hub
          </Button>

          <div className="flex items-center gap-3">
            {pendingUpdates.size > 0 && (
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Save className="w-3 h-3" />
                Unsaved changes
              </span>
            )}
            <Button
              variant="default"
              onClick={handleLockShotList}
              disabled={isSceneLocked || !canEdit || isSaving || shots.length === 0 || isLocking}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isLocking ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Locking...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Lock Shot List & Proceed
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Validation Modal */}
      <Dialog open={showValidationModal} onOpenChange={setShowValidationModal}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Shot List Validation
            </DialogTitle>
            <DialogDescription>
              {validationErrors.length > 0
                ? 'Please fix the following issues before locking:'
                : 'The following warnings were found. You can fix them or proceed anyway.'}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-96">
            <div className="space-y-4">
              {validationErrors.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-destructive mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Errors ({validationErrors.length})
                  </h4>
                  <div className="space-y-2">
                    {validationErrors.map((error, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          const shot = shots.find(s => s.shotId === error.shotId);
                          if (shot) setSelectedShot(shot);
                          setShowValidationModal(false);
                        }}
                        className="w-full text-left p-3 rounded-md bg-destructive/10 border border-destructive/30 hover:bg-destructive/20 transition-colors"
                      >
                        <div className="flex items-start gap-2">
                          <Badge variant="destructive" className="font-mono text-xs">
                            {error.shotId}
                          </Badge>
                          <span className="text-sm text-foreground">{error.message}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {validationWarnings.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-yellow-600 dark:text-yellow-500 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Warnings ({validationWarnings.length})
                  </h4>
                  <div className="space-y-2">
                    {validationWarnings.map((warning, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          if (warning.shotId !== 'scene') {
                            const shot = shots.find(s => s.shotId === warning.shotId);
                            if (shot) setSelectedShot(shot);
                          }
                          setShowValidationModal(false);
                        }}
                        className="w-full text-left p-3 rounded-md bg-yellow-500/10 border border-yellow-500/30 hover:bg-yellow-500/20 transition-colors"
                      >
                        <div className="flex items-start gap-2">
                          <Badge variant="outline" className="font-mono text-xs border-yellow-500/50">
                            {warning.shotId}
                          </Badge>
                          <span className="text-sm text-foreground">{warning.message}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="flex-row gap-2 sm:gap-2">
            <Button
              variant="ghost"
              onClick={() => setShowValidationModal(false)}
            >
              {validationErrors.length > 0 ? 'Fix Issues' : 'Go Back'}
            </Button>

            {validationErrors.length === 0 && validationWarnings.length > 0 && (
              <Button
                onClick={() => {
                  setIsLocking(true);
                  lockShotList(true);
                }}
                disabled={isLocking}
                className="bg-primary hover:bg-primary/90"
              >
                {isLocking ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Locking...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Lock Anyway
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unlock Warning Dialog (single dialog replacing 3-dialog cascade) */}
      <UnlockWarningDialog
        open={showUnlockWarning}
        onOpenChange={setShowUnlockWarning}
        impact={unlockImpact}
        stageNumber={7}
        stageTitle="Shot List"
        onConfirm={handleConfirmUnlock}
        isConfirming={isConfirmingUnlock}
      />

      {/* Split Shot Dialog */}
      <Dialog open={showSplitDialog} onOpenChange={setShowSplitDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Split className="w-5 h-5 text-primary" />
              Split Shot
            </DialogTitle>
            <DialogDescription>
              The AI will intelligently divide this shot into two coherent shots. 
              Optionally provide guidance for how to split it.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Textarea
              value={splitGuidance}
              onChange={(e) => setSplitGuidance(e.target.value)}
              placeholder="e.g., 'Split after the character turns around' (optional)"
              rows={3}
              className="resize-none"
            />
            
            {splitShotId && (
              <div className="bg-card/50 border border-border/30 rounded-lg p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">Current Shot</p>
                <p className="text-sm text-foreground">
                  {shots.find(s => s.id === splitShotId)?.action}
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="flex-row gap-2 sm:gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setShowSplitDialog(false);
                setSplitGuidance('');
                setSplitShotId(null);
              }}
              disabled={isSplitting}
            >
              Cancel
            </Button>
            <Button
              onClick={performSplit}
              disabled={isSplitting}
              className="bg-primary hover:bg-primary/90"
            >
              {isSplitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Splitting...
                </>
              ) : (
                <>
                  <Split className="w-4 h-4 mr-2" />
                  Split Shot
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
