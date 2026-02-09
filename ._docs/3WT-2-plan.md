 
 Here is Claude's plan:
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌ Plan: Stage 8 UX Overhaul (3B.1 → 3B.4)

 Context

 Currently, Stage 8's VisualStateEditorPanel shows a single generated image per scene asset instance. Each regeneration overwrites 
  image_key_url with no history — if the first attempt was great and the second was worse, the user is stuck with the worse one.   
 There's also no way to use a master asset image directly without generating, no way to upload a custom image, and no
 scene-to-scene reference chain for master references.

 This plan implements four sequential tasks to address these gaps:
 - 3B.1: Generation attempt history + carousel (foundation)
 - 3B.4: "Use Master As-Is" option (no deps)
 - 3B.2: Master reference historical carousel (depends on 3B.1)
 - 3B.3: Manual image upload (depends on 3B.1)

 ---
 Implementation Order

 Task 3B.1 — Asset Generation Carousel (Foundation)

 1. Database Migration — backend/migrations/022_scene_asset_generation_attempts.sql

 New table scene_asset_generation_attempts:
 ┌─────────────────────────┬──────────────────────────────────────────────────────┬───────────────────────────┐
 │         Column          │                         Type                         │           Notes           │
 ├─────────────────────────┼──────────────────────────────────────────────────────┼───────────────────────────┤
 │ id                      │ UUID PK                                              │                           │
 ├─────────────────────────┼──────────────────────────────────────────────────────┼───────────────────────────┤
 │ scene_asset_instance_id │ UUID FK → scene_asset_instances                      │ CASCADE delete            │
 ├─────────────────────────┼──────────────────────────────────────────────────────┼───────────────────────────┤
 │ image_url               │ TEXT NOT NULL                                        │ Public URL                │
 ├─────────────────────────┼──────────────────────────────────────────────────────┼───────────────────────────┤
 │ storage_path            │ TEXT                                                 │ Supabase Storage path     │
 ├─────────────────────────┼──────────────────────────────────────────────────────┼───────────────────────────┤
 │ source                  │ TEXT CHECK IN ('generated','uploaded','master_copy') │                           │
 ├─────────────────────────┼──────────────────────────────────────────────────────┼───────────────────────────┤
 │ is_selected             │ BOOLEAN DEFAULT FALSE                                │                           │
 ├─────────────────────────┼──────────────────────────────────────────────────────┼───────────────────────────┤
 │ image_generation_job_id │ UUID FK → image_generation_jobs                      │ NULL for uploads/copies   │
 ├─────────────────────────┼──────────────────────────────────────────────────────┼───────────────────────────┤
 │ prompt_snapshot         │ TEXT                                                 │ Prompt at generation time │
 ├─────────────────────────┼──────────────────────────────────────────────────────┼───────────────────────────┤
 │ cost_credits            │ NUMERIC(10,4)                                        │                           │
 ├─────────────────────────┼──────────────────────────────────────────────────────┼───────────────────────────┤
 │ original_filename       │ TEXT                                                 │ For uploads only          │
 ├─────────────────────────┼──────────────────────────────────────────────────────┼───────────────────────────┤
 │ file_size_bytes         │ INTEGER                                              │ For uploads only          │
 ├─────────────────────────┼──────────────────────────────────────────────────────┼───────────────────────────┤
 │ mime_type               │ TEXT                                                 │ For uploads only          │
 ├─────────────────────────┼──────────────────────────────────────────────────────┼───────────────────────────┤
 │ copied_from_url         │ TEXT                                                 │ For master_copy only      │
 ├─────────────────────────┼──────────────────────────────────────────────────────┼───────────────────────────┤
 │ attempt_number          │ INTEGER NOT NULL DEFAULT 1                           │                           │
 ├─────────────────────────┼──────────────────────────────────────────────────────┼───────────────────────────┤
 │ created_at              │ TIMESTAMPTZ                                          │                           │
 ├─────────────────────────┼──────────────────────────────────────────────────────┼───────────────────────────┤
 │ updated_at              │ TIMESTAMPTZ                                          │                           │
 └─────────────────────────┴──────────────────────────────────────────────────────┴───────────────────────────┘
 Key constraints:
 - Partial unique index: (scene_asset_instance_id) WHERE is_selected = TRUE — guarantees one selected per instance at DB level     
 - Indexes on scene_asset_instance_id, (scene_asset_instance_id, created_at DESC), image_generation_job_id
 - RLS policies matching existing scene asset patterns (through scene → branch → project → user_id)

 Also ALTER scene_asset_instances:
 - Add use_master_as_is BOOLEAN DEFAULT FALSE (for 3B.4)
 - Add selected_master_reference_url TEXT (for 3B.2)
 - Add selected_master_reference_source TEXT CHECK IN ('stage5_master','prior_scene_instance') (for 3B.2)
 - Add selected_master_reference_instance_id UUID FK → scene_asset_instances (for 3B.2)

 2. Backend Service — create backend/src/services/sceneAssetAttemptsService.ts

 Methods:
 - listAttempts(instanceId) — ordered by created_at DESC
 - createAttempt(instanceId, data) — insert row
 - selectAttempt(instanceId, attemptId) — transaction: deselect all → select target → update scene_asset_instances.image_key_url   
 - deleteAttempt(instanceId, attemptId) — validate not selected, delete row + storage file
 - enforceAttemptCap(instanceId) — if count >= 8, delete oldest non-selected attempt
 - getNextAttemptNumber(instanceId) — MAX(attempt_number) + 1
 - backfillAttemptIfNeeded(instanceId) — lazy migration: if no attempts exist but image_key_url is set, create a single
 source='generated' attempt

 3. Modify ImageGenerationService — backend/src/services/image-generation/ImageGenerationService.ts

 In executeJobInBackground(), the scene_asset block (lines 275-287) currently just updates scene_asset_instances.image_key_url.    
 Modify to:
 1. Query scene_asset_instances by (scene_id, project_asset_id) to get instance id
 2. Call enforceAttemptCap(instanceId)
 3. Create attempt: source='generated', is_selected=true, image_generation_job_id=jobId, prompt_snapshot=request.prompt,
 image_url=publicUrl, storage_path=storagePath
 4. Deselect any previously selected attempt (within a transaction)
 5. Keep existing image_key_url update on scene_asset_instances

 4. Backend Routes — add to backend/src/routes/sceneAssets.ts
 ┌────────┬────────────────────────────────────────────┬─────────────────────────────────────────────┐
 │ Method │                    Path                    │                 Description                 │
 ├────────┼────────────────────────────────────────────┼─────────────────────────────────────────────┤
 │ GET    │ .../:instanceId/attempts                   │ List all attempts for instance              │
 ├────────┼────────────────────────────────────────────┼─────────────────────────────────────────────┤
 │ POST   │ .../:instanceId/attempts/:attemptId/select │ Select attempt → auto-save to image_key_url │
 ├────────┼────────────────────────────────────────────┼─────────────────────────────────────────────┤
 │ DELETE │ .../:instanceId/attempts/:attemptId        │ Delete non-selected attempt                 │
 └────────┴────────────────────────────────────────────┴─────────────────────────────────────────────┘
 5. Frontend Types — src/types/scene.ts

 Add SceneAssetGenerationAttempt interface. Extend SceneAssetInstance with use_master_as_is, selected_master_reference_url,        
 selected_master_reference_source, selected_master_reference_instance_id.

 6. Frontend Service — src/lib/services/sceneAssetService.ts

 Add: listAttempts(), selectAttempt(), deleteAttempt()

 7. New Component — src/components/pipeline/Stage8/GenerationAttemptCarousel.tsx

 - Uses existing shadcn Carousel from src/components/ui/carousel.tsx
 - Simple arrows + "2/5" counter display
 - Each slide: image with aspect-video, max-w-xs
 - Selected image: gold border + "Selected" badge
 - Non-selected images: "Select This One" button (immediate auto-save)
 - Hover tooltip: source type, timestamp, prompt (if generated), cost
 - Empty state: "No image yet. Generate above."
 - Uses useQuery(['scene-asset-attempts', projectId, sceneId, instanceId])

 8. Modify VisualStateEditorPanel — src/components/pipeline/Stage8/VisualStateEditorPanel.tsx

 Replace the static image section (lines 283-301) with <GenerationAttemptCarousel />. The component fetches its own data via React 
  Query.

 ---
 Task 3B.4 — "Use Master As-Is" Option

 1. Backend Route — add to backend/src/routes/sceneAssets.ts
 ┌────────┬──────────────────────────────────┬───────────────────────────────────────────────────┐
 │ Method │               Path               │                    Description                    │
 ├────────┼──────────────────────────────────┼───────────────────────────────────────────────────┤
 │ POST   │ .../:instanceId/use-master-as-is │ Body: { enabled: boolean }                        │
 ├────────┼──────────────────────────────────┼───────────────────────────────────────────────────┤
 │ POST   │ .../bulk-use-master-as-is        │ Body: { instanceIds: string[], enabled: boolean } │
 └────────┴──────────────────────────────────┴───────────────────────────────────────────────────┘
 When enabled=true:
 1. Get master reference URL (from selected_master_reference_url if set, else project_assets.image_key_url)
 2. Set use_master_as_is=true on instance
 3. Enforce 8-cap, create attempt with source='master_copy', is_selected=true
 4. Update scene_asset_instances.image_key_url

 When enabled=false:
 1. Set use_master_as_is=false — do NOT change image_key_url (user selects another manually)

 2. Frontend Service — add setUseMasterAsIs(), bulkUseMasterAsIs() to sceneAssetService

 3. New Component — src/components/pipeline/Stage8/UseMasterAsIsCheckbox.tsx

 - Checkbox + label "Use master as-is", unchecked by default
 - When checked: calls API, invalidates queries
 - When unchecked: calls API with enabled=false

 4. Modify VisualStateEditorPanel

 - Place <UseMasterAsIsCheckbox /> inline next to the Generate Image button (line 234-248 area)
 - When use_master_as_is=true: disable Generate button, disable description Textarea (lines 261-269)
 - Visual indication: the master_copy attempt appears as selected in the carousel

 5. Modify SceneAssetListPanel — src/components/pipeline/Stage8/SceneAssetListPanel.tsx

 - Add badge on asset rows where use_master_as_is=true
 - Add bulk "Use Master As-Is" button near existing bulk generate button (applies to selected assets)

 ---
 Task 3B.2 — Master Reference Historical Carousel

 1. Backend Routes — add to backend/src/routes/sceneAssets.ts
 ┌────────┬─────────────────────────────────────────┬──────────────────────────────────────────────────────────────┐
 │ Method │                  Path                   │                         Description                          │
 ├────────┼─────────────────────────────────────────┼──────────────────────────────────────────────────────────────┤
 │ GET    │ .../:instanceId/reference-chain         │ Get Stage 5 master image + selected images from prior scenes │
 ├────────┼─────────────────────────────────────────┼──────────────────────────────────────────────────────────────┤
 │ POST   │ .../:instanceId/select-master-reference │ Body: { source, instanceId? }                                │
 └────────┴─────────────────────────────────────────┴──────────────────────────────────────────────────────────────┘
 reference-chain logic:
 1. Get project_asset_id from instance
 2. Fetch project_assets.image_key_url (Stage 5 master)
 3. Query scene_asset_instances for same project_asset_id in scenes with scene_number < current, ordered by scene_number ASC       
 4. For each prior instance: get the selected attempt's image_url (where is_selected=true), fallback to image_key_url
 5. Return: [{ source: 'stage5_master', imageUrl, sceneNumber: null }, { source: 'prior_scene_instance', imageUrl, sceneNumber,    
 instanceId }, ...]

 select-master-reference logic:
 1. Update selected_master_reference_url, selected_master_reference_source, selected_master_reference_instance_id
 2. If use_master_as_is=true: also update image_key_url + update/create master_copy attempt

 2. Frontend Service — add getReferenceChain(), selectMasterReference()

 3. Frontend Types — add MasterReferenceItem interface to src/types/scene.ts

 4. New Component — src/components/pipeline/Stage8/MasterReferenceCarousel.tsx

 - Same carousel pattern as GenerationAttemptCarousel (arrows + counter)
 - Slides labeled: "Stage 5 Master" or "Scene N"
 - Defaults to most recent (last slide)
 - "Use This Reference" button to set active master reference
 - Uses useQuery(['master-reference-chain', projectId, sceneId, instanceId])

 5. Modify VisualStateEditorPanel

 - Replace MasterAssetReference (lines 61-86 inner function, rendered at line 254) with <MasterReferenceCarousel />

 ---
 Task 3B.3 — Manual Image Upload

 1. Backend Route — add to backend/src/routes/sceneAssets.ts
 ┌────────┬──────────────────────────────┬───────────────────────────────┐
 │ Method │             Path             │          Description          │
 ├────────┼──────────────────────────────┼───────────────────────────────┤
 │ POST   │ .../:instanceId/upload-image │ Multer multipart, single file │
 └────────┴──────────────────────────────┴───────────────────────────────┘
 Logic:
 1. Validate: PNG/JPG/WebP, max 5MB
 2. Enforce 8-attempt cap
 3. Upload to Supabase Storage: project_{id}/branch_{id}/scene_{id}/scene-assets/uploads/{instanceId}_{timestamp}.{ext}
 4. Create attempt: source='uploaded', is_selected=true, original_filename, file_size_bytes, mime_type
 5. Deselect previous, update image_key_url
 6. If use_master_as_is=true, set to false

 Multer config: reuse pattern from backend/src/routes/projectAssets.ts

 2. Frontend Service — add uploadSceneAssetImage(projectId, sceneId, instanceId, file: File) using FormData

 3. New Component — src/components/pipeline/Stage8/SceneAssetImageUpload.tsx

 - Small upload zone below the GenerationAttemptCarousel
 - Drag-and-drop + click to select file
 - Accepts: .png, .jpg, .jpeg, .webp
 - Shows upload progress
 - On success: invalidates attempts query, toast
 - Disabled when use_master_as_is=true

 4. Integrate into VisualStateEditorPanel

 - Add <SceneAssetImageUpload /> below <GenerationAttemptCarousel />

 ---
 Key Files Modified/Created

 New files:
 - backend/migrations/022_scene_asset_generation_attempts.sql
 - backend/src/services/sceneAssetAttemptsService.ts
 - src/components/pipeline/Stage8/GenerationAttemptCarousel.tsx
 - src/components/pipeline/Stage8/UseMasterAsIsCheckbox.tsx
 - src/components/pipeline/Stage8/MasterReferenceCarousel.tsx
 - src/components/pipeline/Stage8/SceneAssetImageUpload.tsx

 Modified files:
 - backend/src/services/image-generation/ImageGenerationService.ts — scene_asset block creates attempt records
 - backend/src/routes/sceneAssets.ts — 8 new endpoints
 - src/types/scene.ts — new types + extended SceneAssetInstance
 - src/lib/services/sceneAssetService.ts — new API client methods
 - src/components/pipeline/Stage8/VisualStateEditorPanel.tsx — carousel integration, master ref carousel, upload zone, checkbox    
 - src/components/pipeline/Stage8/SceneAssetListPanel.tsx — badges + bulk master-as-is

 Reused existing:
 - src/components/ui/carousel.tsx — shadcn Embla Carousel (arrows, keyboard nav)

 Edge Cases

 - Pre-migration data: Lazy backfill — listAttempts() auto-creates a single attempt from existing image_key_url if no attempts     
 exist
 - 8-attempt cap: App-level enforcement — delete oldest non-selected before insert
 - Concurrent generation: Transaction-based selection ensures last-to-complete wins; both attempts appear in carousel
 - Master ref change while use_master_as_is=true: Auto-updates image_key_url + master_copy attempt
 - Scene 1: Master reference carousel shows only the Stage 5 master image
 - Stage 9 gatekeeper: No change needed — image_key_url is populated by all paths (select, generate, upload, master-as-is)
 - Inherited instances: Don't inherit attempts — lazy backfill handles inherited image_key_url
 - Bulk generation: Works unchanged — each individual generation now also creates an attempt

 Verification

 1. 3B.1: Generate image → appears in carousel as selected. Generate again → carousel shows 2 images. Select first → image_key_url 
  updates, first gets gold border. Hover → metadata tooltip. Generate 9th → oldest non-selected auto-deleted.
 2. 3B.4: Check "Use master as-is" → Generate button + description disabled, master image copied as scene image. Uncheck →
 controls re-enabled. Bulk: select multiple in left panel, click bulk button.
 3. 3B.2: Master reference section shows carousel with Stage 5 master + prior scene selected images. Click "Use This Reference" on 
  Scene 2 → master reference updates. If use_master_as_is checked, scene image also updates.
 4. 3B.3: Click upload zone → pick image → appears in carousel as selected. Upload 8th → counts toward cap. Upload while
 use_master_as_is checked → checkbox auto-unchecks.
 5. Lint: Run npm run lint after all changes.
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
 
 
 ● Do uploaded images (3B.3) count toward the 8-attempt cap per scene asset instance, or are they tracked separately?
   → Count toward 8 cap
 ● For 3B.4's 'Use Master As-Is' checkbox — where should it appear in the VisualStateEditorPanel?
   → Next to the Generate Button (Inine), BUT when checked, the generate generation button + description override are 
        disabled/hidden. ( & the system needs to know to use the master reference that is selected as the image for rest of the    
   scene pipeline  (as remeember there will soon be carousel functionality for the master reference to cycle through the previously    selected images as well)
 ● Should I write the database migration SQL files (for the new generation_attempts table) but NOT execute them, per the CLAUDE.md 
 rule? Or is there a different workflow for schema changes?
   → Write SQL, don't run
 ● When a user clicks 'Select This One' on a carousel attempt in 3B.1, should it immediately update the scene instance's active    
 image (auto-save), or require a separate 'Confirm' action?
   → Immediate auto-save



## *Dev summary*:
  Implementation Summary

  Files Created (6):

  1. backend/migrations/022_scene_asset_generation_attempts.sql — New table scene_asset_generation_attempts with RLS policies, partial unique 
  index for single selection, and ALTER to scene_asset_instances for 3B.2/3B.4 columns
  2. backend/src/services/sceneAssetAttemptsService.ts — Backend service with listAttempts, createAttempt, selectAttempt, deleteAttempt,      
  enforceAttemptCap, getNextAttemptNumber, backfillAttemptIfNeeded
  3. src/components/pipeline/Stage8/GenerationAttemptCarousel.tsx — Carousel component using shadcn Embla carousel, with select/delete        
  actions, gold border for selected, hover tooltip with metadata, counter display
  4. src/components/pipeline/Stage8/UseMasterAsIsCheckbox.tsx — Checkbox toggle that calls the API to enable/disable "use master as-is" mode  
  5. src/components/pipeline/Stage8/MasterReferenceCarousel.tsx — Carousel showing Stage 5 master + prior scene selected images, with "Use    
  This Reference" button
  6. src/components/pipeline/Stage8/SceneAssetImageUpload.tsx — Drag-and-drop / click upload zone, validates PNG/JPG/WebP max 5MB

  Files Modified (6):

  1. backend/src/services/image-generation/ImageGenerationService.ts — Scene asset block now creates attempt records after generation (enforce   cap, deselect previous, create as selected)
  2. backend/src/routes/sceneAssets.ts — Added 8 new endpoints (list/select/delete attempts, use-master-as-is, bulk-use-master-as-is,
  reference-chain, select-master-reference, upload-image)
  3. src/types/scene.ts — Added SceneAssetGenerationAttempt, MasterReferenceItem interfaces; extended SceneAssetInstance with new fields      
  4. src/lib/services/sceneAssetService.ts — Added listAttempts, selectAttempt, deleteAttempt, setUseMasterAsIs, bulkUseMasterAsIs,
  getReferenceChain, selectMasterReference, uploadSceneAssetImage
  5. src/components/pipeline/Stage8/VisualStateEditorPanel.tsx — Replaced static image with GenerationAttemptCarousel, replaced
  MasterAssetReference with MasterReferenceCarousel, added SceneAssetImageUpload and UseMasterAsIsCheckbox, disabled Generate/description when   master-as-is
  6. src/components/pipeline/Stage8/SceneAssetListPanel.tsx — Added "Master" badge for use_master_as_is assets, added bulk "Use Master As-Is" 
  button in footer, passed projectId/sceneId props

  Lint: All new/modified files pass cleanly (no new errors or warnings introduced).
