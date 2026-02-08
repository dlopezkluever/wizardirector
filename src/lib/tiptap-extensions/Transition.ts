import { Node } from '@tiptap/core';

export const Transition = Node.create({
  name: 'transition',

  group: 'block',
  content: 'text*',

  parseHTML() {
    return [
      { tag: 'div[data-type="transition"]' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      {
        ...HTMLAttributes,
        'data-type': 'transition',
      },
      0
    ];
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-t': () => this.editor.commands.setNode(this.name),
    };
  },
});
