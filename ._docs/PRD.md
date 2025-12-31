# **Product Requirements Document (PRD)**

## **Narrative-to-AI-Film Pipeline Web Application**

**Version:** 4.0 (Definitive Technical Specification)

**Document Status:** Approved for Engineering \- HIGH PRIORITY

**Core Architecture:** 12-Stage "Global-to-Local" Pipeline with Full Iterative Control

## **Table of Contents**

1. **Executive Summary & Core Utility** \* 1.1 Core Value Proposition  
   * 1.2 Core Problem & Solution (The Inversion)  
2. **System Architecture & Data Strategy** \* 2.1 Context Management Strategy (Global vs. Local)  
   * 2.2 RAG Vector Databases (Written and Visual Styles)  
   * 2.3 Stateful Asset Management (Inheritance Logic)  
3. **Phase A: The Global Narrative & Style Engine (Stages 1–5)**  
   * 3.1 Stage 1: Input Modes & RAG Initialization  
   * 3.2 Stage 2: Treatment Generation (Iterative Prose)  
   * 3.3 Stage 3: The Beat Sheet (Structural Anchor & Loop)  
   * 3.4 Stage 4: The Descriptive Master Script (Finalized Narrative)  
   * 3.5 Stage 5: Global Asset Definition & Style Lock   
4. **Phase B: The Production Engine (Stages 6–12)**  
   * 4.1 Stage 6: The "Script Hub" & Scene Cycle  
   * 4.2 Stage 7: The Technical Shot List (Granular Breakdown & Control)  
   * 4.3 Stage 8: Visual & Character Definition (Asset Assembly)  
   * 4.4 Stage 9: Prompt Segmentation (The Merger and Formatting)  
   * 4.5 Stage 10: Frame Generation (The Anchors & Continuity)  
   * 4.6 Stage 11: Confirmation & Gatekeeping (The Credit Check)  
   * 4.7 Stage 12: Video Generation, Review & Iteration Loop  
5. **UI/UX Functional Requirements (COMPREHENSIVE)** \* 5.1 Global Application Navigation  
   * 5.2 The In-Project UI (Pipeline Workflow)  
   * 5.3 Context & Feedback Tools (Rearview Mirror & Guidance)  
6. **Technical Constraints & API Requirements** \* 6.1 API Integration Requirements (Veo3, Nano Banana)  
   * 6.2 Latency and Context Window Management  
   * 6.3 Data Persistence and Version Control (Corrected)  
7. **Versioning and Invalidation Logic (GIT-STYLE BRANCHING)** \* 7.1 Core Branching Philosophy  
   * 7.2 Mandatory & Optional Branching Rules  
   * 7.3 The Invalidation Rules (The Cost of Change)  
   * 7.4 The Artifact Vault (In-Project Repository)  
8. **Phase A: UI/UX & Agentic Tooling Definitions (Stages 1-5)** \* 8.1 Stage 1  
   * 8.2 Stage 2  
   * 8.3 Stage 3  
   * 8.4 Stage 4  
   * 8.5 Stage 5  
9. **Phase B: UI/UX & Agentic Tooling Definitions (Stages 6-12)** \* 9.1 Stage 6  
   * 9.2 Stage 7  
   * 9.3 Stage 8  
   * 9.4 Stage 9  
   * 9.5 Stage 10  
   * 9.6 Stage 11  
   * 9.7 Stage 12  
10. **Project Wrap & Export**
11. **Additional Considerations**
12. **Stretch Goals**


## **1\. Executive Summary & Core Utility**

### **1.1 Core Value Proposition**

The web application automates the transformation of written narratives into AI-generated short films through a strictly deterministic, cost-efficient, multi-stage workflow.

**Primary Utility:** **Story Consolidation and Management.** The largest engineering effort must be focused on the stability and iterative control of the narrative structure and visual style (Stages 1-5). The generation of video (Stages 10-12) is a result of the deterministic process, not the product's core feature.

**Target User:** Independent filmmakers, content creators, and marketing teams needing high-quality, stylistically consistent video prototypes or final products quickly and affordably.

### **1.2 Core Problem & Solution (The Inversion)**

**Problem:** Current AI video generation tools are non-deterministic, expensive, and fail at narrative continuity (inconsistent characters, jump cuts, scene-to-scene drift). They operate like a "slot machine" where the user pays for high-volume, low-quality options.

**Solution (The Inversion):**

1. **Plan:** The story is locked using the Beat Sheet (Stage 3).  
2. **Anchor:** The visual boundaries (Start Frame / End Frame) of every 8-second shot are locked using a cheaper image model (Stage 10).  
3. **Generate:** Expensive video compute (Veo3) is used only once, to generate the bridge content between two approved anchor frames. This process guarantees deterministic consistency and cost optimization.

## **2\. System Architecture & Data Strategy**

### **2.1 Context Management Strategy (Global vs. Local)**

To prevent Large Language Model (LLM) hallucinations, token limit overflows, and generation drift, the system must strictly divide data into two context scopes, managed by a Context Manager Service:

| Context Type | Data Contained | LLM Access | Purpose |
| ----- | ----- | ----- | ----- |
| **Global Context** | Beat Sheet, Project Summary, Master Character Descriptions, Style RAG Selections. | Always (Phase A & B) | Maintains plot cohesion and stylistic tone across the entire project. |
| **Local Context** | Current Scene Script (Stage 4), Current Shot List (Stage 7), **Previous Scene End-State** (Assets, Final Frame). | Only during the active Scene's lifecycle (Phase B). | Prevents token overflow; ensures continuity between Scene N and Scene N+1. |

### **2.2 RAG Vector Databases (Written and Visual Styles)**

The application must allow users to upload and utilize custom Retrieval-Augmented Generation (RAG) vector databases to guide creative output.

* **Written Style Vector DB:**  
  * **Data:** Stores text chunks from user-uploaded scripts, books, or writing samples.  
  * **Application:** Used heavily in Stages 1, 2, 3, 4, 7 and 9 to dictate tone, vocabulary, dialogue delivery, and descriptive style (e.g., "Tarantino-esque dialogue," "Hemingway brevity").  
* **Visual Style Vector DB:**  
  * **Data:** Stores image embeddings/references of specific aesthetics (e.g., high-contrast black and white, specific anime artist, film grain presets).  
  * **Application:** Primarily used in Stages 5, 8, and 10 (Asset and Frame Generation) to ensure the visual output adheres to the chosen aesthetic.

### **2.3 Stateful Asset Management (Inheritance Logic)**

Assets (Characters, Props, Wardrobe) must retain their state across scenes to ensure visual consistency.

1. **Master Asset Definition:** In Scene 1, the user defines the **Master Asset** (e.g., "John Doe, 30s, clean shirt").  
2. **Inheritance Rule:** When moving to **Scene N+1**, the system defaults to the **final state** of the asset from **Scene N**.  
3. **Stateful Editing:** In Stage 8, the user can modify the inherited asset for the *current* scene only (e.g., add mud to the coat, change hairstyle). This saves a new instance: "John Doe (Scene N+1 \- Muddy)." 
4. **Status Metadata Tags:** Assets include a metadata layer for "Conditions" (e.g., "Wet," "Bloody," "Torn Wardrobe"). These tags are generated in Phase B based on shot outcomes and can be toggled to persist across scene boundaries. 
5. **Database Storage:** The system must track and store these scene-specific asset instances, which are automatically pulled into the Local Context for the current scene.

## **3\. Phase A: The Global Narrative Engine (Linear Flow)**

Note: Advanced detail for UI & Agentic Toolage & Iterative Design for each stage in Section 8

### **3.1 Stage 1: Input Modes & RAG Initialization**

The user **MUST** select one of the four modes to initialize the narrative pipeline. The chosen mode defines the initial state of the story structure.

| Mode | User Input | AI Action | Purpose |
| ----- | ----- | ----- | ----- |
| **A: Expansion** | 1–3 Paragraphs (Idea Kernel) | Expands to a full 3-Act treatment. | Ideation and Blank Page Solution. |
| **B: Condensation** | Large Text Upload (100+ pages) | Summarizes and trims to a core cinematic narrative. | Adaptation and Token Optimization. |
| **C: Transformation** | Source Text \+ "Twist" Parameter | Rewrites narrative based on style parameters (e.g., "Hamlet in Space"). | Stylistic Adaptation and Parody. |
| **D: Script Skip** | Formatted Screenplay Upload | Parses directly into the Stage 4 Master Script format. | Streamlining for prepared users. |

### **3.2 Stage 2: Treatment Generation (Iterative Prose)**

**Input:** Processed text from Stage 1 \+ Selected Written Style RAG. **Output:** High-level, continuous prose story treatment (not yet segmented into scenes or beats).

**Iterative and Interactive Requirements:**

* **Variation Selection:** AI generates **3 distinct prose treatments** (e.g., different tones, different endings, differing chronology). The user must select one to proceed.  
* **Targeted Regeneration:** The user can **highlight any sentence or paragraph (or multiple paragraphs)** in the active treatment and right-click to trigger a context-specific regeneration.  
  * *Prompt:* "Make this sentence less formal." or "Inject more conflict into this section."  
  * The system uses the surrounding text as context to rewrite only the highlighted section.  
* **Manual Editability:** The treatment must be fully editable via a rich text editor interface. Any manual edits immediately override the AI's generated text and are locked for the next stage.  
* **Full Regeneration:** Requires input in the "Regeneration Guidance" box (Section 5.3).

### **3.3 Stage 3: The Beat Sheet (Structural Anchor & Loop)**

**Input:** Locked Treatment from Stage 2\. **Output:** A numbered list of "Beats" (major plot points that define the narrative skeleton).

**Iterative and Interactive Requirements:**

* **Atomization:** AI breaks the treatment into 15-30 discrete narrative beats.  
* **Drag-and-Drop Reordering:** Users must be able to visually reorder beats to experiment with chronology. Moving a beat instantly updates its position and number.  
* **Beat Editing:** Each beat must be an editable text field.  
* **AI Brainstorm/Expansion:** A button associated with each beat must allow the user to explore alternatives.  
  * *Example:* "Brainstorm 3 alternative resolutions for Beat 10."  
  * *Example:* "Expand Beat 5 into two more detailed sub-beats."  
* **Targeted Regeneration, Manual Editability, Full Regeneration;** Similar to Stage 2, with use of  "Regeneration Guidance" box (Section 5.3).  
* **Gatekeeper:** The system **MUST** prevent progress to Stage 4 until the Beat Sheet is confirmed. This is the **most critical structural lock** in the entire process.  
* **Decoupling Logic:** Once the Master Script (Stage 4\) has been generated and approved, subsequent manual edits to the **Master Script** **DO NOT** trigger an automatic retroactive edit or invalidation of the Beat Sheet. Instead, the Beat Sheet UI must display a non-blocking/ passive flag: **"Not Up-to-Date with Current Script."** (With a manual "Sync" button available when the user returns to beat sheet)

### **3.4 Stage 4: The Descriptive Master Script (Finalized Narrative)** 

**Input:** Locked Beat Sheet (Stage 3\) \+ Written Style RAG. **Output:** The fully formatted **Traditional Film Script** (Dialogue, Action Lines, Scene Headings) for the entire project.

**Functional Requirements:**

* **Vivid Visual Blueprint (NEW):** The LLM is explicitly instructed to maximize descriptive text regarding Characters, Settings, Props, Action, and other Mis-en-scène for explicit visual translation. The script must be a **visually verbose blueprint**, not a concise theatrical script.  
* **Consistency Check:** The AI must ensure all dialogue and action generated aligns with the emotional and structural goals of the Beats.  
* **Format Integrity:** The output must use industry-standard script format (ALL CAPS for Scene Headings, Character Names, and SFX).  
* **Purpose:** This script serves as the **Global Narrative Truth**. It defines *what* happens in the entire film and is the source document for **Stage 6**.  
* **Final Approval:** User clicks "Approve Master Script." This document is frozen and serves as the single source of truth for Phase B.  
* **Targeted Regeneration, Manual Editability, Full Regeneration;** Similar functionality to Stage 2 & 3, with use of  "Regeneration Guidance" box (Section 5.3).  
* **Branching Trigger:** If the user initiates a **Regeneration of the Master Script** from an edited Beat Sheet, the **Mandatory Branching Rule** (Section 7.2) is triggered.

### **3.5 Stage 5: Global Asset Definition & Style Lock (NEW)**

**Input:** Locked Master Script (Stage 4). **Output:** A set of finalized **Master Assets** (Visual Keys) and the locked **Visual Style RAG**.

**Functional Requirements:**

* **Asset Extraction:** The system uses an LLM to automatically parse the Stage 4 script and deterministically extract all unique **Key Characters**, **Key Props**, and **Key Settings** mentioned.  
* **Visual Style Lock:** The user selects the definitive **Visual Style Vector DB** (e.g., "Neo-Noir," "Pixar Animation"). This choice is locked as a **Global Context Constraint** for all subsequent image/video generation calls.  
* **Image Key Generation:** For each extracted asset, the user guides the Nano Banana API to generate a definitive **Master Asset Visual Key (Image)**, utilizing the locked Visual Style.  
* **Gatekeeper:** All extracted **Master Assets** must have a locked **Image Key** before the user can proceed.

## **4\. Phase B: The Production Engine (Scene-by-Scene Cycle) (Stages 6-12)**

Note: Advanced detail for UI & Agentic Toolage & Iterative Design for each stage in Section 9

### **4.1 Stage 6: The "Script Hub" & Scene Cycle**

* **Hub UI:** A visual list of all scenes in the Master Script (Stage 4).  
* **Status Indicators:** Each scene must display its current status (Draft, Shot List Ready, Frames Locked, Video Complete, **Outdated/Continuity Broken**).  
* **Workflow:** The user selects a scene, completes the subsequent stages (**7-12**), and is returned to the Hub.

### **4.2 Stage 7: The Technical Shot List (Granular Breakdown & Control)**

**Input:** Master Script for the active scene \+ Local Context (Previous Scene End-State). **Output:** The scene broken down into a tabular list of 8-second shots. This is the **most critical control point for the video production**.

**Data Fields (Per 8-Second Shot \- MANDATORY):**

1. **Shot ID:** (e.g., 3A, 3B, 3C)  
2. **Dialogue:** Exact lines spoken in this 8s segment.  
3. **Action:** Specific physical movements (e.g., "John stands up, knocking the chair over").  
4. **Characters:** Who is visible and their prominence (e.g., "John (Foreground, Profile), Mary (Background, blurry)").  
5. **Setting:** Specific background details and lighting (e.g., "Kitchen counter, single bare lightbulb").  
6. **Camera:** Technical specifications (e.g., "Close Up (CU)," "Dolly In (Slow)," "High Angle").

**Iterative and Interactive Requirements:**

* **Shot Splitting/Merging:** User must be able to select a shot and click "Split," which uses the LLM to intelligently break the 8-second action into two new, coherent shots (e.g., 3B and 3C).  
* **Field Editing:** Every field in the table is directly editable by the user. Editing one field (e.g., changing "Wide Shot" to "Close Up") triggers a dynamic, near-instantaneous regeneration of the related **Dialogue/Action** fields to ensure coherence.  
* **Rearview Mirror Integration:** The **Rearview Mirror UI (Section 5.3)** must be visible here, displaying the final action/dialogue of the previous scene to ensure seamless hand-off.  
* **Gatekeeper:** User must lock the Shot List before proceeding to asset selection.

### **4.3 Stage 8: Visual & Character Definition (Asset Assembly)**

**Input:** Locked Shot List (Stage 7\) \+ Visual Style RAG. **Output:** A list of visual descriptions for all characters and settings in the current scene.

**Functional Requirements:**

* **Asset Drawer Integration:** The **Asset Drawer UI (Section 5.3)** is the primary input tool. Users drag "Master" or "Scene N Instance" assets into the current scene's list.  
* **Stateful Modification:** A dedicated text field must allow modification of the inherited state, generating a new, unique **Scene Instance** description. (e.g., Original: "Clean shirt." Modification: "Shirt is now ripped and bloody."). This modification must be saved back to the Asset Library history.  
* **Style Lock:** User confirms the **Visual Style Vector DB** selection for the scene (e.g., "Switching from Anime to Photorealistic"). This RAG selection will be critical for **Stage 8**.

### **4.4 Stage 9: Prompt Segmentation (The Merger and Formatting)**

**Input:** Shot List Data (Stage 7\) \+ Asset Data (Stage 8). **Output:** The final, concatenated, formatted prompt string sent to the video and image generation APIs.

**Process:** The system automatically synthesizes the final prompt by merging the data streams:

* **Visual Elements (Image Gen Prompt):** Combines Camera, Characters, Action, and Setting with the selected Visual Style RAG.  
* **Audio Elements (Veo3 Prompt):** Isolates Dialogue and adds SFX cues.

**Veo3 Prompt Formatting Requirements (MANDATORY):**

The prompt structure must adhere to the LLM's preferred format for generating video with integrated audio:

* **Visual Section:** `[Camera]`  
   $$Character$$$$Action$$  
  . Style: \[Visual Style `Tag]`  
* **Audio Section:** `Audio: [SFX Cues]. Character [Name] speaks: "[Dialogue Line]"`

**Iterative Tool:** Users must have a final, direct text editor view of the **full, final prompt string**. They can manually tweak keywords (e.g., changing "dimly lit" to "harsh fluorescent lighting") before proceeding.

### **4.5 Stage 10: Frame Generation (The Anchors & Continuity)**

**Input:** Final Prompts (Stage 9\) \+ Rearview Mirror Data (Previous Scene's End Frame). **Tool:** Nano Banana API (or similar image generation model). **Process:** Generates two anchor frames per 8-second shot.

1. **Start Frame Generation:** Must use the Prompt AND the previous shot's End Frame (from the Rearview Mirror) as a visual seed/reference to ensure continuity. (Though the shot maybe totally different than the last clip)  
2. **End Frame Generation:** Uses the Prompt and predicts the visual outcome 8 seconds later.
(*Note: Some AI Gen systems don't require an End Frame, so as mention in Section 9, there must be a way to switch to only needing the starting frame.*)

**Critical Continuity Requirements:**

* **Rearview Mirror (Visual):** The UI must prominently display the **Final Frame** of the prior shot for visual comparison against the new **Start Frame**.  
* **Inpainting/Region Editing:** If the Start Frame does not match the prior End Frame, the user can select a region (e.g., the character's face) and use a localized text prompt (e.g., "Change expression from surprise to neutral") to fix the continuity break without regenerating the entire image.  
* **Iterative Refinement:** Full regeneration of a frame is possible but requires the "Regeneration Guidance" box (Section 5.3).

### **4.6 Stage 11: Confirmation & Gatekeeping (The Credit Check)**

**Function:** This stage serves as the final **economic gatekeeper** before the expensive Veo3 generation.

* **Display:** A "Checkout" review screen summarizing the scene:  
  * List of all shots (3A, 3B, 3C...).  
  * Image pair (Start Frame / End Frame) for each shot.  
  * Final synthesized prompt for each shot.  
  * Calculated **Total Credit Cost** for the scene's video generation.  
* **Action:** User clicks "Confirm & Render." This queues the job for Stage 10\. No further manual edits are possible past this point.

### **4.7 Stage 12: Video Generation, Review & Iteration Loop**

**Tool:** Google Veo3 API (Video \+ Audio generation). **Process:** Submits the confirmed Start Frame, End Frame, and formatted prompt to Veo3.

**Review and Error Handling:**

* **Video Playback:** User views the full scene, cut together from the individual 8-second clips.  
* **Issue Resolution:** The user can select one of three iterative paths:  
  1. **SUCCESS:** "Complete Scene." Returns to the Script Hub.  
  2. **VISUAL ISSUE (Minor):** "Return to Stage 8 (Frames)." Requires regeneration of the anchor frames, meaning the video will be re-queued and credits charged again.  
  3. **NARRATIVE/AUDIO ISSUE (Major):** "Return to Stage 7 (Shot List)." Requires deep structural changes, potentially leading to a cascade of changes in Stages 8, 9, and 10\.

## **5\. Base UI/UX Functional Requirements** 

This section details the explicit structure and functionality of the application's user interface.

### **5.1 Global Application Navigation**

The system separates project work from global resource management.

* **The Projects Dashboard (Default Landing Page):** The user lands here immediately post-login. Project cards display the **Branch Status** and **Progress Meter**. A prominent **"+ New Project"** button initiates the workflow.  
* **The Global Sidebar (Persistent Navigation):** The left-hand sidebar provides persistent access to global data and configuration tools:  
  1. **Home (Projects):** Returns to the Project Dashboard.  
  2. **Written Style RAG:** Management interface for the written vector database.  
  3. **Visual Style RAG:** Management interface for the visual vector database.  
  4. **Asset Library:** Global repository for defining and managing **Master Assets** (Characters, Props, Locations) independent of any specific project. Note: Important Integration: The Asset Library now accepts "Promoted" assets from individual projects, making them available as templates for new projects.

### **5.2 The In-Project UI (Pipeline Workflow)**

Upon selecting a project, the view transitions to a dedicated workflow.

* **Phase A Timeline (Stages 1-4):** A persistent horizontal bar at the top of the screen visualizes the linear progression. Each node displays a status light (Grey: Unstarted, Green: Locked). The **Beat Sheet (Stage 3\)** node visibly displays the **"Not Up-to-Date" Flag** if Stage 4 has been edited manually.  
* **Project Header Control Panel (Top Right \- MANDATORY):** A critical set of three buttons must be prominently displayed in the top-right corner of the in-project screen:  
  1. **Artifact Vault** (Icon: Archive/Safe): Opens a comprehensive modal or sidebar view containing every generated asset (Scripts, Shot Lists, Frames, Videos, Prompts) associated with *this specific project*, organized by **Branch** and **Scene** (see Section 7.4). Note: Designated Assets can be "promoted" to the global "Asset Library" from this "Artifact Vault".
  2. **Version History** (Icon: Branching Tree): Opens the **Version History Modal** (see Section 7.4) displaying the visual tree of all branches and allowing users to load an alternative branch/version.  
  3. **Create New Branch** (Icon: Fork): A direct action button that instantly creates a new working branch off the current project state (see Section 7.2).  
* **The Script Hub (Scene Listing):** Occupies the left side of the Phase B workspace, listing scenes with their status (Complete, Outdated, In Progress).  
* **The Scene Workflow Sidebar (Stage 6-12):** A vertical navigation rail that appears when a scene is selected, allowing granular movement through the production stages for that specific scene.

### **5.3 Context & Feedback Tools**

These tools manage continuity and iteration.

* **The "Rearview Mirror" (Continuity Context UI):** A stateful, collapsible component positioned at the top of the viewport in Phase B stages (7-9). It dynamically displays the **End State** of the previous scene (Text in Stage 7; Final Frame in Stage 9\) to ensure continuity.  
* **The "Asset Drawer" (Inheritance and Management UI):** A dynamic right-hand sidebar component, active only in Stage 8, managing **Master Asset** inheritance and **Scene Instance** creation.  
* **Regeneration Guidance ("The Why" Box):** Any regeneration action (in Stages 2, 3, 4, 5, or 8\) **MUST** be blocked until the user provides a minimum of 10 characters of guidance. This text is saved as the **"Commit Message"** for that state.

## **6\. Technical Constraints & API Requirements**

### **6.1 API Integration Requirements (Veo3, Nano Banana)**

* **Nano Banana (Image Generation):** Must be used exclusively for the high-volume, low-cost frame anchoring (Start/End Frames in Stage 10). Must support region-based inpainting for continuity fixes.  
* **Google Veo3 (Video Generation):** Must be used exclusively for the final, high-cost video generation (Stage 12). Must support the input of two distinct anchor frames and a combined video/audio prompt string.

### **6.2 Latency and Context Window Management**

* **Target Latency:**  
  * Phase A (LLM Text Generation): \< 5 seconds per iteration/regeneration.  
  * Stage 10 (Nano Banana Frame Gen): \< 15 seconds per frame pair.  
  * Stage 12 (Veo3 Video Gen): Requires background processing with email/notification alerts on completion.  
* **Context Optimization:** All code must adhere to the **Global vs. Local Context** strategy (Section 2.1). No API call in Phase B should include the Master Scripts of non-active scenes.

### **6.3 Data Persistence and Version Control (Corrected)**

* **Real-time Saving:** The application must utilize a Firestore database to save project state after every critical user action.  
* **Branching System (Correction):** The old requirement for a fixed "5 previous states" is deprecated. All versioning will be managed by the **Git-Style Branching System** detailed in **Section 7**. This allows for non-linear, branching history persistence.

## **7\. Versioning and Invalidation Logic: "Story Timelines" (GIT-STYLE BRANCHING)**

This section details the formal rules governing the creation and management of project branches, ensuring stability and auditability. 

Use the term "Story Timelines" for this system.

### **7.1 Core Branching Philosophy**

The system differentiates between **Main** (the linear, approved timeline) and **Feature/Experimental** branches (alternate structural realities). This is crucial for isolating high-cost work (Stage 10 videos) from destructive, early-stage narrative pivots.

### **7.2 Mandatory & Optional Branching Rules**

| User Action | Branching Required? | System Behavior |
| ----- | ----- | ----- |
| **Regenerate Master Script (Stage 4\) from an Edited Beat Sheet (Stage 3\)** | **YES (Mandatory).** | The system automatically forces the creation of a new, named branch before regenerating the script on that new branch. This preserves the previous, completed timeline. |
| **Manual Edit to Beat Sheet (Stage 3\)** | **No.** | The edit is saved to the current branch. The Beat Sheet is flagged **"Not Up-to-Date with Current Script."** |
| **Manual Edit to Master Script (Stage 4\)** | **No (Optional).** | The user can make the edit on the current branch. However, the system prompts with a soft recommendation to **"Create New Branch"** if the edit is significant. |
| **Any Edit in Stages 5-12** | **No (Optional).** | Edits are saved to the current branch and trigger **Local Context Invalidation** (see 7.3). User can opt to branch via the **"Create New Branch"** button first. |

**Note:** *switching to a previous node always creates a New Fork, never overwriting existing data.* 
### **7.3 The Invalidation Rules (The Cost of Change)**

Invalidation flags artifacts as *Outdated* or *Continuity Broken* due to an upstream change.

* **Global Invalidation (High-Cost):**  
  * **Trigger:** Mandatory Branching (Script Regeneration from Edited Beats).  
  * **Scope:** All Phase B artifacts (Stages 5-10) on the *new branch* are marked as **Invalidated** and must be re-generated. The original branch remains untouched.  
* **Local Invalidation (Cascading Continuity Break):**  
  * **Trigger:** Manual editing of the Master Script (Stage 4\) or an edit in any Phase B stage (6-12) of **Scene N**.  
  * **Scope:** The final video for **Scene N** is marked *Outdated*. Furthermore, all subsequent scenes (N+1, N+2, etc.) on the *current branch* are marked **Outdated/Continuity Broken** due to the disruption of the "End Frame" anchor.  
  * **UX Requirement:** All local invalidation must trigger the **Cost & Dependency Warning Modal** prior to saving, encouraging the user to "lock in everything" before proceeding.

### **7.4 The Artifact Vault and Version History**

#### **A. The Artifact Vault (In-Project Repository)**

Accessed via the Project Header button, this is the central view for all generated assets within the current project.

* **Grouping:** All artifacts must be initially grouped by **Branch Name**, and then further grouped by **Stage** and **Scene ID**.  
* **Artifact Types:** Includes all generated Videos, Master Scripts, Shot Lists, Anchor Frames, and the Final Prompts.  
* **Metadata:** Every artifact listing must include its **Origin Branch**, **Creation Timestamp**, and associated **Credit Cost**.

**The "Promote to Global" Action:** Within the Artifact Vault, users can select any saved Scene Instance or Master Asset and click "Promote to Global". This action clones the asset, its Image Key, and its description into the Global Sidebar Asset Library for use in other project files.

#### **B. Version History Modal (The Timeline)**

Accessed via the Project Header button, this modal provides the visual management tool for the branching system.

* **Visualization:** A visual graph (tree-like structure) must be used to display the `Main` trunk and all diverging experimental branches.  
* **Node Information:** Each node (representing a saved state or branching point) displays the **Regeneration Guidance** text (the "Commit Message") and the timestamp.  
* **Actionable Switches:** Users can select any node and click **"Switch to this Version"** to instantly load that specific branch's state into the main editor workspace.

## **8\. UI/UX & Agentic Tooling Definitions (Stages 1–5)**

This section details the explicit structure, visible components, and agentic tooling for the initial stages of the pipeline.

## **8.1 Stage 1: Input Modes & Initialization**

The goal of this stage is to collect all *global, high-level parameters* that will define the subsequent narrative flow, before any text generation begins.

---

### **1\. Global Project Parameters (The Initial Setup)**

These parameters should be configured first and remain constant throughout the pipeline unless a new branch is created.

| Parameter | UI Component | System Logic/Purpose |
| :---- | :---- | :---- |
| **A. Target Length** | Dual-Input Slider or Two Input Boxes | User sets a desired video duration range (e.g., **3:00 to 5:00 minutes**). This value becomes the *Global Context* and informs the LLM in Stages 2/3 (Treatment/Beat Sheet) to adjust narrative density to fit the time constraint. |
| **B. Project Type** | Drag-and-Drop or Radio Buttons | User selects one of three categories: **Narrative Short Film**, **Commercial/Trailer**, or **Video Content for Audio** (Background visuals for a podcast, audiobook, etc.). This informs the narrative structure used in Stage 2/3 (e.g., "Narrative" uses the standard pipeline, a "Commercial" needs a high-impact structure, while "Video Content for Audio Content" is used for podcasts or audiobooks. While the full pipeline remains, the system strongly recommends an audio transcript upload. The Narrative Engine (Stages 2–4) uses this transcript to generate a visual "story" sans dialogue, focusing on matching action and visuals chronologically to the timestamped audio input). |
| **C. Content Rating** | Dropdown Menu (G, PG, PG-13, M-rated) | Sets the baseline constraints for LLM dialogue and action generation across all stages. |
| **D. Genre/Tone** | Multi-Select Dropdown | User selects primary genre(s) (e.g., Comedy, Thriller/Suspense, Drama, Romantic). |
| **E. Tonal Precision** | Dedicated Text Input Box (Mandatory 10 characters) | Allows for precise context/instruction for the selected content rating/genre (e.g., "Raunchy, with playful hints at taboo..."). This text is saved as a **Project Constraint Tag** in the Global Context. |

---

### **2\. Written RAG Database Selection**

Your requirement to only select the Written RAG Database here is logical, as the visual style isn't necessary until Phase B.

* **RAG Selection:** The user selects a **Written Style Vector DB** (custom uploaded or system default).  
* **Optionality:** The selection should be clearly marked as **Optional**. If skipped, the AI defaults to a neutral, descriptive prose style.

---

### **3\. Input Modes & Multi-File Strategy**

The original four modes remain, but the input mechanism must be flexible to handle multiple files per your requirements.

| Mode | Core User Input | File Type Strategy | Revised AI Action |
| :---- | :---- | :---- | :---- |
| **A: Expansion** | 1–3 Paragraphs (Idea Kernel) | **Single Primary Input:** A core text box or single file upload. | Expands the core idea into a full 3-Act treatment. |
| **B: Condensation** | Large Text Upload (100+ pages) | **Single Primary Input:** Large file upload (e.g., a novel). | Summarizes and trims the text to a core cinematic narrative. |
| **C: Transformation** | Source Text \+ "Twist" Parameter | **Primary Input \+ Secondary Context Files (Optional):** Requires a Source Text upload. User may optionally upload secondary files (e.g., Parody Subject Material, research notes) to inform the "Twist." | Rewrites narrative based on style parameters. |
| **D: Script Skip (Revised)** | Formatted Screenplay Upload | **Primary Input (Mandatory) \+ Asset Definition Files (Optional):** Requires the main **Formatted Screenplay** file. User can optionally upload a **Character/Setting Definition Sheet** (structured data in a set format, e.g., JSON or a specific template) to pre-define assets for Stage 6, skipping the need for the LLM to infer these details. | Parses the screenplay directly into the **Stage 4 Master Script** format and, if provided, parses asset sheets into the **Master Asset Definition** library. |

#### **UI Solution for Multi-File Uploads (File Staging Area):**

Instead of a single "Upload" button, the UI should present a **File Staging Area** where users can drag and drop multiple files (regardless of the mode chosen).

1. **Primary Input Designation:** The user **must** designate one file as the **Primary Input** (e.g., the rough draft, the novel, the formatted script).  
2. **Context File Tagging:** All other uploaded files are designated as **Context Files** and the user tags them (e.g., "Character Notes," "World Building," "Parody Source," "Visual Reference Text").

The LLM is then instructed: "Use the **Primary Input** to generate the treatment, and use the **Context Files** for tone, detail, and supplementary information." This allows for maximum flexibility without forcing the user to adhere to a rigid file structure.

## **8.2 Stage 2: Treatment Generation (Iterative Prose)**

This stage focuses on free-form prose editing and dynamic alignment with the structural framework (Stage 3).

| Component | UI/UX Vision | Agentic Tooling / Logic |
| :---- | :---- | :---- |
| **Prose Editor** | Large, rich text editor with full manual editing capabilities. Must support **text highlighting** for targeted editing. | **Manual Editability & Targeted Regeneration Agent:** **1\. Manual Editability:** Any text field is fully editable, instantly overriding the AI's output. **2\. Targeted Regeneration (Context Menu):** User highlights text and right-clicks to open a prompt box. The LLM uses the highlighted text and surrounding content to execute the edit. (examples: "Make this more raunchy and politically incorrect," or "Inject more conflict," but to be clear the user is to enter their own custom prompt input.) |
| **Consistency Flag** | A prominent, non-blocking flag (e.g., a yellow icon) in the header: **"Not Up-to-Date with Current Beat Sheet."** | **Dynamic Logic:** The flag appears if the user has manually edited the **Stage 3 Beat Sheet** *after* the Treatment was generated. The LLM monitors for this downstream change. |
| **Flag Resolution** | A dedicated button near the flag: **"Retroactively Revise Treatment."** | **Retroactive Revision Agent:** When clicked, the LLM uses the *current, approved Stage 3 Beat Sheet* as its source truth to regenerate the Stage 2 prose. This action is saved as a new version history state on the current branch and resolves the flag. **No new branch is created.** |
| **Full Regeneration** | **Regeneration Guidance Box** (The Why Box) is mandatory (min 10 characters). | **Full Regeneration Agent:** Triggers a complete rewrite of the Treatment prose based on the guidance box input. This creates a new version history state on the current branch. |
| **Variation Gallery** | Thumbnails/cards displaying the **3 distinct prose treatments** initially generated. | **Selection Control:** Allows the user to select an alternate version generated by the LLM as the active version, updating the current branch state. |

---

## **8.3 Stage 3: The Beat Sheet (Structural Anchor & Loop)**

This stage is the structural editor, prioritizing speed and flexibility in structural manipulation.

| Component | UI/UX Vision | Agentic Tooling / Logic |
| :---- | :---- | :---- |
| **Beat List Editor** | Takes up most of the page. A numbered, drag-and-drop list of editable text fields, each representing a "Beat." | **Manual Editability & Targeted Regeneration Agent:** **1\. Manual Editability:** Every beat text field is fully editable. **2\. Targeted Regeneration:** User can highlight text within a single beat or select the entire beat item to trigger localized LLM changes via a context menu prompt (e.g., "Make this beat more dramatic"). **Drag-and-Drop Reordering:** Instantly updates beat numbers and position. |
| **Structural Tools** | Simple inline buttons (e.g., \+ and X) for each beat. | **Add/Remove Beats:** \* **Add:** Clicking \+ opens the **Regeneration Guidance Box** (The Why Box). The LLM uses the adjacent beats as context to generate the new beat based on the user's guidance. \* **Remove:** Simple deletion; the LLM uses the *next* beat as the continuity anchor. |
| **Beat Context View** | A button/icon on each beat list item that either expands the item or opens a Pop-Up Modal. | **Full Context Retrieval:** Displays the full, original continuous prose text segment from the **Stage 2 Treatment** that corresponds to that beat. This provides the user with the narrative context for editing the structural item. |
| **AI Brainstorm/ Expansion** | A dedicated inline button per beat (e.g., "Brainstorm"). | **Expansion Agent:** Opens a modal to generate alternatives or expand the beat: \* "Brainstorm 3 alternative resolutions for Beat X." \* "Expand Beat X into two more detailed sub-beats." |
| **Consistency Flag** | A non-blocking flag (e.g., a yellow icon) in the header: **"Not Up-to-Date with Current Script."** | **Dynamic Logic:** The flag appears if the user has manually edited the Stage 4 Master Script after the Beat Sheet was approved. |
| **Flag Resolution** | A dedicated button near the flag: **"Retroactively Revise Beat Sheet to Sync with Script."** | **Retroactive Revision Agent:** When clicked, the LLM uses the current, approved Stage 4 Master Script as its source truth to adjust the Stage 3 beat points and descriptions. This resolves the flag and updates the current branch's version history. **No new branch is created.** |
| **Forward Gatekeeper** | A prominent **"Confirm Beat Sheet & Proceed"** button. | **Structural Lock:** Prevents progress to Stage 4 until confirmed. Crucially, if the user attempts to Regenerate the Master Script (Stage 4\) from this newly edited Beat Sheet, the **Mandatory Branching Rule** is automatically triggered. |

## **8.4 Stage 4: The Descriptive Master Script** 

This stage is the definitive text source for all subsequent production stages.

| Component | UI/UX Vision | Agentic Tooling / Logic |
| :---- | :---- | :---- |
| **Master Script Editor** | A rich text editor displaying the script in a conventional format (Scene Headers, Dialogue, Action, etc.). **Crucially, the LLM is explicitly instructed to generate verbose descriptions for visual elements (Characters, Setting, Props, Mis-en-scène).** | **Highlight-and-Rewrite Agent:** Same targeted regeneration tool as Stage 2\. User highlights action/description text and types a precise edit request (e.g., "Make sure the setting description includes the fact that the walls are peeling and green"). |
| **Beat Alignment Panel** | A persistent, read-only sidebar showing the Beats (Stage 3\) with the beat corresponding to the currently viewed script section highlighted. | **Passive Consistency Check:** This visual link ensures the user is aware of the structural anchor. The agent monitors for major structural deviations during manual edits that would flag the Stage 3 Beat Sheet (see Retroactive Revision in Stage 3). |
| **Consistency Flag** | A non-blocking flag (e.g., a yellow icon): **"Not Up-to-Date with Current Beat Sheet."** | **Dynamic Logic:** Appears if the user manually modifies the script in a way that breaks a Stage 3 Beat (e.g., deleting an entire plot point scene). This is resolved by returning to Stage 3 for the "Retroactively Revise Beat Sheet" action. |
| **Initial Generation Button** | **"Generate Descriptive Master Script"** button (for first pass). | **The Verbosity Engine:** Triggers the LLM to generate the script using the full context of the Stage 2 Treatment, adhering to the Stage 3 Beat Sheet, and prioritizing **vivid, explicit visual descriptions** for all components. |
| **Regeneration Guidance Box (Full)** | Mandatory "The Why" text area (min 10 characters) required for any **full script regeneration** (e.g., "Rewrite all dialogue to be more sarcastic"). | **Full Script Regeneration Agent:** Triggers the LLM to rewrite the entire script. This is considered a high-impact change because it breaks all subsequent (Phase B) stages. |
| **Gatekeeper & Branching** | A final approval button: **"Approve Master Script & Proceed to Asset Definition (Stage 5)."** | **Mandatory Branching Rule:** If the user attempts a full script regeneration after having made **manual edits to the Stage 3 Beat Sheet**, the system *must* auto-trigger the **Create New Branch** modal, forcing a fork in the project history before proceeding. **This is the main structural fork point**. |

---

## **8.5 Stage 5: Global Asset Definition & Style Lock** 

Stage purpose is to extract, visualize, and lock the global visual components based on the Stage 4 script.

| Component | UI/UX Vision | Agentic Tooling / Logic |
| :---- | :---- | :---- |
| **Visual Style RAG Selection** | A prominent selector/dropdown at the top of the page. | **Style Lock:** User selects the **Visual Style Vector Database** (e.g., "Neo-Noir," "Pixar Animation," "Hyper-realistic VFX"). This selection is locked as a **Global Context Constraint** for all subsequent image/video generation calls (Nano Banana, Veo3). |
| **Asset Extraction & List** | A vertical list/sidebar initially auto-populated by the system. The list includes the names of all **Key Characters**, **Key Props**, and **Key Settings** extracted from the Stage 4 script. | **Extraction Agent:** LLM parses the entire Stage 4 script to deterministically extract and list every unique character, prop, and setting mentioned. |
| **Asset Definition Editor (Per Asset)** | Clicking an asset name opens a dedicated editor area. This area contains: **A. Descriptive Text Field** and **B. Image Key Generation.** | **Pre-Fill Agent:** The **Descriptive Text Field** is pre-filled with the *concatenated, cleaned* description of that asset as compiled from every mention in the Stage 4 Master Script. **Manual Editability & Targeted Regeneration Agent:** **1\. Manual Editability:** The Descriptive Text Field is fully editable. **2\. Targeted Regeneration:** User can highlight any portion of the descriptive text to trigger localized LLM edits via a prompt box (e.g., "Change the character's eye color to green"). |
| **Image Key Generation** | A dedicated section with a "Generate Image Key" button and a viewport for the generated image. | **Nano Banana Agent (Initial Call):** This tool takes the user-edited **Descriptive Text** and the locked **Visual Style RAG** selection to call the Nano Banana API, generating the definitive **Master Asset Visual Key (Image)**. This image is stored in the Master Asset Library. |
| **Asset Iteration & Locking** | **Regeneration Guidance Box (Image Focus):** A text box for inputting changes (e.g., "Make the character's hair redder"). | **Image Generation Iteration:** The user can repeatedly adjust the descriptive text and regenerate the image key until satisfied. **Mandatory Action:** A **"Lock Master Asset"** button must be pressed to finalize the asset before proceeding to the next stage, triggering a new version history state. |
| **Gatekeeper** | A final approval button: **"Approve Master Assets & Proceed to Technical Shot List (Stage 6)."** | **Locking Mechanism:** All **Master Assets** (Characters, Props, Settings) must have a locked **Image Key** before the user can proceed. |
| **Voice Profile Assignment** (Stretch Goal) |	A dropdown or "Gallery" button within the Asset Editor. |	**Character Voice Seed:** (Stretch Goal 12.1) Allows the user to link a character to a specific voice profile (e.g., ElevenLabs ID). This metadata is passed to Stage 9 for inclusion in the Audio section of the Video Prompt. |

## **9\. Phase B:UI/UX & Agentic Tooling Definitions (Stages 6–12)**

This section defines the finalized user interface structure, interaction patterns, and agentic tooling for **Phase B: The Production Engine**, covering **Stages 6–12**. These stages are responsible for deterministic translation from a locked narrative and asset base into anchored frames and final video output, with explicit controls for cost, continuity, and iteration.

The guiding principle of Phase B is **controlled translation, not creative exploration**. Each stage answers exactly one question for the user, and all agentic tooling is strictly scoped to that question.

---

## **9.1 Stage 6: Script Hub & Scene Cycle**

### **Purpose**

Stage 6 serves as the navigation and risk-awareness layer for Phase B. It allows users to select scenes, understand their production status, and be informed of continuity or dependency risks without blocking progress.

### **UI/UX Definition**

**Primary Layout**

* **Scene Index (Persistent Left Panel):**  
  * Lists all scenes parsed from the Master Script.  
  * Each scene row displays:  
    * Scene number and short slug  
    * Status indicator: Draft, Shot List Locked, Frames Locked, Video Complete, or Outdated  
    * Thumbnail preview of the last approved end frame (or placeholder if unavailable)  
* **Scene Overview Panel (Main View):**  
  * Read-only excerpt of the scene header and opening action/dialogue  
  * “Scene Dependencies” summary showing:  
    * Expected characters at scene start  
    * Expected location  
    * Prior scene end-state summary  
* **Primary Actions:**  
  * Enter Scene Pipeline  
  * Jump to Upstream Scene  
  * Create New Branch

### **Outdated Scene Handling**

Scenes marked **Outdated** are not blocked. Instead, selecting them triggers a **non-blocking warning modal** explaining:

* Why the scene is outdated  
* Which upstream artifacts have changed  
* Which downstream scenes may be affected

Users may proceed after acknowledging the warning.

### **Agentic Tooling**

* **Continuity Risk Analyzer (Advisory):**  
  * Automatically evaluates continuity risk by comparing prior scene end-state metadata with the current scene’s opening requirements  
  * Outputs Safe, Risky, or Broken  
  * Displays warnings only; never edits or blocks

* **Condition Carry-Forward Prompt:** When a user enters a scene that follows a scene where "Status Metadata Tags" were applied (e.g., Scene N results in a "Muddy" tag), the Script Hub will trigger a mandatory prompt: "Carry forward 'Muddy' status for [Character Name] to Scene N+1?".
---

## **9.2 Stage 7: Technical Shot List**

### **Purpose**

Stage 7 defines the **exact mechanical breakdown** of the scene into discrete, time-bounded shots. It is the authoritative source for what happens in the scene, but not how assets look.

### **UI/UX Definition**

* **Rearview Mirror (Persistent Top Component):**  
  * Displays the final shot action/dialogue and final frame of the previous scene  
  * Used as continuity reference  
* **Shot Table (Primary Workspace):**  
  * Spreadsheet-style table where each row represents an 8-second shot  
  * Mandatory columns:  
    * Shot ID  
    * Duration  
    * Dialogue (verbatim)  
    * Action (atomic physical description)  
    * Characters (foreground/background tags)  
    * Setting  
    * Camera  
    * Continuity Flags  
* **Shot Inspector (Context Panel):**  
  * Expanded view of selected shot  
  * Displays beat reference and rationale

### **Agentic Tooling**

* **Shot Split / Merge Agent:**  
  * Splits or merges shots deterministically using user instruction  
  * Cannot invent new narrative content  
* **Field Coherence Agent:**  
  * When a single field is edited, regenerates dependent fields to preserve coherence  
* **Tempo Suggestion Agent (Optional):**  
  * Provides non-destructive pacing suggestions

---

## **9.3 Stage 8: Visual & Character Definition (Starting State)**

### **Purpose**

Stage 8 defines the **starting visual state** of all relevant characters, locations, and props at their first appearance in the scene.

### **UI/UX Definition**

**Scene Visual Elements Panel (Left):**

* Auto-populated list of relevant visual elements derived from Stage 7  
* Grouped by Characters, Locations, Props  
* Each element displays:  
  * Source (Master Asset, Prior Scene Instance, or New Scene Asset)  
  * Review status (Unreviewed, Edited, Locked)

**Visual State Editor (Center):**

* Editable text description representing the starting look  
* Pre-filled from Stage 5 assets and adjusted for scene context  
* Supports:  
  * Free text editing  
  * Highlight-based agentic edits (optional)

**Asset Drawer (Right):**

* Global asset library access  
* Supports:  
  * Dragging in existing assets  
  * Creating new scene-only assets  
  * Optional promotion of new assets to Master Assets

### **Bulk Generation Flow**

1. User edits text descriptions for all relevant elements  
2. User multi-selects elements requiring updated visuals  
3. User clicks **Generate Scene Starting Visuals**  
4. Nano Banana generates image keys for selected elements only  
5. Generated images are stored as Scene Instance Visual Keys

### **Agentic Tooling**

* **Relevance Extraction Agent:** Identifies which assets are needed and when they first appear  
* **Text Edit Agent (Scoped):** Applies user-directed edits to highlighted text only  
* **Bulk Generation Orchestrator:** Manages parallel image generation and retries

### **Constraints**

Stage 8 defines only starting conditions. Mid-scene visual changes are handled in Stage 10\.

---

## **9.4 Stage 9: Prompt Segmentation & Model Preparation**

### **Purpose**

Stage 9 deterministically assembles and exposes all prompts that will be sent to downstream models, separating them by function and model requirements.

### **Prompt Taxonomy**

Each shot produces a **Prompt Set** consisting of:

* **Frame Prompt(s):** Used for image generation (start frames &, if applicable, end frames)  
* **Video Prompt:** Used for video generation  
* **System Scaffold Prompt:** Hidden orchestration logic 

### **UI/UX Definition**

* **Shot-Based Prompt Inspector:** Expandable card per shot

**Frame Prompt Section:**

* Visually verbose  
* Includes asset references, spatial layout, camera, and starting state  
* Read-only by default with optional manual edit toggle

**Video Prompt Section:**

* Focused on action progression, dialogue, accents, SFX, and timing  
* Minimal visual description  
* Always editable

**Model Compatibility Tags:**

* Indicates whether the shot requires:  
  * Start frame only  
  * Start and end frames  
* Indicates compatible video models

### **Agentic Tooling**

* **Prompt Assembler Agent:** Deterministically creates prompt sets  
* **Prompt Sanity Checker:** Flags mismatches between prompt intent and model usage

---

## **9.5 Stage 10: Frame Generation (Anchors & Continuity)**

### **Purpose**

Stage 10 establishes visual truth by generating and validating anchor frames used for downstream video generation.

### **Mode Selection (Mandatory)**

Before generation, users select one of the following:

**Quick Mode (Speed-Optimized):**

* Bulk generates all required frames  
* Faster but potentially wasteful

**Control Mode (Cost-Optimized):**

* Sequential generation  
* Start frame must be approved before end frame generation  
* Ensures dependency correctness

**Optional Toggle:** Start-frame-only generation for models that do not require end frames

### **UI/UX Definition**

**Common Components:**

* Shot frame panel with status indicators  
* Visual rearview mirror with ghost and flicker comparison

**Quick Mode UI:**

* Grid-based generation view  
* Progress tracking  
* Bulk review and correction tools

**Control Mode UI:**

* Step-by-step shot progression  
* Explicit approve-before-advance workflow

### **Mid-Scene Visual Evolution**

End frame prompts incorporate:

* Action context  
* Prior frame reference  
* Descriptions of visual changes resulting from action

### **Agentic Tooling**

* **Frame Dependency Manager:** Enforces correct frame chaining  
* **Region-Level Inpainting Agent:** Allows localized corrections  
* **Continuity Drift Detector:** Flags visual inconsistencies

---

## **9.6 Stage 11: Confirmation & Gatekeeping**

### **Purpose**

Stage 11 provides a final economic and dependency review before video generation.

### **UI/UX Definition**

* Scene summary with all shots  
* Start/end frame previews  
* Prompt snapshots  
* Cost breakdown  
* Dependency warning if applicable

No agentic tooling is used in this stage.

---

## **9.7 Stage 12: Video Generation, Review & Iteration Loop**

### **Purpose**

Stage 12 generates the final video and routes the user back to the appropriate upstream stage if issues are detected.

### **UI/UX Definition**

* Timeline-based video player with shot markers  
* Issue classification controls:  
  * Visual continuity  
  * Timing  
  * Dialogue/audio  
  * Narrative structure
* **Render Re-Entry Logic** (Stretch Goal):
  * When a background render (defined in 12.2) is complete, clicking the notification or the "Complete" status in the Script Hub (Stage 6) must drop the user directly into the Stage 12 Review Player for that specific scene.

### **Agentic Tooling**

* **Failure Attribution Agent:** Maps issues to the most likely upstream stage

---

## **10\. Project Wrap & Export**

**Purpose:** To facilitate the transition from AI generation to professional post-production software.

**Export Formats:** The system must support a "Pro Export" package including:

* **Individual Clips:** All 8-second .mp4 files with high-bitrate encoding.

* **NLE XML/EDL:** An Edit Decision List (EDL) or XML file that allows for 1-click importing into DaVinci Resolve, Adobe Premiere Pro, or Capcut, maintaining the sequence order defined in the Script Hub.

* **Standardized Naming Convention:** All exported clips must follow the format: [ProjectName]_[Scene#]_[ShotID]_[Version#].mp4 (e.g., Aiuteur_Sc01_Shot3A_v02.mp4). This ensures the files remain organized when imported into DaVinci Resolve or Premiere.

* **Audio Stems:** Separate tracks for Dialogue, SFX, and Background Music (if generated) / OPTIONAL.

**Bulk Archive:** A single .zip download containing all final "Approved" artifacts from the active branch.

---

## **11\. Additional Considerations**

### **Canonical Prompt Type Separation (Hard Requirement)**

The system enforces three canonical prompt types. These prompt types serve different purposes, target different models, and must never be conflated or merged.

**Prompt Types**

* **Frame Prompt**  
   Used exclusively for image generation of starting and ending frames.  
   Characteristics:

  * Visually verbose

  * Asset-heavy

  * Spatially explicit

  * References Stage 8 visual states and shot-level camera/blocking

* **Video Prompt**  
   Used exclusively for video generation.  
   Characteristics:

  * Action- and audio-focused

  * Dialogue, accents, timing, and sound effects fully specified

  * Minimal visual description

  * Assumes visual appearance is already encoded in anchor frames

* **System Scaffold Prompt**  
   Used internally for orchestration and constraint enforcement.  
   Characteristics:

  * Never user-editable

  * Not visible in the UI

  * Encodes intent such as “this image is a video anchor frame” or dependency rules

This separation is foundational. Once locked, it enables Stage 9 to be deterministic and Stage 10 to remain flexible.

---

### **Prompt Verbosity Rules by Model Type**

Prompt verbosity must be aligned with downstream model requirements.

* Frame prompts must fully specify visual composition, spatial relationships, camera framing, and asset appearance.

* Video prompts must prioritize motion, dialogue, performance, and sound, and should avoid restating visual attributes unless required for action clarity.

* Video prompts should assume that starting frames already encode the visual truth.

The system should warn, but not block, when verbosity is misaligned.

---

### **User-Visible Prompt Clarity**

Users must always understand which prompt affects which output.

Stage 9 must clearly label:

* Which prompt affects image generation

* Which prompt affects video generation

* Which logic is system-owned and non-editable

This clarity is mandatory to avoid user confusion and incorrect edits.

---

### **Start-Frame-Only Compatibility (Sora-Style Models)**

The pipeline must support video generation models that require only a starting frame.

Requirements:

* Shots may be tagged as **Start-Frame-Only Compatible** in Stage 9\.

* When enabled:

  * End frame generation is skipped entirely.

  * Stage 10 UI hides end-frame requirements.

  * Frame dependency logic adapts accordingly.

* Stage 11 cost calculations must exclude end-frame generation for these shots.

This is a first-class pipeline path, not a workaround.

---

### **Generation Mode Enforcement (Speed vs Cost)**

Stage 10 must require an explicit generation mode selection before any frame generation occurs.

* **Quick Mode**  
   Bulk generation optimized for speed. Higher risk of wasted credits.

* **Control Mode**  
   Sequential, approval-based generation optimized for cost efficiency and continuity correctness.

Mode selection affects frame dependency handling and cost estimation downstream.

---

### **Mid-Scene Visual Change Handling (Non-Over-Specified)**

Visual evolution during a scene must not be pre-defined upstream.

Rules:

* Stage 8 defines only starting visual conditions.

* Stage 10 implicitly handles visual changes via:

  * Action context

  * Prior frame inheritance

* Frame prompts may reference visual changes only when generating subsequent frames.

* Over-specifying visual evolution upstream is explicitly discouraged.

This preserves flexibility and prevents brittle prompts.

---

### **Cost Awareness Propagation**

High-cost operations must always surface cost implications.

* Frame generation

* Regeneration

* Bulk operations

Stage 11 aggregates cost estimates based on:

* Generation mode

* Frame requirements per shot

* Start-frame-only vs start+end-frame paths

### **Prompt Responsibility Separation**

* Frame prompts define visual appearance  
* Video prompts define motion and audio  
* Visual verbosity is explicitly discouraged in video prompts

### **State Ownership**

* Stage 8 owns initial visual state  
* Stage 10 owns visual evolution  
* No other stage mutates asset appearance

### **Cost Discipline**

* All high-cost operations require explicit user confirmation  
* Control Mode is the default recommendation for cost-sensitive users

### **12\. Stretch Goals**

**12.1 Audio & Voice Consistency (Voice Gallery)**

* **The Gap:** Standard AI video audio can lack vocal character continuity across shots.  
* **Solution:** Integration of a **Voice Gallery** in Stage 5 (Global Assets). Users assign a specific voice profile (via ElevenLabs API or similar) to each Master Character. This profile acts as a "Voice Seed" for all Stage 12 Veo3 calls, ensuring "John Doe" sounds identical in every 8-second clip.

**12.2 Handling API Timeouts & Rendering Failures**

* **The Gap:** High-cost, high-latency video generation (Stage 12\) can lead to session timeouts or idle time.  
* **Solution: Asynchronous Notification Service.**  
  * **Background Rendering:** The UI must decouple the "Render" command from the user’s active session. Users can click "Confirm & Render" and then immediately return to the Script Hub to work on other scenes.  
  * **Notification System:** A progress bar will persist in the Global Sidebar. Upon completion or failure, the system sends an in-app toast notification and an email alert to the user.



__________________________________________________________________________________________________________

\# Aiuteur Implementation Task List

\#\# Overview

This document outlines the iterative development plan for Aiuteur, progressing from the current frontend skeleton to a fully functional AI-powered film generation platform. Each phase delivers a working product with increasing capability.

\*\*Current State\*\*: Frontend UI skeleton with no backend, no data persistence, no AI integrations.

\*\*Target State\*\*: Full 12-stage pipeline with AI generation, version control, cost management, and production-ready video output.

\---

\#\# Phase 0: Setup & Foundation (Barebones Functioning System)

\*\*Goal\*\*: Establish minimal infrastructure to support basic data flow and state persistence. No AI integrations yet—focus on making the skeleton "live" with mock data that persists.

\#\#\# Feature 0.1: Backend API Foundation  
\*\*Purpose\*\*: Create minimal REST API structure for frontend communication  
\- \[ \] Set up Fly.io deployment configuration and environment  
\- \[ \] Create Express.js server with CORS and basic middleware  
\- \[ \] Implement health check endpoint (\`/api/health\`)  
\- \[ \] Add error handling middleware  
\- \[ \] Configure environment variables for API keys (placeholder values)

\#\#\# Feature 0.2: Database Schema Implementation  
\*\*Purpose\*\*: Establish data persistence layer  
\- \[ \] Set up Supabase project and configure connection  
\- \[ \] Implement \`projects\` table with RLS policies  
\- \[ \] Implement \`branches\` table with foreign key to projects  
\- \[ \] Create initial migration scripts  
\- \[ \] Test database connection from backend API

\#\#\# Feature 0.3: Authentication System  
\*\*Purpose\*\*: Enable user-specific project management  
\- \[ \] Integrate Supabase Auth in frontend  
\- \[ \] Create login/signup UI components  
\- \[ \] Implement protected route middleware  
\- \[ \] Add authentication state management in Zustand  
\- \[ \] Test user session persistence

\#\#\# Feature 0.4: Project CRUD Operations  
\*\*Purpose\*\*: Enable basic project lifecycle management  
\- \[ \] Implement POST \`/api/projects\` (create project)  
\- \[ \] Implement GET \`/api/projects/:id\` (fetch project)  
\- \[ \] Implement GET \`/api/projects\` (list user projects)  
\- \[ \] Connect frontend Dashboard to real API calls  
\- \[ \] Replace mock project data with database queries

\#\#\# Feature 0.5: State Persistence Hookup  
\*\*Purpose\*\*: Make pipeline state survive page refreshes  
\- \[ \] Implement \`stage\_states\` table with JSONB content field  
\- \[ \] Create API endpoint POST \`/api/projects/:id/stages/:stageNumber\`  
\- \[ \] Add auto-save functionality in pipeline components  
\- \[ \] Implement state hydration on page load  
\- \[ \] Test stage progression and data persistence

\*\*Deliverable\*\*: Users can create projects, navigate pipeline stages, and see their work persist across sessions. No AI generation yet—all content is manually entered or uses placeholder text.

\---

\#\# Phase 1: MVP \- Stage 1-4 Text Pipeline (Minimal Viable Product)

\*\*Goal\*\*: Deliver core narrative creation pipeline (Phase A: Stages 1-4) with real LLM integration. Users can input a story idea and get a structured script output.

\#\#\# Feature 1.1: LLM Service Integration  
\*\*Purpose\*\*: Connect to text generation AI services  
\- \[ \] Set up OpenAI/Anthropic client with API key management  
\- \[ \] Create \`llm-client.ts\` service with retry logic  
\- \[ \] Implement prompt template system (database-stored)  
\- \[ \] Add token counting and cost estimation utilities  
\- \[ \] Test LLM connectivity with simple prompt

\#\#\# Feature 1.2: Stage 1 \- Input Modes (Complete)  
\*\*Purpose\*\*: Functional narrative input system  
\- \[ \] Implement file upload component for multi-file staging  
\- \[ \] Add file type validation (text, PDF, screenplay formats)  
\- \[ \] Create project configuration form with validation  
\- \[ \] Store Stage 1 configuration in database  
\- \[ \] Implement mode-specific processing logic

\#\#\# Feature 1.3: Stage 2 \- Treatment Generation (Complete)  
\*\*Purpose\*\*: AI-powered prose treatment generation  
\- \[ \] Build prompt template for treatment generation  
\- \[ \] Implement 3-variant generation system  
\- \[ \] Create variation selection UI with side-by-side comparison  
\- \[ \] Add rich text editor with manual editing  
\- \[ \] Implement targeted regeneration (highlight \+ right-click)

\#\#\# Feature 1.4: Stage 3 \- Beat Sheet Editor (Complete)  
\*\*Purpose\*\*: Interactive structural editing  
\- \[ \] Implement drag-and-drop beat reordering with @dnd-kit  
\- \[ \] Create beat extraction LLM agent  
\- \[ \] Add inline beat editing with auto-save  
\- \[ \] Implement beat splitting/merging actions  
\- \[ \] Add "Confirm Beat Sheet" gatekeeper logic

\#\#\# Feature 1.5: Stage 4 \- Master Script Generator (Complete)  
\*\*Purpose\*\*: Generate production-ready screenplay  
\- \[ \] Build verbose script generation prompt template  
\- \[ \] Implement screenplay formatting (INT/EXT, character names, dialogue)  
\- \[ \] Create script editor with industry-standard layout  
\- \[ \] Add scene extraction logic for Phase B  
\- \[ \] Implement "Approve Master Script" checkpoint

\#\#\# Feature 1.6: Stage Progression & Gating  
\*\*Purpose\*\*: Enforce pipeline dependencies and checkpoints  
\- \[ \] Implement stage status state machine (draft/locked/invalidated)  
\- \[ \] Add stage advancement validation logic  
\- \[ \] Create visual progress timeline component  
\- \[ \] Implement "lock stage" functionality  
\- \[ \] Add navigation guards for incomplete stages

\*\*Deliverable\*\*: Users can input a story idea, iteratively refine it through AI-generated treatments and beat sheets, and receive a formatted master script. This is the first complete value delivery—users get a structured screenplay from a rough idea.

\---

\#\# Phase 2: RAG & Style System

\*\*Goal\*\*: Add creative control through style customization. Users can upload reference materials to guide tone, pacing, and aesthetic.

\#\#\# Feature 2.1: Written Style RAG Database  
\*\*Purpose\*\*: Enable tone/style consistency across text generation  
\- \[ \] Implement \`rag\_databases\` and \`rag\_documents\` tables  
\- \[ \] Create document upload UI for text samples  
\- \[ \] Integrate text embedding generation (OpenAI embeddings)  
\- \[ \] Implement pgvector indexing with HNSW  
\- \[ \] Add RAG retrieval logic to Stage 2-4 prompts

\#\#\# Feature 2.2: Visual Style RAG Database  
\*\*Purpose\*\*: Control visual aesthetic for image/video generation  
\- \[ \] Create visual reference image upload interface  
\- \[ \] Implement image embedding generation  
\- \[ \] Build visual style selector UI component  
\- \[ \] Add visual RAG database management page  
\- \[ \] Link visual style selection to asset generation

\#\#\# Feature 2.3: Context Management System  
\*\*Purpose\*\*: Implement Global vs Local context strategy  
\- \[ \] Create Context Manager service class  
\- \[ \] Implement global context assembly (Beat Sheet, Master Script summary)  
\- \[ \] Add local context windowing for scenes  
\- \[ \] Build context injection into LLM prompts  
\- \[ \] Add context size monitoring and truncation

\#\#\# Feature 2.4: RAG-Enhanced Generation  
\*\*Purpose\*\*: Apply style guidance to AI outputs  
\- \[ \] Modify Stage 2 prompts to include written RAG context  
\- \[ \] Update Stage 4 script generation with style retrieval  
\- \[ \] Add relevance scoring for retrieved documents  
\- \[ \] Implement RAG retrieval logging in \`rag\_retrievals\` table  
\- \[ \] Test style consistency across regenerations

\*\*Deliverable\*\*: Users can define custom written and visual styles by uploading reference materials. Generated treatments and scripts reflect the uploaded style, making output more personalized and consistent with user vision.

\---

\#\# Phase 3: Asset Management & Stage 5

\*\*Goal\*\*: Enable visual asset definition and management. Users can define characters, props, and locations with generated image references.

\#\#\# Feature 3.1: Image Generation Service  
\*\*Purpose\*\*: Integrate Nano Banana for asset image keys  
\- \[ \] Set up Nano Banana API client  
\- \[ \] Implement image generation request/response handling  
\- \[ \] Add Supabase Storage integration for image uploads  
\- \[ \] Create image generation queue system  
\- \[ \] Implement error handling and retry logic

\#\#\# Feature 3.2: Global Asset Library  
\*\*Purpose\*\*: Centralized asset management across projects  
\- \[ \] Implement \`global\_assets\` table and API endpoints  
\- \[ \] Create asset creation UI (name, type, description)  
\- \[ \] Build asset gallery/grid view component  
\- \[ \] Add search and filter functionality  
\- \[ \] Implement asset deletion with dependency checking

\#\#\# Feature 3.3: Stage 5 \- Asset Extraction & Definition  
\*\*Purpose\*\*: Parse script and generate visual keys  
\- \[ \] Implement LLM-based asset extraction from Stage 4 script  
\- \[ \] Create asset definition editor UI (description \+ image)  
\- \[ \] Build image key generation workflow  
\- \[ \] Add iterative image regeneration with guidance  
\- \[ \] Implement "Lock Master Asset" gatekeeper

\#\#\# Feature 3.4: Project-Level Assets  
\*\*Purpose\*\*: Project-specific asset instances  
\- \[ \] Implement \`project\_assets\` table  
\- \[ \] Create asset inheritance from global library  
\- \[ \] Add project asset drawer UI component  
\- \[ \] Implement asset promotion (project → global)  
\- \[ \] Build asset versioning system

\#\#\# Feature 3.5: Visual Style Lock  
\*\*Purpose\*\*: Enforce consistent visual aesthetic  
\- \[ \] Create visual style selector in Stage 5  
\- \[ \] Implement style lock enforcement in image generation  
\- \[ \] Add style preview component  
\- \[ \] Store locked style in global context  
\- \[ \] Test style consistency across multiple assets

\*\*Deliverable\*\*: Users can extract characters, props, and settings from their script, generate reference images for each, and lock a visual style. This establishes the visual foundation for video generation.

\---

\#\# Phase 4: Phase B Foundation \- Scenes & Shots

\*\*Goal\*\*: Implement scene-based workflow (Stage 6-7). Users can break down their script into technical shot lists.

\#\#\# Feature 4.1: Scene Extraction & Parsing  
\*\*Purpose\*\*: Convert Master Script into scene database entries  
\- \[ \] Implement \`scenes\` table  
\- \[ \] Build scene extraction logic from Stage 4 script  
\- \[ \] Create scene heading parser (INT/EXT/DAY/NIGHT)  
\- \[ \] Store scene content and metadata  
\- \[ \] Implement scene ordering and numbering

\#\#\# Feature 4.2: Stage 6 \- Script Hub  
\*\*Purpose\*\*: Scene navigation and status tracking  
\- \[ \] Create scene list UI with status indicators  
\- \[ \] Implement scene selection and navigation  
\- \[ \] Build scene overview panel with dependencies  
\- \[ \] Add continuity risk analyzer (advisory)  
\- \[ \] Create "Enter Scene Pipeline" action

\#\#\# Feature 4.3: Stage 7 \- Shot List Generator  
\*\*Purpose\*\*: Break scenes into timed, technical shots  
\- \[ \] Implement \`shots\` table with mandatory fields  
\- \[ \] Build shot extraction LLM agent  
\- \[ \] Create shot table UI (spreadsheet-style)  
\- \[ \] Add shot field editing with auto-save  
\- \[ \] Implement shot splitting/merging logic

\#\#\# Feature 4.4: Rearview Mirror Component  
\*\*Purpose\*\*: Display prior scene end-state for continuity  
\- \[ \] Create collapsible rearview mirror UI component  
\- \[ \] Implement prior scene data fetching  
\- \[ \] Display final action/dialogue from previous scene  
\- \[ \] Add visual frame preview (when available)  
\- \[ \] Integrate into Stage 7-10 interfaces

\#\#\# Feature 4.5: Shot List Validation & Locking  
\*\*Purpose\*\*: Enforce shot list completeness  
\- \[ \] Add field validation (required fields, duration limits)  
\- \[ \] Implement shot coherence checking  
\- \[ \] Create "Lock Shot List" gatekeeper  
\- \[ \] Add warning modal for incomplete shots  
\- \[ \] Store locked shot list in database

\*\*Deliverable\*\*: Users can navigate scenes, break them into detailed shot lists with camera specs and action, and see continuity context from prior scenes. This bridges narrative (Phase A) to production (Phase B).

\---

\#\# Phase 5: Asset Inheritance & Stage 8

\*\*Goal\*\*: Implement stateful asset system. Assets evolve across scenes with condition tracking.

\#\#\# Feature 5.1: Scene Asset Instances  
\*\*Purpose\*\*: Scene-specific asset variations  
\- \[ \] Implement \`scene\_asset\_instances\` table  
\- \[ \] Create asset inheritance logic (Scene N → Scene N+1)  
\- \[ \] Build scene asset state propagation  
\- \[ \] Add asset modification tracking  
\- \[ \] Implement scene-specific image key generation

\#\#\# Feature 5.2: Stage 8 \- Visual Definition UI  
\*\*Purpose\*\*: Define scene starting visual state  
\- \[ \] Create Scene Visual Elements panel  
\- \[ \] Build Visual State Editor with pre-filled descriptions  
\- \[ \] Implement Asset Drawer for global asset access  
\- \[ \] Add drag-and-drop asset assignment  
\- \[ \] Create bulk asset image generation workflow

\#\#\# Feature 5.3: Status Metadata Tags  
\*\*Purpose\*\*: Track visual conditions (muddy, bloody, torn)  
\- \[ \] Add status tags field to scene asset instances  
\- \[ \] Create tag UI component (chips/badges)  
\- \[ \] Implement condition carry-forward prompt  
\- \[ \] Build tag persistence logic across scenes  
\- \[ \] Add tag-based search and filtering

\#\#\# Feature 5.4: Asset State Evolution  
\*\*Purpose\*\*: Handle mid-scene visual changes  
\- \[ \] Implement asset state change detection  
\- \[ \] Create asset change logging system  
\- \[ \] Add visual evolution tracking  
\- \[ \] Build asset timeline view  
\- \[ \] Implement state rollback functionality

\#\#\# Feature 5.5: Scene-to-Scene Continuity  
\*\*Purpose\*\*: Ensure visual consistency across scene boundaries  
\- \[ \] Implement end-state summary generation  
\- \[ \] Create continuity flag system  
\- \[ \] Add visual diff component (before/after)  
\- \[ \] Build automatic continuity warning system  
\- \[ \] Implement manual continuity override

\*\*Deliverable\*\*: Assets (characters, props) maintain state across scenes. Users can modify asset appearance for specific scenes, track conditions, and ensure visual continuity. Characters can get muddy, clothes can tear, and these changes persist.

\---

\#\# Phase 6: Prompt Engineering & Stage 9

\*\*Goal\*\*: Implement deterministic prompt assembly system. Users can see and edit exact prompts sent to AI models.

\#\#\# Feature 6.1: Prompt Taxonomy Implementation  
\*\*Purpose\*\*: Separate frame, video, and system prompts  
\- \[ \] Implement prompt type enum (frame/video/system)  
\- \[ \] Create prompt template versioning system  
\- \[ \] Build prompt assembly logic per shot  
\- \[ \] Add prompt field validation  
\- \[ \] Store prompt history in database

\#\#\# Feature 6.2: Stage 9 \- Prompt Inspector UI  
\*\*Purpose\*\*: Expose and edit model inputs  
\- \[ \] Create expandable shot card component  
\- \[ \] Build Frame Prompt section (read-only by default)  
\- \[ \] Add Video Prompt section (editable)  
\- \[ \] Implement manual edit toggle  
\- \[ \] Create model compatibility indicator

\#\#\# Feature 6.3: Prompt Assembly Agent  
\*\*Purpose\*\*: Merge shot \+ asset data into formatted prompts  
\- \[ \] Build shot data → frame prompt logic  
\- \[ \] Implement action \+ dialogue → video prompt logic  
\- \[ \] Add visual style RAG injection  
\- \[ \] Create character profile merging  
\- \[ \] Implement prompt sanity checker

\#\#\# Feature 6.4: Veo3 Prompt Formatting  
\*\*Purpose\*\*: Format prompts for video generation API  
\- \[ \] Implement Veo3-specific prompt structure  
\- \[ \] Add visual section formatter  
\- \[ \] Build audio section formatter (dialogue \+ SFX)  
\- \[ \] Create character voice mapping  
\- \[ \] Add timing specification

\#\#\# Feature 6.5: Prompt Validation & Preview  
\*\*Purpose\*\*: Catch formatting issues before generation  
\- \[ \] Implement prompt length validation  
\- \[ \] Add forbidden character checking  
\- \[ \] Create prompt preview component  
\- \[ \] Build prompt comparison tool (variant A vs B)  
\- \[ \] Implement prompt testing interface

\*\*Deliverable\*\*: Users can see exactly what prompts will be sent to AI models, edit them for fine control, and validate they meet API requirements. This transparency enables debugging and refinement.

\---

\#\# Phase 7: Frame Generation & Stage 10

\*\*Goal\*\*: Implement anchor frame generation with continuity checking. Users generate start/end frames to constrain video output.

\#\#\# Feature 7.1: Frame Generation Service  
\*\*Purpose\*\*: Integrate Nano Banana for frame generation  
\- \[ \] Implement \`frames\` table  
\- \[ \] Create frame generation API endpoint  
\- \[ \] Add prior frame seeding logic  
\- \[ \] Build frame storage in Supabase  
\- \[ \] Implement frame approval workflow

\#\#\# Feature 7.2: Generation Mode Selection  
\*\*Purpose\*\*: Speed vs cost optimization  
\- \[ \] Create mode selector UI (Quick/Control)  
\- \[ \] Implement Quick Mode (bulk generation)  
\- \[ \] Build Control Mode (sequential approval)  
\- \[ \] Add cost estimation for each mode  
\- \[ \] Store mode preference in user settings

\#\#\# Feature 7.3: Stage 10 \- Frame Generation UI  
\*\*Purpose\*\*: Generate and review anchor frames  
\- \[ \] Create shot frame panel with status indicators  
\- \[ \] Build visual rearview mirror with comparison  
\- \[ \] Implement bulk generation workflow (Quick Mode)  
\- \[ \] Add step-by-step workflow (Control Mode)  
\- \[ \] Create frame approval interface

\#\#\# Feature 7.4: Continuity Validation  
\*\*Purpose\*\*: Detect and fix visual inconsistencies  
\- \[ \] Implement frame dependency manager  
\- \[ \] Build continuity drift detector  
\- \[ \] Create visual diff component (ghost/flicker)  
\- \[ \] Add automatic flagging of continuity breaks  
\- \[ \] Implement region-level inpainting for fixes

\#\#\# Feature 7.5: Frame Iteration & Refinement  
\*\*Purpose\*\*: Enable targeted frame regeneration  
\- \[ \] Add frame regeneration with guidance  
\- \[ \] Implement localized inpainting interface  
\- \[ \] Create frame history tracking  
\- \[ \] Build frame comparison view  
\- \[ \] Add frame version rollback

\*\*Deliverable\*\*: Users generate image frames that anchor video generation, with tools to ensure continuity between shots. The system catches visual drift and provides localized fixing tools.

\---

\#\# Phase 8: Cost Management & Stage 11

\*\*Goal\*\*: Implement transparent cost tracking and gating. Users see costs before expensive operations and can make informed decisions.

\#\#\# Feature 8.1: Cost Calculation Engine  
\*\*Purpose\*\*: Accurate credit estimation across operations  
\- \[ \] Create cost model database (per operation type)  
\- \[ \] Implement cost calculation utilities  
\- \[ \] Add per-shot cost estimation  
\- \[ \] Build scene-level cost aggregation  
\- \[ \] Create project-level cost tracking

\#\#\# Feature 8.2: Stage 11 \- Confirmation Gateway  
\*\*Purpose\*\*: Final checkpoint before video generation  
\- \[ \] Create scene summary view (all shots \+ frames)  
\- \[ \] Build cost breakdown display  
\- \[ \] Implement dependency warning system  
\- \[ \] Add prompt snapshot preview  
\- \[ \] Create "Confirm & Render" action

\#\#\# Feature 8.3: Cost Tracking & History  
\*\*Purpose\*\*: Monitor spending across project lifecycle  
\- \[ \] Implement cost logging in database  
\- \[ \] Create cost history view  
\- \[ \] Build per-user credit balance system  
\- \[ \] Add low-credit warnings  
\- \[ \] Implement cost analytics dashboard

\#\#\# Feature 8.4: Credit Purchase System  
\*\*Purpose\*\*: Enable users to buy generation credits  
\- \[ \] Integrate payment processor (Stripe/similar)  
\- \[ \] Create credit package selection UI  
\- \[ \] Implement purchase flow  
\- \[ \] Add receipt generation  
\- \[ \] Build credit balance updates

\#\#\# Feature 8.5: Cost Optimization Recommendations  
\*\*Purpose\*\*: Help users reduce unnecessary spending  
\- \[ \] Implement cost-saving suggestion engine  
\- \[ \] Add "cheapest path" analyzer  
\- \[ \] Create bulk operation pricing  
\- \[ \] Build cost comparison tool (mode A vs B)  
\- \[ \] Implement smart regeneration recommendations

\*\*Deliverable\*\*: Users see transparent cost breakdowns before expensive operations, can purchase credits, and receive recommendations to optimize spending. This builds trust and prevents surprise charges.

\---

\#\# Phase 9: Video Generation & Stage 12

\*\*Goal\*\*: Implement video generation pipeline. Users can render final videos and review output.

\#\#\# Feature 9.1: Veo3 Video Service  
\*\*Purpose\*\*: Integrate Google Veo3 for video generation  
\- \[ \] Set up Veo3 API client  
\- \[ \] Implement \`videos\` table  
\- \[ \] Create video generation request handling  
\- \[ \] Add webhook for generation completion  
\- \[ \] Build video storage in Supabase

\#\#\# Feature 9.2: Asynchronous Job System  
\*\*Purpose\*\*: Handle long-running video generation  
\- \[ \] Implement job queue (Bull/similar)  
\- \[ \] Create background worker process  
\- \[ \] Add job status tracking  
\- \[ \] Build retry logic for failed jobs  
\- \[ \] Implement job cancellation

\#\#\# Feature 9.3: Stage 12 \- Video Review UI  
\*\*Purpose\*\*: Playback and evaluation interface  
\- \[ \] Create timeline-based video player  
\- \[ \] Build shot marker overlay  
\- \[ \] Implement full-scene assembly preview  
\- \[ \] Add playback controls (play/pause/scrub)  
\- \[ \] Create issue classification controls

\#\#\# Feature 9.4: Notification System  
\*\*Purpose\*\*: Alert users when renders complete  
\- \[ \] Implement in-app toast notifications  
\- \[ \] Add email notification system  
\- \[ \] Create notification preferences  
\- \[ \] Build notification history  
\- \[ \] Implement render re-entry logic

\#\#\# Feature 9.5: Iteration Routing  
\*\*Purpose\*\*: Route users to correct upstream stage for fixes  
\- \[ \] Implement failure attribution agent  
\- \[ \] Create issue-to-stage mapping  
\- \[ \] Build "Return to Stage X" actions  
\- \[ \] Add issue description capture  
\- \[ \] Implement regeneration workflow

\*\*Deliverable\*\*: Users can generate final videos, receive notifications when complete, review output, and iterate by returning to upstream stages to fix issues. This completes the core production pipeline.

\---

\#\# Phase 10: Version Control & Branching

\*\*Goal\*\*: Implement git-style "Story Timelines" branching system. Users can experiment without destroying completed work.

\#\#\# Feature 10.1: Branching Data Model  
\*\*Purpose\*\*: Enable non-linear project evolution  
\- \[ \] Enhance \`branches\` table with parent references  
\- \[ \] Implement branch creation logic  
\- \[ \] Add branch merging rules  
\- \[ \] Create branch deletion with safeguards  
\- \[ \] Build branch comparison utilities

\#\#\# Feature 10.2: Mandatory Branching Rules  
\*\*Purpose\*\*: Enforce branching for destructive operations  
\- \[ \] Detect Stage 3 → Stage 4 regeneration trigger  
\- \[ \] Implement auto-branch creation modal  
\- \[ \] Add branch naming interface  
\- \[ \] Store commit messages (regeneration guidance)  
\- \[ \] Prevent progress without branching

\#\#\# Feature 10.3: Version History UI  
\*\*Purpose\*\*: Visualize and navigate project timeline  
\- \[ \] Create tree visualization component  
\- \[ \] Build branch timeline view  
\- \[ \] Implement node selection and switching  
\- \[ \] Add branch metadata display  
\- \[ \] Create version comparison interface

\#\#\# Feature 10.4: Artifact Vault  
\*\*Purpose\*\*: Central repository for all generated content  
\- \[ \] Create artifact storage system  
\- \[ \] Build branch-grouped artifact view  
\- \[ \] Implement artifact tagging  
\- \[ \] Add artifact search and filter  
\- \[ \] Create artifact promotion to global library

\#\#\# Feature 10.5: Invalidation Logic  
\*\*Purpose\*\*: Cascade changes through dependent artifacts  
\- \[ \] Implement \`invalidation\_logs\` table  
\- \[ \] Build global invalidation logic  
\- \[ \] Add local (scene) invalidation  
\- \[ \] Create continuity break detection  
\- \[ \] Implement cost estimation for invalidations

\*\*Deliverable\*\*: Users can create experimental branches to try narrative changes without losing completed work. The system tracks all versions and provides visual history for navigation.

\---

\#\# Phase 11: Advanced UI/UX & Polish

\*\*Goal\*\*: Enhance user experience with animations, keyboard shortcuts, tutorials, and quality-of-life improvements.

\#\#\# Feature 11.1: Animations & Transitions  
\*\*Purpose\*\*: Smooth, professional interface feel  
\- \[ \] Implement Framer Motion stage transitions  
\- \[ \] Add micro-interactions (button hovers, clicks)  
\- \[ \] Create loading state animations  
\- \[ \] Build progress bar animations  
\- \[ \] Add page transition effects

\#\#\# Feature 11.2: Keyboard Shortcuts  
\*\*Purpose\*\*: Power user efficiency  
\- \[ \] Implement keyboard shortcut system  
\- \[ \] Add stage navigation shortcuts  
\- \[ \] Create action shortcuts (save, regenerate, etc.)  
\- \[ \] Build shortcut help modal  
\- \[ \] Add customizable key bindings

\#\#\# Feature 11.3: Onboarding & Tutorials  
\*\*Purpose\*\*: Guide new users through pipeline  
\- \[ \] Create first-time user onboarding flow  
\- \[ \] Build interactive tutorial overlays  
\- \[ \] Implement contextual help tooltips  
\- \[ \] Add video tutorial embeds  
\- \[ \] Create example project templates

\#\#\# Feature 11.4: Advanced Editing Tools  
\*\*Purpose\*\*: Enhance content creation experience  
\- \[ \] Add markdown support in text editors  
\- \[ \] Implement syntax highlighting for scripts  
\- \[ \] Create collaborative editing (real-time)  
\- \[ \] Build version diffing visualization  
\- \[ \] Add advanced search across content

\#\#\# Feature 11.5: Mobile Responsiveness  
\*\*Purpose\*\*: Usable interface on smaller screens  
\- \[ \] Optimize layout for tablet screens  
\- \[ \] Create mobile-friendly navigation  
\- \[ \] Implement touch-optimized controls  
\- \[ \] Add mobile-specific UI patterns  
\- \[ \] Test across device sizes

\*\*Deliverable\*\*: A polished, professional interface with smooth animations, helpful guidance for new users, and power-user features for efficiency.

\---

\#\# Phase 12: Export & Project Finalization

\*\*Goal\*\*: Enable users to export completed projects in professional formats for external editing.

\#\#\# Feature 12.1: Video Export System  
\*\*Purpose\*\*: Package final video assets  
\- \[ \] Implement high-bitrate video export  
\- \[ \] Create project export API endpoint  
\- \[ \] Build export job queue  
\- \[ \] Add export format options (MP4, ProRes, etc.)  
\- \[ \] Implement export progress tracking

\#\#\# Feature 12.2: NLE Integration  
\*\*Purpose\*\*: Export for DaVinci Resolve/Premiere  
\- \[ \] Generate EDL/XML files from scene sequence  
\- \[ \] Implement standardized file naming  
\- \[ \] Create folder structure for NLE import  
\- \[ \] Add timecode generation  
\- \[ \] Build markers for shot boundaries

\#\#\# Feature 12.3: Asset Package Export  
\*\*Purpose\*\*: Export all project artifacts  
\- \[ \] Create ZIP archive generation  
\- \[ \] Include all videos, frames, scripts  
\- \[ \] Add project metadata file  
\- \[ \] Implement selective export (choose artifacts)  
\- \[ \] Build export history tracking

\#\#\# Feature 12.4: Audio Stems Separation  
\*\*Purpose\*\*: Separate audio tracks for mixing  
\- \[ \] Implement dialogue track extraction  
\- \[ \] Create SFX track separation  
\- \[ \] Add music track export  
\- \[ \] Build multi-track audio export  
\- \[ \] Implement audio sync validation

\#\#\# Feature 12.5: Project Archival  
\*\*Purpose\*\*: Long-term storage and backup  
\- \[ \] Create project archive format  
\- \[ \] Implement project backup system  
\- \[ \] Add cloud storage integration (S3)  
\- \[ \] Build project restoration from archive  
\- \[ \] Implement version-specific archives

\*\*Deliverable\*\*: Users can export complete projects in professional formats, import into industry-standard editing software, and archive projects for long-term storage.

\---

\#\# Phase 13: Performance Optimization

\*\*Goal\*\*: Optimize application performance for production scale. Handle large projects efficiently.

\#\#\# Feature 13.1: Frontend Performance  
\*\*Purpose\*\*: Fast, responsive UI  
\- \[ \] Implement code splitting by route  
\- \[ \] Add lazy loading for heavy components  
\- \[ \] Optimize React Query cache strategies  
\- \[ \] Implement virtual scrolling for long lists  
\- \[ \] Add service worker for offline capability

\#\#\# Feature 13.2: Database Query Optimization  
\*\*Purpose\*\*: Fast data retrieval at scale  
\- \[ \] Add database indexes for hot queries  
\- \[ \] Implement query result caching  
\- \[ \] Optimize N+1 query patterns  
\- \[ \] Add database connection pooling  
\- \[ \] Implement read replicas for scaling

\#\#\# Feature 13.3: API Response Optimization  
\*\*Purpose\*\*: Minimize API latency  
\- \[ \] Implement response compression  
\- \[ \] Add API response caching (Redis)  
\- \[ \] Optimize payload sizes  
\- \[ \] Implement pagination for large datasets  
\- \[ \] Add GraphQL layer (optional)

\#\#\# Feature 13.4: Asset Delivery Optimization  
\*\*Purpose\*\*: Fast image/video loading  
\- \[ \] Implement CDN for asset delivery  
\- \[ \] Add image optimization pipeline  
\- \[ \] Create progressive image loading  
\- \[ \] Implement video streaming (HLS/DASH)  
\- \[ \] Add thumbnail generation service

\#\#\# Feature 13.5: Background Job Optimization  
\*\*Purpose\*\*: Efficient async processing  
\- \[ \] Optimize job queue performance  
\- \[ \] Implement job prioritization  
\- \[ \] Add job batching for bulk operations  
\- \[ \] Create job monitoring dashboard  
\- \[ \] Implement dead letter queue handling

\*\*Deliverable\*\*: Application performs well under load, handles large projects efficiently, and provides fast response times across all operations.

\---

\#\# Phase 14: Monitoring & Observability

\*\*Goal\*\*: Implement comprehensive monitoring and debugging tools for production operations.

\#\#\# Feature 14.1: Application Monitoring  
\*\*Purpose\*\*: Track application health and performance  
\- \[ \] Integrate error tracking (Sentry/similar)  
\- \[ \] Add performance monitoring (APM)  
\- \[ \] Implement uptime monitoring  
\- \[ \] Create health check endpoints  
\- \[ \] Build alerting system for incidents

\#\#\# Feature 14.2: LLM Observability (LangSmith)  
\*\*Purpose\*\*: Debug AI generation quality  
\- \[ \] Integrate LangSmith tracing  
\- \[ \] Add prompt/response logging  
\- \[ \] Implement RAG retrieval tracking  
\- \[ \] Create LLM performance metrics  
\- \[ \] Build prompt experiment tracking

\#\#\# Feature 14.3: Cost Analytics  
\*\*Purpose\*\*: Monitor and optimize AI spending  
\- \[ \] Implement cost tracking per operation  
\- \[ \] Create cost analytics dashboard  
\- \[ \] Add per-user cost reporting  
\- \[ \] Build budget alerts  
\- \[ \] Implement cost anomaly detection

\#\#\# Feature 14.4: User Analytics  
\*\*Purpose\*\*: Understand user behavior and pain points  
\- \[ \] Integrate analytics platform (PostHog/similar)  
\- \[ \] Track key user actions  
\- \[ \] Implement funnel analysis  
\- \[ \] Add session recording  
\- \[ \] Create user feedback system

\#\#\# Feature 14.5: Audit Logging  
\*\*Purpose\*\*: Track all system changes for compliance  
\- \[ \] Implement audit log table  
\- \[ \] Add logging for all mutations  
\- \[ \] Create audit log viewer  
\- \[ \] Build compliance reporting  
\- \[ \] Implement log retention policies

\*\*Deliverable\*\*: Comprehensive visibility into application health, AI performance, costs, and user behavior. Tools to debug issues and optimize operations.

\---

\#\# Phase 15: Advanced AI Features

\*\*Goal\*\*: Enhance AI capabilities with advanced features like voice consistency, enhanced continuity, and creative tools.

\#\#\# Feature 15.1: Voice Gallery System  
\*\*Purpose\*\*: Consistent character voices across shots  
\- \[ \] Integrate ElevenLabs or similar voice API  
\- \[ \] Create voice profile database  
\- \[ \] Build voice selection UI in Stage 5  
\- \[ \] Implement voice seed in video prompts  
\- \[ \] Add voice preview/testing tools

\#\#\# Feature 15.2: Enhanced Continuity Checking  
\*\*Purpose\*\*: Automatic visual consistency validation  
\- \[ \] Implement AI-based visual similarity scoring  
\- \[ \] Create automated continuity flag generation  
\- \[ \] Build visual change detection system  
\- \[ \] Add automatic correction suggestions  
\- \[ \] Implement continuity confidence scores

\#\#\# Feature 15.3: Smart Prompt Optimization  
\*\*Purpose\*\*: AI-assisted prompt improvement  
\- \[ \] Build prompt analysis agent  
\- \[ \] Implement prompt improvement suggestions  
\- \[ \] Create A/B testing for prompts  
\- \[ \] Add prompt library with examples  
\- \[ \] Build prompt effectiveness scoring

\#\#\# Feature 15.4: Creative Brainstorming Tools  
\*\*Purpose\*\*: AI-powered ideation assistance  
\- \[ \] Implement beat brainstorming agent  
\- \[ \] Create character development assistant  
\- \[ \] Build plot hole detection  
\- \[ \] Add narrative structure analyzer  
\- \[ \] Implement alternative ending generator

\#\#\# Feature 15.5: Multi-Model Routing  
\*\*Purpose\*\*: Cost-aware model selection  
\- \[ \] Implement model capability matrix  
\- \[ \] Create cost/quality optimizer  
\- \[ \] Build automatic model selection  
\- \[ \] Add manual model override  
\- \[ \] Implement model performance tracking

\*\*Deliverable\*\*: Advanced AI features that improve output quality, reduce manual work, and provide creative assistance throughout the pipeline.

\---

\#\# Phase 16: Collaboration & Teams

\*\*Goal\*\*: Enable multi-user collaboration on projects. Support team workflows and permissions.

\#\#\# Feature 16.1: Team Management  
\*\*Purpose\*\*: Organize users into teams  
\- \[ \] Implement teams table and API  
\- \[ \] Create team creation/management UI  
\- \[ \] Add user invitation system  
\- \[ \] Build role-based permissions  
\- \[ \] Implement team switching

\#\#\# Feature 16.2: Project Sharing  
\*\*Purpose\*\*: Share projects with team members  
\- \[ \] Add project sharing permissions  
\- \[ \] Implement share link generation  
\- \[ \] Create permission levels (view/edit/admin)  
\- \[ \] Build access revocation  
\- \[ \] Add share notification system

\#\#\# Feature 16.3: Real-time Collaboration  
\*\*Purpose\*\*: Multiple users editing simultaneously  
\- \[ \] Integrate WebSocket server  
\- \[ \] Implement presence indicators  
\- \[ \] Add live cursor tracking  
\- \[ \] Build conflict resolution  
\- \[ \] Create collaboration activity feed

\#\#\# Feature 16.4: Comments & Annotations  
\*\*Purpose\*\*: Feedback and review system  
\- \[ \] Implement comments table  
\- \[ \] Create comment thread UI  
\- \[ \] Add @mention notifications  
\- \[ \] Build comment resolution workflow  
\- \[ \] Implement comment filtering

\#\#\# Feature 16.5: Approval Workflows  
\*\*Purpose\*\*: Formal review and approval process  
\- \[ \] Create approval request system  
\- \[ \] Build approval status tracking  
\- \[ \] Implement approver notifications  
\- \[ \] Add approval history  
\- \[ \] Create custom approval workflows

\*\*Deliverable\*\*: Teams can collaborate on projects, leave feedback, work simultaneously, and manage formal approval processes.

\---

\#\# Phase 17: Enterprise Features

\*\*Goal\*\*: Add features for enterprise customers: SSO, audit logs, custom models, advanced security.

\#\#\# Feature 17.1: Single Sign-On (SSO)  
\*\*Purpose\*\*: Enterprise authentication integration  
\- \[ \] Implement SAML 2.0 support  
\- \[ \] Add OAuth 2.0 providers (Google, Microsoft, Okta)  
\- \[ \] Create SSO configuration UI for admins  
\- \[ \] Build user provisioning automation  
\- \[ \] Add SSO session management

\#\#\# Feature 17.2: Advanced Audit Logging  
\*\*Purpose\*\*: Comprehensive compliance and security tracking  
\- \[ \] Implement detailed action logging (CRUD operations)  
\- \[ \] Create audit log export functionality  
\- \[ \] Build audit log search and filtering  
\- \[ \] Add compliance report generation  
\- \[ \] Implement immutable audit trail

\#\#\# Feature 17.3: Custom Model Integration  
\*\*Purpose\*\*: Enterprise-specific AI model deployment  
\- \[ \] Create custom model registration system  
\- \[ \] Implement private model API routing  
\- \[ \] Build model performance benchmarking  
\- \[ \] Add model cost configuration  
\- \[ \] Create model access controls

\#\#\# Feature 17.4: Data Residency Controls  
\*\*Purpose\*\*: Region-specific data storage for compliance  
\- \[ \] Implement multi-region storage routing  
\- \[ \] Create data residency policy configuration  
\- \[ \] Build region-specific database instances  
\- \[ \] Add data migration tools  
\- \[ \] Implement compliance reporting by region

\#\#\# Feature 17.5: Advanced Security Features  
\*\*Purpose\*\*: Enterprise-grade security controls  
\- \[ \] Implement IP whitelisting  
\- \[ \] Add two-factor authentication (2FA)  
\- \[ \] Create session timeout policies  
\- \[ \] Build security audit dashboard  
\- \[ \] Implement data encryption at rest

\*\*Deliverable\*\*: Enterprise customers can integrate their SSO systems, meet compliance requirements with audit logs, deploy custom AI models, control data residency, and enforce advanced security policies.

\---

\#\# Phase 18: Scalability & Infrastructure

\*\*Goal\*\*: Prepare application for high-scale production use. Handle thousands of concurrent users and large projects.

\#\#\# Feature 18.1: Horizontal Scaling  
\*\*Purpose\*\*: Scale backend services independently  
\- \[ \] Implement stateless API server design  
\- \[ \] Add load balancer configuration  
\- \[ \] Create auto-scaling policies  
\- \[ \] Build service discovery (Consul/similar)  
\- \[ \] Implement graceful shutdown handling

\#\#\# Feature 18.2: Database Sharding  
\*\*Purpose\*\*: Distribute data across multiple database instances  
\- \[ \] Design sharding key strategy (by user/project)  
\- \[ \] Implement database router layer  
\- \[ \] Add shard management tools  
\- \[ \] Build cross-shard query optimization  
\- \[ \] Create shard rebalancing system

\#\#\# Feature 18.3: Caching Strategy  
\*\*Purpose\*\*: Reduce database load and improve response times  
\- \[ \] Implement Redis for session caching  
\- \[ \] Add query result caching layer  
\- \[ \] Create cache invalidation logic  
\- \[ \] Build cache warming strategies  
\- \[ \] Implement distributed cache (Redis Cluster)

\#\#\# Feature 18.4: Message Queue System  
\*\*Purpose\*\*: Decouple services and handle async workloads  
\- \[ \] Implement message broker (RabbitMQ/Kafka)  
\- \[ \] Create message producer/consumer patterns  
\- \[ \] Add message retry and dead letter handling  
\- \[ \] Build message monitoring dashboard  
\- \[ \] Implement message prioritization

\#\#\# Feature 18.5: Infrastructure as Code  
\*\*Purpose\*\*: Reproducible, version-controlled infrastructure  
\- \[ \] Implement Terraform configurations  
\- \[ \] Create Docker containers for all services  
\- \[ \] Add Kubernetes deployment manifests  
\- \[ \] Build CI/CD pipeline automation  
\- \[ \] Implement blue-green deployment strategy

\*\*Deliverable\*\*: Application infrastructure can scale horizontally, handle high traffic loads, and is fully automated with infrastructure as code for reliable deployments.

\---

\#\# Phase 19: Advanced Export & Integration

\*\*Goal\*\*: Expand export capabilities and integrate with external creative tools and platforms.

\#\#\# Feature 19.1: Advanced Video Formats  
\*\*Purpose\*\*: Support professional post-production workflows  
\- \[ \] Add ProRes export support  
\- \[ \] Implement DNxHD codec support  
\- \[ \] Create resolution upscaling options  
\- \[ \] Build color grading presets  
\- \[ \] Add HDR video export

\#\#\# Feature 19.2: Third-Party Integrations  
\*\*Purpose\*\*: Connect with creative ecosystem  
\- \[ \] Integrate with Frame.io for review  
\- \[ \] Add YouTube direct upload  
\- \[ \] Implement Vimeo integration  
\- \[ \] Create Dropbox/Google Drive export  
\- \[ \] Build custom webhook system

\#\#\# Feature 19.3: API for External Tools  
\*\*Purpose\*\*: Enable programmatic access  
\- \[ \] Create public REST API with documentation  
\- \[ \] Implement API key management  
\- \[ \] Add rate limiting per API key  
\- \[ \] Build SDK libraries (Python, JavaScript)  
\- \[ \] Create API usage analytics

\#\#\# Feature 19.4: Batch Processing  
\*\*Purpose\*\*: Handle multiple projects simultaneously  
\- \[ \] Implement batch project creation  
\- \[ \] Add bulk regeneration operations  
\- \[ \] Create batch export functionality  
\- \[ \] Build batch status tracking  
\- \[ \] Implement batch operation scheduling

\#\#\# Feature 19.5: Template Marketplace  
\*\*Purpose\*\*: Share and monetize project templates  
\- \[ \] Create template submission system  
\- \[ \] Build template marketplace UI  
\- \[ \] Implement template preview  
\- \[ \] Add template ratings and reviews  
\- \[ \] Create revenue sharing system

\*\*Deliverable\*\*: Users can export in professional formats, integrate with external tools, access functionality via API, perform batch operations, and share/monetize templates.

\---

\#\# Phase 20: AI Model Training & Customization

\*\*Goal\*\*: Enable users to fine-tune models on their own content for personalized results.

\#\#\# Feature 20.1: Custom Model Training Infrastructure  
\*\*Purpose\*\*: Fine-tune models on user data  
\- \[ \] Set up GPU training infrastructure  
\- \[ \] Implement training job queue system  
\- \[ \] Create training data preparation pipeline  
\- \[ \] Build model versioning system  
\- \[ \] Add training progress monitoring

\#\#\# Feature 20.2: Style Transfer Training  
\*\*Purpose\*\*: Train models on user's visual style  
\- \[ \] Implement image dataset upload  
\- \[ \] Create LoRA training pipeline  
\- \[ \] Build style model testing interface  
\- \[ \] Add style model deployment  
\- \[ \] Implement style model versioning

\#\#\# Feature 20.3: Character Consistency Training  
\*\*Purpose\*\*: Fine-tune models for consistent character appearance  
\- \[ \] Create character image dataset builder  
\- \[ \] Implement character embedding training  
\- \[ \] Build character model testing  
\- \[ \] Add character model to generation pipeline  
\- \[ \] Create character model sharing

\#\#\# Feature 20.4: Dialogue Style Training  
\*\*Purpose\*\*: Train text models on user's writing style  
\- \[ \] Implement text corpus upload  
\- \[ \] Create dialogue model fine-tuning  
\- \[ \] Build dialogue style testing  
\- \[ \] Add custom model selection in pipeline  
\- \[ \] Implement model performance comparison

\#\#\# Feature 20.5: Model Management Dashboard  
\*\*Purpose\*\*: Centralized custom model control  
\- \[ \] Create model inventory view  
\- \[ \] Build model performance metrics  
\- \[ \] Add model A/B testing  
\- \[ \] Implement model deprecation workflow  
\- \[ \] Create model usage analytics

\*\*Deliverable\*\*: Advanced users can train custom models on their content for personalized visual styles, consistent characters, and unique dialogue patterns.

\---

\#\# Phase 21: Advanced Continuity & Quality Control

\*\*Goal\*\*: Implement sophisticated continuity checking and quality assurance tools.

\#\#\# Feature 21.1: AI-Powered Continuity Analysis  
\*\*Purpose\*\*: Automated detection of continuity errors  
\- \[ \] Implement visual consistency scoring  
\- \[ \] Create character appearance tracking  
\- \[ \] Build prop position validation  
\- \[ \] Add lighting consistency checking  
\- \[ \] Implement automated flagging system

\#\#\# Feature 21.2: Quality Scoring System  
\*\*Purpose\*\*: Evaluate generation quality automatically  
\- \[ \] Create image quality metrics (sharpness, artifacts)  
\- \[ \] Implement video quality scoring  
\- \[ \] Build dialogue clarity detection  
\- \[ \] Add automated retake suggestions  
\- \[ \] Create quality threshold alerts

\#\#\# Feature 21.3: Smart Regeneration  
\*\*Purpose\*\*: Targeted regeneration based on quality issues  
\- \[ \] Implement issue-to-parameter mapping  
\- \[ \] Create automatic prompt adjustment  
\- \[ \] Build progressive refinement system  
\- \[ \] Add smart retry with variation  
\- \[ \] Implement convergence detection

\#\#\# Feature 21.4: Scene Preview System  
\*\*Purpose\*\*: Fast preview rendering for iteration  
\- \[ \] Implement low-res preview generation  
\- \[ \] Create animatic-style scene preview  
\- \[ \] Build quick frame interpolation  
\- \[ \] Add preview-to-final upgrade  
\- \[ \] Implement preview caching

\#\#\# Feature 21.5: Automated QA Pipeline  
\*\*Purpose\*\*: Systematic quality checks before approval  
\- \[ \] Create pre-flight check system  
\- \[ \] Implement automated validation rules  
\- \[ \] Build quality gate configuration  
\- \[ \] Add QA report generation  
\- \[ \] Create exception approval workflow

\*\*Deliverable\*\*: Sophisticated quality control systems automatically detect issues, suggest fixes, and ensure high-quality output before expensive generation operations.

\---

\#\# Phase 22: Enhanced User Experience

\*\*Goal\*\*: Refine and enhance user interface based on feedback and usage patterns.

\#\#\# Feature 22.1: Customizable Workspace  
\*\*Purpose\*\*: Personalized UI layout  
\- \[ \] Implement drag-and-drop dashboard layout  
\- \[ \] Create customizable sidebar  
\- \[ \] Add panel resizing and docking  
\- \[ \] Build workspace presets (Director, Writer, etc.)  
\- \[ \] Implement workspace sync across devices

\#\#\# Feature 22.2: Advanced Search & Navigation  
\*\*Purpose\*\*: Quick access to content across large projects  
\- \[ \] Implement full-text search across all content  
\- \[ \] Create fuzzy search with relevance ranking  
\- \[ \] Build search filters and facets  
\- \[ \] Add recent items and favorites  
\- \[ \] Implement keyboard-driven navigation

\#\#\# Feature 22.3: Smart Suggestions  
\*\*Purpose\*\*: AI-powered workflow assistance  
\- \[ \] Implement context-aware suggestions  
\- \[ \] Create next-action recommendations  
\- \[ \] Build smart template suggestions  
\- \[ \] Add workflow optimization tips  
\- \[ \] Implement learning from user behavior

\#\#\# Feature 22.4: Rich Media Preview  
\*\*Purpose\*\*: Enhanced content preview capabilities  
\- \[ \] Create inline video player with scrubbing  
\- \[ \] Implement image comparison sliders  
\- \[ \] Build script reader view with audio  
\- \[ \] Add storyboard visualization  
\- \[ \] Create timeline overview with thumbnails

\#\#\# Feature 22.5: Accessibility Improvements  
\*\*Purpose\*\*: Make application accessible to all users  
\- \[ \] Implement WCAG 2.1 AA compliance  
\- \[ \] Add screen reader support  
\- \[ \] Create keyboard navigation for all features  
\- \[ \] Build high-contrast theme  
\- \[ \] Implement text-to-speech for scripts

\*\*Deliverable\*\*: A highly customizable, accessible interface with intelligent suggestions and powerful search capabilities that adapt to user preferences and working styles.

\---

\#\# Phase 23: Mobile & Cross-Platform

\*\*Goal\*\*: Extend application to mobile devices and native apps for better performance.

\#\#\# Feature 23.1: Progressive Web App (PWA)  
\*\*Purpose\*\*: Installable web app with offline capability  
\- \[ \] Implement service worker with caching  
\- \[ \] Add offline mode for viewing projects  
\- \[ \] Create app manifest for installation  
\- \[ \] Build push notification support  
\- \[ \] Implement background sync

\#\#\# Feature 23.2: Mobile-Optimized Interface  
\*\*Purpose\*\*: Full-featured mobile experience  
\- \[ \] Redesign navigation for mobile  
\- \[ \] Create touch-optimized controls  
\- \[ \] Implement mobile-specific gestures  
\- \[ \] Build responsive video player  
\- \[ \] Add mobile asset management

\#\#\# Feature 23.3: Native Mobile Apps (iOS/Android)  
\*\*Purpose\*\*: Enhanced mobile performance  
\- \[ \] Set up React Native project structure  
\- \[ \] Implement native authentication  
\- \[ \] Create native video player  
\- \[ \] Build offline-first sync system  
\- \[ \] Add mobile push notifications

\#\#\# Feature 23.4: Desktop Applications  
\*\*Purpose\*\*: Native apps for Mac/Windows/Linux  
\- \[ \] Set up Electron project structure  
\- \[ \] Implement local file system access  
\- \[ \] Create native menu integration  
\- \[ \] Build auto-update system  
\- \[ \] Add system tray integration

\#\#\# Feature 23.5: Tablet-Optimized Experience  
\*\*Purpose\*\*: Leveraging larger mobile screens  
\- \[ \] Create split-view layouts for tablets  
\- \[ \] Implement Apple Pencil support (iPad)  
\- \[ \] Build stylus input for annotations  
\- \[ \] Add tablet-specific workflows  
\- \[ \] Implement drag-and-drop between apps

\*\*Deliverable\*\*: Full-featured mobile and native applications that enable users to work on projects from any device with optimized interfaces and offline capabilities.

\---

\#\# Phase 24: Analytics & Insights

\*\*Goal\*\*: Provide users with insights into their creative process and project metrics.

\#\#\# Feature 24.1: Project Analytics Dashboard  
\*\*Purpose\*\*: Visualize project progress and metrics  
\- \[ \] Create project statistics overview  
\- \[ \] Build timeline visualization  
\- \[ \] Implement cost breakdown charts  
\- \[ \] Add stage completion metrics  
\- \[ \] Create productivity analytics

\#\#\# Feature 24.2: Creative Insights  
\*\*Purpose\*\*: Analyze creative patterns and trends  
\- \[ \] Implement genre/tone analysis  
\- \[ \] Create character development tracking  
\- \[ \] Build narrative structure visualization  
\- \[ \] Add pacing analysis  
\- \[ \] Implement dialogue analytics

\#\#\# Feature 24.3: Performance Metrics  
\*\*Purpose\*\*: Track generation performance and efficiency  
\- \[ \] Create generation success rate tracking  
\- \[ \] Build quality score trends  
\- \[ \] Implement regeneration frequency analysis  
\- \[ \] Add time-to-completion metrics  
\- \[ \] Create efficiency recommendations

\#\#\# Feature 24.4: Comparative Analytics  
\*\*Purpose\*\*: Compare projects and identify best practices  
\- \[ \] Implement cross-project comparison  
\- \[ \] Create benchmark metrics  
\- \[ \] Build best practice identification  
\- \[ \] Add template effectiveness analysis  
\- \[ \] Implement A/B test results

\#\#\# Feature 24.5: Export & Reporting  
\*\*Purpose\*\*: Generate reports for stakeholders  
\- \[ \] Create custom report builder  
\- \[ \] Implement PDF report generation  
\- \[ \] Add scheduled report delivery  
\- \[ \] Build shareable dashboard links  
\- \[ \] Create presentation mode

\*\*Deliverable\*\*: Comprehensive analytics providing insights into creative process, project efficiency, costs, and patterns that help users improve their workflow.

\---

\#\# Phase 25: Community & Social Features

\*\*Goal\*\*: Build community features for sharing, learning, and collaboration.

\#\#\# Feature 25.1: Public Project Gallery  
\*\*Purpose\*\*: Showcase community work  
\- \[ \] Create public project submission system  
\- \[ \] Build gallery browsing interface  
\- \[ \] Implement project likes and bookmarks  
\- \[ \] Add featured projects section  
\- \[ \] Create curator tools

\#\#\# Feature 25.2: Social Sharing  
\*\*Purpose\*\*: Share work on social platforms  
\- \[ \] Implement social media sharing buttons  
\- \[ \] Create optimized preview cards  
\- \[ \] Build share tracking analytics  
\- \[ \] Add embedded player for external sites  
\- \[ \] Implement viral loop mechanics

\#\#\# Feature 25.3: Community Forums  
\*\*Purpose\*\*: User discussion and support  
\- \[ \] Create forum/discussion board system  
\- \[ \] Implement topic categorization  
\- \[ \] Build moderation tools  
\- \[ \] Add reputation/karma system  
\- \[ \] Create expert badges

\#\#\# Feature 25.4: Tutorial & Learning System  
\*\*Purpose\*\*: User-generated educational content  
\- \[ \] Create tutorial creation tools  
\- \[ \] Build interactive tutorial player  
\- \[ \] Implement tutorial discovery  
\- \[ \] Add tutorial ratings and feedback  
\- \[ \] Create certification program

\#\#\# Feature 25.5: Challenges & Contests  
\*\*Purpose\*\*: Engage community with creative challenges  
\- \[ \] Implement challenge creation system  
\- \[ \] Build submission and voting interface  
\- \[ \] Create leaderboard system  
\- \[ \] Add prize/reward distribution  
\- \[ \] Implement challenge archives

\*\*Deliverable\*\*: Vibrant community features that enable users to share work, learn from each other, and participate in creative challenges.

\---

\#\# Phase 26: Localization & Internationalization

\*\*Goal\*\*: Make application accessible to global users in multiple languages and regions.

\#\#\# Feature 26.1: Multi-Language Support  
\*\*Purpose\*\*: Translate application interface  
\- \[ \] Implement i18n framework (react-i18next)  
\- \[ \] Extract all UI strings to translation files  
\- \[ \] Create translation management system  
\- \[ \] Add language selector UI  
\- \[ \] Implement dynamic language switching

\#\#\# Feature 26.2: Content Translation  
\*\*Purpose\*\*: Translate generated content  
\- \[ \] Integrate translation API (Google Translate/DeepL)  
\- \[ \] Add content translation workflow  
\- \[ \] Implement bilingual script editing  
\- \[ \] Create translation memory system  
\- \[ \] Add language-specific style RAG

\#\#\# Feature 26.3: Regional Adaptations  
\*\*Purpose\*\*: Customize for different markets  
\- \[ \] Implement region-specific content guidelines  
\- \[ \] Create cultural sensitivity checks  
\- \[ \] Add region-specific payment methods  
\- \[ \] Implement local currency support  
\- \[ \] Create region-specific templates

\#\#\# Feature 26.4: Multi-Language AI Models  
\*\*Purpose\*\*: Support content generation in multiple languages  
\- \[ \] Integrate multi-language LLMs  
\- \[ \] Implement language-specific prompt templates  
\- \[ \] Create language detection system  
\- \[ \] Add cross-language consistency checking  
\- \[ \] Build language-specific quality metrics

\#\#\# Feature 26.5: Localization Management  
\*\*Purpose\*\*: Manage translations at scale  
\- \[ \] Create translator portal  
\- \[ \] Implement translation workflow  
\- \[ \] Build translation quality review  
\- \[ \] Add translation versioning  
\- \[ \] Create localization analytics

\*\*Deliverable\*\*: Fully localized application supporting multiple languages with region-specific adaptations and AI models for global content creation.

\---

\#\# Phase 27: Legal & Compliance

\*\*Goal\*\*: Implement features to ensure legal compliance and protect intellectual property.

\#\#\# Feature 27.1: Copyright Protection  
\*\*Purpose\*\*: Protect user-generated content  
\- \[ \] Implement content watermarking  
\- \[ \] Create copyright registration workflow  
\- \[ \] Build DMCA takedown handling  
\- \[ \] Add usage rights management  
\- \[ \] Implement content provenance tracking

\#\#\# Feature 27.2: Terms of Service & Licensing  
\*\*Purpose\*\*: Clear legal agreements and licensing  
\- \[ \] Create customizable TOS system  
\- \[ \] Implement end-user license agreements (EULA)  
\- \[ \] Build content licensing options  
\- \[ \] Add commercial use restrictions  
\- \[ \] Create license verification system

\#\#\# Feature 27.3: GDPR Compliance  
\*\*Purpose\*\*: European data protection compliance  
\- \[ \] Implement data export functionality  
\- \[ \] Create "right to be forgotten" workflow  
\- \[ \] Build consent management  
\- \[ \] Add data processing agreements  
\- \[ \] Implement privacy policy management

\#\#\# Feature 27.4: Content Moderation  
\*\*Purpose\*\*: Ensure platform safety and compliance  
\- \[ \] Implement AI content moderation  
\- \[ \] Create human review queue  
\- \[ \] Build content flagging system  
\- \[ \] Add automated policy enforcement  
\- \[ \] Implement appeal workflow

\#\#\# Feature 27.5: Age Verification & Parental Controls  
\*\*Purpose\*\*: Protect minors and comply with regulations  
\- \[ \] Implement age verification system  
\- \[ \] Create parental consent workflow  
\- \[ \] Build content rating system  
\- \[ \] Add parental control dashboard  
\- \[ \] Implement age-appropriate content filtering

\*\*Deliverable\*\*: Comprehensive legal and compliance features ensuring platform safety, protecting intellectual property, and meeting regulatory requirements.

\---

\#\# Phase 28: Testing & Quality Assurance

\*\*Goal\*\*: Implement comprehensive testing infrastructure for reliability and quality.

\#\#\# Feature 28.1: Unit Testing Coverage  
\*\*Purpose\*\*: Test individual components and functions  
\- \[ \] Implement Jest/Vitest test framework  
\- \[ \] Create tests for all utility functions  
\- \[ \] Build component unit tests  
\- \[ \] Add service layer tests  
\- \[ \] Achieve 80%+ code coverage

\#\#\# Feature 28.2: Integration Testing  
\*\*Purpose\*\*: Test component interactions  
\- \[ \] Create API integration tests  
\- \[ \] Build database integration tests  
\- \[ \] Implement third-party service tests  
\- \[ \] Add workflow integration tests  
\- \[ \] Create test data factories

\#\#\# Feature 28.3: End-to-End Testing  
\*\*Purpose\*\*: Test complete user workflows  
\- \[ \] Implement Playwright/Cypress framework  
\- \[ \] Create critical path E2E tests  
\- \[ \] Build multi-stage workflow tests  
\- \[ \] Add visual regression testing  
\- \[ \] Implement cross-browser testing

\#\#\# Feature 28.4: Performance Testing  
\*\*Purpose\*\*: Ensure application performance  
\- \[ \] Implement load testing (k6/Artillery)  
\- \[ \] Create stress testing scenarios  
\- \[ \] Build performance benchmarking  
\- \[ \] Add performance regression detection  
\- \[ \] Implement continuous performance monitoring

\#\#\# Feature 28.5: Security Testing  
\*\*Purpose\*\*: Identify and fix security vulnerabilities  
\- \[ \] Implement automated security scanning  
\- \[ \] Create penetration testing protocols  
\- \[ \] Build dependency vulnerability checking  
\- \[ \] Add SQL injection testing  
\- \[ \] Implement OWASP Top 10 validation

\*\*Deliverable\*\*: Comprehensive testing infrastructure with high coverage ensuring application reliability, performance, and security.

\---

\#\# Phase 29: Documentation & Developer Experience

\*\*Goal\*\*: Create comprehensive documentation for users, developers, and API consumers.

\#\#\# Feature 29.1: User Documentation  
\*\*Purpose\*\*: Help users understand and use the platform  
\- \[ \] Create comprehensive user guide  
\- \[ \] Build interactive documentation  
\- \[ \] Implement contextual help system  
\- \[ \] Add video tutorials  
\- \[ \] Create FAQ and troubleshooting guides

\#\#\# Feature 29.2: API Documentation  
\*\*Purpose\*\*: Enable third-party developers  
\- \[ \] Create OpenAPI/Swagger specifications  
\- \[ \] Build interactive API explorer  
\- \[ \] Implement code examples in multiple languages  
\- \[ \] Add webhook documentation  
\- \[ \] Create API changelog

\#\#\# Feature 29.3: Developer Documentation  
\*\*Purpose\*\*: Enable contributions and integrations  
\- \[ \] Create architecture documentation  
\- \[ \] Build component library documentation (Storybook)  
\- \[ \] Implement code contribution guidelines  
\- \[ \] Add setup and development guides  
\- \[ \] Create plugin development documentation

\#\#\# Feature 29.4: Content Library  
\*\*Purpose\*\*: Educational resources and best practices  
\- \[ \] Create filmmaking best practices guide  
\- \[ \] Build prompt engineering guide  
\- \[ \] Implement case studies  
\- \[ \] Add workflow templates documentation  
\- \[ \] Create glossary of terms

\#\#\# Feature 29.5: Support System  
\*\*Purpose\*\*: Help users when documentation isn't enough  
\- \[ \] Create ticket support system  
\- \[ \] Implement live chat support  
\- \[ \] Build knowledge base  
\- \[ \] Add community support forums  
\- \[ \] Create escalation workflow

\*\*Deliverable\*\*: Comprehensive documentation ecosystem supporting users, developers, and integrators with clear guidance and support systems.

\---

\#\# Phase 30: Business Intelligence & Admin Tools

\*\*Goal\*\*: Provide administrators with tools to manage platform operations and business metrics.

\#\#\# Feature 30.1: Admin Dashboard  
\*\*Purpose\*\*: Central control panel for administrators  
\- \[ \] Create admin-only interface  
\- \[ \] Build user management tools  
\- \[ \] Implement system health monitoring  
\- \[ \] Add financial metrics overview  
\- \[ \] Create operational alerts

\#\#\# Feature 30.2: User Management  
\*\*Purpose\*\*: Manage user accounts and permissions  
\- \[ \] Implement user search and filtering  
\- \[ \] Create user impersonation for support  
\- \[ \] Build account suspension/deletion  
\- \[ \] Add usage quota management  
\- \[ \] Implement user segmentation

\#\#\# Feature 30.3: Financial Management  
\*\*Purpose\*\*: Track revenue and costs  
\- \[ \] Create revenue analytics dashboard  
\- \[ \] Build cost tracking by service  
\- \[ \] Implement margin analysis  
\- \[ \] Add subscription management  
\- \[ \] Create billing reconciliation

\#\#\# Feature 30.4: Content Moderation Tools  
\*\*Purpose\*\*: Review and moderate platform content  
\- \[ \] Create moderation queue  
\- \[ \] Build content review interface  
\- \[ \] Implement automated flagging rules  
\- \[ \] Add moderator workflow  
\- \[ \] Create moderation analytics

\#\#\# Feature 30.5: Platform Configuration  
\*\*Purpose\*\*: Manage platform settings and features  
\- \[ \] Create feature flag system  
\- \[ \] Build configuration management UI  
\- \[ \] Implement A/B test management  
\- \[ \] Add service provider switching  
\- \[ \] Create maintenance mode controls

\*\*Deliverable\*\*: Comprehensive admin tools enabling effective platform management, user support, financial oversight, and content moderation.

\---

\#\# Summary & Roadmap

This implementation plan progresses through 30 distinct phases, each building on previous work:

\*\*Foundation (Phases 0-1)\*\*: Basic infrastructure and MVP text pipeline  
\*\*Core Pipeline (Phases 2-9)\*\*: Complete 12-stage production pipeline  
\*\*Advanced Features (Phases 10-15)\*\*: Version control, polish, AI enhancements  
\*\*Enterprise & Scale (Phases 16-18)\*\*: Enterprise features and scalability  
\*\*Expansion (Phases 19-23)\*\*: Integrations, training, mobile, cross-platform  
\*\*Insights & Community (Phases 24-25)\*\*: Analytics and social features  
\*\*Global & Compliance (Phases 26-27)\*\*: Localization and legal compliance  
\*\*Quality & Documentation (Phases 28-29)\*\*: Testing and documentation  
\*\*Operations (Phase 30)\*\*: Admin tools and business intelligence

\*\*Estimated Timeline\*\*: 18-24 months for full implementation with a dedicated team

\*\*Critical Path\*\*: Phases 0-9 represent the core product and should be prioritized for initial launch

\*\*Post-Launch Priorities\*\*: Phases 10 (version control), 11 (polish), 13 (performance), and 14 (monitoring) are critical for production stability

This plan provides a clear, actionable roadmap from current state to a world-class AI film generation platform.  
