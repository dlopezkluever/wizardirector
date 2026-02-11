Worktree: WT-7
  Tasks (sequential within): 3A.5 → 3A.7 → 3A.8 → 3A.9
  Files: Stage 5 + style capsule files
  Rationale: Extras archetypes → image description extraction → style capsule investigation → locking fix. Completes all Stage 5   
    
#### 3A.5 — Group Characters / "Extras" Archetypes
**Ticket**: 5.11 
**Priority**: MEDIUM
  Primary Files: asset.ts (new type), assetExtractionService.ts, projectAssets.ts, Stage5Assets.tsx
**Purpose**: Create a new asset type for background characters that don't need individual tracking.

**Problem/Context**: In filmmaking, "extras" are general background characters with little/no dialogue. Currently they'd each need individual asset entries, which is overkill. Instead, create archetype entries (e.g., "Impoverished Plebeian" for bubonic plague France) that represent what numerous background characters should look like — a prototype, not an individual.

**Core Features:**
- [ ] New asset type: `extra_archetype` (or similar)
- [ ] Archetype entries represent a class of background characters
- [ ] Don't require individual persistence per extra
- [ ] Include in scene dependencies for mise-en-scène context
- [ ] Available as reference in frame generation (Stage 10)

**Dependencies**: 3A.1 (extraction should recognize extras as a type).

More Details from ticket:  For general background characters ("extras" in filmmaking) with little/no dialogue, create a new asset type as part of mise-en-scene. Instead of each extra needing individual persistence, it's a prototype/archetype of the type of extra (e.g., "Impoverished Plebeian" for a bubonic plague France setting) that represents what numerous background characters should look like.

--

#### 3A.7 — Extract Description from Uploaded Image
**Ticket**: 5.13
**Priority**: LOW
 Primary Files: projectAssets.ts, new LLM service, Stage5Assets.tsx
**Purpose**: Intelligently extract/merge descriptions from uploaded images.

**Problem/Context**: When a user uploads an image for an asset, the system could extract a description of what's pictured and merge it with the existing script-based description. Options: keep existing description, replace by describing the image while adding missing script details, or merge descriptions. Similar to how cloned assets work in the Asset-Matching Modal.

**Core Features:**
- [ ] Image analysis to extract visual description
- [ ] User choice: keep existing / replace / merge descriptions
- [ ] Intelligent merge that combines image details with script context
- [ ] Preview merged description before confirming

**Dependencies**: 3A.1.

Info from Ticket: Extract Improved Description from Uploaded Image
Optional ability to extract a description from the uploaded image that's useful for production. Options: keep existing description, replace intelligently by describing what's pictured while adding missing necessary details from the script, or merge descriptions. Similar to how cloned assets work in the Asset-Matching Modal.



#### 3A.8 — Visual Style Capsule Investigation & Manual Tone Option
**Tickets**: 5.7, 5.2
**Priority**: MEDIUM
  Primary Files: styleCapsuleService.ts, StyleCapsuleSelector.tsx, ImageGenerationService.ts, Stage5Assets.tsx
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

Ticket Info:
### 5.2 — Allow Manual Visual Tone Description Instead of Capsule
Similar to Stage 1's tone option, users should be able to describe their visual tone manually instead of picking a capsule. Offer common options: 3D animation, hyperrealistic, noir, 2D animation, etc. Allow custom visual description to be promoted as a starting point for a Visual Style Capsule. Should be more robust than just a single text box.

### 5.7 — Visual Capsules Don't Seem to Influence Image Generation
Needs investigation — visual style capsules appear to have no effect on asset image generation in Stage 5.

---

#### 3A.9 — Visual Style Capsule Locking Less Restrictive
**Ticket**: 5.1
**Priority**: LOW
  Primary Files: Stage5Assets.tsx (capsule selection area), projectAssets.ts
**Purpose**: Allow capsule changes with appropriate warnings.

**Problem/Context**: Users might click something wrong and there's no way to change the visual style capsule. The selection should be changeable, with the understanding that changing it later in the production cycle would trigger a new branch (or at minimum, a warning about downstream impact).

**Core Features:**
- [ ] Allow capsule re-selection after initial choice
- [ ] Warning about downstream impact when changing capsules
- [ ] Integration with post-lock edit flow (from 2B.5)

**Dependencies**: 2B.5 (post-lock edit foundations).

Ticket Info:

### 5.1 — Visual Style Capsule Locking Too Restrictive
Users might click something wrong and there's no way to change it. The style capsule selection should be changeable (with the understanding that changing it later in the production cycle would trigger a new branch).


---

