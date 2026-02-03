#\# Phase 5: Asset Inheritance & Stage 8

\*\*Goal\*\*: Implement stateful asset system. Assets evolve across scenes with condition tracking.

\#\#\# Feature 5.1: Scene Asset Instances  
\*\*Purpose\*\*: Scene-specific asset variations  
\- \[ \] Implement \`scene\_asset\_instances\` table  
\- \[ \] Create asset inheritance logic (Scene N → Scene N+1)  
\- \[ \] Build scene asset state propagation  
\- \[ \] Add asset modification tracking  
\- \[ \] Implement scene-specific image key generation

# Task 5.1: **IMPLEMENTATION SUMMARY**:

Task 1: Ran MIGRATION: 016_...-.sql
---

## Task 2: Type definitions

### 1. `src/types/scene.ts`
- **Imported** `ProjectAsset` from `./asset`.
- **Added** `SceneAssetInstance` (aligned with migration 015): `id`, `scene_id`, `project_asset_id`, `description_override`, `image_key_url`, `status_tags`, `carry_forward`, `inherited_from_instance_id`, `project_asset?`, `effective_description`, `created_at`, `updated_at`.
- **Added** `CreateSceneAssetInstanceRequest` and `UpdateSceneAssetInstanceRequest`.
- **Added** `SceneAssetRelevanceResult` (relevant_assets, new_assets_required).
- **Updated** `Scene`: added `assetInstances?: SceneAssetInstance[]`.
- **Kept** `SceneAsset` with a short comment that new code should use `SceneAssetInstance`.

### 2. `backend/src/services/contextManager.ts`
- **Added** `SceneAssetInstanceContext` (id, scene_id, project_asset_id, description_override, image_key_url, status_tags, carry_forward, inherited_from_instance_id, effective_description, project_asset?).
- **Updated** `LocalContext`: `sceneAssets` is now `SceneAssetInstanceContext[]` instead of `any[]`.

---

## Task 4: AssetInheritanceService and route

### 1. `backend/src/services/assetInheritanceService.ts` (new)
- **`getPriorScene(sceneId)`** – returns prior scene in same branch, or null for scene 1.
- **`getInheritableAssetStates(priorSceneId)`** – returns inherited state per instance (carry_forward vs reset to project_asset base), including `baseDescription` for `effective_description`.
- **`bootstrapSceneAssetsFromProjectAssets(sceneId, branchId)`** – Scene 1 only; creates instances from locked `project_assets`, no inheritance.
- **`inheritAssetsFromPriorScene(currentSceneId, branchId)`** – Scene 1 → bootstrap; Scene N → inherit from N−1 with temporal checks.
- **`getInheritanceChain(instanceId)`** – walks `inherited_from_instance_id` and returns chain (root first).

Exported types: `InheritanceSource`, `InheritedAssetState`, `InheritanceChainNode`.

### 2. `backend/src/routes/sceneAssets.ts` (new)
- **POST** `/api/projects/:projectId/scenes/:sceneId/assets/inherit`  
  - Checks project ownership, scene in branch, no existing instances.  
  - Calls `AssetInheritanceService.inheritAssetsFromPriorScene`.  
  - Returns `{ message, count }`.

### 3. `backend/src/server.ts`
- **Registered** `sceneAssetsRouter` under `/api/projects` (with auth).

---

## Task 3 done: Scene Asset Instance CRUD routes

### 1. **`backend/src/routes/sceneAssets.ts`** (updated)

- **Validation (Zod)**  
  - `CreateSceneAssetInstanceSchema`: `projectAssetId` (uuid), optional `descriptionOverride`, `statusTags`, `carryForward`, `inheritedFromInstanceId`.  
  - `UpdateSceneAssetInstanceSchema`: optional/nullable `descriptionOverride`, `imageKeyUrl` (url), `statusTags`, `carryForward`.

- **CRUD endpoints**
  - **GET** `/api/projects/:projectId/scenes/:sceneId/assets` — List instances for a scene with joined `project_asset` (id, name, asset_type, description, image_key_url, visual_style_capsule_id). Checks project ownership and that scene belongs to project’s active branch.
  - **POST** `/api/projects/:projectId/scenes/:sceneId/assets` — Create instance (manual or with `inheritedFromInstanceId`). Validates project/scene/project_asset, computes `effective_description`, returns 409 on unique (scene_id, project_asset_id) violation.
  - **PUT** `/api/projects/:projectId/scenes/:sceneId/assets/:instanceId` — Update instance (description override, image_key_url, status_tags, carry_forward). Recomputes `effective_description` when `descriptionOverride` is sent. Request body uses camelCase; DB columns use snake_case (mapping done in code). No automatic image regeneration.
  - **DELETE** `/api/projects/:projectId/scenes/:sceneId/assets/:instanceId` — Delete instance; returns 204.

- **Existing route kept**  
  - **POST** `/api/projects/:projectId/scenes/:sceneId/assets/inherit` — Unchanged; defined after the create route so `/assets/inherit` is not matched as `:instanceId`.

### 2. **Server**

- `sceneAssetsRouter` was already registered in `server.ts` under `app.use('/api/projects', authenticateUser, sceneAssetsRouter)`. No change.

### 3. **Testing with Postman/curl**

Use a valid auth token (e.g. from login) in `Authorization: Bearer <token>`.

---

## Task 5: Context Manager – Local Context Assembly

**File: `backend/src/services/contextManager.ts`**

1. **`LocalContext` and scene asset type**
   - Replaced `SceneAssetInstanceContext` with `LocalContextSceneAsset`: `name`, `type`, `description`, `statusTags`, `imageKeyUrl`.
   - `LocalContext.sceneAssets` is now `LocalContextSceneAsset[]`.

2. **`assembleLocalContext`**
   - Loads the scene from `scenes` (`id`, `script_excerpt`, `end_state_summary`) via `this.db.supabase`.
   - Loads `scene_asset_instances` with joined `project_assets` (`id`, `name`, `asset_type`, `description`, `image_key_url`).
   - Maps to `LocalContextSceneAsset[]` using `effective_description`, `status_tags`, and `image_key_url` (instance or project_asset).
   - Returns `sceneId`, `sceneScript`, `previousSceneEndState`, `sceneAssets`.
   - Throws `ContextManagerError` with code `SCENE_NOT_FOUND` when the scene is missing.

---

## Task 6: Image Generation – Scene-Specific Image Keys

**File: `backend/src/services/image-generation/ImageGenerationService.ts`**

1. **`CreateImageJobRequest.jobType`**
   - Added `'scene_asset'`.

2. **Visual style**
   - Visual style capsule is required for both `master_asset` and `scene_asset`.

3. **`createSceneAssetImageJob(sceneInstanceId, projectId, branchId, visualStyleCapsuleId)`**
   - Loads the scene asset instance (with `project_asset.asset_type`).
   - Uses `effective_description` as the prompt and `ASPECT_RATIOS[asset_type]` for size.
   - Calls `createImageJob` with `jobType: 'scene_asset'`, `assetId`, `sceneId`, and an idempotency key.

4. **Storage path**
   - For `scene_asset`:  
     `project_{projectId}/branch_{branchId}/scene_{sceneId}/scene-assets/{assetId}_{timestamp}_{random}.png`.

5. **Completion**
   - When a `scene_asset` job completes, `scene_asset_instances` is updated:  
     `image_key_url` set by `scene_id` + `project_asset_id`.

**File: `backend/src/routes/sceneAssets.ts`**

- **POST** `/:projectId/scenes/:sceneId/assets/:instanceId/generate-image`
  - Checks project ownership and that Stage 5 has a locked visual style (`locked_visual_style_capsule_id`).
  - Calls `ImageGenerationService.createSceneAssetImageJob(instanceId, projectId, active_branch_id, visualStyleId)` and returns the job result.

**New migration: `backend/migrations/016_add_scene_asset_job_type.sql`**

- Extends `image_generation_jobs.job_type` CHECK to include `'scene_asset'`.


----


Summary of what was implemented for **Task 7: Modification Tracking – Audit Trail**:

### 1. **New migration: `backend/migrations/017_scene_asset_modification_tracking.sql`**
- **Columns** on `scene_asset_instances`:
  - `modification_count` – `INTEGER DEFAULT 0`, incremented on each update
  - `last_modified_field` – `TEXT`, which field changed (`description_override`, `status_tags`, `image_key_url`, `carry_forward`)
  - `modification_reason` – `TEXT`, optional user-supplied reason
- **Trigger** `scene_asset_modification_tracker`: `BEFORE UPDATE` for each row it:
  - Sets `modification_count = OLD.modification_count + 1`
  - Sets `last_modified_field` from the first changed field (in that order).  
  `modification_reason` is not touched by the trigger; it’s only set from the API when provided.
- Uses `ADD COLUMN IF NOT EXISTS` and `DROP TRIGGER IF EXISTS` so the migration is safe to run on existing DBs.

Because 015/016 are already in use, this is a **new** migration (017) instead of editing 015. **Run this migration yourself** (e.g. in the Supabase SQL editor or your migration runner). Do not run Supabase CLI or migrations from here per your setup.

### 2. **Backend: `backend/src/routes/sceneAssets.ts`**
- **`UpdateSceneAssetInstanceSchema`**: added optional `modificationReason` (string, nullable).
- **PUT `.../assets/:instanceId`**: if `modificationReason` is sent in the body, it is written to `modification_reason` in the update payload. The DB trigger continues to set `modification_count` and `last_modified_field`.

### 3. **Frontend types: `src/types/scene.ts`**
- **`SceneAssetInstance`**: added optional `modification_count`, `last_modified_field`, `modification_reason` with short comments.
- **`UpdateSceneAssetInstanceRequest`**: added optional `modificationReason?: string | null` for the audit reason.

No new linter issues were reported. After you run migration 017, updates to scene asset instances will get an audit trail (count, last field, and optional reason).


# **5.2 IMPLEMENTNTAION SUMMARY**:

Feature 5.2: Stage 8 \- Visual Definition UI  
\*\*Purpose\*\*: Define scene starting visual state  
\- \[ \] Create Scene Visual Elements panel  
\- \[ \] Build Visual State Editor with pre-filled descriptions  
\- \[ \] Implement Asset Drawer for global asset access  
\- \[ \] Add drag-and-drop asset assignment  
\- \[ \] Create bulk asset image generation workflow


## Task 1: Backend Scene Asset Relevance Agent + Endpoint

### 1. **`backend/src/services/sceneAssetRelevanceService.ts`** (new)

- **`getLastInstancePerAsset(branchId, currentSceneNumber)`**  
  - Loads prior scenes in the branch (`scene_number < current`), then all `scene_asset_instances` for those scenes.  
  - Sorts instances by `scene_number` descending and keeps the **first (most recent) instance per `project_asset_id`**, so inheritance is by “last appearance in branch,” not only N−1.

- **`detectRelevantAssets(sceneId, branchId)`**  
  - Loads scene (`script_excerpt`), shots (characters_foreground/background, setting, action), last-instance-per-asset map, and **locked** `project_assets` for the branch.  
  - Builds a prompt with: current scene, shot list, “LAST KNOWN STATE PER ASSET,” and “AVAILABLE PROJECT ASSETS.”  
  - Calls **existing `llmClient`** (Gemini via `llm-client.ts`) with `generate({ systemPrompt, userPrompt, temperature: 0.3 })`.  
  - Parses JSON from the response.  
  - **Validation:** Drops any `relevant_assets[].project_asset_id` that is not in the locked project assets list (no invented IDs).  
  - Returns `SceneAssetRelevanceResult`: `scene_id`, `relevant_assets`, `new_assets_required` (advisory only; no auto-creation).

- **Types:** `SceneAssetRelevanceResult` is defined in this file and matches the frontend `SceneAssetRelevanceResult` shape in `src/types/scene.ts`.

### 2. **`backend/src/routes/sceneAssets.ts`** (updated)

- **`POST /:projectId/scenes/:sceneId/assets/detect-relevance`**  
  - Ensures the project exists and belongs to `req.user`, and the scene exists and belongs to the project’s `active_branch_id`.  
  - Instantiates `SceneAssetRelevanceService`, calls `detectRelevantAssets(sceneId, active_branch_id)`, and returns the result as JSON.  
  - Registered **before** the generic `POST .../assets` so `.../assets/detect-relevance` is matched correctly.

### Design choices

- **LLM:** Uses the existing `llm-client.ts` (Gemini) instead of a separate Anthropic client, so no new AI dependency.
- **Non-linear inheritance:** “Last instance per asset” is implemented by sorting instances by `scene_number` desc and keeping the first occurrence per `project_asset_id`.
- **No hallucination:** Only IDs present in locked `project_assets` are allowed in `relevant_assets`; the rest are filtered out before returning.

Backend `npm run build` still fails due to **existing** errors in `seed.ts` and `assetExtractionService.ts`; the new service and route are not in the tsc error list. If you want, we can add a small test or manual curl steps for the new endpoint next.

---

Implementing Tasks 2 and 3: exploring the codebase for types, ProjectView, Stage8, and related components.

## Task 2: Frontend service – scene asset instance management

**Created:** `src/lib/services/sceneAssetService.ts`

- **List:** `listSceneAssets(projectId, sceneId)` – GET scene asset instances.
- **Create:** `createSceneAsset(projectId, request)` – POST with `CreateSceneAssetInstanceRequest` (sceneId, projectAssetId, optional descriptionOverride, statusTags, carryForward, inheritedFromInstanceId).
- **Update:** `updateSceneAsset(projectId, sceneId, instanceId, updates)` – PUT with `UpdateSceneAssetInstanceRequest`.
- **Delete:** `deleteSceneAsset(projectId, sceneId, instanceId)` – DELETE.
- **Inherit:** `inheritAssets(projectId, sceneId)` – POST to `/assets/inherit`.
- **Detect relevance:** `detectRelevantAssets(projectId, sceneId)` – POST to `/assets/detect-relevance`, returns `SceneAssetRelevanceResult`.
- **Single image:** `generateSceneAssetImage(projectId, sceneId, instanceId)` – POST to `/assets/:instanceId/generate-image`.
- **Bulk images:** `bulkGenerateImages(projectId, sceneId, instanceIds)` – calls single generate per id and returns `BulkImageGenerationResult`.

Auth uses `supabase.auth.getSession()` and `Authorization: Bearer` on all requests, consistent with your other services.

---

## Task 3: Stage 8 shell + continuity header

**Updated:** `src/components/pipeline/Stage8VisualDefinition.tsx` and `src/pages/ProjectView.tsx`.

1. **Props and ProjectView**
   - Stage 8 now takes `projectId` and `sceneId`.
   - ProjectView passes `projectId` and only renders Stage 8 when `projectId` and `activeSceneId` are set (same pattern as Stage 7/10).

2. **Continuity header (rearview mirror)**
   - Top of Stage 8 uses `RearviewMirror` with prior scene data.
   - Prior scene is resolved via `sceneService.fetchScenes(projectId)`; previous scene’s `priorSceneEndState`, `endFrameThumbnail`, and `sceneNumber` are passed as `priorSceneEndState`, `priorEndFrame`, and `priorSceneName` (e.g. “Scene 4”).
   - Mode is `visual` when `priorEndFrame` exists, otherwise `text`.

3. **Empty state**
   - When the scene has no asset instances: “No scene assets yet” with:
     - **Detect Required Assets** – calls `detectRelevantAssets`, then creates scene instances for each `relevant_assets` entry (with `project_asset_id` and optional `starting_description`), invalidates query, and surfaces `new_assets_required` in state for future UI.
     - **Add Manually** – opens the Asset Drawer.
   - No automatic AI run on first load; user chooses.

4. **Three-panel layout (when assets exist)**
   - **Left – Scene Visual Elements panel:** Grouped by type (Characters, Locations, Props), source badge (Master / Prior Scene), review status (Unreviewed / Edited / Locked from `status_tags` and `image_key_url`/`modification_count`), multi-select checkboxes, “Inherit from prior scene” button, and “Generate Scene Starting Visuals (N)” for bulk generation.
   - **Center – Visual State Editor:** Selected instance’s `effective_description` (editable; saves as `descriptionOverride`), project asset name/type and optional master image, inheritance line (e.g. “Inheriting from Scene 4”), Lock button (sends `statusTags` including `'locked'` and `modificationReason`), single “Generate image” action, and audit (modification_count / last_modified_field) when present.
   - **Right – Asset drawer trigger panel:** “Add from project assets” (opens drawer), “Create scene asset” (opens same drawer for now), Back, Proceed.

5. **Asset drawer (sheet)**
   - Lists project assets via `projectAssetService.listAssets(projectId)`.
   - On select, calls `sceneAssetService.createSceneAsset(projectId, { sceneId, projectAssetId })`, shows “Inheritance source: Master” in the sheet description, then closes and invalidates scene-assets query.

6. **Cost confirmation (stub for Task 7.0)**
   - `CostConfirmModal` shows selected count and estimated credits (1 per image) and Confirm/Cancel; on confirm, `handleBulkGenerateConfirmed` runs `bulkGenerateImages` and refetches (no job polling yet).

7. **Data and mutations**
   - Scene assets: `useQuery(['scene-assets', projectId, sceneId], listSceneAssets)`.
   - Mutations with cache invalidation: create (after detect or drawer add), update (description + lock), inherit, detect, generate image.

**Files touched**

- `src/lib/services/sceneAssetService.ts` (new)
- `src/components/pipeline/Stage8VisualDefinition.tsx` (rewritten: real API, continuity header, empty state, three panels, drawer, cost stub)
- `src/pages/ProjectView.tsx` (pass `projectId` and guard with `activeSceneId` for Stage 8)

Summary of what was implemented:

---

### **Task 4: SceneAssetListPanel (Left Panel)**

**New file:** `src/components/pipeline/Stage8/SceneAssetListPanel.tsx`

- **Grouping:** Characters, Locations, Props with type icons (User, MapPin, Package) and counts.
- **Status badges:** Unreviewed (gray), Edited (amber), Locked (emerald) using `getReviewStatus`: no `image_key_url` → unreviewed; `modification_count > 0` → edited; otherwise locked.
- **Source badge:** Master vs Prior Scene per instance.
- **Multi-select:** Checkbox per asset; click row to select for editing.
- **Bulk generate:** Bottom button “Generate Visuals (N)”;
  - Disabled when no selection or while generating;
  - Opens cost confirmation (existing flow) before running.
- **Suggested – not in library:** When `new_assets_required` is passed:
  - Section with amber border/badge “Suggested – not in library”.
  - Each item: name, type badge, description (clamped), “Add from library” (opens drawer), “Ignore” (removes from list).
- **Inherit:** Optional “Inherit from prior scene” button in the header (wired from parent).
- **Header copy:** “Scene Assets” and “{n} assets • {m} with visuals” per plan.

---

### **Task 8: Empty State & Asset Detection Flow**

**EmptyStatePanel (Task 8 spec):**

- Wrapped in a **Card**, centered.
- **Sparkles** icon (16), title **“No Assets Defined Yet”**, body: “Define which characters, props, and locations appear at the start of this scene.”
- **Primary:** “Detect Required Assets (AI)” with **Brain** icon; disabled and shows “Detecting…” when `isDetecting`.
- **Secondary:** “Add Assets Manually” with **Plus** icon.

**Detection flow:**

- **`handleDetectAndPopulateAssets`** is async:
  - Sets `isDetecting(true)`.
  - Calls `sceneAssetService.detectRelevantAssets(projectId, sceneId)`.
  - Creates scene instances **only** from `relevant_assets` via `Promise.all(createPromises)` with:
    - `sceneId`, `projectAssetId: ra.project_asset_id`, `descriptionOverride` (when present), `statusTags: ra.status_tags_inherited ?? []`, `carryForward: true`.
  - Invalidates `['scene-assets', projectId, sceneId]` and shows success toast.
  - If `relevance.new_assets_required?.length > 0`, sets `newAssetsRequired` (no auto-create; suggestions only).
  - On error: toast with message; in `finally`: `isDetecting(false)`.

**Integration:**

- Empty state still shows Continuity Header + EmptyStatePanel + Asset Drawer when there are no scene assets.
- After detect, suggested assets (if any) appear in the **left panel** “Suggested – not in library” section; “Add from library” opens the Asset Drawer, “Ignore” removes that suggestion from the list.

---

**Stage8VisualDefinition changes:**

- Imports and uses `SceneAssetListPanel` from `@/components/pipeline/Stage8/SceneAssetListPanel`.
- Removed the inline left-panel implementation.
- Added `isDetecting` state and the async detection handler above; removed `detectMutation`.
- Passes to `SceneAssetListPanel`: `newAssetsRequired`, `onOpenAssetDrawer`, `onIgnoreSuggested` (filter by index).
- Empty state uses `isDetecting` for the detect button and loading state.
- Unused `Checkbox` import removed.

-----------

Implementing Tasks 5 and 9 (VisualStateEditorPanel and StatusTagsEditor with Carry Forward).

## Task 9: Status Tags Editor + Carry Forward

**New file: `src/components/pipeline/Stage8/StatusTagsEditor.tsx`**

- **Status tags**: Add/remove tags (e.g. muddy, bloody, torn) via input + Enter or plus button; tags shown as removable badges.
- **Carry Forward**: Optional “Carry forward to next scene” section with a **Switch** and **Link2** icon. When `onCarryForwardChange` is passed, it shows the toggle and syncs to `scene_asset_instances.carry_forward`.
- **Behavior**: New tags are normalized to lowercase; duplicates are ignored. Helper text explains that tags carry forward when the toggle is on.
- **Props**: `tags`, `onChange`, optional `carryForward` / `onCarryForwardChange`, optional `disabled`, `className`.

---

## Task 5: Visual State Editor Panel (Center Panel)

**New file: `src/components/pipeline/Stage8/VisualStateEditorPanel.tsx`**

- **Header**: Asset type icon, name, inheritance line (“Inheriting from Scene N” or “From Master Assets”), **Lock Asset** and **Generate Image** buttons.
- **Master reference**: `MasterAssetReference` shows master image and base description when present.
- **Visual state description**: Editable textarea for `effective_description` (writes `description_override`); save on blur with reason “User edited description in Stage 8”.
- **Status tags + Carry Forward**: Uses `StatusTagsEditor` with tags and carry-forward; changes are persisted immediately (tags and carry-forward each call `onUpdateAsset`).
- **Scene instance image**: Shows instance `image_key_url` or placeholder “No image yet. Generate above.”
- **Audit trail**: Shown when `modification_count > 0` (count, `last_modified_field`, `modification_reason`).
- **Inheritance note**: When `inherited_from_instance_id` is set, shows a short note that edits create a new scene instance and are saved to asset history.
- **Lock**: “Lock Asset” adds `"locked"` to `status_tags` and sets modification reason; when locked, description and status tags are disabled.

---

## Integration in Stage 8

**Updates in `src/components/pipeline/Stage8VisualDefinition.tsx`**

- Replaced the inline center panel with the new **VisualStateEditorPanel** from `@/components/pipeline/Stage8/VisualStateEditorPanel`.
- Extended `handleUpdateAsset` and the update mutation to accept **`carryForward?: boolean`** so backend `carry_forward` is updated.
- Removed unused imports: `Textarea`, `Edit3`, `ImageIcon`, `Lock`.

Backend and `UpdateSceneAssetInstanceRequest` already support `carryForward`; no API changes were required.

---


Lint is failing in other parts of the repo (backend `dist`, other components); there are no new issues in the files we changed. Here’s what was implemented.

---

## Summary: Tasks 7.0 + 7 (Cost modal + bulk generation + polling)

### **Task 7.0: Cost preview & confirmation**

- **CostConfirmModal** (in `Stage8VisualDefinition.tsx`):
  - Copy: *"This action will use approximately [X] credit(s) and generate [Y] image(s). Continue?"*
  - Buttons: **Cancel** (disabled while generating) and **Confirm & Generate** (with spinner when generating).
- Cost is still `selectedCount × COST_PER_IMAGE` (1 credit per image). Modal opens when the user clicks **Generate Visuals (N)**; bulk generation runs only after **Confirm & Generate**.

### **Task 7: Bulk image generation + polling**

1. **`sceneAssetService.ts`**
   - **`getImageJobStatus(jobId)`** – calls `GET /api/images/jobs/:jobId` with auth and returns job status (and optional `publicUrl`, `error`, `cost`).
   - **`pollBulkImageJobs(statuses, options)`** – polls until every job is `completed` or `failed` (or timeout). Options: `pollIntervalMs` (default 2000), `maxAttempts` (default 60), optional **`onProgress(completed, total)`** each poll round.

2. **`Stage8VisualDefinition.tsx`**
   - **`handleBulkGenerateConfirmed`**:
     - Closes the cost modal and sets `isGenerating` + `bulkProgress`.
     - Calls `bulkGenerateImages(projectId, sceneId, selectedForGeneration)`.
     - Calls `pollBulkImageJobs(statuses, { onProgress })` so the UI can show progress.
     - After polling: refetches scene assets, then:
       - All success → toast: *"Generated N image(s)"*
       - Some failed → toast: *"X completed, Y failed"*
       - All failed → toast: *"Image generation failed"*
     - Clears selection and resets `isGenerating` / `bulkProgress`.

3. **`SceneAssetListPanel.tsx`**
   - New prop **`bulkProgress?: { completed, total } | null`**.
   - While `isGenerating`, the primary button shows a spinner and:
     - **"Generating (X/Y)…"** when `bulkProgress` is set (during polling).
     - **"Generating (N)…"** when `bulkProgress` is not set yet.

Flow: user selects assets → **Generate Visuals (N)** → cost modal → **Confirm & Generate** → modal closes, bulk jobs start, button shows **Generating (X/Y)…** → when all jobs finish, list refetches and toasts show the result. No new lint errors were introduced in these files; existing lint failures are elsewhere in the project.

----

## Summary: Tasks 6 & 10

### **Task 6: Asset Drawer scene integration**

**6.1 – Global `AssetDrawer.tsx`**
- Added optional props: `sceneId?: string`, `onSceneInstanceCreated?: (instance: SceneAssetInstance) => void`.
- Imported `sceneAssetService` and `SceneAssetInstance`.
- Added `ensureSceneInstanceIfNeeded(projectAsset)` that, when `sceneId` and `onSceneInstanceCreated` are set, calls `sceneAssetService.createSceneAsset(projectId, { sceneId, projectAssetId, descriptionOverride: null, statusTags: [], carryForward: true })` and then `onSceneInstanceCreated(instance)`; on error it shows a toast.
- Wired this after every path that ends with a project asset:
  - Direct clone (no match modal).
  - Fallback direct clone on fetch error.
  - `handleMatched(asset)` (matched existing project asset).
  - `handleClonedWithoutMatch(asset)` (cloned without match).

**6.2 – Stage 8 integration**
- Replaced the local Sheet “AssetDrawer” (project-asset list) with the global pipeline `AssetDrawer` from `@/components/pipeline/AssetDrawer`.
- Removed the local Sheet component and its interface; removed unused `Sheet` imports and `ProjectAsset` import where no longer needed.
- `handleSceneInstanceCreated(instance: SceneAssetInstance)` now: calls `refetch()`, shows `toast.success(\`Added ${instance.project_asset?.name ?? 'asset'} to scene\`)`, and `setAssetDrawerOpen(false)`.
- Both Stage 8 usages (empty state and main layout) pass `projectId`, `sceneId`, `isOpen`, `onClose`, and `onSceneInstanceCreated={handleSceneInstanceCreated}`.

Result: In Stage 8, “Add from project assets” opens the global Asset Drawer; cloning from the global library creates a project asset and a scene instance for the current scene, then refreshes the list and closes the drawer.

---

### **Task 10: Gatekeeper – Proceed to Stage 9**

- Added `handleProceedToStage9`: filters `sceneAssets` for items without `image_key_url`; if any exist, shows `toast.error(\`Cannot proceed: ${missingImages.length} asset(s) missing visual references. Generate images first.\`)` and returns; otherwise calls `onComplete()`.
- `AssetDrawerTriggerPanel`’s “Proceed” button now uses `onComplete={handleProceedToStage9}` instead of `onComplete`.

Result: Proceeding to Stage 9 is only allowed when every scene asset has a visual reference (`image_key_url`); otherwise the user sees the error toast and must generate images first.

________________________________________________________________

\#\#\# Feature 5.3: Status Metadata Tags  
\*\*Purpose\*\*: Track visual conditions (muddy, bloody, torn)  
\- \[ \] Add status tags field to scene asset instances  
\- \[ \] Create tag UI component (chips/badges)  
\- \[ \] Implement condition carry-forward prompt  
\- \[ \] Build tag persistence logic across scenes  
\- \[ \] Add tag-based search and filtering


# **5.3 IMPLEMENTATION SUMMARY**:

Task 1: Ran MIGRATION: 016_...-.sql
---

## Task 2: Type definitions

### 1. `src/types/scene.ts`
- **Imported** `ProjectAsset` from `./asset`.
- **Added** `SceneAssetInstance` (aligned with migration 015): `id`, `scene_id`, `project_asset_id`, `description_override`, `image_key_url`, `status_tags`, `carry_forward`, `inherited_from_instance_id`, `project_asset?`, `effective_description`, `created_at`, `updated_at`.
- **Added** `CreateSceneAssetInstanceRequest` and `UpdateSceneAssetInstanceRequest`.
- **Added** `SceneAssetRelevanceResult` (relevant_assets, new_assets_required).
- **Updated** `Scene`: added `assetInstances?: SceneAssetInstance[]`.
- **Kept** `SceneAsset` with a short comment that new code should use `SceneAssetInstance`.

### 2. `backend/src/services/contextManager.ts`
- **Added** `SceneAssetInstanceContext` (id, scene_id, project_asset_id, description_override, image_key_url, status_tags, carry_forward, inherited_from_instance_id, effective_description, project_asset?).
- **Updated** `LocalContext`: `sceneAssets` is now `SceneAssetInstanceContext[]` instead of `any[]`.

---

## Task 4: AssetInheritanceService and route

### 1. `backend/src/services/assetInheritanceService.ts` (new)
- **`getPriorScene(sceneId)`** – returns prior scene in same branch, or null for scene 1.
- **`getInheritableAssetStates(priorSceneId)`** – returns inherited state per instance (carry_forward vs reset to project_asset base), including `baseDescription` for `effective_description`.
- **`bootstrapSceneAssetsFromProjectAssets(sceneId, branchId)`** – Scene 1 only; creates instances from locked `project_assets`, no inheritance.
- **`inheritAssetsFromPriorScene(currentSceneId, branchId)`** – Scene 1 → bootstrap; Scene N → inherit from N−1 with temporal checks.
- **`getInheritanceChain(instanceId)`** – walks `inherited_from_instance_id` and returns chain (root first).

Exported types: `InheritanceSource`, `InheritedAssetState`, `InheritanceChainNode`.

### 2. `backend/src/routes/sceneAssets.ts` (new)
- **POST** `/api/projects/:projectId/scenes/:sceneId/assets/inherit`  
  - Checks project ownership, scene in branch, no existing instances.  
  - Calls `AssetInheritanceService.inheritAssetsFromPriorScene`.  
  - Returns `{ message, count }`.

### 3. `backend/src/server.ts`
- **Registered** `sceneAssetsRouter` under `/api/projects` (with auth).

---

## Task 3 done: Scene Asset Instance CRUD routes

### 1. **`backend/src/routes/sceneAssets.ts`** (updated)

- **Validation (Zod)**  
  - `CreateSceneAssetInstanceSchema`: `projectAssetId` (uuid), optional `descriptionOverride`, `statusTags`, `carryForward`, `inheritedFromInstanceId`.  
  - `UpdateSceneAssetInstanceSchema`: optional/nullable `descriptionOverride`, `imageKeyUrl` (url), `statusTags`, `carryForward`.

- **CRUD endpoints**
  - **GET** `/api/projects/:projectId/scenes/:sceneId/assets` — List instances for a scene with joined `project_asset` (id, name, asset_type, description, image_key_url, visual_style_capsule_id). Checks project ownership and that scene belongs to project’s active branch.
  - **POST** `/api/projects/:projectId/scenes/:sceneId/assets` — Create instance (manual or with `inheritedFromInstanceId`). Validates project/scene/project_asset, computes `effective_description`, returns 409 on unique (scene_id, project_asset_id) violation.
  - **PUT** `/api/projects/:projectId/scenes/:sceneId/assets/:instanceId` — Update instance (description override, image_key_url, status_tags, carry_forward). Recomputes `effective_description` when `descriptionOverride` is sent. Request body uses camelCase; DB columns use snake_case (mapping done in code). No automatic image regeneration.
  - **DELETE** `/api/projects/:projectId/scenes/:sceneId/assets/:instanceId` — Delete instance; returns 204.

- **Existing route kept**  
  - **POST** `/api/projects/:projectId/scenes/:sceneId/assets/inherit` — Unchanged; defined after the create route so `/assets/inherit` is not matched as `:instanceId`.

### 2. **Server**

- `sceneAssetsRouter` was already registered in `server.ts` under `app.use('/api/projects', authenticateUser, sceneAssetsRouter)`. No change.

### 3. **Testing with Postman/curl**

Use a valid auth token (e.g. from login) in `Authorization: Bearer <token>`.

---

## Task 5: Context Manager – Local Context Assembly

**File: `backend/src/services/contextManager.ts`**

1. **`LocalContext` and scene asset type**
   - Replaced `SceneAssetInstanceContext` with `LocalContextSceneAsset`: `name`, `type`, `description`, `statusTags`, `imageKeyUrl`.
   - `LocalContext.sceneAssets` is now `LocalContextSceneAsset[]`.

2. **`assembleLocalContext`**
   - Loads the scene from `scenes` (`id`, `script_excerpt`, `end_state_summary`) via `this.db.supabase`.
   - Loads `scene_asset_instances` with joined `project_assets` (`id`, `name`, `asset_type`, `description`, `image_key_url`).
   - Maps to `LocalContextSceneAsset[]` using `effective_description`, `status_tags`, and `image_key_url` (instance or project_asset).
   - Returns `sceneId`, `sceneScript`, `previousSceneEndState`, `sceneAssets`.
   - Throws `ContextManagerError` with code `SCENE_NOT_FOUND` when the scene is missing.

---

## Task 6: Image Generation – Scene-Specific Image Keys

**File: `backend/src/services/image-generation/ImageGenerationService.ts`**

1. **`CreateImageJobRequest.jobType`**
   - Added `'scene_asset'`.

2. **Visual style**
   - Visual style capsule is required for both `master_asset` and `scene_asset`.

3. **`createSceneAssetImageJob(sceneInstanceId, projectId, branchId, visualStyleCapsuleId)`**
   - Loads the scene asset instance (with `project_asset.asset_type`).
   - Uses `effective_description` as the prompt and `ASPECT_RATIOS[asset_type]` for size.
   - Calls `createImageJob` with `jobType: 'scene_asset'`, `assetId`, `sceneId`, and an idempotency key.

4. **Storage path**
   - For `scene_asset`:  
     `project_{projectId}/branch_{branchId}/scene_{sceneId}/scene-assets/{assetId}_{timestamp}_{random}.png`.

5. **Completion**
   - When a `scene_asset` job completes, `scene_asset_instances` is updated:  
     `image_key_url` set by `scene_id` + `project_asset_id`.

**File: `backend/src/routes/sceneAssets.ts`**

- **POST** `/:projectId/scenes/:sceneId/assets/:instanceId/generate-image`
  - Checks project ownership and that Stage 5 has a locked visual style (`locked_visual_style_capsule_id`).
  - Calls `ImageGenerationService.createSceneAssetImageJob(instanceId, projectId, active_branch_id, visualStyleId)` and returns the job result.

**New migration: `backend/migrations/016_add_scene_asset_job_type.sql`**

- Extends `image_generation_jobs.job_type` CHECK to include `'scene_asset'`.


----


Summary of what was implemented for **Task 7: Modification Tracking – Audit Trail**:

### 1. **New migration: `backend/migrations/017_scene_asset_modification_tracking.sql`**
- **Columns** on `scene_asset_instances`:
  - `modification_count` – `INTEGER DEFAULT 0`, incremented on each update
  - `last_modified_field` – `TEXT`, which field changed (`description_override`, `status_tags`, `image_key_url`, `carry_forward`)
  - `modification_reason` – `TEXT`, optional user-supplied reason
- **Trigger** `scene_asset_modification_tracker`: `BEFORE UPDATE` for each row it:
  - Sets `modification_count = OLD.modification_count + 1`
  - Sets `last_modified_field` from the first changed field (in that order).  
  `modification_reason` is not touched by the trigger; it’s only set from the API when provided.
- Uses `ADD COLUMN IF NOT EXISTS` and `DROP TRIGGER IF EXISTS` so the migration is safe to run on existing DBs.

Because 015/016 are already in use, this is a **new** migration (017) instead of editing 015. **Run this migration yourself** (e.g. in the Supabase SQL editor or your migration runner). Do not run Supabase CLI or migrations from here per your setup.

### 2. **Backend: `backend/src/routes/sceneAssets.ts`**
- **`UpdateSceneAssetInstanceSchema`**: added optional `modificationReason` (string, nullable).
- **PUT `.../assets/:instanceId`**: if `modificationReason` is sent in the body, it is written to `modification_reason` in the update payload. The DB trigger continues to set `modification_count` and `last_modified_field`.

### 3. **Frontend types: `src/types/scene.ts`**
- **`SceneAssetInstance`**: added optional `modification_count`, `last_modified_field`, `modification_reason` with short comments.
- **`UpdateSceneAssetInstanceRequest`**: added optional `modificationReason?: string | null` for the audit reason.

No new linter issues were reported. After you run migration 017, updates to scene asset instances will get an audit trail (count, last field, and optional reason).

-------------------------------
# **5.3b Issues**  

## Implementation Summary (Issues 1a & 1b)

### Issue 1a: Stage 8 redirect on refresh

**Problem:** Refreshing on Stage 8 sent users back to Stage 7 because `sceneId` was missing from the URL and restoration didn’t handle Stage 8 correctly.

**Changes:**

1. **`src/pages/ProjectView.tsx`**
   - **Persistence:** `getSceneIdStorageKey()` added. `persistStage(stage, sceneId)` now writes `project_${projectId}_sceneId` to localStorage when `stage >= 7` and `sceneId` is provided.
   - **Restoration:** Restore effect now:
     - For **Stage 8 from URL**: if `sceneId` is missing, reads `sceneId` from localStorage, updates URL with `sceneId`, and uses it; if still no `sceneId`, falls back to Stage 7 and logs a warning.
     - For **Stage 8 from localStorage**: restores `sceneId` from localStorage; if missing, uses Stage 7 instead of 8.
     - Sets `activeSceneId` and `sceneStage` whenever a valid Stage 8 + `sceneId` is restored.
   - **Scene context effect:** When `stage >= 7`, `sceneId` can come from URL or, for Stage 8, from localStorage; URL is updated with `sceneId` when it was restored from localStorage.

2. **`src/components/pipeline/Stage8VisualDefinition.tsx`**
   - **URL sync:** `useEffect` on `sceneId` that calls `window.history.replaceState` to set `?stage=8&sceneId=...` so the current Stage 8 scene is reflected in the URL (and survives refresh).

**Result:** Refreshing on Stage 8 keeps you on Stage 8 with the same scene; opening a link with `?stage=8&sceneId=...` or restoring from localStorage also works.

---

### Issue 1b: Generated images not appearing without refresh

**Problem:** After single or bulk image generation, new images didn’t show until a manual refresh because there was no polling for single jobs and no cache invalidation after bulk polling.

**Changes (all in `src/components/pipeline/Stage8VisualDefinition.tsx`):**

1. **Single image**
   - Replaced the “fire-and-forget” `generateImageMutation` with an async flow:
     - Call `sceneAssetService.generateSceneAssetImage(...)` to get `jobId`.
     - New `pollSingleImageJob(jobId)` helper: polls `getImageJobStatus(jobId)` every 2s, up to 60 attempts; resolves on `completed`, throws on `failed` or timeout.
     - After polling completes successfully: `await queryClient.invalidateQueries({ queryKey: ['scene-assets', projectId, sceneId] })` and show success toast; on error, show error toast.
   - Added `isGeneratingSingle` state; the panel’s “Generate Image” uses `isGeneratingImage={isGeneratingSingle}` so the button shows loading during the full poll.

2. **Bulk images**
   - Existing `handleBulkGenerateConfirmed` already called `queryClient.invalidateQueries` after `pollBulkImageJobs`. Change: added `await` so the refetch is triggered before clearing bulk progress state.

**Result:** Single and bulk generated images show in the UI as soon as jobs complete, without a manual refresh.

ADDITIONAL FIX FOR Issue 1a +1b - Summary of the change:

**`src/pages/ProjectView.tsx`**

1. **When restoring from URL** (e.g. `?stage=8&sceneId=...` or after refresh): after setting `sceneStage` and `currentStage`, we now set `completedSceneStages` to the list of scene stages before the restored one:
   - Restore to Stage 7 → `[]`
   - Restore to Stage 8 → `[7]`
   - Restore to Stage 9 → `[7, 8]`, etc.

2. **In the fallback branch** (when we have `sceneIdFromUrl` and `currentStage >= 7` but no `stage` in the URL): we set `completedSceneStages` the same way from `currentStage`.

So after a refresh on Stage 8 (or opening a link with `stage=8`), `completedSceneStages` is `[7]`. If you then go to Stage 7 to review, the sidebar still has Stage 7 as “completed,” so Stage 8 is no longer locked and you can click the Stage 8 icon to go back without unlocking/relocking Stage 7.
---

## Issue 2a: Status Tags Wiped When Locking Asset — Implementation Summary

**Root cause**  
Lock used `selectedAsset.status_tags`, which could be stale because tag edits go through `StatusTagsEditor` and the parent’s `selectedAsset` only updates after a refetch. Lock then sent only `['locked']` (or an outdated list), so the backend overwrote the real tags.

**Changes made**

1. **`src/components/pipeline/Stage8/VisualStateEditorPanel.tsx`**
   - **`handleLock`**  
     - Uses local state **`statusTags`** instead of `selectedAsset.status_tags` so the payload is always the current tags (including any just added).  
     - Builds `newTags = [...statusTags, 'locked']` and sends that full array to the backend.  
     - If already locked, shows `toast.info('Asset is already locked')` and returns.  
     - After calling `onUpdateAsset`, updates local state with `setStatusTags(newTags)` and shows `toast.success('Asset locked')`.
   - **`isLocked`**  
     - Now derived from **`statusTags`** (`statusTags.includes('locked')`) so the UI stays in sync with local state and doesn’t rely on stale `selectedAsset.status_tags`.
   - **Imports**  
     - Added `import { toast } from 'sonner'` for the new toasts.

**Already correct (no code changes)**  
- Local state for tags (`statusTags`) and sync from `selectedAsset` in `useEffect` were already in place.  
- `handleStatusTagsChange` already updates `statusTags` and calls `onUpdateAsset` with the full new list.  
- `Stage8VisualDefinition` already invalidates the scene-assets query on `updateMutation.onSuccess`, so refetched data stays in sync.  
- Backend PUT in `sceneAssets.ts` already writes `payload.status_tags = updates.statusTags`; the fix is on the frontend sending the full array.

**How to verify**  
- Add tags (e.g. `muddy`, `bloody`) to an asset, then click **Lock Asset**.  
- Tags should remain `['muddy', 'bloody', 'locked']` in the UI and after refresh.  
- Locking again should show “Asset is already locked” and not duplicate `locked`.

---

## Implementation Summary: Issue 3a/3b – Project Assets in Asset Drawer

**Goal:** Asset Drawer defaults to **Project Assets** (Stage 5) with a toggle to **Global Library**, and selecting a project asset adds it to the scene without cloning.

**File updated:** `src/components/pipeline/AssetDrawer.tsx`

### 1. Source and data

- **`AssetSource`:** `'project' | 'global'`.
- **`DrawerAsset`:** `GlobalAsset | ProjectAsset` for unified list rendering.
- **State:** `source` with default `'project'`.
- **Data:**  
  - Project: `useQuery(['project-assets', projectId], projectAssetService.listAssets(projectId))` when `isOpen && source === 'project'`.  
  - Global: `useQuery(['global-assets'], assetService.listAssets())` when `isOpen && source === 'global'`.  
- **Derived:** `assets = source === 'project' ? projectAssets : globalAssets`, single `loading` from the active query.

### 2. Header and toggle

- Title: **"Asset Library"** with an inline toggle: **Project Assets** | **Global Library** (pill style, active state).
- Description:  
  - Project: *"Assets from Stage 5 (Master Assets for this project)"*.  
  - Global: *"Curated global asset library (shared across all projects)"*.

### 3. Project asset selection

- **`handleSelectProjectAsset(asset: ProjectAsset)`:**  
  - If no `sceneId`/`onSceneInstanceCreated`: toast *"Asset already in project"*, then `onClose()`.  
  - Else: `sceneAssetService.createSceneAsset(projectId, { sceneId, projectAssetId: asset.id, ... })`, call `onSceneInstanceCreated(instance)`, toast *"Added {name} to scene"*, then `onClose()`.

### 4. List behavior

- **Filtering:** Same search and type filter for both sources; `filteredAssets` uses `(a.description ?? '')` so both types are safe.
- **Cards:**  
  - **Project:** Button **"Add to Scene"** → `handleSelectProjectAsset(asset)`.  
  - **Global:** Button **"Clone to Project"** → existing `handleCloneAsset(asset)` (and match modal when applicable).  
- **Version:** Shown as `v{version}` for global assets; `—` for project assets (`'version' in asset` check).
- **Keys:** `key={\`${source}-${asset.id}\`}` so project vs global don’t reuse the same key.

### 5. Empty states

- **Project, no assets:** Frown icon, *"No Project Assets Yet"*, short explanation, and **"Browse Global Library"** button that sets `source` to `'global'`.
- **Global, no assets:** Frown icon, *"No Assets Found"*, and text that depends on whether search/filters are applied.

### 6. Dependencies

- **Imports:** `useQuery` from `@tanstack/react-query`, `Frown` from `lucide-react`; removed `useEffect` (no manual fetch).
- **Stage8VisualDefinition:** Unchanged; it already passes `projectId`, `sceneId`, and `onSceneInstanceCreated` to `AssetDrawer`.

**Result:** Opening the Asset Drawer from Stage 8 shows **Project Assets** first; users can add them to the scene with one click or switch to **Global Library** to clone global assets. Search and type filters work for both sources, and empty states guide users appropriately.

---

## Issue 5: Scene slug & number in Stage 8 UI — done

**Changes in `src/components/pipeline/Stage8VisualDefinition.tsx`:**

1. **Scenes query and current scene**
   - Added `useQuery` for `['scenes', projectId]` calling `sceneService.fetchScenes(projectId)` when `projectId` is set.
   - Derived `currentScene = scenes?.find(s => s.id === sceneId)` so the current scene has `sceneNumber`, `slug`, and `status`.

2. **Scene header above continuity**
   - In both the empty-state branch (no assets) and the main branch (with assets), added a scene identifier block above `ContinuityHeader`:
     - Left: Badge “Scene {sceneNumber}” + `h2` with `slug`.
     - Right: Badge for scene status (e.g. “shot list ready” or “draft”), with `shot_list_ready` using the default badge variant.
   - Styling: `px-6 py-3`, `border-b border-border/50`, `bg-card/30 backdrop-blur-sm` so it matches the existing header look.

**Result:** At the top of Stage 8 you now see “Scene N” and the scene slug (e.g. “INT. MANSION - NIGHT”), plus the scene status. The header appears for both the empty state and when the scene has assets; it only renders when `currentScene` is defined. No new linter issues.

---

## Issue 2b: Stage 8 – Tag Dropdown Keyboard Navigation

**File:** `src/components/pipeline/Stage8/StatusTagsEditor.tsx`

### Changes

1. **State**
   - `selectedIndex` (number, default `-1`) to track the highlighted suggestion.
   - `useEffect` resets `selectedIndex` to `-1` whenever `suggestions` changes.

2. **Keyboard handler `handleKeyDown`**
   - **No suggestions:** only Enter runs `handleAddTag()` (add custom tag).
   - **With suggestions:**
     - **ArrowDown:** move highlight down (clamped to last item).
     - **ArrowUp:** move highlight up (down to `-1`).
     - **Enter:** if `selectedIndex >= 0`, add `suggestions[selectedIndex]`; otherwise add custom tag from input.
     - **Tab:** if nothing is selected and there are suggestions, add first suggestion (and prevent default).
     - **Escape:** close dropdown and clear `selectedIndex`.

3. **Input**
   - Replaced inline `onKeyDown` with `handleKeyDown`.
   - Added: `role="combobox"`, `aria-expanded={showSuggestions}`, `aria-controls="tag-suggestions-list"`, `aria-activedescendant` when `selectedIndex >= 0`.

4. **Suggestions list**
   - Container: `id="tag-suggestions-list"`, `role="listbox"`.
   - Each option: `id={`tag-suggestion-${idx}`}`, `role="option"`, `aria-selected={idx === selectedIndex}`.
   - Highlight: `idx === selectedIndex` uses `bg-primary text-primary-foreground`; others use `hover:bg-muted`.
   - `onMouseEnter={() => setSelectedIndex(idx)}` so hover and keyboard stay in sync.

### Behavior

- Typing shows suggestions; Arrow Up/Down move highlight, Enter adds highlighted or custom tag.
- Tab adds the first suggestion when the list is open.
- Escape closes the list. Hover updates highlight; click still adds the tag.

No new dependencies; existing `cn` import is used for option classes. Lint is clean.