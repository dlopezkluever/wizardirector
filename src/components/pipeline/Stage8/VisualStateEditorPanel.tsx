/**
 * Stage 8 – Visual State Editor Panel (Center) – Task 5
 * Display and edit the selected scene asset instance's visual description:
 * master details, editable effective_description, inheritance, audit trail,
 * status tags + carry forward, single-asset image generation, lock asset.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  User,
  MapPin,
  Package,
  Edit3,
  Image as ImageIcon,
  Lock,
  Sparkles,
  Loader2,
  History,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { StatusTagsEditor } from '@/components/pipeline/Stage8/StatusTagsEditor';
import { cn } from '@/lib/utils';
import type { SceneAssetInstance } from '@/types/scene';
import type { ProjectAsset } from '@/types/asset';

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
  projectId: string;
  sceneId: string;
  isUpdating?: boolean;
  isGeneratingImage?: boolean;
  inheritedFromSceneNumber?: number | null;
}

// ---------------------------------------------------------------------------
// Master Asset Reference – base description + master image
// ---------------------------------------------------------------------------
function MasterAssetReference({ asset }: { asset: ProjectAsset | undefined }) {
  if (!asset) return null;
  const name = asset.name ?? 'Unknown';
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium flex items-center gap-2">
        <ImageIcon className="w-4 h-4 text-primary" />
        Master reference
      </Label>
      {asset.image_key_url && (
        <div className="aspect-video max-w-xs rounded-lg border border-border/30 overflow-hidden bg-muted/50">
          <img
            src={asset.image_key_url}
            alt={name}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      {asset.description && (
        <p className="text-sm text-muted-foreground border border-border/30 rounded-lg p-3 bg-muted/30">
          {asset.description}
        </p>
      )}
    </div>
  );
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
  projectId,
  sceneId,
  isUpdating,
  isGeneratingImage,
  inheritedFromSceneNumber,
}: VisualStateEditorPanelProps) {
  const [editedDescription, setEditedDescription] = useState('');
  const [statusTags, setStatusTags] = useState<string[]>([]);
  const [carryForward, setCarryForward] = useState(true);

  useEffect(() => {
    if (selectedAsset) {
      setEditedDescription(selectedAsset.description_override ?? selectedAsset.effective_description ?? '');
      setStatusTags(selectedAsset.status_tags ?? []);
      setCarryForward(selectedAsset.carry_forward ?? true);
    }
  }, [selectedAsset?.id, selectedAsset?.description_override, selectedAsset?.effective_description, selectedAsset?.status_tags, selectedAsset?.carry_forward]);

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
        <div className="flex gap-2 shrink-0">
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
            disabled={isGeneratingImage}
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
          <MasterAssetReference asset={selectedAsset.project_asset} />

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
              disabled={isLocked}
              className="resize-y"
            />
            <p className="text-xs text-muted-foreground">
              Mid-scene visual changes are handled in Stage 10.
            </p>
          </div>

          <StatusTagsEditor
            tags={statusTags}
            onChange={handleStatusTagsChange}
            carryForward={carryForward}
            onCarryForwardChange={handleCarryForwardChange}
            disabled={isLocked || isUpdating}
          />

          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-primary" />
              Scene instance image
            </Label>
            {selectedAsset.image_key_url ? (
              <div className="aspect-video max-w-xs rounded-lg border border-border/30 overflow-hidden bg-muted/50">
                <img
                  src={selectedAsset.image_key_url}
                  alt={`${name} in scene`}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="aspect-video max-w-xs rounded-lg border border-dashed border-border/50 bg-muted/30 flex items-center justify-center">
                <p className="text-xs text-muted-foreground">No image yet. Generate above.</p>
              </div>
            )}
          </div>

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
    </motion.div>
  );
}
