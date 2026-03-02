# Shot Asset Assignment System — Part 3: Asset Consolidation &

> **Prerequisite**: This document is standalone but builds on infrastructure from Part 1 (`shot-asset-assignment-system.md`) and Part 2 (`shot-asset-assignment-system-pt-2.md`). It addresses two categories of improvements: (A) fixing mis-assigned and duplicate assets from LLM extraction, 

---

## Context: Problems Addressed

**Problem A — Asset Mis-Assignment & Duplication**: Stage 5's LLM extraction frequently produces:
- **Wrong types**: A character referenced in an action paragraph gets extracted as a prop. A location mentioned in dialogue gets extracted as a character.
- **Duplicate entities**: "John Smith" extracted as one character, "John" extracted as a separate asset (character or prop) because the script uses the short name in a different context.
- **Transformation-linked duplicates**: A character who transforms (e.g., person → garden gnome) gets extracted as two separate assets (character + prop) with no linkage.

Users currently can merge same-type assets and delete/defer assets, but cannot change an asset's type or merge across types.



---

## Table of Contents

1. [Change Asset Type (Stage 5)](#1-change-asset-type-stage-5)
2. [Cross-Type Asset Merge (Stage 5)](#2-cross-type-asset-merge-stage-5)
3. [Convert to Transformation (Stage 8)](#3-convert-to-transformation-stage-8)


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

In this session we are implementing   (we have already completed: `shot-asset-assignment-system.md` (Part 1) for the core per-shot assignment system, and `shot-asset-assignment-system-pt-2.md` (Part 2) for testing strategy and secondary enhancements.)

 Here is Claude's plan:
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌ Shot Asset Assignment System — Part 3: Implementation Plan

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

 

❯ i want to implement these tasks, 'c:/Users/Daniel Lopez/Desktop/Aiuteur/wizardirector/._docs/t-asset-system-improvements/shot-asset-ass-pt-3.0.md' but lets discuss first, then make a plan, is it clear what i seek? use the AskUserQuestion tool to help clarify or to give recommendations. also, for          
  merging assets, what would really be the best way to do it, espeically if one asset (even if misassgined it's type) maybe more accurate to what the desciption of the asset will be in a certain scene, compared to the main / domaniaring asset. also, does the merge default to one description taking          
  power, or does it merge the two descriptions, or does it let the user pick? also, remind me again how the descriptions get updated as the story progresses, cause maybe, if in eahc scene in stage 8, if every asset's description  is agentically updated  according to any changes which occur in the           
  story, maybe its fine if then, in the merging of assets, that the less relvant (or only relevant when the asset is in a later scene, like description wise) get deleted, since the system will regenerate desciptions in a per scene basis, and thus automatically regenrate in the stage 8 for each scene,       
  also double check that infoact our system is agentically generating asset descitpions per scene relevant to the story                                                                                                                                                                                             

● Let me read the task document and check how asset descriptions currently work in the system.

● Read 1 file (ctrl+o to expand)

● 2 Explore agents finished (ctrl+o to expand)
   ├─ Explore asset description generation · 35 tool uses · 87.4k tokens
   │  ⎿  Done
   └─ Explore asset merging code · 33 tool uses · 75.1k tokens  
      ⎿  Done        

● Good, I now have a thorough picture of both the task doc and the current system. Let me address your questions directly before we clarify:

  Current merge behavior: The survivor keeps its own description entirely. Absorbed assets' descriptions are simply lost. There is no description merging, no user choice, no blending. The absorbed assets get deleted after their scene instances are re-pointed.

  Per-scene description regeneration: YES, the system does agentically generate per-scene descriptions. SceneAssetRelevanceService.detectRelevantAssets() uses LLM to produce a starting_description for each asset relevant to each scene. And in Stage 8's visual editor, description_override can further        
  customize per scene. Plus carry_forward propagates changes, and transformation events handle mid-scene changes.

  Your intuition is solid: Since Stage 8 regenerates per-scene descriptions based on the story context anyway, losing the absorbed asset's description during merge is less damaging than it seems — the system will re-derive what matters for each scene.

  However, there are nuances to discuss:

● User answered Claude's questions:
  ⎿  · During cross-type merge, should we handle the survivor's **project-level base description** differently than today (where it just stays as-is), or is the current behavior fine given that Stage 8 regenerates scene-level descriptions anyway? → offer a choice, but default to keeping the 
     "survivors", but note that is the two assets are being merged, one is in scenes 1-4 & 6, whit the other is in 5 & 8, well then the final product of the merge should have scene 1-6 & 8 (thus both of the assets scenes) AND for the description, default to survirors, but allow the view to see both         
     side by side, and allow the user, to agentically merge it if he chooses (but dont automatically merge it, instead have like a open text box with a (merge with AI button above it) but the user can just copy and paste items from each description into that text box and save it (like maunal 
     merge/conslidation) 
     · The task doc has 2 features — Feature 1 (Change Asset Type in Stage 5) and Feature 2 (Cross-Type Merge + Shot Assignment Migration Fix). Should we implement both, or prioritize one? → Both features together (Recommended)
     · For the shot_asset_assignment migration during merge (Feature 2), the doc proposes a specificity hierarchy: enters/exits/passes_through (3) > throughout (1). When both survivor and absorbed have assignments for the same shot, keep the more specific one. Does this priority feel right to you? →        
     probably 1 (yes more specfic) but like, help me understand what is occuring here. Is this for merges done is stage 5 or stage 8, i dont think that information will even be relevant for stage 5 merges, look maybe this feature needs to be consdered as well becuase it brings into account
     transfromation events when merging in stage 8, which i think goes hand in  hand with this: 'c:/Users/Daniel Lopez/Desktop/Aiuteur/wizardirector/._docs/t-asset-system-improvements/shot-asset-ass-pt-3.0b.md'

● Let me read the 3.0b doc and also check where merging currently lives (Stage 5 only or also Stage 8).

● Searched for 1 pattern, read 1 file (ctrl+o to expand)

● Good context. Let me clarify the shot_asset_assignment situation and how 3.0b fits in.

  Where merging happens: Merge currently lives only in Stage 5 UI. Stage 8 has no merge functionality. BUT — merge in Stage 5 affects Stage 8 data. Here's the chain:

  1. Stage 5 merge re-points scene_asset_instances (Stage 8 data)
  2. Each scene_asset_instance has shot_asset_assignments (which shots the asset appears in, with presence types like "throughout", "enters", "exits")
  3. The bug: When both assets appear in the same scene, the absorbed instance gets deleted — and its shot_asset_assignments silently vanish. The fix in Feature 2 migrates those assignments to the survivor's instance before deleting.

  So yes, the specificity hierarchy (enters/exits > throughout) is relevant for Stage 5 merges that affect scenes where both assets were assigned to the same shots.

  How 3.0b fits: Feature 3 (Convert to Transformation) is a Stage 8 operation that handles a different case — when an "asset" is actually a transformation of another asset (e.g., "John disguised" is really "John" after a costume change). Instead of merging, it converts the absorbed asset into a
  transformation event on the base asset. This is conceptually related but mechanically different from merge.

● User answered Claude's questions:
  ⎿  · For the MergeDialog description UX you described (side-by-side view, editable text box, AI merge button), should the text box default to the survivor's description pre-filled, or start empty for the user to compose from scratch? → Pre-fill with survivor's description (Recommended)
     · Should we include Feature 3 (Convert to Transformation from 3.0b) in the same implementation plan as Features 1 & 2, or treat it as a separate follow-up? → Do Features 1 & 2 first, then 3 as follow-up

● Clear. Two phases with a hard stop:
  - Phase A: Features 1 & 2 — Change Asset Type + Cross-Type Merge with description UX + shot assignment migration fix (Stage 5 focused)
  - Phase B: Feature 3 — Convert to Transformation (Stage 8 focused)

  Let me enter plan mode to write this up properly.

● Entered plan mode
  Claude is now exploring and designing an implementation approach.

● Let me explore the specific files that need to be modified to understand the exact current code patterns.

● 2 Explore agents finished (ctrl+o to expand)
   ├─ Explore merge and type validation · 26 tool uses · 42.4k tokens
   │  ⎿  Done
   └─ Explore shot_asset_assignments schema · 24 tool uses · 51.2k tokens
      ⎿  Done

❯ This means you need to make 2 separet plan docuemnts → (Do Features 1 & 2 first, then 3 as follow-up) 

● Got it — two separate plan documents. I have all the exploration data I need. Let me design the plans now.

● Plan(Design Phase A implementation plan)
  ⎿  Done (31 tool uses · 61.8k tokens · 3m 25s)
  (ctrl+o to expand)

● Now let me read a few critical files to verify details before writing the plans.

● Read 3 files (ctrl+o to expand)

● Now let me also check the rest of the asset types file for MergeAssetsRequest/Response, and the Stage5Assets context menu area.

● Searched for 1 pattern, read 2 files (ctrl+o to expand)

● Let me check if DropdownMenuSub components exist in the UI library, and also check the existing imports in Stage5Assets.

● Searched for 1 pattern, read 2 files (ctrl+o to expand)

● I have all the details. Let me write both phases into the plan file, clearly separated with a hard stop.

● Updated plan
  ⎿  /plan to preview

● The plan covers both phases in one document with a clear hard stop between them. Phase A has 12 implementation steps for Features 1 & 2, and Phase B has 6 steps for Feature 3.