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