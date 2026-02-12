 All tasks complete. Here's a summary of everything that was done:

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

  **AUDIT**

  
  4A.1 Implementation Audit

  Overall Verdict: Solid implementation with 1 real bug and 2 minor spec gaps

  ---
  BUG: Rearview Tab Text Is Off By One Scene

  This is the most important finding. In ContentAccessCarousel.tsx lines 604-606:

  <RearviewContent
    priorSceneEndState={priorScene?.priorSceneEndState}  // ← BUG
    endFrameThumbnail={priorScene?.endFrameThumbnail}     // ← correct

  How backend data works (verified in projects.ts:670):
  - scene.priorSceneEndState = the prior scene's end_state_summary (computed per scene in the enrichment loop)
  - scene.endFrameThumbnail = this scene's own end_frame_thumbnail_url

  The bug: The component looks up priorScene (Scene N-1) and reads its priorSceneEndState, which gives Scene N-2's end state — one  
  scene too far back.
  ┌───────────────┬───────────────┬─────────────────────────────────────┬─────────────────────┐
  │ If user is at │ priorScene is │ priorScene.priorSceneEndState shows │     Should show     │
  ├───────────────┼───────────────┼─────────────────────────────────────┼─────────────────────┤
  │ Scene 3       │ Scene 2       │ Scene 1's end state                 │ Scene 2's end state │
  ├───────────────┼───────────────┼─────────────────────────────────────┼─────────────────────┤
  │ Scene 4       │ Scene 3       │ Scene 2's end state                 │ Scene 3's end state │
  └───────────────┴───────────────┴─────────────────────────────────────┴─────────────────────┘
  Fix: Change to currentScene?.priorSceneEndState — this field already contains exactly what the Rearview tab needs.

  The endFrameThumbnail line is correct, because that field is the scene's OWN thumbnail, so priorScene?.endFrameThumbnail correctly   gives Scene N-1's end frame.

  ---
  Spec Gaps (minor)

  1. Shot cards missing "characters" field
  - Spec: "Each shot card shows: shot ID, duration, action snippet, camera, characters"
  - Implementation: Shows shotId, camera, duration, action, dialogue — no characters list
  - Severity: Low — characters info exists on the Shot type, just not rendered in the ShotCard

  2. No "current shot highlighted" feature
  - Spec: "Current shot highlighted (based on which shot the user is working on in the stage)"
  - Implementation: No currentShotId prop exists — the component can't know which shot the user is editing in the parent stage      
  - Severity: Low — nice-to-have for stages 8-10 where user is working shot-by-shot

  ---
  What Passed Well
  ┌────────────────────────────────────────────────────────┬─────────────────────────────────────────────────────────────────────┐  
  │                    Spec Requirement                    │                               Status                                │  
  ├────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────┤  
  │ 3 tabs (Rearview, Script, Shots)                       │ ✅                                                                  │   
  ├────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────┤  
  │ Tab availability by stage (6-7: no shots, 8-12: all 3) │ ✅                                                                  │   
  ├────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────┤  
  │ Rearview hidden for Scene 1                            │ ✅                                                                  │   
  ├────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────┤  
  │ Collapse/expand toggle                                 │ ✅ Framer Motion AnimatePresence                                    │   
  ├────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────┤  
  │ Drag-to-resize pulldown curtain                        │ ✅ Min 100px, max 50vh, grip handle                                 │   
  ├────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────┤  
  │ Session-persistent height                              │ ✅ Module-level variable                                            │   
  ├────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────┤  
  │ Script excerpt with screenplay formatting              │ ✅ Custom parser (headings in amber, characters in blue, monospace) │   
  ├────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────┤  
  │ Shot list as vertical carousel with up/down            │ ✅ Embla vertical carousel                                          │   
  ├────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────┤  
  │ Tab switching via clickable labels                     │ ✅ (chose tab labels over left/right arrows — arguably better UX)   │   
  ├────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────┤  
  │ React Query for data (shared cache)                    │ ✅ Uses ['scenes', projectId] and ['shots', projectId, sceneId]     │   
  ├────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────┤  
  │ Integrated into all 7 stages (6-12)                    │ ✅ Verified all imports + usage                                     │   
  ├────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────┤  
  │ RearviewMirror.tsx fully deleted                       │ ✅ No references remain                                             │   
  ├────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────┤  
  │ No lint errors, successful build                       │ ✅ Per dev summary                                                  │   
  └────────────────────────────────────────────────────────┴─────────────────────────────────────────────────────────────────────┘  
  ---
  Minor Design Decisions (not bugs, just trade-offs)

  - One file vs sub-components: Everything is in one 630-line file. Spec suggested splitting into ContentAccess/RearviewTab.tsx etc.   The current approach is fine for this size — each internal component is small.
  - Inline screenplay styles vs screenplay.css: Built a custom parser with Tailwind classes instead of reusing
  src/styles/screenplay.css. Works well but is a parallel implementation.
  - Embla carousel instead of Framer Motion for tab slides: Spec said "Framer Motion animations for slide transitions." Framer      
  Motion is used for collapse/expand only; tab slides use Embla. Functionally smooth either way.

  ---
  Summary

  The Rearview text bug is the only thing I'd fix before merging. The two spec gaps (characters in shot cards, current-shot
  highlight) are small enough to defer or add later. Everything else — the collapse/expand, pulldown curtain, screenplay parser,    
  shot list carousel, React Query caching, stage integration — is clean and well-built.