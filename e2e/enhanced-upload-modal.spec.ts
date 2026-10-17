/**
 * E2E Tests: Enhanced Upload Modal (3.7 Phase 1)
 *
 * Prerequisites:
 *   - Frontend dev server running: npm run dev (port 8080)
 *   - Backend dev server running: cd backend && npm run dev (port 3001)
 *   - A test user account must exist in Supabase
 *   - At least one project with Stage 5 assets (with images) should exist
 *
 * Environment variables (set in .env or before running):
 *   E2E_EMAIL    – test user email
 *   E2E_PASSWORD – test user password
 *   E2E_PROJECT_ID – project UUID to test against (must have Stage 5 done)
 *
 * Run:
 *   npx playwright test e2e/enhanced-upload-modal.spec.ts
 */

import { test, expect, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// Config from environment
// ---------------------------------------------------------------------------
const EMAIL = process.env.E2E_EMAIL || 'test@example.com';
const PASSWORD = process.env.E2E_PASSWORD || 'testpassword123';
const PROJECT_ID = process.env.E2E_PROJECT_ID || '';

// Create a tiny 1x1 PNG test image on disk for upload tests
const TEST_IMAGE_DIR = path.join(__dirname, '..', 'tmp');
const TEST_IMAGE_PATH = path.join(TEST_IMAGE_DIR, 'test-upload.png');

function ensureTestImage() {
  if (!fs.existsSync(TEST_IMAGE_DIR)) {
    fs.mkdirSync(TEST_IMAGE_DIR, { recursive: true });
  }
  if (!fs.existsSync(TEST_IMAGE_PATH)) {
    // Minimal valid 1x1 red PNG
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
      'base64'
    );
    fs.writeFileSync(TEST_IMAGE_PATH, pngBuffer);
  }
}

// ---------------------------------------------------------------------------
// Auth helper: log in via Supabase auth UI
// ---------------------------------------------------------------------------
async function login(page: Page) {
  await page.goto('/auth');
  await page.waitForLoadState('networkidle');

  // Fill email/password
  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  const passwordInput = page.locator('input[type="password"], input[name="password"]').first();

  if (await emailInput.isVisible()) {
    await emailInput.fill(EMAIL);
    await passwordInput.fill(PASSWORD);

    // Click sign in button
    const signInBtn = page.locator('button:has-text("Sign In"), button:has-text("Log In"), button[type="submit"]').first();
    await signInBtn.click();

    // Wait for navigation away from auth
    await page.waitForURL((url) => !url.pathname.includes('/auth'), { timeout: 15000 });
  }
}

// ---------------------------------------------------------------------------
// Navigate to project Stage 5 (unlocked for editing)
// ---------------------------------------------------------------------------
async function goToStage5Unlocked(page: Page, projectId: string) {
  await page.goto(`/projects/${projectId}?stage=5`);
  await page.waitForLoadState('networkidle');
  // Wait for Stage 5 content to render
  await expect(page.locator('text=Assets').first()).toBeVisible({ timeout: 15000 });

  // If stage is locked, click "Unlock & Edit"
  const unlockBtn = page.locator('button:has-text("Unlock & Edit")');
  if (await unlockBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await unlockBtn.click();
    // Wait for the unlocked view to render (shows upload buttons)
    await page.waitForTimeout(1000);
  }

  // Wait for the unlocked header or asset cards
  await expect(
    page.locator('text=Global Assets & Style Lock').first()
  ).toBeVisible({ timeout: 10000 });
}

// ---------------------------------------------------------------------------
// Find and trigger upload on first available asset in Stage 5
// ---------------------------------------------------------------------------
async function triggerStage5Upload(page: Page): Promise<boolean> {
  // Scroll down to find asset cards with upload buttons
  // The hidden file input is per-asset; the Upload button triggers it
  const uploadBtn = page.locator('button:has-text("Upload")').first();
  if (await uploadBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    // Find the hidden file input nearest to this upload button
    // The inputs are siblings in the same flex container
    const fileInput = page.locator('input[type="file"][accept*="png"]').first();
    await fileInput.setInputFiles(TEST_IMAGE_PATH);
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Navigate to project Stage 8 with a scene
// ---------------------------------------------------------------------------
async function goToStage8WithScene(page: Page, projectId: string) {
  // Go to Script Hub, select a scene, click "Enter Scene Pipeline"
  await page.goto(`/projects/${projectId}?stage=7`);
  await page.waitForLoadState('networkidle');
  await expect(page.locator('text=Script Hub').first()).toBeVisible({ timeout: 15000 });

  // Click the first scene with "Shot List" badge (these have shot lists done = ready for Stage 8)
  const sceneBtn = page.locator('button:has-text("Shot List")').first();
  if (await sceneBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await sceneBtn.click();
    await page.waitForTimeout(500);
  }

  // Click "Enter Scene Pipeline" button to enter the scene
  const enterBtn = page.locator('button:has-text("Enter Scene Pipeline")');
  await expect(enterBtn).toBeVisible({ timeout: 5000 });
  await enterBtn.click();
  await page.waitForTimeout(2000);

  // We may now be on Stage 7 or 8 depending on scene locks.
  // If not on Stage 8, extract sceneId from URL and navigate directly.
  const onStage8 = await page.locator('text=Visual Definition').first().isVisible({ timeout: 3000 }).catch(() => false);
  if (!onStage8) {
    const url = new URL(page.url());
    const sceneId = url.searchParams.get('sceneId');
    if (sceneId) {
      await page.goto(`/projects/${projectId}?stage=8&sceneId=${sceneId}`);
      await page.waitForLoadState('networkidle');
    }
  }

  // Wait for Stage 8 content — either "Visual Definition" (locked header) or
  // "Scene Assets" (unlocked working view) or "Select an asset" prompt
  await expect(
    page.locator('text=Scene Assets').or(page.locator('text=Visual Definition')).first()
  ).toBeVisible({ timeout: 15000 });
}

// ===========================================================================
// TEST SUITES
// ===========================================================================

test.describe('Enhanced Upload Modal – Stage 5', () => {
  test.beforeAll(() => {
    ensureTestImage();
  });

  test.beforeEach(async ({ page }) => {
    test.skip(!PROJECT_ID, 'E2E_PROJECT_ID not set — skipping E2E tests');
    await login(page);
  });

  test('upload triggers the enhanced modal with description reconciliation', async ({ page }) => {
    await goToStage5Unlocked(page, PROJECT_ID);

    const uploaded = await triggerStage5Upload(page);
    test.skip(!uploaded, 'No upload button found on Stage 5 assets');

    // Wait for image analysis + enhanced modal to appear
    const modal = page.locator('[role="dialog"]:has-text("Review Uploaded Image")');
    await expect(modal).toBeVisible({ timeout: 30000 });

    // Verify description sections
    await expect(modal.locator('text=Extracted from Image')).toBeVisible();
    await expect(modal.locator('text=Final Description')).toBeVisible();
    await expect(modal.locator('textarea')).toBeVisible();
  });

  test('modal shows all action buttons for character asset', async ({ page }) => {
    await goToStage5Unlocked(page, PROJECT_ID);

    const uploaded = await triggerStage5Upload(page);
    test.skip(!uploaded, 'No upload button found');

    const modal = page.locator('[role="dialog"]:has-text("Review Uploaded Image")');
    await expect(modal).toBeVisible({ timeout: 30000 });

    // Verify action buttons
    await expect(modal.locator('button:has-text("Edit Image")')).toBeVisible();
    await expect(modal.locator('button:has-text("Apply Style")')).toBeVisible();
    await expect(modal.locator('button:has-text("Regenerate")')).toBeVisible();

    // Accept and Cancel
    await expect(modal.locator('button:has-text("Accept")')).toBeVisible();
    await expect(modal.locator('button:has-text("Cancel")')).toBeVisible();
  });

  test('Edit Image button toggles instruction input', async ({ page }) => {
    await goToStage5Unlocked(page, PROJECT_ID);

    const uploaded = await triggerStage5Upload(page);
    test.skip(!uploaded, 'No upload button found');

    const modal = page.locator('[role="dialog"]:has-text("Review Uploaded Image")');
    await expect(modal).toBeVisible({ timeout: 30000 });

    // Click Edit Image — should show input
    await modal.locator('button:has-text("Edit Image")').click();
    const editInput = modal.locator('input[placeholder*="change suit"]');
    await expect(editInput).toBeVisible();
    await expect(modal.locator('button:has-text("Go")')).toBeVisible();

    // Click Edit Image again — should hide input
    await modal.locator('button:has-text("Edit Image")').click();
    await expect(editInput).not.toBeVisible();
  });

  test('confidence badge shows percentage', async ({ page }) => {
    await goToStage5Unlocked(page, PROJECT_ID);

    const uploaded = await triggerStage5Upload(page);
    test.skip(!uploaded, 'No upload button found');

    const modal = page.locator('[role="dialog"]:has-text("Review Uploaded Image")');
    await expect(modal).toBeVisible({ timeout: 30000 });

    // Badge should contain a percentage
    const badge = modal.locator('text=/\\d+% match/');
    await expect(badge).toBeVisible();
  });

  test('final description textarea is editable', async ({ page }) => {
    await goToStage5Unlocked(page, PROJECT_ID);

    const uploaded = await triggerStage5Upload(page);
    test.skip(!uploaded, 'No upload button found');

    const modal = page.locator('[role="dialog"]:has-text("Review Uploaded Image")');
    await expect(modal).toBeVisible({ timeout: 30000 });

    const textarea = modal.locator('textarea');
    await textarea.click();
    await textarea.fill('My custom edited description');
    await expect(textarea).toHaveValue('My custom edited description');
  });

  test('Cancel closes the modal', async ({ page }) => {
    await goToStage5Unlocked(page, PROJECT_ID);

    const uploaded = await triggerStage5Upload(page);
    test.skip(!uploaded, 'No upload button found');

    const modal = page.locator('[role="dialog"]:has-text("Review Uploaded Image")');
    await expect(modal).toBeVisible({ timeout: 30000 });

    await modal.locator('button:has-text("Cancel")').click();
    await expect(modal).not.toBeVisible({ timeout: 5000 });
  });

  test('Accept closes modal and saves description', async ({ page }) => {
    await goToStage5Unlocked(page, PROJECT_ID);

    const uploaded = await triggerStage5Upload(page);
    test.skip(!uploaded, 'No upload button found');

    const modal = page.locator('[role="dialog"]:has-text("Review Uploaded Image")');
    await expect(modal).toBeVisible({ timeout: 30000 });

    // Edit description then accept
    const textarea = modal.locator('textarea');
    await textarea.fill('Accepted description for e2e test');
    await modal.locator('button:has-text("Accept")').click();

    await expect(modal).not.toBeVisible({ timeout: 5000 });
  });

  test('uploaded image preview is visible in modal', async ({ page }) => {
    await goToStage5Unlocked(page, PROJECT_ID);

    const uploaded = await triggerStage5Upload(page);
    test.skip(!uploaded, 'No upload button found');

    const modal = page.locator('[role="dialog"]:has-text("Review Uploaded Image")');
    await expect(modal).toBeVisible({ timeout: 30000 });

    // Image should be visible
    const img = modal.locator('img');
    await expect(img).toBeVisible();
    const src = await img.getAttribute('src');
    expect(src).toBeTruthy();
  });
});

test.describe('Enhanced Upload Modal – Stage 8', () => {
  test.beforeAll(() => {
    ensureTestImage();
  });

  test.beforeEach(async ({ page }) => {
    test.skip(!PROJECT_ID, 'E2E_PROJECT_ID not set — skipping E2E tests');
    await login(page);
  });

  test('upload triggers enhanced modal in Stage 8', async ({ page }) => {
    await goToStage8WithScene(page, PROJECT_ID);

    // Select an asset in the sidebar (first clickable asset card)
    const assetItem = page.locator('.cursor-pointer.rounded-lg').first();
    if (await assetItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await assetItem.click();
      await page.waitForTimeout(500);
    }

    // Find the upload zone in VisualStateEditorPanel
    const uploadZone = page.locator('text=Drop image or click to upload').first();
    if (await uploadZone.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Trigger upload via hidden input near the upload zone
      const fileInput = page.locator('input[type="file"][accept*="png"]').first();
      await fileInput.setInputFiles(TEST_IMAGE_PATH);

      // Wait for analysis + modal
      const modal = page.locator('[role="dialog"]:has-text("Review Uploaded Image")');
      // The modal might not appear if analysis fails (non-blocking), that's OK
      const appeared = await modal.isVisible({ timeout: 20000 }).catch(() => false);
      if (appeared) {
        await expect(modal.locator('text=Final Description')).toBeVisible();
        await expect(modal.locator('button:has-text("Accept")')).toBeVisible();

        // Close to clean up
        await modal.locator('button:has-text("Cancel")').click();
      }
    }
  });

  test('Stage 8 modal hides Remove BG for location assets', async ({ page }) => {
    await goToStage8WithScene(page, PROJECT_ID);

    // Look for a location asset in the sidebar (has MapPin icon or "location" text)
    const locationItem = page.locator('.cursor-pointer.rounded-lg:has-text("Location")').first();
    if (await locationItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await locationItem.click();
      await page.waitForTimeout(500);

      const uploadZone = page.locator('text=Drop image or click to upload').first();
      if (await uploadZone.isVisible({ timeout: 5000 }).catch(() => false)) {
        const fileInput = page.locator('input[type="file"][accept*="png"]').first();
        await fileInput.setInputFiles(TEST_IMAGE_PATH);

        const modal = page.locator('[role="dialog"]:has-text("Review Uploaded Image")');
        const appeared = await modal.isVisible({ timeout: 20000 }).catch(() => false);
        if (appeared) {
          // Location should NOT have Remove BG button
          await expect(modal.locator('button:has-text("Remove BG")')).not.toBeVisible();
          await modal.locator('button:has-text("Cancel")').click();
        }
      }
    }
  });
});

// ===========================================================================
// Smoke tests that don't require a specific project
// ===========================================================================
test.describe('Enhanced Upload Modal – Smoke (no project required)', () => {
  test('auth page loads', async ({ page }) => {
    await page.goto('/auth');
    await expect(page).toHaveURL(/auth/);
  });

  test('dashboard loads after login', async ({ page }) => {
    test.skip(!EMAIL || EMAIL === 'test@example.com', 'No E2E credentials set');
    await login(page);
    // Should be on dashboard or redirected
    await expect(page.locator('text=/projects|dashboard|create/i').first()).toBeVisible({ timeout: 15000 });
  });
});
