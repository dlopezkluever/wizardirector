Improved Plan:

Fix Style Capsule System Issues
Architecture Overview
The Style Capsule system has a template-based prompt injection architecture:

graph LR
    Frontend[Frontend Service] -->|Pass capsule ID| BackendAPI[Backend LLM API]
    BackendAPI -->|Fetch capsule| StyleService[Style Capsule Service]
    StyleService -->|Format injection| BackendAPI
    BackendAPI -->|Interpolate template| LLM[LLM Generation]
Current Flow (BROKEN):

Frontend tries to format capsule (method doesn't exist) → empty string
Backend receives empty writing_style_context variable
LLM generates without style guidance
Fixed Flow:

Frontend passes writing_style_capsule_id variable
Backend detects this variable before interpolation
Backend fetches capsule and formats injection
Backend replaces variable with formatted context
LLM receives complete style guidance
---

Issue #1: Fix Prompt Injection (CRITICAL)
Root Cause
Frontend services call non-existent formatWritingStyleInjection() method
Backend API doesn't intercept and process writing_style_capsule_id variable
Result: writing_style_context is always empty string
Solution: Backend-side Formatting
Step 1: Update Frontend Services
Remove frontend formatting attempts, pass capsule ID as variable instead.

Files to modify:

src/lib/services/treatmentService.ts (lines 51-74)
src/lib/services/beatService.ts (lines 45-65)
src/lib/services/scriptService.ts (lines 61-81, 131-151)
Changes:

// BEFORE (broken):
let writingStyleContext = '';
if (request.projectParams.writingStyleCapsuleId) {
  try {
    const capsule = await styleCapsuleService.getCapsule(...);
    writingStyleContext = styleCapsuleService.formatWritingStyleInjection(capsule); // Method doesn't exist!
  } catch (error) {
    console.warn('Failed to load writing style capsule:', error);
  }
}

const variables = {
  // ...other variables
  writing_style_context: writingStyleContext // Always empty!
};

// AFTER (working):
const variables = {
  // ...other variables
  writing_style_context: '', // Empty placeholder
  writing_style_capsule_id: request.projectParams.writingStyleCapsuleId || '' // Pass ID
};
Step 2: Add Backend Variable Interception
Detect and process writing_style_capsule_id before template interpolation.

File: backend/src/routes/llm.ts (after line 186, before interpolation)

Add logic:

// After validation passes (line 186), before interpolation (line 191):

// Handle writing style capsule injection
if (validatedRequest.variables.writing_style_capsule_id && 
    typeof validatedRequest.variables.writing_style_capsule_id === 'string' &&
    validatedRequest.variables.writing_style_capsule_id.trim() !== '') {
  
  console.log(`[API] Processing writing style capsule: ${validatedRequest.variables.writing_style_capsule_id}`);
  
  try {
    const { StyleCapsuleService } = await import('../services/styleCapsuleService.js');
    const styleCapsuleService = new StyleCapsuleService();
    
    const capsule = await styleCapsuleService.getCapsuleById(
      validatedRequest.variables.writing_style_capsule_id,
      req.user!.id
    );
    
    if (capsule) {
      const formattedContext = styleCapsuleService.formatWritingStyleInjection(capsule);
      validatedRequest.variables.writing_style_context = formattedContext;
      console.log(`[API] Injected writing style context (${formattedContext.length} chars)`);
    } else {
      console.warn(`[API] Style capsule not found: ${validatedRequest.variables.writing_style_capsule_id}`);
      validatedRequest.variables.writing_style_context = '';
    }
  } catch (error) {
    console.error('[API] Failed to load writing style capsule:', error);
    validatedRequest.variables.writing_style_context = '';
  }
} else {
  // Ensure variable exists even if not provided
  if (!validatedRequest.variables.writing_style_context) {
    validatedRequest.variables.writing_style_context = '';
  }
}

// Now proceed with interpolation (existing line 191)
---

Issue #2: Fix Search Functionality (HIGH PRIORITY)
Root Cause
Backend returns snake_case property names directly from Supabase. Frontend expects camelCase per JavaScript conventions.

Example mismatch:

Backend: example_text_excerpts, style_labels, design_pillars
Frontend: exampleTextExcerpts, styleLabels, designPillars
Solution: Use SQL AS Aliases (Cleaner Architecture)
Fix at the source by using PostgreSQL column aliases in SELECT queries. No transformation code needed.

File: backend/src/routes/styleCapsules.ts

Standard Alias Pattern
SELECT
  id,
  name,
  type,
  library_id AS "libraryId",
  user_id AS "userId",
  example_text_excerpts AS "exampleTextExcerpts",
  style_labels AS "styleLabels",
  negative_constraints AS "negativeConstraints",
  freeform_notes AS "freeformNotes",
  design_pillars AS "designPillars",
  reference_image_urls AS "referenceImageUrls",
  descriptor_strings AS "descriptorStrings",
  is_preset AS "isPreset",
  is_favorite AS "isFavorite",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
FROM style_capsules
Queries to Update
GET / (line ~30) - List all capsules with join
GET /:id (line ~66) - Single capsule fetch
POST / (line ~132) - Create with .select()
PUT /:id (lines ~167, ~186) - Ownership check + update
DELETE /:id (line ~212) - Ownership check
POST /:id/favorite - Toggle favorite
POST /:id/duplicate - Duplicate preset
POST /:id/upload-image - Image upload response
GET /libraries/all - Libraries list endpoint
Note: For PUT operations, frontend sends camelCase, so we still map to snake_case for writes (lines 108-129 already handle this correctly).

Benefits:

No transformation layer needed
Fixes format at source
Simpler architecture
PostgreSQL native feature
---

Issue #3: Add Card Click View/Edit Dialog (MEDIUM PRIORITY)
Solution: Make Cards Clickable + Add Edit Dialog
File: src/pages/StyleCapsuleLibrary.tsx

Step 3.1: Make Card Clickable (line 203)
// BEFORE:
<Card className="h-full hover:shadow-md transition-shadow cursor-pointer group">

// AFTER:
<Card 
  className="h-full hover:shadow-md transition-shadow cursor-pointer group"
  onClick={() => setSelectedCapsule(capsule)}
>
Step 3.2: Add View/Edit Dialog (before closing </div>, around line 568)
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
Step 3.3: Add readOnly Prop to Editors
Files:

src/components/styleCapsules/WritingStyleCapsuleEditor.tsx
src/components/styleCapsules/VisualStyleCapsuleEditor.tsx
Changes:

Add readOnly?: boolean to props interface
Pass disabled={readOnly} to all input fields
Hide Save button when readOnly === true
Show "Duplicate" button for preset capsules instead
---

Issue #4: Fix CRUD Operations in Editors (CRITICAL)
Root Cause
Editors always call createCapsule(), never updateCapsule(). No logic to detect edit vs create mode.

Files to modify:

src/components/styleCapsules/WritingStyleCapsuleEditor.tsx
src/components/styleCapsules/VisualStyleCapsuleEditor.tsx
Changes in handleSave():

// Detect if editing existing capsule
const isEditMode = !!capsule?.id;

if (isEditMode) {
  // UPDATE existing capsule
  await styleCapsuleService.updateCapsule(capsule.id, {
    name,
    exampleTextExcerpts,
    styleLabels,
    // ...other fields
  });
} else {
  // CREATE new capsule
  await styleCapsuleService.createCapsule({
    name,
    type: 'writing',
    libraryId: selectedLibrary,
    exampleTextExcerpts,
    styleLabels,
    // ...other fields
  });
}
Update button text:

<Button onClick={handleSave} disabled={!isValid}>
  {isEditMode ? 'Update' : 'Create'} Style Capsule
</Button>
---

Testing Checklist
Issue #1: Prompt Injection
[ ] Create project with "Airplane!" style capsule
[ ] Generate Stage 2 treatment
[ ] Check network tab: /api/llm/generate-from-template request
[ ] Verify variables.writing_style_context has content (not empty)
[ ] Read generated treatment - should reflect selected style
[ ] Repeat for Stage 3 (beats) and Stage 4 (script)
Issue #2: Search Functionality
[ ] Go to Style Capsules page
[ ] Type "A" in search - should find "Airplane!"
[ ] Type "minimalist" - should find "Hemingway Minimalist"
[ ] Test Stage 1 capsule selector dropdown search
Issue #3: Card Click View/Edit
[ ] Click "Airplane!" card - dialog opens in edit mode
[ ] Make change and save - should update
[ ] Click preset card - opens in read-only mode
[ ] Test close dialog functionality
Issue #4: CRUD Operations
[ ] Create new capsule - should work
[ ] Edit existing capsule - button says "Update", should update not duplicate
[ ] Verify no duplicate capsules created
[ ] Delete capsule - should work
---

Implementation Order
Issue #2 (Search) - Fastest fix using SQL aliases, enables testing other features
Issue #1 (Prompt Injection) - Core functionality blocker
Issue #4 (CRUD) - Prevents data corruption
Issue #3 (Card Click) - UX improvement


Less Ideal plan:

Fix Style Capsule System Issues
Architecture Overview
The Style Capsule system has a template-based prompt injection architecture:

graph LR
    Frontend[Frontend Service] -->|Pass capsule ID| BackendAPI[Backend LLM API]
    BackendAPI -->|Fetch capsule| StyleService[Style Capsule Service]
    StyleService -->|Format injection| BackendAPI
    BackendAPI -->|Interpolate template| LLM[LLM Generation]
Current Flow (BROKEN):

Frontend tries to format capsule (method doesn't exist) → empty string
Backend receives empty writing_style_context variable
LLM generates without style guidance
Fixed Flow:

Frontend passes writing_style_capsule_id variable
Backend detects this variable before interpolation
Backend fetches capsule and formats injection
Backend replaces variable with formatted context
LLM receives complete style guidance
---

Issue #1: Fix Prompt Injection (CRITICAL)
Root Cause
Frontend services call non-existent formatWritingStyleInjection() method
Backend API doesn't intercept and process writing_style_capsule_id variable
Result: writing_style_context is always empty string
Solution: Backend-side Formatting
Step 1: Update Frontend Services
Remove frontend formatting attempts, pass capsule ID as variable instead.

Files to modify:

src/lib/services/treatmentService.ts (lines 51-74)
src/lib/services/beatService.ts (lines 45-65)
src/lib/services/scriptService.ts (lines 61-81, 131-151)
Changes:

// BEFORE (broken):
let writingStyleContext = '';
if (request.projectParams.writingStyleCapsuleId) {
  try {
    const capsule = await styleCapsuleService.getCapsule(...);
    writingStyleContext = styleCapsuleService.formatWritingStyleInjection(capsule); // Method doesn't exist!
  } catch (error) {
    console.warn('Failed to load writing style capsule:', error);
  }
}

const variables = {
  // ...other variables
  writing_style_context: writingStyleContext // Always empty!
};

// AFTER (working):
const variables = {
  // ...other variables
  writing_style_context: '', // Empty placeholder
  writing_style_capsule_id: request.projectParams.writingStyleCapsuleId || '' // Pass ID
};
Step 2: Add Backend Variable Interception
Detect and process writing_style_capsule_id before template interpolation.

File: backend/src/routes/llm.ts (after line 186, before interpolation)

Add logic:

// After validation passes (line 186), before interpolation (line 191):

// Handle writing style capsule injection
if (validatedRequest.variables.writing_style_capsule_id && 
    typeof validatedRequest.variables.writing_style_capsule_id === 'string' &&
    validatedRequest.variables.writing_style_capsule_id.trim() !== '') {
  
  console.log(`[API] Processing writing style capsule: ${validatedRequest.variables.writing_style_capsule_id}`);
  
  try {
    const { StyleCapsuleService } = await import('../services/styleCapsuleService.js');
    const styleCapsuleService = new StyleCapsuleService();
    
    const capsule = await styleCapsuleService.getCapsuleById(
      validatedRequest.variables.writing_style_capsule_id,
      req.user!.id
    );
    
    if (capsule) {
      const formattedContext = styleCapsuleService.formatWritingStyleInjection(capsule);
      validatedRequest.variables.writing_style_context = formattedContext;
      console.log(`[API] Injected writing style context (${formattedContext.length} chars)`);
    } else {
      console.warn(`[API] Style capsule not found: ${validatedRequest.variables.writing_style_capsule_id}`);
      validatedRequest.variables.writing_style_context = '';
    }
  } catch (error) {
    console.error('[API] Failed to load writing style capsule:', error);
    validatedRequest.variables.writing_style_context = '';
  }
} else {
  // Ensure variable exists even if not provided
  if (!validatedRequest.variables.writing_style_context) {
    validatedRequest.variables.writing_style_context = '';
  }
}

// Now proceed with interpolation (existing line 191)
---

Issue #2: Fix Search Functionality (HIGH PRIORITY)
Root Cause
Backend returns snake_case property names directly from Supabase. Frontend expects camelCase per JavaScript conventions.

Example mismatch:

Backend: example_text_excerpts, style_labels, design_pillars
Frontend: exampleTextExcerpts, styleLabels, designPillars
Solution: Transform API Responses to camelCase
File: backend/src/routes/styleCapsules.ts

Add transformation function at top of file (after imports):

// Transform snake_case database columns to camelCase for frontend
function transformCapsuleToFrontend(capsule: any) {
  return {
    id: capsule.id,
    name: capsule.name,
    type: capsule.type,
    libraryId: capsule.library_id,
    userId: capsule.user_id,
    exampleTextExcerpts: capsule.example_text_excerpts,
    styleLabels: capsule.style_labels,
    negativeConstraints: capsule.negative_constraints,
    freeformNotes: capsule.freeform_notes,
    designPillars: capsule.design_pillars,
    referenceImageUrls: capsule.reference_image_urls,
    descriptorStrings: capsule.descriptor_strings,
    isPreset: capsule.is_preset,
    isFavorite: capsule.is_favorite,
    createdAt: capsule.created_at,
    updatedAt: capsule.updated_at
  };
}
Apply transformation to all GET endpoints:

GET /api/style-capsules (line 53): res.json({ data: capsules.map(transformCapsuleToFrontend) });
GET /api/style-capsules/:id (line 81): res.json({ data: transformCapsuleToFrontend(capsule) });
POST /api/style-capsules (line 152): res.status(201).json({ data: transformCapsuleToFrontend(capsule) });
PUT /api/style-capsules/:id (line 198): res.json({ data: transformCapsuleToFrontend(capsule) });
POST /api/style-capsules/:id/favorite (update similarly)
POST /api/style-capsules/:id/duplicate (update similarly)
Reverse transformation for PUT updates (line 164):

// Transform camelCase updates to snake_case
const dbUpdates: any = {};
if (updates.exampleTextExcerpts !== undefined) dbUpdates.example_text_excerpts = updates.exampleTextExcerpts;
if (updates.styleLabels !== undefined) dbUpdates.style_labels = updates.styleLabels;
// ...etc for all fields
---

Issue #3: Add Card Click View/Edit Dialog (MEDIUM PRIORITY)
Solution: Make Cards Clickable + Add Edit Dialog
File: src/pages/StyleCapsuleLibrary.tsx

Step 3.1: Make Card Clickable (line 203)
// BEFORE:
<Card className="h-full hover:shadow-md transition-shadow cursor-pointer group">

// AFTER:
<Card 
  className="h-full hover:shadow-md transition-shadow cursor-pointer group"
  onClick={() => setSelectedCapsule(capsule)}
>
Step 3.2: Add View/Edit Dialog (before closing </div>, around line 568)
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
Step 3.3: Add readOnly Prop to Editors
Files:

src/components/styleCapsules/WritingStyleCapsuleEditor.tsx
src/components/styleCapsules/VisualStyleCapsuleEditor.tsx
Changes:

Add readOnly?: boolean to props interface
Pass disabled={readOnly} to all input fields
Hide Save button when readOnly === true
Show "Duplicate" button for preset capsules instead
---

Issue #4: Fix CRUD Operations in Editors (CRITICAL)
Root Cause
Editors always call createCapsule(), never updateCapsule(). No logic to detect edit vs create mode.

Files to modify:

src/components/styleCapsules/WritingStyleCapsuleEditor.tsx
src/components/styleCapsules/VisualStyleCapsuleEditor.tsx
Changes in handleSave():

// Detect if editing existing capsule
const isEditMode = !!capsule?.id;

if (isEditMode) {
  // UPDATE existing capsule
  await styleCapsuleService.updateCapsule(capsule.id, {
    name,
    exampleTextExcerpts,
    styleLabels,
    // ...other fields
  });
} else {
  // CREATE new capsule
  await styleCapsuleService.createCapsule({
    name,
    type: 'writing',
    libraryId: selectedLibrary,
    exampleTextExcerpts,
    styleLabels,
    // ...other fields
  });
}
Update button text:

<Button onClick={handleSave} disabled={!isValid}>
  {isEditMode ? 'Update' : 'Create'} Style Capsule
</Button>
---

Testing Checklist
Issue #1: Prompt Injection
[ ] Create project with "Airplane!" style capsule
[ ] Generate Stage 2 treatment
[ ] Check network tab: /api/llm/generate-from-template request
[ ] Verify variables.writing_style_context has content (not empty)
[ ] Read generated treatment - should reflect selected style
[ ] Repeat for Stage 3 (beats) and Stage 4 (script)
Issue #2: Search Functionality
[ ] Go to Style Capsules page
[ ] Type "A" in search - should find "Airplane!"
[ ] Type "minimalist" - should find "Hemingway Minimalist"
[ ] Test Stage 1 capsule selector dropdown search
Issue #3: Card Click View/Edit
[ ] Click "Airplane!" card - dialog opens in edit mode
[ ] Make change and save - should update
[ ] Click preset card - opens in read-only mode
[ ] Test close dialog functionality
Issue #4: CRUD Operations
[ ] Create new capsule - should work
[ ] Edit existing capsule - button says "Update", should update not duplicate
[ ] Verify no duplicate capsules created
[ ] Delete capsule - should work
---

Implementation Order
Issue #2 (Search) - Fastest fix, enables testing other features
Issue #1 (Prompt Injection) - Core functionality blocker
Issue #4 (CRUD) - Prevents data corruption
Issue #3 (Card Click) - UX improvement