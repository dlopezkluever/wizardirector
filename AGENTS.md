# AGENTS.md - Development Guide

## Build, Lint, and Test Commands

### IMPORTANT: Always run commands using the full file location path:
-For fronted/project root: cd "C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\"
-For backend: cd "C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend"

### Additionally: Never use the token '&&' in commands when attempting to do multi-step commands, as The token '&&' is not a valid statement separator in these versions of powershell & bash.

### Never run supabase commands; Supabase CLI is not active. Never run SQL migrations automatically. Always prompt the user to do it themselves.

## DO NOT MAKE IMPLEMENTATION SUMMARY DOCUMENTS ONCE YOUR FINISHED WITH A TASK, UNLESS IT'S EXPLICTLY ASKED FOR BY THE USER. 

### Frontend
- `npm run dev` - Start Vite dev server (localhost:8080, proxies `/api` to backend:3001)
- `npm run build` - Production build
- `npm run lint` - Run ESLint on TypeScript files

### Backend
- `npm run dev` - Start Express server with tsx watch (localhost:3001)
- `npm run build` - Compile TypeScript
- `npm run test` - Run Jest tests
- `npm run test:connectivity` - Test Supabase connection
- NEVER RUN: `npm run migrate` - NEVER Run database migrations

## Architecture Overview

**Monorepo Structure**: Root frontend (React/Vite) + `backend/` Express API
- **Frontend**: React 18 + TypeScript + Vite + shadcn/ui + Zustand + React Query
- **Backend**: Express + TypeScript + Supabase + LLM integrations (OpenAI, Anthropic, Gemini)
- **Database**: Supabase PostgreSQL with RLS policies + S3-compatible storage
- **AI Services**: Google Veo3 (video), Gemini/Nano Banana (images), ElevenLabs (voice, optional)

**Key Directories**:
- `src/` - Frontend components, stores, services, types
- `backend/src/` - API routes, business logic, middleware
- `src/components/pipeline/` - 12-stage pipeline UI components
- `backend/migrations/` - Database schema migrations

## Code Style & Conventions

### TypeScript
- Strict mode **disabled** (`"strict": false` in tsconfig) for flexibility
- Path alias: `@/*` → `src/*`
- No mandatory unused-vars/params rules; ESLint has them off
- Use interfaces for props/types; avoid `any` when possible

### React/Components
- Functional components only (no class components)
- CSS: Tailwind + shadcn/ui (no raw CSS)
- State management: Zustand for UI state, React Query for server state
- Export components as default for route components; named exports for UI primitives

### Imports
- Prefer `import type` for TypeScript types
- Organize: external → internal types → components → utils
- Keep imports in execution order where dependencies matter

### Naming
- Components: PascalCase (`Stage1InputMode.tsx`)
- Functions/variables: camelCase
- Types/Interfaces: PascalCase
- Files: match component/export name

### Error Handling
- Use error boundaries for React errors
- Backend: Zod for input validation, return structured error responses
- Log errors with context; avoid silent failures

### Backend Routes
- Action-oriented endpoints: `/api/projects/{id}/stage-{n}/action-name`
- Explicit stage transitions (not implicit state mutations)
- All endpoints validate input with Zod; return `{ error, data }` structure

## Integration Points

- Backend API proxy: `vite.config.ts` routes `/api/*` to `http://localhost:3001`
- Database: Supabase client in `src/lib/services/api/`
- LLM calls: Backend-only, never from frontend (cost/security)
- Environment: `.env.local` (frontend vars prefixed `VITE_`, backend in `backend/.env`)
