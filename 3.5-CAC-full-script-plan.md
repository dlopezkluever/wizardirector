Regarding Content Access Carousel:

Right now in the content access carousel (CAC), the user can only see the precise excert related to the scene. But what if the user wants to quickly review other parts of the script for reference purposes, even just to remember more how the sotry flows. I think it would be useful it the script view of the the content access carousel had basically the full script accessible, where the part of the script that is relevant to the scene is unchanged, but the other parts are greyed out

Whenever the contnet access carousel is uncollaped/extended from collapsed OR the tab is clicked to switch to it from a different tab in the CAC, it opens to the exact start of the scene's excert of the script, but if the users scrolls up, they can see the earlier parts of the script (like scrolling any document, scrolling up simply reveals the earliier parts and scrolling down reveals parts of the script afterward), the part of the script relevant to the scene, the excerpt, should have amber/yellow horizantol lines denoted the section of the script thats part of the script, and all the text thats not in the scene should be like greyed out.

Script extened view in the carousel. it should grow faint but never enough to be deemed illegible by a user. As the user scolls further from the core excerpt of the script, a button should appear, in this window that returns the user back to the start of the script excpert.

scrollable content, litterally with the script from stage 4, and the user can read to remeber where he is in the story. 

The amber/yellow horizontal lines marking the excerpt boundaries —      
should these be solid lines across the full width, or more subtle (e.g., left-border accent or partial-width rule)?

❯ 1. Full-width horizontal rules ✔
     Solid amber lines spanning the full content width at the top and   
     bottom of the scene excerpt, clearly sectioning it off.
  2. Left-side accent border
     A vertical amber bar on the left edge running along the entire     
     excerpt section, like a blockquote indicator.
  3. Partial-width centered rules
     Shorter amber lines (maybe 60% width, centered) at the top and     
     bottom — subtler but still clear.
  4. Type something.

For the progressive greying out: should the opacity fade be continuous  
(smoothly getting more transparent the further from the excerpt) or     
stepped (e.g., adjacent scenes at 70% opacity, scenes 2+ away at 50%)?  

❯ 1. Continuous gradient (Recommended)
     Opacity decreases smoothly based on pixel distance from the excerpt      boundaries. Closest content ~70% opacity, farthest ~35%. Natural, 
     scroll-distance-based.
  2. Per-scene stepped
     Each scene boundary steps down in opacity (adjacent scene: 70%, two      away: 55%, three+: 40%). Discrete jumps at scene boundaries.      
 3. Per-scene stepped
        Each scene boundary steps down in opacity, but they should never    get under 45%, so just keep the remained at 45% once the user is    
   past 3 scenes away:

 Should the full script show scene number labels/dividers between scenes 
(e.g., a subtle '— Scene 3 —' separator), or just display the raw       
continuous script text with only the headings (INT./EXT.) as natural    
dividers?

❯ 1. Raw continuous script
     No extra labels — the screenplay flows naturally. Scene headings   
     (INT./EXT.) are the only visual boundaries, just like a real       
     script.
  2. Subtle scene labels ✔
     Small, muted scene number indicators between scenes (e.g., 'Scene  
     3') to help orientation while scrolling through unfamiliar parts.  
  3. Type something.  

---

 Ready to code?

 Here is Claude's plan:
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌ Full Script View in Content Access Carousel

 Context

 The CAC script tab currently shows only the current scene's excerpt.   
 Users want to scroll through the full script for story context while   
 working in Stages 6-12. The current scene's excerpt remains the focal  
 point, with surrounding script content visible but progressively       
 faded.

 File to Modify

 - src/components/pipeline/ContentAccessCarousel.tsx (sole file — all   
 changes contained here)

 Implementation Steps

 1. Refactor ScriptExcerptContent into FullScriptContent

 Replace the component signature:
 // OLD: function ScriptExcerptContent({ scriptExcerpt }: {
 scriptExcerpt?: string })
 // NEW:
 interface FullScriptContentProps {
   scenes: Scene[];
   currentSceneId: string;
   autoScrollTrigger: number; // incremented to trigger
 scroll-to-excerpt
 }
 function FullScriptContent({ scenes, currentSceneId, autoScrollTrigger 
  }: FullScriptContentProps)

 2. Build full script from all scenes

 Inside the component, use useMemo to:
 - Sort scenes by sceneNumber, filter out those without scriptExcerpt   
 - Find currentSceneIndex within the ordered array
 - Pre-parse each scene's excerpt with existing parseScriptLines() →    
 parsedSections[]

 3. Per-scene stepped opacity

 Helper function:

 ┌───────────────────────┬──────────────┐
 │ Distance from current │   Opacity    │
 ├───────────────────────┼──────────────┤
 │ 0 (current)           │ 1.0          │
 ├───────────────────────┼──────────────┤
 │ 1                     │ 0.70         │
 ├───────────────────────┼──────────────┤
 │ 2                     │ 0.55         │
 ├───────────────────────┼──────────────┤
 │ 3+                    │ 0.45 (floor) │
 └───────────────────────┴──────────────┘

 Applied as style={{ opacity }} on each scene section wrapper.

 4. Amber boundary lines

 Full-width 1px amber horizontal rules (bg-amber-500/70) rendered       
 immediately before and after the current scene's content section only. 

 5. Subtle scene divider labels

 Between each scene section (not before the first), render a centered   
 label:
 ——— Scene 3 ———
 Using text-[10px] text-muted-foreground/60 with h-px bg-border/30      
 lines on each side.

 6. Refs and auto-scroll logic

 - scrollAreaRef on the ScrollArea (refs to Radix Root)
 - currentSceneRef on the current scene's content div
 - scrollToCurrentScene() callback: queries
 [data-radix-scroll-area-viewport] child, scrolls to
 currentSceneRef.offsetTop
 - useEffect on autoScrollTrigger fires scrollToCurrentScene after      
 250ms delay (matches expand animation)

 7. "Back to excerpt" floating button

 - Track scroll position via viewport scroll event listener
 - showBackButton state: true when current scene section is not
 substantially visible in viewport
 - Render: position: absolute, bottom-right, amber pill button with     
 AnimatePresence fade-in/out
 - Clicking calls scrollToCurrentScene()
 - Wrap the entire component return in a relative container div so the  
 button anchors correctly

 8. Wire auto-scroll triggers in parent

 In the main ContentAccessCarousel component:
 - Add scriptScrollTrigger state (counter)
 - Increment in expand toggle (line ~1056) when expanding AND script    
 tab is active
 - Increment in handleTabClick (line ~1020) when switching TO script    
 tab
 - Pass as autoScrollTrigger prop to FullScriptContent

 9. Update invocation site (line ~1086)

 // OLD: <ScriptExcerptContent
 scriptExcerpt={currentScene?.scriptExcerpt} />
 // NEW:
 <FullScriptContent
   scenes={scenes ?? []}
   currentSceneId={sceneId}
   autoScrollTrigger={scriptScrollTrigger}
 />

 Reused Existing Code

 - parseScriptLines() (lines 178-233) — screenplay line parser,
 unchanged
 - ScrollArea from @/components/ui/scroll-area — Radix-based scrollable 
  area
 - motion, AnimatePresence from framer-motion — already imported        
 - FileText icon from lucide-react — already imported
 - Screenplay CSS styles record (heading, action, character, etc.) —    
 hoisted from old component

 Edge Cases

 - No scenes / no excerpts: Show existing empty state message
 - Current scene not found (data loading): currentSceneIndex = -1, all  
 scenes at 100% opacity, no amber lines, no auto-scroll
 - Single scene: Full script = excerpt, amber lines still render, back  
 button never appears
 - Viewport selector missing: Auto-scroll silently no-ops (no crash)    

 Verification

 1. npm run lint — check for new errors in the modified file
 2. Manual testing:
   - Navigate to any Stage 6-12 scene view
   - Verify CAC script tab shows full script with current scene at full 
  opacity
   - Verify surrounding scenes fade in stepped fashion (70% → 55% →     
 45%)
   - Verify amber lines bracket the current scene excerpt
   - Verify "— Scene N —" labels appear between scenes
   - Collapse and expand CAC → should auto-scroll to current excerpt    
   - Switch to another tab and back to Script → should auto-scroll to   
 current excerpt
   - Scroll away from excerpt → "Back to excerpt" button appears        
 bottom-right
   - Click button → smooth scroll back to excerpt start
   - Verify text never becomes illegible (45% opacity floor)

   --

   Can you just adjust it so it the default opening shows the above yellow line as well, like have it open a hair more down than it is, as it's too tight on the first line of the relevant script excert. and like make it so when the script tab is opened it auto mattically defaults to being open at the right part instead of scrolling down in that animation type look, like i dont want to see if scroll back when opened, but only when the but "Back to Excerpt" is pressed should it scoll back, do you understand?