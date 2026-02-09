Ready to code?

 Here is Claude's plan:
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌ Plan: 3C.5 — Aspect Ratio System

 Context

 All image frame and video generation is currently hardcoded to 16:9 dimensions throughout the pipeline. There is no project-level aspect 
  ratio setting, meaning users cannot generate vertical (9:16) content. This task adds aspect ratio as a project-level setting in Stage   
 1, persists it to the database, displays it in the project header, and propagates it to Stage 10 frame generation and Stage 12 video     
 generation.

 Scope decisions (confirmed with user):
 - Only 16:9 and 9:16 supported (per user research on Veo3 capabilities)
 - Default: 16:9 (matches current hardcoded behavior; backward-compatible)
 - Stage 5 master assets untouched — their type-specific ratios (character=2:3, prop=1:1, location=16:9) remain as-is
 - Applies to Stage 10 frames + Stage 12 video only
 - Project header badge/chip next to the branch indicator

 ---
 Implementation Steps

 Step 1: Database Migration (write file only, do NOT run)

 File: backend/migrations/XXX_add_aspect_ratio.sql (next sequential number)

 - Add aspect_ratio TEXT NOT NULL DEFAULT '16:9' column to projects table
 - Add CHECK constraint: aspect_ratio IN ('16:9', '9:16')

 ---
 Step 2: TypeScript Types

 File: src/types/project.ts

 - Add type: export type AspectRatio = '16:9' | '9:16';
 - Add aspectRatio?: AspectRatio to the Project interface
 - Add aspectRatio?: AspectRatio to the ProjectSettings interface

 ---
 Step 3: Backend Route — Accept & Return aspect_ratio

 File: backend/src/routes/projects.ts

 The backend uses an explicit field whitelist. We need to:

 - Update handler (PUT): Add aspect_ratio to the whitelist validation block (~line 420-470). Validate it must be '16:9' or '9:16' if      
 provided. Add to updateData object.
 - Response mapper: Add aspectRatio: project.aspect_ratio || '16:9' to the response transformation (~line 520-538) in all GET/PUT
 response mappers.
 - Create handler (POST): Accept aspect_ratio in the create flow if applicable, defaulting to '16:9'.

 ---
 Step 4: Frontend Project Service

 File: src/lib/services/projectService.ts

 - Add aspect_ratio?: '16:9' | '9:16' to UpdateProjectRequest interface
 - No other changes needed — the service already forwards request fields to the backend

 ---
 Step 5: Stage 1 UI — Aspect Ratio Selector

 File: src/components/pipeline/Stage1InputMode.tsx

 - Add selectedAspectRatio: AspectRatio to Stage1Content interface (default '16:9')
 - Add a new form section (after Target Length or near Project Type) with two visual option buttons:
   - 16:9 (Landscape) — horizontal rectangle icon
   - 9:16 (Portrait) — vertical rectangle icon
 - Follow existing UI patterns (similar to the input mode selection cards)
 - In handleComplete(), include aspect_ratio: content.selectedAspectRatio in the projectService.updateProject() call

 ---
 Step 6: Project Header — Badge Display

 File: src/components/pipeline/ProjectHeader.tsx

 - Add aspectRatio?: string to ProjectHeaderProps
 - Render a badge/chip (matching the existing branch badge style) showing the aspect ratio value (e.g., "16:9" or "9:16")
 - Position it next to the branch badge

 File: src/pages/ProjectView.tsx

 - Pass aspectRatio={project?.aspectRatio || '16:9'} to ProjectHeader at all render locations (~lines 678, 760, 781)

 ---
 Step 7: Backend Frame Generation — Dynamic Dimensions

 File: backend/src/services/frameGenerationService.ts

 - Replace the hardcoded FRAME_DIMENSIONS constant:
 private readonly FRAME_DIMENSIONS: Record<string, { width: number; height: number }> = {
     '16:9': { width: 1280, height: 720 },
     '9:16': { width: 720, height: 1280 }
 };
 - In generateFrames() / startFrameGeneration(), fetch the project's aspect_ratio from the database (the projectId is already available   
 from the route params)
 - Use this.FRAME_DIMENSIONS[aspectRatio] instead of the single hardcoded value

 ---
 Step 8: Backend Video Generation — Dynamic Aspect Ratio

 File: backend/src/services/video-generation/VideoProviderInterface.ts

 - Add aspectRatio?: string to VideoGenerationParams interface

 File: backend/src/services/video-generation/Veo3Provider.ts

 - Accept aspectRatio from params instead of hardcoding '16:9'
 - In the request body: aspectRatio: params.aspectRatio || '16:9'

 File: backend/src/services/videoGenerationService.ts

 - When creating/executing video jobs, fetch the project's aspect_ratio and pass it through to the provider's generateVideo() call        

 ---
 Step 9: Frontend Image Service — Frame Anchor Consistency

 File: src/lib/services/imageService.ts

 - Update generateFrameAnchor() to accept an optional aspectRatio parameter
 - Map to dimensions: 16:9 → 1024x576 (current), 9:16 → 576x1024
 - Update inpaintImage() similarly if it hardcodes frame dimensions
 - This ensures any frontend-initiated frame operations also respect the project ratio

 ---
 Dimension Mapping Reference
 ┌──────────────┬─────────────────────────┬─────────────────┬──────────────┐
 │ Aspect Ratio │ Frame Anchor (frontend) │ Frame (backend) │ Video (Veo3) │
 ├──────────────┼─────────────────────────┼─────────────────┼──────────────┤
 │ 16:9         │ 1024×576                │ 1280×720        │ '16:9'       │
 ├──────────────┼─────────────────────────┼─────────────────┼──────────────┤
 │ 9:16         │ 576×1024                │ 720×1280        │ '9:16'       │
 └──────────────┴─────────────────────────┴─────────────────┴──────────────┘
 ---
 Files Modified (Summary)
 ┌─────────────────────────────────────────────────────────────────┬─────────────────────────────────────────────────────────────────┐    
 │                              File                               │                             Change                              │    
 ├─────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────┤    
 │ backend/migrations/XXX_add_aspect_ratio.sql                     │ NEW — Add column to projects table                              │    
 ├─────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────┤    
 │ src/types/project.ts                                            │ Add AspectRatio type, add field to Project & ProjectSettings    │    
 ├─────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────┤    
 │ backend/src/routes/projects.ts                                  │ Whitelist aspect_ratio in update/create, add to response mapper │    
 ├─────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────┤    
 │ src/lib/services/projectService.ts                              │ Add aspect_ratio to UpdateProjectRequest                        │    
 ├─────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────┤    
 │ src/components/pipeline/Stage1InputMode.tsx                     │ Add aspect ratio selector UI + save logic                       │    
 ├─────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────┤    
 │ src/components/pipeline/ProjectHeader.tsx                       │ Add aspect ratio badge                                          │    
 ├─────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────┤    
 │ src/pages/ProjectView.tsx                                       │ Pass aspectRatio prop to ProjectHeader                          │    
 ├─────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────┤    
 │ backend/src/services/frameGenerationService.ts                  │ Dynamic frame dimensions from project setting                   │    
 ├─────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────┤    
 │ backend/src/services/video-generation/VideoProviderInterface.ts │ Add aspectRatio to params interface                             │    
 ├─────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────┤    
 │ backend/src/services/video-generation/Veo3Provider.ts           │ Use dynamic aspect ratio                                        │    
 ├─────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────┤    
 │ backend/src/services/videoGenerationService.ts                  │ Fetch & pass aspect ratio to provider                           │    
 ├─────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────┤    
 │ src/lib/services/imageService.ts                                │ Dynamic frame anchor dimensions                                 │    
 └─────────────────────────────────────────────────────────────────┴─────────────────────────────────────────────────────────────────┘    
 ---
 Verification

 1. Lint: Run npm run lint after all changes
 2. Build: Run npm run build to verify no type errors
 3. Manual testing flow:
   - Create a new project → verify 16:9 is selected by default in Stage 1
   - Change to 9:16 → verify the value persists (refresh page, value should remain)
   - Check project header → badge should show "9:16"
   - Proceed to Stage 10 → trigger frame generation → verify frames are generated at 720×1280 (portrait)
   - Proceed to Stage 12 → trigger video generation → verify Veo3 receives aspectRatio: '9:16'
 4. Backward compatibility: Existing projects without aspect_ratio should default to 16:9 with no behavioral change
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌

 User answered Claude's questions:
  ⎿  · Stage 5 master assets currently use TYPE-SPECIFIC aspect ratios (character=2:3 portrait, prop=1:1 square, location=16:9
     cinematic). Should the project-level aspect ratio override ALL of these, or should it only apply to frames (Stage 10) and video      
     (Stage 11/12), leaving master asset type-based sizing untouched? → Frames & Video only (Recommended)
     · The task doc says ratio options 'NEED TO BE RESEARCHED.' I'll look into Veo3/Sora supported ratios, but do you already have        
     preferences or knowledge about which ratios you want to support? The current candidates are: 16:9, 9:16, 1:1, 4:3, 2.35:1. →
     constrain the options to strictly 16:9 and 9:16 ratios  (I did the research myself)
     · The CLAUDE.md says 'NEVER RUN: npm run migrate'. Should I write the migration SQL file (adding aspect_ratio column to the
     projects table) without executing it, so you can review and run it manually? → Write migration file only (Recommended)
     · The task doc mentions 'Stage 11 video generation' but in the codebase, video generation happens at Stage 12
     (Stage12VideoGeneration.tsx) with Veo3. Stage 11 doesn't appear to exist as a separate video stage. Should I treat this as Stage     
     12, or is there a Stage 11 component I'm missing? → It's Stage 12


# *Dev Summary*:

  Summary of Changes

  Files Created
  File: backend/migrations/022_add_aspect_ratio.sql
  Purpose: Adds aspect_ratio TEXT NOT NULL DEFAULT '16:9' with CHECK constraint to projects table
  Files Modified (12 files)
  File: src/types/project.ts
  Change: Added AspectRatio type, aspectRatio field to Project & ProjectSettings
  ────────────────────────────────────────
  File: backend/src/routes/projects.ts
  Change: Added aspect_ratio to all SELECT queries, validation in PUT handler, all 4 response mappers
  ────────────────────────────────────────
  File: src/lib/services/projectService.ts
  Change: Added aspect_ratio to UpdateProjectRequest
  ────────────────────────────────────────
  File: src/components/pipeline/Stage1InputMode.tsx
  Change: Added selectedAspectRatio to state, visual 16:9/9:16 selector buttons, saves to backend on complete      
  ────────────────────────────────────────
  File: src/components/pipeline/ProjectHeader.tsx
  Change: Added aspectRatio prop, renders badge next to branch indicator
  ────────────────────────────────────────
  File: src/pages/ProjectView.tsx
  Change: Added projectAspectRatio state, loads from project data, passes to all 3 ProjectHeader instances
  ────────────────────────────────────────
  File: backend/src/services/frameGenerationService.ts
  Change: Dynamic FRAME_DIMENSIONS lookup by aspect ratio (16:9→1280x720, 9:16→720x1280)
  ────────────────────────────────────────
  File: backend/src/routes/frames.ts
  Change: Fetches aspect_ratio from project, passes to frame generation/regeneration/inpaint
  ────────────────────────────────────────
  File: backend/src/services/video-generation/VideoProviderInterface.ts
  Change: Added aspectRatio? to VideoGenerationParams
  ────────────────────────────────────────
  File: backend/src/services/video-generation/Veo3Provider.ts
  Change: Uses params.aspectRatio instead of hardcoded '16:9'
  ────────────────────────────────────────
  File: backend/src/services/video-generation/VideoJobExecutor.ts
  Change: Fetches project aspect_ratio before calling provider
  ────────────────────────────────────────
  File: src/lib/services/imageService.ts
  Change: generateFrameAnchor() and inpaintImage() accept aspectRatio param with dynamic dimensions
  Verification

  - tsc --noEmit — zero new errors (frontend passes clean)
  - npm run build — production build succeeds
  - npm run lint — all errors are pre-existing; no new lint issues introduced
  - Backward compatible — default '16:9' everywhere, existing projects unaffected