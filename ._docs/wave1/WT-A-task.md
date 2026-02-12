# WT-A: Stage 6 & 7 UI Improvements

**Wave**: 1 (parallel with WT-B and WT-C)
**Tasks**: 4B.1 + 4B.2 + 4B.3 + 4B.5
**Scope**: Script Hub overflow, scene header formatting, scene deferral, merge toggle fix

> **Note**: 4A.1 (Content Access Carousel) has already been built and merged. `RearviewMirror.tsx` has been replaced by `ContentAccessCarousel.tsx` across all stages 6-12. Stage6ScriptHub.tsx and Stage7ShotList.tsx now include the ContentAccessCarousel. Be aware of this when modifying these files.

---

## Task 4B.1 — Script Hub UI Overflow Fix

**Ticket**: 6.1
**Priority**: HIGH

### Problem
Scene cards overrun out of the container box. Headers are too long for the available space. The Script Hub section needs to handle varying content lengths gracefully.

### Ticket 6.1 (from Tickets.md)
> Scene cards overrun out of the container box. Headers are too long for the available space. Consider making the Script Hub section horizontally extendable, with dynamic text truncation based on width (e.g., full: `ext-launchpad-day-6` → compressed: `ext-launchpad..` → more compressed: `ext-lau..`). The tab container should also be scrollable.

### Core Features
- [ ] Make Script Hub section horizontally extendable
- [ ] Dynamic text truncation based on width (full → compressed → more compressed)
  - Example: `ext-launchpad-day-6` → `ext-launchpad..` → `ext-lau..`
- [ ] Scrollable tab container
- [ ] Responsive card sizing

### Dependencies
None.

---

## Task 4B.2 — Scene Header Formatting Fix

**Ticket**: 6.2
**Priority**: MEDIUM

### Problem
Titles use the encoded format (e.g., `EXT-LOC-DAY-1`) instead of nice-looking headers following traditional script formatting (e.g., `Exterior [Location] Day`). The encoded format should be the subheading, not the title.

### Ticket 6.2 (from Tickets.md)
> Titles should NOT use the encoded format (e.g., `EXT-LOC-DAY-1`). Instead, use nice-looking headers following traditional script formatting (e.g., `Exterior [Location] Day`) with the scene number in front. The encoded format should be the subheading, not the title.

### Core Features
- [ ] Parse encoded scene headers into human-readable format
  - `EXT` → `Exterior`, `INT` → `Interior`, `EXT/INT` → `Exterior/Interior`
  - Location slug → proper cased name
  - Time of day: `DAY` → `Day`, `NIGHT` → `Night`, `DAWN` → `Dawn`, etc.
- [ ] Scene number in front of the formatted header
- [ ] Encoded format as smaller subheading
- [ ] Apply across all stages that display scene headers (Stage 6 primarily, but verify 7-12 as well)

### Dependencies
None.

---

## Task 4B.3 — Scene Deferral/Sidelining

**Tickets**: 6.3, 7.3
**Priority**: MEDIUM

### Problem
Users may want to skip certain scenes temporarily. Currently there's no way to defer a scene. Additionally, when a user tries to delete the final/only shot in a scene, it should offer to defer the scene instead of blocking deletion.

### Ticket 6.3 (from Tickets.md)
> A scene can be greyed out in the Script Hub and ignored (as if deleted, but not actually deleted — just "sidelined/deferred"). When a user tries to delete the final/only shot in a scene, show a warning: "You CANNOT delete the last shot. However, would you like to defer/sideline this scene and return to the Script Hub?"

### Ticket 7.3 (from Tickets.md)
> When a user tries to delete the last remaining shot in a scene, show a warning message and offer to defer/sideline the scene and return to the Script Hub instead.

### Core Features
- [ ] "Defer/Sideline Scene" action in Script Hub
- [ ] Greyed-out visual state for deferred scenes
- [ ] Scene data preserved (not deleted)
- [ ] "Restore Scene" action to bring it back
- [ ] When deleting final shot in Stage 7: warning + offer to defer scene instead
- [ ] Deferred scenes skipped in batch operations (e.g., batch render)

### Implementation Notes
- Will likely need a new `is_deferred` boolean column on the `scenes` table (or a new scene status value)
- Backend route needed: `PUT /api/projects/:id/scenes/:sceneId/defer` and `/restore`
- Stage 6 Script Hub sidebar must visually distinguish deferred scenes
- Stage 7 shot deletion logic must check if it's the last shot and offer deferral

### Dependencies
None.

---

## Task 4B.5 — Edit Merge Toggle Improvement

**Ticket**: 7.2
**Priority**: LOW

### Problem
The next/previous toggle for merging shots is not obvious enough. Users may not realize they can merge with the previous shot instead of the next one.

### Ticket 7.2 (from Tickets.md)
> The next/previous toggle for merging shots is not obvious enough. The merge modal should house the toggle at the top: `"Merge with: Next (preselected) | Previous"`, then show the rest of the modal contents underneath.

### Core Features
- [ ] Move toggle to top of merge modal: `"Merge with: Next (preselected) | Previous"`
- [ ] Show rest of modal contents underneath
- [ ] Clear visual distinction between next/previous merge direction

### Dependencies
None.

---

## Appendix: 4B.6 — "Extend Shot" Feature Consideration (Research Only)

**Ticket**: 7.4
**Priority**: LOW

> Worth considering compatibility with Veo 3 and Sora's "extend" capabilities for shots.

This is a **research task only** — no code changes expected. Investigate:
- [ ] Veo3 extend API capabilities (does the API support extending a generated video?)
- [ ] Design notes for "Extend Shot" UI if API supports it
- [ ] How this would integrate with cost tracking

---

## Files At Play

### Frontend Components
- `src/components/pipeline/Stage6ScriptHub.tsx` — Primary file for 4B.1, 4B.2, 4B.3 (now includes ContentAccessCarousel integration from 4A.1)
- `src/components/pipeline/Stage7ShotList.tsx` — Primary file for 4B.5, also 4B.3 (last-shot deletion warning). Note: RearviewMirror was replaced by ContentAccessCarousel here.
- `src/components/pipeline/ContentAccessCarousel.tsx` — Already integrated (4A.1 complete). Do NOT modify this file unless absolutely necessary for header formatting (4B.2).

### Frontend Services
- `src/lib/services/sceneService.ts` — Scene fetching (may need defer/restore methods)
- `src/lib/services/shotService.ts` — Shot deletion logic (4B.3 last-shot check)
- `src/lib/services/checkoutService.ts` — Batch render status (4B.3 skip deferred)

### Frontend Types
- `src/types/scene.ts` — Scene type (may need `isDeferred` field), SceneStatus type

### Backend
- `backend/src/routes/projects.ts` — Scene-related endpoints (defer/restore routes for 4B.3)

### Shared/Cross-Stage (4B.2 scene header formatting)
- Any component that renders scene headers — verify in Stage 7, 8, 9, 10, 12 components
- `src/components/pipeline/LockedStageHeader.tsx` — May display scene header info
