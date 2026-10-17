import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  Loader2,
  Trash2,
  ImageIcon,
  Upload,
  Plus,
  Star,
  Eye,
  Compass,
  Sparkles,
  Pencil,
  Check,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { projectAssetService } from '@/lib/services/projectAssetService';
import type { ProjectAsset, LocationView } from '@/types/asset';

interface LocationViewsDialogProps {
  projectId: string;
  asset: ProjectAsset;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const VIEW_TYPE_LABELS: Record<string, string> = {
  establishing: 'Establishing',
  direction: 'Direction',
};

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  user: { label: 'User', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  established: { label: 'Established', color: 'bg-green-500/10 text-green-600 border-green-500/20' },
  stage7_inferred: { label: 'Inferred', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
};

export function LocationViewsDialog({ projectId, asset, open, onOpenChange }: LocationViewsDialogProps) {
  const [views, setViews] = useState<LocationView[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingViewId, setEditingViewId] = useState<string | null>(null);
  const [editAlias, setEditAlias] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newViewAlias, setNewViewAlias] = useState('');
  const [newViewDescription, setNewViewDescription] = useState('');
  const [suggestingDefaults, setSuggestingDefaults] = useState(false);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const fetchViews = useCallback(async () => {
    try {
      setLoading(true);
      const data = await projectAssetService.listLocationViews(projectId, asset.id);
      setViews(data);
    } catch (error) {
      console.error('Failed to fetch location views:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId, asset.id]);

  useEffect(() => {
    if (open) {
      fetchViews();
    }
  }, [open, fetchViews]);

  const handleSuggestDefaults = async () => {
    try {
      setSuggestingDefaults(true);
      const newViews = await projectAssetService.suggestDefaultViews(projectId, asset.id);
      setViews(newViews);
      toast.success('Default views created (Establishing + 2 directions)');
    } catch (error: any) {
      toast.error(error.message || 'Failed to suggest defaults');
    } finally {
      setSuggestingDefaults(false);
    }
  };

  const handleAddDirection = async () => {
    const directionCount = views.filter(v => v.view_type === 'direction').length;
    const name = `direction_${directionCount + 1}`;

    try {
      const newView = await projectAssetService.createLocationView(projectId, asset.id, {
        name,
        view_type: 'direction',
        alias: newViewAlias || undefined,
        description: newViewDescription || undefined,
        camera_distance: 'wide',
        camera_height: 'eye_level',
        is_primary: directionCount === 0 && !views.some(v => v.is_primary),
      });
      setViews(prev => [...prev, newView]);
      setShowAddForm(false);
      setNewViewAlias('');
      setNewViewDescription('');
      toast.success('Direction added');
    } catch (error: any) {
      toast.error(error.message || 'Failed to add direction');
    }
  };

  const handleUpdateView = async (viewId: string) => {
    try {
      const updated = await projectAssetService.updateLocationView(
        projectId,
        asset.id,
        viewId,
        { alias: editAlias, description: editDescription }
      );
      setViews(prev => prev.map(v => v.id === viewId ? updated : v));
      setEditingViewId(null);
      toast.success('View updated');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update view');
    }
  };

  const handleSetPrimary = async (viewId: string) => {
    try {
      const updated = await projectAssetService.updateLocationView(
        projectId,
        asset.id,
        viewId,
        { is_primary: true }
      );
      setViews(prev => prev.map(v =>
        v.id === viewId ? updated : { ...v, is_primary: false }
      ));
      toast.success('Primary direction updated');
    } catch (error: any) {
      toast.error(error.message || 'Failed to set primary');
    }
  };

  const handleUploadImage = async (viewId: string, file: File) => {
    try {
      const updated = await projectAssetService.uploadLocationViewImage(
        projectId,
        asset.id,
        viewId,
        file
      );
      setViews(prev => prev.map(v => v.id === viewId ? updated : v));
      toast.success('Image uploaded');
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload image');
    }
  };

  const handleDeleteView = async (view: LocationView) => {
    try {
      await projectAssetService.deleteLocationView(projectId, asset.id, view.id);
      setViews(prev => prev.filter(v => v.id !== view.id));
      toast.success(`"${view.alias || view.name}" deleted`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete view');
    }
  };

  const getViewDisplayName = (view: LocationView): string => {
    if (view.view_type === 'establishing') return 'Establishing';
    const dirNum = view.name.replace('direction_', '#');
    return view.alias ? `Dir ${dirNum}: ${view.alias}` : `Direction ${dirNum}`;
  };

  const establishingView = views.find(v => v.view_type === 'establishing');
  const directionViews = views.filter(v => v.view_type === 'direction');
  const imagesCount = views.filter(v => v.image_key_url).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-base">Camera Directions — {asset.name}</DialogTitle>
          <DialogDescription className="text-xs">
            Define directional reference images for consistent location rendering.
            {views.length > 0 && ` ${imagesCount}/${views.length} views have images.`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : views.length === 0 ? (
            /* Empty state */
            <div className="text-center py-8 space-y-3">
              <Compass className="w-10 h-10 mx-auto text-muted-foreground/50" />
              <div>
                <p className="text-sm font-medium">No camera directions defined</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Start with suggested defaults (Establishing + 2 directions) or add directions manually.
                </p>
              </div>
              <Button
                onClick={handleSuggestDefaults}
                disabled={suggestingDefaults}
                size="sm"
              >
                {suggestingDefaults ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                )}
                Suggest Default Views
              </Button>
            </div>
          ) : (
            <>
              {/* Establishing View */}
              {establishingView && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Eye className="w-3.5 h-3.5" />
                    Establishing Shot
                  </div>
                  {renderViewCard(establishingView)}
                </div>
              )}

              {/* Direction Views */}
              {directionViews.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Compass className="w-3.5 h-3.5" />
                      Directions ({directionViews.length})
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {directionViews.map(view => renderViewCard(view))}
                  </div>
                </div>
              )}

              {/* Add Direction */}
              {showAddForm ? (
                <div className="border rounded-lg p-3 space-y-2">
                  <div className="text-xs font-medium">New Direction</div>
                  <Input
                    placeholder="Alias (e.g., 'stove wall', 'window side')"
                    value={newViewAlias}
                    onChange={e => setNewViewAlias(e.target.value)}
                    className="h-7 text-xs"
                  />
                  <Textarea
                    placeholder="Description (what this view shows)"
                    value={newViewDescription}
                    onChange={e => setNewViewDescription(e.target.value)}
                    className="text-xs min-h-[50px]"
                  />
                  <div className="flex gap-1.5 justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => { setShowAddForm(false); setNewViewAlias(''); setNewViewDescription(''); }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 text-xs"
                      onClick={handleAddDirection}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-8 text-xs"
                  onClick={() => setShowAddForm(true)}
                >
                  <Plus className="w-3 h-3 mr-1.5" />
                  Add Direction
                </Button>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );

  function renderViewCard(view: LocationView) {
    const isEditing = editingViewId === view.id;
    const hasImage = !!view.image_key_url;
    const sourceInfo = SOURCE_LABELS[view.source] || SOURCE_LABELS.user;

    return (
      <div
        key={view.id}
        className={cn(
          "border rounded-lg p-2 space-y-1.5",
          view.is_primary && "border-amber-500/50 bg-amber-500/5"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1 min-w-0">
            {view.is_primary && (
              <Star className="w-3 h-3 text-amber-500 flex-shrink-0" fill="currentColor" />
            )}
            <span className="text-xs font-medium truncate">
              {isEditing ? (
                <Input
                  value={editAlias}
                  onChange={e => setEditAlias(e.target.value)}
                  className="h-6 text-xs px-1"
                  placeholder="Alias"
                  autoFocus
                />
              ) : (
                getViewDisplayName(view)
              )}
            </span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${sourceInfo.color}`}>
              {sourceInfo.label}
            </Badge>
            <Badge variant="outline" className="text-[9px] px-1.5 py-0">
              {VIEW_TYPE_LABELS[view.view_type]}
            </Badge>
          </div>
        </div>

        {/* Description (editable) */}
        {isEditing ? (
          <Textarea
            value={editDescription}
            onChange={e => setEditDescription(e.target.value)}
            className="text-[10px] min-h-[40px] p-1.5"
            placeholder="What this view shows"
          />
        ) : view.description ? (
          <p className="text-[10px] text-muted-foreground line-clamp-2">{view.description}</p>
        ) : null}

        {/* Image area */}
        <div
          className={cn(
            "aspect-video bg-muted/30 rounded-md flex items-center justify-center overflow-hidden relative group",
            hasImage && "cursor-pointer"
          )}
        >
          {hasImage ? (
            <>
              <img
                src={view.image_key_url!}
                alt={getViewDisplayName(view)}
                className="w-full h-full object-cover rounded-md"
              />
              {/* Upload overlay on hover */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white h-7 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRefs.current[view.id]?.click();
                  }}
                >
                  <Upload className="w-3 h-3 mr-1" />
                  Replace
                </Button>
              </div>
            </>
          ) : (
            <button
              className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors w-full h-full justify-center"
              onClick={() => fileInputRefs.current[view.id]?.click()}
            >
              <ImageIcon className="w-6 h-6" />
              <span className="text-[10px]">Upload image</span>
            </button>
          )}
          <input
            ref={el => { fileInputRefs.current[view.id] = el; }}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) handleUploadImage(view.id, file);
              e.target.value = '';
            }}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-6 text-xs"
                onClick={() => handleUpdateView(view.id)}
              >
                <Check className="w-3 h-3 mr-1" />
                Save
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={() => setEditingViewId(null)}
              >
                <X className="w-3 h-3" />
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={() => {
                  setEditingViewId(view.id);
                  setEditAlias(view.alias || '');
                  setEditDescription(view.description || '');
                }}
              >
                <Pencil className="w-3 h-3" />
              </Button>
              {view.view_type === 'direction' && !view.is_primary && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-amber-600"
                  onClick={() => handleSetPrimary(view.id)}
                  title="Set as primary fallback direction"
                >
                  <Star className="w-3 h-3" />
                </Button>
              )}
              <div className="flex-1" />
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-destructive hover:text-destructive"
                onClick={() => handleDeleteView(view)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }
}
