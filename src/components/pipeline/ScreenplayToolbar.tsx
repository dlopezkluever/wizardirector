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
      label: 'Action',
      type: 'action',
      active: editor.isActive('action')
    },
    {
      label: 'Dialogue',
      type: 'dialogueLine',
      shortcut: '⌘⇧D',
      active: editor.isActive('dialogueLine')
    },
    {
      label: 'Transition',
      type: 'transition',
      shortcut: '⌘⇧T',
      active: editor.isActive('transition')
    },
  ];

  const handleFormatClick = (type: string) => {
    if (type === 'dialogueLine') {
      // Check if the current line is empty — if so, insert a template
      const { from, to } = editor.state.selection;
      const currentNode = editor.state.doc.nodeAt(from - 1);
      const isEmptyLine = currentNode && currentNode.textContent === '';

      if (isEmptyLine || from === to) {
        // Try to set node type first, then check if content is empty to insert template
        const resolved = editor.state.doc.resolve(from);
        const parentNode = resolved.parent;

        if (parentNode.textContent === '') {
          editor
            .chain()
            .focus()
            .setNode('dialogueLine')
            .insertContent('CHARACTER: "Dialogue"')
            .run();
          return;
        }
      }

      editor.chain().focus().setNode('dialogueLine').run();
      return;
    }

    editor
      .chain()
      .focus()
      .setNode(type)
      .run();
  };

  return (
    <div className="flex items-center gap-2 px-6 py-3 border-b border-border bg-card">
      {buttons.map((btn) => (
        <Button
          key={btn.type}
          variant={btn.active ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleFormatClick(btn.type)}
          title={btn.shortcut}
        >
          {btn.label}
        </Button>
      ))}
    </div>
  );
}
