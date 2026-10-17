# Streamline Implementation Findings

This document expands on the issues identified in the last four Streamline implementation commits. The findings concern stage-order enforcement, failure atomicity, scene persistence, and audit-trail consistency.

## 1. High — Atomic commit does not enforce sequential prerequisites for content-bearing transitions

**Location:** `backend/migrations/043_intake_resolutions.sql:255`


### What happens

`streamline_commit` processes stage transitions in ascending stage-number order and validates the previous stage when the requested transition is the string `"skip"`. The object-transition branch, however, accepts statuses such as `"draft"`, `"locked"`, `"invalidated"`, `"outdated"`, and `"skipped"` without applying the same prerequisite check.

The bare `"locked"` transition is also limited to verifying that the target stage already has content. It does not verify that the preceding stage is already `locked` or `skipped`.

### Why it matters

A caller can submit a content-bearing transition for a later stage while earlier stages are still pending. For example, Stage 4 can be inserted as `locked` while Stage 2 and Stage 3 remain pending. This violates the intended sequential Phase-A workflow and can make downstream stages appear ready even though their inherited context is incomplete.

Because the check is inside the database RPC, client-side routing cannot be treated as the enforcement boundary. Any caller that can invoke the RPC can create this invalid state.

### Example invalid payload

```json
{
  "stage_transitions": {
    "4": {
      "status": "locked",
      "origin": "imported",
      "content": {"...": "..."}
    }
  }
}
```

If Stage 3 is pending, the current object-transition logic can still insert the Stage 4 version.

### Recommended verification

Add a database-level test that creates pending Stage 2 and Stage 3 states, submits a Stage 4 object transition with status `locked`, and asserts that the RPC raises an error and inserts no new stage state. Add equivalent coverage for a bare `"locked"` transition.

## 2. High — Streamline confirmation is only partially atomic

**Location:** `src/components/pipeline/Stage1InputMode.tsx:458`

### What happens

`handleStreamlineCommit` performs these operations in sequence:

1. Updates project-level configuration through `projectService.updateProject`.
2. Saves Stage 1 as a draft through `stageStateService.saveStageState`.
3. Calls `streamlineService.commit`, which invokes the atomic database RPC for stage transitions, assets, resolutions, and resolution edits.

The first two operations are separate requests and complete before the RPC begins. If the RPC fails, the earlier writes are not rolled back.

### Why it matters

The UI reports a failed Streamline commit, but the project configuration and Stage 1 draft may already be persisted. A retry can then operate against partially changed state, and a user may not know which parts of the commit succeeded. This is especially problematic when the failed RPC leaves the project configuration inconsistent with the stage data the user intended to commit.

The RPC itself may be atomic for the work inside its transaction, but that transaction does not include the preceding client-side requests.

### Failure sequence

```text
updateProject succeeds
        ↓
saveStageState succeeds
        ↓
streamline_commit fails
        ↓
configuration and Stage 1 draft remain persisted
```

### Recommended verification

Mock `streamlineService.commit` to reject after the project update and Stage 1 save resolve. Assert that both earlier service calls were made and that a subsequent read shows their changes still present. Then verify the desired remediation, such as moving all writes into one server-side transaction or implementing an explicit compensating rollback.

## 3. Medium — Scene persistence can silently fail after Stage 4 is locked

**Location:** `src/components/pipeline/Stage1InputMode.tsx:490`

### What happens

After the commit RPC succeeds, the client extracts scenes from the imported script and calls `scriptService.persistScenes`. The extraction and persistence are wrapped in a `try/catch` whose error is logged as non-fatal. The Streamline flow still calls `onStreamlineComplete` after that failure.

An empty extraction result is also tolerated: persistence is skipped when `scenes.length === 0`.

### Why it matters

The user can see a successful import and Stage 4 lock even though no scenes were stored. Stage 5 relies on those scenes for asset extraction, so downstream processing may have no source records and require manual recovery or re-importing.

This creates a misleading success state: the authoritative stage state says the script is locked, but the derived scene data needed by later stages is absent.

### Failure sequence

```text
commit RPC succeeds and Stage 4 becomes locked
        ↓
scene extraction or persistence fails
        ↓
error is logged only
        ↓
Streamline still completes successfully
        ↓
Stage 5 may find no scenes
```

### Recommended verification

Test both failure modes: reject `persistScenes`, and return an empty scene list from `extractScenes`. In each case, assert that the UI does not claim a fully successful flow unless the missing derived data is explicitly handled. If non-fatal behavior is retained, verify that the user receives a visible recovery action and that the failure is recorded for operational diagnosis.

## 4. Medium — Structural-cascade cancellation does not remove audit edits

**Locations:** `src/components/pipeline/Stage1InputMode.tsx:386`, `src/components/pipeline/Stage1InputMode.tsx:430`

### What happens

The reconciliation code creates each `resolution_edit` payload with fields including `diff_summary`, but it does not include `fileId`. The cancellation handler builds a set of canceled file IDs and then filters edits using:

```ts
cancelledFileIds.has(edit.fileId)
```

Since the created edit objects do not contain `fileId`, this condition cannot identify the matching audit edit. A canceled structural-cascade document can therefore remain in `resolutionEditsForCommit` and be submitted to `intake_resolution_edits`.

### Why it matters

The document text correctly remains unchanged when the user cancels the cascade, but the audit trail can claim that an edit was applied. This makes the resolution history inaccurate and can mislead later reconciliation, debugging, or review tools.

The existing filename prefix check is not sufficient on its own, because the predicate requires both the filename match and the missing-ID comparison to succeed.

### Failure sequence

```text
reconciliation creates edit without fileId
        ↓
user cancels structural cascade
        ↓
document remains unchanged
        ↓
edit is not removed from the commit payload
        ↓
audit row is still inserted
```

### Recommended verification

Add a component test with a reconciled document containing a known `fileId`. Cancel the cascade, complete the commit, and assert that no edit for that document is sent to `streamlineService.commit`. Also test multiple documents with similar filenames to ensure cancellation uses a stable identifier rather than string matching alone.

## Verification checklist

- [ ] RPC rejects a Stage 4 `locked` transition when Stage 3 is pending.
- [ ] RPC rejects a bare `"locked"` transition when its prerequisite is not locked or skipped.
- [ ] Failed RPC behavior is tested after project configuration and Stage 1 draft writes.
- [ ] Scene extraction failure and empty extraction are tested as explicit success/failure states.
- [ ] Canceling a structural cascade removes its corresponding resolution edit from the commit payload.
- [ ] Tests are run from the appropriate project directories after any implementation fixes.

