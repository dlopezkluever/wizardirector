# **Prompt Library**


## 0. Pre-Implementation Planning Session Prompt

You are a senior engineer and product architect. Your job is NOT to write code — it's to analyze, clarify, and organize a spec file so it can be implemented cleanly in focused sessions.

---

## Step 1 — Investigate the Codebase First
Read every file, component, and service the spec touches. Understand what exists *today*, not what it's supposed to do. Look for:
- Partial implementations of anything described in the spec
- Patterns used by similar features elsewhere (naming, state management, UI models) — new work must stay coherent with these
- Integration points: where will new features hook in?

## Step 2 — Scrutinize the Spec
- Flag contradictions, ambiguities, and redundancies
- Identify anything already built (and assess its quality)
- Call out anything that's larger in scope than it appears

## Step 3 — Interview Me
Use the `askUserQuestion` tool. Do not write planning docs until this is done. Ask about:
- Contradictions you found — present the conflict, ask me to decide
- Ambiguous UX or backend decisions — give me options with brief tradeoffs
- Anything where you have a strong recommendation — share it and ask if I agree
- Scope: confirm whether I want full scope or a leaner MVP per feature

## Step 4 — Surface What I Missed
Before writing docs, flag: adjacent problems worth fixing now, potential regressions, and anything that should be sequenced before something else. I'll tell you what to include.

## Step 5 — Output Planning Documents
One markdown file per logical implementation phase, each self-contained:
```
## Problem Statement / ## Core Goal / ## Relevant Files
## Current State / ## Implementation Notes
## Dependencies / ## Notables
```

Mark anything unresolved as `[UNRESOLVED]` rather than guessing.

---

**Rules**: Investigate before forming opinions. Interview before writing. Match existing patterns. No filler — every sentence must be load-bearing.



## Note: From Prompts-to-reuse.md

> One prompt per use case. Fill in `[BRACKETS]` before sending. Attach relevant files inline.

---

## 1. Feature Spec Mapping
*Use when: you have rough ideas and need a polished spec doc an agent can implement from.*

```
You are a senior product engineer. Your job is to help me transform rough ideas into a
tight, implementable spec. Do NOT write code or a plan yet — just produce the spec document.

I have rough ideas for: [feature name / area]
My notes are disorganized — treat them as signal, not instruction.

Attached: [ideas file / screenshot / relevant existing spec]

---

STEP 1 — Investigate first.
Read the relevant parts of the codebase this feature will touch. Understand what exists today
before forming any opinions. Note existing patterns, naming, state management, and integration
points. New work must be coherent with these.

STEP 2 — Interview me.
Use `askUserQuestion`. Ask about anything unclear, any tradeoffs worth surfacing, and your own
recommendations. Cover: UX decisions, data model implications, scope (full vs. MVP), and
anything in my notes that conflicts or is underspecified. Share your opinions — don't just
present neutral options when you have a better answer.

STEP 3 — Write the spec.
Once I've signed off, write it to: [path/to/spec-file.md]

Spec must include:
- Problem Statement — what's broken/missing and why it matters
- Goals & Non-Goals — what "done" looks like; what's explicitly out of scope
- UX Flow — user-facing behavior, step by step
- Data & State — what changes at the data/state layer
- Key Implementation Notes — patterns to follow, constraints, pitfalls
- Open Questions — anything still unresolved, marked [UNRESOLVED]

Rules: No filler. Every sentence load-bearing. Match existing codebase patterns.
```

---

## 2. Pre-Implementation Planning
*Use when: you have a finalized spec and need phased planning docs before an agent starts building.*

```
You are a senior engineer and product architect. Your job is NOT to write code — it's to
produce self-contained planning documents so implementation can happen in clean, focused sessions.

Attached spec: [spec file]

---

STEP 1 — Investigate the codebase.
Read every file, component, and service the spec touches. Map what exists today: current behavior,
data flow, known rough edges, any partial implementations of spec features. Identify consistency
patterns — new work must match them.

STEP 2 — Scrutinize the spec.
Flag contradictions, ambiguities, redundancies, and scope creep risks. Identify anything already
built and assess its quality.

STEP 3 — Interview me.
Use `askUserQuestion`. Resolve contradictions (present the conflict, ask me to decide). Clarify
ambiguous UX and data model decisions (give options + tradeoffs). Confirm scope: full vs. MVP.
Share your own recommendations when you have them. Do not write planning docs until this is done.

STEP 4 — Surface what I missed.
Before writing, flag: adjacent problems worth fixing now, potential regressions, and sequencing
dependencies. I'll tell you what to include.

STEP 5 — Write one markdown planning doc per implementation phase.
Each doc must be fully self-contained. Include:

## Problem Statement / ## Core Goal / ## Relevant Files (path + why)
## Current State / ## Implementation Notes / ## Dependencies / ## Notables

Mark anything unresolved as [UNRESOLVED]. No guessing.
```

---

## 3. Task Planning Session
*Use when: you have a task doc for a single worktree/session and need a concrete implementation plan.*

```
Read the attached task document: [path/to/task.md]

It defines what we're building, including key files involved. Before planning anything:

1. Investigate — read all relevant codebase areas this task touches. Understand current behavior,
   not intended behavior. Identify existing patterns this work must follow.

2. Interview me — use `askUserQuestion`. Ask about anything unclear, any recommendations you have,
   scope edge cases, and tradeoffs worth discussing. Ask about anything relevant — don't filter
   yourself. No plan gets written until this is done and I've confirmed we're ready.

3. Write the plan — a clear, sequenced implementation plan. Specific enough that you could
   execute it step by step without revisiting the task doc. Flag anything still ambiguous as
   [UNRESOLVED].
```

---

## 4. Implementation Kickoff
*Use when: planning is done and it's time to build. Attach the planning doc.*

```
We are implementing the following: [feature name]

Attached planning doc: [path/to/plan.md]
Supporting context: [project-overview.md / tech-stack.md / ui-rules.md — attach as needed]

The plan defines scope, relevant files, and implementation notes. Follow it precisely.
Match all existing patterns in the codebase — do not invent new ones.

Before writing any code:
- Confirm your understanding of scope with me if anything is ambiguous
- Call out any blockers or missing context

Then implement. After each logical chunk, summarize what was done and what's next.
```

---

## 5. Session Resume
*Use when: picking up an interrupted or failed session.*

```
We are resuming an in-progress implementation session.

Progress doc: [path/to/progress.md]  
Task doc: [path/to/task.md]  
[Attach any other relevant docs]

Read the progress doc first. It documents: the end goal, the approach, steps completed, and
the current failure or stopping point.

Understand the current codebase state before doing anything. Then:
1. Tell me exactly where we left off and what the current failure or next step is
2. Ask me any clarifying questions using `askUserQuestion` if anything is unclear
3. Continue implementation from that point

Do not restart from scratch. Build on what exists.
```

---

## 6. Backlog Audit
*Use when: you have old tickets/issues/ideas written against an older codebase and need to revalidate them.*

```
I have a set of issues, improvements, and feature ideas written against an older version of
this codebase: [attach backlog file]

The codebase has changed significantly since. Your job:

1. Investigate — read the current codebase, especially the areas each item references.
   Understand what actually exists today.

2. Audit each item:
   - Is this still a real problem, or has it been resolved?
   - Is the proposed fix/approach still valid, or outdated?
   - Is it worth doing? Flag anything that's no longer relevant or lower priority.

3. Interview me — use `askUserQuestion` on anything that needs a judgment call, has tradeoffs,
   or where you have a recommendation.

4. Produce a revised backlog — grouped by: Still Valid / Needs Updated Approach / Resolved /
   Deprioritize. For each still-valid item, include a brief implementation note.
```

---

## 7. Parallel Work Analysis
*Use when: you have a list of tasks and want to know what can be built in parallel (e.g. git worktrees).*

```
Analyze the following tasks from my tasklist for parallel implementation:
[attach or paste task list, specify which section/phase]

Your job:
1. Investigate — for each task, identify: files touched, state/data dependencies, shared
   integration points, and sequencing requirements.

2. Dependency map — determine which tasks are truly independent vs. which share code, state,
   or must be sequenced.

3. Recommend — give me a concrete recommendation:
   - Which tasks can be built in parallel (safe for separate worktrees)
   - Which must be sequential and why
   - Suggested build order

Do not write any code or modify any files. This is analysis only.
```

---

## 8. Progress Checkpoint
*Use when: you need to document session state so another session can resume cleanly.*

```
Write a progress document to: [path/to/progress.md]

Include:
- End Goal — what we are ultimately building
- Approach — the strategy/architecture we've committed to
- Completed Steps — what has been implemented so far (be specific: files created/modified,
  decisions made)
- Current State — where exactly we are right now
- Current Blocker / Next Step — what failed, what's unclear, or what comes next
- Open Questions — anything unresolved

Be precise. This document will be used to resume this session cold — treat it like a handoff
to a developer who has never seen this session.
```

---

*Tip: For any prompt, attach the most relevant 2–3 files inline rather than referencing paths Claude can't resolve. The cleaner the context, the better the output.*

----

# **Extended Prompt Library** — Full Dev Lifecycle

## Preface:

15 prompts across the full lifecycle, ordered as you'd actually use them:
PRE-FEATURE — Codebase Onboarding, Deep Research, Architecture Decision
DESIGN — Data Model Design, API Contract Design, React Hook Design
POST-BUILD — Test Writing, Code Review, Debugging/RCA, Refactor Session, Third-Party Integration, Security Audit, Performance Audit
SHIP — Documentation Update, PR Description
A few worth calling out specifically: the Hook Design prompt is the answer to "what are hooks" — you use it when a piece of logic is complex enough to be reusable across components (think: useStageState, usePipelineProgress) and you want to nail the interface before building. The Security Audit and Performance Audit are easy to skip but consistently where things bite you before launch. And Debugging/RCA enforces the discipline of finding root cause before proposing a fix, which saves a ton of back-and-forth with agents that want to jump straight to patching.


> Ordered by when you'd use them: pre-feature → design → build → post-build → ship.
> Fill `[BRACKETS]` before sending. Attach files inline.

---

## PRE-FEATURE

---

### 1. Codebase Onboarding
*Use when: starting work on an unfamiliar codebase, or a part of your own codebase you haven't touched in a while.*

```
You are a senior engineer being onboarded to a codebase. Your job is to produce a clear,
accurate mental model of how it works — not how it's supposed to work, but how it actually works.

Focus area: [specific feature / module / the whole thing]
Attached: [project overview / folder structure / key files]

Investigate, then produce:

1. Architecture Snapshot — what are the major layers, services, and data flows? How do they connect?
2. Key Files Map — the 10–20 most important files, one line each on what they actually do
3. State & Data Flow — where does state live? how does data move through the system?
4. Patterns in Use — naming conventions, component patterns, error handling, API style
5. Rough Edges — anything that looks fragile, inconsistent, or like a future trap
6. Onboarding Questions — anything you couldn't determine from reading that I should clarify

Be direct. Skip anything that's obvious from the file structure alone.
```

---

### 2. Deep Research
*Use when: evaluating a technology, library, pattern, or approach before committing to it.*

```
You are a senior engineer helping me make an informed technical decision. Use web search.

Question / Decision: [what I'm trying to figure out]
Context: [what I'm building, current stack, constraints]

Research and produce:

1. The Landscape — what are the main options/approaches? (be exhaustive but concise)
2. How Others Have Solved This — real-world usage patterns, common pitfalls, lessons learned
3. Tradeoff Matrix — compare top options across: complexity, performance, maintainability,
   ecosystem maturity, and fit with my stack
4. Recommendation — your honest pick with clear reasoning. Don't hedge if you have a view.
5. What I'd Validate First — before committing, what should I prototype or test?

Cite sources. Flag anything that's rapidly evolving or where the community is split.
```

---

### 3. Architecture Decision
*Use when: you're about to make a significant structural decision and want to think it through before building.*

```
I'm making a significant architectural decision and need to think it through before writing code.

Decision: [describe the choice, e.g. "how to manage global async state for pipeline stages"]
Context: [current stack, what already exists, what this will need to support]
Attached: [relevant existing code / spec / data model]

Your job:

1. Restate the decision — confirm you understand what's actually being decided
2. Map the constraints — what does any solution have to satisfy? what are deal-breakers?
3. Enumerate real options — 2–4 concrete approaches worth considering (not strawmen)
4. Analyze each — implementation complexity, long-term maintenance cost, fit with existing
   patterns, known failure modes
5. Recommend — give me your preferred option and why. Include what you'd watch out for.
6. Ask me anything — use `askUserQuestion` for anything that would change your recommendation

Do not write any implementation code.
```

---

## DESIGN

---

### 4. Data Model Design
*Use when: designing a new table, schema, or data structure before touching the database.*

```
I need to design a data model before implementation. Do NOT write migrations or touch the DB yet.

Feature: [what this data model will support]
Attached: [existing schema / project overview / spec]

Your job:

1. Investigate — read the existing schema and understand current patterns (naming, FK conventions,
   RLS patterns, indexing strategy, JSONB usage, etc.). New tables must be coherent with these.

2. Propose the model — table(s), columns, types, constraints, indexes, relationships.
   Justify every non-obvious decision.

3. Flag tradeoffs — anywhere there's a schema decision with meaningful long-term implications
   (e.g. JSONB vs. normalized columns, soft delete vs. hard delete, denormalization choices)

4. Interview me — use `askUserQuestion` on anything where my product requirements should
   drive the schema shape. Share your recommendation, then ask if I agree.

5. Output — final proposed schema as SQL (CREATE TABLE only, no migration boilerplate).
   One clear decision log entry per notable design choice.
```

---

### 5. API Contract Design
*Use when: designing endpoint shape, request/response types, or a service interface before building it.*

```
I need to design an API contract before implementation. No code yet.

What this API needs to do: [describe the feature/functionality]
Consumers: [frontend only / other services / external]
Attached: [existing API patterns / OpenAPI spec / relevant types]

Your job:

1. Investigate — read existing endpoints to understand current patterns: route naming, auth
   middleware, error shape, response envelope, pagination style. New endpoints must match.

2. Design the contract:
   - Routes: method, path, auth requirements
   - Request: params, body shape, validation rules
   - Response: success shape, error codes and messages
   - Edge cases: what happens when X is missing, unauthorized, conflicts, etc.

3. Flag decisions — anywhere the contract shape has product or DX implications worth discussing

4. Interview me — use `askUserQuestion` for anything that requires product judgment

Output as TypeScript types + route table. No implementation.
```

---

### 6. React Hook Design
*Use when: a piece of logic is complex enough to warrant a custom hook, and you want to design it cleanly.*

```
I need to design a custom React hook before implementing it.

What it needs to do: [describe the behavior, inputs, outputs]
Where it'll be used: [which components / features consume it]
Attached: [existing hooks for reference / relevant component code]

Your job:

1. Investigate — read existing hooks in the codebase. Understand the patterns: how they handle
   loading/error state, how they integrate with React Query / Zustand / context, naming conventions.

2. Design the hook interface:
   - Name and signature
   - Parameters (with types)
   - Return shape (with types)
   - Internal state it owns vs. state it reads from elsewhere
   - Side effects it manages (subscriptions, cleanup, etc.)

3. Identify dependencies — what external state, services, or other hooks does it depend on?

4. Flag concerns — any complexity, edge cases, or re-render traps worth knowing before coding

5. Ask me anything — use `askUserQuestion` if the design should be driven by product behavior

Output as a typed interface + pseudocode skeleton. No real implementation yet.
```

---

## POST-BUILD

---

### 7. Test Writing
*Use when: implementation is done and you need tests written.*

```
Implementation is complete. Write tests for: [feature / module / file]
Attached: [the implemented file(s) / existing test files for pattern reference]

Before writing any tests:
1. Read the implementation — understand what it actually does, not what it's supposed to do
2. Read existing tests — match the exact patterns, testing library usage, mock strategies,
   and file structure already in use. Do not introduce new testing patterns.

Then write:
- Unit tests — cover core logic, edge cases, and known failure modes
- Integration tests — cover the critical happy path and at least one failure path end-to-end
- Skip: trivial getters/setters, framework internals, anything that doesn't reflect real risk

For each test, the name should read as a behavior description, not an implementation detail.
Bad: "calls fetchUser with correct args"
Good: "returns null when user is not found"

Flag anything that's hard to test cleanly — that's often a signal about the implementation.
```

---

### 8. Code Review
*Use when: implementation is done and you want a critical, honest review before shipping.*

```
Review the following implementation as a senior engineer who cares about long-term maintainability.
Be direct. Don't soften findings.

Attached: [files to review]
Context: [what this was supposed to do / link to spec or task doc]

Review across these axes — flag findings as Critical / Moderate / Minor:

1. Correctness — does it do what it's supposed to? any logic bugs or edge case gaps?
2. Pattern Consistency — does it match how the rest of the codebase does similar things?
3. Error Handling — are failures handled at every layer? are errors surfaced or swallowed?
4. State Management — any race conditions, stale state, or missing loading/error states?
5. Types — any `any`, unsafe casts, or missing type coverage that could mask bugs?
6. Performance — any obvious inefficiencies (unnecessary re-renders, N+1s, missing memoization)?
7. Security — any input validation gaps, auth misses, or data exposure risks?
8. Test Coverage — what's untested that should be?

End with: Top 3 things to fix before this ships. One thing done well.
```

---

### 9. Debugging / Root Cause Analysis
*Use when: something is broken and you need to diagnose it systematically.*

```
Something is broken. Help me find the root cause — do not guess, investigate.

Symptom: [describe exactly what's happening vs. what should happen]
Reproduction: [steps to reproduce / when it happens / how consistently]
Attached: [error logs / relevant code / recent changes]

Your process:

1. Form hypotheses — list 3–5 possible root causes, ordered by likelihood
2. Investigate each — read the relevant code for each hypothesis. Eliminate or confirm.
3. Identify the root cause — not the symptom, the actual reason it's broken
4. Explain the failure — trace exactly how the bug manifests from source to symptom
5. Propose a fix — the minimal, correct change. Flag if fixing it properly requires
   a larger refactor (don't hide that).

Use `askUserQuestion` if you need me to check something in the running environment,
share a log, or clarify expected behavior before you can narrow it down.

Do not propose a fix until you've identified the root cause.
```

---

### 10. Refactor Session
*Use when: code works but is messy, inconsistent, or needs cleanup before it scales.*

```
I need to refactor the following code. It works — do not change behavior.

Attached: [files to refactor]
Goals: [what's messy about it — e.g. "too much logic in component", "duplicate patterns", "types are weak"]

Before touching anything:
1. Read the code fully and understand what it does
2. Read similar well-structured code elsewhere in the codebase — match those patterns
3. Interview me — use `askUserQuestion` to confirm scope and any decisions that would change
   the refactor approach (e.g. "should I extract this into a shared utility or keep it local?")

Refactor constraints:
- No behavior changes — if you're unsure, ask
- No new patterns — use what already exists in the codebase
- Preserve all existing tests; update them only if structure changes require it
- Flag anything that looks like a bug while you're in there (don't fix silently)

After refactoring, write a one-paragraph summary of what changed and why.
```

---

### 11. Third-Party Integration
*Use when: integrating an external service, API, SDK, or webhook.*

```
I need to integrate: [service name — e.g. Stripe, Resend, Clerk, Twilio]
What it needs to do: [the specific functionality I'm using]
Attached: [relevant docs / existing integration patterns in codebase / env setup]

Your job:

1. Research — use web search to find the current official SDK/API approach. Do not rely on
   memory for third-party APIs — they change. Find the specific method/endpoint I need.

2. Investigate the codebase — how are other third-party services currently integrated?
   Match that pattern exactly (client instantiation, error handling, env var naming, etc.)

3. Interview me — use `askUserQuestion` on: auth approach, error handling expectations,
   webhook verification if applicable, and any edge cases I care about

4. Implement — write the integration following codebase patterns.
   Include: client setup, the specific functionality, error handling, and type safety.

5. Note what needs manual setup — env vars needed, dashboard config steps, webhook
   registration, etc. Don't assume I know.
```

---

### 12. Security Audit
*Use when: before shipping a feature that handles auth, user data, payments, or external input.*

```
Perform a security audit on the following before it ships.

Attached: [files to audit — especially API routes, auth logic, data access layers]
Context: [what this feature does / who can access it / what data it touches]

Check for:
1. Auth & Authorization — are all routes properly protected? any missing permission checks?
   any place a user could access another user's data?
2. Input Validation — is all user input validated and sanitized before use? SQL injection,
   XSS, path traversal risks?
3. Data Exposure — are API responses scoped to only what the consumer should see?
   Any sensitive fields leaking (passwords, tokens, internal IDs)?
4. Secrets & Env — any hardcoded credentials? any secrets exposed to the client?
5. Rate Limiting & Abuse — any endpoints that could be hammered without limits?
6. Dependency Risk — any obviously outdated or vulnerable packages in this area?

Flag findings as Critical / Moderate / Minor.
Critical = fix before shipping. Moderate = fix soon. Minor = note for later.
```

---

### 13. Performance Audit
*Use when: a feature feels slow, or before shipping something that handles significant data load.*

```
Audit the following for performance issues.

Attached: [files to audit]
Context: [what this does / expected data volume / where slowness is observed]

Check for:
1. Unnecessary Re-renders — components re-rendering when they shouldn't? missing memo/callback?
2. Data Fetching — N+1 queries? over-fetching? missing pagination? waterfall requests that
   could be parallel?
3. Bundle Impact — any large imports that could be code-split or replaced with lighter alternatives?
4. Expensive Computations — anything CPU-heavy running on the main thread or in the render cycle?
5. Database — missing indexes for the queries this feature runs? full table scans?
6. Caching — anything being re-fetched unnecessarily that could be cached?

For each finding: describe the problem, estimate the impact (High / Medium / Low), and
propose the fix. Prioritize by impact — don't bury the important ones.
```

---

## SHIP

---

### 14. Documentation Update
*Use when: implementation is done and docs need to be written or updated.*

```
Write or update documentation for the following implementation.

Attached: [implemented files / existing docs to update]
Audience: [future-me / other devs / external API consumers — pick one]

For internal dev docs, produce:
- What it does — one paragraph, plain English, no jargon
- How to use it — code example showing the most common usage
- Key parameters / props / options — table format, types included
- Gotchas — things that aren't obvious from the signature alone
- Related — links to other relevant files or docs

For API docs, use OpenAPI-style format with: method, path, auth, request/response shapes, errors.

Match the voice and format of existing docs in the project. If there are no existing docs,
write as if for a sharp developer who hates fluff — be precise and minimal.
```

---

### 15. PR Description
*Use when: you're ready to open a pull request and need a clear, professional description.*

```
Write a pull request description for the following changes.

Attached: [diff or list of changed files / task doc or spec]

Format:

**What**
One paragraph. What was built or changed, and why. Written for a reviewer who knows the
codebase but hasn't followed this task.

**How**
The key implementation decisions made and why. Not a file-by-file summary — just the choices
worth knowing about.

**Testing**
How to verify this works: manual steps and/or which automated tests cover it.

**Screenshots / Demo**
[leave as placeholder if visual changes — flag that I need to add these]

**Checklist**
- [ ] Tests written and passing
- [ ] No console.logs or debug code
- [ ] Types are clean (no `any`)
- [ ] Relevant docs updated

Keep the tone direct and technical. No filler sentences. Reviewers are busy.
```

---

*Combined with `prompt-library.md` (planning & build prompts), this covers the full cycle:
onboard → research → design → plan → build → test → review → debug → refactor → ship.*


----


# Yappendix: Yappalicious Version: Pre-Implementation Planning Session

You are a senior engineer and product architect helping me prepare a spec file for implementation. Your job is NOT to write code — it is to deeply analyze, clarify, and organize so that implementation can be done cleanly, one focused chunk at a time.

## Your Objective

Given the spec file I've attached, you will produce a set of **self-contained markdown planning documents** — one per logical implementation phase or feature group. Each document will be scoped tightly enough that an agent can implement it in a focused session without needing to reference anything outside of it.

Before you write a single planning doc, you must complete the investigation and interview phases below.

---

## Phase 1 — Codebase Investigation

Before forming any opinions, read the relevant parts of the codebase. Do not rely on assumptions.

1. **Identify all files, components, hooks, utilities, and services the spec touches.** Read them. Understand their current behavior — not what they're supposed to do, but what they actually do right now.

2. **Map the current state of each affected area:**
   - What does it do today?
   - What data flows through it?
   - What are its known limitations or rough edges?
   - Is there any partial implementation of anything in the spec already in place? (Common — check carefully.)

3. **Identify consistency patterns.** Look at how similar features elsewhere in the codebase are structured. Note the patterns, naming conventions, state management approaches, and UI interaction models used. Any new work must be coherent with these — not invent new patterns when existing ones suffice.

4. **Flag integration points.** Where will the new features hook in? What existing APIs, state stores, event systems, or UI components will they depend on or modify?

---

## Phase 2 — Spec Scrutiny

Critically analyze the spec file itself before accepting anything at face value.

1. **Identify contradictions.** Does the spec contradict itself anywhere? Do two features make conflicting assumptions about the same piece of state, UI, or behavior?

2. **Identify ambiguities.** What is underspecified? Where could two developers implement the same spec in completely different ways? Flag every one of these.

3. **Identify redundancies.** The spec likely has repeated or overlapping ideas written at different times. Consolidate them — identify the canonical version of each idea.

4. **Identify scope creep risks.** Are there features described that are actually much larger than they appear? Flag these clearly.

5. **Identify what's already built.** Cross-reference with the codebase — call out anything the spec describes that is already partially or fully implemented, and assess its quality.

---

## Phase 3 — Interview Me

Before writing any planning documents, use the `askUserQuestion` tool to interview me. Ask about everything you need to resolve — contradictions, ambiguities, design decisions, and tradeoffs. Group your questions logically so the interview is focused, not scattered.

Cover at minimum:
- **Contradiction resolution**: Where the spec conflicts with itself, present the conflict and ask me to decide.
- **Ambiguous UX decisions**: Where multiple UI approaches are valid, present the options with a brief tradeoff summary and ask me to choose.
- **Backend/data model decisions**: Any decision that will affect data structures, API contracts, or state shape.
- **Scope confirmation**: For anything that seems larger than it looks, confirm whether I want the full scope or a leaner MVP version for now.
- **Your own recommendations**: If you have a strong opinion on how something should work — based on codebase patterns, UX coherence, or engineering tradeoffs — share it and ask if I agree. Don't just present neutral options when you have a clearly better answer.

Do not write the planning documents until the interview is complete and I've confirmed we're ready to proceed.

---

## Phase 4 — Surfacing What I Missed

After the interview, before writing the docs, present a brief section called **"Gaps & Recommendations."** This is your chance to flag:

- Related problems in the same area of the codebase that the spec didn't mention but probably should have been
- UX or design improvements adjacent to what's being built that would be cheap to do now and expensive to retrofit later
- Potential regressions or side effects the spec doesn't account for
- Any feature that appears in the spec but is a dependency of another feature and should be sequenced first

I'll tell you what to include and what to skip before you start writing.

---

## Phase 5 — Output: Planning Documents

Once the interview is done and I've signed off on Gaps & Recommendations, produce the planning documents.

**One markdown file per logical implementation phase.** Each file must be self-contained — an agent should be able to read only that file and have everything it needs to implement the scope within it.

### Each document must include:
```
# [Feature/Phase Name]

## Problem Statement
What is broken, missing, or suboptimal? Why does this matter?

## Core Feature / Goal
What does "done" look like? What is the single most important outcome?

## Relevant Files
List every file the agent will need to read or modify. Include path and a one-line note on why it's relevant.

## Current State
What does the relevant code do today? What already exists that this builds on?

## Implementation Notes
Key decisions already made (from our interview). Patterns to follow. Constraints to respect. Pitfalls to avoid.

## Dependencies
What must exist or be completed before this phase can start?

## Notables
Anything that didn't fit above — edge cases, open questions that are acceptable to defer, UI nuances, copy suggestions, or anything an implementer should know but that doesn't fit the above structure.
```

---

## Rules

- Do not write any code.
- Do not skip the investigation phase and go straight to questions — read the codebase first.
- Do not write planning docs until the interview is complete.
- Do not invent patterns — match what already exists in the codebase.
- Do not pad docs with filler. Every sentence should be load-bearing.
- If something in the spec is genuinely unclear and I haven't answered it yet, mark it `[UNRESOLVED]` in the doc rather than guessing.

---

Begin by reading the attached spec file and the relevant codebase areas. Then start the interview.

----