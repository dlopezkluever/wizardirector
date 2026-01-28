# Task 4-7 Testing Guide

**Date:** January 27, 2026  
**Feature:** Stage 6 Script Hub - Scene Fetching, Navigation, and Continuity Analysis  
**Implementation Summary:** `TASK-4-7-IMPLEMENTATION-SUMMARY.md`

---

## Prerequisites

Before testing, ensure:
1. Backend server is running (`npm run dev` in `backend/` directory)
2. Frontend dev server is running (`npm run dev` in project root)
3. You have a project with:
   - Locked Stage 4 (Master Script)
   - Scene extraction completed (scenes in database)
   - At least 3-5 scenes for testing

---

## *PASSES* Test Suite 1: Backend Scene Fetching (Task 4)

### Test 1.1: Scene List with Continuity Risk

**Steps:**
1. Navigate to Stage 6 (Script Hub)
2. Open browser DevTools → Network tab
3. Filter for `/api/projects/:id/scenes`
4. Observe the API response

**Expected Results:**
- ✅ Response includes `continuityRisk` field for each scene
- ✅ Response includes `priorSceneEndState` field (may be `null` for Scene 1)
- ✅ Response includes `expectedCharacters`, `expectedLocation`, `expectedProps` arrays
- ✅ Response time < 500ms (check Network tab timing)

**Sample Response Structure:**
```json
{
  "scenes": [
    {
      "id": "scene-uuid",
      "sceneNumber": 1,
      "slug": "int-kitchen-day",
      "status": "draft",
      "scriptExcerpt": "INT. KITCHEN - DAY\n\nJohn enters...",
      "header": "INT. KITCHEN - DAY",
      "openingAction": "John enters...",
      "expectedCharacters": ["John", "Mary"],
      "expectedLocation": "Kitchen",
      "expectedProps": ["Coffee mug", "Newspaper"],
      "priorSceneEndState": null,
      "continuityRisk": "safe",
      "shots": []
    }
  ]
}
```

### Test 1.2: Performance with Multiple Scenes

**Steps:**
1. Create a project with 20+ scenes (or use existing)
2. Navigate to Stage 6
3. Measure page load time in Network tab

**Expected Results:**
- ✅ Initial page load < 500ms
- ✅ No LLM API calls visible in Network tab
- ✅ Only database queries (Supabase API calls)
- ✅ Scenes load instantly on subsequent visits

{{{ I went to try and test wheather the Scenes load instantly on subsequent visits, but strangely, when you refresh a project that was previously on Stage 6, it loads and opens to Stage 5. }}}

### Test 1.3: Continuity Risk Analysis

**Steps:**
1. Navigate to Stage 6
2. Select Scene 1 (first scene)
3. Observe continuity risk indicator
4. Select Scene 2 (second scene)
5. Observe continuity risk indicator

**Expected Results:**
- ✅ Scene 1 shows "Safe" (no prior scene)
- ✅ Scene 2 shows appropriate risk level:
  - "Safe" if Scene 1 is complete and no upstream changes
  - "Risky" if Scene 1 is not complete
  - "Broken" if upstream artifacts changed

**Continuity Risk Logic:**
- **Safe:** No prior scene OR prior scene complete + no upstream changes
- **Risky:** Prior scene not complete
- **Broken:** Upstream artifacts (Stages 1-4) changed since scene last modified

---

## Test Suite 2: URL Navigation (Task 5)

### Test 2.1: Enter Scene Pipeline

**Steps:**
1. Navigate to Stage 6 (Script Hub)
2. Select a scene from the list
3. Click "Enter Scene Pipeline" button
4. Observe URL in browser address bar

**Expected Results:**
- ✅ URL changes to `/projects/:projectId/stage/7?sceneId=:sceneId`
- ✅ Stage 7 (Shot List) loads with correct scene context
- ✅ Scene ID is visible in URL

**Example URL:**
```
http://localhost:8080/projects/abc123/stage/7?sceneId=scene-uuid-456
```

### Test 2.2: Page Refresh Persistence

**Steps:**
1. From Test 2.1, with scene open in Stage 7
2. Press F5 or Ctrl+R to refresh the page
3. Observe page state after reload

**Expected Results:**
- ✅ Page reloads to Stage 7 (not Stage 6)
- ✅ Same scene is still active
- ✅ URL still contains `?sceneId=:sceneId`
- ✅ Scene data loads correctly

### Test 2.3: Exit Scene Pipeline

**Steps:**
1. From Stage 7 with active scene
2. Click "Back to Script Hub" or equivalent navigation
3. Observe URL in browser address bar

**Expected Results:**
- ✅ URL changes to `/projects/:projectId/stage/6`
- ✅ `sceneId` parameter removed from URL
- ✅ Returns to Script Hub (Stage 6)
- ✅ Scene list is visible

### Test 2.4: Browser Navigation

**Steps:**
1. Navigate: Stage 6 → Select Scene → Stage 7
2. Click browser Back button
3. Click browser Forward button
4. Repeat 2-3 times

**Expected Results:**
- ✅ Back button returns to Stage 6
- ✅ Forward button returns to Stage 7 with same scene
- ✅ URL updates correctly on each navigation
- ✅ Scene context preserved throughout

### Test 2.5: Direct URL Access

**Steps:**
1. Copy a Stage 7 URL with `sceneId` parameter
2. Open new browser tab
3. Paste URL and navigate
4. Observe page state

**Expected Results:**
- ✅ Page loads directly to Stage 7
- ✅ Correct scene is active
- ✅ Scene data loads correctly
- ✅ No errors in console

---

## Test Suite 3: Prior Scene End State (Task 6)

### Test 3.1: Display Prior Scene End State

**Steps:**
1. Navigate to Stage 6
2. Select Scene 2 or later (not Scene 1)
3. Look for "Prior Scene End State" section in Scene Overview panel

**Expected Results:**
- ✅ "Prior Scene End State" section is visible
- ✅ Shows placeholder text if prior scene not completed
- ✅ Shows actual end state if prior scene completed (Stage 12)

**Note:** Since Stage 12 is not yet implemented, you will likely see no content or placeholder text. This is expected behavior.

### Test 3.2: No Prior Scene for Scene 1

**Steps:**
1. Navigate to Stage 6
2. Select Scene 1 (first scene)
3. Look for "Prior Scene End State" section

**Expected Results:**
- ✅ "Prior Scene End State" section is NOT visible
- ✅ No errors in console
- ✅ Scene Overview displays correctly

### Test 3.3: Backend Data Flow

**Steps:**
1. Navigate to Stage 6
2. Open DevTools → Network tab
3. Find `/api/projects/:id/scenes` request
4. Inspect response JSON

**Expected Results:**
- ✅ Scene 1 has `priorSceneEndState: null` or `undefined`
- ✅ Scene 2+ has `priorSceneEndState` field (may be `null` if not populated)
- ✅ No errors in response

---

## Test Suite 4: Frontend Type Safety (Task 7)

### Test 4.1: Console Error Check

**Steps:**
1. Navigate to Stage 6
2. Open DevTools → Console tab
3. Select different scenes
4. Enter/exit scene pipeline
5. Observe console for errors

**Expected Results:**
- ✅ No TypeScript errors
- ✅ No runtime errors
- ✅ No "undefined" property access errors
- ✅ No "cannot read property of null" errors

### Test 4.2: Continuity Risk Fallback

**Steps:**
1. Navigate to Stage 6
2. Select a scene
3. Observe continuity risk indicator

**Expected Results:**
- ✅ Continuity risk always has a value (never undefined)
- ✅ Default value is "safe" if not provided by backend
- ✅ UI displays risk level correctly

### Test 4.3: Expected Props Display

**Steps:**
1. Navigate to Stage 6
2. Select a scene with extracted props
3. Look for props in Scene Overview panel

**Expected Results:**
- ✅ Props array is always defined (never undefined)
- ✅ Empty array if no props extracted
- ✅ Props display correctly if present

---

## Test Suite 5: Integration Tests

### Test 5.1: Full Scene Workflow

**Steps:**
1. Start at Stage 6 (Script Hub)
2. Select Scene 1
3. Click "Enter Scene Pipeline"
4. Verify URL and scene context
5. Refresh page
6. Verify scene context persists
7. Navigate back to Stage 6
8. Select Scene 2
9. Verify continuity risk indicator
10. Verify prior scene end state section

**Expected Results:**
- ✅ All navigation works smoothly
- ✅ Scene context preserved throughout
- ✅ Continuity risk displayed correctly
- ✅ Prior scene end state handled correctly

### Test 5.2: Multiple Scene Navigation

**Steps:**
1. Navigate to Stage 6
2. Select Scene 1 → Enter Pipeline → Back to Hub
3. Select Scene 2 → Enter Pipeline → Back to Hub
4. Select Scene 3 → Enter Pipeline → Back to Hub
5. Use browser Back button to navigate history

**Expected Results:**
- ✅ Each scene loads correctly
- ✅ URL updates for each scene
- ✅ Browser history works correctly
- ✅ No memory leaks or performance degradation

---

## Performance Benchmarks

### Expected Performance Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Scene list load time | < 500ms | Network tab → `/api/projects/:id/scenes` |
| Scene selection | < 100ms | Time to update UI after click |
| URL navigation | < 50ms | Time to update URL after action |
| Page refresh | < 1s | Full page reload with scene context |
| Continuity analysis | < 50ms | Included in scene list load time |

### Performance Testing

**Steps:**
1. Open DevTools → Performance tab
2. Start recording
3. Navigate to Stage 6
4. Select 5 different scenes
5. Enter/exit scene pipeline 3 times
6. Stop recording
7. Analyze timeline

**Expected Results:**
- ✅ No long tasks (> 50ms)
- ✅ No memory leaks
- ✅ Smooth 60fps animations
- ✅ No layout thrashing

---

## Troubleshooting

### Issue: Scenes not loading

**Possible Causes:**
- Backend server not running
- Database connection issue
- No scenes in database

**Solution:**
1. Check backend server logs
2. Verify Supabase connection
3. Run Stage 4 scene extraction

### Issue: Continuity risk always "safe"

**Possible Causes:**
- No upstream stage states in database
- Scene timestamps incorrect

**Solution:**
1. Check `stage_states` table in database
2. Verify Stages 1-4 are locked
3. Check scene `updated_at` timestamps

### Issue: URL not updating

**Possible Causes:**
- React Router not configured correctly
- Navigation handler not called

**Solution:**
1. Check browser console for errors
2. Verify `useNavigate` hook is working
3. Check `handleEnterScene` function

### Issue: Prior scene end state not showing

**Possible Causes:**
- Prior scene not completed (Stage 12)
- `end_state_summary` field not populated

**Solution:**
1. This is expected behavior (Stage 12 not implemented)
2. Verify field exists in database schema
3. Check API response includes field

---

## Success Criteria

All tests pass when:

- ✅ **Task 4:** Scene list loads in <500ms with continuity risk
- ✅ **Task 5:** URL navigation works and persists scene context
- ✅ **Task 6:** Prior scene end state displays when available
- ✅ **Task 7:** No TypeScript or runtime errors
- ✅ **Integration:** Full workflow works smoothly end-to-end

---

## Reporting Issues

When reporting issues, include:

1. **Test number** (e.g., Test 2.1)
2. **Steps to reproduce**
3. **Expected vs actual behavior**
4. **Browser console errors** (screenshot)
5. **Network tab data** (screenshot)
6. **Browser and version**

---

## Next Steps After Testing

Once all tests pass:

1. Update `TASK-4-7-IMPLEMENTATION-SUMMARY.md` with test results
2. Mark all checklist items as complete
3. Commit changes with descriptive message
4. Move to next task in Feature 4.2 plan

---

## Related Documentation

- **Implementation Summary:** `TASK-4-7-IMPLEMENTATION-SUMMARY.md`
- **Plan:** `4.2-plan-v2.md` (Tasks 4-7)
- **PRD:** `project-overview.md` (Stage 6 specifications)
