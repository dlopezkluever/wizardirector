/**
 * Script Manifest — Deterministic TipTap JSON extraction utility
 *
 * Pure-function module: zero LLM calls, zero external dependencies.
 * Extracts characters, locations, props, and dialogue from structured
 * TipTap JSON documents stored by Stage 4.
 *
 * Reference: ._docs/newest-tickets-while-in-master/tiptap-json-extraction-guide.md
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TipTapNode {
  type: string;
  content?: TipTapNode[];
  text?: string;
}

interface ParsedScene {
  sceneNumber: number;
  intExt: 'INT' | 'EXT';
  location: string;
  timeOfDay: string | null;
  nodes: TipTapNode[];
}

export interface ExtractedCharacter {
  name: string;
  sceneNumbers: number[];
  dialogueCount: number;
}

export interface ExtractedProp {
  name: string;
  sceneNumbers: number[];
  contexts: string[];
}

export interface ScriptManifestScene {
  sceneNumber: number;
  heading: string;
  intExt: 'INT' | 'EXT';
  location: string;
  timeOfDay: string | null;
  characters: string[];
  speakingCharacters: string[];
  props: string[];
  actionText: string;
}

export interface ScriptManifest {
  scenes: ScriptManifestScene[];
  globalCharacters: Map<string, ExtractedCharacter>;
  globalLocations: string[];
  globalProps: Map<string, ExtractedProp>;
}

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------

/** Recursively extract plain text from a TipTap node tree. */
export function getNodeText(node: TipTapNode): string {
  if (node.text) return node.text;
  if (!node.content) return '';
  return node.content.map(getNodeText).join('');
}

/**
 * Parse an inline dialogue line:
 *   CHARACTER (V.O.): (whisper) "text"
 * Returns null if there is no colon separator.
 */
export function parseDialogueLine(text: string): {
  characterName: string;
  extensions: string[];
  parenthetical: string | null;
  dialogue: string;
} | null {
  const colonIdx = text.indexOf(':');
  if (colonIdx === -1) return null;

  const charPart = text.slice(0, colonIdx).trim();
  const afterColon = text.slice(colonIdx + 1).trim();

  // Separate base name from extensions like (O.S.), (V.O.), (CONT'D)
  const extRegex = /\(([^)]+)\)/g;
  const extensions: string[] = [];
  let extMatch: RegExpExecArray | null;

  while ((extMatch = extRegex.exec(charPart)) !== null) {
    extensions.push(extMatch[1]);
  }
  const baseName = charPart.replace(/\s*\([^)]*\)/g, '').trim();

  // Parse parenthetical and dialogue from after the colon
  const parenMatch = afterColon.match(/^(\([^)]*\))\s*/);
  const parenthetical = parenMatch ? parenMatch[1] : null;
  const dialogueRaw = parenMatch
    ? afterColon.slice(parenMatch[0].length)
    : afterColon;
  const dialogue = dialogueRaw.replace(/^"(.*)"$/, '$1');

  return { characterName: baseName, extensions, parenthetical, dialogue };
}

// ---------------------------------------------------------------------------
// Scene boundary extraction
// ---------------------------------------------------------------------------

function extractScenes(doc: TipTapNode): ParsedScene[] {
  const scenes: ParsedScene[] = [];
  let current: ParsedScene | null = null;
  let sceneNum = 0;

  for (const node of doc.content || []) {
    if (node.type === 'sceneHeading') {
      sceneNum++;
      const text = getNodeText(node);
      const match = text.match(/^(INT|EXT)\.?\s+(.+?)(?:\s*-\s*(.+))?$/i);

      current = {
        sceneNumber: sceneNum,
        intExt: (match?.[1]?.toUpperCase() || 'INT') as 'INT' | 'EXT',
        location: match?.[2]?.trim() || text,
        timeOfDay: match?.[3]?.trim() || null,
        nodes: [node],
      };
      scenes.push(current);
    } else if (current) {
      current.nodes.push(node);
    }
  }

  return scenes;
}

// ---------------------------------------------------------------------------
// Character extraction from dialogueLine nodes
// ---------------------------------------------------------------------------

function extractCharacters(scenes: ParsedScene[]): Map<string, ExtractedCharacter> {
  const characters = new Map<string, ExtractedCharacter>();

  for (const scene of scenes) {
    for (const node of scene.nodes) {
      if (node.type !== 'dialogueLine') continue;

      const parsed = parseDialogueLine(getNodeText(node));
      if (!parsed) continue;

      const key = parsed.characterName.toUpperCase();
      const existing = characters.get(key);

      if (existing) {
        existing.dialogueCount++;
        if (!existing.sceneNumbers.includes(scene.sceneNumber)) {
          existing.sceneNumbers.push(scene.sceneNumber);
        }
      } else {
        characters.set(key, {
          name: parsed.characterName,
          sceneNumbers: [scene.sceneNumber],
          dialogueCount: 1,
        });
      }
    }
  }

  return characters;
}

// ---------------------------------------------------------------------------
// Enrich character presence from action nodes
// ---------------------------------------------------------------------------

function enrichCharacterScenePresence(
  characters: Map<string, ExtractedCharacter>,
  scenes: ParsedScene[]
) {
  for (const scene of scenes) {
    for (const node of scene.nodes) {
      if (node.type !== 'action') continue;
      const text = getNodeText(node).toUpperCase();

      for (const [key, char] of characters) {
        if (text.includes(key) && !char.sceneNumbers.includes(scene.sceneNumber)) {
          char.sceneNumbers.push(scene.sceneNumber);
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Props extraction from action node CAPS words
// ---------------------------------------------------------------------------

const CAPS_IGNORE_SET = new Set([
  'INT', 'EXT', 'DAY', 'NIGHT', 'CONTINUOUS', 'LATER',
  'CUT', 'FADE', 'DISSOLVE', 'SMASH', 'MATCH',
  'POV', 'OS', 'VO', 'SFX', 'VFX', 'BG', 'FG',
  'MOMENTS', 'MORNING', 'AFTERNOON', 'EVENING', 'DAWN', 'DUSK',
  'THE', 'AND', 'BUT', 'FOR', 'NOT', 'ALL', 'HIS', 'HER',
  'THEN', 'WITH', 'FROM', 'INTO', 'ONTO', 'OVER',
]);

function extractCapsProps(
  scenes: ParsedScene[],
  knownCharacterKeys: Set<string>
): Map<string, ExtractedProp> {
  const props = new Map<string, ExtractedProp>();
  const capsWordRegex = /\b([A-Z]{2,}(?:\s+[A-Z]{2,})*)\b/g;

  for (const scene of scenes) {
    for (const node of scene.nodes) {
      if (node.type !== 'action') continue;

      const text = getNodeText(node);
      let match: RegExpExecArray | null;

      while ((match = capsWordRegex.exec(text)) !== null) {
        const propName = match[1];

        // Skip ignored screenplay terms
        if (CAPS_IGNORE_SET.has(propName)) continue;

        // Skip known character names
        if (knownCharacterKeys.has(propName)) continue;

        // Skip single short words that are likely false positives
        const words = propName.split(/\s+/);
        if (words.length === 1 && words[0].length <= 2) continue;

        const key = propName.toLowerCase();
        const existing = props.get(key);
        if (existing) {
          if (!existing.sceneNumbers.includes(scene.sceneNumber)) {
            existing.sceneNumbers.push(scene.sceneNumber);
          }
          existing.contexts.push(text.slice(0, 200));
        } else {
          props.set(key, {
            name: propName,
            sceneNumbers: [scene.sceneNumber],
            contexts: [text.slice(0, 200)],
          });
        }
      }
    }
  }

  return props;
}

// ---------------------------------------------------------------------------
// Main orchestrator
// ---------------------------------------------------------------------------

/**
 * Deterministically extract all entities from a TipTap JSON document.
 * Zero LLM calls — pure structure walking + regex.
 */
export function extractManifest(tiptapDoc: object): ScriptManifest {
  const doc = tiptapDoc as TipTapNode;
  const scenes = extractScenes(doc);
  const characters = extractCharacters(scenes);
  enrichCharacterScenePresence(characters, scenes);

  const knownCharacterKeys = new Set(characters.keys());
  const props = extractCapsProps(scenes, knownCharacterKeys);

  // Build global location list
  const locationSet = new Set<string>();
  for (const scene of scenes) {
    locationSet.add(scene.location);
  }

  // Build per-scene summaries
  const sceneSummaries: ScriptManifestScene[] = scenes.map((scene) => {
    const sceneChars = new Set<string>();
    const speakingChars = new Set<string>();
    const sceneProps = new Set<string>();
    let actionText = '';

    for (const node of scene.nodes) {
      const text = getNodeText(node);

      if (node.type === 'dialogueLine') {
        const parsed = parseDialogueLine(text);
        if (parsed) {
          const charKey = parsed.characterName.toUpperCase();
          sceneChars.add(charKey);
          speakingChars.add(charKey);
        }
      }

      if (node.type === 'action') {
        actionText += text + '\n';
        // Check for known characters in action text
        const upperText = text.toUpperCase();
        for (const key of characters.keys()) {
          if (upperText.includes(key)) {
            sceneChars.add(key);
          }
        }
        // Check for known props in action text
        for (const [key] of props) {
          if (text.toLowerCase().includes(key)) {
            sceneProps.add(key);
          }
        }
      }
    }

    // Map character keys back to canonical names
    const charNames = Array.from(sceneChars).map(
      (k) => characters.get(k)?.name || k
    );
    const speakingNames = Array.from(speakingChars).map(
      (k) => characters.get(k)?.name || k
    );
    // Map prop keys back to canonical names
    const propNames = Array.from(sceneProps).map(
      (k) => props.get(k)?.name || k
    );

    return {
      sceneNumber: scene.sceneNumber,
      heading: getNodeText(scene.nodes[0]),
      intExt: scene.intExt,
      location: scene.location,
      timeOfDay: scene.timeOfDay,
      characters: charNames,
      speakingCharacters: speakingNames,
      props: propNames,
      actionText: actionText.trim(),
    };
  });

  return {
    scenes: sceneSummaries,
    globalCharacters: characters,
    globalLocations: Array.from(locationSet),
    globalProps: props,
  };
}
