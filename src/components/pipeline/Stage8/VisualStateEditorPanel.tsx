/**
 * Stage 8 – Visual State Editor Panel (Center) – Task 5 + 3B.1/3B.2/3B.3/3B.4
 * Display and edit the selected scene asset instance's visual description:
 * master details, editable effective_description, inheritance, audit trail,
 * status tags + carry forward, single-asset image generation, lock asset,
 * generation attempt carousel, master reference carousel, image upload,
 * and "use master as-is" toggle.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { User, MapPin, Package, Edit3, Lock, Sparkles, Loader2, History, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { StatusTagsEditor } from '@/components/pipeline/Stage8/StatusTagsEditor';
import { GenerationAttemptCarousel } from '@/components/pipeline/Stage8/GenerationAttemptCarousel';
import { MasterReferenceCarousel } from '@/components/pipeline/Stage8/MasterReferenceCarousel';
import { SceneAssetImageUpload } from '@/components/pipeline/Stage8/SceneAssetImageUpload';
import { UseMasterAsIsCheckbox } from '@/components/pipeline/Stage8/UseMasterAsIsCheckbox';
import { TransformationEventCard } from '@/components/pipeline/Stage8/TransformationEventCard';
import { AddTransformationDialog } from '@/components/pipeline/Stage8/AddTransformationDialog';
import { TransformationImagePicker } from '@/components/pipeline/Stage8/TransformationImagePicker';
import { transformationEventService } from '@/lib/services/transformationEventService';
import { sceneAssetService } from '@/lib/services/sceneAssetService';
import type { SceneAssetInstance, TransformationEvent, Shot } from '@/types/scene';

type AssetTypeKey = 'character' | 'location' | 'prop';

const typeIcons = {
  character: User,
  location: MapPin,
  prop: Package,
};

export interface VisualStateEditorPanelProps {
  selectedAsset: SceneAssetInstance | null;
  onUpdateAsset: (
    instanceId: string,
    updates: {
      descriptionOverride?: string;
      modificationReason?: string | null;
      statusTags?: string[];
      carryForward?: boolean;
    }
  ) => void;
  onGenerateImage: (instanceId: string) => void;
  onRemoveFromScene?: (instanceId: string) => void;
  projectId: string;
  sceneId: string;
  shots?: Shot[];
  isUpdating?: boolean;
  isGeneratingImage?: boolean;
  inheritedFromSceneNumber?: number | null;
  sceneScriptExcerpt?: string;
}

// ---------------------------------------------------------------------------
// Audit Trail – modification_count, last_modified_field, modification_reason
// ---------------------------------------------------------------------------
function AuditTrail({
  modificationCount,
  lastModifiedField,
  modificationReason,
}: {
  modificationCount: number;
  lastModifiedField?: string | null;
  modificationReason?: string | null;
}) {
  return (
    <div className="rounded-lg border border-border/30 bg-card/50 p-4 space-y-1">
      <Label className="text-sm font-medium flex items-center gap-2">
        <History className="w-4 h-4 text-primary" />
        Audit trail
      </Label>
      <p className="text-xs text-muted-foreground">
        Modifications: {modificationCount}
        {lastModifiedField && ` • Last field: ${lastModifiedField}`}
      </p>
      {modificationReason && (
        <p className="text-xs text-muted-foreground italic">&quot;{modificationReason}&quot;</p>
      )}
    </div>
  );
}

export function VisualStateEditorPanel({
  selectedAsset,
  onUpdateAsset,
  onGenerateImage,
  onRemoveFromScene,
  projectId,
  sceneId,
  shots = [],
  isUpdating,
  isGeneratingImage,
  inheritedFromSceneNumber,
  sceneScriptExcerpt,
}: VisualStateEditorPanelProps) {
  const [editedDescription, setEditedDescription] = useState('');
  const [statusTags, setStatusTags] = useState<string[]>([]);
  const [carryForward, setCarryForward] = useState(true);
  const [transformationEvents, setTransformationEvents] = useState<TransformationEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [generatingEventId, setGeneratingEventId] = useState<string | null>(null);
  const [generatingImageEventId, setGeneratingImageEventId] = useState<string | null>(null);
  const [imagePickerEventId, setImagePickerEventId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedAsset) {
      setEditedDescription(selectedAsset.description_override ?? selectedAsset.effective_description ?? '');
      setStatusTags(selectedAsset.status_tags ?? []);
      setCarryForward(selectedAsset.carry_forward ?? true);
    }
  }, [selectedAsset?.id, selectedAsset?.description_override, selectedAsset?.effective_description, selectedAsset?.status_tags, selectedAsset?.carry_forward]);

  // Load transformation events for the selected asset
  useEffect(() => {
    if (!selectedAsset || !projectId || !sceneId) {
      setTransformationEvents([]);
      return;
    }
    let cancelled = false;
    setIsLoadingEvents(true);
    transformationEventService.fetchEvents(projectId, sceneId)
      .then(events => {
        if (!cancelled) {
          // Filter to events for the selected asset
          setTransformationEvents(
            events.filter(e => e.scene_asset_instance_id === selectedAsset.id)
          );
        }
      })
      .catch(() => { /* silently fail */ })
      .finally(() => { if (!cancelled) setIsLoadingEvents(false); });
    return () => { cancelled = true; };
  }, [selectedAsset?.id, projectId, sceneId]);

  const handleConfirmEvent = useCallback(async (eventId: string) => {
    try {
      const updated = await transformationEventService.confirmEvent(projectId, sceneId, eventId);
      setTransformationEvents(prev => prev.map(e => e.id === eventId ? updated : e));
      toast.success('Transformation confirmed');
    } catch { toast.error('Failed to confirm transformation'); }
  }, [projectId, sceneId]);

  const handleDismissEvent = useCallback(async (eventId: string) => {
    try {
      await transformationEventService.deleteEvent(projectId, sceneId, eventId);
      setTransformationEvents(prev => prev.filter(e => e.id !== eventId));
      toast.success('Transformation removed');
    } catch { toast.error('Failed to remove transformation'); }
  }, [projectId, sceneId]);

  const handleUpdateEvent = useCallback(async (
    eventId: string,
    updates: { post_description?: string; transformation_narrative?: string }
  ) => {
    try {
      const updated = await transformationEventService.updateEvent(projectId, sceneId, eventId, updates);
      setTransformationEvents(prev => prev.map(e => e.id === eventId ? updated : e));
    } catch { toast.error('Failed to update transformation'); }
  }, [projectId, sceneId]);

  const handleGeneratePostDescription = useCallback(async (eventId: string) => {
    try {
      setGeneratingEventId(eventId);
      const postDesc = await transformationEventService.generatePostDescription(projectId, sceneId, eventId);
      setTransformationEvents(prev => prev.map(e =>
        e.id === eventId ? { ...e, post_description: postDesc } : e
      ));
      toast.success('Post-description generated');
    } catch { toast.error('Failed to generate post-description'); }
    finally { setGeneratingEventId(null); }
  }, [projectId, sceneId]);

  const handleGeneratePostImage = useCallback(async (eventId: string) => {
    try {
      setGeneratingImageEventId(eventId);
      const { jobId } = await transformationEventService.generatePostImage(projectId, sceneId, eventId);
      // Poll for completion
      const maxAttempts = 60;
      const pollIntervalMs = 2000;
      for (let i = 0; i < maxAttempts; i++) {
        const job = await sceneAssetService.getImageJobStatus(jobId);
        if (job.status === 'completed') {
          // Update transformation event with the generated image URL
          if (job.publicUrl) {
            const updated = await transformationEventService.updateEvent(projectId, sceneId, eventId, {
              post_image_key_url: job.publicUrl,
            });
            setTransformationEvents(prev => prev.map(e => e.id === eventId ? updated : e));
          }
          toast.success('Post-transformation image generated');
          return;
        }
        if (job.status === 'failed') {
          const msg = job.error?.message ?? 'Image generation failed';
          throw new Error(typeof msg === 'string' ? msg : 'Image generation failed');
        }
        await new Promise(r => setTimeout(r, pollIntervalMs));
      }
      throw new Error('Image generation timeout');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to generate post-image');
    } finally {
      setGeneratingImageEventId(null);
    }
  }, [projectId, sceneId]);

  const handlePickExistingImage = useCallback(async (eventId: string, imageUrl: string) => {
    try {
      const updated = await transformationEventService.updateEvent(projectId, sceneId, eventId, {
        post_image_key_url: imageUrl,
      });
      setTransformationEvents(prev => prev.map(e => e.id === eventId ? updated : e));
      setImagePickerEventId(null);
      toast.success('Transformation image updated');
    } catch {
      toast.error('Failed to update transformation image');
    }
  }, [projectId, sceneId]);

  const handleAddTransformation = useCallback(async (data: {
    trigger_shot_id: string;
    transformation_type: 'instant' | 'gradual' | 'within_shot';
    completion_shot_id?: string | null;
    post_description: string;
    transformation_narrative?: string;
  }) => {
    if (!selectedAsset) return;
    try {
      const event = await transformationEventService.createEvent(projectId, sceneId, {
        scene_asset_instance_id: selectedAsset.id,
        trigger_shot_id: data.trigger_shot_id,
        transformation_type: data.transformation_type,
        completion_shot_id: data.completion_shot_id,
        post_description: data.post_description,
        transformation_narrative: data.transformation_narrative,
        detected_by: 'manual',
      });
      setTransformationEvents(prev => [...prev, event]);
      toast.success('Transformation added');
    } catch { toast.error('Failed to add transformation'); }
  }, [selectedAsset, projectId, sceneId]);

  const handleSaveDescription = useCallback(() => {
    if (!selectedAsset) return;
    const currentEffective = selectedAsset.description_override ?? selectedAsset.effective_description ?? '';
    if (editedDescription === currentEffective) return;
    onUpdateAsset(selectedAsset.id, {
      descriptionOverride: editedDescription,
      modificationReason: 'User edited description in Stage 8',
    });
  }, [selectedAsset, editedDescription, onUpdateAsset]);

  const handleStatusTagsChange = useCallback(
    (newTags: string[]) => {
      if (!selectedAsset) return;
      setStatusTags(newTags);
      onUpdateAsset(selectedAsset.id, {
        statusTags: newTags,
        modificationReason: 'User updated status tags in Stage 8',
      });
    },
    [selectedAsset, onUpdateAsset]
  );

  const handleCarryForwardChange = useCallback(
    (value: boolean) => {
      if (!selectedAsset) return;
      setCarryForward(value);
      onUpdateAsset(selectedAsset.id, {
        carryForward: value,
        modificationReason: value ? 'Carry forward enabled' : 'Carry forward disabled',
      });
    },
    [selectedAsset, onUpdateAsset]
  );

  const handleLock = useCallback(() => {
    if (!selectedAsset) return;
    if (statusTags.includes('locked')) {
      toast.info('Asset is already locked');
      return;
    }
    const newTags = [...statusTags, 'locked'];
    onUpdateAsset(selectedAsset.id, {
      modificationReason: 'Asset locked',
      statusTags: newTags,
    });
    setStatusTags(newTags);
    toast.success('Asset locked');
  }, [selectedAsset, statusTags, onUpdateAsset]);

  if (!selectedAsset) {
    return (
      <div className="flex-1 flex items-center justify-center bg-card/20">
        <p className="text-muted-foreground">Select an asset to edit</p>
      </div>
    );
  }

  const assetType = (selectedAsset.project_asset?.asset_type ?? 'prop') as AssetTypeKey;
  const Icon = typeIcons[assetType];
  const name = selectedAsset.project_asset?.name ?? 'Unknown';
  const isLocked = statusTags.includes('locked');
  const showAudit = (selectedAsset.modification_count ?? 0) > 0;
  const useMasterAsIs = selectedAsset.use_master_as_is ?? false;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 flex flex-col overflow-hidden bg-card/20"
    >
      <div className="p-4 border-b border-border/50 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Icon className="w-5 h-5 text-primary shrink-0" />
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-foreground truncate">{name}</h3>
            <p className="text-xs text-muted-foreground">
              {selectedAsset.inherited_from_instance_id
                ? inheritedFromSceneNumber != null
                  ? `Inheriting from Scene ${inheritedFromSceneNumber}`
                  : 'Inheriting from prior scene'
                : 'From Master Assets'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <UseMasterAsIsCheckbox
            projectId={projectId}
            sceneId={sceneId}
            instanceId={selectedAsset.id}
            checked={useMasterAsIs}
            disabled={isLocked}
          />
          {onRemoveFromScene && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRemoveFromScene(selectedAsset.id)}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Remove
            </Button>
          )}
          {!isLocked && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleLock}
              disabled={isUpdating}
            >
              <Lock className="w-4 h-4 mr-1" />
              Lock Asset
            </Button>
          )}
          <Button
            variant="gold"
            size="sm"
            onClick={() => onGenerateImage(selectedAsset.id)}
            disabled={isGeneratingImage || useMasterAsIs}
          >
            {isGeneratingImage ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-1" />
                Generate Image
              </>
            )}
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Master Reference Carousel (3B.2) — replaces old static MasterAssetReference */}
          <MasterReferenceCarousel
            projectId={projectId}
            sceneId={sceneId}
            instanceId={selectedAsset.id}
            selectedMasterReferenceUrl={selectedAsset.selected_master_reference_url}
          />

          {/* Master asset description */}
          {selectedAsset.project_asset?.description && (
            <p className="text-sm text-muted-foreground border border-border/30 rounded-lg p-3 bg-muted/30">
              {selectedAsset.project_asset.description}
            </p>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-primary" />
              Visual state description
            </Label>
            <Textarea
              value={editedDescription}
              onChange={e => setEditedDescription(e.target.value)}
              onBlur={handleSaveDescription}
              placeholder="Starting look for this asset in this scene…"
              rows={6}
              disabled={isLocked || useMasterAsIs}
              className="resize-y"
            />
            {/* Transformation Events Section */}
            <div className="mt-2 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  Transformations
                  {transformationEvents.length > 0 && (
                    <span className="bg-primary/20 text-primary text-[10px] px-1.5 py-0.5 rounded-full">
                      {transformationEvents.length}
                    </span>
                  )}
                </span>
                <AddTransformationDialog
                  shots={shots}
                  assetInstanceId={selectedAsset.id}
                  preDescription={editedDescription}
                  onAdd={handleAddTransformation}
                  disabled={isLocked}
                  projectId={projectId}
                  sceneId={sceneId}
                  sceneScriptExcerpt={sceneScriptExcerpt}
                />
              </div>
              {transformationEvents.map(event => (
                <TransformationEventCard
                  key={event.id}
                  event={event}
                  onConfirm={handleConfirmEvent}
                  onDismiss={handleDismissEvent}
                  onUpdate={handleUpdateEvent}
                  onGeneratePostDescription={handleGeneratePostDescription}
                  onGeneratePostImage={handleGeneratePostImage}
                  onOpenImagePicker={(eventId) => setImagePickerEventId(eventId)}
                  isUpdating={isUpdating}
                  isGenerating={generatingEventId === event.id}
                  isGeneratingImage={generatingImageEventId === event.id}
                />
              ))}
              {!isLoadingEvents && transformationEvents.length === 0 && (
                <p className="text-xs text-muted-foreground italic">
                  No transformations detected. Add one if this asset changes visually mid-scene.
                </p>
              )}
            </div>
          </div>

          <StatusTagsEditor
            tags={statusTags}
            onChange={handleStatusTagsChange}
            carryForward={carryForward}
            onCarryForwardChange={handleCarryForwardChange}
            disabled={isLocked || isUpdating}
          />

          {/* Generation Attempt Carousel (3B.1) — replaces old static image */}
          <GenerationAttemptCarousel
            projectId={projectId}
            sceneId={sceneId}
            instanceId={selectedAsset.id}
          />

          {/* Image Upload Zone (3B.3) */}
          <SceneAssetImageUpload
            projectId={projectId}
            sceneId={sceneId}
            instanceId={selectedAsset.id}
            disabled={useMasterAsIs}
          />

          {showAudit && (
            <AuditTrail
              modificationCount={selectedAsset.modification_count ?? 0}
              lastModifiedField={selectedAsset.last_modified_field}
              modificationReason={selectedAsset.modification_reason}
            />
          )}

          {selectedAsset.inherited_from_instance_id && (
            <div className="rounded-lg border border-border/30 bg-card/50 p-4">
              <h4 className="text-sm font-medium text-foreground mb-2">Inheritance</h4>
              <p className="text-xs text-muted-foreground">
                This instance inherits from a prior scene. Edits here create a new scene instance
                and are saved to the asset history.
              </p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Transformation Image Picker (Improvement 4) */}
      {imagePickerEventId && selectedAsset?.project_asset_id && (
        <TransformationImagePicker
          open={!!imagePickerEventId}
          onClose={() => setImagePickerEventId(null)}
          projectId={projectId}
          projectAssetId={selectedAsset.project_asset_id}
          onSelect={(imageUrl) => handlePickExistingImage(imagePickerEventId, imageUrl)}
        />
      )}
    </motion.div>
  );
}
