# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Start development server:**
```bash
npm run dev
```
Server runs on http://localhost:8080 with proxy to backend API at http://localhost:3001

**Build and quality commands:**
```bash
npm run build          # Production build
npm run build:dev      # Development build
npm run lint           # ESLint check
npm run preview        # Preview production build
```

**Run linting after code changes:**
Always run `npm run lint` after making code changes to ensure code quality.
- NEVER RUN: `npm run migrate` - NEVER Run database migrations
- Always run commands using the full file location path:
---For fronted/project root: cd "C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\"
---For backend: cd "C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend"

## Project Architecture

**Aiuteur** is an AI-powered narrative-to-film pipeline with a deterministic 12-stage workflow. The application transforms written narratives into professional-quality AI-generated short films through strategic cost optimization and narrative continuity.

### Core Architecture Principles
- **Global-to-Local Context Management**: Phase A (Stages 1-5) establishes immutable global truth; Phase B (Stages 6-12) adds scene-specific context
- **Deterministic Invalidation**: Upstream changes trigger cascading invalidation with cost estimation
- **Asset State Inheritance**: Master assets → Scene instances with status tags and continuity tracking
- **12-Stage Pipeline**: Each stage is self-contained with explicit TypeScript interfaces for context passing

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **UI**: shadcn/ui components with Tailwind CSS
- **State Management**: Zustand (local state) + React Query (server state)
- **Animation**: Framer Motion
- **Database**: Supabase PostgreSQL with RLS policies
- **AI Integration**: Google Veo3 (video), Gemini/Nano Banana (images), multiple LLM providers

### Key Directories
- `src/components/pipeline/` - Pipeline stage components (Stage1InputMode.tsx, Stage2Treatment.tsx, etc.)
- `src/components/ui/` - shadcn/ui component library
- `src/components/styleCapsules/` - Style capsule system components
- `src/lib/services/` - External service integrations (projectService.ts, styleCapsuleService.ts, etc.)
- `src/lib/stores/` - Zustand state management
- `src/types/` - TypeScript type definitions (project.ts, styleCapsule.ts)
- `._docs/` - Comprehensive project documentation

### Important Types and Concepts

**Project Pipeline:**
- 12-stage deterministic workflow (Stages 1-12)
- Stage statuses: 'locked' | 'active' | 'pending' | 'outdated'
- Input modes: 'expansion' | 'condensation' | 'transformation' | 'script-skip'

**Style Capsules:**
- Deterministic style injection system for writing and visuals
- Stored in Supabase with structured data
- Applied globally and per-scene for consistency

**State Management:**
- Project state managed through Zustand stores
- Server state cached with React Query
- Stage transitions trigger context inheritance

### Development Guidelines

**Component Architecture:**
- Use shadcn/ui components as base primitives
- Follow existing patterns in `src/components/pipeline/`
- Maintain TypeScript strict mode compliance
- Implement proper error boundaries

**Pipeline Development:**
- Each stage component should be self-contained
- Use explicit TypeScript interfaces for stage context
- Follow global-to-local inheritance patterns
- Validate inputs/outputs at stage boundaries

**Styling:**
- Use Tailwind CSS classes
- Follow established design system in shadcn/ui
- Maintain responsive design patterns
- Custom styles in `src/styles/screenplay.css` for screenplay formatting

## Important File Locations

- **Main entry:** `src/main.tsx`
- **Route definitions:** Check `src/pages/` directory
- **Project types:** `src/types/project.ts`
- **Pipeline components:** `src/components/pipeline/Stage*.tsx`
- **Style capsule system:** `src/components/styleCapsules/`
- **Services:** `src/lib/services/`

## Supabase Integration

Uses Supabase for authentication, database, and file storage. Key features:
- Row-level security (RLS) policies
- Real-time subscriptions for collaborative features
- Structured storage for style capsules and project data
- File storage for generated assets

## Testing

No specific test framework detected in package.json. If implementing tests, follow React Testing Library conventions and create tests alongside components.