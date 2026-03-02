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
