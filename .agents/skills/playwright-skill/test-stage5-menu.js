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

    // Check lock status
    const lockBadge = page.locator('text=LOCKED-IN');
    const isLocked = await lockBadge.isVisible({ timeout: 2000 }).catch(() => false);
    console.log('   Stage is LOCKED-IN:', isLocked);

    // Scroll down to see all assets
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/pw-20-stage5-scrolled.png', fullPage: true });

    // Test the three-dot menu on SPONGEBOND
    console.log('2. Testing three-dot menu on SPONGEBOND...');
    // The three-dot buttons are svg icons - find them
    const threeDotBtns = page.locator('button:has(svg.lucide-more-vertical), button:has(svg.lucide-ellipsis-vertical)');
    const btnCount = await threeDotBtns.count();
    console.log('   Three-dot buttons found:', btnCount);

    if (btnCount > 0) {
      // Click on the first three-dot button (QLANKTON card)
      console.log('   Clicking first three-dot menu (QLANKTON)...');
      await threeDotBtns.first().click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'screenshots/pw-21-context-menu-locked.png' });

      // List all menu items
      const menuItems = page.locator('[role="menuitem"]');
      const menuCount = await menuItems.count();
      console.log('   Menu items:', menuCount);
      for (let i = 0; i < menuCount; i++) {
        const text = await menuItems.nth(i).textContent();
        const disabled = await menuItems.nth(i).isDisabled().catch(() => 'N/A');
        console.log('     Item ' + i + ':', text.trim(), '| disabled:', disabled);
      }

      // Check for Change Type submenu trigger
      const changeTypeEl = page.locator('[role="menuitem"]:has-text("Change Type")');
      const changeTypeVisible = await changeTypeEl.isVisible({ timeout: 1000 }).catch(() => false);
      console.log('   Change Type visible:', changeTypeVisible);

      // Check for sub-menu triggers (the Change Type should be disabled/hidden when locked)
      const subTriggers = page.locator('[role="menuitem"][data-disabled]');
      const subTriggerCount = await subTriggers.count();
      console.log('   Disabled menu items:', subTriggerCount);

      // Close menu
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }

    // Now unlock stage 5 to test the Change Type feature
    console.log('3. Unlocking Stage 5...');
    const unlockBtn = page.locator('button:has-text("Unlock"), text=Unlock');
    const unlockVisible = await unlockBtn.isVisible({ timeout: 1000 }).catch(() => false);
    console.log('   Unlock button visible:', unlockVisible);

    if (unlockVisible) {
      await unlockBtn.first().click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'screenshots/pw-22-after-unlock.png' });

      // Confirm unlock if there's a confirmation dialog
      const confirmUnlock = page.locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Unlock")').last();
      if (await confirmUnlock.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmUnlock.click();
        await page.waitForTimeout(2000);
      }

      await page.screenshot({ path: 'screenshots/pw-23-unlocked.png', fullPage: true });

      // Now test the context menu again after unlocking
      console.log('4. Testing context menu after unlock...');
      const threeDotBtns2 = page.locator('button:has(svg.lucide-more-vertical), button:has(svg.lucide-ellipsis-vertical)');
      const btnCount2 = await threeDotBtns2.count();
      console.log('   Three-dot buttons:', btnCount2);

      if (btnCount2 > 0) {
        await threeDotBtns2.first().click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: 'screenshots/pw-24-context-unlocked.png' });

        // Check for Change Type
        const changeType2 = page.locator('text=Change Type');
        const ct2Visible = await changeType2.isVisible({ timeout: 1000 }).catch(() => false);
        console.log('   Change Type visible:', ct2Visible);

        if (ct2Visible) {
          // Hover to open submenu
          await changeType2.hover();
          await page.waitForTimeout(800);
          await page.screenshot({ path: 'screenshots/pw-25-change-type-submenu.png' });

          // List submenu items
          const subItems = page.locator('[role="menuitem"]');
          const subCount = await subItems.count();
          console.log('   All menu items after hover:', subCount);
          for (let i = 0; i < subCount; i++) {
            const text = await subItems.nth(i).textContent();
            console.log('     Sub-item ' + i + ':', text.trim());
          }
        }

        // Close menu
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
      }

      // Test selection and merge
      console.log('5. Testing asset selection & merge...');
      const checkboxes = page.locator('[role="checkbox"], input[type="checkbox"]');
      const cbCount = await checkboxes.count();
      console.log('   Checkboxes found:', cbCount);

      // Try clicking the selection indicators (the colored circles) on asset cards
      const selectionCircles = page.locator('[class*="Selected"], button:has-text("Selected")');
      const circleCount = await selectionCircles.count();
      console.log('   Selection circles:', circleCount);

      // Re-lock stage 5 to leave it as it was
      console.log('6. Re-locking Stage 5...');
      const lockBtn = page.locator('button:has-text("Lock"), text=Lock');
      const lockBtnVisible = await lockBtn.isVisible({ timeout: 1000 }).catch(() => false);
      if (lockBtnVisible) {
        await lockBtn.first().click();
        await page.waitForTimeout(2000);
        // Confirm if needed
        const confirmLock = page.locator('[role="dialog"] button:has-text("Lock"), [role="dialog"] button:has-text("Confirm")');
        if (await confirmLock.isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirmLock.click();
          await page.waitForTimeout(2000);
        }
      }
    }

    await page.screenshot({ path: 'screenshots/pw-26-stage5-done.png', fullPage: true });
    console.log('\nStage 5 context menu tests complete');
  } catch(e) {
    console.error('Error:', e.message);
    await page.screenshot({ path: 'screenshots/pw-error-stage5-menu.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();
