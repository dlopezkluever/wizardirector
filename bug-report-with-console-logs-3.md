HTTP Response Error Body: 
{"success":false,"error":"Internal server error"}


Relevant Logs entering Stage 2:

﻿
Stage2Treatment.tsx:137 🔍 [DEBUG] Stage 1 state received: 
{exists: true, id: 'b4c5b23d-ddaf-48d4-a82d-ac739f637008', stageNumber: 1, version: 44, status: 'locked', …}
contentKeys
: 
(9) ['ideaText', 'selectedMode', 'targetLength', 'uploadedFiles', 'processedInput', 'selectedGenres', 'selectedRating', 'tonalPrecision', 'selectedProjectType']
exists
: 
true
hasProcessedInput
: 
true
id
: 
"b4c5b23d-ddaf-48d4-a82d-ac739f637008"
processedInputKeys
: 
(4) ['mode', 'contextFiles', 'projectParams', 'primaryContent']
stageNumber
: 
1
status
: 
"locked"
version
: 
44
[[Prototype]]
: 
Object
Stage2Treatment.tsx:153 🔍 [DEBUG] Stage 1 processed input details: 
{mode: 'expansion', primaryContentLength: 431, contextFilesCount: 0, projectParams: {…}}
contextFilesCount
: 
0
mode
: 
"expansion"
primaryContentLength
: 
431
projectParams
: 
{genres: Array(2), projectType: 'narrative', contentRating: 'PG-13', tonalPrecision: 'Dramatic & Satircal', targetLengthMax: 300, …}
[[Prototype]]
: 
Object
Stage2Treatment.tsx:164 🔍 [DEBUG] Calling treatmentService.generateTreatments with: 
{processedInput: {…}, projectId: 'ae0523cf-4d93-4803-a8b9-aecc11b7b92a'}
processedInput
: 
{mode: 'expansion', contextFiles: Array(0), projectParams: {…}, primaryContent: 'Man tries to get attention of beautiful woman arou… he only needs cigs. And he drives away laughing.'}
projectId
: 
"ae0523cf-4d93-4803-a8b9-aecc11b7b92a"
[[Prototype]]
: 
Object
treatmentService.ts:41 🔍 [DEBUG] treatmentService.generateTreatments - Processing request: 
{projectId: 'ae0523cf-4d93-4803-a8b9-aecc11b7b92a', processedInputKeys: Array(4), mode: 'expansion', primaryContentLength: 431, contextFilesCount: 0, …}
contextFilesCount
: 
0
mode
: 
"expansion"
primaryContentLength
: 
431
processedInputKeys
: 
(4) ['mode', 'contextFiles', 'projectParams', 'primaryContent']
projectId
: 
"ae0523cf-4d93-4803-a8b9-aecc11b7b92a"
projectParams
: 
{genres: Array(2), projectType: 'narrative', contentRating: 'PG-13', tonalPrecision: 'Dramatic & Satircal', targetLengthMax: 300, …}
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
{input_mode: 'expansion', primary_content: 'Man tries to get attention of beautiful woman arou… he only needs cigs. And he drives away laughing.', context_files: '', target_length_min: 180, target_length_max: 300, …}
[[Prototype]]
: 
Object
treatmentService.ts:81 🔍 [DEBUG] Full LLM request: 
{templateName: 'treatment_expansion', variables: {…}, metadata: {…}}
metadata
: 
{projectId: 'ae0523cf-4d93-4803-a8b9-aecc11b7b92a', stage: 2, inputMode: 'expansion'}
templateName
: 
"treatment_expansion"
variables
: 
{input_mode: 'expansion', primary_content: 'Man tries to get attention of beautiful woman arou… he only needs cigs. And he drives away laughing.', context_files: '', target_length_min: 180, target_length_max: 300, …}
[[Prototype]]
: 
Object
treatmentService.ts:83 
 POST http://localhost:8080/api/llm/generate-from-template 500 (Internal Server Error)
Stage2Treatment.tsx:188 Failed to generate treatments: Error: Internal server error
    at TreatmentService.generateTreatments (treatmentService.ts:94:13)
    at async generateInitialTreatments (Stage2Treatment.tsx:169:22)
