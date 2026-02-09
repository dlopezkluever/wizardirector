Worktree: WT-2
  Tasks (sequential within): 3B.1 → 3B.4
  Files: Stage 8 carousel + editor panel
  Rationale: Stage 8 foundation; 3B.4 has zero deps, 3B.1 is the other big foundation piece


### 3B — Stage 8 UX Overhaul

#### 3B.1 — Asset Generation Carousel
**Tickets**: 8.5, MVP v1.1 Feature 2.2
**Priority**: CRITICAL UX

**Purpose**: Allow users to compare and select from multiple generation attempts.

**Problem/Context**: Currently if regeneration produces a worse result, the user has no way to revert to the previous attempt. First try was good, second was worse, third was decent — user should be able to pick the first.

**Core Features:**
- [ ] **Generation History Storage**:
  - Store all generated images for each scene asset instance
  - Maintain generation metadata (timestamp, cost, prompt used)
  - Implement cleanup policy for storage management
- [ ] **Carousel UI Component**:
  - Display thumbnails of all generation attempts
  - Arrow controls to cycle through attempts
  - Show generation metadata on hover/selection
  - "Select This One" action to set as active scene instance image
- [ ] **Database Schema**:
  - Add `scene_asset_generation_attempts` table
  - Link to `scene_asset_instances` with generation history
  - Track selected attempt vs all attempts

**Dependencies**: None

---

#### 3B.2 — Master Reference Historical Carousel
**Tickets**: 8.6, MVP v1.1 Feature 2.3
**Priority**: CRITICAL UX

**Purpose**: Default master reference to most recent scene's instance, with historical navigation.

**Problem/Context**: Scene 4's master reference for the protagonist should default to Scene 3's scene instance image. Users should be able to carousel through and switch to older images (Scene 2, Scene 1, original Master Asset). Currently there's no scene-to-scene reference chain.

**Core Features:**
- [ ] Default master reference to most recent scene instance image
- [ ] Query previous scenes for selected scene instance images
- [ ] Build chronological reference chain
- [ ] Arrow controls: Master Asset → Scene 1 instance → Scene 2 instance → etc.
- [ ] Clear visual indication of current selection
- [ ] "Use This Reference" confirmation action
- [ ] First scene defaults to Master Asset image
- [ ] Skip scenes without generated instances
- [ ] Handle scene deletion/reordering

**Dependencies**: 3B.1 (carousel system should be built first for reuse).

---

#### 3B.3 — Manual Image Upload for Scene Instances
**Tickets**: 8.11, MVP v1.1 Feature 2.4
**Priority**: HIGH

**Purpose**: Allow users to upload custom images directly for scene-specific assets.

**Problem/Context**: Users may have images they want to use directly rather than relying on generation. There's no upload capability in Stage 8.

**Core Features:**
- [ ] File upload component in Stage 8 visual state editor
- [ ] Support standard image formats (PNG, JPG, WebP)
- [ ] Image validation, resize, and optimization
- [ ] Store in Supabase Storage with proper naming
- [ ] Include uploaded images in generation attempts carousel
- [ ] Allow mixing uploaded + generated images
- [ ] Proper metadata tracking for uploads

**Dependencies**: 3B.1 (carousel system for integration).

---

#### 3B.4 — "Use Master As-Is" Option
**Tickets**: 8.4, MVP v1.1 Feature 2.1
**Priority**: HIGH

**Purpose**: Allow users to skip scene instance generation entirely and use the master reference directly.

**Problem/Context**: Users shouldn't be forced to generate a new scene instance image. If the master reference works for the scene, they should be able to use it directly. This saves time, money, and creative energy.

**Core Features:**
- [ ] Pre-selected "Use Master Asset As-Is" checkbox in Stage 8
- [ ] When checked, copy master asset image directly to scene instance
- [ ] Skip generation entirely for unchanged assets
- [ ] Bulk "Use Master As-Is" option for multiple assets

**Dependencies**: None (can be done in parallel with carousel work).

3B — Stage 8 UX Overhaul

Task: 3B.1
  Primary Files: *New DB migration, sceneAssets.ts (route), VisualStateEditorPanel.tsx, scene.ts, SceneAssetService.ts, ImageGenerationService.ts*

  Info from Tickets.md:
  
        ### 8.5 — Carousel for Multiple Generated Scene Instance Images
        When generating scene instance images, allow users to see all generations in a carousel and choose their favorite (e.g., first try was good, second was worse, third was decent — user should be able to pick the first).
────────────────────────────────────────
Task: 3B.2
  Depends On (Phase 3): 3B.1
  Primary Files: *sceneAssets.ts, VisualStateEditorPanel.tsx, sceneAssetService.ts*

  Info from Tickets.md:
    ### 8.6 — Master Reference Should Default to Most Recent Scene's Instance Image
    E.g., Scene 4's master reference for the protagonist should default to Scene 3's scene instance image. The user should be able to carousel through and switch to older images if desired.
  ────────────────────────────────────────
Task: 3B.3
  Depends On (Phase 3): 3B.1
  Primary Files: *sceneAssets.ts, VisualStateEditorPanel.tsx, sceneAssetService.ts*

  Info from Tickets.md:
        ### 8.11 — Allow Direct Image Upload for Scene Assets
        Users should be able to just upload an image directly if they have one. 
  ────────────────────────────────────────
Task: 3B.4
  Depends On (Phase 3): None
  Primary Files: *VisualStateEditorPanel.tsx, sceneAssets.ts, sceneAssetService.ts*

  Info from Tickets.md:
    ### 8.4 — Option to Use Master Reference AS IS
        Users shouldn't be forced to generate a new scene instance image. They should be able to use the master reference directly for the scene if they choose.

        (This also mean being able to reuse a previous scene instance image)
  ────────────────────────────────────────