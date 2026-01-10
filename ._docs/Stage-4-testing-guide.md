# Stage 4 Master Script - Testing Guide

## 🚀 Quick Start

### Prerequisites
1. Database migration applied: `003_add_scenes_table.sql`
2. Prompt templates seeded (includes `master_script_generation`)
3. Stages 1-3 completed for a test project

### First Test Run

**Step 1: Navigate to Stage 4**
```
1. Open existing project (or create new)
2. Complete Stage 1 (Input Mode)
3. Complete Stage 2 (Treatment)
4. Complete Stage 3 (Beat Sheet)
5. Click "Next" to Stage 4
```

**Step 2: Generate Initial Script**
```
1. Should see "Ready to Generate Your Script" screen
2. Click "Generate Master Script" button
3. Wait for LLM generation (15-30 seconds)
4. Script should appear with syntax highlighting
5. Beat panel should show on right side
```

**Expected Result:**
- Script formatted with INT./EXT. scene headings
- Character names in ALL CAPS
- Rich visual descriptions
- Beat panel shows all beats from Stage 3
- Scene count displayed in header

## 🧪 Feature Testing

### 1. Syntax Highlighting

**Test:**
- Type in the editor
- Add scene heading: `INT. COFFEE SHOP - DAY`
- Add character name: `JOHN`
- Add parenthetical: `(nervously)`

**Expected:**
- Scene heading → Blue/primary color, bold
- Character name → Accent color, semibold
- Parenthetical → Gray, italic
- Highlighting updates in real-time

### 2. Beat Alignment Panel

**Test:**
- Click on Beat 1 in the panel
- Click on Beat 5 in the panel
- Scroll the script manually

**Expected:**
- Clicking beat scrolls script to that section
- Active beat has gold border
- Scrolling script updates active beat highlight
- Panel can be collapsed/expanded

### 3. Highlight-and-Rewrite

**Test:**
```
1. Select text in the script (e.g., a scene description)
2. Click "Edit Selection" button
3. Enter guidance: "Make this more atmospheric with fog and dim lighting"
4. Click "Regenerate Section"
5. Wait for LLM response
```

**Expected:**
- Button appears when text selected
- Modal opens with selected text preview
- Guidance requires 10+ characters
- Selected text replaced with new version
- Auto-saves after regeneration

### 4. Full Regeneration

**Test:**
```
1. Click "Regenerate" button in header
2. Enter guidance: "Add more conflict and tension throughout"
3. Click "Regenerate"
4. Wait for full script regeneration
```

**Expected:**
- Modal requires 10+ characters
- Entire script regenerated
- Scenes re-extracted
- Beat panel remains unchanged
- Character counter shows progress

### 5. Scene Extraction

**Test:**
```
1. Generate or edit script
2. Ensure multiple scenes with INT./EXT. headings
3. Check stage content in browser dev tools
```

**Expected:**
- `stageContent.scenes` array populated
- Each scene has: id, sceneNumber, slug, heading, content
- Scene count matches INT./EXT. headings in script
- Slug format: "int-coffee-shop-day"

### 6. Approve Script

**Test:**
```
1. Click "Approve Script" button
2. Wait for processing
3. Check success toast
4. Verify navigation to Stage 5
```

**Expected:**
- Toast: "Master Script approved! X scenes extracted..."
- Scenes saved to database (check `scenes` table)
- Stage 4 status → 'locked'
- Navigates to Stage 5 (or shows "coming soon")

### 7. Auto-Save

**Test:**
```
1. Edit script text
2. Wait 1 second
3. Check header for "Saving..." → "Saved"
4. Refresh page
5. Verify changes persisted
```

**Expected:**
- Debounced save after 1 second
- Header shows save status
- Changes persist across refreshes
- No data loss

### 8. Error Handling

**Test scenarios:**

**A. Empty Beat Sheet**
```
1. Try to generate with no beats
Expected: Error toast, generation blocked
```

**B. Network Failure**
```
1. Disconnect network
2. Try to generate
Expected: Error toast with retry option
```

**C. Invalid LLM Response**
```
(Simulated by backend)
Expected: Fallback parsing, script still displayed
```

**D. Empty Script Approval**
```
1. Clear all script text
2. Try to approve
Expected: Error toast "Cannot approve an empty script"
```

## 📊 Performance Testing

### Large Script Test

**Setup:**
```
1. Create beat sheet with 25+ beats
2. Generate script
3. Should produce 10+ scenes, 1000+ lines
```

**Metrics to check:**
- Generation time: < 60 seconds
- Syntax highlighting: No lag while typing
- Scroll performance: Smooth at 60fps
- Beat navigation: < 100ms to scroll
- Auto-save: No UI blocking

### Rapid Interaction Test

**Test:**
```
1. Click "Generate" → immediately click "Regenerate"
2. Select text → click "Edit Selection" → cancel → repeat
3. Rapidly click different beats in panel
4. Type quickly in editor
```

**Expected:**
- Buttons disabled during operations
- No race conditions
- No duplicate API calls
- UI remains responsive

## 🐛 Known Edge Cases

### 1. Script with No Scene Headings

**Scenario:** LLM returns script without INT./EXT.

**Behavior:**
- `extractScenes()` returns empty array
- Script still displays
- Warning logged to console
- User can manually add headings

### 2. Very Long Scene

**Scenario:** Single scene > 500 lines

**Behavior:**
- Syntax highlighting may slow down
- Consider chunking for very large scripts
- Beat navigation less precise

### 3. Rapid Beat Clicking

**Scenario:** User clicks multiple beats quickly

**Behavior:**
- Scroll position may jump
- Last click wins
- No errors thrown

### 4. Concurrent Edits

**Scenario:** User types while regeneration in progress

**Behavior:**
- Textarea disabled during generation
- Edits blocked until complete
- No data corruption

## 🔍 Database Verification

### Check Stage State

```sql
SELECT 
  id, 
  stage_number, 
  status,
  jsonb_pretty(content) as content
FROM stage_states
WHERE stage_number = 4
ORDER BY created_at DESC
LIMIT 1;
```

**Expected fields in content:**
- `formattedScript` (string)
- `scenes` (array)
- `syncStatus` ('synced')
- `beatSheetSource` (object with beats array)
- `langsmithTraceId` (string)

### Check Scenes Table

```sql
SELECT 
  id,
  scene_number,
  slug,
  status,
  LENGTH(script_excerpt) as content_length,
  created_at
FROM scenes
WHERE branch_id = (
  SELECT active_branch_id 
  FROM projects 
  WHERE id = 'YOUR_PROJECT_ID'
)
ORDER BY scene_number;
```

**Expected:**
- One row per scene
- Sequential scene_numbers (1, 2, 3...)
- Unique slugs
- Status = 'draft'
- script_excerpt > 0 length

## 🎯 Acceptance Criteria

### ✅ Must Pass

- [ ] Script generates from beat sheet
- [ ] Syntax highlighting works for INT./EXT./CHARACTER
- [ ] Beat panel displays and scrolls to sections
- [ ] Highlight-and-rewrite regenerates selected text
- [ ] Full regeneration requires guidance
- [ ] Scenes extracted correctly
- [ ] Approve button saves scenes to database
- [ ] Stage locks after approval
- [ ] Navigation to Stage 5 works
- [ ] Auto-save persists changes

### ✅ Should Pass

- [ ] Beat panel collapsible
- [ ] Loading states during generation
- [ ] Error toasts for failures
- [ ] Character counters in modals
- [ ] Disabled states during operations
- [ ] Smooth animations
- [ ] Mobile responsive (beat panel collapses)

### ✅ Nice to Have

- [ ] Keyboard shortcuts (Cmd+S, Cmd+G)
- [ ] Scene count in header
- [ ] Estimated page count
- [ ] Undo/redo for edits
- [ ] Export script as PDF

## 🚨 Critical Bugs to Watch For

1. **Data Loss**: Script disappears after refresh
2. **Race Condition**: Multiple generations triggered
3. **Parsing Failure**: LLM response not handled
4. **Scene Mismatch**: Scenes table doesn't match script
5. **Lock Failure**: Stage 4 not locked after approval
6. **Navigation Break**: Can't proceed to Stage 5
7. **Auth Error**: API calls fail silently
8. **RLS Violation**: User sees other users' scenes

## 📝 Test Report Template

```markdown
## Stage 4 Test Report

**Date:** [Date]
**Tester:** [Name]
**Environment:** [Dev/Staging/Prod]

### Test Results

| Feature | Status | Notes |
|---------|--------|-------|
| Script Generation | ✅/❌ | |
| Syntax Highlighting | ✅/❌ | |
| Beat Panel | ✅/❌ | |
| Highlight-Rewrite | ✅/❌ | |
| Full Regeneration | ✅/❌ | |
| Scene Extraction | ✅/❌ | |
| Approve Flow | ✅/❌ | |
| Auto-Save | ✅/❌ | |
| Error Handling | ✅/❌ | |
| Performance | ✅/❌ | |

### Bugs Found

1. [Bug description]
   - Steps to reproduce
   - Expected vs actual
   - Severity: Critical/High/Medium/Low

### Performance Metrics

- Script generation time: [X seconds]
- Syntax highlighting lag: [Yes/No]
- Beat navigation speed: [Fast/Slow]
- Auto-save delay: [X seconds]

### Recommendations

[Any suggestions for improvements]
```

## 🎬 Demo Script

For showcasing Stage 4:

```
1. "Let me show you Stage 4, our Master Script Generator"
2. "We've completed the beat sheet with 20 story beats"
3. "Click Generate - watch the AI create a full screenplay"
4. "Notice the syntax highlighting - scene headings in blue, character names in accent color"
5. "The beat panel on the right shows our structure"
6. "Click a beat - it scrolls to that section"
7. "Let me highlight this description and ask for changes"
8. "Type: 'Add more tension and darker lighting'"
9. "The AI rewrites just that section"
10. "When satisfied, click Approve Script"
11. "It extracts scenes and prepares for Phase B production"
```

---

**Ready to test? Start with the Quick Start section and work through each feature!** 🚀

