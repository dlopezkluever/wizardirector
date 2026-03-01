# Shot Asset Assignment System — Part 3: Asset Consolidation & Multi-Pass Frame Generation

> **Prerequisite**: This document is standalone but builds on infrastructure from Part 1 (`shot-asset-assignment-system.md`) and Part 2 (`shot-asset-assignment-system-pt-2.md`). It addresses two categories of improvements: (A) fixing mis-assigned and duplicate assets from LLM extraction, and (B) improving frame generation quality when many reference images are needed.

---

## Context: Problems Addressed

**Problem A — Asset Mis-Assignment & Duplication**: Stage 5's LLM extraction frequently produces:
- **Wrong types**: A character referenced in an action paragraph gets extracted as a prop. A location mentioned in dialogue gets extracted as a character.
- **Duplicate entities**: "John Smith" extracted as one character, "John" extracted as a separate asset (character or prop) because the script uses the short name in a different context.
- **Transformation-linked duplicates**: A character who transforms (e.g., person → garden gnome) gets extracted as two separate assets (character + prop) with no linkage.

Users currently can merge same-type assets and delete/defer assets, but cannot change an asset's type or merge across types.

**Problem B — Reference Image Overload**: When a shot has many assets (5+ characters, locations, props), all reference images are sent in a single generation call. Research and testing show:
- **Imagen 3**: Hard limit of 4 reference image objects
- **Gemini 2.5 Flash Image** (current provider via NanoBanana): Quality degrades significantly past 4-5 identity references
- **Academic research**: Iterative refinement yields ~17% improvement in compositional accuracy for complex scenes (7+ subjects)
- **Current system**: No limit enforced, no multi-pass logic — all images sent in one batch

---

## Table of Contents

1. [Change Asset Type (Stage 5)](#1-change-asset-type-stage-5)
2. [Cross-Type Asset Merge (Stage 5)](#2-cross-type-asset-merge-stage-5)
3. [Convert to Transformation (Stage 8)](#3-convert-to-transformation-stage-8)
4. [Multi-Pass Frame Generation (Backend)](#4-multi-pass-frame-generation-backend)
5. [Intermediate Frames in Carousel (Stage 10 UI)](#5-intermediate-frames-in-carousel-stage-10-ui)
6. [Implementation Order](#6-implementation-order)

---

## 1. Change Asset Type (Stage 5)

### Problem

An asset extracted as a `prop` is actually a `character` (or vice versa). The user cannot fix this without deleting the asset and recreating it manually — losing its description, image, and scene associations.

### Solution

Add a **"Change Type"** action to the Stage 5 asset context menu or selection toolbar.

### Backend Changes

**File**: `backend/src/routes/projectAssets.ts`

The existing `PUT /api/projects/:projectId/assets/:assetId` route currently accepts `name`, `description`, `image_prompt`, and `deferred`. Add `asset_type` to the allowed update fields:

```typescript
const UpdateProjectAssetSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  image_prompt: z.string().optional(),
  deferred: z.boolean().optional(),
  asset_type: z.enum(['character', 'prop', 'location', 'extra_archetype']).optional(), // NEW
});
```

**Validation rules:**
- Asset must NOT be locked (`locked: true` blocks all edits except `deferred`)
- If the asset has downstream scene_asset_instances, they continue to work — `scene_asset_instances` don't store `asset_type` directly; they reference the `project_asset` via FK, so the type change propagates automatically
- If changing to/from `location`, consider that locations typically have different image generation prompts — warn the user but don't block

**No migration needed** — the `asset_type` column already exists and accepts any of the enum values.

### Frontend Changes

**File**: `src/components/pipeline/Stage5Assets.tsx`

Add a "Change Type" option. Two possible placements:

**Option A — Context menu** (right-click or `...` menu on an asset card):
```
  Edit Name & Description
  Change Type  →  Character | Prop | Location | Extra
  Generate Image
  ─────────────
  Defer
  Delete
```

**Option B — Selection toolbar** (when exactly 1 asset is selected):
The existing toolbar shows Merge / Split / Delete when assets are selected. Add a "Change Type" dropdown when exactly 1 asset is selected.

**Recommended**: Option A (context menu) — it's a per-asset action, not a bulk action, so the context menu is the natural home.

**UI flow:**
1. User right-clicks (or clicks `...`) on an asset → selects "Change Type"
2. Submenu shows the 4 type options (current type is disabled/checked)
3. On selection, show a brief confirmation: "Change [Asset Name] from prop to character?"
4. Call `PUT /api/projects/:projectId/assets/:assetId` with `{ asset_type: newType }`
5. Refresh asset list

**Type definition update:**

**File**: `src/types/asset.ts` — `UpdateProjectAssetRequest`

```typescript
export interface UpdateProjectAssetRequest {
  name?: string;
  description?: string;
  image_prompt?: string;
  deferred?: boolean;
  asset_type?: AssetType; // NEW
}
```

---

## 2. Cross-Type Asset Merge (Stage 5)

### Problem

"John Smith" (character) and "John" (prop) are the same entity but can't be merged because the merge endpoint enforces same-type.

### Solution

Remove the same-type constraint from the merge endpoint. The survivor keeps its type; the absorbed assets are deleted regardless of their type.

### Backend Changes

**File**: `backend/src/routes/projectAssets.ts` — merge endpoint (lines ~750-755)

**Remove** the type validation block:

```typescript
// REMOVE THIS:
const survivor = assets.find((a: any) => a.id === survivorAssetId) as any;
const differentType = assets.find((a: any) => a.asset_type !== survivor.asset_type);
if (differentType) {
  return res.status(400).json({
    error: `All assets must be the same type...`
  });
}
```

The rest of the merge logic (re-point scene instances, union scene_numbers, delete absorbed assets) is type-agnostic and works without modification.

### Frontend Changes

**File**: `src/components/pipeline/Stage5Assets.tsx`

The selection toolbar currently only shows the "Merge" button when 2+ assets of the same type are selected. Remove or relax this constraint:

```typescript
// BEFORE: Only show merge when all selected assets share a type
const canMerge = selectedAssets.length >= 2 &&
  selectedAssets.every(a => a.asset_type === selectedAssets[0].asset_type);

// AFTER: Show merge when 2+ assets are selected (any types)
const canMerge = selectedAssets.length >= 2;
```

**File**: `src/components/pipeline/MergeDialog.tsx`

Add an informational note when merging across types:

```
┌─────────────────────────────────────────┐
│  Merge Assets                           │
│                                         │
│  ⚠ These assets have different types.   │
│  The survivor will keep its type        │
│  (character). Absorbed assets and       │
│  their scene associations will be       │
│  transferred to the survivor.           │
│                                         │
│  Choose the survivor:                   │
│  ○ John Smith (character) ← recommended │
│  ○ John (prop)                          │
│                                         │
│  [Cancel]              [Merge]          │
└─────────────────────────────────────────┘
```

The cross-type warning only appears when the selected assets have mixed types. Same-type merges display the existing UI unchanged.

---

## 3. Convert to Transformation (Stage 8)

### Problem

A character transforms into something (e.g., person → garden gnome), but the LLM extracted them as two separate assets. The user needs to:
1. Recognize they represent the same entity
2. Create a transformation event linking pre-state and post-state
3. Remove the duplicate asset

Currently this requires manually creating a transformation event in Stage 8 and re-entering all the absorbed asset's description/image data.

### Solution

A **"Convert to Transformation"** action in Stage 8 that:
1. Takes an asset (the "transformation result" — e.g., garden gnome)
2. Lets the user pick which asset it's a transformation of (the "base" — e.g., main character)
3. Uses the LLM to infer shot timing, transformation type, and descriptions
4. Pre-fills the existing `AddTransformationDialog` modal
5. On confirm: creates the event and removes the absorbed asset from the scene

### 3A. UI Flow

**Location**: Stage 8 scene asset list (`VisualStateEditorPanel.tsx` or the asset card context menu)

Each asset card in Stage 8 gets a new context menu option:

```
  Edit Description
  Generate Image
  ─────────────
  Convert to Transformation...    ← NEW
  ─────────────
  Remove from Scene
```

**Step 1 — Select the base asset:**
```
┌──────────────────────────────────────────────┐
│  Convert "Garden Gnome" to Transformation    │
│                                              │
│  This asset represents a transformed state   │
│  of another asset. Select the base asset:    │
│                                              │
│  ○ Alex Morrison (character)                 │
│  ○ Park Bench (prop)                         │
│  ○ Town Square (location)                    │
│                                              │
│  [Cancel]                    [Next →]        │
└──────────────────────────────────────────────┘
```

**Step 2 — AI analysis + pre-filled transformation event:**

On clicking "Next", the system sends an LLM request to analyze the scene's shots and infer transformation details. While loading, show a spinner: "Analyzing scene for transformation details..."

Then open the existing `AddTransformationDialog`, pre-filled with:
- `scene_asset_instance_id` = base asset's instance ID
- `trigger_shot_id` = AI-inferred shot where transformation occurs
- `transformation_type` = AI-inferred (`instant`, `gradual`, `within_shot`)
- `completion_shot_id` = AI-inferred (for `gradual` type)
- `pre_description` = base asset's `effective_description`
- `post_description` = absorbed asset's `effective_description`
- `transformation_narrative` = AI-inferred narrative
- `detected_by` = `'manual'`

The user can review and edit ALL fields before confirming. Nothing is committed until they click "Confirm."

**Step 3 — On confirm:**
1. Create the transformation event via the existing `POST /transformation-events` endpoint
2. If the absorbed asset has an image, set it as the transformation's `post_image_key_url`
3. Remove the absorbed asset's `scene_asset_instance` from this scene
4. Optionally defer the absorbed project asset (ask user: "Also defer Garden Gnome from the project? It will remain available but marked as optional.")
5. Refresh the asset panel

### 3B. AI Inference Endpoint

**New endpoint**: `POST /api/projects/:projectId/scenes/:sceneId/infer-transformation`

**Request:**
```typescript
{
  baseAssetInstanceId: string;       // The character being transformed
  absorbedAssetInstanceId: string;   // The asset representing the post-transformation state
}
```

**What the LLM receives:**
- Scene script excerpt
- All shots in the scene (action, dialogue, setting, characters_foreground/background)
- Base asset: name, type, effective_description
- Absorbed asset: name, type, effective_description

**LLM prompt (structured output):**
```
Given this scene and its shots, determine how and when "{base_asset_name}" transforms into/becomes "{absorbed_asset_name}".

Respond with:
- trigger_shot_id: Which shot does the transformation begin in?
- transformation_type: "instant" (happens between shots), "gradual" (spans multiple shots), or "within_shot" (happens during a single shot)
- completion_shot_id: If gradual, which shot does the transformation complete in? (null otherwise)
- post_description: Physical description of the transformed state (use the absorbed asset's description as a starting point but refine for the scene context)
- transformation_narrative: Brief narrative of how the transformation occurs (e.g., "A flash of magical light engulfs Alex, and when it fades, a garden gnome stands in his place.")
```

**Response:**
```typescript
{
  trigger_shot_id: string;
  transformation_type: 'instant' | 'gradual' | 'within_shot';
  completion_shot_id: string | null;
  post_description: string;
  transformation_narrative: string;
}
```

**Error handling**: If the LLM can't determine the transformation timing (e.g., neither asset is mentioned in shot text), return defaults with a flag:
```typescript
{
  confidence: 'low',
  message: "Could not determine transformation timing from shot data. Please select manually.",
  // Still return best-guess defaults so the modal isn't empty
  trigger_shot_id: firstShotId,
  transformation_type: 'instant',
  ...
}
```

The UI shows the low-confidence warning and the user manually selects the correct shot.

### 3C. Backend Service Addition

**File**: `backend/src/services/transformationEventService.ts`

Add a method:

```typescript
async inferTransformation(
  sceneId: string,
  baseInstance: SceneAssetInstance,
  absorbedInstance: SceneAssetInstance,
  shots: Shot[],
  scriptExcerpt: string
): Promise<InferredTransformation>
```

This calls the LLM with the structured prompt from §3B and parses the response.

### 3D. Relationship to Cross-Type Merge (§2)

These are **separate actions** for separate use cases:

| Scenario | Action | Stage |
|----------|--------|-------|
| "John" and "John Smith" are the same person | Cross-type merge (§2) | Stage 5 |
| "Garden Gnome" is what "Alex" transforms into | Convert to Transformation (§3) | Stage 8 |

The user chooses based on intent. The UI makes the distinction clear:
- **Merge** = "These are the same thing, deduplicate them"
- **Convert to Transformation** = "This asset is what the other asset becomes"

---

## 4. Multi-Pass Frame Generation (Backend)

### Problem

When a shot has many reference images (5+), sending them all in a single generation call produces poor results:
- Identity confusion between similar characters
- Compositional incoherence (elements placed randomly)
- Some assets ignored entirely by the model

### Solution

Automatic multi-pass image-to-image generation when reference images exceed a threshold.

### 4A. Threshold & Pass Strategy

**Threshold**: **4 reference images**. When a shot has ≤4 identity references, use single-pass (current behavior). When >4, switch to multi-pass.

**Priority ordering** (what gets generated first):
1. **Location** assets — environment/setting takes highest priority (establishes the scene)
2. **Foreground characters** — main subjects (from `characters_foreground` on the shot, or all characters if shot data unavailable)
3. **Background characters** — secondary subjects (from `characters_background`)
4. **Props** — objects and set dressing

**Batch sizing**: Each pass includes a maximum of **4 new reference images** (the provider sweet spot). The previous pass's output image counts as 1 additional reference (role: `identity`), so each subsequent pass has 3-4 new asset references + 1 previous output = 4-5 total references.

**Example — 8 assets** (1 location, 3 foreground chars, 2 background chars, 2 props):

| Pass | Input References | New Assets Added | Output |
|------|-----------------|------------------|--------|
| **1** | Location + 3 foreground characters (4 refs) | 4 | Base scene image |
| **2** | Pass 1 output + 2 background chars + 1 prop (4 refs) | 3 | Refined image |
| **3** | Pass 2 output + 1 remaining prop (2 refs) | 1 | Final image |

### 4B. Pass Execution Flow

```
┌──────────────────────────────────────────────────────────┐
│  generateFrame(shot, frameType)                          │
│                                                          │
│  1. Collect all reference images for this frame          │
│  2. Sort by priority: location → fg chars → bg → props  │
│  3. If count ≤ 4 → single-pass (current behavior)       │
│  4. If count > 4 → multi-pass:                          │
│     a. Chunk into batches of ≤4                          │
│     b. Pass 1: Generate with batch 1 (text prompt +     │
│        batch 1 refs)                                     │
│     c. Pass 2+: Generate with previous output as base   │
│        reference + batch N refs + modified prompt        │
│        instructing the model to ADD the new assets       │
│        while preserving existing content                 │
│     d. Save each intermediate as a generation attempt    │
│     e. Final pass output = selected attempt              │
└──────────────────────────────────────────────────────────┘
```

### 4C. Prompt Modification for Subsequent Passes

Pass 1 uses the standard frame prompt (as generated by Stage 9).

Pass 2+ uses a **modified prompt** that:
- References the previous output as the base scene ("Starting from the provided base image...")
- Lists only the NEW assets being added in this pass
- Instructs the model to preserve existing elements: "Maintain all existing subjects and composition. Add the following elements to the scene: [new asset descriptions]"

```typescript
function buildMultiPassPrompt(
  originalPrompt: string,
  newAssets: ReferenceImageOrderEntry[],
  passNumber: number
): string {
  const assetList = newAssets
    .map(a => `- ${a.assetName} (${a.type})`)
    .join('\n');

  return `Starting from the provided base image, add the following elements to the scene while preserving all existing subjects, composition, and lighting:\n\n${assetList}\n\nOriginal scene context:\n${originalPrompt}`;
}
```

### 4D. Files Modified

**Primary**: `backend/src/services/frameGenerationService.ts`

Add a `generateFrameMultiPass()` method alongside the existing `generateFrame()`:

```typescript
class FrameGenerationService {
  // Existing single-pass method (unchanged)
  async generateFrame(options: FrameGenerationOptions): Promise<FrameResult> { ... }

  // NEW: Multi-pass orchestrator
  async generateFrameMultiPass(
    options: FrameGenerationOptions,
    referenceImages: ReferenceImage[],
    frameRecord: Frame,
    shotId: string
  ): Promise<FrameResult> {
    const batches = this.chunkReferencesByPriority(referenceImages, 4);
    let previousOutput: string | null = null;
    const intermediateAttempts: GenerationAttempt[] = [];

    for (let i = 0; i < batches.length; i++) {
      const isFirstPass = i === 0;
      const refs = isFirstPass
        ? batches[i]
        : [{ url: previousOutput!, role: 'identity' as const }, ...batches[i]];

      const prompt = isFirstPass
        ? options.prompt
        : this.buildMultiPassPrompt(options.prompt, batches[i], i + 1);

      const result = await this.callImageProvider(refs, prompt, options);

      // Save intermediate as generation attempt
      const attempt = await this.saveGenerationAttempt(frameRecord.id, {
        imageUrl: result.imageUrl,
        source: 'generated',
        isSelected: i === batches.length - 1, // Only final pass is selected
        promptSnapshot: prompt,
        passNumber: i + 1,
        totalPasses: batches.length,
      });
      intermediateAttempts.push(attempt);

      previousOutput = result.imageUrl;
    }

    return { imageUrl: previousOutput!, attempts: intermediateAttempts };
  }

  // NEW: Sort and chunk references by priority
  private chunkReferencesByPriority(
    refs: ReferenceImage[],
    maxPerBatch: number
  ): ReferenceImage[][] { ... }
}
```

**Secondary**: `backend/src/services/image-generation/ImageGenerationService.ts`
- No structural changes needed — it already accepts an array of reference images
- May need to accept a `baseImage` parameter for pass 2+ (or we treat it as a regular identity reference, which the current interface supports)

### 4E. Configuration

The threshold should be configurable at the system level (environment variable) rather than hardcoded:

```
MULTI_PASS_THRESHOLD=4          # Switch to multi-pass above this many refs
MULTI_PASS_BATCH_SIZE=4         # Max new refs per pass
```

Default: threshold=4, batch_size=4.

### 4F. Cost Implications

Multi-pass generation multiplies the per-frame cost by the number of passes. For a shot with 8 assets:
- Single-pass: 1 generation call
- Multi-pass: 3 generation calls (~3x cost)

The cost estimation in `estimateCost()` needs to account for this:

```typescript
function estimateFrameCost(refCount: number): number {
  const baseCost = COST_PER_GENERATION;
  if (refCount <= MULTI_PASS_THRESHOLD) return baseCost;
  const passes = Math.ceil((refCount - MULTI_PASS_THRESHOLD) / MULTI_PASS_BATCH_SIZE) + 1;
  return baseCost * passes;
}
```

This updated estimate should be reflected in the Stage 11 checkout cost summary so users aren't surprised.

---

## 5. Intermediate Frames in Carousel (Stage 10 UI)

### Problem

Multi-pass generation produces intermediate images that are discarded. These intermediates can be valuable — a user might prefer the Pass 1 result (clean location + main characters) over the final crowded result.

### Solution

Save every pass's output as a **generation attempt** on the frame record, visible in the existing frame carousel. The final pass is auto-selected, but the user can select any intermediate.

### 5A. Generation Attempt Metadata

Extend the `frame_generation_attempts` table (or its equivalent) to track multi-pass context:

```typescript
// Additional fields on generation attempts for multi-pass:
{
  pass_number: number;       // Which pass produced this (1, 2, 3...)
  total_passes: number;      // How many passes were planned
  assets_in_pass: string[];  // Asset names included in this pass (for tooltip)
}
```

These fields can be stored in an existing JSONB metadata column or as new columns (prefer metadata JSONB to avoid a migration for a secondary feature).

### 5B. Carousel UI Changes

**File**: `src/components/pipeline/Stage10FrameGeneration.tsx` (or the frame carousel component)

When a frame has multi-pass attempts, the carousel shows:

```
┌──────────────────────────────────────────────────┐
│  Frame 1A — Start Frame                          │
│  ┌────────────────────────────────────────────┐  │
│  │                                            │  │
│  │           [Current Selected Image]         │  │
│  │                                            │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  Generation History:                             │
│  [Pass 1: Base] [Pass 2: +BG chars] [Pass 3 ✓]  │
│                                                  │
│  Pass 3 (selected) — All 8 assets               │
│  ────────────────────────────────────────────── │
│  [Regenerate]  [Select as Final]                │
└──────────────────────────────────────────────────┘
```

**Behavior:**
- Each pass thumbnail is labeled with what was added (e.g., "Pass 1: Location + Alice + Bob")
- Hovering shows a tooltip with the asset names included
- Clicking a pass selects it as the active frame
- The auto-selected pass (final) has a checkmark indicator
- "Regenerate" re-runs the full multi-pass pipeline
- This reuses the existing carousel/attempt-selection UI pattern — multi-pass attempts are just more generation attempts with additional metadata

### 5C. No Changes to Single-Pass Behavior

When a frame is generated with ≤4 references (single-pass), the carousel behaves exactly as it does today — one attempt per generation, no pass indicators.

---

## 6. Implementation Order

| Phase | Section | What | Depends On | Complexity |
|-------|---------|------|------------|------------|
| **1** | §1 | Change Asset Type — backend + frontend | Nothing | Low |
| **2** | §2 | Cross-Type Merge — remove constraint + UI warning | Nothing | Low |
| **3** | §4 | Multi-Pass Frame Generation — backend orchestrator | Nothing (but benefits from Part 1's per-shot asset filtering) |  Medium-High |
| **4** | §5 | Intermediate Frames in Carousel — UI | §4 | Medium |
| **5** | §3 | Convert to Transformation — AI inference + UI flow | §1, §2 (user should be able to re-type/merge before converting) | Medium-High |

**Notes:**
- §1 and §2 are quick wins and can be done in parallel
- §3 (Convert to Transformation) depends on the existing transformation event infrastructure from Stage 8 being stable, and benefits from §1/§2 being available first (user can re-type an asset before deciding whether to convert it)
- §4 and §5 are independent of §1-§3 and can be developed in parallel with the asset consolidation work
- All sections benefit from Part 1 (shot asset assignments) being complete, since multi-pass generation produces better results when only the relevant assets for a specific shot are included

> **See also**: `shot-asset-assignment-system.md` (Part 1) for the core per-shot assignment system, and `shot-asset-assignment-system-pt-2.md` (Part 2) for testing strategy and secondary enhancements.
