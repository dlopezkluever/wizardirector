import { useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Check, X, Loader2, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { streamlineService } from '@/lib/services/streamlineService';
import type { StreamlineImageCard } from '@/lib/utils/streamlineRouting';

export type { StreamlineImageCard } from '@/lib/utils/streamlineRouting';

interface StreamlineImageReviewGridProps {
  projectId: string;
  images: StreamlineImageCard[];
  onImagesChange: (update: StreamlineImageCard[] | ((prev: StreamlineImageCard[]) => StreamlineImageCard[])) => void;
  /** Names already known from other files in the batch (e.g. character_notes drafts) — used to suggest a match, not to constrain the editable name field. */
  knownEntityNames?: string[];
  maxImages?: number;
}

const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const ASSET_TYPES: StreamlineImageCard['type'][] = ['character', 'location', 'prop'];

/** Lightweight fuzzy match — no new dependency for what's essentially a nice-to-have suggestion, not a hard constraint the user can't override. */
function findBestNameMatch(guess: string, knownNames: string[]): string | null {
  const normalizedGuess = guess.toLowerCase().trim();
  if (!normalizedGuess) return null;

  let best: string | null = null;
  let bestScore = 0;

  for (const known of knownNames) {
    const normalizedKnown = known.toLowerCase().trim();
    if (!normalizedKnown) continue;

    let score = 0;
    if (normalizedGuess === normalizedKnown) score = 1;
    else if (normalizedGuess.includes(normalizedKnown) || normalizedKnown.includes(normalizedGuess)) score = 0.7;
    else if (normalizedGuess.split(/\s+/)[0] === normalizedKnown.split(/\s+/)[0]) score = 0.5;

    if (score > bestScore) {
      bestScore = score;
      best = known;
    }
  }

  return bestScore >= 0.5 ? best : null;
}

/**
 * Batch image reconciliation (spec §2.12) — a new screen, not a modal-per-
 * image loop. Deliberately excludes Edit Image / Apply Style / Remove
 * Background / Regenerate — those heavyweight job actions stay exclusively
 * in EnhancedUploadModal, available post-commit once the asset row is real.
 */
export function StreamlineImageReviewGrid({
  projectId,
  images,
  onImagesChange,
  knownEntityNames = [],
  maxImages = 20,
}: StreamlineImageReviewGridProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(async (fileList: FileList) => {
    const files = Array.from(fileList);
    const validFiles = files.filter(f => ACCEPTED_IMAGE_TYPES.includes(f.type));
    if (validFiles.length < files.length) {
      toast.error('Only PNG, JPEG, and WebP images are supported.');
    }
    if (images.length + validFiles.length > maxImages) {
      toast.error(`Maximum ${maxImages} images allowed`);
      return;
    }

    setIsUploading(true);
    try {
      const results = await Promise.allSettled(
        validFiles.map(file => streamlineService.classifyImage(projectId, file))
      );

      const newCards: StreamlineImageCard[] = [];
      results.forEach((result, i) => {
        if (result.status === 'fulfilled') {
          const { imageUrl, classification } = result.value;
          const matchedName = findBestNameMatch(classification.name, knownEntityNames);
          newCards.push({
            id: `img-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`,
            imageUrl,
            name: matchedName ?? classification.name,
            type: classification.type,
            description: classification.description,
            accepted: true,
          });
        } else {
          toast.error(`${validFiles[i].name}: ${result.reason instanceof Error ? result.reason.message : 'Failed to classify'}`);
        }
      });

      if (newCards.length > 0) {
        onImagesChange(prev => [...prev, ...newCards]);
      }
    } finally {
      setIsUploading(false);
    }
  }, [projectId, images.length, maxImages, knownEntityNames, onImagesChange]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) void processFiles(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [processFiles]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) void processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const updateCard = useCallback((id: string, patch: Partial<StreamlineImageCard>) => {
    onImagesChange(prev => prev.map(img => (img.id === id ? { ...img, ...patch } : img)));
  }, [onImagesChange]);

  const removeCard = useCallback((id: string) => {
    onImagesChange(prev => prev.filter(img => img.id !== id));
  }, [onImagesChange]);

  return (
    <div className="space-y-4">
      <div
        data-testid="streamline-image-dropzone"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="relative border-2 border-dashed rounded-xl p-6 text-center border-border bg-secondary/30 hover:border-primary/50 transition-colors"
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp"
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isUploading}
        />
        <div className="flex items-center justify-center gap-3">
          {isUploading ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> : <Upload className="w-5 h-5 text-muted-foreground" />}
          <span className="text-sm text-muted-foreground">
            {isUploading ? 'Classifying images…' : 'Drop reference images — character photos, location shots, prop references'}
          </span>
        </div>
      </div>

      <AnimatePresence>
        {images.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {images.map((img) => (
              <motion.div
                key={img.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn(
                  'flex gap-3 p-3 rounded-lg border',
                  img.accepted ? 'bg-card border-border' : 'bg-muted/50 border-border opacity-60'
                )}
              >
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-secondary shrink-0 flex items-center justify-center">
                  {img.imageUrl ? (
                    <img src={img.imageUrl} alt={img.name} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex gap-2">
                    <input
                      value={img.name}
                      onChange={(e) => updateCard(img.id, { name: e.target.value })}
                      className="flex-1 min-w-0 text-sm font-medium bg-transparent border border-border rounded px-2 py-1 text-foreground"
                      placeholder="Name"
                    />
                    <select
                      value={img.type}
                      onChange={(e) => updateCard(img.id, { type: e.target.value as StreamlineImageCard['type'] })}
                      className="text-xs bg-transparent border border-border rounded px-2 py-1 text-foreground"
                    >
                      {ASSET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <textarea
                    value={img.description}
                    onChange={(e) => updateCard(img.id, { description: e.target.value })}
                    className="w-full text-xs bg-transparent border border-border rounded px-2 py-1 text-foreground resize-none h-12"
                    placeholder="Visual description"
                  />
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <Button
                    variant={img.accepted ? 'stage-active' : 'stage'}
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => updateCard(img.id, { accepted: !img.accepted })}
                    title={img.accepted ? 'Accepted — click to skip' : 'Skipped — click to accept'}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeCard(img.id)} title="Remove">
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
