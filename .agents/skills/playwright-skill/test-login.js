const { chromium } = require('playwright');

const TARGET_URL = 'http://localhost:8080';

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  try {
    console.log('1. Navigating to app...');
    await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 15000 });
    await page.screenshot({ path: 'screenshots/pw-01-initial.png', fullPage: true });
    console.log('   Title:', await page.title());
    console.log('   Current URL:', page.url());

    // Look for login form elements
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('2. Login form detected, filling credentials...');
      await emailInput.fill('lopezklu@yahoo.com');
      await passwordInput.fill('1Odielone!');
      await page.screenshot({ path: 'screenshots/pw-02-login-filled.png' });

      const signInButton = page.locator('button[type="submit"]').first();
      await signInButton.click();
      console.log('   Clicked sign in button');

      await page.waitForTimeout(5000);
      await page.screenshot({ path: 'screenshots/pw-03-after-login.png', fullPage: true });
      console.log('   After login URL:', page.url());
    } else {
      console.log('2. No login form found, might already be logged in');
    }

    // Navigate to target project Stage 8
    console.log('3. Navigating to Stage 8...');
    await page.goto(
      'http://localhost:8080/projects/517a4cda-618b-4216-b105-42dbc68103cf?stage=8&sceneId=343199c9-3074-4403-a883-f6c3eef4f144',
      { waitUntil: 'networkidle', timeout: 20000 }
    );
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'screenshots/pw-04-stage8.png', fullPage: true });
    console.log('   Stage 8 loaded. URL:', page.url());

    console.log('\nDone - Login and navigation complete');
  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: 'screenshots/pw-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();
