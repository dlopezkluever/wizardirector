/**
 * TransformationEventCard
 * Displays a single transformation event in the Visual State Editor panel.
 * Unconfirmed events have yellow borders; confirmed have green.
 * Includes post-transformation image generation (Improvement 3) and
 * "Use Existing" picker trigger (Improvement 4).
 */

import { useState } from 'react';
import { Check, X, Sparkles, Loader2, Trash2, ArrowRight, Image as ImageIcon, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { TransformationEvent } from '@/types/scene';

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  instant: { label: 'Between Shots', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  gradual: { label: 'Gradual', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  within_shot: { label: 'Within Shot', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
};

export interface TransformationEventCardProps {
  event: TransformationEvent;
  onConfirm: (eventId: string) => void;
  onDismiss: (eventId: string) => void;
  onUpdate: (eventId: string, updates: { post_description?: string; transformation_narrative?: string }) => void;
  onGeneratePostDescription: (eventId: string) => void;
  onGeneratePostImage?: (eventId: string) => void;
  onOpenImagePicker?: (eventId: string) => void;
  isUpdating?: boolean;
  isGenerating?: boolean;
  isGeneratingImage?: boolean;
}

export function TransformationEventCard({
  event,
  onConfirm,
  onDismiss,
  onUpdate,
  onGeneratePostDescription,
  onGeneratePostImage,
  onOpenImagePicker,
  isUpdating,
  isGenerating,
  isGeneratingImage,
}: TransformationEventCardProps) {
  const [postDesc, setPostDesc] = useState(event.post_description);
  const [narrative, setNarrative] = useState(event.transformation_narrative ?? '');
  const [showFullImage, setShowFullImage] = useState(false);

  const typeInfo = TYPE_LABELS[event.transformation_type] ?? TYPE_LABELS.instant;
  const isConfirmed = event.confirmed;
  const borderColor = isConfirmed ? 'border-green-500/50' : 'border-yellow-500/50';
  const bgColor = isConfirmed ? 'bg-green-500/5' : 'bg-yellow-500/5';

  const triggerLabel = event.trigger_shot?.shot_id ?? 'Unknown shot';
  const completionLabel = event.completion_shot?.shot_id ?? null;

  const handlePostDescBlur = () => {
    if (postDesc !== event.post_description) {
      onUpdate(event.id, { post_description: postDesc });
    }
  };

  const handleNarrativeBlur = () => {
    if (narrative !== (event.transformation_narrative ?? '')) {
      onUpdate(event.id, { transformation_narrative: narrative });
    }
  };

  return (
    <div className={`rounded-lg border ${borderColor} ${bgColor} p-4 space-y-3`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`text-xs px-2 py-0.5 rounded-full border ${typeInfo.color}`}>
            {typeInfo.label}
          </span>
          <span className="text-xs text-muted-foreground">
            Shot {triggerLabel}
            {completionLabel && (
              <>
                <ArrowRight className="inline w-3 h-3 mx-1" />
                Shot {completionLabel}
              </>
            )}
          </span>
          {event.detected_by !== 'manual' && !isConfirmed && (
            <span className="text-xs text-yellow-400/70 italic">AI Detected</span>
          )}
        </div>
        {isConfirmed && (
          <span className="text-xs text-green-400 flex items-center gap-1">
            <Check className="w-3 h-3" /> Confirmed
          </span>
        )}
      </div>

      {/* Pre-description (read-only) */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Before</Label>
        <p className="text-sm text-foreground/80 bg-muted/30 rounded p-2 border border-border/20">
          {event.pre_description}
        </p>
      </div>

      {/* Post-description (editable) */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">After</Label>
          {!isConfirmed && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onGeneratePostDescription(event.id)}
              disabled={isGenerating}
              className="h-6 text-xs"
            >
              {isGenerating ? (
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
              ) : (
                <Sparkles className="w-3 h-3 mr-1" />
              )}
              Generate with AI
            </Button>
          )}
        </div>
        <Textarea
          value={postDesc}
          onChange={e => setPostDesc(e.target.value)}
          onBlur={handlePostDescBlur}
          rows={3}
          placeholder="Describe the asset's appearance after the transformation..."
          className="text-sm resize-y"
        />
      </div>

      {/* Transformation narrative (for within_shot / video prompt context) */}
      {(event.transformation_type === 'within_shot' || narrative) && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">
            Transformation Narrative
            {event.transformation_type === 'within_shot' && (
              <span className="text-orange-400 ml-1">(required for on-camera transforms)</span>
            )}
          </Label>
          <Textarea
            value={narrative}
            onChange={e => setNarrative(e.target.value)}
            onBlur={handleNarrativeBlur}
            rows={2}
            placeholder="What happens visually during the transformation..."
            className="text-sm resize-y"
          />
        </div>
      )}

      {/* Post-transformation image (Improvement 3) */}
      {isConfirmed && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <ImageIcon className="w-3 h-3" />
              Post-transformation Image
            </Label>
            {!event.post_image_key_url && (
              <span className="text-[10px] text-amber-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                No reference image
              </span>
            )}
          </div>

          {event.post_image_key_url ? (
            <div
              className="relative w-24 h-24 rounded-lg border border-border/30 overflow-hidden cursor-pointer group"
              onClick={() => setShowFullImage(!showFullImage)}
            >
              <img
                src={event.post_image_key_url}
                alt="Post-transformation"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-[10px] text-white">Click to {showFullImage ? 'hide' : 'enlarge'}</span>
              </div>
            </div>
          ) : null}

          {showFullImage && event.post_image_key_url && (
            <div className="rounded-lg border border-border/30 overflow-hidden">
              <img
                src={event.post_image_key_url}
                alt="Post-transformation (full)"
                className="w-full h-auto max-h-64 object-contain bg-muted/20"
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            {onGeneratePostImage && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onGeneratePostImage(event.id)}
                disabled={isGeneratingImage || !postDesc.trim()}
                className="text-xs h-7"
              >
                {isGeneratingImage ? (
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                ) : (
                  <Sparkles className="w-3 h-3 mr-1" />
                )}
                Generate Image
              </Button>
            )}
            {onOpenImagePicker && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenImagePicker(event.id)}
                className="text-xs h-7"
              >
                <ImageIcon className="w-3 h-3 mr-1" />
                Use Existing
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      {!isConfirmed && (
        <div className="flex items-center gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onConfirm(event.id)}
            disabled={isUpdating || !postDesc.trim()}
            className="text-green-400 border-green-500/30 hover:bg-green-500/10"
          >
            <Check className="w-4 h-4 mr-1" />
            Confirm
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDismiss(event.id)}
            disabled={isUpdating}
            className="text-muted-foreground hover:text-destructive"
          >
            <X className="w-4 h-4 mr-1" />
            Dismiss
          </Button>
        </div>
      )}

      {isConfirmed && (
        <div className="space-y-2 pt-1">
          <p className="text-xs text-muted-foreground/70 italic">
            {event.transformation_type === 'gradual' && completionLabel
              ? `This transformation applies from Shot ${completionLabel} onward for the rest of the scene.`
              : `This transformation applies from Shot ${triggerLabel} onward for the rest of the scene.`}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDismiss(event.id)}
              disabled={isUpdating}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Delete
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
