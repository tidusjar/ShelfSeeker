import { test, expect } from '@playwright/test';
import { HomePage, SettingsPage } from '../helpers/page-objects.js';
import { getMockConfig } from '../helpers/test-helpers.js';

/**
 * Settings Configuration Tests
 * 
 * These tests verify that users can configure IRC and NZB settings through the UI,
 * which is the real user flow for connecting to search sources.
 */

test.describe('Settings Configuration', () => {
  test('should configure IRC through settings UI and connect successfully', async ({ page }) => {
    const homePage = new HomePage(page);
    const settingsPage = new SettingsPage(page);
    const mockConfig = getMockConfig();

    // Navigate to home page
    await homePage.navigate();

    // Open settings
    await settingsPage.navigate();

    // Configure IRC with mock server details
    await settingsPage.configureIrc({
      enabled: true,
      server: 'localhost',
      port: mockConfig.ircPort,
      channel: '#ebooks',
      searchCommand: '@search'
    });

    // Go back to home
    await settingsPage.goBack();

    // Wait for IRC to connect
    await homePage.waitForConnected();

    // Verify we can see connection status
    const status = await homePage.getConnectionStatus();
    expect(status.toLowerCase()).toMatch(/online|connected/);
  });

  test('should add NZB provider through settings UI', async ({ page }) => {
    const settingsPage = new SettingsPage(page);
    const mockConfig = getMockConfig();

    // Navigate to settings
    await settingsPage.navigate();

    // Add NZB provider
    await settingsPage.addNzbProvider({
      name: 'Test NZB Indexer',
      url: `http://localhost:${mockConfig.nzbPort}`,
      apiKey: 'test-api-key',
      categories: '7000,8010',
      priority: 1
    });

    // Verify success message appeared (already checked in addNzbProvider)
    // Go back to home
    await settingsPage.goBack();

    // Success - provider was added
  });

  test('should configure both IRC and NZB providers', async ({ page }) => {
    const homePage = new HomePage(page);
    const settingsPage = new SettingsPage(page);
    const mockConfig = getMockConfig();

    await homePage.navigate();
    await settingsPage.navigate();

    // Configure IRC first
    await settingsPage.configureIrc({
      enabled: true,
      server: 'localhost',
      port: mockConfig.ircPort,
      channel: '#ebooks',
      searchCommand: '@search'
    });

    // Add NZB provider
    await settingsPage.addNzbProvider({
      name: 'Multi-Source Test Provider',
      url: `http://localhost:${mockConfig.nzbPort}`,
      apiKey: 'test-api-key',
      categories: '7000,8010'
    });

    // Go back to home
    await settingsPage.goBack();

    // Wait for IRC connection
    await homePage.waitForConnected();

    // Now both sources should be configured and ready
    const status = await homePage.getConnectionStatus();
    expect(status.toLowerCase()).toMatch(/online|connected/);
  });

  test('should handle IRC configuration with invalid settings gracefully', async ({ page }) => {
    const settingsPage = new SettingsPage(page);

    await settingsPage.navigate();

    // Try to configure IRC with invalid port (should still save, but won't connect)
    await settingsPage.goToIrcSettings();

    // Fill with invalid data
    const serverInput = page.locator('input[name="server"], input[id="server"]');
    await serverInput.clear();
    await serverInput.fill('invalid-server');

    const portInput = page.locator('input[name="port"], input[id="port"]');
    await portInput.clear();
    await portInput.fill('99999');

    // This should save but not necessarily connect
    const saveButton = page.locator('button:has-text("Save Changes"), button:has-text("Save")').first();
    await saveButton.click();

    // Just verify we don't crash - the app should handle connection failures gracefully
    await page.waitForTimeout(1000);
  });

  test('should navigate between settings tabs correctly', async ({ page }) => {
    const settingsPage = new SettingsPage(page);

    await settingsPage.navigate();

    // Go to IRC settings
    await settingsPage.goToIrcSettings();
    await expect(page.locator('text=/IRC/i')).toBeVisible();

    // Go to Newznab settings
    await settingsPage.goToNewznabSettings();
    await expect(page.locator('text=/Newznab/i, text=/Indexer/i')).toBeVisible();

    // Back to IRC
    await settingsPage.goToIrcSettings();
    await expect(page.locator('input[name="server"], input[id="server"]')).toBeVisible();
  });
});
