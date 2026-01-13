# Stage 1 Lock Reversion Problem - Fix Summary

## Issue Description

Stage 1 successfully locked (version N with status: "locked"), but immediately reverted to draft status (version N+1 with status: "draft"). This created a race condition preventing Stage 2 from starting.

## Root Cause Analysis

The issue was caused by multiple factors:

1. **Duplicate `autoSave` parameter** in `Stage1InputMode.tsx`:
   - Line 111 set `autoSave: false`
   - Line 123 overrode it with `autoSave: projectId !== 'new'`
   - Result: Auto-save was actually enabled for existing projects

2. **Race condition timing**:
   - User clicks "Continue to Treatment"
   - `handleComplete()` calls `setContent(updatedContent)` (line 239)
   - This triggers the auto-save useEffect hook
   - Auto-save is scheduled with 1-second delay
   - Stage lock operation completes immediately
   - 1 second later, auto-save executes and creates a new version with status: 'draft'

3. **No backend protection**:
   - Backend PUT endpoint defaulted to `status: 'draft'` when no status provided
   - No validation to prevent locked stages from reverting to draft

## Fixes Implemented

### Fix 1: Removed Duplicate `autoSave` Parameter
**File**: `src/components/pipeline/Stage1InputMode.tsx`

- Removed the duplicate `autoSave: projectId !== 'new'` parameter (line 123)
- Kept `autoSave: false` to prevent race conditions with manual lock operations
- Added comment explaining why auto-save is disabled

### Fix 2: Cancel Pending Auto-Saves Before Completion
**File**: `src/components/pipeline/Stage1InputMode.tsx`

- Moved `setContent(updatedContent)` to AFTER the save operation
- Added `stageStateService.cancelAutoSave(project.id, 1)` before calling `onComplete()`
- This ensures no pending auto-saves can execute after the lock operation

### Fix 3: Backend Protection Against Status Regression
**File**: `backend/src/routes/stageStates.ts`

- Added status field to existing state query: `.select('id, version, status')`
- Implemented status regression prevention logic:
  ```typescript
  let finalStatus = status || 'draft';
  if (existingState?.status === 'locked' && finalStatus === 'draft') {
    console.warn('⚠️ Attempted to revert locked stage to draft - preserving locked status');
    finalStatus = 'locked';
  }
  ```
- Once a stage is locked, it cannot revert to draft status

### Fix 4: Enhanced Debug Logging
**Files**: 
- `backend/src/routes/stageStates.ts`
- `src/lib/hooks/useStageState.ts`

Added comprehensive logging to track:
- PUT endpoint: providedStatus, finalStatus, existingStatus, statusPreserved
- Lock endpoint: previousVersion, newVersion, previousStatus
- Auto-save hook: stage number, content keys, success/error status

## Testing Checklist

### Backend Server Test
- [ ] Start backend server: `cd backend && npm run dev`
- [ ] Verify no startup errors
- [ ] Check console shows enhanced logging is active

### Stage 1 Completion Flow
- [ ] Create new project
- [ ] Complete Stage 1 (select mode, add content, configure settings)
- [ ] Click "Continue to Treatment"
- [ ] Monitor backend console logs for:
  - Draft save (version N)
  - Lock operation (version N+1 with status: 'locked')
  - NO additional draft save after lock
  - If attempted, should see "⚠️ Attempted to revert locked stage to draft - preserving locked status"

### Stage 2 Access
- [ ] After Stage 1 completion, verify Stage 2 loads successfully
- [ ] Verify Stage 1 shows as "locked" in the UI
- [ ] Verify no error about Stage 1 not being locked

### Network Tab Verification
- [ ] Open browser DevTools Network tab
- [ ] Complete Stage 1
- [ ] Filter for `/api/projects/.../stages/1` requests
- [ ] Verify sequence:
  1. PUT with status: 'draft' (saves content)
  2. POST to `/lock` endpoint (locks stage)
  3. No additional PUT requests after lock

## Expected Behavior After Fix

1. User completes Stage 1
2. System saves Stage 1 with status: 'draft' (version N)
3. System locks Stage 1 with status: 'locked' (version N+1)
4. **NO version N+2 is created**
5. If auto-save attempts to fire, backend preserves 'locked' status
6. Stage 2 loads successfully

## Files Modified

### Frontend
- `src/components/pipeline/Stage1InputMode.tsx` - Fixed auto-save configuration and completion flow
- `src/lib/hooks/useStageState.ts` - Added debug logging for auto-save triggers

### Backend
- `backend/src/routes/stageStates.ts` - Added status regression protection and enhanced logging

## Rollback Instructions

If this fix causes issues, revert these commits:
1. Stage1InputMode.tsx - Restore original `autoSave` configuration
2. stageStates.ts - Remove status regression check
3. useStageState.ts - Remove debug logging

## Additional Notes

- The fix is defensive with multiple layers of protection
- Backend protection acts as a safety net even if frontend issues arise
- Enhanced logging will help diagnose any future stage progression issues
- Auto-save is intentionally disabled for Stage 1 to prevent race conditions

## Related Issue Documentation

See: `Issue - Lock Revision Problem.md`

