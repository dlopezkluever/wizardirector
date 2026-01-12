
Okay so here is the exact order of HTTP Responses after clicking proceed to stage 2: 

# "1":

{
    "id": "763435d1-fcb2-40b6-bee6-46f12ee97f75",
    "branch_id": "f7da294a-2248-4360-8a87-5639623c87a2",
    "stage_number": 1,
    "version": 20,
    "status": "draft",
    "inherited_from_stage_id": "2a604750-244b-4777-806b-387acb92338b",
    {{**REMAINDER OF RESPONSE REMOVED FOR BREVITY**}}
}


# "lock": (*I think this response occurs as I switch to stage 2 from stage 1, BUT it may happen a few responses afterward*)
{
    "id": "240cfd26-d8b9-4c1e-b0aa-9634e39c79d4",
    "branch_id": "f7da294a-2248-4360-8a87-5639623c87a2",
    "stage_number": 1,
    "version": 21,
    "status": "locked",
    "inherited_from_stage_id": "763435d1-fcb2-40b6-bee6-46f12ee97f75",
   {{**REMAINDER OF RESPONSE REMOVED FOR BREVITY**}}
}


# "1":
{
    "id": "30119dbb-aac8-468d-864c-b8007072a97a",
    "branch_id": "f7da294a-2248-4360-8a87-5639623c87a2",
    "stage_number": 1,
    "version": 22,
    "status": "draft",
    {{**REMAINDER OF RESPONSE REMOVED FOR BREVITY**}}
}
# 2:
{
    "id": "8b602f25-fcfc-4faa-a736-533caf8daa3e",
    "branch_id": "f7da294a-2248-4360-8a87-5639623c87a2",
    "stage_number": 2,
    "version": 4,
    "status": "draft",
    "inherited_from_stage_id": "5600cc99-9683-40f3-bbde-16d05eab0374",
    {{**REMAINDER OF RESPONSE REMOVED FOR BREVITY**}}
}

#"2": 
{
    "id": "e1b1f07d-ff66-4019-ba12-1cffc97f1cb7",
    "branch_id": "f7da294a-2248-4360-8a87-5639623c87a2",
    "stage_number": 2,
    "version": 5,
    "status": "draft",
    "inherited_from_stage_id": "8b602f25-fcfc-4faa-a736-533caf8daa3e",
    {{**REMAINDER OF RESPONSE REMOVED FOR BREVITY**}}
}

# "lock": (error occurs):

{
    "error": "Cannot lock stage 2. Stage 1 must be locked first.",
    "details": {
        "requiredStage": 1,
        "requiredStatus": "locked",
        "currentStatus": "draft"
    }
}

