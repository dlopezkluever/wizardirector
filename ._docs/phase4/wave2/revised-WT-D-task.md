# WT-D Revised: Asset Reference Images in Frame Gen + End Frame Workflow

**Tasks**: 4D.2 (Asset Inheritance) + 4D.1 (End Frames)
**Priority**: HIGH
**Stage**: 10 (Frame Generation) + touches Stage 9 (Prompt Segmentation)

> **Preserve** the `ContentAccessCarousel` in Stage 10 — do not remove or break it.

---

## Table of Contents

1. [Task 4D.2 — Fix Asset Inheritance in Frame Generation](#task-4d2--fix-asset-inheritance-in-frame-generation)
2. [Task 4D.1 — End Frame Generation Workflow](#task-4d1--end-frame-generation-workflow)
3. [Database Migrations](#database-migrations)
4. [Implementation Order](#implementation-order)
5. [Files to Modify (Master List)](#files-to-modify-master-list)
6. [Verification Checklist](#verification-checklist)

---

## Task 4D.2 — Fix Asset Inheritance in Frame Generation

### Problem Statement

Generated frames in Stage 10 completely ignore asset reference images. When you look at a generated frame, characters look nothing like their master/scene instance images because:

1. `frameGenerationService.generateFrames()` **never fetches `scene_asset_instances`** for the scene.
2. `startFrameGeneration()` only passes a text `prompt` + `visualStyleCapsuleId` to `createImageJob()`.
3. The `CreateImageJobRequest` only has a single `referenceImageUrl` field (used for inpainting), not a multi-image reference array.
4. In `promptGenerationService.ts`, the LLM frame prompt describes assets in text but references like "Scene reference image available" are just text hints — the actual images are never sent to the image generation API.

**Result**: The image generation API receives only text + style capsule reference images. Asset images (characters, locations, props) are completely absent from the generation context.

### Root Cause Trace

```
Stage 9 (promptGenerationService.generateFramePrompt)
  → Receives sceneAssets with image URLs
  → Builds text-only assetContext: "Hansel: ... Scene reference image available."
  → Sends text to LLM → LLM writes a text prompt
  → Text prompt saved to shots.frame_prompt (TEXT ONLY, no images)

Stage 10 (frameGenerationService.generateFrames)
  → Reads shots.frame_prompt (text only)
  → Calls startFrameGeneration(frameId, ..., prompt, visualStyleCapsuleId, ...)
  → startFrameGeneration calls imageService.createImageJob({
        prompt,                    // text only
        visualStyleCapsuleId,      // style capsule images only
        // NO referenceImageUrls!  // <-- THE BUG
    })
  → ImageGenerationService sends to NanoBanana:
        - Text prompt
        - Style capsule reference images (mood boards, not character refs)
        - ZERO asset images
```

### Solution: Numbered Image References

The fix requires a **two-phase approach**: (A) collect asset reference image URLs and assign numbered labels at prompt-generation time (Stage 9), and (B) thread those URLs through to the image generation API call at frame-generation time (Stage 10).

#### Phase A: Stage 9 — Numbered Image Reference Assignment

When generating frame prompts, the LLM needs to know which images will be available and how to reference them. We assign stable numbered labels (`Image #1`, `Image #2`, etc.) so the LLM can write prompts like "The character shown in Image #1 stands..."

**Changes to `promptGenerationService.ts`:**

1. **New function `buildNumberedImageManifest()`**:
   ```
   Input: SceneAssetInstanceData[], shotCamera: string
   Output: { manifest: string, imageOrder: { label: string, assetName: string, url: string, type: string }[] }
   ```
   - Iterate over enriched scene assets (already angle-matched via `enrichAssetsWithAngleMatch`)
   - For each asset with an available image, assign a numbered label:
     - Priority: `matched_angle_url` > `image_key_url` (scene instance) > `master_image_url` (master asset)
     - Characters get numbered first, then locations, then props
   - Build a manifest string for the LLM system prompt:
     ```
     REFERENCE IMAGES (will be sent alongside this prompt):
     Image #1: Hansel (character) — scene instance, front-facing angle
     Image #2: Dark Forest (location) — master reference
     Image #3: Magic Bread (prop) — scene instance
     ```
   - Return both the manifest text AND the ordered array of `{ label, assetName, url, type }`

2. **Update `generateFramePrompt()` system prompt**:
   - Add a new section to the system prompt after `ASSET DESCRIPTIONS`:
     ```
     REFERENCE IMAGES:
     ${manifest}

     RULES (updated):
     - When describing a character/location/prop that has a reference image, state its Image # so the generation system knows which reference to match
     - Example: "The young boy shown in Image #1 stands at frame-left..."
     ```
   - The LLM will then naturally embed references like "Image #1" in the prompt text

3. **Return `imageOrder` alongside prompt**:
   - Extend `GeneratedPromptSet` to include:
     ```typescript
     referenceImageOrder: { label: string; assetName: string; url: string; type: string }[];
     ```
   - This gets persisted to the `shots` table (see DB migration below)

4. **Update `generatePromptSet()` and `generateBulkPromptSets()`** to thread the new field through.

**Changes to `promptGenerationService.ts` route handler (in `backend/src/routes/prompts.ts` or wherever bulk prompt generation is triggered)**:
   - After generating prompts, persist `referenceImageOrder` as JSONB in the `shots` row alongside `frame_prompt` and `video_prompt`

#### Phase B: Stage 10 — Thread Reference Images to Image API

**Changes to `frameGenerationService.ts`:**

1. **New method `fetchSceneAssetImages(sceneId: string, shotId: string)`**:
   ```typescript
   async fetchSceneAssetImages(sceneId: string, shotId: string): Promise<ReferenceImage[]> {
     // 1. Read shots.reference_image_order JSONB for this shot
     // 2. For each entry, resolve the URL:
     //    - If URL is a Supabase storage path, get public URL
     //    - Validate URL is reachable (skip if 404)
     // 3. Return ordered ReferenceImage[] array
   }
   ```

2. **Update `startFrameGeneration()` signature and body**:
   - Add parameter: `referenceImageUrls?: ReferenceImage[]`
   - Pass these to `createImageJob()`:
     ```typescript
     const result = await this.imageService.createImageJob({
         projectId,
         branchId,
         sceneId,
         shotId,
         jobType,
         prompt,
         visualStyleCapsuleId,
         width: ...,
         height: ...,
         idempotencyKey: ...,
         referenceImageUrls,  // NEW: asset reference images
     });
     ```

3. **Update `generateFrames()` loop**:
   - Before the shot loop, call `fetchSceneAssetImages()` for each shot
   - Pass the result to `startFrameGeneration()`

4. **Update `regenerateFrame()`**:
   - Also fetch and pass reference images (so regeneration uses the same asset context)

**Changes to `ImageGenerationService.ts`:**

1. **Update `CreateImageJobRequest`**:
   - Replace single `referenceImageUrl?: string` with:
     ```typescript
     referenceImageUrls?: ReferenceImage[];  // Multiple asset reference images
     referenceImageUrl?: string;              // Keep for backward compat (inpainting)
     ```

2. **Update `executeJobInBackground()`**:
   - After building `visualStyleContext`, prepend `referenceImageUrls` to the reference images array:
     ```typescript
     // Asset reference images go FIRST (identity), style capsule images go AFTER (aesthetic)
     if (request.referenceImageUrls?.length) {
         if (!visualStyleContext) {
             visualStyleContext = { textContext: '', referenceImages: [] };
         }
         // Prepend asset refs before style refs
         visualStyleContext.referenceImages = [
             ...request.referenceImageUrls,
             ...visualStyleContext.referenceImages,
         ];
     }
     ```
   - The existing `referenceImageUrl` (single, for inpainting) handling remains as-is below this block

**Image Priority Order** (first = most important to the API):
1. Asset reference images from `referenceImageUrls` (characters first, then locations, then props — as ordered by `buildNumberedImageManifest`)
2. Single `referenceImageUrl` (for inpainting/master ref — existing behavior)
3. Style capsule reference images (mood boards, aesthetic references)

### Frontend: Reference Image Thumbnails in FramePanel

Show users which asset reference images were used for each frame generation, so they can understand and debug visual inconsistencies.

**Changes to `FramePanel.tsx`:**

1. Add a new optional prop:
   ```typescript
   referenceImages?: { label: string; assetName: string; url: string; type: string }[];
   ```

2. Below the frame image display (after the `aspect-video` container), render a row of small thumbnails:
   ```tsx
   {referenceImages && referenceImages.length > 0 && (
     <div className="flex gap-1 mt-2 flex-wrap">
       {referenceImages.map((ref, i) => (
         <div key={i} className="relative group">
           <img
             src={ref.url}
             alt={ref.assetName}
             className="w-8 h-8 rounded border border-border/30 object-cover"
           />
           <div className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-primary text-[8px] text-primary-foreground flex items-center justify-center font-bold">
             {i + 1}
           </div>
           {/* Tooltip on hover */}
           <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-popover text-popover-foreground text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
             #{ref.label}: {ref.assetName} ({ref.type})
           </div>
         </div>
       ))}
     </div>
   )}
   ```

3. Size: 32×32px thumbnails, numbered 1-N matching the Image # in the prompt.

**Changes to `Stage10FrameGeneration.tsx`:**

1. When rendering `<FramePanel>`, pass the reference images from the shot data:
   ```tsx
   <FramePanel
     ...
     referenceImages={selectedShot.referenceImageOrder}
   />
   ```

**Changes to `ShotWithFrames` type** (both backend `frameGenerationService.ts` and frontend `scene.ts`):

Add field:
```typescript
referenceImageOrder?: { label: string; assetName: string; url: string; type: string }[] | null;
```

**Changes to `frameGenerationService.fetchFramesForScene()`**:
- Add `reference_image_order` to the shots select query
- Map it to `referenceImageOrder` in the response

**Changes to `FetchFramesResponse`** — no changes needed; it already passes through `shots: ShotWithFrames[]`.

---

## Task 4D.1 — End Frame Generation Workflow

### Problem Statement

End frames are currently barely supported:
1. The end frame prompt is just: `shot.frame_prompt + ' [End of shot - showing action completion]'` — a generic suffix on the start frame prompt.
2. There's no way for users to toggle end frame requirement per-shot in Stage 9.
3. The `determineRequiresEndFrame()` heuristic sets the value once; users have no override.
4. Users can't review/edit the end frame prompt before generation.

### Solution Overview

1. **Stage 9**: Make the "End Frame" badge clickable to toggle `requiresEndFrame` per-shot
2. **Stage 10**: Add a two-step end frame workflow: Generate Prompt → Review/Edit → Generate Image
3. **Backend**: New LLM-powered end frame prompt generation, using start frame as primary reference

### Detailed Design

#### Part 1: End Frame Toggle in Stage 9

**Changes to `Stage9PromptSegmentation.tsx`:**

Currently (line ~468), the "End Frame" badge is a static indicator:
```tsx
{promptSet.requiresEndFrame && (
  <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400 text-xs">
    End Frame
  </Badge>
)}
```

Change to a clickable toggle badge:
```tsx
<Badge
  variant="secondary"
  className={cn(
    'text-xs cursor-pointer transition-colors',
    promptSet.requiresEndFrame
      ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
      : 'bg-muted text-muted-foreground hover:bg-muted/80'
  )}
  onClick={(e) => {
    e.stopPropagation();
    handleToggleEndFrame(promptSet.shotUuid, !promptSet.requiresEndFrame);
  }}
>
  {promptSet.requiresEndFrame ? 'End Frame' : 'No End Frame'}
</Badge>
```

**Always render the badge** (remove the `requiresEndFrame &&` guard) so users can toggle OFF→ON or ON→OFF.

**New handler `handleToggleEndFrame(shotUuid, newValue)`**:
- PATCH the shot's `requires_end_frame` column in the DB
- Update local state / invalidate query
- API: `PUT /api/projects/:projectId/scenes/:sceneId/shots/:shotId` (update the `requires_end_frame` field)

**Backend route change** (in `backend/src/routes/prompts.ts` or `shots.ts`):
- Add or ensure a `PUT /:projectId/scenes/:sceneId/shots/:shotId` endpoint that accepts `{ requiresEndFrame: boolean }` and updates `shots.requires_end_frame`.

#### Part 2: End Frame Prompt Generation (Backend)

**Changes to `promptGenerationService.ts`:**

New public method:
```typescript
async generateEndFramePrompt(
  shot: ShotData,
  startFramePrompt: string,
  sceneAssets: SceneAssetInstanceData[],
  styleCapsule?: StyleCapsule | null
): Promise<string>
```

LLM system prompt for end frame:
```
You are a visual prompt engineer for AI image generation (end frames for Veo 3.1 video pipeline).

YOUR TASK: Generate a single dense paragraph describing a FROZEN VISUAL SNAPSHOT — the ENDING frame of a shot. This shows the scene AFTER the action has occurred. The starting frame (provided below) shows the BEFORE state.

TIME CONTEXT: {shot.duration} seconds have elapsed since the starting frame.

STARTING FRAME (the "before" state):
{startFramePrompt}

ACTION THAT OCCURRED (between start and end):
{shot.action}

KEY CHANGES from start to end:
- If action involves movement (character walks, sits down, picks up object), show the END POSITION
- If action involves emotional change, show the RESULTING expression/body language
- Camera position remains the same as the starting frame
- Lighting and environment should be consistent unless the action explicitly changes them

RULES:
- Maintain EXACT same camera angle/framing as the starting frame
- Characters must look the same (clothing, features) — only pose/position/expression changes
- Output ONLY the prompt text as a single paragraph, max 1200 characters
- No JSON, no headers, no formatting

ASSET DESCRIPTIONS:
{assetContext}

{styleContext}
```

User prompt:
```
Generate an END FRAME prompt for this shot. Show the state AFTER the action completes.

Shot: {shot.shot_id} | Duration: {shot.duration}s
Action: {shot.action}
Dialogue: {shot.dialogue || 'None'}
Setting: {shot.setting}
Camera: {shot.camera}

Starting frame prompt (for reference — maintain visual consistency):
{startFramePrompt}

Write the end frame prompt as a single dense paragraph. Describe ONLY what a viewer sees at the END of this shot. Output ONLY the prompt text.
```

**Return**: Cleaned prompt text (max 1200 chars).

#### Part 3: End Frame API Endpoint

**Changes to `backend/src/routes/frames.ts`:**

New endpoint:
```
POST /api/projects/:projectId/scenes/:sceneId/shots/:shotId/generate-end-frame-prompt
```

Request body: (none — all data comes from the shot's existing data)

Logic:
1. Verify project ownership
2. Fetch shot data (including `frame_prompt` as the start frame prompt)
3. Fetch scene asset instances for the scene (with angle variants)
4. Fetch style capsule from stage state
5. Call `promptGenerationService.generateEndFramePrompt()`
6. Save result to `shots.end_frame_prompt`
7. Return `{ endFramePrompt: string }`

New endpoint:
```
PUT /api/projects/:projectId/scenes/:sceneId/shots/:shotId/end-frame-prompt
```

Request body: `{ endFramePrompt: string }`

Logic:
1. Verify project ownership
2. Update `shots.end_frame_prompt` with user-edited text
3. Return `{ success: true }`

#### Part 4: End Frame Two-Step UI in Stage 10

**Changes to `FramePanel.tsx`:**

When `frameType === 'end'`, show a two-step workflow instead of the current single-button approach:

**Step 1: Generate/Review End Frame Prompt**
- If `endFramePrompt` is null/empty: Show "Generate End Frame Prompt" button
- If `endFramePrompt` exists: Show the prompt in an editable textarea
- "Save Prompt" button to persist edits
- "Regenerate Prompt" button to re-run the LLM

**Step 2: Generate Image (from prompt)**
- Only enabled when `endFramePrompt` is non-empty
- "Generate End Frame" button → calls existing frame generation, but uses `end_frame_prompt` instead of `frame_prompt + suffix`

New props for FramePanel:
```typescript
// End frame prompt workflow (only for frameType='end')
endFramePrompt?: string | null;
onGenerateEndFramePrompt?: () => void;
onSaveEndFramePrompt?: (prompt: string) => void;
onRegenerateEndFramePrompt?: () => void;
```

**Layout change for end frame panel**:
```
┌─────────────────────────────────────────┐
│ End Frame                    [Status]   │
├─────────────────────────────────────────┤
│ STEP 1: End Frame Prompt                │
│ ┌─────────────────────────────────────┐ │
│ │ [textarea with end frame prompt]    │ │
│ │ ...editable text...                 │ │
│ └─────────────────────────────────────┘ │
│ [Regenerate Prompt] [Save Prompt]       │
├─────────────────────────────────────────┤
│ STEP 2: Generate Image                  │
│ ┌─────────────────────────────────────┐ │
│ │ [Frame image / placeholder]         │ │
│ └─────────────────────────────────────┘ │
│ [Generate End Frame] or [Approve/Reject]│
│                                         │
│ Reference thumbnails: [#1] [#2] [#3]    │
└─────────────────────────────────────────┘
```

**Changes to `Stage10FrameGeneration.tsx`:**

1. Add mutation for generating end frame prompt:
   ```typescript
   const generateEndFramePromptMutation = useMutation({
     mutationFn: (shotId: string) =>
       frameService.generateEndFramePrompt(projectId, sceneId, shotId),
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['frames', projectId, sceneId] });
     },
   });
   ```

2. Add mutation for saving end frame prompt:
   ```typescript
   const saveEndFramePromptMutation = useMutation({
     mutationFn: ({ shotId, prompt }: { shotId: string; prompt: string }) =>
       frameService.saveEndFramePrompt(projectId, sceneId, shotId, prompt),
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['frames', projectId, sceneId] });
     },
   });
   ```

3. Wire these to the `<FramePanel>` for end frame.

**Changes to frontend `frameService.ts`:**

Add two new methods:
```typescript
async generateEndFramePrompt(
  projectId: string,
  sceneId: string,
  shotId: string
): Promise<{ endFramePrompt: string }> {
  const headers = await this.getAuthHeaders();
  const response = await fetch(
    `/api/projects/${projectId}/scenes/${sceneId}/shots/${shotId}/generate-end-frame-prompt`,
    { method: 'POST', headers }
  );
  if (!response.ok) { /* error handling */ }
  return response.json();
}

async saveEndFramePrompt(
  projectId: string,
  sceneId: string,
  shotId: string,
  endFramePrompt: string
): Promise<{ success: boolean }> {
  const headers = await this.getAuthHeaders();
  const response = await fetch(
    `/api/projects/${projectId}/scenes/${sceneId}/shots/${shotId}/end-frame-prompt`,
    { method: 'PUT', headers, body: JSON.stringify({ endFramePrompt }) }
  );
  if (!response.ok) { /* error handling */ }
  return response.json();
}
```

#### Part 5: Start Frame as Reference for End Frame Generation

When generating the end frame **image**, the approved start frame image should be the **primary reference** — this ensures visual consistency between start and end of the same shot.

**Changes to `frameGenerationService.ts`:**

In the end frame generation path (both in `generateFrames()` and `regenerateFrame()`):
1. Fetch the start frame's `image_url` for the same shot
2. Prepend it as the first reference image (before asset references)

```typescript
// When generating end frame, use start frame as primary reference
if (frameType === 'end') {
    const { data: startFrame } = await supabase
        .from('frames')
        .select('image_url')
        .eq('shot_id', shotId)
        .eq('frame_type', 'start')
        .single();

    if (startFrame?.image_url) {
        referenceImages.unshift({
            url: startFrame.image_url,
            mimeType: undefined
        });
    }
}
```

**End frame prompt source** — Use `end_frame_prompt` instead of `frame_prompt + suffix`:
```typescript
// In generateFrames() and regenerateFrame():
let prompt: string;
if (frameType === 'end') {
    // Use dedicated end frame prompt (from LLM generation or user edit)
    const endPrompt = shot.end_frame_prompt;
    if (!endPrompt) {
        console.warn(`[FrameService] Shot ${shot.shot_id} has no end_frame_prompt, skipping end frame`);
        continue; // Don't generate with the old generic suffix
    }
    prompt = endPrompt;
} else {
    prompt = shot.frame_prompt;
}
```

---

## Database Migrations

### Migration: Add reference_image_order and end_frame_prompt to shots

```sql
-- Add reference image ordering for asset-aware frame generation (4D.2)
ALTER TABLE shots
ADD COLUMN reference_image_order JSONB DEFAULT NULL;

-- Add dedicated end frame prompt column (4D.1)
ALTER TABLE shots
ADD COLUMN end_frame_prompt TEXT DEFAULT NULL;

-- Comment for documentation
COMMENT ON COLUMN shots.reference_image_order IS 'Ordered array of {label, assetName, url, type} for numbered image references in frame prompts';
COMMENT ON COLUMN shots.end_frame_prompt IS 'LLM-generated or user-edited end frame prompt, separate from the start frame prompt';
```

**No migration needed for `frames` table** — it already has `frame_type` ('start'/'end') support.

---

## Implementation Order

### Phase 1: Backend — Asset Reference Threading (4D.2 core)

1. **DB migration**: Add `reference_image_order` and `end_frame_prompt` columns to `shots` table
2. **`promptGenerationService.ts`**: Add `buildNumberedImageManifest()`, update `generateFramePrompt()` system prompt, extend `GeneratedPromptSet` with `referenceImageOrder`
3. **Update prompt generation route**: Persist `referenceImageOrder` to `shots.reference_image_order` when prompts are saved
4. **`CreateImageJobRequest` in `ImageGenerationService.ts`**: Add `referenceImageUrls?: ReferenceImage[]`
5. **`ImageGenerationService.executeJobInBackground()`**: Prepend asset reference images before style capsule images
6. **`frameGenerationService.ts`**: Add `fetchSceneAssetImages()`, update `startFrameGeneration()` to accept and pass reference images, update `generateFrames()` loop, update `regenerateFrame()`

### Phase 2: Backend — End Frame Prompt Generation (4D.1 core)

7. **`promptGenerationService.ts`**: Add `generateEndFramePrompt()` method
8. **`frames.ts` routes**: Add `POST .../shots/:shotId/generate-end-frame-prompt` and `PUT .../shots/:shotId/end-frame-prompt` endpoints
9. **Add or update shots route**: `PUT /:projectId/scenes/:sceneId/shots/:shotId` for `requiresEndFrame` toggle
10. **`frameGenerationService.ts`**: Use `end_frame_prompt` instead of suffix, prepend start frame image as reference for end frame generation

### Phase 3: Frontend — Asset Thumbnails + End Frame Toggle (4D.2 + 4D.1 UI)

11. **`src/types/scene.ts`**: Add `referenceImageOrder` to `ShotWithFrames`, add `endFramePrompt` to `ShotWithFrames`
12. **`src/lib/services/frameService.ts`**: Add `generateEndFramePrompt()` and `saveEndFramePrompt()` methods
13. **`FramePanel.tsx`**: Add reference image thumbnails, add two-step end frame prompt workflow
14. **`Stage10FrameGeneration.tsx`**: Wire new mutations, pass reference images to FramePanel
15. **`Stage9PromptSegmentation.tsx`**: Convert "End Frame" badge to clickable toggle

### Phase 4: Integration Testing

16. **Test**: Generate prompts in Stage 9 → verify `reference_image_order` is persisted
17. **Test**: Generate frames in Stage 10 → verify asset images appear in API request logs
18. **Test**: Toggle end frame in Stage 9 → verify DB update
19. **Test**: Generate end frame prompt → review/edit → generate image → verify start frame is reference
20. **Test**: Regenerate a frame → verify reference images still included

---

## Files to Modify (Master List)

### Backend

| File | Changes |
|------|---------|
| `backend/src/services/promptGenerationService.ts` | Add `buildNumberedImageManifest()`, update `generateFramePrompt()` system prompt to include numbered image refs, add `generateEndFramePrompt()` method, extend `GeneratedPromptSet` type |
| `backend/src/services/frameGenerationService.ts` | Add `fetchSceneAssetImages()`, update `startFrameGeneration()` to accept `referenceImageUrls`, update `generateFrames()` to fetch and pass asset images, update `regenerateFrame()`, use `end_frame_prompt` for end frames, prepend start frame as ref for end frames, add `reference_image_order` and `end_frame_prompt` to `fetchFramesForScene()` select + mapping |
| `backend/src/services/image-generation/ImageGenerationService.ts` | Add `referenceImageUrls?: ReferenceImage[]` to `CreateImageJobRequest`, update `executeJobInBackground()` to prepend asset refs before style capsule refs |
| `backend/src/routes/frames.ts` | Add `POST .../shots/:shotId/generate-end-frame-prompt`, add `PUT .../shots/:shotId/end-frame-prompt` |
| `backend/src/routes/prompts.ts` (or wherever prompt generation is triggered) | Persist `referenceImageOrder` to `shots.reference_image_order` after prompt generation |
| Shots route (may need creation) | Add `PUT /:projectId/scenes/:sceneId/shots/:shotId` for `requiresEndFrame` toggle |

### Frontend

| File | Changes |
|------|---------|
| `src/types/scene.ts` | Add `referenceImageOrder` and `endFramePrompt` to `ShotWithFrames` type |
| `src/lib/services/frameService.ts` | Add `generateEndFramePrompt()` and `saveEndFramePrompt()` methods |
| `src/components/pipeline/FramePanel.tsx` | Add reference image thumbnail row (32px, numbered), add two-step end frame prompt UI (textarea + generate/save buttons), add new props |
| `src/components/pipeline/Stage10FrameGeneration.tsx` | Add end frame prompt mutations, pass `referenceImageOrder` and end frame props to FramePanel |
| `src/components/pipeline/Stage9PromptSegmentation.tsx` | Convert "End Frame" badge to clickable toggle (always visible), add toggle handler |
| `src/components/pipeline/FrameGrid.tsx` | Show end frame column based on updated `requiresEndFrame` (minor — already partially supported) |

### Database

| Migration | Description |
|-----------|-------------|
| New migration file | `ALTER TABLE shots ADD COLUMN reference_image_order JSONB DEFAULT NULL; ALTER TABLE shots ADD COLUMN end_frame_prompt TEXT DEFAULT NULL;` |

---

## Verification Checklist

### 4D.2 — Asset Inheritance
- [ ] `buildNumberedImageManifest()` correctly orders: characters → locations → props
- [ ] LLM frame prompts contain `Image #N` references in the output text
- [ ] `shots.reference_image_order` is populated after Stage 9 prompt generation
- [ ] `frameGenerationService.generateFrames()` reads `reference_image_order` and passes URLs
- [ ] `ImageGenerationService.executeJobInBackground()` receives asset images BEFORE style capsule images
- [ ] NanoBanana/provider logs show correct number of reference images being sent
- [ ] Generated frames visually match character/location/prop reference images
- [ ] Angle variant images are selected when camera angle matches (e.g., side profile shot → side variant)
- [ ] Regeneration also includes asset reference images
- [ ] Inpainting still works (single `referenceImageUrl` path is preserved)
- [ ] Reference image thumbnails appear in FramePanel UI, numbered 1-N
- [ ] Hovering over a thumbnail shows asset name and type

### 4D.1 — End Frame Workflow
- [ ] "End Frame" badge in Stage 9 is always visible (both ON and OFF states)
- [ ] Clicking the badge toggles `requires_end_frame` in the DB
- [ ] `generateEndFramePrompt()` LLM call receives proper context (shot action, start frame prompt, assets, style)
- [ ] End frame prompt is saved to `shots.end_frame_prompt`
- [ ] Users can edit the end frame prompt in a textarea in Stage 10
- [ ] "Save Prompt" persists edits to `shots.end_frame_prompt`
- [ ] "Regenerate Prompt" re-runs the LLM and updates the textarea
- [ ] End frame generation uses `end_frame_prompt` (NOT old `frame_prompt + suffix`)
- [ ] Start frame image is prepended as primary reference when generating end frame
- [ ] End frame generation is disabled until end frame prompt exists
- [ ] Control mode: end frame generation still requires start frame approval first
- [ ] Quick mode: end frames generated alongside start frames (using end_frame_prompt)
- [ ] Video generation correctly receives both `startFrameUrl` and `endFrameUrl` when end frame exists
- [ ] Aspect ratio from Stage 1 is used for both start and end frames

---

## Notes for Implementor

1. **Don't touch ContentAccessCarousel** — it's wired into Stage 10 and must remain.
2. **Style capsule images are NOT asset images** — style capsule reference images are mood boards/aesthetic references. Asset reference images (characters, locations, props) are separate and should come FIRST in the reference image array.
3. **The NanoBanana client already supports multiple reference images** — see `NanoBananaClient.ts` lines 34-66. The prompt building logic at line 71+ handles multi-image vs single-image differently. Asset images (identity) should go first; style images (aesthetic) after.
4. **The `referenceImageOrder` field is per-shot, not per-scene** — different shots may reference different assets (based on characters_foreground/background) and different angle variants (based on camera angle).
5. **End frame prompt generation is on-demand** — it's triggered by the user in Stage 10, NOT auto-generated in Stage 9. This is intentional: users should have their start frames approved before committing to end frame prompts.
6. **Backward compatibility** — shots that don't have `reference_image_order` or `end_frame_prompt` (old data) should still work. The system should gracefully fall back to text-only generation (current behavior) when these fields are null.
