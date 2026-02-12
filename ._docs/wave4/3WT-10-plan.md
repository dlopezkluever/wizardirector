Resume this session with:
claude --resume f7c7f6cd-0b7a-41c4-9c4e-7e73ea973f31


 Here is Claude's plan:
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌ Plan: 3C.1 Transparent Background Auto-Injection + 3C.2 Multi-Angle Asset Generation

 Context

 When generating asset images (characters, props, extra archetypes), the current system sends the raw description/image_prompt      
 directly to the image generation API. This often produces images with busy backgrounds (castle interiors, other characters,        
 environmental noise) that confuse downstream frame and video generation in Stage 10. Assets need to be isolated on clean
 backgrounds.

 Additionally, the pipeline currently generates only a single view of each character. When Stage 10 needs to compose a shot from a  
 different camera angle, it has no reference for what the character looks like from that perspective, leading to inconsistent       
 results.

 3C.1 solves the background problem via automatic prompt injection.
 3C.2 solves the angle problem via on-demand multi-angle generation for characters.

 ---
 Part 1: 3C.1 — Transparent Background Auto-Injection

 Approach

 Inject background isolation instructions into the prompt centrally in ImageGenerationService so ALL generation paths (project      
 assets, scene assets, global assets) benefit automatically. The injection is based on asset_type — enforced for
 character/prop/extra_archetype, prohibited for location.

 Also add a placeholder hook for future post-processing (background removal API) that can be wired up later without structural      
 changes.

 Files to Modify

 1. backend/src/services/image-generation/ImageGenerationService.ts

 - Add a new private method injectBackgroundContext(prompt: string, assetType: string): string
   - If assetType is character, prop, or extra_archetype: append ". Isolated on a plain white background, no environment, no other  
 characters or objects." to the prompt
   - If assetType is location: return prompt unchanged
   - Log the injection for debugging
 - Add a placeholder method postProcessBackground(imageBuffer: Buffer, assetType: string): Promise<Buffer>
   - For now, returns the buffer unchanged with a comment marking it as the future hook point for Rembg/API integration
   - Only called for character/prop/extra_archetype asset types
 - Modify createImageJob() (line ~84-94): After fetching asset details and before creating the job record, call
 injectBackgroundContext() to modify the prompt. The asset_type is already available from getAssetDetails().
 - Modify createSceneAssetImageJob() (line ~176): The prompt comes from instance.effective_description. After fetching the instance 
  and its project_asset.asset_type, call injectBackgroundContext() before passing to createImageJob().
 - Modify executeJobInBackground() (line ~251): After image generation completes and before upload, call postProcessBackground() as 
  a no-op passthrough (placeholder).
 - Modify executeGlobalAssetJobInBackground() (line ~650): Same placeholder call before upload.

 2. backend/src/routes/projectAssets.ts (line 895)

 - No changes needed — the injection happens centrally in the service. The route continues to pass prompt = asset.image_prompt ||   
 asset.description and the service handles the rest.

 3. backend/src/routes/sceneAssets.ts (line 345)

 - No changes needed — calls createSceneAssetImageJob() which will handle injection internally.

 Background Injection Logic

 ISOLATABLE_TYPES = ['character', 'prop', 'extra_archetype']

 if (assetType in ISOLATABLE_TYPES && jobType in ['master_asset', 'scene_asset']):
     prompt += ". Isolated on a plain white background, no environment, no other characters or objects."

 Important: Only inject for master_asset and scene_asset job types. Do NOT inject for start_frame, end_frame, or inpaint jobs —     
 those need environmental context.

 ---
 Part 2: 3C.2 — Multi-Angle Asset Generation

 Approach

 Add a dedicated asset_angle_variants table, backend endpoints for CRUD + generation, a frontend service client, and a dialog       
 component accessible from character asset cards in Stage 5.

 New Files to Create

 1. backend/migrations/025_asset_angle_variants.sql

 CREATE TABLE asset_angle_variants (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     project_asset_id UUID NOT NULL REFERENCES project_assets(id) ON DELETE CASCADE,
     angle_type TEXT NOT NULL CHECK (angle_type IN ('front', 'side', 'three_quarter', 'back')),
     image_url TEXT,
     storage_path TEXT,
     image_generation_job_id UUID REFERENCES image_generation_jobs(id),
     prompt_snapshot TEXT,
     status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW(),
     UNIQUE(project_asset_id, angle_type)
 );

 -- Indexes
 CREATE INDEX idx_angle_variants_asset ON asset_angle_variants(project_asset_id);
 CREATE INDEX idx_angle_variants_status ON asset_angle_variants(status);

 -- RLS policies (follow pattern from migration 023)
 ALTER TABLE asset_angle_variants ENABLE ROW LEVEL SECURITY;
 -- Policy: users can manage angle variants for their own project assets
 CREATE POLICY "Users can manage their angle variants"
     ON asset_angle_variants FOR ALL
     USING (
         EXISTS (
             SELECT 1 FROM project_assets pa
             JOIN projects p ON pa.project_id = p.id
             WHERE pa.id = asset_angle_variants.project_asset_id
             AND p.user_id = auth.uid()
         )
     );

 -- updated_at trigger
 CREATE TRIGGER update_angle_variants_updated_at
     BEFORE UPDATE ON asset_angle_variants
     FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

 2. src/components/pipeline/AngleVariantsDialog.tsx

 New dialog component for managing angle variants:
 - Opens as a Dialog (shadcn/ui) from the character asset card dropdown menu
 - Shows a 2x2 grid of the 4 angle types (front, side, 3/4, back)
 - Each cell shows: angle label, image (if generated), status badge, generate/regenerate button
 - "Generate All" button to batch-generate all missing angles
 - "Generate" button per-cell for individual angle generation
 - Uses polling pattern from existing image generation (poll job status)
 - Props: projectId, asset: ProjectAsset, open, onOpenChange

 3. src/types/asset.ts — Add new types

 export type AngleType = 'front' | 'side' | 'three_quarter' | 'back';

 export interface AssetAngleVariant {
   id: string;
   project_asset_id: string;
   angle_type: AngleType;
   image_url: string | null;
   storage_path: string | null;
   image_generation_job_id: string | null;
   prompt_snapshot: string | null;
   status: 'pending' | 'generating' | 'completed' | 'failed';
   created_at: string;
   updated_at: string;
 }

 export const ANGLE_LABELS: Record<AngleType, string> = {
   front: 'Front View',
   side: 'Side Profile',
   three_quarter: '3/4 View',
   back: 'Back View',
 };

 export const ANGLE_PROMPTS: Record<AngleType, string> = {
   front: 'front-facing view, looking directly at the camera',
   side: 'side profile view, facing left, showing full silhouette',
   three_quarter: 'three-quarter angle view, slightly turned from the camera',
   back: 'rear view from behind, showing the back of the character',
 };

 Files to Modify

 4. backend/src/services/image-generation/ImageGenerationService.ts

 - Add new method createAngleVariantJob():
   - Accepts: projectAssetId, angleType, projectId, branchId, visualStyleCapsuleId/manualVisualTone
   - Fetches asset details (description, asset_type)
   - Constructs angle-specific prompt: "{ANGLE_PROMPT} of {description}. Isolated on a plain white background, no environment, no   
 other characters or objects."
   - Uses character aspect ratio (512x768)
   - Creates the job, then on completion updates asset_angle_variants table with image_url
   - Reuses existing executeJobInBackground() flow with a new completion handler for angle_variant job type
 - Add 'angle_variant' to the jobType union in CreateImageJobRequest
 - Add completion handler in executeJobInBackground(): when jobType === 'angle_variant', update asset_angle_variants row with       
 image_url and status

 5. backend/src/routes/projectAssets.ts

 Add 3 new endpoints:
 - GET /:projectId/assets/:assetId/angle-variants — List all angle variants for an asset
 - POST /:projectId/assets/:assetId/angle-variants/generate — Generate angle variant(s). Body: { angleTypes: AngleType[] }. Creates 
  asset_angle_variants rows (or updates existing) and kicks off generation jobs.
 - DELETE /:projectId/assets/:assetId/angle-variants/:variantId — Delete a specific variant

 6. src/lib/services/projectAssetService.ts

 Add 3 new methods to the existing service class:
 - listAngleVariants(projectId, assetId): Promise<AssetAngleVariant[]>
 - generateAngleVariants(projectId, assetId, angleTypes: AngleType[]): Promise<{ variants: AssetAngleVariant[], jobIds: string[] }> 
 - deleteAngleVariant(projectId, assetId, variantId): Promise<void>

 7. src/components/pipeline/Stage5Assets.tsx

 - Import AngleVariantsDialog
 - Add state: angleDialogAsset: ProjectAsset | null
 - In the DropdownMenu for each asset card (around line 963-996), add a new menu item only for character assets:
 {asset.asset_type === 'character' && (
   <DropdownMenuItem onClick={() => setAngleDialogAsset(asset)}>
     <RotateCw className="w-4 h-4 mr-2" /> {/* or appropriate icon */}
     Manage Angles
   </DropdownMenuItem>
 )}
 - Render <AngleVariantsDialog> at the bottom of the component, controlled by angleDialogAsset state

 8. backend/src/services/image-generation/ImageGenerationService.ts — Storage path

 - Add angle variant storage path in buildStoragePath():
 project_{id}/branch_{id}/master-assets/angles/{assetId}_{angleType}_{timestamp}_{random}.png

 Angle-to-Shot Matching (Stage 10 context)

 Since 3B.10 camera angle metadata is done, add matching logic in promptGenerationService.ts:
 - When building asset context for frame prompts, check if the character has angle variants
 - Parse the shot's camera field to extract the angle component
 - Map camera angle to closest asset angle variant:
   - eye-level / straight-on → front
   - low-angle / high-angle → front (vertical angles, frontal face)
   - side / profile → side
   - over-the-shoulder / behind → back
   - three-quarter / 3/4 → three_quarter
   - Default fallback: front
 - If a matching angle variant exists and has an image, use its URL as the reference image instead of the default master asset      
 image

 Files for angle matching:

 - backend/src/services/promptGenerationService.ts — Modify buildAssetContext() to include angle variant URLs when available        
 - backend/src/services/image-generation/ImageGenerationService.ts — In frame generation jobs, accept an optional angleVariantUrl   
 to use as reference

 ---
 Implementation Order

 Phase 1: 3C.1 — Background Injection (do first)

 1. Add injectBackgroundContext() + postProcessBackground() placeholder to ImageGenerationService.ts
 2. Wire injection into createImageJob() and createSceneAssetImageJob()
 3. Wire placeholder into executeJobInBackground() and executeGlobalAssetJobInBackground()
 4. Test: generate a character image and verify prompt includes background isolation text in logs
 5. Run npm run lint from project root

 Phase 2: 3C.2 — Multi-Angle (do second)

 1. Create migration 025_asset_angle_variants.sql
 2. Add types to src/types/asset.ts
 3. Add createAngleVariantJob() and related logic to ImageGenerationService.ts
 4. Add backend routes to projectAssets.ts
 5. Add frontend service methods to projectAssetService.ts
 6. Create AngleVariantsDialog.tsx component
 7. Integrate dialog into Stage5Assets.tsx
 8. Run npm run lint from project root

 Phase 3: Angle-to-Shot Matching

 1. Modify promptGenerationService.ts to query angle variants when building frame prompts
 2. Add camera-to-angle mapping logic
 3. Run npm run lint from project root

 ---
 Verification

 3C.1 Testing

 1. Start dev server (npm run dev)
 2. Generate a character image in Stage 5 — verify console log shows injected prompt with "Isolated on a plain white background..." 
 3. Generate a location image — verify prompt is NOT modified
 4. Generate a prop image — verify prompt IS modified
 5. Generate a scene asset image in Stage 8 for a character — verify injection applies

 3C.2 Testing

 1. Open Stage 5, find a character asset card
 2. Click the dropdown menu (MoreVertical icon) — verify "Manage Angles" appears for characters only (not locations/props)
 3. Click "Manage Angles" — verify dialog opens with 4 angle grid
 4. Generate a single angle — verify job completes and image appears
 5. Generate all angles — verify batch generation works
 6. Verify angle images are stored at the correct storage path

 Lint

 Run npm run lint after all changes to ensure code quality.

 ----

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