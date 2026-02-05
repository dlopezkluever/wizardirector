import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Paintbrush, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { InpaintCanvas } from './InpaintCanvas';

interface InpaintingModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceImageUrl: string;
  shotId: string;
  frameType: 'start' | 'end';
  onSubmit: (maskDataUrl: string, prompt: string) => Promise<void>;
}

export function InpaintingModal({
  isOpen,
  onClose,
  sourceImageUrl,
  shotId,
  frameType,
  onSubmit,
}: InpaintingModalProps) {
  const [maskDataUrl, setMaskDataUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!maskDataUrl) {
      setError('Please paint the area you want to modify');
      return;
    }

    if (!prompt.trim()) {
      setError('Please provide instructions for the edit');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await onSubmit(maskDataUrl, prompt.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply inpainting');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setMaskDataUrl(null);
      setPrompt('');
      setError(null);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card border border-border rounded-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Paintbrush className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-semibold text-foreground">
                    Inpaint Frame
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Shot {shotId} - {frameType} frame
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Canvas */}
            <div className="mb-4">
              <InpaintCanvas
                sourceImageUrl={sourceImageUrl}
                onMaskChange={setMaskDataUrl}
              />
            </div>

            {/* Prompt input */}
            <div className="mb-4">
              <Label htmlFor="inpaint-prompt" className="text-sm font-medium mb-2 block">
                Edit Instructions
              </Label>
              <Textarea
                id="inpaint-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe what you want to change in the painted area..."
                rows={3}
                className="resize-none"
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Be specific about what should appear in the masked region.
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="gold"
                className="flex-1"
                onClick={handleSubmit}
                disabled={isSubmitting || !maskDataUrl || !prompt.trim()}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Applying...
                  </>
                ) : (
                  <>
                    <Paintbrush className="w-4 h-4 mr-2" />
                    Apply Inpainting
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
