# Phase 4: Phase B Foundation - Scenes & Shots - Planning Guide

This guide identifies the vital context files from your codebase and documentation that are essential for implementing Phase 4 features. Each feature section lists the most relevant files, organized by type (codebase vs docs), with brief explanations of their importance.

## Feature 4.1: Scene Extraction & Parsing

**Purpose**: Convert Master Script into scene database entries

### Codebase Files

- **`backend/migrations/003_add_scenes_table.sql`** - Complete database schema for the `scenes` table with all fields (scene_number, slug, script_excerpt, status, end_state_summary, end_frame_id), constraints, indexes, and RLS policies. This is the foundation for storing extracted scenes.

- **`src/lib/services/scriptService.ts`** - Contains `extractScenes()` method (lines 266-317) that parses formatted scripts using regex pattern matching for scene headings (INT./EXT.). Currently extracts scenes with basic heading detection, slug generation, and content aggregation. Needs enhancement for DAY/NIGHT parsing and more robust scene boundary detection.

- **`backend/src/routes/projects.ts`** - Contains `PUT /api/projects/:id/scenes` endpoint (lines 426-498) that persists extracted scenes to the database. Handles scene deletion/reinsertion for branch updates and validates project ownership. This is the backend API for scene persistence.

- **`src/components/pipeline/Stage4MasterScript.tsx`** - Where scene extraction is triggered (lines 425-432). Calls `scriptService.extractScenes()` and `scriptService.persistScenes()` when the master script is approved. This is the integration point for scene extraction workflow.

- **`src/types/scene.ts`** - TypeScript type definitions for `Scene` interface (lines 27-40) including scene status types, continuity risk types, and scene metadata structure. Essential for type-safe scene handling throughout the application.

### Documentation Files

- **`._docs/database-schema-state-transition-matrix.md`** - Complete `scenes` table schema documentation (lines 283-309) with field descriptions, status enum values, and relationship definitions. Also documents scene status transitions and invalidation cascades (lines 855-863).

- **`._docs/architecture-and-rules.md`** - Scene table schema reference (lines 439-466) and Stage 4 content structure (lines 420-430). Defines how scenes relate to branches and stage states.

- **`._docs/project-overview.md`** - High-level Stage 6 requirements (lines 187-191) and scene workflow description. Explains scene status lifecycle and how scenes are used in Phase B production pipeline.

- **`._docs/implementation-task-list.md`** - Feature 4.1 checklist (lines 221-227) with specific implementation tasks for scene extraction, parsing, and storage.

- **`._docs/AI-agent-registry-context-flow-architecture.md`** - May contain LLM-based scene extraction patterns if advanced parsing is needed beyond regex-based extraction.

---

## Feature 4.2: Stage 6 - Script Hub

**Purpose**: Scene navigation and status tracking

### Codebase Files

- **`src/components/pipeline/Stage6ScriptHub.tsx`** - Complete UI implementation (432 lines) with scene list panel, status indicators, scene overview panel, and "Enter Scene Pipeline" action. Currently uses mock data but has full UI structure. Needs integration with real scene data fetching and continuity risk analyzer.

- **`src/pages/ProjectView.tsx`** - Routing logic for Stage 6 (lines 282-301). Handles navigation to Script Hub when `currentStage > 5` and manages scene workflow entry via `handleEnterScene` callback. This is the main orchestration point for Phase B navigation.

- **`src/types/scene.ts`** - Scene type definitions including `SceneStatus` enum (lines 1-6), `ContinuityRisk` type (line 8), and complete `Scene` interface (lines 27-40) with all fields needed for Script Hub display (status, expectedCharacters, expectedLocation, priorSceneEndState, etc.).

- **`backend/src/routes/projects.ts`** - Scene persistence endpoint (lines 426-498) that will need to be extended with GET endpoints for fetching scenes by branch, updating scene status, and retrieving scene dependencies for continuity analysis.

### Documentation Files

- **`._docs/project-overview.md`** - Complete Stage 6 UI/UX specification (lines 504-549) including layout structure, status indicators, scene overview panel requirements, outdated scene handling workflow, and continuity risk analyzer specifications. This is the authoritative source for Script Hub behavior.

- **`._docs/user-flow.md`** - Stage 6 user flow description (lines 163-174) explaining user intent, scene selection workflow, and navigation patterns.

- **`._docs/database-schema-state-transition-matrix.md`** - Scene status transitions and invalidation rules (lines 855-863). Documents how scenes become "outdated" and "continuity_broken", which Script Hub must display and handle.

- **`._docs/AI-agent-registry-context-flow-architecture.md`** - Continuity risk analyzer agent specifications if documented. May contain patterns for comparing scene end-states with opening requirements.

- **`._docs/implementation-task-list.md`** - Feature 4.2 checklist (lines 229-235) with specific tasks for scene list UI, navigation, overview panel, continuity analyzer, and pipeline entry action.

---

## Feature 4.3: Stage 7 - Shot List Generator

**Purpose**: Break scenes into timed, technical shots

### Codebase Files

- **`src/components/pipeline/Stage7ShotList.tsx`** - Complete UI implementation (381 lines) with shot table, shot inspector panel, field editing, add/delete/split shot handlers, and RearviewMirror integration. Currently uses mock data. Needs integration with real shot data, LLM-based shot extraction, and auto-save functionality.

- **`backend/migrations/006_shots_table.sql`** - Complete database schema for the `shots` table with all mandatory fields (shot_id, duration, dialogue, action, characters_foreground, characters_background, setting, camera, continuity_flags, beat_reference), constraints, indexes, and RLS policies. This is the foundation for storing shot lists.

- **`src/types/scene.ts`** - `Shot` interface definition (lines 12-25) with all required fields matching the database schema. Essential for type-safe shot handling.

- **`src/pages/ProjectView.tsx`** - Scene workflow routing (lines 200-280) that manages navigation to Stage 7 when entering a scene pipeline. Handles scene stage progression and completion callbacks.

- **`backend/src/services/assetExtractionService.ts`** - Contains LLM integration patterns (lines 76-108) that can be adapted for shot extraction. Shows how to structure LLM prompts for structured data extraction from scripts.

### Documentation Files

- **`._docs/project-overview.md`** - Complete Stage 7 specification (lines 193-210, 551-586) including mandatory shot fields, iterative requirements (splitting/merging, field editing), UI/UX definition, and agentic tooling requirements (shot split/merge agent, field coherence agent).

- **`._docs/AI-agent-registry-context-flow-architecture.md`** - Detailed shot extraction agent specifications (lines 500-577) including system prompts, input/output schemas, shot breakdown rules, continuity requirements, and shot split agent patterns (lines 581-598). This is the authoritative source for LLM-based shot generation.

- **`._docs/database-schema-state-transition-matrix.md`** - `shots` table schema documentation (lines 316-352) with field descriptions and relationships to scenes. Documents shot ordering and production status tracking.

- **`._docs/user-flow.md`** - Stage 7 user flow (lines 177-195) explaining shot list creation, editing workflow, and locking gate requirements.

- **`._docs/implementation-task-list.md`** - Feature 4.3 checklist (lines 237-243) with specific tasks for shots table, LLM agent, UI components, editing, and splitting/merging logic.

---

## Feature 4.4: Rearview Mirror Component

**Purpose**: Display prior scene end-state for continuity

### Codebase Files

- **`src/components/pipeline/RearviewMirror.tsx`** - Complete UI component implementation (97 lines) with collapsible interface, text and visual modes, prior scene end-state display, and frame preview support. Already implemented but needs integration with real data fetching from database.

- **`src/components/pipeline/Stage7ShotList.tsx`** - Integration example (lines 136-140) showing how RearviewMirror is used in Stage 7. Currently uses mock data for `priorSceneEndState` and `priorSceneName`.

- **`src/components/pipeline/Stage10FrameGeneration.tsx`** - Integration example (lines 103-108) showing visual mode usage with `priorEndFrame` prop. Demonstrates how RearviewMirror adapts to different stages.

- **`src/types/scene.ts`** - Scene interface includes `priorSceneEndState` and `endFrameThumbnail` fields (lines 36-37) that RearviewMirror consumes.

- **`backend/src/routes/projects.ts`** - Will need new endpoints to fetch prior scene end-state data including `end_state_summary` and `end_frame_id` from the scenes table for continuity display.

### Documentation Files

- **`._docs/project-overview.md`** - Rearview Mirror specification (lines 559-561) describing its purpose as continuity reference, display requirements (final shot action/dialogue, final frame), and integration points in Stage 7-10.

- **`._docs/implementation-task-list.md`** - Feature 4.4 checklist (lines 245-251) with tasks for UI component, data fetching, display logic, frame preview, and stage integration.

- **`._docs/database-schema-state-transition-matrix.md`** - Documents `end_state_summary` and `end_frame_id` fields in scenes table (lines 302-303) that RearviewMirror needs to fetch and display.

---

## Feature 4.5: Shot List Validation & Locking

**Purpose**: Enforce shot list completeness

### Codebase Files

- **`src/components/pipeline/Stage5Assets.tsx`** - Contains validation and locking patterns (lines 364-397) that can be adapted for shot list validation. Shows how to validate prerequisites, check completeness, display error messages, and implement gatekeeper logic with `lockAllAssets()` and `lockStage()` calls.

- **`backend/src/routes/stageStates.ts`** - Stage locking endpoint (lines 289-404) that implements sequential locking validation, prerequisite checking, and version management. This pattern should be adapted for shot list locking, ensuring all shots are validated before allowing scene status update to "shot_list_ready".

- **`src/components/pipeline/Stage7ShotList.tsx`** - Where validation logic needs to be added. Currently has shot editing but no validation or locking mechanism. Needs "Lock Shot List" button, validation checks, and warning modal for incomplete shots.

- **`src/types/scene.ts`** - Shot interface (lines 12-25) defines all fields that need validation. Scene status types (lines 1-6) include "shot-list-locked" status that should be set when validation passes.

- **`backend/src/routes/projects.ts`** - Will need new endpoints for shot validation, shot list locking, and scene status updates. Should validate required fields, duration limits, and shot coherence before allowing lock.

### Documentation Files

- **`._docs/project-overview.md`** - Stage 7 gatekeeper requirements (lines 191-194) specifying that shot list must be locked before proceeding. May contain validation rules for shot completeness.

- **`._docs/database-schema-state-transition-matrix.md`** - Documents scene status transitions (lines 855-863) including "shot_list_ready" status. Shows how shot list locking affects scene status and downstream invalidation cascades.

- **`._docs/user-flow.md`** - Stage 7 gate requirements (lines 191-194) explaining that user must lock shot list before proceeding to next stage.

- **`._docs/implementation-task-list.md`** - Feature 4.5 checklist (lines 253-259) with specific tasks for field validation, coherence checking, gatekeeper creation, warning modal, and database storage.

- **`._docs/AI-agent-registry-context-flow-architecture.md`** - May contain shot coherence checking patterns if LLM-based validation is required beyond field-level checks.

---

## Cross-Cutting Implementation Resources

### Database & Backend Architecture

- **`._docs/database-schema-state-transition-matrix.md`** - Complete schema documentation for `scenes` and `shots` tables, status transitions, invalidation cascades, and RLS policies. Essential reference for all Phase 4 database operations.

- **`._docs/architecture-and-rules.md`** - Backend architecture patterns, API design conventions, error handling, and database relationship definitions. Useful for implementing new endpoints and services.

- **`backend/migrations/`** - All database migrations including `003_add_scenes_table.sql` and `006_shots_table.sql`. Reference these for exact schema definitions and constraints.

### UI/UX Patterns

- **`._docs/ui-and-theme-rules.md`** - UI component patterns, design system guidelines, and styling conventions. Useful for maintaining consistency in Stage 6 and Stage 7 UI implementations.

- **`._docs/user-flow.md`** - Complete Phase B workflow (lines 163-273) including Stage 6-12 user journeys. Essential for understanding how scenes and shots fit into the overall production pipeline.

### LLM Integration Patterns

- **`._docs/AI-agent-registry-context-flow-architecture.md`** - Comprehensive LLM agent specifications for shot extraction (lines 500-577), shot splitting (lines 581-598), and field coherence regeneration. Contains system prompts, input/output schemas, and validation rules.

- **`backend/src/services/assetExtractionService.ts`** - Example LLM integration patterns that can be adapted for shot extraction. Shows how to structure prompts, handle responses, and manage async operations.

### Stage Management & Routing

- **`src/pages/ProjectView.tsx`** - Main orchestration component for stage navigation. Shows how Phase A stages (1-5) differ from Phase B scene stages (6-12), and how scene workflow is managed separately from project-level stages.

- **`src/lib/services/stageStateService.ts`** - Service for managing stage states and locking. May need extension for scene-level stage management if scenes have their own stage progression.

---

## Current Implementation Status

**Already Implemented:**
- `scenes` table database schema (migration 003)
- `shots` table database schema (migration 006)
- Basic scene extraction logic in `scriptService.extractScenes()`
- Scene persistence API endpoint (`PUT /api/projects/:id/scenes`)
- Stage 6 Script Hub UI component (with mock data)
- Stage 7 Shot List UI component (with mock data)
- RearviewMirror UI component
- TypeScript type definitions for Scene and Shot

**Needs Implementation:**
- Enhanced scene heading parser (DAY/NIGHT detection, more robust boundary detection)
- Scene data fetching API endpoints (GET scenes by branch, scene details)
- Continuity risk analyzer (advisory LLM agent)
- Shot extraction LLM agent (from scene content to shot list)
- Shot data persistence API endpoints (CRUD for shots)
- Shot field editing with auto-save
- LLM-based shot splitting/merging logic
- Shot field coherence agent (regenerates dependent fields on edit)
- Prior scene end-state data fetching for RearviewMirror
- Shot list validation logic (required fields, duration limits, coherence)
- Shot list locking gatekeeper with warning modal
- Scene status update logic (draft → shot_list_ready → frames_locked → video_complete)
- Integration of real data (replace mock data in Stage6 and Stage7 components)

---

## Development Priority Order

1. **Feature 4.1** (Scene Extraction & Parsing) - Foundation for all Phase 4 features
   - Enhance scene extraction parser
   - Implement scene data fetching endpoints
   - Connect Stage 4 to scene persistence

2. **Feature 4.2** (Stage 6 Script Hub) - Navigation layer for Phase B
   - Replace mock data with real scene fetching
   - Implement continuity risk analyzer
   - Add scene status updates

3. **Feature 4.3** (Stage 7 Shot List) - Core production workflow
   - Implement shot extraction LLM agent
   - Build shot CRUD API endpoints
   - Add auto-save and field editing
   - Implement shot splitting/merging

4. **Feature 4.4** (Rearview Mirror) - Continuity support
   - Implement prior scene data fetching
   - Connect to real end-state data
   - Add frame preview support

5. **Feature 4.5** (Shot List Validation & Locking) - Quality gate
   - Implement validation logic
   - Build locking gatekeeper
   - Add warning modals
   - Connect to scene status updates

This guide provides the essential context files needed to implement each Phase 4 feature. Start with the codebase files to understand current implementation status, then reference the documentation files for detailed requirements and specifications.

