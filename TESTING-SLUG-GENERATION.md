l# Testing Slug Generation (Task 3)

This guide provides multiple ways to test the improved slug generation functionality.

## Method 1: Manual Testing in Browser Console (Quickest)

1. Start the development server:
```bash
cd "C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector"
npm run dev
```

2. Open your browser and navigate to the app (usually `http://localhost:8080`)

3. Open the browser console (F12)

4. Import and test the service:
```javascript
// In browser console, you can test by:
// 1. Navigate to Stage 4 (Master Script)
// 2. Generate or paste a script with scene headings
// 3. The scenes will be extracted automatically and you can inspect them

// Or test directly if you have access to the service:
import { scriptService } from './src/lib/services/scriptService';

const testScript = `INT. KITCHEN - DAY

John enters the kitchen and makes coffee.

EXT. CITY STREET - NIGHT

The street is dark and empty.

INT. BEDROOM - MORNING

Sarah wakes up.`;

const scenes = scriptService.extractScenes(testScript);
console.log('Extracted scenes:', scenes);
console.log('Slugs:', scenes.map(s => s.slug));
// Expected output:
// ['int-kitchen-day-1', 'ext-city-street-night-2', 'int-bedroom-morning-3']
```

## Method 2: Test Through the Application UI

1. **Start both frontend and backend:**
```bash
# Terminal 1 - Frontend
cd "C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector"
npm run dev

# Terminal 2 - Backend
cd "C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector\backend"
npm run dev
```

2. **Navigate to Stage 4 (Master Script)** in your application

3. **Generate or paste a script** with various scene headings:
```
INT. KITCHEN - DAY

John enters the kitchen.

INT. KITCHEN - DAY

Later in the same kitchen.

EXT. CITY STREET - NIGHT

The street is dark.

INT. COFFEE SHOP - MORNING

The barista prepares coffee.

INT. JOHN'S APARTMENT - CONTINUOUS

John arrives home.
```

4. **Check the extracted scenes** - The slugs should be:
   - `int-kitchen-day-1`
   - `int-kitchen-day-2`
   - `ext-city-street-night-3`
   - `int-coffee-shop-morning-4`
   - `int-johns-apartment-continuous-5`

5. **Verify in browser console** - Open DevTools and check the console logs for:
   - `📋 [SCRIPT SERVICE] Extracted X scenes from script`
   - Inspect the scenes array to see the generated slugs

## Method 3: Automated Tests with Vitest (Recommended for CI/CD)

### Setup Vitest (if not already installed):

```bash
cd "C:\Users\Daniel Lopez\Desktop\Aiuteur\wizardirector"
npm install -D vitest @vitest/ui
```

### Add test script to `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui"
  }
}
```

### Run the tests:

```bash
npm test
```

Or with UI:
```bash
npm run test:ui
```

The test file is located at: `src/lib/services/__tests__/scriptService.test.ts`

## Test Cases to Verify

### ✅ Basic Format
- `INT. KITCHEN - DAY` → `int-kitchen-day-1`
- `EXT. STREET - NIGHT` → `ext-street-night-2`

### ✅ Without Time of Day
- `INT. BEDROOM` → `int-bedroom-1`

### ✅ Multi-word Locations
- `INT. COFFEE SHOP - MORNING` → `int-coffee-shop-morning-1`

### ✅ Multi-word Time of Day
- `INT. OFFICE - MOMENTS LATER` → `int-office-moments-later-1`

### ✅ Uniqueness with Duplicate Locations
- Multiple `INT. KITCHEN - DAY` scenes should have different scene numbers:
  - Scene 1: `int-kitchen-day-1`
  - Scene 5: `int-kitchen-day-5`

### ✅ Special Character Sanitization
- `INT. JOHN'S APARTMENT` → `int-johns-apartment-1` (apostrophe removed)

### ✅ Various Time of Day Values
- `DAY`, `NIGHT`, `CONTINUOUS`, `LATER`, `MOMENTS LATER`, `DAWN`, `DUSK`, `MORNING`, `AFTERNOON`, `EVENING`

## Expected Behavior

1. **Slug Format**: `{type}-{location}-{timeOfDay}-{sceneNumber}` or `{type}-{location}-{sceneNumber}`
2. **Uniqueness**: Scene number ensures uniqueness even for duplicate locations
3. **Sanitization**: Special characters removed, spaces converted to hyphens
4. **Sequential Numbering**: Scene numbers are sequential (1, 2, 3, ...)

## Debugging Tips

If slugs aren't generating correctly:

1. **Check console logs** - The service logs extraction details
2. **Verify scene heading format** - Must match: `INT./EXT. LOCATION - TIME_OF_DAY`
3. **Inspect parsed headings** - Check if `parseSceneHeading()` is working correctly
4. **Check scene extraction** - Ensure `extractScenes()` is being called with the correct script

## Example Test Script

Use this comprehensive test script to verify all functionality:

```
INT. KITCHEN - DAY

First kitchen scene.

INT. KITCHEN - DAY

Second kitchen scene (same location, different scene number).

EXT. CITY STREET - NIGHT

Night street scene.

INT. COFFEE SHOP - MORNING

Morning coffee scene.

INT. JOHN'S APARTMENT - CONTINUOUS

Apartment scene with special character.

INT. OFFICE - MOMENTS LATER

Office scene with multi-word time.

EXT. BEACH - DAWN

Dawn beach scene.

INT. BEDROOM

Bedroom scene without time of day.
```

Expected slugs:
1. `int-kitchen-day-1`
2. `int-kitchen-day-2`
3. `ext-city-street-night-3`
4. `int-coffee-shop-morning-4`
5. `int-johns-apartment-continuous-5`
6. `int-office-moments-later-6`
7. `ext-beach-dawn-7`
8. `int-bedroom-8`

