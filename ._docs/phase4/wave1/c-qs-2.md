←  ☐ File structure  ☐ Issue UI  ☐ Responsive  ☐ Playhead style  ✔ Submit  →

The task suggests extracting sub-components like VideoPlayer.tsx, TimelineBar.tsx,
ShotListPanel.tsx. Should these go in a new `Stage12/` subdirectory alongside the other pipeline components, or stay flat in `src/components/pipeline/`?

❯ 1. Stage12/ subdirectory (Recommended)
     Create src/components/pipeline/Stage12/ with VideoPlayer.tsx, TimelineBar.tsx,
     ShotListPanel.tsx. Stage12VideoGeneration.tsx stays in pipeline/ as the entry point.       
  2. Flat in pipeline/
     All files stay in src/components/pipeline/. Prefix with Stage12 (e.g.,
     Stage12VideoPlayer.tsx). Simpler but pipeline/ gets more crowded.
  3. Type something.

The issue resolution UI (Visual Continuity, Timing, Dialogue, Narrative buttons) currently lives in the right side panel. In the new layout with a merged shot list panel, where should it go?  

❯ 1. Below shot list panel (Recommended)
     Keep it at the bottom of the right panel, below the shot list. Only visible when all       
     rendering is complete. Contextually close to the review.
  2. Bottom bar (full width)
     Move to a full-width bar below both video and shot list. More prominent, but takes vertical      space from the video.
  3. Collapsible section in side panel
     Accordion/collapsible inside the right panel. Hidden by default, expand to reveal issue    
     types. Saves space.
  4. Type something.


Should the side-by-side layout have any responsive behavior for narrower windows (e.g.,         
<1024px)? The app seems primarily desktop-targeted, but a stacked fallback could be useful.     

❯ 1. Desktop-only layout
     Fixed side-by-side layout. No responsive breakpoints. Matches the rest of the pipeline     
     which seems desktop-focused.
  2. Stack on narrow screens
     Below ~1024px, stack video above shot list vertically. Adds some complexity but improves   
     usability on smaller screens.
  3. Type something.


For the timeline playhead indicator: should it be a simple vertical line that moves across the  
timeline, or a more styled handle (like a thumb/knob) that the user can grab and drag?

❯ 1. Vertical line + grab handle (Recommended)
     Thin vertical line spanning the timeline height with a small circular/triangular grab      
     handle at top. Standard NLE/video editor pattern.
  2. Simple vertical line
     Just a colored vertical line that moves across. Click timeline to seek, no drag handle.    
     Cleaner but less discoverable for scrubbing.
  3. Type something.
───────────────────────


Question 5: File Structure — Stage12/ Subdirectory vs. Flat

  What this question is about:

  You're about to extract 3+ new components (VideoPlayer, TimelineBar, ShotListPanel) out of  
  the current monolithic Stage12VideoGeneration.tsx. The question is simply: where do those   
  files go?

  My recommendation: Option 1 — Stage12/ subdirectory.

  Here's why:

  - The pipeline/ directory is already crowded. You've got Stage1 through Stage12,
  ContentAccessCarousel, LockedStageHeader, UnlockWarningDialog, CostDisplay — that's already 
  15+ files. Dropping 3 more loose files in there makes it harder to scan.
  - These sub-components are private to Stage 12. VideoPlayer, TimelineBar, and ShotListPanel 
  are not shared across stages — they only exist to serve Stage12VideoGeneration. A
  subdirectory communicates that relationship: "these are internal parts of Stage 12, not     
  standalone pipeline components."
  - The entry point stays where it is. Stage12VideoGeneration.tsx remains in pipeline/ so your   existing imports and routing don't change at all. It just imports from
  ./Stage12/VideoPlayer etc. Zero impact on the rest of the codebase.
  - This is a common React pattern. When a component grows large enough to decompose, you     
  create a folder for it. It's exactly like how shadcn/ui organizes complex components.       
  - The "flat + prefix" approach (option 2) is ugly at scale. Stage12VideoPlayer.tsx,
  Stage12TimelineBar.tsx, Stage12ShotListPanel.tsx — those names are long and repetitive.     
  Inside a Stage12/ folder, they're just VideoPlayer.tsx, TimelineBar.tsx — clean and obvious.
  ---
  Question 6: Where to Put the Issue Resolution UI

  What this question is about:

  The four issue-routing buttons (Visual Continuity → Stage 8, Timing → Stage 7, Dialogue →   
  Stage 9, Narrative → Stage 7) currently live in the right panel. In the new layout, the     
  right panel is becoming the shot list. So where do these buttons go?

  My recommendation: Option 1 — Below the shot list panel.

  Here's why:

  - Workflow order matches spatial order. The user's flow is: watch video → review shots in   
  the list → identify a problem → file an issue. Placing the issue buttons at the bottom of   
  the right panel follows that top-to-bottom reading flow naturally.
  - It's contextual. The user is looking at the shot list, spots a problem, and the action    
  buttons are right there below what they're reviewing. No need to look elsewhere.
  - It only matters when rendering is complete. These buttons are irrelevant during rendering 
  — you'd only show them once all jobs are done. So they appear at the bottom of the panel at 
  exactly the time the user needs them, and they're invisible (or disabled) before that. This 
  means they don't eat space during the rendering phase.
  - Option 2 (full-width bottom bar) steals vertical space from the video and timeline. The   
  video player and timeline are the stars of this view. A permanent bottom bar compresses     
  them. Not worth it for 4 buttons that are only relevant at the end of the workflow.
  - Option 3 (collapsible accordion) adds a click to access. The user would need to know to   
  expand a hidden section to find issue routing. That's a discoverability problem — new users 
  won't know it's there. Since the buttons are small and only show post-render, there's no    
  real space savings from hiding them.

  ---
  Question 7: Responsive Behavior

  What this question is about:

  Should the side-by-side layout (video left, shot list right) stack vertically on narrow     
  screens, or just stay fixed?

  My recommendation: Option 1 — Desktop-only layout.

  Here's why:

  - This is a professional video review tool. Nobody is reviewing AI-generated film footage on   a phone or even a small tablet. The entire Aiuteur pipeline is a desktop-first creative    
  workflow. Your other 11 stages don't have responsive breakpoints for narrow screens — adding   one here would be inconsistent.
  - The complexity isn't worth it. Responsive layout means testing two layouts, handling the  
  timeline at a different width, repositioning the shot list, etc. That's real development and   QA time spent on a scenario that essentially never happens.
  - Side-by-side is the whole point. The task is literally called "Side-by-Side View."        
  Stacking vertically on narrow screens defeats the purpose — the user can't compare video and   shot list simultaneously.
  - If you ever need mobile/tablet support later, that's a separate task. Don't pre-engineer  
  for it now. YAGNI (You Aren't Gonna Need It).

  One minor thing you could do for free: set a min-width on the container so it doesn't break 
  at narrow widths (things don't overlap or overflow) — it just gets a horizontal scrollbar.  
  That's not "responsive design," that's just not breaking.

  ---
  Question 8: Playhead Style

  What this question is about:

  The playhead is the visual indicator showing "you are here" on the timeline. This question  
  is about how it looks and behaves.

  My recommendation: Option 1 — Vertical line + grab handle.

  Here's why:

  - This is the universal standard. Every video editor (Premiere, DaVinci Resolve, Final Cut),   every DAW (Ableton, Logic), every timeline-based tool uses a vertical line with a grabbable   handle at the top. Your users will instinctively know they can drag it. Going with option 2   (line only) would make scrubbing feel undiscoverable.
  - You already committed to full cross-shot scrubbing (Question 4). A scrubbing feature needs   an obvious affordance — something that says "grab me and drag." A bare vertical line       
  doesn't communicate that. The handle is how the user discovers that scrubbing exists.       
  - It's trivial to implement. A small triangle or circle at the top of the line, absolutely  
  positioned, with cursor: grab. Maybe 10 lines of CSS. The interaction is just the same      
  onMouseDown → onMouseMove → onMouseUp drag handler you'd write either way.
  - The triangular handle at the top is the classic NLE (Non-Linear Editor) pattern. Since    
  you're building a "professional review interface," borrowing the visual language of
  professional tools makes it feel familiar and trustworthy.

  ---
  Summary of All 8 Recommendations

  ┌─────┬───────────────┬──────────────────────┬─────────────────────────────────────────────┐  │  #  │   Question    │         Pick         │                 Key Reason                  │  ├─────┼───────────────┼──────────────────────┼─────────────────────────────────────────────┤  │ 1   │ Auto-advance  │ Seamless pre-load    │ 4-8s shots = frequent transitions           │  ├─────┼───────────────┼──────────────────────┼─────────────────────────────────────────────┤  │ 2   │ Right panel   │ Merge into one       │ Progressive disclosure, no tab-switching    │  ├─────┼───────────────┼──────────────────────┼─────────────────────────────────────────────┤  │ 3   │ Carousel      │ Keep above,          │ Consistent placement, doesn't fight         │  │     │               │ collapsible          │ timeline                                    │  ├─────┼───────────────┼──────────────────────┼─────────────────────────────────────────────┤  │ 4   │ Scrubbing     │ Full cross-shot      │ Spec requires it; math is ~15 lines         │  ├─────┼───────────────┼──────────────────────┼─────────────────────────────────────────────┤  │ 5   │ File          │ Stage12/             │ Private sub-components, keeps pipeline/     │  │     │ structure     │ subdirectory         │ clean                                       │  ├─────┼───────────────┼──────────────────────┼─────────────────────────────────────────────┤  │ 6   │ Issue UI      │ Below shot list      │ Natural workflow flow, only visible         │  │     │               │                      │ post-render                                 │  ├─────┼───────────────┼──────────────────────┼─────────────────────────────────────────────┤  │ 7   │ Responsive    │ Desktop-only         │ Nobody reviews film on mobile; stay         │  │     │               │                      │ consistent                                  │  ├─────┼───────────────┼──────────────────────┼─────────────────────────────────────────────┤  │ 8   │ Playhead      │ Line + grab handle   │ Standard NLE pattern; scrubbing needs an    │  │     │               │                      │ affordance                                  │  └─────┴───────────────┴──────────────────────┴─────────────────────────────────────────────┘
✻ Cogitated for 46s


 ● The task suggests extracting sub-components like VideoPlayer.tsx, TimelineBar.tsx,
 ShotListPanel.tsx. Should these go in a new `Stage12/` subdirectory alongside the other        
 pipeline components, or stay flat in `src/components/pipeline/`?
   → Stage12/ subdirectory (Recommended)
 ● The issue resolution UI (Visual Continuity, Timing, Dialogue, Narrative buttons) currently   
 lives in the right side panel. In the new layout with a merged shot list panel, where should it  go?
   → Below shot list panel (Recommended)
 ● Should the side-by-side layout have any responsive behavior for narrower windows (e.g.,      
 <1024px)? The app seems primarily desktop-targeted, but a stacked fallback could be useful.    
   → Desktop-only layout
 ● For the timeline playhead indicator: should it be a simple vertical line that moves across   
 the timeline, or a more styled handle (like a thumb/knob) that the user can grab and drag?     
   → Vertical line + grab handle (Recommended)