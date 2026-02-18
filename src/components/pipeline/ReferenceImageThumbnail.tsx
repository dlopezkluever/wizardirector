import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from '@/components/ui/hover-card';
import { Badge } from '@/components/ui/badge';

interface ReferenceImageThumbnailProps {
  url: string;
  assetName: string;
  type: string;
  index: number;
}

export function ReferenceImageThumbnail({
  url,
  assetName,
  type,
  index,
}: ReferenceImageThumbnailProps) {
  return (
    <HoverCard openDelay={200}>
      <HoverCardTrigger asChild>
        <div
          className="relative w-8 h-8 rounded border border-border/50 overflow-hidden cursor-pointer"
          title={`${assetName} (${type})`}
        >
          <img
            src={url}
            alt={assetName}
            className="w-full h-full object-cover"
          />
          <span className="absolute top-0 left-0 bg-black/70 text-[8px] text-white px-0.5 leading-tight">
            {index + 1}
          </span>
        </div>
      </HoverCardTrigger>
      <HoverCardContent side="top" className="w-56 p-2">
        <img
          src={url}
          alt={assetName}
          className="w-full aspect-video object-cover rounded mb-2"
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-foreground font-medium truncate">
            {assetName}
          </span>
          <Badge variant="secondary" className="text-[10px] shrink-0">
            {type}
          </Badge>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
