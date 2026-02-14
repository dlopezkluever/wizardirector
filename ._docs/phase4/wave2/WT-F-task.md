# WT-F: Context-Aware Adaptive Asset Descriptions

**Wave**: 2 (parallel with WT-D and WT-E — after Wave 1 merges)
**Tasks**: 4E.1
**Scope**: Make asset descriptions automatically adapt to scene context (costume changes, transformations, etc.)
**Depends on**: WT-B (4C.1) should be merged first for clean contextManager.ts merge

> **Note**: 4A.1 (Content Access Carousel) has already been built and merged. This task is backend-focused and unlikely to conflict, but Stage8/VisualStateEditorPanel.tsx now exists alongside ContentAccessCarousel in Stage 8.

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

### Core Features
- [ ] **Agentic tooling that infers correct asset context from script/scene/shot list**
  - LLM reads the scene's script excerpt + shot list
  - For each asset present in the scene, determines if appearance differs from master description
  - Detects: costume changes, injuries, emotional states, transformations, time-of-day effects
- [ ] **Merge master asset descriptions with scene-specific context**
  - Start from master description as baseline
  - Layer scene-specific modifications on top
  - Result: a complete description that's accurate for THIS scene
- [ ] **Per-scene description variants stored alongside master description**
  - Store in `scene_asset_instances` table (likely in `description_override` or a new `adaptive_description` field)
  - Variants are auto-generated but user-editable
  - Clear provenance: "Master: blonde nature princess" → "Scene 4 adaptive: goth alt-girl with dark makeup"
- [ ] **Auto-detect transformation points**
  - Costume changes (wedding, battle, disguise)
  - Physical changes (injuries, aging, transformations)
  - Environmental adaptation (indoor/outdoor clothing, weather gear)
  - Emotional state (crying, angry, joyful — affects posture/expression)
- [ ] **User can review and edit adaptive descriptions**
  - Stage 8 UI should show adaptive description alongside master
  - User can accept, edit, or revert to master
  - Edits are preserved as manual overrides

### Implementation Approach
1. **New service**: `AdaptiveDescriptionService` (or extend `assetDescriptionMerger.ts`)
   - Input: master asset description + scene script excerpt + shot list + scene dependencies
   - LLM call: "Given this character's master description and this scene's context, generate an accurate visual description for this character in this scene"
   - Output: scene-specific adaptive description
2. **Integration points**:
   - Called during Stage 8 scene asset population (when inheriting assets into a scene)
   - Can be re-triggered if scene context changes (shot list edit, script edit)
   - Feeds into Stage 9 prompt generation (via `effective_description` on scene asset instance)
3. **Context Manager integration**:
   - `contextManager.ts` should use adaptive descriptions when assembling prompt context
   - Priority: adaptive description > manual override > inherited description > master description

### Dependencies
- 3A.1 (Two-Pass Asset Extraction) — **DONE** ✅
- 3C.4 (Context Manager Enhancement) — **DONE** ✅

---

## Files At Play

### Backend (Primary — this is entirely a backend task)
- `backend/src/services/assetDescriptionMerger.ts` — **PRIMARY FILE**: Extend or companion service for adaptive description logic
- `backend/src/services/contextManager.ts` — Update to prefer adaptive descriptions in context assembly
- `backend/src/services/llm-client.ts` — LLM calls for adaptive description generation
- `backend/src/services/assetInheritanceService.ts` — May need to trigger adaptive description generation during inheritance
- `backend/src/services/sceneAssetRelevanceService.ts` — Scene context for determining which assets need adaptation

### Backend Routes
- `backend/src/routes/sceneAssets.ts` — May need endpoint to trigger adaptive description generation, or hook into existing populate/inherit endpoints

### Database
- `scene_asset_instances` table — May need new column `adaptive_description` or reuse `description_override` / `effective_description`

### Frontend (Secondary — minor UI to show adaptive descriptions)
- `src/components/pipeline/Stage8/VisualStateEditorPanel.tsx` — Show adaptive vs master description
- `src/lib/services/sceneAssetService.ts` — May need method to trigger adaptive description generation

### Types
- `src/types/scene.ts` — `SceneAssetInstance` type may need `adaptiveDescription` field
