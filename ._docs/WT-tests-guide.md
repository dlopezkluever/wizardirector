#3WT-4: 

  Testing Guide

  Prerequisites: Run the migration 023_stage5_asset_enhancements.sql against your Supabase database, then start the dev server with 
  npm run dev.

  1. Tri-State Filter Modal

  - Open Stage 5, lock a style, click "Scan Script for Assets"
  - Verify each entity row shows Keep / Defer / Delete buttons
  - Toggle some to Defer, some to Delete — confirm footer counts update
  - Click "Confirm Selection" — verify deferred assets appear in collapsible section, deleted ones are gone

  2. Deferred Assets

  - From an active asset's dropdown menu, click Defer Asset — card moves to the collapsible "Deferred Assets" section
  - Click Restore on a deferred asset — moves back to the active grid
  - Click Delete on a deferred asset — permanently removed
  - Verify the gatekeeper bar shows "| N deferred" count

  3. Manual Asset Addition

  - Click Add Asset button in the batch actions row
  - Fill in name, type, description, optional scene numbers → submit
  - Verify the new asset appears in the correct type group with a "Manual" badge

  4. Image Carousel

  - Upload an image to an asset → verify it appears in the carousel with "Uploaded" badge and gold "Selected" border
  - Generate a second image → carousel now shows 2 items with prev/next arrows and "1/2" counter
  - Hover a non-selected image → verify Select and Delete overlay buttons appear
  - Click Select → that image gets gold border, asset's main image updates
  - Click Delete on a non-selected image → removed from carousel
  - Verify you cannot delete the currently selected image

  5. Lock-All Flow

  - Ensure all active assets have images (deferred ones don't need images)
  - Click "Lock All Assets & Begin Production" — should succeed
  - Verify deferred assets were NOT locked
  - Unlock the stage → verify everything becomes editable again

  6. Grid Layout

  - Widen the browser — verify cards display 2-up on medium screens, 3-up on wide screens
  - Narrow the browser — verify cards stack to single column

  7. Stage 8 Integration

  - After locking Stage 5 (with some deferred assets), proceed to Stage 8
  - Verify deferred assets appear in scene asset population (with no image)
  - Verify non-deferred locked assets appear with their images

 #modal needs to be scrollable; allow props to be deleted.

 # 3WT-6:

 
  Testing Guide

  1. Generate prompts for a scene (Stage 9)
  - Open a project with a visual style capsule assigned and scenes with extracted shots
  - Trigger prompt generation for a scene
  - Check backend logs for: [Stage9] Loaded visual style capsule: <name> — confirms style capsule is no longer null
  - Check logs for: [Stage9] Asset context size: ~X tokens for Y assets

  2. Verify frame prompt quality
  - Inspect generated frame prompts — should follow the 5-part structure (camera → subject → spatial → environment → lighting)      
  - Should contain NO action verbs, dialogue, or sound references
  - Should reference character descriptions from master assets
  - Should be up to ~1200 chars

  3. Verify video prompt quality
  - Inspect generated video prompts — should be lean (action + camera movement + dialogue + SFX)
  - Should contain NO character appearance, environment, or lighting descriptions
  - Should be ~500 chars max

  4. Extract a shot list (Stage 8)
  - Trigger shot extraction for a scene
  - Verify camera fields follow TYPE - ANGLE - MOVEMENT format (e.g., "MS - Eye Level - Slow Dolly In")
  - Verify action fields include spatial detail, body language, atmosphere — not just story narration

  5. Style capsule influence
  - Compare prompts from a project WITH a visual style capsule vs one WITHOUT
  - The styled project's frame prompts should include style-specific aesthetics (design pillars, color/lighting directives, negative   constraints)


# 3WT-7:
Here's a quick testing guide for each feature:

  3A.5 — Extra Archetypes

  1. Open Stage 5, lock a style, extract assets
  2. Click "Add Extra Archetype" button — verify it opens the modal with "Extra Archetype" pre-selected   and the archetype-specific description
  3. Create one (e.g. "Zorblaxian Alien") — verify it appears in its own 4th group section with the    
  Users icon
  4. Verify the gatekeeper bar shows extras count separately and doesn't require images on extras to   
  enable "Lock All Assets"
  5. Lock the stage — extras should lock alongside other assets even without images

  3A.7 — Image Description Extraction

  1. On any asset, click Upload and select an image
  2. After upload succeeds, wait for the analysis toast — a modal should auto-appear with:
    - Current description (read-only)
    - Extracted description (highlighted)
    - Merged preview (editable)
  3. Test all three buttons: Keep Current, Replace with Extracted, Use Merged
  4. Verify the description updates (or doesn't) accordingly
  5. Test failure gracefully: if backend is down or API key missing, upload should still succeed with  
  an info toast

  3A.8 — Manual Visual Tone

  1. In Stage 5 (before locking style), verify the "Style Capsule" / "Manual Tone" toggle buttons      
  2. Switch to Manual Tone — verify preset chips appear (3D Animation, Hyperrealistic, Noir, etc.)     
  3. Click a preset — verify its description shows below
  4. Optionally type custom text in the textarea
  5. Click "Lock Visual Tone" — verify it locks and shows the green locked state
  6. Generate an image — verify the manual tone text influences the output (check backend logs for     
  Using manual visual tone)
  7. Switch back to capsule mode, lock a capsule, generate — verify no regression

  3A.9 — Style Re-selection

  1. Lock a style (capsule or manual), then generate images on a few assets
  2. Click "Change Style" button (appears next to LOCKED badge)
  3. In the warning dialog, test "Mark Images as Outdated":
    - Style unlocks, you can pick a new one
    - Asset cards show amber "Style Outdated" badge
    - Regenerating an outdated asset should clear the badge
  4. Lock again, generate images, click "Change Style" again
  5. This time test "Clear All Images":
    - Style unlocks, all images are removed
    - No outdated badges (images are gone)
  6. Post-stage-lock flow: Lock stage 5 → use the existing unlock mechanism → "Change Style" should    
  appear again after unlock

  Migration Note

  The migration file (024_extra_archetype_and_style_outdated.sql) needs to be run manually against your   Supabase database before testing — per CLAUDE.md, npm run migrate should NOT be used.


#3WT-8 

  Summary

  3B.6 — "Add New Assets" Button Fix

  - Backend (backend/src/routes/sceneAssets.ts): Added POST
  /:projectId/scenes/:sceneId/assets/create-with-project-asset — atomically creates a project_asset +  
  scene_asset_instance in one transaction
  - Frontend service (src/lib/services/sceneAssetService.ts): Added createSceneAssetWithProjectAsset() 
  method
  - UI (Stage8VisualDefinition.tsx): AssetDrawerTriggerPanel now supports mode: 'default' | 'creating' 
  — "Create new asset" switches to an inline form with name, type dropdown, and description fields. The   panel header was renamed to "Add new assets"

  3B.7 — Remove Assets from Scene

  - VisualStateEditorPanel: Added destructive "Remove" button with Trash2 icon in the header bar       
  - SceneAssetListPanel: Added subtle X icon on each asset card (visible on hover, with
  stopPropagation)
  - Stage8VisualDefinition: Added AlertDialog confirmation, deleteMutation using existing
  sceneAssetService.deleteSceneAsset(), and cleanup of selectedAsset/selectedForGeneration on deletion 

  3B.8 — Persist Suggested Assets in DB

  - Migration (backend/migrations/024_scene_asset_suggestions.sql): Created scene_asset_suggestions    
  table with RLS policy (NOT run)
  - Backend routes: Added GET/POST/PATCH endpoints for suggestions CRUD
  - Type (src/types/scene.ts): Added SceneAssetSuggestion interface
  - Frontend service: Added listSuggestions(), saveSuggestions(), updateSuggestion() methods
  - Stage8VisualDefinition: Added useQuery for suggestions, persist after AI detection, dismiss via    
  updateSuggestion(... { dismissed: true })

  3B.9 — Shot Presence Flags per Asset

  - Stage8VisualDefinition: Added useQuery for shots via shotService.fetchShots(), computed
  shotPresenceMap: Map<string, string[]> matching character names against
  charactersForeground/charactersBackground and location names against setting
  - SceneAssetListPanel: Asset cards now display small "S1", "S2" etc. badges below status tags when   
  the asset appears in those shots

  Verification

  - npm run lint — 0 new errors (all existing are pre-existing in unmodified files)
  - npm run build — succeeds, 2351 modules transformed

✻ Baked for 7m 24s

❯ can you breifly explain how I can test the changes made in this session   
  ⎿  ⧉ Selected 32 lines from ..\..\backend\migrations\024_scene_asset_suggestions.sql in Cursor       

● Here's how to test each feature:

  Setup: Run the migration 024_scene_asset_suggestions.sql against your Supabase database first (the   
  file is at backend/migrations/024_scene_asset_suggestions.sql). Then start both servers:
  - Backend: cd backend && npm run dev
  - Frontend: npm run dev from project root

  Testing by feature:

  3B.6 — Create New Asset button: Navigate to Stage 8 for any scene with assets. In the right panel,   
  click "Create new asset" — you should see an inline form (name, type dropdown, description). Submit  
  it and verify the new asset appears in the left panel and exists in both project_assets and
  scene_asset_instances tables.

  3B.7 — Remove from scene: Hover over any asset card in the left panel — a small X should appear      
  top-right. Click it and confirm the dialog. Also select an asset and check the center panel header   
  for a red "Remove" button. Verify the instance row is deleted but the project_assets row remains.    

  3B.8 — Persisted suggestions: Trigger "Detect Required Assets (AI)" on a scene. If the AI returns    
  new_assets_required, check the scene_asset_suggestions table for new rows. Refresh the page —        
  suggestions should still appear. Click "Ignore" on one and verify dismissed = true in the DB.        

  3B.9 — Shot presence badges: On a scene that has both shots (from Stage 7) and assets, look at asset 
  cards in the left panel. Character and location a




# 3-10:

Testing Guide for 3C.1 + 3C.2
   
  Prerequisites

  1. Run the migration 025_asset_angle_variants.sql against your Supabase database
  2. Start the dev server: npm run dev

  ---
  3C.1 — Background Injection Testing

  Test 1: Character image generation (Stage 5)
  - Open a project, go to Stage 5
  - Click "Generate" on a character asset
  - Check the backend console logs for: [ImageService] 3C.1: Injecting background isolation for character (master_asset)
  - The generated image should have a clean white background

  Test 2: Location image generation (should NOT inject)
  - Click "Generate" on a location asset
  - Verify the console does NOT show the injection log
  - The image should include full environmental context

  Test 3: Prop image generation
  - Click "Generate" on a prop asset
  - Verify injection log appears: 3C.1: Injecting background isolation for prop (master_asset)

  Test 4: Scene asset generation (Stage 8)
  - Go to Stage 8, generate an image for a scene character instance
  - Verify injection log appears with (scene_asset) job type

  ---
  3C.2 — Multi-Angle Testing

  Test 5: "Manage Angles" menu visibility
  - In Stage 5, click the ... dropdown on a character card — verify "Manage Angles" appears
  - Click the ... dropdown on a location or prop card — verify "Manage Angles" does NOT appear

  Test 6: Single angle generation
  - Click "Manage Angles" on a character — dialog opens with 4 empty grid cells
  - Click "Generate" on the "Front View" cell
  - Status badge should show "generating", spinner visible
  - After completion (~10-20s), the image appears and badge shows "completed"

  Test 7: Batch generation
  - Click "Generate Missing Angles" button
  - All remaining empty cells should start generating simultaneously
  - Verify all 4 complete with images

  Test 8: Regenerate + Delete
  - Click "Regenerate" on a completed angle — new image replaces the old one
  - Click the trash icon on a variant — it disappears from the grid

  Test 9: Angle-to-shot matching (Stage 9)
  - Have a project with a character that has angle variants generated
  - Run Stage 9 prompt generation for a scene with that character
  - Check backend logs for: [Stage9] Attached angle variants for 1 character asset(s)
  - For a shot with camera: "MS - Side - Static", the prompt context should show Angle-matched reference image available.

  ---
  Quick Smoke Test Checklist

  - Character image has white background
  - Location image has environmental context (no white bg)
  - "Manage Angles" only on characters
  - Dialog opens, shows 4 angle grid
  - Single angle generates successfully
  - Batch generation works
  - Stage 9 logs show angle variant attachment






# 4-1:
  ● Testing Guide: Content Access Carousel (4WT-1)

  Prerequisites

  - Start the dev server: npm run dev from the project root
  - Have a project with at least 2 scenes (Scene 1 is an edge case — no Rearview tab)
  - Ideally have a project that has progressed through Stage 7 (so shots exist for Tab 3)

  ---
  1. Tab Visibility Matrix

  Navigate to each stage for a scene that is not Scene 1:
  ┌────────────────────────────────────┬───────────────────────────┐
  │               Stage                │       Expected Tabs       │
  ├────────────────────────────────────┼───────────────────────────┤
  │ 6 (select a scene in detail panel) │ Rearview + Script         │
  ├────────────────────────────────────┼───────────────────────────┤
  │ 7                                  │ Rearview + Script         │
  ├────────────────────────────────────┼───────────────────────────┤
  │ 8                                  │ Rearview + Script + Shots │
  ├────────────────────────────────────┼───────────────────────────┤
  │ 9                                  │ Rearview + Script + Shots │
  ├────────────────────────────────────┼───────────────────────────┤
  │ 10                                 │ Rearview + Script + Shots │
  ├────────────────────────────────────┼───────────────────────────┤
  │ 11                                 │ Rearview + Script + Shots │
  ├────────────────────────────────────┼───────────────────────────┤
  │ 12                                 │ Rearview + Script + Shots │
  └────────────────────────────────────┴───────────────────────────┘
  Then navigate to Scene 1 at any stage — the Rearview tab should be absent.

  ---
  2. Tab Content

  - Rearview tab: Should show either a prior scene end-frame image (with loading spinner) or text fallback (priorSceneEndState). If 
  the image fails to load, it should gracefully fall back to text mode.
  - Script tab: Should display the current scene's scriptExcerpt with simplified screenplay formatting:
    - Scene headings (INT./EXT.) in amber, bold, uppercase
    - Character names in blue, bold, uppercase, indented
    - Dialogue text indented
    - Monospace font (Courier Prime)
  - Shots tab (stages 8+): Should show shot cards with shotId badge, camera badge, duration badge, action text, and dialogue        
  snippet. Use up/down arrows to cycle through shots. Counter should read "X / Y".

  ---
  3. Collapse / Expand

  - Click the chevron toggle (top-right of the panel) — content should animate closed smoothly
  - Tab labels should remain visible when collapsed
  - Click again — content should expand back to the same height it was before
  - Switching tabs while collapsed should work (active tab updates); expanding reveals the new tab

  ---
  4. Drag-to-Resize

  - Hover over the grip handle at the bottom of the panel — cursor should change to row-resize
  - Drag down — panel should grow (max ~50% viewport height)
  - Drag up — panel should shrink (min 100px)
  - Switch tabs — height should persist
  - Navigate to a different stage — height should persist (session-level)
  - Refresh the page — height should reset to ~25% viewport (expected behavior)

  ---
  5. Stage-Specific Checks
  Stage: 6
  What to verify: Carousel appears inside the scene detail panel (right side), replacing the old "Prior Scene End State" box. Only  
    shows when a scene is selected.
  ────────────────────────────────────────
  Stage: 7
  What to verify: Carousel sits between the LockedStageHeader and the shot list grid. Old RearviewMirror is gone.
  ────────────────────────────────────────
  Stage: 8
  What to verify: Carousel appears in both the empty-state view (no assets yet) and the main asset view. Old ContinuityHeader       
  wrapper
     is gone.
  ────────────────────────────────────────
  Stage: 9
  What to verify: Carousel is new — sits between LockedStageHeader and the "Prompt Segmentation" header.
  ────────────────────────────────────────
  Stage: 10
  What to verify: Carousel replaces old RearviewMirror. Frame comparison feature still works (click Compare on a shot's start frame 
  —
     should compare with prior shot's end frame or prior scene's end frame).
  ────────────────────────────────────────
  Stage: 11
  What to verify: Carousel is new — sits between LockedStageHeader and the "Confirm & Render" header.
  ────────────────────────────────────────
  Stage: 12
  What to verify: Carousel is new — sits between LockedStageHeader and the "Video Generation" header.
  ---
  6. Edge Cases

  - Scene 1, Stage 6: Only Script tab visible (no Rearview, no Shots)
  - Stage 8+ but shots not yet extracted (Stage 7 incomplete): Shots tab should show "No shots extracted yet. Complete Stage 7 to   
  see the shot list."
  - Scene with empty scriptExcerpt: Script tab should show "No script excerpt available for this scene."
  - Scene with no priorSceneEndState AND no endFrameThumbnail: Rearview tab should show "No prior scene data available."
  - Image load failure: If the rearview end-frame image URL is broken, it should fall back to text mode automatically (no broken    
  image icon)

  ---
  7. Quick Smoke Test Sequence

  1. Open a project → go to Stage 7 for Scene 2
  2. Verify Rearview + Script tabs visible
  3. Click Script tab → confirm screenplay formatting
  4. Click collapse toggle → confirm panel collapses
  5. Expand → drag resize handle down → confirm panel grows
  6. Navigate to Stage 8 → confirm Shots tab now appears, height persists
  7. Click Shots tab → cycle through shots with arrows
  8. Navigate to Stage 9, 10, 11, 12 → confirm carousel appears at each
  9. Go back to Stage 6 → select Scene 1 → confirm only Script tab
  10. Select Scene 2 → confirm Rearview + Script tabs appear in detail panel
