### Feature 1.2: Stage 10 - Frame Generation with Real Gemini Integration ✅ **COMPLETE IMPLEMENTATION**

**Purpose**: Generate start/end anchor frames using real Gemini API with continuity validation

**Database Requirements:**
- Create `frames` table with shot references and generation metadata
- Link to existing `image_generation_jobs` system for tracking

**Core Features:**
- [ ] **Gemini API Integration**: Replace mock calls with real Gemini API (Flash-1/Nano Banana model)
  - Implement frame generation service with retry logic
  - Add cost tracking and credit deduction
  - Include transparent background injection for characters/props
- [ ] **Generation Mode Implementation**:
  - Quick Mode: Bulk generate all required frames (speed-optimized)
  - Control Mode: Sequential generation with approval gates (cost-optimized)
  - Optional toggle for start-frame-only generation (Sora-style models)
- [ ] **Stage 10 UI**: Build comprehensive frame generation interface
  - Shot frame panel with status indicators
  - Visual rearview mirror with ghost/flicker comparison
  - Grid-based generation view (Quick Mode)
  - Step-by-step progression (Control Mode)
  - Frame approval interface with regeneration options
- [ ] **Continuity System**: Implement frame dependency manager
  - Enforce correct frame chaining
  - Region-level inpainting agent for localized corrections
  - Continuity drift detection and flagging
- [ ] **API Endpoints**:
  - `POST /api/projects/:projectId/scenes/:sceneId/generate-frames` - Start frame generation
  - `GET /api/projects/:projectId/scenes/:sceneId/frames` - Get frames status
  - `PUT /api/projects/:projectId/scenes/:sceneId/frames/:frameId/approve` - Approve frame
  - `POST /api/projects/:projectId/scenes/:sceneId/frames/:frameId/regenerate` - Regenerate with guidance