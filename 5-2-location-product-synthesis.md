# Location Continuity Product Synthesis

Status: Drafted on May 2, 2026.

This document synthesizes the conclusions from:

- [4-15-location-analysis.md](/C:/Users/Daniel%20Lopez/Desktop/Aiuteur/wizardirector/4-15-location-analysis.md)
- [4-15-location-resolver-spec.md](/C:/Users/Daniel%20Lopez/Desktop/Aiuteur/wizardirector/4-15-location-resolver-spec.md)
- [location-system-intent-source.md](/C:/Users/Daniel%20Lopez/Desktop/Aiuteur/wizardirector/._docs/location-system-intent-source.md)

Its purpose is to turn those somewhat disjointed ideas into one actionable product direction. It is not a replacement for the resolver spec. It is the product-layer frame that should govern how the resolver work is positioned, scoped, and exposed.

## Canonical Direction

We should treat location continuity as a two-layer system:

1. A lightweight default continuity path for most users.
2. A structured advanced continuity path for users who need tighter spatial control.

The resolver and canonical shot-level location identity are still important. They should be treated as foundational infrastructure, not as the main product experience by themselves.

The default path should optimize for speed, clarity, and momentum.

- one location reference image or strong description is enough to begin
- the system can adapt that reference flexibly
- Stage 10 frame reuse and edit-from-existing should become the main continuity mechanism

The advanced path should optimize for precision and repeatability.

- optional location views / camera directions
- shot-to-location and shot-to-direction assignment
- coverage analysis before generation
- established-view growth from approved frames

## Explicit Product Principles

1. Canonical identity should exist early, but complexity should not.
   `location_asset_id` should become a first-class field on shots, but most users should not be forced into heavy setup or multi-step repair work just to move forward.

2. Location truth and location control are different things.
   A shot should usually know what location it belongs to. That does not mean the user must manage camera directions, coverage matrices, or view libraries up front.

3. The default continuity workflow should feel lightweight.
   The normal path should be: define a location, generate, keep a good frame, reuse/edit that frame for later shots, and only enter advanced controls when continuity needs exceed the baseline path.

4. The advanced system should be opt-in or progressively disclosed.
   Multi-view location continuity is valuable, but it should appear when the user asks for it, when drift risk is high, or when the project clearly benefits from it.

5. Stage boundaries must be crisp.
   Each stage should own a specific kind of decision. The product should avoid duplicating full editing surfaces across multiple stages.

6. The system should prevent mismatch earlier, not merely survive it later.
   Shared resolver logic, canonical IDs, and confidence states should reduce silent drift before Stage 8 cleanup becomes necessary.

7. Confidence must be visible wherever automation makes a decision.
   Users do not need every implementation detail, but they should always be able to tell whether a location link is explicit, inferred, weak, or missing.

8. Advisories should be stronger than hidden fragility, but lighter than premature blocking.
   Default-mode users should see warnings and recommendations. Hard gates should be reserved for advanced-mode workflows or explicitly strict project settings.

9. The system should learn from production use.
   Approved Stage 10 frames should feed back into the advanced continuity layer as established views, allowing the reference library to grow from real output rather than only from front-loaded setup.

10. Terminology must stay stable.
   We should keep these meanings distinct:
   - `location`: the narrative space or room/area identity
   - `location reference`: a baseline image or description for that space
   - `location view` / `camera direction`: an advanced-mode viewpoint on that location
   - `established view`: a promoted approved frame used as a continuity anchor

## Product Model

## Layer 1: Default Continuity

This is the path most users should naturally take.

Core behavior:

- attach one location image or provide a strong description
- allow the system to infer likely shot-location linkage
- show confidence and drift warnings
- let users proceed without fully authoring multiple views
- use Stage 10 reuse/edit-from-existing to preserve continuity

Success definition:

- users do not feel trapped in setup
- users can make progress with imperfect structure
- continuity improves through output reuse, not only through preplanning

## Layer 2: Advanced Continuity

This is the path for users who need more exact spatial consistency.

Core behavior:

- maintain `location_asset_id` on shots
- optionally assign `camera_direction_id`
- manage location views and missing coverage
- run coverage analysis before generation
- promote approved Stage 10 frames into the view library

Success definition:

- repeated angles and reverse angles become more predictable
- the user can repair or extend coverage with explicit tools
- continuity quality scales with effort instead of collapsing under complexity

## Data Model Interpretation

The data model should reflect the two-layer system instead of implying that every shot must immediately participate in the full advanced workflow.

Recommended interpretation:

- `shots.location_asset_id`
  Baseline canonical location identity. This should exist whenever reasonably inferable.

- `shots.camera_direction_id`
  Advanced continuity precision only. Helpful when the project is using location views, but not required for the default path.

- `shots.location_match_confidence`
  Confidence in the baseline location assignment.

- `shots.location_match_source`
  Provenance of the baseline location assignment.

- `location_views`
  Advanced-mode view library for a location.

- established views from Stage 10
  A bridge from default-mode generation to advanced-mode structure.

Important behavioral distinction:

- unresolved `location_asset_id` is a baseline data-quality concern
- unresolved `camera_direction_id` is an advanced continuity concern

Those should not be treated as equally severe in the default product flow.

## Ownership Map

The system needs a cleaner division of responsibility across Stages 7, 8, 9, and 10.

## Stage 7: Shot Structure and Baseline Location Truth

Stage 7 should own:

- shot extraction and editing
- `setting` text
- initial `location_asset_id` suggestion and visibility
- basic confidence display
- lightweight location correction
- lock-time warnings about unresolved or suspicious location linkage

Stage 7 should not own:

- full location-view management
- full coverage diagnosis workflow
- heavy direction reassignment tooling
- continuity curation from generated frames

Recommended user promise:

"This is where you make sure each shot basically belongs to the right space."

Recommended UI scope:

- show linked location
- show confidence state
- allow accept suggestion
- allow choose different
- allow clear
- allow jump to deeper continuity tools

## Stage 8: Coverage Planning and Advanced Continuity Repair

Stage 8 should own:

- location coverage analysis
- direction/view assignment review
- missing-view surfacing
- one-step entry into advanced location controls
- repair actions for repeated or high-risk continuity problems

Stage 8 should not own:

- baseline shot extraction editing
- final prompt/reference transparency in detail
- actual frame-level continuity curation

Recommended user promise:

"This is where you decide whether your planned shots have enough spatial coverage before you spend generation effort."

Recommended UI scope:

- per-location coverage summary
- clear unresolved and risky states
- direct actions to define views, assign shots, or generate/fill missing coverage
- explicit distinction between default-mode acceptable fallback and advanced-mode risk

## Stage 9: Pre-Generation Transparency

Stage 9 should own:

- showing what continuity references will actually be used
- showing whether the shot is using baseline location context, a matched direction, or a fallback/delta adaptation
- surfacing weak-reference risk before generation

Stage 9 should not own:

- deep editing of locations or views
- duplicative shot management
- full coverage planning

Recommended user promise:

"This is the last clear look at what the system will rely on when generating this shot."

Recommended UI scope:

- assigned location
- assigned direction if present
- attached location references preview
- fallback/delta notices
- confidence/risk badges

## Stage 10: Continuity Workspace

Stage 10 should own:

- generation output review
- frame approval
- reuse/edit-from-existing as the default continuity mechanism
- establish-as-view actions
- continuity curation across shots

Stage 10 should not own:

- baseline resolver repair logic
- scene-wide coverage planning
- the first point where users discover location drift

Recommended user promise:

"This is where continuity becomes real and reusable."

Recommended UI scope:

- pick a previously approved frame as a base
- edit only the delta for the new shot
- mark approved frames as established views
- show continuity lineage between shots and reused frames

## Stage Flow Summary

The intended flow should be:

1. Stage 7 confirms basic shot-to-location truth.
2. Stage 8 checks whether advanced spatial coverage is good enough.
3. Stage 9 shows what references the generator will actually use.
4. Stage 10 becomes the main place where continuity gets strengthened over time.

This avoids both extremes:

- too much hidden magic
- too much duplicated UI

## Recommended Wireframes

These are low-fidelity wireframes meant to make ownership and interaction boundaries explicit.

## Stage 7 Wireframe: Shot Editor With Lightweight Location Linking

```text
+----------------------------------------------------------------------------------+
| Stage 7: Shots                                                                    |
+----------------------------------------------------------------------------------+
| Scene: INT. GINGERBREAD HOUSE - KITCHEN - DAY                                     |
| Expected Location: Gingerbread House / Kitchen                                    |
|                                                                                  |
| [!] 2 shots have weak or unresolved location links                                |
|      [Review now] [Continue]                                                      |
|                                                                                  |
| Shot 12                                                                           |
| Setting: [ Kitchen doorway by the oven                                  ]        |
| Linked Location: [ Gingerbread House / Kitchen                         v ]        |
| Confidence: [High]  Source: [Alias match]                                         |
| Actions: [Accept Suggestion] [Choose Different] [Clear] [Open Coverage Tools]     |
|                                                                                  |
| Shot 13                                                                           |
| Setting: [ Hallway entrance facing kitchen                               ]        |
| Linked Location: [ Unresolved                                           v ]       |
| Confidence: [Low]   Source: [Fuzzy / ambiguous]                                   |
| Actions: [Choose Different] [Clear] [Open Coverage Tools]                         |
| Candidates: Kitchen Hallway, Main Hallway                                         |
|                                                                                  |
| [Resolve Visible Suggestions] [Review Location Warnings] [Lock Stage]             |
+----------------------------------------------------------------------------------+
```

Notes:

- no full direction-management UI here
- users can fix baseline location truth quickly
- escalation path to Stage 8 is explicit

## Stage 8 Wireframe: Coverage and Advanced Continuity

```text
+----------------------------------------------------------------------------------+
| Stage 8: Location Coverage                                                        |
+----------------------------------------------------------------------------------+
| Continuity Mode: [ Basic ] [ Advanced ]                                           |
|                                                                                  |
| Location: Gingerbread House / Kitchen                                             |
| Status: [Partial Coverage]                                                        |
| Shots in this location: 8                                                         |
|                                                                                  |
| Views / Directions                                                                 |
| - Establishing view .......... image attached                                      |
| - Eye-level primary .......... image attached                                      |
| - Reverse to doorway ......... no image                                            |
| - Window-facing angle ........ inferred only                                       |
|                                                                                  |
| Coverage Risks                                                                     |
| [!] Shot 13 needs reverse coverage                                                |
| [!] Shot 15 is using weak fallback from primary                                   |
| [!] Shot 16 has no direction assignment                                           |
|                                                                                  |
| Actions                                                                            |
| [Create View] [Assign Shots] [Generate Missing View] [Use Stage 10 Approved Frame]|
|                                                                                  |
| Shot Assignment Table                                                              |
| Shot 12 | Kitchen doorway by oven          | Reverse to doorway      | Good       |
| Shot 13 | Hallway entrance facing kitchen  | Unassigned              | Risky      |
| Shot 15 | Wide on island and doorway       | Eye-level primary       | Fallback   |
|                                                                                  |
| [Save Assignments] [Return to Shots]                                              |
+----------------------------------------------------------------------------------+
```

Notes:

- Stage 8 owns spatial planning and gap repair
- it should offer one-step fixes, not just diagnosis
- this is the main home for advanced continuity controls

## Stage 9 Wireframe: Pre-Generation Continuity Transparency

```text
+----------------------------------------------------------------------------------+
| Stage 9: Generation Review                                                        |
+----------------------------------------------------------------------------------+
| Shot 13: Hallway entrance facing kitchen                                          |
|                                                                                  |
| Location Context                                                                   |
| Location: Gingerbread House / Kitchen Hallway                                     |
| Direction: Reverse to doorway                                                     |
| Continuity Strength: [Medium]                                                     |
|                                                                                  |
| References To Be Used                                                              |
| 1. Reverse to doorway image                                                       |
| 2. Establishing kitchen view                                                      |
| 3. Scene location description                                                     |
|                                                                                  |
| Adaptation Notice                                                                  |
| Using reverse-direction image plus spatial context.                                |
| Prompt will adapt framing for a slightly higher camera angle.                      |
|                                                                                  |
| Risks                                                                              |
| [!] No exact height match for this shot                                           |
| [!] Falling back to establishing context for left wall details                    |
|                                                                                  |
| [Proceed to Generate] [Back to Coverage]                                          |
+----------------------------------------------------------------------------------+
```

Notes:

- Stage 9 should reveal what the generator will rely on
- it should not become another full editor

## Stage 10 Wireframe: Continuity Workspace

```text
+----------------------------------------------------------------------------------+
| Stage 10: Creative Workspace                                                      |
+----------------------------------------------------------------------------------+
| Current Shot: 15                                                                  |
| Goal: Preserve kitchen background, change character blocking                      |
|                                                                                  |
| Continuity Base                                                                    |
| [Use Approved Frame #12 as Base]                                                  |
| Source: Scene 4 / Shot 12 / Approved                                              |
| Match Reason: Same location, similar reverse angle                                |
|                                                                                  |
| Edit Delta                                                                         |
| - move camera slightly wider                                                      |
| - replace standing pose with seated pose                                          |
| - keep same cabinets, oven, doorway layout                                        |
|                                                                                  |
| Output Actions                                                                     |
| [Generate Variation] [Edit From Base] [Generate Fresh Instead]                    |
|                                                                                  |
| After Approval                                                                     |
| [Approve Frame] [Set As Established View] [Replace Existing Reverse View]         |
|                                                                                  |
| Continuity Lineage                                                                 |
| Shot 12 approved frame --> reused for Shot 15 --> candidate new reverse anchor    |
+----------------------------------------------------------------------------------+
```

Notes:

- this is the default continuity engine for ordinary users
- this is also where the advanced library can grow organically

## Practical Recommendations For The Resolver Spec

The resolver plan should move forward, but with these framing constraints:

1. Treat `location_asset_id` as baseline continuity infrastructure.
2. Do not interpret the resolver rollout as a mandate to make Stage 7 the center of continuity.
3. Keep Stage 7 lightweight and confidence-oriented.
4. Let Stage 8 own coverage and advanced repair.
5. Let Stage 9 own transparency.
6. Let Stage 10 own continuity curation and reuse.
7. Reserve hard blocking for advanced-mode or strict-mode contexts, not the default path.

## Suggested Rollout

1. Foundation
   Ship `location_asset_id`, shared resolver logic, and additive payload changes.

2. Lightweight Stage 7 visibility
   Show linked location, confidence, and quick correction actions.

3. Stage 8 discoverability and one-step repair
   Make coverage gaps actionable instead of merely visible.

4. Stage 9 transparency
   Show actual reference usage and fallback/delta behavior before generation.

5. Stage 10 continuity workspace
   Make reuse/edit-from-existing the obvious default continuity path.

6. Advanced hardening
   Improve alias tooling, calibration, project-level metrics, and optional strict enforcement.

## Final Position

The right synthesis is not:

- "finish the old advanced system exactly as originally imagined"

and not:

- "abandon the structured location system and rely only on prompts"

The right synthesis is:

- build canonical location truth early
- keep the advanced spatial system available and coherent
- make Stage 10 continuity reuse the default product center of gravity
- expose advanced location continuity only when it is useful enough to justify its complexity

That direction preserves the strongest technical ideas while correcting the product-shape problem that emerged after implementation.
