# Location Continuity Phase 0 Audit

Status: implemented May 4, 2026.

Source plan: `5-3-location-implementation-plan.md`, Phase 0.

## Scope

This note records the current implementation baseline before adding canonical `location_asset_id` behavior. It covers the live frontend, backend routes, services, and migrations under `src`, `backend/src`, and `backend/migrations`.

## Current Schema And Runtime State

- `backend/migrations/038_location_views_and_shot_camera_metadata.sql` creates `location_views` with `project_asset_id`, `name`, `alias`, `description`, `view_type`, `camera_distance`, `camera_height`, `image_key_url`, `is_primary`, `source`, and established-from metadata.
- The same migration adds shot-level `camera_distance`, `camera_height`, `camera_movement`, and `camera_direction_id`.
- `backend/migrations/028_ref_image_num_end_frame.sql` adds `shots.reference_image_order` and `shots.end_frame_prompt`.
- Drift: live code reads and writes `shots.end_frame_reference_image_order`, but no migration in `backend/migrations` currently creates that column. Phase 1 or Phase 4 should either add the migration or confirm it exists outside this repo.
- `backend/migrations/031_regarding_continuity_in_frames.sql` adds `start_continuity`, `ai_start_continuity`, and `continuity_frame_prompt`.
- There is no current shot-level `location_asset_id`, `location_match_confidence`, `location_match_source`, or `location_match_notes`.

## Stage 7 Behavior

- `backend/src/routes/projects.ts` extracts scene `expected_location`, then looks for a matching `project_assets` location by exact case-insensitive name equality.
- If the location asset is found, Stage 7 fetches existing `location_views` and passes their names, aliases, and descriptions into shot extraction.
- New extracted directions are inserted into `location_views` with `source = 'stage7_inferred'`, and inserted shots receive `camera_direction_id` when `camera_direction_name` maps to a view.
- Drift: `GET /api/projects/:id/scenes/:sceneId/shots` transforms shots without returning `camera_distance`, `camera_height`, `camera_movement`, or `camera_direction_id`, even though `src/lib/services/shotService.ts` is ready to normalize those fields if they are present.

## Stage 8 Coverage Behavior

- `src/components/pipeline/Stage8/LocationCoveragePanel.tsx` fetches scene location assets, then fetches `location_views` for each location asset.
- Coverage grouping is local UI logic. It includes a shot for a location when either the shot's `camera_direction_id` belongs to one of that location's views, or `shot.setting.toLowerCase().includes(locationName)` is true.
- Covered shots are counted only when assigned to a direction view with an image.
- Unmatched shots fall back to the primary direction or first direction view.
- This confirms the planned replacement target: Stage 8 currently mixes explicit direction IDs with string-derived location membership.

## Stage 9 Prompt And Manifest Behavior

- `GET /api/projects/:id/scenes/:sceneId/prompts` returns prompt fields and `reference_image_order`, but not `end_frame_reference_image_order` or structured camera metadata.
- `POST /api/projects/:id/scenes/:sceneId/generate-prompts` fetches all scene asset instances, attaches character angle variants, then attaches all `location_views` for every location asset in the scene.
- `backend/src/services/promptGenerationService.ts` runs `enrichAssetsWithAngleMatch`, which chooses a location direction using `camera_direction_id` when available, otherwise camera distance/height and alias words from `action` or `setting`.
- `buildNumberedImageManifest` writes location references as role `style`, with matched direction first and establishing view second when available.
- `buildFrameReferenceManifests` creates start and end manifests from shot asset assignments. The route persists those as `reference_image_order` and `end_frame_reference_image_order`.
- Drift: location view selection is scoped to scene location assets and shot direction matching, not to a canonical shot `location_asset_id`. If multiple location assets are attached to a shot through legacy assignment behavior, Stage 9 can include location references outside the intended shot location.

## Stage 10 Generation And Continuity Behavior

- `backend/src/services/frameGenerationService.ts` reads `reference_image_order` in `fetchShotReferenceImages` and converts each entry to provider references, preserving `role = 'style'` only when the manifest entry says so.
- End-frame generation uses `end_frame_reference_image_order` when present. Otherwise it starts from `reference_image_order` and swaps within-shot transformation assets by case-insensitive asset name.
- Start-frame generation prepends continuity references for `camera_change` and uses copied pixels for `match`.
- `generateWithCameraChangeAnalysis` fetches scene assets without location views and builds continuity prompts without structured camera metadata.
- `POST /api/projects/:projectId/scenes/:sceneId/shots/:shotId/generate-continuity-prompt` also omits structured camera metadata, `camera_direction_id`, and `location_views` when calling `generateContinuityFramePrompt`.
- Stage 10 frontend fetches `cameraDirectionId` and location views only for established-view prompts. This is separate from provider-ready generation assembly.

## Established View Behavior

- `src/components/pipeline/EstablishViewPrompt.tsx` and Stage 10 use `projectAssetService.establishViewFromFrame`.
- `POST /api/projects/:projectId/assets/:assetId/location-views/:viewId/establish-from-frame` updates an existing view with the approved frame URL, sets `source = 'established'`, and stores scene/shot provenance fields.
- Current flow replaces or strengthens an existing location view. It does not yet create continuity lineage between generated frames and future generation packages.

## String-Based Location And Matching Hot Spots

- `backend/src/routes/projects.ts`: Stage 7 matches `scene.expected_location` to `project_assets.name` using exact case-insensitive equality.
- `src/components/pipeline/Stage8/LocationCoveragePanel.tsx`: Stage 8 groups shots by `shot.setting.toLowerCase().includes(locationName)`.
- `backend/src/services/promptGenerationService.ts`: location-view matching scores alias words by checking `shot.action` and `shot.setting` string containment.
- `backend/src/routes/projectAssets.ts`: default location-view suggestions inspect scene headings with `header.toLowerCase().includes(assetNameLower)`.
- `src/lib/utils/shotAssetMatcher.ts`: fuzzy/name matching exists for shot-to-asset relevance generally, but it is not a canonical location resolver.
- `backend/src/services/shotValidationService.ts`: validation uses string checks against `setting` and expected values; this is adjacent validation logic, not canonical location identity.

## Prompt And Attachment Assembly Hot Spots

- `reference_image_order` is generated in `promptGenerationService.buildNumberedImageManifest` or `buildFrameReferenceManifests`, then persisted by the Stage 9 generate-prompts route.
- `end_frame_reference_image_order` is generated by `buildFrameReferenceManifests`, manually edited through `PUT /api/projects/:projectId/scenes/:sceneId/shots/:shotId/reference-images`, and consumed by Stage 10 end-frame generation.
- Frame-as-reference and chain-from-end-frame routes manually prepend entries with `type = 'continuity'`.
- User upload reference routes append entries with `type = 'user_upload'`.
- Stage 10 provider references are assembled in `frameGenerationService.fetchShotReferenceImages`, `resolveEndFrameReferenceImages`, and camera-change generation.
- Location references are currently treated as provider `style` refs, while characters and props are provider `identity` refs.

## Live Endpoint Map

- `GET /api/projects/:id/scenes`: scenes with expected dependencies and continuity risk summary.
- `PUT /api/projects/:id/scenes`: persists scenes and `expected_location`.
- `GET /api/projects/:id/scenes/:sceneId/shots`: Stage 7 shot read path; currently omits structured camera fields in its transformed payload.
- `POST /api/projects/:id/scenes/:sceneId/shots/extract`: Stage 7 extraction and inferred `location_views` creation.
- `PUT /api/projects/:id/scenes/:sceneId/shots/:shotId`: Stage 7 shot edit path; allows structured camera fields.
- `GET /api/projects/:id/scenes/:sceneId/prompts`: Stage 9 prompt read path.
- `POST /api/projects/:id/scenes/:sceneId/generate-prompts`: Stage 9 prompt and manifest generation path.
- `PUT /api/projects/:id/scenes/:sceneId/shots/:shotId/prompts`: Stage 9 prompt and continuity mode update path.
- `GET /api/projects/:projectId/scenes/:sceneId/frames`: Stage 10 frame read path with `reference_image_order`, computed end-frame references, frame links, and adjacent frames.
- `POST /api/projects/:projectId/scenes/:sceneId/generate-frames`: Stage 10 generation path.
- `POST /api/projects/:projectId/scenes/:sceneId/shots/:shotId/generate-continuity-prompt`: Stage 10 continuity prompt regeneration path.
- `PUT /api/projects/:projectId/scenes/:sceneId/shots/:shotId/reference-images`: manual manifest edit path for start or end frames.
- `POST /api/projects/:projectId/scenes/:sceneId/shots/:shotId/add-frame-as-reference`: manual continuity reference insertion path.
- `POST /api/projects/:projectId/assets/:assetId/location-views`: create location view.
- `GET /api/projects/:projectId/assets/:assetId/location-views`: list location views.
- `PUT /api/projects/:projectId/assets/:assetId/location-views/:viewId`: update location view metadata or image URL.
- `POST /api/projects/:projectId/assets/:assetId/location-views/:viewId/establish-from-frame`: promote an approved frame into an established view.
- `POST /api/projects/:projectId/assets/:assetId/location-views/:viewId/generate-image`: generate a missing location-view image.

## Target DTO Vocabulary

The Phase 0 DTO names are now represented in `src/types/locationContinuity.ts`:

- `ShotLocationState`
- `LocationCoverageSummary`
- `ShotContinuityPreview`
- `ContinuityBaseCandidate`
- `GenerationContinuityPackage`
- `GenerationReferenceManifestEntry`

These shapes are intentionally additive and frontend-safe. Backend service interfaces can mirror them or move them into a shared package later.

## Glossary

- Location: the story place or set represented by a project asset with `asset_type = 'location'`.
- Location reference: any image or text reference used to preserve the visual identity of a location.
- Location view: a row in `location_views` that describes a specific visual direction or establishing view for one location asset.
- Camera direction: a directional `location_view` assigned to a shot through `camera_direction_id`.
- Established view: a location view whose image came from an approved generated frame and whose `source` is `established`.
- Continuity base: an approved frame reused as the primary visual base for another generation.
- Generation package: the complete server-assembled set of prompt instructions, continuity decisions, fallback notes, and ordered references for one frame generation.
- Reference manifest: the persisted ordered list of reference images used to create provider-ready references.
- Attachment role: the semantic reason a reference image is attached, such as `location_direction_main`, `continuity_base_frame`, or `character_identity`.

## Phase 0 Exit Notes

- Current-state behavior is documented.
- String-matching hot spots are enumerated.
- Prompt and attachment hot spots are enumerated.
- Endpoint and payload ownership is mapped.
- DTO vocabulary is defined for later implementation phases.
- The biggest confirmed drift is the missing migration for `end_frame_reference_image_order` relative to live code usage.
