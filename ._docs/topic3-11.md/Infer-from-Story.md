❯  Please read and understand  the following document:   'c:/Users/Daniel Lopez                                                         
/Desktop/Aiuteur/wizardirector/._docs/3.7-phase-2-story-context-updates.md'                                                             
It covers the requirements of what we will building in full in this session.                                                            
Unless anything is unclear or you have some recommendations, in which please ask me questions, please  build                            
this out    
  
 I now have a complete understanding of the codebase. Let me build this out. Here's the plan:

  1. Backend: New storyContextService.ts — assembles scene story context from Stages 2/3/7
  2. Backend: Two new endpoints in sceneAssets.ts — infer-context and bulk-infer-context
  3. Frontend types: StoryContextSuggestion in scene.ts
  4. Frontend service: inferContext() and bulkInferContext() in sceneAssetService.ts
  5. Frontend: "Infer from Story" button + suggestion preview in VisualStateEditorPanel.tsx
  6. Frontend: "Bulk Update from Context" button in SceneAssetListPanel.tsx
  7. Frontend: New BulkContextUpdateModal.tsx

  Let me start building.

  
  Summary

  New Files

  1. backend/src/services/storyContextService.ts — Assembles scene story context from Stages 2/3/7 and calls LLM to infer asset
  descriptions and tags. Supports single-asset and bulk inference (batches ≤4 assets into one LLM call, parallelizes larger sets).      
  2. src/components/pipeline/Stage8/BulkContextUpdateModal.tsx — Review modal with per-asset accept/reject checkboxes, side-by-side     
  current vs suggested descriptions, tag diffs with +new indicators, collapsible reasoning, and Select All/Deselect All controls.       

  Modified Files

  3. backend/src/routes/sceneAssets.ts — Added two endpoints:
    - POST /:projectId/scenes/:sceneId/assets/:instanceId/infer-context (single asset)
    - POST /:projectId/scenes/:sceneId/bulk-infer-context (bulk, with Zod validation)
  4. src/types/scene.ts — Added StoryContextSuggestion and BulkStoryContextResult interfaces.
  5. src/lib/services/sceneAssetService.ts — Added inferContext() and bulkInferContext() API client methods.
  6. src/components/pipeline/Stage8/VisualStateEditorPanel.tsx — Added "Infer from Story" button next to the description textarea, with 
   inline suggestion preview (description, tags, collapsible reasoning) and Accept Description / Accept Tags / Accept Both / Dismiss    
  buttons.
  7. src/components/pipeline/Stage8/SceneAssetListPanel.tsx — Added "Update from Context (N)" bulk button, visible when assets are      
  checkbox-selected.
  8. src/components/pipeline/Stage8VisualDefinition.tsx — Wired up bulk context inference state, handlers (handleBulkInferContext,      
  handleApplyBulkContext), and the BulkContextUpdateModal.

  Key Design Decisions

  - Tags are ADDITIVE: Suggested tags merge with existing (deduplicated), never replace
  - Batching: ≤4 assets → single LLM call; >4 → parallel individual calls
  - Non-destructive: Accepted descriptions save via the existing onUpdateAsset flow (which creates version history entries via
  textFieldVersionService)
  - Context reuse: Story context (script, beats, treatment, shots) is fetched once per bulk call, reused across all assets

Test Results

  Backend Tests (Jest) — 15/15 passed

  - storyContextService.test.ts — Tests response parsing (clean JSON, markdown-wrapped, surrounding text, missing fields, error cases)  
  and prompt assembly (shot formatting, edge cases)

  Frontend Service Tests (Vitest) — 11/11 passed

  - sceneAssetService.inferContext.test.ts — Tests inferContext() (POST, auth header, API errors, auth failure, server errors) and      
  bulkInferContext() (POST with instanceIds, auth, errors, empty results, no-change results)

  Full Frontend Suite — 242/242 passed (15 test files)

  All existing tests plus our new tests pass.

  E2E Tests (Playwright) — 9/9 passed

  - Smoke: Auth page loads, dashboard loads after login
  - Per-Asset: "Infer from Story" button visible, loading state shows during inference, suggestion panel displays with Accept buttons   
  after LLM completes
  - Bulk: "Update from Context" button appears when assets selected, hidden when none selected, loading state during bulk inference,    
  review modal opens with Select All / Apply Selected / Cancel controls


  
❯ how can I test this myself in the UI, (in a time effeicent manner, like give me the steps I should do in the front end myself)        

● Quick Manual Test Steps

  Per-Asset: "Infer from Story"

  1. Open your project → Script Hub → click a scene with "Shot List" badge → Enter Scene Pipeline
  2. Navigate to Stage 8 (if not already there)
  3. Click any asset in the left sidebar to select it
  4. In the editor panel, scroll to just below the description textarea — you'll see the "Infer from Story" button
  5. Click it → watch for "Analyzing..." loading state → a green suggestion panel appears with:
    - Suggested description (side-by-side with current)
    - Suggested tags (green badges with + prefix)
    - Collapsible reasoning
    - Accept Description / Accept Tags / Accept Both buttons
  6. Click "Accept Both" to apply, or the X to dismiss

  Bulk: "Update from Context"

  1. Same Stage 8 view — check the checkboxes on 2-3 assets in the left sidebar
  2. A new button appears: "Update from Context (N)" — click it
  3. Wait for the LLM to finish (shows "Inferring...")
  4. A review modal opens showing all assets with:
    - Current vs suggested descriptions side-by-side
    - New tags highlighted in green
    - Per-asset checkboxes to accept/reject
    - Select All / Deselect All at top
  5. Toggle which suggestions to keep → click "Apply Selected"

  That's it — two flows, ~2 minutes total to verify both.