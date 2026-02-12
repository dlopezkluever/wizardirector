Resume this session with:
claude --resume a37567d2-334f-4993-bdef-2a8f3404948e


╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌ Plan: Set Up Automated Testing for Aiuteur

 Context

 Right now, after every implementation Claude builds, the only way to verify nothing broke is your manual testing guides (the       
 WT-tests-guide.md flows). Automated tests are small programs that exercise your code and check results — they run in seconds via   
 npm test and catch regressions instantly. The goal is to set up the infrastructure so that after every implementation, Claude runs 
  npm test on both frontend and backend to verify the app still works.

 What exists today

 - Backend: Jest is fully configured with 9 test files. npm test already works in backend/. The server exports app for supertest    
 (API testing).
 - Frontend: Zero test infrastructure. No test runner, no test scripts. One orphaned Vitest test file exists but Vitest isn't       
 installed.

 What we're setting up

 - Frontend: Install Vitest (Vite's native test runner) + React Testing Library + MSW (mock HTTP)
 - Backend: Extend existing Jest setup with a supertest route test
 - Both: Starter test files covering the most critical pure-logic code
 - CLAUDE.md: Add a "run tests after every implementation" workflow instruction

 ---
 How Automated Tests Work (Quick Primer)
 ┌────────────────┬──────────────────────────────────────────────────────────────┬─────────────┬────────────────────────┐
 │     Layer      │                        What it tests                         │    Speed    │    Mocking needed?     │
 ├────────────────┼──────────────────────────────────────────────────────────────┼─────────────┼────────────────────────┤
 │ Unit test      │ A single function in isolation (e.g., extractScenes(script)) │ ~1ms each   │ None                   │
 ├────────────────┼──────────────────────────────────────────────────────────────┼─────────────┼────────────────────────┤
 │ Service test   │ A frontend service method, with fake HTTP responses          │ ~10ms each  │ MSW intercepts fetch() │
 ├────────────────┼──────────────────────────────────────────────────────────────┼─────────────┼────────────────────────┤
 │ Route test     │ A backend API endpoint via supertest (no real server)        │ ~50ms each  │ Mock auth/DB           │
 ├────────────────┼──────────────────────────────────────────────────────────────┼─────────────┼────────────────────────┤
 │ Component test │ Renders a React component, simulates clicks                  │ ~100ms each │ Mock services          │
 └────────────────┴──────────────────────────────────────────────────────────────┴─────────────┴────────────────────────┘
 We're focusing on unit tests and service tests — maximum value, minimum setup. We're NOT setting up E2E browser tests
 (Playwright/Cypress) since your manual testing guides already cover that layer well.

 ---
 Step 1: Install Frontend Test Dependencies

 Directory: Project root

 npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom msw
 ┌─────────────────────────────┬──────────────────────────────────────────────────────────────────────────────────┐
 │           Package           │                                     Purpose                                      │
 ├─────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────┤
 │ vitest                      │ Test runner native to Vite — shares your vite.config, understands TS/JSX/aliases │
 ├─────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────┤
 │ @testing-library/react      │ Renders React components in simulated DOM                                        │
 ├─────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────┤
 │ @testing-library/jest-dom   │ Adds matchers like toBeInTheDocument()                                           │
 ├─────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────┤
 │ @testing-library/user-event │ Simulates user clicks/typing                                                     │
 ├─────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────┤
 │ jsdom                       │ Simulated browser DOM for Node.js                                                │
 ├─────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────┤
 │ msw                         │ Intercepts fetch() calls, returns fake responses                                 │
 └─────────────────────────────┴──────────────────────────────────────────────────────────────────────────────────┘
 ---
 Step 2: Configure Vitest in vite.config.ts

 File: C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\vite.config.ts

 Add /// <reference types="vitest" /> at top and a test block:

 /// <reference types="vitest" />
 import { defineConfig } from "vite";
 // ... existing imports ...

 export default defineConfig(({ mode }) => ({
   // ... existing server, plugins, resolve config ...
   test: {
     globals: true,           // describe/it/expect available without import
     environment: 'jsdom',    // simulates browser DOM
     setupFiles: ['./src/test/setup.ts'],
     include: ['src/**/*.{test,spec}.{ts,tsx}'],
     css: false,              // skip CSS processing (faster)
   },
 }));

 ---
 Step 3: Create Test Setup File + Add Scripts

 New file: src/test/setup.ts
 import '@testing-library/jest-dom';

 Modify: package.json — add scripts:
 "test": "vitest run",
 "test:watch": "vitest"

 - npm test → runs all tests once (what Claude runs after implementations)
 - npm run test:watch → runs in watch mode (for you during development)

 ---
 Step 4: Write Starter Test Files (6 files)

 4A. Frontend Unit Test — screenplay-converter (highest value)

 New file: src/lib/utils/__tests__/screenplay-converter.test.ts

 Pure functions, zero dependencies, complex parsing logic — ideal test target.
 - Tests parseScriptToTiptapJson: scene headings, character/dialogue blocks, parentheticals
 - Tests tiptapJsonToPlainText: reverse conversion
 - Tests stripHtmlTags: HTML cleanup
 - Tests round-trip fidelity (parse → serialize → compare)

 Source: src/lib/utils/screenplay-converter.ts

 4B. Frontend Unit Test — fix existing scriptService test

 Modify: src/lib/services/__tests__/scriptService.test.ts

 Already has 11 well-written test cases for slug generation. Just needs:
 - Add vi.mock('@/lib/supabase', ...) to prevent import.meta.env crash
 - The existing tests then pass as-is

 Source: src/lib/services/scriptService.ts

 4C. Frontend Service Test — projectService with MSW

 New file: src/lib/services/__tests__/projectService.test.ts

 Tests the most critical frontend service with mocked HTTP:
 - createProject sends correct POST body and auth header
 - getProject handles 404 gracefully
 - listProjects returns parsed array
 - No-session scenario throws "User not authenticated"

 Source: src/lib/services/projectService.ts

 4D. Backend Route Test — health endpoint (supertest hello-world)

 New file: backend/src/tests/health.route.test.ts

 Simplest possible supertest test — no auth, no DB, validates the pattern works:
 - GET /api/health returns 200 with { status: 'healthy' }

 Source: backend/src/server.ts + backend/src/routes/health.ts

 4E. Backend Unit Test — scriptManifest

 New file: backend/src/utils/__tests__/scriptManifest.test.ts

 Pure-function module (zero LLM, zero DB) for extracting characters/locations/props from scripts:
 - Tests getNodeText, parseDialogueLine, extractManifest
 - Edge cases: empty docs, character extensions like (V.O.)

 Source: backend/src/utils/scriptManifest.ts

 4F. Backend — fix @jest/globals version mismatch

 Modify: backend/package.json — downgrade @jest/globals from ^30.2.0 to ^29.7.0 to match jest@29.7.0

 ---
 Step 5: Update CLAUDE.md with Testing Workflow

 Add to CLAUDE.md:

 ## Testing

 After making code changes, always run:
 - Frontend: `npm test` from project root
 - Backend: `cd backend && npm test` (if backend code changed)

 If any test fails, fix the failure before considering the task complete.

 When implementing new features:
 - Pure logic functions → write a unit test
 - New service methods → write a service test with MSW mocks
 - New backend routes → write a supertest route test

 ---
 Files Summary
 ┌────────┬──────────────────────────────────────────────────────┬──────────────────────────────────┐
 │ Action │                         File                         │             Purpose              │
 ├────────┼──────────────────────────────────────────────────────┼──────────────────────────────────┤
 │ Modify │ vite.config.ts                                       │ Add Vitest test config block     │
 ├────────┼──────────────────────────────────────────────────────┼──────────────────────────────────┤
 │ Modify │ package.json (root)                                  │ Add test and test:watch scripts  │
 ├────────┼──────────────────────────────────────────────────────┼──────────────────────────────────┤
 │ Create │ src/test/setup.ts                                    │ Vitest setup (jest-dom matchers) │
 ├────────┼──────────────────────────────────────────────────────┼──────────────────────────────────┤
 │ Create │ src/lib/utils/__tests__/screenplay-converter.test.ts │ Unit tests for parsing           │
 ├────────┼──────────────────────────────────────────────────────┼──────────────────────────────────┤
 │ Modify │ src/lib/services/__tests__/scriptService.test.ts     │ Fix mocks, enable existing tests │
 ├────────┼──────────────────────────────────────────────────────┼──────────────────────────────────┤
 │ Create │ src/lib/services/__tests__/projectService.test.ts    │ MSW service test                 │
 ├────────┼──────────────────────────────────────────────────────┼──────────────────────────────────┤
 │ Create │ backend/src/tests/health.route.test.ts               │ Supertest route test             │
 ├────────┼──────────────────────────────────────────────────────┼──────────────────────────────────┤
 │ Create │ backend/src/utils/__tests__/scriptManifest.test.ts   │ Unit tests for extraction        │
 ├────────┼──────────────────────────────────────────────────────┼──────────────────────────────────┤
 │ Modify │ backend/package.json                                 │ Fix @jest/globals version        │
 ├────────┼──────────────────────────────────────────────────────┼──────────────────────────────────┤
 │ Modify │ CLAUDE.md                                            │ Add testing workflow section     │
 └────────┴──────────────────────────────────────────────────────┴──────────────────────────────────┘
 ---
 Verification

 After implementation, verify the full pipeline:

 1. Frontend: cd "C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector" && npm test
   - Should run all frontend tests and pass
 2. Backend: cd "C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend" && npm test
   - Should run all backend tests (existing 9 + new 2) and pass
 3. Lint: npm run lint from project root — no new errors
 4. Build: npm run build — still succeeds

 ---
 **What This Does NOT Cover (intentionally; but maybe we should do it later*)*

 - E2E browser tests (Playwright/Cypress) — your manual testing guides handle this layer
 - Snapshot tests — brittle, low value for this project's rapid iteration
 - Component rendering tests — deferred until unit/service tests are stable
 - Database integration tests — the existing backend tests already cover this pattern

