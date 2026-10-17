const { chromium } = require('playwright');

const TARGET_URL = 'http://localhost:8080';
const PROJECT_URL = `${TARGET_URL}/projects/517a4cda-618b-4216-b105-42dbc68103cf`;
const SCENE_ID = '343199c9-3074-4403-a883-f6c3eef4f144';
const EMAIL = 'lopezklu@yahoo.com';
const PASSWORD = '1Odielone!';

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  try {
    // ========== STEP 1: Login ==========
    console.log('=== STEP 1: Logging in ===');
    await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);

    // Check if we need to login
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);

    // Look for email input
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]');
    if (await emailInput.count() > 0) {
      console.log('Login form found, filling credentials...');
      await emailInput.first().fill(EMAIL);

      const passwordInput = page.locator('input[type="password"]');
      await passwordInput.first().fill(PASSWORD);

      // Click sign in / login button
      const loginButton = page.locator('button:has-text("Sign"), button:has-text("Log"), button[type="submit"]');
      await loginButton.first().click();

      // Wait for navigation
      await page.waitForTimeout(3000);
      console.log('After login URL:', page.url());
    } else {
      console.log('No login form found, may already be logged in');
    }

    await page.screenshot({ path: '/tmp/01-after-login.png', fullPage: false });
    console.log('Screenshot saved: /tmp/01-after-login.png');

    // ========== STEP 2: Navigate to Stage 8 ==========
    console.log('\n=== STEP 2: Navigate to Stage 8 ===');
    await page.goto(`${PROJECT_URL}?stage=8&sceneId=${SCENE_ID}`, {
      waitUntil: 'networkidle',
      timeout: 15000,
    });
    await page.waitForTimeout(3000);
    console.log('Stage 8 URL:', page.url());

    await page.screenshot({ path: '/tmp/02-stage8-overview.png', fullPage: false });
    console.log('Screenshot saved: /tmp/02-stage8-overview.png');

    // ========== STEP 3: Navigate to Stage 9 ==========
    console.log('\n=== STEP 3: Navigate to Stage 9 ===');
    await page.goto(`${PROJECT_URL}?stage=9&sceneId=${SCENE_ID}`, {
      waitUntil: 'networkidle',
      timeout: 15000,
    });
    await page.waitForTimeout(3000);
    console.log('Stage 9 URL:', page.url());

    await page.screenshot({ path: '/tmp/03-stage9-overview.png', fullPage: false });
    console.log('Screenshot saved: /tmp/03-stage9-overview.png');

    // Check for key UI elements
    const pageContent = await page.content();

    // Look for Bulk template dropdown
    const bulkTemplateText = await page.locator('text=Bulk template').count();
    console.log(`Bulk template dropdown found: ${bulkTemplateText > 0 ? 'YES' : 'NO'}`);

    // Look for view toggle buttons (List/Grid icons)
    // These are SVG icons in buttons, look for adjacent buttons
    const toggleButtons = await page.locator('button svg.lucide-list, button svg.lucide-grid-3x3, button svg.lucide-grid3x3').count();
    console.log(`View toggle SVG icons found: ${toggleButtons}`);

    // Alternative: look for button groups near the header
    const allButtons = await page.locator('button').count();
    console.log(`Total buttons on page: ${allButtons}`);

    // Look for "Assets" text (shot asset panels)
    const assetsText = await page.locator('text=Assets').count();
    console.log(`"Assets" text elements found: ${assetsText}`);

    // ========== STEP 4: Try to find and click Timeline/Grid view ==========
    console.log('\n=== STEP 4: Looking for Timeline/Grid toggle ===');

    // Look for grid3x3 icon button or any button with grid icon
    let gridButton = page.locator('button:has(svg.lucide-grid-3x3), button:has(svg.lucide-grid3x3)');
    let gridCount = await gridButton.count();
    console.log(`Grid button (lucide-grid) found: ${gridCount}`);

    if (gridCount === 0) {
      // Try broader search - look for buttons near "Assets" or timeline toggle area
      gridButton = page.locator('button').filter({ has: page.locator('svg') });
      const svgButtons = await gridButton.count();
      console.log(`Buttons with SVG icons: ${svgButtons}`);

      // Try to find by looking at the component structure
      const grid3x3 = page.locator('[class*="grid"], [data-testid*="grid"], [aria-label*="grid" i], [aria-label*="timeline" i]');
      console.log(`Grid-related elements: ${await grid3x3.count()}`);
    }

    // Try to find by the SVG path data for Grid3x3 icon
    const svgPaths = page.locator('button svg');
    const svgCount = await svgPaths.count();
    console.log(`SVG icons in buttons: ${svgCount}`);

    // Look for the toggle by scanning all buttons
    for (let i = 0; i < Math.min(svgCount, 20); i++) {
      const btn = svgPaths.nth(i);
      const parent = btn.locator('..');
      const title = await parent.getAttribute('title').catch(() => null);
      const ariaLabel = await parent.getAttribute('aria-label').catch(() => null);
      const text = await parent.textContent().catch(() => '');
      if (title || ariaLabel || (text && text.trim().length < 20)) {
        console.log(`  Button ${i}: title="${title}" aria-label="${ariaLabel}" text="${text?.trim()}"`);
      }
    }

    // Take screenshot of the header area
    await page.screenshot({ path: '/tmp/04-stage9-header.png', fullPage: false });
    console.log('Screenshot saved: /tmp/04-stage9-header.png');

    // ========== STEP 5: Try clicking timeline view ==========
    console.log('\n=== STEP 5: Attempting to switch to Timeline view ===');

    // Try multiple selectors for the grid/timeline button
    const timelineSelectors = [
      'button:has(svg.lucide-grid-3x3)',
      'button:has(svg.lucide-grid3x3)',
      'button:has(svg[class*="grid"])',
      'button[title*="Timeline" i]',
      'button[aria-label*="Timeline" i]',
      'button[title*="Grid" i]',
    ];

    let clicked = false;
    for (const sel of timelineSelectors) {
      const el = page.locator(sel);
      if (await el.count() > 0) {
        console.log(`Found timeline button with selector: ${sel}`);
        await el.first().click();
        await page.waitForTimeout(1500);
        clicked = true;
        break;
      }
    }

    if (!clicked) {
      console.log('Could not find timeline toggle button with standard selectors.');
      console.log('Trying to find buttons by position in header area...');

      // Scroll to top of content area and look for button groups
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(500);
    }

    await page.screenshot({ path: '/tmp/05-timeline-view.png', fullPage: false });
    console.log('Screenshot saved: /tmp/05-timeline-view.png');

    // ========== STEP 6: Look for the table (timeline matrix) ==========
    console.log('\n=== STEP 6: Checking for Timeline matrix table ===');

    const tables = await page.locator('table').count();
    console.log(`Tables on page: ${tables}`);

    if (tables > 0) {
      console.log('Timeline matrix table found!');
      // Check for presence labels in cells
      const cellsWithT = await page.locator('button:has-text("T")').count();
      const cellsWithE = await page.locator('button:has-text("E")').count();
      const cellsWithX = await page.locator('button:has-text("X")').count();
      const cellsWithP = await page.locator('button:has-text("P")').count();
      console.log(`  Cells: T=${cellsWithT}, E=${cellsWithE}, X=${cellsWithX}, P=${cellsWithP}`);

      // Check for legend
      const legendItems = await page.locator('text=Throughout').count();
      console.log(`  "Throughout" legend items: ${legendItems}`);

      const entersLegend = await page.locator('text=Enters').count();
      console.log(`  "Enters" legend items: ${entersLegend}`);

      // Take close-up of the table area
      const tableEl = page.locator('table').first();
      await tableEl.screenshot({ path: '/tmp/06-timeline-table-closeup.png' }).catch(() => {
        console.log('Could not take table close-up screenshot');
      });
      console.log('Screenshot saved: /tmp/06-timeline-table-closeup.png');
    }

    // ========== STEP 7: Switch back to cards view ==========
    console.log('\n=== STEP 7: Switch back to Cards view ===');

    const listSelectors = [
      'button:has(svg.lucide-list)',
      'button[title*="Cards" i]',
      'button[title*="List" i]',
      'button[aria-label*="Cards" i]',
      'button[aria-label*="List" i]',
    ];

    for (const sel of listSelectors) {
      const el = page.locator(sel);
      if (await el.count() > 0) {
        console.log(`Found cards/list button with selector: ${sel}`);
        await el.first().click();
        await page.waitForTimeout(1500);
        break;
      }
    }

    await page.screenshot({ path: '/tmp/07-cards-view.png', fullPage: false });
    console.log('Screenshot saved: /tmp/07-cards-view.png');

    // ========== STEP 8: Check Bulk Template dropdown ==========
    console.log('\n=== STEP 8: Check Bulk Template dropdown ===');

    const bulkDropdown = page.locator('button:has-text("Bulk template"), [role="combobox"]:has-text("Bulk"), button:has-text("Bulk")');
    const bulkCount = await bulkDropdown.count();
    console.log(`Bulk template elements found: ${bulkCount}`);

    if (bulkCount > 0) {
      await bulkDropdown.first().click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: '/tmp/08-bulk-template-dropdown.png', fullPage: false });
      console.log('Screenshot saved: /tmp/08-bulk-template-dropdown.png');

      // Check dropdown options
      const allThroughout = await page.locator('text=All Throughout').count();
      const matchChars = await page.locator('text=Match Shot Characters').count();
      const locThroughout = await page.locator('text=Locations Throughout').count();
      console.log(`  Template options: All Throughout=${allThroughout}, Match Shot Characters=${matchChars}, Locations Throughout=${locThroughout}`);

      // Close dropdown by pressing Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }

    // ========== STEP 9: Expand an Assets panel ==========
    console.log('\n=== STEP 9: Expand an Assets panel ===');

    // Look for "Assets" buttons that expand panels
    const assetsButtons = page.locator('button:has-text("Assets")');
    const assetsBtnCount = await assetsButtons.count();
    console.log(`"Assets" buttons found: ${assetsBtnCount}`);

    if (assetsBtnCount > 0) {
      // Click first "Assets" button to expand
      await assetsButtons.first().click();
      await page.waitForTimeout(1500);

      await page.screenshot({ path: '/tmp/09-assets-panel-expanded.png', fullPage: false });
      console.log('Screenshot saved: /tmp/09-assets-panel-expanded.png');

      // Check for presence type dropdowns
      const presenceDropdowns = page.locator('button:has-text("Throughout"), button:has-text("Enters"), button:has-text("Exits"), button:has-text("Passes Through")');
      const presenceCount = await presenceDropdowns.count();
      console.log(`Presence type elements found: ${presenceCount}`);

      // Check for add asset button
      const addAsset = await page.locator('button:has-text("Add Asset")').count();
      console.log(`"Add Asset" button found: ${addAsset > 0 ? 'YES' : 'NO'}`);

      // Check for split shot button (should appear with passes_through)
      const splitShot = await page.locator('button:has-text("Split Shot")').count();
      console.log(`"Split Shot" button found: ${splitShot > 0 ? 'YES' : 'NO'}`);

      // Check for continuity info banner
      const continuityBanner = await page.locator('text=Enters').count();
      console.log(`"Enters" text (continuity) found: ${continuityBanner}`);
    }

    // ========== STEP 10: Full page screenshot ==========
    console.log('\n=== STEP 10: Final full-page screenshot ===');
    await page.screenshot({ path: '/tmp/10-stage9-full.png', fullPage: true });
    console.log('Screenshot saved: /tmp/10-stage9-full.png');

    // ========== SUMMARY ==========
    console.log('\n========================================');
    console.log('E2E TEST SUMMARY');
    console.log('========================================');
    console.log('Screenshots saved to /tmp/01-*.png through /tmp/10-*.png');
    console.log('Review them to verify UI features.');

  } catch (error) {
    console.error('ERROR:', error.message);
    await page.screenshot({ path: '/tmp/error-screenshot.png', fullPage: false });
    console.log('Error screenshot saved: /tmp/error-screenshot.png');
  } finally {
    await browser.close();
  }
})();
