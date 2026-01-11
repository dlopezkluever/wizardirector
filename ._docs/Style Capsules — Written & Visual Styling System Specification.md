# **Style Capsules — Written & Visual Styling System Specification**

## **Document Purpose**

This document defines the **Written and Visual Style Capsule system** used by the application. It is intended for engineers, product designers, and AI systems engineers who need a precise, implementation-ready understanding of how style is represented, stored, selected, injected into prompts, and enforced across the narrative and production pipeline.

This system **replaces all prior RAG / vector-based style mechanisms** while preserving the same UX intent, stage flow, and creative control.

Style Capsules influence **how outputs are expressed**, not **what content is created**.

---

## **1\. High-Level Concept**

### **1.1 What Is a Style Capsule?**

A **Style Capsule** is a deterministic, human-readable style reference package that guides the expressive qualities of AI-generated outputs.

There are two parallel types:

* **Written Style Capsules** — control prose, dialogue, tone, pacing, and descriptive voice  
* **Visual Style Capsules** — control aesthetic, mood, color, composition, and visual language

Style Capsules:

* Contain **explicit examples and constraints**  
* Are **directly injected into prompts**  
* Are **transparent, editable, and auditable**  
* Do **not** rely on embeddings, similarity search, or retrieval

---

## **2\. Core Design Principles**

1. **Determinism over inference**  
   The system must never infer style implicitly from large corpora. All stylistic influence is explicitly provided.  
2. **User legibility**  
   Users can always see and understand *why* the AI produced a certain style.  
3. **UX parity with prior RAG design**  
   The same stages, selectors, and workflow are preserved.  
4. **Separation of concerns**  
   Style Capsules affect expression only. Narrative facts, plot, and continuity come from other systems.  
5. **Composable and extensible**  
   Capsules can be simple or advanced without changing system architecture.

---

## **3\. Written Style Capsules**

### **3.1 Purpose**

Written Style Capsules control:

* Sentence length and rhythm  
* Vocabulary complexity  
* Dialogue cadence  
* Emotional distance  
* Descriptive density  
* Overall narrative voice

They are used heavily in:

* Stage 2 — Treatment Generation  
* Stage 3 — Beat Expansion & Rewrites  
* Stage 4 — Master Script Generation  
* Any targeted regeneration involving prose

---

### **3.2 Written Style Capsule Structure**

A Written Style Capsule consists of the following components:

#### **A. Example Text Excerpts (Required)**

* One or more short prose excerpts (typically 1–3 paragraphs each)  
* Provided by the user or system presets  
* Serve as *style demonstrations*, not content references

#### **B. Style Labels (Optional)**

Human-readable tags describing what matters stylistically, e.g.:

* “Minimalist dialogue”  
* “Detached, observational tone”  
* “Fast-paced, clipped sentences”

#### **C. Negative Constraints (Optional)**

Explicit instructions for what must **not** be imitated, e.g.:

* “Do not use humor”  
* “Avoid metaphor-heavy language”  
* “No internal monologue”

#### **D. Freeform Notes (Optional)**

Additional clarifications for edge cases or intent.

---

### **3.3 Prompt Injection Rules (Written)**

Whenever a Written Style Capsule is active, system prompts must include a section similar to:

Imitate the following prose style. Maintain the sentence length, vocabulary level, pacing, and emotional distance demonstrated below. Do not copy content, plot, or characters—only stylistic characteristics.

This is followed by:

* The example excerpts  
* Explicit labels  
* Negative constraints

This injection occurs **before** the task-specific instructions.

---

### **3.4 Advanced Mode (Writing)**

Advanced Mode allows power users to:

1. Paste or upload multiple examples  
2. Explicitly annotate what aspects matter (e.g., syntax vs tone)  
3. Explicitly specify what must not be copied

Advanced Mode does **not** change the underlying architecture—only the richness of prompt context.

---

## **4\. Visual Style Capsules (Style Anchors)**

### **4.1 Purpose**

Visual Style Capsules (also called **Style Anchors**) control:

* Color palette  
* Mood and emotional tone  
* Medium (photorealistic, painterly, animated, etc.)  
* Lighting style  
* Visual consistency across frames and scenes

They are locked at **Stage 5** and applied globally to:

* Asset Image Keys  
* Frame Anchors  
* Video generation prompts

---

### **4.2 Visual Style Capsule Structure**

Visual Style Capsules may include any combination of the following:

#### **A. Design Pillars (Structured)**

A set of explicit stylistic dimensions, such as:

* Color Palette: Neons / Muted / Monochrome  
* Mood: Melancholic / Energetic / Ominous  
* Medium: Oil Painting / Film Grain / Hyperrealistic  
* Lighting: High-contrast / Soft / Naturalistic  
* Camera Language: Static / Handheld / Cinematic

#### **B. Reference Images**

* Uploaded images or URLs  
* May include generated example frames  
* Treated as *authoritative visual anchors*

#### **C. Descriptor Strings**

Freeform descriptors used when pillars are unnecessary or too rigid.

---

### **4.3 Prompt Injection Rules (Visual)**

Visual prompts must:

* Explicitly list Design Pillars (if present)  
* Reference image anchors directly  
* Instruct the model to maintain consistency across shots

No similarity matching, embedding lookup, or retrieval logic is permitted.

---

## **5\. Style Capsule Library**

### **5.1 Overview**

The application includes a **Style Capsule Library**, accessible as a dedicated section/tab.

The library stores:

* Written Style Capsules  
* Visual Style Capsules

Capsules are **user-scoped** by default.

---

### **5.2 Preset Capsules**

The system provides a curated set of **preset Style Capsules**, representing common stylistic choices.

Preset capsules:

* Are selectable in Stage 1 (writing) and Stage 5 (visual)  
* Are read-only  
* Can be duplicated into user-editable copies

---

### **5.3 User-Created Capsules**

Users may:

* Create new capsules  
* Edit existing ones  
* Favorite frequently used capsules  
* Delete unused capsules

These capsules appear alongside presets in all relevant selectors.

---

## **6\. Stage Integration Summary**

| Stage | Style Capability |
| ----- | ----- |
| Stage 1 | Select Written Style Capsule (optional) |
| Stage 2–4 | Written Capsule injected into prose generation |
| Stage 5 | Select & lock Visual Style Capsule |
| Stage 6–12 | Visual Capsule enforced across all visual outputs |

---

## **7\. Backend & Data Model Notes**

* Style Capsules are stored as structured text \+ metadata (e.g., JSON)  
* No embeddings, vectors, or retrieval services are used  
* Capsules are treated as **Global Context Constraints**  
* Prompt assembly is deterministic and auditable

---

## **8\. Key Differences from RAG (For Engineers)**

| Aspect | RAG | Style Capsules |
| ----- | ----- | ----- |
| Storage | Vector DB | Plain structured data |
| Control | Implicit | Explicit |
| Debuggability | Low | High |
| Cost | Ongoing compute | Minimal |
| UX Transparency | Opaque | Clear |

---

## **9\. Summary**

The Style Capsule system provides:

* Higher controllability than RAG  
* Lower operational and developer cost  
* Clearer mental models for users  
* Deterministic, explainable behavior

It preserves the original UX intent while simplifying architecture and improving creative precision.

