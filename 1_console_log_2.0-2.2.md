🔍 [DEBUG] Starting generateInitialTreatments for projectId: 51868784-7cfb-47e3-936e-73d648ba5175
Stage2Treatment.tsx:145 🔍 [DEBUG] Fetching Stage 1 state...
Stage2Treatment.tsx:148 🔍 [DEBUG] Stage 1 state received: 
Object
contentKeys
: 
(10) ['ideaText', 'selectedMode', 'targetLength', 'uploadedFiles', 'processedInput', 'selectedGenres', 'selectedRating', 'tonalPrecision', 'selectedProjectType', 'writingStyleCapsuleId']
exists
: 
true
hasProcessedInput
: 
true
id
: 
"45fcca88-2221-4492-85ba-d81a153a2268"
processedInputKeys
: 
(4) ['mode', 'contextFiles', 'projectParams', 'primaryContent']
stageNumber
: 
1
status
: 
"draft"
version
: 
45
[[Prototype]]
: 
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
353
projectParams
: 
{genres: Array(2), projectType: 'narrative', contentRating: 'PG-13', tonalPrecision: 'High Drama', targetLengthMax: 300, …}
[[Prototype]]
: 
Object
Stage2Treatment.tsx:175 🔍 [DEBUG] Calling treatmentService.generateTreatments with: 
Object
processedInput
: 
{mode: 'expansion', contextFiles: Array(0), projectParams: {…}, primaryContent: "2 self driving cars race eachother, but then they … no one can hear them, as people don't speak wifi"}
projectId
: 
"51868784-7cfb-47e3-936e-73d648ba5175"
[[Prototype]]
: 
Object
treatmentService.ts:42 🔍 [DEBUG] treatmentService.generateTreatments - Processing request: 
Object
contextFilesCount
: 
0
mode
: 
"expansion"
primaryContentLength
: 
353
processedInputKeys
: 
(4) ['mode', 'contextFiles', 'projectParams', 'primaryContent']
projectId
: 
"51868784-7cfb-47e3-936e-73d648ba5175"
projectParams
: 
{genres: Array(2), projectType: 'narrative', contentRating: 'PG-13', tonalPrecision: 'High Drama', targetLengthMax: 300, …}
[[Prototype]]
: 
Object
treatmentService.ts:77 🔍 [DEBUG] Template variables being sent: 
Object
templateName
: 
"treatment_expansion"
variableKeys
: 
(10) ['input_mode', 'primary_content', 'context_files', 'target_length_min', 'target_length_max', 'project_type', 'content_rating', 'genres', 'tonal_precision', 'writing_style_context']
variables
: 
{input_mode: 'expansion', primary_content: "2 self driving cars race eachother, but then they … no one can hear them, as people don't speak wifi", context_files: '', target_length_min: 180, target_length_max: 300, …}
[[Prototype]]
: 
Object
treatmentService.ts:93 🔍 [DEBUG] Full LLM request: 
Object
metadata
: 
{projectId: '51868784-7cfb-47e3-936e-73d648ba5175', stage: 2, inputMode: 'expansion'}
templateName
: 
"treatment_expansion"
variables
: 
{input_mode: 'expansion', primary_content: "2 self driving cars race eachother, but then they … no one can hear them, as people don't speak wifi", context_files: '', target_length_min: 180, target_length_max: 300, …}
[[Prototype]]
: 
Object
:8080/api/llm/generate-from-template:1 
 Failed to load resource: the server responded with a status of 400 (Bad Request)
Stage2Treatment.tsx:211 Failed to generate treatments: Error: Missing required template variables
    at TreatmentService.generateTreatments (treatmentService.ts:106:13)
    at async generateInitialTreatments (Stage2Treatment.tsx:180:22)
generateInitialTreatments	@	Stage2Treatment.tsx:211