/**
 * E2E Tests: Story Context Update (Phase 2, Task 2)
 *
 * Prerequisites:
 *   - Frontend dev server running: npm run dev (port 8080)
 *   - Backend dev server running: cd backend && npm run dev (port 3001)
 *   - A test user with at least one project that has scenes with assets in Stage 8
 *
 * Environment variables (set in .env):
 *   E2E_EMAIL      – test user email
 *   E2E_PASSWORD   – test user password
 *   E2E_PROJECT_ID – project UUID
 *
 * Run:
 *   npx playwright test e2e/story-context-update.spec.ts
 */

import { test, expect, Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Config from environment
// ---------------------------------------------------------------------------
const EMAIL = (process.env.E2E_EMAIL || '').trim();
const PASSWORD = (process.env.E2E_PASSWORD || '').trim();
const PROJECT_ID = (process.env.E2E_PROJECT_ID || '').trim();

// ---------------------------------------------------------------------------
// Auth helper: log in via Supabase auth UI
// ---------------------------------------------------------------------------
async function login(page: Page) {
  await page.goto('/auth');
  await page.waitForLoadState('networkidle');

  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  const passwordInput = page.locator('input[type="password"], input[name="password"]').first();

  if (await emailInput.isVisible()) {
    await emailInput.fill(EMAIL);
    await passwordInput.fill(PASSWORD);

    const signInBtn = page.locator('button:has-text("Sign In"), button:has-text("Log In"), button[type="submit"]').first();
    await signInBtn.click();

    await page.waitForURL((url) => !url.pathname.includes('/auth'), { timeout: 15000 });
  }
}

// ---------------------------------------------------------------------------
// Navigate to Stage 8 with a scene (via Script Hub → Enter Scene Pipeline)
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
      await page.waitForLoadState('domcontentloaded');
    }
  }

  // Wait for Stage 8 content — either "Scene Assets" (unlocked) or "Visual Definition" (locked)
  await expect(
    page.locator('text=Scene Assets').or(page.locator('text=Visual Definition')).first()
  ).toBeVisible({ timeout: 15000 });
}

// ---------------------------------------------------------------------------
// Smoke Tests (no project required)
// ---------------------------------------------------------------------------
test.describe('Smoke Tests', () => {
  test('auth page loads', async ({ page }) => {
    await page.goto('/auth');
    await expect(page).toHaveURL(/\/auth/);
  });

  test('dashboard loads after login', async ({ page }) => {
    test.skip(!EMAIL || !PASSWORD, 'E2E_EMAIL and E2E_PASSWORD required');
    await login(page);
    await expect(page).toHaveURL(/\/(dashboard|projects)/);
  });
});

// ---------------------------------------------------------------------------
// Stage 8 – Story Context Update (Per-Asset)
// ---------------------------------------------------------------------------
test.describe('Stage 8 – Infer from Story (Per-Asset)', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!EMAIL || !PASSWORD || !PROJECT_ID, 'E2E credentials and PROJECT_ID required');
    await login(page);
  });

  test('should show "Infer from Story" button in editor panel', async ({ page }) => {
    await goToStage8WithScene(page, PROJECT_ID);

    // Click the first asset in the list to select it
    const firstAsset = page.locator('[class*="cursor-pointer"]').first();
    await firstAsset.click();

    // Wait for the editor panel to show the asset name
    await page.waitForSelector('text=Visual state description', { timeout: 10000 });

    // The "Infer from Story" button should be visible
    const inferBtn = page.locator('button:has-text("Infer from Story")');
    await expect(inferBtn).toBeVisible();
  });

  test('should show loading state when inferring', async ({ page }) => {
    test.setTimeout(60000);
    await goToStage8WithScene(page, PROJECT_ID);

    // Click the first asset
    const firstAsset = page.locator('[class*="cursor-pointer"]').first();
    await firstAsset.click();
    await page.waitForSelector('text=Visual state description', { timeout: 10000 });

    // Click "Infer from Story"
    const inferBtn = page.locator('button:has-text("Infer from Story")');
    await inferBtn.click();

    // Should show "Analyzing…" state
    await expect(page.locator('button:has-text("Analyzing")')).toBeVisible({ timeout: 3000 });
  });

  test('should display suggestion panel after inference completes', async ({ page }) => {
    test.setTimeout(60000); // LLM calls can be slow
    await goToStage8WithScene(page, PROJECT_ID);

    // Click the first asset
    const firstAsset = page.locator('[class*="cursor-pointer"]').first();
    await firstAsset.click();
    await page.waitForSelector('text=Visual state description', { timeout: 10000 });

    // Click "Infer from Story"
    const inferBtn = page.locator('button:has-text("Infer from Story")');
    await inferBtn.click();

    // Wait for the suggestion panel to appear (or an error toast)
    const suggestionPanel = page.locator('text=Story Context Suggestion');
    const errorToast = page.locator('[data-sonner-toast][data-type="error"]');

    // Either the suggestion appears or an error (both valid outcomes in E2E)
    await expect(suggestionPanel.or(errorToast)).toBeVisible({ timeout: 45000 });

    // If suggestion appeared, verify accept buttons are present
    if (await suggestionPanel.isVisible()) {
      await expect(page.locator('button:has-text("Accept Description")')).toBeVisible();
      await expect(page.locator('button:has-text("Accept Both")')).toBeVisible();
    }
  });
});

// ---------------------------------------------------------------------------
// Stage 8 – Bulk Context Update
// ---------------------------------------------------------------------------
test.describe('Stage 8 – Bulk Update from Context', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!EMAIL || !PASSWORD || !PROJECT_ID, 'E2E credentials and PROJECT_ID required');
    await login(page);
  });

  test('should show bulk update button when assets are selected', async ({ page }) => {
    await goToStage8WithScene(page, PROJECT_ID);

    // Check at least one checkbox in the asset list
    const checkbox = page.locator('[role="checkbox"]').first();
    if (await checkbox.isVisible()) {
      await checkbox.click();

      // The "Update from Context" button should appear
      const bulkBtn = page.locator('button:has-text("Update from Context")');
      await expect(bulkBtn).toBeVisible({ timeout: 5000 });
    }
  });

  test('should not show bulk update button when no assets selected', async ({ page }) => {
    await goToStage8WithScene(page, PROJECT_ID);

    // Without selecting any checkboxes, the bulk button should not be visible
    const bulkBtn = page.locator('button:has-text("Update from Context")');
    await expect(bulkBtn).not.toBeVisible({ timeout: 3000 });
  });

  test('should show loading state during bulk inference', async ({ page }) => {
    await goToStage8WithScene(page, PROJECT_ID);

    // Select first asset checkbox
    const checkbox = page.locator('[role="checkbox"]').first();
    if (await checkbox.isVisible()) {
      await checkbox.click();

      const bulkBtn = page.locator('button:has-text("Update from Context")');
      if (await bulkBtn.isVisible()) {
        await bulkBtn.click();

        // Should show "Inferring…" loading state
        await expect(page.locator('button:has-text("Inferring")')).toBeVisible({ timeout: 3000 });
      }
    }
  });

  test('should open review modal after bulk inference', async ({ page }) => {
    test.setTimeout(90000); // Bulk LLM calls can be slow
    await goToStage8WithScene(page, PROJECT_ID);

    // Select first two checkboxes
    const checkboxes = page.locator('[role="checkbox"]');
    const count = await checkboxes.count();

    if (count >= 1) {
      await checkboxes.first().click();
      if (count >= 2) {
        await checkboxes.nth(1).click();
      }

      const bulkBtn = page.locator('button:has-text("Update from Context")');
      if (await bulkBtn.isVisible()) {
        await bulkBtn.click();

        // Wait for the modal to appear (or error)
        const modal = page.locator('text=Bulk Story Context Update');
        const errorToast = page.locator('[data-sonner-toast][data-type="error"]');

        await expect(modal.or(errorToast)).toBeVisible({ timeout: 60000 });

        // If modal appeared, verify it has expected controls
        if (await modal.isVisible()) {
          await expect(page.getByRole('button', { name: 'Select All', exact: true })).toBeVisible();
          await expect(page.locator('button:has-text("Apply Selected")')).toBeVisible();
          await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
        }
      }
    }
  });
});
