# WT-C: Stage 12 Side-by-Side View & Timeline Player

**Wave**: 1 (parallel with WT-A and WT-B)
**Tasks**: 4D.3
**Scope**: Major UI overhaul of Stage 12 — proper video review experience with timeline navigation

> **Note**: 4A.1 (Content Access Carousel) has already been built and merged. `RearviewMirror.tsx` has been replaced by `ContentAccessCarousel.tsx` in Stage12VideoGeneration.tsx. The ContentAccessCarousel is already integrated — preserve it when overhauling the Stage 12 layout.

---

## Task 4D.3 — Stage 12 Side-by-Side View & Timeline Player

**Ticket**: 12.1
**Priority**: HIGH

### Problem
Stage 12 needs a professional review interface. The current implementation is basic — a video player with a job list. Users need to see the video alongside the shot list, jump to specific shots, and scrub through the timeline.

### Ticket 12.1 (from Tickets.md)
> Introduce a side-by-side view: scene player on left, individual shot list with thumbnails on right. Click a shot to jump to it. Timeline shows shot boundaries with markers, scrub across the full scene, current-shot indicator. Auto-advance between shots.

### MVP-tasklist-v1.1 Reference (Feature 1.4 — Stage 12 UI)
> Timeline-based video player with shot markers. Full scene assembly preview (multiple 8-second clips). Issue classification controls (visual continuity, timing, dialogue/audio, narrative). Playback controls (play/pause/scrub).

### Core Features
- [ ] **Side-by-Side Layout**: Scene player on left, shot list with thumbnails on right
- [ ] **Timeline Player**: Timeline bar with shot boundaries and markers
  - Visual segments per shot (colored/labeled)
  - Shot duration represented proportionally
- [ ] **Scrubbing**: Drag to scrub across the full scene timeline
  - Smooth seek across all shot videos
  - Timeline position indicator (playhead)
- [ ] **Current-Shot Indicator**: Visual highlight of currently playing shot
  - Shot list item highlights as it plays
  - Timeline segment highlights
- [ ] **Auto-Advance**: Seamless transition between shots
  - When one shot video ends, the next begins automatically
  - No gaps or loading between consecutive shots
- [ ] **Click-to-Jump**: Click any shot in the list to jump to it
  - Click on shot in sidebar → video seeks to that shot
  - Click on timeline segment → same behavior
- [ ] **Shot Thumbnails**: Start frame thumbnails in shot list panel
  - Show frame thumbnail, shot ID, duration
  - Show shot status (completed, failed, pending)

### Current Stage 12 Architecture (what exists today)
The current `Stage12VideoGeneration.tsx` has:
- A video player with basic playback controls (play/pause, skip, mute, fullscreen)
- A segmented timeline showing shot durations with preview thumbnails (basic version)
- A side panel with job list showing costs and generation times
- Issue resolution UI (routes to Stages 7, 8, 9 based on issue type)
- Progress tracking and ETA calculation
- **ContentAccessCarousel** (from 4A.1) — multi-tab carousel with Rearview, Script Excerpt, and Shot List tabs. Already integrated.

The overhaul should:
1. Replace the basic layout with a proper side-by-side professional review interface
2. Build a real timeline scrubber (not just segments)
3. Add smooth auto-advance between shot videos
4. Make the shot list interactive (click to jump)
5. Keep the existing issue routing UI (Visual Continuity → Stage 8, Timing → Stage 7, Dialogue → Stage 9, Narrative → Stage 7)
6. **Preserve the ContentAccessCarousel** integration — it should remain accessible in the new layout (e.g., above the video player or as a collapsible panel)

### Design Considerations
- The video player should be the primary focus (left, larger)
- Shot list is secondary (right, narrower, scrollable)
- Timeline sits below the video player
- Issue routing controls can remain below the shot list or in a bottom bar
- Maintain existing job progress/ETA display for scenes still rendering
- Consider Framer Motion for smooth transitions

### Dependencies
- Phase 3 asset system (for thumbnails) — **Done enough** ✅

---

## Files At Play

### Frontend Components
- `src/components/pipeline/Stage12VideoGeneration.tsx` — **PRIMARY FILE**: Complete overhaul of this component (already has ContentAccessCarousel integrated from 4A.1 — preserve it)
- `src/components/pipeline/ContentAccessCarousel.tsx` — Already integrated (4A.1 complete). Do NOT modify. Preserve in new layout.
- Consider extracting new sub-components:
  - `Stage12/VideoPlayer.tsx` — Video player with controls
  - `Stage12/TimelineBar.tsx` — Timeline scrubber with shot segments
  - `Stage12/ShotListPanel.tsx` — Side panel with shot thumbnails and click-to-jump

### Frontend Services
- `src/lib/services/checkoutService.ts` — `getVideoJobs()`, `getVideoJobStatus()`, `retryVideoJob()` (existing, likely unchanged)

### Frontend Types
- `src/types/scene.ts` — Video-related types (lines 273-395):
  - `ModelVariant` = 'veo_3_1_fast' | 'veo_3_1_standard'
  - `VideoJobStatus` = 'queued' | 'processing' | 'generating' | 'uploading' | 'completed' | 'failed'
  - `VideoGenerationJob` — job data with video URLs, costs, timings
  - `VideoJobsResponse` — jobs array with progress summary
  - `IssueType` — 'visual-continuity' | 'timing' | 'dialogue-audio' | 'narrative-structure'

### Shared Components (read/reuse, likely not modified)
- `src/components/pipeline/LockedStageHeader.tsx` — Stage header (reuse as-is)
- `src/components/pipeline/UnlockWarningDialog.tsx` — Unlock warning (reuse as-is)
- `src/components/pipeline/CostDisplay.tsx` — Cost display component
