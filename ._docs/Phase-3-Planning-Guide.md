# Phase 3: Asset Management & Stage 5 - Planning Guide

This guide identifies the vital context files from your codebase and documentation that are essential for implementing Phase 3 features. Each feature section lists the most relevant files, organized by type (codebase vs docs), with brief explanations of their importance.

## Feature 3.1: Image Generation Service

**Purpose**: Integrate Nano Banana for asset image keys

### Codebase Files
- **`src/lib/services/imageService.ts`** - Core service with mock Nano Banana integration. Contains `generateAssetImageKey()` method that needs real API implementation. Has placeholder TODO comments for actual Nano Banana API calls.
- **`backend/src/services/llm-client.ts`** - May contain patterns for external API integrations that can be adapted for Nano Banana
- **`backend/src/routes/projects.ts`** - Existing project routes where image generation endpoints should be added

### Documentation Files
- **`._docs/tech-stack.md`** - Lists Nano Banana as the image generation provider with cost model details
- **`._docs/API-integration-async-contract.md`** - Contains Nano Banana integration patterns and async handling approaches
- **`._docs/architecture-and-rules.md`** - Defines image generation workflow and Supabase Storage integration requirements
- **`._docs/project-overview.md`** - Specifies Stage 10 image generation requirements that can inform the asset image key approach

## Feature 3.2: Global Asset Library

**Purpose**: Centralized asset management across projects

### Codebase Files
- **`src/components/layout/GlobalSidebar.tsx`** - Contains navigation link to `/assets` route (Asset Library) that needs implementation
- **`src/pages/Index.tsx`** - May contain navigation patterns for implementing the asset library page
- **`backend/src/routes/projects.ts`** - Existing routes where global asset CRUD endpoints should be added

### Documentation Files
- **`._docs/project-overview.md`** - My projects PRD; Explains global-to-local inheritance patterns for assets
- **`._docs/database-schema-state-transition-matrix.md`** - Complete `global_assets` table schema with all fields, constraints, and relationships
- **`._docs/architecture-and-rules.md`** - Defines global asset management patterns, RLS policies, and database relationships
- **`._docs/implementation-task-list.md`** - Feature 3.2 checklist and detailed requirements

## Feature 3.3: Stage 5 - Asset Extraction & Definition

**Purpose**: Parse script and generate visual keys

### Codebase Files
- **`src/components/pipeline/Stage5Assets.tsx`** - Complete UI implementation with asset extraction UI, image key generation workflow, and asset locking gatekeeper. Currently uses mock asset data.
- **`src/lib/services/imageService.ts`** - `generateAssetImageKey()` method called by Stage5Assets component
- **`src/components/styleCapsules/StyleCapsuleSelector.tsx`** - Visual style capsule selection component used in Stage 5
- **`backend/src/services/contextManager.ts`** - May contain Stage 4 script parsing patterns that can be adapted for asset extraction

### Documentation Files
- **`._docs/database-schema-state-transition-matrix.md`** - Stage 5 content schema and asset relationship definitions
- **`._docs/project-overview.md`** - Detailed Stage 5 workflow, asset extraction requirements, and gatekeeper logic
- **`._docs/user-flow.md`** - Stage 5 user experience flow and critical gate requirements
- **`._docs/implementation-task-list.md`** - Feature 3.3 checklist with LLM-based extraction requirements

## Feature 3.4: Project-Level Assets

**Purpose**: Project-specific asset instances

### Codebase Files
- **`src/components/pipeline/Stage5Assets.tsx`** - Contains asset management UI that will need to integrate with project asset storage
- **`backend/src/routes/projects.ts`** - Where project asset CRUD endpoints should be implemented

### Documentation Files
- **`._docs/database-schema-state-transition-matrix.md`** - Complete `project_assets` table schema with inheritance tracking and promotion logic
- **`._docs/architecture-and-rules.md`** - Project asset management patterns and global-to-project inheritance rules
- **`._docs/project-overview.md`** - Asset promotion workflow (project → global) and versioning requirements
- **`._docs/implementation-task-list.md`** - Feature 3.4 checklist and inheritance implementation details

## Feature 3.5: Visual Style Lock

**Purpose**: Enforce consistent visual aesthetic

### Codebase Files
- **`src/components/pipeline/Stage5Assets.tsx`** - Implements visual style selection and locking in Stage 5 UI
- **`src/components/styleCapsules/StyleCapsuleSelector.tsx`** - Core visual style capsule selection component
- **`src/lib/services/imageService.ts`** - Injects visual style context into image generation prompts
- **`src/lib/services/styleCapsuleService.ts`** - Handles visual style capsule data and formatting

### Documentation Files
- **`._docs/Style Capsules — Written & Visual Styling System Specification.md`** - Complete specification for visual style capsules, including structure, prompt injection rules, and Stage 5 locking requirements
- **`._docs/database-schema-state-transition-matrix.md`** - Visual style capsule storage and application tracking
- **`._docs/project-overview.md`** - Visual style lock workflow and global constraint enforcement
- **`._docs/architecture-and-rules.md`** - Visual style injection patterns and deterministic style application

## Cross-Cutting Implementation Resources

### Database & Backend Architecture
- **`._docs/database-schema-state-transition-matrix.md`** - Complete asset management schema including `global_assets`, `project_assets`, and `scene_asset_instances` tables
- **`._docs/architecture-and-rules.md`** - Asset state management, inheritance patterns, and RLS policies

### UI/UX Patterns
- **`._docs/ui-and-theme-rules.md`** - UI component patterns and design system guidelines
- **`._docs/user-flow.md`** - Complete Phase A-B workflow including asset management stages

### Implementation Planning
- **`._docs/implementation-task-list.md`** - Detailed Phase 3 feature checklists and deliverables
- **`._docs/project-overview.md`** - High-level Phase 3 requirements and success criteria

## Current Implementation Status

**Already Implemented:**
- Stage 5 UI component with visual style selection
- Image service with visual style injection
- Database schema for all asset tables
- Navigation structure for asset library

**Needs Implementation:**
- Nano Banana API client and real image generation
- Global asset library UI and backend CRUD
- LLM-based asset extraction from Stage 4 scripts
- Project asset inheritance and promotion logic
- Backend routes for asset management

## Development Priority Order

1. **Feature 3.1** (Image Generation Service) - Foundation for all visual asset creation
2. **Feature 3.3** (Stage 5 Asset Extraction) - Core user workflow for Phase 3
3. **Feature 3.2** (Global Asset Library) - Supporting infrastructure
4. **Feature 3.4** (Project Assets) - Inheritance system
5. **Feature 3.5** (Visual Style Lock) - Already partially implemented, needs completion

This guide provides the essential context files needed to implement each Phase 3 feature. Start with the codebase files for current implementation status, then reference the documentation files for detailed requirements and specifications.
