## FUTURE ENHANCEMENTS (Post-5.3)

1. **Tag Templates** - Predefined tag sets for common scenarios (e.g. "Fight Scene" = [bloody, torn, sweaty])
2. **Tag History** - View when tags were added/removed across scenes (Task 7)
3. **Bulk Tag Operations** - Add/remove tags for multiple assets at once
4. **Tag Search in Global Assets** - Filter project assets by tags in Asset Drawer
5. **Tag-Based Prompt Injection** - Automatically enhance image prompts based on tags (e.g. "muddy" → "covered in mud, dirty, realistic grime")
6. **Tag Severity Levels** - "light muddy" vs "heavy muddy" for granular control
7. **Tag Conflict Detection** - Warn if incompatible tags applied (e.g. "clean" + "muddy")
8. **Tag Analytics** - Dashboard showing tag usage across project



## **Stage 5 issues:**


## Ability to bulk delete, and make them all starting status collapsed when displayed (assets) that way you can remove rapidly 

------------------


------
We are the process of building out & improving the functionality of the stage 5 feature: (that's described in it's basic form here: @project-overview.md (481-495) ;  @project-overview.md (172-185)  Now, he have recently implemented the following:@phase-3-consolidated-implementation-summary.md  and now, I want to make the following enhancement: "


----------


------------

## **Future Improvement**

We need to allow voice cloning insertion OR the ability for the USER to use thier voice recording FOR each video generation; like have the characters mouths be matching to the entering in audio/voice recording of dialouge. 

Especially if User goes off script (thinks of somethign funnier in recording) the video should try to match it.

"That is one Bulging Banana!" Character "mouths/lip-it" it perfectly timed to the audio, WITH the same underlying emotion "Excited" / "Neutral" / "Bored" / "Happy" / "Over-joyed" / "Terrified" .. etc. etc. 

----------
---

**SHOT-List (Stage 7) needs more care in UI & functionality; quite a weak stage currently**
Possible enhancements

1. Adding a collapsible right sidebar view (or a pull/extendable window view from below) to see the exact sections of the Script/Beat-Sheet (relevant to shot) 
2. Making the Merge/Split keep the dialouge (though of course can be edited by the user; needs to be smart, like will know where the dialouge should be if split, or know how to combine when merged

---

# *Do note 4 video production*:
The default maximum duration for a single, initial video generated via the Veo API is 8 seconds, but the API allows for extending videos up to a total of 148 seconds. 
Video Durations in the Veo API
Initial Generation: By default, Veo models (including 3.0 and 3.1) generate videos in segments of 4, 6, or 8 seconds. The 8-second length is the most common single-generation limit.
Video Extension: The Veo API offers a video extension feature that allows users to seamlessly append new content to an existing clip.
Each extension adds a fixed amount, typically 7 seconds, to the video.
You can chain up to 20 extensions from an original clip, for a maximum total length of 148 seconds in a single merged file. This process maintains visual and stylistic consistency. 
Video generation and extension features can be implemented using the Gemini API documentation or the Vertex AI documentation. 

---
Do note, the 

---

# *Post Phase 4 into 5 thoughts*:
## 3: Making the scenes more descriptive; like the shot information is quite lazy ESPEICALLY IF WE FIND THE FRAME GENERATION IS JUST PRODUCING COMPLETELY IN COHERENT STUFF

Maybe worth caring about the ability to "extend" a shot feature of veo 3 & SORA


## 4:  Consider making there be more directionality in the viusal description of the shot (and these shots should be kinda understanding ther place/continiutiy between the shot prior and after, like they should be knowing to keep these contingent).. also allow for users to submit like a "rough sketch" for those who like to

like ESPECIALLY if they are shitty-quick story board entusiasts (maybe can be even a stage 1 input); where the systems goal is to make a plot that revolves around the storyboard (and written materals as well)

Like if it could identifiy a storyboard + where scenes are listed as 1A 1b 1c, 2a etc, and the script/outline also has those labels written for when things occur, so that the inputed script/written story/outilne, is matched with the storyboard, the system should be able to have a mode that takes that shit and runs with it. (you wouldn't even need stages 2-4; and 6,7, should reaally not be need to do a ton of "creative work" but rather, distilling, categroizing, you know)

____________


The "Parameter 'X' implicitly has an 'any' type" error in TypeScript occurs when the compiler cannot infer a variable's or function parameter's type from its context, and it defaults to . This happens when the  option (which is part of the recommended  mode) is enabled in your  file, enforcing better type safety. [1, 2, 3]  
How to Fix the Error 
The best solutions involve providing explicit types to maintain type safety: 

• Add explicit type annotations This is the preferred method to fix the error. By explicitly defining the type, you ensure the compiler knows how the variable or parameter should be used. 
• Use  for unknown types If you genuinely don't know the type of a value, using  is a type-safe alternative to . The  type forces you to perform type checks (narrowing) before you can use the value or access its properties, which prevents runtime errors. 
• Use Generics For functions that handle a variety of types in a predictable way, generics allow you to write reusable code while still maintaining type information. 
• Explicitly use  (sparingly) In situations where type information is truly dynamic (e.g., interfacing with a legacy JavaScript library without type declarations), you can explicitly set the type to . This disables type checking for that specific variable or section of code. [5, 6, 7, 8, 9]  

Disabling the Error (Not Recommended) 
While not recommended for robust code, you can disable the check globally in your  file by setting  to  under : [10, 11, 12]  
This approach is discouraged as it removes one of TypeScript's primary benefits and can hide potential runtime bugs. [13, 14]  

AI responses may include mistakes.

---

## Might be neccessary: If you want, next step can be refining the “Create scene asset” flow (e.g. inline form vs drawer) or adding job polling for bulk image generation.
