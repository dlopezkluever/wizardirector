  Phase 2 Parallel Work Analysis

  File Footprint Per Task
  ┌───────────────────────────────┬────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┬────────────────────────────────────────────────────┐        
  │             Task              │                                                                     Primary Files Touched                                                                      │                  Shared Hotspots                   │        
  ├───────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────┤        
  │ 2A.1 Stage 8 asset influence  │ ImageGenerationService.ts, sceneAssets.ts (routes), promptGenerationService.ts, Stage8VisualDefinition.tsx, VisualStateEditorPanel.tsx, styleCapsuleService.ts │ None — fully isolated                              │        
  ├───────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────┤        
  │ 2A.3 Beat sheet bug           │ Stage3BeatSheet.tsx, beatService.ts, llm.ts (different endpoint)                                                                                               │ None — fully isolated                              │        
  ├───────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────┤        
  │ 2A.4 Stage 4 auto-gen         │ Stage4MasterScript.tsx, scriptService.ts, useStageState.ts                                                                                                     │ Shares Stage4MasterScript.tsx with 2A.5            │        
  ├───────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────┤        
  │ 2A.5 Stage 4 script UI        │ Stage4MasterScript.tsx, ScreenplayToolbar.tsx, screenplay.css, tiptap-extensions/*, screenplay-converter.ts                                                    │ Shares Stage4MasterScript.tsx with 2A.4            │        
  ├───────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────┤        
  │ 2A.6 Skip option              │ Stage1InputMode.tsx, ProjectView.tsx, inputProcessingService.ts, stageStates.ts                                                                                │ Shares ProjectView.tsx with 2A.7, 2B.2, 2B.4       │        
  ├───────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────┤        
  │ 2A.7 Stage 5 lock button      │ Stage5Assets.tsx, ProjectView.tsx, stageStateService.ts                                                                                                        │ Shares ProjectView.tsx with 2A.6, 2B.2, 2B.4       │        
  ├───────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────┤        
  │ 2A.8 Pipeline colors          │ PhaseTimeline.tsx, index.css, projects.ts (status calc)                                                                                                        │ None — fully isolated                              │        
  ├───────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────┤        
  │ 2A.9 Regeneration boxes       │ Stage2Treatment.tsx, AssetVersionSync.tsx, various stage components                                                                                            │ Weak overlap — different sections of shared stages │        
  ├───────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────┤        
  │ 2B.1 Universal lock button    │ Multiple stage components, stageStateService.ts, useStageState.ts                                                                                              │ Shares infra with all 2B tasks                     │        
  ├───────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────┤        
  │ 2B.2 State persistence        │ ProjectView.tsx (hydration), stageStates.ts, stageStateService.ts                                                                                              │ Shares with 2A.6, 2A.7, 2B.3, 2B.4                 │        
  ├───────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────┤
  │ 2B.3 Sequential locking       │ stageStates.ts (validation logic lines 336-362)                                                                                                                │ Shares with 2A.6, 2B.2, 2B.4, 2B.5                 │        
  ├───────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────┤        
  │ 2B.4 Reduce production tedium │ ProjectView.tsx (nav guards), Stage 7 components, warning dialogs                                                                                              │ Shares with 2A.6, 2A.7, 2B.2                       │        
  ├───────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────┤        
  │ 2B.5 Branching foundations    │ Multiple stage components, stageStates.ts                                                                                                                      │ Depends on 2B.1 explicitly                         │        
  └───────────────────────────────┴────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┴────────────────────────────────────────────────────┘        
  Conflict Heatmap (most contested files)

  ProjectView.tsx        → 2A.6, 2A.7, 2B.2, 2B.4  (4 tasks)
  stageStates.ts         → 2A.6, 2B.2, 2B.3, 2B.4, 2B.5  (5 tasks)
  stageStateService.ts   → 2A.7, 2B.1, 2B.2  (3 tasks)
  useStageState.ts       → 2A.4, 2B.1  (2 tasks, different areas)
  Stage4MasterScript.tsx → 2A.4, 2A.5  (2 tasks, must co-locate)

  ---
  Recommended Worktree Strategy

  Batch 1 — Five Parallel Worktrees (zero cross-conflict)

  These five worktrees touch completely different files and can be built simultaneously with no merge conflicts:
  Worktree: WT-A
  Tasks: 2A.1 — Stage 8 asset influence + capsule balance
  Key Files: ImageGenerationService.ts, sceneAssets.ts, promptGenerationService.ts, Stage 8 components
  Why Independent: Backend image gen pipeline is untouched by everything else
  ────────────────────────────────────────
  Worktree: WT-B
  Tasks: 2A.3 — Beat sheet generation bug
  Key Files: Stage3BeatSheet.tsx, beatService.ts
  Why Independent: Stage 3 is a completely isolated island
  ────────────────────────────────────────
  Worktree: WT-C
  Tasks: 2A.4 + 2A.5 — Stage 4 auto-gen + script UI
  Key Files: Stage4MasterScript.tsx, scriptService.ts, ScreenplayToolbar.tsx, screenplay.css, tiptap-extensions/*
  Why Independent: Stage 4 is self-contained; these two must share a worktree since both modify Stage4MasterScript.tsx
  ────────────────────────────────────────
  Worktree: WT-D
  Tasks: 2A.8 — Pipeline graphic colors
  Key Files: PhaseTimeline.tsx, index.css, projects.ts (status calc)
  Why Independent: Pure UI/CSS + one backend status calculation — no other task touches these
  ────────────────────────────────────────
  Worktree: WT-E
  Tasks: 2A.6 + 2A.7 — Skip option + Stage 5 lock button
  Key Files: Stage1InputMode.tsx, Stage5Assets.tsx, ProjectView.tsx, inputProcessingService.ts
  Why Independent: Both touch ProjectView.tsx so they must share, but they modify different functions (handleStageComplete routing). Isolated from everything else in Batch 1
  
  --

  2A.9 (Regeneration boxes) could arguably join Batch 1 as a 6th worktree — it touches Stage2Treatment.tsx and AssetVersionSync.tsx which no Batch 1 task touches. But it mentions "consistent behavior across stages" which could create soft conflicts with the   2B locking work. Safer as Batch 2.

  Batch 2 — After Batch 1 Merges
  Worktree: WT-F
  Tasks: 2A.9 — Regeneration boxes UI
  Rationale: Touches multiple stage components generally; cleaner on a post-Batch-1 baseline
  ────────────────────────────────────────
  Worktree: WT-G
  Tasks: 2B.1 → 2B.2 → 2B.3 → 2B.4 → 2B.5 — Full locking overhaul
  Rationale: All five 2B tasks share stageStates.ts, stageStateService.ts, ProjectView.tsx, and multiple stage components. They are deeply intertwined and 2B.5 explicitly depends on 2B.1. Must be one worktree, built sequentially.
  WT-F and WT-G can run in parallel — 2A.9 touches regeneration dialogs while 2B touches locking infrastructure. Different concerns, minimal file overlap.

  Why 2B Must Wait for 2A.6 + 2A.7

  The locking overhaul (2B) and the skip/lock-button fixes (2A.6, 2A.7) both modify ProjectView.tsx and stageStates.ts. But they change different aspects:
  - 2A.6/2A.7: Fix specific routing bugs (skip destination, Stage 5→6 transition)
  - 2B: Overhaul the entire locking lifecycle

  Merging the surgical bug fixes first gives 2B a stable baseline to restructure against. Attempting them in parallel would create painful merge conflicts in ProjectView.tsx.

  ---
  Visual Summary

  TIME →

  Batch 1 (parallel):
    WT-A: [====2A.1 (Stage 8 asset)====]
    WT-B: [==2A.3 (Beat sheet)==]
    WT-C: [====2A.4+2A.5 (Stage 4)====]
    WT-D: [==2A.8 (Colors)==]
    WT-E: [===2A.6+2A.7 (Skip+Lock btn)===]
                                            ↓ merge all
  Batch 2 (parallel):
    WT-F: [==2A.9 (Regen boxes)==]
    WT-G: [=====2B.1→2B.2→2B.3→2B.4→2B.5 (Locking overhaul)=====]
                                            ↓ merge all → Phase 2 done

  Key Takeaways

  1. 5 worktrees can run simultaneously right now — that's the main win
  2. 2A.4 and 2A.5 must share a worktree (same component file) — do 2A.4 first since auto-gen affects what the UI displays
  3. 2A.6 and 2A.7 must share a worktree (ProjectView.tsx overlap) — but they're small, different functions
  4. All 2B tasks are one inseparable unit — shared infrastructure, explicit dependency chain
  5. The biggest risk is the 2B locking overhaul since it's systemic; getting the 2A fixes merged first gives it a clean foundation


       Task 2A.1: Stage 8 Master Asset Influence & Visual Style Capsule Balance - File Reference Report

       I've completed a thorough analysis of the codebase related to Stage 8 scene instance generation, master asset
       influence, and visual style capsule balance. Here's the comprehensive file list with key details:

       ---
       1. STAGE 8 FRONTEND COMPONENTS

       C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\src\components\pipeline\Stage8VisualDefinition.tsx

       Purpose: Main Stage 8 component for visual definition and asset assembly
       Key lines & functionality:
       - Lines 53-56: sourceBadge() function determines if instance is from "Master" or "Prior Scene"
       - Lines 210-235: Cost confirmation modal for bulk image generation
       - Lines 303-354: Asset inheritance from prior scene; shows "Detect Required Assets (AI)" button
       - Lines 487-496: handleGenerateImage() calls backend image generation for single asset
       - Lines 512-521: Gatekeeper ensures all assets have visual references before proceeding to Stage 9
       - Critical finding: No reference to master asset descriptions or images in the prompt generation—style capsule is the     
       primary visual determinant

       C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\src\components\pipeline\Stage8\VisualStateEditorPanel.tsx

       Purpose: Center panel for editing selected asset instance's visual description
       Key lines & functionality:
       - Lines 61-85: MasterAssetReference() displays master asset's base description + image (asset.image_key_url,
       asset.description)
       - Lines 127-137: Manages description_override and effective_description in local state
       - Lines 139-147: handleSaveDescription() updates descriptionOverride (scene-specific variation)
       - Critical finding: Master asset image is shown as reference but prompt generation uses effective_description
       (override or base), not the master asset's visual reference

       C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\src\components\pipeline\Stage8\SceneAssetListPanel.tsx

       Purpose: Left panel listing all scene asset instances for the current scene
       Key functionality: Asset filtering, selection, and bulk generation trigger
       Critical finding: Lists scene instances with status and source badges but doesn't display or pass master asset imagery    

       C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\src\components\pipeline\AssetDrawer.tsx

       Purpose: Asset library drawer for adding project assets to scene
       Key lines & functionality:
       - Lines 121-142: handleSelectProjectAsset() creates scene asset instance with no description override
       - Lines 145-157: ensureSceneInstanceIfNeeded() creates scene instance after cloning/matching
       - Critical finding: When adding asset to scene, only projectAssetId is passed; no visual reference strategy is defined    

       ---
       2. SCENE ASSET INSTANCE TYPE DEFINITIONS

       C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\src\types\scene.ts

       Lines 66-85: SceneAssetInstance interface
       - id: string
       - scene_id: string
       - project_asset_id: string
       - description_override?: string | null
       - image_key_url?: string | null  // Scene-specific image
       - effective_description: string  // CRITICAL: computed as override OR base description
       - status_tags: string[]
       - carry_forward: boolean
       - inherited_from_instance_id?: string | null
       - project_asset?: ProjectAsset  // Master asset reference
       Lines 87-104: CreateSceneAssetInstanceRequest and UpdateSceneAssetInstanceRequest
       Critical finding: effective_description is the authoritative text used for image generation; master asset image is        
       separate

       ---
       3. ASSET TYPE DEFINITIONS

       C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\src\types\asset.ts

       Lines 19-43: ProjectAsset interface (master asset)
       - id: string
       - name: string
       - asset_type: 'character' | 'prop' | 'location'
       - description: string  // Base description
       - image_key_url?: string  // Master asset image
       - visual_style_capsule_id?: string
       Critical finding: Master asset has its own visual_style_capsule_id, but scene instance generation doesn't reference       
       this

       ---
       4. BACKEND SCENE ASSET ROUTES

       C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend\src\routes\sceneAssets.ts

       Lines 43-92: GET /api/projects/:projectId/scenes/:sceneId/assets - List scene assets
       - Joins with project_assets to return asset details
       - Returns instances with image_key_url, description, etc.

       Lines 145-238: POST /api/projects/:projectId/scenes/:sceneId/assets - Create scene asset instance
       - Lines 199-210: Sets effective_description as descriptionOverride OR projectAsset.description
       - Critical finding: When creating instance, effective_description is calculated but no master asset imagery strategy      

       Lines 306-353: POST /api/projects/:projectId/scenes/:sceneId/assets/:instanceId/generate-image
       - Lines 322-335: Fetches visual style capsule ID from Stage 5
       - Lines 337-343: Calls imageService.createSceneAssetImageJob() with visualStyleId
       - Critical finding: Only passes visualStyleCapsuleId; no reference to master asset images

       ---
       5. IMAGE GENERATION SERVICE (CRITICAL - WHERE PROMPT ASSEMBLY HAPPENS)

       C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend\src\services\image-generation\ImageGenerationService.ts       

       Lines 147-186: createSceneAssetImageJob()
       - Line 171: Uses prompt = instance.effective_description
       - Line 179: Calls createImageJob() with only the effective description as prompt
       - Critical issue: Master asset image not referenced in prompt generation

       Lines 66-141: createImageJob() - Main job creation
       - Line 93: Enforces visualStyleCapsuleId requirement for scene assets
       - Lines 200-217: Retrieves visual style context (text + reference images)
       - Line 229: Passes visualStyleContext.textContext to provider
       - Critical finding: Style capsule context completely overrides asset description in visual generation

       Lines 397-447: getVisualStyleContext() - Assembles style capsule context
       - Lines 398-402: Fetches style capsule by ID
       - Lines 410-422: Logs capsule data (descriptor_strings, design_pillars, reference images)
       - Lines 424-429: Builds text context from ONLY descriptor_strings and design_pillars
       - Lines 434-437: Converts reference image URLs to ReferenceImage objects
       - THE PROBLEM: Master asset image is never fetched or included; only style capsule images are used

       Lines 259-286: Updates scene asset instance with generated image
       - Updates scene_asset_instances.image_key_url with generated image

       ---
       6. BACKEND ASSET SERVICES

       C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend\src\services\styleCapsuleService.ts

       Lines 1-25: StyleCapsule interface
       - descriptor_strings?: string
       - design_pillars?: Record<string, any>
       - reference_image_urls?: string[]
       - style_labels?: string[]
       - negative_constraints?: string[]
       Lines 99-124: Style context building for prompts
       Critical finding: Style capsule is the only visual injection point; no asset imagery integration

       C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend\src\services\contextManager.ts

       Lines 40-61: LocalContext and FullContext interfaces
       Lines 50-55: LocalContext includes sceneAssets but only with:
       - name, type, description, statusTags, imageKeyUrl
       Critical finding: Scene asset context doesn't reference master asset imagery

       C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend\src\services\assetDescriptionMerger.ts

       Lines 17-37: mergeDescriptions() function
       - Merges global + project asset descriptions (not visual imagery)
       - Not used in Stage 8 image generation

       C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend\src\services\assetInheritanceService.ts

       Lines 26-43: Business logic for asset state inheritance
       - CARRY_FORWARD=TRUE: Inherits status_tags, description_override, image_key_url from prior instance
       - Critical finding: Inherits scene instance image, not master asset image

       C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend\src\services\sceneAssetRelevanceService.ts

       Lines 39-130: Asset relevance detection
       - Detects which project assets are needed based on shot list
       - Returns starting_description (text-only) for each relevant asset
       - No visual asset matching

       ---
       7. PROMPT GENERATION SERVICE

       C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend\src\services\promptGenerationService.ts

       Lines 62-94: buildAssetContext() - Builds text context from scene assets
       - Lines 65-77: Extracts character assets and formats as text
       - Builds ONLY text descriptions, no imagery references

       Lines 99-124: buildStyleContext() - Builds style capsule context
       - CRITICAL: Style context includes design_pillars and descriptor_strings
       - No master asset imagery

       Lines 255-292: generateFramePrompt() - Generates frame prompt for shots
       - Line 272: Includes assetContext (text-only)
       - Line 274: Includes styleContext (capsule descriptors, not asset imagery)
       - The prompt assembly completely ignores master asset visual references

       ---
       8. BACKEND IMAGE ROUTES

       C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend\src\routes\images.ts

       Lines 8-68: POST /api/images/generate - Generic image generation
       - Line 17: Accepts visualStyleCapsuleId
       - No master asset reference parameter

       Lines 139-184: GET /api/images/debug-style-capsule/:capsuleId - Debug endpoint
       - Inspects style capsule data (descriptor_strings, design_pillars, reference_image_urls)
       - Confirms style capsule is the sole visual source

       ---
       9. ASSET STORAGE & LOCALIZATION

       C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend\src\services\assetImageLocalizer.ts

       Purpose: Copies global asset images to project storage to prevent broken links
       Lines 33-108: localizeAssetImage() function
       - Downloads image from source URL to project-specific storage
       - Used for master asset images but NOT integrated into Stage 8 generation

       ---
       10. INHERITANCE CHAIN (Stages 5 → 8 → 9 → 10)

       Stage 5 (Phase A - Global context)

       - User selects global visual style capsule
       - Stored in projects.params as locked_visual_style_capsule_id
       - No master asset visual integration at this level

       Stage 8 (Scene instance generation)

       - Fetches visual style capsule from Stage 5 (line 330, sceneAssets.ts)
       - Creates scene asset instances with:
         - effective_description (text-only)
         - image_key_url (initially null, populated after generation)
         - No reference to master asset imagery
       - Generates images using ONLY style capsule + text description

       Stage 9 (Prompt segmentation)

       - Calls promptGenerationService.generatePromptSet()
       - Passes scene assets + style capsule
       - Builds frame prompt from asset descriptions + style context (no visual asset references)

       Stage 10 (Frame generation)

       - Uses prompts generated in Stage 9
       - Inherits the same limitation: no master asset imagery influence

       ---
       11. SUMMARY OF THE PROBLEM (Task 2A.1)

       Issue Location: Backend prompt assembly and image generation job creation

       Root Cause:
       1. ImageGenerationService.createSceneAssetImageJob() (lines 147-186) only passes effective_description to
       createImageJob()
       2. ImageGenerationService.getVisualStyleContext() (lines 397-447) builds context ONLY from style capsule, ignoring        
       master asset imagery
       3. No parameter in the API to pass master asset visual reference URLs
       4. PromptGenerationService builds asset context purely from text descriptions, not visual data

       Impact:
       - Scene instance images are generated using ONLY:
         a. Text description (effective_description)
         b. Style capsule descriptors, pillars, and reference images
         c. Master asset images have zero influence (purely shown as reference in UI)
       - This causes visual inconsistency when master asset has specific imagery that should influence scene instances

       Files That Need Modification for Fix:
       1. backend/src/services/image-generation/ImageGenerationService.ts - Add master asset image reference logic
       2. backend/src/routes/sceneAssets.ts - Pass master asset image URL in generation request
       3. backend/src/services/promptGenerationService.ts - Incorporate visual asset references in context building
       4. Frontend Stage 8 components - Allow users to control master asset influence vs. style capsule override

       ---
       All file paths provided are absolute paths as specified. No files were edited (read-only task).

