←  ☐ Frame chaining  ☐ S9 cleanup  ☐ Regen default  ✔ Submit  →

For inheriting end frame as next shot's start frame — should this be a 
user-triggered button, automatic suggestion, or skip for now?

  1. User-triggered button
     A 'Use as Next Start' button appears on approved end frames. Clicking       
     copies/links the image as the next shot's start frame reference. User stays 
     in control.
  2. Automatic suggestion 
     When end frame is approved, toast/dialog suggests using it as next start.   
     User confirms or dismisses.
  3. Skip for now        
     Don't implement frame chaining yet. Focus on other improvements first. Can  
     add later.     
❯ 4. Type something.          


For Stage 9, you mentioned the 'Frame Prompt' and 'Video Prompt' section header  
badges feel unnecessary. My recommendation: remove those labels entirely and just keep the textareas with their lock toggles — the context is obvious. The only   
badge that matters is the AI end-frame recommendation (read-only). Agree?        

❯ 1. Remove labels, keep AI badge
     Remove 'Frame Prompt (Image Generation)' and 'Video Prompt (Video 
     Generation)' header labels. Keep textareas with lock toggles. Show read-only      AI end-frame recommendation badge only.
  2. Simplify labels only
     Keep section headers but simplify them to just 'Frame' and 'Video' without  
     the parenthetical descriptions. Less clutter but still labeled.
  3. Keep as-is
     Leave the current labels unchanged. They help new users understand which    
     prompt goes where.
  4. Type something.

The 'Both options' regen flow (LLM correction + manual edit) — when the user     
clicks Regenerate, what should they see first?

❯ 1. Correction input first (Recommended)
     Shows a small text input: 'Describe what to change...' with a 'Regenerate'  
     button. Below it, a subtle 'Edit prompt manually' link expands the full     
     textarea. Most users want quick corrections.
  2. Choice dialog first
     Small popover/dropdown with two options: 'Quick correction (AI-assisted)'   
     and 'Edit prompt manually'. User picks workflow before seeing any input.    
  3. Type something.