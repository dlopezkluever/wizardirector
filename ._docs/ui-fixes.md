## The identified issues:

  1. Change Type is unreachable for image-selected assets (Critical UX gap)

  File: Stage5Assets.tsx:1116
  The condition !isStageLockedOrOutdated && !asset.locked means Change Type is hidden whenever asset.locked === true. But asset.locked becomes true once the user selects/approves an image (green "Selected" badge). This means:
  - Change Type is practically inaccessible for any asset that has gone through the normal workflow (extract -> generate image -> select image)
  - The user would need to deselect the image, change type, then re-select — but there's no "deselect image" action
  - Recommendation: Change the guard to only check isStageLockedOrOutdated, not asset.locked. The type change should clear the selected image and prompt regeneration, OR allow type change and keep the image.

  2. Merge is also blocked by asset.locked (Critical UX gap)

  File: Stage5Assets.tsx:1063,1071
  Same issue: checkboxes are disabled={asset.locked} and card onClick is gated by !asset.locked. This means you cannot select any image-approved asset for merge. The Merge feature is dead-on-arrival for the standard workflow.
  - Recommendation: Allow selection of locked assets in select mode. The merge operation itself should handle locked status (e.g., keep the survivor's image, warn that absorbed images will be lost).

  4. Merge button doesn't appear in floating bar until selections are made

  The floating action bar with Merge/Split only appears when selectedAssetIds.size > 0. Since no assets can be selected (issue #2), the Merge button never appears. Even if it could, users might not know it exists.
  - Recommendation: Show the floating bar always in select mode (with Merge/Split greyed out and tooltips) so users know what's available.


  6. Stage 5 asset descriptions are truncated with no expand

  Asset descriptions show ~2 lines with ... truncation. There's no way to see the full description without clicking "Edit Details."
  - Recommendation: Add a "Show more" toggle or make the description expand on click. This helps users compare descriptions before deciding to merge.

  
   7. Stage 6 (Script Hub) — many scenes show "Risky" badge

  Almost all scenes (except 01) display an amber "Risky" warning badge. This could cause alarm fatigue.

  - Recommendation: Add a tooltip or info icon explaining what "Risky" means (e.g., "Scene has upstream changes that may affect downstream stages"). Consider a less alarming color for informational warnings vs. actual errors.

  User: lets fix it but not like you say to, give me other recommednations cause indeed the risky alarms are anoying and need to be made less promminent.
 
  12. Stage 5 — "Lock All Assets & Begin Production" label is misleading

  The bottom CTA says "Lock All Assets & Begin Production" but it locks the stage, not begins production (production requires all stages to be complete). Users may expect clicking this starts rendering.
  - Recommendation: Change to "Lock Assets & Proceed" or "Finalize Assets" to better set expectations.

## P.S: Possible questions that I anwsered previously that may be enlightning if the concerns come up again: *(anwsers after the  →)*

· Issue #1: Change Type submenu doesn't exist in the current codebase — it was in the plan but never implemented. Should I implement it as part of this ticket, or skip it? → 

      if you understand exactly what is required,
     Implement it now:
          Add the full Change Type submenu per the original plan (dropdown with
          character/prop/location/extra_archetype options) .. but ask questions if not
     
     · Issue #6: Description truncation exists (line-clamp-3), but there IS already an expand path via the 3-dot menu → 'Edit Details'. The real problem is discoverability. How should we handle this? → Add inline 'Show more'
    
    · Issue #7: The 'Risky' badge is currently amber ⚠ text at 10px. The user note says 'make less prominent.' Which approach? → Subtle dot + tooltip
    
     · Issue #12: What should the Stage 5 completion button say instead of 'Lock All Assets & Begin Production'? → Finalize Assets

## My recent quesitons:

User answered Claude's questions:
  ⎿  · Issue #1: The Change Type submenu EXISTS now but is still gated by 
     `!asset.locked`, so it's hidden once a user approves an image. The   
     backend also blocks asset_type changes on locked assets. Should I    
     remove both gates so Change Type works on image-approved (locked)    
     assets? → Yes, unlock both (Recommended)
     · Issue #2 & #4: Merge selection is blocked for locked assets, and   
     the floating bar is hidden when 0 are selected. The previous plan was      to allow locked assets to be selectable for merge AND always show   
     the floating bar in select mode. Still want both fixes? → Yes, fix   
     both (Recommended)


     · Issues #6, #7, #12 are straightforward. Add inline 'Show more/less'      for truncated descriptions, replace Risky ⚠ text with subtle dot +  
     tooltip, and rename button to 'Finalize Assets'. All still good? →   
     Yes, do all three (Recommended)



  ---
  Implementation Plan — 6 UI Fixes

  Issue #1: Make Change Type accessible on locked assets

  Files: Stage5Assets.tsx:1117, backend/src/routes/projectAssets.ts:585   

  - Frontend: Line 1117 — change !isStageLockedOrOutdated && !asset.locked   → !isStageLockedOrOutdated
  - Backend: Line 585 — update lock guard to allow asset_type changes     
  alongside deferred:
  const isAllowedWhenLocked = (deferred !== undefined || asset_type !==   
  undefined) &&
    name === undefined && description === undefined && image_prompt ===   
  undefined;

  Issue #2: Allow locked assets to be selected for merge

  File: Stage5Assets.tsx:1064, 1072

  - Line 1064: Remove && !asset.locked from card onClick
  - Line 1072: Remove disabled={asset.locked} (or set disabled={false})   

  Issue #4: Always show floating bar in select mode

  File: Stage5Assets.tsx:1504, 1508-1509

  - Line 1504: Remove selectedAssetIds.size > 0 && from condition
  - Lines 1508-1509: Show "Select assets to merge or split" hint when 0   
  selected

  Issue #6: Inline "Show more/less" for truncated descriptions

  File: Stage5Assets.tsx:1207-1209 + new state

  - Add expandedDescriptions state (Set<string>)
  - Replace static line-clamp-3 <p> with conditional clamp + "Show        
  more/less" button for descriptions >120 chars

  Issue #7: Subtle Risky badge with tooltip

  File: Stage6ScriptHub.tsx:1-28, 322-326

  - Add Tooltip imports
  - Replace ⚠ Risky text with a small colored dot (w-2 h-2 rounded-full)  
  wrapped in a <Tooltip> showing explanation on hover
  - Add <TooltipProvider> around the scene list

  Issue #12: Rename button to "Finalize Assets"

  File: Stage5Assets.tsx:1464

  - Change "Lock All Assets & Begin Production" → "Finalize Assets"       

  ---
  Shall I proceed with implementing all 6 fixes?
  Yes

  ## **Implementation Summary**

  All 18 tests pass, including the updated one. The image-generation test 
  failures are pre-existing and unrelated.

  Here's a summary of all changes made:

  Changes Made

  Stage5Assets.tsx (5 fixes):
  1. Issue #1 — Line 1117: Removed && !asset.locked from Change Type      
  submenu guard → now accessible on image-approved assets
  2. Issue #2 — Line 1064: Removed && !asset.locked from card onClick;    
  Line 1072: Changed disabled={asset.locked} to disabled={false} → locked 
  assets are now selectable for merge
  3. Issue #4 — Line 1504: Removed selectedAssetIds.size > 0 && → floating   bar shows immediately in select mode with hint text
  4. Issue #6 — Added expandedDescriptions state + inline "Show more/less"   toggle for descriptions >120 chars
  5. Issue #12 — Changed button text from "Lock All Assets & Begin        
  Production" to "Finalize Assets"

  Stage6ScriptHub.tsx (Issue #7):
  - Added Tooltip imports
  - Replaced amber ⚠ Risky text with a subtle 2×2px colored dot (amber    
  for risky, destructive for broken) with explanatory tooltip on hover    

  backend/src/routes/projectAssets.ts (Issue #1 backend):
  - Updated lock guard to allow asset_type changes on locked assets       
  (alongside deferred)

  backend/src/tests/assetTypeAndMerge.test.ts:
  - Updated test to match new behavior (asset_type changes on locked      
  assets now succeed)