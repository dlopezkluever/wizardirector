/**
 * Stage 8 – Status Tags Editor (Task 9)
 * Add/remove status metadata tags (e.g. muddy, bloody, torn) with instance-level Carry Forward toggle.
 * When carry_forward is true, this instance's state (including status_tags) is used as starting state for next scene.
 */

import { useState } from 'react';
import { Tag, Plus, X, Link2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { getTagColors, getTagSuggestions } from '@/lib/constants/statusTags';

export interface StatusTagsEditorProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  /** Instance-level carry forward: when true, state (including tags) persists to next scene */
  carryForward?: boolean;
  onCarryForwardChange?: (value: boolean) => void;
  /** Tags already used in the current project/branch; shown first in autocomplete for consistency */
  projectTags?: string[];
  disabled?: boolean;
  className?: string;
}

export function StatusTagsEditor({
  tags,
  onChange,
  carryForward = true,
  onCarryForwardChange,
  projectTags,
  disabled,
  className,
}: StatusTagsEditorProps) {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleAddTag = (tag?: string) => {
    const trimmed = (tag ?? inputValue).trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
      setInputValue('');
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleInputChange = (value: string) => {
    setInputValue(value);
    if (value.trim()) {
      setSuggestions(getTagSuggestions(value, projectTags));
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleRemoveTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag));
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Tag className="w-4 h-4 text-primary" />
          Status Tags (Conditions)
        </Label>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => {
            const colors = getTagColors(tag);
            return (
              <Badge
                key={tag}
                variant="secondary"
                className={cn(
                  'gap-1 pr-1 border',
                  colors.bg,
                  colors.text,
                  colors.border
                )}
              >
                {tag}
                {!disabled && (
                  <button
                    type="button"
                    className="rounded-full p-0.5 hover:bg-muted hover:text-destructive transition-colors"
                    onClick={() => handleRemoveTag(tag)}
                    aria-label={`Remove ${tag}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </Badge>
            );
          })}
        </div>
        {!disabled && (
          <div className="relative flex gap-2">
            <div className="relative flex-1">
              <Input
                value={inputValue}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                  if (e.key === 'Escape') {
                    setShowSuggestions(false);
                  }
                }}
                onFocus={() => {
                  if (inputValue.trim()) setShowSuggestions(true);
                }}
                onBlur={() => {
                  setTimeout(() => setShowSuggestions(false), 200);
                }}
                placeholder="Add tag (e.g. muddy, torn, bloody)"
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 rounded-lg border border-border bg-card shadow-lg">
                  <div className="p-1 space-y-0.5 max-h-48 overflow-y-auto">
                    {suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        className="w-full text-left px-3 py-1.5 text-sm rounded hover:bg-muted transition-colors"
                        onClick={() => handleAddTag(suggestion)}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <Button type="button" size="sm" variant="outline" onClick={() => handleAddTag()}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Tags describe visual conditions. They carry forward to the next scene when Carry Forward is enabled.
        </p>
      </div>

      {onCarryForwardChange && (
        <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 p-3">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-primary" />
            <div>
              <Label htmlFor="carry-forward" className="text-sm font-medium cursor-pointer">
                Carry forward to next scene
              </Label>
              <p className="text-xs text-muted-foreground">
                Use this instance&apos;s state (description + tags) as the starting state for the next scene.
              </p>
            </div>
          </div>
          <Switch
            id="carry-forward"
            checked={carryForward}
            onCheckedChange={onCarryForwardChange}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
}
