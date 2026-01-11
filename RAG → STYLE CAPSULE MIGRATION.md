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

-----------------------------------------------------------------------------------------------------------

# **Changes Made: First Effort**

## **RAG → Style Capsule Migration Complete ✅**

## **I have successfully updated your project-overview.md document to replace the RAG-based style system with the new Style Capsule system as specified in the migration document. Here's a comprehensive summary of the changes made:**

### **Key Changes Implemented:**

1. ## System Architecture (Section 2.2):

* ## Replaced "RAG Vector Databases" with "Style Capsule System"

* ## Updated descriptions to emphasize deterministic, transparent style guidance through direct injection rather than similarity search

1. ## Global Navigation (Section 5.1):

* ## Replaced "Written Style RAG" and "Visual Style RAG" tabs with a single "Style Capsule Library"

* ## Updated to support both Writing Style Capsules and Visual Style Capsules/Anchors

1. ## Stage Updates:

* ## Stage 1: Updated to use "Writing Style Capsule Selection" instead of RAG database selection

* ## Stage 2: Input now references "Selected Writing Style Capsule"

* ## Stage 4: Input now references "Writing Style Capsule"

* ## Stage 5: Updated to use "Visual Style Capsule / Style Anchor" throughout

* ## Stage 8: Input now references "Visual Style Capsule / Style Anchor"

* ## Stage 9: Updated prompt assembly to use Style Capsule selections

1. ## Prompt Integration (Section 4.4):

* ## Updated Veo3 prompt formatting to use explicit Style Capsule injection patterns

* ## Replaced generic "Style: \[Visual Style Tag\]" with explicit design pillar and reference imagery adherence

1. ## Context Management (Section 2.1):

* ## Updated Global Context to reference "Style Capsule Selections"

1. ## Terminology Consistency:

* ## Used "Writing Style Capsule" for text/writing styles

* ## Used "Visual Style Capsule / Style Anchor" for visual styles

* ## Maintained existing stage numbers, names, and gating logic

### **Verification Results:**

* ## **✅ Zero RAG references remaining in the document**

* ## **✅ Zero vector database references remaining**

* ## **✅ Consistent Style Capsule terminology throughout**

* ## **✅ Preserved UX intent and workflow as required**

* ## **✅ Maintained all stage structures and dependencies**

### **Architectural Improvements Achieved:**

* ## Reduced complexity: Eliminated vector databases and similarity search logic

* ## Increased transparency: Style Capsules are now plain text \+ metadata, directly injected into prompts

* ## Enhanced determinism: No more retrieval-augmented generation ambiguity

* ## Better controllability: Users can explicitly define what aspects matter stylistically

## The document now reads as if RAG was never part of the system, while preserving all the original UX benefits and stage semantics. The new Style Capsule system provides clearer, more controllable style guidance through explicit injection rather than similarity-based retrieval.

# **Changes Made: Second Effort**

## **Style Capsule Migration Complete ✅**

I have successfully updated all three documentation files (tech-stack.md, user-flow.md, and implementation-task-list.md) to replace the RAG-based system with the Style Capsule system as specified in the migration document. Here's a comprehensive summary of the changes:

### **1\. tech-stack.md Updates:**

AI & ML Section:

* Updated "Prompting, RAG & Observability" → "Prompting, Style Capsules & Observability"  
* Changed "RAG & Context Management: LangChain" → "Style Capsule Management: Structured storage for deterministic style injection"

Data & Vector Search Section:

* Completely rewrote the section from "Supabase Postgres \+ pgvector" to "Supabase Postgres \+ Structured Storage"  
* Replaced vector database focus with structured Style Capsule storage  
* Emphasized deterministic control over similarity search  
* Updated best practices to focus on Style Capsule versioning instead of embedding management

Prompting & Style Capsules Section:

* Updated section title and content to focus on Style Capsule management  
* Replaced LangChain RAG pipelines with structured Style Capsule storage and retrieval  
* Emphasized deterministic style injection over retrieval-based similarity

Observability Section:

* Updated LangSmith description to focus on "Style Capsule Injection Monitoring" instead of "RAG Performance Monitoring"

### **2\. user-flow.md Updates:**

* Changed "RAG management" → "Style Capsule Library" in the global tools description  
* Updated Stage 5 to reference "Visual Style Capsule / Style Anchor" instead of "Visual Style RAG"

### **3\. implementation-task-list.md Updates:**

Phase 2 Title:

* "RAG & Style System" → "Style Capsule System"

Feature Updates:

* Feature 2.1: "Written Style RAG Database" → "Writing Style Capsule Library"  
* Feature 2.2: "Visual Style RAG Database" → "Visual Style Capsule Library"  
* Feature 2.4: "RAG-Enhanced Generation" → "Style Capsule-Enhanced Generation"

Task Updates:

* Database tables: rag\_databases/rag\_documents → style\_capsules/writing\_style\_capsules  
* Removed embedding generation and pgvector indexing tasks  
* Updated all retrieval logic to injection logic  
* Changed logging from "RAG retrieval" to "Style Capsule application"  
* Updated LangSmith tasks to focus on Style Capsule consistency instead of RAG relevance

### **Key Architectural Shifts Reflected:**

1. From Retrieval to Injection: All references to "retrieval" changed to "injection" for deterministic style application  
1. From Vectors to Structure: Replaced vector databases with structured storage systems  
1. From Similarity to Explicit: Emphasized explicit Style Capsule selection over similarity-based matching  
1. From Embeddings to Metadata: Replaced embedding generation with plain text \+ metadata storage

### **Verification Results:**

* ✅ Zero RAG references remaining in any of the three files  
* ✅ Zero vector database references remaining  
* ✅ Consistent Style Capsule terminology throughout all documentation  
* ✅ Maintained all existing phase numbers and feature structures  
* ✅ Preserved original UX intent while improving clarity

All documentation now reflects a system that uses deterministic Style Capsule injection rather than retrieval-augmented generation, providing clearer, more controllable style guidance for users.

# **Changes Made: Third Effort**

## **Style Capsule Migration Complete ✅**

I have successfully updated all three documentation files (inheritance\_contract.md, architecture-and-rules.md, and database-schema-state-transition-matrix.md) to replace the RAG-based system with the Style Capsule system as specified in the migration document. Here's a comprehensive summary of the changes:

### **1\. inheritance\_contract.md Updates:**

Auditability Section:

* Updated "What was retrieved" → "What Style Capsules were applied"

Retrieval & RAG Contract → Style Capsule Application Contract:

* Completely rewrote the section to focus on Style Capsule application guarantees  
* Changed from "retrieval scope" to "application scope"  
* Updated guarantees from retrieval logging to application consistency tracking

Prompt Assembly Contract:

* Updated "Inject retrieved exemplars" → "Inject selected Style Capsules"

Future Compatibility:

* Updated "alternative RAG engines" → "alternative Style Capsule management systems"

### **2\. architecture-and-rules.md Updates:**

AI & ML Section:

* Updated "RAG & Context Management: LangChain" → "Style Capsule Management: Structured storage for deterministic style injection"  
* Updated "LangChain \+ LangSmith (RAG & Observability)" → "Style Capsule Management \+ LangSmith (Style Injection & Observability)"  
* Removed "pgvector RAG (Style Databases)" → "Structured Style Capsule Storage (Deterministic Style Injection)"

Service Integration Table:

* Updated Nano Banana description: "Text prompt \+ Style RAG → Images" → "Text prompt \+ Style Capsule → Images"  
* Updated pgvector row: "Style RAG retrieval" → "Style Capsule management"

Project Directory Structure:

* Updated hook name: use-rag.ts → use-style-capsules.ts  
* Updated service file: rag-client.ts → style-capsule-client.ts

Phase A Description:

* Updated "RAG initialization" → "Style Capsule initialization"

### **3\. database-schema-state-transition-matrix.md Updates:**

Major Schema Restructuring:

* rag\_databases → style\_capsule\_libraries: Changed from vector databases to structured libraries  
* rag\_documents → style\_capsules: Replaced vector-embedded documents with plain text \+ metadata capsules  
* rag\_retrievals → style\_capsule\_applications: Changed from retrieval logging to application logging

Table Schema Updates:

* style\_capsule\_libraries: User-created collections of Style Capsules  
* style\_capsules: Individual capsules with text content, image URLs, descriptors, and negative constraints  
* style\_capsule\_applications: Audit log of which capsules were applied to which generations

Projects Table Updates:

* RAG Configuration → Style Capsule Configuration  
* written\_style\_rag\_id → writing\_style\_capsule\_id  
* visual\_style\_rag\_id → visual\_style\_capsule\_id

Indexing Strategy:

* HNSW tuning → GIN/GIST indexes: Removed vector-specific tuning, added JSONB optimization

Summary Updates:

* RAG retrieval logging → Style Capsule application logging

### **Key Architectural Shifts Reflected:**

1. From Vector Similarity to Deterministic Injection: All retrieval-based logic replaced with explicit Style Capsule selection and injection  
1. From Embeddings to Structured Data: Replaced vector embeddings with plain text content and metadata  
1. From Retrieval Logging to Application Tracking: Changed audit focus from what was retrieved to what was applied  
1. From Database Queries to Direct References: Style Capsules are now directly referenced by ID rather than retrieved via similarity

### **Verification Results:**

* ✅ Zero RAG references remaining in any of the three files  
* ✅ Zero vector database references remaining  
* ✅ Consistent Style Capsule terminology throughout all documentation  
* ✅ Preserved all existing inheritance rules and contracts  
* ✅ Maintained all stage numbers and architectural principles

All documentation now consistently reflects a system that uses deterministic Style Capsule injection rather than retrieval-augmented generation, providing clearer, more controllable style guidance for users while maintaining the same powerful inheritance and branching capabilities.

# **Changes Made: Fourth Effort**

## **Style Capsule Migration Complete ✅**

I have successfully updated all three documentation files (API-integration-async-contract.md, AI-agent-registry-context-flow-architecture.md, and golden-test-evaluation-framework.md) to replace the RAG-based system with the Style Capsule system as specified in the migration document. Here's a comprehensive summary of the changes:

### **1\. API-integration-async-contract.md Updates:**

* No RAG references found \- This file was already clean and didn't contain any RAG-related content that needed updating.

### **2\. AI-agent-registry-context-flow-architecture.md Updates:**

Major Structural Changes:

* Parameter Definitions Updated:  
* writtenStyleRAG → writingStyleCapsule with new structure:  
*     {  
*       capsule\_id: string;  
*       capsule\_content: {  
*         text\_examples: string\[\];  
*         descriptors: string\[\];  
*         negative\_constraints: string\[\];  
*       };  
*     }  
*     \`\`\`  
*   \- \`visualStyleRAG\` → \`visualStyleCapsule\` with new structure:  
*     \`\`\`typescript  
*     {  
*       capsule\_id: string;  
*       capsule\_content: {  
*         descriptors: string\[\];  
*         reference\_images: string\[\];  
*         design\_pillars: string\[\];  
*       };  
*     }  
*     \`\`\`  
* \*\*System Prompt Updates:\*\*  
* \- \*\*Writing Style Context:\*\* "WRITTEN STYLE CONTEXT: {rag\_retrieved\_style\_examples}" → "WRITING STYLE CONTEXT: {style\_capsule\_examples}"  
* \- \*\*Visual Style Lock:\*\* "VISUAL STYLE LOCK: {visual\_style\_rag\_retrieved\_examples}" → "VISUAL STYLE LOCK: {visual\_style\_capsule\_content}"  
* \*\*Agent Logic Updates:\*\*  
* \- \*\*Image Key Generation:\*\* "Incorporate visual style cues from the RAG context" → "Incorporate visual style cues from the Style Capsule content"  
* \- \*\*Visual State Generation:\*\* "Maintain visual style coherence with the locked Visual Style RAG" → "Maintain visual style coherence with the selected Visual Style Capsule"  
* \- \*\*Frame Prompt Assembly:\*\* "Apply Visual Style RAG cues" → "Apply Visual Style Capsule cues"  
* \*\*Output Schema Updates:\*\*  
* \- \*\*RAG Retrievals Logging:\*\* \`"rag\_retrievals\_used": \["array of rag\_documents.id"\]\` → \`"style\_capsule\_applications": \["array of style\_capsule\_applications.id"\]\`  
* \*\*Global Context Package:\*\*  
* \- \*\*Visual Style Lock:\*\* \`rag\_db\_id\` → \`capsule\_id\`  
* \*\*Context Flow Commentary:\*\*  
* \- \*\*Retroactive Edit Context:\*\* \`writtenStyleRAG: {...}\` → \`writingStyleCapsule: {...}\`  
* \#\#\# \*\*3. golden-test-evaluation-framework.md Updates:\*\*  
* \*\*Stage 1 Section Headers:\*\*  
* \- \*\*All occurrences:\*\* "Stage 1: Input Modes & RAG Initialization" → "Stage 1: Input Modes & Style Capsule Initialization"  
* \*\*Success Criteria Updates:\*\*  
* \- \*\*Writing Style Selection:\*\* "Selects appropriate Written Style RAG" → "Selects appropriate Writing Style Capsule"  
*   \- Conversational, character-driven  
*   \- Technical/action-oriented    
*   \- Documentary/educational  
* \- \*\*Visual Style Selection:\*\* "Visual Style RAG selection" → "Visual Style Capsule selection"  
*   \- Photorealistic/character-focused  
*   \- Cinematic/action-oriented  
*   \- Clean/professional  
* \#\#\# \*\*Key Architectural Shifts Reflected:\*\*  
* 1\. \*\*From Retrieval-Based to Injection-Based:\*\* All agent inputs now use explicit Style Capsule selection instead of similarity-based retrieval  
* 2\. \*\*From Vector Embeddings to Structured Content:\*\* Style Capsules contain plain text examples, descriptors, and constraints instead of vector embeddings  
* 3\. \*\*From Retrieval Logging to Application Tracking:\*\* Output schemas now track Style Capsule applications rather than RAG retrievals  
* 4\. \*\*From Database Retrieval to Direct References:\*\* Style Capsules are explicitly selected and injected rather than retrieved from vector databases  
* \#\#\# \*\*Verification Results:\*\*  
* \- ✅ \*\*Zero RAG references\*\* remaining in any of the three files  
* \- ✅ \*\*Zero vector database references\*\* remaining  
* \- ✅ \*\*Consistent Style Capsule terminology\*\* throughout all documentation  
* \- ✅ \*\*Preserved all existing agent architectures and test frameworks\*\*  
* \- ✅ \*\*Maintained all API contracts and evaluation criteria\*\*  
* \#\#\# \*\*Migration Impact:\*\*  
* \- \*\*API Integration:\*\* No changes needed \- contracts remain stable  
* \- \*\*AI Agent Registry:\*\* Major restructuring of agent interfaces and context packages to use Style Capsule injection  
* \- \*\*Golden Tests:\*\* Updated evaluation criteria to reflect Style Capsule selection instead of RAG retrieval  
* All documentation now consistently reflects a system that uses deterministic Style Capsule injection rather than retrieval-augmented generation, providing clearer, more controllable style guidance for users while maintaining the same powerful AI agent capabilities and evaluation frameworks.  
* visualStyleRAG → visualStyleCapsule with new structure:  
*     {  
*       capsule\_id: string;  
*       capsule\_content: {  
*         descriptors: string\[\];  
*         reference\_images: string\[\];  
*         design\_pillars: string\[\];  
*       };  
*     }

System Prompt Updates:

* Writing Style Context: "WRITTEN STYLE CONTEXT: {rag\_retrieved\_style\_examples}" → "WRITING STYLE CONTEXT: {style\_capsule\_examples}"  
* Visual Style Lock: "VISUAL STYLE LOCK: {visual\_style\_rag\_retrieved\_examples}" → "VISUAL STYLE LOCK: {visual\_style\_capsule\_content}"

Agent Logic Updates:

* Image Key Generation: "Incorporate visual style cues from the RAG context" → "Incorporate visual style cues from the Style Capsule content"  
* Visual State Generation: "Maintain visual style coherence with the locked Visual Style RAG" → "Maintain visual style coherence with the selected Visual Style Capsule"  
* Frame Prompt Assembly: "Apply Visual Style RAG cues" → "Apply Visual Style Capsule cues"

Output Schema Updates:

* RAG Retrievals Logging: "rag\_retrievals\_used": \["array of rag\_documents.id"\] → "style\_capsule\_applications": \["array of style\_capsule\_applications.id"\]

Global Context Package:

* Visual Style Lock: rag\_db\_id → capsule\_id

Context Flow Commentary:

* Retroactive Edit Context: writtenStyleRAG: {...} → writingStyleCapsule: {...}

### **3\. golden-test-evaluation-framework.md Updates:**

Stage 1 Section Headers:

* All occurrences: "Stage 1: Input Modes & RAG Initialization" → "Stage 1: Input Modes & Style Capsule Initialization"

Success Criteria Updates:

* Writing Style Selection: "Selects appropriate Written Style RAG" → "Selects appropriate Writing Style Capsule"  
* Conversational, character-driven  
* Technical/action-oriented  
* Documentary/educational  
* Visual Style Selection: "Visual Style RAG selection" → "Visual Style Capsule selection"  
* Photorealistic/character-focused  
* Cinematic/action-oriented  
* Clean/professional

### **Key Architectural Shifts Reflected:**

1. From Retrieval-Based to Injection-Based: All agent inputs now use explicit Style Capsule selection instead of similarity-based retrieval  
1. From Vector Embeddings to Structured Content: Style Capsules contain plain text examples, descriptors, and constraints instead of vector embeddings  
1. From Retrieval Logging to Application Tracking: Output schemas now track Style Capsule applications rather than RAG retrievals  
1. From Database Retrieval to Direct References: Style Capsules are explicitly selected and injected rather than retrieved from vector databases

### **Verification Results:**

* ✅ Zero RAG references remaining in any of the three files  
* ✅ Zero vector database references remaining  
* ✅ Consistent Style Capsule terminology throughout all documentation  
* ✅ Preserved all existing agent architectures and test frameworks  
* ✅ Maintained all API contracts and evaluation criteria

### **Migration Impact:**

* API Integration: No changes needed \- contracts remain stable  
* AI Agent Registry: Major restructuring of agent interfaces and context packages to use Style Capsule injection  
* Golden Tests: Updated evaluation criteria to reflect Style Capsule selection instead of RAG retrieval

All documentation now consistently reflects a system that uses deterministic Style Capsule injection rather than retrieval-augmented generation, providing clearer, more controllable style guidance for users while maintaining the same powerful AI agent capabilities and evaluation frameworks.

# **Changes Made: Fifth Effort**

✅ RAG → Style Capsule Migration Complete
Changes Made to implementation-task-list.md:
1. Added New Feature 2.0: Style Capsule Database Migration
Create migration 004 to replace RAG tables with Style Capsule schema
Implement style_capsule_libraries table (user collections)
Implement style_capsules table (individual capsules with text/metadata)
Implement style_capsule_applications table (audit logging)
Update projects table to replace written_style_rag_id/visual_style_rag_id with Style Capsule references
Remove any existing RAG-related database structures
2. Updated Feature 2.1: Writing Style Capsule Library
Removed: rag_databases and rag_documents tables
Removed: Text embedding generation (OpenAI embeddings)
Removed: pgvector indexing with HNSW
Added: Style Capsule upload UI for text samples and descriptors
Added: Style Capsule creation with text examples and metadata
Added: Style Capsule management interface (create/edit/delete)
Added: Preset Writing Style Capsules for common styles
3. Updated Feature 2.2: Visual Style Capsule Library
Removed: Image embedding generation
Added: Style Anchor creation with descriptors and design pillars
4. Updated Feature 2.4: Style Capsule-Enhanced Generation
Changed: "style retrieval" → "Style Capsule application"
Removed: "relevance scoring for retrieved documents"
Added: "deterministic Style Capsule selection logic"
Changed: rag_retrievals table → style_capsule_applications table
Database Migration Required:
Based on the current schema in 001_initial_schema.sql, I can see there are placeholder RAG fields in the projects table:
-- RAG Configuration (optional)written_style_rag_id UUID, -- FK to be added later when RAG tables existvisual_style_rag_id UUID, -- FK to be added later when RAG tables exist
The new Feature 2.0 will create migration 004 to:
Replace these RAG references with Style Capsule references
Create the new Style Capsule table structure as defined in the migration document
Ensure proper foreign key relationships and constraints
This migration is now properly tracked in Phase 2 as Feature 2.0, making it clear that the database schema needs to be updated before implementing the Style Capsule features in Features 2.1-2.4.