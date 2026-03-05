/**
 * VersionedTextarea — reusable textarea with version carousel, lock toggle, and save button.
 * Used across Stages 8, 9, and 10 for frame_prompt, video_prompt, end_frame_prompt, description_override.
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  ChevronRight,
  Save,
  Lock,
  Unlock,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import type { TextFieldVersion } from '@/lib/services/textFieldVersionService';

export interface VersionedTextareaProps {
  /** Fetch all versions for this field */
  fetchVersions: () => Promise<TextFieldVersion[]>;
  /** Create a new version */
  createVersion: (content: string, source: 'user_save' | 'ai_generation') => Promise<TextFieldVersion>;
  /** Select a specific version */
  selectVersion: (versionId: string) => Promise<TextFieldVersion>;
  /** React Query cache key for versions */
  queryKey: string[];
  /** Current value in the textarea */
  value: string;
  /** Called when the user types in the textarea */
  onChange: (value: string) => void;
  /** Called when a version is selected or created (new content from version system) */
  onVersionChange?: (content: string) => void;
  /** Label text (e.g. "Frame Prompt") */
  label?: React.ReactNode;
  /** Show a lock/edit toggle */
  showLockToggle?: boolean;
  /** Whether the field is locked (read-only) */
  locked?: boolean;
  /** Called when lock state changes */
  onLockChange?: (locked: boolean) => void;
  /** Max character count */
  maxLength?: number;
  /** Warning threshold for character count */
  warnLength?: number;
  /** Disable all interaction */
  disabled?: boolean;
  /** Number of textarea rows */
  rows?: number;
  /** Placeholder text */
  placeholder?: string;
  /** Additional class for the wrapper */
  className?: string;
}

export function VersionedTextarea({
  fetchVersions,
  createVersion,
  selectVersion,
  queryKey,
  value,
  onChange,
  onVersionChange,
  label,
  showLockToggle = false,
  locked = false,
  onLockChange,
  maxLength,
  warnLength,
  disabled = false,
  rows = 4,
  placeholder,
  className,
}: VersionedTextareaProps) {
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);

  // Fetch versions
  const { data: versions = [] } = useQuery({
    queryKey,
    queryFn: fetchVersions,
    staleTime: 30_000,
  });

  // Find the currently selected version
  const selectedVersion = versions.find(v => v.isSelected);
  const selectedIndex = selectedVersion
    ? versions.findIndex(v => v.id === selectedVersion.id)
    : -1;

  // Versions are newest-first from API; for navigation display, reverse to show oldest=v1
  const totalVersions = versions.length;
  // Display number: if selectedIndex is found, compute from the end (oldest = v1)
  const displayNumber = selectedIndex >= 0 ? totalVersions - selectedIndex : totalVersions;

  // Has unsaved changes compared to selected version
  const hasChanges = selectedVersion ? value !== selectedVersion.content : value.length > 0;

  // Character count status
  const charCount = value.length;
  const charStatus = maxLength && charCount > maxLength
    ? 'error'
    : warnLength && charCount > warnLength
      ? 'warning'
      : 'ok';

  // Navigate to adjacent version
  const handleNavigate = useCallback(async (direction: 'prev' | 'next') => {
    if (versions.length <= 1 || selectedIndex < 0) return;
    // prev = older = higher index in newest-first array; next = newer = lower index
    const targetIndex = direction === 'prev' ? selectedIndex + 1 : selectedIndex - 1;
    if (targetIndex < 0 || targetIndex >= versions.length) return;

    const targetVersion = versions[targetIndex];
    setIsSelecting(true);
    try {
      await selectVersion(targetVersion.id);
      onVersionChange?.(targetVersion.content);
      queryClient.invalidateQueries({ queryKey });
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to select version',
        variant: 'destructive',
      });
    } finally {
      setIsSelecting(false);
    }
  }, [versions, selectedIndex, selectVersion, onVersionChange, queryClient, queryKey]);

  // Save current value as new version
  const handleSave = useCallback(async () => {
    if (!hasChanges || isSaving) return;
    setIsSaving(true);
    try {
      const newVersion = await createVersion(value, 'user_save');
      onVersionChange?.(newVersion.content);
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Version saved' });
    } catch (err) {
      toast({
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Failed to save version',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }, [hasChanges, isSaving, value, createVersion, onVersionChange, queryClient, queryKey]);

  const isReadOnly = disabled || (showLockToggle && locked);

  return (
    <div className={cn('space-y-1.5', className)}>
      {/* Header row: nav arrows, label+version counter, lock toggle, save button */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {/* Nav arrows — only shown when 2+ versions */}
          {totalVersions >= 2 && (
            <button
              onClick={() => handleNavigate('prev')}
              disabled={isSelecting || selectedIndex >= totalVersions - 1}
              className="p-0.5 rounded hover:bg-muted/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Older version"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          {/* Label + version counter */}
          <span className="text-sm font-medium text-foreground flex items-center gap-1.5 truncate">
            {label}
            {totalVersions >= 1 && (
              <span className="text-xs text-muted-foreground font-normal">
                (v{displayNumber} of {totalVersions})
              </span>
            )}
          </span>

          {totalVersions >= 2 && (
            <button
              onClick={() => handleNavigate('next')}
              disabled={isSelecting || selectedIndex <= 0}
              className="p-0.5 rounded hover:bg-muted/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Newer version"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {isSelecting && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
        </div>

        <div className="flex items-center gap-2">
          {/* Lock toggle */}
          {showLockToggle && (
            <button
              onClick={() => onLockChange?.(!locked)}
              disabled={disabled}
              className={cn(
                'flex items-center gap-1 text-xs px-2 py-1 rounded-md border transition-colors',
                locked
                  ? 'border-border/40 text-muted-foreground hover:text-foreground hover:border-border'
                  : 'border-blue-500/40 text-blue-400 bg-blue-500/5'
              )}
            >
              {locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
              {locked ? 'Locked' : 'Editing'}
            </button>
          )}

          {/* Save button — only when there are unsaved changes and field is editable */}
          {hasChanges && !isReadOnly && (
            <Button
              variant="gold"
              size="sm"
              className="h-7 text-xs px-3"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <Save className="w-3 h-3 mr-1" />
              )}
              Save
            </Button>
          )}
        </div>
      </div>

      {/* Textarea */}
      <div className={cn(
        'relative rounded-lg border transition-colors',
        isReadOnly
          ? 'border-border/30 bg-muted/20'
          : 'border-blue-500/30',
        charStatus === 'error' && 'border-destructive/50',
        charStatus === 'warning' && 'border-amber-500/50',
      )}>
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={isReadOnly}
          rows={rows}
          placeholder={placeholder}
          className={cn(
            'resize-none border-0',
            isReadOnly && 'cursor-not-allowed opacity-80'
          )}
        />
        {isReadOnly && showLockToggle && (
          <div className="absolute top-2 right-2">
            <Lock className="w-4 h-4 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Character count */}
      {maxLength && (
        <div className="flex items-center justify-between">
          <span className={cn(
            'text-xs',
            charStatus === 'error' ? 'text-destructive' :
            charStatus === 'warning' ? 'text-amber-400' :
            'text-muted-foreground'
          )}>
            {charCount}/{maxLength} characters
          </span>
          {charStatus !== 'ok' && (
            <span className="text-xs text-amber-400">
              {charStatus === 'error' ? 'Too long' : 'Consider shortening'}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
