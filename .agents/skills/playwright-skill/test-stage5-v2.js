const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 400 });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();
  try {
    // Login first
    console.log('0. Logging in...');
    await page.goto('http://localhost:8080/auth', { waitUntil: 'networkidle', timeout: 15000 });
    await page.locator('input[type="email"]').first().fill('lopezklu@yahoo.com');
    await page.locator('input[type="password"]').first().fill('1Odielone!');
    await page.locator('button[type="submit"]').first().click();

    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    console.log('   Logged in, on dashboard');
    await page.waitForTimeout(1000);

    // Go to Stage 5
    console.log('1. Going to Stage 5...');
    await page.goto('http://localhost:8080/projects/517a4cda-618b-4216-b105-42dbc68103cf?stage=5', { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(4000);

    // Check if we are actually on stage 5
    const currentUrl = page.url();
    console.log('   Current URL:', currentUrl);
    await page.screenshot({ path: 'screenshots/pw-11-stage5.png', fullPage: true });

    // If still on auth, login again
    if (currentUrl.includes('/auth')) {
      console.log('   Redirected to auth, need to login again...');
      await page.locator('input[type="email"]').first().fill('lopezklu@yahoo.com');
      await page.locator('input[type="password"]').first().fill('1Odielone!');
      await page.locator('button[type="submit"]').first().click();
      await page.waitForTimeout(3000);
      await page.goto('http://localhost:8080/projects/517a4cda-618b-4216-b105-42dbc68103cf?stage=5', { waitUntil: 'networkidle', timeout: 20000 });
      await page.waitForTimeout(4000);
      console.log('   URL after retry:', page.url());
    }

    await page.screenshot({ path: 'screenshots/pw-11b-stage5-loaded.png', fullPage: true });

    // Check what's visible
    const bodyText = await page.locator('body').textContent();
    console.log('   Page contains "Assets":', bodyText.includes('Assets'));
    console.log('   Page contains "Extract":', bodyText.includes('Extract'));
    console.log('   Page contains "SPONGEBOND":', bodyText.includes('SPONGEBOND'));
    console.log('   Page contains "SpongeBond":', bodyText.includes('SpongeBond'));

    // Look for any asset in the list
    const assetNames = ['SPONGEBOND', 'SpongeBond', 'Spongebond', 'GARDEN GNOME', 'Garden Gnome', 'QLANKTON', 'Qlankton'];
    for (const name of assetNames) {
      const el = page.locator('text=' + name).first();
      const vis = await el.isVisible({ timeout: 500 }).catch(() => false);
      if (vis) console.log('   Found asset:', name);
    }

    // Look for the stage 5 sidebar or pipeline navigation
    const stage5Tab = page.locator('text=5').first();
    console.log('   Has "5" text:', await stage5Tab.isVisible({ timeout: 500 }).catch(() => false));

    // Maybe the pipeline stage is shown differently. Let's check if stage 5 is selected in sidebar
    const sidebarItems = page.locator('[class*="stage"], [data-stage]');
    const sidebarCount = await sidebarItems.count();
    console.log('   Stage sidebar items:', sidebarCount);

    // Try clicking on Stage 5 in the sidebar if it exists
    const stage5Sidebar = page.locator('text="5" >> xpath=ancestor::*[contains(@class, "stage")]').first();
    const stage5SidebarVisible = await stage5Sidebar.isVisible({ timeout: 500 }).catch(() => false);
    console.log('   Stage 5 sidebar visible:', stage5SidebarVisible);

    // Check the right sidebar for stage navigation
    const rightNav = page.locator('nav, [class*="sidebar"]');
    const navCount = await rightNav.count();
    console.log('   Nav/sidebar elements:', navCount);

    console.log('\nStage 5 tests complete');
  } catch(e) {
    console.error('Error:', e.message);
    await page.screenshot({ path: 'screenshots/pw-error-stage5.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();
