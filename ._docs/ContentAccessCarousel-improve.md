
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌ ContentAccessCarousel — Bug Fixes & Improvements

 Context

 The ContentAccessCarousel (replaced the old RearviewMirror) was implemented in 4WT-1 and works end-to-end, but has several UX issues discovered during testing: the drag-to-resize feels inconsistent/stuck, the selected tab resets when collapsing/expanding, tab order    
 puts the less-used Rearview first, and content doesn't scroll when it overflows. Additionally, the audit found a Rearview text off-by-one bug.

 Single file to modify: src/components/pipeline/ContentAccessCarousel.tsx

 ---
 Fix 1: Drag-to-resize animation fighting (inconsistent drag)

 Root cause: Framer Motion's transition={{ duration: 0.2 }} on the content motion.div (line 590) triggers a 0.2s ease-in-out animation on every pixel of drag. The animation engine constantly interpolates toward a moving target, creating lag.

 Fix (line 590):
 // Before:
 transition={{ duration: 0.2, ease: 'easeInOut' }}
 // After:
 transition={{ duration: isDragging ? 0 : 0.2, ease: 'easeInOut' }}

 Dragging becomes instant; collapse/expand keeps the smooth animation.

 ---
 Fix 2: Tab doesn't persist on collapse/expand

 Root cause: AnimatePresence unmounts the carousel on collapse, destroying the Embla instance. On re-expand, a new Embla carousel starts at position 0. The activeTabIndex state IS preserved, so the TabBar highlights correctly, but the carousel content shows slide 0.    

 Fix: Add a useEffect after the existing carouselApi sync effect (~line 443) that scrolls the new carousel to the preserved tab on re-mount:

 useEffect(() => {
   if (carouselApi && activeTabIndex > 0) {
     requestAnimationFrame(() => {
       carouselApi.scrollTo(activeTabIndex, true); // instant, no animation
     });
   }
   // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [carouselApi]);

 ---
 Fix 3: Make Script the first tab

 Change: Reorder tab construction in the availableTabs useMemo (lines 476-493):
 - Before: Rearview → Script → Shots
 - After: Script → Rearview → Shots

 Script is always available and most frequently referenced. Putting it first also means the default tab (index 0) is always Script, regardless of scene number.

 ---
 Fix 4: Make content scrollable

 Root cause: Height chain breaks at Embla's viewport div. carousel.tsx:139 renders <div className="overflow-hidden"> with no height. The ScrollArea children have h-full but nothing to inherit from.

 Fix (line ~594): Add [&>div]:h-full to the Carousel className to cascade height through the viewport div:

 // Before:
 className="h-full"
 // After:
 className="h-full [&>div]:h-full"

 This targets the viewport div (direct child of Carousel's outer div) without modifying the shared carousel.tsx component.

 ---
 Fix 5: Rearview text off-by-one bug (from audit)

 Root cause (line 605): priorScene?.priorSceneEndState gives Scene N-2's end state. The backend sets scene.priorSceneEndState = previousScene.end_state_summary, so the CURRENT scene's .priorSceneEndState already contains Scene N-1's text.

 Fix (line 605): Change priorScene?.priorSceneEndState → currentScene?.priorSceneEndState. The endFrameThumbnail line stays as priorScene?.endFrameThumbnail (correct — that field is the scene's OWN thumbnail).

 ---
 Improvement 6: Module-level tab persistence

 Problem: Tab resets to 0 when navigating between scenes (component unmount/remount).

 Fix:
 1. Add module-level variable: let sessionActiveTabId: TabId | null = null;
 2. Move derivedSceneNumber + availableTabs useMemo BEFORE carousel state declarations (so activeTabIndex initializer can reference availableTabs)
 3. Initialize activeTabIndex from persisted tab ID:
 const [activeTabIndex, setActiveTabIndex] = useState(() => {
   if (sessionActiveTabId) {
     const idx = availableTabs.findIndex(t => t.id === sessionActiveTabId);
     if (idx >= 0) return idx;
   }
   return 0;
 });
 4. Add effect to persist: sessionActiveTabId = availableTabs[activeTabIndex]?.id

 Stores TabId (not index) so it resolves correctly when available tabs change between scenes/stages.

 ---
 Improvement 7: Double-click resize handle to reset height

 Fix:
 1. Add onDoubleClick prop to ResizeHandle component
 2. Add handleResetHeight callback that sets height to window.innerHeight * 0.25
 3. Pass onDoubleClick={handleResetHeight} at the usage site

 ---
 Verification

 1. npm run lint — no new lint errors
 2. npm run build — production build succeeds
 3. npm test — frontend tests pass

 Manual QA:
 - Drag resize: panel follows mouse instantly with no lag
 - Collapse → expand: same tab content shown as before collapse
 - Tab order: Script first, Rearview second (if Scene > 1), Shots third (if Stage >= 8)
 - Long script/rearview text: scrollbar appears, content scrollable
 - Scene 3+: Rearview shows Scene N-1's end state (not N-2)
 - Navigate between scenes: tab selection preserved
 - Double-click resize handle: snaps to 25% viewport height