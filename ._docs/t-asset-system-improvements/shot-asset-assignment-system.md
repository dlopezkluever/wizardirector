# Shot Asset Assignment System — Implementation Plan

> **Goal**: Give users explicit control over which assets appear in which shots and *how* they appear (full duration, entering, exiting, passing through). Replace the current "all assets → all shots" implicit behavior with a deterministic, per-shot assignment model.

---

## Table of Contents

1. [Data Model](#1-data-model)
2. [SQL Migration](#2-sql-migration)
3. [Backend: New Routes & Service](#3-backend-new-routes--service)
4. [Backend: Prompt Generation Rework](#4-backend-prompt-generation-rework)
5. [Backend: Frame Generation Rework](#5-backend-frame-generation-rework)
6. [Backend: Invalidation Integration](#6-backend-invalidation-integration)
7. [Frontend: Types & Service Layer](#7-frontend-types--service-layer)
8. [Frontend: Stage 8 — Asset Drawer Shot Preset](#8-frontend-stage-8--asset-drawer-shot-preset)
9. [Frontend: Stage 9 — Per-Shot Asset Panel](#9-frontend-stage-9--per-shot-asset-panel)
10. [Auto-Population & Backwards Compatibility](#10-auto-population--backwards-compatibility)
11. [Implementation Order](#11-implementation-order)

> **See also**: `shot-asset-assignment-system-pt-2.md` for testing strategy, character-to-reference mapping improvements, and other secondary enhancements.

---

## 1. Data Model

### New Table: `shot_asset_assignments`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `shot_id` | `uuid` | FK → `shots(id) ON DELETE CASCADE` | |
| `scene_asset_instance_id` | `uuid` | FK → `scene_asset_instances(id) ON DELETE CASCADE` | |
| `presence_type` | `text` | CHECK `('throughout','enters','exits','passes_through')` | Default: `'throughout'` |
| `created_at` | `timestamptz` | Default `NOW()` | |
| `updated_at` | `timestamptz` | Default `NOW()` | |

**Unique constraint**: `UNIQUE(shot_id, scene_asset_instance_id)` — one assignment per asset per shot.

### `presence_type` Semantics

| Value | Start Frame Refs | End Frame Refs | Video Prompt | Description |
|-------|-----------------|----------------|--------------|-------------|
| `throughout` | Yes | Yes | Standard mention | Asset present for entire shot duration |
| `enters` | No | Yes | Describes entry action | Asset not visible at start, appears during shot |
| `exits` | Yes | No | Describes exit action | Asset visible at start, leaves during shot |
| `passes_through` | No | No | Text-only description | Asset briefly visible mid-shot; no reference image in either frame |

### Relationship to Existing Tables

```
shots ──┐
        ├── shot_asset_assignments (NEW)
        │       ├── presence_type
        │       └── scene_asset_instance_id ──► scene_asset_instances
        │                                           └── project_asset_id ──► project_assets
        ├── reference_image_order (JSONB, existing — becomes cache)
        ├── frame_prompt (existing)
        └── video_prompt (existing)
```

`shots.reference_image_order` continues to exist and be written, but `shot_asset_assignments` becomes the **source of truth** for which assets belong to which shot. `reference_image_order` becomes a computed snapshot regenerated during Stage 9 prompt generation.

---

## 2. SQL Migration

**File**: `backend/migrations/0XX_shot_asset_assignments.sql` (next available number)

**What the migration does:**
- Creates the `shot_asset_assignments` table with columns, constraints, and indexes
- Adds indexes on `shot_id` and `scene_asset_instance_id` for fast lookups
- Adds RLS policies matching the existing pattern (user ownership via project → scene → shot chain)
- Adds an `updated_at` trigger (reuse existing `fn_update_timestamp()` if available)

**What the migration does NOT do:**
- Does NOT backfill existing data — auto-population happens at application runtime (see [Section 10](#10-auto-population--backwards-compatibility))
- Does NOT drop or modify `reference_image_order` — it stays as a cache column

> **Reminder**: Per CLAUDE.md, never run migrations automatically. Provide the SQL file and prompt the user to run it themselves.

---

## 3. Backend: New Routes & Service

### 3A. New Service: `shotAssetAssignmentService.ts`

**File**: `backend/src/services/shotAssetAssignmentService.ts`

**Responsibilities:**
- CRUD for shot_asset_assignments
- Auto-population logic (create default `throughout` assignments for all scene assets × all shots)
- Bulk update (change presence_type for multiple assignments at once)
- Query helpers (get assignments for a shot, get assignments for a scene)

**Key Methods:**

```typescript
class ShotAssetAssignmentService {
  /** Get all assignments for a single shot, joined with asset data */
  async getAssignmentsForShot(shotId: string): Promise<ShotAssetAssignment[]>

  /** Get all assignments for all shots in a scene */
  async getAssignmentsForScene(sceneId: string): Promise<ShotAssetAssignment[]>

  /** Create assignment (add asset to shot) */
  async createAssignment(shotId: string, instanceId: string, presenceType: PresenceType): Promise<ShotAssetAssignment>

  /** Bulk create assignments (when adding asset to multiple shots at once from Stage 8) */
  async bulkCreateAssignments(assignments: { shotId: string; instanceId: string; presenceType: PresenceType }[]): Promise<ShotAssetAssignment[]>

  /** Update presence_type for an existing assignment */
  async updateAssignment(assignmentId: string, presenceType: PresenceType): Promise<ShotAssetAssignment>

  /** Delete assignment (remove asset from shot) */
  async deleteAssignment(assignmentId: string): Promise<void>

  /** Auto-populate: Create 'throughout' assignments for all scene assets × all shots that don't have assignments yet */
  async autoPopulate(sceneId: string): Promise<{ created: number; existing: number }>

  /** Check if a scene has any assignments (to decide whether to auto-populate) */
  async hasAssignments(sceneId: string): Promise<boolean>
}
```

### 3B. New Routes

Mount under the existing scene assets router or as a sibling.

**Suggested route prefix**: `/api/projects/:projectId/scenes/:sceneId/shot-assignments`

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/` | List all assignments for the scene (grouped by shot) |
| GET | `/shots/:shotId` | List assignments for a specific shot |
| POST | `/` | Create one or more assignments (body: `{ assignments: [{ shotId, instanceId, presenceType }] }`) |
| PUT | `/:assignmentId` | Update presence_type |
| DELETE | `/:assignmentId` | Remove assignment |
| POST | `/auto-populate` | Trigger auto-population for the scene |

**Zod Schemas:**

```typescript
const PresenceTypeSchema = z.enum(['throughout', 'enters', 'exits', 'passes_through']);

const CreateAssignmentsSchema = z.object({
  assignments: z.array(z.object({
    shotId: z.string().uuid(),
    instanceId: z.string().uuid(),
    presenceType: PresenceTypeSchema.default('throughout'),
  })).min(1),
});

const UpdateAssignmentSchema = z.object({
  presenceType: PresenceTypeSchema,
});
```

---

## 4. Backend: Prompt Generation Rework

### Files Modified
- `backend/src/services/promptGenerationService.ts`
- `backend/src/routes/projects.ts` (the `generate-prompts` endpoint)

### 4A. Replace "all scene assets" with per-shot assignments

**Current behavior** (in `projects.ts` generate-prompts endpoint):
1. Fetches ALL `scene_asset_instances` for the scene
2. Passes the full array to `generateBulkPromptSets()`
3. Every shot gets the same set of assets

**New behavior:**
1. Fetch all `shot_asset_assignments` for the scene (joined with scene_asset_instances + project_assets + angle_variants)
2. Group assignments by `shot_id`
3. Pass per-shot asset lists to prompt generation
4. Each shot only gets its assigned assets

### 4B. `buildNumberedImageManifest()` → Split into Start/End Manifests

**Current**: Builds one manifest for all reference images.

**New**: Builds TWO manifests based on `presence_type`:

```typescript
function buildFrameReferenceManifests(
  assignments: ShotAssetAssignmentWithData[],
  shotCamera: string
): {
  startFrameManifest: string;
  startFrameImageOrder: ReferenceImageOrderEntry[];
  endFrameManifest: string;
  endFrameImageOrder: ReferenceImageOrderEntry[];
  videoOnlyAssets: ShotAssetAssignmentWithData[]; // passes_through assets
}
```

**Logic:**
- `throughout` → included in BOTH start and end manifests
- `enters` → included in end manifest ONLY
- `exits` → included in start manifest ONLY
- `passes_through` → included in NEITHER manifest; collected separately for video prompt injection

### 4C. Video Prompt Enhancements for Temporal Presence

The video prompt generation needs to incorporate presence_type context so the video model knows about entries/exits:

- `enters`: Inject into video prompt: `"[Asset Name] enters the frame [from direction/how]"`
- `exits`: Inject into video prompt: `"[Asset Name] exits the frame [direction/how]"`
- `passes_through`: Inject into video prompt: `"Midway through the shot, [Asset Name] ([brief visual description from effective_description]) [action — e.g., crosses behind the main characters]"`

For `passes_through`, since no reference image is available, the video prompt must include enough visual detail from `effective_description` for the video model to render the asset from text alone.

### 4D. Store Both Reference Orders

Update the shots table write to persist both manifests:

```typescript
await supabase.from('shots').update({
  frame_prompt: r.framePrompt,
  video_prompt: r.videoPrompt,
  reference_image_order: r.startFrameImageOrder,           // Start frame refs (existing column)
  end_frame_reference_image_order: r.endFrameImageOrder,   // End frame refs (existing column!)
  // ... other fields
}).eq('id', shotId);
```

**Note**: `end_frame_reference_image_order` already exists (added in migration 028). Currently only used for transformation event overrides — we now populate it properly from presence_type assignments.

### 4E. `generateBulkPromptSets()` Signature Change

```typescript
// BEFORE:
async generateBulkPromptSets(
  shots: ShotData[],
  sceneAssets: SceneAssetInstanceData[],    // ← Same assets for all shots
  styleCapsule?: StyleCapsule,
  transformationEvents?: TransformationEvent[]
): Promise<BulkPromptGenerationResult[]>

// AFTER:
async generateBulkPromptSets(
  shots: ShotData[],
  shotAssignmentMap: Map<string, ShotAssetAssignmentWithData[]>,  // ← Per-shot assets
  styleCapsule?: StyleCapsule,
  transformationEvents?: TransformationEvent[]
): Promise<BulkPromptGenerationResult[]>
```

Each call to `generatePromptSet()` for a specific shot now receives only that shot's assigned assets, filtered by presence_type.

### 4F. `BulkPromptGenerationResult` Update

Add `endFrameReferenceImageOrder` to the result:

```typescript
export interface BulkPromptGenerationResult {
  // ... existing fields ...
  referenceImageOrder?: ReferenceImageOrderEntry[];         // Start frame refs
  endFrameReferenceImageOrder?: ReferenceImageOrderEntry[]; // End frame refs (NEW)
}
```

---

## 5. Backend: Frame Generation Rework

### Files Modified
- `backend/src/services/frameGenerationService.ts`

### 5A. `fetchShotReferenceImages()` → Presence-Aware

**Current**: Reads `shots.reference_image_order` and returns all entries as `ReferenceImage[]`.

**New**: No change needed to this function IF we correctly populate `reference_image_order` (start frame) and `end_frame_reference_image_order` (end frame) during prompt generation (Section 4D). The existing function already reads from the correct column per frame type.

**However**, verify that end frame generation in `generateFrames()` uses `end_frame_reference_image_order` (not `reference_image_order`) when building end frame references. Check lines ~350-380 of `frameGenerationService.ts`. If it currently falls back to the start frame's references for end frames, update it to read `end_frame_reference_image_order` first.

### 5B. `resolveEndFrameReferenceImages()` — Layering

This function currently handles transformation event swaps for end frames. With the new system:

1. **Base**: `end_frame_reference_image_order` (populated by prompt generation from `enters` + `throughout` assets)
2. **Override**: Transformation events still swap specific asset URLs for post-transformation images
3. **Priority remains the same**: User override > auto-computed > base

The transformation event system and the presence_type system are complementary, not conflicting. An asset can be `throughout` (in both frames) AND have a within_shot transformation (end frame gets post-transformation image). These compose naturally.

---

## 6. Backend: Invalidation Integration

### Files Modified
- `backend/src/routes/sceneAssets.ts` (asset creation/deletion triggers)
- `backend/src/services/shotAssetAssignmentService.ts` (assignment changes trigger)

### 6A. When to Invalidate Stage 9

Any change to `shot_asset_assignments` should mark the affected shot's Stage 9 as needing regeneration. Specifically:

| Action | Invalidation |
|--------|-------------|
| Create assignment (add asset to shot) | Mark scene's Stage 9 as `outdated` |
| Delete assignment (remove asset from shot) | Mark scene's Stage 9 as `outdated` |
| Update presence_type | Mark scene's Stage 9 as `outdated` |
| Delete scene_asset_instance | Cascade-deletes assignments (FK), mark Stage 9 as `outdated` |

### 6B. Implementation

When a shot_asset_assignment is created/updated/deleted, update `scenes.stage_locks` to set Stage 9 (and downstream 10, 11, 12) to `outdated`:

```typescript
async function invalidateStage9AndDownstream(sceneId: string): Promise<void> {
  const { data: scene } = await supabase
    .from('scenes')
    .select('stage_locks')
    .eq('id', sceneId)
    .single();

  const locks = scene?.stage_locks || {};
  for (let s = 9; s <= 12; s++) {
    const key = String(s);
    if (locks[key]?.status === 'locked') {
      locks[key] = { status: 'outdated' };
    }
  }

  await supabase
    .from('scenes')
    .update({ stage_locks: locks, updated_at: new Date().toISOString() })
    .eq('id', sceneId);
}
```

This uses the existing two-phase unlock pattern — stages go to `outdated`, the UI shows the indicator, and the user regenerates when ready.

### 6C. Adding a New Asset to the Scene (Stage 8)

When `POST /scenes/:sceneId/assets` creates a new `scene_asset_instance`, the response should indicate that the user needs to assign it to shots. The asset is NOT automatically added to any shots (that happens via the shot checklist in the drawer or manually in Stage 9).

If the user skips the shot checklist (e.g., the scene has no shots yet because Stage 7 hasn't run), the asset simply exists without assignments and gets picked up during auto-population later.

---

## 7. Frontend: Types & Service Layer

### 7A. New Types

**File**: `src/types/scene.ts`

```typescript
export type PresenceType = 'throughout' | 'enters' | 'exits' | 'passes_through';

export interface ShotAssetAssignment {
  id: string;
  shot_id: string;
  scene_asset_instance_id: string;
  presence_type: PresenceType;
  created_at: string;
  updated_at: string;
  // Joined data (from API response)
  scene_asset_instance?: SceneAssetInstance;
}
```

### 7B. New Service: `shotAssetAssignmentService.ts`

**File**: `src/lib/services/shotAssetAssignmentService.ts`

Mirrors the backend routes:

```typescript
class ShotAssetAssignmentService {
  async listForScene(projectId: string, sceneId: string): Promise<ShotAssetAssignment[]>
  async listForShot(projectId: string, sceneId: string, shotId: string): Promise<ShotAssetAssignment[]>
  async createAssignments(projectId: string, sceneId: string, assignments: { shotId: string; instanceId: string; presenceType: PresenceType }[]): Promise<ShotAssetAssignment[]>
  async updateAssignment(projectId: string, sceneId: string, assignmentId: string, presenceType: PresenceType): Promise<ShotAssetAssignment>
  async deleteAssignment(projectId: string, sceneId: string, assignmentId: string): Promise<void>
  async autoPopulate(projectId: string, sceneId: string): Promise<{ created: number; existing: number }>
}
```

---

## 8. Frontend: Stage 8 — Asset Drawer Shot Preset

### Files Modified
- `src/components/pipeline/AssetDrawer.tsx`

### 8A. New Step: Shot Checklist

After the user selects an asset to add (from project library or global library), and before the `sceneAssetService.createSceneAsset()` call, show a shot selection step:

**UI:**
```
┌─────────────────────────────────────────┐
│  Add "Alice" to Scene                   │
│                                         │
│  Select which shots this asset          │
│  appears in:                            │
│                                         │
│  ☑ Shot 1A — INT. LIVING ROOM (8s)     │
│  ☑ Shot 1B — INT. LIVING ROOM (6s)     │
│  ☐ Shot 2A — EXT. GARDEN (4s)          │
│  ☑ Shot 2B — EXT. GARDEN (8s)          │
│                                         │
│  Presence type defaults to "Throughout" │
│  (editable per-shot in Stage 9)         │
│                                         │
│  [Cancel]              [Add to X shots] │
└─────────────────────────────────────────┘
```

**Behavior:**
- Fetches shots for the scene (needs a lightweight shots list query — may already exist via the stage data)
- All shots checked by default
- Shows shot ID + setting + duration for context
- On confirm: creates the scene_asset_instance, then calls `POST /shot-assignments` with `throughout` for each checked shot
- If no shots exist yet (Stage 7 hasn't been completed), skip the checklist entirely and just create the instance — it'll get assigned later via auto-population or Stage 9

### 8B. Props Changes

`AssetDrawer` needs to receive or fetch the scene's shot list. Options:
- Pass `shots?: Shot[]` as a prop from the Stage 8 parent (preferred if already available)
- Or fetch shots within the drawer via a lightweight API call

Since `Stage8VisualDefinition.tsx` already has `shots` in its props (see `VisualStateEditorPanel` which receives `shots?: Shot[]`), passing them through to the drawer is the cleanest approach.

---

## 9. Frontend: Stage 9 — Per-Shot Asset Panel

### Files Modified
- `src/components/pipeline/Stage9PromptSegmentation.tsx`
- New: `src/components/pipeline/Stage9/ShotAssetPanel.tsx`

### 9A. Expandable Assets Section Per Shot

Inside each shot's expanded content in `Stage9PromptSegmentation.tsx`, add a new collapsible section **above** the prompt sections:

```
┌─ Shot 1A ─────────────────────────── ▼ ──┐
│                                           │
│  ▶ Assets (3)                    [Edit]   │
│  ┌───────────────────────────────────┐    │
│  │ 👤 Alice        [Throughout ▼]    │    │
│  │ 👤 Bob          [Enters     ▼]    │    │
│  │ 📍 Living Room  [Throughout ▼]    │    │
│  │                                   │    │
│  │ [+ Add Asset]   [− Remove]        │    │
│  └───────────────────────────────────┘    │
│                                           │
│  Frame Prompt: ...                        │
│  Video Prompt: ...                        │
└───────────────────────────────────────────┘
```

### 9B. New Component: `ShotAssetPanel.tsx`

**Props:**
```typescript
interface ShotAssetPanelProps {
  projectId: string;
  sceneId: string;
  shotId: string;         // Shot UUID
  shotLabel: string;      // e.g., "1A"
  assignments: ShotAssetAssignment[];
  sceneAssets: SceneAssetInstance[];  // All scene assets (for the "Add" picker)
  onAssignmentsChanged: () => void;  // Callback to refresh/invalidate
}
```

**Features:**
- Lists current assignments with asset name, type icon, and presence_type dropdown
- Presence type dropdown: `Throughout | Enters | Exits | Passes Through`
- When `passes_through` is selected, show an inline warning:
  > "This asset won't appear in start or end frame images. Visual accuracy depends on the video model's text interpretation. Consider splitting this shot for better results."
- "Add Asset" button opens a compact asset picker (list of scene assets not yet assigned to this shot)
- "Remove" button (with confirmation) deletes the assignment
- Changes trigger `onAssignmentsChanged` which marks prompts as needing regeneration (visual indicator)

### 9C. Data Fetching

When Stage 9 loads:
1. Fetch scene assets: `GET /scenes/:sceneId/assets` (already done)
2. Fetch all shot assignments: `GET /scenes/:sceneId/shot-assignments` (new)
3. Check if assignments exist — if not, call `POST /shot-assignments/auto-populate` and re-fetch
4. Group assignments by shot_id and pass to each `ShotAssetPanel`

### 9D. Integration with Prompt Regeneration

When the user clicks "Generate Prompts" (or "Regenerate") in Stage 9:
- The generate-prompts endpoint now reads from `shot_asset_assignments` instead of pulling all scene assets
- Any shots with changed assignments since last generation get new prompts
- Reference image order is rebuilt per the new presence-aware logic

---

## 10. Auto-Population & Backwards Compatibility

### 10A. Auto-Population Trigger

When Stage 8 or Stage 9 loads and `hasAssignments(sceneId)` returns `false`:
1. Call `POST /shot-assignments/auto-populate`
2. This creates `throughout` assignments for every (scene_asset_instance × shot) pair
3. Show a toast: "Asset assignments initialized for all shots. You can customize per-shot in Stage 9."

This ensures existing projects work seamlessly — their current "all assets in all shots" behavior is explicitly captured as `throughout` assignments.

### 10B. Legacy Fallback

During the transition period, if the prompt generation endpoint encounters a scene with no `shot_asset_assignments`:
- Fall back to the current behavior (all scene assets → all shots)
- This prevents breaking existing projects that haven't been opened in Stage 8/9 yet

### 10C. `reference_image_order` Column

- **NOT removed** — continues to be written as a snapshot during prompt generation
- **Read path changes**: Frame generation continues reading from this column (no change needed)
- The column now reflects the per-shot, presence-aware asset selection rather than "all assets"

---

## 11. Implementation Order

The recommended implementation sequence, respecting dependencies:

| Phase | Section | What | Depends On |
|-------|---------|------|------------|
| **1** | §2 | SQL migration — create `shot_asset_assignments` table | Nothing |
| **2** | §3 | Backend service + routes for assignment CRUD | §1 |
| **3** | §7 | Frontend types + service layer | §2 |
| **4** | §10 | Auto-population logic (backend + frontend trigger) | §1, §2 |
| **5** | §8 | Stage 8 Asset Drawer shot checklist | §3, §4 |
| **6** | §9 | Stage 9 per-shot asset panel UI | §3, §4 |
| **7** | §4 | Prompt generation rework (presence-aware manifests) | §1, §3 |
| **8** | §5 | Frame generation rework (start/end frame filtering) | §7 |
| **9** | §6 | Invalidation integration | §2 |

> **Next steps**: After these phases are complete, move to `shot-asset-assignment-system-pt-2.md` for testing, character-to-reference mapping, and other enhancements.
