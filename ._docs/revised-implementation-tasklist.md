\# Aiuteur Implementation Task List (Revised Scope)

## Scope Revision

This task list has been **narrowed per** \`scope-change-post-4.md\` for solo-developer focus: complete the core 12-stage pipeline, basic polish, and launch—**deferring or removing** enterprise, platform, mobile, advanced AI, and scale features until after product-market fit. Phases marked **DEFER** or **DELETE** are listed for reference but are not in the active roadmap.

---

\#\# Overview

This document outlines the iterative development plan for Aiuteur, progressing from the current frontend skeleton to a fully functional AI-powered film generation platform. Each phase delivers a working product with increasing capability.

\*\*Current State\*\*: Frontend UI skeleton with no backend, no data persistence, no AI integrations.

\*\*Target State\*\*: Full 12-stage pipeline with AI generation, cost management, and production-ready video output (MP4). Version control = basic branch switching only; no enterprise, marketplace, mobile, or advanced AI in MVP.

\---

\#\# Phase 0: **DONE** Setup & Foundation (Barebones Functioning System) **DONE**

\*\*Goal\*\*: Establish minimal infrastructure to support basic data flow and state persistence. No AI integrations yet—focus on making the skeleton "live" with mock data that persists.

\#\#\# Feature 0.1: Backend API Foundation  
\*\*Purpose\*\*: Create minimal REST API structure for frontend communication  
\- \[ \] Set up Fly.io deployment configuration and environment  
\- \[ \] Create Express.js server with CORS and basic middleware  
\- \[ \] Implement health check endpoint (\`/api/health\`)  
\- \[ \] Add error handling middleware  
\- \[ \] Configure environment variables for API keys (placeholder values)

\#\#\# Feature 0.2: Database Schema Implementation  
\*\*Purpose\*\*: Establish data persistence layer  
\- \[ \] Set up Supabase project and configure connection  
\- \[ \] Implement \`projects\` table with RLS policies  
\- \[ \] Implement \`branches\` table with foreign key to projects  
\- \[ \] Create initial migration scripts  
\- \[ \] Test database connection from backend API

\#\#\# Feature 0.3: Authentication System  
\*\*Purpose\*\*: Enable user-specific project management  
\- \[ \] Integrate Supabase Auth in frontend  
\- \[ \] Create login/signup UI components  
\- \[ \] Implement protected route middleware  
\- \[ \] Add authentication state management in Zustand  
\- \[ \] Test user session persistence

\#\#\# Feature 0.4: Project CRUD Operations  
\*\*Purpose\*\*: Enable basic project lifecycle management  
\- \[ \] Implement POST \`/api/projects\` (create project)  
\- \[ \] Implement GET \`/api/projects/:id\` (fetch project)  
\- \[ \] Implement GET \`/api/projects\` (list user projects)  
\- \[ \] Connect frontend Dashboard to real API calls  
\- \[ \] Replace mock project data with database queries

\#\#\# Feature 0.5: State Persistence Hookup  
\*\*Purpose\*\*: Make pipeline state survive page refreshes  
\- \[ \] Implement \`stage\_states\` table with JSONB content field  
\- \[ \] Create API endpoint POST \`/api/projects/:id/stages/:stageNumber\`  
\- \[ \] Add auto-save functionality in pipeline components  
\- \[ \] Implement state hydration on page load  
\- \[ \] Test stage progression and data persistence

\*\*Deliverable\*\*: Users can create projects, navigate pipeline stages, and see their work persist across sessions. No AI generation yet—all content is manually entered or uses placeholder text.

\---

\#\# **DONE** Phase 1: MVP \- Stage 1-4 Text Pipeline (Minimal Viable Product) **DONE**

\*\*Goal\*\*: Deliver core narrative creation pipeline (Phase A: Stages 1-4) with real LLM integration. Users can input a story idea and get a structured script output.

### Feature 1.1 : LLM Service Integration & Observability
**Purpose**: Connect to text generation AI services with full debugging visibility
- [ ] Set up LangSmith project and API keys
- [ ] Set up Gemini/OpenAI/Anthropic client wrapped with LangSmith tracer
- [ ] Create `llm-client.ts` service with retry logic
- [ ] Implement prompt template system (database-stored)
- [ ] Add token counting and cost estimation utilities
- [ ] Test LLM connectivity and verify trace appearance in LangSmith

\#\#\# Feature 1.2: Stage 1 \- Input Modes (semi-complete)  
\*\*Purpose\*\*: Functional narrative input system  
\- \[ \] Implement file upload component for multi-file staging  
\- \[ \] Add file type validation (text, PDF, screenplay formats)  
\- \[ \] Create project configuration form with validation  
\- \[ \] Store Stage 1 configuration in database  
\- \[ \] Implement mode-specific processing logic

\#\#\# Feature 1.3: Stage 2 \- Treatment Generation (semi-complete)  
\*\*Purpose\*\*: AI-powered prose treatment generation  
\- \[ \] Build prompt template for treatment generation  
\- \[ \] Implement 3-variant generation system  
\- \[ \] Create variation selection UI with side-by-side comparison  
\- \[ \] Add rich text editor with manual editing  
\- \[ \] Implement targeted regeneration (highlight \+ right-click)

\#\#\# Feature 1.4: Stage 3 \- Beat Sheet Editor (semi-complete)  
\*\*Purpose\*\*: Interactive structural editing  
\- \[ \] Implement drag-and-drop beat reordering with @dnd-kit  
\- \[ \] Create beat extraction LLM agent  
\- \[ \] Add inline beat editing with auto-save  
\- \[ \] Implement beat splitting/merging actions  
\- \[ \] Add "Confirm Beat Sheet" gatekeeper logic

\#\#\# Feature 1.5: Stage 4 \- Master Script Generator (semi-complete)  
\*\*Purpose\*\*: Generate production-ready screenplay  
\- \[ \] Build verbose script generation prompt template  
\- \[ \] Implement screenplay formatting (INT/EXT, character names, dialogue)  
\- \[ \] Create script editor with industry-standard layout  
\- \[ \] Add scene extraction logic for Phase B  
\- \[ \] Implement "Approve Master Script" checkpoint

\#\#\# Feature 1.6: Stage Progression & Gating  
\*\*Purpose\*\*: Enforce pipeline dependencies and checkpoints  
\- \[ \] Implement stage status state machine (draft/locked/invalidated)  
\- \[ \] Add stage advancement validation logic  
\- \[ \] Fix/Improve visual progress timeline component  
\- \[ \] Implement "lock stage" functionality  
\- \[ \] Add navigation guards for incomplete stages
\- \[ \] Add ability to delete projects


\*\*Deliverable\*\*: Users can input a story idea, iteratively refine it through AI-generated treatments and beat sheets, and receive a formatted master script. This is the first complete value delivery—users get a structured screenplay from a rough idea.

\---

\#\# **DONE** Phase 2: Style Capsule System **DONE**

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

\---

\#\# **DONE** Phase 3: Asset Management & Stage 5 **DONE**

\*\*Goal\*\*: Enable visual asset definition and management. Users can define characters, props, and locations with generated image references.

\#\#\# Feature 3.1: Image Generation Service  
\*\*Purpose\*\*: Integrate Nano Banana for asset image keys  
\- \[ \] Set up Nano Banana API client  
\- \[ \] Implement image generation request/response handling  
\- \[ \] Add Supabase Storage integration for image uploads  
\- \[ \] Create image generation queue system  
\- \[ \] Implement error handling and retry logic

\#\#\# Feature 3.2: Global Asset Library  
\*\*Purpose\*\*: Centralized asset management across projects  
\- \[ \] Implement \`global\_assets\` table and API endpoints  
\- \[ \] Create asset creation UI (name, type, description)  
\- \[ \] Build asset gallery/grid view component  
\- \[ \] Add search and filter functionality  
\- \[ \] Implement asset deletion with dependency checking

\#\#\# Feature 3.3: Stage 5 \- Asset Extraction & Definition  
\*\*Purpose\*\*: Parse script and generate visual keys  
\- \[ \] Implement LLM-based asset extraction from Stage 4 script  
\- \[ \] Create asset definition editor UI (description \+ image)  
\- \[ \] Build image key generation workflow  
\- \[ \] Add iterative image regeneration with guidance  
\- \[ \] Implement "Lock Master Asset" gatekeeper

\#\#\# Feature 3.4: Project-Level Assets  
\*\*Purpose\*\*: Project-specific asset instances  
\- \[ \] Implement \`project\_assets\` table  
\- \[ \] Create asset inheritance from global library  
\- \[ \] Add project asset drawer UI component  
\- \[ \] Implement asset promotion (project → global)  
\- \[ \] Build asset versioning system

\#\#\# Feature 3.5: Visual Style Lock  
\*\*Purpose\*\*: Enforce consistent visual aesthetic  
\- \[ \] Create visual style selector in Stage 5  
\- \[ \] Implement style lock enforcement in image generation  
\- \[ \] Add style preview component  
\- \[ \] Store locked style in global context  
\- \[ \] Test style consistency across multiple assets

\*\*Deliverable\*\*: Users can extract characters, props, and settings from their script, generate reference images for each, and lock a visual style. This establishes the visual foundation for video generation.

\---

\#\# Phase 4: *DONE* Phase B Foundation \- Scenes & Shots *DONE*

\*\*Goal\*\*: Implement scene-based workflow (Stage 6-7). Users can break down their script into technical shot lists.

\#\#\# Feature 4.1: Scene Extraction & Parsing  
\*\*Purpose\*\*: Convert Master Script into scene database entries  
\- \[ \] Implement \`scenes\` table  
\- \[ \] Build scene extraction logic from Stage 4 script  
\- \[ \] Create scene heading parser (INT/EXT/DAY/NIGHT)  
\- \[ \] Store scene content and metadata  
\- \[ \] Implement scene ordering and numbering

\#\#\# Feature 4.2: Stage 6 \- Script Hub  
\*\*Purpose\*\*: Scene navigation and status tracking  
\- \[ \] Create scene list UI with status indicators  
\- \[ \] Implement scene selection and navigation  
\- \[ \] Build scene overview panel with dependencies (characters, locations, props)  
\- \[ \] Implement fuzzy matching (Levenshtein distance, threshold 0.85) for asset identification  
\- \[ \] Add continuity risk analyzer (advisory)  
\- \[ \] Create "Enter Scene Pipeline" action

\#\#\# Feature 4.3: Stage 7 \- Shot List Generator  
\*\*Purpose\*\*: Break scenes into timed, technical shots  
\- \[ \] Implement \`shots\` table with mandatory fields  
\- \[ \] Build shot extraction LLM agent  
\- \[ \] Create shot table UI (spreadsheet-style)  
\- \[ \] Add shot field editing with auto-save  
\- \[ \] Implement shot splitting/merging logic

\#\#\# Feature 4.4: Rearview Mirror Component  
\*\*Purpose\*\*: Display prior scene end-state for continuity  
\- \[ \] Create collapsible rearview mirror UI component  
\- \[ \] Implement prior scene data fetching  
\- \[ \] Display final action/dialogue from previous scene  
\- \[ \] Add visual frame preview (when available)  
\- \[ \] Integrate into Stage 7-10 interfaces

\#\#\# Feature 4.5: Shot List Validation & Locking  
\*\*Purpose\*\*: Enforce shot list completeness  
\- \[ \] Add field validation (required fields, duration limits)  
\- \[ \] Implement shot coherence checking  
\- \[ \] Create "Lock Shot List" gatekeeper  
\- \[ \] Add warning modal for incomplete shots  
\- \[ \] Store locked shot list in database

\*\*Deliverable\*\*: Users can navigate scenes, break them into detailed shot lists with camera specs and action, and see continuity context from prior scenes. This bridges narrative (Phase A) to production (Phase B).

\---

## Phase 5: Asset Inheritance & Stage 8

\*\*Goal\*\*: Implement stateful asset system. Assets evolve across scenes with condition tracking.

\#\#\# Feature 5.1: Scene Asset Instances  
\*\*Purpose\*\*: Scene-specific asset variations  
\- \[ \] Implement \`scene\_asset\_instances\` table  
\- \[ \] Create asset inheritance logic (Scene N → Scene N+1)  
\- \[ \] Build scene asset state propagation  
\- \[ \] Add asset modification tracking  
\- \[ \] Implement scene-specific image key generation

\#\#\# Feature 5.2: Stage 8 \- Visual Definition UI  
\*\*Purpose\*\*: Define scene starting visual state  
\- \[ \] Create Scene Visual Elements panel  
\- \[ \] Build Visual State Editor with pre-filled descriptions  
\- \[ \] Implement Asset Drawer for global asset access  
\- \[ \] Add drag-and-drop asset assignment  
\- \[ \] Create per-asset image generation workflow (no bulk; one-at-a-time for MVP)

\#\#\# Feature 5.3: Status Metadata Tags  
\*\*Purpose\*\*: Track visual conditions (muddy, bloody, torn)  
\- \[ \] Add status tags field to scene asset instances  
\- \[ \] Create tag UI component (chips/badges)  
\- \[ \] Implement condition carry-forward prompt  
\- \[ \] Build tag persistence logic across scenes  
\- \[ \] Add tag-based search and filtering

\#\#\# Feature 5.4: Asset State Evolution  
\*\*Purpose\*\*: Handle mid-scene visual changes  
\- \[ \] Implement asset state change detection  
\- \[ \] Create asset change logging system  
\- \[ \] Add visual evolution tracking  
\- \[ \] Build asset timeline view  
\- \[ \] Implement state rollback functionality

\*\*Scope\*\*: Feature 5.5 (Bulk Operations / Scene-to-Scene Continuity) **removed** per scope-change—do one-at-a-time for MVP.

\*\*Deliverable\*\*: Assets (characters, props) maintain state across scenes. Users can modify asset appearance for specific scenes and track conditions. Characters can get muddy, clothes can tear; full scene-to-scene continuity tooling deferred post-launch.

\---

## Phase 6: Prompt Engineering & Stage 9

\*\*Goal\*\*: Implement deterministic prompt assembly system. Users can see and edit exact prompts sent to AI models.

\#\#\# Feature 6.1: Prompt Taxonomy Implementation  
\*\*Purpose\*\*: Separate frame, video, and system prompts  
\- \[ \] Implement prompt type enum (frame/video/system)  
\- \[ \] Create prompt template versioning system  
\- \[ \] Build prompt assembly logic per shot  
\- \[ \] Add prompt field validation  
\- \[ \] Store prompt history in database

\#\#\# Feature 6.2: Stage 9 \- Prompt Inspector UI  
\*\*Purpose\*\*: Expose and edit model inputs  
\- \[ \] Create expandable shot card component  
\- \[ \] Build Frame Prompt section (read-only by default)  
\- \[ \] Add Video Prompt section (editable)  
\- \[ \] Implement manual edit toggle  
\- \[ \] Create model compatibility indicator

\#\#\# Feature 6.3: Prompt Assembly Agent  
\*\*Purpose\*\*: Merge shot \+ asset data into formatted prompts  
\- \[ \] Build shot data → frame prompt logic  
\- \[ \] Implement action \+ dialogue → video prompt logic  
\- \[ \] Add Visual Style Capsule injection  
\- \[ \] Create character profile merging  
\- \[ \] Implement prompt sanity checker

\#\#\# Feature 6.4: Veo3 / Sora Prompt Formatting — **DEFER** (unless Sora/Veo access now)  
\*\*Purpose\*\*: Format prompts for video generation API  
\- \[ \] Implement Veo3-specific prompt structure  
\- \[ \] Add visual section formatter  
\- \[ \] Build audio section formatter (dialogue \+ SFX)  
\- \[ \] Create character voice mapping  
\- \[ \] Add timing specification  
*\*\*Scope\*\*: Defer to stretch goal per scope-change unless you have immediate Sora/Veo access.*

\#\#\# Feature 6.5: Prompt Validation & Preview  
\*\*Purpose\*\*: Catch formatting issues before generation  
\- \[ \] Implement prompt length validation  
\- \[ \] Add forbidden character checking  
\- \[ \] Create prompt preview component  
\- \[ \] Build prompt comparison tool (variant A vs B)  
\- \[ \] Implement prompt testing interface

\*\*Deliverable\*\*: Users can see exactly what prompts will be sent to AI models, edit them for fine control, and validate they meet API requirements. This transparency enables debugging and refinement.

\---

## Phase 7: Frame Generation & Stage 10

\*\*Goal\*\*: Implement anchor frame generation with continuity checking. Users generate start/end frames to constrain video output.

\#\#\# Feature 7.1: Frame Generation Service  
\*\*Purpose\*\*: Integrate Nano Banana for frame generation  
\- \[ \] Implement \`frames\` table  
\- \[ \] Create frame generation API endpoint  
\- \[ \] Add prior frame seeding logic  
\- \[ \] Build frame storage in Supabase  
\- \[ \] Implement frame approval workflow

\#\#\# Feature 7.2: Generation Mode Selection  
\*\*Purpose\*\*: Speed vs cost optimization  
\- \[ \] Create mode selector UI (Quick/Control)  
\- \[ \] Implement Quick Mode (bulk generation)  
\- \[ \] Build Control Mode (sequential approval)  
\- \[ \] Add cost estimation for each mode  
\- \[ \] Store mode preference in user settings

\#\#\# Feature 7.3: Stage 10 \- Frame Generation UI  
\*\*Purpose\*\*: Generate and review anchor frames  
\- \[ \] Create shot frame panel with status indicators  
\- \[ \] Build visual rearview mirror with comparison  
\- \[ \] Implement bulk generation workflow (Quick Mode)  
\- \[ \] Add step-by-step workflow (Control Mode)  
\- \[ \] Create frame approval interface

\#\#\# Feature 7.4: Continuity Validation  
\*\*Purpose\*\*: Detect and fix visual inconsistencies  
\- \[ \] Implement frame dependency manager  
\- \[ \] Build continuity drift detector  
\- \[ \] Create visual diff component (ghost/flicker)  
\- \[ \] Add automatic flagging of continuity breaks  
\- \[ \] Implement region-level inpainting for fixes

\#\#\# Feature 7.5: Frame Iteration & Refinement  
\*\*Purpose\*\*: Enable targeted frame regeneration  
\- \[ \] Add frame regeneration with guidance  
\- \[ \] Implement localized inpainting interface  
\- \[ \] Create frame history tracking  
\- \[ \] Build frame comparison view  
\- \[ \] Add frame version rollback

\*\*Deliverable\*\*: Users generate image frames that anchor video generation, with tools to ensure continuity between shots. The system catches visual drift and provides localized fixing tools.

\---

\#\# Phase 8: Cost Management & Stage 11

\*\*Goal\*\*: Implement transparent cost tracking and gating. Users see costs before expensive operations and can make informed decisions.

### Feature 8.1: Cost Calculation Engine  
\*\*Purpose\*\*: Accurate credit estimation across operations  
\- \[ \] Create cost model database (per operation type)  
\- \[ \] Implement cost calculation utilities  
\- \[ \] Add per-shot cost estimation  
\- \[ \] Build scene-level cost aggregation  
\- \[ \] Create project-level cost tracking

\#\#\# Feature 8.2: Stage 11 \- Confirmation Gateway  
\*\*Purpose\*\*: Final checkpoint before video generation  
\- \[ \] Create scene summary view (all shots \+ frames)  
\- \[ \] Build cost breakdown display  
\- \[ \] Implement dependency warning system  
\- \[ \] Add prompt snapshot preview  
\- \[ \] Create "Confirm & Render" action

\#\#\# Feature 8.3: Cost Tracking & History  
\*\*Purpose\*\*: Monitor spending across project lifecycle  
\- \[ \] Implement cost logging in database  
\- \[ \] Create cost history view  
\- \[ \] Build per-user credit balance system  
\- \[ \] Add low-credit warnings  
\- \[ \] Implement cost analytics dashboard

\#\#\# Feature 8.4: Credit Purchase System  
\*\*Purpose\*\*: Enable users to buy generation credits  
\- \[ \] Integrate payment processor (Stripe/similar)  
\- \[ \] Create credit package selection UI  
\- \[ \] Implement purchase flow  
\- \[ \] Add receipt generation  
\- \[ \] Build credit balance updates

\#\#\# Feature 8.5: Cost Optimization Recommendations  
\*\*Purpose\*\*: Help users reduce unnecessary spending  
\- \[ \] Implement cost-saving suggestion engine  
\- \[ \] Add "cheapest path" analyzer  
\- \[ \] Create bulk operation pricing  
\- \[ \] Build cost comparison tool (mode A vs B)  
\- \[ \] Implement smart regeneration recommendations

\*\*Deliverable\*\*: Users see transparent cost breakdowns before expensive operations, can purchase credits, and receive recommendations to optimize spending. This builds trust and prevents surprise charges.

\---

\#\# Phase 9: Video Generation & Stage 12

\*\*Goal\*\*: Implement video generation pipeline. Users can render final videos and review output.

\#\#\# Feature 9.1: Veo3 Video Service  
\*\*Purpose\*\*: Integrate Google Veo3 for video generation  
\- \[ \] Set up Veo3 API client  
\- \[ \] Implement \`videos\` table  
\- \[ \] Create video generation request handling  
\- \[ \] Add webhook for generation completion  
\- \[ \] Build video storage in Supabase

\#\#\# Feature 9.2: Asynchronous Job System  
\*\*Purpose\*\*: Handle long-running video generation  
\- \[ \] Implement job queue (Bull/similar)  
\- \[ \] Create background worker process  
\- \[ \] Add job status tracking  
\- \[ \] Build retry logic for failed jobs  
\- \[ \] Implement job cancellation

\#\#\# Feature 9.3: Stage 12 \- Video Review UI (simplified per scope)  
\*\*Purpose\*\*: Basic playback and approve/reject only—defer advanced editing  
\- \[ \] Create basic video player (play/pause/scrub)  
\- \[ \] Add approve/reject controls only  
\- \[ \] Implement full-scene assembly preview  
\- \[ \] *Defer: timeline markers, issue classification, advanced editing*

\#\#\# Feature 9.4: Notification System  
\*\*Purpose\*\*: Alert users when renders complete  
\- \[ \] Implement in-app toast notifications  
\- \[ \] *Defer: email notifications, preferences, history*

\#\#\# Feature 9.5: Export & Iteration (simplified per scope)  
\*\*Purpose\*\*: Single-format export (MP4 only) and basic re-entry  
\- \[ \] Implement MP4 export only (defer WebM, ProRes, etc.)  
\- \[ \] Add basic "Return to Stage X" for fixes  
\- \[ \] *Defer: failure attribution agent, full iteration routing*

\*\*Deliverable\*\*: Users can generate final videos, get in-app notifications when complete, review with basic approve/reject, and export as MP4. This completes the core production pipeline.

\---

\#\# Phase 10: Version Control & Branching — **SIMPLIFIED** (per scope-change)

\*\*Goal\*\*: Basic branch switching only. No Artifact Vault, Visual Diff, Conflict Resolution, or Rollback UI for MVP.

\#\#\# Feature 10.1: Basic Branch Switching UI (MVP only)  
\*\*Purpose\*\*: Switch between branches and create new ones  
\- \[ \] Add dropdown (or equivalent) to switch between existing branches  
\- \[ \] Add "Create new branch" action  
\- \[ \] Use existing \`branches\` table and creation logic  
\- \[ \] *Defer: tree visualization, artifact vault, invalidation logic, conflict resolution, visual diff, rollback UI*

\*\*Scope\*\*: Per scope-change—"Just add a dropdown in UI to switch between branches and create new ones. That's it." Features 10.2–10.5 (Artifact Vault, Version History UI, Conflict Resolution, Invalidation Logic) **deferred** to post-launch.

\*\*Deliverable\*\*: Users can switch branches and create new ones from the UI. Advanced version control (visual diff, conflict resolution, artifact vault) deferred.

\---

\#\# Phase 11: UI/UX Polish — **SIMPLIFIED** (per scope-change)

\*\*Goal\*\*: Basic loading states, error handling, and keyboard shortcuts only. No animations/transitions, onboarding, help system, or mobile-specific polish for MVP.

\#\#\# Feature 11.1: Basic Loading States & Error Handling  
\*\*Purpose\*\*: Reliable feedback during async operations  
\- \[ \] Add loading states for key actions (save, regenerate, generate)  
\- \[ \] Implement clear error handling and user-visible error messages  
\- \[ \] Add basic progress indication where appropriate  
\- \[ \] *Defer: Framer Motion, micro-interactions, page transitions*

\#\#\# Feature 11.2: Keyboard Shortcuts  
\*\*Purpose\*\*: Power user efficiency for common actions  
\- \[ \] Implement keyboard shortcut system  
\- \[ \] Add stage navigation shortcuts  
\- \[ \] Create action shortcuts (save, regenerate, etc.)  
\- \[ \] *Defer: shortcut help modal, customizable key bindings*

\*\*Scope\*\*: Per scope-change—Animation/Transitions, Onboarding, Advanced Editing, Mobile Responsiveness **deferred**. Keep only loading states, error handling, keyboard shortcuts.

\*\*Deliverable\*\*: Basic polish: loading states, error handling, and keyboard shortcuts for common actions. Advanced UX (onboarding, animations, help system, mobile) deferred.

\---

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

\---

\#\# Phase 13: Performance Optimization — **DEFER (partial)** per scope-change

\*\*Goal\*\*: Keep only basic database indexes. Defer all other optimization until you have performance problems.

\#\#\# Feature 13.1: Database Optimization (MVP only)  
\*\*Purpose\*\*: Basic indexes for hot queries  
\- \[ \] Add database indexes for hot queries (projects, branches, stage_states, key FKs)  
\- \[ \] *Defer: frontend code splitting, Redis/caching, CDN, job optimization, read replicas*

\*\*Scope\*\*: Per scope-change—"Keep Feature 13.1 (Database Optimization) - Basic indexes only. Defer all others until you have performance problems."

\*\*Deliverable\*\*: Critical queries indexed. Broader performance work deferred until needed.

\---

\#\# Phase 14: Monitoring & Observability — **SIMPLIFIED** (per scope-change)

\*\*Goal\*\*: Error tracking with Sentry only. Defer APM, LangSmith, cost analytics, user analytics, audit logging.

\#\#\# Feature 14.1: Error Tracking (Sentry)  
\*\*Purpose\*\*: Catch and track production errors  
\- \[ \] Integrate Sentry (or similar) for frontend and backend  
\- \[ \] Ensure health check endpoints exist  
\- \[ \] *Defer: APM, LangSmith regression testing, cost analytics, user analytics, audit logging*

\*\*Scope\*\*: Per scope-change—"Just add Sentry. Done." Features 14.2–14.5 deferred.

\*\*Deliverable\*\*: Crashes and errors reported to Sentry. Broader observability deferred.

\---

\#\# Phase 27: Legal & Compliance — **SIMPLIFIED** (per scope-change)

\*\*Goal\*\*: Terms of Service and Privacy Policy pages only (templates). Defer GDPR, copyright, content moderation, age verification.

\#\#\# Feature 27.1: Terms of Service  
\*\*Purpose\*\*: Legal agreement for use of platform  
\- \[ \] Add Terms of Service page (use template; ~1 hour)  
\- \[ \] Link from footer/signup

\#\#\# Feature 27.2: Privacy Policy  
\*\*Purpose\*\*: Data handling disclosure  
\- \[ \] Add Privacy Policy page (use template; ~1 hour)  
\- \[ \] Link from footer/signup

\*\*Scope\*\*: Per scope-change—Keep 27.1 (Terms), 27.2 (Privacy) only. Defer 27.3–27.5 (GDPR, Copyright, Content Moderation, Age Verification) until EU users or problematic content.

\*\*Deliverable\*\*: Terms and Privacy pages for launch. Broader compliance deferred.

\---

\#\# Phase 28: Testing & Quality Assurance (MVP scope)

\*\*Goal\*\*: Basic unit tests for critical functions only. Full testing plan deferred—see *Deferred For Later Post-MVP Development*.

\#\#\# Feature 28.1: Basic Unit Tests (MVP only)  
\*\*Purpose\*\*: Test critical functions only  
\- \[ \] Write unit tests for critical functions (prompt assembly, cost calc, key services)  
\- \[ \] *Full testing plan (integration, E2E, performance, security) deferred—see Deferred section.*

\*\*Deliverable\*\*: Critical functions covered by unit tests. Expand when stable.

\---

\#\# Phase 29: Documentation & Developer Experience (MVP scope)

\*\*Goal\*\*: Basic README with setup instructions and simple one-page user guide. Full documentation plan deferred—see *Deferred For Later Post-MVP Development*.

\#\#\# Feature 29.1: Basic README & User Guide (MVP only)  
\*\*Purpose\*\*: Setup and one-page user guide  
\- \[ \] README with setup instructions (frontend + backend)  
\- \[ \] Simple one-page user guide (how to run pipeline)  
\- \[ \] *Full documentation (API docs, developer docs, video tutorials, knowledge base) deferred—see Deferred section.*

\*\*Deliverable\*\*: README and one-page user guide. Expand when users exist.

\---

\#\# Summary & Revised Roadmap (per scope-change-post-4.md)

This task list has been **narrowed** for solo-developer focus. Deleted phases (15–20, 23, 25, 30) have been removed; deferred phases (21, 22, 24, 26, plus full scope of 28–29) are in **Deferred For Later Post-MVP Development** at the end. Only the items below are in the active roadmap.

---

### **MUST DO** (Complete Product) — ~2–3 months

- **Phase 5**: Asset Inheritance & Stage 8 *(Feature 5.5 removed)*  
- **Phase 6**: Prompt Engineering & Stage 9 *(Feature 6.4 Sora/Veo deferred)*  
- **Phase 7**: Frame Generation & Stage 10  
- **Phase 8**: Cost Management & Stage 11  
- **Phase 9**: Video Generation & Stage 12 *(simplified: basic approve/reject, MP4 export)*  

---

### **SHOULD DO** (Polish for Launch) — ~2 weeks

- **Phase 10**: Basic branch switching UI only *(dropdown to switch/create branches)*  
- **Phase 11**: Basic error handling & loading states, keyboard shortcuts  
- **Phase 14**: Error tracking with Sentry only  
- **Phase 27**: Terms of Service & Privacy Policy pages (templates)  

---

### **NICE TO HAVE** (Post-Launch)

- Phase 12: Expand export (NLE, asset packages) when users ask  
- Phase 13: Performance optimization when you have performance problems  
- Phase 28: Expand test coverage when stable  
- Phase 29: Better documentation when users exist  

\*\*Deferred work\*\*: Phases and features deferred per scope-change are collected in **Deferred For Later Post-MVP Development** at the end of this document.

---

\*\*Estimated Timeline\*\*: **~4 months** to working product + shippable (vs. 18–24 months for full original plan)

\*\*Critical Path\*\*: Phases 0–9 (core 12-stage pipeline) + basic branch UI, error handling, Sentry, Terms/Privacy.

\*\*Goal\*\*: Ship the core product. Get users. Learn. Iterate. Don't build 30 phases of features no one asked for.

---

\#\# Deferred For Later Post-MVP Development

The following phases and features were deferred per \`scope-change-post-4.md\`. They are listed here for reference when planning post-launch work.

---

\#\#\# Phase 21: Advanced Continuity & Quality Control (Deferred)

\*\*Goal\*\*: Implement sophisticated continuity checking and quality assurance tools.

\#\#\#\# Feature 21.1: AI-Powered Continuity Analysis  
\*\*Purpose\*\*: Automated detection of continuity errors  
\- \[ \] Implement visual consistency scoring  
\- \[ \] Create character appearance tracking  
\- \[ \] Build prop position validation  
\- \[ \] Add lighting consistency checking  
\- \[ \] Implement automated flagging system

\#\#\#\# Feature 21.2: Quality Scoring System  
\*\*Purpose\*\*: Evaluate generation quality automatically  
\- \[ \] Create image quality metrics (sharpness, artifacts)  
\- \[ \] Implement video quality scoring  
\- \[ \] Build dialogue clarity detection  
\- \[ \] Add automated retake suggestions  
\- \[ \] Create quality threshold alerts

\#\#\#\# Feature 21.3: Smart Regeneration  
\*\*Purpose\*\*: Targeted regeneration based on quality issues  
\- \[ \] Implement issue-to-parameter mapping  
\- \[ \] Create automatic prompt adjustment  
\- \[ \] Build progressive refinement system  
\- \[ \] Add smart retry with variation  
\- \[ \] Implement convergence detection

\#\#\#\# Feature 21.4: Scene Preview System  
\*\*Purpose\*\*: Fast preview rendering for iteration  
\- \[ \] Implement low-res preview generation  
\- \[ \] Create animatic-style scene preview  
\- \[ \] Build quick frame interpolation  
\- \[ \] Add preview-to-final upgrade  
\- \[ \] Implement preview caching

\#\#\#\# Feature 21.5: Automated QA Pipeline  
\*\*Purpose\*\*: Systematic quality checks before approval  
\- \[ \] Create pre-flight check system  
\- \[ \] Implement automated validation rules  
\- \[ \] Build quality gate configuration  
\- \[ \] Add QA report generation  
\- \[ \] Create exception approval workflow

\*\*Deliverable\*\*: Sophisticated quality control systems automatically detect issues, suggest fixes, and ensure high-quality output before expensive generation operations.

---

\#\#\# Phase 22: Enhanced User Experience (Deferred)

\*\*Goal\*\*: Refine and enhance user interface based on feedback and usage patterns.

\#\#\#\# Feature 22.1: Customizable Workspace  
\*\*Purpose\*\*: Personalized UI layout  
\- \[ \] Implement drag-and-drop dashboard layout  
\- \[ \] Create customizable sidebar  
\- \[ \] Add panel resizing and docking  
\- \[ \] Build workspace presets (Director, Writer, etc.)  
\- \[ \] Implement workspace sync across devices

\#\#\#\# Feature 22.2: Advanced Search & Navigation  
\*\*Purpose\*\*: Quick access to content across large projects  
\- \[ \] Implement full-text search across all content  
\- \[ \] Create fuzzy search with relevance ranking  
\- \[ \] Build search filters and facets  
\- \[ \] Add recent items and favorites  
\- \[ \] Implement keyboard-driven navigation

\#\#\#\# Feature 22.3: Smart Suggestions  
\*\*Purpose\*\*: AI-powered workflow assistance  
\- \[ \] Implement context-aware suggestions  
\- \[ \] Create next-action recommendations  
\- \[ \] Build smart template suggestions  
\- \[ \] Add workflow optimization tips  
\- \[ \] Implement learning from user behavior

\#\#\#\# Feature 22.4: Rich Media Preview  
\*\*Purpose\*\*: Enhanced content preview capabilities  
\- \[ \] Create inline video player with scrubbing  
\- \[ \] Implement image comparison sliders  
\- \[ \] Build script reader view with audio  
\- \[ \] Add storyboard visualization  
\- \[ \] Create timeline overview with thumbnails

\#\#\#\# Feature 22.5: Accessibility Improvements  
\*\*Purpose\*\*: Make application accessible to all users  
\- \[ \] Implement WCAG 2.1 AA compliance  
\- \[ \] Add screen reader support  
\- \[ \] Create keyboard navigation for all features  
\- \[ \] Build high-contrast theme  
\- \[ \] Implement text-to-speech for scripts

\*\*Deliverable\*\*: A highly customizable, accessible interface with intelligent suggestions and powerful search capabilities that adapt to user preferences and working styles.

---

\#\#\# Phase 24: Analytics & Insights (Deferred)

\*\*Goal\*\*: Provide users with insights into their creative process and project metrics.

\#\#\#\# Feature 24.1: Project Analytics Dashboard  
\*\*Purpose\*\*: Visualize project progress and metrics  
\- \[ \] Create project statistics overview  
\- \[ \] Build timeline visualization  
\- \[ \] Implement cost breakdown charts  
\- \[ \] Add stage completion metrics  
\- \[ \] Create productivity analytics

\#\#\#\# Feature 24.2: Creative Insights  
\*\*Purpose\*\*: Analyze creative patterns and trends  
\- \[ \] Implement genre/tone analysis  
\- \[ \] Create character development tracking  
\- \[ \] Build narrative structure visualization  
\- \[ \] Add pacing analysis  
\- \[ \] Implement dialogue analytics

\#\#\#\# Feature 24.3: Performance Metrics  
\*\*Purpose\*\*: Track generation performance and efficiency  
\- \[ \] Create generation success rate tracking  
\- \[ \] Build quality score trends  
\- \[ \] Implement regeneration frequency analysis  
\- \[ \] Add time-to-completion metrics  
\- \[ \] Create efficiency recommendations

\#\#\#\# Feature 24.4: Comparative Analytics  
\*\*Purpose\*\*: Compare projects and identify best practices  
\- \[ \] Implement cross-project comparison  
\- \[ \] Create benchmark metrics  
\- \[ \] Build best practice identification  
\- \[ \] Add template effectiveness analysis  
\- \[ \] Implement A/B test results

\#\#\#\# Feature 24.5: Export & Reporting  
\*\*Purpose\*\*: Generate reports for stakeholders  
\- \[ \] Create custom report builder  
\- \[ \] Implement PDF report generation  
\- \[ \] Add scheduled report delivery  
\- \[ \] Build shareable dashboard links  
\- \[ \] Create presentation mode

\*\*Deliverable\*\*: Comprehensive analytics providing insights into creative process, project efficiency, costs, and patterns that help users improve their workflow.

---

\#\#\# Phase 26: Localization & Internationalization (Deferred)

\*\*Goal\*\*: Make application accessible to global users in multiple languages and regions.

\#\#\#\# Feature 26.1: Multi-Language Support  
\*\*Purpose\*\*: Translate application interface  
\- \[ \] Implement i18n framework (react-i18next)  
\- \[ \] Extract all UI strings to translation files  
\- \[ \] Create translation management system  
\- \[ \] Add language selector UI  
\- \[ \] Implement dynamic language switching

\#\#\#\# Feature 26.2: Content Translation  
\*\*Purpose\*\*: Translate generated content  
\- \[ \] Integrate translation API (Google Translate/DeepL)  
\- \[ \] Add content translation workflow  
\- \[ \] Implement bilingual script editing  
\- \[ \] Create translation memory system  
\- \[ \] Add language-specific Style Capsules

\#\#\#\# Feature 26.3: Regional Adaptations  
\*\*Purpose\*\*: Customize for different markets  
\- \[ \] Implement region-specific content guidelines  
\- \[ \] Create cultural sensitivity checks  
\- \[ \] Add region-specific payment methods  
\- \[ \] Implement local currency support  
\- \[ \] Create region-specific templates

\#\#\#\# Feature 26.4: Multi-Language AI Models  
\*\*Purpose\*\*: Support content generation in multiple languages  
\- \[ \] Integrate multi-language LLMs  
\- \[ \] Implement language-specific prompt templates  
\- \[ \] Create language detection system  
\- \[ \] Add cross-language consistency checking  
\- \[ \] Build language-specific quality metrics

\#\#\#\# Feature 26.5: Localization Management  
\*\*Purpose\*\*: Manage translations at scale  
\- \[ \] Create translator portal  
\- \[ \] Implement translation workflow  
\- \[ \] Build translation quality review  
\- \[ \] Add translation versioning  
\- \[ \] Create localization analytics

\*\*Deliverable\*\*: Fully localized application supporting multiple languages with region-specific adaptations and AI models for global content creation.

---

\#\#\# Phase 28: Testing & Quality Assurance — Full Scope (Deferred)

\*\*Goal\*\*: Implement comprehensive testing infrastructure for reliability and quality.

\#\#\#\# Feature 28.1: Unit Testing Coverage  
\*\*Purpose\*\*: Test individual components and functions  
\- \[ \] Implement Jest/Vitest test framework  
\- \[ \] Create tests for all utility functions  
\- \[ \] Build component unit tests  
\- \[ \] Add service layer tests  
\- \[ \] Achieve 80%+ code coverage

\#\#\#\# Feature 28.2: Integration Testing  
\*\*Purpose\*\*: Test component interactions  
\- \[ \] Create API integration tests  
\- \[ \] Build database integration tests  
\- \[ \] Implement third-party service tests  
\- \[ \] Add workflow integration tests  
\- \[ \] Create test data factories

\#\#\#\# Feature 28.3: End-to-End Testing  
\*\*Purpose\*\*: Test complete user workflows  
\- \[ \] Implement Playwright/Cypress framework  
\- \[ \] Create critical path E2E tests  
\- \[ \] Build multi-stage workflow tests  
\- \[ \] Add visual regression testing  
\- \[ \] Implement cross-browser testing

\#\#\#\# Feature 28.4: Performance Testing  
\*\*Purpose\*\*: Ensure application performance  
\- \[ \] Implement load testing (k6/Artillery)  
\- \[ \] Create stress testing scenarios  
\- \[ \] Build performance benchmarking  
\- \[ \] Add performance regression detection  
\- \[ \] Implement continuous performance monitoring

\#\#\#\# Feature 28.5: Security Testing  
\*\*Purpose\*\*: Identify and fix security vulnerabilities  
\- \[ \] Implement automated security scanning  
\- \[ \] Create penetration testing protocols  
\- \[ \] Build dependency vulnerability checking  
\- \[ \] Add SQL injection testing  
\- \[ \] Implement OWASP Top 10 validation

\*\*Deliverable\*\*: Comprehensive testing infrastructure with high coverage ensuring application reliability, performance, and security.

---

\#\#\# Phase 29: Documentation & Developer Experience — Full Scope (Deferred)

\*\*Goal\*\*: Create comprehensive documentation for users, developers, and API consumers.

\#\#\#\# Feature 29.1: User Documentation  
\*\*Purpose\*\*: Help users understand and use the platform  
\- \[ \] Create comprehensive user guide  
\- \[ \] Build interactive documentation  
\- \[ \] Implement contextual help system  
\- \[ \] Add video tutorials  
\- \[ \] Create FAQ and troubleshooting guides

\#\#\#\# Feature 29.2: API Documentation  
\*\*Purpose\*\*: Enable third-party developers  
\- \[ \] Create OpenAPI/Swagger specifications  
\- \[ \] Build interactive API explorer  
\- \[ \] Implement code examples in multiple languages  
\- \[ \] Add webhook documentation  
\- \[ \] Create API changelog

\#\#\#\# Feature 29.3: Developer Documentation  
\*\*Purpose\*\*: Enable contributions and integrations  
\- \[ \] Create architecture documentation  
\- \[ \] Build component library documentation (Storybook)  
\- \[ \] Implement code contribution guidelines  
\- \[ \] Add setup and development guides  
\- \[ \] Create plugin development documentation

\#\#\#\# Feature 29.4: Content Library  
\*\*Purpose\*\*: Educational resources and best practices  
\- \[ \] Create filmmaking best practices guide  
\- \[ \] Build prompt engineering guide  
\- \[ \] Implement case studies  
\- \[ \] Add workflow templates documentation  
\- \[ \] Create glossary of terms

\#\#\#\# Feature 29.5: Support System  
\*\*Purpose\*\*: Help users when documentation isn't enough  
\- \[ \] Create ticket support system  
\- \[ \] Implement live chat support  
\- \[ \] Build knowledge base  
\- \[ \] Add community support forums  
\- \[ \] Create escalation workflow

\*\*Deliverable\*\*: Comprehensive documentation ecosystem supporting users, developers, and integrators with clear guidance and support systems.
