
## Phase 1: Pipeline Connectivity (Stages 9-12) ⭐ **PRIORITY**

**Goal**: Establish end-to-end pipeline functionality with real API integrations. Build Stages 9-12 to completion standard ("do it as well as possible") while prioritizing connectivity over perfection.

### Feature 1.1: Stage 9 - Prompt Segmentation & Model Preparation ✅ **COMPLETE IMPLEMENTATION**

**Purpose**: Deterministic prompt assembly and user-editable prompt management

**Database Requirements:**
- Extend `shots` table with `frame_prompt` and `video_prompt` fields (already exists)
- Add prompt versioning/history tracking

**Core Features:**
- [ ] **Prompt Assembly Service**: Create comprehensive prompt assembler that merges shot data + asset data into formatted prompts
  - Frame Prompts: Visually descriptive, asset-heavy, spatially explicit (references Stage 8 visual states)
  - Video Prompts: Action/audio focused, dialogue + SFX cues, minimal visual description
  - Hide system scaffolding prompts from user interface *Shouldn't be there at all*
- [ ] **Stage 9 UI Components**: Build shot-based prompt inspector with expandable cards 
  - Show Frame Prompt section (read-only by default, manual edit toggle)
  - Show Video Prompt section (always editable)
  - Add model compatibility tags (start frame only vs start+end frames)
  - Include Veo3-specific prompt formatting per PRD specifications
- [ ] **Prompt Validation & Preview**: Implement length validation, forbidden character checking, preview component
- [ ] **LLM Integration**: Auto-generate both prompt types via LLM, maintain full user editability
- [ ] **API Endpoints**:
  - `GET /api/projects/:projectId/scenes/:sceneId/shots/:shotId/prompts` - Get prompts
  - `PUT /api/projects/:projectId/scenes/:sceneId/shots/:shotId/prompts` - Update prompts
  - `POST /api/projects/:projectId/scenes/:sceneId/generate-prompts` - Bulk prompt generation
