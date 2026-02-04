
### **4.5 Stage 10: Frame Generation (The Anchors & Continuity)**

**Input:** Final Frame Prompts (Stage 9@\) + Rearview Mirror Data (Previous Scene's End Frame). **Tool:** Google Gemini API (Flash-1 model). **Process:** Generates start/end anchor frames per 8-second shot using real image generation service.

1. **Start Frame Generation:** Must use the Prompt AND the previous shot's End Frame (from the Rearview Mirror) as a visual seed/reference to ensure continuity. (Though the shot maybe totally different than the last clip)  
2. **End Frame Generation:** Uses the Prompt and predicts the visual outcome 8 seconds later.
(*Note: Some AI Gen systems don't require an End Frame, so as mention in Section 9, there must be a way to switch to only needing the starting frame.*)

**Critical Continuity Requirements:**

* **Rearview Mirror (Visual):** The UI must prominently display the **Final Frame** of the prior shot for visual comparison against the new **Start Frame**.  
* **Inpainting/Region Editing:** If the Start Frame does not match the prior End Frame, the user can select a region (e.g., the character's face) and use a localized text prompt (e.g., "Change expression from surprise to neutral") to fix the continuity break without regenerating the entire image.  
* **Iterative Refinement:** Full regeneration of a frame is possible but requires the "Regeneration Guidance" box (Section 5.3).


## **9.5 Stage 10: Frame Generation (Anchors & Continuity)**

### **Purpose**

Stage 10 establishes visual truth by generating and validating anchor frames used for downstream video generation.

### **Mode Selection (Mandatory)**

Before generation, users select one of the following:

**Quick Mode (Speed-Optimized):**

* Bulk generates all required frames  
* Faster but potentially wasteful

**Control Mode (Cost-Optimized):**

* Sequential generation  
* Start frame must be approved before end frame generation  
* Ensures dependency correctness

**Optional Toggle:** Start-frame-only generation for models that do not require end frames

### **UI/UX Definition**

**Common Components:**

* Shot frame panel with status indicators  
* Visual rearview mirror with ghost and flicker comparison

**Quick Mode UI:**

* Grid-based generation view  
* Progress tracking  
* Bulk review and correction tools

**Control Mode UI:**

* Step-by-step shot progression  
* Explicit approve-before-advance workflow

### **Mid-Scene Visual Evolution**

End frame prompts incorporate:

* Action context  
* Prior frame reference  
* Descriptions of visual changes resulting from action

### **Agentic Tooling**

* **Frame Dependency Manager:** Enforces correct frame chaining  
* **Region-Level Inpainting Agent:** Allows localized corrections  
* **Continuity Drift Detector:** Flags visual inconsistencies
