# Content Access Carousel v2 (Stills + Clips Tabs) & Stage 5 Asset Merge/Split

**Wave**: 1
**Scope**: Two features — (A) major overhaul of Content Access Carousel with new Stills & Clips tabs, removal of Rearview tab, and UI polish; (B) asset merge/split capability for Stage 5

> **Note**: 4A.1 (Content Access Carousel v1) has already been built and merged. `ContentAccessCarousel.tsx` is integrated across stages 6-12. This task replaces the Rearview tab, adds two new tabs, and refines the panel UI. Separately, it adds merge/split to the Stage 5 asset library.

---

## Feature A: Content Access Carousel v2

### A.1 — Overview & Motivation

The current Rearview Mirror tab shows only a single end-frame thumbnail from the immediately prior scene. This is too limited — users working on Scene 3 need to reference visual content from Scenes 1, 2, 4, 5 (any scene they've already generated stills/clips for). Two new tabs replace Rearview:

- **Stills Tab** — Browse start frames from every shot across all other scenes
- **Clips Tab** — Browse and play video clips from every shot across all other scenes

Both tabs use the same UI pattern: **scene-level tabs** at the top → **horizontal inner carousel** of that scene's shot content below.

---

### A.2 — Tab Structure (Updated)

After this work, the Content Access Carousel's tab bar will be:

| Tab | ID | Icon | Availability | Description |
|-----|----|------|-------------|-------------|
| **Script** | `script` | `FileText` | Stages 6-12 (always) | Current scene's script excerpt. **Unchanged.** |
| **Stills** | `stills` | `Image` (or `Frame`) | Stages 6-12 (always) | Start frames from all other scenes' shots. Empty state if no frames exist yet. |
| **Clips** | `clips` | `Film` (or `Play`) | Stages 6-12 (always) | Video clips from all other scenes' shots. Empty state if no clips exist yet. |
| **Shots** | `shots` | `Clapperboard` | Stages 8-12 only | Current scene's shot list. **Unchanged.** |

**Removed**: The `rearview` tab is deleted entirely.

**Tab order**: Script → Stills → Clips → Shots

---

### A.3 — Panel UI Polish

#### A.3.1 — Collapsed State
- **Before**: Tab pills + collapse arrow always visible
- **After**: When collapsed, show ONLY a left-aligned `"Content Access"` label + the expand/collapse chevron arrow. Tab pills are hidden.

#### A.3.2 — Expanded State
- Left-aligned `"Content Access"` label (small, `text-xs text-muted-foreground`, always visible)
- Tab pills to the right of the label (same row)
- Collapse arrow far-right
- Content area below with resize handle (unchanged)

#### A.3.3 — Layout Change
```
┌─────────────────────────────────────────────────────────────┐
│ Content Access    [Script] [Stills] [Clips] [Shots]     [▲] │  ← expanded header
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  (tab content area — carousel / script / shots)             │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                        ≡ (resize handle)                    │
└─────────────────────────────────────────────────────────────┘

Collapsed:
┌─────────────────────────────────────────────────────────────┐
│ Content Access                                          [▼] │
└─────────────────────────────────────────────────────────────┘
```

---

### A.4 — Stills Tab Specification

#### Purpose
Let the user browse the **start frame** of every shot from all scenes OTHER than the current scene. Provides visual continuity reference and a quick way to check what's been generated elsewhere.

#### Scene Tabs (Inner Navigation)
- A horizontal row of scene tab pills inside the Stills content area: `Scene 1`, `Scene 2`, etc.
- **Only show scenes that have at least one generated/approved start frame.** Scenes without frame data are omitted (not greyed out).
- The current scene is **excluded** (its stills are visible in the main stage UI already).
- Scene tab pills are styled smaller than the main Content Access tabs — secondary styling (`text-[10px]` or `text-xs`, `bg-muted/30`).

#### Default Scene Selection
- **Stages 7-12**: Auto-select the **most recent prior scene** (scene N-1). If N-1 has no stills, fall back to the nearest prior scene that does. If no prior scenes have stills, select the first available scene.
- **Stage 6 (Script Hub)**: Auto-select the **first available scene** (lowest scene number with stills).

#### Inner Carousel
- Horizontal carousel of thumbnails within the selected scene tab.
- Each item displays:
  - **Start frame thumbnail** — fixed size (e.g., `w-32 h-20` or `w-40 h-24`), `object-cover`, `rounded-md`, subtle border
  - **Shot ID label** below the thumbnail — e.g., `"1A"`, `"1B-M"`, `"2C"` — `text-xs font-mono`
- Carousel scrolls horizontally with arrow buttons (left/right) and/or swipe.
- Click on a thumbnail to enlarge (lightbox/modal with the full-resolution image).
- If only 1-3 stills exist for a scene, they should be left-aligned (not centered in a carousel with excessive whitespace).

#### Empty State
When no scenes have generated start frames:
```
No stills available yet. Start frames are generated in Stage 10.
```

#### Data Source
- **Frames**: Fetched via `frameService.fetchFrames(projectId, sceneId)` per scene — returns `ShotWithFrames[]` which includes `startFrame: Frame | null` with `imageUrl`.
- **Scenes list**: Already fetched by the carousel's existing `useQuery(['scenes', projectId])`.
- **Strategy**: Fetch frames for all relevant scenes in parallel using `Promise.all()`. Cache via React Query with `queryKey: ['all-scene-frames', projectId]` or per-scene `['frames', projectId, sceneId]`.

> **Implementation Note — New Batch Endpoint (Recommended)**:
> Currently, frames are only fetchable per-scene (`GET /api/projects/:projectId/scenes/:sceneId/frames`). For efficiency, consider adding a batch endpoint:
> ```
> GET /api/projects/:projectId/batch-start-frames
> ```
> Returns: `Record<sceneId, { sceneNumber: number, shots: { shotId: string, shotLabel: string, startFrameUrl: string | null }[] }>`
>
> This avoids N parallel requests. However, client-side parallel fetching is acceptable for MVP if batch endpoint is deferred.

---

### A.5 — Clips Tab Specification

#### Purpose
Let the user browse and play **video clips** from all scenes OTHER than the current scene. Provides narrative continuity review — the user can watch adjacent scenes' clips to ensure visual/tonal consistency.

#### Scene Tabs (Inner Navigation)
- Same pattern as Stills tab: horizontal scene tab pills.
- **Only show scenes that have at least one completed video job** (status: `'completed'`, `videoUrl` non-null).
- Current scene is **excluded**.

#### Default Scene Selection
- Same logic as Stills tab (most recent prior scene for stages 7-12, first available for stage 6).

#### Inner Carousel
- Horizontal carousel of video clip cards within the selected scene tab.
- Each item displays:
  - **Video thumbnail** — the start frame image (from the video job's `startFrameUrl`), fixed size matching Stills tab dimensions
  - **Play button overlay** — centered on the thumbnail, semi-transparent circle with play icon. Click triggers playback.
  - **Shot ID label** below the thumbnail — e.g., `"2A"`, `"4C"` — `text-xs font-mono`
  - Optional: **duration badge** — e.g., `"8s"` — small badge on the thumbnail corner
- **Click to play**: Tapping the play button or thumbnail starts video playback in-place (the thumbnail area expands or transforms into a video player). The video does **NOT** auto-play when scrolled to.
- Playback controls: play/pause, mute/unmute (inherited from `<video>` native controls or minimal custom controls).
- When a clip finishes playing, it returns to the thumbnail state (does not auto-advance to next clip).

#### Empty State
When no scenes have completed video clips:
```
No clips available yet. Videos are generated in Stage 12.
```

#### Data Source
- **Video Jobs**: Fetched via `checkoutService.getVideoJobs(projectId, sceneId)` per scene — returns `VideoJobsResponse` with `jobs: VideoGenerationJob[]`. Filter to `status === 'completed'` and `videoUrl !== null`.
- **Strategy**: Same as Stills — parallel fetch per scene, or new batch endpoint.

> **Implementation Note — New Batch Endpoint (Recommended)**:
> ```
> GET /api/projects/:projectId/batch-completed-clips
> ```
> Returns: `Record<sceneId, { sceneNumber: number, clips: { shotId: string, shotLabel: string, videoUrl: string, startFrameUrl: string, duration: number }[] }>`
>
> Use `checkoutService.getBatchRenderStatus()` as a pre-filter: only fetch full video data for scenes where `renderStatus` includes completed jobs.

---

### A.6 — Shared Carousel Behavior (Stills & Clips)

#### Scene Tab Interaction
- Clicking a scene tab scrolls/switches the inner carousel to that scene's content instantly (no animation needed).
- Active scene tab is highlighted (same `bg-primary/15 text-primary` pattern used by main tabs).
- Scene tabs should be horizontally scrollable if there are many scenes (overflow with scroll, no wrapping).

#### Carousel Mechanics
- Use the existing shadcn `Carousel` / `CarouselContent` / `CarouselItem` components (already imported in `ContentAccessCarousel.tsx`).
- Arrow navigation buttons (left/right) for the inner carousel.
- Carousel should support keyboard navigation (left/right arrow keys when focused).

#### Performance Considerations
- **Lazy loading**: Only fetch frame/clip data for scenes when the Stills or Clips tab is first activated (not on mount). Use `enabled` flag in React Query.
- **Image lazy loading**: Use `loading="lazy"` on `<img>` elements for thumbnails not in viewport.
- **Cache**: React Query cache with `staleTime: 120_000` (2 minutes) — frame/clip data doesn't change frequently.
- **Debounce scene tab changes**: If user rapidly clicks between scene tabs, debounce the inner carousel transition.

---

### A.7 — Component Architecture

#### Modified Files
- **`src/components/pipeline/ContentAccessCarousel.tsx`** — Primary file. Major refactor:
  - Remove `RearviewContent` sub-component entirely
  - Remove `'rearview'` from `TabId` union
  - Add `'stills'` and `'clips'` to `TabId` union
  - Add `StillsContent` sub-component (new)
  - Add `ClipsContent` sub-component (new)
  - Add `SceneTabBar` shared sub-component (scene-level inner tabs used by both Stills and Clips)
  - Update `TabBar` to include "Content Access" label and collapse-hide behavior
  - Update `availableTabs` logic (Stills/Clips always present at stage 6+, no sceneNumber > 1 guard)

#### New Sub-Components (within the same file or extracted)
```
StillsContent
├── SceneTabBar (scene pills: Scene 1, Scene 2, ...)
└── StillsCarousel (horizontal thumbnails for selected scene)
    └── StillCard (thumbnail + shot label + click-to-enlarge)

ClipsContent
├── SceneTabBar (reused)
└── ClipsCarousel (horizontal video cards for selected scene)
    └── ClipCard (thumbnail + play overlay + shot label)
        └── InlinePlayer (expanded video player when playing)
```

#### New Hooks / Queries
```typescript
// Fetch start frames for all scenes (excluding current)
useQuery({
  queryKey: ['all-start-frames', projectId],
  queryFn: () => fetchAllStartFrames(projectId, excludeSceneId),
  enabled: activeTab === 'stills', // lazy
  staleTime: 120_000,
});

// Fetch completed clips for all scenes (excluding current)
useQuery({
  queryKey: ['all-completed-clips', projectId],
  queryFn: () => fetchAllCompletedClips(projectId, excludeSceneId),
  enabled: activeTab === 'clips', // lazy
  staleTime: 120_000,
});
```

#### Data Aggregation Functions (frontend)
```typescript
// For MVP: parallel per-scene fetching
async function fetchAllStartFrames(projectId: string, excludeSceneId: string) {
  const scenes = await sceneService.fetchScenes(projectId);
  const otherScenes = scenes.filter(s => s.id !== excludeSceneId);

  const results = await Promise.all(
    otherScenes.map(async (scene) => {
      const framesData = await frameService.fetchFrames(projectId, scene.id);
      return {
        sceneId: scene.id,
        sceneNumber: scene.sceneNumber,
        stills: framesData.shots
          .filter(shot => shot.startFrame?.imageUrl)
          .map(shot => ({
            shotId: shot.shotId,
            imageUrl: shot.startFrame!.imageUrl!,
            frameStatus: shot.startFrame!.status,
          })),
      };
    })
  );

  // Only return scenes that have at least one still
  return results.filter(r => r.stills.length > 0);
}
```

---

### A.8 — Type Changes

```typescript
// In ContentAccessCarousel.tsx — update TabId
type TabId = 'script' | 'stills' | 'clips' | 'shots';  // removed 'rearview'

// New interfaces for aggregated data
interface SceneStillsData {
  sceneId: string;
  sceneNumber: number;
  stills: {
    shotId: string;       // e.g., "1A", "2B-M"
    imageUrl: string;
    frameStatus: FrameStatus;
  }[];
}

interface SceneClipsData {
  sceneId: string;
  sceneNumber: number;
  clips: {
    shotId: string;
    videoUrl: string;
    startFrameUrl: string;  // used as thumbnail
    duration: number;
  }[];
}
```

---

### A.9 — Edge Cases

| Scenario | Behavior |
|----------|----------|
| User is on Scene 1, no other scenes have data | Both Stills and Clips tabs show empty state |
| User is on Scene 3, only Scene 5 has stills | Stills tab shows Scene 5 tab only. Default selection: Scene 5 (nearest available since no prior scenes have data) |
| Scene has some shots with frames and some without | Show only shots that have generated start frames. Skip shots with `startFrame: null` |
| Video job exists but status is `'failed'` or `'processing'` | Exclude from Clips tab (only `'completed'` with non-null `videoUrl`) |
| User navigates to a different scene | Carousel re-evaluates: new scene is excluded, prior scene default may change. Preserve selected scene tab if it's still valid. |
| Very many scenes (10+) | Scene tab pills become horizontally scrollable with overflow |
| Panel is resized very small | Thumbnails should have a minimum size; if panel is too short, show 1 row with horizontal scroll |

---