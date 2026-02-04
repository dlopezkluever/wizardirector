*All my anwsers are in between "*"*

Strategic Questions

  1. Definition of "Basic Functionality"

  For Stages 9-12, what's the absolute minimum that would let you test the full pipeline flow?
  - Stage 9 (Prompt Segmentation): Just concatenate shot data into prompts without fancy formatting? *DO IT AS WELL AS POSSIBLE; No point in doing it in the laziest way possible when it would take no work to just get it right*
  - Stage 10 (Frame Generation): Mock image generation or real Nano Banana calls? *real Gemini (but cheapest model as default) calls - i think it's flash-1 (nano-banana)
  - Stage 11 (Cost Gateway): Simple cost display or actual credit checking? - *I honestly think this stage may need to be turned into a simple pop up-modal or a button to click on the video review/generation stage (current stage 12) that when you click the button, the modal appears and you can see the information that was supossed to be this "stage" ... In fact, yes, lets do that; I will edit the docs to specifiy that is what we will be doing*

  - Stage 12 (Video Review): Mock video playback or real Veo3 integration? *real veo3 integration and then later we will do sora integration*

  2. Critical Path Analysis

  Looking at your Issue-Tickets.md, which issues are blocking vs quality improvements? *I will work on refining this issues/tickets; making sure they are clear, you don't have to specify on the issues but just generally note we need to work on fixing issues, stage by stage*

  For example:
  - "Can't Proceed without generating scene instance image for each asset" (Stage 8) - seem blocking *for this issue in specific, we need the ability to se the master reference image as the scene instance image*
  - "Assets extracted multiple times" - inefficiency but not blocking *not blocking but super annoying and wasteful,* 
  - "Stage opening system skips ahead 1 stage" - annoying but not blocking *correct*

  Should we categorize these into:
  - Blockers (prevent pipeline progression)
  - Data Quality (affects output quality)
  - UX Polish (improves experience but doesn't affect function)

    *I LIKE THOSE CATEGORIES, do it like this*

  3. Data Flow Priority

  You mentioned wanting Stage 4→Production data passing to be optimal. What's most critical here?
  - Asset extraction happening once (Stage 5) and being reused? *this is likely most important*
  - Scene/shot context properly flowing to prompt generation?
  - Visual style consistency through the pipeline?
  - End-state summaries for continuity?
    *But these are all important and need to be treated seriously* 
  4. Testing Strategy

  When you say "get to basic functionality and make note of what works," how do you plan to test?
  - Manual testing with a sample project?
  - Specific test narratives (simple vs complex)?
  - Focus on specific problem areas (continuity, asset inheritance)? *we will do all*

  5. Branching/Locking Implementation

  The PRD has complex branching rules, but you haven't implemented them. What's your minimum viable version?        
  - Just prevent accidental overwrites of completed work? 
  - Full git-style branching from day one?
  - Simple "save as new version" functionality?
    *We want to prevent accidental overwrites of completed work and *Simple "save as new version" functionality for immediate MVP, but we want the full branching ability, which can  wait until after basic pipeline works*
    - Could this wait until after basic pipeline works? 
  6. Launch Timeline

  Do you have a target for:
  - Internal testing/demo?
  - Beta users?
  - Public launch?
    *Dont worry about this too much but the target is for beta users*
  This affects whether to prioritize "good enough" vs "polished."

  7. Integration Dependencies

  What external services need to work for your MVP? 
  - Is mock Nano Banana/Veo3 acceptable initially? *No lets get this working immmediately*
  - Do you have API keys/access ready? *Yes*
  - Cost implications of testing with real services? *I dont care my testing will be basic*

  8. The Asset Question

  Your Issue-Tickets raises good points about asset generation. Should we:
  - Generate assets with transparent/neutral backgrounds (as you suggested)? *yes*
  - Implement the "adaptive description" concept now or later? *probably after we get the very basic pipleine, so like in the second or third phase*
  - Fix the extraction-happens-multiple-times issue before or after basic pipeline? *Do what you think is best, im leaning toward after, but maybe this is like an immediate thing to fix*

  Follow-up Questions

  1. Stage 11 Merger into Stage 12

  You want to merge Stage 11 (Cost Gateway) into Stage 12 as a modal.
  Should this modal:
  - Appear automatically before video generation starts?
  - Be optional (button to view costs)?
  - Block proceeding if insufficient credits?
  - Show itemized costs (per shot) or just total scene cost?
 
 User Anwser: *Oh my gosh, I was mistaken in my previous message, we do need the stage 11, please disregard my previous instructions for removing stage 11 (and thus we dont need to worry about a button or modal on stage 12) to get rid of the stage, as the most important elements of this stage is: Scene summary with all shots; Start/end frame previews; Prompt snapshots, whihc I forgot about (it will aslo have Cost breakdown & Dependency warning when applicable, too) but for the cost stuff, it should show total scene cost by showing each shot's cost and then like a sum for the scene costs; and maybe a running total based on the previous generations as well*

  2. Asset Extraction Architecture

  You said extraction happening once is "most important." Currently
  assets are extracted at:
  - Stage 5 (from Master Script)
  - Stage 6 (scene dependencies)
  - Stage 8 (relevance detection)

  Should we:
  - Do ONE comprehensive extraction at Stage 5 that includes scene-level    
   mappings? *Yes exactly, the extraction done should do that*
  - Keep Stage 5 as global extraction, but cache/reuse it everywhere        
  else?
  - Create an "asset manifest" that travels through the pipeline?
  
  User Anwser: Yes {{**So for this: Do ONE comprehensive extraction at Stage 5 that includes scene-level mappings; 1. Architectural Alignment: "Global Narrative Truth". The project-overview.md defines Stage 4 (Master Script) as the "Global Narrative Truth". Because Stage 5 is the first step of Phase B, its primary purpose is to translate that global truth into actionable assets. Stage 5 is already designed to "automatically parse the Stage 4 script and deterministically extract all unique Key Characters, Key Props, and Key Settings". Performing the extraction here ensures that the Asset Drawer (the primary UI tool for production) is fully populated before the user begins the scene-by-scene cycle.

    2. Efficiency: Elimination of Redundant AI Calls
    Currently, you have extraction happening at Stages 5, 6, and 8.

    Stage 6 (Current): Extracts scene dependencies.

    Stage 8 (Current): Performs relevance detection for asset assembly. By moving scene-level mapping to Stage 5, you create a single "Asset Manifest" (as you suggested) stored in the database. This manifest allows the system to know exactly which assets belong to which scenes without needing to re-run expensive LLM extraction calls during the high-latency production stages (7-12).

    3. Implementation Path: The dependencies JSONB
    The database schema already has a placeholder for this logic. The scenes table contains a dependencies JSONB field:

        TypeScript
        {
        characters: string[],
        locations: string[],
        props: string[]
        }
        Recommended Workflow Change:

        Stage 5 Trigger: When Stage 5 runs, the LLM parses the entire Master Script.

        Mapping: The LLM returns a list of Master Assets AND a map of which scene_id or scene_number each asset appears in.

        Persistence: The system populates the project_assets table and simultaneously updates the dependencies field in the scenes table.

        Usage: When a user enters Stage 8, the system simply queries the scenes.dependencies for that specific scene to auto-suggest assets, rather than performing "relevance detection" from scratch.

        4. Why not just "Cache/Reuse"?
        Simply caching Stage 5's global list doesn't solve the "relevance" problem for Stage 8. If a project has 50 characters, a global cache forces the user (or a local AI) to sort through all 50 every time. Mapping them at Stage 5 provides the deterministic control that is a core design principle of the application.*

        ** 
    }}
   3. Real API Integration Priority

  You want real Gemini/Veo3 immediately. In what order should we tackle:    
  - Gemini for Stage 10 frame generation first?
  - Veo3 for Stage 12 video generation?
  - Both in parallel?
  - Do you have Veo3 API access confirmed? (It's limited availability) 

  **This could be a great opportunity to try to do both in parallel; I do have Veo3 API Access, it is confirmed to be accessible through the Vertex AI API**       

  4. Stage 8 Master Reference Fix

  You mentioned "need ability to use master reference image as scene        
  instance image." Should this be:
  - A checkbox "Use master asset as-is"?
  - Automatic default (no generation unless user requests)?
  - Copy button to instantly copy master to scene instance?

    User Anwser: Use the 'a checkbox "Use master asset as-is"?'; this should be preselected. additionally:  *The scene instance image currently seems to be uninfluenced by the masster asset image* which needs to be fixed; also, when the user tries multiple generations for the scene instance image of an asset, wouldn't it be nice to be able to see the various generations made, and choose your favorite. Like, say you generate a scene instance image once, and eh, it's good not great, so you try it again and its worse, so you try it a third time, and hey its pretty good, but maybe not better then the first try, wouldn't it be ideal for the user to have a carasoul to choose from below.

        Additionally the master reference should default to most recent scene reference image of the asset (so hypothetically, for example: scene 4's master reference of protaginist should be defaulted to scene 3's scene instance image of the protagnist; but the user should be able to carasoul through all the SELECTED scene instance images of the character; and the master asset reference image (so back to our example, let's say protagnist hass a master asset image, and then 3 major changes scene by scene, and then, when the user arrives at scene 4, the master reference for the protagnist (in stage 8) should be Scene 3's scene instance image, but he can slide through or press arrows on the side of the master image to cycle through the past scene instance images of previous scenes, and the master asset image to choose as master reference (and can choose to keep the image the same, by leavig the  checkbox "Use master asset as-is" selected
        
        users must be allowed to upload an image as well to be the scene instance image is they so wish )))
    }} 

  5. Transparent Background Implementation

  For asset generation with transparent backgrounds:
  - Should this be a prompt engineering solution ("isolated on
  transparent background")?
  - A toggle option for users?
  - Always enforced for certain asset types (characters, props) but not     
  others (locations)?
  - Do we need background removal post-processing?

  User anwser: **implement a Prompt Engineering solution that is automatically enforced for certain asset types (Characters and Props) but not for others (Locations)... if the product is not great/consitent from just the prompt; we'' try the following Implementation: Style Capsule InjectionRather than a user toggle, this should be handled by the Visual Style Capsule system.When a user is in Stage 5 (Global Asset Definition) & stage 8, the system should automatically inject the descriptor "isolated on transparent background" into the image_key_url generation request for any asset with asset_type: 'character' or 'prop'.This ensures "deterministic style injection," which is a core design principle of the application.  .....  The Need for Post-Processing (Background Removal) as the Current AI image models (like the ones Nano Banana might use) often struggle to produce a true, clean PNG alpha channel solely through prompt engineering. They may still generate a solid color background or "halos" around the character.The Solution: To maintain the "Vivid Visual Blueprint" required for the script, the backend should run a background removal pass (e.g., using a library like Rembg or a specialized API) after the image is generated but before it is saved to Supabase Storage.Summary Table for ImplementationAsset TypePrompt InjectionBackground RemovalPurposeCharacterEnforcedRequiredConsistency across scenesPropEnforcedRequiredInteraction in different shotsLocationProhibitedNoneEnvironmental context/lighting**

  6. Stage 9 Prompt Quality

  You said "do it as well as possible" for prompt segmentation. The PRD     
  specifies separate prompts for:
  - Frame generation (visual-heavy)
  - Video generation (action/audio-heavy)
  - System scaffolding (hidden) *Explain to me what you think this "Sytem Scaffolding means"*; 

  Should Stage 9:
  - Show all three prompt types to users?
  - Allow editing of all prompts or just video prompts?
  - Include the Veo3-specific formatting from the PRD?
 User anwser: ** I think for now the users should only get shown the frames & video prompts, the frame prompts should be much more visually descriptive of the start of shot still, while the video prompt should be focused on the describing the action and the dialouge; like that is what should be automaticaly gathered by the LMM and outputed, but they should be editable" 

  7. Continuity System (Feature 5.5)

  The other LLM suggested implementing minimal end-state summary
  generation. Should we:
  - Add this to Phase 1 (basic pipeline)?
  - Wait until Phase 2/3?
  - What triggers end-state generation - shot list lock, Stage 8
  completion, or Stage 10 frame generation?

    User anwser: * I think this should wait for phase 2/3, and really should be triggered once stage 10 is done (i think)

  8. Version Control Minimum

  For "save as new version" functionality:
  - Should this create a full project copy?
  - Just checkpoint certain stages?
  - How do users access old versions - dropdown, modal, separate page? (through "story time-lines button I think, or make a new button for history or something)
      User anwser: *Do what you thinks makes most sense here, based off my PRD (project-overview.md)    

  9. Testing Project Selection

  What type of test narrative would best reveal issues:
  - Very simple (1-2 scenes, 2-3 characters)?
  - Complex (multiple scenes, scene transitions, character state
  changes)?
  - Specific scenario (e.g., character gets muddy in scene 2, should        
  stay muddy in scene 3)?
    User anwser: *Ill come up with the manuel inputs, you just worry about programmatic testing of functionality.*

  10. Phase Grouping Preference

  Would you prefer the new task list organized by:
  - A) Stage completion (finish all of Stage 9, then all of Stage 10,       
  etc.)?
  - B) Feature completion (get minimal 9-12 working, then improve all,      
  then add features)?
  - C) Problem domain (all asset issues together, all continuity issues     
  together, etc.)?

  USer Anwser: *I think we need to do something like B) (get 9-12 working but not over stress on some issues existing; but then we move to improve all; then move to Prblem domains (all asset issues together, all continuity issues together, etc) then add features stage by stage etc. 

