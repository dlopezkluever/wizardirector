---
name: Stage 8 Bug Fixes
overview: Fix critical Stage 8 bugs including stage navigation persistence, image generation UI updates, status tag preservation, project asset access, and UX enhancements.
todos:
  - id: issue-1a
    content: "Fix Stage 7 redirect on refresh: Update ProjectView URL persistence to include sceneId, fix validation logic, add localStorage backup"
    status: pending
  - id: issue-1b
    content: "Fix image generation UI refresh: Add polling for single generation, invalidate React Query cache after bulk polling completes"
    status: pending
  - id: issue-2a
    content: "Fix status tags wiped on lock: Use local state in VisualStateEditorPanel, preserve existing tags when adding 'locked'"
    status: pending
  - id: issue-1c
    content: "Persist suggested assets: Create scene_asset_suggestions table, add backend routes, load/save suggestions in frontend"
    status: pending
  - id: issue-3ab
    content: "Add project assets to drawer: Add source toggle (project/global), default to project assets in Stage 8, handle both selection flows"
    status: pending
  - id: issue-2b
    content: "Add keyboard navigation to tag dropdown: Implement arrow keys, Enter, Tab, Escape handlers with visual highlighting"
    status: pending
  - id: issue-5
    content: "Add scene header: Display scene number and slug at top of Stage 8 UI"
    status: pending
isProject: false
---

# Stage 8 Bug Fixes - Implementation Plan

## Overview

This plan addresses 7 critical bugs and UX issues in Stage 8 (Visual Definition) identified after the rushed implementation of Features 5.1-5.3. The fixes ensure proper stage persistence, real-time UI updates, status tag preservation, and improved asset management workflows.

## Architecture Context

**Current State** (from exploration):

- **Frontend**: React + TypeScript + React Query for server state + local `useState` for UI
- **Stage 8 Main**: `src/components/pipeline/Stage8VisualDefinition.tsx`
- **Three panels**: SceneAssetListPanel (left) | VisualStateEditorPanel (center) | AssetDrawerTriggerPanel (right)
- **Backend**: Express routes in `backend/src/routes/sceneAssets.ts` and `backend/src/routes/stageStates.ts`
- **Database**: `scene_asset_instances` table (migration 015) with `status_tags TEXT[]` and `carry_forward BOOLEAN`

## Issues Summary


| ID    | Issue                                         | Severity  | Effort |
| ----- | --------------------------------------------- | --------- | ------ |
| 1a    | Page refresh redirects to Stage 7             | 🔴 High   | 3h     |
| 1b    | Generated images don't appear without refresh | 🔴 High   | 2h     |
| 1c    | Suggested assets disappear on navigation      | 🟡 Medium | 4h     |
| 2a    | Status tags wiped when locking asset          | 🔴 High   | 2h     |
| 2b    | No keyboard navigation in tag dropdown        | 🟢 Low    | 1h     |
| 3a/3b | No access to project assets in drawer         | 🟡 Medium | 4h     |
| 5     | Missing scene slug/number in UI               | 🟢 Low    | 30m    |


**Total Estimated Effort**: ~16.5 hours

---

## Issue 1a: Page Refresh Redirects to Stage 7

### Problem Analysis

**User report**: "Every time I refresh in Stage 8 (with Stage 7 locked), I'm sent back to Stage 7 and must unlock/relock Stage 7 to access Stage 8 again."

**Root causes** (from subagent investigation):

1. **URL params incomplete**: `ProjectView.tsx` restoration logic (lines 147-211) expects `?stage=8&sceneId=...` but `sceneId` may not persist in URL
2. **Stage validation blocking**: Backend requires Stage N-1 locked before accessing Stage N, but validation may fail due to missing scene context
3. **localStorage mismatch**: `project_{projectId}_stage` may conflict with URL params

### Solution

**Files to modify**:

- `[src/pages/ProjectView.tsx](src/pages/ProjectView.tsx)` — Stage persistence logic
- `[src/components/pipeline/Stage8VisualDefinition.tsx](src/components/pipeline/Stage8VisualDefinition.tsx)` — Scene context tracking

**Implementation steps**:

1. **Ensure sceneId persists in URL** (ProjectView.tsx, around line 220)

```typescript
// When navigating to Stage 8, ALWAYS include sceneId in URL
const navigateToStage8 = (sceneId: string) => {
  const url = new URL(window.location.href);
  url.searchParams.set('stage', '8');
  url.searchParams.set('sceneId', sceneId);  // CRITICAL: Must persist
  window.history.pushState({}, '', url);
  setCurrentStage(8);
  setActiveSceneId(sceneId);
  localStorage.setItem(`project_${projectId}_stage`, '8');
  localStorage.setItem(`project_${projectId}_sceneId`, sceneId);  // NEW: Also save to localStorage
};
```

1. **Fix restoration priority** (ProjectView.tsx, lines 147-211)

```typescript
useEffect(() => {
  // Priority: URL params > localStorage > default
  const urlParams = new URLSearchParams(window.location.search);
  const urlStage = urlParams.get('stage');
  const urlSceneId = urlParams.get('sceneId');
  
  if (urlStage) {
    const stageNum = parseInt(urlStage);
    setCurrentStage(stageNum);
    
    // If Stage 8, MUST have sceneId
    if (stageNum === 8) {
      if (urlSceneId) {
        setActiveSceneId(urlSceneId);
      } else {
        // Fallback to localStorage
        const storedSceneId = localStorage.getItem(`project_${projectId}_sceneId`);
        if (storedSceneId) {
          setActiveSceneId(storedSceneId);
          // Update URL to include sceneId
          urlParams.set('sceneId', storedSceneId);
          window.history.replaceState({}, '', `?${urlParams.toString()}`);
        } else {
          // No sceneId available - redirect to Stage 7 (safest fallback)
          console.warn('[Stage8] No sceneId found for Stage 8, redirecting to Stage 7');
          setCurrentStage(7);
        }
      }
    }
  } else {
    // Fallback to localStorage
    const storedStage = localStorage.getItem(`project_${projectId}_stage`);
    if (storedStage) {
      const stageNum = parseInt(storedStage);
      setCurrentStage(stageNum);
      
      if (stageNum === 8) {
        const storedSceneId = localStorage.getItem(`project_${projectId}_sceneId`);
        if (storedSceneId) {
          setActiveSceneId(storedSceneId);
        }
      }
    }
  }
}, [projectId]);
```

1. **Add validation bypass for Stage 8 with valid sceneId** (ProjectView.tsx, around line 280)

Current code blocks Stage 8 if Stage 7 isn't locked. Fix:

```typescript
// Allow Stage 8 if:
// 1. Stage 7 is locked, OR
// 2. We have a valid sceneId (user is revisiting an in-progress scene)
const canAccessStage8 = () => {
  const stage7Locked = lockedStages.has(7);
  const hasValidSceneId = !!activeSceneId;
  return stage7Locked || hasValidSceneId;
};
```

1. **Sync URL on every Stage 8 action** (Stage8VisualDefinition.tsx)

Add effect to sync URL whenever sceneId changes:

```typescript
useEffect(() => {
  if (sceneId) {
    const url = new URL(window.location.href);
    url.searchParams.set('stage', '8');
    url.searchParams.set('sceneId', sceneId);
    window.history.replaceState({}, '', url);
  }
}, [sceneId]);
```

**Testing**:

- Navigate to Stage 8 for Scene 1
- Refresh page → Verify stays on Stage 8 with Scene 1
- Open in new tab with URL → Verify Stage 8 loads correctly
- Clear localStorage → Verify URL params restore state

---

## Issue 1b: Generated Images Don't Appear Without Refresh

### Problem Analysis

**User report**: "After generating a scene instance image (single or bulk), the image doesn't appear in the UI until I manually refresh the page."

**Root cause** (from subagent):

- `pollBulkImageJobs()` in `sceneAssetService.ts` polls job status but doesn't invalidate React Query cache
- Single asset generation doesn't have polling at all
- React Query cache key `['scene-assets', projectId, sceneId]` never refreshes after image generation completes

### Solution

**Files to modify**:

- `[src/lib/services/sceneAssetService.ts](src/lib/services/sceneAssetService.ts)` — Fix polling logic
- `[src/components/pipeline/Stage8/VisualStateEditorPanel.tsx](src/components/pipeline/Stage8/VisualStateEditorPanel.tsx)` — Single asset generation
- `[src/components/pipeline/Stage8VisualDefinition.tsx](src/components/pipeline/Stage8VisualDefinition.tsx)` — Bulk generation

**Implementation steps**:

1. **Fix single asset generation polling** (VisualStateEditorPanel.tsx, around line 150)

Current code calls `generateSceneAssetImage()` but doesn't poll. Add:

```typescript
const handleGenerateImage = async (instanceId: string) => {
  try {
    setGenerating(true);
    const result = await sceneAssetService.generateSceneAssetImage(projectId, sceneId, instanceId);
    
    // Poll for completion
    await pollSingleImageJob(result.jobId);
    
    toast.success('Image generated successfully');
    
    // Force refetch to show new image
    await queryClient.invalidateQueries(['scene-assets', projectId, sceneId]);
  } catch (error) {
    toast.error(`Image generation failed: ${error.message}`);
  } finally {
    setGenerating(false);
  }
};

// Helper to poll a single job
const pollSingleImageJob = async (jobId: string) => {
  const maxAttempts = 60;
  const pollInterval = 2000;
  
  for (let i = 0; i < maxAttempts; i++) {
    const job = await sceneAssetService.getImageJobStatus(jobId);
    
    if (job.status === 'completed') {
      return;
    }
    
    if (job.status === 'failed') {
      throw new Error(job.error || 'Image generation failed');
    }
    
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }
  
  throw new Error('Image generation timeout');
};
```

1. **Fix bulk generation to invalidate cache after polling** (Stage8VisualDefinition.tsx, around line 450)

Current code:

```typescript
async function handleBulkGenerateConfirmed() {
  setCostConfirmOpen(false);
  setIsGenerating(true);
  setBulkProgress({ completed: 0, total: selectedForGeneration.length });

  try {
    const result = await sceneAssetService.bulkGenerateImages(projectId, sceneId, selectedForGeneration);
    
    await sceneAssetService.pollBulkImageJobs(result.statuses, {
      onProgress: (completed, total) => {
        setBulkProgress({ completed, total });
      },
    });

    // ... success/failure toasts ...
    
    // MISSING: Invalidate cache here!
  } finally {
    setIsGenerating(false);
    setBulkProgress(null);
    setSelectedForGeneration([]);
  }
}
```

Fix:

```typescript
async function handleBulkGenerateConfirmed() {
  setCostConfirmOpen(false);
  setIsGenerating(true);
  setBulkProgress({ completed: 0, total: selectedForGeneration.length });

  try {
    const result = await sceneAssetService.bulkGenerateImages(projectId, sceneId, selectedForGeneration);
    
    await sceneAssetService.pollBulkImageJobs(result.statuses, {
      onProgress: (completed, total) => {
        setBulkProgress({ completed, total });
      },
    });

    const allCompleted = result.statuses.filter(s => s.status === 'completed').length;
    const allFailed = result.statuses.filter(s => s.status === 'failed').length;

    if (allCompleted === result.statuses.length) {
      toast.success(`Generated ${allCompleted} image(s) successfully`);
    } else if (allFailed === result.statuses.length) {
      toast.error('All image generation jobs failed');
    } else {
      toast.warning(`${allCompleted} completed, ${allFailed} failed`);
    }
    
    // CRITICAL: Invalidate cache to trigger refetch
    await queryClient.invalidateQueries(['scene-assets', projectId, sceneId]);
  } catch (error) {
    console.error('[Stage8] Bulk generation error:', error);
    toast.error(`Bulk generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    setIsGenerating(false);
    setBulkProgress(null);
    setSelectedForGeneration([]);
  }
}
```

1. **Import queryClient** (Stage8VisualDefinition.tsx, top of file)

```typescript
import { useQueryClient } from '@tanstack/react-query';

// Inside component:
const queryClient = useQueryClient();
```

**Testing**:

- Generate single asset image → Verify image appears without refresh
- Generate bulk images (3 assets) → Verify all images appear after polling completes
- Test with slow network (DevTools throttling) → Verify polling works
- Test with failed generation → Verify error handling

---

## Issue 1c: Suggested Assets Disappear on Navigation

### Problem Analysis

**User report**: "When the AI suggests new assets ('new_assets_required'), they disappear if I navigate back to the shot list and return to Stage 8."

**Root cause**:

- `newAssetsRequired` is local state (`useState`) in `Stage8VisualDefinition.tsx`
- Lost on unmount/remount when navigating away
- User wants these stored in database for persistence and easy deletion

### Solution

**Database approach**: Store suggested assets in a new table or extend existing `scene_asset_instances` with a `suggestion_status` field.

**Option 1: New table** `scene_asset_suggestions`

- Pros: Clean separation, easy to delete all suggestions
- Cons: Extra table, more joins

**Option 2: Extend `scene_asset_instances**` with `is_suggestion BOOLEAN` and `suggestion_dismissed BOOLEAN`

- Pros: Reuses existing infrastructure, simpler queries
- Cons: Mixes suggestions with actual instances

**Recommended: Option 2** (simpler, follows existing patterns)

**Files to create/modify**:

- NEW: `backend/migrations/019_scene_asset_suggestions.sql`
- UPDATE: `backend/src/routes/sceneAssets.ts` — Add dismiss endpoint
- UPDATE: `src/components/pipeline/Stage8VisualDefinition.tsx` — Load suggestions from DB
- UPDATE: `src/lib/services/sceneAssetService.ts` — Add dismiss method

**Implementation steps**:

1. **Database migration** (019_scene_asset_suggestions.sql)

```sql
-- Migration 019: Scene Asset Suggestions Persistence
-- Feature 5.3 Fix: Store AI-suggested assets that need creation

-- Add columns to scene_asset_instances
ALTER TABLE scene_asset_instances 
  ADD COLUMN IF NOT EXISTS is_suggestion BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS suggestion_dismissed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS suggestion_rationale TEXT;

-- Index for filtering suggestions
CREATE INDEX IF NOT EXISTS idx_scene_instances_suggestions 
  ON scene_asset_instances(scene_id, is_suggestion) 
  WHERE is_suggestion = TRUE;

COMMENT ON COLUMN scene_asset_instances.is_suggestion IS 'TRUE if this is an AI-suggested asset (from new_assets_required) not yet confirmed by user';
COMMENT ON COLUMN scene_asset_instances.suggestion_dismissed IS 'TRUE if user dismissed this suggestion (hide from UI)';
COMMENT ON COLUMN scene_asset_instances.suggestion_rationale IS 'AI explanation for why this asset was suggested';
```

1. **Backend: Save suggestions endpoint** (sceneAssets.ts, new route)

```typescript
/**
 * POST /api/projects/:projectId/scenes/:sceneId/assets/save-suggestions
 * Save AI-suggested assets (new_assets_required) as placeholder instances
 */
router.post('/:projectId/scenes/:sceneId/assets/save-suggestions', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { projectId, sceneId } = req.params;
    const { suggestions } = req.body; // Array of { name, asset_type, description, justification }
    
    // Validate suggestions array
    if (!Array.isArray(suggestions)) {
      return res.status(400).json({ error: 'suggestions must be an array' });
    }
    
    // Verify project ownership and scene exists (same validation as other endpoints)
    // ... (copy from existing endpoints) ...
    
    // Create placeholder instances for each suggestion
    // Note: These have project_asset_id = NULL since they don't exist yet
    const instancesToCreate = suggestions.map(s => ({
      scene_id: sceneId,
      project_asset_id: null, // No corresponding project asset yet
      description_override: s.description,
      status_tags: [],
      carry_forward: true,
      is_suggestion: true,
      suggestion_dismissed: false,
      suggestion_rationale: s.justification,
      effective_description: s.description,
    }));
    
    const { data, error } = await supabase
      .from('scene_asset_instances')
      .insert(instancesToCreate)
      .select();
    
    if (error) {
      console.error('[SceneAssets] Save suggestions error:', error);
      return res.status(500).json({ error: 'Failed to save suggestions' });
    }
    
    res.json({ count: data.length, suggestions: data });
  } catch (error) {
    console.error('[SceneAssets] Save suggestions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

Wait, this won't work because `project_asset_id` is NOT NULL and has a FK constraint. 

**Better approach**: Create a separate `scene_asset_suggestions` table:

```sql
-- Migration 019: Scene Asset Suggestions (separate table)
CREATE TABLE scene_asset_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id UUID NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('character', 'prop', 'location')),
  description TEXT NOT NULL,
  justification TEXT,
  dismissed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(scene_id, name) -- Prevent duplicate suggestions
);

CREATE INDEX idx_suggestions_scene ON scene_asset_suggestions(scene_id) WHERE dismissed = FALSE;

-- RLS policies (same pattern as scene_asset_instances)
ALTER TABLE scene_asset_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own suggestions" ON scene_asset_suggestions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM scenes s
      JOIN branches b ON b.id = s.branch_id
      JOIN projects p ON p.id = b.project_id
      WHERE s.id = scene_asset_suggestions.scene_id
      AND p.user_id = auth.uid()
    )
  );

-- Similar policies for INSERT, UPDATE, DELETE
```

1. **Backend routes for suggestions** (sceneAssets.ts)

```typescript
/**
 * POST /api/projects/:projectId/scenes/:sceneId/suggestions
 * Save AI-suggested assets
 */
router.post('/:projectId/scenes/:sceneId/suggestions', async (req, res) => {
  const { suggestions } = req.body; // Array of { name, asset_type, description, justification }
  
  // Validate and save to scene_asset_suggestions table
  // ...
});

/**
 * GET /api/projects/:projectId/scenes/:sceneId/suggestions
 * Get active suggestions (dismissed = false)
 */
router.get('/:projectId/scenes/:sceneId/suggestions', async (req, res) => {
  // Query suggestions table
  // ...
});

/**
 * DELETE /api/projects/:projectId/scenes/:sceneId/suggestions/:suggestionId
 * Dismiss/delete a suggestion
 */
router.delete('/:projectId/scenes/:sceneId/suggestions/:suggestionId', async (req, res) => {
  // Set dismissed = true or hard delete
  // ...
});
```

1. **Frontend service methods** (sceneAssetService.ts)

```typescript
async saveSuggestions(projectId: string, sceneId: string, suggestions: Array<{
  name: string;
  asset_type: string;
  description: string;
  justification: string;
}>): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const response = await fetch(
    `/api/projects/${projectId}/scenes/${sceneId}/suggestions`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ suggestions }),
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to save suggestions');
  }
}

async loadSuggestions(projectId: string, sceneId: string): Promise<SceneAssetSuggestion[]> {
  // GET /api/projects/:projectId/scenes/:sceneId/suggestions
  // ...
}

async dismissSuggestion(projectId: string, sceneId: string, suggestionId: string): Promise<void> {
  // DELETE /api/projects/:projectId/scenes/:sceneId/suggestions/:suggestionId
  // ...
}
```

1. **Frontend: Load suggestions on mount** (Stage8VisualDefinition.tsx)

```typescript
// Add query for suggestions
const { data: suggestions } = useQuery({
  queryKey: ['scene-suggestions', projectId, sceneId],
  queryFn: () => sceneAssetService.loadSuggestions(projectId, sceneId),
  enabled: !!projectId && !!sceneId,
});

// Use suggestions instead of local state
// Pass to SceneAssetListPanel as before

// When detecting assets, save suggestions to DB:
async function handleDetectAndPopulateAssets() {
  setIsDetecting(true);
  try {
    const relevance = await sceneAssetService.detectRelevantAssets(projectId, sceneId);
    
    // Create instances for relevant_assets
    for (const ra of relevance.relevant_assets) {
      await sceneAssetService.createSceneAsset(projectId, {
        sceneId,
        projectAssetId: ra.project_asset_id,
        // ...
      });
    }
    
    // Save new_assets_required as suggestions
    if (relevance.new_assets_required?.length > 0) {
      await sceneAssetService.saveSuggestions(projectId, sceneId, relevance.new_assets_required);
    }
    
    // Invalidate both queries
    await queryClient.invalidateQueries(['scene-assets', projectId, sceneId]);
    await queryClient.invalidateQueries(['scene-suggestions', projectId, sceneId]);
    
    toast.success(`Detected ${relevance.relevant_assets.length} assets`);
  } catch (error) {
    toast.error(`Detection failed: ${error.message}`);
  } finally {
    setIsDetecting(false);
  }
}
```

1. **Frontend: Add dismiss handler** (SceneAssetListPanel.tsx)

```typescript
const handleIgnoreSuggestion = async (suggestionId: string) => {
  try {
    await sceneAssetService.dismissSuggestion(projectId, sceneId, suggestionId);
    await queryClient.invalidateQueries(['scene-suggestions', projectId, sceneId]);
    toast.success('Suggestion dismissed');
  } catch (error) {
    toast.error('Failed to dismiss suggestion');
  }
};
```

**Testing**:

- Run asset detection → Verify suggestions saved to DB
- Navigate away and back → Verify suggestions persist
- Dismiss a suggestion → Verify it doesn't reappear
- Refresh page → Verify suggestions loaded from DB
- Check Supabase dashboard → Verify rows in `scene_asset_suggestions`

---

## Issue 2a: Status Tags Wiped When Locking Asset

### Problem Analysis

**User report**: "When I add status tags (e.g., 'muddy', 'bloody') and then click 'Lock Asset', all my tags disappear and only 'locked' remains."

**Root cause** (from code inspection):

In `[src/components/pipeline/Stage8/VisualStateEditorPanel.tsx](src/components/pipeline/Stage8/VisualStateEditorPanel.tsx)` around line 172:

```typescript
const handleLock = async () => {
  if (!selectedAsset) return;
  try {
    await onUpdateAsset(selectedAsset.id, {
      statusTags: [...(selectedAsset.status_tags ?? []), 'locked'], // This SHOULD work
      modificationReason: 'Asset locked',
    });
    toast.success('Asset locked');
  } catch (error) {
    toast.error('Failed to lock asset');
  }
};
```

This code looks correct - it should preserve existing tags and add 'locked'. But user reports tags are wiped. Possible issues:

1. `**selectedAsset.status_tags` is stale** - not updated after previous edits
2. **Backend overwrites tags** - update endpoint may not merge arrays correctly
3. **UI doesn't reflect backend state** - query doesn't refetch after update

### Solution

**Files to modify**:

- `[src/components/pipeline/Stage8/VisualStateEditorPanel.tsx](src/components/pipeline/Stage8/VisualStateEditorPanel.tsx)` — Fix lock logic
- `[backend/src/routes/sceneAssets.ts](backend/src/routes/sceneAssets.ts)` — Verify update logic

**Implementation steps**:

1. **Verify backend update preserves tags** (backend/src/routes/sceneAssets.ts, around line 488)

Check the PUT endpoint:

```typescript
router.put('/:projectId/scenes/:sceneId/assets/:instanceId', async (req, res) => {
  // ... validation ...
  
  const updates = validation.data; // This is the UpdateSceneAssetInstanceRequest
  
  // Update instance
  const { data: updatedInstance, error: updateError } = await supabase
    .from('scene_asset_instances')
    .update({
      ...updates, // THIS IS THE ISSUE - may overwrite all fields
      effective_description: effectiveDescription,
    })
    .eq('id', instanceId)
    .select(`
      *,
      project_asset:project_assets(
        id, name, asset_type, description, image_key_url
      )
    `)
    .single();
  
  // ...
});
```

The issue: If the frontend only sends `{ statusTags: ['locked'] }`, the backend will overwrite with ONLY that array, losing previous tags.

**Fix**: Frontend must send the FULL array, not partial updates. But the code already does this with `[...selectedAsset.status_tags, 'locked']`.

**Real issue**: `selectedAsset` is stale because the StatusTagsEditor updates tags via a separate call, and `selectedAsset` in the parent component doesn't refresh.

1. **Fix: Use local state for current tags** (VisualStateEditorPanel.tsx)

Instead of reading from `selectedAsset` prop (which is stale), maintain local state that syncs with StatusTagsEditor:

```typescript
export function VisualStateEditorPanel({ ... }: Props) {
  const [editedDescription, setEditedDescription] = useState('');
  const [statusTags, setStatusTags] = useState<string[]>([]); // Local state
  const [carryForward, setCarryForward] = useState(true);
  
  // Sync local state when selectedAsset changes
  useEffect(() => {
    if (selectedAsset) {
      setEditedDescription(selectedAsset.effective_description ?? '');
      setStatusTags(selectedAsset.status_tags ?? []); // Sync from prop
      setCarryForward(selectedAsset.carry_forward ?? true);
    }
  }, [selectedAsset]);
  
  // Update tags from StatusTagsEditor (already exists)
  const handleTagsChange = async (newTags: string[]) => {
    setStatusTags(newTags); // Update local state
    
    // Persist to backend
    if (selectedAsset) {
      await onUpdateAsset(selectedAsset.id, {
        statusTags: newTags,
        modificationReason: 'Status tags updated',
      });
    }
  };
  
  // Lock handler uses local state
  const handleLock = async () => {
    if (!selectedAsset) return;
    
    // Check if already locked
    if (statusTags.includes('locked')) {
      toast.info('Asset is already locked');
      return;
    }
    
    const newTags = [...statusTags, 'locked']; // Use local state, not prop
    
    try {
      await onUpdateAsset(selectedAsset.id, {
        statusTags: newTags,
        modificationReason: 'Asset locked',
      });
      
      setStatusTags(newTags); // Update local state immediately
      toast.success('Asset locked');
    } catch (error) {
      console.error('[VisualStateEditor] Lock error:', error);
      toast.error('Failed to lock asset');
    }
  };
  
  // Pass local state to StatusTagsEditor
  return (
    // ...
    <StatusTagsEditor
      tags={statusTags} // Use local state
      onChange={handleTagsChange} // Update both local and backend
      carryForward={carryForward}
      onCarryForwardChange={handleCarryForwardChange}
      disabled={statusTags.includes('locked')} // Disable if locked
    />
    // ...
  );
}
```

1. **Verify update mutation invalidates cache** (Stage8VisualDefinition.tsx)

```typescript
const updateMutation = useMutation({
  mutationFn: async ({ instanceId, updates }: { instanceId: string; updates: UpdateSceneAssetInstanceRequest }) => {
    return sceneAssetService.updateSceneAsset(projectId, sceneId, instanceId, updates);
  },
  onSuccess: () => {
    queryClient.invalidateQueries(['scene-assets', projectId, sceneId]); // This should be here
    toast.success('Asset updated');
  },
  onError: (error: any) => {
    toast.error(`Update failed: ${error.message}`);
  },
});
```

1. **Optional: Separate "locked" from status tags**

Consider removing 'locked' as a tag and using a separate `locked` boolean field in `scene_asset_instances`. Status tags should describe visual conditions, not asset workflow state.

**Migration** (optional, can defer):

```sql
ALTER TABLE scene_asset_instances ADD COLUMN locked BOOLEAN DEFAULT FALSE;
```

Then update UI to use `instance.locked` instead of `statusTags.includes('locked')`.

**Testing**:

- Add tags 'muddy', 'bloody' to an asset
- Click "Lock Asset" → Verify tags remain: ['muddy', 'bloody', 'locked']
- Refresh page → Verify tags persist
- Unlock and relock → Verify no duplicate 'locked' tags
- Check backend response → Verify `status_tags` array is correct

---

## Issue 2b: No Keyboard Navigation in Tag Dropdown

### Problem Analysis

**User report**: "When typing in the status tag input and suggestions appear, I want to use arrow keys to navigate the dropdown and Enter to select."

**Current behavior**: Dropdown shows but requires mouse click to select.

### Solution

**Files to modify**:

- `[src/components/pipeline/Stage8/StatusTagsEditor.tsx](src/components/pipeline/Stage8/StatusTagsEditor.tsx)` — Add keyboard handlers

**Implementation steps**:

1. **Add keyboard navigation state** (StatusTagsEditor.tsx)

```typescript
const [inputValue, setInputValue] = useState('');
const [suggestions, setSuggestions] = useState<string[]>([]);
const [showSuggestions, setShowSuggestions] = useState(false);
const [selectedIndex, setSelectedIndex] = useState(-1); // NEW: Track selected suggestion

// Reset selectedIndex when suggestions change
useEffect(() => {
  setSelectedIndex(-1);
}, [suggestions]);
```

1. **Add keyboard event handler** (StatusTagsEditor.tsx)

```typescript
const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (!showSuggestions || suggestions.length === 0) {
    // No suggestions showing - only handle Enter
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
    return;
  }
  
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      setSelectedIndex(prev => 
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
      break;
      
    case 'ArrowUp':
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
      break;
      
    case 'Enter':
      e.preventDefault();
      if (selectedIndex >= 0) {
        // Select highlighted suggestion
        handleAddTag(suggestions[selectedIndex]);
      } else {
        // Add custom tag from input
        handleAddTag();
      }
      break;
      
    case 'Tab':
      // Tab selects first suggestion (if any)
      if (selectedIndex < 0 && suggestions.length > 0) {
        e.preventDefault();
        handleAddTag(suggestions[0]);
      }
      break;
      
    case 'Escape':
      e.preventDefault();
      setShowSuggestions(false);
      setSelectedIndex(-1);
      break;
  }
};
```

1. **Update Input component** (StatusTagsEditor.tsx)

```typescript
<Input
  value={inputValue}
  onChange={e => handleInputChange(e.target.value)}
  onKeyDown={handleKeyDown} // Add keyboard handler
  onFocus={() => {
    if (inputValue.trim()) setShowSuggestions(true);
  }}
  onBlur={() => {
    setTimeout(() => setShowSuggestions(false), 200);
  }}
  placeholder="Add tag (e.g. muddy, torn, bloody)"
/>
```

1. **Highlight selected suggestion** (StatusTagsEditor.tsx)

```typescript
{showSuggestions && suggestions.length > 0 && (
  <div className="absolute z-10 w-full mt-1 rounded-lg border border-border bg-card shadow-lg">
    <div className="p-1 space-y-0.5 max-h-48 overflow-y-auto">
      {suggestions.map((suggestion, idx) => (
        <button
          key={suggestion}
          type="button"
          className={cn(
            "w-full text-left px-3 py-1.5 text-sm rounded transition-colors",
            idx === selectedIndex
              ? "bg-primary text-primary-foreground" // Highlight selected
              : "hover:bg-muted"
          )}
          onClick={() => {
            handleAddTag(suggestion);
          }}
          onMouseEnter={() => setSelectedIndex(idx)} // Update on hover
        >
          {suggestion}
        </button>
      ))}
    </div>
  </div>
)}
```

1. **Add accessibility attributes** (StatusTagsEditor.tsx)

```typescript
<Input
  value={inputValue}
  onChange={e => handleInputChange(e.target.value)}
  onKeyDown={handleKeyDown}
  role="combobox"
  aria-expanded={showSuggestions}
  aria-controls="tag-suggestions-list"
  aria-activedescendant={
    selectedIndex >= 0 ? `tag-suggestion-${selectedIndex}` : undefined
  }
  placeholder="Add tag (e.g. muddy, torn, bloody)"
/>

{showSuggestions && suggestions.length > 0 && (
  <div id="tag-suggestions-list" role="listbox" className="...">
    {suggestions.map((suggestion, idx) => (
      <button
        key={suggestion}
        id={`tag-suggestion-${idx}`}
        role="option"
        aria-selected={idx === selectedIndex}
        // ...
      />
    ))}
  </div>
)}
```

**Testing**:

- Type "mu" in tag input → Dropdown shows "muddy"
- Press ArrowDown → "muddy" highlights
- Press Enter → "muddy" tag added
- Type "b" → Multiple suggestions appear
- Press ArrowDown twice → 2nd suggestion highlights
- Press Enter → 2nd suggestion added
- Type "custom" (no suggestions) → Press Enter → Custom tag added
- Press Tab on first suggestion → First suggestion added
- Press Escape → Dropdown closes

---

## Issue 3a/3b: No Access to Project Assets in Drawer

### Problem Analysis

**User report**: "The Asset Drawer only shows global assets. I can't access my project assets (from Stage 5) unless the AI extractor suggests them. I want project assets shown by default with a button to browse global library."

**Current behavior** (from code):

- `[AssetDrawer.tsx](src/components/pipeline/AssetDrawer.tsx)` calls `assetService.listAssets()` which fetches global assets only
- No filter for project assets (those in `project_assets` table for current project)

### Solution

**Files to modify**:

- `[src/components/pipeline/AssetDrawer.tsx](src/components/pipeline/AssetDrawer.tsx)` — Add tab/toggle for project vs global
- `[src/lib/services/projectAssetService.ts](src/lib/services/projectAssetService.ts)` — May already have listAssets method
- `[src/components/pipeline/Stage8VisualDefinition.tsx](src/components/pipeline/Stage8VisualDefinition.tsx)` — Pass context

**Implementation steps**:

1. **Add source toggle to AssetDrawer** (AssetDrawer.tsx, around line 80)

```typescript
type AssetSource = 'project' | 'global';

export function AssetDrawer({ projectId, sceneId, isOpen, onClose, onSceneInstanceCreated }: Props) {
  const [source, setSource] = useState<AssetSource>('project'); // Default to project
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<AssetType | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Query for project assets
  const { data: projectAssets } = useQuery({
    queryKey: ['project-assets', projectId],
    queryFn: () => projectAssetService.listAssets(projectId),
    enabled: isOpen && source === 'project',
  });
  
  // Query for global assets (existing)
  const { data: globalAssets } = useQuery({
    queryKey: ['global-assets'],
    queryFn: () => assetService.listAssets(),
    enabled: isOpen && source === 'global',
  });
  
  // Use appropriate asset list
  const assets = source === 'project' ? (projectAssets ?? []) : (globalAssets ?? []);
  
  // ... rest of component
}
```

1. **Add source toggle UI** (AssetDrawer.tsx, in Sheet header)

```typescript
<SheetHeader>
  <SheetTitle className="flex items-center justify-between">
    <span>Asset Library</span>
    <div className="flex items-center gap-2 text-sm font-normal">
      {/* Source Toggle */}
      <div className="flex items-center rounded-lg border border-border p-1 bg-muted/50">
        <button
          type="button"
          className={cn(
            "px-3 py-1 rounded transition-colors text-xs",
            source === 'project'
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => setSource('project')}
        >
          Project Assets
        </button>
        <button
          type="button"
          className={cn(
            "px-3 py-1 rounded transition-colors text-xs",
            source === 'global'
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => setSource('global')}
        >
          Global Library
        </button>
      </div>
    </div>
  </SheetTitle>
  <SheetDescription>
    {source === 'project' 
      ? 'Assets from Stage 5 (Master Assets for this project)'
      : 'Curated global asset library (shared across all projects)'
    }
  </SheetDescription>
</SheetHeader>
```

1. **Update clone/add behavior for project assets** (AssetDrawer.tsx, around line 200)

When source is 'project', asset is already a `ProjectAsset` so no cloning needed:

```typescript
const handleSelectAsset = async (asset: Asset | ProjectAsset) => {
  if (source === 'project') {
    // Asset is already a ProjectAsset - create scene instance directly
    if (sceneId && onSceneInstanceCreated) {
      try {
        const instance = await sceneAssetService.createSceneAsset(projectId, {
          sceneId,
          projectAssetId: asset.id,
          descriptionOverride: null,
          statusTags: [],
          carryForward: true,
        });
        
        onSceneInstanceCreated(instance);
        toast.success(`Added ${asset.name} to scene`);
        onClose();
      } catch (error) {
        toast.error(`Failed to add asset: ${error.message}`);
      }
    } else {
      // Just cloning to project assets (not in Stage 8 context)
      toast.info('Asset already in project');
      onClose();
    }
  } else {
    // Asset is from global library - existing clone logic
    handleCloneAsset(asset);
  }
};
```

1. **Add empty state for project assets** (AssetDrawer.tsx)

```typescript
{assets.length === 0 && (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    {source === 'project' ? (
      <>
        <Frown className="w-16 h-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Project Assets Yet</h3>
        <p className="text-sm text-muted-foreground max-w-sm mb-4">
          Project assets are created in Stage 5 (Master Assets). Switch to Global Library to browse and clone assets.
        </p>
        <Button variant="outline" onClick={() => setSource('global')}>
          Browse Global Library
        </Button>
      </>
    ) : (
      <>
        <Frown className="w-16 h-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Assets Found</h3>
        <p className="text-sm text-muted-foreground">
          Try adjusting your search or filters.
        </p>
      </>
    )}
  </div>
)}
```

1. **Update filter logic** (AssetDrawer.tsx)

Ensure filters work for both project and global assets:

```typescript
const filteredAssets = useMemo(() => {
  let filtered = [...assets];
  
  if (searchQuery) {
    filtered = filtered.filter(a => 
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }
  
  if (filterType !== 'all') {
    filtered = filtered.filter(a => a.asset_type === filterType);
  }
  
  return filtered;
}, [assets, searchQuery, filterType]);
```

**Testing**:

- Open Asset Drawer from Stage 8 → Defaults to "Project Assets"
- Verify project assets from Stage 5 appear
- Click "Global Library" → Global assets appear
- Select project asset → Creates scene instance (no cloning)
- Select global asset → Clones to project, then creates scene instance
- Search and filter work in both modes
- Empty state shows appropriate message for each mode

---

## Issue 5: Missing Scene Slug & Number in Stage 8 UI

### Problem Analysis

**User report**: "I want to see the scene slug and scene number at the top of Stage 8 so I know which scene I'm editing."

**Current state**: Stage 8 shows continuity header but no scene identifier.

### Solution

**Files to modify**:

- `[src/components/pipeline/Stage8VisualDefinition.tsx](src/components/pipeline/Stage8VisualDefinition.tsx)` — Add scene metadata display

**Implementation steps**:

1. **Fetch scene metadata** (Stage8VisualDefinition.tsx, use existing query)

Scene data is already fetched for continuity header (around line 120):

```typescript
const { data: scenes } = useQuery({
  queryKey: ['scenes', projectId],
  queryFn: () => sceneService.fetchScenes(projectId),
  enabled: !!projectId,
});

const currentScene = scenes?.find(s => s.id === sceneId);
```

1. **Add scene header above continuity** (Stage8VisualDefinition.tsx)

```typescript
return (
  <div className="flex-1 flex flex-col overflow-hidden">
    {/* Scene Identifier Header */}
    {currentScene && (
      <div className="px-6 py-3 border-b border-border/50 bg-card/30 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="text-sm font-mono">
              Scene {currentScene.sceneNumber}
            </Badge>
            <h2 className="text-lg font-semibold">
              {currentScene.slug}
            </h2>
          </div>
          
          {/* Optional: Scene status badge */}
          <Badge 
            variant={currentScene.status === 'shot_list_ready' ? 'default' : 'outline'}
            className="text-xs"
          >
            {currentScene.status.replace(/_/g, ' ')}
          </Badge>
        </div>
      </div>
    )}
    
    {/* Continuity Header / Rearview Mirror */}
    {priorScene && (
      <RearviewMirror
        priorSceneEndState={priorScene.endStateSummary}
        priorEndFrame={priorScene.endFrameThumbnail}
        priorSceneName={`Scene ${priorScene.sceneNumber}`}
        mode={priorScene.endFrameThumbnail ? 'visual' : 'text'}
      />
    )}
    
    {/* Rest of Stage 8 UI */}
    {/* ... */}
  </div>
);
```

1. **Alternative: Add to page title/breadcrumb** (if ProjectView has breadcrumbs)

If there's a breadcrumb component in ProjectView, update it to show:

```
Project > Scene {sceneNumber}: {slug} > Stage 8: Visual Definition
```

**Testing**:

- Open Stage 8 for Scene 1 "INT. MANSION - NIGHT" → Header shows "Scene 1 | INT. MANSION - NIGHT"
- Navigate to Scene 2 → Header updates
- Verify styling matches other headers
- Check mobile responsiveness

---

## Summary & Checklist

### Implementation Order (by priority)

1. **Issue 1a** (Stage redirect) — 🔴 Critical, blocks workflow
2. **Issue 1b** (Image refresh) — 🔴 Critical, core feature broken
3. **Issue 2a** (Tags wiped) — 🔴 Critical, data loss
4. **Issue 3a/3b** (Project assets) — 🟡 Important, workflow improvement
5. **Issue 1c** (Suggestions persist) — 🟡 Important, prevents data loss
6. **Issue 2b** (Keyboard nav) — 🟢 Nice to have, UX polish
7. **Issue 5** (Scene header) — 🟢 Nice to have, orientation

### Deliverables

**Database Migrations**:

- Migration 019: `scene_asset_suggestions` table

**Backend Routes**:

- GET/POST/DELETE `/suggestions` endpoints
- Verify PUT `/assets/:instanceId` preserves tags

**Frontend Services**:

- `sceneAssetService`: `saveSuggestions()`, `loadSuggestions()`, `dismissSuggestion()`

**Frontend Components**:

- `ProjectView.tsx`: Fix stage persistence with sceneId in URL
- `Stage8VisualDefinition.tsx`: Add queryClient invalidation after image generation
- `VisualStateEditorPanel.tsx`: Fix tag lock with local state
- `StatusTagsEditor.tsx`: Add keyboard navigation
- `AssetDrawer.tsx`: Add project assets tab with toggle
- `Stage8VisualDefinition.tsx`: Add scene header

### Testing Strategy

**Automated** (Jest/Playwright):

- Backend: Tag preservation on update
- Backend: Suggestions CRUD
- Frontend: Asset drawer source switching

**Manual**:

- Complete workflow: Detect assets → Edit → Add tags → Generate images → Lock → Proceed
- Test with slow network (DevTools throttling)
- Test with multiple scenes
- Test refresh at each step

### Rollback Plan

If major issues arise:

1. Revert migrations (019) via `down.sql`
2. Revert component changes via git
3. Clear localStorage keys: `project_*_stage`, `project_*_sceneId`

---

## References

**Documentation**:

- [5.1 Dev Plan](._docs/5.1-dev-plan.md) — Scene asset instances
- [5.2 Dev Plan](._docs/5.2-dev-plan-v1.md) — Stage 8 UI
- [5.3 Dev Plan](._docs/5.3-dev-plan.md) — Status tags
- [Project Overview](._docs/project-overview.md) — PRD for Stage 8

**Key Files**:

- Backend routes: `backend/src/routes/sceneAssets.ts`, `backend/src/routes/stageStates.ts`
- Frontend main: `src/components/pipeline/Stage8VisualDefinition.tsx`
- Frontend panels: `src/components/pipeline/Stage8/SceneAssetListPanel.tsx`, `VisualStateEditorPanel.tsx`
- Services: `src/lib/services/sceneAssetService.ts`, `src/lib/services/projectAssetService.ts`

---

**END OF PLAN**