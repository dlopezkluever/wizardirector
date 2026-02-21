 Fix: Post-Transformation Image Overwrites Scene Asset + End Frame Ref Images

 Context

 Critical Bug: When generating a post-transformation image via "Generate Image" on a transformation event card, the
 ImageGenerationService completion handler automatically updates scene_asset_instances.image_key_url — because the endpoint uses   
 jobType: 'scene_asset'. This overwrites the pre-transformation image, causing ALL shots in Stage 9 (including shots before the    
 trigger) to use the post-transformation image as their default reference.

 Secondary Fix: End frame reference images for within_shot trigger shots should use post-transformation images. Currently the end  
 frame prompt correctly uses post-descriptions, but reference images passed to the image generation API are still pre-state.       

 ---
 Fix 1: New jobType for Post-Transformation Image Generation

 Root Cause

 backend/src/routes/sceneAssets.ts line ~1841 — generate-post-image endpoint:
 const result = await imageService.createImageJob({
     jobType: 'scene_asset',  // <-- THIS IS THE PROBLEM
     ...
 });

 backend/src/services/image-generation/ImageGenerationService.ts lines 461-466 — completion handler:
 // Keep existing image_key_url update
 await supabase
     .from('scene_asset_instances')
     .update({ image_key_url: urlData.publicUrl })  // Overwrites pre-state!
     .eq('scene_id', request.sceneId)
     .eq('project_asset_id', request.assetId);

 Changes

 File: backend/src/services/image-generation/ImageGenerationService.ts

 1. Add 'transformation_post' to jobType union on CreateImageJobRequest (line 16):
 'master_asset' | 'start_frame' | 'end_frame' | 'inpaint' | 'scene_asset' | 'angle_variant' | 'transformation_post'
 2. Add optional transformationEventId?: string field to CreateImageJobRequest (after line 28)
 3. Add completion handler branch BEFORE the existing scene_asset check (~line 420):
 if (request.jobType === 'transformation_post' && request.transformationEventId) {
     await supabase
         .from('transformation_events')
         .update({ post_image_key_url: urlData.publicUrl })
         .eq('id', request.transformationEventId);
     console.log(`[ImageService] Updated transformation_events.post_image_key_url for event ${request.transformationEventId}`);    
 }
 3. The existing scene_asset branch (line 421: if (request.jobType === 'scene_asset' && ...)) will NOT fire for
 transformation_post jobs.

 File: backend/src/routes/sceneAssets.ts (~line 1841)

 Change in the generate-post-image endpoint:
 - jobType: 'scene_asset' → jobType: 'transformation_post'
 - Add transformationEventId: eventId

 File: src/components/pipeline/Stage8/VisualStateEditorPanel.tsx (handleGeneratePostImage)

 - Keep the frontend's existing updateEvent() call on poll completion as redundant safety (backend now also updates
 post_image_key_url)
 - Add queryClient.invalidateQueries for transformation events after completion so the UI picks up the backend-set image URL       

 ---
 Fix 2: End Frame Reference Images for Within-Shot Transformations

 Problem

 For within_shot trigger shots:
 - End frame PROMPT correctly uses post-description (promptGenerationService.ts:610-615)
 - End frame REFERENCE IMAGES use shot.reference_image_order — built for the start frame (pre-state)
 - Mismatch: end frame prompt asks for post-transformation appearance but reference images show pre-state

 Approach: Runtime Resolution at Frame Generation

 No schema migration needed. Resolve at frame generation time by fetching transformation events.

 File: backend/src/services/frameGenerationService.ts

 Add private method resolveEndFrameReferenceImages(shotId, sceneId, baseRefImages):
 1. Query confirmed within_shot transformation events for the scene (with trigger_shot join for shot_order, scene_asset_instance   
 join for current image_key_url)
 2. Get the current shot's shot_order
 3. Filter to events where this shot IS the trigger (shot_order match)
 4. For each matching event that has post_image_key_url: find the pre-state URL in baseRefImages and swap it to post-state URL     
 5. Return modified reference list (or original if no transformations)

 Update generateFrames() (~line 265-290): Before building end frame reference images, call resolveEndFrameReferenceImages():       
 // Current code:
 const endRefImages = [...shotRefImages];

 // New code:
 const endRefImages = await this.resolveEndFrameReferenceImages(shot.id, sceneId, shotRefImages);
 Then prepend start frame image as before.

 Update regenerateFrame() (~line 526-538): Same pattern — when frame_type is 'end', call resolveEndFrameReferenceImages() before   
 building reference list.

 ---
 Files Modified

 File: backend/src/services/image-generation/ImageGenerationService.ts
 Changes: Add 'transformation_post' jobType, transformationEventId field, completion handler for transformation events
 ────────────────────────────────────────
 File: backend/src/routes/sceneAssets.ts
 Changes: Change jobType to 'transformation_post' + pass transformationEventId in generate-post-image endpoint
 ────────────────────────────────────────
 File: backend/src/services/frameGenerationService.ts
 Changes: Add resolveEndFrameReferenceImages() method; update generateFrames() and regenerateFrame() to use it for end frames      
 ────────────────────────────────────────
 File: src/components/pipeline/Stage8/VisualStateEditorPanel.tsx
 Changes: Add query invalidation after image generation completes

 ---
 Verification

 1. Bug fix test: Generate a post-transformation image → verify scene_asset_instances.image_key_url is NOT updated → regenerate    
 Stage 9 prompts → verify pre-trigger shots use pre-transformation reference image, post-trigger shots use post-transformation     
 image
 2. Post-image saved: After generating, verify transformation_events.post_image_key_url is set (UI shows image on card)
 3. End frame ref test: For within_shot transformation at trigger shot, generate end frame → verify backend logs show
 post-transformation image URL in reference images
 4. Lint: npm run lint on modified files
 5. Tests: npm test (frontend) + cd backend && npm test (backend)