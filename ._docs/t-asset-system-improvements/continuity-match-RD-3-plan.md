Reactive cross-scene links confirmed. The plan already accounts for this — the backend copy-frame endpoint  
  creates frame_links regardless of scene boundaries, and the existing propagation system works cross-scene   
  since it follows frame IDs directly.

  The plan covers all 4 of your feedback points:
  1. Single badge — unified "Push Match TO" / "Pull Match FROM" with prominent "Break Link" button
  2. Both frames flagged — source (blue, editable) and target (amber, reactive with confirmation modal)       
  3. All frames have buttons — always visible, disabled when no image
  4. Cross-scene pull — first start ← prev scene end, last end ← next scene start (reactive)

────────────────────────────────────────────────────────────────────────────────────────────────────────────── Ready to code?

 Here is Claude's plan:
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌ Continuity UI Refinement — Badge Consolidation, Button Logic, Cross-Scene Pull

 Context

 The v2 push/pull continuity system is functionally implemented (frame_links reactive system, 4-button grid,  
 etc.), but user testing revealed several UX issues:

 1. Three overlapping badge systems — continuityInfo ("Match from X"), linkTarget ("Pushing to X"), and       
 reactiveLink ("Linked →/← X") all display at once
 2. Remove link too subtle — small X icon buried inside badges
 3. Edge frames have no buttons — first shot's start and last shot's end frame show zero continuity buttons   
 4. Buttons fully hidden (not disabled) when adjacent frame has no image
 5. No cross-scene continuity — can't pull frames from adjacent scenes at scene boundaries

 User decisions:
 - ONE badge per matched frame: "Push Match TO {label}" or "Pull Match FROM {label}"
 - "Break Link" as a prominent separate button (not an inline X)
 - Source (pusher) can edit freely; target (puller) is reactive, edits require confirmation
 - ALL frames always show buttons underneath, disabled when no image available
 - First shot START: pull-only from prev scene's last end frame
 - Last shot END: pull-only from next scene's first start frame
 - Camera angle/reference continuity deferred to next session

 ---
 Part 1: Badge Consolidation

 1A. FramePanel: Replace 3 badge systems with 1

 File: src/components/pipeline/FramePanel.tsx

 Remove props (lines 97-108):
 - continuityInfo (mode + sourceShot)
 - onRemoveLink
 - linkTarget (targetShotLabel + targetFrameType)
 - reactiveLink (role + linkId + otherShotLabel)

 Add new prop:
 matchLink?: {
   role: 'source' | 'target';
   linkId: string;
   otherLabel: string; // "Shot 2B" or "Scene 3 End"
 };

 Keep onBreakLink prop.

 Delete badge rendering (lines 504-554): All three badge blocks.

 Add unified badge — rendered OUTSIDE the {!hideHeader && ...} conditional so it appears on BOTH start and    
 end frames (end frame uses hideHeader):

 {/* Match link badge — always visible regardless of hideHeader */}
 {matchLink && (
   <div className="flex items-center gap-1.5 mb-2">
     <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${     
       matchLink.role === 'source'
         ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'     // source: blue
         : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'  // target: amber
     }`}>
       <Link2 className="w-3 h-3" />
       {matchLink.role === 'source'
         ? `Push Match TO ${matchLink.otherLabel}`
         : `Pull Match FROM ${matchLink.otherLabel}`}
     </span>
     {onBreakLink && (
       <button
         onClick={() => onBreakLink(matchLink.linkId)}
         className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium
           border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors"
       >
         <Unlink className="w-3 h-3" />
         Break Link
       </button>
     )}
   </div>
 )}

 - Source badge: blue (authority frame, can be edited freely)
 - Target badge: amber (reactive frame, edits trigger confirmation)
 - Break Link: separate destructive pill button with Unlink icon — always next to badge

 1B. Stage10: Replace legacy functions with getMatchLink()

 File: src/components/pipeline/Stage10FrameGeneration.tsx

 Remove: getContinuityInfo() (lines 423-430), getLinkTarget() (lines 433-444)

 Refactor getReactiveLink() → getMatchLink() (lines 447-473):
 - Same frame_links lookup logic
 - When the "other" frame isn't found in current scene's shots, check adjacentSceneFrames data (from Part 3)  
 to build cross-scene labels like "Scene 3 End"

 Update FramePanel prop passing:
 - Start FramePanel (lines 929-937): Remove continuityInfo, onRemoveLink, linkTarget, reactiveLink. Add       
 matchLink={getMatchLink(selectedShot.startFrame)}
 - End FramePanel (lines 1064-1067): Remove linkTarget, reactiveLink. Add
 matchLink={getMatchLink(selectedShot.endFrame)}

 ---
 Part 2: Button Grid — Always Visible + Disabled States

 2A. FramePanel: Always render buttons, disable when no image

 File: src/components/pipeline/FramePanel.tsx (lines 725-829)

 Current: Buttons only render when adjacentFrames?.prevEnd / adjacentFrames?.nextStart exists.
 New: Always render the grid when the corresponding adjacent entry exists (Stage10 will now always provide    
 one).

 Within-scene (4 buttons, 2×2 grid):
 [Pull Match from {label}]  [Pull Ref from {label}]
 [Push Match to {label}]    [Push Ref to {label}]
 - Pull disabled when !adjacentFrame.imageUrl
 - Push disabled when !hasImage (current frame has no image)

 Cross-scene (2 buttons, pull-only):
 [Pull Match from {sceneLabel}]  [Pull Ref from {sceneLabel}]
 When adjacentFrame.isCrossScene, hide push buttons entirely.
 - Pull disabled when !adjacentFrame.imageUrl

 2B. Update AdjacentFrameInfo type

 File: src/components/pipeline/FramePanel.tsx (lines 68-74)

 interface AdjacentFrameInfo {
   shotId: string;
   frameId: string;
   imageUrl: string | null;
   shotLabel: string;
   isCrossScene?: boolean;
   sceneLabel?: string; // "Scene 3 End" for cross-scene
 }

 2C. Stage10: getAdjacentFrames() always returns data

 File: src/components/pipeline/Stage10FrameGeneration.tsx (lines 476-507)

 Current: Returns empty {} for first shot's start and last shot's end.
 New:
 - First shot START: prevEnd = adjacentSceneFrames.prevSceneEndFrame with isCrossScene: true
 - Last shot END: nextStart = adjacentSceneFrames.nextSceneStartFrame with isCrossScene: true
 - Within-scene: Always include adjacent shot's frame info even if imageUrl is null (as long as the frame     
 record exists). This ensures buttons render but disabled.

 ---
 Part 3: Cross-Scene Frame Data

 3A. Backend: Add adjacent scene frame data to GET frames

 File: backend/src/routes/frames.ts (lines 33-107)

 After line 94 (after frame_links query), add queries:

 // Fetch adjacent scene frames for cross-scene continuity
 let adjacentSceneFrames: any = {};

 // Previous scene's last shot's end frame
 const { data: prevScene } = await supabase
   .from('scenes')
   .select('id, scene_number')
   .eq('branch_id', project.active_branch_id)
   .eq('scene_number', scene.scene_number - 1)
   .single();

 if (prevScene) {
   const { data: prevLastShot } = await supabase
     .from('shots')
     .select('id, shot_id')
     .eq('scene_id', prevScene.id)
     .order('shot_order', { ascending: false })
     .limit(1)
     .single();

   if (prevLastShot) {
     const { data: prevEndFrame } = await supabase
       .from('frames')
       .select('id, image_url')
       .eq('shot_id', prevLastShot.id)
       .eq('frame_type', 'end')
       .single();

     if (prevEndFrame) {
       adjacentSceneFrames.prevSceneEndFrame = {
         frameId: prevEndFrame.id,
         imageUrl: prevEndFrame.image_url,
         sceneNumber: prevScene.scene_number,
         shotLabel: prevLastShot.shot_id,
       };
     }
   }
 }

 // Next scene's first shot's start frame (same pattern)
 const { data: nextScene } = await supabase
   .from('scenes')
   .select('id, scene_number')
   .eq('branch_id', project.active_branch_id)
   .eq('scene_number', scene.scene_number + 1)
   .single();

 if (nextScene) {
   const { data: nextFirstShot } = await supabase
     .from('shots')
     .select('id, shot_id')
     .eq('scene_id', nextScene.id)
     .order('shot_order', { ascending: true })
     .limit(1)
     .single();

   if (nextFirstShot) {
     const { data: nextStartFrame } = await supabase
       .from('frames')
       .select('id, image_url')
       .eq('shot_id', nextFirstShot.id)
       .eq('frame_type', 'start')
       .single();

     if (nextStartFrame) {
       adjacentSceneFrames.nextSceneStartFrame = {
         frameId: nextStartFrame.id,
         imageUrl: nextStartFrame.image_url,
         sceneNumber: nextScene.scene_number,
         shotLabel: nextFirstShot.shot_id,
       };
     }
   }
 }

 Include in response: adjacentSceneFrames

 3B. Frontend: Update response type

 File: src/lib/services/frameService.ts

 export interface FetchFramesResponse {
   shots: ShotWithFrames[];
   sceneNumber: number;
   costSummary: FrameCostSummary;
   allFramesApproved: boolean;
   links?: FrameLink[];
   adjacentSceneFrames?: {
     prevSceneEndFrame?: {
       frameId: string;
       imageUrl: string | null;
       sceneNumber: number;
       shotLabel: string;
     };
     nextSceneStartFrame?: {
       frameId: string;
       imageUrl: string | null;
       sceneNumber: number;
       shotLabel: string;
     };
   };
 }

 3C. Cross-scene pull operations

 Cross-scene pulls reuse existing copyFrameMutation / refFromFrameMutation — the backend copy-frame endpoint  
 fetches the source frame by ID with NO scene validation (line 1682-1686), so cross-scene source frames       
 already work.

 Cross-scene match copies also create reactive frame_links (backend handles this automatically). The
 frame_links query (line 80-83) already catches links where either side is a current scene frame.

 No new endpoints needed.

 ---
 Part 4: Confirmation Modal for Reactive Frame Edits

 File: src/components/pipeline/FramePanel.tsx

 When matchLink?.role === 'target', intercept these actions with a confirmation dialog:
 - Regenerate
 - Upload
 - Inpaint
 - Select different carousel item

 Dialog: Use existing AlertDialog from shadcn/ui:
 - Title: "Break continuity link?"
 - Body: "This frame is reactively linked from {otherLabel}. Editing it will break the link."
 - Actions: Cancel / "Break & Continue"
 - Optional: "Don't ask again this session" checkbox (useState flag, resets on page reload)

 Source frame (role === 'source') edits proceed without any modal — backend propagates changes to targets     
 automatically.

 ---
 Part 5: Clean Up Legacy Code

 File: src/components/pipeline/Stage10FrameGeneration.tsx
 - Remove getContinuityInfo() function (lines 423-430)
 - Remove getLinkTarget() function (lines 433-444)
 - Remove old props: continuityInfo, onRemoveLink, linkTarget, reactiveLink from both FramePanel instances    
 - Keep updateContinuityMutation (still needed for startContinuity field used by prompt generation)

 File: src/components/pipeline/FramePanel.tsx
 - Remove continuityInfo, onRemoveLink, linkTarget, reactiveLink from props interface
 - Remove old badge rendering blocks (lines 504-554)
 - Remove unused imports (Camera icon if no longer used)

 ---
 Files Modified

 ┌────────────────────────────────────────────────────┬───────────────────────────────────────────────────┐   
 │                        File                        │                      Changes                      │   
 ├────────────────────────────────────────────────────┼───────────────────────────────────────────────────┤   
 │ src/components/pipeline/FramePanel.tsx             │ Badge consolidation, button grid always visible + │   
 │                                                    │  cross-scene, confirm modal, prop cleanup         │   
 ├────────────────────────────────────────────────────┼───────────────────────────────────────────────────┤   
 │ src/components/pipeline/Stage10FrameGeneration.tsx │ getMatchLink(), cross-scene adjacentFrames, prop  │   
 │                                                    │ wiring, remove legacy                             │   
 ├────────────────────────────────────────────────────┼───────────────────────────────────────────────────┤   
 │ backend/src/routes/frames.ts                       │ Add adjacentSceneFrames to GET frames response    │   
 ├────────────────────────────────────────────────────┼───────────────────────────────────────────────────┤   
 │ src/lib/services/frameService.ts                   │ Update FetchFramesResponse type                   │   
 └────────────────────────────────────────────────────┴───────────────────────────────────────────────────┘   

 ---
 Implementation Order

 1. Backend: adjacentSceneFrames in GET frames      → enables cross-scene data
 2. Frontend types: FetchFramesResponse update       → compile
 3. Stage10: getMatchLink() + remove legacy funcs    → data flow
 4. Stage10: getAdjacentFrames() cross-scene support → edge frame data
 5. FramePanel: Badge consolidation + Break Link     → visual cleanup
 6. FramePanel: Button grid always visible           → button UX
 7. FramePanel: Confirmation modal                   → safety
 8. Both: Prop cleanup + unused imports              → housekeeping
 9. Lint + tests

 ---
 Verification

 1. Single badge: After match copy, source shows blue "Push Match TO Shot X", target shows amber "Pull Match  
 FROM Shot Y"
 2. Break Link: Prominent pill button next to badge, works from both source and target side
 3. Edge frame buttons: First shot's START shows "Pull Match from Scene N End" + "Pull Ref from Scene N End"  
 (disabled if no image). Last shot's END shows same for next scene
 4. Within-scene buttons: All 4 buttons visible on every within-scene frame. Pull disabled when adjacent has  
 no image. Push disabled when current has no image
 5. Reactive behavior: Source edits propagate silently; target edits trigger confirmation modal
 6. No duplicate badges: Only one badge from frame_links, no legacy continuity badges
 7. npm run lint + npm test + cd backend && npm test + Playwright E2E