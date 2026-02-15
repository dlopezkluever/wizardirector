  ☐ Auto-advance  ☐ Scrubbing  ☐ Side panel  ☐ Carousel spot  ✔ Submit  →

The current implementation uses a single <video> element that swaps `src` between shots. For    
truly seamless auto-advance (no loading gap), we'd need to pre-load the next video in a hidden  
element and swap visibility at the boundary. This adds complexity but delivers a much better    
experience. Should we pursue seamless playback with pre-loading, or is a small loading flash    
between shots acceptable?

❯ 1. Seamless pre-load (Recommended)
     Pre-load next video in hidden element. Swap instantly on shot end. Best UX, moderate       
     complexity.
  2. Accept brief flash
     Keep single <video> element. Small loading delay between shots. Simpler code, slightly     
     worse UX.
  3. Type something.


The current right panel shows 'Video Jobs' with cost, model variant, generation time, and retry 
buttons for failed jobs. The task spec says 'shot list with thumbnails' on the right. Should the new shot list panel replace the job-centric info entirely, merge both into one view, or offer  
tabs to switch between Shot Review and Job Details?

❯ 1. Merge into one (Recommended)
     Each shot card shows thumbnail + shot ID + duration + status badge. Expandable details for 
     cost/model/retry on click.
  2. Two tabs (Shots / Jobs)
     Shot list tab for review, separate Jobs tab for cost/status/retry details. More separation 
     but extra navigation.
  3. Replace with shot-only view
     Pure shot review panel. Drop cost/model/timing details. Cleaner but loses operational info. 
   4. Type something.

Where should the ContentAccessCarousel (Script/Rearview/Shots tabs) sit in the new side-by-side 
layout? Currently it's a full-width collapsible panel above everything. In a side-by-side       
video+shotlist layout, it could feel heavy at the top.

❯ 1. Keep above (collapsible)
     Same position as now. Full-width above the side-by-side area. Users can collapse it when   
     reviewing video.
  2. Move above video only
     Place it above just the left video panel (not full-width). Saves vertical space, keeps     
     video context close.
  3. Collapsible bottom drawer
     Move to a slide-up drawer at the bottom. Out of the way during video review, pull up when  
     needed.  4. Type something.


  Question 1: Seamless Pre-load vs. Brief Flash Between Shots

  What this question is about:

  Right now, Stage 12 has a single <video> element (line 370). When one shot finishes and the 
  next should play, the code changes the src attribute on that same element (lines 126-137).  
  The problem: changing src means the browser has to fetch and buffer the new video before it 
  can play, which creates a visible pause/flash — a moment of black or loading between shots. 

  The alternative ("seamless pre-load") would use two <video> elements. While shot 1 is       
  playing, shot 2 is silently loading in a hidden video element. When shot 1 ends, you        
  instantly swap visibility — shot 2 is already buffered and ready to play with zero delay.   

  My recommendation: Option 1 — Seamless pre-load.

  Here's why:

  - The whole point of this task is to create a professional review interface. A flash/stutter   between shots undermines that goal — it breaks immersion and makes the tool feel
  unpolished.
  - The complexity is moderate, not high. You're essentially managing two <video> elements and   toggling which one is visible. The pattern is well-established (YouTube, Netflix, and every   serious web video player does some variant of this). It's not exotic.
  - Your shots are short (4-8 seconds each from Veo3). That means transitions happen
  frequently. A flash every 4-8 seconds would be very noticeable and annoying during review.  
  - The "timeline scrubbing" feature you're building also benefits from pre-loading — if the  
  user scrubs forward, having the next video ready makes the whole experience snappier.       

  The implementation isn't scary: keep a currentVideoRef and a nextVideoRef, preload
  nextVideoRef.src when the current shot starts playing, and on onEnded swap them.

  ---
  Question 2: Shot List Panel — Merge, Tabs, or Replace?

  What this question is about:

  The current right panel shows job-level operational data: cost per job, model variant       
  (veo_3_1_fast vs standard), generation time, retry buttons for failures. The task spec wants   a shot review panel: thumbnails, shot IDs, durations, click-to-jump.

  The question is: what happens to that operational/cost info? Do you throw it away, keep it  
  in a separate tab, or try to combine both into one view?

  My recommendation: Option 1 — Merge into one panel.

  Here's why:

  - Tabs add friction. In a video review workflow, you want everything relevant visible       
  without switching contexts. A user reviewing shots will naturally want to know "did this    
  shot succeed? what model was used?" — that's not a separate concern from "which shot am I   
  looking at?"
  - The merge is natural. Each shot card shows the essential info at a glance: thumbnail +    
  shot number + duration + status badge (completed/failed/pending). Then on click/expand, it  
  reveals the operational details (cost, model variant, generation time, retry button). This  
  is a progressive disclosure pattern — simple by default, detailed on demand.
  - Replacing entirely (option 3) loses useful info. Cost tracking and retry buttons are still   needed — you can't just drop them. Users need to retry failed shots and track spending.    
  - Two tabs (option 2) would work but it's overkill for what's essentially "same data, two   
  views." The merge approach gives you both in one scroll without any tab-switching.

  Think of it like a file manager: you see file name + icon + size at a glance, and click for 
  full metadata. Same pattern here.

  ---
  Question 3: Where to Put the ContentAccessCarousel

  What this question is about:

  The ContentAccessCarousel (built in a previous task) is a multi-tab panel with Script       
  Excerpt, Rearview Mirror, and Shot List tabs. It gives the user reference context while     
  working. Currently it sits full-width above everything (line 319-324 in the current code).  

  The new layout is side-by-side: big video player on the left, shot list on the right. A     
  full-width collapsible panel on top of that would eat significant vertical space, which is a   problem because the video player needs to be as large as possible for a "professional      
  review experience."

  My recommendation: Option 1 — Keep above, collapsible.

  Here's why:

  - It already works and users know where it is. The ContentAccessCarousel is consistent      
  across stages — it always sits at the top. Moving it would break that mental model.
  - It's collapsible, so it doesn't cost you vertical space when you don't need it. During    
  active video review, the user collapses it. When they need to reference the script or       
  rearview context, they expand it. This is the best of both worlds.
  - Option 2 (above video only) creates an awkward asymmetric layout. The carousel would be   
  the same width as the video panel but not the shot list panel, creating visual imbalance. It   would also push the video player down while leaving the shot panel starting higher — messy.  - Option 3 (bottom drawer) fights with the timeline. The timeline player is supposed to sit 
  below the video. A bottom drawer would compete for that same bottom-of-screen real estate,  
  and opening it could obscure the timeline — exactly when you might need both.
  - The carousel is reference material, not the primary focus. Top-of-page, collapsible,      
  out-of-the-way-by-default is the right UX pattern for "stuff you occasionally glance at."   

  One small note: make sure the carousel defaults to collapsed in Stage 12 (even if it        
  defaults to expanded in other stages), since the video player is the star of the show here. 

  ---
  Summary of recommendations:

  Question: 1. Auto-advance
  Recommendation: Seamless pre-load
  Key Reason: Shots are 4-8s; flash every few seconds kills the "professional" feel
  ────────────────────────────────────────
  Question: 2. Right panel
  Recommendation: Merge into one view
  Key Reason: Progressive disclosure — thumbnail + status at glance, details on expand        
  ────────────────────────────────────────
  Question: 3. Carousel placement
  Recommendation: Keep above, collapsible
  Key Reason: Consistent position across stages; doesn't compete with timeline below

  what about this: Timeline scrubbing across multiple separate video files is complex.        
  Each shot is an independent                                                                 
  video URL. A 'virtual timeline' that maps a single playhead position to the correct         
  shot +                                                                                      
  time-within-shot requires computing cumulative durations and seeking into the right         
  video.                                                                                      
  Should we build full cross-shot scrubbing, or limit scrubbing to within the current         
  shot (with                                                                                  
  click-to-jump for other shots)?                                                             
                                                                                              
  ❯ 1. Full cross-shot scrubbing (Recommended)                                                
       Virtual timeline maps position across all shots. Drag anywhere to seek into any        
  shot. More                                                                                  
       complex but matches the spec.                                                          
    2. Per-shot scrubbing only                                                                
       Scrub within current shot. Click timeline segments or shot list to jump to other       
  shots.                                                                                      
       Simpler, still functional.                                                             
    3. Type something.                                                                        
  ─────────────────────────                                                                   

● Question 4: Full Cross-Shot Scrubbing vs. Per-Shot Only

  What this question is about:

  Your scene is made up of, say, 8 separate video files (one per shot, each 4-8 seconds).     
  There is no single combined video file. The timeline needs to pretend it's one continuous   
  video.

  Full cross-shot scrubbing means: the user sees one unified timeline (e.g., 0–48 seconds for 
  a scene). They can drag the playhead anywhere. If they drag to the 22-second mark, your code   needs to figure out "that's shot 4, 2 seconds in" — then load shot 4's video, seek to      
  currentTime = 2, and play from there.

  Per-shot scrubbing means: the timeline is segmented visually, but dragging only scrubs      
  within the currently playing shot. To get to a different shot, you click its segment or its 
  entry in the shot list. Much simpler — you just set videoRef.currentTime on the one loaded  
  video.

  My recommendation: Option 1 — Full cross-shot scrubbing.

  Here's why:

  - The math isn't actually that hard. You compute a cumulative duration array once (you're   
  already computing totalDuration on line 234 of the current code). The mapping function is   
  something like:

  globalTime → find the shot where cumulative start ≤ globalTime < cumulative end
            → localTime = globalTime - that shot's cumulative start

  - That's ~15 lines of logic. It's not "complex" — it's one utility function.
  - It pairs perfectly with Question 1's pre-load answer. Since you're already pre-loading the   next video, scrubbing forward into the next shot often means it's already buffered. And    
  scrubbing backward to the previous shot can use the same dual-element pattern (keep the     
  previous video element around briefly before discarding it).
  - It's what the spec explicitly asks for. The task says: "Drag to scrub across the full     
  scene timeline" and "Timeline shows shot boundaries with markers, scrub across the full     
  scene." Per-shot scrubbing doesn't match this spec. If you go with option 2, you'd be       
  delivering something noticeably different from what's described.
  - Per-shot scrubbing feels broken. Imagine a user dragging the playhead across what looks   
  like a unified timeline, but nothing happens when they cross a shot boundary — the playhead 
  just stops or snaps back. That's confusing. It violates the visual promise of the timeline  
  UI.

  The one caveat: When scrubbing jumps to a different shot (not the pre-loaded next one),     
  there will be a brief load time for that video. That's fine — this is expected in any       
  scrubbing interface (even YouTube buffers when you jump). You can show a lightweight spinner   or keep the last frame visible while loading. The key is that the timeline interaction     
  itself is seamless, even if the video takes a moment to buffer after a long jump.

  Implementation sketch in your head:

  1. Build a cumulativeDurations array: [0, 6, 14, 20, 28, ...] (running sum of shot
  durations)
  2. Timeline component renders segments proportionally using shotDuration / totalDuration *  
  100%
  3. On drag/click: convert pixel position → globalTime → look up shot index + local time     
  4. If new shot ≠ current shot: switch video, seek to local time
  5. If same shot: just videoRef.currentTime = localTime

  That's it. The visual part (rendering colored segments, a playhead indicator) is standard   
  CSS. The logic part is one lookup function.

   ● The current implementation uses a single <video> element that swaps `src` between shots. For 
 truly seamless auto-advance (no loading gap), we'd need to pre-load the next video in a hidden 
 element and swap visibility at the boundary. This adds complexity but delivers a much better   
 experience. Should we pursue seamless playback with pre-loading, or is a small loading flash   
 between shots acceptable?
   → Seamless pre-load (Recommended)
 ● Timeline scrubbing across multiple separate video files is complex. Each shot is an
 independent video URL. A 'virtual timeline' that maps a single playhead position to the correct  shot + time-within-shot requires computing cumulative durations and seeking into the right    
 video. Should we build full cross-shot scrubbing, or limit scrubbing to within the current shot  (with click-to-jump for other shots)?
   → Full cross-shot scrubbing (Recommended)
 ● The current right panel shows 'Video Jobs' with cost, model variant, generation time, and    
 retry buttons for failed jobs. The task spec says 'shot list with thumbnails' on the right.    
 Should the new shot list panel replace the job-centric info entirely, merge both into one view,  or offer tabs to switch between Shot Review and Job Details?
   → Merge into one (Recommended)
 ● Where should the ContentAccessCarousel (Script/Rearview/Shots tabs) sit in the new
 side-by-side layout? Currently it's a full-width collapsible panel above everything. In a      
 side-by-side video+shotlist layout, it could feel heavy at the top.
   → Keep above (collapsible)