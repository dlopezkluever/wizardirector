Stage 1 - Stage 2 Console Log:

 Save successful: 
Object
stageStateService.ts:175 ✅ Auto-save completed successfully
useStageState.ts:127 📋 Auto-save callback: 
Object
Stage1InputMode.tsx:198 🔍 [DEBUG] Stage 1 - Processing input with: 
Object
ideaTextLength
: 
574
selectedGenres
: 
['Comedy']
selectedMode
: 
"expansion"
selectedProjectType
: 
"narrative"
selectedRating
: 
"PG-13"
targetLength
: 
(2) [3, 5]
tonalPrecision
: 
"gen-z brainrot lingo and modern lingo, like they talk like streamers "
uploadedFilesCount
: 
0
[[Prototype]]
: 
Object
Stage1InputMode.tsx:220 🔍 [DEBUG] Stage 1 - Processed input result: 
Object
contextFilesCount
: 
0
mode
: 
"expansion"
primaryContentLength
: 
574
projectParams
: 
{targetLengthMin: 180, targetLengthMax: 300, projectType: 'narrative', contentRating: 'PG-13', genres: Array(1), …}
[[Prototype]]
: 
Object
Stage1InputMode.tsx:233 🔍 [DEBUG] Stage 1 - Updated content keys: 
Array(9)
0
: 
"selectedMode"
1
: 
"selectedProjectType"
2
: 
"selectedRating"
3
: 
"selectedGenres"
4
: 
"targetLength"
5
: 
"tonalPrecision"
6
: 
"uploadedFiles"
7
: 
"ideaText"
8
: 
"processedInput"
length
: 
9
[[Prototype]]
: 
Array(0)
Stage1InputMode.tsx:238 🔍 [DEBUG] Stage 1 - Saving stage state for project: 0a6b37f2-07ef-4671-8604-476cb25f35b3
useStageState.ts:139 🧹 Cleaning up auto-save for: 0a6b37f2-07ef-4671-8604-476cb25f35b3 1
stageStateService.ts:185 ⏳ Auto-save scheduled in 1000ms
stageStateService.ts:93 ✅ Auth session found, making API request...

✅ Save successful: 
Object
branch_id
: 
"82f8950c-fcae-49f7-b1fd-c3fd54a1376a"
content
: 
{ideaText: 'The story of Persephone, Hades 7 Demeter, and how …a fast paced, summarized form.  VLOG perspective ', selectedMode: 'expansion', targetLength: Array(2), uploadedFiles: Array(0), processedInput: {…}, …}
created_at
: 
"2026-01-07T15:34:16.297658+00:00"
created_by
: 
"fa58ace1-ae7e-4dd8-ab54-1fbe453701f2"
final_prompt
: 
""
id
: 
"ff6357bd-7c0b-4748-9d93-4d207a791234"
inherited_from_stage_id
: 
"b74b20d9-aa38-4df9-9f29-921536515b26"
langsmith_trace_id
: 
null
prompt_template_version
: 
""
regeneration_guidance
: 
""
stage_number
: 
1
status
: 
"locked"
version
: 
38
[[Prototype]]
: 
Object
Stage1InputMode.tsx:243 🔍 [DEBUG] Stage 1 - Stage state saved successfully
useStageState.ts:139 🧹 Cleaning up auto-save for: 0a6b37f2-07ef-4671-8604-476cb25f35b3 1
useStageState.ts:70 📥 Loading stage state from API...
useStageState.ts:104 ⏭️ Skipping auto-save - first render or loading: 
Object
useStageState.ts:79 ℹ️ No existing stage state found - using initial content
useStageState.ts:85 ✅ Load stage state completed
stageStateService.ts:185 ⏳ Auto-save scheduled in 1000ms
Stage2Treatment.tsx:142 🔍 [DEBUG] Starting generateInitialTreatments for projectId: 0a6b37f2-07ef-4671-8604-476cb25f35b3
Stage2Treatment.tsx:145 🔍 [DEBUG] Fetching Stage 1 state...
Stage2Treatment.tsx:148 🔍 [DEBUG] Stage 1 state received: 
Object
Stage2Treatment.tsx:164 🔍 [DEBUG] Stage 1 processed input details: 
Object
contextFilesCount
: 
0
mode
: 
"expansion"
primaryContentLength
: 
574
projectParams
: 
{genres: Array(1), projectType: 'narrative', contentRating: 'PG-13', tonalPrecision: 'gen-z brainrot lingo and modern lingo, like they talk like streamers ', targetLengthMax: 300, …}
[[Prototype]]
: 
Object
Stage2Treatment.tsx:175 🔍 [DEBUG] Calling treatmentService.generateTreatments with: 
Object
processedInput
: 
{mode: 'expansion', contextFiles: Array(0), projectParams: {…}, primaryContent: 'The story of Persephone, Hades 7 Demeter, and how …a fast paced, summarized form.  VLOG perspective '}
projectId
: 
"0a6b37f2-07ef-4671-8604-476cb25f35b3"
[[Prototype]]
: 
Object

[DEBUG] Calling treatmentService.generateTreatments with: 
Object
processedInput
: 
{mode: 'expansion', contextFiles: Array(0), projectParams: {…}, primaryContent: 'The story of Persephone, Hades 7 Demeter, and how …a fast paced, summarized form.  VLOG perspective '}
projectId
: 
"0a6b37f2-07ef-4671-8604-476cb25f35b3"
[[Prototype]]
: 
Object
treatmentService.ts:41 🔍 [DEBUG] treatmentService.generateTreatments - Processing request: 
Object
treatmentService.ts:65 🔍 [DEBUG] Template variables being sent: 
Object
templateName
: 
"treatment_expansion"
variableKeys
: 
(10) ['input_mode', 'primary_content', 'context_files', 'target_length_min', 'target_length_max', 'project_type', 'content_rating', 'genres', 'tonal_precision', 'rag_retrieved_style_examples']
variables
: 
{input_mode: 'expansion', primary_content: 'The story of Persephone, Hades 7 Demeter, and how …a fast paced, summarized form.  VLOG perspective ', context_files: '', target_length_min: 180, target_length_max: 300, …}
[[Prototype]]
: 
Object
treatmentService.ts:81 🔍 [DEBUG] Full LLM request: 
Object
metadata
: 
{projectId: '0a6b37f2-07ef-4671-8604-476cb25f35b3', stage: 2, inputMode: 'expansion'}
templateName
: 
"treatment_expansion"
variables
: 
{input_mode: 'expansion', primary_content: 'The story of Persephone, Hades 7 Demeter, and how …a fast paced, summarized form.  VLOG perspective ', context_files: '', target_length_min: 180, target_length_max: 300, …}
[[Prototype]]
: 
Object
stageStateService.ts:93 ✅ Auth session found, making API request...
stageStateService.ts:101 📤 Request body: 
Object
stageStateService.ts:112 📥 Response status: 200
stageStateService.ts:121 ✅ Save successful: 
Object
stageStateService.ts:175 ✅ Auto-save completed successfully
useStageState.ts:127 📋 Auto-save callback: 
Object

🔍 [TREATMENT PARSE] Input type: string
treatmentService.ts:233 🔍 [TREATMENT PARSE] Input preview: ```json
{
  "treatments": [
    {
      "variant_id": 1,
      "prose": "Yo, what up, fam! It's your girl, Peri, coming at you live from… well, it's kinda dark. So, picture this: I'm just vibing, you 
treatmentService.ts:247 ⚠️ [TREATMENT PARSE] Failed to parse as JSON, attempting text extraction
parseTreatmentResponse @ treatmentService.ts:247
generateTreatments @ treatmentService.ts:101Understand this warning
Stage2Treatment.tsx:200 🔍 [STAGE2 UI] Initial variation content: {isString: true, contentType: 'string', contentLength: 7549}
useStageState.ts:139 🧹 Cleaning up auto-save for: 0a6b37f2-07ef-4671-8604-476cb25f35b3 2
stageStateService.ts:185 ⏳ Auto-save scheduled in 1000ms

Stage2Treatment.tsx:122 🔍 [STAGE2 UI] Setting editable content: 
{isString: true, contentType: 'string', contentLength: 7549}
stageStateService.ts:93 ✅ Auth session found, making API request...
stageStateService.ts:101 📤 Request body: 
{content: {…}, status: 'draft', regenerationGuidance: ''}
content
: 
{variations: Array(1), activeVariation: 0, processedInput: {…}, langsmithTraceId: '5b90f32f-0e0b-4ee3-ab76-a48a4a81311b', promptTemplateVersion: '1.0.0'}
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
{id: '8d6b0d51-752f-4cd8-af1b-1a69be23b20d', branch_id: '82f8950c-fcae-49f7-b1fd-c3fd54a1376a', stage_number: 2, version: 2, status: 'draft', …}
branch_id
: 
"82f8950c-fcae-49f7-b1fd-c3fd54a1376a"
content
: 
{variations: Array(1), processedInput: {…}, activeVariation: 0, langsmithTraceId: '5b90f32f-0e0b-4ee3-ab76-a48a4a81311b', promptTemplateVersion: '1.0.0'}
created_at
: 
"2026-01-07T15:34:37.788275+00:00"
created_by
: 
"fa58ace1-ae7e-4dd8-ab54-1fbe453701f2"
final_prompt
: 
""
id
: 
"8d6b0d51-752f-4cd8-af1b-1a69be23b20d"
inherited_from_stage_id
: 
"c3e39c42-c262-442d-8af8-c6e2aeab0f64"
langsmith_trace_id
: 
null
prompt_template_version
: 
""
regeneration_guidance
: 
""
stage_number
: 
2
status
: 
"draft"
version
: 
2
[[Prototype]]
: 
Object