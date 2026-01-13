**Step 4**:


🔄 PUT /api/projects/:projectId/stages/:stageNumber called: {
  projectId: 'a69a9049-97d4-4a66-9703-b5d360bc8d26',
  stageNumber: '2',
  userId: 'fa58ace1-ae7e-4dd8-ab54-1fbe453701f2',
  contentKeys: [ 'variations', 'activeVariation' ],
  providedStatus: 'draft',
  regenerationGuidance: '',
  timestamp: '2026-01-13T02:02:08.070Z'
}
🔍 Looking up project: a69a9049-97d4-4a66-9703-b5d360bc8d26 for user: fa58ace1-ae7e-4dd8-ab54-1fbe453701f2
✅ Project found: {
  id: 'a69a9049-97d4-4a66-9703-b5d360bc8d26',
  active_branch_id: '14f92570-8910-4534-b438-e90a63ace5af'
}
💾 Inserting stage state: {
  branch_id: '14f92570-8910-4534-b438-e90a63ace5af',
  stage_number: 2,
  version: 1,
  status: 'draft',
  content: { variations: [], activeVariation: 0 },
  regeneration_guidance: '',
  created_by: 'fa58ace1-ae7e-4dd8-ab54-1fbe453701f2',
  inherited_from_stage_id: null,
  existingStatus: 'none',
  requestedStatus: 'draft',
  finalStatus: 'draft',
  statusPreserved: false
}
✅ Stage state inserted successfully: dad920b8-266f-4c50-9dfe-05b40e419d73
[LLM] Generation completed in 16588ms, 3680 tokens, $0.0010
[LLM] Successfully completed request f1d8b349-b0ac-48a3-8696-fb946961ae41
[API] LLM generation completed successfully!
🔄 PUT /api/projects/:projectId/stages/:stageNumber called: {
  projectId: 'a69a9049-97d4-4a66-9703-b5d360bc8d26',
  stageNumber: '2',
  userId: 'fa58ace1-ae7e-4dd8-ab54-1fbe453701f2',
  contentKeys: [
    'variations',
    'activeVariation',
    'processedInput',
    'langsmithTraceId',
    'promptTemplateVersion'
  ],
  providedStatus: 'draft',
  regenerationGuidance: '',
  timestamp: '2026-01-13T02:02:25.695Z'
}
🔍 Looking up project: a69a9049-97d4-4a66-9703-b5d360bc8d26 for user: fa58ace1-ae7e-4dd8-ab54-1fbe453701f2
✅ Project found: {
  id: 'a69a9049-97d4-4a66-9703-b5d360bc8d26',
  active_branch_id: '14f92570-8910-4534-b438-e90a63ace5af'
}
💾 Inserting stage state: {
  branch_id: '14f92570-8910-4534-b438-e90a63ace5af',
  stage_number: 2,
  version: 2,
  status: 'draft',
  content: {
    variations: [ [Object], [Object], [Object] ],
    activeVariation: 0,
    processedInput: {
      mode: 'expansion',
      contextFiles: [],
      projectParams: [Object],
      primaryContent: "2 self driving cars race eachother, but then they fall in love, speaking to eachother through wifi signals, and they decide to ditch their selfish evil owners and drive away together, but then they run out of battery and try to charge but they need someone to help plug them into the eletric charger, but no one can hear them, as people don't speak wifi"
    },
    langsmithTraceId: 'f1d8b349-b0ac-48a3-8696-fb946961ae41',
    promptTemplateVersion: '1.0.0'
  },
  regeneration_guidance: '',
  created_by: 'fa58ace1-ae7e-4dd8-ab54-1fbe453701f2',
  inherited_from_stage_id: 'dad920b8-266f-4c50-9dfe-05b40e419d73',
  existingStatus: 'draft',
  requestedStatus: 'draft',
  finalStatus: 'draft',
  statusPreserved: false
}
✅ Stage state inserted successfully: ee5480c8-ac8d-45bc-ac51-e2de9a559170

🔒 POST /api/projects/:projectId/stages/:stageNumber/lock called: {
  projectId: '3b130dca-3194-4fd1-bc51-4bf90012a6f5',
  stageNumber: '4',
  userId: 'fa58ace1-ae7e-4dd8-ab54-1fbe453701f2',
  timestamp: '2026-01-13T01:26:05.658Z'
}
💾 Creating locked stage state: {
  stage: 4,
  previousVersion: 1,
  newVersion: 2,
  previousStatus: 'draft'
}
✅ Stage locked successfully: {
  id: '14e07e19-0e37-4af7-9c1d-f62139634b61',
  stage: 4,
  version: 2,
  status: 'locked'
}
🔒 POST /api/projects/:projectId/stages/:stageNumber/lock called: {
  projectId: '3b130dca-3194-4fd1-bc51-4bf90012a6f5',
  stageNumber: '4',
  userId: 'fa58ace1-ae7e-4dd8-ab54-1fbe453701f2',
  timestamp: '2026-01-13T01:26:06.396Z'
}
💾 Creating locked stage state: {
  stage: 4,
  previousVersion: 2,
  newVersion: 3,
  previousStatus: 'locked'
}
✅ Stage locked successfully: {
  id: 'a1eb4ec1-4a06-4310-bfba-4516a3e8b1ee',
  stage: 4,
  version: 3,
  status: 'locked'
}
🔄 Creating project: {
  title: 'Car-Z in Luv',
  userId: 'fa58ace1-ae7e-4dd8-ab54-1fbe453701f2'
}
✅ Project created successfully: a69a9049-97d4-4a66-9703-b5d360bc8d26
🔄 Updating project configuration: {
  id: 'a69a9049-97d4-4a66-9703-b5d360bc8d26',
  userId: 'fa58ace1-ae7e-4dd8-ab54-1fbe453701f2',
  title: undefined,
  project_type: 'narrative'
}
✅ Project updated successfully: a69a9049-97d4-4a66-9703-b5d360bc8d26
🔄 PUT /api/projects/:projectId/stages/:stageNumber called: {
  projectId: 'a69a9049-97d4-4a66-9703-b5d360bc8d26',
  stageNumber: '1',
  userId: 'fa58ace1-ae7e-4dd8-ab54-1fbe453701f2',
  contentKeys: [
    'selectedMode',
    'selectedProjectType',
    'selectedRating',
    'selectedGenres',
    'targetLength',
    'tonalPrecision',
    'writingStyleCapsuleId',
    'uploadedFiles',
    'ideaText',
    'processedInput'
  ],
  providedStatus: 'draft',
  regenerationGuidance: '',
  timestamp: '2026-01-13T02:02:04.953Z'
}
🔍 Looking up project: a69a9049-97d4-4a66-9703-b5d360bc8d26 for user: fa58ace1-ae7e-4dd8-ab54-1fbe453701f2
✅ Project found: {
  id: 'a69a9049-97d4-4a66-9703-b5d360bc8d26',
  active_branch_id: '14f92570-8910-4534-b438-e90a63ace5af'
}
💾 Inserting stage state: {
  branch_id: '14f92570-8910-4534-b438-e90a63ace5af',
  stage_number: 1,
  version: 1,
  status: 'draft',
  content: {
    selectedMode: 'expansion',
    selectedProjectType: 'narrative',
    selectedRating: 'PG-13',
    selectedGenres: [ 'Thriller', 'Horror' ],
    targetLength: [ 2, 4 ],
    tonalPrecision: 'Surreal, Absurd, and Tragic',
    writingStyleCapsuleId: '464eccc6-7204-43b1-991f-4278df8ca55e',
    uploadedFiles: [],
    ideaText: "2 self driving cars race eachother, but then they fall in love, speaking to eachother through wifi signals, and they decide to ditch their selfish evil owners and drive away together, but then they run out of battery and try to charge but they need someone to help plug them into the eletric charger, but no one can hear them, as people don't speak wifi",
    processedInput: {
      mode: 'expansion',
      primaryContent: "2 self driving cars race eachother, but then they fall in love, speaking to eachother through wifi signals, and they decide to ditch their selfish evil owners and drive away together, but then they run out of battery and try to charge but they need someone to help plug them into the eletric charger, but no one can hear them, as people don't speak wifi",
      contextFiles: [],
      projectParams: [Object]
    }
  },
  regeneration_guidance: '',
  created_by: 'fa58ace1-ae7e-4dd8-ab54-1fbe453701f2',
  inherited_from_stage_id: null,
  existingStatus: 'none',
  requestedStatus: 'draft',
  finalStatus: 'draft',
  statusPreserved: false
}
✅ Stage state inserted successfully: 6501f850-9450-4775-ae76-ab8e27272a91
🔒 POST /api/projects/:projectId/stages/:stageNumber/lock called: {
  projectId: 'a69a9049-97d4-4a66-9703-b5d360bc8d26',
  stageNumber: '1',
  userId: 'fa58ace1-ae7e-4dd8-ab54-1fbe453701f2',
  timestamp: '2026-01-13T02:02:05.828Z'
}
💾 Creating locked stage state: {
  stage: 1,
  previousVersion: 1,
  newVersion: 2,
  previousStatus: 'draft'
}
✅ Stage locked successfully: {
  id: '10f77e56-5de9-45a0-8fa6-c21f0e9911da',
  stage: 1,
  version: 2,
  status: 'locked'





 projects in Network:

## 1:

{
    "id": "6501f850-9450-4775-ae76-ab8e27272a91",
    "branch_id": "14f92570-8910-4534-b438-e90a63ace5af",
    "stage_number": 1,
    "version": 1,
    "status": "draft",
    "inherited_from_stage_id": null,
    "content": {
        "ideaText": "2 self driving cars race eachother, but then they fall in love, speaking to eachother through wifi signals, and they decide to ditch their selfish evil owners and drive away together, but then they run out of battery and try to charge but they need someone to help plug them into the eletric charger, but no one can hear them, as people don't speak wifi",
        "selectedMode": "expansion",
        "targetLength": [
            2,
            4
        ],
        "uploadedFiles": [],
        "processedInput": {
            "mode": "expansion",
            "contextFiles": [],
            "projectParams": {
                "genres": [
                    "Thriller",
                    "Horror"
                ],
                "projectType": "narrative",
                "contentRating": "PG-13",
                "tonalPrecision": "Surreal, Absurd, and Tragic",
                "targetLengthMax": 240,
                "targetLengthMin": 120
            },
            "primaryContent": "2 self driving cars race eachother, but then they fall in love, speaking to eachother through wifi signals, and they decide to ditch their selfish evil owners and drive away together, but then they run out of battery and try to charge but they need someone to help plug them into the eletric charger, but no one can hear them, as people don't speak wifi"
        },
        "selectedGenres": [
            "Thriller",
            "Horror"
        ],
        "selectedRating": "PG-13",
        "tonalPrecision": "Surreal, Absurd, and Tragic",
        "selectedProjectType": "narrative",
        "writingStyleCapsuleId": "464eccc6-7204-43b1-991f-4278df8ca55e"
    },
    "prompt_template_version": "",
    "final_prompt": "",
    "regeneration_guidance": "",
    "created_at": "2026-01-13T02:00:00.472348+00:00",
    "created_by": "fa58ace1-ae7e-4dd8-ab54-1fbe453701f2",
    "langsmith_trace_id": null
}

## Lock:
{
    "id": "10f77e56-5de9-45a0-8fa6-c21f0e9911da",
    "branch_id": "14f92570-8910-4534-b438-e90a63ace5af",
    "stage_number": 1,
    "version": 2,
    "status": "locked",
    "inherited_from_stage_id": "6501f850-9450-4775-ae76-ab8e27272a91",
    "content": {
        "ideaText": "2 self driving cars race eachother, but then they fall in love, speaking to eachother through wifi signals, and they decide to ditch their selfish evil owners and drive away together, but then they run out of battery and try to charge but they need someone to help plug them into the eletric charger, but no one can hear them, as people don't speak wifi",
        "selectedMode": "expansion",
        "targetLength": [
            2,
            4
        ],
        "uploadedFiles": [],
        "processedInput": {
            "mode": "expansion",
            "contextFiles": [],
            "projectParams": {
                "genres": [
                    "Thriller",
                    "Horror"
                ],
                "projectType": "narrative",
                "contentRating": "PG-13",
                "tonalPrecision": "Surreal, Absurd, and Tragic",
                "targetLengthMax": 240,
                "targetLengthMin": 120
            },
            "primaryContent": "2 self driving cars race eachother, but then they fall in love, speaking to eachother through wifi signals, and they decide to ditch their selfish evil owners and drive away together, but then they run out of battery and try to charge but they need someone to help plug them into the eletric charger, but no one can hear them, as people don't speak wifi"
        },
        "selectedGenres": [
            "Thriller",
            "Horror"
        ],
        "selectedRating": "PG-13",
        "tonalPrecision": "Surreal, Absurd, and Tragic",
        "selectedProjectType": "narrative",
        "writingStyleCapsuleId": "464eccc6-7204-43b1-991f-4278df8ca55e"
    },
    "prompt_template_version": "",
    "final_prompt": "",
    "regeneration_guidance": "",
    "created_at": "2026-01-13T02:00:01.34762+00:00",
    "created_by": "fa58ace1-ae7e-4dd8-ab54-1fbe453701f2",
    "langsmith_trace_id": null
}

## Stages:

[
    {
        "id": "a69a9049-97d4-4a66-9703-b5d360bc8d26",
        "title": "Car-Z in Luv",
        "description": "",
        "status": "draft",
        "branch": "main",
        "currentStage": 1,
        "stages": [
            {
                "stage": 1,
                "status": "active",
                "label": "Input"
            },
            {
                "stage": 2,
                "status": "pending",
                "label": "Treatment"
            },
            {
                "stage": 3,
                "status": "pending",
                "label": "Beat Sheet"
            },
            {
                "stage": 4,
                "status": "pending",
                "label": "Script"
            },
            {
                "stage": 5,
                "status": "pending",
                "label": "Assets"
            }
        ],
        "createdAt": "2026-01-13T01:44:36.438586+00:00",
        "updatedAt": "2026-01-13T01:44:36.438586+00:00",
        "projectType": "narrative",
        "contentRating": "PG",
        "genres": [],
        "tonalPrecision": "",
        "targetLength": {
            "min": 180,
            "max": 300
        }
    },
    {
        "id": "3b130dca-3194-4fd1-bc51-4bf90012a6f5",
        "title": "Carzy in Love",
        "description": "Surrealist Drama",
        "status": "draft",
        "branch": "main",
        "currentStage": 5,
        "stages": [
            {
                "stage": 1,
                "status": "locked",
                "label": "Input"
            },
            {
                "stage": 2,
                "status": "locked",
                "label": "Treatment"
            },
            {
                "stage": 3,
                "status": "locked",
                "label": "Beat Sheet"
            },
            {
                "stage": 4,
                "status": "locked",
                "label": "Script"
            },
            {
                "stage": 5,
                "status": "active",
                "label": "Assets"
            }
        ],
        "createdAt": "2026-01-12T21:09:53.860329+00:00",
        "updatedAt": "2026-01-13T00:57:18.561+00:00",
        "projectType": "narrative",
        "contentRating": "PG-13",
        "genres": [
            "Drama",
            "Thriller"
        ],
        "tonalPrecision": "Surrealist Drama",
        "targetLength": {
            "min": 180,
            "max": 300
        }
    },
    {
        "id": "8f258817-68bb-4d78-b7fc-7087b91c305a",
        "title": "cars in love",
        "description": "Surrealist / Absurd Drama",
        "status": "draft",
        "branch": "main",
        "currentStage": 2,
        "stages": [
            {
                "stage": 1,
                "status": "active",
                "label": "Input"
            },
            {
                "stage": 2,
                "status": "active",
                "label": "Treatment"
            },
            {
                "stage": 3,
                "status": "pending",
                "label": "Beat Sheet"
            },
            {
                "stage": 4,
                "status": "pending",
                "label": "Script"
            },
            {
                "stage": 5,
                "status": "pending",
                "label": "Assets"
            }
        ],
        "createdAt": "2026-01-12T20:53:42.068721+00:00",
        "updatedAt": "2026-01-12T21:11:45.07+00:00",
        "projectType": "narrative",
        "contentRating": "PG",
        "genres": [
            "Thriller",
            "Drama"
        ],
        "tonalPrecision": "Surrealist / Absurd Drama",
        "targetLength": {
            "min": 180,
            "max": 300
        }
    },
    {
        "id": "51868784-7cfb-47e3-936e-73d648ba5175",
        "title": "cars",
        "description": "High Drama",
        "status": "draft",
        "branch": "main",
        "currentStage": 2,
        "stages": [
            {
                "stage": 1,
                "status": "active",
                "label": "Input"
            },
            {
                "stage": 2,
                "status": "active",
                "label": "Treatment"
            },
            {
                "stage": 3,
                "status": "pending",
                "label": "Beat Sheet"
            },
            {
                "stage": 4,
                "status": "pending",
                "label": "Script"
            },
            {
                "stage": 5,
                "status": "pending",
                "label": "Assets"
            }
        ],
        "createdAt": "2026-01-12T15:47:16.791089+00:00",
        "updatedAt": "2026-01-12T20:55:33.919+00:00",
        "projectType": "narrative",
        "contentRating": "PG-13",
        "genres": [
            "Drama",
            "Romance"
        ],
        "tonalPrecision": "High Drama",
        "targetLength": {
            "min": 180,
            "max": 300
        }
    },
    {
        "id": "834b459f-d7dd-40bf-925f-8714463905dc",
        "title": "bobby",
        "description": "Surreal, absurd ",
        "status": "draft",
        "branch": "main",
        "currentStage": 4,
        "stages": [
            {
                "stage": 1,
                "status": "active",
                "label": "Input"
            },
            {
                "stage": 2,
                "status": "locked",
                "label": "Treatment"
            },
            {
                "stage": 3,
                "status": "active",
                "label": "Beat Sheet"
            },
            {
                "stage": 4,
                "status": "active",
                "label": "Script"
            },
            {
                "stage": 5,
                "status": "pending",
                "label": "Assets"
            }
        ],
        "createdAt": "2026-01-11T14:34:19.840192+00:00",
        "updatedAt": "2026-01-11T14:37:56.697+00:00",
        "projectType": "narrative",
        "contentRating": "G",
        "genres": [
            "Comedy"
        ],
        "tonalPrecision": "Surreal, absurd ",
        "targetLength": {
            "min": 60,
            "max": 120
        }
    },
    {
        "id": "18984948-7a45-4188-b1d8-5b96ddde58cf",
        "title": "DuckSSR",
        "description": "Overly & absurdly Dramatic and Thrilling, to the point it's comical",
        "status": "draft",
        "branch": "main",
        "currentStage": 5,
        "stages": [
            {
                "stage": 1,
                "status": "active",
                "label": "Input"
            },
            {
                "stage": 2,
                "status": "active",
                "label": "Treatment"
            },
            {
                "stage": 3,
                "status": "active",
                "label": "Beat Sheet"
            },
            {
                "stage": 4,
                "status": "locked",
                "label": "Script"
            },
            {
                "stage": 5,
                "status": "active",
                "label": "Assets"
            }
        ],
        "createdAt": "2026-01-10T19:53:59.94146+00:00",
        "updatedAt": "2026-01-11T14:36:01.741+00:00",
        "projectType": "narrative",
        "contentRating": "PG-13",
        "genres": [
            "Thriller",
            "Comedy",
            "Drama"
        ],
        "tonalPrecision": "Overly & absurdly Dramatic and Thrilling, to the point it's comical",
        "targetLength": {
            "min": 180,
            "max": 300
        }
    },
    {
        "id": "69afe4b0-0860-439b-8f8a-4fd134f002dd",
        "title": "Hansel and Gretel Animated",
        "description": "Fast paced with jump cuts, short and pointed dialouge. ",
        "status": "draft",
        "branch": "main",
        "currentStage": 5,
        "stages": [
            {
                "stage": 1,
                "status": "active",
                "label": "Input"
            },
            {
                "stage": 2,
                "status": "active",
                "label": "Treatment"
            },
            {
                "stage": 3,
                "status": "active",
                "label": "Beat Sheet"
            },
            {
                "stage": 4,
                "status": "active",
                "label": "Script"
            },
            {
                "stage": 5,
                "status": "active",
                "label": "Assets"
            }
        ],
        "createdAt": "2026-01-09T13:48:34.945733+00:00",
        "updatedAt": "2026-01-11T14:34:54.265+00:00",
        "projectType": "narrative",
        "contentRating": "PG-13",
        "genres": [
            "Drama",
            "Thriller"
        ],
        "tonalPrecision": "Fast paced with jump cuts, short and pointed dialouge. ",
        "targetLength": {
            "min": 180,
            "max": 240
        }
    },
    {
        "id": "913b0fb3-f8aa-42d1-bea8-a7244043037d",
        "title": "Love White",
        "description": "Shakespeare Style",
        "status": "draft",
        "branch": "main",
        "currentStage": 2,
        "stages": [
            {
                "stage": 1,
                "status": "active",
                "label": "Input"
            },
            {
                "stage": 2,
                "status": "active",
                "label": "Treatment"
            },
            {
                "stage": 3,
                "status": "pending",
                "label": "Beat Sheet"
            },
            {
                "stage": 4,
                "status": "pending",
                "label": "Script"
            },
            {
                "stage": 5,
                "status": "pending",
                "label": "Assets"
            }
        ],
        "createdAt": "2026-01-06T16:50:48.942726+00:00",
        "updatedAt": "2026-01-11T14:34:17.94+00:00",
        "projectType": "narrative",
        "contentRating": "G",
        "genres": [
            "Romance"
        ],
        "tonalPrecision": "Shakespeare Style",
        "targetLength": {
            "min": 180,
            "max": 300
        }
    },
    {
        "id": "9cfb7f35-989e-491a-94c1-46a542991f8d",
        "title": "Mom",
        "description": "Satirical surrealist humor with over the top dramatics ",
        "status": "draft",
        "branch": "main",
        "currentStage": 2,
        "stages": [
            {
                "stage": 1,
                "status": "active",
                "label": "Input"
            },
            {
                "stage": 2,
                "status": "active",
                "label": "Treatment"
            },
            {
                "stage": 3,
                "status": "pending",
                "label": "Beat Sheet"
            },
            {
                "stage": 4,
                "status": "pending",
                "label": "Script"
            },
            {
                "stage": 5,
                "status": "pending",
                "label": "Assets"
            }
        ],
        "createdAt": "2026-01-07T18:41:01.640243+00:00",
        "updatedAt": "2026-01-10T19:55:41.615+00:00",
        "projectType": "narrative",
        "contentRating": "PG",
        "genres": [
            "Comedy",
            "Drama"
        ],
        "tonalPrecision": "Satirical surrealist humor with over the top dramatics ",
        "targetLength": {
            "min": 180,
            "max": 300
        }
    },
    {
        "id": "3fcc7ca2-1d3b-4cf0-9453-94e4e2cb1df7",
        "title": "Three litte pigs",
        "description": "Face paced, little dialouge",
        "status": "draft",
        "branch": "main",
        "currentStage": 5,
        "stages": [
            {
                "stage": 1,
                "status": "active",
                "label": "Input"
            },
            {
                "stage": 2,
                "status": "active",
                "label": "Treatment"
            },
            {
                "stage": 3,
                "status": "active",
                "label": "Beat Sheet"
            },
            {
                "stage": 4,
                "status": "active",
                "label": "Script"
            },
            {
                "stage": 5,
                "status": "active",
                "label": "Assets"
            }
        ],
        "createdAt": "2026-01-10T01:38:28.773953+00:00",
        "updatedAt": "2026-01-10T19:54:48.83+00:00",
        "projectType": "narrative",
        "contentRating": "G",
        "genres": [
            "Comedy",
            "Drama"
        ],
        "tonalPrecision": "Face paced, little dialouge",
        "targetLength": {
            "min": 180,
            "max": 240
        }
    },
    {
        "id": "6667b64a-af7d-444e-a26b-4b5cb33e9f0f",
        "title": "duck-duck-goose",
        "description": "Quick paced, surrealistic",
        "status": "draft",
        "branch": "main",
        "currentStage": 2,
        "stages": [
            {
                "stage": 1,
                "status": "active",
                "label": "Input"
            },
            {
                "stage": 2,
                "status": "active",
                "label": "Treatment"
            },
            {
                "stage": 3,
                "status": "pending",
                "label": "Beat Sheet"
            },
            {
                "stage": 4,
                "status": "pending",
                "label": "Script"
            },
            {
                "stage": 5,
                "status": "pending",
                "label": "Assets"
            }
        ],
        "createdAt": "2026-01-08T21:49:47.666087+00:00",
        "updatedAt": "2026-01-09T17:04:05.966+00:00",
        "projectType": "narrative",
        "contentRating": "PG",
        "genres": [
            "Comedy"
        ],
        "tonalPrecision": "Quick paced, surrealistic",
        "targetLength": {
            "min": 60,
            "max": 120
        }
    },
    {
        "id": "0a6b37f2-07ef-4671-8604-476cb25f35b3",
        "title": "Persephone",
        "description": "gen-z brainrot lingo and modern lingo, like they talk like streamers ",
        "status": "draft",
        "branch": "main",
        "currentStage": 2,
        "stages": [
            {
                "stage": 1,
                "status": "active",
                "label": "Input"
            },
            {
                "stage": 2,
                "status": "active",
                "label": "Treatment"
            },
            {
                "stage": 3,
                "status": "pending",
                "label": "Beat Sheet"
            },
            {
                "stage": 4,
                "status": "pending",
                "label": "Script"
            },
            {
                "stage": 5,
                "status": "pending",
                "label": "Assets"
            }
        ],
        "createdAt": "2026-01-07T15:31:39.548558+00:00",
        "updatedAt": "2026-01-08T16:55:41.747+00:00",
        "projectType": "narrative",
        "contentRating": "PG-13",
        "genres": [
            "Comedy"
        ],
        "tonalPrecision": "gen-z brainrot lingo and modern lingo, like they talk like streamers ",
        "targetLength": {
            "min": 180,
            "max": 300
        }
    },
    {
        "id": "05ec6d31-f5ea-4409-bb20-14b01c8b7484",
        "title": "fat man!",
        "description": "",
        "status": "draft",
        "branch": "main",
        "currentStage": 1,
        "stages": [
            {
                "stage": 1,
                "status": "active",
                "label": "Input"
            },
            {
                "stage": 2,
                "status": "pending",
                "label": "Treatment"
            },
            {
                "stage": 3,
                "status": "pending",
                "label": "Beat Sheet"
            },
            {
                "stage": 4,
                "status": "pending",
                "label": "Script"
            },
            {
                "stage": 5,
                "status": "pending",
                "label": "Assets"
            }
        ],
        "createdAt": "2026-01-04T12:00:30.52718+00:00",
        "updatedAt": "2026-01-07T15:31:22.519+00:00",
        "projectType": "narrative",
        "contentRating": "PG",
        "genres": [],
        "tonalPrecision": "",
        "targetLength": {
            "min": 180,
            "max": 300
        }
    },
    {
        "id": "ae0523cf-4d93-4803-a8b9-aecc11b7b92a",
        "title": "Hey Girl",
        "description": "Dramatic & Satircal",
        "status": "draft",
        "branch": "main",
        "currentStage": 2,
        "stages": [
            {
                "stage": 1,
                "status": "active",
                "label": "Input"
            },
            {
                "stage": 2,
                "status": "active",
                "label": "Treatment"
            },
            {
                "stage": 3,
                "status": "pending",
                "label": "Beat Sheet"
            },
            {
                "stage": 4,
                "status": "pending",
                "label": "Script"
            },
            {
                "stage": 5,
                "status": "pending",
                "label": "Assets"
            }
        ],
        "createdAt": "2026-01-07T01:04:04.988964+00:00",
        "updatedAt": "2026-01-07T15:24:06.369+00:00",
        "projectType": "narrative",
        "contentRating": "PG-13",
        "genres": [
            "Romance",
            "Comedy"
        ],
        "tonalPrecision": "Dramatic & Satircal",
        "targetLength": {
            "min": 180,
            "max": 300
        }
    },
    {
        "id": "c73ce3c8-d00a-45df-ad13-4697695a3d7d",
        "title": "The boy with a thorn on his side",
        "description": "In the style of a blockbuster dramatic sports film",
        "status": "draft",
        "branch": "main",
        "currentStage": 2,
        "stages": [
            {
                "stage": 1,
                "status": "active",
                "label": "Input"
            },
            {
                "stage": 2,
                "status": "active",
                "label": "Treatment"
            },
            {
                "stage": 3,
                "status": "pending",
                "label": "Beat Sheet"
            },
            {
                "stage": 4,
                "status": "pending",
                "label": "Script"
            },
            {
                "stage": 5,
                "status": "pending",
                "label": "Assets"
            }
        ],
        "createdAt": "2026-01-06T23:33:18.146465+00:00",
        "updatedAt": "2026-01-07T00:55:59.436+00:00",
        "projectType": "narrative",
        "contentRating": "G",
        "genres": [
            "Drama"
        ],
        "tonalPrecision": "In the style of a blockbuster dramatic sports film",
        "targetLength": {
            "min": 120,
            "max": 240
        }
    },
    {
        "id": "b29770a6-5d55-4e35-a491-22b3f3f04749",
        "title": "Muchachito",
        "description": "In the style of an 80's action movie",
        "status": "draft",
        "branch": "main",
        "currentStage": 2,
        "stages": [
            {
                "stage": 1,
                "status": "active",
                "label": "Input"
            },
            {
                "stage": 2,
                "status": "active",
                "label": "Treatment"
            },
            {
                "stage": 3,
                "status": "pending",
                "label": "Beat Sheet"
            },
            {
                "stage": 4,
                "status": "pending",
                "label": "Script"
            },
            {
                "stage": 5,
                "status": "pending",
                "label": "Assets"
            }
        ],
        "createdAt": "2026-01-06T20:52:43.290196+00:00",
        "updatedAt": "2026-01-06T23:15:59.166+00:00",
        "projectType": "narrative",
        "contentRating": "PG",
        "genres": [
            "Romance",
            "Thriller"
        ],
        "tonalPrecision": "In the style of an 80's action movie",
        "targetLength": {
            "min": 180,
            "max": 300
        }
    },
    {
        "id": "96a38a83-47a9-4b1d-b033-c9439568eec8",
        "title": "mr. chi-chis",
        "description": "Magical things occur",
        "status": "draft",
        "branch": "main",
        "currentStage": 1,
        "stages": [
            {
                "stage": 1,
                "status": "active",
                "label": "Input"
            },
            {
                "stage": 2,
                "status": "pending",
                "label": "Treatment"
            },
            {
                "stage": 3,
                "status": "pending",
                "label": "Beat Sheet"
            },
            {
                "stage": 4,
                "status": "pending",
                "label": "Script"
            },
            {
                "stage": 5,
                "status": "pending",
                "label": "Assets"
            }
        ],
        "createdAt": "2026-01-06T13:47:25.885685+00:00",
        "updatedAt": "2026-01-06T13:50:17.171+00:00",
        "projectType": "narrative",
        "contentRating": "G",
        "genres": [
            "Fantasy",
            "Drama"
        ],
        "tonalPrecision": "Magical things occur",
        "targetLength": {
            "min": 180,
            "max": 300
        }
    },
    {
        "id": "9d75b8ae-92af-4e03-ab83-12429ddb8153",
        "title": "bob the killa",
        "description": "Very funny like cartoon",
        "status": "draft",
        "branch": "main",
        "currentStage": 1,
        "stages": [
            {
                "stage": 1,
                "status": "active",
                "label": "Input"
            },
            {
                "stage": 2,
                "status": "pending",
                "label": "Treatment"
            },
            {
                "stage": 3,
                "status": "pending",
                "label": "Beat Sheet"
            },
            {
                "stage": 4,
                "status": "pending",
                "label": "Script"
            },
            {
                "stage": 5,
                "status": "pending",
                "label": "Assets"
            }
        ],
        "createdAt": "2026-01-02T16:34:24.292611+00:00",
        "updatedAt": "2026-01-06T13:22:21.683+00:00",
        "projectType": "narrative",
        "contentRating": "PG-13",
        "genres": [
            "Comedy"
        ],
        "tonalPrecision": "Very funny like cartoon",
        "targetLength": {
            "min": 180,
            "max": 300
        }
    },
    {
        "id": "aa909579-4fae-4ff0-8566-87be51d35d63",
        "title": "To Love a Woman",
        "description": "in the style of Shakespeare ",
        "status": "draft",
        "branch": "main",
        "currentStage": 1,
        "stages": [
            {
                "stage": 1,
                "status": "active",
                "label": "Input"
            },
            {
                "stage": 2,
                "status": "pending",
                "label": "Treatment"
            },
            {
                "stage": 3,
                "status": "pending",
                "label": "Beat Sheet"
            },
            {
                "stage": 4,
                "status": "pending",
                "label": "Script"
            },
            {
                "stage": 5,
                "status": "pending",
                "label": "Assets"
            }
        ],
        "createdAt": "2026-01-02T18:50:08.619047+00:00",
        "updatedAt": "2026-01-06T00:41:04.778+00:00",
        "projectType": "narrative",
        "contentRating": "PG",
        "genres": [
            "Romance",
            "Drama"
        ],
        "tonalPrecision": "in the style of Shakespeare ",
        "targetLength": {
            "min": 180,
            "max": 300
        }
    },
    {
        "id": "1bac7f11-99c8-4851-b7aa-1538ba941efd",
        "title": "To Kiss A Somali",
        "description": "with the subtle comedy of Coen brothers",
        "status": "draft",
        "branch": "main",
        "currentStage": 1,
        "stages": [
            {
                "stage": 1,
                "status": "active",
                "label": "Input"
            },
            {
                "stage": 2,
                "status": "pending",
                "label": "Treatment"
            },
            {
                "stage": 3,
                "status": "pending",
                "label": "Beat Sheet"
            },
            {
                "stage": 4,
                "status": "pending",
                "label": "Script"
            },
            {
                "stage": 5,
                "status": "pending",
                "label": "Assets"
            }
        ],
        "createdAt": "2026-01-01T21:13:41.293002+00:00",
        "updatedAt": "2026-01-06T00:41:00.876+00:00",
        "projectType": "narrative",
        "contentRating": "PG",
        "genres": [
            "Drama",
            "Comedy"
        ],
        "tonalPrecision": "with the subtle comedy of Coen brothers",
        "targetLength": {
            "min": 180,
            "max": 300
        }
    }
]