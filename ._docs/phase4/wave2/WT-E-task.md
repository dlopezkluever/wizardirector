# WT-E: Shot-to-Shot Prompt Chaining (Stage 9)

**Wave**: 2 (parallel with WT-D and WT-F — after Wave 1 merges)
**Tasks**: 4C.5
**Scope**: Pipe prior shot context into subsequent prompts within a scene for action continuity
**Depends on**: WT-B (4C.1 — Structured Prompts) must be merged first

> **Note**: 4A.1 (Content Access Carousel) has already been built and merged. Stage9PromptSegmentation.tsx now includes the ContentAccessCarousel (replaces old RearviewMirror). Preserve it when modifying Stage 9.

> **UPDATE (Feb 2026)**: The **Transformation Event System** has been implemented (see `Transformation-Event-System-Plan.md` and `Transformation-Event-System-Dev-Summary.md`). This significantly changes the integration surface for WT-E:
> - `generateBulkPromptSets()` now takes a 4th param `transformationEvents?: TransformationEvent[]` and resolves per-shot overrides
> - `generatePromptSet()` now takes a 4th param `shotOverrides?: ShotAssetOverride[]`
> - `PromptSet` type now has `transformationContext?: PromptSetTransformationContext[]`
> - Stage 9 UI already has transformation state badges (Pre-Transform / Transforming / Post-Transform)
> - **Critical**: WT-E's chaining logic must consume `resolveOverridesForShot()` from `transformationEventService` so that chained "shot end state" summaries include post-transformation descriptions when a transformation occurred.

---

## Task 4C.5 — Shot-to-Shot Prompt Chaining

**Ticket**: 9.5
**Priority**: MEDIUM

### Problem
For scenes with a lot of action and change, descriptions need to be dynamically connected. The first frame & video prompt should pipe context down to subsequent ones in the scene, creating continuity within a scene. Currently each shot's prompt is generated independently — there's no awareness of what happened in prior shots.

### Ticket 9.5 (from Tickets.md)
> For scenes with a lot of action and change, descriptions need to be dynamically connected — the first frame & video prompt should pipe context down to subsequent ones in the scene. Think staging, blocking, and things for visual continuity across shots / scenes in progression and changing camera angles, etc.

*This will likely mean we need to, make the frame prompts be much more precise about framing and like physcial placement of misc en scene in shot, and make sure to keep continuity throught scene, unless explicitly asked to be changed.* 


### Core Features
- [ ] **Extract key visual/narrative state from each shot's prompt**
  - After generating Shot 1's prompts, extract: character positions, actions completed, emotional state, visual changes
  - Create a compact "shot state summary" that captures the ending visual state
  - **New**: Must use `resolveOverridesForShot()` from `transformationEventService` to determine the correct asset descriptions at each shot. If a transformation occurred at Shot 1, the "shot end state" must include: "Character X has now transformed to [post_description]"
- [ ] **Auto-inject prior shot summary into next shot's prompt**
  - Shot 2's prompt generation receives Shot 1's state summary as additional context
  - Shot 3 receives Shot 2's summary (and optionally cumulative scene state)
  - This creates a chain: Shot 1 → Shot 2 → Shot 3 → ...
- [ ] **Maintain action continuity across shots**
  - If Shot 1 ends with character sitting down, Shot 2's frame prompt should start with character seated
  - If Shot 1 has a costume change, Shot 2 must reflect the new costume
  - **New**: Transformation events already handle description swaps per-shot (via `ShotAssetOverride[]`). Chaining should carry the *action/position* state, not re-derive appearance — `resolveOverridesForShot()` handles that.
- [ ] **User can view and edit the chained context**
  - Show the injected context in the Stage 9 UI (collapsible section per shot)
  - Allow manual editing of the chained context
- [ ] **Toggle chaining on/off per scene**
  - Some scenes may not need chaining (single static shot, etc.)
  - Default: ON for scenes with 2+ shots

### Implementation Approach (Updated)

> **Key change**: `generateBulkPromptSets()` now has a 4th parameter `transformationEvents?: TransformationEvent[]` and calls `resolveOverridesForShot()` to resolve per-shot asset description overrides. The chaining logic must integrate with (not replace) this existing per-shot override resolution.

The chaining happens during `generateBulkPromptSets()` in `promptGenerationService.ts`:
1. Resolve transformation overrides for all shots first (existing code already does this)
2. Generate Shot 1 prompts using resolved overrides (no prior chain context)
3. Extract a "shot end state" summary from Shot 1's prompts + shot data + resolved overrides
   - **Critical**: If a transformation event applied to Shot 1, the end state must reflect the post-transformation description, not the original `effective_description`
4. Inject that summary into Shot 2's generation context (alongside any transformation overrides for Shot 2)
5. Repeat for Shot 3, 4, etc.
6. Store the chain context alongside each prompt for user review

This is sequential by nature — each shot depends on the previous. The bulk generation already processes shots sequentially, so the chaining fits naturally.

**Integration with transformation overrides**: The `generatePromptSet()` method now accepts `shotOverrides?: ShotAssetOverride[]`. The chaining context should complement these overrides: overrides handle *which description* to use, chaining handles *action/position/state continuity* between shots.

### UI Considerations
- Stage 9 UI should show a "Context from prior shot" collapsible section above each shot's prompts (except Shot 1)
- Visual indicator showing chain is active
- "Regenerate from this shot" option that re-chains from that point forward
- Toggle: "Chain prompts" ON/OFF per scene

---

## Files At Play

### Backend (Primary)
- `backend/src/services/promptGenerationService.ts` — **PRIMARY FILE**: Modify `generateBulkPromptSets()` to implement chaining logic. Add `extractShotEndState()` helper. **Current signatures (updated by Transformation Event System)**:
  - `generateBulkPromptSets(shots, sceneAssets, styleCapsule?, transformationEvents?)` — already resolves per-shot `ShotAssetOverride[]` from transformation events; chaining must integrate after this resolution
  - `generatePromptSet(shot, sceneAssets, styleCapsule?, shotOverrides?)` — already accepts `ShotAssetOverride[]`; add prior shot context parameter
  - `buildAssetContext(assets, shotOverrides?)` — already swaps descriptions for overridden assets
  - `generateVideoPrompt(shot, framePrompt, transformingAssets?, allSceneAssets?)` — injects transformation narrative for `within_shot` events
  - `generateEndFramePrompt(shot, startFramePrompt, sceneAssets, styleCapsule?, shotOverrides?)` — uses post-transformation descriptions
- `backend/src/services/transformationEventService.ts` — **NEW (from Transformation Event System)**: Provides `resolveOverridesForShot()` which WT-E's `extractShotEndState()` must consume to determine the correct post-shot asset state
- `backend/src/services/contextManager.ts` — May need a new method to format chained context for injection
- `backend/src/routes/projects.ts` — Stage 9 generate-prompts endpoint. **Already modified** to fetch confirmed `transformation_events` and pass to `generateBulkPromptSets()`. May need to pass chain toggle parameter.

### Frontend
- `src/components/pipeline/Stage9PromptSegmentation.tsx` — Add chained context display, chain toggle, "regenerate from here" action. **Already modified** by Transformation Event System: has transformation state badges (Pre-Transform / Transforming / Post-Transform) at lines 465-481. Chaining UI should coexist with these badges. Note: also has ContentAccessCarousel from 4A.1 — preserve both.
- `src/lib/services/promptService.ts` — May need to pass chain options in `generatePrompts()` call

### Types
- `src/types/scene.ts` — `PromptSet` interface already has `transformationContext?: PromptSetTransformationContext[]` (from Transformation Event System). Add `chainedContext?: string` field alongside it. `Shot` interface already has `transformationFlags?: TransformationFlag[]`.


