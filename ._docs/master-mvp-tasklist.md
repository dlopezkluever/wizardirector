# Aiuteur — Master MVP Task List

**Version**: 2.0
**Created**: February 7, 2026
**Status**: Phase 1 Complete, Phases 2–7 Planned
**Supersedes**: `MVP-tasklist-v1.1.md`, `organized-tickets.md`

---

## Overview

**Aiuteur** is an AI-powered narrative-to-film pipeline with a deterministic 12-stage workflow. The application transforms written narratives into professional-quality AI-generated short films through strategic cost optimization and narrative continuity.

**Current State**: Phase 1 complete — rough implementation of Stages 1–12 with real API integrations (Gemini + Veo3). Stages 9–12 are functional but need refinement. Core pipeline connectivity established.

**Target State**: Full 12-stage pipeline with polished UX, optimized data flow, robust continuity, version control, and production-ready video output suitable for beta users.

**Development Philosophy**: Feature completion approach — get core functionality working end-to-end, then systematically fix blockers, improve architecture, add intelligence, and polish. Each phase delivers working functionality with minimal technical debt.

### Architectural Decisions

| Decision | Resolution |
|---|---|
| Master Document stage (ticket 4.2) | **Deferred to post-MVP** — pipeline stays at 12 stages |
| Combine Stage 2 & 3 (ticket 2.4) | **Deferred** — fix bugs, don't merge stages |
| Locking overhaul timing | **Phase 2 (early)** — fix alongside critical bugs |
| Deferred items (inpainting, cost pre-gen, etc.) | **Phase 7** as nice-to-haves |
| Rearview → Content Access Space | **Full build in Phase 4** (production intelligence) |
| Multi-Provider Video (Sora, Runway) | **Veo3-only for MVP** — architecture ready for future |
| Aspect Ratio | **Stage 1 project-level setting** in Phase 3 |
| Extras/Archetypes (5.11) | **Include in MVP** as part of Phase 3 asset overhaul |
| Stage 1 new input modes | **Structured Upload only (1.1)** — defer storyboard upload & template |
| Visual Style Capsule influence | **Fix default balance early** (Phase 2), **add user-facing scale later** (Phase 5) |
| Stage 12 Timeline Player | **Include in MVP** in Phase 4 |
| Stage 8 extras (8.9, 8.12, 8.13) | **All three in MVP** in Phase 3 |
| Multi-angle asset generation (5.8) | **Include in MVP** in Phase 3 |
| Writing/Style evaluation | **Dedicated effort** in Phase 6 quality phase |
| Prompt chaining (9.5/9.3) | **Include in MVP** in Phase 4 production intelligence |
| Capsule fix vs slider | **Fix default balance early (Phase 2), add slider later (Phase 5)** |
| Branching + locking integration | **Locking foundations in Phase 2, full branching in Phase 5** |

---

## Phase 1: Pipeline Connectivity (Stages 9–12) ✅ DONE

**Achievement**: Established end-to-end pipeline functionality with real API integrations. Built Stages 9–12 to completion standard while prioritizing connectivity over perfection.

**Completed Work:**
- [x] Real API integrations working (Gemini for images/LLM, Veo3 for video)
- [x] Stage 9: Prompt generation (image + video prompts per shot)
- [x] Stage 10: Frame generation with start frames
- [x] Stage 11: Video generation with Veo3 provider
- [x] Stage 12: Video review with batch render + issue routing
- [x] Credit tracking and cost deduction operational
- [x] VideoJobExecutor with DB polling, sequential processing
- [x] Mock/Veo3 provider toggle via `VIDEO_PROVIDER` env var

---

## Phase 2: Critical Fixes & Locking Overhaul

**Goal**: Remove ALL friction that prevents users from progressing through the pipeline. Fix bugs, fix locking, fix navigation. After this phase, a user should be able to walk through the entire 12-stage pipeline without hitting a wall.

---

### 2A — Bug Fixes & Navigation

#### 2A.1 — Stage 8 Master Asset Influence Bug Fix + Fix Default Capsule Balance
**Tickets**: 8.2, DC-3, 5.7
**Priority**: CRITICAL

**Purpose**: Resolve the issue where scene instance images ignore master asset references entirely, and visual style capsules dominate generation output.

**Problem/Context**: Scene instance generation in Stage 8 is currently uninfluenced by master asset images. The visual style capsule overrides everything, breaking visual consistency. Additionally, visual capsules appear to have no effect on asset image generation in Stage 5 (ticket 5.7) — the influence is either zero or all-or-nothing with no proper balance. The inheritance chain from Stage 5 → Stage 8 → Stage 9 → Stage 10 is broken somewhere (DC-3).

**Core Features:**
- [ ] Debug why master asset images aren't influencing scene instance generation
- [ ] Rebalance so master reference takes highest priority over style capsule
- [ ] Ensure visual style capsules influence but don't override master references
- [ ] Investigate and fix capsule influence on Stage 5 image generation (ticket 5.7)
- [ ] Test generation with proper asset + style injection across asset types (characters, props, locations)
- [ ] Validate fix with controlled test cases comparing old vs new generation

**Technical Notes**: The root cause is likely in how image generation prompts are assembled — master asset reference URLs may not be passed correctly, or capsule style text may be weighted too heavily in the prompt. Check both the frontend service call and backend prompt assembly.

**Dependencies**: None — can start immediately.

---

#### 2A.2 — *DONE* Stage Opening System Fix *DONE*
**Tickets**: UI-1
**Priority**: BLOCKING UX

**Purpose**: Fix the system that automatically skips ahead one stage when opening projects.

**Problem/Context**: When opening a project, the system skips ahead one stage from where the user left off. Should open to the exact stage the user was last on. Refreshing a project that was on Stage 6 loads Stage 5 instead. Users can't return to their actual current stage and are forced to work ahead.

**Core Features:**
- [ ] Fix current stage detection logic based on completion status
- [ ] Handle edge cases: partial completion, locked stages, production cycle scenes
- [ ] Respect user's last active stage
- [ ] Update ProjectView URL persistence to include exact stage
- [ ] Add localStorage backup for stage position
- [ ] Fix validation logic that incorrectly forces advancement

**Dependencies**: None.

---

#### 2A.3 — Beat Sheet Generation Bug Fix
**Ticket**: 2.3
**Priority**: HIGH

**Purpose**: Fix Stage 3 beat sheet generation that "seems to do nothing."

**Problem/Context**: The generation functionality for the beat sheet "seems to do nothing." A toast message says "3 generation variations" are being made, but nothing appears. Users cannot generate beat sheets, which blocks pipeline progression for non-skip users.

**Core Features:**
- [ ] Investigate why beat sheet generation produces no visible output
- [ ] Check if generations are being created but not displayed (rendering issue)
- [ ] Check if the generation API call is failing silently
- [ ] Fix the generation-to-display pipeline
- [ ] Verify toast messages accurately reflect generation status

**Dependencies**: None.

---

#### 2A.4 — Stage 4 Auto-Generation Fix
**Ticket**: 4.3
**Priority**: HIGH

**Purpose**: Ensure Stage 4 auto-generates the master script on first visit.

**Problem/Context**: Stage 4 currently does not auto-generate when a user visits it for the first time. Users arrive at an empty stage with no script, which is confusing and blocks progression.

**Core Features:**
- [ ] Add auto-generation trigger on first visit to Stage 4
- [ ] Add fallback generation logic if auto-generation fails
- [ ] Detect whether a script already exists before triggering generation
- [ ] Show appropriate loading state during auto-generation

**Dependencies**: None.

---

#### 2A.5 — Stage 4 Script UI Fix
**Ticket**: 4.4
**Priority**: HIGH

**Purpose**: Fix the screenplay editor's broken character and dialogue formatting.

**Problem/Context**: The Stage 4 script UI has "very funky" character and dialogue formatting. The initial implementation clearly isn't working well. Characters and dialogue aren't rendering in proper screenplay format, making the script difficult to read and edit.

**Core Features:**
- [ ] Fix character name formatting in screenplay view
- [ ] Fix dialogue block formatting and indentation
- [ ] Improve screenplay toolbar functionality
- [ ] Ensure consistent screenplay formatting standards

**Dependencies**: None.

---

#### 2A.6 — Skip Option Fix
**Ticket**: 1.2
**Priority**: HIGH

**Purpose**: Fix the "Skip" option that incorrectly feeds into Stage 2 instead of allowing users to jump ahead.

**Problem/Context**: Currently, the skip option incorrectly feeds into Stage 2. It should allow a user who already has a script to skip directly to Stage 4 or beyond. The philosophy: take as much input context as given, refine it down to the Master Script as the source of truth, and from there expand out through the production cycle.

**Core Features:**
- [ ] Fix skip routing to bypass Stages 2-3 when user has a script
- [ ] Allow direct navigation to Stage 4+ for power users
- [ ] Ensure skipped stages are properly marked (not "incomplete")
- [ ] Maintain context flow when stages are skipped

**Dependencies**: None.

---

#### 2A.7 — Stage 5 "Lock All and Proceed" Button Fix
**Ticket**: 5.10
**Priority**: HIGH

**Purpose**: Fix the hidden/broken "Lock All Assets and Proceed" button.

**Problem/Context**: Button is hidden due to poor color contrast between text and footer. Clicking it triggers a "stage 5 complete" toast but fails to actually navigate to Stage 6. Users cannot progress past Stage 5 using this button.

**Core Features:**
- [ ] Fix button visibility (color contrast issue)
- [ ] Fix navigation action to properly transition to Stage 6
- [ ] Ensure all assets are properly locked when button is clicked
- [ ] Add proper loading/transition state

**Dependencies**: None.

---

#### 2A.8 — Stage Pipeline Graphic Color Inconsistency
**Ticket**: UI-5
**Priority**: MEDIUM

**Purpose**: Fix confusing color states in the pipeline progress graphic.

**Problem/Context**: Sometimes stages show green, other times yellow, despite being complete. Not clear what the colors indicate. Users can't tell at a glance where they are in the pipeline.

**Core Features:**
- [ ] Standardize green/yellow/other status color meanings
- [ ] Ensure accurate progress representation across all stages
- [ ] Debug status calculation logic
- [ ] Document color scheme for consistency

**Dependencies**: None.

---

#### 2A.9 — Regeneration Boxes UI Improvements
**Ticket**: UI-7
**Priority**: MEDIUM

**Purpose**: Improve unclear regeneration box functionality.

**Problem/Context**: The regeneration box UI (especially for Stage 4 and the stage pipeline graphic) needs improvement. The functionality and visual presentation are unclear and inconsistent — users don't understand what will happen when they click regenerate.

**Core Features:**
- [ ] Improve regeneration box visual design
- [ ] Add clear labels/descriptions of what regeneration does
- [ ] Ensure consistent regeneration behavior across stages
- [ ] Add confirmation or preview before regeneration

**Dependencies**: None.

---

### 2B — Locking System Overhaul

**Context**: The current locking implementation is "extremely tedious, especially in the production cycle." Users shouldn't have to unlock → relock → get another warning just to navigate across stages. The locking system needs a complete overhaul, but full branching integration is deferred to Phase 5.

#### 2B.1 — Universal Lock/Unlock Button
**Ticket**: LK-2
**Priority**: HIGH

**Purpose**: Standardize the lock/unlock interaction across all stages.

**Problem/Context**: Currently there's no consistent lock/unlock button. Some stages have hidden locking, others have confusing interactions. "Locked" appears as a regular status flag alongside other statuses (ticket 8.1) when it should have different UI treatment.

**Core Features:**
- [ ] Create standard lock/unlock button in consistent position (top right or similar)
- [ ] Make the button consistent across all 12 stages
- [ ] Separate "locked" from regular status flags in the UI
- [ ] Clear visual indication of locked vs unlocked state
- [ ] One-click lock/unlock without warning loops

**Dependencies**: None.

---

#### 2B.2 — State Persistence for Completed Scenes
**Ticket**: LK-3
**Priority**: HIGH

**Purpose**: Stop the system from "forgetting" completed states when navigating between scenes.

**Problem/Context**: When navigating back to completed scenes, the system loses context about completed states. Users are forced to repeatedly unlock and relock shot lists to progress. This is especially painful in the production cycle where users move between scenes frequently.

**Core Features:**
- [ ] Ensure completed scene states persist across navigation
- [ ] Fix state storage/retrieval for production cycle scenes
- [ ] Prevent unnecessary re-locking of already-completed work
- [ ] Add proper scene state caching

**Dependencies**: None.

---

#### 2B.3 — Fix Sequential Locking Errors
**Ticket**: LK-6
**Priority**: HIGH

**Purpose**: Fix the error pattern where locking fails due to upstream stage requirements.

**Problem/Context**: Known error pattern: `"Cannot lock stage 2. Stage 1 must be locked first."` with `requiredStage: 1, requiredStatus: "locked", currentStatus: "draft"`. The sequential locking requirement is too rigid and creates frustrating dead-ends.

**Core Features:**
- [ ] Review and fix sequential locking validation logic
- [ ] Allow reasonable locking order flexibility
- [ ] Provide clear error messages with actionable guidance
- [ ] Auto-resolve simple locking chains where possible

**Dependencies**: None.

---

#### 2B.4 — Reduce Tedium in Production Cycle
**Ticket**: LK-1
**Priority**: HIGH

**Purpose**: Eliminate the unlock → relock → warning loop pattern.

**Problem/Context**: The current implementation requires tedious unlock → relock → warning cycles just to navigate across stages. "Whatever was done with Stage 7's locking sucks and must be fixed." Users waste significant time on locking bureaucracy instead of creative work.

**Core Features:**
- [ ] Remove unnecessary warning dialogs for routine navigation
- [ ] Allow stage-to-stage movement without full unlock/relock cycle
- [ ] Streamline production cycle (Stages 6-12) locking behavior
- [ ] Preserve data protection intent while removing friction

**Dependencies**: None.

---

#### 2B.5 — Deliberate Branching on Post-Lock Edits (Foundations)
**Ticket**: LK-4, LK-5
**Priority**: MEDIUM

**Purpose**: Establish the foundation for branching when users edit locked stages.

**Problem/Context**: Any edits made after a stage is locked should be deliberate, with clear acknowledgment that changes will necessitate regenerating subsequent assets. Full branching integration is deferred to Phase 5 (per LK-5), but the UI acknowledgment flow should be built now.

**Core Features:**
- [ ] Add clear "This will affect downstream work" acknowledgment dialog
- [ ] Track which locked stages have been edited post-lock
- [ ] Log post-lock edit events for future branching integration
- [ ] Provide "proceed with changes" vs "cancel" flow
- [ ] Note: Full branch creation deferred to Phase 5 — this phase only builds the UI flow and logging

**Dependencies**: 2B.1 (Universal Lock/Unlock Button) should be done first.

---

### Phase 2 Success Criteria
- [ ] No blocking issues preventing pipeline progression
- [ ] Stage 8 master asset influence working correctly with proper capsule balance
- [ ] Users can open projects to the correct stage
- [ ] Beat sheet generation works
- [ ] Stage 4 auto-generates and displays proper screenplay formatting
- [ ] Skip option routes correctly
- [ ] Stage 5 → 6 transition works via "Lock All" button
- [ ] Pipeline graphic shows accurate, consistent status colors
- [ ] Locking system is consistent, non-tedious, and doesn't lose state
- [ ] Users can progress through the full pipeline without major friction

---

## Phase 3: Asset System Overhaul

**Goal**: Revolutionize how assets are extracted, managed, and flow through the entire pipeline. This is the foundational architecture change that eliminates redundant AI calls, gives users control over their assets, and establishes clean data flow from Stage 5 through production.

---

### 3A — Stage 5 Extraction Revolution

#### 3A.1 — Two-Pass Asset Extraction with Filter Modal
**Tickets**: 5.3, multi-stage extraction optimization
**Priority**: ARCHITECTURE CHANGE

**Purpose**: Single comprehensive extraction that includes scene-level mapping, with a cost-saving filter step that lets users deselect unneeded assets before expensive generation.

**Problem/Context**: Assets are currently extracted multiple times (Stage 5, 6, 8) causing inefficiency, inconsistency, and unnecessary cost. Stage 4 is "Global Narrative Truth" — Stage 5 should create a complete asset manifest from this truth in one operation.

**Core Features:**
- [ ] **Pass 1 — Extract Preview** (`POST /extract-preview`):
  - Parse entire Master Script in one LLM call
  - Return entity names + types + scene mentions (cheap operation)
  - Group under Characters / Locations / Props
- [ ] **Filter Modal UI**:
  - Grouped checklist (Characters, Locations, Props sections)
  - Checkbox per asset (all selected by default)
  - "Select All / None" per category
  - Asset count display
  - "Confirm Selection (X assets)" button
  - Purpose: primarily for REMOVING assets the user doesn't care about
- [ ] **Pass 2 — Extract Confirm** (`POST /extract-confirm`):
  - Takes selected asset IDs from filter modal
  - Runs description generation + image generation ONLY for selected assets
  - Saves $$$ by skipping LLM calls for deselected assets
- [ ] **Scene-Level Mapping**:
  - Populate `scenes.dependencies` JSONB: `{characters: string[], locations: string[], props: string[]}`
  - Map asset appearances to scene_number or scene_id automatically
  - Store `extractedAt` timestamp for cache invalidation
- [ ] **Stage 6/8 Optimization**:
  - Stage 6: Query `scenes.dependencies` instead of running scene extraction
  - Stage 8: Use dependencies for auto-suggestions instead of AI relevance detection
  - Maintain ability to manually add missing assets

**Technical Notes**: Split the existing extraction endpoint into two. Pass 1 should be fast and cheap (entity recognition only). Pass 2 is the expensive operation (descriptions + images). Cache invalidation: detect when Stage 4 Master Script is modified → invalidate and regenerate manifest → update all scene dependencies → maintain manual additions.

**Dependencies**: Phase 2 bugs fixed (especially Stage 5 Lock All button — 2A.7).

---

#### 3A.2 — Sidelined Assets System
**Ticket**: 5.4
**Priority**: HIGH

**Purpose**: Make asset removal non-destructive — "sidelined" not deleted.

**Problem/Context**: Removing an asset in Stage 5 currently deletes it, which is dangerous. Sidelined assets should be hidden from the Stage 5 workflow but maintained in the database with their scene info preserved. They remain available for use in later stages (Stage 8, 10) where the LLM generates them on-the-fly from script context. Users should be able to retrieve sidelined assets if they change their mind.

**Core Features:**
- [ ] Add `sidelined` boolean flag to assets (or status field)
- [ ] Hide sidelined assets from Stage 5 active workflow
- [ ] Preserve all scene info and metadata for sidelined assets
- [ ] "Restore" action to bring sidelined assets back
- [ ] Allow Stage 8/10 to access sidelined asset data for context

**Dependencies**: 3A.1 (filter modal provides the primary UI for sidelining).

---

#### 3A.3 — Manual Asset Addition
**Ticket**: 5.5
**Priority**: HIGH

**Purpose**: Allow users to add assets that extraction missed.

**Problem/Context**: Automated extraction will inevitably miss some assets. Users need the ability to manually add characters, props, or locations that are important to their story.

**Core Features:**
- [ ] "Add Asset" button/form in Stage 5
- [ ] Support all asset types (character, prop, location)
- [ ] Manual assets integrate seamlessly with extracted assets
- [ ] Manual assets appear in scene dependency mappings
- [ ] Manual additions preserved across re-extraction (cache invalidation shouldn't delete them)

**Dependencies**: 3A.1 (extraction system should be in place first).

---

#### 3A.4 — Assets Don't Require Images
**Ticket**: 5.6
**Priority**: MEDIUM

**Purpose**: Remove mandatory image generation for all assets.

**Problem/Context**: Currently every asset must have a generated/uploaded image, which is slow, expensive, and unnecessary for assets the user doesn't visually care about (e.g., minor props).

**Core Features:**
- [ ] Make image generation optional per asset
- [ ] Allow progression past Stage 5 with imageless assets
- [ ] Visual indicator for assets without images (placeholder/icon)
- [ ] Assets without images still carry descriptions for production use

**Dependencies**: 3A.1.

---

#### 3A.5 — Group Characters / "Extras" Archetypes
**Ticket**: 5.11
**Priority**: MEDIUM

**Purpose**: Create a new asset type for background characters that don't need individual tracking.

**Problem/Context**: In filmmaking, "extras" are general background characters with little/no dialogue. Currently they'd each need individual asset entries, which is overkill. Instead, create archetype entries (e.g., "Impoverished Plebeian" for bubonic plague France) that represent what numerous background characters should look like — a prototype, not an individual.

**Core Features:**
- [ ] New asset type: `extra_archetype` (or similar)
- [ ] Archetype entries represent a class of background characters
- [ ] Don't require individual persistence per extra
- [ ] Include in scene dependencies for mise-en-scène context
- [ ] Available as reference in frame generation (Stage 10)

**Dependencies**: 3A.1 (extraction should recognize extras as a type).

---

#### 3A.6 — Delete Uploaded Image for an Asset
**Ticket**: 5.12
**Priority**: LOW

**Purpose**: Allow users to remove a predetermined uploaded image.

**Problem/Context**: If a user uploads an image but later decides they don't want to predetermine that asset's appearance, there's no way to remove the uploaded image.

**Core Features:**
- [ ] "Remove Image" action on assets with uploaded images
- [ ] Revert asset to description-only state
- [ ] Clean up storage for removed images

**Dependencies**: 3A.4 (assets should be able to exist without images first).

---

#### 3A.7 — Extract Description from Uploaded Image
**Ticket**: 5.13
**Priority**: LOW

**Purpose**: Intelligently extract/merge descriptions from uploaded images.

**Problem/Context**: When a user uploads an image for an asset, the system could extract a description of what's pictured and merge it with the existing script-based description. Options: keep existing description, replace by describing the image while adding missing script details, or merge descriptions. Similar to how cloned assets work in the Asset-Matching Modal.

**Core Features:**
- [ ] Image analysis to extract visual description
- [ ] User choice: keep existing / replace / merge descriptions
- [ ] Intelligent merge that combines image details with script context
- [ ] Preview merged description before confirming

**Dependencies**: 3A.1.

---

#### 3A.8 — Visual Style Capsule Investigation & Manual Tone Option
**Tickets**: 5.7, 5.2
**Priority**: MEDIUM

**Purpose**: Fix capsules having no effect on generation, and offer manual visual tone as an alternative.

**Problem/Context**: Visual style capsules appear to have no effect on asset image generation in Stage 5 (investigated in Phase 2 for the override issue, but deeper fix needed here). Additionally, users should be able to describe their visual tone manually instead of picking a capsule — offering options like 3D animation, hyperrealistic, noir, 2D animation, etc., plus a custom description that could be promoted as a starting point for a Visual Style Capsule.

**Core Features:**
- [ ] Deeper investigation of capsule → image generation pipeline
- [ ] Fix capsule influence on Stage 5 asset generation
- [ ] Add manual visual tone description option alongside capsule selection
- [ ] Common presets: 3D animation, hyperrealistic, noir, 2D animation
- [ ] Custom visual description to capsule promotion pathway
- [ ] More robust than a single text box

**Dependencies**: 2A.1 (initial capsule balance fix in Phase 2).

---

#### 3A.9 — Visual Style Capsule Locking Less Restrictive
**Ticket**: 5.1
**Priority**: LOW

**Purpose**: Allow capsule changes with appropriate warnings.

**Problem/Context**: Users might click something wrong and there's no way to change the visual style capsule. The selection should be changeable, with the understanding that changing it later in the production cycle would trigger a new branch (or at minimum, a warning about downstream impact).

**Core Features:**
- [ ] Allow capsule re-selection after initial choice
- [ ] Warning about downstream impact when changing capsules
- [ ] Integration with post-lock edit flow (from 2B.5)

**Dependencies**: 2B.5 (post-lock edit foundations).

---

### 3B — Stage 8 UX Overhaul

#### 3B.1 — Asset Generation Carousel
**Tickets**: 8.5, MVP v1.1 Feature 2.2
**Priority**: CRITICAL UX

**Purpose**: Allow users to compare and select from multiple generation attempts.

**Problem/Context**: Currently if regeneration produces a worse result, the user has no way to revert to the previous attempt. First try was good, second was worse, third was decent — user should be able to pick the first.

**Core Features:**
- [ ] **Generation History Storage**:
  - Store all generated images for each scene asset instance
  - Maintain generation metadata (timestamp, cost, prompt used)
  - Implement cleanup policy for storage management
- [ ] **Carousel UI Component**:
  - Display thumbnails of all generation attempts
  - Arrow controls to cycle through attempts
  - Show generation metadata on hover/selection
  - "Select This One" action to set as active scene instance image
- [ ] **Database Schema**:
  - Add `scene_asset_generation_attempts` table
  - Link to `scene_asset_instances` with generation history
  - Track selected attempt vs all attempts

**Dependencies**: 2A.1 (master asset influence fix first, so generations are actually good).

---

#### 3B.2 — Master Reference Historical Carousel
**Tickets**: 8.6, MVP v1.1 Feature 2.3
**Priority**: CRITICAL UX

**Purpose**: Default master reference to most recent scene's instance, with historical navigation.

**Problem/Context**: Scene 4's master reference for the protagonist should default to Scene 3's scene instance image. Users should be able to carousel through and switch to older images (Scene 2, Scene 1, original Master Asset). Currently there's no scene-to-scene reference chain.

**Core Features:**
- [ ] Default master reference to most recent scene instance image
- [ ] Query previous scenes for selected scene instance images
- [ ] Build chronological reference chain
- [ ] Arrow controls: Master Asset → Scene 1 instance → Scene 2 instance → etc.
- [ ] Clear visual indication of current selection
- [ ] "Use This Reference" confirmation action
- [ ] First scene defaults to Master Asset image
- [ ] Skip scenes without generated instances
- [ ] Handle scene deletion/reordering

**Dependencies**: 3B.1 (carousel system should be built first for reuse).

---

#### 3B.3 — Manual Image Upload for Scene Instances
**Tickets**: 8.11, MVP v1.1 Feature 2.4
**Priority**: HIGH

**Purpose**: Allow users to upload custom images directly for scene-specific assets.

**Problem/Context**: Users may have images they want to use directly rather than relying on generation. There's no upload capability in Stage 8.

**Core Features:**
- [ ] File upload component in Stage 8 visual state editor
- [ ] Support standard image formats (PNG, JPG, WebP)
- [ ] Image validation, resize, and optimization
- [ ] Store in Supabase Storage with proper naming
- [ ] Include uploaded images in generation attempts carousel
- [ ] Allow mixing uploaded + generated images
- [ ] Proper metadata tracking for uploads

**Dependencies**: 3B.1 (carousel system for integration).

---

#### 3B.4 — "Use Master As-Is" Option
**Tickets**: 8.4, MVP v1.1 Feature 2.1
**Priority**: HIGH

**Purpose**: Allow users to skip scene instance generation entirely and use the master reference directly.

**Problem/Context**: Users shouldn't be forced to generate a new scene instance image. If the master reference works for the scene, they should be able to use it directly. This saves time, money, and creative energy.

**Core Features:**
- [ ] Pre-selected "Use Master Asset As-Is" checkbox in Stage 8
- [ ] When checked, copy master asset image directly to scene instance
- [ ] Skip generation entirely for unchanged assets
- [ ] Bulk "Use Master As-Is" option for multiple assets

**Dependencies**: None (can be done in parallel with carousel work).

---

#### 3B.5 — Asset Generation Requirement Fix
**Tickets**: 8.7, MVP v1.1 Feature 2.6
**Priority**: HIGH

**Purpose**: Allow progression without generating every single asset.

**Problem/Context**: Stage 8 currently requires scene instance generation for every asset before proceeding. "The point of Stage 8 is to add final polish to the assets you care about. If there's stuff you don't care about, you should be able to proceed."

**Core Features:**
- [ ] Modify Stage 8 gatekeeper logic to not require all assets
- [ ] Allow progression with master reference fallback for ungenerated assets
- [ ] Mark primary characters as required, secondary props/locations as optional
- [ ] "Generate Later" option for non-critical assets
- [ ] User override capability for forcing/skipping generation

**Dependencies**: 3B.4 ("Use Master As-Is" provides the fallback mechanism).

---

#### 3B.6 — "Add New Assets" Button Fix
**Ticket**: 8.8
**Priority**: MEDIUM

**Purpose**: Fix the "Create Scene Asset" button that incorrectly opens the global asset drawer.

**Problem/Context**: The "Create Scene Asset" button pulls out the global asset drawer, which already has its own button. It should instead allow creating a new scene-specific asset from scratch. The right sidebar should be renamed to "Add new assets."

**Core Features:**
- [ ] Fix button to create scene-specific assets, not open global drawer
- [ ] Rename right sidebar to "Add new assets"
- [ ] Scene-specific asset creation form
- [ ] New scene assets integrate with scene dependencies

**Dependencies**: 3A.1 (scene dependency mapping).

---

#### 3B.7 — Remove Assets from Scene
**Ticket**: 8.10
**Priority**: MEDIUM

**Purpose**: Allow removal of inaccurate asset extractions from a scene.

**Problem/Context**: Some extractions may be inaccurate — a character might be flagged as present in a scene where they don't appear. Users should be able to remove assets from a scene without deleting the asset globally.

**Core Features:**
- [ ] "Remove from scene" action per asset in Stage 8
- [ ] Only removes scene association, not global asset
- [ ] Update `scenes.dependencies` to reflect removal
- [ ] Confirmation dialog to prevent accidental removal

**Dependencies**: 3A.1 (scene dependency mapping).

---

#### 3B.8 — Persist Suggested Assets in DB
**Ticket**: 8.9
**Priority**: MEDIUM

**Purpose**: Save asset suggestions to database instead of computing them every time.

**Problem/Context**: Currently suggested assets are likely computed on-the-fly each time. Persisting them allows for consistency and user modification.

**Core Features:**
- [ ] Create `scene_asset_suggestions` table
- [ ] Add backend routes for loading/saving suggestions
- [ ] Load suggestions in frontend Stage 8 UI
- [ ] Allow users to accept/dismiss suggestions
- [ ] Suggestions update when dependencies change

**Technical Notes**: Schema: `scene_asset_suggestions (id, scene_id, asset_id, suggested_by, accepted, dismissed, created_at)`.

**Dependencies**: 3A.1 (extraction provides the suggestions).

---

#### 3B.9 — Shot Presence Flags per Asset
**Ticket**: 8.13
**Priority**: MEDIUM

**Purpose**: Show which shots each asset appears in within a scene.

**Problem/Context**: When looking at assets in Stage 8, users can't tell which specific shots an asset appears in. Little flags/badges showing shot numbers would help users understand where each asset is needed.

**Core Features:**
- [ ] Analyze shot list to determine asset presence per shot
- [ ] Display shot number badges on each asset in Stage 8
- [ ] Update flags when shot list changes
- [ ] Visual indicator style (chips, badges, or icons)

**Dependencies**: Scene dependency mapping + shot list data from Stage 7.

---

#### 3B.10 — Camera Angle Metadata
**Ticket**: 8.12
**Priority**: MEDIUM

**Purpose**: Inform frame generation about shot camera angles.

**Problem/Context**: If a shot is an aerial shot looking down, but scene instance images are all standard medium shots — how does frame generation handle this? Camera direction/angle metadata on scene instance images would help Stage 10 generate more accurate frames.

**Core Features:**
- [ ] Add camera angle metadata field to scene asset instances
- [ ] Populate from shot list camera directions (Stage 7)
- [ ] Pass metadata to frame generation prompts (Stage 10)
- [ ] UI for viewing/editing camera angle metadata

**Dependencies**: Shot list with camera directions (Stage 7 data).

---

#### 3B.11 — Rearview Mirror for Incomplete Previous Scenes
**Ticket**: 8.3
**Priority**: LOW

**Purpose**: Show useful reference data even when previous scenes aren't complete.

**Problem/Context**: When no previous scene instance exists, Stage 8 shows nothing. Instead, it should show the latest assets from previous scenes — or even better, show each asset with their various previous modifications as a carousel, so an image could be pulled and become the new master reference.

**Core Features:**
- [ ] Show previous scene assets when no scene instance exists
- [ ] Carousel of previous scene instances per asset
- [ ] "Use as reference" action from rearview data
- [ ] Graceful fallback chain: scene instance → master asset → placeholder

**Dependencies**: 3B.2 (historical carousel).

---

### 3C — Asset Architecture & Data Flow

#### 3C.1 — Transparent Background Auto-Injection
**Ticket**: MVP v1.1 Feature 3.2, 5.9
**Priority**: HIGH

**Purpose**: Automatically generate characters and props on clean backgrounds to avoid confusing noise in frame generation.

**Problem/Context**: If an asset image has a castle interior with other characters, the LLM may get confused during frame generation and include irrelevant elements. Characters and props should be isolated on clean backgrounds.

**Core Features:**
- [ ] Auto-inject "isolated on transparent/white background" for characters and props during generation
- [ ] Exclude locations from background injection (they need environmental context)
- [ ] Post-processing background removal safety net (Rembg or specialized API)
- [ ] Remove halos and solid color backgrounds
- [ ] Quality validation: A/B test prompt engineering vs post-processing

**Asset Type Logic:**
| Asset Type | Prompt Injection | Background Removal | Purpose |
|---|---|---|---|
| Character | Enforced | Required | Scene consistency |
| Prop | Enforced | Required | Multi-shot interaction |
| Location | Prohibited | None | Environmental context |
| Extra Archetype | Enforced | Required | Background character reference |

**Dependencies**: 3A.1 (asset type system).

---

#### 3C.2 — Multi-Angle Asset Generation
**Ticket**: 5.8
**Priority**: MEDIUM

**Purpose**: Generate multiple angles/views of assets for production accuracy.

**Problem/Context**: Consider generating multiple angles/views of assets (front shot, side shot, etc.) with no background noise — like engineering documentation views. This helps Stage 10 frame generation accurately place assets in different shot angles without confusion from background elements.

**Core Features:**
- [ ] Generate front, side, 3/4 view for characters
- [ ] Clean background for all angle views
- [ ] Store angle variants linked to parent asset
- [ ] Pass relevant angle to frame generation based on shot camera direction
- [ ] UI to view and manage angle variants

**Dependencies**: 3C.1 (clean backgrounds), 3B.10 (camera angle metadata).

---

#### 3C.3 — Asset Inheritance Chain Enhancement
**Ticket**: MVP v1.1 Feature 3.3, DC-3
**Priority**: HIGH

**Purpose**: Build comprehensive asset state tracking from Stage 5 through Stage 12.

**Problem/Context**: The context/inheritance chain from Stage 5 → Stage 8 → Stage 9 → Stage 10 is broken somewhere (DC-3). Final generations don't reflect master asset influence — "just generic slop." Need strong inheritance tracking.

**Core Features:**
- [ ] Strengthen `inherited_from_instance_id` chain tracking
- [ ] Build asset timeline view showing state evolution across scenes
- [ ] Add inheritance validation and repair tools
- [ ] Detect asset state changes during shot list creation
- [ ] Log visual evolution context from action descriptions
- [ ] Create efficient queries for asset history chains
- [ ] Implement asset state caching for quick retrieval

**Dependencies**: 3B.1 (carousel system provides generation history).

---

#### 3C.4 — Context Manager Enhancement
**Ticket**: MVP v1.1 Feature 3.4
**Priority**: HIGH

**Purpose**: Optimize context assembly for LLM calls with proper asset inheritance.

**Problem/Context**: LLM calls throughout the pipeline need properly assembled context that includes the right assets, styles, and prior work. Currently context may be incomplete or poorly prioritized.

**Core Features:**
- [ ] **Enhanced Global Context** (Phase A):
  - Include asset manifest from optimized Stage 5 extraction
  - Incorporate visual style locks and constraints
  - Add project-level continuity rules
- [ ] **Optimized Local Context** (Phase B):
  - Use cached scene dependencies instead of real-time extraction
  - Include relevant asset inheritance chains
  - Add prior scene end-state for continuity
- [ ] **Context Size Management**:
  - Intelligent context truncation to prevent token overflow
  - Prioritize recent asset states over distant history
  - Context size monitoring and alerts

**Dependencies**: 3A.1 (extraction provides the manifest), 3C.3 (inheritance chain).

---

#### 3C.5 — Aspect Ratio System
**Ticket**: Multi-stage aspect ratio concern
**Priority**: MEDIUM

**Purpose**: Set aspect ratio at the project level and apply consistently downstream.

**Problem/Context**: Aspect ratios need to be set at some point in the pipeline and applied consistently to asset image generation, frame generation, and video generation. Without this, outputs may have mismatched dimensions.

**Core Features:**
- [ ] Add aspect ratio selection to Stage 1 project settings
- [ ] Options: 16:9, 9:16, 1:1, 4:3, 2.35:1 (cinematic)
- [ ] Apply to Stage 5 asset image generation
- [ ] Apply to Stage 10 frame generation
- [ ] Apply to Stage 11 video generation (Veo3 supports specific ratios)
- [ ] Display current aspect ratio in project header

**Dependencies**: None (Stage 1 change is independent).

---

### Phase 3 Success Criteria
- [ ] Two-pass asset extraction working with filter modal
- [ ] Scene-level dependency mapping populated automatically
- [ ] Sidelined assets system functional
- [ ] Manual asset addition works
- [ ] Generation carousel functional in Stage 8
- [ ] Historical master reference carousel working
- [ ] "Use Master As-Is" option available
- [ ] Users can progress without generating every asset
- [ ] Transparent backgrounds automatically applied to characters/props
- [ ] Asset inheritance chain functional from Stage 5 → 10
- [ ] Significant reduction in redundant AI calls
- [ ] Aspect ratio set once, applied everywhere

---

## Phase 4: Production Pipeline Intelligence

**Goal**: Make the production stages (6–12) dramatically smarter. Better context access, better prompts, better review tools. This phase transforms the production cycle from functional to excellent.

---

### 4A — Content Access Space (Rearview Expansion)

#### 4A.1 — Multi-Tab Content Access Carousel
**Tickets**: Multi-stage rearview enhancement, OT-2
**Priority**: HIGH

**Purpose**: Build a comprehensive content access space that replaces the simple rearview mirror, giving users immediate visual access to information from previous stages without leaving the current workspace.

**Problem/Context**: The rearview mirror in its current form may not be useful enough (OT-2). Users working in Stages 6–12 constantly need to reference their script, shot list, and previous scene work. Currently they have to navigate away to check this information. The Content Access Space solves this with a multi-tab carousel.

**Core Features:**
- [ ] **Tab 1 — Rearview Mirror**: Existing content (previous scene's frames/assets)
- [ ] **Tab 2 — Script Excerpt**: Scrollable script content for the current scene (from Stage 4 Master Script), in proper script format so users can read and remember where they are in the story
- [ ] **Tab 3 — Shot List Carousel**: Cycle through all shots in the scene with up/down arrows (a carousel within the carousel — main Content Access arrows are left/right, shot cycling is up/down)
- [ ] **Collapsible Pulldown Curtain Behavior**:
  - Collapse/expand toggle
  - Click-and-drag to resize the content area (pulldown curtain)
  - User controls how much screen space it takes
- [ ] **Present throughout Stages 6–12** of the production cycle
- [ ] Smooth carousel transitions between tabs

**Dependencies**: Phase 3 asset system (for rearview data quality).

---

### 4B — Stage 6 & 7 Improvements

#### 4B.1 — Script Hub UI Overflow Fix
**Ticket**: 6.1
**Priority**: HIGH

**Purpose**: Fix scene cards that overflow their container.

**Problem/Context**: Scene cards overrun out of the container box. Headers are too long for the available space. The Script Hub section needs to handle varying content lengths gracefully.

**Core Features:**
- [ ] Make Script Hub section horizontally extendable
- [ ] Dynamic text truncation based on width (full → compressed → more compressed)
  - Example: `ext-launchpad-day-6` → `ext-launchpad..` → `ext-lau..`
- [ ] Scrollable tab container
- [ ] Responsive card sizing

**Dependencies**: None.

---

#### 4B.2 — Scene Header Formatting Fix
**Ticket**: 6.2
**Priority**: MEDIUM

**Purpose**: Use proper script formatting for scene headers.

**Problem/Context**: Titles use the encoded format (e.g., `EXT-LOC-DAY-1`) instead of nice-looking headers following traditional script formatting (e.g., `Exterior [Location] Day`). The encoded format should be the subheading, not the title.

**Core Features:**
- [ ] Parse encoded scene headers into human-readable format
- [ ] Scene number in front of the formatted header
- [ ] Encoded format as smaller subheading
- [ ] Apply across all stages that display scene headers

**Dependencies**: None.

---

#### 4B.3 — Scene Deferral/Sidelining
**Ticket**: 6.3, 7.3
**Priority**: MEDIUM

**Purpose**: Allow scenes to be greyed out and ignored without deleting them.

**Problem/Context**: Users may want to skip certain scenes temporarily. Currently there's no way to defer a scene. Additionally, when a user tries to delete the final/only shot in a scene, it should offer to defer the scene instead of blocking deletion.

**Core Features:**
- [ ] "Defer/Sideline Scene" action in Script Hub
- [ ] Greyed-out visual state for deferred scenes
- [ ] Scene data preserved (not deleted)
- [ ] "Restore Scene" action to bring it back
- [ ] When deleting final shot: warning + offer to defer scene instead
- [ ] Deferred scenes skipped in batch operations

**Dependencies**: None.

---

#### 4B.4 — Shot List Action Descriptions Enhancement
**Ticket**: 7.1
**Priority**: HIGH

**Purpose**: Make shot list action descriptions much more descriptive.

**Problem/Context**: Currently the extracted action is often only a line of dialogue with vague buzzwords. Shot list entries need camera directions, crew notes, and detailed action descriptions. This is the preamble to the two key prompts made in Stage 9 — quality here directly impacts prompt quality.

**Core Features:**
- [ ] Enhanced extraction prompts for more detailed actions
- [ ] Include camera directions in shot descriptions
- [ ] Include character positioning and movement
- [ ] Include environmental/lighting context
- [ ] Crew-note style descriptions

**Dependencies**: None.

---

#### 4B.5 — Edit Merge Toggle Improvement
**Ticket**: 7.2
**Priority**: LOW

**Purpose**: Make the shot merge toggle more obvious.

**Problem/Context**: The next/previous toggle for merging shots is not obvious enough. Users may not realize they can merge with the previous shot instead of the next one.

**Core Features:**
- [ ] Move toggle to top of merge modal: `"Merge with: Next (preselected) | Previous"`
- [ ] Show rest of modal contents underneath
- [ ] Clear visual distinction between next/previous merge direction

**Dependencies**: None.

---

#### 4B.6 — "Extend Shot" Feature Consideration
**Ticket**: 7.4
**Priority**: LOW

**Purpose**: Explore compatibility with Veo3/Sora's "extend" capabilities.

**Problem/Context**: Video generation APIs like Veo3 and Sora may support "extend" features that could be useful for lengthening shots beyond their initial generation.

**Core Features:**
- [ ] Research Veo3 extend API capabilities
- [ ] Design "Extend Shot" UI if API supports it
- [ ] Integrate with existing video generation pipeline
- [ ] Cost tracking for extended shots

**Dependencies**: None (research task).

---

### 4C — Prompt Generation Overhaul (Stage 9)

#### 4C.1 — Structured Image & Video Prompts
**Ticket**: 9.1
**Priority**: HIGH

**Purpose**: Build robust, structured, deterministic prompts that leverage all work from previous stages.

**Problem/Context**: Current prompts are "vague, unstructured paragraphs — likely not optimal for frame/video generation." Prompts should be structured and deterministic, incorporating character descriptions, scene context, shot list details, camera angles, and visual style capsule directives.

**Core Features:**
- [ ] Structured prompt template system (not freeform paragraphs)
- [ ] Include: character descriptions, positioning, action, camera direction, lighting, mood
- [ ] Leverage all Stage 1-8 data in prompt assembly
- [ ] Provider-specific optimization (Veo3 format)
- [ ] Deterministic assembly — same inputs always produce same prompt structure

**Dependencies**: 3C.4 (context manager), 4B.4 (better shot descriptions).

---

#### 4C.2 — Visual Assets Shown Alongside Prompts
**Ticket**: 9.2
**Priority**: MEDIUM

**Purpose**: Show relevant visual assets in the prompt editing UI.

**Problem/Context**: When editing prompts in Stage 9, users can't see the relevant visual assets. They're editing blind — they need to see the character images, location images, and scene instance images alongside the text prompt to understand the full equation.

**Core Features:**
- [ ] Display scene-relevant assets beside each prompt
- [ ] Show master reference and scene instance images
- [ ] Assets organized by shot presence
- [ ] Collapsible asset panel to save space

**Dependencies**: 3B.9 (shot presence flags help determine relevant assets).

---

#### 4C.3 — Video Prompt Reacts to Frame Changes
**Ticket**: 9.3
**Priority**: MEDIUM

**Purpose**: Auto-update video prompts when frame shots change.

**Problem/Context**: If the start frame for a shot changes (regenerated, edited, or swapped), the video prompt should react/update to reflect the new visual starting point rather than describing something that no longer matches the frame.

**Core Features:**
- [ ] Detect frame changes in Stage 10
- [ ] Auto-flag video prompts as potentially stale
- [ ] Option to auto-regenerate video prompt based on new frame
- [ ] User choice: accept updated prompt or keep original

**Dependencies**: Phase 3 asset system.

---

#### 4C.4 — Additional Reference Image Upload
**Ticket**: 9.4
**Priority**: LOW

**Purpose**: Allow storyboard/reference image uploads alongside prompts.

**Problem/Context**: True animators/filmmakers may have storyboards they want to reference. Allowing photo upload as part of the prompt editing process enables professionals to guide generation more precisely.

**Core Features:**
- [ ] Image upload component in Stage 9 prompt editor
- [ ] Reference images attached to specific shots
- [ ] Images available to frame/video generation as additional context
- [ ] Support for storyboard-style reference sheets

**Dependencies**: None.

---

#### 4C.5 — Shot-to-Shot Prompt Chaining
**Ticket**: 9.5
**Priority**: MEDIUM

**Purpose**: Pipe prior shot context into subsequent prompts within a scene.

**Problem/Context**: For scenes with a lot of action and change, descriptions need to be dynamically connected. The first frame & video prompt should pipe context down to subsequent ones in the scene, creating continuity within a scene.

**Core Features:**
- [ ] Extract key visual/narrative state from each shot's prompt
- [ ] Auto-inject prior shot summary into next shot's prompt
- [ ] Maintain action continuity across shots
- [ ] User can view and edit the chained context
- [ ] Toggle chaining on/off per scene

**Dependencies**: 4C.1 (structured prompts provide the data to chain).

---

### 4D — Stage 10 & 12 Enhancements

#### 4D.1 — End Frame Generation
**Ticket**: 10.2
**Priority**: HIGH

**Purpose**: Generate both start and end frames for video API compatibility.

**Problem/Context**: Currently only generating the starting frame. Both starting frame AND end frame are sometimes required for the video production API. Veo3 supports `startFrameUrl` (→ `image`) and `endFrameUrl` (→ `lastFrame`) parameters.

**Core Features:**
- [ ] Generate end frame for each shot alongside start frame
- [ ] Pass both frames to video generation API
- [ ] UI for reviewing/editing end frames
- [ ] End frame considers shot action/movement for accurate ending state

**Dependencies**: Phase 3 asset system.

---

#### 4D.2 — Fix Asset Inheritance in Frame Generation
**Ticket**: 10.1, DC-3
**Priority**: HIGH

**Purpose**: Ensure master assets actually influence frame generation.

**Problem/Context**: "Looking at generations in Stage 10, there's no influence from any master assets — just generic slop. Something is wrong with the asset inheritance into frame generation." The full inheritance chain (Stage 5 → 8 → 9 → 10) must be verified and repaired.

**Core Features:**
- [ ] Verify asset data is reaching Stage 10 frame generation
- [ ] Ensure scene instance images are included in generation context
- [ ] Pass asset reference images to image generation API
- [ ] Validate output against master asset references
- [ ] Test across different asset types and scenes

**Dependencies**: 3C.3 (inheritance chain), 3C.4 (context manager).

---

#### 4D.3 — Stage 12 Side-by-Side View & Timeline Player
**Ticket**: 12.1
**Priority**: HIGH

**Purpose**: Build a proper video review experience with timeline navigation.

**Problem/Context**: Stage 12 needs a professional review interface. Current implementation is basic. Users need to see the video alongside the shot list, jump to specific shots, and scrub through the timeline.

**Core Features:**
- [ ] **Side-by-Side Layout**: Scene player on left, shot list with thumbnails on right
- [ ] **Timeline Player**: Timeline with shot boundaries and markers
- [ ] **Scrubbing**: Drag to scrub across the full scene timeline
- [ ] **Current-Shot Indicator**: Visual highlight of currently playing shot
- [ ] **Auto-Advance**: Seamless transition between shots
- [ ] **Click-to-Jump**: Click any shot in the list to jump to it
- [ ] **Shot Thumbnails**: Start frame thumbnails in shot list

**Dependencies**: Phase 3 asset system (for thumbnails).

---

### 4E — Adaptive Asset Descriptions

#### 4E.1 — Context-Aware Asset Descriptions per Scene/Shot
**Ticket**: Multi-stage asset extraction optimization
**Priority**: MEDIUM

**Purpose**: Make asset descriptions adapt to their scene context automatically.

**Problem/Context**: Visual descriptions for assets must be adaptive/context-aware per scene. If "the hero" starts in a workout outfit but Scene 4 is a wedding, the visual description should automatically describe them in a suit. Example: Persephone switching from blonde nature-princess to goth alt-girl in the underworld — the LLM should catch that and apply the correct description per scene.

**Core Features:**
- [ ] Agentic tooling that infers correct asset context from script/scene/shot list
- [ ] Merge master asset descriptions with scene-specific context
- [ ] Per-scene description variants stored alongside master description
- [ ] Auto-detect transformation points (costume changes, injuries, etc.)
- [ ] User can review and edit adaptive descriptions

**Dependencies**: 3A.1 (extraction), 3C.4 (context manager).

---

### Phase 4 Success Criteria
- [ ] Content Access Space provides script, shot list, and rearview data in all production stages
- [ ] Script Hub handles overflow gracefully with proper truncation
- [ ] Scene headers are human-readable
- [ ] Shot list descriptions are detailed enough for quality prompts
- [ ] Stage 9 prompts are structured and leverage all prior stage data
- [ ] Shot-to-shot prompt chaining works within scenes
- [ ] End frames generated alongside start frames
- [ ] Asset inheritance verified and working in Stage 10
- [ ] Stage 12 has proper timeline player with shot navigation
- [ ] Adaptive asset descriptions adjust per scene context

---

## Phase 5: Continuity, Versioning & State Management

**Goal**: Ensure visual and narrative consistency across scenes. Protect completed work with version control. Prevent costly mistakes through intelligent invalidation tracking. Add user-facing style influence controls.

---

### 5A — End-State Summary Generation

#### 5A.1 — LLM-Powered Scene End-State Summaries
**Ticket**: MVP v1.1 Feature 4.1
**Priority**: HIGH

**Purpose**: Generate comprehensive scene end-states for cross-scene continuity.

**Problem/Context**: After completing Stage 10 (frame generation) for a scene, the system should automatically generate a summary of how the scene ends — what characters look like, where they are, what emotional state they're in, what props/locations have changed. This powers the rearview mirror and continuity validation.

**Core Features:**
- [ ] **End-State Generation Service**: LLM-powered summary after Stage 10 completion
  - Analyze final shot action and dialogue
  - Incorporate scene asset final states and status tags
  - Generate natural language summary of scene conclusion
  - Update `scenes.end_state_summary` field automatically
- [ ] **Rearview Mirror Enhancement**:
  - Show rich end-state summary instead of empty/mock data
  - Display final frame thumbnail with state context
  - Visual indicators for significant state changes
- [ ] **Continuity Validation**:
  - Compare prior end-state to current scene expectations
  - Flag character/location/prop inconsistencies
  - Provide specific continuity warnings with suggestions
- [ ] **Manual Override System**:
  - "Acknowledge and Proceed" option for risky continuity
  - "Mark as Reviewed" status for confirmed continuity breaks
  - Store override reasons in database for audit trail

**Dependencies**: Phase 4 (production pipeline must be working well).

---

### 5B — Branching & Version Control

#### 5B.1 — Save as New Version Checkpoints
**Ticket**: MVP v1.1 Feature 4.2, LK-4, LK-5
**Priority**: HIGH

**Purpose**: Implement version control to prevent accidental work loss and support deliberate branching.

**Problem/Context**: Users can accidentally overwrite completed work. Destructive operations (like script regeneration) should auto-branch. Post-lock edits (from Phase 2 foundations) need full branching integration.

**Core Features:**
- [ ] **Version Creation System**:
  - "Save as New Version" action at critical decision points
  - Auto-branch for destructive operations (Stage 4 script regeneration)
  - User-initiated branching from any stage
- [ ] **Story Timelines Interface**:
  - Visual branch tree showing project evolution
  - Node display with commit messages and timestamps
  - "Switch to this Version" action for branch navigation
- [ ] **Branch Management**:
  - Branch naming and description
  - Branch comparison (basic metadata)
  - Branch deletion with safeguards
- [ ] **Data Preservation**:
  - Prevent accidental overwrites of completed stages
  - Maintain asset generations across branches
  - Preserve cost tracking per branch
- [ ] **Post-Lock Edit Integration**:
  - Connect Phase 2 post-lock edit foundations to actual branching
  - Post-lock edits create branches automatically
  - Clear UX flow for deliberate branching decisions

**Dependencies**: 2B.5 (post-lock edit foundations from Phase 2).

---

### 5C — Continuity Risk Analysis

#### 5C.1 — Content-Aware Continuity System
**Ticket**: MVP v1.1 Feature 4.3, DC-4
**Priority**: MEDIUM

**Purpose**: Strengthen continuity validation using real end-state data.

**Problem/Context**: Continuity must persist across scenes. Example: opening and ending scenes based in the protagonist's bedroom — the system needs to use the same bedroom but with modifications (e.g., a diploma on the wall in the ending scene). Currently there's no robust continuity checking.

**Core Features:**
- [ ] **Content-Aware Continuity**:
  - Use actual end-state summaries for comparison
  - Analyze character/prop state changes between scenes
  - Detect location consistency issues
  - Flag timeline and logical continuity problems
- [ ] **Visual Continuity Tracking**:
  - Compare final frames across scenes for visual drift
  - Track character appearance consistency
  - Monitor prop and location visual evolution
- [ ] **Automated Continuity Warnings**:
  - Generate specific warnings with context
  - Suggest corrections for common issues
  - Provide continuity repair recommendations
- [ ] **Continuity Dashboard**:
  - Project-level continuity overview
  - Highlight problem areas requiring attention
  - Track continuity resolution progress

**Dependencies**: 5A.1 (end-state summaries power the comparisons).

---

### 5D — Invalidation & Cascade Detection

#### 5D.1 — Smart Invalidation System
**Ticket**: MVP v1.1 Feature 4.4
**Priority**: HIGH

**Purpose**: Track cascading changes from upstream stages and prevent wasted credits on outdated content.

**Problem/Context**: Global changes (Phase A: Stages 1–5) can invalidate local work (Phase B: Stages 6–12). Without tracking, users may waste credits regenerating content that was already invalidated by upstream changes. The deterministic pipeline needs deterministic invalidation.

**Core Features:**
- [ ] **Invalidation Logs Table**:
  - `invalidation_logs` table with timestamp and reason tracking
  - Link invalidations to specific stage changes
  - Store affected downstream artifacts
- [ ] **Global Invalidation Logic** (Phase A → Phase B):
  - Master Script changes (Stage 4) invalidate all scene-level work
  - Asset definition changes (Stage 5) invalidate scene instances
  - Beat Sheet changes (Stage 3) trigger partial invalidation
- [ ] **Local Invalidation Logic** (within scenes):
  - Shot list changes (Stage 7) invalidate frames and videos for that scene
  - Visual state changes (Stage 8) invalidate downstream frames
  - Prompt changes (Stage 9) flag need for regeneration
- [ ] **Cost Estimation for Invalidations**:
  - Estimate credits needed to regenerate invalidated content
  - Show cost breakdown by stage and scene
  - "Regenerate all" vs "selective regenerate" cost comparison
  - Warning modals before confirming destructive changes
- [ ] **Smart Invalidation UI**:
  - Visual indicators for invalidated stages (orange/red status)
  - "Review Invalidations" modal showing affected content
  - Batch regeneration options with cost preview
  - Option to proceed with partial invalidation (acknowledge risks)

**Dependencies**: 5B.1 (branching provides safe rollback if invalidation goes wrong).

---

### 5E — Visual Style Capsule Influence Scale

#### 5E.1 — User-Facing Influence Slider
**Ticket**: Multi-stage Visual Style Capsule Influence Scale
**Priority**: MEDIUM

**Purpose**: Allow users to control how much the visual style capsule affects generation.

**Problem/Context**: Currently the capsule influence is all-or-nothing and can dominate over master reference images. Phase 2 fixes the default balance, but users need a slider to fine-tune the level of capsule influence for their specific project needs.

**Core Features:**
- [ ] Influence slider (0–100%) in relevant stages
- [ ] Apply in Stage 5 (asset generation), Stage 8 (scene instances), Stage 10 (frame generation)
- [ ] 0% = no capsule influence (master reference only)
- [ ] 100% = full capsule style override
- [ ] Default to balanced value (determined by Phase 2 fix)
- [ ] Persist setting per project
- [ ] Real-time preview of influence level if feasible

**Dependencies**: 2A.1 (Phase 2 capsule balance fix), 3A.8 (capsule investigation).

---

### Phase 5 Success Criteria
- [ ] End-state summaries automatically generated after Stage 10
- [ ] Rearview mirror shows rich end-state instead of mock data
- [ ] Basic branching system prevents work loss
- [ ] Post-lock edits create branches with clear UX
- [ ] Continuity system provides meaningful, content-aware warnings
- [ ] Continuity dashboard shows project-level overview
- [ ] Invalidation system tracks cascade changes with cost estimates
- [ ] Visual indicators show invalidated stages
- [ ] Style capsule influence slider functional in Stages 5, 8, and 10
- [ ] Users feel confident about scene-to-scene consistency

---

## Phase 6: Quality, Polish & MVP Completion

**Goal**: Polish the experience, evaluate generation quality, build onboarding, add export, and get the product ready for beta users. This is the "make it great" phase.

---

### 6A — Writing & Style Capsule Effectiveness Evaluation

#### 6A.1 — Generation Quality Evaluation & Improvement
**Tickets**: Multi-stage writing & style capsule effectiveness
**Priority**: HIGH

**Purpose**: Dedicated effort to evaluate and improve the quality of AI-generated content.

**Problem/Context**: System prompts are "doing a poor job injecting writing style capsules into scriptmaking." Language/dialogue/writing capabilities need improvement through prompting experimentation. Content censorship workarounds needed for raunchy dialogue and violent/spicy content (nothing illegal). LLMs are proven weak at dialogue specifically — style injection should focus there. "Need a whole phase/effort for evaluating quality of generated content."

**Core Features:**
- [ ] **Prompt Experimentation**: A/B test different prompting strategies for dialogue/narrative
- [ ] **Censorship Workarounds**: Techniques for non-illegal mature content
- [ ] **System Prompt Quality Assessment**: Evaluate effectiveness of current prompts
- [ ] **Writing Style Injection Focus**: Concentrate capsule influence on dialogue (where LLMs are weakest)
- [ ] **Evaluation Framework**: Systematic framework for rating generation quality
- [ ] **Style Capsule Effectiveness Testing**: Measure actual impact of capsules on output
- [ ] **Iteration Cycle**: Document what works, deprecate what doesn't

**Dependencies**: Phase 4 (production pipeline must be mature).

---

### 6B — UX Improvements

#### 6B.1 — Auto-Save Debouncing
**Ticket**: UI-2
**Priority**: MEDIUM

**Purpose**: Reduce auto-save spam in Stages 1–3.

**Problem/Context**: Auto-save fires too frequently. Users see constant save notifications. Need debouncing to save less often while maintaining data integrity.

**Core Features:**
- [ ] Implement smart debouncing for Stages 1–3 auto-save
- [ ] Reduce save frequency (e.g., 2-second debounce after last keystroke)
- [ ] Maintain data integrity with efficient saves
- [ ] Quiet save indicator (no toast spam)

**Dependencies**: None.

---

#### 6B.2 — Project Folders in Dashboard
**Ticket**: UI-3
**Priority**: MEDIUM

**Purpose**: Organize projects into folders with search.

**Problem/Context**: As users create more projects, the dashboard becomes unwieldy. Folders and search help organize work.

**Core Features:**
- [ ] Create/rename/delete folders
- [ ] Drag projects into folders
- [ ] Project search and filtering
- [ ] Folder view with project counts

**Dependencies**: None.

---

#### 6B.3 — Stage Info on Dashboard Cards
**Ticket**: UI-4
**Priority**: LOW

**Purpose**: Show current stage and scene on project cards.

**Problem/Context**: Project cards on the dashboard don't show where the user left off. For Phase B projects, showing both scene number and stage (e.g., "Scene 3, Stage 8") helps users quickly resume work.

**Core Features:**
- [ ] Display current stage on each project card
- [ ] For production cycle: show scene number + stage
- [ ] Visual progress indicator (pipeline mini-graphic)

**Dependencies**: None.

---

#### 6B.4 — Unsaved Page Exit Warning
**Ticket**: UI-6
**Priority**: MEDIUM

**Purpose**: Warn users before navigating away with unsaved changes.

**Problem/Context**: Standard web behavior — show a warning popup if the user tries to navigate away from the page without saving. Currently no protection against accidental data loss from navigation.

**Core Features:**
- [ ] Browser `beforeunload` event handler
- [ ] Track dirty state across stage editors
- [ ] Clear warning message about unsaved changes
- [ ] Option to save and continue or discard

**Dependencies**: 6B.1 (auto-save debouncing complements this).

---

#### 6B.5 — Regeneration Boxes UI Polish
**Ticket**: UI-7 (continued from Phase 2)
**Priority**: LOW

**Purpose**: Final polish pass on regeneration UI components.

**Problem/Context**: Building on Phase 2's initial fix (2A.9), this is the final polish pass for regeneration boxes across all stages.

**Core Features:**
- [ ] Consistent regeneration UI across all stages
- [ ] Clear before/after comparison where applicable
- [ ] Progress indicators during regeneration
- [ ] Cost display before regeneration

**Dependencies**: 2A.9 (initial fix in Phase 2).

---

#### 6B.6 — Custom Revision UI for Treatment
**Ticket**: 2.1
**Priority**: MEDIUM

**Purpose**: Replace default browser prompt with inline LLM editing.

**Problem/Context**: Instead of the default browser prompt box, a custom UI box should appear next to the treatment when a user highlights text. This allows "LLM edit or revise" functionality where users type suggestions and the LLM edits that section in place. Need clearer indication of the highlight-to-revise interaction.

**Core Features:**
- [ ] Inline revision popover on text highlight
- [ ] User types revision suggestion
- [ ] LLM edits the highlighted section in place
- [ ] Preview of changes before accepting
- [ ] Clear visual indication of the highlight-to-revise interaction

**Dependencies**: None.

---

#### 6B.7 — Contextual Regeneration Button
**Ticket**: 2.2, DC-1
**Priority**: MEDIUM

**Purpose**: Allow contextual input before regeneration instead of blind regen.

**Problem/Context**: The regeneration button auto-regenerates without any context from the user. It should trigger a custom input box where users suggest what they want changed. This also addresses DC-1 (how Stage 2 & 3 context feeds into Stage 4) — regeneration should incorporate user intent.

**Core Features:**
- [ ] Custom input box appears on regeneration click
- [ ] User types what they want changed/improved
- [ ] Input passed as context to the LLM regeneration call
- [ ] Option to still do "blind" regeneration if preferred
- [ ] Works in Stages 2, 3, and wherever regeneration exists

**Dependencies**: None.

---

#### 6B.8 — Asset Drawer Improvements
**Ticket**: From MVP v1.1 Feature 5.3
**Priority**: LOW

**Purpose**: Improve Stage 8 asset drawer usability.

**Problem/Context**: The asset drawer needs renaming, performance improvements, and search/filtering capabilities for projects with many assets.

**Core Features:**
- [ ] Rename "Create Scene Asset" to "Add New Assets"
- [ ] Improve asset drawer performance with large libraries
- [ ] Add asset search and filtering within drawer

**Dependencies**: 3B.6 (button fix from Phase 3).

---

### 6C — Stage 1 Structured Uploading

#### 6C.1 — Document Identification & Routing
**Ticket**: 1.1
**Priority**: MEDIUM

**Purpose**: Allow users to upload existing documents and have them intelligently routed to the right pipeline stage.

**Problem/Context**: Users who already have treatments, beat sheets, or character descriptions shouldn't need to recreate them. The system should analyze uploaded documents, identify what they are, and route them to the correct stage.

**Core Features:**
- [ ] **Document Identification**: Auto-detect treatments, beat sheets, character descriptions, scripts
- [ ] **Form-Based Input**: Upload/paste → identify type → route to correct stage
- [ ] **Beat Sheet Conversion**: Convert detected beat sheets to JSON → push to Stage 3
- [ ] **Character Description Storage**: Store for use in Stage 5 extraction
- [ ] **Treatment Detection**: Route to Stage 2
- [ ] **Script Detection**: Route to Stage 4
- [ ] **Flexible Input**: Support both file upload and text paste
- [ ] **Type Override**: Let users correct auto-detection if needed

**Dependencies**: 2A.6 (skip option fix — structured upload builds on skip routing).

---

### 6D — Onboarding & User Education

#### 6D.1 — First-Time User Experience
**Ticket**: MVP v1.1 Feature 5.4
**Priority**: HIGH

**Purpose**: Guide new users through the pipeline and reduce learning curve.

**Problem/Context**: First-time user experience directly impacts retention and word-of-mouth growth. The 12-stage pipeline is complex and unfamiliar. Without guidance, users may abandon the product before experiencing its value.

**Core Features:**
- [ ] **Welcome Modal**: Explain 12-stage pipeline concept
- [ ] **Guided Tour**: Step-by-step tour through Stages 1–4
- [ ] **Feature Highlights**: Style Capsules, Asset Library, Scene Pipeline
- [ ] **Progress Tracking**: Dismiss tour, resume later
- [ ] **Stage-Specific Tooltips**: Contextual guidance explaining key actions
- [ ] **Progressive Disclosure**: Show advanced features after basics are mastered
- [ ] **Example Project Templates** (2–3): Short Film, Music Video, Commercial
  - Include sample treatments, beat sheets, and assets
  - "Clone Example" to learn by exploring
  - "How This Was Made" annotations
- [ ] **Contextual Help System**:
  - Help icons (?) next to complex features
  - Searchable help panel
  - Video tutorial embeds for key workflows
- [ ] **Empty State Improvements**:
  - "Create Your First Project" CTA on empty dashboard
  - Helpful prompts in empty asset libraries
  - Example inputs in empty text fields
  - Suggestions for next steps at each stage

**Dependencies**: Phases 2–4 should be mostly complete (don't onboard users to a broken product).

---

### 6E — Video Export System

#### 6E.1 — Basic Video Export
**Ticket**: MVP v1.1 Feature 5.5
**Priority**: HIGH

**Purpose**: Enable users to download and share their completed videos.

**Problem/Context**: Essential for MVP — users must be able to export their work to consider the product functional. Without export, the entire pipeline produces output that users can't use.

**Core Features:**
- [ ] **Export API Endpoint**:
  - `POST /api/projects/:projectId/scenes/:sceneId/export`
  - Support MP4 format with H.264 codec (universal compatibility)
  - Export quality options (720p, 1080p, 4K)
  - Metadata embedding (project name, scene info, timestamp)
- [ ] **Export Job Queue**:
  - Integrate with existing async job system (from Stage 12)
  - Job status tracking (queued, processing, completed, failed)
  - Progress percentage updates
  - Store completed exports in Supabase Storage with expiration
- [ ] **Export UI**:
  - "Export Video" button in Stage 12
  - Configuration modal (format, quality, filename)
  - Progress indicator with cancellation option
  - Download link generation with expiration notice
- [ ] **Export History**:
  - Store export records with timestamp and settings
  - Display history in project settings
  - Re-download of recent exports (7-day retention)
  - Track export credits/costs if applicable
- [ ] **Multi-Scene Export** (optional for MVP):
  - "Export Full Project" to concatenate all scene videos
  - Scene stitching with transition handling
  - Master timeline with scene markers
  - Partial export (select specific scenes)

**Dependencies**: Phase 4 Stage 12 improvements.

---

### 6F — Keyboard Shortcuts

#### 6F.1 — Global Keyboard Shortcut System
**Ticket**: MVP v1.1 Feature 5.3
**Priority**: LOW

**Purpose**: Power user efficiency features.

**Problem/Context**: Power users need keyboard shortcuts for rapid navigation and common actions. This is a quality-of-life feature that makes the tool feel professional.

**Core Features:**
- [ ] Global keyboard shortcut handler
- [ ] **Stage Navigation**: Ctrl+1–12 for stages, Ctrl+Left/Right for prev/next
- [ ] **Action Shortcuts**: Ctrl+S save, Ctrl+R regenerate, Ctrl+G generate
- [ ] **Help Modal**: Ctrl+/ or ? key
- [ ] Customizable key bindings in user settings
- [ ] Keyboard hints in tooltips and UI
- [ ] Cross-platform compatibility (Windows/Mac/Linux)

**Dependencies**: None.

---

### 6G — Testing Infrastructure

#### 6G.1 — Comprehensive Testing Coverage
**Ticket**: MVP v1.1 Feature 5.6
**Priority**: MEDIUM

**Purpose**: Add testing coverage for reliability and confidence in deployments.

**Core Features:**
- [ ] **Frontend Testing**: React Testing Library tests for critical components
- [ ] **Integration Testing**: End-to-end testing with Playwright/Cypress
- [ ] **Performance Testing**: Load testing for asset-heavy projects
- [ ] **Error Handling Improvements**:
  - Comprehensive error boundaries
  - Graceful degradation
  - User-friendly error messages

**Dependencies**: None (can be done in parallel throughout Phase 6).

---

### 6H — TypeScript `any` Audit

#### 6H.1 — Type Safety Improvements
**Ticket**: OT-1
**Priority**: LOW

**Purpose**: Identify and fix potential runtime errors from `any` types.

**Problem/Context**: There are possible runtime errors from `any` types throughout the codebase. An audit is needed to identify and fix potential issues.

**Core Features:**
- [ ] Audit codebase for `any` type usage
- [ ] Prioritize fixes for types that could cause runtime errors
- [ ] Add proper TypeScript interfaces where `any` is used
- [ ] Enable stricter TypeScript checks where feasible

**Dependencies**: None.

---

### Phase 6 Success Criteria
- [ ] Writing/dialogue generation quality measurably improved
- [ ] Style capsule effectiveness evaluated and documented
- [ ] Auto-save debouncing eliminates spam
- [ ] Projects organizable in folders with search
- [ ] Unsaved changes warning prevents data loss
- [ ] Inline revision and contextual regeneration working
- [ ] Structured uploading routes documents to correct stages
- [ ] Onboarding guides new users through pipeline successfully
- [ ] Video export functional in MP4 format
- [ ] Keyboard shortcuts implemented for power users
- [ ] Testing infrastructure in place
- [ ] TypeScript type safety improved
- [ ] Platform ready for beta users

---

## Phase 7: Deferred Nice-to-Haves

**Goal**: Items explicitly deferred but worth tracking. Only pursue if time/resources permit before launch. These are valuable features that don't block MVP.

---

#### 7.1 — Inpainting Region Selection Tools
**Ticket**: 10.3
**Priority**: DEFERRED

**Purpose**: Precise region selection for targeted image editing.

**Core Features:**
- [ ] Brush + shapes (rectangle, ellipse) for precise/quick region selection
- [ ] Lasso + brush for fine-tuning (e.g., "character's face" workflow)
- [ ] Tool picker UI to switch between tools

---

#### 7.2 — Cost Pre-Generation Estimate + Confirmation
**Ticket**: 10.4
**Priority**: DEFERRED

**Purpose**: Show estimated credits before starting a generation action.

**Core Features:**
- [ ] Estimated credits displayed before generation
- [ ] Optional confirmation step when estimate exceeds threshold
- [ ] User preference for confirmation threshold

---

#### 7.3 — Continuity Drift Detection
**Ticket**: 12.2
**Priority**: DEFERRED

**Purpose**: AI-powered continuity detection between shots.

**Core Features:**
- [ ] Use Gemini to compare prior end frame vs current start frame
- [ ] Flag potential continuity breaks with confidence scores
- [ ] Show suggestions alongside visual comparison

---

#### 7.4 — Rearview Comparison Modes
**Ticket**: 12.3
**Priority**: DEFERRED

**Purpose**: Advanced comparison tools for continuity review.

**Core Features:**
- [ ] Toggle flicker mode: rapidly switch between previous end frame and current start frame
- [ ] Side-by-side comparison with alignment guides
- [ ] Multi-mode comparison: slider + flicker + side-by-side with mode switcher

---

## Items Explicitly Excluded from MVP

| Item | Ticket | Reason |
|---|---|---|
| Master Document stage | 4.2 | Deferred to post-MVP — pipeline stays at 12 stages. Scripts insufficient for production prompting (4.1) addressed via better structured prompts (4C.1) and adaptive asset descriptions (4E.1) instead |
| Combine Stage 2 & 3 | 2.4 | Deferred — just fix bugs, don't merge stages |
| Multi-Provider Video (Sora, Runway) | Multi-stage | Veo3-only for MVP; architecture ready for future providers |
| Storyboard Upload input mode | 1.3 | Deferred to post-MVP |
| Input Format Template | 1.4 | Deferred to post-MVP |
| Full Git-Style Branching | MVP v1.1 Phase 6.1 | Merge conflicts, rebasing, cherry-picking — too complex for MVP |
| Artifact Vault | MVP v1.1 Phase 6.2 | Post-MVP advanced feature |
| Advanced Continuity Tools | MVP v1.1 Phase 6.3 | Post-MVP professional feature |
| Performance Optimization (Redis, CDN) | MVP v1.1 Phase 6.4 | Post-MVP scalability feature |
| NLE Integration (EDL/XML export) | MVP v1.1 Phase 6.2 | Post-MVP professional feature |

---

## Cross-Reference: Organized Tickets → Phase Locations

This table maps every item from `organized-tickets.md` to its location in this master tasklist.

| Ticket | Description | Phase Location |
|---|---|---|
| **Stage 1** | | |
| 1.1 | Structured Uploading & Document Identification | Phase 6C (6C.1) |
| 1.2 | Fix the "Skip" Option | Phase 2A (2A.6) |
| 1.3 | Storyboard Upload | **Excluded** (post-MVP) |
| 1.4 | Input Format Template | **Excluded** (post-MVP) |
| **Stage 2 & 3** | | |
| 2.1 | Custom Revision UI for Treatment | Phase 6B (6B.6) |
| 2.2 | Contextual Regeneration Button | Phase 6B (6B.7) |
| 2.3 | Beat Sheet Generation Bug | Phase 2A (2A.3) |
| 2.4 | Combine Treatment & Beat Sheet | **Excluded** (deferred) |
| **Stage 4** | | |
| 4.1 | Scripts Insufficient for Production | Addressed via 4C.1 + 4E.1 (not a separate stage) |
| 4.2 | Master Document Stage | **Excluded** (post-MVP) |
| 4.3 | Stage 4 Auto-Generation | Phase 2A (2A.4) |
| 4.4 | Stage 4 Script UI Fix | Phase 2A (2A.5) |
| **Stage 5** | | |
| 5.1 | Visual Style Capsule Locking | Phase 3A (3A.9) |
| 5.2 | Manual Visual Tone Description | Phase 3A (3A.8) |
| 5.3 | Asset Extraction Filter Modal | Phase 3A (3A.1) |
| 5.4 | Sidelined Assets | Phase 3A (3A.2) |
| 5.5 | Manual Asset Addition | Phase 3A (3A.3) |
| 5.6 | Assets Don't Require Images | Phase 3A (3A.4) |
| 5.7 | Visual Capsules Don't Influence Generation | Phase 2A (2A.1) + Phase 3A (3A.8) |
| 5.8 | Multiple Angles of Assets | Phase 3C (3C.2) |
| 5.9 | Asset Clean Backgrounds | Phase 3C (3C.1) |
| 5.10 | "Lock All and Proceed" Button | Phase 2A (2A.7) |
| 5.11 | Group Characters / Extras Archetypes | Phase 3A (3A.5) |
| 5.12 | Delete Uploaded Image | Phase 3A (3A.6) |
| 5.13 | Extract Description from Uploaded Image | Phase 3A (3A.7) |
| **Stage 6** | | |
| 6.1 | Script Hub UI Overflow | Phase 4B (4B.1) |
| 6.2 | Scene Header Formatting | Phase 4B (4B.2) |
| 6.3 | Scene Deferral/Sidelining | Phase 4B (4B.3) |
| **Stage 7** | | |
| 7.1 | Shot List Action Descriptions | Phase 4B (4B.4) |
| 7.2 | Edit Merge Toggle | Phase 4B (4B.5) |
| 7.3 | Final Shot Deletion Warning | Phase 4B (4B.3) — combined with scene deferral |
| 7.4 | "Extend Shot" Feature | Phase 4B (4B.6) |
| **Stage 8** | | |
| 8.1 | "Locked" Status Flag Treatment | Phase 2B (2B.1) — part of universal lock/unlock |
| 8.2 | Master Asset Not Influencing Instance | Phase 2A (2A.1) |
| 8.3 | Rearview Mirror Incomplete Scenes | Phase 3B (3B.11) |
| 8.4 | Use Master Reference As-Is | Phase 3B (3B.4) |
| 8.5 | Generation Carousel | Phase 3B (3B.1) |
| 8.6 | Master Reference Historical Carousel | Phase 3B (3B.2) |
| 8.7 | Generation Requirement Block | Phase 3B (3B.5) |
| 8.8 | "Create Scene Asset" Button Fix | Phase 3B (3B.6) |
| 8.9 | Persist Suggested Assets | Phase 3B (3B.8) |
| 8.10 | Remove Assets from Scene | Phase 3B (3B.7) |
| 8.11 | Manual Image Upload | Phase 3B (3B.3) |
| 8.12 | Camera Angle Metadata | Phase 3B (3B.10) |
| 8.13 | Shot Presence Flags | Phase 3B (3B.9) |
| **Stage 9** | | |
| 9.1 | Structured Prompts | Phase 4C (4C.1) |
| 9.2 | Visual Assets Alongside Prompts | Phase 4C (4C.2) |
| 9.3 | Video Prompt Reacts to Frame Changes | Phase 4C (4C.3) |
| 9.4 | Additional Reference Image Upload | Phase 4C (4C.4) |
| 9.5 | Shot-to-Shot Prompt Chaining | Phase 4C (4C.5) |
| **Stage 10** | | |
| 10.1 | Asset Inheritance in Frame Generation | Phase 4D (4D.2) |
| 10.2 | End Frame Generation | Phase 4D (4D.1) |
| 10.3 | Inpainting Region Selection | Phase 7 (7.1) — deferred |
| 10.4 | Cost Pre-Generation Estimate | Phase 7 (7.2) — deferred |
| **Stage 12** | | |
| 12.1 | Side-by-Side View / Timeline Player | Phase 4D (4D.3) |
| 12.2 | Continuity Drift Detection | Phase 7 (7.3) — deferred |
| 12.3 | Rearview Comparison Modes | Phase 7 (7.4) — deferred |
| **Multi-Stage** | | |
| Content Access Space (Rearview expansion) | Phase 4A (4A.1) |
| Asset Extraction & Continuity Optimization | Phase 3A (3A.1) + Phase 4E (4E.1) |
| Writing & Style Capsule Effectiveness | Phase 6A (6A.1) |
| Multi-Provider Video | **Excluded** (Veo3-only for MVP) |
| Aspect Ratio | Phase 3C (3C.5) |
| Visual Style Capsule Influence Scale | Phase 5E (5E.1) |
| **UI/UX** | | |
| UI-1 | Stage Opening System Fix | Phase 2A (2A.2) |
| UI-2 | Auto-Save Debouncing | Phase 6B (6B.1) |
| UI-3 | Project Folders | Phase 6B (6B.2) |
| UI-4 | Stage Info on Dashboard Cards | Phase 6B (6B.3) |
| UI-5 | Pipeline Graphic Colors | Phase 2A (2A.8) |
| UI-6 | Unsaved Page Exit Warning | Phase 6B (6B.4) |
| UI-7 | Regeneration Boxes UI | Phase 2A (2A.9) + Phase 6B (6B.5) |
| **Data/Context** | | |
| DC-1 | Stage 2 & 3 → Stage 4 Context | Phase 6B (6B.7) — contextual regeneration |
| DC-2 | Script Insufficient as Source of Truth | **Excluded** (4.2 deferred); mitigated by 4C.1 + 4E.1 |
| DC-3 | Asset Inheritance Failure | Phase 3C (3C.3) + Phase 4D (4D.2) |
| DC-4 | Continuity Persistence | Phase 5A + 5C |
| **Locking** | | |
| LK-1 | Locking Too Tedious | Phase 2B (2B.4) |
| LK-2 | Universal Lock/Unlock Button | Phase 2B (2B.1) |
| LK-3 | State Persistence for Completed Scenes | Phase 2B (2B.2) |
| LK-4 | Deliberate Branching on Post-Lock Edits | Phase 2B (2B.5) + Phase 5B (5B.1) |
| LK-5 | Sideline Locking Until Branching | Honored: foundations in Phase 2, full integration in Phase 5 |
| LK-6 | Sequential Locking Error | Phase 2B (2B.3) |
| **Other** | | |
| OT-1 | TypeScript `any` Audit | Phase 6H (6H.1) |
| OT-2 | Rearview Mirror Usefulness | Superseded by Phase 4A Content Access Space |

---

## Cross-Reference: MVP v1.1 Features → Phase Locations

| MVP v1.1 Feature | Phase Location |
|---|---|
| Phase 1 (Pipeline Connectivity) | **Phase 1** ✅ DONE |
| Feature 2.1 (Master Asset Bug) | Phase 2A (2A.1) |
| Feature 2.2 (Asset Generation Carousel) | Phase 3B (3B.1) |
| Feature 2.3 (Master Reference Carousel) | Phase 3B (3B.2) |
| Feature 2.4 (Manual Image Upload) | Phase 3B (3B.3) |
| Feature 2.5 (Stage Opening Fix) | Phase 2A (2A.2) |
| Feature 2.6 (Asset Generation Requirement) | Phase 3B (3B.5) |
| Feature 3.1 (Stage 5 Extraction) | Phase 3A (3A.1) |
| Feature 3.2 (Transparent Backgrounds) | Phase 3C (3C.1) |
| Feature 3.3 (Asset Inheritance Chain) | Phase 3C (3C.3) |
| Feature 3.4 (Context Manager) | Phase 3C (3C.4) |
| Feature 4.1 (End-State Summaries) | Phase 5A (5A.1) |
| Feature 4.2 (Branching & Version Control) | Phase 5B (5B.1) |
| Feature 4.3 (Continuity Risk Analysis) | Phase 5C (5C.1) |
| Feature 4.4 (Invalidation & Cascade) | Phase 5D (5D.1) |
| Feature 5.1 (Blocking Issues) | Split across Phase 2A |
| Feature 5.2 (Data Quality / Adaptive Descriptions) | Phase 4E (4E.1) + Phase 6A (6A.1) |
| Feature 5.3 (UX Polish + Keyboard Shortcuts) | Phase 6B + Phase 6F |
| Feature 5.4 (Onboarding) | Phase 6D (6D.1) |
| Feature 5.5 (Video Export) | Phase 6E (6E.1) |
| Feature 5.6 (Testing Infrastructure) | Phase 6G (6G.1) |
| Feature 6.1 (Full Git Branching) | **Excluded** (post-MVP) |
| Feature 6.2 (Artifact Vault) | **Excluded** (post-MVP) |
| Feature 6.3 (Advanced Continuity) | **Excluded** (post-MVP) |
| Feature 6.4 (Performance Optimization) | **Excluded** (post-MVP) |

---

## Implementation Notes

### Development Standards
- **Quality Standard**: "Do it as well as possible" — prioritize correct implementation over speed
- **API Integration**: Use real services (Gemini, Veo3) — mock only for testing
- **Testing**: Include testing at each phase (comprehensive in Phase 6G)
- **Documentation**: Maintain this master tasklist as the single source of truth

### Database Schema Updates
- Each phase may require database migrations
- Maintain backward compatibility where possible
- Plan migrations carefully to avoid data loss
- Use JSONB fields for flexible schema evolution
- Key new tables: `scene_asset_generation_attempts` (Phase 3), `scene_asset_suggestions` (Phase 3), `invalidation_logs` (Phase 5)

### Cost Management
- Track API costs for all real integrations
- Two-pass extraction saves $$$ on skipped assets (Phase 3)
- Invalidation cost estimates prevent wasted credits (Phase 5)
- Export credits tracked separately (Phase 6)
- Monitor and alert on excessive usage

### Security Considerations
- Implement proper input sanitization
- Add rate limiting for API endpoints
- Secure file upload processing (Phases 3, 4, 6)
- Maintain audit trails for user actions
- RLS policies for all new tables

---

**Document Version**: 2.0
**Created**: February 7, 2026
**Last Updated**: February 7, 2026
**Status**: Phase 1 Complete, Phase 2 Ready for Implementation
**Next Review**: After Phase 2 Completion

### Changelog
**v2.0** (February 7, 2026):
- Complete restructure from 6 phases to 7 phases based on dependency chains and user impact
- Reconciled all items from `MVP-tasklist-v1.1.md` and `organized-tickets.md` (73+ tickets)
- Incorporated architectural decisions: Master Document deferred, locking early, branching late, Veo3-only, etc.
- Added comprehensive cross-reference tables mapping both source documents to phase locations
- Every item from both source docs either included or explicitly excluded with reasoning
- Phase 2 restructured: bug fixes + locking overhaul (was just "Critical Blockers")
- Phase 3 restructured: full asset system overhaul with Stage 5 + Stage 8 + architecture
- Phase 4 new: Production Pipeline Intelligence (Content Access Space, prompt overhaul, Stage 12 timeline)
- Phase 5 restructured: Continuity + versioning + invalidation + capsule influence scale
- Phase 6 restructured: Quality, polish, onboarding, export, testing, TypeScript audit
- Phase 7 new: Deferred nice-to-haves (inpainting, cost pre-gen, continuity drift, rearview comparison)
- Added Items Explicitly Excluded from MVP table
- Added Implementation Notes section
