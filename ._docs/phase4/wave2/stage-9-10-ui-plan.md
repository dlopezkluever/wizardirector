 Stage 9 & 10 UI/UX Improvements

 Context

 WT-D (asset reference images + end frame workflow) is functionally complete,    
 but testing reveals significant UI/UX friction in both stages. This plan        
 addresses layout, discoverability, and workflow issues identified from live     
 screenshots and user feedback.

 User decisions captured:
 - End frame prompt → 2-column grid layout (not slide-in panel)
 - Regen flow → LLM correction input first, with manual edit fallback
 - End frame toggle → Stage 10 only (remove from Stage 9)
 - Frame chaining → User-triggered "Use as Next Start" button
 - Stage 9 cleanup → Remove "Frame"/"Video" header badges + "Compatible Models"  
 section
 - Regen default → Correction input first, subtle "Edit manually" link below     

 ---
 Improvement 1: Stage 10 — 2-Column Grid Layout (replace slide-in panel)

 Problem: The end frame prompt slide-in panel (w-80 / 320px) is cramped, doesn't 
  fit the prompt text, and wastes space below Shot Context.

 Solution: Replace slide-in panel with a consistent 2-column grid:

 ┌─────────────────────┬─────────────────────┐
 │   Start Frame       │   End Frame         │
 │   [image]           │   [image/placeholder]│
 │   [Refs row]        │   [Refs row]        │
 │   [Regen][Approve]  │   [Generate End]    │
 ├─────────────────────┼─────────────────────┤
 │   Shot Context      │   End Frame Prompt  │
 │   Setting: ...      │   [textarea]        │
 │   Camera: ...       │   [Regen Prompt]    │
 │   Action: ...       │   [Save]            │
 │   Frame Prompt: ... │                     │
 └─────────────────────┴─────────────────────┘


 When end frame is OFF: bottom row = Shot Context full-width (col-span-2).       
 When end frame is ON: bottom row splits into Shot Context (left) | End Frame    
 Prompt (right).

 File: src/components/pipeline/Stage10FrameGeneration.tsx

 Changes:
 - Remove showEndPromptPanel state, AnimatePresence slide-in, and the "End       
 Prompt" toggle button
 - Replace the current flex layout (frames + slide-in) with grid grid-cols-2     
 gap-4
 - Top row: Start Frame column | End Frame column (existing FramePanels)
 - Bottom row: Shot Context (left) | End Frame Prompt editor (right, only when
 requiresEndFrame)
 - When !requiresEndFrame, Shot Context spans full width via col-span-2
 - End Frame Prompt section contains: textarea, "Regenerate Prompt" (LLM),       
 "Save" button (when dirty), "Generate End Frame" image button
 - Remove the duplicate "Generate End Frame" button that was in the slide-in     
 panel — only ONE image generation button exists: the one in the FramePanel      
 actions

 Button consolidation (fix the 3-button confusion):
 - FramePanel "Generate end Frame" gold button → generates the IMAGE (keep)      
 - End Prompt section "Generate End Frame Prompt" with sparkles → generates the  
 PROMPT via LLM (keep, rename clearly to "Generate Prompt" with Sparkles icon)   
 - Remove the third "Generate End Frame" button that was in the old slide-in     
 panel

 ---
 Improvement 2: Stage 10 — End Frame Toggle

 Problem: requiresEndFrame is currently set only by AI in Stage 9 with no user   
 override in Stage 10 where frames are actually managed.

 Solution: Add a toggle switch in Stage 10's end frame column header.

 File: src/components/pipeline/Stage10FrameGeneration.tsx

 Changes:
 - Add a small toggle (switch or clickable badge) next to "End Frame" header in  
 the top-right cell
 - Default value comes from AI recommendation (determineRequiresEndFrame in      
 promptGenerationService.ts — already runs in Stage 9)
 - Toggle calls existing promptService.updatePrompt() with { requiresEndFrame:   
 newValue } (same API the old Stage 9 badge used)
 - Toggling OFF hides the end frame FramePanel and collapses bottom-right cell   
 (Shot Context goes full-width)
 - Toggling ON shows end frame FramePanel and end prompt editor
 - Quick Mode respects the toggle value for "Generate All" behavior

 ---
 Improvement 3: Stage 10 — Regeneration Correction Flow

 Problem: Clicking "Regenerate" re-runs with the exact same prompt. User has no  
 way to guide corrections like "tighter on face, lower angle" without manually   
 rewriting the entire prompt.

 Solution: Two-tier regen flow — LLM correction input (default) + manual prompt  
 editing (fallback).

 3a. UI Change

 File: src/components/pipeline/FramePanel.tsx

 When user clicks "Regenerate":
 - Instead of immediately calling onRegenerate, show an inline correction area:  
 [text input: "Describe what to change..."]
 [Regenerate with Correction] button
 ─────────────────────────
 "Edit prompt manually" link (subtle, below)
 - "Regenerate with Correction" → calls
 onRegenerateWithCorrection(correctionText)
 - "Edit prompt manually" → expands a textarea showing the current frame prompt, 
  with a "Generate" button
 - A simple "Re-roll (same prompt)" text button for users who just want a new    
 seed
 - isCorrection state boolean to toggle between modes
 - New props: onRegenerateWithCorrection: (correction: string) => void,
 currentPrompt?: string, onRegenerateWithEditedPrompt?: (prompt: string) => void 

 3b. Backend — LLM Prompt Correction

 File: backend/src/services/promptGenerationService.ts

 New method:
 async applyFramePromptCorrection(
     currentPrompt: string,
     correction: string,
     frameType: 'start' | 'end'
 ): Promise<string>

 LLM system prompt: "You are editing an image generation prompt. Apply the       
 user's correction surgically — change only what they asked for, keep everything 
  else identical. Return ONLY the revised prompt, no explanation."

 User message: Current prompt:\n${currentPrompt}\n\nCorrection:\n${correction}   

 3c. Backend Route

 File: backend/src/routes/frames.ts

 New endpoint: POST
 /:projectId/scenes/:sceneId/frames/:frameId/regenerate-with-correction
 - Accepts { correction: string }
 - Fetches current frame's prompt from shot (frame_prompt or end_frame_prompt)   
 - Calls promptGenerationService.applyFramePromptCorrection()
 - Updates the shot's prompt in DB with corrected version
 - Calls frameGenerationService.regenerateFrame() to generate with new prompt    
 - Returns { success, frame, updatedPrompt }

 Also add: POST
 /:projectId/scenes/:sceneId/frames/:frameId/regenerate-with-prompt
 - Accepts { prompt: string }
 - Updates the shot's frame/end-frame prompt in DB
 - Calls frameGenerationService.regenerateFrame()
 - Returns { success, frame }

 3d. Frontend Service

 File: src/lib/services/frameService.ts

 Add:
 - regenerateWithCorrection(projectId, sceneId, frameId, correction) → POST      
 - regenerateWithPrompt(projectId, sceneId, frameId, prompt) → POST

 3e. Frontend Integration

 File: src/components/pipeline/Stage10FrameGeneration.tsx

 Add mutations:
 - regenerateWithCorrectionMutation → calls
 frameService.regenerateWithCorrection()
 - regenerateWithPromptMutation → calls frameService.regenerateWithPrompt()

 Wire to FramePanel's new props for both start and end frames.

 ---
 Improvement 4: Stage 10 — Frame Chaining ("Use as Next Start")

 Problem: No way to chain an approved end frame as the next shot's start frame   
 reference.

 Solution: "Use as Next Start" button on approved end frames.

 File: src/components/pipeline/Stage10FrameGeneration.tsx

 - When an end frame is approved AND a next shot exists in the sidebar: show a   
 small "Use as Next Start" button (or icon button with tooltip)
 - Clicking it: takes the end frame's imageUrl and adds it as the first
 reference image for the next shot's start frame
 - Implementation: call a new API endpoint or update reference_image_order on    
 the next shot to prepend the end frame URL as a special "continuity" reference  
 - Visual feedback: toast "End frame linked as reference for Shot {next}"        

 File: backend/src/routes/frames.ts

 New endpoint: POST
 /:projectId/scenes/:sceneId/shots/:shotId/chain-from-end-frame
 - Accepts { endFrameUrl: string, fromShotId: string }
 - Updates next shot's reference_image_order to prepend { label: "Continuity",   
 assetName: "Previous End Frame", url: endFrameUrl, type: "continuity" }
 - Returns { success: true }

 ---
 Improvement 5: Stage 9 — Remove Unnecessary Badges and Sections

 Problem: "Frame" and "Video" badges in shot card headers add no information     
 (obviously those are in this stage). "Compatible Models (Veo3, Kling)" footer   
 is unnecessary noise.

 5a. Remove header badges

 File: src/components/pipeline/Stage9PromptSegmentation.tsx (lines ~443-467)     

 Remove the <Badge>Frame</Badge> and <Badge>Video</Badge> elements from the shot 
  card header. Keep the shot number ("Shot 2A") and the end frame recommendation 
  badge.

 5b. Change End Frame badge to read-only AI recommendation

 Replace the clickable toggle badge (lines ~468-505) with a non-interactive      
 read-only indicator:
 - Show "End Frame Recommended" (green) or "No End Frame" (muted) based on       
 requiresEndFrame
 - Remove the onClick handler — toggle lives in Stage 10 now
 - Smaller, less prominent styling (just informational)

 5c. Remove Compatible Models footer

 File: src/components/pipeline/Stage9PromptSegmentation.tsx (lines ~710-725)     

 Remove the entire "Compatible Models" div. Keep the "Generated:" timestamp if   
 desired (move it elsewhere or remove it too).

 ---
 Improvement 6: Stage 10 — Fix Cost Display

 Problem: Cost shows "0.00 credits" despite images being generated.

 Investigation findings: The backend logic in onJobCompleted
 (frameGenerationService.ts:710-738) looks correct — it reads cost_credits from  
 image_generation_jobs and accumulates into frames.total_cost_credits. The mock  
 provider (NanoBanana) returns 0.01 * pixelMultiplier.

 Likely cause: The onJobCompleted callback may not be executing when using the   
 polling-based flow, or the current_job_id on the frame might not be set when    
 the job completes.

 File: backend/src/services/frameGenerationService.ts

 Debug and fix:
 - Add logging to onJobCompleted to verify it's called
 - Check that current_job_id is properly set on the frame record before job      
 completion
 - Verify the polling flow (checkPendingJobs) calls onJobCompleted correctly     
 - If the issue is that getSceneFrameCosts reads before the cost is written,     
 consider also reading from image_generation_jobs as fallback

 ---
 Improvement 7: Stage 10 — "Generate All" Button Clarity

 Problem: "Generate All" in Quick Mode sounds like it regenerates everything,    
 but it actually only generates frames with status pending or rejected (skips    
 approved/generated).

 File: src/components/pipeline/FrameGrid.tsx

 - Rename button to "Generate Remaining" when some frames are already generated  
 - Keep "Generate All" label only when ALL frames are pending
 - Dynamic label: pendingFrames === totalFrames ? 'Generate All' : 'Generate     
 Remaining'

 ---
 Files to Modify (Summary)

 File: src/components/pipeline/Stage10FrameGeneration.tsx
 Changes: 2-column grid layout, end frame toggle, regen correction mutations,    
   frame chaining button, remove slide-in panel
 ────────────────────────────────────────
 File: src/components/pipeline/FramePanel.tsx
 Changes: Regen correction UI (inline input + manual edit), new props
 ────────────────────────────────────────
 File: src/components/pipeline/FrameGrid.tsx
 Changes: "Generate Remaining" dynamic label
 ────────────────────────────────────────
 File: src/components/pipeline/Stage9PromptSegmentation.tsx
 Changes: Remove Frame/Video badges, read-only end frame badge, remove
 Compatible
   Models
 ────────────────────────────────────────
 File: backend/src/services/promptGenerationService.ts
 Changes: applyFramePromptCorrection() method
 ────────────────────────────────────────
 File: backend/src/services/frameGenerationService.ts
 Changes: Cost tracking debug/fix
 ────────────────────────────────────────
 File: backend/src/routes/frames.ts
 Changes: Regen-with-correction endpoint, regen-with-prompt endpoint,
   chain-from-end-frame endpoint
 ────────────────────────────────────────
 File: src/lib/services/frameService.ts
 Changes: regenerateWithCorrection(), regenerateWithPrompt() service methods     
 ────────────────────────────────────────
 File: src/types/scene.ts
 Changes: Add any missing types for correction flow

 ---
 Implementation Order

 1. Improvement 5 — Stage 9 cleanup (quick, unblocks cleaner testing)
 2. Improvement 1 — Stage 10 2-column grid layout (biggest visual change)        
 3. Improvement 2 — End frame toggle in Stage 10
 4. Improvement 7 — "Generate Remaining" rename
 5. Improvement 3 — Regen correction flow (backend + frontend)
 6. Improvement 4 — Frame chaining
 7. Improvement 6 — Cost display fix

 ---
 Verification

 1. Stage 9: Shot cards show only shot number + read-only end frame
 recommendation badge (no Frame/Video badges, no Compatible Models)
 2. Stage 10: 2-column grid — Start Frame (left) | End Frame (right) top row,    
 Shot Context (left) | End Frame Prompt (right) bottom row
 3. Stage 10: When end frame toggled OFF, bottom row = Shot Context full-width,  
 end frame column shows toggle-ON prompt
 4. Stage 10: Only ONE "Generate End Frame" image button (in FramePanel), ONE    
 "Generate Prompt" LLM button (in end prompt section)
 5. Stage 10: Click Regenerate → correction input appears. Type correction → LLM 
  rewrites prompt → generates new image
 6. Stage 10: Click "Edit manually" → raw prompt textarea appears for direct     
 editing
 7. Stage 10: Approved end frame shows "Use as Next Start" button → links to     
 next shot's references
 8. Stage 10 Quick Mode: Button says "Generate Remaining" (not "Generate All")   
 when some frames exist
 9. Cost display shows non-zero value after generating frames
 10. Run npm run lint, npm test, cd backend && npm test
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
 Claude has written up a plan and is ready to execute. Would you like to
 proceed?

 (From: )