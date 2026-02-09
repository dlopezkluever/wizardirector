import { useState, useMemo, useCallback } from 'react';
import { User, MapPin, Package, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { AssetPreviewEntity, AssetType } from '@/types/asset';

interface AssetFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  entities: AssetPreviewEntity[];
  onConfirm: (selected: Array<{ name: string; type: AssetType }>) => void;
  isConfirming: boolean;
}

const TYPE_CONFIG: Record<AssetType, { icon: typeof User; label: string }> = {
  character: { icon: User, label: 'Characters' },
  location: { icon: MapPin, label: 'Locations' },
  prop: { icon: Package, label: 'Props' },
};

function entityKey(entity: { type: string; name: string }): string {
  return `${entity.type}:${entity.name.toLowerCase()}`;
}

export function AssetFilterModal({
  isOpen,
  onClose,
  entities,
  onConfirm,
  isConfirming,
}: AssetFilterModalProps) {
  // All selected by default
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() =>
    new Set(entities.map(entityKey))
  );

  // Reset selection when entities change
  useState(() => {
    setSelectedKeys(new Set(entities.map(entityKey)));
  });

  const grouped = useMemo(() => {
    const groups: Record<AssetType, AssetPreviewEntity[]> = {
      character: [],
      location: [],
      prop: [],
    };
    for (const e of entities) {
      groups[e.type]?.push(e);
    }
    return groups;
  }, [entities]);

  const toggleEntity = useCallback((key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const selectAllOfType = useCallback((type: AssetType) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      for (const e of entities) {
        if (e.type === type) next.add(entityKey(e));
      }
      return next;
    });
  }, [entities]);

  const selectNoneOfType = useCallback((type: AssetType) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      for (const e of entities) {
        if (e.type === type) next.delete(entityKey(e));
      }
      return next;
    });
  }, [entities]);

  const selectedCount = selectedKeys.size;

  const handleConfirm = () => {
    const selected = entities
      .filter((e) => selectedKeys.has(entityKey(e)))
      .map((e) => ({ name: e.name, type: e.type }));
    onConfirm(selected);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isConfirming && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Review Extracted Assets</DialogTitle>
          <DialogDescription>
            {entities.length} entities found in your script. Deselect any you don't need
            before generating visual descriptions.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 pr-4 -mr-4">
          <div className="space-y-6 py-2">
            {(Object.entries(grouped) as [AssetType, AssetPreviewEntity[]][]).map(
              ([type, typeEntities]) => {
                if (typeEntities.length === 0) return null;

                const config = TYPE_CONFIG[type];
                const Icon = config.icon;
                const allSelected = typeEntities.every((e) =>
                  selectedKeys.has(entityKey(e))
                );
                const noneSelected = typeEntities.every(
                  (e) => !selectedKeys.has(entityKey(e))
                );

                return (
                  <div key={type} className="space-y-2">
                    {/* Section header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        <span className="font-semibold text-sm">
                          {config.label} ({typeEntities.length})
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs px-2"
                          disabled={allSelected}
                          onClick={() => selectAllOfType(type)}
                        >
                          Select All
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs px-2"
                          disabled={noneSelected}
                          onClick={() => selectNoneOfType(type)}
                        >
                          None
                        </Button>
                      </div>
                    </div>

                    {/* Entity list */}
                    <div className="space-y-1">
                      {typeEntities.map((entity) => {
                        const key = entityKey(entity);
                        const checked = selectedKeys.has(key);

                        return (
                          <label
                            key={key}
                            className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-accent cursor-pointer"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => toggleEntity(key)}
                            />
                            <span className="flex-1 text-sm font-medium">
                              {entity.name}
                            </span>
                            <div className="flex gap-1 flex-wrap justify-end">
                              {entity.sceneNumbers.map((n) => (
                                <Badge
                                  key={n}
                                  variant="secondary"
                                  className="text-[10px] px-1.5 py-0"
                                >
                                  Sc.{n}
                                </Badge>
                              ))}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isConfirming}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedCount === 0 || isConfirming}
          >
            {isConfirming ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Generating Descriptions...
              </>
            ) : (
              `Confirm Selection (${selectedCount} assets)`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
