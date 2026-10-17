# Streamline — Technical Specification & Implementation Plan

*August 3, 2026. This document merges the master plan (`streamline-master-plan-8-1.md`) with the code-grounded critique (`streamline-plan-critique-8-1.md`) into one buildable spec. Every architectural decision below is the critique's resolved version, not the plan's original framing — where the two disagree, the critique wins, because it was checked against the actual codebase. Nothing here is aspirational; every file path, function name, and schema field cited was verified against the repository as of this writing.*

---

# Part 1 — Background, Vision & End State

## 1.1 The Problem

Every project today walks the same door: Stage 1 (idea) → Stage 2 (treatment) → Stage 3 (beats) → Stage 4 (script) → Stage 5 (assets), one generation at a time. That's correct for a user starting from nothing. It's wrong for a user who already has a finished screenplay, a script plus character sketches, or a pile of notes and a half-written treatment — today that user still generates everything from scratch, or clicks a "Script Skip" mode that **does nothing**: selecting it still runs the full Stage 1→5 generation sequence. Uploading a script currently saves the user zero work. This is the single most-complained-about gap the plan addresses.

## 1.2 What Streamline Is

Streamline is a new Stage 1 input mode — the fourth, replacing the currently-nonfunctional "Script Skip" button. The other three modes (Expansion, Condensation, Transformation) are untouched. It is a general intake pipeline, not a script-only shortcut: a place to drop whatever material a user already has — documents today, images today, audio eventually — and have the app classify it, ask what's missing, and land the user as far into the 12-stage pipeline as their material earns them, with everything upstream clearly marked **SKIPPED** rather than silently absent.

**It does not replace the pipeline. It feeds it.** This is a near-term placement, not a permanent one — Streamline could become the default Stage 1 experience in a future redesign, but that redesign is explicitly out of scope here; the four-mode selector stays primary.

## 1.3 Foundations It Builds On

Two pieces of infrastructure already exist and are reused, not rebuilt:

- **`EnhancedUploadModal.tsx`** (used in Stage 5 and Stage 8) — the existing single-image reconciliation flow (current description vs. extracted description vs. editable final, plus Edit Image / Apply Visual Style / Remove Background / Regenerate). Streamline does **not** drive this modal directly for batch intake (see §2.6) — but every post-commit per-asset edit still goes through it, unchanged.
- **Stage 5's manual asset creation and image upload** — assets already don't have to come from script extraction; Streamline's asset-producing paths land in the same table these already use.

## 1.4 The Ideal End State

Two of the four original narrative scenarios map to what actually ships in this plan (Phases 1–4). The other two are real product vision but explicitly gated behind Phase 5, itself reach scope — they're tagged below so this section can't be misread as an all-at-once commitment.

### A user with a finished script *(Phase 1–4 — this build)*

They create a project, land on Stage 1, and pick **Streamline** instead of Expansion or Condensation. A drop zone appears. They drag in their screenplay PDF. The app extracts the text server-side, runs it through the existing script parser, recognizes it as a formatted script with high confidence, and shows a one-line summary: *"This looks like a complete screenplay. We'll skip Treatment and Beat Sheet and take you straight to Stage 4 for review."* They confirm. Three clicks, start to finish. They land in Stage 4 with their script already parsed into scenes; Stages 2 and 3 show a **SKIPPED** badge in the pipeline sidebar instead of looking incomplete.

### A user with a messy pile of material *(Phase 1–4 — this build)*

A rough half-script, notes for two of five characters, a treatment that trails off mid-paragraph, three reference images. They drop everything into Streamline at once. Cards appear per file as classification streams in — "94% confident: Character Description," "58% confident: Treatment — is this right?" — each correctable via dropdown. Because the material is incomplete and contradictory, a short **Ask Auteur** session opens: multiple-choice questions with a "type your own answer" option — *"You mentioned two different names for the antagonist — which one is correct?"* They answer four or five questions, then see a review screen: which stages get filled with their material, which get AI-completed, what it will cost in credits, and a short list of surgical edits Ask Auteur made to their own documents ("3 edits applied from your answers"). They confirm and land at the stage their material earns — probably Stage 3, with Stage 2 auto-filled from their treatment fragment.

### A user who's already deep in production *(Phase 5.2 — future, not this build)*

Working in Stage 8 on Scene 6, a collaborator sends three new reference photos for a late-appearing character. Streamline opens from within the scene workflow, recognizes the photos as character references, and offers to route them into Stage 5 and the current scene's Stage 8 assets without derailing production.

### A returning series creator *(Phase 5.4 — future, not this build)*

Finishing Episode 1, starting Episode 2, they apply Episode 1 as a template — assets and style capsule carry over — and only supply what's new: this episode's script.

## 1.5 Full Feature Set — Build Order

| Phase | Delivers | Status |
|---|---|---|
| **1** | Real script skip: Stage 2/3 bypass actually works, backed by a real `skipped` state | This build |
| **2** | Intake foundation: multi-file drop zone, server-side extraction, review-before-commit, credit estimate, partial-success handling | This build |
| **3** | Smart classification: as-is vs. AI-format per file, routing into Stages 2–5, asset extraction reuse, image routing | This build |
| **4** | Ask Auteur: clarification questions, facts ledger, document reconciliation, permanent context injection | This build |
| **5** | Reach: session persistence, contextual intake, dashboard entry, templates, asset-only intake | Future, sequenced after 1–4 prove out |
| *(relocated)* | Script revision reconciliation | Moved out of Phase 5 entirely — see Part 4 |

## 1.6 Explicitly Not Part of This Build

Scoped out entirely, real ideas kept on the roadmap:

- **Audio intake** (voice notes, dialogue override, voice-print cloning, audio-first projects). When it returns, scope is "transcribe and route to context," not the full audio-first mode.
- **Storyboard/sketch frame routing into Stage 10** — a Stage 10 feature that intersects with Streamline, not part of its MVP.
- **CineBlock package import** — CineBlock's JSON/PNG export contract is real and already designed to feed Aiuteur, but this should be a first-class Stage 7/10 integration, not folded into Streamline's general intake.
- **"Just talk to me" conversational intake** — free-form spoken/typed intake for users with no files yet. Distinct from Ask Auteur, which only runs after material is submitted.
- **YOLO / full auto-pipeline mode** — depends on Streamline's core infrastructure being proven first.
- **Personal creative fingerprint / lore library** — a cross-project memory system needing its own design effort.
- **Film reference deconstruction** and **collaborative multi-contributor intake** — both future work.
- **Script revision reconciliation** *(relocated from the plan's Phase 5.6 — see Part 4)* — it structurally is branch-system work, not a lightweight reach feature, and needs its own design doc.

## 1.7 What Doesn't Change

The 12-stage pipeline's structure, the Phase A/Phase B split (Stages 1–5 global truth, 6–12 scene-specific), sequential stage locking, and every existing generation/edit tool inside each stage are untouched. Streamline is additive — a faster way to arrive further into that structure with more work already done, not a redesign of the structure itself.

---

# Part 2 — Architecture Foundations

These are cross-cutting decisions used by multiple phases below. Getting these right first is why Phase 1 is scoped as a state-machine rewrite rather than "add an enum value."

## 2.1 The Current Stage State Machine (as it actually works today)

Two status vocabularies exist and don't map 1:1:

- **Persisted** (`stage_states.status`, DB `CHECK` constraint, `backend/migrations/001_initial_schema.sql:58`): `draft | locked | invalidated | outdated`. `stage_states` is an **append-only version log** — every save/lock/unlock inserts a new row (`version = previous + 1`); nothing updates in place. "Current state" = latest version for a given `branch_id` + `stage_number`.
- **Derived UI** (`StageStatus`, `src/types/project.ts:7`): `locked | active | pending | outdated`. `pending` isn't persisted — it means no `stage_states` row exists yet.

Three places independently enforce sequential-only progression:

1. **Backend `lock` endpoint** (`backend/src/routes/stageStates.ts:337-362`) — before locking stage N, hard-rejects (400) unless stage N-1's latest version is exactly `'locked'`. Server-side gate, independent of frontend state.
2. **Backend `unlock` endpoint** (`stageStates.ts:406-557`, Phase A / stages 1–5 only) — cascades forward only: unlocking N marks every `locked`/`outdated` stage in N+1..5 as `outdated`. No reverse edge exists anywhere.
3. **Frontend hydration** (`ProjectView.tsx:280-339`) — computes `highestLockedStage`/`highestDraftStage`, sets `derivedStage = highestDraftStage || Math.min(highestLockedStage + 1, 5)`. Navigation guard (`ProjectView.tsx:342-365`) blocks entry to any `pending` stage. `handleStageComplete` (`ProjectView.tsx:422-439`) locks stage N and hardcodes next-active as `stageNumber + 1`. `PhaseTimeline.tsx` renders exactly four statuses and its click guard only understands `pending`.

None of these five surfaces has a concept of "this stage was intentionally passed over, not left incomplete." All five need to change.

## 2.2 Target Data Model

**Migration:** extend `stage_states.status` CHECK constraint to `draft | locked | invalidated | outdated | skipped`.

**Skip = a normal `stage_states` row**, `status: 'skipped'`, `content: {}`. This is a strict narrowing of the existing version-chained pattern — "latest version per stage," the audit trail, and version-increment logic all keep working with zero new code paths. (Rejected alternative: tracking skipped stages outside `stage_states` — forks every sequential-lock/unlock-cascade query into two code paths. Not worth it for what it avoids.)

**New endpoint:** `POST /:projectId/stages/:stageNumber/skip`
- Validates `stageNumber` ∈ {2, 3, 4} — Stage 1 can never be skipped (it configures the project itself: mode, rating, genre, target length); Stage 5/Assets is never skipped.
- Validates stage `stageNumber - 1`'s latest version status is `'locked'` **or** `'skipped'` — generalizes the sequential check to treat "passed over" the same as "completed."
- Validates no `'locked'` version already exists for this stage — skipping over real content is rejected; the user must explicitly unlock first.
- On success: inserts a new version, `status: 'skipped'`, `content: {}`.

**One-line fix that makes skip load-bearing:** the existing lock endpoint's sequential check (`stageStates.ts:352`) becomes:
```
previousStageState.status !== 'locked' && previousStageState.status !== 'skipped' → reject
```
Everything else is bookkeeping around this single condition.

**Provenance tag, not a second status enum:** `content._origin: 'skipped' | 'imported' | 'ai-generated' | 'authored'`. Same pattern already proven by `LocationViewSource` in `src/types/asset.ts`. This is how backfill (§2.4) and the badge system (§2.5) both work without inventing new states.

## 2.3 Frontend Derivation Rewrite (`ProjectView.tsx`)

- `isPassed(status) = status === 'locked' || status === 'skipped'`.
- `derivedStage` = first stage in 1..5 that is not passed; if all five are passed, derived stage is 6 (Script Hub) — direct generalization of the existing `min(highestLockedStage + 1, 5)` cap.
- Navigation guard still blocks `pending`. A `skipped` stage becomes enterable but renders a **third mode**: a read-only placeholder ("This stage was skipped — [Generate this now] / [Write this myself]"), distinct from both the active editor and the locked read-only view.
- `handleStageComplete`'s hardcoded `stageNumber + 1` advance stays untouched for the normal single-stage-completion path. Streamline's commit flow bypasses it entirely (see §2.6) — it isn't "completing stages one at a time."
- `PhaseTimeline.tsx` needs a fifth render branch (icon + color) for `skipped`, and its click guard needs to allow entry into `skipped` (not just block `pending`).

**Un-skip path — both manual and AI, decided:**
- **"Write this myself"**: `skipped → draft`, empty content, normal editor, no credits. Exactly what unlock already produces — no new transition.
- **"Generate from script"**: AI backfill, `skipped → locked` directly, spends credits, `content._origin: 'ai-generated'`.

## 2.4 Backfill Semantics

Backfill (plan's 1.2) is **not a new state** — it's a content-write on an already-skipped stage: generate content, then run it through the existing lock-with-content path (`PUT .../stages/:n` with `status: 'locked'`), tagged `content._origin: 'ai-generated'`.

**No auto re-sync, ever.** If Stage 4's script is edited again after Stage 2/3 were backfilled from it, Stage 2/3 do **not** automatically become `outdated`. The unlock-cascade only walks forward (N → N+1..5); this deliberately isn't extended backward. Drift is an accepted, permanent limitation — the entire mitigation is a static string on the AUTO-FILLED badge: *"Generated from script on [date] — won't update automatically if the script changes later."* One string, not a reverse-cascade system.

## 2.5 Badge Taxonomy — Precedence Table

A stage's badge is a pure function of `(persisted status, content._origin)`:

| Persisted status | `content._origin` | Badge | Enterable |
|---|---|---|---|
| `skipped` | — (always `{}`) | **SKIPPED** | Yes — placeholder + backfill/manual CTA, never the full editor |
| `locked` | `'imported'` | **IMPORTED** | Yes — normal locked read-only view |
| `locked` | `'ai-generated'` | **AUTO-FILLED** | Yes — normal locked read-only view |
| `locked` | `'authored'` / absent | *(existing checkmark, no special badge)* | Yes |
| `draft` | any | *(existing "active")* | Yes — editable |
| `outdated` | any | **existing outdated warning wins**; origin shown as secondary subtext ("Outdated · Imported") | Yes — existing unlock/regenerate flow |
| `invalidated` | — | Confirmed unused for Phase A `stage_states` today (grepped every call site — used only for `frames`/`videos` rows and scene-level invalidation). Reserved, no handling built. | n/a |
| `pending` | — (no row) | *(existing greyed "pending")* | No |

**Precedence rule:** `outdated` (staleness warning) always outranks an origin badge (informational) — safety beats provenance. `skipped` outranks everything trivially since nothing else co-occurs on that row.

## 2.6 Atomic Commit — The Single Source of Truth for "Confirm"

Streamline's review-then-commit step can, in one click, need to lock Stage 1, skip Stage 2, skip Stage 3, and lock Stage 4 with parsed content — up to four state transitions. Firing these as sequential REST calls risks a half-applied project if call three fails, and the sequential-lock invariant would then reject whatever the user tries next with no clean way back.

**One endpoint:** `POST /:projectId/streamline/commit`, backed by a **Postgres stored procedure / RPC** (not sequential REST calls), taking the full target state:
```json
{ "1": "locked", "2": "skip", "3": "skip", "4": { "status": "locked", "content": {...} } }
```
All transitions apply inside one transaction — all-or-nothing, no app-level rollback logic. This is distinct from Phase 2.4's partial-success handling, which is about individual *files* in a batch being independently recoverable (fine, expected) — a half-applied stage-skip is not recoverable the same way.

By Phase 4, this same RPC's payload is extended (not replaced) to also insert `intake_resolutions` and `intake_resolution_edits` rows in the same transaction (§2.9) and, by Phase 3.4, new `project_assets` rows from accepted image cards. One commit, one transaction, growing payload across phases — never a second atomicity mechanism.

## 2.7 File Extraction Architecture

**Decision: server-side extraction**, not a bundled frontend PDF/DOCX parser. Keeps the client lean, matches the app's existing backend-heavy processing direction (image/job pipelines), avoids browser-side quality failure modes on scanned PDFs and complex DOCX styling.

Today, `FileStagingArea.tsx` handles `application/pdf` by `resolve('')` — it never reads the file. DOC/DOCX/RTF aren't handled at all (only `readAsText` for plain text). This is greenfield, not a bug fix.

**New endpoint:** `POST /api/projects/:projectId/streamline/extract-file` — multipart, **one file per call**, so partial-success handling (§3.5) can retry/drop individual files independently.

| MIME type | Library | Notes |
|---|---|---|
| PDF | `pdf-parse` (pure JS, no system binary) | New dependency — not in `backend/package.json` today |
| DOCX | `mammoth` (pure JS) | New dependency |
| RTF | `@iarna/rtf-to-text` or equivalent pure-JS parser | RTF is simple enough for reliable pure-JS parsing |
| Legacy `.doc` (binary Word 97-2003) | **Dropped from supported types** | Reliable parsing needs a system-level tool (`antiword`, `textract`, headless LibreOffice) — materially heavier infra than the other three. Upload UI rejects `.doc` outright: "please save as .docx or .pdf." |

Extraction and classification (§2.8, Phase 3) both run server-side in the same request path — text never round-trips to the browser and back.

## 2.8 Script Detection — Reusing the Existing Parser

`src/lib/utils/screenplay-converter.ts:66` — `parseScriptToTiptapJson(plainText)` — already classifies every line into `sceneHeading | transition | dialogueLine | action` nodes. This is exactly Phase 1's detection signal, and it's also the function that must run regardless to turn an uploaded script into Stage 4's TipTap content — Phase 1 and Phase 3's classifier share one parse, not two.

**Confidence thresholds (tunable config, not inline constants):**
- **High confidence** (`sceneHeadingCount >= 3` and `dialogueCount >= 1`) → offer skip-to-Stage-4 directly.
- **Ambiguous** (1–2 headings, or headings with zero dialogue) → don't auto-skip; surface the same "58% confident — is this right?" prompt Phase 3 generalizes to every file type.
- **Low / not a script** (`sceneHeadingCount === 0`) → treat as prose (treatment/notes); don't offer skip.

## 2.9 Ask Auteur Data Model

Three parts: a durable facts ledger, a surgical reconciliation pass that edits submitted documents directly, and a permanent injection point into every future generation. Grounded in `backend/src/services/contextManager.ts`, which already does a version of the third part for `beatSheet`/`masterScriptSummary` — this extends a proven chokepoint, not a new one.

### 2.9.1 `intake_resolutions` — the facts ledger

```sql
intake_resolutions
  id                    UUID PK
  branch_id             UUID FK -> branches.id       -- branch-scoped, matching stage_states
  question_text         TEXT                          -- populated even when never shown (ai_inferred), for audit
  question_category     TEXT CHECK IN ('contradiction','vague_trait','ambiguous_structure','missing_info','conflict_resolution')
  options                JSONB                         -- multiple-choice options offered, for audit + re-render
  selected_answer        TEXT
  answer_source          TEXT CHECK IN ('option','freetext','ai_inferred')  -- mirrors the §4.3 authority tiers directly
  subject_entity_type    TEXT NULL CHECK IN ('character','location','prop','style','structure','other')
  subject_entity_name    TEXT NULL                     -- e.g. canonical "Marcus"
  conflicting_sources     JSONB NULL                    -- which uploaded files/spans disagreed
  created_at, created_by
```

A row here doesn't always mean a question was *shown* — a declined/auto-resolved trigger still produces a row with `answer_source: 'ai_inferred'`. One vocabulary covers both cases; every downstream consumer (reconciliation, `ContextManager`) works identically whether a dialog ever appeared.

### 2.9.2 `intake_resolution_edits` — the reconciliation audit trail

```sql
intake_resolution_edits
  id                    UUID PK
  resolution_id         UUID FK -> intake_resolutions.id
  target_type           TEXT CHECK IN ('stage','asset')       -- 'asset' covers standalone note-file → Stage 5 draft
  target_stage_number    INTEGER NULL                          -- 2, 3, 4, or 5, when target_type = 'stage'
  target_asset_name      TEXT NULL                             -- when target_type = 'asset'
  edit_scope             TEXT CHECK IN ('word_patch','paragraph_rewrite','structural_cascade')
  diff_summary            TEXT                                  -- human-readable, shown on the review screen
  created_at
```

`edit_scope` drives the credit estimate: `word_patch` ≈ free, `paragraph_rewrite` ≈ one small LLM call, `structural_cascade` ≈ potentially several calls across documents.

### 2.9.3 Reconciliation is variable-scope, not binary

The blast radius of applying an answer depends on what the answer was about:
- **Word-level patch** — a naming correction ("the antagonist is Marcus, not Marc") → find/replace across affected documents, near-zero cost.
- **Paragraph rewrite** — a vague-trait clarification ("the accent is Irish") → insert a clause into one description.
- **Structural cascade** — a plot answer ("that cut-off paragraph is a new scene") → rewrite/re-split a section of the beat sheet *and* the script, since both describe the same beat.

One backend call per Ask Auteur **session** (not per file), receiving every submitted document's text plus the full Q&A transcript, that (a) identifies every document needing a change, (b) classifies each change's scope, (c) emits the edit (find/replace list for `word_patch`; full revised text for the other two scopes), (d) emits a one-line diff summary per affected document.

**"As-is" and "touched by Ask Auteur" are independent axes.** A file marked "as-is, no formatting cost" can still receive a surgical patch from an answer — "as-is" means "no structural reformatting pass," not "guaranteed byte-for-byte untouched." The review screen needs its own line for this, distinct from the SKIPPED/AUTO-FILLED/IMPORTED badges: *"3 edits applied from your answers"* with diff summaries visible.

A `structural_cascade` result gets its own inline confirmation at resolution time ("this answer affects the plot — applying it will rewrite two scenes — proceed?"), not just a line-item on the final review screen.

### 2.9.4 Session lifecycle — no mid-session persistence needed

The whole session (file text, Q&A transcript, reconciled text, edit summaries) lives in request/response state until "Confirm." Two stateless endpoints carry it:
- `POST /:projectId/streamline/analyze` — classification + question generation over the submitted batch. Fires **only once full-batch classification is done** (see §2.9.6 — removes a same-session race entirely).
- `POST /:projectId/streamline/reconcile` — takes accumulated Q&A pairs, returns reconciled document text + edit summaries.

Neither writes to the database. At "Confirm," the atomic commit RPC (§2.6) is extended to also insert `intake_resolutions` and `intake_resolution_edits` rows in the same transaction.

### 2.9.5 Permanent injection — `ContextManager` extension

- `GlobalContext` (`contextManager.ts:31`) gains `auteurResolutions?: IntakeResolution[]`.
- `assembleGlobalContext()` (`contextManager.ts:93`) fetches all `intake_resolutions` rows for the branch — same query shape as the existing `beatSheet` (line 471) / `masterScriptSummary` (line 492) fetches.
- `formatForInjection()` and the three stage formatters (`formatTreatmentContext`, `formatBeatSheetContext`, `formatScriptContext`, lines 545–589) each get a new block: `"ESTABLISHED FACTS (do not contradict):\n" + resolutions.map(...)`.

Because this re-runs on every `assembleGlobalContext()` call, a from-scratch regeneration months later still can't drift from an August answer — the ledger is the source of truth, re-read every time.

### 2.9.6 Re-ask rule (covers both timing cases with one rule)

- **Same-session race** — streaming classification could open a question before file 5/5 finishes, then file 5 contradicts an already-given answer. **Fixed by gating the question session behind full-batch classification completing** (§2.9.4) — streaming applies only to per-file confidence cards, never to opening a question dialog.
- **Later timing** (new upload, or Phase 5.2's contextual intake, weeks later) — when new extraction finds an entity whose `subject_entity_type` + `subject_entity_name` already has a ledger row, and the new value disagrees, the system **re-surfaces as a new question** ("You previously said the antagonist is Marcus. This new file calls him Marc — keep Marcus?"). A plain entity-name match, not a diffing system. `intake_resolutions` rows are never mutated in place — a later contradiction creates a *new* row referencing the same `subject_entity_name`, same append-only spirit as `stage_states` versioning.

### 2.9.7 Invariants

- Ask Auteur never blocks commit — declining moves every open trigger to `ai_inferred`; the commit RPC's shape is identical whether the session ran or was skipped.
- A file's as-is/AI-format choice and whether it received an Ask Auteur edit are independent.
- No new DB state exists before the final commit transaction; everything upstream is request/response state.

## 2.10 Conflict Authority Ranking — No New Enum

Four tiers, resolved entirely from fields already introduced above — no new enum invented:

1. **Explicit answer** — `intake_resolutions.answer_source IN ('option', 'freetext')`.
2. **Primary doc** — a new named field, `StreamlineFile.isPrimary: boolean`, living in the same in-session request/response state as everything else pre-commit (Phase 2.1 already specifies "one file marked primary"; this just names the field).
3. **Supporting doc** — `StreamlineFile.isPrimary === false`.
4. **AI-inferred** — `intake_resolutions.answer_source = 'ai_inferred'` (same field as tier 1, different value; also what a declined session produces).

`resolveConflict(candidates)` — the function both the reconciliation pass and any silent below-threshold auto-resolution call — needs exactly one new field (`isPrimary`) and reuses `answer_source` for the rest. It does **not** touch `LocationViewSource` or `project_assets.source` — those answer "how did this asset originate," a different question from "which candidate value for one field wins." The winning value is written through `content._origin` (§2.2) exactly like any other content (`'imported'` if a doc tier won, `'ai-generated'` if the AI-inferred tier won).

## 2.11 Asset Extraction — Reusing the Live Call Chain

`backend/src/services/assetExtractionService.ts`'s `extractAssets(masterScript, branchId, visualStyleId)` is `@deprecated`. The live path:

1. Uploaded script text → `parseScriptToTiptapJson()` (§2.8's same parse, reused) → saved as Stage 4's `content`.
2. Scene splitting + dependency extraction → existing deterministic path at `backend/src/routes/projects.ts:1301-1336`: `extractManifest(tiptapDoc)` (`scriptManifest.ts`) produces per-scene characters/locations/props with **zero LLM calls**. Runs today on every normal Stage 4 lock — Streamline triggers the same code after its skip-commit writes Stage 4 content; it does not rebuild this step.
3. Stage 5 asset list → `aggregatePreview(branchId)` (free, structural) → user selects entities → `extractSelectedAssets(branchId, selectedEntities, ...)` (the only LLM call, only for selections).

**Credit estimate correction this forces:** the review screen should read "N assets × visual-distillation cost" (step 3 only) — steps 1–2 are deterministic and free, exactly as for a normal script upload. A flat per-file/per-script charge overstates cost.

**Standalone asset files are a second mechanism, not a variant of the above.** A standalone character-notes file has no scene to attach dependencies to — it can't go through `aggregatePreview`, which requires real scene rows first. It needs its own lighter path: one small LLM call per file that reads the note and pre-fills a single Stage 5 asset draft (name, type, description), tagged `source: 'extracted'` for user confirmation. This is its own Phase 3 line item, costed separately — not free by association with step 1–2 above.

## 2.12 Batch Image Review — New Component, Not a Reused Modal

`EnhancedUploadModalProps` (`EnhancedUploadModal.tsx:36-69`) is singular end-to-end (`assetName: string`, `currentDescription: string`, `initialImageUrl: string`, `onAccept: (finalDescription, finalImageUrl) => void`) — no array-of-images variant exists. Firing it N times in sequence is the only way to reuse it as-is, which is exactly the one-at-a-time UX that doesn't scale to batch intake. It also exposes four heavyweight async job actions (Edit Image, Apply Visual Style, Remove Background, Regenerate) — overkill for first-pass reconciliation — and reconciles against Stage 5 asset rows that don't exist yet at intake time (assets are created by `extractSelectedAssets` only after entity selection).

**New component: `StreamlineImageReviewGrid`.** One screen (not modal-per-image), shown during review-before-commit, one card per uploaded image:
- Detected entity type + name, pre-filled from image classification and fuzzy-matched against script-extracted entity names from `aggregatePreview` output.
- Editable type/name override (dropdown + text) and one editable description field, pre-filled using the §2.10 ranking function when the image's own extracted description conflicts with a script-derived one.
- Accept / Skip-this-image per card. **No** Edit Image / Apply Style / Remove Background / Regenerate — those stay exclusively in the unchanged `EnhancedUploadModal`, deferred to after commit.

**Commit-time:** accepted cards feed into the atomic commit RPC — each becomes a new `project_assets` row with `source: 'streamline_import'`, a **new fourth value** on the existing `'extracted' | 'manual' | 'cloned'` enum (`src/types/asset.ts:36`).

**Post-commit:** once the asset row is real, all further work on that image (editing, style, background removal, regeneration) goes through the unchanged `EnhancedUploadModal`, opened normally from Stage 5.

---

# Part 3 — Phase-by-Phase Implementation Plan

## Phase 1 — Fix the Thing That's Already Broken

**Goal:** uploading a formatted screenplay through Streamline actually bypasses Stages 2 and 3, backed by a real state-machine change, not a UI-only illusion. This is the riskiest phase — treat it as a state-machine rewrite, not an enum addition.

### Task 1.1 — Database migration
- Alter `stage_states.status` CHECK constraint: add `'skipped'` to `draft | locked | invalidated | outdated`.
- File: new migration in `backend/migrations/` (next sequential number after the latest).
- Add the Postgres stored procedure backing `POST /:projectId/streamline/commit` (§2.6) in the same migration — even though Phase 1 only needs a subset of its eventual payload shape (lock/skip transitions; content-bearing lock for Stage 4), build the procedure to accept the general `{stageNumber: 'skip' | 'locked' | {status, content}}` shape now so Phase 4 extends it rather than replacing it.

### Task 1.2 — Backend skip endpoint
- New route: `POST /:projectId/stages/:stageNumber/skip` in `backend/src/routes/stageStates.ts`.
- Validation per §2.2: `stageNumber` ∈ {2,3,4}; previous stage `locked` or `skipped`; no existing `locked` version for this stage.
- On success: insert new `stage_states` row, `status: 'skipped'`, `content: {}`, `content._origin: 'skipped'`.

### Task 1.3 — One-line fix to the existing lock endpoint
- `backend/src/routes/stageStates.ts:352` — sequential check becomes `previousStageState.status !== 'locked' && previousStageState.status !== 'skipped'` → reject.

### Task 1.4 — Un-skip transitions
- "Write this myself": reuse the existing unlock transition (`skipped → draft`, empty content, no credits) — no new backend code, just a new frontend entry point.
- "Generate from script": new backfill flow — generate content via existing stage-appropriate generation service, then call the existing lock-with-content path (`PUT .../stages/:n`, `status: 'locked'`, `content._origin: 'ai-generated'`).

### Task 1.5 — Frontend derivation rewrite
- `src/pages/ProjectView.tsx:280-339` — replace `highestLockedStage`/`highestDraftStage` arithmetic with `isPassed()` walk (§2.3).
- `ProjectView.tsx:342-365` — navigation guard: allow entry to `skipped` stages (new placeholder render mode), still block `pending`.
- `ProjectView.tsx:422-439` — `handleStageComplete` unchanged for single-stage completion; Streamline's commit flow (Task 1.7) bypasses it.

### Task 1.6 — `PhaseTimeline.tsx` updates
- Add a fifth icon/color branch for `skipped`.
- Update click guard to permit entry into `skipped` stages.

### Task 1.7 — Skipped-stage placeholder component
- New render mode (not a variant of active editor or locked view): "This stage was skipped — [Generate this now] [Write this myself]" — wires to Task 1.4's two transitions.

### Task 1.8 — Badge rendering
- Implement the precedence table (§2.5) as a pure function `getStageBadge(status, origin)` consumed by `PhaseTimeline.tsx` and any other stage-status display surface (dashboard cards, Script Hub).
- AUTO-FILLED badge includes the static "won't update automatically" tooltip string (§2.4) at render time — no backend change needed beyond the timestamp already on the row.

### Task 1.9 — Script detector as Phase 1's classifier
- Reuse `parseScriptToTiptapJson()` (`src/lib/utils/screenplay-converter.ts:66`) with the confidence thresholds in §2.8, exposed as tunable config (not inline constants) — e.g. a small `streamlineConfig.ts` with `MIN_SCENE_HEADINGS = 3`, `MIN_DIALOGUE_LINES = 1`.

### Task 1.10 — Minimal Streamline entry UI for Phase 1
- A stripped-down version of the eventual Streamline drop zone: single-file script upload, runs Task 1.9's detector, shows the one-line confidence summary from the plan's first narrative scenario, calls the commit RPC (Task 1.1) with `{1: 'locked', 2: 'skip', 3: 'skip', 4: {status: 'locked', content: parsedScript}}` on confirm.
- This is deliberately throwaway-adjacent to the eventual full Streamline UI (Phase 2) but must not duplicate the commit RPC or the parser — both are shared, permanent pieces.

### Task 1.11 — Testing
- Backend (Jest): skip endpoint validation (rejects Stage 1/5, rejects out-of-order skip, rejects skip-over-locked); lock endpoint's updated sequential check; commit RPC atomicity (simulate a failing transition, assert no partial writes).
- Frontend (Vitest/RTL): `isPassed`/derivation logic unit tests; navigation guard allows `skipped` entry; placeholder component renders both CTAs and wires correct transitions.

---

## Phase 2 — The Intake Foundation

**Goal:** a real multi-file intake surface with working extraction for all supported formats, a review-before-commit gate, and no batch failure taking down the whole submission.

### Task 2.1 — Structured upload panel
- New/generalized component extending `FileStagingArea.tsx`'s existing staging pattern: multi-file drop zone + paste-text option.
- Supported types: TXT, MD, PDF, DOC(X — `.doc` rejected outright per §2.7), RTF.
- Per-file: automatic type detection (script/treatment/beat sheet/character notes/unclassified — full classifier lands in Phase 3; Phase 2 can stub this as "unclassified" pending Phase 3's wiring, or land Phase 2 and 3 together if sequencing allows) with manual override dropdown.
- One file markable primary (`StreamlineFile.isPrimary: boolean`, §2.10) — rest are supporting context.

### Task 2.2 — Server-side extraction endpoint
- New route: `POST /api/projects/:projectId/streamline/extract-file` (multipart, one file per call).
- New backend dependencies: `pdf-parse`, `mammoth`, RTF parser (§2.7 table).
- Returns extracted plain text (and/or structured HTML for DOCX where useful) for the frontend to display in the review step.

### Task 2.3 — Review-before-commit screen
- Shows, before anything writes to the pipeline: detected file types, which stages will be filled / skipped / AI-generated, per the plan's hard requirement (nothing commits until explicit approval).
- This screen's final shape is extended incrementally by Phase 3 (as-is/AI-format toggle, confidence labels) and Phase 4 (Ask Auteur edit summaries, structural_cascade warnings) — build it now as a container that later phases add sections to, not a one-shot component.

### Task 2.4 — Credit estimate
- Displayed on the review screen per the existing Stage 8/11 cost-confirmation pattern.
- **Sequencing note carried from §2.9.3 and §2.11:** the estimate can only be fully accurate once (a) asset-extraction cost is known (Phase 3, step-3-only per §2.11) and (b) Ask Auteur's reconciliation pass has run (Phase 4, since `edit_scope` determines cost). Phase 2's version of this task should ship a partial estimate (extraction + classification, both free/deterministic) and be revisited as Phase 3/4 land — don't treat Phase 2's number as final.

### Task 2.5 — Partial success handling
- If N files are submitted and some fail to parse (Task 2.2's endpoint returns an error for that file), the user isn't blocked from proceeding with the rest.
- Per-file retry / reclassify / drop, scoped to the one-file-per-call extraction endpoint design (§2.7) specifically so this is possible without re-touching the whole batch.

### Task 2.6 — Testing
- Backend: extraction endpoint per MIME type (valid file, corrupted file, oversized file, `.doc` rejection message).
- Frontend: drop zone accepts/rejects correct types; partial-failure UI leaves successful files intact; primary-file selection persists into session state.

---

## Phase 3 — Making the System Smart About What It Was Given

**Goal:** per-file classification with visible confidence, routing of text content into Stages 2–5, and image routing into a batch-appropriate review surface.

### Task 3.1 — Per-file classification + as-is/AI-format choice
- Extends Task 1.9's script detector into a general file-type classifier (script/treatment/beat sheet/character notes) — same confidence-prompt component pattern, generalized across types, not rebuilt.
- Confidence always shown ("95% confident: Screenplay" / "62% confident: Treatment or Outline — what is this?").
- Default per-file choice (as-is vs. AI-format) driven by confidence; user can override any file individually — never a single global toggle.

### Task 3.2 — Streaming classification feedback
- Classification results appear file-by-file as they resolve (backend streams per-file results as extraction/classification completes), not behind a single batch spinner.
- **Constraint from §2.9.6:** this streaming applies only to per-file confidence cards — the Ask Auteur question session (Phase 4) is explicitly gated behind full-batch completion, so this task should expose a "batch complete" signal the Phase 4 UI can wait on.

### Task 3.3 — Routing text content into Stages 2–5
- Treatment → Stage 2 content (as-is or AI-formatted per Task 3.1's choice); if only notes exist, Stage 2 generates normally.
- Beat sheet → parsed into Stage 3's structured beat format; if only a treatment exists, Stage 3 generates normally.
- Script → parsed into Stage 4's scene structure via `parseScriptToTiptapJson()` (shared with Phase 1) — this is where Phase 1's skip logic and general intake routing meet in the commit RPC payload.
- Character/location/prop descriptions (own files or script-extracted) feed Task 3.4/3.5's asset pipeline.

### Task 3.4 — Asset extraction wiring (script-derived)
- Wire Streamline's commit flow into the existing chain (§2.11): `parseScriptToTiptapJson()` → `extractManifest(tiptapDoc)` (`scriptManifest.ts`, zero LLM cost, runs at Stage 4 commit) → `aggregatePreview(branchId)` (free) → user entity selection → `extractSelectedAssets(...)` (the only LLM-cost step).
- Do **not** call the deprecated `extractAssets()`.
- Credit estimate (Task 2.4) updated to reflect "N assets × visual-distillation cost" only.

### Task 3.5 — Standalone asset-file ingestion (separate line item)
- New, lighter path for standalone character/location/prop note files that have no scene to attach to: one small LLM call per file → pre-fills a single Stage 5 asset draft (name, type, description), `source: 'extracted'`, user-confirmed.
- Costed and estimated separately from Task 3.4 — not assumed free.

### Task 3.6 — Image routing — `StreamlineImageReviewGrid`
- New component per §2.12: one card per uploaded image, entity type/name detection, fuzzy-match against script-extracted entities, editable override, Accept/Skip only (no job actions).
- Wires into the atomic commit RPC: accepted cards → new `project_assets` rows, `source: 'streamline_import'` (new value added to the existing enum in `src/types/asset.ts:36`).

### Task 3.7 — Testing
- Backend: `extractManifest` / `aggregatePreview` / `extractSelectedAssets` integration through the Streamline entry point (not just the existing Stage 4 entry point) — confirm no divergence in behavior.
- Frontend: classification confidence labels render correctly across the threshold boundaries from §2.8/3.1; `StreamlineImageReviewGrid` fuzzy-match logic against a mocked `aggregatePreview` response; override dropdowns persist into session state correctly.

---

## Phase 4 — Ask Auteur Questions

**Goal:** the clarification layer — the single largest net-new architectural surface in the plan. Full data model and flow specified in Part 2 §2.9–2.10; this section is the build breakdown.

### Task 4.1 — Database migrations
- `intake_resolutions` table (§2.9.1).
- `intake_resolution_edits` table (§2.9.2).
- Extend the Phase 1 commit stored procedure to accept and insert both tables' rows in the same transaction as the `stage_states` writes.

### Task 4.2 — Question generation endpoint
- `POST /:projectId/streamline/analyze` — runs once full-batch classification (Task 3.2) completes. Detects the four trigger categories from the plan (§4.2): contradictions between documents, vague/underspecified traits, ambiguous structure, missing-but-needed information (e.g., no visual style anywhere).
- Zero triggers → no session offered at all (§2.9's "opt-in every time, not a mandatory gate").

### Task 4.3 — Question UI component
- New component, no existing precedent in the codebase — modeled on the plan's explicit reference point (Claude Code's `AskUserQuestion` pattern): multiple-choice with a "type your own answer" option, never an open text box as the primary interface. Targeted, few questions per session, not a long form.
- Each answer writes an `intake_resolutions` row (in-session state until commit, per §2.9.4) with `answer_source: 'option'` or `'freetext'`.
- Session decline path: every open trigger auto-resolves to `answer_source: 'ai_inferred'` — no separate fallback code path, same table, same shape.

### Task 4.4 — Reconciliation endpoint
- `POST /:projectId/streamline/reconcile` — takes the accumulated Q&A transcript, returns reconciled document text + per-document diff summaries + `edit_scope` classification (`word_patch`/`paragraph_rewrite`/`structural_cascade`) per §2.9.3.
- `structural_cascade` results trigger an inline confirmation dialog before being folded into the review screen.

### Task 4.5 — Review screen extension
- Add the "N edits applied from your answers" section with diff summaries, distinct from the SKIPPED/AUTO-FILLED/IMPORTED badge row (§2.9.3).
- Finalize the credit estimate (Task 2.4) now that `edit_scope` costs are known — this is the point at which the estimate becomes authoritative, not before.

### Task 4.6 — `ContextManager` extension
- `GlobalContext` (`contextManager.ts:31`) gains `auteurResolutions?: IntakeResolution[]`.
- `assembleGlobalContext()` (`contextManager.ts:93`) fetches `intake_resolutions` for the branch, same pattern as existing `beatSheet`/`masterScriptSummary` fetches.
- `formatForInjection()` + the three stage formatters (`formatTreatmentContext`, `formatBeatSheetContext`, `formatScriptContext`, lines 545–589) each gain an "ESTABLISHED FACTS (do not contradict)" block.

### Task 4.7 — Conflict resolution function
- `resolveConflict(candidates)` implementing the four-tier ranking (§2.10), called from both the reconciliation pass (Task 4.4) and any silent below-question-threshold auto-resolution.
- Reads `StreamlineFile.isPrimary` (new named field, Task 2.1) and `intake_resolutions.answer_source` — no new enum.

### Task 4.8 — Re-ask rule implementation
- Gate question-session opening behind full-batch classification completion (already required by Task 4.2's trigger; confirm no code path opens it earlier).
- New-upload / later-timing path: entity-name match against existing `intake_resolutions` rows when new extraction disagrees with a prior answer → re-surface as a new question, insert a new row (never mutate the old one).

### Task 4.9 — Testing
- Backend: `resolveConflict` unit tests across all four tiers and tie-breaks; reconciliation endpoint's `edit_scope` classification on representative inputs (a naming fix, a trait clarification, a plot-affecting answer); `ContextManager` injection producing the expected formatted block; commit RPC now inserting all three row types atomically (simulate a mid-transaction failure, assert full rollback).
- Frontend: question UI renders multiple-choice + freetext correctly; decline path produces no visible error and silently resolves; structural_cascade confirmation dialog blocks until acknowledged; review screen's edit-summary section matches backend diff output.

---

## Phase 5 — Reach Features

**Sequenced after Phases 1–4 are solid and validated in production use.** Each item below is independently schedulable; none blocks another.

### Task 5.1 — Intake session persistence
- Persist the in-session Streamline state (submitted files, classification results, Q&A transcript, reconciled text) so a user can close the tab and resume — currently this all lives in request/response state per §2.9.4, which is sufficient for Phases 1–4 but not for a resumable session. Needs its own storage design (likely a `streamline_sessions` table or similar) — not specified in the source docs beyond "should exist."

### Task 5.2 — Contextual intake from within production
- Open Streamline from inside Stage 8 (or other in-production stages) without leaving the current scene. System recognizes current location and offers scoped routing ("these look like character references — add them to Scene 6?").
- Explicitly out of scope for the Phase 1 state-machine change (§2.2's invariants: skip is a Phase A / stages 1–5 concept only; scene-level stage locks for 7–12 are untouched) — needs its own analysis before "skipped" could ever apply at scene-stage granularity, which this feature may or may not need.

### Task 5.3 — Dashboard "start from files"
- New dashboard entry point opening Streamline intake directly, auto-naming the project from imported material instead of asking for a title first.

### Task 5.4 — Import templates for series creators
- Save a finished project's configuration (global assets, style capsule, project type, tone) and apply it to a new project — new project starts pre-loaded, only needs the new episode's script.

### Task 5.5 — Asset-only intake
- Scoped intake mode routing directly to Stage 5 (and optionally the current scene's Stage 8) for a single new character/location addition, without the full asset-extraction flow.
- Likely the smallest Phase 5 item — largely a constrained entry point into machinery Phase 3 already builds (Task 3.5's standalone asset-file path is probably the direct dependency).

---

# Part 4 — Deferred / Future Initiatives

## Script Revision Reconciliation *(relocated from the plan's Phase 5.6)*

This does not ship as part of this plan, in any phase. It was originally scoped as a Phase 5 reach feature but is, mechanically, branch-system work: `stage_states` rows are already `branch_id`-scoped (matching `intake_resolutions`'s scoping decision, §2.9.1), so "push a revised script without losing Stage 7–12 work" is either (a) a new branch forked at the revision point, or (b) an in-place mutation of the active branch's `stage_states` chain guided by a script diff — no third option avoids the branch system.

A future design doc must resolve, before any build estimate is meaningful:
- **New branch vs. mutate active branch.** Forking preserves pre-revision state for free but leaves the user with two branches to reconcile visually; in-place mutation is a cleaner mental model but needs a real rollback story.
- **What "a scene changed" means.** Raw text diff (fast, noisy), semantic diff (expensive, LLM pass), or manual per-scene confirm (cheap to build, slow for long scripts).
- **Interaction with the forward-only unlock cascade.** The existing cascade (§2.1/2.3) only ever walks forward and deliberately has no reverse edge. A script revision could invalidate a scattered, non-contiguous set of scenes across Stages 7–12 simultaneously — a different shape of trigger the existing cascade doesn't generalize to.
- **Direct tension with §2.4's "no auto re-sync" default.** Backfilled content (Stage 2/3 from Stage 4) deliberately never re-syncs automatically — drift is accepted, mitigated only by a static badge. This feature's entire premise is the opposite default (re-sync after a script revision) on the adjacent part of the same pipeline. The design doc must argue why re-sync is unsafe-to-automate in one direction but is the point of the feature in the other — not assume it's obvious.

## Everything in §1.6

Audio intake, storyboard/sketch routing into Stage 10, CineBlock package import, "just talk to me" conversational intake, YOLO/full-auto-pipeline mode, personal creative fingerprint / lore library, film reference deconstruction, collaborative multi-contributor intake. All real, all explicitly future, none scoped or designed here.

---

# Part 5 — Reference Tables

## New Backend Endpoints

| Endpoint | Method | Purpose | Phase |
|---|---|---|---|
| `/:projectId/stages/:stageNumber/skip` | POST | Transition a stage to `skipped` | 1 |
| `/:projectId/streamline/commit` | POST | Atomic RPC — applies all stage transitions (+ resolutions/edits from Phase 4, + assets from Phase 3) in one transaction | 1 (extended in 3, 4) |
| `/api/projects/:projectId/streamline/extract-file` | POST | Server-side text extraction, one file per call | 2 |
| `/:projectId/streamline/analyze` | POST | Full-batch classification + question generation | 4 |
| `/:projectId/streamline/reconcile` | POST | Q&A transcript → reconciled document text + diff summaries | 4 |

## New Database Objects

| Object | Purpose | Phase |
|---|---|---|
| `stage_states.status` CHECK constraint extension (`+ 'skipped'`) | Core skip state | 1 |
| Commit stored procedure (Postgres RPC) | Atomic multi-transition writes | 1 (extended in 3, 4) |
| `content._origin` field (JSONB, not a new column) | Provenance tag on stage content | 1 |
| `intake_resolutions` table | Ask Auteur facts ledger | 4 |
| `intake_resolution_edits` table | Reconciliation audit trail | 4 |
| `project_assets.source` enum `+ 'streamline_import'` | Batch image intake provenance | 3 |

## New Backend Dependencies

| Package | Purpose |
|---|---|
| `pdf-parse` | Server-side PDF text extraction |
| `mammoth` | Server-side DOCX text extraction |
| `@iarna/rtf-to-text` (or equivalent) | Server-side RTF text extraction |

## New Frontend Components

| Component | Purpose | Phase |
|---|---|---|
| Streamline entry / drop zone (extends `FileStagingArea.tsx` pattern) | Multi-file + paste-text intake | 2 |
| Skipped-stage placeholder | Third render mode alongside active/locked | 1 |
| Review-before-commit screen | Pre-commit summary, grows across phases | 2 (extended in 3, 4) |
| Question UI (Ask Auteur) | Multiple-choice + freetext clarification | 4 |
| `StreamlineImageReviewGrid` | Batch image reconciliation, replaces per-image modal loop | 3 |

## Tunable Config (not inline constants)

| Value | Default | Used by |
|---|---|---|
| `MIN_SCENE_HEADINGS` | 3 | Script-confidence detection (§2.8) |
| `MIN_DIALOGUE_LINES` | 1 | Script-confidence detection (§2.8) |

---

*This document supersedes the master plan's Phase 1/1.2 framing and Phase 5.6 placement, and incorporates every "Decided" resolution from the critique. Where an item in the critique was left as an open design question for a future doc (script revision reconciliation), that status is preserved here rather than resolved — it is out of scope for this build.*
