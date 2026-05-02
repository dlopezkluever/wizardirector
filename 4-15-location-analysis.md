# Location / Background System Analysis (Deep Review)

## Scope
This report analyzes the location/setting/background system only, across:
- User experience when defining shot backgrounds/locations
- System logic robustness and data integrity
- Information flow across stages
- What is good, what is weak, and what should change

Repository review basis includes Stage 7/8 UI, shot extraction + validation, scene dependency extraction, location-views workflow, shot-asset matching, and prompt generation services.

## Executive Summary
The system has a strong deterministic foundation for extracting location context and a robust prompt-time fallback strategy, but location identity is still too text-driven in earlier stages. That mismatch causes avoidable user correction work in Stage 8 and introduces fragile matching behavior.

Current assessment:
- Prompt-time robustness: **Good**
- UX clarity and flow for location/background setup: **Medium**
- End-to-end location data integrity: **Medium-Low**

---

## What Is Working Well

## 1) Deterministic dependency extraction is a major strength
- Scene dependency extraction now prioritizes deterministic `extractManifest()` parsing from TipTap doc structure.
- `expected_location` is derived in a repeatable, low-latency way.
- Legacy LLM extraction remains as fallback for older/non-TipTap paths.

Why this is good:
- Predictable output and lower variance
- Better performance and cost
- More debuggable pipeline behavior

## 2) Prompt generation has solid location fallback logic
- Prompt generation includes deterministic location direction matching:
  - Prefer explicit `camera_direction_id`
  - Score by camera height/distance and alias overlap
  - Fall back to primary direction when no strong match
- It also generates delta guidance when shot angle/distance differs from available reference images.
- Numbered image manifest explicitly separates direction reference vs establishing/spatial context.

Why this is good:
- Robust even when location-view coverage is incomplete
- Reduces catastrophic failure from sparse data
- Gives model clearer framing intent

## 3) Stage 8 provides practical correction controls
- Location Coverage Panel surfaces:
  - Which shots map to a location
  - Which directions have images
  - Which shots are unmatched/unassigned
- Users can manually reassign direction per shot and batch-generate missing views.

Why this is good:
- Corrective affordance exists without hidden logic
- Users can recover from extraction/matching misses

## 4) Location views support an iterative visual grounding workflow
- Supports establishing + direction views
- Can upload, edit, or generate missing direction images from establishing/primary references
- Supports default view suggestion for fast start

Why this is good:
- Clear concept of spatial anchor + directional detail
- Reasonable bridge from script semantics to image conditioning

---

## What Is Weak (and Why It Matters)

## 1) Canonical location identity is missing too early
Observed behavior:
- Stage 7 validates required `setting` text only.
- No semantic validation that shot setting maps to a known location asset.
- No hard linkage field used as the primary key for shot location identity in early stages.

Impact:
- Naming drift accumulates (`Kitchen Hallway` vs `hallway kitchen` vs `kitchen`).
- Later stages spend effort reconciling text instead of advancing fidelity.
- Users experience “silent mismatch” until Stage 8 coverage review.

## 2) Critical matching paths are string-fragile
Observed behavior:
- Shot extraction context links scene `expected_location` to location asset by exact case-insensitive name equality.
- Stage 8 coverage relies on either `camera_direction_id` or `setting.includes(locationName)`.
- Stage 8 mapping helpers and matcher utilities also use fuzzy string contains.

Impact:
- False negatives when names differ slightly
- False positives on substring collisions
- Hard to reason about correctness in large projects

## 3) Correction burden lands late in the UX flow
Observed behavior:
- Users can freely edit Stage 7 shot settings.
- Location consistency problems emerge mostly in Stage 8 coverage.

Impact:
- More rework and cognitive load
- Manual repairs scale poorly with many shots/scenes
- Perceived tool reliability drops when users repeatedly “fix obvious links”

## 4) Location view management has workflow rigidity
Observed behavior:
- “Suggest defaults” is blocked if any views already exist.
- New directions use mechanical names (`direction_N`) from current count.

Impact:
- Partial states are harder to improve incrementally
- Naming becomes less semantically meaningful
- Can produce user confusion around direction identity over time

## 5) Assignment bootstrap favors completeness over precision
Observed behavior:
- Auto-populate assigns all shot × asset combinations as `throughout` when assignments are missing.

Impact:
- Good coverage, but noisy semantics
- Users need cleanup to achieve truth
- Can dilute confidence in downstream automation

## 6) Confirmed systemic consistency risk (adjacent but important)
Observed behavior:
- Some runtime code reads/writes from `videos`, while migrations define `video_generation_jobs`.

Impact:
- Potential invalidation/counting/reporting inconsistencies
- Indicates schema/runtime drift risk that could also affect location features if not controlled

---

## Information Flow Quality Assessment

Current flow:
1. Scene parse derives `expected_location`
2. Stage 7 shot extraction uses scene location + existing location views for context
3. New inferred directions can be created from extracted shot camera-direction names
4. Shots may carry `camera_direction_id`
5. Stage 8 coverage reconciles matches, images, and gaps
6. Prompt generation performs deterministic direction matching + delta fallback

Strong points:
- Deterministic backbone at scene and prompt layers
- Multiple fallback paths reduce hard failure risk

Weak points:
- Identity joins across mid-pipeline are text-heavy, not ID-heavy
- Matching logic is distributed and inconsistent across modules
- Semantics are not enforced at user-edit points

Net:
- The system is resilient but not yet coherent.
- It “works through mismatch” instead of “preventing mismatch.”

---

## UX Standpoint: User Experience Analysis

## What feels good
- Clear concept of location coverage and missing views
- Ability to manually fix direction assignments is practical
- Establishing + direction model is understandable for filmmaking users

## What feels rough
- Users can unknowingly create location drift in Stage 7
- Stage 8 can feel like diagnosis/repair instead of creative progression
- Direction naming and default-view tooling can feel technical rather than intent-driven

## User trust implications
- Trust is built when system catches inconsistency early
- Trust erodes when users repeatedly discover late-stage mismatches they thought were already clear

---

## System Standpoint: Robustness Analysis

## Robust today
- Deterministic extraction and prompt-time location matching logic
- Fallback behavior when metadata is missing
- Coverage-panel operational feedback loop

## Fragile today
- String-based identity linkage
- Distributed matching logic with differing heuristics
- Limited semantic validation at lock/approval boundaries

## Scalability concerns
- As projects grow in scene/shot count, text drift and reconciliation overhead grows non-linearly
- Operationally robust fallback does not equal semantically robust state

---

## Recommendations (What To Do Differently)

## 1) Canonicalize location at shot level early
- Add and populate `location_asset_id` on shots.
- Treat `setting` as descriptive text, not primary identity key.

## 2) Shift from free-text-only to assisted linking UX in Stage 7
- Add linked location selector (with confidence badges and quick-fix suggestions).
- Preserve editable `setting` copy, but lock identity to asset id.

## 3) Add location semantic validation at lock boundaries
- On Stage 7 lock, warn/error for:
  - unresolved location link
  - mismatch between linked location and scene expected location (when confidence high)

## 4) Centralize matching/normalization logic
- One shared resolver service for:
  - exact + alias + normalized token matching
  - ambiguity scoring
  - deterministic confidence output

## 5) Make location-views defaults additive
- Replace “all-or-nothing suggest defaults” with “suggest missing defaults.”
- Prefer semantic direction labels/aliases over pure numeric naming.

## 6) Improve assignment auto-populate strategy
- Keep full cartesian fallback for safety.
- Default to confidence-scored preselection to reduce cleanup burden.

---

## Priority Roadmap (High-Level)
1. P0: Canonical shot location identity (`location_asset_id`) + Stage 7 link UX + lock-time validation.
2. P1: Shared location resolver service + consistent reuse across extraction/coverage/matcher paths.
3. P1: Additive location-view defaults + semantic naming helpers.
4. P2: Telemetry and quality metrics (unmatched rate, manual reassignment rate, primary-fallback rate).

---

## Conclusion
This system already has the right structural ideas (deterministic extraction, direction-aware prompting, coverage tooling). The main gap is identity coherence across stages. The fastest path to a “great tool” is to move location truth from text heuristics to canonical IDs earlier, then use text as supportive metadata rather than the core join key.

