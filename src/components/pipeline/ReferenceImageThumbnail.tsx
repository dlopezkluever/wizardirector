import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from '@/components/ui/hover-card';
import { Badge } from '@/components/ui/badge';
import { Pencil } from 'lucide-react';

interface ReferenceImageThumbnailProps {
  url: string;
  assetName: string;
  type: string;
  index: number;
  onReplace?: (index: number) => void;
}

export function ReferenceImageThumbnail({
  url,
  assetName,
  type,
  index,
  onReplace,
}: ReferenceImageThumbnailProps) {
  const handleClick = (e: React.MouseEvent) => {
    if (onReplace) {
      e.preventDefault();
      e.stopPropagation();
      onReplace(index);
    }
  };

  return (
    <HoverCard openDelay={200}>
      <HoverCardTrigger asChild>
        <div
          className={`relative w-8 h-8 rounded border border-border/50 overflow-hidden cursor-pointer ${onReplace ? 'group/ref' : ''}`}
          title={`${assetName} (${type})${onReplace ? ' — click to replace' : ''}`}
          onClick={handleClick}
        >
          <img
            src={url}
            alt={assetName}
            className="w-full h-full object-cover"
          />
          <span className="absolute top-0 left-0 bg-black/70 text-[8px] text-white px-0.5 leading-tight">
            {index + 1}
          </span>
          {onReplace && (
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/ref:opacity-100 transition-opacity flex items-center justify-center">
              <Pencil className="w-3 h-3 text-white" />
            </div>
          )}
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
