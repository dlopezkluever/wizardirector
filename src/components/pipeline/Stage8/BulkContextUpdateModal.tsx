/**
 * Bulk Context Update Modal – Stage 8 (Phase 2, Task 2)
 * Review modal for bulk story-context inference results.
 * Shows per-asset suggestions with accept/reject toggles.
 */

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { User, MapPin, Package, ChevronDown, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BulkStoryContextResult } from '@/types/scene';

const typeIcons: Record<string, typeof User> = {
  character: User,
  location: MapPin,
  prop: Package,
};

export interface BulkContextUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  results: BulkStoryContextResult[];
  onApply: (
    accepted: Array<{
      instanceId: string;
      description: string;
      tags: string[];
    }>
  ) => void;
  isApplying?: boolean;
}

export function BulkContextUpdateModal({
  isOpen,
  onClose,
  results,
  onApply,
  isApplying,
}: BulkContextUpdateModalProps) {
  const [selected, setSelected] = useState<Set<string>>(() => {
    // Auto-select assets that have actual suggestions
    const ids = new Set<string>();
    for (const r of results) {
      if (r.suggested_description && r.suggested_description !== r.current_description) {
        ids.add(r.id ?? r.instanceId);
      }
    }
    return ids;
  });

  const toggleAsset = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(results.map((r) => r.instanceId)));
  };

  const deselectAll = () => {
    setSelected(new Set());
  };

  const handleApply = () => {
    const accepted = results
      .filter((r) => selected.has(r.instanceId))
      .map((r) => ({
        instanceId: r.instanceId,
        description: r.suggested_description,
        tags: r.suggested_tags,
      }));
    onApply(accepted);
  };

  const selectedCount = selected.size;
  const hasChanges = useMemo(
    () => results.some((r) => r.suggested_description && r.suggested_description !== r.current_description),
    [results]
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Bulk Story Context Update
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Review AI-suggested description and tag updates based on scene story context.
          </p>
        </DialogHeader>

        <div className="flex items-center justify-between px-1 py-2 border-b border-border/30">
          <span className="text-xs text-muted-foreground">
            {selectedCount} of {results.length} selected
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={selectAll} className="h-7 text-xs">
              Select All
            </Button>
            <Button variant="ghost" size="sm" onClick={deselectAll} className="h-7 text-xs">
              Deselect All
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-2 pr-2">
            {results.map((result) => {
              const Icon = typeIcons[result.assetType] ?? Package;
              const isSelected = selected.has(result.instanceId);
              const hasChange =
                result.suggested_description &&
                result.suggested_description !== result.current_description;
              const hasTagChange =
                result.suggested_tags.length > 0 &&
                JSON.stringify(result.suggested_tags.sort()) !==
                  JSON.stringify((result.current_tags ?? []).sort());

              return (
                <Collapsible key={result.instanceId} defaultOpen={!!hasChange}>
                  <div
                    className={cn(
                      'rounded-lg border p-3 transition-colors',
                      isSelected
                        ? 'border-primary/40 bg-primary/5'
                        : 'border-border/30 bg-card/50'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleAsset(result.instanceId)}
                        disabled={isApplying}
                      />
                      <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium flex-1 truncate">
                        {result.assetName}
                      </span>
                      <Badge
                        variant="secondary"
                        className="text-[10px] shrink-0"
                      >
                        {result.assetType}
                      </Badge>
                      {!hasChange && !hasTagChange && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] text-muted-foreground"
                        >
                          no changes
                        </Badge>
                      )}
                      <CollapsibleTrigger asChild>
                        <button
                          type="button"
                          className="p-1 rounded hover:bg-muted"
                        >
                          <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform [[data-state=open]_&]:rotate-180" />
                        </button>
                      </CollapsibleTrigger>
                    </div>

                    <CollapsibleContent>
                      <div className="mt-3 space-y-3 pl-8">
                        {/* Description diff */}
                        {hasChange && (
                          <div className="space-y-1.5">
                            <span className="text-xs font-medium text-muted-foreground">
                              Description
                            </span>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="rounded border border-border/30 bg-muted/20 p-2">
                                <span className="text-[10px] text-muted-foreground block mb-1">
                                  Current
                                </span>
                                <p className="text-xs text-foreground/80 line-clamp-4">
                                  {result.current_description || '(empty)'}
                                </p>
                              </div>
                              <div className="rounded border border-primary/30 bg-primary/5 p-2">
                                <span className="text-[10px] text-primary block mb-1">
                                  Suggested
                                </span>
                                <p className="text-xs text-foreground line-clamp-4">
                                  {result.suggested_description}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Tags diff */}
                        {hasTagChange && (
                          <div className="space-y-1.5">
                            <span className="text-xs font-medium text-muted-foreground">
                              Status Tags
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {result.suggested_tags.map((tag) => {
                                const isNew = !(result.current_tags ?? []).includes(tag);
                                return (
                                  <Badge
                                    key={tag}
                                    variant="secondary"
                                    className={cn(
                                      'text-[10px]',
                                      isNew
                                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                        : 'bg-muted text-muted-foreground'
                                    )}
                                  >
                                    {isNew && '+'}
                                    {tag}
                                  </Badge>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Reasoning */}
                        {result.reasoning && (
                          <div className="space-y-1">
                            <span className="text-xs font-medium text-muted-foreground">
                              Reasoning
                            </span>
                            <p className="text-xs text-muted-foreground/80 italic">
                              {result.reasoning}
                            </p>
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}
          </div>
        </ScrollArea>

        <DialogFooter className="flex-row justify-between sm:justify-between gap-2 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={isApplying}>
            Cancel
          </Button>
          <Button
            variant="gold"
            onClick={handleApply}
            disabled={selectedCount === 0 || isApplying || !hasChanges}
          >
            {isApplying
              ? 'Applying...'
              : `Apply Selected (${selectedCount})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
