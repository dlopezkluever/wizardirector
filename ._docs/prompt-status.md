---
  Stages with NO LLM Prompts

  - Stage 1 (Input Mode) — user input only
  - Stage 6 (Script Hub) — UI display of scenes from Stage 4
  - Stage 11 (Frame Review) — UI for reviewing generated frames
  - Stage 12 (Video Generation) — sends Stage 9's frame/video prompts to Veo 3.1 API, no text LLM

  ---
  Stage 2: Treatment Generation

  3 prompts in src/lib/services/treatmentService.ts + backend/scripts/seed-templates.ts

  Prompt: 2A — Treatment Expansion
  What it does: Generates 3 distinct 800-1200 word treatment variations from user's story idea
  Location: DB template treatment_expansion seeded in backend/scripts/seed-templates.ts:22-83
  ────────────────────────────────────────
  Prompt: 2B — Section Regeneration
  What it does: Rewrites a selected text section within a treatment
  Location: src/lib/services/treatmentService.ts:205-227
  ────────────────────────────────────────
  Prompt: 2C — Section Alternatives
  What it does: Generates 3 alternative rewrites for a selected section
  Location: src/lib/services/treatmentService.ts:262-283

  2A System Prompt (the big one):
  You are a narrative expansion specialist. Your role is to transform brief story ideas
  into fully-realized 3-act treatments.

  CONSTRAINTS:
  - Target length: {target_length_min} to {target_length_max} seconds of screen time
  - Project type: {project_type}
  - Content rating: {content_rating}
  - Genre: {genres}
  - Tonal guidance: {tonal_precision}

  REQUIREMENTS:
  1. Generate exactly 3 distinct treatment variations
  2. Each treatment must be continuous prose (no scene breaks yet)
  3. Prioritize visual storytelling over dialogue-heavy sequences
  4. Respect the content rating constraints
  5. Adhere to the tonal guidance provided
  6. Each variation should have a different structural emphasis

  WRITTEN STYLE CONTEXT:
  {writing_style_context}

  OUTPUT STRUCTURE: Generate 3 complete treatments as JSON...

  ---
  Stage 3: Beat Sheet

  3 prompts in src/lib/services/beatService.ts + backend/scripts/seed-templates.ts

  ┌─────────────────┬──────────────────────────────────────┬────────────────────────────────────────────────────────────────┐  │     Prompt      │             What it does             │                            Location                            │  ├─────────────────┼──────────────────────────────────────┼────────────────────────────────────────────────────────────────┤  │ 3A — Beat       │ Extracts 15-30 structural beats from │ DB template beat_extraction seeded in                          │  │ Extraction      │  a prose treatment                   │ backend/scripts/seed-templates.ts:89-143                       │  ├─────────────────┼──────────────────────────────────────┼────────────────────────────────────────────────────────────────┤  │ 3B — Beat       │ Generates 3 alternative versions of  │ src/lib/services/beatService.ts:197-216                        │  │ Brainstorm      │ a specific beat                      │                                                                │  ├─────────────────┼──────────────────────────────────────┼────────────────────────────────────────────────────────────────┤  │ 3C — Beat Split │ Splits one beat into 2-3 more        │ src/lib/services/beatService.ts:257-273                        │  │                 │ granular beats                       │                                                                │  └─────────────────┴──────────────────────────────────────┴────────────────────────────────────────────────────────────────┘
  ---
  Stage 4: Master Script

  3 prompts in src/lib/services/scriptService.ts + backend/scripts/seed-templates.ts

  Prompt: 4A — Master Script Generation
  What it does: Converts beat sheet into visually verbose screenplay
  Location: DB template master_script_generation seeded in backend/scripts/seed-templates.ts:148-200
  ────────────────────────────────────────
  Prompt: 4B — Script Section Regen
  What it does: Rewrites a highlighted section of screenplay
  Location: src/lib/services/scriptService.ts:209-232
  ────────────────────────────────────────
  Prompt: 4C — Script Section Alternatives
  What it does: 3 alternative rewrites for a highlighted section
  Location: src/lib/services/scriptService.ts:282-309

  Key instruction in 4A: "The LLM is explicitly instructed to maximize descriptive text regarding Characters, Settings,      
  Props, Action, and other Mise-en-scene for explicit visual translation."

  ---
  Stage 5: Asset Extraction

  5 prompts across multiple backend services:

  Prompt: 5A — Entity Mention Extraction (legacy)
  What it does: Extracts characters/props/locations from script
  Location: backend/src/services/assetExtractionService.ts:367-389
  ────────────────────────────────────────
  Prompt: 5B — Visual Description Distillation
  What it does: Creates 3-5 sentence AI-image-ready description per asset
  Location: backend/src/services/assetExtractionService.ts:531-565
  ────────────────────────────────────────
  Prompt: 5C — Asset Description Merger
  What it does: Merges global + project-specific asset descriptions
  Location: backend/src/services/assetDescriptionMerger.ts:48-67
  ────────────────────────────────────────
  Prompt: 5D — Image Analysis (Vision)
  What it does: Extracts visual description from an uploaded asset image
  Location: backend/src/services/imageAnalysisService.ts:48-52
  ────────────────────────────────────────
  Prompt: 5E — Image Description Merge
  What it does: Merges script-based + image-extracted descriptions
  Location: backend/src/services/imageAnalysisService.ts:96-104

  ---
  Stage 7: Shot Extraction

  3 prompts in backend services:

  Prompt: 7A — Shot List Extraction
  What it does: Breaks scene into atomic 8-second shots with camera/action/dialogue/characters
  Location: backend/src/services/shotExtractionService.ts:132-186
  ────────────────────────────────────────
  Prompt: 7B — Shot Split
  What it does: Splits one shot into two
  Location: backend/src/services/shotSplitService.ts:117-151
  ────────────────────────────────────────
  Prompt: 7C — Shot Merge
  What it does: Merges two consecutive shots into one
  Location: backend/src/services/shotMergeService.ts:109-130

  7A is the most complex prompt — it enforces the 5-part camera spec (SHOT_TYPE - ANGLE - MOVEMENT), mandates physical       
  performance descriptions over vague actions, and requires continuity with previous scene end-state.

  ---
  Stage 8: Scene Asset Relevance

  1 prompt in backend/src/services/sceneAssetRelevanceService.ts:127-222

  Prompt: 8A — Scene Asset Relevance
  What it does: Determines which master assets appear in a scene, their starting visual state, and any new assets needed     

  ---
  Stage 9: Prompt Segmentation (Frame + Video Prompts)

  3 prompts in backend/src/services/promptGenerationService.ts

  ┌─────────────────────────┬─────────────────────────────────────────────────────────────────────────────┬─────────┐        
  │         Prompt          │                                What it does                                 │  Lines  │        
  ├─────────────────────────┼─────────────────────────────────────────────────────────────────────────────┼─────────┤        
  │ 9A — Start Frame Prompt │ Generates a frozen visual snapshot for the starting frame (max 1200 chars)  │ 407-447 │        
  ├─────────────────────────┼─────────────────────────────────────────────────────────────────────────────┼─────────┤        
  │ 9B — Video Prompt       │ Generates lean action/movement/dialogue/sound prompt (max 500 chars)        │ 462-496 │        
  ├─────────────────────────┼─────────────────────────────────────────────────────────────────────────────┼─────────┤        
  │ 9C — End Frame Prompt   │ Generates frozen visual snapshot of end state after action (max 1200 chars) │ 516-554 │        
  └─────────────────────────┴─────────────────────────────────────────────────────────────────────────────┴─────────┘        

  These are the most architecturally interesting — 9A/9C describe still photographs (no verbs of motion), while 9B describes 
  only what happens when you press play (no appearance/environment descriptions). The frame ↔ video split is by design so    
  the video model gets motion-only instructions.

  ---
  Stage 10: Image Generation

  3 prompt patterns in backend/src/services/image-generation/

  Prompt: 10A — Prompt Enrichment
  What it does: Prepends reference image/style instructions to frame prompt for Gemini
  Location: NanoBananaClient.ts:69-103
  ────────────────────────────────────────
  Prompt: 10B — Background Isolation
  What it does: Appends "isolated on plain white background" for character/prop assets
  Location: ImageGenerationService.ts:77-88
  ────────────────────────────────────────
  Prompt: 10C — Angle Variants
  What it does: Generates front/side/3-quarter/back view prompts for character turnarounds
  Location: ImageGenerationService.ts:248-262

  ---
  Cross-Cutting: Context Injection

  The Context Manager (backend/src/services/contextManager.ts) assembles the global context package (project params, writing 
  style capsule, beat sheet, master script summary) and local context (scene script, prior scene end state, scene assets)    
  that gets injected into Stage 7, 8, and 9 prompts.

  The Style Capsule writing style is formatted by backend/src/services/styleCapsuleService.ts:330-361 and injected as        
  {writing_style_context} in Stages 2-4.

  ---
  Architecture Summary

  Stages 2-4: Stages 5, 7, 8, 9, 10
  Prompts stored in DB prompt_templates table, interpolated at runtime via POST /api/llm/generate-from-template: Prompts     
    hardcoded in backend service files, built dynamically with string interpolation

  Total: ~20 distinct LLM prompts across the pipeline. For your evals, the highest-impact ones to optimize are probably 7A   
  (shot extraction quality), 9A/9B (frame/video prompt quality directly determines visual output), and 4A (screenplay        
  richness feeds everything downstream).