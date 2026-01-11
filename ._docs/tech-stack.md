# **Tech Stack**

## **Summary**

### **Frontend**

* Language: TypeScript  
* Framework: React  
* Build Tool: Vite (with SSR/SEO strategies as needed)  
* Styling: Tailwind CSS  
* UI Primitives: radix-ui  
* Drag & Drop: dnd-kit  
* State Management: Zustand  
* Server State: React Query

### **Backend & APIs**

* API Style: REST  
* Orchestration: Explicit, code-driven orchestration (designed to allow future migration to Temporal.io)  
* Primary Database: Supabase Postgres  
* Vector Store: pgvector (with tuned HNSW indexes)  
* Auth: Supabase Auth  
* Storage: Supabase Storage (with future migration path to AWS S3)

### **AI & ML**

* LLM Providers: OpenAI, Anthropic, Gemini (multi-provider, cost-aware routing)
* Image Generation: Nano Banana
* Video Generation: Google Veo3
* Future Media Providers: Sora, Stability, ComfyUI
* Media Abstraction: mediaProvider interface (no hardcoded model assumptions)

### **Prompting, Style Capsules & Observability**

* Prompt Templates: Custom, DB-stored, versioned
* Prompt Engineering & Observability: LangSmith (Unified platform for tracing, debugging, and iterative prompt testing/playground)
* Style Capsule Management: Structured storage for deterministic style injection
* Workflow Automation: n8n (for async, high-cost pipelines)

### **Deployment**

* Frontend: Vercel  
* Backend / Workers: Fly.io

---

## **Detailed Breakdown & Conventions**

## **Frontend Stack**

### **React \+ TypeScript \+ Vite**

**Use Case:** Core application UI with complex state and rapid iteration.

**Best Practices:**

* Keep UI logic declarative and stage-driven  
* Use shared TypeScript types for API contracts  
* Prefer composition over abstraction

**Limitations:**

* SSR is not first-class like Next.js, but achievable with Vite plugins

---

### **Zustand \+ React Query**

**Use Case:**

* Zustand: deterministic local state (pipeline stages, UI state)  
* React Query: server state, caching, invalidation

**Conventions:**

* No global stores for derived server state  
* Zustand stores should remain small and explicit

---

## **Backend & API Layer**

### **REST APIs**

**Use Case:** Command-driven pipeline actions (lock stage, regenerate, confirm).

**Best Practices:**

* Endpoints represent actions, not just data  
* Explicit verbs for side-effecting operations  
* Idempotency where possible

**Limitations:**

* More endpoints, but higher clarity

---

### **Explicit Orchestration**

**Use Case:** Deterministic stage transitions and inheritance logic.

**Best Practices:**

* One orchestration function per stage transition  
* Always persist checkpoints  
* Centralize validation and gating logic

**Future-Proofing:**

* Structure orchestration logic so it could be migrated to Temporal.io if workflows become long-running or highly fault-tolerant

---

## **Data & Style Capsule Storage**

### **Supabase Postgres \+ Structured Storage**

**Use Case (in this app):**
Structured storage is used to maintain *stylistic, narrative, and visual consistency* across the pipeline. This includes storing Style Capsules (text examples, descriptors, constraints) established in early stages and ensuring they are deterministically injected into later stages (e.g. Shot Lists, Image Prompts, Video Prompts).

This is not retrieval-based similarity matching. It is *deterministic style application*.

**Why structured storage (explicit rationale):**

* **Deterministic Control > Similarity Search:** Plain text + metadata storage ensures exact style reproduction without retrieval ambiguity. Style Capsules are explicitly selected and injected, providing full transparency and predictability.
* **Query Flexibility:** Native SQL queries support complex filtering and inheritance logic. For example:
  * Scene ID
  * Character ID
  * Style Capsule version
  * Constraint flags
    This enables precise scoped inheritance (global → scene → shot).
* **Performance Simplicity:** No vector indexing complexity - standard Postgres indexes provide fast lookups for Style Capsule retrieval and inheritance.
* **Unified Architecture:** Style Capsules, metadata, prompts, and version history live in the same ACID-compliant Postgres environment. This guarantees consistency when styles, prompts, and pipeline state evolve together.

**Best Practices:**

* Version Style Capsules alongside prompt and asset versions
* Maintain separate storage for:
  * Writing Style Capsules (text examples, constraints)
  * Visual Style Capsules (descriptors, reference images)
  * Design Pillars (structured aesthetic definitions)
* Explicitly log which Style Capsules were applied for each generation

**Limitations:**

* Requires careful schema design
* Style Capsules must be explicitly curated (no automatic similarity discovery)

---

## **Prompting & Style Capsules**

### **Prompt Templates (Custom, First-Class)**

**Use Case (in this app):**  
Prompt templates are the *creative backbone* of the system. They encode narrative tone, visual language, pacing, and constraints at each stage of the pipeline.

Prompts are not static strings. They are versioned creative artifacts.

**Conventions:**

* Prompts stored in the database  
* Immutable once used in a generation  
* Versioned and referenced by pipeline runs  
* Inputs, outputs, and retrieved context are logged

---

### **LangSmith (Prompt Engineering & Observability):**

LangSmith (Unified platform for tracing, debugging, and iterative prompt testing/playground).
---

### **Style Capsule Management System**

**Use Case (in this app):**
The Style Capsule system implements the *Global-to-Local inheritance strategy* across stages through deterministic style injection.

Specifically:

* Structured Style Capsule storage and retrieval
* Ensuring narrative and stylistic consistency established in early stages persists into later stages
* Programmatically assembling prompts with:
  * Global project state
  * Character state
  * Scene state
  * Style Capsule selections

This is critical between stages such as:

* Stage 4 (Master Script) → Stage 7 (Shot List)
* Stage 8–10 (Character / Visual refinement)

**Best Practices:**

* Use structured data models for Style Capsules
* Keep style injection logic transparent and deterministic
* Maintain clear separation between writing and visual styles

**Limitations:**

* Requires explicit style curation and selection

---

### **n8n (Optional Workflow Orchestration)**

**Use Case (in this app):**  
n8n is an *optional* orchestration layer for cases where LangChain or explicit code orchestration becomes insufficient.

Primary candidate use case:

* High-cost, asynchronous pipelines (e.g. Stage 12 Video Generation)  
* Trigger render → wait for external API → handle callbacks → notify user

**Best Practices:**

* Treat as infrastructure glue  
* Do not encode creative or pipeline business logic

**Limitations:**

* Not suitable for core inheritance logic

---

## **Observability & Debugging**

### **LangSmith (Inheritance Logic, Style Consistency, Creative Debugging)**

**Use Case (in this app):**
LangSmith is used to *validate and debug the Global-to-Local inheritance logic* that underpins the entire system.

Primary goals:

* Ensure small changes in early stages correctly propagate to later stages
* Diagnose where stylistic or constraint violations originate

Key Advantages:

* **End-to-End Traces:** View the exact inputs and outputs of every stage in a single trace. If a Stage 12 video prompt becomes overly verbose, you can trace whether the issue originated in Stage 7 (Shot List) or Stage 4 (Script).
* **Creative Iteration via Playground:** Pull failing traces directly into the LangSmith Playground, tweak prompts (e.g. visual style constraints), and re-run against identical data. This enables tight feedback loops for maintaining style locks (e.g. Stage 5).
* **Style Capsule Injection Monitoring:** Log which Style Capsules were applied and evaluate consistency using LLM-as-a-judge metrics (Faithfulness, Relevance). This ensures style elements are being properly injected and maintained.

**Best Practices:**

* Enable tracing for all pipeline runs
* Treat traces as first-class debugging artifacts

**Limitations:**

* Most powerful when paired with structured style injection

---

## **Media Generation**

### **Media Provider Abstraction**

**Use Case:** Support multiple image/video generation backends.

**Conventions:**

* All media generation routed through a common interface  
* No hardcoded assumptions about prompt format or model behavior

---

## **Auth & Storage**

### **Supabase Auth**

**Use Case:** Authentication and authorization.

**Best Practices:**

* Use Postgres RLS policies  
* Keep auth logic simple

---

### **Supabase Storage**

**Use Case:** Media and asset storage.

**Best Practices:**

* Abstract storage access  
* Prepare for potential future migration to S3 if scale demands

**Limitations:**

* Fewer enterprise features than S3

---

## **Deployment**

### **Vercel \+ Fly.io**

**Use Case:**

* Vercel: frontend hosting  
* Fly.io: backend APIs, workers, orchestration

**Best Practices:**

* Stateless services  
* Environment parity across stages

**Limitations:**

* Less control than full AWS

---

*This document represents the current locked technical direction and conventions for the project. Future changes should preserve explicitness, debuggability, and creative control.*

