import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface StyleChangeWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentStyleName: string;
  affectedImageCount: number;
  onMarkOutdated: () => void;
  onClearImages: () => void;
}

export function StyleChangeWarningDialog({
  open,
  onOpenChange,
  currentStyleName,
  affectedImageCount,
  onMarkOutdated,
  onClearImages,
}: StyleChangeWarningDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Change Visual Style?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                Changing the visual style from <strong>{currentStyleName}</strong> will
                affect {affectedImageCount} generated image{affectedImageCount !== 1 ? 's' : ''}.
              </p>
              <p>Choose how to handle existing images:</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button
            variant="outline"
            className="text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={() => {
              onClearImages();
              onOpenChange(false);
            }}
          >
            Clear All Images
          </Button>
          <Button
            onClick={() => {
              onMarkOutdated();
              onOpenChange(false);
            }}
          >
            Mark Images as Outdated
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
