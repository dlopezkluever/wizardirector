Resume this session with:
claude --resume 5034934f-daec-457d-8612-17df8a2fc791

  Here is Claude's plan:
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌ Shot Asset Assignment System — Part 3: Implementation Plan

 Context

 Stage 5's LLM extraction frequently produces mis-typed assets (character extracted as prop), duplicates ("John Smith" + "John"), and transformation-linked pairs (character + their transformed form as separate assets). Users can merge same-type assets but cannot change types, merge across types, or convert 
  duplicate assets into transformation events. This plan addresses all three gaps while also fixing a latent bug in the merge flow where shot_asset_assignments are silently lost during duplicate instance cleanup.

 ---
 Feature 1: Change Asset Type (Stage 5)

 Backend — Accept asset_type in PUT route

 File: backend/src/routes/projectAssets.ts (lines 553-644)

 - Line 557: Add asset_type to destructured req.body
 - Line 585: Include asset_type === undefined in the isOnlyDeferredUpdate guard
 - After line 617: Add asset_type validation block (validate against enum, add to updates, track in fieldsToTrack if global-linked)

 Frontend Service — Add asset_type to request type

 File: src/lib/services/projectAssetService.ts (line 24-29)

 - Add asset_type?: 'character' | 'prop' | 'location' | 'extra_archetype' to UpdateProjectAssetRequest
 - The updateAsset() method already sends the full updates object — no further change needed

 Frontend UI — "Change Type" submenu in context menu

 File: src/components/pipeline/Stage5Assets.tsx

 - Add handleChangeType(assetId, newType) handler (~line 532 area) — calls projectAssetService.updateAsset with { asset_type: newType }, updates local state, shows toast
 - Add DropdownMenuSub with DropdownMenuSubTrigger ("Change Type") and DropdownMenuSubContent listing the 4 types — insert in the context menu (lines ~1088-1127) after Defer and before Manage Angles
 - Current type shows checkmark and is disabled; guarded by !isStageLockedOrOutdated && !asset.locked
 - Import DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent from shadcn, and Check from lucide-react

 Tests

 - Backend: type change succeeds when unlocked, blocked when locked, rejects invalid type
 - Frontend: submenu renders 4 options, current type disabled, hidden when locked

 ---
 Feature 2: Cross-Type Merge + Shot Assignment Migration Fix

 Backend — Remove same-type validation

 File: backend/src/routes/projectAssets.ts (lines 752-759)

 - Delete lines 754-759 (the differentType check and error response)
 - Keep line 753 (const survivor = ...) — needed for context

 Backend — Migrate shot_asset_assignments before deleting duplicate instances

 File: backend/src/routes/projectAssets.ts — insert between line 782 (where toDelete is computed) and line 800 (where toDelete instances are deleted)

 New logic for each instance in toDelete:
 1. Find survivor's instance for the same scene (query scene_asset_instances where project_asset_id = survivorAssetId and matching scene_id)
 2. Fetch absorbed instance's shot_asset_assignments (id, shot_id, presence_type)
 3. Fetch survivor instance's shot_asset_assignments for conflict detection
 4. For each absorbed assignment:
   - No conflict (survivor has no assignment for that shot): re-point to survivor's instance via UPDATE
   - Conflict (both have assignment for same shot): keep the more specific one. Specificity: enters/exits/passes_through (3) > throughout (1). If absorbed is more specific, update survivor's assignment to use absorbed's presence_type. Delete the absorbed assignment.
   - Tie (both equally specific): keep survivor's, delete absorbed's

 Track assignmentsMigrated count in the response.

 Frontend — Relax canMerge validation

 File: src/components/pipeline/Stage5Assets.tsx (lines 629-637)

 - Change canMerge to just selectedAssets.length >= 2 (remove type-uniqueness check)
 - Update mergeDisabledReason to remove the "must be same type" branch

 Frontend — Cross-type warning in MergeDialog

 File: src/components/pipeline/MergeDialog.tsx

 - Add hasMixedTypes check: new Set(assets.map(a => a.asset_type)).size > 1
 - Insert amber Alert before the Summary section (~line 134) when hasMixedTypes: "These assets have different types. The survivor will keep its type ({type}). Absorbed assets and their scene associations will be transferred."
 - Add type badge (<Badge> with capitalized type name) next to each asset in the RadioGroup — after the scene number badges (line ~110-114)

 Tests

 - Backend: cross-type merge succeeds, assignment migration (no conflict, absorbed-wins, survivor-wins, tie), no assignment loss on repoint path
 - Frontend: MergeDialog shows/hides warning based on type mix, canMerge allows mixed types

 ---
 Feature 3: Convert to Transformation (Stage 8)

 Backend — Extend generateTransformationPrefill service

 File: backend/src/services/transformationEventService.ts (lines 380-462)

 - Add optional absorbedInstanceId?: string parameter
 - When provided:
   - Fetch absorbed instance's effective_description and image_key_url
   - Append absorbed context to LLM prompt
   - Query shots ordered by shot_order, find absorbed asset's shot_asset_assignments to infer trigger_shot_id (first assigned shot) and transformation_type (single shot = instant, multiple = gradual with last shot as completion_shot_id)
 - Extend return type to include optional trigger_shot_id, transformation_type, completion_shot_id
 - When absorbedInstanceId is NOT provided: behavior is identical to current (backward compatible)

 Backend — Accept absorbed_instance_id in route

 File: backend/src/routes/sceneAssets.ts (lines 1748-1772)

 - Add absorbed_instance_id to destructured body (line ~1754)
 - Pass through as 5th argument to service method

 Frontend — Extend prefill service method

 File: src/lib/services/transformationEventService.ts (lines 132-148)

 - Add absorbed_instance_id?: string to the data parameter type
 - Extend return type with optional trigger_shot_id, transformation_type, completion_shot_id

 Frontend — Extend AddTransformationDialog for initial values

 File: src/components/pipeline/Stage8/AddTransformationDialog.tsx

 - Add optional props: initialTriggerShotId, initialTransformationType, initialCompletionShotId, initialPostDescription, initialNarrative
 - Add controlled open support: externalOpen?: boolean, onExternalOpenChange?: (open: boolean) => void
 - When controlled externally, skip rendering DialogTrigger (dialog opened programmatically)
 - On open with initial values: populate state, set userEdited refs to prevent auto-prefill overwrite
 - When no initial/external props provided: behavior identical to current

 Frontend — New ConvertToTransformationDialog component

 File: src/components/pipeline/Stage8/ConvertToTransformationDialog.tsx (NEW ~200 lines)

 Props: open, onOpenChange, absorbedAsset (SceneAssetInstance), sceneAssets, projectId, sceneId, shots, sceneScriptExcerpt?, onComplete

 Step 1 — Pick Base Asset:
 - RadioGroup listing all other scene assets (name + thumbnail + type badge)
 - "Next" button

 Step 2 — Prefilled Dialog:
 - Call transformationEventService.generatePrefill() with absorbed_instance_id
 - Show loading spinner during LLM call
 - Open AddTransformationDialog with returned values as initial props
 - onAdd callback wraps: create event → set post_image from absorbed → remove absorbed scene instance → prompt defer

 Post-confirm cleanup:
 1. If absorbed has image → update transformation event's post_image_key_url
 2. Remove absorbed scene_asset_instance from current scene (existing delete endpoint)
 3. Toast prompt: "Also defer [name] from the project?" → if yes, call updateAsset with { deferred: true }

 Frontend — Add context menu trigger in SceneAssetListPanel

 File: src/components/pipeline/Stage8/SceneAssetListPanel.tsx (lines 126-234)

 - Add a DropdownMenu with MoreVertical trigger button on each asset card (alongside existing remove X button at top-right, add ... at top-left, visible on hover)
 - Menu item: "Convert to Transformation..." with RefreshCw icon
 - Add onConvertToTransformation?: (instance: SceneAssetInstance) => void to component props
 - Parent Stage8VisualDefinition.tsx manages convertingAsset state and renders the dialog

 Tests

 - Backend: prefill without absorbed ID returns current format, with absorbed ID returns enriched response
 - Frontend: AddTransformationDialog with/without initial values, ConvertToTransformationDialog asset list rendering

 ---
 Implementation Order

 ┌──────┬─────────────────────────────────────────────────────────────────┬────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
 │ Step │                              What                               │                                                   Files                                                    │
 ├──────┼─────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ 1    │ Change Asset Type — backend                                     │ backend/src/routes/projectAssets.ts                                                                        │
 ├──────┼─────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ 2    │ Change Asset Type — frontend service + UI                       │ src/lib/services/projectAssetService.ts, src/components/pipeline/Stage5Assets.tsx                          │
 ├──────┼─────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ 3    │ Cross-Type Merge — remove constraint + add assignment migration │ backend/src/routes/projectAssets.ts                                                                        │
 ├──────┼─────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ 4    │ Cross-Type Merge — frontend (canMerge + MergeDialog warning)    │ Stage5Assets.tsx, MergeDialog.tsx                                                                          │
 ├──────┼─────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ 5    │ Convert to Transformation — backend (extend prefill)            │ backend/src/services/transformationEventService.ts, backend/src/routes/sceneAssets.ts                      │
 ├──────┼─────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ 6    │ Convert to Transformation — extend AddTransformationDialog      │ Stage8/AddTransformationDialog.tsx                                                                         │
 ├──────┼─────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ 7    │ Convert to Transformation — new dialog + Stage 8 integration    │ Stage8/ConvertToTransformationDialog.tsx (new), Stage8/SceneAssetListPanel.tsx, Stage8VisualDefinition.tsx │
 ├──────┼─────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ 8    │ Frontend service update                                         │ src/lib/services/transformationEventService.ts                                                             │
 ├──────┼─────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ 9    │ Tests + lint                                                    │ All modified files                                                                                         │
 └──────┴─────────────────────────────────────────────────────────────────┴────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

 Steps 1-2 and 3-4 can be done in parallel. Step 5+ depends on nothing above but benefits from 1-4 being complete.

 Verification

 - Feature 1: Open Stage 5, right-click asset → Change Type submenu → select new type → verify type updates in UI and persists on reload. Confirm locked assets don't show the option.
 - Feature 2: Select 2 assets of different types → Merge button enabled → confirm merge → verify survivor keeps type, warning shown, assignments migrated. Check Stage 9 to verify shot assignments weren't lost.
 - Feature 3: In Stage 8, click ... on an asset → "Convert to Transformation" → pick base → verify prefilled dialog opens with inferred shot/type → confirm → verify transformation event created, absorbed instance removed from scene, defer prompt appears.
 - Lint: Run npm run lint from project root and cd backend && npm run lint
 - Tests: Run npm test from root and cd backend && npm test