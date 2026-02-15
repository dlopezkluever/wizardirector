# WT-NEW: Content Access Carousel v2 (Stills + Clips Tabs) & Stage 5 Asset Merge/Split

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

## Feature B: Stage 5 Asset Merge & Split

### B.1 — Overview & Motivation

During Stage 5 (Asset Extraction), the AI extracts characters, locations, and props from the script. Two common problems arise:

1. **Duplicate detection failure** — The same entity appears under different names across scenes (e.g., `"Dr. James Jones"` in Scene 1, `"James"` in Scenes 2-3, `"Dr. Jones"` in Scene 4). The extraction creates 3 separate master assets, but they're all the same character.

2. **Significant character transformation** — A character changes dramatically mid-story (e.g., James dons a grand disguise in Scenes 4-5). The user wants two separate assets: `"James"` (Scenes 1, 2, 3, 6, 7) and `"James - Disguise"` (Scenes 4, 5), each with their own description and visual reference.

**Merge** solves problem #1. **Split** solves problem #2.

---

### B.2 — Merge Feature

#### User Flow
1. User is in Stage 5 Asset Library view
2. User selects 2 or more assets (checkboxes or multi-select)
3. A **"Merge"** button appears in the toolbar/action bar (only visible when 2+ assets selected)
4. User clicks "Merge" → **Merge Dialog** opens:
   - Shows the selected assets with their names, types, scene numbers, and thumbnails (if available)
   - User picks which asset is the **"survivor"** (primary) — radio button selection. The survivor's name, description, and image become the canonical version.
   - The other asset(s) are labeled as **"absorbed"**
   - A summary shows: *"3 scene instances will be re-pointed to [Survivor Name]"*
   - Optional: User can edit the survivor's name before confirming (e.g., standardize to `"Dr. James Jones"`)
   - **"Confirm Merge"** button

#### Merge Rules
- All selected assets must be of the **same `asset_type`** (cannot merge a character with a location). If mixed types are selected, the Merge button is disabled with a tooltip explaining why.
- The survivor asset retains its `id`, `description`, `image_key_url`, `image_prompt`, and all generation attempts.
- The absorbed assets' `scene_numbers` arrays are unioned into the survivor's `scene_numbers`.

#### Backend Behavior

**New Endpoint:**
```
POST /api/projects/:projectId/assets/merge
Body: {
  survivorAssetId: string,
  absorbedAssetIds: string[],
  updatedName?: string  // optional name override for survivor
}
```

**Backend Logic (transactional):**
1. Validate all assets exist, belong to this project, and share the same `asset_type`
2. **Re-point scene instances**: `UPDATE scene_asset_instances SET project_asset_id = :survivorId WHERE project_asset_id IN (:absorbedIds)`
3. **Merge scene_numbers**: Union all `scene_numbers` arrays from absorbed assets into the survivor's `scene_numbers`
4. **Delete absorbed master assets**: `DELETE FROM project_assets WHERE id IN (:absorbedIds)`
5. **Delete absorbed generation attempts**: `DELETE FROM project_asset_generation_attempts WHERE project_asset_id IN (:absorbedIds)` (cascade should handle this if FK is set up, but verify)
6. **Update survivor name** (if `updatedName` provided): `UPDATE project_assets SET name = :updatedName WHERE id = :survivorId`
7. Return the updated survivor asset + count of re-pointed instances

**Response:**
```json
{
  "success": true,
  "survivor": { /* updated ProjectAsset */ },
  "instancesRepointed": 5,
  "assetsAbsorbed": 2
}
```

#### Data Model Changes
- No new columns needed. Merge operates on existing `project_assets` and `scene_asset_instances` tables.
- Consider adding an audit log entry (optional): `{ action: 'merge', survivorId, absorbedIds, timestamp }` — could be stored in a `project_asset_audit_log` table or simply logged server-side.

---

### B.3 — Split Feature

#### User Flow
1. User is in Stage 5 Asset Library view
2. User selects exactly **1 asset**
3. A **"Split Variant"** button appears in the toolbar (only visible when exactly 1 asset selected, and that asset has `scene_numbers.length > 1`)
4. User clicks "Split Variant" → **Split Wizard** opens:

**Step 1 — Name the Variant:**
- Shows the original asset's name, description, and thumbnail
- Text input: *"Variant name"* — pre-filled with `"[Original Name] - Variant"` (user edits, e.g., `"James - Disguise"`)
- Optional: textarea to provide a variant description (pre-filled with original description, user modifies)

**Step 2 — Assign Scenes:**
- Shows all scenes where this asset appears (from `scene_numbers[]`)
- Each scene is a selectable chip/checkbox: `Scene 1`, `Scene 2`, `Scene 3`, etc.
- User checks off which scenes should use the **new variant**. Unchecked scenes remain with the original asset.
- Validation: At least 1 scene must remain with the original AND at least 1 scene must be assigned to the variant. Cannot leave either side empty.
- Visual: Two columns — **"Original (James)"** on the left showing remaining scenes, **"Variant (James - Disguise)"** on the right showing selected scenes. Scenes move between columns as checkboxes toggle.

**Step 3 — Confirm:**
- Summary: *"Original 'James' will keep Scenes 1, 2, 3, 6, 7. New variant 'James - Disguise' will be created for Scenes 4, 5."*
- *"X scene instances will be re-pointed to the new variant."*
- **"Confirm Split"** button

#### Backend Behavior

**New Endpoint:**
```
POST /api/projects/:projectId/assets/:assetId/split
Body: {
  variantName: string,
  variantDescription?: string,
  scenesForVariant: number[]  // scene numbers to assign to the new variant
}
```

**Backend Logic (transactional):**
1. Validate the asset exists and `scenesForVariant` is a subset of the asset's `scene_numbers`
2. Validate at least 1 scene remains with the original
3. **Create new master asset**: Insert into `project_assets` with:
   - `name`: variantName
   - `asset_type`: same as original
   - `description`: variantDescription ?? original's description
   - `image_prompt`: copied from original (user can regenerate later)
   - `image_key_url`: null (variant starts without its own image — forces user to generate one)
   - `scene_numbers`: scenesForVariant
   - `source`: `'manual'`
   - `locked`: false
4. **Update original's scene_numbers**: Remove the split-off scenes from the original's `scene_numbers` array
5. **Re-point scene instances**: For each scene in `scenesForVariant`:
   ```sql
   UPDATE scene_asset_instances
   SET project_asset_id = :newVariantId
   WHERE project_asset_id = :originalId
     AND scene_id IN (SELECT id FROM scenes WHERE scene_number = ANY(:scenesForVariant) AND project_id = :projectId)
   ```
6. Re-pointed instances keep their existing `description_override`, `image_key_url`, `status_tags`, etc. — only the `project_asset_id` changes.
7. Return both the updated original and the new variant asset + count of re-pointed instances

**Response:**
```json
{
  "success": true,
  "original": { /* updated ProjectAsset with reduced scene_numbers */ },
  "variant": { /* new ProjectAsset */ },
  "instancesRepointed": 3
}
```

#### Data Model Changes
- No new tables needed.
- The `project_assets.scene_numbers` field is already an array — split just partitions it.
- Consider adding `split_from_asset_id` column to `project_assets` (optional, for traceability): `ALTER TABLE project_assets ADD COLUMN split_from_asset_id UUID REFERENCES project_assets(id) ON DELETE SET NULL;`

---

### B.4 — UI Location & Integration

Both Merge and Split live in the **Stage 5 Asset Library** view.

#### Where the buttons appear
- The asset library already supports selection (or should). Add a **selection mode** if not present:
  - Each asset card gets a checkbox in multi-select mode
  - A floating action bar appears at the bottom (or top) of the asset list when 1+ assets are selected
  - Action bar shows: `[X selected]  [Merge] [Split Variant] [Delete]`
  - **Merge** enabled when 2+ assets of the same type selected
  - **Split Variant** enabled when exactly 1 asset selected with 2+ scene_numbers
  - **Delete** existing behavior

#### Component Architecture
```
Stage 5 Asset Library
├── AssetSelectionToolbar (floating action bar)
│   ├── MergeButton (disabled unless 2+ same-type selected)
│   └── SplitButton (disabled unless 1 selected with multi-scene)
├── MergeDialog (modal)
│   ├── AssetPreviewCard (for each selected asset)
│   ├── SurvivorSelector (radio buttons)
│   └── ConfirmMergeButton
└── SplitWizard (modal, multi-step)
    ├── Step1: VariantNameInput + DescriptionInput
    ├── Step2: SceneAssignment (two-column with checkboxes)
    └── Step3: ConfirmSummary
```

---

### B.5 — Merge/Split Edge Cases

| Scenario | Behavior |
|----------|----------|
| Merge assets with conflicting `scene_numbers` (both appear in Scene 3) | Allowed — after merge, survivor has Scene 3 once. If duplicate scene instances exist (both absorbed and survivor have instance for Scene 3), keep the survivor's instance, delete the absorbed one. |
| Split an asset that has no scene instances yet | Allowed — creates the new asset with the scene_numbers, no instances to re-point. |
| Asset is `locked: true` | Disable merge/split for locked assets. Show tooltip: *"Unlock this asset before merging/splitting."* |
| Absorbed asset has generation attempts (images) | Images are deleted with the absorbed asset. The survivor retains its own images. User should be warned in the confirmation dialog. |
| Split variant inherits the original's image | No — variant starts with `image_key_url: null`. Forces user to generate a distinct visual for the variant. Dialog should mention this. |
| User tries to merge assets from different asset types | Merge button disabled. Tooltip: *"All selected assets must be the same type to merge."* |

---

## Files At Play

### Feature A: Content Access Carousel v2

#### Frontend Components (Modified)
- **`src/components/pipeline/ContentAccessCarousel.tsx`** — **PRIMARY FILE**: Major refactor. Remove Rearview, add Stills/Clips tabs, new sub-components, UI polish (collapsed state, "Content Access" label).

#### Frontend Services (Read / Possibly Extended)
- `src/lib/services/frameService.ts` — `fetchFrames()` used to get start frames per scene. May add a helper for batch fetching.
- `src/lib/services/checkoutService.ts` — `getVideoJobs()` used to get clips per scene. `getBatchRenderStatus()` useful as pre-filter.
- `src/lib/services/sceneService.ts` — `fetchScenes()` for scene list (already fetched by carousel).

#### Frontend Types
- `src/types/scene.ts` — Import `Frame`, `ShotWithFrames`, `VideoGenerationJob`, `FrameStatus`. Add `SceneStillsData` and `SceneClipsData` interfaces (could be in carousel file or types file).

#### Backend (Optional — batch endpoints)
- `backend/src/routes/frames.ts` — Consider adding `GET /api/projects/:projectId/batch-start-frames`
- `backend/src/routes/checkout.ts` — Consider adding `GET /api/projects/:projectId/batch-completed-clips`

### Feature B: Asset Merge/Split

#### Frontend Components (New/Modified)
- `src/components/pipeline/Stage5AssetExtraction.tsx` (or equivalent Stage 5 asset library component) — Add selection mode, action toolbar
- New: `MergeDialog.tsx` (or inline in Stage 5 component)
- New: `SplitWizard.tsx` (or inline in Stage 5 component)

#### Frontend Services (Extended)
- `src/lib/services/projectAssetService.ts` — Add `mergeAssets()` and `splitAsset()` methods

#### Backend Routes (New)
- `backend/src/routes/projectAssets.ts` (or `projects.ts`) — Add:
  - `POST /api/projects/:projectId/assets/merge`
  - `POST /api/projects/:projectId/assets/:assetId/split`

#### Backend Services (New/Extended)
- May need a new `assetMergeService.ts` or add methods to existing asset service

#### Types (Extended)
- `src/types/asset.ts` — Add request/response interfaces for merge and split operations

---

## Implementation Order

1. **A.3** — Panel UI polish (Content Access label, collapsed state) — quick, visual, no data changes
2. **A.4** — Stills tab (remove Rearview, add Stills with scene tabs + carousel) — core feature
3. **A.5** — Clips tab (add Clips with scene tabs + video playback) — builds on Stills pattern
4. **B.2** — Merge feature (backend endpoint + frontend dialog)
5. **B.3** — Split feature (backend endpoint + frontend wizard)

Features A and B are **independent** and can be worked in parallel by different agents/worktrees.

---

## Verification

### Feature A
1. `npm run lint` — no lint errors
2. `npm run build:dev` — TypeScript compiles
3. Manual test: Navigate to Stage 8+ for a scene, verify:
   - "Content Access" label visible when collapsed (tabs hidden)
   - Stills tab shows scene tabs for other scenes with generated start frames
   - Clicking a scene tab shows that scene's shot start frames in a horizontal carousel
   - Thumbnails display correctly with shot ID labels
   - Click thumbnail → enlarges (lightbox)
   - Clips tab shows scene tabs for scenes with completed video jobs
   - Click play on a clip → video plays inline
   - Script and Shots tabs still work as before
   - Empty states display when no data exists
4. Verify no Rearview tab references remain

### Feature B
1. `npm run lint` + `npm run build:dev`
2. Backend tests for merge/split endpoints (new test file)
3. Manual test:
   - Select 2 same-type assets → Merge button active → merge → verify instances re-pointed
   - Select 1 asset with multiple scenes → Split → assign scenes → verify new asset created and instances re-pointed
   - Verify locked assets cannot be merged/split
   - Verify mixed-type selection disables Merge
