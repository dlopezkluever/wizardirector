# Streamlined Input Process - Consolidated Initiative

## User Problem And Intent

Aiuteur currently has a deliberate 12-stage workflow that gives users strong control, but the first-time path can feel tedious for users who already have material. The Streamlined Input initiative is a faster alternate path for people who want to throw unstructured or semi-structured project material into one intake space and have the system organize it into the structured artifacts required by the production cycle.

The target input set is broad: audio notes, voice memos, large documents, PDFs, rough scripts, beat sheets, treatments, character notes, world-building notes, images, storyboard frames, sketches, existing frame stills, recorded dialogue, and other scattered project assets. The system should analyze whatever is submitted, identify what each item is, extract useful information, ask clarifying questions where needed, and route the results into the right pipeline stages.

This should be cohesive with the existing pipeline, but it is a different pathway from the current step-by-step writing flow. Some users will not come for the writing tools. They may already have a script, a pile of notes, a few character images, audio performances, or a storyboard, and they want Aiuteur to help them get to production faster.

## Core Thesis

The Streamline path should not replace the detailed pipeline. It should be an intake and normalization layer in front of it.

It should:

- Accept messy multi-modal project material in one place.
- Classify each input by document or asset type.
- Extract structured artifacts from the submitted material.
- Fill the pipeline as far as the user's material justifies.
- Skip or mark irrelevant upstream stages when a later-stage artifact is already supplied.
- Ask targeted follow-up questions when the input is contradictory, incomplete, or too vague.
- Preserve the option to enter the normal stage-by-stage workflow afterward.

The clean product promise is: "Drop in what you already have. Aiuteur figures out what it is, asks what it needs, and builds the production-ready project scaffold."

## Current Pipeline Baseline

The existing Stage 1 design already has four conceptual modes:

- Expansion: a short idea becomes a treatment.
- Condensation: a large text upload becomes a cinematic narrative.
- Transformation: source material plus a twist becomes a new story.
- Script Skip: a formatted screenplay should parse directly into Stage 4.

The project overview states that Script Skip is meant to streamline prepared users by parsing a screenplay directly into the Stage 4 Master Script format. It also defines a multi-file staging area where the user designates one primary input and tags supporting context files.

However, implementation notes say the current code does not fully realize this:

- Stage 1 has a "Script Skip" mode, but all modes still proceed sequentially through Stages 1 to 5.
- Stage 1 only accepts text-oriented files in the current flow.
- PDF extraction is weak or absent in the explored implementation.
- Stage 2 and Stage 3 are AI-generation-first, with no direct import path for user-provided treatment or beat sheet.
- Stage 4 has a TipTap editor and can accept pasted script text, but lacks one-click file import.
- Stage 5 already supports manual asset creation and image upload.
- Backend locking enforces sequential stage progression, which blocks clean skipping unless stage-state rules are updated.

## Main Streamline Entry Models

The docs describe several possible entry-point designs.

### Option 1: Replace Script Skip

Replace the fourth Stage 1 input mode with "Structured Inputs" or "Streamline." Users choose this mode and get a multi-file upload area with document type dropdowns.

Pros:

- Smallest conceptual change to the current Stage 1 UI.
- Reuses the existing idea that one mode can be for prepared users.
- Clear MVP surface.

Cons:

- Streamline is broader than script skip.
- It may hide the feature behind one of several cards.

### Option 2: Separate Streamline Panel

Keep the four Stage 1 modes, but add a dedicated Streamline button or section that opens a structured upload panel.

Pros:

- Preserves current modes.
- Lets Streamline become a richer intake experience without overloading one mode.
- Can be used by users who select any mode.

Cons:

- Adds another entry choice.
- Needs careful UI hierarchy to avoid confusion.

### Option 3: Make Streamline The Default Stage 1

Stage 1 becomes one unified upload and prompt area. Old modes become secondary presets.

Pros:

- Best long-term UX if the product shifts toward "drop in whatever you have."
- Fits the layman-user mental model.

Cons:

- Larger redesign.
- Could weaken the structured clarity of the original Stage 1 modes.

### Recommended Direction

Near term: implement Streamline as a dedicated Stage 1 panel or replacement for Script Skip, but model it internally as a general intake pipeline, not a script-only shortcut.

Long term: make Streamline the primary Stage 1 experience if it proves more natural than the four-mode selector.

## Input Types To Support

### Text And Document Inputs

Supported or desired:

- Idea fragments.
- Rough notes.
- Treatments.
- Beat sheets.
- Outlines.
- Half-finished scripts.
- Complete formatted screenplays.
- Novels or large documents.
- Character descriptions.
- Setting/location notes.
- World-building notes.
- Research notes.
- Style guides.
- Parody or transformation source material.
- PDFs, DOC/DOCX, TXT, MD, RTF.

Desired behavior:

- Auto-detect document type where possible.
- Allow manual override through a document type dropdown.
- Let user paste text or upload files.
- Store raw source material for traceability.
- Convert recognized beat sheets into Stage 3 JSON.
- Convert scripts into Stage 4 formatted script and scenes.
- Store character/setting descriptions for Stage 5 asset extraction or direct asset creation.
- Treat unclassified files as context rather than discarding them.

### Audio Inputs

Several docs emphasize audio as both source material and production material.

Use cases:

- Voice notes or rambling project notes.
- Recorded dialogue lines.
- Voice acting performances.
- Audio-first projects such as podcasts, audiobooks, or lecture/transcript material.
- Character voice samples.

Desired behavior:

- Transcribe audio.
- Detect when speech contains interruptions, filler, or unrelated fragments.
- Extract story intent, character ideas, tone, and unresolved questions.
- Allow recorded dialogue to override or update scripted dialogue when the performance is better.
- Preserve emotional performance and inflection when later using voice cloning or voice transformation.
- For longer recorded dialogue, split across multiple video clips while maintaining audio continuity.

### Visual Inputs

Supported or desired:

- Character images.
- Prop images.
- Location/environment images.
- Style references.
- Mood boards.
- Storyboard frames.
- Rough sketches or doodles.
- Existing frame stills.
- CineBlock captures or other blocking references.
- Photos containing multiple people to be mapped to characters.

Desired behavior:

- Analyze image contents.
- Let users name people or objects in images.
- Reconcile image-derived descriptions with existing written descriptions.
- Route character/prop/location images to Stage 5.
- Route scene-specific or storyboard images to Stage 8, 9, or 10 depending on usage.
- Preserve storyboard frames or sketches as composition/blocking references rather than treating them as final style.

### Mixed Project Bundles

The highest-value Streamline path is a mixed bundle:

- Script plus character images.
- Script plus recorded lines.
- Script plus storyboard frames.
- Treatment plus sketches.
- Voice notes plus PDFs plus mood board.
- Half-finished script plus lore notes.

The system should infer how much creative liberty it has. If the user provides only a script and one character image, the system fills in more. If the user provides script, character sheets, style frames, audio, and storyboard stills, the system should follow those inputs tightly and fill only the missing pieces.

## Import Behavior Choices

The docs preserve three possible import modes:

### Insert As-Is

Uploaded text becomes the starting content directly. This spends no AI credits and lets the user refine with existing tools.

Best for:

- Clean treatment import.
- Clean script import.
- User-authored beat sheets that already match the expected structure.

### AI-Format

The system parses and restructures the upload into the expected stage format.

Best for:

- Prose beat sheets that need extraction.
- Messy notes.
- PDFs or long documents.
- Half-finished scripts.
- Mixed bundles where structure must be inferred.

### User Chooses Per File

Each upload gets a toggle: use as-is or AI-format.

Best long-term behavior:

- It preserves control for power users.
- It lets users mix clean source documents with messy context notes.

Recommended MVP:

- Default to auto-detect plus user override.
- Use as-is for high-confidence clean imports.
- AI-format for messy or mismatched inputs.
- Always show a preview before committing generated stage content.

## Stage Routing Strategy

The Streamline system should map detected inputs to stage artifacts.

### Stage 1

Owns project-level setup and raw intake:

- Project type.
- Target length.
- Rating.
- genre/tone.
- Written style capsule.
- Visual style capsule or manual style description.
- Raw source files.
- File classifications.
- Clarification answers.

### Stage 2

Receives or generates treatment:

- If a treatment is supplied, import as Stage 2 content.
- If notes or long prose are supplied, generate a treatment.
- If a finished script is supplied, Stage 2 can be skipped or optionally backfilled.

### Stage 3

Receives or generates beat sheet:

- If a beat sheet is supplied, parse into structured beats.
- If a treatment is supplied, generate beats as normal.
- If a finished script is supplied, Stage 3 can be skipped or optionally reverse-generated.

### Stage 4

Receives script:

- If a formatted screenplay is supplied, import directly into Stage 4.
- Parse scenes deterministically where possible.
- If only treatment/beats exist, generate script as normal.

### Stage 5

Receives global assets:

- Use script-derived extraction.
- Also ingest user-supplied character/setting/prop sheets.
- Convert uploaded character/prop/location images into project assets.
- Analyze uploaded images and reconcile descriptions.
- Support manual asset creation without requiring generation.

### Stage 6 And Stage 7

For a fully supplied script or storyboard-driven package:

- Stage 6 should use imported scenes.
- Stage 7 should extract or import shot lists.
- Storyboard labels like 1A, 1B, 2A should be matchable to script or outline labels.
- If storyboard data is strong enough, Stage 7 should focus on distilling and categorizing, not inventing.

### Stage 8

Receives scene-specific visual state:

- Scene-specific asset images.
- State changes such as outfit, injury, condition, props in hand.
- User-supplied scene reference images.
- Manual additions/deletions of assets.
- Auto-populated assets by default, with user correction.

### Stage 9

Receives prompt-ready structured context:

- Final asset references.
- Shot-level asset relevance.
- Storyboard/reference image notes.
- Frame prompt and video prompt inputs.

### Stage 10

Receives visual anchors:

- Uploaded storyboard frames.
- User-generated stills.
- CineBlock captures.
- Rough blocking/sketch references.
- Prior approved frames to reuse and edit.

## Skipped Stage Behavior

The docs repeatedly mention that prepared users should not be forced through unnecessary stages.

Options:

- Mark skipped stages with a clear "SKIPPED" badge and prevent entry.
- Mark skipped stages as optional and allow later manual entry.
- Auto-populate skipped stages by reverse-generating treatment and beat sheet from the script.

Recommended behavior:

- If a user imports a script, route them to Stage 4 and mark Stages 2 and 3 as skipped.
- Let users optionally backfill Stage 2 and 3 later for documentation, editing, or branching.
- Do not spend credits backfilling unless the user explicitly asks.
- Ensure backend stage locking supports a valid skipped state, not just draft/locked.

## Clarification Layer: "Ask Auteur Questions"

The docs strongly argue for an assistant-style clarification layer after input analysis.

Purpose:

- Resolve contradictions.
- Clarify vague character motivations.
- Ask about missing plot direction.
- Identify irrelevant transcript fragments.
- Turn disorganized notes into a coherent treatment.
- Let users choose branches when multiple interpretations are plausible.

Interaction style:

- Multiple-choice answers with a final free-text option.
- Voice input should be supported eventually.
- Questions should be targeted and limited, not a long form.
- Answers become first-class project context.

Examples of questions:

- "You mention two possible endings. Which should be the main branch?"
- "Is this paragraph a discarded idea, or should it remain part of the story?"
- "You supplied a script but no visual style. Should Aiuteur infer one or do you want to define it?"
- "This storyboard frame appears to match Scene 2B. Is that correct?"

This layer is especially important for "really disorganized thoughts" mode, where the system acts less like a form parser and more like an assistant organizing chaos into pipeline-ready structure.

## Asset Conversion And Asset Creation

Asset-related notes are adjacent to Streamline because Streamline should route user-supplied assets into the production system.

### Image Upload Reconciliation

When a user uploads an image for an asset, the system should not blindly accept it or blindly overwrite text descriptions.

Desired modal:

- Current description.
- Extracted description from image analysis.
- Editable final description.
- Merge descriptions action.
- Tag-based adjustment.
- Accept/reject final result.

Intent modes:

- Full replacement: uploaded image is the asset.
- Starting point: uploaded image is a reference for further editing.

The later modal spec recommends implicit intent handling:

- Upload always opens the enhanced modal.
- If happy, user accepts.
- If not, user uses Edit Image, Apply Visual Style, Remove Background, or Regenerate from Description.

### Edit Image / Apply Style / Remove Background

Desired actions:

- Edit image with text instruction.
- Apply project visual style to uploaded image.
- Remove or whiten background for characters, props, and extras.
- Regenerate from the final description.
- Use current image as reference toggle.

Why this matters for Streamline:

- A layman user may upload a real photo, rough sketch, or imperfect generated image.
- The system should help convert it into a pipeline-ready asset without forcing them into a separate design workflow.

### Character And Multi-Person Photos

One note describes uploading a photo with several people and assigning identities:

- User names each person.
- User specifies how each should be visually changed.
- User can attach or record voice samples.
- The system creates character assets from those mappings.

This should be treated as a later Streamline asset-intake extension.

### Manual Assets And Scene Asset Flow

Existing notes identify gaps:

- Users must be able to re-add missed or accidentally deleted assets in Stage 8.
- Assets should auto-populate into Stage 8 by default.
- Users should manually add/delete assets after auto-population.
- Users should recategorize assets when extraction mislabels a prop as a character or similar.
- Current prompt generation may include all scene assets in all shots, which is too blunt.

For Streamline, imported assets should not just exist globally. They need shot-level relevance eventually.

## Storyboard, Sketch, And Frame Still Inputs

Storyboard support appears in multiple places:

- Users should be allowed to upload image frames if they have them.
- Storyboard frames can be Stage 1 inputs, but may be better handled in Stage 10 where they are used.
- If storyboard labels match script/outline labels, the system should align them.
- A storyboard-driven mode could bypass Stages 2-4 and reduce creative work in Stages 6-7.

Recommended routing:

- Stage 1 Streamline accepts storyboard frames as part of the project bundle.
- The system classifies and stores them.
- If the user maps them to scenes/shots, they route to Stage 7/10.
- If unmapped, they remain in an input bin for later assignment.

Sketch and doodle behavior:

- Treat sketches as composition or blocking guides.
- Do not treat them as final character identity or final visual style unless explicitly tagged.
- Use them with text prompts and asset references to generate real frames.

## CineBlock And Blocking Inputs

CineBlock notes describe a rough 3D blocking tool:

- Upload several environment reference images.
- Generate a rough 3D world model.
- Place mannequin-like characters and primitive props.
- Frame shots quickly with a virtual camera.
- Capture start/end frames and metadata.
- Export shot packages with PNG frames and JSON metadata.

How this relates to Streamline:

- CineBlock output can become a high-value structured input.
- Captures should route to Stage 10 as composition/blocking references.
- Camera metadata should route to Stage 7 shot list fields.
- Asset placement metadata should inform shot-level asset assignment.

Important prompt distinction:

- Blocking references should control camera framing, subject placement, pose/blocking, screen direction, and visible/occluded relationships.
- They should not override character identity, prop identity, lighting, texture, final location appearance, or art direction unless explicitly marked.

## Frame Reuse As A Low-Friction Continuity Strategy

Several location-continuity notes argue that ordinary users should not be forced to author many location directions.

Lower-friction approach:

- Use one strong location image or description.
- Generate a frame.
- If the frame works, reuse it later as a reference.
- Drag/drop prior approved frames into later shots.
- Edit the prior frame to update characters, action, condition, or story state while preserving background continuity.

This is relevant to Streamline because it supports the broader goal of moving fast. Users should be able to start with imperfect but useful visual truth and iterate from there.

## Audio And Voice Acting Integration

Audio notes belong in the intake initiative because users may arrive with voice performances before they have a final structured script.

Desired capabilities:

- Upload recorded lines with a script.
- Let recorded dialogue replace script dialogue when the performance improves it.
- Preserve emotional inflection when applying another voice print.
- Split long audio over multiple shots while keeping continuity.
- Assign voice profiles to characters.
- Support audio-first projects where visuals are generated to match a transcript or narration timeline.

Near-term Streamline interpretation:

- Accept audio files.
- Transcribe them.
- Classify as notes, dialogue, narration, or voice sample.
- Route notes to treatment/script context.
- Route dialogue/narration to Stage 9/12 audio context when possible.
- Route voice samples to character metadata when explicitly mapped.

## "YOLO" Or Auto-Pipeline Mode

The Yolo-mode note describes an even faster path:

- User submits script, recorded audio lines, storyboard, and frame stills if available.
- System automatically moves through the pipeline like an agent.
- It keeps characters consistent.
- It fills missing details based on how much was supplied.
- If too much is missing, it takes creative liberties.
- If the user supplied a lot, it follows the source tightly.

This should be treated as a future automation layer on top of Streamline, not the MVP.

MVP Streamline should build the structured project scaffold and route the user to review checkpoints. YOLO mode can later auto-advance through those checkpoints with fewer interruptions.

## Lore Library And Second Brain Relationship

Several notes describe longer-term persistent context:

- A lore library for characters, settings, relationships, history, and rules.
- A "second brain" that learns the user's writing rhythm, visual taste, humor, and prior work.
- Past scripts, sketches, mood boards, voice recordings, and videos can be ingested to create a creative fingerprint.

Relationship to Streamline:

- Streamline intake can collect the raw material that later powers a lore library.
- For MVP, keep this scoped to project-level inputs.
- Later, let users choose whether an uploaded item is project-only or reusable personal-library context.

## MVP Scope Recommendation

The docs identify "Structured Upload only" as an MVP priority, while storyboard upload and formal input templates were deferred in one planning document. Given the current product need, a practical MVP should include:

### MVP 1: Structured Upload Panel

- Multi-file upload and paste area.
- File type detection.
- Manual document type dropdown.
- Primary vs context designation.
- Per-file import behavior: use as-is or AI-format.
- Basic support for text/PDF/DOC/MD/TXT/RTF.
- Store raw source files and extracted text.

### MVP 2: Routing To Stages 2-5

- Treatment import or generation.
- Beat sheet import to structured beat JSON.
- Script import to Stage 4.
- Character/location/prop descriptions stored for Stage 5 extraction.
- Uploaded asset images routed to Stage 5 as project assets.

### MVP 3: Script Skip That Actually Works

- If script is supplied, bypass Stages 2-3.
- Mark skipped stages clearly.
- Let user optionally backfill treatment/beat sheet later.
- Update stage locking/backend validation to support skip state.

### MVP 4: Clarifying Questions

- After analysis, ask a small set of targeted questions.
- Save answers as structured project context.
- Use answers in downstream generation.

### MVP 5: Review Before Commit

- Show what the system detected.
- Show which stages will be filled or skipped.
- Let user correct classifications before committing.

## Post-MVP Scope

Strong candidates:

- Storyboard-driven pipeline mode.
- Audio note transcription and dialogue import.
- Voice sample mapping to characters.
- CineBlock shot package import.
- Per-shot asset assignment from storyboard/blocking data.
- "Organize my notes" conversational assistant.
- YOLO auto-pipeline mode.
- Lore library / reusable creative memory.
- Personal creative DNA / second brain.
- Film sample / reference clip deconstruction.
- Live-action hybrid intake.

## Implementation Implications

### Data Model

Likely new concepts:

- `input_bundle`: one Streamline session.
- `input_items`: uploaded/pasted/recorded files with raw metadata.
- `input_item_classification`: detected type, confidence, user override.
- `input_extractions`: extracted text, summary, entities, scenes, beats, assets.
- `stage_route_plan`: proposed routing to stages.
- `clarification_questions` and `clarification_answers`.
- Stage skipped metadata.

### Backend Services

Needed services:

- Document extraction service.
- Classification service.
- Audio transcription service.
- Image analysis service.
- Stage artifact builder.
- Route planner.
- Clarification question generator.

### Frontend UX

Suggested flow:

1. User opens Streamline.
2. User drops files, pastes text, or records audio.
3. System classifies inputs and shows a review table.
4. User corrects types and primary/context roles.
5. System asks a small number of clarifying questions.
6. System previews route plan: "Stage 2 skipped, Stage 3 generated, Stage 4 imported, Stage 5 seeded."
7. User confirms.
8. Pipeline opens at the most relevant review stage.

## Risks And Open Questions

- Should Streamline replace Script Skip or sit beside existing modes?
- Should storyboard frames live in Stage 1 intake, Stage 10, or both?
- How much AI parsing should happen automatically before user confirmation?
- What is the right backend representation for skipped stages?
- How do we avoid feeding too much irrelevant context into prompts?
- How should the system rank source authority when uploaded assets conflict?
- Should imported script be the source of truth, or should treatment/beat sheet backfills be allowed to affect it?
- How should per-shot asset inclusion be represented so imported storyboards and blocking data do not attach every asset to every shot?
- What file size and token limits are acceptable for large PDFs and novels?
- How should paid/credit-consuming actions be surfaced during intake?

## Proposed Implementation Order

1. Build the Streamline intake data model and raw file storage.
2. Add text/PDF/document extraction and classification.
3. Add route planner for treatment, beat sheet, script, and asset descriptions.
4. Implement real script skip with skipped stage state.
5. Add review UI before committing stage content.
6. Add clarification questions.
7. Add image asset routing to Stage 5 using the enhanced upload/reconciliation flow.
8. Add audio transcription and classification.
9. Add storyboard/frame routing.
10. Add CineBlock/package import and per-shot asset assignment.

## Source Notes Reviewed

Most relevant direct sources:

- `._docs/Streamline/planning-wif-lawrence.md`
- `._docs/newest-tickets-while-in-master/Streamline_mode.md`
- `._docs/newest-tickets-while-in-master/Input-Methods-Task.md`
- `._docs/project-overview.md`
- `._Post-MVP-Enhancements/consolidate-org-tickets/injecting-org-tickets-into-plan.md`
- `._Post-MVP-Enhancements/Stretch_Goals/Issues.md`
- `._Post-MVP-Enhancements/Stretch_Goals/Yolo-mode.md`
- `._Post-MVP-Enhancements/Stretch_Goals/truly strech.md`
- `._docs/thoughts-during-SF-move/askAuteurQ-QuirkifyShots.md`
- `._docs/thoughts-during-SF-move/AiuteurNightRunThoughts.md`
- `._docs/thoughts-during-SF-move/claudstorming.md`
- `._docs/topic-3.7.2026/3.7-phase-1-enhanced-upload-modal.md`
- `._docs/topic-3.7.2026/3.7-tasks-part-1.md`
- `._docs/during-master-mvp-task-feb-mar/on-frames/shot-asset-system-improvements/stage-8-add-asset.md`
- `voice-message-5-2.md`
- `CineBlock-system-overview.md`
- `5-3-location-implementation-plan.md`
- `._docs/5-1-location-system-intent-source.md`

Relevant historical/archive sources:

- `._docs/ignore/great-pivot/Save-key-docs-pre-2.4/project-overview.md`
- `._docs/during-master-mvp-task-feb-mar/phase 1-3/phase-2/phase-2-pre-parallel/2a-6-n-7-task-info.md`
- `._docs/ignore/possible-skills.md`
- `Zhe_Trash/pre-pivot(old-tasklist.md)/unedited-disorganized-tickets/4-recording and notes.md`

Irrelevant or low-signal notes in `._docs/Streamline` and personal note folders were not incorporated unless they directly described input streamlining, asset conversion, audio intake, storyboard intake, or production routing.
