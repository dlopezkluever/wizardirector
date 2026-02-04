# Aiuteur Implementation Task List

## Overview

This document outlines the iterative development plan for Aiuteur, progressing from the current frontend skeleton to a fully functional AI-powered film generation platform. Each phase delivers a working product with increasing capability.

**Current State**: Frontend UI skeleton with no backend, no data persistence, no AI integrations.

**Target State**: Full 12-stage pipeline with AI generation, version control, cost management, and production-ready video output.

---

## Phase 0: **DONE** Setup & Foundation (Barebones Functioning System) **DONE**

**Goal**: Establish minimal infrastructure to support basic data flow and state persistence. No AI integrations yet—focus on making the skeleton "live" with mock data that persists.

### Feature 0.1: Backend API Foundation
**Purpose**: Create minimal REST API structure for frontend communication
- [ ] Set up Fly.io deployment configuration and environment
- [ ] Create Express.js server with CORS and basic middleware
- [ ] Implement health check endpoint (`/api/health`)
- [ ] Add error handling middleware
- [ ] Configure environment variables for API keys (placeholder values)

### Feature 0.2: Database Schema Implementation
**Purpose**: Establish data persistence layer
- [ ] Set up Supabase project and configure connection
- [ ] Implement `projects` table with RLS policies
- [ ] Implement `branches` table with foreign key to projects
- [ ] Create initial migration scripts
- [ ] Test database connection from backend API

### Feature 0.3: Authentication System
**Purpose**: Enable user-specific project management
- [ ] Integrate Supabase Auth in frontend
- [ ] Create login/signup UI components
- [ ] Implement protected route middleware
- [ ] Add authentication state management in Zustand
- [ ] Test user session persistence

### Feature 0.4: Project CRUD Operations
**Purpose**: Enable basic project lifecycle management
- [ ] Implement POST `/api/projects` (create project)
- [ ] Implement GET `/api/projects/:id` (fetch project)
- [ ] Implement GET `/api/projects` (list user projects)
- [ ] Connect frontend Dashboard to real API calls
- [ ] Replace mock project data with database queries

### Feature 0.5: State Persistence Hookup
**Purpose**: Make pipeline state survive page refreshes
- [ ] Implement `stage_states` table with JSONB content field
- [ ] Create API endpoint POST `/api/projects/:id/stages/:stageNumber`
- [ ] Add auto-save functionality in pipeline components
- [ ] Implement state hydration on page load
- [ ] Test stage progression and data persistence

**Deliverable**: Users can create projects, navigate pipeline stages, and see their work persist across sessions. No AI generation yet—all content is manually entered or uses placeholder text.

---

## Phase 1: **DONE** Phase 1: MVP \- Stage 1-4 Text Pipeline (Minimal Viable Product) **DONE**

**Goal**: Deliver core narrative creation pipeline (Phase A: Stages 1-4) with real LLM integration. Users can input a story idea and get a structured script output.


### Feature 1.1 : LLM Service Integration & Observability
**Purpose**: Connect to text generation AI services with full debugging visibility
- [ ] Set up LangSmith project and API keys
- [ ] Set up Gemini/OpenAI/Anthropic client wrapped with LangSmith tracer
- [ ] Create `llm-client.ts` service with retry logic
- [ ] Implement prompt template system (database-stored)
- [ ] Add token counting and cost estimation utilities
- [ ] Test LLM connectivity and verify trace appearance in LangSmith

### Feature 1.2: Stage 1 - Input Modes (Complete)
**Purpose**: Functional narrative input system
- [ ] Implement file upload component for multi-file staging
- [ ] Add file type validation (text, PDF, screenplay formats)
- [ ] Create project configuration form with validation
- [ ] Store Stage 1 configuration in database
- [ ] Implement mode-specific processing logic

### Feature 1.3: Stage 2 - Treatment Generation (Complete)
**Purpose**: AI-powered prose treatment generation
- [ ] Build prompt template for treatment generation
- [ ] Implement 3-variant generation system
- [ ] Create variation selection UI with side-by-side comparison
- [ ] Add rich text editor with manual editing
- [ ] Implement targeted regeneration (highlight + right-click)

### Feature 1.4: Stage 3 - Beat Sheet Editor (Complete)
**Purpose**: Interactive structural editing
- [ ] Implement drag-and-drop beat reordering with @dnd-kit
- [ ] Create beat extraction LLM agent
- [ ] Add inline beat editing with auto-save
- [ ] Implement beat splitting/merging actions
- [ ] Add "Confirm Beat Sheet" gatekeeper logic

### Feature 1.5: Stage 4 - Master Script Generator (Complete)
**Purpose**: Generate production-ready screenplay
- [ ] Build verbose script generation prompt template
- [ ] Implement screenplay formatting (INT/EXT, character names, dialogue)
- [ ] Create script editor with industry-standard layout
- [ ] Add scene extraction logic for Phase B
- [ ] Implement "Approve Master Script" checkpoint

### Feature 1.6: Stage Progression & Gating
**Purpose**: Enforce pipeline dependencies and checkpoints
- [ ] Implement stage status state machine (draft/locked/invalidated)
- [ ] Add stage advancement validation logic
- [ ] Create visual progress timeline component
- [ ] Implement "lock stage" functionality
- [ ] Add navigation guards for incomplete stages

**Deliverable**: Users can input a story idea, iteratively refine it through AI-generated treatments and beat sheets, and receive a formatted master script. This is the first complete value delivery—users get a structured screenplay from a rough idea.

---

## Phase 2: **DONE** Phase 2: Style Capsule System **DONE**


**Goal**: Add creative control through style customization. Users can upload reference materials to guide tone, pacing, and aesthetic.
\*\*Goal\*\*: Add creative control through style customization. Users can upload reference materials to guide tone, pacing, and aesthetic.

\#\#\# Feature 2.0: Style Capsule Database Migration
\*\*Purpose\*\*: Migrate database schema from RAG to Style Capsule system  
\- \[ \] Create migration 004: Replace RAG tables with Style Capsule schema  
\- \[ \] Implement \`style\_capsule\_libraries\` table (user collections)  
\- \[ \] Implement \`style\_capsules\` table (individual capsules with text/metadata)  
\- \[ \] Implement \`style\_capsule\_applications\` table (audit logging)  
\- \[ \] Update projects table: replace \`written\_style\_rag\_id\`/\`visual\_style\_rag\_id\` with Style Capsule references  
\- \[ \] Remove any existing RAG-related database structures

\#\#\# Feature 2.1: Writing Style Capsule Library
\*\*Purpose\*\*: Enable tone/style consistency across text generation  
\- \[ \] Create Style Capsule upload UI for text samples and descriptors  
\- \[ \] Implement Style Capsule creation with text examples and metadata  
\- \[ \] Build Style Capsule management interface (create/edit/delete)  
\- \[ \] Add Style Capsule injection logic to Stage 2-4 prompts  
\- \[ \] Implement preset Writing Style Capsules for common styles

\#\#\# Feature 2.2: Visual Style Capsule Library  
\*\*Purpose\*\*: Control visual aesthetic for image/video generation  
\- \[ \] Create visual reference image upload interface  
\- \[ \] Implement Style Anchor creation with descriptors and design pillars  
\- \[ \] Build visual style selector UI component  
\- \[ \] Add Visual Style Capsule management page  
\- \[ \] Link visual style selection to asset generation

\#\#\# Feature 2.3: Context Management System  
\*\*Purpose\*\*: Implement Global vs Local context strategy  
\- \[ \] Create Context Manager service class  
\- \[ \] Implement global context assembly (Beat Sheet, Master Script summary)  
\- \[ \] Add local context windowing for scenes  
\- \[ \] Build context injection into LLM prompts  
*\- \[ \] Add context size monitoring and truncation*

\#\#\# Feature 2.4: Style Capsule-Enhanced Generation  
\*\*Purpose\*\*: Apply style guidance to AI outputs  
\- \[ \] Modify Stage 2 prompts to include Writing Style Capsule injection  
\- \[ \] Update Stage 4 script generation with Style Capsule application  
\- \[ \] Implement deterministic Style Capsule selection logic  
\- \[ \] Implement Style Capsule application logging in \`style\_capsule\_applications\` table  
\- \[ \] Test style consistency across regenerations

\*\*Deliverable\*\*: Users can define custom written and visual styles by uploading reference materials. Generated treatments and scripts reflect the uploaded style, making output more personalized and consistent with user vision.

---

## Phase 3: **DONE** Phase 3: Asset Management & Stage 5 **DONE**

**Goal**: Enable visual asset definition and management. Users can define characters, props, and locations with generated image references.

### Feature 3.1: Image Generation Service
**Purpose**: Integrate Nano Banana for asset image keys
- [ ] Set up Nano Banana API client
- [ ] Implement image generation request/response handling
- [ ] Add Supabase Storage integration for image uploads
- [ ] Create image generation queue system
- [ ] Implement error handling and retry logic

### Feature 3.2: Global Asset Library
**Purpose**: Centralized asset management across projects
- [ ] Implement `global_assets` table and API endpoints
- [ ] Create asset creation UI (name, type, description)
- [ ] Build asset gallery/grid view component
- [ ] Add search and filter functionality
- [ ] Implement asset deletion with dependency checking

### Feature 3.3: Stage 5 - Asset Extraction & Definition
**Purpose**: Parse script and generate visual keys
- [ ] Implement LLM-based asset extraction from Stage 4 script
- [ ] Create asset definition editor UI (description + image)
- [ ] Build image key generation workflow
- [ ] Add iterative image regeneration with guidance
- [ ] Implement "Lock Master Asset" gatekeeper

### Feature 3.4: Project-Level Assets
**Purpose**: Project-specific asset instances
- [ ] Implement `project_assets` table
- [ ] Create asset inheritance from global library
- [ ] Add project asset drawer UI component
- [ ] Implement asset promotion (project → global)
- [ ] Build asset versioning system

### Feature 3.5: Visual Style Lock
**Purpose**: Enforce consistent visual aesthetic
- [ ] Create visual style selector in Stage 5
- [ ] Implement style lock enforcement in image generation
- [ ] Add style preview component
- [ ] Store locked style in global context
- [ ] Test style consistency across multiple assets

**Deliverable**: Users can extract characters, props, and settings from their script, generate reference images for each, and lock a visual style. This establishes the visual foundation for video generation.

---

## Phase 4: **DONE** Phase B Foundation - Scenes & Shots **DONE**

**Goal**: Implement scene-based workflow (Stage 6-7). Users can break down their script into technical shot lists.

### Feature 4.1: Scene Extraction & Parsing
**Purpose**: Convert Master Script into scene database entries
- [ ] Implement `scenes` table
- [ ] Build scene extraction logic from Stage 4 script
- [ ] Create scene heading parser (INT/EXT/DAY/NIGHT)
- [ ] Store scene content and metadata
- [ ] Implement scene ordering and numbering

### Feature 4.2: Stage 6 - Script Hub
**Purpose**: Scene navigation and status tracking
\- \[ \] Create scene list UI with status indicators  
\- \[ \] Implement scene selection and navigation  
\- \[ \] Build scene overview panel with dependencies (characters, locations, props)  
\- \[ \] Implement fuzzy matching (Levenshtein distance, threshold 0.85) for asset identification  
\- \[ \] Add continuity risk analyzer (advisory)  
\- \[ \] Create "Enter Scene Pipeline" action

### Feature 4.3: Stage 7 - Shot List Generator
**Purpose**: Break scenes into timed, technical shots
- [ ] Implement `shots` table with mandatory fields
- [ ] Build shot extraction LLM agent
- [ ] Create shot table UI (spreadsheet-style)
- [ ] Add shot field editing with auto-save
- [ ] Implement shot splitting/merging logic

### Feature 4.4: Rearview Mirror Component
**Purpose**: Display prior scene end-state for continuity
- [ ] Create collapsible rearview mirror UI component
- [ ] Implement prior scene data fetching
- [ ] Display final action/dialogue from previous scene
- [ ] Add visual frame preview (when available)
- [ ] Integrate into Stage 7-10 interfaces

### Feature 4.5: Shot List Validation & Locking
**Purpose**: Enforce shot list completeness
- [ ] Add field validation (required fields, duration limits)
- [ ] Implement shot coherence checking
- [ ] Create "Lock Shot List" gatekeeper
- [ ] Add warning modal for incomplete shots
- [ ] Store locked shot list in database

**Deliverable**: Users can navigate scenes, break them into detailed shot lists with camera specs and action, and see continuity context from prior scenes. This bridges narrative (Phase A) to production (Phase B).

---

## Phase 5: **IN PROGRESS** Asset Inheritance & Stage 8 **IN PROGRESS**

**Goal**: Implement stateful asset system. Assets evolve across scenes with condition tracking.

### Feature 5.1: Scene Asset Instances
**Purpose**: Scene-specific asset variations
- [ ] Implement `scene_asset_instances` table
- [ ] Create asset inheritance logic (Scene N → Scene N+1)
- [ ] Build scene asset state propagation
- [ ] Add asset modification tracking
- [ ] Implement scene-specific image key generation

### Feature 5.2: Stage 8 - Visual Definition UI
**Purpose**: Define scene starting visual state
- [ ] Create Scene Visual Elements panel
- [ ] Build Visual State Editor with pre-filled descriptions
- [ ] Implement Asset Drawer for global asset access
- [ ] Add drag-and-drop asset assignment
- [ ] Create bulk asset image generation workflow

### Feature 5.3: Status Metadata Tags
**Purpose**: Track visual conditions (muddy, bloody, torn)
- [ ] Add status tags field to scene asset instances
- [ ] Create tag UI component (chips/badges)
- [ ] Implement condition carry-forward prompt
- [ ] Build tag persistence logic across scenes
- [ ] Add tag-based search and filtering

### 5.3b Deal with Stage 8 Issues
**Purpose**: Fix critical Stage 8 bugs including stage navigation persistence, image generation UI updates, status tag preservation, project asset access, and UX enhancements.
todos:
- 1a: "Fix Stage 7 redirect on refresh: Update           
    ProjectView URL persistence to include sceneId, fix validation logic, add localStorage backup"
- 1b: "Fix image generation UI refresh: Add polling for 
    single generation, invalidate React Query cache after bulk polling completes"
- 2a: "Fix status tags wiped on lock: Use local state in 
    VisualStateEditorPanel, preserve existing tags when adding 'locked'"
- 3ab: "Add project assets to drawer: Add source toggle 
    (project/global), default to project assets in Stage 8, handle both selection flows"
  - 2b: "Add keyboard navigation to tag dropdown:   
    Implement arrow keys, Enter, Tab, Escape handlers with visual highlighting"
  - 5: "Add scene header: Display scene number and 

----- **Everything Up Until This Point Complete** -----


### Feature 5.4: Asset State Evolution
**Purpose**: Handle mid-scene visual changes
- [ ] Implement asset state change detection
- [ ] Create asset change logging system
- [ ] Add visual evolution tracking
- [ ] Build asset timeline view
- [ ] Implement state rollback functionality

### Feature 5.5: Scene-to-Scene Continuity
**Purpose**: Ensure visual consistency across scene boundaries
- [ ] Implement end-state summary generation
- [ ] Create continuity flag system
- [ ] Add visual diff component (before/after)
- [ ] Build automatic continuity warning system
- [ ] Implement manual continuity override

**Deliverable**: Assets (characters, props) maintain state across scenes. Users can modify asset appearance for specific scenes, track conditions, and ensure visual continuity. Characters can get muddy, clothes can tear, and these changes persist.

---

## Phase 6: Prompt Engineering & Stage 9

**Goal**: Implement deterministic prompt assembly system. Users can see and edit exact prompts sent to AI models.

### Feature 6.1: Prompt Taxonomy Implementation
**Purpose**: Separate frame, video, and system prompts
- [ ] Implement prompt type enum (frame/video/system)
- [ ] Create prompt template versioning system
- [ ] Build prompt assembly logic per shot
- [ ] Add prompt field validation
- [ ] Store prompt history in database

### Feature 6.2: Stage 9 - Prompt Inspector UI
**Purpose**: Expose and edit model inputs
- [ ] Create expandable shot card component
- [ ] Build Frame Prompt section (read-only by default)
- [ ] Add Video Prompt section (editable)
- [ ] Implement manual edit toggle
- [ ] Create model compatibility indicator

### Feature 6.3: Prompt Assembly Agent
**Purpose**: Merge shot + asset data into formatted prompts
- [ ] Build shot data → frame prompt logic
- [ ] Implement action + dialogue → video prompt logic
- [ ] Add visual style RAG injection
- [ ] Create character profile merging
- [ ] Implement prompt sanity checker

### Feature 6.4: Veo3 / Sora Prompt Formatting
**Purpose**: Format prompts for video generation API
- [ ] Implement Veo3-specific prompt structure
- [ ] Add visual section formatter
- [ ] Build audio section formatter (dialogue + SFX)
- [ ] Create character voice mapping
- [ ] Add timing specification

### Feature 6.5: Prompt Validation & Preview
**Purpose**: Catch formatting issues before generation
- [ ] Implement prompt length validation
- [ ] Add forbidden character checking
- [ ] Create prompt preview component
- [ ] Build prompt comparison tool (variant A vs B)
- [ ] Implement prompt testing interface

**Deliverable**: Users can see exactly what prompts will be sent to AI models, edit them for fine control, and validate they meet API requirements. This transparency enables debugging and refinement.

---

## Phase 7: Frame Generation & Stage 10

**Goal**: Implement anchor frame generation with continuity checking. Users generate start/end frames to constrain video output.

### Feature 7.1: Frame Generation Service
**Purpose**: Integrate Nano Banana for frame generation
- [ ] Implement `frames` table
- [ ] Create frame generation API endpoint
- [ ] Add prior frame seeding logic
- [ ] Build frame storage in Supabase
- [ ] Implement frame approval workflow

### Feature 7.2: Generation Mode Selection
**Purpose**: Speed vs cost optimization
- [ ] Create mode selector UI (Quick/Control)
- [ ] Implement Quick Mode (bulk generation)
- [ ] Build Control Mode (sequential approval)
- [ ] Add cost estimation for each mode
- [ ] Store mode preference in user settings

### Feature 7.3: Stage 10 - Frame Generation UI
**Purpose**: Generate and review anchor frames
- [ ] Create shot frame panel with status indicators
- [ ] Build visual rearview mirror with comparison
- [ ] Implement bulk generation workflow (Quick Mode)
- [ ] Add step-by-step workflow (Control Mode)
- [ ] Create frame approval interface

### Feature 7.4: Continuity Validation
**Purpose**: Detect and fix visual inconsistencies
- [ ] Implement frame dependency manager
- [ ] Build continuity drift detector
- [ ] Create visual diff component (ghost/flicker)
- [ ] Add automatic flagging of continuity breaks
- [ ] Implement region-level inpainting for fixes

### Feature 7.5: Frame Iteration & Refinement
**Purpose**: Enable targeted frame regeneration
- [ ] Add frame regeneration with guidance
- [ ] Implement localized inpainting interface
- [ ] Create frame history tracking
- [ ] Build frame comparison view
- [ ] Add frame version rollback

**Deliverable**: Users generate image frames that anchor video generation, with tools to ensure continuity between shots. The system catches visual drift and provides localized fixing tools.

---

## Phase 8: Cost Management & Stage 11

**Goal**: Implement transparent cost tracking and gating. Users see costs before expensive operations and can make informed decisions.

### Feature 8.1: Cost Calculation Engine
**Purpose**: Accurate credit estimation across operations
- [ ] Create cost model database (per operation type)
- [ ] Implement cost calculation utilities
- [ ] Add per-shot cost estimation
- [ ] Build scene-level cost aggregation
- [ ] Create project-level cost tracking

### Feature 8.2: Stage 11 - Confirmation Gateway
**Purpose**: Final checkpoint before video generation
- [ ] Create scene summary view (all shots + frames)
- [ ] Build cost breakdown display
- [ ] Implement dependency warning system
- [ ] Add prompt snapshot preview
- [ ] Create "Confirm & Render" action

### Feature 8.3: Cost Tracking & History
**Purpose**: Monitor spending across project lifecycle
- [ ] Implement cost logging in database
- [ ] Create cost history view
- [ ] Build per-user credit balance system
- [ ] Add low-credit warnings
- [ ] Implement cost analytics dashboard

### Feature 8.4: Credit Purchase System
**Purpose**: Enable users to buy generation credits
- [ ] Integrate payment processor (Stripe/similar)
- [ ] Create credit package selection UI
- [ ] Implement purchase flow
- [ ] Add receipt generation
- [ ] Build credit balance updates

### Feature 8.5: Cost Optimization Recommendations
**Purpose**: Help users reduce unnecessary spending
- [ ] Implement cost-saving suggestion engine
- [ ] Add "cheapest path" analyzer
- [ ] Create bulk operation pricing
- [ ] Build cost comparison tool (mode A vs B)
- [ ] Implement smart regeneration recommendations

**Deliverable**: Users see transparent cost breakdowns before expensive operations, can purchase credits, and receive recommendations to optimize spending. This builds trust and prevents surprise charges.

---

## Phase 9: Video Generation & Stage 12

**Goal**: Implement video generation pipeline. Users can render final videos and review output.

### Feature 9.1: Veo3 Video Service
**Purpose**: Integrate Google Veo3 for video generation
- [ ] Set up Veo3 API client
- [ ] Implement `videos` table
- [ ] Create video generation request handling
- [ ] Add webhook for generation completion
- [ ] Build video storage in Supabase

### Feature 9.2: Asynchronous Job System
**Purpose**: Handle long-running video generation
- [ ] Implement job queue (Bull/similar)
- [ ] Create background worker process
- [ ] Add job status tracking
- [ ] Build retry logic for failed jobs
- [ ] Implement job cancellation

### Feature 9.3: Stage 12 - Video Review UI
**Purpose**: Playback and evaluation interface
- [ ] Create timeline-based video player
- [ ] Build shot marker overlay
- [ ] Implement full-scene assembly preview
- [ ] Add playback controls (play/pause/scrub)
- [ ] Create issue classification controls

### Feature 9.4: Notification System
**Purpose**: Alert users when renders complete
- [ ] Implement in-app toast notifications
- [ ] Add email notification system
- [ ] Create notification preferences
- [ ] Build notification history
- [ ] Implement render re-entry logic

### Feature 9.5: Iteration Routing
**Purpose**: Route users to correct upstream stage for fixes
- [ ] Implement failure attribution agent
- [ ] Create issue-to-stage mapping
- [ ] Build "Return to Stage X" actions
- [ ] Add issue description capture
- [ ] Implement regeneration workflow

**Deliverable**: Users can generate final videos, receive notifications when complete, review output, and iterate by returning to upstream stages to fix issues. This completes the core production pipeline.

---

Phase 10a: Basic Version Control & Branching — **SIMPLIFIED** (per scope-change)

\*\*Goal\*\*: Basic branch switching only. No Artifact Vault, Visual Diff, Conflict Resolution, or Rollback UI for MVP.

\#\#\# Feature 10.1: Basic Branch Switching UI (MVP only)  
\*\*Purpose\*\*: Switch between branches and create new ones  
\- \[ \] Add dropdown (or equivalent) to switch between existing branches  
\- \[ \] Add "Create new branch" action  
\- \[ \] Use existing \`branches\` table and creation logic  
\- \[ \] *Defer: tree visualization, artifact vault, invalidation logic, conflict resolution, visual diff, rollback UI*

### NOTES:

-- See Stage 4/5 Transition Logic (Gate Approach) {4.1-task-7.md in 10/}

-- Return to Stage 7: Phase 10 Alignment (Immutability): **Intentional scope for 4.3:** In-place updates to the `shots` table (PUT for auto-save, delete-and-insert for split) are acceptable for this phase. Full versioning, branching, and immutability ("completed stages are never mutated in place") will be addressed in **Phase 10: Version Control & Branching** (Story Timelines). No shot-level versioning or `stage_states`-style snapshots are required for 4.3; the "Lock & Proceed" behavior and any rollback/version history will be ironed out when implementing Phase 10.

**Scope**: Per scope-change—"Just add a dropdown in UI to switch between branches and create new ones. That's it." Features 10.2–10.5 (Artifact Vault, Version History UI, Conflict Resolution, Invalidation Logic) **deferred** to post-launch.

**Complex Conflict Resolution*
*2. **Later (Phase 10):** Build the fancy UI that shows a side-by-side comparison of Global vs. Local changes and lets the user "Pick and Choose" which ones to keep.
(**Recommendation for Phase 10 (Later):**
Implement "Conflict Resolution UIs," "Visual Diffs," and "Version History/Rollbacks." These are the "Advanced" features listed in your task list.)

**Deliverable**: Users can switch branches and create new ones from the UI. Advanced version control (visual diff, conflict resolution, artifact vault) deferred.


\#\# Phase 12: Export & Project Finalization — **SIMPLIFIED** (per scope-change)

\*\*Goal\*\*: Single-format video export (MP4 only) for MVP. Defer NLE, asset packages, audio stems, archival.

\#\#\# Feature 12.1: Video Export (MP4 only)  
\*\*Purpose\*\*: Package final video as MP4  
\- \[ \] Implement MP4 video export  
\- \[ \] Create project export API endpoint  
\- \[ \] Build export job queue (or inline)  
\- \[ \] Implement export progress tracking  
\- \[ \] *Defer: ProRes, WebM, high-bitrate options*

\#\#\# Features 12.2–12.5 — **DEFER**  
\*\*Scope\*\*: NLE Integration (EDL/XML), Asset Package Export (ZIP), Audio Stems, Project Archival **deferred** to post-launch per scope-change.

\*\*Deliverable\*\*: Users can export final video as MP4. Advanced export (NLE, asset packages, archival) deferred.



---------------- Launch MVP! ---------------



## Phase 10b: Advanced Version Control & Branching

**Goal**: Implement git-style "Story Timelines" branching system. Users can experiment without destroying completed work.

### Feature 10.1: Branching Data Model
**Purpose**: Enable non-linear project evolution
- [ ] Enhance `branches` table with parent references
- [ ] Implement branch creation logic
- [ ] Add branch merging rules
- [ ] Create branch deletion with safeguards
- [ ] Build branch comparison utilities

### Feature 10.2: Mandatory Branching Rules
**Purpose**: Enforce branching for destructive operations
- [ ] Detect Stage 3 → Stage 4 regeneration trigger
- [ ] Implement auto-branch creation modal
- [ ] Add branch naming interface
- [ ] Store commit messages (regeneration guidance)
- [ ] Prevent progress without branching

### Feature 10.3: Version History UI
**Purpose**: Visualize and navigate project timeline
- [ ] Create tree visualization component
- [ ] Build branch timeline view
- [ ] Implement node selection and switching
- [ ] Add branch metadata display
- [ ] Create version comparison interface

### Feature 10.4: Artifact Vault
**Purpose**: Central repository for all generated content
- [ ] Create artifact storage system
- [ ] Build branch-grouped artifact view
- [ ] Implement artifact tagging
- [ ] Add artifact search and filter
- [ ] Create artifact promotion to global library

### Feature 10.5: Invalidation Logic
**Purpose**: Cascade changes through dependent artifacts
- [ ] Implement `invalidation_logs` table
- [ ] Build global invalidation logic
- [ ] Add local (scene) invalidation
- [ ] Create continuity break detection
- [ ] Implement cost estimation for invalidations

**Deliverable**: Users can create experimental branches to try narrative changes without losing completed work. The system tracks all versions and provides visual history for navigation.

---

## Phase 11: Advanced UI/UX & Polish

**Goal**: Enhance user experience with animations, keyboard shortcuts, tutorials, and quality-of-life improvements.

### Feature 11.1: Animations & Transitions
**Purpose**: Smooth, professional interface feel
- [ ] Implement Framer Motion stage transitions
- [ ] Add micro-interactions (button hovers, clicks)
- [ ] Create loading state animations
- [ ] Build progress bar animations
- [ ] Add page transition effects

### Feature 11.2: Keyboard Shortcuts
**Purpose**: Power user efficiency
- [ ] Implement keyboard shortcut system
- [ ] Add stage navigation shortcuts
- [ ] Create action shortcuts (save, regenerate, etc.)
- [ ] Build shortcut help modal
- [ ] Add customizable key bindings

### Feature 11.3: Onboarding & Tutorials
**Purpose**: Guide new users through pipeline
- [ ] Create first-time user onboarding flow
- [ ] Build interactive tutorial overlays
- [ ] Implement contextual help tooltips
- [ ] Add video tutorial embeds
- [ ] Create example project templates

### Feature 11.4: Advanced Editing Tools
**Purpose**: Enhance content creation experience
- [ ] Add markdown support in text editors
- [ ] Implement syntax highlighting for scripts
- [ ] Create collaborative editing (real-time)
- [ ] Build version diffing visualization
- [ ] Add advanced search across content

### Feature 11.5: Mobile Responsiveness
**Purpose**: Usable interface on smaller screens
- [ ] Optimize layout for tablet screens
- [ ] Create mobile-friendly navigation
- [ ] Implement touch-optimized controls
- [ ] Add mobile-specific UI patterns
- [ ] Test across device sizes

**Deliverable**: A polished, professional interface with smooth animations, helpful guidance for new users, and power-user features for efficiency.

---

## Phase 12: Export & Project Finalization

**Goal**: Enable users to export completed projects in professional formats for external editing.

### Feature 12.1: Video Export System
**Purpose**: Package final video assets
- [ ] Implement high-bitrate video export
- [ ] Create project export API endpoint
- [ ] Build export job queue
- [ ] Add export format options (MP4, ProRes, etc.)
- [ ] Implement export progress tracking

### Feature 12.2: NLE Integration
**Purpose**: Export for DaVinci Resolve/Premiere
- [ ] Generate EDL/XML files from scene sequence
- [ ] Implement standardized file naming
- [ ] Create folder structure for NLE import
- [ ] Add timecode generation
- [ ] Build markers for shot boundaries

### Feature 12.3: Asset Package Export
**Purpose**: Export all project artifacts
- [ ] Create ZIP archive generation
- [ ] Include all videos, frames, scripts
- [ ] Add project metadata file
- [ ] Implement selective export (choose artifacts)
- [ ] Build export history tracking

### Feature 12.4: Audio Stems Separation
**Purpose**: Separate audio tracks for mixing
- [ ] Implement dialogue track extraction
- [ ] Create SFX track separation
- [ ] Add music track export
- [ ] Build multi-track audio export
- [ ] Implement audio sync validation

### Feature 12.5: Project Archival
**Purpose**: Long-term storage and backup
- [ ] Create project archive format
- [ ] Implement project backup system
- [ ] Add cloud storage integration (S3)
- [ ] Build project restoration from archive
- [ ] Implement version-specific archives

**Deliverable**: Users can export complete projects in professional formats, import into industry-standard editing software, and archive projects for long-term storage.

---