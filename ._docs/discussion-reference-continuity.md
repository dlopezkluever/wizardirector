 
❯ okay let's focus our attention on the other feature regarding continuity, the "push/ pull  reference        
  to/from __" fuctionality, aka camera angle change option : here are some thoughts to start us off:          
  'c:/Users/Daniel Lopez/Desktop/Aiuteur/wizardirector/._docs/3.3-reference-continuity.md' please analyze     
   and do the tasks assigned, and once complete with that, please output ideas for how to proceed to          
  implementing the reference continuity (camera angle change) functionality as best as possible. 

 See - discussion-referenc-continuity.md
 
  Investigation: Current Reference Continuity System

  How it works today

  The "Pull Ref" / "Push Ref" buttons store the source frame's image URL in shots.reference_image_order as a  
  type: 'continuity' JSONB entry. During frame generation, this is fetched and passed to Gemini 2.5 Flash     
  Image as an inlineData base64 image with role: 'identity'. The NanoBananaClient enhances the prompt with    
  role-aware instructions ("Maintain the characters/subjects from the reference image").

  There's also an auto-detection system in Stage 9's determineContinuityLink() that classifies transitions as 
  match, camera_change, or none based on camera field comparison. When camera_change, a dedicated
  continuity_frame_prompt is generated and the previous end frame is prepended as the primary identity        
  reference.

  The gap

  The system passes the raw image + a metadata-derived prompt to Gemini. It does not analyze what's actually  
  in the reference image. The prompt is built from shot metadata (character names, setting description,       
  camera), not from the visual details of the generated frame itself.

  ---
  Research: Can Image Generators Handle Angle Changes?

  Partially. Small changes (slight zoom/reframe) work reasonably well. Medium changes (two-shot → close-up)   
  are hit-or-miss with face drift and background hallucination. Large changes (POV shots, reverse angles) are 
  unreliable — the generator must invent too much.

  Specialized tools exist (Stable Virtual Camera, Qwen Image Edit Multi-Angle, Flux 2 Multi-Angles LoRA) but  
  none reliably handle all scenarios. The research consensus is that the "Describe-then-Generate" approach —  
  exactly what you suggested in the doc — is the most reliable for production:

  1. Use a vision model to analyze the reference frame → extract structured scene description
  2. Use that description + new camera specs as the prompt
  3. Keep the source image as a visual anchor alongside the semantic description

  ---
  Recommended Implementation: "Analyze-then-Generate"

  The key enhancement is adding a scene analysis step before generating camera-change frames:

  1. New method: analyzeReferenceFrame(imageUrl) — calls Gemini/Claude vision with the source frame, extracts 
  characters (position, expression, clothing, posture), environment (foreground/midground/background, props), 
  lighting, color palette
  2. Enhanced continuity prompt — instead of generic "preserve from reference," the prompt becomes: "The      
  blonde man in navy suit at frame-left is frowning with furrowed brows, hands on table. Maintain this exact  
  appearance. Now recompose from [new camera angle]."
  3. Dual anchoring — reference image (visual) + structured description (semantic) together

  This is the biggest improvement available with minimal code changes (~150 lines new, ~80 modified). Cost is 
  1 extra vision-model call per camera-change frame (~$0.01-0.03).

  The full plan is saved at ._docs/t-asset-system-improvements/continuity-match-RD-3-plan.md.

  Want me to proceed with implementing the scene analysis service and enhanced camera-change generation path? 

✻ Sautéed for 8m 52s

❯ Let's continue to discuss before we proceed with any implementation or planbuilding. So:                    
  Okay now, with this Analyze then Generate method, Should we have a designation where simple changes can     
   simply take the input image without the analyze, (i.e. simple zoom in, zoom out / medium shot -> Full      
  shot / Two-shot -> Close-up) but complex camera changes require the new method or the dual anchoring        
                                                                                                              
  Also, what about the other assets that are linked to the shot / frame (as set in stage 9 from the           
  defintion done in stage 8), could these be of use for ensuing the consistency of the character, or will     
   simply using the reference image be enough information (as the details of the character will be in the     
   image) for the ai to keep the characters/ location/ props consistent?                                      
                                                                                                              
  Think about the big picture here, what would assure the best user experince and the best fidelity of        
  outcomes here?                                                                                              

● Great questions. Let me think through both carefully.

  ---
  1. Simple vs. Complex Camera Changes — Should We Tier?

  My honest take: No, we should run the analysis on every camera-change frame.

  Here's why:

  - The cost is negligible. One vision-model call is ~$0.01-0.03 and takes ~2-3 seconds. Frame generation     
  itself takes 10-30+ seconds. The user won't notice the overhead.
  - "Simple" changes still benefit massively. Even a medium shot → close-up needs the analysis to know: which 
  character to zoom into, what their exact expression is, what's behind them that would now be out of frame.  
  Without the analysis, Gemini is guessing based on generic shot metadata like "Character A, office setting" —   it doesn't know Character A was mid-frown with their left hand raised.
  - Classification is unreliable. Where do you draw the line between "simple" and "complex"? A two-shot →     
  close-up sounds simple, but it requires the generator to know which character, what they look like, what's  
  in the background at that tighter crop. A "simple" zoom-out requires inventing environment that wasn't      
  visible. The tiering logic would be fragile and create inconsistent quality.
  - Consistency beats optimization. If some frames get analysis and some don't, users will notice quality     
  differences between frames. Every camera-change frame should get the same treatment.

  The one scenario where you could skip analysis: if the user has already manually written a very detailed    
  continuity_frame_prompt override. But even then, the analysis enriches it.

  ---
  2. Should We Use Shot-Linked Assets (from Stage 8/9)?

  Yes, absolutely — and this is actually a significant opportunity.

  Right now the camera-change path does this:
  Previous end frame image (identity ref) + continuity_frame_prompt → Gemini

  But the system already has rich structured data from Stages 8-9:

  - Scene assets with detailed descriptions (character appearance, clothing, props)
  - Shot-asset assignments mapping which characters/props appear in each shot
  - Character reference images from the asset system
  - Style capsule reference images

  Currently, the frame generation path already fetches shotRefImages from reference_image_order and prepends  
  the previous end frame. But the asset descriptions as text aren't being fed into the continuity prompt —    
  they're only used in the standard generateStartFramePrompt().

  Here's what I think the optimal approach is:

  The Previous End Frame Alone Is NOT Enough

  The reference image gives Gemini visual grounding — colors, composition, mood. But Gemini can't reliably    
  extract fine details from images alone:
  - It might not distinguish two similarly-dressed characters
  - It can't read subtle expressions well enough to reproduce them
  - Clothing details, accessories, scars, tattoos can be lost

  The Asset Descriptions Fill Exactly This Gap

  The asset system already contains things like:
  "Elena — mid-30s, auburn hair in a loose bun, green eyes, wearing a charcoal blazer over a cream blouse,    
  silver pendant necklace"

  This text is already generated and stored. Including it in the continuity prompt gives Gemini three
  independent sources of truth:

  1. Reference image → visual anchor (composition, lighting, colors, mood)
  2. Scene analysis → what's actually happening in this specific frame (positions, expressions, spatial       
  layout)
  3. Asset descriptions → canonical character/prop details (the "ground truth" for what characters look like) 

  The trifecta is more robust than any two alone. The analysis catches frame-specific details (expression,    
  pose), the assets catch canonical details (clothing, physical features), and the image catches everything   
  text can't describe (exact color palette, lighting quality, film aesthetic).

  What About Character Reference Images?

  The shot's reference_image_order may already include character asset images (from Stage 8 transformations). 
  These get passed as identity refs. This is good — it gives Gemini visual reference for character faces.     

  But for camera-change specifically, the previous end frame should remain the primary reference (first in the   array), with character asset images as secondary. The end frame establishes the scene moment; character    
  images just reinforce identity consistency.

  ---
  3. Big Picture — Best Fidelity + Best UX

  Here's what I think the optimal camera-change pipeline looks like:

  User triggers camera-change generation
    │
    ├─ 1. Analyze previous end frame (vision model)
    │     → Structured scene description
    │
    ├─ 2. Fetch shot's asset descriptions (already in DB)
    │     → Character details, props, environment text
    │
    ├─ 3. Build enhanced continuity prompt
    │     → Scene analysis + asset descriptions + target camera specs
    │     → "Elena (auburn hair, charcoal blazer, silver pendant) is at
    │        frame-left, frowning, leaning forward with hands on the table.
    │        Recompose this from ECU, capturing her face and upper shoulders."
    │
    ├─ 4. Assemble reference images
    │     → [Previous end frame (primary)] + [character asset images] + [style capsule refs]
    │
    └─ 5. Generate via Gemini with enhanced prompt + all references

  Why this gives the best outcomes:
  - The analysis prevents hallucination (Gemini knows exactly what's in the scene)
  - The asset descriptions prevent character drift (canonical appearance anchored)
  - The reference image prevents style drift (visual grounding)
  - Every camera-change frame gets the same treatment (consistent quality)
  - No extra user interaction needed — it all happens behind the scenes

  UX-wise, the user experience stays identical — they click "Pull Ref" or the auto-detected camera-change just   works better. The only visible difference is better output quality. No new buttons, no new modals, no new  
  decisions.

  The one UX addition worth considering: after generation, showing a small "continuity confidence" indicator  
  (or just silently logging it) based on the post-generation comparison. But that's a Phase 2 concern.        

  ---
  Does this framing make sense? If so, I can start building a concrete implementation plan. The main decisions   would be:

  1. Where to put the analysis service (I'm thinking inside promptGenerationService since it already handles  
  all LLM calls)
  2. How to pass asset descriptions into the continuity prompt (the data is already fetched in
  frameGenerationService.generateFrames(), just needs to be threaded through)
  3. Whether to cache the scene analysis on the frame record (so re-generations don't re-analyze)

















(
  The propagation only applies to link_type = 'match' (line 1112). So adding 'reference' to the frame_links   
  table is safe — reference links won't trigger propagation.

  Now I have everything I need. Let me now design the plan with a Plan agent and formulate questions.

  Actually, let me think about the key questions I want to ask before finalizing:

  1. UI Indicator Design: Should we show a badge on the target frame when a reference link exists? The match  
  flow shows badges; the ref flow currently shows nothing. I think we should add a badge, but in a different  
  color (e.g., purple/violet for ref vs blue/amber for match).

  2. Ref link tracking via frame_links: Extending the table with link_type = 'reference' is clean and reuses  
  all existing infrastructure. The migration is simple: ALTER the CHECK constraint. But I need user buy-in on 
  this approach.
  3. When does analysis happen?: I suggested at-generation-time. But should we analyze at pull-time and cache?   At-generation-time is simpler and always fresh.
  4. What about push ref?: When the user pushes a ref TO another shot, should we also track it as a
  frame_link? Yes, same as match — push creates the same link, just initiated from the other side.
  5. Breaking — I need to think through what happens when a reference link breaks.
  6. Ref link vs match link coexistence: The UNIQUE constraint on (target_frame_id, link_type) means a frame  
  can have both a match and a ref link to different targets, which makes sense since they serve different     
  purposes.

  Now I'm realizing the key distinction: match links are reactive copies where the image stays identical,     
  while reference links are non-reactive — the new image is inspired by but separate from the reference. So   
  when pulling a ref, I need to store the source frame and use it as context for generation rather than as a  
  reactive binding.

  But there's a tricky problem: if the user pulls a reference from a frame, then later regenerates that source   frame, the stored reference URL becomes stale. The target frame would use the old reference image on next  
  generation, which could be confusing since references are supposed to be non-reactive. I'm weighing whether 
  to store the frame ID instead and resolve it live at generation time, or accept that stale references are   
  fine since the user explicitly chose non-reactive behavior.

  Option 1 feels cleanest — storing frame IDs instead of URLs means references always pull the current image. 
  But that requires rethinking the whole reference_image_order system, since it currently stores URLs. I'd    
  need to create a new structure that tracks frame links with source and target IDs, then resolve the actual  
  image URL at generation time.

  This approach has real advantages: no stale URLs, consistent tracking with the match system, and clean      
  removal. The tricky part is that reference_image_order can hold multiple references at once, so I need to   
  figure out how to migrate just the continuity ref to this new frame_links system while keeping the other    
  reference types intact.

  Now I'm thinking through the UI implications—whether "Pull Ref" should immediately trigger generation like  
  "Pull Match" does, or just prepare the reference for the next generation cycle. I should also check if      
  there's already a pattern for reference link props in the FramePanel component.

  Actually, the key difference is that references require generation to take effect, unlike match which copies   immediately. So the flow would be: user clicks "Pull Ref", a badge appears to signal the reference is      
  queued, they see their current frame unchanged, then when they regenerate, the pipeline uses that reference.   This makes the intent clear without forcing an immediate regeneration.

  One more thing to consider: should I add a separate badge for references, or extend the existing match link 
  concept to handle both? I think consolidating them under a more generic continuityLink property that covers 
  both match and reference types would be cleaner.

  Defining the structure for this unified link...

  Now I'm wondering whether a frame can actually have both a match link and a reference link simultaneously   
  from different adjacent frames. The database constraint allows one of each type per target, but logically it   seems odd—a start frame either matches the previous end frame (same image), or references it for generation   guidance, not both.

  Actually, thinking through the practical side: a frame could theoretically have a match link from one       
  adjacent frame and a reference link from another, which the UI would display as multiple badges. But for the   same pair of frames, having both doesn't make sense. So when the user clicks a button to create a link, if 
  one already exists between those two frames, it should probably replace the old one rather than stack them. 

  The simpler constraint would be UNIQUE(target_frame_id) — just one link per target frame, period. That      
  enforces the "pick one or the other" semantics without needing to track link type in the uniqueness check.  

  Now I'm thinking through what to ask the user: should ref links use a different badge color like purple to  
  distinguish them from match badges, and should pulling a ref for an already-matched frame automatically     
  replace the match link? I also want to confirm the analysis approach — using Gemini vision to examine       
  reference images before generation, which costs roughly $0.01-0.03 per image.)

  After clicking 'Pull Ref', the reference is stored but the frame isn't regenerated yet (costs credits). How   
should we signal this to the user?

❯ 1. Badge + toast hint (Recommended) ✔
     Badge appears immediately. Toast says 'Reference linked — regenerate to apply the new camera angle'. User      clicks regenerate when ready.
 (BUT YOU SHOULD CONSIDER CHANGING TO THIS IF ANNOYING) 2. Badge + auto-regenerate 
     Badge appears AND the frame immediately regenerates using the reference. Fastest workflow but costs      
     credits without explicit user action.

  ☒ Link mutex  ☒ Badge scope  ☒ Post-pull UX  ☐ Regen path  ✔ Submit  →

Should the enhanced analysis pipeline (Gemini Vision analyzes the reference image before generating) also run 
when the user manually triggers 'Regenerate' on a frame that has a ref link? This means every regen of a      
ref-linked frame gets the full analysis treatment.

❯ 1. Yes, always analyze (Recommended)
     Every regeneration of a camera_change frame runs the vision analysis. Consistent quality, ~$0.01-0.03    
     extra per regen, adds ~2-3s latency.
  (BUT CONSIDER SWITCIHING IF TRULY REDUNDANT AND YOU CAN JUST ROLL WITH THIS2. Only on first generation
     Analyze once, cache the result. Subsequent regens reuse the cached analysis. Faster regens but analysis  
     could become stale if user edited the prompt.
  3. Type something.