  Playwright Test Results Summary

  Working correctly:
  - Login flow (auth -> dashboard redirect)
  - Stage 8: "Convert to Transformation..." context menu - renders properly with type badges, thumbnails, base asset picker, Next/Cancel
  - Stage 8: "Remove from scene" context menu
  - Stage 5: Select mode enters/exits properly, checkboxes render
  - Stage 5: Context menu shows correct items (Edit Details, Defer Asset, Manage Angles, Promote to Global Library, Remove Asset)
  - Stage 5: Deferred Assets collapsible section
  - All stages render without errors

  Issues discovered:

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

  3. Select mode checkboxes lack visual feedback for disabled state

  When entering Select mode, the radio circles appear next to both assets but look clickable (same opacity). There's no visual cue that they're disabled due to asset.locked. Users will click repeatedly thinking the UI is broken.
  - Recommendation: Add a tooltip on disabled checkboxes explaining "Asset is image-locked. Deselect image to enable selection." Or better, fix issue #2 to allow selection.

  4. Merge button doesn't appear in floating bar until selections are made

  The floating action bar with Merge/Split only appears when selectedAssetIds.size > 0. Since no assets can be selected (issue #2), the Merge button never appears. Even if it could, users might not know it exists.
  - Recommendation: Show the floating bar always in select mode (with Merge/Split greyed out and tooltips) so users know what's available.

  5. Convert to Transformation dialog — radio option text is empty

  The Playwright test reported Option 0: and Option 1: as empty text for the radio buttons. Visually the dialog looks fine (thumbnails + names + type badges render), but the radio textContent() is empty, suggesting the text is in nested        
  elements that don't flow as plain text. This is an accessibility concern.
  - Recommendation: Add aria-label to each radio option with the asset name for screen reader support.

  6. Stage 5 asset descriptions are truncated with no expand

  Asset descriptions show ~2 lines with ... truncation. There's no way to see the full description without clicking "Edit Details."
  - Recommendation: Add a "Show more" toggle or make the description expand on click. This helps users compare descriptions before deciding to merge.

  7. Stage 6 (Script Hub) — many scenes show "Risky" badge

  Almost all scenes (except 01) display an amber "Risky" warning badge. This could cause alarm fatigue.

  - Recommendation: Add a tooltip or info icon explaining what "Risky" means (e.g., "Scene has upstream changes that may affect downstream stages"). Consider a less alarming color for informational warnings vs. actual errors.

  User: lets fix it but not like you say to, give me other recommednations cause indeed the risky alarms are anoying and need to be made less promminent.

  8. Stage 9 (Prompts) — "No prompts" badges on all shots

  All 3 shots show "No prompts" in red. The "Generate All Prompts" button is prominently positioned but the relationship between it and the individual shot prompts isn't immediately clear.
  - Recommendation: Add a brief onboarding hint: "Click 'Generate All Prompts' to auto-fill frame and video prompts for all shots" as a dismissible banner.

  9. Stage 10 (Frames) — "No frames generated" placeholder is large and empty

  The frame generation area shows large empty placeholder boxes with small "No frame generated" text. The "Generate start Frame" button at the bottom isn't prominently visible without scrolling.
  - Recommendation: Make the placeholder clickable (clicking it triggers generation), or add a call-to-action button directly inside the empty frame area.

  10. Dashboard project cards — missing cover images

  All project cards show dark/empty backgrounds with no visual differentiation. The cards rely entirely on text titles.
  - Recommendation: Auto-generate or pull a representative frame/asset image as the card cover. Even a gradient or color based on project style would help.

  11. Stage 8 asset detail panel — clicking SPONGEBOND shows "Select an asset to edit"

  After clicking on SPONGEBOND in the scene asset list, the center panel shows "Select an asset to edit" instead of the asset's detail view. The click isn't registering as an asset selection.
  - Recommendation: Investigate whether the click handler is properly wired — the asset name text click may not propagate to the parent clickable area. The entire asset row should be clickable.

  12. Stage 5 — "Lock All Assets & Begin Production" label is misleading

  The bottom CTA says "Lock All Assets & Begin Production" but it locks the stage, not begins production (production requires all stages to be complete). Users may expect clicking this starts rendering.
  - Recommendation: Change to "Lock Assets & Proceed" or "Finalize Assets" to better set expectations.