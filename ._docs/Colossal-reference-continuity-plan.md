       ---
       Here is the complete implementation plan for the Reference/Camera-Angle-Change Continuity
       Enhancement (RD-3).

       Continuity Reference Enhancement Plan (RD-3)

       Overview

       This plan enhances the "reference" continuity flow to match the quality and UX parity of the
       already-complete "match" flow. It has three pillars:
       1. Smarter generation: Before generating a camera-change frame, analyze the reference image with       
       Gemini Vision and combine that analysis with scene asset descriptions to produce a semantically        
       richer continuity prompt.
       2. Tracked ref links: Store reference relationships in the frame_links table (alongside match
       links) so the UI can show persistent visual indicators and the backend can resolve fresh source        
       URLs at generation time.
       3. Frontend parity: Show ref link badges (like match badges) and upgrade ref button styling from       
       ghost to outline.

       ---
       Phase 1: Database Migration (035_frame_links_reference.sql)

       File: backend/migrations/035_frame_links_reference.sql (new file, USER runs migration)

       The current frame_links table (migration 034) constrains link_type to only 'match' and has a UNIQUE    
        on (target_frame_id, link_type). This needs two changes:

       1. Expand CHECK constraint to allow 'reference':
       ALTER TABLE frame_links DROP CONSTRAINT frame_links_link_type_check;
       ALTER TABLE frame_links ADD CONSTRAINT frame_links_link_type_check
         CHECK (link_type IN ('match', 'reference'));

       2. Change UNIQUE constraint from (target_frame_id, link_type) to just (target_frame_id), so a frame    
        can only have ONE link total (either match OR reference, not both simultaneously). This ensures       
       that pulling a ref on a frame that has a match replaces it, and vice versa:
       ALTER TABLE frame_links DROP CONSTRAINT frame_links_target_frame_id_link_type_key;
       ALTER TABLE frame_links ADD CONSTRAINT frame_links_target_frame_id_key UNIQUE(target_frame_id);        

       Impact on existing upsert calls: Currently, copy-frame (line 1860) and batch-link-copy (line 1712)     
       use { onConflict: 'target_frame_id,link_type' }. After this migration, change to { onConflict:
       'target_frame_id' }. This is safe because the new constraint is strictly more restrictive (one link    
        per target, regardless of type).

       ---
       Phase 2: Backend -- analyzeReferenceFrame() in imageAnalysisService.ts

       File: backend/src/services/imageAnalysisService.ts

       Add a new public method to ImageAnalysisService:

       async analyzeReferenceFrame(imageUrl: string): Promise<string> {

       This method:
       1. Downloads the reference frame image using the existing downloadImage() helper (line 118-143).       
       2. Sends it to gemini-2.5-flash with a structured extraction prompt.
       3. Returns a structured scene description string.

       The prompt should extract:
       - Characters: count, positions, expressions, clothing, body poses
       - Environment: setting type, background elements, lighting direction/quality, color temperature        
       - Props: visible objects and their positions
       - Atmosphere: mood, depth of field, overall composition

       Output format: plain text structured with labeled sections, suitable for injection into the
       continuity frame prompt. Target length: 300-500 characters.

       The method follows the exact same pattern as analyzeAssetImage() (line 35-88): download image,
       build prompt, call model.generateContent() with inlineData, return text.

       ---
       Phase 3: Backend -- Enhanced generateContinuityFramePrompt() in promptGenerationService.ts

       File: backend/src/services/promptGenerationService.ts

       Modify generateContinuityFramePrompt() (line 947-1012) to accept an optional scene analysis
       parameter:

       async generateContinuityFramePrompt(
         shot: ShotData,
         previousShot: ShotData,
         sceneAssets: SceneAssetInstanceData[],
         styleCapsule?: StyleCapsule | null,
         referenceFrameAnalysis?: string  // NEW optional parameter
       ): Promise<string> {

       When referenceFrameAnalysis is provided, inject it into the system prompt (line 962-996) as a new      
       section between the existing "WHAT MUST BE PRESERVED" and "WHAT CHANGES" sections:

       REFERENCE FRAME ANALYSIS (from vision analysis of the actual reference image):
       ${referenceFrameAnalysis}

       Use this analysis as ground truth for what is actually visible in the reference image.
       Prioritize these observations over metadata-only descriptions where they conflict.

       This approach is additive -- it does not break the existing metadata-based flow. When
       referenceFrameAnalysis is undefined (the existing generate-continuity-prompt endpoint), behavior is    
        unchanged.

       ---
       Phase 4: Backend -- Modified camera_change Generation Path in frameGenerationService.ts

       File: backend/src/services/frameGenerationService.ts

       This is the core change. Currently, the camera_change branch (line 325-342) simply uses the
       pre-generated continuity_frame_prompt and prepends the previous end frame as an identity reference.    
        The enhancement adds image analysis at generation time.

       4A. New private method: generateWithCameraChangeAnalysis()

       Add a new private method to FrameGenerationService:

       private async generateWithCameraChangeAnalysis(
         frameId: string,
         projectId: string,
         branchId: string,
         sceneId: string,
         shotId: string,
         shot: any,
         referenceImageUrl: string,
         visualStyleCapsuleId?: string,
         aspectRatio?: string,
         existingRefImages?: ReferenceImage[]
       ): Promise<void> {

       This method:
       1. Analyzes the reference image using
       imageAnalysisService.analyzeReferenceFrame(referenceImageUrl).
       2. Fetches scene asset instances for the scene (same query as the generate-continuity-prompt
       endpoint at frames.ts line 1953-1965).
       3. Fetches style capsule if visualStyleCapsuleId is provided.
       4. Generates an enhanced continuity prompt by calling
       promptGenerationService.generateContinuityFramePrompt() with all four parameters plus the analysis     
       string.
       5. Assembles reference images: prepends the reference image as role: 'identity' to any existing        
       shot reference images.
       6. Calls startFrameGeneration() with the enhanced prompt and assembled references.
       7. Saves the enhanced prompt back to shots.continuity_frame_prompt so it's visible in the UI for       
       debugging.

       Import requirements:
       - import { imageAnalysisService } from './imageAnalysisService.js'; (or dynamic import if circular     
       dependency risk, following the pattern from VideoJobExecutor).
       - import { promptGenerationService } from './promptGenerationService.js'; (already used elsewhere).    

       4B. Modify the generateFrames() camera_change branch (line 325-342)

       Replace the simple path:
       } else if (shot.start_continuity === 'camera_change' && previousEndFrameId) {
           const prompt = shot.continuity_frame_prompt || shot.frame_prompt;
           // ... fetch prevEndFrame, build refs, call startFrameGeneration

       With:
       } else if (shot.start_continuity === 'camera_change' && previousEndFrameId) {
           const { data: prevEndFrame } = await supabase
               .from('frames')
               .select('image_url')
               .eq('id', previousEndFrameId)
               .single();

           if (prevEndFrame?.image_url) {
               // Also check for a frame_link reference (may point to a different source than prev shot)      
               const { data: refLink } = await supabase
                   .from('frame_links')
                   .select('source_frame_id')
                   .eq('target_frame_id', startFrame.id)
                   .eq('link_type', 'reference')
                   .single();

               let refImageUrl = prevEndFrame.image_url;
               if (refLink) {
                   const { data: linkedFrame } = await supabase
                       .from('frames')
                       .select('image_url')
                       .eq('id', refLink.source_frame_id)
                       .single();
                   if (linkedFrame?.image_url) {
                       refImageUrl = linkedFrame.image_url;
                   }
               }

               await this.generateWithCameraChangeAnalysis(
                   startFrame.id, projectId, branchId, sceneId, shot.id,
                   shot, refImageUrl, visualStyleCapsuleId, aspectRatio, shotRefImages
               );
           } else {
               // Fallback: no reference image available, use normal generation
               await this.startFrameGeneration(
                   startFrame.id, projectId, branchId, sceneId, shot.id,
                   shot.frame_prompt, visualStyleCapsuleId, aspectRatio, shotRefImages
               );
           }
           jobsCreated++;
       }

       4C. Modify regenerateFrame() (line 645-805)

       Currently, regenerateFrame() has a match branch (line 678-751) but NO camera_change branch -- it       
       falls through to the generic generation path. Add a camera_change branch after the match branch:       

       // After line 751 (end of match block), before line 753 (generic path):
       if (frame.frame_type === 'start' && shot.start_continuity === 'camera_change') {
           // Find reference source: check frame_link first, then fall back to previous shot
           let refImageUrl: string | null = null;

           const { data: refLink } = await supabase
               .from('frame_links')
               .select('source_frame_id')
               .eq('target_frame_id', frameId)
               .eq('link_type', 'reference')
               .single();

           if (refLink) {
               const { data: linkedFrame } = await supabase
                   .from('frames')
                   .select('image_url')
                   .eq('id', refLink.source_frame_id)
                   .single();
               refImageUrl = linkedFrame?.image_url || null;
           }

           if (!refImageUrl) {
               // Fall back to previous shot's end frame
               const { data: allShots } = await supabase
                   .from('shots').select('id, shot_id')
                   .eq('scene_id', shot.scene_id)
                   .order('shot_order', { ascending: true });
               if (allShots) {
                   const idx = allShots.findIndex((s: any) => s.id === shot.id);
                   if (idx > 0) {
                       const { data: prevEnd } = await supabase
                           .from('frames').select('image_url')
                           .eq('shot_id', allShots[idx - 1].id)
                           .eq('frame_type', 'end')
                           .in('status', ['generated', 'approved'])
                           .single();
                       refImageUrl = prevEnd?.image_url || null;
                   }
               }
           }

           if (refImageUrl) {
               await this.generateWithCameraChangeAnalysis(
                   frameId, projectId, branchId, sceneId, shot.id,
                   shot, refImageUrl, visualStyleCapsuleId, aspectRatio
               );
               // Return updated frame
               const { data: updatedFrame } = await supabase.from('frames').select('*').eq('id',
       frameId).single();
               return this.mapFrameFromDb(updatedFrame);
           }
           // If no ref image available, fall through to generic generation below
       }

       ---
       Phase 5: Backend -- Modified add-frame-as-reference Endpoint

       File: backend/src/routes/frames.ts (line 883-966)

       Modify the existing endpoint to also create a frame_links record:

       After the existing reference_image_order update (line 956-959), add:

       // Find or create the target frame record
       const { data: targetFrame } = await supabase
           .from('frames')
           .select('id')
           .eq('shot_id', shotId)
           .eq('frame_type', targetFrameType)
           .single();

       if (targetFrame) {
           // Delete any existing link on the target (match OR ref)
           await supabase.from('frame_links').delete().eq('target_frame_id', targetFrame.id);

           // Create reference link
           await supabase.from('frame_links').insert({
               source_frame_id: sourceFrameId,
               target_frame_id: targetFrame.id,
               link_type: 'reference',
           });
       }

       // Also set start_continuity = 'camera_change' if this is a start frame
       if (targetFrameType === 'start') {
           await supabase
               .from('shots')
               .update({ start_continuity: 'camera_change', updated_at: new Date().toISOString() })
               .eq('id', shotId);
       }

       Also update the copy-frame endpoint (line 1860) and batch-link-copy (line 1712) to use onConflict:
       'target_frame_id' instead of 'target_frame_id,link_type', matching the new UNIQUE constraint.

       ---
       Phase 6: Backend -- Resolve Ref Links at Generation Time

       File: backend/src/services/frameGenerationService.ts

       When the generateWithCameraChangeAnalysis() method (from Phase 4A) resolves the reference image, it    
        should also update the stale URL in reference_image_order if the source frame's image has changed     
       since the ref was pulled:

       // Inside generateWithCameraChangeAnalysis(), after resolving the live source URL:
       const { data: currentRefOrder } = await supabase
           .from('shots')
           .select('reference_image_order')
           .eq('id', shotId)
           .single();

       if (currentRefOrder?.reference_image_order) {
           const order = currentRefOrder.reference_image_order as any[];
           const continuityEntry = order.find((e: any) => e.type === 'continuity');
           if (continuityEntry && continuityEntry.url !== referenceImageUrl) {
               continuityEntry.url = referenceImageUrl;
               await supabase
                   .from('shots')
                   .update({ reference_image_order: order })
                   .eq('id', shotId);
           }
       }

       This ensures backward compatibility -- the fetchShotReferenceImages() method (line 500-515) reads      
       from reference_image_order, so it will pick up the fresh URL.

       ---
       Phase 7: Frontend -- Rename matchLink to continuityLink and Update Badge Rendering

       File: src/components/pipeline/FramePanel.tsx

       7A. Update the prop interface (line 97-101)

       Replace:
       matchLink?: {
         role: 'source' | 'target';
         linkId: string;
         otherLabel: string;
       };

       With:
       continuityLink?: {
         linkType: 'match' | 'reference';
         role: 'source' | 'target';
         linkId: string;
         otherLabel: string;
       };

       7B. Update badge rendering (line 488-511)

       Replace the existing match link badge block with a unified block that handles both types:

       {continuityLink && (
         <div className="flex items-center gap-1.5 mb-2">
           <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px]
       font-medium ${
             continuityLink.linkType === 'match'
               ? continuityLink.role === 'source'
                 ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                 : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
               : continuityLink.role === 'source'
                 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                 : 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
           }`}>
             <Link2 className="w-3 h-3" />
             {continuityLink.linkType === 'match'
               ? continuityLink.role === 'source'
                 ? `Push Match TO ${continuityLink.otherLabel}`
                 : `Pull Match FROM ${continuityLink.otherLabel}`
               : continuityLink.role === 'source'
                 ? `Ref Source → ${continuityLink.otherLabel}`
                 : `Ref FROM ${continuityLink.otherLabel}`}
           </span>
           {onBreakLink && (
             <button
               onClick={() => onBreakLink(continuityLink.linkId)}
               className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium     
                 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors"
             >
               <Unlink className="w-3 h-3" />
               Break Link
             </button>
           )}
         </div>
       )}

       Badge color scheme:







       ┌───────────┬────────┬───────────────────┬──────────────────┐
       │   Type    │  Role  │    Background     │    Text Color    │
       ├───────────┼────────┼───────────────────┼──────────────────┤
       │ Match     │ Source │ bg-blue-500/20    │ text-blue-300    │
       ├───────────┼────────┼───────────────────┼──────────────────┤
       │ Match     │ Target │ bg-amber-500/20   │ text-amber-300   │
       ├───────────┼────────┼───────────────────┼──────────────────┤
       │ Reference │ Source │ bg-emerald-500/20 │ text-emerald-300 │
       ├───────────┼────────┼───────────────────┼──────────────────┤
       │ Reference │ Target │ bg-violet-500/20  │ text-violet-300  │
       └───────────┴────────┴───────────────────┴──────────────────┘

       For ref target frames: NO reactive behavior -- no confirmation modal on carousel select. The ref is    
        context for the next generation; editing the target does not break anything.

       ---
       Phase 8: Frontend -- Update getMatchLink() to getContinuityLink()

       File: src/components/pipeline/Stage10FrameGeneration.tsx

       8A. Rename getMatchLink (line 424-464) to getContinuityLink

       Update the return type to include linkType:

       const getContinuityLink = useCallback((frame: Frame | null): {
         linkType: 'match' | 'reference';
         role: 'source' | 'target';
         linkId: string;
         otherLabel: string;
       } | undefined => {

       The logic stays the same, but each FrameLink object already has linkType (from the backend response    
        at frames.ts line 90). Add linkType: asTarget.linkType or linkType: asSource.linkType to each
       return object.

       8B. Update FrameLink type (src/types/scene.ts line 327-333)

       Change:
       linkType: 'match';
       To:
       linkType: 'match' | 'reference';

       8C. Update all FramePanel call sites

       Replace matchLink={getMatchLink(selectedShot.startFrame)} (line 942) with
       continuityLink={getContinuityLink(selectedShot.startFrame)}.

       Same for the end frame FramePanel at line 1071.

       ---
       Phase 9: Frontend -- Upgrade Ref Button Styling

       File: src/components/pipeline/FramePanel.tsx (lines 703-713, 755-765, 727-737, 779-789)

       Change all four ref buttons from:
       <Button variant="ghost" size="sm" className="text-xs h-7 text-muted-foreground">
       To:
       <Button variant="outline" size="sm" className="text-xs h-7">

       This affects the "Pull ref" buttons (prevEnd at line 703, nextStart at line 755) and "Push ref"        
       buttons (prevEnd at line 727, nextStart at line 779).

       ---
       Phase 10: Lint and Tests

       1. Run npm run lint from both frontend and backend directories on all modified files.
       2. Backend tests (cd backend && npm test):
         - Existing frame-related tests should pass (the only DB schema change is additive).
         - Consider adding a test for analyzeReferenceFrame() in imageAnalysisService if a test file
       exists.
       3. Frontend tests (npm test from root):
         - FramePanel tests: update any test that passes matchLink prop to use continuityLink instead.        
         - Stage10 tests: update any test that calls getMatchLink to use getContinuityLink.

       ---
       Implementation Dependency Graph

       Phase 1 (Migration)
           |
           v
       Phase 2 (analyzeReferenceFrame) ----+
           |                                |
           v                                v
       Phase 3 (Enhanced continuity prompt) |
           |                                |
           v                                |
       Phase 4 (camera_change gen path) <---+
           |
       Phase 5 (add-frame-as-reference endpoint)
           |
       Phase 6 (Resolve ref links at gen time)
           |
           +--- Independent ---+
           |                    |
           v                    v
       Phase 7 (continuityLink badge)  Phase 9 (ref button styling)
           |
           v
       Phase 8 (getContinuityLink + types)
           |
           v
       Phase 10 (Lint + tests)

       Phases 2 and 3 can be done in parallel since they are different files. Phases 7-9 (frontend) depend    
        only on Phase 1 (migration) and Phase 5 (backend endpoint), and can be done in parallel with each     
       other.

       ---
       Verification Checklist

       1. Migration runs: frame_links now accepts link_type = 'reference' and has UNIQUE(target_frame_id)     
       instead of UNIQUE(target_frame_id, link_type).
       2. Pull ref creates frame_link: After clicking "Pull ref from {shot}", a frame_links record with       
       link_type = 'reference' exists in the DB.
       3. Pull ref replaces existing match link: If a frame had a match link and you pull ref, the match      
       link is deleted and replaced with a reference link.
       4. Ref badge visible: After pulling ref, the target frame shows a violet badge "Ref FROM
       {shotLabel}" and the source frame shows an emerald badge "Ref Source -> {shotLabel}".
       5. Break Link works: Clicking "Break Link" on a ref badge removes the frame_links record.
       6. camera_change generation uses analysis: When generating a frame with start_continuity =
       'camera_change', the console logs show [ImageAnalysis] analysis happening before generation.
       7. Regenerate respects camera_change: Regenerating a camera_change frame triggers the enhanced
       analysis path.
       8. Stale URL refresh: If the source frame's image changed since ref was pulled, generation uses the    
        fresh URL and updates reference_image_order.
       9. No reactive propagation for refs: Editing a source frame that has reference links does NOT
       auto-update the target (only match links propagate).
       10. Ref buttons are visually elevated: Ref buttons use variant="outline" styling instead of
       variant="ghost".
       11. Lint passes: npm run lint clean on all modified files.
       12. Tests pass: Both npm test (frontend) and cd backend && npm test pass.

       ---
       Critical Files for Implementation

       - backend/src/services/frameGenerationService.ts - Core generation logic: camera_change branch
       (line 325), regenerateFrame (line 645), new generateWithCameraChangeAnalysis() method
       - backend/src/services/imageAnalysisService.ts - New analyzeReferenceFrame() method using existing     
       Gemini Vision infrastructure
       - backend/src/routes/frames.ts - Modified add-frame-as-reference endpoint (line 883) to create
       frame_links records, updated upsert onConflict clauses
       - src/components/pipeline/FramePanel.tsx - Rename matchLink to continuityLink prop (line 97),
       update badge rendering (line 488), upgrade ref button styling (lines 703-789)
       - src/components/pipeline/Stage10FrameGeneration.tsx - Rename getMatchLink to getContinuityLink        
       (line 424), update both FramePanel call sites (lines 942, 1071)


  ⎿  Done (50 tool uses · 72.2k tokens · 3m 59s)

