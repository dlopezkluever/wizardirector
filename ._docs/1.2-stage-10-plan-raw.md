 I've written the implementation plan covering all 7 phases:

  1. Database: New frames table with status tracking and RLS
  2. Backend APIs: 6 endpoints for CRUD, generation, approval, inpainting
  3. Frontend Service: frameService.ts following existing patterns
  4. Control Mode UI: Full rewrite of Stage10 with FramePanel components
  5. Slider Comparison: Draggable overlay for continuity checking
  6. Canvas Inpainting: Brush tool with mask generation
  7. Quick Mode: Grid view with bulk actions (secondary priority)

───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── Ready to code?

 Here is Claude's plan:
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌ Stage 10: Frame Generation Implementation Plan

 Summary

 Implement Stage 10 Frame Generation with real Gemini API integration, featuring Control Mode workflow (primary), slider-based
 continuity comparison, and full canvas-based inpainting.

 ---
 User Decisions

 - Database: Both new frames table + existing image_generation_jobs
 - Inpainting: Full implementation (canvas brush, mask generation, Gemini API)
 - Mode Priority: Control Mode first (sequential approval)
 - Continuity UI: Slider overlay comparison
 - Inpaint Tools: Brush tool only
 - Cost Display: Running total (no per-frame confirmation)

 ---
 Implementation Order

 Phase 1: Database Migration

 File: backend/migrations/019_frames_table.sql

 Create frames table with:
 - shot_id FK, frame_type ('start'|'end')
 - status: pending → generating → generated → approved/rejected
 - image_url, storage_path, current_job_id FK to jobs
 - generation_count, total_cost_credits
 - previous_frame_id FK (for continuity chaining)
 - prompt_snapshot (locked at generation time)
 - RLS policies matching existing shot/scene pattern
 - Unique constraint: (shot_id, frame_type)

 ---
 Phase 2: Backend API Routes

 New File: backend/src/routes/frames.ts
 ┌─────────────────────────────────────────────────────────────────────┬────────┬──────────────────────────────────────────────┐
 │                              Endpoint                               │ Method │                   Purpose                    │
 ├─────────────────────────────────────────────────────────────────────┼────────┼──────────────────────────────────────────────┤
 │ /api/projects/:projectId/scenes/:sceneId/frames                     │ GET    │ Fetch all frames for scene with shot context │
 ├─────────────────────────────────────────────────────────────────────┼────────┼──────────────────────────────────────────────┤
 │ /api/projects/:projectId/scenes/:sceneId/generate-frames            │ POST   │ Start generation (mode: quick/control)       │
 ├─────────────────────────────────────────────────────────────────────┼────────┼──────────────────────────────────────────────┤
 │ /api/projects/:projectId/scenes/:sceneId/frames/:frameId/approve    │ PUT    │ Approve frame                                │
 ├─────────────────────────────────────────────────────────────────────┼────────┼──────────────────────────────────────────────┤
 │ /api/projects/:projectId/scenes/:sceneId/frames/:frameId/reject     │ PUT    │ Reject frame                                 │
 ├─────────────────────────────────────────────────────────────────────┼────────┼──────────────────────────────────────────────┤
 │ /api/projects/:projectId/scenes/:sceneId/frames/:frameId/regenerate │ POST   │ Regenerate frame                             │
 ├─────────────────────────────────────────────────────────────────────┼────────┼──────────────────────────────────────────────┤
 │ /api/projects/:projectId/scenes/:sceneId/frames/:frameId/inpaint    │ POST   │ Inpaint with mask                            │
 └─────────────────────────────────────────────────────────────────────┴────────┴──────────────────────────────────────────────┘
 New File: backend/src/services/frameGenerationService.ts
 - Frame dependency management (start before end in Control Mode)
 - Prompt enhancement for frame context
 - Cost tracking, continuity reference handling

 Modify: backend/src/app.ts - Register frames router

 ---
 Phase 3: Frontend Service Layer

 New File: src/lib/services/frameService.ts

 class FrameService {
   fetchFrames(projectId, sceneId): Promise<FetchFramesResponse>
   generateFrames(projectId, sceneId, { mode, shotIds?, startOnly? })
   approveFrame(projectId, sceneId, frameId)
   rejectFrame(projectId, sceneId, frameId)
   regenerateFrame(projectId, sceneId, frameId)
   inpaintFrame(projectId, sceneId, frameId, { maskDataUrl, prompt })
   pollJobStatus(jobId)
 }

 Pattern Reference: src/lib/services/promptService.ts

 ---
 Phase 4: UI Components (Control Mode Focus)

 4.1 Main Component Rewrite

 File: src/components/pipeline/Stage10FrameGeneration.tsx

 Component hierarchy:
 Stage10FrameGeneration
 ├── ModeSelector (Quick/Control toggle)
 ├── CostDisplay (running total banner)
 ├── FrameWorkspace
 │   ├── ShotList (left sidebar with status indicators)
 │   └── FrameEditor (main area)
 │       ├── FramePanel (start frame)
 │       ├── FramePanel (end frame, if required)
 │       └── ContinuityCompare button
 ├── SliderComparisonModal
 └── InpaintingModal

 4.2 New Component: src/components/pipeline/FramePanel.tsx

 - Large 16:9 image display
 - Status badge (pending/generating/generated/approved)
 - Action buttons: Generate, Approve, Reject, Inpaint, Compare
 - Generation progress indicator
 - Disabled state for end frame before start approved

 4.3 New Component: src/components/pipeline/CostDisplay.tsx

 - Running credits total
 - Frames generated / total count
 - No confirmation modals

 ---
 Phase 5: Slider Comparison Component

 New File: src/components/pipeline/SliderComparison.tsx

 Features:
 - Modal with two stacked images
 - CSS clip-path controlled by draggable slider
 - Vertical divider line at slider position
 - Keyboard accessible (arrow keys)
 - Compare previous shot's end frame vs current start frame

 ---
 Phase 6: Canvas Inpainting Component

 New File: src/components/pipeline/InpaintCanvas.tsx

 Features:
 - Canvas overlay on source image
 - Adjustable brush size (10-100px slider)
 - Paint mode (white regions = edit areas)
 - Eraser mode
 - Clear all, Undo/Redo
 - Preview mask overlay toggle
 - Prompt input for inpainting instruction
 - Export mask as base64 PNG on submit

 New File: src/components/pipeline/InpaintingModal.tsx
 - Modal wrapper with loading states
 - Calls frameService.inpaintFrame() on submit

 Modify: backend/src/services/image-generation/NanoBananaClient.ts
 - Enhance inpaintImage() to accept actual mask PNG
 - Send source image + mask to Gemini API

 ---
 Phase 7: Quick Mode (Secondary)

 New File: src/components/pipeline/FrameGrid.tsx

 Features:
 - Responsive grid (2-4 columns)
 - All shots' frames visible
 - Bulk actions: "Generate All", "Approve All Generated"
 - Progress indicator (X/Y frames complete)
 - Click cell to open detail view

 ---
 File Summary
 src/components/pipeline/InpaintCanvas.tsx
 src/components/pipeline/InpaintingModal.tsx
 src/components/pipeline/FrameGrid.tsx

 Files to Modify

 backend/src/app.ts                           # Register frames router
 backend/src/services/image-generation/NanoBananaClient.ts  # Inpaint mask support
 src/components/pipeline/Stage10FrameGeneration.tsx  # Full rewrite
 src/types/scene.ts                           # Extend Frame types

 ---
 Key Reference Files

 - backend/migrations/007_image_generation_jobs.sql - Table design pattern
 - backend/src/routes/projects.ts:1607-1973 - Scene/shot API route patterns
 - backend/src/services/image-generation/ImageGenerationService.ts - Job creation pattern
 - src/lib/services/promptService.ts - Frontend service pattern
 - src/components/pipeline/Stage9PromptSegmentation.tsx - UI patterns (debounced updates, status badges)

 ---
 Verification Steps

 1. Run migration, verify frames table created with proper RLS
 2. Test frame CRUD via API (Postman/curl)
 3. Test generation job creation and polling
 4. Verify Control Mode enforces start-before-end
 5. Test slider comparison with two different images
 6. Test inpaint canvas mask generation (export to PNG)
 7. End-to-end: Generate → Approve → Stage complete gatekeeper