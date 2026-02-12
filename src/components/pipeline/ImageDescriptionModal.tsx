import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface ImageDescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  assetName: string;
  currentDescription: string;
  extractedDescription: string;
  suggestedMerge: string;
  confidence: number;
  onKeepCurrent: () => void;
  onReplaceWithExtracted: () => void;
  onUseMerged: (mergedText: string) => void;
}

export function ImageDescriptionModal({
  isOpen,
  onClose,
  assetName,
  currentDescription,
  extractedDescription,
  suggestedMerge,
  confidence,
  onKeepCurrent,
  onReplaceWithExtracted,
  onUseMerged,
}: ImageDescriptionModalProps) {
  const [editedMerge, setEditedMerge] = useState(suggestedMerge);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Image Description Extracted</DialogTitle>
          <DialogDescription>
            We analyzed the uploaded image for <strong>{assetName}</strong>.
            Choose how to update the description.
            <Badge variant="secondary" className="ml-2 text-[10px]">
              {Math.round(confidence * 100)}% confidence
            </Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 flex-1 overflow-auto">
          {currentDescription && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Current Description</Label>
              <div className="rounded-md border border-border bg-muted/50 p-3 text-sm">
                {currentDescription}
              </div>
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs text-primary font-medium">Extracted from Image</Label>
            <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
              {extractedDescription}
            </div>
          </div>

          {currentDescription && (
            <div className="space-y-1">
              <Label className="text-xs font-medium">Merged Preview (editable)</Label>
              <Textarea
                value={editedMerge}
                onChange={(e) => setEditedMerge(e.target.value)}
                rows={4}
                className="text-sm resize-none"
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 flex-wrap">
          {currentDescription && (
            <Button
              variant="outline"
              onClick={() => { onKeepCurrent(); onClose(); }}
            >
              Keep Current
            </Button>
          )}
          <Button
            variant="secondary"
            onClick={() => { onReplaceWithExtracted(); onClose(); }}
          >
            Replace with Extracted
          </Button>
          {currentDescription && (
            <Button
              onClick={() => { onUseMerged(editedMerge); onClose(); }}
            >
              Use Merged
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
