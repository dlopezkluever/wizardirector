import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, MapPin, Package, Search, X, Loader2, 
  Grid3x3, List, Copy, Check
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

import { assetService } from '@/lib/services/assetService';
import { projectAssetService } from '@/lib/services/projectAssetService';
import { sceneAssetService } from '@/lib/services/sceneAssetService';
import { AssetMatchModal } from './AssetMatchModal';
import type { GlobalAsset, AssetType, ProjectAsset } from '@/types/asset';
import type { SceneAssetInstance } from '@/types/scene';
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
}

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
}: AssetDrawerProps) => {
  const [assets, setAssets] = useState<GlobalAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<AssetType | 'all'>(filterType || 'all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [cloningAssetId, setCloningAssetId] = useState<string | null>(null);
  const [matchModalOpen, setMatchModalOpen] = useState(false);
  const [selectedGlobalAsset, setSelectedGlobalAsset] = useState<GlobalAsset | null>(null);
  const [extractedAssets, setExtractedAssets] = useState<ProjectAsset[]>([]);

  // Fetch assets when drawer opens
  useEffect(() => {
    if (isOpen) {
      fetchAssets();
    } else {
      // Reset state when drawer closes
      setAssets([]);
      setSearchQuery('');
      setSelectedType(filterType || 'all');
    }
  }, [isOpen, filterType]);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const filter: { type?: AssetType; searchQuery?: string } = {};
      if (selectedType !== 'all') {
        filter.type = selectedType as AssetType;
      }
      if (searchQuery) {
        filter.searchQuery = searchQuery;
      }

      const fetchedAssets = await assetService.listAssets(filter);
      setAssets(fetchedAssets);
    } catch (error) {
      console.error('Failed to fetch assets:', error);
      toast.error('Failed to load assets from global library');
    } finally {
      setLoading(false);
    }
  };

  // Filter assets based on search query
  const filteredAssets = useMemo(() => {
    let filtered = assets;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (asset) =>
          asset.name.toLowerCase().includes(query) ||
          asset.description.toLowerCase().includes(query)
      );
    }

    // Apply type filter
    if (selectedType !== 'all') {
      filtered = filtered.filter((asset) => asset.asset_type === selectedType);
    }

    return filtered;
  }, [assets, searchQuery, selectedType]);

  /** When scene context is provided, create a scene_asset_instance after we have a project asset. */
  const ensureSceneInstanceIfNeeded = async (projectAsset: ProjectAsset): Promise<SceneAssetInstance | null> => {
    if (!sceneId || !onSceneInstanceCreated) return null;
    try {
      const instance = await sceneAssetService.createSceneAsset(projectId, {
        sceneId,
        projectAssetId: projectAsset.id,
        descriptionOverride: null,
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
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="h-[90vh]">
        <DrawerHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <DrawerTitle>Browse Global Asset Library</DrawerTitle>
              <DrawerDescription>
                Clone assets from your global library into this project
              </DrawerDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
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
                <div className="rounded-full bg-muted p-6 mb-4">
                  <Package className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No assets found</h3>
                <p className="text-muted-foreground max-w-md">
                  {searchQuery || selectedType !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'Create assets in the Global Library to clone them here'}
                </p>
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
                    const isCloning = cloningAssetId === asset.id;

                    return (
                      <motion.div
                        key={asset.id}
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
                              {asset.description}
                            </CardDescription>
                          </CardHeader>

                          <CardContent className="pt-0 space-y-3">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>v{asset.version}</span>
                              <span>{new Date(asset.created_at).toLocaleDateString()}</span>
                            </div>

                            {/* Clone Button */}
                            <Button
                              onClick={() => handleCloneAsset(asset)}
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

