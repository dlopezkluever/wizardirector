/**
 * Shared JSON extraction/repair helper for parsing structured LLM output.
 *
 * Generalizes the fence-stripping + repair-loop logic originally written
 * inline in assetExtractionService.ts's entity-extraction pass. Every new
 * Streamline LLM caller that expects JSON back (classification, question
 * generation, reconciliation, standalone asset drafts, backfill) uses this
 * instead of re-implementing the same repair strategies.
 */

export class LLMJsonParseError extends Error {
  constructor(message: string, public rawContent: string) {
    super(message);
    this.name = 'LLMJsonParseError';
  }
}

function stripCodeFences(raw: string): string {
  let content = raw.trim();

  if (content.includes('```json')) {
    const match = content.match(/```json\s*([\s\S]*?)\s*```/);
    content = match ? match[1].trim() : content.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
  } else if (content.includes('```')) {
    const match = content.match(/```\s*([\s\S]*?)\s*```/);
    content = match ? match[1].trim() : content.replace(/```\n?/g, '').replace(/```\n?$/g, '');
  }

  return content;
}

function extractOuterBlock(content: string, kind: 'array' | 'object'): string {
  const pattern = kind === 'array' ? /\[[\s\S]*\]/ : /\{[\s\S]*\}/;
  const match = content.match(pattern);
  return match ? match[0] : content;
}

function repairArray(arrayText: string): unknown[] {
  // Strategy 1: strip trailing commas
  try {
    const cleaned = arrayText.replace(/,(\s*[}\]])/g, '$1');
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // fall through
  }

  // Strategy 2: truncate at the last complete top-level object
  try {
    let braceCount = 0;
    let lastCompleteIndex = -1;
    for (let i = arrayText.length - 2; i >= 0; i--) {
      if (arrayText[i] === '}') braceCount++;
      if (arrayText[i] === '{') {
        braceCount--;
        if (braceCount === 0) {
          lastCompleteIndex = i;
          break;
        }
      }
    }

    if (lastCompleteIndex > 0) {
      let objectEnd = lastCompleteIndex;
      let depth = 1;
      for (let i = lastCompleteIndex + 1; i < arrayText.length; i++) {
        if (arrayText[i] === '{') depth++;
        if (arrayText[i] === '}') {
          depth--;
          if (depth === 0) {
            objectEnd = i;
            break;
          }
        }
      }
      const truncated = arrayText.substring(0, objectEnd + 1) + ']';
      const parsed = JSON.parse(truncated);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // fall through
  }

  // Strategy 3: regex-extract every complete top-level object and reassemble
  const objectPattern = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
  const matches = arrayText.match(objectPattern);
  if (matches && matches.length > 0) {
    const parsed = JSON.parse('[' + matches.join(',') + ']');
    if (Array.isArray(parsed)) return parsed;
  }

  throw new Error('No repair strategy produced a valid JSON array');
}

function repairObject(objectText: string): Record<string, unknown> {
  try {
    const cleaned = objectText.replace(/,(\s*[}\]])/g, '$1');
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
  } catch {
    // fall through
  }

  throw new Error('No repair strategy produced a valid JSON object');
}

/**
 * Extracts and parses a JSON array from raw LLM text output, tolerating
 * markdown fences, surrounding prose, trailing commas, and truncated output.
 */
export function extractJsonArray<T = unknown>(rawContent: string): T[] {
  const stripped = stripCodeFences(rawContent);
  const block = extractOuterBlock(stripped, 'array');

  try {
    const parsed = JSON.parse(block);
    if (Array.isArray(parsed)) return parsed as T[];
    throw new Error('Parsed JSON is not an array');
  } catch (parseError) {
    try {
      return repairArray(block) as T[];
    } catch {
      throw new LLMJsonParseError(
        `Failed to parse JSON array from LLM response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
        rawContent
      );
    }
  }
}

/**
 * Extracts and parses a JSON object from raw LLM text output, tolerating
 * markdown fences, surrounding prose, and trailing commas.
 */
export function extractJsonObject<T = Record<string, unknown>>(rawContent: string): T {
  const stripped = stripCodeFences(rawContent);
  const block = extractOuterBlock(stripped, 'object');

  try {
    const parsed = JSON.parse(block);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as T;
    throw new Error('Parsed JSON is not an object');
  } catch (parseError) {
    try {
      return repairObject(block) as T;
    } catch {
      throw new LLMJsonParseError(
        `Failed to parse JSON object from LLM response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
        rawContent
      );
    }
  }
}
