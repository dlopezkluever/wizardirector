const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 250 });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();
  try {
    // Login
    console.log('=== LOGIN ===');
    await page.goto('http://localhost:8080/auth', { waitUntil: 'networkidle', timeout: 15000 });
    await page.locator('input[type="email"]').first().fill('lopezklu@yahoo.com');
    await page.locator('input[type="password"]').first().fill('1Odielone!');
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // === Stage 5: Unlock and test Change Type + Select/Merge ===
    console.log('\n=== STAGE 5: UNLOCK + CHANGE TYPE + SELECT/MERGE ===');
    await page.goto('http://localhost:8080/projects/517a4cda-618b-4216-b105-42dbc68103cf?stage=5', { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'screenshots/ux-01-stage5-locked.png', fullPage: true });

    // Unlock
    const unlockBtn = page.locator('button:has-text("Unlock & Edit")');
    if (await unlockBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await unlockBtn.click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'screenshots/ux-02-stage5-unlocked.png', fullPage: true });
    }

    // Scroll to see assets
    await page.mouse.wheel(0, 350);
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'screenshots/ux-03-stage5-assets.png', fullPage: true });

    // Test context menu on first asset (should show Change Type when unlocked)
    console.log('   Testing context menu on unlocked assets...');
    const allMoreBtns = page.locator('button:has(svg.lucide-more-vertical), button:has(svg.lucide-ellipsis-vertical)');
    const totalBtns = await allMoreBtns.count();
    console.log('   Total context menu buttons:', totalBtns);

    if (totalBtns > 0) {
      // Test first asset's menu
      await allMoreBtns.nth(0).click();
      await page.waitForTimeout(800);

      const menuItems = page.locator('[role="menuitem"]');
      const menuCount = await menuItems.count();
      const items = [];
      for (let j = 0; j < menuCount; j++) {
        items.push(await menuItems.nth(j).textContent().then(t => t.trim()));
      }
      console.log('   Asset 0 menu items:', items.join(' | '));
      await page.screenshot({ path: 'screenshots/ux-04-context-menu.png' });

      // Check for Change Type submenu
      const changeType = page.locator('[role="menuitem"]:has-text("Change Type")');
      const ctVisible = await changeType.isVisible({ timeout: 1000 }).catch(() => false);
      console.log('   Change Type visible:', ctVisible);

      if (ctVisible) {
        await changeType.hover();
        await page.waitForTimeout(800);
        await page.screenshot({ path: 'screenshots/ux-05-change-type-submenu.png' });

        // Check submenu items
        const subItems = page.locator('[role="menuitem"]');
        const subCount = await subItems.count();
        for (let i = 0; i < subCount; i++) {
          const text = await subItems.nth(i).textContent();
          const disabled = await subItems.nth(i).getAttribute('data-disabled');
          console.log('     Sub:', text.trim(), disabled ? '(disabled)' : '');
        }
      }

      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }

    // Test Select mode
    console.log('   Testing Select mode...');
    await page.mouse.wheel(0, -400);
    await page.waitForTimeout(300);

    const selectBtn = page.locator('button:has-text("Select")').first();
    if (await selectBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await selectBtn.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: 'screenshots/ux-06-select-mode.png', fullPage: true });

      // Scroll back to assets
      await page.mouse.wheel(0, 350);
      await page.waitForTimeout(500);

      // Try checkboxes
      const checkboxes = page.locator('[role="checkbox"], input[type="checkbox"]');
      const cbCount = await checkboxes.count();
      console.log('   Checkboxes in select mode:', cbCount);

      if (cbCount >= 2) {
        await checkboxes.nth(0).click({ force: true });
        await page.waitForTimeout(300);
        await checkboxes.nth(1).click({ force: true });
        await page.waitForTimeout(500);
        await page.screenshot({ path: 'screenshots/ux-07-two-selected.png', fullPage: true });

        // Check merge button
        const mergeBtn = page.locator('button:has-text("Merge")');
        const mergeVisible = await mergeBtn.isVisible({ timeout: 2000 }).catch(() => false);
        console.log('   Merge button visible:', mergeVisible);

        if (mergeVisible) {
          const mergeDisabled = await mergeBtn.isDisabled();
          console.log('   Merge disabled:', mergeDisabled);

          if (!mergeDisabled) {
            await mergeBtn.click();
            await page.waitForTimeout(2000);
            await page.screenshot({ path: 'screenshots/ux-08-merge-dialog.png' });

            // Inspect dialog
            const dialog = page.locator('[role="dialog"]');
            if (await dialog.isVisible({ timeout: 2000 }).catch(() => false)) {
              const dialogText = await dialog.textContent();
              console.log('   Dialog: Merge?', dialogText.includes('Merge'));
              console.log('   Dialog: AI Merge?', dialogText.includes('AI Merge'));
              console.log('   Dialog: Absorbed?', dialogText.includes('Absorbed'));
              console.log('   Dialog: Survivor?', dialogText.includes('Survivor'));
              console.log('   Dialog: Confirm Merge?', dialogText.includes('Confirm Merge'));
              console.log('   Dialog: cross-type warning?', dialogText.includes('different types'));
              console.log('   Dialog: type badge?', dialogText.includes('Character') || dialogText.includes('Prop') || dialogText.includes('Location'));

              // Check for description section
              const textarea = dialog.locator('textarea');
              const textareaCount = await textarea.count();
              console.log('   Description textarea count:', textareaCount);

              // Check for AI Merge button
              const aiMergeBtn = dialog.locator('button:has-text("AI Merge")');
              const aiMergeVisible = await aiMergeBtn.isVisible({ timeout: 1000 }).catch(() => false);
              console.log('   AI Merge button visible:', aiMergeVisible);

              // Scroll dialog to see full content
              await page.screenshot({ path: 'screenshots/ux-09-merge-dialog-detail.png' });

              // Close
              const cancelBtn = dialog.locator('button:has-text("Cancel")');
              if (await cancelBtn.isVisible().catch(() => false)) {
                await cancelBtn.click();
                await page.waitForTimeout(500);
              }
            }
          }
        }

        // Deselect
        await checkboxes.nth(0).click({ force: true });
        await page.waitForTimeout(200);
        await checkboxes.nth(1).click({ force: true });
        await page.waitForTimeout(200);
      }

      // Exit select mode
      const exitSelect = page.locator('button:has-text("Exit Select"), button:has-text("Cancel")');
      if (await exitSelect.isVisible({ timeout: 1000 }).catch(() => false)) {
        await exitSelect.first().click();
        await page.waitForTimeout(500);
      }
    }

    // Test deferred assets section
    console.log('   Testing Deferred Assets section...');
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(500);

    const deferredSection = page.locator('text=Deferred Assets');
    if (await deferredSection.isVisible({ timeout: 2000 }).catch(() => false)) {
      await deferredSection.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: 'screenshots/ux-10-deferred-assets.png', fullPage: true });
    }

    // Re-lock stage
    console.log('   Re-locking Stage 5...');
    await page.mouse.wheel(0, -800);
    await page.waitForTimeout(500);
    const lockBtn = page.locator('button:has-text("Lock All")').first();
    if (await lockBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await lockBtn.click();
      await page.waitForTimeout(2000);
      const confirmBtn = page.locator('[role="dialog"] button').last();
      if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmBtn.click();
        await page.waitForTimeout(2000);
      }
      console.log('   Re-locked');
    }

    // === Stage 8: Full flow ===
    console.log('\n=== STAGE 8: CONVERT TO TRANSFORMATION ===');
    await page.goto('http://localhost:8080/projects/517a4cda-618b-4216-b105-42dbc68103cf?stage=8&sceneId=343199c9-3074-4403-a883-f6c3eef4f144', { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'screenshots/ux-11-stage8.png', fullPage: true });

    // Click SPONGEBOND to see detail
    const spongebond = page.locator('text=SPONGEBOND').first();
    if (await spongebond.isVisible({ timeout: 2000 }).catch(() => false)) {
      await spongebond.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'screenshots/ux-12-spongebond-detail.png', fullPage: true });
    }

    // Test context menu on GARDEN GNOME
    console.log('   Testing Convert to Transformation on GARDEN GNOME...');
    const moreBtns8 = page.locator('button:has(svg.lucide-more-vertical), button:has(svg.lucide-ellipsis-vertical)');
    const btnCount8 = await moreBtns8.count();
    console.log('   Context menu buttons:', btnCount8);

    if (btnCount8 > 0) {
      // Click last one (GARDEN GNOME at bottom)
      await page.mouse.wheel(0, 200);
      await page.waitForTimeout(300);
      await moreBtns8.last().click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: 'screenshots/ux-13-stage8-menu.png' });

      const convertItem = page.locator('[role="menuitem"]:has-text("Convert to Transformation")');
      if (await convertItem.isVisible({ timeout: 1000 }).catch(() => false)) {
        await convertItem.click();
        await page.waitForTimeout(1500);
        await page.screenshot({ path: 'screenshots/ux-14-convert-dialog.png' });

        const dialog = page.locator('[role="dialog"]');
        if (await dialog.isVisible({ timeout: 2000 }).catch(() => false)) {
          const dialogText = await dialog.textContent();
          console.log('   Convert dialog elements:');
          console.log('     Title "Convert":', dialogText.includes('Convert'));
          console.log('     Asset name:', dialogText.includes('GARDEN GNOME'));
          console.log('     Base Asset picker:', dialogText.includes('Select Base Asset'));
          console.log('     Has thumbnails:', (await dialog.locator('img').count()) > 0);
          console.log('     Has type badges:', dialogText.includes('character') || dialogText.includes('Character') || dialogText.includes('prop') || dialogText.includes('Prop'));

          // Check radio options
          const radios = dialog.locator('[role="radio"]');
          const radioCount = await radios.count();
          console.log('     Radio options:', radioCount);

          for (let i = 0; i < radioCount; i++) {
            const radioText = await radios.nth(i).textContent();
            console.log('       Option', i + ':', radioText.trim());
          }

          // Select one and check Next is enabled
          if (radioCount > 0) {
            await radios.first().click();
            await page.waitForTimeout(500);
            const nextBtn = dialog.locator('button:has-text("Next")');
            const nextDisabled = await nextBtn.isDisabled();
            console.log('     Next button disabled after selection:', nextDisabled);
            await page.screenshot({ path: 'screenshots/ux-15-convert-selected.png' });
          }

          // Cancel
          const cancelBtn = dialog.locator('button:has-text("Cancel")');
          await cancelBtn.click();
          await page.waitForTimeout(500);
        }
      } else {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
      }
    }

    // === Stage 7: Shot List ===
    console.log('\n=== STAGE 7: SHOT LIST ===');
    await page.goto('http://localhost:8080/projects/517a4cda-618b-4216-b105-42dbc68103cf?stage=7&sceneId=343199c9-3074-4403-a883-f6c3eef4f144', { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'screenshots/ux-16-stage7.png', fullPage: true });

    // Check stage 7 elements
    const bodyText7 = await page.locator('body').textContent();
    console.log('   Has "Shot":', bodyText7.includes('Shot'));
    console.log('   Has "Scene":', bodyText7.includes('Scene'));

    // === Stage 9: Prompts ===
    console.log('\n=== STAGE 9: PROMPTS ===');
    await page.goto('http://localhost:8080/projects/517a4cda-618b-4216-b105-42dbc68103cf?stage=9&sceneId=343199c9-3074-4403-a883-f6c3eef4f144', { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'screenshots/ux-17-stage9.png', fullPage: true });

    // Scroll to see more content
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'screenshots/ux-18-stage9-scrolled.png', fullPage: true });

    // === Stage 10 ===
    console.log('\n=== STAGE 10 ===');
    await page.goto('http://localhost:8080/projects/517a4cda-618b-4216-b105-42dbc68103cf?stage=10&sceneId=343199c9-3074-4403-a883-f6c3eef4f144', { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'screenshots/ux-19-stage10.png', fullPage: true });

    // === Stage 6: Script Hub ===
    console.log('\n=== STAGE 6: SCRIPT HUB ===');
    await page.goto('http://localhost:8080/projects/517a4cda-618b-4216-b105-42dbc68103cf?stage=6', { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'screenshots/ux-20-stage6.png', fullPage: true });

    // === Dashboard ===
    console.log('\n=== DASHBOARD ===');
    await page.goto('http://localhost:8080/dashboard', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots/ux-21-dashboard.png', fullPage: true });

    console.log('\n=== ALL UX TESTS COMPLETE ===');
  } catch(e) {
    console.error('Error:', e.message);
    await page.screenshot({ path: 'screenshots/ux-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();
