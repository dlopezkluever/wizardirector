User answered Claude's questions:
  ⎿  · For 3C.1 (Transparent Background Auto-Injection), the prompt injection is straightforward — we append 'isolated on 
     transparent/white background' to the prompt for characters, props, and extra_archetypes. But the task also mentions a 
     post-processing background removal safety net (Rembg or specialized API). Do you want us to implement the 
     post-processing/background removal step in this ticket, or should we focus only on the prompt injection approach for now       
     and defer post-processing to a future iteration? → Prompt injection + placeholder
     · For 3C.2 (Multi-Angle Asset Generation), the task mentions generating front, side, and 3/4 views for characters. Should      
     this apply to ALL asset types that get background injection (characters, props, extra_archetypes), or only characters?
     Also, should the multi-angle generation be automatic (always generates all angles on asset creation) or on-demand (user        
     can request specific angles)? → Characters only, on-demand
     · The task says 3C.2 depends on 3B.10 (camera angle metadata). Currently, the camera field in shots is a free-text string      
     like 'MS - Eye Level - Static'. For multi-angle generation, we need to map shot camera angles to asset angle variants
     (e.g., a low-angle shot should use a low-angle character view). Is 3B.10 already done, or should we treat camera metadata      
     as-is (free-text) and build the angle-to-shot matching using text parsing? Or should we skip the angle-to-shot matching        
     entirely for now? → 3B.10 is done, use it
     · For storing multi-angle variants, should we create a new database table (e.g., asset_angle_variants) linked to
     project_assets, or extend the existing generation_attempts tables with an 'angle' field? The generation_attempts tables        
     already have carousel/selection logic, so extending them could reuse existing UI patterns. → New table (Recommended)

#### *More details:*

 Question 1: 3C.1 — Prompt Injection vs Post-Processing

  What this question is really about: The task spec lists two distinct techniques for getting clean backgrounds: (A) telling the AI   model "put this on a white/transparent background" in the prompt, and (B) running a background-removal algorithm on the output  
  image as a safety net. The question is about scope — how much to bite off in this ticket.

  My recommendation: Option 3 — Prompt injection + placeholder

  Here's why:

  - Prompt injection is the high-leverage move. Your image provider (NanoBanana / Gemini 2.5 Flash Image) is a modern model that   
  generally respects prompt instructions well. For the majority of character/prop generations, appending "isolated on a clean white   background, no environment" to the prompt will produce usable results. This is where 80% of the value is.
  - Post-processing is a different beast entirely. Rembg is a Python library — your backend is Node/Express. You'd either need to  
  shell out to a Python subprocess, spin up a separate microservice, or use an external API (like remove.bg). Each of these adds   
  operational complexity, latency (~1-3s per image), potential cost (API calls), and a new failure mode in your async job pipeline.   That's a lot of infrastructure work for a "safety net."
  - You don't know if you need it yet. The task itself says "A/B test prompt engineering vs post-processing." You can't A/B test if   you ship both simultaneously. Ship prompt injection first, see how the results look across character/prop/extra_archetype       
  generations, and then decide if post-processing is worth the investment.
  - The placeholder approach keeps the door open. Adding a clearly-marked hook point (e.g., a postProcessImage() function that     
  currently just returns the image unchanged, or a config flag like ENABLE_BG_REMOVAL=false) means when you do want to wire up     
  Rembg or an API, you know exactly where it plugs in. Zero wasted work, zero premature complexity.

  ---
  Question 2: 3C.2 — Multi-Angle Scope & Trigger

  What this question is really about: Two sub-decisions here. First, which asset types benefit from having multiple angle views    
  (front, side, 3/4)? Second, should the system auto-generate all angles every time, or let the user request them?

  My recommendation: Option 1 — Characters only, on-demand

  Here's why:

  - Characters are the only type where angles matter meaningfully. A prop (sword, book, lamp) typically has one canonical view. A  
  location is a wide environment shot — "side view of a forest" doesn't make sense the way "side view of a warrior" does. Extra    
  archetypes are generic crowd types ("medieval peasants") — they're lower-fidelity by design and generating 3 angles for them is  
  overkill.
  - On-demand is the right cost model. Each image generation costs credits via NanoBanana. If you automatically generate 3 angles  
  for every character, you 3x the cost of character creation in Stage 5. Many projects may never need side or 3/4 views — maybe the   film is all frontal shots. Let users generate additional angles when their shot list actually calls for it.
  - On-demand is simpler to build. You add a "Generate angle view" button to the character asset card, the user picks the angle    
  (front/side/3-4/back), and it fires off a generation job. The automatic approach requires hooking into every character creation  
  flow, running 3 parallel jobs, handling partial failures (front succeeded but side failed), etc.
  - You can always expand later. If users love multi-angle characters and start requesting it for extras too, adding
  extra_archetype support is trivial — the mechanism is the same, you just allow the button on more asset types.

  ---
  Question 3: 3B.10 Dependency (Camera Angle Metadata)

  What this question is really about: 3C.2's killer feature is "pass the relevant angle to frame generation based on shot camera   
  direction." For that to work, the system needs to know what angle a shot is filmed from. Currently, camera is a free-text string 
  like "MS - Eye Level - Static". The question is whether to parse that string, rely on structured metadata from 3B.10, or skip the   matching entirely.

  My recommendation: Option 3 — Skip angle-to-shot matching for now

  Here's why:

  - This is the riskiest part of the feature and the least essential. The core value of 3C.2 is "I can see my character from       
  multiple angles." The angle-to-shot auto-matching is a convenience optimization. Users can manually choose which angle reference 
  to send to frame generation. Auto-matching is nice-to-have, not must-have.
  - Parsing free-text camera strings is fragile. Users can type anything: "Close-up, slightly above", "POV shot", "Dolly tracking  
  behind character." Building a reliable parser that maps these to front/side/3-4 is an NLP problem unto itself, and it would break   every time someone uses an unexpected format. You'd spend more time debugging the parser than building the actual feature.      
  - 3B.10 exists for a reason. If the roadmap already has a ticket for structuring camera metadata, that's the right foundation to
  build on. Doing a hacky free-text parse now means you'd rip it out and redo it when 3B.10 lands. That's wasted work twice.       
  - The practical workflow works fine without auto-matching. User generates front + side views of a character. In Stage 10 frame   
  generation, the system already passes the master/scene asset image as reference. If the user wants the side view used for a      
  particular shot, they can select it. When 3B.10 lands later, you can add the auto-matching as a clean enhancement.

  ---
  Question 4: Storage Schema for Angle Variants

  What this question is really about: Where do the multi-angle images live in the database? Either a dedicated new table, or       
  shoehorned into the existing project_asset_generation_attempts / scene_asset_generation_attempts tables.

  My recommendation: Option 1 — New table

  Here's why:

  - Angles and attempts are fundamentally different concepts. A "generation attempt" is one of N alternative images for the same   
  view — the user picks the best one. An "angle variant" is a different view of the same asset — they coexist, not compete. Mixing 
  these in one table creates semantic confusion: is this row attempt #3 of the front view, or is it the side view? You'd need a    
  compound key (asset_id + angle_type + attempt_number) and the carousel UI logic gets significantly more complex.
  - Your existing carousel has an 8-attempt cap and a single is_selected constraint. If you add angle variants into the same table,   you'd need to change the cap to "8 per angle per asset" and the unique constraint to "one selected per angle per asset." Every  
  query that touches generation_attempts would need a WHERE angle_type = ? filter. Every existing function in
  ProjectAssetAttemptsService and SceneAssetAttemptsService would need modification. That's a lot of regression risk for a table   
  that already works well.
  - A dedicated table is clean and self-documenting. Something like:

  asset_angle_variants
  ├── id (UUID)
  ├── project_asset_id (FK → project_assets)
  ├── angle_type ('front' | 'side' | 'three_quarter' | 'back')
  ├── image_url (TEXT)
  ├── storage_path (TEXT)
  ├── generation_job_id (FK → image_generation_jobs)
  ├── created_at, updated_at

  - Each angle gets one row. If you want multiple attempts per angle later, you can add an attempts sub-table or just allow        
  multiple rows per (asset_id, angle_type) with an is_selected flag — but that's a future concern.
  - The UI for angles is different from the carousel UI anyway. The carousel is "swipe through alternatives, pick one." The angle  
  viewer is more like a "reference sheet" — show all angles side by side. You'd be building new UI components regardless, so       
  reusing the carousel data model doesn't save you as much as it seems.

  ---
  Summary of Recommendations
  ┌────────────────────────┬──────────────────────────────┬───────────────────────────────────────────────────────────────────────┐  │        Question        │        Recommendation        │                              Key Reason                               │  ├────────────────────────┼──────────────────────────────┼───────────────────────────────────────────────────────────────────────┤  │ 3C.1 Background        │ Prompt injection +           │ Ship the high-value part first, leave a clean hook for                │  │ removal                │ placeholder                  │ post-processing                                                       │  ├────────────────────────┼──────────────────────────────┼───────────────────────────────────────────────────────────────────────┤  │ 3C.2 Scope & trigger   │ Characters only, on-demand   │ Only characters need angles; on-demand avoids 3x cost                 │  ├────────────────────────┼──────────────────────────────┼───────────────────────────────────────────────────────────────────────┤  │ 3C.2 Camera dependency │ Skip angle-to-shot matching  │ Don't build fragile free-text parsing; wait for 3B.10                 │  ├────────────────────────┼──────────────────────────────┼───────────────────────────────────────────────────────────────────────┤  │ 3C.2 Storage schema    │ New table                    │ Angles ≠ attempts; clean separation avoids regression in existing     │  │                        │                              │ carousel                                                              │  └────────────────────────┴──────────────────────────────┴───────────────────────────────────────────────────────────────────────


  _________________________________________________



  ● User answered Claude's questions:
  ⎿  · For the multi-angle views, what specific angles should we support? The task mentions 'front, side, 3/4 view'. Should we      
     use a fixed set of angle types, or allow custom angles too? → Fixed set: front, side, 3/4, back
     · Where should the multi-angle UI live? The user needs to trigger angle generation and view/manage the variants. Should        
     this be part of the existing Stage 5 asset card (e.g., a dropdown or tab within the asset card), or a separate modal/panel?    
      → Separate modal/dialog
     · For the transparent background prompt injection text, should we use 'isolated on transparent background' or 'isolated on     
     plain white background'? White backgrounds tend to produce cleaner results with current image generation models. Or should     
     we make it configurable? → Plain white background


     ● Question 5: Which Angle Types to Support

  What this question is really about: Defining the enum for angle_type in your new table. This is a product design decision        
  disguised as a technical one — it determines what reference material your users get for frame generation, and what your prompt   
  templates need to handle.

  My recommendation: Option 2 — Fixed set: front, side, 3/4, back

  Here's why:

  - Back views serve a real cinematographic purpose. Over-the-shoulder shots are one of the most common shot types in film
  (dialogue scenes, reveals, following shots). If your character has distinctive features from behind (a cape, a hairstyle, armor, 
  a backpack), the frame generator needs that reference. Without a back view, Stage 10 is guessing — and guessing means
  inconsistency, which is exactly what this whole feature exists to prevent.
  - Four views is the standard "character turnaround sheet" in production. This is borrowed directly from animation and game       
  development pipelines. Front, side, 3/4, and back is the canonical reference sheet. Your task doc even calls out the analogy:    
  "like engineering documentation views." Four views is the industry convention for that.
  - The marginal cost of a 4th angle is negligible. You're already building the UI, the table, the generation flow, and the prompt 
  templates for 3 angles. Adding a 4th is one more enum value, one more prompt template, and one more grid cell. The infrastructure   cost is essentially zero — the per-use cost is one more on-demand generation when the user clicks the button.
  - Avoid custom angles. Custom angles sound flexible but create problems: What does the user type? "Slightly above and to the     
  left"? That's back to free-text parsing. How do you display it in the UI? How does future angle-to-shot matching (when 3B.10     
  lands) map a structured camera angle to a freeform string? Custom angles also make the UI unpredictable — you can't design a     
  clean 2x2 grid if you don't know how many slots there are. If a user truly needs a very specific angle, they can upload a custom 
  image via the existing carousel mechanism.

  ---
  Question 6: Where the Multi-Angle UI Lives

  What this question is really about: Information architecture. Angle variants are a secondary concern — users deal with them after   they have a primary image they like. The UI needs to be accessible but not cluttering the main asset management flow.

  My recommendation: Option 2 — Separate modal/dialog

  Here's why:

  - Angles are a "deep dive" action, not a primary workflow. The main Stage 5 flow is: extract assets → generate/upload images →   
  pick the best one → lock. Multi-angle generation is an optional enhancement that only some users will use for some characters.   
  Putting it inline (Option 1) or as an expandable panel (Option 3) adds visual weight to every asset card, even when the user has 
  no intention of generating angles. That's clutter.
  - A modal gives you room to breathe. The angle reference sheet is inherently a 2x2 grid (front, side, 3/4, back). Each cell      
  needs: the image (or a placeholder), a "Generate" button, maybe a loading state. Plus you might want a "Generate All" button.    
  Trying to squeeze that into a tab within an asset card that already has a name, description, image carousel, type badge, and     
  action buttons is going to be cramped. A modal gives you a clean canvas.
  - It matches the existing UI pattern. Your codebase already uses dialogs/modals for focused secondary actions — the style capsule   selector, the carousel expanded view, etc. A "Manage Angles" button that opens a dedicated dialog is consistent with how users  
  already interact with the app. They won't have to learn a new interaction pattern.
  - It keeps the asset card clean. The only change to the existing asset card is adding a small button (maybe an icon button with a   tooltip "View Angles") that appears only on character assets. The card stays uncluttered for props, locations, and extras that  
  don't support angles. Compare this to Option 1 (adding a tab to every character card) or Option 3 (reserving expandable space    
  below every character card).
  - Performance consideration. If you inline angle images into every character card, you're loading potentially 4 extra images per 
  character in the Stage 5 view. For a project with 8 characters, that's 32 additional images on the page. A modal loads them only 
  when the user clicks into it.

  ---
  Question 7: Background Prompt Injection Text

  What this question is really about: What literal text to append to image generation prompts for characters, props, and
  extra_archetypes. This directly affects output quality from your NanoBanana/Gemini 2.5 Flash Image provider.

  My recommendation: Option 1 — Plain white background

  Here's why:

  - "Transparent background" is a concept that image generation models handle poorly. Image generation models output raster images 
  (PNG/JPEG). "Transparency" is an alpha channel concept — the model doesn't actually render transparency, it renders pixels. When 
  you tell Gemini "transparent background," it often interprets this as a checkered pattern (the Photoshop transparency visual), a 
  very light grey, or it just ignores it. The results are unpredictable.
  - White backgrounds are what models are trained on. Product photography, character reference sheets, stock images — the training 
  data for "isolated subject" almost always uses white backgrounds. When you say "isolated on a plain white background," you're    
  activating a very well-understood concept in the model's training distribution. The results are consistently cleaner.
  - White backgrounds are easier to remove programmatically. Remember that placeholder hook for post-processing you're adding in   
  3C.1? If you ever wire up background removal later, a solid white background is the easiest case for any removal algorithm.      
  Transparent-ish, grey-ish, or checkered backgrounds are much harder to cleanly separate. You're making the future post-processing   step easier by choosing white now.
  - Avoid configurability here. Option 3 (per-project setting) sounds user-friendly but adds complexity for questionable value. The   background color is an implementation detail of the asset pipeline, not a creative choice. Users don't care what color the      
  background is — they care that the asset is cleanly isolated for frame generation. The background gets stripped/replaced in Stage   10 anyway when the character is composited into a scene. Making it configurable invites confusion ("should I pick white or      
  black?"), adds a settings UI, and means your prompt templates need to handle multiple variants. All for something the user never 
  sees in the final output.
  - Suggested prompt text: Something like "isolated on a plain white background, centered, full body, no environment, no other     
  characters or objects" — be explicit about what you don't want, not just the background color. Models respond well to negative   
  constraints.

  ---
  Summary
  Question: Angle types
  Recommendation: Fixed: front, side, 3/4, back
  Key Reason: Matches industry-standard turnaround sheet; back view needed for OTS shots
  ────────────────────────────────────────
  Question: UI placement
  Recommendation: Separate modal/dialog
  Key Reason: Angles are a secondary action; keeps asset cards clean; gives layout room
  ────────────────────────────────────────
  Question: Background text
  Recommendation: Plain white background
  Key Reason: Models produce cleaner results; easier future removal; not a creative choice



