# Image Carousel UI Guide

Reference implementation: `src/components/pipeline/FramePanel.tsx` (Stage 10)

---

## Overview

The carousel displays multiple AI-generated images for a single asset (frame, style capsule, etc.) and lets the user navigate, select, and manage generations. It uses shadcn/ui's `Carousel` (Embla under the hood) with inside-the-image arrows, hover overlays, and a z-index layering system that prevents controls from blocking each other.

---

## Component Imports

```tsx
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from '@/components/ui/carousel';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
```

`TooltipProvider` must exist somewhere above in the tree (it's in `App.tsx`).

---

## Data Shape

Each carousel item needs at minimum:

```ts
interface Generation {
  jobId: string;      // unique key
  imageUrl: string;
  isCurrent: boolean; // the "selected" / active generation
  createdAt: string;  // ISO date
  prompt?: string;    // optional, shown in tooltip
  costCredits?: number;
}
```

Fetched via React Query, enabled only when `generationCount > 1`:

```tsx
const { data: generations = [] } = useQuery({
  queryKey: ['generations', entityId],
  queryFn: () => fetchGenerations(entityId),
  enabled: generationCount > 1 && !!entityId,
});
```

---

## Carousel Structure

```
Carousel (relative container, w-full)
├── CarouselContent
│   └── CarouselItem (per generation)
│       └── Tooltip > TooltipTrigger > div.aspect-video.relative.group
│           ├── img (object-cover, fills container)
│           ├── Badges (z-10) — Selected, Date, Counter
│           └── Hover overlay (z-20) — action buttons
├── CarouselPrevious (z-30, inside image)
└── CarouselNext (z-30, inside image)
```

---

## Z-Index Layers

Three explicit layers prevent controls from being trapped under overlays:

| Layer  | Z-Index | Contents                        |
|--------|---------|---------------------------------|
| Badges | `z-10`  | Selected, date, counter badges  |
| Overlay| `z-20`  | Hover action buttons            |
| Arrows | `z-30`  | Carousel prev/next buttons      |

Badges are visible by default but naturally hide behind the overlay on hover. Arrows are always on top and always clickable.

---

## Arrow Styling

Arrows are positioned **inside** the image bounds — not outside — and hidden when at the boundary:

```tsx
<CarouselPrevious
  className="left-2 z-30 h-7 w-7 bg-black/60 border-white/20 text-white hover:bg-black/80 hover:text-white disabled:hidden"
/>
<CarouselNext
  className="right-2 z-30 h-7 w-7 bg-black/60 border-white/20 text-white hover:bg-black/80 hover:text-white disabled:hidden"
/>
```

Key classes:
- `left-2` / `right-2` — overrides shadcn's default `-left-12` / `-right-12` (twMerge resolves the conflict)
- `z-30` — above overlays so arrows are never blocked
- `bg-black/60 border-white/20 text-white` — semi-transparent dark pill, visible on any image
- `hover:bg-black/80 hover:text-white` — darker on hover
- `disabled:hidden` — completely gone when at first/last slide (no faded state)

The `CarouselPrevious`/`CarouselNext` components already set `disabled={!canScrollPrev/Next}` internally, so `disabled:hidden` is all that's needed.

---

## Carousel Item (Image Card)

Each item is an `aspect-video` container with `relative group` for hover behavior:

```tsx
<div
  className={cn(
    'aspect-video rounded-lg border-2 overflow-hidden bg-muted/50 relative group cursor-pointer',
    gen.isCurrent ? 'border-amber-400' : 'border-border/30'
  )}
  onClick={() => setPreviewUrl(gen.imageUrl)}
>
```

- `border-amber-400` — gold/yellow outline on the currently selected generation
- `border-border/30` — subtle outline on non-selected
- `cursor-pointer` + `onClick` — click opens full-size preview Dialog
- `group` — enables `group-hover:` on child overlays

---

## Badge Placement

Three badges positioned absolutely inside each image:

```
┌──────────────────────────────────┐
│ [Selected]              [Date]   │  ← top-1 left-1 / top-1 right-1
│                                  │
│           (image)                │
│                                  │
│                        [1/3]     │  ← bottom-1 right-1
└──────────────────────────────────┘
```

**Selected badge** (top-left, only on current):
```tsx
<Badge className="absolute top-1 left-1 z-10 bg-amber-400 text-amber-900 text-[10px] gap-1">
  <Check className="w-3 h-3" /> Selected
</Badge>
```

**Date badge** (top-right, all items):
```tsx
<Badge variant="secondary" className="absolute top-1 right-1 z-10 text-[10px] bg-background/80 backdrop-blur-sm">
  {new Date(gen.createdAt).toLocaleDateString()}
</Badge>
```

**Counter badge** (bottom-right, all items):
```tsx
<Badge variant="secondary" className="absolute bottom-1 right-1 z-10 text-[10px] bg-background/80 backdrop-blur-sm font-mono">
  {currentIndex + 1}/{total}
</Badge>
```

The counter uses `currentIndex` state (not the item's own index) so it always shows the active slide position. `font-mono` keeps the width stable as numbers change.

---

## Hover Overlays

Two overlay variants, both using `absolute inset-0 z-20` with fade transition:

### Current/Selected Item — primary actions
```tsx
{gen.isCurrent && (
  <div className="absolute inset-0 z-20 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
    <Button variant="glass" size="sm" onClick={(e) => { e.stopPropagation(); onInpaint(); }}>
      <Paintbrush /> Inpaint
    </Button>
    <Button variant="glass" size="sm" onClick={(e) => { e.stopPropagation(); onCompare(); }}>
      <Eye /> Compare
    </Button>
  </div>
)}
```

### Non-Current Item — select/delete actions
```tsx
{!gen.isCurrent && (
  <div className="absolute inset-0 z-20 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
    <Button size="sm" className="bg-amber-400 hover:bg-amber-500 text-amber-900"
      onClick={(e) => { e.stopPropagation(); selectMutation.mutate(gen.jobId); }}>
      <Check /> Select
    </Button>
    <Button size="sm" variant="destructive"
      onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(gen.jobId); }}>
      <Trash2 />
    </Button>
  </div>
)}
```

**Critical:** All overlay buttons use `e.stopPropagation()` to prevent the click-to-enlarge handler on the parent div from firing.

---

## Tracking Current Slide Index

Use `setApi` callback to subscribe to Embla's `select` event:

```tsx
const [currentIndex, setCurrentIndex] = useState(0);

<Carousel
  opts={{ startIndex: generations.findIndex(g => g.isCurrent) }}
  setApi={(api) => {
    if (!api) return;
    api.on('select', () => setCurrentIndex(api.selectedScrollSnap()));
    setCurrentIndex(api.selectedScrollSnap());
  }}
>
```

`opts.startIndex` opens the carousel to the currently selected generation (not always index 0).

---

## Click-to-Enlarge Preview

A simple Dialog triggered by `previewUrl` state:

```tsx
const [previewUrl, setPreviewUrl] = useState<string | null>(null);

// On each image div:
onClick={() => setPreviewUrl(gen.imageUrl)}

// Dialog:
{previewUrl && (
  <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
    <DialogContent className="max-w-3xl p-2 bg-black/90 border-none">
      <img src={previewUrl} className="w-full h-auto max-h-[85vh] object-contain rounded" />
    </DialogContent>
  </Dialog>
)}
```

---

## Tooltip (Metadata on Hover)

Each carousel item is wrapped in `Tooltip > TooltipTrigger`:

```tsx
<TooltipContent side="bottom" className="max-w-sm text-xs">
  <p className="font-medium mb-1">Prompt:</p>
  <p className="text-muted-foreground line-clamp-3">{gen.prompt}</p>
  <p className="text-muted-foreground mt-1">Cost: {gen.costCredits.toFixed(2)} credits</p>
  <p className="text-muted-foreground mt-1">{new Date(gen.createdAt).toLocaleDateString()}</p>
</TooltipContent>
```

---

## Conditional Rendering (Single vs. Carousel vs. Empty)

The parent component picks the right renderer:

```tsx
{showCarousel ? (
  renderCarousel()        // 2+ generations
) : hasImage ? (
  renderSingleImage()     // 1 generation (same aspect-video container, no arrows)
) : isGenerating ? (
  <SpinnerState />        // generation in progress
) : (
  <EmptyState />          // no generations yet
)}
```

`showCarousel = generations.length > 1` — the carousel only appears when there's more than one generation to navigate. A single image uses the same `aspect-video` container with the same border/overlay pattern but no carousel wrapper.

---

## Mutations (Select / Delete)

```tsx
const selectMutation = useMutation({
  mutationFn: (jobId: string) => service.selectGeneration(entityId, jobId),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['generations', entityId] });
    queryClient.invalidateQueries({ queryKey: ['parent-data', parentId] });
  },
});

const deleteMutation = useMutation({
  mutationFn: (jobId: string) => service.deleteGeneration(entityId, jobId),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['generations', entityId] });
    queryClient.invalidateQueries({ queryKey: ['parent-data', parentId] });
  },
});
```

Both invalidate the generations list and the parent data query so the UI refreshes after select/delete.

---

## Checklist for Applying to Another Stage

1. Add `useQuery` for fetching generations (enable when `count > 1`)
2. Add `selectMutation` and `deleteMutation`
3. Add `currentIndex` and `previewUrl` state
4. Replace the image display area with the conditional render (carousel / single / empty / generating)
5. Use the exact z-index layers: badges `z-10`, overlays `z-20`, arrows `z-30`
6. Arrows: `left-2`/`right-2`, `disabled:hidden`, semi-transparent dark styling
7. Counter badge: bottom-right, `font-mono`, uses `currentIndex` state
8. All overlay buttons: `e.stopPropagation()`
9. Wrap in `Tooltip` for metadata on hover
10. Add `Dialog` for click-to-enlarge
