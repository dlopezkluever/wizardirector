import { motion, AnimatePresence } from 'framer-motion';
import { Package } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import { AssetCard } from './AssetCard';

import type { GlobalAsset } from '@/types/asset';

interface AssetGalleryProps {
  assets: GlobalAsset[];
  loading: boolean;
  viewMode: 'grid' | 'list';
  onEdit: (asset: GlobalAsset) => void;
  onDelete: (asset: GlobalAsset) => void;
}

export const AssetGallery = ({
  assets,
  loading,
  viewMode,
  onEdit,
  onDelete,
}: AssetGalleryProps) => {
  // Loading state
  if (loading) {
    return (
      <div className={
        viewMode === 'grid'
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
          : 'space-y-4'
      }>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (assets.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-16 text-center"
      >
        <div className="rounded-full bg-muted p-6 mb-4">
          <Package className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold mb-2">No assets yet</h3>
        <p className="text-muted-foreground max-w-md">
          Create your first asset to get started. Assets can be characters, props, or locations
          that you can reuse across multiple projects.
        </p>
      </motion.div>
    );
  }

  // Grid view
  if (viewMode === 'grid') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
      >
        <AnimatePresence mode="popLayout">
          {assets.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </AnimatePresence>
      </motion.div>
    );
  }

  // List view
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      <AnimatePresence mode="popLayout">
        {assets.map((asset) => (
          <div key={asset.id} className="w-full">
            <AssetCard
              asset={asset}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
};

