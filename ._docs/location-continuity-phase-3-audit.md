# Location Continuity Post-Phase-3 Audit

Status: updated May 5, 2026.

Source plan: `5-3-location-implementation-plan.md`, Phases 0 through 3.

Predecessor baseline: `._docs/location-continuity-phase-0-audit.md`.

## Scope

This note records the current implementation state after the location-continuity work through Phase 3:

- Phase 1: baseline canonical shot-location identity
- Phase 2: Stage 7 lightweight location truth UX
- Phase 3: Stage 8 coverage and advanced continuity repair

It covers schema/runtime state, frontend/backend ownership, endpoint changes, verified behavior, and remaining known gaps before Phase 4.

## Recent Implementation Trail

- `c96a6b9` Add shot location truth endpoints
- `314815b` Expose shot location state to frontend
- `6eb22f5` Add Stage 7 linked location UI
- `3e8e793` Add location coverage aggregation service
- `f2ce24c` Add Stage 8 coverage repair endpoints
- `564d480` Wire location coverage frontend client
- `ded03cd` Render server-owned Stage 8 coverage

## Current Schema And Runtime State

- `backend/migrations/038_location_views_and_shot_camera_metadata.sql` still owns `location_views` and shot camera metadata:
  - `camera_distance`
  - `camera_height`
  - `camera_movement`
  - `camera_direction_id`
- `backend/migrations/039_shot_location_identity.sql` now adds canonical location identity:
  - `shots.location_asset_id`
  - `shots.location_match_confidence`
  - `shots.location_match_source`
  - `shots.location_match_notes`
  - `project_assets.location_aliases`
  - `location_match_events`
- The Phase 0 drift around `shots.end_frame_reference_image_order` is now covered by migration `039_shot_location_identity.sql`.
- `backend/src/services/locationResolverService.ts` owns baseline location normalization and resolution:
  - exact name matching
  - alias matching
  - fuzzy/token matching
  - camera-direction parent matching through `location_views`
  - ambiguity handling
  - audit event persistence
- `src/types/locationContinuity.ts` now carries frontend-safe DTOs for:
  - `ShotLocationState`
  - `LocationCoverageSummary`
  - `LocationCoverageResponse`
  - `ShotContinuityPreview`
  - `ContinuityBaseCandidate`
  - `GenerationContinuityPackage`
  - `GenerationReferenceManifestEntry`

## Phase 1 State: Canonical Location Identity

Baseline identity is now represented directly on shots through `location_asset_id` plus confidence/source/notes metadata.

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

Stage 7 is now the lightweight correction surface for baseline location truth.

Current Stage 7 behavior:

- Shot rows expose linked location state, confidence/source metadata, and candidate options.
- Users can accept suggestions, choose a different location, or clear a manual assignment.
- Scene-level validation includes unresolved, ambiguous, and expected-location mismatch counts.
- Resolver behavior is visible without turning Stage 7 into advanced coverage management.

Important boundary:

- Stage 7 handles baseline `location_asset_id`.
- Stage 7 does not manage direction/view coverage. That responsibility now belongs to Stage 8.

## Phase 3 State: Stage 8 Coverage And Repair

Stage 8 now consumes server-derived coverage state instead of deriving coverage in the browser.

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

New backend endpoints:

- `GET /api/projects/:id/scenes/:sceneId/location-coverage?mode=basic|advanced`
- `PUT /api/projects/:id/scenes/:sceneId/shots/:shotId/camera-direction`

Repair behavior:

- Camera direction assignment validates that the selected direction exists and belongs to a project location.
- Assigning a direction can update `location_asset_id` through the camera-direction parent relationship when the shot has no conflicting manual location assignment.
- Clearing a direction re-runs location resolution unless the shot location is manually locked.

Frontend ownership:

- `src/lib/services/locationContinuityService.ts` fetches coverage and assigns camera directions.
- `src/components/pipeline/Stage8/LocationCoveragePanel.tsx` now renders the server DTO.
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

Existing location view endpoints reused by Stage 8:

- `GET /api/projects/:projectId/assets/:assetId/location-views`
- `POST /api/projects/:projectId/assets/:assetId/location-views`
- `POST /api/projects/:projectId/assets/:assetId/location-views/suggest-defaults`
- `PUT /api/projects/:projectId/assets/:assetId/location-views/:viewId`
- `POST /api/projects/:projectId/assets/:assetId/location-views/:viewId/generate-image`
- `POST /api/projects/:projectId/assets/:assetId/location-views/:viewId/establish-from-frame`

Stage 9 and Stage 10 endpoints are still largely pre-Phase-4:

- `GET /api/projects/:id/scenes/:sceneId/prompts`
- `POST /api/projects/:id/scenes/:sceneId/generate-prompts`
- `PUT /api/projects/:id/scenes/:sceneId/shots/:shotId/prompts`
- `GET /api/projects/:projectId/scenes/:sceneId/frames`
- `POST /api/projects/:projectId/scenes/:sceneId/generate-frames`
- `POST /api/projects/:projectId/scenes/:sceneId/shots/:shotId/generate-continuity-prompt`
- `PUT /api/projects/:projectId/scenes/:sceneId/shots/:shotId/reference-images`

## Stage 9 Current State Before Phase 4

Stage 9 has not yet been refactored around a canonical continuity composition service.

Current behavior:

- Prompt generation still fetches scene asset instances and attaches `location_views` for location assets in the scene.
- `promptGenerationService.enrichAssetsWithAngleMatch` still selects a location direction using:
  - `camera_direction_id` when available
  - camera distance/height
  - alias words from `shot.action` or `shot.setting`
- `reference_image_order` is still produced by prompt generation and persisted on shots.
- `end_frame_reference_image_order` is still produced/persisted by the prompt route and consumed by Stage 10.

Remaining Phase 4 gap:

- Stage 9 does not yet preview the exact generation continuity package.
- Location reference selection is not yet scoped first by canonical shot `location_asset_id`.
- Attachment roles are still not fully expressed through the planned `GenerationReferenceManifestEntry` role contract.
- Prompt-preview logic and generation-reference logic are still separate enough to drift.

## Stage 10 Current State Before Phase 5

Stage 10 still consumes persisted manifests and existing frame continuity behavior.

Current behavior:

- `frameGenerationService.fetchShotReferenceImages` reads `reference_image_order`.
- End frame generation uses `end_frame_reference_image_order` when available.
- Camera-change and match/copy continuity behavior still exists.
- Established-view promotion exists through `projectAssetService.establishViewFromFrame`.
- Stage 8 can now invoke existing established-view behavior when an approved start frame can repair a missing assigned direction image.

Remaining gap:

- Stage 10 does not yet consume a canonical `GenerationContinuityPackage`.
- Continuity-base suggestion and reuse/edit-first behavior are still Phase 5 work.
- Continuity lineage persistence is not yet implemented beyond existing established-view provenance fields.

## String-Based Location And Matching Hot Spots

Resolved or reduced:

- Stage 8 no longer groups shots with `setting.includes(locationName)`.
- Stage 8 coverage grouping is server-owned and based on `location_asset_id`.

Still present and intentional or pending:

- `locationResolverService` uses controlled text matching for baseline resolution. This is canonical resolver behavior, not UI-only inference.
- `promptGenerationService.enrichAssetsWithAngleMatch` still uses action/setting alias words as a fallback for location-view selection. Phase 4 should centralize this behind continuity composition and canonical location scoping.
- `backend/src/routes/projectAssets.ts` default location-view suggestions still inspect scene headings with string inclusion.
- `shotValidationService` still uses string checks for adjacent validation, not canonical identity.
- General shot-to-asset relevance matching in `src/lib/utils/shotAssetMatcher.ts` remains separate from canonical location identity.

## Prompt And Attachment Assembly Hot Spots

Still pending Phase 4 consolidation:

- `promptGenerationService.buildNumberedImageManifest`
- `promptGenerationService.buildFrameReferenceManifests`
- Stage 9 `generate-prompts` route manifest persistence
- Stage 10 `fetchShotReferenceImages`
- Stage 10 end-frame reference resolution
- Stage 10 continuity prompt regeneration

The key Phase 4 requirement remains unchanged:

- Build or extract one continuity composition path that produces both Stage 9 preview data and Stage 10 generation inputs.

## Verification State

Focused checks that passed after Phase 3:

- Backend targeted tests:
  - `npm test -- locationCoverageService.test.ts shotLocationRoutes.test.ts`
- Backend TypeScript build:
  - `npm run build` from `backend`
- Frontend build:
  - `npm run build`
- Targeted frontend lint for touched frontend files:
  - `npx eslint src/components/pipeline/Stage8/LocationCoveragePanel.tsx src/components/pipeline/Stage8VisualDefinition.tsx src/lib/services/locationContinuityService.ts src/types/locationContinuity.ts`
- Patch whitespace check:
  - `git diff --check`

Known verification caveat:

- Required root `npm run lint` currently fails on existing repo-wide lint debt, including generated `backend/dist` declarations and older `any`/React hook issues outside the Phase 3 changes.

Recommended manual smoke test before Phase 4:

1. Open Stage 8 for a scene with shots that have `location_asset_id`.
2. Confirm the location coverage panel loads from `/location-coverage`.
3. Toggle Basic and Advanced modes and confirm warning severity changes.
4. Assign and clear a camera direction from the shot table.
5. Confirm the coverage panel refreshes without relying on shot setting text.
6. Generate a missing view image where a fallback/style reference exists.
7. If an approved Stage 10 start frame exists for a shot with a missing assigned direction image, use it as the established view.

## Phase 3 Exit Criteria Assessment

- Stage 8 is now the clear repair surface for advanced continuity: achieved.
- Server owns coverage logic: achieved.
- Users can fix gaps from the coverage view: mostly achieved.
- Stage 8 no longer relies on raw string inclusion for grouping: achieved.
- Empty states for no views and no linked shots are present: achieved.
- Advanced-mode warnings are stronger than default-mode warnings: achieved.

The main caveat is that prompt-time continuity preview and generation attachment selection are still Phase 4 work.

## Phase 4 Readiness

The system is ready to proceed to Phase 4.

Phase 4 should build on the now-stable inputs:

- `shot.location_asset_id`
- `shot.camera_direction_id`
- `location_views`
- Stage 8 coverage results and risk states
- existing `reference_image_order`
- existing `end_frame_reference_image_order`

Recommended next implementation target:

1. Create a backend continuity composition service.
2. Scope location references by canonical `location_asset_id` first.
3. Select direction/establishing/fallback references with explicit roles.
4. Expose Stage 9 continuity preview from the same package generation will use.
5. Refactor Stage 9 prompt generation and Stage 10 reference assembly to consume the same package contract.

