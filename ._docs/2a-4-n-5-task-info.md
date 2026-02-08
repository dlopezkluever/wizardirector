## Worktree: 2A.4n5 (WT-C)
Tasks: 2A.4 + 2A.5 — Stage 4 auto-gen + script UI
Key Files: Stage4MasterScript.tsx, scriptService.ts, ScreenplayToolbar.tsx, screenplay.css, tiptap-extensions/*
Why Independent: Stage 4 is self-contained; these two must share a worktree since both modify Stage4MasterScript.tsx

## Task Details:

#### 2A.4 — Stage 4 Auto-Generation Fix
**Ticket**: 4.3
**Priority**: HIGH

**Purpose**: Ensure Stage 4 auto-generates the master script on first visit.

**Problem/Context**: Stage 4 currently does not auto-generate when a user visits it for the first time. Users arrive at an empty stage with no script, which is confusing and blocks progression.

**Core Features:**
- [ ] Add auto-generation trigger on first visit to Stage 4
- [ ] Add fallback generation logic if auto-generation fails
- [ ] Detect whether a script already exists before triggering generation
- [ ] Show appropriate loading state during auto-generation

**Dependencies**: None.

## Info of tickets in organized-tickets.md:

### 4.3 — Stage 4 Needs Auto-Generation If Never Generated Before
Currently does not auto-generate on first visit.

---

#### 2A.5 — Stage 4 Script UI Fix
**Ticket**: 4.4
**Priority**: HIGH

**Purpose**: Fix the screenplay editor's broken character and dialogue formatting.

**Problem/Context**: The Stage 4 script UI has "very funky" character and dialogue formatting. The initial implementation clearly isn't working well. Characters and dialogue aren't rendering in proper screenplay format, making the script difficult to read and edit.

**Core Features:**
- [ ] Fix character name formatting in screenplay view
- [ ] Fix dialogue block formatting and indentation
- [ ] Improve screenplay toolbar functionality
- [ ] Ensure consistent screenplay formatting standards

**Dependencies**: None.


## Info of tickets in organized-tickets.md:

### 4.4 — Fix Stage 4 Script UI
Especially regarding Characters & Dialogue formatting — it's very funky currently. The initial solution clearly isn't working well.
