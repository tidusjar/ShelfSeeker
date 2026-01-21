import { test, expect } from '@playwright/test';
import { getMockConfig } from '../helpers/test-helpers.js';
import { request } from '@playwright/test';

/**
 * Onboarding Flow Tests - Happy Path Only
 *
 * These tests verify the first-time user onboarding experience
 */

test.describe('Onboarding Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Reset onboarding state via API before each test
    const context = await request.newContext();
    await context.post('http://localhost:3001/api/onboarding/reset');
    await context.dispose();
  });

  test('should show welcome screen on first visit', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.onboarding-container', { timeout: 5000 });
    await page.waitForTimeout(700);

    // Should see welcome screen elements
    await expect(page.locator('.onboarding-container')).toBeVisible();
    await expect(page.locator('text=/Your personal library awaits/')).toBeVisible();
    await expect(page.locator('button:has-text("Begin Setup")')).toBeVisible();
    await expect(page.locator('button:has-text("Skip for now")')).toBeVisible();
  });

  test('should complete full onboarding with IRC', async ({ page }) => {
    const mockConfig = getMockConfig();

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.onboarding-container', { timeout: 5000 });
    await page.waitForTimeout(700);

    // Step 1 -> Step 2
    await page.click('[data-testid="onboarding-begin-setup"]');
    await page.waitForSelector('text=/Configure Search Sources/', { timeout: 5000 });
    await page.waitForTimeout(700);

    // Step 2: Enable and configure IRC
    await page.click('[data-testid="onboarding-irc-toggle"]');
    await page.waitForTimeout(300);
    await expect(page.locator('input[name="server"]')).toBeVisible();
    await page.fill('input[name="server"]', 'localhost');
    await page.fill('input[name="port"]', String(mockConfig.ircPort));
    await page.fill('input[name="channel"]', '#ebooks');
    await page.fill('input[name="searchCommand"]', '@search');

    // Step 2 -> Step 3
    await page.click('[data-testid="onboarding-continue"]');
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
    });
    expect(configResponse.success).toBe(true);
    expect(configResponse.data.irc.enabled).toBe(true);
    expect(configResponse.data.irc.server).toBe('localhost');
    expect(configResponse.data.irc.channel).toBe('#ebooks');
  });

  test('should complete full onboarding with NZB', async ({ page }) => {
    const mockConfig = getMockConfig();

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.onboarding-container', { timeout: 5000 });
    await page.waitForTimeout(700);

    // Step 1 -> Step 2
    await page.click('[data-testid="onboarding-begin-setup"]');
    await page.waitForSelector('text=/Configure Search Sources/', { timeout: 5000 });
    await page.waitForTimeout(700);

    // Step 2: Enable and configure NZB
    await page.click('[data-testid="onboarding-nzb-toggle"]');
    await page.waitForTimeout(300);
    await page.fill('input[name="name"]', 'Test Indexer');
    await page.fill('input[name="url"]', `http://localhost:${mockConfig.nzbPort}`);
    await page.fill('input[name="apiKey"]', 'test-api-key');

    // Step 2 -> Step 3
    await page.click('[data-testid="onboarding-continue"]');
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
    });
    expect(nzbResponse.success).toBe(true);
    expect(nzbResponse.data.length).toBeGreaterThan(0);
    expect(nzbResponse.data[0].name).toBe('Test Indexer');
  });

  test('should complete full onboarding with both IRC and NZB', async ({ page }) => {
    const mockConfig = getMockConfig();

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.onboarding-container', { timeout: 5000 });
    await page.waitForTimeout(700);

    // Step 1 -> Step 2
    await page.click('[data-testid="onboarding-begin-setup"]');
    await page.waitForSelector('text=/Configure Search Sources/', { timeout: 5000 });
    await page.waitForTimeout(700);

    // Step 2: Enable and configure both IRC and NZB
    await page.click('[data-testid="onboarding-irc-toggle"]');
    await page.waitForTimeout(300);
    await page.fill('input[name="server"]', 'localhost');
    await page.fill('input[name="port"]', String(mockConfig.ircPort));
    await page.fill('input[name="channel"]', '#ebooks');
    await page.fill('input[name="searchCommand"]', '@search');

    await page.click('[data-testid="onboarding-nzb-toggle"]');
    await page.waitForTimeout(300);
    await page.fill('input[name="name"]', 'Test Indexer');
    await page.fill('input[name="url"]', `http://localhost:${mockConfig.nzbPort}`);
    await page.fill('input[name="apiKey"]', 'test-api-key');

    // Step 2 -> Step 3
    await page.click('[data-testid="onboarding-continue"]');
    await page.waitForSelector('text=/Where should we send your books/', { timeout: 5000 });
    await page.waitForTimeout(700);

    // Step 3: Skip downloader setup
    await page.click('button:has-text("Skip for now")');

    // Should be redirected to home after onboarding completes
    await expect(page.locator('[data-testid="search-input"]')).toBeVisible({ timeout: 5000 });

    // Verify both configs were persisted via API
    const configResponse = await page.evaluate(async () => {
      const res = await fetch('http://localhost:3001/api/config');
      return await res.json();
    });
    expect(configResponse.success).toBe(true);
    expect(configResponse.data.irc.enabled).toBe(true);
    expect(configResponse.data.irc.server).toBe('localhost');

    const nzbResponse = await page.evaluate(async () => {
      const res = await fetch('http://localhost:3001/api/nzb/providers');
      return await res.json();
    });
    expect(nzbResponse.success).toBe(true);
    expect(nzbResponse.data.length).toBeGreaterThan(0);
  });

  test('should skip onboarding from welcome screen', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click "Skip for now"
    await page.click('button:has-text("Skip for now")');

    // Should redirect to home
    await expect(page.locator('[data-testid="search-input"]')).toBeVisible({ timeout: 5000 });

    // Verify onboarding was marked as skipped
    const response = await page.evaluate(async () => {
      const res = await fetch('http://localhost:3001/api/onboarding/status');
      return await res.json();
    });
    expect(response.success).toBe(true);
    expect(response.data.skipped).toBe(true);
  });
});
