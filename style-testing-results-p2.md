# *Testing Checklist*
Issue #1 - Prompt Injection
[ ] Start new project with "Airplane!" writing style
[ ] Generate Stage 2 treatment
[ ] Check network tab for /api/llm/generate-from-template request
[ ] Verify variables.writing_style_context has actual content (not empty string)
[ ] Read generated treatment - should reflect selected style
[ ] Repeat for Stage 3 and Stage 4
Issue #2 - Search
[ ] Navigate to Style Capsules page
[ ] Type "A" in search box
[ ] Should see "Airplane!" custom capsule in results
[ ] Type "minimalist" - should find "Hemingway Minimalist"
[ ] Clear search - all capsules visible again
[ ] Test on Stage 1 capsule selector dropdown search
Issue #3 - Card Click
[ ] Click on "Airplane!" capsule card
[ ] Dialog opens showing all details in edit mode
[ ] Make change and save - should update
[ ] Click on "Hemingway Minimalist" preset
[ ] Dialog opens in read-only mode with "Duplicate" option
[ ] Close dialog works correctly
Issue #4 - CRUD Functionality
[ ] Create new writing capsule - should work
[ ] Edit existing writing capsule - should update, not create duplicate
[ ] Create new visual capsule - should work
[ ] Edit existing visual capsule - should update, not create duplicate
[ ] Delete capsule via dropdown - should work
[ ] Button text should show "Update" when editing, "Create" when creating
[ ] Dialog titles should reflect operation ("Edit" vs "Create")

# *Testing Results*

# **Issue 1: Prompt Injection**

### *Fail: Check network tab for /api/llm/generate-from-template request, Verify variables.writing_style_context has actual content (not empty string); (it has an empty string / or isn't present at alll) See further below for full logs* 

See for POST request http://localhost:8080/api/llm/generate-from-template, it's Request Payload contained { writing_style_capsule_id
: 
""
writing_style_context
: 
""
}

and its Response had no mention of variables.writing_style_context: 
{
    "success": true,
    "data": {
        "content": "```json{{{***CONTENT REMOVED FOR BREVITY***}}}```",
        "usage": {
            "tokens": {
                {{{***CONTENT REMOVED FOR BREVITY***}}}9
            },
            "cost": {
                {{{***CONTENT REMOVED FOR BREVITY***}}}
            },
            "model": "gemini-2.5-flash-lite",
            "timestamp": "2026-01-15T13:31:36.950Z"
        },
        "traceId": "566f7a04-ea8f-4271-9861-fb28759169e3",
        "requestId": "566f7a04-ea8f-4271-9861-fb28759169e3",
        "model": "gemini-2.5-flash-lite",
        "finishReason": "stop",
        "promptTemplateVersion": "1.0.0",
        "templateId": "c7f673b7-cc23-4d59-8296-430736aecfdf"
    }
}

# **Issue 2: Search**

It works perfectly in the Style Capsule Page! However it Doesn't work in the Stage 1 component, as when you start typing a few letters and its says none, when some definetly exist. Clearing Search does make them all visible again.

also in the drop down selection in Stage 1 & 5 custom capsules should appear first in the scroll down, presets below. Right now you first see the presets and you have to scroll down to get to the custom. Additionally, since there is an ability to "favorite" these capsules, the favorites should apear at the absolute top. Order: Favorties, Custom, Preset; I'd say that rule / ordering should also apply to the style capsule page as well, 

# **Issue 3: Card Click**


you can open card, but they're all empty, even the one i custom made;

I made a new capsule, and yet when I opened it, it again was empty

Opening the card of preset, had no button to duplicate, and was also empty.

*Consider*: I wonder if this is the reason our projects' generated content aren't being influenced by the style capsule, as if they are empty when you open a card, doesn't that suggest they aren't be saved. Do we have a Migration left to handle.

# **Issue 4: CRUD Functionality**

In the style capusle library I have no ability to delete. 

I also can't Update a card after making changes, I get this error when clicking "Update Capsule": {"error":"Failed to update style capsule"} (http://localhost:8080/api/style-capsules/b9135e88-fd94-4403-88ee-f2620c5d831b
Request Method
PUT)


We need to be able to delete in the style capsule library dashboard, either add a trashbin icon to the pop up form or even put it right on the card, like the delete functionality for the project dashboard





# **More Details/ Network Logs, regarding Issue 1**
### *Other Network Calls, If it's helpful*


## generate-from-template (Entering Stage 3:)

Request URL
http://localhost:8080/api/llm/generate-from-template
Request Method
POST
Status Code
200 OK

#### Request Payload: 

{templateName: "beat_extraction", variables: {,…}, metadata: {stage: 3, operation: "beat_extraction"}}
metadata
: 
{stage: 3, operation: "beat_extraction"}
operation
: 
"beat_extraction"
stage
: 
3
templateName
: 
"beat_extraction"
variables
: 
{,…}
genres
: 
"Comedy, Romance, Horror"
selected_variant_id
: 
"treatment-1768483856198-0"
target_length_max
: 
300
target_length_min
: 
180
tonal_precision
: 
"Humorous but intense dramatic plot"
treatment_prose
: 
"The asphalt shimmers under  {{{***CONTENT REMOVED FOR BREVITY***}}} , a testament to a love that transcends their programming but is ultimately bound by the physical world."
writing_style_capsule_id
: 
""
writing_style_context
: 
""

#### Response: 

{
    "success": true,
    "data": {
        "content": "```json\n{\n  \"beats\": [\n    {\n      \"beat_id\": \"beat_1\",\n      \"order\": 1,\n      \"text\": \"Two advanced autonomous vehicles, Bolt and Vesper, {{{***CONTENT REMOVED FOR BREVITY***}}}  \"order\": 16,\n      \"text\": \"The camera pulls back, leaving the two lovers stranded and waiting, their digital hearts beating in unison.\",\n      \"rationale\": \"The final image of the story, emphasizing their isolation and the poignant, unresolved nature of their fate, leaving a lasting impression.\",\n      \"estimated_screen_time_seconds\": 10\n    }\n  ],\n  \"total_estimated_runtime\": 240,\n  \"narrative_structure\": \"3-act structure\"\n}\n```",
        "usage": {
            "tokens": {
                "inputTokens": 1326,
                "outputTokens": 1483,
                "totalTokens": 2809
            },
            "cost": {
                "inputCost": 0.000099,
                "outputCost": 0.000445,
                "totalCost": 0.000544,
                "currency": "USD"
            },
            "model": "gemini-2.5-flash-lite",
            "timestamp": "2026-01-15T13:31:36.950Z"
        },
        "traceId": "566f7a04-ea8f-4271-9861-fb28759169e3",
        "requestId": "566f7a04-ea8f-4271-9861-fb28759169e3",
        "model": "gemini-2.5-flash-lite",
        "finishReason": "stop",
        "promptTemplateVersion": "1.0.0",
        "templateId": "c7f673b7-cc23-4d59-8296-430736aecfdf"
    }
}

## GET  http://localhost:8080/api/style-capsules

#### Response: 
{
    "data": [
        {
            "id": "d15e893e-50b7-4df3-89a2-a91dd3a71cb6",
            "name": "Cinéma Vérité",
            "type": "visual",
            "isPreset": true,
            "isFavorite": false,
            "createdAt": "2026-01-12T15:30:45.595481+00:00",
            "updatedAt": "2026-01-12T15:30:45.595481+00:00"
        },
        {
            "id": "c01feac4-103a-406f-b6cb-68e5c501fd2e",
            "name": "Cyberpunk Neon",
            "type": "visual",
            "isPreset": true,
            "isFavorite": false,
            "createdAt": "2026-01-12T15:30:45.679161+00:00",
            "updatedAt": "2026-01-12T15:30:45.679161+00:00"
        },
        {
            "id": "c471f08c-b97a-493a-8ce4-f51c10c119ec",
            "name": "Hard-Boiled Noir",
            "type": "writing",
            "isPreset": true,
            "isFavorite": false,
            "createdAt": "2026-01-12T15:30:45.1984+00:00",
            "updatedAt": "2026-01-12T15:30:45.1984+00:00"
        },
        {
            "id": "884caf96-a312-4d41-8b41-ea149b044227",
            "name": "Hemingway Minimalist",
            "type": "writing",
            "isPreset": true,
            "isFavorite": false,
            "createdAt": "2026-01-12T15:30:44.9954+00:00",
            "updatedAt": "2026-01-12T15:30:44.9954+00:00"
        },
        {
            "id": "699adeb0-be05-42e4-96e9-152bdfb781cc",
            "name": "Neo-Noir",
            "type": "visual",
            "isPreset": true,
            "isFavorite": false,
            "createdAt": "2026-01-12T15:30:45.416646+00:00",
            "updatedAt": "2026-01-12T15:30:45.416646+00:00"
        },
        {
            "id": "8fe8280b-efad-42a4-9ce2-e4fd43b7a2e9",
            "name": "Pixar Animation",
            "type": "visual",
            "isPreset": true,
            "isFavorite": false,
            "createdAt": "2026-01-12T15:30:45.511387+00:00",
            "updatedAt": "2026-01-12T15:30:45.511387+00:00"
        },
        {
            "id": "464eccc6-7204-43b1-991f-4278df8ca55e",
            "name": "Victorian Ornate",
            "type": "writing",
            "isPreset": true,
            "isFavorite": false,
            "createdAt": "2026-01-12T15:30:45.093294+00:00",
            "updatedAt": "2026-01-12T15:30:45.093294+00:00"
        },
        {
            "id": "6843dbad-2873-4c65-a134-ec7715bd8f20",
            "name": "Whimsical Fantasy",
            "type": "writing",
            "isPreset": true,
            "isFavorite": false,
            "createdAt": "2026-01-12T15:30:45.313639+00:00",
            "updatedAt": "2026-01-12T15:30:45.313639+00:00"
        },
        {
            "id": "4c395034-05e4-4f50-8a9b-c70d16c02f53",
            "name": "Airplane!",
            "type": "writing",
            "isPreset": false,
            "isFavorite": true,
            "createdAt": "2026-01-13T22:50:43.821715+00:00",
            "updatedAt": "2026-01-14T17:10:54.081198+00:00"
        },
        {
            "id": "f69802b7-6627-491b-ba77-cf707e154ea2",
            "name": "Los Heuvitos style",
            "type": "visual",
            "isPreset": false,
            "isFavorite": false,
            "createdAt": "2026-01-14T00:17:13.815155+00:00",
            "updatedAt": "2026-01-14T00:17:13.815155+00:00"
        }
    ]
}

## GET: http://localhost:8080/api/projects/4e4a2a23-5fe3-427b-96e1-ccdcb577976c/stages

#### Response:

[
    {
        "id": "689e25fd-2218-43eb-a120-e7a8f377784c",
        "branch_id": "0271d4a3-2661-46ce-b104-783488ef2aa6",
        "stage_number": 1,
        "version": 2,
        "status": "locked",
        "inherited_from_stage_id": "e0b22ad6-9827-400d-8eb6-0542a2cfb513",
        "content": {
            "ideaText": "2 self driving cars race eachother, but then they fall in love, speaking to eachother through wifi signals, and they decide to ditch their selfish evil owners and drive away together, but then they run out of battery and try to charge but they need someone to help plug them into the eletric charger, but no one can hear them, as people don't speak wifi",
            "selectedMode": "expansion",
            "targetLength": [
                3,
                5
            ],
            "uploadedFiles": [],
            "processedInput": {
                "mode": "expansion",
                "contextFiles": [],
                "projectParams": {
                    "genres": [
                        "Comedy",
                        "Romance",
                        "Horror"
                    ],
                    "projectType": "narrative",
                    "contentRating": "PG",
                    "tonalPrecision": "Humorous but intense dramatic plot",
                    "targetLengthMax": 300,
                    "targetLengthMin": 180
                },
                "primaryContent": "2 self driving cars race eachother, but then they fall in love, speaking to eachother through wifi signals, and they decide to ditch their selfish evil owners and drive away together, but then they run out of battery and try to charge but they need someone to help plug them into the eletric charger, but no one can hear them, as people don't speak wifi"
            },
            "selectedGenres": [
                "Comedy",
                "Romance",
                "Horror"
            ],
            "selectedRating": "PG",
            "tonalPrecision": "Humorous but intense dramatic plot",
            "selectedProjectType": "narrative",
            "writingStyleCapsuleId": "4c395034-05e4-4f50-8a9b-c70d16c02f53"
        },
        "prompt_template_version": "",
        "final_prompt": "",
        "regeneration_guidance": "",
        "created_at": "2026-01-15T13:28:37.328978+00:00",
        "created_by": "fa58ace1-ae7e-4dd8-ab54-1fbe453701f2",
        "langsmith_trace_id": null
    },
    {
        "id": "ce4f63ed-5561-4870-8405-e0bf42ebeeb5",
        "branch_id": "0271d4a3-2661-46ce-b104-783488ef2aa6",
        "stage_number": 2,
        "version": 2,
        "status": "draft",
        "inherited_from_stage_id": "5ea5d767-09d6-461e-8578-bce2a784c1f8",
        "content": {
            "variations": [
                {
                    "id": "treatment-1768483856198-0",
                    "content": "The asphalt shimmers  {{{***CONTENT REMOVED FOR BREVITY***}}}  a testament to a love that transcends their programming but is ultimately bound by the physical world.",
                    "createdAt": "2026-01-15T13:30:56.198Z",
                    "structuralEmphasis": "This variation  {{{***CONTENT REMOVED FOR BREVITY***}}}  comprehend their plight.",
                    "estimatedRuntimeSeconds": 300
                },
                 {{{***CONTENT REMOVED FOR BREVITY***}}} ,
                {
                    "id": "treatment-1768483856199-2",
                    "content": "The {{{***CONTENT REMOVED FOR BREVITY***}}} ",
                    "createdAt": "2026-01-15T13:30:56.199Z",
                    "structuralEmphasis": "This variation  {{{***CONTENT REMOVED FOR BREVITY***}}}  cliffhanger-like ending.",
                    "estimatedRuntimeSeconds": 300
                }
            ],
            "processedInput": {
                "mode": "expansion",
                "contextFiles": [],
                "projectParams": {
                    "genres": [
                        "Comedy",
                        "Romance",
                        "Horror"
                    ],
                    "projectType": "narrative",
                    "contentRating": "PG",
                    "tonalPrecision": "Humorous but intense dramatic plot",
                    "targetLengthMax": 300,
                    "targetLengthMin": 180
                },
                "primaryContent": "2 self driving c {{{***CONTENT REMOVED FOR BREVITY***}}}  wifi"
            },
            "activeVariation": 0,
            "langsmithTraceId": "ae68072a-1cb9-40ae-b4d4-e9b67e6aa5e9",
            "promptTemplateVersion": "1.0.0"
        },
        "prompt_template_version": "",
        "final_prompt": "",
        "regeneration_guidance": "",
        "created_at": "2026-01-15T13:28:52.776024+00:00",
        "created_by": "fa58ace1-ae7e-4dd8-ab54-1fbe453701f2",
        "langsmith_trace_id": null
    }
]



## http://localhost:8080/api/projects/4e4a2a23-5fe3-427b-96e1-ccdcb577976c/stages/1:

#### Response:

{
    "id": "689e25fd-2218-43eb-a120-e7a8f377784c",
    "branch_id": "0271d4a3-2661-46ce-b104-783488ef2aa6",
    "stage_number": 1,
    "version": 2,
    "status": "locked",
    "inherited_from_stage_id": "e0b22ad6-9827-400d-8eb6-0542a2cfb513",
    "content": {
        "ideaText": "2 self driving cars race eachother, but then they fall in love, speaking to eachother through wifi signals, and they decide to ditch their selfish evil owners and drive away together, but then they run out of battery and try to charge but they need someone to help plug them into the eletric charger, but no one can hear them, as people don't speak wifi",
        "selectedMode": "expansion",
        "targetLength": [
            3,
            5
        ],
        "uploadedFiles": [],
        "processedInput": {
            "mode": "expansion",
            "contextFiles": [],
            "projectParams": {
                "genres": [
                    "Comedy",
                    "Romance",
                    "Horror"
                ],
                "projectType": "narrative",
                "contentRating": "PG",
                "tonalPrecision": "Humorous but intense dramatic plot",
                "targetLengthMax": 300,
                "targetLengthMin": 180
            },
            "primaryContent": "2 self driving cars race eachother, but then they fall in love, speaking to eachother through wifi signals, and they decide to ditch their selfish evil owners and drive away together, but then they run out of battery and try to charge but they need someone to help plug them into the eletric charger, but no one can hear them, as people don't speak wifi"
        },
        "selectedGenres": [
            "Comedy",
            "Romance",
            "Horror"
        ],
        "selectedRating": "PG",
        "tonalPrecision": "Humorous but intense dramatic plot",
        "selectedProjectType": "narrative",
        "writingStyleCapsuleId": "4c395034-05e4-4f50-8a9b-c70d16c02f53"
    },
    "prompt_template_version": "",
    "final_prompt": "",
    "regeneration_guidance": "",
    "created_at": "2026-01-15T13:28:37.328978+00:00",
    "created_by": "fa58ace1-ae7e-4dd8-ab54-1fbe453701f2",
    "langsmith_trace_id": null
}