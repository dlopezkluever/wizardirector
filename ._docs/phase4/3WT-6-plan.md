 Here is Claude's plan:
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌ Plan: Asset Inheritance Chain, Shot List Enhancement & Context Manager

 Context

 Problem: The pipeline from Stage 5 (master assets) → Stage 8 (shot list) → Stage 9 (prompts) → Stage 10 (frame generation) 
  produces generic-looking outputs because:
 1. Stage 9 fetches incomplete asset data (missing effective_description, image_key_url, generation history)
 2. buildAssetContext() produces bare-minimum text — no visual continuity, no inheritance chain info
 3. Visual style capsule is hardcoded to null — style data NEVER reaches prompts
 4. Shot list extraction (Stage 8) produces thin action descriptions — no camera detail, mise-en-scène, or spatial
 choreography
 5. Context manager exists but isn't used by prompt generation — ad-hoc assembly instead
 6. Frame prompts capped at 800 chars and video at 600 chars — too restrictive for guide-compliant prompts

 Goal: Fix the data flow so that master assets, visual style, inheritance chain context, and rich shot descriptions all     
 reach the final frame/video prompts, structured per the Veo 3.1 Frame-to-Video Prompt Format Guide.

 Scope: 3 features — 3C.3 (Asset Inheritance), 4B.4 (Shot List Enhancement), 3C.4 (Context Manager) + style capsule null    
 fix + prompt limit increase.

 ---
 Implementation Phases

 Phase 1: Fix Style Capsule Null + Enrich Asset Query (Critical Path)

 Files: backend/src/routes/projects.ts (~lines 2050-2100)

 Step 1.1 — Fix visual style capsule fetch in generate-prompts route:
 - Replace the const styleCapsule = null; with an actual fetch
 - Use existing StyleCapsuleService.getCapsuleById() (already imported in contextManager.ts)
 - Fetch visual_style_capsule_id from the project record (already queried at top of route)
 - Pass the resolved capsule to promptGenerationService.generateBulkPromptSets()

 Step 1.2 — Enrich the asset query in generate-prompts route:
 - Current query fetches: id, description_override, status_tags, project_assets(id, name, asset_type, description)
 - Add: effective_description, image_key_url, carry_forward, inherited_from_instance_id, use_master_as_is,
 selected_master_reference_url
 - Also fetch the project asset's image_key_url (master reference image)
 - Use effective_description directly from DB instead of naive reconstruction

 Step 1.3 — Update SceneAssetInstanceData type to carry richer data:
 - Add image_key_url, master_image_url, carry_forward, inherited_from_instance_id to the interface
 - File: backend/src/services/promptGenerationService.ts (interface around line 10-25)

 ---
 Phase 2: Rewrite buildAssetContext() (Core Improvement)

 File: backend/src/services/promptGenerationService.ts (function at ~lines 62-94)

 Rewrite to produce rich, guide-compliant asset context:

 CHARACTERS:
 - ELARA [inherited, carry_forward]: A wise elder with silver hair and deep brown eyes,
   weathered face with pronounced crow's feet, wearing layered earth-tone robes with
   a leather satchel. Master reference available. Status: [intro, scene_1_continuity]

 LOCATIONS:
 - TEMPLE INTERIOR: Ancient stone temple with vaulted ceilings, carved pillars, and
   mosaic floor. Warm candlelight from alcoves. Master reference available.

 PROPS:
 - STAFF: Ornate wooden staff with carved runes, 6 feet tall. Carried by ELARA.

 Key improvements:
 - Include image_key_url presence indicator ("Master reference available" / "Scene reference available")
 - Include inheritance info (inherited vs new to scene, carry_forward status)
 - Use effective_description from DB (not naive fallback)
 - Include status tags inline
 - Group by asset type with clear formatting

 ---
 Phase 3: Enhance Shot List Extraction Prompt (4B.4)

 File: backend/src/services/shotExtractionService.ts (~lines 132-178)

 Step 3.1 — Enhance the system prompt to request richer data:
 - Change "action": "atomic physical description" to request:
   - Detailed character blocking and positioning (who is where in frame)
   - Environmental/atmospheric details relevant to the shot
   - Lighting cues if implied by script (e.g., "sun streams through window")
   - Character emotional state and body language
 - Add instruction to make camera field more specific:
   - Include shot type + angle + any movement (e.g., "MS - Eye Level - Slow Dolly In")
   - Include framing notes (e.g., "subject frame-left, looking frame-right")

 Step 3.2 — Update the JSON schema instruction in the prompt:
 {
   "shots": [
     {
       "shot_order": 0,
       "duration": 8,
       "dialogue": "exact lines or empty string",
       "action": "Detailed description: character positions, movement, body language,
                  emotional state, environmental details, lighting if relevant",
       "characters": [{"name": "NAME", "prominence": "foreground|background|off-screen"}],
       "setting": "specific location with atmosphere and spatial details",
       "camera": "SHOT_TYPE - ANGLE - MOVEMENT (e.g., MS - Eye Level - Static,
                  CU - Low Angle - Slow Dolly In)",
       "continuity_flags": [],
       "beat_reference": ""
     }
   ]
 }

 Step 3.3 — Add a "SHOT DESCRIPTION QUALITY" section to the system prompt:
 - Emphasize that action must describe what a viewer would SEE, not just narrate story beats
 - Require spatial relationships (foreground/midground/background)
 - Require atmospheric/environmental context (lighting quality, time of day cues)
 - Reference that this data feeds image and video generation — precision matters

 ---
 Phase 4: Rewrite Prompt Generation System Messages (Core Improvement)

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
 dolly, track) goes in video prompt."

 ---
 Phase 5: Wire Context Manager into Prompt Generation (3C.4)

 File: backend/src/routes/projects.ts (~lines 2030-2100), backend/src/services/contextManager.ts

 Step 5.1 — Add Stage 9 context preparation to ContextManager:
 - Add a formatPromptGenerationContext() method to ContextManager
 - This method assembles: visual style capsule + scene assets (rich) + prior scene end-state
 - Returns a structured context object for prompt generation

 Step 5.2 — Add assembleLocalContext enhancement for prompt generation:
 - The existing assembleLocalContext() already fetches scene assets with project_asset join
 - Enhance it to also fetch effective_description, image_key_url, carry_forward, inherited_from_instance_id (matching Phase 
  1.2 enrichment)
 - Add prior scene end-state fetch for continuity context

 Step 5.3 — Replace ad-hoc context assembly in projects.ts:
 - Instead of manually fetching assets + shots + styleCapsule in the route handler
 - Use contextManager.assembleGlobalContext() + contextManager.assembleLocalContext()
 - Pass the assembled context to promptGenerationService

 Step 5.4 — Add basic context size monitoring:
 - Use existing estimateContextSize() method in ContextManager
 - Log a warning if combined context exceeds a reasonable threshold (~4000 tokens)
 - Implement simple truncation: if asset descriptions exceed budget, truncate oldest/least-relevant first
 - Priority order: characters > locations > props > status tags > inheritance history

 ---
 File Change Summary
 File: backend/src/routes/projects.ts
 Changes: Fix style capsule null, enrich asset query, wire through ContextManager
 ────────────────────────────────────────
 File: backend/src/services/promptGenerationService.ts
 Changes: Rewrite buildAssetContext(), rewrite frame/video system prompts, update char limits, enrich
 SceneAssetInstanceData
    type
 ────────────────────────────────────────
 File: backend/src/services/shotExtractionService.ts
 Changes: Enhance extraction system prompt for richer shot data
 ────────────────────────────────────────
 File: backend/src/services/contextManager.ts
 Changes: Add formatPromptGenerationContext(), enhance assembleLocalContext(), add context size monitoring
 ---
 Verification

 1. Lint: Run npm run lint from project root after all changes
 2. Build: Run npm run build:dev to verify TypeScript compilation
 3. Manual test: Generate prompts for a scene and verify:
   - Style capsule data appears in frame prompt context
   - Asset descriptions include effective descriptions and inheritance info
   - Frame prompts follow the 5-part formula (camera + subject + spatial + environment + lighting)
   - Video prompts are lean (action + camera movement + dialogue + SFX only)
   - Frame prompts reach ~1200 char limit, video prompts ~500 char limit
   - No visual descriptions in video prompts
 4. Shot extraction test: Extract a shot list and verify richer action and camera fields
 5. Context size: Check logs for context size warnings on large projects

 ---
 Implementation Order

 1. Phase 1 (style capsule fix + asset query enrichment) — highest ROI, unblocks everything
 2. Phase 2 (rewrite buildAssetContext) — immediate prompt quality improvement
 3. Phase 4 (rewrite prompt system messages) — aligns with Veo 3.1 guide
 4. Phase 3 (shot list extraction enhancement) — improves upstream data quality
 5. Phase 5 (context manager wiring) — architectural cleanup + size management

 This order prioritizes the "biggest bang" fixes first: fixing the null style capsule and enriching asset context will have 
  an immediately visible impact on generation quality.