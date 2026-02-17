 Files Modified

  File: src/types/asset.ts
  Change: Added MergeAssetsRequest, MergeAssetsResponse, SplitAssetRequest, SplitAssetResponse interfaces
  ────────────────────────────────────────
  File: backend/src/routes/projectAssets.ts
  Change: Rewrote merge endpoint (multi-asset, scene_numbers union, scene_asset_instances re-pointing, duplicate handling);  
    added new split endpoint
  ────────────────────────────────────────
  File: src/lib/services/projectAssetService.ts
  Change: Updated mergeAssets() to use new request/response types; added splitAsset() method

  Files Created

  File: src/components/pipeline/MergeDialog.tsx
  Description: Modal with radio-button survivor selection, optional name edit, scene badges, image loss warning
  ────────────────────────────────────────
  File: src/components/pipeline/SplitWizard.tsx
  Description: 3-step wizard: variant name/description, interactive scene assignment (click-to-move badges + checkboxes),    
    summary confirmation

  Stage5Assets.tsx Changes

  - Selection mode toggle button in batch actions bar
  - Checkbox overlay on each asset card when in selection mode (locked assets have disabled checkbox)
  - Ring highlight on selected cards
  - Floating selection toolbar (positioned above the gatekeeper bar) with:
    - Merge button (enabled when 2+ same-type selected, with tooltip explaining why disabled)
    - Split Variant button (enabled when exactly 1 asset with 2+ scenes, with tooltip)
    - Clear button to exit selection

  Prerequisites

  1. Open a project that has completed Stage 4 (script) and has Stage 5 active
  2. Make sure you have 3+ extracted assets of the same type (e.g., characters) with at least one having 2+ scene_numbers    

  If you don't have enough assets, use Add Asset to quickly create 2-3 manual characters with different scene numbers.       

  ---
  Test 1: Selection Mode (~30s)

  1. Go to Stage 5, scroll to "Review & Generate Visual Keys"
  2. Click the Select button in the batch actions bar
  3. Verify: checkboxes appear on all asset cards
  4. Click a locked asset's checkbox (if any) — should be disabled
  5. Click Exit Select — checkboxes disappear, selection clears

  Test 2: Merge (~1min)

  1. Enter selection mode, select 2 characters (same type)
  2. Verify: floating toolbar appears at bottom with Merge enabled
  3. Try selecting a location too — Merge button should disable with tooltip "Selected assets must be the same type"
  4. Deselect the location, click Merge
  5. In dialog: pick a survivor, optionally rename, click Confirm Merge
  6. Verify: absorbed asset disappears, survivor remains with unioned scene numbers

  Test 3: Split (~1min)

  1. Enter selection mode, select 1 asset that has 2+ scenes
  2. Verify: Split Variant button is enabled
  3. Click it — wizard opens
  4. Step 1: Leave default variant name, click Next
  5. Step 2: Click scene badges to move at least 1 scene to variant column (keep at least 1 on original). Click Next
  6. Step 3: Review summary, click Confirm Split
  7. Verify: original asset loses the split scenes, new variant asset appears with those scenes and no image

  Test 4: Edge Cases (~30s)

  - Select 1 asset with only 1 scene — Split button should be disabled with tooltip
  - Select only 1 asset — Merge button disabled
  - On a locked stage — Select button shouldn't appear at all

  ---
  Fastest path: If time is very tight, just do Test 2 (merge) and Test 3 (split) — those cover the core backend + frontend   
  integration.