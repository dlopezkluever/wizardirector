I'll help you debug and fix these issues. Let me start by investigating the routing problem and then guide you through the testing process.

[2 tools called]

Let me first investigate the routing issue by examining the current routing setup:

[3 tools called]

Now I can see the issue! The routing is set up correctly in `Index.tsx` (line 45-46), but there's a problem. Let me check if the `StyleCapsuleLibrary` component file actually exists:

[1 tool called]

The component exists. Let me check if there are any import issues by looking at the console errors more carefully. The issue might be that the component is using `useNavigate` from React Router, but this app doesn't seem to be using React Router - it's using a custom routing system. Let me check the import:

[2 tools called]

I see the issue! The `StyleCapsuleLibrary` component is importing `useNavigate` from `react-router-dom`, but looking at the `Index.tsx` file, this app is using a custom routing system, not React Router. Let me fix this:

[1 tool called]

Now I need to remove the `useNavigate` usage from the component:

[1 tool called]

Let me check if there are any other uses of `navigate` in the file:

[1 tool called]

Good, no other uses. Now let me check for any linting errors:

[2 tools called]

Great! Now let's test if the routing issue is fixed. Let me also check if there are any missing dependencies that might cause issues:

[1 tool called]

The components look good. Now let me start the next todo and guide you through testing. Let me first check if the servers are running and then guide you through the API testing:

[1 tool called]

Perfect! Now let's address your issues:

## ✅ **Issue #1 Fixed: Routing 404 Error**

The 404 error was caused by the `StyleCapsuleLibrary` component trying to use `useNavigate` from React Router, but your app uses a custom routing system. I've fixed this by removing the React Router dependency from the component.

**Try this now**: Click on "Style Capsule Library" in the sidebar - it should work!

---

## 🔧 **Issue #2: API Endpoint Testing Guide**

Here's how to test the API endpoints from your testing guide:

### **Method 1: Using Browser Developer Tools (Easiest)**

1. **Open your app** in the browser (make sure both frontend and backend are running)
2. **Open Developer Tools** (F12 or right-click → Inspect)
3. **Go to the Console tab**
4. **Run these commands** one by one:

```javascript
// Test 1: Get all capsules
fetch('/api/style-capsules')
  .then(r => r.json())
  .then(data => console.log('Capsules:', data))
  .catch(err => console.error('Error:', err));

// Test 2: Get all libraries  
fetch('/api/style-capsules/libraries/all')
  .then(r => r.json())
  .then(data => console.log('Libraries:', data))
  .catch(err => console.error('Error:', err));

// Test 3: Create a test capsule (you'll need a library ID from test 2)
fetch('/api/style-capsules', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: "Test Writing Style",
    type: "writing", 
    libraryId: "REPLACE_WITH_LIBRARY_ID_FROM_TEST_2",
    exampleTextExcerpts: ["Sample text..."],
    styleLabels: ["concise", "direct"]
  })
})
.then(r => r.json())
.then(data => console.log('Created capsule:', data))
.catch(err => console.error('Error:', err));
```

### **Method 2: Using a REST Client (More Advanced)**

If you have **Postman**, **Insomnia**, or similar:

1. **GET** `http://localhost:8080/api/style-capsules`
2. **GET** `http://localhost:8080/api/style-capsules/libraries/all`
3. **POST** `http://localhost:8080/api/style-capsules` with the JSON body from the testing guide

---

## 🔧 **Issue #3: Frontend Component Testing**

Once the routing is fixed (which it should be now), you can test the frontend components:

### **Test 3: Navigation**
1. **Refresh your app** 
2. **Click "Style Capsule Library"** in the sidebar
3. **You should see** the Style Capsule Library page with tabs for "Writing Styles" and "Visual Styles"

### **Test 4: Library Page**
- Look for the preset capsules (should be 4 writing + 4 visual if seeding worked)
- Try the search box at the top
- Try the "Create Capsule" dropdown

### **Test 5-6: Capsule Creation**
- Click "Create Writing Style" or "Create Visual Style"
- Fill out the modal form
- Test the "Show Preview" functionality

---

## 🔧 **Issue #4: Network Debugging for Prompt Injection**

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

## 🚀 **Let's Start Testing!**

**Try this first**: 
1. Make sure both servers are running (`npm run dev` in root and `npm run dev` in backend folder)
2. Refresh your browser and click "Style Capsule Library" 
3. Let me know what you see!

If the routing works, we can move on to testing the API endpoints and components. If it still shows 404, let me know and I'll investigate further.

----------------------------------------------

Issue 1 check (Passes all tests)
Issue 2 check (Passes all tests)
Issue 3 check (Passes all tests)
Issue 4 Issues:

**IMPORTANT**: Only see generate-treatment requests as i go through stages:

Also this is the URL I see: http://localhost:8080/api/llm/generate-from-template


like even after going through 3 & 4 I see that say api call, not the ones you listed (/api/projects/{id}/stage-2/generate-treatment
/api/projects/{id}/stage-3/generate-beat-sheet
/api/projects/{id}/stage-4/generate-script)


## After stage 2:

templateName: "treatment_expansion", variables: {input_mode: "expansion",…},…}
metadata
: 
{projectId: "4941ad27-6ab6-4af2-9464-d1ca790d6723", stage: 2, inputMode: "expansion"}
inputMode
: 
"expansion"
projectId
: 
"4941ad27-6ab6-4af2-9464-d1ca790d6723"
stage
: 
2
templateName
: 
"treatment_expansion"
variables
: 
{input_mode: "expansion",…}
content_rating
: 
"M"
context_files
: 
""
genres
: 
"Comedy, Drama"
input_mode
: 
"expansion"
primary_content
: 
"I want to make a rendition of Hamlet using the characters from \"Los Huevitos\" based in a small, fictional mesoamerican (like Aztec or Mayan) \"kingdom\" in Mexico  "
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
"humorous, slurred dialouge, in Spanglish (English with common spanish words sprinkled in thier dialouge). Fast paced, "
writing_style_context
: 
""
 ### other interesting request response paylod:

 {
    "id": "6cdc213c-39ff-4768-b5f4-caf9e423ba18",
    "branch_id": "a79356cc-f29b-4974-96df-18fecf004d22",
    "stage_number": 2,
    "version": 2,
    "status": "draft",
    "inherited_from_stage_id": "d7d532d6-7eff-415f-9dca-2bfa4ee800f9",
    "content": {
        "variations": [
            {
                "id": "treatment-1768350687178-0",
                "content": "The vibrant, sun-baked plaza of Tenochtitlan-on-the-Lake, a miniature Mayan kingdom, buzzes with the usual chaotic energy. Our Hamlet, a young, perpetually bewildered prince named Hamilkar, stumbles through the throng, his feathered headdress askew. He's just learned his father, the great Huevito I, has met a… sudden demise. His mother, the regal Queen Quetzalina, is already remarried to his uncle, the slick and suspiciously jovial Hunberto, a man whose laugh sounds like a bag of pebbles being shaken. Hunberto, a portly figure in gaudy jade jewelry, is busy distributing *pulque* to the assembled courtiers, his eyes gleaming with an almost predatory delight. Hamilkar, clad in a simple loincloth and adorned with a single, wilting marigold, watches this spectacle with a growing sense of unease. He clutches a chipped obsidian dagger, more for comfort than intent.  A shadowy figure, a wizened shaman named El Fantasma, beckons Hamilkar into a dimly lit temple adorned with faded murals. Through a series of exaggerated gestures and guttural whispers in Spanglish, El Fantasma reveals the truth: Hunberto poisoned Huevito I with a potent, fermented *agave* brew, all for the throne and Quetzalina's hand. Hamilkar, initially paralyzed by shock, feels a surge of righteous indignation, albeit a rather clumsy one. He vows revenge, though his pronouncements are punctuated by nervous stutters and the occasional dropped dagger.  He decides to feign madness, a plan that, given his already eccentric nature, is easily mistaken for his normal state. He begins to wander the palace grounds, muttering riddles about skeletons and *el diablo*, much to the amusement and confusion of the court.  Hunberto, however, is not amused. He sees the erratic behavior as a threat. He enlists the help of Polonio, the king's sycophantic advisor, a man whose primary skill is fawning and excessive bowing, and his two children, the flighty Ophelia and the brash Laertes. Ophelia, a young woman with eyes like polished obsidian and a penchant for weaving flower crowns, is secretly in love with Hamilkar. Polonio, ever eager to please Hunberto, instructs Ophelia to try and extract information from Hamilkar, a task she undertakes with a mixture of genuine affection and nervous apprehension.  Hamilkar, lost in his “madness,” pushes Ophelia away, his words a jumble of existential despair and nonsensical pronouncements about the fleeting nature of *chiles*.  His erratic behavior escalates. During a royal feast, Hamilkar orchestrates a play, a crude reenactment of his father's murder, complete with exaggerated poisoning and a dramatic death scene. The actors, a troupe of drunken jesters, deliver their lines with gusto, much to the delight of the crowd, but Hunberto’s face turns a ghastly shade of green. He storms out, his guilt exposed.  In the ensuing chaos, Hamilkar, mistaking Polonio for Hunberto, accidentally impales him with his obsidian dagger while Polonio was eavesdropping behind a tapestry. This act, born of confusion and haste, solidifies Hamilkar's path.  Laertes, enraged by his father's death and Ophelia's subsequent descent into true madness (she drowns herself, weeping over wilting flower crowns), returns, seeking vengeance. Hunberto, sensing an opportunity, manipulates Laertes into a duel with Hamilkar, providing Laertes with a poisoned dagger.  The final scene is a whirlwind of spilled *pulque*, flying feathers, and desperate accusations. Quetzalina, accidentally poisoned by a cup of wine meant for Hamilkar, dies lamenting her haste. Laertes wounds Hamilkar. In a final, clumsy act of defiance, Hamilkar manages to stab Hunberto with the poisoned dagger and force him to drink the poisoned wine. As Hamilkar dies, he entrusts the kingdom to his loyal, but equally bewildered, friend Horacio, a scribe who has been diligently documenting everything with a quill and a very large scroll. Horacio, left alone amidst the carnage, can only shake his head and begin writing the tale of the tragic, befuddled Huevito of Tenochtitlan-on-the-Lake.",
                "createdAt": "2026-01-14T00:31:27.178Z",
                "structuralEmphasis": "This variation follows a more traditional Hamlet structure, emphasizing Hamilkar's internal struggle and his descent into feigned madness as a tool for revenge. The play-within-a-play serves as a pivotal turning point, leading directly to Polonio's accidental death and escalating the conflict. The ending is a direct, tragic confrontation where all principal characters meet their demise.",
                "estimatedRuntimeSeconds": 300
            },
            {
                "id": "treatment-1768350687178-1",
                "content": "The humid air of the Mesoamerican kingdom of Xibalba-on-the-Hill hangs thick with the scent of *cacao* and unspoken anxieties. Prince Hamilkar, a lanky youth with perpetually bloodshot eyes and a penchant for wearing his royal robes backwards, is nursing a hangover in his chambers. His father, the esteemed Huevito the Wise, is dead. His mother, Queen Xochitl, a woman whose beauty is matched only by her pragmatism, has swiftly married her brother-in-law, the boisterous and undeniably corrupt Duke Hunberto. Hunberto, a man who communicates primarily through booming laughter and the clinking of gold coins, is already consolidating his power, his greedy hands reaching for the royal treasury. Hamilkar’s world is upended when a spectral apparition, the ghost of his father manifested as a shimmering *quetzal* bird, appears to him. The *quetzal* hovers, its ethereal glow illuminating Hamilkar’s bleary face, and whispers a chilling tale: Hunberto poisoned Huevito with a rare, hallucinogenic mushroom, a secret ingredient in his favorite *atole*. Driven by a potent mix of grief and *pulque*-induced courage, Hamilkar vows to avenge his father. He decides to adopt a persona of pure chaos, a wild man of the jungle, to mask his intentions. He begins to roam the palace gardens, conversing with iguanas and attempting to ride jaguars, his pronouncements increasingly nonsensical and delivered in a rapid-fire Spanglish. This 'madness' is, of course, a performance, but one that pushes the boundaries of believability. Hunberto, unnerved by Hamilkar’s erratic behavior, tasks his loyal, but utterly incompetent, advisor, Polonio, with spying on the prince. Polonio, a man whose primary function is to trip over his own feet and misinterpret everything, enlists his children, the sensitive Ophelia and the hot-headed Laertes. Ophelia, a weaver of intricate *amate* bark paintings and a secret admirer of Hamilkar, is instructed to lure him into a confession.  Hamilkar, however, sees through the ploy, his 'madness' allowing him to speak uncomfortable truths without consequence, much to Ophelia's heartbreak.  The climax of this variation occurs not through a play, but through a grand festival celebrating Hunberto’s ascension. Hamilkar, using his 'madman' persona, orchestrates a series of embarrassing stunts and public accusations, all disguised as drunken revelry. He reveals evidence of Hunberto’s corruption, culminating in a chaotic chase through the palace where Polonio, trying to hide, accidentally falls into a vat of fermenting *pulque* and drowns. Laertes, witnessing his father’s ignominious end and Ophelia’s subsequent descent into genuine despair (she wanders off into the jungle, lost and weeping, eventually becoming prey to unseen jungle creatures), returns, seeking retribution. Hunberto, seeing his plan unravel, manipulates Laertes into a rigged gladiatorial combat against Hamilkar. The combat is a brutal, slapstick affair, with poisoned darts and strategically placed banana peels. Laertes wounds Hamilkar with a poisoned *macuahuitl*. In his dying moments, Hamilkar, with a final surge of energy, manages to disarm Laertes, switch weapons, and strike down Hunberto, forcing him to drink from the poisoned gourd he’d prepared for Hamilkar. Queen Xochitl, attempting to intervene and calm the chaos, accidentally drinks the poisoned wine meant for Hamilkar, dying with a curse on her lips for her hasty remarriage. Hamilkar, his life ebbing away, entrusts the kingdom to his sensible, but perpetually exasperated, friend Horacio, a scholar who has been diligently recording the events on papyrus scrolls, his face a mask of weary resignation.",
                "createdAt": "2026-01-14T00:31:27.178Z",
                "structuralEmphasis": "This version emphasizes Hamilkar's chaotic performance of madness as his primary weapon, leading to a more action-driven, less introspective narrative. The climax is a public festival turned chaotic confrontation, and Polonio's death is a more slapstick, accidental demise. Ophelia's fate is tragic but less directly tied to Hamilkar's actions.",
                "estimatedRuntimeSeconds": 300
            },
            {
                "id": "treatment-1768350687178-2",
                "content": "In the sun-drenched, slightly dilapidated kingdom of Huehuetlan, Prince Hamilkar is a study in existential ennui. His father, the beloved Huevito the Old, has passed away under suspicious circumstances. His mother, Queen Izel, a woman of striking beauty and questionable judgment, has already taken her deceased husband’s brother, the gluttonous and manipulative Hunberto, as her new consort. Hunberto, whose belly precedes him like a herald, rules with an iron fist clad in a velvet glove, his pronouncements often slurred with *mezcal*. Hamilkar, a young man more interested in dissecting philosophical treatises on the nature of *pulque* than ruling, is jolted from his apathy by a series of unsettling visions and whispers. He sees his father’s spirit, not as a grand ghost, but as a fleeting, flickering image, like a faulty candle, in the corners of his vision. These spectral visitations, accompanied by the faint scent of decay and *chiles*, reveal the truth: Hunberto poisoned Huevito with a slow-acting toxin, disguised as a traditional herbal remedy.  Fueled by a potent cocktail of grief, outrage, and a particularly strong batch of *pulque*, Hamilkar decides to confront Hunberto, but not through direct confrontation. He chooses a more subtle, yet ultimately destructive, approach: psychological warfare. He begins to subtly undermine Hunberto’s authority, planting seeds of doubt and paranoia among the court. He manipulates events, staging 'coincidences' that make Hunberto appear foolish or incompetent. He spreads rumors, whispers half-truths, and generally sows discord, all while maintaining an outward appearance of melancholic detachment.  His mother, Queen Izel, grows increasingly concerned, caught between her affection for her son and her desire for stability with Hunberto.  Hunberto, aware of Hamilkar’s machinations, but unable to pinpoint the source of the disruption, tasks his loyal, but easily manipulated, spymaster, Polonio, with investigating the prince. Polonio, a man whose paranoia rivals Hunberto’s, enlists his children, the gentle Ophelia and the ambitious Laertes. Ophelia, a gifted musician who finds solace in ancient melodies, attempts to reach Hamilkar through his love of art, but he, fearing for her safety and consumed by his mission, pushes her away with cruel words. Laertes, eager to prove his loyalty, becomes a willing pawn in Hunberto’s games.  The turning point comes during a royal banquet. Instead of a play, Hamilkar orchestrates a series of elaborate pranks and illusions that expose Hunberto's greed and cruelty to the assembled guests, turning the court against him.  In the ensuing confusion, Polonio, attempting to escape the fallout and report to Hunberto, trips over a ceremonial *temazcal* steam bath and is accidentally scalded to death. Laertes, witnessing his father’s bizarre end and Ophelia’s subsequent withdrawal into a state of catatonic grief (she retreats to a secluded monastery, dedicating her life to prayer and silence), is consumed by a desire for revenge. Hunberto, cornered and desperate, orchestrates a duel between Hamilkar and Laertes, providing Laertes with a poisoned blade.  The final confrontation is a tense, drawn-out affair, filled with unspoken accusations and the clatter of ceremonial jade.  Queen Izel, attempting to mediate, drinks a poisoned goblet intended for Hamilkar, dying with a plea for peace. Laertes wounds Hamilkar. In a final, desperate act, Hamilkar, using his wits rather than brute force, tricks Laertes into a confession of Hunberto’s treachery before succumbing to the poison. He then uses his last breath to reveal Hunberto’s complicity to the surviving witnesses. Hunberto, disgraced and exposed, is left to face the wrath of the court, his reign of terror effectively over, though his ultimate fate is left ambiguous, a chilling testament to the corrosive nature of power. Horacio, the pragmatic royal scribe, is left to document the messy aftermath, his quill poised to record the tragic downfall of Huehuetlan.",
                "createdAt": "2026-01-14T00:31:27.178Z",
                "structuralEmphasis": "This variant focuses on Hamilkar's strategic manipulation and psychological warfare rather than feigned madness. The climax is a public exposure of corruption through elaborate pranks and illusions, leading to a more ambiguous and less physically violent resolution for the antagonist. Ophelia's fate is one of spiritual withdrawal, and Polonio's death is a bizarre, accidental accident.",
                "estimatedRuntimeSeconds": 300
            }
        ],
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
        "activeVariation": 0,
        "langsmithTraceId": "2e422123-bbef-48c0-b29b-788622c82fcc",
        "promptTemplateVersion": "1.0.0"
    },
    "prompt_template_version": "",
    "final_prompt": "",
    "regeneration_guidance": "",
    "created_at": "2026-01-14T00:29:24.228624+00:00",
    "created_by": "fa58ace1-ae7e-4dd8-ab54-1fbe453701f2",
    "langsmith_trace_id": null
}

{,…}
content
: 
{variations: [{id: "treatment-1768350687178-0",…}, {id: "treatment-1768350687178-1",…},…],…}
activeVariation
: 
0
langsmithTraceId
: 
"2e422123-bbef-48c0-b29b-788622c82fcc"
processedInput
: 
{mode: "expansion", contextFiles: [],…}
contextFiles
: 
[]
mode
: 
"expansion"
primaryContent
: 
"I want to make a rendition of Hamlet using the characters from \"Los Huevitos\" based in a small, fictional mesoamerican (like Aztec or Mayan) \"kingdom\" in Mexico  "
projectParams
: 
{genres: ["Comedy", "Drama"], projectType: "narrative", contentRating: "M",…}
contentRating
: 
"M"
genres
: 
["Comedy", "Drama"]
0
: 
"Comedy"
1
: 
"Drama"
projectType
: 
"narrative"
targetLengthMax
: 
300
targetLengthMin
: 
180
tonalPrecision
: 
"humorous, slurred dialouge, in Spanglish (English with common spanish words sprinkled in thier dialouge). Fast paced, "
promptTemplateVersion
: 
"1.0.0"
variations
: 
[{id: "treatment-1768350687178-0",…}, {id: "treatment-1768350687178-1",…},…]
regenerationGuidance
: 
""
status
: 
"draft"

## After stage 3 :

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






{
    "success": true,
    "data": {
        "content": "```json\n{\n  \"beats\": [\n    {\n      \"beat_id\": \"beat_1\",\n      \"order\": 1,\n      \"text\": \"Prince Hamilkar, bewildered and disheveled, learns of his father's sudden death amidst the bustling Tenochtitlan-on-the-Lake plaza.\",\n      \"rationale\": \"Establishes the protagonist, his initial state, and the inciting incident that kicks off the story.\",\n      \"estimated_screen_time_seconds\": 15\n    },\n    {\n      \"beat_id\": \"beat_2\",\n      \"order\": 2,\n      \"text\": \"Hamilkar witnesses his mother, Queen Quetzalina, already remarried to his uncle, the jovial and suspicious Hunberto, who is distributing *pulque*.\",\n      \"rationale\": \"Introduces the primary antagonist and the unsettling new family dynamic, raising immediate questions.\",\n      \"estimated_screen_time_seconds\": 15\n    },\n    {\n      \"beat_id\": \"beat_3\",\n      \"order\": 3,\n      \"text\": \"The shaman El Fantasma reveals to Hamilkar that Hunberto poisoned his father for the throne and Quetzalina.\",\n      \"rationale\": \"Provides the core conflict and motivation for the protagonist, confirming his suspicions and setting up the revenge plot.\",\n      \"estimated_screen_time_seconds\": 20\n    },\n    {\n      \"beat_id\": \"beat_4\",\n      \"order\": 4,\n      \"text\": \"Hamilkar, fueled by indignation, vows revenge and decides to feign madness, a plan easily mistaken for his usual demeanor.\",\n      \"rationale\": \"The protagonist commits to a course of action and establishes his primary strategy.\",\n      \"estimated_screen_time_seconds\": 15\n    },\n    {\n      \"beat_id\": \"beat_5\",\n      \"order\": 5,\n      \"text\": \"Hamilkar wanders the palace, muttering nonsensical riddles, confusing the court and drawing Hunberto's attention.\",\n      \"rationne\": \"The protagonist begins executing his plan, creating external reactions and raising the stakes.\",\n      \"estimated_screen_time_seconds\": 15\n    },\n    {\n      \"beat_id\": \"beat_6\",\n      \"order\": 6,\n      \"text\": \"Hunberto, threatened by Hamilkar's behavior, enlists the sycophantic advisor Polonio and his children, Ophelia and Laertes.\",\n      \"rationale\": \"The antagonist forms his own plan and introduces key supporting characters who will become involved.\",\n      \"estimated_screen_time_seconds\": 15\n    },\n    {\n      \"beat_id\": \"beat_7\",\n      \"order\": 7,\n      \"text\": \"Polonio instructs his daughter Ophelia, who loves Hamilkar, to extract information from him, which she does with apprehension.\",\n      \"rationale\": \"Develops the subplot involving Ophelia and Hamilkar, adding emotional complexity and a potential obstacle to Hamilkar's plan.\",\n      \"estimated_screen_time_seconds\": 15\n    },\n    {\n      \"beat_id\": \"beat_8\",\n      \"order\": 8,\n      \"text\": \"Hamilkar, lost in his feigned madness, rejects Ophelia, his words a jumble of despair and *chiles* pronouncements.\",\n      \"rationale\": \"A turning point in the Ophelia/Hamilkar subplot, highlighting the destructive nature of his 'madness' and its impact on his relationships.\",\n      \"estimated_screen_time_seconds\": 15\n    },\n    {\n      \"beat_id\": \"beat_9\",\n      \"order\": 9,\n      \"text\": \"During a feast, Hamilkar stages a play reenacting his father's murder, causing Hunberto to storm out in guilt.\",\n      \"rationale\": \"The protagonist executes a major gambit, directly confronting the antagonist and exposing his guilt to the court.\",\n      \"estimated_screen_time_seconds\": 20\n    },\n    {\n      \"beat_id\": \"beat_10\",\n      \"order\": 10,\n      \"text\": \"In the ensuing chaos, Hamilkar mistakes Polonio for Hunberto and accidentally impales him with his obsidian dagger.\",\n      \"rationale\": \"A critical plot twist, born from the protagonist's actions and confusion, leading to unintended but significant consequences.\",\n      \"estimated_screen_time_seconds\": 15\n    },\n    {\n      \"beat_id\": \"beat_11\",\n      \"order\": 11,\n      \"text\": \"Laertes, enraged by his father's death and Ophelia's subsequent madness and drowning, returns seeking vengeance.\",\n      \"rationale\": \"The death of Polonio and Ophelia's tragic fate raise the stakes and introduce a new antagonist seeking revenge.\",\n      \"estimated_screen_time_seconds\": 15\n    },\n    {\n      \"beat_id\": \"beat_12\",\n      \"order\": 12,\n      \"text\": \"Hunberto manipulates Laertes into a duel with Hamilkar, providing him with a poisoned dagger.\",\n      \"rationale\": \"The antagonist orchestrates the climax, using Laertes to achieve his goal of eliminating Hamilkar.\",\n      \"estimated_screen_time_seconds\": 15\n    },\n    {\n      \"beat_id\": \"beat_13\",\n      \"order\": 13,\n      \"text\": \"During the duel, Queen Quetzalina accidentally drinks poisoned wine meant for Hamilkar and dies lamenting her haste.\",\n      \"rationale\": \"A tragic turn of events during the climax, directly impacting a key character and adding to the chaos.\",\n      \"estimated_screen_time_seconds\": 15\n    },\n    {\n      \"beat_id\": \"beat_14\",\n      \"order\": 14,\n      \"text\": \"Laertes wounds Hamilkar with the poisoned dagger.\",\n      \"rationale\": \"The protagonist suffers a critical blow, indicating the severity of the situation and his impending demise.\",\n      \"estimated_screen_time_seconds\": 10\n    },\n    {\n      \"beat_id\": \"beat_15\",\n      \"order\": 15,\n      \"text\": \"Hamilkar, in a final act, stabs Hunberto with the poisoned dagger and forces him to drink the poisoned wine.\",\n      \"rationale\": \"The protagonist achieves his revenge, ensuring the antagonist's downfall alongside his own.\",\n      \"estimated_screen_time_seconds\": 15\n    },\n    {\n      \"beat_id\": \"beat_16\",\n      \"order\": 16,\n      \"text\": \"As Hamilkar dies, he entrusts the kingdom to his bewildered friend Horacio, who begins to document the tragic events.\",\n      \"rationale\": \"The protagonist's death and the resolution of the kingdom's fate, setting up the epilogue and the narrator's role.\",\n      \"estimated_screen_time_seconds\": 15\n    }\n  ],\n  \"total_estimated_runtime\": 245,\n  \"narrative_structure\": \"3-act structure\"\n}\n```",
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


## Stage 4

http://localhost:8080/api/llm/generate-from-template

{
    "success": true,
    "data": {
        "content": "FADE IN:\n\nEXT. TENOCHTITLAN-ON-THE-LAKE PLAZA - DAY\n\nThe air THUMS with the chaotic symphony of a sprawling marketplace. Sunlight, thick and golden, glints off the shimmering waters of the great lake. Elaborate pyramids, their stone faces carved with ancient gods, pierce the impossibly blue sky. Below, a vibrant tapestry of humanity surges: merchants hawk their wares with booming voices, children dart through legs like brightly feathered birds, and the scent of roasting maize and exotic spices hangs heavy.\n\nIn the heart of this maelstrom stands PRINCE HAMILKAR. He’s a striking young man, but currently a spectacle of dishevelment. His once-pristine royal attire is rumpled, his dark hair matted, and his eyes, wide with a dazed confusion, dart wildly. He clutches a half-eaten *elote* in one hand, the corn kernels scattered on the dusty ground, a forgotten casualty of his shock. A low, guttural murmur escapes his lips, a sound lost in the cacophony. A messenger, sweat beading on his brow and his breath ragged, shoves through the crowd, his face a mask of urgency. He grabs Hamilkar's arm, his grip tight.\n\nMESSENGER\n(Voice strained)\nPrince Hamilkar! A terrible… *tragedia*! Your father, the Great Tlatoani… he is… *muerto*!\n\nHamilkar’s eyes, already unfocused, widen further. The *elote* slips from his grasp, hitting the ground with a soft THUD. The sounds of the plaza seem to recede, replaced by a hollow ROAR in his ears. His mouth hangs open, a silent gasp.\n\nEXT. ROYAL PALACE COURTYARD - CONTINUOUS\n\nA stark contrast to the plaza’s boisterous energy. Here, an unsettling stillness prevails, broken only by the murmurs of a stunned court. QUEEN QUETZALINA, a regal woman whose beauty is now etched with a grief that feels… performative, stands beside a man. This is HUNBERTO, Hamilkar's uncle. He’s a burly man, his face permanently set in a jovial, almost leering, smile. His rich robes are ostentatious, dripping with gold and jade. He clutches a large, clay jug overflowing with a milky, opaque liquid – *pulque*. He laughs, a booming, forced sound, and slaps the back of a nearby noble, who flinches.\n\nHamilkar, still reeling, stumbles into the courtyard. His gaze lands on his mother, her hand resting familiarly on Hunberto’s arm. The sight is a visceral blow. He stares, his jaw Slack. Hunberto notices him, his smile widening, a flash of something predatory in his eyes. He raises the *pulque* jug in a mock toast.\n\nHUNBERTO\n(Slurred, jovial)\nAh, my nephew! Come, join the celebration! A new era begins! *Salud*!\n\nHamilkar doesn't move, his eyes locked on his mother, searching for any sign of recognition, of shared sorrow. He finds only a polite, distant smile.\n\nINT. SHAMAN’S HUT - NIGHT\n\nThe air inside is thick with the scent of smoldering herbs and dried copal. Flickering torchlight casts dancing shadows on walls adorned with intricate, unsettling masks and woven tapestries depicting celestial battles. EL FANTASMA, the shaman, is a wizened figure, his skin like ancient parchment. He wears a headdress of iridescent quetzal feathers and his eyes, though clouded with age, hold a sharp, unnerving intelligence. Hamilkar sits before him, his posture slumped, the earlier shock replaced by a gnawing unease.\n\nEL FANTASMA\n(Voice raspy, deliberate)\nThe Serpent has shed its skin, Prince. But not by natural cause. Your father… he was betrayed. Poisoned. The *pulque* was laced, a bitter draught for a king.\n\nHe gestures with a bony finger towards a dark, obsidian mirror on a low table.\n\nEL FANTASMA (CONT'D)\nYour uncle, Hunberto. He craved the throne. And your mother… he desired her too. A viper in the royal chambers.\n\nHamilkar’s knuckles whiten as he grips the edge of the table. His breath hitches. The pieces click into place – his mother’s hasty remarriage, Hunberto’s unctuous demeanor. Indignation, hot and sharp, floods his system.\n\nHAMILKAR\n(Voice a low growl)\nHunberto… *ese cabrón*! He will pay.\n\nEL FANTASMA\nRevenge is a sharp blade, Prince. It can cut both ways.\n\nHAMILKAR\n(Eyes hardening, a glint of madness in them)\nThen I will be the sharpest blade of all. They think me broken. *Bueno*. Let them. I will embrace the madness they see. I will become the fool, the jester… and no one will suspect a thing.\n\nHe rises, a new resolve hardening his features. The disheveled prince is gone, replaced by a man with a dangerous, cunning spark.\n\nINT. ROYAL PALACE CORRIDORS - DAY\n\nHamilkar wanders through the opulent, echoing halls of the palace. His movements are exaggerated, his gait uneven. He stops abruptly, staring at a tapestry depicting a jaguar hunt, then bursts into nonsensical laughter. He picks up a decorative vase, examines it intently, then tosses it carelessly onto a plush rug. He mumbles to himself, weaving bizarre pronouncements with fragments of ancient prophecies.\n\nHAMILKAR\n(To himself, slurring)\nThe sun weeps *chiles*! The moon is a missing *tamal*! Who will find the lost tortilla? *Ay, caramba*!\n\nGuards, their polished obsidian helmets gleaming, exchange uneasy glances. Courtiers discreetly edge away, their faces a mixture of pity and apprehension. Hunberto, observing from a distance, a goblet of wine in hand, raises an eyebrow. A slow, calculating smile spreads across his face.\n\nINT. HUNBERTO'S CHAMBERS - NIGHT\n\nHunberto paces his lavish chamber, the air heavy with the scent of expensive incense. He stops before a large, ornate mirror, studying his reflection. POLONIO, a gaunt, nervous man with beady eyes and a perpetually hunched posture, stands before him, wringing his hands. He wears the elaborate robes of a royal advisor, but his demeanor is that of a cornered mouse.\n\nHUNBERTO\n(Voice low, menacing)\nThe Prince is… erratic. More than usual. It smells like a trap, Polonio. This feigned madness… it’s a performance. And I don't like the audience.\n\nPOLONIO\n(Stuttering)\nYes, Your Majesty… I mean, Your Highness… he is… unpredictable.\n\nHUNBERTO\nWe need to know what he’s planning. And you, my loyal advisor, are the perfect instrument.\n\nHe turns to Polonio, his smile gone, replaced by a chilling intensity.\n\nHUNBERTO (CONT'D)\nYour daughter. Ophelia. She has a… fondness for him, does she not?\n\nPolonio visibly gulps.\n\nPOLONIO\nShe… she does, Your Highness. But she is loyal.\n\nHUNBERTO\nLoyalty can be… tested. Send her to him. Let her probe. Find out what this *locura* is all about. And be quick about it.\n\nINT. PALACE GARDENS - DAY\n\nSunlight dapples through the leaves of ancient trees, casting shifting patterns on manicured hedges. Flowers in vibrant hues bloom in profusion. OPHELIA, a young woman of delicate beauty, her eyes large and troubled, nervously approaches Hamilkar. She wears a simple, elegant gown, a stark contrast to the court’s opulence. Hamilkar sits on a stone bench, idly picking at a loose thread on his tunic.\n\nOPHELIA\n(Voice soft, hesitant)\nPrince Hamilkar? Are you… are you well? My father sent me. He… he is concerned.\n\nHamilkar looks up, his eyes unfocused for a moment, then he seems to focus on her. A flicker of recognition, quickly masked.\n\nHAMILKAR\n(Slurring, a strange cadence)\nConcerned? The owl is concerned for the mouse before the serpent strikes, *mija*. Tell your father… the stars are aligning. But the alignment is… *chueco*.\n\nHe leans closer, his gaze intense, unsettling.\n\nHAMILKAR (CONT'D)\nHe wants to know, doesn’t he? The man with the greedy smile. He wants to know… if the jaguar has teeth. Does it, Ophelia? Does the jaguar still have teeth?\n\nOphelia recoils slightly, her apprehension mounting.\n\nOPHELIA\nI… I don’t understand.\n\nHAMILKAR\n(A mirthless chuckle)\nNo one does. That’s the beauty of it. Now go. Before the *brujo* sees us.\n\nHe waves a dismissive hand, turning his attention back to the loose thread, his gaze distant again. Ophelia watches him for a moment, a profound sadness clouding her features, before turning and hurrying away.\n\nINT. ROYAL BANQUET HALL - NIGHT\n\nThe hall is a riot of color and sound. Torches blaze, casting a warm, flickering glow on the faces of the assembled nobility. Servants weave through the crowd, offering platters of exotic food and goblets of wine. At the head of the long table sits Hunberto, his jovial demeanor firmly in place, Quetzalina by his side, looking regal but subdued.\n\nHamilkar, surprisingly clean and dressed in formal attire, stands before the assembled court. He clears his throat, his voice amplified by the hall’s acoustics.\n\nHAMILKAR\n(Projecting, but with an underlying tremor)\nMy lords, my ladies! I have prepared a… a *obra*. A play! To commemorate a… a grave injustice.\n\nHe gestures, and several actors, dressed as royalty, emerge. They begin a pantomime, a stylized reenactment of a king being poisoned. Hamilkar, playing the role of the poisoned king, clutches his throat, his movements dramatic. He points a trembling finger at an actor playing Hunberto.\n\nHAMILKAR (CONT'D)\n(Voice cracking with feigned anguish)\nBetrayal! From within my own house! The *pulque*… it was poisoned!\n\nHunberto’s smile falters. His eyes narrow, fixed on Hamilkar. Quetzalina looks bewildered. As the play reaches its climax, with the poisoned king collapsing, Hunberto can no longer contain himself. He slams his fist on the table, his face contorted with rage.\n\nHUNBERTO\n(Roaring)\nEnough! This is madness! Insolence!\n\nHe rises abruptly, knocking his chair over with a CLATTER. He glares at Hamilkar, his eyes burning with fury, then storms out of the hall, Quetzalina following him, a look of deep concern on her face. The court erupts in murmurs.\n\nINT. ROYAL BANQUET HALL - CONTINUOUS\n\nChaos. The court is a flurry of shocked whispers and confused movements. Hamilkar, his heart pounding, scans the room, adrenaline coursing through him. He spots Polonio, his back turned, trying to blend into the shadows near a side exit. In his heightened state, fueled by the play’s success and the ensuing pandemonium, Hamilkar mistakes him for Hunberto.\n\nHAMILKAR\n(To himself, a triumphant growl)\nGot you, *cabrón*!\n\nHe lunges, his obsidian dagger, a wickedly sharp ceremonial blade, glinting in the torchlight. Polonio turns, his eyes widening in terror, but it’s too late. Hamilkar plunges the dagger deep into his unsuspecting back. Polonio gasps, a strangled sound, and collapses to the floor, a crimson stain spreading across his ornate robes. Hamilkar, realizing his mistake with a sickening lurch, stares at the dagger, then at the lifeless body, his face a mask of horror.\n\nINT. ROYAL PALACE - DAYS LATER\n\nThe atmosphere is thick with mourning and a palpable sense of dread. The death of Polonio has sent shockwaves through the court. Ophelia, driven to the brink by her father’s sudden, brutal death and Hamilkar's apparent madness, has succumbed to a deep, inconsolable despair. We see her, a spectral figure, weeping uncontrollably, her once-bright eyes hollow. Later, a servant finds a single, muddy slipper floating in a secluded palace fountain – Ophelia has drowned.\n\nLAERTES, Polonio’s son, bursts into the palace courtyard. He’s a powerfully built young man, his face a mask of raw grief and burning rage. His eyes, sharp and intelligent, scan the assembled courtiers, searching for Hamilkar. He carries himself with a military bearing, his fists clenched.\n\nLAERTES\n(Voice raw with fury)\nWhere is he? Where is the one who murdered my father? I will have justice!\n\nHunberto, ever the opportunist, emerges from the shadows, his face a mask of sorrowful concern. He places a hand on Laertes's shoulder.\n\nHUNBERTO\n(Smoothly, insidiously)\nMy dear Laertes. Your grief is understandable. A terrible loss. But this is not the way. Revenge… it is a poisoned chalice.\n\nHe steers Laertes away from the crowd, his voice dropping to a conspiratorial whisper.\n\nHUNBERTO (CONT'D)\nBut perhaps… there is a way to achieve a just end. A duel. A formal challenge. I can provide you with… an advantage.\n\nHe produces a dagger, its blade gleaming ominously, coated in a dark, viscous substance.\n\nHUNBERTO (CONT'D)\nThis blade… it carries a potent venom. One strike, and your enemy will fall.\n\nLaertes, his eyes blazing with a thirst for vengeance, takes the dagger.\n\nINT. DUELING ARENA - DAY\n\nA circular arena, its sand stained with the blood of past contests. A hushed crowd surrounds the perimeter, their faces a mixture of anticipation and morbid curiosity. Hamilkar, looking paler but resolute, stands opposite Laertes. Laertes, his jaw set, grips the poisoned dagger. Hunberto watches from the royal box, a smug smile playing on his lips. Quetzalina stands beside him, her face etched with worry, a jeweled goblet of wine in her hand.\n\nThe duel begins. The clash of obsidian against obsidian echoes through the arena. Hamilkar fights with a desperate ferocity, his movements surprisingly agile. Laertes, fueled by rage, is a whirlwind of aggression.\n\nDuring a brief lull, a servant approaches Quetzalina, offering her the goblet of wine. Distracted, she takes a large gulp.\n\nLAERTES\n(Shouting)\nYou took my father! You drove my sister to her death! Now you will pay!\n\nHe lunges, a swift, brutal thrust. Hamilkar parries, but the poisoned blade scrapes his arm, drawing blood. Hamilkar stumbles back, a sharp pain radiating from the wound. His eyes widen as he sees the dark fluid on the blade.\n\nSuddenly, Quetzalina cries out, a choked gasp. She clutches her throat, her eyes wide with shock and dawning realization. The wine…\n\nQUEEN QUETZALINA\n(Weakly, a look of regret)\nMy haste… my foolish haste…\n\nShe collapses, the goblet falling from her grasp and shattering on the stone floor. The court gasps.\n\nHamilkar, seeing his mother fall, his vision blurring, knows his time is short. But his resolve hardens. He looks at Hunberto, a look of pure hatred in his eyes. With a surge of adrenaline, he lunges at Laertes, disarming him. He snatches the poisoned dagger, then turns, his movements surprisingly swift despite the poison coursing through him. He lunges at Hunberto.\n\nHAMILKAR\n(Voice a hoarse rasp)\nFor my father! For my mother!\n\nHe plunges the poisoned dagger into Hunberto’s chest. Hunberto gasps, his eyes wide with disbelief and pain. Hamilkar then grabs the fallen goblet, forces the remaining poisoned wine to Hunberto’s lips.\n\nHAMILKAR (CONT'D)\nDrink, *serpiente*! Drink to your new kingdom!\n\nHunberto chokes, the poison taking hold. He clutches Hamilkar’s arm, then collapses to the ground, his lifeblood mingling with the spilled wine.\n\nHamilkar stumbles back, his own body wracked with agony. He sinks to his knees, the obsidian dagger falling from his grasp. He looks at his bewildered friend, HORACIO, who rushes to his side.\n\nHAMILKAR\n(Whispering, his voice fading)\nHoracio… the kingdom… it is yours. Tell them… tell them the truth… of this… *tragedia*.\n\nHis eyes flutter closed. His head lolls to the side. He is still.\n\nHoracio, tears streaming down his face, looks at the carnage around him – the fallen king, the poisoned queen, the dead advisor, the dying prince, the vanquished uncle. He pulls out a scroll and a quill, his hand trembling, and begins to write.\n\nFADE OUT.",
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


### I fear you don't understand how systme works OR but actually maybe my system is mal designed



















/api/projects/{id}/stage-2/generate-treatment

variables
: 
{input_mode: "expansion",…}
content_rating
: 
"M"
context_files
: 
""
genres
: 
"Comedy, Drama"
input_mode
: 
"expansion"
primary_content
: 
"I want to make a rendition of Hamlet using the characters from \"Los Huevitos\" based in a small, fictional mesoamerican (like Aztec or Mayan) \"kingdom\" in Mexico  "
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
"humorous, slurred dialouge, in Spanglish (English with common spanish words sprinkled in thier dialouge). Fast paced, "
writing_style_context
: 
""

{
    "success": true,
    "data": {
        "content": "```json\n{\n  \"treatments\": [\n    {\n      \"variant_id\": 1,\n      \"prose\": \"The vibrant, sun-baked plaza of Tenochtitlan-on-the-Lake, a miniature. Ophelia's fate is one of spiritual withdrawal, and Polonio's death is a bizarre, accidental accident.\",\n      \"estimated_runtime_seconds\": 300\n    }\n  ]\n}\n```",
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



after stage 5: "lock"

## http://localhost:8080/api/projects/4941ad27-6ab6-4af2-9464-d1ca790d6723/stages/4/lock

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
                "content": "EXT. TENOCHTITLAN-ON-THE-LAKE PLAZA - DAY\n\nThe air THUMS with the chaotic symphony of a sprawling marketplace. Sunlight, thick and golden, glints off the shimmering waters of the great lake. Elaborate pyramids, their stone faces carved with ancient gods, pierce the impossibly blue sky. Below, a vibrant tapestry of humanity surges: merchants hawk their wares with booming voices, children dart through legs like brightly feathered birds, and the scent of roasting maize and exotic spices hangs heavy.\n\nIn the heart of this maelstrom stands PRINCE HAMILKAR. He’s a striking young man, but currently a spectacle of dishevelment. His once-pristine royal attire is rumpled, his dark hair matted, and his eyes, wide with a dazed confusion, dart wildly. He clutches a half-eaten *elote* in one hand, the corn kernels scattered on the dusty ground, a forgotten casualty of his shock. A low, guttural murmur escapes his lips, a sound lost in the cacophony. A messenger, sweat beading on his brow and his breath ragged, shoves through the crowd, his face a mask of urgency. He grabs Hamilkar's arm, his grip tight.\n\n                    MESSENGER\n               (Voice strained)\n          Prince Hamilkar! A terrible… *tragedia*! Your father, the Great Tlatoani… he is… *muerto*!\nHamilkar’s eyes, already unfocused, widen further. The *elote* slips from his grasp, hitting the ground with a soft THUD. The sounds of the plaza seem to recede, replaced by a hollow ROAR in his ears. His mouth hangs open, a silent gasp.",
                "heading": "EXT. TENOCHTITLAN-ON-THE-LAKE PLAZA - DAY",
                "sceneNumber": 1
            },
            {
                "id": "scene-2-1768351712766",
                "slug": "ext-royal-palace-courtyard-continuous",
                "content": "EXT. ROYAL PALACE COURTYARD - CONTINUOUS\n\nA stark contrast to the plaza’s boisterous energy. Here, an unsettling stillness prevails, broken only by the murmurs of a stunned court. QUEEN QUETZALINA, a regal woman whose beauty is now etched with a grief that feels… performative, stands beside a man. This is HUNBERTO, Hamilkar's uncle. He’s a burly man, his face permanently set in a jovial, almost leering, smile. His rich robes are ostentatious, dripping with gold and jade. He clutches a large, clay jug overflowing with a milky, opaque liquid – *pulque*. He laughs, a booming, forced sound, and slaps the back of a nearby noble, who flinches.\n\nHamilkar, still reeling, stumbles into the courtyard. His gaze lands on his mother, her hand resting familiarly on Hunberto’s arm. The sight is a visceral blow. He stares, his jaw Slack. Hunberto notices him, his smile widening, a flash of something predatory in his eyes. He raises the *pulque* jug in a mock toast.\n\n                    HUNBERTO\n               (Slurred, jovial)\nAh, my nephew! Come, join the celebration! A new era begins! *Salud*!\n\nHamilkar doesn't move, his eyes locked on his mother, searching for any sign of recognition, of shared sorrow. He finds only a polite, distant smile.",
                "heading": "EXT. ROYAL PALACE COURTYARD - CONTINUOUS",
                "sceneNumber": 2
            },
            {
                "id": "scene-3-1768351712766",
                "slug": "int-shamans-hut-night",
                "content": "INT. SHAMAN’S HUT - NIGHT\n\nThe air inside is thick with the scent of smoldering herbs and dried copal. Flickering torchlight casts dancing shadows on walls adorned with intricate, unsettling masks and woven tapestries depicting celestial battles. EL FANTASMA, the shaman, is a wizened figure, his skin like ancient parchment. He wears a headdress of iridescent quetzal feathers and his eyes, though clouded with age, hold a sharp, unnerving intelligence. Hamilkar sits before him, his posture slumped, the earlier shock replaced by a gnawing unease.\n\n                    EL FANTASMA\n               (Voice raspy, deliberate)\nThe Serpent has shed its skin, Prince. But not by natural cause. Your father… he was betrayed. Poisoned. The *pulque* was laced, a bitter draught for a king.\n\nHe gestures with a bony finger towards a dark, obsidian mirror on a low table.\n\nEL FANTASMA (CONT'D)\n\nYour uncle, Hunberto. He craved the throne. And your mother… he desired her too. A viper in the royal chambers.\n\nHamilkar’s knuckles whiten as he grips the edge of the table. His breath hitches. The pieces click into place – his mother’s hasty remarriage, Hunberto’s unctuous demeanor. Indignation, hot and sharp, floods his system.\n\n                    HAMILKAR\n               (Voice a low growl)\nHunberto… *ese cabrón*! He will pay.\n\n                    EL FANTASMA\nRevenge is a sharp blade, Prince. It can cut both ways.\n\n                    HAMILKAR\n               (Eyes hardening, a glint of madness in them)\nThen I will be the sharpest blade of all. They think me broken. *Bueno*. Let them. I will embrace the madness they see. I will become the fool, the jester… and no one will suspect a thing.\n\nHe rises, a new resolve hardening his features. The disheveled prince is gone, replaced by a man with a dangerous, cunning spark.",
                "heading": "INT. SHAMAN’S HUT - NIGHT",
                "sceneNumber": 3
            },
            {
                "id": "scene-4-1768351712766",
                "slug": "int-royal-palace-corridors-day",
                "content": "INT. ROYAL PALACE CORRIDORS - DAY\n\nHamilkar wanders through the opulent, echoing halls of the palace. His movements are exaggerated, his gait uneven. He stops abruptly, staring at a tapestry depicting a jaguar hunt, then bursts into nonsensical laughter. He picks up a decorative vase, examines it intently, then tosses it carelessly onto a plush rug. He mumbles to himself, weaving bizarre pronouncements with fragments of ancient prophecies.\n\n                    HAMILKAR\n               (To himself, slurring)\nThe sun weeps *chiles*! The moon is a missing *tamal*! Who will find the lost tortilla? *Ay, caramba*!\n\nGuards, their polished obsidian helmets gleaming, exchange uneasy glances. Courtiers discreetly edge away, their faces a mixture of pity and apprehension. Hunberto, observing from a distance, a goblet of wine in hand, raises an eyebrow. A slow, calculating smile spreads across his face.",
                "heading": "INT. ROYAL PALACE CORRIDORS - DAY",
                "sceneNumber": 4
            },
            {
                "id": "scene-5-1768351712766",
                "slug": "int-hunbertos-chambers-night",
                "content": "INT. HUNBERTO'S CHAMBERS - NIGHT\n\nHunberto paces his lavish chamber, the air heavy with the scent of expensive incense. He stops before a large, ornate mirror, studying his reflection. POLONIO, a gaunt, nervous man with beady eyes and a perpetually hunched posture, stands before him, wringing his hands. He wears the elaborate robes of a royal advisor, but his demeanor is that of a cornered mouse.\n\n                    HUNBERTO\n               (Voice low, menacing)\nThe Prince is… erratic. More than usual. It smells like a trap, Polonio. This feigned madness… it’s a performance. And I don't like the audience.\n\n                    POLONIO\n               (Stuttering)\nYes, Your Majesty… I mean, Your Highness… he is… unpredictable.\n\n                    HUNBERTO\nWe need to know what he’s planning. And you, my loyal advisor, are the perfect instrument.\n\nHe turns to Polonio, his smile gone, replaced by a chilling intensity.\n\nHUNBERTO (CONT'D)\n\nYour daughter. Ophelia. She has a… fondness for him, does she not?\n\nPolonio visibly gulps.\n\n                    POLONIO\nShe… she does, Your Highness. But she is loyal.\n\n                    HUNBERTO\nLoyalty can be… tested. Send her to him. Let her probe. Find out what this *locura* is all about. And be quick about it.",
                "heading": "INT. HUNBERTO'S CHAMBERS - NIGHT",
                "sceneNumber": 5
            },
            {
                "id": "scene-6-1768351712766",
                "slug": "int-palace-gardens-day",
                "content": "INT. PALACE GARDENS - DAY\n\nSunlight dapples through the leaves of ancient trees, casting shifting patterns on manicured hedges. Flowers in vibrant hues bloom in profusion. OPHELIA, a young woman of delicate beauty, her eyes large and troubled, nervously approaches Hamilkar. She wears a simple, elegant gown, a stark contrast to the court’s opulence. Hamilkar sits on a stone bench, idly picking at a loose thread on his tunic.\n\n                    OPHELIA\n               (Voice soft, hesitant)\nPrince Hamilkar? Are you… are you well? My father sent me. He… he is concerned.\n\nHamilkar looks up, his eyes unfocused for a moment, then he seems to focus on her. A flicker of recognition, quickly masked.\n\n                    HAMILKAR\n               (Slurring, a strange cadence)\nConcerned? The owl is concerned for the mouse before the serpent strikes, *mija*. Tell your father… the stars are aligning. But the alignment is… *chueco*.\n\nHe leans closer, his gaze intense, unsettling.\n\nHAMILKAR (CONT'D)\n\nHe wants to know, doesn’t he? The man with the greedy smile. He wants to know… if the jaguar has teeth. Does it, Ophelia? Does the jaguar still have teeth?\n\nOphelia recoils slightly, her apprehension mounting.\n\n                    OPHELIA\nI… I don’t understand.\n\n                    HAMILKAR\n               (A mirthless chuckle)\nNo one does. That’s the beauty of it. Now go. Before the *brujo* sees us.\n\nHe waves a dismissive hand, turning his attention back to the loose thread, his gaze distant again. Ophelia watches him for a moment, a profound sadness clouding her features, before turning and hurrying away.",
                "heading": "INT. PALACE GARDENS - DAY",
                "sceneNumber": 6
            },
            {
                "id": "scene-7-1768351712766",
                "slug": "int-royal-banquet-hall-night",
                "content": "INT. ROYAL BANQUET HALL - NIGHT\n\nThe hall is a riot of color and sound. Torches blaze, casting a warm, flickering glow on the faces of the assembled nobility. Servants weave through the crowd, offering platters of exotic food and goblets of wine. At the head of the long table sits Hunberto, his jovial demeanor firmly in place, Quetzalina by his side, looking regal but subdued.\n\nHamilkar, surprisingly clean and dressed in formal attire, stands before the assembled court. He clears his throat, his voice amplified by the hall’s acoustics.\n\n                    HAMILKAR\n               (Projecting, but with an underlying tremor)\nMy lords, my ladies! I have prepared a… a *obra*. A play! To commemorate a… a grave injustice.\n\nHe gestures, and several actors, dressed as royalty, emerge. They begin a pantomime, a stylized reenactment of a king being poisoned. Hamilkar, playing the role of the poisoned king, clutches his throat, his movements dramatic. He points a trembling finger at an actor playing Hunberto.\n\nHAMILKAR (CONT'D)\n\n               (Voice cracking with feigned anguish)\nBetrayal! From within my own house! The *pulque*… it was poisoned!\n\nHunberto’s smile falters. His eyes narrow, fixed on Hamilkar. Quetzalina looks bewildered. As the play reaches its climax, with the poisoned king collapsing, Hunberto can no longer contain himself. He slams his fist on the table, his face contorted with rage.\n\n                    HUNBERTO\n               (Roaring)\nEnough! This is madness! Insolence!\n\nHe rises abruptly, knocking his chair over with a CLATTER. He glares at Hamilkar, his eyes burning with fury, then storms out of the hall, Quetzalina following him, a look of deep concern on her face. The court erupts in murmurs.",
                "heading": "INT. ROYAL BANQUET HALL - NIGHT",
                "sceneNumber": 7
            },
            {
                "id": "scene-8-1768351712766",
                "slug": "int-royal-banquet-hall-continuous",
                "content": "INT. ROYAL BANQUET HALL - CONTINUOUS\n\nChaos. The court is a flurry of shocked whispers and confused movements. Hamilkar, his heart pounding, scans the room, adrenaline coursing through him. He spots Polonio, his back turned, trying to blend into the shadows near a side exit. In his heightened state, fueled by the play’s success and the ensuing pandemonium, Hamilkar mistakes him for Hunberto.\n\n                    HAMILKAR\n               (To himself, a triumphant growl)\nGot you, *cabrón*!\n\nHe lunges, his obsidian dagger, a wickedly sharp ceremonial blade, glinting in the torchlight. Polonio turns, his eyes widening in terror, but it’s too late. Hamilkar plunges the dagger deep into his unsuspecting back. Polonio gasps, a strangled sound, and collapses to the floor, a crimson stain spreading across his ornate robes. Hamilkar, realizing his mistake with a sickening lurch, stares at the dagger, then at the lifeless body, his face a mask of horror.",
                "heading": "INT. ROYAL BANQUET HALL - CONTINUOUS",
                "sceneNumber": 8
            },
            {
                "id": "scene-9-1768351712766",
                "slug": "int-royal-palace-days-later",
                "content": "INT. ROYAL PALACE - DAYS LATER\n\nThe atmosphere is thick with mourning and a palpable sense of dread. The death of Polonio has sent shockwaves through the court. Ophelia, driven to the brink by her father’s sudden, brutal death and Hamilkar's apparent madness, has succumbed to a deep, inconsolable despair. We see her, a spectral figure, weeping uncontrollably, her once-bright eyes hollow. Later, a servant finds a single, muddy slipper floating in a secluded palace fountain – Ophelia has drowned.\n\nLAERTES, Polonio’s son, bursts into the palace courtyard. He’s a powerfully built young man, his face a mask of raw grief and burning rage. His eyes, sharp and intelligent, scan the assembled courtiers, searching for Hamilkar. He carries himself with a military bearing, his fists clenched.\n\n                    LAERTES\n               (Voice raw with fury)\nWhere is he? Where is the one who murdered my father? I will have justice!\n\nHunberto, ever the opportunist, emerges from the shadows, his face a mask of sorrowful concern. He places a hand on Laertes's shoulder.\n\n                    HUNBERTO\n               (Smoothly, insidiously)\nMy dear Laertes. Your grief is understandable. A terrible loss. But this is not the way. Revenge… it is a poisoned chalice.\n\nHe steers Laertes away from the crowd, his voice dropping to a conspiratorial whisper.\n\nHUNBERTO (CONT'D)\n\nBut perhaps… there is a way to achieve a just end. A duel. A formal challenge. I can provide you with… an advantage.\n\nHe produces a dagger, its blade gleaming ominously, coated in a dark, viscous substance.\n\nHUNBERTO (CONT'D)\n\nThis blade… it carries a potent venom. One strike, and your enemy will fall.\n\nLaertes, his eyes blazing with a thirst for vengeance, takes the dagger.",
                "heading": "INT. ROYAL PALACE - DAYS LATER",
                "sceneNumber": 9
            },
            {
                "id": "scene-10-1768351712766",
                "slug": "int-dueling-arena-day",
                "content": "INT. DUELING ARENA - DAY\n\nA circular arena, its sand stained with the blood of past contests. A hushed crowd surrounds the perimeter, their faces a mixture of anticipation and morbid curiosity. Hamilkar, looking paler but resolute, stands opposite Laertes. Laertes, his jaw set, grips the poisoned dagger. Hunberto watches from the royal box, a smug smile playing on his lips. Quetzalina stands beside him, her face etched with worry, a jeweled goblet of wine in her hand.\n\nThe duel begins. The clash of obsidian against obsidian echoes through the arena. Hamilkar fights with a desperate ferocity, his movements surprisingly agile. Laertes, fueled by rage, is a whirlwind of aggression.\n\nDuring a brief lull, a servant approaches Quetzalina, offering her the goblet of wine. Distracted, she takes a large gulp.\n\n                    LAERTES\n               (Shouting)\nYou took my father! You drove my sister to her death! Now you will pay!\n\nHe lunges, a swift, brutal thrust. Hamilkar parries, but the poisoned blade scrapes his arm, drawing blood. Hamilkar stumbles back, a sharp pain radiating from the wound. His eyes widen as he sees the dark fluid on the blade.\n\nSuddenly, Quetzalina cries out, a choked gasp. She clutches her throat, her eyes wide with shock and dawning realization. The wine…\n\n                    QUEEN QUETZALINA\n               (Weakly, a look of regret)\nMy haste… my foolish haste…\n\nShe collapses, the goblet falling from her grasp and shattering on the stone floor. The court gasps.\n\nHamilkar, seeing his mother fall, his vision blurring, knows his time is short. But his resolve hardens. He looks at Hunberto, a look of pure hatred in his eyes. With a surge of adrenaline, he lunges at Laertes, disarming him. He snatches the poisoned dagger, then turns, his movements surprisingly swift despite the poison coursing through him. He lunges at Hunberto.\n\n                    HAMILKAR\n               (Voice a hoarse rasp)\nFor my father! For my mother!\n\nHe plunges the poisoned dagger into Hunberto’s chest. Hunberto gasps, his eyes wide with disbelief and pain. Hamilkar then grabs the fallen goblet, forces the remaining poisoned wine to Hunberto’s lips.\n\nHAMILKAR (CONT'D)\n\nDrink, *serpiente*! Drink to your new kingdom!\n\nHunberto chokes, the poison taking hold. He clutches Hamilkar’s arm, then collapses to the ground, his lifeblood mingling with the spilled wine.\n\nHamilkar stumbles back, his own body wracked with agony. He sinks to his knees, the obsidian dagger falling from his grasp. He looks at his bewildered friend, HORACIO, who rushes to his side.\n\n                    HAMILKAR\n               (Whispering, his voice fading)\nHoracio… the kingdom… it is yours. Tell them… tell them the truth… of this… *tragedia*.\n\nHis eyes flutter closed. His head lolls to the side. He is still.\n\nHoracio, tears streaming down his face, looks at the carnage around him – the fallen king, the poisoned queen, the dead advisor, the dying prince, the vanquished uncle. He pulls out a scroll and a quill, his hand trembling, and begins to write.\n\nFADE OUT.",
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
                {
                    "id": "beat_2",
                    "text": "Hamilkar witnesses his mother, Queen Quetzalina, already remarried to his uncle, the jovial and suspicious Hunberto, who is distributing *pulque*.",
                    "order": 2,
                    "rationale": "Introduces the primary antagonist and the unsettling new family dynamic, raising immediate questions.",
                    "isExpanded": false,
                    "estimatedScreenTimeSeconds": 15
                },
                {
                    "id": "beat_3",
                    "text": "The shaman El Fantasma reveals to Hamilkar that Hunberto poisoned his father for the throne and Quetzalina.",
                    "order": 3,
                    "rationale": "Provides the core conflict and motivation for the protagonist, confirming his suspicions and setting up the revenge plot.",
                    "isExpanded": false,
                    "estimatedScreenTimeSeconds": 20
                },
                {
                    "id": "beat_4",
                    "text": "Hamilkar, fueled by indignation, vows revenge and decides to feign madness, a plan easily mistaken for his usual demeanor.",
                    "order": 4,
                    "rationale": "The protagonist commits to a course of action and establishes his primary strategy.",
                    "isExpanded": false,
                    "estimatedScreenTimeSeconds": 15
                },
                {
                    "id": "beat_5",
                    "text": "Hamilkar wanders the palace, muttering nonsensical riddles, confusing the court and drawing Hunberto's attention.",
                    "order": 5,
                    "rationale": "",
                    "isExpanded": false,
                    "estimatedScreenTimeSeconds": 15
                },
                {
                    "id": "beat_6",
                    "text": "Hunberto, threatened by Hamilkar's behavior, enlists the sycophantic advisor Polonio and his children, Ophelia and Laertes.",
                    "order": 6,
                    "rationale": "The antagonist forms his own plan and introduces key supporting characters who will become involved.",
                    "isExpanded": false,
                    "estimatedScreenTimeSeconds": 15
                },
                {
                    "id": "beat_7",
                    "text": "Polonio instructs his daughter Ophelia, who loves Hamilkar, to extract information from him, which she does with apprehension.",
                    "order": 7,
                    "rationale": "Develops the subplot involving Ophelia and Hamilkar, adding emotional complexity and a potential obstacle to Hamilkar's plan.",
                    "isExpanded": false,
                    "estimatedScreenTimeSeconds": 15
                },
                {
                    "id": "beat_8",
                    "text": "Hamilkar, lost in his feigned madness, rejects Ophelia, his words a jumble of despair and *chiles* pronouncements.",
                    "order": 8,
                    "rationale": "A turning point in the Ophelia/Hamilkar subplot, highlighting the destructive nature of his 'madness' and its impact on his relationships.",
                    "isExpanded": false,
                    "estimatedScreenTimeSeconds": 15
                },
                {
                    "id": "beat_9",
                    "text": "During a feast, Hamilkar stages a play reenacting his father's murder, causing Hunberto to storm out in guilt.",
                    "order": 9,
                    "rationale": "The protagonist executes a major gambit, directly confronting the antagonist and exposing his guilt to the court.",
                    "isExpanded": false,
                    "estimatedScreenTimeSeconds": 20
                },
                {
                    "id": "beat_10",
                    "text": "In the ensuing chaos, Hamilkar mistakes Polonio for Hunberto and accidentally impales him with his obsidian dagger.",
                    "order": 10,
                    "rationale": "A critical plot twist, born from the protagonist's actions and confusion, leading to unintended but significant consequences.",
                    "isExpanded": false,
                    "estimatedScreenTimeSeconds": 15
                },
                {
                    "id": "beat_11",
                    "text": "Laertes, enraged by his father's death and Ophelia's subsequent madness and drowning, returns seeking vengeance.",
                    "order": 11,
                    "rationale": "The death of Polonio and Ophelia's tragic fate raise the stakes and introduce a new antagonist seeking revenge.",
                    "isExpanded": false,
                    "estimatedScreenTimeSeconds": 15
                },
                {
                    "id": "beat_12",
                    "text": "Hunberto manipulates Laertes into a duel with Hamilkar, providing him with a poisoned dagger.",
                    "order": 12,
                    "rationale": "The antagonist orchestrates the climax, using Laertes to achieve his goal of eliminating Hamilkar.",
                    "isExpanded": false,
                    "estimatedScreenTimeSeconds": 15
                },
                {
                    "id": "beat_13",
                    "text": "During the duel, Queen Quetzalina accidentally drinks poisoned wine meant for Hamilkar and dies lamenting her haste.",
                    "order": 13,
                    "rationale": "A tragic turn of events during the climax, directly impacting a key character and adding to the chaos.",
                    "isExpanded": false,
                    "estimatedScreenTimeSeconds": 15
                },
                {
                    "id": "beat_14",
                    "text": "Laertes wounds Hamilkar with the poisoned dagger.",
                    "order": 14,
                    "rationale": "The protagonist suffers a critical blow, indicating the severity of the situation and his impending demise.",
                    "isExpanded": false,
                    "estimatedScreenTimeSeconds": 10
                },
                {
                    "id": "beat_15",
                    "text": "Hamilkar, in a final act, stabs Hunberto with the poisoned dagger and forces him to drink the poisoned wine.",
                    "order": 15,
                    "rationale": "The protagonist achieves his revenge, ensuring the antagonist's downfall alongside his own.",
                    "isExpanded": false,
                    "estimatedScreenTimeSeconds": 15
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
        "formattedScript": "FADE IN:\n\nEXT. TENOCHTITLAN-ON-THE-LAKE PLAZA - DAY\n\nThe air THUMS with the chaotic symphony of a sprawling marketplace. Sunlight, thick and golden, glints off the shimmering waters of the great lake. Elaborate pyramids, their stone faces carved with ancient gods, pierce the impossibly blue sky. Below, a vibrant tapestry of humanity surges: merchants hawk their wares with booming voices, children dart through legs like brightly feathered birds, and the scent of roasting maize and exotic spices hangs heavy.\n\nIn the heart of this maelstrom stands PRINCE HAMILKAR. He’s a striking young man, but currently a spectacle of dishevelment. His once-pristine royal attire is rumpled, his dark hair matted, and his eyes, wide with a dazed confusion, dart wildly. He clutches a half-eaten *elote* in one hand, the corn kernels scattered on the dusty ground, a forgotten casualty of his shock. A low, guttural murmur escapes his lips, a sound lost in the cacophony. A messenger, sweat beading on his brow and his breath ragged, shoves through the crowd, his face a mask of urgency. He grabs Hamilkar's arm, his grip tight.\n\n                    MESSENGER\n               (Voice strained)\n          Prince Hamilkar! A terrible… *tragedia*! Your father, the Great Tlatoani… he is… *muerto*!\nHamilkar’s eyes, already unfocused, widen further. The *elote* slips from his grasp, hitting the ground with a soft THUD. The sounds of the plaza seem to recede, replaced by a hollow ROAR in his ears. His mouth hangs open, a silent gasp.\n\nEXT. ROYAL PALACE COURTYARD - CONTINUOUS\n\nA stark contrast to the plaza’s boisterous energy. Here, an unsettling stillness prevails, broken only by the murmurs of a stunned court. QUEEN QUETZALINA, a regal woman whose beauty is now etched with a grief that feels… performative, stands beside a man. This is HUNBERTO, Hamilkar's uncle. He’s a burly man, his face permanently set in a jovial, almost leering, smile. His rich robes are ostentatious, dripping with gold and jade. He clutches a large, clay jug overflowing with a milky, opaque liquid – *pulque*. He laughs, a booming, forced sound, and slaps the back of a nearby noble, who flinches.\n\nHamilkar, still reeling, stumbles into the courtyard. His gaze lands on his mother, her hand resting familiarly on Hunberto’s arm. The sight is a visceral blow. He stares, his jaw Slack. Hunberto notices him, his smile widening, a flash of something predatory in his eyes. He raises the *pulque* jug in a mock toast.\n\n                    HUNBERTO\n               (Slurred, jovial)\nAh, my nephew! Come, join the celebration! A new era begins! *Salud*!\n\nHamilkar doesn't move, his eyes locked on his mother, searching for any sign of recognition, of shared sorrow. He finds only a polite, distant smile.\n\nINT. SHAMAN’S HUT - NIGHT\n\nThe air inside is thick with the scent of smoldering herbs and dried copal. Flickering torchlight casts dancing shadows on walls adorned with intricate, unsettling masks and woven tapestries depicting celestial battles. EL FANTASMA, the shaman, is a wizened figure, his skin like ancient parchment. He wears a headdress of iridescent quetzal feathers and his eyes, though clouded with age, hold a sharp, unnerving intelligence. Hamilkar sits before him, his posture slumped, the earlier shock replaced by a gnawing unease.\n\n                    EL FANTASMA\n               (Voice raspy, deliberate)\nThe Serpent has shed its skin, Prince. But not by natural cause. Your father… he was betrayed. Poisoned. The *pulque* was laced, a bitter draught for a king.\n\nHe gestures with a bony finger towards a dark, obsidian mirror on a low table.\n\nEL FANTASMA (CONT'D)\n\nYour uncle, Hunberto. He craved the throne. And your mother… he desired her too. A viper in the royal chambers.\n\nHamilkar’s knuckles whiten as he grips the edge of the table. His breath hitches. The pieces click into place – his mother’s hasty remarriage, Hunberto’s unctuous demeanor. Indignation, hot and sharp, floods his system.\n\n                    HAMILKAR\n               (Voice a low growl)\nHunberto… *ese cabrón*! He will pay.\n\n                    EL FANTASMA\nRevenge is a sharp blade, Prince. It can cut both ways.\n\n                    HAMILKAR\n               (Eyes hardening, a glint of madness in them)\nThen I will be the sharpest blade of all. They think me broken. *Bueno*. Let them. I will embrace the madness they see. I will become the fool, the jester… and no one will suspect a thing.\n\nHe rises, a new resolve hardening his features. The disheveled prince is gone, replaced by a man with a dangerous, cunning spark.\n\nINT. ROYAL PALACE CORRIDORS - DAY\n\nHamilkar wanders through the opulent, echoing halls of the palace. His movements are exaggerated, his gait uneven. He stops abruptly, staring at a tapestry depicting a jaguar hunt, then bursts into nonsensical laughter. He picks up a decorative vase, examines it intently, then tosses it carelessly onto a plush rug. He mumbles to himself, weaving bizarre pronouncements with fragments of ancient prophecies.\n\n                    HAMILKAR\n               (To himself, slurring)\nThe sun weeps *chiles*! The moon is a missing *tamal*! Who will find the lost tortilla? *Ay, caramba*!\n\nGuards, their polished obsidian helmets gleaming, exchange uneasy glances. Courtiers discreetly edge away, their faces a mixture of pity and apprehension. Hunberto, observing from a distance, a goblet of wine in hand, raises an eyebrow. A slow, calculating smile spreads across his face.\n\nINT. HUNBERTO'S CHAMBERS - NIGHT\n\nHunberto paces his lavish chamber, the air heavy with the scent of expensive incense. He stops before a large, ornate mirror, studying his reflection. POLONIO, a gaunt, nervous man with beady eyes and a perpetually hunched posture, stands before him, wringing his hands. He wears the elaborate robes of a royal advisor, but his demeanor is that of a cornered mouse.\n\n                    HUNBERTO\n               (Voice low, menacing)\nThe Prince is… erratic. More than usual. It smells like a trap, Polonio. This feigned madness… it’s a performance. And I don't like the audience.\n\n                    POLONIO\n               (Stuttering)\nYes, Your Majesty… I mean, Your Highness… he is… unpredictable.\n\n                    HUNBERTO\nWe need to know what he’s planning. And you, my loyal advisor, are the perfect instrument.\n\nHe turns to Polonio, his smile gone, replaced by a chilling intensity.\n\nHUNBERTO (CONT'D)\n\nYour daughter. Ophelia. She has a… fondness for him, does she not?\n\nPolonio visibly gulps.\n\n                    POLONIO\nShe… she does, Your Highness. But she is loyal.\n\n                    HUNBERTO\nLoyalty can be… tested. Send her to him. Let her probe. Find out what this *locura* is all about. And be quick about it.\n\nINT. PALACE GARDENS - DAY\n\nSunlight dapples through the leaves of ancient trees, casting shifting patterns on manicured hedges. Flowers in vibrant hues bloom in profusion. OPHELIA, a young woman of delicate beauty, her eyes large and troubled, nervously approaches Hamilkar. She wears a simple, elegant gown, a stark contrast to the court’s opulence. Hamilkar sits on a stone bench, idly picking at a loose thread on his tunic.\n\n                    OPHELIA\n               (Voice soft, hesitant)\nPrince Hamilkar? Are you… are you well? My father sent me. He… he is concerned.\n\nHamilkar looks up, his eyes unfocused for a moment, then he seems to focus on her. A flicker of recognition, quickly masked.\n\n                    HAMILKAR\n               (Slurring, a strange cadence)\nConcerned? The owl is concerned for the mouse before the serpent strikes, *mija*. Tell your father… the stars are aligning. But the alignment is… *chueco*.\n\nHe leans closer, his gaze intense, unsettling.\n\nHAMILKAR (CONT'D)\n\nHe wants to know, doesn’t he? The man with the greedy smile. He wants to know… if the jaguar has teeth. Does it, Ophelia? Does the jaguar still have teeth?\n\nOphelia recoils slightly, her apprehension mounting.\n\n                    OPHELIA\nI… I don’t understand.\n\n                    HAMILKAR\n               (A mirthless chuckle)\nNo one does. That’s the beauty of it. Now go. Before the *brujo* sees us.\n\nHe waves a dismissive hand, turning his attention back to the loose thread, his gaze distant again. Ophelia watches him for a moment, a profound sadness clouding her features, before turning and hurrying away.\n\nINT. ROYAL BANQUET HALL - NIGHT\n\nThe hall is a riot of color and sound. Torches blaze, casting a warm, flickering glow on the faces of the assembled nobility. Servants weave through the crowd, offering platters of exotic food and goblets of wine. At the head of the long table sits Hunberto, his jovial demeanor firmly in place, Quetzalina by his side, looking regal but subdued.\n\nHamilkar, surprisingly clean and dressed in formal attire, stands before the assembled court. He clears his throat, his voice amplified by the hall’s acoustics.\n\n                    HAMILKAR\n               (Projecting, but with an underlying tremor)\nMy lords, my ladies! I have prepared a… a *obra*. A play! To commemorate a… a grave injustice.\n\nHe gestures, and several actors, dressed as royalty, emerge. They begin a pantomime, a stylized reenactment of a king being poisoned. Hamilkar, playing the role of the poisoned king, clutches his throat, his movements dramatic. He points a trembling finger at an actor playing Hunberto.\n\nHAMILKAR (CONT'D)\n\n               (Voice cracking with feigned anguish)\nBetrayal! From within my own house! The *pulque*… it was poisoned!\n\nHunberto’s smile falters. His eyes narrow, fixed on Hamilkar. Quetzalina looks bewildered. As the play reaches its climax, with the poisoned king collapsing, Hunberto can no longer contain himself. He slams his fist on the table, his face contorted with rage.\n\n                    HUNBERTO\n               (Roaring)\nEnough! This is madness! Insolence!\n\nHe rises abruptly, knocking his chair over with a CLATTER. He glares at Hamilkar, his eyes burning with fury, then storms out of the hall, Quetzalina following him, a look of deep concern on her face. The court erupts in murmurs.\n\nINT. ROYAL BANQUET HALL - CONTINUOUS\n\nChaos. The court is a flurry of shocked whispers and confused movements. Hamilkar, his heart pounding, scans the room, adrenaline coursing through him. He spots Polonio, his back turned, trying to blend into the shadows near a side exit. In his heightened state, fueled by the play’s success and the ensuing pandemonium, Hamilkar mistakes him for Hunberto.\n\n                    HAMILKAR\n               (To himself, a triumphant growl)\nGot you, *cabrón*!\n\nHe lunges, his obsidian dagger, a wickedly sharp ceremonial blade, glinting in the torchlight. Polonio turns, his eyes widening in terror, but it’s too late. Hamilkar plunges the dagger deep into his unsuspecting back. Polonio gasps, a strangled sound, and collapses to the floor, a crimson stain spreading across his ornate robes. Hamilkar, realizing his mistake with a sickening lurch, stares at the dagger, then at the lifeless body, his face a mask of horror.\n\nINT. ROYAL PALACE - DAYS LATER\n\nThe atmosphere is thick with mourning and a palpable sense of dread. The death of Polonio has sent shockwaves through the court. Ophelia, driven to the brink by her father’s sudden, brutal death and Hamilkar's apparent madness, has succumbed to a deep, inconsolable despair. We see her, a spectral figure, weeping uncontrollably, her once-bright eyes hollow. Later, a servant finds a single, muddy slipper floating in a secluded palace fountain – Ophelia has drowned.\n\nLAERTES, Polonio’s son, bursts into the palace courtyard. He’s a powerfully built young man, his face a mask of raw grief and burning rage. His eyes, sharp and intelligent, scan the assembled courtiers, searching for Hamilkar. He carries himself with a military bearing, his fists clenched.\n\n                    LAERTES\n               (Voice raw with fury)\nWhere is he? Where is the one who murdered my father? I will have justice!\n\nHunberto, ever the opportunist, emerges from the shadows, his face a mask of sorrowful concern. He places a hand on Laertes's shoulder.\n\n                    HUNBERTO\n               (Smoothly, insidiously)\nMy dear Laertes. Your grief is understandable. A terrible loss. But this is not the way. Revenge… it is a poisoned chalice.\n\nHe steers Laertes away from the crowd, his voice dropping to a conspiratorial whisper.\n\nHUNBERTO (CONT'D)\n\nBut perhaps… there is a way to achieve a just end. A duel. A formal challenge. I can provide you with… an advantage.\n\nHe produces a dagger, its blade gleaming ominously, coated in a dark, viscous substance.\n\nHUNBERTO (CONT'D)\n\nThis blade… it carries a potent venom. One strike, and your enemy will fall.\n\nLaertes, his eyes blazing with a thirst for vengeance, takes the dagger.\n\nINT. DUELING ARENA - DAY\n\nA circular arena, its sand stained with the blood of past contests. A hushed crowd surrounds the perimeter, their faces a mixture of anticipation and morbid curiosity. Hamilkar, looking paler but resolute, stands opposite Laertes. Laertes, his jaw set, grips the poisoned dagger. Hunberto watches from the royal box, a smug smile playing on his lips. Quetzalina stands beside him, her face etched with worry, a jeweled goblet of wine in her hand.\n\nThe duel begins. The clash of obsidian against obsidian echoes through the arena. Hamilkar fights with a desperate ferocity, his movements surprisingly agile. Laertes, fueled by rage, is a whirlwind of aggression.\n\nDuring a brief lull, a servant approaches Quetzalina, offering her the goblet of wine. Distracted, she takes a large gulp.\n\n                    LAERTES\n               (Shouting)\nYou took my father! You drove my sister to her death! Now you will pay!\n\nHe lunges, a swift, brutal thrust. Hamilkar parries, but the poisoned blade scrapes his arm, drawing blood. Hamilkar stumbles back, a sharp pain radiating from the wound. His eyes widen as he sees the dark fluid on the blade.\n\nSuddenly, Quetzalina cries out, a choked gasp. She clutches her throat, her eyes wide with shock and dawning realization. The wine…\n\n                    QUEEN QUETZALINA\n               (Weakly, a look of regret)\nMy haste… my foolish haste…\n\nShe collapses, the goblet falling from her grasp and shattering on the stone floor. The court gasps.\n\nHamilkar, seeing his mother fall, his vision blurring, knows his time is short. But his resolve hardens. He looks at Hunberto, a look of pure hatred in his eyes. With a surge of adrenaline, he lunges at Laertes, disarming him. He snatches the poisoned dagger, then turns, his movements surprisingly swift despite the poison coursing through him. He lunges at Hunberto.\n\n                    HAMILKAR\n               (Voice a hoarse rasp)\nFor my father! For my mother!\n\nHe plunges the poisoned dagger into Hunberto’s chest. Hunberto gasps, his eyes wide with disbelief and pain. Hamilkar then grabs the fallen goblet, forces the remaining poisoned wine to Hunberto’s lips.\n\nHAMILKAR (CONT'D)\n\nDrink, *serpiente*! Drink to your new kingdom!\n\nHunberto chokes, the poison taking hold. He clutches Hamilkar’s arm, then collapses to the ground, his lifeblood mingling with the spilled wine.\n\nHamilkar stumbles back, his own body wracked with agony. He sinks to his knees, the obsidian dagger falling from his grasp. He looks at his bewildered friend, HORACIO, who rushes to his side.\n\n                    HAMILKAR\n               (Whispering, his voice fading)\nHoracio… the kingdom… it is yours. Tell them… tell them the truth… of this… *tragedia*.\n\nHis eyes flutter closed. His head lolls to the side. He is still.\n\nHoracio, tears streaming down his face, looks at the carnage around him – the fallen king, the poisoned queen, the dead advisor, the dying prince, the vanquished uncle. He pulls out a scroll and a quill, his hand trembling, and begins to write.\n\nFADE OUT.",
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


---------------------------------------------



/api/projects/{id}/stage-3/generate-beat-sheet



/api/projects/{id}/stage-4/generate-script




Other To-Dos:

# 1 the search bar inside the style capsule componenet on Stage 1 doesn't work. For example I have a custom made Style Capsule called "Airplane!", yet I type in A and it says no options. Really all of it doesnt work

 - Check that Stage 5' style capsule search also works

# 2 In Style Capsules Page 




Issue 4 longer:

/api/projects/{id}/stage-2/generate-treatment

{
    "success": true,
    "data": {
        "content": "```json\n{\n  \"treatments\": [\n    {\n      \"variant_id\": 1,\n      \"prose\": \"The vibrant, sun-baked plaza of Tenochtitlan-on-the-Lake, a miniature Mayan kingdom, buzzes with the usual chaotic energy. Our Hamlet, a young, perpetually bewildered prince named Hamilkar, stumbles through the throng, his feathered headdress askew. He's just learned his father, the great Huevito I, has met a… sudden demise. His mother, the regal Queen Quetzalina, is already remarried to his uncle, the slick and suspiciously jovial Hunberto, a man whose laugh sounds like a bag of pebbles being shaken. Hunberto, a portly figure in gaudy jade jewelry, is busy distributing *pulque* to the assembled courtiers, his eyes gleaming with an almost predatory delight. Hamilkar, clad in a simple loincloth and adorned with a single, wilting marigold, watches this spectacle with a growing sense of unease. He clutches a chipped obsidian dagger, more for comfort than intent.  A shadowy figure, a wizened shaman named El Fantasma, beckons Hamilkar into a dimly lit temple adorned with faded murals. Through a series of exaggerated gestures and guttural whispers in Spanglish, El Fantasma reveals the truth: Hunberto poisoned Huevito I with a potent, fermented *agave* brew, all for the throne and Quetzalina's hand. Hamilkar, initially paralyzed by shock, feels a surge of righteous indignation, albeit a rather clumsy one. He vows revenge, though his pronouncements are punctuated by nervous stutters and the occasional dropped dagger.  He decides to feign madness, a plan that, given his already eccentric nature, is easily mistaken for his normal state. He begins to wander the palace grounds, muttering riddles about skeletons and *el diablo*, much to the amusement and confusion of the court.  Hunberto, however, is not amused. He sees the erratic behavior as a threat. He enlists the help of Polonio, the king's sycophantic advisor, a man whose primary skill is fawning and excessive bowing, and his two children, the flighty Ophelia and the brash Laertes. Ophelia, a young woman with eyes like polished obsidian and a penchant for weaving flower crowns, is secretly in love with Hamilkar. Polonio, ever eager to please Hunberto, instructs Ophelia to try and extract information from Hamilkar, a task she undertakes with a mixture of genuine affection and nervous apprehension.  Hamilkar, lost in his “madness,” pushes Ophelia away, his words a jumble of existential despair and nonsensical pronouncements about the fleeting nature of *chiles*.  His erratic behavior escalates. During a royal feast, Hamilkar orchestrates a play, a crude reenactment of his father's murder, complete with exaggerated poisoning and a dramatic death scene. The actors, a troupe of drunken jesters, deliver their lines with gusto, much to the delight of the crowd, but Hunberto’s face turns a ghastly shade of green. He storms out, his guilt exposed.  In the ensuing chaos, Hamilkar, mistaking Polonio for Hunberto, accidentally impales him with his obsidian dagger while Polonio was eavesdropping behind a tapestry. This act, born of confusion and haste, solidifies Hamilkar's path.  Laertes, enraged by his father's death and Ophelia's subsequent descent into true madness (she drowns herself, weeping over wilting flower crowns), returns, seeking vengeance. Hunberto, sensing an opportunity, manipulates Laertes into a duel with Hamilkar, providing Laertes with a poisoned dagger.  The final scene is a whirlwind of spilled *pulque*, flying feathers, and desperate accusations. Quetzalina, accidentally poisoned by a cup of wine meant for Hamilkar, dies lamenting her haste. Laertes wounds Hamilkar. In a final, clumsy act of defiance, Hamilkar manages to stab Hunberto with the poisoned dagger and force him to drink the poisoned wine. As Hamilkar dies, he entrusts the kingdom to his loyal, but equally bewildered, friend Horacio, a scribe who has been diligently documenting everything with a quill and a very large scroll. Horacio, left alone amidst the carnage, can only shake his head and begin writing the tale of the tragic, befuddled Huevito of Tenochtitlan-on-the-Lake.\",\n      \"structural_emphasis\": \"This variation follows a more traditional Hamlet structure, emphasizing Hamilkar's internal struggle and his descent into feigned madness as a tool for revenge. The play-within-a-play serves as a pivotal turning point, leading directly to Polonio's accidental death and escalating the conflict. The ending is a direct, tragic confrontation where all principal characters meet their demise.\",\n      \"estimated_runtime_seconds\": 300\n    },\n    {\n      \"variant_id\": 2,\n      \"prose\": \"The humid air of the Mesoamerican kingdom of Xibalba-on-the-Hill hangs thick with the scent of *cacao* and unspoken anxieties. Prince Hamilkar, a lanky youth with perpetually bloodshot eyes and a penchant for wearing his royal robes backwards, is nursing a hangover in his chambers. His father, the esteemed Huevito the Wise, is dead. His mother, Queen Xochitl, a woman whose beauty is matched only by her pragmatism, has swiftly married her brother-in-law, the boisterous and undeniably corrupt Duke Hunberto. Hunberto, a man who communicates primarily through booming laughter and the clinking of gold coins, is already consolidating his power, his greedy hands reaching for the royal treasury. Hamilkar’s world is upended when a spectral apparition, the ghost of his father manifested as a shimmering *quetzal* bird, appears to him. The *quetzal* hovers, its ethereal glow illuminating Hamilkar’s bleary face, and whispers a chilling tale: Hunberto poisoned Huevito with a rare, hallucinogenic mushroom, a secret ingredient in his favorite *atole*. Driven by a potent mix of grief and *pulque*-induced courage, Hamilkar vows to avenge his father. He decides to adopt a persona of pure chaos, a wild man of the jungle, to mask his intentions. He begins to roam the palace gardens, conversing with iguanas and attempting to ride jaguars, his pronouncements increasingly nonsensical and delivered in a rapid-fire Spanglish. This 'madness' is, of course, a performance, but one that pushes the boundaries of believability. Hunberto, unnerved by Hamilkar’s erratic behavior, tasks his loyal, but utterly incompetent, advisor, Polonio, with spying on the prince. Polonio, a man whose primary function is to trip over his own feet and misinterpret everything, enlists his children, the sensitive Ophelia and the hot-headed Laertes. Ophelia, a weaver of intricate *amate* bark paintings and a secret admirer of Hamilkar, is instructed to lure him into a confession.  Hamilkar, however, sees through the ploy, his 'madness' allowing him to speak uncomfortable truths without consequence, much to Ophelia's heartbreak.  The climax of this variation occurs not through a play, but through a grand festival celebrating Hunberto’s ascension. Hamilkar, using his 'madman' persona, orchestrates a series of embarrassing stunts and public accusations, all disguised as drunken revelry. He reveals evidence of Hunberto’s corruption, culminating in a chaotic chase through the palace where Polonio, trying to hide, accidentally falls into a vat of fermenting *pulque* and drowns. Laertes, witnessing his father’s ignominious end and Ophelia’s subsequent descent into genuine despair (she wanders off into the jungle, lost and weeping, eventually becoming prey to unseen jungle creatures), returns, seeking retribution. Hunberto, seeing his plan unravel, manipulates Laertes into a rigged gladiatorial combat against Hamilkar. The combat is a brutal, slapstick affair, with poisoned darts and strategically placed banana peels. Laertes wounds Hamilkar with a poisoned *macuahuitl*. In his dying moments, Hamilkar, with a final surge of energy, manages to disarm Laertes, switch weapons, and strike down Hunberto, forcing him to drink from the poisoned gourd he’d prepared for Hamilkar. Queen Xochitl, attempting to intervene and calm the chaos, accidentally drinks the poisoned wine meant for Hamilkar, dying with a curse on her lips for her hasty remarriage. Hamilkar, his life ebbing away, entrusts the kingdom to his sensible, but perpetually exasperated, friend Horacio, a scholar who has been diligently recording the events on papyrus scrolls, his face a mask of weary resignation.\",\n      \"structural_emphasis\": \"This version emphasizes Hamilkar's chaotic performance of madness as his primary weapon, leading to a more action-driven, less introspective narrative. The climax is a public festival turned chaotic confrontation, and Polonio's death is a more slapstick, accidental demise. Ophelia's fate is tragic but less directly tied to Hamilkar's actions.\",\n      \"estimated_runtime_seconds\": 300\n    },\n    {\n      \"variant_id\": 3,\n      \"prose\": \"In the sun-drenched, slightly dilapidated kingdom of Huehuetlan, Prince Hamilkar is a study in existential ennui. His father, the beloved Huevito the Old, has passed away under suspicious circumstances. His mother, Queen Izel, a woman of striking beauty and questionable judgment, has already taken her deceased husband’s brother, the gluttonous and manipulative Hunberto, as her new consort. Hunberto, whose belly precedes him like a herald, rules with an iron fist clad in a velvet glove, his pronouncements often slurred with *mezcal*. Hamilkar, a young man more interested in dissecting philosophical treatises on the nature of *pulque* than ruling, is jolted from his apathy by a series of unsettling visions and whispers. He sees his father’s spirit, not as a grand ghost, but as a fleeting, flickering image, like a faulty candle, in the corners of his vision. These spectral visitations, accompanied by the faint scent of decay and *chiles*, reveal the truth: Hunberto poisoned Huevito with a slow-acting toxin, disguised as a traditional herbal remedy.  Fueled by a potent cocktail of grief, outrage, and a particularly strong batch of *pulque*, Hamilkar decides to confront Hunberto, but not through direct confrontation. He chooses a more subtle, yet ultimately destructive, approach: psychological warfare. He begins to subtly undermine Hunberto’s authority, planting seeds of doubt and paranoia among the court. He manipulates events, staging 'coincidences' that make Hunberto appear foolish or incompetent. He spreads rumors, whispers half-truths, and generally sows discord, all while maintaining an outward appearance of melancholic detachment.  His mother, Queen Izel, grows increasingly concerned, caught between her affection for her son and her desire for stability with Hunberto.  Hunberto, aware of Hamilkar’s machinations, but unable to pinpoint the source of the disruption, tasks his loyal, but easily manipulated, spymaster, Polonio, with investigating the prince. Polonio, a man whose paranoia rivals Hunberto’s, enlists his children, the gentle Ophelia and the ambitious Laertes. Ophelia, a gifted musician who finds solace in ancient melodies, attempts to reach Hamilkar through his love of art, but he, fearing for her safety and consumed by his mission, pushes her away with cruel words. Laertes, eager to prove his loyalty, becomes a willing pawn in Hunberto’s games.  The turning point comes during a royal banquet. Instead of a play, Hamilkar orchestrates a series of elaborate pranks and illusions that expose Hunberto's greed and cruelty to the assembled guests, turning the court against him.  In the ensuing confusion, Polonio, attempting to escape the fallout and report to Hunberto, trips over a ceremonial *temazcal* steam bath and is accidentally scalded to death. Laertes, witnessing his father’s bizarre end and Ophelia’s subsequent withdrawal into a state of catatonic grief (she retreats to a secluded monastery, dedicating her life to prayer and silence), is consumed by a desire for revenge. Hunberto, cornered and desperate, orchestrates a duel between Hamilkar and Laertes, providing Laertes with a poisoned blade.  The final confrontation is a tense, drawn-out affair, filled with unspoken accusations and the clatter of ceremonial jade.  Queen Izel, attempting to mediate, drinks a poisoned goblet intended for Hamilkar, dying with a plea for peace. Laertes wounds Hamilkar. In a final, desperate act, Hamilkar, using his wits rather than brute force, tricks Laertes into a confession of Hunberto’s treachery before succumbing to the poison. He then uses his last breath to reveal Hunberto’s complicity to the surviving witnesses. Hunberto, disgraced and exposed, is left to face the wrath of the court, his reign of terror effectively over, though his ultimate fate is left ambiguous, a chilling testament to the corrosive nature of power. Horacio, the pragmatic royal scribe, is left to document the messy aftermath, his quill poised to record the tragic downfall of Huehuetlan.\",\n      \"structural_emphasis\": \"This variant focuses on Hamilkar's strategic manipulation and psychological warfare rather than feigned madness. The climax is a public exposure of corruption through elaborate pranks and illusions, leading to a more ambiguous and less physically violent resolution for the antagonist. Ophelia's fate is one of spiritual withdrawal, and Polonio's death is a bizarre, accidental accident.\",\n      \"estimated_runtime_seconds\": 300\n    }\n  ]\n}\n```",
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

/api/projects/{id}/stage-3/generate-beat-sheet
/api/projects/{id}/stage-4/generate-script