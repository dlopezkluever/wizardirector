import { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

import { assetService } from '@/lib/services/assetService';
import type { GlobalAsset } from '@/types/asset';

interface DeleteAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: GlobalAsset | null;
  onDeleted: () => void;
}

export const DeleteAssetDialog = ({
  open,
  onOpenChange,
  asset,
  onDeleted,
}: DeleteAssetDialogProps) => {
  const { toast } = useToast();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!asset) return;

    try {
      setDeleting(true);
      await assetService.deleteAsset(asset.id);
      onDeleted();
    } catch (error) {
      console.error('Failed to delete asset:', error);
      
      // Extract the error message
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete asset';
      
      // Check if it's a dependency error
      if (errorMessage.includes('currently used in projects')) {
        toast({
          title: 'Cannot Delete Asset',
          description: errorMessage,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } finally {
      setDeleting(false);
    }
  };

  if (!asset) return null;

  const assetTypeLabels: Record<string, string> = {
    character: 'Character',
    prop: 'Prop',
    location: 'Location',
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-destructive/10 p-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <AlertDialogTitle>Delete Asset</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-3 pt-4">
            <p>
              Are you sure you want to delete{' '}
              <span className="font-semibold text-foreground">{asset.name}</span>?
            </p>

            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {assetTypeLabels[asset.asset_type] || asset.asset_type}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Created {new Date(asset.created_at).toLocaleDateString()}
              </span>
            </div>

            <div className="rounded-lg bg-muted p-4 space-y-2">
              <p className="text-sm font-medium text-foreground">
                ⚠️ Important Note
              </p>
              <p className="text-sm">
                If this asset is currently used in any projects, deletion will be prevented.
                You'll need to remove it from those projects first.
              </p>
            </div>

            <p className="text-sm text-destructive font-medium">
              This action cannot be undone.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={deleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleting ? 'Deleting...' : 'Delete Asset'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

