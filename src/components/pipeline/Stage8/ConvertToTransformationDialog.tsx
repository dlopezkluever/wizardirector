/**
 * ConvertToTransformationDialog
 * Two-step flow for converting a "duplicate" scene asset instance into
 * a transformation event on a base asset.
 *
 * Step 1: Pick the base asset that this absorbed asset is a transformation of.
 * Step 2: LLM prefills an AddTransformationDialog with context from the absorbed instance.
 */

import { useState } from 'react';
import { Loader2, User, MapPin, Package, Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { transformationEventService } from '@/lib/services/transformationEventService';
import { sceneAssetService } from '@/lib/services/sceneAssetService';
import { projectAssetService } from '@/lib/services/projectAssetService';
import { AddTransformationDialog } from './AddTransformationDialog';
import type { SceneAssetInstance, Shot, TransformationType } from '@/types/scene';

const getAssetIcon = (type?: string) => {
  switch (type) {
    case 'character': return User;
    case 'location': return MapPin;
    case 'prop': return Package;
    case 'extra_archetype': return Users;
    default: return Package;
  }
};

export interface ConvertToTransformationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  absorbedAsset: SceneAssetInstance;
  sceneAssets: SceneAssetInstance[];
  projectId: string;
  sceneId: string;
  shots: Shot[];
  sceneScriptExcerpt?: string;
  onComplete: () => void;
}

export function ConvertToTransformationDialog({
  open,
  onOpenChange,
  absorbedAsset,
  sceneAssets,
  projectId,
  sceneId,
  shots,
  sceneScriptExcerpt,
  onComplete,
}: ConvertToTransformationDialogProps) {
  const [step, setStep] = useState<'pick' | 'loading' | 'dialog'>('pick');
  const [baseAssetId, setBaseAssetId] = useState<string>('');
  const [prefillData, setPrefillData] = useState<{
    post_description: string;
    transformation_narrative: string;
    trigger_shot_id?: string;
    transformation_type?: string;
    completion_shot_id?: string;
  } | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  // Other assets in the scene (exclude the absorbed one)
  const otherAssets = sceneAssets.filter(a => a.id !== absorbedAsset.id);

  const baseAsset = otherAssets.find(a => a.id === baseAssetId);

  const handleNext = async () => {
    if (!baseAssetId || !baseAsset) return;

    setStep('loading');

    try {
      // Use first shot as a fallback trigger
      const fallbackShotId = shots[0]?.id;
      if (!fallbackShotId) {
        toast.error('No shots available in this scene');
        setStep('pick');
        return;
      }

      const result = await transformationEventService.generatePrefill(projectId, sceneId, {
        trigger_shot_id: fallbackShotId,
        scene_asset_instance_id: baseAssetId,
        transformation_type: 'instant',
        absorbed_instance_id: absorbedAsset.id,
      });

      setPrefillData(result);
      setStep('dialog');
      setAddDialogOpen(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate prefill');
      setStep('pick');
    }
  };

  const handleTransformationCreated = async (data: {
    trigger_shot_id: string;
    transformation_type: TransformationType;
    completion_shot_id?: string | null;
    post_description: string;
    transformation_narrative?: string;
  }) => {
    try {
      // 1. Create the transformation event on the base asset
      const event = await transformationEventService.createEvent(projectId, sceneId, {
        scene_asset_instance_id: baseAssetId,
        trigger_shot_id: data.trigger_shot_id,
        transformation_type: data.transformation_type,
        completion_shot_id: data.completion_shot_id,
        post_description: data.post_description,
        transformation_narrative: data.transformation_narrative || null,
        detected_by: 'manual',
      });

      // 2. If absorbed has an image, set it as the transformation event's post_image
      if (absorbedAsset.image_key_url && event.id) {
        await transformationEventService.updateEvent(projectId, sceneId, event.id, {
          post_image_key_url: absorbedAsset.image_key_url,
        });
      }

      // 3. Remove absorbed instance from scene
      await sceneAssetService.deleteSceneAsset(projectId, sceneId, absorbedAsset.id);

      toast.success(
        `Converted "${absorbedAsset.project_asset?.name}" into a transformation on "${baseAsset?.project_asset?.name}"`,
        {
          action: absorbedAsset.project_asset_id ? {
            label: 'Defer from project',
            onClick: async () => {
              try {
                await projectAssetService.updateAsset(projectId, absorbedAsset.project_asset_id, { deferred: true });
                toast.success(`"${absorbedAsset.project_asset?.name}" deferred from project`);
              } catch {
                toast.error('Failed to defer asset');
              }
            },
          } : undefined,
        }
      );

      setAddDialogOpen(false);
      onOpenChange(false);
      onComplete();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create transformation');
    }
  };

  const handleClose = () => {
    setStep('pick');
    setBaseAssetId('');
    setPrefillData(null);
    setAddDialogOpen(false);
    onOpenChange(false);
  };

  return (
    <>
      {/* Step 1: Pick base asset */}
      <Dialog open={open && step !== 'dialog'} onOpenChange={v => { if (!v) handleClose(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Convert &ldquo;{absorbedAsset.project_asset?.name}&rdquo; to Transformation
            </DialogTitle>
          </DialogHeader>

          {step === 'loading' ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Generating transformation prefill...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Which asset is this a transformation of? The absorbed asset will become a transformation event on the selected base asset.
              </p>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Select Base Asset</Label>
                <RadioGroup value={baseAssetId} onValueChange={setBaseAssetId}>
                  {otherAssets.map(instance => {
                    const Icon = getAssetIcon(instance.project_asset?.asset_type);
                    const name = instance.project_asset?.name ?? 'Unknown';
                    return (
                      <label
                        key={instance.id}
                        className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                      >
                        <RadioGroupItem value={instance.id} />
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {instance.image_key_url ? (
                            <img
                              src={instance.image_key_url}
                              alt={name}
                              className="w-10 h-10 rounded object-cover shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0">
                              <Icon className="w-5 h-5 text-muted-foreground" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-medium truncate">{name}</p>
                              <Badge variant="outline" className="text-[10px] px-1 shrink-0">
                                {instance.project_asset?.asset_type === 'extra_archetype'
                                  ? 'Extra'
                                  : instance.project_asset?.asset_type ?? 'unknown'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </RadioGroup>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={handleClose}>Cancel</Button>
            <Button onClick={handleNext} disabled={!baseAssetId || step === 'loading'}>
              Next
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Step 2: AddTransformationDialog with prefilled values */}
      {step === 'dialog' && prefillData && baseAsset && (
        <AddTransformationDialog
          shots={shots}
          assetInstanceId={baseAssetId}
          preDescription={baseAsset.effective_description || ''}
          onAdd={handleTransformationCreated}
          projectId={projectId}
          sceneId={sceneId}
          sceneScriptExcerpt={sceneScriptExcerpt}
          externalOpen={addDialogOpen}
          onExternalOpenChange={v => {
            setAddDialogOpen(v);
            if (!v) handleClose();
          }}
          initialTriggerShotId={prefillData.trigger_shot_id}
          initialTransformationType={prefillData.transformation_type as TransformationType | undefined}
          initialCompletionShotId={prefillData.completion_shot_id}
          initialPostDescription={prefillData.post_description}
          initialNarrative={prefillData.transformation_narrative}
        />
      )}
    </>
  );
}
