Fix Style Capsule System Issues
Problem Summary
Three critical issues preventing Style Capsule system from working:

Prompt injection always empty - writing_style_context variable is "" in all API calls
Search doesn't work - Snake_case/camelCase property mismatch 
Card clicks do nothing - No view/edit dialog implemented
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

Solution: Add camelCase transformation in API response handler
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
Additional Notes
The seed templates already have {writing_style_context} placeholder - no changes needed
The backend styleCapsuleService already has formatWritingStyleInjection() method
Projects table has writing_style_capsule_id column but it's not being used yet