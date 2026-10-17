# WT-G: Stage 9 UI Enhancements — Frame Reactivity + Reference Image Upload

**Wave**: 3 (after Wave 2 merges)
**Tasks**: 4C.3 + 4C.4 (+ 4C.2 if prerequisite 3B.9 is completed)
**Scope**: Video prompt auto-updates when frames change, reference image uploads in Stage 9
**Depends on**: WT-B (4C.1), WT-E (4C.5), and WT-D (4D.1/4D.2) should all be merged first

> **Note**: 4A.1 (Content Access Carousel) has already been built and merged. `RearviewMirror.tsx` has been replaced by `ContentAccessCarousel.tsx` in both Stage9 and Stage10. Preserve the ContentAccessCarousel when modifying these files.

---

## Task 4C.3 — Video Prompt Reacts to Frame Changes

**Ticket**: 9.3
**Priority**: MEDIUM

### Problem
If the start frame for a shot changes (regenerated, edited, or swapped in Stage 10), the video prompt should react/update to reflect the new visual starting point rather than describing something that no longer matches the frame.

### Ticket 9.3 (from Tickets.md)
> Consider having the video prompt update/react when the frame shot changes.

### Core Features
- [ ] **Detect frame changes in Stage 10**
  - When a frame is regenerated, approved, or swapped, flag the corresponding video prompt as potentially stale
  - Track frame generation timestamp vs prompt generation timestamp
- [ ] **Auto-flag video prompts as potentially stale**
  - Visual indicator in Stage 9 UI: "Frame has changed since this prompt was generated"
  - Stale prompts highlighted with warning badge
- [ ] **Option to auto-regenerate video prompt based on new frame**
  - "Update prompt for new frame" button per shot
  - Bulk "Update all stale prompts" action
  - Regeneration considers the new frame's visual content
- [ ] **User choice: accept updated prompt or keep original**
  - Show diff between old and new prompt
  - Accept / reject / edit options

### Implementation Notes
- Need a way to compare `prompts_generated_at` timestamp with frame's `updated_at` timestamp
- The staleness check can happen in the fetch endpoint (`GET .../prompts`) — return a `isStale` flag per prompt
- The auto-regenerate should re-run prompt generation with the new frame context
- This crosses Stage 9 and Stage 10 — need to understand the frame data flow

### Dependencies
- Phase 3 asset system — partially done

---

## Task 4C.4 — Additional Reference Image Upload

**Ticket**: 9.4
**Priority**: LOW

### Problem
True animators/filmmakers may have storyboards they want to reference. Allowing photo upload as part of the prompt editing process enables professionals to guide generation more precisely.

### Ticket 9.4 (from Tickets.md)
> True animators/filmmakers may have storyboards they want to reference. Allow photo upload as part of the process.

### Core Features
- [ ] **Image upload component in Stage 9 prompt editor**
  - Per-shot upload area (drag & drop or file picker)
  - Support standard image formats (PNG, JPG, WebP)
  - Image preview with remove option
- [ ] **Reference images attached to specific shots**
  - Stored in Supabase Storage (e.g., `reference-images` bucket)
  - Linked to shot via database (new column or junction table)
- [ ] **Images available to frame/video generation as additional context**
  - Reference images passed alongside prompts to Stage 10 frame generation
  - Image generation API receives reference images as inputs
- [ ] **Support for storyboard-style reference sheets**
  - Allow multiple reference images per shot
  - Label/caption per reference image

### Implementation Notes
- New DB column on `shots` table: `reference_image_urls` (JSONB array) or a new `shot_reference_images` table
- New backend upload endpoint: `POST /api/projects/:id/scenes/:sceneId/shots/:shotId/reference-image`
- Frontend: add upload area to each shot card in Stage9PromptSegmentation.tsx
- Supabase Storage bucket for reference images

### Dependencies
None.

---

## Conditional Task: 4C.2 — Visual Assets Shown Alongside Prompts

**BLOCKED on 3B.9 (Shot Presence Flags)** — Include in this worktree ONLY if 3B.9 has been completed before Wave 3 starts.

**Ticket**: 9.2
**Priority**: MEDIUM

### Problem
When editing prompts in Stage 9, users can't see the relevant visual assets. They're editing blind — they need to see character images, location images, and scene instance images alongside the text prompt.

### Ticket 9.2 (from Tickets.md)
> The prompt editing UI needs to show the relevant visual assets so users understand the full equation when editing.

### Core Features (if unblocked)
- [ ] Display scene-relevant assets beside each prompt
- [ ] Show master reference and scene instance images
- [ ] Assets organized by shot presence (requires 3B.9 shot presence flags)
- [ ] Collapsible asset panel to save space

### Simplified Version (if 3B.9 NOT done)
- [ ] Show ALL scene assets in a collapsible side panel (not per-shot filtered)
- [ ] Group by asset type (characters, locations, props)
- [ ] Show master + scene instance image for each

### Dependencies
- 3B.9 (Shot Presence Flags) — **NOT DONE** (required for per-shot asset filtering)

---

## Files At Play

### Frontend Components
- `src/components/pipeline/Stage9PromptSegmentation.tsx` — **PRIMARY FILE**: All three tasks modify this component (now has ContentAccessCarousel from 4A.1 — preserve it)
  - 4C.3: Add staleness indicators, "update prompt" buttons
  - 4C.4: Add reference image upload areas per shot
  - 4C.2: Add asset panel alongside prompts
- `src/components/pipeline/Stage10FrameGeneration.tsx` — 4C.3: May need to emit events when frames change (or backend handles via timestamps). Now has ContentAccessCarousel from 4A.1 — preserve it.

### Frontend Services
- `src/lib/services/promptService.ts` — May need `updateStalePrompts()` method (4C.3)
- `src/lib/services/frameService.ts` — Read frame timestamps for staleness check (4C.3)
- `src/lib/services/sceneAssetService.ts` — Fetch scene assets for display (4C.2)

### Backend
- `backend/src/routes/projects.ts` — Stage 9 endpoints:
  - GET prompts endpoint: add `isStale` flag based on frame timestamps (4C.3)
  - May need new endpoint for reference image upload (4C.4)
- `backend/src/services/promptGenerationService.ts` — Regeneration with new frame context (4C.3)

### Types
- `src/types/scene.ts` — `PromptSet`: may need `isStale?: boolean` field, `referenceImageUrls?: string[]` field

### Storage
- Supabase Storage: new `reference-images` bucket for 4C.4 uploads
