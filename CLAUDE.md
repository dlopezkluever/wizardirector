# CLAUDE.md

## Rules
- Run `npm run lint` after code changes
- **NEVER** run `npm run migrate` or any supabase CLI commands — prompt user instead
- Never use `&&` in commands; use separate commands
- No implementation summary documents unless explicitly asked
- Frontend path: `cd "C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\"`
- Backend path: `cd "C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend"`

## Project Overview
**Aiuteur** — AI narrative-to-film pipeline with a deterministic 12-stage workflow. React 18 + TypeScript + Vite frontend, Supabase PostgreSQL backend, shadcn/ui + Tailwind CSS styling, Zustand + React Query state management.

## Key Directories
- `src/components/pipeline/` — Stage components (Stage1–12)
- `src/components/ui/` — shadcn/ui library
- `src/lib/services/` — Service integrations
- `src/lib/stores/` — Zustand stores
- `src/types/` — TypeScript definitions
- `._docs/` — Project documentation

## Development Guidelines
- Follow existing pipeline patterns. UI design: ._docs/ui-and-theme-rules.md
- Each stage component is self-contained with explicit TS interfaces
- Follow global-to-local context inheritance (Phase A: Stages 1-5 global truth, Phase B: 6-12 scene-specific)
- Tailwind CSS only; custom screenplay styles in `src/styles/screenplay.css`

## Testing
- **Frontend**: Vitest + RTL + MSW — `npm test` from project root
- **Backend**: Jest + ts-jest + Supertest — `npm test` from backend dir
- Fix failures before completing tasks
- Write tests for: pure logic, new service methods, new backend routes