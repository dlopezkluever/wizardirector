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

### **Prompting, RAG & Observability**

* Prompt Templates: Custom, DB-stored, versioned
* Prompt Engineering & Observability: LangSmith (Unified platform for tracing, debugging, and iterative prompt testing/playground)
* RAG & Context Management: LangChain
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

## **Data & Vector Search**

### **Supabase Postgres \+ pgvector**

**Use Case (in this app):**  
pgvector is used to power *stylistic, narrative, and visual-beat retrieval* across the pipeline. This includes retrieving subtle creative influences (tone, pacing, visual verbosity, character cadence) established in early stages (e.g. Stage 1–4) and ensuring they are faithfully inherited in later stages (e.g. Shot Lists, Image Prompts, Video Prompts).

This is not generic semantic search. It is *precision creative recall*.

**Why pgvector (explicit rationale):**

* **Stylistic Nuance \> Raw Speed:** Using HNSW indexes with tuned parameters (e.g. `ef_search`, `m`) allows prioritizing retrieval accuracy over latency. This is critical when retrieving subtle narrative or visual "beats" where small semantic differences matter.  
* **Hybrid Search Superiority:** pgvector allows native SQL queries that combine vector similarity *and* structured filters in a single query. For example:  
  * Scene ID  
  * Character ID  
  * Style lock version  
  * Visual verbosity flags  
    This is essential for scoped inheritance (global → scene → shot).  
* **Performance Reality:** With modern extensions (e.g. `pgvectorscale`) and tuned indexes, recent benchmarks show pgvector can meet or exceed managed vector DBs like Pinecone for many real-world workloads.  
* **Unified Architecture:** Assets, metadata, embeddings, and version history live in the same ACID-compliant Postgres environment. This guarantees consistency when prompts, embeddings, and pipeline state evolve together.

**Best Practices:**

* Version embeddings alongside prompt and asset versions  
* Maintain separate embedding spaces for:  
  * Narrative text  
  * Visual descriptions  
  * Style exemplars  
* Explicitly log which embeddings were retrieved for each generation

**Limitations:**

* Requires careful index tuning  
* Scaling requires database expertise (acceptable tradeoff for control)

---

## **Prompting & RAG**

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

### **LangChain (RAG & Global-to-Local State Management)**

**Use Case (in this app):**  
LangChain is used to implement the *Global-to-Local inheritance strategy* across stages.

Specifically:

* Building RAG pipelines over pgvector  
* Ensuring narrative and stylistic nuance established in early stages persists into later stages  
* Programmatically joining:  
  * Global project state  
  * Character state  
  * Scene state  
  * Style lock state

This is critical between stages such as:

* Stage 4 (Master Script) → Stage 7 (Shot List)  
* Stage 8–10 (Character / Visual refinement)

**Best Practices:**

* Use LangChain retrievers and memory components  
* Keep orchestration logic outside LangChain  
* Avoid agent-heavy abstractions

**Limitations:**

* Can obscure logic if overused

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

### **LangSmith (Inheritance Logic, RAG Quality, Creative Debugging)**

**Use Case (in this app):**  
LangSmith is used to *validate and debug the Global-to-Local inheritance logic* that underpins the entire system.

Primary goals:

* Ensure small changes in early stages correctly propagate to later stages  
* Diagnose where stylistic or constraint violations originate

Key Advantages:

* **End-to-End Traces:** View the exact inputs and outputs of every stage in a single trace. If a Stage 12 video prompt becomes overly verbose, you can trace whether the issue originated in Stage 7 (Shot List) or Stage 4 (Script).  
* **Creative Iteration via Playground:** Pull failing traces directly into the LangSmith Playground, tweak prompts (e.g. visual style constraints), and re-run against identical data. This enables tight feedback loops for maintaining style locks (e.g. Stage 5).  
* **RAG Performance Monitoring:** Log which documents were retrieved from pgvector and evaluate relevance using LLM-as-a-judge metrics (Faithfulness, Relevance). This ensures subtle influences are actually being retrieved and used.

**Best Practices:**

* Enable tracing for all pipeline runs  
* Treat traces as first-class debugging artifacts

**Limitations:**

* Most powerful when paired with LangChain

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

