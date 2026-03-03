 Refactored Copy/Replace System (recommended)

  Redesign the frame interaction model around two clear concepts:

  Concept 1: Frame Sources — Every frame slot (start or end) can receive an image  
  from multiple sources:
  - AI generation (current)
  - Pixel-copy from adjacent shot frame (streamlined)
  - Upload from disk (new)

  All sources feed into the same carousel. The user picks which one to use.        

  Concept 2: Continuity Actions — Clear, direct buttons on each frame:

  ┌────────────────┬────────────────┬─────────────────────────────────────────┐    
  │     Button     │    Location    │              What it does               │    
  ├────────────────┼────────────────┼─────────────────────────────────────────┤    
  │ "Copy Previous │ Start frame    │ Literally copies the image into this    │    
  │  End"          │ header         │ frame's carousel as a variant           │    
  ├────────────────┼────────────────┼─────────────────────────────────────────┤    
  │ "Copy Next     │ End frame      │ Literally copies the image into this    │    
  │ Start"         │ header         │ frame's carousel as a variant           │    
  ├────────────────┼────────────────┼─────────────────────────────────────────┤    
  │ "Upload Image" │ Frame header   │ Opens file picker → modal asking "Use   │    
  │                │ (small icon)   │ as frame variant" or "Use as reference" │    
  ├────────────────┼────────────────┼─────────────────────────────────────────┤    
  │ "Use as        │ Adjacent to    │ Adds as reference image (current "Use   │    
  │ Reference      │ copy buttons   │ as Next Start" behavior, but clearly    │    
  │ Only"          │                │ labeled)                                │    
  └────────────────┴────────────────┴─────────────────────────────────────────┘    

  Key change: Copied/uploaded images become carousel entries alongside AI
  generations. The user picks which variant to lock in. This means:
  - Copy doesn't overwrite — it adds an option
  - Upload doesn't overwrite — it adds an option
  - The user always has control over the final selection

  The info popover (bottom-right) contains:
  - Current continuity mode and what it means
  - Which frame this was copied from (if any)
  - Stale warnings
  - All the flags about what buttons do

  "Link All" becomes "Match All (copy end→start)" and immediately executes the     
  copies (adding them as carousel variants, not overwriting).

  Pros: Flexible, non-destructive, clear mental model
  Cons: More work — needs carousel modification to support non-AI-generated        
  entries, upload endpoint, modal component)