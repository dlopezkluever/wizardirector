import { Node } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    dialogueLine: {
      insertDialogueTemplate: () => ReturnType;
    };
  }
}

export const DialogueLine = Node.create({
  name: 'dialogueLine',

  group: 'block',
  content: 'text*',

  parseHTML() {
    return [
      { tag: 'div[data-type="dialogue-line"]' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      {
        ...HTMLAttributes,
        'data-type': 'dialogue-line',
        class: 'screenplay-dialogue-line',
      },
      0
    ];
  },

  addCommands() {
    return {
      insertDialogueTemplate: () => ({ chain }) => {
        return chain()
          .setNode(this.name)
          .insertContent('CHARACTER: "Dialogue"')
          .run();
      },
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-d': () => this.editor.commands.setNode(this.name),
    };
  },
});
