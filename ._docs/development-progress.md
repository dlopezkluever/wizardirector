# Aiuteur - Development Progress Report

**Last Updated:** February 3, 2026
**Phases Completed:** 0-5
**Project Status:** Complete Asset Inheritance System with Stage 8 Visual Definition

---

## Executive Summary

Aiuteur is a narrative-to-AI-film pipeline web application implementing a deterministic 12-stage workflow. This document provides a comprehensive overview of the **current implemented state** (not planned features) covering system architecture, database structure, service implementations, and UI components as they exist today.

### What This Document Covers
- ✅ **Implemented features and architecture**
- ✅ **Current database schema (14 migrations)**
- ✅ **Working frontend and backend services**
- ✅ **Integration patterns and data flow**
- ❌ **NOT planned/future features**

---

## Table of Contents

1. [System Architecture Overview](#system-architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Backend Database Schema](#backend-database-schema)
4. [Backend API Structure](#backend-api-structure)
5. [Frontend Architecture](#frontend-architecture)
6. [Service Interactions & Data Flow](#service-interactions--data-flow)
7. [Project Directory Structure](#project-directory-structure)
8. [Phase Implementation Status](#phase-implementation-status)
9. [Testing Infrastructure](#testing-infrastructure)
10. [Known Limitations & Technical Debt](#known-limitations--technical-debt)

---

## System Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)                      │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ • React 18 + TypeScript + shadcn/ui                        │ │
│  │ • Zustand (Auth) + React Query (Server State)              │ │
│  │ • React Router (Routing)                                   │ │
│  │ • TipTap (Rich Text Editing)                               │ │
│  │ • @dnd-kit (Drag & Drop)                                   │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                   ↓ HTTP/REST APIs
┌──────────────────────────────────────────────────────────────────┐
│                 Backend (Express + TypeScript)                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ • Express.js API Server                                     │ │
│  │ • Supabase Client (Database Access)                         │ │
│  │ • LLM Integrations (Gemini, OpenAI, Anthropic)             │ │
│  │ • LangSmith (Observability)                                 │ │
│  │ • Nano Banana (Image Generation - in progress)             │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
                                   ↓
┌─────────────────────────────────────────────────────────────────┐
│                 Data Layer (Supabase PostgreSQL)                │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ • PostgreSQL 15+ with Row Level Security (RLS)             │ │
│  │ • 14 Applied Migrations                                     │ │
│  │ • Git-style Branching System                                │ │
│  │ • Asset Management (Global & Project-scoped)               │ │
│  │ • Style Capsule System (Writing & Visual)                  │ │
│  │ • Supabase Storage (Images, Videos)                        │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Design Principles (Implemented)

1. **Immutability by Default**: Completed stages create new versions rather than mutating in place
2. **Explicit Inheritance Tracking**: Every artifact records its inheritance chain
3. **Git-Style Branching**: Non-linear project evolution with full audit trail
4. **Asset State Propagation**: Master assets → Project assets → Scene instances
5. **Style Capsule System**: Deterministic style injection (no embeddings/RAG)

---

## Technology Stack

### Frontend (Port 5173 - Vite Dev Server)

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| **Framework** | React | 18.3.1 | UI rendering |
| **Language** | TypeScript | 5.8.3 | Type safety |
| **Build Tool** | Vite | 5.4.19 | Fast dev server & bundling |
| **UI Library** | shadcn/ui | Latest | Radix UI + Tailwind components |
| **Styling** | Tailwind CSS | 3.4.17 | Utility-first CSS |
| **State Management** | Zustand | 5.0.9 | Auth state |
| **Server State** | React Query | 5.83.0 | API data fetching/caching |
| **Routing** | React Router | 6.30.1 | Client-side routing |
| **Rich Text** | TipTap | 3.15.3 | Screenplay editor |
| **Drag & Drop** | @dnd-kit | 6.3.1 | Beat sheet reordering |
| **Animations** | Framer Motion | 12.23.26 | UI transitions |
| **Forms** | React Hook Form | 7.61.1 | Form management |
| **Validation** | Zod | 3.25.76 | Schema validation |

### Backend (Port 3001 - Express Server)

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| **Framework** | Express.js | 4.18.2 | HTTP API server |
| **Language** | TypeScript | 5.3.3 | Type safety |
| **Database Client** | Supabase JS | 2.89.0 | PostgreSQL access + Auth |
| **LLM Integration** | Google Generative AI | 0.24.1 | Gemini models |
| **LLM Integration** | LangChain | 2.1.3 | LLM abstraction |
| **Observability** | LangSmith | 0.4.4 | Trace logging |
| **Image Generation** | Gemini (Nano Banana) | Custom | Asset image keys |
| **Testing** | Jest | 29.7.0 | Unit/integration tests |
| **Security** | Helmet | 7.1.0 | Security headers |
| **Validation** | Zod | 3.22.4 | Input validation |

### Database & Storage

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Database** | PostgreSQL 15+ | Relational data storage |
| **Hosting** | Supabase | Managed Postgres + Auth |
| **Storage** | Supabase Storage | S3-compatible object storage |
| **RLS** | PostgreSQL RLS | Row-level security policies |

---

## Backend Database Schema

### Database Statistics

- **Applied Migrations:** 17
- **Core Tables:** 12
- **Junction Tables:** 2
- **Triggers:** 3 (branch creation, shot list locking, scene asset modification tracking)
- **Functions:** 3
- **RLS Policies:** 40+

### Core Tables (As Implemented)

#### 1. `projects` - Top-level Project Container

**Purpose:** Stores project configuration and Stage 1 parameters

**Key Fields:**
- `id` (UUID, PK)
- `user_id` (UUID, FK → auth.users)
- `title` (TEXT)
- `target_length_min/max` (INTEGER) - seconds
- `project_type` (TEXT) - 'narrative' | 'commercial' | 'audio_visual'
- `content_rating` (TEXT) - 'G' | 'PG' | 'PG-13' | 'M'
- `genre` (TEXT[])
- `tonal_precision` (TEXT)
- `writing_style_capsule_id` (UUID, FK → style_capsules)
- `visual_style_capsule_id` (UUID, FK → style_capsules)
- `active_branch_id` (UUID, FK → branches)

**Status:** ✅ Fully implemented with automatic Main branch creation trigger

---

#### 2. `branches` - Git-Style Version Control

**Purpose:** Enable non-linear project evolution with branching

**Key Fields:**
- `id` (UUID, PK)
- `project_id` (UUID, FK → projects)
- `name` (TEXT, unique per project)
- `parent_branch_id` (UUID, FK → branches, nullable)
- `commit_message` (TEXT)
- `is_main` (BOOLEAN)

**Constraints:**
- Unique index on (project_id, name)
- Only one main branch per project

**Status:** ✅ Implemented with automatic creation trigger

---

#### 3. `stage_states` - Versioned Pipeline State

**Purpose:** Store content and metadata for each pipeline stage

**Key Fields:**
- `id` (UUID, PK)
- `branch_id` (UUID, FK → branches)
- `stage_number` (INTEGER, 1-12)
- `version` (INTEGER)
- `status` (TEXT) - 'draft' | 'locked' | 'invalidated' | 'outdated'
- `inherited_from_stage_id` (UUID, FK → stage_states, nullable)
- `content` (JSONB) - Stage-specific data
- `prompt_template_version` (TEXT)
- `final_prompt` (TEXT)
- `langsmith_trace_id` (TEXT) - Added in migration 002
- `regeneration_guidance` (TEXT)
- `created_by` (UUID, FK → auth.users)

**Unique Constraint:** (branch_id, stage_number, version)

**JSONB Content Schemas:**

```typescript
// Stage 2: Treatment
{
  prose_treatment: string,
  selected_variant: number
}

// Stage 3: Beat Sheet
{
  beats: Array<{
    id: string,
    order: number,
    text: string,
    manually_edited: boolean
  }>,
  sync_status: 'synced' | 'out_of_date_with_script'
}

// Stage 4: Master Script
{
  formatted_script: string,
  scenes: Array<{
    id: string,
    slug: string,
    heading: string,
    content: string
  }>,
  sync_status: 'synced' | 'out_of_date_with_beats'
}

// Stage 7: Shot List
{
  scene_id: UUID,
  shots: Array<{
    shot_id: string,
    duration: number,
    dialogue: string,
    action: string,
    characters: Array<{name: string, prominence: string}>,
    setting: string,
    camera: string,
    continuity_flags: string[]
  }>
}
```

**Status:** ✅ Implemented with LangSmith integration

---

#### 4. `scenes` - Scene-Level Organization (Migration 003)

**Purpose:** Break down Stage 4 script into scene-based production units

**Key Fields:**
- `id` (UUID, PK)
- `branch_id` (UUID, FK → branches)
- `scene_number` (INTEGER)
- `slug` (TEXT) - e.g., "INT. KITCHEN - DAY"
- `script_excerpt` (TEXT)
- `status` (TEXT) - 'draft' | 'shot_list_ready' | 'frames_locked' | 'video_complete' | 'outdated' | 'continuity_broken'
- `end_state_summary` (TEXT)
- `end_frame_id` (UUID, FK → frames, nullable)
- `shot_list_locked_at` (TIMESTAMPTZ) - Added in migration 014
- `end_frame_thumbnail_url` (TEXT) - Added in migration 013
- `dependencies` (JSONB) - Added in migration 011

**Dependencies JSONB Structure:**
```typescript
{
  characters: string[],
  locations: string[],
  props: string[],
  extractedAt: string (ISO timestamp)
}
```

**Unique Constraint:** (branch_id, scene_number)

**Status:** ✅ Implemented with shot list locking trigger (migration 014)

**Trigger:** `fn_sync_scene_lock_status()` automatically syncs status with `shot_list_locked_at`:
- Lock: `shot_list_locked_at NOT NULL` → `status = 'shot_list_ready'`
- Unlock: `shot_list_locked_at NULL` → `status = 'draft'` (only if was shot_list_ready)

---

#### 5. `shots` - 8-Second Shot Definitions (Migration 006)

**Purpose:** Store Stage 7 technical shot list data

**Key Fields:**
- `id` (UUID, PK)
- `scene_id` (UUID, FK → scenes)
- `shot_id` (TEXT) - e.g., "3A", "3B"
- `shot_order` (INTEGER) - Added in migration 012
- `duration` (INTEGER, default 8) - seconds
- `dialogue` (TEXT)
- `action` (TEXT)
- `characters` (JSONB) - [{name, prominence}]
- `setting` (TEXT)
- `camera_spec` (TEXT)
- `continuity_flags` (TEXT[])
- `frame_prompt` (TEXT) - Stage 9
- `video_prompt` (TEXT) - Stage 9
- `requires_end_frame` (BOOLEAN, default TRUE)
- `frames_approved` (BOOLEAN)
- `video_approved` (BOOLEAN)

**Unique Constraint:** (scene_id, shot_id)

**Status:** ✅ Implemented with shot order support

---

#### 6. `style_capsule_libraries` - Style Capsule Collections (Migration 004)

**Purpose:** User-created or preset style capsule libraries

**Key Fields:**
- `id` (UUID, PK)
- `user_id` (UUID, FK → auth.users, nullable for presets)
- `name` (TEXT)
- `description` (TEXT)
- `is_preset` (BOOLEAN)

**Status:** ✅ Implemented (Migration 005 made library_id optional in style_capsules)

---

#### 7. `style_capsules` - Style Capsule Storage (Migration 004)

**Purpose:** Store writing and visual style capsules for deterministic style injection

**Key Fields:**
- `id` (UUID, PK)
- `library_id` (UUID, FK → style_capsule_libraries, nullable after migration 005)
- `user_id` (UUID, FK → auth.users, nullable for presets)
- `name` (TEXT)
- `type` (TEXT) - 'writing' | 'visual'
- **Writing Style Fields:**
  - `example_text_excerpts` (TEXT[])
  - `style_labels` (TEXT[])
  - `negative_constraints` (TEXT[])
  - `freeform_notes` (TEXT)
- **Visual Style Fields:**
  - `design_pillars` (JSONB)
  - `reference_image_urls` (TEXT[])
  - `descriptor_strings` (TEXT)
- `is_preset` (BOOLEAN)
- `is_favorite` (BOOLEAN)

**Status:** ✅ Implemented with library-optional support

**Design Note:** This replaces the original RAG (Retrieval Augmented Generation) system with explicit, deterministic style injection using plain text + metadata (no embeddings).

---

#### 8. `style_capsule_applications` - Audit Log (Migration 004)

**Purpose:** Track which style capsules were applied to which stage states

**Key Fields:**
- `id` (UUID, PK)
- `stage_state_id` (UUID, FK → stage_states)
- `style_capsule_id` (UUID, FK → style_capsules)
- `applied_at` (TIMESTAMPTZ)
- `injection_context` (JSONB)

**Status:** ✅ Implemented

---

#### 9. `global_assets` - Reusable Master Assets (Migration 008)

**Purpose:** User-owned reusable assets across all projects

**Key Fields:**
- `id` (UUID, PK)
- `user_id` (UUID, FK → auth.users)
- `name` (TEXT)
- `asset_type` (TEXT) - 'character' | 'prop' | 'location'
- `description` (TEXT)
- `image_key_url` (TEXT) - Nano Banana generated image
- `visual_style_capsule_id` (UUID, FK → style_capsules)
- `voice_profile_id` (TEXT) - For future ElevenLabs integration
- `promoted_from_project_id` (UUID, FK → projects, nullable)
- `image_generation_job_id` (UUID, FK → image_generation_jobs) - Added in migration 010

**Status:** ✅ Implemented with image generation tracking

---

#### 10. `project_assets` - Project-Specific Assets (Migration 008)

**Purpose:** Project-scoped asset instances (Stage 5)

**Key Fields:**
- `id` (UUID, PK)
- `project_id` (UUID, FK → projects)
- `global_asset_id` (UUID, FK → global_assets, nullable)
- `name` (TEXT)
- `asset_type` (TEXT) - 'character' | 'prop' | 'location'
- `description` (TEXT)
- `image_key_url` (TEXT)
- `visual_style_capsule_id` (UUID, FK → style_capsules)
- `locked` (BOOLEAN) - Stage 5 gatekeeper
- `image_generation_job_id` (UUID, FK → image_generation_jobs) - Added in migration 009
- `global_asset_version` (INTEGER) - Added in migration 009

**Status:** ✅ Implemented with asset versioning (migration 009)

---

#### 11. `image_generation_jobs` - Async Image Generation Queue (Migration 007)

**Purpose:** Track async image generation requests to Nano Banana API

**Key Fields:**
- `id` (UUID, PK)
- `idempotency_key` (TEXT)
- `project_id` (UUID, FK → projects)
- `branch_id` (UUID, FK → branches, nullable)
- `scene_id` (UUID, FK → scenes, nullable)
- `shot_id` (UUID, FK → shots, nullable)
- `asset_id` (UUID) - No FK constraint (flexible reference to project_assets or global_assets)
- `job_type` (TEXT) - 'master_asset' | 'start_frame' | 'end_frame' | 'inpaint'
- `status` (TEXT) - 'queued' | 'processing' | 'generating' | 'uploading' | 'completed' | 'failed'
- `failure_stage` (TEXT) - 'generating' | 'uploading' | 'persisting'
- `attempt_count` (INTEGER, default 0)
- `retry_count` (INTEGER, default 0)
- `max_retries` (INTEGER, default 3)
- `error_code` (TEXT) - TEMPORARY | PERMANENT | RATE_LIMIT | AUTH_ERROR
- `error_message` (TEXT)
- `prompt` (TEXT)
- `visual_style_capsule_id` (UUID, FK → style_capsules)
- `width/height` (INTEGER)
- `storage_path` (TEXT)
- `public_url` (TEXT)
- `cost_credits` (NUMERIC)
- `provider_metadata` (JSONB)
- Timestamps: `created_at`, `processing_started_at`, `generating_started_at`, `uploading_started_at`, `completed_at`

**Indexes:**
- `idx_image_jobs_project` on project_id
- `idx_image_jobs_status` on status
- `idx_image_jobs_branch` on branch_id
- `idx_image_jobs_created` on created_at
- `idx_image_jobs_idempotency` (unique) on (project_id, idempotency_key) WHERE idempotency_key IS NOT NULL

**Status:** ✅ Implemented (Phase 3 addition)

**Design Note:** This table implements the async job queue system for Phase 3's "Image Generation Service" feature, enabling tracked, retryable image generation with polling/status endpoints.

---

#### 12. `scene_asset_instances` - Scene-Specific Asset Variations (Migration 015)

**Purpose:** Track asset state changes across scenes with inheritance and modification tracking

**Key Fields:**
- `id` (UUID, PK)
- `scene_id` (UUID, FK → scenes)
- `project_asset_id` (UUID, FK → project_assets)
- `description_override` (TEXT, nullable) - Scene-specific description changes
- `image_key_url` (TEXT, nullable) - Scene-specific generated image
- `status_tags` (TEXT[]) - Visual conditions (muddy, bloody, torn, locked)
- `carry_forward` (BOOLEAN, default TRUE) - Whether tags persist to next scene
- `inherited_from_instance_id` (UUID, FK → scene_asset_instances, nullable)
- `modification_count` (INTEGER, default 0) - Incremented on each update
- `last_modified_field` (TEXT) - Which field was last changed
- `modification_reason` (TEXT) - User-supplied reason for modification
- `effective_description` (COMPUTED) - Resolved description (override or base)

**Unique Constraint:** (scene_id, project_asset_id)

**Trigger:** `scene_asset_modification_tracker` automatically updates `modification_count` and `last_modified_field` on any update

**Status:** ✅ Implemented with full audit trail (Migration 015-017)

**Design Note:** This table enables stateful asset management where assets can evolve across scenes (muddy to clean, injured to healed) while maintaining inheritance chains and modification history.

---

### Database Relationships Diagram

```
projects (1) ──→ (N) branches
branches (1) ──→ (N) stage_states
branches (1) ──→ (N) scenes
scenes (1) ──→ (N) shots
scenes (1) ──→ (N) scene_asset_instances

style_capsule_libraries (1) ──→ (N) style_capsules
style_capsules (N) ←── (N) style_capsule_applications ──→ (N) stage_states

global_assets (N) ←── (N) project_assets
project_assets (N) ──→ (1) projects
project_assets (1) ──→ (N) scene_asset_instances

scene_asset_instances (N) ──→ (1) scene_asset_instances (inheritance chain)

image_generation_jobs (N) ──→ (1) projects
image_generation_jobs (N) ──→ (1) global_assets (via image_generation_job_id)
image_generation_jobs (N) ──→ (1) project_assets (via image_generation_job_id)
image_generation_jobs (N) ──→ (1) scene_asset_instances (via image_generation_job_id)
```

---

### Row Level Security (RLS) Implementation

**Enabled Tables:** All (projects, branches, stage_states, scenes, shots, style_capsules, global_assets, project_assets, image_generation_jobs)

**Policy Pattern:**
- Users can only access data from projects they own (`projects.user_id = auth.uid()`)
- Preset style capsules are visible to all authenticated users
- Cascading policies via EXISTS clauses for nested resources

**Example Policy (branches):**
```sql
CREATE POLICY "Users can view own project branches" ON branches
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = branches.project_id
            AND projects.user_id = auth.uid()
        )
    );
```

---

### Database Triggers

#### 1. `create_initial_branch()` (Migration 001)

**Purpose:** Automatically create "Main" branch when project is created

**Behavior:**
- Inserts new branch with `is_main = TRUE`
- Sets `projects.active_branch_id` to newly created branch

**Status:** ✅ Active

---

#### 2. `fn_sync_scene_lock_status()` (Migration 014)

**Purpose:** Auto-sync scene status with shot list locking state

**Behavior:**
- **Lock:** When `shot_list_locked_at` changes from NULL → TIMESTAMPTZ, sets `status = 'shot_list_ready'`
- **Unlock:** When `shot_list_locked_at` changes from TIMESTAMPTZ → NULL, reverts `status = 'draft'` (only if was shot_list_ready)
- Prevents accidentally reverting downstream statuses (frames_locked, video_complete)

**Status:** ✅ Active (Critical for Stage 7 workflow)

---

#### 3. `scene_asset_modification_tracker()` (Migration 017)

**Purpose:** Auto-track modifications to scene asset instances for audit trail

**Behavior:**
- **Before Update:** Increments `modification_count` by 1
- **Field Detection:** Sets `last_modified_field` to first changed field (priority order: `description_override`, `status_tags`, `image_key_url`, `carry_forward`)
- **Reason Tracking:** `modification_reason` is set only via API calls, not by trigger
- Enables complete audit trail for asset state changes across scenes

**Status:** ✅ Active (Critical for Phase 5 asset inheritance tracking)

---

## Backend API Structure

### API Server Configuration

- **Port:** 3001
- **Framework:** Express.js
- **Middleware:** Helmet (security), CORS, JSON body parser (10mb limit)
- **Authentication:** Supabase JWT via `authenticateUser` middleware

### Implemented Routes

#### 1. `/api/health` (Public)

**Purpose:** Health check endpoint

**Methods:**
- `GET /api/health` - Returns server status

**Status:** ✅ Implemented

---

#### 2. `/api/projects` (Protected)

**Purpose:** Project CRUD operations

**Methods:**
- `GET /api/projects` - List user projects
- `GET /api/projects/:id` - Get project by ID
- `POST /api/projects` - Create new project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

**Status:** ✅ Implemented

---

#### 3. `/api/projects/:projectId/stage-:stageNumber` (Protected)

**Purpose:** Stage state management (nested under projects)

**Methods:**
- `GET /api/projects/:projectId/stage-:stageNumber` - Get current stage state
- `POST /api/projects/:projectId/stage-:stageNumber` - Save/update stage state
- `PUT /api/projects/:projectId/stage-:stageNumber/lock` - Lock stage

**Status:** ✅ Implemented

---

#### 4. `/api/projects/:projectId/scenes` (Protected)

**Purpose:** Scene management

**Methods:**
- `GET /api/projects/:projectId/scenes` - List scenes for active branch
- `GET /api/projects/:projectId/scenes/:sceneId` - Get scene by ID
- `POST /api/projects/:projectId/scenes` - Create scene
- `PUT /api/projects/:projectId/scenes/:sceneId` - Update scene
- `DELETE /api/projects/:projectId/scenes/:sceneId` - Delete scene

**Status:** ✅ Implemented

---

#### 5. `/api/projects/:projectId/scenes/:sceneId/shots` (Protected)

**Purpose:** Shot list management

**Methods:**
- `GET /api/projects/:projectId/scenes/:sceneId/shots` - Get shot list
- `POST /api/projects/:projectId/scenes/:sceneId/shots` - Create shot
- `PUT /api/projects/:projectId/scenes/:sceneId/shots/:shotId` - Update shot
- `DELETE /api/projects/:projectId/scenes/:sceneId/shots/:shotId` - Delete shot
- `POST /api/projects/:projectId/scenes/:sceneId/shots/:shotId/split` - Split shot
- `POST /api/projects/:projectId/scenes/:sceneId/shots/merge` - Merge shots
- `PUT /api/projects/:projectId/scenes/:sceneId/shots/lock` - Lock shot list (Stage 7 gatekeeper)
- `PUT /api/projects/:projectId/scenes/:sceneId/shots/unlock` - Unlock shot list

**Status:** ✅ Implemented with validation and locking (Phase 4.5)

---

#### 6. `/api/projects/:projectId/assets` (Protected)

**Purpose:** Project asset management

**Methods:**
- `GET /api/projects/:projectId/assets` - List project assets
- `POST /api/projects/:projectId/assets` - Create project asset
- `PUT /api/projects/:projectId/assets/:assetId` - Update project asset
- `DELETE /api/projects/:projectId/assets/:assetId` - Delete project asset

**Status:** ✅ Implemented

---

#### 7. `/api/llm` (Protected)

**Purpose:** LLM generation endpoints

**Methods:**
- `POST /api/llm/treatment` - Generate treatment (Stage 2)
- `POST /api/llm/beat-sheet` - Generate beat sheet (Stage 3)
- `POST /api/llm/script` - Generate master script (Stage 4)
- `POST /api/llm/assets/extract` - Extract assets from script (Stage 5)
- `POST /api/llm/shots/extract` - Extract shots from scene (Stage 7)

**Status:** ✅ Implemented with LangSmith tracing

---

#### 8. `/api/style-capsules` (Protected)

**Purpose:** Style capsule management

**Methods:**
- `GET /api/style-capsules` - List user style capsules (+ presets)
- `GET /api/style-capsules/:id` - Get style capsule by ID
- `POST /api/style-capsules` - Create style capsule
- `PUT /api/style-capsules/:id` - Update style capsule
- `DELETE /api/style-capsules/:id` - Delete style capsule

**Status:** ✅ Implemented

---

#### 9. `/api/images` (Protected)

**Purpose:** Image generation (Nano Banana integration)

**Methods:**
- `POST /api/images/generate` - Request image generation
- `GET /api/images/jobs/:jobId` - Get job status
- `GET /api/images/jobs` - List image generation jobs

**Status:** 🔶 Partially implemented (service layer exists, integration pending)

---

#### 10. `/api/assets` (Protected)

**Purpose:** Global asset management

**Methods:**
- `GET /api/assets` - List user global assets
- `GET /api/assets/:id` - Get global asset by ID
- `POST /api/assets` - Create global asset
- `PUT /api/assets/:id` - Update global asset
- `DELETE /api/assets/:id` - Delete global asset

**Status:** ✅ Implemented

---

#### 11. `/api/projects/:projectId/scenes/:sceneId/assets` (Protected)

**Purpose:** Scene asset instance management (stateful asset inheritance)

**Methods:**
- `GET /api/projects/:projectId/scenes/:sceneId/assets` - List scene asset instances with joined project_asset data
- `POST /api/projects/:projectId/scenes/:sceneId/assets` - Create scene asset instance
- `PUT /api/projects/:projectId/scenes/:sceneId/assets/:instanceId` - Update instance (description, image_key_url, status_tags, carry_forward)
- `DELETE /api/projects/:projectId/scenes/:sceneId/assets/:instanceId` - Delete scene asset instance
- `POST /api/projects/:projectId/scenes/:sceneId/assets/inherit` - Inherit assets from prior scene
- `POST /api/projects/:projectId/scenes/:sceneId/assets/detect-relevance` - AI-powered relevant asset detection
- `POST /api/projects/:projectId/scenes/:sceneId/assets/:instanceId/generate-image` - Generate scene-specific image key

**Status:** ✅ Implemented with full CRUD, inheritance, and AI detection (Phase 5)

---

### Backend Services

#### Core Services (Implemented)

1. **`llm-client.ts`** - LLM abstraction layer with LangSmith tracing
2. **`contextManager.ts`** - Global vs. Local context separation with scene asset instance support
3. **`styleCapsuleService.ts`** - Style capsule retrieval and formatting
4. **`assetExtractionService.ts`** - Extract assets from script (Stage 5)
5. **`assetDescriptionMerger.ts`** - Merge asset descriptions across script
6. **`shotExtractionService.ts`** - Extract shots from scene (Stage 7)
7. **`shotValidationService.ts`** - Validate shot list completeness (Stage 7)
8. **`shotSplitService.ts`** - Split shot logic
9. **`shotMergeService.ts`** - Merge shots logic
10. **`continuityRiskAnalyzer.ts`** - Scene dependency risk analysis (Stage 6)
11. **`sceneDependencyExtraction.ts`** - Extract character/location/prop dependencies
12. **`ImageGenerationService.ts`** - Async image generation orchestration (including scene_asset support)
13. **`NanoBananaClient.ts`** - Nano Banana API integration
14. **`assetInheritanceService.ts`** - Scene asset inheritance logic and prior scene analysis (Phase 5)
15. **`sceneAssetRelevanceService.ts`** - AI-powered asset relevance detection for scenes (Phase 5)

---

## Frontend Architecture

### Application Structure

```
Frontend (React + TypeScript)
├── Auth System (Supabase Auth)
│   ├── Login/Signup
│   └── Protected Routes
├── Global Navigation
│   ├── Dashboard (Project List)
│   ├── Style Capsule Library
│   └── Asset Library
└── Project View (Pipeline Workflow)
    ├── Phase A Timeline (Stages 1-5)
    │   ├── Stage 1: Input Mode
    │   ├── Stage 2: Treatment
    │   ├── Stage 3: Beat Sheet
    │   ├── Stage 4: Master Script
    │   └── Stage 5: Global Assets
    └── Phase B (Stages 6-12)
        ├── Stage 6: Script Hub (Scene List)
        ├── Stage 7: Shot List
        ├── Stage 8: Visual Definition
        ├── Stage 9: Prompt Segmentation
        ├── Stage 10: Frame Generation
        ├── Stage 11: Confirmation
        └── Stage 12: Video Review
```

### Implemented Frontend Components

#### Layout Components (✅ Complete)

1. **`MainLayout.tsx`** - Global sidebar + content area
2. **`GlobalSidebar.tsx`** - Persistent navigation (Dashboard, Style Capsules, Assets)
3. **`ProjectHeader.tsx`** - Project-specific header with branch/version controls

#### Dashboard Components (✅ Complete)

1. **`Dashboard.tsx`** - Project listing page
2. **`ProjectCard.tsx`** - Project card with progress meter
3. **`NewProjectCard.tsx`** - "+ New Project" card
4. **`NewProjectDialog.tsx`** - Project creation modal

#### Pipeline Stage Components (Implementation Status)

| Stage | Component | Status | Notes |
|-------|-----------|--------|-------|
| 1 | `Stage1InputMode.tsx` | ✅ Complete | Multi-file staging, 4 modes |
| 2 | `Stage2Treatment.tsx` | ✅ Complete | TipTap editor, variant selection |
| 3 | `Stage3BeatSheet.tsx` | ✅ Complete | Drag & drop (@dnd-kit) |
| 4 | `Stage4MasterScript.tsx` | ✅ Complete | Custom screenplay editor |
| 5 | `Stage5Assets.tsx` | ✅ Complete | Asset extraction + image gen |
| 6 | `Stage6ScriptHub.tsx` | ✅ Complete | Scene list with status |
| 7 | `Stage7ShotList.tsx` | ✅ Complete | Shot table with validation |
| 8 | `Stage8VisualDefinition.tsx` | ✅ Complete | Full asset inheritance & status tag system |
| 9 | `Stage9PromptSegmentation.tsx` | 🔶 Stubbed | Prompt merger UI |
| 10 | `Stage10FrameGeneration.tsx` | 🔶 Stubbed | Frame gen UI |
| 11 | `Stage11Confirmation.tsx` | 🔶 Stubbed | Cost review UI |
| 12 | `Stage12VideoGeneration.tsx` | 🔶 Stubbed | Video playback UI |

#### Shared Pipeline Components (✅ Complete)

1. **`PhaseTimeline.tsx`** - Horizontal stage progress bar
2. **`ProjectHeader.tsx`** - Branch switcher, artifact vault, version history
3. **`RearviewMirror.tsx`** - Continuity context display
4. **`AssetDrawer.tsx`** - Asset inheritance sidebar
5. **`FileStagingArea.tsx`** - Multi-file upload for Stage 1
6. **`ScreenplayToolbar.tsx`** - Stage 4 formatting toolbar
7. **`SceneWorkflowSidebar.tsx`** - Stage 6-12 vertical navigation

#### Style Capsule Components (✅ Complete)

1. **`StyleCapsuleSelector.tsx`** - Dropdown selector
2. **`WritingStyleCapsuleEditor.tsx`** - Create/edit writing capsules
3. **`VisualStyleCapsuleEditor.tsx`** - Create/edit visual capsules
4. **`ImageUploader.tsx`** - Visual reference image upload

#### Asset Components (✅ Complete)

1. **`AssetGallery.tsx`** - Grid view of assets
2. **`AssetCard.tsx`** - Asset card with image + metadata
3. **`AssetDialog.tsx`** - Create/edit asset dialog
4. **`DeleteAssetDialog.tsx`** - Delete confirmation with dependency check

#### Stage 8 Components (✅ Complete - Phase 5)

1. **`SceneAssetListPanel.tsx`** - Left panel with asset grouping, status badges, multi-select, and bulk generation
2. **`VisualStateEditorPanel.tsx`** - Center panel for editing asset descriptions, status tags, and image generation
3. **`StatusTagsEditor.tsx`** - Status tag management with keyboard navigation and carry-forward toggles
4. **`AssetDrawerTriggerPanel.tsx`** - Right panel for adding assets and proceeding to Stage 9

#### UI Primitives (shadcn/ui)

**Component Count:** 45+ components

**Key Components:**
- Dialog, Sheet, Drawer (Modals)
- Table, Card, Accordion (Layouts)
- Button, Input, Textarea, Select (Forms)
- Toast, Alert (Notifications)
- Dropdown Menu, Context Menu (Menus)
- Progress, Skeleton (Loading states)
- Tabs, Collapsible (Navigation)

---

### State Management

#### Client State (Zustand)

**`auth-store.ts`** - Authentication state
```typescript
interface AuthState {
  user: User | null;
  isLoading: boolean;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}
```

**Status:** ✅ Implemented

#### Server State (React Query)

**Pattern:** All API calls use React Query hooks for:
- Caching
- Automatic refetching
- Loading/error states
- Optimistic updates

**Example Services:**
- `projectService.ts` - Project CRUD
- `stageStateService.ts` - Stage state management
- `sceneService.ts` - Scene management
- `shotService.ts` - Shot list operations
- `styleCapsuleService.ts` - Style capsule operations
- `assetService.ts` - Global asset operations
- `projectAssetService.ts` - Project asset operations
- `sceneAssetService.ts` - Scene asset instance management with inheritance and AI detection (Phase 5)

**Status:** ✅ Implemented

---

### Custom Hooks

1. **`useStageState.ts`** - Stage state fetching/updating
2. **`useDebounce.ts`** - Debounced value updates
3. **`use-mobile.tsx`** - Responsive breakpoint detection
4. **`use-toast.ts`** - Toast notification hook

---

### TipTap Extensions (Custom Screenplay Editor)

**Custom Extensions for Stage 4:**
1. `SceneHeading.ts` - INT/EXT scene headers
2. `Action.ts` - Action lines
3. `Character.ts` - Character names
4. `Dialogue.ts` - Dialogue blocks
5. `Parenthetical.ts` - (parenthetical) directions
6. `Transition.ts` - CUT TO:, FADE IN:, etc.

**Styling:** `screenplay.css` - Industry-standard screenplay formatting

**Status:** ✅ Implemented

---

## Service Interactions & Data Flow

### Pipeline Execution Flow

```
User Action → Frontend Component → API Call → Backend Route → Service Layer → Database → Response
      ↓              ↓                 ↓              ↓             ↓            ↓         ↓
   UI Event    State Update      Validation    Orchestration  Persistence  Data Query  UI Update
```

### Phase A (Stages 1-5): Global Narrative Engine

**Data Flow:**

1. **Stage 1 (Input):**
   ```
   User uploads files → FileStagingArea → POST /api/projects → Create project with config
   ```

2. **Stage 2 (Treatment):**
   ```
   User provides guidance → POST /api/llm/treatment → LLM generates prose → Save to stage_states.content
   ```

3. **Stage 3 (Beat Sheet):**
   ```
   Treatment locked → POST /api/llm/beat-sheet → LLM atomizes beats → User reorders via @dnd-kit → Save to stage_states.content
   ```

4. **Stage 4 (Master Script):**
   ```
   Beat sheet locked → POST /api/llm/script → LLM generates screenplay → TipTap editor → Save to stage_states.content → Extract scenes to scenes table
   ```

5. **Stage 5 (Global Assets):**
   ```
   Script locked → POST /api/llm/assets/extract → LLM extracts characters/props/locations → User edits descriptions → POST /api/images/generate → Nano Banana generates image keys → Lock assets
   ```

### Phase B (Stages 6-12): Production Engine

**Data Flow:**

6. **Stage 6 (Script Hub):**
   ```
   User selects scene → GET /api/projects/:id/scenes → Display scene list with status → User clicks "Enter Scene Pipeline"
   ```

7. **Stage 7 (Shot List):**
   ```
   Scene selected → POST /api/llm/shots/extract → LLM generates shot breakdown → User edits table → POST /api/projects/:id/scenes/:sceneId/shots → Validate completeness → PUT /api/.../shots/lock → Set scene.shot_list_locked_at
   ```

8. **Stage 8 (Visual Definition):** ✅ Complete (Phase 5)
   ```
   Shot list locked → AI detects relevant assets → Inherit from prior scene → User modifies status tags/descriptions → Generate scene-specific image keys → Lock assets for Stage 9
   ```

**Stage 8 Data Flow Details:**
- `POST /api/projects/:id/scenes/:sceneId/assets/detect-relevance` → AI suggests relevant project assets
- `POST /api/projects/:id/scenes/:sceneId/assets/inherit` → Creates scene instances from prior scene states
- `PUT /api/projects/:id/scenes/:sceneId/assets/:instanceId` → Updates descriptions, status tags, carry_forward
- `POST /api/projects/:id/scenes/:sceneId/assets/:instanceId/generate-image` → Generates scene-specific images
- Bulk operations with polling for multiple asset image generation

9-12: (Stubbed - Not yet implemented)

---

### Context Management (Global vs. Local)

**Implementation:** `contextManager.ts`

**Global Context (Stages 1-5):**
- Project configuration (target length, genre, tone)
- Selected style capsules (writing + visual)
- Beat sheet structure
- Master script summary
- Locked global assets

**Local Context (Stages 6-12):**
- Current scene script excerpt
- Current shot list
- Scene-specific asset instances
- Previous scene end-state (for continuity)

**Pattern:** API endpoints automatically inject appropriate context via `contextManager` before LLM calls.

**Status:** ✅ Implemented

---

### Style Capsule Injection Pattern

**Implementation:** `styleCapsuleService.ts`

**Pattern:**
1. Fetch style capsule by ID
2. Format as plain text block
3. Inject into LLM system prompt

**Example (Writing Style):**
```
WRITING STYLE GUIDANCE:
Follow this style for tone, vocabulary, and pacing:

Example excerpts:
- "The rain fell like..."
- "He spoke with a..."

Style labels: minimalist, noir, terse
Avoid: flowery language, excessive adjectives
```

**Status:** ✅ Implemented (no embeddings/RAG)

---

### LangSmith Observability

**Implementation:** `llm-client.ts` with LangSmith wrapper

**Traced Operations:**
- Treatment generation (Stage 2)
- Beat sheet generation (Stage 3)
- Script generation (Stage 4)
- Asset extraction (Stage 5)
- Shot extraction (Stage 7)

**Storage:** `stage_states.langsmith_trace_id` stores trace ID for debugging

**Status:** ✅ Implemented (Migration 002 added trace fields)

---

## Project Directory Structure

### Frontend (`src/`)

```
src/
├── components/              # React components
│   ├── ui/                 # shadcn/ui primitives (45+ components)
│   ├── layout/             # Layout components (Sidebar, MainLayout)
│   ├── dashboard/          # Dashboard components
│   ├── pipeline/           # Pipeline stage components (Stages 1-12)
│   │   └── Stage8/         # Stage 8 specific components (Phase 5)
│   │       ├── SceneAssetListPanel.tsx
│   │       ├── VisualStateEditorPanel.tsx
│   │       ├── StatusTagsEditor.tsx
│   │       └── AssetDrawerTriggerPanel.tsx
│   ├── styleCapsules/      # Style capsule UI
│   ├── assets/             # Asset management UI
│   └── auth/               # Auth components
├── pages/                  # Route-level pages
│   ├── Auth.tsx            # Login/signup page
│   ├── Dashboard.tsx       # Project listing
│   ├── ProjectView.tsx     # Main pipeline interface
│   ├── StyleCapsuleLibrary.tsx
│   └── AssetLibrary.tsx
├── lib/
│   ├── services/           # API client services (12 services)
│   ├── stores/             # Zustand stores (auth-store)
│   ├── hooks/              # Custom React hooks
│   ├── utils/              # Utility functions
│   └── tiptap-extensions/  # Custom TipTap nodes (6 extensions)
├── types/                  # TypeScript type definitions
│   ├── project.ts
│   ├── scene.ts
│   ├── asset.ts
│   └── styleCapsule.ts
├── styles/                 # CSS files
│   └── screenplay.css      # Screenplay-specific styling
├── App.tsx                 # Root app component
└── main.tsx                # Entry point
```

### Backend (`backend/src/`)

```
backend/src/
├── routes/                 # API route handlers (11 routers)
│   ├── health.ts
│   ├── projects.ts
│   ├── stageStates.ts
│   ├── llm.ts
│   ├── styleCapsules.ts
│   ├── assets.ts
│   ├── projectAssets.ts
│   ├── sceneAssets.ts
│   ├── images.ts
│   └── seed.ts
├── services/               # Business logic services (15 services)
│   ├── llm-client.ts
│   ├── contextManager.ts
│   ├── styleCapsuleService.ts
│   ├── assetExtractionService.ts
│   ├── assetInheritanceService.ts
│   ├── sceneAssetRelevanceService.ts
│   ├── shotExtractionService.ts
│   ├── shotValidationService.ts
│   ├── continuityRiskAnalyzer.ts
│   └── image-generation/
│       ├── ImageGenerationService.ts
│       ├── NanoBananaClient.ts
│       └── ImageProviderInterface.ts
├── middleware/             # Express middleware
│   ├── auth.ts            # JWT authentication
│   └── errorHandler.ts    # Global error handler
├── config/                 # Configuration
│   ├── database.ts
│   └── supabase.ts
├── tests/                  # Jest tests (8 test files)
│   ├── connectivity-test.ts
│   ├── llm-integration.test.ts
│   ├── shotExtraction.test.ts
│   ├── shotValidation.test.ts
│   ├── shotLocking.test.ts
│   ├── shotLocking4_5_task_11.test.ts
│   ├── continuityRiskAnalyzer.test.ts
│   └── image-generation.test.ts
├── transformers/           # Data transformers
│   └── styleCapsule.ts
└── server.ts               # Express app entry point
```

### Database Migrations (`backend/migrations/`)

```
backend/migrations/
├── 001_initial_schema.sql             # Projects, branches, stage_states
├── 002_add_langsmith_fields.sql       # LangSmith trace IDs
├── 003_add_scenes_table.sql           # Scenes table
├── 004_style_capsule_system.sql       # Style capsule tables
├── 005_make_library_optional.sql      # Allow capsules without libraries
├── 006_shots_table.sql                # Shots table
├── 007_image_generation_jobs.sql      # Image generation queue
├── 008_global_assets.sql              # Global + project assets
├── 009_asset_versioning_enhancements.sql # Asset version tracking
├── 010_global_asset_image_generation.sql # Link assets to image jobs
├── 011_add_scene_dependencies.sql     # Scene dependency JSONB
├── 012_add_shot_order_to_shots.sql    # Shot order field
├── 013_add_end_frame_thumbnail.sql    # Scene end frame thumbnail
├── 014_add_shot_list_locking_with_trigger.sql # Shot list locking + trigger
├── 015_scene_asset_instances.sql      # Scene asset instances table (Phase 5)
├── 016_add_scene_asset_job_type.sql   # Extend image generation jobs for scene assets (Phase 5)
└── 017_scene_asset_modification_tracking.sql # Audit trail for scene asset changes (Phase 5)
```

---

## Phase Implementation Status

### Phase 0: ✅ Setup & Foundation (Complete)

**Status:** Fully implemented

**Deliverables:**
- ✅ Express.js backend with Supabase client
- ✅ PostgreSQL database with RLS policies
- ✅ Authentication system (Supabase Auth)
- ✅ Project CRUD operations
- ✅ Basic stage state persistence
- ✅ Frontend skeleton with routing

---

### Phase 1: ✅ MVP - Stage 1-4 Text Pipeline (Complete)

**Status:** Fully implemented

**Deliverables:**
- ✅ LLM service integration (Gemini, OpenAI, Anthropic)
- ✅ LangSmith observability
- ✅ Stage 1: Input modes (4 modes) with multi-file staging
- ✅ Stage 2: Treatment generation with variant selection
- ✅ Stage 3: Beat sheet with drag & drop
- ✅ Stage 4: Master script with custom screenplay editor
- ✅ Stage progression & gating

---

### Phase 2: ✅ Style Capsule System (Complete)

**Status:** Fully implemented

**Deliverables:**
- ✅ Database migration from RAG to Style Capsules (Migration 004)
- ✅ Style capsule libraries (user + preset)
- ✅ Writing style capsules (text examples, labels, constraints)
- ✅ Visual style capsules (design pillars, reference images)
- ✅ Style capsule application logging
- ✅ Context manager with global/local separation
- ✅ Style capsule injection into LLM prompts

---

### Phase 3: ✅ Asset Management & Stage 5 (Complete)

**Status:** Fully implemented

**Deliverables:**
- ✅ Image generation service architecture (Migration 007)
- ✅ Global asset library (Migration 008)
- ✅ Project assets (Migration 008)
- ✅ Asset versioning (Migration 009)
- ✅ Stage 5: Asset extraction from script
- ✅ Asset description merger service
- ✅ Image generation job tracking
- ✅ Asset promotion (project → global)
- ✅ Visual style lock enforcement

---

### Phase 4: ✅ Phase B Foundation - Scenes & Shots (Complete)

**Status:** Fully implemented

**Deliverables:**
- ✅ Scene extraction & parsing (Migration 003)
- ✅ Stage 6: Script Hub with scene status
- ✅ Scene dependency extraction (Migration 011)
- ✅ Continuity risk analyzer
- ✅ Shot table (Migration 006)
- ✅ Stage 7: Technical shot list with table UI
- ✅ Shot extraction service (LLM-powered)
- ✅ Shot validation service (errors & warnings)
- ✅ Shot split/merge services
- ✅ Shot list locking with database trigger (Migration 014)
- ✅ Rearview mirror component (frontend)

---

### Phase 5: ✅ Asset Inheritance & Stage 8 (Complete)

**Status:** Fully implemented

**Deliverables:**
- ✅ Scene asset instances database schema (Migration 015-017)
- ✅ Asset inheritance service with prior scene analysis
- ✅ Scene asset CRUD API endpoints with audit trail
- ✅ AI-powered relevant asset detection service
- ✅ Complete Stage 8 Visual Definition UI
- ✅ Status metadata tags with carry-forward logic
- ✅ Scene-specific image generation workflow
- ✅ Bulk image generation with polling and progress tracking
- ✅ Asset drawer integration with project/global toggle
- ✅ Visual state editor with modification tracking
- ✅ Scene header with slug and status display
- ✅ Keyboard navigation for tag dropdown
- ✅ URL persistence for Stage 8 scene navigation
- ✅ Gatekeeper validation for Stage 9 progression

**Key Features Implemented:**
- **Scene Asset Instances:** Full database schema with inheritance chains, modification tracking, and audit trails
- **Asset State Propagation:** Assets carry state changes (muddy, bloody, torn) between scenes with carry_forward toggle
- **AI Asset Detection:** LLM-powered relevance detection that suggests which project assets should appear in each scene
- **Three-Panel UI:** Scene asset list (left), visual state editor (center), asset drawer trigger (right)
- **Bulk Operations:** Multi-select asset generation with cost confirmation and progress polling
- **Status Tags System:** Visual condition tracking with keyboard-navigable dropdown and carry-forward options

---

### Phases 6-30: ❌ Not Yet Started

**Phase 6:** Prompt Engineering & Stage 9  
**Phase 7:** Frame Generation & Stage 10  
**Phase 8:** Cost Management & Stage 11  
**Phase 9:** Video Generation & Stage 12  
**Phase 10:** Version Control & Branching (branching system exists, UI incomplete)  
**Phase 11-30:** Advanced features (polish, performance, export, etc.)

---

## Testing Infrastructure

### Backend Testing (Jest)

**Test Files:** 8

**Coverage:**
1. `connectivity-test.ts` - Supabase connection
2. `llm-integration.test.ts` - LLM client functionality
3. `shotExtraction.test.ts` - Shot extraction from scenes
4. `shotValidation.test.ts` - Shot list validation rules
5. `shotLocking.test.ts` - Shot list locking workflow
6. `shotLocking4_5_task_11.test.ts` - Specific Phase 4.5 test
7. `continuityRiskAnalyzer.test.ts` - Scene dependency analysis
8. `image-generation.test.ts` - Image generation service

**Test Commands:**
```bash
npm run test              # Run all tests
npm run test:connectivity # Test Supabase connection
```

**Status:** ✅ Jest configured, 8 test suites implemented

---

### Frontend Testing

**Status:** ❌ Not implemented (no test files exist)

**Planned:**
- Component tests (React Testing Library)
- Integration tests (Playwright/Cypress)
- E2E tests for critical user flows

---

## Known Limitations & Technical Debt

### Database

1. **No `invalidation_logs` table yet** - Planned for Phase 10, but not implemented
2. **No `frames` or `videos` tables** - Planned for Phases 7-9
3. **Branching UI incomplete** - Database structure exists, UI not built

### Backend

1. **Image generation incomplete** - Service layer exists, but no Nano Banana API integration tested
2. **No video generation** - Veo3 integration not started
3. **No cost calculation** - Cost models exist in schema docs but not implemented
4. **No async job queue** - Image generation jobs tracked in DB, but no background worker
5. **No webhook handling** - For async video generation completion

### Frontend

1. **Stages 9-12 incomplete** - Stages 9-12 are stubbed components with minimal functionality
2. **No artifact vault UI** - ProjectHeader has button, but modal not implemented
3. **No version history UI** - Branching system exists in DB, but UI not built
4. **No notification system** - No in-app or email notifications for async jobs (polling implemented for Stage 8)
5. **No regeneration guidance modal** - "The Why Box" component not created
6. **Asset versioning UI** - Database tracks versions, but UI doesn't show version history
7. **Scene asset inheritance chain UI** - Database tracks inheritance chains, but no visual tree in UI

### Testing

1. **No frontend tests** - Zero test coverage for React components
2. **No E2E tests** - No automated user journey tests
3. **Limited backend test coverage** - Only 8 test files, many services untested

### Performance

1. **No caching strategy** - React Query caching only, no Redis/CDN
2. **No pagination** - All list endpoints return full datasets
3. **No lazy loading** - Components not code-split
4. **No image optimization** - Images stored raw, no thumbnails/compression

### Security

1. **No rate limiting** - API endpoints unprotected from abuse
2. **No input sanitization** - Beyond Zod validation
3. **No audit logging** - User actions not tracked
4. **API keys in environment variables** - No secrets management service

---

## Conclusion

Aiuteur has successfully implemented **Phases 0-5**, establishing a comprehensive foundation for a narrative-to-AI-film pipeline with:

✅ **17 database migrations** creating a robust schema with full asset inheritance
✅ **Git-style branching system** for non-linear project evolution
✅ **Style Capsule system** replacing RAG with deterministic style injection
✅ **Complete Phase A (Stages 1-5)** with LLM-powered narrative generation
✅ **Complete Phase B foundation (Stages 6-8)** with scene/shot management and stateful asset system
✅ **Asset management** (global, project, and scene-scoped with inheritance chains)
✅ **Shot list validation & locking** with database trigger enforcement
✅ **Scene asset instances** with status tags, carry-forward logic, and modification tracking
✅ **AI-powered asset detection** for scene relevance analysis
✅ **Complete Stage 8 UI** with three-panel layout, bulk operations, and cost confirmation
✅ **LangSmith observability** for debugging LLM calls

### Next Steps (Phase 6+)

1. **Build Stage 9** - Prompt segmentation and model preparation
2. **Implement Frame Generation (Stage 10)** - Nano Banana integration for anchor frames
3. **Add Cost Management (Stage 11)** - Transparent cost tracking and gateways
4. **Build Video Generation (Stage 12)** - Veo3 integration and review workflow
5. **Add testing** - Frontend tests, E2E tests, increased backend coverage
6. **Performance optimization** - Caching, pagination, lazy loading
7. **Branching UI** - Build version history and artifact vault interfaces

### Current System Capabilities

The system now supports complete asset state management across scenes, allowing:
- Characters that get muddy and stay muddy between scenes
- Props that break and remain broken unless fixed
- Visual consistency enforcement through inheritance chains
- AI-powered suggestions for which assets should appear in each scene
- Bulk image generation with progress tracking and cost estimation
- Full audit trails for all asset modifications

---

**Document Version:** 2.0
**Generated:** February 3, 2026
**Codebase State:** Phases 0-5 Complete (Full Asset Inheritance System), Phase 6+ Pending
