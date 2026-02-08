#### 2A.9 — Regeneration Boxes UI Improvements
**Ticket**: UI-7
**Priority**: MEDIUM

**Purpose**: Improve default regeneration box functionality in stage 2.

**Problem/Context**: The regeneration box UI (especially for the template stage of pipeline) needs improvement. The functionality and visual presentation seems to be this defualt pop up in the format of the browser. It looks totally unprofessional — users don't understand what will happen when they click regenerate.

**Core Features:**
- [ ] Improve regeneration box visual design (make it look like the modal we get when doing regenerations in stage 3)
- [ ] Ensure consistent regeneration behavior across stages
- [ ] We basically want to imitate the behavoir of the stage 3 regeneration box, but here, you highlight some text
in the treatment of interest, and then press the button "

**Dependencies**: None.

## Ticket info:

### UI-7 — Regeneration Boxes UI Improvements Treatment Stage
The regeneration box UI (especially for Stage 4 and the stage pipeline graphic) needs improvement. The functionality and visual presentation need to be clearer and more consistent.

--

My prompt:

 lets fix the issue described in 'c:/Users/Daniel Lopez/Desktop/Aiuteur/wizardirector/._docs/2a-9-task-info.md' the current       
  UI for the regen box in stage 2 is in image #1 (current-bad-stage-2-regen-box.PNG) and we want something more akin to the UI     
   of the regen box for stage 3: Ui-we-desire-to-be-similar-to.PNG (Image #2). The functionality is already pretty good, but       
  maybe have a little toggle to have 3 different "alternative" generations, or just 1 if the user knows exactly what he wants      
  (similar to the functionality of Stage 3's regeneration box. Likewise, lets add this additonal toggle for 1 versus 3             
  regeneration alternatives to choose from, to be added to Stage 4's regeneration box as well. Note: you really need to study      
  stage 3's regen box functionality to know how to replicate the feature. Ask me questions if anything is unclear, and then,       
  once you feel ready; make the plan!    

--

--
Plan: 
 Plan: Regeneration Box UI Improvements (Stage 2 & Stage 4)

 Context

 Stage 2's targeted section regeneration uses a browser prompt() dialog (ugly, unprofessional). We want to replace it with a       
 proper modal inspired by Stage 3's "Brainstorm Alternatives" dialog. Additionally, both Stage 2 and Stage 4 need a toggle letting 
  users choose between generating 1 alternative (direct replacement) or 3 alternatives (pick from options).

 ---
 Files to Modify

 1. src/components/pipeline/Stage2Treatment.tsx

 Replace prompt() with proper modal + alternatives toggle

 - New state variables (~line 230 area):
   - showSectionEditDialog (boolean)
   - sectionEditGuidance (string)
   - sectionAlternatives (string[]) — the generated alternative texts
   - isGeneratingAlternatives (boolean)
   - alternativeCount (1 | 3) — toggle value
 - Modify handleTargetedRegenerate (line 260):
   - Instead of calling prompt(), open the new dialog: setShowSectionEditDialog(true)
   - Rename to handleOpenSectionEdit for clarity
 - New handler: handleGenerateSectionAlternatives:
   - If alternativeCount === 1: call existing treatmentService.regenerateSection(), get single result, auto-apply it (same as      
 current behavior but through the modal)
   - If alternativeCount === 3: call new treatmentService.regenerateSectionAlternatives(), set sectionAlternatives state, show     
 Phase 2
 - New handler: handleSelectSectionAlternative(text: string):
   - Apply selected alternative text to editableContent by replacing selectedText range
   - Close dialog, reset state, show success toast
 - New dialog JSX (after existing Regeneration Dialog, ~line 669):
   - Two-phase modal matching Stage 3's pattern:
       - Phase 1 (alternatives empty): Show selected text preview, guidance textarea, 1/3 toggle, Generate button
     - Phase 2 (alternatives populated): Show clickable alternatives, Regenerate button, Cancel
   - Toggle UI: small segmented control or button group showing "1" and "3"

 2. src/lib/services/treatmentService.ts

 Add regenerateSectionAlternatives method (~after line 245)

 - Signature: regenerateSectionAlternatives(projectId, treatmentContent, selectedText, guidance?) → Promise<string[]>
 - System prompt instructs LLM to generate exactly 3 alternative rewrites
 - User prompt includes full treatment context, selected text, and optional guidance
 - Response parsing: extract 3 alternatives from JSON array (with text fallback parsing like beatService does)
 - Uses same /api/llm/generate endpoint as existing regenerateSection

 3. src/components/pipeline/Stage4MasterScript.tsx

 Add 1/3 toggle to existing Section Edit Dialog

 - New state variables (~line 350 area):
   - sectionAlternatives (string[])
   - isGeneratingAlternatives (boolean)
   - alternativeCount (1 | 3)
 - Modify handleRegenerateSection (line 415):
   - If alternativeCount === 1: keep current behavior (direct replacement)
   - If alternativeCount === 3: call new scriptService.regenerateSectionAlternatives(), show alternatives in dialog
 - New handler: handleSelectSectionAlternative(text: string):
   - Apply selected alternative to Tiptap editor using deleteRange + insertContent
   - Close dialog, reset state
 - Modify Section Edit Dialog JSX (line 959-1028):
   - Add 1/3 toggle between the guidance textarea and action buttons
   - Add Phase 2 view (when alternatives are populated): clickable alternative cards, Regenerate button

 4. src/lib/services/scriptService.ts

 Add regenerateSectionAlternatives method (~after line 270)

 - Signature: regenerateSectionAlternatives(request: RegenerateSectionRequest) → Promise<string[]>
 - System prompt instructs LLM to generate exactly 3 alternative rewrites in screenplay format
 - Same context pattern (beforeText, highlightedText, afterText) as existing regenerateSection
 - Response parsing: extract 3 alternatives from JSON array

 ---
 UI Design Details

 Toggle Control

 - Small segmented button: [1] [3] — compact, sits between guidance textarea and Generate button
 - Label: "Alternatives" or "Generate" with the number
 - Default: 1 (quick single replacement for users who know what they want)

 Dialog Layout (Both Stages)

 ┌─ Edit Selection ──────────────────────┐
 │                                        │
 │ ┌─ Original Text ────────────────────┐ │
 │ │ "The selected text preview..."     │ │
 │ └────────────────────────────────────┘ │
 │                                        │
 │ Optionally provide guidance...         │
 │ ┌────────────────────────────────────┐ │
 │ │ e.g., "Make it more tense"        │ │
 │ └────────────────────────────────────┘ │
 │                                        │
 │ Alternatives: [1] [3]                  │
 │                                        │
 │              Cancel    ✨ Generate      │
 └────────────────────────────────────────┘

 Phase 2 (when 3 alternatives generated):
 ┌─ Edit Selection ──────────────────────┐
 │                                        │
 │ Click an alternative to apply it.      │
 │                                        │
 │ ┌─ Alternative 1 ───────────────────┐ │
 │ │ Rewritten version 1...            │ │
 │ └────────────────────────────────────┘ │
 │ ┌─ Alternative 2 ───────────────────┐ │
 │ │ Rewritten version 2...            │ │
 │ └────────────────────────────────────┘ │
 │ ┌─ Alternative 3 ───────────────────┐ │
 │ │ Rewritten version 3...            │ │
 │ └────────────────────────────────────┘ │
 │                                        │
 │ 🔄 Regenerate              Cancel      │
 └────────────────────────────────────────┘

 ---
 Verification

 1. Run npm run lint on modified files to check for errors
 2. Manual testing:
   - Stage 2: Enter edit mode, select text, click "Regenerate Selection" → modal appears (not browser prompt). Test with toggle=1  
 (direct replace) and toggle=3 (see 3 alternatives, click to apply).
   - Stage 4: Select text in editor, click "Edit Selection" → modal now has 1/3 toggle. Test both modes.
   - Verify guidance text is passed correctly to LLM in both modes
   - Verify alternatives display with animated entrance like Stage 3
   - Verify "Regenerate" button in Phase 2 goes back to Phase 1
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌