  Root cause confirmed: resolveEndFrameReferenceImages() matches by exact URL, but the stored referenceImageOrder may use
  matched_angle_url (from angle variants) while the method compares against scene_asset_instances.image_key_url — a different URL. 
  The swap silently fails.
                                                                                                                                   
  Three-part fix:
  1. Bug fix — Match by asset name instead of URL, use direct FK filter instead of fragile join
  2. API + Display — Return separate endFrameReferenceImageOrder in the frames response, show different refs for start vs end      
  FramePanel
  3. Edit UI — Clickable ref thumbnails with a picker showing available alternatives (scene asset, master, angle variants,
  post-transformation images)

  Requires one manual SQL: ALTER TABLE shots ADD COLUMN IF NOT EXISTS end_frame_reference_image_order JSONB DEFAULT NULL;

─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── Ready to code?

 Here is Claude's plan:
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌ Fix: End Frame Reference Images for Transformation Events + Editable Refs

 Context

 After implementing the transformation_post jobType fix and determineRequiresEndFrame override (previous session), the end frame   
 for within_shot trigger shots still uses the pre-state reference image. Two confirmed issues:

 1. URL matching bug in resolveEndFrameReferenceImages(): During Stage 9, buildNumberedImageManifest() stores matched_angle_url    
 (or scene-level URL) in referenceImageOrder. But during frame generation, the method fetches scene_asset_instances.image_key_url  
 and tries to find it in the reference list. When the stored URL came from matched_angle_url, the URLs don't match and the swap    
 silently fails. Even without angle variants, URL matching is fragile.
 2. Frontend shows same refs for start and end frames: fetchFramesForScene() returns one referenceImageOrder per shot (no
 end-frame-specific field). Both FramePanels show pre-state refs.
 3. User feature request: Allow reference image thumbnails to be clickable/editable.

 ---
 Part 1: Fix resolveEndFrameReferenceImages() — Asset Name Matching

 File: backend/src/services/frameGenerationService.ts

 Replace the current resolveEndFrameReferenceImages() method. Key changes:
 - Read full reference_image_order from shot (preserving assetName field)
 - Use trigger_shot_id = shotId directly (no FK join needed, no shot_order comparison)
 - Match by assetName (case-insensitive) instead of URL
 - Log clear warning when post_image_key_url is null

 private async resolveEndFrameReferenceImages(
     shotId: string,
     sceneId: string,
     baseRefImages: ReferenceImage[]
 ): Promise<ReferenceImage[]> {
     const { data: shot } = await supabase
         .from('shots')
         .select('reference_image_order, end_frame_reference_image_order')
         .eq('id', shotId)
         .single();
     if (!shot) return [...baseRefImages];

     // If user has manually set end frame refs, use those
     const endRefOverride = shot.end_frame_reference_image_order as any[] | null;
     if (endRefOverride?.length) {
         return endRefOverride.map((e: any) => ({ url: e.url, role: 'identity' as const }));
     }

     const refOrder = shot.reference_image_order as Array<{ url: string; assetName?: string }> | null;
     if (!refOrder?.length) return [...baseRefImages];

     // Query within_shot events where this shot is the trigger
     const { data: events } = await supabase
         .from('transformation_events')
         .select(`
             id, post_image_key_url,
             scene_asset_instance:scene_asset_instances(
                 project_asset:project_assets(name)
             )
         `)
         .eq('scene_id', sceneId)
         .eq('confirmed', true)
         .eq('transformation_type', 'within_shot')
         .eq('trigger_shot_id', shotId);

     if (!events?.length) return [...baseRefImages];

     const result = refOrder.map(entry => ({ url: entry.url, role: 'identity' as const }));

     for (const event of events) {
         if (!event.post_image_key_url) {
             console.warn(`[FrameService] within_shot event ${event.id} has no post_image_key_url`);
             continue;
         }
         const name = (event.scene_asset_instance as any)?.project_asset?.name;
         if (!name) continue;

         const idx = refOrder.findIndex(r => r.assetName?.toUpperCase() === name.toUpperCase());
         if (idx !== -1) {
             console.log(`[FrameService] Swapping end frame ref for ${name}`);
             result[idx] = { url: event.post_image_key_url, role: 'identity' as const };
         }
     }
     return result;
 }

 ---
 Part 2: Return End Frame Refs in API + Frontend Display

 File: backend/src/services/frameGenerationService.ts

 Update ShotWithFrames interface — add field:
 endFrameReferenceImageOrder: { label: string; assetName: string; url: string; type: string }[] | null;

 Update fetchFramesForScene():

 After fetching shots, add one query for all confirmed within_shot events in the scene. Then for each shot, compute end frame      
 refs:

 // After existing shot fetch, add:
 const { data: transformEvents } = await supabase
     .from('transformation_events')
     .select(`
         id, post_image_key_url, trigger_shot_id,
         scene_asset_instance:scene_asset_instances(
             project_asset:project_assets(name)
         )
     `)
     .eq('scene_id', sceneId)
     .eq('confirmed', true)
     .eq('transformation_type', 'within_shot');

 // In the shots.map() transform, for each shot:
 // 1. Check if shot.end_frame_reference_image_order exists (user override) → use that
 // 2. Else check transformEvents for trigger_shot_id === shot.id → clone ref_order, swap URLs
 // 3. Else null

 Also add end_frame_reference_image_order to the select query on shots.

 File: src/types/scene.ts

 Add to ShotWithFrames:
 endFrameReferenceImageOrder?: ReferenceImageOrderEntry[] | null;

 File: src/components/pipeline/Stage10FrameGeneration.tsx

 Line ~637 (start frame panel) — unchanged: referenceImages={selectedShot.referenceImageOrder ?? undefined}

 Line ~691 (end frame panel) — change to:
 referenceImages={selectedShot.endFrameReferenceImageOrder ?? selectedShot.referenceImageOrder ?? undefined}

 ---
 Part 3: Editable Reference Images

 SQL (run manually in Supabase SQL Editor):

 ALTER TABLE shots ADD COLUMN IF NOT EXISTS end_frame_reference_image_order JSONB DEFAULT NULL;

 Backend: New Endpoint

 File: backend/src/routes/frames.ts

 Add PUT /:projectId/scenes/:sceneId/shots/:shotId/reference-images:
 - Body: { frameType: 'start' | 'end', referenceImages: { label, assetName, url, type }[] }
 - For start: updates shots.reference_image_order
 - For end: updates shots.end_frame_reference_image_order

 File: backend/src/routes/frames.ts

 Add GET /:projectId/scenes/:sceneId/shots/:shotId/available-references:
 - Returns all available reference images for the shot, grouped by asset:
 [
   {
     "assetName": "SPONGEBOND",
     "assetType": "character",
     "options": [
       { "url": "...", "source": "scene_instance", "label": "Scene Asset" },
       { "url": "...", "source": "master", "label": "Master Asset" },
       { "url": "...", "source": "transformation_post", "label": "Post-Transformation", "eventId": "..." },
       { "url": "...", "source": "angle_variant", "label": "Side Angle", "angleType": "side" }
     ]
   }
 ]
 - Queries: scene_asset_instances (with project_asset, angle_variants), transformation_events (post images)

 Frontend: Edit UI

 File: src/lib/services/frameService.ts

 Add methods:
 - updateReferenceImages(projectId, sceneId, shotId, frameType, refs) → PUT endpoint
 - fetchAvailableReferences(projectId, sceneId, shotId) → GET endpoint

 File: src/components/pipeline/ReferenceImageThumbnail.tsx

 Add optional onReplace prop. When provided:
 - Wrap the thumbnail in a button-like container with a subtle edit indicator
 - On click, emit onReplace(index) to parent

 File: src/components/pipeline/FramePanel.tsx

 Add onUpdateReferenceImages?: (refs: ReferenceImageEntry[]) => void prop. When provided:
 - Pass onReplace to each ReferenceImageThumbnail
 - When onReplace(index) fires, show a popover/dropdown anchored to that thumbnail with available alternatives fetched from the    
 available-references endpoint
 - On selection, update the ref list and call onUpdateReferenceImages

 File: src/components/pipeline/Stage10FrameGeneration.tsx

 Wire up the edit flow:
 - Add mutation for frameService.updateReferenceImages()
 - Pass onUpdateReferenceImages to both start and end FramePanels
 - Start frame edits: save to reference_image_order (frameType: 'start')
 - End frame edits: save to end_frame_reference_image_order (frameType: 'end')
 - Invalidate frames query after save

 ---
 Files Modified

 File: backend/src/services/frameGenerationService.ts
 Changes: Fix resolveEndFrameReferenceImages() (name matching, respect user overrides), add endFrameReferenceImageOrder to
   interface + fetchFramesForScene(), select end_frame_reference_image_order column
 ────────────────────────────────────────
 File: backend/src/routes/frames.ts
 Changes: Add PUT /:shotId/reference-images, add GET /:shotId/available-references
 ────────────────────────────────────────
 File: src/types/scene.ts
 Changes: Add endFrameReferenceImageOrder to ShotWithFrames
 ────────────────────────────────────────
 File: src/lib/services/frameService.ts
 Changes: Add updateReferenceImages() and fetchAvailableReferences() methods
 ────────────────────────────────────────
 File: src/components/pipeline/Stage10FrameGeneration.tsx
 Changes: Pass end frame refs to end FramePanel, wire up edit mutations
 ────────────────────────────────────────
 File: src/components/pipeline/FramePanel.tsx
 Changes: Add onUpdateReferenceImages prop, replacement picker popover
 ────────────────────────────────────────
 File: src/components/pipeline/ReferenceImageThumbnail.tsx
 Changes: Add onReplace prop, edit indicator

 SQL (manual, before deploying): ALTER TABLE shots ADD COLUMN IF NOT EXISTS end_frame_reference_image_order JSONB DEFAULT NULL;    

 ---
 Implementation Order

 1. Run SQL first (prerequisite for Parts 2 & 3)
 2. Part 1: Fix resolveEndFrameReferenceImages() — immediate bug fix
 3. Part 2: API response + frontend display — show correct refs
 4. Part 3: Edit UI — backend endpoints first, then frontend
 5. Lint + test

 Verification

 1. Bug fix: Generate end frame for 2C → backend logs show [FrameService] Swapping end frame ref for SPONGEBOND
 2. API response: GET .../frames → shot 2C endFrameReferenceImageOrder has post-transformation URL
 3. Frontend: End FramePanel shows post-transformation thumbnail; Start shows pre-transformation
 4. Edit flow: Click ref thumbnail → see alternatives → swap → verify saved to backend
 5. Lint: cd "C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector" && npm run lint + cd "C:\Users\Daniel
 Lopez\Desktop\Aiuteur\wizardirector\backend" && npx tsc --noEmit
 6. Tests: npm test (frontend) + cd backend && npm test (backend)
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌