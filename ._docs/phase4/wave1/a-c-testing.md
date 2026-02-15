A: *DONE*
Manual Testing Checklist

  Prerequisites

  1. Run migration 027_add_scene_deferral.sql against your Supabase   DB
  2. Start dev server: npm run dev
  3. Open a project that has scenes extracted (Stage 6+)

  4B.2 — Formatted Headers

  - Open Script Hub (Stage 6) — scene cards should show "Exterior  
  Construction Site - Day" instead of ext-construction-site-day-1  
  - Click a scene — right panel header should also be formatted    
  - Enter a scene and navigate to Stage 8 — scene header bar should   be formatted

  4B.1 — Overflow Fix

  - Look at a scene with a long slug — it should truncate with     
  ellipsis in the sidebar card
  - Hover over the truncated text — tooltip shows the full name    
  - Scenes with multiple badges (e.g. "Review Ready" + continuity  
  warning) — badges should wrap instead of overflowing

  4B.5 — Merge Toggle

  - Enter a scene into Stage 7 (Shot List)
  - Look at the inspector toolbar — Next/Prev toggle + Merge button   should be visually grouped in a subtle bordered container,      
  followed by Split Shot, then Delete

  4B.3 — Scene Deferral

  1. Defer: Select a scene in Script Hub → click "Defer Scene" →   
  card greys out with "Deferred" badge, "Enter Scene Pipeline"     
  disables, count updates (e.g. "13 scenes · 2 deferred")
  2. Restore: Select the deferred scene → click "Restore Scene" →  
  returns to normal
  3. Last shot protection: Enter a scene with only 1 shot in Stage 
  7 → click Delete → dialog appears asking to defer instead → click   "Defer Scene" → returns to Script Hub

❯ okay in testing I see that  4B.1 — Overflow Fix, is not          
  fixed at all. Lets do this. Exterior and Interior being          
  Truncated to Ext. & Int. please. additionally, you need to       
  do a better job making sure the cards fit, they almost all       
  are still overflowing. try making the script hub section of      
  the page a bit more wider too     

C: *kinda did it lazily*:

● Manual Test Checklist

  Navigate to a project with Stage 12 video jobs in your dev server (npm run dev → 
  localhost:8080).

  Layout

  - Video player fills the left side, shot list panel (w-80) on the right
  - ContentAccessCarousel appears above, collapses/expands independently
  - Header shows progress bar + completion count + ETA (if still rendering)

  Shot List Panel

  - Cards show thumbnail, shot number, duration, status badge
  - Clicking a card selects that shot in the player
  - Chevron expands/collapses card details (cost, model, gen time)
  - Selected card auto-highlights with primary border
  - Failed shots show error + retry button

  Video Player

  - Play/Pause button works, shot label overlay appears while playing
  - Paused state shows start frame thumbnail + big play button
  - Skip forward/back buttons navigate between shots
  - Mute/fullscreen buttons work
  - Auto-advances to next completed shot when current ends (no loading flash)

  Timeline

  - Segments have proportional widths matching shot durations
  - Segments colored by status (green=complete, red=failed, amber=rendering)
  - Playhead moves during playback across shot boundaries
  - Click anywhere on timeline → jumps to that position
  - Drag playhead → scrubs smoothly across shots

  Edge Cases

  - All shots failed/rendering → player shows status overlay, play disabled
  - Issue Resolution section appears only when all jobs are complete/failed
  - "Complete Scene" button enabled only when all rendering is done
  - Back to Confirmation footer hidden when stage is locked

  Quickest smoke test

  If you only have 30 seconds: click a completed shot, hit play, watch it auto-advance to the   
  next shot, then drag the timeline playhead backward — that exercises the player, timeline, and   shot list in one flow.