2A.2 — Stage Opening System Fix
**Tickets**: UI-1
**Priority**: BLOCKING UX

**Purpose**: Fix the system that automatically skips ahead one stage when opening projects.

**Problem/Context**: When opening a project, the system skips ahead one stage from where the user left off. Should open to the exact stage the user was last on. Refreshing a project that was on Stage 6 loads Stage 5 instead. Users can't return to their actual current stage and are forced to work ahead.

**Core Features:**
- [ ] Fix current stage detection logic based on completion status
- [ ] Handle edge cases: partial completion, locked stages, production cycle scenes
- [ ] Respect user's last active stage
- [ ] Update ProjectView URL persistence to include exact stage
- [ ] Add localStorage backup for stage position
- [ ] Fix validation logic that incorrectly forces advancement


Plan:
 Ready to code?

 Here is Claude's plan:
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌ 2A.2 — Stage Opening System Fix

 Context

 When opening or refreshing a project, the app shows the wrong stage. Two symptoms:
 1. Skips ahead: A project with Stage 3 in-progress opens on Stage 4 (off-by-one)
 2. Falls back: A project on Stage 6+ can get reset to Stage 5 (Phase A cap)

 Root causes are a race condition between URL restoration and DB hydration effects, plus an off-by-one that doesn't distinguish       
 locked (completed) vs draft (in-progress) stages.

 ---
 Files to Modify

 1. src/pages/ProjectView.tsx — primary fix (3 effects + 1 ref)
 2. backend/src/routes/projects.ts — consistency fix (3 endpoints)

 ---
 Changes

 1. ProjectView.tsx — Add isHydrated ref (line ~54)

 Add a ref to track when DB stage data has been applied. Reset alongside hasRestoredStage:

 const isHydrated = useRef(false);

 Reset in the projectId change effect (line ~148):
 hasRestoredStage.current = false;
 isHydrated.current = false;

 2. ProjectView.tsx — Fix hasRestoredStage for URL-sourced stages (lines 210-224)

 Currently hasRestoredStage.current = true is only set when !stageFromUrl. It should ALWAYS be set when a stage is successfully       
 restored, including from URL. Change both branches:

 if (persistedStage !== null && persistedStage !== currentStage) {
   if (persistedStage > 5) {
     setCurrentStage(persistedStage);
     if (persistedSceneId && persistedStage >= 7) { ... }
     hasRestoredStage.current = true;   // <-- was: if (!stageFromUrl)
     return;
   }
   setCurrentStage(persistedStage);
   hasRestoredStage.current = true;     // <-- was: if (!stageFromUrl)
 } else if (persistedStage === currentStage) {
   hasRestoredStage.current = true;     // <-- was: if (!stageFromUrl)
 }

 3. ProjectView.tsx — Fix hydration effect (lines 227-288)

 Replace the hydration logic with:

 - Separate tracking of highestLockedStage and highestDraftStage
 - Run-once guard: if (isHydrated.current) return; to prevent re-hydration loops
 - Respect restored stage: check hasRestoredStage.current before overriding
 - Correct derivation: draft stage = stay there; locked-only = advance to next

 useEffect(() => {
   if (projectId === 'new') return;
   if (isLoadingStates || stageStates.length === 0) return;
   if (isHydrated.current) return;  // Only hydrate once

   let highestLockedStage = 0;
   let highestDraftStage = 0;

   const updatedStages = initialPhaseAStages.map(stageProgress => {
     const stageState = stageStates.find(s => s.stage_number === stageProgress.stage);
     if (stageState) {
       if (stageState.status === 'locked') {
         highestLockedStage = Math.max(highestLockedStage, stageProgress.stage);
         return { ...stageProgress, status: 'locked' as StageStatus };
       } else if (stageState.status === 'draft') {
         highestDraftStage = Math.max(highestDraftStage, stageProgress.stage);
         return { ...stageProgress, status: 'active' as StageStatus };
       } else if (stageState.status === 'outdated') {
         return { ...stageProgress, status: 'outdated' as StageStatus };
       }
     }
     return stageProgress;
   });

   // Derive the correct stage: stay on draft, or advance past locked
   const derivedStage = highestDraftStage > 0
     ? highestDraftStage
     : Math.min(highestLockedStage + 1, 5);

   // Phase B: keep current stage, just update the stages array
   if (currentStage > 5) {
     setStages(updatedStages);
     isHydrated.current = true;
     return;
   }

   // If stage was restored from URL/localStorage, validate and keep it
   const maxAllowedStage = Math.min(
     Math.max(highestLockedStage, highestDraftStage) + 1, 5
   );

   if (hasRestoredStage.current && currentStage >= 1 && currentStage <= maxAllowedStage) {
     const finalStages = updatedStages.map(s =>
       s.stage === currentStage && s.status === 'pending'
         ? { ...s, status: 'active' as StageStatus } : s
     );
     setStages(finalStages);
     persistStage(currentStage);
     isHydrated.current = true;
     return;
   }

   // No valid restored stage — use derived stage
   const finalStages = updatedStages.map(s =>
     s.stage === derivedStage && s.status !== 'locked' && s.status !== 'outdated'
       ? { ...s, status: 'active' as StageStatus } : s
   );
   setStages(finalStages);
   setCurrentStageWithPersistence(derivedStage);
   isHydrated.current = true;
 }, [stageStates, isLoadingStates, projectId, currentStage]);

 4. ProjectView.tsx — Guard navigation effect (lines 290-311)

 Add early return before hydration completes to prevent premature redirects:

 useEffect(() => {
   if (currentStage > 5) return;
   if (!isHydrated.current) return;  // <-- NEW: wait for hydration
   // ... rest of existing logic unchanged ...
 }, [stages, currentStage]);

 5. backend/src/routes/projects.ts — Fix list endpoint (lines 80-84)

 Account for draft stages in the currentStage calculation:

 const lockedStages = stages.filter((s: StageStateRow) => s.status === 'locked');
 const draftStages = stages.filter((s: StageStateRow) => s.status === 'draft');
 const highestLockedStage = lockedStages.length > 0
   ? Math.max(...lockedStages.map((s: StageStateRow) => s.stage_number)) : 0;
 const highestDraftStage = draftStages.length > 0
   ? Math.max(...draftStages.map((s: StageStateRow) => s.stage_number)) : 0;
 const currentStage = highestDraftStage > 0
   ? highestDraftStage
   : Math.min(highestLockedStage + 1, 5);

 6. backend/src/routes/projects.ts — Fix GET /:id endpoint (line 183)

 Replace currentStage: 1 with a proper calculation. Add a query for stage states before the transform:

 const { data: stageStatesData } = await supabase
   .from('stage_states')
   .select('stage_number, status')
   .eq('branch_id', project.active_branch_id);

 const lockedStages = (stageStatesData || []).filter(s => s.status === 'locked');
 const draftStages = (stageStatesData || []).filter(s => s.status === 'draft');
 const highestLockedStage = lockedStages.length > 0
   ? Math.max(...lockedStages.map(s => s.stage_number)) : 0;
 const highestDraftStage = draftStage
 s.length > 0
   ? Math.max(...draftStages.map(s => s.stage_number)) : 0;
 const currentStage = highestDraftStage > 0
   ? highestDraftStage
   : Math.min(highestLockedStage + 1, 5);

 Then use currentStage in the transform instead of hardcoded 1.

 7. backend/src/routes/projects.ts — Fix PUT /:id endpoint (line 413)

 Same pattern as Change 6 — query stage states after update and calculate currentStage properly instead of hardcoding 1.

 ---
 Verification

 1. Refresh on Phase A stage: Navigate to Stage 3 (with stages 1-2 locked), refresh → should stay on Stage 3
 2. Refresh on Phase B stage: Navigate to Stage 6 (Script Hub), refresh → should stay on Stage 6
 3. Refresh with scene context: Navigate to Stage 8 with a scene, refresh → should stay on Stage 8 with scene
 4. Draft stage preservation: Open project with stages 1-3 locked, stage 4 in draft → should open on Stage 4 (not 5)
 5. New project: Open a new project → should start on Stage 1
 6. All locked: Open project with all 5 stages locked → should open on Stage 5
 7. No stage data: Open project with no stage records → should open on Stage 1
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌