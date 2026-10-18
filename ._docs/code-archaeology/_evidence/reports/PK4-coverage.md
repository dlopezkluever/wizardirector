# PK4 coverage: product-knowledge GEN and AV ideas against code

Scope: WD-IDEA-GEN and WD-IDEA-AV ids from `._docs/product-knowledge/15-FULL-IDEA-LEDGER.md` (used as a search checklist only). Code searched: backend/src, src, backend/migrations, backend/scripts. Evidence: merged2 WD-IMPL ids and file:line reads. Relations: see reports/PK4-relations.jsonl.

## Totals

- Ideas in scope: 280 unique ids (GEN 217, AV 63). The assignment figures (GEN 239, AV 72) do not match the ledger: grep finds 217 unique GEN ids (max number 295) and 63 unique AV ids. Every id found was clustered.
- Clusters: 177. Every idea id lands in exactly one cluster (unassigned: 2; duplicates: see build check).
- New FACT ledger entries: 14 (PK4-FACT-01 to PK4-FACT-14).
- Distinct WD-IMPL ids cited in relations: 130. Code evidence citations: 313.

## Counts per relation

| Relation | Clusters | Ideas |
|---|---:|---:|
| EXACT_MATCH | 40 | 66 |
| PARTIAL_MATCH | 51 | 67 |
| NOT_IMPLEMENTED | 65 | 120 |
| CONTRADICTED_BY_CODE | 14 | 18 |
| UNKNOWN | 7 | 7 |

## Cluster table

| # | Cluster | Ideas | Relation | Impl ids |
|---:|---|---:|---|---|
| 1 | Two canonical prompt types (frame and video) generated separately | 3 | EXACT_MATCH | WD-IMPL-AI-0006, WD-IMPL-AI-0009 |
| 2 | Frame defines the look, video defines the action (split rules and verbosity) | 3 | EXACT_MATCH | WD-IMPL-AI-0006, WD-IMPL-AI-0009 |
| 3 | Image-to-video with start frame, optional end frame, and native audio | 2 | EXACT_MATCH | WD-IMPL-AI-0080, WD-IMPL-PROV-0027, WD-IMPL-PROV-0025 |
| 4 | Ingredients-to-video order and single start-frame anchor for video | 3 | EXACT_MATCH | WD-IMPL-CAP-0215, WD-IMPL-STATE-0060 |
| 5 | Frame prompt five-part formula and frozen-frame rule | 5 | EXACT_MATCH | WD-IMPL-AI-0006 |
| 6 | Character anchoring to attached reference images by trait summary | 1 | EXACT_MATCH | WD-IMPL-AI-0006 |
| 7 | Asset appearance from scene-specific description with status tags | 1 | PARTIAL_MATCH | WD-IMPL-AI-0006 |
| 8 | Body language, choreography and implied framing in frame prompts | 3 | PARTIAL_MATCH | WD-IMPL-AI-0006 |
| 9 | Lighting continuity across frames in a sequence | 1 | PARTIAL_MATCH | WD-IMPL-AI-0008 |
| 10 | Lighting vocabulary mapped to mood | 1 | NOT_IMPLEMENTED | - |
| 11 | Style capsule directives supply lighting, colour and style to frame prompts | 1 | PARTIAL_MATCH | WD-IMPL-CAP-0073, WD-IMPL-CAP-0071 |
| 12 | Non-photoreal material style language and diegetic on-screen text | 2 | NOT_IMPLEMENTED | - |
| 13 | Labeled frame-prompt components with referenced frames and assets listed | 1 | NOT_IMPLEMENTED | - |
| 14 | Structured, template-built frame and video prompts (not free-form paragraphs) | 1 | CONTRADICTED_BY_CODE | WD-IMPL-AI-0006, WD-IMPL-AI-0009, WD-IMPL-DEAD-0034 |
| 15 | Who writes the prompt: deterministic scaffold versus LLM interpretation | 2 | PARTIAL_MATCH | WD-IMPL-AI-0006, WD-IMPL-AI-0009 |
| 16 | Context assembly before every prompt-generating AI call | 1 | EXACT_MATCH | WD-IMPL-AI-0006, WD-IMPL-PRESSURE-0032 |
| 17 | Prompt assembly inputs: script excerpt, shot list, asset relevance, storyboard notes | 2 | PARTIAL_MATCH | WD-IMPL-AI-0009, WD-IMPL-CAP-0232 |
| 18 | Open concern: irrelevant intake context leaking into generation prompts | 1 | UNKNOWN | - |
| 19 | Prompt engine behaviours: request classification, clarification, assumption logging, modes, abstraction of emotion, plain language, prompt-level control | 8 | NOT_IMPLEMENTED | - |
| 20 | Define once, reference by name in every shot (consistency) | 1 | PARTIAL_MATCH | WD-IMPL-CAP-0232 |
| 21 | Extraction of prompt fields from free text (subject, action, style, audio) | 1 | PARTIAL_MATCH | WD-IMPL-AI-0071 |
| 22 | Factual grounding: model constants and capability reference | 1 | PARTIAL_MATCH | WD-IMPL-PROV-0027 |
| 23 | Video prompt carries motion and sound only, never visual truth | 3 | EXACT_MATCH | WD-IMPL-AI-0009 |
| 24 | Video prompt four-part structure (camera movement, action, dialogue, sound) | 3 | EXACT_MATCH | WD-IMPL-AI-0009 |
| 25 | Video prompt action rules: verbs, camera and action timing, facial and blocking detail | 2 | PARTIAL_MATCH | WD-IMPL-AI-0009 |
| 26 | Prompt self-tests, checklists and visual-detail exception for video prompts | 4 | NOT_IMPLEMENTED | - |
| 27 | Audio-driven projects: audio synchronisation first, frames for audio-driven shots | 2 | NOT_IMPLEMENTED | WD-IMPL-FACT-0146 |
| 28 | Per-prompt model compatibility tags and estimated length | 2 | PARTIAL_MATCH | WD-IMPL-AI-0006 |
| 29 | End-frame-aware video prompt wording (describe only the movement between frames) | 1 | NOT_IMPLEMENTED | - |
| 30 | Structured per-shot config fields (aspect ratio, negative prompt, audio, model) | 1 | PARTIAL_MATCH | WD-IMPL-FACT-0106 |
| 31 | Negative prompts and standard quality negatives (including no-subtitles when dialogue is present) | 2 | NOT_IMPLEMENTED | WD-IMPL-PROV-0027 |
| 32 | Per-request audio generation on/off | 1 | NOT_IMPLEMENTED | WD-IMPL-FACT-0204 |
| 33 | Person-generation safety setting | 1 | PARTIAL_MATCH | - |
| 34 | Unsupported output ratio: generate in supported ratio and plan a crop | 1 | NOT_IMPLEMENTED | - |
| 35 | Looping clips, slow-motion temporal keywords | 2 | NOT_IMPLEMENTED | - |
| 36 | Seed-based reproducibility (no seed sent; variance on regenerate) | 1 | EXACT_MATCH | WD-IMPL-FACT-0111 |
| 37 | Over-constrained prompts: reduce adjectives or change seed to escape artifacts | 1 | NOT_IMPLEMENTED | - |
| 38 | Known model weaknesses and troubleshooting map | 1 | UNKNOWN | - |
| 39 | Symptom-to-fix troubleshooting map for prompts | 1 | NOT_IMPLEMENTED | - |
| 40 | Separate length thresholds with warning and error levels per prompt type | 1 | PARTIAL_MATCH | WD-IMPL-FACT-0115 |
| 41 | Validation before sending: length, forbidden characters, allowed-value schema, dialogue format | 1 | PARTIAL_MATCH | WD-IMPL-FACT-0115 |
| 42 | Non-blocking warnings for verbosity and model mismatch | 2 | PARTIAL_MATCH | WD-IMPL-FACT-0115 |
| 43 | Hard cap that silently truncates prompts (rejected) and related limit alternatives | 3 | CONTRADICTED_BY_CODE | WD-IMPL-FACT-0115 |
| 44 | Trimming asset descriptions when a reference image is attached (dynamic trimming) | 2 | NOT_IMPLEMENTED | - |
| 45 | Chaining amplifies frame-prompt quality (planning rationale) | 1 | UNKNOWN | - |
| 46 | Video prompt flagged stale when its start frame changes; per-shot update prompt | 1 | NOT_IMPLEMENTED | WD-IMPL-STATE-0070, WD-IMPL-INVALIDATE-0087 |
| 47 | Stage 9 labels which prompt drives image, which drives video, which logic is system-owned | 1 | PARTIAL_MATCH | WD-IMPL-CAP-0240 |
| 48 | Frame prompt read-only by default with manual edit toggle; video prompt always editable | 1 | EXACT_MATCH | WD-IMPL-CAP-0242 |
| 49 | Bulk, all-shot and single-shot prompt generation with partial-failure reporting | 1 | EXACT_MATCH | WD-IMPL-CAP-0240, WD-IMPL-CAP-0241 |
| 50 | Surgical frame-prompt correction by targeted user instruction | 1 | EXACT_MATCH | WD-IMPL-AI-0078 |
| 51 | Per-shot compatibility display (start-only versus start+end, which video models fit) | 1 | PARTIAL_MATCH | WD-IMPL-CAP-0243 |
| 52 | Frame tool with all shot assets beside the prompt for composing a frame | 1 | PARTIAL_MATCH | WD-IMPL-CAP-0232 |
| 53 | Per-shot reference uploads (multiple, captioned, storyboard sheets) | 1 | PARTIAL_MATCH | WD-IMPL-CAP-0255 |
| 54 | No dedicated AI instructions for Stages 1, 6, 10 to 12 | 1 | CONTRADICTED_BY_CODE | WD-IMPL-CAP-0256, WD-IMPL-AI-0007, WD-IMPL-AI-0008, WD-IMPL-AI-0078 |
| 55 | Custom system-prompts sidebar tab for viewing and changing generation prompts | 1 | NOT_IMPLEMENTED | WD-IMPL-DEAD-0049 |
| 56 | Asset images are fed into frame generation; scene-instance image precedence | 2 | EXACT_MATCH | WD-IMPL-CAP-0180, WD-IMPL-CAP-0179 |
| 57 | Every reference has explicit semantic role, reason and source | 1 | EXACT_MATCH | WD-IMPL-STATE-0060 |
| 58 | Reference budget (two to three sweet spot) and reference-overload failure mode | 2 | NOT_IMPLEMENTED | - |
| 59 | Prioritise, balance and discard references per shot | 1 | PARTIAL_MATCH | WD-IMPL-FACT-0087 |
| 60 | Surface reference-load failures instead of silent text-only generation | 1 | CONTRADICTED_BY_CODE | - |
| 61 | Warn when prompt text mentions an asset that has no image | 1 | NOT_IMPLEMENTED | - |
| 62 | Output checked against references for every asset type (QC) | 1 | NOT_IMPLEMENTED | - |
| 63 | Preview and generation reference parity contract | 2 | CONTRADICTED_BY_CODE | WD-IMPL-FACT-0085, WD-IMPL-FACT-0086, WD-IMPL-FACT-0250 |
| 64 | Regeneration reuses the persisted per-shot reference set | 2 | EXACT_MATCH | WD-IMPL-STATE-0060, WD-IMPL-FACT-0164 |
| 65 | Location delta descriptions and closest-direction fallback for imperfect angles | 2 | EXACT_MATCH | WD-IMPL-FACT-0084 |
| 66 | Start-frame continuity modes: match, camera change, reuse or edit base, fresh | 2 | EXACT_MATCH | WD-IMPL-STATE-0056, WD-IMPL-STATE-0057, WD-IMPL-CAP-0204, WD-IMPL-CAP-0206, WD-IMPL-CAP-0207 |
| 67 | Drag-and-drop frame reuse across shots and edit-by-prompt from a pulled-in image | 3 | PARTIAL_MATCH | WD-IMPL-CAP-0208, WD-IMPL-CAP-0209, WD-IMPL-AI-0054 |
| 68 | Vision analysis of reference frame before camera change; cost and latency rationale | 1 | PARTIAL_MATCH | WD-IMPL-AI-0012 |
| 69 | Region inpainting with local instruction; brush, rectangle, ellipse, lasso tools | 2 | PARTIAL_MATCH | WD-IMPL-CAP-0254, WD-IMPL-FACT-0189 |
| 70 | Continuity drift detector comparing approved frames with vision | 1 | NOT_IMPLEMENTED | - |
| 71 | Blocking references control framing and composition authority over location images | 2 | NOT_IMPLEMENTED | WD-IMPL-FACT-0099 |
| 72 | Visual anchors at frame stage: storyboard frames, stills, sketches, prior approved frames | 1 | PARTIAL_MATCH | WD-IMPL-CAP-0255, WD-IMPL-CAP-0258 |
| 73 | 3D world generation for blocking: lazy creation, quality tiers, reuse of worlds | 3 | NOT_IMPLEMENTED | - |
| 74 | Re-test the blocking bet against current models | 1 | UNKNOWN | - |
| 75 | Start-only path: end frames skipped and hidden in the frame UI | 1 | EXACT_MATCH | WD-IMPL-CAP-0262 |
| 76 | Frame generation scope options: all frames, one shot, start only, end only | 1 | PARTIAL_MATCH | WD-IMPL-CAP-0248, WD-IMPL-CAP-0249 |
| 77 | Quick Mode and Control Mode choice; Control Mode is default | 2 | EXACT_MATCH | WD-IMPL-CAP-0249 |
| 78 | Frame dependency manager enforcing correct chaining | 1 | PARTIAL_MATCH | WD-IMPL-INVALIDATE-0060, WD-IMPL-INVALIDATE-0062 |
| 79 | Shot-by-shot frame approval, optional re-roll, three regeneration modes, user upload | 3 | EXACT_MATCH | WD-IMPL-CAP-0251, WD-IMPL-CAP-0252, WD-IMPL-CAP-0253, WD-IMPL-CAP-0255 |
| 80 | Frame and video approved separately per shot; frame regeneration count tracked | 1 | PARTIAL_MATCH | WD-IMPL-STATE-0069 |
| 81 | Frame panel actions: approve, compare side by side, inpaint with mask, editable prompts | 1 | PARTIAL_MATCH | WD-IMPL-CAP-0264, WD-IMPL-CAP-0257, WD-IMPL-CAP-0254, WD-IMPL-FACT-0189 |
| 82 | 'Don't show again' option on the frame warning dialog | 1 | EXACT_MATCH | - |
| 83 | Expected frame quality (continuity holds, props show state change) | 1 | UNKNOWN | - |
| 84 | Use-as-reference toggle appears only after an image exists and applies to all Stage 10 regenerate modes | 3 | EXACT_MATCH | - |
| 85 | Toggle coverage at regeneration points (upload review, Stage 8, transformation post-image, Stage 10 frames) | 2 | PARTIAL_MATCH | - |
| 86 | Toggle default state: ON in upload review, OFF elsewhere (or one consistent default) | 2 | CONTRADICTED_BY_CODE | - |
| 87 | Session-wide default toggle for frame regenerations | 1 | NOT_IMPLEMENTED | - |
| 88 | Current image sent with highest priority as separate style and composition reference | 1 | PARTIAL_MATCH | - |
| 89 | Edit Image as image-to-image with text guidance | 1 | EXACT_MATCH | WD-IMPL-AI-0051, WD-IMPL-CAP-0182 |
| 90 | Automatic background-removal toggle and dedicated segmentation-based removal | 3 | NOT_IMPLEMENTED | WD-IMPL-AI-0081 |
| 91 | Bulk generation of selected scene assets with cost confirmation, progress and partial-failure handling | 1 | EXACT_MATCH | WD-IMPL-CAP-0176 |
| 92 | Queued renders are not edited in place; upstream changes invalidate affected work | 1 | CONTRADICTED_BY_CODE | WD-IMPL-INVALIDATE-0069, WD-IMPL-INVALIDATE-0072, WD-IMPL-INVALIDATE-0099 |
| 93 | Multiple video attempts per shot kept as versions | 1 | PARTIAL_MATCH | WD-IMPL-STATE-0110 |
| 94 | Render status values and error messages on failure | 1 | EXACT_MATCH | WD-IMPL-STATE-0077, WD-IMPL-STATE-0110 |
| 95 | Long-render tolerance: 30 to 45 minute completion window; act only on final outcomes | 1 | CONTRADICTED_BY_CODE | WD-IMPL-FACT-0140 |
| 96 | Provider timeout windows per modality (video, image, audio); timed-out render treated as failed | 1 | PARTIAL_MATCH | WD-IMPL-FACT-0140, WD-IMPL-FACT-0186 |
| 97 | Normalised completion event triggering next step and notifications; push instead of polling | 2 | NOT_IMPLEMENTED | WD-IMPL-FACT-0307 |
| 98 | Audio renders as render jobs with audio as output type | 1 | NOT_IMPLEMENTED | WD-IMPL-PROV-0029 |
| 99 | Background handling of long generations: status, retry, cancellation, prioritisation, batching | 1 | PARTIAL_MATCH | WD-IMPL-PRESSURE-0009, WD-IMPL-FACT-0201 |
| 100 | Latency targets (text under 5 s, frame pairs under 15 s, video in background) | 1 | UNKNOWN | - |
| 101 | Provider limit enforcement: duration only 4, 6 or 8 seconds, other values fail | 1 | CONTRADICTED_BY_CODE | WD-IMPL-FACT-0127 |
| 102 | Object-level video editing (add or remove objects) | 1 | NOT_IMPLEMENTED | - |
| 103 | Draft (720p) and final (1080p) quality tiers | 1 | NOT_IMPLEMENTED | - |
| 104 | Model tier choice: faster cheaper video model versus standard | 1 | EXACT_MATCH | WD-IMPL-CAP-0267, WD-IMPL-PROV-0012 |
| 105 | Scene animatic preview: low-resolution previews with frame interpolation | 1 | NOT_IMPLEMENTED | - |
| 106 | Image generation as tracked async jobs of several kinds | 1 | EXACT_MATCH | WD-IMPL-STATE-0075 |
| 107 | Job lifecycle with failure step recorded | 1 | EXACT_MATCH | WD-IMPL-STATE-0075, WD-IMPL-STATE-0109 |
| 108 | Automatic retries (default three) counted separately from user retries; error classification | 1 | PARTIAL_MATCH | WD-IMPL-FACT-0131, WD-IMPL-STATE-0103, WD-IMPL-FACT-0183 |
| 109 | Idempotent generation requests: duplicate submission never creates or charges a second job | 1 | CONTRADICTED_BY_CODE | WD-IMPL-STATE-0115, WD-IMPL-FACT-0126, WD-IMPL-FACT-0351 |
| 110 | One primary output selected from several provider variants | 1 | NOT_IMPLEMENTED | - |
| 111 | Multiple LLM providers with cost-aware routing and graceful fallback | 1 | NOT_IMPLEMENTED | WD-IMPL-PROV-0016, WD-IMPL-PROV-0021 |
| 112 | Multi-model routing: capability matrix, cost-quality optimiser, performance tracking | 1 | NOT_IMPLEMENTED | - |
| 113 | Enterprise custom model registration, benchmarking and access control | 1 | NOT_IMPLEMENTED | - |
| 114 | External automation layer and durable workflow engine for orchestration | 2 | NOT_IMPLEMENTED | WD-IMPL-FACT-0065, WD-IMPL-FACT-0307, WD-IMPL-FACT-0308 |
| 115 | Provider-neutral image and video generation interfaces; swappable providers | 1 | PARTIAL_MATCH | WD-IMPL-PROV-0015, WD-IMPL-PROV-0012 |
| 116 | Frame-to-video generation built around one named provider (Veo) | 1 | EXACT_MATCH | WD-IMPL-PROV-0027, WD-IMPL-PROV-0028 |
| 117 | User-selectable video providers (Veo MVP; Sora and Runway later) | 1 | PARTIAL_MATCH | WD-IMPL-PROV-0012 |
| 118 | Provider-specific prompt formatting, one format per video provider | 1 | NOT_IMPLEMENTED | - |
| 119 | Prompt serialisation formats: YAML, JSON, XML-tagged, labelled plain text | 4 | NOT_IMPLEMENTED | - |
| 120 | Every frame, video and image job records estimated and actual cost | 1 | EXACT_MATCH | WD-IMPL-FACT-0120 |
| 121 | Cost rules: per-second video, per-image and per-token pricing per stage and model | 2 | PARTIAL_MATCH | WD-IMPL-FACT-0123, WD-IMPL-FACT-0124, WD-IMPL-FACT-0181 |
| 122 | Cost awareness on every generation action, including regenerations and bulk operations | 1 | PARTIAL_MATCH | WD-IMPL-CAP-0283, WD-IMPL-CAP-0266 |
| 123 | Estimated generation cost shown on review screen before commit | 1 | EXACT_MATCH | WD-IMPL-CAP-0266, WD-IMPL-CAP-0270 |
| 124 | Confirmation before spend above a user threshold; gateway before every generation action | 1 | NOT_IMPLEMENTED | - |
| 125 | Credit deduction per generation; alerts on excessive spend | 1 | PARTIAL_MATCH | WD-IMPL-STATE-0114, WD-IMPL-STATE-0079 |
| 126 | Cost analytics, dashboards, per-user reports, budget alerts, anomaly detection | 1 | NOT_IMPLEMENTED | WD-IMPL-FACT-0184 |
| 127 | Render plan stating shot count, variations, retries and mode | 1 | NOT_IMPLEMENTED | - |
| 128 | No paid render starts without reservation, render budget and hard execution ceiling | 1 | CONTRADICTED_BY_CODE | WD-IMPL-STATE-0108, WD-IMPL-INVALIDATE-0105 |
| 129 | Block render when credits are insufficient for estimated cost | 1 | EXACT_MATCH | WD-IMPL-CAP-0270 |
| 130 | Reserve then settle credits: hold estimate, reconcile to actual, refund overestimate | 1 | NOT_IMPLEMENTED | - |
| 131 | Failed or aborted render costs nothing; partial output charged proportionally | 1 | CONTRADICTED_BY_CODE | WD-IMPL-FACT-0125, WD-IMPL-STATE-0079 |
| 132 | Per-render ceilings on provider calls and wall-clock time | 1 | NOT_IMPLEMENTED | WD-IMPL-PRESSURE-0010 |
| 133 | Per-shot caps on variations and retries; 'accepted best effort' state | 1 | PARTIAL_MATCH | WD-IMPL-FACT-0131 |
| 134 | Loop breaker for identical repeated generation requests | 1 | NOT_IMPLEMENTED | - |
| 135 | Default rate limits: one active render per user, renders per project per hour, calls per minute per provider | 1 | NOT_IMPLEMENTED | WD-IMPL-PRESSURE-0010 |
| 136 | Kill switches: global video disable, per-provider disable, per-user freeze | 1 | NOT_IMPLEMENTED | WD-IMPL-PRESSURE-0038 |
| 137 | Permanent record of estimated, reserved and spent credits, call counts and abort reasons | 1 | PARTIAL_MATCH | WD-IMPL-FACT-0120 |
| 138 | Each output stores exact final prompt, template version and regeneration guidance | 1 | PARTIAL_MATCH | WD-IMPL-DEAD-0103, WD-IMPL-DEAD-0095 |
| 139 | Writing-stage prompt templates editable at runtime without shipping code | 1 | PARTIAL_MATCH | WD-IMPL-AI-0068, WD-IMPL-AI-0069, WD-IMPL-AI-0070, WD-IMPL-DEAD-0049 |
| 140 | End-to-end traces of each stage's inputs and outputs | 1 | NOT_IMPLEMENTED | WD-IMPL-DEAD-0046, WD-IMPL-DEAD-0047 |
| 141 | Replay a failing generation against identical data with a modified prompt | 1 | PARTIAL_MATCH | WD-IMPL-CAP-0253 |
| 142 | Automated evaluation: LLM-as-judge consistency metrics and quality scoring | 2 | NOT_IMPLEMENTED | - |
| 143 | Per-stage agent evaluation against success criteria and golden expectations | 1 | PARTIAL_MATCH | WD-IMPL-TEST-0040, WD-IMPL-TEST-0050 |
| 144 | Diagnosis procedure for outputs that miss criteria | 1 | UNKNOWN | - |
| 145 | Post-generation QC per clip (first frame matches start frame, action readable, camera matches) | 1 | NOT_IMPLEMENTED | - |
| 146 | Smart regeneration from detected issues; automated QA gates before expensive generation | 2 | NOT_IMPLEMENTED | - |
| 147 | Prompt optimisation agent, A/B tests, prompt library and effectiveness scores | 1 | NOT_IMPLEMENTED | - |
| 148 | Dialogue written into video prompt with exact words, speaker, voice direction and delivery | 1 | EXACT_MATCH | WD-IMPL-AI-0009 |
| 149 | Speaker-attributed dialogue format and performance direction (emotional arc) | 2 | PARTIAL_MATCH | WD-IMPL-AI-0009 |
| 150 | Narration or voiceover as a separate dialogue type | 1 | NOT_IMPLEMENTED | - |
| 151 | Script verbatim dialogue versus implicit dialogue described by speech act | 2 | EXACT_MATCH | WD-IMPL-AI-0009 |
| 152 | Recorded line overrides scripted dialogue (ad-lib wins) and voice-acting recording workflows | 6 | NOT_IMPLEMENTED | WD-IMPL-PROV-0029 |
| 153 | Every video prompt carries an audio part; explicit silence when a beat should be quiet | 2 | EXACT_MATCH | WD-IMPL-AI-0009 |
| 154 | Sound design inferred from scene context when unspecified; layered SFX, ambience and music | 2 | PARTIAL_MATCH | WD-IMPL-AI-0009 |
| 155 | Native audio treated as starting point (keep, refine, replace) and lip-sync alignment in post | 2 | NOT_IMPLEMENTED | WD-IMPL-FACT-0204 |
| 156 | Character voice profiles, voice seeds, voice samples and dialogue-derived voice profiles | 4 | NOT_IMPLEMENTED | - |
| 157 | Audio-first projects: podcasts, audiobooks, lectures with visuals timed to narration | 1 | NOT_IMPLEMENTED | WD-IMPL-FACT-0146, WD-IMPL-FACT-0147 |
| 158 | Clip length cap of about 8 seconds with sequencing of longer narratives | 1 | CONTRADICTED_BY_CODE | WD-IMPL-FACT-0127 |
| 159 | Clip-extension workflow to lengthen the best takes | 1 | NOT_IMPLEMENTED | - |
| 160 | Stage map placing audio and music at Stage 9 | 1 | NOT_IMPLEMENTED | WD-IMPL-CAP-0240 |
| 161 | Scene review player: whole scene cut together with timeline, shot markers and start-frame thumbnail list | 2 | PARTIAL_MATCH | WD-IMPL-CAP-0274, WD-IMPL-CAP-0275 |
| 162 | Review player controls and live job tracking | 1 | EXACT_MATCH | WD-IMPL-CAP-0273, WD-IMPL-CAP-0274 |
| 163 | Retry failed render jobs from review | 1 | EXACT_MATCH | WD-IMPL-CAP-0277 |
| 164 | Empty and error states in review with routes back or retry | 1 | EXACT_MATCH | WD-IMPL-CAP-0273 |
| 165 | Issue categories and automatic failure attribution in review | 1 | PARTIAL_MATCH | WD-IMPL-CAP-0280 |
| 166 | Three review resolution paths: complete, minor visual to frames, major to shot list | 1 | CONTRADICTED_BY_CODE | WD-IMPL-CAP-0280, WD-IMPL-DEAD-0056 |
| 167 | Completing a scene returns to the Script Hub; failed jobs produce a warning | 1 | EXACT_MATCH | WD-IMPL-CAP-0279 |
| 168 | Background rendering with sidebar progress, completion toast and email; re-entry from notification or hub | 2 | PARTIAL_MATCH | WD-IMPL-CAP-0278, WD-IMPL-CAP-0282, WD-IMPL-CAP-0286 |
| 169 | Quality bar for assembled output (duration matches target, audible dialogue, continuous motion) | 1 | NOT_IMPLEMENTED | - |
| 170 | Scene MP4 export (resolution, settings dialog, background export, history, full-project export) | 3 | NOT_IMPLEMENTED | WD-IMPL-CAP-0281 |
| 171 | Pro export of individual clips; EDL or XML timeline; bulk approved-artifact archive; asset package | 4 | NOT_IMPLEMENTED | WD-IMPL-CAP-0281 |
| 172 | Clip naming convention with project, scene, shot, version | 2 | NOT_IMPLEMENTED | - |
| 173 | Project Wrap editorial package: manifest, README, deterministic layout, exclusions | 7 | NOT_IMPLEMENTED | - |
| 174 | Wrap eligibility rules, take and role metadata, per-scene folders, master timeline, import ordering | 5 | NOT_IMPLEMENTED | - |
| 175 | Optional audio stems and project archival | 2 | NOT_IMPLEMENTED | - |
| 176 | Professional formats (ProRes, DNxHD, WebM), upscaling and reframing to vertical | 2 | NOT_IMPLEMENTED | - |
| 177 | Third-party export and integrations (YouTube, Google Drive, CapCut, Frame.io, Vimeo, Dropbox, webhooks) | 1 | NOT_IMPLEMENTED | WD-IMPL-CAP-0281 |

## Concepts the archaeology had missed or stated incorrectly

Each item is a code behaviour or absence that the merged ledger does not state, or states differently. PK4-FACT ids are in PK4.ledger.jsonl.

1. Silent LLM output truncation with a trailing ellipsis at 1200 and 500 characters, which can drop the video audio section (PK4-FACT-02). Wave-1 FACT-0115 records the limits only.
2. Veo request has no negative prompt, seed, resolution or audio toggle; the image provider interface declares negative prompt and seed that no caller sets (PK4-FACT-01).
3. Runway Gen-3 and Kling compatibility tags are computed and persisted with no integration and no reader (PK4-FACT-03).
4. Reference-load failures fall back to text-only generation with no record or message (PK4-FACT-09); reference count is uncapped (PK4-FACT-08).
5. Video-prompt call has no setting or scene-script input (PK4-FACT-11).
6. Stage 12 issue routing has no route to Stage 10 frames (PK4-FACT-04, relevant to AV-049).
7. Inpaint tools are brush and eraser only (PK4-FACT-05).
8. voice_profile_id column exists with no reader (PK4-FACT-06).
9. Shot-duration validator accepts up to 30 seconds while provider clamps to 8 (PK4-FACT-07).
10. Use-as-reference default differs between Stage 8 (ON) and Stage 10 (OFF) (PK4-FACT-10).
11. Warn-only prompt length in the UI (PK4-FACT-12), localStorage-only continuity-break suppression (PK4-FACT-13), and toast-only completion notice with no email (PK4-FACT-14).
12. Idempotency: the dedupe mechanism exists but frame and scene keys include Date.now(), and video confirm has no key at all (cluster GEN-243, wave-1 STATE-0115 confirmed).
13. Style capsule text reaches the frame prompt only if projects.visual_style_capsule_id is set, and no code writes that column (wave-1 CAP-0073 re-checked: confirmed).

## Wave-1 claims re-checked in this pass

- WD-IMPL-CAP-0073 (capsule never populated): confirmed.
- WD-IMPL-FACT-0085 and FACT-0250 (preview versus generation references): confirmed; preview is built at projects.ts:3410, generation reads persisted order written at projects.ts:3853.
- WD-IMPL-FACT-0189 (inpaint mask not transmitted): confirmed.
- WD-IMPL-FACT-0140 (Veo 5-minute poll): confirmed.
- WD-IMPL-FACT-0115 (limits differ): confirmed and extended (PK4-FACT-02, PK4-FACT-12).

## Ideas not clustered

- WD-IDEA-GEN-055
- WD-IDEA-GEN-088

## Limits of this pass

- Static reading only. Runtime behaviour, provider output quality, and whether LLM instructions are obeyed are UNKNOWN and are marked as such.
- Tests were checked by name and content only; no test was run. backend/src/tests/image-generation.test.ts needs a live database.
- The brief's expected counts (GEN 239, AV 72) differ from the ledger (217, 63); the clustering uses the ledger.
