Resume this session with:
claude --resume 11624b48-e560-4890-96d6-90d142557472

Pelase tell me what the actual system prompts for generating each item looks like, in other words, what am I supposed to be llooking up. 

 Implementation Summary

  Backend Changes

  backend/src/services/promptGenerationService.ts
  - Added ReferenceImageOrderEntry type and threaded it through GeneratedPromptSet and BulkPromptGenerationResult
  - Added buildNumberedImageManifest() function — sorts assets (chars → locations → props), picks best image URL per asset,  
  builds numbered manifest string for LLM
  - Updated generateFramePrompt() to accept and inject imageManifest into LLM system prompt (with instruction to NOT include 
  Image #N in output)
  - Updated generatePromptSet() / generateBulkPromptSets() to call manifest builder and thread referenceImageOrder through   
  return values
  - Added generateEndFramePrompt() method — LLM generates end-state description based on start frame prompt, shot action, and   duration

  backend/src/services/frameGenerationService.ts
  - Extended ShotWithFrames interface with referenceImageOrder and endFramePrompt
  - Added fetchShotReferenceImages() — reads reference_image_order from DB, returns ReferenceImage[] with role: 'identity'   
  - Updated startFrameGeneration() to accept and pass referenceImageUrls
  - Updated generateFrames() loop — fetches ref images per shot, passes to start frame; for end frames uses end_frame_prompt 
  (fallback to old suffix), prepends approved start frame as identity ref
  - Updated regenerateFrame() — uses end_frame_prompt, fetches ref images, prepends start frame for end frames
  - Updated fetchFramesForScene() — selects and maps reference_image_order, end_frame_prompt

  backend/src/services/image-generation/ImageProviderInterface.ts
  - Added role?: 'identity' | 'style' to ReferenceImage

  backend/src/services/image-generation/ImageGenerationService.ts
  - Added referenceImageUrls?: ReferenceImage[] to CreateImageJobRequest
  - Updated executeJobInBackground() — prepends identity refs before style capsule images

  backend/src/services/image-generation/NanoBananaClient.ts
  - Updated prompt building to differentiate identity vs style images by role, with legacy fallback

  backend/src/routes/projects.ts
  - Updated prompt generation route (POST generate-prompts) to persist and return reference_image_order
  - Updated GET prompts endpoint to select and return reference_image_order

  backend/src/routes/frames.ts
  - Added POST generate-end-frame-prompt endpoint
  - Added PUT end-frame-prompt endpoint

  Frontend Changes

  src/types/scene.ts
  - Added ReferenceImageOrderEntry type
  - Added referenceImageOrder to PromptSet and ShotWithFrames
  - Added endFramePrompt to ShotWithFrames

  src/lib/services/frameService.ts
  - Added generateEndFramePrompt() and saveEndFramePrompt() methods

  src/components/pipeline/Stage9PromptSegmentation.tsx
  - End Frame badge is now always-visible and clickable (green when ON, muted when OFF) with optimistic toggle
  - Added reference image thumbnail row (32x32px numbered badges) above frame prompt textarea

  src/components/pipeline/FramePanel.tsx
  - Added referenceImages prop with thumbnail row rendering below frame display

  src/components/pipeline/Stage10FrameGeneration.tsx
  - Added slide-in panel (320px, AnimatePresence) for end frame prompt editing
  - Panel supports: generate prompt, regenerate, edit, save, and generate end frame
  - Added end prompt toggle button on end frame panel
  - Passes referenceImageOrder to both FramePanel instances
  - Added generateEndFramePromptMutation and saveEndFramePromptMutation

  Database Migration Required (manual)

  ALTER TABLE shots ADD COLUMN reference_image_order JSONB DEFAULT NULL;
  ALTER TABLE shots ADD COLUMN end_frame_prompt TEXT DEFAULT NULL;

--

--

--

--

--


  0. DB Migration First (blocks everything)

  Run in Supabase SQL editor:
  ALTER TABLE shots ADD COLUMN reference_image_order JSONB DEFAULT NULL;
  ALTER TABLE shots ADD COLUMN end_frame_prompt TEXT DEFAULT NULL;

  1. Smoke Test: Generate Prompts in Stage 9

  This single action validates Steps 2 + 5 + 6 in one shot.

  1. Open a project with a scene that has assets with images (characters/locations with generated images)
  2. Navigate to Stage 9
  3. Click Generate All Prompts
  4. Check in UI:
    - Reference image thumbnails should appear above each frame prompt textarea (numbered 1, 2, 3...)
    - Hover thumbnails → asset name tooltip
    - End Frame badges should be visible on every shot (green or muted)
  5. Check in DB (Supabase table editor → shots):
    - reference_image_order column should have JSONB array like [{"label":"Image
  #1","assetName":"Hansel","url":"...","type":"character"}, ...]
  6. Check LLM output — frame prompt text should NOT contain Image #1, Image #2, etc.

  2. Toggle End Frame Badge

  Still in Stage 9:

  1. Click a green "End Frame" badge → should flip to muted "No End Frame"
  2. Refresh page → verify it persisted
  3. Click again to re-enable → should go green

  This validates the optimistic toggle + PUT endpoint.

  3. Generate Frames in Stage 10

  Navigate to Stage 10 for the same scene:

  1. Click Generate on a start frame
  2. Check backend logs (npm run dev terminal) for:
    - Prepended N asset reference image(s) (identity) to context — confirms ref images are being sent
    - Maintain the characters/subjects from the FIRST N identity reference in the NanoBanana prompt log — confirms role-based   prompt
  3. Once start frame generates → approve it
  4. Check that reference image thumbnails appear below the frame image in FramePanel

  4. End Frame Prompt Panel (Stage 10)

  This validates Step 4 + 7 together:

  1. Select a shot with End Frame enabled
  2. Click "End Prompt" button on the end frame column → panel slides in from right
  3. Click "Generate End Frame Prompt" → should call LLM and populate textarea
  4. Edit the text slightly → "Save" button appears → click it
  5. Click "Regenerate" → text replaces with new LLM output
  6. Click "Generate End Frame" → end frame generation starts using the dedicated prompt (not the old suffix)
  7. Check backend logs for: end_frame_prompt being used instead of [End of shot - showing action completion]

  5. Backward Compat Check

  Open an older project/scene where shots were created before this feature:

  1. reference_image_order and end_frame_prompt will be NULL
  2. Stage 9 → no thumbnail row (correct — nothing to show)
  3. Stage 10 → regenerate an end frame → backend should fall back to the old suffix prompt
  4. End Prompt panel → shows "Generate End Frame Prompt" button (empty state)

  Quick Checklist

  ┌─────────────────────────────────┬────────────────────────────────────────────────────────────────────────────────┐       
  │              Test               │                               What it validates                                │       
  ├─────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────┤       
  │ Generate prompts (Stage 9)      │ Manifest builder, LLM injection, DB persistence, API response, UI thumbnails   │       
  ├─────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────┤       
  │ Toggle End Frame badge          │ Optimistic UI, PUT endpoint, requiresEndFrame persistence                      │       
  ├─────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────┤       
  │ Generate start frame (Stage 10) │ Ref images threaded to image API, NanoBanana role-based prompts                │       
  ├─────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────┤       
  │ End Prompt panel → Generate     │ generateEndFramePrompt endpoint, LLM end-state prompt                          │       
  ├─────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────┤       
  │ End Prompt panel → Save         │ saveEndFramePrompt PUT endpoint                                                │       
  ├─────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────┤       
  │ Generate end frame              │ end_frame_prompt used instead of suffix, start frame prepended as identity ref │       
  ├─────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────┤       
  │ Old project (null fields)       │ Backward compat — no crashes, old suffix fallback                              │       
  └─────────────────────────────────┴────────────────────────────────────────────────────────────────────────────────┘       

  The first three tests catch ~80% of issues. If those pass, the remaining are mostly UI polish checks.
