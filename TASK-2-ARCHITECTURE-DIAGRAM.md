# Task 2 Architecture Diagram - Scene Dependency Extraction

## System Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           STAGE 4: MASTER SCRIPT                            │
│                         (User approves final script)                        │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 │ Frontend: scriptService.persistScenes()
                                 │ POST /api/projects/:id/scenes
                                 ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                       BACKEND: projects.ts Endpoint                         │
│                      PUT /api/projects/:id/scenes                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                 │
                                 │ 1. Receive scenes array from frontend
                                 ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DEPENDENCY EXTRACTION LOOP                          │
│                                                                             │
│  For each scene in scenes[]:                                                │
│    ┌─────────────────────────────────────────────────┐                     │
│    │ 1. Parse scene heading (first line)             │                     │
│    │    scriptExcerpt.split('\n')[0]                 │                     │
│    └─────────────────┬───────────────────────────────┘                     │
│                      │                                                      │
│                      ↓                                                      │
│    ┌─────────────────────────────────────────────────┐                     │
│    │ 2. Call sceneDependencyExtractionService        │                     │
│    │    .extractDependencies(heading, excerpt)       │                     │
│    └─────────────────┬───────────────────────────────┘                     │
│                      │                                                      │
│                      ↓                                                      │
│    ┌─────────────────────────────────────────────────┐                     │
│    │ 3. Store in dependenciesMap                     │                     │
│    │    key: "${slug}:${sceneNumber}"                │                     │
│    │    value: { characters[], location, props[] }   │                     │
│    └─────────────────────────────────────────────────┘                     │
│                                                                             │
│  Error handling: On LLM failure, store empty dependencies                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SCENE DEPENDENCY EXTRACTION SERVICE                      │
│              backend/src/services/sceneDependencyExtraction.ts              │
└─────────────────────────────────────────────────────────────────────────────┘
                                 │
                ┌────────────────┴────────────────┐
                ↓                                 ↓
┌───────────────────────────┐    ┌───────────────────────────────────────┐
│  REGEX LOCATION PARSER    │    │        LLM EXTRACTION                 │
│                           │    │  (via llm-client.ts)                  │
│ Pattern:                  │    │                                       │
│ INT./EXT. LOCATION - TIME │    │ Prompt:                               │
│                           │    │ - System: Extract characters,         │
│ Example:                  │    │           location, props             │
│ "INT. KITCHEN - DAY"      │    │ - User: Scene heading +               │
│        ↓                  │    │         first 20 lines                │
│    "KITCHEN"              │    │ - Output: JSON                        │
└───────────────────────────┘    │   { characters: [],                   │
                                 │     location: "",                     │
                                 │     props: [] }                       │
                                 │                                       │
                                 │ Temperature: 0.3 (consistent)         │
                                 │ Max tokens: 500 (short response)      │
                                 └───────────────────────────────────────┘
                                 │
                                 │ Returns: SceneDependencies
                                 │ {
                                 │   expectedCharacters: string[]
                                 │   expectedLocation: string
                                 │   expectedProps: string[]
                                 │ }
                                 ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SCENE PROCESSING LOOP                               │
│                                                                             │
│  For each scene with dependencies:                                          │
│    ┌─────────────────────────────────────────────────┐                     │
│    │ Match existing scene by slug + scene_number?    │                     │
│    └─────────────┬───────────────────┬───────────────┘                     │
│                  │ Yes               │ No                                  │
│                  ↓                   ↓                                      │
│    ┌─────────────────────┐  ┌───────────────────────┐                     │
│    │ UPDATE EXISTING     │  │ INSERT NEW SCENE      │                     │
│    │ - script_excerpt    │  │ - branch_id           │                     │
│    │ - expected_chars    │  │ - scene_number        │                     │
│    │ - expected_location │  │ - slug                │                     │
│    │ - expected_props    │  │ - script_excerpt      │                     │
│    │ - extracted_at      │  │ - expected_chars      │                     │
│    └─────────────────────┘  │ - expected_location   │                     │
│                              │ - expected_props      │                     │
│                              │ - extracted_at        │                     │
│                              │ - status: 'draft'     │                     │
│                              └───────────────────────┘                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATABASE PERSISTENCE                              │
│                         (Supabase PostgreSQL)                               │
│                                                                             │
│  scenes table:                                                              │
│    id                         UUID                                          │
│    branch_id                  UUID                                          │
│    scene_number               INTEGER                                       │
│    slug                       TEXT                                          │
│    script_excerpt             TEXT                                          │
│    status                     scene_status                                  │
│    expected_characters        TEXT[]         ← NEW                          │
│    expected_location          TEXT           ← NEW                          │
│    expected_props             TEXT[]         ← NEW                          │
│    dependencies_extracted_at  TIMESTAMPTZ    ← NEW                          │
│    created_at                 TIMESTAMPTZ                                   │
│    updated_at                 TIMESTAMPTZ                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                 │
                                 │ Return success
                                 ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND RESPONSE                              │
│                                                                             │
│  Success: Scenes persisted with dependencies                                │
│  Frontend can now proceed to Stage 5                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow Detail

### Input (Frontend → Backend)

```typescript
POST /api/projects/:projectId/scenes
Body: {
  scenes: [
    {
      sceneNumber: 1,
      slug: "int-kitchen-day-1",
      scriptExcerpt: "INT. KITCHEN - DAY\n\nALICE enters..."
    },
    // ... more scenes
  ]
}
```

### Processing (Backend)

1. **Extract dependencies for each scene** (sequential)
   - Parse heading from first line
   - Call LLM service with heading + first 20 lines
   - Store results in `dependenciesMap`

2. **Match existing scenes**
   - Load existing scenes from database
   - Match by `slug:scene_number` key
   - Preserve IDs for matched scenes (ID stability)

3. **Prepare database operations**
   - Build `scenesToUpdate[]` for matched scenes
   - Build `scenesToInsert[]` for new scenes
   - Include dependency fields in both

4. **Execute database operations**
   - Update matched scenes with new data
   - Insert new scenes
   - Return success with scene IDs

### Output (Backend → Frontend)

```typescript
Response: {
  success: true,
  sceneCount: 15,
  scenes: [
    {
      id: "uuid-1",
      scene_number: 1,
      slug: "int-kitchen-day-1"
    },
    // ... more scenes
  ],
  idMapping: [...],
  deletedScenesCount: 0
}
```

### Retrieval (Frontend ← Backend)

```typescript
GET /api/projects/:projectId/scenes
Response: {
  scenes: [
    {
      id: "uuid-1",
      sceneNumber: 1,
      slug: "int-kitchen-day-1",
      status: "draft",
      scriptExcerpt: "INT. KITCHEN - DAY\n\nALICE enters...",
      header: "INT. KITCHEN - DAY",
      openingAction: "ALICE enters...",
      expectedCharacters: ["ALICE", "BOB"],      // ← FROM EXTRACTION
      expectedLocation: "KITCHEN",               // ← FROM EXTRACTION
      expectedProps: ["briefcase", "letter"],    // ← FROM EXTRACTION
      shots: [],
      // ... other fields
    },
    // ... more scenes
  ]
}
```

## Performance Characteristics

```
┌────────────────────────────────────────────────────────────────┐
│                     EXTRACTION PERFORMANCE                     │
├────────────────────────────────────────────────────────────────┤
│  Per Scene:                                                    │
│    - LLM call: ~450-850ms                                      │
│    - Token usage: ~450-500 tokens                              │
│    - Cost: ~$0.00001 (essentially free)                        │
│                                                                │
│  For 20 Scenes (Sequential):                                   │
│    - Total time: ~10-20 seconds                                │
│    - Total cost: ~$0.0002                                      │
│                                                                │
│  Optimization potential:                                       │
│    - Background processing: Extract async after persistence    │
│    - Batch LLM calls: Reduce overhead                          │
│    - Caching: Only re-extract on script changes                │
└────────────────────────────────────────────────────────────────┘
```

## Key Design Principles

1. **Extract Once, Cache Forever**
   - Extraction happens at Stage 4 parsing time
   - Cached in database with timestamp
   - No re-extraction on scene fetch (Stage 6)

2. **No Fuzzy Matching at Stage 4**
   - Raw names extracted (e.g., "ALICE", "a gun")
   - Fuzzy matching deferred to Stage 5 when assets exist
   - Simplifies extraction logic

3. **Graceful Degradation**
   - LLM failures don't block scene persistence
   - Empty dependencies stored as fallback
   - Warnings logged for monitoring

4. **Token Optimization**
   - Only first 20 lines analyzed
   - Reduces cost by 60-80%
   - Maintains quality (characters/props introduced early)

5. **ID Stability**
   - Matched scenes preserve existing IDs
   - Only new scenes get new IDs
   - Prevents downstream reference breakage

---

**Architecture Date:** January 27, 2026  
**Implementation Status:** ✅ Complete  
**Next Phase:** Task 3 - Continuity Risk Analyzer
