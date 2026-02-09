# Locking System Overhaul - Implementation Summary

## Overview

A comprehensive overhaul of the stage locking system across all 12 pipeline stages. The previous system had three major pain points:

1. **No consistent lock/unlock UI** - some stages had hidden locking, Stage 7 had a banner+footer, Stages 8-12 had none
2. **State loss on navigation** - entering a scene always reset to Stage 7 and wiped completed stages, forcing re-traversal
3. **Tedious dialog chains** - Stage 7 had a 3-dialog unlock cascade (unlock confirm -> validation modal -> force lock confirm)

The overhaul introduces:
- Standardized `LockedStageHeader` across all 12 stages
- Scene-level `stage_locks` JSONB column for stages 7-12
- Phase A unlock via `stage_states` versioning for stages 1-5
- Free read-only browsing of completed/locked stages
- Auto-resume at the latest incomplete stage when entering a scene
- Single-dialog unlock flow replacing the old 3-dialog cascade
- Downstream "outdated" cascade (data retained, not deleted)

---

## Wave 1: Backend Foundation

### New Files

**`backend/src/routes/sceneStageLocks.ts`**
- New route file mounted at `/api/projects/:projectId/scenes/:sceneId/stage-locks`
- `GET /` - Returns full `stage_locks` JSONB for a scene
- `POST /:stageNumber/lock` - Lock a stage (validates previous stage is locked, except stage 7)
- `POST /:stageNumber/unlock` - Two-phase unlock: without `confirm` body param returns a 409 with impact assessment (downstream stages affected); with `confirm: true` executes unlock and cascades downstream stages to "outdated"
- `POST /:stageNumber/relock` - Re-lock an outdated stage without changes
- Stage 7 lock/unlock also syncs `shot_list_locked_at` column for backward compatibility
- Unlock cascade: sets stage N to `"draft"`, stages N+1..12 (if `"locked"`) to `"outdated"`

**`src/lib/services/sceneStageLockService.ts`**
- Frontend API client class with `getAuthHeaders()` pattern
- Methods: `getStageLocks()`, `lockStage()`, `unlockStage(confirm?)`, `relockStage()`
- `unlockStage` handles 409 responses by returning `UnlockImpact` object for dialog display
- Exported types: `StageLockStatus`, `StageLockEntry`, `StageLocks`, `UnlockImpact`, `LockResult`, `UnlockResult`
- Singleton export: `export const sceneStageLockService = new SceneStageLockService()`

**`src/lib/hooks/useSceneStageLock.ts`**
- React hook: `useSceneStageLock({ projectId, sceneId })`
- Returns: `stageLocks`, `isLoading`, `isLocked(stage)`, `isOutdated(stage)`, `isDraft(stage)`, `getStatus(stage)`, `lockStage(stage)`, `unlockStage(stage)` (returns UnlockImpact), `confirmUnlock(stage)`, `relockStage(stage)`, `refresh()`
- Uses `useState` + `useEffect` + `useCallback` pattern

### Modified Files

**`backend/src/routes/stageStates.ts`**
- Added Phase A unlock route: `POST /:projectId/stages/:stageNumber/unlock`
- Two-phase: without `confirm` returns impact with downstream locked stages; with `confirm: true` creates new version with `status: 'draft'` and cascades downstream stages to `status: 'outdated'`

**`backend/src/server.ts`**
- Imported and mounted `sceneStageLockRouter`

**`backend/src/routes/projects.ts`**
- Shot lock route: now also writes `stage_locks` JSONB with `'7': { status: 'locked', locked_at: <timestamp> }`
- Shot unlock route: now also updates `stage_locks` JSONB - sets stage 7 to draft, cascades 8-12 to outdated

### Database Migration (Manual - Supabase SQL Editor)

```sql
ALTER TABLE scenes ADD COLUMN stage_locks JSONB DEFAULT '{}';

UPDATE scenes SET stage_locks = jsonb_build_object(
  '7', CASE WHEN shot_list_locked_at IS NOT NULL
    THEN jsonb_build_object('status', 'locked', 'locked_at', shot_list_locked_at::text)
    ELSE jsonb_build_object('status', 'draft') END
) WHERE stage_locks = '{}' OR stage_locks IS NULL;
```

---

## Wave 2: Shared UI Components

### New Files

**`src/components/pipeline/LockedStageHeader.tsx`**
- Universal header component used by all 12 stages
- Props: `stageNumber`, `title`, `subtitle?`, `isLocked`, `isOutdated?`, `onBack?`, `onNext?`, `onUnlockAndEdit?`, `onLockAndProceed?`, `lockAndProceedLabel?`, `lockAndProceedDisabled?`, `isLocking?`, `onRelock?`, `editingActions?: ReactNode`
- Three view modes:
  - **Locked**: emerald badge (`LOCKED-IN`) + `Unlock & Edit` button + `Next` button
  - **Outdated**: amber badge (`OUTDATED`) + `Re-lock` button + `Edit` button + `Next` button
  - **Editing**: custom `editingActions` slot + `Lock & Proceed` button
- Container: `flex items-center justify-between px-6 py-4 border-b border-border bg-card shrink-0`

**`src/components/pipeline/UnlockWarningDialog.tsx`**
- Single confirmation dialog replacing Stage 7's old 3-dialog cascade
- Uses shadcn `Dialog` component
- Shows: affected downstream stages list (with stage names), frames/videos affected, estimated regen cost, "Data will NOT be deleted" note
- Props: `open`, `onOpenChange`, `impact`, `stageNumber`, `stageTitle`, `onConfirm`, `isConfirming?`

---

## Wave 3: Phase A Stages (1-5)

Each Phase A stage received the same treatment:
- New props: `stageStatus?: StageStatus`, `onNext?: () => void`, `onUnlock?: () => void`
- Derived `isStageLockedOrOutdated` flag from `stageStatus`
- Conditional header: `LockedStageHeader` when locked/outdated, original header when editing
- Action buttons/forms hidden when locked (content remains selectable, not greyed out)

### Stage 1 (`Stage1InputMode.tsx`)
- `LockedStageHeader` added at top of returned JSX
- All form fields `disabled` when locked; "Continue to Treatment" button hidden
- No Back button (first stage)
- `lockAndProceedLabel="Confirm & Proceed"`

### Stage 2 (`Stage2Treatment.tsx`)
- Header replaced with conditional rendering: `LockedStageHeader` vs original header
- Treatment text `readOnly` when locked; variation browsing still works; Regenerate/Save hidden
- `lockAndProceedLabel="Approve & Continue"`

### Stage 3 (`Stage3BeatSheet.tsx`)
- Same conditional header pattern
- Beats list read-only when locked; drag/add/delete disabled; beat text selectable
- `lockAndProceedLabel="Confirm & Lock"`

### Stage 4 (`Stage4MasterScript.tsx`)
- Tiptap editor set to `editable: !isStageLockedOrOutdated` (native support, text still selectable)
- `ScreenplayToolbar` hidden when locked
- `lockAndProceedLabel="Approve Script"`

### Stage 5 (`Stage5Assets.tsx`)
- `LockedStageHeader` added at top
- Floating gatekeeper bar hidden when locked
- Asset cards read-only when locked (no edit/upload/generate)
- `lockAndProceedLabel="Lock All Assets"`

---

## Wave 4: Stage 7 Overhaul

**`Stage7ShotList.tsx`** - Most complex individual change.

### Added
- `onNext?: () => void` prop
- `useSceneStageLock` hook integration (with `projectId` + `sceneId`)
- `showUnlockWarning`, `unlockImpact`, `isConfirmingUnlock` state for new dialog
- `stage7Locked` and `stage7Outdated` derived from hook
- `useEffect` to sync `isSceneLocked` with `stage7Locked`/`stage7Outdated`
- `handleUnlockAndEdit` / `handleConfirmUnlock` / `handleRelock` handlers
- `LockedStageHeader` at top of main JSX return
- `UnlockWarningDialog` replacing old Dialog

### Removed
- Old blue lock banner
- Old `showUnlockConfirmModal`, `unlockConfirmDetails`, `isUnlocking` state
- Old `handleUnlock` / `confirmUnlockWithInvalidation` 3-dialog cascade
- "Shot List Locked" button state in footer (simplified)

### Modified
- `lockShotList` now also calls `lockStage(7)` via new system (best-effort)
- `handleConfirmUnlock` calls both new system and old `shotService.unlockShotList` for backward compat
- Footer conditionally hidden when locked

---

## Wave 5: Stages 8-12 Locking

Each Phase B stage (8-12) received `useSceneStageLock` hook integration, `LockedStageHeader`, `UnlockWarningDialog`, and lock-on-proceed behavior.

### Stage 8 (`Stage8VisualDefinition.tsx`)
- Added `onNext?` prop, full hook integration
- `handleUnlockAndEdit`, `handleConfirmUnlock`, `handleLockAndProceed` handlers
- `LockedStageHeader` at top; `UnlockWarningDialog` at bottom
- `lockAndProceedLabel="Lock & Proceed"`

### Stage 9 (`Stage9PromptSegmentation.tsx`)
- Added `onNext?` prop, locking hook integration
- `LockedStageHeader` at top; footer hidden when locked
- Footer button changed from "Proceed to Frame Generation" to "Lock & Proceed" (locks then calls `onComplete`)
- `lockAndProceedLabel="Lock & Proceed"`

### Stage 10 (`Stage10FrameGeneration.tsx`)
- Added `onNext?` prop, locking hook integration
- `LockedStageHeader` at top with `lockAndProceedDisabled={!allFramesApproved}`
- Footer hidden when locked; button changed to "Lock & Proceed"
- `lockAndProceedLabel="Lock & Proceed"`

### Stage 11 (`Stage11Confirmation.tsx`)
- Added `onNext?` prop, locking hook integration
- `LockedStageHeader` with `lockAndProceedLabel="Confirm & Render"`
- Footer hidden when locked
- Lock & Proceed triggers both stage lock and render job creation

### Stage 12 (`Stage12VideoGeneration.tsx`)
- Terminal stage: no Next button, no unlock
- `useSceneStageLock` (only `isLocked` and `lockStage`)
- `LockedStageHeader` with `lockAndProceedLabel="Complete Scene"` - on proceed: lock + call `onComplete` (exits to Script Hub)
- Footer hidden when locked

---

## Wave 6: Navigation Overhaul

### `src/components/pipeline/SceneWorkflowSidebar.tsx` (Rewritten)
- Added `stageLockStatuses?: Record<number, StageLockStatus>` prop
- Added `AlertTriangle` icon import for outdated stages
- Reachability logic: checks all prior stages are locked/completed/outdated
- Visual states:
  - **Locked**: emerald background, Lock icon
  - **Outdated**: amber background, AlertTriangle icon
  - **Completed** (not locked/outdated): primary background, Check icon
  - **Disabled** (unreachable): muted background, Lock icon

### `src/lib/services/stageStateService.ts`
- Added `unlockStage(projectId, stageNumber, confirm?)` method for Phase A (1-5) two-phase unlock
- Handles 409 response (impact assessment) separately from success response

### `src/pages/ProjectView.tsx` (Major Updates)

**New state:**
- `sceneStageLocks` - tracks scene's `stage_locks` JSONB from DB
- `phaseAUnlockStage` / `phaseAUnlockImpact` / `isConfirmingPhaseAUnlock` - Phase A unlock dialog state

**`handleEnterScene` rewritten:**
1. Fetches `stage_locks` from DB via `sceneStageLockService.getStageLocks()`
2. Finds first stage where status !== `'locked'` (resume target)
3. Builds `completedSceneStages` from locked/outdated stages
4. Sets `sceneStage` to resume target instead of always 7
5. Falls back to Stage 7 on error

**`handleEnterSceneAtStage` updated:**
- Same DB-backed state fetching as `handleEnterScene`

**`handleSceneStageComplete` updated:**
- Now calls `sceneStageLockService.lockStage()` before advancing
- Updates `sceneStageLocks` state from response
- Deduplicates `completedSceneStages`

**New handlers:**
- `handleSceneStageNext` - read-only forward navigation (no locking)
- `handlePhaseAUnlock` - initiates Phase A unlock (fetches impact assessment)
- `handleConfirmPhaseAUnlock` - executes Phase A unlock (creates draft, cascades outdated)
- `handlePhaseANext` - Phase A read-only browsing between locked stages
- `deriveSidebarLockStatuses` - derives sidebar props from `sceneStageLocks`
- `getPhaseAStageStatus` - gets StageStatus for Phase A components

**Scene restore effect updated:**
- On page refresh, fetches real lock state from DB instead of assuming linear completion

**Prop passing:**
- All Phase B stages (7-12) now receive `onNext={handleSceneStageNext}`
- `SceneWorkflowSidebar` receives `stageLockStatuses={deriveSidebarLockStatuses()}`
- All Phase A stages (1-5) receive `stageStatus`, `onNext`, `onUnlock` props
- `UnlockWarningDialog` added to Phase A return block for unlock confirmation

---

## File Manifest

| File | Action | Wave |
|------|--------|------|
| `backend/src/routes/sceneStageLocks.ts` | NEW | 1 |
| `backend/src/routes/stageStates.ts` | Modified (added unlock route) | 1 |
| `backend/src/server.ts` | Modified (mount new route) | 1 |
| `backend/src/routes/projects.ts` | Modified (sync stage_locks on shot lock/unlock) | 1 |
| `src/lib/services/sceneStageLockService.ts` | NEW | 1 |
| `src/lib/hooks/useSceneStageLock.ts` | NEW | 1 |
| `src/lib/services/stageStateService.ts` | Modified (added unlockStage method) | 6 |
| `src/components/pipeline/LockedStageHeader.tsx` | NEW | 2 |
| `src/components/pipeline/UnlockWarningDialog.tsx` | NEW | 2 |
| `src/components/pipeline/Stage1InputMode.tsx` | Modified (added locked view) | 3 |
| `src/components/pipeline/Stage2Treatment.tsx` | Modified (replaced header) | 3 |
| `src/components/pipeline/Stage3BeatSheet.tsx` | Modified (replaced header) | 3 |
| `src/components/pipeline/Stage4MasterScript.tsx` | Modified (replaced header, Tiptap editable toggle) | 3 |
| `src/components/pipeline/Stage5Assets.tsx` | Modified (added header, hid footer when locked) | 3 |
| `src/components/pipeline/Stage7ShotList.tsx` | Modified (major overhaul - new hook, header, dialog) | 4 |
| `src/components/pipeline/Stage8VisualDefinition.tsx` | Modified (added locking + header) | 5 |
| `src/components/pipeline/Stage9PromptSegmentation.tsx` | Modified (added locking + header) | 5 |
| `src/components/pipeline/Stage10FrameGeneration.tsx` | Modified (added locking + header) | 5 |
| `src/components/pipeline/Stage11Confirmation.tsx` | Modified (added locking + header) | 5 |
| `src/components/pipeline/Stage12VideoGeneration.tsx` | Modified (added locking + header) | 5 |
| `src/components/pipeline/SceneWorkflowSidebar.tsx` | Rewritten (lock status display) | 6 |
| `src/pages/ProjectView.tsx` | Modified (auto-resume, prop passing, Phase A unlock) | 6 |

(


---  
  
  Wave 6: Navigation Overhaul - Completed

  Changes made:

  src/lib/services/stageStateService.ts — Added unlockStage() method for Phase A (1-5) two-phase unlock flow (impact assessment →  
  confirm).

  src/pages/ProjectView.tsx — Major updates:
  - Added sceneStageLocks state (tracks JSONB locks from DB)
  - Added Phase A unlock dialog state (phaseAUnlockStage, phaseAUnlockImpact, isConfirmingPhaseAUnlock)
  - handleEnterScene rewritten: now fetches stage_locks from DB, auto-resumes at first non-locked stage, builds
  completedSceneStages from real lock data
  - handleEnterSceneAtStage updated similarly with DB-backed state
  - handleSceneStageComplete now locks via sceneStageLockService.lockStage() before advancing
  - Added handleSceneStageNext for read-only forward navigation (no locking)
  - Added handlePhaseAUnlock / handleConfirmPhaseAUnlock for Phase A unlock flow
  - Added handlePhaseANext for Phase A read-only browsing
  - Added deriveSidebarLockStatuses / getPhaseAStageStatus helpers
  - Scene restore effect now fetches real lock state from DB on page refresh
  - All Phase B stages now receive onNext={handleSceneStageNext} prop
  - SceneWorkflowSidebar now receives stageLockStatuses={deriveSidebarLockStatuses()}
  - All Phase A stages now receive stageStatus, onNext, onUnlock props
  - UnlockWarningDialog added to Phase A return block

  src/components/pipeline/SceneWorkflowSidebar.tsx — Already updated in previous session with stageLockStatuses prop, lock/outdated   visual states.

  Lint/TypeScript: Clean (only pre-existing warnings)

  ---
  SQL Migration Required

  You need to apply this SQL migration in your Supabase SQL editor:

  ALTER TABLE scenes ADD COLUMN stage_locks JSONB DEFAULT '{}';

  -- Backfill from existing shot_list_locked_at
  UPDATE scenes SET stage_locks = jsonb_build_object(
    '7', CASE WHEN shot_list_locked_at IS NOT NULL
      THEN jsonb_build_object('status', 'locked', 'locked_at', shot_list_locked_at::text)
      ELSE jsonb_build_object('status', 'draft') END
  ) WHERE stage_locks = '{}' OR stage_locks IS NULL;

  This adds the stage_locks JSONB column and backfills stage 7 lock data from the existing shot_list_locked_at column.
  
  RAN SUCCESSFULLY
  )