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

    // === Stage 5: Select mode and radio selection ===
    console.log('\n=== STAGE 5: SELECT MODE ===');
    await page.goto('http://localhost:8080/projects/517a4cda-618b-4216-b105-42dbc68103cf?stage=5', { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(3000);

    // Unlock if needed
    const unlockBtn = page.locator('button:has-text("Unlock & Edit")');
    if (await unlockBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await unlockBtn.click();
      await page.waitForTimeout(2000);
    }

    // Enter select mode
    const selectBtn = page.locator('button:has-text("Select")').first();
    if (await selectBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await selectBtn.click();
      await page.waitForTimeout(1000);
    }

    // Scroll to assets
    await page.mouse.wheel(0, 350);
    await page.waitForTimeout(500);

    // Click the radio circles to select assets
    const radioCircles = page.locator('[role="checkbox"], input[type="checkbox"]');
    const radioCount = await radioCircles.count();
    console.log('   Selection circles:', radioCount);

    if (radioCount >= 2) {
      await radioCircles.nth(0).click({ force: true });
      await page.waitForTimeout(300);
      await radioCircles.nth(1).click({ force: true });
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'screenshots/pw-50-both-selected.png', fullPage: true });

      // Check for merge button
      const mergeBtn = page.locator('button:has-text("Merge")');
      const mergeVisible = await mergeBtn.isVisible({ timeout: 2000 }).catch(() => false);
      console.log('   Merge button visible:', mergeVisible);

      if (mergeVisible) {
        const mergeDisabled = await mergeBtn.isDisabled();
        console.log('   Merge button disabled:', mergeDisabled);

        if (!mergeDisabled) {
          await mergeBtn.click();
          await page.waitForTimeout(2000);
          await page.screenshot({ path: 'screenshots/pw-51-merge-dialog.png' });

          const dialog = page.locator('[role="dialog"]');
          if (await dialog.isVisible({ timeout: 2000 }).catch(() => false)) {
            const dialogText = await dialog.textContent();
            console.log('   Dialog has "Merge":', dialogText.includes('Merge'));
            console.log('   Dialog has "AI Merge":', dialogText.includes('AI Merge'));
            console.log('   Dialog has "Absorbed":', dialogText.includes('Absorbed'));
            console.log('   Dialog has "Survivor":', dialogText.includes('Survivor'));
            console.log('   Dialog has "Confirm Merge":', dialogText.includes('Confirm Merge'));

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
      await radioCircles.nth(0).click({ force: true });
      await page.waitForTimeout(200);
      await radioCircles.nth(1).click({ force: true });
      await page.waitForTimeout(200);
    }

    // Exit select mode
    const exitSelect = page.locator('button:has-text("Exit Select")');
    if (await exitSelect.isVisible({ timeout: 1000 }).catch(() => false)) {
      await exitSelect.click();
      await page.waitForTimeout(500);
    }

    // Re-lock stage
    const lockBtn = page.locator('button:has-text("Lock All")').first();
    if (await lockBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await lockBtn.click();
      await page.waitForTimeout(2000);
      const confirmBtn = page.locator('[role="dialog"] button').last();
      if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmBtn.click();
        await page.waitForTimeout(2000);
      }
    }

    // === Stage 8: Full convert-to-transformation dialog flow ===
    console.log('\n=== STAGE 8: CONVERT TO TRANSFORMATION ===');
    await page.goto('http://localhost:8080/projects/517a4cda-618b-4216-b105-42dbc68103cf?stage=8&sceneId=343199c9-3074-4403-a883-f6c3eef4f144', { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(3000);

    // Click on SPONGEBOND asset to see its detail panel
    console.log('   Testing asset detail panel...');
    const spongebondAsset = page.locator('text=SPONGEBOND').first();
    if (await spongebondAsset.isVisible({ timeout: 2000 }).catch(() => false)) {
      await spongebondAsset.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'screenshots/pw-52-spongebond-detail.png', fullPage: true });

      // Check for transformation UI in detail panel
      const detailPanel = page.locator('main, [class*="detail"], [class*="panel"]');
      const panelText = await page.locator('body').textContent();
      console.log('   Page has "Transformation":', panelText.includes('Transformation'));
      console.log('   Page has "Add Transformation":', panelText.includes('Add Transformation'));
      console.log('   Page has "Description":', panelText.includes('Description') || panelText.includes('description'));
    }

    // Test all three asset context menus
    console.log('   Testing all asset context menus...');
    const allMoreBtns = page.locator('button:has(svg.lucide-more-vertical), button:has(svg.lucide-ellipsis-vertical)');
    const totalBtns = await allMoreBtns.count();
    console.log('   Total context menu buttons:', totalBtns);

    for (let i = 0; i < Math.min(totalBtns, 3); i++) {
      await allMoreBtns.nth(i).click();
      await page.waitForTimeout(800);

      const menuItems = page.locator('[role="menuitem"]');
      const itemCount = await menuItems.count();
      const items = [];
      for (let j = 0; j < itemCount; j++) {
        items.push(await menuItems.nth(j).textContent().then(t => t.trim()));
      }
      console.log('   Asset ' + i + ' menu:', items.join(' | '));

      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }

    // Open Convert to Transformation on GARDEN GNOME
    console.log('   Opening Convert dialog on GARDEN GNOME...');
    const gnomeMoreBtn = allMoreBtns.nth(totalBtns - 1); // Last asset = GARDEN GNOME (bottom)
    await page.mouse.wheel(0, 200);
    await page.waitForTimeout(300);
    await gnomeMoreBtn.click();
    await page.waitForTimeout(800);

    const convertItem = page.locator('[role="menuitem"]:has-text("Convert to Transformation")');
    if (await convertItem.isVisible({ timeout: 1000 }).catch(() => false)) {
      await convertItem.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: 'screenshots/pw-53-convert-dialog-full.png' });

      const dialog = page.locator('[role="dialog"]');
      if (await dialog.isVisible({ timeout: 2000 }).catch(() => false)) {
        const dialogText = await dialog.textContent();
        console.log('   Dialog title has "Convert":', dialogText.includes('Convert'));
        console.log('   Dialog has "GARDEN GNOME":', dialogText.includes('GARDEN GNOME'));
        console.log('   Dialog has "Select Base Asset":', dialogText.includes('Select Base Asset'));
        console.log('   Dialog has "Next" button:', dialogText.includes('Next'));
        console.log('   Dialog has "Cancel" button:', dialogText.includes('Cancel'));

        // Count radio options (other assets)
        const radios = dialog.locator('[role="radio"]');
        const radioCount = await radios.count();
        console.log('   Base asset radio options:', radioCount);

        // Select SPONGEBOND and click Next (don't actually submit)
        if (radioCount > 0) {
          // Select the second option (SPONGEBOND)
          await radios.last().click();
          await page.waitForTimeout(500);
          await page.screenshot({ path: 'screenshots/pw-54-convert-selected-spongebond.png' });

          // Check Next button is enabled
          const nextBtn = dialog.locator('button:has-text("Next")');
          const nextDisabled = await nextBtn.isDisabled();
          console.log('   Next button disabled:', nextDisabled);
        }

        // Cancel to close
        const cancelBtn = dialog.locator('button:has-text("Cancel")');
        await cancelBtn.click();
        await page.waitForTimeout(500);
      }
    }

    // === Explore Stage 7 (Shot List), Stage 9, Stage 10 briefly ===
    console.log('\n=== EXPLORING OTHER STAGES ===');

    // Stage 7: Shot List
    console.log('   Visiting Stage 7 (Shot List)...');
    await page.goto('http://localhost:8080/projects/517a4cda-618b-4216-b105-42dbc68103cf?stage=7&sceneId=343199c9-3074-4403-a883-f6c3eef4f144', { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'screenshots/pw-55-stage7.png', fullPage: true });

    // Stage 9: Shot Asset Assignments
    console.log('   Visiting Stage 9 (Prompts)...');
    await page.goto('http://localhost:8080/projects/517a4cda-618b-4216-b105-42dbc68103cf?stage=9&sceneId=343199c9-3074-4403-a883-f6c3eef4f144', { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'screenshots/pw-56-stage9.png', fullPage: true });

    // Stage 6: Script Hub
    console.log('   Visiting Stage 6 (Script Hub)...');
    await page.goto('http://localhost:8080/projects/517a4cda-618b-4216-b105-42dbc68103cf?stage=6', { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'screenshots/pw-57-stage6.png', fullPage: true });

    // Dashboard
    console.log('   Visiting Dashboard...');
    await page.goto('http://localhost:8080/dashboard', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots/pw-58-dashboard.png', fullPage: true });

    console.log('\n=== ALL TESTS COMPLETE ===');
  } catch(e) {
    console.error('Error:', e.message);
    await page.screenshot({ path: 'screenshots/pw-error-comprehensive.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();
