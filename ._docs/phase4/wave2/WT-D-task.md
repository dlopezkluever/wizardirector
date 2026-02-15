# WT-D: End Frame Generation + Fix Asset Inheritance in Frames (Stage 10)

**Wave**: 2 (parallel with WT-E and WT-F — after Wave 1 merges)
**Tasks**: 4D.1 + 4D.2
**Scope**: Generate end frames alongside start frames, fix asset inheritance so master assets actually influence frame generation

> **Note**: 4A.1 (Content Access Carousel) has already been built and merged. `RearviewMirror.tsx` has been replaced by `ContentAccessCarousel.tsx` in Stage10FrameGeneration.tsx. Preserve the ContentAccessCarousel when modifying Stage 10.

---

## Task 4D.1 — End Frame Generation

**Ticket**: 10.2
**Priority**: HIGH

### Problem. 
Currently only generating the starting frame. But we need the option, with a toggle for a shot to have Both starting frame AND end frame as the video production API has both options, like Veo3 supports `startFrameUrl` (→ `image`) only and also the option for `startFrameUrl` (→ `image`)  and `endFrameUrl` (→ `lastFrame`) parameters.

I think I would actually do this 

1. We need the ability to choose, at some point, what model we will be using (right now we only have veo3 integrated but we should be moving to SORA & SeeDance (may have to make users use VPN cuz it be banned in amerikka))

1b. We need the ability to choose between modes, spcifically for image to video. I still maintain Frame to video is the peak control mode. But I can actually see how it could be problemeatic for complex shots, think montages, or highly stylistic/artistic shot descriptions. Maybe then , you differ the frame, and only rather plug in the key assets, and describe the complex shot in detail

1c. But immediatly, we need the ability, if within VEO3, to be able to toggle, for each shot in stage 9, whether we are doing staqting and END frame or just starting Frame

For end frames, the prompt to make the end frame needs to be like, the starting frame prompt, but wiht the idea that YOU ARE MAKING AN IMAGE OF THIS SCENE WHERE 8 seconds have passed, and this action occured.

2. The reqal KEY however  is making sure the actual assets are bieng used to make the frames. Like what is the current way frames are bing generated?? are they linking the relevant scene instance images into their prompts? Becuase it would appear not TO ME
 Consider the following example:
 Image 1 & 2 have the character assets for a scene, yet Image 3 is what was gnerated. Its a completly different visual style (cinematic drawing, not old style disney animation)


### Ticket 10.2 (from Tickets.md)
> Currently only generating the starting frame. Both starting frame AND end frame are sometimes required for the video production API.

### Core Features
- [ ] Generate end frame for each shot alongside start frame (using this type of prompting system maybe {its just an ideaa that I think could work}:  But do reserach to make to see how to best prompt)
- [ ] Pass both frames to video generation API (like if the user elects to do both starting and end frame)
- [ ] UI for reviewing/editing end frames (approve/reject/regenerate like start frames)
- [ ] End frame considers shot action/movement for accurate ending state
  - e.g., if shot starts with character standing and action is "sits down", end frame should show character seated

### Implementation Notes
- The `ShotWithFrames` type in `scene.ts` already has `startFrame` and `endFrame` fields
- The `Frame` type already supports this — likely need to extend frame generation to produce both
- The `requiresEndFrame` field on `PromptSet` already exists (determined by `determineRequiresEndFrame()` heuristic in promptGenerationService)
- Backend `frameGenerationService.ts` needs to generate end frames when `requiresEndFrame` is true
- Frontend `Stage10FrameGeneration.tsx` needs UI for end frame display/approval
- `FramePanel.tsx` may need to show start + end frame pair per shot
- Video generation already supports `startFrameUrl` and `endFrameUrl` in the provider interface

### Dependencies
- Phase 3 asset system — **Done enough** ✅

---

## Task 4D.2 — Fix Asset Inheritance in Frame Generation

**Tickets**: 10.1, DC-3
**Priority**: HIGH

### Problem
Looking at generations in Stage 10, there's no influence from any master assets — just generic slop. Something is wrong with the asset inheritance into frame generation. The full inheritance chain (Stage 5 → 8 → 9 → 10) must be verified and repaired.

### Ticket 10.1 (from Tickets.md)
> Looking at generations in Stage 10, there's no influence from any master assets — just generic slop. Something is wrong with the asset inheritance into frame generation. Needs testing.

### Ticket DC-3 (from Tickets.md)
> Final generations (Stage 10) do not reflect the influence of master assets. The context/inheritance chain from Stage 5 → Stage 8 → Stage 9 → Stage 10 is broken somewhere. Visual style capsule seems to override everything.

### MVP-tasklist-v1.1 Reference (Feature 3.3 — Asset Inheritance Chain)
> Strengthen inherited_from_instance_id chain tracking. Build asset timeline view showing state evolution. Add inheritance validation and repair tools.

### Core Features
- [ ] **Verify asset data is reaching Stage 10** frame generation endpoint
  - Debug: log what asset data the frame generation service actually receives
  - Check: are scene instance images (from Stage 8) included?
  - Check: are master asset descriptions being passed?
- [ ] **Ensure scene instance images are included in generation context**
  - Scene asset instances should carry `effective_description` and `selected_image_url`
  - These must be passed to the image generation API as reference images
- [ ] **Pass asset reference images to image generation API**
  - Gemini/image gen API should receive reference images alongside the text prompt
  - Master asset image and/or scene instance image should be inputs
- [ ] **Validate output against master asset references**
  - Generated frames should visually reflect the master assets
  - Style capsule should complement, not override, asset references
- [ ] **Test across different asset types and scenes**
  - Characters: do they look like their master reference?
  - Locations: does the scene setting match?
  - Props: are key props visible?

### Debugging Approach
1. Trace the full data flow: What does `frameGenerationService` receive?
2. Check `contextManager.ts` — is it assembling frame generation context correctly?
3. Check the image generation API call — are reference images actually attached?
4. Check if `assetInheritanceService.ts` chain is intact from Stage 5 → 8
5. Verify the frame generation prompt includes asset descriptions

### Dependencies
- 3C.3 (Asset Inheritance Chain Enhancement) — **DONE** ✅
- 3C.4 (Context Manager Enhancement) — **DONE** ✅

---

## Files At Play

### Frontend Components
- `src/components/pipeline/Stage10FrameGeneration.tsx` — Main Stage 10 component (needs end frame UI + may need updates for inheritance debugging). Note: now has ContentAccessCarousel integrated from 4A.1 (replaces old RearviewMirror) — preserve it.
- `src/components/pipeline/FramePanel.tsx` — Individual frame editor (needs to show start + end frame pairs)
- `src/components/pipeline/FrameGrid.tsx` — Grid view for quick mode (needs end frame columns)

### Frontend Services
- `src/lib/services/frameService.ts` — Frame API client (fetch, generate, approve, reject, regenerate, inpaint, polling)

### Frontend Types
- `src/types/scene.ts` — Frame types (lines 204-259):
  - `FrameStatus` = 'pending' | 'generating' | 'generated' | 'approved' | 'rejected'
  - `Frame` interface with imageUrl, status, costs
  - `ShotWithFrames` — pairs shots with startFrame/endFrame
  - `FrameCostSummary`, `FrameJobStatus`

### Backend — Frame Generation
- `backend/src/services/frameGenerationService.ts` — **PRIMARY BACKEND FILE**: Core frame generation logic, image generation integration, cost tracking
- `backend/src/routes/frames.ts` — Frame endpoints:
  - `GET .../frames` — fetch frames
  - `POST .../generate-frames` — start generation (needs end frame support)
  - `PUT .../frames/:frameId/approve` — approve
  - `POST .../frames/:frameId/regenerate` — regenerate
  - `POST .../frames/:frameId/inpaint` — inpaint

### Backend — Asset Inheritance (4D.2 debugging)
- `backend/src/services/assetInheritanceService.ts` — Inheritance chain logic (`getPriorScene()`, `getInheritableAssetStates()`)
- `backend/src/services/contextManager.ts` — Context assembly for frame generation (verify asset data is included)
- `backend/src/services/assetDescriptionMerger.ts` — Description merging (verify effective descriptions are correct)
- `backend/src/services/assetImageLocalizer.ts` — Image localization for generation

### Backend — Video Provider (reference — understand how end frames are consumed)
- `backend/src/services/video-generation/VideoProviderInterface.ts` — `VideoGenerationParams` has `startFrameUrl` and `endFrameUrl`
- `backend/src/services/video-generation/Veo3Provider.ts` — Maps `startFrameUrl` → `image`, `endFrameUrl` → `lastFrame`
