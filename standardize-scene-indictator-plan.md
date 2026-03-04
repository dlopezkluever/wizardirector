 Plan: Consistent Scene Indicator Across Stages 7-12

 Context

 Stages 7-12 (the production cycle) inconsistently display scene number and slug. Stage 8 has a clunky dedicated header   
 bar with a useless "shot list ready" badge. Stages 7, 10, and 12 show nothing. Stage 9 shows only a scene number badge.  
 Stage 11 has the scene name buried in a subtitle. Users need to always know which scene they're working on.

 Goal: Remove Stage 8's dedicated header. Add a consistent inline [Scene N] · Formatted Slug indicator to every stage's   
 existing title row (7-12).

 Approach

 1. Create a shared SceneIndicator component

 New file: src/components/pipeline/SceneIndicator.tsx

 A small inline component that renders:
 [Scene 2] · Interior Qlanktons Lab - Continuous
  ^^^^^^^^   ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  Badge       muted text

 - Takes sceneNumber and slug as props
 - Uses existing formatSceneHeader() from src/lib/utils.ts (already exists, used by Stage 8)
 - Renders: <Badge variant="outline">Scene {sceneNumber}</Badge> + <span className="text-muted-foreground text-sm">·      
 {formatted}</span>

 2. Create a useSceneInfo(sceneId) hook

 New file: src/hooks/useSceneInfo.ts

 A tiny hook that fetches scene number + slug from Supabase given a sceneId. Returns { sceneNumber, slug, isLoading }.    
 This avoids having to modify parent component props — each stage just calls the hook with the sceneId it already
 receives.

 3. Modify each stage component

 Stage 7 (src/components/pipeline/Stage7ShotList.tsx):
 - Line ~724: Add <SceneIndicator> inline after <h2>Shot List</h2>, inside the same flex container
 - Call useSceneInfo(sceneId) to get scene data

 Stage 8 (src/components/pipeline/Stage8VisualDefinition.tsx):
 - DELETE lines 865-884 — the entire dedicated scene header bar (px-6 py-3 border-b div with scene badge, formatted slug, 
  and status badge)
 - The stage's main content area has its own title pattern for "Scene Assets" — add <SceneIndicator> inline there,        
 matching the same pattern as other stages

 Stage 9 (src/components/pipeline/Stage9PromptSegmentation.tsx):
 - Line ~351-354: Replace the existing inline <Badge>Scene {sceneNumber}</Badge> with <SceneIndicator> to now also        
 include the slug
 - Already has sceneNumber — add slug via the hook

 Stage 10 (src/components/pipeline/Stage10FrameGeneration.tsx):
 - Line ~471: Add <SceneIndicator> inline after <h2>Frame Generation</h2>, inside the same flex container
 - Call useSceneInfo(sceneId) to get scene data

 Stage 11 (src/components/pipeline/Stage11Confirmation.tsx):
 - Line ~174-177: Replace the subtitle {checkoutData.sceneName} - Review before video generation with <SceneIndicator>    
 component + keep the "Review before video generation" text separately
 - Call useSceneInfo(sceneId) to get proper scene number + slug

 Stage 12 (src/components/pipeline/Stage12VideoGeneration.tsx):
 - Line ~254: Add <SceneIndicator> inline after <h2>Video Generation</h2>, inside the same flex container
 - Call useSceneInfo(sceneId) to get scene data

 4. Also update LockedStageHeader (optional improvement)

 File: src/components/pipeline/LockedStageHeader.tsx
 - When stages are locked/outdated, LockedStageHeader renders instead of the normal header
 - Add optional sceneNumber + slug props so the scene indicator shows even in locked state

 Files to modify

 1. NEW: src/components/pipeline/SceneIndicator.tsx — shared component
 2. NEW: src/hooks/useSceneInfo.ts — shared hook
 3. src/components/pipeline/Stage7ShotList.tsx — add indicator to title
 4. src/components/pipeline/Stage8VisualDefinition.tsx — remove header, add indicator
 5. src/components/pipeline/Stage9PromptSegmentation.tsx — replace badge with indicator
 6. src/components/pipeline/Stage10FrameGeneration.tsx — add indicator to title
 7. src/components/pipeline/Stage11Confirmation.tsx — replace subtitle with indicator
 8. src/components/pipeline/Stage12VideoGeneration.tsx — add indicator to title
 9. src/components/pipeline/LockedStageHeader.tsx — add optional scene indicator

 Existing utilities to reuse

 - formatSceneHeader() in src/lib/utils.ts (lines 37-102) — already parses slugs into readable format
 - Badge from src/components/ui/badge — already used throughout
 - supabase client from src/lib/supabase — for the hook

 Verification

 1. Run npm run lint to check for errors
 2. Run npm test to check for regressions
 3. Start dev server (npm run dev) and navigate to each stage 7-12 to confirm:
   - Scene badge + formatted slug appears inline with each stage title
   - Stage 8 no longer has the dedicated header bar or "shot list ready" badge
   - All stages look visually consistent
   - Locked/outdated state also shows scene info

part 2

 Plan: Fix Scene Indicator — Corrections to Initial Implementation

 Context

 The initial implementation is already in place but needs several corrections based on user feedback:
 1. Stage 8: Remove the "Visual Definition" title header I added — instead put SceneIndicator beside "Scene Assets"       
 inside SceneAssetListPanel
 2. Remove the "·" dot separator before the slug text
 3. Shorter slug format: Use Int./Ext. + location only, drop time of day (e.g., "Int. Qlanktons Lab" not "Interior        
 Qlanktons Lab - Continuous")
 4. Remove from LockedStageHeader: Don't duplicate the indicator in the locked bar — show it only once in the main        
 content area
 5. Smaller font sizes to prevent two-line wrapping

 Changes

 1. Update SceneIndicator component

 File: src/components/pipeline/SceneIndicator.tsx

 - Use formatSceneHeader(slug).prefixShort + formatSceneHeader(slug).location instead of .formatted — this gives "Int.    
 Qlanktons Lab" without time of day
 - Remove the "·" dot separator
 - Reduce font sizes: Badge to text-[10px], slug text to text-xs
 - Add whitespace-nowrap to prevent wrapping

 2. Revert LockedStageHeader — remove scene indicator

 File: src/components/pipeline/LockedStageHeader.tsx

 - Remove SceneIndicator import
 - Remove sceneNumber and sceneSlug from interface and destructuring
 - Revert h2 back to simple <h2 className="text-lg font-semibold">{title}</h2> (no flex, no SceneIndicator)

 3. Remove sceneNumber/sceneSlug props from all LockedStageHeader call sites

 Remove the sceneNumber={...} and sceneSlug={...} props from LockedStageHeader usages in:
 - Stage7ShotList.tsx
 - Stage8VisualDefinition.tsx
 - Stage9PromptSegmentation.tsx
 - Stage10FrameGeneration.tsx
 - Stage11Confirmation.tsx
 - Stage12VideoGeneration.tsx

 4. Fix Stage 8 — move indicator from "Visual Definition" header to SceneAssetListPanel

 Files:
 - src/components/pipeline/Stage8VisualDefinition.tsx — Remove the "Visual Definition" header div I added (lines
 ~856-863), and remove the one in the empty state branch too. Pass sceneNumber+sceneSlug props to SceneAssetListPanel.    
 - src/components/pipeline/Stage8/SceneAssetListPanel.tsx — Add optional sceneNumber+sceneSlug props, render
 <SceneIndicator> inline next to the "Scene Assets" h2 title

 5. Reduce font sizes across all stages

 In each stage where SceneIndicator is placed inline with an h2, the h2 text itself stays as-is. The SceneIndicator       
 component handles its own smaller sizing internally (step 1 above). No per-stage font changes needed.

 Files to modify

 1. src/components/pipeline/SceneIndicator.tsx — shorter slug format, remove dot, smaller fonts
 2. src/components/pipeline/LockedStageHeader.tsx — revert to original (remove scene indicator)
 3. src/components/pipeline/Stage7ShotList.tsx — remove sceneNumber/sceneSlug from LockedStageHeader
 4. src/components/pipeline/Stage8VisualDefinition.tsx — remove "Visual Definition" header divs, pass scene props to      
 SceneAssetListPanel
 5. src/components/pipeline/Stage8/SceneAssetListPanel.tsx — add SceneIndicator beside "Scene Assets"
 6. src/components/pipeline/Stage9PromptSegmentation.tsx — remove sceneNumber/sceneSlug from LockedStageHeader
 7. src/components/pipeline/Stage10FrameGeneration.tsx — remove sceneNumber/sceneSlug from LockedStageHeader
 8. src/components/pipeline/Stage11Confirmation.tsx — remove sceneNumber/sceneSlug from LockedStageHeader
 9. src/components/pipeline/Stage12VideoGeneration.tsx — remove sceneNumber/sceneSlug from LockedStageHeader

 Verification

 1. npm run lint — no new errors
 2. npm test — all tests pass
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌


● Clean. Here's what the updated component looks like:

  ┌──────────────────────────────────────┐
  │ Scene 1 · Int. Qlanktons Lab         │
  └──────────────────────────────────────┘

  - Single outline badge wrapping everything
  - "Scene 1" in semibold, slug in muted text, separated by a ·
  - Reduced padding (px-2 py-0.5) and bumped text to 11px so it doesn't feel too small in the tighter space
  - Still whitespace-nowrap to prevent line breaks
