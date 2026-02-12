# WT-E: Shot-to-Shot Prompt Chaining (Stage 9)

**Wave**: 2 (parallel with WT-D and WT-F — after Wave 1 merges)
**Tasks**: 4C.5
**Scope**: Pipe prior shot context into subsequent prompts within a scene for action continuity
**Depends on**: WT-B (4C.1 — Structured Prompts) must be merged first

> **Note**: 4A.1 (Content Access Carousel) has already been built and merged. Stage9PromptSegmentation.tsx now includes the ContentAccessCarousel (replaces old RearviewMirror). Preserve it when modifying Stage 9.

---

## Task 4C.5 — Shot-to-Shot Prompt Chaining

**Ticket**: 9.5
**Priority**: MEDIUM

### Problem
For scenes with a lot of action and change, descriptions need to be dynamically connected. The first frame & video prompt should pipe context down to subsequent ones in the scene, creating continuity within a scene. Currently each shot's prompt is generated independently — there's no awareness of what happened in prior shots.

### Ticket 9.5 (from Tickets.md)
> For scenes with a lot of action and change, descriptions need to be dynamically connected — the first frame & video prompt should pipe context down to subsequent ones in the scene.

### Core Features
- [ ] **Extract key visual/narrative state from each shot's prompt**
  - After generating Shot 1's prompts, extract: character positions, actions completed, emotional state, visual changes
  - Create a compact "shot state summary" that captures the ending visual state
- [ ] **Auto-inject prior shot summary into next shot's prompt**
  - Shot 2's prompt generation receives Shot 1's state summary as additional context
  - Shot 3 receives Shot 2's summary (and optionally cumulative scene state)
  - This creates a chain: Shot 1 → Shot 2 → Shot 3 → ...
- [ ] **Maintain action continuity across shots**
  - If Shot 1 ends with character sitting down, Shot 2's frame prompt should start with character seated
  - If Shot 1 has a costume change, Shot 2 must reflect the new costume
- [ ] **User can view and edit the chained context**
  - Show the injected context in the Stage 9 UI (collapsible section per shot)
  - Allow manual editing of the chained context
- [ ] **Toggle chaining on/off per scene**
  - Some scenes may not need chaining (single static shot, etc.)
  - Default: ON for scenes with 2+ shots

### Implementation Approach
The chaining happens during `generateBulkPromptSets()` in `promptGenerationService.ts`:
1. Generate Shot 1 prompts normally (no prior context)
2. Extract a "shot end state" summary from Shot 1's prompts + shot data
3. Inject that summary into Shot 2's generation context
4. Repeat for Shot 3, 4, etc.
5. Store the chain context alongside each prompt for user review

This is sequential by nature — each shot depends on the previous. The bulk generation already processes shots sequentially, so the chaining fits naturally.

### UI Considerations
- Stage 9 UI should show a "Context from prior shot" collapsible section above each shot's prompts (except Shot 1)
- Visual indicator showing chain is active
- "Regenerate from this shot" option that re-chains from that point forward
- Toggle: "Chain prompts" ON/OFF per scene

### Dependencies
- **4C.1 (Structured Prompts)** — Must be merged first. Chaining depends on having structured prompt data to extract state from.

---

## Files At Play

### Backend (Primary)
- `backend/src/services/promptGenerationService.ts` — **PRIMARY FILE**: Modify `generateBulkPromptSets()` to implement chaining logic. Add `extractShotEndState()` helper. Modify `generatePromptSet()` to accept optional prior shot context.
- `backend/src/services/contextManager.ts` — May need a new method to format chained context for injection
- `backend/src/routes/projects.ts` — Stage 9 generate-prompts endpoint (may need to pass chain toggle parameter)

### Frontend
- `src/components/pipeline/Stage9PromptSegmentation.tsx` — Add chained context display, chain toggle, "regenerate from here" action. Note: now has ContentAccessCarousel integrated from 4A.1 — preserve it.
- `src/lib/services/promptService.ts` — May need to pass chain options in `generatePrompts()` call

### Types
- `src/types/scene.ts` — `PromptSet` interface may need a `chainedContext?: string` field
