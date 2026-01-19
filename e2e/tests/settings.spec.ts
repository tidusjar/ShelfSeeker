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

    await settingsPage.navigate();

    // Add NZB provider and verify success toast
    await settingsPage.addNzbProvider({
      name: 'Test NZB Indexer',
      url: `http://localhost:${mockConfig.nzbPort}`,
      apiKey: 'test-api-key',
      categories: '7000,8010',
      priority: 1
    });

    // Success message is already verified in addNzbProvider method
  });

  test('should configure both IRC and NZB providers', async ({ page }) => {
    const homePage = new HomePage(page);
    const settingsPage = new SettingsPage(page);
    const mockConfig = getMockConfig();

    await homePage.navigate();
    await settingsPage.navigate();

    // Configure both sources
    await settingsPage.configureIrc({
      enabled: true,
      server: 'localhost',
      port: mockConfig.ircPort,
      channel: '#ebooks',
      searchCommand: '@search'
    });

    await settingsPage.addNzbProvider({
      name: 'Multi-Source Test Provider',
      url: `http://localhost:${mockConfig.nzbPort}`,
      apiKey: 'test-api-key',
      categories: '7000,8010'
    });

    // Verify IRC connection works
    await settingsPage.goBack();
    await homePage.waitForConnected();
    
    const status = await homePage.getConnectionStatus();
    expect(status.toLowerCase()).toMatch(/online|connected/);
  });

  test('should navigate between settings tabs correctly', async ({ page }) => {
    const settingsPage = new SettingsPage(page);

    await settingsPage.navigate();

    // Go to IRC settings
    await settingsPage.goToIrcSettings();
    await expect(page.locator('h2:has-text("IRC Configuration")')).toBeVisible();

    // Go to Newznab settings
    await settingsPage.goToNewznabSettings();
    await expect(page.locator('h2:has-text("Newznab Indexers")')).toBeVisible();

    // Back to IRC
    await settingsPage.goToIrcSettings();
    await expect(page.locator('input[name="server"], input[id="server"]')).toBeVisible();
  });
});
