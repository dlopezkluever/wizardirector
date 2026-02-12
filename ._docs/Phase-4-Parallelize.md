
  Phase 4 Dependency & Parallelism Analysis

  Task Inventory (14 remaining tasks, 4B.4 already done)

  Here's each task, what files it touches, and its dependency status:
  ┌───────────────────────────┬──────────┬─────────────────────────────────────────────────────────────────────┬───────────────────┬────────────────┐  │           Task            │ Priority │                       Files Touched (Primary)                       │   Dependencies    │     Status     │  ├───────────────────────────┼──────────┼─────────────────────────────────────────────────────────────────────┼───────────────────┼────────────────┤  │ 4B.1 Script Hub Overflow  │ HIGH     │ Stage6ScriptHub.tsx                                                 │ None              │ Ready          │  ├───────────────────────────┼──────────┼─────────────────────────────────────────────────────────────────────┼───────────────────┼────────────────┤  │ 4B.2 Scene Header Format  │ MED      │ Stage6ScriptHub.tsx + headers across stages                         │ None              │ Ready          │  ├───────────────────────────┼──────────┼─────────────────────────────────────────────────────────────────────┼───────────────────┼────────────────┤  │ 4B.3 Scene Deferral       │ MED      │ Stage6ScriptHub.tsx, backend scene routes, DB                       │ None              │ Ready          │  ├───────────────────────────┼──────────┼─────────────────────────────────────────────────────────────────────┼───────────────────┼────────────────┤  │ 4B.5 Merge Toggle         │ LOW      │ Stage7ShotList.tsx                                                  │ None              │ Ready          │  ├───────────────────────────┼──────────┼─────────────────────────────────────────────────────────────────────┼───────────────────┼────────────────┤  │ 4B.6 Extend Shot          │ LOW      │ Research task (video provider interface)                            │ None              │ Ready          │  ├───────────────────────────┼──────────┼─────────────────────────────────────────────────────────────────────┼───────────────────┼────────────────┤  │ 4C.1 Structured Prompts   │ HIGH     │ promptGenerationService.ts, contextManager.ts,                      │ 3C.4 ✅, 4B.4 ✅  │ Ready          │  
  │                           │          │ Stage9PromptSegmentation.tsx                                        │                   │                │  ├───────────────────────────┼──────────┼─────────────────────────────────────────────────────────────────────┼───────────────────┼────────────────┤  │ 4C.2 Assets Alongside     │ MED      │ Stage9PromptSegmentation.tsx (new sub-panel)                        │ 3B.9 NOT done     │ Blocked        │  │ Prompts                   │          │                                                                     │                   │                │  ├───────────────────────────┼──────────┼─────────────────────────────────────────────────────────────────────┼───────────────────┼────────────────┤  │ 4C.3 Video Prompt Reacts  │ MED      │ Stage9PromptSegmentation.tsx, Stage10FrameGeneration.tsx, backend   │ Phase 3 (partial) │ Ready-ish      │  │ to Frames                 │          │                                                                     │                   │                │  ├───────────────────────────┼──────────┼─────────────────────────────────────────────────────────────────────┼───────────────────┼────────────────┤  │ 4C.4 Reference Image      │ LOW      │ Stage9PromptSegmentation.tsx, backend upload route                  │ None              │ Ready          │  │ Upload                    │          │                                                                     │                   │                │  ├───────────────────────────┼──────────┼─────────────────────────────────────────────────────────────────────┼───────────────────┼────────────────┤  │ 4C.5 Prompt Chaining      │ MED      │ promptGenerationService.ts, Stage9PromptSegmentation.tsx            │ 4C.1              │ Blocked until  │  │                           │          │                                                                     │                   │ 4C.1           │  ├───────────────────────────┼──────────┼─────────────────────────────────────────────────────────────────────┼───────────────────┼────────────────┤  │ 4D.1 End Frame Generation │ HIGH     │ Stage10FrameGeneration.tsx, FramePanel.tsx,                         │ Phase 3 (done     │ Ready          │  │                           │          │ frameGenerationService.ts, frames.ts routes                         │ enough)           │                │  ├───────────────────────────┼──────────┼─────────────────────────────────────────────────────────────────────┼───────────────────┼────────────────┤  │ 4D.2 Fix Asset            │ HIGH     │ frameGenerationService.ts, assetInheritanceService.ts,              │ 3C.3 ✅, 3C.4 ✅  │ Ready          │  
  │ Inheritance               │          │ contextManager.ts, frames.ts routes                                 │                   │                │  ├───────────────────────────┼──────────┼─────────────────────────────────────────────────────────────────────┼───────────────────┼────────────────┤  │ 4D.3 Timeline Player      │ HIGH     │ Stage12VideoGeneration.tsx                                          │ Phase 3           │ Ready          │  │                           │          │                                                                     │ (thumbnails)      │                │  ├───────────────────────────┼──────────┼─────────────────────────────────────────────────────────────────────┼───────────────────┼────────────────┤  │ 4E.1 Adaptive             │ MED      │ assetDescriptionMerger.ts, contextManager.ts, new service logic     │ 3A.1 ✅, 3C.4 ✅  │ Ready          │  
  │ Descriptions              │          │                                                                     │                   │                │  └───────────────────────────┴──────────┴─────────────────────────────────────────────────────────────────────┴───────────────────┴────────────────┘  File Conflict Map

  This is the critical part — tasks that touch the same files will cause merge conflicts if built in parallel worktrees:

  Stage6ScriptHub.tsx ──────── 4B.1, 4B.2, 4B.3          (must be same WT)
  Stage7ShotList.tsx ───────── 4B.5                        (isolated)
  Stage9PromptSegmentation.tsx  4C.1, 4C.2, 4C.3, 4C.4, 4C.5  (conflict zone)
  Stage10FrameGeneration.tsx ── 4D.1, 4C.3                 (conflict)
  Stage12VideoGeneration.tsx ── 4D.3                        (isolated)
  promptGenerationService.ts ── 4C.1, 4C.5                 (must sequence)
  frameGenerationService.ts ─── 4D.1, 4D.2                 (must be same WT)
  frames.ts (routes) ────────── 4D.1, 4D.2                 (must be same WT)
  contextManager.ts ─────────── 4C.1, 4D.2, 4E.1           (conflict zone*)
  ALL stages 6-12 ──────────── 4A.1                        (must go LAST)

  * contextManager.ts is touched by 3 tasks, but in different functions (formatPromptGenerationContext for 4C.1, frame-gen context for 4D.2, adaptive   description logic for 4E.1) — manageable with care if sequenced into waves.

  ---
  Recommended Build Order: 3 Waves

  Wave 1 — Three parallel worktrees, zero shared files
  ┌──────────┬───────────────────────────┬─────────────────────────────────────────────────────────────────────────────┬──────────────┐
  │ Worktree │           Tasks           │                                   Touches                                   │  Est. Size   │
  ├──────────┼───────────────────────────┼─────────────────────────────────────────────────────────────────────────────┼──────────────┤
  │ WT-A     │ 4B.1 + 4B.2 + 4B.3 + 4B.5 │ Stage6ScriptHub.tsx, Stage7ShotList.tsx, backend scene routes               │ Medium-Large │
  ├──────────┼───────────────────────────┼─────────────────────────────────────────────────────────────────────────────┼──────────────┤
  │ WT-B     │ 4C.1                      │ promptGenerationService.ts, contextManager.ts, Stage9PromptSegmentation.tsx │ Large        │
  ├──────────┼───────────────────────────┼─────────────────────────────────────────────────────────────────────────────┼──────────────┤
  │ WT-C     │ 4D.3                      │ Stage12VideoGeneration.tsx (new sub-components)                             │ Medium-Large │
  └──────────┴───────────────────────────┴─────────────────────────────────────────────────────────────────────────────┴──────────────┘
  Why these work in parallel:
  - WT-A is all Stage 6/7 UI — only touches Script Hub and Shot List components. 4B.5 is tiny (merge toggle in Stage 7) and rides along for free     
  since it's a different file from the 4B.1-3 group.
  - WT-B is the prompt engine overhaul — purely backend promptGenerationService.ts + contextManager.ts + the Stage 9 component. No overlap with Stage   6/7 or Stage 12.
  - WT-C is an isolated Stage 12 UI rewrite — only touches Stage12VideoGeneration.tsx and new sub-components. Zero overlap with anything else.       

  Merge order: Any order works. No cross-dependencies.

  ---
  Wave 2 — Three parallel worktrees (after Wave 1 merges)
  Worktree: WT-D
  Tasks: 4D.1 + 4D.2
  Touches: Stage10, frameGenerationService.ts, frames.ts routes
  Depends on Wave 1: None (but merges cleaner after WT-B for contextManager)
  ────────────────────────────────────────
  Worktree: WT-E
  Tasks: 4C.5
  Touches: promptGenerationService.ts, Stage9PromptSegmentation.tsx
  Depends on Wave 1: WT-B (4C.1 must land first — 4C.5 chains on structured prompts)
  ────────────────────────────────────────
  Worktree: WT-F
  Tasks: 4E.1
  Touches: assetDescriptionMerger.ts, contextManager.ts, new backend service
  Depends on Wave 1: WT-B (cleaner merge on contextManager.ts)
  Why these work in parallel:
  - WT-D is Stage 10 only — frame generation + asset inheritance fix. Doesn't touch Stage 9 or prompt services.
  - WT-E is prompt chaining — lives in promptGenerationService.ts + Stage 9 UI. Doesn't touch Stage 10 or asset merger.
  - WT-F is asset description intelligence — lives in assetDescriptionMerger.ts + contextManager.ts (different function from what WT-E touches).     
  Doesn't touch Stage 9 UI or Stage 10.

  Merge order: WT-D first (no dependency on Wave 1 prompt changes), then WT-E and WT-F in any order.

  ---
  Wave 3 — Final wave (after Wave 2 merges)
  ┌──────────┬─────────────┬──────────────────────────────────────────────────────────┬──────────────────────────────────────────────────────┐       
  │ Worktree │    Tasks    │                         Touches                          │                      Depends on                      │       
  ├──────────┼─────────────┼──────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────┤       
  │ WT-G     │ 4C.3 + 4C.4 │ Stage9PromptSegmentation.tsx, Stage10FrameGeneration.tsx │ WT-B + WT-D + WT-E (all Stage 9/10 work settled)     │       
  ├──────────┼─────────────┼──────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────┤       
  │ WT-H     │ 4A.1        │ ALL Stage 6-12 components, replaces RearviewMirror.tsx   │ Everything (must be last — touches every stage file) │       
  └──────────┴─────────────┴──────────────────────────────────────────────────────────┴──────────────────────────────────────────────────────┘       
  Why Wave 3 is last:
  - 4C.3 (video prompt reacts to frame changes) crosses Stage 9 AND Stage 10 — needs both to be stable.
  - 4C.4 (reference image upload) modifies Stage 9 UI — cleaner after 4C.1 and 4C.5 have merged.
  - 4A.1 (Content Access Carousel) is the "big bang" — it replaces/extends the RearviewMirror and integrates into every stage from 6 to 12. This must   go last or it creates merge conflicts with literally everything.

  ---
  Blocked/Deferred Items
  Task: 4C.2 (Assets alongside prompts)
  Issue: Depends on 3B.9 (Shot Presence Flags) which is NOT done
  Recommendation: Either: (a) do 3B.9 first as a quick WT in Wave 1, or (b) defer 4C.2 to Wave 3 with a simplified version that shows all scene      
  assets
     without per-shot filtering
  ────────────────────────────────────────
  Task: 4B.6 (Extend Shot)
  Issue: Research task, no code
  Recommendation: Do anytime as a research spike — not a worktree task. Just document findings.
  ---
  Visual Summary

  WAVE 1 (parallel)          WAVE 2 (parallel)          WAVE 3 (parallel)
  ┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
  │ WT-A             │       │ WT-D             │       │ WT-G             │
  │ 4B.1+4B.2+4B.3  │       │ 4D.1 + 4D.2      │       │ 4C.3 + 4C.4      │
  │ +4B.5            │       │ (Stage 10 frames) │       │ (Stage 9 UI      │
  │ (Stage 6/7 UI)  │       │                  │       │  enhancements)   │
  ├──────────────────┤       ├──────────────────┤       ├──────────────────┤
  │ WT-B             │──────▶│ WT-E             │──────▶│ WT-H             │
  │ 4C.1             │       │ 4C.5             │       │ 4A.1             │
  │ (Structured      │       │ (Prompt chaining) │       │ (Content Access  │
  │  Prompts)        │       │                  │       │  Carousel)       │
  ├──────────────────┤       ├──────────────────┤       │ *** LAST ***     │
  │ WT-C             │       │ WT-F             │       └──────────────────┘
  │ 4D.3             │       │ 4E.1             │
  │ (Stage 12        │       │ (Adaptive asset  │
  │  Timeline)       │       │  descriptions)   │
  └──────────────────┘       └──────────────────┘

  Standalone anytime: 4B.6 (research), 4C.2 (blocked on 3B.9)

  Key Takeaways

  1. Max parallelism is 3 worktrees per wave — constrained by file overlap in Stage 9 components and contextManager.ts.
  2. 4A.1 (Content Access) is the anchor — it must be the absolute last thing to merge because it touches every single stage component.
  3. 4C.1 (Structured Prompts) is the keystone — Wave 2's 4C.5 and 4E.1 both depend on it landing cleanly. Prioritize getting WT-B right.
  4. Wave 1 is your biggest bang — WT-A (4 tasks), WT-B (1 large task), and WT-C (1 large task) can all start immediately with zero risk of merge    
  conflicts.
  5. 4C.2 is blocked on 3B.9 (Shot Presence Flags) from Phase 3. Decide whether to squeeze 3B.9 into Wave 1 or defer 4C.2.
