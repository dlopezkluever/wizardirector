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
