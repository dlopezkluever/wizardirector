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
        // class: 'uppercase text-blue-300 ml-32 my-2', // Left margin for indentation
        class: 'uppercase text-blue-300 mt-4', // Left-aligned, spacing above for separation from action
      },
      0
    ];
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-c': () => this.editor.commands.setNode(this.name),
    };
  },
});
