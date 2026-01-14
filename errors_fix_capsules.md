## backend server terminal log:
C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend\src\routes\llm.ts:15
import { styleCapsuleService } from '../services/styleCapsuleService.js';
         ^

SyntaxError: The requested module '../services/styleCapsuleService.js' does not provide an export named 'styleCapsuleService'
    at ModuleJob._instantiate (node:internal/modules/esm/module_job:182:21)
    at async ModuleJob.run (node:internal/modules/esm/module_job:266:5)
    at async onImport.tracePromise.__proto__ (node:internal/modules/esm/loader:644:26)
    at async asyncRunEntryPointWithESMLoader (node:internal/modules/run_main:117:5)


## frontend server terminal log:

10:00:13 AM [vite] http proxy error: /api/style-capsules
AggregateError [ECONNREFUSED]:
    at internalConnectMultiple (node:net:1139:18)
    at afterConnectMultiple (node:net:1714:7)
10:43:03 AM [vite] http proxy error: /api/projects/4941ad27-6ab6-4af2-9464-d1ca790d6723/stages
AggregateError [ECONNREFUSED]:
    at internalConnectMultiple (node:net:1139:18)
    at afterConnectMultiple (node:net:1714:7)
10:43:03 AM [vite] http proxy error: /api/projects/4941ad27-6ab6-4af2-9464-d1ca790d6723/stages/1
AggregateError [ECONNREFUSED]:
    at internalConnectMultiple (node:net:1139:18)
    at afterConnectMultiple (node:net:1714:7)
10:43:03 AM [vite] http proxy error: /api/projects/4941ad27-6ab6-4af2-9464-d1ca790d6723
AggregateError [ECONNREFUSED]:
    at internalConnectMultiple (node:net:1139:18)
    at afterConnectMultiple (node:net:1714:7)
10:43:03 AM [vite] http proxy error: /api/style-capsules
AggregateError [ECONNREFUSED]:
    at internalConnectMultiple (node:net:1139:18)
    at afterConnectMultiple (node:net:1714:7)



## console logs:

stageStateService.ts:35 
 GET http://localhost:8080/api/projects/4941ad27-6ab6-4af2-9464-d1ca790d6723/stages 500 (Internal Server Error)
useStageState.ts:255 Failed to load stage states: SyntaxError: Failed to execute 'json' on 'Response': Unexpected end of JSON input
    at StageStateService.getStageStates (stageStateService.ts:44:36)
    at async useStageState.ts:252:22
stageStateService.ts:61 
 GET http://localhost:8080/api/projects/4941ad27-6ab6-4af2-9464-d1ca790d6723/stages/1 500 (Internal Server Error)
useStageState.ts:82 ❌ Failed to load stage state: SyntaxError: Failed to execute 'json' on 'Response': Unexpected end of JSON input
    at StageStateService.getStageState (stageStateService.ts:70:36)
    at async useStageState.ts:72:21
useStageState.ts:85 ✅ Load stage state completed
useStageState.ts:116 ⏭️ Skipping auto-save - autoSave disabled
projectService.ts:83 
 GET http://localhost:8080/api/projects/4941ad27-6ab6-4af2-9464-d1ca790d6723 500 (Internal Server Error)
ProjectView.tsx:65 Failed to load project: SyntaxError: Failed to execute 'json' on 'Response': Unexpected end of JSON input
    at ProjectService.getProject (projectService.ts:92:36)
    at async loadProject (ProjectView.tsx:61:25)
styleCapsuleService.ts:54 
 GET http://localhost:8080/api/style-capsules 500 (Internal Server Error)
StyleCapsuleSelector.tsx:59 Failed to load style capsules: SyntaxError: Unexpected end of JSON input
styleCapsuleService.ts:54 
 GET http://localhost:8080/api/style-capsules 500 (Internal Server Error)

StyleCapsuleLibrary.tsx:62 Failed to load style capsule data: SyntaxError: Failed to execute 'json' on 'Response': Unexpected end of JSON input
    at StyleCapsuleService.getCapsules (styleCapsuleService.ts:63:36)
    at async Promise.all (index 0)
    at async loadData (StyleCapsuleLibrary.tsx:55:45)

styleCapsuleService.ts:300 
 GET http://localhost:8080/api/style-capsules/libraries/all 500 (Internal Server Error)