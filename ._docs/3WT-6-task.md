

#### 3C.3 — Asset Inheritance Chain Enhancement
**Ticket**: MVP v1.1 Feature 3.3, DC-3
**Priority**: HIGH
  Primary Files: assetInheritanceService.ts, sceneAssets.ts, new timeline UI, scene.ts
**Purpose**: Build comprehensive asset state tracking from Stage 5 through Stage 12.

**Problem/Context**: The context/inheritance chain from Stage 5 → Stage 8 → Stage 9 → Stage 10 is broken OR just really poorly designed somewhere (DC-3). Final generations don't reflect master asset influence or the shot list angle; i.e its just looks totally generic." Need strong inheritance tracking. Need to also make sure the shot list camera angle & movement data is influencing how the frame is structured..

**Core Features:**
- [ ] Strengthen `inherited_from_instance_id` chain tracking
- [ ] Build asset timeline view showing state evolution across scenes
- [ ] Add inheritance validation and repair tools
- [ ] Detect asset state changes during shot list creation
- [ ] Log visual evolution context from action descriptions
- [ ] Create efficient queries for asset history chains
- [ ] Implement asset state caching for quick retrieval

**Dependencies**: 3B.1 (carousel system provides generation history).

**User Comments**: TO get more at the issue, we neeed to really just be able to make sure we are getting the proper generations to occur from the inputs. Like in stage 8, we should desire the ability 
(Asset Inheritance Failure in Production Pipeline:
Final generations (Stage 10) do not reflect the influence of master assets. The context/inheritance chain from Stage 5 → Stage 8 → Stage 9 → Stage 10 is broken somewhere. Visual style capsule seems to override everything.)

Ticket Info: 
### Feature 3.3: Advanced Asset Inheritance Chain ✅ **DATA FLOW OPTIMIZATION**

**Purpose**: Build comprehensive asset state tracking and inheritance system

**Core Features:**
- [ ] **Enhanced Scene Asset Instances**: Improve inheritance tracking
  - Strengthen inherited_from_instance_id chain tracking
  - Build asset timeline view showing state evolution
  - Add inheritance validation and repair tools
- [ ] **Asset State Evolution Logic**: Handle mid-scene changes intelligently
  - Detect asset state changes during shot list creation
  - Log visual evolution context from action descriptions
  - Prepare for Stage 10 frame generation consumption
- [ ] **Inheritance Performance**: Optimize asset queries
  - Create efficient queries for asset history chains
  - Implement asset state caching for quick retrieval
  - Build asset dependency graphs for complex projects
---
# Could be worth also doing: {

#### 4B.4 — Shot List Action Descriptions / contnet Enhancement
**Ticket**: 7.1
**Priority**: HIGH

**Purpose**: Make shot list information much more descriptieve, regarding camera angle, camaera motion, lighting, and describe the frameing of the misc-en scene more, like it just needs to be much more descritive, to help with the rest of the process later (espeically the frame & video prompts) 

**Problem/Context**: Currently the extracted action is often only a line of dialogue with vague buzzwords. Shot list entries need camera directions, misc-en-scnee / framing, and detailed action descriptions. This is the preamble to the two key prompts made in Stage 9 — quality here directly impacts prompt quality.

**Core Features:**
- [ ] Enhanced extraction prompts for more detailed actions
- [ ] Include camera directions in shot descriptions
- [ ] Include character positioning and movement
- [ ] Include environmental/lighting context
- [ ] Crew-note style descriptions

**Dependencies**: None.

Ticket info: ### 7.1 — Shot List Extracted Action Too Concise
The extracted action and information going into the shot list needs to be much more descriptive. Currently often only a line of dialogue with vague buzzwords. Needs camera directions, crew notes, and detailed action descriptions. This is the preamble to the two key prompts made in Stage 9.
}
---

#### 3C.4 — Context Manager Enhancement
**Ticket**: MVP v1.1 Feature 3.4
**Priority**: HIGH
Primary Files: contextManager.ts (mostly unique file)
**Purpose**: Optimize context assembly for LLM calls with proper asset inheritance.

**Problem/Context**: LLM calls throughout the pipeline need properly assembled context that includes the right assets, styles, and prior work. Currently context may be incomplete or poorly prioritized.

**Core Features:**
- [ ] **Enhanced Global Context** (Phase A):
  - Include asset manifest from optimized Stage 5 extraction
  - Incorporate visual style locks and constraints
  - Add project-level continuity rules
- [ ] **Optimized Local Context** (Phase B):
  - Use cached scene dependencies instead of real-time extraction
  - Include relevant asset inheritance chains
  - Add prior scene end-state for continuity
- [ ] **Context Size Management**:
  - Intelligent context truncation to prevent token overflow
  - Prioritize recent asset states over distant history
  - Context size monitoring and alerts

**Dependencies**: 3A.1 (extraction provides the manifest), 3C.3 (inheritance chain).

More info of tickets for the scenes that it references from old task list:
### Feature 3.4: Context Manager Enhancement ✅ **GLOBAL/LOCAL OPTIMIZATION**

**Purpose**: Optimize context assembly for LLM calls with proper asset inheritance

**Core Features:**
- [ ] **Enhanced Global Context**: Strengthen Phase A context assembly
  - Include asset manifest from optimized Stage 5 extraction
  - Incorporate visual style locks and constraints
  - Add project-level continuity rules
- [ ] **Optimized Local Context**: Improve Phase B context efficiency
  - Use cached scene dependencies instead of real-time extraction
  - Include relevant asset inheritance chains
  - Add prior scene end-state for continuity
- [ ] **Context Size Management**: Prevent token overflow
  - Implement intelligent context truncation
  - Prioritize recent asset states over distant history
  - Add context size monitoring and alerts

**Deliverable**: Streamlined asset extraction and inheritance system that eliminates redundant AI calls, provides consistent asset states, and enables efficient scene-by-scene production workflow.

---


● I've now thoroughly explored the codebase across all three relevant systems. Here's a summary of what I found before we   
  discuss:

  The core problem is clear: The inheritance chain infrastructure works correctly (Scene N → Scene N+1 propagation), but    
  Stage 9 is a critical information bottleneck where:
  1. Asset queries are incomplete (missing effective_description, image_key_url, generation history)
  2. buildAssetContext() produces a bare-minimum text representation
  3. Visual style capsule is hardcoded to null in projects.ts
  4. Camera/framing data from shots is passed as raw strings without enrichment
  5. No context size management exists at all

  Now I have several questions to make sure the plan is aligned with your expectations:
────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────←  ☒ Scope  ☒ Style capsule  ☒ Timeline UI  ☒ Prompt limits  ✔ Submit  →

For the prompt generation improvements: the current frame prompts are capped at 800 chars and video prompts at 600 chars.   
Should we keep these limits, or do you want to adjust them given the richer context we'll be providing?

  2. Increase limits ✔  
     Raise the limits to allow richer prompt output from the improved context; let's try to incorporate some of the lessons from the following: 

  
 ● The task doc lists three features: 3C.3 (Asset Inheritance Chain), 4B.4 (Shot List Action Enhancement), and 3C.4 (Context  Manager Enhancement). 4B.4 is marked 'could be worth also doing'. What's the scope you want for this work?
   → All three features
 ● The visual style capsule is currently hardcoded to `null` in the prompt generation route (projects.ts line ~2081). This  
 means style information NEVER reaches frame/video prompts. Should fixing this be part of this task, or is that a separate  
 concern?
   → Fix it in this task
 ● The task mentions building an 'asset timeline view showing state evolution across scenes'. This is a frontend UI feature.  How important is this relative to the backend data flow fixes?
   → Skip for now
 ● For the prompt generation improvements: the current frame prompts are capped at 800 chars and video prompts at 600 chars.  Should we keep these limits, or do you want to adjust them given the richer context we'll be providing?
   → Increase limits (but make sure to follow this guide for structuring the prompt output, it will give you a rubric for how to output the prompt, or in other words,  let's try to incorporate some of the lessons from the following:   
   )