import { Node } from '@tiptap/core';

export const Parenthetical = Node.create({
  name: 'parenthetical',

  group: 'block',
  content: 'text*',

  parseHTML() {
    return [
      { tag: 'div[data-type="parenthetical"]' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      {
        ...HTMLAttributes,
        'data-type': 'parenthetical',
        class: 'text-muted-foreground italic ml-24 my-1' // Indented and italic
      },
      0
    ];
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-p': () => this.editor.commands.setNode(this.name),
    };
  },
});
