# Location Continuity Implementation Plan

Status: Drafted on May 3, 2026.

Primary source of truth:

- [5-2-location-product-synthesis.md](/C:/Users/Daniel%20Lopez/Desktop/Aiuteur/wizardirector/5-2-location-product-synthesis.md)

Supporting references:

- [4-15-location-resolver-spec.md](/C:/Users/Daniel%20Lopez/Desktop/Aiuteur/wizardirector/4-15-location-resolver-spec.md)
- [4-15-location-analysis.md](/C:/Users/Daniel%20Lopez/Desktop/Aiuteur/wizardirector/4-15-location-analysis.md)
- [location-system-intent-source.md](/C:/Users/Daniel%20Lopez/Desktop/Aiuteur/wizardirector/._docs/location-system-intent-source.md)

This document translates the product synthesis into a phased, technical implementation plan. It is written to guide actual development work across backend, frontend, data migration, QA, and rollout.

The plan assumes:

- canonical shot-level location identity is foundational
- the advanced continuity system remains valuable
- the default user journey should stay lightweight
- Stage 10 continuity reuse should become the long-term center of gravity

## Implementation Goals

By the end of this plan, the system should support:

1. Baseline canonical shot-to-location identity across the pipeline.
2. Lightweight Stage 7 visibility and repair for location linkage.
3. Stage 8 ownership of advanced coverage planning and continuity repair.
4. Stage 9 transparency into actual continuity references and fallback behavior.
5. Stage 10 reuse/edit-from-existing as the default continuity mechanism.
6. Organic growth of advanced location views from approved production output.

## Non-Goals

This plan does not assume we should:

- force all users into multi-view location setup
- make `camera_direction_id` mandatory for all shots
- hard-block default-mode users early in the rollout
- implement scene-specific overrides before the core continuity flow is coherent

## System Model

The implementation should consistently preserve this model:

- baseline continuity layer:
  `location_asset_id`, location confidence, baseline prompt context, reuse/edit flow

- advanced continuity layer:
  `camera_direction_id`, `location_views`, coverage advisory, view assignment, established-view feedback loop

This distinction should be visible in both code and UX. Baseline continuity is always relevant. Advanced continuity is progressive and optional.

## Cross-Cutting Technical Principles

1. One resolver service should own location normalization and matching.
2. One server-side continuity assembly path should decide what location context a shot gets.
3. All UI stages should consume server-derived continuity state instead of recomputing their own string heuristics.
4. Each phase should ship additive behavior before replacing old behavior.
5. Telemetry should be added before strict enforcement so confidence thresholds can be calibrated from real usage.

## Architecture Targets

## Backend

We should end up with these backend responsibilities:

- resolver service for baseline `location_asset_id`
- continuity composition service that assembles:
  - baseline location context
  - advanced direction/view context
  - fallback/delta adaptation metadata
  - reusable continuity-base candidates for Stage 10
- server endpoints for:
  - shot read/write with location fields
  - batch resolve
  - location coverage summaries
  - Stage 9 continuity preview
  - Stage 10 continuity base suggestions
  - establish-as-view actions

## Frontend

We should end up with these frontend responsibilities:

- Stage 7:
  lightweight location truth review
- Stage 8:
  advanced coverage diagnosis and repair
- Stage 9:
  continuity reference transparency
- Stage 10:
  continuity reuse/edit workspace

## Data Flow Overview

The target data and context flow should be:

1. Scene extraction produces `expected_location` and shot `setting`.
2. Resolver assigns or suggests `location_asset_id`.
3. Shot payloads include baseline continuity metadata.
4. Stage 8 coverage API adds advanced continuity analysis using `location_asset_id` plus `camera_direction_id` and `location_views`.
5. Stage 9 preview API returns the actual continuity package that generation will use.
6. Stage 10 generation and approval flows can reuse prior approved frames and optionally promote them into established views.

This is important because it prevents each stage from inventing its own logic.

## Phase 0: Audit and Alignment

Goal:
Establish a clean implementation baseline before shipping behavior changes.

## Tasks

1. Audit existing location-related schema and runtime behavior.
   Confirm current state of:
   - `location_views`
   - shot `camera_direction_id`
   - prompt generation reference assembly
   - Stage 8 coverage panel logic
   - Stage 10 established-view behavior

2. Audit all existing string-based location joins.
   Search backend and frontend for:
   - `setting.includes(...)`
   - case-insensitive location-name matching
   - ad hoc fuzzy matching helpers
   - local UI-only coverage inference

3. Map actual endpoints and payloads already used by Stages 7, 8, 9, and 10.
   Document:
   - endpoint names
   - response shapes
   - frontend consumers
   - overlap or duplication

4. Decide canonical continuity DTO shapes before implementation.
   At minimum define:
   - `ShotLocationState`
   - `LocationCoverageSummary`
   - `ShotContinuityPreview`
   - `ContinuityBaseCandidate`

5. Add a short glossary to the code-facing docs.
   Keep naming stable around:
   - location
   - location reference
   - location view
   - camera direction
   - established view
   - continuity base

## Developer Notes

- This phase should produce written technical notes, not just code changes.
- If schema/runtime drift exists in adjacent systems, record it now so location work does not deepen inconsistency.

## Exit Criteria

- known current-state behavior is documented
- string-matching hot spots are enumerated
- target DTO vocabulary is agreed

## Phase 1: Baseline Canonical Identity Foundation

Goal:
Introduce baseline shot-level location identity without imposing heavy UX.

## Backend Tasks

1. Add shot-level location fields.
   Add to `shots`:
   - `location_asset_id uuid null`
   - `location_match_confidence numeric(4,3) null`
   - `location_match_source text null`
   - `location_match_notes text null`

2. Add location alias support on assets.
   Add to `project_assets`:
   - `location_aliases jsonb not null default []`

3. Add optional match event storage.
   Add `location_match_events` for audit and calibration.

4. Add indexes and constraints.
   Include:
   - location source constraint
   - shot location indexes
   - alias lookup index if query patterns justify it

5. Build `locationResolverService`.
   Core responsibilities:
   - normalize raw location text
   - score exact name matches
   - score alias matches
   - score fuzzy/token matches
   - incorporate `camera_direction_id` parent-location mapping when available
   - return ambiguity state and candidate list

6. Define server-side result types.
   Example fields:
   - `locationAssetId`
   - `confidence`
   - `source`
   - `reason`
   - `candidates`
   - `isAmbiguous`

7. Integrate resolver into shot creation/update paths.
   Use it in:
   - Stage 7 extraction insert path
   - shot update endpoint when `setting` changes
   - any shot bulk-upsert paths

8. Add read-path hydration for location state.
   All shot read endpoints used by Stage 7 and Stage 8 should include the new baseline fields.

## Data Migration Tasks

1. Build dry-run backfill script.
   Resolution order:
   - parent location from `camera_direction_id`
   - shot `setting`
   - scene `expected_location`

2. Add report output for:
   - resolved count
   - unresolved count
   - ambiguous count
   - counts by confidence bucket
   - counts by source

3. Build apply mode with conservative thresholding.
   Auto-apply only higher-confidence matches.

4. Preserve reviewability.
   Medium-confidence or ambiguous results should remain visible as system-assigned, not silently promoted to trusted truth.

## Frontend Tasks

1. Extend shot models and query typing.
   Ensure new shot payload fields reach the frontend in a stable typed shape.

2. Add non-invasive baseline display hooks.
   No new major UI yet. This phase is mostly plumbing so the frontend can render baseline location state later.

## QA and Telemetry

1. Unit tests for normalization and scoring.
2. Integration tests for shot insert/update behavior.
3. Backfill dry-run verification.
4. Telemetry for:
   - unresolved rate
   - ambiguous rate
   - top alias usage patterns

## UI/Visual Notes

No visible workflow expansion is required yet. If any UI changes appear in this phase, they should be read-only indicators only.

## Exit Criteria

- new schema is live
- resolver is integrated into write paths
- shot APIs expose baseline location state
- backfill tooling exists and has been dry-run

## Phase 2: Stage 7 Lightweight Location Truth UX

Goal:
Make baseline location state visible and fixable in Stage 7 without turning Stage 7 into a full continuity console.

## Backend Tasks

1. Add manual location assignment endpoint.
   Support:
   - assign location
   - clear location
   - store reason/source as manual when explicitly set

2. Add batch resolve endpoint for shot rows in a scene.
   Modes:
   - dry run
   - apply suggestions above threshold

3. Add Stage 7 validation extension.
   Return:
   - unresolved location count
   - ambiguous location count
   - mismatch with scene expected location count

4. Add explicit baseline state enum on read payloads if useful.
   Example:
   - `resolved`
   - `suggested`
   - `ambiguous`
   - `unresolved`

## Frontend Tasks

1. Add linked-location row to each Stage 7 shot editor item.
   UI elements:
   - linked location display or combobox
   - confidence badge
   - source badge or tooltip
   - candidate list for ambiguous states

2. Add lightweight actions only.
   Include:
   - accept suggestion
   - choose different
   - clear
   - open advanced continuity tools

3. Add scene-level warning banner.
   Show counts for:
   - unresolved
   - ambiguous
   - mismatch

4. Add location warnings section to the Stage 7 validation panel.
   This should summarize issues, not launch full coverage editing inline.

5. Re-run resolver on `setting` edits.
   Behavior:
   - debounce client-triggered recomputation
   - preserve manual assignment if user explicitly locked it
   - clearly distinguish “system suggestion changed” from “manual choice retained”

## UI/Visual Notes

Stage 7 should look and feel like:

- a shot editing screen with better context
- not a large spatial-planning dashboard

Recommended visual treatment:

- confidence badges:
  - high: green or positive neutral
  - medium: amber
  - low/unresolved: red or warning neutral
- unresolved states should be obvious but not alarming enough to imply hard failure
- “Open advanced continuity tools” should be present as an exit path, not the center of the view

## Data/Context Flow

1. User edits shot `setting`.
2. frontend sends shot update
3. backend re-runs resolver
4. updated shot payload returns:
   - `location_asset_id`
   - confidence
   - source
   - candidates if ambiguous
5. Stage 7 re-renders baseline state immediately

## QA

1. Test manual override persistence.
2. Test ambiguous candidate rendering.
3. Test scene-level validation counts.
4. Test that Stage 7 remains usable when many shots are unresolved.

## Exit Criteria

- Stage 7 shows baseline location truth clearly
- users can correct baseline location without leaving the stage
- Stage 7 does not duplicate direction or coverage management

## Phase 3: Stage 8 Coverage and Advanced Continuity Repair

Goal:
Make Stage 8 the clear home for advanced spatial continuity planning and repair.

## Backend Tasks

1. Build a coverage aggregation service.
   Inputs:
   - shots with `location_asset_id`
   - `camera_direction_id`
   - `location_views`
   - location reference availability

   Outputs:
   - per-location shot counts
   - per-location direction/view inventory
   - uncovered shots
   - weak-fallback shots
   - unassigned-direction shots

2. Replace string-based coverage matching with canonical server logic.
   Stage 8 should no longer derive location grouping from `setting.includes(locationName)`.

3. Define `LocationCoverageSummary` DTO.
   Include:
   - location id and name
   - continuity mode relevance
   - view inventory
   - risk counts
   - per-shot assignment summary

4. Add APIs for:
   - fetch coverage summary for scene/project segment
   - assign or clear `camera_direction_id`
   - create inferred view shell
   - trigger missing-view generation flow
   - use approved frame as location view source when available

5. Add mode-sensitive severity logic.
   Default mode:
   - unresolved direction is advisory

   Advanced mode:
   - unresolved direction becomes stronger warning

## Frontend Tasks

1. Refactor Stage 8 around server-derived continuity state.
   Frontend should render, not invent, coverage meaning.

2. Add continuity mode framing.
   UI should explicitly signal whether the user is operating in:
   - basic continuity
   - advanced continuity

3. Build per-location coverage cards or sections.
   Each section should show:
   - location name
   - number of shots
   - available views
   - coverage status
   - primary actions

4. Build assignment table or list.
   Per shot, show:
   - shot label
   - setting
   - linked location
   - assigned direction/view
   - risk state
   - quick action to assign/change direction

5. Build direct repair actions.
   Include:
   - create view
   - assign shot to view
   - generate missing view
   - use approved frame as view

6. Add clear empty states.
   Example cases:
   - location has no views yet
   - location has only establishing reference
   - all shots rely on primary fallback

## UI/Visual Notes

Stage 8 should feel diagnostic and action-oriented.

Recommended layout:

- top summary strip for continuity mode and total risk counts
- one section per location
- within each location:
  - view inventory block
  - risk list
  - shot assignment table
  - action row

Visual distinction should separate:

- baseline location problems
- advanced direction coverage problems

Those are related, but not equivalent.

## Data/Context Flow

1. Stage 8 requests coverage summary.
2. server groups shots by canonical `location_asset_id`.
3. server overlays direction/view coverage.
4. UI renders:
   - good
   - partial
   - fallback
   - risky
   - unassigned
5. user repairs direction or creates views.
6. server persists `camera_direction_id` or new view records.
7. Stage 8 refreshes summary.

## QA

1. Verify no Stage 8 grouping relies on raw string inclusion anymore.
2. Verify empty-state behavior when a location has no views.
3. Verify advanced-mode warnings are stronger than default-mode warnings.
4. Verify assignment edits are reflected in prompt-time continuity preview later.

## Exit Criteria

- Stage 8 is the clear repair surface for advanced continuity
- server owns coverage logic
- users can fix gaps in one step from the coverage view

## Phase 4: Stage 9 Pre-Generation Continuity Transparency

Goal:
Show exactly what continuity references and fallback logic generation will use.

## Backend Tasks

1. Build a `continuityPreviewService`.
   For each shot, assemble:
   - baseline location context
   - matched direction/view if available
   - establishing view if available
   - fallback chain
   - delta/adaptation guidance
   - confidence/risk summary

2. Define `ShotContinuityPreview` DTO.
   Include:
   - shot id
   - location summary
   - direction summary
   - reference list in usage order
   - adaptation notes
   - risk notices
   - generation-strength indicator

3. Add preview endpoint(s) used by Stage 9.
   Support batch or per-shot retrieval depending on UI design.

4. Ensure prompt generation uses the same assembly path.
   Stage 9 must preview the real logic, not an approximation.

## Frontend Tasks

1. Add continuity context panel to Stage 9.
   Show:
   - assigned location
   - assigned direction if any
   - reference stack
   - fallback/delta notes
   - risk badges

2. Add reference previews where feasible.
   At minimum show thumbnail or label for:
   - matched direction image
   - establishing image
   - base location reference

3. Add navigation back to Stage 8.
   If continuity is weak, the user should be able to repair before generation.

4. Avoid deep editing here.
   Stage 9 should be a transparency step, not another management hub.

## UI/Visual Notes

Stage 9 should be calm and confidence-building.

Recommended visual hierarchy:

1. continuity strength summary
2. reference list
3. adaptation note
4. warnings or risks

Use wording that helps users understand what the system is doing:

- “using matched direction view”
- “using establishing view as spatial support”
- “adapting from similar angle”
- “falling back to baseline location reference”

## Data/Context Flow

1. user enters Stage 9
2. UI requests preview package
3. server assembles continuity state from the same logic used by prompt generation
4. user sees actual reference usage before generation
5. user either proceeds or goes back to Stage 8 for repair

## QA

1. Snapshot tests for preview payload shape.
2. Verify preview matches actual prompt-generation input manifest.
3. Verify no hidden fallback path exists outside the preview service.

## Exit Criteria

- Stage 9 accurately reflects generation-time continuity logic
- users can understand weak continuity before spending generation effort

## Phase 5: Stage 10 Continuity Workspace and Reuse-First Flow

Goal:
Make Stage 10 reuse/edit-from-existing the default continuity mechanism for ordinary users.

## Backend Tasks

1. Build continuity-base suggestion service.
   Inputs:
   - current shot
   - shot `location_asset_id`
   - `camera_direction_id` when available
   - approved prior frames
   - continuity similarity heuristics

   Outputs:
   - ranked reusable base candidates
   - reasons for match
   - reuse mode suggestion

2. Define `ContinuityBaseCandidate` DTO.
   Include:
   - source frame id
   - source shot id
   - same-location indicator
   - same-direction or similar-direction indicator
   - reason text
   - confidence or suitability level

3. Add generation support for edit-from-existing.
   The generation pipeline should accept:
   - optional approved frame base
   - delta prompt or edit instruction set
   - continuity preservation guidance

4. Persist continuity lineage.
   Store relationships such as:
   - generated from base frame X
   - approved frame promoted from shot Y
   - established as view for location view Z

5. Add establish-as-view action endpoint.
   Support:
   - create new view from approved frame
   - replace existing view image
   - attach metadata about origin and promotion reason

## Frontend Tasks

1. Add continuity-base chooser in Stage 10.
   Show:
   - recommended approved frames
   - why each frame is a strong continuity base
   - option to generate fresh instead

2. Add edit-delta workflow.
   The UI should clearly separate:
   - what should stay the same
   - what should change

3. Add continuity lineage visualization.
   Keep this simple but visible:
   - current shot
   - reused approved frame
   - resulting approved output
   - optional promotion to established view

4. Add establish-as-view action in approval flow.
   When appropriate, allow:
   - add as new direction view
   - replace current direction image
   - attach to location as stronger baseline reference

## UI/Visual Notes

Stage 10 should feel creative and momentum-oriented, not bureaucratic.

Recommended sections:

- continuity base
- delta instructions
- output actions
- post-approval continuity actions

Important product behavior:

- the default suggestion should often be reuse/edit when a strong prior frame exists
- advanced view promotion should be available, but not forced

## Data/Context Flow

1. user opens a shot in Stage 10
2. server returns suggested continuity bases
3. user chooses:
   - reuse/edit
   - generate variation from base
   - generate fresh
4. generation uses continuity base plus delta instructions
5. approved output can be:
   - kept only as output
   - promoted to established view
   - used later as a continuity base for other shots

## QA

1. Verify continuity base ranking is reasonable for same-location cases.
2. Verify edit-from-existing pipeline preserves expected context better than fresh generation in test scenarios.
3. Verify lineage persistence and established-view promotion.

## Exit Criteria

- Stage 10 supports reuse/edit-from-existing as a first-class flow
- approved frames can feed back into the continuity system

## Phase 6: Progressive Disclosure, Settings, and Workflow Coherence

Goal:
Make the two-tier model explicit in the product so the advanced system is discoverable without becoming mandatory.

## Backend Tasks

1. Add continuity mode settings or flags.
   Possible scopes:
   - project
   - scene
   - user session preference

2. Add heuristics for proactive advanced-mode suggestion.
   Example triggers:
   - many shots in same location
   - repeated reverse angles
   - repeated fallback usage
   - user performing many manual direction corrections

3. Add project-level continuity metrics endpoints.
   Track:
   - unresolved baseline locations
   - weak continuity previews
   - direction coverage gaps
   - Stage 10 reuse rate

## Frontend Tasks

1. Add continuity mode framing to relevant stages.
   Examples:
   - “Basic Continuity”
   - “Advanced Continuity”

2. Add progressive disclosure entry points.
   Examples:
   - “Need stronger background consistency?”
   - “This location would benefit from advanced view coverage.”

3. Add project- or scene-level risk summaries if helpful.
   Keep them lightweight at first.

4. Ensure navigation between stages supports the ownership map.
   Examples:
   - Stage 7 warning links to Stage 8
   - Stage 9 weak preview links to Stage 8
   - Stage 10 approved frame promotion links back into advanced continuity context

## UI/Visual Notes

The main UX goal here is coherence.

Users should understand:

- the basic path is enough to start
- the advanced path is there when needed
- the system is helping them escalate intentionally, not forcing complexity too early

## Exit Criteria

- the product visibly expresses the two-tier model
- advanced controls are discoverable but not front-loaded

## Phase 7: Hardening, Calibration, and Optional Enforcement

Goal:
Stabilize confidence, improve trust, and optionally enable stricter workflows where justified.

## Backend Tasks

1. Review telemetry from earlier phases.
   Examine:
   - unresolved rates
   - ambiguous rates
   - manual reassignment rates
   - Stage 10 reuse adoption
   - weak-preview frequency

2. Calibrate resolver thresholds.
   Adjust:
   - exact/alias/fuzzy cutoffs
   - ambiguity delta thresholds
   - auto-apply thresholds for batch resolve and backfill

3. Improve alias management.
   Consider:
   - better authoring UI
   - typed aliases later if needed
   - dedupe and normalization utilities

4. Add optional strict-mode validation.
   Strict mode can strengthen warnings or block progression when:
   - advanced continuity has been explicitly enabled
   - high-value projects need stronger spatial discipline

5. Add regression suites for continuity preview and Stage 10 reuse flows.

## Frontend Tasks

1. Tune badge language and warnings based on real confusion points.
2. Reduce noisy alerts if telemetry shows warning fatigue.
3. Improve explanatory copy where users misread fallback behavior.

## Exit Criteria

- thresholds reflect real usage data
- optional stricter behavior is supported without degrading the default path
- continuity behavior is stable across the pipeline

## Recommended Build Order Inside the Codebase

Within engineering execution, the safest order is:

1. schema and DTOs
2. resolver service
3. shot write-path integration
4. shot read-path hydration
5. Stage 7 lightweight UI
6. Stage 8 server-owned coverage model
7. Stage 9 preview service
8. Stage 10 continuity base and reuse flow
9. progressive disclosure/settings
10. calibration and enforcement

This order minimizes thrash because later UI layers depend on stable continuity state from earlier phases.

## Suggested Testing Strategy

## Unit

- resolver normalization
- alias scoring
- ambiguity detection
- coverage summary assembly
- continuity preview assembly
- continuity base ranking

## Integration

- Stage 7 shot edit updates baseline location state
- Stage 8 coverage updates after direction assignment
- Stage 9 preview matches prompt-generation inputs
- Stage 10 reuse/edit flow persists lineage correctly

## Migration

- dry-run backfill reporting
- high-confidence apply mode
- rollback safety

## End-to-End

- new project with one simple location and no views
- project with several repeated shots in one location
- advanced continuity project with multiple directions and missing coverage
- Stage 10 reuse/edit loop that promotes a generated frame into an established view

## Dependencies and Risks

## Key Dependencies

- stable shot and asset APIs
- usable `location_views` model
- prompt-generation pipeline that can share continuity preview logic
- approved-frame persistence suitable for Stage 10 reuse

## Main Risks

1. Stage duplication.
   If Stage 7, 8, and 9 all become editors, the product will feel fragmented.

2. Overconfidence in resolver output.
   If auto-linking is too aggressive, users will trust wrong assignments.

3. Underpowered Stage 10 flow.
   If reuse/edit-from-existing is weak, the product will drift back toward heavy setup.

4. Hidden logic drift.
   If prompt-generation assembly differs from preview assembly, trust will drop quickly.

## Risk Mitigations

- centralize server-side continuity state
- expose confidence and fallback clearly
- ship advisory behavior before strict behavior
- make Stage 10 a real implementation priority, not a later afterthought

## Definition of Done

This initiative should be considered complete when:

1. Most shots can carry a reliable baseline `location_asset_id`.
2. Stage 7 shows baseline location truth and allows lightweight correction.
3. Stage 8 is the clear home for advanced coverage analysis and repair.
4. Stage 9 accurately previews real continuity references and fallback behavior.
5. Stage 10 supports reuse/edit-from-existing as a first-class continuity workflow.
6. Approved Stage 10 frames can strengthen the advanced continuity layer through established-view promotion.
7. The product clearly communicates the difference between baseline continuity and advanced continuity.
8. The default path is still lightweight enough for ordinary users to move quickly.

## Final Implementation Position

This plan should be executed as a coherent product-system rebuild, not as a pile of unrelated feature tickets.

The essential sequence is:

- establish canonical location truth
- expose it lightly in Stage 7
- concentrate advanced repair in Stage 8
- make Stage 9 honest about what generation will use
- make Stage 10 the practical continuity engine

If we preserve that shape while implementing the details, we should end up with a system that is both technically coherent and product-correct.
