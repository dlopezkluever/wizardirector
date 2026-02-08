## Worktree: 2A.B (WT-D)
Tasks: 2A.8 — Pipeline graphic colors
Key Files: PhaseTimeline.tsx, index.css, projects.ts (status calc)
Why Independent: Pure UI/CSS + one backend status calculation — no other task touches these

## Task Details:

#### 2A.8 — Stage Pipeline Graphic Color Inconsistency
**Ticket**: UI-5
**Priority**: MEDIUM

**Purpose**: Fix confusing color states in the pipeline progress graphic.

**Problem/Context**: Sometimes stages show green, other times yellow, despite being complete. Not clear what the colors indicate. Users can't tell at a glance where they are in the pipeline.

**Core Features:**
- [ ] Standardize green/yellow/other status color meanings
- [ ] Ensure accurate progress representation across all stages
- [ ] Debug status calculation logic
- [ ] Document color scheme for consistency

**Dependencies**: None.
