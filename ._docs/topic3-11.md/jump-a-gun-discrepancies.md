
## **Start prompt for dealing with discreptencaies**:

You are a senior engineer and product architect. Your job is NOT to write code — it's to
produce self-contained planning / spec documents so implementation can happen in clean, focused sessions, based off a complete understanding of the situation and help me build a tight, implementable spec for what we must do to reconcile the situation.

Here is the situation:  We have found the following discrepacies (read: 'c:/Users/Daniel     
  Lopez/Desktop/Aiuteur/wizardirector/._docs/topic-location/3.7-locat  
  ion-rd-1-discrepancies.md') in the way we have built out the tasks   
  so far in relation to our source of truth planning/ spec  document:  
  'c:/Users/Daniel Lopez/Desktop/Aiuteur/wizardirector/._docs/topic-   
  location/3.7-location-system-enhancement-(master-doc).md' Our task is to determine what we must still do to be complete with the location system enhancement, by doing the following:

---

STEP 1 — Investigate first.
Make sure you understand the relevant parts of the codebase this feature deals with. Understand what exists today before forming any opinions.

STEP 2 — STEP 2 — Scrutinize the spec and Interview me.
Flag contradictions, ambiguities, redundancies, concerns And recommendations.
Use `askUserQuestion`. Ask about anything unclear, any tradeoffs worth surfacing, and your own recommendations. Cover all aespects, from UX decisions, data model implications, scope and anything in my notes that conflicts or is underspecified. Share your opinions — don't just present neutral options when you have a better answer.
Note: Make sure to Surface anything I missed.
Before writing anything, flag: adjacent problems worth fixing now, potential regressions, and sequencing
dependencies known rough edges, any partial implementations of spec features that were missed regard the subject at hand.

Once all these fleshing out is done, and it is clear what is to be done;

STEP 3 — Write one markdown planning doc per implementation phase.
Each doc must be fully self-contained. Include:

## Problem Statement / ## Core Goal / ## Relevant Files (path + why)
## Current State / ## Implementation Notes / ## Dependencies / ## Notables


--

*Your prompt is here: 'c:/Users/Daniel Lopez/Desktop/Aiuteur/wizardirector/._docs/discrepancies.md';* key      
files: The discrepancies:  'c:/Users/Daniel Lopez/Desktop/Aiuteur/wiza 
rdirector/._docs/topic-location/3.7-location-rd-1-discrepancies.md';   
The original master spec doc: 'c:/Users/Daniel 
Lopez/Desktop/Aiuteur/wizardirector/._docs/topic-location/3.7-location 
-system-enhancement-(master-doc).md'*

*Questions*:

*KEY QUESTIONS*: 

**I actually don't even see the direction badge listed clearly in stage 7 at all, like the user would have no clue what the direction is, when this should be making an intelligent decision based off anything made (like direction wise) for a location in stage 5, and if therre's nothing then it should make educated shot decisions *maybe add an option in stage 6 ->7 to ahve alot of diiferent views or just 1 or 2, like tell the extraction how creative it should get with it's shot assiagment decisons (maybe a whole "shot directior style thing" where the user is to dictate how the shots should be made (super dynamic, or only minimal 1 wall if possible shooting. ))

←  ☐ Stage 7 UI  ☐ Stage 9 UI  ☐ View over…  ☐ Batch gen…  ✔ Submit  → 

The spec says Stage 7 should let users 'review/edit direction
assignments after shot list generation.' But Stage 8's coverage panel  
already handles direction editing with full context (coverage status,  
image previews, unmatched shot dropdowns). Adding full editing in Stage 7 duplicates this. My recommendation: Stage 7 gets a read-only        
direction badge in the shot inspector (shows assigned direction        
name/alias), with a lightweight dropdown to reassign if needed — but   
Stage 8 remains the primary editing surface. What's your preference?   

❯ 1. Read-only badge + light edit (Recommended)
     Show assigned direction as a tag/badge in the shot inspector.     
     Clicking it opens a simple dropdown to reassign. No coverage      
     context — that stays in Stage 8.
  2. Full direction editing UI
     Add a dedicated direction assignment section in Stage 7 with      
     thumbnails, coverage hints, and per-shot dropdowns. More
     duplication with Stage 8 but gives immediate control.
  3. Read-only only, no editing
     Just show the assigned direction name/alias as a non-interactive  
     label. All editing deferred to Stage 8. Minimal scope.
  4. Type something.
─────────────────────────


  ←  ☐ Stage 7 UI  ☐ Stage 9 UI  ☐ View over…  ☐ Batch gen…  ✔ Submit  → 

The spec says Stage 9 directions should be 'visible AND editable' — but Stage 9 is the prompt review stage. If a user changes a direction     
assignment here, it invalidates the generated prompt (different        
reference images, different delta description). They'd need to
regenerate, which defeats the purpose of reviewing. My recommendation: 
Stage 9 gets read-only visibility (direction labels on reference       
thumbnails, delta warning badges) but NOT editing. Does that match your intent, or do you actually want editing here?

❯ 1. Read-only visibility (Recommended)
     Label reference thumbnails with role (MAIN REFERENCE / SPATIAL    
     CONTEXT), show direction alias, display delta warnings. No editing      — changing directions would invalidate prompts.
  2. Visible + editable with regen
     Show direction info AND allow reassignment. Changing a direction  
     marks the shot's prompts as stale and requires regeneration. More 
     complex but matches spec literally.
  3. Skip Stage 9 changes entirely
     The prompt text already contains delta descriptions and direction 
     context. Users can read it in the prompt. No structured UI needed.
  4. Type something.

  ←  ☐ Stage 7 …  ☐ Stage 9 …  ☐ View overrides  ☐ Batch ge…  ✔ Submit  →

The spec mentions 'scene-specific view overrides' (e.g., damaged       
kitchen for one scene). This would require new DB fields/table, new UI 
in the coverage panel, and prompt generation changes. The character    
override pattern (description_override on SceneAssetInstance) doesn't  
directly translate — location views are image-based, not text-based. A 
per-scene location view override would need per-scene image variants.  
Should we build this now, or defer?

❯ 1. Defer to future iteration (Recommended)
     This is an edge-case feature for advanced workflows. The system   
     works correctly without it. Scope it as a separate future         
     enhancement.
  2. Build description override only
     Add a text description_override for location views per-scene (like      characters have today). No per-scene image variants — just       
     description changes that affect prompts.
  3. Build full image + description override
     Full per-scene location view variants: different images and       
     descriptions per scene. Significant scope — new table, new UI,    
     prompt generation changes.

     ←  ☐ Stage 7 …  ☐ Stage 9 …  ☐ View ove…  ☐ Batch gen flow  ✔ Submit  →

The spec describes a propose → review → confirm flow for batch         
generation. Currently it's one-click ('Generate N Missing Views').     
Since Stage 7 already creates directions with 
names/aliases/descriptions, there's nothing to 'propose' — the views   
already exist, they just need images. Should we add a confirmation     
dialog, or keep the current one-click approach?

❯ 1. Keep one-click (Recommended)
     Current approach is fine. Directions already exist with metadata. 
     One-click is lower friction. The per-direction Sparkles button    
     already gives granular control.
  2. Add confirmation dialog
     Show a dialog listing which views will be generated (name, alias, 
     reference image that will be used as style input) before starting.      Adds review step without full proposal flow.
  3. Full proposal flow per spec
     Build the propose → review → edit → confirm flow. User can edit   
     aliases/descriptions before generation, remove views from batch,  
     etc. Matches spec literally.
  4. Type something.


( ---
  Investigation Summary

  Area: Stage 7
  Current State: Two-panel layout (shot list + inspector). Inspector   
    edits: duration, action, dialogue, characters, setting, camera     
    (free-text), beatReference. Camera metadata fields
  (camera_distance,
     camera_height, camera_direction_id) exist on Shot type but zero UI   
     exposure.
  ────────────────────────────────────────
  Area: Stage 9
  Current State: Cards/timeline view. Shows reference image thumbnails 
    (8×8px, hover card with image + name + type badge). Backend        
    correctly generates direction matches, delta descriptions, role    
    fields — but none of this is  surfaced to the UI. No distinction   
    between direction view and establishing view in thumbnails.        
  ────────────────────────────────────────
  Area: Stage 8 Coverage Panel
  Current State: Fully functional: per-location collapsible sections,  
    direction groups with image status, source badges
    (User/Established/Inferred), unmatched shots with direction        
    dropdowns, per-direction Sparkles generate button, batch "Generate 
  N
     Missing" button. No  scene-specific override mechanism.
  ────────────────────────────────────────
  Area: Override Pattern
  Current State: Characters use description_override on
    SceneAssetInstance → computed effective_description.
    VisualStateEditorPanel in Stage 8 provides the UI. Location views  
    are project-level only — no per-scene variant mechanism.

  ---  STEP 2 — Scrutinizing the Spec

  I have several flags, contradictions, and recommendations to surface.)