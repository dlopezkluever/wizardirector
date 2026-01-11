# **User Flow**

This document defines the **end-to-end user journey** through the Narrative-to-AI-Film Pipeline web application. It is derived directly from `project-overview.md` and is intended to guide **project architecture, system boundaries, and core UI structure**, not detailed UI layout.

The focus is on **how users move through the pipeline**, how stages connect, where iteration occurs, and where gates or checkpoints exist.

---

## **1\. Entry Point: Project Dashboard**

**User lands on the Project Dashboard.**

Primary purposes at this stage:

* View existing projects and their progress  
* Resume work on an existing project  
* Start a new project using one of the supported narrative input modes

Key action:

* **Create New Project** → enters Phase A

Global tools (Style Capsule Library, Asset Library, Version History, Artifact Vault) are accessible from persistent navigation but are not required to proceed.

---

## **2\. Phase A: Global Narrative & Style Definition (Stages 1–5)**

Phase A is **linear and global**. Its output becomes the immutable foundation for all downstream work.

### **2.1 Stage 1: Narrative Input & Initialization**

**User intent:** Define the narrative starting point and global constraints.

User selects one input mode:

* Expansion  
* Condensation  
* Transformation  
* Script Skip

User provides:

* Primary narrative input  
* Optional context files  
* Global project parameters (length, genre, rating, tone)  
* Optional Written Style Capsule Choice

**Output:** Initialized narrative state

Proceeds directly to Stage 2\.

---

### **2.2 Stage 2: Treatment Generation (Iterative Prose)**

**User intent:** Explore and refine the story at a high level.

System generates multiple treatment variations.

User actions:

* Select a preferred variation  
* Manually edit prose  
* Regenerate specific passages  
* Regenerate the full treatment

Iteration is expected and lightweight.

**Checkpoint:** User accepts a treatment version.

Proceeds to Stage 3\.

---

### **2.3 Stage 3: Beat Sheet (Structural Lock)**

**User intent:** Define the narrative structure.

System converts the treatment into discrete beats.

User actions:

* Edit beat text  
* Reorder beats  
* Add or remove beats  
* Brainstorm alternatives

Iteration is expected and encouraged.

**Critical Gate:**

* User must **Confirm Beat Sheet** to proceed.  
* This is the primary structural lock for the project.

Proceeds to Stage 4\.

---

### **2.4 Stage 4: Descriptive Master Script**

**User intent:** Produce the authoritative narrative blueprint.

System generates a fully formatted, visually verbose film script aligned to the beat sheet.

User actions:

* Manually edit dialogue and action  
* Perform targeted regenerations  
* Regenerate the full script (high impact)

Iteration is possible but increasingly costly downstream.

**Checkpoint:**

* User **Approves Master Script**.

This approval freezes the narrative for Phase B.

---

### **2.5 Stage 5: Global Asset Definition & Style Lock**

**User intent:** Define the global visual truth.

System extracts:

* Characters  
* Props  
* Settings

User actions:

* Select a Visual Style Capsule / Style Anchor  
* Edit asset descriptions  
* Generate and refine image keys for each asset  
* Lock each master asset

**Critical Gate:**

* All required assets must be locked.

**Output of Phase A:**

* Locked narrative  
* Locked global assets  
* Locked visual style

User enters Phase B.

---

## **3\. Phase B: Production Engine (Stages 6–12)**

Phase B operates **scene by scene**.

The user repeatedly cycles through Stages 6–12 for each scene in the project.

---

## **4\. Scene Cycle: Standard Flow (Single Scene Example)**

### **4.1 Stage 6: Script Hub & Scene Selection**

**User intent:** Choose which scene to produce.

User views:

* Scene list  
* Completion status  
* Continuity warnings

User selects a scene and enters its production pipeline.

---

### **4.2 Stage 7: Technical Shot List**

**User intent:** Define exactly what happens in the scene.

System breaks the scene into timed shots.

User actions:

* Edit shot fields (dialogue, action, camera, characters)  
* Split or merge shots  
* Iterate until satisfied

Rearview context from the prior scene is visible.

**Gate:**

* User locks the shot list.

---

### **4.3 Stage 8: Visual & Character Definition (Scene Start State)**

**User intent:** Define how the scene begins visually.

User actions:

* Inherit assets from prior scenes  
* Modify scene-specific visual states  
* Generate scene-level image keys

This stage defines **starting appearance only**.

---

### **4.4 Stage 9: Prompt Segmentation**

**User intent:** Inspect and finalize model inputs.

System assembles:

* Frame prompts  
* Video prompts

User may make minor textual edits.

No generation occurs yet.

---

### **4.5 Stage 10: Frame Generation (Anchors)**

**User intent:** Lock visual continuity.

User selects generation mode (speed vs cost).

System generates start (and optional end) frames per shot.

User actions:

* Review frames  
* Perform localized fixes  
* Regenerate as needed

Frames are approved shot by shot.

---

### **4.6 Stage 11: Confirmation & Cost Check**

**User intent:** Validate before expensive compute.

System presents:

* All shots  
* All frames  
* Final prompts  
* Estimated credit cost

This is a **checkpoint**, not an iteration stage.

User confirms to proceed.

---

### **4.7 Stage 12: Video Generation & Review**

**User intent:** Evaluate final output.

System generates video clips and assembles the scene.

User outcomes:

* Accept scene → return to Script Hub  
* Identify issues → routed back to the appropriate upstream stage

---

## **5\. Iteration Example: Downstream Correction**

**Scenario:**

* User completes Scene 3  
* Notices dialogue timing issues during Stage 12 review

**Flow:**

* User selects "Return to Shot List"  
* Revisits Stage 7 for Scene 3  
* Makes targeted edits  
* Proceeds again through Stages 8–12

Downstream scenes are flagged as potentially outdated but not blocked.

---

## **6\. Repeating the Scene Cycle**

The **Scene Cycle (Stages 6–12)** repeats for each scene in the project.

Users may:

* Work scenes sequentially  
* Skip ahead  
* Return to earlier scenes  
* Branch when making high-impact changes

---

## **7\. Export & Project Wrap (TBD)**

**User intent:** Transition output to external workflows.

At project completion, the user reaches an export phase.

Expected outcomes include:

* Downloadable video assets  
* Structured project artifacts  
* Formats suitable for external editing or delivery

Exact export mechanics are intentionally left flexible.

---

## **8\. Summary Flow (Condensed)**

1. Project Dashboard  
2. Phase A (Stages 1–5): Define and lock narrative and assets  
3. Phase B (Stages 6–12): Produce scenes iteratively  
4. Review, iterate, and branch as needed  
5. Export final outputs

This flow represents the **intended user journey** through the application without UI embellishment or speculative behavior.

