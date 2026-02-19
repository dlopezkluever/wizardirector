/**
 * AddTransformationDialog
 * Dialog for manually creating a transformation event.
 * User picks the trigger shot, type, and provides descriptions.
 */

import { useState } from 'react';
import { Plus } from 'lucide-react';
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
import type { Shot, TransformationType } from '@/types/scene';

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
}

export function AddTransformationDialog({
  shots,
  assetInstanceId,
  preDescription,
  onAdd,
  disabled,
}: AddTransformationDialogProps) {
  const [open, setOpen] = useState(false);
  const [triggerShotId, setTriggerShotId] = useState('');
  const [completionShotId, setCompletionShotId] = useState('');
  const [type, setType] = useState<TransformationType>('instant');
  const [postDescription, setPostDescription] = useState('');
  const [narrative, setNarrative] = useState('');

  const reset = () => {
    setTriggerShotId('');
    setCompletionShotId('');
    setType('instant');
    setPostDescription('');
    setNarrative('');
  };

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
      <DialogContent className="max-w-lg">
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
                <SelectItem value="instant">Instant (cut-based)</SelectItem>
                <SelectItem value="within_shot">Within Shot (on-camera)</SelectItem>
                <SelectItem value="gradual">Gradual (spans shots)</SelectItem>
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
            <Label className="text-sm">After (post-transformation appearance)</Label>
            <Textarea
              value={postDescription}
              onChange={e => setPostDescription(e.target.value)}
              rows={3}
              placeholder="Describe the asset's appearance after the transformation..."
              className="resize-y"
            />
          </div>

          {/* Narrative */}
          {(type === 'within_shot' || narrative) && (
            <div className="space-y-1">
              <Label className="text-sm">
                Transformation Narrative
                {type === 'within_shot' && <span className="text-orange-400 ml-1">(recommended)</span>}
              </Label>
              <Textarea
                value={narrative}
                onChange={e => setNarrative(e.target.value)}
                rows={2}
                placeholder="What happens visually during the transformation..."
                className="resize-y"
              />
            </div>
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
