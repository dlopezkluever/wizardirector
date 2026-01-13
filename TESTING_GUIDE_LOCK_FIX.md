# Testing Guide: Stage 1 Lock Reversion Fix

## Quick Test (5 minutes)

### Prerequisites
1. Backend server running: `cd backend && npm run dev`
2. Frontend server running: `npm run dev`
3. Browser DevTools open (F12)

### Test Steps

#### Step 1: Create New Project
1. Navigate to your application
2. Click "Create New Project"
3. You should see Stage 1 InputMode

#### Step 2: Complete Stage 1
1. **Select Input Mode**: Choose "Expansion"
2. **Enter Idea**: Type at least 20 characters in the text area
3. **Select Project Type**: Choose "Narrative Short Film"
4. **Set Target Length**: Use the slider (default 3-5 min is fine)
5. **Select Content Rating**: Choose any rating (e.g., PG-13)
6. **Select Genres**: Click at least one genre
7. **Enter Tonal Precision**: Type at least 10 characters describing the tone
8. **(Optional) Select Writing Style**: Choose a writing style capsule or leave blank

#### Step 3: Monitor Network Activity
1. Open DevTools Network tab
2. Filter by "stages" or "/api/projects"
3. Click "Continue to Treatment" button

#### Step 4: Verify Correct Behavior

**In Network Tab**, you should see this sequence:
```
1. PUT /api/projects/{id}/stages/1
   Request: { content: {...}, status: "draft" }
   Response: { ..., version: N, status: "draft" }

2. POST /api/projects/{id}/stages/1/lock
   Response: { ..., version: N+1, status: "locked" }

3. GET /api/projects/{id}/stages (refresh stage states)
```

**❌ YOU SHOULD NOT SEE:**
```
4. PUT /api/projects/{id}/stages/1  ← This is the bug
   Request: { content: {...}, status: undefined }
   Response: { ..., version: N+2, status: "draft" }
```

**In Backend Console**, look for:
```bash
✅ Good sequence:
🔄 PUT /api/projects/:projectId/stages/:stageNumber called: {..., providedStatus: 'draft'}
💾 Inserting stage state: {..., finalStatus: 'draft'}
✅ Stage state inserted successfully

🔒 POST /api/projects/:projectId/stages/:stageNumber/lock called
💾 Creating locked stage state: {..., previousStatus: 'draft'}
✅ Stage locked successfully: {..., status: 'locked'}

❌ If you see this WARNING (and no error), the fix is working:
⚠️ Attempted to revert locked stage to draft - preserving locked status
💾 Inserting stage state: {..., finalStatus: 'locked', statusPreserved: true}
```

#### Step 5: Verify Stage 2 Loads
1. After clicking "Continue to Treatment", you should navigate to Stage 2
2. Stage 2 should load without errors
3. You should NOT see an error like "Stage 1 must be locked first"

#### Step 6: Verify Stage 1 Status
1. Check the stage timeline/progress UI
2. Stage 1 should show as "locked" or "completed"
3. Stage 1 should NOT show as "active" or "draft"

## Debug Mode Test (If Issues Occur)

### Enable Verbose Logging

**Frontend Console Logging:**
Open browser console (F12 → Console tab) and look for:
- `🔍 [DEBUG] Stage 1 -` messages
- `⏳ Auto-save scheduled` messages
- `🧹 Cleaning up auto-save` messages

**Backend Console Logging:**
Your backend console should show:
- `🔄 PUT /api/projects/:projectId/stages/:stageNumber called:`
- `💾 Inserting stage state:`
- `🔒 POST /api/projects/:projectId/stages/:stageNumber/lock called:`
- `✅ Stage locked successfully:`

### Common Issues and Solutions

#### Issue: "Stage 1 must be locked first" error when accessing Stage 2
**Diagnosis**: The lock operation might have failed
**Check**:
1. Backend console for lock endpoint errors
2. Network tab for failed POST to `/lock` endpoint
3. Database: Query `stage_states` table for stage_number = 1, check latest version's status

#### Issue: Version N+2 still appears with status: 'draft'
**Diagnosis**: Frontend auto-save may still be triggering
**Check**:
1. Frontend console for `⏳ Auto-save scheduled` messages after completion
2. `Stage1InputMode.tsx` line 111: Verify `autoSave: false`
3. Backend console should show: `⚠️ Attempted to revert locked stage to draft`

#### Issue: Auto-save triggers but status stays locked (Expected!)
**Diagnosis**: This is the backend protection working correctly
**Verify**:
1. Backend console shows: `statusPreserved: true`
2. The extra version is created but with status: 'locked'
3. Stage 2 still loads successfully

## Manual Database Verification

If you want to verify the database directly:

```sql
-- View all stage states for your project
SELECT 
  id,
  stage_number,
  version,
  status,
  created_at
FROM stage_states
WHERE branch_id = (
  SELECT active_branch_id 
  FROM projects 
  WHERE id = 'your-project-id'
)
ORDER BY stage_number, version;

-- Expected result for Stage 1:
-- version 1: status = 'draft' (or earlier versions)
-- version 2: status = 'draft' (final save before lock)
-- version 3: status = 'locked' (lock operation)
-- NO version 4 with status = 'draft'
```

## Success Criteria

✅ **Fix is successful if:**
1. Stage 1 locks and stays locked
2. Stage 2 loads without errors
3. No additional draft versions created after lock
4. Backend logs show proper status preservation if auto-save triggers

❌ **Fix failed if:**
1. Stage 2 shows "Stage 1 must be locked first" error
2. Network tab shows version N+2 with status: 'draft'
3. Backend logs don't show the status preservation warning

## Performance Check

The fix should not negatively impact performance:
- Stage 1 completion time should be unchanged (~100-500ms)
- No additional network requests (unless auto-save triggered, which is prevented)
- Backend protection adds minimal overhead (~1ms per save operation)

## Rollback Plan

If issues arise, you can quickly rollback:

```bash
# Rollback the changes
git log --oneline -5  # Find the commit hashes
git revert <commit-hash>  # Revert the fix commits

# Or manually restore files
git checkout HEAD~1 -- src/components/pipeline/Stage1InputMode.tsx
git checkout HEAD~1 -- backend/src/routes/stageStates.ts
git checkout HEAD~1 -- src/lib/hooks/useStageState.ts
```

## Next Steps After Successful Test

1. ✅ Mark the issue as resolved
2. ✅ Document the fix in project notes
3. ✅ Consider adding automated tests for stage locking flow
4. ✅ Monitor for any related issues in other stages
5. ✅ Clean up any extra debug logging if desired (optional)

## Questions to Ask Yourself

- [ ] Did Stage 1 lock successfully?
- [ ] Did Stage 2 load without errors?
- [ ] Were there any unexpected network requests?
- [ ] Did the backend logs show the expected sequence?
- [ ] Can I navigate back to Stage 1 and see it as locked?

If you answered "Yes" to all questions, the fix is working! 🎉

