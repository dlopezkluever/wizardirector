
Summary of what was implemented:

---

## Implementation Summary (Issues 1a & 1b)

### Issue 1a: Stage 8 redirect on refresh

**Problem:** Refreshing on Stage 8 sent users back to Stage 7 because `sceneId` was missing from the URL and restoration didn’t handle Stage 8 correctly.

**Changes:**

1. **`src/pages/ProjectView.tsx`**
   - **Persistence:** `getSceneIdStorageKey()` added. `persistStage(stage, sceneId)` now writes `project_${projectId}_sceneId` to localStorage when `stage >= 7` and `sceneId` is provided.
   - **Restoration:** Restore effect now:
     - For **Stage 8 from URL**: if `sceneId` is missing, reads `sceneId` from localStorage, updates URL with `sceneId`, and uses it; if still no `sceneId`, falls back to Stage 7 and logs a warning.
     - For **Stage 8 from localStorage**: restores `sceneId` from localStorage; if missing, uses Stage 7 instead of 8.
     - Sets `activeSceneId` and `sceneStage` whenever a valid Stage 8 + `sceneId` is restored.
   - **Scene context effect:** When `stage >= 7`, `sceneId` can come from URL or, for Stage 8, from localStorage; URL is updated with `sceneId` when it was restored from localStorage.

2. **`src/components/pipeline/Stage8VisualDefinition.tsx`**
   - **URL sync:** `useEffect` on `sceneId` that calls `window.history.replaceState` to set `?stage=8&sceneId=...` so the current Stage 8 scene is reflected in the URL (and survives refresh).

**Result:** Refreshing on Stage 8 keeps you on Stage 8 with the same scene; opening a link with `?stage=8&sceneId=...` or restoring from localStorage also works.

---

### Issue 1b: Generated images not appearing without refresh

**Problem:** After single or bulk image generation, new images didn’t show until a manual refresh because there was no polling for single jobs and no cache invalidation after bulk polling.

**Changes (all in `src/components/pipeline/Stage8VisualDefinition.tsx`):**

1. **Single image**
   - Replaced the “fire-and-forget” `generateImageMutation` with an async flow:
     - Call `sceneAssetService.generateSceneAssetImage(...)` to get `jobId`.
     - New `pollSingleImageJob(jobId)` helper: polls `getImageJobStatus(jobId)` every 2s, up to 60 attempts; resolves on `completed`, throws on `failed` or timeout.
     - After polling completes successfully: `await queryClient.invalidateQueries({ queryKey: ['scene-assets', projectId, sceneId] })` and show success toast; on error, show error toast.
   - Added `isGeneratingSingle` state; the panel’s “Generate Image” uses `isGeneratingImage={isGeneratingSingle}` so the button shows loading during the full poll.

2. **Bulk images**
   - Existing `handleBulkGenerateConfirmed` already called `queryClient.invalidateQueries` after `pollBulkImageJobs`. Change: added `await` so the refetch is triggered before clearing bulk progress state.

**Result:** Single and bulk generated images show in the UI as soon as jobs complete, without a manual refresh.

----


Here’s what’s going on and how to fix it.

---

## Why Stage 8 Shows Locked After You Go Back to Stage 7

### Root cause: `completedSceneStages` is never restored

When you’re in Phase B (scene workflow), the **right sidebar** is `SceneWorkflowSidebar`. It decides if a stage is locked with:

```45:46:src/components/pipeline/SceneWorkflowSidebar.tsx
        const isLocked = !isCompleted && stage > Math.max(...completedStages, 6) + 1;
        const previousCompleted = index === 0 || completedStages.includes(sceneStages[index - 1].stage);
```

So:

- A stage is **unlocked** if it’s in `completedStages` **or** its number is ≤ `Math.max(...completedStages, 6) + 1`.
- Stage 8 is **locked** when `completedStages` is empty, because then “next allowed” is only 7, and 8 > 7.

`completedSceneStages` in `ProjectView` is:

1. Initialized to `[]`.
2. Only updated when you complete a scene stage in the flow (`handleSceneStageComplete` adds the current stage to the array).
3. **Never** set when restoring from URL/localStorage.

So:

- **No refresh:** You lock Stage 7 → go to Stage 8 → `completedSceneStages` = `[7]` → you can go back to 7 and then click 8 again (Stage 8 is not locked).
- **After refresh (or new tab with `?stage=8&sceneId=...`):** The restore effect sets `sceneStage`, `activeSceneId`, `currentStage`, but **leaves** `completedSceneStages` as `[]`. So when you click Stage 7 to review, the sidebar still has `completedStages = []` → “next allowed” is 7 → Stage 8 is treated as locked.

So the bug is: **after a refresh (or open-in-new-tab), we restore “you’re on Stage 8” but we don’t restore “you’ve completed Stage 7,” so the sidebar thinks you haven’t completed anything and locks Stage 8.**

---

## Is it safe to allow “view-only” back-and-forth?

Yes. The lock is there to enforce **sequential completion** (finish Stage 7 before doing Stage 8). Allowing “go back to 7 to read, then click 8 to return” doesn’t change that:

- You’re not unlocking Stage 7 for editing; you’re just viewing.
- Stage 8 was already reached (and that state is restored from URL/localStorage).
- Letting the user re-open Stage 8 from the sidebar in that situation is a UX improvement, not a relaxation of the real “must complete 7 before 8” rule.

So it’s not damaging; it’s the intended behavior for viewing.

---

## Fix: restore `completedSceneStages` when restoring scene stage

**Scope:** Small, localized change. No big architecture change.

**Idea:** When we restore `sceneStage` from URL/localStorage (e.g. to 8), we should also set `completedSceneStages` to “all scene stages before the restored one,” so the sidebar considers those stages completed and allows clicking Stage 8 again after you go back to 7.

**Where:** `ProjectView.tsx`, in the same effect that restores scene context (the one that runs on `searchParams` / `projectId` and sets `activeSceneId`, `sceneStage`, `currentStage`).

**What to do:** When you set `sceneStage` from URL/localStorage (e.g. to `stage` where `stage` is 7–12), also set:

```ts
setCompletedSceneStages(
  Array.from({ length: stage - 7 }, (_, i) => (7 + i) as SceneStage)
);
```

So:

- Restore to Stage 7 → `completedSceneStages = []` (nothing before 7).
- Restore to Stage 8 → `completedSceneStages = [7]`.
- Restore to Stage 9 → `completedSceneStages = [7, 8]`.
- etc.

That way, after a refresh on Stage 8, when you click Stage 7 and then the Stage 8 icon, `completedStages` will include 7 and Stage 8 will no longer be locked.

**Optional (same effect, clearer intent):** Add a small helper, e.g. `completedStagesForSceneStage(stage: SceneStage): SceneStage[]` that returns `[7, 8, ..., stage - 1]`, and call it when restoring `sceneStage`.

---

## Summary

| Question | Answer |
|----------|--------|
| **Why is Stage 8 locked after going back to Stage 7?** | After refresh, `completedSceneStages` stays `[]` while we restore `sceneStage`/`currentStage` to 8. The sidebar uses `completedStages` to decide “next allowed”; with it empty, only 7 is allowed, so 8 is locked. |
| **Would free back-and-forth for viewing be bad?** | No. It’s view-only; sequential completion is still enforced for actual progress. |
| **Fix size?** | Small: one effect in `ProjectView.tsx` that already restores scene stage; add restoration of `completedSceneStages` there (e.g. “stages 7 … restoredStage−1” when restoring to a given scene stage). |
| **Recommendation** | Implement the above restoration of `completedSceneStages` when restoring from URL/localStorage so that, after refresh, going to Stage 7 and then clicking Stage 8 works without unlock/relock. |

I can outline the exact code edits in `ProjectView.tsx` (paste-ready) if you want to apply this in Agent mode.


Summary of the change:

**`src/pages/ProjectView.tsx`**

1. **When restoring from URL** (e.g. `?stage=8&sceneId=...` or after refresh): after setting `sceneStage` and `currentStage`, we now set `completedSceneStages` to the list of scene stages before the restored one:
   - Restore to Stage 7 → `[]`
   - Restore to Stage 8 → `[7]`
   - Restore to Stage 9 → `[7, 8]`, etc.

2. **In the fallback branch** (when we have `sceneIdFromUrl` and `currentStage >= 7` but no `stage` in the URL): we set `completedSceneStages` the same way from `currentStage`.

So after a refresh on Stage 8 (or opening a link with `stage=8`), `completedSceneStages` is `[7]`. If you then go to Stage 7 to review, the sidebar still has Stage 7 as “completed,” so Stage 8 is no longer locked and you can click the Stage 8 icon to go back without unlocking/relocking Stage 7.

