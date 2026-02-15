 WT-C: Stage 12 Side-by-Side View & Timeline Player

 Context

 Stage 12 (Video Generation) currently has a basic review interface — a single video player     
 that swaps src between shots, clickable segment buttons (not a real timeline), and a right     
 panel listing job costs/statuses. The goal is to overhaul this into a professional NLE-style   
 review interface with seamless playback, a draggable virtual timeline, and a merged shot list  
 panel.

 Key constraint: ContentAccessCarousel.tsx must NOT be modified — it stays as-is, full-width    
 collapsible above the main layout.

 ---
 File Plan

 Following the Stage8/ subdirectory pattern already established in the codebase:

 src/components/pipeline/
   Stage12VideoGeneration.tsx         ← REWRITE as thin orchestrator (same export path)
   Stage12/
     types.ts                         ← NEW: shared interfaces for sub-components
     utils.ts                         ← NEW: helper functions (extracted + new)
     VideoPlayer.tsx                  ← NEW: dual-video pre-loading, overlays, playback
 controls
     TimelineBar.tsx                  ← NEW: virtual cross-shot timeline + draggable playhead   
     ShotListPanel.tsx                ← NEW: merged shot cards + expandable details
     IssueResolutionSection.tsx       ← NEW: issue type buttons + confirm dialog (extracted)    

 No changes to ProjectView.tsx — same import path and export name.

 ---
 Layout

 ┌────────────────────────────────────────────────────────────────┐
 │ LockedStageHeader (conditional)                                │
 ├────────────────────────────────────────────────────────────────┤
 │ ContentAccessCarousel (collapsible, full-width, UNCHANGED)     │
 ├────────────────────────────────────────────────────────────────┤
 │ Header: "Video Generation" + progress bar + ETA               │
 ├─────────────────────────────────────┬──────────────────────────┤
 │                                     │ Shot Review (w-80)       │
 │  Video Player (flex-1)              │  ┌────────────────────┐  │
 │  ┌───────────────────────────────┐  │  │ Shot 1 [thumb] 8s  │  │
 │  │                               │  │  │ ✓ completed        │  │
 │  │   <video> (aspect-video)      │  │  ├────────────────────┤  │
 │  │   + overlays (shot label,     │  │  │ Shot 2 [thumb] 6s  │◄─active
 │  │     play button, error, etc.) │  │  │ ▶ playing           │  │
 │  │                               │  │  ├────────────────────┤  │
 │  └───────────────────────────────┘  │  │ Shot 3 [thumb] 8s  │  │
 │                                     │  │ ⟳ generating        │  │
 │  ┌───────────────────────────────┐  │  └────────────────────┘  │
 │  │ ◄◄  ▶ Play Scene  ►►  🔊  ⛶ │  │                          │
 │  └───────────────────────────────┘  │  Issue Resolution        │
 │                                     │  (only when all complete)│
 │  ┌───────────────────────────────┐  │  ┌────────────────────┐  │
 │  │ [1|  2  | 3 |  4  ]  ▼◄plhd │  │  │ Visual Continuity  │  │
 │  │  timeline segments + playhead │  │  │ Timing Issue       │  │
 │  └───────────────────────────────┘  │  │ Dialogue/Audio     │  │
 │                                     │  │ Narrative Structure │  │
 │                                     │  └────────────────────┘  │
 │                                     │                          │
 │                                     │ [  Complete Scene  ]     │
 ├─────────────────────────────────────┴──────────────────────────┤
 │ Footer: Back to Confirmation (hidden when locked)              │
 └────────────────────────────────────────────────────────────────┘

 ---
 Implementation Steps (in order)

 Step 1: Stage12/types.ts

 Shared TypeScript interfaces consumed by all sub-components.

 - ShotTimelineSegment — computed per-shot metadata for the virtual timeline:
   - jobIndex, job (ref to VideoGenerationJob), startOffset / endOffset (cumulative seconds),   
 durationSeconds, widthPercent, isPlayable
 - VideoPlayerProps — jobs, currentShotIndex, isPlaying, isMuted, callbacks (onPlayPause,       
 onShotEnded, onTimeUpdate, onSeekComplete), seekTarget: { shotIndex, timeOffset } | null       
 - TimelineBarProps — segments, totalDuration, globalTimePosition, currentShotIndex, isPlaying, 
  onSeek callback
 - ShotListPanelProps — jobs, currentShotIndex, allComplete, summary,
 selection/retry/complete/issue callbacks
 - IssueResolutionSectionProps — onReturnToStage callback

 Key design: seekTarget is a "command prop" — orchestrator sets it, VideoPlayer executes the    
 seek and calls onSeekComplete(). Avoids imperative ref forwarding.

 Step 2: Stage12/utils.ts

 Extract existing helpers + add new pure functions:

 - getStatusLabel(status) — existing, moved from Stage12VideoGeneration.tsx
 - getTimelineSegmentColor(status) — existing, moved
 - computeTimelineSegments(jobs) → { segments: ShotTimelineSegment[], totalDuration: number } — 
  builds cumulative offset array
 - resolveGlobalTime(segments, globalTime) → { shotIndex, localOffset } — maps playhead
 position to shot + offset for scrubbing
 - computeETA(jobs, activeCount) → string | null — existing ETA logic as pure function

 Step 3: Stage12/IssueResolutionSection.tsx

 Direct extraction of current issue UI (lines 39-44 issueTypes array + lines 606-747 issue      
 buttons + confirm dialog). Self-contained with its own selectedIssue, issueDescription,        
 showIssueConfirm state. Uses existing Framer Motion AnimatePresence pattern for the confirm    
 modal.

 Step 4: Stage12/ShotListPanel.tsx

 Right-side panel (w-80, border-l, bg-card/30). Contains:

 - Header: "Shot Review" + completed/total count
 - ScrollArea with ShotCard list (local component inside this file):
   - Start frame thumbnail (w-12 h-8) or Video icon placeholder
   - "Shot N" label + duration + status badge (color-coded)
   - Active highlight when currentShotIndex === index
   - Click → onSelectShot(index)
   - Expandable details (chevron toggle): cost, model variant, gen time, error + retry button   
   - Default: selected card auto-expanded, others collapsed
 - IssueResolutionSection (rendered when allComplete === true)
 - Complete Scene button at bottom

 Step 5: Stage12/TimelineBar.tsx

 Virtual cross-shot timeline with draggable playhead.

 Visual structure:
 - Container: relative h-12 select-none with mouse event handlers
 - Track: flex row of colored segments (proportional widths), each with optional thumbnail bg   
 (opacity-20), shot number label, status color via getTimelineSegmentColor()
 - Playhead: absolutely positioned w-0.5 bg-primary vertical line at left:
 ${(globalTimePosition / totalDuration) * 100}%, with w-3 h-3 rounded-full bg-primary grab      
 handle at top

 Scrubbing logic (desktop-only, mouse events):
 - onMouseDown on track: compute ratio = (clientX - barLeft) / barWidth, globalTime = ratio *   
 totalDuration, call resolveGlobalTime() → onSeek(shotIndex, localOffset), set isDragging =     
 true
 - onMouseMove (while dragging): same computation per move, throttled via requestAnimationFrame 
 - onMouseUp: end drag

 Step 6: Stage12/VideoPlayer.tsx (most complex)

 Dual-video pre-loading system with overlay states.

 Pre-load architecture:
 - Two <video> elements (slot A and B), one visible (active), one hidden (preloading)
 - activeSlotRef = useRef<'A' | 'B'>('A') tracks which is active
 - When shot N plays: load shot N+1's videoUrl on the hidden slot, call .load()
 - Listen for canplaythrough on preload element to know it's ready
 - On ended event: if preload ready → swap visibility (display block/none), call .play() on new 
  active, begin preloading N+2. If not ready → show brief loading overlay until canplaythrough  
 - Skip non-playable shots (failed/rendering) during auto-advance

 Seek handling:
 - When seekTarget prop changes: if same shot → just set currentTime, if different shot → load  
 URL on active slot, listen for loadeddata, set currentTime, call onSeekComplete()

 Overlay states (inside the aspect-video container):
 - Playing: shot label overlay (top-left, "Shot 3/12")
 - Paused + completed: start frame thumbnail + large play button
 - Failed: XCircle + error message + retry button
 - Rendering: spinner + status label + start frame bg (opacity-20)
 - No selection: Video icon + "Select a job to preview"

 Playback controls bar (below video):
 - Play/Pause, SkipBack, SkipForward | Mute toggle, Fullscreen
 - All fire callbacks to orchestrator

 onTimeUpdate callback: fires on every video timeupdate event → onTimeUpdate(shotIndex,
 video.currentTime, video.duration) → orchestrator computes globalTimePosition =
 segments[shotIndex].startOffset + currentTime

 Step 7: Rewrite Stage12VideoGeneration.tsx (orchestrator)

 Gut the existing 917-line file. New version (~200-250 lines) wires everything together:        

 Data fetching (kept from current):
 - useQuery for video jobs with same polling logic
 - useMemo for jobs, summary, allComplete, allSuccessful
 - useMemo calling computeTimelineSegments(jobs) → { segments, totalDuration }

 State:
 - currentShotIndex: number
 - isPlaying: boolean
 - isMuted: boolean
 - globalTimePosition: number
 - seekTarget: { shotIndex, timeOffset } | null
 - wasAllComplete: boolean (for toast notification)

 Callbacks:
 - handleShotEnded(): find next playable shot → advance index, or pause at end
 - handleSeek(shotIndex, timeOffset): set seekTarget + update currentShotIndex
 - handleTimeUpdate(shotIndex, currentTime, duration): update globalTimePosition
 - handleSeekComplete(): clear seekTarget
 - handleSelectShot(index): set currentShotIndex, pause if needed
 - handleRetryJob(jobId): call checkoutService, refetch, toast
 - handlePlayPause/SkipBack/SkipForward/ToggleMute/Fullscreen: state toggles
 - handleComplete(): same as current

 Render: Loading/error/empty states (same as current), then the layout structure with
 ContentAccessCarousel, header, <div className="flex-1 flex overflow-hidden"> containing        
 VideoPlayer+TimelineBar (left) and ShotListPanel (right), footer.

 ---
 Edge Cases

 Scenario: All shots failed/rendering
 Behavior: Player shows current shot's status overlay. Timeline segments colored by status.     
 Play
   disabled.
 ────────────────────────────────────────
 Scenario: Gap in completed shots (1, 3 done; 2 failed)
 Behavior: Auto-advance skips shot 2, preloads shot 3. Timeline shows shot 2 as failed color.   
 ────────────────────────────────────────
 Scenario: Single shot scene
 Behavior: Full-width timeline segment. No preloading.
 ────────────────────────────────────────
 Scenario: Video load error
 Behavior: Show toast, pause playback, show error overlay.
 ────────────────────────────────────────
 Scenario: Seek to non-playable shot
 Behavior: Player shows that shot's status overlay (rendering/failed) without attempting        
   playback.
 ────────────────────────────────────────
 Scenario: Polling completes a shot during playback
 Behavior: Timeline segment updates color. No disruption to current playback.

 ---
 Reused Existing Code

 - checkoutService.ts — getVideoJobs(), retryVideoJob(), isRenderComplete(),
 isRenderSuccessful() (no changes)
 - ContentAccessCarousel.tsx — preserved as-is, no modifications
 - LockedStageHeader.tsx — reused as-is
 - UI components: Button, Badge, ScrollArea, Progress, Tooltip from src/components/ui/
 - useSceneStageLock hook from src/lib/hooks/
 - Types from src/types/scene.ts: VideoGenerationJob, VideoJobStatus, IssueType,
 VideoJobsResponse
 - Framer Motion patterns: motion.div with opacity fades, AnimatePresence for exit animations   

 ---
 Verification

 1. Lint: cd "C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\WorkTree\4WT-C" && npm run    
 lint
 2. Build: cd "C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\WorkTree\4WT-C" && npm run   
 build
 3. Import check: Verify ProjectView.tsx:17 still resolves — same export path
 @/components/pipeline/Stage12VideoGeneration
 4. Visual check: Run dev server, navigate to a project with Stage 12 video jobs, verify:       
   - Side-by-side layout renders (video left, shot list right)
   - ContentAccessCarousel appears above and collapses/expands
   - Clicking a shot in the right panel jumps the video
   - Timeline segments show proportional widths with correct status colors
   - Playhead moves during playback and tracks across shot boundaries
   - Dragging the playhead scrubs across shots
   - Auto-advance plays the next shot seamlessly (no loading flash)
   - Failed shots show error + retry in the panel
   - Issue resolution UI appears when all rendering is complete
   - Complete Scene button works