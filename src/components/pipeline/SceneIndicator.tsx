import { Badge } from '@/components/ui/badge';
import { formatSceneHeader } from '@/lib/utils';

interface SceneIndicatorProps {
  sceneNumber: number;
  slug: string;
}

export function SceneIndicator({ sceneNumber, slug }: SceneIndicatorProps) {
  if (!sceneNumber) return null;

  const parsed = slug ? formatSceneHeader(slug) : null;
  const shortSlug = parsed ? `${parsed.prefixShort} ${parsed.location}`.trim() : '';

  return (
    <Badge variant="outline" className="text-[11px] font-normal px-2 py-0.5 whitespace-nowrap">
      <span className="font-semibold">Scene {sceneNumber}</span>
      {shortSlug && (
        <>
          <span className="mx-1 text-muted-foreground">·</span>
          <span className="text-muted-foreground">{shortSlug}</span>
        </>
      )}
    </Badge>
  );
}
