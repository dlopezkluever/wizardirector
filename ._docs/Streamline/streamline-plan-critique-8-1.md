# Streamline Master Plan — Critique & Recommendations

*Reviewed against the current codebase (Aug 1, 2026) — findings below are grounded in what's actually implemented, not just the plan's own description of it.*

---

## 1. Phase 1.1's "skipped" state is described as an enum addition — it's actually a rewrite of the stage state machine

**Where:** Plan §5, Phase 1.1.

**Concern:** `ProjectView.tsx`'s stage hydration/navigation logic is hard-coded around strict linear progression: `highestLockedStage + 1`, `Math.min(highestLockedStage + 1, 5)`, a navigation guard that only understands `status !== 'pending'`, and `handleStageComplete` which literally advances to `stageNumber + 1`. None of this has any concept of "land on Stage 4 with 2 and 3 marked skipped." Adding a `SKIPPED` status isn't a new badge on top of existing logic — every one of those derivations has to be rewritten to handle non-contiguous unlocked ranges. The plan frames this as "backend stage-locking rules... understand a new state," which undersells it as a schema change when it's really a state-machine redesign.

**Decided: treat this as the riskiest item in Phase 1, not the most mechanical one — the full derivation rewrite is spiked out below (§1.1-§1.6) rather than left as a timeline risk to discover mid-build.** The target model, endpoint, frontend derivation rewrite, atomic commit, and locked invariants are fully specified in §1.1-1.6; nothing about Phase 1.1 should be scheduled as "just add an enum value" against those sections.

### 1.1 How the current machine actually works, in full (grounded in code, not the plan's description of it)

Two separate status vocabularies exist today, and they don't map 1:1:

- **Persisted** (`stage_states.status`, DB `CHECK` constraint, `backend/migrations/001_initial_schema.sql:58`): `draft | locked | invalidated | outdated`. This table is an **append-only version log** — every save, lock, and unlock inserts a *new row* (`version = previous + 1`); nothing is ever updated in place. "Current state" of a stage is always "latest version for this `branch_id` + `stage_number`."
- **Derived UI** (`StageStatus`, `src/types/project.ts:7`): `locked | active | pending | outdated`. `pending` is not a persisted value — it means *no `stage_states` row exists yet* for that stage number.

Three places independently enforce or assume sequential-only progression:

1. **Backend `lock` endpoint** (`backend/src/routes/stageStates.ts:337-362`): before locking stage N, it queries stage N-1's latest version and hard-rejects (`400`) unless its status is exactly `'locked'`. This is a **server-side gate**, completely independent of anything the frontend does — a redesign that only touches React state changes nothing here, and Streamline would get a `400` the first time it tried to lock Stage 4 with Stages 2-3 untouched.
2. **Backend `unlock` endpoint** (`stageStates.ts:406-557`, Phase A / stages 1-5 only): cascades in exactly one direction — unlocking stage N marks every `locked`/`outdated` stage in N+1..5 as `outdated`. There is no dependency edge in the other direction anywhere in this schema; nothing here or elsewhere ever asks "does an earlier stage need to know a later stage changed."
3. **Frontend hydration** (`ProjectView.tsx:280-339`): scans all stage states to compute `highestLockedStage` and `highestDraftStage`, then sets `derivedStage = highestDraftStage || Math.min(highestLockedStage + 1, 5)`. The navigation guard (`ProjectView.tsx:342-365`) blocks entry into any stage whose derived status is `pending`. `handleStageComplete` (`ProjectView.tsx:422-439`) locks stage N and hardcodes the *next* active stage as `stageNumber + 1`. `PhaseTimeline.tsx` renders exactly four statuses (icon + color) and its click guard only understands `pending`.

None of these five surfaces has a concept of "a stage exists in the sequence, was never generated, and that's an intended, terminal outcome — not a hole." A real implementation touches all five, not just the type definition.

### 1.2 Target model

**Extend the persisted enum:** `draft | locked | invalidated | outdated | skipped` (migration: alter the `CHECK` constraint on `stage_states.status`).

**Decision: does a skipped stage get a real `stage_states` row, or is it tracked elsewhere?**

- **Option A (recommended).** Skip = a normal `stage_states` row, `status: 'skipped'`, `content: {}`. It's a strict narrowing of the existing version-chained pattern — the "latest version per stage" query, the audit trail, and the version-increment logic all keep working with zero new code paths. The only new discipline required is that any reader of stage 2/3 content must already tolerate a sparse/empty object — which downstream code arguably needs to do anyway, since a brand-new project's Stage 2 draft is *also* near-empty before the user has typed anything.
- **Option B.** Skip = no row at all; track skipped stage numbers on the `projects` row or branch metadata instead. Avoids any chance of a downstream reader mistaking `{}` for real content, but forks the sequential-lock and unlock-cascade queries into two code paths (one that reads `stage_states`, one that also has to consult the new field) for every place that currently assumes "the stage_states table is the single source of truth for progression."

Recommend **A** — it costs one migration and one new endpoint, not a parallel tracking system.

**New endpoint:** `POST /:projectId/stages/:stageNumber/skip`. Validates: (a) `stageNumber` is 2, 3, or 4 only — Stage 1 can never be skipped (see invariants below), and Stage 5/Assets is never skipped in any plan scenario; (b) stage `stageNumber - 1`'s latest version status is `'locked'` **or** `'skipped'` — this generalizes the existing sequential check to treat "passed over" the same as "completed"; (c) no `'locked'` version already exists for this stage number — skipping over real content should be rejected outright, not silently discarded; the user must explicitly unlock first. On success: inserts a new version, `status: 'skipped'`, `content: {}`.

**One-line change that makes skip actually load-bearing:** the existing lock endpoint's sequential check (`stageStates.ts:352`) becomes `previousStageState.status !== 'locked' && previousStageState.status !== 'skipped'` → reject. Everything else in this section is bookkeeping around that single condition.

**Backfill (plan's 1.2) is not a new state — it's a content-write on an already-skipped stage.** Generate the content, then run it through the existing lock-with-content path (`PUT .../stages/:n` with `status: 'locked'`). No "backfilled" status is needed; provenance is carried on the content itself — a `content._origin: 'skipped' | 'imported' | 'ai-generated' | 'authored'` tag that the frontend reads to pick the AUTO-FILLED / IMPORTED / (default) badge from plan §7. This is the same "tag the field with where it came from" pattern already proven by `LocationViewSource` in `src/types/asset.ts` (see critique item 8) — one field, no second enum needed just to answer "how did this content get here."

### 1.3 Frontend derivation rewrite

Replace the `highestLockedStage`/`highestDraftStage` arithmetic with a walk that treats `locked` and `skipped` as equally "passed":

- `isPassed(status) = status === 'locked' || status === 'skipped'`.
- `derivedStage` = the first stage in 1..5 that is *not* passed; if all five are passed, derived stage is 6 (Script Hub) — a direct generalization of the existing `min(highestLockedStage + 1, 5)` cap, not a new algorithm shape.
- Navigation guard: still blocks `pending`. A `skipped` stage becomes enterable, but in a **third render mode** — a read-only placeholder ("This stage was skipped — [Generate this now]") distinct from both the active editor and the locked read-only view — not a variant of either existing mode.
- `handleStageComplete`'s hardcoded `stageNumber + 1` advance is untouched for the normal path. The Streamline commit flow (1.4) bypasses it entirely, since skipping/importing several stages in one action isn't "completing" them one at a time.

### 1.4 The commit has to be one atomic operation, not N sequential calls

Streamline's review-then-commit step (plan §5, 2.2) can, in a single "Confirm" click, need to lock Stage 1, skip Stage 2, skip Stage 3, and lock Stage 4 with parsed content — up to four state transitions at once. If the frontend fires these as four sequential `fetch` calls and the third fails, the project is left half-skipped, and the sequential-lock check will likely reject whatever the user tries next, with no clean way back.

**Recommend one new endpoint**, e.g. `POST /:projectId/streamline/commit`, taking the full target state (`{ 1: 'locked', 2: 'skip', 3: 'skip', 4: { status: 'locked', content } }`) and applying it inside a single Postgres transaction (Supabase RPC, not sequential REST calls) — all transitions succeed or none do. Don't conflate this with plan §5 2.4's partial-success handling — that's about individual *files* in a batch being independently recoverable, which is fine; a half-applied stage-skip is not recoverable the same way, because the sequential-lock invariant depends on it being all-or-nothing.

### 1.5 Invariants worth writing down before anyone implements this

- Stage 1 can never be skipped — it's where the project itself (mode, rating, genre, target length) is configured; Streamline is a Stage 1 *input mode*, not a replacement for Stage 1 existing.
- A stage can only transition to `skipped` from `pending` — never from `locked` (skip is not a way to discard existing content; unlock is).
- A `skipped` stage's `content` is always `{}`. Nothing downstream should ever read real data out of a skipped stage — only out of whatever eventually replaces it via backfill (`skipped → locked`).
- Backfilling does **not** create a live dependency edge back to its source stage (per critique item 5). If Stage 4's script is edited again after Stage 2/3 were backfilled from it, Stage 2/3 do **not** automatically become `outdated` — the unlock-cascade only ever walks forward (N → N+1..5), and this design deliberately doesn't add a backward edge. Drift after the fact is an accepted limitation, not a bug.
- Skip is a Phase A (stages 1-5) concept only. Scene-level stage locks for stages 7-12 (`sceneStageLockService`) are untouched — Streamline's mid-production contextual intake (plan §5, Phase 5.2) is out of scope for this state-machine change and would need its own analysis before it could ever apply "skipped" at the scene-stage level.

### 1.6 Decisions locked in (confirmed 2026-08-01)

**A. Un-skip path: support both manual and AI.** A skipped stage gets two ways out: "Write this myself" (`skipped → draft`, empty content, normal editor, no credits spent) and "Generate from script" (AI backfill, `skipped → locked` directly, spends credits). Both reuse existing transitions (the manual path is exactly what unlock already produces) — no new state, just a new UI entry point on the skipped-stage placeholder offering both actions.

**B. Commit atomicity: Postgres RPC / stored procedure.** `POST /:projectId/streamline/commit` is backed by a single stored procedure that inserts all target-state rows (lock/skip/lock-with-content) in one transaction — all-or-nothing, no app-level rollback logic. Requires a migration adding the function alongside the `stage_states.status` enum change from §1.2.

---

## 2. Phase 1 (skip) is sequenced before Phase 2/3 (classification) — but real skip decisions need classification

**Where:** Plan §5, Phase 1 vs Phase 2-3.

**Concern:** The plan's own framing is "the app actually bypasses Stages 2 and 3" when it "recognizes a formatted screenplay with high confidence." But confidence scoring, the as-is/AI-format decision, and file-type detection are Phase 3.1 concepts. If Phase 1 ships first, it either needs its own throwaway heuristic ("looks like a script if it has INT./EXT. headings") that Phase 3 later replaces, or it silently depends on Phase 3 work that isn't scheduled yet. Either way, Phase 1 isn't really independently shippable the way the plan's "each phase delivers something a user can feel on its own" framing claims.

**Decided: Phase 1 reuses the existing screenplay parser as its detector — there is no throwaway heuristic to build.**

`src/lib/utils/screenplay-converter.ts:66` already has `parseScriptToTiptapJson(plainText)` — a state-machine parser that classifies every line of a plain-text script into `sceneHeading`, `transition`, `dialogueLine`, or `action` nodes. This is exactly the signal Phase 1 needs, and it's also the function that has to run regardless to turn an uploaded script into Stage 4's TipTap content (see item 6's call chain) — so Phase 1 and Phase 3.1 end up sharing one parse, not two.

**Confidence rule, locked in:**
- Run `parseScriptToTiptapJson()` on the uploaded text; count `sceneHeadingCount` (nodes of type `sceneHeading`) and `dialogueCount` (nodes of type `dialogueLine`).
- **High confidence** — `sceneHeadingCount >= 3` and `dialogueCount >= 1` → offer the skip-to-Stage-4 path from plan §4's first scenario ("This looks like a complete screenplay...").
- **Ambiguous** — 1-2 scene headings, or headings with zero dialogue → do not auto-skip; surface the same "58% confident — is this right?" prompt Phase 3.1 will later generalize to every file type. Phase 1 doesn't need a separate UI for this, just the same confidence-prompt component built one phase early.
- **Low / not a script** — `sceneHeadingCount === 0` → treat as prose (treatment/notes); don't offer skip.

Phase 3.1 wraps this rather than replacing it: it adds *file-type* detection (treatment vs. beat sheet vs. script) and the as-is/AI-format choice around the same script-confidence math. Treat the two threshold constants (`3` headings, `1` dialogue line) as tunable config, not inline magic numbers, since they'll likely need adjusting once real uploads are seen.

---

## 3. PDF/DOC/RTF extraction is a bigger architectural fork than "needs to actually work"

**Where:** Plan §5, Phase 2.1.

**Concern:** Checked `FileStagingArea.tsx` — for `application/pdf` it currently just `resolve('')` and never reads the file. There is no client-side PDF text extraction today, and DOC/DOCX/RTF aren't handled either (only `readAsText` for plain text). This isn't a bug fix, it's greenfield: it decides whether Streamline's intake is a frontend-only component (bundle a JS PDF parser, e.g. pdf.js, and accept the bundle-size/quality tradeoff) or requires a new backend upload+extract endpoint. Phase 2.1 talks about this as an extension of the existing staging area but doesn't name the fork.

**Decided: server-side extraction, and drop legacy `.doc` from the supported list.** Extracting on the backend — rather than bundling a PDF/DOCX parser (e.g. pdf.js) into the frontend — keeps the client lean, matches the direction the app already leans (backend-heavy processing for images/jobs), and avoids the failure modes a browser-side parser would hit: real bundle-size cost, and uneven extraction quality in-browser for scanned PDFs and complex DOCX styling that a server-side library handles more predictably.

New endpoint, e.g. `POST /api/projects/:projectId/streamline/extract-file` (multipart, one file per call, so Phase 2.4's partial-success handling can retry or drop individual files without touching the rest of the batch). Per MIME type:
- **PDF** — `pdf-parse` (pure JS, no system binary). Confirmed via grep that nothing like it is in `backend/package.json` today — this is a new dependency, not a config toggle on an existing one.
- **DOCX** — `mammoth` (pure JS, clean `.docx` → text/HTML). Also new.
- **RTF** — a lightweight pure-JS RTF-to-text parser (e.g. `@iarna/rtf-to-text`). RTF's format is simple enough that a pure-JS parser is reliable.
- **Legacy `.doc` (binary Word 97-2003) — dropped.** Reliable `.doc` parsing needs a system-level tool (`antiword`, `textract`, headless LibreOffice), a materially heavier infra dependency than the other three. The plan lists "DOC/DOCX" as one bullet as if equally supported; they aren't. Phase 2.1's upload UI should reject `.doc` outright with "please save as .docx or .pdf," not attempt and silently fail.

Extracted text feeds directly into item 2's detection step (`parseScriptToTiptapJson` for script-shaped content) and, later, Phase 3.1's classifier — extraction and classification both happen server-side in the same request; text never round-trips to the browser and back.

---

## 4. New badge taxonomy (§7) doesn't reconcile with the status vocabulary that already exists

**Where:** Plan §7, "Skipped-stage display."

**Concern:** The plan proposes SKIPPED / AUTO-FILLED / IMPORTED as three new badges. But the codebase already has, across two different status fields, `locked | active | pending | outdated` (`StageStatus` in `src/types/project.ts`) and separately `draft | locked | invalidated | outdated` (`stageStateService.ts`'s persisted status). That's already two overlapping vocabularies for "state of a stage." Adding three more badge states on top — without a stated mapping to the existing `outdated`/`invalidated` values — risks a UI where a stage can be simultaneously "outdated" and "skipped" with no defined precedence for which badge wins.

**Decided: the precedence table.** A stage's badge is a pure function of `(persisted status, content._origin)` — `content._origin` is the provenance tag introduced in item 1 §1.2 (`'imported' | 'ai-generated' | 'authored'`; absent for content written before this field existed or entered normally through an editor):

| Persisted status | `content._origin` | Badge shown | Enterable |
|---|---|---|---|
| `skipped` | — (`content` is always `{}`) | **SKIPPED** | Yes — placeholder + backfill/manual CTA (item 1 §1.6.A), never the full editor |
| `locked` | `'imported'` | **IMPORTED** | Yes — normal locked read-only view |
| `locked` | `'ai-generated'` | **AUTO-FILLED** | Yes — normal locked read-only view |
| `locked` | `'authored'` / absent | *(no special badge — existing checkmark)* | Yes — normal locked read-only view |
| `draft` | any | *(existing "active", no badge)* | Yes — editable |
| `outdated` | any | **existing outdated warning wins**; origin shown only as secondary subtext (e.g. "Outdated · Imported") | Yes — existing unlock/regenerate flow |
| `invalidated` | — | **Confirmed unused for Phase A `stage_states` today** — grepped every call site; nothing sets this status on a `stage_states` row (it's used elsewhere, for `frames`/`videos` row status and scene-level invalidation). Reserved, no badge — don't build handling for a transition that doesn't occur in this table. | n/a |
| `pending` | — (no row) | *(existing greyed "pending")* | No |

**Precedence rule:** `outdated` (a staleness warning) always visually outranks an origin badge (informational only) — safety signal beats provenance label. `skipped` outranks everything trivially, since no other status can co-occur with it on the same row.

---

## 5. Backfill (1.2) runs the pipeline's dependency direction backwards, and nothing addresses what happens next

**Where:** Plan §5, Phase 1.2.

**Concern:** Every other stage transition in this app flows downstream: Stage N generates from Stage N-1, and editing Stage N-1 can mark Stage N `outdated`. Backfill inverts this — Stage 4 (script) generates *into* Stage 2/3 after the fact. The plan doesn't say what happens if the user then edits Stage 4 again after backfilling Stage 2/3: does Stage 2 become `outdated` relative to a stage that comes *after* it in the pipeline? That's a dependency edge the current `outdated` cascade logic was never built to express (it assumes N depends on N-1, never the reverse).

**Decided: no auto re-sync — locked in at item 1 §1.5, restated here with the UI consequence it requires.** Backfilling is a one-time content-write (`skipped → locked`, `content._origin: 'ai-generated'`); it registers no dependency edge back to Stage 4, and the unlock-cascade (which only ever walks forward, N → N+1..5) is not extended backward. If Stage 4 is edited again later, Stage 2/3 are left exactly as they were — no automatic `outdated` flag, ever. This is deliberately the cheap option over building a reverse-dependency edge into the cascade, consistent with 1.2's own "never automatic" principle for the backfill trigger — the same non-automatic philosophy applies to re-sync.

**The consequence this forces:** since the system will never tell the user their backfilled content drifted, the AUTO-FILLED badge (item 4's table) needs a static timestamp/tooltip the moment it's written — "Generated from script on [date] — won't update automatically if the script changes later." That single string is the entire mitigation for choosing the cheap option over a reverse-cascade one; it's what makes no-auto-resync an accepted tradeoff instead of a silent trap. Not a new build item — one string on an existing badge component.

---

## 6. Phase 3.2 reads as new asset-extraction work — it's actually mostly re-routing an existing service

**Where:** Plan §5, Phase 3.2, "Character, location, and prop descriptions... feed Stage 5's asset extraction."

**Concern:** `backend/src/services/assetExtractionService.ts` (`AssetExtractionService.extractAssets()`) already does character/location/prop extraction from scripts today. The plan doesn't mention this, which makes 3.2 look like it requires building an extraction pipeline from scratch when it's largely wiring Streamline's intake surface into an already-built service.

**Decided: the actual call chain to reuse, plus a correction the plan needs.** `assetExtractionService.ts`'s own comments mark `extractAssets(masterScript, branchId, visualStyleId)` `@deprecated`. The live path is `aggregatePreview(branchId)` (free, structural, reads pre-extracted scene dependencies) → user selects entities → `extractSelectedAssets(branchId, selectedEntities, ...)` (the only step that calls an LLM, and only for what's selected). Phase 3.2 should target this pair, not the deprecated function the plan's wording implies.

That gives the full chain Streamline's script-import path needs to drive — and it's the same chain Stage 4 already runs today, not a new one:
1. Uploaded script text → `parseScriptToTiptapJson()` (item 2's same parse, reused, not duplicated) → saved as Stage 4's `content`.
2. Scene splitting + dependency extraction → the existing deterministic path at `backend/src/routes/projects.ts:1301-1336`: `extractManifest(tiptapDoc)` (`scriptManifest.ts`) produces per-scene characters/location/props with **zero LLM calls**. This runs today whenever any user locks Stage 4 normally — Streamline triggers the same code after its skip-commit writes Stage 4's content, it doesn't rebuild it.
3. Stage 5 asset list → `aggregatePreview(branchId)` (free) → user selects entities to keep → `extractSelectedAssets(...)` (LLM cost, only for selections).

**Correction this forces on Phase 2.3's credit estimate:** the review-step estimate should read "N assets × visual-distillation cost" (step 3 only) — steps 1-2 are deterministic and free, exactly as for every non-Streamline script upload today. A flat per-file or per-script charge would overstate the cost.

**Second correction — "their own files or extracted from a script" is two mechanisms, not one.** A standalone character-notes file has no scene to attach dependencies to, so it cannot go through `aggregateSceneDependencies`/`aggregatePreview` at all — that path requires real scene rows to exist first. Standalone asset files need their own, lighter path: one small LLM call per file that reads the note and pre-fills a single Stage 5 asset draft (name, type, description), tagged with the existing `source: 'extracted'` field (`src/types/asset.ts`, already used elsewhere — see item 8) for the user to confirm. List this as its own Phase 3.2 line item, not a variant of the script-extraction reuse above — otherwise it will get estimated as free by association, and it isn't.

---

## 7. Ask Auteur (Phase 4) has no data model, and it's the most architecturally novel piece in the plan

**Where:** Plan §5, Phase 4.

**Concern:** There's no existing multiple-choice clarification UI anywhere in the codebase to build on (searched for it — nothing). Phase 4.1 says answers are "saved as first-class project context and feed into every downstream generation, not just used once and discarded" — that's a new persistent data structure plus new prompt-injection wiring into every Stage 2-5 generation service. The plan places this in build order right after Phase 3 as if it's an incremental layer, but it's actually the biggest net-new architectural surface in the whole document, and the plan doesn't say where these answers live (a project-level table? attached to specific fields? versioned if contradicted later?).

**Decided (2026-08-02): three-part architecture — a durable facts ledger, a surgical reconciliation pass that edits the actual submitted documents, and a permanent injection point into every future generation.** Grounded in `backend/src/services/contextManager.ts`, which already does a version of the third part for `beatSheet`/`masterScriptSummary` — this extends a proven chokepoint rather than inventing a new one.

### 7.1 Ask Auteur is opt-in, every time, not a mandatory gate

The session only ever offers itself when Phase 2/3 classification actually found something to ask about (a contradiction, a vague trait, ambiguous structure, or a missing-but-needed piece per §4.2) — zero triggers means no prompt to opt into at all. When there *is* something to ask and the user declines, nothing blocks: every trigger that would've been a question instead resolves at the **AI-inferred** tier of the §4.3 authority ranking, automatically. This isn't a separate fallback path to build — it's the same ranking the plan already defines, just landing on its lowest rung instead of its highest. No mandatory-gate logic is needed anywhere in the commit flow.

### 7.2 The facts ledger — `intake_resolutions`

Renamed from the earlier sketch (`project_context_answers`) because a row here doesn't always mean a question was shown to the user — an opted-out or auto-resolved trigger still produces a row, just with a different `answer_source`. One vocabulary covers both cases, consistent with critique item 8's instruction to reuse one provenance pattern rather than parallel ones:

```
intake_resolutions
  id                    UUID PK
  branch_id             UUID FK -> branches.id       -- branch-scoped, matching stage_states (see 7.6)
  question_text         TEXT                          -- populated even when never shown to the user (ai_inferred), for audit
  question_category     TEXT CHECK IN ('contradiction','vague_trait','ambiguous_structure','missing_info','conflict_resolution')
  options                JSONB                         -- multiple-choice options offered, for audit + re-render
  selected_answer        TEXT
  answer_source          TEXT CHECK IN ('option','freetext','ai_inferred')  -- mirrors the §4.3 authority tiers directly
  subject_entity_type    TEXT NULL CHECK IN ('character','location','prop','style','structure','other')
  subject_entity_name    TEXT NULL                     -- e.g. canonical "Marcus" — reuses project_assets.asset_type vocabulary (character/prop/location), not a parallel enum
  conflicting_sources     JSONB NULL                    -- which uploaded files/spans disagreed, for the §4.3 conflict-resolution case
  created_at, created_by
```

`answer_source = 'ai_inferred'` is what a declined session (7.1) or a silently-resolved gap produces. This means the exact same table, the exact same downstream consumers (the reconciliation pass in 7.3, `ContextManager` in 7.5), and the exact same badge/authority logic work identically whether or not the user ever saw a dialog box.

### 7.3 The reconciliation pass — the AI does edit the submitted documents, and the edit scope is *variable*, not binary

This is the piece that needed the most correction from the original "as-is vs. AI-format" framing in plan §3.1. Once Ask Auteur produces an answer, applying it is **not** a single "reformat this file" operation — the blast radius depends entirely on what the answer was about:

- A naming correction ("the antagonist is Marcus, not Marc") is a **word-level patch** — find/replace across every affected document, near-zero cost.
- A vague-trait clarification ("the accent is Irish") might only require **inserting a clause** into one description.
- A structural/plot answer ("that cut-off paragraph is a new scene, not a discard") can require **rewriting or re-splitting a section** of the beat sheet *and* the script, since both describe the same story beat.

So the reconciliation pass is one backend call per Ask Auteur session (not per file) that receives: every submitted document's text, the full Q&A transcript for the session (question + chosen answer, regardless of `answer_source`), and instructions to (a) identify every document that needs a change as a consequence of each answer, (b) classify each needed change's scope, (c) emit the edit itself — either a list of exact find/replace patches for `word_patch`, or full revised text for `paragraph_rewrite`/`structural_cascade` — and (d) emit a one-line diff summary per affected document for the review screen (§2.2).

**This makes "as-is vs. AI-format" (§3.1) and "was this file touched by Ask Auteur" two independent axes, not one.** A file marked "as-is, no formatting cost" can still receive a small surgical patch if an answer touches it — "as-is" now means "no *structural reformatting* pass," not "guaranteed byte-for-byte untouched." The review screen (§2.2) needs a line for this distinct from the existing SKIPPED/AUTO-FILLED/IMPORTED badge set (item 4): something like "3 edits applied from your answers" with the diff summaries visible, so the user never discovers a silent rewrite of text they thought they imported verbatim.

**Audit table for what got edited and why:**

```
intake_resolution_edits
  id                    UUID PK
  resolution_id         UUID FK -> intake_resolutions.id
  target_type           TEXT CHECK IN ('stage','asset')       -- 'asset' covers item 6's standalone note-file → Stage 5 draft case
  target_stage_number    INTEGER NULL                          -- 2, 3, 4, or 5, when target_type = 'stage'
  target_asset_name      TEXT NULL                             -- when target_type = 'asset'
  edit_scope             TEXT CHECK IN ('word_patch','paragraph_rewrite','structural_cascade')
  diff_summary            TEXT                                  -- human-readable, shown on the §2.2 review screen
  created_at
```

`edit_scope` is the direct input to a corrected §2.3 credit estimate: `word_patch` ≈ free, `paragraph_rewrite` ≈ one small LLM call, `structural_cascade` ≈ potentially several calls across multiple documents. **This forces a sequencing fix to §2.3:** the credit estimate shown on the review screen can only be computed *after* the reconciliation pass runs (since that's what determines how much editing work each answer actually costs), not before it — Ask Auteur has to fully resolve before the estimate is meaningful, same ordering conclusion item 6 reached for asset-extraction cost. A `structural_cascade` result is expensive and consequential enough that it's worth its own inline confirmation at resolution time ("this answer affects the plot — applying it will rewrite two scenes in your beat sheet and script — proceed?"), rather than only surfacing as a line-item on the final review screen.

### 7.4 Nothing here needs mid-session persistence — it rides the existing atomic commit

Phase 5.1 (persistent staging area) is explicitly reach/future, which simplifies this: the whole Ask Auteur session — file text, Q&A transcript, reconciled document text, edit summaries — lives in request/response state for the duration of the intake flow, not in the database. Nothing needs to be durable until the user hits "Confirm" on the review screen. At that point, **the same atomic RPC from item 1 §1.6.B** (`POST /:projectId/streamline/commit`, already designed as one stored procedure writing all `stage_states` target-state rows in a single transaction) gets its payload extended to also insert the `intake_resolutions` and `intake_resolution_edits` rows in the same transaction. No second atomicity mechanism, no new endpoint for persistence — one commit writes the reconciled content, the facts ledger, and the edit audit trail together, all-or-nothing.

Two lightweight stateless endpoints carry the session itself before that point: one that runs classification + Ask Auteur question generation over the submitted batch (`POST /:projectId/streamline/analyze`, only fires once full-batch classification is done — see 7.6), and one that takes the accumulated Q&A pairs and returns reconciled document text plus edit summaries (`POST /:projectId/streamline/reconcile`). Neither writes to the database; both just transform text for the frontend to show on the review screen until commit.

### 7.5 Permanent injection into every future generation — the `ContextManager` extension

Layer 1/2 above (the ledger + the reconciliation pass) only guarantees the documents are correct *at commit time*. Plan §4.1's requirement — "feed into every downstream generation, not just used once" — needs the facts to survive a Stage 3 unlock-and-regenerate six weeks later, long after the original submitted documents are gone. This is where `ContextManager` comes in, and it needs almost no new machinery:

- `GlobalContext` (contextManager.ts:31) gains `auteurResolutions?: IntakeResolution[]`.
- `assembleGlobalContext()` (contextManager.ts:93) fetches all `intake_resolutions` rows for the branch, exactly the way it already fetches `beatSheet` (line 471) and `masterScriptSummary` (line 492) — same query shape, same optional-field pattern.
- `formatForInjection()` and the three stage-specific formatters (`formatTreatmentContext`, `formatBeatSheetContext`, `formatScriptContext`, lines 545-589) each get a new block: `"ESTABLISHED FACTS (do not contradict):\n" + resolutions.map(...)`.

Because this re-runs on *every* call to `assembleGlobalContext`, not just the initial commit, a from-scratch Stage 3 regeneration in October still can't drift from an answer given in August — the source of truth is the ledger, re-read every time, not a one-time edit that could go stale.

### 7.6 Re-ask rule for contradictions discovered after the fact

Two distinct timings both need this, and one rule covers both:

- **Same-session race:** with file classification streaming in per plan §4.4, a question could otherwise open before file 5 of 5 finishes, then file 5 contradicts an answer just given. **Decided: gate Ask Auteur's question session behind full-batch classification completing.** §4.4's streaming applies only to the per-file confidence cards, never to opening a question dialog — this removes the race entirely rather than needing a same-session re-ask mechanism.
- **Later timing** (a new upload, or Phase 5.2's mid-production contextual intake, weeks after commit): when Phase 3's extraction finds an entity whose `subject_entity_type` + `subject_entity_name` already has a row in `intake_resolutions`, and the new value disagrees, the system must not silently keep the old answer (ignores new information forever) or silently accept the new one (violates §4.3's ranking, since an explicit answer already outranks any newly-uploaded primary/supporting doc). **It re-surfaces as a new question** — "You previously said the antagonist is Marcus. This new file calls him Marc — keep Marcus?" — a plain entity-name match against the ledger, not a diffing system.

### 7.7 Invariants worth writing down

- Ask Auteur never blocks commit — declining just moves every open trigger to the `ai_inferred` tier; the commit RPC's shape (item 1 §1.6.B) is identical whether the session ran or was skipped.
- A file's as-is/AI-format choice (§3.1) and whether it received an Ask Auteur edit (7.3) are independent — "as-is" no longer implies byte-for-byte untouched.
- `intake_resolutions` rows are never mutated in place after commit; a later contradiction (7.6) creates a *new* row referencing the same `subject_entity_name`, preserving history rather than overwriting it — same append-only spirit as `stage_states` versioning.
- Nothing here needs new DB state before the final commit transaction; everything upstream of that is request/response state (7.4).

---
for 
## 8. Conflict authority ranking (4.3) should reuse the provenance pattern that already exists, not invent a new one

**Where:** Plan §5, Phase 4.3.

**Concern:** The proposed authority ranking (explicit answer > primary doc > supporting doc > AI-inferred) is sound, but the plan doesn't connect it to anything already built. `src/types/asset.ts` already has exactly this kind of provenance tracking: `LocationViewSource = 'user' | 'established' | 'stage7_inferred'` and a general asset `source: 'extracted' | 'manual' | 'cloned'`. This is proof the pattern of "tag every field with where it came from, use that to arbitrate" already works in this codebase.

**Decided: no new enum needed at all — the ranking is a pure resolution-time function over fields item 7 already created, plus one Phase 2.1 field that needs to be named explicitly.** Re-examined the four authority tiers against what's actually being built:

1. **Explicit answer** — `intake_resolutions.answer_source IN ('option', 'freetext')` (item 7 §7.2). Already exists; a conflict resolved by an Ask Auteur question *is* an `intake_resolutions` row with one of these two values.
2. **Primary doc** / 3. **Supporting doc** — Phase 2.1 already specifies "one file can be marked primary; the rest are supporting context" (plan §5, Phase 2.1). This needs to be named as a real field — `StreamlineFile.isPrimary: boolean` — living in the same request/response session state as everything else pre-commit (item 7 §7.4, not persisted to DB until commit). No new table: it's the existing per-file flag, just given a name so the ranking function can read it.
4. **AI-inferred** — `intake_resolutions.answer_source = 'ai_inferred'` (item 7 §7.2 — this is also what a declined Ask Auteur session produces, per §7.1). Same field as tier 1, different value.

So the ranking function (call it `resolveConflict(candidates)`, living wherever the reconciliation pass — item 7 §7.3 — and any silent, below-question-threshold auto-resolution both call it from) needs exactly one new field (`isPrimary` on the in-session file record) and reuses `answer_source` for the other three tiers — it does not touch `LocationViewSource` or `project_assets.source` at all. Those two enums answer a different question ("how did this *asset* originate") from what this ranking answers ("which of several *candidate values* for one field wins") — the critique's original framing conflated the two provenance systems; they're siblings in spirit, not one mechanism to extend. The **correction this forces on 4.3's wording:** "extend the enum" was the right instinct pointed at the wrong enum — the one to reuse is `answer_source` (item 7), not the asset `source` field.

Once resolved, the winning value is written through item 1 §1.2's `content._origin` tag exactly as any other content would be (`'imported'` if it came from a primary/supporting doc, `'ai-generated'` if the AI-inferred tier won) — conflict resolution doesn't need its own provenance marker on the output, only on the *decision process* that produced it, which `intake_resolutions` already audits in full (including `conflicting_sources`, item 7 §7.2, for which files disagreed).

---

## 9. EnhancedUploadModal reuse (3.3) assumes a one-image-at-a-time UX that batch intake will strain

**Where:** Plan §3 and §5, Phase 3.3.

**Concern:** The Enhanced Upload Modal was built for a user uploading one image at a time inside an already-existing project/scene context (Stage 5 or Stage 8). Streamline's batch commit can produce several character/location images at once, potentially before Stage 5 assets even exist yet to reconcile against. The plan says Streamline "hands off into this existing flow" without addressing whether that flow needs a batch/queue mode, or whether it'll run N times in sequence with N separate modals.

**Decided: it can't — confirmed by reading the component, no prototype needed — and the fix is a new batch review screen, not a queued modal.** `EnhancedUploadModalProps` (`EnhancedUploadModal.tsx:36-69`) is singular end-to-end: `assetName: string`, `currentDescription: string`, `initialImageUrl: string`, `onAccept: (finalDescription, finalImageUrl) => void`. There's no array-of-images variant to drive programmatically — firing it N times in sequence is the only way to reuse it as-is, and that's the exact one-at-a-time UX the concern flagged. Two more reasons a queued modal would be the wrong shape even if it existed: the modal also exposes four heavyweight per-image job actions (Edit Image, Apply Visual Style, Remove Background, Regenerate), each an async generation job with its own polling loop — overkill for a first-pass intake reconciliation; and the Stage 5 asset rows the modal reconciles *against* don't exist yet at Streamline intake time (item 6: assets are created by `extractSelectedAssets` only after entity selection).

**New component, real new build, in scope for Phase 3.3: `StreamlineImageReviewGrid`.** One screen (not a modal-per-image) shown during review-before-commit (§2.2), one card per uploaded image:
- Detected entity type + name, pre-filled from image classification and fuzzy-matched against script-extracted entity names from item 6's `aggregatePreview` output where a match exists (e.g. a photo tagged "character" with an accompanying note or filename referencing "Marcus" against a script that already produced a "Marcus" entity).
- Editable type/name override (dropdown + text field) and one editable description field, pre-filled using item 8's ranking function when the image's own extracted description conflicts with a script-derived description for the same entity.
- Accept / Skip-this-image per card. **No** Edit Image / Apply Style / Remove Background / Regenerate here — those four stay exclusively in the unchanged `EnhancedUploadModal`, deferred to after commit.

**Commit-time:** accepted cards feed into the same atomic commit RPC (item 1 §1.6.B, extended by item 7 §7.4) — each becomes a new `project_assets` row with `source: 'streamline_import'`, a new fourth value on the existing `'extracted' | 'manual' | 'cloned'` enum (`src/types/asset.ts:36`) — the actual, correctly-targeted application of item 8's "extend the enum, don't invent a new mechanism" instinct, since this *is* asset-origin provenance, not conflict-candidate ranking.

**Post-commit:** once the asset row exists for real, all further work on that image — editing, style, background removal, regeneration — goes through the unchanged, already-shipped `EnhancedUploadModal`, opened the normal way from Stage 5. Streamline's new build is scoped to the reconciliation screen only; it borrows the *review* half of what the modal does (compare descriptions, pick a final one) without rebuilding the *editing* half.

---

## 10. Script revision reconciliation (5.6) is mis-sized as a "reach feature" alongside dashboard cosmetics

**Where:** Plan §5, Phase 5, item 5.6.

**Concern:** 5.6 sits in the same list, at the same weight, as "Dashboard start from files" (5.3) and "import templates" (5.4) — but diffing a new script draft against scene-level Stage 7-12 work, deciding which scenes changed, and re-opening only those for re-entry is fundamentally a branching/versioning problem. This project already has a real branch system (`active_branch_id`, per project memory) that this feature would almost certainly need to integrate with rather than bypass. Calling it "simpler than true branching" may be true in spirit but doesn't reflect the actual engineering surface — scene-level diffing plus selective stage invalidation across six downstream stages is closer in complexity to the branch system itself than to anything else in Phase 5.

**Decided: pulled out of Phase 5 entirely, relocated to plan §6 ("What's Explicitly Not Part Of This Build") as its own future initiative, explicitly gated on branch-system integration.** It doesn't get a lighter-weight design than the branch system because it structurally *is* branch-system work: `stage_states` rows are already `branch_id`-scoped (item 7 §7.2 notes `intake_resolutions` matches this same scoping), so "push a revised script without losing Stage 7-12 work" is, mechanically, either (a) a new branch forked at the revision point, or (b) an in-place mutation of the active branch's `stage_states` chain guided by a script diff — there is no third option that avoids the branch system, only a choice of which branch-system primitive it rides.

A future design doc for this initiative must resolve, before any build estimate is meaningful:
- **(a) New branch vs. mutate active branch.** Forking preserves the pre-revision state for free (branches already do this) but means the user now has two branches to reconcile visually; mutating in place is a cleaner mental model but requires a real rollback story if the diff/re-entry goes wrong mid-way.
- **(b) What "a scene changed" means.** Raw text diff (fast, noisy — reformatting looks like a change), semantic diff (expensive, needs an LLM pass), or manual per-scene confirm (cheap to build, slow for the user on long scripts). This is the same fork extraction hit in item 3 (client vs. server processing) and item 6 (deterministic vs. LLM cost) — it needs the same explicit call-out here rather than being assumed.
- **(c) How this interacts with the existing forward-only unlock cascade.** Item 1 §1.5 established that the cascade only ever walks forward (N → N+1..5) and deliberately has no reverse edge. A script revision is a different *shape* of trigger entirely — one edit at Stage 4 potentially invalidating a scattered, non-contiguous set of scenes across Stages 7-12 simultaneously, not a single linear "unlock N, cascade forward." The existing cascade logic doesn't generalize to this without real design work of its own.
- **(d) The direct tension with item 5's "no auto re-sync" philosophy.** Item 5 decided backfilled content (Stage 2/3 from Stage 4) *never* re-syncs automatically — drift is an accepted, permanent tradeoff, mitigated only by a static "may drift" badge. 5.6 exists specifically because a user *does* want re-sync after a script revision — that's the opposite default from item 5, operating on adjacent parts of the same pipeline. The design doc has to state explicitly why re-sync is unsafe-to-automate in one direction (item 5: script → treatment/beats) but is the entire point of the feature in the other (item 10: script → downstream production stages) — this isn't a contradiction, but it needs to be argued, not assumed, since a future reader comparing the two decisions side by side will otherwise reasonably ask why the app treats "content might be stale" so differently in two places.

---

## 11. Section 4's "ideal end state" narrative blends core (Phase 1-4) and reach (Phase 5) scenarios without labeling which is which

**Where:** Plan §4.

**Concern:** Of the four narrative examples in §4, only the first two (finished script, messy pile) map to Phase 1-4 (the actual near-term build). The third (mid-production contextual intake) is Phase 5.2 and the fourth (returning series creator / templates) is Phase 5.4 — both explicitly "reach, after the core loop is solid" per §5's own framing. Presented together under one "what using the app feels like after this is done" heading, a reader (or a stakeholder skimming just §4) would reasonably assume all four ship in the same build.

**Decided: add a one-line tag to scenarios 3 and 4 in §4** — so the vision section can't be read as a commitment beyond what §5 actually schedules. When the master plan is reconciled with these decisions, the two scenario headers in plan §4 become:

- `### A user who's already deep in production` → `### A user who's already deep in production *(Phase 5.2 — future, not this build)*`
- `### A returning series creator` → `### A returning series creator *(Phase 5.4 — future, not this build)*`

No other change to either scenario's body text — the narrative stays as aspirational vision, it just can no longer be misread as a Phase 1-4 commitment. The first two scenarios ("A user with a finished script," "A user with a messy pile of material") get no tag, since both map directly to Phase 1-4 as built.

---

## Summary Table

| # | Item | Severity | Action |
|---|------|----------|--------|
| 1 | Skip-state stage machine | High | **Decided** (§1.2-1.6): extend `stage_states.status` with `skipped`, one-line sequential-lock fix, atomic RPC commit, both manual + AI un-skip |
| 2 | Skip before classification exists | Medium | **Decided**: Phase 1 reuses `parseScriptToTiptapJson()` as its detector with locked thresholds (≥3 headings + ≥1 dialogue = high confidence) |
| 3 | PDF/DOC extraction architecture | High | **Decided**: server-side extraction (`pdf-parse` + `mammoth` + RTF parser); legacy `.doc` dropped from supported types |
| 4 | Badge taxonomy vs existing statuses | Medium | **Decided**: precedence table added — `outdated` > `skipped` > origin badge > default; `invalidated` confirmed unused for Phase A |
| 5 | Backfill inverts dependency direction | Medium | **Decided**: no auto-resync; AUTO-FILLED badge carries a static "may drift" timestamp instead |
| 6 | Phase 3.2 asset extraction reuse | Low (scoping only) | **Decided**: reuse `aggregatePreview`/`extractSelectedAssets` (not deprecated `extractAssets`); standalone note-file ingestion scoped as its own line item |
| 7 | Ask Auteur has no data model | High | **Decided** (§7.1-7.7): opt-in, never mandatory; `intake_resolutions` facts ledger + `intake_resolution_edits` audit table, both written atomically inside item 1's commit RPC; surgical reconciliation pass (word patch → paragraph rewrite → structural cascade) edits submitted docs directly; permanent `ContextManager` injection for all future generation; question session gated behind full-batch classification |
| 8 | Conflict ranking needs a mechanism | Low | **Decided**: no new enum — ranking function reuses `intake_resolutions.answer_source` (item 7) for explicit/AI-inferred tiers and a named `isPrimary` flag on Phase 2.1's in-session file record for the doc tiers; asset `source`/`LocationViewSource` enums are untouched (different question) |
| 9 | EnhancedUploadModal batch behavior | Medium | **Decided**: confirmed not reusable as-is (props are all singular, no queue variant) — new `StreamlineImageReviewGrid` component for batch review/reconciliation only; `EnhancedUploadModal` stays unchanged, used post-commit per-asset exactly as today; new assets tagged `source: 'streamline_import'` |
| 10 | 5.6 mis-sized as a reach feature | Medium | **Decided**: moved to plan §6 as its own future initiative — gated on a design doc resolving branch-fork-vs-mutate, diff granularity, how it interacts with the forward-only unlock cascade (item 1 §1.5), and its direct tension with item 5's "no auto re-sync" default |
| 11 | §4 mixes core and reach scenarios | Low | **Decided**: tag scenario 3 header "(Phase 5.2 — future, not this build)" and scenario 4 header "(Phase 5.4 — future, not this build)"; scenarios 1-2 untagged |
