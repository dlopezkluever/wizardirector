Resume this session with:
claude --resume bac0e504-80c9-4b3f-8334-36c26c434ed5

The plan is complete and covers:

  - Component architecture — props, state, sub-components, carousel configuration
  - All 3 tabs — Rearview Mirror, Script Excerpt (simplified screenplay formatting), Shot List (vertical carousel with medium-detail   cards)
  - Collapse/expand — single toggle, Framer Motion animation
  - Drag-to-resize — pulldown curtain with min/max bounds, per-session persistence
  - Integration for all 7 stages (6-12) — with specific details on what to add/remove/modify per stage
  - Edge cases — Scene 1, missing data, image errors, resize bounds
  - Implementation order — staged rollout starting with the core component, then existing consumers, then new additions
  - Verification steps — 10-point checklist

──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── Ready to code?

 Here is Claude's plan:
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌ 4WT-1: Multi-Tab Content Access Carousel

 Context

 The existing RearviewMirror component is a simple collapsible panel showing prior-scene data (text or image). Users working in     
 Stages 6-12 constantly need to reference their script, shot list, and prior scene work but currently must navigate away. This task 
  evolves RearviewMirror into a multi-tab Content Access Carousel that provides immediate access to rearview data, script excerpts, 
  and shot lists — all from a single collapsible, resizable panel.

 Decisions Summary
 ┌─────────────────────┬───────────────────────────────────────────────────────────────────────────────────────────┐
 │      Decision       │                                          Choice                                           │
 ├─────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────┤
 │ Tab availability    │ Rearview 6-12, Script 6-12, Shots 8-12                                                    │
 ├─────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────┤
 │ Script format       │ Simplified screenplay (bold headings, indented dialogue, monospace font — no ProseMirror) │
 ├─────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────┤
 │ Shot card detail    │ Medium: shotId, action, dialogue snippet, camera, duration                                │
 ├─────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────┤
 │ Resize persistence  │ In-memory per session                                                                     │
 ├─────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────┤
 │ Stage 6 integration │ Replace priorSceneEndState section in detail panel                                        │
 ├─────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────┤
 │ ContinuityHeader    │ Remove entirely                                                                           │
 ├─────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────┤
 │ File strategy       │ New ContentAccessCarousel.tsx, delete RearviewMirror.tsx                                  │
 ├─────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────┤
 │ Tab navigation      │ Clickable tab labels (no carousel arrows for tab switching)                               │
 ├─────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────┤
 │ Collapse            │ Single toggle for whole panel                                                             │
 ├─────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────┤
 │ Default height      │ ~25% viewport height                                                                      │
 ├─────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────┤
 │ Scene 1             │ Hide Rearview tab                                                                         │
 ├─────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────┤
 │ Tab transitions     │ Horizontal slide via Embla carousel                                                       │
 └─────────────────────┴───────────────────────────────────────────────────────────────────────────────────────────┘
 ---
 Component Architecture

 Props

 interface ContentAccessCarouselProps {
   projectId: string;
   sceneId: string;
   stageNumber: number;       // 6-12, controls which tabs are available
   sceneNumber?: number;      // If not provided, derived from scenes query. Scene 1 = hide Rearview tab.
 }

 Internal State

 - isExpanded — collapse/expand toggle
 - panelHeight — drag-to-resize height, defaults to window.innerHeight * 0.25
 - isDragging — resize drag state
 - carouselApi — Embla API for programmatic tab switching
 - activeTabIndex — synced with carousel position
 - imageError — rearview image fallback

 Tab Availability Logic

 availableTabs = []
 if sceneNumber > 1 → add 'Rearview Mirror'
 always → add 'Script Excerpt'
 if stageNumber >= 8 → add 'Shot List'

 Data Fetching (React Query, internal to component)

 - Scenes: sceneService.fetchScenes(projectId) → used for Rearview (prior scene) and Script (current scene's scriptExcerpt)
 - Shots: shotService.fetchShots(projectId, sceneId) → only fetched when stageNumber >= 8

 Sub-components (all inside ContentAccessCarousel.tsx)

 1. TabBar — Clickable tab labels with active indicator. Calls carouselApi.scrollTo(index).
 2. RearviewContent — Ported from current RearviewMirror logic. Text mode (priorSceneEndState) or visual mode (endFrameThumbnail)   
 with image error fallback.
 3. ScriptExcerptContent — Parses scriptExcerpt line-by-line. Applies simplified screenplay formatting via CSS classes (scene       
 headings amber/bold/uppercase, character names blue-300/bold, dialogue indented, monospace font).
 4. ShotListContent — Vertical Embla carousel of shot cards. Up/down arrows for cycling. Each card: shotId badge, camera badge,     
 duration badge, action text, dialogue snippet.
 5. ResizeHandle — Thin draggable bar at bottom with grip visual. Mouse/touch drag events adjust panelHeight, clamped to min 100px  
 / max 50vh.

 Carousel Configuration

 - Main tabs: <Carousel orientation="horizontal" opts={{ watchDrag: false }}> — disables swipe, tab switching via labels only       
 - Shot list: <Carousel orientation="vertical"> — up/down navigation within shots tab

 Collapse/Expand

 - Single toggle button (ChevronUp/Down)
 - Framer Motion AnimatePresence for smooth height animation
 - Tab bar always visible; content area collapses

 Drag-to-Resize

 - ResizeHandle at bottom of panel, cursor-row-resize
 - onMouseDown/onTouchStart captures start position and height
 - Global mousemove/mouseup listeners during drag (cleaned up in useEffect)
 - Height clamped: min 100px, max 50vh
 - Height persists in React state (resets on page reload)

 ---
 Integration Plan (per stage)

 Stage 7 — Stage7ShotList.tsx

 - Remove RearviewMirror import and all prior-scene fetching state/effects (priorSceneData, imageError,
 fetchPriorSceneAndLockStatus effect). Keep the isSceneLocked derivation in a separate smaller effect.
 - Replace <RearviewMirror> block (~line 690) with <ContentAccessCarousel projectId={projectId} sceneId={sceneId} stageNumber={7}   
 />
 - Tabs available: Rearview + Script (no Shots since stageNumber < 8)

 Stage 8 — Stage8VisualDefinition.tsx

 - Remove RearviewMirror import
 - Remove inline ContinuityHeader component definition (lines 97-115)
 - Remove priorSceneData state and its useEffect (lines 420-449). Keep currentSceneNumber — derive from the existing scenes React   
 Query.
 - Replace both <ContinuityHeader> usages (lines ~845 and ~902) with <ContentAccessCarousel projectId={projectId} sceneId={sceneId} 
  stageNumber={8} />
 - Tabs available: Rearview + Script + Shots

 Stage 10 — Stage10FrameGeneration.tsx

 - Remove RearviewMirror import, imageError state
 - Remove prior scene fetch useEffect (lines 115-134). Keep a lightweight prior-scene lookup for the comparison feature
 (handleCompare, canCompare) — either a small separate useEffect or inline React Query.
 - Replace <RearviewMirror> (~line 367) with <ContentAccessCarousel projectId={projectId} sceneId={sceneId} stageNumber={10} />     
 - Tabs available: Rearview + Script + Shots

 Stage 9 — Stage9PromptSegmentation.tsx (new addition)

 - Import ContentAccessCarousel
 - Insert between <LockedStageHeader> and the header div (~line 338)
 - Tabs available: Rearview + Script + Shots

 Stage 11 — Stage11Confirmation.tsx (new addition)

 - Import ContentAccessCarousel
 - Insert between <LockedStageHeader> and checkout content
 - Tabs available: Rearview + Script + Shots

 Stage 12 — Stage12VideoGeneration.tsx (new addition)

 - Import ContentAccessCarousel
 - Insert between <LockedStageHeader> and header section
 - Tabs available: Rearview + Script + Shots

 Stage 6 — Stage6ScriptHub.tsx (special case)

 - Import ContentAccessCarousel
 - Replace the "Prior Scene End State" section in the detail panel (lines ~432-442) with carousel
 - Carousel sits inside ScrollArea detail panel (not at flex-col top level like other stages)
 - Pass sceneNumber={selectedScene.sceneNumber} explicitly since Stage 6 tracks selected scene
 - Tabs available: Rearview + Script (no Shots)

 ---
 Files Summary
 ┌────────┬──────────────────────────────────────────────────────┐
 │ Action │                         File                         │
 ├────────┼──────────────────────────────────────────────────────┤
 │ Create │ src/components/pipeline/ContentAccessCarousel.tsx    │
 ├────────┼──────────────────────────────────────────────────────┤
 │ Modify │ src/components/pipeline/Stage7ShotList.tsx           │
 ├────────┼──────────────────────────────────────────────────────┤
 │ Modify │ src/components/pipeline/Stage8VisualDefinition.tsx   │
 ├────────┼──────────────────────────────────────────────────────┤
 │ Modify │ src/components/pipeline/Stage10FrameGeneration.tsx   │
 ├────────┼──────────────────────────────────────────────────────┤
 │ Modify │ src/components/pipeline/Stage9PromptSegmentation.tsx │
 ├────────┼──────────────────────────────────────────────────────┤
 │ Modify │ src/components/pipeline/Stage11Confirmation.tsx      │
 ├────────┼──────────────────────────────────────────────────────┤
 │ Modify │ src/components/pipeline/Stage12VideoGeneration.tsx   │
 ├────────┼──────────────────────────────────────────────────────┤
 │ Modify │ src/components/pipeline/Stage6ScriptHub.tsx          │
 ├────────┼──────────────────────────────────────────────────────┤
 │ Delete │ src/components/pipeline/RearviewMirror.tsx           │
 └────────┴──────────────────────────────────────────────────────┘
 Reusable existing code

 - src/components/ui/carousel.tsx — Embla carousel primitives (Carousel, CarouselContent, CarouselItem, CarouselPrevious,
 CarouselNext)
 - src/components/ui/scroll-area.tsx — ScrollArea for script excerpt
 - src/lib/services/sceneService.ts — fetchScenes() for scene data
 - src/lib/services/shotService.ts — fetchShots() for shot data
 - src/styles/screenplay.css — Reference for screenplay formatting classes
 - src/components/pipeline/Stage8/GenerationAttemptCarousel.tsx — Carousel pattern reference

 ---
 Implementation Order

 1. Create ContentAccessCarousel.tsx (full component with all sub-components)
 2. Integrate Stage 7 (replace RearviewMirror, simplest existing consumer)
 3. Integrate Stage 8 (remove ContinuityHeader, replace both usages)
 4. Integrate Stage 10 (replace RearviewMirror, preserve comparison feature)
 5. Integrate Stage 9 (new addition)
 6. Integrate Stage 11 (new addition)
 7. Integrate Stage 12 (new addition)
 8. Integrate Stage 6 (special layout case)
 9. Delete RearviewMirror.tsx
 10. Run npm run lint and fix issues
 11. Run npm run build to verify

 ---
 Edge Cases
 ┌────────────────────────────────────────────────┬───────────────────────────────────────┐
 │                      Case                      │               Handling                │
 ├────────────────────────────────────────────────┼───────────────────────────────────────┤
 │ Scene 1 (no prior scene)                       │ Rearview tab hidden from tab list     │
 ├────────────────────────────────────────────────┼───────────────────────────────────────┤
 │ Missing endFrameThumbnail                      │ Rearview falls back to text mode      │
 ├────────────────────────────────────────────────┼───────────────────────────────────────┤
 │ Image load error                               │ onError switches to text mode         │
 ├────────────────────────────────────────────────┼───────────────────────────────────────┤
 │ Empty scriptExcerpt                            │ "No script excerpt available" message │
 ├────────────────────────────────────────────────┼───────────────────────────────────────┤
 │ No shots yet (stage 8+ but stage 7 incomplete) │ "No shots extracted yet" message      │
 ├────────────────────────────────────────────────┼───────────────────────────────────────┤
 │ All tabs hidden                                │ Component returns null (defensive)    │
 ├────────────────────────────────────────────────┼───────────────────────────────────────┤
 │ Resize out of bounds                           │ Clamped to min 100px / max 50vh       │
 └────────────────────────────────────────────────┴───────────────────────────────────────┘
 ---
 Verification

 1. Tab visibility per stage: Verify correct tabs at each stage (6-12)
 2. Scene 1 edge case: Navigate to Scene 1, confirm Rearview tab absent
 3. Collapse/expand: Toggle works with smooth animation, height preserved
 4. Drag resize: Drag handle resizes panel, respects min/max, persists across tab switches
 5. Rearview tab: Prior scene text/image displays correctly, image error fallback works
 6. Script tab: Screenplay formatting renders (headings amber, dialogue indented, monospace)
 7. Shot list tab: Cards show medium detail, vertical carousel cycles with up/down
 8. Stage 10 comparison: Frame comparison feature still works after refactor
 9. Lint: npm run lint passes
 10. Build: npm run build succeeds
 ---

 ---
 Implementation Complete

  Created

  - src/components/pipeline/ContentAccessCarousel.tsx — The new multi-tab Content Access Carousel with:
    - 3 tabs: Rearview Mirror, Script Excerpt, Shot List
    - Tab availability logic: Rearview (stages 6-12, hidden for Scene 1), Script (always), Shots (stages 8-12)
    - Clickable tab labels with active state highlighting
    - Horizontal slide transitions via Embla carousel (watchDrag: false — no swipe, tabs only)
    - Collapse/expand with single toggle (Framer Motion AnimatePresence)
    - Drag-to-resize pulldown curtain (min 100px, max 50vh, grip handle at bottom)
    - Session-persistent height via module-level variable
    - Script rendering with simplified screenplay formatting (scene headings in amber, character names in blue, dialogue indented,  
  monospace font)
    - Shot list as vertical carousel with up/down arrows, medium-detail cards (shotId, camera, duration, action, dialogue snippet)  
    - Internal data fetching via React Query (shared cache with other components)

  Modified (7 stages)

  - Stage 7 — Replaced RearviewMirror import/usage, removed priorSceneData/imageError state, simplified lock status fetch
  - Stage 8 — Removed ContinuityHeader wrapper + RearviewMirror import, replaced both render usages, derived currentSceneNumber and 
  priorSceneNumber from existing React Query
  - Stage 10 — Replaced RearviewMirror, converted prior scene data to React Query (shared cache), kept comparison feature working   
  - Stage 9 — Added carousel (new)
  - Stage 11 — Added carousel (new)
  - Stage 12 — Added carousel (new)
  - Stage 6 — Replaced "Prior Scene End State" section with carousel in detail panel

  Deleted

  - src/components/pipeline/RearviewMirror.tsx

  Verification

  - npm run lint — 0 errors in modified files
  - npm run build — Successful production build
