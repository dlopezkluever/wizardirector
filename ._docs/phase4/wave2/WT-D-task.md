# WT-D: End Frame Generation + Fix Asset Inheritance in Frames (Stage 10)

**Tasks**: 4D.1 + 4D.2
**Scope**: Allow for toggling whether user wishes to use end frames alongside start frames (may have to update Video Provider API to have this toggle noted), fix asset inheritance so scene instance images AND/or master assets actually influence frame generation

> **Note**: Preserve the ContentAccessCarousel when modifying Stage 10.

---

## Task 4D.1 — End Frame Generation

**Ticket**: 10.2
**Priority**: HIGH

### Problem. 
Currently only generating the starting frame. But we need the option, with a toggle for a shot to have Both starting frame AND end frame as the video production API has both options, like Veo3 supports `startFrameUrl` (→ `image`) only and also the option for `startFrameUrl` (→ `image`)  and `endFrameUrl` (→ `lastFrame`) parameters.

User Notes: I think I would actually do this:

1c. We need the functionality to be able to toggle, for each shot in stage 9, whether we are doing starting and END frame or just starting Frame. There could be like a default just starting, but toggle for end frame image generation as well

1d. Make sure it is in the aspect ratio as designated in stage 1. 

1d. For end frames, the prompt to make the end frame needs to be like, the starting frame prompt, but wiht the idea that YOU ARE MAKING AN IMAGE OF THIS SCENE WHERE 8 seconds have passed, and this action occured.



### Possible Features
- [ ] Generate end frame for each shot alongside start frame (using this type of prompting system maybe {its just an ideaa that I think could work}:  But do reserach to make to see how to best prompt)
- [ ] Pass both frames to video generation API if end frame is toggled (like if the user elects to do both starting and end frame)
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

# User Notes: 2. The real KEY  Thing we need to do in this session is making sure the actual assets are being used to make the frames. 

To do this, we first needto analysze what is the current way frames are being generated; like what is the system prompt data flow that is being inputed in the api calls to the image generation

I think it's likely its not useing the actual images of the assets from the relevant scene instance images into their prompts. I say this becuase, based on my testing of the app, it would appear it's completly different outputs than that of the scene instance image. Like the characters look completely different, as does the overal compositon Consider the following example:
 

### Problem
Looking at generations in Stage 10, there's no influence from any master assets — looks like a completely unique generationop. Something is wrong with the asset inheritance into frame generation. The full inheritance chain (Stage 5 → 8 → 9 → 10) must be verified and repaired.

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
