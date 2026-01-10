Fix Stage 4 Script Persistence
Problem Diagnosis
The script is being saved to stage_states.content.formattedScript in the database, but the Tiptap editor doesn't update when the data loads because:

Race condition: Tiptap useEditor() initializes before useStageState() finishes loading from DB
No reactivity: Tiptap doesn't automatically re-render when stageContent.formattedScript changes after initial mount
Auto-save timing: Current auto-save triggers on every keystroke via useStageState, but we need 2-second debounce on Tiptap changes
Solution Architecture
flowchart TD
    Mount[Component Mounts] --> InitEditor[Initialize Tiptap]
    InitEditor --> EmptyState[Editor empty initially]
    
    Mount --> LoadDB[useStageState loads from DB]
    LoadDB --> DataArrives{Content exists?}
    
    DataArrives -->|Yes| UpdateEditor[useEffect: editor.commands.setContent]
    DataArrives -->|No| ShowGenerate[Show Generate Button]
    
    UpdateEditor --> ShowEditor[Show populated editor]
    
    UserTypes[User types] --> Debounce[Wait 2 seconds]
    Debounce --> ConvertHTML[Convert Tiptap HTML to plain text]
    ConvertHTML --> SaveDB[Save to stage_states]
Implementation Steps
1. Add useEffect to sync loaded content to Tiptap editor
File: src/components/pipeline/Stage4MasterScript.tsx

After the editor initializes (around line 128), add a new useEffect that watches for stageContent.formattedScript changes and updates the editor:

// Update editor content when stage content loads from DB
useEffect(() => {
  if (!editor || isLoading) return;
  
  if (stageContent.formattedScript) {
    const currentPlainText = tiptapToPlainText(editor.getHTML());
    
    // Only update if content changed (avoid infinite loops)
    if (currentPlainText !== stageContent.formattedScript) {
      console.log('📝 [STAGE 4] Syncing loaded content to editor');
      const tiptapHtml = plainTextToTiptap(stageContent.formattedScript);
      editor.commands.setContent(tiptapHtml);
    }
  }
}, [stageContent.formattedScript, editor, isLoading]);
2. Disable useStageState auto-save and implement custom debounced save
File: src/components/pipeline/Stage4MasterScript.tsx (line 70)

Change autoSave: true to autoSave: false:

const { 
  content: stageContent, 
  setContent: setStageContent, 
  isLoading, 
  isSaving,
  save // We'll use manual save
} = useStageState<Stage4Content>({
  projectId,
  stageNumber: 4,
  initialContent: {
    formattedScript: '',
    scenes: [],
    syncStatus: 'synced'
  },
  autoSave: false // Changed from true
});
3. Add debounced save logic in Tiptap's onUpdate
File: src/components/pipeline/Stage4MasterScript.tsx

Add a useRef for the debounce timer and update the onUpdate handler (around line 111):

// Add after other useRef declarations (around line 86)
const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

// Update the editor configuration's onUpdate (line 111)
onUpdate: ({ editor }) => {
  const html = editor.getHTML();
  const plainText = tiptapToPlainText(html);

  // Update local state immediately for UI responsiveness
  const updatedContent: Stage4Content = {
    ...stageContent,
    formattedScript: plainText,
    scenes: scriptService.extractScenes(plainText)
  };
  setStageContent(updatedContent);

  // Clear existing timeout
  if (saveTimeoutRef.current) {
    clearTimeout(saveTimeoutRef.current);
  }

  // Set new timeout for 2-second debounced save
  saveTimeoutRef.current = setTimeout(async () => {
    console.log('💾 [STAGE 4] Auto-saving after 2s of inactivity...');
    try {
      await save({ status: 'draft' });
      console.log('✅ [STAGE 4] Auto-save successful');
    } catch (error) {
      console.error('❌ [STAGE 4] Auto-save failed:', error);
    }
  }, 2000);
},
4. Cleanup timeout on unmount
File: src/components/pipeline/Stage4MasterScript.tsx

Add a cleanup useEffect:

// Cleanup save timeout on unmount
useEffect(() => {
  return () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
  };
}, []);
5. Fix conditional rendering logic
The component should show the editor when stageContent.formattedScript exists, not require isEditing flag.

File: src/components/pipeline/Stage4MasterScript.tsx (around line 300+)

Update the rendering condition:

{!isLoading && stageContent.formattedScript ? (
  // Show editor
  <div>
    <ScreenplayToolbar editor={editor} />
    <EditorContent editor={editor} />
  </div>
) : !isLoading ? (
  // Show empty state with Generate button
  <EmptyStateComponent />
) : (
  // Show loading spinner
  <LoadingSpinner />
)}
Expected Outcomes
On page load: Script loads from stage_states.content.formattedScript and displays in Tiptap editor
On typing: Changes saved to database after 2 seconds of inactivity
On rapid typing: Timer resets on each keystroke, only saves when user stops
On manual save: Existing "Approve Script" and regeneration flows continue to work
Files Modified
src/components/pipeline/Stage4MasterScript.tsx (5 changes)
Testing Checklist
Generate a new script → Verify it appears in editor
Refresh the page → Verify script persists and displays
Type continuously for 5 seconds → Verify save only triggers after 2s pause
Type, wait 1.5s, type again → Verify timer resets and save waits for 2s after final keystroke
Navigate away and back → Verify content still loads correctly
Approve script → Verify scenes save and navigation works

sequenceDiagram
    participant User
    participant Component as Stage4Component
    participant Hook as useStageState
    participant Editor as TiptapEditor
    participant DB as Database

    User->>Component: Visit Stage 4 page
    Component->>Hook: useStageState loads from DB
    Hook->>DB: GET stage_states (stage=4)
    DB-->>Hook: Returns content.formattedScript
    Hook-->>Component: stageContent loaded
    
    Note over Component,Editor: BUG: Editor initialized BEFORE content loads!
    
    Component->>Editor: useEditor() with empty content
    Editor-->>Component: Editor ready (empty)
    
    Note over Component: Later: stageContent arrives
    Note over Component: But editor already initialized!
    
    User->>User: Sees empty editor + "Generate Script" button