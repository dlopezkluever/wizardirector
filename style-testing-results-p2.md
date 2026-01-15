
# *Testing Results*

# **Issue 1: Prompt Injection**

###POST request: http://localhost:8080/api/llm/generate-from-template 

## Key Finding in Request Payload: writing_style_capsule_id
: 
"4c395034-05e4-4f50-8a9b-c70d16c02f53"
writing_style_context
: 
""
 

## Full Request Payload: {templateName: "treatment_expansion", variables: {input_mode: "expansion",…},…}
metadata
: 
{projectId: "116c6694-3133-41f2-b5e0-bc57259b3cec", stage: 2, inputMode: "expansion"}
templateName
: 
"treatment_expansion"
variables
: 
{input_mode: "expansion",…}
content_rating
: 
"PG-13"
context_files
: 
""
genres
: 
"Romance, Thriller"
input_mode
: 
"expansion"
primary_content
: 
"2 self driving cars race eachother, but then they fall in love, speaking to eachother through wifi signals, and they decide to ditch their selfish evil owners and drive away together, but then they run out of battery and try to charge but they need someone to help plug them into the eletric charger, but no one can hear them, as people don't speak wifi\n\n"
project_type
: 
"narrative"
target_length_max
: 
300
target_length_min
: 
180
tonal_precision
: 
"the rom-com beginning switches to over the top dramatic horror"
writing_style_capsule_id
: 
"4c395034-05e4-4f50-8a9b-c70d16c02f53"
writing_style_context
: 
""

##Response: 

{
    "success": true,
    "data": {
        "content": "```json{{{***CONTENT REMOVED FOR BREVITY***}}}```",
        "usage": {
            "tokens": {
                "inputTokens": 28401,
                "outputTokens": 2117,
                "totalTokens": 30518
            },
            "cost": {
                "inputCost": 0.00213,
                "outputCost": 0.000635,
                "totalCost": 0.002765,
                "currency": "USD"
            },
            "model": "gemini-2.5-flash-lite",
            "timestamp": "2026-01-15T16:03:39.180Z"
        },
        "traceId": "50fd1e8d-568c-4331-87ae-817440b591ed",
        "requestId": "50fd1e8d-568c-4331-87ae-817440b591ed",
        "model": "gemini-2.5-flash-lite",
        "finishReason": "stop",
        "promptTemplateVersion": "1.0.0",
        "templateId": "02c34680-b22b-452e-bff4-dad3933eb258"
    }
}


# **Issue 2: Search**

The search works perfectly now, well done

# **Issue 3: Card Click**

The clicking works nearly perfectly, most of the remaining issues are more CRUD related

# **Issue 4: CRUD Functionality**
Well done, I Can Delete capsules, and when opening they do show the information entered. and I can Update the content with a card!

For Preset Cards, they work almost perfectly, however, when I press "Duplicate to Custom" I get an error saying: "please create a library first" we aren't doing libraries at all anymore, please remove this requirement to allow for duplication.


As for visual style capsules, when opening a card they are missing the reference images to view from. (we need to be able to view the previously uploaded images when opening the card; that way the user can add more or replace said images to "Update the capsule"


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
