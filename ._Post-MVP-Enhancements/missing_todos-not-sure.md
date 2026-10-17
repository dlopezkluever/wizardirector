# Missing Features from Old Tasklist

This document identifies features from the old tasklist that are not explicitly covered or are under-specified in the new MVP tasklist.

---

## Category 1: Asset State Evolution (Old Phase 5.4)

**Status**: Partially covered in new Phase 3.3 but lacks specificity

### Missing Implementation Details:
- [ ] **Asset State Change Detection**: Real-time detection when assets undergo visual changes mid-scene
  - Old tasklist had explicit "asset state change detection" system
  - New tasklist mentions "asset state evolution" but less detailed

- [ ] **Asset Change Logging System**: Comprehensive logging of all asset modifications
  - Track what changed, when, and why
  - Store change metadata for debugging and rollback

- [ ] **Visual Evolution Tracking**: Timeline view showing asset appearance changes across scenes
  - Old tasklist: "Build asset timeline view"
  - New tasklist: Phase 3.3 mentions "asset timeline view" but lacks implementation details

- [ ] **State Rollback Functionality**: Ability to revert asset to previous state
  - Old tasklist explicitly called for "Implement state rollback functionality"
  - New tasklist doesn't mention rollback for assets (only for branches)

**Recommendation**: Add explicit sub-tasks to Phase 3.3 for asset state logging and rollback.

---

## Category 2: Advanced UI/UX & Polish (Old Phase 11)

**Status**: Almost entirely missing from new tasklist

### Feature 11.1: Animations & Transitions
**Priority**: Medium (professional polish)
- [ ] Implement Framer Motion stage transitions
- [ ] Add micro-interactions (button hovers, clicks)
- [ ] Create loading state animations
- [ ] Build progress bar animations
- [ ] Add page transition effects

**Notes**: New tasklist has no mention of animation system. Framer Motion is installed but not systematically used.

### Feature 11.2: Keyboard Shortcuts
**Priority**: High (power user efficiency)
- [ ] Implement keyboard shortcut system
- [ ] Add stage navigation shortcuts (Ctrl+1-12, Ctrl+Left/Right)
- [ ] Create action shortcuts (Ctrl+S save, Ctrl+R regenerate, etc.)
- [ ] Build shortcut help modal (Ctrl+/)
- [ ] Add customizable key bindings

**Notes**: Keyboard shortcuts would significantly improve UX but are not mentioned in new tasklist.

### Feature 11.3: Onboarding & Tutorials
**Priority**: High (user retention)
- [ ] Create first-time user onboarding flow
- [ ] Build interactive tutorial overlays
- [ ] Implement contextual help tooltips
- [ ] Add video tutorial embeds
- [ ] Create example project templates

**Notes**: Critical for user acquisition but completely absent from new tasklist.

### Feature 11.4: Advanced Editing Tools
**Priority**: Medium
- [ ] Add markdown support in text editors
- [ ] Implement syntax highlighting for scripts
- [ ] Create collaborative editing (real-time)
- [ ] Build version diffing visualization
- [ ] Add advanced search across content

**Notes**: Some overlap with Phase 6.1 (visual diff) but most features missing.

### Feature 11.5: Mobile Responsiveness
**Priority**: Low (desktop-first product)
- [ ] Optimize layout for tablet screens
- [ ] Create mobile-friendly navigation
- [ ] Implement touch-optimized controls
- [ ] Add mobile-specific UI patterns
- [ ] Test across device sizes

**Notes**: Not mentioned in new tasklist. May be post-MVP scope.

**Recommendation**: Add "Phase 7: UX Polish & Onboarding" with Features 11.2 (keyboard shortcuts) and 11.3 (onboarding) as high priority.

---

## Category 3: Export & Project Finalization (Old Phase 12)

**Status**: Mentioned briefly in Phase 6.2 but lacks detail

### Feature 12.1: Video Export System (MVP Scope)
**Priority**: High (required for product completion)
- [ ] Implement high-bitrate video export
- [ ] Create project export API endpoint
- [ ] Build export job queue
- [ ] Add export format options (MP4 minimum, ProRes/WebM optional)
- [ ] Implement export progress tracking

**Notes**: New tasklist Phase 6.2 mentions "NLE integration (EDL/XML)" but doesn't explicitly cover basic video export implementation.

### Feature 12.2: NLE Integration (Post-MVP)
**Priority**: Medium (professional workflows)
- [ ] Generate EDL/XML files from scene sequence
- [ ] Implement standardized file naming
- [ ] Create folder structure for NLE import
- [ ] Add timecode generation
- [ ] Build markers for shot boundaries

**Notes**: Covered in new Phase 6.2 but worth calling out explicitly.

### Feature 12.3: Asset Package Export (Post-MVP)
**Priority**: Low
- [ ] Create ZIP archive generation
- [ ] Include all videos, frames, scripts
- [ ] Add project metadata file
- [ ] Implement selective export (choose artifacts)
- [ ] Build export history tracking

**Notes**: Partially covered in new Phase 6.2 "Asset package export (ZIP with organized files)".

### Feature 12.4: Audio Stems Separation (Post-MVP)
**Priority**: Low
- [ ] Implement dialogue track extraction
- [ ] Create SFX track separation
- [ ] Add music track export
- [ ] Build multi-track audio export
- [ ] Implement audio sync validation

**Notes**: Covered in new Phase 6.2 "Audio stems separation for mixing".

### Feature 12.5: Project Archival (Post-MVP)
**Priority**: Low
- [ ] Create project archive format
- [ ] Implement project backup system
- [ ] Add cloud storage integration (S3)
- [ ] Build project restoration from archive
- [ ] Implement version-specific archives

**Notes**: Not explicitly mentioned in new tasklist.

**Recommendation**: Add basic video export (Feature 12.1) to Phase 1 or Phase 5 as it's essential for MVP completion.

---

## Category 4: Invalidation Logic (Old Phase 10b.5)

**Status**: Under-specified in new tasklist

### Old Tasklist Feature 10.5: Invalidation Logic
**Priority**: High (cost management and consistency)
- [ ] Implement `invalidation_logs` table
- [ ] Build global invalidation logic (Phase A changes cascade to Phase B)
- [ ] Add local (scene) invalidation
- [ ] Create continuity break detection
- [ ] Implement cost estimation for invalidations

**Notes**: New tasklist mentions invalidation in passing but doesn't dedicate a feature to it. This is critical for:
- Preventing users from wasting credits on outdated content
- Tracking cascading changes from upstream stages
- Estimating cost of regenerating invalidated content

**Recommendation**: Add "Feature 4.4: Invalidation & Cascade Detection" to Phase 4 (Continuity & State Management).

---

## Category 5: LLM Service Integration & Observability (Old Phase 1.1)

**Status**: Assumed complete but worth validating

### Feature 1.1: LLM Service Integration & Observability
**Priority**: High (debugging and cost optimization)
- [ ] Set up LangSmith project and API keys
- [ ] Set up Gemini/OpenAI/Anthropic client wrapped with LangSmith tracer
- [ ] Create `llm-client.ts` service with retry logic
- [ ] Implement prompt template system (database-stored)
- [ ] Add token counting and cost estimation utilities
- [ ] Test LLM connectivity and verify trace appearance in LangSmith

**Notes**: New tasklist Phase 1.5 mentions "LangSmith tracing for all API calls" but doesn't explicitly cover initial setup. This may already be complete from old Phase 1.

**Recommendation**: Validate that LangSmith tracing is functional across all LLM calls.

---

## Category 6: Job Queue & Background Processing (Old Phase 9.2)

**Status**: Covered in Phase 1.4 but worth calling out

### Feature 9.2: Asynchronous Job System
**Priority**: High (required for video generation)
- [ ] Implement job queue (Bull/similar)
- [ ] Create background worker process
- [ ] Add job status tracking
- [ ] Build retry logic for failed jobs
- [ ] Implement job cancellation

**Notes**: New tasklist Phase 1.4 covers this under "Async Job System" but less detailed than old tasklist.

**Recommendation**: Ensure job cancellation and robust retry logic are explicitly included in Phase 1.4.

---

## Category 7: Context Management Enhancements (Old Phase 2.3)

**Status**: Covered in Phase 3.4 but worth emphasizing

### Feature 2.3: Context Management System
**Priority**: High (performance and correctness)
- [ ] Create Context Manager service class
- [ ] Implement global context assembly (Beat Sheet, Master Script summary)
- [ ] Add local context windowing for scenes
- [ ] Build context injection into LLM prompts
- [ ] Add context size monitoring and truncation

**Notes**: New tasklist Phase 3.4 "Context Manager Enhancement" covers this but with less emphasis on the service architecture.

**Recommendation**: Ensure Context Manager is a centralized service, not scattered logic.

---

## Category 8: Testing Infrastructure (Old Phase Implicitly Missing)

**Status**: Mentioned in Phase 5.4 but under-specified

### Old Tasklist: No explicit testing phase
### New Tasklist: Phase 5.4 - Testing Infrastructure

**Priority**: High (reliability and maintainability)

The new tasklist correctly adds comprehensive testing:
- [ ] Frontend Testing (React Testing Library)
- [ ] Integration Testing (Playwright/Cypress)
- [ ] Performance Testing
- [ ] Error Handling

**Notes**: This is an IMPROVEMENT over the old tasklist, which had no dedicated testing phase. Old tasklist scattered testing mentions ("Test LLM connectivity", "Test database connection") but no systematic approach.

**Recommendation**: Keep Phase 5.4 as-is. This is a positive addition.

---

## Priority Recommendations

### Must Add to New Tasklist:
1. **Basic Video Export (Feature 12.1)** → Add to Phase 5 or create "Phase 7: Export & Finalization"
2. **Keyboard Shortcuts (Feature 11.2)** → Add to Phase 5.3 (UX Polish)
3. **Onboarding & Tutorials (Feature 11.3)** → Add to Phase 5 or Phase 6
4. **Invalidation Logic (Feature 10.5)** → Add to Phase 4 as Feature 4.4

### Should Add to New Tasklist:
5. **Asset State Rollback** → Enhance Phase 3.3 with explicit rollback tasks
6. **Animations & Transitions (Feature 11.1)** → Add to Phase 5.3 (UX Polish)
7. **Job Cancellation** → Enhance Phase 1.4 with explicit cancellation logic

### Nice to Have (Post-MVP):
8. **Mobile Responsiveness (Feature 11.5)**
9. **Project Archival (Feature 12.5)**
10. **Advanced Editing Tools (Feature 11.4)**

---

## Summary

**Total Missing Features**: 10 major features (1-3 are critical, 4-7 are important, 8-10 are post-MVP)

**Most Critical Gap**: Basic video export system (Feature 12.1) is essential for MVP but not explicitly detailed in new tasklist.

**Second Most Critical Gap**: Onboarding/tutorials (Feature 11.3) are critical for user retention but completely absent.

**Biggest Improvement in New Tasklist**: Comprehensive testing infrastructure (Phase 5.4) is a major improvement over old tasklist.

---

**Document Version**: 1.0
**Created**: February 4, 2026
**Comparison**: old-tasklist.md vs MVP-tasklist.md
**Next Action**: Review and prioritize additions to MVP-tasklist.