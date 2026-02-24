const { chromium } = require('playwright');

const TARGET_URL = 'http://localhost:8080';
const PROJECT_ID = '_';
const SCENE_ID = '_';
const EMAIL = '_';
const PASSWORD = '_';

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 60 });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  // Login
  console.log('=== Login ===');
  await page.goto(TARGET_URL + '/auth', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1000);
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button:has-text("Sign In")');
  await page.waitForTimeout(4000);

  // === STAGE 10 TESTING ===
  console.log('\n=== Stage 10: Frames ===');
  await page.goto(`${TARGET_URL}/projects/${PROJECT_ID}?stage=10&sceneId=${SCENE_ID}`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Screenshot 1: Stage 10 with Shot 2A selected (default)
  await page.screenshot({ path: 'screenshots/s10-01-shot2A.png', fullPage: true });
  console.log('Shot 2A (first shot) view captured');

  // Click Shot 2B (should be second shot - non-first, should show continuity)
  console.log('\nClicking Shot 2B...');
  const shot2B = page.locator('button:has-text("Shot 2B")').first();
  if (await shot2B.count() > 0) {
    await shot2B.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots/s10-02-shot2B.png', fullPage: true });
    console.log('Shot 2B view captured');

    // Check for continuity elements on Shot 2B
    const body2B = await page.locator('body').textContent();
    console.log('Shot 2B - has "Copy from":', body2B.includes('Copy from'));
    console.log('Shot 2B - has "Match":', body2B.includes('Match'));
    console.log('Shot 2B - has "Camera Change":', body2B.includes('Camera Change'));
    console.log('Shot 2B - has continuity badge:', body2B.includes('ontinuity'));
  }

  // Click Shot 2C
  console.log('\nClicking Shot 2C...');
  const shot2C = page.locator('button:has-text("Shot 2C")').first();
  if (await shot2C.count() > 0) {
    await shot2C.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots/s10-03-shot2C.png', fullPage: true });
    console.log('Shot 2C view captured');

    const body2C = await page.locator('body').textContent();
    console.log('Shot 2C - has "Copy from":', body2C.includes('Copy from'));
    console.log('Shot 2C - has "Match":', body2C.includes('Match'));
    console.log('Shot 2C - has linked icon:', body2C.includes('linked'));
  }

  // Scroll down to see frame generation panels + shot context for 2C
  await page.evaluate(() => window.scrollTo(0, 600));
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshots/s10-04-shot2C-scrolled.png', fullPage: true });
  console.log('Shot 2C scrolled down view captured');

  // Back to Shot 2A and scroll down to see shot context area
  console.log('\nBack to Shot 2A...');
  const shot2A = page.locator('button:has-text("Shot 2A")').first();
  if (await shot2A.count() > 0) {
    await shot2A.click();
    await page.waitForTimeout(2000);
  }
  await page.evaluate(() => window.scrollTo(0, 600));
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshots/s10-05-shot2A-scrolled.png', fullPage: true });
  console.log('Shot 2A scrolled view captured');

  // Test "Link All" button
  console.log('\nTesting Link All button...');
  const linkAllBtn = page.locator('button:has-text("Link All")');
  if (await linkAllBtn.count() > 0) {
    // Don't actually click to avoid changing state, just verify it's there
    const isVisible = await linkAllBtn.isVisible();
    const isEnabled = await linkAllBtn.isEnabled();
    console.log('Link All button - visible:', isVisible, 'enabled:', isEnabled);

    // Get bounding box to see its position
    const box = await linkAllBtn.boundingBox();
    console.log('Link All button position:', box);
  }

  // Test "Unlink" button
  const unlinkBtn = page.locator('button:has-text("Unlink")');
  if (await unlinkBtn.count() > 0) {
    const isVisible = await unlinkBtn.isVisible();
    console.log('Unlink button visible:', isVisible);
  }

  // Take focused screenshot of just the sidebar
  console.log('\nCapturing sidebar closeup...');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);

  // Try to capture sidebar area specifically
  const sidebarArea = page.locator('div:has(button:has-text("Link All"))').first();
  if (await sidebarArea.count() > 0) {
    try {
      await sidebarArea.screenshot({ path: 'screenshots/s10-06-sidebar-closeup.png' });
      console.log('Sidebar closeup captured');
    } catch (e) {
      console.log('Could not capture sidebar closeup:', e.message);
    }
  }

  // === STAGE 9 TESTING ===
  console.log('\n\n=== Stage 9: Prompts ===');
  await page.goto(`${TARGET_URL}/projects/${PROJECT_ID}?stage=9&sceneId=${SCENE_ID}`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'screenshots/s9-01-overview.png', fullPage: true });
  console.log('Stage 9 overview captured');

  // Check what stage we're actually on
  console.log('Stage 9 URL:', page.url());
  const s9Body = await page.locator('body').textContent();
  console.log('Has "Prompt":', s9Body.includes('Prompt'));
  console.log('Has "Generate Prompts":', s9Body.includes('Generate Prompts'));
  console.log('Has "Shot 2A":', s9Body.includes('Shot 2A'));

  // Look for shot cards to expand
  console.log('\nLooking for expandable shot cards...');
  const collapsibleTriggers = await page.locator('[data-state="closed"] button, button[data-state="closed"]').all();
  console.log('Closed triggers:', collapsibleTriggers.length);

  // Try to find and click a shot card header
  const shotCardHeaders = await page.locator('button:has-text("Shot 2A"), button:has-text("Shot 2B"), button:has-text("Shot 2C")').all();
  console.log('Shot card headers found:', shotCardHeaders.length);

  for (let i = 0; i < shotCardHeaders.length; i++) {
    const text = await shotCardHeaders[i].textContent();
    console.log(`  Shot header ${i}: "${text.trim().substring(0, 80)}"`);
  }

  // Click first shot to expand
  if (shotCardHeaders.length > 0) {
    console.log('\nExpanding Shot 2A...');
    await shotCardHeaders[0].click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'screenshots/s9-02-shot2A-expanded.png', fullPage: true });

    // Check what's visible in expanded state
    const expanded = await page.locator('body').textContent();
    console.log('Expanded has "Frame Prompt":', expanded.includes('Frame Prompt'));
    console.log('Expanded has "Video Prompt":', expanded.includes('Video Prompt'));
    console.log('Expanded has "Continuity":', expanded.includes('Continuity'));
    console.log('Expanded has "AI: Match":', expanded.includes('AI: Match'));
    console.log('Expanded has select:', expanded.includes('None'));

    // Scroll down to see full expanded content
    await page.evaluate(() => window.scrollTo(0, 300));
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'screenshots/s9-03-shot2A-scrolled.png', fullPage: true });
  }

  // Expand Shot 2B (non-first shot, should show continuity dropdown)
  if (shotCardHeaders.length > 1) {
    console.log('\nExpanding Shot 2B...');
    await shotCardHeaders[1].click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'screenshots/s9-04-shot2B-expanded.png', fullPage: true });

    const expanded2B = await page.locator('body').textContent();
    console.log('Shot 2B has "Continuity":', expanded2B.includes('Continuity'));
    console.log('Shot 2B has "AI: Match":', expanded2B.includes('AI: Match'));
    console.log('Shot 2B has "AI: Angle":', expanded2B.includes('AI: Angle'));

    await page.evaluate(() => window.scrollTo(0, 400));
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'screenshots/s9-05-shot2B-scrolled.png', fullPage: true });
  }

  // Expand Shot 2C
  if (shotCardHeaders.length > 2) {
    console.log('\nExpanding Shot 2C...');
    await shotCardHeaders[2].click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'screenshots/s9-06-shot2C-expanded.png', fullPage: true });

    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'screenshots/s9-07-shot2C-scrolled.png', fullPage: true });
  }

  // Full page scroll to bottom
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshots/s9-08-bottom.png', fullPage: true });

  console.log('\n=== All Tests Complete ===');
  console.log('Screenshots saved. Browser staying open 30s...');
  await page.waitForTimeout(30000);
  await browser.close();
})();
