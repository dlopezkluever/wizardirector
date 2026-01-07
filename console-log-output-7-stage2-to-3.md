Stage 2 - Stage 3 Console Log:

 Skipping auto-save - first render or loading: 
{isFirstRender: true, isLoading: true}
useStageState.ts:79 ℹ️ No existing stage state found - using initial content
useStageState.ts:85 ✅ Load stage state completed
stageStateService.ts:185 ⏳ Auto-save scheduled in 1000ms
stageStateService.ts:93 ✅ Auth session found, making API request...
stageStateService.ts:101 📤 Request body: 
{content: {…}, status: 'draft', regenerationGuidance: ''}
content
: 
{beats: Array(0), totalEstimatedRuntime: 0, narrativeStructure: ''}
regenerationGuidance
: 
""
status
: 
"draft"
[[Prototype]]
: 
Object
stageStateService.ts:112 📥 Response status: 200
stageStateService.ts:121 ✅ Save successful: 
{id: '3d982781-8dbb-452a-99cc-8abc3b13aa00', branch_id: '82f8950c-fcae-49f7-b1fd-c3fd54a1376a', stage_number: 3, version: 1, status: 'draft', …}
stageStateService.ts:175 ✅ Auto-save completed successfully
useStageState.ts:127 📋 Auto-save callback: 
{success: true, error: undefined}
beatService.ts:267 🔍 [BEAT PARSE] Input type: string
beatService.ts:268 🔍 [BEAT PARSE] Input preview: ```json
{
  "beats": [
    {
      "beat_id": "beat_1",
      "order": 1,
      "text": "Dr. Elias Thorne, a renowned retired astronaut, receives a devastating terminal diagnosis.",
      "rationale":
beatService.ts:282 ⚠️ [BEAT PARSE] Failed to parse as JSON, attempting text extraction
Stage3BeatSheet.tsx:320 🔍 [STAGE3 UI] Validated beats: 
{count: 1, firstBeatTextType: 'string', firstBeatTextLength: 6175}
count
: 
1
firstBeatTextLength
: 
6175
firstBeatTextType
: 
"string"
[[Prototype]]
: 
Object
useStageState.ts:139 🧹 Cleaning up auto-save for: 0a6b37f2-07ef-4671-8604-476cb25f35b3 3
stageStateService.ts:185 ⏳ Auto-save scheduled in 1000ms
stageStateService.ts:93 ✅ Auth session found, making API request...
stageStateService.ts:101 📤 Request body: 
{content: {…}, status: 'draft', regenerationGuidance: ''}
stageStateService.ts:112 📥 Response status: 200
stageStateService.ts:121 ✅ Save successful: 
{id: '9dd2e0cf-5c6e-46e4-8c15-4bae8cf0d649', branch_id: '82f8950c-fcae-49f7-b1fd-c3fd54a1376a', stage_number: 3, version: 2, status: 'draft', …}