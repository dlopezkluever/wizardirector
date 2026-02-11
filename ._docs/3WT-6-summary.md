  Summary of Changes

  4 files modified:

  1. backend/src/routes/projects.ts
  - Added imports for StyleCapsuleService and ContextManager
  - Enriched project query to include visual_style_capsule_id
  - Enriched asset instance query to include effective_description, image_key_url, carry_forward, inherited_from_instance_id,       
  use_master_as_is, selected_master_reference_url, and master image_key_url
  - Replaced const styleCapsule = null with actual fetch via StyleCapsuleService.getCapsuleById()
  - Added context size monitoring with token estimation and warning logs

  2. backend/src/services/promptGenerationService.ts
  - Extended SceneAssetInstanceData interface with image_key_url, master_image_url, carry_forward, inherited_from_instance_id, and  
  project_asset.image_key_url
  - Rewrote buildAssetContext() to produce rich context with inheritance info, image reference indicators, and per-type grouping    
  - Rewrote frame prompt system message following the Veo 3.1 5-part formula (Camera + Subject + Spatial + Environment + Lighting)  
  with explicit "no action/dialogue/sound" rules
  - Rewrote video prompt system message following the 4-part formula (Camera Movement + Action + Dialogue + Sound Design) with      
  explicit "no visual descriptions" rules
  - Updated character limits: frame prompt 1000→1200, video prompt 800→500
  - Added camera data split guidance in both user prompts

  3. backend/src/services/shotExtractionService.ts
  - Enhanced system prompt with richer shot description quality requirements
  - Camera field now requires 3 components: SHOT_TYPE - ANGLE - MOVEMENT
  - Action field now requires character blocking, body language, emotional state, environmental/atmospheric details, lighting cues, 
  spatial relationships
  - Updated JSON schema example to match new requirements

  4. backend/src/services/contextManager.ts
  - Extended LocalContextSceneAsset interface with masterImageUrl, carryForward, inheritedFromInstanceId
  - Updated assembleLocalContext() to populate the new fields from DB results
  - Added formatPromptGenerationContext() method that converts local context to SceneAssetInstanceData[] with context size
  monitoring and priority-based truncation (characters > locations > props)

✻ Brewed for 6m 11s

❯ Can you please write me a brief implemenetion summary describing the changes you made to the codebase, with a breif & to the      
                                                                                                                                    
    point testing guide at the end.                                                                                                 

● Here's the implementation summary:

  ---
  3WT-6 Implementation Summary: Asset Inheritance Chain, Shot List Enhancement & Context Manager

  What Changed

  Style Capsule Fix — backend/src/routes/projects.ts
  The visual style capsule was hardcoded to null in the generate-prompts route. Now fetches the actual capsule via
  StyleCapsuleService.getCapsuleById() using the project's visual_style_capsule_id. Style data (design pillars, descriptor strings, 
  labels, negative constraints) now reaches frame prompts.

  Enriched Asset Query — backend/src/routes/projects.ts
  The scene asset instance query was missing key fields. Now fetches effective_description, image_key_url, carry_forward,
  inherited_from_instance_id, use_master_as_is, selected_master_reference_url, and the master asset's image_key_url. All passed     
  through to prompt generation.

  Rich Asset Context — backend/src/services/promptGenerationService.ts
  buildAssetContext() rewritten. Now includes inheritance indicators ([inherited, carry_forward]), image reference availability     
  notes, status tags, and groups by type (CHARACTERS/LOCATIONS/PROPS). SceneAssetInstanceData interface extended with image_key_url,   master_image_url, carry_forward, inherited_from_instance_id.

  Veo 3.1-Aligned Prompt System Messages — backend/src/services/promptGenerationService.ts
  - Frame prompt follows 5-part formula: Camera Position & Framing → Subject Appearance → Spatial Placement & Pose → Environment &  
  Props → Lighting, Color & Style. Explicitly forbids action/dialogue/sound.
  - Video prompt follows 4-part formula: Camera Movement → Action/Performance → Dialogue → Sound Design. Explicitly forbids visual  
  descriptions.
  - Camera split guidance added: static position goes to frame, movement goes to video.
  - Char limits updated: frame 1000→1200, video 800→500.

  Shot List Extraction Enhancement — backend/src/services/shotExtractionService.ts
  System prompt now requires: 3-component camera specs (SHOT_TYPE - ANGLE - MOVEMENT), detailed action descriptions with character  
  blocking/positioning, body language, environmental/atmospheric details, lighting cues, and spatial relationships.

  Context Manager Integration — backend/src/services/contextManager.ts
  - LocalContextSceneAsset extended with masterImageUrl, carryForward, inheritedFromInstanceId.
  - assembleLocalContext() populates new fields.
  - Added formatPromptGenerationContext() method with token-based context size monitoring and priority-based truncation (props      
  first, then locations, then characters).
  - Route now logs asset context token estimates and warns when exceeding 4000 tokens.

  ---
  Testing Guide

  1. Generate prompts for a scene (Stage 9)
  - Open a project with a visual style capsule assigned and scenes with extracted shots
  - Trigger prompt generation for a scene
  - Check backend logs for: [Stage9] Loaded visual style capsule: <name> — confirms style capsule is no longer null
  - Check logs for: [Stage9] Asset context size: ~X tokens for Y assets

  2. Verify frame prompt quality
  - Inspect generated frame prompts — should follow the 5-part structure (camera → subject → spatial → environment → lighting)      
  - Should contain NO action verbs, dialogue, or sound references
  - Should reference character descriptions from master assets
  - Should be up to ~1200 chars

  3. Verify video prompt quality
  - Inspect generated video prompts — should be lean (action + camera movement + dialogue + SFX)
  - Should contain NO character appearance, environment, or lighting descriptions
  - Should be ~500 chars max

  4. Extract a shot list (Stage 8)
  - Trigger shot extraction for a scene
  - Verify camera fields follow TYPE - ANGLE - MOVEMENT format (e.g., "MS - Eye Level - Slow Dolly In")
  - Verify action fields include spatial detail, body language, atmosphere — not just story narration

  5. Style capsule influence
  - Compare prompts from a project WITH a visual style capsule vs one WITHOUT
  - The styled project's frame prompts should include style-specific aesthetics (design pillars, color/lighting directives, negative   constraints)