extras archetypes are not about reclassifying characters 
  the LLM found in the script — they're a user-authored creative addition to the world. The user is     
  saying "my world has this type of background figure" and providing a visual prototype that frame/video   generation can use to populate scenes with consistent-looking variants.

  Given that clarification:

  None of the three original options quite fit, but here's what I'd recommend:

  Option 3 (User decides) is the closest, but reframed — it's not "reclassify an existing character as  
  an extra." It's "add a new extra archetype entry" — a dedicated action in Stage 5 (and optionally     
  Stage 8 at the scene level) where the user creates an archetype from scratch:

  - They name it ("Zorblaxian Alien", "Medieval Peasant")
  - They write a description of the archetype's visual traits
  - They optionally generate or upload a reference image
  - That archetype then becomes available as scene-level context for frame/video generation

  Why this makes sense:

  - Stage 4 and Stage 5 extraction are irrelevant here. These archetypes don't come from the script —   
  they come from the user's creative vision. The extraction pipeline (aggregateSceneDependencies)       
  wouldn't find "Zorblaxian Alien" in the dialogue because it was never mentioned by name. It's
  world-building, not text analysis.
  - Stage 5 is the right home for creation. Stage 5 is where you define the visual identity of the      
  project. Main characters, locations, props — and now, the types of background figures that populate   
  your world. It fits naturally alongside the existing asset grid as a fourth group.
  - Stage 8 is the right home for assignment. When the user is doing scene-level asset work in Stage 8, 
  they should be able to say "this scene takes place on the alien planet, so include the Zorblaxian     
  Alien archetype in the background." That's scene-level dependency, not global creation.
  - The "spawn variants" concept is the key differentiator. A regular character asset says "this is     
  exactly what Alice looks like — always." An extra archetype says "this is the template — generate     
  background figures that are recognizably of this type but with natural variation." That distinction is   what makes it a genuinely different asset type, not just a low-priority character.

  For the image generation question (Q2): Given this understanding, I'd still say optional but valuable.   The reference image is the whole point — it's the prototype that frame generation uses to spawn      
  variants. But the user should be able to create a text-only archetype and add the image later, rather 
  than being blocked on it for Stage 5 completion. Some users might not even assign extras to scenes    
  until Stage 8.

  So in summary: this is a user-created asset type with its own "Add Extra Archetype" button in Stage 5,   not a classification of extracted characters.