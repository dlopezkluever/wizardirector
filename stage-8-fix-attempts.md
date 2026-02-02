
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