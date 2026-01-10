/**
 * Convert Tiptap HTML to plain text screenplay format
 */
export function tiptapToPlainText(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  let screenplay = '';

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

  return screenplay.trim();
}

/**
 * Convert plain text screenplay to Tiptap HTML
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
