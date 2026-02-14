  ┌──────────┬───────────────────┬──────────────────────────────────┬─────────────────────────────────────────────────────────────┐  │ Worktree │ Tasks (sequential │              Files               │                          Rationale                          │  │          │      within)      │                                  │                                                             │  ├──────────┼───────────────────┼──────────────────────────────────┼─────────────────────────────────────────────────────────────┤  │ WT-10    │ 3C.1 → 3C.2       │ ImageGenerationService.ts, new   │ Transparent backgrounds → multi-angle generation. Must wait │  │          │                   │ DB schema                        │  for 3A.1 (asset types) and 3B.10 (camera angle metadata)   │  └──────────┴───────────────────┴──────────────────────────────────┴─────────────────────────────────────────────────────────────┘ 

  --

  
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

**Dependencies**: 3A.1 (asset type system). *DONE*

#### Ticket More Info:

### Feature 3.2: Transparent Background Auto-Injection ✅ **CONSISTENCY ENFORCEMENT**

**Purpose**: Automatically inject "isolated on transparent background" for characters and props during generation

**Implementation Strategy**: Prompt engineering solution with post-processing fallback

**Core Features:**
- [ ] **Automatic Prompt Injection**: Deterministic style injection
  - Modify image generation requests in Stage 5 and Stage 8
  - Auto-inject "isolated on transparent background" for asset_type: 'character' and 'prop'
  - Exclude locations from transparent background injection
  - Apply injection at generation request time (not user-visible)
- [ ] **Post-Processing Implementation**: Background removal safety net
  - Integrate background removal library (Rembg or specialized API)
  - Process characters and props after generation
  - Remove halos and solid color backgrounds
  - Save cleaned images to Supabase Storage
- [ ] **Quality Validation**: Test and iterate transparent background results
  - A/B test prompt engineering vs post-processing
  - Validate across different asset types
  - Adjust injection strategy based on results
- [ ] **Asset Type Logic Table**:
  ```
  Asset Type | Prompt Injection | Background Removal | Purpose
  Character  | Enforced         | Required          | Scene consistency
  Prop       | Enforced         | Required          | Multi-shot interaction
  Location   | Prohibited       | None              | Environmental context
  ```
--
##### 5.9 — Asset Backgrounds: Clean (White/Transparent/Black)
Generate assets on clean backgrounds to avoid confusing background noise when injected into frame + video generation. If an asset image has a castle interior with other characters, the LLM may get confused during frame generation and include irrelevant elements.


-----------

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

Ticket More Info:  
### 5.8 — Multiple Views/Angles of Assets for Production
Consider generating multiple angles/views of assets (front shot, side shot, etc.) with no background noise — like engineering documentation views. This would help Stage 10 frame generation accurately place assets in different shot angles without confusion from background elements.