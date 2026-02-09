Resume this session with:
claude --resume b9d3b2b0-4446-42c1-b21c-577eecb77d64



The plan is complete. Here's a quick summary of what it covers:

  9 steps across 14 files (2 new, 12 modified):

  1. scriptManifest.ts — Pure-function deterministic TipTap JSON extractor (zero LLM, zero cost)
  2. Stage 4 persistence fix — Replace N per-scene LLM calls with one extractManifest() call
  3. Backend endpoints — extract-preview (instant) + extract-confirm (LLM only for selected)
  4. Frontend types — AssetPreviewEntity, AssetPreviewResponse, AssetConfirmRequest
  5. Frontend service — extractPreview() + extractConfirm() methods
  6. AssetFilterModal — Grouped checklist with Select All/None, scene badges, confirm button
  7. Stage5Assets — Two-step flow: scan → filter modal → confirm selection
  8. Stage 8 pre-population — Deterministic dependency matching first, AI detection as fallback
  9. Deprecation — Mark old LLM extraction as deprecated (kept for legacy)

──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── Ready to code?

 Here is Claude's plan:
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌ 3A.1 — Two-Pass Asset Extraction with Filter Modal

 Context

 Assets are currently extracted via expensive, unreliable LLM calls at multiple stages. During Stage 4 approval,
 sceneDependencyExtractionService.extractDependencies() runs N separate LLM calls (one per scene, each with 15s timeout) to     
 populate expected_characters, expected_location, expected_props on the scenes table. Then in Stage 5,
 assetExtractionService.extractAssets() aggregates those and runs LLM distillation for every entity — with no option for users  
 to filter out unwanted assets before the expensive generation step.

 The fix: Since Stage 4 now stores the script as structured TipTap JSON (tiptapDoc), we can deterministically extract all       
 entities (characters from dialogueLine nodes, locations from sceneHeading nodes, props from CAPS in action nodes) with zero    
 LLM calls. Then we split Stage 5 extraction into two passes with a filter modal in between, so users only pay for descriptions 
  they actually want.

 ---
 Step 1: Create backend/src/utils/scriptManifest.ts (NEW FILE)

 Pure-function utility — zero dependencies, zero LLM calls. Reference implementation in
 ._docs/newest-tickets-while-in-master/tiptap-json-extraction-guide.md.

 Exports:
 - getNodeText(node) — recursive text extraction from TipTap node
 - parseDialogueLine(text) — splits CHARACTER (V.O.): (whisper) "text" on first colon
 - extractManifest(tiptapDoc) — main orchestrator, returns ScriptManifest

 extractManifest logic:
 1. Walk doc.content, split on sceneHeading nodes to build scene boundaries
 2. Parse location from each heading via regex ^(INT|EXT)\.?\s+(.+?)(?:\s*-\s*(.+))?$/i
 3. Extract characters from dialogueLine nodes (name = text before first colon)
 4. Extract CAPS props from action nodes with ignore set (INT, EXT, DAY, NIGHT, CUT, FADE, etc. + known character names)        
 5. Enrich character presence by scanning action text for known character names
 6. Deduplicate globally by case-insensitive key

 Output shape:
 interface ScriptManifest {
   scenes: Array<{
     sceneNumber: number; heading: string; intExt: 'INT'|'EXT';
     location: string; timeOfDay: string|null;
     characters: string[]; speakingCharacters: string[];
     props: string[]; actionText: string;
   }>;
   globalCharacters: Map<string, { name: string; sceneNumbers: number[]; dialogueCount: number }>;
   globalLocations: string[];
   globalProps: Map<string, { name: string; sceneNumbers: number[]; contexts: string[] }>;
 }

 ---
 Step 2: Fix Stage 4 Scene Persistence (Deterministic Extraction)

 Replace N LLM calls with one extractManifest() call during "Approve Script".

 src/lib/services/scriptService.ts

 - Add tiptapDoc?: object parameter to persistScenes(projectId, scenes, tiptapDoc?)
 - Include tiptapDoc in the request body sent to PUT /api/projects/:id/scenes

 src/components/pipeline/Stage4MasterScript.tsx

 - In proceedWithApproval() (line 606): get editor?.getJSON() and pass to persistScenes()
 - Add editor to the useCallback dependency array

 backend/src/routes/projects.ts (lines 742-775)

 - Replace the for (const scene of scenes) loop that calls sceneDependencyExtractionService.extractDependencies() per scene     
 - New logic: if req.body.tiptapDoc exists, call extractManifest(tiptapDoc) once, map results by scene number to populate       
 dependenciesMap
 - Keep existing LLM loop as else fallback for legacy projects without tiptapDoc

 // BEFORE: N LLM calls (lines 750-775)
 for (const scene of scenes) {
   const deps = await sceneDependencyExtractionService.extractDependencies(heading, excerpt);
   dependenciesMap.set(key, deps);
 }

 // AFTER: Single deterministic extraction
 if (req.body.tiptapDoc) {
   const manifest = extractManifest(req.body.tiptapDoc);
   for (const mScene of manifest.scenes) { ... map to dependenciesMap ... }
 } else {
   // Legacy fallback (existing LLM code, unchanged)
 }

 ---
 Step 3: Add Backend Preview & Confirm Endpoints

 backend/src/routes/projectAssets.ts

 POST /:projectId/assets/extract-preview (instant, no LLM):
 1. Verify project ownership, get active branch
 2. Call extractionService.aggregatePreview(branchId) — reads populated expected_* from scenes table, deduplicates
 3. Fallback: if scenes have empty dependencies, fetch tiptapDoc from stage_states (stage 4), run extractManifest() on the fly  
 4. Return: { entities: PreviewEntity[], counts: { characters, locations, props } }

 POST /:projectId/assets/extract-confirm (LLM Pass 2 for selected only):
 1. Verify project ownership
 2. Validate req.body.selectedEntities: Array<{ name, type }>
 3. Get visual style capsule from Stage 5 state
 4. Call extractionService.extractSelectedAssets(branchId, selectedNames, visualStyleId) — filters aggregated entities to       
 selection, runs distillVisualSummary() only for those
 5. Save to project_assets table (same insert logic as existing extract)
 6. Return: ProjectAsset[]

 backend/src/services/assetExtractionService.ts

 New public methods (reusing existing internals):
 - aggregatePreview(branchId) — calls existing private aggregateSceneDependencies(), returns RawEntity[]
 - extractSelectedAssets(branchId, selectedNames, visualStyleId) — aggregate, filter by selection, run distillVisualSummary()   
 per selected entity

 Change: Make aggregateSceneDependencies() accessible (either public or called by the new methods).

 Mark existing extractAssets() as @deprecated.

 ---
 Step 4: Add Frontend Types

 src/types/asset.ts

 export interface AssetPreviewEntity {
   name: string;
   type: AssetType;
   sceneNumbers: number[];
   mentionCount: number;
 }

 export interface AssetPreviewResponse {
   entities: AssetPreviewEntity[];
   counts: { characters: number; locations: number; props: number };
 }

 export interface AssetConfirmRequest {
   selectedEntities: Array<{ name: string; type: AssetType }>;
 }

 ---
 Step 5: Add Frontend Service Methods

 src/lib/services/projectAssetService.ts

 - extractPreview(projectId) → POST /api/projects/${projectId}/assets/extract-preview
 - extractConfirm(projectId, selectedEntities) → POST /api/projects/${projectId}/assets/extract-confirm

 Same auth/error pattern as existing extractAssets().

 ---
 Step 6: Create src/components/pipeline/AssetFilterModal.tsx (NEW FILE)

 Pattern reference: AssetMatchModal.tsx (same Dialog structure).

 Props: { isOpen, onClose, entities: AssetPreviewEntity[], onConfirm(selected), isConfirming }

 UI layout:
 Dialog (max-w-2xl, scrollable)
 ├── Header: "Review Extracted Assets" + "{N} entities found"
 ├── Characters section
 │   ├── Header: icon + "Characters (N)" + [Select All / None]
 │   └── Per entity: [Checkbox] Name — Scene badges (Sc.1, Sc.3, ...)
 ├── Locations section (same pattern)
 ├── Props section (same pattern)
 └── Footer: [Cancel] [Confirm Selection (N assets)]

 State: selectedKeys: Set<string> keyed by ${type}:${name.toLowerCase()}, all selected by default.

 Components used: Dialog, Checkbox, Badge, Button from shadcn/ui; User, MapPin, Package, Loader2 from lucide-react.

 ---
 Step 7: Update Stage5Assets.tsx for Two-Pass Flow

 src/components/pipeline/Stage5Assets.tsx

 New state:
 const [previewEntities, setPreviewEntities] = useState<AssetPreviewEntity[]>([]);
 const [showFilterModal, setShowFilterModal] = useState(false);
 const [isConfirming, setIsConfirming] = useState(false);

 Replace handleExtractAssets with two-step flow:

 1. handleExtractAssets() → calls projectAssetService.extractPreview(projectId) → sets previewEntities → opens filter modal     
 2. handleConfirmSelection(selectedEntities) → calls projectAssetService.extractConfirm(projectId, selected) → sets assets →    
 closes modal → sets hasExtracted = true

 Button text change: "Extract Characters, Props & Locations" → "Scan Script for Assets"

 Add JSX: <AssetFilterModal ... /> alongside existing AssetDrawer.

 ---
 Step 8: Stage 8 Pre-Population from Dependencies

 backend/src/routes/sceneAssets.ts

 Add POST /:projectId/scenes/:sceneId/assets/populate-from-dependencies:
 1. Fetch scene's expected_characters, expected_location, expected_props
 2. Fetch all locked project_assets for the branch
 3. Case-insensitive name matching → create scene_asset_instances
 4. Return created instances

 src/components/pipeline/Stage8VisualDefinition.tsx

 Modify handleDetectAndPopulateAssets:
 - Try deterministic pre-population first (instant, no LLM)
 - If it returns results, use those
 - If empty/fails, fall back to existing AI relevance detection
 - Keep "Detect Required Assets (AI)" button as secondary refinement

 src/lib/services/sceneAssetService.ts

 Add populateFromDependencies(projectId, sceneId) service method.

 ---
 Step 9: Deprecation

 backend/src/services/sceneDependencyExtraction.ts

 - Add @deprecated JSDoc tags to the class and extractDependencies() method
 - Add console warning when LLM path is invoked (track legacy usage)
 - Do NOT delete — keep as fallback for projects without tiptapDoc

 ---
 Implementation Order & Dependencies

 Step 1: scriptManifest.ts (pure utility, no deps)
   ↓
 Step 2: Scene persistence fix (depends on Step 1)
   ↓
 Step 3: Backend endpoints (depends on Steps 1 & 2)
   ↓
 Step 4: Frontend types (no deps, can parallel with Steps 1-3)
   ↓
 Step 5: Frontend service methods (depends on Step 4)
   ↓
 Step 6: AssetFilterModal component (depends on Step 4)
   ↓
 Step 7: Stage5Assets integration (depends on Steps 5 & 6)
   ↓
 Step 8: Stage 8 pre-population (depends on Step 2, independent of Steps 3-7)
   ↓
 Step 9: Deprecation markers (after all verified)

 ---
 Files Summary
 ┌────────────────────────────────────────────────────┬───────────────────┬─────────────────────────────────────────────────┐   
 │                        File                        │      Action       │                     Purpose                     │   
 ├────────────────────────────────────────────────────┼───────────────────┼─────────────────────────────────────────────────┤   
 │ backend/src/utils/scriptManifest.ts                │ NEW               │ Deterministic TipTap extraction                 │   
 ├────────────────────────────────────────────────────┼───────────────────┼─────────────────────────────────────────────────┤   
 │ backend/src/routes/projects.ts                     │ MODIFY (L742-775) │ Replace LLM loop with extractManifest()         │   
 ├────────────────────────────────────────────────────┼───────────────────┼─────────────────────────────────────────────────┤   
 │ backend/src/routes/projectAssets.ts                │ MODIFY            │ Add extract-preview + extract-confirm           │   
 ├────────────────────────────────────────────────────┼───────────────────┼─────────────────────────────────────────────────┤   
 │ backend/src/services/assetExtractionService.ts     │ MODIFY            │ Add aggregatePreview(), extractSelectedAssets() │   
 ├────────────────────────────────────────────────────┼───────────────────┼─────────────────────────────────────────────────┤   
 │ backend/src/services/sceneDependencyExtraction.ts  │ MODIFY            │ Deprecation markers                             │   
 ├────────────────────────────────────────────────────┼───────────────────┼─────────────────────────────────────────────────┤   
 │ backend/src/routes/sceneAssets.ts                  │ MODIFY            │ Add populate-from-dependencies                  │   
 ├────────────────────────────────────────────────────┼───────────────────┼─────────────────────────────────────────────────┤   
 │ src/types/asset.ts                                 │ MODIFY            │ Add preview/confirm types                       │   
 ├────────────────────────────────────────────────────┼───────────────────┼─────────────────────────────────────────────────┤   
 │ src/lib/services/projectAssetService.ts            │ MODIFY            │ Add extractPreview(), extractConfirm()          │   
 ├────────────────────────────────────────────────────┼───────────────────┼─────────────────────────────────────────────────┤   
 │ src/lib/services/scriptService.ts                  │ MODIFY            │ Add tiptapDoc param to persistScenes()          │   
 ├────────────────────────────────────────────────────┼───────────────────┼─────────────────────────────────────────────────┤   
 │ src/lib/services/sceneAssetService.ts              │ MODIFY            │ Add populateFromDependencies()                  │   
 ├────────────────────────────────────────────────────┼───────────────────┼─────────────────────────────────────────────────┤   
 │ src/components/pipeline/AssetFilterModal.tsx       │ NEW               │ Filter modal UI                                 │   
 ├────────────────────────────────────────────────────┼───────────────────┼─────────────────────────────────────────────────┤   
 │ src/components/pipeline/Stage5Assets.tsx           │ MODIFY            │ Two-pass extraction flow                        │   
 ├────────────────────────────────────────────────────┼───────────────────┼─────────────────────────────────────────────────┤   
 │ src/components/pipeline/Stage4MasterScript.tsx     │ MODIFY            │ Pass tiptapDoc to persistScenes                 │   
 ├────────────────────────────────────────────────────┼───────────────────┼─────────────────────────────────────────────────┤   
 │ src/components/pipeline/Stage8VisualDefinition.tsx │ MODIFY            │ Pre-populate from deps                          │   
 └────────────────────────────────────────────────────┴───────────────────┴─────────────────────────────────────────────────┘   
 ---
 Verification

 1. Stage 4 approval: Approve a script → verify scenes.expected_* columns are populated (no LLM log lines, instant)
 2. extract-preview: Call endpoint → verify instant response with correct entities grouped by type, scene numbers accurate      
 3. Filter modal: Open → verify all checked by default, Select All/None works, count updates, scene badges correct
 4. extract-confirm: Deselect 2-3 entities → confirm → verify only selected entities create project_assets, LLM called only for 
  those
 5. Full flow: Stage 4 → Stage 5 → lock style → scan → filter → confirm → review assets → generate images → lock
 6. Legacy compat: Project approved before this change → extract-preview falls back to tiptapDoc from stage_states
 7. Stage 8: Open scene → verify pre-populated assets from dependencies → AI detection still works as refinement
 8. Regression: Existing asset ops (lock, merge, promote, clone, delete, upload) unaffected
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌

This Tiptap guide is extremely clarifying. It reveals that:

  1. The current expected_* columns on scenes are EMPTY — sceneService.previewScenes() explicitly sets expectedCharacters: [],  
  expectedProps: [], expectedLocation: ''. So the existing Stage 5 aggregation is aggregating nothing.
  2. Pass 1 doesn't need an LLM at all — the Tiptap JSON structure enables deterministic extraction of characters (from
  dialogueLine nodes), locations (from sceneHeading nodes), and props (from action nodes). This is free, instant, and accurate. 
  3. The only LLM cost is Pass 2 — generating visual descriptions for selected entities.

  This completely reframes the architecture. Let me now ask the right questions:

● User answered Claude's questions:
  ⎿  · Pass 2 (extract-confirm) will generate LLM visual descriptions for selected assets. Should it ALSO auto-trigger image    
      generation for all selected assets in batch, or should image generation remain the separate manual per-asset step it      
     currently is? → Descriptions only (Recommended)
     · Stage 8 currently uses a sophisticated AI relevance service (analyzes shot list, inheritance chains, status tags) to     
     detect which assets a scene needs. The task says to 'use dependencies for auto-suggestions instead of AI relevance
     detection.' How deep should the Stage 6/8 optimization go in THIS task? → Pre-populate from dependencies, keep AI
     option

     · The Tiptap guide says scenes' expected_* columns are currently empty. Should this task ALSO fix Stage 4's scene
     persistence to populate those columns from the tiptapDoc manifest, or is that already handled/a separate concern? →
     Yes, fix Stage 4 persistence too (Recommended)
     · The Tiptap guide proposes a `script-manifest.ts` utility for deterministic extraction. Should it live on frontend        
     (client-side before API call), backend (server-side during extraction), or both? → Backend only (Recommended)

● Clear answers. Let me ask two final clarifying questions before I design the implementation.

● User answered Claude's questions:
  ⎿  · The task says to populate `scenes.dependencies` as a new JSONB column. But scenes already has
     `expected_characters[]`, `expected_location`, `expected_props[]`, and `dependencies_extracted_at` columns (from
     migration 011). Should we add a NEW JSONB column, or just populate the existing columns that are currently empty? →        
     Populate existing columns (Recommended)
     · Should the filter modal allow users to ADD custom entities that Pass 1 didn't detect (e.g., a prop mentioned subtly      
     that deterministic extraction missed), or only allow REMOVING entities from the detected list? → Remove only
     (Recommended)


# *dev Summary*:
  Summary of Changes

  New Files (2)
  File: backend/src/utils/scriptManifest.ts
  Purpose: Pure-function deterministic TipTap extraction — zero LLM calls, extracts characters, locations, props from structured

    JSON
  ────────────────────────────────────────
  File: src/components/pipeline/AssetFilterModal.tsx
  Purpose: Dialog for reviewing/filtering extracted entities before LLM generation
  Modified Files (12)

  Backend:
  - backend/src/routes/projects.ts — PUT /:id/scenes now accepts tiptapDoc, uses extractManifest() for instant extraction with LLM fallback
  - backend/src/routes/projectAssets.ts — Added extract-preview (instant, no LLM) and extract-confirm (LLM Pass 2 for selected only) endpoints
  - backend/src/routes/sceneAssets.ts — Added populate-from-dependencies endpoint for deterministic Stage 8 pre-population      
  - backend/src/services/assetExtractionService.ts — Added aggregatePreview() and extractSelectedAssets() public methods; marked   extractAssets() as deprecated
  - backend/src/services/sceneDependencyExtraction.ts — Added @deprecated markers and console warning when legacy LLM path is invoked

  Frontend:
  - src/types/asset.ts — Added AssetPreviewEntity, AssetPreviewResponse, AssetConfirmRequest types
  - src/lib/services/projectAssetService.ts — Added extractPreview() and extractConfirm() methods
  - src/lib/services/sceneAssetService.ts — Added populateFromDependencies() method
  - src/lib/services/scriptService.ts — persistScenes() now accepts optional tiptapDoc parameter
  - src/components/pipeline/Stage4MasterScript.tsx — proceedWithApproval() passes editor.getJSON() to persistScenes()
  - src/components/pipeline/Stage5Assets.tsx — Two-pass flow: scan (instant) → filter modal → confirm (LLM); button renamed to 'Scan Script for Assets'
  - src/components/pipeline/Stage8VisualDefinition.tsx — handleDetectAndPopulateAssets tries deterministic pre-population first, falls back to AI detection