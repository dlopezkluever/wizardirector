/**
 * Transformation Event System Tests
 *
 * Tests the core resolution algorithm with scripted scenes:
 * - Cinderella scenario: within_shot transformation at midnight
 * - Disguise scenario: instant costume swap between shots
 * - Gradual scenario: poison spreading across multiple shots
 * - Stacking scenario: two transformations on the same character
 * - No-events backward compat: zero events = zero overrides
 */

import { TransformationEventService } from '../services/transformationEventService';
import type { TransformationEvent, ShotAssetOverride } from '../services/transformationEventService';

// Create a fresh instance (no DB calls in resolveOverridesForShot — it's pure logic)
const service = new TransformationEventService();

// ---------------------------------------------------------------------------
// Helpers to build test fixtures
// ---------------------------------------------------------------------------

function makeShot(id: string, shotId: string, order: number) {
  return { id, shot_id: shotId, shot_order: order };
}

function makeAsset(id: string, description: string, imageUrl?: string) {
  return { id, effective_description: description, image_key_url: imageUrl ?? null };
}

function makeEvent(
  overrides: Partial<TransformationEvent> & {
    scene_asset_instance_id: string;
    trigger_shot_id: string;
    transformation_type: 'instant' | 'gradual' | 'within_shot';
    pre_description: string;
    post_description: string;
  }
): TransformationEvent {
  return {
    id: overrides.id ?? 'evt-' + Math.random().toString(36).slice(2, 8),
    scene_id: overrides.scene_id ?? 'scene-1',
    scene_asset_instance_id: overrides.scene_asset_instance_id,
    trigger_shot_id: overrides.trigger_shot_id,
    transformation_type: overrides.transformation_type,
    completion_shot_id: overrides.completion_shot_id ?? null,
    pre_description: overrides.pre_description,
    post_description: overrides.post_description,
    transformation_narrative: overrides.transformation_narrative ?? null,
    pre_image_key_url: overrides.pre_image_key_url ?? null,
    post_image_key_url: overrides.post_image_key_url ?? null,
    pre_status_tags: overrides.pre_status_tags ?? [],
    post_status_tags: overrides.post_status_tags ?? [],
    detected_by: overrides.detected_by ?? 'manual',
    confirmed: overrides.confirmed ?? true, // tests default to confirmed
    confirmed_at: overrides.confirmed_at ?? '2026-01-01T00:00:00Z',
    created_at: overrides.created_at ?? '2026-01-01T00:00:00Z',
    updated_at: overrides.updated_at ?? '2026-01-01T00:00:00Z',
    trigger_shot: overrides.trigger_shot ?? undefined,
    completion_shot: overrides.completion_shot ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// Scenario 1: Cinderella — within_shot transformation at midnight
//
// Scene: 4 shots. Shot 2 is the trigger (dress transforms ON CAMERA).
// Expected:
//   Shot 1 (before): no override
//   Shot 2 (at trigger): pre_description + is_transforming=true
//   Shot 3 (after): post_description
//   Shot 4 (after): post_description
// ---------------------------------------------------------------------------

describe('Transformation Resolution — within_shot (Cinderella)', () => {
  const shots = [
    makeShot('s1', '1A', 0),
    makeShot('s2', '1B', 1), // trigger
    makeShot('s3', '1C', 2),
    makeShot('s4', '1D', 3),
  ];

  const cinderella = makeAsset('asset-cin', 'Young woman in a tattered blue dress, bare feet, soot on cheeks');

  const event = makeEvent({
    scene_asset_instance_id: 'asset-cin',
    trigger_shot_id: 's2',
    transformation_type: 'within_shot',
    pre_description: 'Young woman in a tattered blue dress, bare feet, soot on cheeks',
    post_description: 'Radiant woman in a shimmering silver ball gown, glass slippers, hair in an elegant updo',
    transformation_narrative: 'Magic swirls around her — the tattered dress dissolves into sparkling particles that reform as a silver ball gown. Glass slippers crystallize on her feet.',
    post_image_key_url: 'https://example.com/cinderella-transformed.png',
    trigger_shot: { id: 's2', shot_id: '1B', shot_order: 1 },
  });

  it('shot BEFORE trigger → no override', () => {
    const overrides = service.resolveOverridesForShot(shots[0], [cinderella], [event], shots);
    expect(overrides).toHaveLength(0);
  });

  it('shot AT trigger → is_transforming=true, keeps pre_description, includes narrative and post', () => {
    const overrides = service.resolveOverridesForShot(shots[1], [cinderella], [event], shots);
    expect(overrides).toHaveLength(1);
    const o = overrides[0];
    expect(o.asset_instance_id).toBe('asset-cin');
    expect(o.is_transforming).toBe(true);
    expect(o.effective_description).toBe(cinderella.effective_description); // still pre
    expect(o.transformation_narrative).toContain('Magic swirls');
    expect(o.post_description).toContain('silver ball gown');
    expect(o.post_image_key_url).toBe('https://example.com/cinderella-transformed.png');
  });

  it('shot AFTER trigger → post_description, not transforming', () => {
    const overrides = service.resolveOverridesForShot(shots[2], [cinderella], [event], shots);
    expect(overrides).toHaveLength(1);
    const o = overrides[0];
    expect(o.effective_description).toContain('silver ball gown');
    expect(o.is_transforming).toBe(false);
    expect(o.image_key_url).toBe('https://example.com/cinderella-transformed.png');
  });

  it('last shot → still post_description', () => {
    const overrides = service.resolveOverridesForShot(shots[3], [cinderella], [event], shots);
    expect(overrides).toHaveLength(1);
    expect(overrides[0].effective_description).toContain('silver ball gown');
  });
});

// ---------------------------------------------------------------------------
// Scenario 2: Spy disguise — instant transformation between shots
//
// Scene: 3 shots. Between shot 1 and shot 2, the spy puts on a disguise (cut).
// Expected:
//   Shot 1 (before trigger): no override
//   Shot 2 (at trigger): post_description (instant = immediate swap)
//   Shot 3 (after): post_description
// ---------------------------------------------------------------------------

describe('Transformation Resolution — instant (Spy Disguise)', () => {
  const shots = [
    makeShot('s1', '2A', 0),
    makeShot('s2', '2B', 1), // trigger
    makeShot('s3', '2C', 2),
  ];

  const spy = makeAsset('asset-spy', 'Man in black tactical gear, buzz cut, scarred jaw');

  const event = makeEvent({
    scene_asset_instance_id: 'asset-spy',
    trigger_shot_id: 's2',
    transformation_type: 'instant',
    pre_description: 'Man in black tactical gear, buzz cut, scarred jaw',
    post_description: 'Man in grey janitor uniform, fake mustache, glasses, hunched posture',
    trigger_shot: { id: 's2', shot_id: '2B', shot_order: 1 },
  });

  it('shot BEFORE trigger → no override', () => {
    const overrides = service.resolveOverridesForShot(shots[0], [spy], [event], shots);
    expect(overrides).toHaveLength(0);
  });

  it('shot AT trigger → post_description (instant swap)', () => {
    const overrides = service.resolveOverridesForShot(shots[1], [spy], [event], shots);
    expect(overrides).toHaveLength(1);
    expect(overrides[0].effective_description).toContain('janitor uniform');
    expect(overrides[0].is_transforming).toBe(false); // instant = not "transforming on camera"
  });

  it('shot AFTER trigger → still post_description', () => {
    const overrides = service.resolveOverridesForShot(shots[2], [spy], [event], shots);
    expect(overrides).toHaveLength(1);
    expect(overrides[0].effective_description).toContain('janitor uniform');
  });
});

// ---------------------------------------------------------------------------
// Scenario 3: Poison spreading — gradual transformation across shots
//
// Scene: 5 shots. Trigger at shot 2, completion at shot 4.
// Expected:
//   Shot 1: no override
//   Shot 2 (trigger): no override (gradual = still pre mid-transition)
//   Shot 3 (between): no override (still mid-transition)
//   Shot 4 (completion): post_description
//   Shot 5 (after completion): post_description
// ---------------------------------------------------------------------------

describe('Transformation Resolution — gradual (Poison Spreading)', () => {
  const shots = [
    makeShot('s1', '3A', 0),
    makeShot('s2', '3B', 1), // trigger
    makeShot('s3', '3C', 2), // mid-transition
    makeShot('s4', '3D', 3), // completion
    makeShot('s5', '3E', 4),
  ];

  const victim = makeAsset('asset-vic', 'Healthy man with ruddy complexion, bright eyes');

  const event = makeEvent({
    scene_asset_instance_id: 'asset-vic',
    trigger_shot_id: 's2',
    completion_shot_id: 's4',
    transformation_type: 'gradual',
    pre_description: 'Healthy man with ruddy complexion, bright eyes',
    post_description: 'Pale, sweating man with dark veins visible on neck, glassy unfocused eyes',
    trigger_shot: { id: 's2', shot_id: '3B', shot_order: 1 },
    completion_shot: { id: 's4', shot_id: '3D', shot_order: 3 },
  });

  it('shot BEFORE trigger → no override', () => {
    const overrides = service.resolveOverridesForShot(shots[0], [victim], [event], shots);
    expect(overrides).toHaveLength(0);
  });

  it('shot AT trigger → no override (gradual mid-transition)', () => {
    const overrides = service.resolveOverridesForShot(shots[1], [victim], [event], shots);
    expect(overrides).toHaveLength(0);
  });

  it('shot BETWEEN trigger and completion → no override (mid-transition)', () => {
    const overrides = service.resolveOverridesForShot(shots[2], [victim], [event], shots);
    expect(overrides).toHaveLength(0);
  });

  it('shot AT completion → post_description', () => {
    const overrides = service.resolveOverridesForShot(shots[3], [victim], [event], shots);
    expect(overrides).toHaveLength(1);
    expect(overrides[0].effective_description).toContain('dark veins');
  });

  it('shot AFTER completion → post_description', () => {
    const overrides = service.resolveOverridesForShot(shots[4], [victim], [event], shots);
    expect(overrides).toHaveLength(1);
    expect(overrides[0].effective_description).toContain('dark veins');
  });
});

// ---------------------------------------------------------------------------
// Scenario 4: Stacking — two sequential transformations on the same character
//
// Persephone: blonde nature princess → dark goth queen → final ethereal form
// Event A: instant at shot 2 (blonde → goth)
// Event B: within_shot at shot 4 (goth → ethereal)
// ---------------------------------------------------------------------------

describe('Transformation Resolution — stacking (Persephone double transform)', () => {
  const shots = [
    makeShot('s1', '4A', 0),
    makeShot('s2', '4B', 1), // event A trigger
    makeShot('s3', '4C', 2),
    makeShot('s4', '4D', 3), // event B trigger
    makeShot('s5', '4E', 4),
  ];

  const persephone = makeAsset('asset-pers', 'Blonde woman in flowing green dress with flowers in her hair');

  const eventA = makeEvent({
    id: 'evt-a',
    scene_asset_instance_id: 'asset-pers',
    trigger_shot_id: 's2',
    transformation_type: 'instant',
    pre_description: 'Blonde woman in flowing green dress with flowers in her hair',
    post_description: 'Dark-haired woman in black leather dress, thorny crown, pale skin',
    trigger_shot: { id: 's2', shot_id: '4B', shot_order: 1 },
  });

  const eventB = makeEvent({
    id: 'evt-b',
    scene_asset_instance_id: 'asset-pers',
    trigger_shot_id: 's4',
    transformation_type: 'within_shot',
    pre_description: 'Dark-haired woman in black leather dress, thorny crown, pale skin',
    post_description: 'Ethereal figure with silver-white hair, translucent robes, glowing eyes',
    transformation_narrative: 'She raises her arms and her dark form shatters like glass, revealing the luminous being beneath.',
    trigger_shot: { id: 's4', shot_id: '4D', shot_order: 3 },
  });

  const events = [eventA, eventB];

  it('shot 1 (before both) → no override', () => {
    const overrides = service.resolveOverridesForShot(shots[0], [persephone], events, shots);
    expect(overrides).toHaveLength(0);
  });

  it('shot 2 (event A instant trigger) → goth description', () => {
    const overrides = service.resolveOverridesForShot(shots[1], [persephone], events, shots);
    expect(overrides).toHaveLength(1);
    expect(overrides[0].effective_description).toContain('black leather dress');
    expect(overrides[0].is_transforming).toBe(false);
  });

  it('shot 3 (between events) → still goth', () => {
    const overrides = service.resolveOverridesForShot(shots[2], [persephone], events, shots);
    expect(overrides).toHaveLength(1);
    expect(overrides[0].effective_description).toContain('black leather dress');
  });

  it('shot 4 (event B within_shot trigger) → goth + transforming to ethereal', () => {
    const overrides = service.resolveOverridesForShot(shots[3], [persephone], events, shots);
    expect(overrides).toHaveLength(1);
    const o = overrides[0];
    // At trigger of within_shot: the "current" accumulated description is goth (from event A)
    // but is_transforming is true because event B is within_shot at this shot
    expect(o.is_transforming).toBe(true);
    expect(o.post_description).toContain('Ethereal figure');
    expect(o.transformation_narrative).toContain('dark form shatters');
  });

  it('shot 5 (after both) → ethereal description', () => {
    const overrides = service.resolveOverridesForShot(shots[4], [persephone], events, shots);
    expect(overrides).toHaveLength(1);
    expect(overrides[0].effective_description).toContain('Ethereal figure');
    expect(overrides[0].is_transforming).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Scenario 5: No events — backward compatibility
// ---------------------------------------------------------------------------

describe('Transformation Resolution — no events (backward compat)', () => {
  const shots = [makeShot('s1', '5A', 0), makeShot('s2', '5B', 1)];
  const asset = makeAsset('asset-x', 'A regular person');

  it('returns empty array when no events exist', () => {
    const overrides = service.resolveOverridesForShot(shots[0], [asset], [], shots);
    expect(overrides).toHaveLength(0);
  });

  it('returns empty array when events exist but none are confirmed', () => {
    const unconfirmed = makeEvent({
      scene_asset_instance_id: 'asset-x',
      trigger_shot_id: 's1',
      transformation_type: 'instant',
      pre_description: 'A regular person',
      post_description: 'A different person',
      confirmed: false,
      confirmed_at: null,
      trigger_shot: { id: 's1', shot_id: '5A', shot_order: 0 },
    });
    const overrides = service.resolveOverridesForShot(shots[1], [asset], [unconfirmed], shots);
    expect(overrides).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Scenario 6: Multi-asset — two characters transform at different points
//
// Romeo: instant at shot 2
// Juliet: within_shot at shot 3
// Other character (Nurse): no transformation, no overrides
// ---------------------------------------------------------------------------

describe('Transformation Resolution — multi-asset (Romeo + Juliet)', () => {
  const shots = [
    makeShot('s1', '6A', 0),
    makeShot('s2', '6B', 1),
    makeShot('s3', '6C', 2),
    makeShot('s4', '6D', 3),
  ];

  const romeo = makeAsset('asset-romeo', 'Young man in Montague house colors, blue doublet');
  const juliet = makeAsset('asset-juliet', 'Young woman in white nightgown, hair down');
  const nurse = makeAsset('asset-nurse', 'Older woman in simple brown dress');

  const romeoEvent = makeEvent({
    scene_asset_instance_id: 'asset-romeo',
    trigger_shot_id: 's2',
    transformation_type: 'instant',
    pre_description: romeo.effective_description,
    post_description: 'Young man in dark hooded cloak disguising Montague colors',
    trigger_shot: { id: 's2', shot_id: '6B', shot_order: 1 },
  });

  const julietEvent = makeEvent({
    scene_asset_instance_id: 'asset-juliet',
    trigger_shot_id: 's3',
    transformation_type: 'within_shot',
    pre_description: juliet.effective_description,
    post_description: 'Young woman in crimson wedding dress, veil lifted, hair braided with roses',
    transformation_narrative: 'She unfurls the crimson wedding dress over her nightgown, the fabric cascading down.',
    trigger_shot: { id: 's3', shot_id: '6C', shot_order: 2 },
  });

  const allAssets = [romeo, juliet, nurse];
  const allEvents = [romeoEvent, julietEvent];

  it('shot 1 → no overrides for anyone', () => {
    const overrides = service.resolveOverridesForShot(shots[0], allAssets, allEvents, shots);
    expect(overrides).toHaveLength(0);
  });

  it('shot 2 → Romeo overridden (instant), Juliet and Nurse unchanged', () => {
    const overrides = service.resolveOverridesForShot(shots[1], allAssets, allEvents, shots);
    expect(overrides).toHaveLength(1);
    expect(overrides[0].asset_instance_id).toBe('asset-romeo');
    expect(overrides[0].effective_description).toContain('hooded cloak');
  });

  it('shot 3 → Romeo still overridden, Juliet transforming, Nurse unchanged', () => {
    const overrides = service.resolveOverridesForShot(shots[2], allAssets, allEvents, shots);
    expect(overrides).toHaveLength(2);

    const romeoOverride = overrides.find(o => o.asset_instance_id === 'asset-romeo');
    const julietOverride = overrides.find(o => o.asset_instance_id === 'asset-juliet');

    expect(romeoOverride).toBeDefined();
    expect(romeoOverride!.effective_description).toContain('hooded cloak');
    expect(romeoOverride!.is_transforming).toBe(false);

    expect(julietOverride).toBeDefined();
    expect(julietOverride!.is_transforming).toBe(true);
    expect(julietOverride!.post_description).toContain('crimson wedding dress');
  });

  it('shot 4 → Romeo and Juliet both in post state, Nurse still unchanged', () => {
    const overrides = service.resolveOverridesForShot(shots[3], allAssets, allEvents, shots);
    expect(overrides).toHaveLength(2);

    const romeoOverride = overrides.find(o => o.asset_instance_id === 'asset-romeo');
    const julietOverride = overrides.find(o => o.asset_instance_id === 'asset-juliet');

    expect(romeoOverride!.effective_description).toContain('hooded cloak');
    expect(julietOverride!.effective_description).toContain('crimson wedding dress');
    expect(julietOverride!.is_transforming).toBe(false);

    // Nurse should never appear in overrides
    expect(overrides.find(o => o.asset_instance_id === 'asset-nurse')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Scenario 7: Shot order resolution via allShots fallback
// (when trigger_shot join data is missing, uses allShots array)
// ---------------------------------------------------------------------------

describe('Transformation Resolution — shot order fallback', () => {
  const shots = [
    makeShot('s1', '7A', 0),
    makeShot('s2', '7B', 1),
    makeShot('s3', '7C', 2),
  ];

  const asset = makeAsset('asset-fb', 'Person in blue');

  const event = makeEvent({
    scene_asset_instance_id: 'asset-fb',
    trigger_shot_id: 's2',
    transformation_type: 'instant',
    pre_description: 'Person in blue',
    post_description: 'Person in red',
    // No trigger_shot join data — force allShots fallback
    trigger_shot: undefined,
  });

  it('resolves correctly using allShots fallback when join data is missing', () => {
    // Before trigger
    expect(service.resolveOverridesForShot(shots[0], [asset], [event], shots)).toHaveLength(0);
    // At trigger
    const atTrigger = service.resolveOverridesForShot(shots[1], [asset], [event], shots);
    expect(atTrigger).toHaveLength(1);
    expect(atTrigger[0].effective_description).toBe('Person in red');
    // After trigger
    const after = service.resolveOverridesForShot(shots[2], [asset], [event], shots);
    expect(after).toHaveLength(1);
    expect(after[0].effective_description).toBe('Person in red');
  });
});
