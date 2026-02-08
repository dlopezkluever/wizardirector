// ── Types ───────────────────────────────────────────────────────────────

interface TipTapNode {
  type: string;
  content?: TipTapNode[];
  text?: string;
  attrs?: Record<string, unknown>;
}

interface TipTapDoc {
  type: 'doc';
  content: TipTapNode[];
}

// ── State-Machine Parser: Plain text → TipTap JSON ─────────────────────

type ParserState = 'IDLE' | 'ACTION' | 'CHARACTER' | 'DIALOGUE';

const SCENE_HEADING_RE = /^(INT\.|EXT\.)/i;
const TRANSITION_RE = /^(FADE\s+(IN|OUT)|.*TO:)\s*$/i;
const CHARACTER_RE = /^[A-Z][A-Z\s.'''_-]+(?:\s*\((?:O\.S\.|V\.O\.|CONT'D|CONTINUED|O\.C\.)\))?$/;
const PARENTHETICAL_RE = /^\(.*\)$/;

function isCharacterLine(line: string): boolean {
  return CHARACTER_RE.test(line) && line.length < 60 && line.length > 0;
}

function makeTextNode(text: string): TipTapNode {
  return { type: 'text', text };
}

function makeBlockNode(type: string, text: string): TipTapNode {
  const node: TipTapNode = { type };
  if (text) {
    node.content = [makeTextNode(text)];
  }
  return node;
}

/**
 * Build a dialogueLine node from collected character/parenthetical/dialogue parts.
 * Format: `CHARACTER (EXT): (parenthetical) "combined dialogue text"`
 */
function buildDialogueLineNode(
  characterName: string,
  parenthetical: string | null,
  dialogueLines: string[]
): TipTapNode {
  let inlineText = characterName + ':';

  if (parenthetical) {
    inlineText += ' ' + parenthetical;
  }

  if (dialogueLines.length > 0) {
    const combined = dialogueLines.join(' ');
    inlineText += ' "' + combined + '"';
  }

  return makeBlockNode('dialogueLine', inlineText);
}

/**
 * Parse a plain-text screenplay into a TipTap JSON document using a state machine.
 */
export function parseScriptToTiptapJson(plainText: string): TipTapDoc {
  const lines = plainText.split('\n');
  const nodes: TipTapNode[] = [];

  let state: ParserState = 'IDLE';
  let currentCharacter = '';
  let currentParenthetical: string | null = null;
  let currentDialogueLines: string[] = [];

  function flushDialogue() {
    if (currentCharacter) {
      nodes.push(buildDialogueLineNode(currentCharacter, currentParenthetical, currentDialogueLines));
      currentCharacter = '';
      currentParenthetical = null;
      currentDialogueLines = [];
    }
    state = 'IDLE';
  }

  for (const line of lines) {
    const trimmed = line.trim();

    // Empty line — flush any in-progress dialogue, then skip
    if (!trimmed) {
      if (state === 'CHARACTER' || state === 'DIALOGUE') {
        flushDialogue();
      }
      state = 'IDLE';
      continue;
    }

    // Scene heading
    if (SCENE_HEADING_RE.test(trimmed)) {
      if (state === 'CHARACTER' || state === 'DIALOGUE') flushDialogue();
      nodes.push(makeBlockNode('sceneHeading', trimmed));
      state = 'IDLE';
      continue;
    }

    // Transition
    if (TRANSITION_RE.test(trimmed)) {
      if (state === 'CHARACTER' || state === 'DIALOGUE') flushDialogue();
      nodes.push(makeBlockNode('transition', trimmed));
      state = 'IDLE';
      continue;
    }

    // Character name detection
    if (isCharacterLine(trimmed) && state !== 'DIALOGUE') {
      // Flush any previous dialogue block
      if (state === 'CHARACTER' || state === 'DIALOGUE') flushDialogue();
      currentCharacter = trimmed;
      state = 'CHARACTER';
      continue;
    }

    // Parenthetical — only valid after character name
    if (PARENTHETICAL_RE.test(trimmed) && (state === 'CHARACTER' || state === 'DIALOGUE')) {
      currentParenthetical = trimmed;
      state = 'DIALOGUE';
      continue;
    }

    // Dialogue — text following a character name
    if (state === 'CHARACTER' || state === 'DIALOGUE') {
      currentDialogueLines.push(trimmed);
      state = 'DIALOGUE';
      continue;
    }

    // Default: action
    if (state === 'CHARACTER' || state === 'DIALOGUE') flushDialogue();
    nodes.push(makeBlockNode('action', trimmed));
    state = 'ACTION';
  }

  // Flush anything remaining
  if (state === 'CHARACTER' || state === 'DIALOGUE') {
    flushDialogue();
  }

  return {
    type: 'doc',
    content: nodes.length > 0 ? nodes : [makeBlockNode('paragraph', '')],
  };
}

// ── TipTap JSON → Plain Text ────────────────────────────────────────────

/**
 * Convert a TipTap JSON document back to standard screenplay plain text.
 */
export function tiptapJsonToPlainText(doc: TipTapDoc): string {
  if (!doc || !doc.content) return '';

  const parts: string[] = [];

  for (const node of doc.content) {
    const text = extractText(node);

    switch (node.type) {
      case 'sceneHeading':
        parts.push(text.toUpperCase() + '\n');
        break;

      case 'transition':
        parts.push(text.toUpperCase() + '\n');
        break;

      case 'action':
        parts.push(text + '\n');
        break;

      case 'dialogueLine': {
        // Parse inline format: `CHARACTER (EXT): (paren) "dialogue"`
        const colonIdx = text.indexOf(':');
        if (colonIdx === -1) {
          // Malformed — treat whole line as character
          parts.push(text + '\n');
          break;
        }

        const charName = text.slice(0, colonIdx).trim();
        const afterColon = text.slice(colonIdx + 1).trim();

        parts.push(charName + '\n');

        // Extract optional parenthetical
        const parenMatch = afterColon.match(/^(\([^)]*\))\s*/);
        let remainder = afterColon;
        if (parenMatch) {
          parts.push(parenMatch[1] + '\n');
          remainder = afterColon.slice(parenMatch[0].length);
        }

        // Extract dialogue (strip quotes if present)
        if (remainder) {
          const unquoted = remainder.replace(/^"(.*)"$/, '$1');
          parts.push(unquoted + '\n');
        }
        break;
      }

      case 'paragraph':
        if (text) {
          parts.push(text + '\n');
        } else {
          parts.push('\n');
        }
        break;

      default:
        if (text) {
          parts.push(text + '\n');
        }
        break;
    }
  }

  return parts.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function extractText(node: TipTapNode): string {
  if (node.text) return node.text;
  if (!node.content) return '';
  return node.content.map(extractText).join('');
}

// ── Legacy functions (kept for backward compatibility) ──────────────────

/**
 * Convert Tiptap HTML to plain text screenplay format
 * @deprecated Use tiptapJsonToPlainText instead
 */
export function tiptapToPlainText(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  let screenplay = '';

  // Handle custom screenplay elements
  doc.querySelectorAll('[data-type]').forEach((element) => {
    const type = element.getAttribute('data-type');
    const text = element.textContent || '';

    switch (type) {
      case 'scene-heading':
        screenplay += `${text.toUpperCase()}\n\n`;
        break;
      case 'character':
        screenplay += `${' '.repeat(20)}${text.toUpperCase()}\n`;
        break;
      case 'dialogue':
        screenplay += `${' '.repeat(10)}${text}\n`;
        break;
      case 'parenthetical':
        screenplay += `${' '.repeat(15)}${text}\n`;
        break;
      case 'action':
        screenplay += `${text}\n\n`;
        break;
      case 'transition':
        screenplay += `${' '.repeat(50)}${text.toUpperCase()}\n\n`;
        break;
    }
  });

  // Handle regular paragraphs (fallback for regular text)
  doc.querySelectorAll('p').forEach((element) => {
    const text = element.textContent || '';
    if (text.trim()) {
      screenplay += `${text}\n\n`;
    }
  });

  return screenplay.trim();
}

/**
 * Convert plain text screenplay to Tiptap HTML
 * @deprecated Use parseScriptToTiptapJson instead
 */
export function plainTextToTiptap(plainText: string): string {
  const lines = plainText.split('\n');
  let html = '';

  lines.forEach((line) => {
    const trimmed = line.trim();

    // Scene heading (INT./EXT.)
    if (/^(INT\.|EXT\.)/.test(trimmed)) {
      html += `<div data-type="scene-heading">${trimmed}</div>`;
    }
    // All caps (likely character)
    else if (/^[A-Z\s]+$/.test(trimmed) && trimmed.length > 0 && trimmed.length < 50) {
      html += `<div data-type="character">${trimmed}</div>`;
    }
    // Parenthetical
    else if (/^\(.*\)$/.test(trimmed)) {
      html += `<div data-type="parenthetical">${trimmed}</div>`;
    }
    // Action or dialogue
    else if (trimmed) {
      // Heuristic: if previous was character, this is dialogue
      if (html.includes('data-type="character"') && !html.includes('data-type="dialogue"')) {
        html += `<div data-type="dialogue">${trimmed}</div>`;
      } else {
        html += `<div data-type="action">${trimmed}</div>`;
      }
    }
    // Empty line
    else {
      html += '<br />';
    }
  });

  return html;
}

/**
 * Strip HTML tags (for legacy scripts with <center> tags)
 */
export function stripHtmlTags(text: string): string {
  return text.replace(/<[^>]*>/g, '');
}
