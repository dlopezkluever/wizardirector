We have the following major probelms with our Style Capsule Implementation (features 2.0-2.2):
1. **Prompt injection always empty** - writing_style_context variable is "" in all API calls
2. **Search doesn't work** - Snake_case/camelCase property mismatch
3. **Card clicks do nothing** - No view/edit dialog implemented
4. **CRUD functionality incomplete** - Editors only CREATE, never UPDATE existing capsules
Issue #1: Fix Prompt Injection (Priority: CRITICAL)
Root Cause
The frontend services call styleCapsuleService.formatWritingStyleInjection() which doesn't exist. Only the backend has this method. The frontend should just pass the capsule ID, and the backend should handle formatting.

Architecture Flow
graph LR
    Stage1[Stage 1<br/>Save capsuleId] --> Stage2[Stage 2-4<br/>Retrieve capsuleId]
    Stage2 --> Frontend[Frontend Service<br/>Pass capsuleId in request]
    Frontend --> Backend[Backend<br/>Fetch & format capsule]
    Backend --> LLM[LLM with injected style]
Solution A: Frontend passes ID, backend does formatting (RECOMMENDED)
Files to modify:

src/lib/services/treatmentService.ts (lines 51-74)

Remove the frontend formatting attempt
Simply pass writingStyleCapsuleId directly in the LLM request
Let backend handle fetching and formatting
const variables = {
  // ... existing variables ...
  writing_style_capsule_id: request.processedInput.projectParams.writingStyleCapsuleId || ''
};
src/lib/services/beatService.ts (lines 45-65)

Same changes as treatmentService
src/lib/services/scriptService.ts (lines 61-81, 131-151)

Same changes for both generateScript and regenerateScript
backend/src/routes/llm.ts (lines 138-222)

In the /generate-from-template endpoint, detect if writing_style_capsule_id variable is provided
If yes, fetch the capsule and format it using styleCapsuleService.formatWritingStyleInjection()
Replace the variable with the formatted context before interpolation
Solution B: Add formatWritingStyleInjection to frontend (ALTERNATIVE)
If you prefer client-side formatting, add the method to src/lib/services/styleCapsuleService.ts and handle it there. However, Solution A is cleaner as it keeps formatting logic in one place.

Critical: Ensure writingStyleCapsuleId is passed through stages
src/components/pipeline/Stage3BeatSheet.tsx (lines 318-328)

Add writingStyleCapsuleId to projectParams when calling beatService
const treatmentData = {
  treatmentProse: selectedTreatment.content,
  selectedVariantId: selectedTreatment.id,
  projectParams: {
    ...stage2State.content.processedInput?.projectParams,
    writingStyleCapsuleId: stage2State.content.writingStyleCapsuleId || 
                            stage2State.content.processedInput?.projectParams?.writingStyleCapsuleId
  }
};
src/components/pipeline/Stage4MasterScript.tsx (lines 238-244)

Add writingStyleCapsuleId when building params for script generation

Issue #2: Fix Search (Priority: HIGH)
Root Cause
Backend returns snake_case (example_text_excerpts), frontend expects camelCase (exampleTextExcerpts).

Solution: **Transform in frontend service**

Files to modify:

src/lib/services/styleCapsuleService.ts - Add transformer function:

// Add after imports
function transformCapsule(capsule: any): StyleCapsule {
  return {
    ...capsule,
    exampleTextExcerpts: capsule.example_text_excerpts,
    styleLabels: capsule.style_labels,
    negativeConstraints: capsule.negative_constraints,
    freeformNotes: capsule.freeform_notes,
    designPillars: capsule.design_pillars,
    referenceImageUrls: capsule.reference_image_urls,
    descriptorStrings: capsule.descriptor_strings,
    isPreset: capsule.is_preset,
    isFavorite: capsule.is_favorite,
    libraryId: capsule.library_id,
    userId: capsule.user_id,
    createdAt: capsule.created_at,
    updatedAt: capsule.updated_at
  };
}
Apply transformer in:

getCapsules() - line 48
getCapsule() - line 75
createCapsule() - line 103
updateCapsule() - line 131
toggleFavorite() - line 182
duplicateCapsule() - line 210
uploadImage() - line 240
removeImage() - line 267

Issue #3: Add Card Click View/Edit (Priority: MEDIUM)
Solution: Add dialog that displays when selectedCapsule is set
Files to modify:

src/pages/StyleCapsuleLibrary.tsx

Add dialog before the closing </div> (around line 568):

{/* View/Edit Selected Capsule Dialog */}
<Dialog open={!!selectedCapsule} onOpenChange={(open) => !open && setSelectedCapsule(null)}>
  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>
        {selectedCapsule?.isPreset ? 'View' : 'Edit'} Style Capsule
      </DialogTitle>
      <DialogDescription>
        {selectedCapsule?.isPreset 
          ? 'Preset capsules are read-only. Duplicate to customize.'
          : 'Modify the style capsule properties below.'}
      </DialogDescription>
    </DialogHeader>
    {selectedCapsule && (
      selectedCapsule.type === 'writing' ? (
        <WritingStyleCapsuleEditor
          capsule={selectedCapsule}
          onSave={async () => {
            setSelectedCapsule(null);
            await loadData();
            toast({ title: 'Success', description: 'Style capsule updated.' });
          }}
          onCancel={() => setSelectedCapsule(null)}
          readOnly={selectedCapsule.isPreset}
        />
      ) : (
        <VisualStyleCapsuleEditor
          libraries={libraries}
          capsule={selectedCapsule}
          onSave={async () => {
            setSelectedCapsule(null);
            await loadData();
            toast({ title: 'Success', description: 'Style capsule updated.' });
          }}
          onCancel={() => setSelectedCapsule(null)}
          readOnly={selectedCapsule.isPreset}
        />
      )
    )}
  </DialogContent>
</Dialog>
Update renderCapsuleCard() (line 203) to make entire card clickable:

<Card 
  className="h-full hover:shadow-md transition-shadow cursor-pointer group"
  onClick={() => setSelectedCapsule(capsule)}
>
Add readOnly prop support to editors:

WritingStyleCapsuleEditor.tsx - Add readOnly prop, disable inputs when true
VisualStyleCapsuleEditor.tsx - Add readOnly prop, disable inputs when true

Issue #4: Fix CRUD Functionality (Priority: CRITICAL - COMPLETELY BROKEN)
Root Cause
Editors only support CREATE operations, never UPDATE existing capsules. The handleSave() function always calls createCapsule(), never checks if editing existing capsule.

--------------------------------------------

I'll implement the solution systematically, 

## ✅ Implementation Complete!

I've successfully implemented all four critical fixes for the Style Capsule system:

### **Issue #1: Fix Prompt Injection (CRITICAL)** ✅
**Problem:** Writing style context was always empty because frontend tried to call non-existent `formatWritingStyleInjection()` method.

**Solution:**
- **Frontend** (`treatmentService.ts`, `beatService.ts`, `scriptService.ts`): Removed frontend formatting attempts, now passes `writing_style_capsule_id` variable to backend
- **Backend** (`llm.ts`): Added variable interception logic that detects `writing_style_capsule_id`, fetches the capsule, formats it using the backend service, and injects the formatted context before template interpolation

### ✅ **Issue #2 Fixed (Revised Approach): JavaScript Transformation Layer**
**Problem:** Backend returned snake_case properties, frontend expected camelCase.
### **What Changed:**

1. **Created Transformer Module** - `backend/src/transformers/styleCapsule.ts`
   - `capsuleToApi()` - transforms single capsule
   - `capsulesToApi()` - transforms array of capsules  
   - `libraryToApi()` - transforms single library
   - `librariesToApi()` - transforms array of libraries

2. **Updated API Routes** - `backend/src/routes/styleCapsules.ts`
   - Added transformer imports
   - Applied transformations at **every `res.json()` call** (11 endpoints)
   - Kept all SQL queries clean with snake_case (no AS aliases)
   - Write operations unchanged (already correctly map camelCase → snake_case)

### **Endpoints Transformed:**

1. `GET /` - List capsules
2. `GET /:id` - Get single capsule
3. `POST /` - Create capsule
4. `PUT /:id` - Update capsule
5. `POST /:id/favorite` - Toggle favorite
6. `POST /:id/duplicate` - Duplicate capsule
7. `POST /:id/upload-image` - Upload image
8. `DELETE /:id/images/:imageIndex` - Remove image
9. `GET /libraries/all` - List libraries
10. `POST /libraries` - Create library

The system now has a clean, maintainable architecture where:
- **Database** speaks snake_case (SQL standard)
- **API** speaks camelCase (JavaScript standard)
- **Transformer** bridges the gap at the response boundary

### **Issue #3: Add Card Click View/Edit Dialog (MEDIUM)** ✅
**Problem:** Clicking capsule cards did nothing.

**Solution:**
- Made cards clickable in `StyleCapsuleLibrary.tsx` with `onClick={() => setSelectedCapsule(capsule)}`
- Added Dialog component that opens when a capsule is selected
- Dialog shows appropriate editor (Writing or Visual) based on capsule type
- Supports both view (preset) and edit (custom) modes

### **Issue #4: Fix CRUD Operations (CRITICAL)** ✅
**Problem:** Editors only supported CREATE, never UPDATE existing capsules.

**Solution:**
- **WritingStyleCapsuleEditor.tsx** & **VisualStyleCapsuleEditor.tsx**:
  - Added `readOnly` prop for preset capsules
  - Implemented edit vs create mode detection (`isEditMode = !!capsule?.id`)
  - `handleSave()` now calls `updateCapsule()` for existing capsules, `createCapsule()` for new ones
  - Button text dynamically shows "Update" vs "Create"
  - All inputs disabled when `readOnly === true`
  - Add/remove buttons hidden in read-only mode

### **Testing Recommendations:**

The implementation is complete and ready for testing. You should now:

1. **Test Search** - Type "A" in Style Capsules page search, should find "Airplane!" capsule
2. **Test Prompt Injection** - Create project with style capsule, check network tab for `/api/llm/generate-from-template` to verify `writing_style_context` has content
3. **Test Card Click** - Click capsule cards to open view/edit dialog
4. **Test CRUD** - Create new capsule, then edit it (should update, not create duplicate)

All linter checks passed with no errors! 🎉

You're absolutely right! The JavaScript transformation layer is cleaner and more maintainable. Let me implement it properly now.

[19 tools called]

Perfect! ✅ I've successfully implemented the JavaScript transformation layer approach. Here's what I did:

## ✅ **Issue #2 Fixed (Revised Approach): JavaScript Transformation Layer**

### **What Changed:**

1. **Created Transformer Module** - `backend/src/transformers/styleCapsule.ts`
   - `capsuleToApi()` - transforms single capsule
   - `capsulesToApi()` - transforms array of capsules  
   - `libraryToApi()` - transforms single library
   - `librariesToApi()` - transforms array of libraries

2. **Updated API Routes** - `backend/src/routes/styleCapsules.ts`
   - Added transformer imports
   - Applied transformations at **every `res.json()` call** (11 endpoints)
   - Kept all SQL queries clean with snake_case (no AS aliases)
   - Write operations unchanged (already correctly map camelCase → snake_case)

### **Why This Approach is Better:**

✅ **Single source of truth** - One place to manage field mappings  
✅ **Clean SQL** - Database queries stay readable with native snake_case  
✅ **Transform at the edge** - Boundary layer between DB and API  
✅ **Easy to extend** - Can add computed fields, API versioning, etc.  
✅ **Testable** - Transformer functions are pure and unit-testable  
✅ **No SQL magic** - No repeated AS aliases in queries  

### **Endpoints Transformed:**

1. `GET /` - List capsules
2. `GET /:id` - Get single capsule
3. `POST /` - Create capsule
4. `PUT /:id` - Update capsule
5. `POST /:id/favorite` - Toggle favorite
6. `POST /:id/duplicate` - Duplicate capsule
7. `POST /:id/upload-image` - Upload image
8. `DELETE /:id/images/:imageIndex` - Remove image
9. `GET /libraries/all` - List libraries
10. `POST /libraries` - Create library

All linter checks pass with no errors! 🎉

The system now has a clean, maintainable architecture where:
- **Database** speaks snake_case (SQL standard)
- **API** speaks camelCase (JavaScript standard)
- **Transformer** bridges the gap at the response boundary


----------------------------------------

## Implementation Complete! ✅

I've successfully implemented all the fixes from the plan. Here's what was done:

### **Issue #1: Prompt Injection (FIXED)** ✅
- **Modified `src/lib/services/inputProcessingService.ts`**: Added `writingStyleCapsuleId` to the `InputProcessingRequest` interface and ensured it's extracted and included in `processedInput.projectParams`
- **Modified `src/components/pipeline/Stage1InputMode.tsx`**: Passed `writingStyleCapsuleId` when calling `processInput()` and `validateInput()`
- **Modified `src/components/pipeline/Stage3BeatSheet.tsx`**: Ensured `writingStyleCapsuleId` is passed from Stage 2's processedInput to the beat service
- **Modified `src/components/pipeline/Stage4MasterScript.tsx`**: Added Stage 2 state retrieval and included `writingStyleCapsuleId` in projectParams

**Result**: The `writingStyleCapsuleId` now flows from Stage 1 → Stage 2 → Stage 3 → Stage 4 and is sent to the backend LLM endpoint.

### **Issue #2: Search Filtering (FIXED)** ✅
- **Modified `src/components/styleCapsules/StyleCapsuleSelector.tsx`**: 
  - Fixed search by making `CommandItem` value searchable (includes name + labels)
  - Command component now properly filters by content instead of just IDs
  - Reordered capsules: Favorites → Custom → Presets

**Result**: Search now works correctly in the dropdown, and capsules appear in the proper order.

### **Issue #3: Empty Card Data (FIXED)** ✅
- **Modified `src/pages/StyleCapsuleLibrary.tsx`**:
  - Created `handleCapsuleClick()` function that fetches full capsule details using `styleCapsuleService.getCapsule()`
  - Updated all `onClick` handlers to use this function
  - Also applied the same Favorites → Custom → Presets ordering to the library page

**Result**: Clicking capsule cards now displays all content (no longer empty).

### **Issue #4A: Update Operation (FIXED)** ✅
- **Modified `backend/src/routes/styleCapsules.ts`**:
  - Updated the PUT endpoint to properly transform camelCase request body to snake_case database fields
  - Added explicit field mapping for all updateable properties

**Result**: Updating capsules now works without errors.

### **Issue #4B: Delete & Duplicate Buttons (FIXED)** ✅
- **Modified `src/components/styleCapsules/WritingStyleCapsuleEditor.tsx`**:
  - Added `onDelete` and `onDuplicate` props
  - Added Delete button (left side, destructive variant) for non-preset capsules
  - Added Duplicate button (right side) for preset capsules in read-only mode
  - Imported `Trash2` and `Copy` icons

- **Modified `src/components/styleCapsules/VisualStyleCapsuleEditor.tsx`**:
  - Same changes as WritingStyleCapsuleEditor

- **Modified `src/pages/StyleCapsuleLibrary.tsx`**:
  - Passed `onDelete` handler that opens the delete confirmation dialog
  - Passed `onDuplicate` handler that calls the existing `handleDuplicateCapsule()` function

**Result**: Users can now easily delete capsules directly from the edit dialog and duplicate presets to customize them.

### Files Modified:
1. ✅ `src/lib/services/inputProcessingService.ts`
2. ✅ `src/components/pipeline/Stage1InputMode.tsx`
3. ✅ `src/components/pipeline/Stage3BeatSheet.tsx`
4. ✅ `src/components/pipeline/Stage4MasterScript.tsx`
5. ✅ `src/components/styleCapsules/StyleCapsuleSelector.tsx`
6. ✅ `src/pages/StyleCapsuleLibrary.tsx`
7. ✅ `src/components/styleCapsules/WritingStyleCapsuleEditor.tsx`
8. ✅ `src/components/styleCapsules/VisualStyleCapsuleEditor.tsx`
9. ✅ `backend/src/routes/styleCapsules.ts`

All linter checks passed with no errors! The implementation is ready for testing.

-----------------------------------------
Excellent news! Looking at your logs, **Issue 1 is actually WORKING!** 🎉

## Issue 1: Prompt Injection - WORKING! ✅

Look at these key lines from your logs:

```
[API] Capsule fetch result: {
  found: true,
  type: 'writing',
  name: 'Airplane!',
  hasExcerpts: true,
  excerptCount: 1
}
[API] Injected writing style context (149428 chars): Example excerpts:
```

And then:
```
[API] Template interpolated successfully. System prompt length: 150757, User prompt length: 4379
```

**The system is working perfectly!** The confusion is that you're looking at the **REQUEST payload** which shows `writing_style_context: ""` - that's the INPUT. The backend then:
1. Sees the `writing_style_capsule_id`
2. Fetches the capsule (successfully!)
3. Formats it into 149,428 characters of context
4. Injects it into the prompt (system prompt went from ~1,300 chars to 150,757 chars!)

The style is being injected! ✅

---

## Issue 3: Visual Capsule Images Not Showing

Let me investigate the image save/load flow:

[7 tools called]

Ah, I found the issue with the images! Looking at the `ImageUploader` component (lines 105-107), it **only uploads images if a `capsuleId` is provided**. But when creating a NEW visual capsule, there's no capsuleId yet!

The workflow is broken:
1. User selects images → ImageUploader queues them but doesn't upload (no capsuleId)
2. User clicks "Create" → Capsule is created with empty `referenceImageUrls`
3. Images are never uploaded

Let me fix this by implementing a two-step process for new capsules:

[2 tools called]

Now I need to update the ImageUploader component to expose the files for new capsules. Let me add a prop that returns the raw File objects when there's no capsuleId:

[10 tools called]

Perfect! All changes are complete and linted. Here's a summary of what I fixed:

## Summary of Fixes

### ✅ **Issue 1: Prompt Injection - CONFIRMED WORKING!**
Your logs show it's working perfectly:
- Capsule is fetched: ✅ `found: true, name: 'Airplane!'`
- Context injected: ✅ `149,428 characters`
- System prompt expanded: ✅ `1,300 → 150,757 chars`

The confusion was looking at the REQUEST payload (which has empty string) instead of what the backend processes. **The style IS being injected!**

### ✅ **Issue 2: Duplicate Without Library - FIXED!**
Removed all library requirements - you can now duplicate presets directly.

### ✅ **Issue 3: Visual Capsule Images - FIXED!**
**Root cause**: ImageUploader only uploads when `capsuleId` exists. For NEW capsules, there's no ID yet!

**Solution implemented**:
1. **For new capsules**: User selects images → stored as pending files → capsule created → images uploaded
2. **For existing capsules**: Images upload immediately (existing flow)
3. **Added UI feedback**: Shows "Selected Images (will upload after save)" with file names
4. **Added useEffect**: Syncs existing images when capsule loads

**Files modified**:
- `src/components/styleCapsules/VisualStyleCapsuleEditor.tsx` - Two-step save process
- `src/components/styleCapsules/ImageUploader.tsx` - New `onFilesSelected` prop
- `backend/src/routes/llm.ts` - Enhanced logging (already done)
- `backend/src/routes/styleCapsules.ts` - Removed library requirement
- `src/pages/StyleCapsuleLibrary.tsx` - Removed library check
- `src/lib/services/styleCapsuleService.tsx` - Made libraryId optional

All linter checks passed! Test and let me know how it works.