# **Aiuteur System Architecture & Development Guide**

## **Overview**

**Aiuteur** is a web application that automates the transformation of written narratives into AI-generated short films through a deterministic 12-stage pipeline workflow. This document serves as the definitive reference for maintaining architectural consistency and code quality throughout development.

---

## **1. System Architecture Overview**

### **High-Level Architecture**

```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend Layer (Vercel)                      │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ React + TypeScript + Vite                                  │ │
│  │ - shadcn/ui Components                                     │ │
│  │ - Zustand + React Query State Management                   │ │
│  │ - Framer Motion Animations                                 │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   │ HTTP/REST APIs
                                   ▼
┌──────────────────────────────────────────────────────────────────┐
│                 Backend Services (Fly.io)                        │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ API Orchestration Layer                                     │ │
│  │ - Explicit Stage Transitions                                │ │
│  │ - Context Management (Global ↔ Local)                       │ │
│  │ - Cost Estimation & Validation                              │ │
│  └─────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ AI Service Integration                                      │ │
│  │ - Google Veo3 (Video Generation)                            │ │
│  │ - Nano Banana (Image Generation)                            │ │
│  │ - LangChain + LangSmith (RAG & Observability)               │ │
│  │ - OpenAI/Anthropic/Gemini (LLM)                             │ │
│  │ - pgvector RAG (Style Databases) *IGNORE*                   │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
                                   │
                                   │ PostgreSQL + pgvector
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                 Data Layer (Supabase)                          │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ PostgreSQL Database                                        │ │
│  │ - Projects & Branches (Git-style Versioning)               │ │
│  │ - Stage States & Inheritance Tracking                      │ │
│  │ - Asset Management & State Transitions                     │ │
│  │ - RAG Vector Storage & Retrieval     IGONORE               │ │
│  └─────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Supabase Storage                                            │ │
│  │ - Generated Images/Videos                                   │ │
│  │ - User-uploaded RAG Documents **IGNORE**                    │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### **Service Interactions & Data Flow**

#### **Pipeline Execution Flow**

```
User Action → Frontend → API Gateway → Orchestration Service → AI Services → Database → Response
      ↓              ↓           ↓              ↓               ↓          ↓         ↓
   Stage UI     State Update  Validation    Context Prep    Generation  Persistence  UI Update
```

#### **Phase A (Stages 1-5): Global Narrative Engine**

1. **IGNORE** Input Processing: User provides narrative → RAG initialization **IGNORE**
2. **LLM Processing**: Treatment generation → Beat sheet atomization → Script formatting
3. **Asset Extraction**: Parse script → Generate visual keys → Lock global style
4. **Context Storage**: All outputs stored as immutable global context

#### **Phase B (Stages 6-12): Production Engine**

1. **Scene Processing**: Script breakdown → Shot list generation → Asset inheritance
2. **Prompt Engineering**: Merge shot data + assets → Format for AI services
3. **Frame Generation**: Nano Banana creates anchor frames → Continuity validation
4. **Video Synthesis**: Veo3 generates clips → User review → Approval/iteration

#### **Key Data Flow Patterns**

- **Context Inheritance**: Global context (Stages 1-5) → Local context (Stages 6-12)
- **Asset State Propagation**: Master assets → Scene instances → Continuity tags
- **Version Control**: Git-style branching with deterministic invalidation cascades
- **Cost Awareness**: Pre-computation of regeneration costs at every stage transition

### **External Service Integrations**

| Service | Purpose | Data Flow | Cost Model |
|---------|---------|-----------|------------|
| **Google Veo3** | Video generation with audio | Start frame + End frame + Prompt → MP4 | Per-second credits |
| **Nano Banana** | High-volume image generation | Text prompt + Style RAG → Images | Per-image credits |
| **Gemini/OpenAI/Anthropic** | LLM text generation | Context + Prompt → Structured output | Per-token credits |
| **LangSmith** | Unified Prompt Engineering & Observability | Traces + Prompt Metadata → UI | Tiered (Free/Pro) |
| **IGNORE**: **pgvector** | Style RAG retrieval | Text chunks → Embeddings → Semantic search | Storage-based |

---

## **2. Project Directory Structure**

### **Complete Folder Hierarchy**

```
aiuteur/
├── .docs/                          # Documentation (not in repo)
│   ├── project-overview.md
│   ├── user-flow.md
│   ├── project-starting-status.md
│   └── tech-stack.md
├── src/
│   ├── components/                 # Reusable UI components
│   │   ├── ui/                     # shadcn/ui primitives (40+ components)
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── dialog.tsx
│   │   │   └── ...
│   │   ├── layout/                 # Application layout components
│   │   │   ├── sidebar.tsx
│   │   │   ├── header.tsx
│   │   │   ├── project-header.tsx
│   │   │   └── breadcrumbs.tsx
│   │   ├── dashboard/              # Dashboard-specific components
│   │   │   ├── project-card.tsx
│   │   │   ├── project-grid.tsx
│   │   │   └── create-project-modal.tsx
│   │   ├── pipeline/               # Pipeline stage components
│   │   │   ├── stage-1-input-modes.tsx
│   │   │   ├── stage-2-treatment.tsx
│   │   │   ├── stage-3-beat-sheet.tsx
│   │   │   ├── stage-4-master-script.tsx
│   │   │   ├── stage-5-global-assets.tsx
│   │   │   ├── stage-6-script-hub.tsx
│   │   │   ├── stage-7-shot-list.tsx
│   │   │   ├── stage-8-visual-definition.tsx
│   │   │   ├── stage-9-prompt-segmentation.tsx
│   │   │   ├── stage-10-frame-generation.tsx
│   │   │   ├── stage-11-confirmation.tsx
│   │   │   ├── stage-12-video-review.tsx
│   │   │   └── shared/             # Shared pipeline components
│   │   │       ├── rearview-mirror.tsx
│   │   │       ├── asset-drawer.tsx
│   │   │       ├── regeneration-guidance.tsx
│   │   │       └── continuity-flags.tsx
│   │   └── forms/                  # Form components
│   │       ├── project-config-form.tsx
│   │       └── asset-creation-form.tsx
│   ├── pages/                      # Route-level page components
│   │   ├── dashboard.tsx           # Project listing
│   │   ├── project-view.tsx        # Main pipeline interface
│   │   ├── index.tsx               # Landing/home page
│   │   └── not-found.tsx           # 404 page
│   ├── types/                      # TypeScript type definitions
│   │   ├── project.ts              # Project-related types
│   │   ├── scene.ts                # Scene and shot types
│   │   ├── stage.ts                # Pipeline stage types
│   │   ├── asset.ts                # Asset management types
│   │   ├── branch.ts               # Version control types
│   │   ├── api.ts                  # API request/response types
│   │   └── index.ts                # Type exports
│   ├── hooks/                      # Custom React hooks
│   │   ├── use-mobile.tsx          # Responsive breakpoint hook
│   │   ├── use-toast.ts            # Toast notification hook
│   │   ├── use-project.ts          # Project state management
│   │   ├── use-stage.ts            # Pipeline stage logic
│   │   ├── use-assets.ts           # Asset management
│   │   ├── use-rag.ts              # RAG retrieval logic **IGNORE**
│   │   └── use-cost-estimation.ts  # Cost calculation
│   ├── lib/                        # Utilities and configurations
│   │   ├── utils.ts                # General utility functions
│   │   ├── constants.ts            # Application constants
│   │   ├── api-client.ts           # API client configuration
│   │   ├── supabase.ts             # Supabase client setup
│   │   ├── validation.ts           # Zod validation schemas
│   │   ├── pipeline-config.ts      # Pipeline stage configuration
│   │   └── cost-models.ts          # Cost estimation logic
│   ├── stores/                     # Zustand state stores
│   │   ├── project-store.ts        # Global project state
│   │   ├── pipeline-store.ts       # Pipeline progression state
│   │   ├── asset-store.ts          # Asset management state
│   │   ├── ui-store.ts             # UI state (modals, drawers)
│   │   └── cost-store.ts           # Cost tracking state
│   ├── services/                   # External service integrations
│   │   ├── ai-services/            # AI API integrations
│   │   │   ├── veo3-client.ts      # Google Veo3 integration
│   │   │   ├── nano-banana-client.ts # Image generation
│   │   │   ├── llm-client.ts       # LLM orchestration
│   │   │   └── rag-client.ts       # Vector database queries **IGNORE**
│   │   ├── api/                    # Backend API calls
│   │   │   ├── projects.ts
│   │   │   ├── stages.ts
│   │   ├── branches.ts
│   │   ├── assets.ts
│   │   └── validation.ts           # Business logic validation
│   └── utils/                      # Additional utilities
│       ├── date-helpers.ts
│       ├── text-processing.ts
│       ├── cost-calculation.ts
│       └── stage-transition.ts
├── backend/                        # Backend services (separate repo)
│   ├── src/
│   │   ├── routes/                 # API route handlers
│   │   ├── services/               # Business logic services
│   │   ├── middleware/             # Express middleware
│   │   ├── lib/                    # Shared utilities
│   │   └── types/                  # TypeScript types
│   ├── migrations/                 # Database migrations
│   ├── tests/                      # Backend tests
│   └── package.json
├── public/                         # Static assets
│   ├── favicon.ico
│   ├── manifest.json
│   └── images/
├── tests/                          # Frontend tests
│   ├── components/                 # Component tests
│   ├── hooks/                      # Hook tests
│   ├── services/                   # Service tests
│   ├── utils/                      # Utility tests
│   ├── e2e/                        # End-to-end tests
│   └── setup.ts                    # Test configuration
├── docs/                           # Generated documentation
├── .github/                        # GitHub Actions and templates
│   ├── workflows/
│   └── ISSUE_TEMPLATE/
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── eslint.config.js
└── README.md
```

### **File Organization Principles**

#### **Component Organization**
- **Atomic Design**: `ui/` (atoms) → `layout/` (molecules) → `pipeline/` (organisms)
- **Feature-based**: Related components grouped by feature (dashboard, pipeline stages)
- **Shared Components**: Common pipeline elements in `pipeline/shared/`

#### **Type Organization**
- **Domain-driven**: Types grouped by business domain (project, scene, asset)
- **API Types**: Separate file for external API contracts
- **Index Exports**: Single entry point for type imports

#### **State Management**
- **Store Separation**: One store per major domain (project, pipeline, assets)
- **Hook Abstraction**: Custom hooks expose store functionality
- **Server State**: React Query for API-derived state

#### **Service Layer**
- **Protocol Separation**: AI services vs business logic APIs
- **Client Abstraction**: Consistent interfaces for external services
- **Error Handling**: Centralized error handling and retries

### **Module Separation Guidelines**

#### **Frontend Module Boundaries**
```
UI Layer (components/) ↔ State Layer (stores/) ↔ Service Layer (services/)
```

- **Components**: Pure UI, no business logic
- **Stores**: State management, no API calls
- **Services**: External integrations, data transformation

#### **Import Rules**
```typescript
// ✅ Good: Import through index
import { Project, Scene } from '@/types';

// ❌ Bad: Direct file imports
import { Project } from '@/types/project';
```

#### **Dependency Direction**
```
components/ → hooks/ → stores/ → services/ → lib/
```

---

## **3. Backend Database Schema**

### **Core Design Principles**

1. **Immutability by Default**: Completed stages never mutated in place
2. **Explicit Inheritance Tracking**: Every artifact records inheritance chain
3. **Deterministic Invalidation**: Upstream changes trigger cascading invalidation
4. **Git-style Branching**: Non-linear project evolution with full audit trail
5. **Asset State Propagation**: Master assets → Scene instances with status tags

### **Entity Relationship Overview**

```
projects (1) ──→ (N) branches
branches (1) ──→ (N) stage_states
branches (1) ──→ (N) scenes
scenes (1) ──→ (N) shots
shots (1) ──→ (N) frames
shots (1) ──→ (N) videos

global_assets (N) ←── promotes from ──→ (N) project_assets
project_assets (N) ──→ (N) scene_asset_instances

stage_states (N) ──→ (N)**IGNORE** rag_retrievals **IGNORE**
stage_states (N) ──→ (N) invalidation_logs
```

### **Core Tables**

#### **`projects`**

```sql
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),

    -- Stage 1 Configuration (immutable once Stage 2 begins)
    target_length_min INTEGER NOT NULL, -- seconds
    target_length_max INTEGER NOT NULL,
    project_type TEXT NOT NULL CHECK (project_type IN ('narrative', 'commercial', 'audio_visual')),
    content_rating TEXT NOT NULL CHECK (content_rating IN ('G', 'PG', 'PG-13', 'M')),
    genre TEXT[], -- array of selected genres
    tonal_precision TEXT, -- user's custom tone guidance

    -- RAG Configuration
    written_style_rag_id UUID REFERENCES rag_databases(id),
    visual_style_rag_id UUID REFERENCES rag_databases(id),

    -- Metadata
    active_branch_id UUID, -- FK added after branches table
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### **`branches`**

```sql
CREATE TABLE branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Branch Identity
    name TEXT NOT NULL, -- user-provided or auto-generated ("Main", "Experiment 1")
    parent_branch_id UUID REFERENCES branches(id), -- NULL for initial "Main" branch
    branched_at_stage INTEGER, -- stage number where branch diverged

    -- Branch Metadata
    commit_message TEXT, -- user's "why" for this branch
    is_main BOOLEAN DEFAULT FALSE, -- only one per project
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(project_id, name)
);
```

#### **`stage_states`**

```sql
CREATE TABLE stage_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    stage_number INTEGER NOT NULL CHECK (stage_number BETWEEN 1 AND 12),

    -- State Identity
    version INTEGER NOT NULL DEFAULT 1, -- increments on regeneration
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft', 'locked', 'invalidated', 'outdated'
    )),

    -- Inheritance Tracking
    inherited_from_stage_id UUID REFERENCES stage_states(id), -- parent stage that fed this one
    overrides JSONB, -- explicit field-level overrides applied

    -- Content Storage (stage-specific data)
    content JSONB NOT NULL, -- varies by stage (see Stage Content Schemas below)

    -- Prompt Engineering
    prompt_template_version TEXT, -- references versioned prompt
    final_prompt TEXT, -- the exact prompt sent to LLM/API

    -- Regeneration Context
    regeneration_guidance TEXT, -- user's "why" for regeneration

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),

    UNIQUE(branch_id, stage_number, version)
);
```

**Stage-Specific `content` JSONB Schemas**:

```typescript
// Stage 2: Treatment
{
    prose_treatment: string,
    selected_variant: number // which of 3 AI variants was chosen
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
    formatted_script: string, // full screenplay text
    scenes: Array<{
        id: string,
        slug: string,
        heading: string,
        content: string
    }>,
    sync_status: 'synced' | 'out_of_date_with_beats'
}

// Stage 5: Global Assets
{
    locked_visual_style_rag_id: UUID,
    assets_locked: boolean
}
```

#### **`scenes`**

```sql
CREATE TABLE scenes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,

    -- Scene Identity
    scene_number INTEGER NOT NULL,
    slug TEXT NOT NULL, -- e.g., "INT. KITCHEN - DAY"

    -- Script Content (extracted from Stage 4)
    script_excerpt TEXT NOT NULL, -- the actual scene script text

    -- Production Status
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft', 'shot_list_ready', 'frames_locked', 'video_complete', 'outdated', 'continuity_broken'
    )),

    -- Continuity Tracking
    end_state_summary TEXT, -- prose description of final moment
    end_frame_id UUID, -- FK to frames table (added below)

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(branch_id, scene_number)
);
```

#### **`shots`**

```sql
CREATE TABLE shots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scene_id UUID NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,

    -- Shot Identity
    shot_id TEXT NOT NULL, -- e.g., "3A", "3B"
    shot_order INTEGER NOT NULL,
    duration INTEGER DEFAULT 8, -- seconds

    -- Content (from Stage 7 Shot List)
    dialogue TEXT,
    action TEXT NOT NULL,
    characters JSONB NOT NULL, -- [{name, prominence}]
    setting TEXT NOT NULL,
    camera_spec TEXT NOT NULL,
    continuity_flags TEXT[],

    -- Prompts (from Stage 9)
    frame_prompt TEXT, -- for image generation
    video_prompt TEXT, -- for video generation
    requires_end_frame BOOLEAN DEFAULT TRUE, -- false for Sora-style models

    -- Production Status
    frames_approved BOOLEAN DEFAULT FALSE,
    video_approved BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(scene_id, shot_id)
);
```

#### **`frames`**

```sql
CREATE TABLE frames (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shot_id UUID NOT NULL REFERENCES shots(id) ON DELETE CASCADE,

    -- Frame Identity
    frame_type TEXT NOT NULL CHECK (frame_type IN ('start', 'end')),

    -- Generation Context
    prompt TEXT NOT NULL, -- exact prompt sent to Nano Banana
    visual_style_rag_id UUID REFERENCES rag_databases(id),
    prior_frame_id UUID REFERENCES frames(id), -- for continuity seeding

    -- Storage
    image_url TEXT NOT NULL, -- Supabase Storage path

    -- Approval
    approved BOOLEAN DEFAULT FALSE,
    regeneration_count INTEGER DEFAULT 0,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    cost_credits NUMERIC(10,4) -- cost in API credits
);
```

#### **`videos`**

```sql
CREATE TABLE videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shot_id UUID NOT NULL REFERENCES shots(id) ON DELETE CASCADE,

    -- Generation Context
    start_frame_id UUID NOT NULL REFERENCES frames(id),
    end_frame_id UUID REFERENCES frames(id), -- NULL if start-frame-only
    video_prompt TEXT NOT NULL,

    -- Storage
    video_url TEXT NOT NULL, -- Supabase Storage path

    -- Approval & Status
    approved BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'rendering' CHECK (status IN (
        'queued', 'rendering', 'complete', 'failed'
    )),
    error_message TEXT,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    cost_credits NUMERIC(10,4),
    version INTEGER DEFAULT 1
);
```

### **Asset Management**

#### **`global_assets`**

```sql
CREATE TABLE global_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),

    -- Asset Identity
    name TEXT NOT NULL, -- "John Doe", "Detective's Office"
    asset_type TEXT NOT NULL CHECK (asset_type IN ('character', 'prop', 'location')),

    -- Visual Definition
    description TEXT NOT NULL, -- master descriptive text
    image_key_url TEXT, -- Nano Banana generated reference image
    visual_style_rag_id UUID REFERENCES rag_databases(id),

    -- Voice Profile (Stretch Goal)
    voice_profile_id TEXT, -- ElevenLabs ID or similar

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    promoted_from_project_id UUID REFERENCES projects(id) -- NULL if created directly
);
```

#### **`project_assets`**

```sql
CREATE TABLE project_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Source Tracking
    global_asset_id UUID REFERENCES global_assets(id), -- NULL if created fresh

    -- Asset Identity
    name TEXT NOT NULL,
    asset_type TEXT NOT NULL CHECK (asset_type IN ('character', 'prop', 'location')),

    -- Visual Definition
    description TEXT NOT NULL,
    image_key_url TEXT NOT NULL,
    visual_style_rag_id UUID REFERENCES rag_databases(id),

    -- Status
    locked BOOLEAN DEFAULT FALSE, -- Stage 5 gatekeeper

    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### **`scene_asset_instances`**

```sql
CREATE TABLE scene_asset_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scene_id UUID NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
    project_asset_id UUID NOT NULL REFERENCES project_assets(id),

    -- Stateful Modification
    description_override TEXT, -- NULL if unchanged from project asset
    image_key_url TEXT, -- regenerated if description changed

    -- Status Metadata Tags (NEW)
    status_tags TEXT[], -- e.g., ['muddy', 'torn_shirt', 'bloody']
    carry_forward BOOLEAN DEFAULT TRUE, -- should tags persist to next scene?

    -- Inheritance Tracking
    inherited_from_scene_id UUID REFERENCES scenes(id), -- prior scene's instance

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(scene_id, project_asset_id)
);
```

### **RAG & Retrieval Tracking**

#### **`rag_databases`**

```sql
CREATE TABLE rag_databases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),

    -- Database Identity
    name TEXT NOT NULL,
    db_type TEXT NOT NULL CHECK (db_type IN ('written_style', 'visual_style')),

    -- Storage
    embedding_version TEXT NOT NULL, -- e.g., "text-embedding-3-small"
    document_count INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### **`rag_documents`**

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE rag_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rag_db_id UUID NOT NULL REFERENCES rag_databases(id) ON DELETE CASCADE,

    -- Content
    text_content TEXT NOT NULL,
    embedding vector(1536), -- OpenAI ada-002 or equivalent

    -- Metadata for Scoped Retrieval
    metadata JSONB, -- e.g., {scene_id, character_id, verbosity_flag}

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rag_docs_embedding ON rag_documents
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64); -- tuned HNSW parameters
```

#### **`rag_retrievals`**

```sql
CREATE TABLE rag_retrievals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stage_state_id UUID NOT NULL REFERENCES stage_states(id) ON DELETE CASCADE,

    -- Query Context
    query_embedding vector(1536),
    retrieval_scope TEXT, -- 'global_only', 'scene_only', 'combined'

    -- Results
    retrieved_doc_ids UUID[], -- array of rag_documents.id
    relevance_scores NUMERIC[],

    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **Invalidation & Cost Tracking**

#### **`invalidation_logs`**

```sql
CREATE TABLE invalidation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Source of Change
    triggering_stage_state_id UUID NOT NULL REFERENCES stage_states(id),
    branch_id UUID NOT NULL REFERENCES branches(id),

    -- Invalidation Scope
    invalidation_type TEXT NOT NULL CHECK (invalidation_type IN (
        'global', -- affects all downstream stages
        'local_scene', -- affects current scene only
        'continuity_break' -- affects subsequent scenes
    )),

    -- Affected Artifacts
    invalidated_stage_states UUID[], -- array of stage_states.id
    invalidated_scenes UUID[], -- array of scenes.id

    -- Cost Implications
    estimated_regen_cost NUMERIC(10,2), -- in credits
    warning_acknowledged BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **Row Level Security (RLS) Policies**

#### **Projects**
```sql
-- Users can only access their own projects
CREATE POLICY "Users can access own projects" ON projects
    FOR ALL USING (auth.uid() = user_id);
```

#### **Branches**
```sql
-- Users can access branches of projects they own
CREATE POLICY "Users can access project branches" ON branches
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = branches.project_id
            AND projects.user_id = auth.uid()
        )
    );
```

#### **Global Assets**
```sql
-- Users can access their own global assets
CREATE POLICY "Users can access own global assets" ON global_assets
    FOR ALL USING (auth.uid() = user_id);
```

### **Index Strategies for Performance**

#### **Core Query Optimization**
```sql
-- Hot path: Get active branch state
CREATE INDEX idx_stage_states_branch_stage ON stage_states(branch_id, stage_number);

-- Scene production status queries
CREATE INDEX idx_scenes_branch_status ON scenes(branch_id, status);

-- Asset inheritance queries
CREATE INDEX idx_scene_instances_inheritance ON scene_asset_instances(inherited_from_scene_id);

-- RAG retrieval performance
CREATE INDEX idx_rag_docs_db_type ON rag_documents(rag_db_id) WHERE metadata->>'type' = 'style';
```

#### **Cost Estimation Queries**
```sql
-- Estimate regeneration costs
CREATE INDEX idx_invalidation_logs_cost ON invalidation_logs(estimated_regen_cost) WHERE warning_acknowledged = FALSE;
```

---

## **4. Code Rules**

### **AI-First Codebase Design**

#### **Modular Architecture Principles**

1. **Single Responsibility**: Each module has one reason to change
2. **Dependency Inversion**: High-level modules don't depend on low-level modules
3. **Explicit Interfaces**: Clear contracts between modules
4. **Testable Design**: Dependency injection enables comprehensive testing

#### **Example: Stage Orchestration**

```typescript
// ✅ Good: Explicit orchestration with clear boundaries
class StageOrchestrator {
    constructor(
        private llmClient: LLMClient,
        private ragService: RAGService,
        private validationService: ValidationService
    ) {}

    async executeStage2(projectId: string, input: Stage2Input): Promise<Stage2Output> {
        // 1. Validate input
        await this.validationService.validateStage2Input(input);

        // 2. Retrieve RAG context
        const ragContext = await this.ragService.retrieveContext(input.writtenStyleRagId);

        // 3. Generate treatment variants
        const treatments = await this.llmClient.generateTreatments(input, ragContext);

        // 4. Return structured output
        return { treatments, selectedVariant: 0 };
    }
}

// ❌ Bad: Monolithic function with mixed concerns
async function generateTreatment(projectId: string, input: any) {
    // Validation, RAG, LLM, and data persistence all mixed together
    if (!input.text) throw new Error('No text');
    const rag = await fetchRagData(input.ragId);
    const result = await callOpenAI({ prompt: input.text, context: rag });
    await saveToDatabase(projectId, result);
    return result;
}
```

#### **Scalable Architecture Patterns**

1. **Pipeline Pattern**: Each stage is a discrete, testable unit
2. **Observer Pattern**: State changes notify dependent components
3. **Repository Pattern**: Data access abstracted behind interfaces
4. **Factory Pattern**: Complex object creation centralized

#### **Example: Asset Management**

```typescript
// Repository pattern for data access
interface AssetRepository {
    getById(id: string): Promise<Asset>;
    save(asset: Asset): Promise<void>;
    getByProject(projectId: string): Promise<Asset[]>;
}

// Factory pattern for asset creation
class AssetFactory {
    static createCharacter(name: string, description: string): CharacterAsset {
        return {
            id: generateId(),
            type: 'character',
            name,
            description,
            createdAt: new Date(),
            visualKey: null
        };
    }
}
```

### **Testing Structure Guidelines**

#### **Testing Pyramid**

```
End-to-End Tests (E2E)     ┌─────────────┐  Few tests, high confidence
Integration Tests         │█████████████│  Medium coverage
Unit Tests               ┌███████████████┐  High coverage, fast feedback
```

#### **Unit Testing Rules**

1. **Test Behavior, Not Implementation**
2. **Use Descriptive Test Names**
3. **Arrange-Act-Assert Pattern**
4. **Mock External Dependencies**

```typescript
// ✅ Good: Behavior-focused test
describe('StageOrchestrator', () => {
    it('should generate 3 treatment variants', async () => {
        // Arrange
        const mockLLM = { generateTreatments: vi.fn().mockResolvedValue(mockTreatments) };
        const orchestrator = new StageOrchestrator(mockLLM, mockRAG, mockValidation);

        // Act
        const result = await orchestrator.executeStage2(projectId, input);

        // Assert
        expect(result.treatments).toHaveLength(3);
        expect(mockLLM.generateTreatments).toHaveBeenCalledWith(input, expect.any(Object));
    });
});

// ❌ Bad: Implementation-focused test
it('should call generateTreatments method', () => {
    expect(orchestrator.generateTreatments).toHaveBeenCalled();
});
```

#### **Integration Testing**

```typescript
// Test stage transitions with real database
describe('Stage Transition Integration', () => {
    it('should persist stage state and trigger invalidation', async () => {
        // Setup: Create project with Stage 3 completed
        const project = await createTestProject();
        await completeStage3(project.id);

        // Act: Regenerate Stage 4 script
        await regenerateMasterScript(project.id, { guidance: 'Make it more dramatic' });

        // Assert: Check invalidation cascade
        const invalidations = await getInvalidationLogs(project.id);
        expect(invalidations).toContainEqual(
            expect.objectContaining({
                invalidation_type: 'global',
                estimated_regen_cost: expect.any(Number)
            })
        );
    });
});
```

#### **E2E Testing**

```typescript
// Critical user journey test
describe('Complete Pipeline Flow', () => {
    it('should create project and complete Phase A', async () => {
        // Navigate to dashboard
        await page.goto('/dashboard');

        // Create new project
        await page.click('[data-testid="create-project"]');
        await page.fill('[data-testid="project-title"]', 'Test Film');

        // Complete Stage 1
        await completeStage1(page, {
            mode: 'expansion',
            text: 'A detective investigates a mysterious murder...'
        });

        // Verify progression
        await expect(page.locator('[data-testid="stage-1-status"]')).toHaveText('Completed');
        await expect(page.locator('[data-testid="stage-2-status"]')).toHaveText('In Progress');
    });
});
```

### **Clear Separation of Concerns**

#### **Layer Responsibilities**

```
Presentation Layer (Components)     │ User interaction, UI rendering
├── State Management Layer (Stores) │ Application state, business logic
├── Service Layer (Services)        │ External API calls, data transformation
├── Data Access Layer (Repositories)│ Database operations, queries
└── Infrastructure Layer (Utils)    │ Cross-cutting concerns, utilities
```

#### **Component Guidelines**

```typescript
// ✅ Good: Pure component with clear props interface
interface TreatmentEditorProps {
    treatment: Treatment;
    onSave: (treatment: Treatment) => void;
    onRegenerate: (guidance: string) => void;
    isLoading: boolean;
}

export function TreatmentEditor({ treatment, onSave, onRegenerate, isLoading }: TreatmentEditorProps) {
    return (
        <div>
            <RichTextEditor
                content={treatment.content}
                onChange={(content) => onSave({ ...treatment, content })}
                disabled={isLoading}
            />
            <RegenerationGuidance
                onSubmit={onRegenerate}
                disabled={isLoading}
            />
        </div>
    );
}

// ❌ Bad: Component with mixed concerns
export function TreatmentEditor({ projectId }: { projectId: string }) {
    const [treatment, setTreatment] = useState(null);
    const [loading, setLoading] = useState(false);

    // Business logic mixed with UI
    const handleSave = async () => {
        setLoading(true);
        try {
            await api.saveTreatment(projectId, treatment);
            toast.success('Saved!');
        } catch (error) {
            toast.error('Failed to save');
        } finally {
            setLoading(false);
        }
    };

    // Data fetching mixed with UI
    useEffect(() => {
        api.getTreatment(projectId).then(setTreatment);
    }, [projectId]);

    return <div>{/* UI mixed with data/state logic */}</div>;
}
```

#### **State Management Guidelines**

```typescript
// ✅ Good: Store focused on domain logic
interface PipelineState {
    currentStage: number;
    stageStates: Record<number, StageState>;
    isTransitioning: boolean;
}

interface PipelineActions {
    advanceStage: (stageData: any) => Promise<void>;
    regenerateStage: (stageNumber: number, guidance: string) => Promise<void>;
    lockStage: (stageNumber: number) => Promise<void>;
}

export const usePipelineStore = create<PipelineState & PipelineActions>((set, get) => ({
    // State
    currentStage: 1,
    stageStates: {},
    isTransitioning: false,

    // Actions
    advanceStage: async (stageData) => {
        set({ isTransitioning: true });
        try {
            const result = await api.advanceStage(get().currentStage, stageData);
            set(state => ({
                currentStage: state.currentStage + 1,
                stageStates: { ...state.stageStates, [state.currentStage]: result }
            }));
        } finally {
            set({ isTransitioning: false });
        }
    }
}));

// ❌ Bad: Store doing too much
export const useAppStore = create((set) => ({
    // UI state mixed with business logic
    modalOpen: false,
    loadingStates: {},
    user: null,
    projects: [],
    currentProject: null,
    pipelineState: null,

    // API calls in store
    fetchProjects: async () => {
        const projects = await api.getProjects();
        set({ projects });
    },

    // UI logic in store
    openModal: () => set({ modalOpen: true }),
    closeModal: () => set({ modalOpen: false }),
}));
```

### **Comprehensive but Practical Guidelines**

#### **Naming Conventions**

```typescript
// Files and directories: kebab-case
pipeline-store.ts
project-card.tsx
stage-transition.ts

// Components: PascalCase
export function TreatmentEditor() {}
export function ProjectCard() {}

// Hooks: camelCase with use prefix
export function usePipeline() {}
export function useAssetManagement() {}

// Types: PascalCase
interface Project {}
type StageStatus = 'draft' | 'locked' | 'invalidated';

// Constants: SCREAMING_SNAKE_CASE
export const MAX_STAGES = 12;
export const DEFAULT_DURATION = 8;
```

#### **Error Handling**

```typescript
// ✅ Good: Explicit error types and handling
class StageTransitionError extends Error {
    constructor(
        message: string,
        public stageNumber: number,
        public reason: 'validation' | 'api' | 'permission'
    ) {
        super(message);
        this.name = 'StageTransitionError';
    }
}

async function advanceStage(stageNumber: number, data: any) {
    try {
        // Validation
        const validation = await validateStageData(stageNumber, data);
        if (!validation.isValid) {
            throw new StageTransitionError(
                validation.errors.join(', '),
                stageNumber,
                'validation'
            );
        }

        // API call
        const result = await api.advanceStage(stageNumber, data);
        return result;
    } catch (error) {
        if (error instanceof StageTransitionError) {
            // Handle known errors
            toast.error(`Stage ${error.stageNumber}: ${error.message}`);
        } else {
            // Handle unexpected errors
            console.error('Unexpected error:', error);
            toast.error('An unexpected error occurred');
        }
        throw error;
    }
}

// ❌ Bad: Generic error handling
async function advanceStage(stageNumber: number, data: any) {
    try {
        await api.advanceStage(stageNumber, data);
    } catch (error) {
        console.log(error); // Silent failure
        toast.error('Something went wrong');
    }
}
```

#### **Performance Guidelines**

1. **Memoization**: Use React.memo, useMemo, useCallback appropriately
2. **Lazy Loading**: Code-split route components and heavy dependencies
3. **Virtualization**: Use virtual scrolling for large lists
4. **Debouncing**: Debounce expensive operations like RAG searches

```typescript
// ✅ Good: Performance-conscious component
const ShotList = memo(({ shots, onEdit }: ShotListProps) => {
    const debouncedSearch = useDebouncedCallback((query) => {
        // Expensive RAG search
    }, 300);

    return (
        <VirtualizedList
            items={shots}
            itemHeight={60}
            renderItem={(shot) => <ShotRow key={shot.id} shot={shot} onEdit={onEdit} />}
        />
    );
});
```

#### **Documentation Standards**

```typescript
// ✅ Good: Comprehensive JSDoc
/**
 * Orchestrates the execution of pipeline stages with proper validation,
 * context management, and error handling.
 *
 * @example
 * ```typescript
 * const orchestrator = new StageOrchestrator(llmClient, ragService);
 * const result = await orchestrator.executeStage2(projectId, input);
 * ```
 */
export class StageOrchestrator {
    /**
     * Executes Stage 2 (Treatment Generation) of the pipeline.
     *
     * This stage generates multiple prose treatment variants based on the
     * user's input and selected RAG context. The system ensures consistency
     * with the project's global constraints (genre, tone, target length).
     *
     * @param projectId - The unique identifier of the project
     * @param input - Stage 2 input parameters including narrative source and RAG selection
     * @returns Promise resolving to treatment variants with metadata
     * @throws {ValidationError} When input validation fails
     * @throws {APIError} When LLM service is unavailable
     */
    async executeStage2(projectId: string, input: Stage2Input): Promise<Stage2Output> {
        // Implementation...
    }
}
```

### **Specific Examples**

#### **Stage Transition Logic**

```typescript
// ✅ Good: Explicit state machine
enum StageStatus {
    DRAFT = 'draft',
    LOCKED = 'locked',
    INVALIDATED = 'invalidated',
    OUTDATED = 'outdated'
}

interface StageTransition {
    from: StageStatus;
    to: StageStatus;
    conditions: string[];
    sideEffects: string[];
}

const STAGE_TRANSITIONS: Record<number, StageTransition[]> = {
    3: [{
        from: StageStatus.LOCKED,
        to: StageStatus.OUTDATED,
        conditions: ['stage_4_manually_edited'],
        sideEffects: ['flag_stage_3_sync_status']
    }],
    4: [{
        from: StageStatus.LOCKED,
        to: StageStatus.INVALIDATED,
        conditions: ['stage_3_regenerated'],
        sideEffects: ['invalidate_phase_b', 'calculate_regen_cost']
    }]
};
```

#### **Cost Estimation Logic**

```typescript
// ✅ Good: Transparent cost modeling
interface CostModel {
    stageNumber: number;
    operation: 'generation' | 'regeneration';
    baseCost: number;
    perUnitCost: number;
    unitType: 'scene' | 'shot' | 'frame' | 'video';
}

class CostEstimator {
    estimateInvalidationCost(invalidation: InvalidationLog): number {
        const affectedStages = invalidation.invalidated_stage_states;
        const affectedScenes = invalidation.invalidated_scenes;

        return affectedStages.reduce((total, stageId) => {
            const stage = this.getStageById(stageId);
            const model = this.getCostModel(stage.stage_number, 'regeneration');

            switch (model.unitType) {
                case 'scene':
                    return total + (model.baseCost + model.perUnitCost * affectedScenes.length);
                case 'shot':
                    const shotCount = this.getShotCountForStage(stageId);
                    return total + (model.baseCost + model.perUnitCost * shotCount);
                default:
                    return total + model.baseCost;
            }
        }, 0);
    }
}
```

This architecture and rules guide ensures that Aiuteur maintains code quality, scalability, and consistency as the application grows from prototype to production system.
