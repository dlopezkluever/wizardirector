Fix Style Capsule System Issues
Problem Summary
FOUR critical issues preventing Style Capsule system from working:

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

Solution: Fix API to return camelCase directly (cleaner architecture)
Files to modify:

backend/src/routes/styleCapsules.ts
- Update SQL queries to use AS aliases for camelCase column names:
  ```sql
  SELECT
    id,
    example_text_excerpts AS "exampleTextExcerpts",
    style_labels AS "styleLabels",
    negative_constraints AS "negativeConstraints",
    freeform_notes AS "freeformNotes",
    design_pillars,
    reference_image_urls AS "referenceImageUrls",
    descriptor_strings AS "descriptorStrings",
    is_preset AS "isPreset",
    is_favorite AS "isFavorite",
    library_id AS "libraryId",
    user_id AS "userId",
    created_at AS "createdAt",
    updated_at AS "updatedAt"
  FROM style_capsules
  ```
- Remove transformation function from frontend service
- Benefits: Cleaner architecture, follows frontend conventions, eliminates transformation layer

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

Current State:
- ✅ Create: Works (but shows "Create" button even when editing)
- ✅ Read: Works (get/list operations exist)
- ❌ Update: Service supports it, UI does NOT use it
- ✅ Delete: Works (via dropdown menu, but UX is poor)

Solution: Implement proper Create vs Update logic
Files to modify:

src/components/styleCapsules/WritingStyleCapsuleEditor.tsx
- Modify handleSave() to check if capsule exists
- Call updateCapsule() for existing capsules, createCapsule() for new ones
- Update button text: "Update Style Capsule" vs "Create Style Capsule"

src/components/styleCapsules/VisualStyleCapsuleEditor.tsx
- Same changes as WritingStyleCapsuleEditor

src/pages/StyleCapsuleLibrary.tsx
- Dialog title should reflect operation: "Edit Style Capsule" vs "Create Style Capsule"
- Update success messages to reflect operation

Additional UX Improvements:
- Delete should be more accessible (not buried in dropdown)
- Better visual distinction between create/edit modes
- Form validation should work for both create and update

Testing Checklist
Issue #1 - Prompt Injection
[ ] Start new project with "Airplane!" writing style
[ ] Generate Stage 2 treatment
[ ] Check network tab for /api/llm/generate-from-template request
[ ] Verify variables.writing_style_context has actual content (not empty string)
[ ] Read generated treatment - should reflect selected style
[ ] Repeat for Stage 3 and Stage 4
Issue #2 - Search
[ ] Navigate to Style Capsules page
[ ] Type "A" in search box
[ ] Should see "Airplane!" custom capsule in results
[ ] Type "minimalist" - should find "Hemingway Minimalist"
[ ] Clear search - all capsules visible again
[ ] Test on Stage 1 capsule selector dropdown search
Issue #3 - Card Click
[ ] Click on "Airplane!" capsule card
[ ] Dialog opens showing all details in edit mode
[ ] Make change and save - should update
[ ] Click on "Hemingway Minimalist" preset
[ ] Dialog opens in read-only mode with "Duplicate" option
[ ] Close dialog works correctly
Issue #4 - CRUD Functionality
[ ] Create new writing capsule - should work
[ ] Edit existing writing capsule - should update, not create duplicate
[ ] Create new visual capsule - should work
[ ] Edit existing visual capsule - should update, not create duplicate
[ ] Delete capsule via dropdown - should work
[ ] Button text should show "Update" when editing, "Create" when creating
[ ] Dialog titles should reflect operation ("Edit" vs "Create")

*Quick Testing*:
Testing Recommendations:
The implementation is complete and ready for testing. You should now:
Test Search - Type "A" in Style Capsules page search, should find "Airplane!" capsule
Test Prompt Injection - Create project with style capsule, check network tab for /api/llm/generate-from-template to verify writing_style_context has content
Test Card Click - Click capsule cards to open view/edit dialog
Test CRUD - Create new capsule, then edit it (should update, not create duplicate)

All linter checks passed with no errors

Additional Notes & Lessons Learned

**Architecture Insights:**
- The seed templates already have {writing_style_context} placeholder - no changes needed
- The backend styleCapsuleService already has formatWritingStyleInjection() method
- Projects table has writing_style_capsule_id column but it's not being used yet

**Key Lesson: Complete CRUD Implementation**
- UI components must support both CREATE and UPDATE operations
- Never assume "edit" means "create new" - check if entity exists
- Button text and UX should clearly indicate the operation
- Service layer may support operations that UI doesn't use

**UX Principles Identified:**
- Delete functionality should be easily discoverable, not buried in menus
- Button text should accurately reflect the action
- Form validation should work for both create and update scenarios
- Visual feedback should distinguish between operations

**API Design Decision:**
- API should return camelCase to match frontend conventions
- Avoid transformation layers when possible - fix at source

**Testing Strategy:**
- Test both create AND update paths for each entity type
- Verify button text changes based on operation
- Ensure delete UX is intuitive and discoverable