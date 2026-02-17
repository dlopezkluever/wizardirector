  Content Access Carousel v2 — Complete

  Changes made to src/components/pipeline/ContentAccessCarousel.tsx:

  Removed:
  - RearviewContent component (entire sub-component deleted)
  - 'rearview' from TabId union type
  - Eye icon import
  - Button import (unused after removal)
  - Scene number guard (derivedSceneNumber > 1) for tab availability
  - priorScene variable (no longer needed)

  Added:
  - Stills tab (StillsContent) — browses start frames from all other scenes' shots via frameService.fetchFrames() in         
  parallel. Includes:
    - SceneTabBar — horizontal scene pills with smart default selection (nearest prior scene for stages 7+, first available  
  for stage 6)
    - HorizontalScrollCarousel — scrollable thumbnail container with left/right arrow buttons and ResizeObserver
    - StillCard — thumbnail (w-32 h-20) with shot ID label and click-to-enlarge
    - LightboxModal — full-resolution overlay, Escape key to close
  - Clips tab (ClipsContent) — browses completed video clips from all other scenes via checkoutService.getVideoJobs() in     
  parallel. Includes:
    - Same SceneTabBar pattern (reused)
    - ClipCard — thumbnail with play overlay, duration badge, inline <video> player on click, returns to thumbnail on video  
  end
  - UI polish — "Content Access" label left-aligned in header; tab pills hidden when collapsed (only label + chevron visible)  - Lazy loading — stills/clips data only fetched when their tab is active (enabled: activeTabId === 'stills'), with
  staleTime: 120_000

  Tab order: Script → Stills → Clips → Shots (Shots still stages 8+ only)

  Verification:
  - tsc --noEmit — passes
  - npm run build:dev — passes
  - npm run lint — no new errors (all 182 errors are pre-existing)
  - No remaining rearview/RearviewContent references in source code


-------------------
Quick Path (3-5 min)

  1. Start dev server

  npm run dev

  2. Navigate to any scene at Stage 8+

  (This gives you all 4 tabs: Script, Stills, Clips, Shots)

  3. Check header UI (30 sec)

  - Expanded: You should see Content Access label + [Script] [Stills] [Clips] [Shots] pills + chevron
  - Click chevron to collapse: Only Content Access + down-chevron visible, no tab pills
  - Expand again: Tabs reappear

  4. Check each tab (2-3 min)

  Tab: Script
  What to verify: Same as before — screenplay text renders
  ────────────────────────────────────────
  Tab: Stills
  What to verify: If other scenes have generated frames → scene pills appear, thumbnails show. Click thumbnail → lightbox    
    opens. Press Escape → closes. If no frames exist → "No stills available yet..." message
  ────────────────────────────────────────
  Tab: Clips
  What to verify: If other scenes have completed videos → scene pills + thumbnails with play button. Click → video plays     
    inline. Video ends → returns to thumbnail. If none exist → "No clips available yet..." message
  ────────────────────────────────────────
  Tab: Shots
  What to verify: Same as before — shot cards render

  5. Edge case spot-checks (optional, 1 min)

  - Visit Stage 6 (Script Hub) for Scene 1 → Stills/Clips tabs should show empty states (no other scenes to reference)       
  - Visit a scene at Stage 7 → only 3 tabs (no Shots), Stills/Clips should default to prior scene if data exists
  - Resize the panel via drag handle — still works
  - Switch tabs, collapse/expand — selected tab is preserved

  What you likely WON'T have data for

  If your project hasn't generated frames (Stage 10) or videos (Stage 12) for multiple scenes yet, Stills and Clips tabs will   just show their empty states — which is still valid to verify. The full carousel experience requires at least 2 scenes    
  with generated content.