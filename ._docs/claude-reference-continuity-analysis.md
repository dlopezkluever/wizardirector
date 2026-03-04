# Reference Continuity (Camera Angle Change) — Research & Implementation Ideas

## 1. How It Currently Functions

### Data Flow
```
User clicks "Pull Ref" / "Push Ref" button
  → POST /add-frame-as-reference
  → Stores source frame URL in shots.reference_image_order JSONB
     as { type: 'continuity', url: sourceFrame.image_url }
  → During generation, fetched as role: 'identity' reference
  → Gemini receives image as base64 inlineData + enhanced prompt
```

### Auto-Detection (Stage 9 Prompt Generation)
`determineContinuityLink()` classifies each shot transition:
- **Same camera setup** → `match` (pixel-identical copy)
- **Different camera, same setting** → `camera_change` (recomposition)
- **Different setting / explicit cut** → `none`

### Camera Change Generation Path
When `start_continuity === 'camera_change'`:
1. Uses `continuity_frame_prompt` (an LLM-generated recomposition prompt)
2. Prepends the previous end frame as primary `identity` reference
3. Passes both prompt + reference to Gemini 2.5 Flash Image

### What Currently Works
- Basic plumbing: ref images get stored, retrieved, and sent to Gemini
- Role-aware prompt enhancement ("Maintain the characters/subjects from reference images")
- Auto-classification of continuity modes
- Dedicated recomposition prompt generation from shot metadata

### What's Weak / Missing
1. **No vision analysis of the reference frame** — passes raw image to Gemini with a text prompt derived from shot metadata, NOT from what's actually visible in the reference image
2. **Prompt describes the scene generically** — built from stage metadata (character names, setting), not from visual details in the actual generated frame
3. **No structured scene extraction** — the "analyze → extract → regenerate" approach is not implemented
4. **No post-generation verification** — no check that the new frame maintains continuity
5. **Single reference approach** — only passes one reference image (the previous end frame)

---

## 2. Research Findings: Image Generator Capabilities

### Direct "Change Angle" Capability
**Verdict: Partially capable, but unreliable for production quality.**

- **Small angle changes** (slight zoom, minor reframe): Reasonably good
- **Medium changes** (two-shot → single CU): Hit or miss — face detail drift, background hallucination
- **Large changes** (scene → POV shot, reverse angle): Unreliable — too much must be invented

### Specialized Tools (2025-2026)
| Tool | What It Does | Strength |
|------|-------------|----------|
| **Qwen Image Edit (Multi-Angle LoRA)** | Structural depth reasoning for angle changes | Good for moderate angle shifts |
| **Stable Virtual Camera (SEVA)** | 3D-aware novel view synthesis from 1-32 views | Best geometric consistency |
| **Flux 2 Multi-Angles LoRA** | 72 camera positions with azimuth/elevation | Precise angle control |
| **IP-Adapter + ControlNet** | Independent identity + structure control | Most flexible pipeline |

### Core Problem
Image generators are 2D systems without true 3D spatial understanding. They cannot:
- Rotate a "virtual camera" around a scene
- Infer what's behind occluded objects
- Maintain exact spatial relationships under angle changes

### Best Approach (Research Consensus)
The **"Describe-then-Generate"** approach is the most reliable for production:
1. Use a **vision model** (Claude/Gemini) to analyze the reference frame
2. Extract a **structured scene description** (characters, positions, lighting, environment)
3. Use that description + new camera specs as the generation prompt
4. **Combine with the reference image** as a visual anchor

This works because text descriptions carry semantic understanding that survives angle changes, while the reference image provides visual grounding (style, colors, faces).

---

## 3. Implementation Ideas

### Approach A: "Analyze-then-Generate" Pipeline (Recommended)

#### Step 1: Scene Analysis Service
Create an `analyzeReferenceFrame()` method that takes a frame image URL and produces:
```typescript
interface SceneAnalysis {
  characters: {
    position: string;        // "frame-left", "center-right"
    facing: string;          // "facing camera", "3/4 right"
    expression: string;      // "frowning with furrowed brows"
    clothing: string;        // "dark navy suit, loosened red tie"
    posture: string;         // "leaning forward, hands on table"
    distinguishing: string;  // "scar above left eyebrow"
  }[];
  environment: {
    location: string;        // "dimly lit office interior"
    foreground: string;
    midground: string;
    background: string;
    props: string[];
  };
  lighting: {
    keyLight: string;
    fill: string;
    mood: string;
    timeOfDay: string;
  };
  atmosphere: string;
  colorPalette: string;
}
```

#### Step 2: Enhanced Recomposition Prompt
Instead of `generateContinuityFramePrompt()` using only shot metadata:
1. Call `analyzeReferenceFrame(sourceFrameUrl)`
2. Feed the structured analysis + target camera specs into the prompt
3. Prompt says: "Here is exactly what exists in the scene: [analysis]. Now describe this same scene from [new camera position]."

#### Step 3: Dual-Reference Strategy
Pass BOTH:
- Source frame image as `role: 'identity'` (visual anchor)
- Enhanced prompt with scene analysis (semantic anchor)

#### Step 4: Optional Post-Generation Verification
After generation, compare both frames via vision model to flag inconsistencies.

#### Implementation Cost
- New method: `analyzeReferenceFrame()` in promptGenerationService (~100-150 lines)
- Modified: `frameGenerationService.ts` (camera_change path, ~30 lines)
- Modified: `promptGenerationService.ts` (enhanced continuity prompt, ~50 lines)
- LLM cost: 1 extra vision-model call per camera-change frame (~$0.01-0.03)

### Approach B: Progressive Enhancement (Incremental)

**Phase 1**: Scene Analysis (biggest bang for buck) — analyze source frame, include in prompt
**Phase 2**: Better Prompt Engineering — specific anchors from analysis ("the blonde man in navy suit at frame-left is frowning")
**Phase 3**: Multi-Reference Support — also pull character asset images, not just previous end frame
**Phase 4**: Verification Loop — post-generation comparison

### Approach C: Hybrid External Tool (Future)
Use Stable Virtual Camera or Flux Multi-Angles for geometric re-projection as first pass, then Gemini for refinement. Requires adding a second image provider.

---

## 4. Recommended Next Steps

### Immediate
1. Implement `analyzeReferenceFrame()` — vision model extracts structured scene description
2. Enhance camera_change generation path — call analysis before generating continuity prompt
3. Improve `generateContinuityFramePrompt()` — feed structured analysis into prompt

### Short-Term
4. Add multi-reference support (character assets + previous frame)
5. Add post-generation comparison/verification
6. Cache scene analyses (one per frame, reusable)

### Long-Term
7. Evaluate specialized tools for geometric transformations
8. Quality scoring system for continuity frames
9. Iterative user refinement ("make the expression more intense")
