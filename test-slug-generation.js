/**
 * Simple Node.js test script for slug generation
 * 
 * Run with: node test-slug-generation.js
 * 
 * Note: This requires the scriptService to be importable.
 * For a quick test, you can also copy the slug generation logic here.
 */

// This is a standalone test that demonstrates expected behavior
// For actual testing, use the Vitest test file or test through the UI

const testCases = [
  {
    name: 'Basic INT with DAY',
    heading: 'INT. KITCHEN - DAY',
    sceneNumber: 1,
    expected: 'int-kitchen-day-1'
  },
  {
    name: 'EXT with NIGHT',
    heading: 'EXT. CITY STREET - NIGHT',
    sceneNumber: 2,
    expected: 'ext-city-street-night-2'
  },
  {
    name: 'Without time of day',
    heading: 'INT. BEDROOM',
    sceneNumber: 3,
    expected: 'int-bedroom-3'
  },
  {
    name: 'Multi-word location',
    heading: 'INT. COFFEE SHOP - MORNING',
    sceneNumber: 4,
    expected: 'int-coffee-shop-morning-4'
  },
  {
    name: 'Multi-word time (MOMENTS LATER)',
    heading: 'INT. OFFICE - MOMENTS LATER',
    sceneNumber: 5,
    expected: 'int-office-moments-later-5'
  },
  {
    name: 'Special characters in location',
    heading: "INT. JOHN'S APARTMENT - DAY",
    sceneNumber: 6,
    expected: "int-johns-apartment-day-6"
  },
  {
    name: 'Duplicate location (uniqueness)',
    heading: 'INT. KITCHEN - DAY',
    sceneNumber: 7,
    expected: 'int-kitchen-day-7'
  }
];

console.log('🧪 Slug Generation Test Cases\n');
console.log('Expected behavior:\n');

testCases.forEach((testCase, index) => {
  console.log(`${index + 1}. ${testCase.name}`);
  console.log(`   Heading: "${testCase.heading}"`);
  console.log(`   Scene Number: ${testCase.sceneNumber}`);
  console.log(`   Expected Slug: "${testCase.expected}"`);
  console.log('');
});

console.log('\n📝 To test in the application:');
console.log('1. Start the dev server: npm run dev');
console.log('2. Navigate to Stage 4 (Master Script)');
console.log('3. Paste a script with the above scene headings');
console.log('4. Check the extracted scenes in the console or UI');
console.log('\n📋 Or use the test script:');
console.log('   npm test (if Vitest is set up)');

