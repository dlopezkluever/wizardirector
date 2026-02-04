# New Aiuteur MVP Implementation Task List

## Overview

This document outlines the revised development plan for Aiuteur, addressing strategic sequencing concerns and incorporating comprehensive architectural decisions. Each phase delivers working functionality with minimal technical debt while building toward a complete 12-stage AI-powered film generation platform.

**Current State**: See ._docs/development-progress.md (Currently through a rough implementation of stages 1-8 of the pipeline; 9-12 filled with mock data)

**Target State**: Full 12-stage pipeline with real API integrations, optimized data flow, and production-ready video output.

**Development Philosophy**: Feature completion approach - get core functionality working end-to-end, then systematically improve quality and add advanced features.

---

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

### Feature 1.3: Stage 11 - Comprehensive Review & Cost Gateway ✅ **COMPLETE IMPLEMENTATION**

**Purpose**: Final economic and dependency review with comprehensive scene summary

**Database Requirements:**
- Extend cost calculation system for real-time pricing
- Add project-level credit balance tracking

**Core Features:**
- [ ] **Scene Summary Display**: Build comprehensive review interface
  - List all shots with shot IDs and metadata
  - Start/end frame previews for each shot
  - Final prompt snapshots for both frame and video prompts
  - Scene dependency warnings when applicable
- [ ] **Cost Calculation Engine**: Implement transparent cost tracking
  - Per-shot cost breakdown showing individual generation costs
  - Scene total cost calculation (sum of all shots)
  - Running total showing cumulative project costs from previous generations
  - Credit balance display and low-credit warnings
- [ ] **Dependency Analysis**: Show continuity risks and warnings
  - Prior scene end-state compatibility
  - Asset state mismatches
  - Missing frame dependencies
- [ ] **Confirmation Gateway**: "Confirm & Render" action with validation
  - Block progression if insufficient credits
  - Require explicit confirmation for high-cost scenes
  - Queue job for Stage 12 video generation
- [ ] **API Endpoints**:
  - `GET /api/projects/:projectId/scenes/:sceneId/cost-breakdown` - Calculate costs
  - `GET /api/projects/:projectId/credit-balance` - Get user credits
  - `POST /api/projects/:projectId/scenes/:sceneId/confirm-render` - Confirm and queue

### Feature 1.4: Stage 12 - Video Generation with Real Veo3 Integration ✅ **COMPLETE IMPLEMENTATION**

**Purpose**: Generate final videos using real Veo3 API with review and iteration workflow

**Database Requirements:**
- Create `videos` table linked to scenes and shots
- Implement job queue system for async video processing
- Add notification system for completion alerts

**Core Features:**
- [ ] **Veo3 API Integration**: Implement real video generation via Vertex AI
  - Submit confirmed start/end frames and formatted prompts to Veo3
  - Handle async video generation with webhook completion
  - Implement retry logic and error handling
  - Support 8-second shot specifications per pipeline design
- [ ] **Async Job System**: Build background video processing
  - Job queue implementation (Bull/similar)
  - Background worker process for long-running tasks
  - Job status tracking and progress monitoring
  - Email/in-app notifications on completion/failure
- [ ] **Stage 12 UI**: Build video review and iteration interface
  - Timeline-based video player with shot markers
  - Full scene assembly preview (multiple 8-second clips)
  - Issue classification controls (visual continuity, timing, dialogue/audio, narrative)
  - Playback controls (play/pause/scrub)
- [ ] **Iteration Routing**: Implement failure attribution and correction paths
  - Map issues to upstream stages (Stage 8 for visual issues, Stage 7 for narrative issues)
  - "Return to Stage X" actions with issue description capture
  - Success path: "Complete Scene" returns to Script Hub
- [ ] **Notification System**:
  - In-app toast notifications for render completion
  - Email alerts with project/scene context
  - Render re-entry logic (clicking notification drops user into Stage 12 review)
- [ ] **API Endpoints**:
  - `POST /api/projects/:projectId/scenes/:sceneId/generate-video` - Start video generation
  - `GET /api/projects/:projectId/scenes/:sceneId/video-status` - Check generation progress
  - `POST /api/projects/:projectId/scenes/:sceneId/video/:videoId/approve` - Approve video
  - `PUT /api/projects/:projectId/scenes/:sceneId/return-to-stage` - Route back for fixes

### Feature 1.5: End-to-End Pipeline Testing ✅ **COMPLETE IMPLEMENTATION**

**Purpose**: Validate complete pipeline functionality with real APIs

**Core Features:**
- [ ] **Integration Tests**: Build comprehensive test suite
  - Test data flow from Stage 4 → Stage 12
  - Validate asset inheritance across stages
  - Test real API integrations (Gemini + Veo3)
  - Verify cost calculations and credit deductions
- [ ] **Error Handling**: Implement robust error management
  - API failure recovery and retry logic
  - User-friendly error messaging
  - Graceful degradation for service outages
- [ ] **Performance Monitoring**: Add observability
  - LangSmith tracing for all API calls
  - Performance metrics for stage transitions
  - Cost tracking and budget alerts

**Deliverable**: Users can progress from Stage 4 (Master Script) through Stage 12 (Video Review) with real AI-generated frames and videos, proper cost tracking, and comprehensive error handling.

---

## Phase 2: Critical Blockers (Issues Preventing Progression)

**Goal**: Fix blocking issues that prevent smooth pipeline operation. Address critical bugs and UX problems that halt user progress.

### Feature 2.1: Stage 8 Master Asset Influence Bug Fix ✅ **CRITICAL**

**Purpose**: Resolve issue where scene instance images ignore master asset references

**Blocking Issue**: Scene instance generation currently uninfluenced by master asset images, breaking visual consistency

**Core Features:**
- [ ] **Master Asset Reference Fix**: Investigate and repair image generation logic
  - Debug why master asset images aren't influencing scene instance generation
  - Ensure visual style capsules don't override master asset references
  - Test generation with proper asset + style injection
- [ ] **Pre-selected "Use Master Asset As-Is" Checkbox**:
  - Add checkbox to Stage 8 visual state editor (pre-selected by default)
  - When checked, copy master asset image directly to scene instance without generation
  - Allow users to bypass generation entirely for unchanged assets
- [ ] **Master Asset Influence Testing**: Validate fix with controlled test cases
  - Generate scene instances with strong master asset references
  - Verify visual style capsule balance (influence but don't override)
  - Test across different asset types (characters, props, locations)

### Feature 2.2: Asset Generation Carousel System ✅ **CRITICAL UX**

**Purpose**: Allow users to compare and select from multiple generation attempts

**User Problem**: Currently if regeneration produces worse result, user has no way to revert to previous attempt

**Core Features:**
- [ ] **Generation History Storage**: Track multiple generation attempts
  - Store all generated images for each scene asset instance
  - Maintain generation metadata (timestamp, cost, prompt used)
  - Implement cleanup policy for storage management
- [ ] **Carousel UI Component**: Build generation selection interface
  - Display thumbnails of all generation attempts
  - Allow cycling through attempts with arrow controls
  - Show generation metadata on hover/selection
  - "Select This One" action to set as active scene instance image
- [ ] **Database Schema Updates**:
  - Add `scene_asset_generation_attempts` table
  - Link to scene_asset_instances with generation history
  - Track selected attempt vs generation attempts

### Feature 2.3: Master Reference Historical Carousel ✅ **CRITICAL UX**

**Purpose**: Enable users to reference previous scene instances as master references

**User Need**: Scene 4 master reference should default to Scene 3's selected instance, with ability to choose from all previous instances

**Core Features:**
- [ ] **Historical Master Reference Logic**: Build scene-to-scene reference system
  - Default master reference to most recent scene instance image
  - Query previous scenes for selected scene instance images
  - Build chronological reference chain
- [ ] **Historical Carousel UI**: Create master reference selection interface
  - Display current default (most recent scene instance)
  - Arrow controls to cycle through: Master Asset → Scene 1 instance → Scene 2 instance → etc.
  - Clear visual indication of current selection
  - "Use This Reference" confirmation action
- [ ] **Reference Chain Management**: Handle edge cases
  - First scene defaults to Master Asset image
  - Skip scenes without generated instances
  - Handle scene deletion/reordering

### Feature 2.4: Manual Image Upload for Scene Instances ✅ **CRITICAL UX**

**Purpose**: Allow users to upload custom images for scene-specific assets

**Core Features:**
- [ ] **Upload Interface**: Add upload capability to Stage 8
  - File upload component in visual state editor
  - Support standard image formats (PNG, JPG, WebP)
  - Image validation and processing
- [ ] **Upload Processing**: Handle custom image integration
  - Resize/optimize uploaded images
  - Store in Supabase Storage with proper naming
  - Update scene_asset_instances with uploaded image URL
- [ ] **Upload Integration**: Ensure uploaded images work in carousel system
  - Include uploaded images in generation attempts carousel
  - Allow mixing uploaded + generated images
  - Proper metadata tracking for uploads

### Feature 2.5: Stage Opening System Fix ✅ **BLOCKING UX**

**Purpose**: Fix system that automatically skips ahead one stage when opening projects

**Blocking Issue**: Users can't return to their actual current stage, forced to work ahead

**Core Features:**
- [ ] **Stage Detection Logic**: Fix current stage calculation
  - Determine actual current stage based on completion status
  - Handle edge cases (partial completion, locked stages)
  - Respect user's last active stage
- [ ] **URL Navigation Fix**: Ensure proper stage restoration
  - Update ProjectView URL persistence to include exact stage
  - Add localStorage backup for stage position
  - Fix validation logic that forces advancement

### Feature 2.6: Asset Generation Requirement Fix ✅ **BLOCKING PROGRESSION**

**Purpose**: Allow progression without generating every single asset

**Blocking Issue**: Stage 8 currently requires scene instance generation for every asset before proceeding

**Core Features:**
- [ ] **Optional Asset Generation**: Modify Stage 8 gatekeeper logic
  - Allow progression with some assets using master reference only
  - Implement "Generate Later" option for non-critical assets
  - Maintain requirement for critical/primary assets
- [ ] **Smart Asset Prioritization**: Identify which assets require generation
  - Mark primary characters as required
  - Allow secondary props/locations to use master references
  - User override capability for forcing generation

**Deliverable**: Users can progress through the pipeline without hitting blocking issues, with improved asset reference system and generation flexibility.

---

## Phase 3: Data Flow Optimization (Single Extraction + Inheritance)

**Goal**: Implement optimized asset extraction and inheritance systems. Eliminate redundant AI calls and establish clean data flow from Stage 4 through production.

### Feature 3.1: Revolutionary Stage 5 Asset Extraction ✅ **ARCHITECTURE CHANGE**

**Purpose**: Single comprehensive extraction that includes scene-level mapping, eliminating redundant AI calls

**Current Problem**: Assets extracted multiple times (Stage 5, 6, 8) causing inefficiency and inconsistency

**Architectural Alignment**: Stage 4 is "Global Narrative Truth" - Stage 5 should create complete asset manifest from this truth

**Core Features:**
- [ ] **Comprehensive LLM Extraction Service**: Build enhanced asset extraction
  - Parse entire Master Script in one LLM call
  - Extract Master Assets (characters, props, locations) with full descriptions
  - Generate scene-level mapping showing which assets appear in which scenes
  - Return structured data for both global and scene-specific storage
- [ ] **Scene-Level Mapping Implementation**: Populate scenes.dependencies automatically
  - Update dependencies JSONB field: `{characters: string[], locations: string[], props: string[]}`
  - Map asset appearances to scene_number or scene_id
  - Store extractedAt timestamp for cache invalidation
- [ ] **Database Population Logic**: Simultaneous population strategy
  - Populate project_assets table with Master Assets
  - Update scenes.dependencies field for each scene
  - Link assets to scenes via dependency mapping
  - Maintain backward compatibility with existing manual additions
- [ ] **Stage 6/8 Optimization**: Convert to dependency queries
  - Stage 6: Query scenes.dependencies instead of running scene extraction
  - Stage 8: Use dependencies for auto-suggestions instead of AI relevance detection
  - Maintain ability to manually add missing assets (Stage 5 additions, Stage 8 custom assets)
- [ ] **Cache Invalidation Strategy**: Handle Master Script changes
  - Detect when Stage 4 Master Script is modified
  - Invalidate and regenerate asset manifest
  - Update all scene dependencies
  - Maintain manual asset additions

### Feature 3.2: Transparent Background Auto-Injection ✅ **CONSISTENCY ENFORCEMENT**

**Purpose**: Automatically inject "isolated on transparent background" for characters and props during generation

**Implementation Strategy**: Prompt engineering solution with post-processing fallback

**Core Features:**
- [ ] **Automatic Prompt Injection**: Deterministic style injection
  - Modify image generation requests in Stage 5 and Stage 8
  - Auto-inject "isolated on transparent background" for asset_type: 'character' and 'prop'
  - Exclude locations from transparent background injection
  - Apply injection at generation request time (not user-visible)
- [ ] **Post-Processing Implementation**: Background removal safety net
  - Integrate background removal library (Rembg or specialized API)
  - Process characters and props after generation
  - Remove halos and solid color backgrounds
  - Save cleaned images to Supabase Storage
- [ ] **Quality Validation**: Test and iterate transparent background results
  - A/B test prompt engineering vs post-processing
  - Validate across different asset types
  - Adjust injection strategy based on results
- [ ] **Asset Type Logic Table**:
  ```
  Asset Type | Prompt Injection | Background Removal | Purpose
  Character  | Enforced         | Required          | Scene consistency
  Prop       | Enforced         | Required          | Multi-shot interaction
  Location   | Prohibited       | None              | Environmental context
  ```

### Feature 3.3: Advanced Asset Inheritance Chain ✅ **DATA FLOW OPTIMIZATION**

**Purpose**: Build comprehensive asset state tracking and inheritance system

**Core Features:**
- [ ] **Enhanced Scene Asset Instances**: Improve inheritance tracking
  - Strengthen inherited_from_instance_id chain tracking
  - Build asset timeline view showing state evolution
  - Add inheritance validation and repair tools
- [ ] **Asset State Evolution Logic**: Handle mid-scene changes intelligently
  - Detect asset state changes during shot list creation
  - Log visual evolution context from action descriptions
  - Prepare for Stage 10 frame generation consumption
- [ ] **Inheritance Performance**: Optimize asset queries
  - Create efficient queries for asset history chains
  - Implement asset state caching for quick retrieval
  - Build asset dependency graphs for complex projects

### Feature 3.4: Context Manager Enhancement ✅ **GLOBAL/LOCAL OPTIMIZATION**

**Purpose**: Optimize context assembly for LLM calls with proper asset inheritance

**Core Features:**
- [ ] **Enhanced Global Context**: Strengthen Phase A context assembly
  - Include asset manifest from optimized Stage 5 extraction
  - Incorporate visual style locks and constraints
  - Add project-level continuity rules
- [ ] **Optimized Local Context**: Improve Phase B context efficiency
  - Use cached scene dependencies instead of real-time extraction
  - Include relevant asset inheritance chains
  - Add prior scene end-state for continuity
- [ ] **Context Size Management**: Prevent token overflow
  - Implement intelligent context truncation
  - Prioritize recent asset states over distant history
  - Add context size monitoring and alerts

**Deliverable**: Streamlined asset extraction and inheritance system that eliminates redundant AI calls, provides consistent asset states, and enables efficient scene-by-scene production workflow.

---

## Phase 4: Continuity & State Management

**Goal**: Implement robust continuity system and minimal version control. Ensure visual and narrative consistency across scenes with proper state tracking.

### Feature 4.1: End-State Summary Generation ✅ **CONTINUITY FOUNDATION**

**Purpose**: Generate comprehensive scene end-states for cross-scene continuity

**Trigger**: Execute after Stage 10 completion (frame generation)

**Core Features:**
- [ ] **End-State Generation Service**: Build LLM-powered summary generator
  - Analyze final shot action and dialogue
  - Incorporate scene asset final states and status tags
  - Generate natural language summary of scene conclusion
  - Update scenes.end_state_summary field automatically
- [ ] **Rearview Mirror Enhancement**: Improve continuity display
  - Show rich end-state summary instead of empty/mock data
  - Display final frame thumbnail with state context
  - Add visual indicators for significant state changes
- [ ] **Continuity Validation**: Strengthen risk analysis
  - Compare prior end-state to current scene expectations
  - Flag character/location/prop inconsistencies
  - Provide specific continuity warnings with suggestions
- [ ] **Manual Override System**: Handle continuity conflicts
  - Add "Acknowledge and Proceed" option for risky continuity
  - "Mark as Reviewed" status for confirmed continuity breaks
  - Store override reasons in database for audit trail

### Feature 4.2: Minimal Branching & Version Control ✅ **VERSION MANAGEMENT**

**Purpose**: Implement basic version control to prevent accidental work loss

**Scope**: Simple "save as new version" functionality with Story Timelines access

**Core Features:**
- [ ] **Version Creation System**: Build checkpoint functionality
  - "Create New Branch" action at critical decision points
  - Auto-branch for destructive operations (Stage 4 script regeneration)
  - User-initiated branching from any stage
- [ ] **Story Timelines Interface**: Build version access UI
  - Visual branch tree showing project evolution
  - Node display with commit messages and timestamps
  - "Switch to this Version" action for branch navigation
- [ ] **Branch Management**: Basic branch operations
  - Branch naming and description
  - Branch comparison (basic metadata)
  - Branch deletion with safeguards
- [ ] **Data Preservation**: Ensure work protection
  - Prevent accidental overwrites of completed stages
  - Maintain asset generations across branches
  - Preserve cost tracking per branch

### Feature 4.3: Enhanced Continuity Risk Analysis ✅ **SCENE-TO-SCENE CONSISTENCY**

**Purpose**: Strengthen continuity validation using real end-state data

**Core Features:**
- [ ] **Content-Aware Continuity**: Improve risk detection
  - Use actual end-state summaries for comparison
  - Analyze character/prop state changes
  - Detect location consistency issues
  - Flag timeline and logical continuity problems
- [ ] **Visual Continuity Tracking**: Frame-based consistency
  - Compare final frames across scenes for visual drift
  - Track character appearance consistency
  - Monitor prop and location visual evolution
- [ ] **Automated Continuity Warnings**: Proactive issue detection
  - Generate specific warnings with context
  - Suggest corrections for common continuity issues
  - Provide continuity repair recommendations
- [ ] **Continuity Dashboard**: Project-level continuity overview
  - Show continuity status across all scenes
  - Highlight problem areas requiring attention
  - Track continuity resolution progress

### Feature 4.4: Invalidation & Cascade Detection ✅ **COST MANAGEMENT**

**Purpose**: Track cascading changes from upstream stages and prevent wasted credits on outdated content

**Architectural Importance**: Global changes (Phase A: Stages 1-5) can invalidate local work (Phase B: Stages 6-12)

**Core Features:**
- [ ] **Invalidation Logs Table**: Create tracking system for cascade detection
  - Implement `invalidation_logs` table with timestamp and reason tracking
  - Link invalidations to specific stage changes
  - Store affected downstream artifacts
- [ ] **Global Invalidation Logic**: Detect Phase A changes that affect Phase B
  - Master Script changes (Stage 4) invalidate all scene-level work
  - Asset definition changes (Stage 5) invalidate scene instances
  - Beat Sheet changes (Stage 3) trigger partial invalidation
- [ ] **Local Invalidation Logic**: Scene-level change propagation
  - Shot list changes (Stage 7) invalidate frames and videos for that scene
  - Visual state changes (Stage 8) invalidate downstream frames
  - Prompt changes (Stage 9) flag need for regeneration
- [ ] **Continuity Break Detection**: Identify when changes break scene dependencies
  - Detect asset removal that affects downstream scenes
  - Flag character/prop state changes that create inconsistencies
  - Warn when prior scene end-state no longer matches current scene
- [ ] **Cost Estimation for Invalidations**: Calculate regeneration costs
  - Estimate credits needed to regenerate invalidated content
  - Show cost breakdown by stage and scene
  - Provide "regenerate all" vs "selective regenerate" cost comparison
  - Display warning modals before confirming destructive changes
- [ ] **Smart Invalidation UI**: User-friendly invalidation management
  - Visual indicators for invalidated stages (orange/red status)
  - "Review Invalidations" modal showing affected content
  - Batch regeneration options with cost preview
  - Option to proceed with partial invalidation (acknowledge risks)

**Deliverable**: Robust continuity system that tracks scene end-states, provides meaningful continuity warnings, offers basic version control to protect completed work, and prevents costly mistakes through intelligent invalidation tracking.

---

## Phase 5: Quality Improvements & UX Polish

**Goal**: Address remaining issues from Issue-Tickets.md by category. Improve user experience and generation quality without adding new major features.

### Feature 5.1: Blocking Issues Resolution ✅ **REMAINING BLOCKERS**

**Purpose**: Address any remaining issues that prevent pipeline progression

**Issues to Address:**
- [ ] **Asset Generation Requirements**: Fine-tune Stage 8 progression rules
  - Allow progression with master asset references
  - Implement smart default selection
  - Add bulk "Use Master As-Is" options
- [ ] **Script Generation**: Ensure Stage 4 auto-generates when needed
  - Fix cases where Stage 4 fails to trigger
  - Add fallback generation logic
  - Improve script formatting consistency
- [ ] **Stage Pipeline Graphic**: Fix inconsistent status colors
  - Standardize green/yellow status meanings
  - Ensure accurate progress representation
  - Debug status calculation logic

### Feature 5.2: Data Quality Improvements ✅ **GENERATION QUALITY**

**Purpose**: Improve quality of AI-generated content throughout pipeline

**Core Features:**
- [ ] **Asset Description Enhancement**: Implement adaptive descriptions
  - Context-aware asset description generation based on scene/shot requirements
  - Merge master asset descriptions with scene-specific context
  - Example: Persephone (blonde nature princess → dark goth underworld queen)
- [ ] **Writing Quality Enhancement**: Improve dialogue and narrative generation
  - Experiment with prompt techniques for better dialogue
  - Enhance writing style capsule effectiveness
  - Focus style injection on dialogue specifically
- [ ] **Visual Consistency**: Strengthen asset visual consistency
  - Balance master asset influence vs visual style capsule
  - Optimize transparent background results
  - Improve character consistency across scenes
- [ ] **Prompt Engineering Optimization**: Refine system prompts
  - Evaluate effectiveness of current prompts
  - A/B test different prompting strategies
  - Add system prompt evaluation framework

### Feature 5.3: UX Polish ✅ **USER EXPERIENCE**

**Purpose**: Address usability issues that don't block progression but harm user experience

**Core Features:**
- [ ] **Auto-Save Optimization**: Add debouncing to reduce spam
  - Implement smart debouncing for Stages 1-3
  - Reduce excessive save frequency
  - Maintain data integrity with efficient saves
- [ ] **Project Organization**: Add folder system to dashboard
  - Allow projects to be organized in folders
  - Add project search and filtering
  - Show current stage and scene on project cards
- [ ] **Stage 4 Script UI**: Fix screenplay editor issues
  - Improve character and dialogue handling
  - Fix funky formatting issues
  - Enhance screenplay toolbar functionality
- [ ] **Navigation Improvements**: Streamline stage navigation
  - Fix URL persistence issues
  - Improve stage switching responsiveness
- [ ] **Keyboard Shortcuts System**: Power user efficiency features
  - Implement global keyboard shortcut handler
  - Add stage navigation shortcuts (Ctrl+1-12 for stages, Ctrl+Left/Right for prev/next)
  - Create action shortcuts (Ctrl+S save, Ctrl+R regenerate, Ctrl+G generate)
  - Build shortcut help modal (Ctrl+/ or ? key)
  - Add customizable key bindings in user settings
  - Display keyboard hints in tooltips and UI
  - Test cross-platform compatibility (Windows/Mac/Linux)
- [ ] **Asset Drawer Improvements**: Enhance Stage 8 asset management
  - Change "Create Scene Asset" to "Add New Assets" for clarity
  - Improve asset drawer performance with large asset libraries
  - Add asset search and filtering within drawer

### Feature 5.4: Testing Infrastructure ✅ **QUALITY ASSURANCE**

**Purpose**: Add comprehensive testing coverage for reliability

**Core Features:**
- [ ] **Frontend Testing**: Implement React component testing
  - Add React Testing Library tests for critical components
  - Test user interaction flows
  - Add visual regression testing
- [ ] **Integration Testing**: Test complete user journeys
  - End-to-end testing with Playwright/Cypress
  - Test asset inheritance across multiple scenes
  - Validate API integrations with real services
- [ ] **Performance Testing**: Ensure scalability
  - Load testing for asset-heavy projects
  - Performance benchmarks for LLM calls
  - Memory usage optimization
- [ ] **Error Handling**: Improve error resilience
  - Add comprehensive error boundaries
  - Implement graceful degradation
  - Add user-friendly error messages

**Deliverable**: Polished, reliable pipeline with improved generation quality, smooth user experience, and comprehensive testing coverage.

---

## Phase 6: Advanced Features

**Goal**: Add sophisticated features that enhance professional usage. These are nice-to-have features that significantly improve the platform's capabilities.

### Feature 6.1: Full Git-Style Branching ✅ **ADVANCED VERSION CONTROL**

**Purpose**: Implement complete branching system with visual diffs and conflict resolution

**Core Features:**
- [ ] **Visual Diff System**: Build comprehensive comparison tools
  - Side-by-side comparison of script changes
  - Visual asset difference detection
  - Shot list comparison with highlighting
- [ ] **Conflict Resolution**: Handle branching conflicts
  - Merge conflict detection and resolution
  - User choice interface for conflicting changes
  - Automatic conflict resolution where possible
- [ ] **Advanced Branching**: Full git-style operations
  - Branch merging and rebasing
  - Cherry-picking changes across branches
  - Tag system for important versions

### Feature 6.2: Artifact Vault ✅ **COMPREHENSIVE ASSET MANAGEMENT**

**Purpose**: Central repository for all generated content with advanced organization

**Core Features:**
- [ ] **Complete Artifact Storage**: Store all generated content
  - Videos, frames, scripts, shot lists, prompts
  - Branch-grouped organization
  - Advanced search and filtering
- [ ] **Asset Promotion System**: Global asset library enhancement
  - Promote scene instances to global assets
  - Asset versioning and template system
  - Asset sharing between projects
- [ ] **Export Integration**: Professional export capabilities
  - NLE integration (EDL/XML for DaVinci Resolve/Premiere)
  - Asset package export (ZIP with organized files)
  - Audio stems separation for mixing

### Feature 6.3: Advanced Continuity Tools ✅ **PROFESSIONAL CONTINUITY**

**Purpose**: Professional-grade continuity management and validation

**Core Features:**
- [ ] **Visual Continuity Analysis**: Advanced visual consistency
  - Automated character appearance tracking
  - Prop state validation across scenes
  - Location lighting and atmosphere consistency
- [ ] **Timeline Continuity**: Narrative timeline validation
  - Story logic checking
  - Character motivation consistency
  - Plot point validation
- [ ] **Continuity Reports**: Professional continuity documentation
  - Generate continuity reports for review
  - Export continuity notes for production teams
  - Visual continuity reference sheets

### Feature 6.4: Performance Optimization ✅ **SCALABILITY**

**Purpose**: Optimize platform for larger projects and multiple users

**Core Features:**
- [ ] **Caching Strategy**: Implement comprehensive caching
  - Redis integration for session data
  - CDN for asset delivery
  - Intelligent cache invalidation
- [ ] **Lazy Loading**: Code splitting and performance
  - Component-level code splitting
  - Progressive asset loading
  - Optimized image delivery with thumbnails
- [ ] **Background Processing**: Advanced job queuing
  - Distributed job processing
  - Priority queue management
  - Resource allocation optimization

**Deliverable**: Professional-grade platform with advanced versioning, comprehensive asset management, and enterprise-level performance and reliability.

---

## Implementation Notes

### Development Standards
- **Quality Standard**: "Do it as well as possible" - prioritize correct implementation over speed
- **API Integration**: Use real services (Gemini, Veo3) from Phase 1 onward
- **Testing**: Include comprehensive testing at each phase
- **Documentation**: Maintain clear documentation for each feature

### Database Schema Updates
- Each phase may require database migrations
- Maintain backward compatibility where possible
- Plan migrations carefully to avoid data loss
- Use JSONB fields for flexible schema evolution

### Cost Management
- Track API costs for all real integrations
- Implement cost estimation and budgeting
- Add cost optimization recommendations
- Monitor and alert on excessive usage

### Security Considerations
- Implement proper input sanitization
- Add rate limiting for API endpoints
- Secure file upload processing
- Maintain audit trails for user actions

---

## Success Metrics

### Phase 1 Success Criteria
- [ ] Complete end-to-end pipeline functional (Stage 4 → Stage 12)
- [ ] Real API integrations working (Gemini + Veo3)
- [ ] Cost tracking operational
- [ ] Basic error handling implemented

### Phase 2 Success Criteria
- [ ] No blocking issues preventing progression
- [ ] Stage 8 master asset influence working correctly
- [ ] Generation carousel system functional
- [ ] Users can progress through pipeline without major friction

### Phase 3 Success Criteria
- [ ] Single asset extraction implementation working
- [ ] Transparent backgrounds automatically applied
- [ ] Asset inheritance chain functional
- [ ] Significant reduction in redundant AI calls

### Phase 4 Success Criteria
- [ ] End-state summaries automatically generated
- [ ] Basic branching system prevents work loss
- [ ] Continuity system provides meaningful warnings
- [ ] Users feel confident about scene-to-scene consistency

### Phase 5 Success Criteria
- [ ] All critical issues from Issue-Tickets.md resolved
- [ ] Improved generation quality across the pipeline
- [ ] Smooth user experience with minimal friction
- [ ] Comprehensive testing coverage

### Phase 6 Success Criteria
- [ ] Professional-grade features comparable to industry tools
- [ ] Advanced branching and version control
- [ ] Export capabilities for external editing
- [ ] Platform ready for beta users and marketing

---

**Document Version**: 1.0
**Created**: February 4, 2026
**Status**: Phase 1 Ready for Implementation
**Next Review**: After Phase 1 Completion