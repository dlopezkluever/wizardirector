
## Phase 3: Asset System Overhaul

**Goal**: Revolutionize how assets are extracted, managed, and flow through the entire pipeline. This is the foundational architecture change that eliminates redundant AI calls, gives users control over their assets, and establishes clean data flow from Stage 5 through production.

---

### 3A — Stage 5 Extraction Revolution

#### 3A.1 — Two-Pass Asset Extraction with Filter Modal
**Tickets**: 5.3, multi-stage extraction optimization
**Priority**: ARCHITECTURE CHANGE

**Purpose**: Single comprehensive extraction that includes scene-level mapping, with a cost-saving filter step that lets users deselect unneeded assets before expensive generation.

**Problem/Context**: Assets are currently extracted multiple times (Stage 5, 6, 8) causing inefficiency, inconsistency, and unnecessary cost. Stage 4 is "Global Narrative Truth" — Stage 5 should create a complete asset manifest from this truth in one operation.

**Core Features:**
- [ ] **Pass 1 — Extract Preview** (`POST /extract-preview`):
  - Parse entire Master Script in one LLM call
  - Return entity names + types + scene mentions (cheap operation)
  - Group under Characters / Locations / Props
- [ ] **Filter Modal UI**:
  - Grouped checklist (Characters, Locations, Props sections)
  - Checkbox per asset (all selected by default)
  - "Select All / None" per category
  - Asset count display
  - "Confirm Selection (X assets)" button
  - Purpose: primarily for REMOVING assets the user doesn't care about
- [ ] **Pass 2 — Extract Confirm** (`POST /extract-confirm`):
  - Takes selected asset IDs from filter modal
  - Runs description generation + image generation ONLY for selected assets
  - Saves $$$ by skipping LLM calls for deselected assets
- [ ] **Scene-Level Mapping**:
  - Populate `scenes.dependencies` JSONB: `{characters: string[], locations: string[], props: string[]}`
  - Map asset appearances to scene_number or scene_id automatically
  - Store `extractedAt` timestamp for cache invalidation
- [ ] **Stage 6/8 Optimization**:
  - Stage 6: Query `scenes.dependencies` instead of running scene extraction
  - Stage 8: Use dependencies for auto-suggestions instead of AI relevance detection
  - Maintain ability to manually add missing assets

**Technical Notes**: Split the existing extraction endpoint into two. Pass 1 should be fast and cheap (entity recognition only). Pass 2 is the expensive operation (descriptions + images). Cache invalidation: detect when Stage 4 Master Script is modified → invalidate and regenerate manifest → update all scene dependencies → maintain manual additions.

**Dependencies**: Phase 2 bugs fixed (especially Stage 5 Lock All button — 2A.7).

---

#### 3A.2 — Sidelined Assets System
**Ticket**: 5.4
**Priority**: HIGH

**Purpose**: Make asset removal non-destructive — "sidelined" not deleted.

**Problem/Context**: Removing an asset in Stage 5 currently deletes it, which is dangerous. Sidelined assets should be hidden from the Stage 5 workflow but maintained in the database with their scene info preserved. They remain available for use in later stages (Stage 8, 10) where the LLM generates them on-the-fly from script context. Users should be able to retrieve sidelined assets if they change their mind.

**Core Features:**
- [ ] Add `sidelined` boolean flag to assets (or status field)
- [ ] Hide sidelined assets from Stage 5 active workflow
- [ ] Preserve all scene info and metadata for sidelined assets
- [ ] "Restore" action to bring sidelined assets back
- [ ] Allow Stage 8/10 to access sidelined asset data for context

**Dependencies**: 3A.1 (filter modal provides the primary UI for sidelining).

---

#### 3A.3 — Manual Asset Addition
**Ticket**: 5.5
**Priority**: HIGH

**Purpose**: Allow users to add assets that extraction missed.

**Problem/Context**: Automated extraction will inevitably miss some assets. Users need the ability to manually add characters, props, or locations that are important to their story.

**Core Features:**
- [ ] "Add Asset" button/form in Stage 5
- [ ] Support all asset types (character, prop, location)
- [ ] Manual assets integrate seamlessly with extracted assets
- [ ] Manual assets appear in scene dependency mappings
- [ ] Manual additions preserved across re-extraction (cache invalidation shouldn't delete them)

**Dependencies**: 3A.1 (extraction system should be in place first).

---

#### 3A.4 — Assets Don't Require Images
**Ticket**: 5.6
**Priority**: MEDIUM

**Purpose**: Remove mandatory image generation for all assets.

**Problem/Context**: Currently every asset must have a generated/uploaded image, which is slow, expensive, and unnecessary for assets the user doesn't visually care about (e.g., minor props).

**Core Features:**
- [ ] Make image generation optional per asset
- [ ] Allow progression past Stage 5 with imageless assets
- [ ] Visual indicator for assets without images (placeholder/icon)
- [ ] Assets without images still carry descriptions for production use

**Dependencies**: 3A.1.

---

#### 3A.5 — Group Characters / "Extras" Archetypes
**Ticket**: 5.11
**Priority**: MEDIUM

**Purpose**: Create a new asset type for background characters that don't need individual tracking.

**Problem/Context**: In filmmaking, "extras" are general background characters with little/no dialogue. Currently they'd each need individual asset entries, which is overkill. Instead, create archetype entries (e.g., "Impoverished Plebeian" for bubonic plague France) that represent what numerous background characters should look like — a prototype, not an individual.

**Core Features:**
- [ ] New asset type: `extra_archetype` (or similar)
- [ ] Archetype entries represent a class of background characters
- [ ] Don't require individual persistence per extra
- [ ] Include in scene dependencies for mise-en-scène context
- [ ] Available as reference in frame generation (Stage 10)

**Dependencies**: 3A.1 (extraction should recognize extras as a type).

---

#### 3A.6 — Delete Uploaded Image for an Asset
**Ticket**: 5.12
**Priority**: LOW

**Purpose**: Allow users to remove a predetermined uploaded image.

**Problem/Context**: If a user uploads an image but later decides they don't want to predetermine that asset's appearance, there's no way to remove the uploaded image.

**Core Features:**
- [ ] "Remove Image" action on assets with uploaded images
- [ ] Revert asset to description-only state
- [ ] Clean up storage for removed images

**Dependencies**: 3A.4 (assets should be able to exist without images first).

---

#### 3A.7 — Extract Description from Uploaded Image
**Ticket**: 5.13
**Priority**: LOW

**Purpose**: Intelligently extract/merge descriptions from uploaded images.

**Problem/Context**: When a user uploads an image for an asset, the system could extract a description of what's pictured and merge it with the existing script-based description. Options: keep existing description, replace by describing the image while adding missing script details, or merge descriptions. Similar to how cloned assets work in the Asset-Matching Modal.

**Core Features:**
- [ ] Image analysis to extract visual description
- [ ] User choice: keep existing / replace / merge descriptions
- [ ] Intelligent merge that combines image details with script context
- [ ] Preview merged description before confirming

**Dependencies**: 3A.1.

---

#### 3A.8 — Visual Style Capsule Investigation & Manual Tone Option
**Tickets**: 5.7, 5.2
**Priority**: MEDIUM

**Purpose**: Fix capsules having no effect on generation, and offer manual visual tone as an alternative.

**Problem/Context**: Visual style capsules appear to have no effect on asset image generation in Stage 5 (investigated in Phase 2 for the override issue, but deeper fix needed here). Additionally, users should be able to describe their visual tone manually instead of picking a capsule — offering options like 3D animation, hyperrealistic, noir, 2D animation, etc., plus a custom description that could be promoted as a starting point for a Visual Style Capsule.

**Core Features:**
- [ ] Deeper investigation of capsule → image generation pipeline
- [ ] Fix capsule influence on Stage 5 asset generation
- [ ] Add manual visual tone description option alongside capsule selection
- [ ] Common presets: 3D animation, hyperrealistic, noir, 2D animation
- [ ] Custom visual description to capsule promotion pathway
- [ ] More robust than a single text box

**Dependencies**: 2A.1 (initial capsule balance fix in Phase 2).

---

#### 3A.9 — Visual Style Capsule Locking Less Restrictive
**Ticket**: 5.1
**Priority**: LOW

**Purpose**: Allow capsule changes with appropriate warnings.

**Problem/Context**: Users might click something wrong and there's no way to change the visual style capsule. The selection should be changeable, with the understanding that changing it later in the production cycle would trigger a new branch (or at minimum, a warning about downstream impact).

**Core Features:**
- [ ] Allow capsule re-selection after initial choice
- [ ] Warning about downstream impact when changing capsules
- [ ] Integration with post-lock edit flow (from 2B.5)

**Dependencies**: 2B.5 (post-lock edit foundations).

---

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

**Dependencies**: 2A.1 (master asset influence fix first, so generations are actually good).

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

---

#### 3B.5 — Asset Generation Requirement Fix
**Tickets**: 8.7, MVP v1.1 Feature 2.6
**Priority**: HIGH

**Purpose**: Allow progression without generating every single asset.

**Problem/Context**: Stage 8 currently requires scene instance generation for every asset before proceeding. "The point of Stage 8 is to add final polish to the assets you care about. If there's stuff you don't care about, you should be able to proceed."

**Core Features:**
- [ ] Modify Stage 8 gatekeeper logic to not require all assets
- [ ] Allow progression with master reference fallback for ungenerated assets
- [ ] Mark primary characters as required, secondary props/locations as optional
- [ ] "Generate Later" option for non-critical assets
- [ ] User override capability for forcing/skipping generation

**Dependencies**: 3B.4 ("Use Master As-Is" provides the fallback mechanism).

---

#### 3B.6 — "Add New Assets" Button Fix
**Ticket**: 8.8
**Priority**: MEDIUM

**Purpose**: Fix the "Create Scene Asset" button that incorrectly opens the global asset drawer.

**Problem/Context**: The "Create Scene Asset" button pulls out the global asset drawer, which already has its own button. It should instead allow creating a new scene-specific asset from scratch. The right sidebar should be renamed to "Add new assets."

**Core Features:**
- [ ] Fix button to create scene-specific assets, not open global drawer
- [ ] Rename right sidebar to "Add new assets"
- [ ] Scene-specific asset creation form
- [ ] New scene assets integrate with scene dependencies

**Dependencies**: 3A.1 (scene dependency mapping).

---

#### 3B.7 — Remove Assets from Scene
**Ticket**: 8.10
**Priority**: MEDIUM

**Purpose**: Allow removal of inaccurate asset extractions from a scene.

**Problem/Context**: Some extractions may be inaccurate — a character might be flagged as present in a scene where they don't appear. Users should be able to remove assets from a scene without deleting the asset globally.

**Core Features:**
- [ ] "Remove from scene" action per asset in Stage 8
- [ ] Only removes scene association, not global asset
- [ ] Update `scenes.dependencies` to reflect removal
- [ ] Confirmation dialog to prevent accidental removal

**Dependencies**: 3A.1 (scene dependency mapping).

---

#### 3B.8 — Persist Suggested Assets in DB
**Ticket**: 8.9
**Priority**: MEDIUM

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

---

#### 3B.9 — Shot Presence Flags per Asset
**Ticket**: 8.13
**Priority**: MEDIUM

**Purpose**: Show which shots each asset appears in within a scene.

**Problem/Context**: When looking at assets in Stage 8, users can't tell which specific shots an asset appears in. Little flags/badges showing shot numbers would help users understand where each asset is needed.

**Core Features:**
- [ ] Analyze shot list to determine asset presence per shot
- [ ] Display shot number badges on each asset in Stage 8
- [ ] Update flags when shot list changes
- [ ] Visual indicator style (chips, badges, or icons)

**Dependencies**: Scene dependency mapping + shot list data from Stage 7.

---

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

---

### 3C — Asset Architecture & Data Flow

#### 3C.1 — Transparent Background Auto-Injection
**Ticket**: MVP v1.1 Feature 3.2, 5.9
**Priority**: HIGH

**Purpose**: Automatically generate characters and props on clean backgrounds to avoid confusing noise in frame generation.

**Problem/Context**: If an asset image has a castle interior with other characters, the LLM may get confused during frame generation and include irrelevant elements. Characters and props should be isolated on clean backgrounds.

**Core Features:**
- [ ] Auto-inject "isolated on transparent/white background" for characters and props during generation
- [ ] Exclude locations from background injection (they need environmental context)
- [ ] Post-processing background removal safety net (Rembg or specialized API)
- [ ] Remove halos and solid color backgrounds
- [ ] Quality validation: A/B test prompt engineering vs post-processing

**Asset Type Logic:**
| Asset Type | Prompt Injection | Background Removal | Purpose |
|---|---|---|---|
| Character | Enforced | Required | Scene consistency |
| Prop | Enforced | Required | Multi-shot interaction |
| Location | Prohibited | None | Environmental context |
| Extra Archetype | Enforced | Required | Background character reference |

**Dependencies**: 3A.1 (asset type system).

---

#### 3C.2 — Multi-Angle Asset Generation
**Ticket**: 5.8
**Priority**: MEDIUM

**Purpose**: Generate multiple angles/views of assets for production accuracy.

**Problem/Context**: Consider generating multiple angles/views of assets (front shot, side shot, etc.) with no background noise — like engineering documentation views. This helps Stage 10 frame generation accurately place assets in different shot angles without confusion from background elements.

**Core Features:**
- [ ] Generate front, side, 3/4 view for characters
- [ ] Clean background for all angle views
- [ ] Store angle variants linked to parent asset
- [ ] Pass relevant angle to frame generation based on shot camera direction
- [ ] UI to view and manage angle variants

**Dependencies**: 3C.1 (clean backgrounds), 3B.10 (camera angle metadata).

---

#### 3C.3 — Asset Inheritance Chain Enhancement
**Ticket**: MVP v1.1 Feature 3.3, DC-3
**Priority**: HIGH

**Purpose**: Build comprehensive asset state tracking from Stage 5 through Stage 12.

**Problem/Context**: The context/inheritance chain from Stage 5 → Stage 8 → Stage 9 → Stage 10 is broken somewhere (DC-3). Final generations don't reflect master asset influence — "just generic slop." Need strong inheritance tracking.

**Core Features:**
- [ ] Strengthen `inherited_from_instance_id` chain tracking
- [ ] Build asset timeline view showing state evolution across scenes
- [ ] Add inheritance validation and repair tools
- [ ] Detect asset state changes during shot list creation
- [ ] Log visual evolution context from action descriptions
- [ ] Create efficient queries for asset history chains
- [ ] Implement asset state caching for quick retrieval

**Dependencies**: 3B.1 (carousel system provides generation history).

---

#### 3C.4 — Context Manager Enhancement
**Ticket**: MVP v1.1 Feature 3.4
**Priority**: HIGH

**Purpose**: Optimize context assembly for LLM calls with proper asset inheritance.

**Problem/Context**: LLM calls throughout the pipeline need properly assembled context that includes the right assets, styles, and prior work. Currently context may be incomplete or poorly prioritized.

**Core Features:**
- [ ] **Enhanced Global Context** (Phase A):
  - Include asset manifest from optimized Stage 5 extraction
  - Incorporate visual style locks and constraints
  - Add project-level continuity rules
- [ ] **Optimized Local Context** (Phase B):
  - Use cached scene dependencies instead of real-time extraction
  - Include relevant asset inheritance chains
  - Add prior scene end-state for continuity
- [ ] **Context Size Management**:
  - Intelligent context truncation to prevent token overflow
  - Prioritize recent asset states over distant history
  - Context size monitoring and alerts

**Dependencies**: 3A.1 (extraction provides the manifest), 3C.3 (inheritance chain).

---

#### 3C.5 — Aspect Ratio System
**Ticket**: Multi-stage aspect ratio concern
**Priority**: MEDIUM

**Purpose**: Set aspect ratio at the project level and apply consistently downstream.

**Problem/Context**: Aspect ratios need to be set at some point in the pipeline and applied consistently to asset image generation, frame generation, and video generation. Without this, outputs may have mismatched dimensions.

**Core Features:**
- [ ] Add aspect ratio selection to Stage 1 project settings
- [ ] Options: 16:9, 9:16, 1:1, 4:3, 2.35:1 (cinematic)
- [ ] Apply to Stage 5 asset image generation
- [ ] Apply to Stage 10 frame generation
- [ ] Apply to Stage 11 video generation (Veo3 supports specific ratios)
- [ ] Display current aspect ratio in project header

**Dependencies**: None (Stage 1 change is independent).

---

### Phase 3 Success Criteria
- [ ] Two-pass asset extraction working with filter modal
- [ ] Scene-level dependency mapping populated automatically
- [ ] Sidelined assets system functional
- [ ] Manual asset addition works
- [ ] Generation carousel functional in Stage 8
- [ ] Historical master reference carousel working
- [ ] "Use Master As-Is" option available
- [ ] Users can progress without generating every asset
- [ ] Transparent backgrounds automatically applied to characters/props
- [ ] Asset inheritance chain functional from Stage 5 → 10
- [ ] Significant reduction in redundant AI calls
- [ ] Aspect ratio set once, applied everywhere

---