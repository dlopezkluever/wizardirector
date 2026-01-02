# Phase 0.5 Testing Guide: State Persistence

## Overview
This guide outlines the testing procedures for Feature 0.5: State Persistence Hookup, which ensures pipeline state survives page refreshes.

## What Was Implemented

### Backend
1. ✅ **Stage States API Routes** (`backend/src/routes/stageStates.ts`)
   - GET `/api/projects/:projectId/stages` - Get all stage states
   - GET `/api/projects/:projectId/stages/:stageNumber` - Get specific stage
   - PUT `/api/projects/:projectId/stages/:stageNumber` - Save/update stage
   - POST `/api/projects/:projectId/stages/:stageNumber/lock` - Lock stage

2. ✅ **Server Integration** (`backend/src/server.ts`)
   - Registered stage states router
   - Protected with authentication middleware

### Frontend
1. ✅ **Stage State Service** (`src/lib/services/stageStateService.ts`)
   - Auto-save with debouncing (1 second delay)
   - Force save for immediate persistence
   - Cancel pending saves

2. ✅ **React Hooks** (`src/lib/hooks/useStageState.ts`)
   - `useStageState<T>` - Individual stage state management with auto-save
   - `useProjectStageStates` - Load all stage states for a project

3. ✅ **Component Integration**
   - Updated `ProjectView` to hydrate stage progression from database
   - Updated `Stage1InputMode` to use auto-save hooks
   - Added visual save indicators (saving/saved status)
   - Added projectId prop to all stage components (Stage1-5)

## Testing Checklist

### Test 1: Project Creation and Stage 1 Auto-Save
**Steps:**
1. ✅ Start the backend server: `cd backend && npm run dev`
2. ✅ Start the frontend: `npm run dev`
3. ✅ Log in to the application
4. ✅ Create a new project
5. ✅ In Stage 1, select an input mode (e.g., "Expansion")
6. ✅ Fill in some fields (project type, content rating, tonal precision)
7. ✅ Wait 1-2 seconds and observe the "Saving..." indicator
8. ✅ Verify "All changes saved" appears

**Expected Result:** Changes should auto-save within 1 second of editing.

### Test 2: State Persistence Across Page Refresh
**Steps:**
1. ✅ Continue from Test 1 with some data filled in Stage 1
2. ✅ Note the current state (selected mode, genres, etc.)
3. ✅ Refresh the browser page (F5 or Ctrl+R)
4. ✅ Navigate back to the same project
5. ✅ Verify all previously entered data is still present

**Expected Result:** All Stage 1 data should persist after refresh.

### Test 3: Stage Progression Persistence
**Steps:**
1. ✅ Complete Stage 1 (fill all required fields, click "Continue")
2. ✅ Refresh the page
3. ✅ Open the project again
4. ✅ Verify the project loads at Stage 2 (not Stage 1)
5. ✅ Verify Stage 1 is marked as "locked" in the timeline

**Expected Result:** The system should remember which stage you're on.

### Test 4: Multiple Projects State Isolation
**Steps:**
1. ✅ Create Project A, fill some Stage 1 data
2. ✅ Create Project B, fill different Stage 1 data
3. ✅ Refresh the page
4. ✅ Open Project A - verify it has Project A's data
5. ✅ Open Project B - verify it has Project B's data

**Expected Result:** Each project's state should be independent.

### Test 5: Database Verification (Optional)
**Steps:**
1. ✅ Complete some stage work
2. ✅ Open Supabase dashboard
3. ✅ Navigate to Table Editor → `stage_states`
4. ✅ Verify records exist with:
   - Correct `branch_id`
   - Correct `stage_number`
   - JSONB `content` field with your data
   - `status` set to 'draft' or 'locked'

**Expected Result:** Database should contain stage state records.

## API Testing with cURL (Optional)

### Get Project Stage States
```bash
curl -X GET http://localhost:3001/api/projects/{PROJECT_ID}/stages \
  -H "Authorization: Bearer {JWT_TOKEN}"
```

### Save Stage State
```bash
curl -X PUT http://localhost:3001/api/projects/{PROJECT_ID}/stages/1 \
  -H "Authorization: Bearer {JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "content": {
      "selectedMode": "expansion",
      "selectedProjectType": "narrative",
      "tonalPrecision": "Dark and mysterious"
    },
    "status": "draft"
  }'
```

## Known Limitations (Phase 0)
- No AI generation yet - all content is manually entered
- Stage 2-5 components accept projectId but don't yet fully integrate auto-save (demonstration is in Stage 1)
- No branching functionality yet (will come in later phases)
- No version history UI yet

## Troubleshooting

### Issue: "Auto-save failed" error
**Solution:** 
- Check backend is running
- Check authentication token is valid
- Check browser console for detailed error

### Issue: Stage data doesn't persist
**Solution:**
- Verify database migration ran successfully
- Check `stage_states` table exists in Supabase
- Check RLS policies are correctly configured

### Issue: Page loads slowly
**Solution:**
- This is normal on first load due to state hydration
- Check network tab to see API response times

## Next Steps (Phase 1)
- Integrate LLM service for actual content generation
- Implement Stage 2-5 with full auto-save
- Add regeneration and versioning functionality
- Implement branching system

