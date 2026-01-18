import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, User, Box, MapPin, Filter, Grid3X3, List } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

import { assetService } from '@/lib/services/assetService';
import type { GlobalAsset, AssetType, AssetFilter } from '@/types/asset';

import { AssetGallery } from '@/components/assets/AssetGallery';
import { AssetDialog } from '@/components/assets/AssetDialog';
import { DeleteAssetDialog } from '@/components/assets/DeleteAssetDialog';

const AssetLibrary = () => {
  const { toast } = useToast();

  // State
  const [assets, setAssets] = useState<GlobalAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | AssetType>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingAsset, setEditingAsset] = useState<GlobalAsset | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<GlobalAsset | null>(null);

  // Load assets on mount
  useEffect(() => {
    loadAssets();
  }, []);

  const loadAssets = async () => {
    try {
      setLoading(true);
      console.log('[AssetLibrary] Loading assets...');
      const data = await assetService.listAssets();
      console.log('[AssetLibrary] Loaded assets:', data);
      setAssets(data);
    } catch (error) {
      console.error('Failed to load assets:', error);
      toast({
        title: 'Error',
        description: 'Failed to load assets. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter assets based on search and active tab
  const filteredAssets = assets.filter(asset => {
    // Search filter
    if (searchQuery && !asset.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Type filter (tab)
    if (activeTab !== 'all' && asset.asset_type !== activeTab) {
      return false;
    }

    return true;
  });

  // Sort by creation date (newest first)
  const sortedAssets = [...filteredAssets].sort((a, b) => {
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  // Separate by type for display
  const characterAssets = sortedAssets.filter(a => a.asset_type === 'character');
  const propAssets = sortedAssets.filter(a => a.asset_type === 'prop');
  const locationAssets = sortedAssets.filter(a => a.asset_type === 'location');

  const handleCreateAsset = () => {
    setEditingAsset(null);
    setShowCreateDialog(true);
  };

  const handleEditAsset = (asset: GlobalAsset) => {
    setEditingAsset(asset);
    setShowCreateDialog(true);
  };

  const handleDeleteAsset = (asset: GlobalAsset) => {
    setAssetToDelete(asset);
    setDeleteDialogOpen(true);
  };

  const handleAssetSaved = () => {
    console.log('[AssetLibrary] Asset saved, reloading...');
    setShowCreateDialog(false);
    setEditingAsset(null);
    loadAssets();
    toast({
      title: 'Success',
      description: editingAsset ? 'Asset updated successfully' : 'Asset created successfully',
    });
  };

  const handleAssetDeleted = () => {
    setDeleteDialogOpen(false);
    setAssetToDelete(null);
    loadAssets();
    toast({
      title: 'Success',
      description: 'Asset deleted successfully',
    });
  };

  const getAssetCount = (type: AssetType) => {
    return assets.filter(a => a.asset_type === type).length;
  };

  return (
    <div className="flex-1 overflow-auto bg-background">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Asset Library</h1>
            <p className="text-muted-foreground mt-2">
              Create and manage reusable characters, props, and locations
            </p>
          </div>
          <Button onClick={handleCreateAsset} size="lg">
            <Plus className="mr-2 h-4 w-4" />
            New Asset
          </Button>
        </motion.div>

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-4 items-center"
        >
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex gap-1 border rounded-lg p-1">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList>
            <TabsTrigger value="all">
              All Assets ({assets.length})
            </TabsTrigger>
            <TabsTrigger value="character">
              <User className="mr-2 h-4 w-4" />
              Characters ({getAssetCount('character')})
            </TabsTrigger>
            <TabsTrigger value="prop">
              <Box className="mr-2 h-4 w-4" />
              Props ({getAssetCount('prop')})
            </TabsTrigger>
            <TabsTrigger value="location">
              <MapPin className="mr-2 h-4 w-4" />
              Locations ({getAssetCount('location')})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <AssetGallery
              assets={sortedAssets}
              loading={loading}
              viewMode={viewMode}
              onEdit={handleEditAsset}
              onDelete={handleDeleteAsset}
            />
          </TabsContent>

          <TabsContent value="character" className="mt-6">
            <AssetGallery
              assets={characterAssets}
              loading={loading}
              viewMode={viewMode}
              onEdit={handleEditAsset}
              onDelete={handleDeleteAsset}
            />
          </TabsContent>

          <TabsContent value="prop" className="mt-6">
            <AssetGallery
              assets={propAssets}
              loading={loading}
              viewMode={viewMode}
              onEdit={handleEditAsset}
              onDelete={handleDeleteAsset}
            />
          </TabsContent>

          <TabsContent value="location" className="mt-6">
            <AssetGallery
              assets={locationAssets}
              loading={loading}
              viewMode={viewMode}
              onEdit={handleEditAsset}
              onDelete={handleDeleteAsset}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <AssetDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        asset={editingAsset}
        onSaved={handleAssetSaved}
      />

      <DeleteAssetDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        asset={assetToDelete}
        onDeleted={handleAssetDeleted}
      />
    </div>
  );
};

export default AssetLibrary;

