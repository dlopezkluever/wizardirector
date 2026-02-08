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
