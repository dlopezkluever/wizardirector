[Testing Strategy](#1-testing-strategy)

---

## 1. Testing Strategy

### 1A. Backend Unit Tests

**File**: `backend/src/tests/shotAssetAssignment.test.ts`

- CRUD operations on `shot_asset_assignments`
- Auto-population logic: creates correct number of assignments, doesn't duplicate on repeat calls
- Presence-type validation (rejects invalid values)
- Cascade delete: deleting a `scene_asset_instance` removes its assignments
- Cascade delete: deleting a `shot` removes its assignments

### 1B. Prompt Generation Tests

**File**: `backend/src/tests/promptGeneration.test.ts` (extend existing or new)

- `buildFrameReferenceManifests()` with mixed presence types:
  - `throughout` asset appears in both start and end manifests
  - `enters` asset appears in end manifest only
  - `exits` asset appears in start manifest only
  - `passes_through` asset appears in neither manifest, returned in `videoOnlyAssets`
- Video prompt includes entry/exit language for `enters`/`exits` assets
- Video prompt includes visual description for `passes_through` assets

### 1C. Frontend Service Tests

**File**: `src/lib/services/__tests__/shotAssetAssignmentService.test.ts`

- Service methods call correct API endpoints with correct payloads
- Error handling for failed requests

### 1D. Manual Testing Checklist

1. Open existing project → Stage 8 → verify auto-population toast appears
2. Add new asset via Asset Drawer → shot checklist appears → select subset of shots → verify assignments created
3. Navigate to Stage 9 → expand shot → see asset panel → change presence_type → verify Stage 9 marked as outdated
4. Regenerate prompts → verify start frame refs exclude `enters` assets → verify end frame refs exclude `exits` assets
5. Generate frames → verify start frame doesn't show `enters`-only asset → verify end frame doesn't show `exits`-only asset
6. Delete an asset from a shot in Stage 9 → verify it no longer appears in that shot's prompts after regeneration

---