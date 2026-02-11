For 'Stage-level approval only': When the user unlocks the stage to make edits, should ALL assets become editable again, or 
should they be able to cherry-pick which assets to edit? And can they add/remove/defer assets after unlocking?

❯ 1. Full stage unlock
     Unlocking the stage makes everything editable: add, remove, defer, edit descriptions, regenerate images, etc.

  ☒ Modal UI style  ☐ Unlock behavior  ☐ Manual assets  ☐ Deferred UI  ✔ Submit  →

For the extraction modal tri-state UI: Should the columns be literal side-by-side columns (3 column layout where you        
drag/move assets between Keep/Defer/Delete), or more like radio buttons / action buttons on each asset row within the       
existing modal list?

❯ 1. Radio/toggle per row (Recommended) ✔
     Each asset row in the existing modal list gets a 3-option toggle (Keep/Defer/Delete). Default is 'Keep'. Compact, fits 
     existing modal structure
────────────────────────────────

For manually added assets (3A.3): When a user adds an asset manually, should they fill in name + type + description, or     
should there also be an option to assign it to specific scenes? (Currently extracted assets get scene numbers from the      
script scan)

❯ 3. Name + type + description + (Optionality to add scene assignements *NOT MANDATORY THO*)    Simple form: name, type (character/prop/location), description & then some component to associate the relevant scenes... BUT we also need to add  / fix the funtionality of stage 8 to be able to add assets like these if the user so wishes,  (i guess it doesn't hurt to also allow the user to be able to the scenes OPTIONALLY if they know them, not madatory tho), but when done in stage 8 of a scene, that asset should get the scene added to it's info (and if scenes were added during stage 5, then that asset should appear automatically in stage 8)

For the deferred assets section in the Stage 5 UI: You mentioned 'maybe add a little section that lists deferred assets with their scenes'. Should this be a collapsible section at the bottom of Stage 5, a sidebar panel, or a separate tab?

❯ 1. Collapsible section (Recommended)
     A collapsible 'Deferred Assets' section below the main asset grid. Shows asset name, type, scene numbers, and a  'Restore' button
      *Additionaly User Notes:* Now, Stage 5 is actually quite tedoius to use from a a UI perspective, as all the asssets are in one single giant column, where only one card fits on screen at a time. so I'm okay with the collapible sectiion as you recommend BUT, lets make the individual cards be either 2 or 3 cards per row instead of just on single giant and annoying vertical line of cards 




● Excellent. I now have a thorough understanding of all three systems. Let me ask my remaining questions before writing the 
────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
● User answered Claude's questions:
  ⎿  · The prompt format guide shows very descriptive frame prompts (600-800+ chars in examples) and lean video prompts     
     (~200-400 chars). Currently frame=800, video=600. Given the guide wants frame prompts to be 'as descriptive as         
     possible' and video prompts to be 'as lean as possible', what new limits feel right? My recommendation: Frame 
     ~1200-1500 chars, Video ~400-500 chars. → Frame 1200 / Video 500 (Recommended)

     · For Feature 4B.4 (Shot List Enhancement): the shot list is created during Stage 8 via an LLM extraction call. The    
      `action` field is currently too concise. Should we enhance the LLM extraction prompt that CREATES the shot list       
     entries (so new shot lists get richer data), or focus on enriching the data at prompt-generation time (Stage 9) by     
     pulling more context in? → Both (Recommended)
     · The `camera` field in shots is currently a free-text string (e.g., 'Medium shot, eye-level'). The prompt guide       
     distinguishes between static camera POSITION (frame prompt) vs camera MOVEMENT (video prompt). Should we parse the     
     camera field into structured sub-fields (shot_type, angle, lens, movement) for cleaner routing, or keep it as a        
     string and let the LLM prompt handle the split? → Keep as string (Recommended)

