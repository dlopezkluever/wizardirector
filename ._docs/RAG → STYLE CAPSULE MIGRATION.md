## **RAG → STYLE CAPSULE MIGRATION**

You are an expert technical documentation refactoring agent.

Your task is to **systematically revise all project documentation, architecture descriptions, system prompts, and UI/UX specifications** to **replace the existing RAG-based style system** with a new system called **Style Capsules**, while preserving the **intended user experience, workflow, and stage structure** as closely as possible.

This is a **conceptual and architectural substitution**, not a product redesign.

---

## **1\. Core Objective**

Replace **all mentions, assumptions, and dependencies** related to:

* RAG

* Vector databases

* Embeddings

* Retrieval pipelines

* Chunking / similarity search

* RAG selection logic

with a **Style Capsule system** that achieves the **same UX goals** (style selection, reuse, consistency) **without retrieval-augmented generation**.

The final documentation must **not reference RAG at all**, either directly or indirectly.

---

## **2\. Conceptual Replacement Model**

### **2.1 Style Capsules (Text / Writing)**

A **Style Capsule** is a **user- or system-defined stylistic reference package** that influences tone, prose, dialogue, and descriptive language.

A Style Capsule consists of some or all of the following:

* One or more **example text excerpts** (user-provided or preset)

* Optional **labels** describing what matters stylistically

* Optional **negative constraints** (what must not be imitated)

* Optional **high-level descriptors** (e.g., “minimalist,” “ornate,” “detached”)

Style Capsules are:

* Stored as **plain text \+ metadata**, not embeddings

* Injected **directly into system prompts**

* Fully transparent and deterministic

They guide **how content is written**, not **what content is written**.

---

### **2.2 Style Anchors (Visuals)**

For visuals, replace all RAG/vector-style logic with **Style Anchors**.

A Style Anchor may be one or more of the following:

* Descriptor strings (e.g., “high-contrast neon noir”)

* Structured “Design Pillars” (see below)

* Reference image URLs or uploaded images

* Generated example frames that are explicitly locked

No similarity search or vector matching is used.

---

## **3\. UX & Stage Parity (Critical)**

You must **preserve the existing UX flow and stage semantics** exactly where possible.

### **3.1 Stage 1 – Writing Style Selection (UNCHANGED UX INTENT)**

Previously:

* User selected a Written Style RAG

Now:

* User selects a **Writing Style Capsule**

The UI must still:

* Allow selection during **Stage 1**

* Offer **preset styles**

* Allow **user-created styles**

* Clearly mark selection as **optional**

* Persist selection as part of **Global Context**

Users must be able to:

* Choose from system presets

* Choose from their own saved Style Capsules

* Create a new Style Capsule inline or via a library

---

### **3.2 Stage 5 – Visual Style Selection (UNCHANGED UX INTENT)**

Previously:

* User selected a Visual Style RAG

Now:

* User selects a **Visual Style Capsule / Style Anchor**

The UI must still:

* Lock the visual style at Stage 5

* Treat it as a **Global Constraint**

* Apply it consistently to all downstream image/video generation

---

## **4\. Style Capsule Library (New, but UX-Compatible)**

Introduce a **Style Capsule Library** concept:

* A dedicated section/tab in the application (accessible from the sidebar)

* User-specific (private by default)

* Stores:

  * Writing Style Capsules

  * Visual Style Capsules / Anchors

* Capsules can be:

  * Created

  * Edited

  * Duplicated

  * Favorited

  * Deleted

*Replaces the Current (undeveloped) Sidebar tabs:

  *Written Style RAG

  *Visual Style RAG

System must also provide:

* A set of **preset Style Capsules** for common styles

* Presets are selectable but not editable (unless duplicated)

This library must integrate seamlessly with Stage 1 and Stage 5 selectors.

---

## **5\. Advanced Mode (Power Users)**

Where relevant, documentation should specify an **optional “Advanced Mode”** for Style Capsules.

Advanced Mode allows users to:

1. Paste example text or upload reference images

2. Explicitly label:

   * What aspects matter (e.g., sentence length, emotional distance, vocabulary)

3. Explicitly specify:

   * What must *not* be imitated

This mode increases controllability and must be reflected in:

* UI descriptions

* Prompt assembly logic

* System prompt templates

---

## **6\. Prompt Integration Rules (Critical)**

Every place where RAG retrieval was previously injected into prompts must now be replaced with **explicit Style Capsule injection**.

### **6.1 Writing Prompt Pattern**

Replace RAG references with language similar to:

“Imitate the following prose style. Maintain the sentence length, vocabulary level, pacing, and emotional distance demonstrated. Do not copy content or plot—only stylistic characteristics.”

Followed by:

* One or more example excerpts

* Optional constraints

* Optional negative instructions

This must be described consistently across:

* Stage 2

* Stage 3

* Stage 4

* Any other text-generation stages

---

### **6.2 Visual Prompt Pattern**

Replace visual RAG usage with:

* Style Anchors

* Design Pillars

* Reference images

Prompts should explicitly instruct models to:

* Adhere to selected design pillars

* Match reference imagery

* Maintain visual consistency across scenes

---

## **7\. Visual Design Pillars (Preferred Structure)**

For visuals, documentation should favor **Design Pillars** such as:

* Color Palette

* Mood / Emotional Tone

* Medium / Aesthetic

* Lighting Style

* Camera Language

Users may either:

* Select Design Pillars directly

* Or rely purely on reference images

* Or combine both

No vector similarity or retrieval is allowed.

---

## **8\. Backend & Architecture Guidance**

When refactoring backend descriptions:

* Remove:

  * Vector databases

  * Embedding pipelines

  * Similarity search services

* Replace with:

  * Structured Style Capsule storage (text \+ metadata)

  * Deterministic prompt assembly

  * Explicit context injection

Style Capsules must be treated as **Global Context constraints**, similar to how RAG selections were previously treated.

---

## **9\. Consistency & Terminology Rules**

* Use the term **“Style Capsule”** consistently for writing

* Use **“Visual Style Capsule”** or **“Style Anchor”** for visuals

* Do **not** use “RAG” or “vector” anywhere in final output

* Maintain existing stage numbers, names, and gating logic unless strictly necessary to change

---

## **10\. Output Expectation**

Your output must result in documentation that:

* Reads as if RAG was **never part of the system**

* Preserves the original UX intent

* Improves clarity and controllability

* Reduces architectural complexity

* Is internally consistent across all stages and agents

Make no assumptions beyond what is explicitly stated here.

---

If you want, next I can:

* Review the rewritten docs for conceptual consistency

* Help design the **exact Style Capsule JSON schema**

* Rewrite **specific system prompts** stage by stage using the new model

