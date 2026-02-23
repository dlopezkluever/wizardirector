 Shot Continuity & Frame Matching — Stages 9 & 10

 Context

 Currently, there is no way to enforce visual continuity between adjacent shots within a scene. When a user generates frames for   
 Shot 1B and then moves to Shot 1A or 1C, those shots generate independently with no awareness of 1B's frames. This creates        
 visible discontinuity at shot boundaries.

 Three enhancements address this:
 1. Simple Copy/Match: Copy an adjacent shot's frame image as this shot's frame (pixel-identical, zero cost). Auto-invalidates     
 with warning if source frame is regenerated.
 2. Camera Angle Change with Continuity: When shots change camera angle but should maintain visual continuity, use the adjacent    
 frame as a strong reference image + a recomposition-directed prompt
 3. Stage 9 AI Continuity Recommendations: Deterministic rule-based analysis of shot flow auto-recommends which shots should be    
 continuous (fast, free, predictable)

 Key Design Decisions

 - Continuity analysis: Deterministic rules (parse camera fields + continuity flags), not LLM — fast and free
 - Copy invalidation: Auto-invalidate copied frames with warning badge when source changes
 - Bulk action: "Link All Shots" button in Stage 10 sidebar for making entire scene continuous
 - Sidebar UX: Connecting lines (solid=match, dashed=camera_change) + icons between linked shots

 ---
 Part 1: Database & Type Changes

 SQL Migration (run manually in Supabase SQL Editor)

 -- New columns on shots table for continuity linking
 ALTER TABLE shots ADD COLUMN IF NOT EXISTS start_continuity TEXT DEFAULT 'none'
   CHECK (start_continuity IN ('none', 'match', 'camera_change'));
 ALTER TABLE shots ADD COLUMN IF NOT EXISTS ai_start_continuity TEXT
   CHECK (ai_start_continuity IN ('none', 'match', 'camera_change'));
 ALTER TABLE shots ADD COLUMN IF NOT EXISTS continuity_frame_prompt TEXT;

 - start_continuity: User-set mode for how this shot's start frame connects to the previous shot's end frame
   - 'none' — independent generation (default)
   - 'match' — pixel-identical copy from previous shot's end frame
   - 'camera_change' — generate using previous end frame as strong reference + recomposition prompt
 - ai_start_continuity: AI recommendation (auto-set in Stage 9, user can override start_continuity)
 - continuity_frame_prompt: Recomposition directive prompt for camera_change mode (alternative to frame_prompt)

 Frontend Types — src/types/scene.ts

 Update ShotWithFrames:
 // Add to ShotWithFrames interface:
 startContinuity?: 'none' | 'match' | 'camera_change';
 aiStartContinuity?: 'none' | 'match' | 'camera_change' | null;
 continuityFramePrompt?: string | null;

 Update PromptSet (in Stage9PromptSegmentation or wherever defined):
 // Add:
 startContinuity?: 'none' | 'match' | 'camera_change';
 aiStartContinuity?: 'none' | 'match' | 'camera_change' | null;
 continuityFramePrompt?: string | null;

 Files Modified

 - src/types/scene.ts — add 3 fields to ShotWithFrames
 - Stage 9 PromptSet type (in Stage9PromptSegmentation.tsx or extracted) — add 3 fields

 ---
 Part 2: Stage 9 — AI Continuity Analysis & UI

 2A: Backend — Continuity Detection in Prompt Generation

 File: backend/src/services/promptGenerationService.ts

 Add new method determineContinuityLink() — purely deterministic, no LLM:
 private determineContinuityLink(
   currentShot: ShotData,
   previousShot: ShotData | null,
   allShots: ShotData[]
 ): 'none' | 'match' | 'camera_change' {
   if (!previousShot) return 'none'; // First shot in scene

   // Parse camera fields to extract shot type + angle
   // Reuse existing mapCameraToAngleType() patterns
   const currCamera = parseCameraField(currentShot.camera);
   const prevCamera = parseCameraField(previousShot.camera);

   // Check continuity flags for explicit cuts / scene breaks
   const hasExplicitCut = currentShot.continuity_flags?.some(f =>
     /cut|jump|transition|time.?skip|new.?scene|later/i.test(f)
   );
   if (hasExplicitCut) return 'none';

   // Check if setting changed (implies location change → no auto-continuity)
   const settingChanged = currentShot.setting?.toLowerCase() !== previousShot.setting?.toLowerCase();
   if (settingChanged) return 'none';

   // Same camera setup → match (pixel-identical boundary)
   const sameShotType = currCamera.shotType === prevCamera.shotType;
   const sameAngle = currCamera.angle === prevCamera.angle;

   if (sameShotType && sameAngle) return 'match';

   // Different camera in same setting → camera_change (recomposition)
   return 'camera_change';
 }

 Add helper parseCameraField(camera: string) — extracts shot type (EWS/WS/MS/MCU/CU/ECU) and angle (eye-level/low/high/dutch/bird)
  from the free-text camera field. Reuses regex patterns from existing mapCameraToAngleType().

 Integration into generateBulkPromptSets() (existing method):
 - After generating frame/video prompts for each shot, call determineContinuityLink(currentShot, previousShot, allShots)
 - Include the result as aiStartContinuity in the returned prompt set
 - Auto-set start_continuity to match the AI recommendation (will be overridable by user)

 2B: Backend — Continuity Frame Prompt Generation

 File: backend/src/services/promptGenerationService.ts

 Add new method generateContinuityFramePrompt():
 async generateContinuityFramePrompt(
   shot: ShotData,
   previousShot: ShotData,
   sceneAssets: SceneAssetInstanceData[],
   styleCapsule?: StyleCapsule | null
 ): Promise<string>

 System prompt template (new recomposition directive):
 You are a visual prompt engineer for AI image generation. You are generating a
 RECOMPOSITION FRAME — a new camera angle of an existing scene moment.

 A reference image (the previous shot's end frame) will be provided during generation.
 Your prompt must direct the image generator to RECOMPOSE that scene from a different
 camera angle while preserving all visual continuity.

 YOUR TASK: Describe a FROZEN VISUAL SNAPSHOT recomposed from the reference image.

 WHAT MUST BE PRESERVED FROM THE REFERENCE:
 - Exact facial expressions, emotional states
 - Clothing, accessories, hair styling
 - Lighting quality and color temperature
 - Background elements and atmospheric conditions
 - Prop positions and states
 - Time of day and weather

 WHAT CHANGES:
 - Camera position: {new shot type, angle, framing}
 - Framing/composition: {what's now in foreground/background}
 - Depth of field: {adjusted for new focal distance}

 STRUCTURE (5-part formula):
 1. CAMERA POSITION & FRAMING: New shot type, angle, lens. State explicitly this is
    recomposed from a wider/tighter/different angle.
 2. SUBJECT APPEARANCE: Reference the continuity image — describe subjects with emphasis
    on maintaining exact appearance from reference.
 3. SPATIAL PLACEMENT & POSE: Same poses/positions but reframed for new composition.
 4. ENVIRONMENT & PROPS: Same environment, now seen from new perspective.
 5. LIGHTING, COLOR & STYLE: Identical lighting setup, adjusted for new camera position.

 RULES:
 - NO action verbs, NO dialogue, NO sound, NO movement — still image
 - Explicitly reference that this maintains continuity from the previous angle
 - Max 1200 characters, single paragraph, no formatting

 Called when: User sets start_continuity = 'camera_change' (or AI auto-sets it during prompt generation). Generated on demand,     
 stored in continuity_frame_prompt.

 2C: Backend — API Updates for Continuity Fields

 File: backend/src/routes/projects.ts

 Update GET /scenes/:sceneId/prompts (existing endpoint):
 - Add start_continuity, ai_start_continuity, continuity_frame_prompt to the SELECT query on shots
 - Include in the PromptSet response mapping

 Update POST /scenes/:sceneId/generate-prompts (existing endpoint):
 - After bulk prompt generation, save ai_start_continuity and auto-set start_continuity per shot
 - For shots with ai_start_continuity = 'camera_change', also generate continuity_frame_prompt
 - Batch-update the new columns alongside existing prompt columns

 Update PUT /scenes/:sceneId/shots/:shotId/prompts (existing endpoint):
 - Accept startContinuity in the request body
 - When startContinuity changes to 'camera_change', trigger generateContinuityFramePrompt() if not already set
 - When startContinuity changes to 'none', optionally clear continuity_frame_prompt
 - Save to start_continuity column

 New endpoint: POST /scenes/:sceneId/shots/:shotId/generate-continuity-prompt:
 - Generates (or regenerates) the continuity_frame_prompt for a specific shot
 - Requires previous shot to exist
 - Calls promptGenerationService.generateContinuityFramePrompt()
 - Saves to continuity_frame_prompt column
 - Returns the generated prompt

 2D: Frontend — Stage 9 Prompt Service Updates

 File: src/lib/services/promptService.ts

 - Update FetchPromptsResponse / PromptSet to include new fields
 - Update updatePrompt() to accept startContinuity field
 - Add generateContinuityPrompt(projectId, sceneId, shotUuid) method → POST new endpoint

 2E: Frontend — Stage 9 UI Changes

 File: src/components/pipeline/Stage9PromptSegmentation.tsx

 Shot Card Header — New Continuity Badge (alongside existing AI End Frame badge):

 ┌─ Shot Header ──────────────────────────────────────────────────┐
 │ [Shot 1B] [AI: End Frame] [AI: Match ←] [End Frame ⚡] [8s] ▾ │
 │                            ^^^^^^^^^^^^                         │
 │                         NEW: Continuity recommendation badge    │
 └─────────────────────────────────────────────────────────────────┘

 Badge variants:
 - ai_start_continuity = 'match': Blue badge with Link2 icon — "AI: Match ←"
 - ai_start_continuity = 'camera_change': Purple badge with Camera icon — "AI: Angle Change ←"
 - ai_start_continuity = 'none' or null: No badge shown
 - First shot in scene: Never shows badge (no previous shot)

 Shot Card Header — Continuity Mode Toggle (new, alongside End Frame toggle):

 Continuity: [None ▾]  /  [Match ←]  /  [Angle Change ←]

 - Dropdown/select with 3 options: None, Match, Camera Change
 - Default: mirrors ai_start_continuity recommendation
 - On change: calls promptService.updatePrompt() with startContinuity value
 - Disabled for first shot in scene

 Expanded Content — Continuity Prompt Section (only when start_continuity = 'camera_change'):

 Below the existing Frame Prompt section, add a new section:
 ┌─ Continuity Prompt (Recomposition Directive) ──────────────────┐
 │ [Camera icon] [Regenerate btn]                                  │
 │ ┌──────────────────────────────────────────────────────────────┐│
 │ │ Recompose from reference: Close-up of Character A...        ││
 │ │ Same expression, same lighting...                           ││
 │ └──────────────────────────────────────────────────────────────┘│
 │ 847/1200 chars                                                  │
 │ [This prompt will be used instead of the Frame Prompt above     │
 │  when generating with camera change continuity]                 │
 └─────────────────────────────────────────────────────────────────┘

 - Textarea (read-only by default, editable with lock toggle — same pattern as frame prompt)
 - "Regenerate" button calls generateContinuityPrompt() endpoint
 - Info text: explains this replaces the standard frame prompt during generation

 ---
 Part 3: Stage 10 — Simple Copy/Match (Enhancement 1)

 3A: Backend — Frame Copy Endpoint

 File: backend/src/routes/frames.ts

 New endpoint: POST /scenes/:sceneId/shots/:shotId/copy-frame

 // Request body:
 {
   sourceFrameId: string;      // Frame to copy FROM
   targetFrameType: 'start' | 'end';  // Which frame slot to copy INTO
 }

 Logic:
 1. Fetch source frame — must have status generated or approved and a valid imageUrl
 2. Fetch or create target frame via ensureFrame(shotId, targetFrameType, sourceFrameId)
 3. Update target frame:
   - image_url = source frame's imageUrl
   - storage_path = source frame's storagePath (same file, shared reference)
   - status = 'generated'
   - prompt_snapshot = '[Copied from Shot {sourceShotId} {sourceFrameType} frame]'
   - generated_at = now()
   - previous_frame_id = sourceFrameId (tracks provenance)
 4. Create an image_generation_jobs record with:
   - job_type = targetFrameType
   - status = 'completed'
   - cost_credits = 0
   - prompt = '[Frame copy — zero cost]'
   - public_url = source image URL
 5. Update frame's current_job_id to the new job
 6. Return updated frame data

 Response: { success: true, frame: Frame }

 3B: Frontend — Frame Copy Service Method

 File: src/lib/services/frameService.ts

 Add:
 async copyFrame(
   projectId: string,
   sceneId: string,
   shotId: string,
   sourceFrameId: string,
   targetFrameType: 'start' | 'end'
 ): Promise<{ success: boolean; frame: Frame }>

 3C: Frontend — Copy Buttons in Stage 10

 File: src/components/pipeline/Stage10FrameGeneration.tsx

 Add helper functions:
 const getPreviousShot = (shotId: string): ShotWithFrames | null => { ... }
 const getNextShot = (shotId: string): ShotWithFrames | null => { ... }
 // (getNextShot likely already exists for chain-from-end-frame)

 On Start Frame Panel — Add "Copy from Previous" button:
 Condition: previousShot exists AND previousShot.endFrame?.imageUrl is truthy
             AND selectedShot.startContinuity === 'match'
             (also show as general action even without match mode, but less prominent)

 Button placement: Above or beside the existing Generate button
 Button style: Outline variant with Link2 icon
 Label: "Copy from {prevShot.shotId} End"

 On End Frame Panel — Add "Copy from Next" button:
 Condition: nextShot exists AND nextShot.startFrame?.imageUrl is truthy

 Button placement: Above or beside the existing Generate button
 Button style: Outline variant with Link2 icon
 Label: "Copy from {nextShot.shotId} Start"

 Copy mutation:
 const copyFrameMutation = useMutation({
   mutationFn: ({ shotId, sourceFrameId, targetFrameType }) =>
     frameService.copyFrame(projectId, sceneId, shotId, sourceFrameId, targetFrameType),
   onSuccess: () => {
     queryClient.invalidateQueries(['frames', sceneId]);
     toast({ title: 'Frame copied', description: '...' });
   }
 });

 3D: Frontend — "Copied" Badge + Stale Detection on FramePanel

 File: src/components/pipeline/FramePanel.tsx

 Add optional prop:
 copySource?: {
   sourceShotId: string;
   sourceFrameType: 'start' | 'end';
   sourceFrameUpdatedAt?: string; // ISO timestamp of source frame's last generation
   isStale: boolean;  // true if source was regenerated after this copy
 };

 When frame was copied (frame.promptSnapshot?.startsWith('[Copied from') OR copySource prop provided):
 - Normal state: Blue badge "Copied from Shot {X}" with Link2 icon
 - Stale state (copySource.isStale === true): Amber/warning badge "Source changed — re-copy?" with AlertTriangle icon. Clicking    
 the badge triggers the copy action again.

 Staleness detection logic (in Stage10FrameGeneration.tsx):
 // When building copySource prop:
 const isCopiedFrame = frame?.previousFrameId != null;
 if (isCopiedFrame) {
   const sourceFrame = findFrameById(frame.previousFrameId); // from allShots data
   const isStale = sourceFrame?.generatedAt && frame?.generatedAt
     && new Date(sourceFrame.generatedAt) > new Date(frame.generatedAt);
   // Pass as copySource prop to FramePanel
 }

 This uses previousFrameId (set during copy) + generatedAt timestamps to detect if the source was regenerated after the copy was   
 made.

 ---
 Part 4: Stage 10 — Camera Angle Change Generation (Enhancement 2)

 4A: Backend — Enhanced Frame Generation with Continuity

 File: backend/src/services/frameGenerationService.ts

 Update generateFrames():

 When generating a start frame for a shot with start_continuity = 'camera_change':

 1. Fetch the previous shot's end frame image URL
 2. Use continuity_frame_prompt instead of frame_prompt as the generation prompt
 3. Build reference images:
   - First: Previous shot's end frame URL with role 'identity' (strongest reference)
   - Then: Normal reference images from reference_image_order
 4. Call startFrameGeneration() with the continuity prompt + enhanced reference list

 When start_continuity = 'match':
 - Skip generation entirely; instead call the copy-frame logic from Part 3
 - Auto-copy previous shot's end frame as this shot's start frame

 // In the per-shot loop within generateFrames():
 if (shot.start_continuity === 'match' && previousEndFrame?.imageUrl) {
   // Direct copy — no generation needed
   await this.copyFrameFromSource(shot.id, 'start', previousEndFrame);
 } else if (shot.start_continuity === 'camera_change') {
   // Use continuity prompt + previous end frame as primary reference
   const prompt = shot.continuity_frame_prompt || shot.frame_prompt;
   const refs = [
     { url: previousEndFrame.imageUrl, role: 'identity' },
     ...normalRefs
   ];
   await startFrameGeneration(frameId, ..., prompt, ..., refs);
 } else {
   // Normal generation
   await startFrameGeneration(frameId, ..., shot.frame_prompt, ..., normalRefs);
 }

 4B: Backend — Update fetchFramesForScene()

 File: backend/src/services/frameGenerationService.ts

 Add start_continuity, ai_start_continuity, continuity_frame_prompt to the SELECT query in fetchFramesForScene(). Map them into    
 the ShotWithFrames response.

 4C: Frontend — Prompt Tab/Toggle in Stage 10

 File: src/components/pipeline/Stage10FrameGeneration.tsx

 When selected shot has startContinuity === 'camera_change':

 Replace the simple prompt display with a tabbed prompt view:

 ┌─ Frame Prompt ─────────────────────────────────────────────────┐
 │                                                                 │
 │  [Original Prompt]  [Continuity Prompt ✓]     ← Tab buttons     │
 │  ──────────────────────────────────────────                     │
 │  ┌──────────────────────────────────────────────────────────┐  │
 │  │ Recompose from reference: Close-up reframing of the...   │  │
 │  │ Same facial expression, same lighting setup...           │  │
 │  └──────────────────────────────────────────────────────────┘  │
 │                                                                 │
 │  [Regenerate Continuity Prompt]  [Remove Continuity Link]       │
 │                                                                 │
 └─────────────────────────────────────────────────────────────────┘

 - "Original Prompt" tab: Shows framePrompt (read-only, dimmed when not selected)
 - "Continuity Prompt" tab: Shows continuityFramePrompt (active by default)
 - "Continuity Prompt ✓": Checkmark indicates this is the active prompt for generation
 - "Remove Continuity Link" button: Sets startContinuity = 'none', reverts to original prompt
 - "Regenerate Continuity Prompt" button: Calls generate-continuity-prompt endpoint

 When startContinuity === 'match':
 - Show info message: "This frame will be copied from {prevShot.shotId}'s end frame"
 - Show the copy button prominently
 - Dim the prompt display (prompt isn't used for copies)

 4D: Frontend — FramePanel Adjustments

 File: src/components/pipeline/FramePanel.tsx

 Add optional prop:
 continuityInfo?: {
   mode: 'none' | 'match' | 'camera_change';
   sourceShot?: string;  // e.g., "1A"
   sourceShotId?: string;
 };

 When continuityInfo.mode === 'match':
 - Primary action button: "Copy from {sourceShot} End" (gold variant)
 - Secondary: "Generate Instead" (outline, dismisses continuity for this generation)

 When continuityInfo.mode === 'camera_change':
 - Primary action button: "Generate with Continuity" (gold variant)
 - Badge: "Camera Change from {sourceShot}" with Camera icon

 ---
 Part 5: Stage 10 — Shot Sidebar Continuity Indicators

 File: src/components/pipeline/Stage10FrameGeneration.tsx

 5A: Individual Shot Indicators

 In the shot sidebar (lines ~521-604), add continuity indicators per shot:

 ┌─ Shot Sidebar ─────────────────┐
 │                                 │
 │  ┌─ Shot 1A ─────────────────┐ │
 │  │ [1A]              [8s]    │ │
 │  │ [Start] [End]             │ │
 │  └───────────────────────────┘ │
 │          │ ← continuity line    │
 │          ▼                      │
 │  ┌─ Shot 1B ─────────────────┐ │
 │  │ [1B] 🔗              [6s] │ │
 │  │ [Start] [End]             │ │
 │  └───────────────────────────┘ │
 │          ┊ ← dashed line        │
 │          ▼                      │
 │  ┌─ Shot 1C ─────────────────┐ │
 │  │ [1C] 📷              [8s] │ │
 │  │ [Start] [End]             │ │
 │  └───────────────────────────┘ │
 │                                 │
 └─────────────────────────────────┘

 - Match continuity (🔗): Small Link2 icon next to shot badge + solid connecting line (border-primary/40, 2px) between this shot   
 and previous
 - Camera change (📷): Small Camera icon next to shot badge + dashed connecting line (border-purple-500/40, dashed)
 - None: No icon, no line
 - Lines drawn between shot cards using absolute positioning or CSS ::before pseudo-element on the shot card

 5B: "Make Scene Continuous" Bulk Action

 Location: Top of the shot sidebar or alongside the mode selector

 Button: "Link All Shots" with Link2 icon
 - On click: Sets start_continuity = 'match' for ALL shots (except the first)
 - Generates continuity_frame_prompt for any that had different camera angles
 - Visual: All shot cards now show chain links connecting them
 - Toast: "All shots linked — frames will match at boundaries"

 Companion button: "Unlink All" (outline/muted)
 - Sets start_continuity = 'none' for all shots

 5C: Scene-Level Continuity Status

 Small summary text above the shot list:
 "3 of 5 shots linked" or "Fully continuous scene" or "No continuity links"

 ---
 Part 6: Prompt Generation Updates for Continuity-Aware Frame Prompts

 6A: Frame Prompt Awareness of Continuity

 File: backend/src/services/promptGenerationService.ts

 When generating frame prompts in generateBulkPromptSets(), the LLM should be aware of the continuity chain. Add to the system     
 prompt for frame prompt generation (9A):

 CONTINUITY CONTEXT:
 {if shot has start_continuity = 'match'}
 This shot's start frame will be a pixel-identical copy of the previous shot's end frame.
 Your frame prompt should describe the same visual state as the previous shot's end state.
 Do not introduce visual differences from the previous shot's end.
 {/if}

 {if shot has start_continuity = 'camera_change'}
 This shot is a camera angle change from the previous shot. A separate recomposition
 prompt will be generated. Your standard frame prompt should still describe the scene
 independently (as a fallback).
 {/if}

 This is informational — the actual recomposition prompt is generated separately in generateContinuityFramePrompt().

 6B: End Frame Prompt Awareness

 When generating end frame prompts in generateEndFramePrompt(), if the NEXT shot has start_continuity = 'match', add context:      

 CONTINUITY NOTE: The next shot's start frame will be copied from THIS shot's end frame.
 Ensure this end frame can serve as a clean starting point for the next shot.
 The next shot's camera is: {nextShot.camera}

 This subtly guides the end frame to be compatible with the next shot's needs.

 ---
 Files Modified Summary

 File: Backend
 Changes:
 ────────────────────────────────────────
 File: backend/src/services/promptGenerationService.ts
 Changes: Add determineContinuityLink(), generateContinuityFramePrompt(), update generateBulkPromptSets() to include continuity    
   analysis, update frame/end-frame prompt system prompts with continuity context
 ────────────────────────────────────────
 File: backend/src/routes/projects.ts
 Changes: Update GET prompts response, update POST generate-prompts to save continuity fields, update PUT prompts to accept        
   startContinuity, add POST generate-continuity-prompt endpoint
 ────────────────────────────────────────
 File: backend/src/routes/frames.ts
 Changes: Add POST copy-frame endpoint
 ────────────────────────────────────────
 File: backend/src/services/frameGenerationService.ts
 Changes: Update generateFrames() for match/camera_change logic, update fetchFramesForScene() to return continuity fields
 ────────────────────────────────────────
 File: Frontend
 Changes:
 ────────────────────────────────────────
 File: src/types/scene.ts
 Changes: Add continuity fields to ShotWithFrames
 ────────────────────────────────────────
 File: src/lib/services/promptService.ts
 Changes: Add generateContinuityPrompt(), update updatePrompt() for startContinuity, update response types
 ────────────────────────────────────────
 File: src/lib/services/frameService.ts
 Changes: Add copyFrame() method
 ────────────────────────────────────────
 File: src/components/pipeline/Stage9PromptSegmentation.tsx
 Changes: Add continuity badge, continuity mode dropdown, continuity prompt section (when camera_change)
 ────────────────────────────────────────
 File: src/components/pipeline/Stage10FrameGeneration.tsx
 Changes: Add copy buttons, prompt tab view, shot sidebar continuity indicators + connecting lines, "Link All Shots" button, wire  
   up copy/continuity mutations
 ────────────────────────────────────────
 File: src/components/pipeline/FramePanel.tsx
 Changes: Add continuityInfo prop, copy/continuity button variants, "Copied from" badge

 ---
 Implementation Order

 1. SQL migration (prerequisite)
 2. Part 1 — Database & types (quick, unblocks everything)
 3. Part 2A-2C — Backend continuity detection + prompt generation + API routes
 4. Part 2D-2E — Frontend Stage 9 service + UI (continuity badges, dropdown, prompt section)
 5. Part 3A-3B — Backend copy-frame endpoint + frontend service
 6. Part 3C-3D — Frontend copy buttons in Stage 10 + copied badge
 7. Part 4A-4B — Backend camera_change generation logic
 8. Part 4C-4D — Frontend prompt tabs + FramePanel continuity props
 9. Part 5 — Shot sidebar indicators + "Link All" button
 10. Part 6 — Prompt generation context updates
 11. Lint + test

 ---
 Verification

 1. Stage 9 — AI Recommendations: Generate prompts for a multi-shot scene → verify ai_start_continuity values make sense
 (same-camera sequential shots get 'match', different-camera get 'camera_change')
 2. Stage 9 — User Override: Toggle continuity mode dropdown → verify start_continuity saves and badge updates
 3. Stage 9 — Continuity Prompt: Set shot to 'camera_change' → verify recomposition directive prompt is generated and displayed    
 4. Stage 10 — Simple Copy: Generate Shot 1B frames → select Shot 1A → click "Copy from 1B Start" on end frame → verify image      
 appears, status='generated', cost=0
 5. Stage 10 — Camera Change: Set Shot 1C to 'camera_change' → generate → verify previous end frame is prepended as reference,     
 continuity prompt is used
 6. Stage 10 — Prompt Tabs: Verify tab toggle between original and continuity prompt works, "Remove Continuity Link" clears the    
 mode
 7. Stage 10 — Sidebar: Verify link icons and connecting lines appear between continuous shots
 8. Stage 10 — Link All: Click "Link All Shots" → verify all shots (except first) get match continuity
 9. Lint: cd "C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector" && npm run lint
 10. Tests: npm test (frontend) + cd "C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend" && npm test (backend)