import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'fs';
import path from 'path';

/**
 * Regression guard for the bug fixed in commit 9e9813e: migration 040 added
 * shots.selected_continuity_base_frame_id -> frames.id, giving `frames` and
 * `shots` a second FK path. Any implicit `shots(...)` / `shots!inner(...)`
 * embed on a `.from('frames')` query becomes ambiguous to PostgREST
 * (PGRST201), and the JS client silently returns an empty result instead of
 * surfacing an error — so this can't be caught by mocked-supabase unit
 * tests. The only safe form is an explicit relationship name, e.g.
 * `shots!frames_shot_id_fkey(...)`.
 *
 * This test statically scans the files that query `frames` with a `shots`
 * embed and fails if a bare/unqualified embed is reintroduced.
 */

const FILES_WITH_FRAMES_TO_SHOTS_EMBEDS = [
  '../services/frameGenerationService.ts',
  '../services/continuityBaseService.ts',
  '../routes/frames.ts',
];

// Matches `shots(`, `shots!inner(`, `shots!some_fk(`, `shots!some_fk!inner(`.
// Group 2 is the relationship-name token (if any); it must not be missing,
// and must not merely be the `inner` join-type modifier.
const SHOTS_EMBED_PATTERN = /shots(!(\w+))?(!inner)?\s*\(/g;

describe('frames -> shots embed regression guard (PGRST201 ambiguity)', () => {
  it.each(FILES_WITH_FRAMES_TO_SHOTS_EMBEDS)('every shots embed in %s is explicitly qualified', (relativePath) => {
    const filePath = path.resolve(__dirname, relativePath);
    const source = readFileSync(filePath, 'utf8');

    const matches = [...source.matchAll(SHOTS_EMBED_PATTERN)];
    expect(matches.length).toBeGreaterThan(0);

    const unqualified = matches.filter(match => {
      const relationshipName = match[2];
      return !relationshipName || relationshipName === 'inner';
    });

    if (unqualified.length > 0) {
      const context = unqualified.map(m => m[0]).join(', ');
      throw new Error(
        `Found unqualified "shots" embed(s) in ${relativePath}: ${context}. ` +
        `frames<->shots has two FK paths since migration 040; use the explicit ` +
        `"shots!frames_shot_id_fkey(...)" relationship name to avoid PostgREST PGRST201 ambiguity.`
      );
    }
  });

  it('documents the explicit relationship name used to disambiguate', () => {
    const source = readFileSync(path.resolve(__dirname, '../services/frameGenerationService.ts'), 'utf8');
    expect(source).toContain('shots!frames_shot_id_fkey');
  });
});
