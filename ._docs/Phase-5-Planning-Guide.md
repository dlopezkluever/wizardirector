# Phase 5: Asset Inheritance & Stage 8 - Planning Guide

This guide identifies the vital context files from your codebase and documentation that are essential for implementing Phase 5 features. Each feature section lists the most relevant files, organized by type (codebase vs docs), with brief explanations of their importance.

---

## Feature 5.1: Scene Asset Instances

**Purpose**: Scene-specific asset variations; database and inheritance logic.

### Codebase Files

- **`backend/migrations/008_global_assets.sql`** - Defines `global_assets` and `project_assets` tables with RLS. The `scene_asset_instances` table is **not** in this migration; it is only specified in the docs. You will add a new migration for `scene_asset_instances` (see docs schema). This file is the reference for asset table style, indexes, and RLS patterns.

- **`src/types/asset.ts`** - Defines `GlobalAsset`, `ProjectAsset`, `AssetType`, and related request types. Extend or mirror these for scene asset instance types (e.g. `SceneAssetInstance` with `description_override`, `image_key_url`, `status_tags`, `carry_forward`, `inherited_from_scene_id`).

- **`src/types/scene.ts`** - Defines `SceneAsset` (lines 47–57): `id`, `sceneId`, `name`, `type`, `source`, `reviewStatus`, `description`, `imageKey`, `masterAssetId`. This is the current frontend shape; align it with the eventual `scene_asset_instances` schema and add fields for status tags, inheritance, and overrides.

- **`backend/src/services/contextManager.ts`** - `LocalContext` includes `sceneAssets?: any[]` (line 45) and `assembleLocalContext` (lines 174–189) has a TODO to fetch scene asset instances with inherited states. This is where scene N → N+1 propagation and local context assembly will plug in.

- **`backend/src/routes/projectAssets.ts`** - Project asset CRUD, extract, clone, and image generation. Use its patterns for new scene-asset-instance endpoints (list by scene, upsert, inherit from prior scene) and for scene-specific image key generation.

- **`backend/src/services/image-generation/ImageGenerationService.ts`** - `CreateImageJobRequest` includes `sceneId`, `shotId`, `assetId`; supports project and global asset jobs (see migration 010). Extend or add job types for scene asset instance image keys and bulk generation.

### Documentation Files

- **`._docs/database-schema-state-transition-matrix.md`** - **Authoritative** schema for `scene_asset_instances` (lines 604–631): `scene_id`, `project_asset_id`, `description_override`, `image_key_url`, `status_tags`, `carry_forward`, `inherited_from_scene_id`, unique `(scene_id, project_asset_id)`. Also documents `global_assets` and `project_assets` (lines 543–601) and the ER diagram showing `project_assets (N) → (N) scene_asset_instances` (lines 50–52).

- **`._docs/implementation-task-list.md`** - Phase 5 Feature 5.1 checklist (lines 270–276): scene_asset_instances table, inheritance logic Scene N → N+1, state propagation, modification tracking, scene-specific image key generation.

- **`._docs/inheritance_contract.md`** - Global-to-local inheritance rules, override rules, and traceability. Directly applies to how scene asset state inherits from prior scene or master asset and how overrides are logged.

- **`._docs/project-overview.md`** - Stateful Asset Management (lines 104–112): Master definition, inheritance rule (final state of Scene N → Scene N+1), stateful editing in Stage 8, status metadata tags, and database storage of scene-specific instances.

- **`._docs/AI-agent-registry-context-flow-architecture.md`** - Scene Asset Relevance Agent (Stage 8) input/output schema (lines 668–751): `previousSceneAssetInstances` with `description_override`, `status_tags`, `end_state_summary`; output `relevant_assets` with `inherited_from`, `starting_description`, `status_tags_inherited`. Defines how inheritance and relevance are determined.

---

## Feature 5.2: Stage 8 - Visual Definition UI

**Purpose**: Define scene starting visual state; Scene Visual Elements panel, Visual State Editor, Asset Drawer, drag-and-drop, bulk image generation.

### Codebase Files

- **`src/components/pipeline/Stage8VisualDefinition.tsx`** - Main Stage 8 UI: mock `SceneAsset[]`, grouped list (Characters, Locations, Props), Visual State Editor (description), type icons, review status colors. Currently uses local mock data; needs wiring to scene asset instances API, Asset Drawer integration, and bulk generation trigger.

- **`src/components/pipeline/AssetDrawer.tsx`** - Drawer for global asset library: fetches via `assetService`/`projectAssetService`, grid/list view, type filter, search, clone-to-project via `AssetMatchModal`. Use this for “Asset Drawer for global asset access” and drag-and-drop asset assignment in Stage 8; may need a variant or props for “assign to scene” vs “clone to project.”

- **`src/components/pipeline/AssetMatchModal.tsx`** - Used when cloning a global asset into a project (match with existing or create new). Relevant if Stage 8 allows “add from library” and needs to map to project assets and then to scene instances.

- **`src/pages/ProjectView.tsx`** - Renders `Stage8VisualDefinition` when `sceneStage === 8` (lines 428–434), passing `sceneId`, `onComplete`, `onBack`. Confirms routing and scene context for Stage 8.

- **`src/types/scene.ts`** - `SceneAsset` (lines 47–57) drives the current Stage 8 list and editor; align with backend scene_asset_instances and add any status tag / inheritance fields needed by the UI.

- **`backend/src/routes/projectAssets.ts`** - Contains extract, clone, and image generation flows. Add or extend endpoints for: listing/upserting scene asset instances for a scene, and triggering bulk scene asset image generation.

- **`backend/src/services/image-generation/ImageGenerationService.ts`** - Handles job creation and aspect ratios by asset type. Reference for implementing “bulk asset image generation workflow” for scene starting visuals (e.g. batch jobs for selected scene instances).

### Documentation Files

- **`._docs/project-overview.md`** - Stage 8 UI/UX (lines 589–638): Scene Visual Elements Panel (left), Visual State Editor (center), Asset Drawer (right), Bulk Generation Flow (steps 1–5), and constraint “Stage 8 defines only starting conditions; mid-scene visual changes are in Stage 10.”

- **`._docs/user-flow.md`** - Stage 8 user intent and actions (lines 198–209): define how the scene begins visually; inherit assets from prior scenes, modify scene-specific visual states, generate scene-level image keys.

- **`._docs/implementation-task-list.md`** - Feature 5.2 checklist (lines 278–284): Scene Visual Elements panel, Visual State Editor with pre-filled descriptions, Asset Drawer for global asset access, drag-and-drop assignment, bulk asset image generation workflow.

- **`._docs/AI-agent-registry-context-flow-architecture.md`** - Scene Asset Relevance Agent and Scene Asset Visual State Generator (Stage 8) (lines 668–770+): relevance output schema, visual state generation prompt. Informs pre-fill and bulk generation behavior.

- **`._docs/architecture-and-rules.md`** - Visual Definition columns for assets (lines 693–695, 721–723). Use for consistency when defining or displaying asset description/image fields in Stage 8.

---

## Feature 5.3: Status Metadata Tags

**Purpose**: Track visual conditions (muddy, bloody, torn); tags on scene asset instances, tag UI, condition carry-forward, persistence, search/filter.

### Codebase Files

- **`src/types/scene.ts`** - `SceneAsset` currently has no `statusTags` or `carryForward`. Add optional `statusTags?: string[]` and `carryForward?: boolean` to match `scene_asset_instances` and the tag UI.

- **`src/components/pipeline/Stage8VisualDefinition.tsx`** - Uses `Badge` from shadcn (line 18). Add tag chips/badges for status tags (e.g. muddy, bloody, torn) and controls to add/remove tags and set carry-forward; persist via scene asset instance API.

- **`src/components/ui/badge.tsx`** - shadcn Badge component; use for tag chips. Check for existing tag or chip patterns in the repo.

- **`backend/migrations/`** - New migration for `scene_asset_instances` must include `status_tags TEXT[]` and `carry_forward BOOLEAN DEFAULT TRUE` per docs; add RLS and, if desired, trigger `validate_status_tags` as in docs (tags only after Stage 7 / shot_list_ready).

- **`backend/src/routes/`** - Scene asset instance API must support reading/writing `status_tags` and `carry_forward`; optional endpoints or query params for tag-based search/filter (e.g. filter instances by tag).

### Documentation Files

- **`._docs/database-schema-state-transition-matrix.md`** - `scene_asset_instances` columns `status_tags TEXT[]` and `carry_forward BOOLEAN` (lines 617–618). Status Metadata Tag Propagation section (lines 868–878): SQL for selecting tags from prior scene where `carry_forward = TRUE`, and UX note (“Carry forward to Scene N+1?”). Trigger `validate_status_tags` (lines 1111–1131): tags only when scene status is shot_list_ready or later.

- **`._docs/implementation-task-list.md`** - Feature 5.3 checklist (lines 286–292): status tags field on scene asset instances, tag UI (chips/badges), condition carry-forward prompt, tag persistence across scenes, tag-based search and filtering.

- **`._docs/project-overview.md`** - Status Metadata Tags (lines 110–111): conditions (Wet, Bloody, Torn Wardrobe), generated in Phase B, can persist across scene boundaries.

- **`._docs/AI-agent-registry-context-flow-architecture.md`** - Scene Asset Relevance Agent output includes `status_tags_inherited` (lines 718, 730). Defines how tags are carried forward in the relevance step.

- **`._docs/ui-and-theme-rules.md`** - Stage status colors and component patterns; use for consistent styling of status tag chips (e.g. severity or category colors).

---

## Feature 5.4: Asset State Evolution

**Purpose**: Mid-scene visual changes; state change detection, change logging, evolution tracking, asset timeline view, state rollback.

### Codebase Files

- **`src/components/pipeline/Stage8VisualDefinition.tsx`** - Stage 8 defines *starting* state only; mid-scene evolution is specified as Stage 10. This component may still show “current scene state” and link to evolution/timeline (e.g. “View evolution in Stage 10”). No timeline or rollback UI exists yet; add or plan a separate “asset timeline” component fed by change log data.

- **`backend/src/services/contextManager.ts`** - `assembleLocalContext` will need scene asset instances (with history or version info if you add it). Future: feed timeline/rollback APIs from the same or related data.

- **`backend/`** - No `scene_asset_instances` table or asset change log yet. You will need: (1) migration for `scene_asset_instances`; (2) optional `asset_state_changes` or audit table (or versioned instances) for change detection and logging; (3) APIs to record changes, list history, and support rollback (e.g. restore prior instance state).

- **`backend/src/services/image-generation/ImageGenerationService.ts`** - Image jobs are keyed by project/branch/asset/scene/shot; reuse or extend for “visual evolution” image keys and for linking generated images to specific asset states.

### Documentation Files

- **`._docs/implementation-task-list.md`** - Feature 5.4 checklist (lines 294–300): asset state change detection, asset change logging, visual evolution tracking, asset timeline view, state rollback.

- **`._docs/project-overview.md`** - Stage 8 defines only starting conditions; mid-scene visual changes in Stage 10 (lines 637, 919–922, 961–963). Use this to scope “state evolution” to Stage 10 and to design Stage 8 ↔ Stage 10 data flow (e.g. Stage 8 snapshot vs Stage 10 evolution log).

- **`._docs/AI-agent-registry-context-flow-architecture.md`** - Scene Asset Visual State Generator (lines 754–770+): generates image prompts for assets whose appearance has changed. Informs how “modified state” is detected and how new image keys are produced for evolution.

- **`._docs/database-schema-state-transition-matrix.md`** - No explicit asset_change_log table; design one if you need full audit trail. `scene_asset_instances` has `inherited_from_scene_id` which supports “prior state” for rollback (e.g. re-copy from prior scene instance).

- **`._docs/inheritance_contract.md`** - Override rules and traceability (lines 119–125, 182–186); apply to logging overrides and state changes for assets.

---

## Feature 5.5: Scene-to-Scene Continuity

**Purpose**: Visual consistency across scene boundaries; end-state summary, continuity flags, visual diff (before/after), continuity warnings, manual override.

### Codebase Files

- **`backend/src/services/continuityRiskAnalyzer.ts`** - Rule-based continuity risk (`safe` | `risky` | `broken`) using scene status, prior scene completion, and upstream stage changes. Extend or call from APIs that need “continuity warning” for scene boundaries (e.g. when entering Scene N+1 or when comparing asset state to prior scene).

- **`backend/src/routes/projects.ts`** - Scene list endpoint (lines 458–512) already selects `end_state_summary`, `end_frame_thumbnail_url`, and runs `ContinuityRiskAnalyzer` to attach `continuityRisk` and `priorSceneEndState`. Use this pattern for any “end-state summary generation” and for feeding continuity flags to the frontend.

- **`src/components/pipeline/RearviewMirror.tsx`** - Shows prior scene end state (text and/or image): `priorSceneEndState`, `priorEndFrame`, `priorSceneName`. Reuse or extend for “visual diff (before/after)” (e.g. side-by-side or overlay of prior end vs current scene start) and for continuity warning display.

- **`src/components/pipeline/Stage7ShotList.tsx`** - Uses `RearviewMirror` (line 32, ~642). Stage 10 also uses it. Stage 8 can show RearviewMirror and/or a continuity panel (warnings, manual override) when entering a scene.

- **`src/lib/services/sceneService.ts`** - Fetches scenes and maps `priorSceneEndState`, `endFrameThumbnail`, `continuityRisk`. Ensures scene payloads used by Stage 8 and continuity UI include end-state and risk.

- **`src/types/scene.ts`** - `Scene` has `priorSceneEndState?`, `endFrameThumbnail?`, `continuityRisk?`; `ContinuityRisk` type. Use these for continuity UI and for “manual continuity override” (e.g. marking a scene as approved despite risk).

- **`backend/migrations/003_add_scenes_table.sql`** - `end_state_summary` on `scenes` (line 27). Migration 013 adds `end_frame_thumbnail_url`. End-state summary generation (e.g. at Stage 12 or when locking frames) should persist here.

- **`backend/migrations/013_add_end_frame_thumbnail.sql`** - Adds `end_frame_thumbnail_url` to scenes for Rearview Mirror / Stage 10/12. Required for visual continuity and before/after diff.

### Documentation Files

- **`._docs/database-schema-state-transition-matrix.md`** - Scene table continuity fields; Stage 6–12 invalidation table (lines 856–864): “Edit Stage 8 Asset” invalidates scene N frames/video; “Regenerate Frame” can mark downstream scenes `continuity_broken`. Defines when to set continuity flags and how edits cascade.

- **`._docs/implementation-task-list.md`** - Feature 5.5 checklist (lines 302–308): end-state summary generation, continuity flag system, visual diff (before/after), automatic continuity warning, manual continuity override.

- **`._docs/project-overview.md`** - Rearview Mirror spec (e.g. 559–561); Stage 10 start frame uses previous shot end frame for continuity (lines 247, 819); Phase B continuity flow. Use for where end-state is produced and consumed.

- **`._docs/user-flow.md`** - Stage 10 “Lock visual continuity” (line 229). Clarifies that continuity is locked at frame stage; Stage 8 feeds into that by defining starting state that should match prior end state.

- **`._docs/AI-agent-registry-context-flow-architecture.md`** - Context flow (e.g. 1188–1189): Scene Asset Relevance Agent uses asset instances to inherit from Scene N; Frame Prompt Assembly uses `end_frame_url` for Scene N+1 start. End-state summary and continuity flags should align with this flow.

- **`._docs/Phase-4-Status-Implementations.md`** - Describes continuity risk analyzer, RearviewMirror with real data, and scene API including `end_state_summary` and `continuityRisk`. Reference for existing continuity implementation to extend for Phase 5.

---

## Cross-Cutting Implementation Resources

### Codebase

- **`backend/migrations/007_image_generation_jobs.sql`** - Image job types and idempotency; extend for scene asset instance image jobs if not covered by 010.
- **`backend/migrations/010_global_asset_image_generation.sql`** - Nullable `project_id`/`branch_id` and global asset job policy; pattern for scene-scoped or instance-scoped image jobs.
- **`backend/migrations/009_asset_versioning_enhancements.sql`** - Project asset versioning/sync fields; conceptually related to tracking asset state over time (scene instances are another layer).
- **`src/lib/services/projectAssetService.ts`** - Project asset API client; add or use a scene-asset-instance service that works with project assets and scenes.
- **`src/lib/services/assetService.ts`** - Global asset API; used by AssetDrawer; needed when Stage 8 pulls from global library.
- **`._docs/API-integration-async-contract.md`** - If bulk image generation or continuity checks are async; align with existing async patterns.
- **`._docs/tech-stack.md`** - Stage 8–10 tech context (e.g. line 193).

### Documentation

- **`._docs/Phase-4-Planning-Guide.md`** - Structure and depth of this guide; mirror its feature-by-feature, codebase-vs-docs organization.
- **`._docs/golden-test-evaluation-framework.md`** - Stage 8 success definitions (e.g. lines 87–89, 196–198, 305–307) for “correctly identifies relevant assets,” “manages asset inheritance,” “appearances match”; use for acceptance criteria and tests.
