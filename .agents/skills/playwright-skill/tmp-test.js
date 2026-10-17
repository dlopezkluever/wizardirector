const { chromium } = require('playwright');

const TARGET_URL = 'http://localhost:8080';
const EMAIL = 'lopezklu@yahoo.com';
const PASSWORD = '1Odielone!';
const PROJECT_ID = '517a4cda-618b-4216-b105-42dbc68103cf';
const SCENE_ID = '5261f855-6db3-4272-b0d9-0127f05b9b87';

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 60 });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  const results = { passed: 0, failed: 0, checks: [] };

  function check(name, passed, detail) {
    results.checks.push({ name, passed, detail: detail || '' });
    if (passed) {
      results.passed++;
      console.log('  PASS: ' + name + (detail ? ' -- ' + detail : ''));
    } else {
      results.failed++;
      console.log('  FAIL: ' + name + (detail ? ' -- ' + detail : ''));
    }
  }

  try {
    // ====== LOGIN ======
    console.log('\nLogging in...');
    await page.goto(TARGET_URL + '/auth', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // Use specific IDs from the AuthForm component
    await page.locator('#email').fill(EMAIL);
    await page.waitForTimeout(200);
    await page.locator('#password').fill(PASSWORD);
    await page.waitForTimeout(200);

    // Click Sign In button
    await page.getByRole('button', { name: 'Sign In' }).click();
    console.log('  Clicked Sign In');

    // Wait for navigation to complete
    await page.waitForTimeout(5000);
    await page.waitForLoadState('networkidle');

    const postLoginUrl = page.url();
    console.log('  Post-login URL: ' + postLoginUrl);

    if (postLoginUrl.includes('/auth')) {
      // Still on auth page - take screenshot to see error
      await page.screenshot({ path: '/tmp/login-failed.png' });
      console.log('  WARNING: Still on auth page. Screenshot: /tmp/login-failed.png');
      // Try to read any error messages
      const errorText = await page.locator('[role="alert"]').textContent().catch(function() { return ''; });
      console.log('  Error text: ' + errorText);
    } else {
      console.log('  Login successful!');
    }

    // ====== NAVIGATE TO STAGE 9 ======
    console.log('\nNavigating to Stage 9...');
    const stage9Url = TARGET_URL + '/projects/' + PROJECT_ID + '?stage=9&sceneId=' + SCENE_ID;
    await page.goto(stage9Url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);

    const s9Url = page.url();
    console.log('  Current URL: ' + s9Url);

    await page.screenshot({ path: '/tmp/stage9-overview.png', fullPage: true });
    console.log('  Screenshot: /tmp/stage9-overview.png');

    // If redirected to auth, abort
    if (s9Url.includes('/auth')) {
      console.log('  ABORT: Not authenticated. Cannot continue.');
      await browser.close();
      return;
    }

    // ====== STAGE 9 CHECKS ======
    console.log('\nStage 9 Checks:');

    // Wait for content to load
    await page.waitForTimeout(3000);

    // Check for Frame Prompt label anywhere on page
    var fpVisible = await page.getByText('Frame Prompt').first().isVisible({ timeout: 5000 }).catch(function() { return false; });
    check('Frame Prompt label visible in Stage 9', fpVisible);

    // Check for Video Prompt label
    var vpVisible = await page.getByText('Video Prompt').first().isVisible({ timeout: 3000 }).catch(function() { return false; });
    check('Video Prompt label visible in Stage 9', vpVisible);

    // Try expanding first shot -- look for elements with Shot text that are clickable
    var shotAccordions = page.locator('div').filter({ hasText: /^Shot \d/ });
    var saCount = await shotAccordions.count();
    console.log('  Found ' + saCount + ' elements with Shot text');

    if (saCount > 0) {
      // Click the first one
      await shotAccordions.first().click();
      await page.waitForTimeout(2000);
      console.log('  Clicked first shot element');
    }

    // Re-check after possible expansion
    fpVisible = await page.getByText('Frame Prompt').first().isVisible({ timeout: 5000 }).catch(function() { return false; });
    check('Frame Prompt visible after expanding', fpVisible);

    // Check for version counter
    var pageContent = await page.content();
    var hasVersionPattern = pageContent.includes('(v') && pageContent.includes(' of ');
    check('Version counter pattern in page HTML', hasVersionPattern);

    // Check for Locked text
    var lockedVisible = await page.getByText('Locked').first().isVisible({ timeout: 3000 }).catch(function() { return false; });
    var editingVisible = await page.getByText('Editing').first().isVisible({ timeout: 1000 }).catch(function() { return false; });
    check('Lock toggle visible in Stage 9', lockedVisible || editingVisible, lockedVisible ? 'Locked' : (editingVisible ? 'Editing' : 'Not found'));

    await page.screenshot({ path: '/tmp/stage9-detail.png', fullPage: true });
    console.log('  Screenshot: /tmp/stage9-detail.png');

    // ====== NAVIGATE TO STAGE 10 ======
    console.log('\nNavigating to Stage 10...');
    var stage10Url = TARGET_URL + '/projects/' + PROJECT_ID + '?stage=10&sceneId=' + SCENE_ID;
    await page.goto(stage10Url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);

    await page.screenshot({ path: '/tmp/stage10-overview.png', fullPage: true });
    console.log('  Screenshot: /tmp/stage10-overview.png');

    // ====== STAGE 10 CHECKS ======
    console.log('\nStage 10 Checks:');

    // Try to click on a shot to see the detail view
    var shotElements = page.locator('div').filter({ hasText: /^Shot \d/ });
    var seCount = await shotElements.count();
    console.log('  Found ' + seCount + ' shot elements');

    if (seCount > 0) {
      await shotElements.first().click();
      await page.waitForTimeout(3000);
      console.log('  Clicked first shot');
    }

    // Scroll to see prompts area
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(1000);

    // Check for Frame Prompt
    var s10FP = await page.getByText('Frame Prompt').first().isVisible({ timeout: 5000 }).catch(function() { return false; });
    check('Frame Prompt visible in Stage 10', s10FP);

    // Check for Video Prompt
    var s10VP = await page.getByText('Video Prompt').first().isVisible({ timeout: 3000 }).catch(function() { return false; });
    check('Video Prompt visible in Stage 10', s10VP);

    // Check for End Frame Prompt
    var s10EFP = await page.getByText('End Frame Prompt').first().isVisible({ timeout: 3000 }).catch(function() { return false; });
    check('End Frame Prompt visible in Stage 10', s10EFP);

    // Check for Shot Context
    var s10SC = await page.getByText('Shot Context').first().isVisible({ timeout: 3000 }).catch(function() { return false; });
    check('Shot Context visible in Stage 10', s10SC);

    // Check for Locked toggle
    var s10Locked = await page.getByText('Locked').first().isVisible({ timeout: 3000 }).catch(function() { return false; });
    check('Lock toggle visible in Stage 10', s10Locked);

    // Check page content for version counter
    var s10Content = await page.content();
    var s10HasVersion = s10Content.includes('(v') && s10Content.includes(' of ');
    check('Version counter in Stage 10 HTML', s10HasVersion);

    await page.screenshot({ path: '/tmp/stage10-detail.png', fullPage: true });
    console.log('  Screenshot: /tmp/stage10-detail.png');

    // ====== SUMMARY ======
    console.log('\n' + '='.repeat(50));
    console.log('Results: ' + results.passed + ' passed, ' + results.failed + ' failed out of ' + results.checks.length + ' checks');
    console.log('='.repeat(50));

    for (var i = 0; i < results.checks.length; i++) {
      var c = results.checks[i];
      console.log('  ' + (c.passed ? 'PASS' : 'FAIL') + ': ' + c.name + (c.detail ? ' -- ' + c.detail : ''));
    }

    console.log('\nScreenshots saved to /tmp/');

  } catch (error) {
    console.error('\nTest error: ' + error.message);
    console.error(error.stack);
    await page.screenshot({ path: '/tmp/error-screenshot.png', fullPage: true }).catch(function() {});
  } finally {
    await browser.close();
  }
})();
