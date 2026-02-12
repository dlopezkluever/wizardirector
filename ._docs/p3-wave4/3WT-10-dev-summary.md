  Implementation Complete

  3C.1 — Transparent Background Auto-Injection

  7 files modified, 2 new files created, 612 lines added

  - ImageGenerationService.ts — Added injectBackgroundContext() method that automatically appends ". Isolated on a plain white      
  background, no environment, no other characters or objects." to prompts for character/prop/extra_archetype assets. Added
  postProcessBackground() placeholder for future Rembg/API integration. Wired into all generation paths: createImageJob(),
  createSceneAssetImageJob(), and createGlobalAssetImageJob().

  3C.2 — Multi-Angle Asset Generation

  - 025_asset_angle_variants.sql (NEW) — Migration with table schema, indexes, RLS policy, and updated_at trigger
  - src/types/asset.ts — Added AngleType, AssetAngleVariant interface, ANGLE_LABELS and ANGLE_PROMPTS constants
  - ImageGenerationService.ts — Added createAngleVariantJob() method, angle_variant job type, completion/failure handlers, and      
  angle-specific storage paths
  - backend/src/routes/projectAssets.ts — 3 new endpoints: GET list variants, POST generate variants, DELETE variant
  - src/lib/services/projectAssetService.ts — 3 new frontend API methods: listAngleVariants, generateAngleVariants,
  deleteAngleVariant
  - AngleVariantsDialog.tsx (NEW) — 2x2 grid dialog with generate/regenerate/delete per angle, "Generate Missing Angles" batch      
  button, polling for completion status
  - Stage5Assets.tsx — Added "Manage Angles" dropdown menu item (characters only) + dialog integration

  Phase 3 — Angle-to-Shot Matching

  - promptGenerationService.ts — Added mapCameraToAngleType() and enrichAssetsWithAngleMatch() functions. Wired into
  generatePromptSet() so frame prompts automatically reference the best-matching angle variant image.
  - backend/src/routes/projects.ts — Stage 9 prompt generation route now fetches angle variants for character assets and attaches   
  them to scene asset data

  Lint Status

  All new code passes lint. No new errors introduced (all existing errors are pre-existing @typescript-eslint/no-explicit-any       
  patterns).

✻ Brewed for 8m 43s