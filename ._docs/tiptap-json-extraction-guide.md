# Extracting Assets, Dialogue & Scene Data from the TipTap JSON Document

**Context**: As of 2A.4/2A.5, Stage 4 now stores the master script as a structured TipTap JSON document (`tiptapDoc`) alongside the legacy `formattedScript` plain text. This guide explains how to leverage the structured JSON for deterministic, regex-free extraction of characters, dialogue, props, locations, and scene structure — and how this changes the asset extraction architecture described in `asset-system-overhaul-tasks.md`.

---

## 1. The TipTap JSON Structure

A saved `tiptapDoc` looks like this:

```json
{
  "type": "doc",
  "content": [
    {
      "type": "sceneHeading",
      "content": [{ "type": "text", "text": "INT. WAREHOUSE - NIGHT" }]
    },
    {
      "type": "action",
      "content": [{ "type": "text", "text": "A dim bulb swings from the ceiling. MARCUS (40s, wiry) paces near a rusted forklift." }]
    },
    {
      "type": "dialogueLine",
      "content": [{ "type": "text", "text": "MARCUS: \"We don't have time for this.\"" }]
    },
    {
      "type": "dialogueLine",
      "content": [{ "type": "text", "text": "ELENA (O.S.): (whispering) \"Then stop wasting it.\"" }]
    },
    {
      "type": "action",
      "content": [{ "type": "text", "text": "Marcus grabs the BRIEFCASE from the table and heads for the door." }]
    },
    {
      "type": "transition",
      "content": [{ "type": "text", "text": "CUT TO:" }]
    },
    {
      "type": "sceneHeading",
      "content": [{ "type": "text", "text": "EXT. ALLEY - NIGHT" }]
    }
  ]
}
```

### Node Types

| Node Type | Meaning | Example Text |
|-----------|---------|------|
| `sceneHeading` | Scene slug line | `INT. WAREHOUSE - NIGHT` |
| `action` | Action/description text | `Marcus grabs the BRIEFCASE...` |
| `dialogueLine` | Single inline dialogue block | `MARCUS: (angry) "Get out."` |
| `transition` | Editorial transition | `CUT TO:` |
| `paragraph` | Generic text (fallback) | Any untyped text |

The critical change is that **dialogue is no longer split across 3 separate nodes** (character → parenthetical → dialogue). It's a single `dialogueLine` node with a deterministic inline format:

```
CHARACTER_NAME: (optional parenthetical) "dialogue text"
```

With character extensions baked into the name:

```
CHARACTER_NAME (V.O.): "dialogue text"
CHARACTER_NAME (O.S.) (CONT'D): (whispering) "dialogue text"
```

---

## 2. Deterministic Extraction from JSON Nodes

### 2A. Walking the Document

Every extraction starts with a simple walk of `doc.content`:

```typescript
interface TipTapNode {
  type: string;
  content?: TipTapNode[];
  text?: string;
}

function getNodeText(node: TipTapNode): string {
  if (node.text) return node.text;
  if (!node.content) return '';
  return node.content.map(getNodeText).join('');
}

function walkDoc(doc: TipTapNode) {
  for (const node of doc.content || []) {
    switch (node.type) {
      case 'sceneHeading': /* ... */ break;
      case 'action':       /* ... */ break;
      case 'dialogueLine': /* ... */ break;
      case 'transition':   /* ... */ break;
    }
  }
}
```

No regex guessing. No "is this all-caps line a character or a yelling action?" ambiguity. The node type IS the classification.

### 2B. Extracting Scene Boundaries & Location Data

Every `sceneHeading` node marks a scene boundary. The heading text follows the standard format:

```
INT. LOCATION - TIME_OF_DAY
EXT. LOCATION - TIME_OF_DAY
```

```typescript
interface ParsedScene {
  sceneNumber: number;
  intExt: 'INT' | 'EXT';
  location: string;
  timeOfDay: string | null;
  nodes: TipTapNode[];  // All nodes belonging to this scene
}

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
```

**What this gives you**:
- `location` field → directly populates `expected_location` on the scenes table
- `intExt` + `timeOfDay` → metadata for frame generation context
- `nodes` array → the complete content of the scene, typed, for further extraction

### 2C. Extracting Characters from `dialogueLine` Nodes

This is where the new format shines. Every `dialogueLine` has the character name before the colon. No regex heuristics needed to distinguish character names from yelling action text.

```typescript
interface ExtractedCharacter {
  name: string;           // "MARCUS"
  extensions: string[];   // ["O.S.", "CONT'D"]
  sceneNumbers: number[]; // [1, 3, 5]
  dialogueCount: number;  // Number of lines spoken
}

function parseDialogueLine(text: string): {
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
  let baseName = charPart;
  let extMatch: RegExpExecArray | null;

  while ((extMatch = extRegex.exec(charPart)) !== null) {
    extensions.push(extMatch[1]);
  }
  baseName = charPart.replace(/\s*\([^)]*\)/g, '').trim();

  // Parse parenthetical and dialogue from after the colon
  const parenMatch = afterColon.match(/^(\([^)]*\))\s*/);
  const parenthetical = parenMatch ? parenMatch[1] : null;
  const dialogueRaw = parenMatch
    ? afterColon.slice(parenMatch[0].length)
    : afterColon;
  const dialogue = dialogueRaw.replace(/^"(.*)"$/, '$1');

  return { characterName: baseName, extensions, parenthetical, dialogue };
}

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
        for (const ext of parsed.extensions) {
          if (!existing.extensions.includes(ext)) {
            existing.extensions.push(ext);
          }
        }
      } else {
        characters.set(key, {
          name: parsed.characterName,
          extensions: parsed.extensions,
          sceneNumbers: [scene.sceneNumber],
          dialogueCount: 1,
        });
      }
    }
  }

  return characters;
}
```

**What this gives you**:
- **100% accurate character list** — no false positives from all-caps action text like `THE BUILDING EXPLODES`
- **Scene-level mapping** — which characters appear in which scenes (populates `expected_characters`)
- **Dialogue count** — useful for distinguishing main characters from one-line extras
- **Extensions** — `(O.S.)` means off-screen (voice only, no visual needed in that scene), `(V.O.)` means voiceover. This metadata is valuable for Stage 8/10 to know whether a character needs to be visually rendered in a given shot.

### 2D. Extracting Dialogue Text

For any feature that needs the actual dialogue content (e.g., building character voice profiles, generating audio, continuity checks):

```typescript
interface DialogueEntry {
  character: string;
  parenthetical: string | null;
  text: string;
  sceneNumber: number;
  orderInScene: number;  // Sequential position within the scene
}

function extractAllDialogue(scenes: ParsedScene[]): DialogueEntry[] {
  const entries: DialogueEntry[] = [];

  for (const scene of scenes) {
    let orderInScene = 0;
    for (const node of scene.nodes) {
      if (node.type !== 'dialogueLine') continue;

      const parsed = parseDialogueLine(getNodeText(node));
      if (!parsed) continue;

      entries.push({
        character: parsed.characterName,
        parenthetical: parsed.parenthetical,
        text: parsed.dialogue,
        sceneNumber: scene.sceneNumber,
        orderInScene: orderInScene++,
      });
    }
  }

  return entries;
}
```

This is a significant improvement. Previously, dialogue extraction from plain text required:
1. Detect all-caps line as character name (missed names with `.`, `'`, extensions)
2. Guess that the next non-parenthetical line is dialogue
3. Guess when the dialogue block ends

Now it's: find `dialogueLine` node, split on first colon, done. Zero ambiguity.

### 2E. Extracting Props from Action Nodes

Props still require some heuristic extraction since they live in natural-language action text. But the signal-to-noise ratio is much better because we **only search `action` nodes** — we're no longer accidentally scanning dialogue or scene headings.

```typescript
interface ExtractedProp {
  name: string;
  sceneNumbers: number[];
  contexts: string[];  // Surrounding text for LLM description generation
}

// Strategy 1: Caps-highlighted props (common screenplay convention)
// e.g., "Marcus grabs the BRIEFCASE" or "She picks up a REVOLVER"
function extractCapsProps(scenes: ParsedScene[]): Map<string, ExtractedProp> {
  const props = new Map<string, ExtractedProp>();
  const capsWordRegex = /\b([A-Z]{2,}(?:\s+[A-Z]{2,})*)\b/g;

  // Words to ignore (scene-level terms, common screenplay words)
  const ignore = new Set([
    'INT', 'EXT', 'DAY', 'NIGHT', 'CONTINUOUS', 'LATER',
    'CUT', 'FADE', 'DISSOLVE', 'SMASH', 'MATCH',
    'POV', 'OS', 'VO', 'SFX', 'VFX', 'BG', 'FG',
  ]);

  for (const scene of scenes) {
    for (const node of scene.nodes) {
      if (node.type !== 'action') continue;

      const text = getNodeText(node);
      let match: RegExpExecArray | null;

      while ((match = capsWordRegex.exec(text)) !== null) {
        const propName = match[1];
        if (ignore.has(propName)) continue;
        // Ignore if it looks like a character name we already know
        // (cross-reference with extracted characters)

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
```

**Strategy 2**: For non-caps props, a lightweight LLM call on the collected `action` node texts is still the best approach (this is what the existing `extractEntityMentions` does). But now you can send *only* action text, not the entire script — significantly fewer tokens.

### 2F. Extracting Characters Mentioned in Action Nodes

Characters don't only appear in dialogue. They're also mentioned in action lines:

```
Marcus grabs the briefcase. Elena watches from the shadows.
```

Once you have the character list from `dialogueLine` nodes (Section 2C), you can scan action text for those known names:

```typescript
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
```

This catches characters who appear in a scene but don't speak (e.g., a character who is only described in action lines in a particular scene).

---

## 3. The Unified Extraction Function

Instead of running separate extractions at Stage 5, Stage 6, and Stage 8, build one function that produces the complete manifest from the `tiptapDoc`:

```typescript
interface ScriptManifest {
  scenes: Array<{
    sceneNumber: number;
    heading: string;
    intExt: 'INT' | 'EXT';
    location: string;
    timeOfDay: string | null;
    characters: string[];        // Names of characters present
    speakingCharacters: string[]; // Subset who have dialogue
    props: string[];
    dialogueEntries: DialogueEntry[];
    actionText: string;          // Combined action text for LLM context
  }>;
  globalCharacters: Map<string, ExtractedCharacter>;
  globalLocations: string[];     // Deduplicated location list
  globalProps: Map<string, ExtractedProp>;
  totalDialogueEntries: number;
}

function extractManifest(tiptapDoc: object): ScriptManifest {
  const scenes = extractScenes(tiptapDoc as TipTapNode);
  const characters = extractCharacters(scenes);
  enrichCharacterScenePresence(characters, scenes);
  const props = extractCapsProps(scenes);

  // Build location list from scene headings
  const locationSet = new Set<string>();
  for (const scene of scenes) {
    locationSet.add(scene.location);
  }

  // Build per-scene summaries
  const sceneSummaries = scenes.map(scene => {
    const sceneChars = new Set<string>();
    const speakingChars = new Set<string>();
    const sceneDialogue: DialogueEntry[] = [];
    const sceneProps = new Set<string>();
    let actionText = '';
    let dialogueOrder = 0;

    for (const node of scene.nodes) {
      const text = getNodeText(node);

      if (node.type === 'dialogueLine') {
        const parsed = parseDialogueLine(text);
        if (parsed) {
          const charKey = parsed.characterName.toUpperCase();
          sceneChars.add(charKey);
          speakingChars.add(charKey);
          sceneDialogue.push({
            character: parsed.characterName,
            parenthetical: parsed.parenthetical,
            text: parsed.dialogue,
            sceneNumber: scene.sceneNumber,
            orderInScene: dialogueOrder++,
          });
        }
      }

      if (node.type === 'action') {
        actionText += text + '\n';
        // Check for known characters in action text
        for (const [key] of characters) {
          if (text.toUpperCase().includes(key)) {
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

    return {
      sceneNumber: scene.sceneNumber,
      heading: getNodeText(scene.nodes[0]),
      intExt: scene.intExt,
      location: scene.location,
      timeOfDay: scene.timeOfDay,
      characters: Array.from(sceneChars),
      speakingCharacters: Array.from(speakingChars),
      props: Array.from(sceneProps),
      dialogueEntries: sceneDialogue,
      actionText: actionText.trim(),
    };
  });

  return {
    scenes: sceneSummaries,
    globalCharacters: characters,
    globalLocations: Array.from(locationSet),
    globalProps: props,
    totalDialogueEntries: sceneSummaries.reduce(
      (sum, s) => sum + s.dialogueEntries.length, 0
    ),
  };
}
```

---

## 4. How This Changes the Asset Extraction Pipeline

### Current Flow (Before This Change)

```
Stage 4: Script stored as formattedScript (plain text)
         ↓
         scriptService.extractScenes() — regex on plain text
         ↓
         persistScenes() — saves to DB with EMPTY expected_characters/props/location
         ↓
Stage 5: projectAssets.extract route
         ↓
         assetExtractionService.aggregateSceneDependencies()
         ↓
         Reads scenes.expected_characters/props/location from DB
         ↓
         PROBLEM: These fields are EMPTY at persist time!
         They only get populated later, or by a separate LLM call.
```

The current `sceneService.previewScenes()` explicitly sets these to empty:
```typescript
expectedCharacters: [], // Future enhancement
expectedLocation: '',   // Future enhancement
expectedProps: [],       // Future enhancement
```

### New Flow (With tiptapDoc)

```
Stage 4: Script stored as tiptapDoc (structured JSON) + formattedScript
         ↓
         extractManifest(tiptapDoc) — deterministic JSON walk
         ↓
         Produces: per-scene characters, locations, props, dialogue
         ↓
         persistScenes() — saves to DB WITH populated dependencies
         ↓
Stage 5: assetExtractionService.aggregateSceneDependencies()
         ↓
         Reads POPULATED expected_characters/props/location from DB
         ↓
         Pass 2 (LLM): Only needs to generate visual descriptions
         (Entity identification is already done — no Pass 1 LLM needed)
```

### What Needs to Change

**1. Scene persistence must include extracted dependencies.**

When `scriptService.persistScenes()` is called (during Approve Script), the request body should include the extracted characters, props, and locations for each scene. The manifest extraction should run on the `tiptapDoc` before persistence:

```typescript
// In handleApproveScript or persistScenes:
const manifest = extractManifest(stageContent.tiptapDoc);

const requestBody = {
  scenes: manifest.scenes.map(scene => ({
    sceneNumber: scene.sceneNumber,
    slug: generateSlug(scene.heading),
    scriptExcerpt: scene.actionText + /* dialogue text */,
    expectedCharacters: scene.characters,
    expectedLocation: scene.location,
    expectedProps: scene.props,
  }))
};
```

**2. The backend `aggregateSceneDependencies()` already works — it just needs populated data.**

The method in `assetExtractionService.ts` reads `expected_characters`, `expected_location`, and `expected_props` from the scenes table. Once scene persistence populates these fields, the downstream extraction pipeline works without changes.

**3. The deprecated `extractEntityMentions()` LLM call (Pass 1) can be fully removed.**

The current code already marks it as `@deprecated`. With deterministic extraction from `tiptapDoc`, there's no need for an LLM to identify entity names. The LLM's role reduces to Pass 2 only: generating visual descriptions for already-identified entities.

**4. The `sceneService.previewScenes()` should use the manifest.**

Instead of returning empty arrays for `expectedCharacters`/`expectedProps`/`expectedLocation`, preview scenes should run the manifest extraction to show users what will be extracted.

---

## 5. Dialogue Extraction — What Was Missing Before

The old system had **no structured dialogue extraction at all**. The `expected_characters` field on scenes was populated (when it was populated) by an LLM scanning the full script — expensive and unreliable. Character names with extensions like `(O.S.)` were frequently missed by the old regex `^[A-Z\s]+$`.

With the new `dialogueLine` node type, dialogue extraction is:

1. **Complete** — every line of dialogue is captured because every dialogue line IS a `dialogueLine` node
2. **Attributed** — character name is always the text before the first colon
3. **Extension-aware** — `(O.S.)`, `(V.O.)`, `(CONT'D)` are part of the character section, parsed cleanly
4. **Scene-mapped** — dialogue entries are naturally grouped under their parent scene heading
5. **Parenthetical-aware** — delivery instructions like `(whispering)`, `(angry)` are captured, which is useful for audio generation context

### What dialogue data enables downstream:

| Stage | How Dialogue Data Helps |
|-------|------------------------|
| **Stage 5** | Character identification (anyone who speaks = character asset). Dialogue count distinguishes leads from extras. |
| **Stage 6** | Scene dependencies: speaking characters MUST be present. `(O.S.)` characters are present but off-screen. |
| **Stage 7** | Shot list generation: dialogue lines inform shot structure (two-shots, over-shoulder, close-ups). |
| **Stage 8** | Visual state: parentheticals like `(crying)`, `(bloodied)` inform how a character should look in that scene. |
| **Stage 9** | Audio/music: dialogue text is the source material for voice generation. |
| **Stage 10** | Frame composition: which characters are speaking determines camera focus. |

---

## 6. Where to Implement the Extraction Utility

Create a single utility module that all stages can import:

```
src/lib/utils/script-manifest.ts    ← NEW: The unified extraction module
```

This module exports:
- `extractManifest(tiptapDoc)` — full extraction
- `extractSceneStructure(tiptapDoc)` — scenes only (lightweight)
- `extractCharacterList(tiptapDoc)` — characters only
- `extractDialogue(tiptapDoc)` — dialogue only
- `parseDialogueLine(text)` — single line parser (reusable)

The module operates purely on the JSON structure — no DOM, no regex for classification, no LLM calls. It runs client-side or server-side with zero dependencies.

### Backend Equivalent

The same logic should exist in the backend for when extraction happens server-side (e.g., during scene persistence or asset extraction). Either:
- Share the code as a package, or
- Duplicate the extraction logic in `backend/src/utils/scriptManifest.ts`

Since the logic is pure functions over JSON (no DOM APIs), it works identically in both environments.

---

## 7. Migration Notes

- **Existing projects with only `formattedScript`**: When loaded, the state-machine parser (`parseScriptToTiptapJson`) converts plain text to `tiptapDoc` on-the-fly. The next save migrates the data forward. Extraction should check for `tiptapDoc` first, fall back to `formattedScript` parsing.
- **Scenes already in the DB with empty dependency fields**: A one-time backfill job can re-extract from `tiptapDoc` (or parse `formattedScript`) and update the `expected_*` columns.
- **The `formattedScript` field is still maintained** for backward compatibility and for `scriptService.extractScenes()` which uses plain-text regex. Over time, the plain-text extraction can be deprecated in favor of the JSON-based manifest extraction.
