## Worktree: 2A.6n7 (WT-E)
Tasks: 2A.6 + 2A.7 — Skip option + Stage 5 lock button
Key Files: Stage1InputMode.tsx, Stage5Assets.tsx, ProjectView.tsx, inputProcessingService.ts
Why Independent: Both touch ProjectView.tsx so they must share, but they modify different functions (handleStageComplete routing). Isolated from everything else in Batch 1


## Task Details:

#### 2A.6 — Skip Option Fix
**Ticket**: 1.2
**Priority**: HIGH

**Purpose**: Fix the "Skip" option that incorrectly feeds into Stage 2 instead of allowing users to jump ahead.

**Problem/Context**: Currently, the skip option incorrectly feeds into Stage 2. It should allow a user who already has a script to skip directly to Stage 4 or beyond. The philosophy: take as much input context as given, refine it down to the Master Script as the source of truth, and from there expand out through the production cycle.

**Core Features:**
- [ ] Fix skip routing to bypass Stages 2-3 when user has a script
- [ ] Allow direct navigation to Stage 4+ for power users
- [ ] Ensure skipped stages are properly marked (not "incomplete")
- [ ] Maintain context flow when stages are skipped

**Dependencies**: None.

---

#### 2A.7 — Stage 5 "Lock All and Proceed" Button Fix
**Ticket**: 5.10
**Priority**: HIGH

**Purpose**: Fix the hidden/broken "Lock All Assets and Proceed" button.

**Problem/Context**: Button is hidden due to poor color contrast between text and footer. Clicking it triggers a "stage 5 complete" toast but fails to actually navigate to Stage 6. Users cannot progress past Stage 5 using this button.

**Core Features:**
- [ ] Fix button visibility (color contrast issue)
- [ ] Fix navigation action to properly transition to Stage 6
- [ ] Ensure all assets are properly locked when button is clicked
- [ ] Add proper loading/transition state

**Dependencies**: None.
