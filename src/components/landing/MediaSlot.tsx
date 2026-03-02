import { Film } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MediaSlotProps {
  src?: string
  alt: string
  aspectRatio?: '16/9' | '4/3' | '1/1' | 'auto'
  caption?: string
  className?: string
}

const aspectMap = {
  '16/9': 'aspect-video',
  '4/3': 'aspect-[4/3]',
  '1/1': 'aspect-square',
  auto: '',
}

export function MediaSlot({
  src,
  alt,
  aspectRatio = '16/9',
  caption,
  className,
}: MediaSlotProps) {
  const aspect = aspectMap[aspectRatio]

  if (src) {
    return (
      <figure className={cn('flex flex-col gap-2', className)}>
        <div
          className={cn(
            'overflow-hidden rounded-xl border border-border/50 shadow-lg',
            'bg-card/60 backdrop-blur-sm',
            aspect
          )}
        >
          <img
            src={src}
            alt={alt}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
        {caption && (
          <figcaption className="text-center text-sm text-muted-foreground">
            {caption}
          </figcaption>
        )}
      </figure>
    )
  }

  return (
    <figure className={cn('flex flex-col gap-2', className)}>
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-3 rounded-xl',
          'border-2 border-dashed border-border/40',
          'bg-card/30 backdrop-blur-sm',
          aspect
        )}
      >
        <Film className="h-8 w-8 text-muted-foreground/50" />
        <span className="max-w-[80%] text-center text-xs text-muted-foreground/60">
          {alt}
        </span>
      </div>
      {caption && (
        <figcaption className="text-center text-sm text-muted-foreground">
          {caption}
        </figcaption>
      )}
    </figure>
  )
}
