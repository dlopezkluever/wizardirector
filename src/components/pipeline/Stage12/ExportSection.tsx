import {
  Download,
  Upload,
  Cloud,
  Scissors,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const exportOptions = [
  { label: 'Download MP4', icon: Download },
  { label: 'YouTube', icon: Upload },
  { label: 'Google Drive', icon: Cloud },
  { label: 'CapCut', icon: Scissors },
] as const;

export function ExportSection() {
  return (
    <div className="p-4 border-t border-border/50">
      <h3 className="font-display text-sm font-semibold text-foreground mb-2">
        Export
      </h3>
      <div className="space-y-1.5">
        {exportOptions.map(({ label, icon: Icon }) => (
          <Button
            key={label}
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 h-8 text-xs"
            disabled
          >
            <Icon className="w-3.5 h-3.5 text-muted-foreground" />
            <span>{label}</span>
            <Badge
              variant="outline"
              className="ml-auto text-[10px] px-1.5 py-0 h-4 text-muted-foreground border-border/50"
            >
              Soon
            </Badge>
          </Button>
        ))}
      </div>
    </div>
  );
}
