/**
 * AddTransformationDialog
 * Dialog for manually creating a transformation event.
 * User picks the trigger shot, type, and provides descriptions.
 * Includes agentic pre-fill (Improvement 1) and collapsible context (Improvement 2).
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Info, Loader2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { transformationEventService } from '@/lib/services/transformationEventService';
import type { Shot, TransformationType } from '@/types/scene';

const TYPE_OPTIONS: Array<{
  value: TransformationType;
  label: string;
  tooltip: string;
}> = [
  {
    value: 'instant',
    label: 'Between Shots (off-camera)',
    tooltip: 'The change happens off-screen between cuts. The asset appears differently starting at the selected shot.',
  },
  {
    value: 'within_shot',
    label: 'Within Shot (on-camera)',
    tooltip: 'The transformation happens visually during this shot. The camera captures the moment of change.',
  },
  {
    value: 'gradual',
    label: 'Gradual (spans multiple shots)',
    tooltip: 'The transformation unfolds across several shots, starting at trigger and completing at the completion shot.',
  },
];

export interface AddTransformationDialogProps {
  shots: Shot[];
  assetInstanceId: string;
  preDescription: string;
  onAdd: (data: {
    trigger_shot_id: string;
    transformation_type: TransformationType;
    completion_shot_id?: string | null;
    post_description: string;
    transformation_narrative?: string;
  }) => void;
  disabled?: boolean;
  projectId: string;
  sceneId: string;
  sceneScriptExcerpt?: string;
}

export function AddTransformationDialog({
  shots,
  assetInstanceId,
  preDescription,
  onAdd,
  disabled,
  projectId,
  sceneId,
  sceneScriptExcerpt,
}: AddTransformationDialogProps) {
  const [open, setOpen] = useState(false);
  const [triggerShotId, setTriggerShotId] = useState('');
  const [completionShotId, setCompletionShotId] = useState('');
  const [type, setType] = useState<TransformationType>('instant');
  const [postDescription, setPostDescription] = useState('');
  const [narrative, setNarrative] = useState('');
  const [isPrefilling, setIsPrefilling] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);

  // Track whether user has manually typed to avoid overwriting
  const userEditedPost = useRef(false);
  const userEditedNarrative = useRef(false);

  const reset = () => {
    setTriggerShotId('');
    setCompletionShotId('');
    setType('instant');
    setPostDescription('');
    setNarrative('');
    setIsPrefilling(false);
    setContextOpen(false);
    userEditedPost.current = false;
    userEditedNarrative.current = false;
  };

  // Auto-prefill when trigger shot is selected
  useEffect(() => {
    if (!triggerShotId || !projectId || !sceneId || !assetInstanceId) return;

    // Only prefill empty fields
    if (userEditedPost.current && userEditedNarrative.current) return;

    let cancelled = false;
    setIsPrefilling(true);

    transformationEventService.generatePrefill(projectId, sceneId, {
      trigger_shot_id: triggerShotId,
      scene_asset_instance_id: assetInstanceId,
      transformation_type: type,
    })
      .then(result => {
        if (cancelled) return;
        if (!userEditedPost.current && result.post_description) {
          setPostDescription(result.post_description);
        }
        if (!userEditedNarrative.current && result.transformation_narrative) {
          setNarrative(result.transformation_narrative);
        }
      })
      .catch(() => { /* silently fail — user can still type manually */ })
      .finally(() => { if (!cancelled) setIsPrefilling(false); });

    return () => { cancelled = true; };
  }, [triggerShotId, projectId, sceneId, assetInstanceId, type]);

  const selectedShot = useMemo(
    () => shots.find(s => s.id === triggerShotId),
    [shots, triggerShotId]
  );

  const handleSubmit = () => {
    if (!triggerShotId || !postDescription.trim()) return;
    onAdd({
      trigger_shot_id: triggerShotId,
      transformation_type: type,
      completion_shot_id: type === 'gradual' && completionShotId ? completionShotId : null,
      post_description: postDescription.trim(),
      transformation_narrative: narrative.trim() || undefined,
    });
    reset();
    setOpen(false);
  };

  const canSubmit = triggerShotId && postDescription.trim() &&
    (type !== 'gradual' || completionShotId);

  return (
    <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <Plus className="w-4 h-4 mr-1" />
          Add Transformation
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Transformation Event</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Trigger shot */}
          <div className="space-y-1">
            <Label className="text-sm">Trigger Shot</Label>
            <Select value={triggerShotId} onValueChange={setTriggerShotId}>
              <SelectTrigger>
                <SelectValue placeholder="Select the shot where transformation occurs" />
              </SelectTrigger>
              <SelectContent>
                {shots.map(shot => (
                  <SelectItem key={shot.id} value={shot.id}>
                    Shot {shot.shotId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Type */}
          <div className="space-y-1">
            <Label className="text-sm">Transformation Type</Label>
            <Select value={type} onValueChange={v => setType(v as TransformationType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <TooltipProvider delayDuration={200}>
                  {TYPE_OPTIONS.map(opt => (
                    <div key={opt.value} className="flex items-center gap-1">
                      <SelectItem value={opt.value} className="flex-1">
                        {opt.label}
                      </SelectItem>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0 mr-2 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-[240px]">
                          <p className="text-xs">{opt.tooltip}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  ))}
                </TooltipProvider>
              </SelectContent>
            </Select>
          </div>

          {/* Completion shot (gradual only) */}
          {type === 'gradual' && (
            <div className="space-y-1">
              <Label className="text-sm">Completion Shot</Label>
              <Select value={completionShotId} onValueChange={setCompletionShotId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select the shot where transformation completes" />
                </SelectTrigger>
                <SelectContent>
                  {shots.map(shot => (
                    <SelectItem key={shot.id} value={shot.id}>
                      Shot {shot.shotId}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Pre-description (read-only) */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Before (from current description)</Label>
            <p className="text-sm text-foreground/80 bg-muted/30 rounded p-2 border border-border/20">
              {preDescription || 'No description available'}
            </p>
          </div>

          {/* Post-description */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-sm">After (post-transformation appearance)</Label>
              {isPrefilling && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  AI pre-filling...
                </span>
              )}
            </div>
            <Textarea
              value={postDescription}
              onChange={e => {
                setPostDescription(e.target.value);
                userEditedPost.current = true;
              }}
              rows={3}
              placeholder="Describe the asset's appearance after the transformation..."
              className="resize-y"
            />
          </div>

          {/* Narrative — always show when there's a trigger shot or content */}
          {(type === 'within_shot' || narrative || triggerShotId) && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-sm">
                  Transformation Narrative
                  {type === 'within_shot' && <span className="text-orange-400 ml-1">(recommended)</span>}
                </Label>
                {isPrefilling && (
                  <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                )}
              </div>
              <Textarea
                value={narrative}
                onChange={e => {
                  setNarrative(e.target.value);
                  userEditedNarrative.current = true;
                }}
                rows={2}
                placeholder="What happens visually during the transformation..."
                className="resize-y"
              />
            </div>
          )}

          {/* Collapsible Context Section (Improvement 2) */}
          {selectedShot && (
            <Collapsible open={contextOpen} onOpenChange={setContextOpen}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
                >
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${contextOpen ? '' : '-rotate-90'}`} />
                  Shot &amp; Scene Context
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 space-y-2 rounded-lg border border-border/30 bg-muted/20 p-3">
                  {selectedShot.action && (
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Action</span>
                      <p className="text-xs text-foreground/80 mt-0.5">{selectedShot.action}</p>
                    </div>
                  )}
                  {selectedShot.dialogue && (
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Dialogue</span>
                      <p className="text-xs text-foreground/80 mt-0.5 italic">{selectedShot.dialogue}</p>
                    </div>
                  )}
                  {selectedShot.setting && (
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Setting</span>
                      <p className="text-xs text-foreground/80 mt-0.5">{selectedShot.setting}</p>
                    </div>
                  )}
                  {selectedShot.camera && (
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Camera</span>
                      <p className="text-xs text-foreground/80 mt-0.5">{selectedShot.camera}</p>
                    </div>
                  )}
                  {sceneScriptExcerpt && (
                    <div className="border-t border-border/20 pt-2 mt-2">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Scene Script</span>
                      <p className="text-xs text-foreground/60 mt-0.5 whitespace-pre-wrap line-clamp-6">
                        {sceneScriptExcerpt.substring(0, 500)}
                      </p>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
