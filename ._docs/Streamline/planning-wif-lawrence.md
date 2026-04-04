☐ Entry Point :
Where should the 'Structured Inputs' UI live? Your mockup shows it in Stage 1 as a replacement for the Skip button. Should it be a new input mode (replacing 'Script Skip'),  
or a separate flow entirely (e.g. a modal/panel that appears after selecting any mode)?

❯ IDK NEED MORE TIME TO THINK.
1. Replace Script Skip mode
Replace the 4th input mode ('Script Skip') with 'Structured Inputs' / 'Streamline'. Users pick this mode, then get the multi-file upload with document type dropdowns.   
2. Separate modal/panel
Keep the 4 input modes as-is, but add a 'Streamline' button/section that opens a dedicated upload panel for structured inputs (treatment, beat sheet, script, images).   
3. Replace entire Stage 1
The Streamline flow becomes the default Stage 1 experience — one unified upload area where every file gets a type label, and the old modes become secondary.
4. Type something.

IMPORT MODE:
When a user uploads a treatment or beat sheet file, how should it populate the stage? Should it be inserted as-is (the exact text becomes the stage content, editable from    
there), or should the AI parse/restructure it into the expected format first (e.g. extract beats from a prose beat sheet)?

❯ 1. Insert as-is (Recommended)
The uploaded text becomes the starting content directly — no AI generation, no credits spent. User can then use existing regenerate/edit tools to refine. Simplest and   
fastest.
2. AI-parse into format
Run the upload through a lightweight AI pass to restructure it into the expected format (e.g. extract individual beats from a beat sheet document). Costs some credits   
but ensures structural compatibility.
3. User chooses per-file
Each uploaded file gets a toggle: 'Use as-is' or 'AI-format'. Power users can mix and match.
4. Type something.

Skip Display :  →

For skipped stages — if someone uploads a script (skipping Treatment + Beat Sheet), what should happen to Stages 2 and 3 in the pipeline sidebar?

❯ 1. Mark as 'Skipped'
Show a 'SKIPPED' overlay/badge on Stages 2-3. They're locked but clearly marked as intentionally bypassed. Users can't enter them.
2. Auto-populate backwards
Use the script to reverse-generate a treatment and beat sheet (AI back-fill). Costs credits but gives complete pipeline. Users can review/edit.
3. Skip but allow entry
Mark as skipped, but users can click in to manually add content later if they want. Stages show as 'optional' rather than locked.
4. Type something.

IMAGE UPLOAD: 
For image uploads (character images, storyboard frames) — should these all be handled in the same Structured Inputs flow in Stage 1, or should storyboard frames be a separate upload in Stage 10 where they're actually used?

❯ 1. All in Stage 1
Everything uploaded in one place at the start. Character images tagged for Stage 5, storyboard frames tagged for Stage 10. System routes them to the right stage.        
2. Split by stage
Text content (treatment/beats/script) uploaded in Stage 1. Character images uploaded in Stage 5. Storyboard frames uploaded in Stage 10. Each stage gets its own upload. 
3. Stage 1 + Stage 10
Text + character images in Stage 1 Structured Inputs (since characters are needed early). Storyboard frames handled separately in Stage 10 (since frame-to-shot mapping  
is complex).
4. Type something.

----------------------------------------------------------------------------------------------------------------

Current state summary:
- Stage 1 has a "Script Skip" input mode but it does nothing — all modes still go Stage 1→2→3→4→5 sequentially
- Stage 1 only accepts text files (PDF, Word, MD, TXT, RTF) — no image uploads
- Stage 2 (Treatment) and Stage 3 (Beat Sheet) are AI-only — no way to provide your own
- Stage 4 (Script) has a TipTap editor but no file import
- Stage 5 (Assets) already supports manual image upload and manual asset creation
- Backend enforces sequential locking — you can't lock Stage 3 without Stage 2 being locked first

---

---

---

Response:
  Perfect! Now I have comprehensive information about all four stages. Let me create a detailed report.

  Comprehensive Pipeline Stages 2-5 Analysis

  Based on my thorough exploration of the codebase, here's how stages 2-5 generate, store, and manage their content:

  ---
  STAGE 2: TREATMENT GENERATION

  Generation Service

  File: src/lib/services/treatmentService.ts

  The TreatmentService generates 3 treatment variations from Stage 1 processed input:

  interface GenerateTreatmentRequest {
    processedInput: ProcessedInput;
    projectId: string;
  }

  interface GenerateTreatmentResponse {
    variations: TreatmentVariation[];
    langsmithTraceId: string;
    promptTemplateVersion: string;
    styleCapsuleMetadata?: {...};
  }

  Key Methods:
  - generateTreatments(): Initial 3-variation generation using template treatment_expansion
  - regenerateTreatments(): Full regeneration with user guidance
  - regenerateSection(): Single section rewrite (ad-hoc, not templated)
  - regenerateSectionAlternatives(): Generate 3 alternative rewrites for selected text

  Data Flow

  1. Input: Stage 1's processedInput (mode, primaryContent, contextFiles, projectParams)
  2. LLM Call: POST /api/llm/generate-from-template with treatment_expansion template
  3. Response Parsing: parseTreatmentResponse() extracts 3 TreatmentVariation objects from JSON
  4. Storage: In-memory via useStageState hook until explicit save

  Storage & Persistence

  Database: stage_states table
  - Column: content (JSONB)
  - Structure in Stage2Content:
  interface Stage2Content {
    variations: TreatmentVariation[];        // Array of 3 treatments
    activeVariation: number;                 // Index of selected variation
    processedInput?: ProcessedInput;         // Carried forward from Stage 1
    langsmithTraceId?: string;              // LLM trace for audit
    promptTemplateVersion?: string;         // Template version used
    _styleCapsuleMetadata?: any;            // Temporary (extracted during save)
  }

  Versions/Iterations

  - Multiple Variations: 3 alternatives generated at once (not sequential versions)
  - Regeneration: Creates new set of 3 variations, replacing old ones (no history)
  - Section Editing: Modifies active variation in-place (not versioned)
  - Save Behavior: Auto-save via useStageState (1s debounce), manual save via handleSaveChanges()

  Manual Content Provision

  Not currently supported. The UI assumes AI generation. To add manual input:
  - Would need new dialog/textarea for paste-in treatment
  - Would bypass generateTreatments() call
  - Would directly set stageContent.variations

  Current Limitations:
  - Cannot import treatment from external file
  - Cannot manually edit and keep as "original" (edits are always attributed to AI variation)

  ---
  STAGE 3: BEAT SHEET EXTRACTION

  Generation Service

  File: src/lib/services/beatService.ts

  interface Beat {
    id: string;
    order: number;
    text: string;
    rationale?: string;
    estimatedScreenTimeSeconds: number;
    originalTreatmentExcerpt?: string;
    isExpanded?: boolean;
  }

  interface GenerateBeatsRequest {
    treatmentProse: string;
    selectedVariantId: string;
    projectParams: {...};
  }

  Key Methods:
  - generateBeats(): Extract beats from selected treatment variation (template: beat_extraction)
  - regenerateBeats(): Full beat sheet regeneration with guidance
  - brainstormBeatAlternatives(): Generate 3 alternatives for a single beat
  - splitBeat(): Break one beat into 2-3 sub-beats

  Data Flow

  1. Input: Stage 2's active treatment + projectParams
  2. LLM Call: POST /api/llm/generate-from-template with beat_extraction
  3. Parsing: parseBeatsResponse() extracts beat array + totalEstimatedRuntime + narrativeStructure
  4. Storage: In-memory, auto-saved to stage_states

  Storage & Persistence

  Database: stage_states table with Stage3Content:
  interface Stage3Content {
    beats: Beat[];                           // Ordered beat list
    totalEstimatedRuntime: number;          // In seconds
    narrativeStructure: string;             // e.g., "3-act structure"
    treatmentSource?: {                     // Reference to source
      content: string;
      variantId: string;
    };
    langsmithTraceId?: string;
    promptTemplateVersion?: string;
  }

  Versions/Iterations

  - Single Beat Variations: Brainstorm generates 3 alternatives for one beat
  - Full Regeneration: Creates entirely new beat sheet
  - Reordering: Drag-and-drop reorder updates beat.order (persisted)
  - Manual Editing: Click to edit beat.text in-place (auto-saved)
  - Beat Manipulation: Add/delete/split beats (no versioning)

  Manual Content Provision

  Partially supported:
  - Can manually edit individual beat text (click to edit)
  - Cannot paste-in pre-written beat sheet
  - Add beat button creates placeholder with "New beat - describe what happens here..."

  ---
  STAGE 4: MASTER SCRIPT GENERATION

  Generation Service

  File: src/lib/services/scriptService.ts

  interface Scene {
    id: string;
    sceneNumber: number;
    slug: string;
    heading: string;
    content: string;
  }

  interface GenerateScriptRequest {
    beatSheet: Beat[];
    projectParams: {...};
  }

  Key Methods:
  - generateScript(): Expand beat sheet into formatted screenplay (template: master_script_generation)
  - regenerateScript(): Full script regeneration with guidance
  - regenerateSection(): Rewrite selected screenplay section (ad-hoc)
  - regenerateSectionAlternatives(): Generate 3 alternatives for selection
  - persistScenes(): Extract and persist scenes to database (Phase B commit)
  - extractScenes(): Parse screenplay text into scenes (deterministic, no LLM)

  Data Flow

  1. Input: Stage 3 beat sheet + projectParams
  2. Auto-generation: Triggered on component mount (if no script exists)
  3. LLM Call: POST /api/llm/generate-from-template with master_script_generation
  4. Parsing: Returned as formatted screenplay text + extracted scenes
  5. Editing: TipTap editor with custom screenplay extensions (SceneHeading, Action, Dialogue)
  6. Storage: Two representations:
    - formattedScript: Plain text screenplay
    - tiptapDoc: Rich JSON for TipTap editor

  Storage & Persistence

  Database: stage_states table with Stage4Content:
  interface Stage4Content {
    formattedScript: string;                  // Plain text screenplay
    tiptapDoc?: object;                      // TipTap JSON (preferred for editing)
    scenes: Scene[];                         // Extracted scenes (in-memory preview)
    syncStatus: 'synced' | 'out_of_date_with_beats';
    beatSheetSource?: {
      beats: Beat[];
      stageId: string;
    };
    langsmithTraceId?: string;
    promptTemplateVersion?: string;
  }

  Phase B Commit: persistScenes() → POST /api/projects/:id/scenes creates actual scenes table records with stable IDs (Scene ID Stability system)

  Versions/Iterations

  - Generation: Auto-generates if missing, single active version
  - Regeneration: User-triggered with guidance, replaces content
  - Section Editing: In-place with TipTap (2s debounced auto-save to formattedScript)
  - Alternatives: 3-alternative mode for selected sections
  - No versioning: Only current state persisted (no history)

  Manual Content Provision

  Supported:
  - Full screenplay editing in TipTap editor (when unlocked)
  - Can paste screenplay text (parsed as plain text)
  - Can manually format with screenplay toolbar (SceneHeading, Action, Dialogue buttons)
  - Cannot: Import screenplay from external file in one click (would need upload feature)

  ---
  STAGE 5: ASSETS (CHARACTER/LOCATION/PROP)

  Asset Extraction

  Files:
  - src/lib/services/projectAssetService.ts (frontend)
  - backend/src/services/assetExtractionService.ts (backend)

  Two-Pass Flow (no longer single-pass):
  1. Pass 1 (Extract Preview): POST /api/projects/:id/assets/extract-preview
    - Deterministic extraction from scene dependencies (no LLM)
    - Returns preview of characters/locations/props found
  2. Pass 2 (LLM Confirmation): POST /api/projects/:id/assets/extract-confirm
    - User selects which entities to keep
    - LLM enriches descriptions, generates prompts
    - Creates project_assets records

  Data Model

  ProjectAsset (Stage 5 project-specific):
  interface ProjectAsset {
    id: string;
    project_id: string;
    branch_id: string;
    name: string;
    asset_type: 'character' | 'prop' | 'location' | 'extra_archetype';
    description: string;
    image_prompt?: string;
    image_key_url?: string;
    visual_style_capsule_id?: string;
    locked: boolean;
    deferred?: boolean;
    style_outdated?: boolean;
    scene_numbers?: number[];
    source: 'extracted' | 'manual' | 'cloned';
    created_at: string;
    updated_at: string;
  }

  Storage:
  - Database: project_assets table (migration 008, 009, 023, 024)
  - Images: Supabase Storage bucket project-assets or generated via image service
  - Attempts: project_asset_generation_attempts table (migration 022)

  Asset Generation Flow

  1. Character/Location/Prop Assets:
    - POST /api/projects/:id/assets/:assetId/generate-image
    - Uses ImageGenerationService (Veo3 or mock provider)
    - Image stored in Supabase Storage
    - image_key_url points to storage path
  2. Angle Variants (Phase 3C.2):
    - asset_angle_variants table (migration 025)
    - Per-asset: front, side, 3/4, back views
    - Each angle can be independently generated
  3. Location Views (Phase 3C - Location System):
    - location_views table (migration 038)
    - Attached to location assets
    - Camera direction metadata
    - Separate generate endpoint: POST /api/projects/:id/assets/:assetId/location-views/:viewId/generate-image

  Asset Upload Modal

  Component: EnhancedUploadModal.tsx
  - User can upload character/location/prop images directly
  - Creates ProjectAssetGenerationAttempt record with source='uploaded'
  - Alternative to AI generation

  Versions/Iterations

  - Image Attempts: Multiple generation attempts tracked in project_asset_generation_attempts
    - User can select which attempt to use (is_selected flag)
    - Old attempts retained (not deleted)
    - New generation creates new attempt record
  - Asset Updates:
    - Modification tracking (migration 017) for scene asset instances:
        - modification_count: increments on each update
      - last_modified_field: which field changed
      - modification_reason: optional user note
  - Style Sync:
    - style_outdated flag when visual style capsule changes
    - User can manually trigger re-generation to match new style

  Manual Content Provision

  Fully supported:
  1. Manual Asset Creation: AddAssetModal allows creating assets without extraction
    - Name, type, description, optional image_prompt
    - Manual upload image via EnhancedUploadModal
  2. Manual Image Upload:
    - User can upload images instead of generating
    - Creates attempt record with source='uploaded'
  3. Manual Editing:
    - Edit asset name, description, image_prompt
    - Deferred flag to hide from pipeline
    - Manual scene assignment (scene_numbers array)
  4. No auto-generation:
    - If image_key_url is null, shows "Upload or Generate"
    - User chooses which path

  ---
  PERSISTENCE & VERSIONING SUMMARY

  ┌───────┬──────────────────────────────────────────────────────────────┬────────────────────────────────┬──────────────────────────────────┬───────────────────────    
  ───┐
  │ Stage │                           Storage                            │            Versions            │            Iterations            │     Manual Provision      
    │
  ├───────┼──────────────────────────────────────────────────────────────┼────────────────────────────────┼──────────────────────────────────┼───────────────────────    
  ───┤
  │ 2     │ stage_states.content (Stage2Content)                         │ 1 active (3 variations at      │ Regenerate all / edit sections   │ No (AI-only)
    │
  │       │                                                              │ once)                          │                                  │
    │
  ├───────┼──────────────────────────────────────────────────────────────┼────────────────────────────────┼──────────────────────────────────┼───────────────────────    
  ───┤
  │ 3     │ stage_states.content (Stage3Content)                         │ 1 active beat sheet            │ Regenerate / reorder / edit      │ Partial (edit text        
  only) │
  │       │                                                              │                                │ beats                            │
    │
  ├───────┼──────────────────────────────────────────────────────────────┼────────────────────────────────┼──────────────────────────────────┼───────────────────────    
  ───┤
  │ 4     │ stage_states.content (Stage4Content) + scenes table (Phase   │ 1 active script                │ Regenerate / edit sections       │ Yes (TipTap editor)       
    │
  │       │ B)                                                           │                                │                                  │
    │
  ├───────┼──────────────────────────────────────────────────────────────┼────────────────────────────────┼──────────────────────────────────┼───────────────────────    
  ───┤
  │ 5     │ project_assets + project_asset_generation_attempts           │ Multiple image attempts        │ Regenerate images / edit         │ Yes (upload/create        
    │
  │       │                                                              │                                │ metadata                         │ modal)
    │
  └───────┴──────────────────────────────────────────────────────────────┴────────────────────────────────┴──────────────────────────────────┴───────────────────────    
  ───┘









  ---
  Key Architectural Patterns

  1. useStageState Hook (src/lib/hooks/useStageState.ts):
    - Wraps all stage content state management
    - Auto-save with 1s debounce (except Stage 4, which uses custom 2s debounce)
    - Loads from stage_states.content on mount
    - Manual save via .save() or .lock()
  2. LLM Integration:
    - All generation via /api/llm/generate-from-template (template-driven)
    - Ad-hoc edits via /api/llm/generate (direct prompts)
    - Trace IDs and template versions tracked for audit
  3. Content Structure:
    - Each stage stores full content in stage_states.content (JSONB)
    - No separate tables per stage (monolithic approach)
    - Version field in stage_states for history (not used for branching yet)
  4. Phase A vs Phase B:
    - Phase A (Stages 1-5): Drafts, all in stage_states, can regenerate freely
    - Phase B (Stages 6-12): Locked when scene details committed to scenes table
    - Stage 4 "approval" = transition point (persists scenes + locks stage)

  ---
  Files to Reference

  Frontend:
  - Stage components: src/components/pipeline/Stage[2-5]*.tsx
  - Services: src/lib/services/{treatment,beat,script,projectAsset}Service.ts


Perfect! Now I have enough information. Let me compile a thorough report for the user.

  Stage 1 Input System - Comprehensive Exploration Report

  I've conducted a thorough exploration of the Stage 1 input system and how it connects to the rest of the pipeline. Here's what I found:

  ---
  1. Stage1InputMode.tsx - Component Architecture

  Location: C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\src\components\pipeline\Stage1InputMode.tsx

  Component Structure:
  - Props: projectId, onComplete, stageStatus, onNext, onUnlock
  - Uses useStageState hook for persistence with auto-save disabled (to prevent race conditions with lock operation)
  - Initial content includes: selectedMode, selectedProjectType, selectedRating, selectedGenres, selectedAspectRatio, targetLength, tonalPrecision,
  writingStyleCapsuleId, uploadedFiles, ideaText, and processedInput

  Input Modes (4 options):
  1. Expansion - Start with 1-3 paragraph idea, AI expands into full narrative
  2. Condensation - Upload large document (novel, script, 100+ pages), AI condenses into cinematic narrative
  3. Transformation - Upload source material + optional references, transform with creative twist
  4. Script Skip - Upload formatted screenplay directly (intended to bypass Stages 2-3)

  Key State Management:
  - FileStagingArea component handles file uploads (drag & drop, multiple file support)
  - Text input for "expansion" mode (minimum 20 characters)
  - Project type selection (Narrative, Commercial, Audio-Visual)
  - Aspect ratio toggle (16:9 landscape or 9:16 portrait)
  - Target length range slider (1-15 minutes, stored in seconds)
  - Content rating selection (G, PG, PG-13, M)
  - Genre/tone multi-select buttons
  - Tonal precision textarea (minimum 10 characters required)
  - Optional writing style capsule selector

  Validation Rules:
  - canProceed requires: selected mode + selected project type + tonal precision >= 10 chars + (uploaded files OR (expansion mode AND idea text >= 20 chars))

  ---
  2. How Files Are Uploaded & Processed

  FileStagingArea Component (src/components/pipeline/FileStagingArea.tsx):

  Accepted File Types:
  - Text/plain
  - Markdown
  - PDF
  - Word documents (.doc, .docx)
  - Rich Text Format (.rtf)
  - Maximum file size: 10MB per file
  - Maximum 10 files per upload

  File Processing:
  - Files are read as text content in the browser (FileReader API)
  - Each file gets: id, name, size, type, content, isPrimary, tag, lastModified
  - First uploaded file is automatically marked as primary
  - Users can mark any file as primary (star icon)
  - Secondary files can be tagged: "Character Notes", "World Building", "Parody Source", "Visual Reference", "Research Notes", "Style Guide", "Other"
  - PDF files are currently stored without text extraction
  - Supports drag-and-drop or file picker

  File Processing Flow:
  User uploads files → Validation → Content reading (FileReader) →
  Stage in component state → User confirms proceeding →
  Processed by inputProcessingService

  ---
  3. The "Streamline" Button (NOT YET IMPLEMENTED)

  Important: There is NO "Streamline" button in the current codebase. The UI currently only has:
  - Input mode selector (4 buttons)
  - Project type selector
  - Aspect ratio selector
  - Target length slider
  - Content rating buttons
  - Genre/tone buttons
  - Tonal precision textarea
  - Continue button ("Continue to Treatment")

  The script-skip mode exists conceptually but does NOT currently skip stages 2 and 3. All modes proceed sequentially through the pipeline.

  ---
  4. How Stage 1 Connects to Stage 2 (Treatment)

  Data Flow:

  1. In handleComplete() - Stage 1 does the following:
    - Validates all input via inputProcessingService.validateInput()
    - Creates/updates project in DB with configuration
    - Processes input via inputProcessingService.processInput() - converts user input into structured ProcessedInput object
    - Saves Stage 1 state with stageStateService.saveStageState() including the processedInput
    - Cancels pending auto-saves
    - Calls onComplete() which triggers handleStageComplete() in ProjectView
  2. ProcessedInput Structure (src/lib/services/inputProcessingService.ts):
  {
    mode: InputMode,
    primaryContent: string,           // Main input text
    contextFiles: Array<{             // Supporting files
      name: string,
      content: string,
      tag?: string
    }>,
    projectParams: {
      targetLengthMin: number,
      targetLengthMax: number,
      projectType: ProjectType,
      contentRating: ContentRating,
      genres: string[],
      tonalPrecision: string,
      writingStyleCapsuleId?: string
    }
  }
  3. Stage 2 Retrieval (Stage2Treatment.tsx line 159):
  const stage1State = await stageStateService.getStageState(projectId, 1);
  // Stage 2 extracts: stage1State.content.processedInput
    - Stage 2 calls generateInitialTreatments()
    - Fetches Stage 1 state via stageStateService.getStageState(projectId, 1)
    - Extracts processedInput from Stage 1's content
    - Passes it to treatmentService.generateTreatments()
    - If no processedInput found, throws error: "No processed input found from Stage 1"

  ---
  5. Stage Transition & Navigation Logic

  ProjectView.tsx handles all stage progression:

  handleStageComplete() (line 422):
  - Calls stageStateService.lockStage(projectId, stageNumber) to lock current stage
  - Updates local state to mark stage as "locked"
  - Advances to next stage (Stage 1 → Stage 2 → Stage 3 → Stage 4 → Stage 5 → Stage 6)
  - For Phase A (Stages 1-5), progression is sequential and mandatory
  - Phase B (Stages 6-12) uses scene-based navigation

  Stage Locking Validation (backend/src/routes/stageStates.ts line 336):
  - Prevents locking a stage unless the previous stage is locked (except Stage 1)
  - This enforces sequential progression

  Navigation Rules:
  - Locked stages show "LockedStageHeader" component with "Confirm & Proceed" button
  - Users can't skip ahead; must complete stages in order (Phase A only)
  - Stage persistence uses localStorage + URL params for recovery
  - Stage 8 requires sceneId for navigation

  ---
  6. Data Flow Through Later Stages

  Stage 3 (Beat Sheet):
  - Fetches Stage 2 state: stageStateService.getStageState(projectId, 2)
  - Extracts treatment content to generate beats

  Stage 4 (Master Script):
  - Fetches Stage 3 state: stageStateService.getStageState(projectId, 3)
  - Fetches Stage 2 state: stageStateService.getStageState(projectId, 2)
  - Uses beat sheet to structure script generation
  - Extracts scenes from formatted script

  Stage 5 (Assets):
  - Receives scenes from Stage 4
  - Catalogs characters, locations, props

  Cascade Pattern:
  Stage 1 (ProcessedInput)
    ↓
  Stage 2 (Treatment) - reads Stage 1
    ↓
  Stage 3 (Beats) - reads Stage 2
    ↓
  Stage 4 (Script) - reads Stages 2 & 3
    ↓
  Stage 5 (Assets) - reads Stage 4

  Each stage is self-contained with explicit TypeScript interfaces for its content, but reads upstream stages as needed.

  ---
  7. The "Skip" Logic - What Exists vs. What's Missing

  Current Skip Implementation:
  - In useStageState.ts: "Skip auto-save" logic for new projects (no real ID yet)
  - In useStageState.ts: "Skip loading" for projectId === 'new'
  - In ProjectView: "Skip Stage 8" redirect if no sceneId found (reverts to Stage 7)

  Missing Skip Implementation:
  - Stage skipping does NOT exist for the script-skip input mode
  - The "script-skip" mode is defined in the type system and UI, but has no special handling
  - All 4 input modes feed through Stages 2 → 3 → 4 sequentially
  - No code prevents or enables bypassing Stages 2 and 3 based on input mode
  - No conditional logic branches based on selectedMode === 'script-skip'

  ---
  8. File Upload Specifics

  During Stage 1:
  - Files are read into memory as text content
  - Content stored in uploadedFiles array in component state
  - Only sent to backend when handleComplete() is called
  - processedInput differentiates primary vs. context files:
    - Expansion mode: ideaText is primary, all files are context
    - Other modes: first file (isPrimary=true) is primary, rest are context

  File Content Handling:
  - PDF files: currently stored without text extraction (line 105-108 FileStagingArea.tsx)
  - Text/Word/MD/RTF: full content extracted via FileReader
  - Content is NOT chunked or summarized; full text passed to backend

  ---
  9. Stage State Service Architecture

  Key Methods:
  - getStageStates(projectId) - Fetch all stages for active branch, latest version only
  - getStageState(projectId, stageNumber) - Fetch specific stage
  - saveStageState(projectId, stageNumber, options) - Save draft or locked state
  - lockStage(projectId, stageNumber) - Lock stage (prevents reverting to draft)
  - unlockStage(projectId, stageNumber, confirm) - Two-phase unlock with downstream impact
  - autoSave() - Debounced save (1-second delay)
  - cancelAutoSave() - Cancel pending auto-save

  Backend Route: PUT /api/projects/:projectId/stages/:stageNumber
  - Creates new version (incremental versioning)
  - Prevents status regression (locked stages can't revert to draft)
  - Updates project.updated_at timestamp

  ---
  10. Files to Reference

  Frontend Files:
  - /src/components/pipeline/Stage1InputMode.tsx - Main component (636 lines)
  - /src/components/pipeline/FileStagingArea.tsx - File upload UI (424 lines)
  - /src/lib/services/inputProcessingService.ts - Input processing logic (206 lines)
  - /src/lib/services/stageStateService.ts - Stage state persistence (276 lines)
  - /src/lib/hooks/useStageState.ts - Stage state hook (250+ lines)
  - /src/pages/ProjectView.tsx - Stage navigation & completion (500+ lines)

  Backend Files:
  - /backend/src/routes/stageStates.ts - Stage endpoints (560 lines)

  Type Files:
  - /src/types/project.ts - InputMode, ProjectType, StageStatus types

  ---
  Summary

  The Stage 1 system is a sophisticated input manager that:
  1. Captures project configuration (type, rating, aspect ratio, etc.)
  2. Handles multiple file uploads with drag-drop support
  3. Processes input into a structured ProcessedInput object
  4. Persists state with version control to database
  5. Enforces sequential stage progression via locking mechanism
  6. Passes processed input downstream via stageStateService queries

  The "script-skip" mode exists as a UI option but is not functionally implemented - it doesn't bypass any stages. All modes proceed through Stages 2-5
  sequentially. The "Streamline" button mentioned in your request does not exist in the codebase.

    Explore how the pipeline stages 2-5 generate and store their content. I need to understand:

  1. Stage 2 (Treatment) - How is the treatment generated? What service creates it? How is it stored? What does the component look like? How does it handle
  versions/iterations?
  2. Stage 3 (Beat Sheet) - Same questions as above
  3. Stage 4 (Script) - Same questions
  4. Stage 5 (Assets) - How are character/location assets created and stored? What's the asset upload flow?

  For each stage, I need to know:
  - The generation service/API call
  - The database table(s) where content is stored
  - How "versions" or "iterations" work
  - Whether there's already any mechanism for manually providing content instead of generating it

  Also look at:
  - src/lib/services/ for relevant services (treatment, beat sheet, script services)
  - src/types/ for relevant type definitions
  - Backend routes that handle stage content creation

  Be very thorough - read full files and trace the data flow.