
#### 4A.1 — Multi-Tab Content Access Carousel
**Tickets**: Multi-stage rearview enhancement, OT-2
**Priority**: HIGH

**Purpose**: Build a comprehensive content access space that replaces the simple rearview mirror, giving users immediate visual access to information from previous stages without leaving the current workspace.

**Problem/Context**: The rearview mirror in its current form may not be useful enough (OT-2). Users working in Stages 6–12 constantly need to reference their script, shot list, and previous scene work. Currently they have to navigate away to check this information. The Content Access Space solves this with a multi-tab carousel.

**Core Features:**
- [ ] **Tab 1 — Rearview Mirror**: Existing content (previous scene's frames/assets)
- [ ] **Tab 2 — Script Excerpt**: Scrollable script content for the current scene (from Stage 4 Master Script), in proper script format so users can read and remember where they are in the story
- [ ] **Tab 3 — Shot List Carousel**: Cycle through all shots in the scene with up/down arrows (a carousel within the carousel — main Content Access arrows are left/right, shot cycling is up/down)
- [ ] **Collapsible Pulldown Curtain Behavior**:
  - Collapse/expand toggle
  - Click-and-drag to resize the content area (pulldown curtain)
  - User controls how much screen space it takes
- [ ] **Present throughout Stages 6–12** of the production cycle
- [ ] Smooth carousel transitions between tabs

**Dependencies**: Phase 3 asset system (for rearview data quality).


# User raw ideas: 
## Regarding Issues that cover Multiple Stages

### (For Stages 7-12) Enhance the Rearview Mirror to be a multiple function Content Acees space,
 which will house the rearvier mirror as is currently implemented in som estages, but with carasoul functionality to switch to cards/views with 1. Script Excert for the Scene (stages 7-12) & the Shot list (not present for stage 7, only 8-12) (actually im not sure its needed for stage 12)
A dropdown or collapsable window that gives users immediate visual access to information from previous stages without leaving the current workspace. Should be present throughout the production cycle (Stages 6-12). Functionality: cycle through information from Stage 4 (Master Script), Stage 7 (Shot List), and script excerpts. **Proposed enhancement:** Make the rearview mirror a carousel itself where you can switch tabs/cards between:
1. Existing rearview mirror contents (previous scene's frames/assets)
2. Script excerpt for the current scene (in script format)
3. Shot list (with ability to cycle through all shots in the scene (like a carsoual within a casoul; it's arrows will be up and down to cycle through the shots, while the main Content Access))

So to be clear, the script excerpt section is accessible in the same collapable section that the rearview mirror is in currently, accessible with pressing the carasoul arrow, which will slide the content like a carasoult ot show the excerpt of the script relavent for the scnene; a scrollable content, litterally with the script from stage 4, and the user can read to remeber where he is in the story. 


Collapsable functionality — extendable like a pulldown curtain (Outside of simply collapsing/opening this tab, the content should be extendable by click and pull mouse action, so the user can extnd the amout of space it takes on the screen)

MORE INFO, REARVIEW MIRROR REVAMP: 
  Core Component to Extend
  ┌────────────────────────────────────────────┬───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
  │                    File                    │                                                             Relevance                                                             │
  ├────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ src/components/pipeline/RearviewMirror.tsx │ PRIMARY TARGET — The existing collapsible continuity panel. This gets replaced/evolved into the multi-tab Content Access Carousel │
  ├────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ src/components/ui/carousel.tsx             │ Embla Carousel primitives (Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext) — reuse for tab switching     │
  └────────────────────────────────────────────┴───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
  ---
  Stage Components That Consume RearviewMirror (need integration)
  ┌────────────────────────────────────────────────────┬───────────────────────────────────────────────────────────────────────┐
  │                        File                        │                             Current Usage                             │
  ├────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────┤
  │ src/components/pipeline/Stage7ShotList.tsx         │ Imports RearviewMirror, passes prior scene data (text or visual mode) │
  ├────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────┤
  │ src/components/pipeline/Stage8VisualDefinition.tsx │ Uses RearviewMirror via ContinuityHeader wrapper                      │
  ├────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────┤
  │ src/components/pipeline/Stage10FrameGeneration.tsx │ Imports RearviewMirror directly for visual continuity                 │
  └────────────────────────────────────────────────────┴───────────────────────────────────────────────────────────────────────┘
  Stages That Should Get the Content Access Panel (currently missing it)
  ┌──────────────────────────────────────────────────────┬────────────────────────────────────────────────────────────────────────────┐
  │                         File                         │                                   Notes                                    │
  ├──────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────┤
  │ src/components/pipeline/Stage6ScriptHub.tsx          │ Entry point to scene workflow; already shows scriptExcerpt in detail panel │
  ├──────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────┤
  │ src/components/pipeline/Stage9PromptSegmentation.tsx │ Shows per-shot context but no rearview mirror                              │
  ├──────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────┤
  │ src/components/pipeline/Stage11Confirmation.tsx      │ No content access panel currently                                          │
  ├──────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────┤
  │ src/components/pipeline/Stage12VideoGeneration.tsx   │ No content access panel currently                                          │
  └──────────────────────────────────────────────────────┴────────────────────────────────────────────────────────────────────────────┘
  ---
  Data Sources
  ┌──────────────────────────────────┬──────────────────────────────────────────────────────────────────────────────────────────────────┐
  │               File               │                                         What It Provides                                         │
  ├──────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ src/lib/services/sceneService.ts │ fetchScenes() → scriptExcerpt, priorSceneEndState, endFrameThumbnail, header, openingAction      │
  ├──────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ src/lib/services/shotService.ts  │ fetchShots() → shot list data (action, dialogue, camera, duration, characters)                   │
  ├──────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ src/types/scene.ts               │ Scene interface with scriptExcerpt, header, openingAction, priorSceneEndState, endFrameThumbnail │
  └──────────────────────────────────┴──────────────────────────────────────────────────────────────────────────────────────────────────┘
  ---
  Styling & UI Primitives
  ┌───────────────────────────────────┬──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
  │               File                │                                                      Relevance                                                       │
  ├───────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ src/styles/screenplay.css         │ Screenplay format styles (scene headings, action, dialogue, transitions) — needed for Tab 2 script excerpt rendering │
  ├───────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ src/components/ui/carousel.tsx    │ Embla carousel (horizontal left/right) — use for main tab switching                                                  │
  ├───────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ src/components/ui/scroll-area.tsx │ ScrollArea component — needed for scrollable script excerpt                                                          │
  └───────────────────────────────────┴──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
  ---
  Existing Carousel Patterns to Reference
  ┌──────────────────────────────────────────────────────────────┬─────────────────────────────────────────────────────┐
  │                             File                             │                       Pattern                       │
  ├──────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────┤
  │ src/components/pipeline/Stage8/GenerationAttemptCarousel.tsx │ Carousel with counter display, navigation arrows    │
  ├──────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────┤
  │ src/components/pipeline/Stage8/MasterReferenceCarousel.tsx   │ Carousel with labeled slides, active state tracking │
  └──────────────────────────────────────────────────────────────┴─────────────────────────────────────────────────────┘
  ---
  Supporting Infrastructure
  ┌─────────────────────────────────────────────────┬───────────────────────────────────────────────────────────────────────────────────┐
  │                      File                       │                                       Role                                        │
  ├─────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────┤
  │ src/lib/hooks/useSceneStageLock.ts              │ Shared hook across stages 6-12 — useful for knowing which stage data is available │
  ├─────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────┤
  │ src/components/pipeline/LockedStageHeader.tsx   │ Shared header component across stages — the content access panel sits below this  │
  ├─────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────┤
  │ src/components/pipeline/UnlockWarningDialog.tsx │ Used alongside locked headers                                                     │
  ├─────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────┤
  │ src/components/pipeline/FramePanel.tsx          │ Frame display component (Stage 10) — context for visual tab                       │
  └─────────────────────────────────────────────────┴───────────────────────────────────────────────────────────────────────────────────┘
  ---
  Key Architecture Notes

  - RearviewMirror is the single file that becomes the multi-tab "Content Access Carousel"
  - Data flow pattern: Each stage fetches prior scene data via sceneService.fetchScenes(), finds the previous scene, and extracts endState/endFrame/scriptExcerpt
  - Tab 3 (Shot List) needs shotService.fetchShots() — currently only loaded inside Stage 7 itself, so the new component will need its own shot data fetch
  - Collapsible/resizable behavior — RearviewMirror already has expand/collapse with Framer Motion; the drag-to-resize ("pulldown curtain") is new functionality
  - Carousel-within-carousel — Main tabs use horizontal (left/right) arrows; shot list tab uses vertical (up/down) arrows — the Embla carousel supports orientation: 'vertical'
