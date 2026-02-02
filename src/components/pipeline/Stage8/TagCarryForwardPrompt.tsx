/**
 * Tag Carry-Forward Prompt (Feature 5.3, Task 5)
 * Shown when entering Stage 8 for a new scene to ask user about carrying forward tags
 * from prior scene instances.
 */

import { useState, useEffect } from 'react';
import { Link2, AlertCircle, Check, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { getTagColors } from '@/lib/constants/statusTags';
import type { SceneAssetInstance } from '@/types/scene';

export interface TagCarryForwardDecision {
  instanceId: string;
  assetName: string;
  tagsToCarry: string[];
  carryAll: boolean;
}

export interface TagCarryForwardPromptProps {
  isOpen: boolean;
  onClose: () => void;
  priorSceneNumber: number;
  currentSceneNumber: number;
  /** Instances from prior scene that have carry_forward=true and tags */
  priorInstances: Array<{
    instance: SceneAssetInstance;
    assetName: string;
  }>;
  onConfirm: (decisions: TagCarryForwardDecision[]) => void;
}

export function TagCarryForwardPrompt({
  isOpen,
  onClose,
  priorSceneNumber,
  currentSceneNumber,
  priorInstances,
  onConfirm,
}: TagCarryForwardPromptProps) {
  // Initialize all with carryAll=true (default behavior)
  const [decisions, setDecisions] = useState<Record<string, TagCarryForwardDecision>>(
    () => {
      const initial: Record<string, TagCarryForwardDecision> = {};
      priorInstances.forEach(({ instance, assetName }) => {
        initial[instance.id] = {
          instanceId: instance.id,
          assetName,
          tagsToCarry: [...(instance.status_tags ?? [])],
          carryAll: true,
        };
      });
      return initial;
    }
  );

  // Sync decisions when dialog opens with new priorInstances
  useEffect(() => {
    if (!isOpen || priorInstances.length === 0) return;
    const initial: Record<string, TagCarryForwardDecision> = {};
    priorInstances.forEach(({ instance, assetName }) => {
      initial[instance.id] = {
        instanceId: instance.id,
        assetName,
        tagsToCarry: [...(instance.status_tags ?? [])],
        carryAll: true,
      };
    });
    setDecisions(initial);
  }, [isOpen, priorInstances]);

  const handleToggleAll = (instanceId: string, carry: boolean) => {
    setDecisions(prev => ({
      ...prev,
      [instanceId]: {
        ...prev[instanceId],
        carryAll: carry,
        tagsToCarry: carry ? (priorInstances.find(p => p.instance.id === instanceId)?.instance.status_tags ?? []) : [],
      },
    }));
  };

  const handleToggleTag = (instanceId: string, tag: string) => {
    setDecisions(prev => {
      const current = prev[instanceId];
      const hasTag = current.tagsToCarry.includes(tag);
      const newTags = hasTag
        ? current.tagsToCarry.filter(t => t !== tag)
        : [...current.tagsToCarry, tag];

      const priorTags = priorInstances.find(p => p.instance.id === instanceId)?.instance.status_tags ?? [];
      const carryAll = newTags.length === priorTags.length;

      return {
        ...prev,
        [instanceId]: {
          ...current,
          tagsToCarry: newTags,
          carryAll,
        },
      };
    });
  };

  const handleConfirm = () => {
    onConfirm(Object.values(decisions));
    onClose();
  };

  const handleCarryAll = () => {
    const allDecisions: TagCarryForwardDecision[] = priorInstances.map(({ instance, assetName }) => ({
      instanceId: instance.id,
      assetName,
      tagsToCarry: [...(instance.status_tags ?? [])],
      carryAll: true,
    }));
    onConfirm(allDecisions);
    onClose();
  };

  const handleCarryNone = () => {
    const noneDecisions: TagCarryForwardDecision[] = priorInstances.map(({ instance, assetName }) => ({
      instanceId: instance.id,
      assetName,
      tagsToCarry: [],
      carryAll: false,
    }));
    onConfirm(noneDecisions);
    onClose();
  };

  const totalTags = priorInstances.reduce((sum, p) => sum + (p.instance.status_tags?.length ?? 0), 0);
  const selectedTags = Object.values(decisions).reduce((sum, d) => sum + d.tagsToCarry.length, 0);

  return (
    <Dialog open={isOpen} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-primary" />
            Carry Forward Status Tags from Scene {priorSceneNumber}?
          </DialogTitle>
          <DialogDescription>
            The following assets from Scene {priorSceneNumber} have status tags that can carry forward to Scene {currentSceneNumber}.
            Choose which tags to keep for continuity.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-96 pr-4">
          <div className="space-y-4">
            {priorInstances.map(({ instance, assetName }) => {
              const decision = decisions[instance.id];
              const tags = instance.status_tags ?? [];

              return (
                <div key={instance.id} className="rounded-lg border border-border/50 bg-muted/30 p-4">
                  {/* Asset Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-sm">{assetName}</h4>
                      <p className="text-xs text-muted-foreground">
                        {tags.length} tag{tags.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`carry-all-${instance.id}`}
                        checked={decision?.carryAll ?? true}
                        onCheckedChange={checked => handleToggleAll(instance.id, checked as boolean)}
                      />
                      <Label
                        htmlFor={`carry-all-${instance.id}`}
                        className="text-xs cursor-pointer"
                      >
                        Carry all
                      </Label>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2">
                    {tags.map(tag => {
                      const isSelected = decision?.tagsToCarry.includes(tag) ?? true;
                      const colors = getTagColors(tag);

                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => handleToggleTag(instance.id, tag)}
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all',
                            isSelected
                              ? cn(colors.bg, colors.text, colors.border, 'opacity-100')
                              : 'bg-muted/50 text-muted-foreground border-border/30 opacity-50 hover:opacity-75'
                          )}
                        >
                          {isSelected ? (
                            <Check className="w-3 h-3" />
                          ) : (
                            <X className="w-3 h-3" />
                          )}
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <div className="flex items-center gap-2 rounded-lg border border-info/30 bg-info/10 p-3 text-sm">
          <AlertCircle className="w-4 h-4 text-info shrink-0" />
          <p className="text-info">
            Selected tags will be applied to the starting state of these assets in Scene {currentSceneNumber}.
            You can modify them later in the Visual State Editor.
          </p>
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {selectedTags} of {totalTags} tags selected
          </span>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleCarryNone}>
            Carry None
          </Button>
          <Button variant="outline" onClick={handleCarryAll}>
            Carry All
          </Button>
          <Button onClick={handleConfirm}>
            Confirm Selection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
