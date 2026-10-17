
## 1.The "New suggested" scene assets disappear if you go back to the shot list & then  return  to stage 8; and there is no way to bring them back.

## Issue Suggested Assets Disappear on Navigation

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