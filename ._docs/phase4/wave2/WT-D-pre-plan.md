okay I need your help here.  read the following document: 'c:/Users/Daniel Lopez/Desktop/Aiuteur/wizardirector/._docs/phase4/wave2/WT-D-task.md' it has unrefined and scrutinized ideas for new enhancements for our project. the ideas are rough and       
  disorganized, so I want you to help me pin it down, and then, once we know exactly what we want to do, please edit the doc 'c:/Users/Daniel Lopez/Desktop/Aiuteur/wizardirector/._docs/phase4/wave2/revised-WT-D-task.md' with all it's specs to fully      
  map out the feature so it can be impelmented by an agent later. Use the AskUSerQuestion tool to interview me on anything that is unclear, any                                                                                                               
    suggestions you have, or any concnerns or tradeoffs, reallly anything at all that will help you understand how to map out this feature to it's optimal functionality.   NOTE:  For task 4D.2 - Fix Asset Inheritance in Frame Generation: To              
  illustrate the problem, here is an example:  "Image 3"  has the character assets for a scene, yet Image 2'c:/Users/Daniel Lopez/Desktop/Aiuteur/wizardirector/ui-images/hg0gen.PNG' is what was generated in stage 10. Its a completly different visual     
   style (cinematic drawing, not old style disney animation). Maybe it would be good to have IN THE UI, not to large, but just little thumbnails, of the images that are being linked/set/attached in the prompt for the generation of the frame prompt,      
  by that, I mean like you can see the image right there and it kinda confirms to the user that the image is bieng used in the image generation... more over, the prompt could ultiamtely  use langauge "like, the boy in blue, as seen in the __{enter       
  file name Or Image #1, whatever is best}___ image attached, is....". Doing this could come to help us not have to be so overly detailed with describing visuals, and allow for the prompt to instead be focused on Misc-en-scene, framing/positioning       
  of characters                                                                                                                                                                                                                                               
                                                                                                                                                                                                                                                              
  ⎿  [Image #3]

● Let me start by reading the task document and exploring the relevant codebase areas.

● Read 2 files (ctrl+o to expand)

● I can see the task document and the images you shared. The character asset (Hansel) is clearly Disney-style animation, but the generated frame is a completely different cinematic/realistic style — that's a clear inheritance failure. Let me explore the 
  codebase to understand the current implementation before asking you questions.

● 3 Explore agents finished (ctrl+o to expand)
   ├─ Explore frame generation backend · 23 tool uses · 89.3k tokens   
   │  ⎿  Done
   ├─ Explore Stage 10 frontend + types · 26 tool uses · 60.2k tokens  
   │  ⎿  Done
   └─ Explore video provider + prompt gen · 26 tool uses · 72.1k tokens
      ⎿  Done

● Great, I now have a thorough understanding of the entire system. Let me share what I found and ask you some clarifying questions.

  Key findings:
   
  4D.2 (Asset Inheritance) - Root cause confirmed: frameGenerationService.generateFrames() never fetches scene asset instances or their images. It only passes the text prompt + style capsule to the image API. The NanoBananaClient already supports        
  multiple reference images (first = subject identity, rest = style), so the plumbing exists — it's just never called for frame jobs.

  4D.1 (End Frames): The UI already has end frame panels, and requiresEndFrame is set by a rule-based heuristic in Stage 9. But the end frame prompt is just the start prompt + " [End of shot - showing action completion]" appended — very naive.

  Let me ask some questions to nail down the design:

● User answered Claude's questions:
  ⎿  · For 4D.2 — Which asset reference images should we attach to frame generation calls? Scene instance images (from Stage 8) are scene-specific but may not exist for every asset. Master asset images (Stage 5) always exist. Angle variants exist        
     for characters. We also need to keep style capsule images. The Gemini model handles multiple images but there's a practical limit before it gets confused. What's your priority? → Scene instance first, master fallback
     · For 4D.1 — The end frame toggle. Currently `requiresEndFrame` is set by an AI heuristic (movement, dialogue, long duration). You want a per-shot toggle in Stage 9. How should this interact with the heuristic? → Heuristic sets default, user        
     overrides
     · For 4D.1 — How should the end frame prompt be generated? Currently it's just the start prompt with a generic suffix appended. You mentioned it should convey 'what this scene looks like 8 seconds later after the action occurred.' → LLM 
     generates on-demand in Stage 10
     · For 4D.2 UI — You want thumbnails showing which reference images are being used in generation. Where should these appear in Stage 10? → Inside FramePanel, below the frame

● Excellent choices. A few more targeted follow-ups:

● User answered Claude's questions:
  ⎿  · For end frame generation on-demand in Stage 10: When the user clicks 'Generate End Frame', should we (a) auto-generate the end frame prompt via LLM AND immediately kick off image generation in one step, or (b) first show the generated end         
     frame prompt for the user to review/edit, then let them click 'Generate Image'? Option (a) is faster, option (b) gives more control. → Two-step: review prompt, then generate
     · For the reference image prompting strategy (4D.2): You mentioned wanting prompts to say things like 'the boy in blue, as seen in Image #1 attached.' Should the LLM frame prompt (generated in Stage 9) explicitly reference numbered images, 
     knowing which asset images will be attached at generation time? This means Stage 9 prompt gen needs to know the exact image lineup. → Yes, numbered image references in prompt (Recommended)
     · Should the approved start frame image be used as an additional reference when generating the END frame? This would help ensure visual continuity between start and end frames of the same shot. → Yes, use approved start frame as reference 
     (Recommended)

● All the key decisions are locked in. Let me now design the detailed implementation plan.

● Plan(Design implementation plan)
  ⎿  Done (42 tool uses · 129.5k tokens · 3m 49s)
  (ctrl+o to expand)

● Good, the Plan agent produced comprehensive results. Let me verify a few specifics before writing the final plan.

● Searched for 8 patterns, read 1 file (ctrl+o to expand)     

● Good — the file exists but is empty, and I've confirmed all the key file paths and patterns. Let me write the final plan.

● Updated plan
  ⎿  /plan to preview

────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── Ready to code?

 Here is Claude's plan:
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌ Plan: Write Revised WT-D Task Spec

 Context

 Stage 10 (Frame Generation) has two critical issues:
 1. 4D.2: Generated frames completely ignore asset reference images (characters, locations, props). The frameGenerationService only sends text prompts + style capsule to the image API — no actual asset images. This causes frames to look nothing like the 
  established visual style/characters.
 2. 4D.1: End frames are barely supported — the prompt is just the start prompt + a generic suffix. Users need a toggle to control end frames per-shot and a proper two-step workflow (generate prompt → review/edit → generate image).

 The user wants a comprehensive spec document written to ._docs/phase4/wave2/revised-WT-D-task.md that fully maps out both features so they can be implemented by an agent later.

 What I'll Write

 A single detailed spec document covering:

 Task 4D.2 — Fix Asset Inheritance in Frame Generation

 - Root cause: frameGenerationService.generateFrames() never fetches scene_asset_instances or passes their images to createImageJob()
 - Image priority: Scene instance image → master asset image (fallback), angle variants for characters when camera matches, style capsule images still included
 - Numbered image references: Stage 9 prompt gen assigns numbers (Image #1: Hansel, Image #2: Forest) and the LLM references them in the frame prompt
 - Thumbnail UI: Small 32-40px thumbnails inside FramePanel below each frame showing which reference images were used
 - Files to modify: frameGenerationService.ts, ImageGenerationService.ts, promptGenerationService.ts, frames.ts, FramePanel.tsx, Stage10FrameGeneration.tsx, scene.ts
 - DB migration: reference_image_order JSONB column on shots table

 Task 4D.1 — End Frame Generation

 - Toggle: Heuristic sets default, user overrides per-shot in Stage 9 (badge becomes clickable toggle)
 - End frame prompt: LLM generates on-demand in Stage 10 (new endpoint)
 - Two-step workflow: Generate prompt → review/edit in textarea → generate image
 - Start frame as reference: Approved start frame image is primary reference for end frame generation
 - Files to modify: promptGenerationService.ts, frameGenerationService.ts, frames.ts, frameService.ts, Stage9PromptSegmentation.tsx, FramePanel.tsx, Stage10FrameGeneration.tsx, scene.ts
 - DB migration: end_frame_prompt TEXT column on shots table

 Implementation order, data flows, specific function changes, and verification steps

 Critical Files

 - backend/src/services/frameGenerationService.ts — Core: asset image fetching, threading refs, end frame methods
 - backend/src/services/image-generation/ImageGenerationService.ts — referenceImageUrls[] support
 - backend/src/services/promptGenerationService.ts — Numbered image refs, generateEndFramePrompt()
 - backend/src/routes/frames.ts — New endpoints
 - src/components/pipeline/FramePanel.tsx — Thumbnails + two-step end frame UI
 - src/components/pipeline/Stage9PromptSegmentation.tsx — End frame toggle (line 468)
 - src/components/pipeline/Stage10FrameGeneration.tsx — Wire new mutations
 - src/types/scene.ts — Type updates

 Verification

 - After writing the spec, review it against the original WT-D-task.md to ensure all items are addressed
 - Ensure the spec is detailed enough for an implementation agent to execute without ambiguity
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌