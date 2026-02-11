Worktree: WT-8
  Tasks (sequential within): 3B.6 → 3B.7 → 3B.8 → 3B.9
  Files: SceneAssetListPanel.tsx, sceneAssets.ts
  Rationale: Button fix → remove assets → persist suggestions → shot flags. All share the list panel

#### 3B.6 — "Add New Assets" Button Fix
**Ticket**: 8.8
**Priority**: MEDIUM
  Primary Files: Stage8VisualDefinition.tsx, SceneAssetListPanel.tsx
**Purpose**: Fix the "Create Scene Asset" button that incorrectly opens the global asset drawer.

**Problem/Context**: The "Create Scene Asset" button pulls out the global asset drawer, which already has its own button. It should instead allow creating a new scene-specific asset from scratch. The right sidebar should be renamed to "Add new assets."

**Core Features:**
- [ ] Fix button to create scene-specific assets, not open global drawer
- [ ] Rename right sidebar to "Add new assets"
- [ ] Scene-specific asset creation form
- [ ] New scene assets integrate with scene dependencies

**Dependencies**: 3A.1 (scene dependency mapping).
**From Ticket.md**: ### 8.10 — Need Ability to Remove Assets No Longer Relevant
Some extractions may be inaccurate — users should be able to remove assets from a scene.
---

#### 3B.7 — Remove Assets from Scene
**Ticket**: 8.10
**Priority**: MEDIUM
Primary Files: sceneAssets.ts, SceneAssetListPanel.tsx, sceneAssetService.ts
**Purpose**: Allow removal of inaccurate asset extractions from a scene.

**Problem/Context**: Some extractions may be inaccurate — a character might be flagged as present in a scene where they don't appear. Users should be able to remove assets from a scene without deleting the asset globally.

**Core Features:**
- [ ] "Remove from scene" action per asset in Stage 8
- [ ] Only removes scene association, not global asset
- [ ] Update `scenes.dependencies` to reflect removal
- [ ] Confirmation dialog to prevent accidental removal

**Dependencies**: 3A.1 (scene dependency mapping).

**From Ticket.md**: ### 8.10 — Need Ability to Remove Assets No Longer Relevant
Some extractions may be inaccurate — users should be able to remove assets from a scene.
---

#### 3B.8 — Persist Suggested Assets in DB

**Priority**: MEDIUM
  Primary Files: New DB migration, sceneAssets.ts, sceneAssetRelevanceService.ts, SceneAssetListPanel.tsx
**Purpose**: Save asset suggestions to database instead of computing them every time.

**Problem/Context**: Currently suggested assets are likely computed on-the-fly each time. Persisting them allows for consistency and user modification.

**Core Features:**
- [ ] Create `scene_asset_suggestions` table
- [ ] Add backend routes for loading/saving suggestions
- [ ] Load suggestions in frontend Stage 8 UI
- [ ] Allow users to accept/dismiss suggestions
- [ ] Suggestions update when dependencies change

**Technical Notes**: Schema: `scene_asset_suggestions (id, scene_id, asset_id, suggested_by, accepted, dismissed, created_at)`.

**Dependencies**: 3A.1 (extraction provides the suggestions).

**From Ticket.md**: 8.9, ### 8.9 — Persist Suggested Assets (DB Enhancement)
Create `scene_asset_suggestions` table, add backend routes, load/save suggestions in frontend.
---

#### 3B.9 — Shot Presence Flags per Asset
**Ticket**: 8.13
**Priority**: MEDIUM
Primary Files: SceneAssetListPanel.tsx, sceneAssets.ts
**Purpose**: Show which shots each asset appears in within a scene.

**Problem/Context**: When looking at assets in Stage 8, users can't tell which specific shots an asset appears in. Little flags/badges showing shot numbers would help users understand where each asset is needed.

**Core Features:**
- [ ] Analyze shot list to determine asset presence per shot
- [ ] Display shot number badges on each asset in Stage 8
- [ ] Update flags when shot list changes
- [ ] Visual indicator style (chips, badges, or icons)

**Dependencies**: Scene dependency mapping + shot list data from Stage 7.

Ticket Info: ### 8.13 — Shot Presence Flags per Asset
Consider adding little flags for each asset describing which shot(s) they are present in for the scene.