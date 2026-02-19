# WT-F: Context-Aware Adaptive Asset Descriptions

**Wave**: 2 (parallel with WT-D and WT-E — after Wave 1 merges)
**Tasks**: 4E.1
**Scope**: Make asset descriptions automatically adapt to scene context (costume changes, transformations, etc.)
**Depends on**: WT-B (4C.1) should be merged first for clean contextManager.ts merge

> **Note**: 4A.1 (Content Access Carousel) has already been built and merged. This task is backend-focused and unlikely to conflict, but Stage8/VisualStateEditorPanel.tsx now exists alongside ContentAccessCarousel in Stage 8.

> **UPDATE (Feb 2026)**: The **Transformation Event System** (see `Transformation-Event-System-Plan.md` and `Transformation-Event-System-Dev-Summary.md`) has been implemented and covers a significant portion of WT-F's original scope — specifically all *within-scene transformation* use cases. See "What's Already Done" below. The remaining WT-F scope is narrowed to **non-transformation scene-context adaptations** (clothing for scene context, time-of-day effects, environmental adaptations, emotional state posture).

---

## Task 4E.1 — Context-Aware Asset Descriptions per Scene/Shot

**Ticket**: Multi-stage asset extraction optimization
**Priority**: MEDIUM

### Problem
Visual descriptions for assets must be adaptive/context-aware per scene. If "the hero" starts in a workout outfit but Scene 4 is a wedding, the visual description should automatically describe them in a suit. Currently, master asset descriptions are static — the same description is used everywhere regardless of scene context.

### Ticket (from Tickets.md — Asset Extraction & Continuity Optimization)
> Visual descriptions for assets must be adaptive/context-aware per scene: e.g., if "the hero" starts in a workout outfit but Scene 4 is a wedding, the visual description should automatically describe them in a suit. The agentic tooling should infer the correct context from the script/scene/shot list. (Example: Persephone switching from blonde nature-princess to goth alt-girl in the underworld — the LLM should catch that and apply the correct description per scene.)

### MVP-tasklist-v1.1 Reference (Feature 5.2 — Data Quality)
> Context-aware asset description generation based on scene/shot requirements. Merge master asset descriptions with scene-specific context. Example: Persephone (blonde nature princess → dark goth underworld queen).

### What's Already Done (Transformation Event System)

The following features have been fully or partially implemented by the Transformation Event System:

- [x] **Auto-detect transformation points** — **DONE**
  - Stage 7 shot extraction now detects `transformation_flags` on shots (costume changes, injuries, physical transformations, disguises)
  - Stage 8 auto-creates unconfirmed `transformation_events` from detected flags
  - Users can also manually create transformation events in Stage 8
- [x] **Per-scene description variants for transformations** — **DONE**
  - `transformation_events` table stores `pre_description` / `post_description` per asset per scene
  - LLM-powered `generatePostDescription()` generates post-state from pre-state + narrative
  - `resolveOverridesForShot()` determines the correct description per-shot based on transformation boundaries
- [x] **User can review and edit transformation descriptions** — **DONE**
  - `VisualStateEditorPanel.tsx` has full Transformation Events section with CRUD
  - `TransformationEventCard.tsx` shows pre/post descriptions, confirm/dismiss, AI generation
  - `AddTransformationDialog.tsx` for manual creation
  - Lock gating: Stage 8 → 9 blocked if unconfirmed/incomplete events exist
- [x] **Cross-scene inheritance of post-transformation state** — **DONE**
  - `assetInheritanceService.ts` and `sceneAssetRelevanceService.ts` both check for transformation events and inherit post-state descriptions/tags

### Core Features (Remaining Scope)

The following features are **NOT covered** by the Transformation Event System and remain for WT-F:

- [ ] **Agentic tooling for non-transformation scene-context adaptations**
  - LLM reads the scene's script excerpt + shot list
  - For each asset present in the scene, determines if appearance differs from master description
  - Detects: environmental adaptation (indoor/outdoor clothing, weather gear), time-of-day effects (lighting, shadows), emotional state posture/expression — cases where there is NO explicit "transformation" but the asset looks different in this scene's context
- [ ] **Merge master asset descriptions with scene-specific context**
  - Start from master description as baseline
  - Layer scene-specific modifications on top
  - Result: a complete `effective_description` that's accurate for THIS scene
  - This is broader than transformation events — it covers ALL scene-context reasons an asset might look different
- [ ] **Adaptive description generation for inherited assets**
  - When assets inherit into a scene (via `assetInheritanceService`), auto-generate a context-aware description
  - Should build on top of transformation post-state if one exists (not replace it)
  - Store in `description_override` or `effective_description` on `scene_asset_instances`

### Implementation Approach (Updated)

> **Key change**: The Transformation Event System already handles explicit transformations (costume change, physical transformation, disguise). WT-F's remaining scope is *implicit* scene-context adaptations where there's no on-screen transformation moment.

1. **Extend `assetDescriptionMerger.ts`** (or new `AdaptiveDescriptionService`)
   - Input: master asset description + inherited state (including transformation post-state if any) + scene script excerpt + shot list
   - LLM call: "Given this character's current description and this scene's context, generate an accurate visual description for this character in this scene"
   - Output: scene-specific adaptive `effective_description`
   - **Must NOT overwrite transformation events** — if a `transformation_event` exists for an asset in this scene, the transformation system takes priority for shots at/after the trigger. Adaptive description only sets the *baseline* effective_description.
2. **Integration points**:
   - Called during Stage 8 scene asset population (when inheriting assets into a scene)
   - Can be re-triggered if scene context changes (shot list edit, script edit)
   - Feeds into Stage 9 prompt generation via `effective_description` on scene asset instance
   - **New**: `resolveOverridesForShot()` from `transformationEventService` overrides `effective_description` at transformation boundaries — adaptive description is the pre-transformation baseline
3. **Context Manager integration**:
   - `contextManager.ts` should use adaptive descriptions when assembling prompt context
   - Priority: transformation event override > adaptive description > manual override > inherited description > master description

### Dependencies
- 3A.1 (Two-Pass Asset Extraction) — **DONE** ✅
- 3C.4 (Context Manager Enhancement) — **DONE** ✅
- Transformation Event System — **DONE** ✅ (WT-F builds on top of this; adaptive descriptions set the baseline that transformation events override)

---

## Files At Play

### Backend (Primary — this is entirely a backend task)
- `backend/src/services/assetDescriptionMerger.ts` — **PRIMARY FILE**: Extend or companion service for adaptive description logic
- `backend/src/services/contextManager.ts` — Update to prefer adaptive descriptions in context assembly
- `backend/src/services/llm-client.ts` — LLM calls for adaptive description generation
- `backend/src/services/assetInheritanceService.ts` — **ALREADY MODIFIED** by Transformation Event System (now checks `transformationEventService.getLastAssetStateForInheritance()` for post-state inheritance). May need to trigger adaptive description generation during inheritance.
- `backend/src/services/sceneAssetRelevanceService.ts` — **ALREADY MODIFIED** by Transformation Event System (now uses transformation post-state in `getLastInstancePerAsset()`). Scene context for determining which assets need adaptation.
- `backend/src/services/transformationEventService.ts` — **NEW (from Transformation Event System)**: Provides `resolveOverridesForShot()` which overrides `effective_description` at transformation boundaries. Adaptive descriptions should set the baseline that this service overrides.

### Backend Routes
- `backend/src/routes/sceneAssets.ts` — **ALREADY MODIFIED** by Transformation Event System (7 new transformation event endpoints added). May need additional endpoint to trigger adaptive description generation, or hook into existing populate/inherit endpoints.

### Database
- `scene_asset_instances` table — Reuse `description_override` / `effective_description` for adaptive descriptions (no new column needed)
- `transformation_events` table — **NEW (from Transformation Event System)**: Stores pre/post descriptions for within-scene transformations. Adaptive description should NOT duplicate this data.

### Frontend (Secondary — minor UI to show adaptive descriptions)
- `src/components/pipeline/Stage8/VisualStateEditorPanel.tsx` — **ALREADY MODIFIED** by Transformation Event System (has Transformation Events section with CRUD). Show adaptive vs master description alongside existing transformation events UI.
- `src/lib/services/sceneAssetService.ts` — May need method to trigger adaptive description generation

### Types
- `src/types/scene.ts` — **ALREADY MODIFIED** by Transformation Event System (has `TransformationType`, `TransformationFlag`, `TransformationEvent`, `PromptSetTransformationContext`). `SceneAssetInstance` type may need `adaptiveDescription` field.
