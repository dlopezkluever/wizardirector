import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, MapPin, Package, Search, X, Loader2,
  Grid3x3, List, Copy, Check, Frown, ArrowLeft, Film
} from 'lucide-react';

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { assetService } from '@/lib/services/assetService';
import { projectAssetService } from '@/lib/services/projectAssetService';
import { sceneAssetService } from '@/lib/services/sceneAssetService';
import { shotAssetAssignmentService } from '@/lib/services/shotAssetAssignmentService';
import { AssetMatchModal } from './AssetMatchModal';
import type { GlobalAsset, AssetType, ProjectAsset } from '@/types/asset';
import type { SceneAssetInstance, Shot } from '@/types/scene';
import { cn } from '@/lib/utils';

interface AssetDrawerProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onAssetCloned?: (asset: ProjectAsset) => void;
  filterType?: AssetType; // Optional type filter
  /** Optional scene context: after cloning, create a scene_asset_instance and call onSceneInstanceCreated */
  sceneId?: string;
  onSceneInstanceCreated?: (instance: SceneAssetInstance) => void;
  /** Optional shot list for shot checklist step (§8A) */
  shots?: Shot[];
}

type DrawerStep = 'browse' | 'shot-checklist';

type AssetSource = 'project' | 'global';

/** Display shape shared by GlobalAsset and ProjectAsset in the list */
type DrawerAsset = GlobalAsset | ProjectAsset;

const assetTypeConfig: Record<AssetType, { icon: any; label: string; color: string }> = {
  character: {
    icon: User,
    label: 'Character',
    color: 'bg-blue-500',
  },
  prop: {
    icon: Package,
    label: 'Prop',
    color: 'bg-green-500',
  },
  location: {
    icon: MapPin,
    label: 'Location',
    color: 'bg-purple-500',
  },
};

export const AssetDrawer = ({
  projectId,
  isOpen,
  onClose,
  onAssetCloned,
  filterType,
  sceneId,
  onSceneInstanceCreated,
  shots = [],
}: AssetDrawerProps) => {
  const [source, setSource] = useState<AssetSource>('project');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<AssetType | 'all'>(filterType || 'all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [cloningAssetId, setCloningAssetId] = useState<string | null>(null);
  const [matchModalOpen, setMatchModalOpen] = useState(false);
  const [selectedGlobalAsset, setSelectedGlobalAsset] = useState<GlobalAsset | null>(null);
  const [extractedAssets, setExtractedAssets] = useState<ProjectAsset[]>([]);

  // Shot checklist state (§8A)
  const [step, setStep] = useState<DrawerStep>('browse');
  const [pendingAsset, setPendingAsset] = useState<ProjectAsset | null>(null);
  const [selectedShotIds, setSelectedShotIds] = useState<Set<string>>(new Set());
  const [isAddingToShots, setIsAddingToShots] = useState(false);

  const resetChecklist = useCallback(() => {
    setStep('browse');
    setPendingAsset(null);
    setSelectedShotIds(new Set());
    setIsAddingToShots(false);
  }, []);

  /** Show shot checklist if shots exist, otherwise add directly */
  const startShotChecklist = useCallback((asset: ProjectAsset) => {
    if (shots.length === 0) {
      // No shots yet — skip checklist, add directly
      return false;
    }
    setPendingAsset(asset);
    setSelectedShotIds(new Set(shots.map(s => s.id)));
    setStep('shot-checklist');
    return true;
  }, [shots]);

  /** Confirm shot checklist: create scene instance + assignments */
  const confirmShotChecklist = useCallback(async () => {
    if (!pendingAsset || !sceneId || !onSceneInstanceCreated) return;
    setIsAddingToShots(true);
    try {
      // 1. Create the scene asset instance
      const instance = await sceneAssetService.createSceneAsset(projectId, {
        sceneId,
        projectAssetId: pendingAsset.id,
        statusTags: [],
        carryForward: true,
      });

      // 2. Create shot assignments for selected shots
      if (selectedShotIds.size > 0) {
        const assignments = Array.from(selectedShotIds).map(shotId => ({
          shotId,
          instanceId: instance.id,
          presenceType: 'throughout' as const,
        }));
        await shotAssetAssignmentService.createAssignments(projectId, sceneId, assignments);
      }

      onSceneInstanceCreated(instance);
      toast.success(`Added "${pendingAsset.name}" to ${selectedShotIds.size} shot${selectedShotIds.size !== 1 ? 's' : ''}`);
      resetChecklist();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add asset';
      toast.error(msg);
    } finally {
      setIsAddingToShots(false);
    }
  }, [pendingAsset, sceneId, projectId, selectedShotIds, onSceneInstanceCreated, resetChecklist, onClose]);

  const { data: projectAssets = [], isLoading: loadingProject } = useQuery({
    queryKey: ['project-assets', projectId],
    queryFn: () => projectAssetService.listAssets(projectId),
    enabled: isOpen && source === 'project',
  });

  const { data: globalAssets = [], isLoading: loadingGlobal } = useQuery({
    queryKey: ['global-assets'],
    queryFn: () => assetService.listAssets(),
    enabled: isOpen && source === 'global',
  });

  const assets: DrawerAsset[] = source === 'project' ? projectAssets : globalAssets;
  const loading = source === 'project' ? loadingProject : loadingGlobal;

  const filteredAssets = useMemo(() => {
    let filtered = [...assets];
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.name.toLowerCase().includes(query) ||
          (a.description ?? '').toLowerCase().includes(query)
      );
    }
    if (selectedType !== 'all') {
      filtered = filtered.filter((a) => a.asset_type === selectedType);
    }
    return filtered;
  }, [assets, searchQuery, selectedType]);

  const handleSelectProjectAsset = async (asset: ProjectAsset) => {
    if (!sceneId || !onSceneInstanceCreated) {
      toast.info('Asset already in project');
      onClose();
      return;
    }
    // If shots exist, show checklist first
    if (startShotChecklist(asset)) return;

    // No shots — add directly
    try {
      const instance = await sceneAssetService.createSceneAsset(projectId, {
        sceneId,
        projectAssetId: asset.id,
        statusTags: [],
        carryForward: true,
      });
      onSceneInstanceCreated(instance);
      toast.success(`Added ${asset.name} to scene`);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add asset to scene';
      toast.error(msg);
    }
  };

  /** When scene context is provided, create a scene_asset_instance after we have a project asset.
   *  Routes through shot checklist if shots are available. */
  const ensureSceneInstanceIfNeeded = async (projectAsset: ProjectAsset): Promise<SceneAssetInstance | null> => {
    if (!sceneId || !onSceneInstanceCreated) return null;
    // If shots exist, route to checklist step instead of creating immediately
    if (startShotChecklist(projectAsset)) return null;

    try {
      const instance = await sceneAssetService.createSceneAsset(projectId, {
        sceneId,
        projectAssetId: projectAsset.id,
        statusTags: [],
        carryForward: true,
      });
      onSceneInstanceCreated(instance);
      return instance;
    } catch (err) {
      console.error('Failed to create scene instance:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to add asset to scene');
      return null;
    }
  };

  const handleCloneAsset = async (asset: GlobalAsset) => {
    if (cloningAssetId) return; // Prevent multiple simultaneous clones

    try {
      // Fetch extracted project assets (those without global_asset_id)
      const allProjectAssets = await projectAssetService.listAssets(projectId);
      const extracted = allProjectAssets.filter(a => !a.global_asset_id);
      
      setExtractedAssets(extracted);
      
      // If there are extracted assets, open match modal
      if (extracted.length > 0) {
        setSelectedGlobalAsset(asset);
        setMatchModalOpen(true);
      } else {
        // No extracted assets, clone directly (existing behavior)
        setCloningAssetId(asset.id);
        const clonedAsset = await projectAssetService.cloneFromGlobal(
          projectId,
          asset.id
        );

        toast.success(`Successfully cloned "${asset.name}" to project`);
        
        if (onAssetCloned) {
          onAssetCloned(clonedAsset);
        }
        await ensureSceneInstanceIfNeeded(clonedAsset);
        setCloningAssetId(null);
      }
    } catch (error) {
      console.error('Failed to fetch project assets:', error);
      // Fallback to direct clone if fetching fails
      setCloningAssetId(asset.id);
      try {
        const clonedAsset = await projectAssetService.cloneFromGlobal(
          projectId,
          asset.id
        );

        toast.success(`Successfully cloned "${asset.name}" to project`);
        
        if (onAssetCloned) {
          onAssetCloned(clonedAsset);
        }
        await ensureSceneInstanceIfNeeded(clonedAsset);
      } catch (cloneError) {
        console.error('Failed to clone asset:', cloneError);
        const errorMessage = cloneError instanceof Error ? cloneError.message : 'Failed to clone asset';
        toast.error(errorMessage);
      } finally {
        setCloningAssetId(null);
      }
    }
  };

  const handleMatched = async (asset: ProjectAsset) => {
    if (onAssetCloned) {
      onAssetCloned(asset);
    }
    await ensureSceneInstanceIfNeeded(asset);
    setMatchModalOpen(false);
    setSelectedGlobalAsset(null);
  };

  const handleClonedWithoutMatch = async (asset: ProjectAsset) => {
    if (onAssetCloned) {
      onAssetCloned(asset);
    }
    await ensureSceneInstanceIfNeeded(asset);
    setMatchModalOpen(false);
    setSelectedGlobalAsset(null);
  };

  return (
    <Drawer open={isOpen} onOpenChange={(open) => { if (!open) { resetChecklist(); onClose(); } }}>
      <DrawerContent className="h-[90vh]">

        {/* ── Shot Checklist Step (§8A) ── */}
        {step === 'shot-checklist' && pendingAsset && (
          <>
            <DrawerHeader className="border-b">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <DrawerTitle className="flex items-center gap-2">
                    <Film className="h-5 w-5 text-primary" />
                    Add &ldquo;{pendingAsset.name}&rdquo; to Scene
                  </DrawerTitle>
                  <DrawerDescription>
                    Select which shots this asset appears in. Presence type defaults to &ldquo;Throughout&rdquo; (editable per-shot in Stage 9).
                  </DrawerDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={() => { resetChecklist(); onClose(); }} className="shrink-0">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DrawerHeader>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-2">
                {shots.map(shot => {
                  const checked = selectedShotIds.has(shot.id);
                  return (
                    <label
                      key={shot.id}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                        checked ? 'border-primary/50 bg-primary/5' : 'border-border hover:bg-muted/50'
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(val) => {
                          setSelectedShotIds(prev => {
                            const next = new Set(prev);
                            if (val) next.add(shot.id);
                            else next.delete(shot.id);
                            return next;
                          });
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">
                          Shot {shot.shotId}
                          <span className="text-muted-foreground font-normal ml-2">— {shot.setting}</span>
                          <span className="text-muted-foreground font-normal ml-1">({shot.duration}s)</span>
                        </div>
                        {shot.action && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{shot.action}</p>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </ScrollArea>
            <div className="border-t p-4 flex items-center justify-between gap-3">
              <Button variant="ghost" size="sm" onClick={resetChecklist} disabled={isAddingToShots}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{selectedShotIds.size} of {shots.length} shots</span>
                <Button
                  size="sm"
                  disabled={isAddingToShots}
                  onClick={confirmShotChecklist}
                >
                  {isAddingToShots ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Check className="h-4 w-4 mr-1" />
                  )}
                  Add to {selectedShotIds.size} shot{selectedShotIds.size !== 1 ? 's' : ''}
                </Button>
              </div>
            </div>
          </>
        )}

        {/* ── Browse Step (default) ── */}
        {step === 'browse' && (
        <>
        <DrawerHeader className="border-b">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <DrawerTitle className="flex flex-wrap items-center gap-2">
                <span>Asset Library</span>
                <div className="flex items-center rounded-lg border border-border p-1 bg-muted/50 text-sm font-normal">
                  <button
                    type="button"
                    className={cn(
                      'px-3 py-1 rounded transition-colors text-xs',
                      source === 'project'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                    onClick={() => setSource('project')}
                  >
                    Project Assets
                  </button>
                  <button
                    type="button"
                    className={cn(
                      'px-3 py-1 rounded transition-colors text-xs',
                      source === 'global'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                    onClick={() => setSource('global')}
                  >
                    Global Library
                  </button>
                </div>
              </DrawerTitle>
              <DrawerDescription>
                {source === 'project'
                  ? 'Assets from Stage 5 (Master Assets for this project)'
                  : 'Curated global asset library (shared across all projects)'}
              </DrawerDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Search and Filters */}
          <div className="p-4 border-b space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search assets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select
                value={selectedType}
                onValueChange={(value) => setSelectedType(value as AssetType | 'all')}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="character">Characters</SelectItem>
                  <SelectItem value="prop">Props</SelectItem>
                  <SelectItem value="location">Locations</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-1 border rounded-md">
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => setViewMode('grid')}
                  className="rounded-r-none"
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => setViewMode('list')}
                  className="rounded-l-none"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Asset List */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className={cn(
                viewMode === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                  : 'space-y-4'
              )}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ))}
              </div>
            ) : filteredAssets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                {source === 'project' ? (
                  <>
                    <Frown className="w-16 h-16 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Project Assets Yet</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mb-4">
                      Project assets are created in Stage 5 (Master Assets). Switch to Global Library to browse and clone assets.
                    </p>
                    <Button variant="outline" onClick={() => setSource('global')}>
                      Browse Global Library
                    </Button>
                  </>
                ) : (
                  <>
                    <Frown className="w-16 h-16 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Assets Found</h3>
                    <p className="text-sm text-muted-foreground">
                      {searchQuery || selectedType !== 'all'
                        ? 'Try adjusting your search or filters.'
                        : 'Create assets in the Global Library to clone them here.'}
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className={cn(
                viewMode === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                  : 'space-y-4'
              )}>
                <AnimatePresence mode="popLayout">
                  {filteredAssets.map((asset) => {
                    const config = assetTypeConfig[asset.asset_type];
                    const Icon = config.icon;
                    const isGlobal = source === 'global';
                    const isCloning = isGlobal && cloningAssetId === asset.id;

                    return (
                      <motion.div
                        key={`${source}-${asset.id}`}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        whileHover={{ y: -4 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full flex flex-col">
                          {/* Image Thumbnail */}
                          <div className="relative h-48 bg-muted flex items-center justify-center overflow-hidden">
                            {asset.image_key_url ? (
                              <img
                                src={asset.image_key_url}
                                alt={asset.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="flex flex-col items-center justify-center text-muted-foreground">
                                <Icon className="h-16 w-16 mb-2" strokeWidth={1.5} />
                                <span className="text-sm">No image</span>
                              </div>
                            )}

                            {/* Asset Type Badge */}
                            <div className="absolute top-2 left-2">
                              <Badge className={`${config.color} text-white`}>
                                <Icon className="mr-1 h-3 w-3" />
                                {config.label}
                              </Badge>
                            </div>
                          </div>

                          {/* Content */}
                          <CardHeader className="flex-1">
                            <CardTitle className="line-clamp-1">{asset.name}</CardTitle>
                            <CardDescription className="line-clamp-2">
                              {asset.description ?? ''}
                            </CardDescription>
                          </CardHeader>

                          <CardContent className="pt-0 space-y-3">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>
                                {'version' in asset && asset.version != null ? `v${asset.version}` : '—'}
                              </span>
                              <span>{new Date(asset.created_at).toLocaleDateString()}</span>
                            </div>

                            {source === 'project' ? (
                              <Button
                                onClick={() => handleSelectProjectAsset(asset as ProjectAsset)}
                                className="w-full"
                                size="sm"
                              >
                                <Copy className="mr-2 h-4 w-4" />
                                Add to Scene
                              </Button>
                            ) : (
                              <Button
                                onClick={() => handleCloneAsset(asset as GlobalAsset)}
                                disabled={isCloning}
                                className="w-full"
                                size="sm"
                              >
                                {isCloning ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Cloning...
                                  </>
                                ) : (
                                  <>
                                    <Copy className="mr-2 h-4 w-4" />
                                    Clone to Project
                                  </>
                                )}
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
        </>
        )}
      </DrawerContent>

      {/* Asset Match Modal */}
      {selectedGlobalAsset && (
        <AssetMatchModal
          globalAsset={selectedGlobalAsset}
          projectAssets={extractedAssets}
          projectId={projectId}
          isOpen={matchModalOpen}
          onClose={() => {
            setMatchModalOpen(false);
            setSelectedGlobalAsset(null);
          }}
          onMatched={handleMatched}
          onClonedWithoutMatch={handleClonedWithoutMatch}
        />
      )}
    </Drawer>
  );
};

