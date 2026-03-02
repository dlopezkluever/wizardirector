
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
