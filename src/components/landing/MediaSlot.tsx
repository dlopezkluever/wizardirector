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

/**
 * Viewfinder corner marks — the "Technical Auteur" motif.
 * Replaces rounded cards with camera field-of-view marks.
 */
function ViewfinderFrame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('relative', className)}>
      {/* Top-left corner */}
      <span className="absolute -top-px -left-px h-4 w-4 border-l border-t border-[oklch(85%_0.18_92)]" />
      {/* Top-right corner */}
      <span className="absolute -top-px -right-px h-4 w-4 border-r border-t border-[oklch(85%_0.18_92)]" />
      {/* Bottom-left corner */}
      <span className="absolute -bottom-px -left-px h-4 w-4 border-l border-b border-[oklch(85%_0.18_92)]" />
      {/* Bottom-right corner */}
      <span className="absolute -bottom-px -right-px h-4 w-4 border-r border-b border-[oklch(85%_0.18_92)]" />
      {children}
    </div>
  )
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
        <ViewfinderFrame>
          <div className={cn('overflow-hidden', aspect)}>
            <img
              src={src}
              alt={alt}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        </ViewfinderFrame>
        {caption && (
          <figcaption className="text-xs uppercase tracking-widest text-[oklch(50%_0.02_260)]">
            {caption}
          </figcaption>
        )}
      </figure>
    )
  }

  return (
    <figure className={cn('flex flex-col gap-2', className)}>
      <ViewfinderFrame>
        <div
          className={cn(
            'flex flex-col items-center justify-center gap-2',
            'border border-[oklch(25%_0.02_260)]',
            'bg-[oklch(14%_0.01_260)]',
            aspect
          )}
        >
          {/* Crosshair marks */}
          <div className="relative h-5 w-5">
            <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-[oklch(30%_0.02_260)]" />
            <span className="absolute top-1/2 left-0 w-full h-px -translate-y-1/2 bg-[oklch(30%_0.02_260)]" />
          </div>
          <span className="text-[10px] uppercase tracking-[0.2em] text-[oklch(40%_0.02_260)]">
            {alt}
          </span>
        </div>
      </ViewfinderFrame>
      {caption && (
        <figcaption className="text-xs uppercase tracking-widest text-[oklch(50%_0.02_260)]">
          {caption}
        </figcaption>
      )}
    </figure>
  )
}
