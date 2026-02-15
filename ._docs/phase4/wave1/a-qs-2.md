←  ☐ Number strip  ☐ Defer t…  ☐ Toggle …  ☐ Researc…  ✔ Submit  → 

For 4B.2 (Scene Header Formatting): Looking at your screenshot, the slug `ext-construction-site-day-1` has a scene number suffix      
(`-1`). The scene number is also displayed separately (e.g., `01`). When parsing the slug for the formatted title, should I strip the 
trailing number from the slug (since scene number is shown         
separately), or keep it? Example: `01 Exterior Construction Site - 
Day` (stripped) vs `01 Exterior Construction Site Day 1` (kept)?   

❯ 1. Strip trailing number
     '01 Exterior Construction Site - Day' — the scene number      
     prefix already shows 01, so the trailing -1 in the slug is    
     redundant.
  2. Keep trailing number
     '01 Exterior Construction Site Day 1' — the trailing number   
     might not always match the scene number (e.g., same location, 
     different day).
  3. Type something.

For 4B.3 (Scene Deferral): Where should the Defer/Sideline action  
be triggered from in the Script Hub UI? Looking at the current     
layout, scenes are clickable cards in the left panel. Options for  
placement:

❯ 1. Right-click context menu
     Right-click a scene card to see 'Defer Scene' option. Clean UI      but less discoverable.
  2. Action in scene detail panel
     Add a 'Defer Scene' button in the right-side scene overview   
     panel (near the 'Enter Scene Pipeline' button). Visible when a      scene is selected.
  3. Both
     Right-click context menu on the card AND a button in the      
     detail panel. Maximum discoverability.
  4. Type something.


For 4B.5 (Merge Toggle): Looking at the current Stage 7 toolbar    
layout, the order is: Split Shot | Next/Prev toggle | Merge button 
| Delete. The ticket wants Next/Prev + Merge grouped in a box, and 
reordered to: Next/Prev | Merge | Split Shot | Delete (left to     
right). Should the grouped box have a subtle background/border to  
visually connect them, like a toolbar group?

❯ 1. Subtle bordered group (Recommended)
     Wrap Next/Prev toggle + Merge button in a container with a    
     faint border and slightly different background. Makes the     
     relationship obvious.
  2. Just reorder, no box
     Move items to the correct order but don't add a visual        
     container. Proximity alone shows the relationship.
  3. Type something.
─────────────────────

For the 'Extend Shot' research task (4B.6): This is marked as      
research only. Should I include a findings markdown file as part of this plan, or skip it entirely since it's purely research with no 
code changes?

❯ 1. Skip it for now
     Focus on the 4 implementation tasks. Research can be done     
     separately.
  2. Include research step
     Add a step to investigate Veo3/Sora extend APIs and write a   
     findings.md in the ._docs folder.
  3. Type something.

   okay next, what about these follow up questions: 'C:\Users\Daniel                           
  Lopez\Desktop\Aiuteur\wizardirector\._docs\phase4\wave1\a-qs-2.md'                          

● Read 1 file (ctrl+o to expand)

● Let me check one thing about how scene slugs are actually structured to give you a better   
  answer on the first question.

● Searched for 2 patterns (ctrl+o to expand)

● I also notice the Scene type has a header field. Let me check what that contains.

● Searched for 2 patterns (ctrl+o to expand)

● Good — so scene.header already exists and is displayed in a mono font as secondary text     
  (line 332). Now I have full context. Here are my recommendations for each follow-up
  question:

  ---
  Question 1: Strip or Keep Trailing Number in Slug (4B.2)

  What's being asked: The slug ext-construction-site-day-1 ends with -1. Since the scene      
  number is already shown as a prefix (01), is that trailing -1 redundant, or does it carry   
  separate meaning?

  My recommendation: Option 1 — Strip the trailing number.

  Here's why:

  - Looking at the Scene type, there's already a sceneNumber field that's displayed
  separately. The slug is essentially an encoded version of the screenplay scene heading      
  (INT/EXT + LOCATION + TIME OF DAY) with the scene number tacked on.
  - In traditional screenplay formatting, a scene heading looks like: 1. EXT. CONSTRUCTION    
  SITE - DAY. The number and the heading are separate things — the number is just ordering,   
  the heading describes the setting.
  - If the same location appears twice (say, you return to the construction site in scene 8), 
  the slugs would be ext-construction-site-day-1 and ext-construction-site-day-8. The trailing   number IS the scene number, just embedded in the slug. So showing 08 Exterior Construction 
  Site - Day is correct and complete — the trailing -8 is redundant with the prefix 08.       
  - Keeping the number would produce awkward results like 01 Exterior Construction Site Day 1 
  — double numbering that looks like a bug.

  One caveat worth noting: If you ever had a slug like ext-warehouse-floor-3-night-5 where    
  "floor-3" is part of the location name, your parser needs to be smart about only stripping  
  the final number after the time-of-day token, not just "the last number." But since the     
  format is structured as {EXT/INT}-{location}-{time}-{number}, parsing the time-of-day       
  keyword (day, night, dawn, dusk, etc.) as a delimiter makes this straightforward.

  ---
  Question 2: Where to Place the Defer/Sideline Action (4B.3)

  What's being asked: Where in the UI should the "Defer Scene" action live? Right-click       
  context menu on the card, a button in the detail panel on the right, or both?

  My recommendation: Option 2 — Action in the scene detail panel.

  Reasoning:

  - Right-click context menus are a discoverability problem. Most users, especially
  non-power-users, don't right-click UI elements to discover hidden actions. On touch/tablet, 
  right-click doesn't even exist in the traditional sense. Your app is a creative tool — your 
  users are filmmakers and writers, not IDE power users.
  - The detail panel (right side) already shows the scene overview when a scene is selected.  
  It has the "Enter Scene Pipeline" button. Adding a "Defer Scene" button there puts the      
  action right where the user is already looking and making decisions about a scene. It's     
  visible, obvious, and contextual.
  - It also gives you room to show a brief confirmation or explanation ("This scene will be   
  excluded from batch operations. You can restore it anytime.") without cramming it into a    
  tiny context menu.
  - You might think "both" (Option 3) is the safe play, but it's unnecessary complexity. A    
  context menu adds right-click event handling, a custom menu component, and a second code    
  path to maintain — all for an action that's perfectly served by a single button in the      
  detail panel. You can always add a context menu later if users request it.

  For the "Restore" action: When a deferred scene is selected (greyed out card), the detail   
  panel should swap "Defer Scene" for "Restore Scene." Simple toggle based on the deferred    
  state.

  ---
  Question 3: Merge Toggle Visual Grouping (4B.5)

  What's being asked: Should the Next/Prev toggle + Merge button be wrapped in a visible      
  container (border + background), or just reordered and placed next to each other?

  My recommendation: Option 1 — Subtle bordered group.

  Reasoning:

  - The entire point of this ticket is that the relationship between the Next/Prev toggle and 
  the Merge button isn't obvious. Just reordering (Option 2) relies on proximity alone, which 
  is exactly the kind of subtle spatial relationship that users miss — that's how you got the 
  ticket in the first place.
  - A faint border with a slightly different background (think: border border-border/50       
  bg-muted/30 rounded-md p-1) is a well-established UI pattern for toolbar groups. It's the   
  visual equivalent of saying "these controls belong together."
  - It's also very low effort — literally one wrapper <div> with a few Tailwind classes.      
  Minimal code, maximal clarity.
  - The reordered layout would be: [ Next | Prev  ⊕ Merge ]  Split Shot  Delete — where the   
  bracketed group is the bordered container. This makes it instantly clear that Next/Prev     
  controls what gets merged.

  ---
  Question 4: Extend Shot Research Task (4B.6)

  What's being asked: Should the research-only task (investigating Veo3/Sora extend
  capabilities) be included in this implementation plan?

  My recommendation: Option 1 — Skip it for now.

  Reasoning:

  - This work tree (WT-A) is already scoped to 4 implementation tasks. Mixing in a research   
  deliverable changes the nature of the work and muddies the definition of "done."
  - Research tasks have unpredictable scope — "investigate Veo3 extend API" could take 30     
  minutes or 3 hours depending on documentation quality and API availability.
  - The research has zero dependencies on anything in this wave. Nothing in WT-A, WT-B, or    
  WT-C depends on knowing whether Veo3 supports extend. It can be done anytime.
  - Better to ship the 4 concrete UI improvements, then do the research as its own focused    
  task where you can give it proper attention.

  ---
  Summary

  ┌────────────────┬───────────────────────┬─────────────────────────────────────────────────┐  │    Question    │    Recommendation     │                   Key Reason                    │  ├────────────────┼───────────────────────┼─────────────────────────────────────────────────┤  │ Trailing       │ Strip it (Option 1)   │ It's the scene number, which is already shown   │  │ number in slug │                       │ as a prefix. Double numbering looks like a bug. │  ├────────────────┼───────────────────────┼─────────────────────────────────────────────────┤  │ Defer action   │ Detail panel button   │ Discoverable, visible, contextual. Right-click  │  │ placement      │ (Option 2)            │ menus are hidden UX.                            │  ├────────────────┼───────────────────────┼─────────────────────────────────────────────────┤  │ Merge toggle   │ Subtle bordered group │ The whole ticket is about making the            │  │ grouping       │  (Option 1)           │ relationship obvious — proximity alone clearly  │  │                │                       │ wasn't enough.                                  │  ├────────────────┼───────────────────────┼─────────────────────────────────────────────────┤  │ Extend shot    │ Skip for now (Option  │ Zero dependencies on this wave. Ship the 4 UI   │  │ research       │ 1)                    │ tasks, do research separately.                  │  └────────────────┴───────────────────────┴─────────────────────────────────────────────────┘


User answered Claude's questions:
  ⎿  · For 4B.2 (Scene Header Formatting): Looking at your         
     screenshot, the slug `ext-construction-site-day-1` has a      
     scene number suffix (`-1`). The scene number is also 
     displayed separately (e.g., `01`). When parsing the slug      
     for the formatted title, should I strip the trailing 
     number from the slug (since scene number is shown
     separately), or keep it? Example: `01 Exterior
     Construction Site - Day` (stripped) vs `01 Exterior
     Construction Site Day 1` (kept)? → Strip trailing number      
     · For 4B.3 (Scene Deferral): Where should the
     Defer/Sideline action be triggered from in the Script Hub     
     UI? Looking at the current layout, scenes are clickable       
     cards in the left panel. Options for placement: → Action      
     in scene detail panel

     · For 4B.5 (Merge Toggle): Looking at the current Stage 7     
     toolbar layout, the order is: Split Shot | Next/Prev
     toggle | Merge button | Delete. The ticket wants Next/Prev    
      + Merge grouped in a box, and reordered to: Next/Prev |      
     Merge | Split Shot | Delete (left to right). Should the       
     grouped box have a subtle background/border to visually       
     connect them, like a toolbar group? → Subtle bordered
     group (Recommended)


     · For the 'Extend Shot' research task (4B.6): This is
     marked as research only. Should I include a findings
     markdown file as part of this plan, or skip it entirely       
     since it's purely research with no code changes? → Skip it    
      for now
