Reviewing relevant files to understand the data structures and context.


[5 tools called]


Checking the stage_states schema and existing backend service patterns:


[4 tools called]


Checking how stage states are queried in the backend and whether they include timestamps:


[3 tools called]


Creating the Continuity Risk Analyzer service. Checking an existing service for patterns:


[1 tool called]


Creating the Continuity Risk Analyzer service:


[1 tool called]


Checking for lint errors and verifying the implementation:


[2 tools called]


Verifying the implementation matches the plan. Reviewing the plan details:


[1 tool called]


Updating the service to match the plan's expected class and method names:


[1 tool called]


Reviewing the complete implementation to verify correctness:


[1 tool called]


Reordering rules: check Rule 4 (scene status) before Rule 3 (upstream artifacts) since a broken/outdated scene should be marked broken immediately.


[1 tool called]


Reverting to match the plan's order. Both rules return 'broken', so the order only affects performance.


[1 tool called]


## Summary

**Task 3: Continuity Risk Analyzer Service** — implemented

### Created file
- `backend/src/services/continuityRiskAnalyzer.ts` — rule-based continuity risk analyzer

### Implementation details

1. Types:
   - `ContinuityRisk`: 'safe' | 'risky' | 'broken'
   - `SceneData`: scene structure with `updated_at`
   - `StageStateData`: stage state structure with `created_at`
   - `ContinuityAnalysisInput`: input interface

2. Rules (in order):
   - Rule 1: No prior scene → 'safe'
   - Rule 2: Prior scene not 'video_complete' → 'risky'
   - Rule 3: Upstream artifacts (Stages 1-4) changed since scene modified → 'broken'
   - Rule 4: Scene status is 'continuity_broken' or 'outdated' → 'broken'
   - Default: 'safe'

3. Helper function:
   - `upstreamArtifactsChangedSinceSceneModified()`: compares scene `updated_at` with max `created_at` of latest versions of stages 1-4

4. Exports:
   - Standalone function: `analyzeContinuityRisk()`
   - Class: `ContinuityRiskAnalyzer` with `analyzeContinuityRisk()` method
   - Singleton instance: `continuityRiskAnalyzer`

### Notes
- Rule-based (no LLM calls)
- Uses `created_at` from stage_states (latest version per stage)
- Matches the plan's specification
- No linting errors
- Ready for integration in Task 4 (GET /scenes endpoint)

The service is ready to be integrated into the backend route that fetches scenes for Stage 6 (Script Hub).