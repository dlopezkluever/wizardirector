import { Node } from '@tiptap/core';

export const Action = Node.create({
  name: 'action',

  group: 'block',
  content: 'text*',

  parseHTML() {
    return [
      { tag: 'div[data-type="action"]' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      {
        ...HTMLAttributes,
        'data-type': 'action',
        class: 'text-foreground my-2'
      },
      0
    ];
  },
});
