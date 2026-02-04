@.
  SUMMARY OF ANWSERS:


Stage 11 (Cost Gateway) Strategy
Retain Stage 11: Disregard previous instructions to remove this stage. It is essential for the 12-stage flow. Core Requirements: Stage 11 must provide a comprehensive scene summary including all shots, start/end frame previews, and prompt snapshots. Cost Transparency: Include a detailed cost breakdown showing individual per-shot costs and a total sum for the scene. Contextual Data: Implement dependency warnings (where applicable) and a running total of costs based on previous generations in the project. ( 
 User Anwser: *Oh my gosh, I was mistaken in my previous message, we do need the stage 11, please disregard my previous instructions for removing stage 11 (and thus we dont need to worry about a button or modal on stage 12) to get rid of the stage, as the most important elements of this stage is: Scene summary with all shots; Start/end frame previews; Prompt snapshots, whihc I forgot about (it will aslo have Cost breakdown & Dependency warning when applicable, too) but for the cost stuff, it should show total scene cost by showing each shot's cost and then like a sum for the scene costs; and maybe a running total based on the previous generations as well)

2. Asset Extraction Architecture
Centralized Extraction: Do ONE comprehensive extraction at Stage 5 that includes scene-level    
   mappings; Implement a single, comprehensive extraction at Stage 5. This aligns with Stage 4 (Master Script) as the "Global Narrative Truth."

Scene-Level Mapping: The LLM should parse the Master Script once and return both the Master Assets and a mapping of which scene_id each asset appears in.

Database Persistence: Use the result to populate the project_assets table and the dependencies JSONB field in the scenes table simultaneously.

Efficiency: This eliminates redundant AI calls in Stages 6 and 8, allowing the UI to simply query existing dependencies for auto-suggestions.

NOTE *dont kill ability to add some that are missing as the user goes through in stage 8 or stage 5 (stage five adding a asset should not be mapped but rather be accessible for the user to add when in stage 8 )

3. API Integration Priority
Parallel Integration: Integrate Gemini (for Stage 10 frame generation) and Veo3 (for Stage 12 video generation) in parallel.

Access: Veo3 access is confirmed and will be handled through the Vertex AI API.

4. Stage 8 Asset Instance Logic & Reference UI
Reference Image Logic: * Add a pre-selected checkbox: "Use master asset as-is."

Fix the inheritance bug where the scene instance image is currently uninfluenced by the master asset image.

Historical Continuity: * The "Master Reference" for a character in a new scene should default to the most recently selected scene instance image (e.g., Scene 4 defaults to the choice from Scene 3).

Implement a carousel on the Master Reference image allowing users to cycle through all previous selected scene instances and the original Master Asset image to choose their current reference point.

Iteration & Uploads: * Implement a carousel for asset generations so users can compare multiple attempts and select their favorite.

Allow manual image uploads for scene-specific asset instances.
{{ 
        User Anwser: Use the 'a checkbox "Use master asset as-is"?'; this should be preselected. additionally:  *The scene instance image currently seems to be uninfluenced by the masster asset image* which needs to be fixed; also, when the user tries multiple generations for the scene instance image of an asset, wouldn't it be nice to be able to see the various generations made, and choose your favorite. Like, say you generate a scene instance image once, and eh, it's good not great, so you try it again and its worse, so you try it a third time, and hey its pretty good, but maybe not better then the first try, wouldn't it be ideal for the user to have a carasoul to choose from below.

        Additionally the master reference should default to most recent scene reference image of the asset (so hypothetically, for example: scene 4's master reference of protaginist should be defaulted to scene 3's scene instance image of the protagnist; but the user should be able to carasoul through all the SELECTED scene instance images of the character; and the master asset reference image (so back to our example, let's say protagnist hass a master asset image, and then 3 major changes scene by scene, and then, when the user arrives at scene 4, the master reference for the protagnist (in stage 8) should be Scene 3's scene instance image, but he can slide through or press arrows on the side of the master image to cycle through the past scene instance images of previous scenes, and the master asset image to choose as master reference (and can choose to keep the image the same, by leavig the  checkbox "Use master asset as-is" selected
        
        users must be allowed to upload an image as well to be the scene instance image is they so wish )))
    }} 

5. Transparent Background Implementation
Enforced Prompting: Automatically inject the descriptor "isolated on transparent background" for all Character and Prop assets during Stages 5 and 8. Locations are excluded from this injection.

If we find it's neeccesary after testing: do Post-Processing: To ensure professional results and eliminate "halos" or solid backgrounds, implement a background removal pass (e.g., Rembg API) before saving Character/Prop assets to Supabase.

  User anwser: **implement a Prompt Engineering solution that is automatically enforced for certain asset types (Characters and Props) but not for others (Locations)... if the product is not great/consitent from just the prompt; we'' try the following Implementation: Rather than a user toggle, this should be handled When a user is in Stage 5 (Global Asset Definition) & stage 8, the system should automatically inject the descriptor "isolated on transparent background" into the image_key_url generation request for any asset with asset_type: 'character' or 'prop'.This ensures "deterministic style injection," which is a core design principle of the application.

6. Stage 9 Prompt Segmentation
User Visibility: Show only the Frame Prompts and Video Prompts to the user; hide system scaffolding *as system scaffolding is not a user feature, but rather something "I" wrote in the PRD in meaning that our system would need to have speciality internal prompts to get the llms to generate correctly during the pipeline*.

Prompt Logic: * Frame Prompts: Visually descriptive, focusing on the composition of the starting still.

Video Prompts: Focused on action, movement, and dialogue.

Interactivity: Both prompt types must be automatically generated by the LLM but remain fully editable by the user.

7. Continuity & End-State Generation
Timeline: Do the immediate end-state summary implemnetation imemdaitely after we are done with implementing stage 10l. but Defer the implementation of a comprehensive, optimal, and amybe "complex/loaded with content for the user" end-state summary generation to Phases 2 or 3.

Trigger: This logic should be triggered upon the completion of Stage 10.

8. Version Control & History
Approach: Implement versioning/checkpoints in the way that best aligns with the 

Access: Users should access historical versions/checkpoints through  "Story Timelines" interface or through a dedicated "History" button.

9. Testing Strategy
Responsibility: Programmatic testing of functionality (unit/integration tests) should be prioritized in the task list.

Manual Testing: Narrative inputs and specific scenario testing (e.g., state-change tracking like "muddy characters") will be handled via manual input by user .

10. Development Roadmap (Phase Grouping)

You already asked this but lets set it as: 
 Phase 1: Pipeline Connectivity (Stages 9-12 bare minimum *though recall:  *DO IT AS WELL AS POSSIBLE; No point in doing it in the laziest way possible when it would take no work to just get it right; but also: Build Stages 9–12 to get the end-to-end pipeline working (prioritizing connectivity over perfection).)
  Phase 2: Critical Blockers (Issues preventing progression; probably going stage by stage &iterate  improve quality, the issues in the issue-tickets + things ive noted elsewhere)
  Phase 3: Data Flow Optimization (Single extraction fix,     
  proper inheritance)
  Phase 4: Continuity & State & UI (End-states, minimal branching, polishing UI/UX)
  Phase 5: Quality Improvements (Fix annoyances, improve generations)
  Phase 6: Advanced Features (Full branching, visual diffs, etc.)

