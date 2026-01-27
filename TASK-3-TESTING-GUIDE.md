# Task 3: Continuity Risk Analyzer - Testing Guide

This guide explains how to test the Continuity Risk Analyzer service implementation.

## Test Types

### 1. Unit Tests (Automated)

The service includes comprehensive unit tests that cover all four rules and edge cases.

#### Running Unit Tests

From the backend directory:

```powershell
cd "C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend"
npm test
```

To run only the continuity risk analyzer tests:

```powershell
npm test -- continuityRiskAnalyzer
```

To run with coverage:

```powershell
npm test -- --coverage continuityRiskAnalyzer
```

#### Test Coverage

The test suite (`backend/src/tests/continuityRiskAnalyzer.test.ts`) covers:

- ✅ **Rule 1**: No prior scene → always safe
- ✅ **Rule 2**: Prior scene not complete → risky
- ✅ **Rule 3**: Upstream artifacts changed → broken
- ✅ **Rule 4**: Scene status broken/outdated → broken
- ✅ Rule priority and combinations
- ✅ Edge cases (exact timestamps, multiple versions)
- ✅ Class vs function interface

**Total: 25+ test cases**

### 2. Manual Testing via API (Integration)

Once integrated into the GET /scenes endpoint (Task 4), you can test via the API:

#### Prerequisites

1. Start the backend server:
   ```powershell
   cd "C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend"
   npm run dev
   ```

2. Start the frontend (in another terminal):
   ```powershell
   cd "C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector"
   npm run dev
   ```

#### Test Scenarios

**Scenario 1: Scene 1 (No Prior Scene)**
- Navigate to Stage 6 (Script Hub)
- Check Scene 1
- Expected: `continuityRisk: 'safe'`

**Scenario 2: Prior Scene Incomplete**
- Ensure Scene 1 status is NOT 'video_complete' (e.g., 'draft', 'shot_list_ready')
- Check Scene 2
- Expected: `continuityRisk: 'risky'`

**Scenario 3: Upstream Artifacts Changed**
- Complete Scene 1 (mark as 'video_complete')
- Edit Stage 1-4 content (e.g., edit Master Script in Stage 4)
- Check Scene 2
- Expected: `continuityRisk: 'broken'`

**Scenario 4: Scene Status Broken**
- Manually set a scene status to 'outdated' or 'continuity_broken' in database
- Check that scene
- Expected: `continuityRisk: 'broken'`

**Scenario 5: All Safe Conditions**
- Scene 1 is 'video_complete'
- Scene 2 was updated after all Stage 1-4 states
- Scene 2 status is not 'outdated' or 'continuity_broken'
- Expected: `continuityRisk: 'safe'`

### 3. Manual Testing via Script (Quick Validation)

Create a simple test script to validate the logic:

```typescript
// test-continuity-manual.ts
import { analyzeContinuityRisk } from './src/services/continuityRiskAnalyzer.js';

// Test Case 1: Scene 1 (no prior)
const test1 = analyzeContinuityRisk({
  scene: {
    id: 'scene-1',
    scene_number: 1,
    slug: 'int-kitchen-day',
    status: 'draft',
    updated_at: new Date().toISOString(),
  },
  priorScene: null,
  upstreamStageStates: [],
});

console.log('Test 1 (Scene 1):', test1); // Expected: 'safe'

// Test Case 2: Prior scene incomplete
const test2 = analyzeContinuityRisk({
  scene: {
    id: 'scene-2',
    scene_number: 2,
    slug: 'ext-street-day',
    status: 'draft',
    updated_at: new Date().toISOString(),
  },
  priorScene: {
    id: 'scene-1',
    scene_number: 1,
    slug: 'int-kitchen-day',
    status: 'draft', // Not complete
    updated_at: new Date().toISOString(),
  },
  upstreamStageStates: [],
});

console.log('Test 2 (Prior incomplete):', test2); // Expected: 'risky'

// Test Case 3: Upstream changed
const sceneUpdatedAt = new Date('2024-01-01T10:00:00Z');
const stageCreatedAt = new Date('2024-01-01T11:00:00Z'); // After scene

const test3 = analyzeContinuityRisk({
  scene: {
    id: 'scene-2',
    scene_number: 2,
    slug: 'ext-street-day',
    status: 'draft',
    updated_at: sceneUpdatedAt.toISOString(),
  },
  priorScene: {
    id: 'scene-1',
    scene_number: 1,
    slug: 'int-kitchen-day',
    status: 'video_complete',
    updated_at: new Date().toISOString(),
  },
  upstreamStageStates: [
    {
      id: 'stage-1',
      branch_id: 'branch-1',
      stage_number: 1,
      version: 1,
      status: 'locked',
      created_at: stageCreatedAt.toISOString(), // After scene update
    },
  ],
});

console.log('Test 3 (Upstream changed):', test3); // Expected: 'broken'

// Test Case 4: Scene status broken
const test4 = analyzeContinuityRisk({
  scene: {
    id: 'scene-2',
    scene_number: 2,
    slug: 'ext-street-day',
    status: 'outdated', // Broken status
    updated_at: new Date().toISOString(),
  },
  priorScene: {
    id: 'scene-1',
    scene_number: 1,
    slug: 'int-kitchen-day',
    status: 'video_complete',
    updated_at: new Date().toISOString(),
  },
  upstreamStageStates: [],
});

console.log('Test 4 (Scene broken):', test4); // Expected: 'broken'
```

Run with:
```powershell
cd "C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend"
tsx test-continuity-manual.ts
```

## Expected Test Results

### Unit Tests
All 25+ tests should pass:
```
PASS  src/tests/continuityRiskAnalyzer.test.ts
  ContinuityRiskAnalyzer
    Rule 1: No prior scene (Scene 1)
      ✓ should return "safe" when there is no prior scene
      ✓ should return "safe" for Scene 1 even with upstream changes
    Rule 2: Prior scene not complete
      ✓ should return "risky" when prior scene status is "draft"
      ✓ should return "risky" when prior scene status is "shot_list_ready"
      ✓ should return "risky" when prior scene status is "frames_locked"
      ...
```

### Integration Tests (After Task 4)
When calling `GET /api/projects/:id/scenes`, each scene should have:
- `continuityRisk: 'safe' | 'risky' | 'broken'`
- Risk calculated correctly based on the four rules

## Debugging Tips

1. **Check timestamps**: Ensure `scene.updated_at` and `stage_states.created_at` are valid ISO timestamps
2. **Verify stage filtering**: Only stages 1-4 are considered for upstream artifact checks
3. **Check rule order**: Rules are evaluated in order (1 → 2 → 3 → 4), first match wins
4. **Database state**: For integration tests, verify scene and stage state data in Supabase

## Next Steps

After verifying tests pass:
1. ✅ Task 3 complete - Continuity Risk Analyzer implemented
2. ⏭️ Task 4: Integrate into GET /scenes endpoint
3. ⏭️ Task 5: Update frontend to display continuity risk warnings
