The plan is written. Here's a quick summary of what it covers:

  4 phases, 12 files touched (4 new, 8 modified):

  - Phase 0: Migration SQL + type updates (foundation for everything)
  - Phase 1 (3A.2): Deferred assets — tri-state radio in extraction modal, defer/restore from main view, collapsible        
  deferred section, Stage 8 integration
  - Phase 2 (3A.3): Manual asset addition — new AddAssetModal, scene_numbers field, Stage 8 auto-tracking scenes
  - Phase 3 (3A.6): Image carousel — new attempts table/service (up to 4 images), carousel component modeled after Stage 8's   pattern, integrate into upload/generate flows
  - Phase 4: Remove individual lock buttons (keep stage-level only), grid layout (2-3 cards per row), updated progress bar  

──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── Ready to code?

 Here is Claude's plan:
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌ Stage 5 Asset System Overhaul Plan

 Context

 Stage 5 (Asset Definition) currently has several UX limitations:
 1. Removing an asset permanently deletes it - no non-destructive "defer" option
 2. No way to manually add assets that extraction missed
 3. Single image per asset with no carousel - can't compare alternatives or delete an uploaded image
 4. Individual asset locking is tedious and overly rigid - assets become permanently uneditable
 5. Asset cards are displayed in a single column, wasting screen space

 This plan implements tasks 3A.2 → 3A.3 → 3A.6 plus locking removal and a grid layout improvement.

 ---
 Phase 0: Database Migration + Types (Foundation)

 0.1 — Create migration file

 Create: backend/migrations/023_stage5_asset_enhancements.sql

 Add to project_assets:
 - deferred BOOLEAN DEFAULT FALSE — defer flag (3A.2)
 - scene_numbers INTEGER[] DEFAULT '{}' — explicit scene associations (3A.3)
 - source TEXT DEFAULT 'extracted' CHECK (source IN ('extracted', 'manual', 'cloned')) — asset origin (3A.3)

 Create project_asset_generation_attempts table (3A.6):
 - Same pattern as migration 022_scene_asset_generation_attempts.sql but simplified
 - Columns: id, project_asset_id (FK CASCADE), image_url, storage_path, source ('generated'|'uploaded'), is_selected,       
 original_filename, file_size_bytes, mime_type, attempt_number, created_at, updated_at
 - Partial unique index: one is_selected=TRUE per project_asset_id
 - RLS policy chain: project_asset_generation_attempts → project_assets → projects → auth.uid()
 - updated_at trigger

 Note: Migration file written only, NOT executed.

 0.2 — Update TypeScript types

 Modify: src/types/asset.ts

 - Add to ProjectAsset: deferred?: boolean, scene_numbers?: number[], source?: 'extracted' | 'manual' | 'cloned'
 - Add AssetDecision type: 'keep' | 'defer' | 'delete'
 - Add ProjectAssetGenerationAttempt interface (simplified from scene version — no cost_credits, prompt_snapshot,
 copied_from_url)
 - Update AssetConfirmRequest.selectedEntities to include decision?: AssetDecision and sceneNumbers?: number[]

 ---
 Phase 1: Deferred Assets (3A.2)

 1.1 — Backend: deferred support in routes

 Modify: backend/src/routes/projectAssets.ts

 - POST /extract-confirm (line ~270): Accept decision and sceneNumbers per entity. Filter out decision='delete'. Pass       
 remaining to extraction service. On insert, set deferred=true for 'defer' entities, populate scene_numbers from each       
 entity's sceneNumbers array. Set source='extracted'.
 - PUT /:assetId (line ~522): Accept deferred in body. When provided, update it. Remove the locked check gate for this      
 field (deferred toggling should work regardless of lock state).
 - GET /:projectId/assets (line ~352): Return all assets (active + deferred). Frontend handles separation.
 - POST /lock-all (line ~1030): Only lock non-deferred assets (.eq('deferred', false)). Only validate images on
 non-deferred assets.

 1.2 — Frontend service: defer/restore methods

 Modify: src/lib/services/projectAssetService.ts

 - Update extractConfirm() payload to include decision and sceneNumbers per entity
 - Add deferAsset(projectId, assetId) — calls updateAsset with { deferred: true }
 - Add restoreAsset(projectId, assetId) — calls updateAsset with { deferred: false }

 1.3 — AssetFilterModal: tri-state radio per row

 Modify: src/components/pipeline/AssetFilterModal.tsx

 - Replace selectedKeys: Set<string> with decisions: Map<string, AssetDecision> (default all to 'keep')
 - Replace Checkbox with a compact 3-button toggle per entity row (Keep/Defer/Delete using styled Button variants with      
 conditional fills — green/amber/red)
 - Replace "Select All / None" per type with "Keep All / Defer All" buttons
 - Update onConfirm callback signature to pass Array<{ name, type, decision, sceneNumbers }>
 - Update footer counter: "Keep N, Defer N, Delete N"
 - Keep scene number badges on each row

 1.4 — Stage5Assets: deferred section + defer actions

 Modify: src/components/pipeline/Stage5Assets.tsx

 - Split assets into activeAssets / deferredAssets using assets.filter(a => !a.deferred) / assets.filter(a => a.deferred)   
 - groupedAssets only groups activeAssets
 - Add "Defer" option to each active asset's DropdownMenu (PauseCircle icon)
 - Add handleDeferAsset() and handleRestoreAsset() handlers
 - Add collapsible "Deferred Assets" section below the main groups:
   - Uses shadcn Collapsible / CollapsibleTrigger / CollapsibleContent
   - Header: "Deferred Assets (N)" with chevron toggle
   - Grid of compact cards showing: name, type badge, scene numbers, "Restore" button, "Delete" button
 - Update handleConfirmSelection() to pass decisions from the updated modal
 - Update canProceed: isStyleLocked && activeAssets.every(a => a.image_key_url) && activeAssets.length > 0
 - Update gatekeeper bar progress text to show active vs deferred counts

 1.5 — Stage 8 integration: deferred assets flow through

 Modify: backend/src/services/assetInheritanceService.ts

 - In bootstrapSceneAssetsFromProjectAssets() (line ~157): Currently filters .eq('locked', true). Change to include
 deferred assets too: query where (locked = true OR deferred = true). Deferred assets get instances with image_key_url:     
 null.

 ---
 Phase 2: Manual Asset Addition (3A.3)

 2.1 — Backend: manual create with scene_numbers

 Modify: backend/src/routes/projectAssets.ts

 - POST /:projectId/assets (line ~751): Accept scene_numbers (INTEGER[]) and source in body. Default source to 'manual'     
 when not from extraction. Include scene_numbers in insert.
 - Re-extraction safety: In extract-confirm, do NOT delete existing assets with source='manual' during re-extraction.       
 Verify the current flow only inserts (doesn't clear + re-insert).

 2.2 — Frontend: Add Asset modal

 Create: src/components/pipeline/AddAssetModal.tsx

 - Dialog with form fields:
   - Name (text input, required)
   - Type (select: character / prop / location)
   - Description (textarea, required)
   - Scene Numbers (optional multi-select or comma-separated input)
 - On submit: call projectAssetService.createAsset() with source: 'manual'
 - Use existing shadcn Dialog, Input, Textarea, Select components

 2.3 — Stage5Assets: "Add Asset" button

 Modify: src/components/pipeline/Stage5Assets.tsx

 - Add showAddAssetModal state
 - Add "Add Asset" button in the batch actions row (next to "Browse Global Library" and "Generate All Images")
 - Render <AddAssetModal> with isOpen={showAddAssetModal}, on submit refresh assets list
 - Import AddAssetModal from the new file

 2.4 — Stage 8: update scene_numbers when linking assets

 Modify: backend/src/routes/sceneAssets.ts

 - In POST /:projectId/scenes/:sceneId/assets (line ~164): After creating the scene_asset_instance, also update the
 project_asset's scene_numbers to include the current scene's number (append if not already present):
 UPDATE project_assets SET scene_numbers = array_append(scene_numbers, :sceneNumber)
 WHERE id = :projectAssetId AND NOT (:sceneNumber = ANY(scene_numbers))
 - (Requires fetching the scene's scene_number from the scenes table)

 ---
 Phase 3: Image Carousel + Delete (3A.6)

 3.1 — Backend: project asset attempts service

 Create: backend/src/services/projectAssetAttemptsService.ts

 - Model after backend/src/services/sceneAssetAttemptsService.ts (simplified):
   - MAX_ATTEMPTS = 4
   - Table: project_asset_generation_attempts
   - FK column: project_asset_id
   - Methods: listAttempts(assetId), createAttempt(assetId, data), selectAttempt(assetId, attemptId),
 deleteAttempt(assetId, attemptId), enforceAttemptCap(assetId), getNextAttemptNumber(assetId),
 backfillAttemptIfNeeded(assetId, currentImageUrl)
   - selectAttempt also updates project_assets.image_key_url to match selected attempt
   - deleteAttempt prevents deleting the currently selected attempt, cleans up storage

 3.2 — Backend: attempt routes

 Modify: backend/src/routes/projectAssets.ts

 Add at end of file:
 - GET /:projectId/assets/:assetId/attempts — list all attempts via projectAssetAttemptsService.listAttempts()
 - POST /:projectId/assets/:assetId/attempts/:attemptId/select — select attempt via
 projectAssetAttemptsService.selectAttempt()
 - DELETE /:projectId/assets/:assetId/attempts/:attemptId — delete attempt via projectAssetAttemptsService.deleteAttempt()  

 3.3 — Backend: update upload + generation to create attempts

 Modify: backend/src/routes/projectAssets.ts

 - POST /:assetId/upload-image (line ~887): After uploading to storage, call
 projectAssetAttemptsService.enforceAttemptCap() + createAttempt() with source='uploaded', is_selected=true instead of      
 directly setting image_key_url. The createAttempt + selectAttempt flow handles updating project_assets.image_key_url.      

 Modify: backend/src/services/image-generation/ImageGenerationService.ts

 - In executeJobInBackground() (line ~262): For master_asset jobs, after uploading to storage, create an attempt via        
 ProjectAssetAttemptsService.enforceAttemptCap() + createAttempt() with source='generated', is_selected=true. Keep the      
 existing project_assets.image_key_url update as a fallback (or let createAttempt handle it).

 3.4 — Frontend: service methods for attempts

 Modify: src/lib/services/projectAssetService.ts

 Add methods:
 - listAttempts(projectId, assetId): Promise<ProjectAssetGenerationAttempt[]>
 - selectAttempt(projectId, assetId, attemptId): Promise<ProjectAssetGenerationAttempt>
 - deleteAttempt(projectId, assetId, attemptId): Promise<void>

 3.5 — Frontend: carousel component

 Create: src/components/pipeline/ProjectAssetCarousel.tsx

 - Model after src/components/pipeline/Stage8/GenerationAttemptCarousel.tsx
 - Uses shadcn Carousel / CarouselContent / CarouselItem / CarouselPrevious / CarouselNext
 - Props: { projectId: string; assetId: string; disabled?: boolean }
 - React Query: ['project-asset-attempts', projectId, assetId]
 - Features: image display, position counter, select button (on non-selected), delete button (on non-selected), empty state 
  ("No image yet")
 - Simplified: no cost tracking tooltips, no prompt snapshots, no master_copy source
 - Selected image has gold border + "Selected" badge (same as Stage 8)
 - Lazy backfill: if asset has image_key_url but no attempts, call backfillAttemptIfNeeded on first load

 3.6 — Stage5Assets: integrate carousel

 Modify: src/components/pipeline/Stage5Assets.tsx

 - Replace the static image display block (line ~722-741) with <ProjectAssetCarousel projectId={projectId}
 assetId={asset.id} disabled={isStageLockedOrOutdated} />
 - Keep Generate/Upload buttons but they now create attempts (existing handlers + React Query invalidation refreshes        
 carousel)
 - After successful upload/generation, invalidate ['project-asset-attempts', projectId, assetId] query key

 ---
 Phase 4: Locking Removal + UI Grid

 4.1 — Remove individual lock UI

 Modify: src/components/pipeline/Stage5Assets.tsx

 - Remove the "Lock Asset" button from asset cards (line ~855-864)
 - Remove the handleLockAsset() function (line ~343-354)
 - Remove individual "Locked" badge from cards (line ~667-672)
 - Remove asset.locked && 'border-success bg-success/5' card styling (line ~643)
 - Remove disabled={asset.locked} from description textarea, generate/upload buttons — replace with
 disabled={isStageLockedOrOutdated} (stage-level control)
 - Update canProceed: remove allAssetsLocked check. New logic:
 const activeAssets = assets.filter(a => !a.deferred);
 const allActiveHaveImages = activeAssets.every(a => a.image_key_url);
 const canProceed = isStyleLocked && allActiveHaveImages && activeAssets.length > 0;
 - Update handleLockAllAssets(): remove the unlockedAssets.length > 0 check (line ~400-403). Only validate: style locked +  
 active assets have images + at least 1 active asset exists.

 4.2 — Backend: lock-all updates

 Modify: backend/src/routes/projectAssets.ts

 - POST /lock-all (line ~1030): Only lock active (non-deferred) assets. Remove requirement for assets to be individually    
 pre-locked. Add .eq('deferred', false) to the update query.

 4.3 — Asset card grid layout

 Modify: src/components/pipeline/Stage5Assets.tsx

 - Change card container from <div className="space-y-3"> (line ~632) to:
 <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
 - Compact card adjustments:
   - Reduce CardHeader padding
   - Description uses line-clamp-3 in collapsed state
   - Image carousel uses aspect-video but constrained to card width
   - Move expanded description editing to a modal or keep inline (card expands within grid cell)

 4.4 — Gatekeeper bar updates

 Modify: src/components/pipeline/Stage5Assets.tsx

 - Update progress text from "X/Y assets locked" to:
 X/Y active assets have images {deferredCount > 0 && '| N deferred'}
 - Button text stays "Lock All Assets & Begin Production"

 ---
 Files Summary
 ┌─────────────────────────────────────────────────────────────────┬────────┬────────────┐
 │                              File                               │ Action │   Phase    │
 ├─────────────────────────────────────────────────────────────────┼────────┼────────────┤
 │ backend/migrations/023_stage5_asset_enhancements.sql            │ Create │ 0          │
 ├─────────────────────────────────────────────────────────────────┼────────┼────────────┤
 │ src/types/asset.ts                                              │ Modify │ 0          │
 ├─────────────────────────────────────────────────────────────────┼────────┼────────────┤
 │ backend/src/routes/projectAssets.ts                             │ Modify │ 1, 2, 3, 4 │
 ├─────────────────────────────────────────────────────────────────┼────────┼────────────┤
 │ src/lib/services/projectAssetService.ts                         │ Modify │ 1, 2, 3    │
 ├─────────────────────────────────────────────────────────────────┼────────┼────────────┤
 │ src/components/pipeline/AssetFilterModal.tsx                    │ Modify │ 1          │
 ├─────────────────────────────────────────────────────────────────┼────────┼────────────┤
 │ src/components/pipeline/Stage5Assets.tsx                        │ Modify │ 1, 2, 3, 4 │
 ├─────────────────────────────────────────────────────────────────┼────────┼────────────┤
 │ backend/src/services/assetInheritanceService.ts                 │ Modify │ 1          │
 ├─────────────────────────────────────────────────────────────────┼────────┼────────────┤
 │ backend/src/routes/sceneAssets.ts                               │ Modify │ 2          │
 ├─────────────────────────────────────────────────────────────────┼────────┼────────────┤
 │ src/components/pipeline/AddAssetModal.tsx                       │ Create │ 2          │
 ├─────────────────────────────────────────────────────────────────┼────────┼────────────┤
 │ backend/src/services/projectAssetAttemptsService.ts             │ Create │ 3          │
 ├─────────────────────────────────────────────────────────────────┼────────┼────────────┤
 │ src/components/pipeline/ProjectAssetCarousel.tsx                │ Create │ 3          │
 ├─────────────────────────────────────────────────────────────────┼────────┼────────────┤
 │ backend/src/services/image-generation/ImageGenerationService.ts │ Modify │ 3          │
 └─────────────────────────────────────────────────────────────────┴────────┴────────────┘
 ---
 Key Patterns to Reuse

 - Carousel: src/components/pipeline/Stage8/GenerationAttemptCarousel.tsx — shadcn Carousel structure, select/delete        
 overlays
 - Attempts service: backend/src/services/sceneAssetAttemptsService.ts — cap enforcement, backfill, CRUD operations
 - Migration: backend/migrations/022_scene_asset_generation_attempts.sql — table structure, RLS policies, partial unique    
 index
 - Dialog: src/components/pipeline/AssetFilterModal.tsx — shadcn Dialog structure for AddAssetModal

 ---
 Verification

 1. Run lint: npm run lint from project root after all changes
 2. Manual test: Start dev server (npm run dev), test Stage 5:
   - Extract assets → verify tri-state radio works (Keep/Defer/Delete)
   - Confirm selection → verify deferred assets appear in collapsible section
   - Restore a deferred asset → moves back to active grid
   - Click "Add Asset" → manual form creates asset
   - Upload image → appears in carousel
   - Generate image → appears in carousel (2nd image)
   - Select/delete carousel items → image_key_url updates
   - "Lock All & Begin Production" → only locks active assets with images
   - Unlock stage → everything becomes editable again
   - Verify grid layout shows 2-3 cards per row on wider screens
 3. Stage 8 flow: Verify deferred assets appear in Stage 8 scene population
 4. Edge cases: Re-extract preserves manual assets, empty carousel state, 4-image cap enforcement