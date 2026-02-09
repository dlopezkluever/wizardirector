/**
 * Stage 8 – Use Master As-Is Checkbox (3B.4)
 * Toggle to use the master asset image directly without generating a new one.
 */

import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { sceneAssetService } from '@/lib/services/sceneAssetService';

interface UseMasterAsIsCheckboxProps {
  projectId: string;
  sceneId: string;
  instanceId: string;
  checked: boolean;
  disabled?: boolean;
}

export function UseMasterAsIsCheckbox({
  projectId,
  sceneId,
  instanceId,
  checked,
  disabled,
}: UseMasterAsIsCheckboxProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (enabled: boolean) =>
      sceneAssetService.setUseMasterAsIs(projectId, sceneId, instanceId, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scene-assets', projectId, sceneId] });
      queryClient.invalidateQueries({ queryKey: ['scene-asset-attempts', projectId, sceneId, instanceId] });
      toast.success(checked ? 'Master as-is disabled' : 'Using master image as-is');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const handleChange = useCallback(
    (value: boolean | 'indeterminate') => {
      if (typeof value !== 'boolean') return;
      mutation.mutate(value);
    },
    [mutation]
  );

  return (
    <div className="flex items-center gap-2">
      {mutation.isPending ? (
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      ) : (
        <Checkbox
          checked={checked}
          onCheckedChange={handleChange}
          disabled={disabled || mutation.isPending}
          id={`master-as-is-${instanceId}`}
        />
      )}
      <label
        htmlFor={`master-as-is-${instanceId}`}
        className="text-sm text-muted-foreground cursor-pointer select-none"
      >
        Use master as-is
      </label>
    </div>
  );
}
