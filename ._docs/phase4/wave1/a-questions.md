 ☐ Resize mode  ☐ Header …  ☐ DB chan…  ☐ Scene c…  ✔ Submit  →  

For 4B.1 (Script Hub Overflow): The left sidebar is currently fixed at `w-80` (320px). The ticket says 'horizontally extendable'. Do  
you want a draggable resize handle (like VS Code's sidebar) or a   
simpler approach like a toggle between 2-3 preset widths 
(compact/normal/wide)?

❯ 1. Draggable resize
     A drag handle on the sidebar edge that allows free-form       
     resizing (like VS Code). More complex but more flexible.      
  2. Preset width toggle
     A toggle button that switches between compact (icons only),   
     normal (current), and expanded views. Simpler and more        
     consistent.
  3. Just fix overflow
     Keep current width but add proper text truncation and
     scrolling. The sidebar is fine at 320px, just fix the overflow      issues.
  4. Type something.

For 4B.2 (Scene Header Formatting): The slug format is like        
`ext-construction-site-day-1`. Should the parser handle this purely on the frontend (a utility function that parses the slug string), 
or should the backend return the formatted header alongside the raw slug?

❯ 1. Frontend utility (Recommended)
     Create a `formatSceneHeader(slug)` utility function on the    
     frontend. No backend changes needed. Slug
     'ext-construction-site-day-1' → '01 Exterior Construction Site      - Day'. Simpler and no API changes.
  2. Backend provides both
     Backend parses and returns a 'formattedHeader' field alongside      slug. More work but ensures consistency if header parsing    
     logic gets complex.
  3. Type something.

For 4B.3 (Scene Deferral): The task says deferred scenes should be 
'skipped in batch operations (e.g., batch render)'. Looking at the 
code, `checkoutService.getBatchRenderStatus()` fetches statuses per project. Should deferred scenes also be excluded from the scene   
count shown in Script Hub (e.g., '15 scenes' → '13 scenes (2       
deferred)'), or just visually greyed out in the list while keeping 
the total count?

❯ 1. Show as separate count
     Display '13 scenes • 2 deferred • 0 complete'. Makes deferral 
     status clearly visible in the hub summary.
  2. Keep total, grey out
     Still show '15 scenes • 0 complete' but deferred scenes are   
     visually greyed out. Simpler, deferral is just a visual state.  3. Type something.
\

 Great, now I have a solid picture of the current code. Let me walk through each question one   by one.

  ---
  Question 1: Script Hub Sidebar Resize Mode (4B.1)

  What's being asked: The sidebar holding scene cards is hardcoded at 320px (w-80). Scene     
  names overflow. The ticket says "horizontally extendable" — but how literally should you    
  take that? The three options range from most complex (draggable resize) to simplest (just   
  fix the overflow).

  My recommendation: Option 3 — Just fix overflow.

  Here's my reasoning:

  - The root problem described in the ticket is that "scene cards overrun out of the container   box" and "headers are too long." That's an overflow/truncation bug, not a layout feature   
  request.
  - The ticket itself says "dynamic text truncation based on width" and "scrollable tab       
  container" — both of which are overflow fixes, not resize features.
  - A draggable resize handle (Option 1) is a significant UX feature with edge cases (min/max 
  widths, persistence, responsive breakpoints, content reflow). It's engineering effort that  
  doesn't solve the actual pain point.
  - Preset width toggle (Option 2) is middle ground but still adds UI complexity — another    
  button for users to discover and understand.
  - Option 3 directly addresses the ticket: add proper truncate behavior with the progressive 
  shortening the ticket describes (ext-launchpad-day-6 → ext-launchpad.. → ext-lau..), and    
  make the tab container scrollable. The sidebar at 320px is fine — the content just needs to 
  respect that boundary.

  If you later find that 320px truly isn't enough, you can always add a resize feature in a   
  future wave. But fix the actual bug first.

  ---
  Question 2: Scene Header Formatting — Frontend vs Backend (4B.2)

  What's being asked: Scene slugs look like ext-construction-site-day-1. To display them      
  nicely as 01 Exterior Construction Site - Day, should that parsing happen in a frontend     
  utility function or should the backend return a pre-formatted string?

  My recommendation: Option 1 — Frontend utility.

  Reasoning:

  - The slug format is simple and deterministic: {INT/EXT}-{location-words}-{time}-{number}. A   regex or split-based parser handles this trivially.
  - This is purely a display concern — how the data looks to the user. The backend shouldn't  
  care about presentation. The raw slug is the canonical identifier and should stay that way  
  in the DB and API.
  - No API changes means zero risk to other consumers of the scene data, no migration, no     
  backend deployment needed.
  - You'll want this utility reusable across Stages 6-12 anyway (the task says "verify in 7,  
  8, 9, 10, 12"). A shared frontend utility like formatSceneHeader(slug: string) in a utils   
  file is the cleanest approach — every stage component can import it.
  - If the parsing logic ever needs to get "complex," you can always move it backend later.   
  But for this pattern, it won't.

  ---
  Question 3: Deferred Scene Count Display (4B.3)

  What's being asked: When scenes are deferred, how should the Script Hub summary reflect     
  that? Currently it shows 15 scenes • 0 complete. Should deferred scenes get their own count,   or just stay in the total and be visually greyed out?

  My recommendation: Option 1 — Show as separate count (e.g., 13 scenes • 2 deferred • 0      
  complete).

  Reasoning:

  - Deferred scenes are functionally excluded from batch operations (render, etc.). If the    
  summary still says "15 scenes" but only 13 will actually render, that's a mismatch between  
  what the user sees and what the system does. That breeds confusion ("why did it only render 
  13?").
  - Showing 13 scenes • 2 deferred makes the deferral state explicit at a glance without the  
  user having to scroll through the sidebar looking for greyed-out cards. This is especially  
  important if you have 20+ scenes — you don't want to hunt for which ones are deferred.      
  - It sets the right mental model: "13 scenes are active in my project, 2 are on hold." The  
  user always knows the true scope of their production.
  - The implementation is trivial — it's one extra .filter() on the scenes array you already  
  have, and a small string interpolation change. Almost no added complexity.

  ---
  Summary of Recommendations

  Question: 4B.1 Resize mode
  Recommendation: Just fix overflow (Option 3)
  Why: Solves the actual bug. Resize is over-engineering for this ticket.
  ────────────────────────────────────────
  Question: 4B.2 Header parsing
  Recommendation: Frontend utility (Option 1)
  Why: Display-only concern. Simple, no API changes, reusable across stages.
  ────────────────────────────────────────
  Question: 4B.3 Scene count
  Recommendation: Show separate count (Option 1)
  Why: Matches system behavior (deferred = excluded from batch ops). Prevents user confusion. 

  All three recommendations lean toward the simplest approach that correctly solves the stated   problem — no over-engineering, minimal risk, and each one can be extended later if needed. 
  *FOLLOWED ADVICE*