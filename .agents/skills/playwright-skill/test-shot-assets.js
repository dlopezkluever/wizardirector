const { chromium } = require('playwright');

const TARGET_URL = 'http://localhost:8080';
const PROJECT_ID = '517a4cda-618b-4216-b105-42dbc68103cf';
const SCENE_ID = '343199c9-3074-4403-a883-f6c3eef4f144';
const EMAIL = 'lopezklu@yahoo.com';
const PASSWORD = '1Odielone!';
const SD = process.env.TEMP || '/tmp';
function ss(n) { return SD + '/sa5-' + n + '.png'; }

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 250 });
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await ctx.newPage();

  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  try {
    // LOGIN
    console.log('=== LOGIN ===');
    await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1000);
    const em = await page.$('input[type="email"]');
    if (em) {
      await em.fill(EMAIL);
      await (await page.$('input[type="password"]')).fill(PASSWORD);
      await (await page.$('button[type="submit"]')).click();
      await page.waitForTimeout(4000);
      console.log('Logged in');
    }

    // STAGE 9
    console.log('\n=== STAGE 9 ===');
    await page.goto(
      TARGET_URL + '/projects/' + PROJECT_ID + '?stage=9&sceneId=' + SCENE_ID,
      { waitUntil: 'networkidle', timeout: 20000 }
    );
    await page.waitForTimeout(5000);

    const apiErrors = errors.filter(e => e.includes('assignment') || e.includes('column'));
    console.log('API errors:', apiErrors.length === 0 ? 'NONE' : apiErrors[0].substring(0, 100));

    await page.screenshot({ path: ss('01'), fullPage: false });

    // Click the CHEVRON > on Shot 5A row to expand (right side of row)
    console.log('\n=== EXPAND SHOT ===');
    const shotRows = await page.$$('.rounded-lg, [class*="shot"], [class*="card"]');
    console.log('Potential shot containers:', shotRows.length);

    let expanded = false;

    // Method 1: Click on the entire Shot 5A area (the div surrounding it)
    const shot5ALocator = page.locator('text=Shot  5A').first();
    if (await shot5ALocator.count() > 0) {
      // Get the parent clickable element
      const boundingBox = await shot5ALocator.boundingBox();
      if (boundingBox) {
        // Click the far right of the row (where the > chevron is)
        await page.mouse.click(boundingBox.x + 1050, boundingBox.y + boundingBox.height / 2);
        await page.waitForTimeout(2000);
        console.log('Clicked chevron area of Shot 5A row');
      }
    }

    // Check if expanded by looking for action/camera text that only appears when expanded
    const expandedContent = await page.$('text=Action:');
    if (expandedContent) {
      expanded = true;
      console.log('Shot 5A is EXPANDED');
    } else {
      // Try clicking again - maybe it was already expanded and we collapsed it
      console.log('Not expanded yet. Trying double-click approach...');
      // Try clicking the "Shot 5A" text itself
      await page.locator('text=Shot  5A').first().click();
      await page.waitForTimeout(2000);
      const expandedCheck2 = await page.$('text=Action:');
      if (expandedCheck2) {
        expanded = true;
        console.log('Shot 5A is now EXPANDED');
      } else {
        console.log('Still not expanded. Trying the chevron...');
        // Look for SVG chevron icons and click the first visible one
        const svgBtns = await page.$$('svg');
        for (const svg of svgBtns) {
          const parent = await svg.evaluateHandle(el => el.closest('button') || el.parentElement);
          const html = await parent.evaluate(el => el.outerHTML).catch(() => '');
          if (html.includes('chevron-right') || html.includes('ChevronRight')) {
            await parent.evaluate(el => el.click());
            await page.waitForTimeout(2000);
            const check = await page.$('text=Action:');
            if (check) {
              expanded = true;
              console.log('Expanded via chevron icon');
              break;
            }
          }
        }
      }
    }

    await page.screenshot({ path: ss('02-expanded'), fullPage: false });

    if (!expanded) {
      console.log('Could not expand shot. Dumping visible text for debugging...');
      const body = await page.textContent('body');
      console.log('Has "Assets":', body.includes('Assets'));
      console.log('Has "Action:":', body.includes('Action:'));
      console.log('Has "Camera:":', body.includes('Camera:'));
      console.log('Has "Throughout":', body.includes('Throughout'));
    }

    if (expanded) {
      // FIND THE ASSETS PANEL
      console.log('\n=== ASSETS PANEL ===');
      // The ShotAssetPanel has a <button> with chevron + "Assets" + <Badge>count</Badge>
      const allEls = await page.$$('button, div');
      for (const el of allEls) {
        const t = await el.textContent().catch(() => '');
        // Looking for something like "Assets3" or "Assets 3"
        if (/^[\s>]*Assets\s*\d/.test(t.trim()) && t.trim().length < 25) {
          console.log('Found panel element:', JSON.stringify(t.trim()));
          const tag = await el.evaluate(e => e.tagName);
          console.log('Tag:', tag);
          await el.click();
          await page.waitForTimeout(1500);
          break;
        }
      }

      await page.screenshot({ path: ss('03-panel-open'), fullPage: false });

      // Now look for presence dropdowns
      console.log('\n=== PRESENCE TYPE ===');
      const combos = await page.$$('[role="combobox"]');
      let foundPresence = false;
      for (const cb of combos) {
        const vis = await cb.isVisible().catch(() => false);
        if (!vis) continue;
        const t = await cb.textContent().catch(() => '');
        console.log('Combobox:', JSON.stringify(t.trim()));
        if (/Throughout|Enters|Exits|Passes/.test(t)) {
          foundPresence = true;
          console.log('--> PRESENCE DROPDOWN FOUND');
          await cb.click();
          await page.waitForTimeout(1000);
          await page.screenshot({ path: ss('04-dropdown'), fullPage: false });

          const opts = await page.$$('[role="option"]');
          for (const o of opts) {
            console.log('  option:', (await o.textContent()).trim());
          }

          // Pick "Exits"
          for (const o of opts) {
            const ot = await o.textContent();
            if (ot.includes('Exits')) {
              await o.click();
              console.log('Changed to Exits');
              break;
            }
          }
          await page.waitForTimeout(2000);
          await page.screenshot({ path: ss('05-changed'), fullPage: false });
          break;
        }
      }

      if (!foundPresence) {
        console.log('No presence dropdown visible. Checking all comboboxes...');
        for (const cb of combos) {
          const t = await cb.textContent().catch(() => '');
          console.log('  cb:', JSON.stringify(t.trim()));
        }
      }

      // TRASH / DELETE
      console.log('\n=== DELETE ===');
      const btns = await page.$$('button');
      for (const b of btns) {
        const vis = await b.isVisible().catch(() => false);
        if (!vis) continue;
        const h = await b.innerHTML().catch(() => '');
        if (h.toLowerCase().includes('trash')) {
          console.log('Found trash button');
          await b.click();
          await page.waitForTimeout(1000);
          const dlg = await page.$('[role="alertdialog"]');
          if (dlg) {
            console.log('DELETE DIALOG CONFIRMED!');
            await page.screenshot({ path: ss('06-delete'), fullPage: false });
            const cancel = await dlg.$('button:has-text("Cancel")');
            if (cancel) await cancel.click();
          }
          break;
        }
      }
    }

    await page.screenshot({ path: ss('final'), fullPage: false });
    console.log('\n=== DONE ===');

  } catch (e) {
    console.error('FATAL:', e.message);
    await page.screenshot({ path: ss('error'), fullPage: false }).catch(() => {});
  } finally {
    await browser.close();
  }
})();
