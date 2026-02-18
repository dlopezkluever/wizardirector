 Your Ideas — My Take

  1. End Frame Prompt height matching Shot Context

  Fully agree. Looking at the code, the End Frame Prompt panel (line 821-906 in Stage10) uses a fixed rows={6} textarea with space-y-3 padding, while Shot Context can grow tall with Setting + Camera + Action + Frame Prompt all stacked. The fix is straightforward — make   both bottom panels use a shared min-height or CSS grid-row: subgrid so they always align. The textarea itself should grow to fill (use flex-1 + min-h-0 instead of fixed rows).

  2. Image Carousel for generation history

  Love this. The "Gen #2" badge already tells you multiple generations exist, but there's zero way to browse them. This is a critical missing feature for a creative workflow — the user might prefer Gen #1 over Gen #2 but currently has no way to go back. I'd suggest:   
  - A small left/right arrow nav overlaid on the image (like Stage 5/8 asset components)
  - Dot indicators below showing total count + current selection
  - The approve/reject actions apply to whichever generation is currently selected
  - This requires a backend change too — right now frame.imageUrl only stores the latest. We'd need a frame_generations table or an array column to store the history.

  3. Separate AI Recommendation from User Toggle (Stage 9)

  Agree completely. Right now the badge serves double duty (AI opinion + user state) which is confusing. Here's how I'd structure it:

  Stage 9: Each shot header gets:
  - End Frame Recommended badge (read-only, always visible, based on AI analysis) — stays green/muted exactly as-is
  - A separate End Prompt: On/Off toggle next to it — defaults to ON for recommended shots, OFF otherwise. User can override.

  Stage 10: The toggle there stays as-is but syncs with whatever the user set in Stage 9.

  ---
  My Additional Suggestions

  4. "Condense Prompt" tool for Stage 9

  In your screenshot, Shot 2A's frame prompt is 1200/1000 characters — it's red, and the user has no easy fix. The warning says "Prompt too long" but offers no action. I'd add an AI-powered "Condense" button next to the character count that calls the LLM to surgically 
  trim the prompt to fit under the limit while preserving the essential visual details. One click, problem solved.

  5. Reference image hover-to-enlarge

  The refs are 32x32 pixels right now (w-8 h-8 in both Stage 9 and FramePanel). At that size you genuinely can't tell what they are. A hover popover that shows the image at ~200px with the asset name label would make them actually useful for verifying the right refs   
  are attached.

  6. Frame Prompt is redundant in Shot Context

  Look at the bottom-left "Shot Context" panel in Stage 10 — it shows Setting, Camera, Action, and the full Frame Prompt text. But the Frame Prompt is already the thing that generated the image above it. Showing it again in the context card is visual noise that makes  
  the panel taller than it needs to be. I'd remove it from Shot Context (or collapse it behind a "Show prompt" link). This would also help with issue #1 since Shot Context would be shorter.

  7. Unblock the End Frame Prompt editor while start frame is pending

  Right now when the start frame isn't approved, the entire right column shows "Approve start frame first." But the user should be able to generate/edit the end frame prompt while reviewing the start frame. Only the actual image generation button needs to be gated.    
  This lets the user prepare both prompts in parallel instead of waiting sequentially.

  8. Keyboard shortcuts for the approval workflow

  For a workflow where you're reviewing and approving many frames across many shots, mouse-clicking Approve/Reject for each one is slow. Quick keyboard shortcuts would dramatically speed this up:
  - A → Approve current frame
  - R → Reject current frame
  - ↑/↓ → Navigate between shots in the sidebar
  - Tab → Switch focus between Start/End frame

  ---
  What resonates with you? Happy to prioritize and plan out whichever subset you want to tackle.

_______________________________--

Let's do 1-3, as listed,  

Skip 4 for now, 

Do 5, 

Skip 6

Do 7, skip 8

So in summary, you are doing 1-3, 5, & 7. 


Skip 4 (in fact, we can just let it be larger) instead of 4 "condense prompt" we actually need to allow the prompt to be larger, 

  8. Keyboard shortcuts for the approval workflow

  For a workflow where you're reviewing and approving many frames across many shots, mouse-clicking Approve/Reject for each one is slow. Quick keyboard shortcuts would dramatically speed this up:
  - A → Approve current frame
  - R → Reject current frame
  - ↑/↓ → Navigate between shots in the sidebar
  - Tab → Switch focus between Start/End frame

but also take into accound








__________________________________________________________________
-
-
-
-
-
-
--
-
-

-
  Implementation Summary

  Improvement 1: End Frame Prompt height matching

  - Stage10FrameGeneration.tsx — Changed End Frame Prompt container from space-y-3 to flex flex-col h-full gap-3, made empty state   use flex flex-col flex-1 items-center justify-center, and made textarea use flex-1 min-h-[100px] instead of rows={6} so it     
  stretches to match the Shot Context panel height.

  Improvement 5: Reference image hover-to-enlarge

  - New: ReferenceImageThumbnail.tsx — Reusable component wrapping thumbnail in <HoverCard> with 200ms open delay. Shows ~200px   
  enlarged image, asset name, and type badge on hover.
  - Stage9PromptSegmentation.tsx — Replaced inline ref image markup with <ReferenceImageThumbnail>.
  - FramePanel.tsx — Same replacement.

  Improvement 7: Unblock end frame prompt editor

  - FramePanel.tsx — Added isGenerateDisabled prop that gates action buttons (Generate, Approve, Reject, Regenerate) without      
  dimming the panel. All action buttons now check isDisabled || isGenerateDisabled.
  - Stage10FrameGeneration.tsx — Changed end frame FramePanel from isDisabled to isGenerateDisabled so the panel renders normally 
  but buttons stay disabled until start frame is approved.

  Improvement 3: Separate AI recommendation from toggle

  - New: 029_ai_recommends_end_frame.sql — Migration adding ai_recommends_end_frame column (manual run required).
  - promptGenerationService.ts — Added aiRecommendsEndFrame to GeneratedPromptSet and BulkPromptGenerationResult interfaces; set
  during generation.
  - projects.ts — Saves ai_recommends_end_frame in POST generate-prompts; selects and returns it in both GET prompts and POST     
  generate-prompts responses.
  - frameGenerationService.ts — Added aiRecommendsEndFrame to ShotWithFrames interface; selects and returns it in
  fetchFramesForScene.
  - scene.ts — Added aiRecommendsEndFrame?: boolean | null to PromptSet and ShotWithFrames types.
  - Stage9PromptSegmentation.tsx — Replaced single badge with read-only "AI: End Frame" badge (blue) + separate Switch toggle with   stopPropagation and optimistic update via promptService.updatePrompt.

  Improvement 2: Image carousel for generation history

  - frames.ts (backend) — Two new endpoints: GET .../frames/:frameId/generations and PUT .../frames/:frameId/select-generation.   
  - frameService.ts — Added FrameGeneration type, fetchFrameGenerations(), and selectFrameGeneration() methods.
  - New: FrameGenerationCarousel.tsx — Embla carousel component showing all completed generations with Current badge, date badge, 
  Select overlay, and Dialog preview.
  - FramePanel.tsx — Added projectId/sceneId props; renders <FrameGenerationCarousel> when generationCount > 1.
  - Stage10FrameGeneration.tsx — Passes projectId and sceneId to both FramePanel instances.

  Verification

  - Lint: 0 new errors (only 2 pre-existing hook dep warnings in Stage9)
  - Frontend tests: 43/43 pass
  - Backend tests: All pass except 7 pre-existing failures in image-generation.test.ts (unrelated)

  Note: You need to manually run the migration backend/migrations/029_ai_recommends_end_frame.sql against your database.
