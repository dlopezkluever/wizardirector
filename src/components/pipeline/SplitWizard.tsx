import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ArrowRight, ArrowLeft, Info } from 'lucide-react';
import type { ProjectAsset } from '@/types/asset';

interface SplitWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: ProjectAsset;
  onConfirm: (variantName: string, variantDescription: string | undefined, scenesForVariant: number[]) => Promise<void>;
}

type WizardStep = 1 | 2 | 3;

export function SplitWizard({ open, onOpenChange, asset, onConfirm }: SplitWizardProps) {
  const [step, setStep] = useState<WizardStep>(1);
  const [variantName, setVariantName] = useState(`${asset.name} - Variant`);
  const [variantDescription, setVariantDescription] = useState('');
  const [scenesForVariant, setScenesForVariant] = useState<Set<number>>(new Set());
  const [isSplitting, setIsSplitting] = useState(false);

  const allScenes = (asset.scene_numbers || []).slice().sort((a, b) => a - b);
  const remainingScenes = allScenes.filter(s => !scenesForVariant.has(s));

  // Reset state when dialog opens
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setStep(1);
      setVariantName(`${asset.name} - Variant`);
      setVariantDescription('');
      setScenesForVariant(new Set());
    }
    onOpenChange(nextOpen);
  };

  const toggleScene = (sceneNum: number) => {
    setScenesForVariant(prev => {
      const next = new Set(prev);
      if (next.has(sceneNum)) {
        next.delete(sceneNum);
      } else {
        next.add(sceneNum);
      }
      return next;
    });
  };

  const canProceedStep1 = variantName.trim().length > 0;
  const canProceedStep2 = scenesForVariant.size > 0 && remainingScenes.length > 0;

  const handleConfirm = async () => {
    try {
      setIsSplitting(true);
      await onConfirm(
        variantName.trim(),
        variantDescription.trim() || undefined,
        Array.from(scenesForVariant).sort((a, b) => a - b)
      );
    } finally {
      setIsSplitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Split Asset: {asset.name}</DialogTitle>
          <DialogDescription>
            Create a scene-scoped variant from this asset. Step {step} of 3.
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-2">
          {[1, 2, 3].map(s => (
            <div
              key={s}
              className={`flex-1 h-1 rounded-full ${
                s <= step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Step 1: Variant name & description */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Variant Name</Label>
              <Input
                value={variantName}
                onChange={e => setVariantName(e.target.value)}
                placeholder="e.g., Dr. James - Act 3"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-medium">Variant Description (optional)</Label>
              <Textarea
                value={variantDescription}
                onChange={e => setVariantDescription(e.target.value)}
                placeholder="Leave empty to copy the original's description"
                rows={3}
                className="resize-none text-sm"
              />
              <p className="text-xs text-muted-foreground">
                If left empty, the original's description will be copied.
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Scene assignment */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select which scenes should move to the variant. Both sides must keep at least one scene.
            </p>

            <div className="grid grid-cols-2 gap-4">
              {/* Original column */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Original: {asset.name}
                </Label>
                <div className="border rounded-lg p-2 space-y-1 min-h-[120px]">
                  {remainingScenes.length === 0 ? (
                    <p className="text-xs text-destructive p-2">
                      At least 1 scene required
                    </p>
                  ) : (
                    remainingScenes.map(n => (
                      <Badge
                        key={n}
                        variant="secondary"
                        className="mr-1 mb-1 cursor-pointer hover:bg-primary/20"
                        onClick={() => toggleScene(n)}
                      >
                        Scene {n} &rarr;
                      </Badge>
                    ))
                  )}
                </div>
              </div>

              {/* Variant column */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Variant: {variantName}
                </Label>
                <div className="border rounded-lg p-2 space-y-1 min-h-[120px] border-dashed">
                  {scenesForVariant.size === 0 ? (
                    <p className="text-xs text-muted-foreground p-2">
                      Click scenes from original to move them here
                    </p>
                  ) : (
                    Array.from(scenesForVariant).sort((a, b) => a - b).map(n => (
                      <Badge
                        key={n}
                        variant="default"
                        className="mr-1 mb-1 cursor-pointer hover:bg-primary/80"
                        onClick={() => toggleScene(n)}
                      >
                        &larr; Scene {n}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Quick checkboxes for all scenes */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Quick select:</Label>
              <div className="flex flex-wrap gap-2">
                {allScenes.map(n => (
                  <label key={n} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <Checkbox
                      checked={scenesForVariant.has(n)}
                      onCheckedChange={() => toggleScene(n)}
                    />
                    Sc.{n}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Summary confirmation */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="rounded-md bg-muted/50 p-4 space-y-3 text-sm">
              <div>
                <p className="font-medium">Original: {asset.name}</p>
                <div className="flex gap-1 flex-wrap mt-1">
                  {remainingScenes.map(n => (
                    <Badge key={n} variant="secondary" className="text-[10px] px-1">Scene {n}</Badge>
                  ))}
                </div>
              </div>
              <div className="border-t pt-2">
                <p className="font-medium">Variant: {variantName}</p>
                {variantDescription && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{variantDescription}</p>
                )}
                <div className="flex gap-1 flex-wrap mt-1">
                  {Array.from(scenesForVariant).sort((a, b) => a - b).map(n => (
                    <Badge key={n} variant="default" className="text-[10px] px-1">Scene {n}</Badge>
                  ))}
                </div>
              </div>
            </div>

            <Alert className="py-2">
              <Info className="w-4 h-4" />
              <AlertDescription className="text-xs">
                The variant will <strong>not</strong> inherit the original's image. You'll need to generate or upload an image for the variant separately.
              </AlertDescription>
            </Alert>
          </div>
        )}

        <DialogFooter className="flex justify-between sm:justify-between">
          <div>
            {step > 1 && (
              <Button
                variant="outline"
                onClick={() => setStep((step - 1) as WizardStep)}
                disabled={isSplitting}
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => handleOpenChange(false)} disabled={isSplitting}>
              Cancel
            </Button>
            {step < 3 ? (
              <Button
                onClick={() => setStep((step + 1) as WizardStep)}
                disabled={step === 1 ? !canProceedStep1 : !canProceedStep2}
              >
                Next
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleConfirm} disabled={isSplitting}>
                {isSplitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Splitting...
                  </>
                ) : (
                  'Confirm Split'
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
