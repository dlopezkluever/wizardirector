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

    // Unlock stage if needed
    const unlockBtn = page.locator('button:has-text("Unlock & Edit")');
    if (await unlockBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('   Unlocking stage...');
      await unlockBtn.click();
      await page.waitForTimeout(3000);
    }

    // Expand deferred assets section
    console.log('2. Expanding deferred assets...');
    const deferredSection = page.locator('text=Deferred Assets');
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(500);

    if (await deferredSection.isVisible({ timeout: 2000 }).catch(() => false)) {
      await deferredSection.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'screenshots/pw-40-deferred.png', fullPage: true });

      // Count deferred assets
      const deferredCards = page.locator('text=deferred').all();
      console.log('   Deferred assets section visible');

      // Try to find the three-dot menu on a deferred asset
      await page.mouse.wheel(0, 300);
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'screenshots/pw-41-deferred-scrolled.png', fullPage: true });

      // Check for Change Type on a deferred (unlocked) asset
      const allMoreBtns = page.locator('button:has(svg.lucide-more-vertical), button:has(svg.lucide-ellipsis-vertical)');
      const allBtnCount = await allMoreBtns.count();
      console.log('   Total three-dot buttons:', allBtnCount);

      // Try the 3rd or later one (which should be a deferred asset)
      if (allBtnCount > 2) {
        console.log('3. Testing context menu on deferred asset...');
        await allMoreBtns.nth(2).click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: 'screenshots/pw-42-deferred-menu.png' });

        const menuItems = page.locator('[role="menuitem"]');
        const menuCount = await menuItems.count();
        console.log('   Menu items:', menuCount);
        for (let i = 0; i < menuCount; i++) {
          const text = await menuItems.nth(i).textContent();
          console.log('     Item ' + i + ':', text.trim());
        }

        // Check for Change Type
        const changeType = page.locator('[role="menuitem"]:has-text("Change Type")');
        const ctVisible = await changeType.isVisible({ timeout: 1000 }).catch(() => false);
        console.log('   Change Type visible on deferred asset:', ctVisible);

        if (ctVisible) {
          await changeType.hover();
          await page.waitForTimeout(800);
          await page.screenshot({ path: 'screenshots/pw-43-change-type-submenu.png' });
        }

        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
      }
    }

    // Test Select mode for merge
    console.log('4. Testing Select mode...');
    await page.mouse.wheel(0, -600);
    await page.waitForTimeout(500);

    const selectBtn = page.locator('button:has-text("Select")').first();
    const selectVisible = await selectBtn.isVisible({ timeout: 2000 }).catch(() => false);
    console.log('   Select button visible:', selectVisible);

    if (selectVisible) {
      await selectBtn.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: 'screenshots/pw-44-select-mode.png', fullPage: true });

      // Check if selection checkboxes appeared
      const checkboxes = page.locator('[role="checkbox"], input[type="checkbox"]');
      const cbCount = await checkboxes.count();
      console.log('   Checkboxes after Select:', cbCount);

      // Look for selection indicators on asset cards
      const assetCards = page.locator('[class*="border"][class*="rounded"]');
      const cardCount = await assetCards.count();
      console.log('   Asset cards:', cardCount);

      // Try clicking on asset images/cards to select them
      const qlanktonCard = page.locator('text=QLANKTON').first();
      if (await qlanktonCard.isVisible({ timeout: 1000 }).catch(() => false)) {
        await qlanktonCard.click();
        await page.waitForTimeout(500);
      }

      const spongebondCard = page.locator('text=SPONGEBOND').first();
      if (await spongebondCard.isVisible({ timeout: 1000 }).catch(() => false)) {
        await spongebondCard.click();
        await page.waitForTimeout(500);
      }

      await page.screenshot({ path: 'screenshots/pw-45-selected-assets.png', fullPage: true });

      // Check for merge button now
      const mergeBtn = page.locator('button:has-text("Merge")');
      const mergeVisible = await mergeBtn.isVisible({ timeout: 2000 }).catch(() => false);
      console.log('   Merge button visible after selection:', mergeVisible);

      if (mergeVisible) {
        const mergeDisabled = await mergeBtn.isDisabled();
        console.log('   Merge button disabled:', mergeDisabled);

        if (!mergeDisabled) {
          console.log('5. Opening Merge dialog...');
          await mergeBtn.click();
          await page.waitForTimeout(2000);
          await page.screenshot({ path: 'screenshots/pw-46-merge-dialog.png' });

          // Check dialog contents
          const dialog = page.locator('[role="dialog"]');
          const dialogVisible = await dialog.isVisible({ timeout: 2000 }).catch(() => false);
          console.log('   Merge dialog visible:', dialogVisible);

          if (dialogVisible) {
            // Check for dialog elements
            const dialogText = await dialog.textContent();
            console.log('   Has "Merge" in title:', dialogText.includes('Merge'));
            console.log('   Has "AI Merge":', dialogText.includes('AI Merge'));
            console.log('   Has "Absorbed":', dialogText.includes('Absorbed'));
            console.log('   Has "Survivor":', dialogText.includes('Survivor'));
            console.log('   Has "different types":', dialogText.includes('different types'));
            console.log('   Has "Confirm Merge":', dialogText.includes('Confirm Merge'));

            // Check for type badges in the dialog
            const badges = dialog.locator('[class*="badge"], [class*="Badge"]');
            const badgeCount = await badges.count();
            console.log('   Badges in dialog:', badgeCount);

            // Close dialog
            const cancelBtn = dialog.locator('button:has-text("Cancel")');
            if (await cancelBtn.isVisible({ timeout: 500 }).catch(() => false)) {
              await cancelBtn.click();
              await page.waitForTimeout(500);
            }
          }
        }
      }

      // Exit select mode
      const cancelSelect = page.locator('button:has-text("Cancel"), button:has-text("Done")');
      if (await cancelSelect.isVisible({ timeout: 1000 }).catch(() => false)) {
        await cancelSelect.first().click();
        await page.waitForTimeout(500);
      }
    }

    // Re-lock stage
    console.log('6. Re-locking Stage 5...');
    await page.mouse.wheel(0, -400);
    await page.waitForTimeout(500);
    const lockBtn = page.locator('button:has-text("Lock All")').first();
    if (await lockBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await lockBtn.click();
      await page.waitForTimeout(3000);
      // Confirm if dialog
      const confirmBtn = page.locator('[role="dialog"] button').last();
      if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmBtn.click();
        await page.waitForTimeout(2000);
      }
      console.log('   Re-locked');
    }

    await page.screenshot({ path: 'screenshots/pw-47-done.png', fullPage: true });
    console.log('\nSelect/Merge tests complete');
  } catch(e) {
    console.error('Error:', e.message);
    await page.screenshot({ path: 'screenshots/pw-error-merge.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();
