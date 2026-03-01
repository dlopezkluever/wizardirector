So, we need to correct the, uh, adding assets functionality for stage 8. Like the manual additions to uh, stage 8. Right now, if you try to manually add an asset in, from both the global library and, the project assets that were defined in stage five. You get this invalid error message: (((Request URL
http://localhost:8080/api/projects/517a4cda-618b-4216-b105-42dbc68103cf/scenes/343199c9-3074-4403-a883-f6c3eef4f144/assets
Request Method
POST
Status Code
400 Bad RequesT   ... gets this response: {
    "error": "Invalid request",
    "details": [
        {
            "code": "invalid_type",
            "expected": "string",
            "received": "null",
            "path": [
                "descriptionOverride"
            ],
            "message": "Expected string, received null"
        }
    ]
} ))) 

This is an issue because, A user may accidentally delete an asset that they needed to define stage 8 for the relevant scene and can not be able to bring it back into the scene. 




Additionally, I want to get rid of this extra friction caused by having to pick whether to automatically bring in assets to stage 8 or to add them manually. Like instead of having to ever seen this screen, the assets should automatically be selected and populated in the stage 8 arena. Then, if the user wishes to change which assets are to be at play in the scene, they can just manually add & delete them




Additionally, there needs to be the ability to merge assets OR recategorize them. Like say in the asset extraction that occurs after stage 4, the system deems a certain asset as a prop when really it's a character, the user should be able to recategroize it.

(check other files to see if i talk more about these needed fixes)
------


## **------------**

To make the askAuteurQuestion tool, I think it should be a togglable (& recommended) setting in stage 1, where the user can choose to be Interviewed by the LLM over key questions to help flesh out the ideas of the story. Definetly have this toogle for the Streamline mode, but may also be worth having the option for all or some of the odd



User ca upload images of friends / family / celebrities to be used in a story, 
1. u upload a fotograph, and you denote each person in image with name and how to change them visually. So for example, you upload a pic with grandma, sister, brother, and you. 

you say, the elderly lady on the far right will be M, she will be wearing a pantsuit, have a short, stylized hair, and will speak with a posh british accent version of the Submited voice clip of hers (think like a 5 minute clip the user also )


**------------**


----



**CONCERNS THAT REMAIN**:
✻ Brewed for 1m 25s

❯ Now, i need you too quickly discuss with me (no codign here) how, when manually adding assets, how they then proceed to get utilized in stage 9 & 10.  like for instance, if a        
  scene has bob and alice, and the user adds an asset to take the role of alice, as it was missed in the extraction for scene 5 OR maybe they deleted the orignal alice asset by        
  accident, how does the new alice asset get added so likei it used for the frame and video generation. I believe that our current system for making frame image gneeration only        
  uses the asset image as like attached reference images, that the image generator can then infer from. So going back to our example. if the frame prompt has the bob asset             
  attached and then the alice one also attached, will it know to use this alice as the girl in the image? like do you understand what im getting at. Additionally how does the          
  system know which shots to use a newly added asset in, i tried it myself and say the added asset get labeled as being a part of every shot, but what if the user only wants it        
  for one shot, is there a way to edit this? Also, what happens if the asset isnt in the startign frame of a shot, but like say walks into the view in the middle of the shot, and      
  is thus in the end shot? let's dicuss these concerns, i just want to make sure we are covering all out bases                                                                          

● Good questions — let me trace through the actual code to give you accurate answers rather than guessing. Let me look at how assets flow from Stage 8 into frame/video generation.     

● Explore(Trace asset flow Stage 8→9→10)
  ⎿  Done (42 tool uses · 102.4k tokens · 2m 4s)
  (ctrl+o to expand)

● Great, now I have a clear picture of the full flow. Let me walk through your concerns one by one.

  ---
  How assets reach frame/video generation

  The chain is: Stage 8 (assets) → Stage 9 (prompts) → Stage 10 (frames) → Stage 12 (video)

  - In Stage 9, when prompts are generated, buildNumberedImageManifest() in promptGenerationService.ts gathers all scene asset instances, sorts them (characters → locations → props),
  and builds a numbered manifest like:
  REFERENCE IMAGES (attached alongside this prompt):
  Image #1: Alice (character)
  Image #2: Bob (character)
  Image #3: Living Room (location)
  - This manifest text is baked into the frame prompt sent to the LLM, and the actual image URLs are stored in shots.reference_image_order.
  - In Stage 10, frameGenerationService reads reference_image_order, converts them to { url, role: 'identity' } reference images, and passes them alongside the prompt to the image     
  generation API.

  So yes — the mapping between "Alice the character" and "reference image #1" is implicit through prompt text, not through any structured API parameter. The image generator receives   
  the images as identity references and has to infer from the prompt which image corresponds to which person in the scene.

  Is that reliable? It depends on the image model. For 2-character scenes it generally works, but it's a known weakness — the model could confuse which reference image maps to which   
  character, especially if both are similar-looking or the prompt isn't specific enough about visual traits.

  ---
  How does the system know which shots to use a newly added asset in?

  Short answer: it doesn't discriminate. All scene assets go into all shots.

  When you regenerate Stage 9 prompts, buildNumberedImageManifest() pulls every scene_asset_instance for that scene and includes them all in every shot's reference images. There is no 
  per-shot asset filter.

  What you observed (the asset showing up in every shot) is exactly the current behavior — and there's currently no UI or mechanism to exclude an asset from a specific shot.

  ---
  Can the user control per-shot asset assignment?

  Not currently. There's no:
  - "Include/exclude this asset in this shot" toggle
  - Shot-level asset relevance tagging
  - Per-shot asset filtering UI

  The only per-shot asset variation that exists is transformation events (Stage 8), which can swap an asset's image for the end frame of a specific shot (e.g., costume change
  mid-shot). But that's about appearance changes, not inclusion/exclusion.

  ---
  What about an asset that enters mid-shot?

  This is the most interesting gap. Right now:

  - Start frame: Uses the full reference_image_order (all assets)
  - End frame: Uses the same references, BUT resolveEndFrameReferenceImages() can swap in post-transformation images if a within_shot transformation event exists

  So if Alice walks into frame mid-shot and should only appear in the end frame but not the start frame, there's no mechanism for that. The system would include Alice's reference image   in both frames. The video prompt text might say "Alice enters from the left," but her reference image would still be attached to the start frame generation, potentially causing the 
  image model to put her in both frames.

  ---
  Summary of gaps

  ┌────────────────────────────────┬────────────────────────────────────────────────────────────────┐
  │            Concern             │                         Current state                          │
  ├────────────────────────────────┼────────────────────────────────────────────────────────────────┤
  │ Character-to-reference mapping │ Implicit via prompt text — fragile for similar characters      │
  ├────────────────────────────────┼────────────────────────────────────────────────────────────────┤
  │ Per-shot asset inclusion       │ No filter — all scene assets go in all shots                   │
  ├────────────────────────────────┼────────────────────────────────────────────────────────────────┤
  │ Newly added asset propagation  │ Manual — user must regenerate Stage 9 prompts                  │
  ├────────────────────────────────┼────────────────────────────────────────────────────────────────┤
  │ Asset enters mid-shot          │ No start-only vs end-only distinction for reference images     │
  ├────────────────────────────────┼────────────────────────────────────────────────────────────────┤
  │ Asset in only one shot         │ Not possible without regenerating and manually editing prompts │
  └────────────────────────────────┴────────────────────────────────────────────────────────────────┘

  These are real gaps. Want to discuss which of these you'd want to address first, or should I sketch out a lightweight per-shot asset relevance system that could solve several of     
  these at once?










─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── Ready to code?

 Here is Claude's plan:
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌ Fix: Stage 8 Manual Asset Addition — descriptionOverride: null Validation Error

 Context

 When a user manually adds an asset to a scene in Stage 8 (from either the project asset library or global library), the POST request to
 /api/projects/:id/scenes/:sceneId/assets fails with a 400 Bad Request. The error:

 "descriptionOverride": Expected string, received null

 This blocks users from re-adding accidentally deleted assets to a scene — a critical usability issue.

 Root Cause

 Two layers of mismatch between frontend and backend:

 1. Frontend sends null — AssetDrawer.tsx explicitly passes descriptionOverride: null when adding assets (lines 131, 151). The frontend service        
 (sceneAssetService.ts:156) serializes it as-is into JSON, so the payload contains "descriptionOverride": null.
 2. Backend Zod schema rejects null — CreateSceneAssetInstanceSchema (sceneAssets.ts:42) defines descriptionOverride: z.string().optional(), which     
 accepts undefined but NOT null. The UPDATE schema on line 49 already correctly uses .optional().nullable().

 Fix

 Change 1 — Backend: Allow null in Zod schema (primary fix)

 File: backend/src/routes/sceneAssets.ts line 42

 - descriptionOverride: z.string().optional(),
 + descriptionOverride: z.string().optional().nullable(),

 This matches the existing UpdateSceneAssetInstanceSchema pattern (line 49) and aligns with how the downstream service (assetInheritanceService.ts)    
 already handles null values.

 Change 2 — Frontend: Don't send null, omit the field instead (defense in depth)

 File: src/components/pipeline/AssetDrawer.tsx lines 128–134, 148–154

 Remove descriptionOverride: null from both handleSelectProjectAsset and ensureSceneInstanceIfNeeded call sites. When the user is adding an existing   
 project asset without overriding its description, the field should simply be omitted (let it be undefined), not explicitly set to null.

   const instance = await sceneAssetService.createSceneAsset(projectId, {
     sceneId,
     projectAssetId: asset.id,
 -   descriptionOverride: null,
     statusTags: [],
     carryForward: true,
   });

 (Apply to both occurrences at lines ~131 and ~151.)

 Change 3 — Frontend: Update type to allow null

 File: src/types/scene.ts line 178

 - descriptionOverride?: string;
 + descriptionOverride?: string | null;

 This makes the type honest about what callers actually pass. Even though Change 2 removes the explicit null calls in AssetDrawer, other callers may   
 legitimately pass null.

 Files to Modify

 ┌─────────────────────────────────────────────────┬──────────────────────────────────┐
 │                      File                       │              Change              │
 ├─────────────────────────────────────────────────┼──────────────────────────────────┤
 │ backend/src/routes/sceneAssets.ts:42            │ Add .nullable() to Zod schema    │
 ├─────────────────────────────────────────────────┼──────────────────────────────────┤
 │ src/components/pipeline/AssetDrawer.tsx:131,151 │ Remove descriptionOverride: null │
 ├─────────────────────────────────────────────────┼──────────────────────────────────┤
 │ src/types/scene.ts:178                          │ Update type to string | null     │
 └─────────────────────────────────────────────────┴──────────────────────────────────┘

 Verification

 1. Start backend dev server and frontend dev server
 2. Open a project, navigate to Stage 8 for any scene
 3. Delete an asset from the scene
 4. Re-add the same asset via "Add from project assets" — should succeed (no 400 error)
 5. Add an asset from "Global Library" — should succeed
 6. Run npm run lint from project root
 7. Run npm test from project root
 8. Run cd backend && npm test
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌