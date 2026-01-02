# **Aiuteur** 🎬

**AI-Powered Narrative-to-Film Pipeline**

*A deterministic 12-stage workflow that transforms written narratives into professional-quality AI-generated short films through strategic cost optimization and narrative continuity.*

![Pipeline Overview](https://img.shields.io/badge/Pipeline-12--Stage-blue)
![Architecture](https://img.shields.io/badge/Architecture-Global--to--Local-green)
![AI Integration](https://img.shields.io/badge/AI-Google%20Veo3%20%2B%20Nano%20Banana-orange)

## **🎯 Core Value Proposition**

Aiuteur solves the **"AI Film Production Inversion"**: Instead of gambling on expensive, non-deterministic video generation, our system **plans first, anchors second, generates last**.

- **Plan**: Lock narrative structure and visual style upfront
- **Anchor**: Generate cheap image frames to establish visual continuity
- **Generate**: Use expensive video AI only once, bridging pre-approved anchor frames

This approach guarantees **deterministic consistency** and **cost optimization** while maintaining creative control.

## **🚀 Key Features**

### **12-Stage Deterministic Pipeline**

**Phase A: Global Narrative Engine (Stages 1-5)**
- **Stage 1**: Input Modes & RAG Initialization (Expansion, Condensation, Transformation, Script Skip)
- **Stage 2**: Treatment Generation (Iterative prose with 3 AI variants)
- **Stage 3**: Beat Sheet (Structural anchor with drag-and-drop reordering)
- **Stage 4**: Master Script (Verbose screenplay with visual blueprint)
- **Stage 5**: Global Asset Definition & Style Lock

**Phase B: Production Engine (Stages 6-12)**
- **Stage 6**: Script Hub & Scene Cycle (Scene-by-scene workflow)
- **Stage 7**: Technical Shot List (8-second atomic shots with camera specs)
- **Stage 8**: Visual & Character Definition (Asset assembly with inheritance)
- **Stage 9**: Prompt Segmentation (Frame vs Video prompt separation)
- **Stage 10**: Frame Generation (Anchor frames with continuity validation)
- **Stage 11**: Confirmation & Gatekeeping (Economic cost review)
- **Stage 12**: Video Generation, Review & Iteration Loop

### **Advanced AI Integration**
- **Google Veo3**: High-quality video generation with audio
- **Nano Banana**: Cost-effective image generation for anchor frames
- **Multi-Provider LLMs**: OpenAI, Anthropic, Gemini with cost-aware routing
- **RAG Vector Databases**: Written style and visual style retrieval
- **Voice Profiles**: ElevenLabs integration for character consistency

### **Version Control & Continuity**
- **Git-style Branching**: Story timelines with parallel creative exploration
- **Context Propagation**: Global-to-local inheritance with deterministic invalidation
- **Asset State Management**: Character and prop continuity across scenes
- **Cost-Aware Editing**: Pre-computation of regeneration costs

### **Professional Workflow Tools**
- **Rearview Mirror**: Continuity context from previous scenes
- **Asset Drawer**: Inheritance and stateful modification tools
- **Continuity Drift Detection**: Automated visual inconsistency flagging
- **Bulk Generation Modes**: Speed-optimized vs cost-optimized frame generation

## **🏗️ Architecture Overview**

### **System Architecture**

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
┌─────────────────────────────────────────────────────────────────┐
│                 Backend Services (Fly.io)                       │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ API Orchestration Layer                                    │ │
│  │ - Explicit Stage Transitions                                │ │
│  │ - Context Management (Global ↔ Local)                      │ │
│  │ - Cost Estimation & Validation                             │ │
│  └─────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ AI Service Integration                                      │ │
│  │ - Google Veo3 (Video Generation)                            │ │
│  │ - Nano Banana (Image Generation)                            │ │
│  │ - OpenAI/Anthropic/Gemini (LLM)                             │ │
│  │ - pgvector RAG (Style Databases)                            │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
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
│  │ - RAG Vector Storage & Retrieval                            │ │
│  └─────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Supabase Storage                                            │ │
│  │ - Generated Images/Videos                                   │ │
│  │ - User-uploaded RAG Documents                               │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### **Key Architectural Principles**

- **Global-to-Local Context Management**: Phase A establishes immutable global truth; Phase B adds scene-specific context
- **Deterministic Invalidation**: Upstream changes trigger cascading invalidation with cost estimation
- **Asset State Inheritance**: Master assets → Scene instances with status tags and continuity tracking
- **Prompt Separation**: Canonical separation between Frame Prompts (visual) and Video Prompts (motion + audio)

## **🛠️ Tech Stack**

### **Frontend**
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite (with SSR capabilities)
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: Zustand (local state) + React Query (server state)
- **UI Components**: Radix UI primitives with custom theming
- **Animations**: Framer Motion
- **Drag & Drop**: dnd-kit

### **Backend & APIs**
- **API Style**: REST with explicit action-oriented endpoints
- **Orchestration**: Code-driven stage transitions (Temporal.io ready)
- **Authentication**: Supabase Auth with RLS policies
- **Storage**: Supabase Storage (S3 migration path)

### **Data & AI**
- **Database**: Supabase PostgreSQL with pgvector for RAG
- **Vector Search**: HNSW indexes for creative retrieval
- **LLM Providers**: OpenAI, Anthropic, Gemini (cost-aware routing)
- **Image Generation**: Nano Banana API
- **Video Generation**: Google Veo3 API
- **Voice Synthesis**: ElevenLabs (Stretch Goal)

### **Observability & Tools**
- **Prompt Engineering**: Custom versioned templates
- **RAG Framework**: LangChain for context management
- **Workflow Automation**: n8n for async pipelines
- **Debugging**: LangSmith for inheritance logic tracing

## **🚀 Getting Started**

### **Prerequisites**
- Node.js 18+ & npm
- Git

### **Installation**

```bash
# Clone the repository
git clone <repository-url>
cd aiuteur

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys and Supabase credentials

# Start development server
npm run dev
```

### **Environment Setup**

Create `.env.local` with:

```env
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AI Services
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
GOOGLE_VEO3_API_KEY=your_veo3_key
NANO_BANANA_API_KEY=your_nano_banana_key

# Optional
ELEVENLABS_API_KEY=your_elevenlabs_key
LANGSMITH_API_KEY=your_langsmith_key
```

### **Database Setup**

```bash
# Run migrations
npm run db:migrate

# Seed initial data (optional)
npm run db:seed
```

## **📁 Project Structure**

```
aiuteur/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ui/             # shadcn/ui primitives
│   │   ├── layout/         # Application layout
│   │   ├── pipeline/       # Pipeline stage components
│   │   │   ├── shared/     # Shared pipeline components
│   │   │   └── stage-*/    # Stage-specific components
│   │   └── forms/          # Form components
│   ├── pages/              # Route-level page components
│   ├── types/              # TypeScript definitions
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utilities and configurations
│   ├── stores/             # Zustand state stores
│   ├── services/           # External service integrations
│   │   ├── ai-services/    # AI API clients
│   │   └── api/           # Backend API calls
│   └── utils/              # Additional utilities
├── backend/                # Backend services
│   ├── src/
│   │   ├── routes/         # API route handlers
│   │   ├── services/       # Business logic
│   │   ├── middleware/     # Express middleware
│   │   └── types/          # Backend types
│   └── migrations/         # Database migrations
├── tests/                  # Test suites
├── docs/                   # Generated documentation
├── ._docs/                 # Project documentation
│   ├── project-overview.md
│   ├── architecture-and-rules.md
│   ├── AI-agent-registry-context-flow-architecture.md
│   └── tech-stack.md
└── public/                 # Static assets
```

## **🔧 Development Guidelines**

### **Code Quality Standards**

- **TypeScript Strict**: All code must pass strict TypeScript checks
- **Component Architecture**: Pure functions with clear prop interfaces
- **State Management**: Explicit separation between local and server state
- **Error Handling**: Comprehensive error boundaries and user feedback
- **Performance**: Memoization, lazy loading, and virtualization where appropriate

### **Pipeline Development**

- **Stage Isolation**: Each pipeline stage is a self-contained module
- **Context Contracts**: Explicit TypeScript interfaces for context passing
- **Validation**: Comprehensive input/output validation at stage boundaries
- **Testing**: Unit tests for business logic, integration tests for stage transitions

### **AI Integration**

- **Provider Abstraction**: No hardcoded assumptions about AI service behavior
- **Cost Awareness**: All AI calls include cost estimation and tracking
- **Fallback Handling**: Graceful degradation when services are unavailable
- **Rate Limiting**: Respectful API usage with proper retry logic

## **📚 Documentation**

Comprehensive project documentation is available in the `._docs/` directory:

- **[Project Overview](._docs/project-overview.md)**: Complete PRD with 12-stage pipeline specification
- **[Architecture & Rules](._docs/architecture-and-rules.md)**: System architecture, database schema, and development guidelines
- **[AI Agent Registry](._docs/AI-agent-registry-context-flow-architecture.md)**: Detailed AI agent specifications and context flow
- **[Tech Stack](._docs/tech-stack.md)**: Complete technical stack breakdown and conventions

## **🤝 Contributing**

### **Development Workflow**

1. **Fork** the repository
2. **Create** a feature branch from `main`
3. **Implement** your changes following the established patterns
4. **Test** thoroughly (unit, integration, and E2E tests)
5. **Update** documentation as needed
6. **Submit** a pull request with detailed description

### **Code Review Process**

- All changes require code review
- CI/CD pipeline must pass all checks
- Documentation updates required for architectural changes
- Backward compatibility maintained unless explicitly breaking

### **Branching Strategy**

- `main`: Production-ready code
- `develop`: Integration branch
- `feature/*`: Feature development
- `hotfix/*`: Critical bug fixes

## **📄 License**

This project is proprietary software. See LICENSE file for details.

## **🙋 Support**

For questions, issues, or contributions:

- **Issues**: [GitHub Issues](repository-issues-url)
- **Discussions**: [GitHub Discussions](repository-discussions-url)
- **Documentation**: See `._docs/` directory

---

**Built for filmmakers who demand both creative control and production efficiency.**
