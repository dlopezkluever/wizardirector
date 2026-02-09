/**
 * Smoke test for extractManifest() — run with:
 *   cd backend && npx tsx src/tests/scriptManifest.smoke.ts
 */
import { extractManifest } from '../utils/scriptManifest.js';

const sampleDoc = {
  type: 'doc',
  content: [
    {
      type: 'sceneHeading',
      content: [{ type: 'text', text: 'INT. KITCHEN - DAY' }],
    },
    {
      type: 'action',
      content: [
        { type: 'text', text: 'ALICE enters the room. She picks up a REVOLVER from the counter.' },
      ],
    },
    {
      type: 'dialogueLine',
      content: [{ type: 'text', text: 'ALICE: Where did this come from?' }],
    },
    {
      type: 'dialogueLine',
      content: [{ type: 'text', text: 'BOB (O.S.): Don\'t touch that!' }],
    },
    {
      type: 'sceneHeading',
      content: [{ type: 'text', text: 'EXT. GARDEN - NIGHT' }],
    },
    {
      type: 'action',
      content: [
        { type: 'text', text: 'BOB sits on a bench. A LETTER lies next to him.' },
      ],
    },
    {
      type: 'dialogueLine',
      content: [{ type: 'text', text: 'BOB: I should have told her.' }],
    },
  ],
};

const manifest = extractManifest(sampleDoc);

console.log('=== Scenes ===');
for (const s of manifest.scenes) {
  console.log(`  Scene ${s.sceneNumber}: ${s.heading}`);
  console.log(`    Location: ${s.location} | IntExt: ${s.intExt} | Time: ${s.timeOfDay}`);
  console.log(`    Characters: ${s.characters.join(', ')}`);
  console.log(`    Speaking: ${s.speakingCharacters.join(', ')}`);
  console.log(`    Props: ${s.props.join(', ')}`);
}

console.log('\n=== Global Characters ===');
for (const [key, char] of manifest.globalCharacters) {
  console.log(`  ${char.name} — scenes: [${char.sceneNumbers}], dialogue: ${char.dialogueCount}`);
}

console.log('\n=== Global Locations ===');
console.log(`  ${manifest.globalLocations.join(', ')}`);

console.log('\n=== Global Props ===');
for (const [key, prop] of manifest.globalProps) {
  console.log(`  ${prop.name} — scenes: [${prop.sceneNumbers}]`);
}

// --- Assertions ---
const errors: string[] = [];

if (manifest.scenes.length !== 2) errors.push(`Expected 2 scenes, got ${manifest.scenes.length}`);
if (manifest.globalCharacters.size !== 2) errors.push(`Expected 2 characters, got ${manifest.globalCharacters.size}`);
if (!manifest.globalCharacters.has('ALICE')) errors.push('Missing character ALICE');
if (!manifest.globalCharacters.has('BOB')) errors.push('Missing character BOB');
if (manifest.globalLocations.length !== 2) errors.push(`Expected 2 locations, got ${manifest.globalLocations.length}`);
if (manifest.globalProps.size < 2) errors.push(`Expected >=2 props (REVOLVER, LETTER), got ${manifest.globalProps.size}`);

const alice = manifest.globalCharacters.get('ALICE');
if (alice && alice.dialogueCount !== 1) errors.push(`ALICE dialogue count should be 1, got ${alice.dialogueCount}`);
const bob = manifest.globalCharacters.get('BOB');
if (bob && bob.dialogueCount !== 2) errors.push(`BOB dialogue count should be 2, got ${bob.dialogueCount}`);
if (bob && !bob.sceneNumbers.includes(1)) errors.push('BOB should appear in scene 1 (via O.S. dialogue)');

if (manifest.scenes[0].location !== 'KITCHEN') errors.push(`Scene 1 location: expected KITCHEN, got ${manifest.scenes[0].location}`);
if (manifest.scenes[1].intExt !== 'EXT') errors.push(`Scene 2 intExt: expected EXT, got ${manifest.scenes[1].intExt}`);

if (errors.length > 0) {
  console.error('\n❌ FAILURES:');
  errors.forEach((e) => console.error(`  - ${e}`));
  process.exit(1);
} else {
  console.log('\n✅ All assertions passed!');
}
