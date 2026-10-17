const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();
  try {
    // Login
    console.log('0. Logging in...');
    await page.goto('http://localhost:8080/auth', { waitUntil: 'networkidle', timeout: 15000 });
    await page.locator('input[type="email"]').first().fill('lopezklu@yahoo.com');
    await page.locator('input[type="password"]').first().fill('1Odielone!');
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Go to Stage 5
    console.log('1. Going to Stage 5...');
    await page.goto('http://localhost:8080/projects/517a4cda-618b-4216-b105-42dbc68103cf?stage=5', { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(3000);

    // Unlock stage
    console.log('2. Unlocking Stage 5...');
    const unlockBtn = page.locator('button:has-text("Unlock & Edit")');
    const unlockVisible = await unlockBtn.isVisible({ timeout: 2000 }).catch(() => false);
    console.log('   Unlock & Edit button visible:', unlockVisible);

    if (unlockVisible) {
      await unlockBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'screenshots/pw-30-unlock-confirm.png' });

      // Check for confirmation dialog
      const confirmDialog = page.locator('[role="dialog"]');
      const dialogVisible = await confirmDialog.isVisible({ timeout: 2000 }).catch(() => false);
      console.log('   Confirmation dialog appeared:', dialogVisible);

      if (dialogVisible) {
        // Find and click the confirm button
        const confirmBtn = page.locator('[role="dialog"] button:has-text("Unlock"), [role="dialog"] button:has-text("Confirm"), [role="dialog"] button:has-text("Yes")');
        if (await confirmBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
          await confirmBtn.click();
          await page.waitForTimeout(3000);
          console.log('   Confirmed unlock');
        }
      }

      await page.screenshot({ path: 'screenshots/pw-31-unlocked.png', fullPage: true });

      // Check if LOCKED-IN badge is gone
      const lockedBadge = page.locator('text=LOCKED-IN');
      const stillLocked = await lockedBadge.isVisible({ timeout: 1000 }).catch(() => false);
      console.log('   Still locked:', stillLocked);
    }

    // Scroll down to see assets
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(500);

    // Test context menu after unlock
    console.log('3. Testing context menu after unlock...');
    const threeDotBtns = page.locator('button:has(svg.lucide-more-vertical), button:has(svg.lucide-ellipsis-vertical)');
    const btnCount = await threeDotBtns.count();
    console.log('   Three-dot buttons:', btnCount);

    if (btnCount > 0) {
      // Click on QLANKTON's menu
      await threeDotBtns.first().click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'screenshots/pw-32-unlocked-menu.png' });

      // List all menu items
      const menuItems = page.locator('[role="menuitem"]');
      const menuCount = await menuItems.count();
      console.log('   Menu items:', menuCount);
      for (let i = 0; i < menuCount; i++) {
        const text = await menuItems.nth(i).textContent();
        console.log('     Item ' + i + ':', text.trim());
      }

      // Look for Change Type submenu trigger
      const changeTypeItem = page.locator('[role="menuitem"]:has-text("Change Type")');
      const ctVisible = await changeTypeItem.isVisible({ timeout: 1000 }).catch(() => false);
      console.log('   Change Type visible:', ctVisible);

      if (ctVisible) {
        console.log('4. Testing Change Type submenu...');
        await changeTypeItem.hover();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: 'screenshots/pw-33-change-type-hover.png' });

        // Check submenu items
        const charOpt = page.locator('[role="menuitem"]:has-text("Character")');
        const propOpt = page.locator('[role="menuitem"]:has-text("Prop")');
        const locationOpt = page.locator('[role="menuitem"]:has-text("Location")');
        const extraOpt = page.locator('[role="menuitem"]:has-text("Extra")');

        const charVisible = await charOpt.isVisible({ timeout: 1000 }).catch(() => false);
        const propVisible = await propOpt.isVisible({ timeout: 500 }).catch(() => false);
        const locationVisible = await locationOpt.isVisible({ timeout: 500 }).catch(() => false);
        const extraVisible = await extraOpt.isVisible({ timeout: 500 }).catch(() => false);

        console.log('   Character:', charVisible);
        console.log('   Prop:', propVisible);
        console.log('   Location:', locationVisible);
        console.log('   Extra/Archetype:', extraVisible);

        // Check if current type (character) is disabled
        if (charVisible) {
          const charDisabled = await charOpt.getAttribute('data-disabled');
          console.log('   Character option data-disabled:', charDisabled);
          const charAriaDisabled = await charOpt.getAttribute('aria-disabled');
          console.log('   Character option aria-disabled:', charAriaDisabled);
        }
      }

      // Close the menu
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }

    // Test Merge - look for selection mechanism
    console.log('5. Testing asset selection for Merge...');

    // Look for "Selected" badges or checkboxes
    const selectedBadges = page.locator('text=Selected');
    const selCount = await selectedBadges.count();
    console.log('   "Selected" badges:', selCount);

    // Look for merge-related buttons
    const mergeBtn = page.locator('button:has-text("Merge")');
    const mergeVisible = await mergeBtn.isVisible({ timeout: 1000 }).catch(() => false);
    console.log('   Merge button visible:', mergeVisible);

    // Try to expand deferred assets to see more
    const deferredSection = page.locator('text=Deferred Assets');
    const deferredVisible = await deferredSection.isVisible({ timeout: 1000 }).catch(() => false);
    console.log('   Deferred Assets section:', deferredVisible);

    if (deferredVisible) {
      await deferredSection.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: 'screenshots/pw-34-deferred-expanded.png', fullPage: true });
    }

    // Now re-lock the stage
    console.log('6. Re-locking Stage 5...');
    await page.mouse.wheel(0, -800);
    await page.waitForTimeout(500);

    const lockBtn = page.locator('button:has-text("Lock")').first();
    const lockBtnVisible = await lockBtn.isVisible({ timeout: 2000 }).catch(() => false);
    console.log('   Lock button visible:', lockBtnVisible);

    if (lockBtnVisible) {
      await lockBtn.click();
      await page.waitForTimeout(2000);

      // Handle confirmation dialog
      const confirmDialog = page.locator('[role="dialog"]');
      if (await confirmDialog.isVisible({ timeout: 2000 }).catch(() => false)) {
        const confirmBtn = page.locator('[role="dialog"] button:has-text("Lock"), [role="dialog"] button:has-text("Confirm")');
        if (await confirmBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
          await confirmBtn.click();
          await page.waitForTimeout(2000);
          console.log('   Re-locked stage 5');
        }
      }
    }

    await page.screenshot({ path: 'screenshots/pw-35-stage5-relocked.png', fullPage: true });
    console.log('\nStage 5 unlock & test complete');
  } catch(e) {
    console.error('Error:', e.message);
    await page.screenshot({ path: 'screenshots/pw-error-unlock.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();
