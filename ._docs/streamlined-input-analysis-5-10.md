# Streamlined Input: Analysis, Critique, and Recommendations

*May 10, 2026 — Claude analysis based on streamlined-input-process-consolidated.md and current-app-user-flow.md*

---

## Part 1: What's Good In The Current Thinking

### The "intake and normalization layer" framing is correct

The thesis that Streamline should sit *in front of* the pipeline — not replace it — is architecturally sound. The pipeline stages represent real creative work with real dependencies. Collapsing that work for users who've already done it is the right abstraction. This framing should be enforced from day one or the feature will creep into something that breaks the pipeline's structural integrity.

### The per-file import choice (as-is vs AI-format) is the right design

This is one of the best decisions in the current thinking. Forcing everything through AI reformatting wastes credits and produces worse results for clean inputs. Defaulting to as-is for high-confidence clean documents and AI-format for messy ones is sensible. The important thing is making this visible to users, not hiding it behind automation.

### The MVP scope pyramid (1 through 5) is well-structured

The five-part MVP decomposition is logical and progressively valuable. Each level delivers standalone value rather than requiring the whole system to exist before anything works.

### Review before commit is non-negotiable

This is underemphasized in the doc but it should be treated as a hard requirement at MVP 1, not MVP 5. Without a preview step, users have no idea what the system decided to do. Any routing without a confirmation step will feel like magic in the bad sense — the system did something and the user cannot trace it. Trust requires visibility.

### Skipped stage behavior (optional backfill, don't auto-spend credits) is correct

Making skipped stages clearly visible and allowing optional backfill later is the right call. The doc's recommendation to never auto-spend credits on backfill unless explicitly requested is a strong default.

### YOLO mode as post-MVP is the right call

It is tempting to automate everything end-to-end from day one. But YOLO mode without the underlying Streamline infrastructure being solid first would be a fragile, untestable system. Defer it.

---

## Part 2: What Is Misguided or Questionable

### Option 3 (Make Streamline the default Stage 1) is too aggressive as a near-term recommendation

The doc marks this as a "long-term" goal but still mentions it as a design option to evaluate. This should be firmly off the table for at least 12 months. The current Stage 1 modes work well for new users building from nothing. The four-mode selector gives new users a mental model: "what do I have to start with?" Replacing that with a universal drop zone is a regression for the blank-slate creative.

When Streamline proves itself, you revisit this. Not before.

### CineBlock within Streamline scope is premature

CineBlock is described as a separate 3D blocking tool with its own camera metadata, shot packages, and PNG exports. Treating it as a Streamline input type lumps a rich standalone product feature into a general intake flow. The right call is to build CineBlock as a first-class concept that integrates with the pipeline at Stage 7 and Stage 10 independently. If CineBlock output can be exported and re-imported via Streamline later, great — but designing Streamline around CineBlock output before CineBlock exists is speculative coupling.

### Audio-first projects within MVP scope is too broad

The desire to support podcasts, audiobooks, and lecture-transcript-based visual generation is a compelling long-term vision but a fundamentally different product mode. A "generate visuals to match a narration timeline" workflow inverts the entire pipeline — the script becomes secondary to the audio cadence. Including this in any MVP planning creates scope pressure that will stall the text-and-image intake work that has much broader immediate value. Keep audio support scoped to "transcribe and route to context" for MVP, nothing more.

### The implementation order buries the highest-value win

The proposed order starts with the data model and document extraction infrastructure before delivering any user-visible value. A better sequence would front-load the thing users will feel immediately: real script skip that actually works. That is the most-requested shortcut, it requires the least new infrastructure, and it proves the pipeline skip concept before building the full intake system around it. The rest of the infrastructure then has a clear reference implementation.

Recommended reorder:
1. Real script skip with backend skip state (current MVP 3 content)
2. Structured upload panel with text/PDF/script support (current MVP 1 content)
3. Review before commit — required alongside MVP 1, not after
4. Routing to stages 2-5 (current MVP 2 content)
5. Clarification questions (current MVP 4 content)

### The data model is over-engineered for MVP

The proposed data model (input_bundle, input_items, input_item_classification, input_extractions, stage_route_plan, clarification_questions, clarification_answers) is thorough and correct for the full system. But shipping all seven new table concepts for MVP 1 will slow implementation significantly. For the first version, you can represent the intake session in fewer tables if you constrain scope. Expand the model as each subsequent MVP phase adds new needs.

---

## Part 3: Ideas And Gaps Not Yet Addressed

### Progressive disclosure on the intake UI

The Streamline panel as described assumes a relatively sophisticated user who knows what a treatment, beat sheet, and screenplay are. For true layman users, the UI should start as simple as possible — "drop what you have here" — and reveal classification and routing details as the user adds material. Show the type dropdown only when classification confidence is below threshold. Show the primary/context designation only when there are multiple files. Most of the power-user options should start hidden.

### Intake session persistence

The current spec does not address what happens when the user starts an intake session, adds four files, and leaves. When they return, should the session be gone or should the partial intake be recoverable? For large projects where a user is uploading multiple documents over several sessions, a persistent draft intake session is essential. Call it a "project staging area" or similar — it sits before the pipeline begins and holds submitted material until the user commits.

### Credit estimation before commitment

The "Review Before Commit" step mentions showing what will happen, but it does not mention cost. Before a user commits a Streamline intake that will AI-format three documents and seed three pipeline stages, they should see a credit estimate. This is not a nice-to-have — it is a trust issue. The current app already has cost confirmation dialogs in Stage 8 and Stage 11. Streamline should have the same before any AI-consuming operation runs.

### Partial success and error recovery in intake

What happens when five files are submitted and three parse successfully but two fail? The spec does not address this. The system should allow the user to continue with the successful files and either retry the failed ones, reclassify them, or skip them. A blocking "all or nothing" failure mode will frustrate users who submitted a large bundle.

### Confidence indicators on classification

When the system detects that a file is "probably a beat sheet," that confidence should be visible. "95% confident: Screenplay" is trustworthy. "62% confident: Treatment or outline — what is this?" invites user input naturally. This is especially important because misclassification is the failure mode users will notice most. Making confidence visible converts a silent mistake into a collaborative question.

### The contextual intake anchor: "where are you in the pipeline?"

The current design assumes Streamline is only entered at Stage 1. But a user who is currently working in Stage 7 and has just received storyboard frames or character sketches from a collaborator should be able to use Streamline intake without going back to Stage 1. The system should recognize context: "you're in Scene 3, Stage 8. These images look like scene asset references. Do you want to add them to Scene 3?" Streamline as a contextual intake layer, not just an entry-point layer, adds value throughout the production cycle.

### Dashboard "quick start with files" entry point

Currently creating a project requires clicking the new project card, entering a title, waiting for creation, then entering Stage 1. For a user who already has a script or a pile of notes, this sequence feels backward — they have the content and the tool is asking for a title first. A "Start from files" button on the dashboard that opens Streamline intake and auto-names the project from the imported document (e.g., document title or filename stem) would reduce friction for the exact user Streamline is targeting.

### The "just tell me about it" conversational mode

The clarification layer as described is a Q&A session after analysis. But some users think better by talking than by uploading files. A free-form conversation mode where the user describes their project in natural language and the system builds the scaffold through iterative questions ("Tell me about it. I'll ask what I need.") would reach users who have no files yet — only ideas in their head. This is adjacent to but distinct from the current clarification layer. The file-based intake and the conversational intake should eventually converge, but they serve different user entry states.

### The "asset-only" intake sub-mode

Some users are already deep in production (Stage 8 or Stage 9) and want to introduce new assets — a new character who appears in the final act, a new location discovered during production. They should not have to go back to Stage 5 and work through the full asset extraction flow. An asset-only intake mode within Streamline that routes directly to Stage 5 (and optionally Stage 8) would serve this need without forcing a full pipeline restart.

### Streaming feedback during classification

Rather than a loading spinner while the system analyzes a batch of files, show classification results as they resolve, file by file. The user can review and correct early classifications while the system is still processing later files. This makes large batches feel fast and gives the user meaningful work to do while waiting.

### Import template for repeat creators

Users producing episodic or series content often have the same project DNA: same characters, same visual style, similar scene structure. Streamline should allow a previous project's configuration to be saved as an intake template. When starting a new episode, the user applies the template and gets the global assets, style capsule, and project type pre-loaded. They then only need to supply the new script.

### The "update existing project from new script" path

The spec focuses on intake as a project-start operation. But revision is common: a writer finishes a second draft and wants to push it into the pipeline without losing all their Stage 7-12 scene work from the first draft. Streamline should have a "replace script and reconcile" path that diffs the new script against the existing one, flags which scenes changed, offers to preserve stable scenes, and marks changed scenes for Stage 7 re-entry. This is adjacent to the branching feature but simpler — it's a controlled script update, not a true branch.

### Explicit "source of truth" hierarchy when inputs conflict

The doc mentions that the system should rank source authority when inputs conflict, and lists this as an open question. Here is a recommended default ranking:

1. Explicit user answer to a clarification question (highest authority)
2. Uploaded primary document
3. Supporting context documents
4. AI inference from all available material (lowest authority, fills gaps only)

When a conflict is detected, surface it directly: "Your script says Character A is in his 40s but your character description image shows a younger person. Which should we use?" Make the conflict visible and let the user resolve it. Do not silently pick one.

---

## Part 4: UX Design Recommendations

### Spatial intake canvas vs. step-by-step wizard

The current spec describes a linear flow: drop files → classify → clarify → route → confirm. This risks feeling like a second multi-step wizard on top of the existing pipeline. Consider a spatial alternative: the Streamline workspace is a single canvas. Files appear as cards when dropped. Classification and routing annotations appear next to each card in real-time. The user adjusts and confirms in-place rather than advancing through wizard steps. This makes the intake feel like organizing a desk rather than filling out a form.

### The "I just have a script" one-shot path must be prominent

For users with only a clean screenplay, the ideal path is: drop file → confirm "this is your script" → choose skip vs. backfill treatment/beats → land at Stage 4 review. This should take three clicks. It should not be buried inside a generic intake flow. Put a large dedicated "Import Script" drop zone or button above the general intake area. The general intake area handles everything else.

### Validation copy for layman users

The current app has good technical error messages ("No scene headings found — use INT./EXT. format"). Streamline will reach users with no screenwriting background. Its error and guidance copy should be more plain-language: "We couldn't find any scenes in your script. Script scenes usually start with something like INT. COFFEE SHOP - DAY or EXT. STREET - NIGHT. Want to add those, or should we treat this as unstructured notes instead?"

### Stage skip display: "auto-filled" vs "skipped"

When a stage is skipped because a later artifact was supplied, distinguish between two states:
- "AUTO-FILLED" — the stage content was generated or inferred from your submission (e.g., beat sheet reverse-generated from a script)
- "IMPORTED" — the user supplied this stage's content directly

Both are different from "SKIPPED," which means the content is not present and was bypassed. Users need to know whether they can trust a stage's content.

---

## Part 5: Ideas Adjacent Or Beyond The Current Scope

### Remix mode

After a project is complete, allow the user to upload a revised script and get an automated diff that flags which scenes need regeneration. Scene work that is unaffected by the revision stays intact. This is the highest-leverage editing workflow for users who iterate on scripts while production is already in progress.

### Reference project as template

"Start this project like my previous one" — copy visual style capsule, character types, location structure, and production settings from a finished project. The user provides only what is new. This makes serial creators dramatically faster.

### Collaborative intake

Multiple contributors (director, writer, production designer) can each upload their materials to the same intake session. Each file is attributed to its contributor. The system reconciles overlapping or conflicting inputs. This is a future feature but the data model should not prevent it.

### Personal creative fingerprint / second brain

The lore library concept mentioned in the consolidated doc would evolve naturally into a persistent creative profile that learns a user's style over multiple projects. As a practical starting point, allow users to tag any intake item as "personal library" vs "project only." Personal library items become available in future projects. This does not require a complex memory system to start — it can be built on top of the existing global asset library concept.

### Quality completeness score after routing

After intake and routing, show the user a coverage summary: "Your project is 72% ready to produce — Stage 4 is complete, Stage 5 has 8 of 11 assets filled, Stage 2-3 were auto-generated from your script." This gives users a clear picture of what remains and helps them prioritize what to refine before entering the scene pipeline.

### Film reference deconstruction

A user uploads a reference clip or a sequence of frames from a film they want to emulate. The system extracts visual style, shot types, camera movement patterns, and color palette. These are offered as a starting visual style capsule or as location view references. This would be a powerful intake path for cinematography-driven creators.

---

## Part 6: Recommended Priority Order

Based on the analysis above, here is a revised implementation order that maximizes early user value:

**Phase 1 — Remove the biggest friction immediately**
1. Real script skip with backend skip state (Stage 1 → Stage 4, Stages 2-3 marked as skipped, optional backfill)
2. "Import Script" prominent entry point on Stage 1 and dashboard

**Phase 2 — Build the intake foundation**
3. Structured upload panel (text/PDF/DOC/MD) with file type detection
4. Review before commit — required alongside Phase 2, not deferred
5. Credit estimation in the review step
6. Partial success and error recovery

**Phase 3 — Add intelligence and routing**
7. AI-format vs as-is per-file choice with confidence indicators
8. Routing treatment, beat sheet, and assets to Stages 2-5
9. Character/location/prop image routing to Stage 5

**Phase 4 — Clarification and quality**
10. Clarification question layer after analysis
11. Conflict resolution UI when inputs disagree
12. Streaming classification feedback

**Phase 5 — Reach features**
13. Intake session persistence (draft staging area)
14. Contextual intake anchor (intake from within Stage 7-9, not just Stage 1)
15. Dashboard "quick start from files" entry
16. Import template for repeat creators
17. Asset-only intake sub-mode
18. "Update existing project from new script" reconciliation path

**Post-MVP**
- Conversational intake mode
- Audio transcription and classification
- Storyboard and frame routing
- CineBlock package import
- YOLO auto-pipeline mode
- Remix mode
- Collaborative intake
- Personal creative fingerprint

---

## Summary

The current thinking is strong on architecture and scope strategy. The most important immediate fixes are: (1) put the real script skip first — it is the highest-leverage, lowest-effort win; (2) add credit estimation to the review step — it is a trust issue, not a nice-to-have; (3) add progressive disclosure and layman-friendly copy to the intake UI — Streamline's target users are not power users.

The two biggest gaps in the current thinking are the lack of a contextual intake mode (you should be able to use Streamline from inside Stage 8, not only Stage 1) and the missing conflict resolution design (what happens when two uploaded documents say different things about the same character). Both of these need a clear design answer before the routing logic is built.

The feature ideas in the current docs are generally right. The sequencing needed adjustment. The UX approach needed a challenge: don't build another wizard on top of a pipeline that already has 12 stages. Build a workspace.
