This is a comprehensive and well-structured plan. You’ve clearly thought through the data relationship between "Global" and "Project" assets, which is often where these systems fail.

Here is an analysis of the plan, highlighting the architectural strengths and the risks you should address before you start coding.

---

### 1. What is Solid and Well-Designed?

* **The "Promotion" Logic:** Distinguishing between `global_assets` and `project_assets` is excellent. It prevents a "change here, break everywhere" scenario by essentially treating global assets as a master template that gets "cloned" into a project.
* **Dependency Checking:** Your Phase 2.2 is critical. Preventing the deletion of a global asset that is actively being used in a project's branch is a must-have for data integrity.
* **Consistency:** The plan follows the existing patterns of your `StyleCapsuleLibrary`, which will make the frontend development faster and more maintainable.
* **Database Schema:** The use of `CHECK` constraints on `asset_type` and proper indexing on `user_id` and `created_at` shows good attention to performance and data quality.

---

### 2. Key Flaws and Risks (Important)

#### A. The "Sync" Dilemma (Medium/High Risk)

You have a "Clone to" arrow in your diagram.

* **The Issue:** If a user updates the "Global" version of a character (e.g., changes their hair color in the description), what happens to the 5 projects already using that character?
* **Risk:** If they don't sync, the library becomes out of date. If they *do* sync automatically, you might overwrite custom project-level tweaks the user made.
* **Recommendation:** Add a `version` or `last_synced_at` timestamp to `project_assets`. When the global asset changes, show a "Update Available" badge in the Project Stage 5 UI.

#### B. Image Storage Orphanage (Medium Risk)

* **The Issue:** When you delete a `global_asset`, your plan checks for project dependencies, but it doesn't mention deleting the actual file in **Supabase Storage**.
* **Risk:** Over time, your storage bucket will fill up with "ghost" images that aren't linked to any database row.
* **Recommendation:** In your `DELETE` endpoint, ensure you call `storage.from('assets').remove([path])` after the DB record is deleted.

#### C. The "Description" vs. "Prompt" Gap

* **The Issue:** You have a `description` field. Is this the *user-facing* description or the *AI Prompt*?
* **Risk:** Often, a good story description ("A weary detective who has seen too much") isn't a good image prompt.
* **Recommendation:** Consider having two fields: `description` (for the user) and `image_prompt` (hidden or editable, optimized for the generator).

---

### 3. Medium / Low-Level Design Gaps

#### Relational Integrity for Styles

In your schema:
`visual_style_capsule_id UUID REFERENCES style_capsules(id)`

* **The Gap:** What happens if a user deletes a **Style Capsule** that is being used by a **Global Asset**?
* **Fix:** Ensure your `style_capsules` deletion logic also has a dependency check, or set this to `ON DELETE SET NULL`.

#### The "Locked" State in Phase 1.2

* **The Gap:** You added `locked BOOLEAN` to `project_assets`.
* **Refinement:** You should define exactly what "locked" prevents. Can a locked project asset still be updated if the Global Asset it's linked to changes? Usually, "Locked" should mean "Stop syncing from Global."

---

### 4. Implementation Suggestions

**1. The "Promotion" Flow:**
When "promoting" a project asset to global, remember to copy the image file in storage or create a new reference. If the project is deleted later, you don't want the global asset's image to vanish.

**2. Search Scalability:**
Your Phase 5.1 uses client-side filtering.

* **Advice:** This is fine for < 100 assets. If you expect users to have hundreds, move the search to the Postgres query (`WHERE name ILIKE %query%`) early to avoid performance lag.

**3. UI Feedback:**
Since image generation is an "async job," the `AssetCard` needs a specific "Generating..." state.

* **Check:** Does your `AssetCard` handle the case where `image_key_url` is null? (e.g., a nice placeholder silhouette).

---

### Summary Verdict

The plan is **Sound and Production-Ready**. The most important thing for you to decide before coding is the **Update Policy**: *Does a change in the Library push to the Projects, or do Projects pull from the Library?* (I recommend the "Pull/Sync" method for more user control).

**Would you like me to draft the specific SQL trigger or the updated Delete logic that handles the Supabase Storage cleanup?**
-------------------------------------------------------------------------------------
To improve the "Global Asset Library" plan, I’ve broken down the recommendations into technical structural improvements and user experience refinements.

### 1. Architectural Improvements (Data Integrity)

* **Implement a "Soft Delete" for Global Assets:** Instead of hard deleting a global asset when it's not in use, consider a `deleted_at` timestamp. This prevents a "cascading fail" if a project reference was missed by the dependency checker.
* **Decouple Storage from DB Records:** Create a dedicated helper function for image deletion. Your current plan deletes the row but leaves the file in Supabase Storage.
* **Recommendation:** Your `DELETE` logic should first verify usage, then delete the storage object, and finally delete the database row.


* **Version Tracking (The "Source of Truth" Problem):** Currently, if a user updates a Global Character's description, the Projects using that character will be out of sync.
* **Improvement:** Add a `version` (INT) to `global_assets` and a `synced_at` or `source_version` to `project_assets`. This allows you to notify users in the project view: *"A new version of this character is available in the library. Update?"*



### 2. Schema Refinements

* **Visual Style Constraint:** You have a `visual_style_capsule_id`. Add a trigger or application-level check to ensure that the Style Capsule belongs to the same user.
* **Prompt vs. Description:** Storytellers often write descriptions that make for poor AI prompts.
* **Improvement:** Add an optional `generation_prompt` field. If empty, the system falls back to the `description`. This gives power users more control over the "look" without cluttering the story details.


* **Handling Dependencies:** Ensure the `ON DELETE` behavior for `visual_style_capsule_id` is set to `SET NULL` rather than `CASCADE`. You don’t want an asset to be deleted just because a user deleted a style preset.

### 3. API & Performance Enhancements

* **Batch Retrieval:** If Stage 5 (Project Assets) lists 20 characters, your frontend might make 20 individual API calls if not careful.
* **Recommendation:** Ensure your `GET /api/assets` endpoint supports a `ids=uuid,uuid,uuid` query parameter for batch fetching.


* **Polling Optimization:** In Phase 4.3, you mention polling for image generation.
* **Improvement:** Instead of raw polling, use a **Supabase Realtime** subscription on the `global_assets` table. The frontend can "listen" for when `image_key_url` changes from NULL to a string, providing a much smoother UI experience than interval-based polling.



---

### 4. UI/UX Refinements

* **The "Promotion" Workflow:** The plan mentions promoting project assets to the library.
* **Recommendation:** Add a "Conflict Resolver" UI. If a user tries to promote an asset with the same name as one already in the library, ask if they want to **Create New**, **Overwrite**, or **Skip**.


* **Smart Search:** Simple `ILIKE` filters in Phase 5.1 are a great start, but searching by "Type" and "Style" simultaneously is common.
* **Improvement:** Implement a "Filter Chip" UI so users can quickly toggle `[Character] + [Cyberpunk Style]` to find specific assets.


* **Empty States:** Don't just show a blank screen.
* **Improvement:** Provide a "Quick-Start" template for the first Character, Prop, and Location to guide the user on how much detail the AI needs for a good generation.



### Summary Checklist for your "V2" Plan:

1. [ ] Add `version` column to `global_assets`.
2. [ ] Add `source_version` to `project_assets`.
3. [ ] Define a storage cleanup utility for deleted images.
4. [ ] Swap manual polling for Supabase Realtime listeners.
5. [ ] Add an `image_prompt` field separate from `description`.

**Would you like me to rewrite the SQL migration file to include these versioning and constraint improvements?**