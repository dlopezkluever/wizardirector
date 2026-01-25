import { useState, useEffect } from 'react';
import { RefreshCw, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

import { projectAssetService } from '@/lib/services/projectAssetService';
import type { AssetVersionStatus } from '@/types/asset';

interface AssetVersionSyncProps {
  projectId: string;
  onSyncComplete?: () => void;
}

export const AssetVersionSync = ({ projectId, onSyncComplete }: AssetVersionSyncProps) => {
  const [outdatedAssets, setOutdatedAssets] = useState<AssetVersionStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [checking, setChecking] = useState(false);

  // Check version sync status on mount and periodically
  useEffect(() => {
    checkVersionSync();
    
    // Poll every 30 seconds
    const interval = setInterval(() => {
      checkVersionSync();
    }, 30000);

    return () => clearInterval(interval);
  }, [projectId]);

  const checkVersionSync = async () => {
    setChecking(true);
    try {
      const result = await projectAssetService.checkVersionSync(projectId);
      setOutdatedAssets(result.outdated.map(asset => ({
        ...asset,
        isOutdated: true
      })));
    } catch (error) {
      console.error('Failed to check version sync:', error);
      // Don't show error toast for background checks
    } finally {
      setChecking(false);
    }
  };

  const handleSyncAsset = async (assetStatus: AssetVersionStatus) => {
    setSyncing(assetStatus.projectAssetId);
    try {
      await projectAssetService.syncFromGlobal(projectId, assetStatus.projectAssetId);
      
      toast.success(`Updated "${assetStatus.globalAssetName}" from global library`);
      
      // Remove from outdated list
      setOutdatedAssets(prev => 
        prev.filter(a => a.projectAssetId !== assetStatus.projectAssetId)
      );

      if (onSyncComplete) {
        onSyncComplete();
      }

      // Refresh the list
      await checkVersionSync();
    } catch (error) {
      console.error('Failed to sync asset:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to sync asset';
      toast.error(errorMessage);
    } finally {
      setSyncing(null);
    }
  };

  const handleSyncAll = async () => {
    if (outdatedAssets.length === 0) return;

    setSyncing('all');
    try {
      // Sync all assets sequentially to avoid overwhelming the server
      for (const asset of outdatedAssets) {
        await projectAssetService.syncFromGlobal(projectId, asset.projectAssetId);
      }

      toast.success(`Updated ${outdatedAssets.length} asset(s) from global library`);
      
      setOutdatedAssets([]);
      setIsDialogOpen(false);

      if (onSyncComplete) {
        onSyncComplete();
      }

      // Refresh the list
      await checkVersionSync();
    } catch (error) {
      console.error('Failed to sync all assets:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to sync assets';
      toast.error(errorMessage);
    } finally {
      setSyncing(null);
    }
  };

  const outdatedCount = outdatedAssets.length;

  if (outdatedCount === 0) {
    return null; // Don't show anything if no outdated assets
  }

  return (
    <>
      {/* Badge/Indicator */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsDialogOpen(true)}
        className="relative"
      >
        <RefreshCw className="mr-2 h-4 w-4" />
        Sync Available
        <Badge 
          variant="destructive" 
          className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center"
        >
          {outdatedCount}
        </Badge>
      </Button>

      {/* Sync Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Update Assets from Global Library</DialogTitle>
            <DialogDescription>
              {outdatedCount} asset{outdatedCount !== 1 ? 's' : ''} have newer versions available in the global library.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[400px] pr-4">
            <div className="space-y-4">
              {outdatedAssets.map((asset, index) => (
                <div key={asset.projectAssetId}>
                  <div className="flex items-start justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">{asset.globalAssetName}</h4>
                        <Badge variant="outline" className="text-xs">
                          v{asset.projectVersion} → v{asset.globalVersion}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Project version: {asset.projectVersion} • Global version: {asset.globalVersion}
                      </p>
                    </div>
                    <Button
                      onClick={() => handleSyncAsset(asset)}
                      disabled={syncing === asset.projectAssetId || syncing === 'all'}
                      size="sm"
                      variant="outline"
                      className="ml-4"
                    >
                      {syncing === asset.projectAssetId ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Update
                        </>
                      )}
                    </Button>
                  </div>
                  {index < outdatedAssets.length - 1 && <Separator className="my-2" />}
                </div>
              ))}
            </div>
          </ScrollArea>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={syncing !== null}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSyncAll}
              disabled={syncing !== null}
            >
              {syncing === 'all' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating All...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Update All ({outdatedCount})
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

