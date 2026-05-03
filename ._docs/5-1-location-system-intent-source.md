# Location System Intent Source of Truth

Status: Drafted on May 2, 2026 from the note sets in `._docs/topic-3.7.2026`, `._docs/topic-3.8.2026`, `._docs/topic-location`, and `._docs/topic3-11.md` (which is actually a directory/symlink of follow-up notes, not a single markdown file).

## Purpose

This document is the consolidated source of intent for the location background system work. It is meant to preserve what the previous developer was trying to achieve, clarify where the design evolved, distinguish the durable architecture from exploratory or later-corrected ideas, and give future development a coherent basis for finishing or refactoring the work.

This is not just a summary of one spec. It is a synthesis of:

- Early problem framing and feature ideation
- The full "master" architecture for location coverage
- The implementation-phase notes and session compacts
- Post-implementation discrepancy audits
- UX critique after real usage
- A later strategic rethink that softened the original default behavior

## Executive Read

The previous developer was trying to solve a legitimate and recurring generation problem:

- Characters and props are object-centric.
- Locations are space-centric.
- A single location image does not reliably produce coherent backgrounds across many shots.

The original solution was ambitious: turn locations from single-image assets into structured, multi-view, shot-aware reference libraries. The system would understand sub-locations, generate or accept named camera directions, assign shots to those directions, flag coverage gaps, and let approved frames become new continuity anchors.

After implementation and UI testing, the developer's view appears to have shifted:

- The architecture was directionally correct for high-control continuity workflows.
- The default user experience became too heavy and too hidden.
- The multi-view location system should likely remain as an advanced or opt-in mode.
- The simpler default should probably be: one location image or even one strong location description, with Stage 10 frame reuse/editing becoming the main continuity tool.

That nuance matters. The intended design was not "throw away the location coverage system." It was:

- Keep the structured location system because it solves a real problem.
- Stop forcing its full complexity into the default workflow.
- Reframe it as an advanced precision tool, while making a lighter-weight path the default.

## Canonical Intent

If future developers need one sentence to anchor decisions, use this:

> The intended system is a two-tier location continuity model: a low-friction default path using a single location reference or description plus Stage 10 frame reuse/editing, and an advanced multi-view location-direction system for users who need tighter background continuity and are willing to manage more structured references.

That is the most faithful reading of the full document set.

## Problem the Developer Was Solving

Across the docs, the same three failure modes recur.

### 1. Angle mismatch

The location reference image might show the space from a bird's-eye, facade, or one-corner perspective, while the target shot needs a different viewing angle. The generator then invents the missing view, often inconsistently.

### 2. Partial space coverage

One reference image only reveals one part of the room or environment. Reverse angles, lateral moves, and alternate compositions require visual information the system does not actually have.

### 3. Sub-location drift

A single parent location like "House" or even "Living Room" may actually contain meaningful narrative micro-spaces:

- couch area
- kitchen doorway
- hallway entrance
- window corner

If the system treats all of these as one static backdrop, the background stops making visual sense as blocking changes.

### Underlying principle

The developer repeatedly rejects the idea that text prompting alone can solve this. The consistent belief across the notes is:

- prompt engineering can help
- but prompt-only location continuity has a hard ceiling
- visual references must do most of the work

## Design Evolution

The notes show four distinct design phases.

### Phase 1: Initial concept

The earliest version proposed "named location shots" similar to character angle variants:

- multiple named images per location
- fuzzy matching of shots to those images
- fallback to the primary location image

This was already moving away from the one-image-per-location model, but it was less formal than the eventual architecture.

### Phase 2: Full location system architecture

The design then expanded into the full five-layer system:

1. Sub-location precision in the script and extraction pipeline
2. Camera-direction views per location
3. Per-shot direction assignment
4. Coverage analysis before generation
5. Established views from approved generated frames

This is the most complete and internally coherent architecture in the docs.

### Phase 3: Implementation and audit

The session compact notes and discrepancy docs indicate that much of this architecture was implemented, at least in substantial form:

- schema and types
- Stage 5 direction management UI
- Stage 7 direction creation/assignment plumbing
- Stage 8 coverage/advisory behavior
- prompt-generation changes
- Stage 10 established-view locking

But the same follow-up notes also show gaps, rough edges, and workflow-discoverability problems.

### Phase 4: Strategic rethink

The later rethink document does not argue that the architecture was wrong. It argues that the default UX and default product stance were wrong.

The final strategic shift appears to be:

- keep the advanced multi-direction model
- make it optional, not expected
- make Stage 10 frame reuse/editing the main path for continuity for ordinary users

This later rethink should not be ignored. It meaningfully changes how the system should be finished.

## 1. Final Intended Architecture

This section reconstructs the most likely final architecture the previous developer was aiming for after all notes are considered together.

## 1.1 Product Model: Two-Tier Continuity System

The intended system appears to have two distinct user modes.

### Default mode: low-friction continuity

For most users:

- A location can be represented by one image, or even just a strong text description.
- That reference should be treated as a flexible style/spatial cue, not a rigid full-scene blueprint.
- The system should rely on prompt guidance to adapt that general reference to individual shots.
- Background consistency should increasingly come from Stage 10 frame reuse and editing, not from requiring users to pre-author many location views.

This mode optimizes for:

- less setup
- fewer generated assets
- lower budget usage
- fewer decisions earlier in the pipeline

### Advanced mode: structured location continuity

For users who care deeply about precise continuity:

- Each location becomes a library of views, not just one image.
- The pipeline assigns shots to those views.
- Coverage gaps are surfaced before generation.
- Good generated frames can be promoted into the view library.

This mode optimizes for:

- more predictable spatial continuity
- tighter control over backgrounds
- better handling of repeated angles and reverse shots
- more reusable consistency anchors over time

## 1.2 Core Pipeline Architecture

The mature architecture is still the best reference for how the advanced mode should work.

### Layer A: Sub-location precision

The script and extraction pipeline should distinguish meaningful spaces rather than collapsing everything into one broad location.

Examples:

- `INT. GINGERBREAD HOUSE - KITCHEN - DAY`
- `INT. GINGERBREAD HOUSE - HALLWAY - CONTINUOUS`
- `EXT. GINGERBREAD HOUSE - FRONT YARD - CONTINUOUS`

Intent:

- create separate location assets where the story truly changes spaces
- keep direction views for angle coverage within a space
- avoid using direction views to compensate for sloppy location extraction

Important nuance:

The developer does not appear to want infinite hierarchy. The notes explicitly defer complex zone hierarchies. The intended model is room/area precision, not a full nested scene graph.

### Layer B: Location views / camera directions

In advanced mode, a location asset should support multiple views. The mature terminology settled on "camera directions" or `location_views`, not just ad hoc named shots.

Typical default proposals:

- one establishing view
- one eye-level primary direction
- one reverse or secondary direction

Possible metadata for a location view:

- system name
- user alias
- description
- view type
- camera distance
- camera height
- image URL
- primary fallback flag
- source origin
- established-from metadata

Intent:

- make location references structured and selectable
- let the system reason about which reference to use
- distinguish "the main fallback direction" from "the establishing/context image"

Key semantic distinction:

- `is_primary` is the fallback direction for unmatched shots
- it should not be the establishing overhead shot
- the establishing shot is a spatial context anchor, not the default main shot reference

That distinction is one of the strongest and most repeated design decisions in the docs.

### Layer C: Per-shot direction assignment

Every shot should ideally resolve to a specific location direction in advanced mode.

Intent:

- Stage 7 should output structured camera metadata
- If directions already exist, the shot generator should map shots to them
- If directions do not exist, Stage 7 can infer and create placeholder directions
- users can later upload or generate images for those inferred directions

This is one of the most elegant ideas in the full design:

- Stage 5 is not a hard prerequisite
- the user can be lazy early
- Stage 7 can still bootstrap the directional model from the story itself

The system therefore avoids a dead-end where no directions exist and nothing downstream works.

### Layer D: Coverage advisory

Before spending generation credits, the system should analyze whether each location has enough view coverage for the planned shots.

The advisory is explicitly meant to be:

- non-blocking
- corrective
- visible in Stage 8

Coverage states conceptually include:

- good: assigned direction has image coverage
- partial/risky: assigned direction exists but no image or imperfect match
- unassigned: shot has no resolved direction

Intent:

- surface risk before frame generation
- allow users to make pragmatic tradeoffs
- help users decide whether they need more views or can proceed

### Layer E: Established views / hero frame loop

Once a user approves a generated frame with a good background for a given direction, that frame can become a new reusable location reference.

This is arguably the most production-smart piece of the system.

Intent:

- continuity improves organically during production
- the system increasingly references its own best results
- the user does not need to front-load every view manually

This layer effectively turns generation history into an asset-improvement loop.

## 1.3 Prompting and Reference Strategy

The developer's intended prompt strategy for locations is more subtle than "just attach a bunch of images."

### For locations, references act more like style/spatial anchors than subject locks

The docs repeatedly note that locations do not behave like characters:

- characters can often be treated as subject references
- locations are closer to environment/style/spatial-context references

The system should therefore:

- use location references to preserve palette, materials, architectural logic, and atmosphere
- not overclaim that a single reference can perfectly specify unseen geometry

### The intended advanced prompt pattern

Per generated frame in advanced mode:

- use the best-matching direction image as the main location reference
- include the establishing image as a secondary spatial-context reference
- include text describing any delta when the shot angle differs from the reference

Example conceptual delta:

- the reference shows the kitchen from eye level
- the target shot is high angle
- prompt should tell the model to preserve the same space but reframe from above

### Scene-bible reinforcement

The notes also point toward a strong repeatable text layer:

- location descriptions
- material and architectural cues
- fixed lighting/time-of-day cues
- assigned direction alias/description

This is meant to keep environment language stable across prompts, even when image references are imperfect.

## 1.4 Stage 10 Creative Workspace

The later rethink meaningfully elevates Stage 10.

The likely final intention is:

- Stage 10 should not merely be the place where prompts are executed
- it should become the user's main continuity-control workspace

That means Stage 10 should support:

- frame approval
- establish-as-view actions
- frame reuse as editing bases
- cross-shot continuity curation

## 1.5 Frame Reuse / Edit-from-Existing as Default Continuity Tool

This is the clearest late-stage product correction in the notes.

The intended behavior for most users appears to be:

- get one acceptable frame in a scene or location
- reuse that frame as the base for later frames
- edit only the delta: new characters, new props, new pose, new event, room damage, etc.

Why this matters:

- it preserves background continuity more naturally
- it reduces setup burden versus pre-building many direction assets
- it matches real user intuition better than a hidden multi-stage coverage system

This should be treated as part of the final intent, not a side thought.

## 1.6 Final Architecture Summary

If turned into a clean system model, the intended architecture is:

### Baseline

- precise location extraction where it materially matters
- one location image or strong location description is enough to begin
- location references are interpreted flexibly

### Advanced

- optional camera-direction library per location
- shot-to-direction assignment
- Stage 8 coverage advisory
- Stage 10 establish-as-view feedback loop

### Default continuity engine

- reuse/edit prior approved frames in Stage 10

That hybrid model is the best synthesis of the entire note set.

## 2. What Seems Implemented vs Missing

This section reflects what the notes strongly suggest has been built versus what still appears missing, uncertain, or conceptually unresolved.

Important caveat:

- This section is based on the notes and audits, not a fresh code audit.
- Where the notes conflict, this document favors the later discrepancy/rethink docs because they were written after implementation and testing.

## 2.1 What Seems Implemented

### A. Foundational data model

Strong evidence suggests the following were implemented:

- `location_views` table
- shot metadata fields for structured camera data
- supporting TypeScript types and interfaces

This appears to cover the foundational schema for advanced location direction handling.

### B. Sub-location precision in parsing/extraction

Strong evidence suggests:

- compound location headings were accounted for
- extraction logic was updated to preserve room-level specificity
- prompt rules for script generation were updated to request sub-location precision

This aligns with the intended Layer A architecture.

### C. Stage 5 direction-management UI

The docs indicate a Stage 5 location direction UI was implemented, though naming shifted:

- the design originally called for something like `LocationViewsGrid`
- the actual implementation reportedly used `LocationViewsDialog`

Capabilities described as implemented:

- list/create/update/delete location views
- suggest default views
- upload view images
- edit aliases/descriptions
- set a primary direction

### D. Stage 7 direction creation/assignment plumbing

The notes strongly indicate implementation of:

- structured camera parsing
- direction context injection into shot extraction
- inferred direction creation when no views exist
- persistence of `camera_direction_id` on shots

This is a major part of the architecture and appears to have landed.

### E. Stage 8 coverage-panel behavior

The notes suggest a `LocationCoveragePanel` exists and performs key duties:

- display per-location coverage
- show unassigned or uncovered shots
- allow reassignment of shots to directions
- expose missing-view generation

This seems to be the operational heart of the advanced workflow.

### F. Prompt-generation changes

The session compact docs strongly suggest implementation of:

- using matched location views in prompt/reference manifest building
- using the establishing view as secondary context
- delta descriptions for imperfect matches
- location-aware prompt enrichment

This is crucial because it means the architecture may already influence actual generation behavior.

### G. Established-view flow in Stage 10

The later session compacts indicate implementation of:

- detecting when a generated frame fills a coverage gap
- prompting the user to lock that frame as an established view
- allowing replacement behavior when a view already exists

If this is accurate, then the advanced continuity loop was largely completed.

### H. Batch "generate missing views"

The docs indicate something in this area exists, though in a simplified form:

- a one-click "Generate Missing Views" behavior
- likely sequential generation of missing direction images

This differs from some earlier proposal-review ideas but still counts as implemented functionality.

## 2.2 What Seems Missing

The discrepancy docs explicitly call out several missing items.

### A. Stage 7 direction-editing UI

The notes say direction assignment logic exists, but Stage 7 does not expose adequate UI for reviewing or editing those assignments immediately after shot extraction.

Implication:

- backend/data plumbing may exist
- early-stage user visibility is still weak

Nuance:

Some later notes question whether full Stage 7 editing is actually necessary if Stage 8 is the true editing context. That means this is a real gap against the original spec, but possibly not a gap against the refined product strategy.

### B. Stage 9 direction visibility and prompt transparency

The discrepancy docs explicitly say Stage 9 is missing:

- visible direction assignment UI
- preview of which location references will be attached
- visibility of delta descriptions

This matters because the original architecture wanted Stage 9 to be the "last chance" review step before generation.

### C. Scene-specific view overrides

The original master design floated scene-specific location variants, such as:

- normal kitchen
- damaged kitchen for one scene

The audits say this was not implemented.

This should be considered genuinely unbuilt, not merely hidden.

### D. Discoverability and activation flow

The UX docs identify major product-flow issues:

- if location assets are deferred, users may never see the camera-directions controls
- Stage 8 can show a problem without exposing an obvious fix
- there is poor connection between Stage 5 setup and Stage 8 assignment

This is not "missing feature logic" so much as "missing usable workflow." It is one of the biggest practical gaps.

### E. Guided setup path

The notes repeatedly imply the absence of a coherent guided experience:

- no quick-start wizard
- no direct bridge from Stage 8 warnings to Stage 5 direction setup
- too many manual steps across too many stages

This is likely one reason the later rethink happened.

### F. Project-level coverage visibility

The system appears scene-local, but the UX notes suggest no strong project-wide coverage summary exists.

That means users may struggle to understand:

- which scenes still have unresolved location continuity risk
- where to spend effort first

## 2.3 What Seems Implemented But Strategically Questioned

This category matters because the next team should not blindly finish every originally planned feature.

### A. The full multi-view workflow as default

This is the biggest strategic reversal.

Even if much of the system exists, the later notes strongly argue it should not be the default experience.

That means future work should not assume:

- every user should define multiple location views
- Stage 5 direction setup is a normal expectation
- coverage gap UI should be the main continuity path for ordinary users

### B. Heavy upfront location setup

The later notes treat this as harmful friction.

The developer appears to have concluded:

- pre-defining multiple views can help
- but requiring or foregrounding it too early is likely wrong for the product

### C. Batch generation as a central workflow

Although implemented in some form, the later notes imply that the more important continuity tool may actually be:

- reuse an already good frame
- edit from that

In other words, generating a large set of direction images upfront may no longer be the product center of gravity.

## 2.4 What Remains Conceptually Unresolved

These are areas where the notes show real uncertainty or shifting definitions.

### A. Default semantics of the location system in the user experience

The architecture says one thing:

- locations are multi-view reference libraries

The rethink says another:

- that is a power-user mode, not the default mental model

This is the single biggest unresolved product decision and should be explicitly settled before more UI is built.

### B. How much Stage 7 should expose

There are two plausible directions in the notes:

- strict completion of the original spec: editable directions in Stage 7
- pragmatic refinement: read-only indication in Stage 7, real editing in Stage 8

This should be decided deliberately rather than drift into accidental duplication.

### C. Scene-specific view overrides

The idea is useful, but likely lower priority and expensive in complexity. The docs never fully stabilize its data model or UX.

### D. Continuous-scene inheritance

The UX notes point out that continuation scenes may not surface the location system correctly if assets are not linked as expected.

This suggests a gap between:

- the logical story location
- the actual scene-asset linkage used by the UI

That is a product and data-flow issue worth resolving before adding more advanced features.

## 3. Recommended Path Forward Now

This section is the recommended interpretation for future development, based on both the architecture and the later rethink.

The key recommendation is:

- do not simply "finish every unchecked box" from the original spec
- first align the system with the later product correction

## 3.1 Adopt the Two-Tier Model Explicitly

The next development step should formalize the product model that is only implicit across the notes.

### Recommendation

Treat the location system as two explicit layers:

#### Layer 1: default continuity workflow

- one location image or strong description
- flexible prompt interpretation
- Stage 10 frame reuse/editing as the main continuity mechanism

#### Layer 2: advanced continuity workflow

- optional camera directions / location views
- shot assignment
- coverage advisory
- established-view refinement loop

Why this is the right move:

- it preserves the real value of the structured system
- it respects the later UX concerns
- it prevents the product from overfitting to high-effort users

## 3.2 Reframe Stage 10 as the Center of Continuity

The later notes are clear enough that this should become a first-class product decision.

### Recommendation

Promote Stage 10 from "generation endpoint" to "continuity workspace."

Priority capabilities:

- reuse a prior generated frame as the base for the current frame
- treat that reused frame as editable input, not just visual inspiration
- preserve background continuity while changing scene deltas
- make this easy and obvious

This likely delivers more practical value for most users than further polishing the advanced direction-coverage flow.

## 3.3 Keep the Advanced Location-View System, But Hide It Behind Intentional Entry Points

The advanced system should not be removed. It should be clearly positioned as a higher-control path.

### Recommendation

The UI should present this system as something like:

- "Advanced Location Continuity"
- "Camera Directions"
- "Precision Background Control"

It should appear:

- when users ask for more continuity
- when repeated background drift is detected
- when a scene/location has many repeated or reverse-angle shots
- when the user explicitly opts in

It should not feel mandatory for basic project setup.

## 3.4 Fix Workflow Discoverability Before Adding More Advanced Features

The strongest practical blocker in the notes is not algorithmic. It is discoverability and flow.

### Recommendation

Before building more complexity, fix these UX failures:

- deferred locations should not hide the feature
- Stage 8 warnings should include direct actions
- users should be able to get from "you have a location gap" to "define/fill this gap" in one step
- continuation scenes should still surface the location context coherently

Concrete likely improvements:

- expose direction setup from Stage 8 directly
- add clear empty states when no directions exist
- consider auto-activating or prominently surfacing location assets when scenes depend on them
- add project/scene-level gap indicators

## 3.5 Decide Whether Stage 7 Needs Full Editing or Just Visibility

The original spec wanted Stage 7 editing. Later notes question whether that is duplication.

### Recommendation

Do not build a full duplicate direction-management surface in Stage 7 unless testing proves it is necessary.

Preferred compromise:

- show assigned direction visibly in Stage 7
- allow light reassignment if easy
- keep full coverage-aware editing in Stage 8

This matches the product logic better:

- Stage 7 is where the shot list is created
- Stage 8 is where visual planning and gap analysis belong

## 3.6 Add Stage 9 Transparency Only If It Improves Decision Quality

Stage 9 missing visibility is real, but the right solution should be minimal and useful.

### Recommendation

Add Stage 9 transparency focused on confidence, not duplicate full management UI.

Useful additions:

- show which direction is assigned
- show which location images will be used
- show when a delta adaptation is being used
- warn when a shot is falling back to weak location context

Avoid turning Stage 9 into another full editor unless necessary.

## 3.7 Defer Scene-Specific Overrides Unless a Strong Use Case Demands Them

This feature is valid but expensive.

### Recommendation

Treat scene-specific location overrides as future scope unless current production needs make them urgent.

Reason:

- they require more model complexity
- they add more asset state to explain
- they are not central to validating the broader continuity strategy

## 3.8 Preserve the Established-View Loop

This is one of the most valuable parts of the advanced system and should remain.

### Recommendation

Keep and refine:

- lock approved frame as established view
- replace existing direction image intentionally
- clearly show that established views improve future generations

This is the strongest bridge between:

- the lightweight Stage 10-first strategy
- and the advanced structured location library

In effect, it lets the advanced library grow from actual production use rather than requiring all setup in advance.

## 3.9 Suggested Practical Development Order

If development resumes, this is the recommended sequence.

### Priority 1: Product clarification

- Explicitly document that the system has a default path and an advanced path.
- Decide whether advanced location directions are opt-in by toggle, by empty-state entry point, or by progressive disclosure.

### Priority 2: Stage 10 continuity workflow

- Design and implement frame reuse/edit-from-existing
- Make Stage 10 the obvious place to maintain continuity

### Priority 3: Discoverability fixes for the advanced system

- expose direction setup from Stage 8
- resolve deferred-location dead ends
- improve continuation-scene handling
- add clear gap states and one-step fixes

### Priority 4: Light visibility in Stage 7 and Stage 9

- Stage 7: show assigned directions
- Stage 9: show which location refs will be used and whether the shot is a fallback/delta case

### Priority 5: Only then evaluate deeper advanced additions

- scene-specific overrides
- richer project-wide coverage dashboards
- more sophisticated auto-assignment or review flows

## 3.10 What Not to Do

Future development should avoid these likely mistakes.

### Do not assume the old master spec is the entire final truth

It is the richest architectural doc, but the later rethink materially changes product intent.

### Do not optimize only for meticulous power users

The later notes show the developer realized this was happening.

### Do not bury continuity control in Stage 5-only setup flows

The notes make clear this harmed discoverability and likely adoption.

### Do not duplicate heavy editing UI across every stage

The system already risks workflow sprawl. Prefer clear ownership:

- Stage 7 for extraction visibility
- Stage 8 for coverage and assignment
- Stage 10 for continuity curation and reuse

## Recommended Canonical Interpretation

If this team needs a final, operational interpretation of intent, it should be:

1. The previous developer correctly identified that location backgrounds need smarter handling than a single static image.
2. They designed and largely implemented an advanced multi-view location continuity system to solve that.
3. After testing, they realized the advanced system should not be the default user journey.
4. The product should now explicitly split into:
   - a lightweight default path centered on one location reference/description plus Stage 10 frame reuse/editing
   - an advanced path centered on optional location directions, coverage analysis, and established views
5. The next phase of work should focus less on adding raw complexity and more on aligning the shipped system with that two-tier product model.

## Source Notes Used

Primary architecture sources:

- `._docs/topic-location/3.7-location-system-enhancement-(master-doc).md`
- `._docs/topic-location/3.7-location-concern-notes.md`
- `._docs/topic-3.7.2026/3.7-phase-3-EXPANDEDOUT-location-multi-shot.md`
- `._docs/topic-3.8.2026/3.8-phase4-location-multi-angle.md`

Implementation status sources:

- `._docs/topic-location/3.7-location-session-compact-A&B.md`
- `._docs/topic-location/3.7-location-session-compact-C&D.md`
- `._docs/topic-location/3.7-location-session-compact-E&F.md`
- `._docs/topic-location/3.7-location-session-compact-G&H.md`
- `._docs/topic3-11.md/3.7-location-rd-1-discrepancies.md`
- `._docs/topic3-11.md/3.7-location-rd-1-testing-guides.md`

Rethink / corrective direction sources:

- `._docs/topic3-11.md/post-clean-location-rethink.md`
- `._docs/topic3-11.md/3.7-location-rd-2-UIUX-improove.md`
- `._docs/topic-location/3.7-location-system-enhance-analysis.md`

## Final Bottom Line

The location-background work should be treated as neither a failed overcomplication nor a fully settled finished design.

It is better understood as:

- a strong advanced continuity architecture
- partially or largely implemented
- followed by a valid product correction

The best path forward is to preserve the architecture, simplify the default experience, and make Stage 10 frame reuse/editing the main continuity mechanism for ordinary users while keeping the structured multi-view location system as an opt-in precision tool.
