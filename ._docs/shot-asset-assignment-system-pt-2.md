# Shot Asset Assignment System — Part 2: Testing & Enhancements

> **Prerequisite**: This document extends the core Shot Asset Assignment System defined in `shot-asset-assignment-system.md`. It covers testing strategy and secondary enhancements that should be implemented **after** the core system (data model, routes, prompt/frame generation rework, Stage 8/9 UI) is stable.

---

## Context: Core System Summary

The core system (Part 1) introduces:

- **`shot_asset_assignments` table** — junction between `shots` and `scene_asset_instances` with a `presence_type` column (`throughout` | `enters` | `exits` | `passes_through`)
- **Backend service + routes** at `/api/projects/:projectId/scenes/:sceneId/shot-assignments` for CRUD
- **Prompt generation rework** — `buildFrameReferenceManifests()` builds separate start/end frame reference image lists based on presence_type
- **Stage 8 Asset Drawer** — shot checklist step when adding an asset to a scene
- **Stage 9 Per-Shot Asset Panel** — expandable asset section per shot with presence_type dropdowns
- **Auto-population** — existing scenes get `throughout` assignments for all asset×shot pairs on first open
- **Invalidation** — assignment changes mark Stage 9+ as `outdated`

---

## Table of Contents

1. [Testing Strategy](#1-testing-strategy)
2. [Character-to-Reference Image Mapping Accuracy](#2-character-to-reference-image-mapping-accuracy)
3. [Shot Splitting for `passes_through`](#3-shot-splitting-for-passes_through)
4. [AI-Suggested Shot Assignments](#4-ai-suggested-shot-assignments)
5. [Presence-Type Aware Continuity](#5-presence-type-aware-continuity)
6. [Bulk Presence-Type Templates](#6-bulk-presence-type-templates)
7. [Visual Timeline View](#7-visual-timeline-view)
8. [Implementation Order](#8-implementation-order)

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

## 2. Character-to-Reference Image Mapping Accuracy

**Problem**: The image generator receives reference images as generic "identity" references with only a label like `"Image #1: Alice (character)"`. For scenes with multiple similar-looking characters, the model may confuse which reference maps to which person.

**Proposed Fix**: Enhance the image manifest in `promptGenerationService.ts` → `buildNumberedImageManifest()` (or its replacement `buildFrameReferenceManifests()`) to include physical trait anchoring from `effective_description`:

```
REFERENCE IMAGES (attached alongside this prompt):
Image #1: Alice (character) — red-haired woman in blue dress, mid-20s
Image #2: Bob (character) — tall man with dark beard, grey suit
Image #3: Living Room (location) — warm-lit room with leather couch
```

Then in the frame prompt LLM system prompt, instruct the LLM to reinforce character↔image mapping with trait descriptions. Example output: *"Alice (the red-haired woman from Image #1) stands near the window while Bob (the bearded man from Image #2) sits on the couch."*

This gives the image model **three anchors** per character: name, image number, and physical traits.

**Files to modify**:
- `backend/src/services/promptGenerationService.ts` — manifest builder + frame prompt system prompt
- The `effective_description` field on `scene_asset_instances` already contains the trait data; just needs to be injected into the manifest string

**Why deferred**: Current implicit mapping works adequately for most scenes (1-2 distinct characters). This becomes important for scenes with 3+ characters or visually similar characters.

---

## 3. Shot Splitting for `passes_through`

**Problem**: When a user selects `passes_through`, the asset has no reference image in either frame, making visual accuracy unreliable. The user sees a warning but has no easy way to fix it.

**Proposed Fix**: Offer a "Split Shot" button alongside the `passes_through` warning. This divides the shot into 2-3 sub-shots so the asset can be `enters` in one and `exits` in the next, guaranteeing reference image usage.

**Example**: Shot 1A (8s) with a waiter passing through becomes:
- Shot 1A (3s) — waiter not present (`throughout` assets only)
- Shot 1B (2s) — waiter `enters` and `exits` (or `throughout` for this sub-shot)
- Shot 1C (3s) — waiter not present

**Complexity**: Shot splitting touches:
- Stage 7 data (shot definitions, `shot_id` naming, `shot_order` renumbering)
- Stage 9 (prompts for all sub-shots need generation)
- `shot_asset_assignments` for all sub-shots
- Continuity linking between the new sub-shots (they should be `match` continuity by default)
- Existing frames/videos for the original shot become invalid

**Why deferred**: The `passes_through` + warning approach is functional. Shot splitting is a power-user feature that requires significant Stage 7 integration work.

---

## 4. AI-Suggested Shot Assignments

**Problem**: When a new asset is added, users must manually check which shots it belongs to. For large scenes with many shots, this is tedious.

**Proposed Fix**: Use the LLM to analyze shot action/dialogue/setting text and suggest which shots an asset is likely to appear in. Pre-check the suggested shots in the Asset Drawer checklist.

**Implementation sketch**:
1. When the shot checklist appears in the Asset Drawer, send a lightweight LLM request:
   - Input: asset name + type + description, plus array of shot summaries (action, dialogue, setting, characters_foreground/background)
   - Output: array of `{ shotId: string, confidence: number, reason: string }`
2. Pre-check shots above a confidence threshold (e.g., 0.7)
3. Show confidence indicators next to each shot in the checklist (e.g., "AI: likely" / "AI: unlikely")
4. User can override any suggestion

**Backend endpoint**: `POST /api/projects/:projectId/scenes/:sceneId/suggest-asset-shots`

**Why deferred**: Manual selection works fine for scenes with 3-8 shots (typical). AI suggestions become valuable for scenes with 10+ shots. Also, the existing `characters_foreground` / `characters_background` arrays on shots already provide a strong heuristic — a simple string-match pre-check (no LLM needed) could cover 80% of cases as an intermediate step.

---

## 5. Presence-Type Aware Continuity

**Problem**: The continuity system (`start_continuity: 'match' | 'camera_change'`) copies/references the previous shot's end frame. If an asset `enters` in the current shot, it shouldn't appear in the continuity-matched start frame — but the previous shot's end frame may already include that asset.

**Scenario**:
- Shot N: Alice is `throughout` → end frame shows Alice
- Shot N+1: Alice is `enters` → start frame should NOT show Alice
- But `start_continuity: 'match'` copies Shot N's end frame (which has Alice) as Shot N+1's start frame

This creates a visual inconsistency: Alice appears in the start of N+1 despite being marked as `enters`.

**Analysis**: This is actually a **valid creative choice** in many cases — if Alice is visible at the end of the previous shot and "enters" in the next, the continuity match is correct (the camera cut shows her). The `enters` presence_type really means "this asset becomes relevant during this shot" rather than "this asset is physically absent at frame 1."

**Possible approaches**:
1. **Do nothing** — accept that continuity matching is based on the previous shot's reality, not the current shot's presence_type. Document this behavior.
2. **Add a `continuity_exclude` flag** — let users mark specific assets to be excluded from continuity matching for a shot. Complex UI addition.
3. **Redefine `enters`** — clarify that `enters` means "asset is not in this shot's independently-generated start frame references" but doesn't prevent it from appearing via continuity. The continuity system operates at the image level, not the asset level.

**Recommendation**: Approach 3 (redefine/document) for now, with approach 2 as a future option if users report confusion.

**Why deferred**: Edge case that only manifests with specific shot sequences. The continuity system needs careful thought about how presence_type interacts with temporal continuity across shots. Getting the core assignment system right first will surface real user feedback about whether this is actually a problem.

---

## 6. Bulk Presence-Type Templates

**Problem**: For common patterns (e.g., "main characters throughout, extras pass through"), users must configure each asset individually per shot.

**Proposed Fix**: Preset templates applied at the scene level:

| Template | Behavior |
|----------|----------|
| "All throughout" | Default — every asset `throughout` in every shot |
| "Match shot characters" | Auto-set presence based on `characters_foreground`/`characters_background` arrays on each shot. Assets matching foreground → `throughout`, matching background → `throughout`, not mentioned → not assigned |
| "Locations throughout, characters custom" | Location assets auto-assigned `throughout` to all shots; character/prop assets left unassigned for manual config |

**UI**: A dropdown or button group at the top of the Stage 9 asset panel: "Apply template: [All Throughout ▼]"

**Implementation**:
- Templates are pure frontend logic — they call the existing bulk create/update assignment endpoints
- The "Match shot characters" template uses the `characters_foreground`/`characters_background` arrays already stored on each shot from Stage 7 extraction
- Templates overwrite existing assignments (with confirmation)

**Why deferred**: Manual per-asset config covers all cases. Templates are a time-saver for repeat workflows.

---

## 7. Visual Timeline View

**Problem**: For complex scenes with many shots and assets, understanding the full asset presence map from individual shot panels is difficult. Users need a birds-eye view.

**Proposed Fix**: A timeline/matrix view showing shots as columns, assets as rows, with color-coded presence_type cells.

**Mockup**:
```
              Shot 1A    Shot 1B    Shot 2A    Shot 2B    Shot 3A
Alice         ████████   ████████   ▶▶▶▶▶▶▶▶   ████████   ◀◀◀◀◀◀◀◀
Bob           ████████   ████████   ████████   ████████   ████████
Living Room   ████████   ████████   ────────   ────────   ────────
Garden        ────────   ────────   ████████   ████████   ████████
Waiter        ────────   ────────   ░░░░░░░░   ────────   ────────

Legend: ████ Throughout  ▶▶▶▶ Enters  ◀◀◀◀ Exits  ░░░░ Passes Through  ──── Not Assigned
```

**Implementation**:
- New component: `src/components/pipeline/Stage9/ShotAssetTimeline.tsx`
- Toggle between "Panel View" (per-shot expandable) and "Timeline View" (matrix)
- Cells are clickable to change presence_type or toggle assignment
- Color coding matches presence_type semantics
- Responsive: horizontally scrollable for many shots

**Why deferred**: The expandable panel per shot is functional for typical scene sizes (3-8 shots, 2-6 assets). The timeline view is a significant UI undertaking and is a luxury, not a necessity. Build it when user feedback indicates the panel view is insufficient.

---

## 8. Implementation Order

These items should be implemented after the core system (Part 1) is stable and tested. The recommended sequence:

| Phase | Section | What | Priority |
|-------|---------|------|----------|
| **1** | §1 | Testing — unit tests + manual testing | High — validates Part 1 |
| **2** | §2 | Character-to-reference mapping accuracy | Medium — improves image gen quality |
| **3** | §4 | AI-suggested shot assignments (or simple heuristic version) | Medium — UX improvement |
| **4** | §5 | Presence-type aware continuity (documentation + edge case handling) | Low — edge case |
| **5** | §6 | Bulk presence-type templates | Low — convenience feature |
| **6** | §3 | Shot splitting for `passes_through` | Low — power-user feature |
| **7** | §7 | Visual timeline view | Low — luxury UI |
