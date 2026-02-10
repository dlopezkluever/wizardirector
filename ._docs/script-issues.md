  ---
  Investigation Report: Script Format & Extraction Bugs 

  Problem Summary

  Three interconnected bugs after the 3WT-1 merge:
  1. Script displays raw <center> HTML tags and > blockquotes instead of proper screenplay formatting
  2. Entity extraction categorizes "FADE OUT." as the only character, real characters (ELARA, FATHER, KING) as props
  3. 500 error "Failed to insert new scenes" when unlocking/re-approving Stage 4

  ---
  Root Cause #1: Missing stripHtmlTags in one code path

  File: src/lib/services/scriptService.ts:504

  parseScriptResponse() has two code paths, but only one strips HTML tags:

  - Path A (line 499 — LLM returns JSON): stripHtmlTags() IS called at line 524
  - Path B (line 501-511 — LLM returns plain text): stripHtmlTags() is NEVER called

  // Path B (catch block) - HTML tags preserved!
  const formattedScript = cleanedContent; // <-- No stripHtmlTags!
  const scenes = this.extractScenes(formattedScript);
  return { formattedScript, scenes, ... };

  When the LLM returns the script as raw text (not JSON-wrapped), <center>CHARACTER</center> and > dialogue survive into the formattedScript. This is the primary trigger for everything downstream.  

  ---
  Root Cause #2: parseScriptToTiptapJson can't handle <center> tags

  File: src/lib/utils/screenplay-converter.ts:85-140

  The state-machine parser expects standard screenplay format:
  FATHER
  Still dreaming, little sparrow?

  But receives:
  <center>FATHER</center>
  > Still dreaming, little sparrow?

  What happens:
  - <center>FATHER</center> → doesn't match CHARACTER_RE (starts with <, not uppercase letter) → classified as action node
  - > Still dreaming... → doesn't match any special pattern → classified as action node
  - FADE OUT. → matches CHARACTER_RE (uppercase + dots) but NOT TRANSITION_RE (trailing . breaks the regex ^(FADE\s+(IN|OUT)|.*TO:)\s*$) → classified as character, becomes the only dialogueLine node   with text "FADE OUT.:"

  So the tiptapDoc has: all dialogue as action nodes, and "FADE OUT.:" as the sole dialogueLine.

  ---
  Root Cause #3: scriptManifest.ts extraction follows the malformed tiptapDoc

  File: backend/src/utils/scriptManifest.ts:144-256

  The extraction reads the broken tiptapDoc:

  1. extractCharacters() (line 148-149): Scans only dialogueLine nodes → finds only "FADE OUT.:" → parseDialogueLine("FADE OUT.:") returns { characterName: "FADE OUT." } → only character extracted  
  2. extractCapsProps() (line 210-256): Scans action nodes for CAPS words → finds ELARA, FATHER, KING, PIPKIN, etc. in the action text (since <center>ELARA</center> was classified as action) → These   are NOT in knownCharacterKeys (which only contains "FADE OUT.") → all real characters classified as props
  3. CAPS_IGNORE_SET (line 201): Contains "FADE" but NOT "FADE OUT" or "FADE OUT." → the multi-word transition leaks through

  This propagates to the scenes.expected_characters / expected_props DB columns, which aggregatePreview() reads for the extract-preview.

  ---
  Root Cause #4: 500 error on scene re-insertion

  File: backend/src/routes/projects.ts:928-938 + migration 003

  The scenes table has a UNIQUE(branch_id, scene_number) constraint. The scene persistence logic matches existing scenes by slug:scene_number key. When:

  1. User unlocks Stage 4 and makes edits
  2. The scene slug changes slightly between the original extraction and re-extraction (due to <center> tags being stripped/added changing the heading text)
  3. The lookup key ${slug}:${sceneNumber} doesn't match the existing scene
  4. The system tries to INSERT instead of UPDATE
  5. UNIQUE(branch_id, scene_number) constraint fires → 500 error

  Additionally, deleted scenes from previous attempts are only marked continuity_broken (not actually deleted), so their branch_id + scene_number rows still occupy the unique constraint space.      

  ---
  Visual Summary (Image #1 vs #2)
  ┌────────────┬───────────────────────────────────────────────────┬──────────────────────────────────────────────────────────────┐
  │            │                 Image #1 (BEFORE)                 │                       Image #2 (AFTER)                       │
  ├────────────┼───────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────┤
  │ Format     │ Standard screenplay via dialogueLine nodes        │ Raw <center> tags and > blockquotes in action nodes          │
  ├────────────┼───────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────┤
  │ LLM Path   │ JSON response → stripHtmlTags() called            │ Plain text response → no tag stripping                       │
  ├────────────┼───────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────┤
  │ Extraction │ Characters correctly identified from dialogueLine │ Only "FADE OUT." found as character; real characters → props │
  └────────────┴───────────────────────────────────────────────────┴──────────────────────────────────────────────────────────────┘
  ---
  Bugs to Fix (in priority order)

  1. scriptService.ts:504 — Add stripHtmlTags() to Path B (the catch/plain-text branch). This prevents <center> tags from ever entering the system.
  2. screenplay-converter.ts — Add resilience to handle <center>CHARACTER</center> lines (strip HTML tags before character detection, or detect the pattern explicitly).
  3. screenplay-converter.ts:20 — Fix TRANSITION_RE to match FADE OUT. with trailing period: change to /^(FADE\s+(IN|OUT)\.?|.*TO:)\s*$/i
  4. scriptManifest.ts:201 — Add multi-word transitions to CAPS_IGNORE_SET: "FADE IN", "FADE OUT", "FADE TO".
  5. projects.ts scene persistence — Improve the matching logic to handle slug variations (e.g., match by scene_number alone as fallback, or delete-then-insert instead of relying on slug matching). 

  Would you like me to implement these fixes?