# Location Resolver Implementation Spec

## Objective
Establish canonical, robust location identity throughout the shot pipeline by introducing an explicit resolver model and replacing text-only joins with ID-first linkage, while preserving current UX flexibility.

## Non-Goals
- Rewriting the entire asset system
- Removing free-text `setting` from shots
- Replacing existing prompt-generation fallback logic (we will enhance inputs to it)

---

## 1. Schema Changes

## 1.1 `shots` table
Add canonical location linkage fields:
- `location_asset_id uuid null references project_assets(id)`
- `location_match_confidence numeric(4,3) null`
- `location_match_source text null`  
  Allowed values: `manual`, `resolver_exact`, `resolver_alias`, `resolver_fuzzy`, `stage7_inferred`, `legacy_backfill`
- `location_match_notes text null` (optional debug/audit reason)

Indexes:
- `idx_shots_scene_location_asset` on `(scene_id, location_asset_id)`
- `idx_shots_location_confidence` on `(location_match_confidence)`

Constraints:
- `check_location_match_source` enforce allowed enum-like values.

## 1.2 `project_assets` (location alias support)
Add alias surface for deterministic normalization:
- `location_aliases jsonb not null default '[]'::jsonb`

Expected shape:
```json
["kitchen", "kitchen hall", "main kitchen hallway"]
```

Index:
- GIN index on `location_aliases` for query efficiency.

## 1.3 Optional new table: `location_match_events` (recommended)
Audit and model iteration table:
- `id uuid pk`
- `project_id uuid not null`
- `scene_id uuid not null`
- `shot_id uuid not null`
- `setting_text text not null`
- `resolved_location_asset_id uuid null`
- `confidence numeric(4,3) not null`
- `source text not null`
- `reason text null`
- `created_at timestamptz default now()`

Use for telemetry and debugging, not runtime dependency.

---

## 2. Resolver Service Design

## 2.1 New backend module
`backend/src/services/locationResolverService.ts`

Core interfaces:
```ts
export interface LocationResolveInput {
  branchId: string;
  sceneExpectedLocation?: string | null;
  shotSetting?: string | null;
  shotCameraDirectionId?: string | null;
}

export interface LocationResolveResult {
  locationAssetId?: string;
  confidence: number; // 0.0 - 1.0
  source: 'manual' | 'resolver_exact' | 'resolver_alias' | 'resolver_fuzzy' | 'stage7_inferred';
  reason: string;
  candidateScores: Array<{ assetId: string; score: number; reason: string }>;
}
```

## 2.2 Resolution algorithm (deterministic)
Order:
1. If shot has existing `camera_direction_id`, map to parent location asset directly (`1.0`, `manual` or `stage7_inferred` as applicable).
2. Exact normalized match between `setting` and location name (`0.95`, `resolver_exact`).
3. Exact normalized match to any alias (`0.90`, `resolver_alias`).
4. Token-overlap fuzzy score against name + aliases (`0.60-0.89`, `resolver_fuzzy`).
5. Fallback to scene `expected_location` match using same cascade.
6. If ambiguous (top-2 score delta < threshold, e.g. `0.08`), return unresolved with candidates.

Normalization rules:
- lowercase
- punctuation stripping
- collapse whitespace
- remove common stop tokens (`the`, `a`, `an`, optional)
- canonicalize `int.`/`ext.` prefixes out of location text when present

## 2.3 Shared usage points
Must be reused in:
- Stage 7 extraction insert path
- Stage 7 shot update endpoint
- Stage 7 lock validation
- Stage 8 coverage panel data API (server-derived mappings)
- Existing shot-asset matcher for `location` type

---

## 3. API Contracts

## 3.1 Extend shot payloads
All shot read endpoints should include:
```json
{
  "id": "uuid",
  "setting": "Kitchen hallway",
  "locationAssetId": "uuid|null",
  "locationMatchConfidence": 0.93,
  "locationMatchSource": "resolver_alias",
  "locationMatchNotes": "matched alias: kitchen hall"
}
```

## 3.2 New endpoint: batch resolve scene shot locations
`POST /api/projects/:projectId/scenes/:sceneId/shots/resolve-locations`

Request:
```json
{
  "mode": "dry_run | apply",
  "minConfidenceToApply": 0.85
}
```

Response:
```json
{
  "updated": 12,
  "unresolved": 3,
  "ambiguous": 2,
  "results": [
    {
      "shotId": "uuid",
      "locationAssetId": "uuid|null",
      "confidence": 0.91,
      "source": "resolver_alias",
      "reason": "matched alias kitchen hall",
      "candidates": []
    }
  ]
}
```

## 3.3 New endpoint: manual shot location assignment
`PUT /api/projects/:projectId/scenes/:sceneId/shots/:shotId/location`

Request:
```json
{
  "locationAssetId": "uuid|null",
  "reason": "user selected in Stage 7"
}
```

Behavior:
- Sets `location_asset_id`
- Sets `location_match_source='manual'`
- Sets confidence `1.0` when non-null

## 3.4 Stage 7 lock validation response extension
Include location integrity warnings/errors:
```json
{
  "locationValidation": {
    "unresolvedCount": 2,
    "ambiguousCount": 1,
    "mismatchedExpectedLocationCount": 1
  }
}
```

Policy:
- Warn by default in first rollout.
- Feature flag to enforce hard error later.

---

## 4. UI Updates

## 4.1 Stage 7 Shot Editor
Add location linking controls next to `setting`:
- `Linked Location` combobox (search existing location assets)
- Confidence badge:
  - `High` (>=0.90)
  - `Medium` (0.75-0.89)
  - `Low` (<0.75)
- “Resolve all shot locations” action
- Per-shot quick actions:
  - `Accept suggestion`
  - `Choose different`
  - `Clear`

Behavior:
- Editing `setting` re-runs resolver (debounced).
- Manual selection locks source to `manual`.

## 4.2 Stage 7 validation panel
Add location-specific items:
- Unresolved location links
- Ambiguous matches
- Divergence from scene expected location

## 4.3 Stage 8 Coverage Panel
Replace client string matching logic with server-provided canonical shot-location mapping:
- Group by `location_asset_id` first
- Use `camera_direction_id` for direction bucketing
- Show unresolved shots in explicit “No linked location” section

## 4.4 Location Views Dialog
Improvements:
- “Suggest missing defaults” instead of blocking when any view exists
- Semantic alias prompt on creation (e.g. `entry-facing`, `north wall`)
- Keep `direction_N` as fallback internal name only

---

## 5. Migration Plan

## 5.1 Migration A: schema add
1. Add new `shots` columns.
2. Add `project_assets.location_aliases`.
3. Add indexes and constraints.

## 5.2 Migration B: backfill
Backfill strategy for existing shots:
1. If shot has `camera_direction_id`, map to location via `location_views.project_asset_id`.
2. Else resolve from shot `setting` with resolver service using asset names and aliases.
3. Else resolve from scene `expected_location`.
4. Persist best result with `location_match_source='legacy_backfill'`.
5. Store unresolved/ambiguous rows in `location_match_events` (if table enabled).

Backfill safety:
- Dry-run report first (counts by confidence bucket).
- Apply only high confidence automatically (>=0.85); leave remainder for UI review queue.

## 5.3 Migration C: endpoint compatibility
- Keep old payload fields unchanged.
- Add new fields as additive response properties.
- Support old clients by not requiring `locationAssetId` in writes initially.

---

## 6. Rollout Order

## Phase 0: Foundation (no behavior change)
- Ship schema + resolver service + read-path hydration.
- Add telemetry on unresolved/ambiguous rates.

Exit criteria:
- No regression in shot extraction and prompt generation tests.

## Phase 1: Assisted UX
- Add Stage 7 location link UI and batch resolve action.
- Add Stage 7 validation warnings (non-blocking).

Exit criteria:
- >=70% shots have canonical `location_asset_id` in active projects.

## Phase 2: Coverage and matcher unification
- Switch Stage 8 coverage to canonical mapping API.
- Rewire location matcher utility to resolver output instead of ad-hoc fuzzy checks.

Exit criteria:
- Manual reassignment rate in Stage 8 reduced by target threshold (e.g. 40%).

## Phase 3: Enforcement and quality hardening
- Optional hard-block on Stage 7 lock when unresolved exceeds threshold.
- Enable alias management UX for location assets.
- Add resolver regression test suite and confidence calibration review.

Exit criteria:
- Unresolved at lock <5% on median project.

---

## 7. Testing Strategy

## Unit tests
- Resolver normalization and scoring
- Ambiguity detection thresholds
- Source attribution correctness (`manual` vs resolver types)

## Integration tests
- Stage 7 extract -> shot insert includes `location_asset_id`
- Stage 7 edit updates resolver fields
- Stage 8 coverage groups by canonical location id
- Prompt generation remains stable with new fields present

## Data migration tests
- Backfill dry-run produces deterministic counts
- Apply mode updates only expected rows
- Rollback safe for partial failures

---

## 8. Risks and Mitigations

Risk:
- Incorrect auto-linking on low-confidence fuzzy matches.
Mitigation:
- Confidence threshold gating + unresolved review UX.

Risk:
- Client/server mismatch during transition.
Mitigation:
- Additive contracts and feature flags.

Risk:
- Performance hit from resolver on large scenes.
Mitigation:
- Cache normalized location index per branch + batch resolve endpoint.

---

## 9. Definition of Done
- `shots.location_asset_id` exists and is populated for most shots.
- Stage 7 allows explicit linked location management with confidence visibility.
- Stage 8 coverage no longer depends on `setting.includes(locationName)` logic.
- Resolver is the shared matching source across extraction, validation, and coverage.
- Migration/backfill completed with measurable improvement in unresolved and manual-fix rates.

