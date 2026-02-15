 WT-A Implementation Plan: Stage 6 & 7 UI Improvements

 Context

 The Script Hub (Stage 6) and Shot List (Stage 7) have several UI  
 issues that need fixing: scene cards overflow the sidebar,        
 headers use raw encoded slugs instead of human-readable text,     
 there's no way to defer/sideline scenes, and the merge toggle in  
 Stage 7 is not visually linked to its merge button. These 4 tasks 
  (4B.1, 4B.2, 4B.3, 4B.5) address these issues. Task 4B.6 (Extend 
  Shot research) is skipped for now.

 ---
 Implementation Order

 #: 1
 Task: 4B.2 - Scene Header Formatting
 Priority: MEDIUM
 Scope: Frontend utility + apply across stages
 ────────────────────────────────────────
 #: 2
 Task: 4B.1 - Script Hub Overflow Fix
 Priority: HIGH
 Scope: CSS fixes in Stage6ScriptHub.tsx
 ────────────────────────────────────────
 #: 3
 Task: 4B.5 - Merge Toggle Improvement
 Priority: LOW
 Scope: Toolbar restructure in Stage7ShotList.tsx
 ────────────────────────────────────────
 #: 4
 Task: 4B.3 - Scene Deferral
 Priority: MEDIUM
 Scope: Full-stack: migration, backend routes, frontend UI

 4B.2 goes first because 4B.1 uses the formatted header. 4B.3 is   
 last because it's the most complex.

 ---
 Task 4B.2 — Scene Header Formatting Utility

 Step 1: Create formatSceneHeader() in src/lib/utils.ts

 Add a utility function that parses slugs like
 ext-construction-site-day-1:
 - Strip trailing number (-1)
 - Map prefix: ext → Exterior, int → Interior
 - Extract time of day from last segment: day, night, dawn, dusk,  
 evening, morning, later, continuous
 - Title-case remaining location segments
 - Return: { formatted, prefix, prefixFull, location, timeOfDay }  
 - Example output: "Exterior Construction Site - Day"
 - Defensive: if slug format is unexpected, return slug as-is      

 Step 2: Apply in Stage 6 right panel header

 File: src/components/pipeline/Stage6ScriptHub.tsx
 - Line 322 (<h1>): Replace {selectedScene.slug} with
 {formatSceneHeader(selectedScene.slug).formatted}
 - Line 332 (<p> subheading): Keep {selectedScene.header} (raw     
 screenplay header from script_excerpt)

 Step 3: Apply in Stage 6 left panel scene cards

 File: Same file, line 253
 - Replace {scene.slug} with
 {formatSceneHeader(scene.slug).formatted}
 - The existing truncate class will handle overflow

 Step 4: Apply in Stage 8 scene headers

 File: src/components/pipeline/Stage8VisualDefinition.tsx
 - Lines 791 and 848: Replace {currentScene.slug} with
 {formatSceneHeader(currentScene.slug).formatted}

 ---
 Task 4B.1 — Script Hub UI Overflow Fix

 Step 1: Fix scene card text truncation

 File: src/components/pipeline/Stage6ScriptHub.tsx, lines 247-255  
 - Add overflow-hidden to the flex row containing scene number +   
 slug
 - Add flex-shrink-0 to scene number span (prevent it from
 shrinking)
 - Add title attribute with full formatted header for tooltip on   
 hover
 - The truncate class on the slug span already handles text        
 overflow — the parent just needs overflow-hidden

 Step 2: Fix badge row overflow

 File: Same file, lines 257-289
 - Change badge container from gap-2 to gap-1.5 flex-wrap
 - This allows badges to wrap instead of overflowing the card      

 ---
 Task 4B.5 — Merge Toggle Improvement

 Step 1: Restructure the toolbar

 File: src/components/pipeline/Stage7ShotList.tsx, lines 797-864   

 Reorder from: Split Shot | [Next/Prev] | Merge | Delete
 To: [Next/Prev + Merge] | Split Shot | Delete

 - Wrap Next/Prev toggle + Merge button in a container with        
 rounded-lg border border-border/50 bg-muted/20 px-1.5 py-0.5      
 - This creates a subtle visual grouping that makes the
 relationship between the direction toggle and merge button        
 obvious
 - Split Shot moves to the right of the merge group
 - Delete remains last

 ---
 Task 4B.3 — Scene Deferral/Sidelining (Full-Stack)

 Step 1: Write migration SQL

 File to create: backend/migrations/027_add_scene_deferral.sql     
 ALTER TABLE scenes ADD COLUMN is_deferred BOOLEAN NOT NULL        
 DEFAULT FALSE;
 CREATE INDEX idx_scenes_is_deferred ON scenes(is_deferred) WHERE  
 is_deferred = TRUE;
 User runs this manually — we do NOT execute npm run migrate.      

 Step 2: Add isDeferred to frontend Scene type

 File: src/types/scene.ts, after line 46
 - Add isDeferred?: boolean;

 Step 3: Update backend scene fetch to include is_deferred

 File: backend/src/routes/projects.ts
 - Line 596: Add is_deferred to the .select() column list
 - Line ~626: Add isDeferred: scene.is_deferred ?? false to the    
 transform

 Step 4: Add backend defer/restore routes

 File: backend/src/routes/projects.ts (after scene fetch routes,   
 ~line 686)
 - PUT /:id/scenes/:sceneId/defer — Sets is_deferred = true.       
 Validates ownership and that scene isn't already deferred.        
 - PUT /:id/scenes/:sceneId/restore — Sets is_deferred = false.    
 Validates ownership and that scene is currently deferred.

 Step 5: Add backend last-shot-delete protection

 File: backend/src/routes/projects.ts, lines 1454-1482 (DELETE     
 shot route)
 - Before deleting, count shots in scene
 - If count <= 1, return 409 { error: 'Cannot delete the last      
 shot', code: 'LAST_SHOT', suggestion: 'defer_scene' }

 Step 6: Add frontend sceneService methods

 File: src/lib/services/sceneService.ts
 - Add deferScene(projectId, sceneId) — PUT to
 /api/projects/:id/scenes/:sceneId/defer
 - Add restoreScene(projectId, sceneId) — PUT to
 /api/projects/:id/scenes/:sceneId/restore
 - Update fetchScenes mapping to include isDeferred

 Step 7: Update Stage 6 — Scene count display

 File: src/components/pipeline/Stage6ScriptHub.tsx, lines 157-161  
 - Change from: "15 scenes · 0 complete"
 - To: "13 scenes · 2 deferred · 0 complete" (deferred count only  
 shows when > 0)

 Step 8: Update Stage 6 — Grey out deferred cards

 File: Same file, scene card rendering
 - Add opacity-50 class when scene.isDeferred
 - Add small "Deferred" badge in the badge row

 Step 9: Update Stage 6 — Defer/Restore button in detail panel     

 File: Same file, right panel button group (lines 336-362)
 - Add isDeferring state
 - For non-deferred scenes: "Defer Scene" button with EyeOff icon  
 - For deferred scenes: "Restore Scene" button with Undo2 icon     
 - Disable "Enter Scene Pipeline" button when scene is deferred    
 - On defer/restore: update local scenes state immediately

 Step 10: Update Stage 7 — Last shot delete protection

 File: src/components/pipeline/Stage7ShotList.tsx
 - Modify handleDeleteShot to check shots.length <= 1 before       
 deleting
 - If last shot: show a warning dialog instead of deleting
 - Dialog text: "This is the only shot in the scene. Every scene   
 must have at least one shot. Would you like to defer this scene   
 instead?"
 - "Defer Scene" button calls sceneService.deferScene() then       
 onBack() to return to Script Hub
 - Also handle 409 LAST_SHOT response from backend (race condition 
  fallback)

 ---
 Files Modified Summary

 File: src/lib/utils.ts
 Tasks: 4B.2 (add formatSceneHeader)
 ────────────────────────────────────────
 File: src/types/scene.ts
 Tasks: 4B.3 (add isDeferred)
 ────────────────────────────────────────
 File: src/components/pipeline/Stage6ScriptHub.tsx
 Tasks: 4B.1, 4B.2, 4B.3
 ────────────────────────────────────────
 File: src/components/pipeline/Stage7ShotList.tsx
 Tasks: 4B.3, 4B.5
 ────────────────────────────────────────
 File: src/components/pipeline/Stage8VisualDefinition.tsx
 Tasks: 4B.2
 ────────────────────────────────────────
 File: src/lib/services/sceneService.ts
 Tasks: 4B.3
 ────────────────────────────────────────
 File: backend/src/routes/projects.ts
 Tasks: 4B.3
 ────────────────────────────────────────
 File: backend/migrations/027_add_scene_deferral.sql
 Tasks: 4B.3 (new file)

 ---
 Verification

 1. Lint: Run npm run lint from project root after all changes     
 2. 4B.2: Visually confirm formatted headers in Stage 6 (left      
 panel cards + right panel header + subheading) and Stage 8        
 3. 4B.1: Verify long scene names truncate with ellipsis in the    
 sidebar cards, hover shows full text via tooltip, badges wrap     
 instead of overflowing
 4. 4B.5: Verify Stage 7 toolbar shows [Next/Prev + Merge] in a    
 bordered group, followed by Split Shot, then Delete
 5. 4B.3: After running the migration:
   - Verify "Defer Scene" button appears in Stage 6 detail panel   
   - Verify deferred scenes are greyed out with "Deferred" badge   
   - Verify scene count shows deferred count
   - Verify "Restore Scene" button appears for deferred scenes     
   - Verify "Enter Scene Pipeline" is disabled for deferred scenes 
   - Verify attempting to delete the last shot in Stage 7 shows    
 the defer dialog
   - Verify deferring from Stage 7 navigates back to Script Hub
 6. Tests: Run npm test from project root and npm test from        
 backend directory