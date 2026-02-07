## Regarding Stage 1, Inputs & Project Initializing

### 1.1 — Structured Uploading & Document Identification
The system must be able to analyze and identify commonly used documents (character descriptions, treatments, beat sheets) and use them to fill the context for Stages 2 or 3 rather than regenerating from scratch. Consider a "Structured Input" option where it becomes a form: the user can enter a file (or paste text), and for each submitted item, a dropdown identifies what it is (e.g., beat sheet → system converts to JSON and pushes to Stage 3; character descriptions → stored for use in Stage 5 extraction).

### 1.2 — Fix the "Skip" Option (Power User Feature)
Currently, the skip option incorrectly feeds into Stage 2. It should allow a user who already has a script to skip directly to Stage 4 or beyond. The basic philosophy is: take as much input context as given, refine it down to the Master Script as the source of truth, and from there expand out through the production cycle.

### 1.3 — Consider Storyboard Upload as Input Type
Allow users to upload a rough storyboard as a Stage 1 input (for quick storyboard enthusiasts). The system could identify scenes labeled as 1A, 1B, 2A, etc. and match with the written outline. This could enable a mode that skips Stages 2-4 and minimizes creative work in Stages 6-7 (just distilling and categorizing).

### 1.4 — Ideal Input Format Template
Consider providing a guided format for input documentation: `##Script: Y/N`, `##Plot`, `##Dialogue Rules & Examples`, `##Character Descriptions`, `##General Vibe`, `##Shot Styles`, `##Story Rules`.

---

## Regarding Stage 2 & 3

### 2.1 — Custom Revision UI for Treatment (Stage 2)
Instead of the default browser prompt box, a custom UI box should appear next to the treatment when a user highlights text. This allows "LLM edit or revise" functionality where users type suggestions and the LLM edits that section in place. Need clearer indication of the highlight-to-revise interaction.

### 2.2 — Contextual Regeneration Button (Stage 2 & 3)
The regeneration button should trigger a custom input box where users can suggest what they want changed, instead of it auto-regenerating without any context.

### 2.3 — Beat Sheet Generation Bug (Stage 3)
The generation functionality for the beat sheet "seems to do nothing." A toast message says "3 generation variations" are being made, but nothing appears. Needs investigation and repair.

### 2.4 — Consider Combining Treatment & Beat Sheet Into One Stage
Should the beat sheets be generated WITH the treatment in a split-screen layout so they help each other? Concern: if you make a beat sheet edit and proceed to Stage 4, the AI may get confused since the treatment would be disconnected from the beat sheet. Needs examination of how Stage 2 & 3 context feeds into Stage 4.

---

## Regarding Stage 4 + The Possible Ultra-Descriptive Master Document(s) Stage to Be Built After Stage 4 that will serve as the new "source of truth" stage.

### 4.1 — Scripts Are Insufficient for Production Prompting
Current scripts are written like standard screenplays: concise, flowery language, very low context/descriptions. This is insufficient for the prompting that happens in the production cycle. They lack character positioning, attributes, detailed scene descriptions, and clear action descriptions.

### 4.2 — Add a "Master Document" Stage After Stage 4
Consider a new stage (between current Stages 4 and 5) that transforms the base script into a super-descriptive "Master Document" as the single source of truth. Instead of `"Persephone is walking in park"`, it would say: `"Persephone: A thin blonde European woman with an angelic glow, calm smile, wearing a green tunic dress and flower crown, holding a basket of berries, walks in a magical green opening within a vibrantly colorful forest on the Greek mountainside..."` This document would describe every scene and every moment of change (including dialogue moments with full character descriptions). The process: finalize master script → check for character, asset, location, action descriptions from inputs → generate the master document from the base script.

### 4.3 — Stage 4 Needs Auto-Generation If Never Generated Before
Currently does not auto-generate on first visit.

### 4.4 — Fix Stage 4 Script UI
Especially regarding Characters & Dialogue formatting — it's very funky currently. The initial solution clearly isn't working well.

---

## Regarding Stage 5

### 5.1 — Visual Style Capsule Locking Too Restrictive
Users might click something wrong and there's no way to change it. The style capsule selection should be changeable (with the understanding that changing it later in the production cycle would trigger a new branch).

### 5.2 — Allow Manual Visual Tone Description Instead of Capsule
Similar to Stage 1's tone option, users should be able to describe their visual tone manually instead of picking a capsule. Offer common options: 3D animation, hyperrealistic, noir, 2D animation, etc. Allow custom visual description to be promoted as a starting point for a Visual Style Capsule. Should be more robust than just a single text box.

### 5.3 — Asset Extraction Filter Modal (Save Users $$$)
**Key UI improvement:** When extraction occurs, first show a pop-up modal with a compact list of extracted assets (name + category only, grouped under Characters / Locations / Props) — no descriptions or image areas yet. This is a checklist primarily for REMOVING assets the user doesn't care to pre-generate. **Recommended approach (Option A):** Filter before Pass 2 (description generation). Split extraction endpoint:
- `POST /extract-preview` — runs only Pass 1, returns raw entities (name, type, mentions) — cheap
- `POST /extract-confirm` — takes selected asset IDs, runs Pass 2 only for those — saves $$$ on skipped LLM calls

Modal features: grouped list, checkbox per asset (all selected by default), "Select All / None" per category, asset count display, "Confirm Selection (X assets)" button.

### 5.4 — Deselected Assets Should Be "Sidelined," Not Deleted
Removing an asset in Stage 5 should only hide it from the Stage 5 workflow — not delete it from the story or affect other stages. Sidelined assets are maintained in the database (their scene info preserved) for use in later stages like Stage 8 and Stage 10 (where the LLM generates them on-the-fly from script context). Users should be able to retrieve sidelined assets if they change their mind.

### 5.5 — Need Ability to ADD New Assets Manually
If the extraction misses something key, users should be able to add assets.

### 5.6 — Allow Assets to Not Require Images
Don't make it mandatory for the user to generate/upload an image for each asset. Only require it for the ones they care about.

### 5.7 — Visual Capsules Don't Seem to Influence Image Generation
Needs investigation — visual style capsules appear to have no effect on asset image generation in Stage 5.

### 5.8 — Multiple Views/Angles of Assets for Production
Consider generating multiple angles/views of assets (front shot, side shot, etc.) with no background noise — like engineering documentation views. This would help Stage 10 frame generation accurately place assets in different shot angles without confusion from background elements.

### 5.9 — Asset Backgrounds: Clean (White/Transparent/Black)
Generate assets on clean backgrounds to avoid confusing background noise when injected into frame + video generation. If an asset image has a castle interior with other characters, the LLM may get confused during frame generation and include irrelevant elements.

### 5.10 — "Lock All Assets and Proceed" Button Broken
Button is hidden due to poor color contrast between text and footer. Clicking it triggers a "stage 5 complete" toast but fails to actually navigate to Stage 6.

### 5.11 — Group Characters / "Extras" as Archetypes
For general background characters ("extras" in filmmaking) with little/no dialogue, create a new asset type as part of mise-en-scene. Instead of each extra needing individual persistence, it's a prototype/archetype of the type of extra (e.g., "Impoverished Plebeian" for a bubonic plague France setting) that represents what numerous background characters should look like.

### 5.12 — Ability to Delete Uploaded Image for an Asset
If a user doesn't want to predetermine an asset anymore, they should be able to remove the uploaded image.

### 5.13 — Extract Improved Description from Uploaded Image
Optional ability to extract a description from the uploaded image that's useful for production. Options: keep existing description, replace intelligently by describing what's pictured while adding missing necessary details from the script, or merge descriptions. Similar to how cloned assets work in the Asset-Matching Modal.

---

## Regarding Stage 6

### 6.1 — Script Hub UI: Cards Don't Fit / Headers Overflow
Scene cards overrun out of the container box. Headers are too long for the available space. Consider making the Script Hub section horizontally extendable, with dynamic text truncation based on width (e.g., full: `ext-launchpad-day-6` → compressed: `ext-launchpad..` → more compressed: `ext-lau..`). The tab container should also be scrollable.

### 6.2 — Fix Scene Header Formatting
Titles should NOT use the encoded format (e.g., `EXT-LOC-DAY-1`). Instead, use nice-looking headers following traditional script formatting (e.g., `Exterior [Location] Day`) with the scene number in front. The encoded format should be the subheading, not the title.

### 6.3 — Add Ability to Defer/Sideline a Scene
A scene can be greyed out in the Script Hub and ignored (as if deleted, but not actually deleted — just "sidelined/deferred"). When a user tries to delete the final/only shot in a scene, show a warning: "You CANNOT delete the last shot. However, would you like to defer/sideline this scene and return to the Script Hub?"

---

## Regarding Stage 7

### 7.1 — Shot List Extracted Action Too Concise
The extracted action and information going into the shot list needs to be much more descriptive. Currently often only a line of dialogue with vague buzzwords. Needs camera directions, crew notes, and detailed action descriptions. This is the preamble to the two key prompts made in Stage 9.

### 7.2 — Edit Merge Toggle to Be More Obvious
The next/previous toggle for merging shots is not obvious enough. The merge modal should house the toggle at the top: `"Merge with: Next (preselected) | Previous"`, then show the rest of the modal contents underneath.

### 7.3 — Warning When Deleting Final Shot
When a user tries to delete the last remaining shot in a scene, show a warning message and offer to defer/sideline the scene and return to the Script Hub instead.

### 7.4 — Consider "Extend Shot" Feature
Worth considering compatibility with Veo 3 and Sora's "extend" capabilities for shots.

---

## Regarding Stage 8

### 8.1 — "Locked" Status Should Not Be a Regular Status Flag
"Locked" should not appear as a status flag alongside the other statuses. It needs a different treatment in the UI.

### 8.2 — Master Asset Image Not Influencing Scene Instance Image
The master reference is not being taken into consideration at all for scene instance image generation. Instead, the visual style capsule is dominating the influence. Need to rebalance so master reference takes highest priority.

### 8.3 — Rearview Mirror Missing for Incomplete Previous Scenes
When no previous scene instance exists, instead show the latest assets from previous scenes — or even better, show each asset with their various previous modifications (previous scene instance images) as a carousel, so that image could be pulled and become the new master reference.

### 8.4 — Option to Use Master Reference AS IS
Users shouldn't be forced to generate a new scene instance image. They should be able to use the master reference directly for the scene if they choose.

### 8.5 — Carousel for Multiple Generated Scene Instance Images
When generating scene instance images, allow users to see all generations in a carousel and choose their favorite (e.g., first try was good, second was worse, third was decent — user should be able to pick the first).

### 8.6 — Master Reference Should Default to Most Recent Scene's Instance Image
E.g., Scene 4's master reference for the protagonist should default to Scene 3's scene instance image. The user should be able to carousel through and switch to older images if desired.

### 8.7 — Can't Proceed Without Generating Scene Instance for Every Asset
This is annoying — the point of Stage 8 is to add "final polish" to the assets you care about. If there's stuff you don't care about, you should be able to proceed without generating/customizing it.

### 8.8 — "Create Scene Asset" Button Incorrectly Opens Global Asset Drawer
The "Create Scene Asset" button pulls out the global asset drawer, which already has its own button. It should instead allow creating a new scene-specific asset from scratch. Also: rename right sidebar to "Add new assets."

### 8.9 — Persist Suggested Assets (DB Enhancement)
Create `scene_asset_suggestions` table, add backend routes, load/save suggestions in frontend.

### 8.10 — Need Ability to Remove Assets No Longer Relevant
Some extractions may be inaccurate — users should be able to remove assets from a scene.

### 8.11 — Allow Direct Image Upload for Scene Assets
Users should be able to just upload an image directly if they have one.

### 8.12 — Camera Angle Concern for Scene Instance Images
If a shot is an aerial shot looking down, but scene instance images are all standard medium shots — how does frame generation handle this? May need to add camera direction/angle metadata to scene instance images.

### 8.13 — Shot Presence Flags per Asset
Consider adding little flags for each asset describing which shot(s) they are present in for the scene.

---

## Regarding Stage 9

### 9.1 — Need Better Structured Image and Video Prompts
Current prompts are vague, unstructured paragraphs — likely not optimal for frame/video generation. Need robust, structured, deterministic prompts that leverage all work done in previous stages. Set format optimized per provider (one for Sora, one for Veo3).

### 9.2 — Visual Assets Should Be Shown Alongside Prompts
The prompt editing UI needs to show the relevant visual assets so users understand the full equation when editing.

### 9.3 — Video Prompt Could React to Frame Changes
Consider having the video prompt update/react when the frame shot changes.

### 9.4 — Allow User to Upload Additional Reference Images
True animators/filmmakers may have storyboards they want to reference. Allow photo upload as part of the process.

### 9.5 — Dynamic/Piping Descriptions for Action-Heavy Scenes
For scenes with a lot of action and change, descriptions need to be dynamically connected — the first frame & video prompt should pipe context down to subsequent ones in the scene.

---

## Regarding Stage 10

### 10.1 — No Influence from Master Assets in Frame Generation (Inheritance Failure)
Looking at generations in Stage 10, there's no influence from any master assets — just generic slop. Something is wrong with the asset inheritance into frame generation.

### 10.2 — Need End Frame Generation
Currently only generating the starting frame. Both starting frame AND end frame are required for the video production API.

### 10.3 — Inpainting Region Selection Tools (Deferred)
- Brush + shapes (rectangle, ellipse) for precise/quick region selection
- Lasso + brush for fine-tuning (e.g., "character's face" workflow)
- Tool picker UI to switch between tools

### 10.4 — Cost Pre-Generation Estimate + Confirmation (Deferred)
Show estimated credits before starting a generation action. Optional confirmation step when estimate exceeds a threshold or as user preference.

---

## Regarding Stage 11

*(No specific issues identified from current notes.)*

---

## Regarding Stage 12

### 12.1 — Side-by-Side View / Timeline Player
Introduce a side-by-side view: scene player on left, individual shot list with thumbnails on right. Click a shot to jump to it. Timeline shows shot boundaries with markers, scrub across the full scene, current-shot indicator. Auto-advance between shots.

### 12.2 — Continuity Drift Detection (Deferred)
Basic AI continuity detection: use Gemini (or similar) to compare prior end frame vs current start frame, flag potential continuity breaks with confidence scores; show as suggestions alongside visual comparison.

### 12.3 — Rearview Comparison Modes (Deferred)
- Toggle flicker mode: rapidly switch between previous end frame and current start frame
- Side-by-side comparison with alignment guides
- Multi-mode comparison: slider + flicker + side-by-side with mode switcher

---

## Regarding Issues that cover Multiple Stages

### Scene Context Window / Rearview Mirror (Stages 6-12)
A dropdown or collapsable window that gives users immediate visual access to information from previous stages without leaving the current workspace. Should be present throughout the production cycle (Stages 6-12). Functionality: cycle through information from Stage 4 (Master Script), Stage 7 (Shot List), and script excerpts. **Proposed enhancement:** Make the rearview mirror a carousel itself where you can switch tabs/cards between:
1. Existing rearview mirror contents (previous scene's frames/assets)
2. Script excerpt for the current scene (in script format)
3. Shot list (with ability to cycle through all shots in the scene)

The script excerpt section should sit right beneath the rearview mirror with similar collapsable functionality — extendable like a pulldown curtain. Additionally, include a **dialogue-only view**: just spoken dialogue with a sentence summarizing the action between dialogue segments, so users can focus on how characters speak.

### Asset Extraction & Continuity Optimization (Stages 5, 8, 10)
The extraction process should be revised to a single "one fell swoop" operation where the system identifies every scene an asset is in at once — not re-extracting at every stage. Assets are extracted once, then their data carries forward. Additionally, **visual descriptions for assets must be adaptive/context-aware per scene**: e.g., if "the hero" starts in a workout outfit but Scene 4 is a wedding, the visual description should automatically describe them in a suit. The agentic tooling should infer the correct context from the script/scene/shot list. (Example: Persephone switching from blonde nature-princess to goth alt-girl in the underworld — the LLM should catch that and apply the correct description per scene.)

### Writing & Style Capsule Effectiveness (Stages 2-4, 9)
- Improve language/dialogue/writing capabilities through prompting technique experimentation
- Get around censors for raunchy dialogue and violent/spicy content (nothing illegal)
- System prompts are doing a poor job injecting writing style capsules into scriptmaking — specialized tweaking needed
- Consider moving writing style injection to ONLY script writing/dialogue (where LLMs are proven weak)
- Evaluate effectiveness of system prompts: clearly some evals need to be done
- Need a whole phase/effort for evaluating quality of generated content

### Multi-Provider Video Integration (Stages 9-12)
Allow users to select video providers outside of Google (e.g., Sora, Runway). Each provider will require its own separate service file due to varying API requirements. Provider-specific UI constraints must be enforced (e.g., Veo3 duration restricted to exactly 4, 6, or 8 seconds; unsupported values cause API failure).

### Story Rules — Persistent Across All Generation (All Stages)
Allow users to define "Story Rules" that persist and apply to all generation (both written and visual). Examples:
- "All characters are eggs; people of color are brown eggs; all pets are different breakfast items"
- "Entire story is based in 1600s Europe style"

### Aspect Ratio for Generations (Stages 5, 10)
Aspect ratios need to be set at some point in the pipeline and applied consistently to asset image generation, frame generation, and video generation.

### Visual Style Capsule Influence Scale (Stages 5, 8, 10)
Allow a scale/level of influence for how much the visual style capsule affects generations. Currently it's all-or-nothing and can dominate over master reference images.

---

## Regarding UI/UX outside the Stage Pipeline

### UI-1 — Fix Stage Opening System
When opening a project, the system skips ahead one stage from where the user left off. Should open to the exact stage the user was last on. Related: refreshing a project that was on Stage 6 loads Stage 5 instead.

### UI-2 — Add Debouncing to Auto-Save (Stages 1-3)
Auto-save fires too frequently — it's spamming. Add debouncing to make it save less often.

### UI-3 — Project Folders in Dashboard
Have the ability to organize projects into folders on the dashboard.

### UI-4 — Show Stage Info on Dashboard Project Cards
Include the current stage on each project card. For Phase B (production cycle), show both scene number and stage (e.g., "Scene 3, Stage 8").

### UI-5 — Stage Pipeline Graphic Color Inconsistency
Sometimes stages show green, other times yellow, despite being complete. Not clear what the colors indicate.

### UI-6 — Stop Popup on Unsaved Page Exit
Like other websites, show a warning popup if the user tries to navigate away from the page without saving.

### UI-7 — Regeneration Boxes UI Improvements
The regeneration box UI (especially for Stage 4 and the stage pipeline graphic) needs improvement. The functionality and visual presentation need to be clearer and more consistent.

---

## Regarding Data / Context flow

### DC-1 — Examine How Stage 2 & 3 Context Feeds Into Stage 4
The connection between treatment/beat sheet and the master script generation needs investigation. If beat sheet edits disconnect from the treatment, Stage 4 generation may produce confused results.

### DC-2 — Script Insufficient as Source of Truth for Production
Standard screenplay-format scripts lack the detail needed for production prompting. This is the motivation for the Master Document stage (see 4.2). The system needs clear, descriptive action/character/setting details — not minimalist screenplay conventions.

### DC-3 — Asset Inheritance Failure in Production Pipeline
Final generations (Stage 10) do not reflect the influence of master assets. The context/inheritance chain from Stage 5 → Stage 8 → Stage 9 → Stage 10 is broken somewhere. Visual style capsule seems to override everything.

### DC-4 — Continuity Persistence Across Scenes
Continuity must persist across scenes. Example: opening and ending scenes based in the protagonist's bedroom — the system needs to use the same bedroom but with modifications (e.g., a diploma on the wall in the ending scene). System prompts and regeneration text boxes will be key.

---

## Regarding the Locking System & Branching

### LK-1 — Locking Is Too Tedious — Complete Overhaul Needed
The current locking implementation is extremely tedious, especially in the production cycle. Users shouldn't have to unlock → relock → get another warning just to navigate across stages. Whatever was done with Stage 7's locking "sucks and must be fixed."

### LK-2 — Universal Lock/Unlock Button
There should be a standard lock/unlock button in the top right corner (or similar position) that's consistent across all stages. No more hidden or confusing locking interactions.

### LK-3 — State Persistence for Completed Scenes
When navigating back to completed scenes, the system "forgets" or loses context about completed states. Users are forced to repeatedly unlock and relock shot lists to progress. Completed states should persist.

### LK-4 — Deliberate Branching on Post-Lock Edits
Any edits made after a stage is locked must be a deliberate action that triggers a "new branch or new timeline," with clear acknowledgment that changes will necessitate regenerating subsequent assets.

### LK-5 — Sideline Locking Until Branching Implementation
Consider deferring the full locking overhaul to coincide with the Branching & Versioning implementation, since they're deeply intertwined.

### LK-6 — Known Error Pattern
Example HTTP error: `"Cannot lock stage 2. Stage 1 must be locked first."` with `requiredStage: 1, requiredStatus: "locked", currentStatus: "draft"`. This sequential locking requirement needs to be part of the overhaul.

---

## Other Issues

### OT-1 — TypeScript `any` Type Audit
Possible runtime errors from `any` types throughout the codebase. Need an audit to identify and fix potential issues.

### OT-2 — Rearview Mirror Usefulness Review
Need to discuss whether the rearview mirror in its current form is actually useful. Maybe reconsider if style capsules are working well enough. The artifact vault's usefulness may also need re-evaluation.

---

## Truly Stretch Goals for a Future Date

### SG-1 — Voice-Actinator
Concept: user shows a starting frame, enters the action, designates which character is speaking, submits a voice acting recording, and it generates the animated clip/shot perfectly matched to the voice acting. Could be standalone or part of Aiuteur.

### SG-2 — RAG for Premium Users
Reintroduce RAG (removed from MVP) — NOT for style & tone (simpler methods work), but for users with massive amounts of story/character lore or a huge universe of characters/settings they want to reuse. A well-structured non-vectorized database could also achieve similar results.

### SG-3 — "Lore Library" / "Lorerary"
An ever-growing directory of lore for characters, world/universe building, etc. Especially useful for users creating animation series — a persistent knowledge base that grows with the project.

### SG-4 — Agentic Web Scouring for Style Capsules
The system could agentically search the web to automatically build a style capsule for the user. It finds possible key images for the look, presents ~5 options, user picks favorites, system finds more, iterates until satisfied (or user gives more direction).

### SG-5 — Custom System Prompts Feature
A separate tab on the sidebar called "Custom System Prompts" where users can experiment with and change the system prompts that direct generated content. Probably not needed, but worth considering.

### SG-6 — Storyboard-Driven Pipeline Mode
Full mode where the system generates a plot revolving around an uploaded storyboard (matched with written materials). Would bypass Stages 2-4 and minimize creative work in Stages 6-7.

### SG-7 — Basic AI Continuity Drift Detection
Use Gemini (or similar) to compare prior end frame vs current start frame, flag potential continuity breaks with confidence scores.

### SG-8 — Advanced Rearview Comparison Modes
Toggle flicker, side-by-side with alignment guides, multi-mode comparison (slider + flicker + side-by-side with mode switcher).

### SG-9 — Advanced Inpainting Tools
Rectangle/ellipse selection tools, freeform lasso selection + brush, tool picker UI.

### SG-10 — Quick Mode UI/UX Polish
Grid view, bulk actions, and flow refinements for Quick Mode (after Control Mode is the primary focus).

### SG-11 — "Confidence Rating" Docs for Repo Prompts
A setting for documentation files that notes they may be outdated, painting a general picture but requiring the agent to double-check actual code before making edits.

### SG-12 — Background Agent for Edit Summaries
An agent that, after every chat session, analyzes implemented edits and updates summary docs. Master docs (project-overview, user-flow, database schema, etc.) get auto-updated to reflect actual codebase state as implementation progresses.
