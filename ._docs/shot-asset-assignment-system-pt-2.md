# Shot Asset Assignment System — Part 2: Testing & Enhancements

> **Prerequisite**: This document extends the core Shot Asset Assignment System defined in `shot-asset-assignment-system.md`. It covers testing strategy and secondary enhancements that should be implemented **after** the core system (data model, routes, prompt/frame generation rework, Stage 8/9 UI) is stable.

---

## Context: Core System Summary

The core system (Part 1) introduces:

- **`shot_asset_assignments` table** — junction between `shots` and `scene_asset_instances` with a `presence_type` column (`throughout` | `enters` | `exits` | `passes_through`)
- **Backend service + routes** at `/api/projects/:projectId/scenes/:sceneId/shot-assignments` for CRUD
- **Prompt generation rework** — `buildFrameReferenceManifests()` builds separate start/end frame reference image lists based on presence_type
- **Stage 8 Asset Drawer** — shot checklist step when adding an asset to a scene
- **Stage 9 Per-Shot Asset Panel** — expandable asset section per shot with presence_type dropdowns
- **Auto-population** — existing scenes get `throughout` assignments for all asset×shot pairs on first open
- **Invalidation** — assignment changes mark Stage 9+ as `outdated`

---

## Table of Contents

1. DONE
2. [Character-to-Reference Image Mapping Accuracy](#2-character-to-reference-image-mapping-accuracy)
3. [Shot Splitting for `passes_through`](#3-shot-splitting-for-passes_through)
4. [AI-Suggested Shot Assignments](#4-ai-suggested-shot-assignments)
5. [Presence-Type Aware Continuity](#5-presence-type-aware-continuity)
6. [Bulk Presence-Type Templates](#6-bulk-presence-type-templates)
7. [Visual Timeline View](#7-visual-timeline-view)
8. [Implementation Order](#8-implementation-order)

---

## 2. Character-to-Reference Image Mapping Accuracy

**Problem**: The image generator receives reference images as generic "identity" references with only a label like `"Image #1: Alice (character)"`. For scenes with multiple similar-looking characters, the model may confuse which reference maps to which person.

**Proposed Fix**: Enhance the image manifest in `promptGenerationService.ts` → `buildNumberedImageManifest()` (or its replacement `buildFrameReferenceManifests()`) to include physical trait anchoring from `effective_description`:

```
REFERENCE IMAGES (attached alongside this prompt):
Image #1: Alice (character) — red-haired woman in blue dress, mid-20s
Image #2: Bob (character) — tall man with dark beard, grey suit
Image #3: Living Room (location) — warm-lit room with leather couch
```

Then in the frame prompt LLM system prompt, instruct the LLM to reinforce character↔image mapping with trait descriptions. Example output: *"Alice (the red-haired woman from Image #1) stands near the window while Bob (the bearded man from Image #2) sits on the couch."*

This gives the image model **three anchors** per character: name, image number, and physical traits.

**Files to modify**:
- `backend/src/services/promptGenerationService.ts` — manifest builder + frame prompt system prompt
- The `effective_description` field on `scene_asset_instances` already contains the trait data; just needs to be injected into the manifest string

**Why deferred**: Current implicit mapping works adequately for most scenes (1-2 distinct characters). This becomes important for scenes with 3+ characters or visually similar characters.

---

## 3. Shot Splitting for `passes_through`

**Problem**: When a user selects `passes_through`, the asset has no reference image in either frame, making visual accuracy unreliable. The user sees a warning but has no easy way to fix it.

**Proposed Fix**: Offer a "Split Shot" button alongside the `passes_through` warning. This divides the shot into 2-3 sub-shots so the asset can be `enters` in one and `exits` in the next, guaranteeing reference image usage.

**Example**: Shot 1A (8s) with a waiter passing through becomes:
- Shot 1A (3s) — waiter not present (`throughout` assets only)
- Shot 1B (2s) — waiter `enters` and `exits` (or `throughout` for this sub-shot)
- Shot 1C (3s) — waiter not present

**Complexity**: Shot splitting touches:
- Stage 7 data (shot definitions, `shot_id` naming, `shot_order` renumbering)
- Stage 9 (prompts for all sub-shots need generation)
- `shot_asset_assignments` for all sub-shots
- Continuity linking between the new sub-shots (they should be `match` continuity by default)
- Existing frames/videos for the original shot become invalid

**Why deferred**: The `passes_through` + warning approach is functional. Shot splitting is a power-user feature that requires significant Stage 7 integration work.

---

## 4. AI-Suggested Shot Assignments

**Problem**: When a new asset is added, users must manually check which shots it belongs to. For large scenes with many shots, this is tedious.

**Proposed Fix**: Use the LLM to analyze shot action/dialogue/setting text and suggest which shots an asset is likely to appear in. Pre-check the suggested shots in the Asset Drawer checklist.

**Implementation sketch**:
1. When the shot checklist appears in the Asset Drawer, send a lightweight LLM request:
   - Input: asset name + type + description, plus array of shot summaries (action, dialogue, setting, characters_foreground/background)
   - Output: array of `{ shotId: string, confidence: number, reason: string }`
2. Pre-check shots above a confidence threshold (e.g., 0.7)
3. Show confidence indicators next to each shot in the checklist (e.g., "AI: likely" / "AI: unlikely")
4. User can override any suggestion

**Backend endpoint**: `POST /api/projects/:projectId/scenes/:sceneId/suggest-asset-shots`

**Why deferred**: Manual selection works fine for scenes with 3-8 shots (typical). AI suggestions become valuable for scenes with 10+ shots. Also, the existing `characters_foreground` / `characters_background` arrays on shots already provide a strong heuristic — a simple string-match pre-check (no LLM needed) could cover 80% of cases as an intermediate step.

---

## 5. Presence-Type Aware Continuity

**Problem**: The continuity system (`start_continuity: 'match' | 'camera_change'`) copies/references the previous shot's end frame. If an asset `enters` in the current shot, it shouldn't appear in the continuity-matched start frame — but the previous shot's end frame may already include that asset.

**Scenario**:
- Shot N: Alice is `throughout` → end frame shows Alice
- Shot N+1: Alice is `enters` → start frame should NOT show Alice
- But `start_continuity: 'match'` copies Shot N's end frame (which has Alice) as Shot N+1's start frame

This creates a visual inconsistency: Alice appears in the start of N+1 despite being marked as `enters`.

**Analysis**: This is actually a **valid creative choice** in many cases — if Alice is visible at the end of the previous shot and "enters" in the next, the continuity match is correct (the camera cut shows her). The `enters` presence_type really means "this asset becomes relevant during this shot" rather than "this asset is physically absent at frame 1."

**Possible approaches**:
1. **Do nothing** — accept that continuity matching is based on the previous shot's reality, not the current shot's presence_type. Document this behavior.
2. **Add a `continuity_exclude` flag** — let users mark specific assets to be excluded from continuity matching for a shot. Complex UI addition.
3. **Redefine `enters`** — clarify that `enters` means "asset is not in this shot's independently-generated start frame references" but doesn't prevent it from appearing via continuity. The continuity system operates at the image level, not the asset level.

**Recommendation**: Approach 3 (redefine/document) for now, with approach 2 as a future option if users report confusion.

**Why deferred**: Edge case that only manifests with specific shot sequences. The continuity system needs careful thought about how presence_type interacts with temporal continuity across shots. Getting the core assignment system right first will surface real user feedback about whether this is actually a problem.

---

## 6. Bulk Presence-Type Templates

**Problem**: For common patterns (e.g., "main characters throughout, extras pass through"), users must configure each asset individually per shot.

**Proposed Fix**: Preset templates applied at the scene level:

| Template | Behavior |
|----------|----------|
| "All throughout" | Default — every asset `throughout` in every shot |
| "Match shot characters" | Auto-set presence based on `characters_foreground`/`characters_background` arrays on each shot. Assets matching foreground → `throughout`, matching background → `throughout`, not mentioned → not assigned |
| "Locations throughout, characters custom" | Location assets auto-assigned `throughout` to all shots; character/prop assets left unassigned for manual config |

**UI**: A dropdown or button group at the top of the Stage 9 asset panel: "Apply template: [All Throughout ▼]"

**Implementation**:
- Templates are pure frontend logic — they call the existing bulk create/update assignment endpoints
- The "Match shot characters" template uses the `characters_foreground`/`characters_background` arrays already stored on each shot from Stage 7 extraction
- Templates overwrite existing assignments (with confirmation)

**Why deferred**: Manual per-asset config covers all cases. Templates are a time-saver for repeat workflows.

---

## 7. Visual Timeline View

**Problem**: For complex scenes with many shots and assets, understanding the full asset presence map from individual shot panels is difficult. Users need a birds-eye view.

**Proposed Fix**: A timeline/matrix view showing shots as columns, assets as rows, with color-coded presence_type cells.

**Mockup**:
```
              Shot 1A    Shot 1B    Shot 2A    Shot 2B    Shot 3A
Alice         ████████   ████████   ▶▶▶▶▶▶▶▶   ████████   ◀◀◀◀◀◀◀◀
Bob           ████████   ████████   ████████   ████████   ████████
Living Room   ████████   ████████   ────────   ────────   ────────
Garden        ────────   ────────   ████████   ████████   ████████
Waiter        ────────   ────────   ░░░░░░░░   ────────   ────────

Legend: ████ Throughout  ▶▶▶▶ Enters  ◀◀◀◀ Exits  ░░░░ Passes Through  ──── Not Assigned
```

**Implementation**:
- New component: `src/components/pipeline/Stage9/ShotAssetTimeline.tsx`
- Toggle between "Panel View" (per-shot expandable) and "Timeline View" (matrix)
- Cells are clickable to change presence_type or toggle assignment
- Color coding matches presence_type semantics
- Responsive: horizontally scrollable for many shots

**Why deferred**: The expandable panel per shot is functional for typical scene sizes (3-8 shots, 2-6 assets). The timeline view is a significant UI undertaking and is a luxury, not a necessity. Build it when user feedback indicates the panel view is insufficient.

---

## 8. Implementation Order

These items should be implemented after the core system (Part 1) is stable and tested. The recommended sequence:

| Phase | Section | What | Priority |
|-------|---------|------|----------|
| **1** | §1 | DONE
| **2** | §2 | Character-to-reference mapping accuracy | Medium — improves image gen quality |
| **3** | §4 | AI-suggested shot assignments (or simple heuristic version) | Medium — UX improvement |
| **4** | §5 | Presence-type aware continuity (documentation + edge case handling) | Low — edge case |
| **5** | §6 | Bulk presence-type templates | Low — convenience feature |
| **6** | §3 | Shot splitting for `passes_through` | Low — power-user feature |
| **7** | §7 | Visual timeline view | Low — luxury UI |
--------------------------------------------------------------------------------------------

--

---------------------------------------------------------------------------------------------

 Shot-Asset-Assignment System: Part 2 Implementation Plan

       Overview

       This plan covers 6 phases (Phases 2-7 in the overall implementation order) for the shot-asset-assignment system. Each phase is      
       self-contained with clear dependencies on preceding phases where applicable.

       ---
       Phase 2 (Section 2): Character-to-Reference Image Mapping Accuracy

       Complexity: LOW | Risk: LOW

       Problem

       The buildNumberedImageManifest() function at C:\Users\Daniel
       Lopez\Desktop\Aiuteur\wizardirector\backend\src\services\promptGenerationService.ts (lines 149-185) currently produces lines        
       like:
       Image #1: Alice (character)
       Missing the physical trait anchoring that helps the LLM map reference images to characters consistently.

       Implementation Steps - 

       Step 1: Add extractTraitSummary() utility function

       Location: C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend\src\services\promptGenerationService.ts, insert before        
       buildNumberedImageManifest() (around line 148).

       /**
        * Extract a short trait summary (max ~80 chars) from an effective_description.
        * Targets physical identifiers: hair, clothing, age, build, distinguishing features.
        */
       export function extractTraitSummary(description: string, maxLen: number = 80): string {
         if (!description || description.trim().length === 0) return '';

         // If description is already short, use it directly
         const trimmed = description.trim();
         if (trimmed.length <= maxLen) return trimmed;

         // Extract first sentence or clause as a summary
         const firstSentence = trimmed.match(/^[^.!?]+[.!?]?/)?.[0] || '';
         if (firstSentence.length > 0 && firstSentence.length <= maxLen) {
           return firstSentence.replace(/[.!?]$/, '');
         }

         // Truncate intelligently at word boundary
         const truncated = trimmed.substring(0, maxLen);
         const lastSpace = truncated.lastIndexOf(' ');
         return (lastSpace > maxLen * 0.5 ? truncated.substring(0, lastSpace) : truncated) + '...';
       }

       This function is deterministic, no LLM needed. It takes the first sentence of effective_description as the trait anchor, which      
       typically contains the most important physical identifiers (writers front-load appearance descriptions).

       Step 2: Modify buildNumberedImageManifest() to append trait summaries

       In the same file, modify the loop at line 162-174. The SceneAssetInstanceData interface already includes effective_description      
       (line 44). Change the manifest line construction:

       Current (line 181):
       const lines = imageOrder.map(entry => `${entry.label}: ${entry.assetName} (${entry.type})`);

       The issue is that imageOrder entries (type ReferenceImageOrderEntry) don't carry effective_description. Two options:

       Option A (preferred): Extend the loop to capture descriptions alongside the imageOrder entries, then produce the manifest line      
       with traits. Specifically, inside the for (const asset of sorted) loop, capture the trait alongside the entry:

       // Inside the loop, after pushing to imageOrder:
       const traitSummary = extractTraitSummary(asset.effective_description);
       // Store alongside for manifest construction

       Then construct lines as:
       const traitSuffix = traitSummary ? ` — ${traitSummary}` : '';
       `${entry.label}: ${entry.assetName} (${entry.type})${traitSuffix}`

       This requires building a parallel array of trait summaries or attaching them to a local struct during the loop. The cleanest        
       approach: build the lines array inside the same loop that builds imageOrder, rather than mapping afterwards.

       Step 3: Apply same trait anchoring to buildFrameReferenceManifests()

       The function at lines 194-239 delegates to buildNumberedImageManifest() for both start and end frame manifests, so if Step 2 is     
       done correctly, both start/end manifests automatically get trait summaries.

       Step 4: Enhance frame prompt system prompt

       At lines 684-719, add a new instruction in the RULES section of the generateFramePrompt system prompt. Insert after the existing    
        rule about reference images (around line 698):

       - When reference images are listed, ANCHOR each character to their reference image using the trait summary provided (e.g., "the     
       red-haired woman in Image #1"). This reinforces character↔image mapping.

       Step 5: Tests

       Create a test for extractTraitSummary() in C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend\src\tests\. This is pure     
       logic, ideal for unit testing:

       - Test short descriptions returned as-is
       - Test long descriptions truncated at first sentence
       - Test empty/null input returns empty string
       - Test word-boundary truncation

       Also test the modified buildNumberedImageManifest() with assets that have effective_description populated to verify the manifest    
        output format.

       ---
       Phase 3 (Section 4): AI-Suggested Shot Assignments (Heuristic First)

       Complexity: MEDIUM | Risk: LOW

       Problem

       AssetDrawer.tsx at line 118 pre-checks ALL shots when entering the shot-checklist step:
       setSelectedShotIds(new Set(shots.map(s => s.id)));
       This forces users to manually deselect irrelevant shots.

       Implementation Steps

       Step 1: Create matching utility function

       Create new file: C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\src\lib\utils\shotAssetMatcher.ts

       import type { Shot } from '@/types/scene';
       import type { ProjectAsset, AssetType } from '@/types/asset';

       export interface ShotMatchResult {
         shotId: string;
         matched: boolean;
         confidence: 'high' | 'medium' | 'low';
         matchReason?: string;
       }

       /**
        * Fuzzy match: normalize both strings and check for substring/token overlap.
        */
       function fuzzyNameMatch(assetName: string, candidateName: string): boolean {
         const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
         const normalizedAsset = normalize(assetName);
         const normalizedCandidate = normalize(candidateName);

         // Exact substring match
         if (normalizedCandidate.includes(normalizedAsset) || normalizedAsset.includes(normalizedCandidate)) {
           return true;
         }

         // Token overlap: split into words, check if any word from asset name appears in candidate
         const assetTokens = assetName.toLowerCase().split(/\s+/).filter(t => t.length > 2);
         const candidateTokens = candidateName.toLowerCase().split(/\s+/);
         return assetTokens.some(token => candidateTokens.some(ct => ct.includes(token) || token.includes(ct)));
       }

       /**
        * Match a project asset against shots to determine which shots it should be pre-selected for.
        */
       export function matchAssetToShots(asset: ProjectAsset, shots: Shot[]): ShotMatchResult[] {
         return shots.map(shot => {
           switch (asset.asset_type) {
             case 'character':
               return matchCharacterToShot(asset, shot);
             case 'location':
               return matchLocationToShot(asset, shot);
             case 'prop':
               return matchPropToShot(asset, shot);
             default:
               return { shotId: shot.id, matched: true, confidence: 'low' as const }; // fallback: check all
           }
         });
       }

       function matchCharacterToShot(asset: ProjectAsset, shot: Shot): ShotMatchResult {
         const allCharacters = [...(shot.charactersForeground || []), ...(shot.charactersBackground || [])];
         const isForeground = shot.charactersForeground?.some(c => fuzzyNameMatch(asset.name, c));
         const isBackground = shot.charactersBackground?.some(c => fuzzyNameMatch(asset.name, c));

         if (isForeground) return { shotId: shot.id, matched: true, confidence: 'high', matchReason: 'Foreground character' };
         if (isBackground) return { shotId: shot.id, matched: true, confidence: 'medium', matchReason: 'Background character' };
         return { shotId: shot.id, matched: false, confidence: 'low' };
       }

       function matchLocationToShot(asset: ProjectAsset, shot: Shot): ShotMatchResult {
         if (fuzzyNameMatch(asset.name, shot.setting || '')) {
           return { shotId: shot.id, matched: true, confidence: 'high', matchReason: 'Setting match' };
         }
         return { shotId: shot.id, matched: false, confidence: 'low' };
       }

       function matchPropToShot(asset: ProjectAsset, shot: Shot): ShotMatchResult {
         if (fuzzyNameMatch(asset.name, shot.action || '')) {
           return { shotId: shot.id, matched: true, confidence: 'medium', matchReason: 'Mentioned in action' };
         }
         return { shotId: shot.id, matched: false, confidence: 'low' };
       }

       Step 2: Modify AssetDrawer.tsx to use heuristic matching

       In C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\src\components\pipeline\AssetDrawer.tsx, modify startShotChecklist()
       (line 112-121):

       import { matchAssetToShots } from '@/lib/utils/shotAssetMatcher';

       const startShotChecklist = useCallback((asset: ProjectAsset) => {
         if (shots.length === 0) return false;
         setPendingAsset(asset);

         // Heuristic matching instead of selecting all shots
         const matches = matchAssetToShots(asset, shots);
         const matchedShotIds = new Set(
           matches.filter(m => m.matched).map(m => m.shotId)
         );

         // If no matches found (e.g., new character not yet in any shot), default to all
         setSelectedShotIds(matchedShotIds.size > 0 ? matchedShotIds : new Set(shots.map(s => s.id)));
         setShotMatchResults(matches); // new state for showing badges
         setStep('shot-checklist');
         return true;
       }, [shots]);

       Add new state:
       const [shotMatchResults, setShotMatchResults] = useState<ShotMatchResult[]>([]);

       Step 3: Add "Suggested" badge to shot checklist UI

       In the shot-checklist rendering section (lines 337-370), add a badge next to shots that were matched by the heuristic:

       {shots.map(shot => {
         const checked = selectedShotIds.has(shot.id);
         const matchResult = shotMatchResults.find(m => m.shotId === shot.id);
         const isSuggested = matchResult?.matched;
         return (
           <label ...>
             <Checkbox ... />
             <div className="flex-1 min-w-0">
               <div className="font-medium text-sm">
                 Shot {shot.shotId}
                 ...
                 {isSuggested && (
                   <Badge variant="secondary" className="ml-2 text-[10px] bg-green-500/20 text-green-400">
                     Suggested
                   </Badge>
                 )}
               </div>
               ...
             </div>
           </label>
         );
       })}

       Step 4: Tests

       Create C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\src\lib\utils\__tests__\shotAssetMatcher.test.ts:

       - Test character matching against charactersForeground
       - Test character matching against charactersBackground
       - Test fuzzy matching (partial names, case insensitivity)
       - Test location matching against setting
       - Test prop matching against action text
       - Test fallback when no matches found (should return all unmatched)
       - Test with empty shot arrays

       ---
       Phase 4 (Section 5): Presence-Type Aware Continuity (Documentation + Edge Cases)

       Complexity: LOW | Risk: VERY LOW

       Problem

       When start_continuity: 'match', the previous shot's end frame is pixel-copied as the current shot's start frame. If an asset        
       enters in the current shot but was visible in the previous shot's end frame, there's an apparent contradiction. The decision is     
       to document this as intentional behavior (the continuity system operates at the image level, not the asset level).

       Implementation Steps

       Step 1: Add info tooltip to ShotAssetPanel

       In C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\src\components\pipeline\Stage9\ShotAssetPanel.tsx:

       The component needs new props to know whether this shot has start_continuity: 'match'.

       Update interface:
       interface ShotAssetPanelProps {
         projectId: string;
         sceneId: string;
         shotId: string;
         shotLabel: string;
         assignments: ShotAssetAssignment[];
         sceneAssets: SceneAssetInstance[];
         onAssignmentsChanged: () => void;
         startContinuity?: ContinuityMode; // NEW
       }

       Add the tooltip after the existing "Passes Through" warning (line 191-198). Show it when startContinuity === 'match' and there      
       are enters assignments:

       import { Info } from 'lucide-react';
       import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

       // After the passes_through warning block:
       {startContinuity === 'match' && assignments.some(a => a.presence_type === 'enters') && (
         <TooltipProvider>
           <Tooltip>
             <TooltipTrigger asChild>
               <div className="flex items-start gap-1.5 p-2 rounded-md bg-blue-500/10 text-blue-400 text-[10px] cursor-help">
                 <Info className="w-3 h-3 shrink-0 mt-0.5" />
                 <span>
                   This shot uses &ldquo;Match&rdquo; continuity. Assets marked &ldquo;Enters&rdquo; may already appear via the copied     
       start frame.
                 </span>
               </div>
             </TooltipTrigger>
             <TooltipContent side="top" className="max-w-xs text-xs">
               Continuity operates at the image level: the previous shot&apos;s end frame is copied as-is.
               &ldquo;Enters&rdquo; means this asset&apos;s reference image won&apos;t be in the start frame manifest,
               but the asset may still be visible from the copied frame. This is intentional.
             </TooltipContent>
           </Tooltip>
         </TooltipProvider>
       )}

       Step 2: Pass startContinuity from Stage9PromptSegmentation

       In C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\src\components\pipeline\Stage9PromptSegmentation.tsx at line 630-638, add    
        the prop:

       <ShotAssetPanel
         projectId={projectId}
         sceneId={sceneId}
         shotId={promptSet.shotUuid}
         shotLabel={promptSet.shotId}
         assignments={assignmentsByShot[promptSet.shotUuid] || []}
         sceneAssets={sceneAssets}
         onAssignmentsChanged={() => setAssignmentsVersion(v => v + 1)}
         startContinuity={promptSet.startContinuity}  // NEW
       />

       Step 3: Add comment block in continuity detection code

       In C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend\src\services\promptGenerationService.ts, add a documentation
       comment above the determineContinuityLink() method (line 553):

       /**
        * DESIGN NOTE on continuity vs. presence_type interaction:
        *
        * The continuity system (match/camera_change) operates at the IMAGE level.
        * When start_continuity is 'match', the previous shot's end frame is pixel-copied
        * as this shot's start frame. This means:
        *
        * - An asset with presence_type 'enters' may already be VISIBLE in the start frame
        *   (from the copied end frame), even though its reference image is NOT included
        *   in the start frame manifest. This is intentional.
        *
        * - 'enters' means "this asset's reference image is excluded from start frame generation"
        *   NOT "this asset is guaranteed invisible in the start frame."
        *
        * This behavior is by design: continuity overrides presence semantics at the pixel level.
        */

       Step 4: Tests

       No new logic is being added, so no unit tests required. The tooltip is UI-only. If desired, a simple RTL snapshot test for
       ShotAssetPanel showing the tooltip when startContinuity='match' and an enters assignment exists would be appropriate but
       optional.

       ---
       Phase 5 (Section 6): Bulk Presence-Type Templates

       Complexity: MEDIUM | Risk: LOW

       Problem

       Users must configure each asset's presence_type individually per shot. Scene-level templates would let them bulk-apply common       
       patterns.

       Implementation Steps

       Step 1: Create BulkPresenceTemplates.tsx component

       New file: C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\src\components\pipeline\Stage9\BulkPresenceTemplates.tsx

       interface BulkPresenceTemplatesProps {
         projectId: string;
         sceneId: string;
         shots: Array<{ id: string; shotId: string; charactersForeground?: string[]; charactersBackground?: string[] }>;
         sceneAssets: SceneAssetInstance[];
         onApplied: () => void;
       }

       type TemplateType = 'all_throughout' | 'match_shot_characters' | 'locations_throughout_characters_custom';

       Template logic (all frontend, using existing shotAssetAssignmentService.createAssignments() and deleteAssignment()):

       Template 1: "All Throughout" -- For every (shot, asset) pair, create assignment with presence_type: 'throughout'. This is
       equivalent to the current auto-populate behavior. Implementation: Delete all existing assignments for the scene, then call
       shotAssetAssignmentService.autoPopulate().

       Template 2: "Match Shot Characters" -- Uses the same fuzzyNameMatch utility from Phase 3 (shotAssetMatcher.ts). For each shot:      
       - Character assets: match against charactersForeground/charactersBackground. If in foreground, assign throughout. If only in        
       background, assign throughout (but could optionally use enters/exits in v2).
       - Location assets: assign throughout to all shots (locations don't change per-shot typically).
       - Props: leave unassigned (user customizes).

       Template 3: "Locations Throughout, Characters Custom" -- Locations get throughout for all shots. Characters and props are
       unassigned.

       UI: A Select dropdown with the three template options plus a "Custom" option (current state). An "Apply Template" button
       triggers the bulk operation.

       The component needs a confirmation dialog before applying since it replaces all existing assignments:

       <AlertDialog>
         <AlertDialogContent>
           <AlertDialogHeader>
             <AlertDialogTitle>Apply Template?</AlertDialogTitle>
             <AlertDialogDescription>
               This will replace all existing shot assignments for this scene.
             </AlertDialogDescription>
           </AlertDialogHeader>
           <AlertDialogFooter>
             <AlertDialogCancel>Cancel</AlertDialogCancel>
             <AlertDialogAction onClick={handleApplyTemplate}>Apply</AlertDialogAction>
           </AlertDialogFooter>
         </AlertDialogContent>
       </AlertDialog>

       Step 2: Add bulk delete method to frontend service

       In C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\src\lib\services\shotAssetAssignmentService.ts, add:

       /** Delete all assignments for a scene (used by bulk templates) */
       async deleteAllForScene(projectId: string, sceneId: string): Promise<void> {
         const assignments = await this.listForScene(projectId, sceneId);
         await Promise.all(
           assignments.map(a => this.deleteAssignment(projectId, sceneId, a.id))
         );
       }

       Alternatively, add a backend bulk-delete endpoint if the number of assignments could be large. The existing backend service
       doesn't have a deleteAllForScene method, so:

       Option A (simpler, frontend-only): Delete one by one as shown above. Fine for scenes with <50 shots x <20 assets = <1000
       assignments.

       Option B (better for performance): Add a backend endpoint DELETE /api/projects/:projectId/scenes/:sceneId/shot-assignments/all      
       that runs a single SQL delete. This is the recommended approach.

       Backend addition in C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend\src\routes\shotAssignments.ts:

       router.delete('/:projectId/scenes/:sceneId/shot-assignments/all', async (req, res) => {
         // Verify ownership, then delete all assignments for shots in this scene
       });

       And in C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend\src\services\shotAssetAssignmentService.ts:

       async deleteAllForScene(sceneId: string): Promise<number> {
         const { data: shots } = await supabase.from('shots').select('id').eq('scene_id', sceneId);
         if (!shots?.length) return 0;
         const { data, error } = await supabase
           .from('shot_asset_assignments')
           .delete()
           .in('shot_id', shots.map(s => s.id))
           .select('id');
         if (error) throw new Error(`Failed to delete all assignments: ${error.message}`);
         return data?.length || 0;
       }

       Step 3: Integrate into Stage9PromptSegmentation

       In C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\src\components\pipeline\Stage9PromptSegmentation.tsx, add the template       
       selector in the header area (around line 410-448), next to the "Generate All Prompts" button:

       import { BulkPresenceTemplates } from './Stage9/BulkPresenceTemplates';

       // In the header div:
       <BulkPresenceTemplates
         projectId={projectId}
         sceneId={sceneId}
         shots={promptSets.map(ps => ({
           id: ps.shotUuid!,
           shotId: ps.shotId,
           charactersForeground: /* need to get from shot data */,
           charactersBackground: /* need to get from shot data */,
         }))}
         sceneAssets={sceneAssets}
         onApplied={() => setAssignmentsVersion(v => v + 1)}
       />

       Note: The promptSets don't currently carry charactersForeground/charactersBackground. These would need to be fetched alongside      
       prompt data or stored in state. The shot context info is available in the API response from generate-prompts but not currently      
       stored in PromptSet. Two options:

       1. Fetch shots separately for the template component
       2. Extend the prompts API response to include character arrays (they're already fetched in the route)

       Option 2 is cleaner: in projects.ts at lines 2400-2418, add charactersForeground and charactersBackground to the response
       mapping.

       Step 4: Tests

       - Unit test the template application logic (which assets get assigned to which shots)
       - Test the "Match Shot Characters" template with the fuzzy matcher
       - Backend test for deleteAllForScene() if backend route is added

       ---
       Phase 6 (Section 3): Shot Splitting for passes_through

       Complexity: HIGH | Risk: MEDIUM

       Problem

       When a user selects passes_through for an asset, there's no mechanism to split the shot into sub-shots to properly handle the       
       transient appearance. The existing shotSplitService.ts already handles LLM-based shot splitting for Stage 7, but it doesn't know    
        about asset assignments.

       Key Discovery

       The codebase already has a full shot split implementation:
       - C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend\src\services\shotSplitService.ts -- LLM-based split into 2 shots      
       - C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend\src\routes\projects.ts lines 1370-1442 -- Route that handles
       delete original + renumber + insert new shots

       The missing piece: The existing split route does NOT clone shot_asset_assignments to the new sub-shots. When the original shot      
       is deleted (line 1396-1400), the ON DELETE CASCADE on shot_asset_assignments.shot_id deletes all assignments.

       Implementation Steps

       Step 1: Extend the split route to clone assignments

       In C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend\src\routes\projects.ts, in the split handler (line 1370-1442):       

       After inserting the new shots (line 1428-1431), before res.json, add assignment cloning logic. But there's a sequencing problem:    
        the original shot's assignments are deleted by CASCADE when we delete the original shot. So we need to:

       1. Read assignments BEFORE deleting the original shot
       2. Delete original shot (cascade deletes assignments)
       3. Insert new shots
       4. Clone the saved assignments to all new sub-shots

       // BEFORE deleting original shot:
       const originalAssignments = await shotAssetAssignmentService.getAssignmentsForShot(shotId);

       // After inserting new shots:
       if (originalAssignments.length > 0 && insertedShots?.length) {
         const cloneRows: { shotId: string; instanceId: string; presenceType: PresenceType }[] = [];
         for (const newShot of insertedShots) {
           for (const assignment of originalAssignments) {
             cloneRows.push({
               shotId: newShot.id,
               instanceId: assignment.scene_asset_instance_id,
               presenceType: assignment.presence_type as PresenceType,
             });
           }
         }
         await shotAssetAssignmentService.bulkCreateAssignments(cloneRows);
       }

       For the passes_through case specifically: When a split is triggered from the asset panel (Stage 9) for a passes_through asset,      
       the user guidance should suggest splitting around the transient asset. The LLM prompt in shotSplitService.ts would receive
       guidance like: "Split this shot so that [AssetName] passes through in the middle sub-shot."

       Step 2: Modify split to support 3-way splitting for passes_through

       The existing ShotSplitService splits into exactly 2 shots. For passes_through, we need 3 sub-shots: before-entry,
       during-presence, after-exit.

       Option A: Modify ShotSplitService.splitShot() to accept a splitCount parameter (2 or 3). When 3, the LLM prompt asks for three      
       shots.

       Option B: Call the 2-way split twice (split original into A+B, then split B into B1+B2). This is more complex and error-prone.      

       Recommended: Option A. Add to shotSplitService.ts:

       async splitShot(
         originalShot: OriginalShotRow,
         userGuidance?: string,
         splitCount: 2 | 3 = 2  // NEW parameter
       ): Promise<ShotForInsert[]>

       Update the system prompt to handle 3-way split when splitCount === 3. The shot IDs become {originalShotId}-1,
       {originalShotId}-2, {originalShotId}-3.

       Step 3: Add "Split Shot" button to ShotAssetPanel

       In C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\src\components\pipeline\Stage9\ShotAssetPanel.tsx, add a button that
       appears when passes_through is selected:

       {assignment.presence_type === 'passes_through' && (
         <Button
           variant="outline"
           size="sm"
           className="h-6 text-[10px] px-2 ml-1"
           onClick={() => handleSplitForPassThrough(assignment)}
         >
           <Scissors className="w-3 h-3 mr-1" />
           Split Shot
         </Button>
       )}

       The handler calls the existing split endpoint and optionally provides user guidance mentioning the asset name. Add new props to     
       ShotAssetPanelProps:
       onSplitShot?: (shotId: string, guidance: string) => Promise<void>;

       Step 4: Handle downstream invalidation

       The existing split route does NOT invalidate Stage 9+. After splitting:
       - Existing frames/videos for the original shot become orphaned (handled by CASCADE on shot deletion)
       - New sub-shots need prompts generated
       - The scene should be marked as needing regeneration

       Add shotAssetAssignmentService.invalidateStage9AndDownstream(sceneId) after the split completes.

       Step 5: Set default continuity for sub-shots

       New sub-shots from a split should default to start_continuity: 'match' for all sub-shots after the first one, since they are        
       consecutive moments from a single original shot.

       In the insert rows construction:
       const insertRows = newShotsPayload.map((shot, i) => ({
         ...existingFields,
         start_continuity: i > 0 ? 'match' : 'none',
         ai_start_continuity: i > 0 ? 'match' : 'none',
       }));

       Step 6: Tests

       - Backend test: Verify assignments are cloned to new sub-shots after split
       - Backend test: Verify 3-way split produces correct shot IDs and ordering
       - Backend test: Verify downstream stage invalidation fires
       - Frontend: Test that "Split Shot" button appears only for passes_through assignments

       ---
       Phase 7 (Section 7): Visual Timeline View

       Complexity: MEDIUM | Risk: LOW

       Problem

       No visual overview of which assets appear in which shots and with what presence type.

       Implementation Steps

       Step 1: Create ShotAssetTimeline.tsx component

       New file: C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\src\components\pipeline\Stage9\ShotAssetTimeline.tsx

       interface ShotAssetTimelineProps {
         projectId: string;
         sceneId: string;
         shots: Array<{ id: string; shotId: string; shotOrder?: number }>;
         sceneAssets: SceneAssetInstance[];
         assignments: ShotAssetAssignment[];
         onAssignmentChanged: () => void;
       }

       Layout: A matrix/grid view:
       - Columns: Shots (ordered by shot_order)
       - Rows: Assets (grouped by type: characters first, then locations, then props)
       - Cells: Color-coded by presence_type:
         - throughout = solid fill (e.g., bg-primary/30)
         - enters = gradient from transparent to filled (right half)
         - exits = gradient from filled to transparent (left half)
         - passes_through = dashed border/amber fill
         - No assignment = empty/gray

       Interaction: Clicking a cell toggles assignment or opens a presence_type selector dropdown.

       Structure:
       <div className="overflow-x-auto">
         <table className="border-collapse">
           <thead>
             <tr>
               <th className="sticky left-0 bg-background">Asset</th>
               {shots.map(shot => (
                 <th key={shot.id} className="px-2 py-1 text-xs text-center">
                   {shot.shotId}
                 </th>
               ))}
             </tr>
           </thead>
           <tbody>
             {groupedAssets.map(asset => (
               <tr key={asset.id}>
                 <td className="sticky left-0 bg-background">
                   <AssetRowLabel asset={asset} />
                 </td>
                 {shots.map(shot => (
                   <TimelineCell
                     key={`${asset.id}-${shot.id}`}
                     assignment={findAssignment(shot.id, asset.id)}
                     onToggle={() => handleToggleAssignment(shot.id, asset.id)}
                     onChangePresence={(type) => handleChangePresence(shot.id, asset.id, type)}
                   />
                 ))}
               </tr>
             ))}
           </tbody>
         </table>
       </div>

       Color scheme for cells:
       const PRESENCE_COLORS: Record<PresenceType | 'none', string> = {
         throughout: 'bg-blue-500/30 border-blue-500/50',
         enters: 'bg-green-500/20 border-green-500/40',
         exits: 'bg-red-500/20 border-red-500/40',
         passes_through: 'bg-amber-500/15 border-amber-500/30 border-dashed',
         none: 'bg-muted/5 border-border/20',
       };

       Each cell should be small (e.g., 40x32px) with a tooltip showing the full presence type label on hover.

       Step 2: Add view toggle to Stage9PromptSegmentation

       In C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\src\components\pipeline\Stage9PromptSegmentation.tsx, add a toggle
       between "Card View" (current) and "Timeline View" (new):

       const [viewMode, setViewMode] = useState<'cards' | 'timeline'>('cards');

       // In the header:
       <div className="flex gap-1 border rounded-md">
         <Button
           variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
           size="icon"
           onClick={() => setViewMode('cards')}
           className="h-7 w-7"
         >
           <List className="h-3.5 w-3.5" />
         </Button>
         <Button
           variant={viewMode === 'timeline' ? 'secondary' : 'ghost'}
           size="icon"
           onClick={() => setViewMode('timeline')}
           className="h-7 w-7"
         >
           <Grid3x3 className="h-3.5 w-3.5" />
         </Button>
       </div>

       Conditionally render:
       {viewMode === 'timeline' ? (
         <ShotAssetTimeline
           projectId={projectId}
           sceneId={sceneId}
           shots={promptSets.map(ps => ({ id: ps.shotUuid!, shotId: ps.shotId }))}
           sceneAssets={sceneAssets}
           assignments={shotAssignments}
           onAssignmentChanged={() => setAssignmentsVersion(v => v + 1)}
         />
       ) : (
         /* existing card view */
       )}

       Step 3: Make cells interactive

       Each cell in the timeline supports:
       - Click to cycle: none -> throughout -> enters -> exits -> passes_through -> none
       - Right-click or long-press for a dropdown with all options
       - Visual feedback during async updates (loading spinner in cell)

       Implementation uses the existing shotAssetAssignmentService.createAssignments(), updateAssignment(), and deleteAssignment()
       methods.

       Step 4: Legend

       Add a small legend below the timeline showing the color mapping:

       <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground">
         <span className="flex items-center gap-1">
           <div className="w-3 h-3 rounded bg-blue-500/30 border border-blue-500/50" /> Throughout
         </span>
         <span className="flex items-center gap-1">
           <div className="w-3 h-3 rounded bg-green-500/20 border border-green-500/40" /> Enters
         </span>
         <span className="flex items-center gap-1">
           <div className="w-3 h-3 rounded bg-red-500/20 border border-red-500/40" /> Exits
         </span>
         <span className="flex items-center gap-1">
           <div className="w-3 h-3 rounded bg-amber-500/15 border border-amber-500/30 border-dashed" /> Passes Through
         </span>
       </div>

       Step 5: Tests

       - Test that the timeline grid renders the correct number of cells (shots x assets)
       - Test that clicking a cell creates/updates/deletes assignments correctly
       - Test that the legend renders all 4 presence types

       ---
       Dependency Graph and Implementation Order

       Phase 2 (Section 2) -----> Independent, no dependencies
       Phase 3 (Section 4) -----> Independent, no dependencies
       Phase 4 (Section 5) -----> Depends on Phase 2 conceptually (trait anchoring aids continuity understanding)
       Phase 5 (Section 6) -----> Depends on Phase 3 (reuses shotAssetMatcher for "Match Shot Characters" template)
       Phase 6 (Section 3) -----> Depends on understanding of existing split infra; no code dependency on Phases 2-5
       Phase 7 (Section 7) -----> Independent (but benefits from all assignment data being richer)

       Recommended implementation order: Phases 2 and 3 can be done in parallel. Phase 4 is trivial and can be done anytime. Phase 5       
       depends on Phase 3's matcher utility. Phase 6 is independent but complex. Phase 7 can be done anytime after the basic assignment    
        system is stable.

       ---
       Summary Table







       ┌───────┬──────────┬────────────┬─────────┬────────────────────┬───────────────┬─────────────────┬──────────────────────────────    
       ────┐
       │ Phase │ Section  │ Complexity │  Risk   │  Backend Changes   │   Frontend    │    New Files    │              Tests
           │
       │       │          │            │         │                    │    Changes    │                 │
           │
       ├───────┼──────────┼────────────┼─────────┼────────────────────┼───────────────┼─────────────────┼──────────────────────────────    
       ────┤
       │ 2     │ Section  │ LOW        │ LOW     │ 1 file             │ 0             │ 0               │ extractTraitSummary unit
       tests   │
       │       │ 2        │            │         │                    │               │                 │
           │
       ├───────┼──────────┼────────────┼─────────┼────────────────────┼───────────────┼─────────────────┼──────────────────────────────    
       ────┤
       │ 3     │ Section  │ MEDIUM     │ LOW     │ 0                  │ 1 file        │ 1 new utility   │ shotAssetMatcher unit tests      
           │
       │       │ 4        │            │         │                    │ modified      │ file            │
           │
       ├───────┼──────────┼────────────┼─────────┼────────────────────┼───────────────┼─────────────────┼──────────────────────────────    
       ────┤
       │ 4     │ Section  │ LOW        │ VERY    │ 1 file (comments   │ 2 files       │ 0               │ Optional tooltip snapshot        
           │
       │       │ 5        │            │ LOW     │ only)              │ modified      │                 │
           │
       ├───────┼──────────┼────────────┼─────────┼────────────────────┼───────────────┼─────────────────┼──────────────────────────────    
       ────┤
       │ 5     │ Section  │ MEDIUM     │ LOW     │ 2 files            │ 2 files       │ 1 new component │ Template logic + backend
       delete  │
       │       │ 6        │            │         │                    │ modified      │                 │ test
           │

 ▐▛███▜▌   Claude Code v2.1.63
▝▜█████▛▘  Opus 4.6 · Claude Max
  ▘▘ ▝▝    ~\Desktop\Aiuteur\wizardirector\.claude\skills\playwright-skill
─────────────────────────────────────────────────── ctrl+e to show 704 previous messages ──────────────────────────────────────────────────

● Explore(Explore continuity and bulk patterns)

                                                                                                           03:12 PM claude-opus-4-6        
● Excellent. Now let me read the specific areas I need for the plan — the current manifest format and the system prompt in
  promptGenerationService.ts.

● Read(~\Desktop\Aiuteur\wizardirector\backend\src\services\promptGenerationService.ts)
  ⎿  Read 120 lines

● Read(~\Desktop\Aiuteur\wizardirector\backend\src\services\promptGenerationService.ts)
  ⎿  Read 150 lines

● Read(~\Desktop\Aiuteur\wizardirector\backend\src\services\promptGenerationService.ts)
  ⎿  Read 200 lines

                                                                                                           03:12 PM claude-opus-4-6        
● Now let me read the frame prompt system prompt and the AssetDrawer more closely.

● Read(~\Desktop\Aiuteur\wizardirector\backend\src\services\promptGenerationService.ts)
  ⎿  Read 200 lines

● Read(~\Desktop\Aiuteur\wizardirector\src\components\pipeline\AssetDrawer.tsx)
  ⎿  Read 200 lines

                                                                                                           03:12 PM claude-opus-4-6        
● Now let me read the frame prompt system prompt continuation and the end frame prompt to understand the current reference image
  instruction format.

● Read(~\Desktop\Aiuteur\wizardirector\backend\src\services\promptGenerationService.ts)
  ⎿  Read 200 lines

                                                                                                           03:12 PM claude-opus-4-6        
● Now I have a comprehensive understanding of all the code. Let me launch a Plan agent to design the implementation.

● Plan(Design implementation plan for pt-2)
  ⎿  Prompt:
       Design a detailed implementation plan for Part 2 of the shot-asset-assignment system. The implementation order is:

       Phase 2 (§2): Character-to-Reference Image Mapping Accuracy
       Phase 3 (§4): AI-Suggested Shot Assignments (heuristic version first)
       Phase 4 (§5): Presence-Type Aware Continuity (documentation + edge case handling)
       Phase 5 (§6): Bulk Presence-Type Templates
       Phase 6 (§3): Shot Splitting for passes_through
       Phase 7 (§7): Visual Timeline View

       Here is all the context you need:

       ---
       §2: Character-to-Reference Image Mapping Accuracy

       Current state: buildNumberedImageManifest() in backend/src/services/promptGenerationService.ts (line 148-185) generates:
       REFERENCE IMAGES (attached alongside this prompt during image generation):
       Image #1: Alice (character)
       Image #2: Bob (character)
       Image #3: Living Room (location)

       Goal: Add physical trait anchoring from effective_description:
       REFERENCE IMAGES (attached alongside this prompt during image generation):
       Image #1: Alice (character) — red-haired woman in blue dress, mid-20s
       Image #2: Bob (character) — tall man with dark beard, grey suit
       Image #3: Living Room (location) — warm-lit room with leather couch

       Each asset already has effective_description available on SceneAssetInstanceData. We need to extract a SHORT trait summary (not     
       the full description) and append it to the manifest line.

       Also enhance the frame prompt system prompt (line 684-719) to instruct the LLM to reinforce character↔image mapping with trait      
       descriptions.

       Files to modify:
       - backend/src/services/promptGenerationService.ts — buildNumberedImageManifest() function + frame prompt system prompt

       ---
       §4: AI-Suggested Shot Assignments (Heuristic First)

       Current state: When a new asset is added via AssetDrawer (file: src/components/pipeline/AssetDrawer.tsx), all shots are
       pre-checked in the shot checklist. User must manually deselect irrelevant shots.

       Goal: Use a simple heuristic (NO LLM needed for v1): Match project_asset.name against each shot's characters_foreground[] and       
       characters_background[] arrays (populated by Stage 7 extraction). Pre-check only matching shots.

       Shot data structure (from backend/src/services/promptGenerationService.ts line 13-25):
       interface ShotData {
         characters_foreground: string[];
         characters_background: string[];
         // ...
       }

       Frontend Shot type (from src/types/scene.ts):
       interface Shot {
         charactersForeground: string[];  // camelCase in frontend
         charactersBackground: string[];
         // ...
       }

       Heuristic logic (frontend-only, no backend changes needed):
       1. For character assets: fuzzy match project_asset.name against each shot's charactersForeground + charactersBackground
       2. For location assets: match against shot's setting field
       3. For prop assets: match against shot's action field (props are often mentioned in action descriptions)
       4. Show confidence indicator: "Suggested" badge next to pre-checked shots

       Files to modify:
       - src/components/pipeline/AssetDrawer.tsx — shot checklist step, replace "all shots checked" with heuristic matching
       - Possibly a small utility function file for the matching logic

       ---
       §5: Presence-Type Aware Continuity (Documentation + Edge Case Handling)

       Current state: The continuity system (start_continuity: 'match' | 'camera_change') in promptGenerationService.ts lines 557-584
       copies the previous shot's end frame as the current shot's start. If an asset enters in the current shot, the previous shot's       
       end frame may already show that asset.

       Recommendation from doc: Approach 3 — redefine/document that enters means "asset's reference image is not in start frame" but       
       doesn't prevent it from appearing via continuity. The continuity system operates at the image level, not the asset level.

       Implementation:
       1. Add a tooltip/info to the ShotAssetPanel when a shot has start_continuity: 'match' explaining that assets from the previous      
       shot's end frame will appear regardless of presence_type
       2. Add a brief comment block in the continuity detection code explaining the intentional behavior
       3. No behavioral changes needed — just documentation/UI hints

       Files to modify:
       - src/components/pipeline/Stage9/ShotAssetPanel.tsx — add info tooltip
       - backend/src/services/promptGenerationService.ts — add comments

       ---
       §6: Bulk Presence-Type Templates

       Current state: Users configure each asset individually per shot in Stage 9.

       Goal: Preset templates applied at the scene level from Stage 9:
       - "All Throughout" — every asset throughout in every shot (default)
       - "Match Shot Characters" — auto-set presence based on characters_foreground/characters_background on each shot
       - "Locations Throughout, Characters Custom" — locations auto-assigned throughout, characters left unassigned

       Implementation: Pure frontend logic calling existing bulk create/update endpoints.

       Files to modify:
       - New component: src/components/pipeline/Stage9/BulkPresenceTemplates.tsx
       - src/components/pipeline/Stage9PromptSegmentation.tsx — integrate the template selector
       - src/lib/services/shotAssetAssignmentService.ts — possibly add a bulk update method if not existing

       ---
       §3: Shot Splitting for passes_through

       This is the most complex feature. When a user selects passes_through, offer a "Split Shot" button that divides the shot into 2-3    
        sub-shots.

       Complexity touches:
       - Stage 7 data (shot definitions, shot_id naming, shot_order renumbering)
       - Stage 9 (prompts for sub-shots)
       - shot_asset_assignments for all sub-shots
       - Continuity linking (sub-shots should be match by default)
       - Existing frames/videos become invalid

       Files to modify:
       - Backend: New service method or route for splitting a shot
       - backend/src/services/shotAssetAssignmentService.ts — clone assignments to sub-shots
       - Frontend: UI in ShotAssetPanel for the "Split Shot" button
       - src/components/pipeline/Stage9/ShotAssetPanel.tsx

       ---
       §7: Visual Timeline View

       Goal: A matrix/timeline view showing shots as columns, assets as rows, with color-coded presence_type cells.

       Files:
       - New component: src/components/pipeline/Stage9/ShotAssetTimeline.tsx
       - src/components/pipeline/Stage9PromptSegmentation.tsx — toggle between panel/timeline view

       ---
       Key Constraints:

       - Follow existing patterns (shadcn/ui, Tailwind, Zustand + React Query)
       - Backend uses .js extensions in imports (ES modules)
       - Frontend services use getAuthHeaders() with Supabase session tokens
       - Run npm run lint after code changes
       - Write tests for: pure logic, new service methods, new backend routes

       Please provide a detailed, concrete implementation plan for each phase with:
       1. Specific file paths and function signatures
       2. Step-by-step implementation order within each phase
       3. Testing strategy per phase
       4. Estimated complexity/risk level

  ⎿  Read(C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend\src\services\promptGenerationService.ts · lines 1-100)

  ⎿  Read(C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\src\components\pipeline\AssetDrawer.tsx · lines 1-80)

  ⎿  Read(C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\src\types\scene.ts)

  ⎿  Read(C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend\src\services\promptGenerationService.ts · lines 140-239)

  ⎿  Read(C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\src\components\pipeline\AssetDrawer.tsx · lines 80-279)

  ⎿  Search(pattern: "src/components/pipeline/Stage9/**/*.tsx", path: "C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector")

  ⎿  Read(C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\src\components\pipeline\Stage9\ShotAssetPanel.tsx)

  ⎿  Read(C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend\src\services\promptGenerationService.ts · lines 550-749)

  ⎿  Read(C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\src\lib\services\shotAssetAssignmentService.ts)

  ⎿  Read(C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\src\components\pipeline\AssetDrawer.tsx · lines 280-579)

  ⎿  Read(C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend\src\services\promptGenerationService.ts · lines 240-339)

  ⎿  Search(pattern: "src/components/pipeline/Stage9PromptSegmentation.tsx", path: "C:\Users\Daniel
           Lopez\Desktop\Aiuteur\wizardirector")
  ⎿  Read(C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\src\components\pipeline\Stage9PromptSegmentation.tsx · lines 1-100)

  ⎿  Read(C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend\src\services\promptGenerationService.ts · lines 340-439)

  ⎿  Search(pattern: "backend/src/routes", path: "C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend\src")

  ⎿  Search(pattern: "backend/src/routes/**/*.ts", path: "C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector")

  ⎿  Read(C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\src\components\pipeline\Stage9PromptSegmentation.tsx · lines 100-199)        

  ⎿  Search(pattern: "shot-assignments|shotAssetAssignment", path: "C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend\src")      

  ⎿  Read(C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend\src\services\shotAssetAssignmentService.ts)

  ⎿  Read(C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend\src\routes\shotAssignments.ts)

  ⎿  Read(C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\src\components\pipeline\Stage9PromptSegmentation.tsx · lines 200-399)        

  ⎿  Read(C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend\src\services\promptGenerationService.ts · lines 430-559)

  ⎿  Search(pattern: "generate-prompts|generatePrompts", path: "C:\Users\Daniel
           Lopez\Desktop\Aiuteur\wizardirector\backend\src\routes")
  ⎿  Search(pattern: "generate-prompts", path: "C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend\src\routes\projects.ts")       

  ⎿  Read(C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\src\components\pipeline\Stage9PromptSegmentation.tsx · lines 400-599)        

  ⎿  Search(pattern: "src/lib/hooks/useShotAsset*.ts", path: "C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector")

  ⎿  Read(C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\src\components\pipeline\Stage9PromptSegmentation.tsx · lines 600-799)        

  ⎿  Read(C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\src\lib\hooks\useShotAssetAutoPopulate.ts)

  ⎿  Read(C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend\src\routes\projects.ts · lines 2130-2229)

  ⎿  Read(C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend\src\routes\projects.ts · lines 2228-2427)

  ⎿  Read(C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\src\types\asset.ts)

  ⎿  Search(pattern: "src/components/ui/tooltip.tsx", path: "C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector")

  ⎿  Read(C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend\src\tests\shotAssetAssignment.test.ts · lines 1-60)

  ⎿  Search(pattern: "Tooltip", path: "C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\src\components\ui")

  ⎿  Search(pattern: "CREATE TABLE shots|shot_id|shot_order", path: "C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend")

  ⎿  Search(pattern: "insert.*shots|from\('shots'\)", path: "C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend\src")

  ⎿  Search(pattern: "extractShots|extract.*shot|splitShot|split.*shot", path: "C:\Users\Daniel
           Lopez\Desktop\Aiuteur\wizardirector\backend\src")
  ⎿  Read(C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend\src\services\shotSplitService.ts)

  ⎿  Read(C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend\migrations\006_shots_table.sql)

  ⎿  Read(C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend\migrations\033_shot_asset_assignments.sql)

  ⎿  Search(pattern: "split|splitShot", path: "C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend\src\routes\projects.ts")        

  ⎿  Read(C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend\migrations\012_add_shot_order_to_shots.sql)

  ⎿  Read(C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend\src\routes\projects.ts · lines 1367-1446)

  ⎿  Read(C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\src\components\ui\tooltip.tsx)

  ⎿  Search(pattern: "._docs/asset-related-recs*", path: "C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector")

  ⎿  Search(pattern: "extractTraitSummary|trait.*summary|short.*description", path: "C:\Users\Daniel
           Lopez\Desktop\Aiuteur\wizardirector\backend\src")
  ⎿  Response:
       I now have a comprehensive understanding of the entire codebase surface area needed for this plan. Let me produce the detailed      
       implementation plan.

       ---
       Shot-Asset-Assignment System: Part 2 Implementation Plan

       Overview

       This plan covers 6 phases (Phases 2-7 in the overall implementation order) for the shot-asset-assignment system. Each phase is      
       self-contained with clear dependencies on preceding phases where applicable.

       ---
       Phase 2 (Section 2): Character-to-Reference Image Mapping Accuracy

       Complexity: LOW | Risk: LOW

       Problem

       The buildNumberedImageManifest() function at C:\Users\Daniel
       Lopez\Desktop\Aiuteur\wizardirector\backend\src\services\promptGenerationService.ts (lines 149-185) currently produces lines        
       like:
       Image #1: Alice (character)
       Missing the physical trait anchoring that helps the LLM map reference images to characters consistently.

       Implementation Steps

       Step 1: Add extractTraitSummary() utility function

       Location: C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend\src\services\promptGenerationService.ts, insert before        
       buildNumberedImageManifest() (around line 148).

       /**
        * Extract a short trait summary (max ~80 chars) from an effective_description.
        * Targets physical identifiers: hair, clothing, age, build, distinguishing features.
        */
       export function extractTraitSummary(description: string, maxLen: number = 80): string {
         if (!description || description.trim().length === 0) return '';

         // If description is already short, use it directly
         const trimmed = description.trim();
         if (trimmed.length <= maxLen) return trimmed;

         // Extract first sentence or clause as a summary
         const firstSentence = trimmed.match(/^[^.!?]+[.!?]?/)?.[0] || '';
         if (firstSentence.length > 0 && firstSentence.length <= maxLen) {
           return firstSentence.replace(/[.!?]$/, '');
         }

         // Truncate intelligently at word boundary
         const truncated = trimmed.substring(0, maxLen);
         const lastSpace = truncated.lastIndexOf(' ');
         return (lastSpace > maxLen * 0.5 ? truncated.substring(0, lastSpace) : truncated) + '...';
       }

       This function is deterministic, no LLM needed. It takes the first sentence of effective_description as the trait anchor, which      
       typically contains the most important physical identifiers (writers front-load appearance descriptions).

       Step 2: Modify buildNumberedImageManifest() to append trait summaries

       In the same file, modify the loop at line 162-174. The SceneAssetInstanceData interface already includes effective_description      
       (line 44). Change the manifest line construction:

       Current (line 181):
       const lines = imageOrder.map(entry => `${entry.label}: ${entry.assetName} (${entry.type})`);

       The issue is that imageOrder entries (type ReferenceImageOrderEntry) don't carry effective_description. Two options:

       Option A (preferred): Extend the loop to capture descriptions alongside the imageOrder entries, then produce the manifest line      
       with traits. Specifically, inside the for (const asset of sorted) loop, capture the trait alongside the entry:

       // Inside the loop, after pushing to imageOrder:
       const traitSummary = extractTraitSummary(asset.effective_description);
       // Store alongside for manifest construction

       Then construct lines as:
       const traitSuffix = traitSummary ? ` — ${traitSummary}` : '';
       `${entry.label}: ${entry.assetName} (${entry.type})${traitSuffix}`

       This requires building a parallel array of trait summaries or attaching them to a local struct during the loop. The cleanest        
       approach: build the lines array inside the same loop that builds imageOrder, rather than mapping afterwards.

       Step 3: Apply same trait anchoring to buildFrameReferenceManifests()

       The function at lines 194-239 delegates to buildNumberedImageManifest() for both start and end frame manifests, so if Step 2 is     
       done correctly, both start/end manifests automatically get trait summaries.

       Step 4: Enhance frame prompt system prompt

       At lines 684-719, add a new instruction in the RULES section of the generateFramePrompt system prompt. Insert after the existing    
        rule about reference images (around line 698):

       - When reference images are listed, ANCHOR each character to their reference image using the trait summary provided (e.g., "the     
       red-haired woman in Image #1"). This reinforces character↔image mapping.

       Step 5: Tests

       Create a test for extractTraitSummary() in C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend\src\tests\. This is pure     
       logic, ideal for unit testing:

       - Test short descriptions returned as-is
       - Test long descriptions truncated at first sentence
       - Test empty/null input returns empty string
       - Test word-boundary truncation

       Also test the modified buildNumberedImageManifest() with assets that have effective_description populated to verify the manifest    
        output format.

       ---
       Phase 3 (Section 4): AI-Suggested Shot Assignments (Heuristic First)

       Complexity: MEDIUM | Risk: LOW

       Problem

       AssetDrawer.tsx at line 118 pre-checks ALL shots when entering the shot-checklist step:
       setSelectedShotIds(new Set(shots.map(s => s.id)));
       This forces users to manually deselect irrelevant shots.

       Implementation Steps

       Step 1: Create matching utility function

       Create new file: C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\src\lib\utils\shotAssetMatcher.ts

       import type { Shot } from '@/types/scene';
       import type { ProjectAsset, AssetType } from '@/types/asset';

       export interface ShotMatchResult {
         shotId: string;
         matched: boolean;
         confidence: 'high' | 'medium' | 'low';
         matchReason?: string;
       }

       /**
        * Fuzzy match: normalize both strings and check for substring/token overlap.
        */
       function fuzzyNameMatch(assetName: string, candidateName: string): boolean {
         const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
         const normalizedAsset = normalize(assetName);
         const normalizedCandidate = normalize(candidateName);

         // Exact substring match
         if (normalizedCandidate.includes(normalizedAsset) || normalizedAsset.includes(normalizedCandidate)) {
           return true;
         }

         // Token overlap: split into words, check if any word from asset name appears in candidate
         const assetTokens = assetName.toLowerCase().split(/\s+/).filter(t => t.length > 2);
         const candidateTokens = candidateName.toLowerCase().split(/\s+/);
         return assetTokens.some(token => candidateTokens.some(ct => ct.includes(token) || token.includes(ct)));
       }

       /**
        * Match a project asset against shots to determine which shots it should be pre-selected for.
        */
       export function matchAssetToShots(asset: ProjectAsset, shots: Shot[]): ShotMatchResult[] {
         return shots.map(shot => {
           switch (asset.asset_type) {
             case 'character':
               return matchCharacterToShot(asset, shot);
             case 'location':
               return matchLocationToShot(asset, shot);
             case 'prop':
               return matchPropToShot(asset, shot);
             default:
               return { shotId: shot.id, matched: true, confidence: 'low' as const }; // fallback: check all
           }
         });
       }

       function matchCharacterToShot(asset: ProjectAsset, shot: Shot): ShotMatchResult {
         const allCharacters = [...(shot.charactersForeground || []), ...(shot.charactersBackground || [])];
         const isForeground = shot.charactersForeground?.some(c => fuzzyNameMatch(asset.name, c));
         const isBackground = shot.charactersBackground?.some(c => fuzzyNameMatch(asset.name, c));

         if (isForeground) return { shotId: shot.id, matched: true, confidence: 'high', matchReason: 'Foreground character' };
         if (isBackground) return { shotId: shot.id, matched: true, confidence: 'medium', matchReason: 'Background character' };
         return { shotId: shot.id, matched: false, confidence: 'low' };
       }

       function matchLocationToShot(asset: ProjectAsset, shot: Shot): ShotMatchResult {
         if (fuzzyNameMatch(asset.name, shot.setting || '')) {
           return { shotId: shot.id, matched: true, confidence: 'high', matchReason: 'Setting match' };
         }
         return { shotId: shot.id, matched: false, confidence: 'low' };
       }

       function matchPropToShot(asset: ProjectAsset, shot: Shot): ShotMatchResult {
         if (fuzzyNameMatch(asset.name, shot.action || '')) {
           return { shotId: shot.id, matched: true, confidence: 'medium', matchReason: 'Mentioned in action' };
         }
         return { shotId: shot.id, matched: false, confidence: 'low' };
       }

       Step 2: Modify AssetDrawer.tsx to use heuristic matching

       In C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\src\components\pipeline\AssetDrawer.tsx, modify startShotChecklist()
       (line 112-121):

       import { matchAssetToShots } from '@/lib/utils/shotAssetMatcher';

       const startShotChecklist = useCallback((asset: ProjectAsset) => {
         if (shots.length === 0) return false;
         setPendingAsset(asset);

         // Heuristic matching instead of selecting all shots
         const matches = matchAssetToShots(asset, shots);
         const matchedShotIds = new Set(
           matches.filter(m => m.matched).map(m => m.shotId)
         );

         // If no matches found (e.g., new character not yet in any shot), default to all
         setSelectedShotIds(matchedShotIds.size > 0 ? matchedShotIds : new Set(shots.map(s => s.id)));
         setShotMatchResults(matches); // new state for showing badges
         setStep('shot-checklist');
         return true;
       }, [shots]);

       Add new state:
       const [shotMatchResults, setShotMatchResults] = useState<ShotMatchResult[]>([]);

       Step 3: Add "Suggested" badge to shot checklist UI

       In the shot-checklist rendering section (lines 337-370), add a badge next to shots that were matched by the heuristic:

       {shots.map(shot => {
         const checked = selectedShotIds.has(shot.id);
         const matchResult = shotMatchResults.find(m => m.shotId === shot.id);
         const isSuggested = matchResult?.matched;
         return (
           <label ...>
             <Checkbox ... />
             <div className="flex-1 min-w-0">
               <div className="font-medium text-sm">
                 Shot {shot.shotId}
                 ...
                 {isSuggested && (
                   <Badge variant="secondary" className="ml-2 text-[10px] bg-green-500/20 text-green-400">
                     Suggested
                   </Badge>
                 )}
               </div>
               ...
             </div>
           </label>
         );
       })}

       Step 4: Tests

       Create C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\src\lib\utils\__tests__\shotAssetMatcher.test.ts:

       - Test character matching against charactersForeground
       - Test character matching against charactersBackground
       - Test fuzzy matching (partial names, case insensitivity)
       - Test location matching against setting
       - Test prop matching against action text
       - Test fallback when no matches found (should return all unmatched)
       - Test with empty shot arrays

       ---
       Phase 4 (Section 5): Presence-Type Aware Continuity (Documentation + Edge Cases)

       Complexity: LOW | Risk: VERY LOW

       Problem

       When start_continuity: 'match', the previous shot's end frame is pixel-copied as the current shot's start frame. If an asset        
       enters in the current shot but was visible in the previous shot's end frame, there's an apparent contradiction. The decision is     
       to document this as intentional behavior (the continuity system operates at the image level, not the asset level).

       Implementation Steps

       Step 1: Add info tooltip to ShotAssetPanel

       In C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\src\components\pipeline\Stage9\ShotAssetPanel.tsx:

       The component needs new props to know whether this shot has start_continuity: 'match'.

       Update interface:
       interface ShotAssetPanelProps {
         projectId: string;
         sceneId: string;
         shotId: string;
         shotLabel: string;
         assignments: ShotAssetAssignment[];
         sceneAssets: SceneAssetInstance[];
         onAssignmentsChanged: () => void;
         startContinuity?: ContinuityMode; // NEW
       }

       Add the tooltip after the existing "Passes Through" warning (line 191-198). Show it when startContinuity === 'match' and there      
       are enters assignments:

       import { Info } from 'lucide-react';
       import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

       // After the passes_through warning block:
       {startContinuity === 'match' && assignments.some(a => a.presence_type === 'enters') && (
         <TooltipProvider>
           <Tooltip>
             <TooltipTrigger asChild>
               <div className="flex items-start gap-1.5 p-2 rounded-md bg-blue-500/10 text-blue-400 text-[10px] cursor-help">
                 <Info className="w-3 h-3 shrink-0 mt-0.5" />
                 <span>
                   This shot uses &ldquo;Match&rdquo; continuity. Assets marked &ldquo;Enters&rdquo; may already appear via the copied     
       start frame.
                 </span>
               </div>
             </TooltipTrigger>
             <TooltipContent side="top" className="max-w-xs text-xs">
               Continuity operates at the image level: the previous shot&apos;s end frame is copied as-is.
               &ldquo;Enters&rdquo; means this asset&apos;s reference image won&apos;t be in the start frame manifest,
               but the asset may still be visible from the copied frame. This is intentional.
             </TooltipContent>
           </Tooltip>
         </TooltipProvider>
       )}

       Step 2: Pass startContinuity from Stage9PromptSegmentation

       In C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\src\components\pipeline\Stage9PromptSegmentation.tsx at line 630-638, add    
        the prop:

       <ShotAssetPanel
         projectId={projectId}
         sceneId={sceneId}
         shotId={promptSet.shotUuid}
         shotLabel={promptSet.shotId}
         assignments={assignmentsByShot[promptSet.shotUuid] || []}
         sceneAssets={sceneAssets}
         onAssignmentsChanged={() => setAssignmentsVersion(v => v + 1)}
         startContinuity={promptSet.startContinuity}  // NEW
       />

       Step 3: Add comment block in continuity detection code

       In C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend\src\services\promptGenerationService.ts, add a documentation
       comment above the determineContinuityLink() method (line 553):

       /**
        * DESIGN NOTE on continuity vs. presence_type interaction:
        *
        * The continuity system (match/camera_change) operates at the IMAGE level.
        * When start_continuity is 'match', the previous shot's end frame is pixel-copied
        * as this shot's start frame. This means:
        *
        * - An asset with presence_type 'enters' may already be VISIBLE in the start frame
        *   (from the copied end frame), even though its reference image is NOT included
        *   in the start frame manifest. This is intentional.
        *
        * - 'enters' means "this asset's reference image is excluded from start frame generation"
        *   NOT "this asset is guaranteed invisible in the start frame."
        *
        * This behavior is by design: continuity overrides presence semantics at the pixel level.
        */

       Step 4: Tests

       No new logic is being added, so no unit tests required. The tooltip is UI-only. If desired, a simple RTL snapshot test for
       ShotAssetPanel showing the tooltip when startContinuity='match' and an enters assignment exists would be appropriate but
       optional.

       ---
       Phase 5 (Section 6): Bulk Presence-Type Templates

       Complexity: MEDIUM | Risk: LOW

       Problem

       Users must configure each asset's presence_type individually per shot. Scene-level templates would let them bulk-apply common       
       patterns.

       Implementation Steps

       Step 1: Create BulkPresenceTemplates.tsx component

       New file: C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\src\components\pipeline\Stage9\BulkPresenceTemplates.tsx

       interface BulkPresenceTemplatesProps {
         projectId: string;
         sceneId: string;
         shots: Array<{ id: string; shotId: string; charactersForeground?: string[]; charactersBackground?: string[] }>;
         sceneAssets: SceneAssetInstance[];
         onApplied: () => void;
       }

       type TemplateType = 'all_throughout' | 'match_shot_characters' | 'locations_throughout_characters_custom';

       Template logic (all frontend, using existing shotAssetAssignmentService.createAssignments() and deleteAssignment()):

       Template 1: "All Throughout" -- For every (shot, asset) pair, create assignment with presence_type: 'throughout'. This is
       equivalent to the current auto-populate behavior. Implementation: Delete all existing assignments for the scene, then call
       shotAssetAssignmentService.autoPopulate().

       Template 2: "Match Shot Characters" -- Uses the same fuzzyNameMatch utility from Phase 3 (shotAssetMatcher.ts). For each shot:      
       - Character assets: match against charactersForeground/charactersBackground. If in foreground, assign throughout. If only in        
       background, assign throughout (but could optionally use enters/exits in v2).
       - Location assets: assign throughout to all shots (locations don't change per-shot typically).
       - Props: leave unassigned (user customizes).

       Template 3: "Locations Throughout, Characters Custom" -- Locations get throughout for all shots. Characters and props are
       unassigned.

       UI: A Select dropdown with the three template options plus a "Custom" option (current state). An "Apply Template" button
       triggers the bulk operation.

       The component needs a confirmation dialog before applying since it replaces all existing assignments:

       <AlertDialog>
         <AlertDialogContent>
           <AlertDialogHeader>
             <AlertDialogTitle>Apply Template?</AlertDialogTitle>
             <AlertDialogDescription>
               This will replace all existing shot assignments for this scene.
             </AlertDialogDescription>
           </AlertDialogHeader>
           <AlertDialogFooter>
             <AlertDialogCancel>Cancel</AlertDialogCancel>
             <AlertDialogAction onClick={handleApplyTemplate}>Apply</AlertDialogAction>
           </AlertDialogFooter>
         </AlertDialogContent>
       </AlertDialog>

       Step 2: Add bulk delete method to frontend service

       In C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\src\lib\services\shotAssetAssignmentService.ts, add:

       /** Delete all assignments for a scene (used by bulk templates) */
       async deleteAllForScene(projectId: string, sceneId: string): Promise<void> {
         const assignments = await this.listForScene(projectId, sceneId);
         await Promise.all(
           assignments.map(a => this.deleteAssignment(projectId, sceneId, a.id))
         );
       }

       Alternatively, add a backend bulk-delete endpoint if the number of assignments could be large. The existing backend service
       doesn't have a deleteAllForScene method, so:

       Option A (simpler, frontend-only): Delete one by one as shown above. Fine for scenes with <50 shots x <20 assets = <1000
       assignments.

       Option B (better for performance): Add a backend endpoint DELETE /api/projects/:projectId/scenes/:sceneId/shot-assignments/all      
       that runs a single SQL delete. This is the recommended approach.

       Backend addition in C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend\src\routes\shotAssignments.ts:

       router.delete('/:projectId/scenes/:sceneId/shot-assignments/all', async (req, res) => {
         // Verify ownership, then delete all assignments for shots in this scene
       });

       And in C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend\src\services\shotAssetAssignmentService.ts:

       async deleteAllForScene(sceneId: string): Promise<number> {
         const { data: shots } = await supabase.from('shots').select('id').eq('scene_id', sceneId);
         if (!shots?.length) return 0;
         const { data, error } = await supabase
           .from('shot_asset_assignments')
           .delete()
           .in('shot_id', shots.map(s => s.id))
           .select('id');
         if (error) throw new Error(`Failed to delete all assignments: ${error.message}`);
         return data?.length || 0;
       }

       Step 3: Integrate into Stage9PromptSegmentation

       In C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\src\components\pipeline\Stage9PromptSegmentation.tsx, add the template       
       selector in the header area (around line 410-448), next to the "Generate All Prompts" button:

       import { BulkPresenceTemplates } from './Stage9/BulkPresenceTemplates';

       // In the header div:
       <BulkPresenceTemplates
         projectId={projectId}
         sceneId={sceneId}
         shots={promptSets.map(ps => ({
           id: ps.shotUuid!,
           shotId: ps.shotId,
           charactersForeground: /* need to get from shot data */,
           charactersBackground: /* need to get from shot data */,
         }))}
         sceneAssets={sceneAssets}
         onApplied={() => setAssignmentsVersion(v => v + 1)}
       />

       Note: The promptSets don't currently carry charactersForeground/charactersBackground. These would need to be fetched alongside      
       prompt data or stored in state. The shot context info is available in the API response from generate-prompts but not currently      
       stored in PromptSet. Two options:

       1. Fetch shots separately for the template component
       2. Extend the prompts API response to include character arrays (they're already fetched in the route)

       Option 2 is cleaner: in projects.ts at lines 2400-2418, add charactersForeground and charactersBackground to the response
       mapping.

       Step 4: Tests

       - Unit test the template application logic (which assets get assigned to which shots)
       - Test the "Match Shot Characters" template with the fuzzy matcher
       - Backend test for deleteAllForScene() if backend route is added

       ---
       Phase 6 (Section 3): Shot Splitting for passes_through

       Complexity: HIGH | Risk: MEDIUM

       Problem

       When a user selects passes_through for an asset, there's no mechanism to split the shot into sub-shots to properly handle the       
       transient appearance. The existing shotSplitService.ts already handles LLM-based shot splitting for Stage 7, but it doesn't know    
        about asset assignments.

       Key Discovery

       The codebase already has a full shot split implementation:
       - C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend\src\services\shotSplitService.ts -- LLM-based split into 2 shots      
       - C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend\src\routes\projects.ts lines 1370-1442 -- Route that handles
       delete original + renumber + insert new shots

       The missing piece: The existing split route does NOT clone shot_asset_assignments to the new sub-shots. When the original shot      
       is deleted (line 1396-1400), the ON DELETE CASCADE on shot_asset_assignments.shot_id deletes all assignments.

       Implementation Steps

       Step 1: Extend the split route to clone assignments

       In C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend\src\routes\projects.ts, in the split handler (line 1370-1442):       

       After inserting the new shots (line 1428-1431), before res.json, add assignment cloning logic. But there's a sequencing problem:    
        the original shot's assignments are deleted by CASCADE when we delete the original shot. So we need to:

       1. Read assignments BEFORE deleting the original shot
       2. Delete original shot (cascade deletes assignments)
       3. Insert new shots
       4. Clone the saved assignments to all new sub-shots

       // BEFORE deleting original shot:
       const originalAssignments = await shotAssetAssignmentService.getAssignmentsForShot(shotId);

       // After inserting new shots:
       if (originalAssignments.length > 0 && insertedShots?.length) {
         const cloneRows: { shotId: string; instanceId: string; presenceType: PresenceType }[] = [];
         for (const newShot of insertedShots) {
           for (const assignment of originalAssignments) {
             cloneRows.push({
               shotId: newShot.id,
               instanceId: assignment.scene_asset_instance_id,
               presenceType: assignment.presence_type as PresenceType,
             });
           }
         }
         await shotAssetAssignmentService.bulkCreateAssignments(cloneRows);
       }

       For the passes_through case specifically: When a split is triggered from the asset panel (Stage 9) for a passes_through asset,      
       the user guidance should suggest splitting around the transient asset. The LLM prompt in shotSplitService.ts would receive
       guidance like: "Split this shot so that [AssetName] passes through in the middle sub-shot."

       Step 2: Modify split to support 3-way splitting for passes_through

       The existing ShotSplitService splits into exactly 2 shots. For passes_through, we need 3 sub-shots: before-entry,
       during-presence, after-exit.

       Option A: Modify ShotSplitService.splitShot() to accept a splitCount parameter (2 or 3). When 3, the LLM prompt asks for three      
       shots.

       Option B: Call the 2-way split twice (split original into A+B, then split B into B1+B2). This is more complex and error-prone.      

       Recommended: Option A. Add to shotSplitService.ts:

       async splitShot(
         originalShot: OriginalShotRow,
         userGuidance?: string,
         splitCount: 2 | 3 = 2  // NEW parameter
       ): Promise<ShotForInsert[]>

       Update the system prompt to handle 3-way split when splitCount === 3. The shot IDs become {originalShotId}-1,
       {originalShotId}-2, {originalShotId}-3.

       Step 3: Add "Split Shot" button to ShotAssetPanel

       In C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\src\components\pipeline\Stage9\ShotAssetPanel.tsx, add a button that
       appears when passes_through is selected:

       {assignment.presence_type === 'passes_through' && (
         <Button
           variant="outline"
           size="sm"
           className="h-6 text-[10px] px-2 ml-1"
           onClick={() => handleSplitForPassThrough(assignment)}
         >
           <Scissors className="w-3 h-3 mr-1" />
           Split Shot
         </Button>
       )}

       The handler calls the existing split endpoint and optionally provides user guidance mentioning the asset name. Add new props to     
       ShotAssetPanelProps:
       onSplitShot?: (shotId: string, guidance: string) => Promise<void>;

       Step 4: Handle downstream invalidation

       The existing split route does NOT invalidate Stage 9+. After splitting:
       - Existing frames/videos for the original shot become orphaned (handled by CASCADE on shot deletion)
       - New sub-shots need prompts generated
       - The scene should be marked as needing regeneration

       Add shotAssetAssignmentService.invalidateStage9AndDownstream(sceneId) after the split completes.

       Step 5: Set default continuity for sub-shots

       New sub-shots from a split should default to start_continuity: 'match' for all sub-shots after the first one, since they are        
       consecutive moments from a single original shot.

       In the insert rows construction:
       const insertRows = newShotsPayload.map((shot, i) => ({
         ...existingFields,
         start_continuity: i > 0 ? 'match' : 'none',
         ai_start_continuity: i > 0 ? 'match' : 'none',
       }));

       Step 6: Tests

       - Backend test: Verify assignments are cloned to new sub-shots after split
       - Backend test: Verify 3-way split produces correct shot IDs and ordering
       - Backend test: Verify downstream stage invalidation fires
       - Frontend: Test that "Split Shot" button appears only for passes_through assignments

       ---
       Phase 7 (Section 7): Visual Timeline View

       Complexity: MEDIUM | Risk: LOW

       Problem

       No visual overview of which assets appear in which shots and with what presence type.

       Implementation Steps

       Step 1: Create ShotAssetTimeline.tsx component

       New file: C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\src\components\pipeline\Stage9\ShotAssetTimeline.tsx

       interface ShotAssetTimelineProps {
         projectId: string;
         sceneId: string;
         shots: Array<{ id: string; shotId: string; shotOrder?: number }>;
         sceneAssets: SceneAssetInstance[];
         assignments: ShotAssetAssignment[];
         onAssignmentChanged: () => void;
       }

       Layout: A matrix/grid view:
       - Columns: Shots (ordered by shot_order)
       - Rows: Assets (grouped by type: characters first, then locations, then props)
       - Cells: Color-coded by presence_type:
         - throughout = solid fill (e.g., bg-primary/30)
         - enters = gradient from transparent to filled (right half)
         - exits = gradient from filled to transparent (left half)
         - passes_through = dashed border/amber fill
         - No assignment = empty/gray

       Interaction: Clicking a cell toggles assignment or opens a presence_type selector dropdown.

       Structure:
       <div className="overflow-x-auto">
         <table className="border-collapse">
           <thead>
             <tr>
               <th className="sticky left-0 bg-background">Asset</th>
               {shots.map(shot => (
                 <th key={shot.id} className="px-2 py-1 text-xs text-center">
                   {shot.shotId}
                 </th>
               ))}
             </tr>
           </thead>
           <tbody>
             {groupedAssets.map(asset => (
               <tr key={asset.id}>
                 <td className="sticky left-0 bg-background">
                   <AssetRowLabel asset={asset} />
                 </td>
                 {shots.map(shot => (
                   <TimelineCell
                     key={`${asset.id}-${shot.id}`}
                     assignment={findAssignment(shot.id, asset.id)}
                     onToggle={() => handleToggleAssignment(shot.id, asset.id)}
                     onChangePresence={(type) => handleChangePresence(shot.id, asset.id, type)}
                   />
                 ))}
               </tr>
             ))}
           </tbody>
         </table>
       </div>

       Color scheme for cells:
       const PRESENCE_COLORS: Record<PresenceType | 'none', string> = {
         throughout: 'bg-blue-500/30 border-blue-500/50',
         enters: 'bg-green-500/20 border-green-500/40',
         exits: 'bg-red-500/20 border-red-500/40',
         passes_through: 'bg-amber-500/15 border-amber-500/30 border-dashed',
         none: 'bg-muted/5 border-border/20',
       };

       Each cell should be small (e.g., 40x32px) with a tooltip showing the full presence type label on hover.

       Step 2: Add view toggle to Stage9PromptSegmentation

       In C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\src\components\pipeline\Stage9PromptSegmentation.tsx, add a toggle
       between "Card View" (current) and "Timeline View" (new):

       const [viewMode, setViewMode] = useState<'cards' | 'timeline'>('cards');

       // In the header:
       <div className="flex gap-1 border rounded-md">
         <Button
           variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
           size="icon"
           onClick={() => setViewMode('cards')}
           className="h-7 w-7"
         >
           <List className="h-3.5 w-3.5" />
         </Button>
         <Button
           variant={viewMode === 'timeline' ? 'secondary' : 'ghost'}
           size="icon"
           onClick={() => setViewMode('timeline')}
           className="h-7 w-7"
         >
           <Grid3x3 className="h-3.5 w-3.5" />
         </Button>
       </div>

       Conditionally render:
       {viewMode === 'timeline' ? (
         <ShotAssetTimeline
           projectId={projectId}
           sceneId={sceneId}
           shots={promptSets.map(ps => ({ id: ps.shotUuid!, shotId: ps.shotId }))}
           sceneAssets={sceneAssets}
           assignments={shotAssignments}
           onAssignmentChanged={() => setAssignmentsVersion(v => v + 1)}
         />
       ) : (
         /* existing card view */
       )}

       Step 3: Make cells interactive

       Each cell in the timeline supports:
       - Click to cycle: none -> throughout -> enters -> exits -> passes_through -> none
       - Right-click or long-press for a dropdown with all options
       - Visual feedback during async updates (loading spinner in cell)

       Implementation uses the existing shotAssetAssignmentService.createAssignments(), updateAssignment(), and deleteAssignment()
       methods.

       Step 4: Legend

       Add a small legend below the timeline showing the color mapping:

       <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground">
         <span className="flex items-center gap-1">
           <div className="w-3 h-3 rounded bg-blue-500/30 border border-blue-500/50" /> Throughout
         </span>
         <span className="flex items-center gap-1">
           <div className="w-3 h-3 rounded bg-green-500/20 border border-green-500/40" /> Enters
         </span>
         <span className="flex items-center gap-1">
           <div className="w-3 h-3 rounded bg-red-500/20 border border-red-500/40" /> Exits
         </span>
         <span className="flex items-center gap-1">
           <div className="w-3 h-3 rounded bg-amber-500/15 border border-amber-500/30 border-dashed" /> Passes Through
         </span>
       </div>

       Step 5: Tests

       - Test that the timeline grid renders the correct number of cells (shots x assets)
       - Test that clicking a cell creates/updates/deletes assignments correctly
       - Test that the legend renders all 4 presence types

       ---
       Dependency Graph and Implementation Order

       Phase 2 (Section 2) -----> Independent, no dependencies
       Phase 3 (Section 4) -----> Independent, no dependencies
       Phase 4 (Section 5) -----> Depends on Phase 2 conceptually (trait anchoring aids continuity understanding)
       Phase 5 (Section 6) -----> Depends on Phase 3 (reuses shotAssetMatcher for "Match Shot Characters" template)
       Phase 6 (Section 3) -----> Depends on understanding of existing split infra; no code dependency on Phases 2-5
       Phase 7 (Section 7) -----> Independent (but benefits from all assignment data being richer)

       Recommended implementation order: Phases 2 and 3 can be done in parallel. Phase 4 is trivial and can be done anytime. Phase 5       
       depends on Phase 3's matcher utility. Phase 6 is independent but complex. Phase 7 can be done anytime after the basic assignment    
        system is stable.

       ---
       Summary Table







       ┌───────┬──────────┬────────────┬─────────┬────────────────────┬───────────────┬─────────────────┬──────────────────────────────    
       ────┐
       │ Phase │ Section  │ Complexity │  Risk   │  Backend Changes   │   Frontend    │    New Files    │              Tests
           │
       │       │          │            │         │                    │    Changes    │                 │
           │
       ├───────┼──────────┼────────────┼─────────┼────────────────────┼───────────────┼─────────────────┼──────────────────────────────    
       ────┤
       │ 2     │ Section  │ LOW        │ LOW     │ 1 file             │ 0             │ 0               │ extractTraitSummary unit
       tests   │
       │       │ 2        │            │         │                    │               │                 │
           │
       ├───────┼──────────┼────────────┼─────────┼────────────────────┼───────────────┼─────────────────┼──────────────────────────────    
       ────┤
       │ 3     │ Section  │ MEDIUM     │ LOW     │ 0                  │ 1 file        │ 1 new utility   │ shotAssetMatcher unit tests      
           │
       │       │ 4        │            │         │                    │ modified      │ file            │
           │
       ├───────┼──────────┼────────────┼─────────┼────────────────────┼───────────────┼─────────────────┼──────────────────────────────    
       ────┤
       │ 4     │ Section  │ LOW        │ VERY    │ 1 file (comments   │ 2 files       │ 0               │ Optional tooltip snapshot        
           │
       │       │ 5        │            │ LOW     │ only)              │ modified      │                 │
           │
       ├───────┼──────────┼────────────┼─────────┼────────────────────┼───────────────┼─────────────────┼──────────────────────────────    
       ────┤
       │ 5     │ Section  │ MEDIUM     │ LOW     │ 2 files            │ 2 files       │ 1 new component │ Template logic + backend
       delete  │
       │       │ 6        │            │         │                    │ modified      │                 │ test
           │
       ├───────┼──────────┼────────────┼─────────┼────────────────────┼───────────────┼─────────────────┼──────────────────────────────    
       ────┤
       │ 6     │ Section  │ HIGH       │ MEDIUM  │ 2 files            │ 1 file        │ 0               │ Assignment cloning + 3-way       
       split │
       │       │ 3        │            │         │                    │ modified      │                 │  tests
           │
       ├───────┼──────────┼────────────┼─────────┼────────────────────┼───────────────┼─────────────────┼──────────────────────────────    
       ────┤
       │ 7     │ Section  │ MEDIUM     │ LOW     │ 0                  │ 1 file        │ 1 new component │ Grid rendering + interaction     
           │
       │       │ 7        │            │         │                    │ modified      │                 │ tests
           │
       └───────┴──────────┴────────────┴─────────┴────────────────────┴───────────────┴─────────────────┴──────────────────────────────    
       ────┘












       ---
       Critical Files for Implementation

       - C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend\src\services\promptGenerationService.ts - Core modification target    
        for Phase 2 (trait anchoring in buildNumberedImageManifest() and frame prompt system prompt)
       - C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\src\components\pipeline\AssetDrawer.tsx - Phase 3 modification target
       (replace "all shots checked" with heuristic matching in startShotChecklist())
       - C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\src\components\pipeline\Stage9\ShotAssetPanel.tsx - Phases 4 and 6
       modification target (continuity tooltip, split shot button)
       - C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend\src\routes\projects.ts - Phase 6 modification target (extend split    
        route to clone assignments, set default continuity)
       - C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\src\components\pipeline\Stage9PromptSegmentation.tsx - Phases 5 and 7
       integration point (template selector, timeline view toggle)
  ⎿  Done (46 tool uses · 102.9k tokens · 5m 10s)


 Ready to code?

 Here is Claude's plan:
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌ Shot Asset Assignment System — Part 2 Implementation Plan

 Context

 Part 1 (core system: data model, routes, prompt/frame generation rework, Stage 8/9 UI) is stable and tested (46 unit tests + Playwright   
 E2E pass). Part 2 adds 6 enhancements in order of priority.

 ---
 Phase 2 (§2): Character-to-Reference Image Mapping Accuracy

 Goal: Enhance manifest lines from Image #1: Alice (character) to Image #1: Alice (character) — red-haired woman in blue dress, mid-20s    

 Files to modify:
 - backend/src/services/promptGenerationService.ts

 Steps:
 1. Add extractTraitSummary(description, maxLen=80) utility — extract first sentence/clause from effective_description, truncate at word   
 boundary
 2. Modify buildNumberedImageManifest() (line 148-185) — build manifest lines inside the loop instead of mapping afterward, append —       
 {traitSummary} to each line
 3. buildFrameReferenceManifests() auto-inherits the change (delegates to buildNumberedImageManifest)
 4. Add LLM instruction to frame prompt system prompt (line 698): "When reference images are listed, ANCHOR each character to their        
 reference image using the trait summary (e.g., 'the red-haired woman from Image #1')."
 5. Test: Add extractTraitSummary tests to backend/src/tests/promptGeneration.test.ts + update existing manifest format tests

 ---
 Phase 3 (§4): Heuristic Shot Assignments

 Goal: Pre-check only matching shots in Asset Drawer checklist (instead of all shots)

 Files to modify/create:
 - NEW: src/lib/utils/shotAssetMatcher.ts — pure utility
 - src/components/pipeline/AssetDrawer.tsx — use matcher in startShotChecklist()

 Steps:
 1. Create shotAssetMatcher.ts with matchAssetToShots(asset, shots):
   - Characters: fuzzy match asset.name against shot.charactersForeground + charactersBackground
   - Locations: fuzzy match against shot.setting
   - Props: fuzzy match against shot.action
   - Returns { shotId, matched, confidence, matchReason }[]
 2. Modify AssetDrawer.tsx startShotChecklist() (line 112-121): replace shots.map(s => s.id) with only matched shot IDs. Fallback to all   
 if no matches found.
 3. Add shotMatchResults state, show "Suggested" badge next to heuristically matched shots in checklist UI
 4. Test: src/lib/utils/__tests__/shotAssetMatcher.test.ts — character/location/prop matching, fuzzy matching, edge cases

 ---
 Phase 4 (§5): Presence-Type Aware Continuity (Documentation)

 Goal: Document that enters means "reference image excluded from start frame" not "asset invisible in start frame"

 Files to modify:
 - src/components/pipeline/Stage9/ShotAssetPanel.tsx — add info banner
 - src/components/pipeline/Stage9PromptSegmentation.tsx — pass startContinuity prop
 - backend/src/services/promptGenerationService.ts — add design comment

 Steps:
 1. Add startContinuity?: ContinuityMode prop to ShotAssetPanelProps
 2. Show info banner (blue, with Info icon) when startContinuity === 'match' AND any assignment has presence_type === 'enters'
 3. Pass promptSet.startContinuity from Stage9PromptSegmentation to ShotAssetPanel
 4. Add DESIGN NOTE comment above determineContinuityLink() in backend service
 5. Test: No new logic — optional RTL snapshot test

 ---
 Phase 5 (§6): Bulk Presence-Type Templates

 Goal: Scene-level templates for common assignment patterns

 Files to modify/create:
 - NEW: src/components/pipeline/Stage9/BulkPresenceTemplates.tsx
 - src/components/pipeline/Stage9PromptSegmentation.tsx — integrate selector
 - backend/src/services/shotAssetAssignmentService.ts — add deleteAllForScene()
 - backend/src/routes/shotAssignments.ts — add DELETE .../all endpoint
 - src/lib/services/shotAssetAssignmentService.ts — add deleteAllForScene() frontend method

 Templates:

 ┌───────────────────────┬─────────────────────────────────────────────────────────────────────────────────┐
 │       Template        │                                      Logic                                      │
 ├───────────────────────┼─────────────────────────────────────────────────────────────────────────────────┤
 │ All Throughout        │ Delete all, then auto-populate (every asset × every shot = throughout)          │
 ├───────────────────────┼─────────────────────────────────────────────────────────────────────────────────┤
 │ Match Shot Characters │ Characters matched via shotAssetMatcher, locations throughout, props unassigned │
 ├───────────────────────┼─────────────────────────────────────────────────────────────────────────────────┤
 │ Locations Throughout  │ Locations throughout all shots, characters/props unassigned                     │
 └───────────────────────┴─────────────────────────────────────────────────────────────────────────────────┘

 Steps:
 1. Add backend deleteAllForScene(sceneId) method + route
 2. Add frontend deleteAllForScene() service method
 3. Create BulkPresenceTemplates.tsx — dropdown + "Apply" button + confirmation dialog
 4. Reuse matchAssetToShots() from Phase 3 for "Match Shot Characters" template
 5. Integrate into Stage9PromptSegmentation header area
 6. Test: Backend test for deleteAllForScene, frontend test for template logic

 ---
 Phase 6 (§3): Shot Splitting for passes_through

 Goal: "Split Shot" button when passes_through is selected, producing 2-3 sub-shots

 Files to modify:
 - backend/src/routes/projects.ts — extend split handler to clone assignments
 - backend/src/services/shotSplitService.ts — support splitCount: 2 | 3
 - src/components/pipeline/Stage9/ShotAssetPanel.tsx — add Split Shot button

 Steps:
 1. Read existing assignments BEFORE deleting original shot in split route (they cascade-delete)
 2. Clone saved assignments to all new sub-shots after insertion
 3. Set start_continuity: 'match' for sub-shots after the first
 4. Add splitCount parameter to ShotSplitService.splitShot(), update LLM prompt for 3-way split
 5. Add "Split Shot" button (with Scissors icon) next to passes_through assignments
 6. Fire invalidateStage9AndDownstream(sceneId) after split
 7. Test: Assignment cloning, 3-way split output, downstream invalidation

 ---
 Phase 7 (§7): Visual Timeline View

 Goal: Matrix view — shots as columns, assets as rows, color-coded presence cells

 Files to create/modify:
 - NEW: src/components/pipeline/Stage9/ShotAssetTimeline.tsx
 - src/components/pipeline/Stage9PromptSegmentation.tsx — add Cards/Timeline toggle

 Steps:
 1. Create ShotAssetTimeline.tsx — horizontally scrollable table, sticky asset column
 2. Color scheme: blue=throughout, green=enters, red=exits, amber-dashed=passes_through, gray=none
 3. Click cell to cycle presence type, uses existing service methods
 4. Add legend below timeline
 5. Add viewMode state + toggle buttons (List/Grid3x3 icons) in Stage9 header
 6. Conditionally render timeline vs card view
 7. Test: Grid renders correct cells, click interaction creates/updates assignments

 ---
 Verification Strategy

 After each phase:
 1. npm run lint from project root
 2. npm test from project root (frontend tests)
 3. cd backend && npm test (backend tests)
 4. Playwright E2E: reuse/extend existing test-shot-assets.js for visual verification
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌