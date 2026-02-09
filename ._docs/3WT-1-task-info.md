Worktree: WT-1
  Tasks (sequential within): 3A.1
  Files: Stage 5 extraction core
  Rationale: THE critical path — 14 other tasks depend on this


  ────────────────────────────────────────
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
Task 3A.1
Primary Files: *assetExtractionService.ts, projectAssets.ts (route), Stage5Assets.tsx projectAssetService.ts, asset.ts, scenes table migration in backend/migrations/ folder*

From Tickets.md:

### 5.3 — Asset Extraction Filter Modal (Save Users $$$)
**Key UI improvement:** When extraction occurs, first show a pop-up modal with a compact list of extracted assets (name + category only, grouped under Characters / Locations / Props) — no descriptions or image areas yet. This is a checklist primarily for REMOVING assets the user doesn't care to pre-generate. **Recommended approach (Option A):** Filter before Pass 2 (description generation). Split extraction endpoint:
- `POST /extract-preview` — runs only Pass 1, returns raw entities (name, type, mentions) — cheap
- `POST /extract-confirm` — takes selected asset IDs, runs Pass 2 only for those — saves $$$ on skipped LLM calls

Modal features: grouped list, checkbox per asset (all selected by default), "Select All / None" per category, asset count display, "Confirm Selection (X assets)" button.


## Asset Extraction & Continuity Optimization (Stages 5, 8, 10)
The extraction process should be revised to a single "one fell swoop" operation where the system identifies every scene an asset is in at once — not re-extracting at every stage. Assets are extracted once, then their data carries forward. 