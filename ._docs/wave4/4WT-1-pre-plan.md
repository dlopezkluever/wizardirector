  ● User answered Claude's questions:
  ⎿  · Which tabs should be available at each stage? Based on your notes: Tab 1 (Rearview) everywhere, Tab 2 (Script) stages        
     6-12, Tab 3 (Shots) stages 8-12 only (since shots are created in Stage 7). Is that right, or do you want a different
     breakdown? → Rearview 6-12, Script 6-12, Shots 8-12
     · For the script excerpt (Tab 2), should it render with full screenplay formatting (scene headings in amber, dialogue
     indented with character names, parentheticals italic) using the existing screenplay.css styles? Or plain text display? →       
     Formatted but simplified
     · For the Shot List tab (Tab 3), what info should each shot card display? The Shot type has: shotId, action, dialogue,
     setting, camera, duration, charactersForeground, charactersBackground. → Medium detail
     · For the drag-to-resize 'pulldown curtain' behavior: should the resized height persist when switching between

  
  1. Tab Scope — Which tabs are available at which stages?

  What this question is about: The Content Access Carousel has 3 tabs (Rearview, Script, Shots), and the question is whether all 3 should be visible 
  at every stage or conditionally shown based on what data actually exists.

  The options broken down:
  - Option 1 (Rearview 6-12, Script 6-12, Shots 8-12): Shows Rearview everywhere including Stage 6. But here's the thing — Stage 6 is the Script Hub 
  where you first enter a scene. For Scene 1, there IS no prior scene, so Rearview would be empty. For Scene 2+, there would be prior scene data.    
  Script is always available because scriptExcerpt comes from Stage 4. Shots only appear after Stage 7 creates them.
  - Option 2 (Rearview 7-12, Script 6-12, Shots 8-12): Delays Rearview to Stage 7+, arguing Stage 6 is the entry point and doesn't need rearview     
  context yet.
  - Option 3 (All tabs everywhere): Simple to implement but means showing empty/disabled tabs, which can be confusing.

  My recommendation: Option 1 — Rearview 6-12, Script 6-12, Shots 8-12.

  Here's why: The current RearviewMirror already handles the "no prior scene" case gracefully — it returns null if there's no data (line 28-30 of    
  RearviewMirror.tsx). So at Stage 6, Scene 1, the Rearview tab would simply be empty/hidden. But for Scene 2+ at Stage 6, the user is about to start   working on a new scene and the rearview of the previous scene's ending is actually very useful context. Removing it from Stage 6 would lose that. 

  Script from Stage 6 onward makes sense — scriptExcerpt exists from Stage 4's master script. Shots from Stage 8 onward is correct because Stage 7 is   where shots get created.

  ---
  2. Script Format — How to render the script excerpt?

  What this question is about: The scriptExcerpt field on each Scene is the raw script text from Stage 4. The question is how much effort to put into   making it look like a real screenplay.

  The options broken down:
  - Option 1 (Full screenplay format): Parse the text and apply screenplay.css classes — amber scene headings, blue character names, indented        
  dialogue, italic parentheticals. Looks authentic but requires building a parser that can identify scene headings, character names, dialogue blocks,   etc. from the raw text.
  - Option 2 (Plain text): Just dump the text in a monospace font. Fast to implement but doesn't help the user scan the script quickly.
  - Option 3 (Formatted but simplified): A middle ground — use Courier font and some basic formatting (bold headings, indented dialogue) without the 
  full ProseMirror rendering engine.

  My recommendation: Option 3 — Formatted but simplified.

  Here's why: The existing screenplay.css is designed for the ProseMirror editor (Stage 4/5), which uses data-type attributes on DOM nodes. You'd    
  need to either (a) spin up a read-only ProseMirror instance just for the excerpt, or (b) write a parser to convert raw script text into the same   
  DOM structure. Both are non-trivial and brittle.

  Option 3 gives you 80% of the readability benefit at 20% of the effort. Use Courier Prime font, make scene headings (lines that start with
  INT./EXT.) bold and amber, indent dialogue blocks. The user gets a "screenplay feel" that makes it easy to scan, without the complexity of full    
  ProseMirror parsing. You can reuse the font and color variables from screenplay.css without needing the full class structure.

  ---
  3. Shot Card Data — What info to show per shot?

  What this question is about: The Shot type (from scene.ts:16-29) has these fields: shotId, action, dialogue, setting, camera, duration,
  charactersForeground, charactersBackground, continuityFlags, beatReference. The question is how much to show in the carousel card.

  The options broken down:
  - Option 1 (Compact): Just shotId + action + camera. Very scannable but might leave the user needing to navigate elsewhere to get details.
  - Option 2 (Medium): shotId, action, dialogue snippet, camera, duration. A good balance.
  - Option 3 (Full detail): Every single field. Comprehensive but could be overwhelming in a small carousel card.

  My recommendation: Option 2 — Medium detail.

  Here's why: Remember the context — this is a reference panel, not the primary workspace. The user is working in Stage 8/9/10/etc. and glancing at  
  this to remember "what's the deal with Shot 3?" They need enough to jog their memory, not the full breakdown. Shot ID and camera angle orient them 
  ("oh right, Shot 3 is the WIDE shot"), action tells them what's happening, dialogue snippet reminds them of any lines, and duration is useful for  
  timing context.

  Setting is less critical here because it's typically the same across most shots in a scene (they're all in the same location). Characters
  foreground/background, while useful, add clutter — and the user already knows their characters by the time they're in Stage 8+.

  ---
  4. Resize State — Should the drag-resized height persist?

  What this question is about: The new "pulldown curtain" lets users drag to resize the panel height. When the user navigates to a different stage or   scene, should the panel snap back to a default height, or remember where they left it?

  The options broken down:
  - Option 1 (Persist per session): Store in React state (or a Zustand store). Survives navigation within the app but resets on page reload.
  - Option 2 (Reset on stage change): Every time you switch stages, the panel resets to default. Predictable but potentially annoying if the user    
  always wants a specific height.
  - Option 3 (Persist in localStorage): Survives page reloads. Most "remembering" but slightly more implementation.

  My recommendation: Option 1 — Persist per session.

  Here's why: This is a Goldilocks situation. Option 2 is too aggressive about resetting — if a user likes the panel at 40% of the screen, having it 
  snap back every time they switch stages is annoying. But Option 3 (localStorage) is probably overkill for a panel height preference — it adds      
  complexity and the user might want different heights in different contexts/projects.

  Option 1 (session persistence) means: "once you adjust it, it stays adjusted as you work through the pipeline, but starts fresh next time you open 
  the project." This matches how most professional tools handle panel sizes (think VS Code's panel heights — they persist during the session but     
  resetting on reload isn't a big deal). You can implement this cleanly with a single Zustand store value or even a useRef lifted to the parent.     

  If you find later that users want it to survive reloads, upgrading from Option 1 to Option 3 is trivial — just add a persist middleware to the     
  Zustand store or a useEffect that syncs to localStorage.

  ---
  Summary of my recommendations:
  ┌────────────────┬───────────────────────────────────────────────────┬──────────────────────────────────────────────────────────────────────────┐  
  │    Question    │                  Recommendation                   │                                  Reason                                  │  
  ├────────────────┼───────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────┤  
  │ Tab Scope      │ Option 1 (Rearview 6-12, Script 6-12, Shots 8-12) │ Rearview is useful at Stage 6 for Scene 2+; already handles empty state  │  
  ├────────────────┼───────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────┤  
  │ Script Format  │ Option 3 (Formatted but simplified)               │ 80/20 — Courier font + basic styling without full ProseMirror complexity │  
  ├────────────────┼───────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────┤  
  │ Shot Card Data │ Option 2 (Medium detail)                          │ Reference panel needs enough to jog memory, not overwhelm                │  
  ├────────────────┼───────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────┤  
  │ Resize State   │ Option 1 (Persist per session)                    │ Right balance; easy to upgrade to localStorage later if needed           │  
  └────────────────┴───────────────────────────────────────────────────┴──────────────────────────────────────────────────────────────────────────┘  


────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────


● User answered Claude's questions:
  ⎿  · For Stage 6 (ScriptHub) specifically - it already displays scriptExcerpt and priorSceneEndState in its detail panel.         
     Should the Content Access Carousel sit above/below the existing scene overview, or should it replace the current 
     prior-scene-end-state section in the detail panel? → Replace prior-scene section
     · The existing ContinuityHeader wrapper in Stage8VisualDefinition.tsx wraps RearviewMirror with mode logic. Should I 
     remove ContinuityHeader entirely and replace all usages with the new Content Access Carousel component directly? Or keep       
     ContinuityHeader as an adapter? → Remove ContinuityHeader (Recommended)
     · Should the old RearviewMirror.tsx file be completely replaced/transformed into the new ContentAccessCarousel, or should      
     I create a new component file and deprecate the old one? → New file, delete old
     · For the carousel tab indicators, what visual pattern do you prefer? The task mentions left/right arrows for tab
     switching. → Tab labels only


      ---
  1. Stage 6 Carousel Placement

  What this question is about: Stage 6 (ScriptHub) is unique — it has a two-panel layout (scene list on the left, scene detail on the right). The    
  detail panel already shows priorSceneEndState (lines 432-442) and openingAction (lines 368-374) inline. The question is where the new Content      
  Access Carousel fits.

  The options broken down:

  - Option 1 (Above scene overview): Place the carousel between the scene header and the scene content, same position as Stages 7/8/10 use the       
  RearviewMirror (below the header bar, above the main workspace). Stage 6's existing detail panel stays untouched.
  - Option 2 (Replace prior-scene section): Remove the priorSceneEndState block from Stage 6's detail panel since the carousel's Rearview tab now    
  provides the same info. Avoids showing the same data in two places.
  - Option 3 (Only when scene selected): Only render the carousel when a scene is expanded/selected.

  My recommendation: Option 2 — Replace the prior-scene section.

  Here's why: Looking at the Stage 6 detail panel code, the "Prior Scene End State" block (lines 432-442) shows selectedScene.priorSceneEndState —   
  which is exactly what the Rearview tab of your new carousel will display. Having both means the user sees the same information twice on the same   
  screen, which is confusing and wastes space.

  The carousel should sit at the top of the detail panel (below the scene header with the "Enter Scene Pipeline" button, above the "Opening Action"  
  card). This puts it in a consistent position with how the other stages use it (always below the header, above the main content). Then remove the   
  standalone priorSceneEndState card because the Rearview tab now covers that.

  The Script tab also replaces the need for the user to mentally reference the openingAction card — they can just flip to the Script tab and see the 
  full excerpt. But I'd keep openingAction in the detail panel because it serves a different purpose there (quick scene summary at a glance), whereas   the Script tab shows the full formatted screenplay text.

  Note on Option 3: a scene is always selected in Stage 6 (it auto-selects the first scene on load, line 86-88), so this option is effectively the   
  same as Option 1.

  ---
  2. ContinuityHeader — Remove or Keep as Adapter?

  What this question is about: ContinuityHeader in Stage8VisualDefinition.tsx (lines 99-115) is a thin wrapper that decides mode ('visual' vs 'text')   and passes props through to RearviewMirror. The question is whether to keep it as an adapter layer or remove it.

  The options broken down:

  - Option 1 (Remove ContinuityHeader): Delete the wrapper entirely. Every stage that used it now directly renders <ContentAccessCarousel> with the  
  appropriate props. Cleaner codebase, one less indirection.
  - Option 2 (Keep as adapter): Update ContinuityHeader to render the new carousel instead of the old RearviewMirror. Less file changes since        
  consuming stages don't need to be modified.

  My recommendation: Option 1 — Remove ContinuityHeader.

  Here's why: Looking at the code, ContinuityHeader does almost nothing. It's 10 lines that check if priorEndFrame exists to decide mode, then passes   props through. That logic will be absorbed into the new ContentAccessCarousel anyway (the carousel needs to know what data it has to populate its 
  Rearview tab).

  Keeping ContinuityHeader as an adapter creates an unnecessary abstraction layer. The new carousel will have a different prop interface (it needs   
  scriptExcerpt, shots, the stage number for tab visibility, etc.), so ContinuityHeader would need to be rewritten anyway — at which point it's just 
  a rename of the new component, not a useful adapter.

  Plus, it's only used in one file (Stage8VisualDefinition.tsx, appearing twice — once in each render branch at lines 845 and 902). That's only 2    
  call sites to update. The effort to replace is trivial.

  ---
  3. RearviewMirror.tsx — Transform or New File?

  What this question is about: The new ContentAccessCarousel is fundamentally different from the old RearviewMirror (multi-tab, resizable, carousel, 
  shot data). The question is whether to evolve the file in-place or create a fresh one.

  The options broken down:

  - Option 1 (Transform in-place): Rename RearviewMirror.tsx to ContentAccessCarousel.tsx and rewrite the contents. One file, clear lineage.
  - Option 2 (New file alongside): Create ContentAccessCarousel.tsx fresh, keep old file temporarily for reference.
  - Option 3 (New file, delete old): Create new, immediately delete old.

  My recommendation: Option 3 — New file, delete old.

  Here's why: The new component is a fundamentally different thing. The old RearviewMirror is ~100 lines handling a simple expand/collapse with a    
  text or image display. The new ContentAccessCarousel will be 300+ lines with an Embla carousel, tab system, shot data fetching, drag-to-resize, and   multiple content renderers. There's almost no code to carry over.

  Option 1 (transform in-place) sounds clean on paper but in practice you'd delete 90% of the file and write new code — the git diff would be        
  unreadable. The "rename" in git wouldn't be detected since the content is entirely different.

  Option 3 gives you a clean start with a descriptive filename that matches what the component actually is. And you delete the old file right away   
  because:
  - No other component should be importing RearviewMirror once the new one exists
  - Keeping dead files around "for reference" in Option 2 is what git history is for — you can always look at the deleted file's last version        

  The only reason to keep the old file would be if you were migrating incrementally (some stages using old, some using new). But since this task     
  covers all stages 6-12 at once, there's no migration period.

  ---
  4. Tab Navigation Pattern

  What this question is about: How users switch between the 3 tabs (Rearview, Script, Shots) in the carousel. This is a UX decision with real        
  usability implications.

  The options broken down:

  - Option 1 (Arrows + dots): Carousel arrows on the sides, dot indicators at the bottom. Classic carousel pattern. User discovers tabs by
  swiping/clicking arrows.
  - Option 2 (Arrows + tab labels): Both arrow navigation AND clickable named labels. Most feature-complete but potentially cluttered for just 3     
  items.
  - Option 3 (Tab labels only): Named clickable tabs at the top, no arrows. Like browser tabs. Direct access to any tab by name.
  - Option 4 (Arrows only): Minimal — just arrows, content changes speak for themselves.

  My recommendation: Option 3 — Tab labels only.

  Here's why: You only have 2-3 tabs. That's not a carousel problem — that's a tab problem. Carousels with arrows make sense when you have many items   and can't show them all at once (like an image gallery). With 3 items that each have a clear name ("Rearview", "Script", "Shots"), clickable tab  
  labels are:

  1. More discoverable — The user immediately sees all available tabs and can read their names. With arrows + dots, the user has to click through to 
  discover what's on each slide.
  2. Faster navigation — Direct click to any tab vs. having to arrow through sequentially. If you're on Rearview and want Shots, arrows require two  
  clicks; tab labels require one.
  3. Less visual clutter — No arrow buttons eating horizontal space on the sides of an already compact panel. The tab labels serve as both navigation   AND indicator of where you are (highlighted/active state).
  4. Consistent with the rest of the app — Most web apps use tabs for 2-5 items and carousels for 5+ items.

  You can still use the Embla carousel under the hood for the smooth sliding animation between tab content — just wire the tab label clicks to       
  emblaApi.scrollTo(index). You get the smooth transition UX the task doc describes without the carousel navigation pattern.

  ---
  Summary:
  ┌────────────────────┬────────────────────────────────────────┬───────────────────────────────────────────────────────────────────────┐
  │      Question      │             Recommendation             │                                Reason                                 │
  ├────────────────────┼────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────┤
  │ Stage 6 placement  │ Option 2 (Replace prior-scene section) │ Avoids duplicate info; carousel Rearview tab replaces that card       │
  ├────────────────────┼────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────┤
  │ ContinuityHeader   │ Option 1 (Remove it)                   │ Only 2 call sites, wrapper adds no value with the new interface       │
  ├────────────────────┼────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────┤
  │ RearviewMirror.tsx │ Option 3 (New file, delete old)        │ Completely different component; clean start, git has the history      │
  ├────────────────────┼────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────┤
  │ Tab indicators     │ Option 3 (Tab labels only)             │ 3 tabs = tab pattern, not carousel pattern; more discoverable, faster │
  └────────────────────┴────────────────────────────────────────┴───────────────────────────────────────────────────────────────────────┘

------------------------------------------------


User answered Claude's questions:
  ⎿  · For the collapse/expand toggle, should the entire Content Access panel have a single collapse toggle (like the current       
     RearviewMirror's eye icon button), or should each tab remember its own collapsed state independently? → Single toggle for      
     whole panel
     · What should the default expanded height of the panel be before any user resizing? The current RearviewMirror is 
     relatively compact (fits a 192x112 image). The script excerpt will need more vertical space. → ~25% viewport height
     · When the panel is in Stage 6 and there's no 'prior scene' (i.e., Scene 1), what should happen? Scene 1 has no rearview       
     data. Should the Rearview tab be hidden, or shown with an empty/placeholder state? → Hide Rearview tab
     · Any preferences on animation/transition style when switching between tabs? The task doc mentions 'slide the content like     
     a carousel'. → Horizontal slide (carousel-style)



 1. Collapse Toggle — Single vs Per-Tab

  What this question is about: The current RearviewMirror has one expand/collapse toggle (the eye icon button, lines 39-58). The question is whether 
  the new multi-tab panel should have one global toggle or let each tab remember its own collapsed state.

  The options broken down:

  - Option 1 (Single toggle): One button collapses/expands the entire panel. When collapsed, you see just the tab bar header. When expanded,
  whichever tab is active shows its content.
  - Option 2 (Per-tab collapse): Each tab independently tracks collapsed/expanded. You could have Script expanded and Rearview collapsed. Switching  
  tabs could show different expand states.

  My recommendation: Option 1 — Single toggle for the whole panel.

  Here's why: Per-tab collapse creates confusing UX. Imagine: you collapse the Rearview tab, switch to Script (which is expanded), then switch back  
  to Rearview — it's suddenly collapsed again. The user has to mentally track "which tabs did I collapse?" That's cognitive overhead for no real     
  benefit.

  The panel is a single spatial region on the screen. The user's mental model is "I want this panel open or closed," not "I want to see the script   
  but hide the rearview." If they don't want to see a tab, they just... don't switch to it.

  Per-tab collapse also complicates the drag-to-resize feature. If each tab has its own collapsed state, does each one also have its own resized     
  height? That's a lot of state management for very little gain.

  Single toggle keeps the interaction simple: click to show/hide the whole panel, drag to resize it, tabs to switch content within.

  ---
  2. Default Expanded Height

  What this question is about: Before the user drags to resize anything, how tall should the panel be? The current RearviewMirror is quite compact   
  (~140px total with padding for a 192x112 image). But the Script tab needs more space to be useful.

  The options broken down:

  - Option 1 (~200px): Compact, similar to current. Script and shots would scroll immediately.
  - Option 2 (~300px): Shows a meaningful chunk of script or 2-3 shot cards without needing to scroll.
  - Option 3 (~25% viewport height): Responsive — scales with monitor size. ~270px on 1080p, ~360px on 1440p.

  My recommendation: Option 3 — 25% viewport height.

  Here's why: A fixed pixel value doesn't account for the variety of screens your users will have. 200px on a 4K monitor is tiny and wasted
  potential; 300px on a laptop screen might feel too big and eat into the main workspace.

  25vh is the sweet spot because:

  - On a standard 1080p display: ~270px — enough to show 10-12 lines of script text (Courier at 12pt with 1.5 line-height is about 24px per line).   
  That's a useful amount of screenplay to see at a glance without dominating the screen.
  - On a 1440p display: ~360px — room for more, which makes sense because the user has more screen real estate.
  - On a smaller laptop (768p): ~192px — compact but still functional, similar to the current RearviewMirror size.

  It naturally adapts and the user can drag-resize if they want more or less. The key insight is that the panel should take a proportion of available   space, not an absolute amount, because what matters is the ratio between the reference panel and the main workspace below it.

  One implementation note: you'll want a min-height (~120px) and max-height (~60vh) to prevent the user from resizing it to something unusable or    
  from eating the entire workspace.

  ---
  3. Scene 1 — No Prior Scene Data

  What this question is about: Scene 1 has no prior scene, so the Rearview tab has nothing to show. What happens?

  The options broken down:

  - Option 1 (Hide Rearview tab): Dynamically remove the tab. Scene 1 shows only Script (and Shots at Stage 8+).
  - Option 2 (Show with placeholder): Tab exists but shows a message like "No prior scene."
  - Option 3 (Hide entire panel): Don't show the panel at all for Scene 1.

  My recommendation: Option 1 — Hide the Rearview tab.

  Here's why:

  Option 3 is too aggressive — Scene 1 still has a script excerpt and (at Stage 8+) a shot list. Those are valuable references. Hiding the entire    
  panel throws the baby out with the bath water.

  Option 2 (placeholder) wastes a tab position for zero information. The user clicks "Rearview," sees "No prior scene — this is the first scene," and   thinks "okay, that was useless." It doesn't teach them anything they don't already know (they can see it's Scene 1). It's a dead-end interaction. 

  Option 1 is the cleanest: if a tab has no data, it doesn't exist. The tab bar dynamically shows what's available. Scene 1 at Stage 7 would show    
  just the Script tab. Scene 1 at Stage 9 would show Script and Shots. Scene 3 at Stage 9 would show all three. This is exactly what we recommended  
  for the Tab Scope question earlier (conditionally showing tabs based on data availability), just extended to the per-scene level.

  This is also consistent with how the current RearviewMirror works — it returns null when there's no prior scene data (line 28-30 of the old        
  component). Same principle, applied to the tab level.

  ---
  4. Animation/Transition Style

  What this question is about: When the user switches between tabs, how should the content change visually? The task doc specifically mentions "slide   the content like a carousel."

  The options broken down:

  - Option 1 (Horizontal slide): Content slides left/right. Clicking from Rearview to Script slides left; clicking back slides right. Classic        
  carousel motion.
  - Option 2 (Fade): Content fades out, new content fades in. Smoother, more subtle.
  - Option 3 (Instant swap): No animation at all.

  My recommendation: Option 1 — Horizontal slide.

  Here's why: This is the one question where the task doc gives a clear directive. It says "slide the content like a carousel" and "accessible with  
  pressing the carousel arrow, which will slide the content like a carousel." The user who wrote the spec has a specific mental model of horizontal  
  sliding — respect that.

  From a UX perspective, the horizontal slide also communicates spatial information: the tabs are arranged left-to-right (Rearview → Script → Shots),   and the slide direction tells the user "I moved one step right to the next tab" or "I moved back." This spatial metaphor helps the user build a   
  mental map of where each tab "lives," which is especially useful when you're flipping between them frequently during production work.

  Since we recommended tab labels (not arrows) for navigation in the previous batch, the slide animation becomes the element that preserves the      
  "carousel feel" the task doc wants. The user clicks a tab label, the content smoothly slides to reveal the new tab. Best of both worlds: direct    
  access via labels + the visual delight of carousel motion.

  You already have Embla Carousel in the project (src/components/ui/carousel.tsx), and it handles horizontal sliding natively. Wire the tab clicks to   emblaApi.scrollTo(tabIndex) and Embla handles the animation. No custom animation code needed.

  ---
  Summary:
  ┌─────────────────┬──────────────────────────────┬────────────────────────────────────────────────────────────┐
  │    Question     │        Recommendation        │                           Reason                           │
  ├─────────────────┼──────────────────────────────┼────────────────────────────────────────────────────────────┤
  │ Collapse toggle │ Option 1 (Single toggle)     │ One panel = one toggle; per-tab collapse is confusing UX   │
  ├─────────────────┼──────────────────────────────┼────────────────────────────────────────────────────────────┤
  │ Default height  │ Option 3 (25vh)              │ Adapts to screen size; ~270px on 1080p is the sweet spot   │
  ├─────────────────┼──────────────────────────────┼────────────────────────────────────────────────────────────┤
  │ Scene 1 no data │ Option 1 (Hide Rearview tab) │ No data = no tab; placeholder is a dead-end interaction    │
  ├─────────────────┼──────────────────────────────┼────────────────────────────────────────────────────────────┤
  │ Animation       │ Option 1 (Horizontal slide)  │ Task doc explicitly requests it; Embla already supports it │
  └─────────────────┴──────────────────────────────┴────────────────────────────────────────────────────────────┘
For animation: 
  **SWITCH TO NO ANIMATION IF IT SUCKS**
✻ Brewed for 46s

❯ for animation what happens if clicks from the most far left (1) to the most far right (3)? 

● Good question. With a horizontal slide carousel, clicking from tab 1 (Rearview) directly to tab 3 (Shots) would cause the content to slide through 
  tab 2 (Script) in between. You'd see a brief flash of the Script tab content whizzing past as it scrolls two positions.

  Is that a problem? It depends on the speed. With Embla's default transition speed, jumping 2 tabs means the intermediate content is visible for a  
  fraction of a second — it's fast enough that it reads as motion blur rather than "I'm seeing the Script tab." Most carousel libraries handle this  
  gracefully because the animation duration is based on distance, so a 2-tab jump is slightly longer than a 1-tab jump but not twice as long.        

  That said, this is really only an issue with 3 tabs where you skip the middle. And with our recommendation of tab labels (direct click navigation),   users will jump non-adjacent tabs. With arrow-only navigation they'd always go one step at a time.

  You have a few options if it bothers you:

  1. Leave it as-is — Embla handles the multi-step slide smoothly and quickly. Most users won't notice the intermediate content. This is how every   
  carousel library works by default.
  2. Set skipSnaps: true on the Embla config — this makes the carousel skip directly to the target without snapping through intermediate slides. The 
  motion is still a horizontal slide, but it goes straight from 1 to 3.
  3. Use fade for non-adjacent, slide for adjacent — Overcomplicated and inconsistent. Not recommended.

  My recommendation: Option 1, leave it as-is. Three tabs with fast Embla transitions means the pass-through is barely perceptible. It actually      
  reinforces the spatial model ("Shots is two tabs to the right of Rearview"). If it feels janky during implementation, skipSnaps: true is a one-line   fix.

  **SWITCH TO NO ANIMATION IF IT SUCKS**