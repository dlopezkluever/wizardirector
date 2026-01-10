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
      shortcut: '⌘⇧P',
      active: editor.isActive('parenthetical')
    },
  ];

  const handleFormatClick = (type: string) => {
    // Convert the current block to the screenplay element type
    // This will maintain cursor position and convert the paragraph/block at cursor
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
