
**Issue/ Bugs / Refactors / And General To-dos That Persist**  


# **Base Functionality**


##  Lets get the extraction process right (1 step, with additions allowed in later stages; but not a full extraction every time). 
    
    Help me understand how the extraction (of assets) process currently works throughout my application; Like do the assets get extracted from the stage 4 once during stage 5, then again druing stage 6. and again in 7, and again and 8? How could we possibly optimize this?  

    In an ideal sense, it would be nice to have one extraction that gets all the details

    
    The major FUNCTIONALITY concern I have in the production stage is the asset extraction system, as I beleive it's not being don optimally.   
    
    Broadly Speaking

    {{ This seems completely disconnected to the shot list scene; like outside of the basic "extraction" that occurs how is the prior information of the "scene" and "shot-list" helping with things like the visual style decription/captions?"
    ### If we want highest utility, the "Visual State Description" would function best if they could automatically have the correct "description" generated to describe what the state of the asset needs to be in for the scene, using infrencing from the the context of the scene / shot-list. 
    ### If we can couple that feature WITH the selection ability of the Master reference, WHERE the master reference image defualts to the latest "scene Instance image" of said asset (so lets say scene 3 had protaginist put on a disguise; well in scene 4, when in stage 8, the master reference should now be scene inference image from scene 3 (protaginist in disguise); from here the user can choose to edit further; this is where the rearview mirror comes in hand; to be able to see the most recent frames of stage )

    Would it be best to have assets geneerated with all white/transparent/all black backgrounds, thus only focusing/generating the item/asset of desire, without possibly confusing background noise that's not relevant to the asset when then injected into the generation of frames + videos

    }}
# **For MVP Completeness**



### Make Sure to Allow for Writing Skip, (Skip to Script, that allow's users own inputs to generate the shooting script (especailly is a script is already don; if no exact script done just skip to stage 4)) - We need a really clear script
    #### Basic Philosophy is to take as much input context as given, and to really refine it down to get out Master script as the sort of source of truth, and from there expand our to create the videos through the production cycle.


### Fix Stage Opening System; 
  Currently when opening a project, the system seems to skip ahead 1 stage; we should change it so it opens to the stage the user left off on; Thus it need to be one stage back when opeing a porject, don't just automatically skip forward


### Stage 5 make option to allow user to not use visual style guide and instead just describe out what they want (i.e 2d animation of the style of Dan Harmon fusion with spongebob squarepants, black and white though.. or whatever  )  (allow user to also add additional images right there (option (save as style capsule for future projects)))

### Stage 5: 

    Regarding Asset Extraction & defintion: 
     Also; i think to save time, would it not best to have all the items collapsed when extracted, to be able to quickly remove all those you don't really care to specifically generate indivdually

    Assets could be choosen to not be set by the user in Stage 5, but if a certain asset is going to be used in a film throughout, then, the asset will likely be generated in stage 8; 

    We need to allow for written descriptions. (Do we really want the style to neccessarily be LOCKED; or rather, can we allow for an UNLOCKING for a switch (image stories that go from Live action to a 3D animation wonder.))

### Improvement*: *Stage 5 & Beyond (production cycles): Adaptive Description for Assets**


    be able to extract from uploaded image, an improved description of the asset that will be useful for the production stages of the asset.  (Similar to how cloned assets do it: see Zhe_Trash: 3.Extra-plan/implementation 3-8; where they can either replace the description entirely, or merge in one form or another; would be great to take your description + generation, and then in the scene by scene shotlist; take the context of the story/scene and apply to the description.. This is where the money is made

    A perfect example is persophone (switching from blonde aryan nature-princess to goth alt-girl in underworld, could the llms when making said assets for the different scenes be able to catch that and apply the correct context for the asset generations KNOW 

    OR will it be better to just have multiple asssets made 1. Spring Innocent Persephone & Emo-Alt girl Persephone Underworld Queen version to then apply one or the ther depending on thier proper scene )

    Alot will depend based on how the future implementation (Phase B: production works) comes out.    


### More Stage 5: 
    *Saved for later*: Stage 5 key UI Improvement: When the extraction Occurs, maybe at first a modal pops up with a more compacted list of all the extracted assets SANS descriptions or image areas, but rather just a literal list component with asset name, (under thier catagory *character; setting/location; prop )
    like think a sort of check list, but made specifically/primarily for removing the assets you, the user, don't care to pre-generate (i.e. youd rather just let the llm generate it as part of stage 10/ frame generation)

    Moroever, maybe we need to make the assets more specified for the latter implementation in Stage 10; that being like multiple agnles/views of the assets, with NO background fluff/ visual *noise* in the background, the generation is specifc to make an image of just the asset (poissblely multiple angles (front shot, side shot etc.)) ... almost like how in enginerring when designing a part and documenting you have multiple "views" of the part, where combined you can have all the key details (*dimenesions*) accounted for

    FOR EXAMPLE
    if you look at "test-example/Hamlet Huevo.png" you see there is a church/castle interior with all these other characters in the frame; i wonder if this will make it difficult in the production stages/cycle to generate the compostie *starting* & *ending* frame for the shots as the LLM may get confused by the backgorund noise of the image. Like image the shot is: Hamlet in a forest talking to a pigeon; will the LLM get confused & include some extra people as well OR have like a castle in the background, while then what you really end up bascially getting is just your asset's original image, but with a pigeon and some trees added in. Like this I greatly fear maybe possible unless our system prompts are just incredible at being able to point the AI's to only use the relevant things in asset image while still being primarlily focused on generating the frame as intended by the shot desciption (i.e. only picking out Hamlet, and changing his expression/outfit/ items he's holding to be what the shot demands) while it would likely be easier and more consitent if the image only had the asset/ maybe with multiple views - to be able to pick out what it needs for the shot

    --- this focus also makes me wonder how we are to make sure enough context is clear from the script/scenes to make the shot/ frame prompts be descriptive enough for good generations (liek the scripts currently are very descritive less/ if not fully lacking - as they are basucally normal screenplay scripts (no detailes at all besides the bear min. for describing who enters & exits, the location, and any MAJOR action that occur THUS maybe the script needs a sceond stage after it, from the base normal script (stage 4) to an aditional stage (new stage 5) that is the "master" super descriptive "script" where instead of "persephone is walking in park" it's Persophe: "A thin blonde european woman with an angelic glow of light with a calm smile wearing a green tunic dress and a flower crown holding a basket of berries walks in a magical green opening within a vibrantly colorful and alive forest area in the greek mountianside with .....blah blah blah.." for each and every "scene" and moment of any change in the script (i.e. to dialouge moments then: Diameter, a 40yo brown haired .. blah blah blah descritive, walks over - {instead of "Diameter enters" }

    -------
    #### Stage 5:

    Allow for a visual description to replace the functionality of the visual style capsule if the user sees it fit. 

    Should be a bit more robust than just say a single text box (like how)

## Stage 8:
    Would it be best to have assets geneerated with all white/transparent/all black backgrounds, thus only focusing/generating the item/asset of desire, without possibly confusing background noise that's not relevant to the asset when then injected into the generation of frames + videos









### Really focus on fixing the locking system:
    
    By this I think we need to actual locking overlays, where apon "unlocking" the user can get prompted to "create a new branch" - *this is why it's vital to delay first*
    
    Locking issue continues:
    sideline locking functionality until all stages implemented,    probably around (or in unision with) the  Branching & Versioning implementation

    (example HTTP response of error: see "locking_error_console_log_2.md"
    {
        "error": "Cannot lock stage 2. Stage 1 must be locked first.",
        "details": {
            "requiredStage": 1,
            "requiredStatus": "locked",
            "currentStatus": "draft"
        }
    }
    )




## Add debouncing to Auto-Save for stages 1-3 (make it save less often; cause it's kinda spamming)


### have ability to put projects into folders in dashboard


### On dashboard view of projects: Include the stage the project is at on the card & for phase B show what Scene number along with stage (i.e. Scene 3, Stage 8)


### Fix the Script - STAGE 4 UI
    Especially regarding Characters & Dialogue, it's so funky currenlty, clearly our initial solution of 

### Stage 4 needs to auto generate IF never have been generated before.

### the stage pipeline graphic (sometimes they're green, other times yellow, despite being complete; not clear whats going on there)




### Stage 8:

    ## see image "Locked" status should not be a status flag with the rest 

    {{
        ## 1. Master Asset's Influnce on the Scene Instance Image

        ### 1a. ## Not sure the master assset image is effecting the Scene instance image as it should, while the visual style capsule seems to have TOO MUCH influence. let's inestigate how we can tailor this more finally 

        ## There is no rearview-mirror present for scenes where the previous has not been made; what if instead it show cased the latest assets from the previous scenes; OR Even better, the showed each asset & thier various previous modifications done in previous scenes, prvious Scene instance image's that we generated. That way that image could be pulled and bacome the new "master reference for assset

        ## There should be the option for the user to just use the master reference AS IS for the scene instance, you shouldn't be forced to use the general 

        *The scene instance seems to be uninfluenced by the masster asset image*
        (Scene instance image
        Launchpad in scene
        Audit trail
        Modifications: 2 • Last field: image_key_url). See here, wouldn't it be nice to be able to see the various generations made, and choose your favorite. Like, say you generate a scene instance image once, and eh, it's good not great, so you try it again and its worse, so you try it a third time, and hey its pretty good, but maybe not better then the first try, wouldn't it be ideal for the user to have a carasoul to choose from below.

        Additionally the master reference should default to most recent scene reference image of the asset (so scene 4's master reference of protaginist should be defaulted to scene 3's scene instance image; but the user should be able to carasoul through (and maybe switch to old image instance of the character))
    }}

    {{
        
        ## Can't Proceed without generating a scene instance image for each and every asset; which is annoying, as the point of stage 8 is just to add a "final polish" of the assets which you cared about getting right, so if there stuff you don't care about, you could just proceed without worrying about /customizing it; like just move forward ... This relates to Stage 5, which forces the users to likewise set every single asset, even if they don't specifically care about each and everyone. Though, with stage 5, there's the argumenet that everything should try to be defined, that way they can be used as source of truth for the future generations
    }}

### Stage 8:  See 1c-scene-asset-suggestions
  - id: issue-1c
    content: "Persist suggested assets: Create scene_asset_suggestions table, add backend routes, load/save suggestions in frontend"



### *Typesript ANY type posible runtime error check needed through files*
---------------------
---------------------
---------------------
# **For Functionality, Fidelity, & Quality Improvement**

## "
Like Please read these aspects of the prd and think with me how we can improve this experience.


"

## Focusing specifically on the regeneration boxes: egarding the regeneration box for Stage 4, and the stage pipeline graphic (sometimes they're green, other times yellow, despite being complete; not clear whats going on there)

### 1. Writing Capabilites & Written Style Capsules Effectiveness:

    1a. Improve the langauge / dialouge/ writing capabilites; really will take expirementing with prompting techniques
    
    1b. Get around censors, especially for raunchy dialouge and for the video generation of viloenet or "spicy" content (obviously nothing illegal)
    
    1c.  there's some more specialized tweaking that needs to occur with the actual system  prompts that are being applied in our pipeline, as they are doing a poor job introducing my written style capsules into the scriptmaking. If LLMs trully don't need pointed examples of writing then we may need to only have it for dialouge in particular, as this is a proven weakness with LLMs

    1d.  consider moving the writing style injection to only be involved with the script writing/dialouge 

    1e. Clearly some Evals need to be done on the effectiveness of the "system prompts" and how they are influencing the product of written generation

    1f. Should we have an added capability (think sorta like Style Capsules), perhaps it's own seperate tab on the lefthand sidebar, called "Custom System Prompts?

        Were the User can experiement and change the system prompt of how it actually transmute information and directs the generated content? (Probably Not, but worth Considering)

    1g. Clearly we just need a whole phase for evaluating the quality of the genertated content.

    
    We need the perfect prompt to apply assets into story (*BUT WE WILL GET THERE and should let claude give it a go first*)

### 2. Like other websites, have an stop pop up if the user tries to get out of page without saving


### 3 Test fidelity, consistent results and edge cases regarding: Treatment stage continues to fail to consistently properly format it's json in a string into 3 seperate versions. I beleived this issue was resolved eariler; did a change made in this session cause this? Investigate. 




### For Stage 5: 
    **General - Stage 5 + Productions Concerns over Asset / Visual Story Continutiy & How to tailor Frame Generations to have the key Info**:


    I worry about, for future scenes and frames: the ability of the frames to use things in proper context for thier generation; like how exactly will it take in the script info + asset descriptions/images and end up making the proper final frame product

    Like if the "asset" image is that of a gulag (but its the wide view), will it now to go into the workarea room of the gulag and use the asset, but with the proper dirt and darkness everywhere, like there is going to have to be a lot of finagling with words of the sytem prompts to get this exact right

    Moroever, We need continuity to persist, 

    For instace Maybe the opening and ending scene are absed in the Protaginist bedroom, we need to be able to go in, take that bedroom, and use it in the scenes (but maybe in the end the room has a big diploma on the wall that the protaginst won)

    Use of Regeneration text boxes will be key. and how thte system prompts are desifgned, alos key. 




---------------------
---------------------
---------------------
# **Strech Features** 


### *Allow for the "Story Rules" to persist things for all generation (both written and Visually generated) to always follow:
    
    "All Characters are egg, people of color are brown eggs, mexican and white people are white eggs"  all pets are different breakfast mog

    "Entire story is based in 1600's europe style" 

    etc.

### *Regarding Visual Style Capsule*
It may be best to allow a sort of scale / level of influence you want the visual style capsule to have on generations. 

### 
    Maybe we need like the perfect / ideal format for input documentation when building: "##Script: Y/N: ##Plot:  ##Dialouge Rules & Examples: ##Character Descriptions:  ##General Vibe:  ##Shots styles  ##Story Rules: 



## We are trying to make the lives of the animator easier ; master image added should be the key feature added 

### Production stage: lets discuss the rearview mirror, Is it really all that usefull 

### Stage-8: Change the Right Side-bar to say "Add new assets", fix the "Create Scene Asset" button to allow for users to actualy create a new asset, not open the asset drawer

### it would be so lit if it could scour the web for you and automatically make you the style capsule; "It should be able to aggentically grab for you possible key images for your lok, where you can chose which you want specifically, (like it finds you 5, you pick the one you like, maybe it goes and finds like 5 more and you got what you like OR you can choose NO (and give more rec) 

-----------------

# **Later-Day Goals** (Currently Out of Scope)

### 2. Introduce RAG for premimum users looking to create a more expanisve project:  https://chatgpt.com/share/695bf5c8-6454-8010-8b68-f1f9ffa7dbba

    We have removed RAG for now (push to strech goal) and will be reimplemented NOT for StYLE & TONE, that can be done through a simpler method than vector databasing/embeddings (which have proven to not even be that relaible for such a task) but we will need it if users have a ton fo story/character lore Or a massive universe of characters and settings they will want to reuse/ THOUGH, a non vectorized databse, if structured correctly, could also achieve the smae results. 

### Call the writing vault, "The Lore Library" or "Lorerary." 

    {{
    This could maybe evolve into something much more unique

    Like Image the User uses Aiuteur soley for his Animation series, maybe it could be quite helpful to have this ever growing directory of Lore for the character, the world/universe of the show, etc. 

    Here is where implementing 

    }}

# **Misc Product Notes**
 The value will come from really helping users get what they are looking for. The UI & cost aspects WILL NOT matter if not helping them get what they envision. Improvement in even the most marginal of scales will be monumental.