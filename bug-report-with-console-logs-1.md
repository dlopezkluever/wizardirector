
## Error 1. **Tried to make a New project, couldn't make it past the modal that asks for the new porject name, as I got this error message on screen: "Title is required and must be a string", why is this, I used only letter.** "

Console Log for this: """@radix-ui_react-dialog.js?v=87ddb259:344 Warning: Missing `Description` or `aria-describedby={undefined}` for {DialogContent}.
(anonymous) @ @radix-ui_react-dialog.js?v=87ddb259:344Understand this warning
api/projects:1  Failed to load resource: the server responded with a status of 400 (Bad Request)Understand this error
NewProjectDialog.tsx:55 Error creating project: Error: Title is required and must be a string
    at ProjectService.createProject (projectService.ts:40:13)
    at async handleSubmit (NewProjectDialog.tsx:37:23)"""

## Error 2. **For an existing project still on stage, I was able to open and fill out the form, but when arriving to stage 2 got this error and no template could be generated.**

Console Log: """treatmentService.ts:64 
 POST http://localhost:8080/api/llm/generate-from-template 404 (Not Found)

Stage2Treatment.tsx:173 Failed to generate treatments: Error: No active template found with name: treatment_expansion """


## Error 3. **Lastly, for projects which already had stage 1 completed, (and were left on Stage 2: treatment), some would either stay stuck on Stage 2 without being able to return to stage 1, others would open automatically on stage 3, and again it would be really quite impossible to move back to the earlier stages. Regardless, I couldn't generate a treatment nor a beat for when on either stage. These were the common errors in the console logs for this issue** :

"""
ProjectView.tsx:117 Warning: Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either doesn't have a dependency array, or one of the dependencies changes on every render.
    at ProjectView (http://localhost:8080/src/pages/ProjectView.tsx:69:42)
    at main
    at div
    at MainLayout (http://localhost:8080/src/components/layout/MainLayout.tsx:25:30)
    at ProtectedRoute (http://localhost:8080/src/components/auth/ProtectedRoute.tsx:25:34)
    at RenderedRoute (http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=87ddb259:4088:5)
    at Routes (http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=87ddb259:4558:5)
    at Router (http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=87ddb259:4501:15)
    at BrowserRouter (http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=87ddb259:5247:5)
    at Provider (http://localhost:8080/node_modules/.vite/deps/chunk-PLT6GTVM.js?v=87ddb259:38:15)
    at TooltipProvider (http://localhost:8080/node_modules/.vite/deps/@radix-ui_react-tooltip.js?v=87ddb259:64:5)
    at QueryClientProvider (http://localhost:8080/node_modules/.vite/deps/@tanstack_react-query.js?v=87ddb259:2934:3)
    at App

Stage3BeatSheet.tsx:329 Failed to generate beats: Error: No active template found with name: beat_extraction
    at BeatService.generateBeats (beatService.ts:71:13)
    at async generateInitialBeats (Stage3BeatSheet.tsx:312:22)
    
POST http://localhost:8080/api/llm/generate-from-template 404 (Not Found)
generateBeats @ beatService.ts:60
await in generateBeats
generateInitialBeats @ Stage3BeatSheet.tsx:312
callCallback2 @ chunk-R6S4VRB5.js?v=87ddb259:3674
invokeGuardedCallbackDev @ chunk-R6S4VRB5.js?v=87ddb259:3699
invokeGuardedCallback @ chunk-R6S4VRB5.js?v=87ddb259:3733
invokeGuardedCallbackAndCatchFirstError @ chunk-R6S4VRB5.js?v=87ddb259:3736
executeDispatch @ chunk-R6S4VRB5.js?v=87ddb259:7014
processDispatchQueueItemsInOrder @ chunk-R6S4VRB5.js?v=87ddb259:7034
processDispatchQueue @ chunk-R6S4VRB5.js?v=87ddb259:7043
dispatchEventsForPlugins @ chunk-R6S4VRB5.js?v=87ddb259:7051
(anonymous) @ chunk-R6S4VRB5.js?v=87ddb259:7174
batchedUpdates$1 @ chunk-R6S4VRB5.js?v=87ddb259:18913
batchedUpdates @ chunk-R6S4VRB5.js?v=87ddb259:3579
dispatchEventForPluginEventSystem @ chunk-R6S4VRB5.js?v=87ddb259:7173
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ chunk-R6S4VRB5.js?v=87ddb259:5478
dispatchEvent @ chunk-R6S4VRB5.js?v=87ddb259:5472
dispatchDiscreteEvent @ chunk-R6S4VRB5.js?v=87ddb259:5449

ProjectView.tsx:117 Warning: Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either doesn't have a dependency array, or one of the dependencies changes on every render.
    at ProjectView (http://localhost:8080/src/pages/ProjectView.tsx:69:42)
    at main
    at div
    at MainLayout (http://localhost:8080/src/components/layout/MainLayout.tsx:25:30)
    at ProtectedRoute (http://localhost:8080/src/components/auth/ProtectedRoute.tsx:25:34)
    at RenderedRoute (http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=87ddb259:4088:5)
    at Routes (http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=87ddb259:4558:5)
    at Router (http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=87ddb259:4501:15)
    at BrowserRouter (http://localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=87ddb259:5247:5)
    at Provider (http://localhost:8080/node_modules/.vite/deps/chunk-PLT6GTVM.js?v=87ddb259:38:15)
    at TooltipProvider (http://localhost:8080/node_modules/.vite/deps/@radix-ui_react-tooltip.js?v=87ddb259:64:5)
    at QueryClientProvider (http://localhost:8080/node_modules/.vite/deps/@tanstack_react-query.js?v=87ddb259:2934:3)
    at App
printWarning @ chunk-R6S4VRB5.js?v=87ddb259:521
error @ chunk-R6S4VRB5.js?v=87ddb259:505
checkForNestedUpdates @ chunk-R6S4VRB5.js?v=87ddb259:19665
scheduleUpdateOnFiber @ chunk-R6S4VRB5.js?v=87ddb259:18533
dispatchSetState @ chunk-R6S4VRB5.js?v=87ddb259:12403
(anonymous) @ ProjectView.tsx:117
commitHookEffectListMount @ chunk-R6S4VRB5.js?v=87ddb259:16915
commitPassiveMountOnFiber @ chunk-R6S4VRB5.js?v=87ddb259:18156
commitPassiveMountEffects_complete @ chunk-R6S4VRB5.js?v=87ddb259:18129
commitPassiveMountEffects_begin @ chunk-R6S4VRB5.js?v=87ddb259:18119
commitPassiveMountEffects @ chunk-R6S4VRB5.js?v=87ddb259:18109
flushPassiveEffectsImpl @ chunk-R6S4VRB5.js?v=87ddb259:19490
flushPassiveEffects @ chunk-R6S4VRB5.js?v=87ddb259:19447
(anonymous) @ chunk-R6S4VRB5.js?v=87ddb259:19328
workLoop @ chunk-R6S4VRB5.js?v=87ddb259:197
flushWork @ chunk-R6S4VRB5.js?v=87ddb259:176
performWorkUntilDeadline @ chunk-R6S4VRB5.js?v=87ddb259:384 """
