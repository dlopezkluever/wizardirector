  Worktree: WT-9
  Tasks (sequential within): 3B.10 → 3B.11
  Files: VisualStateEditorPanel.tsx, rearview
  Rationale: Camera angle metadata → rearview incomplete scenes. Different file zone from WT-8
  Merge order: WT-9 first, then WT-8, then WT-7

    Task: 3B.10
  Depends On (Phase 3): (shot list data)
  Primary Files: scene_asset_instances migration, sceneAssets.ts, VisualStateEditorPanel.tsx
  ────────────────────────────────────────
  Task: 3B.11
  Depends On (Phase 3): 3B.2
  Primary Files: Stage8VisualDefinition.tsx (rearview), sceneAssets.ts

  

#### 3B.10 — Camera Angle Metadata
**Ticket**: 8.12
**Priority**: MEDIUM

**Purpose**: Inform frame generation about shot camera angles.

**Problem/Context**: If a shot is an aerial shot looking down, but scene instance images are all standard medium shots — how does frame generation handle this? Camera direction/angle metadata on scene instance images would help Stage 10 generate more accurate frames.

**Core Features:**
- [ ] Add camera angle metadata field to scene asset instances
- [ ] Populate from shot list camera directions (Stage 7)
- [ ] Pass metadata to frame generation prompts (Stage 10)
- [ ] UI for viewing/editing camera angle metadata

**Dependencies**: Shot list with camera directions (Stage 7 data).

**From Ticket.md**: ### 8.12 — Camera Angle Concern for Scene Instance Images
If a shot is an aerial shot looking down, but scene instance images are all standard medium shots — how does frame generation handle this? May need to add camera direction/angle metadata to scene instance images.

---

#### 3B.11 — Rearview Mirror for Incomplete Previous Scenes
**Ticket**: 8.3
**Priority**: LOW

**Purpose**: Show useful reference data even when previous scenes aren't complete.

**Problem/Context**: When no previous scene instance exists, Stage 8 shows nothing. Instead, it should show the latest assets from previous scenes — or even better, show each asset with their various previous modifications as a carousel, so an image could be pulled and become the new master reference.

**Core Features:**
- [ ] Show previous scene assets when no scene instance exists
- [ ] Carousel of previous scene instances per asset
- [ ] "Use as reference" action from rearview data
- [ ] Graceful fallback chain: scene instance → master asset → placeholder

**Dependencies**: 3B.2 (historical carousel).

**From Ticket.md**: ### 8.3 — Rearview Mirror Missing for Incomplete Previous Scenes
When no previous scene instance exists, instead show the latest assets from previous scenes — or even better, show each asset with their various previous modifications (previous scene instance images) as a carousel, so that image could be pulled and become the new master reference.
----