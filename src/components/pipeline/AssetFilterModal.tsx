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
import { ScrollArea } from '@/components/ui/scroll-area';
import type { AssetPreviewEntity, AssetType, AssetDecision } from '@/types/asset';

interface AssetFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  entities: AssetPreviewEntity[];
  onConfirm: (selected: Array<{ name: string; type: AssetType; decision: AssetDecision; sceneNumbers: number[] }>) => void;
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

const DECISION_STYLES: Record<AssetDecision, { label: string; className: string; activeClassName: string }> = {
  keep: { label: 'Keep', className: 'text-xs px-2 py-0.5', activeClassName: 'bg-green-600 text-white hover:bg-green-700' },
  defer: { label: 'Defer', className: 'text-xs px-2 py-0.5', activeClassName: 'bg-amber-500 text-white hover:bg-amber-600' },
  delete: { label: 'Delete', className: 'text-xs px-2 py-0.5', activeClassName: 'bg-red-600 text-white hover:bg-red-700' },
};

export function AssetFilterModal({
  isOpen,
  onClose,
  entities,
  onConfirm,
  isConfirming,
}: AssetFilterModalProps) {
  // All set to 'keep' by default
  const [decisions, setDecisions] = useState<Map<string, AssetDecision>>(() =>
    new Map(entities.map(e => [entityKey(e), 'keep']))
  );

  // Reset decisions when entities change
  useState(() => {
    setDecisions(new Map(entities.map(e => [entityKey(e), 'keep'])));
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

  const setDecision = useCallback((key: string, decision: AssetDecision) => {
    setDecisions(prev => {
      const next = new Map(prev);
      next.set(key, decision);
      return next;
    });
  }, []);

  const setAllOfType = useCallback((type: AssetType, decision: AssetDecision) => {
    setDecisions(prev => {
      const next = new Map(prev);
      for (const e of entities) {
        if (e.type === type) next.set(entityKey(e), decision);
      }
      return next;
    });
  }, [entities]);

  const counts = useMemo(() => {
    let keep = 0, defer = 0, del = 0;
    for (const d of decisions.values()) {
      if (d === 'keep') keep++;
      else if (d === 'defer') defer++;
      else del++;
    }
    return { keep, defer, delete: del };
  }, [decisions]);

  const handleConfirm = () => {
    const result = entities
      .filter(e => decisions.get(entityKey(e)) !== 'delete')
      .map(e => ({
        name: e.name,
        type: e.type,
        decision: decisions.get(entityKey(e)) || 'keep' as AssetDecision,
        sceneNumbers: e.sceneNumbers,
      }));
    onConfirm(result);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isConfirming && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Review Extracted Assets</DialogTitle>
          <DialogDescription>
            {entities.length} entities found in your script. Choose to keep, defer, or delete each
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
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs px-2"
                          onClick={() => setAllOfType(type, 'keep')}
                        >
                          Keep All
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs px-2"
                          onClick={() => setAllOfType(type, 'defer')}
                        >
                          Defer All
                        </Button>
                      </div>
                    </div>

                    {/* Entity list */}
                    <div className="space-y-1">
                      {typeEntities.map((entity) => {
                        const key = entityKey(entity);
                        const currentDecision = decisions.get(key) || 'keep';

                        return (
                          <div
                            key={key}
                            className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-accent"
                          >
                            {/* Decision toggle buttons */}
                            <div className="flex gap-0.5 shrink-0">
                              {(Object.entries(DECISION_STYLES) as [AssetDecision, typeof DECISION_STYLES.keep][]).map(
                                ([decision, style]) => (
                                  <Button
                                    key={decision}
                                    variant="outline"
                                    size="sm"
                                    className={`${style.className} h-6 ${currentDecision === decision ? style.activeClassName : ''}`}
                                    onClick={() => setDecision(key, decision)}
                                  >
                                    {style.label}
                                  </Button>
                                )
                              )}
                            </div>

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
                          </div>
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
          <div className="flex-1 text-xs text-muted-foreground">
            Keep {counts.keep} | Defer {counts.defer} | Delete {counts.delete}
          </div>
          <Button variant="outline" onClick={onClose} disabled={isConfirming}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={(counts.keep + counts.defer) === 0 || isConfirming}
          >
            {isConfirming ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Generating Descriptions...
              </>
            ) : (
              `Confirm Selection (${counts.keep + counts.defer} assets)`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
