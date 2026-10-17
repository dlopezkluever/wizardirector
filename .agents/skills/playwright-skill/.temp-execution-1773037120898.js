const { chromium } = require('playwright');
const fs = require('fs');

const TARGET_URL = 'http://localhost:8080';
const PROJECT_ID = '517a4cda-618b-4216-b105-42dbc68103cf';
const SCENE_ID = '3aeef116-dd41-469e-a48d-f993e3d04dc4';
const SS = 'C:/Users/Daniel Lopez/Desktop/Aiuteur/wizardirector/tmp-pw';
const AUTH = `${SS}/auth-state.json`;
const TEST_IMAGE = 'C:/Users/Daniel Lopez/Desktop/Aiuteur/wizardirector/ui-images/3.5-stage-8.PNG';

if (!fs.existsSync(SS)) fs.mkdirSync(SS, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 80 });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    storageState: AUTH
  });
  const page = await context.newPage();
  let testResults = [];

  function pass(name) { testResults.push({ name, status: 'PASS' }); console.log(`  PASS: ${name}`); }
  function fail(name, reason) { testResults.push({ name, status: 'FAIL', reason }); console.log(`  FAIL: ${name} - ${reason}`); }
  function skip(name, reason) { testResults.push({ name, status: 'SKIP', reason }); console.log(`  SKIP: ${name} - ${reason}`); }

  try {
    console.log('\n========================================');
    console.log('TEST SUITE 3: Stage 10 - Frame Upload + Checkbox');
    console.log('========================================\n');

    // Navigate to Stage 10
    await page.goto(`${TARGET_URL}/projects/${PROJECT_ID}?stage=10&sceneId=${SCENE_ID}`, {
      waitUntil: 'networkidle', timeout: 20000
    });
    await page.waitForTimeout(3000);

    // Make sure Shot 1A is selected (should be by default)
    const shot1A = page.locator('button:has-text("Shot 1A")').first();
    if (await shot1A.count() > 0) {
      await shot1A.click();
      await page.waitForTimeout(1000);
    }

    // Find the upload icon button near "Start Frame" header
    // The upload button is an icon-only button with an Upload SVG
    console.log('--- Looking for frame upload button ---');

    // Get all small icon buttons (the upload is icon-only, small)
    const allBtns = await page.locator('button').all();
    console.log(`Total buttons: ${allBtns.length}`);

    // Log button details to find the upload
    for (let i = 0; i < allBtns.length; i++) {
      const text = (await allBtns[i].textContent()).trim();
      const ariaLabel = await allBtns[i].getAttribute('aria-label').catch(() => null);
      const title = await allBtns[i].getAttribute('title').catch(() => null);
      // Check if button has SVG child
      const hasSvg = (await allBtns[i].locator('svg').count()) > 0;
      if (hasSvg && !text) {
        const bbox = await allBtns[i].boundingBox().catch(() => null);
        console.log(`  Icon btn ${i}: aria="${ariaLabel}", title="${title}", pos=${bbox ? `${Math.round(bbox.x)},${Math.round(bbox.y)}` : 'n/a'}`);
      }
    }

    // The upload button should be near the "Start Frame" text area
    // Let's find buttons near the start frame header (top-left of frame area)
    // From the screenshot: Start Frame header is at ~x:420, y:403
    // The upload icon is the cloud-with-arrow icon next to "Start Frame  Pending"

    // Try to find icon buttons in the start frame header area by position
    const startFrameHeader = page.locator('text=start Frame, text=Start Frame').first();
    if (await startFrameHeader.count() > 0) {
      const bbox = await startFrameHeader.boundingBox();
      console.log('Start Frame header at:', bbox);

      // Find buttons near this header
      const nearbyBtns = page.locator('button').filter({
        has: page.locator('svg.lucide-upload, svg.lucide-cloud-upload, svg')
      });

      // Click the icon button nearest to the Start Frame header
      // The upload button should be to the right of the Start Frame text
      for (const btn of await nearbyBtns.all()) {
        const btnBox = await btn.boundingBox().catch(() => null);
        if (btnBox && bbox) {
          // Check if button is on the same row as Start Frame header
          if (Math.abs(btnBox.y - bbox.y) < 30 && btnBox.x > bbox.x) {
            console.log(`Found nearby button at ${Math.round(btnBox.x)},${Math.round(btnBox.y)}`);

            // Try clicking it with file chooser
            const fileChooserPromise = page.waitForEvent('filechooser', { timeout: 3000 }).catch(() => null);
            await btn.click();
            await page.waitForTimeout(500);

            const chooser = await fileChooserPromise;
            if (chooser) {
              console.log('File chooser opened! Uploading test image...');
              await chooser.setFiles(TEST_IMAGE);
              break;
            } else {
              console.log('Button clicked but no file chooser (might be a modal trigger)');
              await page.screenshot({ path: `${SS}/51-after-icon-click.png` });

              // Check if a modal opened
              const modal = page.locator('[role="dialog"]');
              if (await modal.isVisible().catch(() => false)) {
                console.log('Upload modal appeared!');
                await page.screenshot({ path: `${SS}/52-upload-modal.png` });

                // Look for file drop zone or upload button in the modal
                const dropzone = modal.locator('[class*="dropzone"], [class*="drop"], input[type="file"]');
                const dzCount = await dropzone.count();
                console.log('Dropzone/file inputs in modal:', dzCount);

                // Look for buttons in the modal
                const modalBtns = await modal.locator('button').allTextContents();
                console.log('Modal buttons:', modalBtns);

                // Try setting files on any hidden input
                const hiddenInput = modal.locator('input[type="file"]');
                if (await hiddenInput.count() > 0) {
                  await hiddenInput.setInputFiles(TEST_IMAGE);
                  console.log('File set on hidden input in modal');
                  await page.waitForTimeout(3000);
                  await page.screenshot({ path: `${SS}/53-file-selected-in-modal.png` });

                  // Look for confirm/upload button
                  const confirmBtn = modal.locator('button:has-text("Upload"), button:has-text("Confirm"), button:has-text("Use as")');
                  if (await confirmBtn.count() > 0) {
                    const cbText = await confirmBtn.first().textContent();
                    console.log('Clicking confirm button:', cbText);
                    await confirmBtn.first().click();
                    await page.waitForTimeout(5000);
                    await page.screenshot({ path: `${SS}/54-frame-uploaded.png` });
                  }
                } else {
                  // Try drag and drop approach - click the dropzone area
                  const dropArea = modal.locator('[class*="border-dashed"], [class*="cursor-pointer"]').first();
                  if (await dropArea.count() > 0) {
                    const filePromise = page.waitForEvent('filechooser', { timeout: 3000 }).catch(() => null);
                    await dropArea.click();
                    const fc = await filePromise;
                    if (fc) {
                      await fc.setFiles(TEST_IMAGE);
                      console.log('File selected via dropzone click');
                      await page.waitForTimeout(3000);
                      await page.screenshot({ path: `${SS}/53-file-via-dropzone.png` });
                    }
                  }
                }

                // Close modal if still open
                await page.keyboard.press('Escape');
                await page.waitForTimeout(500);
              }
            }
          }
        }
      }
    }

    // Wait and check for regenerate button
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${SS}/55-stage10-after-attempts.png` });

    const regenBtns = page.locator('button:has-text("Regenerate")');
    const regenCount = await regenBtns.count();
    console.log('Regenerate buttons:', regenCount);

    if (regenCount > 0) {
      console.log('\n--- Frame uploaded! Testing FramePanel Checkbox ---');
      await regenBtns.first().click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `${SS}/56-regen-panel.png` });

      const frameCheckbox = page.locator('[id^="use-ref-"]');
      const cbCount = await frameCheckbox.count();
      console.log('use-ref checkboxes:', cbCount);

      if (cbCount > 0) {
        const cb = frameCheckbox.first();
        const id = await cb.getAttribute('id');
        pass(`Stage 10: Frame checkbox "${id}" visible`);

        const state = await cb.getAttribute('data-state');
        if (state === 'unchecked') pass('Stage 10: Defaults UNCHECKED');
        else fail('Stage 10: Default state', `Got: "${state}"`);

        await cb.click();
        await page.waitForTimeout(300);
        const on = await cb.getAttribute('data-state');
        if (on === 'checked') pass('Stage 10: Toggles ON');
        await page.screenshot({ path: `${SS}/57-frame-cb-checked.png` });

        await cb.click();
        await page.waitForTimeout(300);
        const off = await cb.getAttribute('data-state');
        if (off === 'unchecked') pass('Stage 10: Toggles back OFF');

        const lbl = page.locator(`label[for="${id}"]`);
        const lblText = await lbl.textContent().catch(() => '');
        if (lblText.includes('Use current image as reference')) {
          pass('Stage 10: Label says "Use current image as reference"');
        } else {
          console.log('Label text:', lblText);
        }
      } else {
        skip('Stage 10: Frame checkbox', 'Not visible in regen panel');
      }
    } else {
      skip('Stage 10: Frame checkbox', 'No frames generated/uploaded - Regenerate not available');
    }

    await page.screenshot({ path: `${SS}/58-stage10-final.png`, fullPage: true });

    // ====== RESULTS ======
    console.log('\n========================================');
    console.log('TEST RESULTS: Stage 10');
    console.log('========================================');
    const passed = testResults.filter(t => t.status === 'PASS').length;
    const failed = testResults.filter(t => t.status === 'FAIL').length;
    const skipped = testResults.filter(t => t.status === 'SKIP').length;
    console.log(`Total: ${testResults.length} | PASS: ${passed} | FAIL: ${failed} | SKIP: ${skipped}`);
    testResults.forEach(t => {
      console.log(`  [${t.status}] ${t.name}${t.reason ? ` (${t.reason})` : ''}`);
    });

  } catch (error) {
    console.error('\nFATAL ERROR:', error.message);
    console.error(error.stack);
    await page.screenshot({ path: `${SS}/error-stage10-final.png` }).catch(() => {});
  } finally {
    await browser.close();
  }
})();
