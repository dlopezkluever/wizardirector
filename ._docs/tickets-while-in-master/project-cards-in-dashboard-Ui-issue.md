# Project Cards in Dashboard UI Issue:

## Preface:

I tried to fix the metadata display for the project dashboard, but it got tedious and I figured better to focus on other stuff first. Do in Phase 6 of Master-mvp-tasklist.

Resume this session with:
claude --resume 42fcb2be-c2ff-4242-8a8b-19e35b3774e1

Details of my testing obvservations after it's most recent edits (the problems I still see): 
okay we are getting closer. A common edge case issue Im seeing is that, when the user is on Stage 5, and hasn't completed the stage 5 process and thus has yet to progress into Phase B (it correctly has  green dots for stages 1-4, yellow for stage 5) it will regardless say "Narrative & Style Set" and show on the right side: "Scene 1: Stage 7 
  0/# Scenes Complete" (where # is the number of scenes it has) when IT SHOULD ideally, say Stage 5 of 5. It does this, I assume, because when it checks for scenes exist, well it will find them, as scenes are created and stored at Stage 4. ... also the Project dashboard is not updating cards that are opened if they are in the production cycle, nor is the card metadate display on the right side showing the accurate progress of a project that is through the production cycle, as for one example, it states: "Scene 1: Stage 8 0/15 Scenes Complete" when 2 scenes have been completed, and i left off on a completely different scene and stage.

## Also consider having the left side just have the title of stage left on instead of the number out of numbers, like for example, say: "The Beat Sheet" instead of Stage 3 of 5, or "Asset Definition" instead of Stage 5 of 5 

---- Report -----

# Dashboard Project Cards — Phase B Progress Display

**Status**: Partially implemented, bugs remain — deferred to Phase 6 (6B.3)
**Related tickets**: 2A.8b (Stage Dashboard), UI-4 (Stage Info on Dashboard Cards)
**Date**: February 8, 2026

---

## Goal

Show production cycle (Phase B) progress on dashboard project cards so users can see at a glance which scene and stage they left off on, how many scenes are complete, and when the project was last touched.

---

## What Was Changed

### Files Modified

| File | Change |
|------|--------|
| `src/types/project.ts` | Added `SceneProgress` interface + optional field on `Project` |
| `backend/src/routes/projects.ts` | Rewrote stage query to use `active_branch_id` + version dedup; added scene progress batch query; fixed `updatedAt` to include latest scene activity |
| `src/components/dashboard/ProjectCard.tsx` | Removed percentage display; added conditional layout for Phase A vs production; uses `sceneProgress` existence as production signal |
| `src/components/pipeline/Stage6ScriptHub.tsx` | Renamed "Phase A" button to "Narrative & Style Engine" |

### Backend Changes (GET `/api/projects`)

1. **Fixed stage data source mismatch**: The old query filtered `stage_states` by `branches.is_main = true` with no version deduplication. The pipeline graphic uses `active_branch_id` with latest-version-per-stage dedup. Cards now use the same approach — query by `active_branch_id`, order by `version DESC`, keep only the latest version per stage number.

2. **Removed "all 5 locked" gate for scene progress**: Originally, scene progress was only fetched for projects where all 5 stages had `status = 'locked'`. This fails when stages are `outdated` (which happens when upstream stages are re-edited). Now scenes are fetched for ALL projects with an `active_branch_id`.

3. **Fixed stale `updatedAt`**: `projects.updated_at` only tracks project-level edits (title, settings, stage state saves). Scene/shot edits don't touch it. Now the response uses `MAX(project.updated_at, latest scene.updated_at)` so the card timestamp reflects production work.

### Frontend Changes (ProjectCard.tsx)

- Replaced `phaseAComplete` (all 5 stages locked) with `inProduction` (sceneProgress exists with totalScenes > 0)
- When `inProduction`: left shows "Narrative & Style Set" + actual stage dots; right shows "Scene X: Stage Y" and "N/M Scenes Complete"
- When not in production: shows "Stage X of 5" + dots (no percentage)
- Dots reflect real status (green=locked, orange=outdated, yellow=active) instead of forcing all green

---

## Bugs That Persist

### Bug 1: False positive production detection for Stage 5 projects

**Symptom**: A project still working through Stage 5 (not yet in production) shows "Narrative & Style Set" with "Scene 1: Stage 7 / 0/N Scenes Complete" on the right side.

**Root cause**: Scenes are created and stored in the database at Stage 4 (script extraction). So when the code checks "do scenes exist?", it finds them even though the user hasn't entered the production cycle yet. The `inProduction` signal fires too early.

**Fix needed**: The production detection needs a more precise signal. Options:
- **Check if Stage 5 is locked (any version)**: Instead of checking current status of all 5, check specifically if stage 5 has ever had a `locked` version. Stage 5 being locked is the true gate into production. Query: `stage_states WHERE stage_number = 5 AND status = 'locked'` (any version). This survives stages going `outdated` but doesn't false-positive on Stage 4/5 projects.
- **Check if Stage 6 has been reached**: A `stage_states` record for stage 6+ exists, OR any scene has status beyond `draft` (e.g., `shot_list_ready`).
- **Add a project-level flag**: `entered_production_at` timestamp on the projects table, set once when stage 5 is first locked. Most reliable but requires a migration.

**Recommended approach**: Check if stage 5 has ever been locked. In the backend, the current dedup only keeps the latest version — need to either query without dedup for stage 5 specifically, or add a separate check.

### Bug 2: Scene progress data is inaccurate

**Symptom**: Card shows "Scene 1: Stage 8 / 0/15 Scenes Complete" when the user has completed 2 scenes and is working on a different scene at a different stage.

**Root cause (likely)**: Multiple possible issues:

1. **Scene `status` field not being updated**: When scenes progress through stages (shots extracted, shot list locked, frames generated, video rendered), the `scenes.status` column may not be getting updated consistently. The status-to-stage mapping relies on `scenes.status` being one of: `draft`, `shot_list_ready`, `frames_locked`, `video_complete`. If the status stays at `draft` even after work is done, the count is wrong.

2. **"Current scene" logic is too simple**: The code picks `firstIncomplete` (lowest scene_number where status != `video_complete`). This doesn't reflect where the user actually left off — they may be working on Scene 8 while Scene 1 is still in progress.

3. **`scenes.updated_at` not being touched by all operations**: Shot edits, prompt generation, frame locking, and video rendering may not update `scenes.updated_at`, so the "latest activity" timestamp is stale.

**Debug steps**:
1. Query the database directly to see what `scenes.status` values actually are for a known project:
   ```sql
   SELECT scene_number, status, updated_at
   FROM scenes
   WHERE branch_id = '<active_branch_id>'
   ORDER BY scene_number;
   ```
2. Check which backend endpoints update `scenes.status` — search for `.update.*status` on the `scenes` table. The shot lock endpoint (`POST /shots/lock`) sets `shot_list_locked_at` which may trigger a DB trigger to set status to `shot_list_ready`, but verify this actually fires.
3. Check if `scenes.updated_at` is touched by shot/prompt/frame/video endpoints.

**Fix needed**:
- Audit all Phase B endpoints to ensure they update `scenes.status` and `scenes.updated_at` at each transition
- Consider tracking "last worked on" at the project level (e.g., a `last_active_scene_id` column) for accurate "where did I leave off" display
- Or: instead of relying on `scenes.status`, derive progress from the existence of downstream artifacts (shots exist = stage 7+, frames exist = stage 11+, videos exist = stage 12)

### Bug 3: `updatedAt` still stale for some operations

**Symptom**: Card timestamp doesn't update after working inside production stages.

**Root cause**: The fix includes `MAX(scenes.updated_at)` in the response, but many Phase B operations don't update `scenes.updated_at` either. Only scene creation and a few explicit updates touch it. Shot edits, prompt generation, frame generation, and video rendering operate on child tables (`shots`, `frames`, `videos`) without propagating timestamps up to the parent `scenes` row.

**Fix needed**: Either:
- Add `scenes.updated_at` updates to all Phase B endpoints that modify a scene's child data
- Or query `MAX(shots.updated_at, frames.updated_at, videos.updated_at)` — more accurate but heavier query
- Or add a DB trigger: `AFTER INSERT OR UPDATE ON shots/frames/videos → UPDATE scenes SET updated_at = NOW() WHERE id = NEW.scene_id`

---

## Architecture Notes for Future Reference

### Data Sources — Two Parallel Paths

The dashboard cards and the in-project pipeline graphic get stage data from **different endpoints**:

| | Dashboard Cards | Pipeline Graphic |
|---|---|---|
| **Endpoint** | `GET /api/projects` | `GET /api/projects/:id/stages` |
| **Hook** | None (direct fetch via `projectService.listProjects()`) | `useProjectStageStates(projectId)` |
| **Branch filter** | `active_branch_id` (fixed Feb 2026) | `active_branch_id` |
| **Version dedup** | Latest per stage (fixed Feb 2026) | Latest per stage |
| **Scene data** | Batch query on `scenes` table | Not included |

Any future changes to stage status logic need to be applied to BOTH paths or they'll diverge again.

### Scene Status Lifecycle

The expected status flow for scenes is:
```
draft → shot_list_ready → frames_locked → video_complete
```

The status-to-stage mapping used in the card:
```
draft           → Stage 7  (Shot List)
shot_list_ready → Stage 8  (Scene Assets / Visuals)
frames_locked   → Stage 11 (Frames)
video_complete  → Stage 12 (Video / Done)
```

Edge statuses: `outdated`, `continuity_broken` — displayed as text labels instead of stage numbers.

### Key Files

- **Backend card data**: `backend/src/routes/projects.ts` — GET `/` handler (lines 13-217)
- **Backend stage data**: `backend/src/routes/stageStates.ts` — GET `/:projectId/stages` (lines 7-58)
- **Frontend card**: `src/components/dashboard/ProjectCard.tsx`
- **Frontend type**: `src/types/project.ts` — `SceneProgress` interface
- **Pipeline graphic**: `src/components/pipeline/PhaseTimeline.tsx`
- **Stage state hook**: `src/lib/hooks/useStageState.ts` — `useProjectStageStates()`

---

## Recommended Plan for Phase 6B.3

1. **Fix production detection** — check if stage 5 has a `locked` version (not current status, but any version). This is the true "entered production" gate.
2. **Audit `scenes.status` updates** — trace every Phase B endpoint and verify it transitions `scenes.status` correctly. Add a DB trigger if needed.
3. **Track "last active scene"** — add `last_active_scene_id` + `last_active_stage` to the projects table, updated whenever the user enters a scene view. This gives accurate "where did I leave off" without complex queries.
4. **Fix timestamp propagation** — add a DB trigger on `shots`/`frames`/`videos` to cascade `updated_at` up to `scenes`, so the card timestamp always reflects the latest activity.
5. **Consider a dedicated dashboard summary table** — if query complexity grows, a materialized `project_dashboard_summary` view or denormalized columns could simplify the card data fetch.


Original Task:
#### 2A.8b - Stage Dashboard 

**Purpose**: Fix cards of projects on the projects/home dashboard to showcase what stage the user is in, correctly.

**Problem/Context**: Right now there is no way of knowing at what stage a project is in on if in the production cycle from the dashboard view. 

**Core Features:**
- [ ] Find way to showcase Projects that are on Phase B (Production cycle), by show how far they are along the Production cycle; for example: have all the dots green for Phase 5, the have maybe an arrow that point to text in the format: "Scene #: Stage #" OR
- [ ] For Example: "Scene 3: Stage 9"
- [ ] Ensure accurate progress representation across all stages

**Dependencies**: None.

Original Plan:
│                                                                                                                                 ││ Plan: Fix Dashboard Project Cards — Phase B Progress Display                                                                    ││                                                                                                                                 ││ Context                                                                                                                         ││                                                                                                                                 ││ Dashboard project cards currently show "Stage X of 5" with a percentage and colored dots, but this only covers Phase A (stages  ││ 1-5). There's no way to see Phase B (production/scene) progress from the dashboard. Additionally, the percentage calculation is ││  unclear and not useful. This plan fixes the card UI to clearly show both Phase A completion and Phase B scene progress,        ││ removes the percentage, and renames "Phase A" to "Narrative & Style Engine" in the Script Hub.                                  ││                                                                                                                                 ││ Card Layout Design                                                                                                              ││                                                                                                                                 ││ Phase A in progress (stages 1-4 not all locked):                                                                                ││ - Left: Stage X of 5 + colored dots (unchanged)                                                                                 ││ - Right: blank (percentage removed)                                                                                             ││                                                                                                                                 ││ Phase A complete (all 5 stages locked):                                                                                         ││ - Left: Narrative & Style Set + 5 green dots                                                                                    ││ - Right top: Scene 3: Stage 8 (current working scene)                                                                           ││ - Right bottom: 3/8 Scenes Complete                                                                                             ││                                                                                                                                 ││ All scenes done / no scenes yet:                                                                                                ││ - Left: Narrative & Style Set + 5 green dots                                                                                    ││ - Right: 8/8 Scenes Complete (or blank if 0 scenes)                                                                             ││                                                                                                                                 ││ ---                                                                                                                             ││ Changes                                                                                                                         ││                                                                                                                                 ││ 1. Add SceneProgress type — src/types/project.ts                                                                                ││                                                                                                                                 ││ - Add interface:                                                                                                                ││ export interface SceneProgress {                                                                                                ││   totalScenes: number;                                                                                                          ││   completedScenes: number;                                                                                                      ││   currentSceneNumber: number | null;                                                                                            ││   currentSceneStage: number | null;                                                                                             ││   currentSceneStatus: string | null;                                                                                            ││ }                                                                                                                               ││ - Add optional field to Project: sceneProgress?: SceneProgress                                                                  ││                                                                                                                                 ││ 2. Backend: augment GET /api/projects — backend/src/routes/projects.ts                                                          ││                                                                                                                                 ││ After the existing projectStages map is built (~line 76), add:                                                                  ││                                                                                                                                 ││ 1. Identify Phase A-complete projects: Check which projects have stages 1-5 all locked                                          ││ 2. Batch-fetch scenes: Single query — scenes table filtered by branch_id IN (active_branch_ids), ordered by scene_number ASC    ││ 3. Compute summary per project:                                                                                                 ││   - totalScenes: count of scenes                                                                                                ││   - completedScenes: count where status = 'video_complete'                                                                      ││   - currentSceneNumber: lowest scene_number not video_complete                                                                  ││   - currentSceneStage: mapped from status (draft→7, shot_list_ready→8, frames_locked→11, video_complete→12)                     ││   - currentSceneStatus: raw status string (for outdated/continuity_broken display)                                              ││ 4. Attach sceneProgress to the transformed project object via spread                                                            ││                                                                                                                                 ││ Key detail: active_branch_id is already selected on each project (line 31), so we can map project → branch directly.            ││                                                                                                                                 ││ 3. Rewrite ProjectCard progress section — src/components/dashboard/ProjectCard.tsx                                              ││                                                                                                                                 ││ - Remove: progressPercentage calculation (lines 36-37) and the {Math.round(progressPercentage)}% span (line 124)                ││ - Add: const phaseAComplete = project.stages.length === 5 && project.stages.every(s => s.status === 'locked')                   ││ - Replace lines 121-131 with conditional rendering:                                                                             ││   - !phaseAComplete: Left shows "Stage X of 5" + dots. Right is empty.                                                          ││   - phaseAComplete: Left shows "Narrative & Style Set" + 5 green dots. Right shows scene info (two lines, right-aligned).       ││   - Handle edge cases: 0 scenes (blank right), all scenes complete (only "X/X Scenes Complete"), outdated/continuity_broken     ││ (show status text instead of stage number).                                                                                     ││                                                                                                                                 ││ 4. Rename button text — src/components/pipeline/Stage6ScriptHub.tsx                                                             ││                                                                                                                                 ││ - Line 342: Change Phase A → Narrative & Style Engine                                                                           ││ - Keep ArrowUp icon and all other button props unchanged                                                                        ││                                                                                                                                 ││ ---                                                                                                                             ││ Files Modified                                                                                                                  ││ ┌─────────────────────────────────────────────┬─────────────────────────────────────────────────────────┐                       ││ │                    File                     │                         Change                          │                       ││ ├─────────────────────────────────────────────┼─────────────────────────────────────────────────────────┤                       ││ │ src/types/project.ts                        │ Add SceneProgress interface + optional field on Project │                       ││ ├─────────────────────────────────────────────┼─────────────────────────────────────────────────────────┤                       ││ │ backend/src/routes/projects.ts              │ Add scene progress batch query in GET /api/projects     │                       ││ ├─────────────────────────────────────────────┼─────────────────────────────────────────────────────────┤                       ││ │ src/components/dashboard/ProjectCard.tsx    │ Rewrite progress section, remove percentage             │                       ││ ├─────────────────────────────────────────────┼─────────────────────────────────────────────────────────┤                       ││ │ src/components/pipeline/Stage6ScriptHub.tsx │ Rename "Phase A" → "Narrative & Style Engine"           │                       ││ └─────────────────────────────────────────────┴─────────────────────────────────────────────────────────┘                       ││ Verification                                                                                                                    ││                                                                                                                                 ││ 1. npm run lint on modified frontend files                                                                                      ││ 2. Start dev server (npm run dev) + backend, open dashboard                                                                     ││ 3. Check card for project still in Phase A (stages 1-4): should show "Stage X of 5", dots, no percentage, right side blank      ││ 4. Check card for project with Phase A complete: should show "Narrative & Style Set", 5 green dots, scene progress on right     ││ 5. Open a project → Stage 6 Script Hub → verify button says "Narrative & Style Engine" with ArrowUp icon                        │╰─────────────────────────────────────────────────────────────────────────────────────────────────────────────────