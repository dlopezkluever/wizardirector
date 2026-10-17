Outisde the Strech Goals, which were removed and saved in a different doc to addressed on a later date, help me make a new master-mvp-tasklist.md, that reorganizes the current tasklist 'c:/Users/Daniel                              
  Lopez/Desktop/Aiuteur/wizardirector/._docs/MVP-tasklist-v1.1.md' and it's  phases of "implementation"  to include all the tickets listed in 'c:/Users/Daniel Lopez/Desktop/Aiuteur/wizardirector/._docs/organized-tickets.md'. To      
  do this well, we should have a converstaion discussing how to reconcile all the contradictions in our planned design, and flesh out ideas that maybe unlcear & debate between divergent paths. Use te askUserQuestion tool to          
  really get the details clear, and weed out any confusion. Note, I do not want the "master-mvp-tasklist.md" to end up being this really tight and detail sparce document that is vague; but rather, I want all the details that are     
   currently present, and the ideas that we build on or solutions we decide on to also be full of descriptive information so nothing is unclear                                                                                          

● Let me start by reading both source documents to understand what we're working with.

● Read 2 files (ctrl+o to expand)

● Good, I've now read both documents thoroughly. Let me digest the key tensions and contradictions I'm finding before we start our discussion.

  Here are the major architectural tensions I've identified:

  1. The "Master Document" Stage (ticket 4.2) — This proposes adding an entirely new stage between current Stages 4 and 5 that transforms the screenplay into a super-descriptive production document. This would fundamentally
  restructure the pipeline (renumbering stages 5-12 → 6-13, or inserting it differently). The MVP tasklist doesn't mention this at all.

  2. Combining Stage 2 & 3 (ticket 2.4) — The tickets question whether treatment and beat sheet should merge into one stage. Another potential pipeline restructure.

  3. Locking overhaul timing — The tickets describe locking as broken and tedious (LK-1 through LK-6), with LK-5 suggesting deferring it until branching implementation. But the MVP tasklist puts branching in Phase 4, which means     
  users suffer through terrible locking for 3 phases.

  4. "Deferred" items — Several tickets are explicitly marked "Deferred" (10.3 Inpainting, 10.4 Cost Pre-Gen Estimate, 12.2 Continuity Drift, 12.3 Rearview Comparison Modes). Need to clarify if these are MVP at all.

  5. Rearview Mirror → Content Access Space — The tickets describe a massive expansion of the rearview mirror into a multi-tab carousel (script excerpt, shot list, rearview content). The MVP tasklist only mentions a narrow
  enhancement.

  Let me start with the biggest architectural questions:
──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────←  ☐ Master Doc  ☐ Stages 2&3  ☐ Locking  ☐ Deferred items  ✔ Submit  →

The 'Master Document' stage (ticket 4.2) would fundamentally change the pipeline by adding a new stage between Stages 4 and 5 — a super-descriptive document that replaces the screenplay as the production source of truth. This is a   
HUGE architectural decision. What's your intent here?

  1. Add as new Stage 5
     Insert a new stage between current Stage 4 (Script) and Stage 5 (Assets), renumbering everything after it. The Master Document becomes the new source of truth for all production stages.
❯ 2. Replace Stage 4
     The script stage evolves to output a Master Document instead of a traditional screenplay. No renumbering needed, but Stage 4's purpose changes significantly.
  3. Enhance Stage 4 output
     Keep Stage 4 as-is but add a 'Generate Master Document' step within it — an enriched version of the script that gets passed downstream. Stage 4 produces both: screenplay for user reading + master doc for LLM consumption.        
  4. Defer to post-MVP
     This is a big architectural change. Ship MVP with current pipeline structure and revisit the Master Document concept later.
  5. Type something.
─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────  6. Chat about this
  7. Skip interview and plan immediately

Enter to select · Tab/Arrow keys to navigate · Esc to cancel

● User answered Claude's questions:
 e⎿  · The 'Master Document' stage (ticket 4.2) would fundamentally change the pipeline by adding a new stage between Stages 4 and 5 — a super-descriptive document that replaces the screenplay as the production source of truth. e    
     This is a HUGE architectural decision. What's your intent here? → Defer to post-MVP
     · Ticket 2.4 asks whether Treatment (Stage 2) and Beat Sheet (Stage 3) should be combined into one stage. What's your decision? → Defer decision                                                                                    
     · The locking system is described as 'extremely tedious' and 'must be fixed' (LK-1), but LK-5 suggests deferring the overhaul until branching is implemented (Phase 4 in current MVP). When should the locking overhaul happen?     
     → Fix early (Phase 2)                                                                      tch goals document.

     · Several tickets are explicitly marked 'Deferred' in the organized-tickets doc: Inpainting Tools (10.3), Cost Pre-Generation Estimate (10.4), Continuity Drift Detection (12.2), and Rearview Comparison Modes (12.3). Should      
     these be included in the MVP master tasklist at all? → Include as final phase

● Good, that clears up the biggest architectural decisions. Now let me dig into the next layer of tensions:

● User answered Claude's questions:
  ⎿  · The organized tickets describe expanding the Rearview Mirror into a multi-tab 'Content Access Space' with: (1) existing rearview content, (2) script excerpt for current scene, (3) shot list carousel. Plus 
     collapsible/extendable pulldown curtain behavior. This is a significant UI build. The MVP tasklist only mentions a narrow rearview enhancement in Phase 4. Where does this land? → Full build, Phase 3-4
     · Multi-Provider Video Integration (Sora, Runway alongside Veo3) is listed as a multi-stage concern in organized tickets. The MVP tasklist doesn't address it. Is this MVP-critical or can we ship with Veo3-only? → Veo3-only      
     for MVP
     · The Aspect Ratio ticket says ratios need to be set somewhere in the pipeline and applied consistently to asset generation, frame generation, and video generation. Where should this be configured? → Stage 1 (project setup)     
     · Ticket 5.11 proposes 'Group Characters / Extras as Archetypes' — a new asset type for background characters that don't need individual persistence. Is this an MVP feature or can it wait? → Include in MVP

● Great decisions. Let me now tackle the remaining ambiguous items:

● User answered Claude's questions:
  ⎿  · Several Stage 1 tickets propose new input modes: (1.1) Structured Uploading with document identification (auto-detect treatments, beat sheets, character descriptions), (1.3) Storyboard Upload as input type, (1.4) Ideal        
     Input Format Template. The current MVP tasklist doesn't cover any of these. Are any of these MVP priorities? → 1.1 Structured Upload only
     · The Visual Style Capsule Influence Scale (multi-stage ticket) proposes letting users control HOW MUCH the visual style capsule affects generations, rather than all-or-nothing. This is directly related to the #1 complaint      
     that capsules override master reference images. How should this be handled? → Both: fix default + add scale
     · Ticket 12.1 describes a 'Side-by-Side View / Timeline Player' for Stage 12 video review — scene player on left, shot list with thumbnails on right, timeline with shot boundaries, scrub functionality. Currently the MVP         
     tasklist puts Stage 12 in Phase 1 (done) but doesn't mention this enhanced review UI. Is this MVP? → I believe we already have a timeline click to play; upgrading to a proper timeline player would be huge; and the shot list     
     with thumbnails on right is key for best experience.

     · There are several smaller Stage 8 tickets not in the current MVP tasklist: (8.9) Persist Suggested Assets in DB, (8.12) Camera Angle metadata for scene instances, (8.13) Shot Presence Flags per asset. Which of these should    
      be in the MVP? → All three in MVP

● Excellent. A few more items to clarify, then I'll move to designing the phase structure:
  ⎿ Tool use rejected with user message: The user wants to clarify these questions.
        This means they may have additional information, context or questions for you.
        Take their response into account and then reformulate the questions if appropriate.
        Start by asking them what they would like to clarify.

        Questions asked:
    - "Ticket 5.8 proposes generating multiple views/angles of each asset (front, side, etc.) like engineering documentation. This would help Stage 10 frame generation with different camera angles. Is this MVP or post-MVP?"
      Answer: Include in MVP
    - "The 'Writing & Style Capsule Effectiveness' multi-stage ticket describes a whole evaluation effort: prompt experimentation, censorship workarounds for edgy content, system prompt quality assessment, and possibly a dedicated   
    'evaluation phase.' Where should this work live?"
      Answer: Dedicated Phase 5 effort
    - "Ticket 9.5 describes 'Dynamic/Piping Descriptions' where frame & video prompts for one shot pipe context into subsequent shots in the scene (so shot 2's prompt knows what happened in shot 1). Ticket 9.3 says video prompts     
    should react to frame changes. How should prompt chaining work?"
      Answer: Build in Phase 3
    - "Looking at the overall phase structure: the current MVP tasklist has 6 phases. With the new items (locking overhaul in Phase 2, Content Access Space in Phase 3-4, aspect ratio, extras, timeline player, etc.), should I
    reorganize the phases or keep the same structure and insert items into existing phases?"
      Answer: Restructure completely

● It looks like you wanted to provide some additional context or clarification on those questions. What would you like to clarify? Feel free to share any additional thoughts on any of the four items:

  1. Multi-angle asset generation (5.8)
  2. Writing & Style Capsule evaluation effort
  3. Prompt chaining between shots (9.5/9.3)
  4. Phase restructuring approach

● User answered Claude's questions:
  ⎿  · Which of those 4 questions did you want to clarify or add context to? → Phase restructuring

● Got it — you have thoughts on how the phases should be restructured. What's your vision for organizing the phases? For context, here's what I'm working with as the total scope of MVP work:

  Critical Fixes: Stage 8 master asset bug, generation carousels, historical reference carousel, manual upload, stage opening fix, asset generation requirements, locking overhaul, beat sheet bug, Stage 4 auto-gen, skip option fix,   
  Stage 5 lock button

  Data/Architecture: Single extraction + filter modal, transparent backgrounds, asset inheritance chain, context manager, Content Access Space, aspect ratio system, extras/archetypes, prompt chaining, multi-angle assets

  Continuity/Versioning: End-state summaries, branching, continuity risk analysis, invalidation/cascade detection

  Quality/Polish: Writing/style capsule evaluation, capsule influence scale fix + slider, adaptive descriptions, Stage 12 timeline player, UX improvements (debouncing, folders, stage pipeline colors, etc.), onboarding, video export, 
  testing

  Deferred/Nice-to-Have: Inpainting, cost pre-gen estimates, continuity drift detection, rearview comparison modes

● User answered Claude's questions:
  ⎿  · How do you think the phases should be restructured? Share your vision and I'll incorporate it. → Do what you view is best, i just didnt want you to feel confined to the old mvap-tasklist-v1.1 structure. Just please, don't     
     minimize details trying to be concise, this needs to be truly a cornertstone, master document


● Understood — full freedom to restructure, and the document must be comprehensive and detailed, a true cornerstone. Let me confirm those last answers from the rejected question set and ask one final clarifying question:

● User answered Claude's questions:
  ⎿  · Confirming from earlier: Multi-angle asset generation (5.8) = Include in MVP, Writing/Style evaluation = Dedicated Phase 5 effort, Prompt chaining between shots (9.5) = Build in Phase 3 (Data Flow). Correct? → Somewhat        
     correct, but you have full freedom to restructure the tasklist, so don't feel confined to have to put "Writing/Style evaluation in 'Phase 5', or Prompt chaining between shots (9.5) in Phase 3 (Data Flow)", like, you can move    
      these tasks where you see fit, view those instructions as directionally insightfully, not binding;  hopely this helps  
     · The Style Capsule Influence fix: you said 'Both: fix default balance + add scale.' Should the default balance fix happen early (Phase 2, alongside the master asset influence bug) while the user-facing scale slider comes in    
      a later phase? Or should both ship together? → Fix default early, scale later

● Perfect — I have full creative freedom on phase structure, with your directional answers as guidance. I now have all the context I need to design the master document structure.

  Let me now draft the plan for how this master-mvp-tasklist.md will be organized, incorporating all decisions we've made.

● Updated plan
  ⎿  /plan to preview

● The plan is written. Here's a summary of the proposed structure:

  Phase 2: Critical Fixes & Locking Overhaul — 9 bug fixes + complete locking system overhaul

  Phase 3: Asset System Overhaul — Stage 5 extraction revolution (two-pass + filter modal), Stage 8 UX overhaul (carousels, uploads, flexibility), asset architecture (transparency, multi-angle, inheritance, aspect ratio)

  Phase 4: Production Pipeline Intelligence — Content Access Space (expanded rearview), Stage 6/7 improvements, prompt generation overhaul with shot-to-shot chaining, Stage 10/12 enhancements (end frames, timeline player), adaptive  
  asset descriptions

  Phase 5: Continuity, Versioning & State Management — End-state summaries, branching, continuity risk analysis, invalidation/cascade detection, capsule influence scale

  Phase 6: Quality, Polish & MVP Completion — Writing evaluation, UX improvements, structured upload, onboarding, video export, keyboard shortcuts, testing, TypeScript audit

  Phase 7: Deferred Nice-to-Haves — Inpainting, cost pre-gen estimates, continuity drift, rearview comparison modes

  All 73+ tickets from organized-tickets.md are mapped to a phase (or explicitly excluded with reasoning). Every detail from the v1.1 tasklist is preserved and expanded.

───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── Ready to code?

 Here is Claude's plan:
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌ Plan: Create master-mvp-tasklist.md

 Context

 We have two source documents:
 - ._docs/MVP-tasklist-v1.1.md — The existing 6-phase MVP implementation plan (Phase 1 done, Phases 2-6 planned). Well-structured but missing ~40+ issues from the organized tickets doc.
 - ._docs/organized-tickets.md — 73+ deduplicated issue tickets organized by pipeline stage, gathered from 9 disorganized files.

 The goal is to produce a single master-mvp-tasklist.md that:
 1. Reconciles both documents into one authoritative source of truth
 2. Restructures the phases based on dependency chains and user impact
 3. Preserves ALL detail from both sources (no summarizing away context)
 4. Incorporates all architectural decisions made during this conversation
 5. Is comprehensive enough to serve as THE cornerstone planning document

 Key Architectural Decisions Made
 ┌─────────────────────────────────────────────────┬────────────────────────────────────────────────────────────────────────────────────────┐
 │                    Decision                     │                                       Resolution                                       │
 ├─────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────┤
 │ Master Document stage (ticket 4.2)              │ Deferred to post-MVP — pipeline stays at 12 stages                                     │
 ├─────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────┤
 │ Combine Stage 2 & 3 (ticket 2.4)                │ Deferred — fix bugs, don't merge                                                       │
 ├─────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────┤
 │ Locking overhaul timing                         │ Phase 2 (early) — fix alongside critical bugs                                          │
 ├─────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────┤
 │ Deferred items (inpainting, cost pre-gen, etc.) │ Final phase as nice-to-haves                                                           │
 ├─────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────┤
 │ Rearview → Content Access Space                 │ Full build in production intelligence phase                                            │
 ├─────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────┤
 │ Multi-Provider Video (Sora, Runway)             │ Veo3-only for MVP — architecture ready for future                                      │
 ├─────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────┤
 │ Aspect Ratio                                    │ Stage 1 project-level setting                                                          │
 ├─────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────┤
 │ Extras/Archetypes (5.11)                        │ Include in MVP as part of asset overhaul                                               │
 ├─────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────┤
 │ Stage 1 new input modes                         │ Structured Upload only (1.1) — defer storyboard upload & template                      │
 ├─────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────┤
 │ Visual Style Capsule influence                  │ Fix default balance early (Phase 2 with master asset bug), add user-facing scale later │
 ├─────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────┤
 │ Stage 12 Timeline Player                        │ Include in MVP — proper timeline + shot thumbnails                                     │
 ├─────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────┤
 │ Stage 8 extras (8.9, 8.12, 8.13)                │ All three in MVP                                                                       │
 ├─────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────┤
 │ Multi-angle asset generation (5.8)              │ Include in MVP                                                                         │
 ├─────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────┤
 │ Writing/Style evaluation                        │ Dedicated effort in quality phase                                                      │
 ├─────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────┤
 │ Prompt chaining (9.5/9.3)                       │ Include in MVP in production intelligence                                              │
 ├─────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────┤
 │ Phase structure                                 │ Complete restructure based on dependencies + user impact                               │
 ├─────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────┤
 │ Capsule fix vs slider                           │ Fix default early, add slider later                                                    │
 └─────────────────────────────────────────────────┴────────────────────────────────────────────────────────────────────────────────────────┘
 Proposed Phase Structure

 Phase 1: Pipeline Connectivity ✅ DONE

 (Preserved from v1.1 for historical record)

 Phase 2: Critical Fixes & Locking Overhaul

 Goal: Remove ALL friction that prevents users from progressing through the pipeline. Fix bugs, fix locking, fix navigation.

 Sub-sections:

 2A — Bug Fixes & Navigation
 - Stage 8 Master Asset Influence Bug Fix + Fix default capsule-vs-reference balance
 - Stage Opening System Fix (UI-1) — opens to wrong stage
 - Beat Sheet Generation Bug Fix (ticket 2.3) — "does nothing"
 - Stage 4 Auto-Generation Fix (ticket 4.3) — doesn't auto-gen on first visit
 - Stage 4 Script UI Fix (ticket 4.4) — character/dialogue formatting broken
 - Skip Option Fix (ticket 1.2) — incorrectly feeds into Stage 2 instead of Stage 4+
 - Stage 5 "Lock All and Proceed" Button Fix (ticket 5.10) — hidden/broken
 - Stage Pipeline Graphic Color Inconsistency (ticket UI-5) — green vs yellow confusion
 - Regeneration Boxes UI Improvements (ticket UI-7) — unclear functionality

 2B — Locking System Overhaul
 - Universal Lock/Unlock Button (LK-2) — consistent position across all stages
 - State Persistence for Completed Scenes (LK-3) — stop "forgetting" completed states
 - Fix Sequential Locking Errors (LK-6) — "Cannot lock stage 2. Stage 1 must be locked first"
 - Reduce Tedium in Production Cycle (LK-1) — no more unlock→relock→warning loops
 - Deliberate Branching on Post-Lock Edits (LK-4) — clear acknowledgment flow (foundations only; full branching in Phase 5)
 - Note: Full branching integration deferred per LK-5 until Phase 5

 Phase 3: Asset System Overhaul

 Goal: Revolutionize how assets are extracted, managed, and flow through the entire pipeline. This is the foundational architecture change.

 Sub-sections:

 3A — Stage 5 Extraction Revolution
 - Two-Pass Asset Extraction with Filter Modal (ticket 5.3):
   - Pass 1 (/extract-preview): Entity names + types + scene mentions (cheap)
   - Filter Modal: Grouped checklist for users to deselect unneeded assets
   - Pass 2 (/extract-confirm): Descriptions + images only for selected assets (saves $$$)
 - Scene-Level Mapping: Populate scenes.dependencies automatically from extraction
 - Sidelined Assets System (ticket 5.4): Hidden not deleted, retrievable, scene info preserved
 - Manual Asset Addition (ticket 5.5): Add assets extraction missed
 - Assets Don't Require Images (ticket 5.6): Only generate/upload for assets you care about
 - Group Characters / Extras Archetypes (ticket 5.11): New asset type for background characters
 - Delete Uploaded Image (ticket 5.12): Remove predetermined image
 - Extract Description from Uploaded Image (ticket 5.13): Intelligent description extraction/merge
 - Visual Style Capsule Investigation (ticket 5.7): Fix capsules having no effect on generation
 - Allow Manual Visual Tone Description (ticket 5.2): Alternative to capsule selection
 - Visual Style Capsule Locking Less Restrictive (ticket 5.1): Changeable with branch implications

 3B — Stage 8 UX Overhaul
 - Asset Generation Carousel (ticket 8.5 / MVP 2.2): Multiple generations, pick favorite
 - Master Reference Historical Carousel (ticket 8.6 / MVP 2.3): Default to previous scene's instance
 - Manual Image Upload for Scene Instances (ticket 8.11 / MVP 2.4)
 - "Use Master As-Is" Option (ticket 8.4 / MVP 2.1): Skip generation entirely
 - Asset Generation Requirement Fix (ticket 8.7 / MVP 2.6): Don't force generation for all assets
 - "Add New Assets" Button Fix (ticket 8.8): Scene-specific creation, not global drawer
 - Remove Assets from Scene (ticket 8.10): Remove inaccurate extractions
 - Persist Suggested Assets in DB (ticket 8.9): scene_asset_suggestions table
 - Shot Presence Flags per Asset (ticket 8.13): Show which shots each asset appears in
 - Camera Angle Metadata (ticket 8.12): Inform frame generation about shot angles
 - Rearview Mirror for Incomplete Previous Scenes (ticket 8.3): Show previous scene assets or carousel

 3C — Asset Architecture & Data Flow
 - Transparent Background Auto-Injection (MVP 3.2): Characters/props on clean backgrounds
 - Multi-Angle Asset Generation (ticket 5.8): Front/side/etc. for production accuracy
 - Asset Clean Backgrounds (ticket 5.9): White/transparent/black to avoid noise
 - Asset Inheritance Chain Enhancement (MVP 3.3): Strong inheritance tracking
 - Context Manager Enhancement (MVP 3.4): Optimized LLM context assembly
 - Aspect Ratio System: Project-level setting in Stage 1, applied consistently downstream

 Phase 4: Production Pipeline Intelligence

 Goal: Make the production stages (6-12) dramatically smarter. Better context access, better prompts, better review tools.

 Sub-sections:

 4A — Content Access Space (Rearview Expansion)
 - Build multi-tab carousel replacing the simple rearview mirror (Stages 6-12):
   - Tab 1: Existing rearview content (previous scene frames/assets)
   - Tab 2: Script excerpt for current scene (scrollable, from Stage 4)
   - Tab 3: Shot list carousel (up/down arrows to cycle shots)
 - Collapsible pulldown curtain behavior with click-and-drag resizing
 - Present throughout production cycle (Stages 6-12)

 4B — Stage 6 & 7 Improvements
 - Script Hub UI Overflow Fix (ticket 6.1): Horizontal extension, dynamic text truncation, scrollable tabs
 - Scene Header Formatting Fix (ticket 6.2): Proper format, not encoded EXT-LOC-DAY-1
 - Scene Deferral/Sidelining (ticket 6.3): Grey out scenes without deleting
 - Shot List Action Descriptions Enhancement (ticket 7.1): Much more descriptive actions
 - Edit Merge Toggle Improvement (ticket 7.2): More obvious, at top of modal
 - Final Shot Deletion Warning (ticket 7.3): Offer to defer scene instead
 - "Extend Shot" Feature Consideration (ticket 7.4): Veo3/Sora extend compatibility

 4C — Prompt Generation Overhaul (Stage 9)
 - Structured Image & Video Prompts (ticket 9.1): Robust, deterministic, leverages all prior stages
 - Visual Assets Shown Alongside Prompts (ticket 9.2): Show relevant assets in prompt editing UI
 - Video Prompt Reacts to Frame Changes (ticket 9.3): Auto-update when frame changes
 - Additional Reference Image Upload (ticket 9.4): Storyboard/reference support
 - Shot-to-Shot Prompt Chaining (ticket 9.5): Prior shot context pipes into subsequent prompts

 4D — Stage 10 & 12 Enhancements
 - End Frame Generation (ticket 10.2): Both start + end frames for video API
 - Fix Asset Inheritance in Frame Generation (ticket 10.1): Master assets must influence frames
 - Stage 12 Side-by-Side View & Timeline Player (ticket 12.1):
   - Scene player on left, shot list with thumbnails on right
   - Timeline with shot boundaries, scrubbing, auto-advance
   - Click shot to jump to it

 4E — Adaptive Asset Descriptions
 - Context-aware asset descriptions per scene/shot (from organized tickets multi-stage)
 - Example: Persephone (blonde nature princess → dark goth underworld queen)
 - Agentic tooling infers correct context from script/scene/shot list
 - Merge master asset descriptions with scene-specific context

 Phase 5: Continuity, Versioning & State Management

 Goal: Ensure visual and narrative consistency across scenes. Protect completed work with version control. Prevent costly mistakes.

 Sub-sections:

 5A — End-State Summary Generation (MVP 4.1)
 - LLM-powered scene end-state summaries after Stage 10
 - Rearview mirror shows rich end-state instead of mock data
 - Continuity validation comparing prior end-state to current scene

 5B — Branching & Version Control (MVP 4.2)
 - "Save as new version" checkpoint functionality
 - Story Timelines interface (visual branch tree)
 - Branch management (naming, comparison, deletion)
 - Deliberate branching on post-lock edits (integration with Phase 2 locking foundations)

 5C — Continuity Risk Analysis (MVP 4.3)
 - Content-aware continuity using actual end-state summaries
 - Visual continuity tracking (frame-based consistency)
 - Automated continuity warnings with suggestions
 - Continuity dashboard (project-level overview)

 5D — Invalidation & Cascade Detection (MVP 4.4)
 - invalidation_logs table for tracking
 - Global invalidation (Phase A changes → Phase B impact)
 - Local invalidation (shot/visual/prompt changes → downstream impact)
 - Cost estimation for regeneration
 - Smart invalidation UI with visual indicators

 5E — Visual Style Capsule Influence Scale
 - User-facing influence slider (0-100%) for how much capsule affects generation
 - Applied in Stages 5, 8, and 10
 - Builds on Phase 2's default balance fix

 Phase 6: Quality, Polish & MVP Completion

 Goal: Polish the experience, evaluate generation quality, build onboarding, add export, and get the product ready for users.

 Sub-sections:

 6A — Writing & Style Capsule Effectiveness Evaluation
 - Prompt experimentation for better dialogue/narrative
 - Workarounds for content censorship (non-illegal content)
 - System prompt quality assessment and A/B testing
 - Focused style injection on dialogue specifically (where LLMs are weakest)
 - Evaluation framework for generation quality

 6B — UX Improvements
 - Auto-Save Debouncing (UI-2): Reduce spam in Stages 1-3
 - Project Folders in Dashboard (UI-3): Organization + search
 - Stage Info on Dashboard Cards (UI-4): Current stage + scene
 - Unsaved Page Exit Warning (UI-6): Browser warning popup
 - Regeneration Boxes UI Polish (UI-7): Clearer functionality
 - Custom Revision UI for Treatment (ticket 2.1): Highlight-to-revise with LLM edit
 - Contextual Regeneration Button (ticket 2.2): Custom input instead of blind regen
 - Asset Drawer Improvements: Rename, performance, search/filtering

 6C — Stage 1 Structured Uploading
 - Document identification (auto-detect treatments, beat sheets, character descriptions)
 - Form-based input: upload/paste → identify type → route to correct stage
 - Convert detected beat sheets to JSON → push to Stage 3
 - Store character descriptions for Stage 5 extraction

 6D — Onboarding & User Education (MVP 5.4)
 - First-time user onboarding flow
 - Interactive tutorial overlays
 - Example project templates (2-3)
 - Contextual help system
 - Empty state improvements

 6E — Video Export System (MVP 5.5)
 - Export API endpoint (MP4 H.264)
 - Export job queue (integrates with existing async system)
 - Export UI (button, config modal, progress indicator)
 - Export history tracking
 - Multi-scene concatenation (optional)

 6F — Keyboard Shortcuts (from MVP 5.3)
 - Global shortcut handler
 - Stage navigation (Ctrl+1-12, Ctrl+Left/Right)
 - Action shortcuts (Ctrl+S, Ctrl+R, Ctrl+G)
 - Help modal (Ctrl+/)
 - Customizable bindings

 6G — Testing Infrastructure (MVP 5.6)
 - Frontend testing (React Testing Library)
 - Integration testing (Playwright/Cypress)
 - Performance testing
 - Error handling improvements

 6H — TypeScript any Audit (ticket OT-1)
 - Identify and fix potential runtime errors from any types

 Phase 7: Deferred Nice-to-Haves

 Goal: Items explicitly deferred but worth tracking. Only pursue if time/resources permit before launch.

 - Inpainting Region Selection Tools (ticket 10.3)
 - Cost Pre-Generation Estimate + Confirmation (ticket 10.4)
 - Continuity Drift Detection (ticket 12.2)
 - Rearview Comparison Modes (ticket 12.3): Flicker mode, side-by-side, multi-mode

 ---
 Items Explicitly Excluded from MVP
 ┌─────────────────────────────────────┬────────────────────────────────────────────────────┐
 │                Item                 │                       Reason                       │
 ├─────────────────────────────────────┼────────────────────────────────────────────────────┤
 │ Master Document stage (ticket 4.2)  │ Deferred to post-MVP — pipeline stays at 12 stages │
 ├─────────────────────────────────────┼────────────────────────────────────────────────────┤
 │ Combine Stage 2 & 3 (ticket 2.4)    │ Deferred — just fix bugs for now                   │
 ├─────────────────────────────────────┼────────────────────────────────────────────────────┤
 │ Multi-Provider Video (Sora, Runway) │ Veo3-only; architecture-ready for future           │
 ├─────────────────────────────────────┼────────────────────────────────────────────────────┤
 │ Storyboard Upload (ticket 1.3)      │ Deferred to post-MVP                               │
 ├─────────────────────────────────────┼────────────────────────────────────────────────────┤
 │ Input Format Template (ticket 1.4)  │ Deferred to post-MVP                               │
 ├─────────────────────────────────────┼────────────────────────────────────────────────────┤
 │ Stretch Goals                       │ Already moved to separate document                 │
 └─────────────────────────────────────┴────────────────────────────────────────────────────┘
 Cross-Cutting Concerns (mentioned in each relevant phase)
 ┌───────────────────────────────────────┬─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
 │                Concern                │                                             Where Addressed                                             │
 ├───────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ Data/Context Flow (DC-1 through DC-4) │ DC-1 in Phase 6B (contextual regen), DC-2 deferred (master doc), DC-3 in Phase 3C + 4D, DC-4 in Phase 5 │
 ├───────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ Rearview Mirror Usefulness (OT-2)     │ Superseded by Content Access Space (Phase 4A)                                                           │
 ├───────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ Asset Inheritance Failure (DC-3)      │ Phase 3C (inheritance chain) + Phase 4D (frame generation fix)                                          │
 ├───────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ Continuity Persistence (DC-4)         │ Phase 5 (end-state + continuity risk)                                                                   │
 ├───────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ Aspect Ratio Consistency              │ Phase 3C (project-level setting, applied downstream)                                                    │
 ├───────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ Writing Style Capsule Effectiveness   │ Phase 6A (dedicated evaluation)                                                                         │
 └───────────────────────────────────────┴─────────────────────────────────────────────────────────────────────────────────────────────────────────┘
 Document Format

 The master-mvp-tasklist.md will follow this format for each item:
 - Title with ticket reference
 - Purpose: Why this needs to be done
 - Problem/Context: What's currently wrong or missing (preserving all detail from source docs)
 - Core Features: Checkbox list of implementation sub-tasks
 - Technical Notes: Any implementation specifics, DB changes, API endpoints mentioned
 - Dependencies: What must be done first

 What I Will Write

 A single comprehensive ._docs/master-mvp-tasklist.md file that:
 1. Opens with an Overview section (project state, target, philosophy)
 2. Contains all 7 phases with full detail for every item
 3. Preserves ALL descriptive context from both source documents
 4. Includes a Success Criteria section per phase
 5. Includes Implementation Notes (DB, security, cost management)
 6. Ends with a cross-reference table mapping organized-tickets items to phase locations
 7. Notes post-MVP exclusions clearly

 Verification

 After writing the document:
 1. Cross-reference every item in organized-tickets.md to confirm it appears in the master tasklist (or is explicitly excluded)
 2. Cross-reference every item in MVP-tasklist-v1.1.md to confirm nothing was dropped
 3. Run npm run lint if any code files were touched (none expected)
 4. Read the final document to verify completeness and coherence