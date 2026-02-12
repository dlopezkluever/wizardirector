─────────────────────────────────────────────────────────────────────────────────────────────────────── Ready to code?

 Here is Claude's plan:
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌ Plan: WT-7 — Stage 5 Completion (Tasks 3A.5, 3A.7, 3A.8, 3A.9)

 Context

 Stage 5 is the asset management stage where users define visual identities (characters, locations,     
 props) for their film project. Four remaining tasks complete Stage 5's feature set:

 1. 3A.5 — Add "Extra Archetypes" (background character prototypes)
 2. 3A.7 — Auto-extract descriptions from uploaded images via Gemini Vision
 3. 3A.8 — Fix style capsule influence on generation + add manual visual tone alternative
 4. 3A.9 — Allow visual style re-selection after initial lock

 These are sequential: 3A.5 → 3A.7 → 3A.8 → 3A.9.

 ---
 Key Decisions (from discussion)
 Decision: Extras UI placement
 Choice: Separate 4th group in asset grid
 ────────────────────────────────────────
 Decision: Extras & stage gate
 Choice: Optional — don't block Stage 5 lock
 ────────────────────────────────────────
 Decision: Extras aspect ratio
 Choice: 2:3 portrait (512x768), same as characters
 ────────────────────────────────────────
 Decision: Image description trigger
 Choice: Auto after upload, show modal with keep/replace/merge
 ────────────────────────────────────────
 Decision: Image analysis LLM
 Choice: Gemini Vision (already integrated)
 ────────────────────────────────────────
 Decision: Manual tone vs capsule
 Choice: Either/or — user picks one or the other
 ────────────────────────────────────────
 Decision: Tone presets
 Choice: Hardcoded chips; defer "promote to capsule"
 ────────────────────────────────────────
 Decision: Capsule change impact
 Choice: Warn with 2 options: mark outdated (default/prominent) or clear all images
 ────────────────────────────────────────
 Decision: Outdated tracking
 Choice: style_outdated boolean column via migration
 ---
 Task 3A.5 — Extra Archetypes

 User-created background character prototypes (not extracted from script). A "Zorblaxian Alien"
 archetype that spawns consistent background variants in frame/video generation.

 Files to modify

 Migration (create new):
 - backend/migrations/XXX_extra_archetype_and_style_outdated.sql — Add 'extra_archetype' to
 project_assets.asset_type CHECK constraint + add style_outdated BOOLEAN DEFAULT FALSE column (used by  
 3A.9)

 Types:
 - src/types/asset.ts — Add 'extra_archetype' to AssetType union (line 1)

 Backend:
 - backend/src/routes/projectAssets.ts
   - Line ~797: Add 'extra_archetype' to validTypes array in POST create endpoint
   - Line ~1103: Exclude extra_archetype from lock-all image requirement validation (still lock them,   
 just don't require images)
 - backend/src/services/image-generation/ImageGenerationService.ts
   - Line ~54: Add extra_archetype: { width: 512, height: 768 } to ASPECT_RATIOS map

 Frontend:
 - src/components/pipeline/Stage5Assets.tsx
   - Add Users icon import from lucide-react
   - Add extra_archetype to ASPECT_RATIOS constant (line 60)
   - Create gateAssets = activeAssets.filter(a => a.asset_type !== 'extra_archetype') — used for        
 completion checks
   - Add extra_archetypes to groupedAssets object (line 137)
   - Update allActiveHaveImages and canProceed to use gateAssets instead of activeAssets (lines
 143-144)
   - Add getAssetIcon case for extra_archetype → Users icon
   - Add "Add Extra Archetype" button in batch actions area (line ~623) that opens AddAssetModal with   
 pre-selected type
   - Add state: defaultAssetType to pass to AddAssetModal
   - Render 4th asset group section for extra archetypes
   - Update gatekeeper bar progress text to reference gateAssets count + show extras count separately   
 - src/components/pipeline/AddAssetModal.tsx
   - Add defaultType?: AssetType prop
   - Initialize assetType state from defaultType
   - Add <SelectItem value="extra_archetype">Extra Archetype</SelectItem>
   - Conditional dialog description for extra_archetype context
 - src/components/pipeline/AssetFilterModal.tsx
   - Add extra_archetype to TYPE_CONFIG for type-safety (won't appear in extraction results)

 ---
 Task 3A.7 — Extract Description from Uploaded Image

 When a user uploads an image, automatically call Gemini Vision to extract a visual description, then   
 show a modal with keep/replace/merge options.

 Files to modify

 Backend (create new):
 - backend/src/services/imageAnalysisService.ts — New service using @google/generative-ai (same library
  as NanoBananaClient)
   - analyzeAssetImage(imageUrl, existingDescription, assetType, assetName) → { extractedDescription,   
 suggestedMerge, confidence }
   - Use gemini-2.5-flash model for text output from image input
   - Reuse NanoBananaClient's image download pattern (fetch URL → base64 → inline data)
   - Type-specific prompts (character=appearance/clothing, location=architecture/atmosphere,
 prop=material/shape, extra_archetype=archetype traits)

 Backend (modify):
 - backend/src/routes/projectAssets.ts — Add POST /:projectId/assets/:assetId/analyze-image endpoint    
 after upload-image route (line ~1008)
   - Verify project ownership + fetch asset + validate image exists
   - Call ImageAnalysisService.analyzeAssetImage()
   - Return { extractedDescription, suggestedMerge, confidence }

 Frontend (create new):
 - src/components/pipeline/ImageDescriptionModal.tsx — Modal with three sections:
   - Current description (read-only, muted)
   - Extracted from image (read-only, highlighted)
   - Merged preview (editable Textarea, pre-filled with suggestedMerge)
   - Footer buttons: "Keep Current" (outline) | "Replace with Extracted" (secondary) | "Use Merged"     
 (default/primary)
   - Follow existing modal patterns (Dialog from shadcn/ui, same as AddAssetModal)

 Frontend (modify):
 - src/lib/services/projectAssetService.ts — Add analyzeImage(projectId, assetId) method
 - src/components/pipeline/Stage5Assets.tsx
   - Add state: imageAnalysisModal (analysis result + asset context), isAnalyzing (loading state per    
 asset)
   - Modify handleUploadImage (line 256): after successful upload, trigger analysis automatically, show 
  modal on success, gracefully degrade on failure (toast info, don't block upload)
   - Add handleImageDescriptionConfirm handler: updates description via existing
 handleUpdateDescription if action is replace/merge
   - Render ImageDescriptionModal component

 ---
 Task 3A.8 — Style Capsule Investigation + Manual Visual Tone

 Investigation findings

 The pipeline IS correctly wired: Stage5Assets → locks capsule ID → projectAssets.ts → stores on asset  
 → generate-image → ImageGenerationService.getVisualStyleContext() → fetches descriptor_strings,        
 design_pillars, reference_image_urls → NanoBananaClient builds enhanced prompt.

 Likely root causes of perceived ineffectiveness:
 1. Preset capsules may have empty/sparse descriptor_strings or design_pillars → empty style context    
 2. If reference_image_urls are empty, falls back to text-only → weaker influence
 3. NanoBananaClient's text-only prompt append (\n\nStyle: ${context}) may be too subtle

 Fix: Add diagnostic logging to verify data flow + potentially strengthen the prompt template in        
 NanoBananaClient for text-only style contexts.

 Manual Visual Tone — either/or alternative to capsule

 Files to modify

 Frontend:
 - src/components/pipeline/Stage5Assets.tsx — Major changes to style selection section (lines 498-531): 
   - Add state: styleMode ('capsule' | 'manual'), manualTonePreset, manualToneCustom
   - Define VISUAL_TONE_PRESETS array: 3D Animation, Hyperrealistic, Noir, 2D Animation, Watercolor,    
 Comic Book, Retro 80s, Studio Ghibli (with descriptions)
   - Add toggle buttons: "Style Capsule" | "Manual Tone" (disabled when locked)
   - Capsule mode: existing StyleCapsuleSelector (unchanged)
   - Manual mode: preset chips (Button grid) + custom Textarea + "Lock Visual Tone" button
   - handleManualToneLock: builds tone text from preset description + custom text → saves to stage      
 state as { manual_visual_tone, manual_tone_preset, style_locked_at, locked_visual_style_capsule_id:    
 null }
   - Update handleStyleLock (line 146): clear manual tone fields when capsule is selected
   - Update useEffect init (line 107): restore from stage state — check both
 locked_visual_style_capsule_id and manual_visual_tone
   - Update header text from "Select Visual Style Capsule" → "Select Visual Style"

 Backend:
 - backend/src/services/image-generation/ImageGenerationService.ts
   - Add manualVisualTone?: string to CreateImageJobRequest interface (line 13)
   - Relax validation (line 95): allow manualVisualTone as alternative to visualStyleCapsuleId
   - In executeJobInBackground (line 204): if manualVisualTone provided, create VisualStyleContext with 
  { textContext: manualVisualTone, referenceImages: [] } instead of calling getVisualStyleContext()     
 - backend/src/routes/projectAssets.ts
   - generate-image endpoint (line 863): when asset has no visual_style_capsule_id, check stage state   
 for manual_visual_tone and pass to createImageJob
   - POST create endpoint (line 816): same fallback check when auto-assigning style

 Investigation fix (if data quality confirmed as issue):
 - backend/src/services/image-generation/NanoBananaClient.ts — Strengthen text-only prompt template     
 (lines 83-86): more directive style instruction
 - Add console.log in getVisualStyleContext() to log what's actually being fetched from the capsule     

 ---
 Task 3A.9 — Less Restrictive Style Locking

 Allow re-selection of capsule/tone after initial lock (in draft state, before stage lock). Show        
 warning with two options: mark images outdated (default, more prominent) or clear all images.

 Files to modify

 Frontend (create new):
 - src/components/pipeline/StyleChangeWarningDialog.tsx — Warning dialog:
   - Props: open, onOpenChange, currentStyleName, affectedImageCount, onMarkOutdated, onClearImages     
   - "Mark Images as Outdated" button: variant="default" (prominent, the recommended default)
   - "Clear All Images" button: variant="outline" with destructive text (secondary, less prominent)     
   - Cancel button
   - Warning text explaining impact

 Backend:
 - backend/src/routes/projectAssets.ts — Two new endpoints:
   - POST /:projectId/assets/mark-style-outdated — Sets style_outdated = true on all assets with images 
  for the branch. Also updates all assets' visual_style_capsule_id to the new style (so regeneration    
 uses the new style).
   - POST /:projectId/assets/clear-all-images — Sets image_key_url = NULL on all assets for the branch. 
  Returns count.

 Frontend:
 - src/lib/services/projectAssetService.ts — Add markStyleOutdated(projectId) and
 clearAllImages(projectId) methods
 - src/types/asset.ts — Add style_outdated?: boolean to ProjectAsset interface
 - src/components/pipeline/Stage5Assets.tsx
   - Add state: showStyleChangeWarning
   - Add "Change Style" button next to the LOCKED badge (only visible when isStyleLocked &&
 !isStageLockedOrOutdated)
   - handleStyleChangeMarkOutdated: calls markStyleOutdated, unlocks style state, reloads assets →      
 toast info
   - handleStyleChangeClearImages: calls clearAllImages, unlocks style state, updates local asset state 
  → toast info
   - Render StyleChangeWarningDialog
   - In asset cards: show amber "Style Outdated" badge when asset.style_outdated === true
   - When regenerating an outdated asset, the backend should clear style_outdated on success (update    
 the generate-image endpoint)
 - Post-stage-lock flow: No additional work needed — existing LockedStageHeader + UnlockWarningDialog   
 handles unlock → edit → relock. The "Change Style" button appears after stage unlock.

 ---
 Migration File (combined for 3A.5 + 3A.9)

 -- Migration XXX: Add extra_archetype type + style_outdated flag
 -- Features: 3A.5 (Extra Archetypes), 3A.9 (Style Change Tracking)

 -- Add extra_archetype to project_assets type constraint
 ALTER TABLE project_assets DROP CONSTRAINT IF EXISTS project_assets_asset_type_check;
 ALTER TABLE project_assets ADD CONSTRAINT project_assets_asset_type_check
     CHECK (asset_type IN ('character', 'prop', 'location', 'extra_archetype'));

 -- Add extra_archetype to global_assets type constraint
 ALTER TABLE global_assets DROP CONSTRAINT IF EXISTS global_assets_asset_type_check;
 ALTER TABLE global_assets ADD CONSTRAINT global_assets_asset_type_check
     CHECK (asset_type IN ('character', 'prop', 'location', 'extra_archetype'));

 -- Add style_outdated tracking column
 ALTER TABLE project_assets ADD COLUMN IF NOT EXISTS style_outdated BOOLEAN DEFAULT FALSE;

 Note: Per CLAUDE.md, this migration file is created but NOT executed via npm run migrate.

 ---
 Verification Plan

 After each task, run npm run lint from "C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\".

 3A.5 Verification

 - Lint passes with new AssetType union
 - "Add Extra Archetype" button visible in Stage 5
 - Extra archetypes render in their own section
 - Gatekeeper bar ignores extras (doesn't require images)
 - Stage can lock with extras that have no images

 3A.7 Verification

 - Upload an image → analysis modal auto-appears
 - "Keep Current" leaves description unchanged
 - "Replace" swaps in extracted description
 - "Use Merged" applies editable merged text
 - Analysis failure doesn't block the upload

 3A.8 Verification

 - Toggle between "Style Capsule" and "Manual Tone" modes
 - Manual tone presets are selectable chips
 - Custom text field works alongside presets
 - Locking manual tone saves to stage state
 - Image generation works with manual tone (text context injected)
 - Image generation still works with capsule (no regression)
 - Add diagnostic logging to verify capsule data flow

 3A.9 Verification

 - "Change Style" button appears next to LOCKED badge (draft state only)
 - StyleChangeWarningDialog shows correct affected image count
 - "Mark Images as Outdated" keeps images, shows amber badge on cards, unlocks style
 - "Clear All Images" removes all image_key_url values, unlocks style
 - Regenerating an outdated asset clears the style_outdated flag
 - Post-stage-lock: Unlock stage → Change Style → Relock works

 ---
 File Summary
 File: backend/migrations/XXX_extra_archetype_and_style_outdated.sql
 Tasks: 3A.5, 3A.9
 Action: Create
 ────────────────────────────────────────
 File: src/types/asset.ts
 Tasks: 3A.5, 3A.9
 Action: Modify
 ────────────────────────────────────────
 File: backend/src/routes/projectAssets.ts
 Tasks: 3A.5, 3A.7, 3A.8, 3A.9
 Action: Modify
 ────────────────────────────────────────
 File: backend/src/services/image-generation/ImageGenerationService.ts
 Tasks: 3A.5, 3A.8
 Action: Modify
 ────────────────────────────────────────
 File: backend/src/services/imageAnalysisService.ts
 Tasks: 3A.7
 Action: Create
 ────────────────────────────────────────
 File: src/components/pipeline/Stage5Assets.tsx
 Tasks: 3A.5, 3A.7, 3A.8, 3A.9
 Action: Modify
 ────────────────────────────────────────
 File: src/components/pipeline/AddAssetModal.tsx
 Tasks: 3A.5
 Action: Modify
 ────────────────────────────────────────
 File: src/components/pipeline/AssetFilterModal.tsx
 Tasks: 3A.5
 Action: Modify
 ────────────────────────────────────────
 File: src/components/pipeline/ImageDescriptionModal.tsx
 Tasks: 3A.7
 Action: Create
 ────────────────────────────────────────
 File: src/components/pipeline/StyleChangeWarningDialog.tsx
 Tasks: 3A.9
 Action: Create
 ────────────────────────────────────────
 File: src/lib/services/projectAssetService.ts
 Tasks: 3A.7, 3A.9
 Action: Modify
 ────────────────────────────────────────
 File: backend/src/services/image-generation/NanoBananaClient.ts
 Tasks: 3A.8
 Action: Modify (investigation fix)
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌



● I've read the task document and thoroughly explored the codebase. I have a solid understanding of the 
  current architecture. Let me ask some key questions to clarify scope and expectations before planning.  ⎿  Tool use rejected with user message: The user wants to clarify these questions.
         This means they may have additional information, context or questions for you.
         Take their response into account and then reformulate the questions if appropriate.
         Start by asking them what they would like to clarify.

         Questions asked:
     - "For 3A.5 (Extras Archetypes): The current extraction pipeline aggregates `expected_characters`, 
     `expected_location`, `expected_props` from scenes. How should extras feed in? Should the LLM in    
     Stage 4 (scene breakdown) already be identifying extras separately, or should Stage 5's extraction 
     distinguish 'main characters' vs 'extras' from the existing character list based on mention count /      dialogue presence?"
       Answer: Hmm, perhaps the dirrections aren't clear. The Extra Archetypes are basically TO BE      
     INSERTED by the User (thuse "User Decides" makes somewhat sense) in stage 5 or 8, which is to say, 
     these are the type of people/characters in the backgorund (and they can choose to generate or      
     upload an image). Consider the example; the user is making a story about a space adventure, and    
     they have a specially envisioned alien "archetype" whcih will populate the planet the hero travels 
     to; thus, in the background, there maybe needed, in the background, this type of alien. Thus, it   
     would be nice to have this "extra" archetype that, for fraee and video generation, spawns many     
     varaints that still are of the same "race/species/style" as the "archetype" ... please read more   
     about this here: 'c:/Users/Daniel Lopez/Desktop/Aiuteur/wizardirector/._docs/extras.md'
     - "For 3A.5: Should extra archetypes get image generation just like characters/props/locations? And      should they be required (must have images) for Stage 5 completion, or treated more like deferred  
     assets by default?"
       (No answer provided)
     - "For 3A.8 (Manual Tone): The task mentions offering manual visual tone as an alternative to      
     capsule selection. How should these two options coexist? Currently, a visual style capsule is      
     mandatory and locked before extraction."
       (No answer provided)
     - "For 3A.9 (Less Restrictive Locking): Currently the visual style capsule is locked before asset  
     extraction, and changing it would affect all generated images. When the user changes the capsule   
     after images exist, what should happen to existing generated asset images?"
       (No answer provided)



● Let me read that extras document first.

● Read 1 file (ctrl+o to expand)

● Thanks for the clarification and the extras doc. That changes the picture significantly - extras are  
  user-authored creative additions, not reclassified extracted characters. Let me reformulate with this 
  understanding and ask the remaining questions.

● User answered Claude's questions:
  ⎿  · For 3A.5 (Extras Archetypes): Since these are user-created (not extracted), should they
     appear as a separate 4th group/section in the Stage 5 asset grid (alongside Characters, Props,     
     Locations) with their own 'Add Extra Archetype' button? Or integrated into the existing
     character section with a subtype toggle? → Separate 4th group (Recommended)

     · For 3A.5: Should extras be required for Stage 5 completion (must have image to lock), or
     optional (can exist without image and don't block locking)? → Optional, don't block lock
     · For 3A.8 (Manual Tone): Should the manual visual tone be an alternative to selecting a style     
     capsule (either/or), or a supplement that adds to the capsule? Currently a capsule is mandatory    
      before extraction. → Either/or (Recommended)

     · For 3A.9 (Capsule Re-selection): When a user changes their visual style capsule after already    
      generating asset images, what should happen to the existing images? → Warn + in the warning       
     have a button that, if the user chooses, can clear all the generated images, IF THEY SO DESIRE     
     + mark outdated if they choose not to clear (which should be the default option, like the UI       
     should make the button default (or more prominent to select is just to mark outdated NOT clear     
     all)

● Good, those answers are very clear. Let me ask a few more targeted questions about the remaining      
  sub-tasks.

● User answered Claude's questions:
  ⎿  · For 3A.7 (Extract Description from Uploaded Image): Which LLM should handle image analysis?      
     The backend already uses Gemini for text tasks. Should we use Gemini's vision capabilities, or     
     a different provider? → Gemini Vision (Recommended)

     · For 3A.7: When should the description extraction trigger? Automatically when an image is         
     uploaded, or only when the user explicitly requests it? → Auto with prompt
     · For 3A.8 (Manual Tone presets): The presets mentioned are '3D animation, hyperrealistic,
     noir, 2D animation'. Should these be hardcoded options in a dropdown/chips UI, or fetched from     
     the database? And should the 'promote to capsule' feature be in scope for this task or
     deferred? → Hardcoded + promote later

     · For 3A.5 (Extras): What aspect ratio should be used for extra archetype images? Characters       
     use 2:3 portrait. Since extras represent a 'type' rather than an individual, should they use       
     the same portrait format or something different? → Same as characters (2:3)

● Excellent. I have all the key decisions. Let me now do focused exploration on the implementation      
  details before writing the plan.

● 2 Explore agents finished (ctrl+o to expand)
   ├─ Explore manual asset creation flow · 9 tool uses · 77.7k tokens   
   │  ⎿  Done
   └─ Explore image analysis and LLM setup · 23 tool uses · 80.7k tokens
      ⎿  Done

● Now I have comprehensive understanding of the codebase and all the key decisions. Let me design the   
  implementation plan.

● Plan(Design implementation plan)
  ⎿  Done (35 tool uses · 136.6k tokens · 4m 56s)
  ⎿  Interrupted · What should Claude do instead?

❯ continue sorry 

● No problem. The Plan agent returned a comprehensive plan. Let me verify a few critical assumptions by 
  reading key files, then write the final plan.

● Read 1 file (ctrl+o to expand)

● Good, I've verified the key patterns. Let me check the upload handler and a couple more critical      
  sections.

● Read 1 file (ctrl+o to expand)

● Now let me check the backend generate-image route and NanoBanana client for the manual tone
  integration.

● Read 2 files (ctrl+o to expand)

● Let me check the CreateImageJobRequest interface and the NanoBanana client's image download method for   the image analysis service.

● Read 2 files (ctrl+o to expand)

● I have a thorough understanding of all the code. I have one final clarification before writing the    
  plan.

● User answered Claude's questions:
  ⎿  · For 3A.9's 'mark images as outdated' feature: The `project_assets` table currently has NO        
     `metadata` JSONB column in the DB (it's only in the TypeScript interface). To track which 
     images are style-outdated, I have two approaches - which do you prefer? → Add DB column in         
     migration (Recommended)


     Implementation Summary

  Task 3A.5 — Extra Archetypes

  - Migration: backend/migrations/024_extra_archetype_and_style_outdated.sql — Adds extra_archetype to 
  CHECK constraints + style_outdated column
  - Types: src/types/asset.ts — Added 'extra_archetype' to AssetType union + style_outdated?: boolean  
  to ProjectAsset
  - Backend: Added 'extra_archetype' to validTypes in POST create; lock-all now uses gateAssets        
  (excludes extras from image requirement); ImageGenerationService has extra_archetype: { width: 512,  
  height: 768 } aspect ratio
  - Frontend: Stage5Assets — Users icon, separate group for extras, gateAssets filtering for completion   checks, "Add Extra Archetype" button, extras count in progress bar. AddAssetModal — defaultType prop   + extra_archetype option. AssetFilterModal — extra_archetype in TYPE_CONFIG

  Task 3A.7 — Image Description Extraction

  - Backend: New imageAnalysisService.ts using gemini-2.5-flash with type-specific prompts; new POST   
  /:projectId/assets/:assetId/analyze-image endpoint
  - Frontend: New ImageDescriptionModal.tsx with keep/replace/merge options;
  projectAssetService.analyzeImage() method; auto-triggers after upload in handleUploadImage with      
  graceful degradation on failure

  Task 3A.8 — Style Capsule Fix + Manual Visual Tone

  - Backend: Strengthened text-only prompt in NanoBananaClient (more directive style instruction);
  added manualVisualTone to CreateImageJobRequest; relaxed validation to accept either capsule or      
  manual tone; generate-image endpoint checks stage state for manual_visual_tone as fallback
  - Frontend: Style mode toggle (capsule vs manual), 8 preset tone chips with descriptions, custom tone   textarea, handleManualToneLock saves to stage state, section header changed to "Select Visual Style"
  Task 3A.9 — Less Restrictive Style Locking

  - Backend: POST /mark-style-outdated and POST /clear-all-images endpoints; style_outdated cleared on 
  successful image regeneration in ImageGenerationService
  - Frontend: New StyleChangeWarningDialog.tsx with "Mark Images as Outdated" (primary) and "Clear All 
  Images" (outline/destructive) options; "Change Style" button next to LOCKED badge (draft state only);   amber "Style Outdated" badge on asset cards; projectAssetService.markStyleOutdated() and
  clearAllImages() methods

  Files Created (4)
  ┌───────────────────────────────────────────────────────────────┬──────────────────────────┐
  │                             File                              │         Purpose          │
  ├───────────────────────────────────────────────────────────────┼──────────────────────────┤
  │ backend/migrations/024_extra_archetype_and_style_outdated.sql │ DB migration             │
  ├───────────────────────────────────────────────────────────────┼──────────────────────────┤
  │ backend/src/services/imageAnalysisService.ts                  │ Gemini Vision analysis   │
  ├───────────────────────────────────────────────────────────────┼──────────────────────────┤
  │ src/components/pipeline/ImageDescriptionModal.tsx             │ Keep/replace/merge modal │
  ├───────────────────────────────────────────────────────────────┼──────────────────────────┤
  │ src/components/pipeline/StyleChangeWarningDialog.tsx          │ Style change warning     │
  └───────────────────────────────────────────────────────────────┴──────────────────────────┘
  Files Modified (8)
  File: src/types/asset.ts
  Changes: extra_archetype type, style_outdated field
  ────────────────────────────────────────
  File: backend/src/routes/projectAssets.ts
  Changes: 3 new endpoints, extra_archetype validation, manual tone support
  ────────────────────────────────────────
  File: backend/src/services/image-generation/ImageGenerationService.ts
  Changes: Manual tone, extra_archetype aspect ratio, clear style_outdated
  ────────────────────────────────────────
  File: backend/src/services/image-generation/NanoBananaClient.ts
  Changes: Strengthened text-only prompt
  ────────────────────────────────────────
  File: src/components/pipeline/Stage5Assets.tsx
  Changes: All 4 features integrated
  ────────────────────────────────────────
  File: src/components/pipeline/AddAssetModal.tsx
  Changes: defaultType prop, extra_archetype option
  ────────────────────────────────────────
  File: src/components/pipeline/AssetFilterModal.tsx
  Changes: extra_archetype in TYPE_CONFIG
  ────────────────────────────────────────
  File: src/lib/services/projectAssetService.ts
  Changes: analyzeImage, markStyleOutdated, clearAllImages methods

✻ Crunched for 11m 18s







  Question 1: Extras Classification — Where Should It Happen?

  What this question is really asking: At what point in the pipeline does a character get labeled as   
  "just an extra" vs "a real character"? There are three architectural layers where this could happen. 

  Option 1 — Stage 5 classifies means the extraction service in Stage 5 (assetExtractionService.ts)    
  would look at the aggregated expected_characters arrays from all scenes, count how many scenes each  
  character appears in, check if they have any dialogue lines, and auto-classify
  low-mention/no-dialogue ones as extra_archetype. No changes to Stage 4.

  Option 2 — Stage 4 identifies means modifying the Stage 4 scene breakdown LLM prompt to produce two  
  separate arrays — something like expected_characters and expected_extras — so by the time Stage 5's  
  aggregation runs, extras are already pre-tagged.

  Option 3 — User decides means surfacing this as a manual step in the Asset Filter Modal (the modal   
  that opens after "Scan Script for Assets"), letting the user drag/reclassify any character into the  
  extras bucket.

  My recommendation: Option 1 (Stage 5 classifies), supplemented by a light version of Option 3.       

  Here's why:

  - Stage 4 is the wrong layer. Stage 4 processes scenes individually. A character might seem like an  
  extra in Scene 2 (silent, background) but be a speaking character in Scene 7. The "extra or not"     
  question is fundamentally a cross-scene aggregation question, which is Stage 5's domain. Stage 4     
  literally cannot answer "is this character an extra globally?" because it only sees one scene at a   
  time.
  - Stage 5 already does aggregation. The aggregateSceneDependencies method already builds a mentions  
  array per character across all scenes. Adding a heuristic like "appears in ≤ 1 scene AND has 0       
  dialogue lines → suggest as extra_archetype" is natural and cheap — no LLM call needed, just data    
  analysis on what's already collected.
  - But the heuristic won't be perfect. A named character who only appears once might still be
  important (e.g., "The Oracle" who appears in one scene but is narratively critical). So you want the 
  user to be able to override the auto-classification in the Asset Filter Modal. This isn't a full     
  "Option 3" — it's just adding a toggle or reclassify action to entities that are already shown in    
  that modal.
  - No Stage 4 changes = less risk. Stage 4's LLM prompts and scene parsing are already stable.        
  Modifying them to produce a new output field means revalidating all existing projects, potentially   
  re-running extractions, and handling migration for scenes that were already processed. Not worth it  
  for this feature.

  ---
  Question 2: Extras Image Generation — Required or Optional?

  What this question is really asking: Extras are, by definition, less important than main characters. 
  How much investment do they deserve in Stage 5, and should they block progress?

  Option 1 — Full generation, required means extras are treated like any other asset: they need an     
  image before you can lock Stage 5.

  Option 2 — Full generation, optional means extras can get images but don't need them to proceed.     

  Option 3 — No generation means extras are purely textual context — descriptions that get injected    
  into scene generation prompts but never become visual assets themselves.

  My recommendation: Option 2 (Full generation, optional).

  Here's why:

  - No generation is too limiting. The whole point of extras archetypes is to establish what background   characters look like for visual consistency. A text description of "Impoverished Plebeian" is       
  useful, but an actual reference image makes a massive difference for frame generation in Stage 10. If   the AI can see what your extras should look like, the output will be far more consistent.
  - Required is too restrictive. The entire motivation for extras being a separate type is that they're   less important than main assets. If you force the user to generate images for every "Townsperson    
  Type A" before they can proceed to production, you've defeated the purpose. Users will either waste  
  credits on low-value generations or get stuck at the gate.
  - Optional is the sweet spot. It lets diligent users who care about visual consistency generate      
  reference images for their extras. It lets users on a budget skip them and rely on text descriptions.   And it maps naturally onto the existing deferred flag — extras could default to deferred: true,     
  which means they're excluded from the gatekeeper's "all active assets have images" check but remain  
  available for generation whenever the user wants.
  - Aspect ratio: When extras are generated, use the character portrait ratio (2:3). They're still     
  people/figures, even if they're archetypes rather than individuals.

  ---
  Question 3: Manual Tone vs. Style Capsule — How Do They Coexist?

  What this question is really asking: Style capsules are a curated, structured system (design pillars,   descriptor strings, reference images). Manual tone is a freeform alternative. Should they be        
  mutually exclusive, complementary, or hierarchical?

  Option 1 — Either/or means the user picks one path: capsule OR manual tone. Both produce the same    
  downstream data shape (visual context for image generation).

  Option 2 — Supplements means the capsule is still required, but there's an additional "tone notes"   
  field that gets appended to the capsule's context.

  Option 3 — Fallback means manual tone only appears if you explicitly choose "no capsule."

  My recommendation: Option 1 (Either/or), with one nuance.

  Here's why:

  - Supplements creates confusion. If a user selects a "Film Noir" capsule and then writes manual tone 
  notes saying "bright, colorful, whimsical," what happens? The image generation would get
  contradictory signals. You'd need conflict resolution logic, or you'd get inconsistent outputs and   
  the user wouldn't understand why. Mixing two visual identity sources is a recipe for incoherent      
  results.
  - Fallback is artificially restrictive. It makes manual tone feel like a second-class citizen — "you 
  only get this if you don't have a real capsule." Some users might have a very clear visual vision    
  that doesn't match any capsule, and they shouldn't feel like they're using the "backup" option.      
  - Either/or is clean and honest. Present it as two parallel paths to the same destination: "Choose   
  how you want to define your visual identity." Path A: pick a curated capsule. Path B: define it      
  yourself. Both produce the same visualStyleContext that gets injected into image generation.
  - The nuance: The task mentions "custom description could be promoted as a starting point for a      
  Visual Style Capsule." This is smart. If a user defines a manual tone and likes the results, offer a 
  "Save as Custom Capsule" action that packages their description into a reusable capsule. This way,   
  either/or isn't a dead end — manual tone can graduate into a capsule.
  - Implementation is also cleaner. The ImageGenerationService.getVisualStyleContext() method currently   takes a capsuleId and returns { textContext, referenceImages }. For manual tone, you'd produce the  
  same shape from the user's text input (with referenceImages being empty or user-uploaded). One       
  interface, two producers.

  ---
  Question 4: Capsule Change After Images Exist — What Happens?

  What this question is really asking: When you relax locking (3A.9), you're letting users change a    
  decision that was previously permanent. The capsule influenced every generated image. Changing it
  creates a visual inconsistency problem. How aggressively do you handle that?

  Option 1 — Warn + mark outdated keeps existing images but tags them as "outdated." User regenerates  
  at their pace.

  Option 2 — Warn + clear images nukes all generated images, forcing a clean slate.

  Option 3 — Warn only keeps everything as-is, trusts the user to figure it out.

  My recommendation: Option 1 (Warn + mark outdated).

  Here's why:

  - Clearing images is too destructive. A user might have spent significant credits generating images  
  for 15+ assets. If they change the capsule because they want to try a different style, they've just  
  lost all that work with no way back. Even with a confirmation dialog, this is a "whoops, I didn't    
  mean to click that" disaster waiting to happen. And what if they change the capsule, don't like the  
  new results, and want to go back? All the old images are gone.
  - Warn-only is too passive. If you keep everything as-is with just a warning, the user gets no signal   about which images were generated under the old style vs. which ones match the new style. As they   
  regenerate some assets and not others, they'll end up with a mixed bag and no visibility into what's 
  consistent and what isn't.
  - Mark outdated is the goldilocks approach. It preserves all existing work (no credit waste), gives  
  clear visual feedback about what's stale (e.g., a subtle "outdated" badge on the image, or a yellow  
  border), and lets the user prioritize which assets to regenerate first. This also aligns with how the   project already handles invalidation — upstream changes mark downstream stages as 'outdated', not   
  'deleted'. You're extending a pattern that already exists in the codebase.
  - Bonus: The project_assets table already has an overridden_fields array and metadata fields. You    
  could track generated_with_capsule_id in metadata, and when the current capsule doesn't match, show  
  the outdated indicator. Low implementation cost.

  ---
  Summary of Recommendations
  ┌───────────────────┬──────────────────────────────────┬────────────────────────────────────────────┐  │     Question      │          Recommendation          │                 Key Reason                 │  ├───────────────────┼──────────────────────────────────┼────────────────────────────────────────────┤  │ Extras            │ Stage 5 classifies (+ user       │ Classification is a cross-scene question;  │  │ classification    │ override in filter modal)        │ Stage 4 only sees one scene                │  ├───────────────────┼──────────────────────────────────┼────────────────────────────────────────────┤  │ Extras images     │ Full generation, optional        │ Reference images matter for consistency,   │  │                   │                                  │ but shouldn't block progress               │  ├───────────────────┼──────────────────────────────────┼────────────────────────────────────────────┤  │ Manual tone       │ Either/or with capsule           │ Mixing sources creates contradictions;     │  │                   │                                  │ both paths produce same interface          │  ├───────────────────┼──────────────────────────────────┼────────────────────────────────────────────┤  │ Capsule change    │ Warn + mark outdated             │ Preserves work, gives visibility, matches  │  │                   │                                  │ existing invalidation patterns             │  └───────────────────┴──────────────────────────────────┴────────────────────────────────────────────┘
✻ Sautéed for 3m 7s

❯ for the extras, let me make more sense:  Hmm, perhaps the dirrections aren't clear. The Extra        
  Archetypes are basically                                                                             
       TO BE INSERTED by the User (thuse "User Decides" makes somewhat sense) in stage                 
       5 or 8, which is to say, these are the type of people/characters in the                         
       backgorund (and they can choose to generate or upload an image). Consider the                   
       example; the user is making a story about a space adventure, and they have a                    
       specially envisioned alien "archetype" whcih will populate the planet the hero                  
       travels to; thus, in the background, there maybe needed, in the background,                     
       this type of alien. Thus, it would be nice to have this "extra" archetype that,                 
       for fraee and video generation, spawns many varaints that still are of the                      
       same "race/species/style" as the "archetype"                                                    
  ⎿  Interrupted · What should Claude do instead?

❯ for the extras, let me make explain more:  Hmm, perhaps the dirrections aren't clear. The Extra      
  Archetypes are basically                                                                             
       TO BE INSERTED by the User (thuse "User Decides" makes somewhat sense) in stage                 
       5 or 8, which is to say, these are the type of people/characters in the                         
       backgorund (and they can choose to generate or upload an image). Consider the                   
       example; the user is making a story about a space adventure, and they have a                    
       specially envisioned alien "archetype" whcih will populate the planet the hero                  
       travels to; thus, in the background, there maybe needed, in the background,                     
       this type of alien. Thus, it would be nice to have this "extra" archetype that,                 
       for fraee and video generation, spawns many varaints that still are of the                      
       same "race/species/style" as the "archetype"  ; does this help clear things up>                 

● Yes, that completely changes the picture. So extras archetypes are not about reclassifying characters   the LLM found in the script — they're a user-authored creative addition to the world. The user is   
  saying "my world has this type of background figure" and providing a visual prototype that
  frame/video generation can use to populate scenes with consistent-looking variants.

  Given that clarification:

  None of the three original options quite fit, but here's what I'd recommend:

  Option 3 (User decides) is the closest, but reframed — it's not "reclassify an existing character as 
  an extra." It's "add a new extra archetype entry" — a dedicated action in Stage 5 (and optionally    
  Stage 8 at the scene level) where the user creates an archetype from scratch:

  - They name it ("Zorblaxian Alien", "Medieval Peasant")
  - They write a description of the archetype's visual traits
  - They optionally generate or upload a reference image
  - That archetype then becomes available as scene-level context for frame/video generation

  Why this makes sense:

  - Stage 4 and Stage 5 extraction are irrelevant here. These archetypes don't come from the script —  
  they come from the user's creative vision. The extraction pipeline (aggregateSceneDependencies)      
  wouldn't find "Zorblaxian Alien" in the dialogue because it was never mentioned by name. It's        
  world-building, not text analysis.
  - Stage 5 is the right home for creation. Stage 5 is where you define the visual identity of the     
  project. Main characters, locations, props — and now, the types of background figures that populate  
  your world. It fits naturally alongside the existing asset grid as a fourth group.
  - Stage 8 is the right home for assignment. When the user is doing scene-level asset work in Stage 8,   they should be able to say "this scene takes place on the alien planet, so include the Zorblaxian   
  Alien archetype in the background." That's scene-level dependency, not global creation.
  - The "spawn variants" concept is the key differentiator. A regular character asset says "this is    
  exactly what Alice looks like — always." An extra archetype says "this is the template — generate    
  background figures that are recognizably of this type but with natural variation." That distinction  
  is what makes it a genuinely different asset type, not just a low-priority character.

  For the image generation question (Q2): Given this understanding, I'd still say optional but
  valuable. The reference image is the whole point — it's the prototype that frame generation uses to  
  spawn variants. But the user should be able to create a text-only archetype and add the image later, 
  rather than being blocked on it for Stage 5 completion. Some users might not even assign extras to   
  scenes until Stage 8.

  So in summary: this is a user-created asset type with its own "Add Extra Archetype" button in Stage  
  5, not a classification of extracted characters. Does that match what you're envisioning?

❯  great, now, we got more questions, please investigate and report back in similar fashion to         
  before: For 3A.7 (Extract Description from Uploaded Image): Which LLM should handle image            
  analysis? The backend                                                                                
  already uses Gemini for text tasks. Should we use Gemini's vision capabilities, or a different       
  provider?                                                                                            
                                                                                                       
  ❯ 1. Gemini Vision (Recommended)                                                                     
       Use Gemini's multimodal capabilities since it's already integrated in the backend. It can       
  analyze                                                                                              
       images and produce descriptions.                                                                
    2. OpenAI Vision                                                                                   
       Use GPT-4V/GPT-4o for image analysis, which would require adding a new provider                 
  integration.                                                                                         
    3. Let me specify                                                                                  
       I have a specific provider in mind that I'll describe.                                          
    4. Type something.  .... For 3A.7: When should the description extraction trigger?                 
  Automatically when an image is uploaded, or                                                          
  only when the user explicitly requests it?                                                           
                                                                                                       
  ❯ 1. On-demand button                                                                                
       After uploading, show an 'Extract Description' button. User clicks it to trigger analysis       
  and sees                                                                                             
       keep/replace/merge options.                                                                     
    2. Auto with prompt
       Automatically trigger after upload, then show a modal/dialog with the extracted description     
   and                                                                                                 
       keep/replace/merge options.                                                                     
    3. Auto silent + merge                                                                             
       Automatically extract and merge in the background, notify user of the change with an undo       
  option.                                                                                              
    4. Type something. ..... For 3A.8 (Manual Tone presets): The presets mentioned are '3D             
  animation, hyperrealistic, noir, 2D                                                                  
  animation'. Should these be hardcoded options in a dropdown/chips UI, or fetched from the            
  database? And                                                                                        
  should the 'promote to capsule' feature be in scope for this task or deferred?                       
                                                                                                       
  ❯ 1. Hardcoded + promote later                                                                       
       Hardcode preset chips (3D animation, hyperrealistic, noir, etc.) with a custom text field.      
  Defer                                                                                                
       capsule promotion to a future task.                                                             
    2. Hardcoded + promote now                                                                         
       Hardcode presets AND implement the pathway to promote a custom manual tone into a new           
  Visual Style                                                                                         
       Capsule.                                                                                        
    3. DB-driven presets                                                                               
       Store presets in the database so they can be managed/extended without code changes. More        
  work but                                                                                             
       more flexible.                                                                                  
    4. Type something.                                                                                 
  ───────────────────────────────.... For 3A.5 (Extras): What aspect ratio should be used for          
  extra archetype images? Characters use 2:3                                                           
  portrait. Since extras represent a 'type' rather than an individual, should they use the same        
  portrait                                                                                             
  format or something different?                                                                       
                                                                                                       
  ❯ 1. Same as characters (2:3)                                                                        
       Use 512x768 portrait format, consistent with how characters are generated. Makes sense          
  since extras      are still 'people'.                                                                
    2. Square (1:1)                                                                                    
       Use 512x512 square format like props. Differentiates extras visually and may work better as     
                                                                                                       
       'archetype reference cards'.                                                                    
    3. Wide (16:9)                                                                                     
       Use 1024x576 cinematic format. Could show the archetype in a scene-like context with            
  multiple                                                                                             
       variant examples.                                                                               
    4. Type something.                                                                                 

● Let me quickly check what LLM providers are already integrated in the backend to ground my
  recommendations.

● Searched for 2 patterns, read 1 file (ctrl+o to expand)

● Good. Now I have the full picture — the backend uses @langchain/google-genai (Gemini) via LangChain, 
  with no OpenAI integration. Let me walk through all four questions.

  ---
  Question 1: Which LLM for Image Analysis?

  What this question is asking: 3A.7 needs to look at an uploaded image and produce a text description.   This requires multimodal (vision) capabilities. Which provider?

  My recommendation: Option 1 — Gemini Vision.

  - Already integrated. Your LLMClient uses ChatGoogleGenerativeAI from LangChain. Gemini models       
  (Flash, Pro) are natively multimodal — you can pass an image alongside text in a HumanMessage using  
  LangChain's content parts format. There's no new provider to add, no new API key, no new dependency. 
  - Implementation is minimal. The change to LLMClient would be something like allowing a HumanMessage 
  with [{ type: "image_url", image_url: { url: "data:..." } }, { type: "text", text: "Describe this..."   }] instead of just a string. LangChain's Google GenAI adapter already supports this — it's just a   
  matter of the message format.
  - OpenAI would be net-new infrastructure. You'd need to add @langchain/openai or the OpenAI SDK, a   
  new API key (OPENAI_API_KEY), token cost tracking for a different pricing model, and a decision about   which model to use. That's a lot of plumbing for a feature that Gemini already handles natively.    
  - Quality is fine. Gemini Flash and Pro are both strong at image description. For this use case —    
  "describe what this character/location/prop looks like in visual terms" — you don't need the absolute   best vision model. You need "good enough" with low latency and minimal cost, which is exactly Gemini   Flash's sweet spot.

  ---
  Question 2: When Should Description Extraction Trigger?

  What this question is asking: After the user uploads an image for an asset, when does the system     
  analyze it to extract/merge a description?

  Option 1 — On-demand button means the user uploads, sees the image, then clicks "Extract Description"   if they want.

  Option 2 — Auto with prompt means upload triggers analysis immediately, then shows a modal with      
  keep/replace/merge choices.

  Option 3 — Auto silent means it happens in the background and the description just updates (with     
  undo).

  My recommendation: Option 2 — Auto with prompt.

  - On-demand adds a step most users will always take. If someone uploads an image for an asset, they  
  almost certainly want the description to reflect what's in the image. Making them click an extra     
  button every time is friction for the common case. The button exists "just in case" but would be     
  clicked 90%+ of the time — that's a sign it should be automatic.
  - Auto silent is too aggressive. Silently modifying a description the user may have carefully edited 
  is dangerous. What if they uploaded a reference image but want to keep their script-based
  description? The merge might introduce details that contradict the narrative. Users need to see what 
  the AI extracted and make a conscious choice.
  - Auto with prompt is the right balance. Upload triggers analysis (no wasted click), and immediately 
  presents a clear modal: "Here's what we found in the image. Here's your current description. What    
  would you like to do?" with keep/replace/merge options and a preview of each. The user makes an      
  informed decision, but without an unnecessary intermediate step.
  - UX precedent: This matches how tools like Figma handle image imports with auto-detection — process 
  automatically, present options immediately, let the user confirm. It feels responsive and smart      
  without being presumptuous.

  ---
  Question 3: Manual Tone Presets — Hardcoded or DB? Promote Now or Later?

  What this question is asking: The manual tone path (from our earlier either/or decision) needs some  
  preset options. How sophisticated should this be?

  Option 1 — Hardcoded presets + defer promotion means chips in the UI for common styles, plus a custom   text field. No capsule creation yet.

  Option 2 — Hardcoded + promote now means the above plus a "Save as Capsule" workflow.

  Option 3 — DB-driven means presets come from the database, manageable without code changes.

  My recommendation: Option 1 — Hardcoded + promote later.

  - Scope control. 3A.8's primary purpose is twofold: (1) fix why capsules aren't influencing 
  generation, and (2) add the manual tone alternative. The capsule investigation alone could be a      
  rabbit hole. Adding "promote to capsule" on top of that is feature creep on an already
  medium-complexity task. The manual tone → image generation pipeline is the critical path; promotion  
  is a nice-to-have.
  - Hardcoded is fine for now. These presets (3D animation, hyperrealistic, noir, 2D animation, etc.)  
  are fundamental visual style categories that change on a timescale of years, not weeks. They're not  
  user-generated content. They're not project-specific. There's no admin panel. Putting them in the DB 
  adds a migration, a fetch endpoint, a loading state, and management complexity for data that will    
  change maybe once a quarter via a code PR anyway.
  - The custom text field is the real feature. The presets are just quick-start convenience. The meat  
  of manual tone is the freeform description where the user writes "gritty 1970s street photography    
  with desaturated colors and grain." Presets can pre-populate that field, but the field itself is what   matters.
  - Promotion can be a clean follow-up. When you do implement it later, it'll be cleaner because: (a)  
  you'll have real user data about what manual tones people write, (b) the capsule system will already 
  be fixed (the investigation part of 3A.8), and (c) it can be scoped as its own small task with clear 
  boundaries.

  ---
  Question 4: Extra Archetype Aspect Ratio

  What this question is asking: Given that extras are "types of background figures" rather than        
  individuals, which image format best represents them?

  Option 1 — 2:3 portrait (same as characters), Option 2 — 1:1 square, Option 3 — 16:9 wide.

  My recommendation: Option 1 — Same as characters (2:3 portrait).

  - Extras are still people/figures. Whether it's "Zorblaxian Alien" or "Medieval Peasant," you're
  depicting a humanoid figure. Portrait format is the natural orientation for showing body proportions,   clothing, facial features, posture — all the visual traits that define the archetype. This is what  
  concept art sheets use for character types.
  - Square (1:1) wastes vertical space. For a figure, square format either crops the legs or leaves    
  empty space on the sides. Props are square because they're objects that could be any shape. People   
  are taller than they are wide.
  - Wide (16:9) sounds appealing but is a trap. The idea of "showing the archetype in context with     
  variants" sounds nice in theory, but in practice you'd be asking the image generation model to create   a coherent group shot with consistent design — that's a much harder generation task, and the results   would be less useful as a reference card. When frame generation in Stage 10 needs to know "what does   a Zorblaxian look like," a clean portrait of one is more usable than a wide scene of several.       
  - Consistency in the UI. Extras will appear alongside characters in the asset grid. If characters are   2:3 and extras are 1:1, the grid gets visually messy with mixed card sizes. Same format means the   
  extra archetype cards sit naturally alongside character cards, differentiated only by their type     
  badge.

  ---
  Summary
  ┌───────────────────┬────────────────────────────────┬──────────────────────────────────────────────┐  │     Question      │         Recommendation         │                  Key Reason                  │  ├───────────────────┼────────────────────────────────┼──────────────────────────────────────────────┤  │ Image analysis    │ Gemini Vision                  │ Already integrated; just change the message  │  │ LLM               │                                │ format                                       │  ├───────────────────┼────────────────────────────────┼──────────────────────────────────────────────┤  │ Extraction        │ Auto with prompt               │ Removes unnecessary click, but user still    │  │ trigger           │                                │ confirms                                     │  ├───────────────────┼────────────────────────────────┼──────────────────────────────────────────────┤  │ Manual tone       │ Hardcoded + promote later      │ Scope control — the investigation is the     │  │ presets           │                                │ hard part                                    │  ├───────────────────┼────────────────────────────────┼──────────────────────────────────────────────┤  │ Extra aspect      │ 2:3 portrait (same as          │ They're still figures; consistent UI grid    │  │ ratio             │ characters)                    │                                              │  └───────────────────┴────────────────────────────────┴──────────────────────────────────────────────┘
✻ Sautéed for 1m 8s

❯ i like auto with prompt but i fear is gemini vision expensive or not bad? 

● Let me check the current pricing.

● Web Search("Google Gemini API vision image input pricing per token 2026")
  ⎿  Did 1 search in 6s

● It's cheap — really not a concern here.

  Your current model is gemini-2.5-flash-lite (per your llm-client.ts). Here's the math for a single   
  image description extraction:

  - One image ≈ 1,290 tokens (at typical upload resolution)
  - Text prompt + system prompt ≈ ~500 tokens
  - Output ≈ ~300 tokens (a 3-5 sentence visual description)

  At Gemini Flash-level pricing (~$0.10–$0.50 per 1M input tokens):
  - ~1,800 input tokens = $0.0002 to $0.0009 (fractions of a penny)
  - Output cost is similarly negligible

  So each "extract description from uploaded image" call would cost well under a tenth of a cent. Even 
  if a user uploaded images for 20 assets in a project, you'd be looking at maybe 1-2 cents total.     

  For comparison, the LLM visual distillation calls you're already making in Pass 2 (text-only)        
  probably cost a similar amount per asset. Adding an image to the input barely moves the needle.      

  Bottom line: Auto with prompt is fine cost-wise. A single image generation call (via your image      
  provider) costs orders of magnitude more than the vision analysis to describe it. This is the cheap  
  part of the pipeline.

  Sources:
  - https://ai.google.dev/gemini-api/docs/pricing
  - https://cloud.google.com/vertex-ai/generative-ai/pricing