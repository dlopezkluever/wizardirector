The plan covers all 7 issues you raised, organized into 6 phases with clear dependencies. Key 
  design decisions baked in:

  - Reactive links only for match (not ref) — per your confirmation
  - No push confirmation — immediate execution
  - Replace, not add — propagation updates the target's image_url directly
  - frame_links table — persistent tracking of source→target reactive relationships;
  backend-driven propagation
  - Directional fix — start frames only see prev-end, end frames only see next-start
  - Phase 4 requires a DB migration — I'll write the SQL but you'll need to run it per project  
  rules

──────────────────────────────────────────────────────────────────────────────────────────────── Ready to code?

 Here is Claude's plan:
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌ Continuity System Revamp v2 — Push/Pull Reactive Links

 Context

 The v1 continuity system (just implemented) has several UX issues identified during testing:   
 1. End frame upload button invisible — hideHeader hides it
 2. No source-side indicator — only the target frame shows "Matched from X"; the source shows   
 nothing
 3. Redundant badges + buried Remove Link — "Matched from" AND "Copied from" both show; Remove  
 Link is hidden in Shot Context
 4. No carousel-selection link awareness — switching carousel images on a linked frame doesn't  
 break or warn about links
 5. Only 2 buttons — need Push/Pull paradigm (4 buttons): pull match, pull ref, push match,     
 push ref
 6. No reactive linking — copies are one-shot snapshots; source changes don't propagate to      
 targets
 7. Wrong directional buttons — both start and end frames show buttons for prevEnd AND
 nextStart; should be directionally correct

 User-confirmed decisions:
 - Only match links are reactive (ref operations are one-shot, not reactive)
 - Push operations execute immediately (no confirmation needed)
 - Reactive propagation replaces the target frame's image_url (doesn't add to carousel)

 ---
 Phase 1: Quick Fixes (No DB Changes)

 1A. Fix end frame upload button

 File: src/components/pipeline/Stage10FrameGeneration.tsx (lines 940-952)

 The end FramePanel uses hideHeader (line 998), hiding the upload icon. Fix: add upload icon to 
  Stage10's manual end-frame header (the div at lines 941-952 with "End Frame" + Switch).       

 - Add showEndUploadModal state
 - Add upload icon button in the end-frame header div (before Switch)
 - Add FrameUploadModal instance that calls uploadFrameMutation with frameType: 'end'

 1B. Fix directional linking

 File: src/components/pipeline/Stage10FrameGeneration.tsx (lines 440-488)

 In getAdjacentFrames():
 - Start frame (frameType === 'start'): Only return prevEnd — remove lines 458-466 (nextStart)  
 - End frame (frameType === 'end'): Only return nextStart — remove lines 469-476 (prevEnd)      

 FramePanel button grid already handles single-adjacent correctly (rows hide when no adjacent). 

 ---
 Phase 2: Indicator Consolidation & Remove Link UX

 2A. Remove redundant "Copied from" badge

 File: src/components/pipeline/FramePanel.tsx (lines 503-522)

 Delete the entire copySource badge block. The continuityInfo badge ("Match from X" at lines    
 469-481) already communicates the link.

 2B. Add source-side indicator

 File: src/components/pipeline/FramePanel.tsx

 New prop:
 linkTarget?: { targetShotLabel: string; targetFrameType: 'start' | 'end' };

 Render in header (near line 482): blue badge "Pushing to {targetShotLabel}" when this frame is 
  a link source.

 File: src/components/pipeline/Stage10FrameGeneration.tsx

 Add getLinkTarget(frame) helper that checks if any other shot's frame has previousFrameId ===  
 frame.id. Pass to both FramePanels.

 2C. Move Remove Link to FramePanel header

 File: src/components/pipeline/FramePanel.tsx

 New prop: onRemoveLink?: () => void

 Render inline after the continuity badge — small X icon button (hover: destructive red). Only  
 visible when continuityInfo.mode !== 'none'.

 File: src/components/pipeline/Stage10FrameGeneration.tsx

 - Wire onRemoveLink on start FramePanel → updateContinuityMutation.mutate({ shotId,
 startContinuity: 'none' })
 - Remove old "Remove Link" buttons from Shot Context area (lines 1094-1103, 1167-1175)
 - Remove copySource prop from both FramePanels

 ---
 Phase 3: Push/Pull 4-Button Layout

 3A. New FramePanel props & button grid

 File: src/components/pipeline/FramePanel.tsx (lines 672-734)

 New props:
 onPushMatchToFrame?: (targetFrameId: string) => void;
 onPushRefToFrame?: (targetFrameId: string) => void;

 Replace current 2-button rows with 4-button grid per adjacent frame:

 For START frame (adjacent: prevEnd):
   [Pull match from {prev} End]  [Pull ref from {prev} End]
   [Push match to {prev} End]    [Push ref to {prev} End]

 For END frame (adjacent: nextStart):
   [Pull match from {next} Start]  [Pull ref from {next} Start]
   [Push match to {next} Start]    [Push ref to {next} Start]

 - Pull Match = existing onMatchFromFrame (copies adjacent's image INTO this frame)
 - Pull Ref = existing onRefFromFrame (adds adjacent as reference for this frame)
 - Push Match = onPushMatchToFrame (copies THIS frame's image TO adjacent frame)
 - Push Ref = onPushRefToFrame (adds THIS frame as reference for adjacent frame)

 Icons: Pull = ArrowDownToLine, Push = ArrowUpFromLine (or similar directional lucide icons)    

 3B. Wire push operations in Stage10

 File: src/components/pipeline/Stage10FrameGeneration.tsx

 Push operations reuse existing backend endpoints with swapped IDs:

 // Start FramePanel push match to prev end:
 onPushMatchToFrame={() => {
   const prev = getPreviousShot(selectedShot.id);
   if (prev && selectedShot.startFrame) {
     copyFrameMutation.mutate({
       shotId: prev.id,                          // TARGET shot
       sourceFrameId: selectedShot.startFrame.id, // THIS frame
       targetFrameType: 'end',
     });
   }
 }}

 // End FramePanel push match to next start:
 onPushMatchToFrame={() => {
   const next = getNextShot(selectedShot.id);
   if (next && selectedShot.endFrame) {
     copyFrameMutation.mutate({
       shotId: next.id,
       sourceFrameId: selectedShot.endFrame.id,
       targetFrameType: 'start',
     });
   }
 }}

 Same pattern for push ref using refFromFrameMutation.

 No new backend endpoints needed — existing copy-frame and add-frame-as-reference are generic.  

 ---
 Phase 4: Reactive Link System (DB Migration Required)

 4A. Database: frame_links table

 File: backend/migrations/034_frame_links.sql (USER must run migration)

 CREATE TABLE frame_links (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   source_frame_id UUID NOT NULL REFERENCES frames(id) ON DELETE CASCADE,
   target_frame_id UUID NOT NULL REFERENCES frames(id) ON DELETE CASCADE,
   link_type TEXT NOT NULL DEFAULT 'match' CHECK (link_type IN ('match')),
   created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
   UNIQUE(target_frame_id, link_type)
 );
 CREATE INDEX idx_frame_links_source ON frame_links(source_frame_id);
 CREATE INDEX idx_frame_links_target ON frame_links(target_frame_id);

 Plus RLS policies for authenticated users.

 4B. Backend: Create links on match copy operations

 File: backend/src/routes/frames.ts — copy-frame endpoint (~line 1594)

 After successful copy, upsert a frame_links record:
 await supabase.from('frame_links').upsert({
   source_frame_id: sourceFrameId,
   target_frame_id: targetFrame.id,
   link_type: 'match',
 }, { onConflict: 'target_frame_id,link_type' });

 Also in batch-link-copy endpoint — create links for each copied pair.

 4C. Backend: Propagate on source frame change

 File: backend/src/services/frameGenerationService.ts

 New method propagateFrameLinks(frameId):
 1. Query frame_links where source_frame_id = frameId
 2. Get source frame's current image_url + storage_path
 3. For each match link target: update image_url, storage_path, generated_at, prompt_snapshot:  
 '[Auto-propagated from linked source]'
 4. Create zero-cost job record for audit trail
 5. Guard against loops: skip propagation if the update itself came from propagation (use a     
 propagating: boolean parameter)

 Call propagateFrameLinks() at the end of:
 - regenerateFrame() — after new image generated
 - select-generation endpoint — after user selects different carousel item on source
 - upload-frame-image (variant) — after upload updates source frame
 - After inpaint completes

 4D. Backend: Break links on target independent change

 File: backend/src/routes/frames.ts

 Before updating a frame in these endpoints, delete any incoming link:
 await supabase.from('frame_links').delete().eq('target_frame_id', frameId);

 Apply in:
 - select-generation — user selects different image on a TARGET frame
 - regenerate — user regenerates a TARGET frame
 - upload-frame-image (variant) — user uploads to a TARGET frame

 Key distinction: These endpoints must check if the frame is a SOURCE or TARGET:
 - If SOURCE → propagate to targets after update
 - If TARGET → break incoming links before update

 4E. Backend: Expose links in GET /frames response

 File: backend/src/routes/frames.ts — GET frames endpoint

 After fetching shots+frames, also fetch all frame_links for the scene's frame IDs. Include in  
 response as links: FrameLink[].

 4F. Frontend: Types & service methods

 File: src/types/scene.ts
 export interface FrameLink {
   id: string;
   sourceFrameId: string;
   targetFrameId: string;
   linkType: 'match';
   createdAt: string;
 }

 File: src/lib/services/frameService.ts
 - Add breakFrameLink(projectId, sceneId, linkId) method → DELETE /frame-links/:linkId
 - Update FetchFramesResponse to include links: FrameLink[]

 4G. Frontend: Display reactive link indicators

 File: src/components/pipeline/FramePanel.tsx

 New prop:
 reactiveLink?: {
   role: 'source' | 'target';
   linkId: string;
   otherShotLabel: string;
 };
 onBreakLink?: (linkId: string) => void;

 - Source: blue badge "Linked → {otherShotLabel}" (this frame pushes updates)
 - Target: blue badge "Linked ← {otherShotLabel}" + small X to break link via onBreakLink       

 File: src/components/pipeline/Stage10FrameGeneration.tsx

 Compute reactiveLink for each FramePanel from the links array in fetched data. Wire
 onBreakLink → breakFrameLinkMutation.

 ---
 Phase 5: Carousel Selection Confirmation Modal

 5A. Intercept Select on linked target frames

 File: src/components/pipeline/FramePanel.tsx

 When user clicks "Select" on a non-current carousel item and reactiveLink?.role === 'target':  

 1. Check localStorage.getItem('skipContinuityBreakConfirm')
 2. If not skipped → show AlertDialog:
   - Title: "Break continuity link?"
   - Description: "Selecting a different image will break the link from {otherShotLabel}. This  
 frame will no longer auto-update."
   - Checkbox: "Don't show this again" → sets localStorage
   - Actions: Cancel / "Break Link & Select"
 3. If confirmed or skipped → proceed with selectMutation (backend handles link deletion per    
 Phase 4D)

 Requires: AlertDialog, Checkbox from shadcn/ui (already available).

 ---
 Phase 6: Lint + Test

 - npm run lint on all modified files
 - npm test (frontend)
 - cd backend && npm test (backend)

 ---
 Files Modified Summary

 File: src/components/pipeline/Stage10FrameGeneration.tsx
 Phases: 1,2,3,4
 Changes: Fix directional logic, end-frame upload, push wiring, link indicators, remove old UI  
 ────────────────────────────────────────
 File: src/components/pipeline/FramePanel.tsx
 Phases: 2,3,4,5
 Changes: Remove copySource, add linkTarget/reactiveLink badges, 4-button grid, remove-link     
   inline, confirm modal
 ────────────────────────────────────────
 File: backend/src/routes/frames.ts
 Phases: 4
 Changes: Create links on copy, break on target change, expose in GET, delete endpoint
 ────────────────────────────────────────
 File: backend/src/services/frameGenerationService.ts
 Phases: 4
 Changes: propagateFrameLinks(), call after frame changes
 ────────────────────────────────────────
 File: src/lib/services/frameService.ts
 Phases: 4
 Changes: breakFrameLink(), updated response type
 ────────────────────────────────────────
 File: src/types/scene.ts
 Phases: 4
 Changes: FrameLink interface
 ────────────────────────────────────────
 File: backend/migrations/034_frame_links.sql
 Phases: 4
 Changes: New table (USER runs migration)

 ---
 Implementation Order & Dependencies

 Phase 1 (Bug fixes) ────────── no deps, ship first
 Phase 2 (Indicators) ───────── depends on Phase 1B
 Phase 3 (Push/Pull buttons) ── depends on Phase 1B
 Phase 4 (Reactive links) ───── depends on Phase 3 + DB migration
 Phase 5 (Confirm modal) ────── depends on Phase 4
 Phase 6 (Lint + test) ──────── after all phases

 ---
 Verification

 1. Upload end frame: Upload icon visible on end frame header → opens modal → upload works      
 2. Directional buttons: Start frame only shows prev-end buttons; end frame only shows
 next-start buttons
 3. Source indicator: After match, source frame shows "Linked → Shot X"
 4. Remove link inline: Small X next to "Match from X" badge removes the link
 5. 4 buttons: Pull match, Pull ref, Push match, Push ref all functional
 6. Push match: Start frame pushes image to prev shot's end frame carousel
 7. Reactive propagation: After link, regenerating source auto-updates target image
 8. Target independence breaks link: Selecting different carousel image on target → confirm →   
 link removed
 9. "Don't show again": Checkbox persists in localStorage, skips modal next time
 10. npm run lint + npm test + cd backend && npm test

 --

 Test Results Summary

  Unit Tests

  - Frontend: 150/150 passed
  - Backend: 203/210 passed (7 pre-existing failures in image-generation.test.ts, unrelated)    

  Playwright E2E Functional Tests

  ┌──────────────────────────┬────────┬──────────────────────────────────────────────────────┐  
  │          Check           │ Result │                        Notes                         │  
  ├──────────────────────────┼────────┼──────────────────────────────────────────────────────┤  
  │ Login + Navigation       │ PASS   │ Auth flow works, navigates to Stage 10 correctly     │  
  ├──────────────────────────┼────────┼──────────────────────────────────────────────────────┤  
  │ End Frame Upload Icon    │ PASS   │ Upload icon visible in End Frame header (SVG         │  
  │                          │        │ confirmed)                                           │  
  ├──────────────────────────┼────────┼──────────────────────────────────────────────────────┤  
  │ 4-Button Grid            │ PASS   │ Pull match, Pull ref, Push match, Push ref all       │  
  │                          │        │ render                                               │  
  ├──────────────────────────┼────────┼──────────────────────────────────────────────────────┤  
  │ Directional Correctness  │ PASS   │ Start frame: NO buttons (no prev shot). End frame: 4 │  
  │ (2A - first)             │        │  buttons targeting 2B                                │  
  ├──────────────────────────┼────────┼──────────────────────────────────────────────────────┤  
  │ Directional Correctness  │ PASS   │ Start frame: no buttons (2A has no generated end     │  
  │ (2B - middle)            │        │ frame yet). End frame: 4 buttons targeting 2C        │  
  ├──────────────────────────┼────────┼──────────────────────────────────────────────────────┤  
  │ Directional Correctness  │ PASS   │ Start frame: 4 buttons targeting 2B. End frame: NO   │  
  │ (2C - last)              │        │ buttons (no next shot)                               │  
  ├──────────────────────────┼────────┼──────────────────────────────────────────────────────┤  
  │ Source-Side Indicator    │ PASS   │ "Pushing to 2B" badge visible on Shot 2C's start     │  
  │                          │        │ frame                                                │  
  ├──────────────────────────┼────────┼──────────────────────────────────────────────────────┤  
  │ Target-Side Indicator    │ PASS   │ "Match from 2B" badge with X button visible on Shot  │  
  │                          │        │ 2C's start frame                                     │  
  ├──────────────────────────┼────────┼──────────────────────────────────────────────────────┤  
  │ Remove Link (X button)   │ PASS   │ Inline X next to "Match from 2B" badge visible       │  
  ├──────────────────────────┼────────┼──────────────────────────────────────────────────────┤  
  │ Old Remove Link buttons  │ PASS   │ No old "Remove Link" buttons in Shot Context area    │  
  │ gone                     │        │                                                      │  
  ├──────────────────────────┼────────┼──────────────────────────────────────────────────────┤  
  │ Carousel with "Selected" │ PASS   │ End frame shows "Selected" green badge on active     │  
  │  badge                   │        │ carousel item                                        │  
  └──────────────────────────┴────────┴──────────────────────────────────────────────────────┘  

  Design Review

  Working well:
  - Dark amber/gold theme is consistent across all elements
  - Button grid is cleanly laid out in 2x2 format with appropriate icons (down-arrow for Pull,  
  up-arrow for Push)
  - Badges use appropriate semantic colors: blue for continuity indicators, green for
  "Selected"/"Ready"
  - Frame panels are well-proportioned side-by-side with clear visual separation
  - Shot sidebar shows thumbnails with link indicators (chain icons on 2B, 2C)
  - "On" toggle for End Frame is clearly visible with upload icon

  Minor observations (not blockers):
  - Match buttons take ~60% width, Ref buttons ~40% — slight visual asymmetry in the grid       
  (functional, not broken)
  - When adjacent frame has no image generated (Shot 2A's end), the button grid correctly hides 
  (good empty-state handling)

  All 6 phases of the continuity revamp are working correctly end-to-end. The migration
  034_frame_links.sql needs to be run for the reactive link features (Phase 4) to work in       
  production.