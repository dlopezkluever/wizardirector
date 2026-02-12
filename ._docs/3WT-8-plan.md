 3WT-8 Implementation Plan

 Stage 8 Scene Asset Management (3B.6 → 3B.7 → 3B.8 → 3B.9)

 Context

 Stage 8 (Visual Definition) manages scene-specific asset instances. Four sequential tasks improve the  
 asset management workflow: fixing the "Create Scene Asset" button, allowing asset removal, persisting  
 AI suggestions, and adding shot presence flags. All share the SceneAssetListPanel and
 Stage8VisualDefinition components.

 ---
 3B.6 — "Add New Assets" Button Fix

 Problem: Both "Add from project assets" and "Create scene asset" buttons open the same AssetDrawer.    
 Users need a distinct flow to create a brand-new asset from scratch.

 Approach: The right panel (AssetDrawerTriggerPanel) gains a mode toggle. "Create new asset" switches   
 it to an inline form. A new backend endpoint atomically creates both a project_asset and a
 scene_asset_instance in one transaction.

 Files to modify:

 1. src/components/pipeline/Stage8VisualDefinition.tsx
 - Add rightPanelMode state: 'default' | 'creating'
 - Replace handleCreateNewAsset to set rightPanelMode = 'creating'
 - Add handleCreateNewAssetSubmit — calls new service method, invalidates query, resets panel mode      
 - Pass mode + handlers to AssetDrawerTriggerPanel
 - Update AssetDrawerTriggerPanel component:
   - Rename header from "Asset library" to "Add new assets"
   - When mode === 'creating': render inline form (name input, type dropdown, description textarea,     
 Submit/Cancel buttons)
   - When mode === 'default': render existing buttons (unchanged)

 2. src/lib/services/sceneAssetService.ts
 - Add createSceneAssetWithProjectAsset(projectId, sceneId, { name, assetType, description }) method    
 - Calls POST /api/projects/:projectId/scenes/:sceneId/assets/create-with-project-asset

 3. backend/src/routes/sceneAssets.ts
 - Add POST /:projectId/scenes/:sceneId/assets/create-with-project-asset
 - Validation schema: { name: string, assetType: 'character'|'location'|'prop', description: string }   
 - Logic:
   a. Verify project ownership + get active_branch_id
   b. Insert into project_assets (name, asset_type, description, project_id, branch_id, locked: true —  
 immediately usable for image generation, source: 'manual')
   c. Insert into scene_asset_instances (scene_id, project_asset_id from step 2, effective_description  
 = description)
   d. Return the created instance with joined project_asset data

 ---
 3B.7 — Remove Assets from Scene

 Problem: Some AI extractions are inaccurate. Users cannot remove assets from a scene.

 Approach: Add a "Remove from scene" button in the VisualStateEditorPanel (primary action) and a subtle 
  icon on asset cards (secondary). Confirmation dialog prevents accidental removal. Only deletes        
 scene_asset_instance row (no dependency column changes, per user decision).

 Files to modify:

 1. src/components/pipeline/Stage8/VisualStateEditorPanel.tsx
 - Add onRemoveFromScene?: (instanceId: string) => void prop
 - Add a destructive "Remove from scene" button in the header bar (alongside Lock Asset, Generate       
 Image)
 - Import Trash2 from lucide-react for the icon

 2. src/components/pipeline/Stage8/SceneAssetListPanel.tsx
 - Add onRemoveAsset?: (instanceId: string) => void prop
 - Add a subtle X icon on each asset card (visible on hover) in AssetTypeGroup
 - Icon click calls onRemoveAsset with e.stopPropagation() to prevent card selection

 3. src/components/pipeline/Stage8VisualDefinition.tsx
 - Add removeConfirmAssetId state for tracking which asset is pending removal confirmation
 - Add AlertDialog (from shadcn/ui) for confirmation: "Remove [asset name] from this scene? This only   
 removes the scene association, not the global asset."
 - Add deleteMutation using sceneAssetService.deleteSceneAsset()
 - On successful deletion: clear selectedAsset if it was the deleted one, remove from
 selectedForGeneration, invalidate query cache
 - Wire onRemoveFromScene to both VisualStateEditorPanel and SceneAssetListPanel

 Existing code to reuse:
 - sceneAssetService.deleteSceneAsset() at src/lib/services/sceneAssetService.ts:175 (already exists)   
 - Backend DELETE /:projectId/scenes/:sceneId/assets/:instanceId at
 backend/src/routes/sceneAssets.ts:491 (already exists)
 - AlertDialog from @/components/ui/alert-dialog (shadcn component)

 ---
 3B.8 — Persist Suggested Assets in DB

 Problem: AI-suggested assets (new_assets_required from relevance detection) are held in React state    
 and lost on page refresh. Users can't reliably act on suggestions across sessions.

 Approach: Create a scene_asset_suggestions table, backend CRUD routes, and frontend integration.       
 Suggestions are persisted after AI detection and loaded on Stage 8 mount.

 Files to create/modify:

 1. backend/migrations/024_scene_asset_suggestions.sql (NEW — write but do NOT run)
 CREATE TABLE scene_asset_suggestions (
   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
   scene_id UUID NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
   asset_id UUID REFERENCES project_assets(id) ON DELETE SET NULL,
   name TEXT NOT NULL,
   asset_type TEXT NOT NULL CHECK (asset_type IN ('character', 'location', 'prop')),
   description TEXT,
   justification TEXT,
   suggested_by TEXT NOT NULL DEFAULT 'ai_relevance',
   accepted BOOLEAN NOT NULL DEFAULT FALSE,
   dismissed BOOLEAN NOT NULL DEFAULT FALSE,
   created_at TIMESTAMPTZ DEFAULT now(),
   updated_at TIMESTAMPTZ DEFAULT now()
 );

 CREATE INDEX idx_scene_asset_suggestions_scene_id ON scene_asset_suggestions(scene_id);

 ALTER TABLE scene_asset_suggestions ENABLE ROW LEVEL SECURITY;
 -- RLS: users can manage suggestions for scenes in their projects
 CREATE POLICY "Users can manage suggestions for their scenes"
   ON scene_asset_suggestions FOR ALL
   USING (
     scene_id IN (
       SELECT s.id FROM scenes s
       JOIN branches b ON s.branch_id = b.id
       JOIN projects p ON b.project_id = p.id
       WHERE p.user_id = auth.uid()
     )
   );

 2. backend/src/routes/sceneAssets.ts — Add 3 new endpoints:
 - GET /:projectId/scenes/:sceneId/suggestions — fetch non-dismissed suggestions
 - POST /:projectId/scenes/:sceneId/suggestions — bulk-create suggestions (array of { name, assetType,  
 description, justification })
 - PATCH /:projectId/scenes/:sceneId/suggestions/:suggestionId — update { accepted?: boolean,
 dismissed?: boolean }

 3. src/types/scene.ts — Add SceneAssetSuggestion interface:
 export interface SceneAssetSuggestion {
   id: string;
   scene_id: string;
   asset_id?: string | null;
   name: string;
   asset_type: string;
   description?: string;
   justification?: string;
   suggested_by: string;
   accepted: boolean;
   dismissed: boolean;
   created_at: string;
 }

 4. src/lib/services/sceneAssetService.ts — Add methods:
 - listSuggestions(projectId, sceneId)
 - saveSuggestions(projectId, sceneId, suggestions[])
 - updateSuggestion(projectId, sceneId, suggestionId, { accepted?, dismissed? })

 5. src/components/pipeline/Stage8VisualDefinition.tsx
 - Add useQuery for suggestions: ['scene-suggestions', projectId, sceneId]
 - After AI detection (handleDetectAndPopulateAssets), persist new_assets_required to backend via       
 saveSuggestions()
 - Replace ephemeral newAssetsRequired state with query data
 - When user clicks "Ignore" on a suggestion, call updateSuggestion(... { dismissed: true })

 6. src/components/pipeline/Stage8/SceneAssetListPanel.tsx
 - Update onIgnoreSuggested to work with suggestion IDs instead of array indices
 - Accept suggestion action: calls updateSuggestion(... { accepted: true }) then opens asset drawer or  
 create form

 ---
 3B.9 — Shot Presence Flags per Asset

 Problem: Users can't tell which shots each asset appears in within a scene. Shot-level visibility      
 helps users understand where each asset is needed.

 Approach: Fetch shots for the current scene, compute a presence map (asset name → shot numbers), and   
 display badges on asset cards. Characters matched via charactersForeground/charactersBackground        
 arrays; locations matched via setting field. Props excluded (unreliable text matching).

 Files to modify:

 1. src/components/pipeline/Stage8VisualDefinition.tsx
 - Add useQuery for shots: ['shots', projectId, sceneId] using shotService.fetchShots()
 - Add useMemo to compute shotPresenceMap: Map<string, string[]> (project_asset_id → shot IDs array)    
   - For character assets: check if asset name appears (case-insensitive) in any shot's
 charactersForeground or charactersBackground
   - For location assets: check if asset name appears (case-insensitive) in shot's setting field        
 - Pass shotPresenceMap to SceneAssetListPanel

 2. src/components/pipeline/Stage8/SceneAssetListPanel.tsx
 - Add shotPresenceMap?: Map<string, string[]> prop to both SceneAssetListPanelProps and AssetTypeGroup 
 - In AssetTypeGroup asset card rendering: if shotPresenceMap.has(instance.project_asset_id), render    
 small shot number badges (e.g., "S1", "S3")
 - Badge styling: small chips similar to status tags but in a neutral color scheme
 - Display below existing status tags row

 Existing code to reuse:
 - shotService.fetchShots() at src/lib/services/shotService.ts:44
 - Shot type with charactersForeground, charactersBackground, setting fields from src/types/scene.ts:16 

 ---
 Execution Order

 Tasks are sequential: 3B.6 → 3B.7 → 3B.8 → 3B.9 (each builds on shared panel changes).

 Verification

 After each task:
 1. Run npm run lint from project root (C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\)
 2. Run npm run build to verify TypeScript compilation
 3. Manual verification:
   - 3B.6: Right panel shows inline form on "Create new asset" click; form submission creates both      
 project asset + scene instance; "Add from project assets" still opens drawer
   - 3B.7: "Remove from scene" button visible in editor panel; confirmation dialog appears; deletion    
 removes instance without affecting global asset
   - 3B.8: AI detection saves suggestions to DB; suggestions persist across page refreshes;
 dismiss/accept persists
   - 3B.9: Shot badges appear on character + location asset cards; badges update when viewing different 
  scenes






   User answered Claude's questions:
  ⎿  · For 3B.6 ('Create Scene Asset' button fix): The current architecture requires every
     scene_asset_instance to reference a project_asset_id (FK constraint). 'Creating a
     scene-specific asset from scratch' would need to also create a project_asset. Should the flow      
     be: (A) a form that creates a NEW project_asset + scene_asset_instance in one step, or (B)
     something else entirely? → Option 1 — New project_asset + instance, but with Option 3's UX
     refinement.  - Option 1 is architecturally correct. If a user says "this scene needs a Coffee      
     Mug that isn't in my project   assets," then a Coffee Mug project asset should exist. It's a       
     real asset in the film. Creating both a project   asset and a scene instance in one step is th     
      right data flow — the asset naturally becomes available for       other scenes too, which is      
     what you want.  - Borrow Option 3's UX insight. The current problem is two buttons doing the       
     same thing. The fix is:    - "Add from library" button → opens the existing asset drawer
     (browse/search existing project assets to add   to this scene)    - "Create new asset" button      
      opens a lightweight inline form (name, type dropdown, description) that         creates a
     project_asset + scene_asset_instance in a single API call  This gives you clear button
     differentiation, no schema changes, and the new asset correctly appears in Stage    5's global     
     list. The backend endpoint would be a single POST that inserts into both tables in a transact      

     · For 3B.7 (Remove Assets from Scene): The backend DELETE endpoint for scene_asset_instances       
     already exists. Should removing an asset from a scene also update the scene's
     expected_characters/expected_location/expected_props fields (the dependency columns), or shoul     
      we only delete the scene_asset_instance row and leave dependencies untouched? → Delete
     instance only
     · For 3B.8 (Persist Suggested Assets): The CLAUDE.md says 'NEVER RUN npm run migrate'. Should      
      write the migration SQL file for scene_asset_suggestions but NOT execute it (you'll run it        
     manually), or should this task be handled differently? → Write SQL, don't run
     · For 3B.9 (Shot Presence Flags): The Shot type has charactersForeground, charactersBackground     
      and setting fields. For props/locations, should we match by name against the shot's 'action'      
     and 'setting' text, or only match characters (which have explicit fields)? → Characters +
     locations only



● Good, those answers clarify the direction well. Let me ask a few more targeted follow-up questions.   

● User answered Claude's questions:
  ⎿  · For 3B.8: When should suggestions be computed and persisted - on first scene entry (Stage 8      
     load), after AI relevance detection, or both? → After AI detection
     · For 3B.6: The 'Create new asset' inline form - should it appear in the right sidebar panel       
     (replacing the current AssetDrawerTriggerPanel content), or as a modal/dialog overlay? → Inline
      in right panel
     · For 3B.6: The new backend endpoint that creates both project_asset + scene_asset_instance -      
     should this be a new route on the sceneAssets router (e.g., POST
     /:projectId/scenes/:sceneId/assets/create-with-project-asset), or added to the existing project    
      assets router? → Scene assets router (Recommended)
     · For 3B.7: Where should the 'Remove from scene' action appear in the UI? Should it be a
     button/icon on each asset card in SceneAssetListPanel, a context menu option, or in the editor     
     panel? → Editor panel action, Icon on asset card, Specifically, I'd put the primary "Remove        
     from scene" button in the editor panel (center), and optionally add   a subtle icon on the card    
      for power users. Here's why:  - Removing an asset is a consequential action. It needs a
     confirmation dialog (per the task spec). Placing it   in the editor panel — where the user is      
     already focused on a specific asset and can see its full context        (name, description,        
     image, tags) — means they're making an informed decision. A small trash icon on a compact
     card row in the left panel is easy to misclick, especially with checkboxes right next to it.  -    
      The editor panel is the action hub. It already has "Lock Asset" and "Generate Image" buttons      
     in the header    bar. Adding a "Remove from scene" button (perhaps as a destructive-styled
     outline button) fits the existing     pattern: select an asset, then take actions on it.  -        
     Right-click context menus (Option 2) are bad for discoverability. There's no existing context      
     menu pattern    in the app, and many us



● Now let me read the specific files I need for the implementation details.

● Read 3 files (ctrl+o to expand)

● Now let me read the backend routes and relevant services.

● Read 3 files (ctrl+o to expand)

● Let me read more of the backend routes (the DELETE endpoint) and the frontend service.

● Searched for 2 patterns, read 1 file (ctrl+o to expand)

● Let me check how shots are loaded in the context of scenes, and read the remaining types.

● Searched for 2 patterns, read 1 file (ctrl+o to expand)

● Let me also look at the project assets creation flow and the existing CreateSceneAssetInstanceSchema  
  to understand what I need for the new combined endpoint.

● Searched for 1 pattern, read 1 file (ctrl+o to expand)

● Let me check how project assets are created in the backend, and look at the asset types.

● Searched for 1 pattern, read 1 file (ctrl+o to expand)

● Now I have a thorough understanding of all the relevant code. Let me write the plan.

● Updated plan
  ⎿  /plan to preview

● Now let me ask a couple remaining questions before finalizing.

● User answered Claude's questions:
  ⎿  · For 3B.6: When a user creates a new asset via the inline form, should the new project_asset      
     be created with `locked: true` (immediately available for image generation) or `locked: false`     
     (requiring the user to lock it in Stage 5 first)? → locked: true (Recommended)

     · For 3B.8: What migration number should the file use? The latest existing migration appears to    
      be 022. Should I check for any higher-numbered migrations, or is 025 (with some buffer) the       
     right number? → use 024


  Summary

  3B.6 — "Add New Assets" Button Fix

  - Backend (backend/src/routes/sceneAssets.ts): Added POST
  /:projectId/scenes/:sceneId/assets/create-with-project-asset — atomically creates a project_asset +   
  scene_asset_instance in one transaction
  - Frontend service (src/lib/services/sceneAssetService.ts): Added createSceneAssetWithProjectAsset()  
  method
  - UI (Stage8VisualDefinition.tsx): AssetDrawerTriggerPanel now supports mode: 'default' | 'creating' —   "Create new asset" switches to an inline form with name, type dropdown, and description fields. The  
  panel header was renamed to "Add new assets"

  3B.7 — Remove Assets from Scene

  - VisualStateEditorPanel: Added destructive "Remove" button with Trash2 icon in the header bar        
  - SceneAssetListPanel: Added subtle X icon on each asset card (visible on hover, with stopPropagation)  - Stage8VisualDefinition: Added AlertDialog confirmation, deleteMutation using existing
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
  - SceneAssetListPanel: Asset cards now display small "S1", "S2" etc. badges below status tags when the   asset appears in those shots

  Verification

  - npm run lint — 0 new errors (all existing are pre-existing in unmodified files)
  - npm run build — succeeds, 2351 modules transformed