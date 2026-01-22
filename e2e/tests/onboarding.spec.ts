import { test, expect } from '@playwright/test';
import { getMockConfig, waitFor } from '../helpers/test-helpers.js';
import { request } from '@playwright/test';

/**
 * Onboarding Flow Tests - Happy Path Only
 *
 * These tests verify the first-time user onboarding experience
 */

test.describe('Onboarding Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear all browser cookies
    await page.context().clearCookies();

    // Reset onboarding state via API before each test
    const apiContext = await request.newContext();
    const resetResponse = await apiContext.post('http://localhost:3001/api/onboarding/reset');
    const resetData = await resetResponse.json();
    console.log('Reset response:', resetData);

    // Verify the reset worked by checking onboarding status
    const statusResponse = await apiContext.get('http://localhost:3001/api/onboarding/status');
    const statusData = await statusResponse.json();
    console.log('Onboarding status after reset:', statusData);

    await apiContext.dispose();

    // Navigate to home page fresh
    await page.goto('/', { waitUntil: 'networkidle' });

    // Wait for welcome screen (not just any onboarding screen)
    // Increased timeout to account for: API call + view transition + animations (up to 2-3s)
    await page.waitForSelector('[data-testid="onboarding-welcome-subtitle"]', {
      state: 'visible',
      timeout: 15000
    });
  });

  test('should show welcome screen on first visit', async ({ page }) => {
    // Should see welcome screen elements (already navigated and waited in beforeEach)
    await expect(page.locator('.onboarding-container')).toBeVisible();
    await expect(page.locator('text=/Your personal library awaits/')).toBeVisible();
    await expect(page.locator('button:has-text("Begin Setup")')).toBeVisible();
    await expect(page.locator('button:has-text("Skip for now")')).toBeVisible();
  });

  test('should complete full onboarding with IRC', async ({ page }) => {
    const mockConfig = getMockConfig();

    // Step 1 -> Step 2
    await page.waitForSelector('[data-testid="onboarding-begin-setup"]', { state: 'visible', timeout: 10000 });
    await page.waitForTimeout(500); // Wait for animations to complete
    await page.click('[data-testid="onboarding-begin-setup"]', { timeout: 10000 });
    await page.waitForSelector('text=/Configure Search Sources/', { timeout: 5000 });
    await page.waitForTimeout(700);

    // Step 2: Enable and configure IRC
    await page.click('[data-testid="onboarding-irc-toggle"]');
    await page.waitForTimeout(300);

    // Fill IRC configuration using name attributes
    await expect(page.locator('input[name="server"]')).toBeVisible();
    await page.fill('input[name="server"]', 'localhost');
    await page.fill('input[name="port"]', String(mockConfig.ircPort));
    await page.fill('input[name="channel"]', '#ebooks');
    await page.fill('input[name="searchCommand"]', '@search');
    await page.waitForTimeout(500); // Wait for form to stabilize

    // Step 2 -> Step 3
    await page.waitForSelector('button:has-text("Continue to Downloader Setup")', { state: 'visible', timeout: 10000 });
    await page.waitForTimeout(500); // Wait for animations to complete
    await page.click('button:has-text("Continue to Downloader Setup")', { timeout: 10000 });
    await page.waitForSelector('text=/Where should we send your books/', { timeout: 5000 });
    await page.waitForTimeout(700);

    // Step 3: Skip downloader setup
    await page.click('button:has-text("Skip for now")');

    // Should be redirected to home after onboarding completes
    await expect(page.locator('[data-testid="search-input"]')).toBeVisible({ timeout: 5000 });

    // Verify IRC config was persisted via API
    const configResponse = await page.evaluate(async () => {
      const res = await fetch('http://localhost:3001/api/config');
      return await res.json();
    }) as { success: boolean; data: any };

    expect(configResponse.success).toBe(true);
    expect(configResponse.data.irc.enabled).toBe(true);
    expect(configResponse.data.irc.server).toBe('localhost');
    expect(configResponse.data.irc.channel).toBe('#ebooks');
  });

  test('should complete full onboarding with NZB', async ({ page }) => {
    const mockConfig = getMockConfig();

    // Step 1 -> Step 2
    await page.waitForSelector('button:has-text("Begin Setup")', { state: 'visible', timeout: 10000 });
    await page.waitForTimeout(500); // Wait for animations to complete
    await page.click('button:has-text("Begin Setup")', { timeout: 10000 });
    await page.waitForSelector('text=/Configure Search Sources/', { timeout: 5000 });
    await page.waitForTimeout(700);

    // Step 2: Enable and configure NZB
    await page.click('[data-testid="onboarding-nzb-toggle"]');
    await page.waitForTimeout(300);

    // Fill NZB configuration using name attributes
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await page.fill('input[name="name"]', 'Test Indexer');
    await page.fill('input[name="url"]', `http://localhost:${mockConfig.nzbPort}`);
    await page.fill('input[name="apiKey"]', 'test-api-key');
    await page.waitForTimeout(500); // Wait for form to stabilize

    // Step 2 -> Step 3
    await page.waitForSelector('button:has-text("Continue to Downloader Setup")', { state: 'visible', timeout: 10000 });
    await page.waitForTimeout(500); // Wait for animations to complete
    await page.click('button:has-text("Continue to Downloader Setup")', { timeout: 10000 });
    await page.waitForSelector('text=/Where should we send your books/', { timeout: 5000 });
    await page.waitForTimeout(700);

    // Step 3: Skip downloader setup
    await page.click('button:has-text("Skip for now")');

    // Should be redirected to home after onboarding completes
    await expect(page.locator('[data-testid="search-input"]')).toBeVisible({ timeout: 5000 });

    // Verify NZB config was persisted via API
    const nzbResponse = await page.evaluate(async () => {
      const res = await fetch('http://localhost:3001/api/nzb/providers');
      return await res.json();
    }) as { success: boolean; data: any };

    expect(nzbResponse.success).toBe(true);
    expect(nzbResponse.data.length).toBeGreaterThan(0);
    expect(nzbResponse.data[0].name).toBe('Test Indexer');
  });


  test('should skip onboarding from welcome screen', async ({ page }) => {
    // Click "Skip for now"
    await page.click('button:has-text("Skip for now")');

    // Should redirect to home
    await expect(page.locator('[data-testid="search-input"]')).toBeVisible({ timeout: 5000 });

    // Verify onboarding was marked as skipped
    const response = await page.evaluate(async () => {
      const res = await fetch('http://localhost:3001/api/onboarding/status');
      return await res.json();
    }) as { success: boolean; data: { skipped: boolean } };

    expect(response.success).toBe(true);
    expect(response.data.skipped).toBe(true);
  });
});
