╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌ Locking System Overhaul — Implementation Plan

 Context

 The current locking system has three major pain points:
 1. No consistent lock/unlock UI — some stages have hidden locking, Stage 7 has a banner+footer, Stages 8-12 have none
 2. State loss on navigation — handleEnterScene() in ProjectView.tsx:441 resets completedSceneStages to [] and forces Stage 7      
 every time, requiring unlock/relock through every completed stage
 3. Tedious dialog chains — Stage 7 has a 3-dialog unlock cascade (unlock confirm → validation modal → force lock confirm)

 This overhaul standardizes lock/unlock across all 12 stages, adds scene-level stage locking for stages 8-12, enables free
 read-only browsing of completed stages, and auto-resumes at the latest incomplete stage.

 Design Decisions (Confirmed with User)

 - Unlock & Edit: Shows single warning about downstream impact, then invalidates on confirm
 - Downstream cascade: Mark as "outdated" (retain data), not full delete
 - Free navigation: All completed stages freely viewable in read-only mode
 - Auto-resume: Enter scene → land at latest incomplete stage, skip completed ones
 - Lock all stages 7-12: Every production stage gets lock/unlock
 - Header standardization: Replace action buttons with [LOCKED-IN] [Unlock & Edit] [Next] when locked
 - Move nav to top: Production stages move Back/Next to top header, remove footer nav
 - Proceed = Lock: "Lock & Proceed" button combines save+lock+advance
 - Next behavior: Sequential (always N+1)
 - Stage 6: Keep as-is (hub, no locking)
 - Text readability: NO greying out content. Selectable but not editable when locked. Only disable toolbar buttons.

 ---
 Wave 1: Backend Foundation

 1.1 Add stage_locks JSONB column to scenes table

 Manual Supabase migration (user applies via SQL editor):
 ALTER TABLE scenes ADD COLUMN stage_locks JSONB DEFAULT '{}';
 -- Backfill from existing shot_list_locked_at
 UPDATE scenes SET stage_locks = jsonb_build_object(
   '7', CASE WHEN shot_list_locked_at IS NOT NULL
     THEN jsonb_build_object('status', 'locked', 'locked_at', shot_list_locked_at::text)
     ELSE jsonb_build_object('status', 'draft') END
 ) WHERE stage_locks = '{}' OR stage_locks IS NULL;

 Schema: {"7": {"status": "locked", "locked_at": "..."}, "8": {"status": "outdated"}, ...}
 Valid statuses: "draft" | "locked" | "outdated"

 1.2 New backend route file: backend/src/routes/sceneStageLocks.ts

 Mount at /api/projects/:projectId/scenes/:sceneId/stage-locks
 Endpoint: /
 Method: GET
 Purpose: Return full stage_locks JSONB for scene
 ────────────────────────────────────────
 Endpoint: /:stageNumber/lock
 Method: POST
 Purpose: Lock a stage (validate previous stage is locked)
 ────────────────────────────────────────
 Endpoint: /:stageNumber/unlock
 Method: POST
 Purpose: Two-phase: without confirm returns impact assessment; with confirm=true executes unlock + cascade outdated
 ────────────────────────────────────────
 Endpoint: /:stageNumber/relock
 Method: POST
 Purpose: Re-lock an outdated stage without changes
 - Lock endpoint also sets shot_list_locked_at when stageNumber=7 (backward compat)
 - Unlock cascade: sets stage N to "draft", stages N+1..12 (if "locked") to "outdated"
 - Impact assessment counts affected frames/videos for cost estimate

 1.3 Add Phase A unlock endpoint to backend/src/routes/stageStates.ts
 Endpoint: /:stageNumber/unlock
 Method: POST
 Purpose: Two-phase unlock for stages 1-5. Creates new version with status: 'draft'. Downstream stages get status: 'outdated'      
 Files modified:
 - backend/src/routes/sceneStageLocks.ts (NEW)
 - backend/src/routes/stageStates.ts (add unlock route)
 - backend/src/routes/projects.ts (modify existing shot lock/unlock at ~line 1400 to also write stage_locks)
 - backend/src/index.ts (mount new route)

 1.4 Frontend service: src/lib/services/sceneStageLockService.ts (NEW)

 Methods: getStageLocks(), lockStage(), unlockStage(), relockStage()

 1.5 Frontend hook: src/lib/hooks/useSceneStageLock.ts (NEW)

 Returns: stageLocks, isLoading, isLocked(stage), isOutdated(stage), lockStage(), unlockStage(), relockStage(), refresh()

 ---
 Wave 2: Shared UI Components

 2.1 src/components/pipeline/LockedStageHeader.tsx (NEW)

 Universal header for ALL stages in both locked and editing modes.

 Props:
 stageNumber, title, subtitle?, isLocked, isOutdated?,
 onBack?, onNext?, onUnlockAndEdit?, onLockAndProceed?,
 lockAndProceedLabel?, lockAndProceedDisabled?, isLocking?,
 onRelock?, editingActions?: ReactNode

 Locked view: [<- Back] [Title/Subtitle] ... [{Lock} LOCKED-IN badge] [Unlock & Edit] [Next ->]
 Editing view: [<- Back] [Title/Subtitle] ... [editingActions] [Lock & Proceed]
 Outdated view: [<- Back] [Title/Subtitle] ... [{Warning} OUTDATED badge] [Re-lock] [Next ->]

 Container: flex items-center justify-between px-6 py-4 border-b border-border bg-card (matches existing headers)

 Badge styling:
 - LOCKED-IN: bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 + Lock icon
 - OUTDATED: bg-amber-500/20 text-amber-400 border border-amber-500/30 + AlertTriangle icon

 2.2 src/components/pipeline/UnlockWarningDialog.tsx (NEW)

 Single confirmation dialog replacing Stage 7's 3-dialog cascade.

 Shows: affected downstream stages list, frames/videos affected (Phase B), estimated regen cost, note that data is NOT deleted.    

 ---
 Wave 3: Phase A Stages (1-5)

 For each stage: replace existing header with LockedStageHeader. When locked, content is read-only (selectable, not editable).     
 Action buttons hidden. "Next" button visible for navigation.

 Stage 1 (Stage1InputMode.tsx)

 - Add LockedStageHeader at top (currently has NO header)
 - When locked: all form fields disabled, "Continue to Treatment" hidden, Next goes to Stage 2
 - No Back button (first stage)
 - lockAndProceedLabel="Confirm & Proceed"

 Stage 2 (Stage2Treatment.tsx)

 - Replace header (lines ~430-494) with LockedStageHeader
 - When locked: treatment text readOnly, variation browsing still works, Regenerate/Save hidden
 - editingActions: [Full Regenerate] [Save Changes]
 - lockAndProceedLabel="Approve & Continue"

 Stage 3 (Stage3BeatSheet.tsx)

 - Replace header (lines ~582-637) with LockedStageHeader
 - When locked: beats list read-only, drag/add/delete disabled, beat text selectable
 - editingActions: [Regenerate All] [Sync with Script]
 - lockAndProceedLabel="Confirm & Lock"

 Stage 4 (Stage4MasterScript.tsx)

 - Replace header (lines ~774-836) with LockedStageHeader
 - When locked: Tiptap editor editable: false (native support, text still selectable), toolbar hidden
 - editingActions: [Preview Scenes] [Regenerate] [Edit Selection]
 - lockAndProceedLabel="Approve Script"

 Stage 5 (Stage5Assets.tsx)

 - Add LockedStageHeader at top (currently has floating footer only)
 - Remove floating footer (lines ~870-914)
 - When locked: asset cards read-only, no edit/upload/generate
 - editingActions: asset management buttons
 - lockAndProceedLabel="Lock All Assets"

 ---
 Wave 4: Stage 7 Overhaul

 Stage7ShotList.tsx — most complex individual change.

 - Remove: Blue lock banner (lines 762-783), footer bar (lines 1031-1069)
 - Remove: handleUnlock 3-dialog cascade, showUnlockConfirmModal state, unlockConfirmDetails state
 - Add: LockedStageHeader at the very top of returned JSX
 - Add: useSceneStageLock hook integration
 - When locked: shots viewable, inspector read-only (fields readOnly not greyed), Split/Merge/Delete hidden
 - When editing: editingActions shown, handleLockShotList validation still runs on lock
 - onUnlockAndEdit → opens UnlockWarningDialog (single dialog, not 3)
 - lockAndProceedLabel="Lock Shot List & Proceed"
 - onBack → Stage 6, onNext → Stage 8

 ---
 Wave 5: Stages 8-12 Locking

 Add LockedStageHeader + useSceneStageLock to each. Remove footer nav. Add lock-on-proceed.

 Stage 8 (Stage8VisualDefinition.tsx)

 - Remove footer Back/Proceed buttons
 - When locked: asset list read-only, no edit/add/delete
 - lockAndProceedLabel="Lock & Proceed"
 - Back → Stage 7, Next → Stage 9

 Stage 9 (Stage9PromptSegmentation.tsx)

 - Remove footer (lines ~640-660)
 - When locked: prompt textareas readOnly, generate buttons hidden
 - lockAndProceedLabel="Lock & Proceed"
 - Back → Stage 8, Next → Stage 10

 Stage 10 (Stage10FrameGeneration.tsx)

 - Remove footer (lines ~617-624)
 - When locked: frame cards viewable, no generate/approve/reject actions
 - lockAndProceedLabel="Lock & Proceed", disabled unless all frames approved
 - Back → Stage 9, Next → Stage 11

 Stage 11 (Stage11Confirmation.tsx)

 - Remove footer (line ~352-355)
 - Lock & Proceed triggers both stage lock AND render job creation
 - lockAndProceedLabel="Confirm & Render"
 - Back → Stage 10, Next → Stage 12

 Stage 12 (Stage12VideoGeneration.tsx)

 - Remove footer (lines ~622-643)
 - No Next button (terminal stage)
 - lockAndProceedLabel="Complete Scene", on proceed: lock + exit to Script Hub
 - Back → Stage 11

 ---
 Wave 6: Navigation Overhaul

 6.1 SceneWorkflowSidebar.tsx

 Add stageLockStatuses: Record<number, 'draft' | 'locked' | 'outdated'> prop.

 Update accessibility logic:
 - locked stages → clickable, show Lock icon (emerald)
 - outdated stages → clickable, show AlertTriangle icon (amber)
 - draft + reachable → clickable, show stage icon
 - draft + unreachable → disabled, show Lock icon (muted) — not yet reached

 6.2 ProjectView.tsx — Auto-resume + state from DB

 handleEnterScene rewrite (currently lines 441-445):
 1. Fetch scene's stage_locks from new service
 2. Find first stage where status !== 'locked' (resume target)
 3. Build completedSceneStages from locked/outdated stages
 4. setSceneStage(resumeTarget) instead of always 7
 5. setCompletedSceneStages from DB data instead of []

 handleSceneStageComplete update (lines 466-474):
 - Call sceneStageLockService.lockStage() before advancing
 - Update completedSceneStages from response

 Pass stageLockStatuses to SceneWorkflowSidebar (line 556-560):
 - Derive from useSceneStageLock hook data

 Stage component props: Each stage now receives onNext in addition to onComplete and onBack. onComplete handles the
 lock-and-advance flow. onNext handles read-only navigation (no lock needed).

 6.3 Phase A Navigation

 PhaseTimeline already allows clicking locked stages. handleNavigate (line 431-439) allows navigation to non-pending stages.       
 Locked stages are non-pending, so clicking works. Each stage component shows locked view when its stage state is 'locked'.        

 ---
 Critical Files Summary
 ┌──────────────────────────────────────────────────────┬─────────────────────────────────┬──────┐
 │                         File                         │             Action              │ Wave │
 ├──────────────────────────────────────────────────────┼─────────────────────────────────┼──────┤
 │ backend/src/routes/sceneStageLocks.ts                │ NEW                             │ 1    │
 ├──────────────────────────────────────────────────────┼─────────────────────────────────┼──────┤
 │ backend/src/routes/stageStates.ts                    │ Add unlock route                │ 1    │
 ├──────────────────────────────────────────────────────┼─────────────────────────────────┼──────┤
 │ backend/src/routes/projects.ts                       │ Sync shot lock with stage_locks │ 1    │
 ├──────────────────────────────────────────────────────┼─────────────────────────────────┼──────┤
 │ backend/src/index.ts                                 │ Mount new route                 │ 1    │
 ├──────────────────────────────────────────────────────┼─────────────────────────────────┼──────┤
 │ src/lib/services/sceneStageLockService.ts            │ NEW                             │ 1    │
 ├──────────────────────────────────────────────────────┼─────────────────────────────────┼──────┤
 │ src/lib/hooks/useSceneStageLock.ts                   │ NEW                             │ 1    │
 ├──────────────────────────────────────────────────────┼─────────────────────────────────┼──────┤
 │ src/components/pipeline/LockedStageHeader.tsx        │ NEW                             │ 2    │
 ├──────────────────────────────────────────────────────┼─────────────────────────────────┼──────┤
 │ src/components/pipeline/UnlockWarningDialog.tsx      │ NEW                             │ 2    │
 ├──────────────────────────────────────────────────────┼─────────────────────────────────┼──────┤
 │ src/components/pipeline/Stage1InputMode.tsx          │ Add locked view                 │ 3    │
 ├──────────────────────────────────────────────────────┼─────────────────────────────────┼──────┤
 │ src/components/pipeline/Stage2Treatment.tsx          │ Replace header                  │ 3    │
 ├──────────────────────────────────────────────────────┼─────────────────────────────────┼──────┤
 │ src/components/pipeline/Stage3BeatSheet.tsx          │ Replace header                  │ 3    │
 ├──────────────────────────────────────────────────────┼─────────────────────────────────┼──────┤
 │ src/components/pipeline/Stage4MasterScript.tsx       │ Replace header                  │ 3    │
 ├──────────────────────────────────────────────────────┼─────────────────────────────────┼──────┤
 │ src/components/pipeline/Stage5Assets.tsx             │ Add header, remove footer       │ 3    │
 ├──────────────────────────────────────────────────────┼─────────────────────────────────┼──────┤
 │ src/components/pipeline/Stage7ShotList.tsx           │ Major overhaul                  │ 4    │
 ├──────────────────────────────────────────────────────┼─────────────────────────────────┼──────┤
 │ src/components/pipeline/Stage8VisualDefinition.tsx   │ Add locking + header            │ 5    │
 ├──────────────────────────────────────────────────────┼─────────────────────────────────┼──────┤
 │ src/components/pipeline/Stage9PromptSegmentation.tsx │ Add locking + header            │ 5    │
 ├──────────────────────────────────────────────────────┼─────────────────────────────────┼──────┤
 │ src/components/pipeline/Stage10FrameGeneration.tsx   │ Add locking + header            │ 5    │
 ├──────────────────────────────────────────────────────┼─────────────────────────────────┼──────┤
 │ src/components/pipeline/Stage11Confirmation.tsx      │ Add locking + header            │ 5    │
 ├──────────────────────────────────────────────────────┼─────────────────────────────────┼──────┤
 │ src/components/pipeline/Stage12VideoGeneration.tsx   │ Add locking + header            │ 5    │
 ├──────────────────────────────────────────────────────┼─────────────────────────────────┼──────┤
 │ src/components/pipeline/SceneWorkflowSidebar.tsx     │ Update nav logic                │ 6    │
 ├──────────────────────────────────────────────────────┼─────────────────────────────────┼──────┤
 │ src/pages/ProjectView.tsx                            │ Auto-resume + DB state          │ 6    │
 └──────────────────────────────────────────────────────┴─────────────────────────────────┴──────┘
 ---
 Verification Plan

 1. Backend: After each wave, test endpoints via curl/Postman
 2. Phase A (Stages 1-5): Lock Stage 3, navigate back — should see LOCKED-IN flag, read-only content, Next button. Click Unlock &  
 Edit — single warning dialog, then editable
 3. Stage 7: Lock shot list, navigate away, return — should be locked view without unlock/relock cycle. Unlock & Edit — single     
 dialog, not 3
 4. Stages 8-12: Complete through Stage 10, return to Stage 7 from Script Hub — should auto-resume at Stage 11, sidebar shows      
 stages 7-10 as locked (clickable)
 5. Free navigation: Click any completed stage in sidebar — read-only view, no prompts
 6. Cascade: Unlock Stage 8 — stages 9-10 show "OUTDATED" badge, can re-lock or edit
 7. Lint: Run npm run lint on all modified files after each wave
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌