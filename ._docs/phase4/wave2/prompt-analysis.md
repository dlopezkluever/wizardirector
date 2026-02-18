# Aiuteur Pipeline — Prompt Inventory & Analysis

> **Purpose**: Catalog every LLM prompt in the 12-stage pipeline with analysis and improvement recommendations for eval/optimization work.
>
> **Last Updated**: 2026-02-16

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Stage 2 — Treatment Generation](#stage-2--treatment-generation)
  - [2A: Treatment Expansion](#2a-treatment-expansion)
  - [2B: Section Regeneration](#2b-section-regeneration)
  - [2C: Section Alternatives](#2c-section-alternatives)
- [Stage 3 — Beat Sheet](#stage-3--beat-sheet)
  - [3A: Beat Extraction](#3a-beat-extraction)
  - [3B: Beat Brainstorm Alternatives](#3b-beat-brainstorm-alternatives)
  - [3C: Beat Split](#3c-beat-split)
- [Stage 4 — Master Script](#stage-4--master-script)
  - [4A: Master Script Generation](#4a-master-script-generation)
  - [4B: Script Section Regeneration](#4b-script-section-regeneration)
  - [4C: Script Section Alternatives](#4c-script-section-alternatives)
- [Stage 5 — Asset Extraction](#stage-5--asset-extraction)
  - [5A: Entity Mention Extraction (Legacy)](#5a-entity-mention-extraction-legacy)
  - [5B: Visual Description Distillation](#5b-visual-description-distillation)
  - [5C: Asset Description Merger](#5c-asset-description-merger)
  - [5D: Image Analysis (Vision)](#5d-image-analysis-vision)
  - [5E: Image Description Merge](#5e-image-description-merge)
- [Stage 7 — Shot Extraction](#stage-7--shot-extraction)
  - [7A: Shot List Extraction](#7a-shot-list-extraction)
  - [7B: Shot Split](#7b-shot-split)
  - [7C: Shot Merge](#7c-shot-merge)
- [Stage 8 — Scene Asset Relevance](#stage-8--scene-asset-relevance)
  - [8A: Scene Asset Relevance Detection](#8a-scene-asset-relevance-detection)
- [Stage 9 — Prompt Segmentation](#stage-9--prompt-segmentation)
  - [9A: Start Frame Prompt](#9a-start-frame-prompt)
  - [9B: Video Prompt](#9b-video-prompt)
  - [9C: End Frame Prompt](#9c-end-frame-prompt)
- [Stage 10 — Image Generation](#stage-10--image-generation)
  - [10A: Prompt Enrichment (NanoBanana/Gemini)](#10a-prompt-enrichment-nanobananagemini)
  - [10B: Background Isolation Injection](#10b-background-isolation-injection)
  - [10C: Angle Variant Prompts](#10c-angle-variant-prompts)
- [Cross-Cutting: Context Injection Layer](#cross-cutting-context-injection-layer)
- [Stages with No LLM Prompts](#stages-with-no-llm-prompts)
- [Global Recommendations](#global-recommendations)

---

## Architecture Overview

| Mechanism | Stages | How prompts are managed |
|-----------|--------|------------------------|
| **DB-stored templates** | 2, 3, 4 | `prompt_templates` table, interpolated via `POST /api/llm/generate-from-template` |
| **Hardcoded in services** | 5, 7, 8, 9, 10 | Built dynamically with string interpolation in backend service files |
| **Context injection** | 2–4 (writing style), 7–9 (global + local context) | `contextManager.ts` + `styleCapsuleService.ts` |

**Total distinct prompts**: ~20 across the pipeline.

---

## Stage 2 — Treatment Generation

### 2A: Treatment Expansion

**File**: `backend/scripts/seed-templates.ts:22-83` (DB template `treatment_expansion`)
**Invoked by**: `src/lib/services/treatmentService.ts:80-101` → `POST /api/llm/generate-from-template`
**Generates**: 3 distinct treatment variations (800–1200 words each) from a user's story idea

#### System Prompt

```
You are a narrative expansion specialist. Your role is to transform brief story ideas into fully-realized 3-act treatments.

CONSTRAINTS:
- Target length: {target_length_min} to {target_length_max} seconds of screen time
- Project type: {project_type}
- Content rating: {content_rating}
- Genre: {genres}
- Tonal guidance: {tonal_precision}

REQUIREMENTS:
1. Generate exactly 3 distinct treatment variations
2. Each treatment must be continuous prose (no scene breaks yet)
3. Prioritize visual storytelling over dialogue-heavy sequences
4. Respect the content rating constraints
5. Adhere to the tonal guidance provided
6. Each variation should have a different structural emphasis (e.g., different endings, chronology, or tonal approach)

WRITTEN STYLE CONTEXT:
{writing_style_context}

OUTPUT STRUCTURE:
Generate 3 complete treatments, each structurally different. Each treatment should be 800-1200 words and tell a complete story arc suitable for the target runtime.

Return the response as JSON in this exact format:
{
  "treatments": [
    {
      "variant_id": 1,
      "prose": "Full treatment text here...",
      "structural_emphasis": "Description of this variation's approach",
      "estimated_runtime_seconds": 300
    },
    ...
  ]
}
```

#### User Prompt

```
INPUT MODE: {input_mode}

PRIMARY CONTENT:
{primary_content}

CONTEXT FILES:
{context_files}

PROJECT PARAMETERS:
- Target Length: {target_length_min}-{target_length_max} seconds
- Project Type: {project_type}
- Content Rating: {content_rating}
- Genres: {genres}
- Tonal Precision: {tonal_precision}

Generate 3 distinct treatment variations based on this input. Each should explore different narrative possibilities while maintaining the core story elements.
```

#### Analysis

**What works well:**
- Clear persona ("narrative expansion specialist") anchors the model's behavior
- Explicit constraint injection (target length, rating, genres, tonal precision) provides strong guardrails
- The "continuous prose, no scene breaks" instruction is critical for preventing the LLM from jumping ahead to screenplay format
- Writing style capsule injection gives stylistic consistency
- 3-variant generation with "different structural emphasis" is a solid creative exploration pattern

**Improvement suggestions:**

1. **No few-shot examples**: The JSON schema is shown but there's no example of what *good* prose looks like. Adding a 2-3 sentence excerpt of the desired prose quality/density would dramatically improve output consistency. Consider adding: `EXAMPLE TONE (do not copy content): "The morning light cuts through venetian blinds, painting prison bars across Elena's face as she..."` to show the desired level of visual prose.

2. **"800-1200 words" is vague relative to runtime**: The prompt says both "800-1200 words" and "{target_length_min} to {target_length_max} seconds." These are different constraints that can conflict. A 180-second film needs ~600 words of treatment, not 800-1200. Consider tying word count to target runtime: `Words ≈ target_seconds × 3` (approximately 3 words per second of screen time as a treatment density heuristic).

3. **`structural_emphasis` is under-specified**: "Different structural emphasis (e.g., different endings, chronology, or tonal approach)" is a useful nudge but too vague. The model often produces three variations that are only superficially different. Consider explicitly requiring: `Variation 1: Linear chronology with the most conventional story arc. Variation 2: Non-linear structure (flashbacks, parallel timelines, or in medias res). Variation 3: A tonally different approach (darker/lighter/more abstract than variations 1-2).`

4. **Missing anti-pattern guidance**: No instruction against common failure modes like:
   - Excessive dialogue in the treatment (the treatment is prose, not a script)
   - Over-explaining theme/meaning instead of showing visual events
   - Ending all three variations the same way

5. **`input_mode` variable is unused in prompt logic**: The user prompt includes `INPUT MODE: {input_mode}` but there's no system prompt instruction explaining what the model should *do* differently based on whether the mode is `expansion`, `condensation`, `transformation`, or `script-skip`. Each mode implies a very different task — this should be an explicit branching instruction.

6. **`estimated_runtime_seconds` in the JSON output has no calibration guidance**: The model just guesses. Consider adding: `Estimate runtime by assuming ~3 words per second for action, ~2 words per second for dialogue-heavy sections.`

---

### 2B: Section Regeneration

**File**: `src/lib/services/treatmentService.ts:204-227`
**Generates**: Rewrite of a selected text section within a treatment

#### System Prompt

```
You are a narrative editor. Your task is to rewrite a specific section of a treatment based on user guidance while maintaining consistency with the surrounding text.

INSTRUCTIONS:
1. Only rewrite the selected text portion
2. Maintain the same tone and style as the surrounding content
3. Ensure the rewritten section flows naturally with the context
4. Follow the user's specific guidance for the changes
```

#### User Prompt

```
FULL TREATMENT CONTEXT:
${treatmentContent}

SELECTED TEXT TO REWRITE:
"${selectedText}"

USER GUIDANCE:
${guidance}

Rewrite only the selected text portion according to the guidance, ensuring it fits naturally with the surrounding content.
```

#### Analysis

**What works well:**
- Clean, focused task — single clear objective
- Provides full surrounding context for coherence
- Explicit "only rewrite the selected text" boundary

**Improvement suggestions:**

1. **No length constraint**: The rewritten section could be dramatically shorter or longer than the original. Add: `Match the approximate length of the original selected text (±20%). If the guidance requires expansion, limit to 1.5× the original length.`

2. **No visual-storytelling reminder**: Unlike 2A, this prompt doesn't reinforce the visual prose requirement. The rewrite might drift toward abstract or dialogue-heavy text. Add the visual storytelling constraint from 2A.

3. **Full treatment in context is token-expensive**: Sending the entire treatment as context wastes tokens. Consider sending only a windowed context (e.g., 500 chars before + selected text + 500 chars after) like Stage 4B does.

4. **Missing output format instruction**: Should explicitly say `Return ONLY the rewritten text, no commentary, no JSON wrapping, no "Here's the rewrite:" prefix.`

---

### 2C: Section Alternatives

**File**: `src/lib/services/treatmentService.ts:262-283`
**Generates**: 3 alternative rewrites for a selected section

#### System Prompt

```
You are a narrative editor. Your task is to generate exactly 3 alternative rewrites of a specific section of a treatment.

INSTRUCTIONS:
1. Generate exactly 3 distinct alternative rewrites of the selected text
2. Each alternative should take a different creative approach while maintaining consistency with the surrounding text
3. Maintain the same tone and style as the surrounding content
4. Ensure each rewritten section flows naturally with the context
5. If user guidance is provided, follow it for all alternatives

Return your response as a JSON array of exactly 3 strings:
["alternative 1 text", "alternative 2 text", "alternative 3 text"]

Return ONLY the JSON array, no other text.
```

#### Analysis

**What works well:**
- Clear JSON output schema
- "Different creative approach" instruction encourages genuine variation
- Conditional guidance handling

**Improvement suggestions:**

1. **Same length/visual-storytelling gaps as 2B**.

2. **"Different creative approach" is vague**: Define what "different" means — e.g., `Alternative 1: Closest to original intent but improved. Alternative 2: Different emotional angle or perspective. Alternative 3: Most creatively divergent approach.`

3. **JSON parsing fragility**: The frontend has extensive fallback parsing (`parseAlternatives` method). This suggests the model sometimes wraps the JSON in markdown code blocks or adds preamble. Adding `Do not wrap in markdown code blocks. Do not add any text before or after the JSON array.` would reduce parse failures.

---

## Stage 3 — Beat Sheet

### 3A: Beat Extraction

**File**: `backend/scripts/seed-templates.ts:89-143` (DB template `beat_extraction`)
**Invoked by**: `src/lib/services/beatService.ts:55-76` → `POST /api/llm/generate-from-template`
**Generates**: 15-30 structural beats from a prose treatment

#### System Prompt

```
You are a narrative structure analyst. Your role is to extract the core structural beats from prose treatments.

DEFINITION OF A BEAT:
A beat is a single, atomic plot event or emotional shift that advances the story. It should be:
- Self-contained (understandable on its own)
- Action-oriented (describes what happens, not just mood)
- Sequential (follows cause-and-effect logic)

TARGET: Extract 15-30 beats from the provided treatment.

PROJECT CONSTRAINTS:
- Target length: {target_length_min} to {target_length_max} seconds
- Genre: {genres}
- Tonal guidance: {tonal_precision}

WRITTEN STYLE CONTEXT:
{writing_style_context}

OUTPUT REQUIREMENTS:
1. Each beat must be 1-3 sentences maximum
2. Beats must follow chronological order (unless non-linear storytelling is intended)
3. Include a "rationale" explaining why this is a structural beat
4. Ensure beats collectively cover the full narrative arc
5. Estimate screen time for each beat based on the target length

Return the response as JSON in this exact format:
{
  "beats": [
    {
      "beat_id": "unique-id-1",
      "order": 1,
      "text": "Beat description here",
      "rationale": "Why this is a structural beat",
      "estimated_screen_time_seconds": 20
    }
  ],
  "total_estimated_runtime": 300,
  "narrative_structure": "3-act structure"
}
```

#### Analysis

**What works well:**
- Excellent beat definition — the 3-criteria definition (self-contained, action-oriented, sequential) is precise and helps prevent vague beats
- "Not just mood" instruction prevents abstract, non-actionable beats
- Runtime estimation per beat enables downstream timing validation

**Improvement suggestions:**

1. **"15-30 beats" range is too wide**: For a 3-minute film the model might produce 30 micro-beats, for a 5-minute film only 15. Tie the count to runtime: `Aim for approximately 1 beat per 8-12 seconds of target runtime (e.g., 180s → 15-22 beats, 300s → 25-38 beats).`

2. **No structural beat categories**: Classic screenwriting uses inciting incident, midpoint reversal, climax, etc. The prompt doesn't guide the model to ensure these are present. Consider adding: `Ensure the beat sheet covers: Opening Image, Inciting Incident, First Act Turn, Midpoint, All Is Lost moment, Climax, and Resolution.`

3. **`total_estimated_runtime` has no validation instruction**: The model should be told `total_estimated_runtime MUST equal the sum of all individual estimated_screen_time_seconds values, and MUST fall within {target_length_min}-{target_length_max}.`

4. **Beat text quality is inconsistent**: Sometimes the model writes `"Elena enters the kitchen"` (too sparse) and sometimes a full paragraph. Adding a negative example would help: `BAD: "Things go wrong." GOOD: "Elena discovers the letter is a forgery — the handwriting analysis reveals someone in her own family forged her father's signature."`

5. **The `rationale` field adds tokens but is never displayed downstream**: If it's only for eval, consider making it optional or removing it in production to save tokens. If it's important, emphasize its purpose.

---

### 3B: Beat Brainstorm Alternatives

**File**: `src/lib/services/beatService.ts:197-216`
**Generates**: 3 alternative versions of a specific beat

#### System Prompt

```
You are a narrative structure analyst. Your task is to brainstorm alternative versions of a specific story beat while maintaining narrative coherence.

INSTRUCTIONS:
1. Generate exactly 3 alternative versions of the given beat
2. Maintain consistency with the surrounding beats
3. Each alternative should explore a different approach (tone, action, character focus, etc.)
4. Keep the same estimated screen time
5. Ensure alternatives still serve the same narrative function

OUTPUT FORMAT:
Respond with a JSON array of objects, each with a "text" field containing the alternative beat text.
Example: [{"text": "Alternative beat 1..."}, {"text": "Alternative beat 2..."}, {"text": "Alternative beat 3..."}]
```

#### Analysis

**What works well:**
- "Same narrative function" constraint is important — prevents alternatives from derailing the plot
- Surrounding context injection gives the model awareness of before/after beats

**Improvement suggestions:**

1. **No project constraints injected**: Unlike 3A, this prompt has no genre/tonal/runtime context. The alternatives can drift off-genre. Add the project constraints from the parent beat generation.

2. **"Different approach" needs specification**: Same vagueness issue as 2C. Define: `Alternative 1: Same events, different emotional emphasis. Alternative 2: Different action/event achieving the same story goal. Alternative 3: Different character perspective or unexpected approach.`

3. **Missing `estimated_screen_time_seconds` in output format**: The system prompt says "keep the same estimated screen time" but the JSON output doesn't include it. The parser downstream defaults to the original beat's time, which is fine — but the model doesn't know this.

---

### 3C: Beat Split

**File**: `src/lib/services/beatService.ts:257-273`
**Generates**: 2-3 more granular beats from a single beat

#### System Prompt

```
You are a narrative structure analyst. Your task is to split a single story beat into multiple coherent beats.

INSTRUCTIONS:
1. Break the given beat into 2-3 smaller, more granular beats
2. Each new beat should be self-contained and actionable
3. Maintain the total estimated screen time across all new beats
4. Ensure proper cause-and-effect flow between the new beats
5. Follow the user's guidance for how to split the beat
```

#### Analysis

**What works well:**
- Clear task with time conservation constraint
- Cause-and-effect instruction maintains narrative logic

**Improvement suggestions:**

1. **No JSON output format specified**: The system prompt doesn't tell the model what format to return. The parser (`parseSplitBeatsResponse`) expects numbered lines like `1. Beat text` or `Beat 1: text`, which is fragile. Add an explicit JSON schema like 3B uses.

2. **No surrounding beat context**: Unlike 3B, this prompt doesn't include neighboring beats for continuity awareness. The split beats may not connect properly to what comes before/after. Include at least the previous and next beat in context.

3. **Time distribution is unguided**: "Maintain the total estimated screen time" is correct, but the model gets no guidance on how to distribute it. For 2 sub-beats, should they be 50/50 or 30/70? Add: `Distribute screen time proportionally based on the narrative weight of each sub-beat.`

---

## Stage 4 — Master Script

### 4A: Master Script Generation

**File**: `backend/scripts/seed-templates.ts:148-200` (DB template `master_script_generation`)
**Invoked by**: `src/lib/services/scriptService.ts:79-99` → `POST /api/llm/generate-from-template`
**Generates**: Complete, visually verbose screenplay from a beat sheet

#### System Prompt

```
You are a screenplay formatting specialist. Your role is to convert beat sheets into industry-standard, visually verbose screenplays.

CRITICAL REQUIREMENT - VISUAL VERBOSITY:
The LLM is explicitly instructed to maximize descriptive text regarding Characters, Settings, Props, Action, and other Mise-en-scène for explicit visual translation. The script must be a **visually verbose blueprint**, not a concise theatrical script.

FORMAT REQUIREMENTS:
- Use industry-standard screenplay format
- ALL CAPS for Scene Headings (INT./EXT.), Character Names, and SFX
- Detailed action lines with rich visual descriptions
- Natural dialogue that serves the story
- Each scene must start with a proper scene heading: INT. or EXT. [LOCATION] - [TIME]

PROJECT CONSTRAINTS:
- Target length: {target_length_min} to {target_length_max} seconds
- Content rating: {content_rating}
- Genre: {genres}
- Tonal guidance: {tonal_precision}

WRITTEN STYLE CONTEXT:
{writing_style_context}

VISUAL DESCRIPTION FOCUS:
- Character appearance, clothing, expressions, body language
- Setting details, lighting, atmosphere, mood
- Props and their visual significance
- Camera-ready action descriptions
- Emotional subtext through visual cues
- Detailed descriptions of every mise-en-scène element

OUTPUT FORMAT:
Return ONLY the formatted screenplay text. Do NOT wrap it in JSON or markdown code blocks. Use standard screenplay format throughout.
```

#### Analysis

**What works well:**
- The "CRITICAL REQUIREMENT" header is effective at prioritizing visual verbosity — this is the pipeline's most important instruction since everything downstream depends on script richness
- "Camera-ready action descriptions" is the right framing for an AI-to-video pipeline
- Explicit format instructions (ALL CAPS, INT./EXT.) prevent format drift
- Plain text output (no JSON) is the right choice for a screenplay

**Improvement suggestions:**

1. **No example of desired visual verbosity level**: The prompt says "maximize descriptive text" but doesn't show what that looks like. Add a short example:
   ```
   BAD (too concise): "John enters the room and sits down."
   GOOD (visually verbose): "JOHN (40s, weathered face, dark circles under his eyes, rumpled linen shirt half-untucked) pushes through the heavy oak door. The hinges groan. He pauses in the doorway, silhouetted against the warm amber light of the hallway, then shuffles to a worn leather armchair and collapses into it — springs protesting under his weight."
   ```

2. **No scene count guidance**: The model doesn't know how many scenes to create. A 3-minute film might need 3-6 scenes; a 10-minute film might need 10-15. Add: `The number of scenes should approximately match the number of distinct locations and time periods implied by the beat sheet.`

3. **Dialogue-to-action ratio unspecified**: In an AI video pipeline, dialogue is secondary to visual description. Specify: `Favor 70% action/description to 30% dialogue. When a character speaks, describe their physical performance alongside the dialogue.`

4. **Character introduction format not standardized**: The prompt says "ALL CAPS when they first appear" but doesn't standardize the parenthetical description format. Different formatting makes downstream asset extraction harder. Standardize: `When a character first appears, use: CHARACTER_NAME (age, key physical description in 10-15 words)`.

5. **Missing "one beat per scene" or beat-to-scene mapping guidance**: The model sometimes compresses multiple beats into one scene or spreads one beat across multiple scenes unpredictably. Add: `Each scene should roughly correspond to 1-3 consecutive beats. Do not skip or combine beats unless the narrative demands it.`

6. **No instruction about scene transitions**: The script has no guidance on CUT TO / DISSOLVE TO / SMASH CUT types, which could inform downstream video editing. Consider: `Include transition suggestions between scenes where narratively significant (e.g., SMASH CUT TO, DISSOLVE TO, MATCH CUT TO).`

---

### 4B: Script Section Regeneration

**File**: `src/lib/services/scriptService.ts:209-232`
**Generates**: Rewrite of a highlighted section of the screenplay

#### System Prompt

```
You are a screenplay editor. Your task is to rewrite only the highlighted section of a screenplay based on the user's request.

CRITICAL REQUIREMENTS:
1. Maintain industry-standard screenplay format (INT./EXT., Character Names in CAPS, etc.)
2. Keep the same narrative function and timing as the original
3. Be visually verbose - include rich descriptions of characters, settings, props, and actions
4. Ensure the rewritten section flows naturally with the surrounding context
5. Return ONLY the rewritten section, nothing else

The surrounding context is provided for reference only - do NOT modify it.
```

#### Analysis

**What works well:**
- Clear windowed context approach (before + highlighted + after) is token-efficient
- "Same narrative function and timing" prevents scope creep
- "Return ONLY the rewritten section" is explicit

**Improvement suggestions:**

1. **No length anchor**: Same issue as 2B — the rewrite could be dramatically different length. Add: `The rewritten section should be approximately the same length as the original (±25%).`

2. **No negative examples for common failures**: Add: `Do NOT add new scene headings unless the original section contained one. Do NOT introduce new characters unless the user's request explicitly asks for it.`

---

### 4C: Script Section Alternatives

**File**: `src/lib/services/scriptService.ts:282-309`
**Generates**: 3 alternative rewrites for a highlighted section

#### Analysis

Same structure as 2C but for screenplay text. Same improvement suggestions apply, plus:

**Additional suggestion**: The alternatives are returned as a JSON array of strings, but screenplay text contains newlines, special characters, and formatting that can break JSON. Consider using a delimiter-based format instead: `Separate each alternative with the marker "---ALTERNATIVE---"` to avoid JSON escaping issues.

---

## Stage 5 — Asset Extraction

### 5A: Entity Mention Extraction (Legacy)

**File**: `backend/src/services/assetExtractionService.ts:366-389`
**Status**: Deprecated — replaced by deterministic `aggregateSceneDependencies`

#### System Prompt

```
You are a screenplay analyst. Extract all unique characters, props, and locations from this script.

CRITICAL RULES:
1. DEDUPLICATE: "John", "John Doe", and "Mr. Doe" are the SAME character
2. FOCUS ON VISUALS: Only extract physical objects/people/places
3. EXCLUDE ABSTRACTS: No "atmosphere", "tension", "mood" - only tangible assets
4. KEY ASSETS ONLY: Main characters, important props, primary locations
5. SCENE REFERENCES: Include which scenes each asset appears in
6. ESCAPE QUOTES: Use \" for quotes inside text fields to ensure valid JSON
```

#### Analysis

**This is deprecated, but the replacement (deterministic extraction) is the right call.** LLM-based entity extraction is inherently non-deterministic — the same script can produce different asset lists on different runs, which breaks the continuity system. The deterministic approach is more reliable.

**If ever revived:**
- The deduplication instruction is good but needs heuristic examples: `"THE GUARD" and "Guard #1" may or may not be the same character — merge only when clearly the same entity.`
- The `ESCAPE QUOTES` rule is a band-aid for JSON formatting issues — better to request YAML or use structured output modes.

---

### 5B: Visual Description Distillation

**File**: `backend/src/services/assetExtractionService.ts:531-565`
**Generates**: Concise 3-5 sentence AI-image-ready description per asset

#### System Prompt

```
You are a visual description specialist. Create a concise, vivid 3-5 sentence description suitable for AI image generation.

CRITICAL RULES:
1. PHYSICAL ONLY: Focus on appearance, clothing, colors, textures
2. CONSISTENCY: If descriptions conflict, note it clearly
3. ACTIONABLE: Use concrete details image AI can render
4. STYLE-ALIGNED: Consider the ${styleContext.name} visual style
5. PRIORITY: Assess if this is a main character/key prop vs background element
```

#### Analysis

**What works well:**
- "Physical only" and "actionable" constraints are exactly right for downstream image generation
- Conflict flagging is smart — catches continuity issues early
- Style alignment ensures visual coherence

**Improvement suggestions:**

1. **No guidance on description structure**: Different asset types need different description structures. A character needs face → body → clothing → posture. A location needs architecture → atmosphere → lighting → scale. Add type-specific templates: `For characters: Describe in order — face/features, hair, body build, clothing, accessories, default posture/expression. For locations: Describe — architectural style, scale, lighting, atmosphere, key features, color palette.`

2. **"3-5 sentences" is a loose target**: Image generation models work best with specific prompt structures. Consider: `Write exactly 3 sentences: (1) Overall appearance and defining features, (2) Clothing/material/texture details, (3) Distinguishing details and visual mood.`

3. **Temperature 0.4 might be too high for consistency**: This is a description task, not a creative task. Consider lowering to 0.2-0.3 for more deterministic descriptions.

4. **No instruction to avoid narrative language**: The model sometimes writes `"She carries the weight of her past in her eyes"` — poetic but useless for image generation. Add: `Write only what a camera would see. No metaphors, no internal states, no narrative context.`

---

### 5C: Asset Description Merger

**File**: `backend/src/services/assetDescriptionMerger.ts:48-67`
**Generates**: Merged description combining global + project-specific descriptions

#### System Prompt

```
You are an expert at combining asset descriptions for visual consistency.
Your task is to merge two descriptions of the same asset, where:
- The global description is the base/primary definition (the canonical version)
- The project description contains additions or modifications specific to this project

Create a coherent, unified description that:
1. Uses the global description as the foundation
2. Incorporates relevant details from the project description as additions or modifications
3. Maintains consistency and avoids contradictions
4. Preserves all important visual details from both descriptions

Return ONLY the merged description text, no explanations or meta-commentary.
```

#### Analysis

**What works well:**
- Clear hierarchy (global = base, project = overlay) prevents ambiguity
- "Avoids contradictions" is the right priority

**Improvement suggestions:**

1. **No conflict resolution strategy**: When global says "blue eyes" and project says "green eyes", what wins? Add: `When descriptions directly contradict, the project description takes priority (it represents intentional project-specific choices).`

2. **No length constraint**: The merged description could bloat. Add: `Keep the merged description to 3-5 sentences maximum. Prioritize visually distinctive details.`

3. **This could be a deterministic merge**: For simple additions, an LLM call is overkill. Consider: If the project description is an addendum (no contradictions), just concatenate. Only use LLM when `hasVisualConflicts: true` from 5B.

---

### 5D: Image Analysis (Vision)

**File**: `backend/src/services/imageAnalysisService.ts:48-52`
**Generates**: Visual description extracted from an uploaded asset image via Gemini Vision

#### Prompt

```
You are a visual description expert for film production. Analyze this image of a ${assetType} named "${assetName}" and write a detailed visual description suitable for AI image generation.

${typePrompt}

Write a concise but comprehensive visual description (2-4 sentences). Be specific about colors, materials, and visual details. Do not include narrative or story elements — only what is visually observable.
```

**Type-specific appendages:**
- **character**: `Focus on: physical appearance, facial features, hair style/color, clothing, body build, distinguishing marks, posture, and expression.`
- **location**: `Focus on: architectural style, atmosphere, lighting, materials/textures, spatial layout, notable landmarks, color palette, and time of day/weather.`
- **prop**: `Focus on: material, shape, size, color, texture, condition (new/worn/damaged), and any unique markings or details.`
- **extra_archetype**: `Focus on: archetype traits, general appearance, clothing style, body language, and any distinguishing visual features that define this background character type.`

#### Analysis

**What works well:**
- Type-specific focus lists are excellent — guide the vision model's attention to the right features
- "Only what is visually observable" correctly scopes the task
- Clean, focused prompt for a vision model

**Improvement suggestions:**

1. **No output structure**: The description is freeform text. For consistency with 5B's downstream usage, consider mirroring the same sentence structure: `Sentence 1: Overall form/silhouette. Sentence 2: Colors, materials, textures. Sentence 3: Distinctive details.`

2. **No instruction on ambiguity**: When the image is low-quality or ambiguous, the model might confabulate details. Add: `If any detail is unclear in the image, describe what is visible rather than guessing. Use phrases like "appears to be" for uncertain details.`

3. **Asset name injection could bias the model**: Telling the vision model the asset name (e.g., "Detective Morgan") might cause it to hallucinate details based on the name rather than the image. Consider: `Describe only what you see in the image. Do not infer characteristics from the asset name.`

---

### 5E: Image Description Merge

**File**: `backend/src/services/imageAnalysisService.ts:96-104`
**Generates**: Merged description combining script-based and image-extracted descriptions

#### Prompt

```
You are merging two visual descriptions of a ${assetType} named "${assetName}" for AI image generation.

Existing description (from script analysis):
"${existing}"

Extracted description (from uploaded image):
"${extracted}"

Create a single, cohesive visual description that combines the best details from both. Prioritize visual details from the image (extracted) but keep important narrative context from the existing description. Keep it concise (2-4 sentences). Only describe what is visually observable.
```

#### Analysis

**What works well:**
- Clear prioritization (image > script) makes sense since the user uploaded an image as the visual source of truth
- Length constraint keeps it focused

**Improvement suggestions:**

1. **"Keep important narrative context from the existing description" contradicts "only what is visually observable"**: The script description may contain narrative language. Clarify: `From the existing description, keep only physical/visual details. Discard any narrative context, emotional states, or story references.`

2. **Same prompt structure as 5C** — could share a common merge prompt with role-specific guidance.

---

## Stage 7 — Shot Extraction

### 7A: Shot List Extraction

**File**: `backend/src/services/shotExtractionService.ts:132-186`
**Generates**: Atomic 8-second shots with camera, action, dialogue, characters, setting, continuity flags

#### System Prompt

```
You are a technical shot breakdown specialist for an AI video generation pipeline. Your role is to translate narrative scenes into precise, time-bounded shots that feed directly into image and video generation models. Precision in your descriptions directly determines output quality.

GLOBAL CONTEXT:
${globalContextPackage}

CURRENT SCENE CONTEXT:
Scene ID: ${sceneId}
Scene Number: ${sceneNumber}

PREVIOUS SCENE END-STATE (LOCAL CONTEXT):
${previousSceneEndState}

SHOT BREAKDOWN RULES:
1. Each shot must be EXACTLY 8 seconds (or explicitly justified if different — use 4-6s for complex action).
2. Each shot must be ATOMIC (one primary action or dialogue exchange).
3. Camera specs must be technically precise with THREE components: SHOT_TYPE - ANGLE - MOVEMENT (e.g., "MS - Eye Level - Static", "CU - Low Angle - Slow Dolly In").
4. Character prominence must be explicit: use "foreground", "background", or "off-screen".

SHOT DESCRIPTION QUALITY REQUIREMENTS:
The "action" field must describe what a VIEWER WOULD SEE, not narrate story beats.
- Include character blocking and positioning
- Include body language and emotional state visible in performance
- Include environmental/atmospheric details
- Include lighting cues when implied by script
- Include spatial relationships between characters and objects
- Do NOT write vague actions like "they talk" — describe the physical performance

The "camera" field must specify all three components:
- Shot type: EWS, WS, MS, MCU, CU, ECU
- Angle: Eye Level, Low Angle, High Angle, Bird's Eye, Dutch Angle, Worm's Eye
- Movement: Static, Slow Dolly In, Slow Pan Left, Truck Right, Crane Up, Handheld, Steadicam, etc.
- Include framing notes when relevant

CONTINUITY REQUIREMENTS:
- The first shot must visually connect to the previous scene's end state.
- Character positions and states must be consistent with prior scene endings.
- Setting must match or explicitly transition.

OUTPUT: Return ONLY a valid JSON object...
```

#### Analysis

**What works well:**
- This is the strongest prompt in the pipeline — highly specific, technically precise, and well-structured
- The "what a VIEWER WOULD SEE" instruction is critical and clearly stated
- Three-component camera spec (type + angle + movement) is the right level of detail for downstream frame/video generation
- Continuity requirements with previous scene end-state ensure visual consistency across scenes
- Explicit negative example ("not 'they talk'") is very effective
- Global + local context injection gives the model full narrative awareness

**Improvement suggestions:**

1. **No shot count guidance**: The model doesn't know how many shots to produce. A 30-second scene might produce 4 shots; a 2-minute scene might need 15. Add: `Aim for approximately 1 shot per 8 seconds of estimated scene runtime. Scene runtime can be estimated from the script density.`

2. **"EXACTLY 8 seconds" vs. "4-6s for complex action" creates confusion**: The model sometimes uses 4s for everything or 8s for everything. Clarify: `DEFAULT to 8 seconds. Only use 4-6 seconds when the shot contains a single rapid action (punch, door slam, reaction shot) that would feel padded at 8 seconds. Never go below 4s or above 8s.`

3. **Camera movement vocabulary could be constrained**: The model sometimes invents movements like "Smooth Arc Pan Left With Slight Crane" — this is useless for the video model. Consider providing an explicit allowed list of camera movements that Veo 3.1 actually supports.

4. **No instruction about shot variety**: The model sometimes produces all MS-Eye Level-Static shots. Add: `Vary shot types across the scene for visual interest. A scene should typically include a mix of wide establishing shots, medium shots, and close-ups.`

5. **The `beat_reference` field is "optional" and rarely populated**: If it's important for traceability, make it required. If not, remove it to reduce output token waste.

6. **Retry prompt is too simplistic**: The fallback prompt (line 220) strips all quality requirements. Failed shots will be low quality. Consider a middle-ground retry that keeps the quality requirements but simplifies the JSON schema.

---

### 7B: Shot Split

**File**: `backend/src/services/shotSplitService.ts:117-151`
**Generates**: Two new shots from splitting one original shot

#### System Prompt

```
You are a shot segmentation specialist. Your role is to divide a single shot into two new shots while preserving narrative coherence. Each new shot will be given the same duration as the original (set server-side)...

ORIGINAL SHOT CONTEXT:
${originalJson}

SPLIT REQUIREMENTS:
1. The two new shots must collectively cover the same narrative content as the original.
2. The split point must be a natural action or dialogue break.
3. Camera specs must be adjusted appropriately for each new shot.
4. Continuity flags must be preserved or refined.
5. Do not invent new narrative content.
```

#### Analysis

**What works well:**
- "Natural action or dialogue break" is the right splitting criterion
- "Do not invent new narrative content" prevents hallucination
- Server-side duration override is smart architecture

**Improvement suggestions:**

1. **No instruction about camera continuity**: When splitting, the camera should logically transition. Add: `The first shot typically maintains the original camera. The second shot can adjust angle or type for visual interest, but should not be jarring (e.g., don't jump from ECU to EWS).`

2. **No guidance on dialogue splitting**: If the original shot has dialogue, how should it be distributed? Add: `If the original shot has dialogue, split it at a natural sentence or phrase boundary. Do not split mid-sentence.`

---

### 7C: Shot Merge

**File**: `backend/src/services/shotMergeService.ts:109-130`
**Generates**: Single merged shot from two consecutive shots

#### System Prompt

```
You are a shot consolidation specialist. Your role is to merge two consecutive shots into one coherent shot without inventing new narrative content.

MERGE REQUIREMENTS:
1. Combine dialogue, action, characters, setting, camera, and continuity_flags into a single coherent shot.
2. Do not invent new narrative content; only consolidate what is in the two shots.
3. The merged shot should read as one continuous beat.
4. Duration will be set server-side to the sum of the two shots.
```

#### Analysis

**What works well:**
- "Without inventing new narrative content" is a critical guardrail
- Server-side duration handling is correct

**Improvement suggestions:**

1. **Camera selection is ambiguous**: When merging two shots with different cameras (e.g., CU and MS), which camera spec should the merged shot use? Add: `For camera, choose the spec that best serves the combined action — typically the wider shot or the one that contains the most important visual moment.`

2. **Character prominence may conflict**: Shot 1 might have Character A in foreground and Shot 2 might have Character A in background. Add: `If a character's prominence changes between shots, use the prominence from whichever shot contains their most significant action.`

---

## Stage 8 — Scene Asset Relevance

### 8A: Scene Asset Relevance Detection

**File**: `backend/src/services/sceneAssetRelevanceService.ts:127-222`
**Generates**: Which project assets appear in a scene, their starting visual state, any new assets needed

#### System Prompt (short)

```
You are an asset continuity manager. Respond with valid JSON only, no markdown or extra text.
```

#### User Prompt (built by `buildRelevancePrompt`)

```
You are an asset continuity manager. Determine which **existing** Master Assets (from the list below) appear in the current scene and their starting visual state.

CRITICAL: You may ONLY reference project_asset_id values that appear in "AVAILABLE PROJECT ASSETS". Do not invent IDs.

CURRENT SCENE:
Scene Number: ${scene.scene_number}
Script Excerpt: ${scene.script_excerpt}

Shot List:
${shotLines}

LAST KNOWN STATE PER ASSET (most recent prior appearance):
${inheritanceContext}

AVAILABLE PROJECT ASSETS (only these may appear):
${assetLines}

RELEVANCE RULES:
1. Include only characters/props/settings explicitly or clearly implied in the shot list.
2. For each asset, use LAST KNOWN STATE if present; otherwise use Master Asset description.
3. relevant_assets[].project_asset_id MUST be one of the AVAILABLE PROJECT ASSETS ids.

STATE INHERITANCE:
- If the asset has a "last known state" above, use that as starting_description and status_tags_inherited.
- If new to this scene, use the Master Asset description.

OUTPUT (JSON only): ...
```

#### Analysis

**What works well:**
- The ID constraint ("MUST be one of the AVAILABLE PROJECT ASSETS ids") is critical and well-enforced — the code also validates post-LLM
- State inheritance logic is clear and well-documented in the prompt
- The `new_assets_required` advisory field is a smart pattern — flags gaps without breaking the pipeline
- Low temperature (0.3) is appropriate for this classification/mapping task

**Improvement suggestions:**

1. **The system prompt is too thin**: `"You are an asset continuity manager. Respond with valid JSON only"` — the user prompt repeats the persona and does all the heavy lifting. Either move more instructions to the system prompt (better for model attention) or consolidate into one prompt.

2. **Fuzzy name matching is a risk**: The shot list might say "Elena" but the asset list has "ELENA VASQUEZ". Add: `Match characters by name even if the shot list uses first names, last names, nicknames, or ALL CAPS variants. "Elena", "ELENA", and "Elena Vasquez" are the same character.`

3. **`requires_visual_update` is always false in the example**: The model will mirror this. Provide an example where it's true: `Set requires_visual_update to true when the character's state has changed significantly since last appearance (e.g., clothing change, injury, time passage).`

4. **`relevance_rationale` is token-expensive**: Consider making it optional for production and required for eval runs only.

---

## Stage 9 — Prompt Segmentation

### 9A: Start Frame Prompt

**File**: `backend/src/services/promptGenerationService.ts:407-447`
**Generates**: Frozen visual snapshot for the starting frame of a shot (max 1200 chars)

#### System Prompt

```
You are a visual prompt engineer for AI image generation (starting frames for Veo 3.1 video pipeline).

YOUR TASK: Generate a single dense paragraph describing a FROZEN VISUAL SNAPSHOT — the starting frame of a shot. This is a PHOTOGRAPH, not a video. There is NO action, NO dialogue, NO sound, NO movement.

STRUCTURE your output following this 5-part formula IN ORDER:
1. CAMERA POSITION & FRAMING: Shot type, camera angle, lens characteristics. Do NOT include camera movement.
2. SUBJECT APPEARANCE: Full physical description of each visible character using the asset descriptions below. Copy-paste character details verbatim from assets.
3. SPATIAL PLACEMENT & POSE: Where each subject/object sits in frame. Body orientation, hand positions, eye-line direction. Static poses only.
4. ENVIRONMENT & PROPS: Location details, architecture, props with positions, atmospheric visuals, time-of-day cues.
5. LIGHTING, COLOR & STYLE: Key light direction and quality, fill/rim light, color palette, contrast, film stock/aesthetic.

RULES:
- NO action verbs, NO dialogue, NO sound, NO movement — this is a still image
- Reference character appearances EXACTLY from the asset descriptions
- Output ONLY the prompt text as a single paragraph, max 1200 characters
- No JSON, no headers, no formatting

ASSET DESCRIPTIONS:
${assetContext}

${styleContext}
```

#### Analysis

**What works well:**
- The 5-part formula is excellent — it creates a structured, repeatable prompt format that image models can consistently interpret
- "FROZEN VISUAL SNAPSHOT" and repeated "NO movement" hammering is necessary — without it, the model consistently leaks motion verbs into frame prompts
- "Copy-paste character details verbatim from assets" maximizes visual consistency across frames
- The 1200-character limit prevents token bloat while allowing sufficient detail
- The frame ↔ video separation architecture is fundamentally sound

**Improvement suggestions:**

1. **1200 characters may be too restrictive for multi-character scenes**: A scene with 3 characters in frame, each needing appearance description, plus environment, plus lighting, easily exceeds 1200 chars. Consider: Dynamic limit based on character count — `max 800 chars for single-character shots, 1200 for two characters, 1600 for three+`.

2. **"Copy-paste character details verbatim" is impractical**: If each character description is 300 chars, two characters = 600 chars, leaving only 600 for camera + environment + lighting. The model needs to *summarize* character details, not copy-paste. Revise to: `Reference the most visually distinctive details from each character's asset description. Prioritize: face, hair, clothing, build. You don't need to reproduce every detail — focus on what makes the character recognizable.`

3. **No negative examples for common failure modes**: Frame prompts often contain:
   - Motion verbs: "She walks toward..." — add explicit examples of what to avoid
   - Narrative context: "Haunted by her past, Elena..." — reiterate physical only
   - Vague spatial language: "They are in a room" — should be "frame-left, center, background"

4. **Style context injection varies in quality**: When a visual style capsule is rich, the style section overwhelms the prompt. When it's sparse, the style is absent. Consider a fixed-length style injection: `Apply visual style: [max 150 chars of style description]`.

5. **No Veo 3.1-specific optimization**: The prompt doesn't account for what Veo's image model specifically responds well to. Research and add model-specific guidance (e.g., Veo tends to interpret certain spatial language more literally than others).

---

### 9B: Video Prompt

**File**: `backend/src/services/promptGenerationService.ts:462-496`
**Generates**: Lean action/movement/dialogue/sound prompt (max 500 chars)

#### System Prompt

```
You are a video prompt engineer for Veo 3.1 frame-to-video generation.

THE STARTING FRAME ALREADY ENCODES ALL VISUAL TRUTH. Do NOT describe what anyone looks like, what the environment looks like, what the lighting is, or what colors are present. The frame image handles all of that.

YOUR TASK: Generate a lean prompt describing ONLY what HAPPENS when you press play.

STRUCTURE:
1. CAMERA MOVEMENT: How the camera moves. If no movement, state "Static camera."
2. ACTION / PERFORMANCE: What subjects DO — physical movement, facial performance shifts, gestures.
3. DIALOGUE: Exact words in quotes with speaker ID. Include voice direction: accent, tone, pitch, pace, emotion.
4. SOUND DESIGN: SFX tied to actions, ambient audio, musical cues.

RULES:
- NO character appearance descriptions
- NO environment descriptions
- NO lighting or color palette mentions
- NO film stock or aesthetic mentions
- Keep it lean — max 500 characters
- Output a single paragraph, no JSON, no headers
```

#### Analysis

**What works well:**
- This is architecturally brilliant — the clean separation between "what it looks like" (9A) and "what happens" (9B) is exactly the right abstraction for frame-to-video models
- The explicit prohibitions (NO appearance, NO environment, NO lighting) are necessary and well-stated
- The 4-part formula (camera movement + action + dialogue + sound) covers exactly what a video model needs
- Voice direction in the dialogue section is sophisticated — accent, tone, delivery style
- 500-character limit forces economy, which is good for video model prompts

**Improvement suggestions:**

1. **"Static camera." wastes characters**: For shots with no camera movement, the prompt should skip that section entirely rather than stating "Static camera." Add: `If the camera is static, skip the camera movement section entirely — begin with action.`

2. **Dialogue formatting for Veo**: Veo 3.1 handles dialogue through audio generation. The current format puts dialogue in quotes with speaker ID, but Veo may not reliably map speaker IDs to visual characters. Consider: `For dialogue, write the character name followed by their line: "ELENA speaks softly, trembling: 'I can't do this anymore.'" — this gives the audio model both speaker identity and delivery.`

3. **Sound design section is often empty or generic**: Many shots don't have significant sound design. Add: `If no specific sound effects are relevant, write "Ambient room tone" or "Natural outdoor sounds" rather than leaving this section empty. Silence should be explicitly stated: "Complete silence — no ambient sound."` This matters because Veo 3.1 generates audio.

4. **No guidance on action specificity for short vs. long shots**: A 4-second shot should have one micro-action. An 8-second shot can have a sequence. Add: `For ${shot.duration}s shots: describe one clear action that fills the duration naturally. Don't over-pack multiple actions into short shots.`

5. **Missing temporal pacing cues**: "She slowly turns" vs "She snaps her head around" — the model needs to know pacing. Add: `Include temporal adverbs (slowly, suddenly, gradually) to guide the video model's motion speed.`

---

### 9C: End Frame Prompt

**File**: `backend/src/services/promptGenerationService.ts:516-554`
**Generates**: Frozen visual snapshot of the end state after the shot's action

#### System Prompt

```
You are a visual prompt engineer for AI image generation (end frames for Veo 3.1 video pipeline).

YOUR TASK: Generate a single dense paragraph describing a FROZEN VISUAL SNAPSHOT — the END frame of a shot. This is a PHOTOGRAPH, not a video.

This end frame shows the RESULT of the action that occurred during the shot. Same camera position, same characters — only their poses, expressions, and positions have changed.

CONTEXT:
- The START frame prompt describes how the shot BEGAN
- The shot action describes WHAT HAPPENED during the shot
- Your job is to describe the RESULTING end state

RULES:
- Same camera position and framing as the start frame
- Same characters, same clothing, same environment
- Only change: poses, expressions, positions, and effects of the action
- NO action verbs, NO dialogue, NO sound, NO movement
- Output ONLY the prompt text as a single paragraph, max 1200 characters
```

#### Analysis

**What works well:**
- "Same camera, same environment, only poses/expressions changed" is exactly the right constraint for visual continuity
- Providing the start frame as context ensures consistency
- The before/after framing (start frame = "before", action = "what happened", end frame = "after") is logically clean

**Improvement suggestions:**

1. **The model often just paraphrases the start frame**: Without seeing the actual action's visual result, the model tends to produce an end frame that's nearly identical to the start frame. Add: `The end frame must be VISUALLY DISTINGUISHABLE from the start frame. If the action was "Elena stands up from the chair," the end frame should show her standing, not sitting. Identify the KEY VISUAL CHANGE that occurred.`

2. **No guidance on subtle vs. dramatic changes**: A 4-second reaction shot might only change an eyebrow. An 8-second action shot might completely recompose the frame. Add: `The degree of visual change should match the action intensity. A quiet conversation changes only expressions. A fight scene changes character positions, poses, and potentially introduces new elements (blood, broken objects).`

3. **Missing the 5-part formula from 9A**: The end frame prompt uses the same structure as 9A but doesn't explicitly list the 5 parts. For consistency: `Follow the same 5-part formula as the start frame: Camera Position, Subject Appearance (unchanged), Spatial Placement (UPDATED), Environment (mostly unchanged), Lighting (unchanged unless action changes it).`

---

## Stage 10 — Image Generation

### 10A: Prompt Enrichment (NanoBanana/Gemini)

**File**: `backend/src/services/image-generation/NanoBananaClient.ts:69-103`
**Generates**: Enhanced prompt text prepended to the frame prompt when reference images and/or style context are present

#### Dynamic Prompt Patterns

**Mixed identity + style images:**
```
Maintain the characters/subjects from the FIRST ${identityCount} identity reference image(s) — preserve their exact appearance, features, clothing, and distinguishing details. Apply the visual style, color palette, mood, and aesthetic from the remaining ${styleCount} style reference image(s). ${styleGuidance}Subject: ${options.prompt}
```

**Identity only:**
```
Maintain the characters/subjects from the ${identityCount} reference image(s) — preserve their exact appearance, features, clothing, and distinguishing details. ${styleGuidance}Subject: ${options.prompt}
```

**Text-only style context:**
```
Generate an image with the following visual style applied strongly throughout: ${options.visualStyleContext}

Subject: ${options.prompt}

IMPORTANT: The visual style described above must be clearly evident in the generated image.
```

#### Analysis

**What works well:**
- Clear differentiation between identity preservation and style application
- Fallback chain (mixed → identity only → legacy → single ref → text only) handles all reference image combinations
- "Preserve their exact appearance, features, clothing" is the right instruction for character consistency

**Improvement suggestions:**

1. **The prompt prepends a lot of text before the actual scene description**: Gemini's image model may weight early text more heavily. Consider: `Put the scene description first, then the style/identity instructions after. Or use a structured format: "SCENE: [frame prompt] | STYLE: [style instructions] | IDENTITY: [character instructions]"`

2. **"Apply the visual style, color palette, mood, and aesthetic" is repetitive**: "Color palette" is part of "visual style". Tighten to: `Apply the visual style from the reference image(s) — match its color palette, lighting treatment, and artistic aesthetic.`

3. **No handling of conflicting style + identity images**: If the identity reference shows a character in a realistic photo and the style reference is anime, the model struggles. Add: `When identity and style references conflict in artistic medium, preserve the character's physical features but render them in the style reference's artistic medium.`

---

### 10B: Background Isolation Injection

**File**: `backend/src/services/image-generation/ImageGenerationService.ts:77-88`
**Generates**: Appended instruction for character/prop/extra_archetype asset images

#### Injected Text

```
. Isolated on a plain white background, no environment, no other characters or objects.
```

#### Analysis

**What works well:**
- Simple and effective — clean backgrounds for asset images make downstream compositing easier
- Only applied to appropriate asset types (not locations)

**Improvement suggestions:**

1. **"Plain white background" can cause color bleeding on light-skinned characters or white clothing**: Consider: `. Isolated on a neutral gray (#808080) background, no environment, no other characters or objects.` — neutral gray is the industry standard for character isolation.

2. **The period at the start (`. Isolated...`) creates grammatically awkward concatenation**: If the base prompt doesn't end with a period, this creates `...brown hair. Isolated on...` which reads fine, but if it ends with `...and a warm smile. Isolated...` the double period is odd. Better: Trim trailing punctuation from the base prompt before appending.

---

### 10C: Angle Variant Prompts

**File**: `backend/src/services/image-generation/ImageGenerationService.ts:248-262`
**Generates**: Angle-specific views of a character asset

#### Angle Prompts

```
front: "front-facing view, looking directly at the camera"
side: "side profile view, facing left, showing full silhouette"
three_quarter: "three-quarter angle view, slightly turned from the camera"
back: "rear view from behind, showing the back of the character"
```

Combined as: `${angleInstruction} of ${baseDescription}`

#### Analysis

**What works well:**
- Four canonical angles provide good coverage for character turnarounds
- Simple, direct instructions that image models interpret well

**Improvement suggestions:**

1. **"Facing left" for side view is arbitrary and inconsistent**: Some models interpret "left" differently depending on perspective. Use: `side profile view, facing screen-left (character's right side visible), showing full silhouette`

2. **Missing body framing**: The angle instructions don't specify how much of the character to show. Add: `Full body from head to feet, with 10% padding around the figure` — this ensures consistency across angles.

3. **Missing lighting consistency**: Different angles can get very different lighting from the model. Add: `Even, flat studio lighting from the front. No dramatic shadows. Consistent with other angle variants of this character.`

4. **No instruction about expression/pose consistency**: The front view might show a smile, the side view a neutral face. Add: `Maintain a neutral standing pose and neutral expression across all angles.`

---

## Cross-Cutting: Context Injection Layer

**File**: `backend/src/services/contextManager.ts`

The Context Manager assembles global and local context for injection into Stage 7, 8, and 9 prompts.

### How it works:
- **Global context**: Project params + writing style capsule + beat sheet + master script summary
- **Local context**: Scene script + prior scene end state + scene asset instances (with state inheritance)
- **Style capsule**: Formatted by `styleCapsuleService.formatWritingStyleInjection()`

### Analysis

**What works well:**
- Clean separation between global (Phase A) and local (Phase B) context
- Token monitoring with priority-based truncation (props first → locations → characters)
- Master script summary extraction (scene headings + first action lines) is token-efficient

**Improvement suggestions:**

1. **Token budget per stage is implicit**: The context manager truncates at 4000 tokens but different stages have different token budgets. Stage 9's 1200-char output limit means context should be proportionally smaller. Make the threshold configurable per stage.

2. **Beat sheet injection into Phase B prompts may be wasteful**: Stage 7 (shot extraction) already has the full scene script — the beat sheet reference is redundant context. Consider: only inject the specific beats that map to the current scene, not the entire beat sheet.

3. **Master script summary is a static extraction**: It only grabs scene headings + first action lines. For Stage 7-9, a per-scene summary would be more useful than a full-script summary.

---

## Stages with No LLM Prompts

| Stage | Name | Why no LLM |
|-------|------|------------|
| 1 | Input Mode | User input processing only |
| 6 | Script Hub / Scene Management | UI displays scenes from Stage 4 |
| 11 | Frame Review | UI for reviewing generated frames |
| 12 | Video Generation | Sends Stage 9's frame/video prompts to Veo 3.1 API directly |

---

## Global Recommendations

### 1. Add structured evaluation hooks

Every prompt should include a `// EVAL:` comment in code documenting:
- **Input quality signal**: What makes a good input to this prompt?
- **Output quality signal**: What does a successful output look like?
- **Known failure modes**: What does the model commonly get wrong?
- **Eval metric**: How would you score output quality (rubric, automated check, etc.)?

### 2. Version all prompts

Stages 2-4 use DB-stored templates (versionable). Stages 5-10 use hardcoded strings. Move all prompts to a centralized prompt registry with version tracking, so you can A/B test prompt changes and track regressions.

### 3. Add few-shot examples to high-impact prompts

The prompts with the biggest downstream impact — 4A (script generation), 7A (shot extraction), 9A (frame prompt), 9B (video prompt) — have zero few-shot examples. Even one good example dramatically improves output consistency.

### 4. Standardize temperature settings

Current temperatures are scattered: 0.3 (asset extraction), 0.4 (visual description), 0.7 (prompt generation). Document the rationale and standardize:
- **Classification/mapping tasks** (5A, 8A): temperature 0.1-0.2
- **Description/synthesis tasks** (5B, 9A, 9B, 9C): temperature 0.3-0.4
- **Creative generation tasks** (2A, 3A, 4A): temperature 0.6-0.7
- **Edit/rewrite tasks** (2B, 4B): temperature 0.3-0.5

### 5. Implement prompt chain validation

The pipeline is a chain: treatment → beats → script → shots → frame/video prompts. Quality degradation at any stage cascades downstream. Add automated validation between stages:
- After 3A: Verify beats sum to target runtime
- After 4A: Verify scene headings are parseable
- After 7A: Verify all shots have non-empty action/camera/setting
- After 9A: Verify frame prompts contain no motion verbs
- After 9B: Verify video prompts contain no appearance descriptions

### 6. Reduce JSON parsing fragility

Multiple prompts request JSON output and have extensive fallback parsing in the frontend/backend. Consider:
- Using Gemini's structured output mode (JSON mode) where available
- Using YAML instead of JSON for LLM outputs (fewer escaping issues)
- Adding `Respond with valid JSON only. Do not wrap in markdown code blocks.` to every JSON-requesting prompt

### 7. Create a prompt playground

Build an internal tool that lets you:
- Run any pipeline prompt with sample inputs
- Compare outputs across different prompt versions
- Score outputs against a rubric
- Track prompt performance over time

This is the most impactful infrastructure investment for systematic prompt improvement.

Haha dude I've re-entered this sort of homeless arc


## *DEV/User Thoughts*:

1. Frame Prompt HAS Image refferences for a Image Gen Call:

-> Take into account character descriptions, either from stage 8 if using Scene Ref Image OR 
Stage 5 if using Master Asset (and when using past scene's reference image, just use THAT scenes' description as the baseline), and KNOWING that those said individual descriptions were known to be used to generate the image, you THUS don't actually need to include said descriptions in the frame / video prompts.






There's a deterministic way to do this. I KNOW IT TO BE TRUE





Indeed, make the frame prompts be much more procise about framing and like physcial placement of misc en scene in shot, and make sure to keep continuity throught scene, unless explicitly asked to be changed. 

Example: 



2. Frame Prompt is Sans Image ref Gen Call:]


SO let's take for example:
Persephone, in scene 2 starts as normal (blond nature princess), thus in the Stage 8 visual description she is set as such, with a description matching her master asset description very simularly, and here Scene Instance image again depicting her as her blonde nature princess. However, lets say, as the scene progresses, she transforms to a dark goth underworld queen look. I don't think our application is really designed to handle such edge cases, and I want to think about how we can make the requesite enhancements to be able to handle such situtations. 
I believe WT-F-task description handles changes between scenes, but what about WITHIN scenes, this is not accounted for.
Additioanlly, what about changes that occur within a SINGLE SHot, (think a shot of cinderella, at midnight, when she transforms from princess to poor maid rags) and then for the rest of the scene is in this poor rags look, not like the princess from the begenging of the scene (thus the scene instance image is insufficent to describe here), AND the changes that occured.
How can we upgrade our design off our pipelien to handle such situations
Let's brainstorm and discuss, before later trying to make a plan to implenet the enhancements.


This is a great architectural question. I've now read both task docs, the full prompt-analysis doc, and deep-dived the   
  current data model. Let me layeoutDtheeproblemzclearlypanduthen/brainstormtapproaches.s/scene.ts" - Not a directory      

  ---
  The Problem: Three Levels of Visual Transformation

  Your current architecture has a fundamental assumption: one effective_description per asset per scene. A
  scene_asset_instance row gives you exactly one description, one image, and one set of status tags for the entire scene.  
  This works perfectly for the common case but breaks down at three levels:

  Level 1: Cross-Scene (WT-F covers this)

  Persephone is blonde in Scene 1, goth in Scene 4

  This is the case WT-F addresses. Each scene gets its own scene_asset_instance with a different effective_description. The   adaptive description service detects the scene context and generates the right description. Solved by WT-F.

  Level 2: Within-Scene, Cross-Shot (NOT covered)

  Persephone starts Scene 2 as blonde (shots 1-3), transforms in shot 4, is goth for shots 5-8

  The current scene_asset_instance can only hold ONE description. buildAssetContext(assets) assembles the same asset       
  context for ALL shots in the scene. So shots 5-8 still inject "blonde nature princess" into the frame prompts even though   she's already transformed.

  Level 3: Within-Shot (NOT covered)

  Cinderella's midnight transformation — princess to rags in a single shot

  This is the hardest case. The current architecture:
  - Start frame prompt uses effective_description → shows princess
  - End frame prompt explicitly says "same characters, same clothing, same environment" → still shows princess
  - Video prompt explicitly says "NO character appearance descriptions" → can't describe the transformation

  The end frame is architecturally forbidden from showing the transformation, and the video prompt is forbidden from       
  describing it.

  ---
  Current Architecture Gaps

  Gap: One description per asset per scene
  Where: scene_asset_instances.effective_description
  Impact: Can't represent pre/post states within a scene
  ────────────────────────────────────────
  Gap: One image per asset per scene
  Where: scene_asset_instances.image_key_url
  Impact: Scene instance image only shows one look
  ────────────────────────────────────────
  Gap: Same asset context for all shots
  Where: buildAssetContext() in promptGenerationService
  Impact: All shots get identical character descriptions
  ────────────────────────────────────────
  Gap: End frame copies start frame appearance
  Where: 9C system prompt: "same clothing"
  Impact: Transformation result can't be depicted
  ────────────────────────────────────────
  Gap: Video prompt bans appearance language
  Where: 9B system prompt: "NO character appearance"
  Impact: Transformation action can't be described
  ────────────────────────────────────────
  Gap: No transformation event model
  Where: No table/type for it
  Impact: Pipeline has no concept of "appearance changes here"

  ---
  Brainstorm: The "Transformation Event" Concept

  The cleanest architectural addition I see is introducing a transformation event — a first-class entity that marks a      
  specific shot as a visual transformation boundary.

  Data Model

  transformation_events
  ├── id (UUID)
  ├── scene_id (FK → scenes)
  ├── scene_asset_instance_id (FK → scene_asset_instances)
  ├── trigger_shot_id (FK → shots) — the shot where transformation occurs
  ├── transformation_type: 'instant' | 'gradual' | 'within_shot'
  ├── pre_description (TEXT) — appearance before (defaults from effective_description)
  ├── post_description (TEXT) — appearance after
  ├── post_status_tags (TEXT[]) — new status tags after transformation
  ├── post_image_key_url (TEXT, nullable) — optional post-transformation reference image
  ├── transformation_action (TEXT) — what the transformation looks like visually
  ├── auto_detected (BOOLEAN) — was this detected by LLM or manually created?
  └── user_confirmed (BOOLEAN) — has user reviewed and confirmed?

  How It Changes Prompt Generation

  During generateBulkPromptSets(), for each shot:

  1. Check: Is there a transformation event for any asset in this scene?
  2. For shots BEFORE the trigger shot: Use pre_description (same as current effective_description)
  3. For the trigger shot itself:
    - If within_shot: Start frame uses pre_description, end frame uses post_description, video prompt gets special
  permission to describe the visual change using transformation_action
    - If instant: Start frame = pre, end frame = post, video prompt describes the instant change
    - If gradual: Start frame = pre, end frame = a transitional blend, video prompt describes the progression
  4. For shots AFTER the trigger shot: Use post_description instead of effective_description

  How It Integrates With Existing Architecture

  - Stage 7 (Shot Extraction): Add a transformation_flag field to shot output. The LLM already reads the full script — add 
  to the prompt: "Flag any shot where a character's physical appearance changes significantly (costume change,
  transformation, injury)."
  - Stage 8 (Scene Asset Relevance): The relevance detection already analyzes the script + shot list. Extend it to detect  
  transformation points and auto-create transformation_events alongside scene_asset_instances. The
  scene_asset_instance.effective_description becomes the starting description, and the transformation event holds the      
  post-state.
  - Stage 9 (Prompt Generation): The buildAssetContext() function becomes shot-aware — it checks transformation events and 
  swaps descriptions at the right shot boundary. The 9B and 9C system prompts get conditional overrides for transformation 
  shots.
  - WT-E (Shot-to-Shot Chaining): Integrates naturally. After a transformation shot, the chained context carries the       
  post-transformation description forward. This solves "rest of scene uses new look" elegantly.

  Scene Instance Images

  Currently: one image_key_url per scene_asset_instance.

  For transforming characters, you'd need two reference images:
  - The scene_asset_instance.image_key_url = pre-transformation (primary state)
  - The transformation_event.post_image_key_url = post-transformation

  The Stage 10 image generation for scene instances could be extended to generate both when a transformation event exists. 

  ---
  The Tricky Part: Within-Shot Transformations (Level 3)

  This is where it gets architecturally interesting. A single shot where Cinderella transforms requires:

  Start frame: Princess appearance → uses pre_description
  Video prompt: Must break the "NO appearance descriptions" rule — it needs to say something like "At the stroke of        
  midnight, her golden gown dissolves into threadbare rags, her glass slippers shatter, her upswept hair falls loose and   
  tangled"
  End frame: Must break the "same clothing" rule — needs to show post_description

  So transformation shots need conditional prompt template overrides:
  - 9B's system prompt drops the "NO appearance" prohibition for transformation shots and instead says: "Describe the      
  visual transformation using the TRANSFORMATION ACTION context provided"
  - 9C's system prompt drops "same clothing/same environment" for transformation shots and instead says: "Show the RESULT  
  of the transformation — use the POST-TRANSFORMATION description"

  This is a per-shot prompt variant, not a global change. The existing prompt templates stay identical for 99% of shots.   
  Only flagged transformation shots get the modified templates.

  ---
  Alternative Approach: Shot-Level Asset State Stack

  Instead of transformation events, you could allow per-shot description overrides — essentially making asset descriptions 
  shot-scoped rather than scene-scoped:

  shot_asset_states
  ├── shot_id (FK)
  ├── scene_asset_instance_id (FK)
  ├── effective_description_override (TEXT)
  ├── status_tags_override (TEXT[])
  ├── image_reference_override (TEXT, nullable)

  This is more flexible (every shot can have different descriptions for every asset) but:
  - Pro: Maximum flexibility, handles any edge case
  - Con: Much more data, more UI complexity, harder to manage for the 90% case where nothing changes
  - Con: Doesn't explicitly model the event of transformation, just the result

  I think the transformation event model is better because it's event-driven (captures the "what happened" and "when")     
  rather than pure state (which loses the narrative meaning).

  ---
  Detection Strategy: Where Would Transformations Be Caught?

  Best point: Stage 7 (Shot Extraction)

  The LLM already reads the full scene script and produces shots with actions, characters, camera specs, etc. Adding       
  transformation detection here is natural — the shot extraction prompt could include:

  "If a character's physical appearance changes significantly during this shot (costume change, physical transformation,   
  disguise, injury that changes appearance), set transformation: { asset_name, pre_state_summary, post_state_summary, type:   'instant'|'gradual'|'within_shot' } on that shot."

  Secondary detection: Stage 8 (Relevance)

  If Stage 7 flags transformations, Stage 8 can validate them against the master asset descriptions and create the
  transformation_events alongside the scene_asset_instances.

  User confirmation: Stage 8 UI

  Show detected transformations in the VisualStateEditorPanel with a visual diff: "Pre: blonde nature princess" → "Post:   
  dark goth underworld queen." User can confirm, edit, or dismiss.

  ---
  Summary of the Proposal

  ┌──────────────────────────────────┬──────────────────────────────────────────────────────────────────────────┐
  │             Concern              │                                 Solution                                 │
  ├──────────────────────────────────┼──────────────────────────────────────────────────────────────────────────┤
  │ Cross-scene changes              │ WT-F adaptive descriptions (already planned)                             │
  ├──────────────────────────────────┼──────────────────────────────────────────────────────────────────────────┤
  │ Within-scene, cross-shot changes │ transformation_events table + shot-aware buildAssetContext()             │
  ├──────────────────────────────────┼──────────────────────────────────────────────────────────────────────────┤
  │ Within-shot transformation       │ Conditional prompt template overrides for 9B/9C on flagged shots         │
  ├──────────────────────────────────┼──────────────────────────────────────────────────────────────────────────┤
  │ Detection                        │ Stage 7 flags transformations in shot extraction; Stage 8 creates events │
  ├──────────────────────────────────┼──────────────────────────────────────────────────────────────────────────┤
  │ User review                      │ Stage 8 UI shows pre/post with confirm/edit/dismiss                      │
  ├──────────────────────────────────┼──────────────────────────────────────────────────────────────────────────┤
  │ Reference images                 │ post_image_key_url on transformation event for post-state reference      │
  ├──────────────────────────────────┼──────────────────────────────────────────────────────────────────────────┤
  │ WT-E integration                 │ Chaining naturally carries post-transformation state forward             │
  ├──────────────────────────────────┼──────────────────────────────────────────────────────────────────────────┤
  │ Downstream continuity            │ Next scene inherits from post_description (last state in scene)          │
  └──────────────────────────────────┴──────────────────────────────────────────────────────────────────────────┘

  ---
  What's your thinking on this? A few specific questions:

  1. Do you like the transformation event model, or do you prefer the more flexible per-shot asset state approach?
  2. For within-shot transformations — are you comfortable with the conditional prompt template override approach (where   
  9B/9C get modified system prompts for transformation shots)?
  3. Should transformation detection be primarily automatic (LLM-detected in Stage 7) with user confirmation, or primarily 
  manual (user marks transformation points in Stage 8 UI)?