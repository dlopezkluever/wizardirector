● I've created a comprehensive implementation plan for Stage 9. The plan covers:

  Key Components:
  1. Database Migration - Add frame_prompt, video_prompt, requires_end_frame, and compatible_models columns to shots table
  2. Backend Service - New promptGenerationService.ts using existing LLM client for AI-powered prompt generation
  3. API Endpoints - GET prompts, PUT update, POST bulk generate
  4. Frontend Service - New promptService.ts for API communication
  5. UI Rewrite - Complete overhaul of Stage 9 component with:
    - Bulk "Generate All Prompts" functionality
    - Expandable shot cards with proper UX
    - Frame prompts (locked by default, toggle to edit)
    - Video prompts (always editable)
    - Per-shot regeneration
    - Validation (character limits, forbidden characters)
    - Model compatibility badges
    - Auto-save with debouncing

  Files to be created/modified:
  - backend/migrations/019_stage9_prompts.sql (new)
  - backend/src/services/promptGenerationService.ts (new)
  - backend/src/routes/projects.ts (extend with 3 endpoints)
  - src/lib/services/promptService.ts (new)
  - src/components/pipeline/Stage9PromptSegmentation.tsx (rewrite)
  - src/types/scene.ts (extend interface)

────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── Ready to code?

 Here is Claude's plan:
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌ Stage 9: Prompt Segmentation Implementation Plan

 Overview

 Implement complete Stage 9 functionality for deterministic prompt assembly, allowing users to generate, review, and edit Frame Prompts and Video Prompts for each shot in a scene.

 Current State

 - Frontend: Basic skeleton in src/components/pipeline/Stage9PromptSegmentation.tsx with mock data (267 lines)
 - Types: PromptSet interface exists in src/types/scene.ts
 - Backend: No prompt generation endpoints; shot CRUD exists in backend/src/routes/projects.ts
 - Database: shots table exists but lacks frame_prompt, video_prompt, requires_end_frame columns

 Implementation Tasks

 1. Database Migration

 File: backend/migrations/019_stage9_prompts.sql

 Add columns to the shots table:
 ALTER TABLE shots ADD COLUMN frame_prompt TEXT;
 ALTER TABLE shots ADD COLUMN video_prompt TEXT;
 ALTER TABLE shots ADD COLUMN requires_end_frame BOOLEAN DEFAULT TRUE;
 ALTER TABLE shots ADD COLUMN compatible_models TEXT[] DEFAULT '{"Veo3"}';
 ALTER TABLE shots ADD COLUMN prompts_generated_at TIMESTAMPTZ;

 2. Backend Service: Prompt Generation

 File: backend/src/services/promptGenerationService.ts (new)

 Create service that:
 - Takes shot data + scene asset instances + style capsule
 - Generates Frame Prompt (visual, asset-heavy, spatially explicit)
 - Generates Video Prompt (action/audio focused, minimal visual description)
 - Uses existing llmClient from backend/src/services/llm-client.ts
 - Follows Veo3 format requirements from PRD

 Key functions:
 - generatePromptSet(shot, sceneAssets, styleCapsule): Promise<{ framePrompt, videoPrompt, requiresEndFrame, compatibleModels }>
 - generateBulkPromptSets(shots[], sceneAssets, styleCapsule): Promise<PromptSet[]>
 - Internal helpers for frame prompt assembly and video prompt assembly

 3. Backend API Endpoints

 File: backend/src/routes/projects.ts (extend)

 Add three endpoints:
 GET  /api/projects/:projectId/scenes/:sceneId/prompts
      - Returns all shots with their prompts for the scene

 PUT  /api/projects/:projectId/scenes/:sceneId/shots/:shotId/prompts
      - Update frame_prompt and/or video_prompt for a single shot

 POST /api/projects/:projectId/scenes/:sceneId/generate-prompts
      - Bulk generate prompts for all shots in scene (or specific shotIds)
      - Body: { shotIds?: string[] } (optional, defaults to all)

 4. Frontend Service

 File: src/lib/services/promptService.ts (new)

 Create frontend service with methods:
 - fetchPrompts(projectId, sceneId): Promise<PromptSet[]>
 - updatePrompt(projectId, sceneId, shotId, updates): Promise<void>
 - generatePrompts(projectId, sceneId, shotIds?): Promise<PromptSet[]>

 5. Frontend Component Rewrite

 File: src/components/pipeline/Stage9PromptSegmentation.tsx

 Complete rewrite with improved UI/UX:

 Data Flow:
 - Fetch real shot data and prompts via promptService
 - Use React Query for caching and optimistic updates
 - Auto-save edits with debouncing (500ms)

 UI Components:
 1. Header Section
   - Title with stage icon
   - "Generate All Prompts" button (triggers bulk LLM generation)
   - Generation status indicator (loading spinner)
 2. Shot Cards (expandable, one per shot)
   - Shot badge (e.g., "Shot 1A")
   - Quick status indicators (has prompts, needs end frame, etc.)
   - Expand/collapse animation (framer-motion)
 3. Expanded Card Content
   - Frame Prompt Section
       - Label with image icon
     - "Read-only by default" indicator with lock icon
     - Toggle switch to enable editing
     - Textarea (disabled when locked)
     - Character count + validation warning (>500 chars)
     - "Regenerate" button (per-shot)
   - Video Prompt Section
       - Label with video icon
     - "Always Editable" badge
     - Textarea (always enabled)
     - Character count
     - "Regenerate" button (per-shot)
   - Model Compatibility Footer
       - Badges for compatible models (Veo3, Runway Gen-3, etc.)
     - End frame requirement indicator
 4. Footer
   - "Back to Visuals" button
   - "Proceed to Frame Generation" button (disabled until all prompts exist)

 Validation Rules:
 - Frame prompt max length: 1000 characters (warning at 500)
 - Video prompt max length: 800 characters (warning at 400)
 - No empty prompts before proceeding
 - Forbidden characters check (specific to model requirements)

 6. Types Update

 File: src/types/scene.ts

 Extend PromptSet interface:
 export interface PromptSet {
   shotId: string;
   shotUuid: string; // Database UUID for API calls
   framePrompt: string;
   videoPrompt: string;
   systemPrompt?: string;
   requiresEndFrame: boolean;
   compatibleModels: string[];
   promptsGeneratedAt?: string;
   // UI state (not persisted)
   isGenerating?: boolean;
   hasChanges?: boolean;
 }

 File Modification Summary
 ┌──────────────────────────────────────────────────────┬─────────┬───────────────────────────────────┐
 │                         File                         │ Action  │            Description            │
 ├──────────────────────────────────────────────────────┼─────────┼───────────────────────────────────┤
 │ backend/migrations/019_stage9_prompts.sql            │ Create  │ Add prompt columns to shots table │
 ├──────────────────────────────────────────────────────┼─────────┼───────────────────────────────────┤
 │ backend/src/services/promptGenerationService.ts      │ Create  │ LLM-based prompt generation       │
 ├──────────────────────────────────────────────────────┼─────────┼───────────────────────────────────┤
 │ backend/src/routes/projects.ts                       │ Modify  │ Add 3 new API endpoints           │
 ├──────────────────────────────────────────────────────┼─────────┼───────────────────────────────────┤
 │ src/lib/services/promptService.ts                    │ Create  │ Frontend API service              │
 ├──────────────────────────────────────────────────────┼─────────┼───────────────────────────────────┤
 │ src/components/pipeline/Stage9PromptSegmentation.tsx │ Rewrite │ Complete UI overhaul              │
 ├──────────────────────────────────────────────────────┼─────────┼───────────────────────────────────┤
 │ src/types/scene.ts                                   │ Modify  │ Extend PromptSet interface        │
 └──────────────────────────────────────────────────────┴─────────┴───────────────────────────────────┘
 LLM Prompt Templates

 Frame Prompt System Prompt

 You are a visual prompt engineer for AI image generation. Generate detailed, visually descriptive prompts that:
 - Reference specific character appearances from provided asset descriptions
 - Include precise camera specifications (shot type, angle, movement)
 - Describe spatial composition and blocking
 - Incorporate style capsule aesthetic directives
 - Focus on the START frame moment (frozen visual snapshot)

 Video Prompt System Prompt

 You are a video prompt engineer for AI video generation (Veo3). Generate prompts that:
 - Focus on ACTION and MOTION, not static visual description
 - Include precise dialogue with delivery instructions (whispered, shouted, etc.)
 - Specify sound effects and ambient audio
 - Describe character movements and interactions
 - Assume anchor frames encode visual truth - DO NOT repeat visual descriptions
 - Follow Veo3 format: [Camera]. [Character] [Action]. Audio: [SFX]. "[Dialogue]"

 Verification Plan

 1. Database: Run migration, verify columns added with \d shots
 2. API: Test endpoints with curl/Postman:
   - GET prompts for a scene
   - POST generate prompts
   - PUT update single prompt
 3. Frontend:
   - Load Stage 9 for a scene with existing shots
   - Click "Generate All Prompts" and verify LLM call
   - Edit frame prompt (unlock toggle, type, verify auto-save)
   - Edit video prompt (verify immediate editability)
   - Regenerate single shot
   - Click "Proceed" and verify validation
 4. Lint: Run npm run lint in project root

 Dependencies

 - Existing llmClient service
 - Existing shot CRUD in shotService.ts
 - Scene asset instances from Stage 8
 - Style capsule data (if available)
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌