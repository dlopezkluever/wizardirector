╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌ Transformation Event System — Implementation Plan

 Context

 The pipeline currently stores ONE effective_description per asset per scene (in scene_asset_instances). When a character  
 transforms mid-scene (e.g., Persephone: blonde nature princess → dark goth queen), all shots in the scene get the same    
 description in their prompts. This makes it impossible to represent:

 - Within-scene, cross-shot transformations (character changes between shots)
 - Within-shot transformations (character changes ON CAMERA during a single shot, e.g., Cinderella at midnight)

 Cross-scene transformations are handled by the separate WT-F task and are out of scope here.

 Solution: Introduce a transformation_events table that marks where an asset's visual description changes within a scene.  
 The prompt generation engine resolves which description to use per-shot by checking transformation boundaries.

 ---
 Phase 1: Database Migration (030)

 New file: backend/migrations/030_transformation_events.sql

 New table: transformation_events

 Column: id
 Type: UUID PK
 Notes:
 ────────────────────────────────────────
 Column: scene_asset_instance_id
 Type: UUID FK → scene_asset_instances ON DELETE CASCADE
 Notes: Which asset transforms
 ────────────────────────────────────────
 Column: scene_id
 Type: UUID FK → scenes ON DELETE CASCADE
 Notes: Parent scene (denormalized for queries)
 ────────────────────────────────────────
 Column: trigger_shot_id
 Type: UUID FK → shots ON DELETE CASCADE
 Notes: Shot where transformation occurs
 ────────────────────────────────────────
 Column: transformation_type
 Type: TEXT CHECK IN ('instant','gradual','within_shot')
 Notes:
 ────────────────────────────────────────
 Column: completion_shot_id
 Type: UUID FK → shots ON DELETE SET NULL
 Notes: For 'gradual' only: where it finishes
 ────────────────────────────────────────
 Column: pre_description
 Type: TEXT NOT NULL
 Notes: Appearance before
 ────────────────────────────────────────
 Column: post_description
 Type: TEXT NOT NULL
 Notes: Appearance after
 ────────────────────────────────────────
 Column: transformation_narrative
 Type: TEXT
 Notes: What happens visually (for video prompts)
 ────────────────────────────────────────
 Column: pre_image_key_url
 Type: TEXT
 Notes: Reference image for pre-state
 ────────────────────────────────────────
 Column: post_image_key_url
 Type: TEXT
 Notes: Reference image for post-state
 ────────────────────────────────────────
 Column: pre_status_tags
 Type: TEXT[] DEFAULT '{}'
 Notes:
 ────────────────────────────────────────
 Column: post_status_tags
 Type: TEXT[] DEFAULT '{}'
 Notes:
 ────────────────────────────────────────
 Column: detected_by
 Type: TEXT CHECK IN ('stage7_extraction','stage8_relevance','manual')
 Notes:
 ────────────────────────────────────────
 Column: confirmed
 Type: BOOLEAN DEFAULT FALSE
 Notes: User must confirm before use in prompts
 ────────────────────────────────────────
 Column: confirmed_at
 Type: TIMESTAMPTZ
 Notes:
 ────────────────────────────────────────
 Column: created_at / updated_at
 Type: TIMESTAMPTZ
 Notes: Standard timestamps + update trigger

 Indexes: scene_id, scene_asset_instance_id, trigger_shot_id, (scene_id + scene_asset_instance_id) composite.

 RLS: Match pattern from migration 015 (join through scenes → branches → projects → user_id).

 Add column to shots table

 ALTER TABLE shots ADD COLUMN IF NOT EXISTS transformation_flags JSONB DEFAULT NULL;

 Stores raw LLM detection output from Stage 7 as staging data:
 [{ "character_name": "Persephone", "type": "within_shot", "description": "...", "is_trigger": true }]

 ---
 Phase 2: Backend — TransformationEventService

 New file: backend/src/services/transformationEventService.ts

 Types

 interface TransformationEvent { /* mirrors DB columns + joined shot data */ }
 interface ShotAssetOverride {
   asset_instance_id: string;
   effective_description: string;     // Swapped description for this shot
   image_key_url?: string;            // Swapped reference image
   is_transforming: boolean;          // True only for within_shot at trigger
   transformation_narrative?: string; // Only when is_transforming
   post_description?: string;         // For end frame of within_shot
   post_image_key_url?: string;
 }

 Core method: resolveOverridesForShot(shot, sceneAssets, events, allShots)

 Returns ShotAssetOverride[] — one entry per asset that differs from its default effective_description at this shot.       

 Resolution algorithm (per asset, events sorted by trigger shot_order):

 ┌──────────────────────────────┬───────────────────┬────────────────────────────┬──────────────────────┐
 │        Shot position         │      instant      │        within_shot         │       gradual        │
 ├──────────────────────────────┼───────────────────┼────────────────────────────┼──────────────────────┤
 │ Before trigger               │ pre (no override) │ pre (no override)          │ pre (no override)    │
 ├──────────────────────────────┼───────────────────┼────────────────────────────┼──────────────────────┤
 │ At trigger                   │ post              │ pre + is_transforming=true │ pre (mid-transition) │
 ├──────────────────────────────┼───────────────────┼────────────────────────────┼──────────────────────┤
 │ Between trigger & completion │ N/A               │ post                       │ pre (mid-transition) │
 ├──────────────────────────────┼───────────────────┼────────────────────────────┼──────────────────────┤
 │ At/after completion          │ N/A               │ post                       │ post                 │
 └──────────────────────────────┴───────────────────┴────────────────────────────┴──────────────────────┘

 Multiple events on the same asset stack: each event's post_description becomes the next event's implicit pre.

 Other methods

 - getTransformationEventsForScene(sceneId) — query with joins to shots (shot_id, shot_order)
 - createTransformationEvent(data) — validate + insert; auto-populate pre_description from
 scene_asset_instance.effective_description
 - updateTransformationEvent(id, updates) — partial update
 - confirmTransformationEvent(id) — set confirmed=true, confirmed_at=now()
 - deleteTransformationEvent(id)
 - generatePostDescription(eventId) — LLM call: pre_description + transformation_narrative + scene script →
 post_description
 - getLastAssetStateForInheritance(sceneId, projectAssetId) — if asset has confirmed transformation events, return the     
 LAST event's post_description/post_status_tags; otherwise return effective_description (for cross-scene inheritance)      

 ---
 Phase 3: Stage 7 — Shot Extraction Modifications

 File: backend/src/services/shotExtractionService.ts

 3a. Extend LLM system prompt

 Add after the CONTINUITY REQUIREMENTS block:

 TRANSFORMATION DETECTION:
 If a character/asset undergoes a VISUAL TRANSFORMATION in this scene (costume change,
 physical transformation, injury, disguise, etc.), flag it:
 - Set transformation_flags on the shot where change occurs
 - Types: "instant" (cut-based), "within_shot" (on-camera), "gradual" (spans shots)
 - For gradual: mark is_trigger on start shot, is_completion on end shot

 Add transformation_flags to the JSON output schema shown to the LLM.

 3b. Extend ExtractedShot interface

 Add optional transformationFlags array with characterName, type, description, isTrigger, isCompletion.

 3c. Extend shot mapping logic (~line 234)

 Parse raw.transformation_flags → ExtractedShot.transformationFlags with safe defaults.

 3d. Persist to DB

 File: backend/src/routes/projects.ts (~line 1227, shot extraction route)

 In the shotsToInsert mapping, add:
 transformation_flags: shot.transformationFlags ? JSON.stringify(shot.transformationFlags) : null,

 ---
 Phase 4: Stage 8 — Backend Routes + Frontend UI

 4a. Backend routes

 File: backend/src/routes/sceneAssets.ts — add new endpoints:

 Method: GET
 Path: /:projectId/scenes/:sceneId/transformation-events
 Purpose: List all events for scene (with shot joins)
 ────────────────────────────────────────
 Method: POST
 Path: /:projectId/scenes/:sceneId/transformation-events
 Purpose: Create event (manual or from detection)
 ────────────────────────────────────────
 Method: PUT
 Path: /:projectId/scenes/:sceneId/transformation-events/:eventId
 Purpose: Update descriptions, type, etc.
 ────────────────────────────────────────
 Method: POST
 Path: /:projectId/scenes/:sceneId/transformation-events/:eventId/confirm
 Purpose: Confirm a detected event
 ────────────────────────────────────────
 Method: DELETE
 Path: /:projectId/scenes/:sceneId/transformation-events/:eventId
 Purpose: Delete event
 ────────────────────────────────────────
 Method: POST
 Path: /:projectId/scenes/:sceneId/transformation-events/:eventId/generate-post-description
 Purpose: LLM-generate post_description
 ────────────────────────────────────────
 Method: POST
 Path: /:projectId/scenes/:sceneId/transformation-events/:eventId/generate-post-image
 Purpose: Generate post-state reference image

 4b. Auto-detect from Stage 7 flags

 In the existing detect-relevance endpoint (line 117) or as part of the new POST .../transformation-events flow:
 1. Fetch shots with non-null transformation_flags
 2. Match character_name to scene_asset_instances via project_assets.name
 3. Auto-create unconfirmed transformation_events with detected_by: 'stage7_extraction'
 4. Auto-populate pre_description from the instance's effective_description

 4c. Frontend service

 New file: src/lib/services/transformationEventService.ts

 API client: fetchEvents, createEvent, updateEvent, confirmEvent, deleteEvent, generatePostDescription, generatePostImage. 

 4d. Frontend types

 File: src/types/scene.ts — add:

 type TransformationType = 'instant' | 'gradual' | 'within_shot';
 interface TransformationEvent { /* mirrors API response */ }

 Add transformationFlags to the Shot interface.

 4e. Frontend UI — VisualStateEditorPanel

 File: src/components/pipeline/Stage8/VisualStateEditorPanel.tsx

 Replace the text at line 269 ("Mid-scene visual changes are handled in Stage 10") with a Transformation Events section:   

 - Header: "Transformations" with count badge
 - Detected events (unconfirmed): yellow-bordered cards showing:
   - Type badge (instant / gradual / within_shot)
   - Trigger shot ID (and completion shot for gradual)
   - Pre-description (read-only, from effective_description)
   - Post-description (editable textarea, or "Generate with AI" button)
   - Transformation narrative (editable, required for within_shot)
   - Confirm / Dismiss buttons
 - Confirmed events: green-bordered cards, editable, with "Generate Post Image" button
 - "Add Transformation" button: opens dialog to pick trigger shot, type, etc.

 New file: src/components/pipeline/Stage8/TransformationEventCard.tsx — reusable card component

 New file: src/components/pipeline/Stage8/AddTransformationDialog.tsx — dialog with shot selector, type selector,
 description fields

 4f. Stage 8 lock gating

 File: src/components/pipeline/Stage8VisualDefinition.tsx (~line 752, gatekeeper)

 Extend lock validation: all transformation events for the scene must be either confirmed (with non-empty
 post_description) or dismissed before proceeding to Stage 9.

 ---
 Phase 5: Stage 9 — Prompt Generation (Critical Path)

 File: backend/src/services/promptGenerationService.ts

 5a. Extend generateBulkPromptSets signature

 async generateBulkPromptSets(
   shots, sceneAssets, styleCapsule,
   transformationEvents?: TransformationEvent[]  // NEW
 )

 Before the shot loop, resolve per-shot overrides using transformationEventService.resolveOverridesForShot().

 5b. Make buildAssetContext override-aware

 Current (~line 181): Builds ONE context string from all scene assets.

 Change: Accept optional ShotAssetOverride[]. When an override exists for an asset, use its effective_description instead  
 of the default. For is_transforming assets, append:
 [TRANSFORMING IN THIS SHOT — see transformation context below]

 5c. Modify generateFramePrompt — minimal change

 For normal and post-transformation shots: the resolved effective_description already contains the right value (pre or     
 post). No prompt template change needed — just pass the override-aware asset context.

 For within_shot at trigger: start frame uses pre_description (already correct from resolution).

 5d. Modify generateVideoPrompt — conditional override

 Current (~line 462): System prompt says "NO character appearance descriptions".

 Change: Accept optional transformingAssets parameter. When present, append to the user prompt:

 TRANSFORMATION EVENT: {name} transforms during this shot.
 Before: {pre_description_summary}
 After: {post_description_summary}
 Transformation: {transformation_narrative}
 OVERRIDE: Describe this visual transformation as it happens.

 This only fires for within_shot type at the trigger shot. All other shots keep the standard "no appearance" rule.

 5e. Modify generateEndFramePrompt — conditional override

 File: backend/src/services/promptGenerationService.ts (~line 508) AND backend/src/routes/frames.ts (~line 424)

 Current: System prompt says "Same characters, same clothing, same environment".

 Change: When a within_shot transformation applies, replace that rule with:

 TRANSFORMATION: {name} has TRANSFORMED during this shot.
 START frame showed: {pre_description_summary}
 END frame must show: {post_description_summary}
 All OTHER characters/environment remain the same.

 Also swap the asset context to use post_description for the transforming asset.

 5f. Modify buildNumberedImageManifest — swap images

 When a ShotAssetOverride provides a post_image_key_url, use it instead of the default image. Clear matched_angle_url for  
 that asset since post-transformation angle variants don't exist yet.

 5g. Route modification

 File: backend/src/routes/projects.ts (~line 2110, generate-prompts endpoint)

 After fetching scene assets (~line 2199), add:

 const { data: transformationEvents } = await supabase
   .from('transformation_events')
   .select('*, trigger_shot:shots!trigger_shot_id(shot_id, shot_order), ...')
   .eq('scene_id', sceneId)
   .eq('confirmed', true);

 Pass transformationEvents to generateBulkPromptSets().

 5h. Frontend — Stage 9 transformation indicators

 File: src/components/pipeline/Stage9PromptSegmentation.tsx

 Per-shot: when transformation events affect a shot's prompts, show a small badge ("Pre-transform" / "Post-transform" /    
 "Transforming") next to the shot header.

 Extend PromptSet type with optional transformationContext array.

 ---
 Phase 6: Cross-Scene Inheritance

 6a. AssetInheritanceService

 File: backend/src/services/assetInheritanceService.ts

 Method: getInheritableAssetStates() (~line 91)

 After fetching prior scene instances, also fetch confirmed transformation events for those instances. For any instance    
 with transformation events, use the LAST event's post_description and post_status_tags as the inherited state (instead of 
  effective_description).

 6b. SceneAssetRelevanceService

 File: backend/src/services/sceneAssetRelevanceService.ts

 Method: getLastInstancePerAsset() (~line 44)

 Same pattern: when building the "last known state" for inheritance context, check for transformation events and use       
 post-state if present. This ensures the relevance detection prompt shows the correct appearance for inherited assets.     

 ---
 Phase 7: WT-E Integration Points (Future)

 When WT-E (shot-to-shot chaining) is built, it should consume resolveOverridesForShot() for asset descriptions rather     
 than reading raw scene_asset_instances. The chained "shot end state" extraction should include: "Character X has now      
 transformed to [post_description]" when a transformation occurred.

 No code changes needed now — just architectural awareness.

 ---
 Critical Files Summary

 File: backend/migrations/030_transformation_events.sql
 Changes: NEW — table + indexes + RLS + shots column
 ────────────────────────────────────────
 File: backend/src/services/transformationEventService.ts
 Changes: NEW — core service with resolution algorithm
 ────────────────────────────────────────
 File: backend/src/services/shotExtractionService.ts
 Changes: Extend prompt + output schema + mapping for transformation flags
 ────────────────────────────────────────
 File: backend/src/services/promptGenerationService.ts
 Changes: buildAssetContext override-aware, generateVideoPrompt + generateEndFramePrompt conditional overrides,
   generateBulkPromptSets passes events
 ────────────────────────────────────────
 File: backend/src/services/assetInheritanceService.ts
 Changes: getInheritableAssetStates checks transformation post-state
 ────────────────────────────────────────
 File: backend/src/services/sceneAssetRelevanceService.ts
 Changes: getLastInstancePerAsset checks transformation post-state
 ────────────────────────────────────────
 File: backend/src/routes/sceneAssets.ts
 Changes: 7 new transformation event endpoints
 ────────────────────────────────────────
 File: backend/src/routes/projects.ts
 Changes: Shot extraction persists flags; generate-prompts fetches events
 ────────────────────────────────────────
 File: backend/src/routes/frames.ts
 Changes: End frame route passes transformation context
 ────────────────────────────────────────
 File: src/types/scene.ts
 Changes: TransformationEvent type, TransformationType, extend Shot and PromptSet
 ────────────────────────────────────────
 File: src/lib/services/transformationEventService.ts
 Changes: NEW — frontend API client
 ────────────────────────────────────────
 File: src/components/pipeline/Stage8/VisualStateEditorPanel.tsx
 Changes: Replace "Stage 10" text with transformation events section
 ────────────────────────────────────────
 File: src/components/pipeline/Stage8/TransformationEventCard.tsx
 Changes: NEW — event card component
 ────────────────────────────────────────
 File: src/components/pipeline/Stage8/AddTransformationDialog.tsx
 Changes: NEW — manual creation dialog
 ────────────────────────────────────────
 File: src/components/pipeline/Stage8VisualDefinition.tsx
 Changes: Lock gating for confirmed events
 ────────────────────────────────────────
 File: src/components/pipeline/Stage9PromptSegmentation.tsx
 Changes: Per-shot transformation state badges

 Implementation Order

 Phase 1 (DB)  →  Phase 2 (Service)  →  Phase 3 (Stage 7) ─┐
                                                             ├→  Phase 5 (Stage 9)  →  Phase 6 (Inheritance)
                                     →  Phase 4 (Stage 8) ──┘

 Phases 3 and 4 can proceed in parallel after Phase 2. Phase 5 is the critical path.

 Verification

 1. Unit tests: transformationEventService.test.ts — resolution algorithm with all 3 types, stacking, edge cases (no       
 events = backward compat)
 2. Prompt generation tests: verify buildAssetContext swaps descriptions, video/end-frame prompts include transformation   
 context for within_shot
 3. Inheritance tests: verify next scene inherits post_description from last transformation event
 4. Manual E2E: Create a scene where a character transforms mid-scene → run Stage 7 → confirm events in Stage 8 → generate 
  prompts in Stage 9 → verify pre/post descriptions appear on correct shots
 5. Lint: npm run lint on all modified files
 6. Existing tests: npm test (frontend) + cd backend && npm test (backend)