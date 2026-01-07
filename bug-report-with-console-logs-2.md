

---
﻿
Stage2Treatment.tsx:164 🔍 [DEBUG] Calling treatmentService.generateTreatments with: 
{processedInput: {…}, projectId: 'c73ce3c8-d00a-45df-ad13-4697695a3d7d'}
processedInput
: 
{mode: 'expansion', contextFiles: Array(0), projectParams: {…}, primaryContent: 'A champion sprinter loses his big race because he … the best sprinter of all time despite the thorn.'}
projectId
: 
"c73ce3c8-d00a-45df-ad13-4697695a3d7d"
[[Prototype]]
: 
Object
treatmentService.ts:41 🔍 [DEBUG] treatmentService.generateTreatments - Processing request: 
{projectId: 'c73ce3c8-d00a-45df-ad13-4697695a3d7d', processedInputKeys: Array(4), mode: 'expansion', primaryContentLength: 231, contextFilesCount: 0, …}
contextFilesCount
: 
0
mode
: 
"expansion"
primaryContentLength
: 
231
processedInputKeys
: 
(4) ['mode', 'contextFiles', 'projectParams', 'primaryContent']
projectId
: 
"c73ce3c8-d00a-45df-ad13-4697695a3d7d"
projectParams
: 
{genres: Array(1), projectType: 'narrative', contentRating: 'G', tonalPrecision: 'In the style of a blockbuster dramatic sports film', targetLengthMax: 240, …}
[[Prototype]]
: 
Object
treatmentService.ts:65 🔍 [DEBUG] Template variables being sent: 
{templateName: 'treatment_expansion', variableKeys: Array(10), variables: {…}}
templateName
: 
"treatment_expansion"
variableKeys
: 
(10) ['input_mode', 'primary_content', 'context_files', 'target_length_min', 'target_length_max', 'project_type', 'content_rating', 'genres', 'tonal_precision', 'rag_retrieved_style_examples']
variables
: 
{input_mode: 'expansion', primary_content: 'A champion sprinter loses his big race because he … the best sprinter of all time despite the thorn.', context_files: '', target_length_min: 120, target_length_max: 240, …}
[[Prototype]]
: 
Object
treatmentService.ts:81 🔍 [DEBUG] Full LLM request: 
{templateName: 'treatment_expansion', variables: {…}, metadata: {…}}
metadata
: 
{projectId: 'c73ce3c8-d00a-45df-ad13-4697695a3d7d', stage: 2, inputMode: 'expansion'}
templateName
: 
"treatment_expansion"
variables
: 
{input_mode: 'expansion', primary_content: 'A champion sprinter loses his big race because he … the best sprinter of all time despite the thorn.', context_files: '', target_length_min: 120, target_length_max: 240, …}
[[Prototype]]
: 
Object
stageStateService.ts:93 ✅ Auth session found, making API request...
stageStateService.ts:101 📤 Request body: 
{content: {…}, status: 'draft', regenerationGuidance: ''}
content
: 
{variations: Array(0), activeVariation: 0}
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
{id: '27cfb3db-e161-4a79-808c-1e1b9a9ce015', branch_id: 'ba86625d-0c4c-47cd-951d-67322ee7adc3', stage_number: 2, version: 1, status: 'draft', …}
stageStateService.ts:175 ✅ Auto-save completed successfully
useStageState.ts:127 📋 Auto-save callback: 
{success: true, error: undefined}
error
: 
undefined
success
: 
true
[[Prototype]]
: 
Object
treatmentService.ts:83 
 POST http://localhost:8080/api/llm/generate-from-template 500 (Internal Server Error)
generateTreatments	@	treatmentService.ts:83
await in generateTreatments		
generateInitialTreatments	@	Stage2Treatment.tsx:169
await in generateInitialTreatments		
initializeTreatments	@	Stage2Treatment.tsx:112
(anonymous)	@	Stage2Treatment.tsx:123
Stage2Treatment.tsx:188 Failed to generate treatments: Error: Internal server error
    at TreatmentService.generateTreatments (treatmentService.ts:94:13)
    at async generateInitialTreatments (Stage2Treatment.tsx:169:22)
    at async initializeTreatments (Stage2Treatment.tsx:112:9)
generateInitialTreatments	@	Stage2Treatment.tsx:188
await in generateInitialTreatments		
initializeTreatments	@	Stage2Treatment.tsx:112
(anonymous)	@	Stage2Treatment.tsx:123


In the Response body of the 500 error{ Request URL
http://localhost:8080/api/llm/generate-from-template
Request Method
POST
Status Code
500 Internal Server Error
Remote Address
[::1]:8080
Referrer Policy
strict-origin-when-cross-origin} : {"success":false,"error":"Internal server error"}

