import { motion } from 'framer-motion';
import { User, Box, MapPin, MoreVertical, Edit, Trash2 } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import type { GlobalAsset, AssetType } from '@/types/asset';

interface AssetCardProps {
  asset: GlobalAsset;
  onEdit: (asset: GlobalAsset) => void;
  onDelete: (asset: GlobalAsset) => void;
}

const assetTypeConfig: Record<AssetType, { icon: any; label: string; color: string }> = {
  character: {
    icon: User,
    label: 'Character',
    color: 'bg-blue-500',
  },
  prop: {
    icon: Box,
    label: 'Prop',
    color: 'bg-green-500',
  },
  location: {
    icon: MapPin,
    label: 'Location',
    color: 'bg-purple-500',
  },
};

export const AssetCard = ({ asset, onEdit, onDelete }: AssetCardProps) => {
  const config = assetTypeConfig[asset.asset_type];
  const Icon = config.icon;

  return (
    <motion.div
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

          {/* Actions Menu */}
          <div className="absolute top-2 right-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(asset)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete(asset)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Content */}
        <CardHeader className="flex-1">
          <CardTitle className="line-clamp-1">{asset.name}</CardTitle>
          <CardDescription className="line-clamp-2">
            {asset.description}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>v{asset.version}</span>
            <span>{new Date(asset.created_at).toLocaleDateString()}</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

