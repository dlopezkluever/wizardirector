# Streamlined Inputs — Master Plan

*August 1, 2026. This is the working plan for the Streamline initiative, synthesized from everything written about it since the idea first appeared: the SF-move voice-note transcripts, `planning-wif-lawrence.md`, `streamlined-input-process-consolidated.md`, `streamlined-input-analysis-5-10.md`, and the various tickets scattered across `newest-tickets-while-in-master/`. Two decisions that were previously left open are now locked in and reflected throughout: Streamline replaces the (currently non-functional) Script Skip mode in Stage 1, and the build order follows the "remove the biggest friction first" sequencing from the May 10 analysis.*

---

## 1. What This Is, In One Paragraph

Right now, every user — no matter how much material they already have — walks through Stage 1 (idea) → Stage 2 (treatment) → Stage 3 (beats) → Stage 4 (script) → Stage 5 (assets) one generation at a time. That's the right experience for someone starting from nothing. It's the wrong experience for someone who already has a finished screenplay, or a script plus character sketches, or a pile of voice notes and half a treatment. Streamline is a new front door for that second kind of user: a place to drop whatever they already have — documents, images, eventually audio — and have the app figure out what it is, ask what's missing, and land them as far into the pipeline as their material earns them, with everything upstream clearly marked as skipped rather than silently absent.

It does not replace the 12-stage pipeline. It feeds it.

## 2. Where It Lives

Streamline becomes the fourth Stage 1 input mode, replacing "Script Skip" (which currently exists as a button that does nothing — selecting it still runs the user through Stages 1→2→3→4→5 like every other mode). The other three modes — Expansion, Condensation, Transformation — are untouched.

Internally, Streamline is **not** built as a script-only shortcut. It's a general intake pipeline that happens to handle scripts as its best-supported case first. This matters because it means the later phases (routing treatments, beat sheets, character images) are extensions of the same system, not bolted-on afterthoughts.

This is a near-term placement, not a permanent one. If Streamline proves itself as the more natural way for most users to start a project, a future redesign could make it the default Stage 1 experience with the other three modes as secondary presets. That's explicitly not part of this build — the existing four-mode selector stays the primary Stage 1 mental model for now.

## 3. What Already Exists That This Builds On

Two pieces of infrastructure this plan leans on are already live, so Streamline doesn't need to reinvent them:

- **The Enhanced Upload Modal** (`EnhancedUploadModal.tsx`, used in Stage 5 and Stage 8): when a user uploads an image, they already get a reconciliation flow — current description vs. extracted description vs. editable final description, plus Edit Image / Apply Visual Style / Remove Background / Regenerate actions. When Streamline routes an uploaded character or location photo to Stage 5, it hands off into this existing flow rather than building a parallel one.
- **Stage 5's manual asset creation and image upload** are already fully supported — assets don't have to come from script extraction.

Everything else described below is new.

## 4. The Ideal End State — What Using The App Feels Like After This Is Done

### A user with a finished script

They create a project, land on Stage 1, and instead of picking Expansion or Condensation, they pick **Streamline**. A drop zone appears. They drag in their screenplay PDF. The app reads it, recognizes it's a formatted script with high confidence, and shows them a one-line summary: *"This looks like a complete screenplay. We'll skip Treatment and Beat Sheet and take you straight to Stage 4 for review."* They confirm. Three clicks total, start to finish. They land in Stage 4 with their script already parsed into scenes, and Stages 2 and 3 sit in the pipeline sidebar with a clear **SKIPPED** badge instead of looking incomplete or broken.

### A user with a messy pile of material

They have a rough half-script, notes for two of five characters, a treatment that trails off mid-paragraph, and three reference images. They drop everything into Streamline at once. Cards appear for each file as the system classifies them — a script fragment, two character sheets, an incomplete treatment, three images tagged as likely character references — each showing a confidence label ("94% confident: Character Description," "58% confident: Treatment — is this right?"). They correct one misclassification with a dropdown. Because the material is incomplete and contradictory in places, a short **Ask Auteur** question session opens: multiple-choice questions with a "type your own answer" option, things like *"You mentioned two different names for the antagonist — which one is correct?"* or *"This section reads like it was cut off. Should we treat what follows as a new scene, or drop it?"* They answer four or five questions. Then they see a review screen: which stages will be filled with their material as-is, which will be AI-completed from what's missing, and what all of it will cost in credits. They confirm, and land in the pipeline at the stage that makes sense given what they had — probably Stage 3, with Stage 2 auto-filled from their treatment fragment.

### A user who's already deep in production

They're in Stage 8 working on Scene 6 and a collaborator just sent them three new reference photos for a character who shows up in the final act. Instead of backing all the way out to Stage 5 to add an asset the long way, they can open Streamline from within the scene workflow, drop the photos, and the system recognizes them as character references and offers to route them straight into Stage 5 (and, if relevant, into the current scene's Stage 8 assets) without derailing the scene they're working in.

### A returning series creator

They finished Episode 1. Starting Episode 2, they don't want to re-describe the same three characters and the same visual style. They apply Episode 1 as a template, and the new project starts with those assets and that style capsule already loaded — they only need to supply what's new: this episode's script.

---

## 5. The Full Feature Set

Organized in build order — each phase delivers something a user can feel on its own, rather than requiring the whole system to exist before anything works.

### Phase 1 — Fix the thing that's already broken

**1.1 Real script skip.** When a user uploads a formatted screenplay through the new Streamline mode, the app actually bypasses Stages 2 and 3 instead of pretending to. This requires the backend stage-locking rules to understand a new state beyond draft/locked — a stage can now be *skipped*, which blocks entry but is clearly distinguishable from "not started." Skipped stages get a visible **SKIPPED** badge in the pipeline sidebar.

**1.2 Optional backfill, never automatic.** A user who skipped Treatment and Beat Sheet can later choose to have the app reverse-generate them from the script — for documentation, for editing later, or before branching. This never happens automatically and never spends credits without an explicit request.

This phase alone fixes the single most-complained-about gap: uploading a script today does not actually save the user any work.

### Phase 2 — The intake foundation

**2.1 Structured upload panel.** The new Streamline entry point: a multi-file drop zone plus a paste-text option. Supports TXT, MD, PDF, DOC/DOCX, and RTF. Each file gets automatic type detection (script, treatment, beat sheet, character notes, unclassified) with a manual override dropdown. One file can be marked primary; the rest are supporting context. This is a generalization of the file staging area Stage 1 already has today, extended with type detection and a broader file-type story (PDF extraction in particular needs to actually work — today it doesn't).

**2.2 Review before commit.** Before anything is written to the pipeline, the user sees exactly what the system detected and what it's about to do: which stages will be filled, which will be skipped, which will be AI-generated to fill gaps. Nothing commits until they approve it. This is treated as a hard requirement from the first version, not something added later — a system that silently decides what to do with a user's material will not be trusted.

**2.3 Credit estimate in the review step.** If committing an intake will spend credits (AI-formatting messy documents, generating treatment/beat sheet backfill, analyzing images), the review screen shows the estimate before the user confirms — the same pattern already used for cost confirmation in Stage 8 and Stage 11.

**2.4 Partial success handling.** If five files are submitted and two fail to parse, the user isn't blocked from proceeding with the three that worked. Failed files can be retried, reclassified, or dropped without losing the rest of the batch.

### Phase 3 — Making the system smart about what it was given

**3.1 Per-file import choice: as-is vs. AI-format.** Clean, well-structured documents get inserted directly with no AI cost — the user then uses the pipeline's existing edit tools to refine. Messy or unstructured documents get run through an AI pass that restructures them into the format the target stage expects (e.g., extracting individual beats out of a prose beat sheet). The system defaults this choice per file based on its own confidence, but the user can override any file individually. Confidence is always shown, not hidden — "95% confident: Screenplay" earns trust; "62% confident: Treatment or Outline — what is this?" invites a correction instead of a silent guess.

**3.2 Routing text content into Stages 2–5.**
- A supplied **treatment** is imported directly into Stage 2 (as-is or AI-formatted per the choice above); if only notes exist, Stage 2 generates as normal.
- A supplied **beat sheet** is parsed into Stage 3's structured beat format; if only a treatment exists, Stage 3 generates as normal.
- A supplied **script** is parsed into Stage 4's scene structure; this is where the Phase 1 skip logic and the general intake system meet.
- **Character, location, and prop descriptions** — whether their own files or extracted from a script — feed Stage 5's asset extraction.

**3.3 Image routing to Stage 5.** Character, location, and prop images uploaded through Streamline become project assets, using the existing Enhanced Upload Modal reconciliation flow described in Section 3 rather than a new one.

### Phase 4 — Ask Auteur Questions

This is the clarification layer, and it's the piece that turns Streamline from a file parser into something closer to an assistant. After the system has analyzed everything submitted, it asks a short, targeted set of questions to resolve whatever it couldn't figure out on its own — modeled directly on the "ask clarifying questions instead of guessing" pattern from Claude Code's own AskUserQuestion tool, which is the explicit reference point for this feature.

**4.1 The question format.** Every question is multiple-choice with a final "type your own answer" option — never an open-ended blank text box as the primary interface. Questions stay targeted and few; this is not a long intake form. Answers are saved as first-class project context and feed into every downstream generation, not just used once and discarded.

**4.2 What triggers a question.** Contradictions between two uploaded documents (two different names for the same character, two different endings implied). Vague or underspecified character traits the user clearly meant to define but didn't finish (an accent mentioned once and never described, a personality note that trails off). Ambiguous structure — a paragraph that reads like a discarded aside rather than real story content ("is this a kept idea or should we drop it?"). Missing information the pipeline needs but nothing supplied addresses (no visual style anywhere in the material — infer one, or ask the user to define it?).

**4.3 Conflict resolution as a special case of this layer.** When two inputs disagree — the script describes a character one way, an uploaded reference image shows something else — the system does not silently pick one. It surfaces the conflict directly as a question and lets the user resolve it. The default authority ranking when conflicts aren't explicitly resolved: an explicit answer to a clarification question outranks the primary uploaded document, which outranks supporting context files, which outranks anything the AI inferred to fill a gap.

**4.4 Streaming feedback during analysis.** Rather than a spinner while the whole batch is analyzed, classification results appear file-by-file as they resolve, so a large batch feels responsive and gives the user something to review while later files are still processing.

### Phase 5 — Reach features (valuable, but after the core loop is solid)

**5.1 Intake session persistence.** A user who starts an intake, adds four files, and closes the tab should be able to come back to exactly that state — a persistent "staging area" that holds submitted material until the user explicitly commits it to the pipeline.

**5.2 Contextual intake — Streamline from inside production.** Today Streamline only makes sense as a Stage 1 entry point. This extends it so a user working in, say, Stage 8 on Scene 6 can open Streamline to add newly-received material (a collaborator's reference photos, a late addition) without leaving their place in production. The system recognizes where the user currently is and offers to route new material accordingly — e.g., "these look like character references — add them to Scene 6?"

**5.3 Dashboard "start from files."** Today, starting a project means: click new project card → type a title → wait → land in Stage 1. A user who already has a script or a pile of notes experiences this backwards — they have the content, and the app is asking for a title first. A "Start from Files" entry point on the dashboard opens Streamline intake directly and auto-names the project from the imported material.

**5.4 Import templates for repeat creators.** For episodic or series work, a finished project's configuration (global assets, style capsule, project type, tone) can be saved and applied to a new project, so the next episode only requires the new script.

**5.5 Asset-only intake.** A user deep in Stage 8 or 9 who needs to introduce one new character or location shouldn't have to walk the full asset-extraction flow. A scoped intake mode routes directly to Stage 5 (and optionally the current scene's Stage 8) for just that addition.

**5.6 Script revision reconciliation.** A writer finishes a second draft and wants to push it in without losing Stage 7–12 work already done on the first draft. This is a "replace script and reconcile" path: diff the new script against the old one, flag which scenes actually changed, preserve untouched scenes, and mark only the changed scenes for Stage 7 re-entry. Simpler than true branching — a controlled update, not a fork.

---

## 6. What's Explicitly Not Part Of This Build

These ideas are real, they showed up repeatedly across the source material, and they're worth keeping on the roadmap — but building them now would either duplicate work that should wait for a standalone effort, or would stall the core intake loop with scope that doesn't need to ship together with it.

- **Audio intake** — voice notes transcribed into project context, recorded dialogue overriding scripted lines, voice-print cloning that preserves emotional inflection, audio-first projects (podcasts, audiobooks) where visuals are generated to match a narration timeline. Scoped out entirely for this build; when it returns, keep it to "transcribe and route to context," not the full audio-first product mode.
- **Storyboard and sketch frame routing into Stage 10.** Real, valuable, but it's a Stage 10 feature that intersects with Streamline rather than belonging inside its MVP.
- **CineBlock package import.** CineBlock is its own standalone 3D blocking tool (browser-based previs with Gaussian-splat world generation, mannequin placement, virtual camera capture) that already exports a JSON/PNG shot package designed specifically to feed Aiuteur's pipeline. That integration point is real and the export contract already exists — but it should be built as a first-class Stage 7/Stage 10 integration, not folded into Streamline's general intake surface. If CineBlock output can be imported *through* Streamline later, that's a natural extension once both sides are stable independently.
- **The "just talk to me" conversational intake mode.** A free-form spoken-or-typed conversation for users who have no files yet, only ideas in their head — distinct from the Ask Auteur clarification layer in Phase 4, which only runs after material has been submitted. Adjacent and worth building eventually; not in this scope.
- **YOLO / full auto-pipeline mode.** Automatically advancing through the entire pipeline with minimal checkpoints. This depends on Streamline's core infrastructure being solid first — building it now would mean automating on top of something not yet proven.
- **Personal creative fingerprint / lore library / "second brain."** A persistent, cross-project memory of a user's characters, style, and voice. Streamline's intake can eventually feed this, but it needs its own design effort.
- **Film reference deconstruction** (uploading a reference clip and extracting visual style/shot patterns from it) and **collaborative multi-contributor intake** — both real ideas, both explicitly future work.

## 7. Defaults Being Adopted (Flagging For Confirmation)

A few specific behaviors were left as open questions in earlier planning notes. Rather than re-litigate them, this plan adopts the previously-recommended defaults below. Flagging them here so they can be overridden before implementation starts if any of them are wrong:

- **Import mode default:** auto-detect confidence decides as-is vs. AI-format per file, always with a visible per-file override. Not a single global toggle.
- **Skipped-stage display:** a clear SKIPPED badge that blocks entry, distinct from stages that were auto-filled (AUTO-FILLED badge) or directly supplied by the user (IMPORTED badge). All three are visually distinct from a stage that's simply pending.
- **Image upload placement:** all images (character/location/prop references) are accepted in the same Streamline intake in Stage 1, tagged by detected type, and routed to Stage 5 on commit — rather than being split across per-stage upload points.

---

## 8. What Doesn't Change

Worth stating explicitly since it's easy to lose track of while reading a long feature list: the 12-stage pipeline's structure, the Phase A/Phase B split, sequential stage locking, and the existing generation/edit tools inside each stage are not being redesigned. Streamline is additive — a faster way to arrive at the right point in that structure with more of the work already done, not a replacement for the structure itself.


