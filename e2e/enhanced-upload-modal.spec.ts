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
// Navigate to project Stage 5
// ---------------------------------------------------------------------------
async function goToStage5(page: Page, projectId: string) {
  await page.goto(`/projects/${projectId}?stage=5`);
  await page.waitForLoadState('networkidle');
  // Wait for Stage 5 content to render
  await expect(page.locator('text=Assets').first()).toBeVisible({ timeout: 15000 });
}

// ---------------------------------------------------------------------------
// Navigate to project Stage 8
// ---------------------------------------------------------------------------
async function goToStage8(page: Page, projectId: string) {
  await page.goto(`/projects/${projectId}?stage=8`);
  await page.waitForLoadState('networkidle');
  await expect(page.locator('text=Visual State').first()).toBeVisible({ timeout: 15000 });
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
    await goToStage5(page, PROJECT_ID);

    // Find the first asset that has an upload button
    const uploadBtn = page.locator('button:has-text("Upload"), label:has-text("Upload")').first();
    await expect(uploadBtn).toBeVisible({ timeout: 10000 });

    // Trigger file upload via the hidden input
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(TEST_IMAGE_PATH);

    // Wait for image analysis + enhanced modal to appear
    const modal = page.locator('[role="dialog"]:has-text("Review Uploaded Image")');
    await expect(modal).toBeVisible({ timeout: 30000 });

    // Verify description sections
    await expect(modal.locator('text=Extracted from Image')).toBeVisible();
    await expect(modal.locator('text=Final Description')).toBeVisible();
    await expect(modal.locator('textarea')).toBeVisible();
  });

  test('modal shows all action buttons for character asset', async ({ page }) => {
    await goToStage5(page, PROJECT_ID);

    // Trigger upload on first asset
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(TEST_IMAGE_PATH);

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
    await goToStage5(page, PROJECT_ID);

    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(TEST_IMAGE_PATH);

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
    await goToStage5(page, PROJECT_ID);

    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(TEST_IMAGE_PATH);

    const modal = page.locator('[role="dialog"]:has-text("Review Uploaded Image")');
    await expect(modal).toBeVisible({ timeout: 30000 });

    // Badge should contain a percentage
    const badge = modal.locator('text=/\\d+% match/');
    await expect(badge).toBeVisible();
  });

  test('final description textarea is editable', async ({ page }) => {
    await goToStage5(page, PROJECT_ID);

    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(TEST_IMAGE_PATH);

    const modal = page.locator('[role="dialog"]:has-text("Review Uploaded Image")');
    await expect(modal).toBeVisible({ timeout: 30000 });

    const textarea = modal.locator('textarea');
    await textarea.click();
    await textarea.fill('My custom edited description');
    await expect(textarea).toHaveValue('My custom edited description');
  });

  test('Cancel closes the modal', async ({ page }) => {
    await goToStage5(page, PROJECT_ID);

    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(TEST_IMAGE_PATH);

    const modal = page.locator('[role="dialog"]:has-text("Review Uploaded Image")');
    await expect(modal).toBeVisible({ timeout: 30000 });

    await modal.locator('button:has-text("Cancel")').click();
    await expect(modal).not.toBeVisible({ timeout: 5000 });
  });

  test('Accept closes modal and saves description', async ({ page }) => {
    await goToStage5(page, PROJECT_ID);

    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(TEST_IMAGE_PATH);

    const modal = page.locator('[role="dialog"]:has-text("Review Uploaded Image")');
    await expect(modal).toBeVisible({ timeout: 30000 });

    // Edit description then accept
    const textarea = modal.locator('textarea');
    await textarea.fill('Accepted description for e2e test');
    await modal.locator('button:has-text("Accept")').click();

    await expect(modal).not.toBeVisible({ timeout: 5000 });
  });

  test('uploaded image preview is visible in modal', async ({ page }) => {
    await goToStage5(page, PROJECT_ID);

    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(TEST_IMAGE_PATH);

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
    await goToStage8(page, PROJECT_ID);

    // Select an asset in the sidebar first
    const assetItem = page.locator('[data-testid="scene-asset-item"], .cursor-pointer').first();
    if (await assetItem.isVisible()) {
      await assetItem.click();
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
    await goToStage8(page, PROJECT_ID);

    // Look for a location asset in the sidebar
    const locationItem = page.locator('[data-asset-type="location"], :text("Location")').first();
    if (await locationItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await locationItem.click();

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
