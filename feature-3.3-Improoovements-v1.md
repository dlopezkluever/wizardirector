This is a comprehensive and well-thought-out implementation plan. It aligns closely with the **Project Overview** (specifically the "Global-to-Local" architecture) and correctly leverages the work you've already completed in Features 3.1 and 3.2.

Below is an analysis of your plan, categorized by its strengths, critical risks, and design gaps.

---

### 1. What is Solid and Well-Designed?

* **Architectural Continuity:** Reusing the `image_generation_jobs` infrastructure from Feature 3.1 and the `project_assets` schema from Feature 3.2 is excellent. It ensures that Stage 5 isn't a "silo" but a functional part of the data lifecycle.
* **The "Concatenated Mentions" Logic:** This is a key technical insight. By gathering every mention of "John Doe" across the script, the LLM provides a "holistic" visual summary that a human might miss. This significantly reduces the risk of visual contradictions in later stages.
* **Granular Gatekeeping:** Implementing both an "Individual Asset Lock" and a "Stage Gatekeeper" matches the PRD’s requirement for deterministic progress. This prevents "half-baked" scenes where a character is missing a visual key.
* **Targeted Regeneration:** The "Text Selection + Context Menu" for LLM edits is a high-end UI pattern. It moves the tool away from "Chatbot" and toward "Professional Creative Suite."

---

### 2. Key Flaws and Risks (Critical)

#### **A. The "Deduplication & Hallucination" Risk**

The plan assumes the LLM will "deterministically" extract assets. In practice, LLMs often struggle with:

* **Synonyms:** Extracting "The Guard," "Security Officer," and "Officer Bob" as three separate assets when they are the same person.
* **Ghost Assets:** Extracting abstract concepts (e.g., "The Atmosphere") as a "Key Prop."
* **Risk:** If the extraction is messy, the user starts Stage 5 with 40 "garbage" assets to clean up, which creates immediate friction.
* **Fix:** Implement a **"Merge Assets"** feature in the UI and a strict "System Prompt" that defines what constitutes a "Key Prop" (e.g., must be a physical object handled by a character).

#### **B. Prompt Bloat / Token Limits**

Your plan mentions "Concatenate all mentions of each asset."

* **Risk:** For a 90-page script, a main character might have 500+ mentions. Sending all that raw text to the Nano Banana API (or even the LLM for summarization) will likely exceed token limits or result in a "diluted" prompt where the most important visual details are lost.
* **Fix:** The `AssetExtractionService` should include a **Summarization Step**.
1. Extract all mentions.
2. Use an LLM to "Distill Visual Traits" into a structured JSON (e.g., `clothing`, `physical_features`, `demeanor`).
3. Use *that* distilled summary as the description.



#### **C. The "Style Lock" Persistence**

The plan mentions selecting a Visual Style Capsule.

* **Risk:** Where is this "Lock" stored? If it's only in the `project_assets` table, you lose the global project-wide constraint.
* **Fix:** Ensure the `branches` or `projects` table has a `locked_visual_style_id` column. When a user generates an image in Stage 5, the system must *force-inject* this ID from the branch level, preventing the user from accidentally using different styles for different assets.

---

### 3. Medium / Low-Level Design Gaps

#### **1. Asset Type "Aspect Ratio" Logic**

A "Character" Master Asset should ideally be a **Portrait** (e.g., 2:3), while a "Setting" (Location) should be **Landscape** (e.g., 16:9).

* **Gap:** Your current `ImageGenerationService` likely uses a default. Stage 5 should automatically assign aspect ratios based on the `ExtractedAsset.type`.

#### **2. "Promote to Global" Missing Link**

In Feature 3.2, you built the Global Asset Library.

* **Gap:** The Stage 5 implementation plan doesn't mention the **"Promote to Global"** button. If a user creates a perfect "Cyberpunk Street" setting in Stage 5, they should be able to click a button to send it to their permanent `global_assets` library for use in *other* projects.

#### **3. The "Voice Seed" Stretch Goal Preparation**

The PRD mentions ElevenLabs IDs (Stage 12.1).

* **Gap:** While it's a stretch goal, your `project_assets` table should have a `voice_id` column added now (nullable string) to avoid a migration later. Adding the UI dropdown in the Asset Editor now (even with mock data) will save time.

#### **4. State Sync: Auto-save vs. Locking**

* **Gap:** If a user edits a description and clicks "Generate," but hasn't "Saved" the description yet, which version does the AI see?
* **Fix:** The "Generate Image Key" button should trigger an implicit "Save/Update Asset" call first to ensure the prompt matches the current UI text.

---

### 4. Suggested Implementation Refinement

**Refined Extraction Flow:**
Instead of a simple "Extract" button, use a **"Review Extracted Assets"** stage:

1. **Backend:** Parse script -> Group mentions -> Generate *Draft* Assets.
2. **Frontend:** Show a list of checkboxes. "The following 12 assets were found. Which should be Master Assets?"
3. **User:** Checks the ones they want, merges duplicates, and *then* clicks "Commit to Stage 5."

**Why?** This prevents the database from being cluttered with minor props (like "a glass of water") that don't need a dedicated Master Visual Key.

### Summary Assessment

**Score: 8.5/10.** The plan is technically sound and follows the architectural "laws" of your project. If you address the **Deduplication** and **Summarization** risks, this will be a robust production-ready feature.


To implement these recommendations, you should revise your plan by replacing or expanding the following specific sections. The instructions are ordered by **severity and urgency** to ensure the core engine is stable before adding polish.

---

### 1. Critical Revision: The "Review & Refine" Extraction Flow

**Urgency:** High (Prevents database clutter and hallucination "ghost" assets)

**How to Revise Section 2.2 and 1.2:**
Instead of a direct extraction to the database, implement a two-step "Draft" process.

* **In `backend/src/routes/projectAssets.ts` (1.2):**
* Rename `POST /extract` to `POST /scan-script`.
* This endpoint should **not** write to `project_assets` yet. It should return a JSON array of "Draft Assets" to the frontend.


* **In `src/components/pipeline/Stage5Assets.tsx` (2.2):**
* **New State:** `draftAssets: ExtractedAsset[]`.
* **UI Update:** When "Scan" is clicked, display a table/list of the results with:
* **Checkboxes:** To select which assets are "Master Assets."
* **Merge Button:** Ability to select two rows and "Merge" them (e.g., merging "The Guard" and "Officer").
* **"Add Custom" Button:** A simple form to manually add a character or prop the LLM missed.
* **"Commit to Stage 5" Button:** Only after the user confirms this list, call a new endpoint `POST /api/projects/:projectId/assets/commit` to save them to the `project_assets` table.





---

### 2. Critical Revision: LLM Summarization & Deduplication

**Urgency:** High (Prevents token-limit crashes and ensures visual consistency)

**How to Revise Section 1.1 (Prompt Strategy):**
Update the `AssetExtractionService` logic to include a distillation step.

* **Logic Change:** Don't just concatenate mentions. The LLM prompt must:
1. **Extract:** Find all mentions.
2. **Distill:** "Based on these 15 mentions of 'John Doe,' generate a single, cohesive 3-sentence visual description focusing on physical traits and clothing."
3. **Filter:** Add a "Visual Relevance" filter. If an object is mentioned but has no visual description in the script (e.g., "a generic pen"), the LLM should flag it as "Low Priority."



---

### 3. High Revision: Visual Style Lock Enforcement

**Urgency:** High (Prevents "Style Drift" where assets look like they belong in different movies)

**How to Revise Section 1.3 and 2.5:**
Make the Style Capsule a mandatory "Hard Constraint."

* **In `ImageGenerationService` (1.3):**
* Modify the `generate-image` logic to **require** a `style_capsule_id`.
* If the user attempts to generate an asset image before a Global Style is selected in the UI, the backend should return a `400 Bad Request`.


* **In `Stage5Assets.tsx` (2.5):**
* The "Generate Image Key" button must remain globally disabled until the "Style Anchor" dropdown at the top of the page has a value.



---

### 4. Medium Revision: Type-Specific Aspect Ratios

**Urgency:** Medium (Ensures assets look professional—e.g., no vertical landscapes)

**How to Revise Section 1.3 (Technical Notes):**
Automate the framing based on asset type.

* **In `ImageGenerationService.ts`:**
* Add a helper function to determine `aspect_ratio` based on `asset_type`:
* `character` -> `2:3` or `4:5` (Portrait/Full body).
* `location` -> `16:9` (Cinematic Landscape).
* `prop` -> `1:1` (Product-style focus).





---

### 5. Medium Revision: Asset Promotion & Voice Seed

**Urgency:** Medium/Low (Strategic "Stretch Goal" preparation)

**How to Revise Section 2.3 (Asset Detail Editor) and Database Schema:**
Close the loop with your Global Asset Library (Feature 3.2).

* **In `src/components/pipeline/Stage5AssetEditor.tsx`:**
* **Add "Promote to Global Library" Button:** When clicked, this calls `POST /api/assets` (from Feature 3.2) using the data from the current project asset.
* **Add Voice Seed Dropdown:** Add a "Character Voice" selector. Even if it's just a text field for an "ElevenLabs ID" for now, it ensures the data is captured during Stage 5 as planned.


* **Database Update:** Add `voice_id` (varchar) and `aspect_ratio` (varchar) to the `project_assets` table migration.

---

### 6. Low Revision: Generation State Sync

**Urgency:** Low (UX Polish)

**How to Revise Section 2.5 (Workflow):**
Prevent the "I edited the text but the AI didn't see it" bug.

* **Frontend Logic:** * Inside the `generateImageKey` function, the very first line should be an `await saveAssetDescription()`.
* This ensures that whatever the user just typed into the description box is committed to the database *before* the Image Generation Service reads that database row to build the prompt.



### Summary of Revised Flow

1. **Scan:** LLM finds everything -> **2. Review:** User merges, deletes "ghosts," and adds missed items -> **3. Commit:** Assets move to Stage 5 -> **4. Style Lock:** User picks the movie look -> **5. Visualize:** User generates images (with auto-save and type-correct aspect ratios) -> **6. Lock:** Individual assets are finalized -> **7. Gatekeeper:** Stage 6 unlocks.



## MORE DETAILED EXPLINATION:

This is the "Deep Dive" revision. We are moving from a linear "Extract and Display" model to a **"Scan, Curate, and Visualize"** workflow. This version ensures you don't end up with a database full of "Ghost Assets" and ensures visual consistency across the entire project.

Here is the detailed, step-by-step revision for your Feature 3.3 Implementation Plan.

---

### Phase 1: Backend - The Extraction & Refinement Engine

#### 1.1 Refactor `AssetExtractionService.ts` (Summarization Logic)

Instead of just grabbing text, the service must now act as a "Visual Editor."

* **New Step: Distillation Prompting.**
* **Input:** Raw script mentions of a specific entity (e.g., "John," "John Doe," "He").
* **LLM Task:** "Identify consistent visual traits. If the script says he has a 'blue coat' on page 1 and a 'tattered jacket' on page 50, flag this as a visual conflict or prioritize the most recent state."
* **Output Schema:**
```json
{
  "suggestedName": "John Doe",
  "type": "character",
  "visualSummary": "A weary traveler in his 50s, wearing a tattered leather jacket and salt-and-pepper beard.",
  "isHighPriority": true, // LLM determines if this is a main character vs a background extra
  "confidenceScore": 0.95
}

```





#### 1.2 Revised API Endpoints (`projectAssets.ts`)

We are splitting the extraction into two distinct actions:

* **`POST /api/projects/:projectId/assets/scan`**
* **Logic:** Calls the `AssetExtractionService`. Returns a list of *Draft Assets* to the frontend. **Does not save to DB.**
* **Purpose:** Allows the user to see what the AI found before it pollutes the project state.


* **`POST /api/projects/:projectId/assets/commit`**
* **Request Body:** `Array<{ name, type, description, manualAdd: boolean }>`
* **Logic:** This is the bulk insert. It officially populates the `project_assets` table.


* **`POST /api/projects/:projectId/assets/:assetId/promote`**
* **Logic:** Maps `project_asset` data to the `global_assets` table (Feature 3.2 logic).
* **Pre-requisite:** Asset must have a locked `image_key_url`.



---

### Phase 2: Frontend - The "Curation" UI

#### 2.1 The "Review Extracted Assets" Modal/Step

In `Stage5Assets.tsx`, replace the immediate extraction with a "Review Station."

* **The List View:** A multi-select table showing Name, Type, and the AI’s "Visual Summary."
* **The Merge Tool:**
* **Action:** User selects two rows (e.g., "The Stranger" and "Mysterious Man").
* **UI:** A "Merge" button appears.
* **Logic:** Frontend sends both descriptions to a minor LLM call: "Combine these two descriptions into one cohesive character profile."


* **Manual Entry:**
* A "Can't find an asset? Add it manually" row at the bottom of the table.



#### 2.2 The Asset Editor (Style & Aspect Ratio)

In `Stage5AssetEditor.tsx`, implement the specific visual constraints:

* **Automatic Aspect Ratio Selection:**
* When `asset_type === 'character'`, set `params.aspect_ratio = "2:3"` (Portrait).
* When `asset_type === 'location'`, set `params.aspect_ratio = "16:9"` (Cinematic).
* *Detail:* Users should see this as a read-only badge so they understand why the image looks that way.


* **The Voice Seed Field:**
* Add a labeled input: **"Global Voice Profile (ElevenLabs ID)"**.
* *Note:* Even if you don't have the ElevenLabs integration yet, saving this ID to the `project_assets` table now prevents a database migration in Stage 12.



---

### Phase 3: The "Style Lock" Implementation

#### 3.1 Global Style Enforcement

This is the most critical risk from your original plan. If the user hasn't picked a style, the asset images will be generic.

* **Frontend Logic:** * The "Generate Image Key" button in the Asset Editor must have a Tooltip: `"Please select a Visual Style Anchor at the top of the page before generating."`
* Disable the button if `selectedStyleId` is null.


* **Backend Validation (`ImageGenerationService.ts`):**
* Inside `generateMasterAssetImage()`, add a check:
```typescript
const style = await db.visual_styles.get(styleId);
if (!style) throw new Error("Stage 5 requires a locked Visual Style Capsule.");
// Force-inject the style prompt into the Nano Banana call
const finalPrompt = `${style.visual_description}, ${asset.description}`;

```





---

### Phase 4: Data Sync & Persistence

#### 4.1 The "Implicit Save" Pattern

To prevent the user from losing edits when they click "Generate":

* **Implementation:** * In the `handleGenerateImage` function in `Stage5AssetEditor.tsx`:
1.  Show "Saving description..." spinner (briefly).
2.  `await api.put('/assets/' + id, { description: currentText })`.
3.  Only *after* the 200 OK from the save, trigger the `api.post('/assets/' + id + '/generate-image')`.

#### 4.2 Database Schema Update (Migration 009)

Add these missing fields to your existing `project_assets` table:

```sql
ALTER TABLE project_assets 
ADD COLUMN voice_id VARCHAR(255),
ADD COLUMN aspect_ratio VARCHAR(10) DEFAULT '1:1',
ADD COLUMN source_mentions TEXT[]; -- Store the original script snippets for reference

```

---

### Updated Success Criteria

* [ ] **Zero Hallucination Policy:** User has explicitly approved every asset in the "Review Station."
* [ ] **Visual Continuity:** All Stage 5 images use the same `visual_style_capsule_id`.
* [ ] **Framing Accuracy:** Locations are generated in 16:9; Characters in 2:3.
* [ ] **Clean Handoff:** All assets are locked, and the "Promote to Global" button is functional for high-value characters.
* [ ] **State Sync:** Image generation always uses the *most recent* version of the asset description.