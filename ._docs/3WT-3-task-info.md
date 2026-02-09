Worktree: WT-3
  Tasks (sequential within): 3C.5
  Files: Stage 1, frame/video services
  Rationale: 100% independent — touches zero files that overlap with WT-1 or WT-2
  Merge order: WT-3 first (lowest risk), then WT-2, then WT-1
  ────────────────────────────────────────

#### 3C.5 — Aspect Ratio System
**Ticket**: Multi-stage aspect ratio concern
**Priority**: MEDIUM

**Purpose**: Set aspect ratio at the project level and apply consistently downstream.

**Problem/Context**: Aspect ratios need to be set at some point in the pipeline and applied consistently to asset image generation, frame generation, and video generation. Without this, outputs may have mismatched dimensions.

**Core Features:**
- [ ] Add aspect ratio selection to Stage 1 project settings
- [ ] Options: 16:9, 9:16, 1:1, 4:3, 2.35:1 (cinematic) {NEEDS TO BE RESEARCHED ACTUALLY; TO SEE WHAT VEO3 & Sora all for}
- [ ] Apply to Stage 5 asset image generation
- [ ] Apply to Stage 10 frame generation
- [ ] Apply to Stage 11 video generation (Veo3 supports specific ratios)
- [ ] Display current aspect ratio in project header

**Dependencies**: None (Stage 1 change is independent).

---
 Task: 3C.5
  Depends On (Phase 3): None
  Primary Files: *Stage1InputMode.tsx, project.ts, ImageGenerationService.ts, frameGenerationService.ts, videoGenerationService.ts, projects table migration*

  Info from Tickets.md:
    
        ### Aspect Ratio for Generations (Stages 5, 10)
        Aspect ratios need to be set at some point in the pipeline and applied consistently to asset image generation, frame generation, and video generation.