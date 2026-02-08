## Worktree: 2A.6n7 (WT-E) 
Tasks: 2A.6 + 2A.7 — Skip option & 
Key Files: Stage1InputMode.tsx, Stage5Assets.tsx, ProjectView.tsx, inputProcessingService.ts
Why Independent: Both touch ProjectView.tsx so they must share, but they modify different functions (handleStageComplete routing). Isolated from everything else in Batch 1


## Task Details:

#### 2A.6 — Skip Option Fix
**Ticket**: 1.2
**Priority**: HIGH

**Purpose**: Verify the "Skip" option, hasn't be tested, User isn't sure it even works, and that perhaps it incorrectly feeds into Stage 2 instead of, allowing the users to upload thier Script and other work and jump ahead in the cycle instead.

**Problem/Context**: Currently, the skip option has not proven to actually do anything. It should allow a user who already has a script to skip directly to Stage 4 or beyond. The philosophy: take as much input context as given, refine it down to the Master Script as the source of truth, and from there expand out through the production cycle.

**Core Features:**
- [ ] Fix skip routing to bypass Stages 2-3 when user has a script (Put a pop up over these stages that say "SKIPPED")
- [ ] Allow direct navigation to Stage 4+ for power users
- [ ] Ensure skipped stages are properly marked (not "incomplete")
- [ ] Maintain context flow when stages are skipped

**Dependencies**: None.

More context; Trying the Stage1InputMode.tsx:164 gives the following 
Validation errors: ['Primary file content could not be read'] 0: "Primary file content could not be read"

When trying to upload the script. 

The desired functionality 

**Dependencies**: None.

--
