
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