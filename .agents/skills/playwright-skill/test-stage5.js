const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 400 });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  try {
    // Login
    await page.goto('http://localhost:8080/auth', { waitUntil: 'networkidle', timeout: 15000 });
    await page.locator('input[type="email"]').first().fill('lopezklu@yahoo.com');
    await page.locator('input[type="password"]').first().fill('1Odielone!');
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(3000);

    // Go to Stage 5
    console.log('1. Going to Stage 5...');
    await page.goto('http://localhost:8080/projects/517a4cda-618b-4216-b105-42dbc68103cf?stage=5', { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'screenshots/pw-11-stage5.png', fullPage: true });
    console.log('   Stage 5 URL:', page.url());

    // Find all asset rows/cards
    console.log('2. Finding assets on Stage 5...');

    // Look for SPONGEBOND
    const spongebondEl = page.locator('text=SPONGEBOND').first();
    const spongebondVisible = await spongebondEl.isVisible({ timeout: 3000 }).catch(() => false);
    console.log('   SPONGEBOND visible:', spongebondVisible);

    // Look for GARDEN GNOME
    const gnomeEl = page.locator('text=GARDEN GNOME').first();
    const gnomeVisible = await gnomeEl.isVisible({ timeout: 2000 }).catch(() => false);
    console.log('   GARDEN GNOME visible:', gnomeVisible);

    // Look for QLANKTON
    const qlanktonEl = page.locator('text=QLANKTON').first();
    const qlanktonVisible = await qlanktonEl.isVisible({ timeout: 2000 }).catch(() => false);
    console.log('   QLANKTON visible:', qlanktonVisible);

    // Try right-clicking on an asset to get the context menu
    if (spongebondVisible) {
      console.log('3. Testing context menu on SPONGEBOND...');

      // Scroll into view and hover
      await spongebondEl.scrollIntoViewIfNeeded();
      await spongebondEl.hover();
      await page.waitForTimeout(500);

      // Find the three-dot menu near SPONGEBOND
      // The DropdownMenuTrigger is usually a button with MoreVertical icon
      // Let's try to find it in the same row/container as SPONGEBOND
      const spongebondParent = spongebondEl.locator('xpath=ancestor::div[contains(@class, "flex")][position() <= 3]').last();

      // Try finding more-vertical buttons
      const allMoreBtns = page.locator('button:has(svg.lucide-more-vertical), button:has(svg.lucide-ellipsis-vertical)');
      const btnCount = await allMoreBtns.count();
      console.log('   More buttons on page:', btnCount);

      // Also look for dropdown trigger buttons in asset area
      const dropdownTriggers = page.locator('[role="button"][aria-haspopup="menu"]');
      const dropCount = await dropdownTriggers.count();
      console.log('   Dropdown trigger buttons:', dropCount);

      // Try right-clicking which may trigger the DropdownMenu
      await spongebondEl.click({ button: 'right' });
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'screenshots/pw-12-stage5-context.png' });

      // Check what appeared
      const menuItems = page.locator('[role="menuitem"]');
      const menuItemCount = await menuItems.count();
      console.log('   Menu items visible after right-click:', menuItemCount);

      if (menuItemCount > 0) {
        // List all menu items
        for (let i = 0; i < menuItemCount; i++) {
          const text = await menuItems.nth(i).textContent();
          console.log('     Menu item ' + i + ':', text.trim());
        }

        // Check for Change Type submenu
        const changeTypeItem = page.locator('[role="menuitem"]:has-text("Change Type"), text=Change Type');
        const changeTypeVisible = await changeTypeItem.isVisible({ timeout: 1000 }).catch(() => false);
        console.log('   Change Type menu item visible:', changeTypeVisible);

        if (changeTypeVisible) {
          // Hover over Change Type to open submenu
          await changeTypeItem.hover();
          await page.waitForTimeout(800);
          await page.screenshot({ path: 'screenshots/pw-13-change-type-submenu.png' });

          // Check for type options
          const charOption = page.locator('[role="menuitem"]:has-text("Character")');
          const propOption = page.locator('[role="menuitem"]:has-text("Prop")');
          const locationOption = page.locator('[role="menuitem"]:has-text("Location")');
          const extraOption = page.locator('[role="menuitem"]:has-text("Extra")');

          console.log('   Character option visible:', await charOption.isVisible({ timeout: 1000 }).catch(() => false));
          console.log('   Prop option visible:', await propOption.isVisible({ timeout: 500 }).catch(() => false));
          console.log('   Location option visible:', await locationOption.isVisible({ timeout: 500 }).catch(() => false));
          console.log('   Extra/Archetype option visible:', await extraOption.isVisible({ timeout: 500 }).catch(() => false));
        }

        // Close menu
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
      }
    }

    // Test Merge functionality
    console.log('4. Testing Merge functionality...');

    // Look for selection checkboxes on assets
    const checkboxes = page.locator('input[type="checkbox"], [role="checkbox"]');
    const checkboxCount = await checkboxes.count();
    console.log('   Checkboxes found:', checkboxCount);

    // Look for a Merge button (might need to select assets first)
    const mergeBtn = page.locator('button:has-text("Merge")').first();
    const mergeVisible = await mergeBtn.isVisible({ timeout: 1000 }).catch(() => false);
    console.log('   Merge button visible:', mergeVisible);

    // Try selecting assets if checkboxes exist
    if (checkboxCount >= 2) {
      console.log('   Selecting first 2 checkboxes...');
      await checkboxes.nth(0).click();
      await page.waitForTimeout(300);
      await checkboxes.nth(1).click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'screenshots/pw-14-stage5-selected.png' });

      // Check if merge button appeared/enabled
      const mergeBtnAfter = page.locator('button:has-text("Merge")').first();
      const mergeVisibleAfter = await mergeBtnAfter.isVisible({ timeout: 1000 }).catch(() => false);
      console.log('   Merge button visible after selection:', mergeVisibleAfter);

      if (mergeVisibleAfter) {
        const mergeDisabled = await mergeBtnAfter.isDisabled();
        console.log('   Merge button disabled:', mergeDisabled);

        if (!mergeDisabled) {
          // Click merge to open the MergeDialog
          await mergeBtnAfter.click();
          await page.waitForTimeout(1500);
          await page.screenshot({ path: 'screenshots/pw-15-merge-dialog.png' });

          // Check MergeDialog elements
          const dialogTitle = page.locator('[role="dialog"] h2, [role="dialog"] [class*="DialogTitle"]');
          const dialogVisible = await dialogTitle.isVisible({ timeout: 2000 }).catch(() => false);
          console.log('   Merge dialog opened:', dialogVisible);

          if (dialogVisible) {
            const titleText = await dialogTitle.textContent();
            console.log('   Dialog title:', titleText);

            // Check for type badges
            const badges = page.locator('[role="dialog"] [class*="Badge"], [role="dialog"] span[class*="badge"]');
            const badgeCount = await badges.count();
            console.log('   Type badges in dialog:', badgeCount);

            // Check for cross-type warning
            const warningEl = page.locator('[role="dialog"] [class*="amber"], [role="dialog"] [class*="Alert"]:has-text("different types")');
            const warningVisible = await warningEl.isVisible({ timeout: 1000 }).catch(() => false);
            console.log('   Cross-type warning visible:', warningVisible);

            // Check for AI Merge button
            const aiMergeBtn = page.locator('[role="dialog"] button:has-text("AI Merge")');
            const aiMergeVisible = await aiMergeBtn.isVisible({ timeout: 1000 }).catch(() => false);
            console.log('   AI Merge button visible:', aiMergeVisible);

            // Check for description sections
            const absorbedDesc = page.locator('[role="dialog"] :text("Absorbed Descriptions")');
            const absorbedVisible = await absorbedDesc.isVisible({ timeout: 1000 }).catch(() => false);
            console.log('   Absorbed Descriptions section:', absorbedVisible);

            const survivorDesc = page.locator('[role="dialog"] :text("Survivor Description")');
            const survivorVisible = await survivorDesc.isVisible({ timeout: 1000 }).catch(() => false);
            console.log('   Survivor Description section:', survivorVisible);

            // Check for Confirm Merge button
            const confirmBtn = page.locator('[role="dialog"] button:has-text("Confirm Merge")');
            const confirmVisible = await confirmBtn.isVisible({ timeout: 1000 }).catch(() => false);
            console.log('   Confirm Merge button visible:', confirmVisible);

            // Close dialog
            const cancelBtn = page.locator('[role="dialog"] button:has-text("Cancel")');
            if (await cancelBtn.isVisible({ timeout: 500 }).catch(() => false)) {
              await cancelBtn.click();
              await page.waitForTimeout(500);
            }
          }
        }
      }

      // Deselect
      await checkboxes.nth(0).click();
      await page.waitForTimeout(200);
      await checkboxes.nth(1).click();
      await page.waitForTimeout(200);
    }

    await page.screenshot({ path: 'screenshots/pw-16-stage5-final.png', fullPage: true });
    console.log('\nStage 5 tests complete');
  } catch(e) {
    console.error('Error:', e.message);
    await page.screenshot({ path: 'screenshots/pw-error-stage5.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();
