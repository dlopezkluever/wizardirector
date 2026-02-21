 Ready to code?

 Here is Claude's plan:
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌ Transformation Event System — Improvements Plan

 Context

 The transformation event system (implemented in Phase 4 Wave 2) allows users to define visual transformations for assets within a scene. Several UX and functionality gaps were identified:

 1. The "Add Transformation" dialog requires fully manual entry — no AI assistance at creation time
 2. The "Generate with AI" button on the card is only useful after creation and requires manual context
 3. Post-transformation image generation is stubbed (returns 501)
 4. No way to reuse transformation images across scenes (superhero recurring-form problem)
 5. "Instant (cut-based)" label is unclear
 6. User wants assurance that transformations persist across subsequent shots

 ---
 Improvement 1: Agentic Pre-fill on Shot Selection

 Goal: When user selects a trigger shot in the Add Transformation dialog, auto-call AI to pre-fill "After" and "Transformation Narrative" fields.

 Backend

 New endpoint in backend/src/routes/sceneAssets.ts:
 POST /:projectId/scenes/:sceneId/transformation-events/generate-prefill
 Body: { trigger_shot_id, scene_asset_instance_id, transformation_type }
 Returns: { post_description, transformation_narrative }

 New method in backend/src/services/transformationEventService.ts:
 generateTransformationPrefill(triggerShotId, sceneAssetInstanceId, transformationType, sceneId)
 - Fetches trigger shot fields: action, dialogue, setting, camera, characters_foreground
 - Fetches asset: project_assets.name, effective_description
 - Fetches scene: script_excerpt
 - LLM call with richer context than existing generatePostDescription():
   - System prompt: visual description writer for AI film pipeline
   - User prompt includes: asset name, current appearance (before), trigger shot action/dialogue/setting, transformation type, scene script excerpt
   - Returns JSON: { post_description: string, transformation_narrative: string }
   - Temperature 0.5, max 768 tokens

 Frontend

 File: src/components/pipeline/Stage8/AddTransformationDialog.tsx
 - Add props: projectId, sceneId (passed from VisualStateEditorPanel)
 - On trigger shot selection (setTriggerShotId), auto-fire API call:
   - Set isPrefilling = true, show Loader2 spinners on After + Narrative textareas
   - Call new transformationEventService.generatePrefill(projectId, sceneId, { trigger_shot_id, scene_asset_instance_id, transformation_type })
   - On success: populate postDescription and narrative state, set isPrefilling = false
   - On error: silently fail, leave fields empty for manual entry
 - Fields remain fully editable after pre-fill
 - If user changes trigger shot, re-fire the pre-fill (debounced)
 - If user has already typed content, do NOT overwrite — only pre-fill empty fields

 File: src/lib/services/transformationEventService.ts
 - Add generatePrefill(projectId, sceneId, data) method

 File: src/components/pipeline/Stage8/VisualStateEditorPanel.tsx
 - Pass projectId and sceneId to AddTransformationDialog

 ---
 Improvement 2: Collapsible Context Section in Dialog

 Goal: Show shot-list and script context in the dialog so users can see what's happening in the trigger shot.

 Frontend

 File: src/components/pipeline/Stage8/AddTransformationDialog.tsx
 - Add collapsible <Collapsible> section below the form fields (uses shadcn/ui Collapsible)
 - Only visible when a trigger shot is selected
 - Shows:
   - Shot Action: selectedShot.action (the main narrative)
   - Shot Dialogue: selectedShot.dialogue (if any)
   - Shot Setting: selectedShot.setting
   - Shot Camera: selectedShot.camera
 - Add new prop: sceneScriptExcerpt?: string — passed from VisualStateEditorPanel
   - Panel fetches scene data (already available via parent Stage8VisualDefinition)
   - Shows truncated script excerpt (first ~500 chars) in the collapsible

 File: src/components/pipeline/Stage8/VisualStateEditorPanel.tsx
 - Add prop sceneScriptExcerpt?: string to receive from parent
 - Pass to AddTransformationDialog

 File: src/components/pipeline/Stage8VisualDefinition.tsx
 - Already fetches currentScene — extract scriptExcerpt and pass to VisualStateEditorPanel

 ---
 Improvement 3: Transformation Instance Image Generation

 Goal: Implement the stubbed generate-post-image endpoint and add UI for generating/viewing post-transformation images.

 Backend

 File: backend/src/routes/sceneAssets.ts — replace 501 stub:
 - Fetch the transformation event (with asset + project data)
 - Fetch Stage 5 visual style (capsule ID or manual tone) — same pattern as normal asset image generation
 - Call imageService.createImageJob() with:
   - jobType: 'scene_asset' (reuse existing type)
   - prompt: the event's post_description with background isolation injected
   - width/height: from asset type (same ASPECT_RATIOS as normal asset images)
   - referenceImageUrl: the asset's current image_key_url (pre-state) for identity reference
   - visualStyleCapsuleId / manualVisualTone from Stage 5
   - idempotencyKey: post-transform-{eventId}-{Date.now()}
 - On job completion/success: update transformation_events.post_image_key_url with the public URL
 - Return { jobId, status } immediately (async pattern)

 File: backend/src/services/transformationEventService.ts
 - Add updatePostImage(eventId, imageUrl) helper method

 Frontend

 File: src/components/pipeline/Stage8/TransformationEventCard.tsx
 - Add image section below the narrative field:
   - If event.post_image_key_url exists: show thumbnail image (clickable to enlarge)
   - "Generate Image" button (Sparkles + Image icon) — calls onGeneratePostImage(event.id)
   - Loading state during generation
   - "Use Existing" button (see Improvement 4)
 - Add badge/nudge: if event is confirmed but has no post_image_key_url, show amber "No reference image" indicator

 File: src/components/pipeline/Stage8/VisualStateEditorPanel.tsx
 - Add handleGeneratePostImage handler
 - Call transformationEventService.generatePostImage() — poll for completion or use callback pattern matching existing image generation flow

 ---
 Improvement 4: Image Reuse via Carousel + Picker

 Goal: Allow users to pick from existing transformation images instead of always generating new ones. Add transformation images to the master reference carousel.

 Backend

 File: backend/src/routes/sceneAssets.ts — extend reference-chain endpoint:
 - After building the existing chain (Stage 5 master + prior scene instances), also query:
 SELECT te.post_image_key_url, te.post_description, s.scene_number
 FROM transformation_events te
 JOIN scenes s ON te.scene_id = s.id
 JOIN scene_asset_instances sai ON te.scene_asset_instance_id = sai.id
 WHERE sai.project_asset_id = :projectAssetId
   AND te.confirmed = true
   AND te.post_image_key_url IS NOT NULL
 ORDER BY s.scene_number, te.created_at
 - Add new source type: 'transformation' with additional transformationDescription field
 - Append these to the reference chain response

 New endpoint in backend/src/routes/sceneAssets.ts:
 GET /:projectId/assets/:projectAssetId/transformation-images
 Returns: Array<{ imageUrl, postDescription, sceneNumber, eventId }>
 - Fetches all confirmed transformation events with post images for a given project asset across all scenes
 - Used by the "Use Existing" picker in the transformation card

 Frontend

 File: src/components/pipeline/Stage8/MasterReferenceCarousel.tsx
 - Extend to display 'transformation' source items with label "Transformed (Scene N)"
 - Show the transformationDescription snippet on hover

 New component: src/components/pipeline/Stage8/TransformationImagePicker.tsx
 - Small dialog/popover triggered by "Use Existing" button on TransformationEventCard
 - Fetches transformationEventService.fetchTransformationImages(projectId, projectAssetId)
 - Shows grid/carousel of prior transformation images with scene labels and description snippets
 - On select: sets post_image_key_url on the current event via updateEvent()

 File: src/lib/services/transformationEventService.ts
 - Add fetchTransformationImages(projectId, projectAssetId) method

 File: src/components/pipeline/Stage8/TransformationEventCard.tsx
 - Add "Use Existing" button next to "Generate Image"
 - Opens TransformationImagePicker

 ---
 Improvement 5: Rename "Instant" + Add Tooltips

 Goal: Replace confusing "Instant (cut-based)" label with clearer wording, add help text for all types.

 Frontend

 File: src/components/pipeline/Stage8/AddTransformationDialog.tsx
 - Rename type options:
   - instant → display: "Between Shots (off-camera)" — tooltip: "The change happens off-screen between cuts. The asset appears differently starting at the selected shot."
   - within_shot → display: "Within Shot (on-camera)" — tooltip: "The transformation happens visually during this shot. The camera captures the moment of change."
   - gradual → display: "Gradual (spans multiple shots)" — tooltip: "The transformation unfolds across several shots, starting at trigger and completing at the completion shot."
 - Add <TooltipProvider> with info icons (InfoCircle) next to each type in the select dropdown, or use <SelectItem> descriptions

 File: src/components/pipeline/Stage8/TransformationEventCard.tsx
 - Update type badge labels to match:
   - instant → "Between Shots"
   - within_shot → "Within Shot"
   - gradual → "Gradual"

 ---
 Improvement 6: Persistence Verification & UI Clarity

 Goal: Confirm the backend already persists transformations for remaining shots; add UI indicator.

 Status

 The backend resolveOverridesForShot() in transformationEventService.ts already correctly handles this:
 - instant: trigger shot + all after → post_description
 - within_shot: trigger shot is is_transforming, all after → post_description
 - gradual: completion shot + all after → post_description

 No backend changes needed.

 Frontend (optional but recommended)

 File: src/components/pipeline/Stage8/TransformationEventCard.tsx
 - Add a small informational note below confirmed events: "This transformation applies from Shot {triggerLabel} onward for the rest of the scene."
 - For gradual: "This transformation applies from Shot {completionLabel} onward."

 ---
 Files Modified Summary

 ┌───────────────────────────────────────────────────────────────────┬─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
 │                               File                                │                                                     Changes                                                     │
 ├───────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ backend/src/routes/sceneAssets.ts                                 │ New prefill endpoint, implement generate-post-image, extend reference-chain, new transformation-images endpoint │
 ├───────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ backend/src/services/transformationEventService.ts                │ New generateTransformationPrefill(), updatePostImage() methods                                                  │
 ├───────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ src/components/pipeline/Stage8/AddTransformationDialog.tsx        │ Auto-prefill on shot select, collapsible context, type rename + tooltips, new props                             │
 ├───────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ src/components/pipeline/Stage8/TransformationEventCard.tsx        │ Image section (generate/view/pick), type label rename, persistence note                                         │
 ├───────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ src/components/pipeline/Stage8/VisualStateEditorPanel.tsx         │ Pass new props (projectId, sceneId, sceneScriptExcerpt), handle image generation                                │
 ├───────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ src/components/pipeline/Stage8VisualDefinition.tsx                │ Pass sceneScriptExcerpt to panel                                                                                │
 ├───────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ src/components/pipeline/Stage8/MasterReferenceCarousel.tsx        │ Support 'transformation' source type                                                                            │
 ├───────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ src/lib/services/transformationEventService.ts                    │ New methods: generatePrefill(), fetchTransformationImages()                                                     │
 ├───────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ NEW: src/components/pipeline/Stage8/TransformationImagePicker.tsx │ Picker dialog for reusing existing transformation images                                                        │
 └───────────────────────────────────────────────────────────────────┴─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

 ---
 Implementation Order

 Improvement 5 (rename/tooltips) ─── simple, standalone
          │
 Improvement 1 (prefill) ──────────► Improvement 2 (context section)
          │                                    │
          ▼                                    ▼
 Improvement 3 (image generation) ──► Improvement 4 (image reuse/carousel)
          │
 Improvement 6 (persistence note) ── simple, standalone

 Start with 5 (quick win), then 1+2 together (same dialog), then 3→4 (image pipeline).

 ---
 Verification

 1. Prefill test: Open Add Transformation dialog → select a trigger shot → verify After + Narrative auto-populate within a few seconds → verify fields are editable after
 2. Context section test: Select trigger shot → expand collapsible → verify shot action/dialogue/setting displayed + scene script excerpt
 3. Image generation test: Confirm a transformation event → click "Generate Image" → verify image appears after generation completes → verify post_image_key_url is saved
 4. Image reuse test: Create a second transformation for the same asset (different scene) → click "Use Existing" → verify prior transformation image appears in picker → select it → verify it's set as post image
 5. Master carousel test: After generating a post-transformation image, check MasterReferenceCarousel in a later scene → verify transformation image appears with "Transformed" label
 6. Rename test: Open Add Transformation dialog → verify "Between Shots (off-camera)" label → verify tooltips appear
 7. Persistence note test: Confirm a transformation event → verify informational note about persistence scope
 8. Lint: npm run lint on all modified files
 9. Tests: npm test (frontend) + cd backend && npm test (backend)

---

 (( The plan covers all 6 improvement areas from your suggestions document. Let me call out the key decisions baked into the plan:

  - Pre-fill fires automatically on shot selection, only fills empty fields (won't overwrite user edits)
  - Post-image generation follows the same async pattern as existing scene asset image generation
  - "Use Existing" picker queries all confirmed transformation events across the project for the same asset — solves the recurring superhero form problem
  - Master reference carousel extended with a 'transformation' source type so transformed images are available for future scene instance work
  - Backend persistence is already correct — just adding a UI note to make it obvious to users
  - Type labels renamed with tooltips on all three types
))