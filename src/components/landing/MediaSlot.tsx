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
 * Colors driven by CSS custom properties (--l-accent, etc.) set on the Landing root.
 */
function ViewfinderFrame({ children, className }: { children: React.ReactNode; className?: string }) {
  const cornerStyle = { borderColor: 'var(--l-accent)' }
  return (
    <div className={cn('relative', className)}>
      <span className="absolute -top-px -left-px h-4 w-4 border-l border-t" style={cornerStyle} />
      <span className="absolute -top-px -right-px h-4 w-4 border-r border-t" style={cornerStyle} />
      <span className="absolute -bottom-px -left-px h-4 w-4 border-l border-b" style={cornerStyle} />
      <span className="absolute -bottom-px -right-px h-4 w-4 border-r border-b" style={cornerStyle} />
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
          <figcaption className="text-xs uppercase tracking-widest" style={{ color: 'var(--l-caption)' }}>
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
          className={cn('flex flex-col items-center justify-center gap-2', aspect)}
          style={{ border: '1px solid var(--l-line)', backgroundColor: 'var(--l-surface)' }}
        >
          {/* Crosshair marks */}
          <div className="relative h-5 w-5">
            <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2" style={{ backgroundColor: 'var(--l-crosshair)' }} />
            <span className="absolute top-1/2 left-0 w-full h-px -translate-y-1/2" style={{ backgroundColor: 'var(--l-crosshair)' }} />
          </div>
          <span className="text-[10px] uppercase tracking-[0.2em]" style={{ color: 'var(--l-placeholder)' }}>
            {alt}
          </span>
        </div>
      </ViewfinderFrame>
      {caption && (
        <figcaption className="text-xs uppercase tracking-widest" style={{ color: 'var(--l-caption)' }}>
          {caption}
        </figcaption>
      )}
    </figure>
  )
}
