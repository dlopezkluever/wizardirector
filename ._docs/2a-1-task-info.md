## Worktree: 2A.1 (WT-A)
Tasks: 2A.1 — Stage 8 asset influence + capsule balance
Key Files: ImageGenerationService.ts, sceneAssets.ts, promptGenerationService.ts, Stage 8 components
Why Independent: Backend image gen pipeline is untouched by everything else

## Task Details:

#### 2A.1 — Stage 8 Master Asset Influence Bug Fix + Fix Default Capsule Balance
**Tickets**: 8.2, DC-3, 5.7
**Priority**: CRITICAL

**Purpose**: Resolve the issue where scene instance images ignore master asset references entirely, and visual style capsules dominate generation output.

**Problem/Context**: Scene instance generation in Stage 8 is currently uninfluenced by master asset images. The visual style capsule overrides everything, breaking visual consistency. Additionally, visual capsules appear to have no effect on asset image generation in Stage 5 (ticket 5.7) — the influence is either zero or all-or-nothing with no proper balance. The inheritance chain from Stage 5 → Stage 8 → Stage 9 → Stage 10 is broken somewhere (DC-3).

**Core Features:**
- [ ] Debug why master asset images aren't influencing scene instance generation
- [ ] Rebalance so master reference takes highest priority over style capsule
- [ ] Ensure visual style capsules influence but don't override master references
- [ ] Investigate and fix capsule influence on Stage 5 image generation (ticket 5.7)
- [ ] Test generation with proper asset + style injection across asset types (characters, props, locations)
- [ ] Validate fix with controlled test cases comparing old vs new generation

**Technical Notes**: The root cause is likely in how image generation prompts are assembled — master asset reference URLs may not be passed correctly, or capsule style text may be weighted too heavily in the prompt. Check both the frontend service call and backend prompt assembly.

**Dependencies**: None — can start immediately.

## Info of tickets in organized-tickets.md:

### 8.2 — Master Asset Image Not Influencing Scene Instance Image
The master reference is not being taken into consideration at all for scene instance image generation. Instead, the visual style capsule is dominating the influence. Need to rebalance so master reference takes highest priority.

### DC-3 — Asset Inheritance Failure in Production Pipeline
Final generations (Stage 10) do not reflect the influence of master assets. The context/inheritance chain from Stage 5 → Stage 8 → Stage 9 → Stage 10 is broken somewhere. Visual style capsule seems to override everything.

### 5.7 — Visual Capsules Don't Seem to Influence Image Generation
Needs investigation — visual style capsules appear to have no effect on asset image generation in Stage 5.