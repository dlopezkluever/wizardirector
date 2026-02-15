# WT-B: Structured Image & Video Prompts (Stage 9 Prompt Engine Overhaul)

**Wave**: 1 (parallel with WT-A and WT-C)
**Tasks**: 4C.1
**Scope**: Complete overhaul of prompt generation — structured, deterministic, leveraging all prior stage data

> **Note**: 4A.1 (Content Access Carousel) has already been built and merged. `RearviewMirror.tsx` has been replaced by `ContentAccessCarousel.tsx` across all stages 6-12. Stage9PromptSegmentation.tsx now includes the ContentAccessCarousel. Be aware of this when modifying Stage 9.

---

## Task 4C.1 — Revise Structured Image & Video Prompts

**Priority**: HIGH
**This is the keystone task of Phase 4** — Wave 2 tasks 4C.5 (prompt chaining) and 4E.1 (adaptive descriptions) both depend on this landing first.

### Problem
Prompts used to be vague, unstructured paragraphs — not optimal for frame/video generation.   

We Tried Fixing this by implementing the following task:
### Ticket DC-2 (from Tickets.md — related context)
> Standard screenplay-format scripts lack the detail needed for production prompting. This is the motivation for the Master Document stage (see 4.2). The system needs clear, descriptive action/character/setting details — not minimalist screenplay conventions.


Prompts should be structured and deterministic, incorporating character descriptions, scene context, shot list details, camera angles, and visual style capsule directives.

### Ticket 9.1 (from Tickets.md)
> Current prompts are vague, unstructured paragraphs — likely not optimal for frame/video generation. Need robust, structured, deterministic prompts that leverage all work done in previous stages. Set format optimized per provider (one for Sora, one for Veo3).

Now We implemented the following POORLY earlier: """Prompt Generation System Messages (Core Improvement)

 File: backend/src/services/promptGenerationService.ts (~lines 262-340)

 Step 4.1 — Rewrite frame prompt system message:
 - Structure around the guide's 5-part formula: [Camera Position & Framing] + [Subject Appearance] + [Spatial Placement &   
 Pose] + [Environment & Props] + [Lighting, Color & Style]
 - Explicitly instruct: NO action, NO dialogue, NO sound — frozen visual snapshot
 - Instruct the LLM to use asset descriptions for character appearance blocks
 - Include style capsule aesthetic directives (design pillars, descriptor strings, negative constraints)
 - Instruct to reference master image descriptions when available

 Step 4.2 — Rewrite video prompt system message:
 - Structure around the guide's formula: [Camera Movement] + [Action/Performance] + [Dialogue] + [Sound Design]
 - Explicitly instruct: NO character appearance, NO environment description, NO lighting/color
 - Instruct: "The starting frame already encodes all visual truth"
 - Include dialogue with delivery direction (accent, tone, pace, emotion)
 - Include SFX and ambient audio direction

 Step 4.3 — Update character limits:
 - Frame prompt: 800 → 1200 characters
 - Video prompt: 600 → 500 characters
 - Update cleanPromptOutput() calls and system prompt instructions

 Step 4.4 — Improve camera data routing:
 - In frame prompt user message: instruct LLM to extract STATIC camera position from the camera field
 - In video prompt user message: instruct LLM to extract MOVEMENT from the camera field
 - Add explicit split guidance: "Camera position (shot type, angle, lens) goes in frame prompt. Camera movement (pan,       
 dolly, track) goes in video prompt."""


**Note**: DC-2 was deferred as a separate stage. Instead, 4C.1 addresses this by making prompts themselves pull in all the rich context from earlier stages.

### MVP-tasklist-v1.1 Reference (Feature 5.2)
> Context-aware asset description generation based on scene/shot requirements. Merge master asset descriptions with scene-specific context.

### Core Features
- [ ] **Structured prompt template system** (not freeform paragraphs)
- [ ] **Frame Prompt structure** — Include all of:
  1. Camera Position & Framing (shot type, angle, lens)
  2. Subject Appearance (character descriptions from assets)
  3. Spatial Placement & Pose (positions, static poses from shot action)
  4. Environment & Props (location description, furniture, surfaces)
  5. Lighting, Color & Style (from visual style capsule + scene context)
  - **NO action, movement, dialogue, or sound** — purely visual/spatial snapshot
- [ ] **Video Prompt structure** — Include all of:
  1. Camera Movement (pan, dolly, zoom, static — from shot camera field)
  2. Action/Performance (what characters do, gestures — from shot action)
  3. Dialogue (exact words with voice direction — from shot dialogue)
  4. Sound Design (SFX, ambient, music — inferred from scene context)
  - **NO character appearance, environment, or lighting** — action/audio focused
- [ ] **Leverage all Stage 1-8 data** in prompt assembly:
  - Stage 4: Master Script (scene script excerpt)
  - Stage 5: Master asset descriptions + images
  - Stage 7: Shot list details (action, dialogue, camera, duration, characters, setting)
  - Stage 8: Scene asset instances (effective descriptions, status tags, scene-specific images)
  - Style Capsule: Visual style directives
- [ ] **Provider-specific optimization** (Veo3 format, future Sora format)
- [ ] **Deterministic assembly** — same inputs always produce same prompt structure
- [ ] **Character length enforcement** — Frame prompt max ~1200 chars, Video prompt max ~500 chars (current limits; may adjust)

### Current Architecture (what exists today)
The current `promptGenerationService.ts` already has a frame/video prompt dual system with the 5-part formula. The overhaul should:
1. Improve the quality and specificity of each section
2. Better leverage asset descriptions (currently may not be pulling scene instance `effective_description`)
3. Add provider-specific formatting
4. Make the template system more maintainable
5. Ensure the context manager feeds richer data into prompt assembly

### Dependencies
- 3C.4 (Context Manager Enhancement) — **DONE** ✅
- 4B.4 (Shot List Action Descriptions) — **DONE** ✅

---

## Files At Play

### Backend (Primary — this is mostly a backend task)
- `backend/src/services/promptGenerationService.ts` — **PRIMARY FILE**: Core prompt assembly logic, `generatePromptSet()`, `generateBulkPromptSets()`, `buildAssetContext()`, `buildStyleContext()`
- `backend/src/services/contextManager.ts` — Context assembly: `formatPromptGenerationContext()`, asset truncation logic, token size monitoring
- `backend/src/services/prompt-template.ts` — Template storage/interpolation (may be useful for structured templates)
- `backend/src/services/llm-client.ts` — LLM client (Gemini calls for prompt generation)
- `backend/src/routes/projects.ts` — Stage 9 endpoints (lines ~1816-2213):
  - `GET /api/projects/:id/scenes/:sceneId/prompts`
  - `PUT /api/projects/:id/scenes/:sceneId/shots/:shotId/prompts`
  - `POST /api/projects/:id/scenes/:sceneId/generate-prompts`

### Frontend (Secondary — UI may need minor updates)
- `src/components/pipeline/Stage9PromptSegmentation.tsx` — Stage 9 UI component (now includes ContentAccessCarousel from 4A.1). May need updates if prompt structure display changes.
- `src/lib/services/promptService.ts` — Frontend API client for prompt endpoints

### Types
- `src/types/scene.ts` — `PromptSet` interface (lines 176-194): shotId, framePrompt, videoPrompt, requiresEndFrame, compatibleModels, promptsGeneratedAt

### Context/Asset Services (read paths — understand but may not modify)
- `backend/src/services/assetInheritanceService.ts` — Asset inheritance chain
- `backend/src/services/assetDescriptionMerger.ts` — Description merging logic
- `backend/src/services/sceneAssetRelevanceService.ts` — Asset relevance per scene
