# Location System Stabilization — Master Implementation Plan

Status: Drafted July 19, 2026, from a fresh code + git audit of branch `phase-4-plus`. Expanded same day with implementation-level detail.

Governing intent docs (in priority order):

1. `5-3-location-implementation-plan.md` — the phased technical plan (Phases 0–7)
2. `5-2-location-product-synthesis.md` — the two-tier product model and stage ownership map
3. `._docs/5-1-location-system-intent-source.md` — consolidated intent history
4. `._docs/location-continuity-progress-audit.md` — post-Phase-4 state audit (May 4, 2026)

Goal of this plan: take the location-continuity system from its current mid-Phase-5 state to a **stable, shippable state** that fulfills the original goal — reliable background/location continuity across shots — without expanding scope beyond what the 5-x docs already decided.

---

## Part 1: Verified Current State (audited July 19, 2026)

### 1.1 What is committed on `phase-4-plus`

The branch contains the complete implementation trail for Phases 0–4 of the 5-3 plan:

| Phase | Scope | Status | Key commits |
| --- | --- | --- | --- |
| 0 | Baseline audit | ✅ Committed | `0752f92` (`._docs/location-continuity-phase-0-audit.md`) |
| 1 | Canonical `shots.location_asset_id`, resolver service, migration 039, backfill script, aliases | ✅ Committed | `aac0cc5` … `e8ca933` |
| 2 | Stage 7 lightweight location truth UI + endpoints | ✅ Committed | `c96a6b9`, `314815b`, `6eb22f5` |
| 3 | Stage 8 server-owned coverage (`locationCoverageService`), repair endpoints, panel refactor | ✅ Committed | `3e8e793`, `f2ce24c`, `564d480`, `ded03cd` |
| 4 | `continuityCompositionService`, `GenerationContinuityPackage`, Stage 9 continuity-preview endpoint + `ContinuityPreviewPanel`, semantic-role manifests, camera-change path routed through composition | ✅ Committed | `5eaaa5c` … `c1eddcf` |

The Phase 4 exit state is documented in detail in `._docs/location-continuity-progress-audit.md` and was verified at the time (backend build clean, 42/42 prompt-generation tests, frontend 244/244).

### 1.2 What is sitting UNCOMMITTED in the working tree

The working tree contains a substantially complete **Phase 5 (Stage 10 continuity workspace)** plus roughly **half of Phase 6 (progressive disclosure)** — ~1,250 added lines across 17 modified files, 3 new files, and 1 deleted doc. Inventory:

**New files (untracked):**

- `backend/migrations/040_continuity_lineage.sql` — adds:
  - `shots.selected_continuity_base_frame_id UUID REFERENCES frames(id) ON DELETE SET NULL`
  - `frames.generated_from_frame_id UUID`, `frames.continuity_base_role TEXT` (check: `reuse_match | reuse_edit | camera_change_ref | match_copy | manual`), `frames.promoted_to_view_id UUID`
  - `location_views.promoted_from_frame_id UUID`
  - `projects.continuity_mode TEXT NOT NULL DEFAULT 'basic'` (check: `basic | advanced`, Phase 6)
  - plus partial indexes on each new FK column
- `backend/src/services/continuityBaseService.ts` — `ContinuityBaseService.listCandidates(query)` ranks approved/generated start frames as reuse/edit base candidates. Tiers: `strong` (same location + same direction, conf 0.95), `usable` (same location, no direction conflict, conf 0.6–0.7), `weak` (same location, direction mismatch, conf 0.4). Bonuses: same scene +0.03, approved status +0.02. Sort: tier → confidence → approved-first → recency. Excludes the requesting shot's own frames and imageless frames. Returns `[]` when `locationAssetId` is null. Default limit 8.
- `backend/src/tests/continuityCompositionService.test.ts` — currently 1 test: selected base is placed first in the manifest and package flips to `reuse_edit`

**Modified backend:**

- `backend/src/routes/frames.ts`
  - New `PUT /:projectId/scenes/:sceneId/shots/:shotId/continuity-base` (~line 1543) — body `{ frameId }` to select or `{ clear: true }` to clear. Validates the frame via `continuityBaseService.listCandidates` + `pickCandidateById` (400 if not a valid candidate). Persists `shots.selected_continuity_base_frame_id` and injects/removes a `continuity_base_frame` entry at position #1 of `reference_image_order` (helper `renumberReferenceOrder` relabels `Image #N`). Response: `{ success, selectedContinuityBase, candidates, referenceImageOrder }`.
  - Lineage writes (`generated_from_frame_id`, `continuity_base_role: 'match_copy' | 'manual'`) on `batch-link-copy` and `copy-frame` paths
  - `generate-continuity-prompt` route now loads scene assets via `continuityCompositionService.loadSceneAssetsForContinuity(sceneId)` (replacing the inline `scene_asset_instances` fetch) and `buildShotData` forwards `shot_order`, camera metadata, and all four `location_match_*` fields
- `backend/src/routes/projects.ts`
  - New `GET /:id/continuity-mode` / `PUT /:id/continuity-mode` (Phase 6) — reads/writes `projects.continuity_mode`, validates `basic|advanced`
  - New `GET /:id/continuity-metrics?sceneId=` — returns `{ continuityMode, scope, totals: { totalScenes, totalShots, unresolvedBaselineLocations, ambiguousBaselineLocations, directionCoverageGaps, fallbackReferenceShots, weakReferenceShots, selectedContinuityBaseShots, generatedFromBaseFrames, stage10ReuseRate }, suggestions[], strictValidation: { enabled, canProceed, issues[] } }`. Strict validation only activates in advanced mode.
  - `continuity-preview` route: selects `selected_continuity_base_frame_id` on shots, computes per-shot `continuityBaseCandidates` + selected base in a loop, passes both into `continuityCompositionService.buildGenerationPackages` (⚠ N+1 — see §1.4.4)
- `backend/src/routes/projectAssets.ts` — `establish-from-frame` endpoint accepts optional `frameId`; writes `location_views.promoted_from_frame_id` and back-pointer `frames.promoted_to_view_id`
- `backend/src/services/continuityCompositionService.ts`
  - `ContinuityCompositionInput` gains `continuityBase` and `continuityBaseCandidates` (accepts either the local or the ranked service's candidate type; `normalizeContinuityBase()` reconciles them)
  - `buildContinuityBaseManifestEntries()` — builds the `continuity_base_frame` manifest + persisted entries (providerRole `identity`, source `approved_frame`/`generated_frame`)
  - Base is prepended to `startEntries` and `startFrameImageOrder`
  - `generationModeForShot()` returns `reuse_edit` when a base is present (overrides `match`/`camera_change`)
  - `buildFrameInstructions()` / `buildContinuityInstructions()` / `buildAdaptationNotes()` emit base-aware language (same-direction → "preserve framing exactly"; different → "adapt framing, keep identity/lighting")
  - `strengthFromPackage()` — a base upgrades strength (strong base + no risks → `strong`)
- `backend/src/services/frameGenerationService.ts`
  - `fetchShotReferenceImageContext(shotId)` — new private method returning `{ references, continuityBaseFrameId, continuityBaseShotLabel, continuityBaseReason, continuityBaseRole }`. Resolves the selected base frame, requires status `approved|generated` + image URL (silently degrades to persisted refs otherwise), dedupes by URL before prepending as `identity`, classifies `reuse_match` (same direction) vs `reuse_edit`
  - Reuse/edit generation branch in **both** batch `generateFrames` and single-frame regeneration: takes priority over `match`/`camera_change` when a base is selected; prompt = `buildReuseEditPrompt()` which appends a `REUSE/EDIT CONTINUITY BASE:` delta-editing block to `shot.frame_prompt`
  - `startFrameGeneration()` accepts a `lineage` param and persists `generated_from_frame_id` + `continuity_base_role` on the frame row
  - Camera-change paths now track `refFrameId` and record `camera_change_ref` lineage
  - `fetchFramesForScene` selects + maps the shot location fields and `selected_continuity_base_frame_id`; `Frame` mapping includes `generatedFromFrameId`, `continuityBaseRole`, `promotedToViewId`
- `backend/src/services/promptGenerationService.ts` — `generated_frame` added to `ReferenceImageOrderEntry['source']` union

**Modified frontend:**

- `src/components/pipeline/Stage10FrameGeneration.tsx`
  - New `ContinuityBaseChooser` component (top of file): thumbnail cards for up to 3 candidates with suitability badge + reason, `Use`/`Using` button, `Fresh` clear button; rendered above the frame panels in control mode
  - Queries: `stage10-continuity-preview` (reuses `locationContinuityService.fetchContinuityPreview`) and `continuity-metrics`, both 30 s staleTime
  - Mutations: `updateContinuityBaseMutation` (invalidates frames + both preview keys, toasts), `updateProjectContinuityModeMutation`
  - Basic/Advanced pill toggle in the mode bar; strict-issues amber badge; `Lock & Proceed` disabled when `strictValidation.enabled && !canProceed` (both header and footer buttons)
  - `EstablishViewPrompt` now receives `frameId` for lineage
- `src/components/pipeline/Stage9/ContinuityPreviewPanel.tsx` — renders "Selected base" / "Suggested base" card (thumbnail, shot label, reason) from `preview.continuityBase` / `preview.continuityBaseCandidates[0]`
- `src/components/pipeline/Stage8/LocationCoveragePanel.tsx` — mode toggle now server-backed: `continuity-mode` query hydrates local state; clicking Basic/Advanced runs `updateContinuityModeMutation` (invalidates `continuity-mode` + `continuity-metrics`)
- `src/components/pipeline/EstablishViewPrompt.tsx` — optional `frameId` prop threaded into the establish call
- `src/lib/services/frameService.ts` — `updateContinuityBase(projectId, sceneId, shotId, frameId|null)`; `updateReferenceImages` retyped to `ReferenceImageOrderEntry[]`
- `src/lib/services/locationContinuityService.ts` — `fetchContinuityMode()`, `updateContinuityMode()`, `fetchContinuityMetrics(projectId, sceneId?)`
- `src/lib/services/projectAssetService.ts` — `establishViewFromFrame` accepts `frameId`; `promoteToGlobal` return typed
- `src/types/locationContinuity.ts` — `ContinuityMetricsResponse`; `ContinuityBaseCandidate` gains `sourceSceneId/sourceSceneNumber/status/approvedAt/generatedAt`; `continuityBaseCandidates` on preview + package; `generated_frame` source
- `src/types/scene.ts` — `ReferenceImageOrderEntry` gains `id/role/providerRole/referenceRole/reason/source`; `Frame` gains lineage fields; `ShotWithFrames.selectedContinuityBaseFrameId`
- `src/types/asset.ts` — `LocationView.promoted_from_frame_id`

**Deleted (uncommitted):** `._docs/location-continuity-phase-3-audit.md` — superseded by the progress audit; the deletion should be committed intentionally.

### 1.3 Verification results (run July 19, 2026, on the dirty working tree)

- Backend `npx tsc --noEmit` — **clean**
- Frontend `npx tsc --noEmit` — **clean**
- Backend `npm test` — **287 passed, 7 failed, 11 skipped**. All 7 failures are the pre-existing `image-generation.test.ts` visual-style-capsule failures documented in the progress audit as reproducible on `main`. No new failures.
- Frontend `npm test` — **244/244 passed**
- `npx eslint` on all modified frontend files — **clean**
- Backend `npm run lint` — still broken repo-wide (pre-existing ESLint plugin config error, documented since Phase 3)

### 1.4 Known defects and gaps found in the audit

These are the concrete problems standing between "code exists" and "stable":

1. **BLOCKER — Migration 040 has a syntax error.** The last line of `backend/migrations/040_continuity_lineage.sql` (line 100) is a stray `''` token after the final `COMMENT` statement. The file will fail if executed as-is.
2. **BLOCKER — Migration 040 has not been applied.** Every Phase 5 runtime path references columns from 040. Until the migration runs, Stage 10's frames query, the continuity-preview route, the continuity-mode endpoints, and the metrics endpoint will all error at runtime. (Confirm 039 is applied too; Phases 1–4 were manually tested so it almost certainly is.)
3. **Migration 040 is not idempotent.** Columns use `ADD COLUMN IF NOT EXISTS`, but the two `ADD CONSTRAINT` statements (`chk_frames_continuity_base_role`, `chk_projects_continuity_mode`) have no guard — re-running the file errors.
4. **N+1 query in the continuity-preview route.** `backend/src/routes/projects.ts` calls `continuityBaseService.listCandidates()` in a per-shot loop, and each call fetches **every start frame in the branch**. A 12-shot scene issues 12 full frame-table queries on every Stage 9/Stage 10 preview load.
5. **Manual reference edits can desync the selected base.** `PUT .../reference-images` (`backend/src/routes/frames.ts:1498`) writes `reference_image_order` verbatim with no awareness of `selected_continuity_base_frame_id`. If the user removes the `continuity_base_frame` entry in the reference editor, the column stays set and `fetchShotReferenceImageContext` silently re-prepends the base at generation time.
6. **`continuityMetrics.suggestions` are computed but never rendered.** No frontend surface displays them (grep confirms no consumer).
7. **Test coverage for the new machinery is thin.** One unit test total. Nothing for: `continuityBaseService` ranking, the `continuity-base` route, `fetchShotReferenceImageContext`, the reuse/edit generation branch, continuity-mode/metrics endpoints, or the Stage 9-preview-matches-Stage 10-references parity contract the 5-3 plan calls mandatory.
8. **No runtime smoke test has been done on any Phase 5 behavior** (it can't have been — the migration was never applied).
9. **Backfill state unknown.** `backend/scripts/backfill-shot-locations.ts` (commit `ea35f3c`) may never have been run in apply mode. Pre-Phase-1 shots without `location_asset_id` make every downstream surface report "unresolved/missing" — the system looks broken even when it isn't.

### 1.5 What the 5-3 plan says is left after that (Phases 6–7 remainder)

- Phase 6 remainder: surface suggestions / progressive-disclosure entry points (mode toggles + metrics endpoint already exist); stage-to-stage navigation mostly exists (Stage 9 → Stage 8 "Repair" button is live)
- Phase 7: threshold calibration from telemetry, alias tooling, strict-mode polish, regression suites — explicitly **post-stability**

Per `5-1` §3.10 and `5-2`, intentionally out of scope now: scene-specific view overrides, blocking/composition reference producers (roles reserved only), full previs tooling, project-wide coverage dashboard UI.

---

## Part 2: Definition of "Stable"

The system is stable when:

1. All schema referenced by shipped code exists in the database (039 + 040 applied, verified).
2. All Phase 5/6 working-tree code is reviewed, committed in coherent commits, and the branch builds green (both `tsc`, both test suites, eslint on touched files).
3. The four stage surfaces behave per the ownership map in `5-2` with **no runtime errors** on a real project: Stage 7 (baseline truth), Stage 8 (coverage/repair), Stage 9 (transparency), Stage 10 (reuse-first workspace).
4. The generation contract holds end-to-end: the references Stage 9 previews are exactly the references Stage 10 sends to the provider, including the continuity base at position #1 when selected — and a regression test enforces it.
5. A user can complete the core continuity loop on a fresh project: one location image → shots resolve to the location → generate a frame → select it as continuity base for a later shot → generated result reuses the background → optionally promote it to an established view, with lineage recorded.
6. Existing projects are not degraded: the backfill has been applied (or consciously deferred with the UI degrading gracefully to "unresolved" advisories, never errors).

---

## Part 3: The Plan

Executed in order. Workstreams 1–3 produce the stable state; 4–5 harden it; 6 is the explicit cut line.

### Workstream 1 — Land the in-flight Phase 5/6 work (highest priority)

#### Step 1.1 — Fix migration 040

File: `backend/migrations/040_continuity_lineage.sql`

a) Delete the stray `''` on line 100 (the file must end after the final `COMMENT ... ;`).

b) Make the two constraint additions idempotent. Replace:

```sql
ALTER TABLE frames
    ADD CONSTRAINT chk_frames_continuity_base_role
        CHECK ( ... );
```

with:

```sql
ALTER TABLE frames DROP CONSTRAINT IF EXISTS chk_frames_continuity_base_role;
ALTER TABLE frames
    ADD CONSTRAINT chk_frames_continuity_base_role
        CHECK (
            continuity_base_role IS NULL
            OR continuity_base_role IN (
                'reuse_match', 'reuse_edit', 'camera_change_ref', 'match_copy', 'manual'
            )
        );
```

and the same drop-then-add pattern for `chk_projects_continuity_mode` on `projects`. (Match the style used in 038/039 if they differ.)

#### Step 1.2 — Apply migrations (USER ACTION — per CLAUDE.md the agent never runs `npm run migrate` or supabase CLI)

Pre-check that 039 is applied (Supabase SQL editor):

```sql
select column_name from information_schema.columns
where table_name = 'shots'
  and column_name in ('location_asset_id','location_match_confidence','location_match_source','location_match_notes');
-- expect 4 rows
```

User runs, from `backend/`: `npm run migrate` (or their normal Supabase flow) to apply 040.

Post-check:

```sql
select table_name, column_name from information_schema.columns
where (table_name,column_name) in (
  ('shots','selected_continuity_base_frame_id'),
  ('frames','generated_from_frame_id'),
  ('frames','continuity_base_role'),
  ('frames','promoted_to_view_id'),
  ('location_views','promoted_from_frame_id'),
  ('projects','continuity_mode')
);
-- expect 6 rows

select conname from pg_constraint
where conname in ('chk_frames_continuity_base_role','chk_projects_continuity_mode');
-- expect 2 rows
```

#### Step 1.3 — Commit the working tree in coherent commits

Suggested slicing (mirrors the branch's existing commit style). Run `npx tsc --noEmit` (both sides) before each commit; full test suites after the last.

| # | Commit message | Files |
| --- | --- | --- |
| 1 | `location phase 5 - add continuity lineage migration (040)` | `backend/migrations/040_continuity_lineage.sql` (post-fix) |
| 2 | `location phase 5 - add continuity base ranking service` | `backend/src/services/continuityBaseService.ts` |
| 3 | `location phase 5 - thread continuity base through composition service` | `backend/src/services/continuityCompositionService.ts`, `backend/src/services/promptGenerationService.ts`, `backend/src/tests/continuityCompositionService.test.ts` |
| 4 | `location phase 5 - reuse/edit generation path and lineage in frame generation` | `backend/src/services/frameGenerationService.ts` |
| 5 | `location phase 5 - continuity-base endpoint and lineage writes in routes` | `backend/src/routes/frames.ts`, `backend/src/routes/projectAssets.ts` |
| 6 | `location phase 5 - stage 10 continuity base chooser UI` | `src/components/pipeline/Stage10FrameGeneration.tsx`, `src/components/pipeline/EstablishViewPrompt.tsx`, `src/lib/services/frameService.ts`, `src/lib/services/projectAssetService.ts`, `src/types/scene.ts`, `src/types/asset.ts` |
| 7 | `location phase 5 - surface continuity base in stage 9 preview` | `src/components/pipeline/Stage9/ContinuityPreviewPanel.tsx`, `src/types/locationContinuity.ts`, continuity-preview changes in `backend/src/routes/projects.ts` |
| 8 | `location phase 6 - project continuity mode and metrics endpoints + UI wiring` | mode/metrics routes in `backend/src/routes/projects.ts`, `src/components/pipeline/Stage8/LocationCoveragePanel.tsx`, `src/lib/services/locationContinuityService.ts` |
| 9 | `docs - retire phase-3 audit (superseded by progress audit)` | deletion of `._docs/location-continuity-phase-3-audit.md` |

Note: commits 7 and 8 both touch `backend/src/routes/projects.ts`; stage hunks selectively (`git add -p`) or merge them into one commit if hunk-splitting is more trouble than it's worth.

### Workstream 2 — Runtime verification and data repair

#### Step 2.1 — Backfill existing shots (USER-ASSISTED)

From `backend/`:

```bash
# Dry run, whole workspace or scoped:
npx tsx scripts/backfill-shot-locations.ts --project <projectId>
# Review the report (resolved / unresolved / ambiguous / confidence buckets), then:
npx tsx scripts/backfill-shot-locations.ts --project <projectId> --apply
# Optional: --threshold 0.90 (default is DEFAULT_LOCATION_AUTO_APPLY_CONFIDENCE)
```

Apply mode only touches non-manual shots with non-ambiguous matches at/above threshold. Spot-check 5–10 shots in Stage 7 afterward.

#### Step 2.2 — End-to-end smoke test

Requires backend `npm run dev` (tsx watch) + frontend dev server, on a project with at least one location asset and several shots sharing it.

1. **Stage 7**: shots show linked location, confidence, source; accept/override/clear works; scene banner counts (unresolved/ambiguous/mismatch) correct.
2. **Stage 8**: coverage panel groups by canonical location; Basic/Advanced toggle **persists across page reloads** (now server-backed); direction assignment and "use approved frame as view" work.
3. **Stage 9**: continuity panel renders per shot — strength badge, generation-mode badge, reference cards with role labels/reasons, fallback chain, suggested-base thumbnail when candidates exist; "Repair in Stage 8" navigates back.
4. **Stage 10 fresh path**: generate a start frame normally; verify roles respected (locations `style`, characters `identity`).
5. **Stage 10 reuse path**: approve a frame on shot A → select shot B (same location) → ContinuityBaseChooser lists the candidate → `Use` → verify in DB:
   ```sql
   select selected_continuity_base_frame_id, reference_image_order->0->>'referenceRole'
   from shots where id = '<shotB>';
   -- expect the frame id and 'continuity_base_frame'
   ```
   → generate → check backend logs/provider payload: first reference is the base image, prompt contains `REUSE/EDIT CONTINUITY BASE` → verify lineage:
   ```sql
   select generated_from_frame_id, continuity_base_role from frames
   where shot_id = '<shotB>' and frame_type = 'start';
   -- expect base frame id + reuse_match or reuse_edit
   ```
6. **Clear base** (`Fresh`) → column nulled, manifest entry removed, labels renumbered.
7. **Establish-from-frame** → `location_views.promoted_from_frame_id` and `frames.promoted_to_view_id` both set.
8. **Advanced mode**: enable → strict badge appears when issues exist and `Lock & Proceed` disables; back to basic → unblocks.
9. **Camera-change shot**: continuity prompt includes location views/camera metadata; `camera_change_ref` lineage written.

Log every failure; fix before proceeding. This step is where "a lot of problems occurred after implementation" gets retired with evidence.

### Workstream 3 — Correctness and performance fixes (defects §1.4, items 4–6)

#### Step 3.1 — Kill the N+1 in `continuity-preview`

`backend/src/services/continuityBaseService.ts`: add a batch method that fetches branch start-frames **once** and ranks per shot in memory:

```ts
async listCandidatesForShots(query: {
  projectId: string;
  branchId: string;
  sceneId: string;
  shots: Array<{ shotId: string; locationAssetId: string | null; cameraDirectionId: string | null }>;
  limitPerShot?: number;
}): Promise<Map<string, ContinuityBaseCandidate[]>>
```

Implementation: run the existing frames query exactly once (same select/filters), then loop `query.shots` applying the existing per-row scoring/sort/slice. Refactor `listCandidates` to delegate to the batch method with a single-shot array so scoring stays in one place. Keep the single-shot signature for the `continuity-base` PUT route.

`backend/src/routes/projects.ts` continuity-preview route: replace the per-shot `await listCandidates(...)` loop with one `listCandidatesForShots` call; keep the `pickCandidateById` selection per shot.

Optional hardening: trim the frames select to the columns actually used, and consider `.limit()` if branch frame counts grow large.

#### Step 3.2 — Keep `selected_continuity_base_frame_id` and the manifest in sync

`backend/src/routes/frames.ts` `PUT .../reference-images` (line 1498): before the update, when `frameType === 'start'`:

```ts
const { data: shotRow } = await supabase
  .from('shots')
  .select('selected_continuity_base_frame_id')
  .eq('id', shotId).eq('scene_id', sceneId).single();

const hasBaseEntry = referenceImages.some(
  (e: { referenceRole?: string }) => e.referenceRole === 'continuity_base_frame'
);
const updates: Record<string, unknown> = {
  [column]: referenceImages,
  updated_at: new Date().toISOString(),
};
if (shotRow?.selected_continuity_base_frame_id && !hasBaseEntry) {
  updates.selected_continuity_base_frame_id = null; // user removed the base entry → clear selection
}
```

Also reject (400) a submitted start manifest containing a `continuity_base_frame` entry whose id doesn't match `continuity-base-${selected_continuity_base_frame_id}` — prevents forging a base through the editor.

#### Step 3.3 — Render metrics suggestions (minimal Phase 6 disclosure)

- `src/components/pipeline/Stage8/LocationCoveragePanel.tsx`: query `continuity-metrics` (already exposed by `locationContinuityService.fetchContinuityMetrics`); when in basic mode and `suggestions.length > 0`, render a dismissible advisory strip (session-local dismiss state is fine) above the coverage sections. This is the progressive-disclosure entry point `5-1` §3.3 asks for.
- `src/components/pipeline/Stage10FrameGeneration.tsx`: wrap the strict-issues badge in a `Tooltip`/`Popover` listing `strictValidation.issues` so the disabled `Lock & Proceed` is explainable.

### Workstream 4 — Test hardening (the plan's mandatory QA contract)

Priority order; backend tests live in `backend/src/tests/`, frontend in `__tests__/` beside sources.

1. **Preview/generation parity test** (5-3 "Risk 6" — the single most important one). Extend `backend/src/tests/continuityCompositionService.test.ts`: for a shot with a selected base, assert `buildGenerationPackage().persistedStartFrameManifest` equals (url + role sequence) what `frameGenerationService.fetchShotReferenceImageContext()` returns given mocked Supabase rows for the same shot + base frame. Scenarios: base + direction match, base with direction mismatch, no base → fallback chain, manual entries preserved.
2. **`continuityBaseService` unit tests** (`backend/src/tests/continuityBaseService.test.ts`, mock `supabase` per existing patterns): tier assignment (strong/usable/weak); exclusion of self, other-location, imageless, wrong-status frames; sort order (tier → confidence → approved-first → recency); `listCandidatesForShots` issues exactly one query (assert on the mock).
3. **Route tests** (Supertest): `PUT continuity-base` select/clear/invalid-frame/404s; `GET/PUT continuity-mode` validation (rejects junk values); `GET continuity-metrics` totals math on a seeded fixture (known counts of unresolved/direction-gap/fallback shots).
4. **`fetchShotReferenceImageContext` edge cases**: stale base (frame deleted or status `rejected`) degrades to persisted refs without crashing; URL dedupe when the base already exists in the manifest.
5. **Frontend**: `ContinuityBaseChooser` render states (loading / no candidates / selected / candidate list) with RTL + MSW, colocated `__tests__` next to `Stage10FrameGeneration.tsx`.

Exit: both suites green apart from the 7 pre-existing `image-generation.test.ts` failures (a `main` bug, out of location scope — do not let it block this branch; track separately).

### Workstream 5 — Documentation closeout

- Update `._docs/location-continuity-progress-audit.md` (or supersede with a `7-x` audit) recording: Phase 5/6 implementation state, smoke-test results, endpoint map additions (`PUT …/continuity-base`, `GET/PUT /:id/continuity-mode`, `GET /:id/continuity-metrics`), and the WS3 fixes.
- Note explicitly that Phase 7 (calibration/telemetry) is deferred, so the next developer doesn't "finish every unchecked box" — the exact trap `5-1` §3.10 warns about.

### Workstream 6 — Explicit cut line (do NOT build now)

Reaffirming the 5-x non-goals for this stabilization pass:

- Scene-specific location view overrides
- Blocking/composition reference producers (roles stay reserved)
- Per-scene continuity-mode overrides (project-level exists)
- Project-wide coverage dashboard UI (metrics endpoint suffices)
- Phase 7 threshold calibration, alias-authoring UI, telemetry pipelines
- Any new Stage 7 direction-editing surface (Stage 8 owns it)

---

## Part 4: Execution Order Summary

| # | Step | Type | Gate |
| --- | --- | --- | --- |
| 1 | Fix migration 040 (stray `''`, constraint idempotency) | Code | file is valid SQL |
| 2 | Apply 040 (+verify 039) | **USER** | 6 columns + 2 constraints exist (SQL checks in §WS1.2) |
| 3 | Commit working tree in ~9 coherent commits | Git | tsc + tests green |
| 4 | Backfill dry-run → apply | **USER-assisted** | unresolved rate acceptable; Stage 7 spot-check |
| 5 | Full smoke test (checklist §WS2.2) | Manual | zero runtime errors; fix list emptied |
| 6 | N+1 fix, manifest/base sync, suggestions UI | Code | tsc + tests green |
| 7 | Test hardening (parity test first) | Code | suites green |
| 8 | Update progress audit; declare stable | Docs | Part 5 checklist |

## Part 5: Definition of Done (checklist)

- [ ] Migration 040 fixed, applied, verified (SQL checks pass)
- [ ] All working-tree changes committed; branch builds clean (backend tsc, frontend tsc)
- [ ] Backend tests: no failures beyond the 7 pre-existing `image-generation.test.ts` (tracked separately)
- [ ] Frontend tests: all passing
- [ ] Backfill applied or consciously deferred with graceful degradation confirmed
- [ ] Smoke-test checklist passes end-to-end on a real project, including the reuse/edit loop and established-view promotion with lineage
- [ ] Continuity-preview route issues O(1) frame queries per scene, not O(shots)
- [ ] Manual reference edits cannot silently desync the selected continuity base
- [ ] Preview/generation parity enforced by an automated test
- [ ] Metrics suggestions surfaced in Stage 8; strict issues explainable in Stage 10
- [ ] Progress audit updated; Phase 7 explicitly deferred

---

## Appendix A: System File Map (for whoever executes this)

**Backend services** (`backend/src/services/`):

- `locationResolverService.ts` — baseline `location_asset_id` resolution (exact/alias/fuzzy/direction-parent scoring, ambiguity, audit events)
- `locationCoverageService.ts` — Stage 8 coverage summaries (groups by `location_asset_id`, overlays views/directions, per-shot states)
- `continuityCompositionService.ts` — the canonical continuity assembly path; builds `GenerationContinuityPackage` + `ShotContinuityPreview`; used by Stage 9 preview and the camera-change continuity prompt
- `continuityBaseService.ts` — reuse/edit base candidate ranking (NEW, uncommitted)
- `promptGenerationService.ts` — prompt + manifest building (`scopeAssetsForShotContinuity`, `enrichAssetsWithAngleMatch`, `buildNumberedImageManifest`, `buildFrameReferenceManifests`)
- `frameGenerationService.ts` — Stage 10 generation; consumes persisted manifests; reuse/edit + camera-change + match-copy paths; lineage persistence

**Backend routes:**

- `backend/src/routes/projects.ts` — shots CRUD, `resolve-locations`, `location`, `camera-direction`, `location-coverage`, `continuity-preview`, `continuity-mode`, `continuity-metrics`, `generate-prompts`
- `backend/src/routes/frames.ts` — frames CRUD/generation, `reference-images`, `continuity-base` (NEW), `generate-continuity-prompt`, copy/batch-link-copy
- `backend/src/routes/projectAssets.ts` — location-view CRUD, `generate-image`, `establish-from-frame`

**Migrations:** `038_location_views_and_shot_camera_metadata.sql`, `039_shot_location_identity.sql` (applied), `040_continuity_lineage.sql` (NEW, unapplied, needs fix)

**Frontend:**

- Stage 7: `src/components/pipeline/Stage7ShotList.tsx` (linked-location rows)
- Stage 8: `src/components/pipeline/Stage8/LocationCoveragePanel.tsx`
- Stage 9: `src/components/pipeline/Stage9/ContinuityPreviewPanel.tsx`, wired in `Stage9PromptSegmentation.tsx`
- Stage 10: `src/components/pipeline/Stage10FrameGeneration.tsx` (+ `ContinuityBaseChooser`), `EstablishViewPrompt.tsx`, `FramePanel.tsx`
- Services: `src/lib/services/locationContinuityService.ts`, `frameService.ts`, `shotService.ts`, `projectAssetService.ts`
- Types: `src/types/locationContinuity.ts`, `scene.ts`, `asset.ts`

**Scripts:** `backend/scripts/backfill-shot-locations.ts` (`--project`, `--branch`, `--threshold`, `--apply`; defaults to dry-run)

## Appendix B: Key DTO Vocabulary (from 5-3 Phase 0 glossary, as implemented)

- **location** — narrative space identity; canonical form is `shots.location_asset_id`
- **location reference** — baseline image/description on the location `project_asset`
- **location view / camera direction** — `location_views` row; advanced-mode viewpoint
- **established view** — a view whose image was promoted from a generated frame (`promoted_from_frame_id` / `established_from_shot_id`)
- **continuity base** — an approved/generated start frame selected as the reuse/edit base for another shot (`shots.selected_continuity_base_frame_id`)
- **generation package** — `GenerationContinuityPackage`: per-shot prompt instructions + ordered reference manifests + base + risks
- **reference manifest** — `reference_image_order` / `end_frame_reference_image_order` on shots; entries carry `referenceRole`, `role`/`providerRole` (`identity`/`style`), `reason`, `source`
- **attachment roles** — `location_direction_main`, `location_establishing_context`, `location_asset_fallback`, `continuity_base_frame`, `character_identity`, `prop_identity`, + reserved `blocking_*` roles
