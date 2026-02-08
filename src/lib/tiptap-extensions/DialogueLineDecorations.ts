import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Node as PmNode } from '@tiptap/pm/model';

const dialogueLineDecorationsKey = new PluginKey('dialogueLineDecorations');

function buildDecorations(doc: PmNode): DecorationSet {
  const decorations: Decoration[] = [];

  doc.descendants((node: PmNode, pos: number) => {
    if (node.type.name !== 'dialogueLine') return;

    const text = node.textContent;
    if (!text) return;

    // The node content starts at pos + 1 (pos is the node start, +1 for the opening tag)
    const basePos = pos + 1;

    const colonIndex = text.indexOf(':');

    if (colonIndex === -1) {
      // No colon — treat entire line as character name
      decorations.push(
        Decoration.inline(basePos, basePos + text.length, {
          class: 'dialogue-char',
        })
      );
      return;
    }

    // Character name: start -> colon (inclusive)
    decorations.push(
      Decoration.inline(basePos, basePos + colonIndex + 1, {
        class: 'dialogue-char',
      })
    );

    // Parse what comes after the colon
    const afterColon = text.slice(colonIndex + 1);
    const afterColonStart = basePos + colonIndex + 1;

    // Look for parenthetical: (text) before quotes
    const parenMatch = afterColon.match(/^(\s*\([^)]*\))/);
    let dialogueSearchStart = 0;

    if (parenMatch) {
      const parenText = parenMatch[1];
      const parenTrimStart = parenText.length - parenText.trimStart().length;
      decorations.push(
        Decoration.inline(
          afterColonStart + parenTrimStart,
          afterColonStart + parenText.length,
          { class: 'dialogue-paren' }
        )
      );
      dialogueSearchStart = parenText.length;
    }

    // Look for quoted dialogue
    const remaining = afterColon.slice(dialogueSearchStart);
    const quoteStart = remaining.indexOf('"');
    const quoteEnd = remaining.lastIndexOf('"');

    if (quoteStart !== -1 && quoteEnd > quoteStart) {
      // Quoted dialogue found
      const absQuoteStart = afterColonStart + dialogueSearchStart + quoteStart;
      const absQuoteEnd = afterColonStart + dialogueSearchStart + quoteEnd + 1;
      decorations.push(
        Decoration.inline(absQuoteStart, absQuoteEnd, {
          class: 'dialogue-text',
        })
      );
    } else if (remaining.trim().length > 0) {
      // No quotes — treat remaining text as dialogue
      const trimmedStart = remaining.length - remaining.trimStart().length;
      const absStart = afterColonStart + dialogueSearchStart + trimmedStart;
      const absEnd = afterColonStart + afterColon.length;
      if (absEnd > absStart) {
        decorations.push(
          Decoration.inline(absStart, absEnd, {
            class: 'dialogue-text',
          })
        );
      }
    }
  });

  return DecorationSet.create(doc, decorations);
}

export const DialogueLineDecorations = Extension.create({
  name: 'dialogueLineDecorations',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: dialogueLineDecorationsKey,
        state: {
          init(_, { doc }) {
            return buildDecorations(doc);
          },
          apply(tr, oldSet) {
            if (tr.docChanged) {
              return buildDecorations(tr.doc);
            }
            return oldSet;
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ];
  },
});
