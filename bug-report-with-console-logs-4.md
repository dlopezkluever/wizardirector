Reponse Body HTTPS:
{"success":false,"error":"Internal server error"}


Console logs:
✅ Auth session found, making API request...
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
Stage2Treatment.tsx:131 🔍 [DEBUG] Starting generateInitialTreatments for projectId: ae0523cf-4d93-4803-a8b9-aecc11b7b92a
Stage2Treatment.tsx:134 🔍 [DEBUG] Fetching Stage 1 state...
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
stageStateService.ts:112 📥 Response status: 200
stageStateService.ts:121 ✅ Save successful: 
{id: '591f4673-3a40-470a-9420-89fb518b0c3e', branch_id: '3ea1a1c5-cac1-4c5e-b89f-36bedae31da8', stage_number: 2, version: 2, status: 'draft', …}
branch_id
: 
"3ea1a1c5-cac1-4c5e-b89f-36bedae31da8"
content
: 
{variations: Array(0), activeVariation: 0}
created_at
: 
"2026-01-07T01:41:48.272944+00:00"
created_by
: 
"fa58ace1-ae7e-4dd8-ab54-1fbe453701f2"
final_prompt
: 
""
id
: 
"591f4673-3a40-470a-9420-89fb518b0c3e"
inherited_from_stage_id
: 
"f1afede2-450f-40e3-ae40-069016773602"
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
Stage2Treatment.tsx:188 Failed to generate treatments: Error: Internal server error
    at TreatmentService.generateTreatments (treatmentService.ts:94:13)
    at async generateInitialTreatments (Stage2Treatment.tsx:169:22)


Terminal for backend logs:

Daniel Lopez@DanielLopez MINGW64 ~/Desktop/Aiuteur/wizardirector (a)
$ cd backend

Daniel Lopez@DanielLopez MINGW64 ~/Desktop/Aiuteur/wizardirector/bphase-1-a)
$ npm run dev

> tsx watch src/server.ts

🚀 Wizardirector API server running on port 3001
📝 Environment: development
[API] ===== GENERATE FROM TEMPLATE REQUEST START =====
[API] Environment check: { hasGoogleAIKey: true, hasLangSmithKey: rue, nodeEnv: 'development' }
[API] Template-based generation request from user fa58ace1-ae7e-4d8-ab54-1fbe453701f2
[API] Validating template variables for template: beat_extraction
[API] Template system_prompt variables: [
  'target_length_min',
  'target_length_max',
  'genres',
  'tonal_precision',
  'rag_retrieved_style_examples'
]
[API] Template user_prompt_template variables: [
  'treatment_prose',
  'selected_variant_id',
  'target_length_min',
  'target_length_max',
  'genres',
  'tonal_precision'
]
[API] All template variables required: [
  'target_length_min',
  'target_length_max',
  'genres',
  'tonal_precision',
  'rag_retrieved_style_examples',
  'treatment_prose',
  'selected_variant_id'
]
[API] Variables provided: [
  'treatment_prose',
  'selected_variant_id',
  'target_length_min',
  'target_length_max',
  'genres',
  'tonal_precision',
  'rag_retrieved_style_examples'
]
[API] Variable values: {
  treatment_prose: 'A retired astronaut receives a terminal diagnois and embarks on a journey to reconnect with his estranged daughtr.',
  selected_variant_id: '1',
  target_length_min: 180,
  target_length_max: 300,
  genres: 'Drama',
  tonal_precision: 'Emotional and contemplative with moments of hoe',
  rag_retrieved_style_examples: ''
}
[API] Validation result: { valid: true, missing: [], extra: [] }  
[API] Template validation passed! Proceeding with interpolation...
[API] Interpolating template with variables...
[API] Template-based generation error: TypeError: Cannot read proprties of undefined (reading 'length')
    at <anonymous> (C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirctor\backend\src\routes\llm.ts:193:110)
    at process.processTicksAndRejections (node:internal/process/tak_queues:105:5)
🔄 PUT /api/projects/:projectId/stages/:stageNumber called: {
  projectId: 'ae0523cf-4d93-4803-a8b9-aecc11b7b92a',
  stageNumber: '3',
  userId: 'fa58ace1-ae7e-4dd8-ab54-1fbe453701f2',
  contentKeys: [ 'beats', 'totalEstimatedRuntime', 'narrativeStrucure' ],
  status: 'draft',
  regenerationGuidance: ''
}
🔍 Looking up project: ae0523cf-4d93-4803-a8b9-aecc11b7b92a for usr: fa58ace1-ae7e-4dd8-ab54-1fbe453701f2
✅ Project found: {
  id: 'ae0523cf-4d93-4803-a8b9-aecc11b7b92a',
  active_branch_id: '3ea1a1c5-cac1-4c5e-b89f-36bedae31da8'
}
💾 Inserting stage state: {
  branch_id: '3ea1a1c5-cac1-4c5e-b89f-36bedae31da8',
  stage_number: 3,
  version: 1,
  status: 'draft',
  content: { beats: [], totalEstimatedRuntime: 0, narrativeStructue: '' },
  regeneration_guidance: '',
  created_by: 'fa58ace1-ae7e-4dd8-ab54-1fbe453701f2',
  inherited_from_stage_id: null
}
✅ Stage state inserted successfully: ce035909-7f70-4e6a-90f2-50947
8f0499
[API] ===== GENERATE FROM TEMPLATE REQUEST START =====
[API] Environment check: { hasGoogleAIKey: true, hasLangSmithKey: rue, nodeEnv: 'development' }
[API] Template-based generation request from user fa58ace1-ae7e-4d8-ab54-1fbe453701f2
[API] Validating template variables for template: beat_extraction
[API] Template system_prompt variables: [
  'target_length_min',
  'target_length_max',
  'genres',
  'tonal_precision',
  'rag_retrieved_style_examples'
]
[API] Template user_prompt_template variables: [
  'treatment_prose',
  'selected_variant_id',
  'target_length_min',
  'target_length_max',
  'genres',
  'tonal_precision'
]
[API] All template variables required: [
  'target_length_min',
  'target_length_max',
  'genres',
  'tonal_precision',
  'rag_retrieved_style_examples',
  'treatment_prose',
  'selected_variant_id'
]
[API] Variables provided: [
  'treatment_prose',
  'selected_variant_id',
  'target_length_min',
  'target_length_max',
  'genres',
  'tonal_precision',
  'rag_retrieved_style_examples'
]
[API] Variable values: {
  treatment_prose: 'A retired astronaut receives a terminal diagnois and embarks on a journey to reconnect with his estranged daughtr.',
  selected_variant_id: '1',
  target_length_min: 180,
  target_length_max: 300,
  genres: 'Drama',
  tonal_precision: 'Emotional and contemplative with moments of hoe',
  rag_retrieved_style_examples: ''
}
[API] Validation result: { valid: true, missing: [], extra: [] }  
[API] Template validation passed! Proceeding with interpolation...
[API] Interpolating template with variables...
[API] Template-based generation error: TypeError: Cannot read proprties of undefined (reading 'length')
    at <anonymous> (C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirctor\backend\src\routes\llm.ts:193:110)
    at process.processTicksAndRejections (node:internal/process/tak_queues:105:5)
[API] ===== GENERATE FROM TEMPLATE REQUEST START =====
[API] Environment check: { hasGoogleAIKey: true, hasLangSmithKey: rue, nodeEnv: 'development' }
[API] Template-based generation request from user fa58ace1-ae7e-4d8-ab54-1fbe453701f2
[API] Validating template variables for template: treatment_expanson
[API] Template system_prompt variables: [
  'target_length_min',
  'target_length_max',
  'project_type',
  'content_rating',
  'genres',
  'tonal_precision',
  'rag_retrieved_style_examples'
]
[API] Template user_prompt_template variables: [
  'input_mode',
  'primary_content',
  'context_files',
  'target_length_min',
  'target_length_max',
  'project_type',
  'content_rating',
  'genres',
  'tonal_precision'
]
[API] All template variables required: [
  'target_length_min',
  'target_length_max',
  'project_type',
  'content_rating',
  'genres',
  'tonal_precision',
  'rag_retrieved_style_examples',
  'input_mode',
  'primary_content',
  'context_files'
]
[API] Variables provided: [
  'input_mode',
  'primary_content',
  'context_files',
  'target_length_min',
  'target_length_max',
  'project_type',
  'content_rating',
  'genres',
  'tonal_precision',
  'rag_retrieved_style_examples'
]
[API] Variable values: {
  input_mode: 'expansion',
  primary_content: "Man tries to get attention of beautiful woman round town, but she ignores him, at the supermarket, at the office at the park, with grand gestures, but nothing works. At the end o the day, he sadly sits and smokes a cig in a depressed defeated sate, and the woman sees him do that, and she instantly falls in loe, and runs over to him, but now he's over it, he's not interested he only needs cigs. And he drives away laughing.",
  context_files: '',
  target_length_min: 180,
  target_length_max: 300,
  project_type: 'narrative',
  content_rating: 'PG-13',
  genres: 'Romance, Comedy',
  tonal_precision: 'Dramatic & Satircal',
  rag_retrieved_style_examples: ''
}
[API] Validation result: { valid: true, missing: [], extra: [] }  
[API] Template validation passed! Proceeding with interpolation...
[API] Interpolating template with variables...
[API] Template-based generation error: TypeError: Cannot read proprties of undefined (reading 'length')
    at <anonymous> (C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirctor\backend\src\routes\llm.ts:193:110)
    at process.processTicksAndRejections (node:internal/process/tak_queues:105:5)
🔄 PUT /api/projects/:projectId/stages/:stageNumber called: {
  projectId: 'ae0523cf-4d93-4803-a8b9-aecc11b7b92a',
  stageNumber: '2',
  userId: 'fa58ace1-ae7e-4dd8-ab54-1fbe453701f2',
  contentKeys: [ 'variations', 'activeVariation' ],
  status: 'draft',
  regenerationGuidance: ''
}
🔍 Looking up project: ae0523cf-4d93-4803-a8b9-aecc11b7b92a for usr: fa58ace1-ae7e-4dd8-ab54-1fbe453701f2
✅ Project found: {
  id: 'ae0523cf-4d93-4803-a8b9-aecc11b7b92a',
  active_branch_id: '3ea1a1c5-cac1-4c5e-b89f-36bedae31da8'
}
💾 Inserting stage state: {
  branch_id: '3ea1a1c5-cac1-4c5e-b89f-36bedae31da8',
  stage_number: 2,
  version: 2,
  status: 'draft',
  content: { variations: [], activeVariation: 0 },
  regeneration_guidance: '',
  created_by: 'fa58ace1-ae7e-4dd8-ab54-1fbe453701f2',
  inherited_from_stage_id: 'f1afede2-450f-40e3-ae40-069016773602' 
}
✅ Stage state inserted successfully: 591f4673-3a40-470a-9420-89fb1
8b0c3e
[API] ===== GENERATE FROM TEMPLATE REQUEST START =====
[API] Environment check: { hasGoogleAIKey: true, hasLangSmithKey: rue, nodeEnv: 'development' }
[API] Template-based generation request from user fa58ace1-ae7e-4d8-ab54-1fbe453701f2
[API] Validating template variables for template: treatment_expanson
[API] Template system_prompt variables: [
  'target_length_min',
  'target_length_max',
  'project_type',
  'content_rating',
  'genres',
  'tonal_precision',
  'rag_retrieved_style_examples'
]
[API] Template user_prompt_template variables: [
  'input_mode',
  'primary_content',
  'context_files',
  'target_length_min',
  'target_length_max',
  'project_type',
  'content_rating',
  'genres',
  'tonal_precision'
]
[API] All template variables required: [
  'target_length_min',
  'target_length_max',
  'project_type',
  'content_rating',
  'genres',
  'tonal_precision',
  'rag_retrieved_style_examples',
  'input_mode',
  'primary_content',
  'context_files'
]
[API] Variables provided: [
  'input_mode',
  'primary_content',
  'context_files',
  'target_length_min',
  'target_length_max',
  'project_type',
  'content_rating',
  'genres',
  'tonal_precision',
  'rag_retrieved_style_examples'
]
[API] Variable values: {
  input_mode: 'expansion',
  primary_content: "Man tries to get attention of beautiful woman round town, but she ignores him, at the supermarket, at the office at the park, with grand gestures, but nothing works. At the end o the day, he sadly sits and smokes a cig in a depressed defeated sate, and the woman sees him do that, and she instantly falls in loe, and runs over to him, but now he's over it, he's not interested he only needs cigs. And he drives away laughing.",
  context_files: '',
  target_length_min: 180,
  target_length_max: 300,
  project_type: 'narrative',
  content_rating: 'PG-13',
  genres: 'Romance, Comedy',
  tonal_precision: 'Dramatic & Satircal',
  rag_retrieved_style_examples: ''
}
[API] Validation result: { valid: true, missing: [], extra: [] }  
[API] Template validation passed! Proceeding with interpolation...
[API] Interpolating template with variables...
[API] Template-based generation error: TypeError: Cannot read proprties of undefined (reading 'length')