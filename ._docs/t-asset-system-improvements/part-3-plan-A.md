 Asset System Improvements — Implementation Plan

 Context

 Stage 5's LLM extraction frequently produces mis-typed assets and duplicates. Users can merge same-type assets but cannot change types, merge across types, or handle shot assignment data loss during merge. This plan addresses these gaps in two phases.

 ---
 PHASE A: Change Asset Type + Cross-Type Merge (Stage 5)

 Feature 1: Change Asset Type

 Step 1 — Types (src/lib/services/projectAssetService.ts:24-29)

 Add asset_type to UpdateProjectAssetRequest:
 export interface UpdateProjectAssetRequest {
   name?: string;
   description?: string;
   image_prompt?: string;
   deferred?: boolean;
   asset_type?: 'character' | 'prop' | 'location' | 'extra_archetype'; // NEW
 }
 No change to updateAsset() method — it already spreads the full updates object.

 Step 2 — Backend PUT route (backend/src/routes/projectAssets.ts:553-644)

 - Line 557: Add asset_type to destructured req.body
 - Line 585: Add asset_type === undefined to the isOnlyDeferredUpdate guard (so type change is blocked when locked, like name/description)
 - After line 617 (after image_prompt block): Add validation + update block:
 if (asset_type !== undefined) {
   const validTypes = ['character', 'prop', 'location', 'extra_archetype'];
   if (!validTypes.includes(asset_type)) return 400 error
   updates.asset_type = asset_type;
   if (existingAsset.global_asset_id) fieldsToTrack.push('asset_type');
 }

 Step 3 — Frontend UI (src/components/pipeline/Stage5Assets.tsx)

 New handler (~line 532 area):
 const handleChangeType = async (assetId: string, newType: AssetType) => {
   try {
     await projectAssetService.updateAsset(projectId, assetId, { asset_type: newType });
     setAssets(prev => prev.map(a => a.id === assetId ? { ...a, asset_type: newType } : a));
     toast.success(`Changed type to ${newType}`);
   } catch (error) {
     toast.error(error instanceof Error ? error.message : 'Failed to change type');
   }
 };

 New imports: Add DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent to the dropdown-menu import (line 22-28).

 Context menu submenu — Insert after "Defer Asset" (line 1103), before "Manage Angles" (line 1105):
 {!isStageLockedOrOutdated && !asset.locked && (
   <DropdownMenuSub>
     <DropdownMenuSubTrigger>
       <RefreshCw className="w-4 h-4 mr-2" />
       Change Type
     </DropdownMenuSubTrigger>
     <DropdownMenuSubContent>
       {(['character', 'prop', 'location', 'extra_archetype'] as const).map(t => (
         <DropdownMenuItem
           key={t}
           disabled={asset.asset_type === t}
           onClick={() => handleChangeType(asset.id, t)}
         >
           {asset.asset_type === t && <Check className="w-4 h-4 mr-2" />}
           {t === 'extra_archetype' ? 'Extra/Archetype' : t.charAt(0).toUpperCase() + t.slice(1)}
         </DropdownMenuItem>
       ))}
     </DropdownMenuSubContent>
   </DropdownMenuSub>
 )}

 ---
 Feature 2: Cross-Type Merge + Shot Assignment Migration + Description UX

 Step 4 — Types (src/types/asset.ts:181-192)

 Update request/response:
 export interface MergeAssetsRequest {
   survivorAssetId: string;
   absorbedAssetIds: string[];
   updatedName?: string;
   updatedDescription?: string; // NEW
 }

 export interface MergeAssetsResponse {
   success: true;
   survivor: ProjectAsset;
   instancesRepointed: number;
   assetsAbsorbed: number;
   assignmentsMigrated: number; // NEW
 }

 Step 5 — Backend: Remove same-type validation (backend/src/routes/projectAssets.ts:752-759)

 Delete lines 754-759 entirely (the differentType check + error response). Keep line 753 (const survivor = ...).

 Step 6 — Backend: Migrate shot_asset_assignments before deleting duplicates (backend/src/routes/projectAssets.ts:766-806)

 6a: Change survivor instances query (line 767-770) to also select id:
 .select('id, scene_id')  // was just 'scene_id'
 Build a Map instead of a Set: survivorSceneMap = new Map(instances.map(i => [i.scene_id, i.id]))

 6b: Between toDelete computation (line 782) and the delete operation (line 800), insert assignment migration logic:

 let assignmentsMigrated = 0;
 for (const absorbedInst of toDelete) {
   const survivorInstId = survivorSceneMap.get(absorbedInst.scene_id);
   if (!survivorInstId) continue;

   // Fetch absorbed instance's shot assignments
   const { data: absorbedAssignments } = await supabase
     .from('shot_asset_assignments')
     .select('id, shot_id, presence_type')
     .eq('scene_asset_instance_id', absorbedInst.id);

   if (!absorbedAssignments?.length) continue;

   // Fetch survivor instance's shot assignments for conflict detection
   const { data: survivorAssignments } = await supabase
     .from('shot_asset_assignments')
     .select('id, shot_id, presence_type')
     .eq('scene_asset_instance_id', survivorInstId);

   const survivorByShot = new Map((survivorAssignments || []).map(a => [a.shot_id, a]));

   for (const absorbed of absorbedAssignments) {
     const existing = survivorByShot.get(absorbed.shot_id);
     if (!existing) {
       // No conflict: re-point to survivor instance
       await supabase.from('shot_asset_assignments')
         .update({ scene_asset_instance_id: survivorInstId })
         .eq('id', absorbed.id);
       assignmentsMigrated++;
     } else {
       // Conflict: compare specificity
       const specificity = (t: string) =>
         ['enters','exits','passes_through'].includes(t) ? 3 : 1;
       if (specificity(absorbed.presence_type) > specificity(existing.presence_type)) {
         // Absorbed is more specific — update survivor's assignment
         await supabase.from('shot_asset_assignments')
           .update({ presence_type: absorbed.presence_type })
           .eq('id', existing.id);
         assignmentsMigrated++;
       }
       // Delete absorbed assignment (cascade will also handle it, but explicit is cleaner)
       await supabase.from('shot_asset_assignments')
         .delete().eq('id', absorbed.id);
     }
   }
 }

 6c: Accept updatedDescription from req.body and apply to survivor update payload if provided.

 6d: Include assignmentsMigrated in response JSON.

 Step 7 — Backend: New merge-descriptions endpoint (backend/src/routes/projectAssets.ts)

 Add a new route after the merge endpoint:
 POST /api/projects/:projectId/assets/merge-descriptions
 Body: { descriptions: string[] }
 Returns: { mergedDescription: string }
 Reuses mergeWithLLM() logic from backend/src/services/assetDescriptionMerger.ts (adapt to accept an array — currently takes two strings, but we can join absorbed descriptions or call it with survivor+absorbed pair).

 Step 8 — Frontend service (src/lib/services/projectAssetService.ts)

 - Update mergeAssets() to pass updatedDescription from request
 - Add new mergeDescriptions(projectId, descriptions) method that calls the new endpoint

 Step 9 — Frontend: Relax canMerge (src/components/pipeline/Stage5Assets.tsx:629-637)

 const canMerge = selectedAssets.length >= 2; // remove type check

 const mergeDisabledReason = selectedAssets.length < 2
   ? 'Select at least 2 assets to merge'
   : '';

 Step 10 — Frontend: Update handleMergeConfirm (src/components/pipeline/Stage5Assets.tsx:649-665)

 Update signature to accept updatedDescription:
 const handleMergeConfirm = async (survivorId: string, updatedName?: string, updatedDescription?: string) => {
   // ... pass updatedDescription in the request
 };

 Step 11 — Frontend: Enhanced MergeDialog (src/components/pipeline/MergeDialog.tsx)

 Props change:
 interface MergeDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   assets: ProjectAsset[];
   projectId: string; // NEW — needed for AI merge endpoint
   onConfirm: (survivorId: string, updatedName?: string, updatedDescription?: string) => Promise<void>; // NEW param
 }

 New state: updatedDescription (string, initialized from survivor's description when survivor changes), isMergingDescriptions (boolean for AI loading).

 New UI elements (insert between "Rename Survivor" and "Summary"):

 1. Cross-type warning (amber Alert, only when hasMixedTypes):
 "These assets have different types. The survivor will keep its type ({type}). Absorbed assets and their scene associations will be transferred."
 2. Type badges — add a Badge after each asset name in the RadioGroup showing asset type.
 3. Description section — two-column layout:
   - Left column: "Absorbed Descriptions" header, read-only display of each absorbed asset's name + description (scrollable, max-h-40)
   - Right column: "Survivor Description" header with an "AI Merge" button (Sparkles icon). Editable Textarea pre-filled with survivor's description. User can manually edit, paste from left side, or click AI Merge to blend.
   - AI Merge button calls projectAssetService.mergeDescriptions(projectId, [survivor.description, ...absorbed.map(a => a.description)]), fills textarea with result
   - If user hasn't touched the textarea (still matches survivor's original), updatedDescription is sent as undefined (no change)
 4. Update handleConfirm to pass updatedDescription.

 Step 12 — Update MergeDialog invocation in Stage5Assets

 Pass projectId prop to MergeDialog (line ~1451-1458).

 ---
 Testing (Phase A)

 Backend tests (backend/src/tests/assetTypeAndMerge.test.ts)

 - PUT: type change succeeds when unlocked
 - PUT: type change blocked when locked (400)
 - PUT: invalid type rejected (400)
 - POST merge: cross-type merge succeeds (no 400 for different types)
 - POST merge: assignment migration — no-conflict re-point
 - POST merge: assignment migration — absorbed-wins (enters > throughout)
 - POST merge: assignment migration — survivor-wins (exits > throughout for survivor)
 - POST merge: assignment migration — tie (both throughout, survivor kept)
 - POST merge: updatedDescription applied when provided
 - POST merge: assignmentsMigrated count correct in response
 - POST merge-descriptions: returns merged text

 Frontend tests

 - Change Type submenu renders 4 options, current type disabled, hidden when locked
 - MergeDialog: amber warning shown/hidden based on type mix
 - MergeDialog: type badges visible
 - MergeDialog: description section renders, AI merge button present
 - canMerge allows mixed-type selection

 ------
 === HARD STOP — Phase A complete before proceeding ===

 ------
 PHASE B: Convert to Transformation (Stage 8)

 Context

 When Stage 5 extracts what appears to be a separate asset but is actually a transformation of another (e.g., "John disguised" is really "John" after costume change), users need a way to convert that duplicate into a transformation event on the base asset, rather than merging or deleting it.

 Feature 3: Convert to Transformation

 Step 1 — Backend: Extend generateTransformationPrefill (backend/src/services/transformationEventService.ts:380-462)

 - Add optional absorbedInstanceId?: string parameter
 - When provided:
   - Fetch absorbed instance's effective_description and image_key_url
   - Append absorbed context to LLM prompt
   - Query shots ordered by shot_order, find absorbed asset's shot_asset_assignments to infer trigger_shot_id (first assigned shot) and transformation_type (single shot = instant, multi = gradual with last as completion_shot_id)
 - Extend return type with optional trigger_shot_id, transformation_type, completion_shot_id
 - When absorbedInstanceId NOT provided: behavior unchanged (backward compatible)

 Step 2 — Backend: Accept absorbed_instance_id in route (backend/src/routes/sceneAssets.ts:1748-1772)

 - Add absorbed_instance_id to destructured body
 - Pass through as 5th argument to service method

 Step 3 — Frontend: Extend prefill service (src/lib/services/transformationEventService.ts:132-148)

 - Add absorbed_instance_id?: string to data parameter type
 - Extend return type with optional trigger_shot_id, transformation_type, completion_shot_id

 Step 4 — Frontend: Extend AddTransformationDialog (src/components/pipeline/Stage8/AddTransformationDialog.tsx)

 - Add optional props: initialTriggerShotId, initialTransformationType, initialCompletionShotId, initialPostDescription, initialNarrative
 - Add controlled open support: externalOpen?: boolean, onExternalOpenChange?: (open: boolean) => void
 - When controlled externally, skip rendering DialogTrigger
 - On open with initial values: populate state, set userEdited refs to prevent auto-prefill overwrite
 - When no initial/external props: behavior identical to current

 Step 5 — Frontend: New ConvertToTransformationDialog (src/components/pipeline/Stage8/ConvertToTransformationDialog.tsx)

 ~200 lines, new file.

 Props: open, onOpenChange, absorbedAsset (SceneAssetInstance), sceneAssets, projectId, sceneId, shots, sceneScriptExcerpt?, onComplete

 Step 1 — Pick Base Asset: RadioGroup listing all other scene assets (name + thumbnail + type badge). "Next" button.

 Step 2 — Prefilled Dialog: Call transformationEventService.generatePrefill() with absorbed_instance_id. Show loading spinner. Open AddTransformationDialog with returned values as initial props. onAdd callback wraps: create event, set post_image from absorbed, remove absorbed scene instance, prompt defer.  

 Post-confirm cleanup:
 1. If absorbed has image: update transformation event's post_image_key_url
 2. Remove absorbed scene_asset_instance from current scene (existing delete endpoint)
 3. Toast prompt: "Also defer [name] from the project?" — if yes, call updateAsset with { deferred: true }

 Step 6 — Frontend: Context menu trigger (src/components/pipeline/Stage8/SceneAssetListPanel.tsx:126-234)

 - Add DropdownMenu with MoreVertical trigger on each asset card (top-left, visible on hover)
 - Menu item: "Convert to Transformation..." with RefreshCw icon
 - Add onConvertToTransformation?: (instance: SceneAssetInstance) => void to component props
 - Parent Stage8VisualDefinition.tsx manages convertingAsset state and renders the dialog

 Testing (Phase B)

 Backend tests

 - Prefill without absorbed_id returns current format
 - Prefill with absorbed_id returns enriched response (trigger_shot_id, etc.)

 Frontend tests

 - AddTransformationDialog with/without initial values
 - ConvertToTransformationDialog: asset list renders, step flow works

 ---
 Files Modified (Complete List)

 Phase A

 ┌──────────────────────────────────────────┬──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
 │                   File                   │                                                                  Change                                                                  │
 ├──────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ src/types/asset.ts                       │ Add updatedDescription to MergeAssetsRequest, assignmentsMigrated to MergeAssetsResponse                                                 │
 ├──────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ src/lib/services/projectAssetService.ts  │ Add asset_type to UpdateProjectAssetRequest, add mergeDescriptions() method                                                              │
 ├──────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ backend/src/routes/projectAssets.ts      │ PUT: accept asset_type; Merge: remove type check, add assignment migration, accept updatedDescription; New merge-descriptions route      │
 ├──────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ src/components/pipeline/Stage5Assets.tsx │ handleChangeType, DropdownMenuSub imports, Change Type submenu, relax canMerge, update handleMergeConfirm, pass projectId to MergeDialog │
 ├──────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ src/components/pipeline/MergeDialog.tsx  │ Cross-type warning, type badges, description merge UX with AI button                                                                     │
 └──────────────────────────────────────────┴──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

 Phase B

 ┌──────────────────────────────────────────────────────────────────┬────────────────────────────────────────┐
 │                               File                               │                 Change                 │
 ├──────────────────────────────────────────────────────────────────┼────────────────────────────────────────┤
 │ backend/src/services/transformationEventService.ts               │ Extend generateTransformationPrefill   │
 ├──────────────────────────────────────────────────────────────────┼────────────────────────────────────────┤
 │ backend/src/routes/sceneAssets.ts                                │ Accept absorbed_instance_id            │
 ├──────────────────────────────────────────────────────────────────┼────────────────────────────────────────┤
 │ src/lib/services/transformationEventService.ts                   │ Extend prefill method                  │
 ├──────────────────────────────────────────────────────────────────┼────────────────────────────────────────┤
 │ src/components/pipeline/Stage8/AddTransformationDialog.tsx       │ Initial values + controlled open       │
 ├──────────────────────────────────────────────────────────────────┼────────────────────────────────────────┤
 │ src/components/pipeline/Stage8/ConvertToTransformationDialog.tsx │ NEW FILE                               │
 ├──────────────────────────────────────────────────────────────────┼────────────────────────────────────────┤
 │ src/components/pipeline/Stage8/SceneAssetListPanel.tsx           │ Context menu with convert option       │
 ├──────────────────────────────────────────────────────────────────┼────────────────────────────────────────┤
 │ src/components/pipeline/Stage8VisualDefinition.tsx               │ State + dialog render for convert flow │
 └──────────────────────────────────────────────────────────────────┴────────────────────────────────────────┘

 Verification

 After each phase:
 1. npm run lint from project root
 2. npm test from project root (frontend tests)
 3. cd backend && npm test (backend tests)
 4. Manual: Open Stage 5, right-click asset → Change Type → verify type changes
 5. Manual: Select 2 different-type assets → Merge → verify cross-type warning, description UX, AI merge button
 6. Manual: Verify merged asset has union of scene numbers from both original assets