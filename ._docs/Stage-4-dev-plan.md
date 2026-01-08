Stage 4: Master Script Generator Implementation
Architecture Overview
flowchart TD
    Stage3[Stage 3: Beat Sheet] -->|beats data| ScriptGen[Script Generation]
    ScriptGen -->|LLM call| PromptTemplate[master_script_generation template]
    PromptTemplate -->|formatted screenplay| ScriptEditor[Script Editor UI]
    
    ScriptEditor -->|syntax highlighting| Display[Monospace Display]
    ScriptEditor -->|targeted edits| HighlightRewrite[Highlight & Rewrite Agent]
    
    Stage3 -->|read-only| BeatPanel[Beat Alignment Panel]
    BeatPanel <-->|bidirectional nav| ScriptEditor
    
    ScriptEditor -->|approve| SceneExtraction[Scene Extraction Logic]
    SceneExtraction -->|parsed scenes| Database[(scenes table)]
    Database -->|available for| PhaseB[Phase B: Stages 6-12]
Data Flow
Stage 3 → Stage 4:

Fetch locked Stage 3 state containing beats array
Extract: beat text, order, estimated screen time
Pass to LLM with project parameters
Stage 4 → Database:

Script stored in stage_states.content as formatted_script (string)
Scenes array stored as structured data (id, slug, heading, content)
On approval, scenes are written to dedicated scenes table for Phase B
Component Architecture
Main Component: Stage4MasterScript.tsx

Supporting Service: src/lib/services/scriptService.ts (new)

Backend Route: /api/llm/generate-from-template (already exists)

---

Part 1: Backend Service Layer
Create src/lib/services/scriptService.ts
Model after beatService.ts structure with these methods:

generateScript(beatSheet, projectParams)
Calls /api/llm/generate-from-template with master_script_generation template
Variables: beat_sheet_content, target_length_min/max, content_rating, genres, tonal_precision
Returns: { formattedScript, scenes, langsmithTraceId, promptTemplateVersion }
regenerateScript(beatSheet, projectParams, guidance)
Same as above but includes regeneration_guidance variable
Used for full script regeneration
regenerateSection(scriptContext, highlightedText, editRequest)
Targeted regeneration for highlighted sections
System prompt: "You are a screenplay editor. Rewrite only the highlighted section."
User prompt includes: before context, highlighted section, after context, user's edit request
Returns: replacement text for the highlighted section
extractScenes(formattedScript)
Client-side parser (regex-based or simple state machine)
Identifies scene boundaries by INT. or EXT. headers
Returns array: [{ id, slug, heading, content }]
Slug format: "INT. KITCHEN - DAY"
parseScriptResponse(content)
Handles LLM response parsing
Strips markdown code blocks if present
Validates screenplay format
Fallback handling for malformed responses
Expected Response Structure from LLM:

{
  formatted_script: string, // full screenplay text
  scenes: Array<{
    scene_number: number,
    heading: string, // "INT. KITCHEN - DAY"
    slug: string,
    content: string // full scene text including heading
  }>,
  estimated_page_count: number
}
---

Part 2: Frontend Component Rebuild
Main Component Structure
File: src/components/pipeline/Stage4MasterScript.tsx

State Management:

interface Stage4Content {
  formattedScript: string;
  scenes: Array<{
    id: string;
    slug: string;
    heading: string;
    content: string;
  }>;
  syncStatus: 'synced' | 'out_of_date_with_beats';
  beatSheetSource?: {
    beats: Beat[];
    stageId: string;
  };
  langsmithTraceId?: string;
  promptTemplateVersion?: string;
}
Component Layout:

┌─────────────────────────────────────────────────────┐
│ Header: Back | "Master Script" | Regenerate | Approve│
├─────────────────────────────┬───────────────────────┤
│                             │  Beat Alignment Panel │
│  Script Editor              │  ┌─────────────────┐  │
│  (monospace + highlighting) │  │ Beat 1: ...     │  │
│                             │  ├─────────────────┤  │
│  INT. KITCHEN - DAY         │  │ Beat 2: ...  ← │  │
│                             │  ├─────────────────┤  │
│  The kitchen is...          │  │ Beat 3: ...     │  │
│                             │  └─────────────────┘  │
│                             │                       │
└─────────────────────────────┴───────────────────────┘
Key Features to Implement
1. Initial Script Generation

On mount, check if Stage 4 content exists
If not, fetch Stage 3 beat sheet
Show "Generate Master Script" button with loading state
After generation, auto-save to database
2. Beat Alignment Panel (Right Sidebar)

Width: 320px, collapsible
Display all beats from Stage 3 as read-only cards
Highlight currently active beat based on scroll position
Click handler: scroll script editor to corresponding section
Visual indicator: gold border for active beat
3. Bidirectional Navigation Logic

// Beat → Script: On beat click, find corresponding scene heading
const scrollToBeat = (beatOrder: number) => {
  // Map beat order to script section using scene boundaries
  // Scroll textarea to that position
};

// Script → Beat: On script scroll, detect current section
const handleScroll = (scrollTop: number) => {
  // Calculate which beat corresponds to current view
  // Update highlighted beat in panel
};
4. Syntax Highlighting Implementation

Use a wrapper around <textarea> with a synchronized <pre> overlay for highlighting.

Pattern Matching:

Scene headings: /(INT\.|EXT\.).+/g → apply text-primary font-bold
Character names: /^[A-Z\s]+$/gm (line with only capitals) → apply text-accent
Parentheticals: /\([^)]+\)/g → apply text-muted-foreground italic
Action lines: default styling
Implementation approach:

Hidden textarea for input (absolute positioning, opacity-0)
Visible pre element with highlighted HTML
Synchronize scroll position between both
On change, update both elements
5. Highlight-and-Rewrite Agent

User flow:

User selects text in editor (track selection start/end)
Right-click or button appears: "Regenerate Selection"
Modal opens: "What would you like to change?"
Call scriptService.regenerateSection() with context
Replace selected text with LLM response
Mark as edited, trigger auto-save
6. Consistency Flag

Display yellow warning banner when:

Stage 3 beat sheet modified after Stage 4 generation
Check: Compare stage_states.updated_at timestamps
Button: "Retroactively Revise Script to Match Beat Sheet"
Action: Trigger full regeneration with updated beats
7. Full Regeneration Modal

Mandatory "Regeneration Guidance" box (min 10 chars):

Modal with textarea
Character counter
Disabled submit until >= 10 chars
On submit: call scriptService.regenerateScript()
Save guidance to stage_states.regeneration_guidance
8. Approve Master Script Button

Action sequence:

Validate script is not empty
Extract scenes using scriptService.extractScenes()
Save scenes array to Stage 4 content
Call backend endpoint to persist scenes to scenes table
Lock stage (status: 'locked')
Show success toast: "Master Script approved. X scenes extracted and ready for production."
Navigate to Stage 5
---

Part 3: Backend API Additions
Scene Persistence Endpoint
Route: PUT /api/projects/:projectId/scenes

Purpose: Persist extracted scenes to scenes table for Phase B

Request Body:

{
  scenes: Array<{
    sceneNumber: number,
    slug: string,
    scriptExcerpt: string
  }>
}
Backend Logic:

Get active branch for project
Delete existing scenes for branch (if any)
Insert new scenes with status 'draft'
Return scene IDs
Implementation location: backend/src/routes/projects.ts

---

Part 4: Database Schema Validation
Ensure scenes table exists with correct structure (from migration 001):

CREATE TABLE scenes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    scene_number INTEGER NOT NULL,
    slug TEXT NOT NULL,
    script_excerpt TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    end_state_summary TEXT,
    end_frame_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(branch_id, scene_number)
);
---

Part 5: UI Polish & Accessibility
Keyboard shortcuts:
Cmd/Ctrl + S: Force save
Cmd/Ctrl + G: Open regeneration modal
Cmd/Ctrl + E: Toggle edit mode
Loading states:
Skeleton loaders for beat panel while fetching Stage 3
Spinner overlay during script generation
Disabled states for all buttons during API calls
Error handling:
Toast notifications for API failures
Retry buttons on generation failures
Validation errors for empty fields
Responsive design:
Collapse beat panel on mobile
Floating action button for beat navigation on small screens
---

Testing Checklist
Data Flow:

[ ] Stage 3 beats correctly passed to Stage 4
[ ] Script generation uses actual beat content (not mock data)
[ ] Generated script matches prompt template output format
Features:

[ ] Beat panel displays all beats from Stage 3
[ ] Clicking beat scrolls to corresponding script section
[ ] Scrolling script highlights corresponding beat
[ ] Syntax highlighting renders correctly for INT/EXT/CHARACTER
[ ] Highlight-and-rewrite works for selected text
[ ] Full regeneration requires 10+ character guidance
Approval Flow:

[ ] Scene extraction correctly parses scene boundaries
[ ] Scenes saved to database with correct branch_id
[ ] Stage locked after approval
[ ] Navigation to Stage 5 works
Edge Cases:

[ ] Handle LLM response with no scene headings
[ ] Handle very long scripts (performance)
[ ] Handle rapid scroll in beat panel navigation
[ ] Handle empty beat sheet (should block generation)
---

Implementation Order
Create scriptService.ts - Data layer foundation
Update Stage4MasterScript.tsx - Remove mock data, add real data fetching
Implement basic script generation - Get end-to-end flow working
Add Beat Alignment Panel - Right sidebar with beat display
Implement bidirectional navigation - Click and scroll handlers
Add syntax highlighting - Textarea + pre overlay technique
Implement highlight-and-rewrite - Selection-based regeneration
Add scene extraction - Parser and database persistence
Implement approve flow - Lock stage, persist scenes, navigate
Polish and testing - Error states, loading states, edge cases
---

Key Files to Modify
New Files:

src/lib/services/scriptService.ts
Modified Files:

src/components/pipeline/Stage4MasterScript.tsx (complete rebuild)
backend/src/routes/projects.ts (add scenes endpoint)
Reference Files:

src/lib/services/beatService.ts (service pattern)
src/components/pipeline/Stage2Treatment.tsx (highlight-and-rewrite pattern)
src/components/pipeline/Stage3BeatSheet.tsx (beat display pattern)
backend/src/routes/seed.ts (prompt template already exists)