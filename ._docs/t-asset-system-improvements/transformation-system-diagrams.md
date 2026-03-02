# Transformation System — Data Flow Diagrams

## Preface: What's covered:

  1. Data Model Relationships — How project_assets → scene_asset_instances → transformation_events connect, with the Superman example data filled in
  2. Frontend User Flow — Stage 5 → Stage 7 (auto-detection) → Stage 8 (AddTransformationDialog), showing where the user interacts at each step
  3. resolveOverridesForShot() Algorithm — Shot-by-shot table showing exactly what the function returns for each shot in Scene 2 (the within_shot scenario),    
  including which flag/description/image is used
  4. All Three Types Side by Side — instant, within_shot, and gradual compared visually showing where the swap point lands for each
  5. Prompt Generation Pipeline — How frames.ts → resolveOverridesForShot() → generatePromptSet() flows, with the frame/video/end-frame prompt paths branching  
  based on is_transforming
  6. Cross-Scene Inheritance — The full 4-scene Superman timeline showing how getLastAssetStateForInheritance() carries post-state forward automatically        
  7. Chained Events — Clark → Superman → Clark within a single scene, showing how the accumulator walks events sequentially
  8. Two Assets vs Transformation — Prompt Comparison — The actual prompt output side-by-side, making it viscerally clear why two assets breaks on-camera       
  transforms (no TRANSFORMATION EVENT block, no forced end frame, AI sees two strangers)
  9. Convert to Transformation Flow — The Stage 8 escape hatch UI flow step-by-step



Superman / Clark Kent scenario throughout.

---

## 1. Data Model Relationships

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        PROJECT-LEVEL (Stage 5)                          │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  project_assets                                                   │   │
│  │                                                                  │   │
│  │  id: "pa-001"                                                    │   │
│  │  name: "Clark Kent / Superman"                                   │   │
│  │  asset_type: "character"                                         │   │
│  │  description: "Mild-mannered reporter, glasses, blue suit, tie"  │   │
│  │  image_key_url: "clark-kent-ref.png"                             │   │
│  │  scene_numbers: [1, 2, 3, 4]                                     │   │
│  └──────────────┬───────────────────────────────────────────────────┘   │
│                 │                                                       │
│                 │  one project_asset spawns one instance per scene      │
│                 │                                                       │
└─────────────────┼───────────────────────────────────────────────────────┘
                  │
                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     SCENE-LEVEL (Stage 6-8)                            │
│                                                                        │
│  Scene 1                          Scene 2                              │
│  ┌─────────────────────────┐      ┌─────────────────────────────────┐  │
│  │ scene_asset_instances   │      │ scene_asset_instances           │  │
│  │                         │      │                                 │  │
│  │ id: "sai-sc1"           │      │ id: "sai-sc2"                   │  │
│  │ project_asset_id: pa-001│      │ project_asset_id: pa-001        │  │
│  │ scene_id: scene-1       │      │ scene_id: scene-2               │  │
│  │ effective_description:  │      │ effective_description:          │  │
│  │   "Clark Kent, glasses, │      │   "Clark Kent, glasses,         │  │
│  │    blue suit, tie"      │      │    blue suit, tie"              │  │
│  │ image_key_url:          │      │ image_key_url:                  │  │
│  │   "clark-kent-ref.png"  │      │   "clark-kent-ref.png"          │  │
│  └─────────────────────────┘      └──────────┬──────────────────────┘  │
│                                              │                         │
│                          ┌───────────────────┘                         │
│                          │  transformation_events                      │
│                          ▼  (attached to instance)                     │
│              ┌──────────────────────────────────────────────────┐      │
│              │ transformation_events                            │      │
│              │                                                  │      │
│              │ id: "te-001"                                     │      │
│              │ scene_asset_instance_id: "sai-sc2"               │      │
│              │ scene_id: scene-2                                │      │
│              │ trigger_shot_id: shot-2C                         │      │
│              │ transformation_type: "within_shot"               │      │
│              │ completion_shot_id: null                         │      │
│              │ pre_description:  "Clark Kent — glasses, suit"   │      │
│              │ post_description: "Superman — cape, S-symbol"    │      │
│              │ transformation_narrative: "Rips open shirt..."   │      │
│              │ pre_image_key_url:  "clark-kent-ref.png"         │      │
│              │ post_image_key_url: "superman-ref.png"           │      │
│              │ confirmed: true                                  │      │
│              │ detected_by: "manual"                            │      │
│              └──────────────────────────────────────────────────┘      │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
                  │
                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      SHOT-LEVEL (Stage 7-9)                           │
│                                                                        │
│  Scene 2 shots:                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ shot_asset_assignments                                          │  │
│  │                                                                  │  │
│  │ shot 2A ── sai-sc2 ── presence: "throughout"                    │  │
│  │ shot 2B ── sai-sc2 ── presence: "throughout"                    │  │
│  │ shot 2C ── sai-sc2 ── presence: "throughout"  ◄── TRIGGER SHOT  │  │
│  │ shot 2D ── sai-sc2 ── presence: "throughout"                    │  │
│  │ shot 2E ── sai-sc2 ── presence: "throughout"                    │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  Note: same instance "sai-sc2" in every shot.                          │
│  The transformation system resolves WHICH FORM at runtime.             │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Frontend User Flow — Creating a Transformation

```
 STAGE 5 (Assets)                STAGE 7 (Shots)              STAGE 8 (Visual State)
 ═══════════════                 ═══════════════              ══════════════════════

 User creates/extracts           LLM extracts shots           User manages transformations
 one asset:                      and auto-flags:              on scene assets:
 "Clark Kent / Superman"
                                 ┌──────────────────┐
 ┌──────────────────┐            │ Shot 2C extracted │
 │  project_assets   │            │ with:             │
 │                   │            │ transformationFlag│         ┌───────────────────────┐
 │ Clark Kent /      │            │  characterName:   │         │ VisualStateEditorPanel │
 │ Superman          │            │   "Clark Kent"    │         │                       │
 │                   │            │  type: within_shot│         │ Selected: sai-sc2     │
 │ scene_numbers:    │            │  description:     │         │ "Clark Kent / Superman"│
 │  [1,2,3,4]        │            │   "transforms     │         │                       │
 │                   │            │    into Superman"  │         │ ┌───────────────────┐ │
 └──────────────────┘            │  isTrigger: true  │         │ │ TransformationEvent│ │
                                 └────────┬─────────┘         │ │ Cards (from DB)    │ │
        │                                 │                    │ │                   │ │
        │ assigns to                      │ hint only,         │ │ [te-001]          │ │
        │ scenes                          │ not persisted      │ │ within_shot       │ │
        ▼                                 │ as event           │ │ Shot 2C           │ │
                                          │                    │ │ Status: CONFIRMED │ │
 Scene 2 gets a                           ▼                    │ │                   │ │
 scene_asset_instance             Shown as yellow badge        │ │ Pre: Clark Kent   │ │
 "sai-sc2"                       in shot list UI               │ │ Post: Superman    │ │
                                                               │ │                   │ │
                                                               │ │ [Generate Image]  │ │
                                                               │ └───────────────────┘ │
                                                               │                       │
                                                               │ [+ Add Transformation]│
                                                               └───────────────────────┘

                                                                        │
                                  User clicks "Add Transformation"      │
                                  or card auto-created from Stage 7     │
                                  flag detection                        │
                                                                        ▼

                                                               ┌───────────────────────┐
                                                               │ AddTransformationDialog│
                                                               │                       │
                                                               │ Trigger: [Shot 2C ▼]  │
                                                               │ Type:  [within_shot ▼] │
                                                               │                       │
                                                               │ Pre (read-only):      │
                                                               │  "Clark Kent—glasses, │
                                                               │   blue suit, tie"     │
                                                               │                       │
                                                               │ Post (editable):      │
                                                               │  "Superman—red cape,  │
                                                               │   blue suit, S-symbol"│
                                                               │   [AI Prefill ✦]      │
                                                               │                       │
                                                               │ Narrative:            │
                                                               │  "Rips open shirt..." │
                                                               │                       │
                                                               │        [Create]       │
                                                               └───────────────────────┘
```

---

## 3. Backend: resolveOverridesForShot() — The Core Algorithm

```
                    Scene 2 — Superman Scenario
                    One asset, one within_shot event at Shot 2C

 INPUTS:
 ┌─────────────────────────────────────────────────────────────────────┐
 │ sceneAssets: [{ id: "sai-sc2",                                     │
 │                effective_description: "Clark Kent—glasses, suit",   │
 │                image_key_url: "clark-ref.png" }]                    │
 │                                                                     │
 │ events: [{ scene_asset_instance_id: "sai-sc2",                     │
 │            trigger_shot_id: "shot-2C",                              │
 │            transformation_type: "within_shot",                      │
 │            pre_description:  "Clark Kent—glasses, suit",            │
 │            post_description: "Superman—cape, S-symbol",             │
 │            post_image_key_url: "superman-ref.png",                  │
 │            confirmed: true }]                                       │
 │                                                                     │
 │ allShots: [2A(order:1), 2B(order:2), 2C(order:3),                  │
 │            2D(order:4), 2E(order:5)]                                │
 └─────────────────────────────────────────────────────────────────────┘

 RESOLUTION (called once per shot during prompt generation):

 ┌─────────┬──────────────┬────────────────────────────────────────────────────────┐
 │  Shot   │  shot_order  │  resolveOverridesForShot() returns                    │
 │         │  vs trigger  │                                                        │
 ├─────────┼──────────────┼────────────────────────────────────────────────────────┤
 │         │              │                                                        │
 │ Shot 2A │  1 < 3       │  [] (empty — no override, use base description)        │
 │         │  BEFORE      │  → prompt uses: "Clark Kent—glasses, suit"             │
 │         │              │    image ref:   clark-ref.png                           │
 │         │              │                                                        │
 ├─────────┼──────────────┼────────────────────────────────────────────────────────┤
 │         │              │                                                        │
 │ Shot 2B │  2 < 3       │  [] (empty — same as above)                            │
 │         │  BEFORE      │                                                        │
 │         │              │                                                        │
 ├─────────┼──────────────┼────────────────────────────────────────────────────────┤
 │         │              │                                                        │
 │ Shot 2C │  3 == 3      │  [{                                                    │
 │         │  AT TRIGGER  │     asset_instance_id: "sai-sc2",                      │
 │         │              │     effective_description: "Clark Kent—glasses, suit",  │
 │         │              │     image_key_url: "clark-ref.png",                     │
 │         │              │     is_transforming: TRUE  ◄───────── KEY FLAG          │
 │         │              │     transformation_narrative: "Rips open shirt...",     │
 │         │              │     post_description: "Superman—cape, S-symbol",       │
 │         │              │     post_image_key_url: "superman-ref.png"             │
 │         │              │  }]                                                     │
 │         │              │                                                        │
 │         │              │  → frame prompt: Clark + [TRANSFORMING IN THIS SHOT]   │
 │         │              │  → video prompt: TRANSFORMATION EVENT block injected   │
 │         │              │  → end frame:    FORCED, shows Superman post-state     │
 │         │              │                                                        │
 ├─────────┼──────────────┼────────────────────────────────────────────────────────┤
 │         │              │                                                        │
 │ Shot 2D │  4 > 3       │  [{                                                    │
 │         │  AFTER       │     asset_instance_id: "sai-sc2",                      │
 │         │              │     effective_description: "Superman—cape, S-symbol",  │
 │         │              │     image_key_url: "superman-ref.png",                 │
 │         │              │     is_transforming: false                              │
 │         │              │  }]                                                     │
 │         │              │                                                        │
 │         │              │  → prompt uses: "Superman—cape, S-symbol"              │
 │         │              │    image ref:   superman-ref.png                        │
 │         │              │                                                        │
 ├─────────┼──────────────┼────────────────────────────────────────────────────────┤
 │         │              │                                                        │
 │ Shot 2E │  5 > 3       │  (same as 2D — post-state locked in)                   │
 │         │  AFTER       │                                                        │
 │         │              │                                                        │
 └─────────┴──────────────┴────────────────────────────────────────────────────────┘
```

---

## 4. All Three Transformation Types — Side by Side

```
 Scene 2: within_shot          Scene 3: instant             Scene X: gradual
 (on-camera transformation)    (off-screen, between shots)  (spans multiple shots)

 trigger: Shot 2C              trigger: Shot 3F             trigger: Shot XB
 completion: n/a               completion: n/a              completion: Shot XE

 Shot 2A │ Clark Kent           Shot 3A │ Superman           Shot XA │ Clark Kent
 Shot 2B │ Clark Kent           Shot 3B │ Superman           Shot XB │ Clark Kent (trigger)
         │                      Shot 3C │ Superman           Shot XC │ Clark Kent (mid)
 Shot 2C │ Clark Kent           Shot 3D │ Superman           Shot XD │ Clark Kent (mid)
         │ ╔═══════════╗        Shot 3E │ Superman           Shot XE │ Superman  (completion)
         │ ║TRANSFORMING║                │                    Shot XF │ Superman
         │ ║on camera   ║       Shot 3F │ Clark Kent ◄─snap  Shot XG │ Superman
         │ ╚═══════════╝        Shot 3G │ Clark Kent
         │ end frame forced     Shot 3H │ Clark Kent
         ▼
 Shot 2D │ Superman      ◄── resolveOverridesForShot returns:
 Shot 2E │ Superman
                                instant:     shotOrder >= triggerOrder → post
                                within_shot: shotOrder == trigger → pre + is_transforming
                                             shotOrder > trigger  → post
                                gradual:     shotOrder >= completionOrder → post
                                             otherwise → pre (no override)
```

---

## 5. Prompt Generation Pipeline (Stage 9 / Frame Routes)

```
 ┌────────────────────────────────────────────────────────────────────────────┐
 │                    PROMPT GENERATION FLOW                                  │
 │                    (backend/src/routes/frames.ts)                          │
 └────────────────────────────────────────────────────────────────────────────┘

         generateBulkPromptSets(sceneId)
                    │
                    ▼
    ┌───────────────────────────────┐
    │ 1. Fetch scene data           │
    │    - shots (ordered)          │
    │    - scene_asset_instances    │
    │    - shot_asset_assignments   │
    └───────────────┬───────────────┘
                    │
                    ▼
    ┌───────────────────────────────┐
    │ 2. Fetch confirmed            │
    │    transformation_events      │
    │    for this scene             │
    └───────────────┬───────────────┘
                    │
                    ▼
    ┌───────────────────────────────────────────────────────────────────┐
    │ 3. FOR EACH SHOT:                                                │
    │                                                                   │
    │    overrides = resolveOverridesForShot(shot, assets, events)      │
    │                         │                                         │
    │                         ▼                                         │
    │    ┌─────────────────────────────────────────────────────────┐    │
    │    │ generatePromptSet(shot, assets, overrides, ...)         │    │
    │    │                                                         │    │
    │    │  ┌─────────────────────────────────────────────────┐    │    │
    │    │  │ FRAME PROMPT (buildAssetContext)                 │    │    │
    │    │  │                                                  │    │    │
    │    │  │ For each assigned asset:                         │    │    │
    │    │  │   if override exists for this asset:             │    │    │
    │    │  │     use override.effective_description           │    │    │
    │    │  │     use override.image_key_url                   │    │    │
    │    │  │     if is_transforming:                          │    │    │
    │    │  │       append [TRANSFORMING IN THIS SHOT]         │    │    │
    │    │  │   else:                                          │    │    │
    │    │  │     use asset.effective_description (default)    │    │    │
    │    │  └─────────────────────────────────────────────────┘    │    │
    │    │                                                         │    │
    │    │  ┌─────────────────────────────────────────────────┐    │    │
    │    │  │ VIDEO PROMPT                                     │    │    │
    │    │  │                                                  │    │    │
    │    │  │ if transformingAssets.length > 0:                │    │    │
    │    │  │   inject TRANSFORMATION EVENT block:             │    │    │
    │    │  │   ┌────────────────────────────────────────┐     │    │    │
    │    │  │   │ TRANSFORMATION EVENT:                   │     │    │    │
    │    │  │   │ Clark Kent/Superman transforms.         │     │    │    │
    │    │  │   │ Before: Clark Kent—glasses, suit        │     │    │    │
    │    │  │   │ After:  Superman—cape, S-symbol         │     │    │    │
    │    │  │   │ Action: Rips open shirt revealing suit  │     │    │    │
    │    │  │   │ OVERRIDE: Describe this transformation  │     │    │    │
    │    │  │   │ as it happens on camera.                │     │    │    │
    │    │  │   └────────────────────────────────────────┘     │    │    │
    │    │  └─────────────────────────────────────────────────┘    │    │
    │    │                                                         │    │
    │    │  ┌─────────────────────────────────────────────────┐    │    │
    │    │  │ END FRAME (determineRequiresEndFrame)            │    │    │
    │    │  │                                                  │    │    │
    │    │  │ within_shot at trigger → FORCE end frame         │    │    │
    │    │  │                                                  │    │    │
    │    │  │ End frame prompt:                                │    │    │
    │    │  │   "TRANSFORMATION: character has TRANSFORMED.    │    │    │
    │    │  │    START showed: Clark Kent—glasses, suit        │    │    │
    │    │  │    END must show: Superman—cape, S-symbol        │    │    │
    │    │  │    All other elements remain the same."          │    │    │
    │    │  │                                                  │    │    │
    │    │  │ Uses post_image_key_url as reference             │    │    │
    │    │  └─────────────────────────────────────────────────┘    │    │
    │    └─────────────────────────────────────────────────────────┘    │
    └──────────────────────────────────────────────────────────────────┘
```

---

## 6. Cross-Scene Inheritance

```
 ┌─────────────────────────────────────────────────────────────────────────┐
 │                    SCENE-TO-SCENE STATE PROPAGATION                     │
 │                    (assetInheritanceService.ts)                         │
 └─────────────────────────────────────────────────────────────────────────┘

 Scene 2                              Scene 3                        Scene 4
 ┌──────────────────────────┐         ┌────────────────────────┐     ┌──────────────────┐
 │ sai-sc2                  │         │ sai-sc3                │     │ sai-sc4          │
 │                          │         │                        │     │                  │
 │ base: Clark Kent         │         │ base: ??? (inherited)  │     │ base: ???        │
 │                          │         │                        │     │                  │
 │ Events:                  │         │ Events:                │     │ Events: (none)   │
 │  te-001: within_shot     │         │  te-002: instant       │     │                  │
 │    trigger: 2C           │         │    trigger: 3F         │     │                  │
 │    post: Superman        │         │    post: Clark Kent    │     │                  │
 │    post_img: superman.png│         │    post_img: clark.png │     │                  │
 └────────────┬─────────────┘         └──────────┬─────────────┘     └──────────────────┘
              │                                  │
              │                                  │
              ▼                                  ▼
 ┌──────────────────────────────────────────────────────────────────────────┐
 │                                                                          │
 │  getLastAssetStateForInheritance(scene-2, sai-sc2)                       │
 │    → finds te-001 (last confirmed event by trigger_shot_order)           │
 │    → returns {                                                           │
 │        description: "Superman—cape, S-symbol",                           │
 │        imageKeyUrl: "superman-ref.png",                                  │
 │        statusTags: [...]                                                 │
 │      }                                                                   │
 │                                                                          │
 │  Scene 3's sai-sc3 is created with:                                      │
 │    effective_description = "Superman—cape, S-symbol"  ◄── from Scene 2   │
 │    image_key_url = "superman-ref.png"                                    │
 │                                                                          │
 │  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─     │
 │                                                                          │
 │  getLastAssetStateForInheritance(scene-3, sai-sc3)                       │
 │    → finds te-002 (instant at 3F, post: Clark Kent)                      │
 │    → returns {                                                           │
 │        description: "Clark Kent—glasses, blue suit, tie",                │
 │        imageKeyUrl: "clark-ref.png"                                      │
 │      }                                                                   │
 │                                                                          │
 │  Scene 4's sai-sc4 is created with:                                      │
 │    effective_description = "Clark Kent—glasses, blue suit, tie"           │
 │    image_key_url = "clark-ref.png"                                       │
 │                                                                          │
 └──────────────────────────────────────────────────────────────────────────┘


 FULL FILM TIMELINE:

 Scene 1          Scene 2          Scene 3          Scene 4
 ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
 │          │     │  Clark   │     │          │     │          │
 │  Clark   │     │  ──2C──▶ │     │ Superman │     │  Clark   │
 │  Kent    │     │  Superman│     │  ──3F──▶ │     │  Kent    │
 │          │     │          │     │ Clark    │     │          │
 └──────────┘     └──────────┘     └──────────┘     └──────────┘
                   within_shot      instant
                   (on camera)      (off screen)

 All of this is ONE project_asset: "Clark Kent / Superman"
 Each scene gets its own scene_asset_instance
 Transformation events swap the description/image at specific shots
 Inheritance carries the LAST state into the next scene automatically
```

---

## 7. Chained / Stacked Events (Multiple Transforms in One Scene)

```
 Scene 5: Clark → Superman → Clark (two events, same scene)

 ┌─────────────────────────────────────────────────────────────────────┐
 │ sai-sc5                                                             │
 │ base effective_description: "Clark Kent—glasses, suit"              │
 │                                                                     │
 │ Events (sorted by trigger_shot_order):                              │
 │   te-003: instant, trigger: Shot 5B  → post: "Superman"            │
 │   te-004: instant, trigger: Shot 5F  → post: "Clark Kent"          │
 └─────────────────────────────────────────────────────────────────────┘

 resolveOverridesForShot walks events in order, accumulating state:

 Shot   │ After te-003          │ After te-004          │ Final output
 ───────┼───────────────────────┼───────────────────────┼─────────────────
 5A     │ before trigger (Clark)│ before trigger (Clark)│ Clark (no override)
 5B     │ at trigger → Superman │ before trigger (Super)│ Superman
 5C     │ after  → Superman     │ before trigger (Super)│ Superman
 5D     │ after  → Superman     │ before trigger (Super)│ Superman
 5E     │ after  → Superman     │ before trigger (Super)│ Superman
 5F     │ after  → Superman     │ at trigger → Clark    │ Clark Kent
 5G     │ after  → Superman     │ after  → Clark        │ Clark Kent

 The loop walks each event sequentially:
   currentDescription starts as base ("Clark Kent")
   te-003 at 5B: shotOrder >= triggerOrder → currentDescription = "Superman"
   te-004 at 5F: shotOrder >= triggerOrder → currentDescription = "Clark Kent"

 Each event's output feeds the next event's input.
 Final currentDescription compared to base — if different, override emitted.
```

---

## 8. Two Assets Approach vs Transformation — Prompt Comparison

```
 ═══════════════════════════════════════════════════════════════════════
 SHOT 2C — ON-CAMERA TRANSFORMATION (within_shot)
 ═══════════════════════════════════════════════════════════════════════

 ┌─ ONE ASSET + TRANSFORMATION ────────────────────────────────────────┐
 │                                                                      │
 │  FRAME PROMPT:                                                       │
 │    "Clark Kent / Superman (throughout)                               │
 │     Clark Kent—glasses, blue suit, tie                               │
 │     [TRANSFORMING IN THIS SHOT — see transformation context]"        │
 │    ref_image: clark-ref.png                                          │
 │                                                                      │
 │  VIDEO PROMPT:                                                       │
 │    "... Clark grabs his shirt collar —                                │
 │     TRANSFORMATION EVENT: Clark Kent/Superman transforms.            │
 │     Before: Clark Kent—glasses, blue suit, tie                       │
 │     After: Superman—red cape, blue suit with S-symbol                │
 │     Transformation: Rips open dress shirt revealing the suit         │
 │     OVERRIDE: Describe this visual transformation as it happens."    │
 │                                                                      │
 │  END FRAME (forced):                                                 │
 │    "TRANSFORMATION: Character has TRANSFORMED during this shot.      │
 │     START frame showed: Clark Kent—glasses, suit                     │
 │     END frame must show: Superman—cape, S-symbol                     │
 │     All other characters/environment remain the same."               │
 │    ref_image: superman-ref.png                                       │
 │                                                                      │
 └──────────────────────────────────────────────────────────────────────┘

 ┌─ TWO SEPARATE ASSETS ───────────────────────────────────────────────┐
 │                                                                      │
 │  FRAME PROMPT:                                                       │
 │    "Clark Kent (exits) — glasses, blue suit, tie                     │
 │     Superman (enters) — red cape, blue suit with S-symbol"           │
 │    ref_images: clark-ref.png, superman-ref.png                       │
 │                                                                      │
 │  VIDEO PROMPT:                                                       │
 │    "... Clark exits frame, Superman enters frame ..."                │
 │    (NO transformation context — AI sees two different people)        │
 │                                                                      │
 │  END FRAME:                                                          │
 │    NOT forced. Normal end frame rules apply.                         │
 │    No awareness of transformation continuity.                        │
 │                                                                      │
 │  ⚠ The video model has NO IDEA these are the same person.           │
 │  ⚠ It will animate two separate characters entering/exiting.        │
 │  ⚠ No shirt-rip reveal. No morphing. Just a cut.                    │
 │                                                                      │
 └──────────────────────────────────────────────────────────────────────┘
```

---

## 9. Stage 8 "Convert to Transformation" Flow

```
 When two assets exist that are really one character in different forms:

 ┌─────────────────────────────────────────────────────────────────────┐
 │ Stage 8 — Scene Asset List Panel                                    │
 │                                                                     │
 │  ┌─────────────────┐  ┌─────────────────┐                          │
 │  │ Clark Kent       │  │ Superman         │                          │
 │  │ [character]      │  │ [character]      │                          │
 │  │                  │  │  ⋮ (context menu)│                          │
 │  │                  │  │  ├ Convert to    │                          │
 │  │                  │  │  │ Transformation │                          │
 │  └─────────────────┘  └──────┬──────────┘                          │
 │                               │                                     │
 └───────────────────────────────┼─────────────────────────────────────┘
                                 │ user clicks
                                 ▼
                  ┌──────────────────────────────┐
                  │ ConvertToTransformationDialog │
                  │                              │
                  │ STEP 1: Pick base asset      │
                  │                              │
                  │  ○ Clark Kent  [character]    │
                  │  ○ Lois Lane   [character]    │
                  │  ○ Daily Planet [location]    │
                  │                              │
                  │         [Next →]             │
                  └──────────────┬───────────────┘
                                 │ user picks Clark Kent
                                 ▼
                  ┌──────────────────────────────┐
                  │ STEP 2: LLM Prefill          │
                  │                              │
                  │  ⟳ Analyzing shot            │
                  │    assignments...             │
                  │                              │
                  │  (calls generatePrefill with │
                  │   absorbed_instance_id =     │
                  │   Superman's instance)       │
                  └──────────────┬───────────────┘
                                 │ LLM returns prefill
                                 ▼
                  ┌──────────────────────────────┐
                  │ AddTransformationDialog       │
                  │ (pre-filled)                 │
                  │                              │
                  │ Trigger: [Shot 2C]  (inferred│
                  │          from Superman's     │
                  │          first shot assign)  │
                  │ Type: [within_shot]           │
                  │ Post: "Superman—cape..."     │
                  │ Narrative: "Rips open..."    │
                  │                              │
                  │         [Create]             │
                  └──────────────┬───────────────┘
                                 │ user confirms
                                 ▼
                  ┌──────────────────────────────────────────────┐
                  │ POST-CONFIRM CLEANUP:                        │
                  │                                              │
                  │ 1. Create transformation event on Clark Kent │
                  │ 2. Superman's image → event post_image_url   │
                  │ 3. Delete Superman scene_asset_instance       │
                  │ 4. Toast: "Defer Superman from project?"     │
                  │    [Yes] → marks project_asset deferred      │
                  └──────────────────────────────────────────────┘

 RESULT: Scene now has ONE asset (Clark Kent) with a transformation
 event, instead of two separate assets.
```

There you go — the diagrams are saved at `._docs/t-asset-system-improvements/transformation-system-diagrams.md`.

The key takeaways visualized:

1. **Data model**: one `project_asset` → many `scene_asset_instances` → many `transformation_events` per instance. Shot assignments point to the instance, not the form.

2. **Resolution algorithm**: `resolveOverridesForShot()` walks events sorted by trigger order, accumulating state. The type determines *when* the swap happens (instant = at trigger, within_shot = after trigger with transform flag at trigger, gradual = at completion).

3. **Prompt generation**: only the transformation path injects `TRANSFORMATION EVENT` blocks into video prompts and forces end frames. Two separate assets just get treated as two unrelated people entering/exiting.

4. **Inheritance**: the last confirmed event's post-state automatically becomes the next scene's starting state — so Superman at end of Scene 2 means Scene 3 starts with Superman, no manual work.

5. **Convert flow**: Stage 8's escape hatch when the user already has two assets but realizes they should be one — folds the absorbed asset into a transformation event on the base asset.