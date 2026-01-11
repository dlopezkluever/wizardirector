# AI Agent Registry & Context Flow Architecture

## **Table of Contents**

1. Phase A: Narrative Agents (Stages 1-5)  
2. Phase B: Production Agents (Stages 6-12)  
3. Context Propagation Architecture  
4. Retroactive Edit Flows

---

## **Phase A: Narrative Agents (Stages 1-5)**

### **1\. Treatment Expansion Agent (Stage 2\)**

**Purpose:** Expands user input into full 3-act treatment prose.

**System Prompt:**

You are a narrative expansion specialist. Your role is to transform brief story ideas into fully-realized 3-act treatments.

CONSTRAINTS:  
\- Target length: {target\_length\_min} to {target\_length\_max} seconds of screen time  
\- Project type: {project\_type}  
\- Content rating: {content\_rating}  
\- Genre: {genre}  
\- Tonal guidance: {tonal\_precision}

REQUIREMENTS:  
1\. Generate exactly 3 distinct treatment variations  
2\. Each treatment must be continuous prose (no scene breaks yet)  
3\. Prioritize visual storytelling over dialogue-heavy sequences  
4\. Respect the content rating constraints  
5\. Adhere to the tonal guidance provided

WRITING STYLE CONTEXT:
{style_capsule_examples}

OUTPUT STRUCTURE:

Generate 3 complete treatments, each structurally different (different endings, chronology, or tonal emphasis).

**Input Requirements:**

typescript  
{  
  userInput: string;  
  contextFiles?: string\[\];  
  projectParams: {  
    target\_length\_min: number;  
    target\_length\_max: number;  
    project\_type: 'narrative' | 'commercial' | 'audio\_visual';  
    content\_rating: 'G' | 'PG' | 'PG-13' | 'M';  
    genre: string\[\];  
    tonal\_precision: string;  
  };  
  writingStyleCapsule?: {
    capsule_id: string;
    capsule_content: {
      text_examples: string[];
      descriptors: string[];
      negative_constraints: string[];
    };
  };

}

**Output Schema:**

json  
{  
  "treatments": \[  
    {  
      "variant\_id": 1,  
      "prose": "string (full treatment text)",  
      "structural\_emphasis": "string (e.g., 'linear chronology', 'dark ending', 'redemption arc')",  
      "estimated\_runtime\_seconds": "number"  
    },  
    {  
      "variant\_id": 2,  
      "prose": "string",  
      "structural\_emphasis": "string",  
      "estimated\_runtime\_seconds": "number"  
    },  
    {  
      "variant\_id": 3,  
      "prose": "string",  
      "structural\_emphasis": "string",  
      "estimated\_runtime\_seconds": "number"  
    }  
  \],  
  "style_capsule_applications": ["array of style_capsule_applications.id"],
  "prompt_template_version": "string",
  "langsmith_trace_id": "string (for observability)"  
}  
\`\`\`

\---

\#\#\# 2. Beat Extraction Agent (Stage 3)

\*\*Purpose:\*\* Atomizes treatment into discrete narrative beats.

\*\*System Prompt:\*\*  
\`\`\`  
You are a narrative structure analyst. Your role is to extract the core structural beats from prose treatments.

DEFINITION OF A BEAT:  
A beat is a single, atomic plot event or emotional shift that advances the story. It should be:  
\- Self-contained (understandable on its own)  
\- Action-oriented (describes what happens, not just mood)  
\- Sequential (follows cause-and-effect logic)

TARGET: Extract 15-30 beats from the provided treatment.

TREATMENT CONTEXT:  
{selected\_treatment\_prose}

PROJECT CONSTRAINTS:  
\- Target length: {target\_length\_min} to {target\_length\_max} seconds  
\- Genre: {genre}  
\- Tonal guidance: {tonal\_precision}

WRITING STYLE CONTEXT:
{style_capsule_examples}

OUTPUT REQUIREMENTS:  
1. Each beat must be 1-3 sentences maximum  
2. Beats must follow chronological order (unless non-linear storytelling is intended)  
3. Include a "rationale" explaining why this is a structural beat

4. Ensure beats collectively cover the full narrative arc

**Input Requirements:**

typescript  
{  
  treatmentProse: string;  
  selectedVariantId: number;  
  projectParams: {  
    target\_length\_min: number;  
    target\_length\_max: number;  
    genre: string\[\];  
    tonal\_precision: string;  
  };  
  writingStyleCapsule?: {
    capsule_id: string;
    capsule_content: {
      text_examples: string[];
      descriptors: string[];
      negative_constraints: string[];
    };
  };

}

**Output Schema:**

json  
{  
  "beats": \[  
    {  
      "beat\_id": "string (uuid)",  
      "order": "number",  
      "text": "string (1-3 sentences)",  
      "rationale": "string (why this is a beat)",  
      "estimated\_screen\_time\_seconds": "number"  
    }  
  \],  
  "total\_estimated\_runtime": "number",  
  "narrative\_structure": "string (e.g., '3-act', 'hero journey', 'non-linear')",  
  "rag\_retrievals\_used": \["array of rag\_documents.id"\],
  "prompt_template_version": "string",
  "langsmith_trace_id": "string (for observability)"
}  
\`\`\`

\---

\#\#\# 3. Script Generation Agent (Stage 4 \- The Verbosity Engine)

\*\*Purpose:\*\* Generates visually verbose, industry-formatted screenplay.

\*\*System Prompt:\*\*  
\`\`\`  
You are a visual screenplay writer specializing in AI-to-film translation. Your role is to convert beat sheets into fully formatted, VISUALLY EXPLICIT screenplays.

CRITICAL DIRECTIVE: VISUAL VERBOSITY  
Unlike traditional screenplays, your output must be a VISUAL BLUEPRINT. Every element of mise-en-scène must be explicitly described:  
\- Character appearance (clothing, posture, facial expressions)  
\- Setting details (lighting, props, spatial layout)  
\- Camera implications (though not technical specs yet)  
\- Action choreography (every movement, every gesture)

BEAT SHEET CONTEXT:  
{beat\_sheet\_json}

PROJECT CONSTRAINTS:  
\- Content rating: {content\_rating}  
\- Genre: {genre}  
\- Tonal guidance: {tonal\_precision}

WRITING STYLE CONTEXT:
{style_capsule_examples}

FORMAT REQUIREMENTS:  
1. Use industry-standard screenplay format:  
   \- INT./EXT. LOCATION \- TIME OF DAY (all caps)  
   \- Character names in all caps before dialogue  
   \- Action lines in present tense  
2. Scene headings must be unique slugs  
3. Dialogue must be character-specific and purposeful  
4. Action lines must be rich with visual detail

OUTPUT STRUCTURE:

Generate the complete screenplay, ensuring every beat is translated into one or more scenes.

**Input Requirements:**

typescript  
{  
  beatSheet: {  
    beats: Array\<{  
      beat\_id: string;  
      order: number;  
      text: string;  
      estimated\_screen\_time\_seconds: number;  
    }\>;  
  };  
  projectParams: {  
    content\_rating: string;  
    genre: string\[\];  
    tonal\_precision: string;  
  };  
  writingStyleCapsule?: {
    capsule_id: string;
    capsule_content: {
      text_examples: string[];
      descriptors: string[];
      negative_constraints: string[];
    };
  };

}

**Output Schema:**

json  
{  
  "formatted\_script": "string (full screenplay text with proper formatting)",  
  "scenes": \[  
    {  
      "scene\_id": "string (uuid)",  
      "slug": "string (e.g., 'INT. KITCHEN \- DAY')",  
      "heading": "string (formatted scene header)",  
      "content": "string (action \+ dialogue for this scene)",  
      "characters\_mentioned": \["array of character names"\],  
      "props\_mentioned": \["array of prop names"\],  
      "settings\_mentioned": \["array of setting/location names"\],  
      "beat\_ids\_covered": \["array of beat\_id UUIDs"\],  
      "estimated\_duration\_seconds": "number"  
    }  
  \],  
  "sync\_status": "synced",  
  "rag\_retrievals\_used": \["array of rag\_documents.id"\],
  "prompt_template_version": "string",
  "langsmith_trace_id": "string (for observability)"  
}  
\`\`\`

\---

\#\#\# 4. Asset Extraction Agent (Stage 5)

\*\*Purpose:\*\* Deterministically extracts all unique visual assets from the Master Script.

\*\*System Prompt:\*\*  
\`\`\`  
You are a production asset cataloguer. Your role is to extract every unique CHARACTER, PROP, and SETTING mentioned in the provided screenplay.

MASTER SCRIPT CONTEXT:  
{master\_script\_formatted\_text}

EXTRACTION RULES:  
1. CHARACTERS: Any named person or creature with dialogue or significant action  
2. PROPS: Any physical object that is:  
   \- Mentioned multiple times, OR  
   \- Critical to plot/action, OR  
   \- Visually distinctive  
3. SETTINGS: Any location where scenes take place

DEDUPLICATION:  
\- "John's kitchen" and "Kitchen" should be treated as the same setting  
\- "John Doe" and "John" should be treated as the same character

DESCRIPTIVE COMPILATION:  
For each extracted asset, compile all mentions from the script into a single, consolidated description.

OUTPUT REQUIREMENTS:  
1. Extract ALL assets (do not filter by importance at this stage)  
2. Provide a master description synthesized from all script mentions

3. Flag assets as "Key" (mentioned 3\+ times) vs "Supporting" (1-2 mentions)

**Input Requirements:**

typescript  
{  
  masterScript: {  
    formatted\_script: string;  
    scenes: Array\<{  
      scene\_id: string;  
      content: string;  
      characters\_mentioned: string\[\];  
      props\_mentioned: string\[\];  
      settings\_mentioned: string\[\];  
    }\>;  
  };

}

**Output Schema:**

json  
{  
  "extracted\_assets": \[  
    {  
      "asset\_id": "string (uuid)",  
      "name": "string (canonical name)",  
      "asset\_type": "character | prop | location",  
      "master\_description": "string (compiled from all script mentions)",  
      "script\_mentions": \[  
        {  
          "scene\_id": "string",  
          "mention\_text": "string (exact excerpt)"  
        }  
      \],  
      "importance": "key | supporting",  
      "estimated\_prominence": "number (0-1 scale)"  
    }  
  \],  
  "total\_characters": "number",  
  "total\_props": "number",  
  "total\_settings": "number",
  "prompt_template_version": "string",
  "langsmith_trace_id": "string (for observability)"  
}  
\`\`\`

\---

\#\#\# 5. Image Key Generation Agent (Stage 5)

\*\*Purpose:\*\* Generates definitive visual reference images for Master Assets.

\*\*System Prompt:\*\*  
\`\`\`  
You are a visual reference generator for film production. Your role is to create precise, detailed image prompts for asset visualization.

ASSET CONTEXT:  
Name: {asset\_name}  
Type: {asset\_type}  
Master Description: {master\_description}

VISUAL STYLE LOCK:
{visual_style_capsule_content}

PROJECT CONSTRAINTS:  
\- Content rating: {content\_rating}  
\- Genre: {genre}

PROMPT CONSTRUCTION RULES:  
1. Start with the asset type and name  
2. Include all physical characteristics from the master description  
3. Specify lighting, angle, and composition suitable for reference  
4. Incorporate visual style cues from the Style Capsule content  
5. Avoid action or narrative elements (this is a reference image, not a scene)

OUTPUT FORMAT:

Generate a single, highly detailed image prompt optimized for Nano Banana API.

**Input Requirements:**

typescript  
{  
  asset: {  
    asset\_id: string;  
    name: string;  
    asset\_type: 'character' | 'prop' | 'location';  
    master\_description: string;  
  };  
  visualStyleCapsule: {
    capsule_id: string;
    capsule_content: {
      descriptors: string[];
      reference_images: string[];
      design_pillars: string[];
    };
  };  
  projectParams: {  
    content\_rating: string;  
    genre: string\[\];  
  };

}

**Output Schema:**

json  
{  
  "image\_prompt": "string (detailed prompt for Nano Banana)",  
  "style\_tags": \["array of style keywords applied"\],  
  "rag\_retrievals\_used": \["array of rag\_documents.id"\],  
  "generation\_params": {  
    "model": "nano-banana",  
    "resolution": "string",  
    "seed": "number (optional)"  
  }

}

---

## **Phase A → Phase B Context Handoff**

### **Global Context Package (Passed to All Phase B Agents)**

typescript  
interface GlobalContextPackage {  
  *// Narrative Foundation*  
  beatSheet: {  
    beats: Array\<{  
      beat\_id: string;  
      order: number;  
      text: string;  
    }\>;  
  };  
    
  masterScript: {  
    formatted\_script: string;  
    scenes: Array\<{  
      scene\_id: string;  
      slug: string;  
      content: string;  
      estimated\_duration\_seconds: number;  
    }\>;  
  };  
    
  *// Visual Foundation*  
  visualStyleLock: {
    capsule_id: string;
    locked_at: timestamp;
  };  
    
  masterAssets: Array\<{  
    asset\_id: string;  
    name: string;  
    asset\_type: 'character' | 'prop' | 'location';  
    master\_description: string;  
    image\_key\_url: string;  
  }\>;  
    
  *// Project Constraints*  
  projectParams: {  
    target\_length\_min: number;  
    target\_length\_max: number;  
    content\_rating: string;  
    genre: string\[\];  
    tonal\_precision: string;  
  };  
    
  *// Version Control*  
  branchMetadata: {  
    branch\_id: string;  
    branch\_name: string;  
    parent\_branch\_id?: string;  
    branched\_at\_stage?: number;  
  };  
}  
\`\`\`

\---

\#\# Phase B: Production Agents (Stages 6-12)

\#\#\# 6\. Shot List Generation Agent (Stage 7\)

\*\*Purpose:\*\* Breaks scene into 8-second atomic shots with technical specifications.

\*\*System Prompt:\*\*  
\`\`\`  
You are a technical shot breakdown specialist. Your role is to translate narrative scenes into precise, time\-bounded shots suitable for AI video generation.

GLOBAL CONTEXT:  
{global\_context\_package}

CURRENT SCENE CONTEXT:  
Scene ID: {scene\_id}  
Scene Slug: {scene\_slug}  
Scene Content: {scene\_content}

PREVIOUS SCENE END\-STATE (LOCAL CONTEXT):  
{previous\_scene\_end\_state}

SHOT BREAKDOWN RULES:  
1\. Each shot must be EXACTLY 8 seconds (or explicitly justified if different)  
2\. Each shot must be ATOMIC (one primary action or dialogue exchange)  
3\. Camera specs must be technically precise (CU, MS, WS, Dolly, Pan, etc.)  
4\. Character prominence must be explicit (Foreground/Background/Off\-screen)

CONTINUITY REQUIREMENTS:  
\- The first shot must visually connect to the previous scene's end state  
\- Character positions and states must be consistent with prior scene endings  
\- Setting must match or explicitly transition

OUTPUT REQUIREMENTS:

Generate a complete shot list for this scene, ensuring narrative coverage and visual continuity.

**Input Requirements:**

typescript  
{  
  globalContext: GlobalContextPackage;  
  currentScene: {  
    scene\_id: string;  
    slug: string;  
    content: string;  
    beat\_ids\_covered: string\[\];  
  };  
  previousSceneEndState: {  
    scene\_id: string;  
    final\_action: string;  
    final\_dialogue: string;  
    character\_positions: Array\<{  
      character\_name: string;  
      position: string;  
      state: string;  
    }\>;  
    setting: string;  
    end\_frame\_id?: string;  
  } | null;

}

**Output Schema:**

json  
{  
  "scene\_id": "string (uuid)",  
  "shots": \[  
    {  
      "shot\_id": "string (e.g., '3A')",  
      "shot\_order": "number",  
      "duration": 8,  
      "dialogue": "string (exact lines) or null",  
      "action": "string (atomic physical description)",  
      "characters": \[  
        {  
          "name": "string",  
          "prominence": "foreground | background | off-screen"  
        }  
      \],  
      "setting": "string (specific location within scene)",  
      "camera": "string (technical spec: 'CU \- Dolly In (Slow)')",  
      "continuity\_flags": \["array of strings (e.g., 'character\_entry', 'prop\_handoff')"\],  
      "beat\_reference": "string (beat\_id if applicable)"  
    }  
  \],  
  "total\_estimated\_duration": "number",  
  "continuity\_notes": "string" (how this scene connects to prior/next),
  "prompt_template_version": "string",
  "langsmith_trace_id": "string (for observability)"  
}  
\`\`\`

\---

\#\#\# 7. Shot Split Agent (Stage 7 \- Iterative Tool)

\*\*Purpose:\*\* Intelligently splits a single shot into two coherent shots.

\*\*System Prompt:\*\*  
\`\`\`  
You are a shot segmentation specialist. Your role is to divide a single 8\-second shot into two new shots while preserving narrative coherence.

ORIGINAL SHOT CONTEXT:  
{original\_shot\_json}

SPLIT REQUIREMENTS:  
1. The two new shots must collectively cover the same narrative content as the original  
2. Duration must sum to the original (typically 4s \+ 4s or 5s \+ 3s)  
3. The split point must be a natural action or dialogue break  
4. Camera specs must be adjusted appropriately for each new shot  
5. Continuity flags must be preserved or refined

OUTPUT:

Generate two new shot objects that replace the original shot.

**Input Requirements:**

typescript  
{  
  originalShot: {  
    shot\_id: string;  
    duration: number;  
    dialogue: string;  
    action: string;  
    characters: Array\<{name: string; prominence: string}\>;  
    setting: string;  
    camera: string;  
    continuity\_flags: string\[\];  
  };  
  userGuidance?: string; *// Optional: "Split at the moment John stands up"*

}

**Output Schema:**

json  
{  
  "new\_shots": \[  
    {  
      "shot\_id": "string (e.g., '3A-1')",  
      "shot\_order": "number",  
      "duration": "number (e.g., 4)",  
      "dialogue": "string or null",  
      "action": "string",  
      "characters": \[{...}\],  
      "setting": "string",  
      "camera": "string",  
      "continuity\_flags": \["array"\],  
      "split\_rationale": "string (why the split occurred here)"  
    },  
    {  
      "shot\_id": "string (e.g., '3A-2')",  
      "shot\_order": "number",  
      "duration": "number (e.g., 4)",  
      "dialogue": "string or null",  
      "action": "string",  
      "characters": \[{...}\],  
      "setting": "string",  
      "camera": "string",  
      "continuity\_flags": \["array"\],  
      "split\_rationale": "string"  
    }  
  \]  
}  
\`\`\`

\---

\#\#\# 8. Scene Asset Relevance Agent (Stage 8)

\*\*Purpose:\*\* Identifies which Master Assets are relevant to the current scene and determines their starting state.

\*\*System Prompt:\*\*  
\`\`\`  
You are an asset continuity manager. Your role is to determine which Master Assets appear in the current scene and define their starting visual state.

GLOBAL CONTEXT:  
{global\_context\_package}

CURRENT SCENE CONTEXT:  
{current\_scene\_shot\_list}

PREVIOUS SCENE END-STATE:  
{previous\_scene\_asset\_instances}

RELEVANCE RULES:  
1. Extract all characters explicitly mentioned in the shot list  
2. Extract all props explicitly mentioned or implied by action  
3. Extract all settings/locations mentioned

STATE INHERITANCE RULES:  
1. If an asset appeared in the previous scene, inherit its END state  
2. If an asset is new to this scene, inherit from Master Asset definition  
3. Flag any assets requiring explicit state modification

OUTPUT REQUIREMENTS:

Generate a complete list of relevant assets with their starting states for this scene.

**Input Requirements:**

typescript  
{  
  globalContext: GlobalContextPackage;  
  currentScene: {  
    scene\_id: string;  
    shotList: Array\<{  
      shot\_id: string;  
      characters: Array\<{name: string}\>;  
      setting: string;  
      action: string;  
    }\>;  
  };  
  previousSceneAssetInstances: Array\<{  
    asset\_id: string;  
    name: string;  
    asset\_type: string;  
    description\_override: string | null;  
    status\_tags: string\[\];  
    end\_state\_summary: string;  
  }\> | null;

}

**Output Schema:**

json  
{  
  "scene\_id": "string",  
  "relevant\_assets": \[  
    {  
      "project\_asset\_id": "string (references master asset)",  
      "name": "string",  
      "asset\_type": "character | prop | location",  
      "inherited\_from": "master | previous\_scene\_instance",  
      "starting\_description": "string (inherited or modified)",  
      "requires\_visual\_update": "boolean",  
      "status\_tags\_inherited": \["array of strings"\],  
      "relevance\_rationale": "string (why this asset is needed)"  
    }  
  \],  
  "new\_assets\_required": \[  
    {  
      "name": "string",  
      "asset\_type": "character | prop | location",  
      "description": "string (inferred from shot list)",  
      "justification": "string (why this is needed)"  
    }  
  \]  
}  
\`\`\`

\---

\#\#\# 9. Scene Asset Visual State Generator (Stage 8)

\*\*Purpose:\*\* Generates updated image keys for assets with modified states in the current scene.

\*\*System Prompt:\*\*  
\`\`\`  
You are a visual state evolution specialist. Your role is to generate image prompts for assets whose appearance has changed from their previous state.

GLOBAL CONTEXT:  
{global\_context\_package}

ASSET CONTEXT:  
Name: {asset\_name}  
Type: {asset\_type}  
Previous State: {previous\_description}  
Current Scene Modifications: {user\_modifications}

VISUAL STYLE LOCK:
{visual_style_capsule_content}

EVOLUTION RULES:  
1. The new image must be visually consistent with the Master Asset (same character identity)  
2. Apply only the scene-specific modifications (e.g., add mud, change clothing)  
3. Maintain visual style coherence with the selected Visual Style Capsule

OUTPUT:

Generate a precise image prompt for Nano Banana that captures the modified state.

**Input Requirements:**

typescript  
{  
  globalContext: GlobalContextPackage;  
  asset: {  
    project\_asset\_id: string;  
    name: string;  
    asset\_type: string;  
    master\_description: string;  
    previous\_scene\_description?: string;  
    current\_scene\_modifications: string; *// User-provided text*  
  };  
  visualStyleCapsule: {
    capsule_id: string;
    capsule_content: {
      descriptors: string[];
      reference_images: string[];
      design_pillars: string[];
    };
  };

}

**Output Schema:**

json  
{  
  "image\_prompt": "string (detailed prompt)",  
  "description\_override": "string (updated description for this scene instance)",  
  "status\_tags": \["array of strings (e.g., 'muddy', 'torn\_shirt')"\],  
  "carry\_forward": "boolean (should these tags persist to next scene?)",  
  "rag\_retrievals\_used": \["array of rag\_documents.id"\]  
}  
\`\`\`

\---

\#\#\# 10. Frame Prompt Assembly Agent (Stage 9)

\*\*Purpose:\*\* Synthesizes shot data and asset data into frame generation prompts.

\*\*System Prompt:\*\*  
\`\`\`  
You are a frame prompt architect. Your role is to create highly detailed image prompts for anchor frame generation.

GLOBAL CONTEXT:  
{global\_context\_package}

SHOT CONTEXT:  
{shot\_json}

ASSET CONTEXT:  
{scene\_asset\_instances}

FRAME TYPE: {frame\_type (start | end)}

PROMPT CONSTRUCTION RULES:  
1. Start with camera specification  
2. Describe spatial layout of characters and setting  
3. Incorporate asset visual descriptions verbatim  
4. Include action context only if relevant to the static frame  
5. Apply Visual Style Capsule cues

CONTINUITY REQUIREMENTS (for START frames):  
\- Reference the previous shot's end frame (if available)  
\- Ensure character positions are consistent

EVOLUTION REQUIREMENTS (for END frames):  
\- Describe the visual outcome of the shot's action  
\- Infer reasonable end positions and states

OUTPUT:

Generate a single, comprehensive frame prompt.

**Input Requirements:**

typescript  
{  
  globalContext: GlobalContextPackage;  
  shot: {  
    shot\_id: string;  
    dialogue: string | null;  
    action: string;  
    characters: Array\<{name: string; prominence: string}\>;  
    setting: string;  
    camera: string;  
  };  
  sceneAssetInstances: Array\<{  
    name: string;  
    asset\_type: string;  
    description\_override: string;  
    status\_tags: string\[\];  
  }\>;  
  frameType: 'start' | 'end';  
  previousFrameReference?: {  
    frame\_id: string;  
    image\_url: string;  
  };  
  visualStyleCapsule: {
    capsule_id: string;
    capsule_content: {
      descriptors: string[];
      reference_images: string[];
      design_pillars: string[];
    };
  };

}

**Output Schema:**

json  
{  
  "frame\_prompt": "string (complete prompt for Nano Banana)",  
  "prompt\_components": {  
    "camera": "string",  
    "spatial\_layout": "string",  
    "character\_descriptions": \["array of strings"\],  
    "setting\_description": "string",  
    "style\_cues": \["array of strings"\]  
  },  
  "rag\_retrievals\_used": \["array of rag\_documents.id"\],  
  "continuity\_references": \["array of frame\_ids or asset\_ids"\]
  "prompt_template_version": "string",
  "langsmith_trace_id": "string (for observability)"  
}  
\`\`\`

\---

\#\#\# 11. Video Prompt Assembly Agent (Stage 9)

\*\*Purpose:\*\* Creates video generation prompts focused on motion, dialogue, and audio.

\*\*System Prompt:\*\*  
\`\`\`  
You are a video prompt specialist. Your role is to create motion and audio-focused prompts for video generation.

CRITICAL DIRECTIVE: MINIMAL VISUAL DESCRIPTION  
The visual appearance is already encoded in the start and end frames. Your prompt must focus EXCLUSIVELY on:  
1. Motion and action dynamics  
2. Dialogue delivery (exact lines, accent, emotion)  
3. Sound effects  
4. Timing and pacing

GLOBAL CONTEXT:  
{global\_context\_package}

SHOT CONTEXT:  
{shot\_json}

FRAME CONTEXT:  
Start Frame: {start\_frame\_id}  
End Frame: {end\_frame\_id}

PROMPT CONSTRUCTION RULES:  
1. Begin with "Audio:" section specifying dialogue and SFX  
2. Follow with action dynamics (how characters move, not what they look like)  
3. Include timing cues (e.g., "pause for 2 seconds")  
4. NEVER restate visual descriptions already in the frames

OUTPUT:

Generate a Veo3-optimized video prompt.

**Input Requirements:**

typescript  
{  
  globalContext: GlobalContextPackage;  
  shot: {  
    shot\_id: string;  
    dialogue: string | null;  
    action: string;  
    characters: Array\<{name: string}\>;  
    duration: number;  
  };  
  frameReferences: {  
    start\_frame\_id: string;  
    end\_frame\_id: string | null; *// null if start-frame-only*  
  };

}

**Output Schema:**

json  
{  
  "video\_prompt": "string (formatted for Veo3)",  
  "prompt\_structure": {  
    "audio\_section": "string (dialogue \+ SFX)",  
    "motion\_section": "string (action dynamics)",  
    "timing\_cues": \["array of strings"\]  
  },  
  "estimated\_tokens": "number",  
  "model\_compatibility": \["veo3", "sora", etc.\]  
}  
\`\`\`

\---

\#\#\# 12. Continuity Drift Detector Agent (Stage 10)

\*\*Purpose:\*\* Analyzes generated frames for visual continuity breaks.

\*\*System Prompt:\*\*  
\`\`\`  
You are a visual continuity analyst. Your role is to detect inconsistencies between consecutive frames.

COMPARISON CONTEXT:  
Previous Frame: {previous\_frame\_url}  
Current Frame: {current\_frame\_url}

SHOT CONTEXT:  
{shot\_json}

EXPECTED CONSISTENCY:  
\- Character appearance (clothing, hair, facial features)  
\- Setting elements (furniture, lighting, background)  
\- Props (presence, position)

DETECTION RULES:  
1. Flag major inconsistencies (different character appearance, missing props)  
2. Tolerate minor variations (lighting shifts, slight position changes)  
3. Provide specific descriptions of detected issues

OUTPUT:

Generate a continuity report with actionable feedback.

**Input Requirements:**

typescript  
{  
  previousFrame: {  
    frame\_id: string;  
    image\_url: string;  
    shot\_id: string;  
  };  
  currentFrame: {  
    frame\_id: string;  
    image\_url: string;  
    shot\_id: string;  
  };  
  shot: {  
    shot\_id: string;  
    characters: Array\<{name: string}\>;  
    setting: string;  
    action: string;  
  };

}

**Output Schema:**

json  
{  
  "continuity\_status": "safe | risky | broken",  
  "issues\_detected": \[  
    {  
      "issue\_type": "character\_appearance | prop\_missing | setting\_mismatch | spatial\_inconsistency",  
      "severity": "critical | moderate | minor",  
      "description": "string (specific issue)",  
      "suggested\_fix": "string (e.g., 'Regenerate frame with explicit shirt color')"  
    }  
  \],  
  "overall\_assessment": "string (narrative summary)"  
}  
\`\`\`

\---

\#\# Context Propagation Architecture

\#\#\# Phase A Context Flow (Stages 1 → 5)  
\`\`\`  
Stage 1: User Input \+ Project Params  
    ↓  
    \[Treatment Expansion Agent\]  
    ↓  
Stage 2: Treatment Prose (3 variants)  
    ↓ (User selects variant \+ iterates)  
    \[Beat Extraction Agent\]  
    ↓  
Stage 3: Beat Sheet (15-30 beats)  
    ↓ (User confirms structure)  
    \[Script Generation Agent\]  
    ↓  
Stage 4: Master Script (scenes \+ dialogue \+ action)  
    ↓ (User approves script)  
    \[Asset Extraction Agent\]  
    ↓  
Stage 5: Master Assets List  
    ↓ (for each asset)  
    \[Image Key Generation Agent\]  
    ↓  
Stage 5: Locked Master Assets (with image keys)  
    ↓  
    \[GLOBAL CONTEXT PACKAGE ASSEMBLED\]  
    ↓  
PHASE B ENTRY  
\`\`\`

\#\#\# Phase B Context Flow (Per Scene, Stages 6 → 12)  
\`\`\`  
GLOBAL CONTEXT (immutable during Phase B)  
    ↓  
Stage 6: User selects Scene N  
    ↓  
    \[Shot List Generation Agent\]  
    ↓ (receives Global Context \+ Scene N content \+ Scene N\-1 end state)  
Stage 7: Shot List (atomic 8s shots)  
    ↓ (User locks shot list)  
    \[Scene Asset Relevance Agent\]  
    ↓  
Stage 8: Relevant Assets Identified  
    ↓ (User modifies descriptions as needed)  
    \[Scene Asset Visual State Generator\]  
    ↓  
Stage 8: Scene Asset Instances (with image keys)  
    ↓  
    \[Frame Prompt Assembly Agent\] \+ \[Video Prompt Assembly Agent\]  
    ↓  
Stage 9: Prompt Set (frame prompts \+ video prompts)  
    ↓ (User reviews/edits)  
    \[Frame Generation via Nano Banana\]  
    ↓  
Stage 10: Start Frames \+ End Frames  
    ↓ (User approves frames)  
    \[Continuity Drift Detector Agent\]  
    ↓  
Stage 10: Continuity Validated  
    ↓  
Stage 11: User confirms scene \+ cost  
    ↓  
    \[Video Generation via Veo3\]  
    ↓  
Stage 12: Final Video  
    ↓  
    \[User reviews\]  
    ↓  
SCENE N COMPLETE → Scene N end state saved  
    ↓

(Loop back to Stage 6 for Scene N+1, passing Scene N end state as "previous scene")

### **Scene-to-Scene Context Handoff**

**Critical Data Passed from Scene N to Scene N+1:**

typescript  
interface SceneEndState {  
  scene\_id: string;  
  scene\_number: number;  
    
  *// Narrative Context*  
  final\_shot: {  
    shot\_id: string;  
    action: string;  
    dialogue: string | null;  
  };  
    
  *// Visual Context*  
  end\_frame\_id: string; *// The last approved frame of the scene*  
  end\_frame\_url: string;  
    
  *// Asset States*  
  asset\_instances: Array\<{

    project\_asset\_id: string; 

    name: string; 

    asset\_type: string; 

    description\_override: string; 

     status\_tags: string\[\]; 

     carry\_forward: boolean; 

  }\>;

// Spatial Context 

  character\_positions: Array\<{ 

    character\_name: string; 

     position: string; // e.g., "standing by window" 

     state: string; // e.g., "facing door" 

   }\>;

  setting: string; // The final location of the scene 

}

\*\*How Agents Use Scene End State:\*\*

1\. \*\*Shot List Generation Agent (Stage 7):\*\* Uses \`end\_frame\_url\` and \`character\_positions\` to ensure the first shot of Scene N+1 visually connects to Scene N's ending.

2\. \*\*Scene Asset Relevance Agent (Stage 8):\*\* Uses \`asset\_instances\` to determine which assets should inherit their state from Scene N vs. revert to Master Asset definitions.

3\. \*\*Frame Prompt Assembly Agent (Stage 9):\*\* Uses \`end\_frame\_url\` as a visual reference when generating the START frame of Scene N+1's first shot.

\---

\#\# Retroactive Edit Flows

\#\#\# Scenario 1: Edit Beat Sheet (Stage 3\) After Script is Generated (Stage 4\)

\*\*Trigger:\*\* User manually edits beat text in Stage 3 after Stage 4 has been approved.

\*\*System Behavior:\*\*

1\. \*\*Flag Propagation:\*\*  
   \- Stage 3 UI displays: "Not Up-to-Date with Current Script"  
   \- Stage 4 UI displays: "Not Up-to-Date with Current Beat Sheet"

2\. \*\*User Options:\*\*

   \*\*Option A: Retroactively Revise Script (Stage 4 → Stage 3 sync)\*\*

User clicks "Retroactively Revise Script" in Stage 4 

↓

 \[Script Generation Agent re-runs\] 

\- Input: Edited Beat Sheet (from Stage 3\)

 \- Input: Global Context (Stage 1-2)

 \- Output: New Stage 4 script version 

↓

 New stage\_states row created (version incremented, same branch) 

Flag in Stage 3 clears

   \*\*Option B: Retroactively Revise Beat Sheet (Stage 3 → Stage 4 sync)\*\*

User clicks "Retroactively Revise Beat Sheet" in Stage 3

 ↓

 \[Beat Extraction Agent re-runs\] 

\- Input: Current Stage 4 Script 

\- Output: Updated Beat Sheet 

↓ 

New stage\_states row created for Stage 3 (version incremented)

 Flag in Stage 4 clears

\*\*Database Logic:\*\*  
\`\`\`sql  
\-- When Beat Sheet is edited  
UPDATE stage\_states  
SET content \= jsonb\_set(content, '{sync\_status}', '"out\_of\_date\_with\_script"')  
WHERE stage\_number \= 3 AND branch\_id \= :current\_branch;

\-- When Script is regenerated from edited beats  
INSERT INTO branches (project\_id, name, parent\_branch\_id, branched\_at\_stage, commit\_message)  
VALUES (:project\_id, :new\_branch\_name, :current\_branch\_id, 4, :user\_commit\_message);

\-- Mark all Phase B stages on new branch as invalidated  
INSERT INTO invalidation\_logs (triggering\_stage\_state\_id, branch\_id, invalidation\_type)  
VALUES (:new\_stage\_4\_id, :new\_branch\_id, 'global');  
\`\`\`

\---

\#\#\# Scenario 2: Regenerate Master Script (Stage 4\) from Edited Beat Sheet

\*\*Trigger:\*\* User edits Beat Sheet (Stage 3), then clicks "Regenerate Master Script" (Stage 4).

\*\*System Behavior:\*\*

1\. \*\*Mandatory Branching:\*\*

System detects: Stage 3 edited \+ Stage 4 regeneration requested 

↓

 FORCE branch creation modal 

\- User must provide branch name

 \- User must provide commit message 

↓

 New branch created

 ↓

 \[Script Generation Agent runs on NEW branch\] 

\- Input: Edited Beat Sheet 

\- Output: New Master Script 

↓

 All Phase B stages (5-12) on new branch marked as 'invalidated'

2\. \*\*Cost Warning:\*\*

System calculates estimated regeneration cost: 

\- Frame regeneration: (shot\_count \* 2 \* nano\_banana\_cost)

 \- Video regeneration: (shot\_count \* veo3\_cost)

 ↓

 Display modal: "This will invalidate all Phase B work. Estimated cost: $XXX. Proceed?"

\*\*Database Logic:\*\*  
\`\`\`sql  
\-- Create new branch  
INSERT INTO branches (project\_id, name, parent\_branch\_id, branched\_at\_stage)  
VALUES (:project\_id, :branch\_name, :current\_branch\_id, 4);

\-- Copy Stage 1-3 states to new branch  
INSERT INTO stage\_states (branch\_id, stage\_number, content, inherited\_from\_stage\_id)  
SELECT :new\_branch\_id, stage\_number, content, id  
FROM stage\_states  
WHERE branch\_id \= :current\_branch\_id AND stage\_number BETWEEN 1 AND 3;

\-- Generate new Stage 4 on new branch  
INSERT INTO stage\_states (branch\_id, stage\_number, content)  
VALUES (:new\_branch\_id, 4, :new\_script\_json);

\-- Mark Phase B as invalidated  
UPDATE stage\_states  
SET status \= 'invalidated'  
WHERE branch\_id \= :new\_branch\_id AND stage\_number BETWEEN 5 AND 12;  
\`\`\`

\---

\#\#\# Scenario 3: Edit Shot List (Stage 7\) Mid-Production

\*\*Trigger:\*\* User edits Shot List in Scene N after frames/video have been generated.

\*\*System Behavior:\*\*

1\. \*\*Local Invalidation:\*\*

User edits Shot List (Stage 7\) for Scene N 

↓

 System marks: \- Scene N: Stage 8-12 → 'outdated' 

\- All scenes after N → 'continuity\_broken'

 ↓

 Cost estimation triggered: 

\- Recalculate frame costs for Scene N 

\- Warn about downstream scene impacts

2\. \*\*Cascading Continuity Break:\*\*  
\`\`\`sql  
   \-- Mark current scene as outdated  
   UPDATE scenes  
   SET status \= 'outdated'  
   WHERE id \= :scene\_n\_id;  
     
   \-- Mark downstream scenes as continuity broken  
   UPDATE scenes  
   SET status \= 'continuity\_broken'  
   WHERE branch\_id \= :current\_branch\_id  
     AND scene\_number \> :scene\_n\_number;  
\`\`\`

3\. \*\*Agent Re-Execution:\*\*

User proceeds with edit 

↓

 \[Scene Asset Relevance Agent re-runs\] 

\- Input: New Shot List 

\- Output: Updated asset relevance list 

↓

 \[Scene Asset Visual State Generator re-runs\] 

\- Input: Modified asset descriptions (if any) 

\- Output: New scene asset instances 

↓

 \[Frame Prompt Assembly Agent re-runs\]

 \- Input: New shot list \+ new asset instances

 \- Output: New frame prompts

 ↓

 User regenerates frames (Stage 10\)

\---

\#\#\# Scenario 4: Regenerate Frame (Stage 10\) Mid-Scene

\*\*Trigger:\*\* User regenerates a single frame (start or end) in Scene N.

\*\*System Behavior:\*\*

1\. \*\*Shot-Level Invalidation:\*\*

User regenerates Start Frame for Shot 3B

 ↓ 

System marks: 

\- Shot 3B video → 'outdated' 

\- All downstream shots in Scene N → 'outdated' (due to continuity dependency) 

\- Scene N status → 'frames\_locked' downgraded to 'draft'

2\. \*\*Downstream Continuity Break:\*\*  
\`\`\`sql  
   \-- Update scene status  
   UPDATE scenes  
   SET status \= 'draft', end\_frame\_id \= NULL  
   WHERE id \= :scene\_n\_id;  
     
   \-- Mark videos as outdated  
   UPDATE videos  
   SET status \= 'outdated'  
   WHERE shot\_id IN (  
       SELECT id FROM shots WHERE scene\_id \= :scene\_n\_id AND shot\_order \>= :affected\_shot\_order  
   );  
     
   \-- Mark next scene as continuity broken  
   UPDATE scenes  
   SET status \= 'continuity\_broken'  
   WHERE branch\_id \= :current\_branch\_id  
     AND scene\_number \= :scene\_n\_number \+ 1;  
\`\`\`

3\. \*\*Re-Propagation:\*\*

User approves new Start Frame 

↓

 \[Continuity Drift Detector Agent runs\] 

\- Compares new frame to previous shot's end frame

 \- Flags any issues

 ↓

 If no issues: 

\- Shot 3B marked 'ready\_for\_video' 

\- Downstream shots remain 'outdated' (user must regenerate sequentially)

\---

\#\#\# Context Re-Assembly Logic for Retroactive Edits

\*\*General Pattern:\*\*

When an upstream stage is edited, all downstream agents must re-run with \*\*updated context packages\*\*.

\*\*Example: Beat Sheet Edit → Script Regeneration\*\*  
\`\`\`typescript  
// Original context flow  
Stage 1 → Stage 2 → Stage 3 (original beats) → Stage 4 (original script)

// After retroactive edit  
Stage 1 → Stage 2 → Stage 3 (EDITED beats) → \[Script Generation Agent re-runs\]

// Agent input assembly  
{  
  beatSheet: {  
    beats: \[...\], // EDITED BEATS from new Stage 3 version  
    version: 2    // Incremented version  
  },  
  projectParams: {...}, // Unchanged from Stage 1  
  writingStyleCapsule: {...}, // Unchanged  
  previousScriptVersion: {...} // Optional: for comparison/guidance  
}  
\`\`\`

\*\*Example: Shot List Edit → Frame Regeneration\*\*  
\`\`\`typescript  
// Original context flow  
Global Context → Scene N Script → Stage 7 (original shot list) → Stage 9 (frame prompts)

// After retroactive edit  
Global Context → Scene N Script → Stage 7 (EDITED shot list) → \[Frame Prompt Assembly Agent re-runs\]

// Agent input assembly  
{  
  globalContext: {...}, // Unchanged  
  shot: {  
    shot\_id: "3B",  
    dialogue: "...", // EDITED  
    action: "...",   // EDITED  
    characters: \[...\], // EDITED  
    camera: "...",   // EDITED  
    // ... other fields  
  },  
  sceneAssetInstances: \[...\], // May need re-evaluation by Asset Relevance Agent  
  frameType: 'start',  
  previousFrameReference: {...} // From prior shot (unchanged unless cascading edit)  
}  
\`\`\`

\---

\#\# Summary: Key Architectural Principles

\#\#\# 1\. \*\*Global-to-Local Inheritance\*\*  
\- Phase A establishes \*\*immutable global truth\*\* (narrative, assets, style)  
\- Phase B agents \*\*inherit from global context\*\* and add \*\*scene-local specificity\*\*  
\- Edits in Phase A trigger \*\*global invalidation\*\* (new branches required)  
\- Edits in Phase B trigger \*\*local invalidation\*\* (current scene \+ downstream scenes)

\#\#\# 2\. \*\*Explicit Context Packages\*\*  
\- Every agent receives a \*\*typed, versioned context object\*\*  
\- Context is assembled \*\*deterministically\*\* from database state  
\- No agent "remembers" prior outputs (all context is explicitly passed)

\#\#\# 3\. \*\*Cascading Invalidation\*\*  
\- Upstream edits invalidate downstream artifacts  
\- Invalidation is \*\*logged, not destructive\*\* (old versions remain accessible)  
\- Cost estimation occurs \*\*before commitment\*\*

\#\#\# 4\. \*\*Scene-to-Scene Continuity\*\*  
\- Scene N's \*\*end state\*\* becomes Scene N+1's \*\*starting context\*\*  
\- Asset states, character positions, and visual references propagate automatically  
\- Continuity breaks are \*\*detected and flagged\*\*, not silently ignored

\#\#\# 5\. \*\*Branching for Structural Changes\*\*  
\- High-impact edits (Script regeneration from edited Beats) \*\*force branching\*\*  
\- Branches preserve \*\*parallel creative timelines\*\*  
\- Users can \*\*switch between branches\*\* without data loss

This architecture ensures that every agent has the \*\*exact context it needs\*\*, that context flows \*\*deterministically\*\* from stage to stage, and that retroactive edits are \*\*auditable and reversible\*\*.