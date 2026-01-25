# MASTER Implementation Summary – Phase 3: Asset Management + Stage 5
Last Updated: 2026-01-xx  
Overall Status: ~92–95% MVP (core flows work, polish + edge cases + reliability gaps remain)  
Biggest current risks: batch image gen reliability, LLM JSON fragility, missing metadata migration

## 1. Quick Status at a Glance (TL;DR for engineers)

| Feature                          | Status     | Confidence | Main files touched (2025–2026)                          | Biggest recent fixes / gotchas solved                  |
|-------------------------------|------------|------------|----------------------------------------------------------|--------------------------------------------------------|
| 3.1 Image Generation Service  | ✅ Done    | 95%        | ImageGenerationService.ts, images.ts, 007_*.sql         | background jobs, idempotency, cost tracking, polling  |
| 3.2 Global Asset Library      | ✅ Done    | 90%        | assets.ts, AssetLibrary.tsx, AssetCard.tsx, types/asset.ts | CRUD + RLS + dependency check on delete               |
| 3.3 Stage 5 Extraction & Def  | ✅ Done    | 88%        | Stage5Assets.tsx, assetExtractionService.ts, 3.3 summary | version query fix, JSON repair, image URL persistence |
| 3.4 Project-Level Assets      | ✅ Done    | 94%        | projectAssets.ts, assetImageLocalizer.ts, AssetDrawer.tsx | non-destructive sync, override tracking, image localize|
| Extra: Asset Match Modal      | ✅ Done    | 92%        | AssetMatchModal.tsx, assetDescriptionMerger.ts, clone endpoint | name strategy, merge LLM, reference-image regen       |

## 2. Detailed Change Log by Feature (what actually got edited)

### 2.1 Feature 3.1 – Image Generation Service

**Created files**
- migrations/007_image_generation_jobs.sql
- services/image-generation/NanoBananaClient.ts
- services/image-generation/ImageGenerationService.ts
- services/image-generation/ImageProviderInterface.ts
- routes/images.ts
- tests/image-generation.test.ts

**Meaningful edits**
- server.ts – added images router registration
- ImageGenerationService.ts – added executeJobInBackground(), referenceImageUrl support, failure_stage tracking
- NanoBananaClient.ts – retry logic (3 attempts), error classification (rate-limit vs permanent)
- migrations/007 – added idempotency_key unique constraint, attempt_count/retry_count
- jest.config.js + jest.setup.ts – added for real integration tests

**Critical fixes during testing**
- Switched from synchronous wait → background promise
- Added public_url update logic when master_asset job finishes
- Fixed Supabase storage RLS for service-role uploads

### 2.2 Feature 3.2 – Global Asset Library

**Created files**
- routes/assets.ts
- pages/AssetLibrary.tsx
- components/assets/AssetCard.tsx
- components/assets/AssetGallery.tsx
- components/assets/AssetDialog.tsx
- components/assets/DeleteAssetDialog.tsx
- lib/services/assetService.ts

**Meaningful edits**
- server.ts – registered assets router before stageStates
- types/asset.ts – added GlobalAsset vs ProjectAsset split + AssetFilter
- migrations/008_global_assets.sql – created global_assets + RLS + indexes
- AssetLibrary.tsx – added type tabs + search + grid/list toggle
- DeleteAssetDialog.tsx – added dependency check warning before delete

**Still missing / commented out**
- Image generation for global assets (needs projectId null handling)

### 2.3 Feature 3.3 – Stage 5: Asset Extraction & Definition

**Heavily modified files**
- components/pipeline/Stage5Assets.tsx          ← complete rewrite
- lib/services/projectAssetService.ts
- services/assetExtractionService.ts
- services/image-generation/ImageGenerationService.ts

**Critical fixes applied (these actually broke prod briefly)**
- backend stage state query: .single() → .order('version', {ascending:false}).limit(1)
- script field: formatted_script → formattedScript (camelCase mismatch)
- LLM JSON repair: added 3-tier fallback (trailing comma strip → truncate → regex extract)
- LangSmith tracing: made optional with try/catch wrap
- Image URL persistence: added DB update in ImageGenerationService on master_asset completion
- import path: './api/supabase' → '@/lib/supabase'

**New behavior enforced**
- Visual style capsule mandatory before extract / generate
- Type-specific aspect ratios (char 512×768, loc 1024×576, prop 512×512)

### 2.4 Feature 3.4 – Project-Level Assets (Inheritance + Sync)

**Created files**
- services/assetImageLocalizer.ts
- components/pipeline/AssetDrawer.tsx
- components/pipeline/AssetVersionSync.tsx
- migrations/009_asset_versioning_enhancements.sql

**Heavily modified files**
- routes/projectAssets.ts               ← added clone-from-global, sync-from-global, version-sync-status
- types/asset.ts                        ← added overridden_fields, last_synced_at, AssetVersionStatus
- lib/services/projectAssetService.ts   ← cloneFromGlobal() + checkVersionSync()
- Stage5Assets.tsx                      ← integrated drawer + sync badge

**Key logic changes**
- Override tracking: auto-add edited fields to overridden_fields[] on PUT
- Sync skips fields in overridden_fields (non-destructive)
- Image localization: copy global → project_{id}/branch_{id}/master-assets/
- Clone endpoint now supports overrideDescription

### 2.5 Extra: Asset Match + Name Strategy 

**Created files**
- components/pipeline/AssetMatchModal.tsx
- services/assetDescriptionMerger.ts

**Modified files**
- routes/projectAssets.ts               ← enhanced clone-from-global with matchWithAssetId, descriptionStrategy, regenerateImage, nameStrategy
- types/asset.ts                        ← added nameStrategy + customName to CloneAssetRequest
- AssetDrawer.tsx                       ← added match modal trigger logic
- ImageGenerationService.ts             ← added referenceImageUrl to job request

**Meaningful edits**
- LLM merge prompt: global = base, project = additions/modifications
- Name strategy: project | global+(project) | custom+(project)
- Image regen with reference: passes global image URL to NanoBanana context

**Deferred (intentionally)**
- Visual badge/icon showing "matched with global" in Stage 5 list

## 3. Remaining High-Impact Code Changes Needed (P0–P1)

- Add metadata JSONB column to project_assets + backfill migration
- Implement real batch/parallel image generation queue (currently sequential)
- Add retry UI + failed job list in Stage 5
- Asset merge UI with conflict preview
- Visual indicator (badge) for matched/sync'd assets
- Add asset search/filter inside Stage5Assets list

## 4. Quick File Hotspot Map (most touched files right now)

1. Stage5Assets.tsx
2. projectAssets.ts (routes)
3. ImageGenerationService.ts
4. AssetDrawer.tsx
5. types/asset.ts
6. projectAssetService.ts (frontend)
7. AssetMatchModal.tsx

If this level of detail still misses what you need — tell me exactly which part feels hand-wavy or useless (e.g. "sync logic is described too vaguely", "I want line numbers", "focus only on backend changes") and I’ll sharpen it further.

Sorry the previous version felt too fluffy/marketing-ish. This one should be more useful when you're actually debugging or reviewing diffs.