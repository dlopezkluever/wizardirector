# Stage 4: Rich Text Editor Implementation Guide

## Executive Summary

Switch from the transparent textarea + syntax highlighting approach to a proper rich text editor (Tiptap) that natively supports screenplay formatting. This will solve:

1. ✅ Proper screenplay formatting (centered dialogue, indented character names)
2. ✅ No HTML tag pollution in output
3. ✅ No text selection/highlighting misalignment issues
4. ✅ Better user experience with proper screenplay conventions
5. ✅ Support for future features (scene numbers, transitions, etc.)

---

## Why Switch?

### Current Limitations
- **Textarea constraints**: Can't center text or apply complex formatting
- **Overlay technique issues**: Selection highlighting misaligns on wrapped text
- **HTML tag pollution**: LLM outputs `<center>` tags that appear as text
- **Professional appearance**: Doesn't look like a real screenplay editor

### Benefits of Tiptap
- **Native screenplay formatting**: Proper indentation and centering
- **Rich text capabilities**: Bold, italics, proper spacing
- **TypeScript support**: Full type safety
- **Extensible**: Can add custom node types for screenplay elements
- **Performance**: Efficient with large documents
- **Active maintenance**: Modern, well-supported library

---

## Recommended Library: Tiptap

**Why Tiptap?**
- Built on ProseMirror (industry standard)
- Excellent TypeScript support
- Easy to customize with extensions
- Great documentation
- Active community
- React bindings available

**Alternatives considered:**
- ~~Slate~~ - Too low-level, more complex
- ~~Draft.js~~ - Older, Facebook abandoned it
- ~~Quill~~ - Not as flexible for custom formatting
- ~~ProseMirror directly~~ - Too complex to implement from scratch

---

## Implementation Plan

### Phase 1: Setup & Installation (30 mins)

**1. Install Dependencies**
```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-placeholder
```

**2. Install Screenplay-Specific Extensions**
```bash
# We'll create custom extensions for:
# - Scene Headings
# - Action Lines
# - Character Names
# - Dialogue
# - Parentheticals
# - Transitions
```

---

### Phase 2: Create Custom Screenplay Extensions (2-3 hours)

Create a new directory: `src/lib/tiptap-extensions/`

#### File Structure
```
src/lib/tiptap-extensions/
├── SceneHeading.ts
├── Character.ts
├── Dialogue.ts
├── Action.ts
├── Parenthetical.ts
├── Transition.ts
└── index.ts
```

#### Example: SceneHeading Extension

**File: `src/lib/tiptap-extensions/SceneHeading.ts`**
```typescript
import { Node } from '@tiptap/core';

export const SceneHeading = Node.create({
  name: 'sceneHeading',
  
  group: 'block',
  content: 'text*',
  
  parseHTML() {
    return [
      { tag: 'div[data-type="scene-heading"]' },
    ];
  },
  
  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      {
        ...HTMLAttributes,
        'data-type': 'scene-heading',
        class: 'font-bold uppercase text-amber-400 my-4'
      },
      0
    ];
  },
  
  addKeyboardShortcuts() {
    return {
      'Mod-Shift-h': () => this.editor.commands.setNode(this.name),
    };
  },
});
```

#### Example: Character Extension

**File: `src/lib/tiptap-extensions/Character.ts`**
```typescript
import { Node } from '@tiptap/core';

export const Character = Node.create({
  name: 'character',
  
  group: 'block',
  content: 'text*',
  
  parseHTML() {
    return [
      { tag: 'div[data-type="character"]' },
    ];
  },
  
  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      {
        ...HTMLAttributes,
        'data-type': 'character',
        class: 'uppercase text-blue-300 ml-32 my-2' // Left margin for indentation
      },
      0
    ];
  },
  
  addKeyboardShortcuts() {
    return {
      'Tab': () => {
        // Tab after character name creates dialogue
        return this.editor.commands.insertContentAt(
          this.editor.state.selection.to,
          { type: 'dialogue' }
        );
      },
    };
  },
});
```

#### Example: Dialogue Extension

**File: `src/lib/tiptap-extensions/Dialogue.ts`**
```typescript
import { Node } from '@tiptap/core';

export const Dialogue = Node.create({
  name: 'dialogue',
  
  group: 'block',
  content: 'text*',
  
  parseHTML() {
    return [
      { tag: 'div[data-type="dialogue"]' },
    ];
  },
  
  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      {
        ...HTMLAttributes,
        'data-type': 'dialogue',
        class: 'text-foreground ml-20 mr-20 my-1' // Centered via margins
      },
      0
    ];
  },
});
```

---

### Phase 3: Replace Stage4MasterScript Component (3-4 hours)

#### New Component Structure

**File: `src/components/pipeline/Stage4MasterScript.tsx`**

Key changes:
1. Replace `<textarea>` with Tiptap `<EditorContent>`
2. Remove syntax highlighting logic (Tiptap handles it)
3. Add toolbar for screenplay element types
4. Keep all existing functionality (save, regenerate, approve)

#### Basic Implementation

```typescript
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { SceneHeading, Character, Dialogue, Action, Parenthetical, Transition } from '@/lib/tiptap-extensions';

export function Stage4MasterScript({ projectId, onComplete, onBack }: Stage4MasterScriptProps) {
  // Initialize Tiptap editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable default paragraph behavior
        paragraph: false,
      }),
      Placeholder.configure({
        placeholder: 'Start writing your screenplay...',
      }),
      SceneHeading,
      Character,
      Dialogue,
      Action,
      Parenthetical,
      Transition,
    ],
    content: stageContent.formattedScript || '',
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none p-6 focus:outline-none min-h-full',
      },
    },
    onUpdate: ({ editor }) => {
      // Auto-save on change
      const html = editor.getHTML();
      handleScriptChange(html);
    },
  });

  // Convert HTML back to plain text for API calls
  const getPlainTextScript = () => {
    if (!editor) return '';
    return editor.getText();
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header - keep existing */}
      
      {/* Screenplay Toolbar */}
      <ScreenplayToolbar editor={editor} />
      
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor */}
        <div className="flex-1 overflow-auto bg-background">
          <EditorContent editor={editor} />
        </div>
        
        {/* Beat Panel - keep existing */}
      </div>
    </div>
  );
}
```

---

### Phase 4: Create Screenplay Toolbar (1-2 hours)

**File: `src/components/pipeline/ScreenplayToolbar.tsx`**

```typescript
import { Editor } from '@tiptap/react';
import { Button } from '@/components/ui/button';

interface ScreenplayToolbarProps {
  editor: Editor | null;
}

export function ScreenplayToolbar({ editor }: ScreenplayToolbarProps) {
  if (!editor) return null;

  const buttons = [
    { 
      label: 'Scene Heading', 
      type: 'sceneHeading', 
      shortcut: '⌘⇧H',
      active: editor.isActive('sceneHeading')
    },
    { 
      label: 'Character', 
      type: 'character', 
      shortcut: '⌘⇧C',
      active: editor.isActive('character')
    },
    { 
      label: 'Dialogue', 
      type: 'dialogue',
      active: editor.isActive('dialogue')
    },
    { 
      label: 'Action', 
      type: 'action',
      active: editor.isActive('action')
    },
    { 
      label: 'Parenthetical', 
      type: 'parenthetical',
      active: editor.isActive('parenthetical')
    },
  ];

  return (
    <div className="flex items-center gap-2 px-6 py-3 border-b border-border bg-card">
      {buttons.map((btn) => (
        <Button
          key={btn.type}
          variant={btn.active ? 'default' : 'outline'}
          size="sm"
          onClick={() => editor.chain().focus().setNode(btn.type).run()}
          title={btn.shortcut}
        >
          {btn.label}
        </Button>
      ))}
    </div>
  );
}
```

---

### Phase 5: Backend Integration (1 hour)

#### Convert Between Formats

**Challenge**: Backend expects plain text screenplay, Tiptap stores as HTML.

**Solution**: Create converter utilities.

**File: `src/lib/utils/screenplay-converter.ts`**

```typescript
/**
 * Convert Tiptap HTML to plain text screenplay format
 */
export function tiptapToPlainText(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  let screenplay = '';
  
  doc.querySelectorAll('[data-type]').forEach((element) => {
    const type = element.getAttribute('data-type');
    const text = element.textContent || '';
    
    switch (type) {
      case 'scene-heading':
        screenplay += `${text.toUpperCase()}\n\n`;
        break;
      case 'character':
        screenplay += `${' '.repeat(20)}${text.toUpperCase()}\n`;
        break;
      case 'dialogue':
        screenplay += `${' '.repeat(10)}${text}\n`;
        break;
      case 'parenthetical':
        screenplay += `${' '.repeat(15)}${text}\n`;
        break;
      case 'action':
        screenplay += `${text}\n\n`;
        break;
      case 'transition':
        screenplay += `${' '.repeat(50)}${text.toUpperCase()}\n\n`;
        break;
    }
  });
  
  return screenplay.trim();
}

/**
 * Convert plain text screenplay to Tiptap HTML
 */
export function plainTextToTiptap(plainText: string): string {
  const lines = plainText.split('\n');
  let html = '';
  
  lines.forEach((line) => {
    const trimmed = line.trim();
    
    // Scene heading (INT./EXT.)
    if (/^(INT\.|EXT\.)/.test(trimmed)) {
      html += `<div data-type="scene-heading">${trimmed}</div>`;
    }
    // All caps (likely character)
    else if (/^[A-Z\s]+$/.test(trimmed) && trimmed.length > 0 && trimmed.length < 50) {
      html += `<div data-type="character">${trimmed}</div>`;
    }
    // Parenthetical
    else if (/^\(.*\)$/.test(trimmed)) {
      html += `<div data-type="parenthetical">${trimmed}</div>`;
    }
    // Action or dialogue
    else if (trimmed) {
      // Heuristic: if previous was character, this is dialogue
      if (html.includes('data-type="character"') && !html.includes('data-type="dialogue"')) {
        html += `<div data-type="dialogue">${trimmed}</div>`;
      } else {
        html += `<div data-type="action">${trimmed}</div>`;
      }
    }
    // Empty line
    else {
      html += '<br />';
    }
  });
  
  return html;
}

/**
 * Strip HTML tags (for legacy scripts with <center> tags)
 */
export function stripHtmlTags(text: string): string {
  return text.replace(/<[^>]*>/g, '');
}
```

#### Update scriptService.ts

**File: `src/lib/services/scriptService.ts`**

Add import:
```typescript
import { stripHtmlTags } from '@/lib/utils/screenplay-converter';
```

Update `parseScriptResponse`:
```typescript
private parseScriptResponse(content: string | any): {
  formattedScript: string;
  scenes: Scene[];
  estimatedPageCount?: number;
} {
  // ... existing code ...
  
  // Strip HTML tags from LLM output
  let formattedScript = parsed.formatted_script || parsed.formattedScript || parsed.script || '';
  formattedScript = stripHtmlTags(formattedScript);
  
  // ... rest of code ...
}
```

---

### Phase 6: Update Stage4MasterScript Integration (2 hours)

#### Key Changes

**1. Initialize editor with existing content:**
```typescript
useEffect(() => {
  if (editor && stageContent.formattedScript) {
    const html = plainTextToTiptap(stageContent.formattedScript);
    editor.commands.setContent(html);
  }
}, [stageContent.formattedScript, editor]);
```

**2. Save as plain text:**
```typescript
const handleScriptChange = useCallback((html: string) => {
  const plainText = tiptapToPlainText(html);
  
  const updatedContent: Stage4Content = {
    ...stageContent,
    formattedScript: plainText,
    scenes: scriptService.extractScenes(plainText)
  };
  setStageContent(updatedContent);
}, [stageContent, setStageContent]);
```

**3. Update regeneration to work with Tiptap:**
```typescript
const handleRegenerateSection = useCallback(async () => {
  // Get selected text from Tiptap
  const { from, to } = editor.state.selection;
  const selectedText = editor.state.doc.textBetween(from, to);
  
  // ... existing regeneration logic ...
  
  // Replace selection in Tiptap
  editor.chain()
    .focus()
    .deleteRange({ from, to })
    .insertContent(rewrittenSection)
    .run();
}, [editor, sectionEditRequest]);
```

---

### Phase 7: Styling & UX Polish (1-2 hours)

#### Custom CSS for Screenplay Look

**File: `src/styles/screenplay.css`**

```css
/* Screenplay editor styles */
.ProseMirror {
  font-family: 'Courier Prime', 'Courier New', monospace;
  font-size: 12pt;
  line-height: 1.5;
  padding: 1in;
  background: var(--background);
  color: var(--foreground);
  min-height: 100%;
}

/* Scene Headings */
.ProseMirror [data-type="scene-heading"] {
  font-weight: bold;
  text-transform: uppercase;
  color: rgb(251, 191, 36); /* amber-400 */
  margin: 1.5rem 0;
}

/* Character Names */
.ProseMirror [data-type="character"] {
  text-transform: uppercase;
  color: rgb(147, 197, 253); /* blue-300 */
  margin-left: 3.5in;
  margin-top: 1rem;
}

/* Dialogue */
.ProseMirror [data-type="dialogue"] {
  margin-left: 2in;
  margin-right: 2in;
  margin-bottom: 0.5rem;
}

/* Parentheticals */
.ProseMirror [data-type="parenthetical"] {
  font-style: italic;
  color: rgb(156, 163, 175); /* gray-400 */
  margin-left: 2.5in;
}

/* Action */
.ProseMirror [data-type="action"] {
  margin-bottom: 1rem;
}

/* Selection styling */
.ProseMirror ::selection {
  background: rgba(59, 130, 246, 0.3); /* blue with opacity */
}

/* Placeholder */
.ProseMirror p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left;
  color: rgb(107, 114, 128); /* gray-500 */
  pointer-events: none;
  height: 0;
}
```

Import in `src/main.tsx`:
```typescript
import './styles/screenplay.css';
```

---

## Migration Strategy

### Option A: Clean Slate (Recommended for Testing)
1. Test with new projects only
2. Old projects keep textarea editor
3. Add flag: `useRichTextEditor` in project settings

### Option B: Gradual Migration (DO NOT TRY FOR NOW)
1. Detect if script has HTML tags
2. If yes, convert to Tiptap format
3. Otherwise, use as-is

### Option C: Full Migration  (DO NOT TRY FOR NOW)
1. Create migration script
2. Convert all existing scripts to Tiptap format
3. Deploy with downtime window

**Recommendation**: Start with Option A, then if desired later, move to Option B.

*NOTE*: I dont really care about past projects, they have all been for testing, so as long as what is implemented works for all future projects once we finish development, we are good! 

---

## Implementation Checklist

### Setup
- [ ] Install Tiptap dependencies
- [ ] Create `tiptap-extensions` directory
- [ ] Create `screenplay.css` file

### Extensions
- [ ] Create SceneHeading extension
- [ ] Create Character extension
- [ ] Create Dialogue extension
- [ ] Create Action extension
- [ ] Create Parenthetical extension
- [ ] Create Transition extension (optional)

### Component
- [ ] Create ScreenplayToolbar component
- [ ] Update Stage4MasterScript to use Tiptap
- [ ] Remove old textarea/syntax highlighting code
- [ ] Test editor initialization
- [ ] Test auto-save

### Utilities
- [ ] Create screenplay-converter.ts
- [ ] Implement tiptapToPlainText()
- [ ] Implement plainTextToTiptap()
- [ ] Implement stripHtmlTags()
- [ ] Update scriptService to use converters

### Backend Integration
- [ ] Test script generation → Tiptap conversion
- [ ] Test Tiptap → plain text for API calls
- [ ] Test section regeneration
- [ ] Test full regeneration
- [ ] Test scene extraction

### Testing
- [ ] Generate new script
- [ ] Edit in Tiptap
- [ ] Regenerate section
- [ ] Approve and save
- [ ] Verify scenes in database
- [ ] Test beat navigation
- [ ] Test keyboard shortcuts

### Polish
- [ ] Apply custom CSS
- [ ] Add keyboard shortcuts
- [ ] Test on different screen sizes
- [ ] Verify color scheme
- [ ] Test with long scripts

---

## Estimated Timeline

| Phase | Time | Complexity |
|-------|------|------------|
| Setup & Installation | 30 mins | Easy |
| Custom Extensions | 2-3 hours | Medium |
| Component Replacement | 3-4 hours | Hard |
| Toolbar | 1-2 hours | Easy |
| Backend Integration | 1 hour | Medium |
| Stage4 Integration | 2 hours | Medium |
| Styling & Polish | 1-2 hours | Easy |
| **Total** | **11-14 hours** | **Medium-Hard** |

---

## Benefits After Implementation

### User Experience
✅ Professional screenplay appearance
✅ Proper character name and dialogue centering
✅ No HTML tag pollution
✅ No text selection/highlighting issues
✅ Industry-standard formatting
✅ Keyboard shortcuts for speed

### Technical
✅ Clean separation of formatting and content
✅ Extensible for future features (scene numbers, etc.)
✅ Better maintainability
✅ Modern, well-supported library
✅ Full TypeScript support

### Future Features Enabled
- Scene numbering
- Revision marks
- Locked pages
- Export to Final Draft format
- Collaborative editing
- Comments and annotations

---

## Next Steps

1. I'll implement Phase 1 (setup) and Phase 2 (extensions)
2. You test the basic editor
3. Continue with remaining phases
4. Full testing and polish

