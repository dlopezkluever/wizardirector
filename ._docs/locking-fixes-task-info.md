

### 2B — Locking System Overhaul

**Context**: The current locking implementation is "extremely tedious, especially in the production cycle." Users shouldn't have to unlock → relock → get another warning just to navigate across stages. The locking system needs a complete overhaul, but full branching integration is deferred to Phase 5.

#### 2B.1 — Universal Lock/Unlock Button
**Ticket**: LK-2
**Priority**: HIGH

**Purpose**: Standardize the lock/unlock interaction across all stages.

**Problem/Context**: Currently there's no consistent lock/unlock button. Some stages have hidden locking, others have confusing interactions. "Locked" appears as a regular status flag alongside other statuses (ticket 8.1) when it should have different UI treatment.

**Core Features:**
- [ ] Create standard lock/unlock button in consistent position (top right or similar)
- [ ] Make the button consistent across all 12 stages
- [ ] Separate "locked" from regular status flags in the UI
- [ ] Clear visual indication of locked vs unlocked state
- [ ] One-click lock/unlock without warning loops

**Dependencies**: None.

**Note: This is something we need to truly discuss. 

(### LK-2 — Universal Lock/Unlock Button
There should be a standard lock/unlock button in the top right corner (or similar position) that's consistent across all stages. No more hidden or confusing locking interactions.)
---

#### 2B.2 — State Persistence for Completed Scenes
**Ticket**: LK-3
**Priority**: HIGH

**Purpose**: Stop the system from "forgetting" completed states when navigating between scenes.

**Problem/Context**: When navigating back to completed scenes, the system loses context about completed states. Users are forced to repeatedly unlock and relock shot lists to progress. This is especially painful in the production cycle where users move between scenes frequently.

**Core Features:**
- [ ] Ensure completed scene states persist across navigation
- [ ] Fix state storage/retrieval for production cycle scenes
- [ ] Prevent unnecessary re-locking of already-completed work
- [ ] Add proper scene state caching

**Dependencies**: None.

**Notes**: This issue is really only a major problem with the Production Cycle, im not sure it's relvant at all for stages 1-5. It's especially bad if you ever go from the script hub into stage 7. Like a user could have completed EVERYTHING for stages 7-11 of that scene, yet if they go back to the script hub, and then enter the scene's pipeline; they will have to "unlock and relock" stage 7, wait for some save to happen even though no edit was made, then do the same with stage 8, then 9, as all the graphics on the side (that are linked navigation) won't let you just click on stage 11. That is truely the source the frustration. 

(### LK-3 — State Persistence for Completed Scenes
When navigating back to completed scenes, the system "forgets" or loses context about completed states. Users are forced to repeatedly unlock and relock shot lists to progress. Completed states should persist.)

---

#### 2B.4 — Reduce Tedium in Production Cycle
**Ticket**: LK-1
**Priority**: HIGH

**Purpose**: Eliminate the unlock → relock → warning loop pattern.

**Problem/Context**: The current implementation requires tedious unlock → relock → warning cycles just to navigate across stages. "Whatever was done with Stage 7's locking sucks and must be fixed." Users waste significant time on locking bureaucracy instead of creative work.

**Core Features:**
- [ ] Remove unnecessary warning dialogs for routine navigation
- [ ] Allow stage-to-stage movement without full unlock/relock cycle
- [ ] Streamline production cycle (Stages 6-12) locking behavior
- [ ] Preserve data protection intent while removing friction

**Dependencies**: None.

(### LK-1 — Locking Is Too Tedious — Complete Overhaul Needed
The current locking implementation is extremely tedious, especially in the production cycle. Users shouldn't have to unlock → relock → get another warning just to navigate across stages. Whatever was done with Stage 7's locking "sucks and must be fixed.")
---

