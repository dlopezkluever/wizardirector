# Location Continuity Post-Phase-4 Audit

Status: updated May 4, 2026.

Source plan: `5-3-location-implementation-plan.md`, Phases 0 through 4.

Predecessor baselines: `._docs/location-continuity-phase-0-audit.md`, `._docs/location-continuity-phase-3-audit.md`.

## Scope

This note records the current implementation state after the location-continuity work through Phase 4:

- Phase 1: baseline canonical shot-location identity
- Phase 2: Stage 7 lightweight location truth UX
- Phase 3: Stage 8 coverage and advanced continuity repair
- Phase 4: Stage 9 pre-generation continuity transparency

It covers schema/runtime state, frontend/backend ownership, endpoint changes, verified behavior, and remaining known gaps before Phase 5.

## Recent Implementation Trail

- `c96a6b9` Add shot location truth endpoints
- `314815b` Expose shot location state to frontend
- `6eb22f5` Add Stage 7 linked location UI
- `3e8e793` Add location coverage aggregation service
- `f2ce24c` Add Stage 8 coverage repair endpoints
- `564d480` Wire location coverage frontend client
- `ded03cd` Render server-owned Stage 8 coverage
- Phase 4 (this session, uncommitted at time of writing):
  - Add `continuityCompositionService` and `GenerationContinuityPackage` contract
  - Add `GET /api/projects/:id/scenes/:sceneId/continuity-preview`
  - Scope prompt assets by canonical `shot.location_asset_id` and tag manifest entries with semantic roles
  - Carry location refs across both start and end frame manifests; sort locations first
  - Route Stage 10 camera-change continuity prompt through the composition path
  - Add Stage 9 `ContinuityPreviewPanel` and wire it into `Stage9PromptSegmentation`

## Current Schema And Runtime State

- `backend/migrations/038_location_views_and_shot_camera_metadata.sql` still owns `location_views` and shot camera metadata:
  - `camera_distance`
  - `camera_height`
  - `camera_movement`
  - `camera_direction_id`
- `backend/migrations/039_shot_location_identity.sql` adds canonical location identity:
  - `shots.location_asset_id`
  - `shots.location_match_confidence`
  - `shots.location_match_source`
  - `shots.location_match_notes`
  - `project_assets.location_aliases`
  - `location_match_events`
- The Phase 0 drift around `shots.end_frame_reference_image_order` is now covered by migration `039_shot_location_identity.sql`.
- Phase 4 added no new schema. All new behavior runs on existing columns.
- `backend/src/services/locationResolverService.ts` owns baseline location normalization and resolution:
  - exact name matching
  - alias matching
  - fuzzy/token matching
  - camera-direction parent matching through `location_views`
  - ambiguity handling
  - audit event persistence
- `backend/src/services/continuityCompositionService.ts` (new in Phase 4) owns the canonical continuity assembly path used by Stage 9 preview and the Stage 10 camera-change continuity prompt.
- `src/types/locationContinuity.ts` carries frontend-safe DTOs:
  - `ShotLocationState`
  - `LocationCoverageSummary`
  - `LocationCoverageResponse`
  - `ShotContinuityPreview`
  - `ContinuityBaseCandidate`
  - `GenerationContinuityPackage`
  - `GenerationReferenceManifestEntry`

## Phase 1 State: Canonical Location Identity

Baseline identity is represented directly on shots through `location_asset_id` plus confidence/source/notes metadata.

Backend behavior:

- Stage 7 extraction resolves shot locations as shots are inserted.
- Shot updates re-run the resolver when `setting` or `camera_direction_id` changes, unless the location was manually assigned.
- Batch resolution is available for a scene through `POST /api/projects/:id/scenes/:sceneId/shots/resolve-locations`.
- Manual assignment is available through `PUT /api/projects/:id/scenes/:sceneId/shots/:shotId/location`.
- Shot read paths hydrate `locationState` for frontend review.

Frontend behavior:

- `src/lib/services/shotService.ts` normalizes the new location fields and exposes:
  - `assignShotLocation`
  - `resolveShotLocations`
- `Shot` types include camera metadata and location state.

## Phase 2 State: Stage 7 Lightweight Location Truth UX

Stage 7 is the lightweight correction surface for baseline location truth.

Current Stage 7 behavior:

- Shot rows expose linked location state, confidence/source metadata, and candidate options.
- Users can accept suggestions, choose a different location, or clear a manual assignment.
- Scene-level validation includes unresolved, ambiguous, and expected-location mismatch counts.
- Resolver behavior is visible without turning Stage 7 into advanced coverage management.

Important boundary:

- Stage 7 handles baseline `location_asset_id`.
- Stage 7 does not manage direction/view coverage. That responsibility belongs to Stage 8.

## Phase 3 State: Stage 8 Coverage And Repair

Stage 8 consumes server-derived coverage state instead of deriving coverage in the browser.

Backend ownership:

- `backend/src/services/locationCoverageService.ts` builds canonical coverage summaries.
- It groups shots only by `shot.location_asset_id`.
- It overlays:
  - assigned `camera_direction_id`
  - location view inventory
  - direction images
  - establishing/base fallback references
  - basic vs advanced severity rules
- It returns per-location counts and per-shot states:
  - `matched_view`
  - `fallback_view`
  - `missing_view_image`
  - `unassigned_direction`
  - `direction_location_mismatch`

Stage 8 backend endpoints:

- `GET /api/projects/:id/scenes/:sceneId/location-coverage?mode=basic|advanced`
- `PUT /api/projects/:id/scenes/:sceneId/shots/:shotId/camera-direction`

Repair behavior:

- Camera direction assignment validates that the selected direction exists and belongs to a project location.
- Assigning a direction can update `location_asset_id` through the camera-direction parent relationship when the shot has no conflicting manual location assignment.
- Clearing a direction re-runs location resolution unless the shot location is manually locked.

Frontend ownership:

- `src/lib/services/locationContinuityService.ts` fetches coverage and assigns camera directions.
- `src/components/pipeline/Stage8/LocationCoveragePanel.tsx` renders the server DTO.
- Stage 8 UI includes:
  - Basic/Advanced continuity mode switch
  - top-level coverage summary strip
  - unresolved-location warnings
  - one section per canonical location
  - view inventory
  - risk notices
  - shot assignment table
  - create default views
  - add direction
  - generate missing view images
  - use approved Stage 10 start frame as a view when an assigned direction lacks an image

Important replacement:

- The old Stage 8 `shot.setting.toLowerCase().includes(locationName)` grouping is gone from `LocationCoveragePanel`.
- Stage 8 now renders coverage meaning instead of inventing it locally.

## Phase 4 State: Stage 9 Pre-Generation Continuity Transparency

Phase 4 introduces a single continuity composition path used by both Stage 9 preview and the Stage 10 camera-change continuity prompt. Stage 9 now exposes the actual continuity package to the user before generation.

Backend ownership:

- `backend/src/services/continuityCompositionService.ts` builds `GenerationContinuityPackage` per shot.
  - Loads scene assets, including character angle variants and location views.
  - Calls `scopeAssetsForShotContinuity` to filter location candidates by canonical `shot.location_asset_id` (no more cross-location bleed in the prompt).
  - Calls `enrichAssetsWithAngleMatch` to select direction view, establishing view, and a fallback strategy tag.
  - Wraps `buildNumberedImageManifest` and `buildFrameReferenceManifests` so persisted manifests carry semantic role metadata.
  - Produces a `ShotContinuityPreview` (strength, generation mode, reference manifest, fallback chain, adaptation notes, risk notices) and a matching `GenerationContinuityPackage` (frame instructions, continuity instructions, start/end manifests, provider-ready references, debug metadata).
- `backend/src/services/promptGenerationService.ts` was extended in this phase:
  - `ShotData` carries `location_asset_id`, `location_match_confidence`, `location_match_source`, `location_match_notes`, and `start_continuity`.
  - `SceneAssetInstanceData.location_reference_strategy` records the chosen continuity strategy: `matched_direction`, `fallback_primary_direction`, `fallback_establishing`, `fallback_asset`, `direction_missing_image`, or `text_only`.
  - `ReferenceImageOrderEntry` carries `id`, `referenceRole`, `reason`, and `source` so persisted manifests retain attachment-role metadata.
  - `scopeAssetsForShotContinuity` is exported and used by `generatePromptSet`. Locations always come from `shot.location_asset_id`. Non-location assets follow shot assignments.
  - `enrichAssetsWithAngleMatch` annotates each location asset with its strategy tag.
  - `buildNumberedImageManifest` now sorts locations first (location → character → prop) and tags entries with semantic roles (`location_direction_main`, `location_establishing_context`, `location_asset_fallback`, `character_identity`, `prop_identity`, etc.).
  - `buildFrameReferenceManifests` carries location references in both start and end frame manifests so the canonical background reference is preserved across an in-shot transformation.
- `backend/src/services/frameGenerationService.ts` was extended in this phase:
  - End-frame reference assembly preserves the persisted `providerRole`/`role` instead of forcing `identity`.
  - The camera-change continuity prompt path now loads scene assets through `continuityCompositionService.loadSceneAssetsForContinuity`, so location views and angle variants travel with the prompt.
  - The previous shot's payload now carries the full Phase 1+ camera and location metadata when fed into the continuity prompt.
- `backend/src/routes/projects.ts` exposes `GET /api/projects/:id/scenes/:sceneId/continuity-preview`. The route loads shots and assets, hydrates per-shot assignments, calls `continuityCompositionService.buildGenerationPackages`, and returns both packages and shot-level previews. The route also forwards the new shot location fields when calling the legacy `generate-prompts` path so prompt generation uses canonical scoping.

Frontend ownership:

- `src/lib/services/locationContinuityService.ts` adds `fetchContinuityPreview()` returning `ContinuityPreviewResponse` (`packages`, `previews`, `sceneNumber`).
- `src/components/pipeline/Stage9/ContinuityPreviewPanel.tsx` (new) renders, per shot:
  - strength badge (strong / usable / weak / missing)
  - generation mode badge (fresh / match copy / camera change / reuse edit)
  - canonical location name and assigned direction
  - reference manifest cards with thumbnail, role label, provider role, and per-entry reason
  - fallback chain summary
  - adaptation notes
  - risk notices in an amber callout
  - "Repair in Stage 8" button when strength is weak/missing or risks are present (uses Stage 9's `onBack` to return to Stage 8)
- `src/components/pipeline/Stage9PromptSegmentation.tsx` fetches the preview map on mount and after assignment changes, refreshes after `Generate All Prompts` and per-shot regeneration, and renders the panel inside each expanded shot section above the asset panel.

Important boundary:

- Stage 9 is a transparency surface. It does not edit assignments, directions, or views. Repair actions still live in Stage 7 and Stage 8.
- The package is built fresh per request from current shot/asset state. It is not cached and does not yet drive Stage 10 directly (Stage 10 still consumes persisted `reference_image_order` and `end_frame_reference_image_order`, which are now annotated with the new role metadata).

## Generation Contract Status

Phase 4 implements most of the plan's "Generation Contract: Prompts and Attachments" section. Status by scenario:

| Scenario from plan | Status |
| --- | --- |
| 1. Direction view + image present | Implemented. Manifest tags entry as `location_direction_main`. |
| 2. Location but no direction | Implemented. Falls back to primary direction or establishing or asset image; entry tagged `location_asset_fallback` with adaptation note. |
| 3. Direction assigned but no image | Implemented. Establishing or baseline image is used; risk notice + adaptation note explain. |
| 4. Background but no usable image | Implemented. Manifest is empty for that location, panel shows weak-continuity warning. |
| 5. Reuse/edit from prior frame | Pending Phase 5. `ContinuityBaseCandidate` is defined but `selectedContinuityBase` is always `null`. |
| 6. Camera-change recomposition | Partially implemented. Continuity prompt now uses canonical scene assets and full prior-shot metadata; `buildContinuityInstructions` references location refs explicitly. |
| 7. End frame generation | Improved. Locations now ride the end manifest and persisted role survives the within-shot transformation swap. |
| 8. Optional blocking/composition | Reserved roles (`blocking_composition_reference`, `blocking_start_frame`, `blocking_end_frame`) exist; no producer wired. |

## Stage 10 Current State Before Phase 5

Stage 10 still consumes persisted manifests, with the small Phase 4 upgrades noted above.

Current behavior:

- `frameGenerationService.fetchShotReferenceImages` reads `reference_image_order` and now respects persisted `providerRole`/`role` for each entry.
- End frame generation uses `end_frame_reference_image_order` when available; locations are now expected to be present in this manifest after Phase 4 regeneration.
- Camera-change continuity prompts now use the composition service for scene assets and richer prior-shot metadata.
- Established-view promotion exists through `projectAssetService.establishViewFromFrame`.
- Stage 8 can invoke established-view behavior when an approved start frame can repair a missing assigned direction image.

Remaining gap:

- Stage 10 does not yet consume the `GenerationContinuityPackage` directly. The Phase 9 `generate-prompts` path still produces the persisted manifest; Stage 10 reads that persisted manifest. The two paths are now structurally aligned but not unified.
- Continuity-base suggestion and reuse/edit-first behavior are Phase 5 work.
- Continuity lineage persistence is not yet implemented beyond existing established-view provenance fields.

## Current Endpoint Map

Baseline location and shot endpoints:

- `GET /api/projects/:id/scenes/:sceneId/shots`
- `POST /api/projects/:id/scenes/:sceneId/shots/extract`
- `PUT /api/projects/:id/scenes/:sceneId/shots/:shotId`
- `POST /api/projects/:id/scenes/:sceneId/shots/resolve-locations`
- `PUT /api/projects/:id/scenes/:sceneId/shots/:shotId/location`

Stage 8 coverage and repair endpoints:

- `GET /api/projects/:id/scenes/:sceneId/location-coverage`
- `PUT /api/projects/:id/scenes/:sceneId/shots/:shotId/camera-direction`

Stage 9 continuity transparency endpoint (Phase 4):

- `GET /api/projects/:id/scenes/:sceneId/continuity-preview`

Existing location view endpoints reused by Stage 8:

- `GET /api/projects/:projectId/assets/:assetId/location-views`
- `POST /api/projects/:projectId/assets/:assetId/location-views`
- `POST /api/projects/:projectId/assets/:assetId/location-views/suggest-defaults`
- `PUT /api/projects/:projectId/assets/:assetId/location-views/:viewId`
- `POST /api/projects/:projectId/assets/:assetId/location-views/:viewId/generate-image`
- `POST /api/projects/:projectId/assets/:assetId/location-views/:viewId/establish-from-frame`

Stage 9 and Stage 10 prompt/frame endpoints (still consumed downstream of the new preview):

- `GET /api/projects/:id/scenes/:sceneId/prompts`
- `POST /api/projects/:id/scenes/:sceneId/generate-prompts`
- `PUT /api/projects/:id/scenes/:sceneId/shots/:shotId/prompts`
- `GET /api/projects/:projectId/scenes/:sceneId/frames`
- `POST /api/projects/:projectId/scenes/:sceneId/generate-frames`
- `POST /api/projects/:projectId/scenes/:sceneId/shots/:shotId/generate-continuity-prompt`
- `PUT /api/projects/:projectId/scenes/:sceneId/shots/:shotId/reference-images`

## String-Based Location And Matching Hot Spots

Resolved or reduced:

- Stage 8 no longer groups shots with `setting.includes(locationName)`.
- Stage 8 coverage grouping is server-owned and based on `location_asset_id`.
- Phase 4 prompt generation no longer attaches unrelated scene locations as fallback. Location candidates are scoped to `shot.location_asset_id` before angle matching.

Still present and intentional or pending:

- `locationResolverService` uses controlled text matching for baseline resolution. This is canonical resolver behavior, not UI-only inference.
- `promptGenerationService.enrichAssetsWithAngleMatch` still uses action/setting alias words as a tiebreaker among direction views inside the canonical location. This is now scoped, but the alias text path remains.
- `backend/src/routes/projectAssets.ts` default location-view suggestions still inspect scene headings with string inclusion.
- `shotValidationService` still uses string checks for adjacent validation, not canonical identity.
- General shot-to-asset relevance matching in `src/lib/utils/shotAssetMatcher.ts` remains separate from canonical location identity.

## Prompt And Attachment Assembly Hot Spots

Centralized in Phase 4:

- `promptGenerationService.buildNumberedImageManifest` now produces semantic-role tagged entries and locations-first ordering.
- `promptGenerationService.buildFrameReferenceManifests` now keeps locations in both start and end manifests.
- `frameGenerationService` end-frame and camera-change paths preserve persisted role metadata.
- `continuityCompositionService` is the single source for Stage 9 preview and the camera-change continuity prompt's asset context.

Still pending Phase 5:

- Stage 10 `generateFrame` does not consume `GenerationContinuityPackage` directly. It still reads the persisted manifest written by `generate-prompts`. They are aligned but not unified.
- `selectedContinuityBase` is always `null`; reuse/edit base ranking is Phase 5.
- Continuity lineage persistence (which approved frame produced which shot) is Phase 5.

## Verification State

Focused checks that passed after Phase 4:

- Backend TypeScript build:
  - `npm run build` from `backend` (clean).
- Backend targeted tests:
  - `npm test -- --testPathPattern='(promptGeneration|locationCoverage|frameGeneration)'` — 42/42 in `promptGeneration`, plus locationCoverage and frameGeneration suites passing.
  - Two `promptGeneration` test expectations were updated in this session to reflect the Phase 4 contract (locations carry into end manifest; locations sort first).
  - Full backend suite has 7 preexisting failures in `image-generation.test.ts` unrelated to Phase 4 (visual style capsule validation), reproducible on `main`.
- Frontend TypeScript:
  - `npx tsc --noEmit` (clean).
- Frontend lint on touched files:
  - `npx eslint src/components/pipeline/Stage9PromptSegmentation.tsx src/components/pipeline/Stage9/ContinuityPreviewPanel.tsx src/lib/services/locationContinuityService.ts src/types/locationContinuity.ts` — only the two preexisting hook-deps warnings on `Stage9PromptSegmentation.tsx`, no new issues.
- Frontend tests:
  - `npm test` — 244/244 pass.

Known verification caveats:

- Backend `npm run lint` cannot execute due to a preexisting ESLint plugin configuration error (`no-unused-expressions` rule construction failure). This is documented in the Phase 3 audit and was not introduced by Phase 4.
- Required root `npm run lint` still fails on existing repo-wide lint debt (generated `backend/dist` declarations, older `any`/React-hook issues outside Phase 4 changes).

Recommended manual smoke test before Phase 5:

1. Open Stage 9 for a scene whose shots have `location_asset_id` set (verify via Stage 7/8 first if unsure).
2. Each expanded shot should show the new continuity transparency panel above the asset panel.
3. Confirm strength badge, generation mode badge, location name, and direction label render.
4. Confirm reference cards include thumbnails, role labels, and per-entry reason text.
5. For a shot with no canonical direction, confirm the fallback chain and adaptation note explain the substitution.
6. For a shot with weak/missing continuity, confirm the "Repair in Stage 8" button is visible and returns to Stage 8.
7. Click `Generate All Prompts`; confirm the panel refreshes after generation finishes.
8. Spot-check a generated `reference_image_order` row in the database to confirm new entries include `referenceRole`, `reason`, and `source`.

## Phase 4 Exit Criteria Assessment

- Stage 9 accurately reflects generation-time continuity logic: largely achieved. The preview is built from the same composition path that produces the persisted manifest. Drift risk remains because Stage 10 reads persisted manifests rather than the live package.
- Users can understand weak continuity before spending generation effort: achieved through the strength badge, fallback chain, adaptation notes, and risk notices.
- Stage 9 generated manifests and Stage 10 generation references match exactly: achieved for newly generated prompts. Existing prompts persisted before Phase 4 retain their old (untagged, location-not-on-end) manifests until regenerated.
- Snapshot/integration coverage of preview vs. generation: not yet automated. Recommended before Phase 5 hardening.

## Phase 5 Readiness

The system is ready to proceed to Phase 5.

Phase 5 should build on the now-stable inputs:

- `GenerationContinuityPackage` shape and per-shot `ShotContinuityPreview`
- semantic role metadata persisted in `reference_image_order` / `end_frame_reference_image_order`
- canonical `shot.location_asset_id` and `shot.camera_direction_id`
- existing Stage 10 frame generation, established-view promotion, and `establishViewFromFrame` provenance fields

Recommended next implementation target:

1. Implement `continuityBaseService` populating `ContinuityBaseCandidate`s from approved frames in the same canonical location/direction.
2. Surface continuity-base candidates in the Stage 9 preview and feed the selected base back into the package.
3. Add Stage 10 chooser UI for reuse/edit vs fresh generation, consuming the package directly instead of the persisted manifest where feasible.
4. Persist continuity lineage (`generated_from_frame_id`, `promoted_from_shot_id`) on frames and on `location_views`.
5. Add snapshot tests asserting Stage 9 preview matches Stage 10 generation references for representative scenarios.
