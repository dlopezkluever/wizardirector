# Inheritance Contract

## Purpose

This document defines the **formal Global-to-Local Inheritance Contract** that governs how creative intent, constraints, and stylistic nuance propagate through the application pipeline.

The system behaves like a **creative compiler**:
- Early stages establish *global intent*
- Middle stages progressively specialize that intent
- Late stages generate concrete media artifacts

The contract ensures that **small changes in early stages deterministically affect later stages**, while still allowing controlled local overrides.

---

## Core Principles

1. **Determinism over Magic**
   - Inheritance rules are explicit and inspectable
   - No hidden prompt accumulation

2. **Global-to-Local Flow**
   - Context always flows downstream
   - Upstream stages are never mutated by downstream stages

3. **Scoped Overrides**
   - Local stages may override specific fields
   - Overrides never silently erase global intent

4. **Auditability**
   - Every generation records:
     - What was inherited
     - What was overridden
     - What Style Capsules were applied

---

## Stage Classification

Stages are grouped by responsibility.

### 1. Global Intent Stages (Stages 1–3)
**Purpose:** Establish the foundational creative vision.

Produces:
- Narrative intent
- Tonal constraints
- Visual philosophy
- High-level pacing rules

Characteristics:
- Immutable once confirmed
- Changes invalidate all downstream stages

---

### 2. Narrative Structure Stages (Stages 4–6)
**Purpose:** Translate intent into structured narrative artifacts.

Produces:
- Master script
- Beat sheets
- Act-level pacing

Characteristics:
- Inherit all global intent
- May refine but not contradict global tone
- Changes invalidate downstream stages only

---

### 3. Scene & Shot Specialization Stages (Stages 7–10)
**Purpose:** Localize narrative into scenes, shots, and visual units.

Produces:
- Shot lists
- Scene-level visual descriptions
- Character blocking and emphasis

Characteristics:
- Strong inheritance from global and narrative layers
- Allowed to override *local emphasis* only
- Cannot override tone, genre, or style locks

---

### 4. Media Realization Stages (Stages 11–12)
**Purpose:** Generate concrete media outputs.

Produces:
- Image prompts
- Video prompts
- Render jobs

Characteristics:
- No creative authority
- Strictly consumptive
- Violations are traced upstream

---

## Context Layers

All context passed to an LLM is composed of layered sources.

### Layer Order (Highest → Lowest Priority)

1. **Local Overrides** (Stage-specific)
2. **Scene / Character Context**
3. **Narrative Structure Context**
4. **Global Intent Context**
5. **System Constraints** (hard limits)

Lower layers cannot override higher layers.

---

## Override Rules

Overrides must be:
- Explicit
- Field-scoped
- Logged

### Allowed Overrides
- Visual emphasis
- Camera framing
- Momentary pacing
- Shot-level verbosity

### Forbidden Overrides
- Genre
- Core tone
- Narrative thesis
- Style locks

Violations are rejected or flagged.

---

## Invalidation Rules

| Change Occurs At | Invalidates |
|-----------------|------------|
| Global Intent   | All stages  |
| Narrative Stage | Downstream only |
| Scene Stage     | Media stages only |
| Media Stage     | Nothing |

Invalidation always triggers regeneration warnings.

---

## Style Capsule Application Contract

### Style Capsule Scope

Style Capsules must be explicitly scoped:
- Global-only
- Narrative-only
- Scene-only
- Combined (with inheritance)

### Application Guarantees
- Applied Style Capsules are logged
- Style Capsule versions are recorded
- Application consistency is traceable

---

## Prompt Assembly Contract

Prompt assembly follows a fixed pipeline:

1. Load system constraints
2. Load global intent prompt
3. Load narrative context
4. Load scene/character context
5. Apply local overrides
6. Inject selected Style Capsules
7. Freeze prompt snapshot

The final prompt is immutable.

---

## Traceability Requirements

Every generation must record:
- Stage ID
- Parent stage IDs
- Prompt versions
- Retrieved document IDs
- Override diffs

This data powers LangSmith traces.

---

## Failure Modes & Diagnostics

If output violates constraints:
1. Identify violating field
2. Trace upstream inheritance chain
3. Inspect retrieval relevance
4. Adjust prompt or override rules

No fixes occur at the media stage.

---

## Future Compatibility

This contract is designed to:
- Support migration to Temporal.io
- Support additional media providers
- Support alternative Style Capsule management systems

The inheritance rules remain invariant.

---

*This document defines the authoritative inheritance behavior of the system. All pipeline logic, prompts, and orchestration must conform to this contract.*

