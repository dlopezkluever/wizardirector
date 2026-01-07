Fix 2: Stage 3 Beat Service Parsing
File: src/lib/services/beatService.ts

Current Issue: The parseBeatsResponse method (lines 262-323) has similar issues - the text field should contain plain text, not JSON objects.

Changes Needed:

Similar error handling as treatment service
Ensure beat.text contains only the text string
Validate that all required fields are present and correct types
Key Code Section (around line 262):

private parseBeatsResponse(content: string): {
  beats: Beat[];
  totalEstimatedRuntime: number;
  narrativeStructure: string;
}
---

Fix 3: Debug API Response Structure
File: src/pages/api/llm/generate-from-template.ts (if exists) or equivalent API handler

Investigation Needed:

Verify what result.data.content actually contains
Check if the LLM response is being pre-processed before reaching the service layer
Ensure consistent data structure from API to service
---

Fix 4: Add Frontend Validation
Files:

src/components/pipeline/Stage2Treatment.tsx (line 116-118)
src/components/pipeline/Stage3BeatSheet.tsx (line 314-325)
Safety Check:

Add validation before setting state to catch any data structure issues:

// Stage 2 example
if (currentVariation) {
  // Validate that content is a string, not an object
  const content = typeof currentVariation.content === 'string' 
    ? currentVariation.content 
    : JSON.stringify(currentVariation.content);
  setEditableContent(content);
}
---

Testing Strategy
Console Logging: Add temporary logs to trace data from API → Service → Component
Type Guards: Add runtime checks to verify data structure
Visual Verification: Confirm Stage 2 shows prose text and Stage 3 shows individual beats
Error Cases: Handle malformed LLM responses gracefully
---

Expected Outcomes
Stage 2 (Treatment)
✅ "Version 1", "Version 2", "Version 3" tabs display correctly
✅ Each tab shows readable prose text (not JSON)
✅ Structural emphasis shown in variation button labels or separate section
✅ Content is editable in text editor
Stage 3 (Beat Sheet)
✅ Each beat appears in its own numbered, draggable card
✅ Beat text is plain, readable text (not JSON)
✅ Beat metadata (rationale, estimated time) displays correctly
✅ Beats are editable and reorderable
---

Files to Modify
src/lib/services/treatmentService.ts - Fix parsing logic
src/lib/services/beatService.ts - Fix parsing logic  
src/components/pipeline/Stage2Treatment.tsx - Add validation
src/components/pipeline/Stage3BeatSheet.tsx - Add validation
Debugging Steps
Add console.log in parseTreatmentResponse to see raw input
Add console.log in parseBeatsResponse to see raw input
Add console.log in components to see what data they receive
Remove logs after confirming fixes work