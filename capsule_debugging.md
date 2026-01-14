

1. **Test API Endpoints** with Postman/DevTools *PASSES!*
2. **Verify UI Components** load and function *PASSES!* (With small issue)
3. **Test Stage Integration** (1 and 5) *PASSES!*
4. **Validate Prompt Injection** in network requests *Biggest Issue*
5. **Test End-to-End Flow** with real project creation *Works, but unsure prompt insertion*
  
 

## 🔧 **Issue #4: Validate Prompt Injection* / Network Debugging for Prompt Injection**

Here's exactly what to look for in the network logs:

### **How to Check Network Logs:**

1. **Open Developer Tools** (F12)
2. **Go to the Network tab**
3. **Start a new project** and go through stages 2-4 (Treatment, Beat Sheet, Script)
4. **Look for these API calls:**
   - `/api/projects/{id}/stage-2/generate-treatment`
   - `/api/projects/{id}/stage-3/generate-beat-sheet`
   - `/api/projects/{id}/stage-4/generate-script`

5. **Click on each request** and look at the **Request** tab
6. **Look for style injection** in the request body - you should see something like:

```json
{
  "prompt": "Generate a treatment...",
  "writingStyleContext": "Style: Hemingway Minimalist\nExample text: The sun rose. Birds sang. Life continued.\nStyle labels: concise, direct, minimal\n..."
}
```

### **What You're Looking For:**
- ✅ **Good**: Request includes `writingStyleContext` field
- ✅ **Good**: Context contains the selected style capsule data
- ❌ **Bad**: No style context in requests
- ❌ **Bad**: Style context is empty or null

---

## **Testing Results**: 

Issues:

**IMPORTANT**: While I get various API calls as I go through a project (stages 1-4) I don't see any calls that you listed (/api/projects/{id}/stage-2/generate-treatment,
/api/projects/{id}/stage-3/generate-beat-sheet,
/api/projects/{id}/stage-4/generate-script), I see some that end in /lock or /stages or the stage number (/2 or /3) BUT the only calls that seem somewhat close to those which you told me to expect were with this endpoint: http://localhost:8080/api/llm/generate-from-template. This generate-from-template call would occur whenever I would generate anything (stage 2-4), so I think it is the closest to what you expected. 

## *Here are some of my api call responses, hopefully it can help elucidate:*  


In the Response JSON from the api call, "GET
http://localhost:8080/api/projects/4941ad27-6ab6-4af2-9464-d1ca790d6723/stages/1" I see  "writingStyleCapsuleId": "4c395034-05e4-4f50-8a9b-c70d16c02f53"
but it only has the ID, no data (i think); 

likewise in the http://localhost:8080/api/projects/4941ad27-6ab6-4af2-9464-d1ca790d6723/stages request: I see the: ""writingStyleCapsuleId": "4c395034-05e4-4f50-8a9b-c70d16c02f53" in the JSON

However, in the call: http://localhost:8080/api/projects/4941ad27-6ab6-4af2-9464-d1ca790d6723/stages/3 I see no mention of the writingStyleCapsuleID in the response


likewise responses like http://localhost:8080/api/projects/4941ad27-6ab6-4af2-9464-d1ca790d6723/stages/4/lock have no mention of the writingStyleCapsuleID



## After stage 3 : (Again from a call ending in /generate-from-template)


{
    "success": true,
    "data": {
        "content": "{{*CONTENT REMOVED TO REDUCE CONTEXT*}}",
        "usage": {
            "tokens": {
                "inputTokens": 1447,
                "outputTokens": 1323,
                "totalTokens": 2770
            },
            "cost": {
                "inputCost": 0.000109,
                "outputCost": 0.000397,
                "totalCost": 0.000505,
                "currency": "USD"
            },
            "model": "gemini-2.5-flash-lite",
            "timestamp": "2026-01-14T00:37:46.654Z"
        },
        "traceId": "7cd1a359-9730-4168-bb20-47d04ca76b2a",
        "requestId": "7cd1a359-9730-4168-bb20-47d04ca76b2a",
        "model": "gemini-2.5-flash-lite",
        "finishReason": "stop",
        "promptTemplateVersion": "1.0.0",
        "templateId": "c7f673b7-cc23-4d59-8296-430736aecfdf"
    }
}


### 


## Stage 4: http://localhost:8080/api/llm/generate-from-template

{
    "success": true,
    "data": {
        "content": "FADE IN:\n\nEXT. {{*CONTENT REMOVED TO REDUCE CONTEXT*}}and a quill, his hand trembling, and begins to write.\n\nFADE OUT.",
        "usage": {
            "tokens": {
                "inputTokens": 1635,
                "outputTokens": 3745,
                "totalTokens": 5380
            },
            "cost": {
                "inputCost": 0.000123,
                "outputCost": 0.001123,
                "totalCost": 0.001246,
                "currency": "USD"
            },
            "model": "gemini-2.5-flash-lite",
            "timestamp": "2026-01-14T00:48:32.644Z"
        },
        "traceId": "43876a10-bd23-4dc7-a62d-692a708e3948",
        "requestId": "43876a10-bd23-4dc7-a62d-692a708e3948",
        "model": "gemini-2.5-flash-lite",
        "finishReason": "stop",
        "promptTemplateVersion": "1.0.0",
        "templateId": "1beacc6a-eaa1-4219-b956-b6efb5765053"
    }
}



## after stage 4: "lock"

# http://localhost:8080/api/projects/4941ad27-6ab6-4af2-9464-d1ca790d6723/stages/4/lock

{
    "id": "34bc4c35-162b-4366-9602-49d7f60bf178",
    "branch_id": "a79356cc-f29b-4974-96df-18fecf004d22",
    "stage_number": 4,
    "version": 5,
    "status": "locked",
    "inherited_from_stage_id": "0449652d-9ec5-4a56-b5ba-0dcdbc4a8ebb",
    "content": {
        "scenes": [
            {
                "id": "scene-1-1768351712766",
                "slug": "ext-tenochtitlan-on-the-lake-plaza-day",
                "content": "EXT. TENOCHTITLAN-ON-THE-LAKE {{*CONTENT REMOVED TO REDUCE CONTEXT*}} eyes, already unfocused, widen further. The *elote* slips from his grasp, hitting the ground with a soft THUD. The sounds of the plaza seem to recede, replaced by a hollow ROAR in his ears. His mouth hangs open, a silent gasp.",
                "heading": "EXT. TENOCHTITLAN-ON-THE-LAKE PLAZA - DAY",
                "sceneNumber": 1
            },
            {{*CONTENT REMOVED TO REDUCE CONTEXT*}}
            {
                "id": "scene-10-1768351712766",
                "slug": "int-dueling-arena-day",
                "content": "INT. DUELING ARENA - DAY\n\nA circular arena, its sand stained with the blood of past contests. A hushed crowd surrounds the perimeter, their faces a mixture of anticipation and morbid curiosity.{{*CONTENT REMOVED TO REDUCE CONTEXT*}} is still.\n\nHoracio, tears streaming down his face, looks at the carnage around him – the fallen king, the poisoned queen, the dead advisor, the dying prince, the vanquished uncle. He pulls out a scroll and a quill, his hand trembling, and begins to write.\n\nFADE OUT.",
                "heading": "INT. DUELING ARENA - DAY",
                "sceneNumber": 10
            }
        ],
        "syncStatus": "synced",
        "beatSheetSource": {
            "beats": [
                {
                    "id": "beat_1",
                    "text": "Prince Hamilkar, bewildered and disheveled, learns of his father's sudden death amidst the bustling Tenochtitlan-on-the-Lake plaza.",
                    "order": 1,
                    "rationale": "Establishes the protagonist, his initial state, and the inciting incident that kicks off the story.",
                    "isExpanded": false,
                    "estimatedScreenTimeSeconds": 15
                },
             {{*CONTENT REMOVED TO REDUCE CONTEXT*}}
                },
                {
                    "id": "beat_16",
                    "text": "As Hamilkar dies, he entrusts the kingdom to his bewildered friend Horacio, who begins to document the tragic events.",
                    "order": 16,
                    "rationale": "The protagonist's death and the resolution of the kingdom's fate, setting up the epilogue and the narrator's role.",
                    "isExpanded": false,
                    "estimatedScreenTimeSeconds": 15
                }
            ],
            "stageId": "af51f172-8ddf-444c-9f08-a6f806df12f4"
        },
        "formattedScript": "FADE IN:\n\nEXT. TENOCHTITLAN-ON-THE-LAKE PLAZA - DAY\n\nThe air THUMS with the chaotic symphony of a sprawling marketplace. Sunlight, {{*CONTENT REMOVED TO REDUCE CONTEXT*}} He pulls out a scroll and a quill, his hand trembling, and begins to write.\n\nFADE OUT.",
        "langsmithTraceId": "43876a10-bd23-4dc7-a62d-692a708e3948",
        "promptTemplateVersion": "1.0.0"
    },
    "prompt_template_version": "",
    "final_prompt": "",
    "regeneration_guidance": "",
    "created_at": "2026-01-14T00:47:56.806229+00:00",
    "created_by": "fa58ace1-ae7e-4dd8-ab54-1fbe453701f2",
    "langsmith_trace_id": null
}


## After Stage 2's generate-from-template response:
{
    "success": true,
    "data": {
        "content": "```json\n{\n  \"treatments\": [\n    {\n      \"variant_id\": 1,\n      \"prose\": \"The vibrant, sun-baked plaza of Tenochtitlan-on-the-Lake, a miniature {{*CONTENT REMOVED TO REDUCE CONTEXT*}}    \"structural_emphasis\": \"This variant focuses on Hamilkar's strategic manipulation and psychological warfare rather than feigned madness. The climax is a public exposure of corruption through elaborate pranks and illusions, leading to a more ambiguous and less physically violent resolution for the antagonist. Ophelia's fate is one of spiritual withdrawal, and Polonio's death is a bizarre, accidental accident.\",\n      \"estimated_runtime_seconds\": 300\n    }\n  ]\n}\n```",
        "usage": {
            "tokens": {
                "inputTokens": 547,
                "outputTokens": 3298,
                "totalTokens": 3845
            },
            "cost": {
                "inputCost": 0.000041,
                "outputCost": 0.000989,
                "totalCost": 0.00103,
                "currency": "USD"
            },
            "model": "gemini-2.5-flash-lite",
            "timestamp": "2026-01-14T00:31:27.170Z"
        },
        "traceId": "2e422123-bbef-48c0-b29b-788622c82fcc",
        "requestId": "2e422123-bbef-48c0-b29b-788622c82fcc",
        "model": "gemini-2.5-flash-lite",
        "finishReason": "stop",
        "promptTemplateVersion": "1.0.0",
        "templateId": "02c34680-b22b-452e-bff4-dad3933eb258"
    }
}


## Lastly here is the Response from the API call  "Request URL
http://localhost:8080/api/style-capsules" :

{
    "data": [
        {
            "id": "d15e893e-50b7-4df3-89a2-a91dd3a71cb6",
            "name": "Cinéma Vérité",
            "type": "visual",
            "is_preset": true,
            "is_favorite": false,
            "created_at": "2026-01-12T15:30:45.595481+00:00",
            "updated_at": "2026-01-12T15:30:45.595481+00:00",
            "style_capsule_libraries": {
                "name": "System Presets",
                "user_id": null
            }
        },
        {
            "id": "c01feac4-103a-406f-b6cb-68e5c501fd2e",
            "name": "Cyberpunk Neon",
            "type": "visual",
            "is_preset": true,
            "is_favorite": false,
            "created_at": "2026-01-12T15:30:45.679161+00:00",
            "updated_at": "2026-01-12T15:30:45.679161+00:00",
            "style_capsule_libraries": {
                "name": "System Presets",
                "user_id": null
            }
        },
        {
            "id": "c471f08c-b97a-493a-8ce4-f51c10c119ec",
            "name": "Hard-Boiled Noir",
            "type": "writing",
            "is_preset": true,
            "is_favorite": false,
            "created_at": "2026-01-12T15:30:45.1984+00:00",
            "updated_at": "2026-01-12T15:30:45.1984+00:00",
            "style_capsule_libraries": {
                "name": "System Presets",
                "user_id": null
            }
        },
        {
            "id": "884caf96-a312-4d41-8b41-ea149b044227",
            "name": "Hemingway Minimalist",
            "type": "writing",
            "is_preset": true,
            "is_favorite": false,
            "created_at": "2026-01-12T15:30:44.9954+00:00",
            "updated_at": "2026-01-12T15:30:44.9954+00:00",
            "style_capsule_libraries": {
                "name": "System Presets",
                "user_id": null
            }
        },
        {
            "id": "699adeb0-be05-42e4-96e9-152bdfb781cc",
            "name": "Neo-Noir",
            "type": "visual",
            "is_preset": true,
            "is_favorite": false,
            "created_at": "2026-01-12T15:30:45.416646+00:00",
            "updated_at": "2026-01-12T15:30:45.416646+00:00",
            "style_capsule_libraries": {
                "name": "System Presets",
                "user_id": null
            }
        },
        {
            "id": "8fe8280b-efad-42a4-9ce2-e4fd43b7a2e9",
            "name": "Pixar Animation",
            "type": "visual",
            "is_preset": true,
            "is_favorite": false,
            "created_at": "2026-01-12T15:30:45.511387+00:00",
            "updated_at": "2026-01-12T15:30:45.511387+00:00",
            "style_capsule_libraries": {
                "name": "System Presets",
                "user_id": null
            }
        },
        {
            "id": "464eccc6-7204-43b1-991f-4278df8ca55e",
            "name": "Victorian Ornate",
            "type": "writing",
            "is_preset": true,
            "is_favorite": false,
            "created_at": "2026-01-12T15:30:45.093294+00:00",
            "updated_at": "2026-01-12T15:30:45.093294+00:00",
            "style_capsule_libraries": {
                "name": "System Presets",
                "user_id": null
            }
        },
        {
            "id": "6843dbad-2873-4c65-a134-ec7715bd8f20",
            "name": "Whimsical Fantasy",
            "type": "writing",
            "is_preset": true,
            "is_favorite": false,
            "created_at": "2026-01-12T15:30:45.313639+00:00",
            "updated_at": "2026-01-12T15:30:45.313639+00:00",
            "style_capsule_libraries": {
                "name": "System Presets",
                "user_id": null
            }
        },
        {
            "id": "4c395034-05e4-4f50-8a9b-c70d16c02f53",
            "name": "Airplane!",
            "type": "writing",
            "is_preset": false,
            "is_favorite": false,
            "created_at": "2026-01-13T22:50:43.821715+00:00",
            "updated_at": "2026-01-13T22:50:43.821715+00:00",
            "style_capsule_libraries": null
        },
        {
            "id": "f69802b7-6627-491b-ba77-cf707e154ea2",
            "name": "Los Heuvitos style",
            "type": "visual",
            "is_preset": false,
            "is_favorite": false,
            "created_at": "2026-01-14T00:17:13.815155+00:00",
            "updated_at": "2026-01-14T00:17:13.815155+00:00",
            "style_capsule_libraries": null
        }
    ]
}


here is an interesting 
    {
        "id": "833d6a9b-8003-407a-b602-6b77917e27da",
        "branch_id": "a79356cc-f29b-4974-96df-18fecf004d22",
        "stage_number": 1,
        "version": 2,
        "status": "locked",
        "inherited_from_stage_id": "96c4feec-9ff5-4b26-a01f-5a0eb19f02d4",
        "content": {
            "ideaText": "I want to make a rendition of Hamlet using the characters from \"Los Huevitos\" based in a small, fictional mesoamerican (like Aztec or Mayan) \"kingdom\" in Mexico  ",
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
                        "Drama"
                    ],
                    "projectType": "narrative",
                    "contentRating": "M",
                    "tonalPrecision": "humorous, slurred dialouge, in Spanglish (English with common spanish words sprinkled in thier dialouge). Fast paced, ",
                    "targetLengthMax": 300,
                    "targetLengthMin": 180
                },
                "primaryContent": "I want to make a rendition of Hamlet using the characters from \"Los Huevitos\" based in a small, fictional mesoamerican (like Aztec or Mayan) \"kingdom\" in Mexico  "
            },
            "selectedGenres": [
                "Comedy",
                "Drama"
            ],
            "selectedRating": "M",
            "tonalPrecision": "humorous, slurred dialouge, in Spanglish (English with common spanish words sprinkled in thier dialouge). Fast paced, ",
            "selectedProjectType": "narrative",
            "writingStyleCapsuleId": "4c395034-05e4-4f50-8a9b-c70d16c02f53"
        },
        "prompt_template_version": "",
        "final_prompt": "",
        "regeneration_guidance": "",
        "created_at": "2026-01-14T00:29:08.029196+00:00",
        "created_by": "fa58ace1-ae7e-4dd8-ab54-1fbe453701f2",
        "langsmith_trace_id": null
    },