  Implementation Complete: Transformation Event System

  Phase 1: Database Migration

  - backend/migrations/030_transformation_events.sql — New transformation_events table with all columns (type,
  trigger/completion shots, pre/post descriptions, narrative, images, status tags, detection source, confirmation).        
  Includes indexes, RLS policies matching migration 015 pattern, and updated_at trigger. Also adds transformation_flags    
  JSONB column to shots table.

  Phase 2: Backend Service

  - backend/src/services/transformationEventService.ts — Core service with:
    - resolveOverridesForShot() — The resolution algorithm that determines which description to use per-shot based on      
  transformation boundaries (instant/gradual/within_shot)
    - CRUD methods (create, update, confirm, delete, getForScene)
    - generatePostDescription() — LLM-powered post-description generation
    - getLastAssetStateForInheritance() — Returns the last transformation's post-state for cross-scene inheritance

  Phase 3: Stage 7 Shot Extraction

  - backend/src/services/shotExtractionService.ts — Extended ExtractedShot with TransformationFlag[], added
  transformation_flags to LLM prompt schema and output parsing, with safe validation
  - backend/src/routes/projects.ts — Persists transformation_flags to DB during shot insertion

  Phase 4: Stage 8 Backend + Frontend

  - Backend routes (backend/src/routes/sceneAssets.ts) — 7 new endpoints for transformation event CRUD, confirmation, AI   
  post-description generation, and post-image generation
  - Frontend service (src/lib/services/transformationEventService.ts) — API client for all endpoints
  - Frontend types (src/types/scene.ts) — TransformationType, TransformationFlag, TransformationEvent,
  PromptSetTransformationContext types; extended Shot and PromptSet
  - UI Components:
    - TransformationEventCard.tsx — Yellow/green bordered cards with confirm/dismiss/edit
    - AddTransformationDialog.tsx — Manual creation dialog with shot selector and type picker
    - VisualStateEditorPanel.tsx — Replaced "Stage 10" text with full transformation events section
  - Lock gating (Stage8VisualDefinition.tsx) — Blocks proceeding to Stage 9 if unconfirmed/incomplete events exist

  Phase 5: Stage 9 Prompt Generation (Critical Path)

  - promptGenerationService.ts:
    - buildAssetContext() now accepts ShotAssetOverride[] to swap descriptions and mark transforming assets
    - generateBulkPromptSets() resolves per-shot overrides from transformation events
    - generateVideoPrompt() injects transformation narrative for within_shot events (overrides "no appearance" rule)       
    - generateEndFramePrompt() uses post-transformation descriptions for within_shot end frames
  - Route modifications (projects.ts, frames.ts) — Fetch confirmed events and pass to prompt generation
  - Stage 9 UI (Stage9PromptSegmentation.tsx) — Per-shot transformation state badges (Pre-Transform / Transforming /       
  Post-Transform)

  Phase 6: Cross-Scene Inheritance

  - assetInheritanceService.ts — getInheritableAssetStates() now checks transformation events; if asset transformed in     
  prior scene, inherits post-state
  - sceneAssetRelevanceService.ts — getLastInstancePerAsset() similarly uses post-state from transformation events for     
  relevance context

  Verification

  - Frontend: TypeScript clean, ESLint 0 errors (4 pre-existing warnings), 43/43 tests pass, build succeeds
  - Backend: TypeScript clean, 97 tests pass (7 pre-existing failures in image-generation.test.ts unrelated to changes)    

---

Testing:

 Here's a single end-to-end scenario that hits every critical path in ~15 minutes:

  Prerequisites

  1. Run the migration first:
  -- Execute 030_transformation_events.sql against your Supabase DB

  2. Rebuild backend: cd backend && npm run build

  ---
  The One Scene That Tests Everything

  Pick (or create) a project with a scene where a character visibly changes mid-scene — e.g., a character puts on a       
  disguise, gets injured, transforms magically, etc. If you don't have one, write a 3-4 shot scene like:

  Shot 1: Princess in white dress enters the cave.
  Shot 2: She touches the dark crystal — her dress turns black, her hair goes silver.
  Shot 3: She walks out, now in the dark form.

  Test 1: Stage 7 — Extraction Detection (2 min)

  - Go to Stage 7, extract shots for the scene
  - Check: Open the shot data (Network tab or DB) — does transformation_flags appear on the shot where the visual change  
  happens?
  - Pass if: At least one shot has transformation_flags with character_name, type, and is_trigger: true. If the LLM misses   it (non-deterministic), that's fine — manual creation in Stage 8 is the fallback.

  Test 2: Stage 8 — The Full CRUD Loop (5 min)

  This is the highest-value test. Do these in order:

  Step: 2a
  Action: Enter Stage 8, select the character asset
  What to verify: Transformation section appears below the description textarea (not "Stage 10" text)
  ────────────────────────────────────────
  Step: 2b
  Action: Click "Add Transformation"
  What to verify: Dialog opens with shot selector, type picker, description fields
  ────────────────────────────────────────
  Step: 2c
  Action: Create a manual within_shot event: pick trigger shot, type "within_shot", write a post-description and narrative  What to verify: Card appears with yellow border, "AI Detected" absent (manual), Confirm/Dismiss buttons visible
  ────────────────────────────────────────
  Step: 2d
  Action: Click "Generate with AI" on the post-description
  What to verify: Post-description populates from LLM (may take a few seconds)
  ────────────────────────────────────────
  Step: 2e
  Action: Try to proceed to Stage 9 without confirming
  What to verify: Should be blocked with toast: "unconfirmed transformation event(s)"
  ────────────────────────────────────────
  Step: 2f
  Action: Click Confirm on the event
  What to verify: Card turns green border, Confirm button disappears
  ────────────────────────────────────────
  Step: 2g
  Action: Now proceed to Stage 9
  What to verify: Should succeed

  That single sequence validates: creation, AI generation, lock gating, confirmation, and the full UI flow.

  Test 3: Stage 9 — Prompt Generation (3 min)

  - In Stage 9, click "Generate All Prompts"
  - Check these shots:
    - Before trigger shot: frame prompt should use the original character description
    - Trigger shot (within_shot): Should show an "Transforming" badge. The video prompt should mention the transformation 
  narrative
    - After trigger shot: frame prompt should use the post-transformation description, badge shows "Post-Transform"       

  Quick validation: Expand the trigger shot card and read the video prompt — does it reference the transformation? That's 
  the critical signal.

  Test 4: Cross-Scene Inheritance (3 min)

  - Go to the next scene (Scene N+1)
  - Enter Stage 8
  - When assets are detected/inherited, check the character's effective_description
  - Pass if: It shows the post-transformation description (dark form), not the original (white dress)

  ---
  Priority Ranking If You're Short on Time

  ┌──────────┬────────────────────────────┬─────────────────────────────────────────────────────────────────────────┐     
  │ Priority │            Test            │                                   Why                                   │     
  ├──────────┼────────────────────────────┼─────────────────────────────────────────────────────────────────────────┤     
  │ P0       │ Test 2 (Stage 8 CRUD)      │ This is the user-facing entry point; if this breaks, nothing else works │     
  ├──────────┼────────────────────────────┼─────────────────────────────────────────────────────────────────────────┤     
  │ P0       │ Test 3 (prompt generation) │ The whole point — wrong descriptions = wrong video output               │     
  ├──────────┼────────────────────────────┼─────────────────────────────────────────────────────────────────────────┤     
  │ P1       │ Test 4 (inheritance)       │ Continuity breaks are the costliest bug in production                   │     
  ├──────────┼────────────────────────────┼─────────────────────────────────────────────────────────────────────────┤     
  │ P2       │ Test 1 (auto-detection)    │ Nice-to-have; manual creation is the reliable fallback                  │     
  └──────────┴────────────────────────────┴─────────────────────────────────────────────────────────────────────────┘     

  Edge Case Worth One Extra Minute

  After Test 2f (confirmed event), go back and delete the event → try proceeding to Stage 9. It should succeed with no    
  events. This validates the dismiss/delete path.

  I almost got l