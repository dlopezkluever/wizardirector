# Feature: Stage 5 Asset Merge & Split

### B.1 — Overview & Motivation

During Stage 5 (Asset Extraction), the AI extracts characters, locations, and props from the script. Two common problems arise:

1. **Duplicate detection failure** — The same entity appears under different names across scenes (e.g., `"Dr. James Jones"` in Scene 1, `"James"` in Scenes 2-3, `"Dr. Jones"` in Scene 4). The extraction creates 3 separate master assets, but they're all the same character.

2. **Significant character transformation** — A character changes dramatically mid-story (e.g., James dons a grand disguise in Scenes 4-5). The user wants two separate assets: `"James"` (Scenes 1, 2, 3, 6, 7) and `"James - Disguise"` (Scenes 4, 5), each with their own description and visual reference.

**Merge** solves problem #1. **Split** solves problem #2.

---

### B.2 — Merge Feature

#### User Flow
1. User is in Stage 5 Asset Library view
2. User selects 2 or more assets (checkboxes or multi-select)
3. A **"Merge"** button appears in the toolbar/action bar (only visible when 2+ assets selected)
4. User clicks "Merge" → **Merge Dialog** opens:
   - Shows the selected assets with their names, types, scene numbers, and thumbnails (if available)
   - User picks which asset is the **"survivor"** (primary) — radio button selection. The survivor's name, description, and image become the canonical version.
   - The other asset(s) are labeled as **"absorbed"**
   - A summary shows: *"3 scene instances will be re-pointed to [Survivor Name]"*
   - Optional: User can edit the survivor's name before confirming (e.g., standardize to `"Dr. James Jones"`)
   - **"Confirm Merge"** button

#### Merge Rules
- All selected assets must be of the **same `asset_type`** (cannot merge a character with a location). If mixed types are selected, the Merge button is disabled with a tooltip explaining why.
- The survivor asset retains its `id`, `description`, `image_key_url`, `image_prompt`, and all generation attempts.
- The absorbed assets' `scene_numbers` arrays are unioned into the survivor's `scene_numbers`.

#### Backend Behavior

**New Endpoint:**
```
POST /api/projects/:projectId/assets/merge
Body: {
  survivorAssetId: string,
  absorbedAssetIds: string[],
  updatedName?: string  // optional name override for survivor
}
```

**Backend Logic (transactional):**
1. Validate all assets exist, belong to this project, and share the same `asset_type`
2. **Re-point scene instances**: `UPDATE scene_asset_instances SET project_asset_id = :survivorId WHERE project_asset_id IN (:absorbedIds)`
3. **Merge scene_numbers**: Union all `scene_numbers` arrays from absorbed assets into the survivor's `scene_numbers`
4. **Delete absorbed master assets**: `DELETE FROM project_assets WHERE id IN (:absorbedIds)`
5. **Delete absorbed generation attempts**: `DELETE FROM project_asset_generation_attempts WHERE project_asset_id IN (:absorbedIds)` (cascade should handle this if FK is set up, but verify)
6. **Update survivor name** (if `updatedName` provided): `UPDATE project_assets SET name = :updatedName WHERE id = :survivorId`
7. Return the updated survivor asset + count of re-pointed instances

**Response:**
```json
{
  "success": true,
  "survivor": { /* updated ProjectAsset */ },
  "instancesRepointed": 5,
  "assetsAbsorbed": 2
}
```

#### Data Model Changes
- No new columns needed. Merge operates on existing `project_assets` and `scene_asset_instances` tables.
- Consider adding an audit log entry (optional): `{ action: 'merge', survivorId, absorbedIds, timestamp }` — could be stored in a `project_asset_audit_log` table or simply logged server-side.

---

### B.3 — Split Feature

#### User Flow
1. User is in Stage 5 Asset Library view
2. User selects exactly **1 asset**
3. A **"Split Variant"** button appears in the toolbar (only visible when exactly 1 asset selected, and that asset has `scene_numbers.length > 1`)
4. User clicks "Split Variant" → **Split Wizard** opens:

**Step 1 — Name the Variant:**
- Shows the original asset's name, description, and thumbnail
- Text input: *"Variant name"* — pre-filled with `"[Original Name] - Variant"` (user edits, e.g., `"James - Disguise"`)
- Optional: textarea to provide a variant description (pre-filled with original description, user modifies)

**Step 2 — Assign Scenes:**
- Shows all scenes where this asset appears (from `scene_numbers[]`)
- Each scene is a selectable chip/checkbox: `Scene 1`, `Scene 2`, `Scene 3`, etc.
- User checks off which scenes should use the **new variant**. Unchecked scenes remain with the original asset.
- Validation: At least 1 scene must remain with the original AND at least 1 scene must be assigned to the variant. Cannot leave either side empty.
- Visual: Two columns — **"Original (James)"** on the left showing remaining scenes, **"Variant (James - Disguise)"** on the right showing selected scenes. Scenes move between columns as checkboxes toggle.

**Step 3 — Confirm:**
- Summary: *"Original 'James' will keep Scenes 1, 2, 3, 6, 7. New variant 'James - Disguise' will be created for Scenes 4, 5."*
- *"X scene instances will be re-pointed to the new variant."*
- **"Confirm Split"** button

#### Backend Behavior

**New Endpoint:**
```
POST /api/projects/:projectId/assets/:assetId/split
Body: {
  variantName: string,
  variantDescription?: string,
  scenesForVariant: number[]  // scene numbers to assign to the new variant
}
```

**Backend Logic (transactional):**
1. Validate the asset exists and `scenesForVariant` is a subset of the asset's `scene_numbers`
2. Validate at least 1 scene remains with the original
3. **Create new master asset**: Insert into `project_assets` with:
   - `name`: variantName
   - `asset_type`: same as original
   - `description`: variantDescription ?? original's description
   - `image_prompt`: copied from original (user can regenerate later)
   - `image_key_url`: null (variant starts without its own image — forces user to generate one)
   - `scene_numbers`: scenesForVariant
   - `source`: `'manual'`
   - `locked`: false
4. **Update original's scene_numbers**: Remove the split-off scenes from the original's `scene_numbers` array
5. **Re-point scene instances**: For each scene in `scenesForVariant`:
   ```sql
   UPDATE scene_asset_instances
   SET project_asset_id = :newVariantId
   WHERE project_asset_id = :originalId
     AND scene_id IN (SELECT id FROM scenes WHERE scene_number = ANY(:scenesForVariant) AND project_id = :projectId)
   ```
6. Re-pointed instances keep their existing `description_override`, `image_key_url`, `status_tags`, etc. — only the `project_asset_id` changes.
7. Return both the updated original and the new variant asset + count of re-pointed instances

**Response:**
```json
{
  "success": true,
  "original": { /* updated ProjectAsset with reduced scene_numbers */ },
  "variant": { /* new ProjectAsset */ },
  "instancesRepointed": 3
}
```

#### Data Model Changes
- No new tables needed.
- The `project_assets.scene_numbers` field is already an array — split just partitions it.
- Consider adding `split_from_asset_id` column to `project_assets` (optional, for traceability): `ALTER TABLE project_assets ADD COLUMN split_from_asset_id UUID REFERENCES project_assets(id) ON DELETE SET NULL;`

---

### B.4 — UI Location & Integration

Both Merge and Split live in the **Stage 5 Asset Library** view.

#### Where the buttons appear
- The asset library already supports selection (or should). Add a **selection mode** if not present:
  - Each asset card gets a checkbox in multi-select mode
  - A floating action bar appears at the bottom (or top) of the asset list when 1+ assets are selected
  - Action bar shows: `[X selected]  [Merge] [Split Variant] [Delete]`
  - **Merge** enabled when 2+ assets of the same type selected
  - **Split Variant** enabled when exactly 1 asset selected with 2+ scene_numbers
  - **Delete** existing behavior

#### Component Architecture
```
Stage 5 Asset Library
├── AssetSelectionToolbar (floating action bar)
│   ├── MergeButton (disabled unless 2+ same-type selected)
│   └── SplitButton (disabled unless 1 selected with multi-scene)
├── MergeDialog (modal)
│   ├── AssetPreviewCard (for each selected asset)
│   ├── SurvivorSelector (radio buttons)
│   └── ConfirmMergeButton
└── SplitWizard (modal, multi-step)
    ├── Step1: VariantNameInput + DescriptionInput
    ├── Step2: SceneAssignment (two-column with checkboxes)
    └── Step3: ConfirmSummary
```

---

### B.5 — Merge/Split Edge Cases

| Scenario | Behavior |
|----------|----------|
| Merge assets with conflicting `scene_numbers` (both appear in Scene 3) | Allowed — after merge, survivor has Scene 3 once. If duplicate scene instances exist (both absorbed and survivor have instance for Scene 3), keep the survivor's instance, delete the absorbed one. |
| Split an asset that has no scene instances yet | Allowed — creates the new asset with the scene_numbers, no instances to re-point. |
| Asset is `locked: true` | Disable merge/split for locked assets. Show tooltip: *"Unlock this asset before merging/splitting."* |
| Absorbed asset has generation attempts (images) | Images are deleted with the absorbed asset. The survivor retains its own images. User should be warned in the confirmation dialog. |
| Split variant inherits the original's image | No — variant starts with `image_key_url: null`. Forces user to generate a distinct visual for the variant. Dialog should mention this. |
| User tries to merge assets from different asset types | Merge button disabled. Tooltip: *"All selected assets must be the same type to merge."* |

---

## Files At Play

### Feature B: Asset Merge/Split

#### Frontend Components (New/Modified)
- `src/components/pipeline/Stage5AssetExtraction.tsx` (or equivalent Stage 5 asset library component) — Add selection mode, action toolbar
- New: `MergeDialog.tsx` (or inline in Stage 5 component)
- New: `SplitWizard.tsx` (or inline in Stage 5 component)

#### Frontend Services (Extended)
- `src/lib/services/projectAssetService.ts` — Add `mergeAssets()` and `splitAsset()` methods

#### Backend Routes (New)
- `backend/src/routes/projectAssets.ts` (or `projects.ts`) — Add:
  - `POST /api/projects/:projectId/assets/merge`
  - `POST /api/projects/:projectId/assets/:assetId/split`

#### Backend Services (New/Extended)
- May need a new `assetMergeService.ts` or add methods to existing asset service

#### Types (Extended)
- `src/types/asset.ts` — Add request/response interfaces for merge and split operations

---

## Verification

### Feature B
1. `npm run lint` + `npm run build:dev`
2. Backend tests for merge/split endpoints (new test file)
3. Manual test:
   - Select 2 same-type assets → Merge button active → merge → verify instances re-pointed
   - Select 1 asset with multiple scenes → Split → assign scenes → verify new asset created and instances re-pointed
   - Verify locked assets cannot be merged/split
   - Verify mixed-type selection disables Merge
