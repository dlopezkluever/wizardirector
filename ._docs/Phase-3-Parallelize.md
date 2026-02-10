 Phase 3 Parallel Build Analysis

  Dependency Graph

  Here's every task with its internal Phase 3 dependencies and primary files touched:

  3A — Stage 5 Extraction Revolution
  Task: 3A.1
  Depends On (Phase 3): None (foundation)
  Primary Files: assetExtractionService.ts, projectAssets.ts (route), Stage5Assets.tsx, projectAssetService.ts, asset.ts, scenes   
    table migration
  ────────────────────────────────────────
  Task: 3A.2
  Depends On (Phase 3): 3A.1
  Primary Files: projectAssets.ts, Stage5Assets.tsx, asset.ts, DB migration
  ────────────────────────────────────────
  Task: 3A.3
  Depends On (Phase 3): 3A.1
  Primary Files: projectAssets.ts, Stage5Assets.tsx, projectAssetService.ts
  ────────────────────────────────────────
  Task: 3A.4
  Depends On (Phase 3): 3A.1
  Primary Files: projectAssets.ts (gatekeeper), Stage5Assets.tsx, asset.ts
  ────────────────────────────────────────
  Task: 3A.5
  Depends On (Phase 3): 3A.1
  Primary Files: asset.ts (new type), assetExtractionService.ts, projectAssets.ts, Stage5Assets.tsx
  ────────────────────────────────────────
  Task: 3A.6
  Depends On (Phase 3): 3A.4
  Primary Files: projectAssets.ts, Stage5Assets.tsx, projectAssetService.ts
  ────────────────────────────────────────
  Task: 3A.7
  Depends On (Phase 3): 3A.1
  Primary Files: projectAssets.ts, new LLM service, Stage5Assets.tsx
  ────────────────────────────────────────
  Task: 3A.8
  Depends On (Phase 3): 2A.1 only
  Primary Files: styleCapsuleService.ts, StyleCapsuleSelector.tsx, ImageGenerationService.ts, Stage5Assets.tsx
  ────────────────────────────────────────
  Task: 3A.9
  Depends On (Phase 3): 2B.5 only
  Primary Files: Stage5Assets.tsx (capsule selection area), projectAssets.ts
  3B — Stage 8 UX Overhaul
  Task: 3B.1
  Depends On (Phase 3): None (foundation)
  Primary Files: New DB migration, sceneAssets.ts (route), VisualStateEditorPanel.tsx, scene.ts, sceneAssetService.ts,
    ImageGenerationService.ts
  ────────────────────────────────────────
  Task: 3B.2
  Depends On (Phase 3): 3B.1
  Primary Files: sceneAssets.ts, VisualStateEditorPanel.tsx, sceneAssetService.ts
  ────────────────────────────────────────
  Task: 3B.3
  Depends On (Phase 3): 3B.1
  Primary Files: sceneAssets.ts, VisualStateEditorPanel.tsx, sceneAssetService.ts
  ────────────────────────────────────────
  Task: 3B.4
  Depends On (Phase 3): None
  Primary Files: VisualStateEditorPanel.tsx, sceneAssets.ts, sceneAssetService.ts
  ────────────────────────────────────────
  Task: 3B.5
  Depends On (Phase 3): 3B.4
  Primary Files: Stage8VisualDefinition.tsx (gatekeeper), sceneAssets.ts
  ────────────────────────────────────────
  Task: 3B.6
  Depends On (Phase 3): 3A.1
  Primary Files: Stage8VisualDefinition.tsx, SceneAssetListPanel.tsx
  ────────────────────────────────────────
  Task: 3B.7
  Depends On (Phase 3): 3A.1
  Primary Files: sceneAssets.ts, SceneAssetListPanel.tsx, sceneAssetService.ts
  ────────────────────────────────────────
  Task: 3B.8
  Depends On (Phase 3): 3A.1
  Primary Files: New DB migration, sceneAssets.ts, sceneAssetRelevanceService.ts, SceneAssetListPanel.tsx
  ────────────────────────────────────────
  Task: 3B.9
  Depends On (Phase 3): (shot list data)
  Primary Files: SceneAssetListPanel.tsx, sceneAssets.ts
  ────────────────────────────────────────
  Task: 3B.10
  Depends On (Phase 3): (shot list data)
  Primary Files: scene_asset_instances migration, sceneAssets.ts, VisualStateEditorPanel.tsx
  ────────────────────────────────────────
  Task: 3B.11
  Depends On (Phase 3): 3B.2
  Primary Files: Stage8VisualDefinition.tsx (rearview), sceneAssets.ts
  3C — Asset Architecture & Data Flow
  Task: 3C.1
  Depends On (Phase 3): 3A.1
  Primary Files: ImageGenerationService.ts (prompt injection), asset.ts
  ────────────────────────────────────────
  Task: 3C.2
  Depends On (Phase 3): 3C.1, 3B.10
  Primary Files: ImageGenerationService.ts, projectAssets.ts, new DB schema, Stage5Assets.tsx
  ────────────────────────────────────────
  Task: 3C.3
  Depends On (Phase 3): 3B.1
  Primary Files: assetInheritanceService.ts, sceneAssets.ts, new timeline UI, scene.ts
  ────────────────────────────────────────
  Task: 3C.4
  Depends On (Phase 3): 3A.1, 3C.3
  Primary Files: contextManager.ts (mostly unique file)
  ────────────────────────────────────────
  Task: 3C.5
  Depends On (Phase 3): None
  Primary Files: Stage1InputMode.tsx, project.ts, ImageGenerationService.ts, frameGenerationService.ts, videoGenerationService.ts, 
    projects table migration
  ---
  File Hotspot Analysis

  These files are touched by many tasks — building tasks that share hotspot files in separate worktrees causes painful merge       
  conflicts:
  ┌─────────────────────────────────────┬───────────────────────────────────────┐
  │            Hotspot File             │         Tasks That Modify It          │
  ├─────────────────────────────────────┼───────────────────────────────────────┤
  │ Stage5Assets.tsx (918 ln)           │ 3A.1–3A.9 (all 9 Stage 5 tasks)       │
  ├─────────────────────────────────────┼───────────────────────────────────────┤
  │ projectAssets.ts route (1503 ln)    │ 3A.1–3A.7, 3A.9, 3C.2                 │
  ├─────────────────────────────────────┼───────────────────────────────────────┤
  │ VisualStateEditorPanel.tsx (324 ln) │ 3B.1, 3B.2, 3B.3, 3B.4, 3B.10         │
  ├─────────────────────────────────────┼───────────────────────────────────────┤
  │ sceneAssets.ts route (486 ln)       │ 3B.1–3B.11 (nearly all Stage 8 tasks) │
  ├─────────────────────────────────────┼───────────────────────────────────────┤
  │ SceneAssetListPanel.tsx (502 ln)    │ 3B.6, 3B.7, 3B.8, 3B.9                │
  ├─────────────────────────────────────┼───────────────────────────────────────┤
  │ ImageGenerationService.ts (708 ln)  │ 3A.8, 3C.1, 3C.2, 3C.5                │
  └─────────────────────────────────────┴───────────────────────────────────────┘
  Key insight: Stage 5 files (3A group) and Stage 8 files (3B group) are almost entirely disjoint. They can safely be built in     
  parallel worktrees. 3C tasks touch unique files (contextManager.ts, assetInheritanceService.ts, frameGenerationService.ts) and   
  can also run in parallel.

  ---
  Recommended Build Strategy

  Round 1 — Foundations (3 parallel worktrees)
  Worktree: WT-1
  Tasks (sequential within): 3A.1
  Files: Stage 5 extraction core
  Rationale: THE critical path — 14 other tasks depend on this
  ────────────────────────────────────────

  Worktree: WT-2
  Tasks (sequential within): 3B.1 → 3B.4
  Files: Stage 8 carousel + editor panel
  Rationale: Stage 8 foundation; 3B.4 has zero deps, 3B.1 is the other big foundation piece
  ────────────────────────────────────────
  Worktree: WT-3
  Tasks (sequential within): 3C.5
  Files: Stage 1, frame/video services
  Rationale: 100% independent — touches zero files that overlap with WT-1 or WT-2
  Merge order: WT-3 first (lowest risk), then WT-2, then WT-1
  ---
  Tweener: Add the tv icon before the 16:9 
  ---
  Round 2 — Core Features (3 parallel worktrees)
  Worktree: WT-4
  Tasks (sequential within): 3A.2 → 3A.3 → 3A.4 → 3A.6
  Files: Stage 5 files
  Rationale: Natural chain: sidelined → manual add → optional images → delete image. All modify Stage5Assets.tsx + projectAssets.ts
  ────────────────────────────────────────
  Worktree: WT-5
  Tasks (sequential within): 3B.2 → 3B.3 → 3B.5
  Files: Stage 8 editor panel + gatekeeper
  Rationale: Carousel extensions + upload + requirement fix. All modify VisualStateEditorPanel.tsx
  ────────────────────────────────────────
  Worktree: WT-6
  Tasks (sequential within): 3C.3 → 3C.4
  Files: assetInheritanceService.ts, contextManager.ts
  Rationale: Unique files — zero overlap with WT-4 or WT-5. Inheritance chain feeds into context manager
  Merge order: WT-6 first (unique files), then WT-5, then WT-4

  ---
  Round 3 — Enhancements (3 parallel worktrees)
  Worktree: WT-7
  Tasks (sequential within): 3A.5 → 3A.7 → 3A.8 → 3A.9
  Files: Stage 5 + style capsule files
  Rationale: Extras archetypes → image description extraction → style capsule investigation → locking fix. Completes all Stage 5   
    work
  ────────────────────────────────────────
  Worktree: WT-8
  Tasks (sequential within): 3B.6 → 3B.7 → 3B.8 → 3B.9
  Files: SceneAssetListPanel.tsx, sceneAssets.ts
  Rationale: Button fix → remove assets → persist suggestions → shot flags. All share the list panel
  ────────────────────────────────────────
  Worktree: WT-9
  Tasks (sequential within): 3B.10 → 3B.11
  Files: VisualStateEditorPanel.tsx, rearview
  Rationale: Camera angle metadata → rearview incomplete scenes. Different file zone from WT-8
  Merge order: WT-9 first, then WT-8, then WT-7

  ---
  Round 4 — Final (1 worktree)
  ┌──────────┬───────────────────┬──────────────────────────────────┬─────────────────────────────────────────────────────────────┐  │ Worktree │ Tasks (sequential │              Files               │                          Rationale                          │  │          │      within)      │                                  │                                                             │  ├──────────┼───────────────────┼──────────────────────────────────┼─────────────────────────────────────────────────────────────┤  │ WT-10    │ 3C.1 → 3C.2       │ ImageGenerationService.ts, new   │ Transparent backgrounds → multi-angle generation. Must wait │  │          │                   │ DB schema                        │  for 3A.1 (asset types) and 3B.10 (camera angle metadata)   │  └──────────┴───────────────────┴──────────────────────────────────┴─────────────────────────────────────────────────────────────┘  ---
  Visual Dependency & Parallelism Map

  ROUND 1 (parallel)          ROUND 2 (parallel)           ROUND 3 (parallel)         ROUND 4
  ─────────────────           ──────────────────           ──────────────────         ─────────

  WT-1: [3A.1] ───────────┬── WT-4: [3A.2→3A.3→3A.4→3A.6] ── WT-7: [3A.5→3A.7→3A.8→3A.9]
                          │
                          ├── WT-6: [3C.3→3C.4]
                          │
  WT-2: [3B.1→3B.4] ──────┼── WT-5: [3B.2→3B.3→3B.5]      ── WT-8: [3B.6→3B.7→3B.8→3B.9]
                          │
                          │                                ── WT-9: [3B.10→3B.11]  ── WT-10: [3C.1→3C.2]
                          │
  WT-3: [3C.5] ───────────┘

  Summary Stats
  ┌───────────────────────────────┬──────────────────────────────────────────────────────────────────────────────────────────┐     
  │            Metric             │                                          Value                                           │     
  ├───────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤     
  │ Total tasks                   │ 25                                                                                       │     
  ├───────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤     
  │ Rounds needed                 │ 4                                                                                        │     
  ├───────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤     
  │ Max parallelism               │ 3 worktrees                                                                              │     
  ├───────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤     
  │ Critical path                 │ 3A.1 → 3A.2→...→3A.6 → 3A.5→...→3A.9 (9 tasks, longest chain)                            │     
  ├───────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤     
  │ Biggest time saver            │ Running Stage 5 (WT-1/4/7) alongside Stage 8 (WT-2/5/8) — they share almost no files     │     
  ├───────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤     
  │ Riskiest merge                │ WT-7 into main after WT-4 (both heavily modify Stage5Assets.tsx) — do these back-to-back │     
  ├───────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤     
  │ Safest parallel pair          │ WT-3 (3C.5) with anything — it touches completely unique files                           │     
  ├───────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤     
  │ WT-6 (3C.3/3C.4) is also safe │ assetInheritanceService.ts and contextManager.ts are only touched by these tasks         │     
  └───────────────────────────────┴──────────────────────────────────────────────────────────────────────────────────────────┘     


Excellent, now do you forsee me having the ability to get started on the following: 'c:/Users/Daniel                             
  Lopez/Desktop/Aiuteur/wizardirector/._docs/locking-fixes-task-info.md' or do i need to wait for that to be finished before i     
   can proceed                                                                                                                     

● Read 1 file (ctrl+o to expand)

● Now let me quickly check which locking-related code would overlap with Phase 3.

● Explore(Explore locking system code)
  ⎿  Done (32 tool uses · 44.5k tokens · 2m 43s)

● Good news — you can start the 2B locking work in parallel with Phase 3 Round 1. Here's the overlap analysis:

  File Overlap Between 2B Locking and Phase 3
  ┌────────────────────────────┬───────────────────────────────────────┬─────────────────────────────────────┬────────────────────┐  │        Shared File         │              2B Touches               │           Phase 3 Touches           │   Conflict Risk    │  ├────────────────────────────┼───────────────────────────────────────┼─────────────────────────────────────┼────────────────────┤  │ Stage5Assets.tsx           │ Lock button/gatekeeper bar            │ Extraction UI, asset management     │ Low — different    │  │                            │ (top/bottom ~30 lines)                │ (body ~500+ lines)                  │ sections           │  ├────────────────────────────┼───────────────────────────────────────┼─────────────────────────────────────┼────────────────────┤  │ Stage8VisualDefinition.tsx │ Navigation/lock flow, gatekeeper      │ Asset content panels                │ Low — different    │  │                            │                                       │                                     │ sections           │  ├────────────────────────────┼───────────────────────────────────────┼─────────────────────────────────────┼────────────────────┤  │ ProjectView.tsx            │ Navigation hydration, stage guards    │ Not touched by Phase 3              │ None               │  ├────────────────────────────┼───────────────────────────────────────┼─────────────────────────────────────┼────────────────────┤  │ stageStateService.ts       │ Core overhaul target                  │ Used but not modified               │ None               │  ├────────────────────────────┼───────────────────────────────────────┼─────────────────────────────────────┼────────────────────┤  │ useStageState.ts           │ Core overhaul target                  │ Used but not modified               │ None               │  └────────────────────────────┴───────────────────────────────────────┴─────────────────────────────────────┴────────────────────┘  The locking work lives in the "frame" of each stage (header lock button, navigation guards, state persistence, warning dialogs), 
  while Phase 3 lives in the "content" (extraction, carousels, asset management). They're mostly orthogonal.

  Recommended Approach

  START NOW (parallel):
  ├── 2B Worktree:  [2B.1 → 2B.2 → 2B.4]   (locking overhaul)
  ├── WT-1:         [3A.1]                     (two-pass extraction)
  ├── WT-2:         [3B.1 → 3B.4]             (carousel + use master as-is)
  └── WT-3:         [3C.5]                     (aspect ratio)

  MERGE 2B BEFORE Phase 3 Round 2

  Why merge 2B before Round 2

  Three Phase 3 tasks directly modify gatekeeper/locking rules — the same system 2B is restructuring:

  - 3A.4 (Assets Don't Require Images) — changes Stage 5 gatekeeper conditions
  - 3B.5 (Generation Requirement Fix) — changes Stage 8 gatekeeper conditions
  - 3A.9 (Capsule Locking Less Restrictive) — explicitly depends on 2B.5 (post-lock edit foundations)

  These all land in Round 2 or 3, so you have time. As long as 2B merges before you start those specific tasks, you're clean.      

  One caveat

  The doc references 2B.5 (post-lock edit foundations) as a dependency for 3A.9, but it's not in your locking-fixes doc (which only   has 2B.1, 2B.2, 2B.4). Either 2B.5 is a separate task you still need to scope, or it's been absorbed into 2B.4. Worth clarifying   before Round 3 when 3A.9 comes up.

  Bottom line: Start 2B now alongside Phase 3 Round 1. No blockers.